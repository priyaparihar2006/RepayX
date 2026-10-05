"""Customer risk data, loaded once from Parquet and served from memory.

The Parquet file is produced by `python -m ml.scoring.score_customers`. It is
validated on load: required columns, unique IDs, value ranges, known risk
categories, and the absence of any outcome/target column (actual outcomes are
for model evaluation only and must never be served).

Units in API output:
    default_probability, late_payment_rate, underpaid_rate -> percent (0-100)
    risk_score -> 0-100
    payment_ratio -> ratio (1.0 = paid in full)
Repayment fields are null for customers without installment history.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

logger = logging.getLogger(__name__)

RISK_CATEGORIES = ("Low Risk", "Medium Risk", "High Risk")

REQUIRED_COLUMNS = {
    "customer_id": "integer",
    "default_probability": "float",
    "risk_score": "float",
    "risk_category": "string",
    "predicted_default": "integer",
    "annual_income": "float",
    "credit_amount": "float",
    "annuity_amount": "float",
    "income_type": "string",
    "education": "string",
    "family_status": "string",
    "occupation": "string",
    "has_installment_history": "integer",
    "installment_count": "integer",
    "total_installment_amount": "float",
    "total_payment_amount": "float",
    "late_payment_count": "integer",
    "avg_days_late": "float",
    "max_days_late": "float",
    "underpaid_count": "integer",
    "total_unpaid_amount": "float",
    "late_payment_rate": "float",
    "underpaid_rate": "float",
    "payment_ratio": "float",
}

SortField = Literal[
    "customer_id", "risk_score", "default_probability", "late_payment_rate", "total_unpaid_amount", "payment_ratio"
]
SortOrder = Literal["asc", "desc"]


class CustomerDataError(Exception):
    """The customer data file exists but cannot be used."""


@dataclass(frozen=True)
class CustomerPage:
    items: list[dict]
    total: int
    page: int
    page_size: int

    @property
    def total_pages(self) -> int:
        return math.ceil(self.total / self.page_size) if self.total else 0


def _round(value, digits: int = 2):
    if value is None or value is pd.NA or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), digits)


def _int(value):
    if value is None or value is pd.NA or (isinstance(value, float) and math.isnan(value)):
        return None
    return int(value)


def _text(value):
    if value is None or value is pd.NA or (isinstance(value, float) and math.isnan(value)):
        return None
    return str(value)


def _percent(value):
    rounded = _round(value, 6)
    return None if rounded is None else round(rounded * 100, 2)


def _check_kind(series: pd.Series, kind: str) -> bool:
    if kind == "integer":
        return pd.api.types.is_integer_dtype(series)
    if kind == "float":
        return pd.api.types.is_float_dtype(series) or pd.api.types.is_integer_dtype(series)
    return pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)


def _check_columns(names: list[str]) -> None:
    leaked = [c for c in names if "target" in c.lower() or "actual" in c.lower()]
    if leaked:
        raise CustomerDataError(f"Customer data contains outcome columns: {leaked}")
    missing = sorted(set(REQUIRED_COLUMNS) - set(names))
    if missing:
        raise CustomerDataError(f"Customer data is missing columns: {missing}")


def _validate(df: pd.DataFrame) -> None:
    wrong = [c for c, kind in REQUIRED_COLUMNS.items() if not _check_kind(df[c], kind)]
    if wrong:
        raise CustomerDataError(f"Customer data has unexpected column types: {wrong}")
    if df.empty:
        raise CustomerDataError("Customer data is empty.")
    if df["customer_id"].isna().any() or df["customer_id"].duplicated().any():
        raise CustomerDataError("Customer IDs must be present and unique.")
    if (df["customer_id"] <= 0).any():
        raise CustomerDataError("Customer IDs must be positive.")
    if not df["default_probability"].between(0, 1).all():
        raise CustomerDataError("default_probability must be within 0-1.")
    if not np.allclose(df["risk_score"], df["default_probability"] * 100, atol=1e-6):
        raise CustomerDataError("risk_score must equal default_probability * 100.")
    unknown = set(df["risk_category"].unique()) - set(RISK_CATEGORIES)
    if unknown:
        raise CustomerDataError(f"Unknown risk categories: {sorted(unknown)}")
    if not df["predicted_default"].isin([0, 1]).all():
        raise CustomerDataError("predicted_default must be 0 or 1.")
    for col in ("late_payment_rate", "underpaid_rate"):
        values = df[col].dropna()
        if not values.between(0, 1).all():
            raise CustomerDataError(f"{col} must be within 0-1.")


class CustomerService:
    def __init__(self, frame: pd.DataFrame, model_version: str | None) -> None:
        self._df = frame
        self.model_version = model_version
        # Precomputed once for customer-ID prefix search.
        self._id_text = frame.index.astype(str)

    @classmethod
    def load(cls, path: Path) -> "CustomerService":
        try:
            schema = pq.read_schema(path)
        except Exception as exc:
            raise CustomerDataError("Customer data file could not be read.") from exc
        # Refuse files that carry outcomes at all, even in columns we would not read.
        _check_columns(schema.names)
        try:
            df = pd.read_parquet(path, columns=list(REQUIRED_COLUMNS))
        except Exception as exc:
            raise CustomerDataError("Customer data file could not be read.") from exc
        _validate(df)

        raw_version = (schema.metadata or {}).get(b"repayx.model_version")
        model_version = raw_version.decode() if raw_version else None
        df = df.set_index("customer_id", drop=False).sort_index()
        df.index.name = None
        logger.info("Loaded %d customers (scored by model %s)", len(df), model_version or "unknown")
        return cls(df, model_version)

    def __len__(self) -> int:
        return len(self._df)

    @property
    def frame(self) -> pd.DataFrame:
        """Read-only view for structured calculations; callers must not modify it."""
        return self._df

    def profile_values(self) -> dict[str, list[str]]:
        """Distinct values of each profile field, used to recognise them in questions."""
        return {
            field: sorted(str(v) for v in self._df[field].dropna().unique())
            for field in ("income_type", "education", "family_status", "occupation")
        }

    def summaries(self, customer_ids) -> list[dict]:
        """Summaries in the given order, skipping unknown IDs."""
        known = [i for i in customer_ids if i in self._df.index]
        return [self.retrieval_item(row) for row in self._df.loc[known].to_dict("records")]

    @classmethod
    def retrieval_item(cls, row) -> dict:
        return {
            **cls._summary(row),
            "installment_count": _int(row["installment_count"]),
            "late_payment_count": _int(row["late_payment_count"]),
            "avg_days_late": _round(row["avg_days_late"]),
        }

    def get(self, customer_id: int) -> dict | None:
        try:
            row = self._df.loc[customer_id]
        except KeyError:
            return None
        return self._detail(row)

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 25,
        risk_category: str | None = None,
        search: str | None = None,
        sort_by: SortField = "risk_score",
        sort_order: SortOrder = "desc",
    ) -> CustomerPage:
        mask = np.ones(len(self._df), dtype=bool)
        if risk_category:
            mask &= (self._df["risk_category"] == risk_category).to_numpy()
        if search:
            mask &= self._id_text.str.startswith(search)
        filtered = self._df[mask]

        # Ties are broken by customer ID; customers without a value sort last either way.
        ordered = filtered.sort_values(
            [sort_by, "customer_id"] if sort_by != "customer_id" else ["customer_id"],
            ascending=[sort_order == "asc", True] if sort_by != "customer_id" else [sort_order == "asc"],
            na_position="last",
            kind="mergesort",
        )
        start = (page - 1) * page_size
        rows = ordered.iloc[start : start + page_size]
        return CustomerPage(
            items=[self._summary(row) for row in rows.to_dict("records")],
            total=int(len(filtered)),
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def _summary(row) -> dict:
        return {
            "customer_id": int(row["customer_id"]),
            "risk_score": _round(row["risk_score"]),
            "default_probability": _percent(row["default_probability"]),
            "risk_category": str(row["risk_category"]),
            "predicted_default": int(row["predicted_default"]),
            "late_payment_rate": _percent(row["late_payment_rate"]),
            "total_unpaid_amount": _round(row["total_unpaid_amount"]),
            "payment_ratio": _round(row["payment_ratio"]),
        }

    @classmethod
    def _detail(cls, row) -> dict:
        return {
            **cls._summary(row),
            "annual_income": _round(row["annual_income"]),
            "credit_amount": _round(row["credit_amount"]),
            "annuity_amount": _round(row["annuity_amount"]),
            "income_type": _text(row["income_type"]),
            "education": _text(row["education"]),
            "family_status": _text(row["family_status"]),
            "occupation": _text(row["occupation"]),
            "has_installment_history": bool(row["has_installment_history"]),
            "installment_count": _int(row["installment_count"]),
            "late_payment_count": _int(row["late_payment_count"]),
            "avg_days_late": _round(row["avg_days_late"]),
            "max_days_late": _round(row["max_days_late"]),
            "underpaid_count": _int(row["underpaid_count"]),
            "underpaid_rate": _percent(row["underpaid_rate"]),
            "total_installment_amount": _round(row["total_installment_amount"]),
            "total_payment_amount": _round(row["total_payment_amount"]),
        }
