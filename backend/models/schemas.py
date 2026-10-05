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


DISCLAIMER = (
    "RepayX provides model-based risk estimates for analytical and demonstration purposes. Risk scores are not "
    "guaranteed outcomes and should not be treated as a final lending decision."
)


class RiskCategoryCount(BaseModel):
    risk_category: RiskCategory
    customers: int
    share: float = Field(description="Percent of all scored customers.")


class PortfolioMetrics(BaseModel):
    total_customers: int
    risk_categories: list[RiskCategoryCount]
    average_risk_score: float | None
    median_risk_score: float | None
    average_default_probability: float | None = Field(description="Percent.")
    predicted_defaults: int
    predicted_default_share: float = Field(description="Percent of all scored customers.")


class RepaymentMetrics(BaseModel):
    customers_with_history: int
    customers_without_history: int
    average_late_payment_rate: float | None = Field(description="Percent; customers with a known late rate only.")
    customers_with_late_payments: int
    customers_with_late_payments_share: float = Field(description="Percent of customers with installment history.")
    customers_always_late: int = Field(description="Customers with a 100% late payment rate.")
    average_days_late: float | None
    average_underpaid_rate: float | None = Field(description="Percent.")
    customers_with_unpaid_amounts: int
    total_unpaid_amount: float
    average_payment_ratio: float | None


class HistogramBin(BaseModel):
    range: str
    min: int
    max: int
    customers: int


class LateRateBucket(BaseModel):
    bucket: str
    customers: int


class Segment(BaseModel):
    segment: str
    customers: int
    average_risk_score: float
    high_risk_share: float = Field(description="Percent of the segment in High Risk.")
    average_late_payment_rate: float | None = Field(description="Percent.")


class Segments(BaseModel):
    income_type: list[Segment]
    education: list[Segment]
    occupation: list[Segment]


class ModelEvaluation(BaseModel):
    roc_auc: float | None = Field(description="Percent, on the 20% holdout split.")
    accuracy: float | None = Field(description="Percent, at the classification threshold.")
    precision: float | None = Field(description="Percent, at the classification threshold.")
    recall: float | None = Field(description="Percent, at the classification threshold.")
    f1: float | None = Field(description="Percent, at the classification threshold.")
    holdout_customers: int | None
    note: str


class ModelInfo(BaseModel):
    model_version: str
    classification_threshold: float = Field(description="Probability (0-1) at or above which a default is predicted.")
    risk_band_medium_from: float
    risk_band_high_from: float
    risk_band_note: str
    evaluation: ModelEvaluation


class AnalyticsResponse(BaseModel):
    success: Literal[True] = True
    model_version: str | None
    portfolio: PortfolioMetrics
    repayment: RepaymentMetrics
    risk_score_histogram: list[HistogramBin]
    late_payment_rate_buckets: list[LateRateBucket]
    segments: Segments
    model: ModelInfo | None = Field(description="Null when the risk model is not loaded.")
    disclaimer: str = DISCLAIMER
