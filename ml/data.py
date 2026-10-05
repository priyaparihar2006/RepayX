"""Loads the raw datasets and builds the model-ready customer frame."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.config import APPLICATION_TEST_FILE, APPLICATION_TRAIN_FILE, CACHE_DIR, INSTALLMENTS_FILE
from ml.features.installment_features import load_or_build_installment_features
from ml.preprocessing.preprocessing import assemble_customer_frame, load_applications


def require_file(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(
            f"Required dataset not found: {path}\n"
            "Download the Home Credit Default Risk files and place them in datasets/ "
            "(or pass --data-dir)."
        )
    return path


def build_customer_frame(data_dir: Path, source: str = "train", rebuild_cache: bool = False) -> pd.DataFrame:
    """source='train' uses application_train.csv (has TARGET); 'test' uses application_test.csv."""
    app_file = APPLICATION_TRAIN_FILE if source == "train" else APPLICATION_TEST_FILE
    app = load_applications(require_file(data_dir / app_file), require_target=(source == "train"))
    installments = load_or_build_installment_features(
        require_file(data_dir / INSTALLMENTS_FILE), CACHE_DIR, rebuild=rebuild_cache
    )
    return assemble_customer_frame(app, installments)
