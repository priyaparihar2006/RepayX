from config import API_VERSION


def test_health_reports_degraded_when_artifacts_missing(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "success": True,
        "status": "degraded",
        "version": API_VERSION,
        "resources": {
            "customer_data": "missing",
            "model": "missing",
            "tfidf_vectorizer": "missing",
            "tfidf_matrix": "missing",
        },
    }


def test_health_reports_ok_when_all_artifacts_present(settings, client_factory):
    for path in (
        settings.customer_data_path,
        settings.model_path,
        settings.tfidf_vectorizer_path,
        settings.tfidf_matrix_path,
    ):
        path.write_bytes(b"")

    body = client_factory().get("/api/health").json()

    assert body["status"] == "ok"
    assert set(body["resources"].values()) == {"available"}


def test_health_does_not_expose_filesystem_paths(settings, client):
    text = client.get("/api/health").text

    assert str(settings.customer_data_path.parent) not in text
    assert ".parquet" not in text and ".joblib" not in text
