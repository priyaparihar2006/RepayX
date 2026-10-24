"""Reminder automation API: imports, reminders, payments, settings, health, and communications.

All routes require an API key (see automation/auth.py). Contact details are always
masked in responses; the dashboard never needs full phone numbers or emails.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Literal
import uuid
from automation.providers.base import OutboundMessage
from zoneinfo import ZoneInfo

from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from api.errors import APIError
from automation.auth import Principal, require
from automation.importer import ImportRejected
from automation.payments import reject_payment_claim, set_customer_hold, update_payment
from automation.scheduler import JobActionError, cancel_job, reconcile_all, reschedule_job, retry_job
from automation.service import AutomationService
from automation.util import csv_safe, iso, mask_email, mask_identifier, mask_phone, parse_iso, utcnow

router = APIRouter(prefix="/api", tags=["automation"])

JOB_STATUSES = ("pending", "processing", "retry", "completed", "partially_completed", "failed",
                "dead_letter", "cancelled", "skipped", "missed")


def svc(request: Request) -> AutomationService:
    return request.app.state.automation


def _page(page: int, page_size: int, total: int) -> dict:
    return {"page": page, "page_size": page_size, "total": total,
            "total_pages": max(1, (total + page_size - 1) // page_size)}


def _raise(exc: JobActionError) -> None:
    raise APIError(exc.status_code, exc.code, exc.message) from exc


def _customer_public(row) -> dict:
    return {
        "customer_id": row["customer_id"], "name": row["name"], "phone": mask_phone(row["phone"]),
        "email": mask_email(row["email"]), "timezone": row["timezone"],
        "preferred_language": row["preferred_language"], "consent_status": row["consent_status"],
        "channels": {c: bool(row[f"{c}_enabled"]) for c in ("whatsapp", "sms", "email")},
        "reminders_on_hold": bool(row["reminders_on_hold"]), "hold_reason": row["hold_reason"],
    }


def _emi_public(row) -> dict:
    outstanding = max(Decimal("0"), Decimal(row["emi_amount"]) - Decimal(row["amount_paid"]))
    return {
        "emi_id": row["id"], "customer_id": row["customer_id"], "loan_id": row["loan_id"],
        "installment": row["installment_key"], "emi_amount": row["emi_amount"], "amount_paid": row["amount_paid"],
        "outstanding": str(outstanding), "due_date": row["due_date"], "payment_status": row["payment_status"],
        "payment_status_source": row["payment_status_source"].split(":")[0],
        "payment_status_updated_at": row["payment_status_updated_at"],
        "payment_claim_pending": bool(row["payment_claim_pending"]),
        "reminder_date": row["reminder_date"], "reminder_time": row["reminder_time"],
        "reminder_datetime_utc": row["reminder_datetime_utc"], "channel_strategy": row["channel_strategy"],
    }


def _job_public(row, deliveries: list | None = None) -> dict:
    data = {k: row[k] for k in (
        "id", "emi_id", "customer_id", "loan_id", "reminder_type", "reminder_key", "due_date", "scheduled_at_utc",
        "run_at_utc", "timezone", "schedule_note", "status", "attempt_count", "next_retry_at", "outcome_reason",
        "last_error", "created_at", "updated_at", "completed_at")}
    data["manual_override"] = bool(row["manual_override"])
    data["channels"] = json.loads(row["channels_json"])
    data["channel_strategy"] = row["channel_strategy"]
    try:
        local = parse_iso(row["scheduled_at_utc"]).astimezone(ZoneInfo(row["timezone"]))
        data["scheduled_at_local"] = local.strftime(
            "%Y-%m-%d %H:%M:%S" if row["reminder_key"].startswith("exact:") else "%Y-%m-%d %H:%M")
    except Exception:
        data["scheduled_at_local"] = None
    if deliveries is not None:
        data["deliveries"] = [_delivery_public(d) for d in deliveries]
    data["display_status"] = _job_display_status(row["status"], data.get("deliveries", []))
    return data


def _job_display_status(status: str, deliveries: list[dict]) -> str:
    if status in ("pending", "processing", "retry", "cancelled", "skipped", "missed"):
        return "scheduled" if status == "pending" else status
    if any(d["status"] in ("unknown", "sending") for d in deliveries):
        return "unknown"
    if status == "completed" and deliveries:
        successful = [d for d in deliveries if d["status"] in ("accepted", "delivered", "read")]
        if successful and all(d["display_status"] == "simulated" for d in successful):
            return "simulated"
        if successful and all(d["status"] in ("delivered", "read") for d in successful):
            return "delivered"
        if successful:
            return "sent"
        return "failed"
    return status


def _delivery_public(d) -> dict:
    data = {k: d[k] for k in (
        "id", "channel", "status", "recipient", "provider", "provider_message_id", "attempt_count", "next_retry_at",
        "error_code", "error_message", "skip_reason", "accepted_at", "delivered_at", "read_at", "failed_at",
        "updated_at", "last_attempt_at")}
    data["display_status"] = "simulated" if d["provider"] == "sandbox" and d["status"] == "accepted" else d["status"]
    return data


# ====================================================================== imports


async def _read_upload(file: UploadFile, max_bytes: int) -> tuple[bytes, str]:
    name = file.filename or "upload.csv"
    try:
        if not name.lower().endswith(".csv"):
            raise APIError(415, "unsupported_file_type", "Upload a .csv file.")
        if file.content_type and file.content_type not in (
                "text/csv", "application/vnd.ms-excel", "text/plain", "application/csv", "application/octet-stream"):
            raise APIError(415, "unsupported_file_type", "Upload a CSV file (text/csv).")
        content = await file.read(max_bytes + 1)
        if len(content) > max_bytes:
            raise APIError(413, "file_too_large", f"The file exceeds the {max_bytes // (1024 * 1024)} MB limit.")
        return content, name
    finally:
        await file.close()  # removes the spooled temporary file


def _rejected(exc: ImportRejected) -> APIError:
    err = APIError(422, exc.code, exc.message)
    return err


@router.post("/imports/preview")
async def preview_import(
    request: Request,
    file: UploadFile = File(...),
    import_type: Literal["emi_reminders", "payment_updates"] = Form("emi_reminders"),
    _: Principal = require("operator"),
):
    service = svc(request)
    content, _name = await _read_upload(file, service.config.import_max_bytes)
    try:
        result = await run_in_threadpool(service.importer.preview, content, import_type)
    except ImportRejected as exc:
        raise _rejected(exc) from exc
    return {"success": True, **result}


@router.post("/imports/csv", status_code=201)
async def import_csv(
    request: Request,
    file: UploadFile = File(...),
    import_type: Literal["emi_reminders", "payment_updates"] = Form("emi_reminders"),
    mapping: str | None = Form(None),
    dry_run: bool = Form(False),
    principal: Principal = require("operator"),
):
    service = svc(request)
    content, name = await _read_upload(file, service.config.import_max_bytes)
    user_mapping = None
    if mapping:
        try:
            user_mapping = json.loads(mapping)
            if not isinstance(user_mapping, dict) or not all(
                    isinstance(k, str) and (v is None or isinstance(v, str)) for k, v in user_mapping.items()):
                raise ValueError
        except ValueError as exc:
            raise APIError(422, "invalid_mapping", "mapping must be a JSON object of field -> column name.") from exc
    try:
        summary = await run_in_threadpool(
            service.importer.run, content, name, principal.name, service.policy.get(), utcnow(),
            import_type, user_mapping, dry_run)
    except ImportRejected as exc:
        raise _rejected(exc) from exc



    return {"success": True, **summary.as_dict()}


@router.get("/imports")
def list_imports(request: Request, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                 _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        total = conn.execute("SELECT COUNT(*) FROM imports").fetchone()[0]
        rows = conn.execute("SELECT * FROM imports ORDER BY id DESC LIMIT ? OFFSET ?",
                            (page_size, (page - 1) * page_size)).fetchall()
    items = [{k: r[k] for k in r.keys() if k not in ("file_sha256", "mapping_json")} for r in rows]
    return {"success": True, "imports": items, "pagination": _page(page, page_size, total)}


@router.get("/imports/{import_id}")
def get_import(request: Request, import_id: int, severity: Literal["error", "warning"] | None = None,
               page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=500),
               _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        imp = conn.execute("SELECT * FROM imports WHERE id = ?", (import_id,)).fetchone()
        if imp is None:
            raise APIError(404, "not_found", "Import not found.")
        where, params = "WHERE import_id = ?", [import_id]
        if severity:
            where += " AND severity = ?"
            params.append(severity)
        total = conn.execute(f"SELECT COUNT(*) FROM import_issues {where}", params).fetchone()[0]
        issues = conn.execute(f"SELECT row_number, severity, field, message FROM import_issues {where} "
                              "ORDER BY row_number, id LIMIT ? OFFSET ?",
                              params + [page_size, (page - 1) * page_size]).fetchall()
    data = {k: imp[k] for k in imp.keys() if k != "file_sha256"}
    data["mapping"] = json.loads(data.pop("mapping_json"))
    return {"success": True, "import": data, "issues": [dict(i) for i in issues],
            "pagination": _page(page, page_size, total)}


@router.get("/imports/{import_id}/issues.csv")
def export_import_issues(request: Request, import_id: int, _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        if conn.execute("SELECT 1 FROM imports WHERE id = ?", (import_id,)).fetchone() is None:
            raise APIError(404, "not_found", "Import not found.")
        issues = conn.execute("SELECT row_number, severity, field, message FROM import_issues WHERE import_id = ? "
                              "ORDER BY row_number, id", (import_id,)).fetchall()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["row_number", "severity", "field", "message"])
    for i in issues:
        writer.writerow([csv_safe(i["row_number"]), csv_safe(i["severity"]), csv_safe(i["field"]), csv_safe(i["message"])])
    return Response(out.getvalue().encode("utf-8-sig"), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=import_{import_id}_issues.csv"})


# ====================================================================== reminders


@router.get("/reminders")
def list_reminders(
    request: Request,
    status: str | None = Query(None, description="Comma-separated statuses"),
    reminder_type: Literal["explicit", "pre_due", "due_date", "overdue"] | None = None,
    customer_id: str | None = None,
    loan_id: str | None = None,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    _: Principal = require("viewer"),
):
    where, params = [], []
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        bad = [s for s in statuses if s not in JOB_STATUSES]
        if bad:
            raise APIError(422, "validation_error", f"Unknown status: {', '.join(bad)}.")
        where.append(f"status IN ({','.join('?' * len(statuses))})")
        params += statuses
    for col, val in (("reminder_type", reminder_type), ("customer_id", customer_id), ("loan_id", loan_id)):
        if val:
            where.append(f"{col} = ?")
            params.append(val)
    for op, val in ((">=", scheduled_from), ("<", scheduled_to)):
        if val:
            where.append(f"scheduled_at_utc {op} ?")
            params.append(iso(val if val.tzinfo else val.replace(tzinfo=ZoneInfo("UTC"))))
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with svc(request).db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM reminder_jobs {clause}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM reminder_jobs {clause} ORDER BY scheduled_at_utc DESC LIMIT ? OFFSET ?",
                            params + [page_size, (page - 1) * page_size]).fetchall()
        ids = [r["id"] for r in rows]
        deliveries: dict[str, list] = {i: [] for i in ids}
        if ids:
            for d in conn.execute(f"SELECT * FROM message_deliveries WHERE job_id IN ({','.join('?' * len(ids))})",
                                  ids).fetchall():
                deliveries[d["job_id"]].append(d)
        names = {r["customer_id"]: r["name"] for r in conn.execute(
            f"SELECT customer_id, name FROM customers WHERE customer_id IN ({','.join('?' * len(rows)) or 'NULL'})",
            [r["customer_id"] for r in rows]).fetchall()} if rows else {}
    items = []
    for r in rows:
        item = _job_public(r, deliveries[r["id"]])
        item["customer_name"] = names.get(r["customer_id"])
        items.append(item)
    return {"success": True, "reminders": items, "pagination": _page(page, page_size, total)}


@router.get("/reminders/{job_id}")
def get_reminder(request: Request, job_id: str, _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        job = conn.execute("SELECT * FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
        if job is None:
            raise APIError(404, "not_found", "Reminder not found.")
        deliveries = conn.execute("SELECT * FROM message_deliveries WHERE job_id = ? ORDER BY id", (job_id,)).fetchall()
        emi = conn.execute("SELECT * FROM emis WHERE id = ?", (job["emi_id"],)).fetchone()
        customer = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (job["customer_id"],)).fetchone()
        history = conn.execute(
            "SELECT actor, action, details_json, created_at FROM audit_log WHERE entity_type = 'reminder_job' "
            "AND entity_id = ? ORDER BY id", (job_id,)).fetchall()
    return {
        "success": True,
        "reminder": _job_public(job, deliveries),
        "emi": _emi_public(emi),
        "customer": _customer_public(customer),
        "history": [{**dict(h), "details": json.loads(h["details_json"]) if h["details_json"] else None}
                    for h in history],
    }


class RescheduleBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scheduled_at_local: datetime = Field(description="Local wall-clock time, e.g. 2026-10-10T16:00")
    timezone: str | None = None


@router.patch("/reminders/{job_id}")
def patch_reminder(request: Request, job_id: str, body: RescheduleBody, principal: Principal = require("operator")):
    service = svc(request)
    policy = service.policy.get()
    try:
        with service.db.write() as conn:
            job = conn.execute("SELECT timezone FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
            if job is None:
                raise JobActionError(404, "not_found", "Reminder not found.")
            reschedule_job(conn, job_id, body.scheduled_at_local, body.timezone or job["timezone"], policy,
                           principal.name, utcnow())
    except JobActionError as exc:
        _raise(exc)
    return get_reminder(request, job_id, principal)


class CancelBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=3, max_length=500)


@router.post("/reminders/{job_id}/cancel")
def cancel_reminder(request: Request, job_id: str, body: CancelBody, principal: Principal = require("operator")):
    try:
        with svc(request).db.write() as conn:
            cancel_job(conn, job_id, principal.name, body.reason, utcnow())
    except JobActionError as exc:
        _raise(exc)
    return get_reminder(request, job_id, principal)


@router.post("/reminders/{job_id}/retry")
def retry_reminder(request: Request, job_id: str, principal: Principal = require("operator")):
    try:
        with svc(request).db.write() as conn:
            retry_job(conn, job_id, principal.name, utcnow())
    except JobActionError as exc:
        _raise(exc)
    return get_reminder(request, job_id, principal)


@router.post("/reminders/{job_id}/send-now")
def send_now_reminder(request: Request, job_id: str, principal: Principal = require("operator")):
    service = svc(request)
    now = utcnow()
    try:
        with service.db.write() as conn:
            job = conn.execute("SELECT * FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
            if not job:
                raise APIError(404, "not_found", "Reminder job not found.")
            conn.execute(
                "UPDATE reminder_jobs SET run_at_utc = ?, status = 'pending', attempt_count = 0 WHERE id = ?",
                (iso(now), job_id),
            )
        service.dispatcher.run_once(now)
    except JobActionError as exc:
        _raise(exc)
    return get_reminder(request, job_id, principal)


class InstantEmailBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipient: str = Field(min_length=3, max_length=254)
    name: str = "Valued Customer"
    loan_id: str = "LN-DEMO"
    amount: str = "₹10,000.00"
    due_date: str | None = None
    subject: str | None = None
    message: str | None = None


@router.post("/automation/send-instant-email")
def send_instant_email(request: Request, body: InstantEmailBody, principal: Principal = require("operator")):
    service = svc(request)
    provider = service.providers.get("email")
    if not provider:
        raise APIError(503, "no_email_provider", "No email provider configured.")
    problem = provider.configuration_problem()
    if problem:
        raise APIError(503, "provider_not_configured", problem)

    now = utcnow()
    due_date = body.due_date or now.strftime("%Y-%m-%d")
    subject = body.subject or f"Payment Reminder: RepayX Loan #{body.loan_id}"
    amount_str = body.amount if body.amount.startswith("₹") else f"₹{body.amount}"

    text = (
        f"Dear {body.name},\n\n"
        f"This is an instant reminder regarding your loan installment for {body.loan_id}.\n"
        f"Amount Due: {amount_str}\n"
        f"Due Date: {due_date}\n\n"
        f"{body.message or 'Please ensure timely payment via UPI or through your verified RepayX portal link.'}\n\n"
        f"Regards,\nRepayX Collections Team"
    )

    html = (
        f'<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">'
        f'<div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px;">'
        f'<h2 style="color: #0f172a; margin: 0; font-size: 20px;">RepayX Payment Reminder</h2>'
        f'<p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">Loan Account: <strong>{body.loan_id}</strong></p>'
        f'</div>'
        f'<p style="color: #334155; font-size: 14px;">Dear <strong>{body.name}</strong>,</p>'
        f'<p style="color: #334155; font-size: 14px;">This is an instant reminder regarding your loan installment with RepayX:</p>'
        f'<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 8px; margin: 18px 0;">'
        f'<p style="color: #475569; font-size: 13px; margin: 0 0 6px;">Amount Due: <strong style="color: #0f172a; font-size: 16px;">{amount_str}</strong></p>'
        f'<p style="color: #475569; font-size: 13px; margin: 0 0 6px;">Due Date: <strong>{due_date}</strong></p>'
        f'<p style="color: #475569; font-size: 13px; margin: 0;">Loan ID: <strong>{body.loan_id}</strong></p>'
        f'</div>'
        f'<p style="color: #334155; font-size: 13px;">{body.message or "Please ensure your payment is made on or before the due date to avoid late charges."}</p>'
        f'<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />'
        f'<p style="color: #94a3b8; font-size: 11px; margin: 0;">Sent via RepayX Automated Delivery Engine</p>'
        f'</div>'
    )

    req_id = str(uuid.uuid4())
    msg = OutboundMessage(
        channel="email",
        recipient=body.recipient.strip(),
        subject=subject,
        text=text,
        html=html,
        idempotency_key=f"instant-mail:{req_id}",
    )
    res = provider.send(msg)

    with service.db.write() as conn:
        conn.execute(
            """INSERT INTO communications (customer_id, loan_id, channel, direction, kind, identifier, subject, content, status, created_at)
               VALUES (?, ?, 'email', 'outbound', 'instant_reminder', ?, ?, ?, ?, ?)""",
            (body.name, body.loan_id, body.recipient.strip(), subject, text, "accepted" if res.accepted else "failed", iso(now)),
        )

    if not res.accepted:
        raise APIError(502, res.error_code or "send_failed", res.error_message or "Email provider rejected message.")

    clean_ref = (res.provider_message_id or req_id).split("@")[0].strip("<>")
    from_addr = getattr(provider.config, "email_from_address", "priiiiicaptures@gmail.com")

    return {
        "success": True,
        "from_address": from_addr,
        "recipient": body.recipient.strip(),
        "status": "accepted",
        "tracking_ref": clean_ref,
        "message_id": res.provider_message_id,
        "sent_at": iso(now),
    }


# ====================================================================== EMIs and payments


@router.get("/emis")
def list_emis(
    request: Request,
    payment_status: str | None = None,
    claim_pending: bool | None = None,
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    _: Principal = require("viewer"),
):
    where, params = [], []
    if payment_status:
        statuses = [s.strip() for s in payment_status.split(",") if s.strip()]
        where.append(f"e.payment_status IN ({','.join('?' * len(statuses))})")
        params += statuses
    if claim_pending is not None:
        where.append("e.payment_claim_pending = ?")
        params.append(int(claim_pending))
    if search:
        where.append("(e.loan_id LIKE ? OR e.customer_id LIKE ? OR c.name LIKE ?)")
        params += [f"%{search}%"] * 3
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    base = f"FROM emis e JOIN customers c ON c.customer_id = e.customer_id {clause}"
    with svc(request).db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) {base}", params).fetchone()[0]
        rows = conn.execute(f"SELECT e.*, c.name AS customer_name {base} ORDER BY e.due_date ASC LIMIT ? OFFSET ?",
                            params + [page_size, (page - 1) * page_size]).fetchall()
    items = [{**_emi_public(r), "customer_name": r["customer_name"]} for r in rows]
    return {"success": True, "emis": items, "pagination": _page(page, page_size, total)}


class PaymentBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payment_status: Literal["pending", "overdue", "partially_paid", "paid", "cancelled", "waived"]
    amount_paid: str | None = Field(default=None, max_length=20)
    reference: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=1000)


@router.patch("/emis/{emi_id}/payment")
def patch_payment(request: Request, emi_id: int, body: PaymentBody, principal: Principal = require("operator")):
    service = svc(request)
    amount = None
    if body.amount_paid not in (None, ""):
        try:
            amount = Decimal(body.amount_paid)
        except InvalidOperation as exc:
            raise APIError(422, "invalid_amount", "amount_paid must be a number.") from exc
    try:
        with service.db.write() as conn:
            result = update_payment(conn, emi_id, body.payment_status, amount, principal.name,
                                    f"manual:{principal.name}", service.policy.get(), utcnow(),
                                    body.reference, body.note)
            emi = conn.execute("SELECT * FROM emis WHERE id = ?", (emi_id,)).fetchone()
    except JobActionError as exc:
        _raise(exc)
    return {"success": True, "emi": _emi_public(emi), "reminders_cancelled": result.cancelled,
            "reminders_scheduled": result.scheduled}


class NoteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=3, max_length=1000)


@router.post("/emis/{emi_id}/claim/reject")
def reject_claim(request: Request, emi_id: int, body: NoteBody, principal: Principal = require("operator")):
    service = svc(request)
    try:
        with service.db.write() as conn:
            reject_payment_claim(conn, emi_id, principal.name, body.note, service.policy.get(), utcnow())
            emi = conn.execute("SELECT * FROM emis WHERE id = ?", (emi_id,)).fetchone()
    except JobActionError as exc:
        _raise(exc)
    return {"success": True, "emi": _emi_public(emi)}


class HoldBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    on_hold: bool
    reason: str | None = Field(default=None, max_length=500)


@router.post("/automation/customers/{customer_id}/hold")
def customer_hold(request: Request, customer_id: str, body: HoldBody, principal: Principal = require("operator")):
    service = svc(request)
    try:
        with service.db.write() as conn:
            result = set_customer_hold(conn, customer_id, body.on_hold, body.reason, principal.name,
                                       service.policy.get(), utcnow())
            customer = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (customer_id,)).fetchone()
    except JobActionError as exc:
        _raise(exc)
    return {"success": True, "customer": _customer_public(customer), "reminders_cancelled": result.cancelled,
            "reminders_scheduled": result.scheduled}


# ====================================================================== settings, control, health


@router.get("/automation/settings")
def get_settings(request: Request, _: Principal = require("viewer")):
    service = svc(request)
    return {"success": True, "settings": service.policy.get().model_dump(), "app_timezone": service.config.app_timezone,
            "mode": service.config.mode}


@router.patch("/automation/settings")
def patch_settings(request: Request, body: dict[str, Any], principal: Principal = require("admin")):
    service = svc(request)
    try:
        policy = service.policy.update(body, principal.name)
    except ValidationError as exc:
        details = [{"field": ".".join(str(p) for p in e["loc"]) or "body", "message": e["msg"]} for e in exc.errors()]
        raise APIError(422, "validation_error", "; ".join(f"{d['field']}: {d['message']}" for d in details)) from exc
    with service.db.write() as conn:
        result = reconcile_all(conn, policy, utcnow(), principal.name)
    return {"success": True, "settings": policy.model_dump(), "reminders_scheduled": result.scheduled,
            "reminders_updated": result.updated, "reminders_cancelled": result.cancelled}


@router.post("/automation/pause")
def pause(request: Request, principal: Principal = require("admin")):
    svc(request).policy.update({"automation_paused": True}, principal.name)
    return {"success": True, "automation_paused": True}


@router.post("/automation/resume")
def resume(request: Request, principal: Principal = require("admin")):
    svc(request).policy.update({"automation_paused": False}, principal.name)
    return {"success": True, "automation_paused": False}


def _health(service: AutomationService) -> dict:
    now = utcnow()
    with service.db.read() as conn:
        hb = conn.execute("SELECT * FROM worker_heartbeats ORDER BY last_tick_at DESC LIMIT 1").fetchone()
        due_backlog = conn.execute(
            "SELECT COUNT(*), MIN(run_at_utc) FROM reminder_jobs WHERE status IN ('pending','retry') AND run_at_utc <= ?",
            (iso(now),)).fetchone()
        processing = conn.execute("SELECT COUNT(*) FROM reminder_jobs WHERE status = 'processing'").fetchone()[0]
        dead = conn.execute("SELECT COUNT(*) FROM reminder_jobs WHERE status = 'dead_letter'").fetchone()[0]
        unknown = conn.execute("SELECT COUNT(*) FROM message_deliveries WHERE status = 'unknown'").fetchone()[0]
    stale_after = max(60, service.config.poll_seconds * 4)
    last_tick = parse_iso(hb["last_tick_at"]) if hb else None
    alive = bool(last_tick and (now - last_tick).total_seconds() <= stale_after)
    lag = (now - parse_iso(due_backlog[1])).total_seconds() if due_backlog[1] else 0
    policy = service.policy.get()
    providers = {}
    for ch, p in service.providers.items():
        problem = p.configuration_problem()
        providers[ch] = {"provider": p.name, "ready": problem is None, "problem": problem, "sandbox": p.sandbox,
                         "official": p.name not in ("baileys_bridge",)}
        if ch == "email":
            providers[ch]["configured_provider"] = service.config.email_provider
    return {
        "status": "ok" if alive and lag < 600 else "degraded",
        "mode": service.config.mode,
        "automation_paused": policy.automation_paused,
        "worker": {
            "alive": alive, "worker_id": hb["worker_id"] if hb else None, "hostname": hb["hostname"] if hb else None,
            "last_tick_at": hb["last_tick_at"] if hb else None, "jobs_processed": hb["jobs_processed"] if hb else 0,
            "last_error": hb["last_error"] if hb else None, "stale_after_seconds": stale_after,
        },
        "queue": {"due_backlog": due_backlog[0], "oldest_due_lag_seconds": int(max(0, lag)),
                  "processing": processing, "dead_letter": dead, "unknown_deliveries": unknown},
        "providers": providers,
        "config_warnings": service.config.validate(),
        "server_time": iso(now),
    }


@router.get("/automation/health")
def health(request: Request, _: Principal = require("viewer")):
    return {"success": True, **_health(svc(request))}


@router.get("/automation/health/live")
def health_live(request: Request):
    """Unauthenticated probe for load balancers: no data, just whether the worker is ticking."""
    h = _health(svc(request))
    return {"success": True, "status": h["status"], "worker_alive": h["worker"]["alive"]}


@router.get("/automation/dashboard")
def dashboard(request: Request, _: Principal = require("viewer")):
    service = svc(request)
    now = utcnow()
    tz = ZoneInfo(service.config.app_timezone)
    local_today = now.astimezone(tz).date()
    day_start = datetime.combine(local_today, datetime.min.time(), tzinfo=tz)
    day_end = day_start + timedelta(days=1)
    with service.db.read() as conn:
        customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        emi_rows = conn.execute("SELECT payment_status, due_date FROM emis").fetchall()
        claims = conn.execute("SELECT COUNT(*) FROM emis WHERE payment_claim_pending = 1").fetchone()[0]
        job_status = dict(conn.execute("SELECT status, COUNT(*) FROM reminder_jobs GROUP BY status").fetchall())
        due_today = conn.execute(
            "SELECT COUNT(*) FROM reminder_jobs WHERE scheduled_at_utc >= ? AND scheduled_at_utc < ?",
            (iso(day_start), iso(day_end))).fetchone()[0]
        due_today_open = conn.execute(
            "SELECT COUNT(*) FROM reminder_jobs WHERE status IN ('pending','retry','processing') "
            "AND run_at_utc >= ? AND run_at_utc < ?", (iso(day_start), iso(day_end))).fetchone()[0]
        upcoming = conn.execute(
            "SELECT COUNT(*) FROM reminder_jobs WHERE status IN ('pending','retry') AND run_at_utc >= ? AND run_at_utc < ?",
            (iso(now), iso(now + timedelta(days=7)))).fetchone()[0]
        deliveries = conn.execute("SELECT channel, CASE WHEN provider = 'sandbox' AND status = 'accepted' "
                                  "THEN 'simulated' ELSE status END AS status, COUNT(*) AS n, "
                                  "SUM(attempt_count) AS attempts FROM message_deliveries GROUP BY channel, "
                                  "CASE WHEN provider = 'sandbox' AND status = 'accepted' "
                                  "THEN 'simulated' ELSE status END").fetchall()
        replies = conn.execute(
            """SELECT c.id, c.customer_id, cu.name, c.channel, c.identifier, c.content, c.intent, c.created_at
               FROM communications c LEFT JOIN customers cu ON cu.customer_id = c.customer_id
               WHERE c.direction = 'inbound' ORDER BY c.id DESC LIMIT 10""").fetchall()
        followups = conn.execute(
            """SELECT f.*, cu.name FROM followup_tasks f LEFT JOIN customers cu ON cu.customer_id = f.customer_id
               WHERE f.status = 'open' ORDER BY CASE f.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
               f.id DESC LIMIT 10""").fetchall()
        open_followups = conn.execute("SELECT COUNT(*) FROM followup_tasks WHERE status = 'open'").fetchone()[0]
        escalations_total = conn.execute("SELECT COUNT(*) FROM escalation_cases").fetchone()[0]
        escalations_open = conn.execute("SELECT COUNT(*) FROM escalation_cases WHERE status = 'open'").fetchone()[0]
        voice_count = conn.execute("SELECT COUNT(*) FROM voice_messages").fetchone()[0]
        last_import = conn.execute("SELECT id, filename, status, completed_at FROM imports ORDER BY id DESC LIMIT 1").fetchone()

    emi_counts = {"paid": 0, "pending": 0, "overdue": 0, "partially_paid": 0, "other": 0}
    for r in emi_rows:
        s = r["payment_status"]
        if s in ("pending", "partially_paid") and date.fromisoformat(r["due_date"]) < local_today:
            emi_counts["overdue"] += 1
        elif s in emi_counts:
            emi_counts[s] += 1
        else:
            emi_counts["other"] += 1
    channels: dict[str, dict[str, int]] = {c: {} for c in ("whatsapp", "sms", "email")}
    retries = 0
    for d in deliveries:
        channels[d["channel"]][d["status"]] = d["n"]
        retries += max(0, (d["attempts"] or 0) - d["n"])
    return {
        "success": True,
        "customers_total": customers,
        "emis": {**emi_counts, "total": len(emi_rows), "payment_claims_pending": claims},
        "reminders": {
            "scheduled_open": job_status.get("pending", 0) + job_status.get("retry", 0),
            "scheduled_today": due_today, "due_today_open": due_today_open, "upcoming_7_days": upcoming,
            "by_status": job_status,
        },
        "escalations": {"total": escalations_total, "open": escalations_open},
        "voice_messages_total": voice_count,
        "deliveries_by_channel": channels,
        "failed_deliveries": sum(c.get("failed", 0) for c in channels.values()),
        "retry_attempts": retries,
        "recent_replies": [{
            "id": r["id"], "customer_id": r["customer_id"], "customer_name": r["name"], "channel": r["channel"],
            "from": mask_identifier(r["channel"], r["identifier"]), "content": r["content"][:300],
            "intent": r["intent"], "created_at": r["created_at"]} for r in replies],
        "followups_open": open_followups,
        "followups": [{
            "id": f["id"], "customer_id": f["customer_id"], "customer_name": f["name"], "loan_id": f["loan_id"],
            "kind": f["kind"], "priority": f["priority"], "reason": f["reason"], "due_at": f["due_at"],
            "created_at": f["created_at"]} for f in followups],
        "last_import": dict(last_import) if last_import else None,
        "health": _health(service),
        "app_timezone": service.config.app_timezone,
    }


# ====================================================================== communications, follow-ups, suppressions


@router.get("/communications")
def communications(
    request: Request,
    customer_id: str | None = None,
    channel: Literal["whatsapp", "sms", "email"] | None = None,
    direction: Literal["inbound", "outbound"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: Principal = require("viewer"),
):
    where, params = [], []
    for col, val in (("customer_id", customer_id), ("channel", channel), ("direction", direction)):
        if val:
            where.append(f"{col} = ?")
            params.append(val)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with svc(request).db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM communications {clause}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM communications {clause} ORDER BY id DESC LIMIT ? OFFSET ?",
                            params + [page_size, (page - 1) * page_size]).fetchall()
    items = []
    for r in rows:
        item = {k: r[k] for k in r.keys() if k != "identifier"}
        item["identifier"] = mask_identifier(r["channel"], r["identifier"])
        items.append(item)
    return {"success": True, "communications": items, "pagination": _page(page, page_size, total)}


@router.get("/followups")
def followups(request: Request, status: Literal["open", "resolved"] = "open",
              page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
              _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        total = conn.execute("SELECT COUNT(*) FROM followup_tasks WHERE status = ?", (status,)).fetchone()[0]
        rows = conn.execute(
            """SELECT f.*, cu.name AS customer_name, cu.reminders_on_hold FROM followup_tasks f
               LEFT JOIN customers cu ON cu.customer_id = f.customer_id WHERE f.status = ?
               ORDER BY CASE f.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, f.id DESC
               LIMIT ? OFFSET ?""", (status, page_size, (page - 1) * page_size)).fetchall()
    return {"success": True, "followups": [dict(r) for r in rows], "pagination": _page(page, page_size, total)}


class ResolveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=3, max_length=1000)
    release_hold: bool = False


@router.post("/followups/{task_id}/resolve")
def resolve_followup(request: Request, task_id: int, body: ResolveBody, principal: Principal = require("operator")):
    service = svc(request)
    now = utcnow()
    try:
        with service.db.write() as conn:
            task = conn.execute("SELECT * FROM followup_tasks WHERE id = ?", (task_id,)).fetchone()
            if task is None:
                raise JobActionError(404, "not_found", "Follow-up not found.")
            if task["status"] != "open":
                raise JobActionError(409, "already_resolved", "This follow-up is already resolved.")
            conn.execute("UPDATE followup_tasks SET status = 'resolved', resolution_note = ?, resolved_by = ?, "
                         "resolved_at = ? WHERE id = ?", (body.note, principal.name, iso(now), task_id))
            if body.release_hold and task["customer_id"]:
                set_customer_hold(conn, task["customer_id"], False, None, principal.name, service.policy.get(), now)
    except JobActionError as exc:
        _raise(exc)
    return {"success": True, "id": task_id, "status": "resolved"}


@router.get("/suppressions")
def list_suppressions(request: Request, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
                      _: Principal = require("viewer")):
    with svc(request).db.read() as conn:
        total = conn.execute("SELECT COUNT(*) FROM suppressions").fetchone()[0]
        rows = conn.execute("SELECT * FROM suppressions ORDER BY id DESC LIMIT ? OFFSET ?",
                            (page_size, (page - 1) * page_size)).fetchall()
    items = [{**{k: r[k] for k in r.keys() if k != "identifier"},
              "identifier": mask_identifier(r["channel"], r["identifier"])} for r in rows]
    return {"success": True, "suppressions": items, "pagination": _page(page, page_size, total)}


class SuppressionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: str
    channel: Literal["whatsapp", "sms", "email"]
    reason: str = Field(min_length=3, max_length=300)


@router.post("/suppressions", status_code=201)
def add_suppression(request: Request, body: SuppressionBody, principal: Principal = require("operator")):
    service = svc(request)
    with service.db.write() as conn:
        cust = conn.execute("SELECT phone, email FROM customers WHERE customer_id = ?", (body.customer_id,)).fetchone()
        if cust is None:
            raise APIError(404, "not_found", "Customer not found.")
        identifier = cust["email"] if body.channel == "email" else cust["phone"]
        if not identifier:
            raise APIError(422, "no_contact", f"The customer has no {body.channel} contact on record.")
        conn.execute(
            """INSERT OR IGNORE INTO suppressions (channel, identifier, customer_id, reason, source, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (body.channel, identifier, body.customer_id, body.reason, f"manual:{principal.name}", iso(utcnow())))
        from automation.audit import audit
        audit(conn, principal.name, "suppression.added", "customer", body.customer_id,
              {"channel": body.channel, "reason": body.reason})
    return {"success": True}


@router.delete("/suppressions/{suppression_id}")
def remove_suppression(request: Request, suppression_id: int, note: str = Query(..., min_length=10, max_length=500),
                       principal: Principal = require("admin")):
    """Re-enabling a channel requires the customer's renewed consent; record how it was obtained."""
    with svc(request).db.write() as conn:
        row = conn.execute("SELECT * FROM suppressions WHERE id = ?", (suppression_id,)).fetchone()
        if row is None:
            raise APIError(404, "not_found", "Suppression not found.")
        conn.execute("DELETE FROM suppressions WHERE id = ?", (suppression_id,))
        from automation.audit import audit
        audit(conn, principal.name, "suppression.removed", "customer", row["customer_id"],
              {"channel": row["channel"], "consent_note": note})
    return {"success": True}


@router.get("/audit")
def audit_log(request: Request, entity_type: str | None = None, entity_id: str | None = None,
              page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
              _: Principal = require("admin")):
    where, params = [], []
    for col, val in (("entity_type", entity_type), ("entity_id", entity_id)):
        if val:
            where.append(f"{col} = ?")
            params.append(val)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with svc(request).db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM audit_log {clause}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM audit_log {clause} ORDER BY id DESC LIMIT ? OFFSET ?",
                            params + [page_size, (page - 1) * page_size]).fetchall()
    return {"success": True, "entries": [{**dict(r), "details": json.loads(r["details_json"]) if r["details_json"] else None}
                                          for r in rows], "pagination": _page(page, page_size, total)}


@router.get("/automation/me")
def whoami(principal: Principal = require("viewer")):
    return {"success": True, "name": principal.name, "role": principal.role}


class EscalationAction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    note: str | None = None
    assigned_to: str | None = None
    status: Literal["open", "under_review", "resolved", "written_off"] | None = None


@router.get("/escalations")
def list_escalations(request: Request, status: str | None = None, customer_id: str | None = None,
                     page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
                     _: Principal = require("viewer")):
    service = svc(request)
    where, params = [], []
    if status:
        where.append("e.status = ?")
        params.append(status)
    if customer_id:
        where.append("e.customer_id = ?")
        params.append(customer_id)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with service.db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM escalation_cases e {clause}", params).fetchone()[0]
        rows = conn.execute(
            f"""SELECT e.*, c.name AS customer_name, c.phone, c.email, c.human_takeover
                FROM escalation_cases e
                LEFT JOIN customers c ON c.customer_id = e.customer_id
                {clause} ORDER BY e.id DESC LIMIT ? OFFSET ?""",
            params + [page_size, (page - 1) * page_size],
        ).fetchall()
    cases = [{
        "id": r["id"], "emi_id": r["emi_id"], "customer_id": r["customer_id"],
        "customer_name": r["customer_name"], "phone": mask_phone(r["phone"]),
        "email": mask_email(r["email"]), "loan_id": r["loan_id"],
        "stage_reached": r["stage_reached"], "overdue_days": r["overdue_days"],
        "outstanding_amount": r["outstanding_amount"], "status": r["status"],
        "assigned_to": r["assigned_to"], "escalated_at": r["escalated_at"],
        "notes": r["notes"], "human_takeover": bool(r["human_takeover"]),
        "created_at": r["created_at"], "resolved_at": r["resolved_at"],
    } for r in rows]
    return {"success": True, "escalations": cases, "pagination": _page(page, page_size, total)}


@router.post("/escalations/{case_id}/resolve")
def resolve_escalation(case_id: int, body: EscalationAction, request: Request,
                       principal: Principal = require("operator")):
    service = svc(request)
    now_s = iso(utcnow())
    with service.db.write() as conn:
        row = conn.execute("SELECT * FROM escalation_cases WHERE id = ?", (case_id,)).fetchone()
        if not row:
            raise APIError(404, "not_found", "Escalation case not found.")
        note = f"{row['notes'] or ''}\nResolved by {principal.name}: {body.note or ''}".strip()
        conn.execute(
            """UPDATE escalation_cases SET status = 'resolved', notes = ?,
                   resolved_at = ?, updated_at = ? WHERE id = ?""",
            (note, now_s, now_s, case_id),
        )
        from automation.audit import audit
        audit(conn, principal.name, "escalation.resolved", "escalation_case", str(case_id), {"note": body.note})
    return {"success": True, "message": "Escalation case marked as resolved."}


@router.post("/escalations/{case_id}/takeover")
def toggle_human_takeover(case_id: int, body: EscalationAction, request: Request,
                          principal: Principal = require("operator")):
    service = svc(request)
    now_s = iso(utcnow())
    with service.db.write() as conn:
        row = conn.execute("SELECT * FROM escalation_cases WHERE id = ?", (case_id,)).fetchone()
        if not row:
            raise APIError(404, "not_found", "Escalation case not found.")
        cust = conn.execute("SELECT human_takeover FROM customers WHERE customer_id = ?", (row["customer_id"],)).fetchone()
        new_takeover = 0 if cust and cust["human_takeover"] else 1
        conn.execute("UPDATE customers SET human_takeover = ?, updated_at = ? WHERE customer_id = ?",
                     (new_takeover, now_s, row["customer_id"]))
        assigned = body.assigned_to or (principal.name if new_takeover else None)
        conn.execute("UPDATE escalation_cases SET assigned_to = ?, status = 'under_review', updated_at = ? WHERE id = ?",
                     (assigned, now_s, case_id))
        from automation.audit import audit
        audit(conn, principal.name, "escalation.takeover", "escalation_case", str(case_id), {
            "human_takeover": bool(new_takeover), "assigned_to": assigned,
        })
    return {"success": True, "human_takeover": bool(new_takeover), "assigned_to": assigned}


@router.get("/media/voice/{filename}")
def get_voice_audio(filename: str, request: Request):
    from fastapi.responses import FileResponse
    service = svc(request)
    path = service.config.voice_media_dir / filename
    if not path.is_file():
        raise APIError(404, "not_found", "Audio file not found.")
    return FileResponse(path, media_type="audio/mpeg")


@router.get("/voice-messages")
def list_voice_messages(request: Request, customer_id: str | None = None,
                        page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
                        _: Principal = require("viewer")):
    service = svc(request)
    where, params = [], []
    if customer_id:
        where.append("customer_id = ?")
        params.append(customer_id)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with service.db.read() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM voice_messages {clause}", params).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM voice_messages {clause} ORDER BY id DESC LIMIT ? OFFSET ?",
                            params + [page_size, (page - 1) * page_size]).fetchall()
    return {"success": True, "voice_messages": [dict(r) for r in rows], "pagination": _page(page, page_size, total)}
