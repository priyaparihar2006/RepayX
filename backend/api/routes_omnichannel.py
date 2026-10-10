"""API Routes for RepayX Unified Omnichannel Platform."""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from services.omnichannel_models import ChannelType, utc_now_iso
from services.omnichannel_service import OmnichannelService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["omnichannel"])


def get_omnichannel_service(request: Request) -> OmnichannelService:
    if not hasattr(request.app.state, "omnichannel"):
        request.app.state.omnichannel = OmnichannelService()
    return request.app.state.omnichannel


# ---------------- Request & Response Models ----------------


class ManagerReplyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    channel: ChannelType = Field(default="WhatsApp")
    content: str = Field(min_length=1, max_length=5000)
    subject: str | None = None
    manager_name: str = "Priya Parihar (Manager)"


class AIToggleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ai_enabled: bool
    human_handoff: bool | None = None
    reason: str | None = None


class NewConversationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_id: str
    channel: ChannelType = "WhatsApp"
    content: str
    subject: str | None = None


class InboundWebhookPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    sender: str | None = None
    phone: str | None = None
    from_address: str | None = Field(default=None, alias="from")
    message: str | None = None
    text: str | None = None
    body: str | None = None
    subject: str | None = None
    recipient: str | None = None
    to: str | None = None
    id: str | None = None
    in_reply_to: str | None = None


class OptOutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    channel: ChannelType
    identifier: str
    customer_id: str | None = None
    reason: str = "MANUAL_MANAGER_OPTOUT"


# ---------------- API Endpoints ----------------


@router.get("/conversations")
def list_conversations(
    channel: str = Query(default="all", description="Channel filter: all, whatsapp, email, sms"),
    intent: str = Query(default="all", description="Intent filter: all, PAYMENT_PROMISE, etc."),
    search: str | None = Query(default=None, description="Search query by customer, loan ID, or text"),
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    convs = service.list_conversations(channel_filter=channel, intent_filter=intent, search=search)
    return {"success": True, "conversations": convs, "count": len(convs)}


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    conv = service.get_conversation_detail(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    return {"success": True, "conversation": conv}


@router.post("/conversations/{conversation_id}/messages")
def send_manager_reply(
    conversation_id: str,
    payload: ManagerReplyRequest,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    try:
        result = service.send_manager_reply(
            conversation_id=conversation_id,
            channel=payload.channel,
            content=payload.content,
            subject=payload.subject,
            manager_name=payload.manager_name,
        )
        return {"success": True, **result}
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except Exception as exc:
        logger.error("Failed to send manager reply: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to dispatch message")


@router.post("/conversations/{conversation_id}/ai-toggle")
def toggle_ai(
    conversation_id: str,
    payload: AIToggleRequest,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    result = service.toggle_ai_copilot(
        conversation_id=conversation_id,
        ai_enabled=payload.ai_enabled,
        human_handoff=payload.human_handoff,
        reason=payload.reason,
    )
    return {"success": True, **result}


@router.post("/conversations/new")
def create_outbound_conversation(
    payload: NewConversationRequest,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    customer = service.identity_service.resolve_customer(payload.channel, payload.customer_id)
    conv = service._get_or_create_conversation(
        customer=customer,
        channel=payload.channel,
        initial_text=payload.content,
        timestamp=utc_now_iso(),
    )
    res = service.send_manager_reply(
        conversation_id=conv["id"],
        channel=payload.channel,
        content=payload.content,
        subject=payload.subject,
    )
    return {"success": True, "conversation_id": conv["id"], **res}


# ---------------- Webhook Endpoints ----------------


@router.post("/webhooks/whatsapp")
def webhook_whatsapp(
    payload: InboundWebhookPayload,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    sender = payload.phone or payload.sender or payload.from_address or ""
    text = payload.message or payload.text or payload.body or ""
    if not sender or not text:
        raise HTTPException(status_code=422, detail="Missing sender or message content")

    res = service.handle_inbound_message(
        channel="WhatsApp",
        sender=sender,
        content=text,
        recipient=payload.to or payload.recipient or "+918650629360",
        provider_message_id=payload.id,
    )
    return res


@router.post("/webhooks/email")
def webhook_email(
    payload: InboundWebhookPayload,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    sender = payload.from_address or payload.sender or ""
    text = payload.text or payload.body or payload.message or ""
    if not sender or not text:
        raise HTTPException(status_code=422, detail="Missing email sender or body")

    res = service.handle_inbound_message(
        channel="Email",
        sender=sender,
        content=text,
        subject=payload.subject,
        recipient=payload.to or payload.recipient or "recovery@repayx.ai",
        provider_message_id=payload.id,
        thread_id=payload.in_reply_to,
    )
    return res


@router.post("/webhooks/sms")
def webhook_sms(
    payload: InboundWebhookPayload,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    sender = payload.phone or payload.sender or payload.from_address or ""
    text = payload.message or payload.text or payload.body or ""
    if not sender or not text:
        raise HTTPException(status_code=422, detail="Missing SMS sender or text")

    res = service.handle_inbound_message(
        channel="SMS",
        sender=sender,
        content=text,
        recipient=payload.to or payload.recipient or "REPAYX",
        provider_message_id=payload.id,
    )
    return res


# ---------------- Metrics & Opt-Outs ----------------


@router.get("/omnichannel/stats")
def omnichannel_stats(service: OmnichannelService = Depends(get_omnichannel_service)):
    return {"success": True, "stats": service.get_omnichannel_stats()}


@router.post("/omnichannel/opt-out")
def manage_opt_out(
    payload: OptOutRequest,
    service: OmnichannelService = Depends(get_omnichannel_service),
):
    service.identity_service.register_opt_out(
        customer_id=payload.customer_id,
        channel=payload.channel,
        identifier=payload.identifier,
        reason=payload.reason,
    )
    return {"success": True, "channel": payload.channel, "identifier": payload.identifier, "opted_out": True}
