"""WhatsApp adapters.

MetaCloudWhatsAppProvider is the official WhatsApp Business Platform (Cloud API).
Business-initiated reminders must use a pre-approved template; free-form text is
only allowed inside the 24-hour window that opens when the customer messages you.
"""

from __future__ import annotations

import json

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

# https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
META_TRANSIENT_CODES = {1, 2, 4, 80007, 130429, 131000, 131016, 131056, 133004}
META_SUPPRESS_CODES = {131050}  # user stopped receiving business messages
TEMPLATE_PARAM_ORDER = ("name", "amount", "due_date", "loan_id")


class MetaCloudWhatsAppProvider(Provider):
    name = "meta_cloud"
    channel = "whatsapp"

    def __init__(self, config: AutomationConfig, timeout: float = 15.0):
        self.config = config
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        missing = [n for n, v in (
            ("WHATSAPP_ACCESS_TOKEN", self.config.whatsapp_access_token),
            ("WHATSAPP_PHONE_NUMBER_ID", self.config.whatsapp_phone_number_id),
            ("WHATSAPP_TEMPLATE_REMINDER", self.config.whatsapp_template_name),
        ) if not v]
        return f"Missing {', '.join(missing)}." if missing else None

    def build_payload(self, message: OutboundMessage) -> dict:
        to = message.recipient.lstrip("+")
        if message.media_type == "audio" and message.media_url:
            return {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "audio",
                "audio": {"link": message.media_url},
            }
        if message.is_reply:
            return {"messaging_product": "whatsapp", "recipient_type": "individual", "to": to,
                    "type": "text", "text": {"preview_url": False, "body": message.text[:4096]}}
        params = [{"type": "text", "text": message.template_params.get(k, "")[:1024]} for k in TEMPLATE_PARAM_ORDER]
        return {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": self.config.whatsapp_template_name,
                "language": {"code": self.config.whatsapp_template_language},
                "components": [{"type": "body", "parameters": params}],
            },
        }

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, transient=False)
        url = (f"https://graph.facebook.com/{self.config.whatsapp_graph_version}/"
               f"{self.config.whatsapp_phone_number_id}/messages")
        headers = {"Authorization": f"Bearer {self.config.whatsapp_access_token}",
                   "Content-Type": "application/json"}
        try:
            resp = http_request("POST", url, headers, json.dumps(self.build_payload(message)).encode(), self.timeout)
        except TransportError as exc:
            return transport_failure(exc)
        body = resp.json()
        if 200 <= resp.status < 300:
            msgs = body.get("messages") or []
            if msgs and msgs[0].get("id"):
                return SendResult.ok(msgs[0]["id"], message_status=msgs[0].get("message_status"))
            return SendResult.fail("invalid_response", "Provider response had no message id.", transient=False)
        err = body.get("error") or {}
        code = err.get("code")
        detail = (err.get("error_data") or {}).get("details") or err.get("message") or f"HTTP {resp.status}"
        transient = resp.status in TRANSIENT_HTTP or code in META_TRANSIENT_CODES
        return SendResult.fail(f"meta_{code or resp.status}", str(detail), transient=transient,
                               suppress=code in META_SUPPRESS_CODES)


class BaileysBridgeProvider(Provider):
    """The existing WhatsApp Web bridge (backend/whatsapp-bridge). NOT an official WhatsApp
    Business integration: suitable for internal testing only, not production reminders."""

    name = "baileys_bridge"
    channel = "whatsapp"

    def __init__(self, config: AutomationConfig, timeout: float = 20.0):
        self.base = config.whatsapp_bridge_url.rstrip("/")
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        return None if self.base else "Missing WHATSAPP_BRIDGE_URL."

    def send(self, message: OutboundMessage) -> SendResult:
        payload = json.dumps({"recipient": message.recipient, "phone": message.recipient,
                              "message": message.text}).encode()
        try:
            resp = http_request("POST", f"{self.base}/send", {"Content-Type": "application/json"}, payload, self.timeout)
        except TransportError as exc:
            return transport_failure(exc)
        body = resp.json()
        if 200 <= resp.status < 300 and body.get("success") is True:
            pid = body.get("message_id") or body.get("provider_id")
            if pid:
                return SendResult.ok(str(pid))
            return SendResult.fail("invalid_response", "Bridge did not return a message id.", transient=False)
        return SendResult.fail(f"bridge_{resp.status}", str(body.get("error") or f"HTTP {resp.status}"),
                               transient=resp.status in TRANSIENT_HTTP)
