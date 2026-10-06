from __future__ import annotations

import hmac
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.errors import APIError
from services.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


def service(request: Request) -> WhatsAppService:
    return request.app.state.whatsapp


def operator(request: Request, authorization: str | None = Header(default=None)) -> WhatsAppService:
    messaging = service(request)
    messaging.authorize(authorization)
    return messaging


class SendMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    recipient: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    template: str = Field(pattern=r"^[a-z0-9_]{1,512}$")
    language: str = Field(pattern=r"^[a-z]{2,3}(?:_[A-Z]{2})?$")
    parameters: list[Annotated[str, Field(min_length=1, max_length=1024)]] = Field(default_factory=list, max_length=20)
    preview: str = Field(min_length=1, max_length=20000)
    confirm_send: Literal[True]

    @field_validator("parameters")
    @classmethod
    def not_blank(cls, values):
        if any(not v.strip() for v in values):
            raise ValueError("Template parameters must not be blank.")
        return values


@router.get("/status")
def status(messaging: WhatsAppService = Depends(service)):
    return {"success": True, **messaging.configuration()}


@router.get("/contacts")
def contacts(messaging: WhatsAppService = Depends(operator)):
    return {"success": True, "contacts": messaging.contacts()}


@router.get("/templates")
def templates(messaging: WhatsAppService = Depends(operator)):
    return {"success": True, "templates": messaging.templates()}


@router.get("/messages")
def messages(messaging: WhatsAppService = Depends(operator)):
    return {"success": True, **messaging.history()}


@router.post("/messages")
def send(body: SendMessage, messaging: WhatsAppService = Depends(operator)):
    result = messaging.send(str(body.request_id), body.recipient, body.template, body.language, body.parameters, body.preview)
    return {"success": True, **result}


@router.get("/webhook", response_class=PlainTextResponse)
def verify(request: Request, messaging: WhatsAppService = Depends(service)):
    params = request.query_params
    token = messaging.settings.verify_token
    if not token or params.get("hub.mode") != "subscribe" or not hmac.compare_digest(params.get("hub.verify_token", "").encode(), token.encode()):
        raise APIError(403, "verification_failed", "Webhook verification failed.")
    return params.get("hub.challenge", "")


@router.post("/webhook")
async def webhook(request: Request, messaging: WhatsAppService = Depends(service)):
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 1024 * 1024:
            raise APIError(413, "payload_too_large", "Webhook payload exceeds the size limit.")
    messaging.webhook(bytes(data), request.headers.get("x-hub-signature-256", ""))
    return {"success": True}
