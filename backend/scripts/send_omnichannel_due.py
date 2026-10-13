"""Send due notice simultaneously via WhatsApp and Email and record in database."""
from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
from pathlib import Path
import urllib.request
import urllib.error

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import env_loader
env_loader.load_environment()

from automation.config import get_automation_config
from automation.messages import render_reminder
from automation.providers.email import SmtpEmailProvider
from automation.providers.base import OutboundMessage

def main():
    cfg = get_automation_config()
    local_now = datetime.now(ZoneInfo("Asia/Kolkata"))
    now_s = datetime.now(timezone.utc).isoformat()
    due_date = date(2026, 10, 15)

    phone = "+918077815522"
    email = "dhakreyajay444@gmail.com"
    customer_id = "385059"
    loan_id = "LOAN-385059"
    amount_str = "₹15,000.00"

    content = render_reminder(
        config=cfg,
        customer_name="Ajay Dhakrey",
        loan_id=loan_id,
        outstanding=Decimal("15000.00"),
        due_date=due_date,
        local_now=local_now,
    )

    wa_text = (
        "*RepayX Loan EMI Reminder*\n\n"
        "Dear *Ajay Dhakrey*,\n"
        f"Your EMI of *{amount_str}* for Loan Account *{loan_id}* is due on *15 Oct 2026*.\n\n"
        "📌 *Loan Summary:*\n"
        f"• Loan Account: {loan_id}\n"
        f"• EMI Due: {amount_str}\n"
        "• Due Date: 15 Oct 2026\n"
        "• Remaining Balance: ₹28,900.00\n\n"
        f"🔗 *Pay Securely:* http://localhost:3000/demo/pay/{loan_id}\n\n"
        "If you have already paid, please ignore this notice or reply PAID.\n"
        "Help & Support: +91 8650629360 / support@repayx.ai\n"
        "- *RepayX Collections Hub*"
    )

    results = {}

    # 1. SEND WHATSAPP
    print("Sending WhatsApp reminder to", phone)
    try:
        req_data = json.dumps({"phone": phone, "message": wa_text}).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:8005/send",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            wa_data = json.loads(resp.read().decode("utf-8"))
            results["whatsapp"] = {"status": "success", "data": wa_data}
            print("WhatsApp Sent Successfully! Message ID:", wa_data.get("message_id"))
    except Exception as e:
        results["whatsapp"] = {"status": "error", "error": str(e)}
        print("WhatsApp Send Failed:", e)

    # 2. SEND EMAIL
    print("\nSending Email reminder to", email)
    try:
        email_provider = SmtpEmailProvider(cfg)
        msg = OutboundMessage(
            channel="email",
            recipient=email,
            text=content.text,
            subject=content.subject,
            html=content.html,
            idempotency_key=f"omni-send-{int(datetime.now().timestamp())}",
            template_params=content.template_params,
        )
        email_res = email_provider.send(msg)
        if email_res.accepted:
            results["email"] = {"status": "success", "message_id": email_res.provider_message_id}
            print("Email Sent Successfully! Provider Message ID:", email_res.provider_message_id)
        else:
            results["email"] = {"status": "failed", "error": email_res.error_message}
            print("Email Send Failed:", email_res.error_message)
    except Exception as e:
        results["email"] = {"status": "error", "error": str(e)}
        print("Email Exception:", e)

    # 3. RECORD IN DATABASE
    db_path = BACKEND_DIR / "data" / "automation.sqlite3"
    with sqlite3.connect(db_path) as conn:
        if results.get("whatsapp", {}).get("status") == "success":
            wa_id = results["whatsapp"]["data"].get("message_id") or "wa_sent"
            conn.execute("""
                INSERT INTO communications (customer_id, loan_id, channel, direction, kind, provider_message_id, identifier, subject, content, status, created_at)
                VALUES (?, ?, 'whatsapp', 'outbound', 'reminder', ?, ?, 'WhatsApp EMI Reminder', ?, 'sent', ?)
            """, (customer_id, loan_id, wa_id, phone, wa_text, now_s))

        if results.get("email", {}).get("status") == "success":
            email_id = results["email"]["message_id"]
            conn.execute("""
                INSERT INTO communications (customer_id, loan_id, channel, direction, kind, provider_message_id, identifier, subject, content, status, created_at)
                VALUES (?, ?, 'email', 'outbound', 'reminder', ?, ?, ?, ?, 'accepted', ?)
            """, (customer_id, loan_id, email_id, email, content.subject, content.text, now_s))

    print("\nDispatch summary saved in SQLite communications log.")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()

