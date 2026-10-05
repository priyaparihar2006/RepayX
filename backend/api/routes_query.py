from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_resources
from models.schemas import ErrorResponse, QueryRequest, QueryResponse
from services.resources import Resource, ResourceRegistry

router = APIRouter(
    prefix="/api",
    tags=["query"],
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)


@router.post("/query", response_model=QueryResponse, response_model_exclude_none=True)
def run_query(request: QueryRequest, resources: ResourceRegistry = Depends(get_resources)):
    """Answer a natural-language question about the portfolio.

    Routed to customer lookup, structured aggregate calculation, structured
    repayment retrieval, or TF-IDF retrieval (only general retrieval needs the
    TF-IDF index).
    """
    resources.require(Resource.CUSTOMER_DATA)
    return QueryResponse(**resources.query_service.answer(request.query))
