"""CSV import: validate, normalize, upsert customers and EMIs, and reconcile reminder jobs.

Two import types:
- emi_reminders:   customer + EMI records; creates/updates schedules automatically.
- payment_updates: payment status reconciliation for EMIs that already exist.

An import runs in a single transaction, so a crash never leaves half an import
applied. Invalid rows are recorded with reasons, never silently dropped.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from automation.audit import audit
from automation.config import AutomationConfig
from automation.db import Database
from automation.policy import within_contact_window
from automation.policy_settings import ReminderPolicy
from automation.scheduler import ReconcileResult, reconcile_emi
from automation.util import (
    iso,
    mask_email,
    mask_phone,
    normalize_email,
    normalize_phone,
    parse_bool,
    parse_date,
    parse_hhmm,
    parse_money,
    stable_hash,
    UTC,
)

ImportType = Literal["emi_reminders", "payment_updates"]

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "customer_id": ("customer_id", "cust_id", "customer_no", "customer_number", "client_id", "borrower_id"),
    "customer_name": ("customer_name", "name", "borrower_name", "full_name", "client_name"),
    "phone_number": ("phone_number", "phone", "mobile", "mobile_number", "mobile_no", "contact_number",
                     "whatsapp_number", "msisdn"),
    "email": ("email", "email_address", "email_id", "mail"),
    "loan_id": ("loan_id", "loan_number", "loan_no", "loan_account", "loan_account_number"),
    "installment_number": ("installment_number", "installment_no", "emi_number", "emi_no", "emi_id",
                           "installment_id"),
    "emi_amount": ("emi_amount", "emi", "installment_amount", "amount_due", "due_amount", "unpaid_amount"),
    "amount_paid": ("amount_paid", "paid_amount", "paid"),
    "due_date": ("due_date", "emi_due_date", "installment_due_date", "due_on"),
    "payment_status": ("payment_status", "emi_status", "status"),
    "days_past_due": ("days_past_due", "dpd", "days_overdue"),
    "reminder_date": ("reminder_date", "scheduled_date", "message_date"),
    "reminder_datetime": ("reminder_datetime",),
    "channel_strategy": ("channel_strategy",),
    "reminder_time": ("reminder_time", "scheduled_message_time", "scheduled_time", "message_time"),
    "timezone": ("timezone", "time_zone", "tz"),
    "whatsapp_enabled": ("whatsapp_enabled", "whatsapp", "wa_enabled"),
    "sms_enabled": ("sms_enabled", "sms"),
    "email_enabled": ("email_enabled", "email_opt_in"),
    "preferred_language": ("preferred_language", "language", "lang"),
    "consent_status": ("consent_status", "consent", "communication_consent"),
    "payment_reference": ("payment_reference", "transaction_id", "utr", "payment_ref"),
}

REQUIRED_FIELDS: dict[str, tuple[str, ...]] = {
    "emi_reminders": ("customer_id", "customer_name", "loan_id", "emi_amount", "due_date"),
    "payment_updates": ("loan_id", "payment_status"),
}

STATUS_SYNONYMS = {
    "pending": "pending", "unpaid": "pending", "due": "pending", "not_paid": "pending", "open": "pending",
    "overdue": "overdue", "late": "overdue", "defaulted": "overdue", "past_due": "overdue", "bounced": "overdue",
    "partially_paid": "partially_paid", "partial": "partially_paid", "part_paid": "partially_paid",
    "paid": "paid", "settled": "paid", "closed": "paid", "cleared": "paid", "completed": "paid",
    "cancelled": "cancelled", "canceled": "cancelled",
    "waived": "waived", "written_off": "waived",
}
CONSENT_SYNONYMS = {
    "granted": "granted", "yes": "granted", "y": "granted", "true": "granted", "opted_in": "granted",
    "opt_in": "granted", "consented": "granted", "1": "granted",
    "revoked": "revoked", "no": "revoked", "n": "revoked", "false": "revoked", "opted_out": "revoked",
    "opt_out": "revoked", "withdrawn": "revoked", "0": "revoked",
    "unknown": "unknown",
}
NULL_TOKENS = {"", "none", "null", "undefined", "nan", "n/a", "na", "--", "-"}
TERMINAL_NON_CSV_SOURCES = ("manual:", "webhook:")


class ImportRejected(Exception):
    """The file as a whole cannot be imported (bad type, size, encoding, headers)."""

    def __init__(self, code: str, message: str, details: list[dict] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or []


class _DryRunRollback(Exception):
    pass


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.strip().lower()).strip("_")


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return None if text.lower() in NULL_TOKENS else text


def decode_csv(content: bytes, max_bytes: int) -> str:
    if not content:
        raise ImportRejected("empty_file", "The uploaded file is empty.")
    if len(content) > max_bytes:
        raise ImportRejected("file_too_large", f"The file exceeds the {max_bytes // (1024 * 1024)} MB limit.")
    if b"\x00" in content[:4096]:
        raise ImportRejected("not_csv", "The file looks binary, not CSV text.")
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ImportRejected("bad_encoding", "The file must be UTF-8 encoded CSV.")


def read_rows(text: str, max_rows: int) -> tuple[list[str], list[dict[str, str]]]:
    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    try:
        headers = next(reader)
    except StopIteration as exc:
        raise ImportRejected("no_header", "The CSV has no header row.") from exc
    headers = [h.strip() for h in headers]
    if not any(headers):
        raise ImportRejected("no_header", "The CSV header row is empty.")
    seen: set[str] = set()
    for h in headers:
        if h and normalize_header(h) in seen:
            raise ImportRejected("duplicate_header", f"Column '{h}' appears more than once.")
        seen.add(normalize_header(h))
    rows: list[dict[str, str]] = []
    for values in reader:
        if not any(v.strip() for v in values):
            continue
        if len(rows) >= max_rows:
            raise ImportRejected("too_many_rows", f"The file has more than {max_rows} data rows.")
        padded = values + [""] * (len(headers) - len(values))
        rows.append({headers[i]: padded[i] for i in range(len(headers))})
    if not rows:
        raise ImportRejected("no_rows", "The CSV has a header but no data rows.")
    return headers, rows


def suggest_mapping(headers: list[str]) -> dict[str, str]:
    by_norm = {normalize_header(h): h for h in headers if h}
    mapping: dict[str, str] = {}
    for field_name, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in by_norm and by_norm[alias] not in mapping.values():
                mapping[field_name] = by_norm[alias]
                break
    return mapping


def resolve_mapping(headers: list[str], user_mapping: dict[str, str] | None, import_type: str) -> dict[str, str]:
    mapping = suggest_mapping(headers)
    if user_mapping:
        unknown = [k for k in user_mapping if k not in FIELD_ALIASES]
        if unknown:
            raise ImportRejected("invalid_mapping", f"Unknown target fields in mapping: {', '.join(sorted(unknown))}.")
        missing_cols = [v for v in user_mapping.values() if v and v not in headers]
        if missing_cols:
            raise ImportRejected("invalid_mapping", f"Mapped columns not in the file: {', '.join(missing_cols)}.")
        for target, source in user_mapping.items():
            if source:
                mapping = {k: v for k, v in mapping.items() if v != source}
                mapping[target] = source
            else:
                mapping.pop(target, None)
    missing = [f for f in REQUIRED_FIELDS[import_type] if f not in mapping]
    if import_type == "emi_reminders" and "phone_number" not in mapping and "email" not in mapping:
        missing.append("phone_number or email")
    if missing:
        raise ImportRejected(
            "missing_columns",
            f"Required columns are missing: {', '.join(missing)}. Map them explicitly if they use other names.",
            [{"field": f, "message": "required column not found"} for f in missing],
        )
    return mapping


@dataclass
class RowIssues:
    errors: list[tuple[str | None, str]] = field(default_factory=list)
    warnings: list[tuple[str | None, str]] = field(default_factory=list)

    def error(self, field_name: str | None, message: str) -> None:
        self.errors.append((field_name, message))

    def warn(self, field_name: str | None, message: str) -> None:
        self.warnings.append((field_name, message))


@dataclass
class ImportSummary:
    import_id: int
    import_type: str
    status: str
    total_rows: int = 0
    imported_rows: int = 0
    unchanged_rows: int = 0
    rejected_rows: int = 0
    warning_count: int = 0
    reconcile: ReconcileResult = field(default_factory=ReconcileResult)
    issues: list[dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "import_id": self.import_id,
            "import_type": self.import_type,
            "status": self.status,
            "total_rows": self.total_rows,
            "imported_rows": self.imported_rows,
            "unchanged_rows": self.unchanged_rows,
            "rejected_rows": self.rejected_rows,
            "warning_count": self.warning_count,
            "reminders_scheduled": self.reconcile.scheduled,
            "reminders_updated": self.reconcile.updated,
            "reminders_cancelled": self.reconcile.cancelled,
            "reminders_skipped_past": self.reconcile.skipped_past,
            "issues": self.issues[:500],
            "issues_truncated": len(self.issues) > 500,
        }


class CsvImporter:
    def __init__(self, db: Database, config: AutomationConfig):
        self.db = db
        self.config = config

    # ------------------------------------------------------------------ preview

    def preview(self, content: bytes, import_type: ImportType = "emi_reminders") -> dict[str, Any]:
        text = decode_csv(content, self.config.import_max_bytes)
        headers, rows = read_rows(text, self.config.import_max_rows)
        suggested = suggest_mapping(headers)
        missing = [f for f in REQUIRED_FIELDS[import_type] if f not in suggested]
        if import_type == "emi_reminders" and "phone_number" not in suggested and "email" not in suggested:
            missing.append("phone_number or email")
        sample = []
        for row in rows[:5]:
            masked = {}
            for target, source in suggested.items():
                value = _clean(row.get(source))
                if target == "phone_number":
                    value = mask_phone(normalize_phone(value)) or ("(invalid)" if value else None)
                elif target == "email":
                    value = mask_email(normalize_email(value)) or ("(invalid)" if value else None)
                masked[target] = value
            sample.append(masked)
        return {
            "headers": headers,
            "row_count": len(rows),
            "suggested_mapping": suggested,
            "missing_required": missing,
            "available_fields": list(FIELD_ALIASES),
            "required_fields": list(REQUIRED_FIELDS[import_type]),
            "sample_rows": sample,
        }

    # ------------------------------------------------------------------ import

    def run(
        self,
        content: bytes,
        filename: str,
        actor: str,
        policy: ReminderPolicy,
        now: datetime,
        import_type: ImportType = "emi_reminders",
        user_mapping: dict[str, str] | None = None,
        dry_run: bool = False,
    ) -> ImportSummary:
        text = decode_csv(content, self.config.import_max_bytes)
        headers, rows = read_rows(text, self.config.import_max_rows)
        mapping = resolve_mapping(headers, user_mapping, import_type)
        file_sha = hashlib.sha256(content).hexdigest()
        safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", filename)[:200] or "upload.csv"

        with self.db.write() as conn:
            cur = conn.execute(
                """INSERT INTO imports (import_type, filename, file_sha256, uploaded_by, status, mapping_json,
                       total_rows, created_at) VALUES (?, ?, ?, ?, 'processing', ?, ?, ?)""",
                (import_type, safe_name, file_sha, actor, json.dumps(mapping), len(rows), iso(now)),
            )
            import_id = cur.lastrowid

        summary = ImportSummary(import_id=import_id, import_type=import_type,
                                status="dry_run" if dry_run else "completed", total_rows=len(rows))
        try:
            try:
                with self.db.write() as conn:
                    if import_type == "emi_reminders":
                        self._import_emis(conn, rows, mapping, summary, policy, now, actor)
                    else:
                        self._import_payments(conn, rows, mapping, summary, policy, now, actor)
                    if dry_run:
                        raise _DryRunRollback()
                    self._finish(conn, summary, now)
                    audit(conn, actor, "import.completed", "import", import_id,
                          {k: v for k, v in summary.as_dict().items() if k != "issues"})
            except _DryRunRollback:
                with self.db.write() as conn:
                    self._finish(conn, summary, now)
        except Exception as exc:
            with self.db.write() as conn:
                conn.execute(
                    "UPDATE imports SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?",
                    ("Import failed due to an internal error; no rows were applied.", iso(now), import_id),
                )
                audit(conn, actor, "import.failed", "import", import_id, {"error_type": type(exc).__name__})
            raise
        return summary

    def _finish(self, conn: sqlite3.Connection, summary: ImportSummary, now: datetime) -> None:
        conn.executemany(
            "INSERT INTO import_issues (import_id, row_number, severity, field, message) VALUES (?, ?, ?, ?, ?)",
            [(summary.import_id, i["row"], i["severity"], i["field"], i["message"]) for i in summary.issues],
        )
        r = summary.reconcile
        conn.execute(
            """UPDATE imports SET status = ?, imported_rows = ?, unchanged_rows = ?, rejected_rows = ?,
                   warning_count = ?, reminders_scheduled = ?, reminders_updated = ?, reminders_cancelled = ?,
                   reminders_skipped_past = ?, completed_at = ? WHERE id = ?""",
            (summary.status, summary.imported_rows, summary.unchanged_rows, summary.rejected_rows,
             summary.warning_count, r.scheduled, r.updated, r.cancelled, r.skipped_past, iso(now),
             summary.import_id),
        )

    def _record(self, summary: ImportSummary, row_number: int, issues: RowIssues) -> bool:
        for f, m in issues.errors:
            summary.issues.append({"row": row_number, "severity": "error", "field": f, "message": m})
        for f, m in issues.warnings:
            summary.issues.append({"row": row_number, "severity": "warning", "field": f, "message": m})
        summary.warning_count += len(issues.warnings)
        if issues.errors:
            summary.rejected_rows += 1
            return False
        return True

    # ------------------------------------------------------------------ EMI rows

    def _parse_emi_row(self, raw: dict[str, str], mapping: dict[str, str], issues: RowIssues) -> dict[str, Any]:
        get = lambda f: _clean(raw.get(mapping[f])) if f in mapping else None  # noqa: E731
        rec: dict[str, Any] = {}

        for f in ("customer_id", "customer_name", "loan_id"):
            value = get(f)
            if not value:
                issues.error(f, f"{f} is required.")
            elif len(value) > 200:
                issues.error(f, f"{f} is too long.")
            rec[f] = value
        rec["installment_key"] = get("installment_number") or "current"

        raw_phone, raw_email = get("phone_number"), get("email")
        rec["phone"] = normalize_phone(raw_phone) if raw_phone else None
        rec["email"] = normalize_email(raw_email) if raw_email else None
        if raw_phone and not rec["phone"]:
            (issues.warn if rec["email"] else issues.error)("phone_number", "Phone number is not a valid mobile number.")
        if raw_email and not rec["email"]:
            (issues.warn if rec["phone"] else issues.error)("email", "Email address is not valid.")
        if not raw_phone and not raw_email:
            issues.error("phone_number", "At least one contact (phone_number or email) is required.")

        amount = parse_money(get("emi_amount"))
        if amount is None:
            issues.error("emi_amount", "emi_amount is required and must be a number.")
        elif amount <= 0:
            issues.error("emi_amount", "emi_amount must be greater than zero.")
        rec["emi_amount"] = amount
        paid_raw = get("amount_paid")
        paid = parse_money(paid_raw) if paid_raw else Decimal("0.00")
        if paid is None or paid < 0:
            issues.error("amount_paid", "amount_paid must be a non-negative number.")
            paid = Decimal("0.00")
        rec["amount_paid"] = paid

        due_raw = get("due_date")
        rec["due_date"] = parse_date(due_raw, self.config.csv_date_order) if due_raw else None
        if rec["due_date"] is None:
            issues.error("due_date", "due_date is required (YYYY-MM-DD, DD-MM-YYYY, or '11 Oct 2026').")

        status_raw = get("payment_status")
        if status_raw:
            status = STATUS_SYNONYMS.get(normalize_header(status_raw))
            if status is None:
                issues.error("payment_status", f"Unknown payment_status '{status_raw[:40]}'.")
        else:
            status = "pending"
            issues.warn("payment_status", "payment_status missing; treated as pending.")
        rec["payment_status"] = status
        if amount is not None and paid is not None and status in ("pending", "overdue") and 0 < paid < amount:
            rec["payment_status"] = "partially_paid"
        if amount is not None and paid is not None and paid > amount:
            issues.error("amount_paid", "amount_paid is greater than emi_amount.")

        dpd_raw = get("days_past_due")
        rec["days_past_due"] = None
        if dpd_raw:
            try:
                rec["days_past_due"] = int(float(dpd_raw))
            except ValueError:
                issues.warn("days_past_due", "days_past_due is not a number; ignored.")

        tz_raw = get("timezone")
        tz_name = tz_raw or self.config.app_timezone
        try:
            ZoneInfo(tz_name)
        except (ZoneInfoNotFoundError, ValueError):
            issues.error("timezone", f"Unknown timezone '{tz_name[:60]}'. Use an IANA name like Asia/Kolkata.")
        rec["timezone"] = tz_name
        rec["reminder_datetime_utc"] = None
        exact_raw = get("reminder_datetime")
        if "reminder_datetime" in mapping:
            if not due_raw or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", due_raw):
                issues.error("due_date", "Exact scheduling requires an unambiguous YYYY-MM-DD due_date.")
            try:
                if not exact_raw or not re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", exact_raw):
                    raise ValueError("Use YYYY-MM-DD HH:MM:SS (24-hour); a value is required on every row.")
                naive = datetime.strptime(exact_raw, "%Y-%m-%d %H:%M:%S")
                tz = ZoneInfo(tz_name)
                local = naive.replace(tzinfo=tz)
                if (local.utcoffset() != naive.replace(tzinfo=tz, fold=1).utcoffset()
                        or local.astimezone(UTC).astimezone(tz).replace(tzinfo=None) != naive):
                    raise ValueError("Ambiguous or nonexistent local time; choose a time outside the DST transition.")
                rec["reminder_datetime_utc"] = local.astimezone(UTC)
                if get("reminder_date") or get("reminder_time"):
                    issues.error("reminder_datetime", "Use reminder_datetime OR reminder_date/reminder_time, not both.")
            except (ValueError, ZoneInfoNotFoundError) as exc:
                issues.error("reminder_datetime", str(exc))
        strategy = (get("channel_strategy") or "").lower()
        if strategy and strategy not in {"all", "fallback"}:
            issues.error("channel_strategy", "channel_strategy must be all or fallback (blank uses policy).")
        rec["channel_strategy"] = strategy or None

        rdate_raw, rtime_raw = get("reminder_date"), get("reminder_time")
        rec["reminder_date"] = parse_date(rdate_raw, self.config.csv_date_order) if rdate_raw else None
        if rdate_raw and rec["reminder_date"] is None:
            issues.error("reminder_date", "reminder_date is not a valid date.")
        rec["reminder_time"] = parse_hhmm(rtime_raw) if rtime_raw else None
        if rtime_raw and rec["reminder_time"] is None:
            issues.error("reminder_time", "reminder_time must look like 16:00 or 4:00 PM.")

        for ch in ("whatsapp", "sms", "email"):
            raw_flag = get(f"{ch}_enabled")
            flag = parse_bool(raw_flag) if raw_flag else True
            if flag is None:
                issues.error(f"{ch}_enabled", f"{ch}_enabled must be yes/no or true/false.")
                flag = False
            rec[f"{ch}_enabled"] = flag

        lang = (get("preferred_language") or "en").lower()
        if not re.fullmatch(r"[a-z]{2,3}(-[a-z0-9]{2,8})?", lang):
            issues.warn("preferred_language", "preferred_language is not a language code; using 'en'.")
            lang = "en"
        rec["preferred_language"] = lang

        consent_raw = get("consent_status")
        consent = CONSENT_SYNONYMS.get(normalize_header(consent_raw)) if consent_raw else "unknown"
        if consent is None:
            issues.error("consent_status", "consent_status must be granted, revoked, or unknown.")
        rec["consent_status"] = consent or "unknown"
        return rec

    def _import_emis(self, conn, rows, mapping, summary: ImportSummary, policy, now, actor) -> None:
        seen_keys: dict[tuple[str, str], int] = {}
        seen_customers: dict[str, tuple[int, tuple]] = {}
        source = f"csv_import:{summary.import_id}"
        now_s = iso(now)

        for row_number, raw in enumerate(rows, start=2):  # row 1 is the header
            issues = RowIssues()
            rec = self._parse_emi_row(raw, mapping, issues)
            exact = rec["reminder_datetime_utc"]
            if exact is not None:
                if exact <= now:
                    issues.error("reminder_datetime", "Reminder datetime must be in the future; past times are never sent immediately.")
                if not within_contact_window(exact.astimezone(ZoneInfo(rec["timezone"])), policy):
                    issues.error("reminder_datetime", "Reminder datetime is outside the configured contact hours/days; choose an allowed exact time.")

            if rec["loan_id"]:
                key = (rec["loan_id"], rec["installment_key"])
                if key in seen_keys:
                    hint = "" if "installment_number" in mapping else \
                        " Add an installment_number column to import several EMIs for one loan."
                    issues.error("loan_id", f"Duplicate of row {seen_keys[key]} for the same loan EMI.{hint}")
                else:
                    seen_keys[key] = row_number
            if rec["customer_id"] and not issues.errors:
                ident = (rec["customer_name"], rec["phone"], rec["email"])
                first = seen_customers.get(rec["customer_id"])
                if first and first[1] != ident:
                    issues.warn("customer_id", f"Customer details differ from row {first[0]}; this row's values are used.")
                seen_customers.setdefault(rec["customer_id"], (row_number, ident))

            if rec["loan_id"] and rec["customer_id"]:
                owner = conn.execute(
                    "SELECT customer_id FROM emis WHERE loan_id = ? LIMIT 1", (rec["loan_id"],)
                ).fetchone()
                if owner and owner["customer_id"] != rec["customer_id"]:
                    issues.error("loan_id", "This loan already belongs to a different customer_id.")

            if not self._record(summary, row_number, issues):
                continue

            self._upsert_customer(conn, rec, now_s)
            emi_id, changed = self._upsert_emi(conn, rec, source, summary, row_number, now_s, actor)
            conn.execute("UPDATE emis SET reminder_datetime_utc = ?, channel_strategy = ? WHERE id = ?",
                         (iso(exact) if exact else None, rec["channel_strategy"], emi_id))
            if changed:
                summary.imported_rows += 1
            else:
                summary.unchanged_rows += 1
            summary.reconcile.add(reconcile_emi(conn, emi_id, policy, now, actor))

    def _upsert_customer(self, conn: sqlite3.Connection, rec: dict[str, Any], now_s: str) -> None:
        conn.execute(
            """INSERT INTO customers (customer_id, name, phone, email, timezone, preferred_language, consent_status,
                   whatsapp_enabled, sms_enabled, email_enabled, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(customer_id) DO UPDATE SET
                   name = excluded.name, phone = excluded.phone, email = excluded.email,
                   timezone = excluded.timezone, preferred_language = excluded.preferred_language,
                   consent_status = excluded.consent_status, whatsapp_enabled = excluded.whatsapp_enabled,
                   sms_enabled = excluded.sms_enabled, email_enabled = excluded.email_enabled,
                   updated_at = CASE WHEN customers.name IS NOT excluded.name OR customers.phone IS NOT excluded.phone
                       OR customers.email IS NOT excluded.email OR customers.timezone IS NOT excluded.timezone
                       OR customers.consent_status IS NOT excluded.consent_status
                       OR customers.whatsapp_enabled IS NOT excluded.whatsapp_enabled
                       OR customers.sms_enabled IS NOT excluded.sms_enabled
                       OR customers.email_enabled IS NOT excluded.email_enabled
                       OR customers.preferred_language IS NOT excluded.preferred_language
                       THEN excluded.updated_at ELSE customers.updated_at END""",
            (rec["customer_id"], rec["customer_name"], rec["phone"], rec["email"], rec["timezone"],
             rec["preferred_language"], rec["consent_status"], int(rec["whatsapp_enabled"]),
             int(rec["sms_enabled"]), int(rec["email_enabled"]), now_s, now_s),
        )

    def _upsert_emi(self, conn, rec, source, summary: ImportSummary, row_number, now_s, actor) -> tuple[int, bool]:
        rdate = rec["reminder_date"].isoformat() if rec["reminder_date"] else None
        rtime = rec["reminder_time"].strftime("%H:%M") if rec["reminder_time"] else None
        row_hash = stable_hash(
            rec["customer_id"], rec["customer_name"], rec["phone"], rec["email"], rec["timezone"],
            rec["consent_status"], rec["whatsapp_enabled"], rec["sms_enabled"], rec["email_enabled"],
            rec["preferred_language"], rec["emi_amount"], rec["amount_paid"], rec["due_date"],
            rec["payment_status"], rdate, rtime,
            rec["reminder_datetime_utc"], rec["channel_strategy"],
        )
        existing = conn.execute(
            "SELECT * FROM emis WHERE loan_id = ? AND installment_key = ?", (rec["loan_id"], rec["installment_key"])
        ).fetchone()

        if existing is None:
            cur = conn.execute(
                """INSERT INTO emis (customer_id, loan_id, installment_key, emi_amount, amount_paid, due_date,
                       payment_status, payment_status_source, payment_status_updated_at, csv_days_past_due,
                       reminder_date, reminder_time, row_hash, last_import_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (rec["customer_id"], rec["loan_id"], rec["installment_key"], str(rec["emi_amount"]),
                 str(rec["amount_paid"]), rec["due_date"].isoformat(), rec["payment_status"], source, now_s,
                 rec["days_past_due"], rdate, rtime, row_hash, summary.import_id, now_s, now_s),
            )
            return cur.lastrowid, True

        if existing["row_hash"] == row_hash:
            conn.execute("UPDATE emis SET last_import_id = ? WHERE id = ?", (summary.import_id, existing["id"]))
            return existing["id"], False

        status, paid = rec["payment_status"], str(rec["amount_paid"])
        status_source = source
        protected = existing["payment_status"] in ("paid", "waived", "cancelled") and \
            existing["payment_status_source"].startswith(TERMINAL_NON_CSV_SOURCES)
        if protected and status != existing["payment_status"]:
            summary.issues.append({
                "row": row_number, "severity": "warning", "field": "payment_status",
                "message": f"Kept verified status '{existing['payment_status']}' set by "
                           f"{existing['payment_status_source'].split(':')[0]}; the CSV value was not applied.",
            })
            summary.warning_count += 1
            status, paid, status_source = existing["payment_status"], existing["amount_paid"], existing["payment_status_source"]
        elif status == existing["payment_status"] and paid == existing["amount_paid"]:
            status_source = existing["payment_status_source"]

        if existing["due_date"] != rec["due_date"].isoformat():
            audit(conn, actor, "emi.due_date_changed", "emi", existing["id"],
                  {"from": existing["due_date"], "to": rec["due_date"].isoformat(), "import_id": summary.import_id})
        if status != existing["payment_status"] or paid != existing["amount_paid"]:
            conn.execute(
                """INSERT INTO payment_events (emi_id, previous_status, new_status, previous_amount_paid,
                       new_amount_paid, source, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (existing["id"], existing["payment_status"], status, existing["amount_paid"], paid, source, actor, now_s),
            )
        conn.execute(
            """UPDATE emis SET emi_amount = ?, amount_paid = ?, due_date = ?, payment_status = ?,
                   payment_status_source = ?,
                   payment_status_updated_at = CASE WHEN payment_status IS NOT ? OR amount_paid IS NOT ?
                       THEN ? ELSE payment_status_updated_at END,
                   csv_days_past_due = ?, reminder_date = ?, reminder_time = ?, row_hash = ?,
                   last_import_id = ?, updated_at = ?
               WHERE id = ?""",
            (str(rec["emi_amount"]), paid, rec["due_date"].isoformat(), status, status_source, status, paid, now_s,
             rec["days_past_due"], rdate, rtime, row_hash, summary.import_id, now_s, existing["id"]),
        )
        return existing["id"], True

    # ------------------------------------------------------------------ payment rows

    def _import_payments(self, conn, rows, mapping, summary: ImportSummary, policy, now, actor) -> None:
        source = f"csv_import:{summary.import_id}"
        now_s = iso(now)
        seen: dict[tuple[str, str], int] = {}
        for row_number, raw in enumerate(rows, start=2):
            issues = RowIssues()
            get = lambda f: _clean(raw.get(mapping[f])) if f in mapping else None  # noqa: E731
            loan_id = get("loan_id")
            installment_key = get("installment_number") or "current"
            status_raw = get("payment_status")
            status = STATUS_SYNONYMS.get(normalize_header(status_raw)) if status_raw else None
            if not loan_id:
                issues.error("loan_id", "loan_id is required.")
            if status is None:
                issues.error("payment_status", "payment_status is required and must be a known status.")
            paid_raw = get("amount_paid")
            paid = parse_money(paid_raw) if paid_raw else None
            if paid_raw and (paid is None or paid < 0):
                issues.error("amount_paid", "amount_paid must be a non-negative number.")
            emi = None
            if loan_id:
                if (loan_id, installment_key) in seen:
                    issues.error("loan_id", f"Duplicate of row {seen[(loan_id, installment_key)]}.")
                seen.setdefault((loan_id, installment_key), row_number)
                emi = conn.execute(
                    "SELECT * FROM emis WHERE loan_id = ? AND installment_key = ?", (loan_id, installment_key)
                ).fetchone()
                if emi is None:
                    issues.error("loan_id", "No imported EMI matches this loan_id/installment.")
            due_raw = get("due_date")
            if emi is not None and due_raw:
                due = parse_date(due_raw, self.config.csv_date_order)
                if due is None or due.isoformat() != emi["due_date"]:
                    issues.error("due_date", "due_date does not match the EMI on record.")
            if emi is not None and paid is not None and paid > Decimal(emi["emi_amount"]):
                issues.error("amount_paid", "amount_paid is greater than the EMI amount.")
            if not self._record(summary, row_number, issues):
                continue

            new_paid = str(paid) if paid is not None else (emi["emi_amount"] if status == "paid" else emi["amount_paid"])
            if status in ("pending", "overdue") and Decimal(new_paid) > 0:
                status = "partially_paid"
            if status == emi["payment_status"] and new_paid == emi["amount_paid"]:
                summary.unchanged_rows += 1
            else:
                conn.execute(
                    """INSERT INTO payment_events (emi_id, previous_status, new_status, previous_amount_paid,
                           new_amount_paid, source, actor, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (emi["id"], emi["payment_status"], status, emi["amount_paid"], new_paid, source, actor,
                     get("payment_reference"), now_s),
                )
                conn.execute(
                    """UPDATE emis SET payment_status = ?, amount_paid = ?, payment_status_source = ?,
                           payment_status_updated_at = ?, payment_claim_pending = CASE WHEN ? = 'paid' THEN 0
                           ELSE payment_claim_pending END, last_import_id = ?, updated_at = ? WHERE id = ?""",
                    (status, new_paid, source, now_s, status, summary.import_id, now_s, emi["id"]),
                )
                summary.imported_rows += 1
            summary.reconcile.add(reconcile_emi(conn, emi["id"], policy, now, actor))
