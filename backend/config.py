"""Backend configuration, read from environment variables with local-development defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent

API_VERSION = "0.1.0"


def _path_from_env(name: str, default: Path) -> Path:
    value = os.getenv(name)
    if not value:
        return default
    path = Path(value)
    return path if path.is_absolute() else (REPO_ROOT / path)


def _origins_from_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    api_host: str = field(default_factory=lambda: os.getenv("API_HOST", "127.0.0.1"))
    api_port: int = field(default_factory=lambda: int(os.getenv("API_PORT", "8000")))
    cors_allowed_origins: list[str] = field(
        default_factory=lambda: _origins_from_env(
            "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        )
    )

    # Artifact locations. These are internal only and must never be returned by the API.
    customer_data_path: Path = field(
        default_factory=lambda: _path_from_env(
            "CUSTOMER_DATA_PATH", BACKEND_DIR / "data" / "customer_data.parquet"
        )
    )
    model_path: Path = field(
        default_factory=lambda: _path_from_env("MODEL_PATH", REPO_ROOT / "models" / "repayx_model.joblib")
    )
    model_metadata_path: Path = field(
        default_factory=lambda: _path_from_env(
            "MODEL_METADATA_PATH", REPO_ROOT / "models" / "repayx_model.metadata.json"
        )
    )
    tfidf_vectorizer_path: Path = field(
        default_factory=lambda: _path_from_env(
            "TFIDF_VECTORIZER_PATH", BACKEND_DIR / "rag" / "tfidf_vectorizer.joblib"
        )
    )
    tfidf_matrix_path: Path = field(
        default_factory=lambda: _path_from_env(
            "TFIDF_MATRIX_PATH", BACKEND_DIR / "rag" / "customer_tfidf_matrix.npz"
        )
    )
    tfidf_ids_path: Path = field(
        default_factory=lambda: _path_from_env("TFIDF_IDS_PATH", BACKEND_DIR / "rag" / "customer_tfidf_ids.npy")
    )
    tfidf_metadata_path: Path = field(
        default_factory=lambda: _path_from_env(
            "TFIDF_METADATA_PATH", BACKEND_DIR / "rag" / "tfidf_index.metadata.json"
        )
    )


def get_settings() -> Settings:
    return Settings()
