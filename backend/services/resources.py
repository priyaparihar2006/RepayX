"""Tracks which data/model artifacts the backend can use.

Artifacts are loaded and validated once at startup (`refresh`): the risk model,
the scored customer data, and the TF-IDF retrieval index. Each is reported as
available, missing, or invalid; nothing is reloaded per request.
"""

from __future__ import annotations

import logging
from enum import Enum
from pathlib import Path

from api.errors import ServiceUnavailableError
from config import Settings
import numpy as np

from services.customer_service import CustomerDataError, CustomerService
from services.query_service import QueryService
from services.rag_service import RetrievalIndexError, TfidfRetriever
from services.repayx_engine import ModelLoadError, RiskModel, load_risk_model

logger = logging.getLogger(__name__)


class Resource(str, Enum):
    CUSTOMER_DATA = "customer_data"
    MODEL = "model"
    TFIDF_VECTORIZER = "tfidf_vectorizer"
    TFIDF_MATRIX = "tfidf_matrix"


class ResourceStatus(str, Enum):
    AVAILABLE = "available"
    MISSING = "missing"
    INVALID = "invalid"  # present but failed to load or validate


_UNAVAILABLE_MESSAGES = {
    Resource.CUSTOMER_DATA: "Customer data is not available.",
    Resource.MODEL: "The risk model is not available.",
    Resource.TFIDF_VECTORIZER: "Retrieval artifacts are not available.",
    Resource.TFIDF_MATRIX: "Retrieval artifacts are not available.",
}


class ResourceRegistry:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._paths: dict[Resource, Path] = {
            Resource.CUSTOMER_DATA: settings.customer_data_path,
            Resource.MODEL: settings.model_path,
            Resource.TFIDF_VECTORIZER: settings.tfidf_vectorizer_path,
            Resource.TFIDF_MATRIX: settings.tfidf_matrix_path,
        }
        self._status: dict[Resource, ResourceStatus] = {}
        self.risk_model: RiskModel | None = None
        self.customers: CustomerService | None = None
        self.retriever: TfidfRetriever | None = None
        self.query_service: QueryService | None = None

    def refresh(self) -> None:
        for resource, path in self._paths.items():
            if path.is_file():
                self._status[resource] = ResourceStatus.AVAILABLE
            else:
                self._status[resource] = ResourceStatus.MISSING
                # Paths are logged server-side only; they are never sent to clients.
                logger.warning("Resource %s not found at %s", resource.value, path)
        self._load_model()
        self._load_customers()
        self._load_retriever()
        self.query_service = (
            QueryService(
                self.customers,
                self.retriever,
                self.risk_model.classification_threshold if self.risk_model else None,
            )
            if self.customers
            else None
        )

    def _load_model(self) -> None:
        self.risk_model = None
        if self._status[Resource.MODEL] is ResourceStatus.MISSING:
            return
        if not self._settings.model_metadata_path.is_file():
            logger.warning("Model metadata not found at %s", self._settings.model_metadata_path)
            self._status[Resource.MODEL] = ResourceStatus.MISSING
            return
        try:
            self.risk_model = load_risk_model(self._settings.model_path, self._settings.model_metadata_path)
        except ModelLoadError as exc:
            logger.error("Risk model unavailable: %s", exc, exc_info=exc.__cause__ is not None)
            self._status[Resource.MODEL] = ResourceStatus.INVALID

    def _load_customers(self) -> None:
        self.customers = None
        if self._status[Resource.CUSTOMER_DATA] is ResourceStatus.MISSING:
            return
        try:
            customers = CustomerService.load(self._settings.customer_data_path)
        except CustomerDataError as exc:
            logger.error("Customer data unavailable: %s", exc, exc_info=exc.__cause__ is not None)
            self._status[Resource.CUSTOMER_DATA] = ResourceStatus.INVALID
            return
        # Scores must come from the model the API reports; otherwise thresholds and bands may disagree.
        if self.risk_model and customers.model_version != self.risk_model.model_version:
            logger.error(
                "Customer data was scored by model %s but loaded model is %s; re-run ml.scoring.score_customers",
                customers.model_version, self.risk_model.model_version,
            )
            self._status[Resource.CUSTOMER_DATA] = ResourceStatus.INVALID
            return
        self.customers = customers

    def _load_retriever(self) -> None:
        self.retriever = None
        rag = (Resource.TFIDF_VECTORIZER, Resource.TFIDF_MATRIX)
        if any(self._status[r] is ResourceStatus.MISSING for r in rag):
            return
        s = self._settings
        if not s.tfidf_ids_path.is_file() or not s.tfidf_metadata_path.is_file():
            logger.warning("Retrieval index IDs or metadata not found in %s", s.tfidf_ids_path.parent)
            self._set(rag, ResourceStatus.MISSING)
            return
        try:
            retriever = TfidfRetriever.load(
                s.tfidf_vectorizer_path, s.tfidf_matrix_path, s.tfidf_ids_path, s.tfidf_metadata_path
            )
        except RetrievalIndexError as exc:
            logger.error("Retrieval index unavailable: %s", exc, exc_info=exc.__cause__ is not None)
            self._set(rag, ResourceStatus.INVALID)
            return
        if self.customers is not None:
            same_ids = np.array_equal(np.sort(retriever.customer_ids), self.customers.frame.index.to_numpy())
            if retriever.customer_model_version != self.customers.model_version or not same_ids:
                logger.error("Retrieval index was built from different customer data; re-run ml.retrieval.build_tfidf_index")
                self._set(rag, ResourceStatus.INVALID)
                return
        self.retriever = retriever

    def _set(self, resources, status: ResourceStatus) -> None:
        for resource in resources:
            self._status[resource] = status

    def status(self) -> dict[str, ResourceStatus]:
        return {resource.value: self._status.get(resource, ResourceStatus.MISSING) for resource in Resource}

    def is_available(self, resource: Resource) -> bool:
        return self._status.get(resource) is ResourceStatus.AVAILABLE

    def require(self, *resources: Resource) -> None:
        for resource in resources:
            if not self.is_available(resource):
                raise ServiceUnavailableError(
                    code=f"{resource.value}_unavailable",
                    message=_UNAVAILABLE_MESSAGES[resource],
                )
