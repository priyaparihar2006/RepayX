from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_resources
from models.schemas import AnalyticsResponse, ErrorResponse
from services.repayx_engine import RiskModel
from services.resources import Resource, ResourceRegistry

router = APIRouter(prefix="/api", tags=["analytics"], responses={503: {"model": ErrorResponse}})


def _percent(value) -> float | None:
    return None if value is None else round(float(value) * 100, 2)


def _model_info(model: RiskModel | None) -> dict | None:
    if model is None:
        return None
    holdout = model.holdout_metrics or {}
    at_threshold = holdout.get("at_classification_threshold", {})
    return {
        "model_version": model.model_version,
        "classification_threshold": model.classification_threshold,
        "risk_band_medium_from": model.risk_bands.medium_from,
        "risk_band_high_from": model.risk_bands.high_from,
        "risk_band_note": "Prototype presentation bands on the 0-100 risk score; not validated lending thresholds.",
        "evaluation": {
            "roc_auc": _percent(holdout.get("roc_auc")),
            **{k: _percent(at_threshold.get(k)) for k in ("accuracy", "precision", "recall", "f1")},
            "holdout_customers": holdout.get("n"),
            "note": "Prototype evaluation on a held-out split recorded at training time; not a production validation.",
        },
    }


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(resources: ResourceRegistry = Depends(get_resources)):
    """Portfolio metrics, repayment statistics, and chart data computed from the scored customer data."""
    resources.require(Resource.CUSTOMER_DATA)
    return AnalyticsResponse(
        model_version=resources.customers.model_version,
        model=_model_info(resources.risk_model),
        **resources.analytics.portfolio_summary,
    )
