"""Append-only prediction history for timeline APIs (JSON file + in-memory cache)."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

_MAX = 250
_lock = threading.Lock()
_cache: list[dict] | None = None

_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "prediction_history.json"


def _load() -> list[dict]:
    global _cache
    if _cache is not None:
        return _cache
    _DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _DATA_PATH.is_file():
        try:
            raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
            _cache = raw if isinstance(raw, list) else []
        except Exception:
            _cache = []
    else:
        _cache = []
    return _cache


def _save(rows: list[dict]) -> None:
    _DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    _DATA_PATH.write_text(json.dumps(rows[-_MAX:], indent=2), encoding="utf-8")


def append_prediction(entry: dict) -> None:
    global _cache
    with _lock:
        rows = _load()
        entry = {**entry, "recorded_at": datetime.now(timezone.utc).isoformat()}
        rows.append(entry)
        _cache = rows[-_MAX:]
        _save(_cache)


def get_history(limit: int = 40) -> list[dict]:
    with _lock:
        rows = list(_load())
    rows.sort(key=lambda r: r.get("recorded_at", ""), reverse=True)
    return rows[: max(1, min(limit, _MAX))]
