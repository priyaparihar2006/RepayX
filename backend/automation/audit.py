"""Append-only audit trail. Callers must pass already-masked details (no raw phone/email)."""

from __future__ import annotations

import json
import sqlite3
from typing import Any

from automation.util import iso, utcnow


def audit(
    conn: sqlite3.Connection,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: Any = None,
    details: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        "INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            actor,
            action,
            entity_type,
            None if entity_id is None else str(entity_id),
            json.dumps(details, default=str) if details else None,
            iso(utcnow()),
        ),
    )
