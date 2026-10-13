"""SMS adapters.

India: commercial SMS must use a DLT-registered sender ID (header) and a DLT-approved
content template. MSG91 Flow sends a pre-registered template with variables.
Twilio is suitable outside India, or in India with DLT registration completed.
"""

from __future__ import annotations

import base64
import json
from urllib.parse import urlencode

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

TWILIO_SUPPRESS_CODES = {21610}  # recipient replied STOP
TWILIO_TRANSIENT_CODES = {20429, 20500, 20503}


class TwilioSmsProvider(Provider):
    name = "twilio"
    channel = "sms"

    def __init__(self, config: AutomationConfig, timeout: float = 15.0):
        self.config = config
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        c = self.config
        missing = [n for n, v in (("TWILIO_ACCOUNT_SID", c.twilio_account_sid),
                                  ("TWILIO_AUTH_TOKEN", c.twilio_auth_token)) if not v]
        if not (c.twilio_from_number or c.twilio_messaging_service_sid):
            missing.append("TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID")
        return f"Missing {', '.join(missing)}." if missing else None

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, transient=False)
        c = self.config
        form = {"To": message.recipient, "Body": message.text[:1600]}
        if c.twilio_messaging_service_sid:
            form["MessagingServiceSid"] = c.twilio_messaging_service_sid
        else:
            form["From"] = c.twilio_from_number
        if c.twilio_status_callback_url:
            form["StatusCallback"] = c.twilio_status_callback_url
        auth = base64.b64encode(f"{c.twilio_account_sid}:{c.twilio_auth_token}".encode()).decode()
        url = f"https://api.twilio.com/2010-04-01/Accounts/{c.twilio_account_sid}/Messages.json"
        try:
            resp = http_request("POST", url, {"Authorization": f"Basic {auth}",
                                              "Content-Type": "application/x-www-form-urlencoded"},
                                urlencode(form).encode(), self.timeout)
        except TransportError as exc:
            return transport_failure(exc)
        body = resp.json()
        if 200 <= resp.status < 300 and body.get("sid"):
            return SendResult.ok(body["sid"], provider_status=body.get("status"))
        code = body.get("code")
        return SendResult.fail(f"twilio_{code or resp.status}", str(body.get("message") or f"HTTP {resp.status}"),
                               transient=resp.status in TRANSIENT_HTTP or code in TWILIO_TRANSIENT_CODES,
                               suppress=code in TWILIO_SUPPRESS_CODES)


class Msg91SmsProvider(Provider):
    name = "msg91"
    channel = "sms"

    def __init__(self, config: AutomationConfig, timeout: float = 15.0):
        self.config = config
        self.timeout = timeout

    def configuration_problem(self) -> str | None:
        missing = [n for n, v in (("MSG91_AUTH_KEY", self.config.msg91_auth_key),
                                  ("MSG91_FLOW_ID", self.config.msg91_flow_id)) if not v]
        return f"Missing {', '.join(missing)}." if missing else None

    def send(self, message: OutboundMessage) -> SendResult:
        problem = self.configuration_problem()
        if problem:
            return SendResult.fail("provider_not_configured", problem, transient=False)
        recipient = {"mobiles": message.recipient.lstrip("+")}
        for var, key in zip(self.config.msg91_template_vars, ("name", "amount", "due_date", "loan_id")):
            recipient[var] = message.template_params.get(key, "")
        payload = {"template_id": self.config.msg91_flow_id, "short_url": "0", "recipients": [recipient]}
        try:
            resp = http_request("POST", "https://control.msg91.com/api/v5/flow",
                                {"authkey": self.config.msg91_auth_key, "Content-Type": "application/json",
                                 "accept": "application/json"},
                                json.dumps(payload).encode(), self.timeout)
        except TransportError as exc:
            return transport_failure(exc)
        body = resp.json()
        if 200 <= resp.status < 300 and body.get("type") == "success" and body.get("message"):
            return SendResult.ok(str(body["message"]))
        return SendResult.fail(f"msg91_{resp.status}", str(body.get("message") or f"HTTP {resp.status}"),
                               transient=resp.status in TRANSIENT_HTTP)
