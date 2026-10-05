"""Shared paths and constants for the RepayX ML pipeline."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DATASETS_DIR = REPO_ROOT / "datasets"
CACHE_DIR = DATASETS_DIR / "processed"
MODELS_DIR = REPO_ROOT / "models"
CUSTOMER_DATA_PATH = REPO_ROOT / "backend" / "data" / "customer_data.parquet"

APPLICATION_TRAIN_FILE = "application_train.csv"
APPLICATION_TEST_FILE = "application_test.csv"
INSTALLMENTS_FILE = "installments_payments.csv"

MODEL_FILE = "repayx_model.joblib"
MODEL_METADATA_FILE = "repayx_model.metadata.json"
EVALUATION_REPORT_FILE = "evaluation_report.json"
HOLDOUT_IDS_FILE = "holdout_customer_ids.npy"

RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5

# Decision threshold for "Predicted Default". Kept separate from the
# presentation bands below.
CLASSIFICATION_THRESHOLD = 0.65

# Prototype presentation bands on the 0-100 risk score. These are not
# validated lending thresholds.
RISK_BAND_MEDIUM_FROM = 30.0
RISK_BAND_HIGH_FROM = 60.0

# Payment shortfalls at or below this amount are treated as fully paid
# (absorbs floating-point noise from summing partial payments).
UNDERPAYMENT_TOLERANCE = 0.01

METADATA_SCHEMA_VERSION = 1
