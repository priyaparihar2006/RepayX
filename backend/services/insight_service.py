"""Customer insight: a plain-language summary and risk indicators built from one customer's data.

Everything here is derived from the customer's own fields, the model's classification
threshold, and portfolio averages. It is rule-based (no language model and no
pre-written per-customer text), so the same data always produces the same insight.

The indicator cut-offs below are descriptive review rules for highlighting
repayment behaviour. They are not model outputs and not validated lending thresholds.
"""

from __future__ import annotations

from typing import Literal

Severity = Literal["high", "medium", "low", "info"]

FREQUENT_LATE_RATE = 50.0       # percent of installments paid late
SEVERE_DAYS_LATE = 30.0         # maximum days late on any installment
LOW_PAYMENT_RATIO = 0.90        # paid / due


def _pct(value: float) -> str:
    return f"{value:.2f}%"


def _amount(value: float) -> str:
    return f"{value:,.2f}"


def _plural(n: int, word: str) -> str:
    return f"{n:,} {word}{'' if n == 1 else 's'}"


def build_insight(customer: dict, benchmarks: dict, threshold: float | None) -> dict:
    """Return {"summary": str, "indicators": [{key, label, detail, severity}]}."""
    c = customer
    indicators: list[dict] = []
    prob = c["default_probability"]
    level = c["risk_category"].split()[0].lower()  # high / medium / low

    # --- Risk -----------------------------------------------------------------
    risk = f"Customer {c['customer_id']} has a {level} estimated default risk ({_pct(prob)}"
    if threshold is not None:
        position = "at or above" if c["predicted_default"] else "below"
        risk += f", {position} the {threshold * 100:.0f}% classification threshold"
    risk += ")"
    if c["predicted_default"]:
        indicators.append({
            "key": "predicted_default", "severity": "high", "label": "Predicted default",
            "detail": f"Estimated default probability {_pct(prob)} meets the classification threshold.",
        })
    if c["risk_category"] == "High Risk":
        indicators.append({"key": "high_risk", "severity": "high", "label": "High Risk category",
                           "detail": f"Risk score {c['risk_score']:.2f}/100."})
    elif c["risk_category"] == "Medium Risk":
        indicators.append({"key": "medium_risk", "severity": "medium", "label": "Medium Risk category",
                           "detail": f"Risk score {c['risk_score']:.2f}/100."})

    # --- Repayment -----------------------------------------------------------------
    if not c["has_installment_history"]:
        indicators.append({
            "key": "no_history", "severity": "info", "label": "No installment history",
            "detail": "Repayment behaviour cannot be assessed; the estimate relies on application data only.",
        })
        summary = f"{risk}. No installment history is available, so repayment behaviour cannot be assessed."
        return {"summary": summary, "indicators": indicators}

    n = c["installment_count"] or 0
    late_rate = c["late_payment_rate"]
    avg_late_rate = benchmarks.get("late_payment_rate")
    sentences = []

    if late_rate is None:
        repay = f"and {_plural(n, 'recorded installment')}, none with a recorded payment date"
    elif c["late_payment_count"] == 0:
        repay = f"and paid all {_plural(n, 'recorded installment')} on time"
        indicators.append({"key": "on_time", "severity": "low", "label": "No late payments",
                           "detail": f"All {_plural(n, 'installment')} paid by the due date."})
    else:
        repay = f"and a {_pct(late_rate)} late-payment rate across {_plural(n, 'recorded installment')}"
        if avg_late_rate is not None:
            repay += f" (portfolio average {_pct(avg_late_rate)})"
        if late_rate >= FREQUENT_LATE_RATE:
            indicators.append({
                "key": "frequent_late", "severity": "high", "label": "Frequent late payments",
                "detail": f"{c['late_payment_count']:,} of {n:,} installments paid late ({_pct(late_rate)}).",
            })
        elif avg_late_rate is not None and late_rate > avg_late_rate:
            indicators.append({
                "key": "late_above_average", "severity": "medium", "label": "Late payment rate above average",
                "detail": f"{_pct(late_rate)} vs portfolio average {_pct(avg_late_rate)}.",
            })
        if c["avg_days_late"]:
            # avg_days_late is over all paid installments (on-time ones count as 0 days).
            sentences.append(
                f"On average, installments were paid {c['avg_days_late']:.2f} days late "
                f"(maximum {c['max_days_late']:.0f} days)."
            )
        if c["max_days_late"] is not None and c["max_days_late"] >= SEVERE_DAYS_LATE:
            indicators.append({
                "key": "severe_delay", "severity": "high", "label": f"Payment {SEVERE_DAYS_LATE:.0f}+ days late",
                "detail": f"Longest delay {c['max_days_late']:.0f} days.",
            })

    underpaid = c["underpaid_count"] or 0
    ratio = c["payment_ratio"]
    if underpaid > 0:
        sentences.append(
            f"{underpaid:,} of {n:,} installments {'was' if underpaid == 1 else 'were'} underpaid, "
            f"leaving {_amount(c['total_unpaid_amount'] or 0)} unpaid"
            + (f" (payment ratio {ratio:.2f})." if ratio is not None else ".")
        )
        indicators.append({
            "key": "underpaid", "severity": "medium", "label": "Underpaid installments",
            "detail": f"{underpaid:,} underpaid, {_amount(c['total_unpaid_amount'] or 0)} unpaid in total.",
        })
    elif ratio is not None and ratio >= 1:
        sentences.append("All installments were paid in full.")
    if ratio is not None and ratio < LOW_PAYMENT_RATIO:
        indicators.append({
            "key": "low_payment_ratio", "severity": "high", "label": "Low payment ratio",
            "detail": f"Paid {ratio:.2f} of the amount due (below {LOW_PAYMENT_RATIO:.2f}).",
        })

    summary = " ".join([f"{risk} {repay}."] + sentences)
    return {"summary": summary, "indicators": indicators}
