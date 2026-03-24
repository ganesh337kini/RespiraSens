from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np

_STRUCTURED_MODEL: Any = None
_AUDIO_MODEL: Any = None
_FUSION_MODEL: Any = None
_TREND_MODEL_ML: Any = None
_ARTIFACT_DIR: Path | None = None


def _resolve_artifact_dir() -> Path | None:
    backend_root = Path(__file__).resolve().parents[2]
    repo_root = backend_root.parent
    for directory in (backend_root / "ml_artifacts", repo_root / "ml-model" / "artifacts"):
        if (directory / "structured_calibrated.joblib").is_file():
            return directory
    return None


def bootstrap_models() -> None:
    global _STRUCTURED_MODEL, _AUDIO_MODEL, _FUSION_MODEL, _TREND_MODEL_ML, _ARTIFACT_DIR
    _ARTIFACT_DIR = _resolve_artifact_dir()
    if _ARTIFACT_DIR is None:
        return
    try:
        import joblib

        _STRUCTURED_MODEL = joblib.load(_ARTIFACT_DIR / "structured_calibrated.joblib")
        if (_ARTIFACT_DIR / "audio_calibrated.joblib").is_file():
            _AUDIO_MODEL = joblib.load(_ARTIFACT_DIR / "audio_calibrated.joblib")
        if (_ARTIFACT_DIR / "fusion_meta.joblib").is_file():
            _FUSION_MODEL = joblib.load(_ARTIFACT_DIR / "fusion_meta.joblib")
        if (_ARTIFACT_DIR / "trend_hgb.joblib").is_file():
            _TREND_MODEL_ML = joblib.load(_ARTIFACT_DIR / "trend_hgb.joblib")
    except Exception:
        _STRUCTURED_MODEL = None
        _AUDIO_MODEL = None
        _FUSION_MODEL = None
        _TREND_MODEL_ML = None


def region_norm_from_str(region: str) -> float:
    return float(sum(ord(c) for c in region.lower()) % 64) / 63.0


def _region_to_numeric(region: str) -> float:
    return float(sum(ord(c) for c in region.lower()) % 100) / 100.0


def _structured_feature_row(
    fever: bool,
    breathlessness: bool,
    fatigue: bool,
    duration: int,
    historical_risk: float,
    aqi: float,
    temperature_c: float,
    humidity: float,
    hour: int,
    region: str,
) -> np.ndarray:
    reg_norm = region_norm_from_str(region)
    return np.array(
        [
            [
                float(fever),
                float(breathlessness),
                float(fatigue),
                float(duration) / 30.0,
                float(historical_risk),
                float(aqi) / 500.0,
                (float(temperature_c) - 20.0) / 22.0,
                float(humidity) / 100.0,
                math.sin(2 * math.pi * hour / 24.0),
                math.cos(2 * math.pi * hour / 24.0),
                reg_norm,
            ]
        ],
        dtype=np.float64,
    )


def structured_risk_score(
    fever: bool,
    breathlessness: bool,
    fatigue: bool,
    duration: int,
    historical_risk: float,
    aqi: float,
    temperature_c: float = 26.0,
    humidity: float = 55.0,
    hour: int = 12,
    region: str = "",
) -> float:
    if _STRUCTURED_MODEL is not None:
        x = _structured_feature_row(
            fever=fever,
            breathlessness=breathlessness,
            fatigue=fatigue,
            duration=duration,
            historical_risk=historical_risk,
            aqi=aqi,
            temperature_c=temperature_c,
            humidity=humidity,
            hour=hour,
            region=region,
        )
        proba = float(_STRUCTURED_MODEL.predict_proba(x)[0][1])
        return float(max(0.0, min(1.0, proba)))

    raw = (
        0.30 * int(fever)
        + 0.28 * int(breathlessness)
        + 0.20 * int(fatigue)
        + 0.08 * min(duration / 10.0, 1.0)
        + 0.09 * min(max(historical_risk, 0.0), 1.0)
        + 0.05 * min(max(aqi / 500.0, 0.0), 1.0)
    )
    score = 1 / (1 + math.exp(-7 * (raw - 0.45)))
    return float(max(0.0, min(1.0, score)))


def audio_proba_from_inputs(
    audio_features: dict[str, float] | None,
    audio_risk_score: float | None,
) -> float:
    if _AUDIO_MODEL is not None and audio_features:
        keys = ("mfcc_mean", "zcr", "spectral_centroid", "energy", "roughness")
        vec = np.array(
            [[float(audio_features.get(k, 0.0)) for k in keys]],
            dtype=np.float64,
        )
        proba = float(_AUDIO_MODEL.predict_proba(vec)[0][1])
        return float(max(0.0, min(1.0, proba)))
    fallback = audio_risk_score if audio_risk_score is not None else 0.35
    return float(max(0.0, min(1.0, fallback)))


def fuse_scores(structured: float, audio: float, region: str, hour: int) -> tuple[float, float]:
    region_factor = _region_to_numeric(region)
    time_factor = 0.03 if hour in range(5, 10) or hour in range(17, 21) else 0.0
    fused = 0.55 * structured + 0.35 * audio + 0.10 * region_factor + time_factor
    fused = float(max(0.0, min(1.0, fused)))

    confidence = 0.70 + 0.25 * abs(structured - 0.5) + 0.05 * abs(audio - structured)
    return fused, float(max(0.0, min(0.99, confidence)))


def fused_outbreak_probability(
    p_structured: float,
    p_audio: float,
    region: str,
    hour: int,
) -> tuple[float, float]:
    if _FUSION_MODEL is not None:
        regn = region_norm_from_str(region)
        hs = math.sin(2 * math.pi * hour / 24.0)
        hc = math.cos(2 * math.pi * hour / 24.0)
        meta = np.array([[p_structured, p_audio, regn, hs, hc]], dtype=np.float64)
        p = float(_FUSION_MODEL.predict_proba(meta)[0][1])
        p = float(max(0.0, min(1.0, p)))
        confidence = float(0.58 + 0.40 * abs(p - 0.5))
        return p, float(max(0.0, min(0.99, confidence)))
    return fuse_scores(p_structured, p_audio, region, hour)


def risk_level_from_score(score: float) -> str:
    if score < 0.35:
        return "Low"
    if score < 0.67:
        return "Medium"
    return "High"


def recommendations_from_level(level: str) -> list[str]:
    base = ["Maintain hydration and monitor respiratory symptoms daily."]
    if level == "Low":
        return base + ["Continue preventive behavior in crowded environments."]
    if level == "Medium":
        return base + [
            "Use masks in enclosed spaces.",
            "Schedule a tele-consult if cough persists beyond 3 days.",
        ]
    return base + [
        "Seek clinical evaluation within 24 hours.",
        "Reduce exposure in high-density areas and improve indoor ventilation.",
        "Alert local health network for cluster monitoring.",
    ]


def generate_trend(region: str, historical_risk: float) -> dict:
    today = datetime.utcnow().date()
    past_dates = [today - timedelta(days=13 - i) for i in range(14)]
    future_dates = [today + timedelta(days=i + 1) for i in range(7)]
    regn = region_norm_from_str(region)
    hist = float(max(0.0, min(1.0, historical_risk)))

    if _TREND_MODEL_ML is not None:
        past_values: list[float] = []
        for i in range(14):
            x = np.array(
                [[i, math.sin(i / 5.0), math.cos(i / 5.0), hist, regn]],
                dtype=np.float64,
            )
            v = float(_TREND_MODEL_ML.predict(x)[0])
            past_values.append(max(0.05, min(0.98, v)))
        future_values: list[float] = []
        for i in range(14, 21):
            x = np.array(
                [[i, math.sin(i / 5.0), math.cos(i / 5.0), hist, regn]],
                dtype=np.float64,
            )
            v = float(_TREND_MODEL_ML.predict(x)[0])
            future_values.append(max(0.05, min(0.99, v)))
        hotspot_score = float(sum(future_values[-3:]) / 3.0)
        return {
            "trend": [
                {"date": d.isoformat(), "risk_index": float(v)} for d, v in zip(past_dates, past_values)
            ],
            "forecast": [
                {"date": d.isoformat(), "risk_index": float(v)} for d, v in zip(future_dates, future_values)
            ],
            "hotspot_score": float(max(0.0, min(1.0, hotspot_score))),
        }

    x_past = list(range(14))
    base = [0.25 + 0.012 * x + 0.08 * math.sin(x / 5.0) for x in x_past]
    offset = (_region_to_numeric(region) - 0.5) * 0.12 + (historical_risk - 0.5) * 0.20
    past_values = [max(0.05, min(0.98, v + offset)) for v in base]

    x_future = list(range(14, 21))
    future_base = [0.25 + 0.012 * x + 0.08 * math.sin(x / 5.0) for x in x_future]
    future_values = [max(0.05, min(0.99, v + offset + 0.02)) for v in future_base]
    hotspot_score = float(sum(future_values[-3:]) / 3.0)

    return {
        "trend": [
            {"date": d.isoformat(), "risk_index": float(v)} for d, v in zip(past_dates, past_values)
        ],
        "forecast": [
            {"date": d.isoformat(), "risk_index": float(v)} for d, v in zip(future_dates, future_values)
        ],
        "hotspot_score": float(max(0.0, min(1.0, hotspot_score))),
    }
