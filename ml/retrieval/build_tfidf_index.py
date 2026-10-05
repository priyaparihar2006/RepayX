"""Build the TF-IDF retrieval index from the scored customer dataset.

    python -m ml.retrieval.build_tfidf_index

Reads backend/data/customer_data.parquet (written by ml.scoring.score_customers)
and writes to backend/rag/:
    tfidf_vectorizer.joblib        fitted TfidfVectorizer
    customer_tfidf_matrix.npz      sparse document matrix (one row per customer)
    customer_tfidf_ids.npy         customer_id for each matrix row
    tfidf_index.metadata.json      checksums, row count, source model version
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pyarrow.parquet as pq
import sklearn
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from ml.config import CUSTOMER_DATA_PATH, REPO_ROOT
from ml.retrieval.documents import DOCUMENT_TEMPLATE_VERSION, customer_documents

RAG_DIR = REPO_ROOT / "backend" / "rag"
VECTORIZER_FILE = "tfidf_vectorizer.joblib"
MATRIX_FILE = "customer_tfidf_matrix.npz"
IDS_FILE = "customer_tfidf_ids.npy"
METADATA_FILE = "tfidf_index.metadata.json"
INDEX_SCHEMA_VERSION = 1


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_index(customer_data: Path, output_dir: Path) -> dict:
    schema = pq.read_schema(customer_data)
    if any("target" in c.lower() or "actual" in c.lower() for c in schema.names):
        raise ValueError("Customer data contains outcome columns; refusing to index it.")
    customers = pq.read_table(customer_data).to_pandas().sort_values("customer_id").reset_index(drop=True)
    model_version = (schema.metadata or {}).get(b"repayx.model_version", b"").decode() or None

    docs = customer_documents(customers)
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words="english")
    matrix = vectorizer.fit_transform(docs).astype(np.float32).tocsr()
    ids = customers["customer_id"].to_numpy(dtype=np.int64)

    output_dir.mkdir(parents=True, exist_ok=True)
    paths = {name: output_dir / name for name in (VECTORIZER_FILE, MATRIX_FILE, IDS_FILE)}
    joblib.dump(vectorizer, paths[VECTORIZER_FILE], compress=3)
    sparse.save_npz(paths[MATRIX_FILE], matrix, compressed=True)
    np.save(paths[IDS_FILE], ids)

    metadata = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "document_template_version": DOCUMENT_TEMPLATE_VERSION,
        "customer_model_version": model_version,
        "documents": int(matrix.shape[0]),
        "vocabulary_size": int(matrix.shape[1]),
        "scikit_learn": sklearn.__version__,
        "sha256": {name: sha256(path) for name, path in paths.items()},
    }
    (output_dir / METADATA_FILE).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--customer-data", type=Path, default=CUSTOMER_DATA_PATH)
    parser.add_argument("--output-dir", type=Path, default=RAG_DIR)
    args = parser.parse_args(argv)
    meta = build_index(args.customer_data, args.output_dir)
    print(f"Indexed {meta['documents']:,} customers, vocabulary {meta['vocabulary_size']:,} terms "
          f"(customer data from model {meta['customer_model_version']}) -> {args.output_dir}")


if __name__ == "__main__":
    main()
