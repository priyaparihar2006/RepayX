"""Administrator-editable reminder policy, persisted in automation_settings.

Defaults come from the environment (AutomationConfig); stored values override them.
Every change is validated as a whole and audited.
"""

from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from automation.audit import audit
from automation.config import AutomationConfig
from automation.db import Database
from automation.util import iso, parse_hhmm, utcnow

Channel = Literal["whatsapp", "sms", "email"]
CHANNELS: tuple[Channel, ...] = ("whatsapp", "sms", "email")


def _hhmm(value: str) -> str:
    parsed = parse_hhmm(value)
    if parsed is None:
        raise ValueError("must be a time in HH:MM (24-hour) format")
    return parsed.strftime("%H:%M")


class ReminderPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    automation_paused: bool = False
    channels_enabled: dict[Channel, bool] = Field(
        default_factory=lambda: {"whatsapp": True, "sms": True, "email": True}
    )
    # all: send on every eligible channel (dispatches both WhatsApp and Email).
    # fallback: try channels in order and stop at the first accepted send.
    channel_strategy: Literal["fallback", "all"] = "all"
    channel_order: list[Channel] = Field(default_factory=lambda: ["whatsapp", "sms", "email"])

    default_reminder_time: str = "10:00"
    pre_due_days: list[int] = Field(default_factory=lambda: [1])
    due_date_reminder: bool = True
    overdue_days: list[int] = Field(default_factory=lambda: [3, 7])
    overdue_repeat_every_days: int = Field(default=7, ge=0, le=60)
    overdue_max_reminders: int = Field(default=4, ge=0, le=20)

    contact_window_start: str = "09:00"
    contact_window_end: str = "19:00"
    contact_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])  # Monday=0

    # A job that becomes runnable more than this many minutes after its run time
    # (e.g. after downtime) is marked 'missed' instead of being sent late.
    max_lateness_minutes: int = Field(default=120, ge=0, le=7 * 24 * 60)

    require_explicit_consent: bool = False
    suppress_on_payment_claim: bool = True
    auto_reply_enabled: bool = True
    auto_reply_channels: list[Channel] = Field(default_factory=lambda: ["whatsapp", "email"])

    @field_validator("default_reminder_time", "contact_window_start", "contact_window_end")
    @classmethod
    def _valid_time(cls, value: str) -> str:
        return _hhmm(value)

    @field_validator("pre_due_days", "overdue_days")
    @classmethod
    def _valid_offsets(cls, value: list[int]) -> list[int]:
        if any(v < 1 or v > 90 for v in value):
            raise ValueError("offsets must be between 1 and 90 days")
        return sorted(set(value))

    @field_validator("channel_order")
    @classmethod
    def _valid_order(cls, value: list[Channel]) -> list[Channel]:
        if sorted(value) != sorted(CHANNELS):
            raise ValueError("channel_order must list whatsapp, sms, and email exactly once")
        return value

    @field_validator("contact_days")
    @classmethod
    def _valid_days(cls, value: list[int]) -> list[int]:
        if not value or any(d < 0 or d > 6 for d in value):
            raise ValueError("contact_days must be weekday numbers 0 (Monday) to 6 (Sunday)")
        return sorted(set(value))

    @model_validator(mode="after")
    def _window_order(self) -> "ReminderPolicy":
        if self.contact_window_start >= self.contact_window_end:
            raise ValueError("contact_window_start must be earlier than contact_window_end")
        return self


def defaults_from_config(config: AutomationConfig) -> ReminderPolicy:
    return ReminderPolicy(
        default_reminder_time=config.default_reminder_time,
        contact_window_start=config.contact_window_start,
        contact_window_end=config.contact_window_end,
    )


class PolicyStore:
    KEY = "reminder_policy"

    def __init__(self, db: Database, config: AutomationConfig):
        self.db = db
        self.config = config

    def get(self) -> ReminderPolicy:
        with self.db.read() as conn:
            row = conn.execute(
                "SELECT value_json FROM automation_settings WHERE key = ?", (self.KEY,)
            ).fetchone()
        base = defaults_from_config(self.config).model_dump()
        if row:
            base.update(json.loads(row["value_json"]))
        return ReminderPolicy.model_validate(base)

    def update(self, changes: dict, actor: str) -> ReminderPolicy:
        current = self.get().model_dump()
        merged = {**current, **changes}
        policy = ReminderPolicy.model_validate(merged)  # raises ValidationError on bad input
        changed = {k: v for k, v in policy.model_dump().items() if current.get(k) != v}
        with self.db.write() as conn:
            conn.execute(
                """INSERT INTO automation_settings (key, value_json, updated_by, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
                       updated_by = excluded.updated_by, updated_at = excluded.updated_at""",
                (self.KEY, policy.model_dump_json(), actor, iso(utcnow())),
            )
            audit(conn, actor, "settings.updated", "automation_settings", self.KEY, {"changed": changed})
        return policy
