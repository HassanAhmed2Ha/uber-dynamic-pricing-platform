# Uber Dynamic Pricing Platform 🚀🚕

A full-stack machine learning application that predicts real-time dynamic ride fares based on trip distance, geographical location, time of day, and vehicle type. The project features a React/Vite frontend, a Node.js/Express backend for API routing and MongoDB storage, and a Python-based ML Engine utilizing Gradient Boosting for highly accurate fare predictions.

![Platform Preview](https://uber-dynamic-pricing-platform.vercel.app/favicon.ico)

## 🏗️ Architecture (Vercel Monorepo)

This platform is deployed as a unified Monorepo on Vercel.
- **Frontend**: React + Vite + TailwindCSS + Leaflet Maps
- **Backend API**: Node.js + Express (Serverless Functions via `@vercel/node`)
- **AI Predictor**: Python + FastAPI (Serverless Functions via `@vercel/python`)
- **Database**: MongoDB Atlas

---

## 🛠️ Deployment Summary & Engineering Solutions

Deploying a complex multi-language monorepo (Node.js + Python ML) to Vercel presented several significant architectural challenges. Below is a documentation of the critical problems encountered and how they were solved to achieve a stable production build.

### 1. Monorepo Zero-Config Routing
**Problem:** The Frontend (Vite) and Backend (Express) were initially fighting for control over Vercel's routing, causing 404 errors for API requests.
**Solution:** We transitioned the project to Vercel's zero-config routing system by defining clear API handlers in `vercel.json` and a fallback catch-all backend router. This unified the Vite React Frontend, the Express.js Backend, and the FastAPI Python Engine under a single domain, eliminating CORS issues and complex proxy configurations.

### 2. Node.js Module Resolution (ESM vs CommonJS)
**Problem:** A critical crash (`ERR_REQUIRE_ESM`) occurred on startup because the root Vite `package.json` had `"type": "module"`. This forced Vercel to compile the Node.js Serverless Backend using ES Modules, but the backend was written using CommonJS (`require`).
**Solution:** By strategically placing mini `package.json` files containing just `"type": "commonjs"` inside the `api/` and `backend/` directories, we forced the Vercel Node builder to compile the serverless backend correctly, isolating it from the Vite frontend configuration.

### 3. Pure Python AI Engine (Bypassing AWS Lambda 250MB Limit)
> [!IMPORTANT]
> **The 250MB Serverless Limit Bypass**
> AWS Lambda (which powers Vercel Serverless Functions) has a strict **250MB uncompressed size limit**. Standard ML libraries (`scikit-learn`, `scipy`, `pandas`) easily exceed 350MB, causing fatal deployment failures and generic 500 errors.

**Solution:** 
To bypass this hard physical limit without losing the AI functionality, we engineered a custom extraction pipeline:
1. We dumped the mathematical weights and decision trees of the trained `GradientBoostingRegressor` into a lightweight `model_dump.json` file (2.0MB).
2. We wrote a **Zero-Dependency Pure Python Predictor** (`pure_predictor.py`) that reads the JSON tree structure and performs the exact same mathematical predictions.
3. We completely removed `scikit-learn`, `scipy`, and `numpy` from the deployment `requirements.txt`.
**Result:** We shrunk the AI Engine from >350MB to **<5MB**, resulting in lightning-fast cold starts, zero dependency bloat, and a 100% stable deployment on Vercel's Free Tier.

### 4. Vercel Preview Protection & Database Connectivity
**Problem:** Database connections (`MongooseServerSelectionError`) were timing out with 500 errors on specific URLs, despite working locally.
**Solution:** We identified that Vercel Preview deployments were missing the `DB_CONNECT` environment variable (which was only assigned to Production). We also ensured the Node.js backend gracefully handles missing environment variables by immediately returning a `503 Service Unavailable` with a clear debugging message, rather than allowing Mongoose to silently buffer and timeout.

---

## 🚀 Future ML Updates
If the ML model is retrained in the future (`best_model.pkl`), a new `model_dump.json` must be generated locally using the tree-extraction script before pushing to Vercel. Because the Pure Python Predictor is fully dynamic, it will automatically adopt the new weights and logic!

**Status:** All systems GO! 🟢
