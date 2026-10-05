from config import API_VERSION
from tests.conftest import write_test_customers, write_test_model


def test_health_reports_degraded_when_artifacts_missing(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": True,
        "status": "degraded",
        "version": API_VERSION,
        "model_version": None,
        "resources": {
            "customer_data": "missing",
            "model": "missing",
            "tfidf_vectorizer": "missing",
            "tfidf_matrix": "missing",
        },
    }


def test_health_reports_ok_when_all_artifacts_present(settings, client_factory):
    write_test_model(settings)
    write_test_customers(settings)
    for path in (settings.tfidf_vectorizer_path, settings.tfidf_matrix_path):
        path.write_bytes(b"")

    body = client_factory().get("/api/health").json()

    assert body["status"] == "ok"
    assert body["model_version"] == "test-model-1"
    assert set(body["resources"].values()) == {"available"}


def test_health_does_not_expose_filesystem_paths(settings, client):
    text = client.get("/api/health").text

    assert str(settings.customer_data_path.parent) not in text
    assert ".parquet" not in text and ".joblib" not in text
