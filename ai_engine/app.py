"""
ai_engine/app.py
================
OOP-based Gradio microservice for ML-driven dynamic fare prediction.
Hosted as a headless API on Hugging Face Spaces.
"""

import json
import os
import math
from datetime import datetime
import numpy as np
import joblib
import gradio as gr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn


# ---------------------------------------------------------------------------
# Core ML Class
# ---------------------------------------------------------------------------

class FarePredictor:
    """
    Encapsulates the trained ML pipeline:
      - Loads model, scaler, and expected feature schema from disk (once at startup).
      - Provides Haversine distance calculation.
      - Performs full feature engineering and returns a prediction.
    """

    # Minimum fare floor to prevent nonsensical near-zero predictions
    MIN_FARE_USD: float = 2.50

    def __init__(self, model_path: str, scaler_path: str, features_path: str) -> None:
        print("[FarePredictor] Loading ML artifacts...")
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        with open(features_path, "r") as f:
            self.expected_features: list[str] = json.load(f)
        print(f"[FarePredictor] Ready. Expecting {len(self.expected_features)} features.")

    # ------------------------------------------------------------------
    # Geometry
    # ------------------------------------------------------------------

    @staticmethod
    def haversine_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        Return the great-circle distance between two GPS points in kilometres,
        using the Haversine formula.
        """
        R = 6371.0  # Earth's mean radius in km

        lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
        lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    # ------------------------------------------------------------------
    # Feature Engineering
    # ------------------------------------------------------------------

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

    def _build_feature_parts(
        self,
        pickup_lat: float,
        pickup_lon: float,
        dropoff_lat: float,
        dropoff_lon: float,
        passenger_count: int,
        trip_dt: datetime,
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

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(
        self,
        pickup_lat: float,
        pickup_lon: float,
        dropoff_lat: float,
        dropoff_lon: float,
        passenger_count: int,
        trip_dt: datetime,
    ) -> dict:
        numeric_array, day_array, distance_km = self._build_feature_parts(
            pickup_lat, pickup_lon,
            dropoff_lat, dropoff_lon,
            passenger_count, trip_dt,
        )

        scaled_numeric = self.scaler.transform(numeric_array)

        combined_map = {}
        for i, name in enumerate(self.SCALER_FEATURES):
            combined_map[name] = scaled_numeric[0, i]
        for i, name in enumerate(self.DAY_FEATURES):
            combined_map[name] = day_array[0, i]

        final_vector = np.array(
            [combined_map[name] for name in self.expected_features],
            dtype=np.float64
        ).reshape(1, -1)

        # MLOps Guardrail for OOD (Out-of-Distribution) Data
        if distance_km > 35 or pickup_lat < 39 or pickup_lat > 42:
            raw_prediction = 2.50 + (distance_km * 0.85)
        else:
            raw_prediction = float(self.model.predict(final_vector)[0])

        estimated_fare = max(raw_prediction, self.MIN_FARE_USD)

        return {
            "estimated_fare_usd":     round(estimated_fare, 2),
            "calculated_distance_km": round(distance_km, 2),
        }


# ---------------------------------------------------------------------------
# Gradio Interface API
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

predictor = FarePredictor(
    model_path=os.path.join(BASE_DIR, "best_model.pkl"),
    scaler_path=os.path.join(BASE_DIR, "scaler.pkl"),
    features_path=os.path.join(BASE_DIR, "model_features.json"),
)

def gradio_predict(
    pickup_lat: float, 
    pickup_lon: float, 
    dropoff_lat: float, 
    dropoff_lon: float, 
    passenger_count: float, 
    trip_datetime_str: str
):
    try:
        # Parse ISO datetime
        dt_str = str(trip_datetime_str).replace("Z", "+00:00")
        trip_dt = datetime.fromisoformat(dt_str)

        result = predictor.predict(
            pickup_lat=float(pickup_lat),
            pickup_lon=float(pickup_lon),
            dropoff_lat=float(dropoff_lat),
            dropoff_lon=float(dropoff_lon),
            passenger_count=int(passenger_count),
            trip_dt=trip_dt,
        )
        return result
    except Exception as e:
        return {"error": str(e)}

demo = gr.Interface(
    fn=gradio_predict,
    inputs=[
        gr.Number(label="Pickup Lat"),
        gr.Number(label="Pickup Lon"),
        gr.Number(label="Dropoff Lat"),
        gr.Number(label="Dropoff Lon"),
        gr.Number(label="Passenger Count", value=1),
        gr.Textbox(label="Trip Datetime (ISO format)", placeholder="2024-05-18T14:30:00Z")
    ],
    outputs="json",
    title="Ryde ML Dynamic Pricing - Headless API",
    description="Send a POST request to /api/predict with `{ \"data\": [...] }`"
)

# FastAPI wrapper to provide a standard REST endpoint for the Node.js backend
app = FastAPI()

class PredictRequest(BaseModel):
    data: list

@app.post("/api/predict")
def api_predict(req: PredictRequest):
    if not req.data or len(req.data) != 6:
        raise HTTPException(status_code=400, detail="Payload must contain a `data` array with exactly 6 elements.")
    try:
        # Call the same logic used by the Gradio interface
        result = gradio_predict(*req.data)
        # Gradio interface outputs a list/dictionary structure, return it exactly as Gradio would
        return {"data": [result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount Gradio app onto FastAPI
app = gr.mount_gradio_app(app, demo, path="/")

# The app is now globally available as `app` (FastAPI instance) and will be auto-started by Hugging Face Spaces.

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
