"""RepayX application runner at repository root."""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.chdir(BACKEND_DIR)

if __name__ == "__main__":
    import uvicorn
    import env_loader
    from config import get_settings

    env_loader.load_environment()
    settings = get_settings()
    host = os.environ.get("HOST") or os.environ.get("API_HOST") or "0.0.0.0"
    port_str = os.environ.get("PORT") or os.environ.get("API_PORT") or str(settings.api_port) or "8000"
    port = int(port_str)
    print(f"Starting RepayX API (root runner) on {host}:{port}...")
    uvicorn.run("api.main:app", host=host, port=port)
