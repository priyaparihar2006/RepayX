"""WhatsApp Web QR & Automated Defaulter Recovery Service.

Supports multi-device QR pairing lifecycle, session persistence,
customer portfolio defaulter ingestion, dynamic template rendering,
and automated batch recovery outreach with durable delivery audit logs.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
import re
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from api.errors import APIError
from services.customer_service import CustomerService


ROOT = Path(__file__).resolve().parents[2]
EXPECTED_SENDER = "+918650629360"
DEMO_CONTACTS = [
    {"name": "Nancy", "phone": "+917060200849", "customer_id": 385057, "amount": "63,502.51", "late_days": 40},
    {"name": "Sid", "phone": "+919105830551", "customer_id": 385058, "amount": "42,750.00", "late_days": 25},
    {"name": "Ajay", "phone": "+918077815522", "customer_id": 385059, "amount": "28,900.00", "late_days": 18},
]
PHONE_REGEX = re.compile(r"\+[1-9]\d{7,14}$")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_TEMPLATES = [
    {
        "id": "urgent_settlement",
        "name": "Urgent High-Risk Settlement Notice",
        "category": "Urgent",
        "description": "High-priority alert for critical risk defaulters with immediate settlement link",
        "body": "URGENT NOTICE: Dear {{customer_name}}, your loan account #{{customer_id}} has an overdue balance of ₹{{unpaid_amount}} ({{late_days}} days past due). To avoid legal escalation or credit score degradation, please clear your outstanding EMI immediately using your secure RepayX link: {{payment_link}}",
        "parameters": ["customer_name", "customer_id", "unpaid_amount", "late_days", "payment_link"],
        "variables": ["customer_name", "customer_id", "unpaid_amount", "late_days", "payment_link"],
    },
    {
        "id": "overdue_notice",
        "name": "Standard Overdue Payment Notice",
        "category": "Overdue",
        "description": "Standard reminder specifying overdue balance and payment due date",
        "body": "Dear {{customer_name}}, your monthly EMI installment of ₹{{unpaid_amount}} for Loan #{{customer_id}} is currently overdue. Please process your payment today via RepayX: {{payment_link}}. For assistance, reply directly to this message.",
        "parameters": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
        "variables": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
    },
    {
        "id": "concession_offer",
        "name": "One-Time Settlement (OTS) Concession Offer",
        "category": "Concession",
        "description": "Waives late penalties for instant full settlements",
        "body": "Special Relief Offer: Dear {{customer_name}}, RepayX is offering a 100% late fee waiver on your Loan #{{customer_id}}. Settle your principal amount of ₹{{unpaid_amount}} today and close your default flag: {{payment_link}}",
        "parameters": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
        "variables": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
    },
    {
        "id": "friendly_reminder",
        "name": "Friendly EMI Payment Reminder",
        "category": "Reminder",
        "description": "Gentle reminder before secondary collection measures",
        "body": "Hello {{customer_name}}, this is a friendly reminder from RepayX regarding your pending installment of ₹{{unpaid_amount}} on Loan #{{customer_id}}. Pay instantly here: {{payment_link}}. Thank you!",
        "parameters": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
        "variables": ["customer_name", "customer_id", "unpaid_amount", "payment_link"],
    },
]

INDIAN_NAMES = [
    "Rahul Sharma", "Ananya Verma", "Vikram Malhotra", "Priya Choudhury", "Rohan Gupta",
    "Sneha Kulkarni", "Amitabh Deshmukh", "Kavita Rao", "Deepak Nair", "Pooja Banerjee",
    "Manish Agarwal", "Meera Bhatia", "Suresh Pillai", "Divya Menon", "Rajesh Singhania",
    "Swati Reddy", "Arjun Kapoor", "Neha Sen", "Gaurav Mehta", "Shweta Tiwari",
    "Sanjay Saxena", "Preeti Joshi", "Karthik Sundaram", "Ritu Mukherjee", "Alok Pandey",
    "Sunita Chawla", "Tarun Roy", "Madhuri Hegde", "Varun Chopra", "Tanvi Nambiar",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class WhatsAppSettings:
    operator_key: str = field(default_factory=lambda: os.getenv("WHATSAPP_OPERATOR_KEY", ""), repr=False)
    enabled: bool = field(default_factory=lambda: os.getenv("WHATSAPP_ENABLED", "true").lower() == "true")
    test_mode: bool = field(default_factory=lambda: os.getenv("WHATSAPP_TEST_MODE", "false").lower() != "false")
    db_path: Path = field(default_factory=lambda: ROOT / os.getenv("WHATSAPP_DB_PATH", "backend/data/whatsapp.sqlite3"))
    contacts_file: Path = field(default_factory=lambda: ROOT / os.getenv("WHATSAPP_CONTACTS_FILE", "backend/data/whatsapp_contacts.json"))
    token: str = field(default_factory=lambda: os.getenv("WHATSAPP_ACCESS_TOKEN", ""), repr=False)
    phone_id: str = field(default_factory=lambda: os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
    app_secret: str = field(default_factory=lambda: os.getenv("WHATSAPP_APP_SECRET", ""), repr=False)
    verify_token: str = field(default_factory=lambda: os.getenv("WHATSAPP_VERIFY_TOKEN", ""), repr=False)
    business_id: str = field(default_factory=lambda: os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", ""))
    version: str = field(default_factory=lambda: os.getenv("WHATSAPP_GRAPH_VERSION", "v21.0"))


class WhatsAppService:
    def __init__(self, settings: WhatsAppSettings):
        self.settings = settings
        self._qr_string: str | None = None
        self._qr_code_data_uri: str | None = None
        self._qr_expires_at: float = 0
        self._session_info: dict | None = None
        self._session_status: Literal["DISCONNECTED", "SCAN_QR_CODE", "CONNECTING", "CONNECTED"] = "DISCONNECTED"
        self._init_db()


    def _init_db(self) -> None:
        self.settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS whatsapp_sessions (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    phone_number TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    device TEXT NOT NULL,
                    connected_at TEXT NOT NULL,
                    session_token TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS outbox (
                    request_id TEXT PRIMARY KEY,
                    fingerprint TEXT NOT NULL,
                    recipient TEXT NOT NULL,
                    customer_id INTEGER,
                    customer_name TEXT,
                    template TEXT NOT NULL,
                    preview TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provider_id TEXT,
                    error TEXT
                );
                CREATE TABLE IF NOT EXISTS receipts (
                    provider_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    rank INTEGER NOT NULL,
                    updated_at TEXT NOT NULL,
                    error TEXT
                );
                CREATE TABLE IF NOT EXISTS inbox (
                    provider_id TEXT PRIMARY KEY,
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    received_at TEXT NOT NULL
                );
            """)
            # Ensure customer columns exist on outbox table for migrations
            try:
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(outbox)")
                existing_cols = {row[1] for row in cursor.fetchall()}
                if "customer_id" not in existing_cols:
                    cursor.execute("ALTER TABLE outbox ADD COLUMN customer_id INTEGER")
                if "customer_name" not in existing_cols:
                    cursor.execute("ALTER TABLE outbox ADD COLUMN customer_name TEXT")
            except Exception:
                pass
            columns = {r[1] for r in conn.execute("PRAGMA table_info(outbox)")}
            if "transport" not in columns:
                conn.execute("ALTER TABLE outbox ADD COLUMN transport TEXT NOT NULL DEFAULT 'legacy_simulation'")
            conn.commit()

    def _bridge(self, path: str, payload: dict | None = None) -> dict:
        data = None if payload is None else json.dumps(payload).encode()
        request = Request(
            f"http://127.0.0.1:8005/{path}", data=data,
            headers={"Content-Type": "application/json"} if data is not None else {},
        )
        try:
            with urlopen(request, timeout=20) as response:
                result = json.load(response)
        except HTTPError as exc:
            try:
                message = json.load(exc).get("error", "WhatsApp request failed.")
            except (ValueError, TypeError):
                message = "WhatsApp request failed."
            raise APIError(exc.code, "whatsapp_error", str(message)) from exc
        except (URLError, TimeoutError, OSError, ValueError) as exc:
            raise APIError(503, "bridge_unavailable", "Cannot reach the WhatsApp bridge. Start it with npm start in backend/whatsapp-bridge.") from exc
        if result.get("success") is not True:
            raise APIError(502, "whatsapp_error", "WhatsApp did not confirm the request.")
        return result

    def configuration(self) -> dict:
        try:
            live = self._bridge("status")
        except APIError as exc:
            live = {"ready": False, "connected": False, "status": "OFFLINE",
                    "qr_code": None, "qr_expires_in": 0, "session_info": None,
                    "error_message": exc.message}
        with sqlite3.connect(self.settings.db_path) as conn:
            counts = dict(conn.execute(
                "SELECT status, COUNT(*) FROM outbox WHERE transport = 'whatsapp_web' GROUP BY status"
            ).fetchall())
        return {
            **live, "enabled": self.settings.enabled, "expected_sender": EXPECTED_SENDER,
            "stats": {"total_sent": counts.get("sent", 0),
                      "total_failed": counts.get("failed", 0),
                      "total_pending": counts.get("sending", 0) + counts.get("unknown", 0)},
            "server_time": now_iso(),
        }

    def generate_qr(self) -> dict:
        return self._bridge("qr/generate", {})

    def pair_device(self, **kwargs) -> dict:
        raise APIError(410, "scan_required", "Scan the live QR in WhatsApp Linked devices. Simulated pairing has been removed.")

    def pair_by_code(self, phone: str) -> dict:
        return self._bridge("pair-code", {"phone": phone})

    def disconnect(self) -> dict:
        return self._bridge("disconnect", {})

    def templates(self) -> list[dict]:
        return DEFAULT_TEMPLATES

    def get_defaulters(
        self,
        customer_service: CustomerService | None = None,
        risk_tier: Literal["all", "high", "medium", "unpaid_only"] = "all",
        search: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> dict:
        raw_list: list[dict] = []
        if customer_service is not None and getattr(customer_service, "df", None) is not None:
            df = customer_service.df
            # Defaulters criteria: predicted_default == 1 OR total_unpaid_amount > 0 OR late_payment_rate > 25
            cond = (
                (df["predicted_default"] == 1)
                | (df.get("total_unpaid_amount", 0) > 0)
                | (df.get("late_payment_rate", 0) > 25)
            )
            defaulters_df = df[cond].copy()

            if risk_tier == "high":
                defaulters_df = defaulters_df[defaulters_df["risk_category"] == "High Risk"]
            elif risk_tier == "medium":
                defaulters_df = defaulters_df[defaulters_df["risk_category"] == "Medium Risk"]
            elif risk_tier == "unpaid_only":
                defaulters_df = defaulters_df[defaulters_df["total_unpaid_amount"] > 0]

            defaulters_df = defaulters_df.sort_values(by="risk_score", ascending=False)

            with sqlite3.connect(self.settings.db_path) as conn:
                sent_map = dict(
                    conn.execute("SELECT customer_id, status FROM outbox WHERE customer_id IS NOT NULL ORDER BY rowid ASC").fetchall()
                )

            for _, row in defaulters_df.iterrows():
                cid = int(row["customer_id"])
                name_idx = cid % len(INDIAN_NAMES)
                synth_name = INDIAN_NAMES[name_idx]
                synth_phone = f"+9198{cid % 90000000 + 10000000:08d}"

                rec = {
                    "customer_id": cid,
                    "name": synth_name,
                    "customer_name": synth_name,
                    "phone": synth_phone,
                    "risk_score": round(float(row.get("risk_score", 75.0)), 1),
                    "risk_category": str(row.get("risk_category", "High Risk")),
                    "risk_tier": str(row.get("risk_category", "High Risk")),
                    "predicted_default": int(row.get("predicted_default", 1)),
                    "total_unpaid_amount": round(float(row.get("total_unpaid_amount", 15000.0)), 2),
                    "unpaid_amount": round(float(row.get("total_unpaid_amount", 15000.0)), 2),
                    "avg_days_late": round(float(row.get("avg_days_late", 12.0)), 1),
                    "late_days": round(float(row.get("avg_days_late", 12.0)), 1),
                    "late_payment_rate": round(float(row.get("late_payment_rate", 45.0)), 1),
                    "credit_amount": round(float(row.get("credit_amount", 100000.0)), 2),
                    "annual_income": round(float(row.get("annual_income", 300000.0)), 2),
                    "last_sent_status": sent_map.get(cid, "none"),
                    "last_sent_time": None,
                    "recommended_template": "urgent_settlement" if row.get("risk_score", 0) >= 70 else "overdue_notice",
                    "opted_in": True,
                }
                raw_list.append(rec)
        else:
            # High-fidelity fallback defaulter list
            for i, name in enumerate(INDIAN_NAMES):
                cid = 385000 + i
                raw_list.append({
                    "customer_id": cid,
                    "name": name,
                    "customer_name": name,
                    "phone": f"+9198201543{i:02d}",
                    "risk_score": round(85.0 - (i * 1.5), 1),
                    "risk_category": "High Risk" if i < 15 else "Medium Risk",
                    "risk_tier": "High Risk" if i < 15 else "Medium Risk",
                    "predicted_default": 1,
                    "total_unpaid_amount": round(25000.0 - (i * 700), 2),
                    "unpaid_amount": round(25000.0 - (i * 700), 2),
                    "avg_days_late": max(1, 24 - i),
                    "late_days": max(1, 24 - i),
                    "late_payment_rate": round(80.0 - (i * 2), 1),
                    "credit_amount": 150000.0,
                    "annual_income": 360000.0,
                    "last_sent_status": "none",
                    "last_sent_time": None,
                    "recommended_template": "urgent_settlement",
                    "opted_in": True,
                })

        # Apply search filter
        if search:
            q = search.lower().strip()
            raw_list = [
                d for d in raw_list
                if q in str(d["customer_id"]) or q in d["name"].lower() or q in d["phone"]
            ]

        total_count = len(raw_list)
        high_risk_count = sum(1 for d in raw_list if d["risk_tier"] == "High Risk")
        med_risk_count = sum(1 for d in raw_list if d["risk_tier"] == "Medium Risk")
        total_unpaid = sum(d["unpaid_amount"] for d in raw_list)

        start = (page - 1) * page_size
        end = start + page_size
        paginated = raw_list[start:end]

        return {
            "defaulters": paginated,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total_count + page_size - 1) // page_size),
            "summary": {
                "total_defaulters": total_count,
                "high_risk_defaulters": high_risk_count,
                "high_risk_count": high_risk_count,
                "medium_risk_defaulters": med_risk_count,
                "medium_risk_count": med_risk_count,
                "total_unpaid_exposure": round(total_unpaid, 2),
                "total_unpaid_amount": round(total_unpaid, 2),
                "total_unpaid_formatted": f"{int(total_unpaid):,}",
            },
        }

    def render_template(
        self,
        template_id: str,
        customer: dict,
        custom_body: str | None = None,
    ) -> str:
        body = custom_body
        if not body:
            tmpl = next((t for t in DEFAULT_TEMPLATES if t["id"] == template_id), DEFAULT_TEMPLATES[0])
            body = tmpl["body"]

        rendered = (
            body.replace("{{customer_name}}", str(customer.get("customer_name") or customer.get("name", "Customer")))
            .replace("{{customer_id}}", str(customer.get("customer_id", "")))
            .replace("{{unpaid_amount}}", f"{float(customer.get('unpaid_amount') or customer.get('total_unpaid_amount', 0)):,.2f}")
            .replace("{{late_days}}", str(int(float(customer.get("late_days") or customer.get("avg_days_late", 0)))))
            .replace("{{risk_score}}", str(customer.get("risk_score", "High")))
            .replace("{{payment_link}}", f"https://pay.repayx.ai/inv/{customer.get('customer_id', '')}")
        )
        return rendered

    def send(
        self,
        recipient: str,
        message_text: str,
        customer_id: int | None = None,
        customer_name: str | None = None,
        template_name: str = "custom",
        request_id: str | None = None,
    ) -> dict:
        if not self.settings.enabled:
            raise APIError(503, "whatsapp_disabled", "WhatsApp messaging is disabled.")
        recipient = "+" + re.sub(r"\D", "", recipient)
        if recipient not in {c["phone"] for c in DEMO_CONTACTS}:
            raise APIError(403, "recipient_not_configured", "Sending is limited to Nancy, Sid, and Ajay for this demo.")
        if not message_text.strip() or len(message_text) > 2000:
            raise APIError(422, "invalid_message", "Enter a message between 1 and 2000 characters.")
        req_id = request_id or f"req_{os.urandom(16).hex()}"
        fingerprint = hashlib.sha256(f"{recipient}:{message_text}".encode()).hexdigest()
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            # Reserve the request before contacting WhatsApp. Concurrent retries cannot send twice.
            conn.execute("BEGIN IMMEDIATE")
            existing = conn.execute("SELECT * FROM outbox WHERE request_id = ?", (req_id,)).fetchone()
            if existing:
                if existing["fingerprint"] != fingerprint:
                    raise APIError(409, "request_conflict", "This send request was already used for another message.")
                return {"request_id": req_id, "status": existing["status"],
                        "message_id": existing["provider_id"], "recipient": recipient,
                        "error_message": existing["error"], "duplicate": True}
            live = self._bridge("status")
            if not live.get("connected"):
                raise APIError(409, "not_connected", "Link your WhatsApp account before sending.")
            if (live.get("session_info") or {}).get("phone_number") != EXPECTED_SENDER:
                raise APIError(403, "wrong_sender", "Link +91 8650629360 before sending these messages.")
            conn.execute(
                """INSERT INTO outbox (request_id, fingerprint, recipient, customer_id, customer_name,
                   template, preview, created_at, status, transport) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sending', 'whatsapp_web')""",
                (req_id, fingerprint, recipient, customer_id, customer_name, template_name, message_text, now_iso()),
            )
        try:
            result = self._bridge("send", {"phone": recipient, "message": message_text})
            provider_id = result.get("message_id")
            if not provider_id or result.get("status") != "sent":
                raise APIError(502, "send_unconfirmed", "WhatsApp did not confirm the send. Check your phone before retrying.")
        except APIError as exc:
            # A transport timeout can happen after delivery: do not retry automatically.
            delivery_status = "unknown" if exc.status_code >= 500 else "failed"
            with sqlite3.connect(self.settings.db_path) as conn:
                conn.execute("UPDATE outbox SET status = ?, error = ? WHERE request_id = ?", (delivery_status, exc.message, req_id))
            raise
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.execute("UPDATE outbox SET status = 'sent', provider_id = ? WHERE request_id = ?", (provider_id, req_id))
        return {"request_id": req_id, "status": "sent", "message_id": provider_id,
                "provider_id": provider_id, "recipient": recipient, "sent_at": now_iso()}

    def auto_dispatch(
        self,
        customer_service: CustomerService | None = None,
        target_tier: Literal["all", "high", "medium", "unpaid_only"] = "high",
        template_id: str = "urgent_settlement",
        custom_body: str | None = None,
        customer_ids: list[int] | None = None,
        limit: int = 50,
    ) -> dict:
        raise APIError(410, "demo_directory_only",
                       "The portfolio directory contains generated phone numbers. Use the named demo recipients instead.")

    def history(self) -> dict:
        with sqlite3.connect(self.settings.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """
                SELECT request_id, recipient, customer_id, customer_name,
                       template AS template_name, preview AS message_preview,
                       created_at AS sent_at,
                       CASE WHEN transport = 'legacy_simulation' THEN 'simulated' ELSE status END AS status,
                       provider_id, error AS error_message
                FROM outbox
                ORDER BY created_at DESC, rowid DESC
                LIMIT 100
            """
            ).fetchall()
            messages = [dict(r) for r in rows]

            inbox_rows = conn.execute("SELECT * FROM inbox ORDER BY received_at DESC LIMIT 50").fetchall()
            incoming = [dict(r) for r in inbox_rows]

        return {
            "messages": messages,
            "incoming": incoming,
            "count": len(messages),
            "total": len(messages),
            "server_time": now_iso(),
        }

    def contacts(self) -> list[dict]:
        return [
            {**contact, "sample_data": True,
             "message": (
                 f"URGENT NOTICE: Dear {contact['name']}, your loan account #{contact['customer_id']} "
                 f"has an overdue balance of \u20b9{contact['amount']} ({contact['late_days']} days past due). "
                 "To avoid legal escalation or credit score degradation, please clear your outstanding EMI "
                 f"immediately using your secure RepayX link: https://pay.repayx.ai/inv/{contact['customer_id']}"
             )}
            for contact in DEMO_CONTACTS
        ]
