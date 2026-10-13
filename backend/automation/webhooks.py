"""Provider webhook verification, replay protection, and delivery-status updates."""

from __future__ import annotations

import base64
import hashlib
import hmac
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from automation.audit import audit
from automation.util import iso

STATUS_RANK = {"queued": 0, "sending": 1, "unknown": 1, "retry_scheduled": 1, "accepted": 2, "delivered": 3, "read": 4}


class WebhookAuthError(Exception):
    pass


# ------------------------------------------------------------------ signatures


def verify_meta_signature(app_secret: str, raw_body: bytes, header: str | None) -> None:
    if not app_secret:
        raise WebhookAuthError("WHATSAPP_APP_SECRET is not configured.")
    if not header or not header.startswith("sha256="):
        raise WebhookAuthError("Missing X-Hub-Signature-256.")
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, header[7:]):
        raise WebhookAuthError("Invalid signature.")


def twilio_signature(auth_token: str, url: str, params: dict[str, str]) -> str:
    payload = url + "".join(f"{k}{params[k]}" for k in sorted(params))
    return base64.b64encode(hmac.new(auth_token.encode(), payload.encode(), hashlib.sha1).digest()).decode()


def verify_twilio_signature(auth_token: str, url: str, params: dict[str, str], header: str | None) -> None:
    if not auth_token or not url:
        raise WebhookAuthError("TWILIO_AUTH_TOKEN and TWILIO_WEBHOOK_URL must be configured.")
    if not header or not hmac.compare_digest(twilio_signature(auth_token, url, params), header):
        raise WebhookAuthError("Invalid Twilio signature.")


def verify_mailgun_signature(signing_key: str, timestamp: str, token: str, signature: str,
                             max_age: int, now_ts: float | None = None) -> None:
    if not signing_key:
        raise WebhookAuthError("MAILGUN_WEBHOOK_SIGNING_KEY is not configured.")
    try:
        age = (now_ts or time.time()) - float(timestamp)
    except (TypeError, ValueError) as exc:
        raise WebhookAuthError("Invalid timestamp.") from exc
    if abs(age) > max_age:
        raise WebhookAuthError("Stale webhook.")
    expected = hmac.new(signing_key.encode(), f"{timestamp}{token}".encode(), hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        raise WebhookAuthError("Invalid Mailgun signature.")


def sign_generic(secret: str, raw_body: bytes, timestamp: int) -> str:
    mac = hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={mac}"


def verify_generic_signature(secret: str, raw_body: bytes, header: str | None, max_age: int,
                             now_ts: float | None = None) -> None:
    """X-RepayX-Signature: t=<unix>,v1=<hex hmac_sha256(secret, f'{t}.' + body)>."""
    if not secret:
        raise WebhookAuthError("Webhook secret is not configured.")
    if not header:
        raise WebhookAuthError("Missing X-RepayX-Signature.")
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    try:
        ts = int(parts["t"])
    except (KeyError, ValueError) as exc:
        raise WebhookAuthError("Malformed signature header.") from exc
    if abs((now_ts or time.time()) - ts) > max_age:
        raise WebhookAuthError("Stale webhook.")
    expected = sign_generic(secret, raw_body, ts).split("v1=", 1)[1]
    if not hmac.compare_digest(expected, parts.get("v1", "")):
        raise WebhookAuthError("Invalid signature.")


def already_seen(conn: sqlite3.Connection, provider: str, event_id: str, now: datetime) -> bool:
    """Replay protection: record the event id; True if it was processed before."""
    cur = conn.execute("INSERT OR IGNORE INTO webhook_events (provider, event_id, received_at) VALUES (?, ?, ?)",
                       (provider, event_id[:300], iso(now)))
    return cur.rowcount == 0


# ------------------------------------------------------------------ parsing


@dataclass
class StatusEvent:
    provider_message_id: str
    status: str  # accepted | delivered | read | failed
    error_code: str | None = None
    error_message: str | None = None
    suppress: bool = False


@dataclass
class InboundEvent:
    sender: str
    text: str
    provider_message_id: str
    subject: str | None = None


def parse_meta(payload: dict[str, Any]) -> tuple[list[StatusEvent], list[InboundEvent]]:
    statuses: list[StatusEvent] = []
    inbound: list[InboundEvent] = []
    mapping = {"sent": "accepted", "delivered": "delivered", "read": "read", "failed": "failed"}
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for s in value.get("statuses") or []:
                status = mapping.get(s.get("status"))
                if not status or not s.get("id"):
                    continue
                err = (s.get("errors") or [{}])[0]
                statuses.append(StatusEvent(s["id"], status, str(err.get("code")) if err.get("code") else None,
                                            err.get("title") or err.get("message"), err.get("code") == 131050))
            for m in value.get("messages") or []:
                if not m.get("from") or not m.get("id"):
                    continue
                if m.get("type") == "text":
                    text = (m.get("text") or {}).get("body", "")
                elif m.get("type") == "button":
                    text = (m.get("button") or {}).get("text", "")
                elif m.get("type") == "interactive":
                    inter = m.get("interactive") or {}
                    text = (inter.get("button_reply") or inter.get("list_reply") or {}).get("title", "")
                else:
                    text = f"[{m.get('type', 'unsupported')} message]"
                inbound.append(InboundEvent("+" + m["from"].lstrip("+"), text, m["id"]))
    return statuses, inbound


TWILIO_STATUS = {"queued": "accepted", "accepted": "accepted", "sending": "accepted", "sent": "accepted",
                 "delivered": "delivered", "read": "read", "undelivered": "failed", "failed": "failed"}


# ------------------------------------------------------------------ status application


def apply_status(conn: sqlite3.Connection, provider: str, event: StatusEvent, now: datetime) -> str:
    """Move a delivery forward. Never moves backwards (a late 'sent' after 'read' is ignored)."""
    row = conn.execute(
        "SELECT * FROM message_deliveries WHERE provider = ? AND provider_message_id = ?",
        (provider, event.provider_message_id),
    ).fetchone()
    if row is None:
        return "unknown_message"
    current = row["status"]
    now_s = iso(now)
    if event.status == "failed":
        if current in ("delivered", "read", "failed"):
            return "ignored"
        conn.execute(
            """UPDATE message_deliveries SET status = 'failed', error_code = ?, error_message = ?, failed_at = ?,
                   updated_at = ? WHERE id = ?""",
            (event.error_code or "provider_failed", (event.error_message or "")[:500], now_s, now_s, row["id"]))
        if event.suppress:
            job = conn.execute("SELECT customer_id FROM reminder_jobs WHERE id = ?", (row["job_id"],)).fetchone()
            cust = conn.execute("SELECT phone, email FROM customers WHERE customer_id = ?",
                                (job["customer_id"],)).fetchone()
            identifier = cust["email"] if row["channel"] == "email" else cust["phone"]
            if identifier:
                conn.execute(
                    """INSERT OR IGNORE INTO suppressions (channel, identifier, customer_id, reason, source, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (row["channel"], identifier, job["customer_id"], event.error_code or "provider_suppression",
                     f"webhook:{provider}", now_s))
        _reopen_for_fallback(conn, row["job_id"], now)
    else:
        if STATUS_RANK.get(event.status, 0) <= STATUS_RANK.get(current, 0) or current == "failed":
            return "ignored"
        column = {"accepted": "accepted_at", "delivered": "delivered_at", "read": "read_at"}[event.status]
        conn.execute(
            f"UPDATE message_deliveries SET status = ?, {column} = COALESCE({column}, ?), updated_at = ? WHERE id = ?",
            (event.status, now_s, now_s, row["id"]))
    conn.execute("UPDATE communications SET status = ? WHERE delivery_id = ?", (event.status, row["id"]))
    audit(conn, f"webhook:{provider}", "delivery.status", "message_delivery", row["id"],
          {"status": event.status, "error_code": event.error_code})
    return "applied"


def _reopen_for_fallback(conn: sqlite3.Connection, job_id: str, now: datetime) -> None:
    """If the only accepted channel later fails (e.g. undeliverable number), let the
    fallback strategy try the next channel. The dispatcher re-checks eligibility."""
    job = conn.execute("SELECT * FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
    if job is None or job["status"] != "completed":
        return
    setting = conn.execute("SELECT value_json FROM automation_settings WHERE key = 'reminder_policy'").fetchone()
    if job["channel_strategy"] == "all" or (not job["channel_strategy"] and setting
            and '"channel_strategy":"all"' in setting["value_json"].replace(" ", "")):
        conn.execute("UPDATE reminder_jobs SET status = 'partially_completed', updated_at = ? WHERE id = ?",
                     (iso(now), job_id))
        return
    still_ok = conn.execute(
        "SELECT 1 FROM message_deliveries WHERE job_id = ? AND status IN ('accepted','delivered','read')",
        (job_id,)).fetchone()
    if still_ok:
        return
    conn.execute(
        """UPDATE reminder_jobs SET status = 'pending', run_at_utc = ?, completed_at = NULL,
               outcome_reason = 'reopened: accepted channel failed asynchronously', updated_at = ? WHERE id = ?""",
        (iso(now), iso(now), job_id))
    audit(conn, "system", "reminder.reopened_for_fallback", "reminder_job", job_id, None)
