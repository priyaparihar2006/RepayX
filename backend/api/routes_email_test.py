"""Admin-only, fixed-content, one-recipient Apps Script test. No scheduler mutation."""
from __future__ import annotations

import hashlib
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from api.errors import APIError
from automation.audit import audit
from automation.auth import Principal, require
from automation.messages import apps_script_content
from automation.providers.apps_script import AppsScriptEmailProvider
from automation.providers.base import OutboundMessage
from automation.util import iso, mask_email, normalize_email, utcnow

router = APIRouter(prefix="/api/automation/email-test", tags=["automation"])


def public(row):
    return {k: row[k] for k in ("request_id", "recipient", "actor", "real_send", "status", "attempted_at",
                                "provider_message_id", "error_code")}


@router.get("")
def status(request: Request, _: Principal = require("admin")):
    service = request.app.state.automation
    config = service.config
    provider = service.providers.get("email") or AppsScriptEmailProvider(config)
    with service.db.read() as conn:
        rows = conn.execute("SELECT * FROM email_test_runs ORDER BY attempted_at DESC LIMIT 20").fetchall()
    enabled = True if provider.name == "smtp" else config.apps_script_test_send_enabled
    allowed_count = len(config.test_recipients) if provider.name == "smtp" else len(config.apps_script_allowed_recipients)
    return {"success": True, "enabled": enabled,
            "ready": provider.configuration_problem() is None, "problem": provider.configuration_problem(),
            "allowlisted_count": allowed_count, "runs": [public(r) for r in rows]}


class TestEmail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    recipient: str = Field(min_length=3, max_length=254)
    send_real: bool = False
    authorized: bool = False


@router.post("")
def send_test(request: Request, body: TestEmail, principal: Principal = require("admin")):
    service = request.app.state.automation
    config = service.config
    provider = service.providers.get("email") or AppsScriptEmailProvider(config)
    recipient = normalize_email(body.recipient)
    allowed = set(config.apps_script_allowed_recipients) | set(config.test_recipients) | {config.email_from_address.lower()}
    if not recipient or (allowed and recipient.lower() not in allowed):
        raise APIError(403, "recipient_not_allowlisted", "Use an explicitly authorized, allowlisted test email address.")
    if not body.authorized:
        raise APIError(422, "authorization_required", "Confirm the recipient authorized this test.")
    if body.send_real:
        if provider.name != "smtp" and not config.apps_script_test_send_enabled:
            raise APIError(403, "test_disabled", "Real email testing is disabled on the backend.")
        if provider.configuration_problem():
            raise APIError(503, "provider_not_configured", provider.configuration_problem())
    now = utcnow()
    key = str(body.request_id)
    target_hash = hashlib.sha256(recipient.lower().encode()).hexdigest()
    with service.db.write() as conn:
        previous = conn.execute("SELECT * FROM email_test_runs WHERE request_id = ?", (key,)).fetchone()
        if previous:
            if previous["recipient_hash"] != target_hash or bool(previous["real_send"]) != body.send_real:
                raise APIError(409, "request_conflict", "This test identifier was already used for a different request.")
            return {"success": True, "run": public(previous)}
        if body.send_real and conn.execute(
                "SELECT 1 FROM email_test_runs WHERE real_send = 1 AND attempted_at > ?", (iso(now - timedelta(seconds=60)),)).fetchone():
            raise APIError(429, "test_rate_limit", "Wait at least 60 seconds between real test emails.")
        # Commit unknown BEFORE network I/O. A crash or repeat cannot trigger a second send.
        conn.execute("INSERT INTO email_test_runs (request_id,recipient,recipient_hash,actor,real_send,status,attempted_at) "
                     "VALUES (?,?,?,?,?,?,?)", (key, mask_email(recipient), target_hash, principal.name,
                                                int(body.send_real), "unknown" if body.send_real else "simulated", iso(now)))
        audit(conn, principal.name, "email_test.requested", "email_test", key,
              {"recipient": mask_email(recipient), "real_send": body.send_real})
    if body.send_real:
        params = {"name": "Authorized Test Customer", "loan_id": "REPAYX-TEST-NOT-A-REAL-LOAN",
                  "amount": "₹1.00", "due_date": (now + timedelta(days=7)).date().isoformat()}
        subject, text, html = apps_script_content(params)
        real_provider = provider
        if getattr(real_provider, "name", "") == "sandbox":
            real_provider = AppsScriptEmailProvider(config)
        result = real_provider.send(OutboundMessage(channel="email", recipient=recipient, text=text, html=html,
                               subject=subject, idempotency_key="admin-test:" + key, template_params=params))
        outcome = "accepted" if result.accepted else "unknown" if result.error_code == "ambiguous_timeout" else "failed"
        with service.db.write() as conn:
            conn.execute("UPDATE email_test_runs SET status=?,provider_message_id=?,error_code=? WHERE request_id=?",
                         (outcome, result.provider_message_id, result.error_code, key))
            audit(conn, principal.name, "email_test.finished", "email_test", key,
                  {"status": outcome, "error_code": result.error_code})
    with service.db.read() as conn:
        row = conn.execute("SELECT * FROM email_test_runs WHERE request_id=?", (key,)).fetchone()
    return {"success": True, "run": public(row)}
