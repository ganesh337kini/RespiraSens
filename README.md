# RespiraSense 2.0 - AI Respiratory Outbreak Prediction System

RespiraSense 2.0 is a full-stack, multimodal AI platform that predicts respiratory outbreak risk using cough audio, symptom data, location context, and time-series trends.

## Monorepo Structure

- `frontend/` - React + Vite premium dashboard UI
- `backend/` - FastAPI API service for analysis and prediction
- `ml-model/` - training scripts and model artifacts
- `dataset/` - sample data for local demo/training
- `docs/` - architecture, API docs, and demo notes

## Core Features

- Cough audio analysis (MFCC + spectrogram-driven features)
- Structured symptom and contextual prediction
- Fusion model combining audio and structured signals
- Outbreak trend forecasting (time-series regression)
- Risk dashboard with charts and hotspot map visualization
- Actionable recommendations and alerting

## Quick Start

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls backend on `http://localhost:8000` by default.

## Demo Flow

1. Open the Analysis page
2. Upload a cough recording (or use any short audio clip)
3. Fill symptoms + location
4. Submit prediction
5. Review risk score, outbreak probability, trend charts, and recommendations on Results + Dashboard
