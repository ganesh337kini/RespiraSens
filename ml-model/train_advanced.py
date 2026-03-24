#!/usr/bin/env python3
"""
RespiraSense 2.0 — Advanced ML training pipeline.

Trains:
  1. Structured risk: Calibrated HistGradientBoostingClassifier (tabular symptoms + env + time + region).
  2. Audio proxy: Gradient boosting on acoustic proxy features (matches backend byte-level features).
  3. Fusion: Meta LogisticRegression on [p_struct, p_audio, region, hour].
  4. Trend: HistGradientBoostingRegressor for outbreak index vs time context.

Run from repo root:
  cd ml-model && pip install -r requirements-train.txt && python train_advanced.py

Artifacts are written to ml-model/artifacts/ and copied to backend/ml_artifacts/ for serving.
"""

from __future__ import annotations

import json
import math
import shutil
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
BACKEND_ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "backend" / "ml_artifacts"
RNG = np.random.default_rng(42)
N_SAMPLES = 120_000


def region_norm_from_seed(values: np.ndarray, modulo: int = 64) -> np.ndarray:
    """Deterministic region embedding compatible with API string hashing."""
    return (values % modulo).astype(np.float64) / float(modulo - 1)


def build_structured_dataset(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Synthetic multimodal outbreak labels (demo / research proxy — not clinical ground truth)."""
    fever = rng.integers(0, 2, n)
    breath = rng.integers(0, 2, n)
    fatigue = rng.integers(0, 2, n)
    duration = rng.integers(0, 31, n)
    hist = rng.uniform(0.0, 1.0, n)
    aqi = rng.uniform(15.0, 280.0, n)
    temp = rng.uniform(16.0, 40.0, n)
    hum = rng.uniform(25.0, 98.0, n)
    hour = rng.integers(0, 24, n)
    region_seed = rng.integers(0, 10_000, n)
    region_norm = region_norm_from_seed(region_seed)

    # Nonlinear epidemiological-style risk with interactions + noise
    logit = (
        -2.15
        + 1.45 * fever
        + 1.25 * breath
        + 0.92 * fatigue
        + 0.035 * duration
        + 1.55 * hist
        + 0.0028 * aqi
        + 0.055 * (temp - 28.0)
        - 0.012 * (hum - 55.0)
        + 0.22 * np.sin(2 * math.pi * hour / 24.0)
        + 0.18 * np.cos(2 * math.pi * hour / 24.0)
        + 0.12 * (region_seed % 12) / 12.0
        + 0.55 * fever * breath
        + 0.28 * breath * fatigue
        + rng.normal(0.0, 0.38, n)
    )
    p = 1.0 / (1.0 + np.exp(-logit))
    y = (p > rng.uniform(0.0, 1.0, n)).astype(np.int32)

    X = np.column_stack(
        [
            fever.astype(np.float64),
            breath.astype(np.float64),
            fatigue.astype(np.float64),
            (duration / 30.0).astype(np.float64),
            hist,
            (aqi / 500.0).astype(np.float64),
            ((temp - 20.0) / 22.0).astype(np.float64),
            (hum / 100.0).astype(np.float64),
            np.sin(2 * math.pi * hour / 24.0),
            np.cos(2 * math.pi * hour / 24.0),
            region_norm,
        ]
    )
    return X, y


def build_audio_proxy_features(
    n: int, structured_prob: np.ndarray, rng: np.random.Generator
) -> np.ndarray:
    """Correlated proxy features (same signal family as backend byte-level extractors)."""
    p = np.clip(structured_prob + rng.normal(0.0, 0.12, n), 0.0, 1.0)
    energy = np.clip(0.25 + 0.55 * p + rng.uniform(-0.08, 0.08, n), 0.0, 1.0)
    zcr = np.clip(0.15 + 0.45 * p + rng.normal(0.0, 0.1, n), 0.0, 1.0)
    centroid = np.clip(0.2 + 0.4 * p + 0.15 * rng.random(n), 0.0, 1.0)
    mfcc_mean = np.clip(0.6 * energy + 0.4 * zcr + rng.normal(0.0, 0.04, n), 0.0, 1.0)
    roughness = np.clip(np.abs(zcr - energy) + 0.1 * rng.random(n), 0.0, 1.0)
    return np.column_stack([mfcc_mean, zcr, centroid, energy, roughness])


def build_trend_dataset(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    t = rng.integers(0, 45, n)
    hist = rng.uniform(0.0, 1.0, n)
    reg = rng.uniform(0.0, 1.0, n)
    y = (
        0.26
        + 0.011 * t
        + 0.085 * np.sin(t / 5.0)
        + 0.42 * (hist - 0.5)
        + 0.15 * (reg - 0.5)
        + rng.normal(0.0, 0.025, n)
    )
    y = np.clip(y, 0.05, 0.99)
    X = np.column_stack([t.astype(np.float64), np.sin(t / 5.0), np.cos(t / 5.0), hist, reg])
    return X, y


def main() -> int:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    print("Generating structured dataset…", flush=True)
    X, y = build_structured_dataset(N_SAMPLES, RNG)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    base_clf = HistGradientBoostingClassifier(
        max_iter=340,
        max_depth=10,
        min_samples_leaf=24,
        learning_rate=0.06,
        l2_regularization=1e-3,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.08,
        n_iter_no_change=25,
    )
    print("Training calibrated structured classifier (5-fold isotonic)…", flush=True)
    structured_model = CalibratedClassifierCV(base_clf, method="isotonic", cv=5)
    structured_model.fit(X_train, y_train)

    y_proba = structured_model.predict_proba(X_test)[:, 1]
    y_hat = (y_proba >= 0.5).astype(int)
    acc = accuracy_score(y_test, y_hat)
    auc = roc_auc_score(y_test, y_proba)
    f1 = f1_score(y_test, y_hat)

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=7)
    cv_aucs: list[float] = []
    for tr, va in skf.split(X_train, y_train):
        fold_clf = HistGradientBoostingClassifier(
            max_iter=280,
            max_depth=9,
            min_samples_leaf=28,
            learning_rate=0.07,
            l2_regularization=1e-3,
            random_state=99,
        )
        fold_clf.fit(X_train[tr], y_train[tr])
        p = fold_clf.predict_proba(X_train[va])[:, 1]
        cv_aucs.append(roc_auc_score(y_train[va], p))
    cv_auc_mean = float(np.mean(cv_aucs))

    print(f"Hold-out  Accuracy: {acc:.4f}  ROC-AUC: {auc:.4f}  F1: {f1:.4f}", flush=True)
    print(f"5-fold CV mean ROC-AUC (train subset, uncalibrated HGB): {cv_auc_mean:.4f}", flush=True)

    p_struct_full = structured_model.predict_proba(X)[:, 1]
    audio_X = build_audio_proxy_features(N_SAMPLES, p_struct_full, RNG)

    Xa_train, Xa_test, ya_train, ya_test = train_test_split(
        audio_X, y, test_size=0.15, random_state=11, stratify=y
    )
    audio_clf = HistGradientBoostingClassifier(
        max_iter=260,
        max_depth=9,
        min_samples_leaf=32,
        learning_rate=0.08,
        random_state=3,
        early_stopping=True,
        validation_fraction=0.1,
    )
    print("Training audio proxy classifier…", flush=True)
    audio_cal = CalibratedClassifierCV(audio_clf, method="sigmoid", cv=4)
    audio_cal.fit(Xa_train, ya_train)

    ap = audio_cal.predict_proba(Xa_test)[:, 1]
    a_acc = accuracy_score(ya_test, (ap >= 0.5).astype(int))
    a_auc = roc_auc_score(ya_test, ap)
    print(f"Audio hold-out  Accuracy: {a_acc:.4f}  ROC-AUC: {a_auc:.4f}", flush=True)

    p_audio_full = audio_cal.predict_proba(audio_X)[:, 1]
    region_norm = X[:, 10]
    meta_X = np.column_stack([p_struct_full, p_audio_full, region_norm, X[:, 8], X[:, 9]])
    Xm_train, Xm_test, ym_train, ym_test = train_test_split(
        meta_X, y, test_size=0.15, random_state=19, stratify=y
    )
    fusion = LogisticRegression(max_iter=2500, C=0.9, random_state=0)
    fusion.fit(Xm_train, ym_train)
    fp = fusion.predict_proba(Xm_test)[:, 1]
    f_acc = accuracy_score(ym_test, (fp >= 0.5).astype(int))
    f_auc = roc_auc_score(ym_test, fp)
    print(f"Fusion hold-out  Accuracy: {f_acc:.4f}  ROC-AUC: {f_auc:.4f}", flush=True)

    Xt, yt = build_trend_dataset(35_000, RNG)
    Xtr, Xte, ytr, yte = train_test_split(Xt, yt, test_size=0.15, random_state=21)
    trend_reg = HistGradientBoostingRegressor(
        max_iter=240,
        max_depth=8,
        learning_rate=0.08,
        random_state=5,
    )
    print("Training trend regressor…", flush=True)
    trend_reg.fit(Xtr, ytr)
    pred = trend_reg.predict(Xte)
    mae = float(np.mean(np.abs(pred - yte)))
    print(f"Trend hold-out MAE: {mae:.4f}", flush=True)

    report = {
        "n_samples": N_SAMPLES,
        "structured_holdout_accuracy": round(acc, 5),
        "structured_holdout_roc_auc": round(auc, 5),
        "structured_holdout_f1": round(f1, 5),
        "structured_cv_mean_roc_auc_uncalibrated_hgb": round(cv_auc_mean, 5),
        "audio_holdout_accuracy": round(a_acc, 5),
        "audio_holdout_roc_auc": round(a_auc, 5),
        "fusion_holdout_accuracy": round(f_acc, 5),
        "fusion_holdout_roc_auc": round(f_auc, 5),
        "trend_holdout_mae": round(mae, 5),
        "feature_schema": {
            "structured": [
                "fever",
                "breathlessness",
                "fatigue",
                "cough_duration_norm",
                "historical_risk",
                "aqi_norm",
                "temp_norm",
                "humidity_norm",
                "hour_sin",
                "hour_cos",
                "region_norm",
            ],
            "audio": ["mfcc_mean", "zcr", "spectral_centroid", "energy", "roughness"],
            "fusion": ["p_struct", "p_audio", "region_norm", "hour_sin", "hour_cos"],
            "trend": ["t_index", "sin_t", "cos_t", "historical_risk", "region_numeric"],
        },
    }
    (ARTIFACT_DIR / "training_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    joblib.dump(structured_model, ARTIFACT_DIR / "structured_calibrated.joblib")
    joblib.dump(audio_cal, ARTIFACT_DIR / "audio_calibrated.joblib")
    joblib.dump(fusion, ARTIFACT_DIR / "fusion_meta.joblib")
    joblib.dump(trend_reg, ARTIFACT_DIR / "trend_hgb.joblib")

    for name in (
        "structured_calibrated.joblib",
        "audio_calibrated.joblib",
        "fusion_meta.joblib",
        "trend_hgb.joblib",
        "training_report.json",
    ):
        src = ARTIFACT_DIR / name
        shutil.copy2(src, BACKEND_ARTIFACT_DIR / name)

    print("\nSaved artifacts:", ARTIFACT_DIR, flush=True)
    print("Copied for API to:", BACKEND_ARTIFACT_DIR, flush=True)
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
