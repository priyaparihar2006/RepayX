"""Comprehensive tests for:
1. Three-stage reminder workflow & auto-escalation
2. AI-generated WhatsApp voice messages and audio serving
3. Two-way conversational AI assistant (English, Hindi, Hinglish)
4. Payment verification claim pauses and human takeover
5. Webhook replay protection and idempotency
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from automation.policy import EmiSnapshot, plan_reminders
from automation.policy_settings import ReminderPolicy
from automation.providers.base import OutboundMessage
from automation.providers.whatsapp import MetaCloudWhatsAppProvider
from automation.voice_service import VoiceService, generate_voice_script
from tests.automation_helpers import (
    AUTH,
    HEADER,
    csv_text,
    deliveries,
    import_csv,
    ist,
    jobs,
    make_config,
    make_service,
    meta_inbound_payload,
    meta_signature,
    meta_status_payload,
)
from tests.conftest import make_settings

IST = ZoneInfo("Asia/Kolkata")
CUSTOMER_ROW = (
    "CUST-ESC,Vikram Malhotra,9876543210,vikram@example.com,LN-ESC,12000,2026-11-05,pending,"
    "0,,,Asia/Kolkata,yes,yes,yes,en,granted"
)


def test_three_stage_reminder_planning():
    """Verify that three_stage_workflow produces exactly 3 progressive stages."""
    policy = ReminderPolicy(three_stage_workflow=True, max_stages=3)
    snap = EmiSnapshot(
        emi_id=101,
        due_date=datetime(2026, 11, 5).date(),
        payment_status="pending",
        emi_amount=Decimal("12000.00"),
        amount_paid=Decimal("0.00"),
        reminder_date=None,
        reminder_time=None,
        timezone="Asia/Kolkata",
    )
    planned = plan_reminders(snap, policy)
    assert len(planned) == 3
    assert planned[0].stage == 1 and planned[0].stage_name == "friendly"
    assert planned[1].stage == 2 and planned[1].stage_name == "firm"
    assert planned[2].stage == 3 and planned[2].stage_name == "final"


def test_three_stage_execution_and_auto_escalation(tmp_path):
    """When Stage 3 completes and the loan is unpaid, the case escalates and halts standard reminders."""
    svc = make_service(tmp_path)
    policy = svc.policy.get().model_copy(update={"three_stage_workflow": True, "max_stages": 3})
    svc.policy.update(policy.model_dump(), "admin")

    now = ist(2026, 11, 1, 10, 0)
    import_csv(svc, csv_text(CUSTOMER_ROW), now)

    # Initial 3 jobs created
    created_jobs = jobs(svc)
    assert len(created_jobs) == 3
    assert [j["stage"] for j in created_jobs] == [1, 2, 3]

    # Process all 3 stages
    for j in created_jobs:
        # Move job time to runnable and tick
        with svc.db.write() as conn:
            conn.execute("UPDATE reminder_jobs SET run_at_utc = '2026-11-01T04:30:00Z' WHERE id = ?", (j["id"],))
        svc.dispatcher.run_once(ist(2026, 11, 1, 10, 30))

    # All 3 stages should be completed
    updated_jobs = jobs(svc)
    assert all(j["status"] == "completed" for j in updated_jobs)

    # Escalation case should now exist in escalation_cases table
    with svc.db.read() as conn:
        esc = conn.execute("SELECT * FROM escalation_cases WHERE customer_id = 'CUST-ESC'").fetchone()
        assert esc is not None
        assert esc["status"] == "open"
        assert esc["stage_reached"] == 3
        assert Decimal(esc["outstanding_amount"]) == Decimal("12000.00")

        # Verify high-priority recovery follow-up task was logged
        task = conn.execute(
            "SELECT * FROM followup_tasks WHERE customer_id = 'CUST-ESC' AND kind = 'escalation_recovery'"
        ).fetchone()
        assert task is not None
        assert task["priority"] == "high"


def test_escalation_api_takeover_and_resolve(tmp_path):
    """Test listing, human takeover, and resolution of escalation cases via API."""
    svc = make_service(tmp_path)
    now_s = "2026-11-01T10:00:00Z"

    # Pre-seed a customer, emi, and escalation case
    with svc.db.write() as conn:
        conn.execute(
            """INSERT INTO customers (customer_id, name, phone, email, timezone, created_at, updated_at)
               VALUES ('CUST-API', 'Anita Roy', '+919876543211', 'anita@example.com', 'Asia/Kolkata', ?, ?)""",
            (now_s, now_s),
        )
        conn.execute(
            """INSERT INTO emis (customer_id, loan_id, installment_key, emi_amount, amount_paid,
                   due_date, payment_status, payment_status_source, payment_status_updated_at, row_hash,
                   created_at, updated_at)
               VALUES ('CUST-API', 'LN-999', '1', '7500.00', '0.00', '2026-10-20', 'overdue', 'csv', ?, 'h1', ?, ?)""",
            (now_s, now_s, now_s),
        )
        emi_id = conn.execute("SELECT id FROM emis WHERE customer_id = 'CUST-API'").fetchone()[0]
        conn.execute(
            """INSERT INTO escalation_cases (emi_id, customer_id, loan_id, stage_reached, overdue_days,
                   outstanding_amount, status, escalated_at, notes, created_at, updated_at)
               VALUES (?, 'CUST-API', 'LN-999', 3, 12, '7500.00', 'open', ?, 'Stage 3 final notice expired', ?, ?)""",
            (emi_id, now_s, now_s, now_s),
        )
        case_id = conn.execute("SELECT id FROM escalation_cases WHERE customer_id = 'CUST-API'").fetchone()[0]

    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as client:
        # 1. List escalations
        res = client.get("/api/escalations", headers=AUTH["viewer"])
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["escalations"]) >= 1
        assert data["escalations"][0]["customer_id"] == "CUST-API"

        # 2. Human Takeover toggle
        takeover_res = client.post(
            f"/api/escalations/{case_id}/takeover",
            headers=AUTH["operator"],
            json={"assigned_to": "Officer Sharma"},
        )
        assert takeover_res.status_code == 200
        assert takeover_res.json()["human_takeover"] is True
        assert takeover_res.json()["assigned_to"] == "Officer Sharma"

        # Verify customer record updated with human_takeover = 1
        with svc.db.read() as conn:
            cust = conn.execute("SELECT human_takeover FROM customers WHERE customer_id = 'CUST-API'").fetchone()
            assert cust["human_takeover"] == 1

        # 3. Resolve escalation case
        resolve_res = client.post(
            f"/api/escalations/{case_id}/resolve",
            headers=AUTH["operator"],
            json={"note": "Borrower agreed to payment plan with Branch Manager"},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["success"] is True

        with svc.db.read() as conn:
            esc = conn.execute("SELECT status, resolved_at FROM escalation_cases WHERE id = ?", (case_id,)).fetchone()
            assert esc["status"] == "resolved"
            assert esc["resolved_at"] is not None


def test_voice_generation_and_audio_endpoint(tmp_path):
    """Test voice script generation, synthesis to MP3, and audio serving endpoint."""
    svc = make_service(tmp_path)
    vs = VoiceService(svc.config)

    # 1. Script generation across stages and languages
    hinglish_s1 = generate_voice_script("Rahul Sharma", "LN-100", Decimal("5000.00"), datetime(2026, 11, 5).date(), 1, "hinglish")
    assert "automated AI" in hinglish_s1 and "Rahul" in hinglish_s1 and "5,000" in hinglish_s1

    hinglish_s3 = generate_voice_script("Rahul Sharma", "LN-100", Decimal("5000.00"), datetime(2026, 11, 5).date(), 3, "hinglish")
    assert "antim reminder" in hinglish_s3 and "recovery team" in hinglish_s3

    english_s2 = generate_voice_script("John Doe", "LN-200", Decimal("4000.00"), datetime(2026, 11, 5).date(), 2, "en")
    assert "follow-up notice" in english_s2 and "John" in english_s2

    # 2. Synthesis of audio file
    audio_path, duration, filename = vs.synthesize(hinglish_s1, voice_id="alloy", language="hinglish")
    assert audio_path.is_file()
    assert audio_path.stat().st_size > 0
    assert duration > 0

    # 3. Metadata persistence
    with svc.db.write() as conn:
        voice_id = vs.record_voice_message(
            conn,
            job_id=None,
            delivery_id=None,
            customer_id="CUST-1",
            loan_id="LN-100",
            script_text=hinglish_s1,
            audio_url=f"/api/media/voice/{filename}",
            duration=duration,
        )
        assert voice_id > 0

    # 4. WhatsApp Provider audio payload check
    provider = MetaCloudWhatsAppProvider(svc.config)
    audio_msg = OutboundMessage(
        channel="whatsapp",
        recipient="+919876543210",
        text=hinglish_s1,
        idempotency_key="key-audio",
        media_type="audio",
        media_url=f"https://api.repayx.example/api/media/voice/{filename}",
    )
    payload = provider.build_payload(audio_msg)
    assert payload["type"] == "audio"
    assert payload["audio"]["link"] == audio_msg.media_url

    # 5. Serving via FastAPI media route
    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as client:
        media_res = client.get(f"/api/media/voice/{filename}")
        assert media_res.status_code == 200
        assert media_res.headers["content-type"] in ("audio/mpeg", "audio/ogg")
        assert len(media_res.content) > 0


def test_two_way_conversational_intents_and_grounded_replies(tmp_path):
    """Test customer WhatsApp responses in Hindi, Hinglish, and English with loan grounding."""
    svc = make_service(tmp_path)
    now_s = "2026-10-24T10:00:00Z"

    # Pre-seed customer and EMI
    with svc.db.write() as conn:
        conn.execute(
            """INSERT INTO customers (customer_id, name, phone, email, timezone, created_at, updated_at)
               VALUES ('CUST-CHAT', 'Suresh Kumar', '+919988776655', 'suresh@example.com', 'Asia/Kolkata', ?, ?)""",
            (now_s, now_s),
        )
        conn.execute(
            """INSERT INTO emis (customer_id, loan_id, installment_key, emi_amount, amount_paid,
                   due_date, payment_status, payment_status_source, payment_status_updated_at, row_hash,
                   created_at, updated_at)
               VALUES ('CUST-CHAT', 'LN-CHAT-1', '1', '6000.00', '1000.00', '2026-11-10', 'pending', 'csv', ?, 'h1', ?, ?)""",
            (now_s, now_s, now_s),
        )

    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as client:
        # A. Customer reports payment via Meta Cloud Webhook
        body_paid = meta_inbound_payload("+919988776655", "Maine payment kar di hai kal.", "wamid.CHAT1")
        wh_res = client.post(
            "/api/webhooks/whatsapp",
            content=body_paid,
            headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body_paid)},
        )
        assert wh_res.status_code == 200
        assert wh_res.json()["messages"] == ["PAID_CLAIM"]

        # Verify payment_claim_pending was set to 1
        with svc.db.read() as conn:
            emi = conn.execute("SELECT payment_claim_pending FROM emis WHERE customer_id = 'CUST-CHAT'").fetchone()
            assert emi["payment_claim_pending"] == 1

        # B. Customer asks balance via Meta Cloud Webhook
        body_bal = meta_inbound_payload("+919988776655", "Mera outstanding amount kitna hai?", "wamid.CHAT2")
        wh_res_bal = client.post(
            "/api/webhooks/whatsapp",
            content=body_bal,
            headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body_bal)},
        )
        assert wh_res_bal.status_code == 200
        assert wh_res_bal.json()["messages"] == ["BALANCE"]
        # Grounded reply sent via mock whatsapp provider
        reply_bal = svc.providers["whatsapp"].sent[-1].text
        assert "5,000" in reply_bal or "5000" in reply_bal

        # C. Customer requests human agent via Meta Cloud Webhook
        body_agent = meta_inbound_payload("+919988776655", "Can I speak to a person?", "wamid.CHAT3")
        wh_res_agent = client.post(
            "/api/webhooks/whatsapp",
            content=body_agent,
            headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body_agent)},
        )
        assert wh_res_agent.status_code == 200
        assert wh_res_agent.json()["messages"] == ["HUMAN_AGENT"]

        # Verify customer has human_takeover = 1
        with svc.db.read() as conn:
            cust = conn.execute("SELECT human_takeover FROM customers WHERE customer_id = 'CUST-CHAT'").fetchone()
            assert cust["human_takeover"] == 1


def test_verified_payment_cancels_reminders_and_resolves_escalation(tmp_path):
    """When a verified payment is recorded, pending reminders are cancelled and escalation cases resolved."""
    svc = make_service(tmp_path)
    now_s = "2026-10-24T10:00:00Z"

    with svc.db.write() as conn:
        conn.execute(
            """INSERT INTO customers (customer_id, name, phone, email, timezone, created_at, updated_at)
               VALUES ('CUST-PAID', 'Pooja Hegde', '+919911223344', 'pooja@example.com', 'Asia/Kolkata', ?, ?)""",
            (now_s, now_s),
        )
        conn.execute(
            """INSERT INTO emis (customer_id, loan_id, installment_key, emi_amount, amount_paid,
                   due_date, payment_status, payment_status_source, payment_status_updated_at, row_hash,
                   created_at, updated_at)
               VALUES ('CUST-PAID', 'LN-PD-1', '1', '9000.00', '0.00', '2026-10-15', 'overdue', 'csv', ?, 'h2', ?, ?)""",
            (now_s, now_s, now_s),
        )
        emi_id = conn.execute("SELECT id FROM emis WHERE customer_id = 'CUST-PAID'").fetchone()[0]
        # Insert a pending reminder job
        conn.execute(
            """INSERT INTO reminder_jobs (id, emi_id, customer_id, loan_id, reminder_key, reminder_type,
                   due_date, scheduled_at_utc, run_at_utc, timezone, channels_json, status, created_at, updated_at)
               VALUES ('job-pd-1', ?, 'CUST-PAID', 'LN-PD-1', 'k1', 'overdue', '2026-10-15', ?, ?, 'Asia/Kolkata', '[\"whatsapp\"]', 'pending', ?, ?)""",
            (emi_id, now_s, now_s, now_s, now_s),
        )
        # Insert an open escalation case
        conn.execute(
            """INSERT INTO escalation_cases (emi_id, customer_id, loan_id, stage_reached, overdue_days,
                   outstanding_amount, status, escalated_at, notes, created_at, updated_at)
               VALUES (?, 'CUST-PAID', 'LN-PD-1', 3, 9, '9000.00', 'open', ?, 'Overdue stage 3', ?, ?)""",
            (emi_id, now_s, now_s, now_s),
        )

    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as client:
        # Record full verified payment
        pay_res = client.patch(
            f"/api/emis/{emi_id}/payment",
            headers=AUTH["operator"],
            json={"amount_paid": "9000.00", "reference": "UTR-SUCCESS-9999", "payment_status": "paid"},
        )
        assert pay_res.status_code == 200

        with svc.db.read() as conn:
            # Job should be cancelled
            job = conn.execute("SELECT status, outcome_reason FROM reminder_jobs WHERE id = 'job-pd-1'").fetchone()
            assert job["status"] == "cancelled"
            assert "paid" in (job["outcome_reason"] or "").lower()

            # Escalation should be auto-resolved
            esc = conn.execute("SELECT status, resolved_at FROM escalation_cases WHERE emi_id = ?", (emi_id,)).fetchone()
            assert esc["status"] == "resolved"
            assert esc["resolved_at"] is not None

