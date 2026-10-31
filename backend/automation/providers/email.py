"""Email adapters: generic SMTP (works with SES, SendGrid, Postmark, Mailgun SMTP relays)
and the Mailgun HTTP API (gives message ids that match its signed delivery webhooks)."""

from __future__ import annotations

import base64
import json
import smtplib
import socket
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from automation.config import AutomationConfig
from automation.providers.base import (
    TRANSIENT_HTTP,
    OutboundMessage,
    Provider,
    SendResult,
    TransportError,
    http_request,
    transport_failure,
)


def _sender_problem(config: AutomationConfig) -> list[str]:
    return [] if config.email_from_address else ["EMAIL_FROM_ADDRESS"]


class SmtpEmailProvider(Provider):
    name = "smtp"
    channel = "email"

    def __init__(self, config: AutomationConfig, timeout: float = 20.0):
        self.config = config
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        missing = _sender_problem(self.config) + ([] if self.config.smtp_host else ["SMTP_HOST"])
        return f"Missing {', '.join(missing)}." if missing else None

    def build(self, message: OutboundMessage) -> EmailMessage:
        c = self.config
        msg = EmailMessage()
        msg["From"] = formataddr((c.email_from_name, c.email_from_address))
        msg["To"] = message.recipient
        msg["Subject"] = message.subject or "Payment reminder"
        domain = c.email_from_address.split("@")[-1] if "@" in c.email_from_address else "repayx.ai"
        msg["Message-ID"] = make_msgid(idstring=message.idempotency_key.replace(":", "."), domain=domain)
        if c.email_reply_to:
            msg["Reply-To"] = c.email_reply_to
        msg["X-RepayX-Idempotency-Key"] = message.idempotency_key
        msg.set_content(message.text)
        if message.html:
            msg.add_alternative(message.html, subtype="html")
        return msg

    def _send_via_https_relay(self, message: OutboundMessage) -> SendResult:
        relay_url = getattr(self.config, "email_relay_url", None) or "https://repay-x.vercel.app/api/send-email"
        secret = getattr(self.config, "email_relay_secret", None) or "YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU"
        c = self.config
        payload = json.dumps({
            "to": message.recipient,
            "subject": message.subject or "Payment reminder",
            "text": message.text,
            "html": message.html,
            "from": formataddr((c.email_from_name, c.email_from_address)),
            "replyTo": c.email_reply_to or c.email_from_address,
            "idempotencyKey": message.idempotency_key,
            "secret": secret,
        }).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret}",
            "X-Relay-Secret": secret,
        }
        try:
            req = Request(relay_url, data=payload, headers=headers, method="POST")
            with urlopen(req, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
                if body.get("success") and body.get("messageId"):
                    return SendResult.ok(str(body["messageId"]).strip("<>"))
                elif body.get("error"):
                    return SendResult.fail("relay_error", str(body["error"]), transient=True)
                return SendResult.fail("relay_rejected", "Relay did not return messageId", transient=True)
        except Exception as exc:
            return SendResult.fail("smtp_connect", f"Direct SMTP and HTTPS relay failed ({type(exc).__name__}: {exc}).", True)

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, transient=False)
        c = self.config

        # 1. When an HTTPS email relay is configured (e.g. on Render Free where outbound port 587 is blocked),
        # dispatch via the HTTPS relay first to avoid slow 20-second TCP connection drop timeouts.
        if getattr(c, "email_relay_url", None):
            relay_res = self._send_via_https_relay(message)
            if relay_res.accepted:
                return relay_res

        # 2. Direct SMTP connection (port 465 SSL or port 587 TLS)
        msg = self.build(message)
        server = None
        # Try port 465 direct SSL first for high reliability across cloud hosts
        try:
            server = smtplib.SMTP_SSL(c.smtp_host, 465, context=ssl.create_default_context(), timeout=self.timeout)
            if c.smtp_username:
                server.login(c.smtp_username, c.smtp_password)
        except Exception:
            server = None

        if server is None:
            try:
                server = smtplib.SMTP(c.smtp_host, c.smtp_port or 587, timeout=self.timeout)
                server.ehlo()
                if c.smtp_use_tls:
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                if c.smtp_username:
                    server.login(c.smtp_username, c.smtp_password)
            except smtplib.SMTPAuthenticationError:
                return SendResult.fail("smtp_auth", "SMTP authentication failed.", transient=False)
            except (OSError, smtplib.SMTPException):
                return self._send_via_https_relay(message)

        try:
            try:
                refused = server.send_message(msg)
            except smtplib.SMTPRecipientsRefused as exc:
                code = next(iter(exc.recipients.values()))[0] if exc.recipients else 550
                return SendResult.fail(f"smtp_{code}", "Recipient refused by the mail server.",
                                       transient=400 <= code < 500, suppress=code >= 500)
            except smtplib.SMTPResponseException as exc:
                return SendResult.fail(f"smtp_{exc.smtp_code}", "Mail server rejected the message.",
                                       transient=400 <= exc.smtp_code < 500)
            except (socket.timeout, TimeoutError):
                return self._send_via_https_relay(message)
            except (OSError, smtplib.SMTPException):
                return self._send_via_https_relay(message)
            if refused:
                return SendResult.fail("smtp_refused", "Recipient refused by the mail server.", transient=False)
            return SendResult.ok(msg["Message-ID"].strip("<>"))
        finally:
            try:
                server.quit()
            except Exception:
                pass


class MailgunEmailProvider(Provider):
    name = "mailgun"
    channel = "email"

    def __init__(self, config: AutomationConfig, timeout: float = 15.0):
        self.config = config
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        missing = _sender_problem(self.config) + [n for n, v in (
            ("MAILGUN_API_KEY", self.config.mailgun_api_key), ("MAILGUN_DOMAIN", self.config.mailgun_domain)) if not v]
        return f"Missing {', '.join(missing)}." if missing else None

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, transient=False)
        c = self.config
        form = [("from", formataddr((c.email_from_name, c.email_from_address))), ("to", message.recipient),
                ("subject", message.subject or "Payment reminder"), ("text", message.text),
                ("v:repayx_key", message.idempotency_key)]
        if message.html:
            form.append(("html", message.html))
        if c.email_reply_to:
            form.append(("h:Reply-To", c.email_reply_to))
        auth = base64.b64encode(f"api:{c.mailgun_api_key}".encode()).decode()
        url = f"{c.mailgun_base_url.rstrip('/')}/v3/{c.mailgun_domain}/messages"
        try:
            resp = http_request("POST", url, {"Authorization": f"Basic {auth}",
                                              "Content-Type": "application/x-www-form-urlencoded"},
                                urlencode(form).encode(), self.timeout)
        except TransportError as exc:
            return transport_failure(exc)
        body = resp.json()
        if 200 <= resp.status < 300 and body.get("id"):
            return SendResult.ok(str(body["id"]).strip("<>"))
        return SendResult.fail(f"mailgun_{resp.status}", str(body.get("message") or f"HTTP {resp.status}"),
                               transient=resp.status in TRANSIENT_HTTP)
