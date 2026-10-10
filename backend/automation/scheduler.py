"""Reconcile the policy's desired reminders with persisted jobs, and operator job actions.

Reconciliation is idempotent: running it twice with the same inputs changes nothing.
It is called after every import row, payment update, settings change, and hold change.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from automation.audit import audit
from automation.policy import (
    EmiSnapshot,
    PlannedReminder,
    ineligibility_reason,
    plan_reminders,
    within_contact_window,
)
from automation.policy_settings import CHANNELS, ReminderPolicy
from automation.util import iso, parse_hhmm, parse_iso, utcnow

OPEN_STATUSES = ("pending", "retry")


class JobActionError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


@dataclass
class ReconcileResult:
    scheduled: int = 0
    updated: int = 0
    cancelled: int = 0
    skipped_past: int = 0

    def add(self, other: "ReconcileResult") -> None:
        self.scheduled += other.scheduled
        self.updated += other.updated
        self.cancelled += other.cancelled
        self.skipped_past += other.skipped_past


def snapshot_from_rows(emi: sqlite3.Row, customer: sqlite3.Row) -> EmiSnapshot:
    return EmiSnapshot(
        emi_id=emi["id"],
        due_date=date.fromisoformat(emi["due_date"]),
        payment_status=emi["payment_status"],
        emi_amount=Decimal(emi["emi_amount"]),
        amount_paid=Decimal(emi["amount_paid"]),
        reminder_date=date.fromisoformat(emi["reminder_date"]) if emi["reminder_date"] else None,
        reminder_time=parse_hhmm(emi["reminder_time"]) if emi["reminder_time"] else None,
        timezone=customer["timezone"],
    )


def intended_channels(customer: sqlite3.Row, policy: ReminderPolicy) -> list[str]:
    """Channels this customer could be reached on, per their record (re-checked at send time)."""
    has = {"whatsapp": bool(customer["phone"]), "sms": bool(customer["phone"]), "email": bool(customer["email"])}
    flags = {c: bool(customer[f"{c}_enabled"]) for c in CHANNELS}
    return [c for c in policy.channel_order if has[c] and flags[c]]


def load_emi_and_customer(conn: sqlite3.Connection, emi_id: int) -> tuple[sqlite3.Row, sqlite3.Row]:
    emi = conn.execute("SELECT * FROM emis WHERE id = ?", (emi_id,)).fetchone()
    if emi is None:
        raise JobActionError(404, "not_found", "EMI not found.")
    customer = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (emi["customer_id"],)).fetchone()
    return emi, customer


def reconcile_emi(
    conn: sqlite3.Connection,
    emi_id: int,
    policy: ReminderPolicy,
    now: datetime,
    actor: str,
) -> ReconcileResult:
    """Bring this EMI's open jobs in line with the policy. Must run inside a write transaction."""
    result = ReconcileResult()
    emi, customer = load_emi_and_customer(conn, emi_id)
    snap = snapshot_from_rows(emi, customer)

    stop_reason = ineligibility_reason(snap)
    if stop_reason is None and customer["reminders_on_hold"]:
        stop_reason = "customer_on_hold"
    planned: dict[str, PlannedReminder] = (
        {} if stop_reason else {p.key: p for p in plan_reminders(snap, policy)}
    )
    channels = json.dumps(intended_channels(customer, policy))
    now_s = iso(now)

    existing = {
        row["reminder_key"]: row
        for row in conn.execute("SELECT * FROM reminder_jobs WHERE emi_id = ?", (emi_id,)).fetchall()
    }

    for key, job in existing.items():
        if job["status"] not in OPEN_STATUSES:
            continue
        plan = planned.get(key)
        if plan is None:
            if job["manual_override"] and not stop_reason:
                continue  # an operator-scheduled job survives policy changes, but not payment
            reason = stop_reason or (
                "due_date_changed" if job["due_date"] != snap.due_date.isoformat() else "removed_from_policy"
            )
            conn.execute(
                """UPDATE reminder_jobs SET status = 'cancelled', outcome_reason = ?, lease_until = NULL,
                       updated_at = ?, completed_at = ? WHERE id = ? AND status IN ('pending','retry')""",
                (reason, now_s, now_s, job["id"]),
            )
            audit(conn, actor, "reminder.cancelled", "reminder_job", job["id"], {"reason": reason})
            result.cancelled += 1
            continue
        new_at = iso(plan.scheduled_at)
        if job["manual_override"] or job["scheduled_at_utc"] == new_at:
            if job["channels_json"] != channels:
                conn.execute(
                    "UPDATE reminder_jobs SET channels_json = ?, updated_at = ? WHERE id = ?",
                    (channels, now_s, job["id"]),
                )
            continue
        conn.execute(
            """UPDATE reminder_jobs SET scheduled_at_utc = ?, run_at_utc = ?, schedule_note = ?,
                   channels_json = ?, timezone = ?, updated_at = ?
               WHERE id = ? AND status = 'pending'""",
            (new_at, new_at, plan.note, channels, snap.timezone, now_s, job["id"]),
        )
        audit(conn, actor, "reminder.rescheduled", "reminder_job", job["id"],
              {"from": job["scheduled_at_utc"], "to": new_at})
        result.updated += 1

    for key, plan in planned.items():
        job = existing.get(key)
        if plan.scheduled_at < now:
            if job is None:
                result.skipped_past += 1
            continue
        new_at = iso(plan.scheduled_at)
        if job is None:
            job_id = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO reminder_jobs (id, emi_id, customer_id, loan_id, reminder_key, reminder_type,
                       due_date, scheduled_at_utc, run_at_utc, timezone, schedule_note, channels_json,
                       status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                   ON CONFLICT (emi_id, reminder_key) DO NOTHING""",
                (job_id, emi_id, emi["customer_id"], emi["loan_id"], key, plan.reminder_type,
                 snap.due_date.isoformat(), new_at, new_at, snap.timezone, plan.note, channels, now_s, now_s),
            )
            audit(conn, actor, "reminder.scheduled", "reminder_job", job_id,
                  {"type": plan.reminder_type, "at": new_at, "loan_id": emi["loan_id"]})
            result.scheduled += 1
        elif job["status"] == "cancelled" and not job["manual_override"]:
            # The EMI became eligible again (e.g. a payment was reversed): reactivate.
            conn.execute(
                """UPDATE reminder_jobs SET status = 'pending', scheduled_at_utc = ?, run_at_utc = ?,
                       schedule_note = ?, channels_json = ?, outcome_reason = NULL, completed_at = NULL,
                       attempt_count = 0, next_retry_at = NULL, updated_at = ?
                   WHERE id = ?""",
                (new_at, new_at, plan.note, channels, now_s, job["id"]),
            )
            audit(conn, actor, "reminder.reactivated", "reminder_job", job["id"], {"at": new_at})
            result.scheduled += 1
    return result


def reconcile_customer(conn: sqlite3.Connection, customer_id: str, policy: ReminderPolicy,
                       now: datetime, actor: str) -> ReconcileResult:
    total = ReconcileResult()
    for row in conn.execute("SELECT id FROM emis WHERE customer_id = ?", (customer_id,)).fetchall():
        total.add(reconcile_emi(conn, row["id"], policy, now, actor))
    return total


def reconcile_all(conn: sqlite3.Connection, policy: ReminderPolicy, now: datetime, actor: str) -> ReconcileResult:
    total = ReconcileResult()
    for row in conn.execute(
        "SELECT id FROM emis WHERE payment_status IN ('pending','overdue','partially_paid') "
        "OR id IN (SELECT emi_id FROM reminder_jobs WHERE status IN ('pending','retry'))"
    ).fetchall():
        total.add(reconcile_emi(conn, row["id"], policy, now, actor))
    return total


# ---------------------------------------------------------------- operator actions


def _get_job(conn: sqlite3.Connection, job_id: str) -> sqlite3.Row:
    job = conn.execute("SELECT * FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
    if job is None:
        raise JobActionError(404, "not_found", "Reminder not found.")
    return job


def cancel_job(conn: sqlite3.Connection, job_id: str, actor: str, reason: str, now: datetime) -> None:
    job = _get_job(conn, job_id)
    if job["status"] not in OPEN_STATUSES:
        raise JobActionError(409, "not_cancellable", f"Only pending reminders can be cancelled (status: {job['status']}).")
    now_s = iso(now)
    conn.execute(
        """UPDATE reminder_jobs SET status = 'cancelled', manual_override = 1, outcome_reason = ?,
               lease_until = NULL, updated_at = ?, completed_at = ? WHERE id = ?""",
        (f"cancelled_by_user: {reason}", now_s, now_s, job_id),
    )
    audit(conn, actor, "reminder.cancelled_by_user", "reminder_job", job_id, {"reason": reason})


def reschedule_job(conn: sqlite3.Connection, job_id: str, local_dt: datetime, timezone_name: str,
                   policy: ReminderPolicy, actor: str, now: datetime) -> None:
    job = _get_job(conn, job_id)
    if job["status"] not in OPEN_STATUSES:
        raise JobActionError(409, "not_reschedulable", f"Only pending reminders can be rescheduled (status: {job['status']}).")
    try:
        tz = ZoneInfo(timezone_name)
    except Exception as exc:
        raise JobActionError(422, "invalid_timezone", "Unknown timezone.") from exc
    local = local_dt.replace(tzinfo=tz) if local_dt.tzinfo is None else local_dt.astimezone(tz)
    if local.astimezone(now.tzinfo) <= now:
        raise JobActionError(422, "time_in_past", "The new reminder time must be in the future.")
    if not within_contact_window(local, policy):
        raise JobActionError(
            422, "outside_contact_window",
            f"The new time is outside the contact window ({policy.contact_window_start}-"
            f"{policy.contact_window_end} on allowed days).",
        )
    emi, customer = load_emi_and_customer(conn, job["emi_id"])
    reason = ineligibility_reason(snapshot_from_rows(emi, customer))
    if reason:
        raise JobActionError(409, "emi_not_eligible", f"The EMI is not eligible for reminders ({reason}).")
    new_at = iso(local)
    conn.execute(
        """UPDATE reminder_jobs SET scheduled_at_utc = ?, run_at_utc = ?, timezone = ?, status = 'pending',
               next_retry_at = NULL, manual_override = 1, schedule_note = ?, updated_at = ? WHERE id = ?""",
        (new_at, new_at, timezone_name, f"Rescheduled by {actor}", iso(now), job_id),
    )
    audit(conn, actor, "reminder.rescheduled_by_user", "reminder_job", job_id,
          {"from": job["scheduled_at_utc"], "to": new_at})


def retry_job(conn: sqlite3.Connection, job_id: str, actor: str, now: datetime) -> None:
    """Re-queue a failed job. Channels already accepted are never re-sent; channels in
    'unknown' state (the worker died mid-send) are not re-sent automatically either."""
    job = _get_job(conn, job_id)
    if job["status"] not in ("failed", "dead_letter", "partially_completed"):
        raise JobActionError(409, "not_retryable", f"Only failed reminders can be retried (status: {job['status']}).")
    emi, customer = load_emi_and_customer(conn, job["emi_id"])
    reason = ineligibility_reason(snapshot_from_rows(emi, customer))
    if reason:
        raise JobActionError(409, "emi_not_eligible", f"The EMI is not eligible for reminders ({reason}).")
    retryable = conn.execute(
        "SELECT COUNT(*) FROM message_deliveries WHERE job_id = ? AND status = 'failed'", (job_id,)
    ).fetchone()[0]
    if job["status"] == "partially_completed" and retryable == 0:
        raise JobActionError(409, "nothing_to_retry", "No failed channel deliveries to retry.")
    now_s = iso(now)
    conn.execute(
        """UPDATE message_deliveries SET status = 'queued', attempt_count = 0, next_retry_at = NULL,
               error_code = NULL, error_message = NULL, updated_at = ?
           WHERE job_id = ? AND status = 'failed'""",
        (now_s, job_id),
    )
    conn.execute(
        """UPDATE reminder_jobs SET status = 'pending', run_at_utc = ?, attempt_count = 0, next_retry_at = NULL,
               outcome_reason = NULL, last_error = NULL, completed_at = NULL, updated_at = ? WHERE id = ?""",
        (now_s, now_s, job_id),
    )
    audit(conn, actor, "reminder.retry_requested", "reminder_job", job_id, {"failed_channels_requeued": retryable})


def job_lag_seconds(job: sqlite3.Row, now: datetime) -> float:
    return (now - parse_iso(job["run_at_utc"])).total_seconds()


__all__ = [
    "JobActionError", "ReconcileResult", "reconcile_emi", "reconcile_customer", "reconcile_all",
    "cancel_job", "reschedule_job", "retry_job", "snapshot_from_rows", "load_emi_and_customer",
    "intended_channels", "OPEN_STATUSES", "job_lag_seconds",
]
