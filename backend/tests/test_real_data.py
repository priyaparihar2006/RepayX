"""Acceptance tests against the real scored data, model, and TF-IDF index.

These run only when the generated artifacts are present (after the ML pipeline in the
README has been run) and are skipped otherwise, e.g. in CI or a fresh clone. They check
the five questions the spec asks to verify manually, plus cross-endpoint consistency:
the same number must come out of /api/analytics, /api/customers, and /api/query.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from config import get_settings


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app(get_settings())) as c:
        if c.get("/api/health").json()["status"] != "ok":
            pytest.skip("Real artifacts not available; run the ML pipeline to enable these tests.")
        yield c


def ask(client, query: str) -> dict:
    response = client.post("/api/query", json={"query": query})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture(scope="module")
def analytics(client) -> dict:
    return client.get("/api/analytics").json()


def test_customer_385772(client):
    body = ask(client, "What is the risk status of customer 385772?")
    assert body["query_type"] == "customer_query"
    c = body["customer"]
    assert c["risk_category"] == "High Risk" and c["predicted_default"] == 1
    assert (c["installment_count"], c["late_payment_count"], c["late_payment_rate"]) == (3, 3, 100.0)
    assert (c["avg_days_late"], c["max_days_late"], c["underpaid_rate"], c["payment_ratio"]) == (4.33, 6.0, 33.33, 1.0)
    assert body["result"].startswith("Customer 385772 is High Risk")


def test_high_risk_count_matches_analytics_and_listing(client, analytics):
    body = ask(client, "How many high-risk customers are there?")
    assert body["query_type"] == "aggregate_query"
    count = next(m["value"] for m in body["metrics"] if m["name"] == "customer_count")
    high = next(r["customers"] for r in analytics["portfolio"]["risk_categories"] if r["risk_category"] == "High Risk")
    listed = client.get("/api/customers", params={"risk_category": "High Risk", "page_size": 1}).json()["pagination"]["total"]
    assert count == high == listed


def test_average_late_payment_rate_matches_analytics(client, analytics):
    body = ask(client, "What is the average late payment rate?")
    value = body["metrics"][0]["value"]
    assert body["query_type"] == "aggregate_query"
    assert value == analytics["repayment"]["average_late_payment_rate"]
    assert 0 < value < 100


def test_frequent_late_payers_are_sorted(client, analytics):
    body = ask(client, "Which customers frequently pay late?")
    assert body["query_type"] == "retrieval_query"
    assert body["total_matches"] == analytics["repayment"]["customers_with_late_payments"]
    rates = [(c["late_payment_rate"], c["avg_days_late"]) for c in body["customers"]]
    assert rates == sorted(rates, reverse=True)


def test_unpaid_amounts_are_sorted(client, analytics):
    body = ask(client, "Show customers with unpaid amounts.")
    assert body["query_type"] == "retrieval_query"
    assert body["total_matches"] == analytics["repayment"]["customers_with_unpaid_amounts"]
    unpaid = [c["total_unpaid_amount"] for c in body["customers"]]
    assert unpaid == sorted(unpaid, reverse=True) and all(u > 0 for u in unpaid)


def test_portfolio_totals_are_consistent(analytics):
    p = analytics["portfolio"]
    assert sum(r["customers"] for r in p["risk_categories"]) == p["total_customers"]
    assert sum(b["customers"] for b in analytics["risk_score_histogram"]) == p["total_customers"]
    assert sum(b["customers"] for b in analytics["late_payment_rate_buckets"]) == p["total_customers"]
    r = analytics["repayment"]
    assert r["customers_with_history"] + r["customers_without_history"] == p["total_customers"]


def test_general_retrieval_returns_matching_profiles(client):
    body = ask(client, "married drivers with higher education")
    assert body["query_type"] == "general_retrieval"
    assert body["customers"] and all(0 < c["similarity"] <= 1 for c in body["customers"])


def test_no_outcome_fields_anywhere(client):
    for text in (
        client.get("/api/customer/385772").text,
        client.get("/api/customers", params={"page_size": 100}).text,
        client.get("/api/analytics").text,
        client.post("/api/query", json={"query": "Which customers frequently pay late?"}).text,
    ):
        assert "target" not in text.lower()
