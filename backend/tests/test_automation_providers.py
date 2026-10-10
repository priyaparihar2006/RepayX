"""Provider adapters (HTTP stubbed: no network) and reply intent parsing."""

from __future__ import annotations

import json
from datetime import date
from urllib.parse import parse_qs

import pytest

from automation.intents import classify, extract_promise_date
from automation.providers import build_providers
from automation.providers import email as email_mod
from automation.providers import sms as sms_mod
from automation.providers import whatsapp as wa_mod
from automation.providers.base import HttpResponse, OutboundMessage, TransportError
from automation.providers.sandbox import SandboxProvider
from tests.automation_helpers import make_config

MSG = OutboundMessage(channel="whatsapp", recipient="+919876543210", text="Hello", idempotency_key="job:whatsapp",
                      template_params={"name": "Rahul", "amount": "₹8,500.00", "due_date": "11 Oct 2026",
                                       "loan_id": "LN-1"})


class Recorder:
    def __init__(self, response=None, raises=None):
        self.response, self.raises, self.calls = response, raises, []

    def __call__(self, method, url, headers, data, timeout):
        self.calls.append({"method": method, "url": url, "headers": headers, "data": data})
        if self.raises:
            raise self.raises
        return self.response


def meta_config(tmp_path, **kw):
    return make_config(tmp_path, whatsapp_access_token="EAAG-token", whatsapp_phone_number_id="1234567890",
                       whatsapp_template_name="emi_reminder_v1", whatsapp_template_language="en", **kw)


def test_meta_sends_approved_template_with_ordered_parameters(tmp_path, monkeypatch):
    rec = Recorder(HttpResponse(200, json.dumps({"messages": [{"id": "wamid.ABC"}]})))
    monkeypatch.setattr(wa_mod, "http_request", rec)
    result = wa_mod.MetaCloudWhatsAppProvider(meta_config(tmp_path)).send(MSG)
    assert result.accepted and result.provider_message_id == "wamid.ABC"
    call = rec.calls[0]
    assert call["url"] == "https://graph.facebook.com/v21.0/1234567890/messages"
    assert call["headers"]["Authorization"] == "Bearer EAAG-token"
    body = json.loads(call["data"])
    assert body["to"] == "919876543210" and body["type"] == "template"
    assert body["template"]["name"] == "emi_reminder_v1"
    assert [p["text"] for p in body["template"]["components"][0]["parameters"]] == \
        ["Rahul", "₹8,500.00", "11 Oct 2026", "LN-1"]


def test_meta_reply_uses_free_text_inside_session(tmp_path):
    p = wa_mod.MetaCloudWhatsAppProvider(meta_config(tmp_path))
    reply = OutboundMessage(channel="whatsapp", recipient="+91999", text="Thanks", idempotency_key="r", is_reply=True)
    assert p.build_payload(reply)["type"] == "text"


@pytest.mark.parametrize("status,code,transient,suppress", [
    (400, 131026, False, False),   # undeliverable
    (400, 132001, False, False),   # template does not exist
    (429, 130429, True, False),    # throughput limit
    (500, 1, True, False),
    (400, 131050, False, True),    # user stopped business messages
])
def test_meta_error_classification(tmp_path, monkeypatch, status, code, transient, suppress):
    body = {"error": {"code": code, "message": "err", "error_data": {"details": "detail"}}}
    monkeypatch.setattr(wa_mod, "http_request", Recorder(HttpResponse(status, json.dumps(body))))
    result = wa_mod.MetaCloudWhatsAppProvider(meta_config(tmp_path)).send(MSG)
    assert not result.accepted and result.transient is transient and result.suppress_recipient is suppress
    assert result.error_code == f"meta_{code}"


def test_timeouts_are_ambiguous_but_connection_failures_are_retryable(tmp_path, monkeypatch):
    p = wa_mod.MetaCloudWhatsAppProvider(meta_config(tmp_path))
    monkeypatch.setattr(wa_mod, "http_request", Recorder(raises=TransportError("timeout", ambiguous=True)))
    r = p.send(MSG)
    assert r.error_code == "ambiguous_timeout" and not r.transient
    monkeypatch.setattr(wa_mod, "http_request", Recorder(raises=TransportError("ConnectionRefusedError", ambiguous=False)))
    r = p.send(MSG)
    assert r.error_code == "network_error" and r.transient


def test_meta_missing_configuration_is_reported_without_secrets(tmp_path):
    p = wa_mod.MetaCloudWhatsAppProvider(make_config(tmp_path, whatsapp_access_token="secret-token-value"))
    problem = p.configuration_problem()
    assert "WHATSAPP_PHONE_NUMBER_ID" in problem and "secret-token-value" not in problem


def test_twilio_request_and_stop_suppression(tmp_path, monkeypatch):
    cfg = make_config(tmp_path, twilio_account_sid="AC123", twilio_auth_token="tok", twilio_from_number="+15550001111",
                      twilio_status_callback_url="https://api.example/api/webhooks/sms")
    rec = Recorder(HttpResponse(201, json.dumps({"sid": "SM1", "status": "queued"})))
    monkeypatch.setattr(sms_mod, "http_request", rec)
    sms = OutboundMessage(channel="sms", recipient="+919876543210", text="Reminder", idempotency_key="k")
    assert sms_mod.TwilioSmsProvider(cfg).send(sms).provider_message_id == "SM1"
    form = parse_qs(rec.calls[0]["data"].decode())
    assert form["To"] == ["+919876543210"] and form["From"] == ["+15550001111"]
    assert form["StatusCallback"] == ["https://api.example/api/webhooks/sms"]
    monkeypatch.setattr(sms_mod, "http_request", Recorder(HttpResponse(400, json.dumps({"code": 21610, "message": "STOP"}))))
    r = sms_mod.TwilioSmsProvider(cfg).send(sms)
    assert r.suppress_recipient and not r.transient


def test_msg91_sends_dlt_template_variables(tmp_path, monkeypatch):
    cfg = make_config(tmp_path, msg91_auth_key="key", msg91_flow_id="flow-1")
    rec = Recorder(HttpResponse(200, json.dumps({"type": "success", "message": "req-1"})))
    monkeypatch.setattr(sms_mod, "http_request", rec)
    r = sms_mod.Msg91SmsProvider(cfg).send(MSG)
    assert r.accepted and r.provider_message_id == "req-1"
    recipient = json.loads(rec.calls[0]["data"])["recipients"][0]
    assert recipient == {"mobiles": "919876543210", "name": "Rahul", "amount": "₹8,500.00",
                         "due_date": "11 Oct 2026", "loan_id": "LN-1"}


def test_smtp_message_has_text_html_and_stable_message_id(tmp_path):
    cfg = make_config(tmp_path, email_from_address="reminders@repayx.example", smtp_host="smtp.example")
    msg = email_mod.SmtpEmailProvider(cfg).build(OutboundMessage(
        channel="email", recipient="a@example.com", text="Plain", html="<p>Rich</p>", subject="EMI",
        idempotency_key="job-1:email"))
    assert msg["Message-ID"].endswith("@repayx.example>") and "job-1.email" in msg["Message-ID"]
    assert {p.get_content_type() for p in msg.iter_parts()} == {"text/plain", "text/html"}


def test_mailgun_request(tmp_path, monkeypatch):
    cfg = make_config(tmp_path, email_from_address="r@mg.example", mailgun_api_key="key-1", mailgun_domain="mg.example")
    rec = Recorder(HttpResponse(200, json.dumps({"id": "<20261010.1@mg.example>", "message": "Queued"})))
    monkeypatch.setattr(email_mod, "http_request", rec)
    r = email_mod.MailgunEmailProvider(cfg).send(OutboundMessage(
        channel="email", recipient="a@example.com", text="t", idempotency_key="k"))
    assert r.provider_message_id == "20261010.1@mg.example"
    assert rec.calls[0]["url"] == "https://api.mailgun.net/v3/mg.example/messages"


def test_registry_sandbox_and_unconfigured(tmp_path):
    sandbox = build_providers(make_config(tmp_path, mode="sandbox"))
    assert all(isinstance(p, SandboxProvider) for p in sandbox.values())
    live = build_providers(make_config(tmp_path, whatsapp_provider="none", sms_provider="carrier-pigeon"))
    assert "WHATSAPP_PROVIDER is not set" in live["whatsapp"].configuration_problem()
    assert "Unknown sms provider" in live["sms"].configuration_problem()


@pytest.mark.parametrize("text,intent", [
    ("STOP", "OPT_OUT"),
    ("please don't message me again", "OPT_OUT"),
    ("I have paid", "PAID_CLAIM"),
    ("payment kar diya", "PAID_CLAIM"),
    ("I will pay tomorrow", "PROMISE_TO_PAY"),
    ("kal tak de dunga", "PROMISE_TO_PAY"),
    ("I need more time", "MORE_TIME"),
    ("lost my job, cannot afford", "HARDSHIP"),
    ("Please share payment details", "PAYMENT_DETAILS"),
    ("how much is due?", "BALANCE"),
    ("this is fraud, not my loan", "DISPUTE"),
    ("ok", "OTHER"),
])
def test_intents(text, intent):
    assert classify(text) == intent


def test_promise_dates():
    today = date(2026, 10, 10)  # Saturday
    assert extract_promise_date("will pay tomorrow", today) == date(2026, 10, 11)
    assert extract_promise_date("pay on Monday", today) == date(2026, 10, 12)
    assert extract_promise_date("pay on 15th", today) == date(2026, 10, 15)
    assert extract_promise_date("pay on 5th", today) == date(2026, 11, 5)
    assert extract_promise_date("by 20/10", today) == date(2026, 10, 20)
    assert extract_promise_date("on 3 Nov", today) == date(2026, 11, 3)
    assert extract_promise_date("soon", today) is None
