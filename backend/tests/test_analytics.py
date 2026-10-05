"""GET /api/analytics against the six-customer fixture in conftest (values worked out by hand)."""

import pytest

from models.schemas import DISCLAIMER
from tests.conftest import write_test_customers, write_test_model


@pytest.fixture
def body(settings, client_factory):
    write_test_model(settings)
    write_test_customers(settings)
    response = client_factory().get("/api/analytics")
    assert response.status_code == 200
    return response.json()


def test_portfolio(body):
    assert body["success"] is True and body["model_version"] == "test-model-1"
    assert body["portfolio"] == {
        "total_customers": 6,
        "risk_categories": [
            {"risk_category": "Low Risk", "customers": 2, "share": 33.33},
            {"risk_category": "Medium Risk", "customers": 2, "share": 33.33},
            {"risk_category": "High Risk", "customers": 2, "share": 33.33},
        ],
        "average_risk_score": 43.35,          # (80.13 + 45 + 20 + 45 + 65 + 5) / 6
        "median_risk_score": 45.0,
        "average_default_probability": 43.35,
        "predicted_defaults": 2,
        "predicted_default_share": 33.33,
    }


def test_repayment(body):
    assert body["repayment"] == {
        "customers_with_history": 5,
        "customers_without_history": 1,
        "average_late_payment_rate": 26.0,    # (100 + 10 + 0 + 20 + 0) / 5, no-history customer excluded
        "customers_with_late_payments": 3,
        "customers_with_late_payments_share": 60.0,
        "customers_always_late": 1,
        "average_days_late": 1.37,
        "average_underpaid_rate": 9.87,
        "customers_with_unpaid_amounts": 2,
        "total_unpaid_amount": 1500.22,
        "average_payment_ratio": 0.99,
    }


def test_risk_score_histogram(body):
    hist = {b["range"]: b["customers"] for b in body["risk_score_histogram"]}
    assert list(hist) == ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"]
    assert hist == {"0-10": 1, "10-20": 0, "20-30": 1, "30-40": 0, "40-50": 2, "50-60": 0,
                    "60-70": 1, "70-80": 0, "80-90": 1, "90-100": 0}
    assert sum(hist.values()) == body["portfolio"]["total_customers"]


def test_late_payment_rate_buckets(body):
    assert {b["bucket"]: b["customers"] for b in body["late_payment_rate_buckets"]} == {
        "0% (always on time)": 2, "0-10%": 1, "10-25%": 1, "25-50%": 0, "50-<100%": 0,
        "100% (always late)": 1, "Unknown": 1,
    }


def test_segments(body):
    occupation = {s["segment"]: s for s in body["segments"]["occupation"]}
    assert list(occupation) == ["Laborers", "Unknown"]  # largest first
    assert occupation["Laborers"] == {
        "segment": "Laborers", "customers": 5, "average_risk_score": 43.03,
        "high_risk_share": 40.0, "average_late_payment_rate": 30.0,
    }
    assert occupation["Unknown"]["customers"] == 1
    assert body["segments"]["income_type"][0]["segment"] == "Working"
    assert "family_status" not in body["segments"]


def test_model_info_and_disclaimer(body):
    assert body["model"] == {
        "model_version": "test-model-1",
        "classification_threshold": 0.65,
        "risk_band_medium_from": 30.0,
        "risk_band_high_from": 60.0,
        "risk_band_note": "Prototype presentation bands on the 0-100 risk score; not validated lending thresholds.",
        "evaluation": {
            "roc_auc": 75.0, "accuracy": None, "precision": None, "recall": None, "f1": None,
            "holdout_customers": None,
            "note": "Prototype evaluation on a held-out split recorded at training time; not a production validation.",
        },
    }
    assert body["disclaimer"] == DISCLAIMER


def test_counts_match_customer_listing(settings, client_factory):
    write_test_customers(settings)
    client = client_factory()
    analytics = client.get("/api/analytics").json()
    for row in analytics["portfolio"]["risk_categories"]:
        listed = client.get("/api/customers", params={"risk_category": row["risk_category"]}).json()
        assert listed["pagination"]["total"] == row["customers"]


def test_analytics_without_model_has_null_model_block(settings, client_factory):
    write_test_customers(settings)
    body = client_factory().get("/api/analytics").json()
    assert body["model"] is None and body["portfolio"]["total_customers"] == 6


def test_analytics_requires_customer_data(client):
    response = client.get("/api/analytics")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "customer_data_unavailable"


def test_summary_is_computed_once(settings, client_factory, monkeypatch):
    from services.analytics_service import AnalyticsService

    write_test_customers(settings)
    calls = []
    original = AnalyticsService._histogram
    monkeypatch.setattr(AnalyticsService, "_histogram", staticmethod(lambda s: calls.append(1) or original(s)))
    client = client_factory()
    for _ in range(3):
        client.get("/api/analytics")
    assert len(calls) == 1


def test_no_outcome_fields(body):
    text = str(body).lower()
    assert "target" not in text and "actual" not in text
