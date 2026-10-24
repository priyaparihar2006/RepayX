"""Shared fixtures for reminder-engine tests: a fixed clock, scripted providers, signed requests."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import replace
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from automation.config import AutomationConfig
from automation.providers.base import OutboundMessage, Provider, SendResult
from automation.service import AutomationService

IST = ZoneInfo("Asia/Kolkata")
ADMIN_KEY = "admin-key-0123456789abcdefghij"
OPERATOR_KEY = "operator-key-0123456789abcdefgh"
VIEWER_KEY = "viewer-key-0123456789abcdefghij"
AUTH = {
    "admin": {"Authorization": f"Bearer {ADMIN_KEY}"},
    "operator": {"Authorization": f"Bearer {OPERATOR_KEY}"},
    "viewer": {"Authorization": f"Bearer {VIEWER_KEY}"},
}

HEADER = ("customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,payment_status,"
          "days_past_due,reminder_date,reminder_time,timezone,whatsapp_enabled,sms_enabled,email_enabled,"
          "preferred_language,consent_status")
RAHUL = ("CUST-1,Rahul Sharma,9876543210,rahul@example.com,LN-1,8500,2026-10-11,Pending,0,2026-10-10,"
         "4:00 PM,Asia/Kolkata,yes,yes,yes,en,granted")


def ist(*args) -> datetime:
    return datetime(*args, tzinfo=IST)


def make_config(tmp_path: Path, **overrides) -> AutomationConfig:
    base = AutomationConfig()
    values = dict(
        db_path=tmp_path / "automation.sqlite3",
        mode="live",
        test_recipients=(),
        app_timezone="Asia/Kolkata",
        embedded_worker=False,
        api_keys={ADMIN_KEY: ("asha", "admin"), OPERATOR_KEY: ("omar", "operator"), VIEWER_KEY: ("vik", "viewer")},
        retry_max_attempts=3,
        retry_base_seconds=60,
        retry_max_seconds=600,
        provider_rate_per_second=0,
        lease_seconds=300,
        company_name="RepayX Finance",
        support_phone="1800-000-000",
        support_email="help@repayx.example",
        payment_link_base_url="https://pay.repayx.example/loan",
        payment_instructions="",
        whatsapp_app_secret="wa-app-secret",
        whatsapp_verify_token="wa-verify-token",
        twilio_auth_token="twilio-token",
        twilio_webhook_url="https://api.repayx.example/api/webhooks/sms",
        mailgun_webhook_signing_key="mailgun-key",
        sms_webhook_secret="sms-secret",
        payment_webhook_secret="payment-secret",
        whatsapp_provider="meta",
        sms_provider="twilio",
        email_provider="smtp",
    )
    values.update(overrides)
    return replace(base, **values)


class ScriptedProvider(Provider):
    """Returns queued results in order, then accepts. Exceptions in the queue are raised."""

    def __init__(self, channel: str, name: str | None = None):
        self.channel = channel
        self.name = name or {"whatsapp": "meta_cloud", "sms": "twilio", "email": "smtp"}[channel]
        self.results: list = []
        self.sent: list[OutboundMessage] = []
        self.problem: str | None = None

    def configuration_problem(self) -> str | None:
        return self.problem

    def send(self, message: OutboundMessage) -> SendResult:
        self.sent.append(message)
        if self.results:
            result = self.results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return SendResult.ok(f"{self.channel}-msg-{len(self.sent)}")


def make_providers() -> dict[str, ScriptedProvider]:
    return {ch: ScriptedProvider(ch) for ch in ("whatsapp", "sms", "email")}


def make_service(tmp_path: Path, providers=None, worker_id="worker-test", **config_overrides) -> AutomationService:
    return AutomationService(make_config(tmp_path, **config_overrides), providers or make_providers(), worker_id)


def import_csv(service: AutomationService, text: str, now: datetime, **kwargs):
    return service.importer.run(text.encode(), "test.csv", "tester", service.policy.get(), now, **kwargs)


def csv_text(*rows: str, header: str = HEADER) -> str:
    return "\n".join((header,) + rows) + "\n"


def jobs(service: AutomationService, **where) -> list[dict]:
    clause = " AND ".join(f"{k} = ?" for k in where)
    with service.db.read() as conn:
        rows = conn.execute(f"SELECT * FROM reminder_jobs {'WHERE ' + clause if clause else ''} ORDER BY scheduled_at_utc",
                            tuple(where.values())).fetchall()
    return [dict(r) for r in rows]


def deliveries(service: AutomationService, job_id: str) -> dict[str, dict]:
    with service.db.read() as conn:
        return {r["channel"]: dict(r) for r in conn.execute(
            "SELECT * FROM message_deliveries WHERE job_id = ?", (job_id,)).fetchall()}


def meta_signature(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def meta_status_payload(message_id: str, status: str, error_code: int | None = None) -> bytes:
    status_obj = {"id": message_id, "status": status, "timestamp": "1791600000", "recipient_id": "919876543210"}
    if error_code:
        status_obj["errors"] = [{"code": error_code, "title": "error"}]
    return json.dumps({"object": "whatsapp_business_account", "entry": [{"id": "1", "changes": [
        {"field": "messages", "value": {"messaging_product": "whatsapp", "statuses": [status_obj]}}]}]}).encode()


def meta_inbound_payload(sender: str, text: str, message_id: str) -> bytes:
    return json.dumps({"object": "whatsapp_business_account", "entry": [{"id": "1", "changes": [
        {"field": "messages", "value": {"messaging_product": "whatsapp", "messages": [
            {"from": sender.lstrip("+"), "id": message_id, "timestamp": "1791600000", "type": "text",
             "text": {"body": text}}]}}]}]}).encode()
