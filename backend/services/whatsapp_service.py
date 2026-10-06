"""Meta Cloud API messaging with a durable outbox and signed delivery receipts.

Contacts are explicitly supplied by the operator, never inferred from ML data.
No automatic retry after a send: a timeout can mean Meta accepted the message.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from api.errors import APIError

ROOT = Path(__file__).resolve().parents[2]
PHONE = re.compile(r"\+[1-9]\d{7,14}$")
STATUS_RANK = {"accepted": 0, "sent": 1, "failed": 2, "delivered": 3, "read": 4}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class WhatsAppSettings:
    token: str = field(default_factory=lambda: os.getenv("WHATSAPP_ACCESS_TOKEN", ""), repr=False)
    operator_key: str = field(default_factory=lambda: os.getenv("WHATSAPP_OPERATOR_KEY", ""), repr=False)
    app_secret: str = field(default_factory=lambda: os.getenv("WHATSAPP_APP_SECRET", ""), repr=False)
    verify_token: str = field(default_factory=lambda: os.getenv("WHATSAPP_VERIFY_TOKEN", ""), repr=False)
    phone_id: str = field(default_factory=lambda: os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
    business_id: str = field(default_factory=lambda: os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", ""))
    version: str = field(default_factory=lambda: os.getenv("WHATSAPP_GRAPH_VERSION", ""))
    enabled: bool = field(default_factory=lambda: os.getenv("WHATSAPP_ENABLED", "false").lower() == "true")
    test_mode: bool = field(default_factory=lambda: os.getenv("WHATSAPP_TEST_MODE", "true").lower() != "false")
    contacts_file: Path = field(default_factory=lambda: ROOT / os.getenv("WHATSAPP_CONTACTS_FILE", "backend/data/whatsapp_contacts.json"))
    db_path: Path = field(default_factory=lambda: ROOT / os.getenv("WHATSAPP_DB_PATH", "backend/data/whatsapp.sqlite3"))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class WhatsAppService:
    def __init__(self, settings: WhatsAppSettings):
        self.settings = settings

    def configuration(self) -> dict:
        s = self.settings
        checks = {
            "WHATSAPP_ACCESS_TOKEN": bool(s.token),
            "WHATSAPP_OPERATOR_KEY": len(s.operator_key) >= 32,
            "WHATSAPP_PHONE_NUMBER_ID": bool(re.fullmatch(r"\d+", s.phone_id)),
            "WHATSAPP_GRAPH_VERSION": bool(re.fullmatch(r"v\d+\.\d+", s.version)),
        }
        if not s.test_mode:
            checks["WHATSAPP_BUSINESS_ACCOUNT_ID"] = bool(re.fullmatch(r"\d+", s.business_id))
        missing = [key for key, present in checks.items() if not present]
        return {"enabled": s.enabled, "ready": s.enabled and not missing, "missing": missing,
                "test_mode": s.test_mode, "webhook_configured": bool(s.app_secret and s.verify_token),
                "server_time": now()}

    def authorize(self, authorization: str | None):
        key = self.settings.operator_key
        if len(key) < 32:
            raise APIError(503, "whatsapp_not_configured", "Set a WhatsApp operator key of at least 32 characters in the backend configuration.")
        supplied = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
        if not hmac.compare_digest(supplied.encode(), key.encode()):
            raise APIError(401, "unauthorized", "Enter the WhatsApp operator key to access messaging.")

    @contextmanager
    def database(self):
        self.settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.settings.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            connection.executescript('''
                CREATE TABLE IF NOT EXISTS outbox (
                    request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, recipient TEXT NOT NULL,
                    template TEXT NOT NULL, preview TEXT NOT NULL, created_at TEXT NOT NULL,
                    status TEXT NOT NULL, provider_id TEXT, error TEXT
                );
                CREATE TABLE IF NOT EXISTS receipts (
                    provider_id TEXT PRIMARY KEY, status TEXT NOT NULL, rank INTEGER NOT NULL,
                    updated_at TEXT NOT NULL, error TEXT
                );
                CREATE TABLE IF NOT EXISTS inbox (
                    provider_id TEXT PRIMARY KEY, sender TEXT NOT NULL, text TEXT NOT NULL, received_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS blocked (phone TEXT PRIMARY KEY);
            ''')
            yield connection
            connection.commit()
        finally:
            connection.close()

    def contacts(self) -> list[dict]:
        try:
            rows = json.loads(self.settings.contacts_file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return []
        except (ValueError, OSError):
            raise APIError(503, "contacts_invalid", "The WhatsApp contacts file is invalid.") from None
        if not isinstance(rows, list):
            raise APIError(503, "contacts_invalid", "The WhatsApp contacts file must contain a list.")
        contacts = []
        for row in rows:
            if not isinstance(row, dict) or not PHONE.fullmatch(str(row.get("phone", ""))):
                raise APIError(503, "contacts_invalid", "Every WhatsApp contact needs a valid international phone number.")
            contacts.append({"name": str(row.get("name", "Contact")), "phone": row["phone"],
                             "role": row.get("role") if row.get("role") in {"admin", "defaulter", "customer"} else "customer",
                             "opted_in": row.get("opted_in") is True and bool(row.get("consent_note")),
                             "test_recipient": row.get("test_recipient") is True})
        with self.database() as db:
            blocked = {r[0] for r in db.execute("SELECT phone FROM blocked")}
        return [{**c, "opted_in": c["opted_in"] and c["phone"] not in blocked} for c in contacts]

    def graph(self, path: str, payload: dict | None = None) -> dict:
        if not self.configuration()["ready"]:
            raise APIError(503, "whatsapp_not_configured", "WhatsApp is disabled or missing credentials. Complete setup first.")
        request = Request(f"https://graph.facebook.com/{self.settings.version}/{path}",
                          data=json.dumps(payload).encode() if payload is not None else None,
                          headers={"Authorization": f"Bearer {self.settings.token}", "Content-Type": "application/json"})
        try:
            with build_opener(NoRedirect).open(request, timeout=20) as response:
                body = json.load(response)
            if not isinstance(body, dict):
                raise ValueError()
            return body
        except HTTPError as exc:
            code = "provider_unknown" if exc.code >= 500 else "provider_rejected"
            raise APIError(502, code, "Meta could not confirm the request. Check sender credentials, template approval, and recipient verification in Meta.") from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise APIError(502, "provider_unknown", "Meta did not confirm the result. Check delivery history before sending again; the message may have been accepted.") from None

    def templates(self) -> list[dict]:
        if self.settings.test_mode:
            # Meta's built-in API Setup test template; provider validates availability when sending.
            return [{"name": "hello_world", "language": "en_US", "parameters": 0,
                     "body": "Hello World\n\nWelcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.\n\nWhatsApp Business Platform sample message"}]
        body = self.graph(f"{self.settings.business_id}/message_templates?fields=name,language,status,components&limit=100")
        result = []
        for template in body.get("data", []):
            components = template.get("components", [])
            if template.get("status") != "APPROVED" or any(c.get("type") not in ("BODY", "FOOTER") for c in components):
                continue
            content = "\n\n".join(c.get("text", "") for c in components)
            placeholders = set(re.findall(r"{{(.*?)}}", content))
            if placeholders != {str(i) for i in range(1, len(placeholders) + 1)}:
                continue
            result.append({"name": template["name"], "language": template["language"],
                           "body": content, "parameters": len(placeholders)})
        return result

    def history(self) -> dict:
        with self.database() as db:
            messages = [dict(r) for r in db.execute('''
                SELECT o.*, COALESCE(r.status,o.status) AS delivery_status,
                    COALESCE(r.updated_at,o.created_at) AS updated_at, r.error AS delivery_error
                FROM outbox o LEFT JOIN receipts r ON o.provider_id=r.provider_id
                ORDER BY o.created_at DESC, o.rowid DESC LIMIT 100
            ''')]
            incoming = [dict(r) for r in db.execute("SELECT * FROM inbox ORDER BY received_at DESC LIMIT 100")]
        for message in messages:
            message.pop("fingerprint", None)
        return {"messages": messages, "incoming": incoming, "server_time": now()}

    def send(self, request_id: str, recipient: str, template_name: str, language: str, parameters: list[str], preview: str) -> dict:
        fingerprint = hashlib.sha256(json.dumps([recipient, template_name, language, parameters, preview]).encode()).hexdigest()
        with self.database() as db:
            existing = db.execute("SELECT * FROM outbox WHERE request_id=?", (request_id,)).fetchone()
            if existing:
                if existing["fingerprint"] != fingerprint:
                    raise APIError(409, "request_conflict", "This request ID was already used for a different message.")
                return {"request_id": request_id, "status": existing["status"], "provider_id": existing["provider_id"]}
        if not self.configuration()["ready"]:
            raise APIError(503, "whatsapp_not_configured", "WhatsApp is disabled or missing credentials. Complete setup first.")
        contact = next((c for c in self.contacts() if c["phone"] == recipient), None)
        if not contact or not contact["opted_in"] or (self.settings.test_mode and not contact["test_recipient"]):
            raise APIError(403, "recipient_not_allowed", "Use a configured, opted-in recipient. Test mode allows only test recipients.")
        template = next((t for t in self.templates() if t["name"] == template_name and t["language"] == language), None)
        if not template or len(parameters) != template["parameters"]:
            raise APIError(422, "template_invalid", "Select an available template and supply every parameter.")
        rendered = re.sub(r"{{(\d+)}}", lambda m: parameters[int(m[1]) - 1], template["body"])
        if preview != rendered:
            raise APIError(409, "preview_changed", "The template changed. Refresh and review the message before sending.")
        payload = {"messaging_product": "whatsapp", "to": recipient.removeprefix("+"), "type": "template",
                   "template": {"name": template_name, "language": {"code": language}}}
        if parameters:
            payload["template"]["components"] = [{"type": "body", "parameters": [{"type": "text", "text": p} for p in parameters]}]
        with self.database() as db:
            # Atomic reservation prevents duplicate sends across threads/processes.
            try:
                db.execute("INSERT INTO outbox VALUES (?,?,?,?,?,?,?,NULL,NULL)",
                           (request_id, fingerprint, recipient, template_name, rendered, now(), "sending"))
            except sqlite3.IntegrityError:
                raise APIError(409, "send_in_progress", "This message is already being processed. Refresh its status.") from None
        try:
            result = self.graph(f"{self.settings.phone_id}/messages", payload)
            provider_id = (result.get("messages") or [{}])[0].get("id")
            if not isinstance(provider_id, str) or not provider_id:
                raise APIError(502, "provider_unknown", "Meta did not return a message ID. Check delivery before sending again.")
        except APIError as exc:
            status = "failed" if exc.code == "provider_rejected" else "unknown"
            with self.database() as db:
                db.execute("UPDATE outbox SET status=?, error=? WHERE request_id=?", (status, exc.message, request_id))
            raise
        with self.database() as db:
            db.execute("UPDATE outbox SET status='accepted',provider_id=? WHERE request_id=?", (provider_id, request_id))
        return {"request_id": request_id, "status": "accepted", "provider_id": provider_id}

    def webhook(self, body: bytes, signature: str):
        secret = self.settings.app_secret
        expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not secret or not hmac.compare_digest(expected.encode(), signature.encode()):
            raise APIError(403, "invalid_signature", "Invalid webhook signature.")
        try:
            data = json.loads(body)
            if data.get("object") != "whatsapp_business_account":
                raise ValueError()
            events = []
            for entry in data.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    if value.get("metadata", {}).get("phone_number_id") == self.settings.phone_id:
                        events.append(value)
            with self.database() as db:
                for value in events:
                    for receipt in value.get("statuses", []):
                        status = receipt.get("status")
                        if status not in STATUS_RANK:
                            continue
                        timestamp = datetime.fromtimestamp(int(receipt["timestamp"]), timezone.utc).isoformat()
                        error = "Meta reports delivery failed. Check the recipient and template in WhatsApp Manager." if status == "failed" else None
                        db.execute('''INSERT INTO receipts VALUES (?,?,?,?,?)
                            ON CONFLICT(provider_id) DO UPDATE SET status=excluded.status,rank=excluded.rank,
                            updated_at=excluded.updated_at,error=excluded.error WHERE excluded.rank>receipts.rank''',
                            (receipt["id"], status, STATUS_RANK[status], timestamp, error))
                    for message in value.get("messages", []):
                        phone = "+" + message["from"]
                        text = message.get("text", {}).get("body", "[Non-text message]")
                        timestamp = datetime.fromtimestamp(int(message["timestamp"]), timezone.utc).isoformat()
                        db.execute("INSERT OR IGNORE INTO inbox VALUES (?,?,?,?)", (message["id"], phone, text, timestamp))
                        if text.strip().upper() in {"STOP", "UNSUBSCRIBE", "CANCEL", "OPT OUT"}:
                            db.execute("INSERT OR IGNORE INTO blocked VALUES (?)", (phone,))
        except (ValueError, KeyError, TypeError, AttributeError, OverflowError):
            raise APIError(400, "invalid_webhook", "Invalid webhook payload.") from None
