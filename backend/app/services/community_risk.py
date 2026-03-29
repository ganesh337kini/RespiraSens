"""Aggregate-style community risk index (demo — anonymized regional modeling)."""

from __future__ import annotations

import random
from datetime import datetime, timezone


def build_community_risk_index(
    region: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """
    Simulates a population-level risk index for dashboards.
    Coordinates lightly perturb the deterministic seed so nearby areas differ (demo).
    """
    base_seed = hash(region.strip().lower()) % (2**32)
    geo_mix = 0
    if latitude is not None and longitude is not None:
        geo_mix = hash((round(latitude, 4), round(longitude, 4))) % (2**32)
    seed = base_seed ^ geo_mix
    rng = random.Random(seed)
    idx = round(0.32 + rng.random() * 0.48, 2)
    directions = ["rising", "falling", "stable"]
    trend = directions[seed % 3]
    delta_7d = round((rng.random() - 0.42) * 0.14, 3)

    peer_pool = [
        ("Mumbai", 0.58, "rising"),
        ("Delhi", 0.71, "rising"),
        ("Chennai", 0.44, "falling"),
        ("Hyderabad", 0.52, "stable"),
        ("Kolkata", 0.49, "rising"),
        ("Pune", 0.41, "falling"),
    ]
    peers = []
    for name, base, tr in peer_pool:
        if name.lower() == region.strip().lower():
            continue
        jitter = rng.uniform(-0.06, 0.06)
        peers.append(
            {
                "region": name,
                "index": round(max(0.1, min(0.95, base + jitter)), 2),
                "trend": tr,
            }
        )
    peers = sorted(peers, key=lambda x: -x["index"])[:5]

    return {
        "focus_region": region,
        "community_index": idx,
        "trend_direction": trend,
        "delta_7d": delta_7d,
        "sample_size_anonymous": 10200 + (seed % 8000),
        "peer_regions": peers,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "method_note": "Demo aggregate seeded by region + coarse coordinates (location-aware); not live epidemiology.",
    }
