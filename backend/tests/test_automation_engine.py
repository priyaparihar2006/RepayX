"""Reminder engine behaviour: import, scheduling, dispatch, retries, idempotency, recovery."""

from __future__ import annotations

from datetime import timedelta

import pytest

from automation.importer import ImportRejected
from automation.payments import update_payment
from automation.providers.base import SendResult
from automation.util import csv_safe, format_inr, iso, normalize_phone, parse_date, parse_hhmm
from tests.automation_helpers import (
    HEADER,
    RAHUL,
    csv_text,
    deliveries,
    import_csv,
    ist,
    jobs,
    make_service,
)

T0 = ist(2026, 10, 9, 10, 0)  # import time: the day before Rahul's reminder


# ---------------------------------------------------------------- 1, 2: CSV import and timezones


def test_rahul_example_creates_one_explicit_job_at_4pm_ist(tmp_path):
    svc = make_service(tmp_path)
    summary = import_csv(svc, csv_text(RAHUL), T0)

    assert summary.imported_rows == 1 and summary.rejected_rows == 0
    assert summary.reconcile.scheduled == 1
    [job] = jobs(svc)
    assert job["reminder_type"] == "explicit"
    assert job["scheduled_at_utc"] == "2026-10-10T10:30:00Z"  # 16:00 IST
    assert job["status"] == "pending"
    assert job["timezone"] == "Asia/Kolkata"
    # Nothing is sent just because a CSV was uploaded.
    assert all(not p.sent for p in svc.providers.values())


def test_invalid_rows_are_reported_with_reasons_and_valid_rows_still_import(tmp_path):
    svc = make_service(tmp_path)
    rows = [
        RAHUL,
        "CUST-2,Bad Phone,12345,,LN-2,500,2026-10-20,pending,,,,,,,,,",
        "CUST-3,Bad Amount,9876500001,,LN-3,abc,2026-10-20,pending,,,,,,,,,",
        "CUST-4,Bad Date,9876500002,,LN-4,500,31-31-2026,pending,,,,,,,,,",
        "CUST-5,Bad Zone,9876500003,,LN-5,500,2026-10-20,pending,,,,Mars/Base,,,,,",
        "CUST-6,Bad Status,9876500004,,LN-6,500,2026-10-20,maybe,,,,,,,,,",
        "CUST-7,Duplicate,9876500005,,LN-1,500,2026-10-20,pending,,,,,,,,,",
        "CUST-8,Bad Time,9876500006,,LN-8,500,2026-10-20,pending,,,25:99,,,,,,",
    ]
    summary = import_csv(svc, csv_text(*rows), T0)

    assert summary.total_rows == 8
    assert summary.imported_rows == 1
    assert summary.rejected_rows == 7
    errors = {(i["row"], i["field"]) for i in summary.issues if i["severity"] == "error"}
    assert (3, "phone_number") in errors
    assert (4, "emi_amount") in errors
    assert (5, "due_date") in errors
    assert (6, "timezone") in errors
    assert (7, "payment_status") in errors
    assert (8, "loan_id") in errors  # duplicate of row 2
    assert (9, "reminder_time") in errors
    with svc.db.read() as conn:
        assert conn.execute("SELECT COUNT(DISTINCT row_number) FROM import_issues WHERE severity='error'").fetchone()[0] == 7
        assert conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 1


@pytest.mark.parametrize("content,code", [
    (b"", "empty_file"),
    (b"customer_id,customer_name\n1,A\n", "missing_columns"),
    (b"\x00\x01binary", "not_csv"),
    (HEADER.encode() + b"\n", "no_rows"),
    (b"a,a\n1,2\n", "duplicate_header"),
])
def test_whole_file_rejections(tmp_path, content, code):
    svc = make_service(tmp_path)
    with pytest.raises(ImportRejected) as exc:
        svc.importer.run(content, "x.csv", "t", svc.policy.get(), T0)
    assert exc.value.code == code


def test_custom_headers_with_explicit_mapping(tmp_path):
    svc = make_service(tmp_path)
    text = ("Cust Code;Borrower;Mobile No;Loan A/C;Instalment Amt;Due On;EMI State\n"
            "C-9;Meera Iyer;+91 98450 12345;LN-9;12,500.00;15/10/2026;Unpaid\n")
    mapping = {"customer_id": "Cust Code", "customer_name": "Borrower", "phone_number": "Mobile No",
               "loan_id": "Loan A/C", "emi_amount": "Instalment Amt", "due_date": "Due On",
               "payment_status": "EMI State"}
    summary = import_csv(svc, text, T0, user_mapping=mapping)

    assert summary.rejected_rows == 0 and summary.imported_rows == 1
    with svc.db.read() as conn:
        emi = conn.execute("SELECT * FROM emis").fetchone()
        cust = conn.execute("SELECT * FROM customers").fetchone()
    assert emi["due_date"] == "2026-10-15"  # DD/MM by default
    assert emi["emi_amount"] == "12500.00" and emi["payment_status"] == "pending"
    assert cust["phone"] == "+919845012345" and cust["timezone"] == "Asia/Kolkata"


def test_preview_suggests_mapping_and_masks_contacts(tmp_path):
    svc = make_service(tmp_path)
    preview = svc.importer.preview(csv_text(RAHUL).encode())
    assert preview["missing_required"] == []
    assert preview["suggested_mapping"]["phone_number"] == "phone_number"
    sample = preview["sample_rows"][0]
    assert "9876543210" not in str(sample) and "rahul@example.com" not in str(sample)


def test_customer_timezone_is_used_for_scheduling(tmp_path):
    svc = make_service(tmp_path)
    row = ("CUST-NY,Nina,+12125550123,,LN-NY,300,2026-10-20,pending,,2026-10-15,09:00,America/New_York,"
           "yes,yes,yes,en,granted")
    import_csv(svc, csv_text(row), T0)
    [job] = jobs(svc)
    assert job["scheduled_at_utc"] == "2026-10-15T13:00:00Z"  # 09:00 EDT


def test_policy_reminders_use_configured_default_time_not_4pm(tmp_path):
    svc = make_service(tmp_path)
    svc.policy.update({"default_reminder_time": "11:15"}, "admin")
    row = "CUST-P,Priya,9876511111,,LN-P,1000,2026-10-20,pending,,,,,yes,yes,yes,en,granted"
    import_csv(svc, csv_text(row), T0)
    got = [(j["reminder_type"], j["scheduled_at_utc"]) for j in jobs(svc)]
    assert got == [
        ("pre_due", "2026-10-19T05:45:00Z"),   # 11:15 IST the day before
        ("due_date", "2026-10-20T05:45:00Z"),
        ("overdue", "2026-10-23T05:45:00Z"),   # +3 days
        ("overdue", "2026-10-27T05:45:00Z"),   # +7 days
        ("overdue", "2026-11-03T05:45:00Z"),   # weekly repeat, capped at 4 overdue reminders
        ("overdue", "2026-11-10T05:45:00Z"),
    ]


def test_explicit_time_outside_contact_window_is_moved_and_annotated(tmp_path):
    svc = make_service(tmp_path)
    row = "CUST-Q,Quiet,9876522222,,LN-Q,1000,2026-10-20,pending,,2026-10-10,22:30,,yes,yes,yes,en,granted"
    import_csv(svc, csv_text(row), T0)
    [job] = jobs(svc)
    assert job["scheduled_at_utc"] == "2026-10-11T03:30:00Z"  # next day 09:00 IST
    assert "contact window" in job["schedule_note"]


def test_reminders_already_in_the_past_are_not_created(tmp_path):
    svc = make_service(tmp_path)
    row = "CUST-L,Late,9876533333,,LN-L,1000,2026-10-01,overdue,8,,,,yes,yes,yes,en,granted"
    summary = import_csv(svc, csv_text(row), T0)
    # pre-due (Sep 30), due date (Oct 1), +3 (Oct 4) and +7 (Oct 8) are past at import on Oct 9.
    assert summary.reconcile.skipped_past == 4
    # Weekly repeats keep an already-overdue customer covered: +14 and +21 remain.
    assert [j["reminder_key"] for j in jobs(svc)] == ["overdue:14:2026-10-01", "overdue:21:2026-10-01"]


# ---------------------------------------------------------------- 3, 4: automatic execution at the exact time


def test_worker_sends_only_when_the_scheduled_time_arrives(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)

    early = svc.dispatcher.run_once(ist(2026, 10, 10, 15, 59, 59))
    assert early["claimed"] == 0
    on_time = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0, 0))
    assert on_time["claimed"] == 1 and on_time["outcomes"] == {"completed": 1}

    wa = svc.providers["whatsapp"]
    [msg] = wa.sent
    assert msg.recipient == "+919876543210"
    assert msg.template_params == {"name": "Rahul Sharma", "amount": "₹8,500.00", "due_date": "11 Oct 2026",
                                   "loan_id": "LN-1"}
    assert "due on 11 Oct 2026" in msg.text and "https://pay.repayx.example/loan/LN-1" in msg.text
    [job] = jobs(svc)
    assert job["status"] == "completed"
    d = deliveries(svc, job["id"])
    assert d["whatsapp"]["status"] == "accepted"  # accepted, not "delivered"
    assert d["whatsapp"]["delivered_at"] is None
    # Fallback strategy: one successful channel is enough.
    assert not svc.providers["sms"].sent and not svc.providers["email"].sent


# ---------------------------------------------------------------- 5: restart and crash recovery


def test_pending_jobs_survive_a_restart(tmp_path):
    first = make_service(tmp_path)
    import_csv(first, csv_text(RAHUL), T0)
    del first

    second = make_service(tmp_path, worker_id="worker-after-restart")
    result = second.dispatcher.run_once(ist(2026, 10, 10, 16, 0, 30))
    assert result["outcomes"] == {"completed": 1}
    assert len(second.providers["whatsapp"].sent) == 1


def test_crash_during_send_is_recovered_without_resending(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    at = ist(2026, 10, 10, 16, 0)
    [job_id] = svc.dispatcher.claim(at, 10)
    with svc.db.write() as conn:  # simulate: delivery marked sending, then the process died
        conn.execute("""INSERT INTO message_deliveries (job_id, channel, idempotency_key, status, attempt_count,
                        provider, created_at, updated_at) VALUES (?, 'whatsapp', ?, 'sending', 1, 'meta_cloud', ?, ?)""",
                     (job_id, f"{job_id}:whatsapp", iso(at), iso(at)))

    restarted = make_service(tmp_path, worker_id="worker-2")
    later = at + timedelta(seconds=301)
    out = restarted.dispatcher.run_once(later)
    assert out["recovered"] == 1
    d = deliveries(restarted, job_id)
    assert d["whatsapp"]["status"] == "unknown"
    assert restarted.providers["whatsapp"].sent == []  # never resent
    assert restarted.providers["sms"].sent == []       # and no fallback while state is unknown
    assert jobs(restarted)[0]["outcome_reason"].startswith("delivery_state_unknown")


def test_concurrent_claims_never_double_process(tmp_path):
    a = make_service(tmp_path, worker_id="a")
    b = make_service(tmp_path, worker_id="b")
    import_csv(a, csv_text(RAHUL), T0)
    at = ist(2026, 10, 10, 16, 0)
    assert len(a.dispatcher.claim(at, 10)) == 1
    assert b.dispatcher.claim(at, 10) == []


# ---------------------------------------------------------------- 6: duplicate imports


def test_reimporting_the_same_csv_creates_no_duplicates(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    again = import_csv(svc, csv_text(RAHUL), T0 + timedelta(hours=1))
    assert again.unchanged_rows == 1 and again.imported_rows == 0
    assert again.reconcile.scheduled == 0
    assert len(jobs(svc)) == 1

    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    import_csv(svc, csv_text(RAHUL), ist(2026, 10, 10, 16, 5))
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 6))
    assert len(jobs(svc)) == 1
    assert len(svc.providers["whatsapp"].sent) == 1


# ---------------------------------------------------------------- 7, 8: payment status and changed dates


def test_payment_recorded_before_reminder_cancels_it(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:
        emi_id = conn.execute("SELECT id FROM emis").fetchone()[0]
        result = update_payment(conn, emi_id, "paid", None, "omar", "manual:omar", svc.policy.get(),
                                T0 + timedelta(hours=2), reference="UTR123")
    assert result.cancelled == 1
    [job] = jobs(svc)
    assert job["status"] == "cancelled" and job["outcome_reason"] == "payment_status_paid"
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert svc.providers["whatsapp"].sent == []


def test_dispatcher_rechecks_latest_payment_status_immediately_before_sending(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:  # updated by another system without reconciliation
        conn.execute("UPDATE emis SET payment_status = 'paid', amount_paid = emi_amount")
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert out["outcomes"] == {"cancelled": 1}
    assert svc.providers["whatsapp"].sent == []


def test_partial_payment_reminds_for_the_outstanding_amount(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:
        update_payment(conn, 1, "partially_paid", __import__("decimal").Decimal("3000"), "omar", "manual:omar",
                       svc.policy.get(), T0, note="Cash receipt #44")
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert svc.providers["whatsapp"].sent[0].template_params["amount"] == "₹5,500.00"


def test_changed_due_date_cancels_old_and_schedules_new_reminders(tmp_path):
    svc = make_service(tmp_path)
    row = "CUST-D,Dev,9876544444,,LN-D,1000,2026-10-20,pending,,,,,yes,yes,yes,en,granted"
    import_csv(svc, csv_text(row), T0)
    import_csv(svc, csv_text(row.replace("2026-10-20", "2026-10-25")), T0 + timedelta(minutes=5))
    by_status = {}
    for j in jobs(svc):
        by_status.setdefault(j["status"], []).append(j)
    assert all(j["outcome_reason"] == "due_date_changed" for j in by_status["cancelled"])
    assert {j["due_date"] for j in by_status["pending"]} == {"2026-10-25"}
    assert len(by_status["pending"]) == 6


def test_csv_cannot_override_a_verified_manual_payment(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:
        update_payment(conn, 1, "paid", None, "omar", "manual:omar", svc.policy.get(), T0, reference="UTR9")
    summary = import_csv(svc, csv_text(RAHUL.replace("8500,2026-10-11", "8600,2026-10-11")), T0 + timedelta(hours=1))
    assert any("Kept verified status" in i["message"] for i in summary.issues)
    with svc.db.read() as conn:
        assert conn.execute("SELECT payment_status FROM emis").fetchone()[0] == "paid"
    assert all(j["status"] == "cancelled" for j in jobs(svc))


def test_payment_update_csv_cancels_reminders(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    text = "loan_id,payment_status,amount_paid,payment_reference\nLN-1,paid,8500,UTR-77\nLN-404,paid,1,x\n"
    summary = import_csv(svc, text, T0 + timedelta(hours=1), import_type="payment_updates")
    assert summary.imported_rows == 1 and summary.rejected_rows == 1
    assert jobs(svc)[0]["status"] == "cancelled"


# ---------------------------------------------------------------- 9: independent channel outcomes


def test_all_channels_strategy_records_each_channel_independently(tmp_path):
    svc = make_service(tmp_path)
    svc.policy.update({"channel_strategy": "all"}, "admin")
    svc.providers["sms"].results = [SendResult.fail("twilio_21211", "Invalid 'To' number", transient=False)]
    import_csv(svc, csv_text(RAHUL), T0)
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert out["outcomes"] == {"partially_completed": 1}
    d = deliveries(svc, jobs(svc)[0]["id"])
    assert d["whatsapp"]["status"] == "accepted"
    assert d["sms"]["status"] == "failed" and d["sms"]["error_code"] == "twilio_21211"
    assert d["email"]["status"] == "accepted"
    assert "Overdue" not in svc.providers["email"].sent[0].subject
    assert "<table" in svc.providers["email"].sent[0].html


def test_fallback_moves_to_next_channel_only_after_a_permanent_failure(tmp_path):
    svc = make_service(tmp_path)
    svc.providers["whatsapp"].results = [SendResult.fail("meta_131026", "Undeliverable", transient=False)]
    import_csv(svc, csv_text(RAHUL), T0)
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert out["outcomes"] == {"completed": 1}
    d = deliveries(svc, jobs(svc)[0]["id"])
    assert d["whatsapp"]["status"] == "failed" and d["sms"]["status"] == "accepted"
    assert "email" not in d
    assert svc.providers["email"].sent == []


# ---------------------------------------------------------------- 10: timeouts and retries


def test_transient_failure_retries_with_backoff_then_succeeds(tmp_path):
    svc = make_service(tmp_path)
    svc.providers["whatsapp"].results = [SendResult.fail("meta_130429", "Rate limit hit", transient=True)]
    import_csv(svc, csv_text(RAHUL), T0)
    t = ist(2026, 10, 10, 16, 0)
    assert svc.dispatcher.run_once(t)["outcomes"] == {"retry": 1}
    [job] = jobs(svc)
    retry_at = job["next_retry_at"]
    assert retry_at >= iso(t + timedelta(seconds=60))
    assert svc.dispatcher.run_once(t + timedelta(seconds=30))["claimed"] == 0
    assert svc.providers["sms"].sent == []  # transient: no fallback yet
    out = svc.dispatcher.run_once(t + timedelta(seconds=120))
    assert out["outcomes"] == {"completed": 1}
    d = deliveries(svc, job["id"])["whatsapp"]
    assert d["status"] == "accepted" and d["attempt_count"] == 2
    assert len(svc.providers["whatsapp"].sent) == 2


def test_retries_are_bounded_and_end_in_dead_letter(tmp_path):
    svc = make_service(tmp_path)
    svc.policy.update({"channels_enabled": {"whatsapp": True, "sms": False, "email": False}}, "admin")
    svc.providers["whatsapp"].results = [SendResult.fail("meta_2", "Service unavailable", transient=True)] * 10
    import_csv(svc, csv_text(RAHUL), T0)
    t = ist(2026, 10, 10, 16, 0)
    outcomes = []
    for _ in range(6):
        out = svc.dispatcher.run_once(t)
        outcomes += list(out["outcomes"])
        t += timedelta(minutes=20)
    assert outcomes[-1] == "dead_letter" or "dead_letter" in outcomes
    assert len(svc.providers["whatsapp"].sent) == 3  # retry_max_attempts
    [job] = jobs(svc)
    assert job["status"] == "dead_letter"


def test_ambiguous_timeout_is_not_resent(tmp_path):
    svc = make_service(tmp_path)
    svc.providers["whatsapp"].results = [SendResult(accepted=False, error_code="ambiguous_timeout",
                                                    error_message="No response")]
    import_csv(svc, csv_text(RAHUL), T0)
    t = ist(2026, 10, 10, 16, 0)
    out = svc.dispatcher.run_once(t)
    assert out["outcomes"] == {"failed": 1}
    svc.dispatcher.run_once(t + timedelta(hours=1))
    assert len(svc.providers["whatsapp"].sent) == 1
    assert svc.providers["sms"].sent == []
    assert deliveries(svc, jobs(svc)[0]["id"])["whatsapp"]["status"] == "unknown"


def test_adapter_exception_is_treated_as_unknown_state(tmp_path):
    svc = make_service(tmp_path)
    svc.providers["whatsapp"].results = [RuntimeError("boom")]
    import_csv(svc, csv_text(RAHUL), T0)
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert deliveries(svc, jobs(svc)[0]["id"])["whatsapp"]["status"] == "unknown"


def test_manual_retry_resends_only_failed_channels(tmp_path):
    from automation.scheduler import retry_job
    svc = make_service(tmp_path)
    svc.policy.update({"channel_strategy": "all"}, "admin")
    svc.providers["sms"].results = [SendResult.fail("twilio_30003", "Unreachable", transient=False)]
    import_csv(svc, csv_text(RAHUL), T0)
    t = ist(2026, 10, 10, 16, 0)
    svc.dispatcher.run_once(t)
    job_id = jobs(svc)[0]["id"]
    with svc.db.write() as conn:
        retry_job(conn, job_id, "omar", t + timedelta(minutes=5))
    svc.dispatcher.run_once(t + timedelta(minutes=5))
    assert len(svc.providers["whatsapp"].sent) == 1 and len(svc.providers["email"].sent) == 1
    assert len(svc.providers["sms"].sent) == 2
    assert jobs(svc)[0]["status"] == "completed"


# ---------------------------------------------------------------- 12: opt-outs, quiet hours, invalid contacts


def test_suppressed_channel_is_skipped_and_next_channel_used(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:
        conn.execute("INSERT INTO suppressions (channel, identifier, reason, source, created_at) "
                     "VALUES ('whatsapp', '+919876543210', 'customer_opt_out', 'test', 'x')")
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    d = deliveries(svc, jobs(svc)[0]["id"])
    assert d["whatsapp"]["status"] == "skipped" and d["whatsapp"]["skip_reason"] == "recipient_suppressed"
    assert d["sms"]["status"] == "accepted"
    assert svc.providers["whatsapp"].sent == []


def test_revoked_consent_blocks_every_channel(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL.replace(",granted", ",revoked")), T0)
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert out["outcomes"] == {"skipped": 1}
    assert "consent_revoked" in jobs(svc)[0]["outcome_reason"]
    assert all(not p.sent for p in svc.providers.values())


def test_require_explicit_consent_blocks_unknown_consent(tmp_path):
    svc = make_service(tmp_path)
    svc.policy.update({"require_explicit_consent": True}, "admin")
    import_csv(svc, csv_text(RAHUL.replace(",granted", ",")), T0)
    assert svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))["outcomes"] == {"skipped": 1}


def test_job_outside_contact_window_is_deferred_not_sent(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    svc.policy.update({"contact_window_start": "09:00", "contact_window_end": "15:00"}, "admin")
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert out["outcomes"] == {"deferred": 1}
    [job] = jobs(svc)
    assert job["status"] == "pending" and job["run_at_utc"] == "2026-10-11T03:30:00Z"
    assert job["attempt_count"] == 0
    assert svc.providers["whatsapp"].sent == []


def test_missing_provider_configuration_skips_channel(tmp_path):
    svc = make_service(tmp_path)
    svc.providers["whatsapp"].problem = "Missing WHATSAPP_ACCESS_TOKEN."
    import_csv(svc, csv_text(RAHUL), T0)
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    d = deliveries(svc, jobs(svc)[0]["id"])
    assert d["whatsapp"]["skip_reason"] == "provider_not_configured" and d["sms"]["status"] == "accepted"


def test_test_mode_allowlist_blocks_real_customers(tmp_path):
    svc = make_service(tmp_path, test_recipients=("+910000000000",))
    import_csv(svc, csv_text(RAHUL), T0)
    svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))
    assert all(not p.sent for p in svc.providers.values())
    assert "test_mode_recipient_not_allowlisted" in jobs(svc)[0]["outcome_reason"]


def test_payment_claim_suppresses_reminders(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    with svc.db.write() as conn:
        conn.execute("UPDATE emis SET payment_claim_pending = 1")
    assert svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))["outcomes"] == {"skipped": 1}
    assert jobs(svc)[0]["outcome_reason"] == "payment_verification_pending"


# ---------------------------------------------------------------- 13: downtime and missed jobs


def test_job_far_past_its_time_after_downtime_is_marked_missed(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    out = svc.dispatcher.run_once(ist(2026, 10, 10, 18, 30))  # 150 min late, limit 120
    assert out["outcomes"] == {"missed": 1}
    assert svc.providers["whatsapp"].sent == []


def test_job_slightly_late_after_downtime_is_still_sent(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    assert svc.dispatcher.run_once(ist(2026, 10, 10, 16, 45))["outcomes"] == {"completed": 1}


def test_pre_due_reminder_is_not_sent_after_the_due_date(tmp_path):
    svc = make_service(tmp_path)
    svc.policy.update({"max_lateness_minutes": 7 * 24 * 60}, "admin")
    row = "CUST-P,Priya,9876511111,,LN-P,1000,2026-10-20,pending,,,,,yes,yes,yes,en,granted"
    import_csv(svc, csv_text(row), T0)
    out = svc.dispatcher.run_once(ist(2026, 10, 21, 12, 0))
    assert out["outcomes"]["skipped"] == 2  # pre-due and due-date reminders are stale
    assert out["outcomes"].get("completed") is None


def test_paused_automation_sends_nothing_until_resumed(tmp_path):
    svc = make_service(tmp_path)
    import_csv(svc, csv_text(RAHUL), T0)
    svc.policy.update({"automation_paused": True}, "admin")
    assert svc.dispatcher.run_once(ist(2026, 10, 10, 16, 0))["paused"] is True
    svc.policy.update({"automation_paused": False}, "admin")
    assert svc.dispatcher.run_once(ist(2026, 10, 10, 16, 1))["outcomes"] == {"completed": 1}


def test_settings_change_reschedules_pending_policy_reminders(tmp_path):
    from automation.scheduler import reconcile_all
    svc = make_service(tmp_path)
    row = "CUST-P,Priya,9876511111,,LN-P,1000,2026-10-20,pending,,,,,yes,yes,yes,en,granted"
    import_csv(svc, csv_text(row), T0)
    policy = svc.policy.update({"default_reminder_time": "12:00", "overdue_days": [5],
                                "overdue_repeat_every_days": 0}, "asha")
    with svc.db.write() as conn:
        result = reconcile_all(conn, policy, T0, "asha")
    assert result.updated == 2 and result.cancelled == 4 and result.scheduled == 1
    open_jobs = [j for j in jobs(svc) if j["status"] == "pending"]
    assert all(j["scheduled_at_utc"].endswith("06:30:00Z") for j in open_jobs)


# ---------------------------------------------------------------- utilities


def test_utilities():
    assert normalize_phone("98765 43210") == "+919876543210"
    assert normalize_phone("+1 (212) 555-0123") == "+12125550123"
    assert normalize_phone("12345") is None
    assert parse_date("11 Oct 2026").isoformat() == "2026-10-11"
    assert parse_date("10/11/2026", "MDY").isoformat() == "2026-10-11"
    assert parse_hhmm("4 PM").strftime("%H:%M") == "16:00" and parse_hhmm("16") is None
    assert format_inr(1234567.5) == "₹12,34,567.50"
    assert csv_safe("=HYPERLINK(1)") == "'=HYPERLINK(1)" and csv_safe("+91") == "'+91" and csv_safe("ok") == "ok"
