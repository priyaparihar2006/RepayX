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


CUSTOMER_ROWS = [
    # id, probability, history?, installments, late, avg_late, max_late, underpaid, unpaid, late_rate, underpaid_rate, ratio
    (385772, 0.801271, 1, 3, 3, 13 / 3, 6.0, 1, 0.225, 1.0, 1 / 3, 0.999984),
    (385001, 0.45, 1, 10, 1, 0.5, 5.0, 0, 0.0, 0.1, 0.0, 1.0),
    (100002, 0.20, 1, 19, 0, 0.0, 0.0, 0, 0.0, 0.0, 0.0, 1.0),
    (100003, 0.45, 1, 25, 5, 2.0, 12.0, 4, 1500.0, 0.2, 0.16, 0.95),
    (200004, 0.65, 0, None, None, None, None, None, None, None, None, None),
    (300005, 0.05, 1, 4, 0, 0.0, 0.0, 0, 0.0, 0.0, 0.0, 1.02),
]


def write_test_customers(settings: Settings, model_version: str | None = "test-model-1", mutate=None) -> "pd.DataFrame":
    """Write customer data in the format produced by ml.scoring.score_customers."""
    import numpy as np
    import pandas as pd
    import pyarrow as pa
    import pyarrow.parquet as pq

    cols = ["customer_id", "default_probability", "has_installment_history", "installment_count",
            "late_payment_count", "avg_days_late", "max_days_late", "underpaid_count", "total_unpaid_amount",
            "late_payment_rate", "underpaid_rate", "payment_ratio"]
    df = pd.DataFrame(CUSTOMER_ROWS, columns=cols)
    df["risk_score"] = df["default_probability"] * 100
    df["risk_category"] = np.select([df.risk_score >= 60, df.risk_score >= 30], ["High Risk", "Medium Risk"], "Low Risk")
    df["predicted_default"] = (df["default_probability"] >= 0.65).astype("int8")
    df["annual_income"] = 135000.0
    df["credit_amount"] = 668304.0
    df["annuity_amount"] = 28444.5
    df["income_type"] = "Working"
    df["education"] = "Lower secondary"
    df["family_status"] = "Married"
    df["occupation"] = [None if i == 1 else "Laborers" for i in range(len(df))]
    df["has_installment_history"] = df["has_installment_history"].astype("int8")
    for col in ("installment_count", "late_payment_count", "underpaid_count"):
        df[col] = df[col].astype("Int64")
    for col in ("avg_days_late", "max_days_late", "total_unpaid_amount", "late_payment_rate", "underpaid_rate", "payment_ratio"):
        df[col] = df[col].astype("float64")
    df["total_installment_amount"] = df["installment_count"].astype("float64") * 100
    df["total_payment_amount"] = df["total_installment_amount"] * df["payment_ratio"]
    if mutate:
        df = mutate(df)
    table = pa.Table.from_pandas(df, preserve_index=False)
    if model_version:
        table = table.replace_schema_metadata({**(table.schema.metadata or {}), b"repayx.model_version": model_version.encode()})
    pq.write_table(table, settings.customer_data_path)
    return df
