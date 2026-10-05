"""Re-evaluate the saved model on the holdout split, independently of training.

    python -m ml.evaluation.evaluate_model [--data-dir datasets]

Rebuilds features from the raw files, loads the saved model, scores the saved
holdout customer IDs, and compares results with the metrics recorded at
training time.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

from ml.config import DATASETS_DIR, EVALUATION_REPORT_FILE, HOLDOUT_IDS_FILE, MODELS_DIR
from ml.data import build_customer_frame
from ml.evaluation.metrics import ranking_metrics, threshold_metrics, threshold_sweep
from ml.model_io import load_model
from ml.preprocessing.preprocessing import ID_COLUMN, TARGET_COLUMN, model_inputs
from ml.scoring.risk import HIGH, LOW, MEDIUM, risk_category, risk_score


def band_table(y: np.ndarray, proba: np.ndarray) -> list[dict]:
    df = pd.DataFrame({"y": y, "category": risk_category(risk_score(proba)), "p": proba})
    rows = []
    for name in (LOW, MEDIUM, HIGH):
        grp = df[df["category"] == name]
        rows.append({
            "risk_category": name,
            "customers": int(len(grp)),
            "observed_default_rate": float(grp["y"].mean()) if len(grp) else None,
            "mean_estimated_probability": float(grp["p"].mean()) if len(grp) else None,
        })
    return rows


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=DATASETS_DIR)
    parser.add_argument("--models-dir", type=Path, default=MODELS_DIR)
    args = parser.parse_args(argv)

    model, metadata = load_model(args.models_dir)
    holdout_ids = np.load(args.models_dir / HOLDOUT_IDS_FILE)

    frame = build_customer_frame(args.data_dir, source="train")
    frame = frame.set_index(ID_COLUMN).loc[holdout_ids].reset_index()
    y = frame[TARGET_COLUMN].to_numpy()
    proba = model.predict_proba(model_inputs(frame))[:, 1]
    threshold = metadata["classification_threshold"]

    has_history = frame["HAS_INSTALLMENT_HISTORY"].to_numpy() == 1
    holdout = {
        **ranking_metrics(y, proba),
        "at_0_5": threshold_metrics(y, proba, 0.5),
        "at_classification_threshold": threshold_metrics(y, proba, threshold),
    }
    recorded = metadata["holdout_metrics"]
    matches = math.isclose(recorded["roc_auc"], holdout["roc_auc"], abs_tol=1e-9) and all(
        math.isclose(recorded["at_classification_threshold"][k], holdout["at_classification_threshold"][k], abs_tol=1e-9)
        for k in ("accuracy", "precision", "recall", "f1")
    )
    report = {
        "model_version": metadata["model_version"],
        "reproduces_training_metrics": matches,
        "holdout": holdout,
        "holdout_threshold_sweep": threshold_sweep(y, proba),
        "risk_bands": band_table(y, proba),
        "segments": {
            "with_installment_history": ranking_metrics(y[has_history], proba[has_history]),
            "without_installment_history": ranking_metrics(y[~has_history], proba[~has_history]),
        },
        "oof_threshold_sweep": metadata["threshold_selection"]["sweep"],
    }
    (args.models_dir / EVALUATION_REPORT_FILE).write_text(json.dumps(report, indent=2), encoding="utf-8")

    at = holdout["at_classification_threshold"]
    print(f"Model {report['model_version']}  holdout n={holdout['n']:,}  default rate {holdout['positive_rate']:.4f}")
    print(f"ROC-AUC {holdout['roc_auc']:.4f}  PR-AUC {holdout['average_precision']:.4f}")
    print(f"At threshold {threshold}: accuracy {at['accuracy']:.4f}  precision {at['precision']:.4f}  "
          f"recall {at['recall']:.4f}  F1 {at['f1']:.4f}")
    for row in report["risk_bands"]:
        rate = row["observed_default_rate"]
        print(f"  {row['risk_category']:<12} {row['customers']:>7,}  observed default rate "
              f"{'n/a' if rate is None else f'{rate:.4f}'}")
    print(f"Matches metrics recorded at training: {matches}")
    if not matches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
