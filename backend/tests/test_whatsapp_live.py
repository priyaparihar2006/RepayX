"""Live transport contract tests. No test contacts WhatsApp or sends a message."""
import sqlite3
from unittest.mock import Mock

import pytest

from api.errors import APIError
from services.whatsapp_service import WhatsAppService, WhatsAppSettings, EXPECTED_SENDER


@pytest.fixture
def live(tmp_path):
    service = WhatsAppService(WhatsAppSettings(db_path=tmp_path / "outbox.sqlite3"))
    service._bridge = Mock()
    return service


def connected(phone=EXPECTED_SENDER):
    return {"connected": True, "session_info": {"phone_number": phone}}


def send(live, **changes):
    return live.send(**{"recipient": "+917060200849", "message_text": "Demo EMI notice", "request_id": "demo-1", **changes})


def test_qr_comes_from_transport_and_fake_pairing_is_disabled(live):
    live._bridge.return_value = {"qr_code": "data:image/png;base64,live", "status": "SCAN_QR_CODE"}
    assert live.generate_qr()["qr_code"].endswith("live")
    live._bridge.assert_called_once_with("qr/generate", {})
    with pytest.raises(APIError, match="Simulated pairing"):
        live.pair_device()


@pytest.mark.parametrize("state", [{"connected": False}, connected("+919999999999")])
def test_send_requires_connected_expected_sender(live, state):
    live._bridge.return_value = state
    with pytest.raises(APIError):
        send(live)
    assert all(call.args[0] != "send" for call in live._bridge.call_args_list)
    assert live.history()["messages"] == []


def test_unconfigured_recipient_is_never_sent(live):
    with pytest.raises(APIError, match="Nancy, Sid, and Ajay"):
        send(live, recipient="+919999999999")
    live._bridge.assert_not_called()


def test_success_is_sent_not_delivered_and_retry_does_not_resend(live):
    live._bridge.side_effect = [connected(), {"status": "sent", "message_id": "REAL-PROVIDER-ID"}]
    first = send(live)
    second = send(live)
    assert first["status"] == second["status"] == "sent"
    assert first["message_id"] == second["message_id"] == "REAL-PROVIDER-ID"
    assert second["duplicate"]
    assert live._bridge.call_count == 2
    with pytest.raises(APIError, match="another message"):
        send(live, message_text="Changed notice")


def test_timeout_stays_unknown_and_is_not_retried(live):
    live._bridge.side_effect = [connected(), APIError(503, "timeout", "Transport timeout")]
    with pytest.raises(APIError):
        send(live)
    assert live.history()["messages"][0]["status"] == "unknown"
    assert send(live)["status"] == "unknown"
    assert live._bridge.call_count == 2


def test_legacy_records_are_labelled_simulated(live):
    with sqlite3.connect(live.settings.db_path) as conn:
        conn.execute("""INSERT INTO outbox (request_id, fingerprint, recipient, template, preview,
                     created_at, status) VALUES ('old', 'fake', 'demo', 'demo', 'test', '2026-01-01', 'delivered')""")
    assert live.history()["messages"][0]["status"] == "simulated"
    live._bridge.return_value = {"connected": False}
    assert live.configuration()["stats"]["total_sent"] == 0


def test_contact_names_and_sample_data(live):
    contacts = live.contacts()
    assert [c["name"] for c in contacts] == ["Nancy", "Sid", "Ajay"]
    assert len({c["customer_id"] for c in contacts}) == 3
    for contact in contacts:
        assert f"Dear {contact['name']}" in contact["message"]
        assert contact["sample_data"] is True
        assert "₹" in contact["message"]


def test_api_routes_use_live_service(client, live):
    client.app.state.whatsapp = live
    live._bridge.return_value = {"connected": False, "status": "SCAN_QR_CODE", "qr_code": "live-qr"}
    assert client.get("/api/whatsapp/status").json()["qr_code"] == "live-qr"
    assert client.post("/api/whatsapp/qr/pair", json={}).status_code == 410
    assert client.post("/api/whatsapp/auto-dispatch", json={}).status_code == 410
    assert client.post("/api/whatsapp/send", json={"recipient": "+917060200849", "message": "demo"}).status_code == 409
