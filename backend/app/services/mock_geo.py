"""Mock geo + heatmap data for demo (no external API keys)."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone


def _jitter(lat: float, lng: float, seed: int) -> tuple[float, float]:
    rng = random.Random(seed)
    return lat + rng.uniform(-0.04, 0.04), lng + rng.uniform(-0.04, 0.04)


def build_heatmap_data(latitude: float, longitude: float, region: str) -> dict:
    """Risk intensity points + simple clusters around user viewport."""
    rng = random.Random(hash(region) % 2**32)
    center = (latitude, longitude)
    points: list[dict] = []
    for i in range(18):
        plat, plng = _jitter(center[0], center[1], i * 97 + 13)
        intensity = max(0.08, min(0.98, 0.25 + rng.random() * 0.55 + (i % 5) * 0.03))
        points.append(
            {
                "id": i + 1,
                "lat": round(plat, 5),
                "lng": round(plng, 5),
                "intensity": round(intensity, 4),
                "label": f"Sector {i + 1}",
            }
        )

    clusters = []
    for c in range(4):
        clat, clng = _jitter(center[0], center[1], 300 + c)
        cnt = rng.randint(3, 28)
        avg = max(0.15, min(0.95, 0.35 + rng.random() * 0.45))
        clusters.append(
            {
                "lat": round(clat, 5),
                "lng": round(clng, 5),
                "count": cnt,
                "avg_risk": round(avg, 4),
            }
        )

    return {
        "region": region,
        "center": {"lat": latitude, "lng": longitude},
        "points": points,
        "clusters": clusters,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_nearby_hospitals(latitude: float, longitude: float, limit: int = 6) -> list[dict]:
    names = [
        "Pulmonary Care Institute",
        "Metro Respiratory ER",
        "City General Hospital",
        "Northside Medical Center",
        "Community Health Clinic",
        "24/7 Urgent Care Hub",
    ]
    out = []
    for i, name in enumerate(names[:limit]):
        hlat, hlng = _jitter(latitude, longitude, 900 + i * 31)
        dist = 0.8 + i * 1.1 + (hash(name) % 7) * 0.05
        out.append(
            {
                "id": i + 1,
                "name": name,
                "lat": round(hlat, 5),
                "lng": round(hlng, 5),
                "distance_km": round(dist, 1),
                "phone": f"+91 80 {4200 + i * 111} {1000 + i * 99}",
                "emergency": i < 2,
            }
        )
    out.sort(key=lambda x: x["distance_km"])
    return out


def build_alerts(
    region: str,
    risk_level: str,
    latitude: float,
    longitude: float,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    alerts: list[dict] = []
    if risk_level == "High":
        alerts.append(
            {
                "id": "a1",
                "severity": "high",
                "title": "High risk detected in your region",
                "message": f"Elevated respiratory risk near {region}. Consider clinical evaluation.",
                "timestamp": now.isoformat(),
            }
        )
    elif risk_level == "Medium":
        alerts.append(
            {
                "id": "a2",
                "severity": "medium",
                "title": "Moderate risk — stay vigilant",
                "message": "Symptoms and context suggest medium outbreak probability. Monitor closely.",
                "timestamp": now.isoformat(),
            }
        )
    else:
        alerts.append(
            {
                "id": "a3",
                "severity": "low",
                "title": "Region relatively stable",
                "message": "No acute alert for your current inputs. Continue preventive habits.",
                "timestamp": (now - timedelta(minutes=12)).isoformat(),
            }
        )

    # Environmental / geo contextual (mock)
    if hash(region) % 3 == 0:
        alerts.append(
            {
                "id": "a4",
                "severity": "medium",
                "title": "Air quality advisory",
                "message": "Particulate levels may aggravate respiratory symptoms in dense corridors.",
                "timestamp": (now - timedelta(hours=2)).isoformat(),
            }
        )

    # Sudden spike (demo syndromic signal)
    if hash(region) % 4 == 1:
        alerts.insert(
            0,
            {
                "id": "spike-signal",
                "severity": "high",
                "title": "Sudden spike in modeled respiratory signals",
                "message": f"Anonymized cluster data suggests a short-term uptick near {region}. Monitor official advisories.",
                "timestamp": (now - timedelta(minutes=45)).isoformat(),
            },
        )

    return alerts[:6]


def simulated_history_entries(latitude: float, longitude: float, region: str, n: int = 12) -> list[dict]:
    """Synthetic timeline when storage is sparse."""
    rng = random.Random(42)
    base = datetime.now(timezone.utc)
    out = []
    for i in range(n):
        t = base - timedelta(days=i * 2 + rng.randint(0, 1))
        fused = max(0.08, min(0.95, 0.28 + (i % 5) * 0.07 + rng.uniform(-0.06, 0.06)))
        lvl = "Low" if fused < 0.35 else ("Medium" if fused < 0.67 else "High")
        plat, plng = _jitter(latitude, longitude, 500 + i)
        out.append(
            {
                "recorded_at": t.isoformat(),
                "region": region,
                "latitude": round(plat, 5),
                "longitude": round(plng, 5),
                "fused_score": round(fused, 4),
                "risk_level": lvl,
                "simulated": True,
            }
        )
    return out
