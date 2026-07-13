"""
api/predict/index.py
====================
Vercel Serverless Function entry point for ML fare prediction.
All dependencies (predictor.py, .pkl files) are co-located in this
directory — no sys.path manipulation required.
"""

import os
import sys
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# All artifacts are in the same directory as this file.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from pure_predictor import PureFarePredictor

app = FastAPI(title="Ryde ML Dynamic Pricing API")

predictor = PureFarePredictor(
    model_dump_path=os.path.join(BASE_DIR, "model_dump.json"),
    features_path=os.path.join(BASE_DIR, "model_features.json"),
)


class PredictRequest(BaseModel):
    data: list


@app.post("/api/predict")
def api_predict(req: PredictRequest):
    if not req.data or len(req.data) != 6:
        raise HTTPException(
            status_code=400,
            detail="Payload must contain a `data` array with exactly 6 elements."
        )
    try:
        trip_dt = datetime.fromisoformat(str(req.data[5]).replace("Z", "+00:00"))
        result = predictor.predict(
            pickup_lat=float(req.data[0]),
            pickup_lon=float(req.data[1]),
            dropoff_lat=float(req.data[2]),
            dropoff_lon=float(req.data[3]),
            passenger_count=int(req.data[4]),
            trip_dt=trip_dt,
        )
        return {"data": [result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
