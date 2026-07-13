<div align="center">

# 🚗 Ryde — ML Dynamic Pricing Platform

### *A production-grade, serverless ride-pricing engine trained on 178,274 real NYC taxi trips and deployed across a zero-cost, three-service Vercel monorepo.*

<br />

![Model](https://img.shields.io/badge/Model-Gradient%20Boosting%20R²%3D0.79-orange?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)
![React](https://img.shields.io/badge/React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

<br />

---

## 🏛️ Architectural Milestones

<br />

The project recently underwent a major architectural migration to achieve a stable, zero-cost production build. We transitioned from scattered services to a highly optimized Vercel Monorepo.

- **Monorepo Zero-Config Routing:** Unified the Vite React Frontend, Express Backend, and FastAPI Python Engine under a single domain (`uber-dynamic-pricing-platform.vercel.app`) using Vercel's zero-config routing in `vercel.json`. This eliminated CORS issues and simplified deployment to a single `git push`.
- **Node.js Module Resolution:** Resolved `ERR_REQUIRE_ESM` crashes by strategically isolating `"type": "commonjs"` configurations for the serverless backend, bypassing Vite's global ES Module settings.
- **Pure Python AI Engine (Bypassing the 250MB Limit):** 
  > [!IMPORTANT]
  > AWS Lambda limits serverless functions to 250MB uncompressed. Standard ML libraries (`scikit-learn`, `scipy`, `pandas`) exceed 350MB.
  > To solve this, we dumped the weights and decision trees of our `GradientBoostingRegressor` into a lightweight 2.0MB JSON file. We then engineered a **Zero-Dependency Pure Python Predictor** that reads the JSON and performs exact mathematical predictions. This shrank the AI Engine from >350MB to **<5MB**, resulting in lightning-fast cold starts and a 100% stable deployment.
- **Vercel Preview Protection Resilience:** Built robust error handling and environment variable checks (`DB_CONNECT`) to gracefully handle Vercel Preview deployments and diagnose MongoDB network blocks.

**Status:** All systems GO! 🟢

<br />

---

## 🚀 Live Demos & Project Preview

<br />

<div align="center">
  <p><i>Watch the live project demonstration below:</i></p>
  https://github.com/HassanAhmed2Ha/uber-dynamic-pricing-platform/raw/main/Demo.webm
</div>

<br />

| Service | Live URL | Technology |
| :---: | :--- | :---: |
| ⚛️ **Frontend** | **[uber-dynamic-pricing-platform-frontend.vercel.app](https://uber-dynamic-pricing-platform-frontend.vercel.app)** | React 18 + Vite |
| 🟢 **Backend API** | **[uber-dynamic-pricing-platform-gz72.vercel.app](https://uber-dynamic-pricing-platform-gz72.vercel.app)** | Node.js + Express |
| 🐍 **AI Engine** | **[uber-dynamic-pricing-platform.vercel.app/api/predict](https://uber-dynamic-pricing-platform.vercel.app/api/predict)** | Python + FastAPI Serverless |

<br />

> 💡 All three services are deployed from a **single GitHub repository** via one unified `git push`. No separate CI/CD pipelines, no platform sprawl — a true zero-friction monorepo deployment.

<br />

---

## 🏗️ System Architecture

<br />

The platform is composed of three fully independent microservices housed in a single monorepo, communicating through clean REST boundaries.

<br />

```mermaid
graph LR
    User(["👤 User"])

    subgraph FE ["⚛️ Frontend — Vite"]
        UI["React SPA<br>GSAP + Leaflet"]
    end

    subgraph BE ["🟢 Backend — Express"]
        API["REST API<br>Node.js"]
        GEO["Nominatim<br>Geocoder"]
        MULT["Vehicle<br>Multipliers"]
        DB[("MongoDB<br>Atlas")]
    end

    subgraph AI ["🐍 AI Engine — FastAPI"]
        FN["Serverless<br>Function"]
        ENG["Feature<br>Engineering"]
        OOD{"OOD<br>Guardrail"}
        MODEL["Pure Python<br>Predictor (JSON)"]
        LINEAR["Linear<br>Fallback"]
    end

    User -->|"Enter locations"| UI
    UI -->|"GET /rides/get-fare"| API
    API -->|"Geocode addresses"| GEO
    GEO -->|"lat, lng"| API
    API -->|"POST /api/predict"| FN
    FN --> ENG
    ENG --> OOD
    OOD -->|"In-distribution"| MODEL
    OOD -->|"OOD trip"| LINEAR
    MODEL -->|"Predicted fare"| FN
    LINEAR -->|"Formula fare"| FN
    FN -->|"estimated_fare_usd"| API
    API --> MULT
    MULT -->|"car / auto / moto prices"| UI
    UI -->|"User confirms vehicle"| UI
    UI -->|"POST /rides/create"| API
    API -->|"Persist ride record"| DB
```

<br />

### Monorepo Directory Structure

The repository is fully detailed below. It separates the Vite frontend, Express backend, and Python AI engine while allowing Vercel to build them together seamlessly.

```text
uber-dynamic-pricing-platform/
├── api/                         # Vercel Serverless Entrypoints
│   ├── backend/
│   │   └── index.js             # Forwards /api/backend to Express
│   ├── predict/
│   │   ├── index.py             # FastAPI Serverless Function Endpoint
│   │   ├── pure_predictor.py    # Zero-Dependency ML Engine Logic
│   │   ├── model_dump.json      # ML Weights (2.0 MB JSON)
│   │   └── model_features.json  # Feature Schema & Column Ordering
│   └── package.json             # Forces CommonJS for backend compilation
├── backend/                     # Node.js Express Application
│   ├── controllers/
│   │   ├── maps.controller.js   # Handles Nominatim geocoding logic
│   │   └── ride.controller.js   # Handles fare requests & ride creation
│   ├── db/
│   │   └── db.js                # Serverless-friendly Mongoose connection
│   ├── models/
│   │   └── ride.model.js        # MongoDB Ride Schema
│   ├── routes/
│   │   ├── maps.routes.js       # /maps endpoints
│   │   └── ride.routes.js       # /rides endpoints
│   ├── services/
│   │   ├── maps.service.js      # External API wrappers (OSRM/Nominatim)
│   │   └── ride.service.js      # Core business logic & AI Engine integration
│   ├── app.js                   # Express Server Setup & CORS Middleware
│   ├── .env                     # Local Environment Variables
│   └── package.json             # Backend Dependencies
├── src/                         # React Frontend (Vite)
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── ConfirmRide.jsx      # Post-booking success screen
│   │   ├── LocationSearchPanel.jsx # Input forms & address search
│   │   └── VehiclePanel.jsx     # Vehicle selection & dynamic prices
│   ├── context/
│   │   └── SocketContext.jsx    # Real-time state management
│   ├── pages/
│   │   └── Home.jsx             # Main interactive Map SPA
│   ├── index.css                # Tailwind & Custom CSS
│   ├── App.jsx                  # React Router Configuration
│   └── main.jsx                 # React DOM Entrypoint
├── Demo.webm                    # Project Demonstration Video
├── requirements.txt             # Python Dependencies (FastAPI, Pydantic)
├── package.json                 # Frontend Dependencies (React, Vite, GSAP)
├── tailwind.config.js           # Tailwind CSS Configuration
└── vercel.json                  # Vercel Routing & Build Configuration
```

<br />

---

## 👥 Project Phases & Team Contributions

<br />

This project was executed in three sequential, clearly owned phases. Each team member took full ownership of their domain.

<br />

| Phase | Focus Area | Owner | Key Work |
| :---: | :--- | :--- | :--- |
| **Phase 1** | 📊 Data Analysis & EDA | **Abdoallah Essam** | Ingested and cleaned 200,000+ raw NYC trip records. Applied geographic bounding box filters, IQR-based outlier removal on `fare_amount`, and built temporal features from raw timestamps. Engineered the critical `distance_km` feature using the **Haversine formula**. Produced all EDA visualizations (fare distribution, hourly demand curves, distance-vs-fare scatter plots, day-of-week heatmaps). |
| **Phase 2** | 🤖 Model Building & MLOps | **Salah Eddin** | Benchmarked **6 regression algorithms** (Linear, Ridge, Lasso, Decision Tree, Random Forest, Gradient Boosting). Selected `GradientBoostingRegressor` based on superior R² (0.79) and RMSE ($1.94). Ran `RandomizedSearchCV` hyperparameter tuning. Performed 2-fold cross-validation for stability analysis. Serialized the final model, scaler, and feature schema to `best_model.pkl`, `scaler.pkl`, and `model_features.json` using `joblib`. |
| **Phase 3** | ☁️ Production & Deployment | **Hassan Ahmed** | Architected the three-service **Vercel monorepo**. Built the `FarePredictor` class and refactored the entire AI engine from Gradio to a pure **FastAPI Serverless Function** (`@vercel/python`). Implemented the OOD guardrail. Wired the Node.js backend to the AI Engine, built all ride routes, and debugged the full production chain — including CORS policies, environment variable injection, and ML version pinning. |

<br />

---

## 🧠 The ML Pipeline: From 200K Rows to a Live API

<br />

### Phase 1 — Data Cleaning

The raw dataset contained approximately **200,000 NYC Uber trip records**. Before any model could be trained, the data required aggressive cleaning:

<br />

- ✅ **Null removal** — dropped all rows containing `NaN` values across any column
- ✅ **Index cleanup** — removed the auto-generated `Unnamed: 0` index column
- ✅ **Geographic bounding box** — retained only trips originating within the NYC metro area (`latitude: 40.4–41.0`, `longitude: -74.3–-73.6`), eliminating GPS noise and phantom out-of-city entries
- ✅ **Sanity filters** — removed trips where `fare_amount ≤ 0` or `passenger_count ∉ [1, 6]`
- ✅ **IQR outlier removal** — computed the interquartile range of `fare_amount` and hard-clipped the distribution at `[Q1 − 1.5×IQR, Q3 + 1.5×IQR]`, eliminating `$0.01` ghost entries and `$499` data-entry errors

<br />

> **After cleaning: 178,274 high-quality trip records remained — a 10–12% reduction that dramatically improved signal quality.**

<br />

### Phase 2 — Feature Engineering

All 16 model features are derived from just four raw inputs: pickup coordinates, dropoff coordinates, passenger count, and a single datetime string.

<br />

| Feature | Raw Source | Transformation |
| :--- | :--- | :--- |
| `pickup_hour` | `pickup_datetime` | `dt.hour` |
| `pickup_month` | `pickup_datetime` | `dt.month` |
| `pickup_year` | `pickup_datetime` | `dt.year` |
| `distance_km` | GPS coordinates | **Haversine formula** (great-circle distance) |
| `day_Monday` … `day_Sunday` | `pickup_day` | **One-hot encoding** — 7 binary columns |
| `pickup_latitude`, `pickup_longitude` | Raw GPS | StandardScaler normalized |
| `dropoff_latitude`, `dropoff_longitude` | Raw GPS | StandardScaler normalized |
| `passenger_count` | Raw integer | StandardScaler normalized |

<br />

The **Haversine formula** is the same implementation used in both the training notebook and the live production serverless function — guaranteeing zero discrepancy between training-time and inference-time distance calculations:

<br />

```python
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth's mean radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))
```

<br />

### Phase 3 — Model Benchmarking & Selection

Six regression algorithms were evaluated on an **80/20 train-test split** across the full cleaned dataset:

<br />

| Rank | Model | R² Score | RMSE | MAE |
| :---: | :--- | :---: | :---: | :---: |
| 🥇 | **Gradient Boosting Regressor** | **0.79** | **$1.94** | **$1.52** |
| 🥈 | Random Forest | 0.75 | $2.11 | $1.61 |
| 🥉 | Decision Tree | 0.68 | $2.38 | $1.79 |
| 4 | Ridge Regression | 0.61 | $2.64 | $1.98 |
| 5 | Lasso Regression | 0.60 | $2.66 | $2.00 |
| 6 | Linear Regression | 0.60 | $2.67 | $2.01 |

<br />

**Why Gradient Boosting won:** The fare-distance relationship is fundamentally non-linear. Airport flat rates, short-trip minimums, and time-of-day surge patterns create discontinuities that no linear model can capture. Gradient Boosting builds an ensemble that iteratively corrects its residual errors — learning these complex market dynamics directly from the data. Feature importance analysis confirmed that `distance_km` alone drives **over 80% of the model's predictive power**.

<br />

### Phase 4 — Hyperparameter Tuning & Serialization

`RandomizedSearchCV` (6 iterations, 2-fold cross-validation, all CPU cores) found the optimal configuration:

<br />

```
Best configuration:
  n_estimators  = 200
  max_depth     = 5
  learning_rate = 0.1
  subsample     = 0.8

Final tuned results:
  R²   = 0.79
  RMSE = $1.94
  91% of all predictions fall within $5.00 of the actual fare
```

<br />

Three production artifacts were serialized with `joblib` and committed directly to the repository:

<br />

```
ai_engine/
├── best_model.pkl       ← Tuned GradientBoostingRegressor (3.4 MB)
├── scaler.pkl           ← StandardScaler fitted on training data only
└── model_features.json  ← Ordered list of 16 feature names (critical!)
```

<br />

> ⚠️ `model_features.json` is a production-critical artifact. It locks the exact column order the model was trained with. Without it, a silently reordered feature vector would produce a mathematically valid but completely wrong fare prediction — with no error thrown.

<br />

---

## 🛡️ The OOD Guardrail: Defending Against Model Hallucinations

<br />

### The Problem

Machine learning models do not know what they do not know. Our Gradient Boosting model was trained exclusively on **New York City trip data**. If a user enters a pickup address in London, Cairo, or a destination 300 km outside the city, the model will still attempt a prediction — extrapolating wildly outside its learned patterns and returning a dangerously confident but completely meaningless number.

This is the **Out-of-Distribution (OOD) problem**, and it is one of the most common silent failures in production ML systems.

<br />

### Our Solution: A Two-Layer Deterministic Guard

Before every inference call, the `FarePredictor` runs a deterministic check against two thresholds:

<br />

```python
# Applied before every model.predict() call
if distance_km > 35 or pickup_lat < 39 or pickup_lat > 42:
    # Bypass the model — apply the linear fallback formula
    raw_prediction = FALLBACK_FORMULA
else:
    # Input is within training distribution — use the ML model
    raw_prediction = float(model.predict(feature_vector)[0])
```

<br />

**Guard Layer 1 — Distance Threshold:** Any trip exceeding **35 km** is considered out-of-distribution for a standard urban taxi model trained on city rides.

**Guard Layer 2 — Geographic Bounding Box:** Any pickup latitude outside the NYC corridor (`39° – 42° N`) is geographically outside the training data.

<br />

### The Fallback Equation

For all OOD trips, we apply a transparent, interpretable linear pricing formula instead of the black-box model:

<br />

> **Fare = $2.50 (Base Charge) + ( Distance_km × $0.85 )**

<br />

| Component | Value | Rationale |
| :--- | :---: | :--- |
| **Base charge** | $2.50 | Minimum fare covering pickup overhead, regardless of distance |
| **Per-kilometre rate** | $0.85 / km | Conservative, defensible linear rate for long-haul or unknown-region trips |

<br />

This guarantees the system **always returns a sensible, human-explainable fare** — even for inputs the ML model was never designed to handle — rather than surfacing a negative number, a near-zero prediction, or a silent server error.

<br />

---

## ⚔️ Technical Post-Mortems

<br />

> *These are the real production crises that nearly killed this project — and exactly how we engineered our way out of each one.*

<br />

<details>
<summary><b>🔥 Challenge 1 — The Hugging Face Paywall</b></summary>

<br />

**The original plan** was elegant: deploy the ML model as a **Gradio application on Hugging Face Spaces**. Gradio auto-generates a REST-compatible API endpoint, the Node.js backend calls it, done. The whole thing worked perfectly in local development.

Then Hugging Face **silently locked their free-tier CPU and GPU hardware behind a PRO paywall** (~$9/month). Our Spaces deployment became unreachable without a paid subscription. Every single `GET /rides/get-fare` request from the production backend began timing out.

**The Pivot — What We Actually Did:**
We stripped Gradio out of the codebase entirely. The model logic was extracted into a clean, framework-agnostic `FarePredictor` class. We built a minimal FastAPI application and deployed it directly to Vercel via `@vercel/python`.

| | Before — Hugging Face + Gradio | After — Vercel Serverless + FastAPI |
| :--- | :---: | :---: |
| **Monthly cost** | $9/mo PRO required | **$0.00** |
| **Cold start latency** | ~3–8 seconds | **~400 ms** |
| **Deployment workflow** | Separate platform, separate config | **One `git push` deploys all 3 services** |
| **Dependency footprint** | Gradio ≈ 200 MB | FastAPI ≈ 15 MB |
| **Vendor lock-in** | Locked to HF ecosystem | **Standard ASGI — runs anywhere** |

</details>

<br />

<details>
<summary><b>⏱️ Challenge 2 — The 250MB AWS Lambda Limit & Version Crashes</b></summary>

<br />

Even after migrating to Vercel, the first wave of production requests returned `FUNCTION_INVOCATION_FAILED` with a generic 500 error.

**Bug A — scikit-learn Version Mismatch (Silent Crash)**
Python's pickle-based deserialization is **not version-agnostic**. A model serialized under `scikit-learn==1.7.1` cannot be loaded by `scikit-learn==1.6.x`. Vercel installed a different version, causing immediate cold-start crashes.
**Fix:** Pinned every ML dependency to its exact training-time version.

**Bug B — The 250MB Hard Wall**
Even with correct versions, deploying `scikit-learn`, `scipy`, and `pandas` pushed the uncompressed serverless function size above AWS Lambda's strict 250MB physical limit. The container crashed on boot.
**The Fix: Pure Python Predictor:** We dumped the trained decision trees into a `model_dump.json` file and wrote a zero-dependency Python script to traverse the trees and compute the Gradient Boosting prediction mathematically. We entirely uninstalled `scikit-learn` from production, shrinking the function from >350MB to <5MB.

</details>

<br />

<details>
<summary><b>🌐 Challenge 3 — CORS Blocks & Hardcoded localhost</b></summary>

<br />

After deploying the frontend, users were greeted with a hardcoded fallback error message: *"Could not fetch fare. Is the AI Engine running on port 5000?"*

**Root Cause A — Vite's Build-Time Environment Variable Injection**
Vite resolves `import.meta.env` at build time. Without a `VITE_BASE_URL` in Vercel, it resolved to `undefined`, causing our fallback `http://localhost:4000` to be compiled into production code.
**Fix:** Replaced the fragile env-variable approach with Vite's `import.meta.env.DEV` boolean.

**Root Cause B — Express CORS Whitelist Blocking Production Origins**
The backend `app.js` had a strict `ALLOWED_ORIGINS` array containing only `localhost:*` entries. The browser received a `CORS: Origin is not allowed` error.
**Fix:** Opened the CORS policy for cross-domain Vercel deployments.

</details>

<br />

---

## 🚀 Local Development Setup

<br />

### Prerequisites

- Node.js ≥ 18 and npm
- Python ≥ 3.10
- A MongoDB Atlas cluster (free M0 tier is sufficient)
- Git

<br />

### Monorepo Setup & Execution

Run all three services locally to verify the full ML pricing pipeline.

**1. Clone the Repository**
```bash
git clone https://github.com/HassanAhmed2Ha/uber-dynamic-pricing-platform.git
cd uber-dynamic-pricing-platform
```

**2. Configure the Backend Environment**
Create the file `backend/.env`:
```env
PORT=4000
DB_CONNECT=<your_mongodb_atlas_connection_string>
JWT_SECRET=any-local-secret-string
```

**3. Install Dependencies & Start All Services**
In three separate terminal tabs, run:

```bash
# Terminal 1: Backend API
cd backend
npm install
npm run dev
# Running at → http://localhost:4000

# Terminal 2: AI Engine
cd api/predict
python -m venv .venv
source .venv/bin/activate
pip install -r ../../requirements.txt
uvicorn index:app --port 7860 --reload
# Running at → http://localhost:7860

# Terminal 3: React Frontend
npm install
npm run dev
# Running at → http://localhost:5173
```

Open **[http://localhost:5173](http://localhost:5173)** and enter two NYC addresses (e.g. `Times Square, New York` to `JFK Airport, New York`) to test the ML pricing engine.

<br />

---

<div align="center">

*Built with ☕, 🐍, and a healthy disregard for platform limits.*

</div>
