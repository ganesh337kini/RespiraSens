from __future__ import annotations

import math


def _norm(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def extract_audio_features(file_bytes: bytes) -> dict[str, float]:
    """
    Lightweight audio proxy features from raw bytes.
    This avoids heavy native dependencies so backend remains portable.
    """
    raw = list(file_bytes[:12000])
    if not raw:
        raw = [0]

    n = len(raw)
    mean_val = sum(raw) / n
    energy = _norm(mean_val / 255.0)

    if n > 1:
        diffs = [abs(raw[i] - raw[i - 1]) for i in range(1, n)]
        zcr = _norm((sum(diffs) / len(diffs)) / 255.0)
    else:
        zcr = 0.0

    window = max(4, n // 200)
    chunk_means = []
    for i in range(0, n, window):
        part = raw[i : i + window]
        if part:
            chunk_means.append(sum(part) / len(part))
    spectral_centroid = _norm(
        sum((idx + 1) * m for idx, m in enumerate(chunk_means))
        / (max(1, len(chunk_means)) * 255.0 * max(1, len(chunk_means)))
    )

    # MFCC proxy (not true MFCC): smooth blend of signal roughness + energy.
    mfcc_mean = _norm(0.6 * energy + 0.4 * zcr)
    roughness = _norm(abs(zcr - energy) + 0.05 * (spectral_centroid))

    raw_score = 0.45 * mfcc_mean + 0.20 * zcr + 0.20 * spectral_centroid + 0.15 * energy
    score = 1 / (1 + math.exp(-8 * (raw_score - 0.2)))

    return {
        "audio_risk_score": _norm(score),
        "mfcc_mean": mfcc_mean,
        "zcr": zcr,
        "spectral_centroid": spectral_centroid,
        "energy": energy,
        "roughness": roughness,
    }
