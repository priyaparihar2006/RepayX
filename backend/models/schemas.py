"""Request and response schemas shared by the API routes."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RiskCategory = Literal["Low Risk", "Medium Risk", "High Risk"]
ResourceState = Literal["available", "missing", "invalid"]

MAX_QUERY_LENGTH = 500


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorInfo(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorInfo


class ResourcesStatus(BaseModel):
    customer_data: ResourceState
    model: ResourceState
    tfidf_vectorizer: ResourceState
    tfidf_matrix: ResourceState


class HealthResponse(BaseModel):
    success: Literal[True] = True
    status: Literal["ok", "degraded"]
    version: str
    model_version: str | None = None
    resources: ResourcesStatus


class QueryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=MAX_QUERY_LENGTH)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Query must not be empty.")
        return stripped
