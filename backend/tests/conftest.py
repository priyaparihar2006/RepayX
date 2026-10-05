from __future__ import annotations

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from config import Settings

ALLOWED_ORIGIN = "http://localhost:3000"


def make_settings(tmp_path: Path) -> Settings:
    return Settings(
        api_host="127.0.0.1",
        api_port=8000,
        cors_allowed_origins=[ALLOWED_ORIGIN],
        customer_data_path=tmp_path / "customer_data.parquet",
        model_path=tmp_path / "repayx_model.joblib",
        model_metadata_path=tmp_path / "repayx_model.metadata.json",
        tfidf_vectorizer_path=tmp_path / "tfidf_vectorizer.joblib",
        tfidf_matrix_path=tmp_path / "customer_tfidf_matrix.npz",
    )


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture
def client_factory(settings: Settings) -> Iterator[Callable[..., TestClient]]:
    clients: list[TestClient] = []

    def factory(**kwargs) -> TestClient:
        client = TestClient(create_app(settings), **kwargs)
        client.__enter__()  # runs the lifespan startup
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


@pytest.fixture
def client(client_factory) -> TestClient:
    """Client for an app where no data/model artifacts exist."""
    return client_factory()


def write_test_model(settings: Settings, **metadata_overrides) -> dict:
    """Train a tiny real pipeline and write it with metadata in the ml pipeline's format."""
    import hashlib
    import json

    import joblib
    import numpy as np
    import pandas as pd
    import sklearn
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    X = pd.DataFrame({"f1": np.arange(20.0), "f2": np.arange(20.0)[::-1]})
    y = np.array([0, 1] * 10)
    pipeline = Pipeline([("scale", StandardScaler()), ("classifier", LogisticRegression())]).fit(X, y)
    joblib.dump(pipeline, settings.model_path)

    metadata = {
        "schema_version": 1,
        "model_version": "test-model-1",
        "artifact_sha256": hashlib.sha256(settings.model_path.read_bytes()).hexdigest(),
        "environment": {"scikit_learn": sklearn.__version__},
        "features": {"model_input_columns": ["f1", "f2"]},
        "classification_threshold": 0.65,
        "risk_bands": {"medium_from": 30.0, "high_from": 60.0},
        "holdout_metrics": {"roc_auc": 0.75},
    }
    metadata.update(metadata_overrides)
    settings.model_metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
    return metadata
