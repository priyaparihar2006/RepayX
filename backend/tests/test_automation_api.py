"""Automation HTTP API: auth, imports, reminders, payments, settings, webhooks, inbound replies."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import replace
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from automation.providers.base import SendResult
from automation.webhooks import sign_generic, twilio_signature
from tests.automation_helpers import (
    AUTH,
    HEADER,
    csv_text,
    deliveries,
    import_csv,
    ist,
    jobs,
    make_service,
    meta_inbound_payload,
    meta_signature,
    meta_status_payload,
)
from tests.conftest import make_settings

# Far-future dates so tests that use the real clock stay valid.
FUTURE = ("CUST-1,Rahul Sharma,9876543210,rahul@example.com,LN-1,8500,2030-10-11,Pending,0,2030-10-10,"
          "16:00,Asia/Kolkata,yes,yes,yes,en,granted")
SECOND = ("CUST-2,Ananya Verma,9811287654,ananya@example.com,LN-2,4200,2030-11-05,pending,,,,"
          "Asia/Kolkata,yes,no,yes,en,unknown")


@pytest.fixture
def service(tmp_path):
    return make_service(tmp_path)


@pytest.fixture
def client(tmp_path, service):
    with TestClient(create_app(make_settings(tmp_path), automation=service)) as c:
        yield c


def upload(client, text: str, role="operator", **form):
    data = {k: (json.dumps(v) if isinstance(v, dict) else str(v).lower() if isinstance(v, bool) else v)
            for k, v in form.items()}
    return client.post("/api/imports/csv", headers=AUTH[role], data=data,
                       files={"file": ("customers.csv", text.encode(), "text/csv")})


# ---------------------------------------------------------------- 14: authorization


def test_endpoints_require_a_valid_key(client):
    assert client.get("/api/reminders").status_code == 401
    assert client.get("/api/reminders", headers={"Authorization": "Bearer nope-nope-nope-nope-nope"}).status_code == 401
    assert client.get("/api/reminders", headers=AUTH["viewer"]).status_code == 200


def test_roles_are_enforced(client):
    assert upload(client, csv_text(FUTURE), role="viewer").status_code == 403
    assert client.patch("/api/automation/settings", headers=AUTH["operator"], json={}).status_code == 403
    assert client.post("/api/automation/pause", headers=AUTH["operator"]).status_code == 403
    assert client.get("/api/audit", headers=AUTH["operator"]).status_code == 403
    assert client.post("/api/automation/pause", headers=AUTH["admin"]).status_code == 200
    me = client.get("/api/automation/me", headers=AUTH["operator"]).json()
    assert me == {"success": True, "name": "omar", "role": "operator"}


def test_no_configured_keys_refuses_everything(tmp_path):
    svc = make_service(tmp_path, api_keys={})
    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as c:
        r = c.get("/api/reminders", headers=AUTH["admin"])
    assert r.status_code == 503 and r.json()["error"]["code"] == "auth_not_configured"


def test_legacy_unsigned_inbound_routes_now_need_a_key(client):
    r = client.post("/api/omnichannel/inbound/whatsapp", json={"phone": "+919876543210", "message": "hi"})
    assert r.status_code == 401


# ---------------------------------------------------------------- 1, 2, 3, 6: import API


def test_import_creates_schedules_and_reports_summary(client, service):
    r = upload(client, csv_text(FUTURE, SECOND, "CUST-3,,123,,LN-3,0,bad,pending,,,,,,,,,"))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["total_rows"] == 3 and body["imported_rows"] == 2 and body["rejected_rows"] == 1
    assert body["reminders_scheduled"] == 1 + 6  # explicit for Rahul; policy reminders for Ananya
    assert {i["field"] for i in body["issues"] if i["severity"] == "error"} >= {"customer_name", "emi_amount", "due_date"}

    detail = client.get(f"/api/imports/{body['import_id']}", headers=AUTH["viewer"]).json()
    assert detail["import"]["status"] == "completed" and detail["import"]["uploaded_by"] == "omar"
    listing = client.get("/api/imports", headers=AUTH["viewer"]).json()
    assert listing["pagination"]["total"] == 1

    again = upload(client, csv_text(FUTURE, SECOND)).json()
    assert again["unchanged_rows"] == 2 and again["reminders_scheduled"] == 0
    assert client.get("/api/reminders", headers=AUTH["viewer"]).json()["pagination"]["total"] == 7


def test_dry_run_validates_without_saving(client):
    body = upload(client, csv_text(FUTURE), dry_run=True).json()
    assert body["status"] == "dry_run" and body["reminders_scheduled"] == 1
    assert client.get("/api/reminders", headers=AUTH["viewer"]).json()["pagination"]["total"] == 0


def test_preview_and_mapping_via_api(client):
    text = "ID,Full Name,Mobile,Loan,EMI,Due\nC1,Asha,9876500000,L1,100,2030-01-05\n"
    prev = client.post("/api/imports/preview", headers=AUTH["operator"],
                       files={"file": ("a.csv", text.encode(), "text/csv")}).json()
    assert "customer_id" in prev["missing_required"]
    r = upload(client, text, mapping={"customer_id": "ID", "loan_id": "Loan", "emi_amount": "EMI",
                                      "due_date": "Due", "phone_number": "Mobile", "customer_name": "Full Name"})
    assert r.status_code == 201 and r.json()["imported_rows"] == 1


@pytest.mark.parametrize("name,content,ctype,status,code", [
    ("data.xlsx", b"a,b", "application/vnd.ms-excel", 415, "unsupported_file_type"),
    ("data.csv", b"x" * (5 * 1024 * 1024 + 1), "text/csv", 413, "file_too_large"),
    ("data.csv", b"customer_id\n1\n", "text/csv", 422, "missing_columns"),
    ("data.csv", b"", "text/csv", 422, "empty_file"),
], ids=["wrong-extension", "too-large", "missing-columns", "empty"])
def test_file_validation_errors(client, name, content, ctype, status, code):
    r = client.post("/api/imports/csv", headers=AUTH["operator"], files={"file": (name, content, ctype)})
    assert r.status_code == status and r.json()["error"]["code"] == code


def test_bad_mapping_json_is_rejected(client):
    r = upload(client, csv_text(FUTURE), mapping="not-json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_mapping"


def test_issue_export_neutralizes_formulas(client):
    text = csv_text("=CMD|' /C calc'!A0,Eve,9876500000,,LN-X,100,2030-01-05,=1+1,,,,,,,,,")
    body = upload(client, text).json()
    r = client.get(f"/api/imports/{body['import_id']}/issues.csv", headers=AUTH["viewer"])
    assert r.status_code == 200
    for line in r.text.splitlines()[1:]:
        for cell in line.split(","):
            assert not cell.strip('"').startswith(("=", "+", "-", "@"))


# ---------------------------------------------------------------- reminder controls


def _first_job(client):
    return client.get("/api/reminders", headers=AUTH["viewer"]).json()["reminders"][0]


def test_reminder_detail_cancel_and_reschedule(client, service):
    upload(client, csv_text(FUTURE))
    job = _first_job(client)
    assert job["scheduled_at_local"] == "2030-10-10 16:00" and job["customer_name"] == "Rahul Sharma"

    bad = client.patch(f"/api/reminders/{job['id']}", headers=AUTH["operator"],
                       json={"scheduled_at_local": "2030-10-10T22:00"})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "outside_contact_window"
    past = client.patch(f"/api/reminders/{job['id']}", headers=AUTH["operator"],
                        json={"scheduled_at_local": "2020-10-10T12:00"})
    assert past.status_code == 422 and past.json()["error"]["code"] == "time_in_past"

    ok = client.patch(f"/api/reminders/{job['id']}", headers=AUTH["operator"],
                      json={"scheduled_at_local": "2030-10-10T11:30"})
    assert ok.status_code == 200
    detail = ok.json()
    assert detail["reminder"]["scheduled_at_utc"] == "2030-10-10T06:00:00Z" and detail["reminder"]["manual_override"]
    assert any(h["action"] == "reminder.rescheduled_by_user" for h in detail["history"])

    # An operator-chosen time survives a re-import of the same data.
    upload(client, csv_text(FUTURE))
    assert _first_job(client)["scheduled_at_utc"] == "2030-10-10T06:00:00Z"

    cancel = client.post(f"/api/reminders/{job['id']}/cancel", headers=AUTH["operator"], json={"reason": "customer called"})
    assert cancel.json()["reminder"]["status"] == "cancelled"
    again = client.post(f"/api/reminders/{job['id']}/cancel", headers=AUTH["operator"], json={"reason": "again"})
    assert again.status_code == 409
    retry = client.post(f"/api/reminders/{job['id']}/retry", headers=AUTH["operator"])
    assert retry.status_code == 409
    assert client.get("/api/reminders/does-not-exist", headers=AUTH["viewer"]).status_code == 404


def test_reminder_list_filters_and_validation(client):
    upload(client, csv_text(FUTURE, SECOND))
    r = client.get("/api/reminders?status=pending&reminder_type=overdue&page_size=2", headers=AUTH["viewer"]).json()
    assert r["pagination"]["total"] == 4 and len(r["reminders"]) == 2
    assert client.get("/api/reminders?status=bogus", headers=AUTH["viewer"]).status_code == 422
    assert client.get("/api/reminders?page_size=999", headers=AUTH["viewer"]).status_code == 422


# ---------------------------------------------------------------- payments


def test_manual_payment_requires_evidence_and_cancels_reminders(client):
    upload(client, csv_text(FUTURE))
    emi = client.get("/api/emis", headers=AUTH["viewer"]).json()["emis"][0]
    no_evidence = client.patch(f"/api/emis/{emi['emi_id']}/payment", headers=AUTH["operator"],
                               json={"payment_status": "paid"})
    assert no_evidence.status_code == 422 and no_evidence.json()["error"]["code"] == "evidence_required"
    r = client.patch(f"/api/emis/{emi['emi_id']}/payment", headers=AUTH["operator"],
                     json={"payment_status": "paid", "reference": "UTR-123"})
    assert r.status_code == 200
    assert r.json()["reminders_cancelled"] == 1 and r.json()["emi"]["payment_status_source"] == "manual"
    assert _first_job(client)["status"] == "cancelled"
    over = client.patch(f"/api/emis/{emi['emi_id']}/payment", headers=AUTH["operator"],
                        json={"payment_status": "partially_paid", "amount_paid": "99999", "note": "x"})
    assert over.status_code == 422


def test_payment_webhook_is_signed_and_idempotent(client, service):
    upload(client, csv_text(FUTURE))
    body = json.dumps({"event_id": "pay_1", "loan_id": "LN-1", "status": "paid", "reference": "rzp_1"}).encode()
    unsigned = client.post("/api/webhooks/payments", content=body)
    assert unsigned.status_code == 401
    headers = {"X-RepayX-Signature": sign_generic("payment-secret", body, int(time.time())),
               "Content-Type": "application/json"}
    first = client.post("/api/webhooks/payments", content=body, headers=headers)
    assert first.json()["result"] == "applied" and first.json()["reminders_cancelled"] == 1
    replay = client.post("/api/webhooks/payments", content=body, headers=headers)
    assert replay.json()["result"] == "duplicate"
    stale = {"X-RepayX-Signature": sign_generic("payment-secret", body, int(time.time()) - 10 * 86400)}
    assert client.post("/api/webhooks/payments", content=body, headers=stale).status_code == 401


# ---------------------------------------------------------------- settings, health, dashboard


def test_settings_validation_and_update(client):
    s = client.get("/api/automation/settings", headers=AUTH["viewer"]).json()
    assert s["settings"]["channel_strategy"] == "fallback" and s["app_timezone"] == "Asia/Kolkata"
    bad = client.patch("/api/automation/settings", headers=AUTH["admin"],
                       json={"contact_window_start": "20:00", "contact_window_end": "08:00"})
    assert bad.status_code == 422
    unknown = client.patch("/api/automation/settings", headers=AUTH["admin"], json={"nonsense": 1})
    assert unknown.status_code == 422
    upload(client, csv_text(SECOND))
    ok = client.patch("/api/automation/settings", headers=AUTH["admin"], json={"default_reminder_time": "11:00"})
    assert ok.status_code == 200 and ok.json()["reminders_updated"] == 6


def test_health_and_dashboard_reflect_real_data(client, service):
    upload(client, csv_text(FUTURE, SECOND))
    h = client.get("/api/automation/health", headers=AUTH["viewer"]).json()
    assert h["worker"]["alive"] is False and h["status"] == "degraded"
    service.tick()
    h = client.get("/api/automation/health", headers=AUTH["viewer"]).json()
    assert h["worker"]["alive"] is True and h["providers"]["whatsapp"]["ready"] is True
    live = client.get("/api/automation/health/live").json()
    assert live["worker_alive"] is True

    d = client.get("/api/automation/dashboard", headers=AUTH["viewer"]).json()
    assert d["customers_total"] == 2 and d["emis"]["total"] == 2
    assert d["reminders"]["scheduled_open"] == 7
    assert d["deliveries_by_channel"] == {"whatsapp": {}, "sms": {}, "email": {}}


# ---------------------------------------------------------------- 11: webhooks and inbound replies


def _send_due_reminder(service, tmp_path):
    """Import Rahul with a near-term schedule and run the worker so a WhatsApp message is accepted."""
    rahul = FUTURE.replace("2030-10-11", "2026-10-11").replace("2030-10-10", "2026-10-10")
    import_csv(service, csv_text(rahul), ist(2026, 10, 9, 10))
    service.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    return jobs(service)[0]


def test_meta_webhook_requires_valid_signature(client):
    body = meta_status_payload("wamid.X", "delivered")
    assert client.post("/api/webhooks/whatsapp", content=body).status_code == 401
    bad = {"X-Hub-Signature-256": meta_signature("wrong", body)}
    assert client.post("/api/webhooks/whatsapp", content=body, headers=bad).status_code == 401


def test_meta_verification_handshake(client):
    ok = client.get("/api/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "wa-verify-token",
                                                      "hub.challenge": "12345"})
    assert ok.status_code == 200 and ok.text == "12345"
    assert client.get("/api/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "x",
                                                        "hub.challenge": "1"}).status_code == 403


def test_delivery_status_progresses_forward_only_and_replays_are_ignored(client, service, tmp_path):
    job = _send_due_reminder(service, tmp_path)
    pid = deliveries(service, job["id"])["whatsapp"]["provider_message_id"]

    def post(status):
        body = meta_status_payload(pid, status)
        return client.post("/api/webhooks/whatsapp", content=body,
                           headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)}).json()

    assert post("delivered")["statuses"] == ["applied"]
    assert post("delivered")["statuses"] == ["duplicate"]
    assert post("read")["statuses"] == ["applied"]
    assert post("sent")["statuses"] == ["ignored"]  # late 'sent' must not regress 'read'
    d = deliveries(service, job["id"])["whatsapp"]
    assert d["status"] == "read" and d["delivered_at"] and d["read_at"]


def test_async_failure_reopens_job_for_fallback_channel(client, service, tmp_path):
    job = _send_due_reminder(service, tmp_path)
    pid = deliveries(service, job["id"])["whatsapp"]["provider_message_id"]
    body = meta_status_payload(pid, "failed", error_code=131026)
    client.post("/api/webhooks/whatsapp", content=body,
                headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)})
    assert jobs(service)[0]["status"] == "pending"
    # The webhook reopened the job at the real current time; run the worker at that time.
    service.policy.update({"contact_window_start": "00:00", "contact_window_end": "23:59"}, "asha")
    from automation.util import utcnow
    service.dispatcher.run_once(utcnow())
    d = deliveries(service, job["id"])
    assert d["whatsapp"]["status"] == "failed" and d["sms"]["status"] == "accepted"
    assert len(service.providers["whatsapp"].sent) == 1


def test_whatsapp_reply_paid_claim_flags_account_and_auto_replies(client, service, tmp_path):
    _send_due_reminder(service, tmp_path)
    body = meta_inbound_payload("+919876543210", "I have already paid yesterday", "wamid.IN1")
    r = client.post("/api/webhooks/whatsapp", content=body,
                    headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)})
    assert r.json()["messages"] == ["PAID_CLAIM"]
    with service.db.read() as conn:
        assert conn.execute("SELECT payment_claim_pending FROM emis").fetchone()[0] == 1
        assert conn.execute("SELECT payment_status FROM emis").fetchone()[0] == "pending"  # never auto-marked paid
        task = conn.execute("SELECT kind, priority FROM followup_tasks").fetchone()
    assert tuple(task) == ("verify_payment", "high")
    reply = service.providers["whatsapp"].sent[-1]
    assert reply.is_reply and "verify" in reply.text and "LN-1" in reply.text

    dup = client.post("/api/webhooks/whatsapp", content=body,
                      headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)})
    assert dup.json()["messages"] == ["duplicate"]

    comms = client.get("/api/communications?customer_id=CUST-1", headers=AUTH["viewer"]).json()["communications"]
    assert {c["kind"] for c in comms} == {"reminder", "customer_reply", "auto_reply"}


def test_promise_to_pay_records_commitment_with_db_amount(client, service, tmp_path):
    _send_due_reminder(service, tmp_path)
    body = meta_inbound_payload("+919876543210", "I will pay tomorrow", "wamid.IN2")
    client.post("/api/webhooks/whatsapp", content=body,
                headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)})
    with service.db.read() as conn:
        c = conn.execute("SELECT promised_date FROM payment_commitments").fetchone()
    assert c["promised_date"] is not None
    reply = service.providers["whatsapp"].sent[-1].text
    assert "₹8,500.00" in reply and "waive" not in reply.lower() and "discount" not in reply.lower()


def test_hardship_and_dispute_go_to_humans(client, service, tmp_path):
    _send_due_reminder(service, tmp_path)
    for i, text in enumerate(["I lost my job and need more time", "This is not my loan, stop harassing me"]):
        body = meta_inbound_payload("+919876543210", text, f"wamid.H{i}")
        client.post("/api/webhooks/whatsapp", content=body,
                    headers={"X-Hub-Signature-256": meta_signature("wa-app-secret", body)})
    f = client.get("/api/followups", headers=AUTH["viewer"]).json()["followups"]
    assert {x["kind"] for x in f} >= {"hardship", "dispute"}
    with service.db.read() as conn:
        assert conn.execute("SELECT reminders_on_hold FROM customers").fetchone()[0] == 1
    assert all(j["status"] != "pending" for j in jobs(service))

    dispute = next(x for x in f if x["kind"] == "dispute")
    r = client.post(f"/api/followups/{dispute['id']}/resolve", headers=AUTH["operator"],
                    json={"note": "Verified identity; loan is valid", "release_hold": True})
    assert r.status_code == 200


def test_twilio_sms_opt_out_is_signed_and_suppresses(client, service, tmp_path):
    _send_due_reminder(service, tmp_path)
    params = {"MessageSid": "SM1", "From": "+919876543210", "To": "+15550001111", "Body": "STOP"}
    url = "https://api.repayx.example/api/webhooks/sms"
    bad = client.post("/api/webhooks/sms", content=urlencode(params),
                      headers={"Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "bad"})
    assert bad.status_code == 401
    ok = client.post("/api/webhooks/sms", content=urlencode(params),
                     headers={"Content-Type": "application/x-www-form-urlencoded",
                              "X-Twilio-Signature": twilio_signature("twilio-token", url, params)})
    assert ok.status_code == 200 and ok.headers["X-RepayX-Intent"] == "OPT_OUT"
    with service.db.read() as conn:
        assert conn.execute("SELECT channel FROM suppressions").fetchone()[0] == "sms"


def test_twilio_status_callback_updates_delivery(client, service, tmp_path):
    service.providers["whatsapp"].problem = "off"
    job = _send_due_reminder(service, tmp_path)
    sid = deliveries(service, job["id"])["sms"]["provider_message_id"]
    params = {"MessageSid": sid, "MessageStatus": "undelivered", "ErrorCode": "30003"}
    url = "https://api.repayx.example/api/webhooks/sms"
    client.post("/api/webhooks/sms", content=urlencode(params),
                headers={"Content-Type": "application/x-www-form-urlencoded",
                         "X-Twilio-Signature": twilio_signature("twilio-token", url, params)})
    d = deliveries(service, job["id"])["sms"]
    assert d["status"] == "failed" and d["error_code"] == "twilio_30003"


def test_mailgun_bounce_marks_failed_and_suppresses(client, service, tmp_path):
    service.providers["whatsapp"].problem = "off"
    service.providers["sms"].problem = "off"
    job = _send_due_reminder(service, tmp_path)
    mid = deliveries(service, job["id"])["email"]["provider_message_id"]
    ts, token = str(int(time.time())), "tok123"
    import hashlib, hmac
    sig = hmac.new(b"mailgun-key", f"{ts}{token}".encode(), hashlib.sha256).hexdigest()
    payload = {"signature": {"timestamp": ts, "token": token, "signature": sig},
               "event-data": {"event": "failed", "severity": "permanent", "reason": "bounce",
                              "message": {"headers": {"message-id": mid}}}}
    r = client.post("/api/webhooks/email", json=payload)
    assert r.json()["result"] == "applied"
    with service.db.read() as conn:
        assert conn.execute("SELECT channel FROM suppressions").fetchone()[0] == "email"
    payload["signature"]["signature"] = "0" * 64
    assert client.post("/api/webhooks/email", json=payload).status_code == 401


def test_unknown_sender_creates_followup(client, service):
    body = json.dumps({"type": "inbound", "from": "+919999999999", "text": "hello", "message_id": "m-1"}).encode()
    headers = {"X-RepayX-Signature": sign_generic("sms-secret", body, int(time.time()))}
    r = client.post("/api/webhooks/sms", content=body, headers=headers)
    assert r.status_code == 200
    f = client.get("/api/followups", headers=AUTH["viewer"]).json()["followups"]
    assert f[0]["kind"] == "unmatched_reply" and "9999999999" not in f[0]["reason"]


# ---------------------------------------------------------------- 14: sensitive data


def test_responses_and_logs_do_not_expose_full_contacts(client, service, tmp_path, caplog):
    caplog.set_level(logging.INFO)
    _send_due_reminder(service, tmp_path)
    upload(client, csv_text(SECOND))
    dumps = [
        client.get("/api/reminders", headers=AUTH["viewer"]).text,
        client.get(f"/api/reminders/{jobs(service)[0]['id']}", headers=AUTH["viewer"]).text,
        client.get("/api/automation/dashboard", headers=AUTH["viewer"]).text,
        client.get("/api/communications", headers=AUTH["viewer"]).text,
        client.get("/api/audit", headers=AUTH["admin"]).text,
        caplog.text,
    ]
    for text in dumps:
        for secret in ("9876543210", "rahul@example.com", "9811287654", "ananya@example.com"):
            assert secret not in text, secret
