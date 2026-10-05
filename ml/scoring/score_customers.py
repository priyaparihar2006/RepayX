"""Batch-score customers and write the backend customer dataset.

    python -m ml.scoring.score_customers [--population holdout|application_test]

holdout           (default) the 20% of application_train never used for fitting
application_test  unlabeled applications from application_test.csv

The output never contains TARGET; actual outcomes are for evaluation only.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from ml.config import CUSTOMER_DATA_PATH, DATASETS_DIR, HOLDOUT_IDS_FILE, MODELS_DIR
from ml.data import build_customer_frame
from ml.features.installment_features import CUSTOMER_FEATURES
from ml.model_io import load_model
from ml.preprocessing.preprocessing import ID_COLUMN, TARGET_COLUMN, model_inputs
from ml.scoring.risk import HIGH, LOW, MEDIUM, predicted_default, risk_category, risk_score

PROFILE_RENAMES = {
    "AMT_INCOME_TOTAL": "annual_income",
    "AMT_CREDIT": "credit_amount",
    "AMT_ANNUITY": "annuity_amount",
    "NAME_INCOME_TYPE": "income_type",
    "NAME_EDUCATION_TYPE": "education",
    "NAME_FAMILY_STATUS": "family_status",
    "OCCUPATION_TYPE": "occupation",
}

COUNT_COLUMNS = ("installment_count", "late_payment_count", "underpaid_count")


def build_customer_table(frame: pd.DataFrame, model, threshold: float) -> pd.DataFrame:
    if TARGET_COLUMN in frame.columns:
        raise ValueError("Drop TARGET before building the customer table.")
    proba = model.predict_proba(model_inputs(frame))[:, 1]
    score = risk_score(proba)
    out = pd.DataFrame({"customer_id": frame[ID_COLUMN].astype("int64").to_numpy()})
    out["default_probability"] = proba
    out["risk_score"] = score
    out["risk_category"] = risk_category(score)
    out["predicted_default"] = predicted_default(proba, threshold)
    for src, dst in PROFILE_RENAMES.items():
        out[dst] = frame[src].to_numpy()
    out["has_installment_history"] = frame["HAS_INSTALLMENT_HISTORY"].astype("int8").to_numpy()
    for col in CUSTOMER_FEATURES:
        out[col.lower()] = frame[col].to_numpy()
    for col in COUNT_COLUMNS:
        out[col] = out[col].astype("Int64")  # nullable: no history -> <NA>, not 0
    return out.sort_values("customer_id").reset_index(drop=True)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=DATASETS_DIR)
    parser.add_argument("--models-dir", type=Path, default=MODELS_DIR)
    parser.add_argument("--population", choices=["holdout", "application_test"], default="holdout")
    parser.add_argument("--output", type=Path, default=CUSTOMER_DATA_PATH)
    args = parser.parse_args(argv)

    model, metadata = load_model(args.models_dir)
    if args.population == "holdout":
        frame = build_customer_frame(args.data_dir, source="train")
        frame = frame.set_index(ID_COLUMN).loc[np.load(args.models_dir / HOLDOUT_IDS_FILE)].reset_index()
    else:
        frame = build_customer_frame(args.data_dir, source="test")
    frame = frame.drop(columns=[TARGET_COLUMN], errors="ignore")

    table = build_customer_table(frame, model, metadata["classification_threshold"])

    arrow = pa.Table.from_pandas(table, preserve_index=False)
    arrow = arrow.replace_schema_metadata({
        **(arrow.schema.metadata or {}),
        b"repayx.model_version": metadata["model_version"].encode(),
        b"repayx.classification_threshold": str(metadata["classification_threshold"]).encode(),
        b"repayx.population": args.population.encode(),
        b"repayx.generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").encode(),
    })
    args.output.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(arrow, args.output)

    counts = table["risk_category"].value_counts()
    print(f"Wrote {len(table):,} customers ({args.population}) to {args.output}")
    for name in (HIGH, MEDIUM, LOW):
        print(f"  {name:<12} {int(counts.get(name, 0)):>7,}")
    print(f"  Average risk score {table['risk_score'].mean():.2f}; "
          f"predicted defaults at threshold {metadata['classification_threshold']}: {int(table['predicted_default'].sum()):,}")


if __name__ == "__main__":
    main()
