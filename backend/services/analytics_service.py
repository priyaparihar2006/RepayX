"""Structured calculations over the scored customer data.

All numbers are computed with pandas from the loaded customer dataset; nothing
is retrieved from text or hard-coded. Averages of repayment metrics are taken
over customers for whom the value is known (customers without installment
history are excluded, not counted as zero), and every result reports the
population it was computed over.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from services.customer_service import RISK_CATEGORIES

PERCENT = "percent"


@dataclass(frozen=True)
class MetricInfo:
    label: str
    unit: str  # percent | score | ratio | days | amount | count
    scale: float = 1.0  # stored value * scale = displayed value


METRICS: dict[str, MetricInfo] = {
    "risk_score": MetricInfo("risk score", "score"),
    "default_probability": MetricInfo("estimated default probability", PERCENT, 100.0),
    "late_payment_rate": MetricInfo("late payment rate", PERCENT, 100.0),
    "underpaid_rate": MetricInfo("underpaid rate", PERCENT, 100.0),
    "payment_ratio": MetricInfo("payment ratio", "ratio"),
    "avg_days_late": MetricInfo("average days late", "days"),
    "total_unpaid_amount": MetricInfo("unpaid amount", "amount"),
    "installment_count": MetricInfo("installment count", "count"),
    "annual_income": MetricInfo("annual income", "amount"),
    "credit_amount": MetricInfo("credit amount", "amount"),
    "annuity_amount": MetricInfo("annuity amount", "amount"),
}

CONDITION_LABELS = {
    "late": "with at least one late payment",
    "always_late": "with a 100% late payment rate",
    "on_time": "with no late payments",
    "unpaid": "with unpaid amounts",
    "no_history": "without installment history",
    "predicted_default": "predicted to default",
}

_OPS = {">": np.greater, ">=": np.greater_equal, "<": np.less, "<=": np.less_equal}


@dataclass(frozen=True)
class Stat:
    value: float | None
    population: int  # customers with a known value


class AnalyticsService:
    def __init__(self, frame: pd.DataFrame) -> None:
        self._df = frame

    @property
    def total(self) -> int:
        return len(self._df)

    def mask(self, *, risk_category=None, predicted_default=False, profile=(), conditions=(), threshold=None) -> np.ndarray:
        df = self._df
        mask = np.ones(len(df), dtype=bool)
        if risk_category:
            mask &= (df["risk_category"] == risk_category).to_numpy()
        if predicted_default:
            mask &= (df["predicted_default"] == 1).to_numpy()
        for field, value in profile:
            mask &= (df[field] == value).fillna(False).to_numpy(dtype=bool)
        history = (df["has_installment_history"] == 1).to_numpy()
        for condition in conditions:
            if condition == "late":
                mask &= (df["late_payment_count"].fillna(0) > 0).to_numpy()
            elif condition == "always_late":
                mask &= (df["late_payment_rate"] == 1).fillna(False).to_numpy(dtype=bool)
            elif condition == "on_time":
                mask &= history & (df["late_payment_count"].fillna(-1) == 0).to_numpy()
            elif condition == "unpaid":
                mask &= (df["total_unpaid_amount"].fillna(0) > 0).to_numpy()
            elif condition == "no_history":
                mask &= ~history
        if threshold:
            metric, op, value = threshold
            shown = self.display_values(metric)
            mask &= _OPS[op](shown.fillna(np.nan).to_numpy(dtype=float), value) & shown.notna().to_numpy()
        return mask

    def display_values(self, metric: str) -> pd.Series:
        return self._df[metric].astype("Float64") * METRICS[metric].scale

    def count(self, mask: np.ndarray) -> int:
        return int(mask.sum())

    def stat(self, metric: str, operation: str, mask: np.ndarray) -> Stat:
        values = self.display_values(metric)[mask].dropna()
        if values.empty:
            return Stat(None, 0)
        if operation == "average":
            value = float(values.mean())
        elif operation == "median":
            value = float(values.median())
        elif operation == "sum":
            value = float(values.sum())
        else:
            raise ValueError(f"Unsupported operation {operation}")
        return Stat(value, int(len(values)))

    def risk_distribution(self, mask: np.ndarray) -> dict[str, int]:
        counts = self._df.loc[mask, "risk_category"].value_counts()
        return {category: int(counts.get(category, 0)) for category in RISK_CATEGORIES}

    def ids_matching(self, mask: np.ndarray) -> pd.DataFrame:
        return self._df[mask]


def describe_population(*, risk_category=None, predicted_default=False, profile=(), conditions=(), threshold=None) -> str:
    """Human-readable description of the customers a result covers, e.g. 'High Risk customers who are Pensioner'."""
    noun = f"{risk_category} customers" if risk_category else "customers"
    parts = []
    if profile:
        parts.append("with " + ", ".join(f"{field.replace('_', ' ')} '{value}'" for field, value in profile))
    # A threshold on the same metric already implies the condition ("unpaid amount > 1,000").
    implied = {"total_unpaid_amount": "unpaid", "late_payment_rate": "late"}.get(threshold[0]) if threshold else None
    for condition in conditions:
        if condition != implied:
            parts.append(CONDITION_LABELS[condition])
    if predicted_default:
        parts.append(CONDITION_LABELS["predicted_default"])
    if threshold:
        metric, op, value = threshold
        parts.append(f"with {METRICS[metric].label} {op} {format_value(value, METRICS[metric].unit)}")
    return " ".join([noun, *parts])


def format_value(value, unit: str) -> str:
    if value is None:
        return "n/a"
    if unit == PERCENT:
        return f"{value:.2f}%"
    if unit == "score":
        return f"{value:.2f}"
    if unit == "ratio":
        return f"{value:.2f}"
    if unit == "days":
        return f"{value:.2f} days"
    if unit == "amount":
        return f"{value:,.2f}"
    if unit == "count":
        return f"{value:,.2f}" if isinstance(value, float) and not float(value).is_integer() else f"{int(value):,}"
    return str(value)
