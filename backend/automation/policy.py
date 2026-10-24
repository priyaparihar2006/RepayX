"""Pure reminder-policy calculation. No I/O: given an EMI, a customer timezone, the
policy, and 'now', return the reminders that should exist.

Reminder keys are deterministic, so recomputing the plan (re-import, settings
change, restart) always maps onto the same rows instead of creating duplicates.
The due date is part of every key: when a due date changes, reminders for the old
date are cancelled and new ones created, while history for the old date is kept.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from automation.policy_settings import ReminderPolicy
from automation.util import UTC, parse_hhmm

ELIGIBLE_STATUSES = {"pending", "overdue", "partially_paid"}


@dataclass(frozen=True)
class EmiSnapshot:
    emi_id: int
    due_date: date
    payment_status: str
    emi_amount: Decimal
    amount_paid: Decimal
    reminder_date: date | None
    reminder_time: time | None
    timezone: str
    reminder_datetime_utc: datetime | None = None

    @property
    def outstanding(self) -> Decimal:
        return max(Decimal("0.00"), self.emi_amount - self.amount_paid)


@dataclass(frozen=True)
class PlannedReminder:
    key: str
    reminder_type: str
    scheduled_at: datetime  # UTC, after contact-window adjustment
    note: str | None
    stage: int = 1
    stage_name: str = "friendly"


def ineligibility_reason(emi: EmiSnapshot) -> str | None:
    if emi.payment_status not in ELIGIBLE_STATUSES:
        return f"payment_status_{emi.payment_status}"
    if emi.outstanding <= 0:
        return "no_outstanding_amount"
    return None


def within_contact_window(local_dt: datetime, policy: ReminderPolicy) -> bool:
    start = parse_hhmm(policy.contact_window_start)
    end = parse_hhmm(policy.contact_window_end)
    return local_dt.weekday() in policy.contact_days and start <= local_dt.time() < end


def next_contact_time(local_dt: datetime, policy: ReminderPolicy) -> datetime:
    """The earliest moment >= local_dt inside the contact window (in local_dt's timezone)."""
    if within_contact_window(local_dt, policy):
        return local_dt
    start = parse_hhmm(policy.contact_window_start)
    tz = local_dt.tzinfo
    day = local_dt.date()
    if local_dt.time() < start and local_dt.weekday() in policy.contact_days:
        return datetime.combine(day, start, tzinfo=tz)
    for offset in range(1, 8):
        candidate = day + timedelta(days=offset)
        if candidate.weekday() in policy.contact_days:
            return datetime.combine(candidate, start, tzinfo=tz)
    raise ValueError("policy has no contact days")  # unreachable: validated non-empty


def _local(day: date, at: time, tz: ZoneInfo) -> datetime:
    # zoneinfo resolves DST gaps/folds deterministically (fold=0).
    return datetime.combine(day, at, tzinfo=tz)


def _overdue_offsets(policy: ReminderPolicy) -> list[int]:
    offsets = list(policy.overdue_days)
    if policy.overdue_repeat_every_days and offsets:
        nxt = offsets[-1] + policy.overdue_repeat_every_days
        while len(offsets) < policy.overdue_max_reminders:
            offsets.append(nxt)
            nxt += policy.overdue_repeat_every_days
    return offsets[: policy.overdue_max_reminders]


def plan_reminders(emi: EmiSnapshot, policy: ReminderPolicy) -> list[PlannedReminder]:
    """All reminders the policy wants for this EMI, past or future. Callers decide what
    to do with past ones (the scheduler never creates new jobs in the past)."""
    if ineligibility_reason(emi):
        return []
    tz = ZoneInfo(emi.timezone)
    due = emi.due_date.isoformat()
    candidates: list[tuple[str, str, datetime]] = []

    if emi.reminder_datetime_utc is not None:
        exact = emi.reminder_datetime_utc
        return [PlannedReminder(f"exact:{exact.isoformat()}:{due}", "explicit", exact, None)]
    if emi.reminder_date is not None:
        at = emi.reminder_time or parse_hhmm(policy.default_reminder_time)
        local = _local(emi.reminder_date, at, tz)
        key = f"explicit:{emi.reminder_date.isoformat()}T{at.strftime('%H:%M')}:{due}"
        candidates.append((key, "explicit", local))
    else:
        at = emi.reminder_time or parse_hhmm(policy.default_reminder_time)
        for days in policy.pre_due_days:
            candidates.append((f"pre_due:{days}:{due}", "pre_due", _local(emi.due_date - timedelta(days=days), at, tz)))
        if policy.due_date_reminder:
            candidates.append((f"due_date:{due}", "due_date", _local(emi.due_date, at, tz)))
        for days in _overdue_offsets(policy):
            candidates.append((f"overdue:{days}:{due}", "overdue", _local(emi.due_date + timedelta(days=days), at, tz)))

    planned: list[PlannedReminder] = []
    # Exactly three stages in standard sequence
    stage_names = ["friendly", "firm", "final"]
    if getattr(policy, "max_stages", 0) > 0:
        candidates = candidates[: policy.max_stages]
    elif getattr(policy, "three_stage_workflow", False):
        candidates = candidates[:3]
    for i, (key, rtype, local) in enumerate(candidates):
        st_num = i + 1
        st_name = stage_names[min(i, len(stage_names) - 1)]
        adjusted = next_contact_time(local, policy)
        note = None
        if adjusted != local:
            note = (
                f"Moved from {local.strftime('%Y-%m-%d %H:%M')} to {adjusted.strftime('%Y-%m-%d %H:%M')} "
                f"({emi.timezone}) to respect the contact window"
            )
        planned.append(PlannedReminder(key, rtype, adjusted.astimezone(UTC), note, stage=st_num, stage_name=st_name))
    return planned


def reminder_still_relevant(reminder_type: str, due_date: date, local_now: datetime) -> bool:
    """A pre-due reminder is pointless once the due date has passed, and a due-date
    reminder is stale after that day. Overdue and explicit reminders stay relevant."""
    if reminder_type == "pre_due":
        return local_now.date() < due_date
    if reminder_type == "due_date":
        return local_now.date() <= due_date
    return True
