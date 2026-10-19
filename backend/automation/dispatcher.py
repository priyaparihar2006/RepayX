"""Executes due reminder jobs.

Duplicate-send protection, in layers:
1. Claims are atomic (BEGIN IMMEDIATE + status check), so one job runs in one worker.
2. Each (job, channel) has exactly one delivery row (UNIQUE), and its idempotency key
   is fixed. A delivery that is accepted/delivered/read is never sent again.
3. The delivery is marked 'sending' and committed BEFORE the provider call. If the
   process dies mid-call, recovery marks it 'unknown' and it is NOT resent
   automatically, because the provider may already have it.
4. Ambiguous timeouts are likewise recorded as 'unknown' rather than retried.
"""

from __future__ import annotations

import json
import logging
import random
import sqlite3
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from automation.audit import audit
from automation.config import AutomationConfig
from automation.db import Database
from automation.messages import apps_script_content, render_reminder
from automation.policy import (
    ineligibility_reason,
    next_contact_time,
    reminder_still_relevant,
    within_contact_window,
)
from automation.policy_settings import CHANNELS, PolicyStore, ReminderPolicy
from automation.providers import OutboundMessage, Provider, RateLimiter, SendResult
from automation.scheduler import snapshot_from_rows
from automation.util import iso, mask_identifier, parse_iso, utcnow

logger = logging.getLogger("repayx.automation.dispatcher")

SUCCESS = ("accepted", "delivered", "read")
IN_FLIGHT = ("sending", "unknown")
CONSENT_OK = {"granted", "unknown"}


@dataclass
class ChannelDecision:
    channel: str
    recipient: str | None
    skip_reason: str | None


class Dispatcher:
    def __init__(self, db: Database, config: AutomationConfig, policy_store: PolicyStore,
                 providers: dict[str, Provider], worker_id: str | None = None):
        self.db = db
        self.config = config
        self.policy_store = policy_store
        self.providers = providers
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.limiters = {ch: RateLimiter(config.provider_rate_per_second) for ch in CHANNELS}

    # ------------------------------------------------------------------ queue mechanics

    def recover_stale(self, now: datetime) -> int:
        """Return jobs whose lease expired (worker crashed) to the queue."""
        now_s = iso(now)
        with self.db.write() as conn:
            stale = conn.execute(
                "SELECT id FROM reminder_jobs WHERE status = 'processing' AND lease_until < ?", (now_s,)
            ).fetchall()
            for row in stale:
                n = conn.execute(
                    """UPDATE message_deliveries SET status = 'unknown', error_code = 'worker_interrupted',
                           error_message = 'Worker stopped during the provider call; not resent automatically.',
                           updated_at = ? WHERE job_id = ? AND status = 'sending'""",
                    (now_s, row["id"]),
                ).rowcount
                conn.execute(
                    """UPDATE reminder_jobs SET status = 'pending', lease_until = NULL, worker_id = NULL,
                           run_at_utc = ?, updated_at = ? WHERE id = ? AND status = 'processing'""",
                    (now_s, now_s, row["id"]),
                )
                audit(conn, "system", "reminder.lease_recovered", "reminder_job", row["id"],
                      {"deliveries_marked_unknown": n})
        return len(stale)

    def claim(self, now: datetime, limit: int) -> list[str]:
        now_s = iso(now)
        lease = iso(now + timedelta(seconds=self.config.lease_seconds))
        with self.db.write() as conn:
            ids = [r["id"] for r in conn.execute(
                """SELECT id FROM reminder_jobs WHERE status IN ('pending','retry') AND run_at_utc <= ?
                   ORDER BY run_at_utc LIMIT ?""", (now_s, limit)).fetchall()]
            claimed = []
            for job_id in ids:
                n = conn.execute(
                    """UPDATE reminder_jobs SET status = 'processing', lease_until = ?, worker_id = ?,
                           attempt_count = attempt_count + 1, updated_at = ?
                       WHERE id = ? AND status IN ('pending','retry')""",
                    (lease, self.worker_id, now_s, job_id),
                ).rowcount
                if n:
                    claimed.append(job_id)
        return claimed

    def _finish(self, job_id: str, status: str, reason: str | None, now: datetime,
                run_at: datetime | None = None, error: str | None = None, note: str | None = None,
                refund_attempt: bool = False) -> None:
        now_s = iso(now)
        terminal = status not in ("pending", "retry")
        with self.db.write() as conn:
            conn.execute(
                f"""UPDATE reminder_jobs SET status = ?, outcome_reason = ?, last_error = COALESCE(?, last_error),
                       lease_until = NULL, worker_id = NULL, updated_at = ?,
                       run_at_utc = COALESCE(?, run_at_utc),
                       next_retry_at = CASE WHEN ? = 'retry' THEN ? ELSE NULL END,
                       schedule_note = COALESCE(?, schedule_note),
                       completed_at = CASE WHEN ? THEN ? ELSE completed_at END
                       {', attempt_count = MAX(0, attempt_count - 1)' if refund_attempt else ''}
                   WHERE id = ? AND status = 'processing' AND worker_id = ?""",
                (status, reason, error, now_s, iso(run_at) if run_at else None, status,
                 iso(run_at) if run_at else None, note, int(terminal), now_s, job_id, self.worker_id),
            )
            audit(conn, "system", f"reminder.{status}", "reminder_job", job_id, {"reason": reason})

    # ------------------------------------------------------------------ eligibility

    def channel_decisions(self, conn: sqlite3.Connection, customer: sqlite3.Row,
                          policy: ReminderPolicy) -> list[ChannelDecision]:
        decisions = []
        for ch in policy.channel_order:
            recipient = customer["email"] if ch == "email" else customer["phone"]
            reason = None
            if not policy.channels_enabled.get(ch, False):
                reason = "channel_disabled_globally"
            elif not customer[f"{ch}_enabled"]:
                reason = "channel_disabled_for_customer"
            elif not recipient:
                reason = "no_contact_for_channel"
            elif customer["consent_status"] == "revoked":
                reason = "consent_revoked"
            elif customer["consent_status"] not in CONSENT_OK or (
                    (policy.require_explicit_consent or
                     (ch == "email" and self.config.email_provider == "google_apps_script"))
                    and customer["consent_status"] != "granted"):
                reason = "consent_not_granted"
            elif conn.execute("SELECT 1 FROM suppressions WHERE channel = ? AND identifier = ?",
                              (ch, recipient)).fetchone():
                reason = "recipient_suppressed"
            else:
                problem = self.providers[ch].configuration_problem()
                if problem:
                    reason = "provider_not_configured"
                elif self.config.mode == "live" and self.config.test_recipients:
                    if ch == "email":
                        allowed_emails = {r.lower().strip() for r in self.config.test_recipients if "@" in r}
                        if allowed_emails and recipient.lower().strip() not in allowed_emails:
                            reason = "test_mode_recipient_not_allowlisted"
                    else:
                        allowed_phones = {r.strip() for r in self.config.test_recipients if "@" not in r}
                        if allowed_phones and recipient.strip() not in allowed_phones:
                            reason = "test_mode_recipient_not_allowlisted"
            decisions.append(ChannelDecision(ch, recipient, reason))
        return decisions

    # ------------------------------------------------------------------ job execution

    def process_job(self, job_id: str, now: datetime) -> str:
        started = time.monotonic()
        policy = self.policy_store.get()
        with self.db.read() as conn:
            job = conn.execute("SELECT * FROM reminder_jobs WHERE id = ?", (job_id,)).fetchone()
            if job is None or job["status"] != "processing" or job["worker_id"] != self.worker_id:
                return "not_owned"
            if job["channel_strategy"]:
                policy = policy.model_copy(update={"channel_strategy": job["channel_strategy"]})
            emi = conn.execute("SELECT * FROM emis WHERE id = ?", (job["emi_id"],)).fetchone()
            customer = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (emi["customer_id"],)).fetchone()
            decisions = self.channel_decisions(conn, customer, policy)
            deliveries = {r["channel"]: r for r in conn.execute(
                "SELECT * FROM message_deliveries WHERE job_id = ?", (job_id,)).fetchall()}

        snap = snapshot_from_rows(emi, customer)
        tz = ZoneInfo(customer["timezone"])
        local_now = now.astimezone(tz)

        # 1. Late-job policy: never silently send long after the intended time.
        lateness_min = (now - parse_iso(job["run_at_utc"])).total_seconds() / 60
        if lateness_min > policy.max_lateness_minutes:
            self._finish(job_id, "missed", f"runnable {int(lateness_min)} min after its run time "
                                           f"(limit {policy.max_lateness_minutes} min)", now)
            return "missed"
        # 2. A pre-due reminder after the due date (etc.) would be misleading.
        if not reminder_still_relevant(job["reminder_type"], snap.due_date, local_now):
            self._finish(job_id, "skipped", "reminder_no_longer_relevant", now)
            return "skipped"
        # 3. Authoritative payment status, read now, not from the CSV snapshot.
        reason = ineligibility_reason(snap)
        if reason:
            self._finish(job_id, "cancelled", reason, now)
            return "cancelled"
        if customer["reminders_on_hold"]:
            self._finish(job_id, "cancelled", "customer_on_hold", now)
            return "cancelled"
        if emi["payment_claim_pending"] and policy.suppress_on_payment_claim:
            self._finish(job_id, "skipped", "payment_verification_pending", now)
            return "skipped"
        # 4. Contact window in the customer's timezone.
        if not within_contact_window(local_now, policy):
            nxt = next_contact_time(local_now, policy)
            self._finish(job_id, "pending", None, now, run_at=nxt,
                         note=f"Deferred to {nxt.strftime('%Y-%m-%d %H:%M')} ({customer['timezone']}): outside contact window",
                         refund_attempt=True)
            return "deferred"

        eligible = [d for d in decisions if d.skip_reason is None]
        self._record_skips(job_id, [d for d in decisions if d.skip_reason], deliveries, now)
        if not eligible:
            summary = ", ".join(f"{d.channel}:{d.skip_reason}" for d in decisions)
            self._finish(job_id, "skipped", f"no_eligible_channel ({summary})", now)
            return "skipped"

        content = render_reminder(self.config, customer["name"], emi["loan_id"], snap.outstanding,
                                  snap.due_date, local_now)
        if policy.channel_strategy == "fallback":
            self._run_fallback(job, eligible, deliveries, content, customer, now)
        else:
            self._run_all(job, eligible, deliveries, content, customer, now)
        return self._finalize(job_id, [d.channel for d in eligible], policy,
                              now + timedelta(seconds=time.monotonic() - started))

    def _record_skips(self, job_id: str, skipped: list[ChannelDecision], deliveries: dict, now: datetime) -> None:
        now_s = iso(now)
        with self.db.write() as conn:
            for d in skipped:
                existing = deliveries.get(d.channel)
                if existing and existing["status"] in SUCCESS + IN_FLIGHT:
                    continue
                conn.execute(
                    """INSERT INTO message_deliveries (job_id, channel, idempotency_key, recipient, status,
                           skip_reason, created_at, updated_at) VALUES (?, ?, ?, ?, 'skipped', ?, ?, ?)
                       ON CONFLICT (job_id, channel) DO UPDATE SET status = 'skipped',
                           skip_reason = excluded.skip_reason, updated_at = excluded.updated_at
                       WHERE message_deliveries.status NOT IN ('accepted','delivered','read','sending','unknown')""",
                    (job_id, d.channel, f"{job_id}:{d.channel}", mask_identifier(d.channel, d.recipient),
                     d.skip_reason, now_s, now_s),
                )

    def _run_fallback(self, job, eligible, deliveries, content, customer, now) -> None:
        started = time.monotonic()
        if any(d["status"] in SUCCESS for d in deliveries.values()):
            return
        for decision in eligible:
            current = deliveries.get(decision.channel)
            if current is not None:
                if current["status"] == "failed":
                    continue  # permanently failed: fall back to the next channel
                if current["status"] in IN_FLIGHT:
                    return  # may already have reached the customer: never fall through
                if current["status"] == "retry_scheduled" and parse_iso(current["next_retry_at"]) > now:
                    return
            result = self._attempt(job, decision, content, customer,
                                   now + timedelta(seconds=time.monotonic() - started))
            if result is None or result.accepted or result.transient or result.error_code == "ambiguous_timeout":
                return

    def _run_all(self, job, eligible, deliveries, content, customer, now) -> None:
        started = time.monotonic()
        for decision in eligible:
            current = deliveries.get(decision.channel)
            if current is not None:
                if current["status"] in SUCCESS + IN_FLIGHT + ("failed",):
                    continue
                if current["status"] == "retry_scheduled" and parse_iso(current["next_retry_at"]) > now:
                    continue
            self._attempt(job, decision, content, customer,
                          now + timedelta(seconds=time.monotonic() - started))

    def _backoff(self, attempt: int) -> timedelta:
        delay = min(self.config.retry_max_seconds, self.config.retry_base_seconds * (2 ** max(0, attempt - 1)))
        return timedelta(seconds=delay + random.uniform(0, delay * 0.1))

    def _attempt(self, job, decision: ChannelDecision, content, customer, now: datetime) -> SendResult | None:
        started = time.monotonic()
        ch, job_id = decision.channel, job["id"]
        key = f"{job_id}:{ch}"
        provider = self.providers[ch]
        now_s = iso(now)
        with self.db.write() as conn:
            owned = conn.execute("SELECT 1 FROM reminder_jobs WHERE id = ? AND status = 'processing' "
                                 "AND worker_id = ?", (job_id, self.worker_id)).fetchone()
            if not owned:
                return None
            conn.execute(
                """INSERT INTO message_deliveries (job_id, channel, idempotency_key, status, created_at, updated_at)
                   VALUES (?, ?, ?, 'queued', ?, ?) ON CONFLICT (job_id, channel) DO NOTHING""",
                (job_id, ch, key, now_s, now_s),
            )
            row = conn.execute("SELECT * FROM message_deliveries WHERE job_id = ? AND channel = ?",
                               (job_id, ch)).fetchone()
            if row["status"] in SUCCESS + IN_FLIGHT:
                return None
            if row["attempt_count"] >= self.config.retry_max_attempts:
                conn.execute(
                    """UPDATE message_deliveries SET status = 'failed', error_code = 'max_attempts_exhausted',
                           failed_at = ?, updated_at = ? WHERE id = ?""", (now_s, now_s, row["id"]))
                return SendResult.fail("max_attempts_exhausted", "Retry limit reached.", transient=False)
            claimed = conn.execute(
                """UPDATE message_deliveries SET status = 'sending', attempt_count = attempt_count + 1,
                       recipient = ?, provider = ?, skip_reason = NULL, next_retry_at = NULL, updated_at = ?, last_attempt_at = ?
                   WHERE id = ? AND status NOT IN ('accepted','delivered','read','sending','unknown')""",
                (mask_identifier(ch, decision.recipient), provider.name, now_s, now_s, row["id"]),
            ).rowcount
            if not claimed:
                return None
            attempt_no = row["attempt_count"] + 1
            delivery_id = row["id"]

        message = OutboundMessage(
            channel=ch, recipient=decision.recipient, idempotency_key=key,
            text=content.sms_text if ch == "sms" else content.text,
            subject=content.subject if ch == "email" else None,
            html=content.html if ch == "email" else None,
            language=customer["preferred_language"], template_params=content.template_params,
        )
        if ch == "email" and self.config.email_provider == "google_apps_script":
            message.subject, message.text, message.html = apps_script_content(content.template_params)
        self.limiters[ch].wait()
        try:
            result = provider.send(message)
        except Exception as exc:  # adapter bug: we cannot know whether anything was sent
            logger.exception("Provider %s raised for delivery %s", provider.name, delivery_id)
            result = SendResult(accepted=False, error_code="ambiguous_timeout",
                                error_message=f"Adapter error ({type(exc).__name__}); state unknown.")

        done_s = iso(now + timedelta(seconds=time.monotonic() - started))
        with self.db.write() as conn:
            if result.accepted:
                conn.execute(
                    """UPDATE message_deliveries SET status = 'accepted', provider_message_id = ?, accepted_at = ?,
                           error_code = NULL, error_message = NULL, updated_at = ? WHERE id = ?""",
                    (result.provider_message_id, done_s, done_s, delivery_id))
                conn.execute(
                    """INSERT INTO communications (customer_id, loan_id, channel, direction, kind, job_id, delivery_id,
                           provider_message_id, identifier, subject, content, status, created_at)
                       VALUES (?, ?, ?, 'outbound', 'reminder', ?, ?, ?, ?, ?, ?, 'accepted', ?)""",
                    (job["customer_id"], job["loan_id"], ch, job_id, delivery_id, result.provider_message_id,
                     decision.recipient, message.subject, message.text, done_s))
            elif result.error_code == "ambiguous_timeout":
                conn.execute(
                    """UPDATE message_deliveries SET status = 'unknown', error_code = ?, error_message = ?,
                           updated_at = ? WHERE id = ?""",
                    (result.error_code, result.error_message, done_s, delivery_id))
            elif result.transient and attempt_no < self.config.retry_max_attempts:
                retry_at = now + self._backoff(attempt_no)
                conn.execute(
                    """UPDATE message_deliveries SET status = 'retry_scheduled', next_retry_at = ?, error_code = ?,
                           error_message = ?, updated_at = ? WHERE id = ?""",
                    (iso(retry_at), result.error_code, result.error_message, done_s, delivery_id))
            else:
                code = result.error_code if not result.transient else f"max_attempts_exhausted:{result.error_code}"
                conn.execute(
                    """UPDATE message_deliveries SET status = 'failed', error_code = ?, error_message = ?,
                           failed_at = ?, updated_at = ? WHERE id = ?""",
                    (code, result.error_message, done_s, done_s, delivery_id))
            if result.suppress_recipient:
                conn.execute(
                    """INSERT OR IGNORE INTO suppressions (channel, identifier, customer_id, reason, source, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (ch, decision.recipient, job["customer_id"], result.error_code or "provider_suppression",
                     f"provider:{provider.name}", done_s))
            audit(conn, "system", "delivery.attempted", "message_delivery", delivery_id, {
                "job_id": job_id, "channel": ch, "provider": provider.name, "attempt": attempt_no,
                "accepted": result.accepted, "error_code": result.error_code,
                "recipient": mask_identifier(ch, decision.recipient),
            })
        logger.info("delivery job=%s channel=%s provider=%s accepted=%s error=%s", job_id, ch, provider.name,
                    result.accepted, result.error_code)
        return result

    def _finalize(self, job_id: str, eligible_channels: list[str], policy: ReminderPolicy, now: datetime) -> str:
        with self.db.read() as conn:
            rows = {r["channel"]: r for r in conn.execute(
                "SELECT * FROM message_deliveries WHERE job_id = ?", (job_id,)).fetchall()}
        considered = [rows[c] for c in eligible_channels if c in rows]
        success = [r for r in considered if r["status"] in SUCCESS]
        retrying = [r for r in considered if r["status"] == "retry_scheduled"]
        unknown = [r for r in considered if r["status"] in IN_FLIGHT]
        exhausted = any((r["error_code"] or "").startswith("max_attempts_exhausted") for r in considered)
        errors = "; ".join(f"{r['channel']}: {r['error_code']}" for r in considered if r["error_code"])

        if policy.channel_strategy == "fallback" and success:
            status, reason = "completed", f"accepted via {success[0]['channel']}"
        elif retrying:
            next_at = min(parse_iso(r["next_retry_at"]) for r in retrying)
            self._finish(job_id, "retry", "transient_failure", now, run_at=next_at, error=errors)
            return "retry"
        elif policy.channel_strategy == "all" and success and len(success) == len(eligible_channels):
            status, reason = "completed", "accepted on all eligible channels"
        elif success:
            status, reason = "partially_completed", "accepted on " + ", ".join(r["channel"] for r in success)
        elif unknown:
            status, reason = "failed", "delivery_state_unknown: manual review required"
        else:
            status, reason = ("dead_letter" if exhausted else "failed"), "all eligible channels failed"
        self._finish(job_id, status, reason, now, error=errors or None)
        return status

    # ------------------------------------------------------------------ loop entry

    def heartbeat(self, now: datetime, hostname: str, processed: int, error: str | None = None) -> None:
        now_s = iso(now)
        with self.db.write() as conn:
            conn.execute(
                """INSERT INTO worker_heartbeats (worker_id, hostname, started_at, last_tick_at, jobs_processed, last_error)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(worker_id) DO UPDATE SET last_tick_at = excluded.last_tick_at,
                       jobs_processed = worker_heartbeats.jobs_processed + ?, last_error = excluded.last_error""",
                (self.worker_id, hostname, now_s, now_s, processed, error, processed),
            )

    def run_once(self, now: datetime, *, real_time: bool = False) -> dict:
        """One scheduler tick. Safe to call repeatedly; used by the worker loop and tests."""
        policy = self.policy_store.get()
        recovered = self.recover_stale(now)
        if policy.automation_paused:
            return {"paused": True, "recovered": recovered, "claimed": 0, "outcomes": {}}
        outcomes: dict[str, int] = {}
        claimed = self.claim(now, self.config.batch_size)
        for job_id in claimed:
            try:
                outcome = self.process_job(job_id, utcnow() if real_time else now)
            except Exception as exc:
                logger.exception("Job %s failed unexpectedly", job_id)
                with self.db.read() as conn:
                    attempts = conn.execute("SELECT attempt_count FROM reminder_jobs WHERE id = ?",
                                            (job_id,)).fetchone()[0]
                if attempts >= self.config.retry_max_attempts:
                    self._finish(job_id, "dead_letter", "internal_error", now, error=type(exc).__name__)
                else:
                    self._finish(job_id, "retry", "internal_error", now,
                                 run_at=now + self._backoff(attempts), error=type(exc).__name__)
                outcome = "internal_error"
            outcomes[outcome] = outcomes.get(outcome, 0) + 1
        return {"paused": False, "recovered": recovered, "claimed": len(claimed), "outcomes": outcomes}


def outstanding_amount(emi: sqlite3.Row) -> Decimal:
    return max(Decimal("0.00"), Decimal(emi["emi_amount"]) - Decimal(emi["amount_paid"]))


__all__ = ["Dispatcher", "SUCCESS", "outstanding_amount", "json"]
