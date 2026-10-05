"""Customer insight and benchmarks, against the six-customer fixture in conftest."""

import pytest

from services.insight_service import build_insight
from tests.conftest import write_test_customers, write_test_model


@pytest.fixture
def client(settings, client_factory):
    write_test_model(settings)
    write_test_customers(settings)
    return client_factory()


def get(client, customer_id):
    response = client.get(f"/api/customer/{customer_id}")
    assert response.status_code == 200
    return response.json()


def keys(body):
    return [i["key"] for i in body["insight"]["indicators"]]


def test_benchmarks_are_portfolio_averages(client):
    body = get(client, 385772)
    assert body["classification_threshold"] == 0.65
    assert body["benchmarks"] == {
        "risk_score": 43.35,
        "default_probability": 43.35,
        "late_payment_rate": 26.0,       # (100 + 10 + 0 + 20 + 0) / 5 customers with history
        "avg_days_late": 1.37,
        "underpaid_rate": 9.87,
        "payment_ratio": 0.99,
        "total_unpaid_amount": 300.04,   # 1500.225 / 5 (300.045 rounds down in binary float)
        "installment_count": 12.2,       # (3 + 10 + 19 + 25 + 4) / 5
    }


def test_high_risk_late_payer(client):
    body = get(client, 385772)
    assert body["insight"]["summary"] == (
        "Customer 385772 has a high estimated default risk (80.13%, at or above the 65% classification threshold) "
        "and a 100.00% late-payment rate across 3 recorded installments (portfolio average 26.00%). "
        "On average, installments were paid 4.33 days late (maximum 6 days). "
        "1 of 3 installments was underpaid, leaving 0.23 unpaid (payment ratio 1.00)."
    )
    assert keys(body) == ["predicted_default", "high_risk", "frequent_late", "underpaid"]
    assert {i["key"]: i["severity"] for i in body["insight"]["indicators"]}["underpaid"] == "medium"


def test_low_risk_on_time_payer(client):
    body = get(client, 100002)
    assert body["insight"]["summary"] == (
        "Customer 100002 has a low estimated default risk (20.00%, below the 65% classification threshold) "
        "and paid all 19 recorded installments on time. All installments were paid in full."
    )
    assert keys(body) == ["on_time"]


def test_customer_without_history(client):
    body = get(client, 200004)
    assert body["insight"]["summary"] == (
        "Customer 200004 has a high estimated default risk (65.00%, at or above the 65% classification threshold). "
        "No installment history is available, so repayment behaviour cannot be assessed."
    )
    assert keys(body) == ["predicted_default", "high_risk", "no_history"]


def test_medium_risk_underpayer_below_average_lateness(client):
    body = get(client, 100003)
    # 20% late is below the 26% portfolio average and the 50% "frequent" rule, so no lateness flag.
    assert keys(body) == ["medium_risk", "underpaid"]
    assert "a 20.00% late-payment rate across 25 recorded installments (portfolio average 26.00%)" in body["insight"]["summary"]
    assert "4 of 25 installments were underpaid, leaving 1,500.00 unpaid (payment ratio 0.95)." in body["insight"]["summary"]


def test_without_model_the_threshold_is_not_mentioned(settings, client_factory):
    write_test_customers(settings)
    body = get(client_factory(), 385772)
    assert body["classification_threshold"] is None
    assert body["insight"]["summary"].startswith("Customer 385772 has a high estimated default risk (80.13%) and")


BASE = {
    "customer_id": 1, "risk_score": 20.0, "default_probability": 20.0, "risk_category": "Low Risk", "predicted_default": 0,
    "has_installment_history": True, "installment_count": 10, "late_payment_count": 2, "late_payment_rate": 20.0,
    "avg_days_late": 3.0, "max_days_late": 45.0, "underpaid_count": 0, "total_unpaid_amount": 0.0, "payment_ratio": 0.85,
}


def test_rule_based_flags():
    insight = build_insight(BASE, {"late_payment_rate": 8.0}, 0.65)
    flags = {i["key"]: i["severity"] for i in insight["indicators"]}
    assert flags == {"late_above_average": "medium", "severe_delay": "high", "low_payment_ratio": "high"}


def test_same_data_gives_same_insight():
    assert build_insight(BASE, {"late_payment_rate": 8.0}, 0.65) == build_insight(dict(BASE), {"late_payment_rate": 8.0}, 0.65)


def test_insight_never_mentions_outcomes(client):
    for customer_id in (385772, 100002, 200004, 100003):
        text = str(get(client, customer_id)).lower()
        assert "target" not in text and "actual" not in text
