import numpy as np
import pytest

from tests.conftest import write_test_customers, write_test_model


@pytest.fixture
def client(settings, client_factory):
    write_test_customers(settings)
    return client_factory()


def ids(response):
    return [c["customer_id"] for c in response.json()["customers"]]


# --- GET /api/customer/{id} ------------------------------------------------


def test_customer_lookup_returns_full_profile(client):
    response = client.get("/api/customer/385772")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True and body["model_version"] == "test-model-1"
    assert body["customer"] == {
        "customer_id": 385772,
        "risk_score": 80.13,
        "default_probability": 80.13,
        "risk_category": "High Risk",
        "predicted_default": 1,
        "late_payment_rate": 100.0,
        "total_unpaid_amount": 0.23,
        "payment_ratio": 1.0,
        "annual_income": 135000.0,
        "credit_amount": 668304.0,
        "annuity_amount": 28444.5,
        "income_type": "Working",
        "education": "Lower secondary",
        "family_status": "Married",
        "occupation": "Laborers",
        "has_installment_history": True,
        "installment_count": 3,
        "late_payment_count": 3,
        "avg_days_late": 4.33,
        "max_days_late": 6.0,
        "underpaid_count": 1,
        "underpaid_rate": 33.33,
        "total_installment_amount": 300.0,
        "total_payment_amount": 300.0,
    }


def test_customer_without_history_has_null_repayment_fields(client):
    customer = client.get("/api/customer/200004").json()["customer"]

    assert customer["has_installment_history"] is False
    for field in ("installment_count", "late_payment_count", "late_payment_rate", "avg_days_late",
                  "underpaid_rate", "total_unpaid_amount", "payment_ratio"):
        assert customer[field] is None, field
    assert customer["risk_category"] == "High Risk" and customer["predicted_default"] == 1


def test_missing_categorical_value_is_null(client):
    assert client.get("/api/customer/385001").json()["customer"]["occupation"] is None


def test_unknown_customer_returns_404(client):
    response = client.get("/api/customer/999999")

    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "error": {"code": "customer_not_found", "message": "Customer 999999 was not found."},
    }


def test_invalid_id_is_rejected_before_data_lookup(client):
    assert client.get("/api/customer/abc").status_code == 422


def test_response_never_contains_outcome_fields(client):
    text = client.get("/api/customer/385772").text + client.get("/api/customers").text
    assert "target" not in text.lower() and "actual" not in text.lower()


# --- GET /api/customers --------------------------------------------------------


def test_default_listing_sorted_by_risk_desc_with_id_tiebreak(client):
    response = client.get("/api/customers")

    assert response.status_code == 200
    body = response.json()
    assert ids(response) == [385772, 200004, 100003, 385001, 100002, 300005]
    assert body["pagination"] == {"page": 1, "page_size": 25, "total": 6, "total_pages": 1}
    assert set(body["customers"][0]) == {
        "customer_id", "risk_score", "default_probability", "risk_category", "predicted_default",
        "late_payment_rate", "total_unpaid_amount", "payment_ratio",
    }


@pytest.mark.parametrize(
    "category,expected",
    [("High Risk", [385772, 200004]), ("Medium Risk", [100003, 385001]), ("Low Risk", [100002, 300005])],
)
def test_filter_by_risk_category(client, category, expected):
    response = client.get("/api/customers", params={"risk_category": category})
    assert ids(response) == expected
    assert response.json()["pagination"]["total"] == len(expected)


def test_search_matches_customer_id_prefix(client):
    assert ids(client.get("/api/customers", params={"search": "385"})) == [385772, 385001]
    assert ids(client.get("/api/customers", params={"search": "385772"})) == [385772]


def test_search_and_filter_combine(client):
    assert ids(client.get("/api/customers", params={"search": "385", "risk_category": "Medium Risk"})) == [385001]


def test_search_without_matches_returns_empty_page(client):
    body = client.get("/api/customers", params={"search": "999"}).json()
    assert body["customers"] == [] and body["pagination"]["total"] == 0 and body["pagination"]["total_pages"] == 0


@pytest.mark.parametrize("search", ["abc", "38a", " 385", "12345678901"])
def test_non_numeric_or_long_search_is_rejected(client, search):
    assert client.get("/api/customers", params={"search": search}).status_code == 422


def test_sort_ascending_by_late_rate_puts_missing_last(client):
    response = client.get("/api/customers", params={"sort_by": "late_payment_rate", "sort_order": "asc"})
    assert ids(response) == [100002, 300005, 385001, 100003, 385772, 200004]


def test_sort_descending_by_unpaid_puts_missing_last(client):
    response = client.get("/api/customers", params={"sort_by": "total_unpaid_amount", "sort_order": "desc"})
    assert ids(response)[:2] == [100003, 385772]
    assert ids(response)[-1] == 200004


def test_sort_by_customer_id(client):
    assert ids(client.get("/api/customers", params={"sort_by": "customer_id", "sort_order": "asc"})) == sorted(
        [385772, 385001, 100002, 100003, 200004, 300005]
    )


def test_pagination(client):
    first = client.get("/api/customers", params={"page_size": 4})
    second = client.get("/api/customers", params={"page_size": 4, "page": 2})
    beyond = client.get("/api/customers", params={"page_size": 4, "page": 5})

    assert ids(first) == [385772, 200004, 100003, 385001]
    assert ids(second) == [100002, 300005]
    assert second.json()["pagination"] == {"page": 2, "page_size": 4, "total": 6, "total_pages": 2}
    assert beyond.json()["customers"] == []


@pytest.mark.parametrize("params", [{"sort_by": "income"}, {"sort_order": "up"}])
def test_invalid_sort_is_rejected(client, params):
    assert client.get("/api/customers", params=params).status_code == 422


# --- Data loading and validation ---------------------------------------------


def health_customer_status(client):
    return client.get("/api/health").json()["resources"]["customer_data"]


@pytest.mark.parametrize(
    "mutate",
    [
        lambda df: df.assign(TARGET=0),
        lambda df: df.assign(actual_default=0),
        lambda df: df.drop(columns="risk_score"),
        lambda df: df.assign(customer_id=[1, 1, 2, 3, 4, 5]),
        lambda df: df.assign(default_probability=df.default_probability * 2),
        lambda df: df.assign(risk_score=df.risk_score + 5),
        lambda df: df.assign(risk_category="Unknown"),
        lambda df: df.assign(predicted_default=2),
        lambda df: df.assign(late_payment_rate=df.late_payment_rate * 100),
        lambda df: df.iloc[0:0],
    ],
    ids=["target", "actual", "missing-col", "dup-ids", "prob-range", "score-mismatch",
         "bad-category", "bad-prediction", "rate-as-percent", "empty"],
)
def test_invalid_customer_data_is_rejected(settings, client_factory, mutate):
    write_test_customers(settings, mutate=mutate)
    client = client_factory()

    assert health_customer_status(client) == "invalid"
    response = client.get("/api/customer/385772")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "customer_data_unavailable"


def test_corrupted_file_is_invalid(settings, client_factory):
    settings.customer_data_path.write_bytes(b"not parquet")
    assert health_customer_status(client_factory()) == "invalid"


def test_customer_data_from_other_model_version_is_invalid(settings, client_factory):
    write_test_model(settings)  # model_version "test-model-1"
    write_test_customers(settings, model_version="some-older-model")

    assert health_customer_status(client_factory()) == "invalid"


def test_customer_data_matching_loaded_model_is_available(settings, client_factory):
    write_test_model(settings)
    write_test_customers(settings, model_version="test-model-1")
    client = client_factory()

    assert health_customer_status(client) == "available"
    assert client.get("/api/customer/385772").json()["model_version"] == "test-model-1"


def test_data_is_loaded_once_at_startup(settings, client_factory, monkeypatch):
    import pandas as pd

    write_test_customers(settings)
    calls = []
    original = pd.read_parquet
    monkeypatch.setattr(pd, "read_parquet", lambda *a, **k: calls.append(1) or original(*a, **k))

    client = client_factory()
    for _ in range(5):
        client.get("/api/customers")
        client.get("/api/customer/385772")
    assert len(calls) == 1


def test_large_listing_is_consistent(settings, client_factory):
    rng = np.random.default_rng(0)

    def many(df):
        base = df.iloc[[2]]
        out = base.loc[base.index.repeat(500)].reset_index(drop=True)
        out["customer_id"] = np.arange(1, 501)
        out["default_probability"] = rng.uniform(0, 1, 500)
        out["risk_score"] = out["default_probability"] * 100
        out["risk_category"] = np.select([out.risk_score >= 60, out.risk_score >= 30], ["High Risk", "Medium Risk"], "Low Risk")
        out["predicted_default"] = (out["default_probability"] >= 0.65).astype("int8")
        return out

    write_test_customers(settings, mutate=many)
    client = client_factory()
    seen = []
    for page in range(1, 6):
        seen += ids(client.get("/api/customers", params={"page": page, "page_size": 100}))
    assert sorted(seen) == list(range(1, 501))
    scores = [c["risk_score"] for c in client.get("/api/customers", params={"page_size": 100}).json()["customers"]]
    assert scores == sorted(scores, reverse=True)
