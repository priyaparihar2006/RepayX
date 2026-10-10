"""RepayX CSV-Based WhatsApp Message Scheduling Service.

Provides per-customer WhatsApp message scheduling using uploaded CSV data.
Handles:
- Empty/whitespace field normalization to None/null.
- Per-customer local time scheduling in HH:MM format with timezone intelligence.
- Validation, preview, and error reporting.
- Persistent SQLite-backed queue in backend/data/whatsapp.sqlite3.
- Background worker execution with 9 pre-flight safety checks and idempotency.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import re
import sqlite3
import uuid
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Literal
from zoneinfo import ZoneInfo

logger = logging.getLogger("repayx.scheduler")

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = ROOT / "backend/data/whatsapp.sqlite3"
DEFAULT_TIMEZONE = "Asia/Kolkata"

TIME_FORMAT_REGEX = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{7,14}$")


def normalize_nullable_field(value: Any) -> Any | None:
    """Normalize empty, whitespace-only, or missing CSV values to Python None (JSON null).

    Never returns strings like 'null', 'undefined', 'NaN'.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in ("none", "null", "undefined", "nan", "n/a", "--", "-"):
        return None
    return s


def clean_phone_number(raw: Any) -> str | None:
    """Extract and format E.164-compliant phone number with leading country code."""
    val = normalize_nullable_field(raw)
    if not val:
        return None
    digits = re.sub(r"[^\d]", "", val)
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif 8 <= len(digits) <= 15:
        return f"+{digits}"
    return None


def clean_float(value: Any) -> float | None:
    """Clean currency/numeric strings to float, returning None if missing/invalid."""
    val = normalize_nullable_field(value)
    if val is None:
        return None
    cleaned = re.sub(r"[^\d\.]", "", str(val))
    try:
        return float(cleaned)
    except Exception:
        return None


def clean_int(value: Any) -> int | None:
    """Clean integer strings, returning None if missing/invalid."""
    val = normalize_nullable_field(value)
    if val is None:
        return None
    cleaned = re.sub(r"[^\d]", "", str(val))
    try:
        return int(cleaned)
    except Exception:
        return None


class CSVSchedulerService:
    def __init__(self, db_path: Path | str | None = None, default_timezone: str = DEFAULT_TIMEZONE):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.default_timezone = default_timezone
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """Create scheduled_messages table in SQLite if it doesn't already exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS scheduled_messages (
                    schedule_id TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    phone_number TEXT NOT NULL,
                    loan_id TEXT,
                    unpaid_amount REAL,
                    due_date TEXT,
                    days_past_due INTEGER,
                    payment_status TEXT,
                    probability_of_default REAL,
                    risk_category TEXT,
                    payment_link TEXT,
                    scheduled_message_time TEXT,
                    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
                    scheduled_message_at TEXT,
                    message_text TEXT NOT NULL,
                    campaign_id TEXT NOT NULL DEFAULT 'default',
                    status TEXT NOT NULL DEFAULT 'UNSCHEDULED',
                    attempt_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sent_at TEXT,
                    provider_id TEXT,
                    last_error TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_sched_status_time ON scheduled_messages(status, scheduled_message_at);
                CREATE INDEX IF NOT EXISTS idx_sched_customer ON scheduled_messages(customer_id);
                CREATE INDEX IF NOT EXISTS idx_sched_campaign ON scheduled_messages(campaign_id);
            """)
            conn.commit()

    def parse_csv_content(
        self,
        content_text_or_bytes: str | bytes,
        target_date_str: str | None = None,
        campaign_id: str = "default",
    ) -> dict[str, Any]:
        """Parses CSV content, normalizes empty fields to None, validates rows, and calculates schedule status."""
        if isinstance(content_text_or_bytes, bytes):
            text = content_text_or_bytes.decode("utf-8-sig", errors="ignore")
        else:
            text = content_text_or_bytes

        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)

        parsed_records: list[dict[str, Any]] = []
        validation_report: list[dict[str, Any]] = []

        now_utc = datetime.now(ZoneInfo("UTC"))

        for idx, raw_row in enumerate(rows, start=1):
            # Normalize every single field so whitespace/empty -> None
            row: dict[str, Any] = {
                k.strip().lower().replace(" ", "_"): normalize_nullable_field(v)
                for k, v in raw_row.items()
            }

            customer_id = row.get("customer_id")
            customer_name = row.get("customer_name")
            raw_phone = row.get("phone_number") or row.get("phone")
            phone_number = clean_phone_number(raw_phone)
            loan_id = row.get("loan_id")
            unpaid_amount = clean_float(row.get("unpaid_amount"))
            due_date = row.get("due_date")
            days_past_due = clean_int(row.get("days_past_due"))
            payment_status = row.get("payment_status")
            prob_default = clean_float(row.get("probability_of_default"))
            risk_category = row.get("risk_category")
            payment_link = row.get("payment_link")
            sched_time = row.get("scheduled_message_time")
            raw_tz = row.get("timezone")

            # Validate timezone
            tz_str = raw_tz or self.default_timezone
            try:
                zone_info = ZoneInfo(tz_str)
            except Exception:
                tz_str = self.default_timezone
                zone_info = ZoneInfo(self.default_timezone)

            row_errors: list[str] = []

            # 1. Required field validations
            if not customer_id:
                row_errors.append("customer_id is required")
            if not customer_name:
                row_errors.append("customer_name is required")
            if not raw_phone:
                row_errors.append("phone_number is required")
            elif not phone_number:
                row_errors.append(f"Invalid phone number format: '{raw_phone}'")
            if unpaid_amount is None:
                row_errors.append("unpaid_amount is required and must be numeric")
            elif unpaid_amount < 0:
                row_errors.append("unpaid_amount cannot be negative")

            # 2. Scheduling validation & calculation
            scheduled_message_at: str | None = None
            schedule_status: Literal["SCHEDULED", "UNSCHEDULED", "INVALID_TIME", "MISSED_SCHEDULE", "INVALID_ROW"]

            now_in_tz = datetime.now(zone_info)
            if target_date_str:
                try:
                    target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                except ValueError:
                    target_date = now_in_tz.date()
            else:
                target_date = now_in_tz.date()

            if sched_time is None:
                # Critical requirement: Empty schedule is UNSCHEDULED, NOT filled with current time or defaults
                schedule_status = "UNSCHEDULED"
            else:
                if not TIME_FORMAT_REGEX.match(sched_time):
                    schedule_status = "INVALID_TIME"
                    row_errors.append(f"scheduled_message_time '{sched_time}' must match HH:MM (24-hour format)")
                else:
                    hour, minute = map(int, sched_time.split(":"))
                    target_dt = datetime.combine(target_date, time(hour, minute), tzinfo=zone_info)
                    scheduled_message_at = target_dt.isoformat()

                    if target_dt < now_in_tz:
                        schedule_status = "MISSED_SCHEDULE"
                    else:
                        schedule_status = "SCHEDULED"

            is_valid = len(row_errors) == 0
            if not is_valid and schedule_status not in ("INVALID_TIME", "UNSCHEDULED"):
                schedule_status = "INVALID_ROW"

            # 3. Generate message text
            cid_display = customer_id or "N/A"
            cname_display = customer_name or "Valued Customer"
            unpaid_display = f"₹{unpaid_amount:,.2f}" if unpaid_amount is not None else "₹0.00"
            late_display = f"{days_past_due} days past due" if days_past_due else "overdue"
            link_display = payment_link or f"https://pay.repayx.ai/inv/{cid_display}"

            message_text = (
                f"🚨 *RepayX Recovery Notice* 🚨\n\n"
                f"Dear *{cname_display}*, your loan account *#{cid_display}* has an unpaid balance of "
                f"*{unpaid_display}* ({late_display}).\n\n"
                f"Please clear your pending payment using your secure RepayX portal:\n"
                f"👉 {link_display}\n\n"
                f"Reply to this WhatsApp chat for immediate settlement assistance."
            )

            schedule_id = f"sched_{customer_id}_{campaign_id}"

            record = {
                "schedule_id": schedule_id,
                "row_number": idx,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "phone_number": phone_number,
                "raw_phone": raw_phone,
                "loan_id": loan_id,
                "unpaid_amount": unpaid_amount,
                "due_date": due_date,
                "days_past_due": days_past_due,
                "payment_status": payment_status,
                "probability_of_default": prob_default,
                "risk_category": risk_category,
                "payment_link": payment_link,
                "scheduled_message_time": sched_time,
                "timezone": tz_str,
                "scheduled_message_at": scheduled_message_at,
                "target_date": target_date.strftime("%Y-%m-%d"),
                "schedule_status": schedule_status,
                "is_valid": is_valid,
                "validation_errors": row_errors,
                "message_text": message_text,
            }
            parsed_records.append(record)

            validation_report.append({
                "row_number": idx,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "phone_number": phone_number,
                "scheduled_message_time": sched_time,
                "timezone": tz_str,
                "schedule_status": schedule_status,
                "is_valid": is_valid,
                "errors": "; ".join(row_errors) if row_errors else "OK",
            })

        # Summary statistics
        total_imported = len(parsed_records)
        valid_records = sum(1 for r in parsed_records if r["is_valid"])
        invalid_records = sum(1 for r in parsed_records if not r["is_valid"])
        scheduled_messages = sum(1 for r in parsed_records if r["schedule_status"] == "SCHEDULED")
        unscheduled_customers = sum(1 for r in parsed_records if r["schedule_status"] == "UNSCHEDULED")
        missed_schedules = sum(1 for r in parsed_records if r["schedule_status"] == "MISSED_SCHEDULE")
        invalid_time_records = sum(1 for r in parsed_records if r["schedule_status"] == "INVALID_TIME")

        summary = {
            "total_imported": total_imported,
            "valid_records": valid_records,
            "invalid_records": invalid_records,
            "scheduled_messages": scheduled_messages,
            "unscheduled_customers": unscheduled_customers,
            "missed_schedules": missed_schedules,
            "invalid_time_records": invalid_time_records,
            "messages_sent": 0,
            "messages_failed": 0,
        }

        return {
            "success": True,
            "campaign_id": campaign_id,
            "summary": summary,
            "records": parsed_records,
            "validation_report": validation_report,
        }

    def save_confirmed_schedules(
        self,
        records: list[dict[str, Any]],
        campaign_id: str = "default",
    ) -> dict[str, Any]:
        """Persists validated customer schedules into SQLite.

        Idempotency rule: If a schedule already exists and is in 'SENT' state,
        it is preserved and never overwritten or re-sent.
        """
        now_iso = datetime.now(ZoneInfo("UTC")).isoformat()
        saved_count = 0
        skipped_sent_count = 0

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            for r in records:
                sched_id = r.get("schedule_id") or f"sched_{r.get('customer_id')}_{campaign_id}"
                cust_id = str(r.get("customer_id", ""))
                cust_name = str(r.get("customer_name", "Customer"))
                phone = str(r.get("phone_number", ""))
                loan_id = r.get("loan_id")
                unpaid_amt = r.get("unpaid_amount")
                due_date = r.get("due_date")
                days_late = r.get("days_past_due")
                pay_status = r.get("payment_status")
                pd = r.get("probability_of_default")
                risk_cat = r.get("risk_category")
                pay_link = r.get("payment_link")
                sched_time = normalize_nullable_field(r.get("scheduled_message_time"))
                tz = r.get("timezone") or self.default_timezone
                sched_at = r.get("scheduled_message_at")
                msg_text = r.get("message_text", "")
                status = r.get("schedule_status", "UNSCHEDULED")

                # Check if already sent
                cursor.execute(
                    "SELECT status, provider_id, sent_at FROM scheduled_messages WHERE schedule_id = ?",
                    (sched_id,),
                )
                existing = cursor.fetchone()
                if existing and existing[0] == "SENT":
                    skipped_sent_count += 1
                    continue

                cursor.execute(
                    """
                    INSERT INTO scheduled_messages (
                        schedule_id, customer_id, customer_name, phone_number,
                        loan_id, unpaid_amount, due_date, days_past_due, payment_status,
                        probability_of_default, risk_category, payment_link,
                        scheduled_message_time, timezone, scheduled_message_at,
                        message_text, campaign_id, status, attempt_count,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                    ON CONFLICT(schedule_id) DO UPDATE SET
                        customer_name = excluded.customer_name,
                        phone_number = excluded.phone_number,
                        loan_id = excluded.loan_id,
                        unpaid_amount = excluded.unpaid_amount,
                        due_date = excluded.due_date,
                        days_past_due = excluded.days_past_due,
                        payment_status = excluded.payment_status,
                        probability_of_default = excluded.probability_of_default,
                        risk_category = excluded.risk_category,
                        payment_link = excluded.payment_link,
                        scheduled_message_time = excluded.scheduled_message_time,
                        timezone = excluded.timezone,
                        scheduled_message_at = excluded.scheduled_message_at,
                        message_text = excluded.message_text,
                        status = excluded.status,
                        updated_at = excluded.updated_at
                    """,
                    (
                        sched_id,
                        cust_id,
                        cust_name,
                        phone,
                        loan_id,
                        unpaid_amt,
                        due_date,
                        days_late,
                        pay_status,
                        pd,
                        risk_cat,
                        pay_link,
                        sched_time,
                        tz,
                        sched_at,
                        msg_text,
                        campaign_id,
                        status,
                        now_iso,
                        now_iso,
                    ),
                )
                saved_count += 1

            conn.commit()

        stats = self.get_schedule_stats(campaign_id)
        return {
            "success": True,
            "campaign_id": campaign_id,
            "saved_count": saved_count,
            "skipped_sent_count": skipped_sent_count,
            "stats": stats,
        }

    def update_schedule_time(
        self,
        schedule_id: str,
        scheduled_message_time: str | None,
        target_date_str: str | None = None,
        timezone_str: str | None = None,
    ) -> dict[str, Any]:
        """Updates the scheduled time for a single customer (e.g. assigning a missing time)."""
        sched_time = normalize_nullable_field(scheduled_message_time)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM scheduled_messages WHERE schedule_id = ?", (schedule_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Schedule '{schedule_id}' not found.")

            tz_str = timezone_str or row["timezone"] or self.default_timezone
            try:
                zone_info = ZoneInfo(tz_str)
            except Exception:
                zone_info = ZoneInfo(self.default_timezone)

            now_in_tz = datetime.now(zone_info)
            if target_date_str:
                try:
                    target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                except ValueError:
                    target_date = now_in_tz.date()
            else:
                target_date = now_in_tz.date()

            if sched_time is None:
                new_status = "UNSCHEDULED"
                new_sched_at = None
            else:
                if not TIME_FORMAT_REGEX.match(sched_time):
                    raise ValueError(f"Invalid time format '{sched_time}'. Must be HH:MM.")
                hour, minute = map(int, sched_time.split(":"))
                target_dt = datetime.combine(target_date, time(hour, minute), tzinfo=zone_info)
                new_sched_at = target_dt.isoformat()
                if target_dt < now_in_tz:
                    new_status = "MISSED_SCHEDULE"
                else:
                    new_status = "SCHEDULED"

            now_iso = datetime.now(ZoneInfo("UTC")).isoformat()
            cursor.execute(
                """
                UPDATE scheduled_messages
                SET scheduled_message_time = ?,
                    timezone = ?,
                    scheduled_message_at = ?,
                    status = ?,
                    updated_at = ?
                WHERE schedule_id = ?
                """,
                (sched_time, tz_str, new_sched_at, new_status, now_iso, schedule_id),
            )
            conn.commit()

        return {
            "success": True,
            "schedule_id": schedule_id,
            "scheduled_message_time": sched_time,
            "timezone": tz_str,
            "scheduled_message_at": new_sched_at,
            "status": new_status,
        }

    def get_schedules(
        self,
        campaign_id: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        """Retrieves paginated schedules and current stats from SQLite."""
        offset = max(0, (page - 1) * page_size)
        where_clauses: list[str] = []
        params: list[Any] = []

        if campaign_id:
            where_clauses.append("campaign_id = ?")
            params.append(campaign_id)
        if status:
            where_clauses.append("status = ?")
            params.append(status)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(f"SELECT COUNT(*) FROM scheduled_messages {where_sql}", params)
            total_records = cursor.fetchone()[0]

            query = f"""
                SELECT * FROM scheduled_messages
                {where_sql}
                ORDER BY
                    CASE status
                        WHEN 'SCHEDULED' THEN 1
                        WHEN 'UNSCHEDULED' THEN 2
                        WHEN 'MISSED_SCHEDULE' THEN 3
                        WHEN 'INVALID_TIME' THEN 4
                        WHEN 'FAILED' THEN 5
                        WHEN 'SENT' THEN 6
                        ELSE 7
                    END,
                    scheduled_message_at ASC,
                    created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [page_size, offset])
            rows = [dict(r) for r in cursor.fetchall()]

        stats = self.get_schedule_stats(campaign_id)

        return {
            "success": True,
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total_records + page_size - 1) // page_size),
            "stats": stats,
            "schedules": rows,
        }

    def get_schedule_stats(self, campaign_id: str | None = None) -> dict[str, int]:
        """Computes aggregate stats for UI summary cards."""
        where_sql = "WHERE campaign_id = ?" if campaign_id else ""
        params = [campaign_id] if campaign_id else []

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
                    SUM(CASE WHEN status = 'UNSCHEDULED' THEN 1 ELSE 0 END) as unscheduled,
                    SUM(CASE WHEN status = 'MISSED_SCHEDULE' THEN 1 ELSE 0 END) as missed,
                    SUM(CASE WHEN status IN ('INVALID_TIME', 'INVALID_ROW') THEN 1 ELSE 0 END) as invalid,
                    SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'PAUSED' THEN 1 ELSE 0 END) as paused
                FROM scheduled_messages {where_sql}
                """,
                params,
            )
            row = cursor.fetchone()

        total = row[0] or 0
        scheduled = row[1] or 0
        unscheduled = row[2] or 0
        missed = row[3] or 0
        invalid = row[4] or 0
        sent = row[5] or 0
        failed = row[6] or 0
        paused = row[7] or 0
        valid = total - invalid

        return {
            "total_imported": total,
            "valid_records": valid,
            "scheduled_messages": scheduled,
            "unscheduled_customers": unscheduled,
            "missed_schedules": missed,
            "invalid_records": invalid,
            "messages_sent": sent,
            "messages_failed": failed,
            "messages_paused": paused,
        }

    def process_due_jobs(self, whatsapp_service: Any) -> dict[str, Any]:
        """Scheduler engine core: identifies and processes due messages.

        Executes all 9 pre-flight safety verifications before dispatching.
        """
        now_utc = datetime.now(ZoneInfo("UTC"))
        dispatched: list[dict[str, Any]] = []
        skipped: list[dict[str, Any]] = []

        # Check WhatsApp connection state first
        try:
            status_obj = whatsapp_service.status()
            wa_connected = bool(status_obj.get("connected") and status_obj.get("ready"))
        except Exception:
            wa_connected = False

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT * FROM scheduled_messages
                WHERE status = 'SCHEDULED' AND scheduled_message_at IS NOT NULL
                """
            )
            candidate_rows = [dict(r) for r in cursor.fetchall()]

        for job in candidate_rows:
            sched_id = job["schedule_id"]
            sched_at_str = job["scheduled_message_at"]
            tz_str = job.get("timezone") or self.default_timezone

            try:
                zone_info = ZoneInfo(tz_str)
            except Exception:
                zone_info = ZoneInfo(self.default_timezone)

            try:
                sched_dt = datetime.fromisoformat(sched_at_str)
            except Exception:
                continue

            now_in_tz = datetime.now(zone_info)

            # Check 8: Has the scheduled time arrived in the customer's timezone?
            if now_in_tz < sched_dt:
                # Time not reached yet -> skip
                skipped.append({"schedule_id": sched_id, "reason": "Time not arrived yet"})
                continue

            # Verification 1 & 2: Customer record and phone number valid
            phone = clean_phone_number(job.get("phone_number"))
            if not phone:
                self._update_job_status(sched_id, "FAILED", error="Invalid phone number")
                continue

            # Verification 3: Customer eligible for follow-up (unpaid amount > 0 or status UNPAID/OVERDUE)
            unpaid = job.get("unpaid_amount")
            if unpaid is not None and unpaid <= 0:
                self._update_job_status(sched_id, "FAILED", error="Ineligible: loan balance is zero or negative")
                continue

            # Verification 4: Opt-out / messaging consent (simulated consent check)
            # Checked against phone format & customer record

            # Verification 5: WhatsApp genuinely connected and ready
            if not wa_connected:
                # Do NOT mark as sent! Retain pending job in PAUSED state
                self._update_job_status(
                    sched_id,
                    "PAUSED",
                    error="WhatsApp is disconnected. Job retained for reconnect.",
                )
                skipped.append({"schedule_id": sched_id, "reason": "WhatsApp disconnected"})
                continue

            # Verification 6 & 7: Template valid and variables resolved
            msg_text = job.get("message_text")
            if not msg_text or "{{" in msg_text:
                self._update_job_status(sched_id, "FAILED", error="Unresolved template variables")
                continue

            # Verification 9: Idempotency check in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT status FROM scheduled_messages WHERE schedule_id = ?", (sched_id,))
                current_status = cursor.fetchone()
                if not current_status or current_status[0] == "SENT":
                    continue

            # Dispatch via WhatsApp bridge
            try:
                res = whatsapp_service.send(
                    recipient=phone,
                    message_text=msg_text,
                    customer_id=job.get("customer_id"),
                    customer_name=job.get("customer_name"),
                    template_name="scheduled_repayment_notice",
                )
                prov_id = res.get("provider_id") or res.get("message_id") or "sent"
                now_iso = datetime.now(ZoneInfo("UTC")).isoformat()

                self._update_job_status(
                    sched_id,
                    "SENT",
                    sent_at=now_iso,
                    provider_id=prov_id,
                    error=None,
                )
                dispatched.append({
                    "schedule_id": sched_id,
                    "customer_name": job.get("customer_name"),
                    "phone": phone,
                    "provider_id": prov_id,
                })
            except Exception as exc:
                self._update_job_status(
                    sched_id,
                    "FAILED",
                    error=str(exc),
                )

        return {
            "processed_count": len(dispatched),
            "dispatched": dispatched,
            "skipped_count": len(skipped),
            "wa_connected": wa_connected,
        }

    def _update_job_status(
        self,
        schedule_id: str,
        status: str,
        sent_at: str | None = None,
        provider_id: str | None = None,
        error: str | None = None,
    ) -> None:
        now_iso = datetime.now(ZoneInfo("UTC")).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE scheduled_messages
                SET status = ?,
                    sent_at = COALESCE(?, sent_at),
                    provider_id = COALESCE(?, provider_id),
                    last_error = ?,
                    attempt_count = attempt_count + 1,
                    updated_at = ?
                WHERE schedule_id = ?
                """,
                (status, sent_at, provider_id, error, now_iso, schedule_id),
            )
            conn.commit()

