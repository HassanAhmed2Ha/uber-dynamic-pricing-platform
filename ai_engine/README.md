# AI Engine Microservice

This microservice provides dynamic fare prediction capabilities using a machine learning model. It encapsulates a pre-trained scikit-learn model wrapped in a Gradio and FastAPI interface. It exposes a headless REST API for the Node.js backend.

## Deployment Instructions

This service is production-ready and configured to be deployed on Render.com or any similar Platform-as-a-Service provider.

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app:app --host 0.0.0.0 --port 10000`

### Render.com Configuration
1. Create a new "Web Service" on Render.
2. Set the Root Directory to `ai_engine`.
3. Set the Environment to `Python 3`.
4. Enter the Build and Start commands exactly as shown above.
5. Render will automatically inject a `$PORT` environment variable which the application will dynamically bind to.
