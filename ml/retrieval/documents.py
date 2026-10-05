"""Text documents describing each customer, for TF-IDF (lexical) retrieval.

Documents use descriptive words, not raw numbers: TF-IDF cannot reason about
numeric values, so numeric questions are answered by structured queries in the
backend instead. Documents are built from the served customer dataset, which
never contains actual outcomes.

The repayment descriptors below are wording for lexical matching only; they are
not risk thresholds.
"""

from __future__ import annotations

import math

import pandas as pd

DOCUMENT_TEMPLATE_VERSION = 1


def _missing(value) -> bool:
    return value is None or value is pd.NA or (isinstance(value, float) and math.isnan(value))


def _late_description(rate) -> str:
    if _missing(rate):
        return "lateness unknown"
    if rate == 0:
        return "always on time on time payer never late"
    if rate >= 1:
        return "always late every installment paid late"
    if rate >= 0.5:
        return "mostly late payments frequently late"
    if rate >= 0.2:
        return "frequent late payments"
    return "occasional late payments"


def customer_document(row) -> str:
    parts = [
        f"customer {int(row['customer_id'])}",
        str(row["risk_category"]).lower(),
        "predicted default" if int(row["predicted_default"]) == 1 else "not predicted to default",
    ]
    for field in ("income_type", "education", "family_status", "occupation"):
        value = row[field]
        if not _missing(value):
            parts.append(str(value).lower().replace("/", " "))
    if int(row["has_installment_history"]) == 0:
        parts.append("no installment history no repayment history")
    else:
        parts.append("installment history repayment history")
        parts.append(_late_description(row["late_payment_rate"]))
        unpaid = row["total_unpaid_amount"]
        if not _missing(unpaid) and unpaid > 0:
            parts.append("underpaid installments outstanding unpaid amount")
        else:
            parts.append("installments paid in full")
    return " ".join(parts)


def customer_documents(customers: pd.DataFrame) -> list[str]:
    return [customer_document(row) for row in customers.to_dict("records")]
