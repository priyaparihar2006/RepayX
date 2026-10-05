"""Executes routed questions and phrases answers from computed data.

Answers are templated from the values computed for each request; there are no
pre-written responses. Every answer names the population it covers, so filters
that were applied (or not) are visible to the user.
"""

from __future__ import annotations

import numpy as np

from api.errors import ServiceUnavailableError
from services.analytics_service import (
    METRICS,
    PERCENT,
    AnalyticsService,
    describe_population,
    format_value,
)
from services.customer_service import CustomerService
from services.query_router import RoutedQuery, route_repayx_query
from services.rag_service import TfidfRetriever

# Sort order for structured retrieval: (column, ascending) pairs; customer_id breaks ties.
_RETRIEVAL_SORT = {
    "late_payers": [("late_payment_rate", False), ("avg_days_late", False), ("installment_count", False)],
    "on_time": [("installment_count", False), ("risk_score", True)],
    "unpaid": [("total_unpaid_amount", False)],
    "predicted_default": [("risk_score", False)],
    "highest_risk": [("risk_score", False)],
    "lowest_risk": [("risk_score", True)],
    "lowest_payment_ratio": [("payment_ratio", True)],
}
_RETRIEVAL_CONDITIONS = {"late_payers": ("late",), "on_time": ("on_time",), "unpaid": ("unpaid",)}
_RETRIEVAL_DESCRIPTION = {
    "late_payers": "sorted by late payment rate, then average days late",
    "on_time": "sorted by number of installments paid",
    "unpaid": "sorted by total unpaid amount",
    "predicted_default": "sorted by risk score",
    "highest_risk": "sorted by risk score, highest first",
    "lowest_risk": "sorted by risk score, lowest first",
    "lowest_payment_ratio": "sorted by payment ratio, lowest first",
}


class QueryService:
    def __init__(self, customers: CustomerService, retriever: TfidfRetriever | None, classification_threshold: float | None):
        self._customers = customers
        self._analytics = AnalyticsService(customers.frame)
        self._retriever = retriever
        self._threshold = classification_threshold
        self._profile_values = customers.profile_values()

    def answer(self, query: str) -> dict:
        routed = route_repayx_query(query, self._profile_values)
        handler = {
            "customer_query": self._customer,
            "aggregate_query": self._aggregate,
            "retrieval_query": self._retrieval,
            "general_retrieval": self._general,
        }[routed.query_type]
        return {
            "query": routed.query,
            "query_type": routed.query_type,
            "model_version": self._customers.model_version,
            **handler(routed),
        }

    # --- customer ---------------------------------------------------------

    def _customer(self, routed: RoutedQuery) -> dict:
        found, missing = [], []
        for customer_id in routed.customer_ids:
            detail = self._customers.get(customer_id)
            (found if detail else missing).append(detail or customer_id)
        sentences = [self._describe_customer(c) for c in found]
        if missing:
            ids = ", ".join(str(i) for i in missing)
            sentences.append(f"Customer {ids} {'was' if len(missing) == 1 else 'were'} not found in the scored portfolio.")
        return {
            "result": " ".join(sentences),
            "customer": found[0] if found else None,
            "customers": [self._customers.summaries([c["customer_id"]])[0] for c in found] if len(found) > 1 else None,
            "not_found_ids": missing or None,
        }

    def _describe_customer(self, c: dict) -> str:
        text = (
            f"Customer {c['customer_id']} is {c['risk_category']} with a risk score of {c['risk_score']:.2f}/100 "
            f"(estimated default probability {c['default_probability']:.2f}%)."
        )
        if self._threshold is not None:
            text += (f" Predicted default: {'Yes' if c['predicted_default'] else 'No'} "
                     f"(classification threshold {self._threshold * 100:.0f}%).")
        if not c["has_installment_history"]:
            return text + " No installment history is available for this customer."
        text += (
            f" Repayment history: {c['installment_count']} installments, {c['late_payment_count']} paid late "
            f"(late payment rate {format_value(c['late_payment_rate'], PERCENT)}"
        )
        if c["avg_days_late"] is not None:
            text += f", average {c['avg_days_late']:.2f} days late, maximum {c['max_days_late']:.0f}"
        text += (
            f"); {c['underpaid_count']} underpaid ({format_value(c['underpaid_rate'], PERCENT)}), "
            f"total unpaid {format_value(c['total_unpaid_amount'], 'amount')}, "
            f"payment ratio {format_value(c['payment_ratio'], 'ratio')}."
        )
        return text

    # --- aggregate ----------------------------------------------------------

    def _population(self, routed: RoutedQuery, conditions=None) -> tuple[np.ndarray, str]:
        f = routed.filters
        kwargs = dict(risk_category=f.risk_category, predicted_default=f.predicted_default, profile=f.profile,
                      conditions=routed.conditions if conditions is None else conditions, threshold=routed.threshold)
        return self._analytics.mask(**kwargs), describe_population(**kwargs)

    def _aggregate(self, routed: RoutedQuery) -> dict:
        op = routed.operation
        total = self._analytics.total
        if op in ("count", "share"):
            mask, who = self._population(routed)
            n = self._analytics.count(mask)
            share = n / total * 100 if total else 0.0
            if op == "share":
                result = f"{n:,} of the {total:,} scored customers ({share:.2f}%) are {who}."
            elif mask.all():
                result = f"There are {total:,} scored customers."
            else:
                result = f"There are {n:,} {who}, {share:.2f}% of the {total:,} scored customers."
            metrics = [
                {"name": "customer_count", "label": f"Number of {who}", "value": n, "unit": "count", "population": total},
                {"name": "share_of_portfolio", "label": "Share of portfolio", "value": round(share, 2), "unit": PERCENT,
                 "population": total},
            ]
            if mask.all() or (routed.filters.is_empty() and not routed.conditions and not routed.threshold):
                metrics += self._distribution_metrics(mask)
                result += " " + self._distribution_sentence(mask)
            return {"result": result, "metrics": metrics}

        if op == "distribution":
            mask, who = self._population(routed)
            return {
                "result": f"Risk distribution of {who} ({self._analytics.count(mask):,}): " + self._distribution_sentence(mask),
                "metrics": self._distribution_metrics(mask),
            }

        info = METRICS[routed.metric]
        if op == "sum" and info.unit not in ("amount", "count"):
            op = "average"  # summing rates or scores is not meaningful
        mask, who = self._population(routed)
        stat = self._analytics.stat(routed.metric, op, mask)
        op_word = {"average": "average", "median": "median", "sum": "total"}[op]
        if stat.value is None:
            result = f"No {who} have a known {info.label}, so the {op_word} cannot be calculated."
        else:
            result = (f"The {op_word} {info.label} is {format_value(stat.value, info.unit)} "
                      f"across {stat.population:,} {who}")
            excluded = self._analytics.count(mask) - stat.population
            result += f" ({excluded:,} without a known value excluded)." if excluded else "."
        return {
            "result": result,
            "metrics": [{
                "name": f"{op}_{routed.metric}",
                "label": f"{op_word.capitalize()} {info.label}",
                "value": None if stat.value is None else round(stat.value, 2),
                "unit": info.unit,
                "population": stat.population,
            }],
        }

    def _distribution_metrics(self, mask: np.ndarray) -> list[dict]:
        n = self._analytics.count(mask)
        return [
            {"name": f"{category.lower().replace(' ', '_')}_count", "label": category, "value": count,
             "unit": "count", "population": n}
            for category, count in self._analytics.risk_distribution(mask).items()
        ]

    def _distribution_sentence(self, mask: np.ndarray) -> str:
        n = self._analytics.count(mask)
        dist = self._analytics.risk_distribution(mask)
        return "; ".join(f"{c}: {v:,} ({(v / n * 100) if n else 0:.2f}%)" for c, v in dist.items()) + "."

    # --- structured retrieval -------------------------------------------------

    def _retrieval(self, routed: RoutedQuery) -> dict:
        kind = routed.retrieval
        conditions = tuple(dict.fromkeys(routed.conditions + _RETRIEVAL_CONDITIONS.get(kind, ())))
        if kind == "predicted_default" or routed.filters.predicted_default:
            routed = _with_predicted_default(routed)
        mask, who = self._population(routed, conditions=conditions)
        matches = self._analytics.ids_matching(mask)
        sort = _RETRIEVAL_SORT[kind] + [("customer_id", True)]
        ordered = matches.sort_values([c for c, _ in sort], ascending=[a for _, a in sort], na_position="last",
                                      kind="mergesort")
        top_ids = ordered["customer_id"].head(routed.limit).tolist()
        items = self._customers.summaries(top_ids)
        total = len(matches)
        criteria = f"{who}, {_RETRIEVAL_DESCRIPTION[kind]}"
        if total == 0:
            result = f"No {who} were found."
        else:
            result = f"Found {total:,} {who}. Showing the top {len(items)}, {_RETRIEVAL_DESCRIPTION[kind]}."
        return {"result": result, "customers": items, "total_matches": total, "criteria": criteria}

    # --- general retrieval ------------------------------------------------------

    def _general(self, routed: RoutedQuery) -> dict:
        if self._retriever is None:
            raise ServiceUnavailableError("retrieval_unavailable", "General retrieval is not available.")
        hits = self._retriever.search(routed.query, limit=routed.limit)
        items = self._customers.summaries([h.customer_id for h in hits])
        similarity = {h.customer_id: h.similarity for h in hits}
        for item in items:
            item["similarity"] = similarity[item["customer_id"]]
        if not items:
            result = ("No customers closely matched this question. Try a customer ID, a count or average "
                      "(for example 'How many high-risk customers are there?'), or repayment criteria "
                      "such as late payments or unpaid amounts.")
        else:
            result = (f"Showing {len(items)} customers whose profiles best match the question "
                      "(TF-IDF text similarity; not a numeric ranking).")
        return {"result": result, "customers": items, "total_matches": len(items),
                "criteria": "TF-IDF cosine similarity over customer profile descriptions"}


def _with_predicted_default(routed: RoutedQuery) -> RoutedQuery:
    from dataclasses import replace

    return replace(routed, filters=replace(routed.filters, predicted_default=True))
