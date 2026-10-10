"""Sandbox provider: accepts messages without contacting any external service.

Used when AUTOMATION_MODE=sandbox so the whole pipeline (scheduling, eligibility,
rendering, idempotency, dashboards) can be exercised with real data without
messaging real customers. Results are labelled with provider 'sandbox' and never
progress past 'accepted', so nothing is reported as delivered.
"""

from __future__ import annotations

import uuid

from automation.providers.base import OutboundMessage, Provider, SendResult


class SandboxProvider(Provider):
    name = "sandbox"
    sandbox = True

    def __init__(self, channel: str):
        self.channel = channel
        self.sent: list[OutboundMessage] = []

    def configuration_problem(self) -> str | None:
        return None

    def send(self, message: OutboundMessage) -> SendResult:
        self.sent.append(message)
        return SendResult.ok(f"sandbox-{uuid.uuid4().hex}", sandbox=True)
