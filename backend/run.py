"""Start the API using API_HOST / API_PORT from the environment."""

import uvicorn
from pathlib import Path
from dotenv import load_dotenv

from config import get_settings

if __name__ == "__main__":
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
    settings = get_settings()
    uvicorn.run("api.main:app", host=settings.api_host, port=settings.api_port)
