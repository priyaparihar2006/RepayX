"""Rule-based intent detection for customer replies (English and common Hinglish).

Deliberately deterministic: the result drives record changes (suppression, holds,
verification flags), so it must be predictable and auditable. Order matters:
opt-out and disputes win over everything else.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

OPT_OUT = re.compile(
    r"^\s*(stop|stop all|unsubscribe|opt[\s-]?out|cancel|end|quit)\s*[.!]*\s*$"
    r"|\b(do not|don'?t|dont)\s+(message|contact|text|email|call)\b|\bunsubscribe\b",
    re.I,
)
DISPUTE = re.compile(
    r"\b(wrong (person|number)|not my loan|never (took|taken)|fraud|scam|harass\w*|complaint|dispute|"
    r"police|ombudsman)\b", re.I)
PAID_CLAIM = re.compile(
    r"\b(already paid|have paid|i paid|paid it|paid already|payment (is )?(done|made|completed|successful)|"
    r"made the payment|paid (yesterday|today|this morning)|kar diya|kr diya|bhar diya|"
    r"payment ho gaya|ho gaya payment|jama kar diya)\b|^\s*paid\s*[.!]*\s*$", re.I)
HARDSHIP = re.compile(
    r"\b(lost (my )?job|job loss|unemployed|medical|hospital\w*|can'?t afford|cannot afford|no money|"
    r"salary (not|delayed|late)|financial (problem|difficulty|crisis)|accident|illness)\b", re.I)
MORE_TIME = re.compile(
    r"\b(need (some )?more time|more time|extension|extend|postpone|grace period|some time)\b", re.I)
PROMISE = re.compile(
    r"\b(will pay|i'?ll pay|going to pay|can pay|pay (by|on|before|tomorrow|today|next|this)|"
    r"(kal|parso) (tak )?(pay|de dunga|kar dunga|bhar dunga|kar denge)|de dunga|kar dunga|bhar dunga)\b", re.I)
PAYMENT_DETAILS = re.compile(
    r"\b(payment details|how (can|do|to) (i )?pay|how to pay|where (can i|to) pay|account (number|details)|"
    r"bank details|upi|payment link|link|send (me )?(the )?details|share (the )?details|ifsc)\b", re.I)
BALANCE = re.compile(r"\b(how much|balance|outstanding|amount due|due amount|kitna|kitne|total due)\b", re.I)

WEEKDAYS = {name: i for i, name in enumerate(
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])}
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def classify(text: str) -> str:
    t = text.strip()
    if OPT_OUT.search(t):
        return "OPT_OUT"
    if DISPUTE.search(t):
        return "DISPUTE"
    if PAID_CLAIM.search(t):
        return "PAID_CLAIM"
    if HARDSHIP.search(t):
        return "HARDSHIP"
    if PROMISE.search(t):
        return "PROMISE_TO_PAY"
    if MORE_TIME.search(t):
        return "MORE_TIME"
    if PAYMENT_DETAILS.search(t):
        return "PAYMENT_DETAILS"
    if BALANCE.search(t):
        return "BALANCE"
    return "OTHER"


def _next_month_day(today: date, day: int) -> date | None:
    for month_offset in (0, 1):
        y, m = today.year, today.month + month_offset
        if m > 12:
            y, m = y + 1, 1
        try:
            candidate = date(y, m, day)
        except ValueError:
            continue
        if candidate >= today:
            return candidate
    return None


def extract_promise_date(text: str, today: date) -> date | None:
    t = text.lower()
    if re.search(r"\bday after tomorrow\b|\bparso\b", t):
        return today + timedelta(days=2)
    if re.search(r"\btomorrow\b|\bkal\b", t):
        return today + timedelta(days=1)
    if re.search(r"\btoday\b|\baaj\b", t):
        return today
    if re.search(r"\bnext week\b", t):
        return today + timedelta(days=7)
    for name, idx in WEEKDAYS.items():
        if re.search(rf"\b{name}\b", t):
            ahead = (idx - today.weekday()) % 7 or 7
            return today + timedelta(days=ahead)
    m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", t)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        year = int(m.group(3)) if m.group(3) else today.year
        if year < 100:
            year += 2000
        try:
            d = date(year, month, day)
            if not m.group(3) and d < today:
                d = date(year + 1, month, day)
            return d
        except ValueError:
            return None
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", t)
    if m:
        try:
            d = date(today.year, MONTHS[m.group(2)], int(m.group(1)))
            return d if d >= today else date(today.year + 1, d.month, d.day)
        except ValueError:
            return None
    m = re.search(r"\b(?:on|by|before)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b", t)
    if m:
        return _next_month_day(today, int(m.group(1)))
    return None
