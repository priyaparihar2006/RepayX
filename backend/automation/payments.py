"""Payment-status changes from the dashboard, payment webhooks, and claim handling.

Every change writes a payment_event with its source and actor, then reconciles
reminders so a paid EMI immediately loses its pending jobs.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from decimal import Decimal

from automation.audit import audit
from automation.policy_settings import ReminderPolicy
from automation.scheduler import JobActionError, ReconcileResult, reconcile_customer, reconcile_emi
from automation.util import iso

VALID_STATUSES = ("pending", "overdue", "partially_paid", "paid", "cancelled", "waived")


def update_payment(
    conn: sqlite3.Connection,
    emi_id: int,
    status: str,
    amount_paid: Decimal | None,
    actor: str,
    source: str,
    policy: ReminderPolicy,
    now: datetime,
    reference: str | None = None,
    note: str | None = None,
) -> ReconcileResult:
    if status not in VALID_STATUSES:
        raise JobActionError(422, "invalid_status", f"payment_status must be one of {', '.join(VALID_STATUSES)}.")
    emi = conn.execute("SELECT * FROM emis WHERE id = ?", (emi_id,)).fetchone()
    if emi is None:
        raise JobActionError(404, "not_found", "EMI not found.")
    emi_amount = Decimal(emi["emi_amount"])
    if amount_paid is None:
        amount_paid = emi_amount if status == "paid" else Decimal(emi["amount_paid"])
    if amount_paid < 0 or amount_paid > emi_amount:
        raise JobActionError(422, "invalid_amount", "amount_paid must be between 0 and the EMI amount.")
    if status == "paid" and amount_paid < emi_amount:
        raise JobActionError(422, "invalid_amount", "A paid EMI must have amount_paid equal to the EMI amount.")
    if status == "partially_paid" and not (0 < amount_paid < emi_amount):
        raise JobActionError(422, "invalid_amount", "A partially paid EMI needs 0 < amount_paid < EMI amount.")
    if source.startswith("manual:") and status in ("paid", "partially_paid", "waived") and not (reference or note):
        raise JobActionError(422, "evidence_required",
                             "Record a payment reference or a note describing the evidence for this payment.")

    paid_s = str(amount_paid.quantize(Decimal("0.01")))
    now_s = iso(now)
    conn.execute(
        """INSERT INTO payment_events (emi_id, previous_status, new_status, previous_amount_paid, new_amount_paid,
               source, actor, reference, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (emi_id, emi["payment_status"], status, emi["amount_paid"], paid_s, source, actor, reference, note, now_s),
    )
    conn.execute(
        """UPDATE emis SET payment_status = ?, amount_paid = ?, payment_status_source = ?,
               payment_status_updated_at = ?, payment_claim_pending = CASE WHEN ? IN ('paid','waived','cancelled')
               THEN 0 ELSE payment_claim_pending END, updated_at = ? WHERE id = ?""",
        (status, paid_s, source, now_s, status, now_s, emi_id),
    )
    audit(conn, actor, "payment.updated", "emi", emi_id,
          {"from": emi["payment_status"], "to": status, "amount_paid": paid_s, "source": source.split(":")[0]})
    if status in ("paid", "waived", "cancelled"):
        conn.execute(
            """UPDATE followup_tasks SET status = 'resolved', resolved_at = ?, resolved_by = ?,
                   resolution_note = 'EMI marked ' || ? WHERE emi_id = ? AND kind IN ('verify_payment', 'escalation_recovery') AND status = 'open'""",
            (now_s, actor, status, emi_id),
        )
        conn.execute(
            """UPDATE escalation_cases SET status = 'resolved', resolved_at = ?, notes = coalesce(notes || '; ', '') || 'Auto-resolved: EMI marked ' || ?, updated_at = ?
               WHERE emi_id = ? AND status IN ('open', 'under_review')""",
            (now_s, status, now_s, emi_id),
        )
    return reconcile_emi(conn, emi_id, policy, now, actor)


def reject_payment_claim(conn: sqlite3.Connection, emi_id: int, actor: str, note: str,
                         policy: ReminderPolicy, now: datetime) -> ReconcileResult:
    emi = conn.execute("SELECT * FROM emis WHERE id = ?", (emi_id,)).fetchone()
    if emi is None:
        raise JobActionError(404, "not_found", "EMI not found.")
    if not emi["payment_claim_pending"]:
        raise JobActionError(409, "no_pending_claim", "This EMI has no pending payment claim.")
    now_s = iso(now)
    conn.execute("UPDATE emis SET payment_claim_pending = 0, updated_at = ? WHERE id = ?", (now_s, emi_id))
    conn.execute(
        """UPDATE followup_tasks SET status = 'resolved', resolved_at = ?, resolved_by = ?, resolution_note = ?
           WHERE emi_id = ? AND kind = 'verify_payment' AND status = 'open'""",
        (now_s, actor, f"Claim not verified: {note}", emi_id),
    )
    audit(conn, actor, "payment.claim_rejected", "emi", emi_id, {"note": note})
    return reconcile_emi(conn, emi_id, policy, now, actor)


def set_customer_hold(conn: sqlite3.Connection, customer_id: str, on_hold: bool, reason: str | None,
                      actor: str, policy: ReminderPolicy, now: datetime) -> ReconcileResult:
    n = conn.execute(
        "UPDATE customers SET reminders_on_hold = ?, hold_reason = ?, updated_at = ? WHERE customer_id = ?",
        (int(on_hold), reason if on_hold else None, iso(now), customer_id),
    ).rowcount
    if not n:
        raise JobActionError(404, "not_found", "Customer not found.")
    audit(conn, actor, "customer.hold_set" if on_hold else "customer.hold_released", "customer", customer_id,
          {"reason": reason})
    return reconcile_customer(conn, customer_id, policy, now, actor)
