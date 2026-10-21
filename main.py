"""RepayX application entrypoint at repository root.

Exposes `app` so running `uvicorn main:app` from the repo root works.
"""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api.main import app, create_app  # noqa: E402

__all__ = ["app", "create_app"]
