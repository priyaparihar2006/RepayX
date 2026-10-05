import json

import numpy as np
import pandas as pd
import pytest

from services.repayx_engine import ModelLoadError, load_risk_model
from tests.conftest import write_test_model


def model_status(client):
    body = client.get("/api/health").json()
    return body["resources"]["model"], body["model_version"], body["status"]


def test_valid_model_is_loaded_once_and_reported(settings, client_factory):
    write_test_model(settings)
    client = client_factory()

    assert model_status(client) == ("available", "test-model-1", "degraded")
    risk_model = client.app.state.resources.risk_model
    assert risk_model.classification_threshold == 0.65
    assert risk_model.risk_bands.category(29.99) == "Low Risk"
    assert risk_model.risk_bands.category(30) == "Medium Risk"
    assert risk_model.risk_bands.category(60) == "High Risk"


def test_loaded_model_predicts_probabilities(settings):
    write_test_model(settings)
    model = load_risk_model(settings.model_path, settings.model_metadata_path)

    proba = model.default_probability(pd.DataFrame({"f2": [1.0, 19.0], "f1": [19.0, 1.0]}))
    assert ((proba >= 0) & (proba <= 1)).all()
    with pytest.raises(ValueError):
        model.default_probability(pd.DataFrame({"f1": [1.0]}))


def test_model_without_metadata_is_missing(settings, client_factory):
    write_test_model(settings)
    settings.model_metadata_path.unlink()

    assert model_status(client_factory())[0] == "missing"


@pytest.mark.parametrize(
    "corrupt",
    [
        lambda s: s.model_path.write_bytes(b"not a pickle"),                       # checksum mismatch
        lambda s: s.model_metadata_path.write_text("{not json", encoding="utf-8"),
    ],
)
def test_corrupted_artifacts_are_invalid(settings, client_factory, corrupt):
    write_test_model(settings)
    corrupt(settings)

    status, version, overall = model_status(client_factory())
    assert (status, version, overall) == ("invalid", None, "degraded")


@pytest.mark.parametrize(
    "overrides",
    [
        {"schema_version": 99},
        {"environment": {"scikit_learn": "0.0.1"}},
        {"features": {"model_input_columns": ["f2", "f1"]}},
        {"classification_threshold": 1.5},
        {"risk_bands": {"medium_from": 70.0, "high_from": 60.0}},
        {"model_version": None, "risk_bands": None},
    ],
)
def test_metadata_validation_failures(settings, overrides):
    write_test_model(settings, **overrides)

    with pytest.raises(ModelLoadError):
        load_risk_model(settings.model_path, settings.model_metadata_path)


def test_unpickleable_model_with_matching_checksum_is_invalid(settings):
    import hashlib

    write_test_model(settings)
    settings.model_path.write_bytes(b"garbage")
    meta = json.loads(settings.model_metadata_path.read_text())
    meta["artifact_sha256"] = hashlib.sha256(b"garbage").hexdigest()
    settings.model_metadata_path.write_text(json.dumps(meta))

    with pytest.raises(ModelLoadError, match="could not be loaded"):
        load_risk_model(settings.model_path, settings.model_metadata_path)


def test_health_never_exposes_model_error_details(settings, client_factory):
    write_test_model(settings, environment={"scikit_learn": "0.0.1"})
    text = client_factory().get("/api/health").text

    assert "scikit" not in text and "0.0.1" not in text and "joblib" not in text
