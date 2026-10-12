"""SQLite storage for the reminder engine.

WAL mode lets the API and the worker process share the file safely. Writers that
must be atomic (job claims, imports, reconciliation) use BEGIN IMMEDIATE so only
one writer holds the lock, and unique constraints make duplicate jobs or
duplicate per-channel sends impossible even if application logic is wrong.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA_VERSION = 2

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    timezone TEXT NOT NULL,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    consent_status TEXT NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('granted','revoked','unknown')),
    whatsapp_enabled INTEGER NOT NULL DEFAULT 1,
    sms_enabled INTEGER NOT NULL DEFAULT 1,
    email_enabled INTEGER NOT NULL DEFAULT 1,
    reminders_on_hold INTEGER NOT NULL DEFAULT 0,
    hold_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS emis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    loan_id TEXT NOT NULL,
    installment_key TEXT NOT NULL,
    emi_amount TEXT NOT NULL,
    amount_paid TEXT NOT NULL DEFAULT '0.00',
    due_date TEXT NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN
        ('pending','overdue','partially_paid','paid','cancelled','waived')),
    payment_status_source TEXT NOT NULL,
    payment_status_updated_at TEXT NOT NULL,
    payment_claim_pending INTEGER NOT NULL DEFAULT 0,
    csv_days_past_due INTEGER,
    reminder_date TEXT,
    reminder_time TEXT,
    row_hash TEXT NOT NULL,
    last_import_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (loan_id, installment_key)
);
CREATE INDEX IF NOT EXISTS idx_emis_customer ON emis(customer_id);
CREATE INDEX IF NOT EXISTS idx_emis_status ON emis(payment_status, due_date);

CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_sha256 TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing','completed','failed','dry_run')),
    mapping_json TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    unchanged_rows INTEGER NOT NULL DEFAULT 0,
    rejected_rows INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    reminders_scheduled INTEGER NOT NULL DEFAULT 0,
    reminders_updated INTEGER NOT NULL DEFAULT 0,
    reminders_cancelled INTEGER NOT NULL DEFAULT 0,
    reminders_skipped_past INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS import_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_id INTEGER NOT NULL REFERENCES imports(id),
    row_number INTEGER NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('error','warning')),
    field TEXT,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_import_issues ON import_issues(import_id, row_number);

CREATE TABLE IF NOT EXISTS reminder_jobs (
    id TEXT PRIMARY KEY,
    emi_id INTEGER NOT NULL REFERENCES emis(id),
    customer_id TEXT NOT NULL,
    loan_id TEXT NOT NULL,
    reminder_key TEXT NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('explicit','pre_due','due_date','overdue')),
    due_date TEXT NOT NULL,
    scheduled_at_utc TEXT NOT NULL,
    run_at_utc TEXT NOT NULL,
    timezone TEXT NOT NULL,
    schedule_note TEXT,
    channels_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN
        ('pending','processing','retry','completed','partially_completed','failed',
         'dead_letter','cancelled','skipped','missed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    lease_until TEXT,
    worker_id TEXT,
    manual_override INTEGER NOT NULL DEFAULT 0,
    outcome_reason TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE (emi_id, reminder_key)
);
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON reminder_jobs(status, run_at_utc);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON reminder_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON reminder_jobs(scheduled_at_utc);

CREATE TABLE IF NOT EXISTS message_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL REFERENCES reminder_jobs(id),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
    idempotency_key TEXT NOT NULL UNIQUE,
    recipient TEXT,
    provider TEXT,
    status TEXT NOT NULL CHECK (status IN
        ('queued','sending','accepted','delivered','read','failed','retry_scheduled','skipped','unknown')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    provider_message_id TEXT,
    next_retry_at TEXT,
    error_code TEXT,
    error_message TEXT,
    skip_reason TEXT,
    accepted_at TEXT,
    delivered_at TEXT,
    read_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (job_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_provider_id ON message_deliveries(provider, provider_message_id);

CREATE TABLE IF NOT EXISTS communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    loan_id TEXT,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
    kind TEXT NOT NULL,
    job_id TEXT,
    delivery_id INTEGER,
    provider_message_id TEXT,
    identifier TEXT,
    subject TEXT,
    content TEXT NOT NULL,
    intent TEXT,
    status TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comms_customer ON communications(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comms_created ON communications(created_at);

CREATE TABLE IF NOT EXISTS suppressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    identifier TEXT NOT NULL,
    customer_id TEXT,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (channel, identifier)
);

CREATE TABLE IF NOT EXISTS followup_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    loan_id TEXT,
    emi_id INTEGER,
    kind TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low','normal','high')),
    status TEXT NOT NULL CHECK (status IN ('open','resolved')),
    reason TEXT NOT NULL,
    communication_id INTEGER,
    due_at TEXT,
    resolution_note TEXT,
    resolved_by TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followup_tasks(status, priority);

CREATE TABLE IF NOT EXISTS payment_commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    emi_id INTEGER,
    promised_date TEXT,
    raw_text TEXT NOT NULL,
    communication_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','kept','broken','superseded')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emi_id INTEGER NOT NULL REFERENCES emis(id),
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    previous_amount_paid TEXT NOT NULL,
    new_amount_paid TEXT NOT NULL,
    source TEXT NOT NULL,
    actor TEXT NOT NULL,
    reference TEXT,
    note TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
    worker_id TEXT PRIMARY KEY,
    hostname TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_tick_at TEXT NOT NULL,
    jobs_processed INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS webhook_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    received_at TEXT NOT NULL,
    PRIMARY KEY (provider, event_id)
);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=30, isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(db_path)
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA_SQL)
        # Additive, transactional migration; safe when API and worker start together.
        conn.execute("BEGIN IMMEDIATE")
        for table, column in (("emis", "reminder_datetime_utc"), ("emis", "channel_strategy"),
                              ("reminder_jobs", "channel_strategy")):
            columns = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
            if column not in columns:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} TEXT")
        conn.execute(
            "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))",
            (SCHEMA_VERSION,),
        )
        conn.execute("COMMIT")
    finally:
        conn.close()


class Database:
    """Opens a short-lived connection per unit of work (safe across threads and processes)."""

    def __init__(self, db_path: Path):
        self.path = db_path
        init_db(db_path)

    @contextmanager
    def read(self) -> Iterator[sqlite3.Connection]:
        conn = connect(self.path)
        try:
            yield conn
        finally:
            conn.close()

    @contextmanager
    def write(self) -> Iterator[sqlite3.Connection]:
        """An IMMEDIATE transaction: commits on success, rolls back on any exception."""
        conn = connect(self.path)
        try:
            conn.execute("BEGIN IMMEDIATE")
            try:
                yield conn
            except BaseException:
                conn.execute("ROLLBACK")
                raise
            else:
                conn.execute("COMMIT")
        finally:
            conn.close()
