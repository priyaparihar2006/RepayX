"""RepayX FastAPI application entrypoint.

Exposes `app` so both `uvicorn main:app` and `uvicorn api.main:app` succeed.
"""

from api.main import app, create_app

__all__ = ["app", "create_app"]
