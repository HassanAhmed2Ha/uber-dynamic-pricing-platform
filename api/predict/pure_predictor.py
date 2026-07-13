import json
import math
import os
from datetime import datetime

class PureFarePredictor:
    MIN_FARE_USD = 2.50

    SCALER_FEATURES = [
        "pickup_longitude", "pickup_latitude",
        "dropoff_longitude", "dropoff_latitude",
        "passenger_count",
        "pickup_hour", "pickup_month", "pickup_year",
        "distance_km",
    ]

    DAY_FEATURES = [
        "day_Friday", "day_Monday", "day_Saturday", "day_Sunday",
        "day_Thursday", "day_Tuesday", "day_Wednesday",
    ]

    def __init__(self, model_dump_path: str, features_path: str) -> None:
        with open(model_dump_path, "r") as f:
            data = json.load(f)
            
        self.learning_rate = data['learning_rate']
        self.init_value = data['init_value']
        self.trees = data['trees']
        self.scaler_mean = data['scaler_mean']
        self.scaler_scale = data['scaler_scale']
        
        with open(features_path, "r") as f:
            self.expected_features = json.load(f)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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

    def predict_tree(self, tree, features):
        node = 0
        while tree['children_left'][node] != -1: # Not a leaf
            feature_idx = tree['feature'][node]
            threshold = tree['threshold'][node]
            if features[feature_idx] <= threshold:
                node = tree['children_left'][node]
            else:
                node = tree['children_right'][node]
        return tree['value'][node]

    def predict(
        self,
        pickup_lat: float, pickup_lon: float,
        dropoff_lat: float, dropoff_lon: float,
        passenger_count: int, trip_dt: datetime,
    ) -> dict:
        distance_km = self.haversine_distance(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)

        day_idx = trip_dt.weekday()
        days_ohe = {
            "day_Monday":    1.0 if day_idx == 0 else 0.0,
            "day_Tuesday":   1.0 if day_idx == 1 else 0.0,
            "day_Wednesday": 1.0 if day_idx == 2 else 0.0,
            "day_Thursday":  1.0 if day_idx == 3 else 0.0,
            "day_Friday":    1.0 if day_idx == 4 else 0.0,
            "day_Saturday":  1.0 if day_idx == 5 else 0.0,
            "day_Sunday":    1.0 if day_idx == 6 else 0.0,
        }

        numeric_map = {
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

        numeric_array = [numeric_map[f] for f in self.SCALER_FEATURES]
        
        # Scale numeric features
        scaled_numeric = [
            (val - mean) / scale 
            for val, mean, scale in zip(numeric_array, self.scaler_mean, self.scaler_scale)
        ]

        combined_map = {}
        for i, name in enumerate(self.SCALER_FEATURES):
            combined_map[name] = scaled_numeric[i]
        for name in self.DAY_FEATURES:
            combined_map[name] = days_ohe[name]

        final_vector = [combined_map[name] for name in self.expected_features]

        # OOD guardrail
        if distance_km > 35 or pickup_lat < 39 or pickup_lat > 42:
            raw_prediction = 2.50 + (distance_km * 0.85)
        else:
            # Gradient Boosting prediction
            prediction = self.init_value
            for tree in self.trees:
                prediction += self.learning_rate * self.predict_tree(tree, final_vector)
            raw_prediction = float(prediction)

        return {
            "estimated_fare_usd":     round(max(raw_prediction, self.MIN_FARE_USD), 2),
            "calculated_distance_km": round(distance_km, 2),
        }
