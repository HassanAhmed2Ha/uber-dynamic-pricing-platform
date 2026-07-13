import os
import sys
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Ensure we can import predictor.py from the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from predictor import FarePredictor

app = FastAPI(title="Ryde ML Dynamic Pricing - Vercel Serverless API")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load the ML artifacts on cold start
predictor_instance = FarePredictor(
    model_path=os.path.join(BASE_DIR, "best_model.pkl"),
    scaler_path=os.path.join(BASE_DIR, "scaler.pkl"),
    features_path=os.path.join(BASE_DIR, "model_features.json"),
)

class PredictRequest(BaseModel):
    data: list

@app.post("/api/predict")
def api_predict(req: PredictRequest):
    if not req.data or len(req.data) != 6:
        raise HTTPException(status_code=400, detail="Payload must contain a `data` array with exactly 6 elements.")
    try:
        pickup_lat = float(req.data[0])
        pickup_lon = float(req.data[1])
        dropoff_lat = float(req.data[2])
        dropoff_lon = float(req.data[3])
        passenger_count = int(req.data[4])
        trip_datetime_str = str(req.data[5])
        
        # Parse ISO datetime
        dt_str = trip_datetime_str.replace("Z", "+00:00")
        trip_dt = datetime.fromisoformat(dt_str)

        result = predictor_instance.predict(
            pickup_lat=pickup_lat,
            pickup_lon=pickup_lon,
            dropoff_lat=dropoff_lat,
            dropoff_lon=dropoff_lon,
            passenger_count=passenger_count,
            trip_dt=trip_dt,
        )
        return {"data": [result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
