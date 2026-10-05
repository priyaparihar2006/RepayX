"""FastAPI dependencies for objects created once at startup."""

from __future__ import annotations

from fastapi import Request

from services.customer_service import CustomerService
from services.resources import Resource, ResourceRegistry


def get_resources(request: Request) -> ResourceRegistry:
    return request.app.state.resources


def require_customers(resources: ResourceRegistry) -> CustomerService:
    """Call inside a route body (not as a dependency) so input validation errors take precedence."""
    resources.require(Resource.CUSTOMER_DATA)
    return resources.customers
