"""No real provider requests: synthetic contacts and signed fixture events only."""
import hashlib
import hmac
import json
from datetime import datetime
from uuid import uuid4
from unittest.mock import Mock

import pytest

from api.errors import APIError
from services.whatsapp_service import WhatsAppService, WhatsAppSettings

TODAY = "2026-10-06T04:30:00+00:00"
ADMIN = "+12025550101"
CUSTOMER = "+12025550102"


@pytest.fixture
def messaging(client, tmp_path, monkeypatch):
    settings = WhatsAppSettings(token="fake-provider-token", operator_key="test-key-" * 5,
        app_secret="fake-app-secret", verify_token="test-verify", phone_id="123456",
        business_id="654321", version="v99.0", enabled=True, test_mode=True,
        contacts_file=tmp_path / "contacts.json", db_path=tmp_path / "messages.sqlite3")
    settings.contacts_file.write_text(json.dumps([
        {"name": "Admin", "phone": ADMIN, "role": "admin", "opted_in": True,
         "consent_note": "Authorized synthetic test", "test_recipient": True},
        {"name": "Customer", "phone": CUSTOMER, "role": "defaulter", "opted_in": False},
    ]))
    service = WhatsAppService(settings)
    client.app.state.whatsapp = service
    monkeypatch.setattr("services.whatsapp_service.now", lambda: TODAY)
    monkeypatch.setattr(service, "graph", Mock(return_value={"messages": [{"id": "wamid.test"}]}))
    return service


def headers(messaging):
    return {"Authorization": f"Bearer {messaging.settings.operator_key}"}


def draft(messaging, **changes):
    return {"request_id": str(uuid4()), "recipient": ADMIN, "template": "hello_world",
            "language": "en_US", "parameters": [], "preview": messaging.templates()[0]["body"],
            "confirm_send": True, **changes}


def send(client, messaging, **changes):
    return client.post("/api/whatsapp/messages", headers=headers(messaging), json=draft(messaging, **changes))


def history(client, messaging):
    return client.get("/api/whatsapp/messages", headers=headers(messaging)).json()


def event(client, messaging, value, signature=None):
    body = json.dumps({"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {
        "metadata": {"phone_number_id": messaging.settings.phone_id}, **value}}]}]}).encode()
    signature = signature if signature is not None else "sha256=" + hmac.new(
        messaging.settings.app_secret.encode(), body, hashlib.sha256).hexdigest()
    return client.post("/api/whatsapp/webhook", content=body,
                       headers={"x-hub-signature-256": signature, "Content-Type": "application/json"})


def test_status_and_authentication_do_not_expose_secrets(client, messaging):
    response = client.get("/api/whatsapp/status")
    assert response.json()["server_time"] == TODAY
    assert response.json()["ready"] is True
    for secret in (messaging.settings.token, messaging.settings.operator_key, messaging.settings.app_secret):
        assert secret not in response.text
    for endpoint in ("contacts", "templates", "messages"):
        assert client.get(f"/api/whatsapp/{endpoint}").status_code == 401
    assert client.post("/api/whatsapp/messages", json=draft(messaging)).status_code == 401
    contacts = client.get("/api/whatsapp/contacts", headers=headers(messaging)).json()["contacts"]
    assert [c["role"] for c in contacts] == ["admin", "defaulter"]
    assert contacts[1]["opted_in"] is False
    messaging.graph.assert_not_called()


def test_disabled_configuration_cannot_send(client, messaging):
    messaging.settings.enabled = False
    assert send(client, messaging).status_code == 503
    assert history(client, messaging)["messages"] == []
    messaging.graph.assert_not_called()


@pytest.mark.parametrize("changes,status", [
    ({"recipient": CUSTOMER}, 403), ({"recipient": "+12025550103"}, 403),
    ({"recipient": "123"}, 422), ({"confirm_send": False}, 422),
    ({"template": "arbitrary_message"}, 422), ({"parameters": [" "]}, 422),
    ({"preview": "Different message"}, 409), ({"parameters": ["extra"]}, 422),
])
def test_invalid_or_unauthorized_send_is_blocked(client, messaging, changes, status):
    assert send(client, messaging, **changes).status_code == status
    messaging.graph.assert_not_called()


def test_test_mode_restricts_even_opted_in_non_test_contacts(client, messaging):
    rows = json.loads(messaging.settings.contacts_file.read_text())
    rows[1].update(opted_in=True, consent_note="Fixture consent", test_recipient=False)
    messaging.settings.contacts_file.write_text(json.dumps(rows))
    assert send(client, messaging, recipient=CUSTOMER).status_code == 403
    messaging.graph.assert_not_called()


def test_acceptance_is_persisted_and_request_id_prevents_duplicates(client, messaging):
    body = draft(messaging)
    response = client.post("/api/whatsapp/messages", headers=headers(messaging), json=body)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    messaging.graph.assert_called_once_with("123456/messages", {
        "messaging_product": "whatsapp", "to": ADMIN[1:], "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}}})
    persisted = history(client, messaging)["messages"][0]
    assert persisted["delivery_status"] == "accepted"
    assert persisted["created_at"] == TODAY
    replacement = WhatsAppService(messaging.settings)
    replacement.graph = Mock(side_effect=AssertionError("Must not resend after restart"))
    client.app.state.whatsapp = replacement
    assert client.post("/api/whatsapp/messages", headers=headers(messaging), json=body).status_code == 200
    assert client.post("/api/whatsapp/messages", headers=headers(messaging),
                       json={**body, "recipient": CUSTOMER}).status_code == 409
    replacement.graph.assert_not_called()


@pytest.mark.parametrize("code,status", [("provider_unknown", "unknown"), ("provider_rejected", "failed")])
def test_provider_failure_is_not_retried(client, messaging, code, status):
    messaging.graph.side_effect = APIError(502, code, "Provider error")
    body = draft(messaging)
    assert client.post("/api/whatsapp/messages", headers=headers(messaging), json=body).status_code == 502
    assert history(client, messaging)["messages"][0]["delivery_status"] == status
    response = client.post("/api/whatsapp/messages", headers=headers(messaging), json=body)
    assert response.json()["status"] == status
    messaging.graph.assert_called_once()


def test_webhook_verification_signatures_receipts_and_opt_out(client, messaging):
    assert client.get("/api/whatsapp/webhook", params={"hub.mode": "subscribe",
        "hub.verify_token": "wrong", "hub.challenge": "123"}).status_code == 403
    response = client.get("/api/whatsapp/webhook", params={"hub.mode": "subscribe",
        "hub.verify_token": messaging.settings.verify_token, "hub.challenge": "123"})
    assert response.text == "123"
    assert send(client, messaging).status_code == 200
    timestamp = str(int(datetime.fromisoformat(TODAY).timestamp()))
    receipt = {"id": "wamid.test", "status": "delivered", "timestamp": timestamp}
    assert event(client, messaging, {"statuses": [receipt]}, "sha256=wrong").status_code == 403
    assert history(client, messaging)["messages"][0]["delivery_status"] == "accepted"
    assert event(client, messaging, {"statuses": [receipt], "metadata": {"phone_number_id": "other"}}).status_code == 200
    assert history(client, messaging)["messages"][0]["delivery_status"] == "accepted"
    for status in ("delivered", "read", "sent", "delivered"):
        assert event(client, messaging, {"statuses": [{**receipt, "status": status}]}).status_code == 200
    assert history(client, messaging)["messages"][0]["delivery_status"] == "read"
    reply = {"messages": [{"id": "wamid.reply", "from": ADMIN[1:], "timestamp": timestamp,
                           "text": {"body": "STOP"}}]}
    assert event(client, messaging, reply).status_code == 200
    assert event(client, messaging, reply).status_code == 200
    assert len(history(client, messaging)["incoming"]) == 1
    assert send(client, messaging).status_code == 403
    messaging.graph.assert_called_once()


def test_live_template_parameters_and_preview(client, messaging, monkeypatch):
    messaging.settings.test_mode = False
    template = {"name": "appointment", "language": "en_US", "parameters": 1, "body": "Hello {{1}}"}
    monkeypatch.setattr(messaging, "templates", lambda: [template])
    response = send(client, messaging, template="appointment", parameters=["Test person"], preview="Hello Test person")
    assert response.status_code == 200
    assert messaging.graph.call_args.args[1]["template"]["components"] == [
        {"type": "body", "parameters": [{"type": "text", "text": "Test person"}]}]
