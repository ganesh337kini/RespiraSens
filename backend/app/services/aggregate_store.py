"""Append-only anonymous contribution log for demo transparency (opt-in)."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

_lock = threading.Lock()
_PATH = Path(__file__).resolve().parents[2] / "data" / "anonymous_contributions.jsonl"


def record(
    region: str,
    risk_band: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> None:
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "region": region[:120],
        "risk_band": risk_band,
    }
    if latitude is not None and longitude is not None:
        row["lat_grid"] = round(float(latitude), 2)
        row["lon_grid"] = round(float(longitude), 2)
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        with _PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
