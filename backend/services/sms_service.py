"""SMS Service for RepayX.

Dedicated SMS channel management supporting Twilio and MSG91 providers,
E.164 phone normalization, safe retry logic, suppressions/opt-out checking,
idempotency, and safe admin testing.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from api.errors import APIError
from automation.audit import audit
from automation.config import AutomationConfig, get_automation_config
from automation.providers import OutboundMessage, Provider, SendResult, build_providers
from automation.providers.sandbox import SandboxProvider
from automation.providers.sms import Msg91SmsProvider, TwilioSmsProvider
from automation.util import iso, mask_phone, normalize_phone, utcnow

logger = logging.getLogger("repayx.services.sms")
ROOT = Path(__file__).resolve().parents[2]


def validate_and_normalize_phone(raw: str) -> str:
    """Validate and convert phone number to canonical E.164 format (+[country][national])."""
    if not raw or not isinstance(raw, str):
        raise APIError(422, "invalid_phone", "Phone number is required.")
    cleaned = normalize_phone(raw)
    if not cleaned:
        raise APIError(422, "invalid_phone", f"Cannot normalize '{raw}' to a valid E.164 phone number.")
    # Digits check (E.164 specifies + followed by 10 to 15 digits)
    digits = cleaned.lstrip("+")
    if not digits.isdigit() or len(digits) < 10 or len(digits) > 15:
        raise APIError(422, "invalid_phone", f"Invalid phone length '{cleaned}'. Must be 10-15 digits E.164.")
    return cleaned


@dataclass
class SMSSettings:
    provider: str = field(default_factory=lambda: os.getenv("SMS_PROVIDER", "none").strip().lower())
    twilio_account_sid: str = field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN", ""), repr=False)
    twilio_from_number: str = field(default_factory=lambda: os.getenv("TWILIO_FROM_NUMBER", ""))
    twilio_messaging_service_sid: str = field(default_factory=lambda: os.getenv("TWILIO_MESSAGING_SERVICE_SID", ""))
    twilio_status_callback_url: str = field(default_factory=lambda: os.getenv("TWILIO_STATUS_CALLBACK_URL", ""))
    msg91_auth_key: str = field(default_factory=lambda: os.getenv("MSG91_AUTH_KEY", ""), repr=False)
    msg91_flow_id: str = field(default_factory=lambda: os.getenv("MSG91_FLOW_ID", ""))
    msg91_template_vars: tuple[str, ...] = ("name", "amount", "due_date", "loan_id")
    mode: str = field(default_factory=lambda: os.getenv("AUTOMATION_MODE", "sandbox").strip().lower())
    db_path: Path = field(default_factory=lambda: ROOT / os.getenv("AUTOMATION_DB_PATH", "backend/data/automation.sqlite3"))
    test_recipients: list[str] = field(
        default_factory=lambda: [r.strip() for r in os.getenv("AUTOMATION_TEST_RECIPIENTS", "").split(",") if r.strip() and "@" not in r]
    )


class SMSService:
    """Enterprise SMS service orchestrating multi-provider delivery and tracking."""

    def __init__(self, settings: SMSSettings | None = None, config: AutomationConfig | None = None):
        self.settings = settings or SMSSettings()
        self.config = config or get_automation_config()
        self.settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._provider_instance: Provider | None = None

    def _get_provider(self) -> Provider:
        if self.settings.mode != "live":
            return SandboxProvider("sms")
        provider_name = self.settings.provider
        if provider_name == "twilio":
            return TwilioSmsProvider(self.config)
        elif provider_name == "msg91":
            return Msg91SmsProvider(self.config)
        return SandboxProvider("sms")

    def configuration(self) -> dict[str, Any]:
        """Returns non-sensitive configuration status and readiness."""
        prov = self._get_provider()
        problem = prov.configuration_problem() if hasattr(prov, "configuration_problem") else None
        sender_display = self.settings.twilio_from_number or self.settings.twilio_messaging_service_sid or "REPAYX"
        masked_sender = sender_display[:4] + "***" + sender_display[-2:] if len(sender_display) > 6 else sender_display
        return {
            "success": True,
            "provider": self.settings.provider,
            "mode": self.settings.mode,
            "enabled": self.settings.provider not in ("none", ""),
            "ready": problem is None,
            "problem": problem,
            "sender_id": masked_sender,
            "allowlisted_count": len(self.settings.test_recipients),
        }

    def send_sms(
        self,
        recipient: str,
        message_text: str,
        idempotency_key: str | None = None,
        customer_id: str | None = None,
        loan_id: str | None = None,
        template_params: dict[str, str] | None = None,
        stage: int = 1,
    ) -> dict[str, Any]:
        """Dispatches an SMS message.
        
        Important: Status is recorded as 'accepted' or 'sent' by provider, NEVER 'delivered'
        until a verified delivery receipt is received.
        """
        norm_phone = validate_and_normalize_phone(recipient)
        key = idempotency_key or f"sms_{int(time.time() * 1000)}_{hashlib.sha256(norm_phone.encode()).hexdigest()[:8]}"

        # Check suppression
        try:
            with sqlite3.connect(self.settings.db_path) as conn:
                suppressed = conn.execute(
                    "SELECT 1 FROM suppressions WHERE channel = 'sms' AND identifier = ?",
                    (norm_phone,),
                ).fetchone()
                if suppressed:
                    return {
                        "success": False,
                        "status": "skipped",
                        "error": "recipient_suppressed",
                        "message": "Recipient has opted out or is on the suppression list.",
                    }
        except sqlite3.OperationalError:
            # Table may not exist yet or in isolated test db
            pass

        # Check test mode allowlist
        if self.settings.mode != "live" or self.settings.test_recipients:
            allowed = set(self.settings.test_recipients)
            if allowed and norm_phone not in allowed:
                return {
                    "success": False,
                    "status": "skipped",
                    "error": "test_mode_recipient_not_allowlisted",
                    "message": "Recipient not in AUTOMATION_TEST_RECIPIENTS.",
                }

        provider = self._get_provider()
        outbound = OutboundMessage(
            channel="sms",
            recipient=norm_phone,
            text=message_text,
            idempotency_key=key,
            template_params=template_params or {},
        )

        try:
            result = provider.send(outbound)
        except Exception as exc:
            logger.exception("SMS provider dispatch exception: %s", exc)
            result = SendResult(
                accepted=False,
                error_code="provider_exception",
                error_message=str(exc),
                transient=True,
            )

        now_s = iso(utcnow())
        try:
            with sqlite3.connect(self.settings.db_path) as conn:
                conn.execute(
                    """INSERT INTO communications (
                        customer_id, loan_id, channel, direction, kind,
                        provider_message_id, identifier, content, status, created_at
                    ) VALUES (?, ?, 'sms', 'outbound', 'reminder', ?, ?, ?, ?, ?)""",
                    (
                        customer_id,
                        loan_id,
                        result.provider_message_id,
                        mask_phone(norm_phone),
                        message_text,
                        "accepted" if result.accepted else "failed",
                        now_s,
                    ),
                )
        except sqlite3.OperationalError:
            pass
            if result.suppress_recipient:
                conn.execute(
                    """INSERT OR IGNORE INTO suppressions (channel, identifier, customer_id, reason, source, created_at)
                    VALUES ('sms', ?, ?, ?, ?, ?)""",
                    (norm_phone, customer_id, result.error_code or "provider_opt_out", f"provider:{provider.name}", now_s),
                )
            conn.commit()

        return {
            "success": result.accepted,
            "status": "accepted" if result.accepted else "failed",
            "provider_message_id": result.provider_message_id,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "recipient": mask_phone(norm_phone),
        }

    def send_test_sms(
        self,
        recipient: str,
        send_real: bool,
        authorized: bool,
        request_id: str,
        actor: str,
    ) -> dict[str, Any]:
        """Dispatches an explicit, authorized single test SMS and records test run audit."""
        norm_phone = validate_and_normalize_phone(recipient)
        allowed = set(self.settings.test_recipients)
        if allowed and norm_phone not in allowed:
            raise APIError(403, "recipient_not_allowlisted", f"Use an explicitly authorized test number. Allowlist: {', '.join(allowed) or 'None'}")
        if not authorized:
            raise APIError(422, "authorization_required", "Confirm the recipient authorized this test SMS.")

        provider = self._get_provider()
        if send_real and hasattr(provider, "configuration_problem"):
            prob = provider.configuration_problem()
            if prob:
                raise APIError(503, "provider_not_configured", prob)

        now = utcnow()
        now_s = iso(now)
        target_hash = hashlib.sha256(norm_phone.encode()).hexdigest()

        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            prev = conn.execute("SELECT * FROM sms_test_runs WHERE request_id = ?", (request_id,)).fetchone()
            if prev:
                if prev["recipient_hash"] != target_hash or bool(prev["real_send"]) != send_real:
                    raise APIError(409, "request_conflict", "This test identifier was already used for a different request.")
                return {"success": True, "run": dict(prev)}

            # Rate limit real sends (60s cooldown)
            if send_real:
                recent = conn.execute(
                    "SELECT 1 FROM sms_test_runs WHERE real_send = 1 AND attempted_at > ?",
                    (iso(now - timedelta(seconds=60)),),
                ).fetchone()
                if recent:
                    raise APIError(429, "test_rate_limit", "Wait at least 60 seconds between real test SMS messages.")

            # Record initial run before network call
            initial_status = "unknown" if send_real else "simulated"
            conn.execute(
                """INSERT INTO sms_test_runs (
                    request_id, recipient, recipient_hash, actor, real_send, status, attempted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (request_id, mask_phone(norm_phone), target_hash, actor, int(send_real), initial_status, now_s),
            )
            audit(conn, actor, "sms_test.requested", "sms_test", request_id, {
                "recipient": mask_phone(norm_phone),
                "real_send": send_real,
            })
            conn.commit()

        if send_real:
            msg_text = (
                f"{self.config.company_name}: Hello Test Customer, your EMI of ₹1,500.00 is due on "
                f"{now.strftime('%d %b %Y')}. This is an authorized test reminder. Reply STOP to opt out."
            )
            outbound = OutboundMessage(
                channel="sms",
                recipient=norm_phone,
                text=msg_text,
                idempotency_key=f"admin-sms-test:{request_id}",
                template_params={"name": "Test Customer", "amount": "₹1,500.00", "due_date": now.strftime("%d %b %Y"), "loan_id": "TEST-LN"},
            )
            try:
                res = provider.send(outbound)
                outcome = "accepted" if res.accepted else "unknown" if res.error_code == "ambiguous_timeout" else "failed"
                prov_id = res.provider_message_id
                err_code = res.error_code
            except Exception as e:
                outcome = "failed"
                prov_id = None
                err_code = str(e)

            with sqlite3.connect(self.settings.db_path) as conn:
                conn.execute(
                    "UPDATE sms_test_runs SET status = ?, provider_message_id = ?, error_code = ? WHERE request_id = ?",
                    (outcome, prov_id, err_code, request_id),
                )
                audit(conn, actor, "sms_test.finished", "sms_test", request_id, {
                    "status": outcome,
                    "error_code": err_code,
                    "provider_message_id": prov_id,
                })
                conn.commit()

        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM sms_test_runs WHERE request_id = ?", (request_id,)).fetchone()
            return {"success": True, "run": dict(row) if row else {}}

    def get_test_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        """Returns recent SMS test executions."""
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM sms_test_runs ORDER BY attempted_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_delivery_history(self, limit: int = 50) -> list[dict[str, Any]]:
        """Returns recent SMS message delivery attempts across reminder jobs."""
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT d.*, j.reminder_type, j.stage_name
                FROM message_deliveries d
                LEFT JOIN reminder_jobs j ON d.job_id = j.id
                WHERE d.channel = 'sms'
                ORDER BY d.created_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]
