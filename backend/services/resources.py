"""Tracks which data/model artifacts the backend can use.

Artifacts are checked once at startup (`refresh`). The risk model and customer
data are loaded and validated here; retrieval artifacts are presence-checked
until the retrieval service is added in a later phase.
"""

from __future__ import annotations

import logging
from enum import Enum
from pathlib import Path

from api.errors import ServiceUnavailableError
from config import Settings
from services.customer_service import CustomerDataError, CustomerService
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
