"""Unit and integration tests for RepayX CSV-based WhatsApp message scheduling.

Verifies all 16 required test scenarios:
1. Upload provided CSV.
2. All 4 customers imported correctly.
3. Nans scheduled for 10:45 IST.
4. Nandini scheduled for 11:00 IST.
5. Siddharth schedule is null.
6. Ajay schedule is null.
7. Empty fields not converted into 'null' or 'undefined' strings.
8. Null schedule times never trigger automatic sending.
9. Invalid time formats rejected.
10. Messages do not execute before their scheduled time.
11. Scheduled messages execute only once (idempotent).
12. Jobs survive application / backend restart.
13. Disconnected WhatsApp prevents sending and retains pending job.
14. Failed sends logged correctly with last_error and status.
15. Duplicate CSV uploads do not create duplicate scheduled messages.
16. Displays accurate scheduling statistics across states.
"""

from __future__ import annotations

import io
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pytest
from services.csv_scheduler_service import (
    CSVSchedulerService,
    normalize_nullable_field,
)
from services.whatsapp_service import WhatsAppService, WhatsAppSettings

TEST_CSV_CONTENT = """customer_id,customer_name,phone_number,loan_id,unpaid_amount,due_date,days_past_due,payment_status,probability_of_default,risk_category,payment_link,scheduled_message_time,timezone
RX-TEST-1001,Nans,+919058802116,LN-TEST-5001,12500,2026-09-15,25,UNPAID,0.86,HIGH,https://example.com/repay/RX-TEST-1001,10:45,Asia/Kolkata
RX-TEST-1002,Nandini,+919410085066,LN-TEST-5002,8500,2026-09-25,15,OVERDUE,0.74,HIGH,https://example.com/repay/RX-TEST-1002,11:00,Asia/Kolkata
RX-TEST-1003,Siddharth,+919105830551,LN-TEST-5003,6200,2026-10-05,5,UNPAID,0.58,MEDIUM,https://example.com/repay/RX-TEST-1003,,Asia/Kolkata
RX-TEST-1004,Ajay,+918077815522,LN-TEST-5004,15750,2026-09-10,30,OVERDUE,0.93,HIGH,https://example.com/repay/RX-TEST-1004,,Asia/Kolkata
"""


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    return tmp_path / "test_whatsapp.sqlite3"


@pytest.fixture
def scheduler(temp_db: Path) -> CSVSchedulerService:
    return CSVSchedulerService(db_path=temp_db)


@pytest.fixture
def mock_whatsapp_service(temp_db: Path) -> MagicMock:
    service = MagicMock()
    service.settings = WhatsAppSettings(db_path=temp_db)
    service.status.return_value = {"connected": True, "ready": True, "status": "CONNECTED"}
    service.send.return_value = {"status": "delivered", "provider_id": "test_msg_id_123"}
    return service


def test_scenario_1_and_2_import_all_four_customers(scheduler: CSVSchedulerService):
    """Scenario 1 & 2: Upload CSV and confirm all 4 customers imported correctly."""
    result = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    assert result["success"] is True
    records = result["records"]
    assert len(records) == 4
    names = [r["customer_name"] for r in records]
    assert names == ["Nans", "Nandini", "Siddharth", "Ajay"]


def test_scenario_3_and_4_nans_and_nandini_scheduled_time(scheduler: CSVSchedulerService):
    """Scenario 3 & 4: Confirm Nans is scheduled for 10:45 IST and Nandini for 11:00 IST."""
    result = scheduler.parse_csv_content(TEST_CSV_CONTENT, target_date_str="2026-10-10")
    records = {r["customer_name"]: r for r in result["records"]}

    nans = records["Nans"]
    assert nans["scheduled_message_time"] == "10:45"
    assert nans["timezone"] == "Asia/Kolkata"
    assert nans["scheduled_message_at"] == "2026-10-10T10:45:00+05:30"

    nandini = records["Nandini"]
    assert nandini["scheduled_message_time"] == "11:00"
    assert nandini["timezone"] == "Asia/Kolkata"
    assert nandini["scheduled_message_at"] == "2026-10-10T11:00:00+05:30"


def test_scenario_5_and_6_siddharth_and_ajay_null_schedule(scheduler: CSVSchedulerService):
    """Scenario 5 & 6: Confirm Siddharth and Ajay schedule times are null."""
    result = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    records = {r["customer_name"]: r for r in result["records"]}

    siddharth = records["Siddharth"]
    assert siddharth["scheduled_message_time"] is None
    assert siddharth["scheduled_message_at"] is None
    assert siddharth["schedule_status"] == "UNSCHEDULED"

    ajay = records["Ajay"]
    assert ajay["scheduled_message_time"] is None
    assert ajay["scheduled_message_at"] is None
    assert ajay["schedule_status"] == "UNSCHEDULED"


def test_scenario_7_empty_fields_become_none_not_string(scheduler: CSVSchedulerService):
    """Scenario 7: Confirm empty/whitespace fields become None, never 'null' or 'undefined'."""
    assert normalize_nullable_field("") is None
    assert normalize_nullable_field("   ") is None
    assert normalize_nullable_field("null") is None
    assert normalize_nullable_field("undefined") is None
    assert normalize_nullable_field("NaN") is None
    assert normalize_nullable_field(None) is None
    assert normalize_nullable_field("10:45") == "10:45"

    csv_with_blanks = """customer_id,customer_name,phone_number,loan_id,unpaid_amount,scheduled_message_time,payment_link
C1,Alice,+919876543210,,1000,   ,
"""
    parsed = scheduler.parse_csv_content(csv_with_blanks)["records"][0]
    assert parsed["loan_id"] is None
    assert parsed["scheduled_message_time"] is None
    assert parsed["payment_link"] is None
    assert parsed["loan_id"] != "null"
    assert parsed["scheduled_message_time"] != "undefined"


def test_scenario_8_null_schedule_times_never_auto_send(
    scheduler: CSVSchedulerService,
    mock_whatsapp_service: MagicMock,
):
    """Scenario 8: Confirm null schedule times never trigger automatic sending."""
    parsed = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    scheduler.save_confirmed_schedules(parsed["records"])

    # Process due jobs
    res = scheduler.process_due_jobs(mock_whatsapp_service)

    # Siddharth and Ajay must NOT have been sent
    with sqlite3.connect(scheduler.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT customer_name, status FROM scheduled_messages WHERE scheduled_message_time IS NULL")
        rows = cursor.fetchall()
        for name, status in rows:
            assert status == "UNSCHEDULED"


def test_scenario_9_invalid_time_formats_rejected(scheduler: CSVSchedulerService):
    """Scenario 9: Confirm invalid time formats are rejected."""
    bad_csv = """customer_id,customer_name,phone_number,unpaid_amount,scheduled_message_time
C1,Bob,+919876543210,500,25:70
C2,Charlie,+919876543211,600,10:65
C3,Dave,+919876543212,700,noon
"""
    parsed = scheduler.parse_csv_content(bad_csv)["records"]
    for row in parsed:
        assert row["schedule_status"] == "INVALID_TIME"
        assert row["is_valid"] is False
        assert any("scheduled_message_time" in err for err in row["validation_errors"])


def test_scenario_10_messages_do_not_execute_before_scheduled_time(
    scheduler: CSVSchedulerService,
    mock_whatsapp_service: MagicMock,
):
    """Scenario 10: Confirm messages do not execute before their scheduled time."""
    # Schedule a customer for 2 hours in the future
    future_time = datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(hours=2)
    time_str = future_time.strftime("%H:%M")
    csv_future = f"""customer_id,customer_name,phone_number,unpaid_amount,scheduled_message_time,timezone
CFUTURE,FutureUser,+919058802116,5000,{time_str},Asia/Kolkata
"""
    parsed = scheduler.parse_csv_content(csv_future)["records"]
    assert parsed[0]["schedule_status"] == "SCHEDULED"
    scheduler.save_confirmed_schedules(parsed)

    # Trigger worker
    res = scheduler.process_due_jobs(mock_whatsapp_service)
    assert res["processed_count"] == 0
    mock_whatsapp_service.send.assert_not_called()


def test_scenario_11_scheduled_message_executes_only_once(
    scheduler: CSVSchedulerService,
    mock_whatsapp_service: MagicMock,
):
    """Scenario 11: Confirm a scheduled message executes only once (idempotent)."""
    # Schedule a customer for 1 minute in the past
    past_time = datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(minutes=1)
    past_iso = past_time.isoformat()

    with sqlite3.connect(scheduler.db_path) as conn:
        conn.execute(
            """
            INSERT INTO scheduled_messages (
                schedule_id, customer_id, customer_name, phone_number, unpaid_amount,
                scheduled_message_at, message_text, status, created_at, updated_at
            ) VALUES ('sched_once', 'C_ONCE', 'OnceUser', '+919058802116', 1000, ?, 'Hello', 'SCHEDULED', 'now', 'now')
            """,
            (past_iso,),
        )
        conn.commit()

    # First run: should dispatch
    res1 = scheduler.process_due_jobs(mock_whatsapp_service)
    assert res1["processed_count"] == 1
    assert mock_whatsapp_service.send.call_count == 1

    # Second run: must NOT dispatch again!
    res2 = scheduler.process_due_jobs(mock_whatsapp_service)
    assert res2["processed_count"] == 0
    assert mock_whatsapp_service.send.call_count == 1  # Still 1


def test_scenario_12_jobs_survive_backend_restart(temp_db: Path):
    """Scenario 12: Confirm jobs survive application / backend restart."""
    # Instance 1: Create schedule
    scheduler1 = CSVSchedulerService(db_path=temp_db)
    parsed = scheduler1.parse_csv_content(TEST_CSV_CONTENT, target_date_str="2030-01-01")
    scheduler1.save_confirmed_schedules(parsed["records"])

    # Simulate restart by instantiating fresh scheduler pointing to same DB
    scheduler2 = CSVSchedulerService(db_path=temp_db)
    loaded = scheduler2.get_schedules()
    assert loaded["total"] == 4
    assert loaded["stats"]["scheduled_messages"] == 2
    assert loaded["stats"]["unscheduled_customers"] == 2


def test_scenario_13_disconnected_whatsapp_prevents_sending(
    scheduler: CSVSchedulerService,
    mock_whatsapp_service: MagicMock,
):
    """Scenario 13: Confirm disconnected WhatsApp prevents sending and retains pending job."""
    mock_whatsapp_service.status.return_value = {"connected": False, "ready": False}

    past_time = datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(minutes=1)
    with sqlite3.connect(scheduler.db_path) as conn:
        conn.execute(
            """
            INSERT INTO scheduled_messages (
                schedule_id, customer_id, customer_name, phone_number, unpaid_amount,
                scheduled_message_at, message_text, status, created_at, updated_at
            ) VALUES ('sched_offline', 'C_OFFLINE', 'OfflineUser', '+919058802116', 1000, ?, 'Hello', 'SCHEDULED', 'now', 'now')
            """,
            (past_time.isoformat(),),
        )
        conn.commit()

    res = scheduler.process_due_jobs(mock_whatsapp_service)
    assert res["processed_count"] == 0
    mock_whatsapp_service.send.assert_not_called()

    # Verify job was NOT marked sent
    with sqlite3.connect(scheduler.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, last_error FROM scheduled_messages WHERE schedule_id = 'sched_offline'")
        status, err = cursor.fetchone()
        assert status == "PAUSED"
        assert "disconnected" in err.lower()


def test_scenario_14_failed_sends_logged_correctly(
    scheduler: CSVSchedulerService,
    mock_whatsapp_service: MagicMock,
):
    """Scenario 14: Confirm failed sends are logged correctly with error and status."""
    mock_whatsapp_service.send.side_effect = Exception("Bridge network timeout")

    past_time = datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(minutes=1)
    with sqlite3.connect(scheduler.db_path) as conn:
        conn.execute(
            """
            INSERT INTO scheduled_messages (
                schedule_id, customer_id, customer_name, phone_number, unpaid_amount,
                scheduled_message_at, message_text, status, created_at, updated_at
            ) VALUES ('sched_fail', 'C_FAIL', 'FailUser', '+919058802116', 1000, ?, 'Hello', 'SCHEDULED', 'now', 'now')
            """,
            (past_time.isoformat(),),
        )
        conn.commit()

    scheduler.process_due_jobs(mock_whatsapp_service)

    with sqlite3.connect(scheduler.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, last_error, attempt_count FROM scheduled_messages WHERE schedule_id = 'sched_fail'")
        status, err, attempts = cursor.fetchone()
        assert status == "FAILED"
        assert "Bridge network timeout" in err
        assert attempts >= 1


def test_scenario_15_duplicate_csv_uploads_do_not_duplicate_messages(scheduler: CSVSchedulerService):
    """Scenario 15: Confirm duplicate CSV uploads do not create duplicate scheduled messages."""
    parsed1 = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    scheduler.save_confirmed_schedules(parsed1["records"])

    # Upload second time
    parsed2 = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    res2 = scheduler.save_confirmed_schedules(parsed2["records"])

    with sqlite3.connect(scheduler.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM scheduled_messages")
        total_rows = cursor.fetchone()[0]
        assert total_rows == 4  # Exactly 4 records, not 8!


def test_scenario_16_accurate_scheduling_and_message_statistics(scheduler: CSVSchedulerService):
    """Scenario 16: Confirm accurate scheduling and message statistics across states."""
    parsed = scheduler.parse_csv_content(TEST_CSV_CONTENT)
    scheduler.save_confirmed_schedules(parsed["records"])

    stats = scheduler.get_schedule_stats()
    assert stats["total_imported"] == 4
    assert stats["valid_records"] == 4
    assert stats["unscheduled_customers"] == 2
    assert stats["invalid_records"] == 0
    assert stats["messages_sent"] == 0
    assert stats["messages_failed"] == 0

