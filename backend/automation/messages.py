"""Reminder content, rendered from the authoritative EMI record at send time.

Only facts from the database and configured business details are used. Optional
details (support phone, payment link, instructions) are omitted when not configured
rather than invented.
"""

from __future__ import annotations

import html
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from urllib.parse import quote

from automation.config import AutomationConfig
from automation.util import format_inr


@dataclass(frozen=True)
class ReminderContent:
    text: str
    sms_text: str
    subject: str
    html: str
    template_params: dict[str, str]


def _fmt_date(d: date) -> str:
    return d.strftime("%d %b %Y")


def payment_link(config: AutomationConfig, loan_id: str) -> str | None:
    base = config.payment_link_base_url
    return f"{base.rstrip('/')}/{quote(loan_id, safe='')}" if base else None


def render_reminder(
    config: AutomationConfig,
    customer_name: str,
    loan_id: str,
    outstanding: Decimal,
    due_date: date,
    local_now: datetime,
) -> ReminderContent:
    amount = format_inr(outstanding)
    due = _fmt_date(due_date)
    days_late = (local_now.date() - due_date).days
    if days_late > 0:
        headline = f"your EMI of {amount} for loan {loan_id} was due on {due} and is {days_late} day{'s' if days_late != 1 else ''} overdue."
        subject = f"Overdue EMI for loan {loan_id}"
    elif days_late == 0:
        headline = f"your EMI of {amount} for loan {loan_id} is due today ({due})."
        subject = f"EMI due today for loan {loan_id}"
    else:
        headline = f"your EMI of {amount} for loan {loan_id} is due on {due}."
        subject = f"Upcoming EMI for loan {loan_id}"

    link = payment_link(config, loan_id)
    lines = [f"Dear {customer_name}, {headline}"]
    if link:
        lines.append(f"Pay securely: {link}")
    if config.payment_instructions:
        lines.append(config.payment_instructions)
    lines.append("If you have already paid, please ignore this message or reply PAID.")
    support = " / ".join(x for x in (config.support_phone, config.support_email) if x)
    if support:
        lines.append(f"Help: {support}")
    lines.append(f"- {config.company_name}")
    text = "\n".join(lines)

    sms_parts = [f"{config.company_name}: Dear {customer_name}, {headline}"]
    if link:
        sms_parts.append(f"Pay: {link}")
    sms_parts.append("Reply STOP to opt out.")
    sms_text = " ".join(sms_parts)

    e = html.escape
    rows = "".join(
        f"<tr><td style='padding:6px 12px;color:#64748b'>{e(k)}</td><td style='padding:6px 12px'><b>{e(v)}</b></td></tr>"
        for k, v in (("Loan", loan_id), ("Amount due", amount), ("Due date", due))
    )
    extra = ""
    if link:
        extra += f"<p><a href='{e(link)}' style='color:#2563eb'>Pay securely</a></p>"
    if config.payment_instructions:
        extra += f"<p>{e(config.payment_instructions)}</p>"
    if support:
        extra += f"<p style='color:#64748b'>Need help? {e(support)}</p>"
    html_body = (
        "<!doctype html><html><body style='font-family:Arial,sans-serif;color:#0f172a'>"
        f"<p>Dear {e(customer_name)},</p><p>{e(headline[0].upper() + headline[1:])}</p>"
        f"<table style='border-collapse:collapse;border:1px solid #e2e8f0'>{rows}</table>{extra}"
        "<p>If you have already paid, please ignore this email or reply to let us know.</p>"
        f"<p>{e(config.company_name)}</p></body></html>"
    )
    return ReminderContent(
        text=text,
        sms_text=sms_text,
        subject=subject,
        html=html_body,
        template_params={"name": customer_name, "amount": amount, "due_date": due, "loan_id": loan_id},
    )
