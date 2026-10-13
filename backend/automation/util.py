"""Small shared helpers: time formatting, contact normalization, masking, CSV safety."""

from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, time, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

UTC = timezone.utc

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
HHMM_RE = re.compile(r"^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])?$")


def utcnow() -> datetime:
    return datetime.now(UTC)


def iso(dt: datetime) -> str:
    """Canonical UTC timestamp string. Fixed width, so string comparison orders correctly."""
    if dt.tzinfo is None:
        raise ValueError("naive datetime")
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def normalize_phone(raw: Any, default_country_code: str = "91") -> str | None:
    """Return an E.164 phone number, or None if the value cannot be a valid number.

    10-digit numbers are treated as Indian mobile numbers (the platform's default market).
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    has_plus = text.startswith("+")
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    if has_plus:
        candidate = f"+{digits}"
    elif len(digits) == 10:
        if default_country_code == "91" and digits[0] not in "6789":
            return None
        candidate = f"+{default_country_code}{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        candidate = f"+{default_country_code}{digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        candidate = f"+{digits}"
    else:
        candidate = f"+{digits}"
    return candidate if E164_RE.match(candidate) else None


def normalize_email(raw: Any) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    return text if text and EMAIL_RE.match(text) else None


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return phone[:3] + "*" * max(0, len(phone) - 7) + phone[-4:] if len(phone) > 7 else "***"


def mask_email(email: str | None) -> str:
    if not email or "@" not in email:
        return ""
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


def mask_identifier(channel: str, identifier: str | None) -> str:
    return mask_email(identifier) if channel == "email" else mask_phone(identifier)


def parse_money(raw: Any) -> Decimal | None:
    if raw is None:
        return None
    text = str(raw).strip()
    text = re.sub(r"(?i)\b(inr|rs\.?)\b|₹|,|\s", "", text)
    if not text:
        return None
    try:
        value = Decimal(text)
    except InvalidOperation:
        return None
    if not value.is_finite():
        return None
    return value.quantize(Decimal("0.01"))


def parse_hhmm(raw: Any) -> time | None:
    """Accept '16:00', '16:00:00', '4 PM', '4:30pm'. Returns None for anything else."""
    if raw is None:
        return None
    text = str(raw).strip()
    match = HHMM_RE.match(text)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridiem = (match.group(4) or "").lower()
    if meridiem:
        if not 1 <= hour <= 12:
            return None
        hour = hour % 12 + (12 if meridiem == "pm" else 0)
    elif match.group(2) is None:
        return None  # a bare number like "16" is too ambiguous
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return time(hour, minute)


_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def parse_date(raw: Any, order: str = "DMY") -> date | None:
    """Parse ISO, DD-MM-YYYY / MM-DD-YYYY (per order), and '11 Oct 2026' / '11-Oct-2026'."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$", text)
    try:
        if m:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        m = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", text)
        if m:
            a, b, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            day, month = (a, b) if order == "DMY" else (b, a)
            return date(year, month, day)
        m = re.match(r"^(\d{1,2})[\s/-]([A-Za-z]{3,9})[\s/,-]+(\d{4})$", text)
        if m:
            month = _MONTHS.get(m.group(2)[:3].lower())
            if month:
                return date(int(m.group(3)), month, int(m.group(1)))
        m = re.match(r"^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$", text)
        if m:
            month = _MONTHS.get(m.group(1)[:3].lower())
            if month:
                return date(int(m.group(3)), month, int(m.group(2)))
    except ValueError:
        return None
    return None


def parse_bool(raw: Any) -> bool | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if text in {"1", "true", "yes", "y", "t", "enabled", "on"}:
        return True
    if text in {"0", "false", "no", "n", "f", "disabled", "off"}:
        return False
    return None


def format_inr(amount: Decimal | float) -> str:
    """Indian digit grouping: 123456.5 -> '₹1,23,456.50'."""
    value = Decimal(str(amount)).quantize(Decimal("0.01"))
    sign = "-" if value < 0 else ""
    whole, frac = f"{abs(value):.2f}".split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        whole = ",".join(groups + [tail])
    return f"{sign}₹{whole}.{frac}"


def csv_safe(value: Any) -> str:
    """Neutralize spreadsheet formula injection in exported cells."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def stable_hash(*parts: Any) -> str:
    return hashlib.sha256("\x1f".join("" if p is None else str(p) for p in parts).encode()).hexdigest()
