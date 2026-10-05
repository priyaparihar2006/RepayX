import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from ml.features.installment_features import CUSTOMER_FEATURES
from ml.preprocessing.preprocessing import (
    CATEGORICAL_FEATURES,
    EXCLUDED_FEATURES,
    MODEL_FEATURES,
    PROFILE_COLUMNS,
    RAW_NUMERIC,
    assemble_customer_frame,
    build_preprocessor,
    model_inputs,
)
from ml.scoring.risk import HIGH, LOW, MEDIUM, predicted_default, risk_category, risk_score
from ml.scoring.score_customers import build_customer_table


def make_applications(n=40, seed=0):
    rng = np.random.default_rng(seed)
    data = {"SK_ID_CURR": np.arange(1, n + 1), "TARGET": np.tile([0, 1], n // 2)}
    for col in RAW_NUMERIC:
        data[col] = rng.uniform(1, 1000, n)
    data["DAYS_BIRTH"] = -rng.uniform(8000, 20000, n)
    data["DAYS_EMPLOYED"] = -rng.uniform(100, 5000, n)
    data["DAYS_EMPLOYED"][0] = 365243
    for col in set(CATEGORICAL_FEATURES) | {c for c in PROFILE_COLUMNS if c not in RAW_NUMERIC}:
        data[col] = rng.choice(["A", "B", "XNA"], n)
    return pd.DataFrame(data)


def make_installment_features(ids):
    return pd.DataFrame({col: 1.0 for col in CUSTOMER_FEATURES}, index=pd.Index(ids, name="SK_ID_CURR"))


def test_days_employed_sentinel_becomes_missing_with_flag():
    frame = assemble_customer_frame(make_applications(), make_installment_features([1, 2]))
    assert np.isnan(frame.loc[0, "DAYS_EMPLOYED"]) and frame.loc[0, "DAYS_EMPLOYED_ANOMALY"] == 1
    assert frame.loc[1, "DAYS_EMPLOYED_ANOMALY"] == 0


def test_missing_history_is_flagged_not_zero_filled():
    frame = assemble_customer_frame(make_applications(), make_installment_features([1, 2]))
    assert frame["HAS_INSTALLMENT_HISTORY"].tolist()[:3] == [1, 1, 0]
    assert frame.loc[2, CUSTOMER_FEATURES].isna().all()


def test_model_inputs_exclude_target_and_protected_attributes():
    frame = assemble_customer_frame(make_applications(), make_installment_features([1]))
    X = model_inputs(frame)
    assert list(X.columns) == MODEL_FEATURES
    assert "TARGET" not in X.columns
    for col in EXCLUDED_FEATURES:
        assert col not in X.columns


def test_xna_category_treated_as_missing():
    frame = assemble_customer_frame(make_applications(), make_installment_features([1]))
    assert not (frame[CATEGORICAL_FEATURES] == "XNA").any().any()


def test_pipeline_fits_and_customer_table_has_no_target():
    frame = assemble_customer_frame(make_applications(), make_installment_features([1, 2, 3]))
    model = Pipeline([("preprocess", build_preprocessor()), ("classifier", LogisticRegression(max_iter=500))])
    model.fit(model_inputs(frame), frame["TARGET"])

    with pytest.raises(ValueError):
        build_customer_table(frame, model, 0.65)

    table = build_customer_table(frame.drop(columns="TARGET"), model, 0.65)
    assert "target" not in {c.lower() for c in table.columns}
    assert table["default_probability"].between(0, 1).all()
    assert np.allclose(table["risk_score"], table["default_probability"] * 100)
    assert table.loc[table.customer_id == 5, "installment_count"].isna().all()  # no history -> <NA>


@pytest.mark.parametrize(
    "score,expected",
    [(0.0, LOW), (29.99, LOW), (30.0, MEDIUM), (59.99, MEDIUM), (60.0, HIGH), (100.0, HIGH)],
)
def test_risk_band_boundaries(score, expected):
    assert risk_category([score])[0] == expected


def test_classification_threshold_is_independent_of_bands():
    proba = np.array([0.62, 0.65, 0.7])
    assert list(risk_category(risk_score(proba))) == [HIGH, HIGH, HIGH]
    assert list(predicted_default(proba, 0.65)) == [0, 1, 1]
