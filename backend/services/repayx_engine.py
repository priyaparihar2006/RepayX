"""Loads the trained RepayX risk model once and exposes its configuration.

The model is a scikit-learn Pipeline written by `python -m ml.training.train_model`
alongside a metadata JSON file. Before unpickling, the artifact's SHA-256 is
checked against the metadata; afterwards the scikit-learn version and the
model's input columns are validated. joblib files execute code when loaded, so
only artifacts produced by this project's pipeline should be configured.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import sklearn

logger = logging.getLogger(__name__)

SUPPORTED_METADATA_SCHEMA = 1


class ModelLoadError(Exception):
    """The model artifacts exist but cannot be used."""


@dataclass(frozen=True)
class RiskBands:
    medium_from: float
    high_from: float

    def category(self, risk_score: float) -> str:
        if risk_score >= self.high_from:
            return "High Risk"
        if risk_score >= self.medium_from:
            return "Medium Risk"
        return "Low Risk"


@dataclass(frozen=True)
class RiskModel:
    pipeline: Any
    model_version: str
    classification_threshold: float
    risk_bands: RiskBands
    input_columns: tuple[str, ...]
    holdout_metrics: dict

    def default_probability(self, features: pd.DataFrame) -> pd.Series:
        """Estimated default probability (0-1) for rows of model input features."""
        missing = set(self.input_columns) - set(features.columns)
        if missing:
            raise ValueError(f"Missing model input columns: {sorted(missing)}")
        proba = self.pipeline.predict_proba(features[list(self.input_columns)])[:, 1]
        return pd.Series(proba, index=features.index, name="default_probability")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_risk_model(model_path: Path, metadata_path: Path) -> RiskModel:
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ModelLoadError("Model metadata is unreadable.") from exc

    try:
        if metadata.get("schema_version") != SUPPORTED_METADATA_SCHEMA:
            raise ModelLoadError("Unsupported model metadata schema version.")
        if metadata["artifact_sha256"] != _sha256(model_path):
            raise ModelLoadError("Model file does not match its metadata checksum.")
        trained_with = metadata["environment"]["scikit_learn"]
        if trained_with != sklearn.__version__:
            raise ModelLoadError(
                f"Model trained with scikit-learn {trained_with}; backend has {sklearn.__version__}."
            )
        columns = tuple(metadata["features"]["model_input_columns"])
        threshold = float(metadata["classification_threshold"])
        bands = RiskBands(
            medium_from=float(metadata["risk_bands"]["medium_from"]),
            high_from=float(metadata["risk_bands"]["high_from"]),
        )
        version = str(metadata["model_version"])
        holdout = dict(metadata.get("holdout_metrics", {}))
    except (KeyError, TypeError, ValueError) as exc:
        raise ModelLoadError("Model metadata is incomplete.") from exc

    if not 0.0 < threshold < 1.0 or not 0.0 <= bands.medium_from < bands.high_from <= 100.0:
        raise ModelLoadError("Model metadata has invalid threshold or risk bands.")

    try:
        pipeline = joblib.load(model_path)
    except Exception as exc:  # corrupted pickle, missing class, etc.
        raise ModelLoadError("Model file could not be loaded.") from exc

    if not hasattr(pipeline, "predict_proba"):
        raise ModelLoadError("Model does not provide probability estimates.")
    if tuple(getattr(pipeline, "feature_names_in_", ())) != columns:
        raise ModelLoadError("Model input columns do not match metadata.")

    logger.info("Loaded risk model %s (threshold %.2f)", version, threshold)
    return RiskModel(
        pipeline=pipeline,
        model_version=version,
        classification_threshold=threshold,
        risk_bands=bands,
        input_columns=columns,
        holdout_metrics=holdout,
    )
