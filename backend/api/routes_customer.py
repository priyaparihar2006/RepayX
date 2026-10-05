from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from api.dependencies import get_resources
from api.errors import NotImplementedYetError
from models.schemas import ErrorResponse, RiskCategory
from services.resources import Resource, ResourceRegistry

router = APIRouter(
    prefix="/api",
    tags=["customers"],
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)

CustomerId = Annotated[int, Path(gt=0, le=2_147_483_647, description="Numeric customer ID (SK_ID_CURR).")]


@router.get("/customer/{customer_id}", responses={404: {"model": ErrorResponse}})
def get_customer(customer_id: CustomerId, resources: ResourceRegistry = Depends(get_resources)):
    resources.require(Resource.CUSTOMER_DATA)
    raise NotImplementedYetError("Customer lookup is not implemented yet.")


@router.get("/customers")
def list_customers(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    risk_category: RiskCategory | None = None,
    search: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    resources: ResourceRegistry = Depends(get_resources),
):
    resources.require(Resource.CUSTOMER_DATA)
    raise NotImplementedYetError("Customer listing is not implemented yet.")
