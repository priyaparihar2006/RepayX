"""RepayX FastAPI application.

Run from the backend/ directory:

    uvicorn api.main:app --reload
"""

from __future__ import annotations

import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
import env_loader  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    routes_analytics,
    routes_automation,
    routes_email_test,
    routes_customer,
    routes_health,
    routes_omnichannel,
    routes_query,
    routes_webhooks,
    routes_whatsapp,
)
from api.errors import register_error_handlers
from automation.service import AutomationService
from config import API_VERSION, Settings, get_settings
from services.omnichannel_service import OmnichannelService
from services.resources import ResourceRegistry
from services.whatsapp_service import WhatsAppService, WhatsAppSettings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app(settings: Settings | None = None, automation: AutomationService | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        import asyncio

        loop = asyncio.get_running_loop()
        orig_handler = loop.get_exception_handler()

        def _asyncio_exception_handler(l, context):
            exc = context.get("exception")
            if isinstance(exc, (ConnectionResetError, BrokenPipeError)):
                return
            if isinstance(exc, OSError) and getattr(exc, "winerror", None) == 10054:
                return
            if orig_handler:
                orig_handler(l, context)
            else:
                l.default_exception_handler(context)

        loop.set_exception_handler(_asyncio_exception_handler)

        # Artifacts are checked (and, in later phases, loaded) once per process.
        app.state.resources.refresh()
        # In production the worker runs as its own process (backend/worker.py).
        # SCHEDULER_EMBEDDED=true runs it inside the API for single-process local development.
        if app.state.automation.config.embedded_worker:
            app.state.automation.start_background()
        yield
        app.state.automation.stop()

    app = FastAPI(
        title="RepayX API",
        version=API_VERSION,
        description="Loan risk and recovery intelligence API.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.resources = ResourceRegistry(settings)
    app.state.whatsapp = WhatsAppService(WhatsAppSettings())
    app.state.omnichannel = OmnichannelService()
    app.state.automation = automation or AutomationService()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_origin_regex=settings.cors_allow_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
    register_error_handlers(app)

    @app.get("/")
    def root():
        return {
            "success": True,
            "name": "RepayX API",
            "version": API_VERSION,
            "status": "online",
            "documentation": "/docs",
            "health": "/api/health",
        }

    for router in (
        routes_health.router,
        routes_customer.router,
        routes_analytics.router,
        routes_query.router,
        routes_whatsapp.router,
        routes_omnichannel.router,
        routes_automation.router,
        routes_email_test.router,
        routes_webhooks.router,
    ):
        app.include_router(router)

    return app


app = create_app()
