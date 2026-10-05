"""Historical installment features, aggregated per customer (SK_ID_CURR).

The raw file can record one installment as several payment rows (partial
payments). Each of those rows repeats the full AMT_INSTALMENT, so features are
computed after collapsing rows to one record per installment:

    (SK_ID_PREV, NUM_INSTALMENT_VERSION, NUM_INSTALMENT_NUMBER)

Collapsed values:
    AMT_INSTALMENT      scheduled amount (identical across the rows)
    AMT_PAYMENT         sum of payments (0 when no payment was recorded)
    DAYS_INSTALMENT     due day
    DAYS_ENTRY_PAYMENT  day of the last payment (when the installment was settled)

Installments with no recorded payment count as underpaid. Their lateness is
unknown, so they are excluded from day-based lateness features rather than
treated as on time.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from ml.config import UNDERPAYMENT_TOLERANCE

INSTALLMENT_KEY = ["SK_ID_PREV", "NUM_INSTALMENT_VERSION", "NUM_INSTALMENT_NUMBER"]

RAW_DTYPES = {
    "SK_ID_PREV": "int32",
    "SK_ID_CURR": "int32",
    "NUM_INSTALMENT_VERSION": "float32",
    "NUM_INSTALMENT_NUMBER": "int32",
    "DAYS_INSTALMENT": "float32",
    "DAYS_ENTRY_PAYMENT": "float32",
    "AMT_INSTALMENT": "float64",
    "AMT_PAYMENT": "float64",
}

CUSTOMER_FEATURES = [
    "INSTALLMENT_COUNT",
    "TOTAL_INSTALLMENT_AMOUNT",
    "TOTAL_PAYMENT_AMOUNT",
    "AVG_INSTALLMENT_AMOUNT",
    "AVG_PAYMENT_AMOUNT",
    "LATE_PAYMENT_COUNT",
    "AVG_DAYS_LATE",
    "MAX_DAYS_LATE",
    "UNDERPAID_COUNT",
    "TOTAL_UNPAID_AMOUNT",
    "LATE_PAYMENT_RATE",
    "UNDERPAID_RATE",
    "PAYMENT_RATIO",
]


def load_installments(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, usecols=list(RAW_DTYPES), dtype=RAW_DTYPES)
    missing = set(RAW_DTYPES) - set(df.columns)
    if missing:
        raise ValueError(f"Installments file is missing columns: {sorted(missing)}")
    return df


def collapse_to_installments(raw: pd.DataFrame) -> pd.DataFrame:
    grouped = raw.groupby(INSTALLMENT_KEY, sort=False, observed=True)
    collapsed = grouped.agg(
        SK_ID_CURR=("SK_ID_CURR", "first"),
        DAYS_INSTALMENT=("DAYS_INSTALMENT", "first"),
        DAYS_ENTRY_PAYMENT=("DAYS_ENTRY_PAYMENT", "max"),
        AMT_INSTALMENT=("AMT_INSTALMENT", "first"),
        AMT_PAYMENT=("AMT_PAYMENT", "sum"),  # NaN payments sum to 0
    ).reset_index()
    return collapsed


def add_installment_flags(inst: pd.DataFrame) -> pd.DataFrame:
    out = inst.copy()
    out["DAYS_LATE"] = out["DAYS_ENTRY_PAYMENT"] - out["DAYS_INSTALMENT"]
    out["DAYS_LATE_POSITIVE"] = out["DAYS_LATE"].clip(lower=0)
    # NaN DAYS_LATE (no payment recorded) compares False, so it is not counted as late.
    out["IS_LATE"] = (out["DAYS_LATE"] > 0).astype("int8")
    shortfall = out["AMT_INSTALMENT"] - out["AMT_PAYMENT"]
    out["IS_UNDERPAID"] = (shortfall > UNDERPAYMENT_TOLERANCE).astype("int8")
    out["UNPAID_AMOUNT"] = shortfall.where(out["IS_UNDERPAID"] == 1, 0.0)
    return out


def aggregate_per_customer(flagged: pd.DataFrame) -> pd.DataFrame:
    g = flagged.groupby("SK_ID_CURR", sort=True)
    agg = g.agg(
        INSTALLMENT_COUNT=("AMT_INSTALMENT", "size"),
        TOTAL_INSTALLMENT_AMOUNT=("AMT_INSTALMENT", "sum"),
        TOTAL_PAYMENT_AMOUNT=("AMT_PAYMENT", "sum"),
        AVG_INSTALLMENT_AMOUNT=("AMT_INSTALMENT", "mean"),
        AVG_PAYMENT_AMOUNT=("AMT_PAYMENT", "mean"),
        LATE_PAYMENT_COUNT=("IS_LATE", "sum"),
        AVG_DAYS_LATE=("DAYS_LATE_POSITIVE", "mean"),
        MAX_DAYS_LATE=("DAYS_LATE_POSITIVE", "max"),
        UNDERPAID_COUNT=("IS_UNDERPAID", "sum"),
        TOTAL_UNPAID_AMOUNT=("UNPAID_AMOUNT", "sum"),
        PAID_INSTALLMENT_COUNT=("DAYS_LATE", "count"),
    )
    # Late rate is over installments whose payment date is known.
    agg["LATE_PAYMENT_RATE"] = agg["LATE_PAYMENT_COUNT"] / agg["PAID_INSTALLMENT_COUNT"].replace(0, np.nan)
    agg["UNDERPAID_RATE"] = agg["UNDERPAID_COUNT"] / agg["INSTALLMENT_COUNT"]
    agg["PAYMENT_RATIO"] = agg["TOTAL_PAYMENT_AMOUNT"] / agg["TOTAL_INSTALLMENT_AMOUNT"].replace(0, np.nan)
    return agg[CUSTOMER_FEATURES].astype("float64")


def build_installment_features(raw: pd.DataFrame) -> pd.DataFrame:
    """Raw installment rows -> one row of repayment features per SK_ID_CURR (index)."""
    return aggregate_per_customer(add_installment_flags(collapse_to_installments(raw)))


def load_or_build_installment_features(source: Path, cache_dir: Path, rebuild: bool = False) -> pd.DataFrame:
    """Cache features as Parquet, invalidated when the source file changes."""
    stat = source.stat()
    cache = cache_dir / f"installment_features_{stat.st_size}_{int(stat.st_mtime)}.parquet"
    if cache.is_file() and not rebuild:
        return pd.read_parquet(cache)
    features = build_installment_features(load_installments(source))
    cache_dir.mkdir(parents=True, exist_ok=True)
    for stale in cache_dir.glob("installment_features_*.parquet"):
        stale.unlink()
    features.to_parquet(cache)
    return features
