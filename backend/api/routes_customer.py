from __future__ import annotations

from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from api.dependencies import get_resources, require_customers
from api.errors import APIError
from models.schemas import CustomerListResponse, CustomerResponse, ErrorResponse, Pagination, RiskCategory
from services.customer_service import SortField, SortOrder
from services.resources import ResourceRegistry

router = APIRouter(
    prefix="/api",
    tags=["customers"],
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)

CustomerId = Annotated[int, Path(gt=0, le=2_147_483_647, description="Numeric customer ID (SK_ID_CURR).")]


@router.get("/customer/{customer_id}", response_model=CustomerResponse, responses={404: {"model": ErrorResponse}})
def get_customer(customer_id: CustomerId, resources: ResourceRegistry = Depends(get_resources)):
    customers = require_customers(resources)
    customer = customers.get(customer_id)
    if customer is None:
        raise APIError(HTTPStatus.NOT_FOUND, "customer_not_found", f"Customer {customer_id} was not found.")
    return CustomerResponse(model_version=customers.model_version, customer=customer)


@router.get("/customers", response_model=CustomerListResponse)
def list_customers(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    risk_category: RiskCategory | None = None,
    search: Annotated[str | None, Query(min_length=1, max_length=10, pattern=r"^\d+$",
                                        description="Customer ID or ID prefix (digits only).")] = None,
    sort_by: SortField = "risk_score",
    sort_order: SortOrder = "desc",
    resources: ResourceRegistry = Depends(get_resources),
):
    customers = require_customers(resources)
    result = customers.list(
        page=page, page_size=page_size, risk_category=risk_category, search=search, sort_by=sort_by, sort_order=sort_order
    )
    return CustomerListResponse(
        model_version=customers.model_version,
        customers=result.items,
        pagination=Pagination(page=result.page, page_size=result.page_size, total=result.total, total_pages=result.total_pages),
    )
