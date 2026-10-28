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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
    routes_sms,
)
from services.sms_service import SMSService, SMSSettings
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
    app.state.sms = SMSService(SMSSettings(), config=app.state.automation.config)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_origin_regex=settings.cors_allow_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
    register_error_handlers(app)

    @app.get("/api")
    def api_info():
        return {
            "success": True,
            "name": "RepayX API",
            "version": API_VERSION,
            "status": "online",
            "documentation": "/docs",
            "health": "/api/health",
        }

    @app.get("/health")
    def health_alias():
        return {
            "status": "ok",
            "service": "RepayX API",
            "version": API_VERSION,
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
        routes_sms.router,
        routes_webhooks.router,
    ):
        app.include_router(router)

    # Cloud Keep-Alive Supervisor
    def _start_keepalive() -> None:
        import os
        if os.getenv("PYTEST_CURRENT_TEST"):
            return
        import threading, time, urllib.request
        def _loop() -> None:
            time.sleep(20)
            targets = [
                "https://repayx-backend.onrender.com/health",
                "https://repayx-whatsapp-bridge.onrender.com/status",
            ]
            while True:
                for url in targets:
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": "RepayX-KeepAlive/1.0"})
                        with urllib.request.urlopen(req, timeout=15):
                            pass
                    except Exception:
                        pass
                time.sleep(480)
        threading.Thread(target=_loop, daemon=True, name="RepayXKeepAliveSupervisor").start()

    _start_keepalive()

    # Serve production frontend SPA if built
    frontend_dist = BACKEND_DIR.parent / "frontend" / "dist"
    if not frontend_dist.exists():
        frontend_dist = Path("/app/frontend/dist")

    if frontend_dist.exists() and (frontend_dist / "index.html").is_file():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/")
        async def serve_root():
            return FileResponse(frontend_dist / "index.html")

        def _get_routes():
            routes = []
            for r in app.routes:
                if hasattr(r, "path"):
                    routes.append(r)
                elif hasattr(r, "original_router") and hasattr(r.original_router, "routes"):
                    routes.extend(r.original_router.routes)
            return routes

        @app.get("/{full_path:path}")
        async def serve_spa(request: Request, full_path: str):
            if full_path.startswith("api/") or full_path == "api":
                normalized = f"/{full_path}"
                for route in _get_routes():
                    path = getattr(route, "path", None)
                    if path == normalized:
                        methods = getattr(route, "methods", set())
                        if "GET" in methods and getattr(route, "endpoint", None) != serve_spa:
                            import inspect
                            if inspect.iscoroutinefunction(route.endpoint):
                                return await route.endpoint()
                            return route.endpoint()
                        elif "GET" not in methods:
                            raise HTTPException(status_code=405, detail="Method Not Allowed")
                raise HTTPException(status_code=404, detail="Not Found")
            target_file = frontend_dist / full_path
            if target_file.is_file():
                return FileResponse(target_file)
            return FileResponse(frontend_dist / "index.html")
    else:
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

    return app


app = create_app()
