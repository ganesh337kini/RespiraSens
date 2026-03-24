# RespiraSense 2.0 Architecture

## System Overview

- Frontend: React + Vite SPA with modern glassmorphism UI
- Backend: FastAPI service exposing ML-backed REST endpoints
- ML Layer: audio feature extraction + structured model + fusion + trend model
- Data: local sample dataset for demo and extension

## Prediction Flow

1. User uploads cough audio and submits symptom/context form.
2. `/analyze-audio` extracts MFCC, ZCR, centroid, and energy -> `audio_risk_score`.
3. `/predict-risk` computes structured risk using symptoms + AQI + historical index.
4. Fusion logic combines structured and audio scores into outbreak probability.
5. `/get-trends` returns observed trend + 7-day forecast and hotspot score.
6. Frontend renders risk level, recommendations, trend chart, and map hotspots.

## Endpoint Contracts

- `POST /api/v1/analyze-audio` - multipart file upload; returns extracted features and audio risk score.
- `POST /api/v1/predict-risk` - JSON payload; returns risk level, confidence, fused score.
- `GET /api/v1/get-trends` - query params (`region`, `historical_risk_index`); returns trend and forecast.
