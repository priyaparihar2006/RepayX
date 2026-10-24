"""Customer replies: match the customer, record the message, apply safe actions, and
draft a reply grounded in the EMI record.

What the automation may do on its own:
- record opt-outs (suppression) and payment claims (verification flag)
- record payment commitments and open follow-up tasks for managers
- put a customer on hold when they dispute the loan
- answer with facts read from the database and configured business details

What it never does: mark anything paid, change amounts or dates, or offer
concessions, waivers, or extensions. Those go to a human via follow-up tasks.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from automation.audit import audit
from automation.config import AutomationConfig
from automation.intents import classify, extract_promise_date
from automation.messages import payment_link
from automation.policy_settings import ReminderPolicy
from automation.scheduler import reconcile_customer
from automation.util import format_inr, iso, mask_identifier, normalize_email, normalize_phone


@dataclass
class InboundResult:
    communication_id: int
    customer_id: str | None
    intent: str
    reply_text: str | None
    reply_channel: str
    reply_recipient: str | None
    actions: list[str]


def _open_emi(conn: sqlite3.Connection, customer_id: str) -> sqlite3.Row | None:
    return conn.execute(
        """SELECT * FROM emis WHERE customer_id = ? AND payment_status IN ('pending','overdue','partially_paid')
           ORDER BY due_date ASC LIMIT 1""", (customer_id,)).fetchone()


def _task(conn, customer_id, loan_id, emi_id, kind, priority, reason, comm_id, now, due_at=None) -> None:
    conn.execute(
        """INSERT INTO followup_tasks (customer_id, loan_id, emi_id, kind, priority, status, reason,
               communication_id, due_at, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)""",
        (customer_id, loan_id, emi_id, kind, priority, reason, comm_id, due_at, iso(now)),
    )


def handle_inbound(
    conn: sqlite3.Connection,
    config: AutomationConfig,
    policy: ReminderPolicy,
    channel: str,
    sender: str,
    text: str,
    now: datetime,
    provider_message_id: str | None = None,
    subject: str | None = None,
) -> InboundResult:
    """Must run inside a write transaction."""
    identifier = normalize_email(sender) if channel == "email" else normalize_phone(sender)
    text = (text or "").strip()[:4000]
    customer = None
    if identifier:
        column = "email" if channel == "email" else "phone"
        customer = conn.execute(f"SELECT * FROM customers WHERE {column} = ?", (identifier,)).fetchone()

    intent = classify(text) if text else "OTHER"
    emi = _open_emi(conn, customer["customer_id"]) if customer else None
    cur = conn.execute(
        """INSERT INTO communications (customer_id, loan_id, channel, direction, kind, provider_message_id,
               identifier, subject, content, intent, status, created_at)
           VALUES (?, ?, ?, 'inbound', 'customer_reply', ?, ?, ?, ?, ?, 'received', ?)""",
        (customer["customer_id"] if customer else None, emi["loan_id"] if emi else None, channel,
         provider_message_id, identifier, subject, text, intent, iso(now)),
    )
    comm_id = cur.lastrowid
    masked = mask_identifier(channel, identifier)
    actions: list[str] = []

    if customer is None:
        _task(conn, None, None, None, "unmatched_reply", "normal",
              f"{channel} reply from an unknown sender ({masked})", comm_id, now)
        audit(conn, "system", "inbound.unmatched", "communication", comm_id, {"channel": channel, "from": masked})
        return InboundResult(comm_id, None, intent, None, channel, identifier, ["followup:unmatched_reply"])

    if customer["human_takeover"] and intent != "OPT_OUT":
        _task(conn, customer["customer_id"], emi["loan_id"] if emi else None, emi["id"] if emi else None,
              "human_agent_message", "high", f"Customer under human takeover sent message: {text[:200]}", comm_id, now)
        audit(conn, "system", "inbound.human_active", "communication", comm_id, {"customer_id": customer["customer_id"]})
        return InboundResult(comm_id, customer["customer_id"], intent, None, channel, identifier, ["human_takeover_active"])

    cid = customer["customer_id"]
    loan_id = emi["loan_id"] if emi else None
    emi_id = emi["id"] if emi else None
    tz = ZoneInfo(customer["timezone"])
    today = now.astimezone(tz).date()
    name = customer["name"].split()[0] if customer["name"] else "there"
    support = " / ".join(x for x in (config.support_phone, config.support_email) if x)
    help_line = f" You can also reach us at {support}." if support else ""
    reply: str | None = None

    if intent == "HUMAN_AGENT":
        conn.execute("UPDATE customers SET human_takeover = 1, updated_at = ? WHERE customer_id = ?", (iso(now), cid))
        _task(conn, cid, loan_id, emi_id, "human_agent_requested", "high",
              "Customer requested human agent / executive", comm_id, now)
        actions += ["human_takeover_enabled", "followup:human_agent_requested"]
        reply = (f"Namaste {name} ji, humne aapka request note kar liya hai. Ek customer care executive "
                 f"aapse jald hi WhatsApp ya phone par connect karega.{help_line}")
    elif intent == "DUE_DATE":
        if emi is not None:
            outstanding = max(Decimal("0"), Decimal(emi["emi_amount"]) - Decimal(emi["amount_paid"]))
            due = datetime.fromisoformat(emi["due_date"]).strftime("%d %b %Y")
            reply = (f"Namaste {name} ji, aapke loan {loan_id} ki due date {due} hai aur outstanding balance "
                     f"{format_inr(outstanding)} hai.")
            link = payment_link(config, loan_id)
            if link:
                reply += f" Pay securely: {link}"
            reply += help_line
        else:
            reply = f"Hello {name}, our records show no pending EMI on your account.{help_line}"
    elif intent == "OPT_OUT":
        conn.execute(
            """INSERT OR IGNORE INTO suppressions (channel, identifier, customer_id, reason, source, created_at)
               VALUES (?, ?, ?, 'customer_opt_out', ?, ?)""", (channel, identifier, cid, f"inbound:{comm_id}", iso(now)))
        actions.append(f"suppressed:{channel}")
        reply = (f"You will no longer receive payment reminders from {config.company_name} on this channel."
                 f"{help_line}")
    elif intent == "DISPUTE":
        conn.execute("UPDATE customers SET reminders_on_hold = 1, hold_reason = 'dispute', updated_at = ? "
                     "WHERE customer_id = ?", (iso(now), cid))
        reconcile_customer(conn, cid, policy, now, "system")
        _task(conn, cid, loan_id, emi_id, "dispute", "high", "Customer disputed the loan or raised a complaint",
              comm_id, now)
        if emi_id:
            conn.execute("UPDATE escalation_cases SET status = 'under_review', updated_at = ? WHERE emi_id = ? AND status = 'open'", (iso(now), emi_id))
        actions += ["customer_on_hold", "followup:dispute"]
        reply = ("Thank you for letting us know. We have paused automated reminders and a member of our team "
                 f"will review your concern and contact you.{help_line}")
    elif intent == "PAID_CLAIM":
        if emi is not None:
            conn.execute(
                "UPDATE emis SET payment_claim_pending = 1, updated_at = ? WHERE customer_id = ? "
                "AND payment_status IN ('pending','overdue','partially_paid')", (iso(now), cid))
            _task(conn, cid, loan_id, emi_id, "verify_payment", "high",
                  "Customer says they have paid; verify before further reminders", comm_id, now)
            actions += ["payment_claim_flagged", "followup:verify_payment"]
            paused = " We will not send further reminders while we verify it." if policy.suppress_on_payment_claim else ""
            reply = (f"Thank you, {name}. We have noted that you made the payment for loan {loan_id}. "
                     f"Our team will verify it against our records.{paused}{help_line}")
        else:
            reply = f"Thank you, {name}. Our records show no pending EMI on your account.{help_line}"
    elif intent == "HARDSHIP" or intent == "MORE_TIME":
        _task(conn, cid, loan_id, emi_id, "hardship" if intent == "HARDSHIP" else "more_time_request", "high",
              "Customer reported difficulty paying" if intent == "HARDSHIP" else "Customer asked for more time",
              comm_id, now)
        actions.append(f"followup:{'hardship' if intent == 'HARDSHIP' else 'more_time_request'}")
        reply = (f"Thank you for telling us, {name}. We have shared your request with our team, and a "
                 f"representative will contact you to discuss it.{help_line}")
    elif intent == "PROMISE_TO_PAY":
        promised = extract_promise_date(text, today)
        conn.execute(
            """INSERT INTO payment_commitments (customer_id, emi_id, promised_date, raw_text, communication_id,
                   created_at) VALUES (?, ?, ?, ?, ?, ?)""",
            (cid, emi_id, promised.isoformat() if promised else None, text[:500], comm_id, iso(now)))
        follow_on = (promised or today) + timedelta(days=1)
        _task(conn, cid, loan_id, emi_id, "check_commitment", "normal",
              f"Customer committed to pay{' on ' + promised.isoformat() if promised else ''}",
              comm_id, now, due_at=follow_on.isoformat())
        actions += ["commitment_recorded", "followup:check_commitment"]
        if emi is not None:
            amount = format_inr(max(Decimal("0"), Decimal(emi["emi_amount"]) - Decimal(emi["amount_paid"])))
            when = f" on {promised.strftime('%d %b %Y')}" if promised else ""
            reply = f"Thank you, {name}. We have noted that you plan to pay {amount} for loan {loan_id}{when}."
            link = payment_link(config, loan_id)
            if link:
                reply += f" You can pay here: {link}"
            reply += help_line
    elif intent in ("PAYMENT_DETAILS", "BALANCE"):
        if emi is not None:
            outstanding = max(Decimal("0"), Decimal(emi["emi_amount"]) - Decimal(emi["amount_paid"]))
            due = datetime.fromisoformat(emi["due_date"]).strftime("%d %b %Y")
            reply = (f"Hello {name}, your EMI for loan {loan_id} has {format_inr(outstanding)} outstanding, "
                     f"due on {due}.")
            link = payment_link(config, loan_id)
            if link:
                reply += f" Pay securely: {link}"
            if config.payment_instructions:
                reply += f" {config.payment_instructions}"
            if not link and not config.payment_instructions:
                _task(conn, cid, loan_id, emi_id, "payment_details_request", "normal",
                      "Customer asked how to pay; no payment instructions are configured", comm_id, now)
                actions.append("followup:payment_details_request")
                reply += " Our team will share the payment details with you shortly."
            reply += help_line
        else:
            reply = f"Hello {name}, our records show no pending EMI on your account.{help_line}"
    else:
        _task(conn, cid, loan_id, emi_id, "review_reply", "low", "Customer reply needs review", comm_id, now)
        actions.append("followup:review_reply")
        reply = f"Thank you for your message, {name}. A member of our team will get back to you.{help_line}"

    audit(conn, "system", "inbound.processed", "communication", comm_id,
          {"channel": channel, "customer_id": cid, "intent": intent, "actions": actions})
    send_reply = (
        reply is not None
        and policy.auto_reply_enabled
        and channel in policy.auto_reply_channels
        and (intent == "OPT_OUT" or not conn.execute(
            "SELECT 1 FROM suppressions WHERE channel = ? AND identifier = ?", (channel, identifier)).fetchone())
    )
    return InboundResult(comm_id, cid, intent, reply if send_reply else None, channel, identifier, actions)
