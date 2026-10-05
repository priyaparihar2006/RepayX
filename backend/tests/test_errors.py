import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from tests.conftest import write_test_customers


@pytest.mark.parametrize(
    "method,path,kwargs",
    [
        ("get", "/api/customer/385772", {}),
        ("get", "/api/customers", {}),
        ("get", "/api/customers", {"params": {"risk_category": "High Risk", "search": "385772"}}),
        ("get", "/api/analytics", {}),
        ("post", "/api/query", {"json": {"query": "How many high-risk customers are there?"}}),
    ],
)
def test_data_endpoints_return_503_when_customer_data_missing(client, method, path, kwargs):
    response = getattr(client, method)(path, **kwargs)

    assert response.status_code == 503
    assert response.json() == {
        "success": False,
        "error": {"code": "customer_data_unavailable", "message": "Customer data is not available."},
    }


def test_unimplemented_endpoint_reports_501_when_data_present(settings, client_factory):
    write_test_customers(settings)

    response = client_factory().get("/api/analytics")

    assert response.status_code == 501
    assert response.json()["error"]["code"] == "not_implemented"


def test_unknown_route_returns_json_404(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"success": False, "error": {"code": "not_found", "message": "Not Found"}}


def test_wrong_method_returns_json_405(client):
    response = client.get("/api/query")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_unhandled_exception_hides_details(settings):
    app = create_app(settings)

    @app.get("/api/_boom")
    def boom():
        raise RuntimeError(r"secret detail at C:\internal\path.py")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/_boom")

    assert response.status_code == 500
    assert response.json() == {
        "success": False,
        "error": {"code": "internal_error", "message": "An unexpected error occurred."},
    }
    assert "secret" not in response.text and "Traceback" not in response.text
