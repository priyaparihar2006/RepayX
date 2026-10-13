"""Provider webhooks. Every request is signature-verified before anything is parsed,
and every event id is recorded so replays are ignored."""

from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation
from urllib.parse import parse_qsl

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse, Response

from api.errors import APIError
from automation.inbound import handle_inbound
from automation.payments import update_payment
from automation.scheduler import JobActionError
from automation.service import AutomationService
from automation.util import utcnow
from automation.webhooks import (
    TWILIO_STATUS,
    StatusEvent,
    WebhookAuthError,
    already_seen,
    apply_status,
    parse_meta,
    verify_generic_signature,
    verify_mailgun_signature,
    verify_meta_signature,
    verify_twilio_signature,
)

logger = logging.getLogger("repayx.webhooks")
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
MAX_BODY = 1024 * 1024


def svc(request: Request) -> AutomationService:
    return request.app.state.automation


async def _body(request: Request) -> bytes:
    body = await request.body()
    if len(body) > MAX_BODY:
        raise APIError(413, "payload_too_large", "Webhook payload too large.")
    return body


def _unauthorized(exc: WebhookAuthError) -> APIError:
    logger.warning("Rejected webhook: %s", exc)
    return APIError(401, "invalid_signature", "Webhook signature verification failed.")


def _process_inbound(service: AutomationService, background: BackgroundTasks, provider: str, channel: str,
                     sender: str, text: str, message_id: str, subject: str | None = None) -> str:
    now = utcnow()
    with service.db.write() as conn:
        if already_seen(conn, provider, f"in:{message_id}", now):
            return "duplicate"
        result = handle_inbound(conn, service.config, service.policy.get(), channel, sender, text, now,
                                provider_message_id=message_id, subject=subject)
    if result.reply_text and result.reply_recipient:
        background.add_task(service.send_reply, channel, result.reply_recipient, result.reply_text,
                            result.customer_id, None, result.communication_id)
    return result.intent


def _process_status(service: AutomationService, provider: str, event: StatusEvent) -> str:
    now = utcnow()
    with service.db.write() as conn:
        if already_seen(conn, provider, f"st:{event.provider_message_id}:{event.status}", now):
            return "duplicate"
        return apply_status(conn, provider, event, now)


# ------------------------------------------------------------------ WhatsApp (Meta Cloud API)


@router.get("/whatsapp")
def whatsapp_verify(request: Request):
    """Meta's subscription handshake."""
    params = request.query_params
    token = svc(request).config.whatsapp_verify_token
    if params.get("hub.mode") == "subscribe" and token and params.get("hub.verify_token") == token:
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise APIError(403, "forbidden", "Verification failed.")


@router.post("/whatsapp")
async def whatsapp_events(request: Request, background: BackgroundTasks):
    service = svc(request)
    raw = await _body(request)
    try:
        verify_meta_signature(service.config.whatsapp_app_secret, raw, request.headers.get("x-hub-signature-256"))
    except WebhookAuthError as exc:
        raise _unauthorized(exc) from exc
    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise APIError(400, "invalid_json", "Body is not JSON.") from exc
    statuses, inbound = parse_meta(payload)
    results = {"statuses": [], "messages": []}
    for event in statuses:
        results["statuses"].append(_process_status(service, "meta_cloud", event))
    for msg in inbound:
        results["messages"].append(_process_inbound(service, background, "meta_cloud", "whatsapp",
                                                    msg.sender, msg.text, msg.provider_message_id))
    return {"success": True, **results}


# ------------------------------------------------------------------ SMS


@router.post("/sms")
async def sms_events(request: Request, background: BackgroundTasks):
    """Twilio (X-Twilio-Signature, form-encoded) or a signed generic JSON format
    (X-RepayX-Signature) for gateways without their own signing, e.g. via a relay."""
    service = svc(request)
    raw = await _body(request)
    if request.headers.get("x-twilio-signature") is not None:
        params = dict(parse_qsl(raw.decode("utf-8", errors="replace"), keep_blank_values=True))
        try:
            verify_twilio_signature(service.config.twilio_auth_token, service.config.twilio_webhook_url,
                                    params, request.headers.get("x-twilio-signature"))
        except WebhookAuthError as exc:
            raise _unauthorized(exc) from exc
        sid = params.get("MessageSid") or params.get("SmsSid")
        if not sid:
            raise APIError(400, "invalid_payload", "Missing MessageSid.")
        status = params.get("MessageStatus") or params.get("SmsStatus")
        if status and status != "received" and "Body" not in params:
            mapped = TWILIO_STATUS.get(status)
            if mapped is None:
                return {"success": True, "result": "ignored"}
            code = params.get("ErrorCode")
            outcome = _process_status(service, "twilio", StatusEvent(
                sid, mapped, f"twilio_{code}" if code else None, params.get("ErrorMessage"), code == "21610"))
            return {"success": True, "result": outcome}
        intent = _process_inbound(service, background, "twilio", "sms", params.get("From", ""),
                                  params.get("Body", ""), sid)
        # Empty TwiML: replies are sent through the API, not inline.
        return Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', media_type="text/xml",
                        headers={"X-RepayX-Intent": intent})

    try:
        verify_generic_signature(service.config.sms_webhook_secret, raw, request.headers.get("x-repayx-signature"),
                                 service.config.webhook_max_age_seconds)
    except WebhookAuthError as exc:
        raise _unauthorized(exc) from exc
    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise APIError(400, "invalid_json", "Body is not JSON.") from exc
    provider = str(payload.get("provider") or service.config.sms_provider or "sms")
    if payload.get("type") == "status":
        status = payload.get("status")
        if status not in ("accepted", "delivered", "failed") or not payload.get("provider_message_id"):
            raise APIError(422, "invalid_payload", "status events need provider_message_id and status.")
        outcome = _process_status(service, provider, StatusEvent(
            str(payload["provider_message_id"]), status, payload.get("error_code"), payload.get("error_message")))
        return {"success": True, "result": outcome}
    if payload.get("type") == "inbound":
        if not payload.get("from") or not payload.get("message_id"):
            raise APIError(422, "invalid_payload", "inbound events need from and message_id.")
        intent = _process_inbound(service, background, provider, "sms", str(payload["from"]),
                                  str(payload.get("text", "")), str(payload["message_id"]))
        return {"success": True, "result": intent}
    raise APIError(422, "invalid_payload", "type must be 'status' or 'inbound'.")


# ------------------------------------------------------------------ Email (Mailgun)


@router.post("/email")
async def email_events(request: Request, background: BackgroundTasks):
    """Mailgun event webhooks (JSON) and inbound routes (form), both HMAC-signed."""
    service = svc(request)
    raw = await _body(request)
    ctype = request.headers.get("content-type", "")
    max_age = service.config.webhook_max_age_seconds
    key = service.config.mailgun_webhook_signing_key
    if "application/json" in ctype:
        try:
            payload = json.loads(raw)
        except ValueError as exc:
            raise APIError(400, "invalid_json", "Body is not JSON.") from exc
        sig = payload.get("signature") or {}
        try:
            verify_mailgun_signature(key, str(sig.get("timestamp", "")), str(sig.get("token", "")),
                                     str(sig.get("signature", "")), max_age)
        except WebhookAuthError as exc:
            raise _unauthorized(exc) from exc
        data = payload.get("event-data") or {}
        message_id = ((data.get("message") or {}).get("headers") or {}).get("message-id")
        event = data.get("event")
        mapped = {"accepted": "accepted", "delivered": "delivered", "opened": "read", "failed": "failed"}.get(event)
        if not message_id or not mapped:
            return {"success": True, "result": "ignored"}
        if event == "failed" and data.get("severity") == "temporary":
            return {"success": True, "result": "ignored_temporary"}
        reason = (data.get("delivery-status") or {}).get("description") or data.get("reason")
        suppress = event == "failed" and data.get("reason") in ("bounce", "suppress-bounce", "suppress-unsubscribe")
        provider = "mailgun" if service.config.email_provider == "mailgun" else "smtp"
        outcome = _process_status(service, provider, StatusEvent(
            message_id.strip("<>"), mapped, f"mailgun_{data.get('reason')}" if event == "failed" else None,
            reason, suppress))
        return {"success": True, "result": outcome}

    form = await request.form()
    fields = {k: str(v) for k, v in form.items() if isinstance(v, str)}
    try:
        verify_mailgun_signature(key, fields.get("timestamp", ""), fields.get("token", ""),
                                 fields.get("signature", ""), max_age)
    except WebhookAuthError as exc:
        raise _unauthorized(exc) from exc
    message_id = fields.get("Message-Id") or fields.get("message-id") or fields.get("token")
    text = fields.get("stripped-text") or fields.get("body-plain") or ""
    intent = _process_inbound(service, background, "mailgun", "email", fields.get("sender", ""), text,
                              message_id, subject=fields.get("subject"))
    return {"success": True, "result": intent}


# ------------------------------------------------------------------ Payments


@router.post("/payments")
async def payment_events(request: Request):
    """Signed payment notifications from a payment system (generic HMAC format):
    {"event_id", "loan_id", "installment_number"?, "status", "amount_paid"?, "reference"?}"""
    service = svc(request)
    raw = await _body(request)
    try:
        verify_generic_signature(service.config.payment_webhook_secret, raw, request.headers.get("x-repayx-signature"),
                                 service.config.webhook_max_age_seconds)
    except WebhookAuthError as exc:
        raise _unauthorized(exc) from exc
    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise APIError(400, "invalid_json", "Body is not JSON.") from exc
    for f in ("event_id", "loan_id", "status"):
        if not payload.get(f):
            raise APIError(422, "invalid_payload", f"{f} is required.")
    amount = None
    if payload.get("amount_paid") is not None:
        try:
            amount = Decimal(str(payload["amount_paid"]))
        except InvalidOperation as exc:
            raise APIError(422, "invalid_payload", "amount_paid must be numeric.") from exc
    now = utcnow()
    try:
        with service.db.write() as conn:
            if already_seen(conn, "payments", str(payload["event_id"]), now):
                return {"success": True, "result": "duplicate"}
            emi = conn.execute("SELECT id FROM emis WHERE loan_id = ? AND installment_key = ?",
                               (str(payload["loan_id"]), str(payload.get("installment_number") or "current"))).fetchone()
            if emi is None:
                raise JobActionError(404, "not_found", "No EMI matches this loan.")
            result = update_payment(conn, emi["id"], str(payload["status"]), amount, "payment_webhook",
                                    "webhook:payments", service.policy.get(), now, payload.get("reference"))
    except JobActionError as exc:
        raise APIError(exc.status_code, exc.code, exc.message) from exc
    return {"success": True, "result": "applied", "reminders_cancelled": result.cancelled}
