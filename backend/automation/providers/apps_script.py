"""Authenticated MailApp bridge. Never logs payloads, signatures or provider bodies.

The signed JSON body works with doPost's postData.contents (no custom headers).
Ambiguous outcomes are never automatically resent, consistent with the dispatcher.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import time
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from automation.config import AutomationConfig
from automation.providers.base import OutboundMessage, Provider, SendResult
from automation.util import normalize_email


class GoogleRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urlsplit(newurl)
        if (target.scheme != "https" or target.hostname != "script.googleusercontent.com"
                or target.username or target.password or target.port not in (None, 443)
                or code not in (302, 303)):
            raise ValueError("Unexpected Apps Script redirect")
        # ContentService's response redirect must be GET, without the signed POST body.
        return Request(newurl, method="GET")


def post_envelope(url: str, body: bytes) -> dict:
    request = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with build_opener(GoogleRedirects()).open(request, timeout=20) as response:
        data = response.read(16_385)
        if len(data) > 16_384:
            raise ValueError("Oversized response")
        result = json.loads(data)
        if not isinstance(result, dict):
            raise ValueError("Invalid response")
        return result


class AppsScriptEmailProvider(Provider):
    name = "google_apps_script"
    channel = "email"

    def __init__(self, config: AutomationConfig):
        self.config = config

    def configuration_problem(self) -> str | None:
        if not re.fullmatch(r"https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec", self.config.apps_script_url):
            return "APPS_SCRIPT_URL must be a Google Apps Script /exec HTTPS deployment URL."
        if len(self.config.apps_script_secret) < 32:
            return "APPS_SCRIPT_SHARED_SECRET must contain at least 32 characters."
        if not self.config.apps_script_allowed_recipients:
            return "APPS_SCRIPT_ALLOWED_RECIPIENTS must explicitly allow authorized recipients."
        return None

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, False)
        recipient = normalize_email(message.recipient)
        if not recipient or recipient.lower() not in self.config.apps_script_allowed_recipients:
            return SendResult.fail("recipient_not_allowlisted", "Recipient is not authorized for Apps Script email.", False)
        # Accept structured reminder facts only. No arbitrary subject, HTML, attachments or links.
        fields = message.template_params
        if message.is_reply or not all(isinstance(fields.get(k), str) and 0 < len(fields[k]) <= 200
                                       for k in ("name", "loan_id", "amount", "due_date")):
            return SendResult.fail("invalid_message", "Apps Script accepts structured EMI reminders only.", False)
        request_id = hashlib.sha256(message.idempotency_key.encode()).hexdigest()
        payload = json.dumps({"request_id": request_id, "recipient": recipient.lower(),
                              **{k: fields[k] for k in ("name", "loan_id", "amount", "due_date")}},
                             ensure_ascii=True, separators=(",", ":"))
        timestamp, nonce = str(int(time.time())), secrets.token_hex(16)
        signature = hmac.new(self.config.apps_script_secret.encode(),
                             f"{timestamp}\n{nonce}\n{payload}".encode(), hashlib.sha256).hexdigest()
        envelope = json.dumps({"timestamp": timestamp, "nonce": nonce, "payload": payload,
                               "signature": signature}).encode()
        try:
            result = post_envelope(self.config.apps_script_url, envelope)
            if result.get("request_id") != request_id:
                raise ValueError("Uncorrelated response")
            status = result.get("status")
            if status == "accepted":
                # MailApp returns no provider message id; this is a bridge receipt, not delivery proof.
                return SendResult.ok(f"gas:{request_id}")
            if status in ("quota_exceeded", "busy"):
                return SendResult.fail(f"apps_script_{status}", "Apps Script temporarily unavailable; bounded retry scheduled.", True)
            if status in ("disabled", "recipient_not_allowlisted", "invalid_request", "ledger_full", "unauthorized"):
                return SendResult.fail(f"apps_script_{status}", f"Apps Script rejected request: {status}.", False)
        except Exception:
            # A response error (including HTTP 5xx) may occur AFTER MailApp accepted the message.
            pass
        return SendResult.fail("ambiguous_timeout", "Apps Script outcome unknown; inspect receipt before any manual retry.", False)
