from datetime import datetime

from fastapi import APIRouter, File, Query, UploadFile

from app.schemas.prediction import (
    AlertsResponse,
    AnonymousContribution,
    CommunityRiskResponse,
    HeatmapResponse,
    NearbyHospitalsResponse,
    ReverseGeocodeResponse,
    RiskPredictionRequest,
    RiskPredictionResponse,
    TrendResponse,
    UserHistoryResponse,
)
from app.services.audio_service import extract_audio_features
from app.services.explain_service import build_explanation
from app.services.history_store import append_prediction, get_history
from app.services.aggregate_store import record as record_anonymous_contribution
from app.services.community_risk import build_community_risk_index
from app.services.geocode_service import reverse_geocode
from app.services.mock_geo import (
    build_alerts,
    build_heatmap_data,
    build_nearby_hospitals,
    simulated_history_entries,
)
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

    explainability = build_explanation(
        fever=payload.symptoms.fever,
        breathlessness=payload.symptoms.breathlessness,
        fatigue=payload.symptoms.fatigue,
        cough_duration_days=payload.symptoms.cough_duration_days,
        historical_risk=payload.historical_risk_index,
        aqi=aqi,
        temperature_c=temp,
        humidity=hum,
        hour=ts.hour,
        region=payload.region,
        audio_score=p_audio,
        structured_score=structured,
        fused_score=fused,
    )

    append_prediction(
        {
            "region": payload.region,
            "risk_level": level,
            "fused_score": round(fused, 4),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "structured_score": round(structured, 4),
            "audio_score": round(p_audio, 4),
        }
    )

    return RiskPredictionResponse(
        risk_level=level,
        outbreak_probability=round(fused, 4),
        confidence=round(confidence, 4),
        structured_score=round(structured, 4),
        audio_score=round(p_audio, 4),
        fused_score=round(fused, 4),
        recommendations=recommendations_from_level(level),
        explainability=explainability,
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


@router.get("/get-heatmap-data", response_model=HeatmapResponse)
def get_heatmap_data(
    region: str = "Bengaluru",
    latitude: float = 12.9716,
    longitude: float = 77.5946,
) -> HeatmapResponse:
    return HeatmapResponse(**build_heatmap_data(latitude, longitude, region))


@router.get("/get-user-history", response_model=UserHistoryResponse)
def get_user_history(
    limit: int = 40,
    latitude: float = 12.9716,
    longitude: float = 77.5946,
    region: str = "Bengaluru",
) -> UserHistoryResponse:
    rows = get_history(limit)
    # Pad with simulated timeline for demo when storage is light
    if len(rows) < 8:
        pad = simulated_history_entries(latitude, longitude, region, n=min(14, limit - len(rows)))
        merged = rows + pad
    else:
        merged = rows
    merged = merged[:limit]
    return UserHistoryResponse(entries=merged)


@router.get("/get-alerts", response_model=AlertsResponse)
def get_alerts(
    region: str = "Bengaluru",
    risk_level: str = "Medium",
    latitude: float = 12.9716,
    longitude: float = 77.5946,
) -> AlertsResponse:
    items = build_alerts(region, risk_level, latitude, longitude)
    return AlertsResponse(alerts=items)


@router.get("/nearby-hospitals", response_model=NearbyHospitalsResponse)
def nearby_hospitals(
    latitude: float = 12.9716,
    longitude: float = 77.5946,
    limit: int = 6,
) -> NearbyHospitalsResponse:
    hospitals = build_nearby_hospitals(latitude, longitude, limit=min(limit, 10))
    return NearbyHospitalsResponse(hospitals=hospitals)


@router.get("/community-risk-index", response_model=CommunityRiskResponse)
def community_risk_index(
    region: str = "Bengaluru",
    latitude: float | None = None,
    longitude: float | None = None,
) -> CommunityRiskResponse:
    return CommunityRiskResponse(
        **build_community_risk_index(region, latitude=latitude, longitude=longitude)
    )


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
def reverse_geocode_endpoint(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> ReverseGeocodeResponse:
    data = reverse_geocode(latitude, longitude)
    return ReverseGeocodeResponse(**data)


@router.post("/contribute-anonymous")
def contribute_anonymous(payload: AnonymousContribution) -> dict:
    record_anonymous_contribution(
        payload.region,
        payload.risk_band,
        payload.latitude,
        payload.longitude,
    )
    return {"ok": True, "message": "Anonymous aggregate signal recorded (demo)."}
