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


class CustomerSummary(BaseModel):
    customer_id: int
    risk_score: float = Field(description="0-100; estimated default probability x 100.")
    default_probability: float = Field(description="Estimated default probability, percent (0-100).")
    risk_category: RiskCategory
    predicted_default: Literal[0, 1] = Field(description="1 if the estimate meets the classification threshold.")
    late_payment_rate: float | None = Field(description="Percent of paid installments paid late; null without history.")
    total_unpaid_amount: float | None
    payment_ratio: float | None = Field(description="Total paid / total due; 1.0 means paid in full.")


class CustomerDetail(CustomerSummary):
    annual_income: float | None
    credit_amount: float | None
    annuity_amount: float | None
    income_type: str | None
    education: str | None
    family_status: str | None
    occupation: str | None
    has_installment_history: bool
    installment_count: int | None
    late_payment_count: int | None
    avg_days_late: float | None
    max_days_late: float | None
    underpaid_count: int | None
    underpaid_rate: float | None = Field(description="Percent of installments underpaid.")
    total_installment_amount: float | None
    total_payment_amount: float | None


class CustomerResponse(BaseModel):
    success: Literal[True] = True
    model_version: str | None
    customer: CustomerDetail


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class CustomerListResponse(BaseModel):
    success: Literal[True] = True
    model_version: str | None
    customers: list[CustomerSummary]
    pagination: Pagination


QueryType = Literal["customer_query", "aggregate_query", "retrieval_query", "general_retrieval"]


class QueryCustomer(CustomerSummary):
    installment_count: int | None
    late_payment_count: int | None
    avg_days_late: float | None
    similarity: float | None = Field(default=None, description="TF-IDF cosine similarity (general retrieval only).")


class QueryMetric(BaseModel):
    name: str
    label: str
    value: float | int | None
    unit: str
    population: int = Field(description="Number of customers the value was computed over.")


class QueryResponse(BaseModel):
    success: Literal[True] = True
    query: str
    query_type: QueryType
    result: str = Field(description="Answer generated from the computed results.")
    model_version: str | None
    customer: CustomerDetail | None = None
    customers: list[QueryCustomer] | None = None
    metrics: list[QueryMetric] | None = None
    total_matches: int | None = None
    criteria: str | None = None
    not_found_ids: list[int] | None = None
