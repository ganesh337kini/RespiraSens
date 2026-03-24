from pydantic import BaseModel, Field


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


class RiskPredictionResponse(BaseModel):
    risk_level: str
    outbreak_probability: float
    confidence: float
    structured_score: float
    audio_score: float
    fused_score: float
    recommendations: list[str]


class TrendPoint(BaseModel):
    date: str
    risk_index: float


class TrendResponse(BaseModel):
    region: str
    trend: list[TrendPoint]
    forecast: list[TrendPoint]
    hotspot_score: float
