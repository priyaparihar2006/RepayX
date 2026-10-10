from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

from services.customer_service import CustomerService
from services.nlp_document_parser import NLPDocumentParser
from services.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


def service(request: Request) -> WhatsAppService:
    return request.app.state.whatsapp


def get_customer_service(request: Request) -> CustomerService | None:
    return request.app.state.resources.customers


class PairRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone_number: str = Field(default="+918650629360")
    user_name: str = Field(default="RepayX Collections Hub")
    device: str = Field(default="WhatsApp Web (Chrome / Windows)")


class PairCodeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: str = Field(default="+918650629360")


class SendSingleMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipient: str = Field(min_length=8, max_length=20)
    message: str = Field(min_length=1, max_length=2000)
    customer_id: int | None = None
    customer_name: str | None = None
    template_name: str = "custom"
    request_id: str | None = None


class AutoDispatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    target_tier: Literal["all", "high", "medium", "unpaid_only"] = "high"
    tier: str | None = None
    template_id: str = "urgent_settlement"
    custom_body: str | None = None
    customer_ids: list[int] | None = None
    limit: int = Field(default=50, ge=1, le=500)


class IncomingMessageWebhook(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: str
    message: str
    jid: str | None = None
    timestamp: str | None = None


@router.get("/status")
def status(messaging: WhatsAppService = Depends(service)):
    return {"success": True, **messaging.configuration()}


@router.post("/qr/generate")
def generate_qr(messaging: WhatsAppService = Depends(service)):
    result = messaging.generate_qr()
    return {"success": True, **result}


@router.post("/pair-code")
def pair_code(body: PairCodeRequest, messaging: WhatsAppService = Depends(service)):
    result = messaging.pair_by_code(phone=body.phone)
    return {"success": True, **result}


@router.post("/disconnect")
def disconnect(messaging: WhatsAppService = Depends(service)):
    result = messaging.disconnect()
    return {"success": True, **result}


@router.get("/templates")
def templates(messaging: WhatsAppService = Depends(service)):
    return {"success": True, "templates": messaging.templates()}


@router.get("/loan-emi-data")
def loan_emi_data(
    risk_tier: Literal["all", "high", "medium", "unpaid_only"] = "all",
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    messaging: WhatsAppService = Depends(service),
):
    result = messaging.get_loan_emi_data(search=search, risk_tier=risk_tier, page=page, page_size=page_size)
    return {"success": True, **result}


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
):
    tier = body.tier or body.target_tier or "high"
    if tier not in ["all", "high", "medium", "unpaid_only"]:
        tier = "high"
    result = messaging.ai_auto_outreach(target_tier=tier, limit=body.limit)
    return {"success": True, **result}


@router.post("/ai-auto-outreach")
def ai_auto_outreach(
    body: AutoDispatchRequest,
    messaging: WhatsAppService = Depends(service),
):
    tier = body.tier or body.target_tier or "high"
    if tier not in ["all", "high", "medium", "unpaid_only"]:
        tier = "high"
    result = messaging.ai_auto_outreach(target_tier=tier, limit=body.limit)
    return {"success": True, **result}


@router.post("/webhook/incoming")
def incoming_webhook(body: IncomingMessageWebhook, request: Request, messaging: WhatsAppService = Depends(service)):
    # Sync with omnichannel architecture
    if hasattr(request.app.state, "omnichannel"):
        try:
            omni_res = request.app.state.omnichannel.handle_inbound_message(
                channel="WhatsApp",
                sender=body.phone,
                content=body.message,
                provider_message_id=body.jid,
            )
            if omni_res.get("ai_replied") and omni_res.get("reply_text"):
                return {
                    "success": True,
                    "auto_reply": True,
                    "reply": omni_res["reply_text"],
                    "reply_text": omni_res["reply_text"],
                    "intent": omni_res.get("intent"),
                    "human_handoff": omni_res.get("human_handoff"),
                }
        except Exception as exc:
            pass
    result = messaging.handle_incoming_ai_chat(phone=body.phone, message_text=body.message)
    return result


@router.post("/ai-chat-reply")
def ai_chat_reply(body: IncomingMessageWebhook, request: Request, messaging: WhatsAppService = Depends(service)):
    if hasattr(request.app.state, "omnichannel"):
        try:
            omni_res = request.app.state.omnichannel.handle_inbound_message(
                channel="WhatsApp",
                sender=body.phone,
                content=body.message,
                provider_message_id=body.jid,
            )
            if omni_res.get("ai_replied") and omni_res.get("reply_text"):
                return {
                    "success": True,
                    "auto_reply": True,
                    "reply": omni_res["reply_text"],
                    "reply_text": omni_res["reply_text"],
                    "intent": omni_res.get("intent"),
                    "human_handoff": omni_res.get("human_handoff"),
                }
        except Exception:
            pass
    result = messaging.handle_incoming_ai_chat(phone=body.phone, message_text=body.message)
    return result


@router.get("/download/json")
def download_json(messaging: WhatsAppService = Depends(service)):
    file_path = messaging.settings.loan_emi_json
    if not file_path.exists():
        return Response(status_code=404, content="File not found")
    return FileResponse(
        path=str(file_path),
        filename="users_loan_emi_data.json",
        media_type="application/json",
    )


@router.get("/download/csv")
def download_csv(messaging: WhatsAppService = Depends(service)):
    file_path = messaging.settings.loan_emi_csv
    if not file_path.exists():
        return Response(status_code=404, content="File not found")
    return FileResponse(
        path=str(file_path),
        filename="users_loan_emi_data.csv",
        media_type="text/csv",
    )


@router.get("/download/env")
def download_env(messaging: WhatsAppService = Depends(service)):
    file_path = messaging.settings.loan_emi_env
    if not file_path.exists():
        return Response(status_code=404, content="File not found")
    return FileResponse(
        path=str(file_path),
        filename="repayx_whatsapp_config.env",
        media_type="text/plain",
    )


@router.get("/messages")
def messages(messaging: WhatsAppService = Depends(service)):
    return {"success": True, **messaging.history()}


@router.get("/contacts")
def contacts(messaging: WhatsAppService = Depends(service)):
    return {"success": True, "contacts": messaging.contacts()}


class DispatchExtractedRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    records: list[dict[str, Any]]


@router.post("/upload-defaulters-file")
async def upload_defaulters_file(
    file: UploadFile = File(...),
    auto_send: bool = Query(default=False),
    messaging: WhatsAppService = Depends(service),
):
    content_bytes = await file.read()
    filename = file.filename or "uploaded_file"
    records = NLPDocumentParser.parse_file(filename, content_bytes)

    dispatched_results = []
    if auto_send and records:
        for r in records:
            res = messaging.send(
                recipient=r.get("phone", "+918650629360"),
                message_text=r.get("generated_message", ""),
                customer_id=r.get("customer_id") if isinstance(r.get("customer_id"), int) else None,
                customer_name=r.get("customer_name"),
                template_name="nlp_file_extracted_due_notice",
            )
            dispatched_results.append({**res, "customer_name": r.get("customer_name")})

    return {
        "success": True,
        "filename": filename,
        "extracted_count": len(records),
        "records": records,
        "auto_sent": auto_send,
        "dispatched_count": len(dispatched_results),
        "dispatched_results": dispatched_results,
    }


@router.post("/dispatch-extracted")
def dispatch_extracted(
    body: DispatchExtractedRequest,
    messaging: WhatsAppService = Depends(service),
):
    dispatched = []
    for r in body.records:
        recipient = r.get("phone") or r.get("phone_number") or "+918650629360"
        msg = r.get("generated_message") or r.get("message_text") or (
            f"Dear {r.get('customer_name', 'Customer')}, your loan #{r.get('customer_id', '')} "
            f"has an overdue EMI balance of ₹{r.get('emi_left_to_repay', r.get('unpaid_amount', 0)):,.2f}. "
            f"Last date to pay: {r.get('last_date_to_pay', 'Immediate')}. Pay here: {r.get('payment_link', '')}"
        )
        res = messaging.send(
            recipient=recipient,
            message_text=msg,
            customer_id=r.get("customer_id") if isinstance(r.get("customer_id"), int) else None,
            customer_name=r.get("customer_name"),
            template_name="nlp_file_extracted_due_notice",
        )
        dispatched.append({**res, "customer_name": r.get("customer_name")})

    return {
        "success": True,
        "dispatched_count": len(dispatched),
        "dispatched": dispatched,
    }


# ============================================================================
# CSV-BASED INDIVIDUAL PER-CUSTOMER SCHEDULING ENDPOINTS
# ============================================================================

class ConfirmScheduleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    records: list[dict[str, Any]]
    campaign_id: str = Field(default="default")


class UpdateScheduleTimeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    schedule_id: str
    scheduled_message_time: str | None = None
    target_date: str | None = None
    timezone: str | None = None


@router.post("/scheduled/preview-csv")
async def scheduled_preview_csv(
    file: UploadFile = File(...),
    target_date: str | None = Query(default=None),
    campaign_id: str = Query(default="default"),
    messaging: WhatsAppService = Depends(service),
):
    """Parses uploaded CSV, normalizes empty fields to null, and validates individual schedules."""
    content_bytes = await file.read()
    filename = file.filename or "uploaded_customers.csv"

    preview = messaging.scheduler.parse_csv_content(
        content_text_or_bytes=content_bytes,
        target_date_str=target_date,
        campaign_id=campaign_id,
    )

    return {
        **preview,
        "filename": filename,
    }


@router.post("/scheduled/confirm-schedule")
def scheduled_confirm_schedule(
    body: ConfirmScheduleRequest,
    messaging: WhatsAppService = Depends(service),
):
    """Persists confirmed customer schedules to SQLite.

    Idempotent: preserves already-sent messages without re-sending.
    """
    res = messaging.scheduler.save_confirmed_schedules(
        records=body.records,
        campaign_id=body.campaign_id,
    )
    return res


@router.get("/scheduled/list")
def scheduled_list(
    campaign_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    messaging: WhatsAppService = Depends(service),
):
    """Retrieves paginated schedules and current scheduling statistics."""
    return messaging.scheduler.get_schedules(
        campaign_id=campaign_id,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.put("/scheduled/update-time")
def scheduled_update_time(
    body: UpdateScheduleTimeRequest,
    messaging: WhatsAppService = Depends(service),
):
    """Updates the scheduled message time for an individual customer."""
    try:
        res = messaging.scheduler.update_schedule_time(
            schedule_id=body.schedule_id,
            scheduled_message_time=body.scheduled_message_time,
            target_date_str=body.target_date,
            timezone_str=body.timezone,
        )
        return res
    except ValueError as exc:
        return Response(status_code=400, content=str(exc))


@router.post("/scheduled/process-due")
def scheduled_process_due(
    messaging: WhatsAppService = Depends(service),
):
    """Manually triggers evaluation and execution of due scheduled messages."""
    return messaging.scheduler.process_due_jobs(messaging)


@router.get("/scheduled/download-validation-report")
def scheduled_download_validation_report(
    campaign_id: str | None = Query(default=None),
    format: str = Query(default="csv"),
    messaging: WhatsAppService = Depends(service),
):
    """Downloads the validation report of imported schedules in CSV or JSON format."""
    schedules_data = messaging.scheduler.get_schedules(campaign_id=campaign_id, page=1, page_size=1000)
    items = schedules_data.get("schedules", [])

    if format.lower() == "json":
        report_bytes = json.dumps(items, indent=2).encode("utf-8")
        return Response(
            content=report_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=repayx_validation_report_{campaign_id or 'all'}.json"},
        )

    # CSV report
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Customer ID", "Customer Name", "Phone Number", "Loan ID", "Unpaid Amount",
        "Due Date", "Days Past Due", "Payment Status", "Probability of Default",
        "Risk Category", "Scheduled Time", "Timezone", "Scheduled At", "Status",
        "Attempt Count", "Last Error",
    ])
    for it in items:
        writer.writerow([
            it.get("customer_id"),
            it.get("customer_name"),
            it.get("phone_number"),
            it.get("loan_id"),
            it.get("unpaid_amount"),
            it.get("due_date"),
            it.get("days_past_due"),
            it.get("payment_status"),
            it.get("probability_of_default"),
            it.get("risk_category"),
            it.get("scheduled_message_time") or "",
            it.get("timezone"),
            it.get("scheduled_message_at") or "",
            it.get("status"),
            it.get("attempt_count"),
            it.get("last_error") or "",
        ])

    csv_data = output.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=repayx_validation_report_{campaign_id or 'all'}.csv"},
    )

