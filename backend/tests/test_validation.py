import pytest

from models.schemas import MAX_QUERY_LENGTH


def assert_validation_error(response):
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    return body


@pytest.mark.parametrize("customer_id", ["abc", "0", "-5", "12.5", "99999999999"])
def test_invalid_customer_id_is_rejected(client, customer_id):
    assert_validation_error(client.get(f"/api/customer/{customer_id}"))


@pytest.mark.parametrize("payload", [{"query": ""}, {"query": "   "}, {}, {"query": None}])
def test_empty_or_missing_query_is_rejected(client, payload):
    assert_validation_error(client.post("/api/query", json=payload))


def test_overlong_query_is_rejected(client):
    assert_validation_error(client.post("/api/query", json={"query": "x" * (MAX_QUERY_LENGTH + 1)}))


def test_unknown_query_fields_are_rejected(client):
    assert_validation_error(client.post("/api/query", json={"query": "hi", "debug": True}))


def test_validation_error_does_not_echo_input(client):
    secret = "<script>alert(1)</script>"
    body = assert_validation_error(client.post("/api/query", json={"query": "ok", secret: 1}))
    assert "alert(1)" not in str(body["error"]["message"])
    assert all("input" not in detail for detail in body["error"]["details"])


@pytest.mark.parametrize(
    "params",
    [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"risk_category": "Extreme Risk"}, {"search": ""}],
)
def test_invalid_customer_list_params_are_rejected(client, params):
    assert_validation_error(client.get("/api/customers", params=params))


def test_malformed_json_reports_body_field(client):
    response = client.post("/api/query", content="not json", headers={"Content-Type": "application/json"})

    body = assert_validation_error(response)
    assert body["error"]["details"][0]["field"] == "body"
