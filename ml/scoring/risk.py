"""Converts estimated default probabilities into RepayX risk outputs."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.config import CLASSIFICATION_THRESHOLD, RISK_BAND_HIGH_FROM, RISK_BAND_MEDIUM_FROM

LOW, MEDIUM, HIGH = "Low Risk", "Medium Risk", "High Risk"


def risk_score(probability: np.ndarray | pd.Series) -> np.ndarray:
    """0-1 estimated default probability -> 0-100 risk score."""
    return np.asarray(probability, dtype="float64") * 100.0


def risk_category(score: np.ndarray | pd.Series) -> np.ndarray:
    """Prototype presentation bands: <30 Low, 30-<60 Medium, >=60 High."""
    score = np.asarray(score, dtype="float64")
    return np.select(
        [score >= RISK_BAND_HIGH_FROM, score >= RISK_BAND_MEDIUM_FROM],
        [HIGH, MEDIUM],
        default=LOW,
    )


def predicted_default(probability: np.ndarray | pd.Series, threshold: float = CLASSIFICATION_THRESHOLD) -> np.ndarray:
    """Binary model decision at the classification threshold (independent of risk bands)."""
    return (np.asarray(probability, dtype="float64") >= threshold).astype("int8")
