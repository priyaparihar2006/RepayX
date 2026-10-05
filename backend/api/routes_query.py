from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_resources
from api.errors import NotImplementedYetError
from models.schemas import ErrorResponse, QueryRequest
from services.resources import Resource, ResourceRegistry

router = APIRouter(
    prefix="/api",
    tags=["query"],
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)


@router.post("/query")
def run_query(request: QueryRequest, resources: ResourceRegistry = Depends(get_resources)):
    # Structured customer/aggregate/repayment queries only need customer data;
    # TF-IDF artifacts are required only for general retrieval (Phase 5).
    resources.require(Resource.CUSTOMER_DATA)
    raise NotImplementedYetError("Natural-language queries are not implemented yet.")
