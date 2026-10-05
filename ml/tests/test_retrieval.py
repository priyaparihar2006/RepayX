import json

import numpy as np
import pandas as pd
import pytest
from scipy import sparse

from ml.retrieval.build_tfidf_index import IDS_FILE, MATRIX_FILE, METADATA_FILE, build_index
from ml.retrieval.documents import customer_document


def row(**overrides):
    base = {
        "customer_id": 385772, "risk_category": "High Risk", "predicted_default": 1,
        "income_type": "Working", "education": "Secondary / secondary special", "family_status": "Married",
        "occupation": "Laborers", "has_installment_history": 1, "late_payment_rate": 1.0, "total_unpaid_amount": 0.22,
    }
    return {**base, **overrides}


@pytest.mark.parametrize(
    "rate,phrase",
    [(0.0, "always on time"), (0.1, "occasional late"), (0.3, "frequent late"), (0.6, "mostly late"), (1.0, "always late")],
)
def test_late_descriptors(rate, phrase):
    assert phrase in customer_document(row(late_payment_rate=rate))


def test_document_contents():
    doc = customer_document(row())
    assert doc.startswith("customer 385772 high risk predicted default working secondary")
    assert "underpaid installments outstanding unpaid amount" in doc
    assert "/" not in doc


def test_missing_values_and_history():
    doc = customer_document(row(occupation=np.nan, has_installment_history=0, late_payment_rate=np.nan,
                                total_unpaid_amount=np.nan, predicted_default=0))
    assert "no installment history" in doc and "not predicted to default" in doc
    assert "nan" not in doc and "laborers" not in doc


def write_customers(path, extra=None):
    df = pd.DataFrame([row(customer_id=i, late_payment_rate=r) for i, r in [(3, 0.0), (1, 1.0), (2, 0.3)]])
    if extra:
        df = df.assign(**extra)
    df.to_parquet(path)


def test_build_index(tmp_path):
    write_customers(tmp_path / "customers.parquet")
    meta = build_index(tmp_path / "customers.parquet", tmp_path / "rag")

    ids = np.load(tmp_path / "rag" / IDS_FILE)
    matrix = sparse.load_npz(tmp_path / "rag" / MATRIX_FILE)
    assert ids.tolist() == [1, 2, 3]  # sorted by customer ID
    assert matrix.shape == (3, meta["vocabulary_size"]) and meta["documents"] == 3
    saved = json.loads((tmp_path / "rag" / METADATA_FILE).read_text())
    assert set(saved["sha256"]) == {"tfidf_vectorizer.joblib", "customer_tfidf_matrix.npz", "customer_tfidf_ids.npy"}


@pytest.mark.parametrize("column", ["TARGET", "actual_default"])
def test_build_index_refuses_outcome_columns(tmp_path, column):
    write_customers(tmp_path / "customers.parquet", extra={column: 0})
    with pytest.raises(ValueError, match="outcome"):
        build_index(tmp_path / "customers.parquet", tmp_path / "rag")
