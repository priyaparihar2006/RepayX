"""Train the RepayX default-risk model.

    python -m ml.training.train_model [--data-dir datasets] [--rebuild-cache]

Steps:
  1. Build the customer frame (application + installment history features).
  2. Stratified 80/20 split; the 20% holdout is never used for fitting or tuning.
  3. 5-fold out-of-fold predictions on the training split -> threshold sweep.
  4. Fit the final pipeline on the full training split.
  5. Evaluate once on the holdout and write the model, metadata, and holdout IDs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline

from ml.config import (
    CLASSIFICATION_THRESHOLD,
    CV_FOLDS,
    DATASETS_DIR,
    EVALUATION_REPORT_FILE,
    HOLDOUT_IDS_FILE,
    INSTALLMENTS_FILE,
    APPLICATION_TRAIN_FILE,
    METADATA_SCHEMA_VERSION,
    MODEL_FILE,
    MODEL_METADATA_FILE,
    MODELS_DIR,
    RANDOM_STATE,
    RISK_BAND_HIGH_FROM,
    RISK_BAND_MEDIUM_FROM,
    TEST_SIZE,
)
from ml.data import build_customer_frame
from ml.evaluation.metrics import best_f1_threshold, ranking_metrics, threshold_metrics, threshold_sweep
from ml.preprocessing.preprocessing import (
    CATEGORICAL_FEATURES,
    EXCLUDED_FEATURES,
    ID_COLUMN,
    LOG_FEATURES,
    MODEL_FEATURES,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    build_preprocessor,
    model_inputs,
)


def build_model() -> Pipeline:
    return Pipeline(
        [
            ("preprocess", build_preprocessor()),
            ("classifier", LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE)),
        ]
    )


def file_identity(path: Path) -> dict:
    stat = path.stat()
    return {"file": path.name, "bytes": stat.st_size}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=DATASETS_DIR)
    parser.add_argument("--output-dir", type=Path, default=MODELS_DIR)
    parser.add_argument("--threshold", type=float, default=CLASSIFICATION_THRESHOLD,
                        help="Classification threshold stored with the model (default: %(default)s).")
    parser.add_argument("--rebuild-cache", action="store_true", help="Recompute installment features.")
    args = parser.parse_args(argv)

    log("Building customer frame")
    frame = build_customer_frame(args.data_dir, source="train", rebuild_cache=args.rebuild_cache)
    y = frame[TARGET_COLUMN].to_numpy()
    X = model_inputs(frame)
    ids = frame[ID_COLUMN].to_numpy()
    log(f"{len(frame):,} applications, default rate {y.mean():.4f}, "
        f"{int(frame['HAS_INSTALLMENT_HISTORY'].sum()):,} with installment history")

    X_train, X_test, y_train, y_test, ids_train, ids_test = train_test_split(
        X, y, ids, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )

    log(f"{CV_FOLDS}-fold out-of-fold predictions on {len(X_train):,} training rows")
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    oof = cross_val_predict(build_model(), X_train, y_train, cv=cv, method="predict_proba", n_jobs=-1)[:, 1]
    sweep = threshold_sweep(y_train, oof)
    best = best_f1_threshold(sweep)
    log(f"OOF ROC-AUC {ranking_metrics(y_train, oof)['roc_auc']:.4f}; best-F1 threshold {best}; using {args.threshold}")

    log("Fitting final model")
    model = build_model().fit(X_train, y_train)

    proba_test = model.predict_proba(X_test)[:, 1]
    holdout = {
        **ranking_metrics(y_test, proba_test),
        "at_0_5": threshold_metrics(y_test, proba_test, 0.5),
        "at_classification_threshold": threshold_metrics(y_test, proba_test, args.threshold),
    }
    log(f"Holdout ROC-AUC {holdout['roc_auc']:.4f}; at {args.threshold}: "
        f"{json.dumps({k: round(v, 4) for k, v in holdout['at_classification_threshold'].items() if isinstance(v, float)})}")

    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    model_path = out / MODEL_FILE
    joblib.dump(model, model_path, compress=3)
    np.save(out / HOLDOUT_IDS_FILE, ids_test)

    trained_at = datetime.now(timezone.utc)
    metadata = {
        "schema_version": METADATA_SCHEMA_VERSION,
        "model_version": f"repayx-logreg-{trained_at:%Y%m%d%H%M%S}",
        "trained_at": trained_at.isoformat(timespec="seconds"),
        "algorithm": "LogisticRegression(class_weight='balanced') with median/most-frequent imputation, "
                     "StandardScaler, OneHotEncoder",
        "artifact_sha256": sha256(model_path),
        "environment": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
        },
        "features": {
            "model_input_columns": MODEL_FEATURES,
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "log1p_transformed": LOG_FEATURES,
            "excluded": EXCLUDED_FEATURES,
        },
        "output_semantics": {
            "default_probability": "Estimated default probability on a 0-1 scale (model output, not a guarantee).",
            "risk_score": "default_probability * 100",
        },
        "classification_threshold": args.threshold,
        "threshold_selection": {
            "method": f"{CV_FOLDS}-fold stratified out-of-fold F1 sweep on the training split",
            "best_f1_threshold": best,
            "sweep": sweep,
        },
        "risk_bands": {
            "low": f"score < {RISK_BAND_MEDIUM_FROM:g}",
            "medium": f"{RISK_BAND_MEDIUM_FROM:g} <= score < {RISK_BAND_HIGH_FROM:g}",
            "high": f"score >= {RISK_BAND_HIGH_FROM:g}",
            "medium_from": RISK_BAND_MEDIUM_FROM,
            "high_from": RISK_BAND_HIGH_FROM,
            "note": "Prototype presentation bands; not validated lending thresholds.",
        },
        "training_data": {
            "sources": [file_identity(args.data_dir / APPLICATION_TRAIN_FILE), file_identity(args.data_dir / INSTALLMENTS_FILE)],
            "rows": int(len(frame)),
            "train_rows": int(len(X_train)),
            "holdout_rows": int(len(X_test)),
            "split": {"test_size": TEST_SIZE, "stratified": True, "random_state": RANDOM_STATE},
        },
        "holdout_metrics": holdout,
    }
    (out / MODEL_METADATA_FILE).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (out / EVALUATION_REPORT_FILE).write_text(
        json.dumps({"model_version": metadata["model_version"], "holdout": holdout,
                    "oof_threshold_sweep": sweep}, indent=2),
        encoding="utf-8",
    )
    log(f"Saved {model_path.name}, {MODEL_METADATA_FILE}, {EVALUATION_REPORT_FILE}, {HOLDOUT_IDS_FILE} to {out}")


if __name__ == "__main__":
    main()
