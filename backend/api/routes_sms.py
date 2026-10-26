"""SMS Management and Safe Test API Routes for RepayX."""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field

from api.errors import APIError
from automation.auth import Principal, require
from services.sms_service import SMSService, SMSSettings

router = APIRouter(tags=["sms"])


def get_sms_service(request: Request) -> SMSService:
    if not hasattr(request.app.state, "sms"):
        request.app.state.sms = SMSService(
            settings=SMSSettings(),
            config=getattr(request.app.state, "automation", None).config if hasattr(request.app.state, "automation") else None,
        )
    return request.app.state.sms


class TestSmsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    recipient: str = Field(min_length=10, max_length=20)
    send_real: bool = False
    authorized: bool = False


@router.get("/api/automation/sms-test")
@router.get("/api/sms/status")
def sms_status(request: Request, _: Principal = require("admin")):
    """Returns SMS configuration status, readiness, and test history without exposing secrets."""
    sms = get_sms_service(request)
    cfg = sms.configuration()
    runs = sms.get_test_runs(limit=20)
    return {
        "success": True,
        **cfg,
        "runs": runs,
    }


@router.post("/api/automation/sms-test")
@router.post("/api/sms/test")
def send_test_sms(
    request: Request,
    body: TestSmsRequest,
    principal: Principal = require("admin"),
):
    """Executes a single, verified test SMS to an allowlisted test recipient."""
    sms = get_sms_service(request)
    result = sms.send_test_sms(
        recipient=body.recipient,
        send_real=body.send_real,
        authorized=body.authorized,
        request_id=str(body.request_id),
        actor=principal.name,
    )
    return result


@router.get("/api/sms/history")
def sms_history(
    request: Request,
    limit: int = 50,
    _: Principal = require("operator"),
):
    """Returns recent SMS message delivery attempts and test executions."""
    sms = get_sms_service(request)
    runs = sms.get_test_runs(limit=min(limit, 100))
    deliveries = sms.get_delivery_history(limit=min(limit, 100))
    return {
        "success": True,
        "runs": runs,
        "deliveries": deliveries,
    }
