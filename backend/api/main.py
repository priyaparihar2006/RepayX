"""RepayX FastAPI application.

Run from the backend/ directory:

    uvicorn api.main:app --reload
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import routes_analytics, routes_customer, routes_health, routes_query
from api.errors import register_error_handlers
from config import API_VERSION, Settings, get_settings
from services.resources import ResourceRegistry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Artifacts are checked (and, in later phases, loaded) once per process.
        app.state.resources.refresh()
        yield

    app = FastAPI(
        title="RepayX API",
        version=API_VERSION,
        description="Loan risk and recovery intelligence API.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.resources = ResourceRegistry(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    register_error_handlers(app)

    for router in (routes_health.router, routes_customer.router, routes_analytics.router, routes_query.router):
        app.include_router(router)

    return app


app = create_app()
