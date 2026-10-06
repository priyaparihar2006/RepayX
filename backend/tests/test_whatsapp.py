"""RepayX WhatsApp Web QR & Automated Defaulter Outreach Test Suite."""
import json
import pytest
from datetime import datetime, timezone
from pathlib import Path

from services.whatsapp_service import WhatsAppService, WhatsAppSettings, now


@pytest.fixture
def whatsapp_svc(tmp_path):
    db_path = tmp_path / "test_whatsapp.sqlite3"
    contacts_path = tmp_path / "contacts.json"
    contacts_path.write_text(json.dumps([
        {"id": "1", "name": "Rajesh Sharma", "phone": "+919876543210", "role": "defaulter", "opted_in": True},
        {"id": "2", "name": "Anita Verma", "phone": "+919812345678", "role": "defaulter", "opted_in": True},
    ]))
    settings = WhatsAppSettings(
        db_path=db_path,
        contacts_file=contacts_path,
        enabled=True,
    )
    return WhatsAppService(settings)


def test_qr_generation(whatsapp_svc):
    qr_data = whatsapp_svc.generate_qr()
    assert "qr_code" in qr_data
    assert qr_data["qr_code"].startswith("data:image/svg+xml;base64,")
    assert qr_data["expires_in"] > 0
    assert qr_data["status"] == "SCAN_QR_CODE"


def test_device_pairing_and_disconnect(whatsapp_svc):
    # Initial status
    status = whatsapp_svc.configuration()
    assert status["connected"] is False

    # Pair device
    session = whatsapp_svc.pair_device(phone_number="+919820154321", user_name="Test Operator", device="Chrome Browser")
    assert session["connected"] is True
    assert session["phone_number"] == "+919820154321"

    # Status check after pairing
    status_after = whatsapp_svc.configuration()
    assert status_after["connected"] is True
    assert status_after["status"] == "CONNECTED"
    assert status_after["session_info"]["user_name"] == "Test Operator"

    # Disconnect
    disc = whatsapp_svc.disconnect()
    assert disc["status"] == "DISCONNECTED"
    assert whatsapp_svc.configuration()["connected"] is False


def test_templates_listing(whatsapp_svc):
    templates = whatsapp_svc.templates()
    assert len(templates) >= 4
    template_ids = [t["id"] for t in templates]
    assert "urgent_settlement" in template_ids
    assert "overdue_notice" in template_ids
    assert "concession_offer" in template_ids


def test_send_single_message(whatsapp_svc):
    whatsapp_svc.pair_device()
    result = whatsapp_svc.send(
        recipient="+919876543210",
        message_text="Hello, this is a test notification.",
        customer_id=101,
        customer_name="Rajesh Sharma",
        template_name="overdue_notice",
    )
    assert result["status"] == "delivered"
    assert result["provider_id"].startswith("wamid.")
    assert result["recipient"] == "+919876543210"

    # Verify history
    history = whatsapp_svc.history()
    assert history["total"] >= 1
    assert any(m["recipient"] == "+919876543210" for m in history["messages"])


def test_auto_dispatch(whatsapp_svc):
    whatsapp_svc.pair_device()
    result = whatsapp_svc.auto_dispatch(
        customer_service=None,
        target_tier="high",
        template_id="urgent_settlement",
        limit=5,
    )
    assert result["total_sent"] > 0
    assert len(result["dispatched"]) > 0
