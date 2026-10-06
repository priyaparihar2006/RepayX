from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from services.customer_service import CustomerService
from services.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


def service(request: Request) -> WhatsAppService:
    return request.app.state.whatsapp


def get_customer_service(request: Request) -> CustomerService | None:
    return request.app.state.resources.customers


class PairRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone_number: str = Field(default="+919820154321")
    user_name: str = Field(default="RepayX Collections Hub")
    device: str = Field(default="WhatsApp Web (Chrome / Windows)")


class PairCodeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pairing_code: str = Field(default="12345678")
    phone_number: str = Field(default="+919820154321")
    user_name: str = Field(default="RepayX Collections Hub")
    device: str = Field(default="WhatsApp Mobile (Linked Device)")


class SendSingleMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipient: str = Field(min_length=8, max_length=20)
    message: str = Field(min_length=1, max_length=2000)
    customer_id: int | None = None
    customer_name: str | None = None
    template_name: str = "custom"
    request_id: str | None = None


class AutoDispatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_tier: Literal["all", "high", "medium", "unpaid_only"] = "high"
    template_id: str = "overdue_notice"
    custom_body: str | None = None
    customer_ids: list[int] | None = None
    limit: int = Field(default=50, ge=1, le=500)


@router.get("/status")
def status(messaging: WhatsAppService = Depends(service)):
    return {"success": True, **messaging.configuration()}


@router.get("/qr/generate")
@router.post("/qr/generate")
def generate_qr(messaging: WhatsAppService = Depends(service)):
    result = messaging.generate_qr()
    return {"success": True, **result}


@router.get("/qr/pair")
@router.post("/qr/pair")
def pair_device(
    phone_number: str | None = None,
    user_name: str | None = None,
    device: str | None = None,
    body: PairRequest | None = None,
    messaging: WhatsAppService = Depends(service),
):
    phone = (body.phone_number if body else None) or phone_number or "+919820154321"
    name = (body.user_name if body else None) or user_name or "RepayX Collections Hub"
    dev = (body.device if body else None) or device or "WhatsApp Web (Chrome / Windows)"
    session = messaging.pair_device(phone_number=phone, user_name=name, device=dev)
    return {"success": True, "session": session, "message": "WhatsApp device paired successfully."}


@router.get("/pair-code")
@router.post("/pair-code")
def pair_by_code(
    code: str | None = None,
    phone_number: str | None = None,
    body: PairCodeRequest | None = None,
    messaging: WhatsAppService = Depends(service),
):
    c = (body.pairing_code if body else None) or code or ""
    phone = (body.phone_number if body else None) or phone_number or "+919820154321"
    session = messaging.pair_by_code(pairing_code=c, phone_number=phone)
    return {"success": True, "session": session, "message": f"Device linked with phone {phone} successfully."}


@router.get("/qr/scan")
@router.post("/qr/scan")
def scan_qr_simulation(
    phone_number: str = Query(default="+919820154321"),
    messaging: WhatsAppService = Depends(service),
):
    session = messaging.pair_device(phone_number=phone_number, device="WhatsApp Scanner (Mobile)")
    return {"success": True, "session": session, "message": "QR Code scanned and paired successfully."}


@router.get("/disconnect")
@router.post("/disconnect")
def disconnect(messaging: WhatsAppService = Depends(service)):
    result = messaging.disconnect()
    return {"success": True, **result}


@router.get("/templates")
def templates(messaging: WhatsAppService = Depends(service)):
    return {"success": True, "templates": messaging.templates()}


@router.get("/defaulters")
def defaulters(
    risk_tier: Literal["all", "high", "medium", "unpaid_only"] = "all",
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    messaging: WhatsAppService = Depends(service),
    customers: CustomerService | None = Depends(get_customer_service),
):
    result = messaging.get_defaulters(
        customer_service=customers,
        risk_tier=risk_tier,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {"success": True, **result}


@router.post("/send")
def send_message(body: SendSingleMessage, messaging: WhatsAppService = Depends(service)):
    result = messaging.send(
        recipient=body.recipient,
        message_text=body.message,
        customer_id=body.customer_id,
        customer_name=body.customer_name,
        template_name=body.template_name,
        request_id=body.request_id,
    )
    return {"success": True, **result}


@router.post("/auto-dispatch")
def auto_dispatch(
    body: AutoDispatchRequest,
    messaging: WhatsAppService = Depends(service),
    customers: CustomerService | None = Depends(get_customer_service),
):
    result = messaging.auto_dispatch(
        customer_service=customers,
        target_tier=body.target_tier,
        template_id=body.template_id,
        custom_body=body.custom_body,
        customer_ids=body.customer_ids,
        limit=body.limit,
    )
    return {"success": True, **result}


@router.get("/messages")
def messages(messaging: WhatsAppService = Depends(service)):
    return {"success": True, **messaging.history()}


@router.get("/contacts")
def contacts(messaging: WhatsAppService = Depends(service)):
    return {"success": True, "contacts": messaging.contacts()}

