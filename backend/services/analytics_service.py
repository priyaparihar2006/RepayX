"""Structured calculations over the scored customer data.

All numbers are computed with pandas from the loaded customer dataset; nothing
is retrieved from text or hard-coded. Averages of repayment metrics are taken
over customers for whom the value is known (customers without installment
history are excluded, not counted as zero), and every result reports the
population it was computed over.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property

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

    @cached_property
    def benchmarks(self) -> dict[str, float | None]:
        """Portfolio averages in display units, for comparing one customer with the portfolio.

        Repayment averages are over customers with a known value (no-history customers excluded).
        """
        out: dict[str, float | None] = {}
        for metric in ("risk_score", "default_probability", "late_payment_rate", "avg_days_late",
                       "underpaid_rate", "payment_ratio", "total_unpaid_amount", "installment_count"):
            values = self.display_values(metric).dropna()
            out[metric] = None if values.empty else round(float(values.mean()), 2)
        return out

    @cached_property
    def portfolio_summary(self) -> dict:
        """Portfolio-wide metrics and chart data. Computed once; the data is immutable while the API runs."""
        df = self._df
        total = len(df)
        history = df["has_installment_history"] == 1
        late_rate = df["late_payment_rate"].astype("Float64") * 100
        unpaid = df["total_unpaid_amount"].astype("Float64")

        def pct(n: int, of: int) -> float:
            return round(n / of * 100, 2) if of else 0.0

        def mean(series: pd.Series, scale: float = 1.0) -> float | None:
            values = series.dropna()
            return None if values.empty else round(float(values.mean()) * scale, 2)

        distribution = self.risk_distribution(np.ones(total, dtype=bool))
        late_customers = int((df["late_payment_count"].fillna(0) > 0).sum())
        unpaid_customers = int((unpaid.fillna(0) > 0).sum())
        predicted = int((df["predicted_default"] == 1).sum())

        return {
            "portfolio": {
                "total_customers": total,
                "risk_categories": [
                    {"risk_category": c, "customers": n, "share": pct(n, total)} for c, n in distribution.items()
                ],
                "average_risk_score": mean(df["risk_score"]),
                "median_risk_score": round(float(df["risk_score"].median()), 2) if total else None,
                "average_default_probability": mean(df["default_probability"], 100),
                "predicted_defaults": predicted,
                "predicted_default_share": pct(predicted, total),
            },
            "repayment": {
                "customers_with_history": int(history.sum()),
                "customers_without_history": int((~history).sum()),
                "average_late_payment_rate": mean(late_rate),
                "customers_with_late_payments": late_customers,
                "customers_with_late_payments_share": pct(late_customers, int(history.sum())),
                "customers_always_late": int((df["late_payment_rate"] == 1).fillna(False).sum()),
                "average_days_late": mean(df["avg_days_late"]),
                "average_underpaid_rate": mean(df["underpaid_rate"], 100),
                "customers_with_unpaid_amounts": unpaid_customers,
                "total_unpaid_amount": round(float(unpaid.sum()), 2),
                "average_payment_ratio": mean(df["payment_ratio"]),
            },
            "risk_score_histogram": self._histogram(df["risk_score"]),
            "late_payment_rate_buckets": self._late_buckets(late_rate, int((~history).sum())),
            "segments": {field: self._segment(field) for field in ("income_type", "education", "occupation")},
        }

    @staticmethod
    def _histogram(scores: pd.Series) -> list[dict]:
        edges = np.arange(0, 101, 10)
        # The last bin is closed so a score of exactly 100 is counted.
        counts, _ = np.histogram(scores.to_numpy(dtype=float), bins=edges)
        return [
            {"range": f"{lo}-{hi}", "min": int(lo), "max": int(hi), "customers": int(n)}
            for lo, hi, n in zip(edges[:-1], edges[1:], counts)
        ]

    @staticmethod
    def _late_buckets(late_rate: pd.Series, without_history: int) -> list[dict]:
        known = late_rate.dropna()
        buckets = [
            ("0% (always on time)", known == 0),
            ("0-10%", (known > 0) & (known <= 10)),
            ("10-25%", (known > 10) & (known <= 25)),
            ("25-50%", (known > 25) & (known <= 50)),
            ("50-<100%", (known > 50) & (known < 100)),
            ("100% (always late)", known == 100),
        ]
        rows = [{"bucket": label, "customers": int(mask.sum())} for label, mask in buckets]
        # Customers whose late rate is unknown: no history, or no recorded payment dates.
        rows.append({"bucket": "Unknown", "customers": int(len(late_rate) - len(known))})
        return rows

    def _segment(self, field: str) -> list[dict]:
        df = self._df
        grouped = df.assign(_segment=df[field].fillna("Unknown"), _high=df["risk_category"] == "High Risk").groupby(
            "_segment", sort=False
        )
        rows = []
        for name, grp in grouped:
            late = grp["late_payment_rate"].dropna()
            rows.append({
                "segment": str(name),
                "customers": int(len(grp)),
                "average_risk_score": round(float(grp["risk_score"].mean()), 2),
                "high_risk_share": round(float(grp["_high"].mean()) * 100, 2),
                "average_late_payment_rate": None if late.empty else round(float(late.mean()) * 100, 2),
            })
        return sorted(rows, key=lambda r: (-r["customers"], r["segment"]))


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
