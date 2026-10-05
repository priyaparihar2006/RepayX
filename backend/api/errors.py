"""API error types and handlers.

Every error response uses the same envelope:

    {"success": false, "error": {"code": "...", "message": "...", "details": [...]?}}

Handlers never include stack traces, exception text, or filesystem paths.
"""

from __future__ import annotations

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class ServiceUnavailableError(APIError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(HTTPStatus.SERVICE_UNAVAILABLE, code, message)


def error_body(code: str, message: str, details: list[dict] | None = None) -> dict:
    error: dict = {"code": code, "message": message}
    if details:
        error["details"] = details
    return {"success": False, "error": error}


async def _api_error_handler(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))


async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    try:
        phrase = HTTPStatus(exc.status_code).phrase
    except ValueError:
        phrase = "Error"
    code = phrase.lower().replace(" ", "_").replace("-", "_")
    message = exc.detail if isinstance(exc.detail, str) else phrase
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, message),
        headers=getattr(exc, "headers", None),
    )


def _field_name(err: dict) -> str:
    if err.get("type") == "json_invalid":
        return "body"
    return ".".join(str(part) for part in err.get("loc", ()) if part != "body") or "body"


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Report where and why validation failed, but do not echo the submitted input back.
    details = [{"field": _field_name(err), "message": err.get("msg", "")} for err in exc.errors()]
    return JSONResponse(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        content=error_body("validation_error", "The request is invalid.", details),
    )


async def _unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        content=error_body("internal_error", "An unexpected error occurred."),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(APIError, _api_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(Exception, _unhandled_error_handler)
