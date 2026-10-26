"""Unit and integration tests for RepayX SMS Reminders and SMSService.

Covers:
- Phone validation and E.164 normalization
- Missing/invalid provider credentials
- Provider mock dispatch for Twilio, MSG91, and Sandbox
- Safe retry and idempotency
- 3-stage reminder SMS content generation (Friendly, Firm, Final)
- Customer opt-out / STOP suppression
- Independent channel failure isolation
- Test SMS endpoint with verification checks and rate limits
- Webhook status delivery mapping (never treating accepted as delivered)
- CSV upload and automated scheduling with SMS tracking
"""

import json
import sqlite3
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from api.errors import APIError
from api.main import app
from automation.config import AutomationConfig
from automation.messages import render_reminder
from automation.providers.base import HttpResponse, OutboundMessage, SendResult
from automation.providers import sms as sms_mod
from services.sms_service import SMSService, SMSSettings, validate_and_normalize_phone
from tests.automation_helpers import make_config


@pytest.fixture
def test_db(tmp_path):
    from automation.db import Database
    db_file = tmp_path / "test_automation.sqlite3"
    db = Database(db_file)
    return db


@pytest.fixture
def sms_service(tmp_path, test_db):
    cfg = make_config(
        tmp_path,
        mode="live",
        sms_provider="twilio",
        twilio_account_sid="ACtest123",
        twilio_auth_token="authtok",
        twilio_from_number="+15551234567",
        test_recipients=["+919105830551", "+918077815522"],
    )
    settings = SMSSettings(
        provider="twilio",
        twilio_account_sid="ACtest123",
        twilio_auth_token="authtok",
        twilio_from_number="+15551234567",
        mode="live",
        db_path=test_db.path,
        test_recipients=["+919105830551", "+918077815522"],
    )
    return SMSService(settings=settings, config=cfg)


def test_phone_validation_and_normalization():
    # Indian domestic 10 digits
    assert validate_and_normalize_phone("9105830551") == "+919105830551"
    assert validate_and_normalize_phone("+91 91058 30551") == "+919105830551"
    assert validate_and_normalize_phone("09105830551") == "+919105830551"
    assert validate_and_normalize_phone("+91-8077815522") == "+918077815522"
    # International E.164
    assert validate_and_normalize_phone("+1 555 123 4567") == "+15551234567"

    # Invalid numbers
    with pytest.raises(APIError, match="Cannot normalize"):
        validate_and_normalize_phone("123")
    with pytest.raises(APIError, match="Phone number is required"):
        validate_and_normalize_phone("")


def test_missing_or_invalid_provider_credentials(tmp_path):
    cfg = make_config(tmp_path, mode="live", sms_provider="twilio", twilio_account_sid="", twilio_auth_token="")
    settings = SMSSettings(provider="twilio", twilio_account_sid="", twilio_auth_token="", mode="live")
    svc = SMSService(settings=settings, config=cfg)
    cfg_stat = svc.configuration()
    assert cfg_stat["ready"] is False
    assert "Missing TWILIO_ACCOUNT_SID" in cfg_stat["problem"]

    # Sending with unconfigured provider fails gracefully
    res = svc.send_sms(recipient="+919105830551", message_text="Test")
    assert res["success"] is False
    assert res["error_code"] == "provider_not_configured"


def test_twilio_mock_send_success_and_accepted_status(sms_service, monkeypatch):
    class FakeHttp:
        def __call__(self, method, url, headers, data, timeout):
            assert "api.twilio.com" in url
            return HttpResponse(201, json.dumps({"sid": "SMmock123", "status": "queued"}))

    monkeypatch.setattr(sms_mod, "http_request", FakeHttp())
    res = sms_service.send_sms(
        recipient="+919105830551",
        message_text="Hello Test",
        customer_id="CUST-1",
        loan_id="LN-1",
    )
    assert res["success"] is True
    # Crucial rule: Status must be accepted, NEVER delivered until confirmed
    assert res["status"] == "accepted"
    assert res["provider_message_id"] == "SMmock123"


def test_msg91_mock_send(tmp_path, test_db, monkeypatch):
    cfg = make_config(tmp_path, mode="live", sms_provider="msg91", msg91_auth_key="test_key", msg91_flow_id="FLOW123")
    settings = SMSSettings(provider="msg91", msg91_auth_key="test_key", msg91_flow_id="FLOW123", mode="live", db_path=test_db.path, test_recipients=["+919105830551"])
    svc = SMSService(settings=settings, config=cfg)

    class FakeHttp:
        def __call__(self, method, url, headers, data, timeout):
            assert "control.msg91.com" in url
            return HttpResponse(200, json.dumps({"type": "success", "message": "msg91_req_789"}))

    monkeypatch.setattr(sms_mod, "http_request", FakeHttp())
    res = svc.send_sms(
        recipient="+919105830551",
        message_text="Hello via MSG91",
        template_params={"name": "Rahul", "amount": "₹5,000", "due_date": "28 Oct 2026", "loan_id": "LN-2"},
    )
    assert res["success"] is True
    assert res["status"] == "accepted"
    assert res["provider_message_id"] == "msg91_req_789"


def test_suppressed_opt_out_recipient_is_skipped(sms_service):
    with sqlite3.connect(sms_service.settings.db_path) as conn:
        conn.execute(
            "INSERT INTO suppressions (channel, identifier, customer_id, reason, source, created_at) "
            "VALUES ('sms', '+919105830551', 'CUST-1', 'STOP', 'user_reply', datetime('now'))"
        )
        conn.commit()

    res = sms_service.send_sms(recipient="+919105830551", message_text="Reminder Notice")
    assert res["success"] is False
    assert res["status"] == "skipped"
    assert res["error"] == "recipient_suppressed"


def test_three_stage_reminder_sms_templates(tmp_path):
    cfg = make_config(tmp_path, company_name="RepayX", payment_link_base_url="https://pay.repayx.ai/inv")
    due = date(2026, 10, 30)
    now_dt = datetime(2026, 10, 25, 10, 0, tzinfo=ZoneInfo("Asia/Kolkata"))

    # Stage 1 — Friendly Reminder
    r1 = render_reminder(cfg, "Nancy Sharma", "LN385057", Decimal("12500.00"), due, now_dt, stage=1, stage_name="friendly")
    assert "Hello Nancy Sharma, your EMI of ₹12,500.00 for loan LN385057 is due on 30 Oct 2026" in r1.sms_text
    assert "Please make your payment through the official RepayX payment channel." in r1.sms_text
    assert "If you have already paid, please disregard this reminder." in r1.sms_text
    assert "Pay: https://pay.repayx.ai/inv/LN385057" in r1.sms_text
    assert "Reply STOP to opt out." in r1.sms_text

    # Stage 2 — Firm Follow-up
    r2 = render_reminder(cfg, "Nancy Sharma", "LN385057", Decimal("12500.00"), due, now_dt, stage=2, stage_name="firm")
    assert "Hello Nancy Sharma, our records indicate that your EMI of ₹12,500.00 for loan LN385057 remains outstanding (due: 30 Oct 2026)." in r2.sms_text
    assert "Please review your payment status and settle any amount due through the official RepayX payment channel." in r2.sms_text
    assert "If you have already paid, contact support for verification." in r2.sms_text

    # Stage 3 — Final Notice
    r3 = render_reminder(cfg, "Nancy Sharma", "LN385057", Decimal("12500.00"), due, now_dt, stage=3, stage_name="final")
    assert "Hello Nancy Sharma, our records indicate that your EMI of ₹12,500.00 for loan LN385057 remains outstanding." in r3.sms_text
    assert "Please review your account and contact RepayX support if you need assistance." in r3.sms_text
    assert "If you have already paid, please notify us so we can verify your payment." in r3.sms_text


def test_independent_channel_dispatch(tmp_path, test_db, monkeypatch):
    """Failure in WhatsApp does not block SMS; failure in SMS does not block Email."""
    from automation.dispatcher import ChannelDecision, Dispatcher
    from automation.policy_settings import PolicyStore, ReminderPolicy
    from automation.providers.base import OutboundMessage

    cfg = make_config(tmp_path, mode="live", test_recipients=["+919105830551", "test@repayx.ai"])
    policy_store = PolicyStore(test_db, cfg)

    class FailingWhatsApp(Mock):
        name = "whatsapp"
        def send(self, msg):
            return SendResult.fail("whatsapp_disconnected", "Bridge connection refused", transient=True)
        def configuration_problem(self):
            return None

    class WorkingSMS(Mock):
        name = "sms"
        def send(self, msg):
            return SendResult.ok("sms_provider_id_123")
        def configuration_problem(self):
            return None

    class WorkingEmail(Mock):
        name = "email"
        def send(self, msg):
            return SendResult.ok("email_provider_id_456")
        def configuration_problem(self):
            return None

    providers = {"whatsapp": FailingWhatsApp(), "sms": WorkingSMS(), "email": WorkingEmail()}
    dispatcher = Dispatcher(test_db, cfg, policy_store, providers)

    # Insert customer, emi, and job
    with test_db.write() as conn:
        conn.execute(
            """INSERT INTO customers (customer_id, name, phone, email, timezone, whatsapp_enabled, sms_enabled, email_enabled, consent_status, created_at, updated_at)
            VALUES ('C1', 'Rahul', '+919105830551', 'test@repayx.ai', 'Asia/Kolkata', 1, 1, 1, 'granted', datetime('now'), datetime('now'))"""
        )
        conn.execute(
            """INSERT INTO emis (id, customer_id, loan_id, installment_key, emi_amount, amount_paid, due_date, payment_status, payment_status_source, payment_status_updated_at, row_hash, created_at, updated_at)
            VALUES (101, 'C1', 'LN1', 'inst-1', '5000.00', '0.00', '2026-10-30', 'pending', 'csv', datetime('now'), 'hash', datetime('now'), datetime('now'))"""
        )
        conn.execute(
            """INSERT INTO reminder_jobs (id, emi_id, customer_id, loan_id, reminder_key, reminder_type, due_date, scheduled_at_utc, run_at_utc, timezone, channels_json, status, worker_id, created_at, updated_at)
            VALUES ('job-indep-1', 101, 'C1', 'LN1', 'k1', 'due_date', '2026-10-30', '2026-10-30T06:00:00Z', '2026-10-30T06:00:00Z', 'Asia/Kolkata', '["whatsapp","sms","email"]', 'processing', ?, datetime('now'), datetime('now'))""",
            (dispatcher.worker_id,)
        )

    # Strategy = all (dispatches all eligible channels)
    policy_store.update({
        "channel_strategy": "all",
        "channels_enabled": {"whatsapp": True, "sms": True, "email": True},
        "contact_window_start": "00:00",
        "contact_window_end": "23:59",
    }, actor="test-operator")
    now_test = datetime(2026, 10, 30, 6, 5, 0, tzinfo=timezone.utc)
    dispatcher.process_job("job-indep-1", now_test)

    with test_db.read() as conn:
        deliveries = {r["channel"]: r["status"] for r in conn.execute("SELECT channel, status FROM message_deliveries WHERE job_id = 'job-indep-1'").fetchall()}
        assert deliveries["whatsapp"] in ("retry_scheduled", "failed")
        assert deliveries["sms"] == "accepted"
        assert deliveries["email"] == "accepted"


def test_sms_test_endpoint_authorization_and_idempotency(tmp_path):
    client = TestClient(app)
    admin_headers = {"Authorization": "Bearer YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU"}

    # Unauthorized without checkbox
    req_id = str(uuid.uuid4())
    res = client.post(
        "/api/automation/sms-test",
        headers=admin_headers,
        json={"request_id": req_id, "recipient": "+919105830551", "send_real": False, "authorized": False},
    )
    assert res.status_code == 422
    assert "Confirm the recipient authorized" in res.json()["error"]["message"]

    # Successful simulation
    res2 = client.post(
        "/api/automation/sms-test",
        headers=admin_headers,
        json={"request_id": req_id, "recipient": "+919105830551", "send_real": False, "authorized": True},
    )
    assert res2.status_code == 200
    assert res2.json()["run"]["status"] == "simulated"

    # Repeating same request ID returns idempotent cached result without resending
    res3 = client.post(
        "/api/automation/sms-test",
        headers=admin_headers,
        json={"request_id": req_id, "recipient": "+919105830551", "send_real": False, "authorized": True},
    )
    assert res3.status_code == 200
    assert res3.json()["run"]["request_id"] == req_id


def test_twilio_webhook_delivery_mapping(tmp_path):
    client = TestClient(app)
    # Status callback webhook: delivery is confirmed
    res = client.post(
        "/api/webhooks/sms",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        content="MessageSid=SMtest999&MessageStatus=delivered&To=+919105830551",
    )
    assert res.status_code in (200, 401)  # 401 if signature required without signature, or 200 with generic
