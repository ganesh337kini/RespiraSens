"""Heuristic explainability from structured-model ablations (aligned with API inputs)."""

from __future__ import annotations

from app.services.model_service import structured_risk_score


def build_explanation(
    *,
    fever: bool,
    breathlessness: bool,
    fatigue: bool,
    cough_duration_days: int,
    historical_risk: float,
    aqi: float,
    temperature_c: float,
    humidity: float,
    hour: int,
    region: str,
    audio_score: float,
    structured_score: float,
    fused_score: float,
) -> list[dict]:
    """Return sorted factors with human-readable messages (demo / educational)."""
    duration = cough_duration_days

    def s(
        *,
        f: bool | None = None,
        b: bool | None = None,
        fa: bool | None = None,
        d: int | None = None,
        hr: float | None = None,
        aq: float | None = None,
    ) -> float:
        return structured_risk_score(
            fever=f if f is not None else fever,
            breathlessness=b if b is not None else breathlessness,
            fatigue=fa if fa is not None else fatigue,
            duration=d if d is not None else duration,
            historical_risk=hr if hr is not None else historical_risk,
            aqi=aq if aq is not None else aqi,
            temperature_c=temperature_c,
            humidity=humidity,
            hour=hour,
            region=region,
        )

    current = structured_score
    factors: list[dict] = []

    if fever:
        alt = s(f=False)
        c = current - alt
        factors.append(
            {
                "key": "fever",
                "label": "Fever",
                "impact": "increase" if c > 0.015 else "neutral",
                "contribution": round(min(1.0, abs(c) * 3), 4),
                "message": "Presence of fever increased respiratory risk probability."
                if c > 0.015
                else "Fever contributes to the structured risk estimate.",
            }
        )

    if breathlessness:
        alt = s(b=False)
        c = current - alt
        factors.append(
            {
                "key": "breathlessness",
                "label": "Breathlessness",
                "impact": "increase" if c > 0.015 else "neutral",
                "contribution": round(min(1.0, abs(c) * 3), 4),
                "message": "Breathlessness raised the modeled risk compared to absence of this symptom."
                if c > 0.015
                else "Breathlessness is included in structured signals.",
            }
        )

    if fatigue:
        alt = s(fa=False)
        c = current - alt
        factors.append(
            {
                "key": "fatigue",
                "label": "Fatigue",
                "impact": "increase" if c > 0.015 else "neutral",
                "contribution": round(min(1.0, abs(c) * 3), 4),
                "message": "Fatigue increased the structured outbreak probability."
                if c > 0.015
                else "Fatigue is factored into the model.",
            }
        )

    baseline_aqi = 80.0
    c_aqi = s(aq=baseline_aqi)
    diff_aqi = current - c_aqi
    if abs(diff_aqi) > 0.012:
        factors.append(
            {
                "key": "aqi",
                "label": "Air quality (AQI)",
                "impact": "increase" if diff_aqi > 0 else "decrease",
                "contribution": round(min(1.0, abs(diff_aqi) * 2.5), 4),
                "message": f"AQI at {aqi:.0f} vs baseline {baseline_aqi:.0f} "
                + ("increased" if diff_aqi > 0 else "decreased")
                + " modeled risk.",
            }
        )

    if duration >= 5:
        alt = s(d=1)
        c = current - alt
        factors.append(
            {
                "key": "cough_duration",
                "label": "Cough duration",
                "impact": "increase" if c > 0.015 else "neutral",
                "contribution": round(min(1.0, abs(c) * 2.8), 4),
                "message": f"Cough duration of {duration} days elevated risk vs a shorter duration baseline.",
            }
        )

    alt_hist = s(hr=0.35)
    diff_h = current - alt_hist
    if abs(diff_h) > 0.018:
        factors.append(
            {
                "key": "historical_trend",
                "label": "Historical regional risk",
                "impact": "increase" if diff_h > 0 else "decrease",
                "contribution": round(min(1.0, abs(diff_h) * 2.2), 4),
                "message": "Your historical risk index for this region shifted the structured model "
                + ("upward." if diff_h > 0 else "downward."),
            }
        )

    audio_delta = fused_score - structured_score
    if abs(audio_delta) > 0.025:
        factors.append(
            {
                "key": "audio",
                "label": "Cough audio signal",
                "impact": "increase" if audio_delta > 0 else "decrease",
                "contribution": round(min(1.0, abs(audio_delta) * 2), 4),
                "message": "The audio pathway "
                + ("raised" if audio_delta > 0 else "lowered")
                + f" the fused score relative to structured-only (audio score {audio_score * 100:.0f}%).",
            }
        )

    factors.sort(key=lambda x: x["contribution"], reverse=True)
    return factors[:8]
