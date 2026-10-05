from tests.conftest import ALLOWED_ORIGIN


def test_cors_allows_configured_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": ALLOWED_ORIGIN, "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in response.headers


def test_simple_request_from_unknown_origin_gets_no_cors_header(client):
    response = client.get("/api/health", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers
