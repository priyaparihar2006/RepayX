"""Loads and validates a saved RepayX model and its metadata."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import joblib
import sklearn

from ml.config import METADATA_SCHEMA_VERSION, MODEL_FILE, MODEL_METADATA_FILE


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_model(models_dir: Path):
    model_path, meta_path = models_dir / MODEL_FILE, models_dir / MODEL_METADATA_FILE
    if not model_path.is_file() or not meta_path.is_file():
        raise FileNotFoundError(f"Model artifacts not found in {models_dir}. Run: python -m ml.training.train_model")
    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    if metadata.get("schema_version") != METADATA_SCHEMA_VERSION:
        raise ValueError("Unsupported model metadata schema version.")
    if metadata["artifact_sha256"] != _sha256(model_path):
        raise ValueError("Model file does not match its metadata checksum.")
    trained_with = metadata["environment"]["scikit_learn"]
    if trained_with != sklearn.__version__:
        raise ValueError(f"Model was trained with scikit-learn {trained_with}, running {sklearn.__version__}.")
    model = joblib.load(model_path)
    if list(model.feature_names_in_) != metadata["features"]["model_input_columns"]:
        raise ValueError("Model input columns do not match metadata.")
    return model, metadata
