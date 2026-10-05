from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_resources
from api.errors import NotImplementedYetError
from models.schemas import ErrorResponse
from services.resources import Resource, ResourceRegistry

router = APIRouter(prefix="/api", tags=["analytics"], responses={503: {"model": ErrorResponse}})


@router.get("/analytics")
def get_analytics(resources: ResourceRegistry = Depends(get_resources)):
    resources.require(Resource.CUSTOMER_DATA)
    raise NotImplementedYetError("Portfolio analytics are not implemented yet.")
