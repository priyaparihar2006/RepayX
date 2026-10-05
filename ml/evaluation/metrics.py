"""Classification metrics and threshold sweeps."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def threshold_metrics(y_true: np.ndarray, probability: np.ndarray, threshold: float) -> dict:
    y_pred = (probability >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "threshold": round(float(threshold), 4),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def ranking_metrics(y_true: np.ndarray, probability: np.ndarray) -> dict:
    return {
        "roc_auc": float(roc_auc_score(y_true, probability)),
        "average_precision": float(average_precision_score(y_true, probability)),
        "positive_rate": float(np.mean(y_true)),
        "n": int(len(y_true)),
    }


def threshold_sweep(y_true: np.ndarray, probability: np.ndarray, start=0.30, stop=0.90, step=0.05) -> list[dict]:
    thresholds = np.round(np.arange(start, stop + step / 2, step), 4)
    return [threshold_metrics(y_true, probability, t) for t in thresholds]


def best_f1_threshold(sweep: list[dict]) -> float:
    return max(sweep, key=lambda row: row["f1"])["threshold"]
