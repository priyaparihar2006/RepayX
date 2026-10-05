"""TF-IDF (lexical) retrieval over customer description documents.

Artifacts are produced by `python -m ml.retrieval.build_tfidf_index` and loaded
once at startup. Before unpickling the vectorizer, every artifact's SHA-256 is
checked against the index metadata. Retrieval returns customer IDs ranked by
cosine similarity; it is used only for general (non-numeric) questions.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import sklearn
from scipy import sparse

logger = logging.getLogger(__name__)

SUPPORTED_INDEX_SCHEMA = 1
MIN_SIMILARITY = 0.05


class RetrievalIndexError(Exception):
    """Retrieval artifacts exist but cannot be used."""


@dataclass(frozen=True)
class RetrievalHit:
    customer_id: int
    similarity: float


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


class TfidfRetriever:
    def __init__(self, vectorizer, matrix: sparse.csr_matrix, customer_ids: np.ndarray, customer_model_version: str | None):
        self._vectorizer = vectorizer
        self._matrix = matrix
        self._ids = customer_ids
        self.customer_model_version = customer_model_version

    @classmethod
    def load(cls, vectorizer_path: Path, matrix_path: Path, ids_path: Path, metadata_path: Path) -> "TfidfRetriever":
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            if metadata.get("schema_version") != SUPPORTED_INDEX_SCHEMA:
                raise RetrievalIndexError("Unsupported retrieval index schema version.")
            expected = metadata["sha256"]
            for path in (vectorizer_path, matrix_path, ids_path):
                if expected.get(path.name) != _sha256(path):
                    raise RetrievalIndexError(f"{path.name} does not match its metadata checksum.")
            if metadata.get("scikit_learn") != sklearn.__version__:
                raise RetrievalIndexError("Retrieval index was built with a different scikit-learn version.")
            matrix = sparse.load_npz(matrix_path).tocsr()
            ids = np.load(ids_path, allow_pickle=False)
            vectorizer = joblib.load(vectorizer_path)
        except RetrievalIndexError:
            raise
        except Exception as exc:
            raise RetrievalIndexError("Retrieval artifacts could not be loaded.") from exc

        if matrix.shape[0] != len(ids) or matrix.shape[0] != metadata.get("documents"):
            raise RetrievalIndexError("Retrieval matrix rows do not match customer IDs.")
        if len(np.unique(ids)) != len(ids):
            raise RetrievalIndexError("Retrieval index has duplicate customer IDs.")
        vocabulary = getattr(vectorizer, "vocabulary_", None)
        if vocabulary is None or len(vocabulary) != matrix.shape[1]:
            raise RetrievalIndexError("Vectorizer vocabulary does not match the matrix.")

        logger.info("Loaded TF-IDF index: %d documents, %d terms", matrix.shape[0], matrix.shape[1])
        return cls(vectorizer, matrix, ids.astype(np.int64), metadata.get("customer_model_version"))

    @property
    def customer_ids(self) -> np.ndarray:
        return self._ids

    def search(self, query: str, limit: int = 10, min_similarity: float = MIN_SIMILARITY) -> list[RetrievalHit]:
        query_vector = self._vectorizer.transform([query])
        if query_vector.nnz == 0:
            return []
        # Rows and the query are L2-normalised by TfidfVectorizer, so the dot product is cosine similarity.
        scores = (self._matrix @ query_vector.T).toarray().ravel()
        candidates = np.flatnonzero(scores >= min_similarity)
        if candidates.size == 0:
            return []
        # Highest similarity first; ties broken by customer ID for stable results.
        order = np.lexsort((self._ids[candidates], -scores[candidates]))[:limit]
        top = candidates[order]
        return [RetrievalHit(int(self._ids[i]), round(float(scores[i]), 4)) for i in top]
