from datetime import datetime

from fastapi import APIRouter, File, UploadFile

from app.schemas.prediction import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    TrendResponse,
)
from app.services.audio_service import extract_audio_features
from app.services.model_service import (
    audio_proba_from_inputs,
    fused_outbreak_probability,
    generate_trend,
    recommendations_from_level,
    risk_level_from_score,
    structured_risk_score,
)

router = APIRouter()


@router.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    features = extract_audio_features(content)
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        **features,
    }


@router.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(payload: RiskPredictionRequest) -> RiskPredictionResponse:
    ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))

    aqi = payload.aqi if payload.aqi is not None else 80.0
    temp = payload.temperature_c if payload.temperature_c is not None else 26.0
    hum = payload.humidity if payload.humidity is not None else 55.0

    structured = structured_risk_score(
        fever=payload.symptoms.fever,
        breathlessness=payload.symptoms.breathlessness,
        fatigue=payload.symptoms.fatigue,
        duration=payload.symptoms.cough_duration_days,
        historical_risk=payload.historical_risk_index,
        aqi=aqi,
        temperature_c=temp,
        humidity=hum,
        hour=ts.hour,
        region=payload.region,
    )
    p_audio = audio_proba_from_inputs(payload.audio_features, payload.audio_risk_score)
    fused, confidence = fused_outbreak_probability(structured, p_audio, payload.region, ts.hour)
    level = risk_level_from_score(fused)

    return RiskPredictionResponse(
        risk_level=level,
        outbreak_probability=round(fused, 4),
        confidence=round(confidence, 4),
        structured_score=round(structured, 4),
        audio_score=round(p_audio, 4),
        fused_score=round(fused, 4),
        recommendations=recommendations_from_level(level),
    )


@router.get("/get-trends", response_model=TrendResponse)
def get_trends(region: str = "Bengaluru", historical_risk_index: float = 0.45) -> TrendResponse:
    data = generate_trend(region=region, historical_risk=historical_risk_index)
    return TrendResponse(
        region=region,
        trend=data["trend"],
        forecast=data["forecast"],
        hotspot_score=round(data["hotspot_score"], 4),
    )
