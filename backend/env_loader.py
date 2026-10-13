"""Consistent environment loading for RepayX backend and workers."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from dotenv import dotenv_values, load_dotenv

logger = logging.getLogger("repayx.env")

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent


def load_environment(override_empty: bool = True) -> Path | None:
    """Load environment variables from the repository root .env (or candidate paths).

    Candidate resolution order:
    1. REPO_ROOT / ".env"
    2. BACKEND_DIR / ".env"
    3. Path.cwd() / ".env"

    If a variable is set in the shell with a non-empty value, the shell value takes precedence.
    If a variable is unset or empty in the shell, the value from .env is loaded.
    """
    candidates = [
        REPO_ROOT / ".env",
        BACKEND_DIR / ".env",
        Path.cwd() / ".env",
    ]
    seen = set()
    for env_path in candidates:
        resolved = env_path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if env_path.is_file():
            # Standard load_dotenv with override=False preserves non-empty shell environment
            load_dotenv(env_path, override=False)

            # If override_empty is True, ensure that empty shell variables don't mask valid .env secrets
            if override_empty:
                file_values = dotenv_values(env_path)
                for key, val in file_values.items():
                    if val is not None and val.strip():
                        current = os.environ.get(key)
                        if current is None or not current.strip():
                            os.environ[key] = val.strip()

            return env_path
    return None


# Proactively load on import so any module importing env_loader gets environment ready
load_environment()

