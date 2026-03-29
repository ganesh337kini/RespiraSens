from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SymptomInput(BaseModel):
    fever: bool
    breathlessness: bool
    fatigue: bool
    cough_duration_days: int = Field(ge=0, le=30)


class RiskPredictionRequest(BaseModel):
    symptoms: SymptomInput
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    region: str
    timestamp: str
    historical_risk_index: float = Field(ge=0, le=1)
    aqi: float | None = Field(default=None, ge=0, le=500)
    temperature_c: float | None = Field(default=None, ge=-50, le=60)
    humidity: float | None = Field(default=None, ge=0, le=100)
    audio_risk_score: float | None = Field(default=None, ge=0, le=1)
    # Optional: full proxy features from /analyze-audio for the trained audio head
    audio_features: dict[str, float] | None = None


class ExplainFactor(BaseModel):
    key: str
    label: str
    impact: str
    contribution: float
    message: str


class RiskPredictionResponse(BaseModel):
    risk_level: str
    outbreak_probability: float
    confidence: float
    structured_score: float
    audio_score: float
    fused_score: float
    recommendations: list[str]
    explainability: list[ExplainFactor] = []


class HeatmapPoint(BaseModel):
    id: int
    lat: float
    lng: float
    intensity: float
    label: str


class HeatmapCluster(BaseModel):
    lat: float
    lng: float
    count: int
    avg_risk: float


class MapCenter(BaseModel):
    lat: float
    lng: float


class HeatmapResponse(BaseModel):
    region: str
    center: MapCenter
    points: list[HeatmapPoint]
    clusters: list[HeatmapCluster]
    generated_at: str


class HistoryEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    recorded_at: str
    region: str
    latitude: float
    longitude: float
    fused_score: float
    risk_level: str
    simulated: bool | None = None


class UserHistoryResponse(BaseModel):
    entries: list[HistoryEntry]


class AlertItem(BaseModel):
    id: str
    severity: str
    title: str
    message: str
    timestamp: str


class AlertsResponse(BaseModel):
    alerts: list[AlertItem]


class HospitalItem(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    distance_km: float
    phone: str
    emergency: bool


class NearbyHospitalsResponse(BaseModel):
    hospitals: list[HospitalItem]


class TrendPoint(BaseModel):
    date: str
    risk_index: float


class TrendResponse(BaseModel):
    region: str
    trend: list[TrendPoint]
    forecast: list[TrendPoint]
    hotspot_score: float


class PeerRegion(BaseModel):
    region: str
    index: float
    trend: str


class CommunityRiskResponse(BaseModel):
    focus_region: str
    community_index: float
    trend_direction: str
    delta_7d: float
    sample_size_anonymous: int
    peer_regions: list[PeerRegion]
    updated_at: str
    method_note: str


class AnonymousContribution(BaseModel):
    region: str
    risk_band: Literal["low", "medium", "high"]
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class ReverseGeocodeResponse(BaseModel):
    region: str
    display_name: str
    latitude: float
    longitude: float
    country: str | None = None
