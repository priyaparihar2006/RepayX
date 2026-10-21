"""Start the API using API_HOST / PORT / API_PORT from the environment."""

import os
import uvicorn
import env_loader
from config import get_settings

if __name__ == "__main__":
    env_loader.load_environment()
    settings = get_settings()
    host = os.environ.get("HOST") or os.environ.get("API_HOST") or "0.0.0.0"
    port_str = os.environ.get("PORT") or os.environ.get("API_PORT") or str(settings.api_port) or "8000"
    port = int(port_str)
    print(f"Starting RepayX API on {host}:{port}...")
    uvicorn.run("api.main:app", host=host, port=port)
