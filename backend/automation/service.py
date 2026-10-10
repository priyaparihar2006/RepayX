"""Wires the engine together. One instance per process (API or worker)."""

from __future__ import annotations

import logging
import socket
import threading
from datetime import datetime

from automation.config import AutomationConfig, get_automation_config
from automation.db import Database
from automation.dispatcher import Dispatcher
from automation.importer import CsvImporter
from automation.policy_settings import PolicyStore
from automation.providers import OutboundMessage, Provider, build_providers
from automation.util import iso, utcnow

logger = logging.getLogger("repayx.automation")


class AutomationService:
    def __init__(self, config: AutomationConfig | None = None, providers: dict[str, Provider] | None = None,
                 worker_id: str | None = None):
        self.config = config or get_automation_config()
        for problem in self.config.validate():
            logger.warning("Automation configuration: %s", problem)
        self.db = Database(self.config.db_path)
        self.policy = PolicyStore(self.db, self.config)
        self.providers = providers or build_providers(self.config)
        self.importer = CsvImporter(self.db, self.config)
        self.dispatcher = Dispatcher(self.db, self.config, self.policy, self.providers, worker_id=worker_id)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------ worker loop

    def tick(self, now: datetime | None = None) -> dict:
        now = now or utcnow()
        error = None
        result: dict = {}
        try:
            result = self.dispatcher.run_once(now)
        except Exception as exc:  # keep the loop alive; surface the error in health
            logger.exception("Scheduler tick failed")
            error = type(exc).__name__
        processed = result.get("claimed", 0)
        try:
            self.dispatcher.heartbeat(now, socket.gethostname(), processed, error)
        except Exception:
            logger.exception("Heartbeat write failed")
        return result

    def run_forever(self) -> None:
        logger.info("Reminder worker %s started (mode=%s, poll=%ss)", self.dispatcher.worker_id,
                    self.config.mode, self.config.poll_seconds)
        while not self._stop.is_set():
            self.tick()
            self._stop.wait(self.config.poll_seconds)
        logger.info("Reminder worker %s stopped", self.dispatcher.worker_id)

    def start_background(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self.run_forever, name="ReminderWorker", daemon=True)
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=10)

    # ------------------------------------------------------------------ replies

    def send_reply(self, channel: str, recipient: str, text: str, customer_id: str | None,
                   loan_id: str | None, inbound_comm_id: int) -> None:
        """Best-effort conversational reply inside the customer's session window."""
        provider = self.providers[channel]
        if provider.configuration_problem():
            status, pid = "failed", None
        else:
            result = provider.send(OutboundMessage(
                channel=channel, recipient=recipient, text=text, idempotency_key=f"reply:{inbound_comm_id}",
                subject="Re: your message" if channel == "email" else None, is_reply=True))
            status, pid = ("accepted" if result.accepted else "failed"), result.provider_message_id
        with self.db.write() as conn:
            conn.execute(
                """INSERT INTO communications (customer_id, loan_id, channel, direction, kind, provider_message_id,
                       identifier, content, status, created_at)
                   VALUES (?, ?, ?, 'outbound', 'auto_reply', ?, ?, ?, ?, ?)""",
                (customer_id, loan_id, channel, pid, recipient, text, status, iso(utcnow())))
