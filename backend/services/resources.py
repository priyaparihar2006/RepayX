"""Tracks which data/model artifacts the backend can use.

Phase 2 only checks that each artifact file exists. Later phases load the
artifacts once at startup and record a failed load as unavailable.
"""

from __future__ import annotations

import logging
from enum import Enum
from pathlib import Path

from api.errors import ServiceUnavailableError
from config import Settings

logger = logging.getLogger(__name__)


class Resource(str, Enum):
    CUSTOMER_DATA = "customer_data"
    MODEL = "model"
    TFIDF_VECTORIZER = "tfidf_vectorizer"
    TFIDF_MATRIX = "tfidf_matrix"


class ResourceStatus(str, Enum):
    AVAILABLE = "available"
    MISSING = "missing"


_UNAVAILABLE_MESSAGES = {
    Resource.CUSTOMER_DATA: "Customer data is not available.",
    Resource.MODEL: "The risk model is not available.",
    Resource.TFIDF_VECTORIZER: "Retrieval artifacts are not available.",
    Resource.TFIDF_MATRIX: "Retrieval artifacts are not available.",
}


class ResourceRegistry:
    def __init__(self, settings: Settings) -> None:
        self._paths: dict[Resource, Path] = {
            Resource.CUSTOMER_DATA: settings.customer_data_path,
            Resource.MODEL: settings.model_path,
            Resource.TFIDF_VECTORIZER: settings.tfidf_vectorizer_path,
            Resource.TFIDF_MATRIX: settings.tfidf_matrix_path,
        }
        self._status: dict[Resource, ResourceStatus] = {}

    def refresh(self) -> None:
        for resource, path in self._paths.items():
            status = ResourceStatus.AVAILABLE if path.is_file() else ResourceStatus.MISSING
            self._status[resource] = status
            if status is ResourceStatus.MISSING:
                # Paths are logged server-side only; they are never sent to clients.
                logger.warning("Resource %s not found at %s", resource.value, path)

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
