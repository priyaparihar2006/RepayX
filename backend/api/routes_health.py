from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_resources
from config import API_VERSION
from models.schemas import HealthResponse
from services.resources import ResourceRegistry, ResourceStatus

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(resources: ResourceRegistry = Depends(get_resources)) -> HealthResponse:
    statuses = resources.status()
    all_available = all(status is ResourceStatus.AVAILABLE for status in statuses.values())
    return HealthResponse(
        status="ok" if all_available else "degraded",
        version=API_VERSION,
        resources=statuses,
    )
