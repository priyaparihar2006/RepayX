"""FastAPI dependencies for objects created once at startup."""

from __future__ import annotations

from fastapi import Request

from services.resources import ResourceRegistry


def get_resources(request: Request) -> ResourceRegistry:
    return request.app.state.resources
