"""Start the API using API_HOST / API_PORT from the environment."""

import uvicorn
import env_loader
from config import get_settings

if __name__ == "__main__":
    env_loader.load_environment()
    settings = get_settings()
    uvicorn.run("api.main:app", host=settings.api_host, port=settings.api_port)
