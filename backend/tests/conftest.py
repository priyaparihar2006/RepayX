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
