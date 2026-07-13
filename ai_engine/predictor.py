"""
ai_engine/predictor.py
======================
FarePredictor: ML pipeline wrapper for dynamic ride fare prediction.
Deployed as a Vercel Serverless Function via api/index.py.
"""

import json
import os
import math
from datetime import datetime
import numpy as np
import joblib


class FarePredictor:
    """
    Encapsulates the trained ML pipeline:
      - Loads model, scaler, and expected feature schema from disk once at cold start.
      - Computes Haversine distance between GPS coordinates.
      - Performs feature engineering and returns a fare prediction.
    """

    MIN_FARE_USD: float = 2.50

    # Features passed through the StandardScaler
    SCALER_FEATURES = [
        "pickup_longitude", "pickup_latitude",
        "dropoff_longitude", "dropoff_latitude",
        "passenger_count",
        "pickup_hour", "pickup_month", "pickup_year",
        "distance_km",
    ]

    # One-hot encoded day-of-week features (alphabetical order, matching training schema)
    DAY_FEATURES = [
        "day_Friday", "day_Monday", "day_Saturday", "day_Sunday",
        "day_Thursday", "day_Tuesday", "day_Wednesday",
    ]

    def __init__(self, model_path: str, scaler_path: str, features_path: str) -> None:
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        with open(features_path, "r") as f:
            self.expected_features: list[str] = json.load(f)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Great-circle distance between two GPS points in kilometres."""
        R = 6371.0
        lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
        lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    def _build_features(
        self,
        pickup_lat: float, pickup_lon: float,
        dropoff_lat: float, dropoff_lon: float,
        passenger_count: int, trip_dt: datetime,
    ) -> tuple[np.ndarray, np.ndarray, float]:
        distance_km = self.haversine_distance(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)

        day_idx = trip_dt.weekday()
        days_ohe = {
            "day_Monday":    1 if day_idx == 0 else 0,
            "day_Tuesday":   1 if day_idx == 1 else 0,
            "day_Wednesday": 1 if day_idx == 2 else 0,
            "day_Thursday":  1 if day_idx == 3 else 0,
            "day_Friday":    1 if day_idx == 4 else 0,
            "day_Saturday":  1 if day_idx == 5 else 0,
            "day_Sunday":    1 if day_idx == 6 else 0,
        }

        numeric_map: dict[str, float] = {
            "pickup_longitude":  pickup_lon,
            "pickup_latitude":   pickup_lat,
            "dropoff_longitude": dropoff_lon,
            "dropoff_latitude":  dropoff_lat,
            "passenger_count":   float(passenger_count),
            "pickup_hour":       float(trip_dt.hour),
            "pickup_month":      float(trip_dt.month),
            "pickup_year":       float(trip_dt.year),
            "distance_km":       distance_km,
        }

        numeric_array = np.array(
            [numeric_map[f] for f in self.SCALER_FEATURES], dtype=np.float64
        ).reshape(1, -1)

        day_array = np.array(
            [days_ohe[f] for f in self.DAY_FEATURES], dtype=np.float64
        ).reshape(1, -1)

        return numeric_array, day_array, distance_km

    def predict(
        self,
        pickup_lat: float, pickup_lon: float,
        dropoff_lat: float, dropoff_lon: float,
        passenger_count: int, trip_dt: datetime,
    ) -> dict:
        numeric_array, day_array, distance_km = self._build_features(
            pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, passenger_count, trip_dt,
        )

        scaled_numeric = self.scaler.transform(numeric_array)

        combined_map = {}
        for i, name in enumerate(self.SCALER_FEATURES):
            combined_map[name] = scaled_numeric[0, i]
        for i, name in enumerate(self.DAY_FEATURES):
            combined_map[name] = day_array[0, i]

        final_vector = np.array(
            [combined_map[name] for name in self.expected_features], dtype=np.float64
        ).reshape(1, -1)

        # OOD guardrail: fall back to a linear estimate for trips outside the
        # training distribution (NYC bounding box, distances > 35 km).
        if distance_km > 35 or pickup_lat < 39 or pickup_lat > 42:
            raw_prediction = 2.50 + (distance_km * 0.85)
        else:
            raw_prediction = float(self.model.predict(final_vector)[0])

        return {
            "estimated_fare_usd":     round(max(raw_prediction, self.MIN_FARE_USD), 2),
            "calculated_distance_km": round(distance_km, 2),
        }
