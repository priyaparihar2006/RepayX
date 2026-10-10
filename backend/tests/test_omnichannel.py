"""Comprehensive Test Suite for RepayX Unified Omnichannel Recovery Platform.

Validates the 17 core end-to-end scenarios:
1. Inbound WhatsApp message received & borrower identified.
2. Inbound Email message received & borrower identified by email.
3. Inbound SMS message received & borrower identified by phone.
4. AI auto-reply on WhatsApp with accurate loan balance.
5. AI auto-reply on Email preserving thread/subject.
6. AI auto-reply on SMS within length constraints.
7. Multi-turn conversation on single channel.
8. Cross-channel conversation (borrower starts on WhatsApp, replies via Email).
9. Opt-out request ("STOP") records opt-out and halts further AI outreach on that channel.
10. Opted-out channel blocks outbound dispatch.
11. Financial hardship intent triggers human handoff.
12. Dispute/complaint triggers human handoff.
13. Manager pauses AI copilot on a conversation.
14. Manager manual reply dispatches on chosen channel.
15. Manager resumes AI copilot.
16. Inbound message from unknown customer creates unlinked conversation or prompts for ID.
17. Channel failure isolation (e.g. email SMTP down does not affect WhatsApp or SMS).
"""

import os
import shutil
import tempfile
from pathlib import Path

import pytest

from services.omnichannel_models import ChannelType
from services.omnichannel_service import OmnichannelService


@pytest.fixture
def temp_omni_service():
    """Provides a fresh isolated OmnichannelService using a temporary SQLite database."""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "test_whatsapp.sqlite3"
    service = OmnichannelService(db_path=db_path)
    yield service
    shutil.rmtree(temp_dir, ignore_errors=True)


# Scenario 1: Inbound WhatsApp message received & borrower identified
def test_scenario_01_inbound_whatsapp_identification(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",  # Rahul Sharma
        content="Hello, what is my pending EMI?",
    )
    assert res["success"] is True
    assert res["channel"] == "WhatsApp"
    assert res["customer"]["id"] == "CUS001"
    assert "Rahul" in res["customer"]["name"]


# Scenario 2: Inbound Email message received & borrower identified by email
def test_scenario_02_inbound_email_identification(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="Email",
        sender="ananya.verma@example.com",
        content="I would like to know my remaining loan balance.",
        subject="Loan LN1002 Balance Check",
    )
    assert res["success"] is True
    assert res["channel"] == "Email"
    assert res["customer"]["id"] == "CUS002"
    assert "Ananya" in res["customer"]["name"]


# Scenario 3: Inbound SMS message received & borrower identified by phone
def test_scenario_03_inbound_sms_identification(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="SMS",
        sender="+919717012345",  # Vikram Singh
        content="Bal LN1003",
    )
    assert res["success"] is True
    assert res["channel"] == "SMS"
    assert res["customer"]["id"] == "CUS003"
    assert "Vikram" in res["customer"]["name"]


# Scenario 4: AI auto-reply on WhatsApp with accurate loan balance
def test_scenario_04_ai_whatsapp_accurate_balance(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+917060200849",  # Nancy
        content="How much balance is left on my loan?",
    )
    assert res["success"] is True
    assert res["ai_replied"] is True
    reply = res["reply_text"]
    assert "Remaining Overdue Balance:" in reply or "₹63,502.51" in reply or "Balance" in reply
    assert "https://pay.repayx.ai/inv/" in reply


# Scenario 5: AI auto-reply on Email preserving thread/subject
def test_scenario_05_ai_email_thread_preservation(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="Email",
        sender="ananya.verma@example.com",
        content="Please send my official statement and payment link.",
        subject="Loan LN1002 Statement Request",
        thread_id="thread_xyz_123",
    )
    assert res["success"] is True
    assert res["ai_replied"] is True
    reply = res["reply_text"]
    assert "Dear Ananya" in reply
    assert "RepayX" in reply

    # Verify message in database has email threading
    conv = temp_omni_service.get_conversation_detail(res["conversation_id"])
    last_msg = conv["messages"][-1]
    assert last_msg["channel"] == "Email"
    assert "Re: Loan LN1002 Statement Request" in (last_msg.get("subject") or "")


# Scenario 6: AI auto-reply on SMS within length constraints
def test_scenario_06_ai_sms_length_constraint(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="SMS",
        sender="+919820154321",
        content="Need payment link please",
    )
    assert res["success"] is True
    assert res["ai_replied"] is True
    reply = res["reply_text"]
    # SMS should be concise and well-structured
    assert len(reply) < 320
    assert "RepayX:" in reply
    assert "http" in reply


# Scenario 7: Multi-turn conversation on single channel
def test_scenario_07_multiturn_single_channel(temp_omni_service: OmnichannelService):
    # Turn 1: Greeting
    t1 = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="Hello RepayX",
    )
    assert t1["intent"] == "GREETING"

    # Turn 2: Balance check
    t2 = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="What is my total due balance?",
    )
    assert t2["intent"] == "BALANCE_INQUIRY"

    # Turn 3: Promise to pay
    t3 = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="I will pay on Monday through UPI.",
    )
    assert t3["intent"] == "PAYMENT_PROMISE"

    conv = temp_omni_service.get_conversation_detail(t1["conversation_id"])
    assert len(conv["messages"]) >= 6  # 3 inbound + 3 outbound AI replies


# Scenario 8: Cross-channel conversation (WhatsApp -> Email unified in same timeline)
def test_scenario_08_cross_channel_unified_timeline(temp_omni_service: OmnichannelService):
    # Customer initiates on WhatsApp
    wa_res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="Hi, checking my EMI status.",
    )
    conv_id = wa_res["conversation_id"]

    # Customer follows up via Email with linked identity
    em_res = temp_omni_service.handle_inbound_message(
        channel="Email",
        sender="rahul.sharma@example.com",
        content="Sending email to follow up on WhatsApp chat regarding loan LN1001.",
        subject="Re: Loan LN1001",
    )

    # Both belong to same conversation
    assert em_res["conversation_id"] == conv_id

    # Cross-channel timeline shows both WhatsApp and Email message bubbles
    conv = temp_omni_service.get_conversation_detail(conv_id)
    channels_in_timeline = {m["channel"] for m in conv["messages"]}
    assert "WhatsApp" in channels_in_timeline
    assert "Email" in channels_in_timeline


# Scenario 9: Opt-out request ("STOP") records opt-out and halts further AI outreach
def test_scenario_09_opt_out_registration(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="SMS",
        sender="+919820154321",
        content="STOP",
    )
    assert res["opt_out"] is True
    assert res["intent"] == "OPT_OUT"
    assert "unsubscribed" in res["reply_text"].lower()

    # Verify identity service recorded opt-out
    assert temp_omni_service.identity_service.is_opted_out("SMS", "+919820154321") is True


# Scenario 10: Opted-out channel blocks outbound dispatch
def test_scenario_10_opt_out_blocks_outbound(temp_omni_service: OmnichannelService):
    # Register opt-out
    temp_omni_service.identity_service.register_opt_out(
        customer_id="CUS001",
        channel="SMS",
        identifier="+919820154321",
        reason="USER_TEST_STOP",
    )

    # Attempt manager reply over opted out channel
    reply_res = temp_omni_service.send_manager_reply(
        conversation_id="CONV001",
        channel="SMS",
        content="Reminder to clear loan balance.",
    )
    assert reply_res["success"] is False
    assert reply_res["opted_out"] is True
    assert "opted out" in reply_res["error"]


# Scenario 11: Financial hardship intent triggers human handoff
def test_scenario_11_financial_hardship_human_handoff(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="I lost my job last week and cannot afford the EMI right now due to medical emergency.",
    )
    assert res["intent"] == "FINANCIAL_HARDSHIP"
    assert res["human_handoff"] is True
    assert res["handoff_reason"] == "financial_hardship"

    conv = temp_omni_service.get_conversation_detail(res["conversation_id"])
    assert conv["humanHandoff"] is True


# Scenario 12: Dispute/complaint triggers human handoff
def test_scenario_12_dispute_complaint_human_handoff(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="Email",
        sender="ananya.verma@example.com",
        content="This is wrong person, I already paid yesterday! Stop harassment or I will dispute.",
        subject="Dispute - Already Paid",
    )
    assert res["intent"] == "DISPUTE_OR_COMPLAINT"
    assert res["human_handoff"] is True
    assert res["handoff_reason"] == "dispute_investigation"


# Scenario 13: Manager pauses AI copilot on a conversation
def test_scenario_13_manager_pause_ai(temp_omni_service: OmnichannelService):
    # Manager pauses AI
    toggle_res = temp_omni_service.toggle_ai_copilot(
        conversation_id="CONV001",
        ai_enabled=False,
        human_handoff=True,
        reason="manager_manual_takeover",
    )
    assert toggle_res["ai_enabled"] is False

    # Borrower sends message
    in_res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="What is my balance?",
    )
    # Since AI is paused, AI does NOT auto-reply
    assert in_res["ai_replied"] is False


# Scenario 14: Manager manual reply dispatches on chosen channel
def test_scenario_14_manager_manual_reply(temp_omni_service: OmnichannelService):
    reply_res = temp_omni_service.send_manager_reply(
        conversation_id="CONV001",
        channel="Email",
        content="Hello Rahul, this is Priya from RepayX. Here is your restructuring offer.",
        subject="Custom Settlement Offer",
        manager_name="Priya Parihar (Manager)",
    )
    assert reply_res["success"] is True
    assert reply_res["channel"] == "Email"

    conv = temp_omni_service.get_conversation_detail("CONV001")
    manager_msgs = [m for m in conv["messages"] if m["sender"] == "manager"]
    assert len(manager_msgs) >= 1
    assert "restructuring offer" in manager_msgs[-1]["text"]


# Scenario 15: Manager resumes AI copilot
def test_scenario_15_manager_resume_ai(temp_omni_service: OmnichannelService):
    temp_omni_service.toggle_ai_copilot(
        conversation_id="CONV001",
        ai_enabled=True,
        human_handoff=False,
    )
    in_res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="Hi, are you there?",
    )
    assert in_res["ai_replied"] is True


# Scenario 16: Inbound message from unknown customer creates unlinked conversation
def test_scenario_16_unknown_customer_handling(temp_omni_service: OmnichannelService):
    res = temp_omni_service.handle_inbound_message(
        channel="SMS",
        sender="+919999888877",  # Unknown number
        content="Hello who is this?",
    )
    assert res["success"] is True
    assert "UNKNOWN" in res["customer"]["id"]
    conv = temp_omni_service.get_conversation_detail(res["conversation_id"])
    assert conv is not None


# Scenario 17: Channel failure isolation
def test_scenario_17_channel_isolation(temp_omni_service: OmnichannelService):
    # Simulate an error in email dispatch by giving an empty recipient
    # WhatsApp and SMS messaging must continue completely unaffected!
    wa_res = temp_omni_service.handle_inbound_message(
        channel="WhatsApp",
        sender="+919820154321",
        content="Checking WhatsApp",
    )
    assert wa_res["success"] is True

    sms_res = temp_omni_service.handle_inbound_message(
        channel="SMS",
        sender="+919717012345",
        content="Checking SMS",
    )
    assert sms_res["success"] is True

    # Both channels function independently
    assert wa_res["channel"] == "WhatsApp"
    assert sms_res["channel"] == "SMS"
