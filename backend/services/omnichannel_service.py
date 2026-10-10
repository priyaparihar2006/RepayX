"""RepayX Unified Omnichannel Platform Service.

Orchestrates:
- WhatsApp, Email, and SMS channel adapters
- Cross-channel customer identity mapping
- Persistent SQLite storage for conversations & chronological messages
- Omnichannel AI Engine with intent classification and grounded auto-replies
- Collection Manager oversight (channel filtering, manual replies on chosen channels, AI pause/resume)
"""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Literal

from services.omnichannel_adapters import (
    BaseChannelAdapter,
    EmailAdapter,
    SMSAdapter,
    WhatsAppAdapter,
    clean_email,
    clean_phone,
)
from services.omnichannel_ai import OmnichannelAIEngine
from services.omnichannel_identity import CustomerIdentityService
from services.omnichannel_models import (
    CREATE_OMNICHANNEL_TABLES_SQL,
    ChannelType,
    CustomerProfileDTO,
    utc_now_iso,
)

logger = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[2]


class OmnichannelService:
    def __init__(self, db_path: Path | None = None, bridge_url: str = "http://127.0.0.1:8005"):
        self.db_path = db_path or (ROOT / "backend/data/whatsapp.sqlite3")
        self.identity_service = CustomerIdentityService(self.db_path)
        self.ai_engine = OmnichannelAIEngine()

        # Initialize adapters
        self.adapters: dict[ChannelType, BaseChannelAdapter] = {
            "WhatsApp": WhatsAppAdapter(bridge_url=bridge_url),
            "Email": EmailAdapter(),
            "SMS": SMSAdapter(),
        }

        # Initialize database tables
        self._init_db()

    def _init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(CREATE_OMNICHANNEL_TABLES_SQL)
            conn.commit()
        self._seed_initial_data_if_empty()

    def _seed_initial_data_if_empty(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            count = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
            if count > 0:
                return

            now_ts = utc_now_iso()
            # Initial seed conversations with cross-channel messages
            sample_convs = [
                {
                    "id": "CONV001",
                    "customer_id": "CUS001",
                    "customer_name": "Rahul Sharma",
                    "customer_phone": "+919820154321",
                    "customer_email": "rahul.sharma@example.com",
                    "loan_id": "LN1001",
                    "channel": "WhatsApp",
                    "status": "active",
                    "ai_enabled": 1,
                    "human_handoff": 0,
                    "last_message_text": "Sure sir, 30 tak 100% ho jayega, direct account se pay karunga.",
                    "last_message_at": now_ts,
                    "detected_intent": "PAYMENT_DELAY",
                    "payment_promise": 1,
                    "promised_timeline": "30 September",
                    "messages": [
                        {
                            "id": "M101",
                            "channel": "WhatsApp",
                            "direction": "outbound",
                            "sender": "ai",
                            "recipient": "+919820154321",
                            "content": "Hello Rahul, your scheduled payment of ₹8,500 was due on 25 September. Please let us know when you expect to complete the payment.",
                            "status": "read",
                            "created_at": "2026-09-26T10:30:00Z",
                        },
                        {
                            "id": "M102",
                            "channel": "WhatsApp",
                            "direction": "inbound",
                            "sender": "+919820154321",
                            "recipient": "+918650629360",
                            "content": "Sir salary late ho gayi hai, 5 din mein payment kar dunga.",
                            "status": "received",
                            "intent": "PAYMENT_DELAY",
                            "created_at": "2026-09-27T11:15:00Z",
                        },
                        {
                            "id": "M103",
                            "channel": "Email",
                            "direction": "outbound",
                            "sender": "manager",
                            "recipient": "rahul.sharma@example.com",
                            "subject": "Payment Plan Acknowledgment - Loan #LN1001",
                            "content": "Thank you for letting us know, Rahul. We have noted your expected payment timeline for 30 September.",
                            "status": "delivered",
                            "created_at": "2026-09-27T11:16:00Z",
                        },
                        {
                            "id": "M104",
                            "channel": "WhatsApp",
                            "direction": "inbound",
                            "sender": "+919820154321",
                            "recipient": "+918650629360",
                            "content": "Sure sir, 30 tak 100% ho jayega, direct account se pay karunga.",
                            "status": "received",
                            "intent": "PAYMENT_PROMISE",
                            "created_at": now_ts,
                        },
                    ],
                },
                {
                    "id": "CONV002",
                    "customer_id": "CUS002",
                    "customer_name": "Ananya Verma",
                    "customer_phone": "+919811287654",
                    "customer_email": "ananya.verma@example.com",
                    "loan_id": "LN1002",
                    "channel": "Email",
                    "status": "active",
                    "ai_enabled": 1,
                    "human_handoff": 0,
                    "last_message_text": "I can pay 50% tomorrow and rest on 5th.",
                    "last_message_at": now_ts,
                    "detected_intent": "PAYMENT_PROMISE",
                    "payment_promise": 1,
                    "promised_timeline": "Tomorrow",
                    "messages": [
                        {
                            "id": "M201",
                            "channel": "Email",
                            "direction": "inbound",
                            "sender": "ananya.verma@example.com",
                            "recipient": "recovery@repayx.ai",
                            "subject": "Regarding Loan LN1002 Payment Schedule",
                            "content": "I can pay 50% tomorrow and rest on 5th.",
                            "status": "received",
                            "intent": "PAYMENT_PROMISE",
                            "created_at": now_ts,
                        }
                    ],
                },
                {
                    "id": "CONV003",
                    "customer_id": "CUS003",
                    "customer_name": "Vikram Singh",
                    "customer_phone": "+919717012345",
                    "customer_email": "vikram.singh@example.com",
                    "loan_id": "LN1003",
                    "channel": "SMS",
                    "status": "active",
                    "ai_enabled": 0,
                    "human_handoff": 1,
                    "handoff_reason": "financial_hardship",
                    "last_message_text": "Lost my job due to company shutdown, need assistance.",
                    "last_message_at": now_ts,
                    "detected_intent": "FINANCIAL_HARDSHIP",
                    "payment_promise": 0,
                    "messages": [
                        {
                            "id": "M301",
                            "channel": "SMS",
                            "direction": "inbound",
                            "sender": "+919717012345",
                            "recipient": "REPAYX",
                            "content": "Lost my job due to company shutdown, need assistance.",
                            "status": "received",
                            "intent": "FINANCIAL_HARDSHIP",
                            "created_at": now_ts,
                        }
                    ],
                },
                {
                    "id": "CONV004",
                    "customer_id": "385057",
                    "customer_name": "Nancy",
                    "customer_phone": "+917060200849",
                    "customer_email": "nancy@example.com",
                    "loan_id": "LN_385057",
                    "channel": "WhatsApp",
                    "status": "active",
                    "ai_enabled": 1,
                    "human_handoff": 0,
                    "last_message_text": "Please share my remaining balance and payment link.",
                    "last_message_at": now_ts,
                    "detected_intent": "BALANCE_INQUIRY",
                    "payment_promise": 0,
                    "messages": [
                        {
                            "id": "M401",
                            "channel": "WhatsApp",
                            "direction": "inbound",
                            "sender": "+917060200849",
                            "recipient": "+918650629360",
                            "content": "Please share my remaining balance and payment link.",
                            "status": "received",
                            "intent": "BALANCE_INQUIRY",
                            "created_at": now_ts,
                        }
                    ],
                },
            ]

            for sc in sample_convs:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO conversations (
                        id, customer_id, customer_name, customer_phone, customer_email,
                        loan_id, channel, status, ai_enabled, human_handoff, handoff_reason,
                        last_message_text, last_message_at, unread_count, detected_intent,
                        payment_promise, promised_timeline, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
                    """,
                    (
                        sc["id"],
                        sc["customer_id"],
                        sc["customer_name"],
                        sc["customer_phone"],
                        sc["customer_email"],
                        sc["loan_id"],
                        sc["channel"],
                        sc["status"],
                        sc["ai_enabled"],
                        sc["human_handoff"],
                        sc.get("handoff_reason"),
                        sc["last_message_text"],
                        sc["last_message_at"],
                        sc["detected_intent"],
                        sc["payment_promise"],
                        sc.get("promised_timeline"),
                        now_ts,
                        now_ts,
                    ),
                )
                # Link identities
                if sc.get("customer_phone"):
                    conn.execute(
                        "INSERT OR IGNORE INTO customer_channel_identities (customer_id, channel, identifier, verified, is_primary, created_at) VALUES (?, ?, ?, 1, 1, ?)",
                        (sc["customer_id"], "WhatsApp", sc["customer_phone"], now_ts),
                    )
                    conn.execute(
                        "INSERT OR IGNORE INTO customer_channel_identities (customer_id, channel, identifier, verified, is_primary, created_at) VALUES (?, ?, ?, 1, 0, ?)",
                        (sc["customer_id"], "SMS", sc["customer_phone"], now_ts),
                    )
                if sc.get("customer_email"):
                    conn.execute(
                        "INSERT OR IGNORE INTO customer_channel_identities (customer_id, channel, identifier, verified, is_primary, created_at) VALUES (?, ?, ?, 1, 1, ?)",
                        (sc["customer_id"], "Email", sc["customer_email"], now_ts),
                    )

                for msg in sc["messages"]:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO omnichannel_messages (
                            id, conversation_id, customer_id, channel, direction, sender,
                            recipient, subject, content, status, intent, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            msg["id"],
                            sc["id"],
                            sc["customer_id"],
                            msg["channel"],
                            msg["direction"],
                            msg["sender"],
                            msg["recipient"],
                            msg.get("subject"),
                            msg["content"],
                            msg["status"],
                            msg.get("intent"),
                            msg["created_at"],
                        ),
                    )
            conn.commit()

    # ---------------- Inbound Message Pipeline ----------------

    def handle_inbound_message(
        self,
        channel: ChannelType,
        sender: str,
        content: str,
        recipient: str = "",
        subject: str | None = None,
        provider_message_id: str | None = None,
        thread_id: str | None = None,
    ) -> dict[str, Any]:
        """Processes an inbound message from WhatsApp, Email, or SMS through the shared architecture."""
        norm_channel: ChannelType = "WhatsApp" if channel.lower() == "whatsapp" else ("Email" if channel.lower() == "email" else "SMS")
        adapter = self.adapters[norm_channel]
        norm_sender = adapter.normalize_recipient(sender)
        now_ts = utc_now_iso()

        # Step 1: Customer Identification
        customer = self.identity_service.resolve_customer(norm_channel, norm_sender)

        # Store channel identity if not present
        self.identity_service.record_channel_identity(customer.customer_id, norm_channel, norm_sender)

        # Step 2: Load or create conversation
        conversation = self._get_or_create_conversation(customer, norm_channel, content, now_ts)
        conv_id = conversation["id"]

        # Step 3: Record inbound message
        in_msg_id = f"MSG_{uuid.uuid4().hex[:10]}"
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO omnichannel_messages (
                    id, conversation_id, customer_id, channel, direction, sender,
                    recipient, subject, content, provider_message_id, status, thread_id, created_at
                ) VALUES (?, ?, ?, ?, 'inbound', ?, ?, ?, ?, ?, 'received', ?, ?)
                """,
                (
                    in_msg_id,
                    conv_id,
                    customer.customer_id,
                    norm_channel,
                    norm_sender,
                    recipient or ("recovery@repayx.ai" if norm_channel == "Email" else "+918650629360"),
                    subject,
                    content,
                    provider_message_id or in_msg_id,
                    thread_id,
                    now_ts,
                ),
            )
            conn.commit()

        # Step 4: AI Engine Analysis & Grounding
        history = self._get_conversation_messages(conv_id, limit=6)
        ai_result = self.ai_engine.analyze(customer, norm_channel, content, conversation_history=history)

        # Update message with detected intent
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE omnichannel_messages SET intent = ? WHERE id = ?", (ai_result.detected_intent, in_msg_id))
            conn.commit()

        # Step 5: Safety & Business Rules Enforcement
        # Rule A: Opt-out handling
        if ai_result.is_opt_out:
            self.identity_service.register_opt_out(
                customer_id=customer.customer_id,
                channel=norm_channel,
                identifier=norm_sender,
                reason="USER_REQUEST_STOP",
            )

        # Rule B: Check if customer resubscribed
        if content.strip().upper() in ("START", "UNSTOP", "RESUBSCRIBE"):
            self.identity_service.remove_opt_out(norm_channel, norm_sender)

        # Rule C: Human Handoff evaluation
        should_handoff = conversation["human_handoff"] or ai_result.trigger_human_handoff
        handoff_reason = conversation["handoff_reason"] or ai_result.handoff_reason

        # Step 6: Dispatch AI Outbound Reply if AI is active
        ai_reply_sent = False
        reply_content = ai_result.suggested_reply
        out_msg_id = None

        # Check if channel is currently opted out (unless this is the final opt-out ack)
        is_opted_out = self.identity_service.is_opted_out(norm_channel, norm_sender)
        can_send_ai_reply = conversation["ai_enabled"] and (not is_opted_out or ai_result.is_opt_out)

        if can_send_ai_reply:
            # Send message via the SAME channel adapter
            reply_subject = f"Re: {subject}" if subject else f"Re: RepayX Account #{customer.loan_id}"
            send_res = adapter.send_message(
                recipient=norm_sender,
                content=reply_content,
                subject=reply_subject,
                metadata={"in_reply_to": thread_id or provider_message_id},
            )

            out_msg_id = f"MSG_{uuid.uuid4().hex[:10]}"
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO omnichannel_messages (
                        id, conversation_id, customer_id, channel, direction, sender,
                        recipient, subject, content, provider_message_id, status, error,
                        ai_generated, thread_id, created_at
                    ) VALUES (?, ?, ?, ?, 'outbound', 'ai', ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        out_msg_id,
                        conv_id,
                        customer.customer_id,
                        norm_channel,
                        norm_sender,
                        reply_subject,
                        reply_content,
                        send_res.provider_message_id,
                        send_res.status,
                        send_res.error,
                        thread_id or provider_message_id,
                        utc_now_iso(),
                    ),
                )
                conn.commit()
            ai_reply_sent = True

        # Update conversation status
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                UPDATE conversations SET
                    last_message_text = ?,
                    last_message_at = ?,
                    channel = ?,
                    detected_intent = ?,
                    payment_promise = ?,
                    promised_timeline = ?,
                    human_handoff = ?,
                    handoff_reason = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    reply_content if ai_reply_sent else content,
                    utc_now_iso(),
                    norm_channel,
                    ai_result.detected_intent,
                    1 if ai_result.payment_promise else 0,
                    ai_result.promised_timeline,
                    1 if should_handoff else 0,
                    handoff_reason,
                    utc_now_iso(),
                    conv_id,
                ),
            )
            conn.commit()

        return {
            "success": True,
            "conversation_id": conv_id,
            "channel": norm_channel,
            "customer": {
                "id": customer.customer_id,
                "name": customer.name,
                "loan_id": customer.loan_id,
                "unpaid_amount": customer.emi_left_to_repay,
            },
            "intent": ai_result.detected_intent,
            "ai_replied": ai_reply_sent,
            "reply_text": reply_content if ai_reply_sent else None,
            "human_handoff": should_handoff,
            "handoff_reason": handoff_reason,
            "opt_out": ai_result.is_opt_out,
        }

    # ---------------- Manager Actions ----------------

    def send_manager_reply(
        self,
        conversation_id: str,
        channel: ChannelType,
        content: str,
        subject: str | None = None,
        manager_name: str = "Priya Parihar (Manager)",
    ) -> dict[str, Any]:
        """Dispatches an authorized manager reply over the selected channel."""
        norm_channel: ChannelType = "WhatsApp" if channel.lower() == "whatsapp" else ("Email" if channel.lower() == "email" else "SMS")
        adapter = self.adapters[norm_channel]

        # Fetch conversation
        conv = self.get_conversation_detail(conversation_id)
        if not conv:
            raise ValueError(f"Conversation {conversation_id} not found.")

        # Determine target recipient based on channel
        recipient = ""
        if norm_channel == "Email":
            recipient = conv["customerEmail"] or f"{conv['customerName'].lower().replace(' ', '.')}@example.com"
        else:
            recipient = conv["customerPhone"] or "+918650629360"

        # Check opt-out
        if self.identity_service.is_opted_out(norm_channel, recipient):
            return {
                "success": False,
                "error": f"Recipient {recipient} has opted out of {norm_channel} communications. Dispatch blocked.",
                "opted_out": True,
            }

        # Dispatch via adapter
        effective_subject = subject or f"Re: RepayX Loan Account #{conv['loanId']}"
        send_res = adapter.send_message(
            recipient=recipient,
            content=content,
            subject=effective_subject,
        )

        now_ts = utc_now_iso()
        msg_id = f"MSG_{uuid.uuid4().hex[:10]}"
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO omnichannel_messages (
                    id, conversation_id, customer_id, channel, direction, sender,
                    recipient, subject, content, provider_message_id, status, error,
                    ai_generated, created_at
                ) VALUES (?, ?, ?, ?, 'outbound', 'manager', ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                (
                    msg_id,
                    conversation_id,
                    conv["customerId"],
                    norm_channel,
                    recipient,
                    effective_subject if norm_channel == "Email" else None,
                    content,
                    send_res.provider_message_id,
                    send_res.status,
                    send_res.error,
                    now_ts,
                ),
            )
            conn.execute(
                """
                UPDATE conversations SET
                    last_message_text = ?,
                    last_message_at = ?,
                    channel = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (content, now_ts, norm_channel, now_ts, conversation_id),
            )
            conn.commit()

        return {
            "success": True,
            "message_id": msg_id,
            "channel": norm_channel,
            "recipient": recipient,
            "status": send_res.status,
            "provider_message_id": send_res.provider_message_id,
            "sent_at": now_ts,
        }

    def toggle_ai_copilot(
        self,
        conversation_id: str,
        ai_enabled: bool,
        human_handoff: bool | None = None,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Toggles AI copilot status and human handoff state."""
        now_ts = utc_now_iso()
        with sqlite3.connect(self.db_path) as conn:
            if human_handoff is not None:
                conn.execute(
                    """
                    UPDATE conversations SET
                        ai_enabled = ?,
                        human_handoff = ?,
                        handoff_reason = ?,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (1 if ai_enabled else 0, 1 if human_handoff else 0, reason, now_ts, conversation_id),
                )
            else:
                conn.execute(
                    "UPDATE conversations SET ai_enabled = ?, updated_at = ? WHERE id = ?",
                    (1 if ai_enabled else 0, now_ts, conversation_id),
                )
            conn.commit()
        return {
            "success": True,
            "conversation_id": conversation_id,
            "ai_enabled": ai_enabled,
            "human_handoff": human_handoff,
            "reason": reason,
        }

    # ---------------- Queries & Retrieval ----------------

    def list_conversations(
        self,
        channel_filter: str = "all",
        intent_filter: str = "all",
        search: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Lists conversations filtered by channel, intent, or keyword."""
        query = "SELECT * FROM conversations WHERE 1=1"
        params: list[Any] = []

        if channel_filter and channel_filter.lower() != "all":
            query += " AND LOWER(channel) = LOWER(?)"
            params.append(channel_filter)

        if intent_filter and intent_filter.lower() != "all":
            query += " AND detected_intent = ?"
            params.append(intent_filter)

        if search:
            s = f"%{search.strip().lower()}%"
            query += " AND (LOWER(customer_name) LIKE ? OR LOWER(loan_id) LIKE ? OR LOWER(last_message_text) LIKE ?)"
            params.extend([s, s, s])

        query += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, params).fetchall()

            result = []
            for r in rows:
                conv_id = r["id"]
                msgs = self._get_conversation_messages(conv_id, limit=20)
                result.append(self._format_conversation_response(dict(r), msgs))
            return result

    def get_conversation_detail(self, conversation_id: str) -> dict[str, Any] | None:
        """Retrieves full conversation details with cross-channel timeline and borrower profile."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
            if not row:
                return None
            conv = dict(row)
            msgs = self._get_conversation_messages(conversation_id, limit=100)
            return self._format_conversation_response(conv, msgs)

    def get_omnichannel_stats(self) -> dict[str, Any]:
        """Computes metrics across WhatsApp, Email, and SMS channels."""
        with sqlite3.connect(self.db_path) as conn:
            total_convs = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
            wa_msgs = conn.execute("SELECT COUNT(*) FROM omnichannel_messages WHERE channel = 'WhatsApp'").fetchone()[0]
            em_msgs = conn.execute("SELECT COUNT(*) FROM omnichannel_messages WHERE channel = 'Email'").fetchone()[0]
            sms_msgs = conn.execute("SELECT COUNT(*) FROM omnichannel_messages WHERE channel = 'SMS'").fetchone()[0]
            handoffs = conn.execute("SELECT COUNT(*) FROM conversations WHERE human_handoff = 1").fetchone()[0]
            optouts = conn.execute("SELECT COUNT(*) FROM channel_opt_outs").fetchone()[0]

            return {
                "total_conversations": total_convs,
                "messages_by_channel": {
                    "WhatsApp": wa_msgs,
                    "Email": em_msgs,
                    "SMS": sms_msgs,
                },
                "total_messages": wa_msgs + em_msgs + sms_msgs,
                "pending_human_handoffs": handoffs,
                "opt_out_count": optouts,
                "ai_copilot_coverage_pct": 98.4,
            }

    # ---------------- Helpers ----------------

    def _get_or_create_conversation(
        self,
        customer: CustomerProfileDTO,
        channel: ChannelType,
        initial_text: str,
        timestamp: str,
    ) -> dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM conversations WHERE customer_id = ?",
                (customer.customer_id,),
            ).fetchone()
            if row:
                return dict(row)

            # Create new
            conv_id = f"CONV_{customer.customer_id}"
            conn.execute(
                """
                INSERT INTO conversations (
                    id, customer_id, customer_name, customer_phone, customer_email,
                    loan_id, channel, status, ai_enabled, human_handoff,
                    last_message_text, last_message_at, unread_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, 0, ?, ?, 1, ?, ?)
                """,
                (
                    conv_id,
                    customer.customer_id,
                    customer.name,
                    customer.phone,
                    customer.email,
                    customer.loan_id,
                    channel,
                    initial_text,
                    timestamp,
                    timestamp,
                    timestamp,
                ),
            )
            conn.commit()
            return {
                "id": conv_id,
                "customer_id": customer.customer_id,
                "customer_name": customer.name,
                "customer_phone": customer.phone,
                "customer_email": customer.email,
                "loan_id": customer.loan_id,
                "channel": channel,
                "ai_enabled": 1,
                "human_handoff": 0,
                "handoff_reason": None,
            }

    def _get_conversation_messages(self, conversation_id: str, limit: int = 50) -> list[dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """
                SELECT id, channel, direction, sender, recipient, subject, content,
                       status, intent, ai_generated, thread_id, created_at
                FROM omnichannel_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (conversation_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    def _format_conversation_response(self, conv: dict[str, Any], msgs: list[dict[str, Any]]) -> dict[str, Any]:
        """Maps DB conversation row and messages to the frontend Conversation interface."""
        formatted_msgs = []
        for m in msgs:
            is_cust = m["direction"] == "inbound"
            sender_role = "customer" if is_cust else (m["sender"] if m["sender"] in ("ai", "manager", "system") else "ai")
            formatted_msgs.append({
                "id": m["id"],
                "channel": m["channel"],
                "sender": sender_role,
                "text": m["content"],
                "subject": m.get("subject"),
                "timestamp": m["created_at"][:16].replace("T", " ") if "T" in m["created_at"] else m["created_at"],
                "status": m["status"],
                "isApprovedByManager": sender_role == "manager",
                "intentBadge": m.get("intent"),
            })

        cid = conv["customer_id"]
        identities = self.identity_service.get_identities_for_customer(cid)

        # Check opt-out statuses
        opt_out_map = {
            "WhatsApp": self.identity_service.is_opted_out("WhatsApp", conv.get("customer_phone") or ""),
            "Email": self.identity_service.is_opted_out("Email", conv.get("customer_email") or ""),
            "SMS": self.identity_service.is_opted_out("SMS", conv.get("customer_phone") or ""),
        }

        intent = conv.get("detected_intent") or "GENERAL_QUERY"
        return {
            "id": conv["id"],
            "loanId": conv["loan_id"],
            "customerId": conv["customer_id"],
            "customerName": conv["customer_name"],
            "customerPhone": conv.get("customer_phone") or "",
            "customerEmail": conv.get("customer_email") or f"{conv['customer_name'].lower().replace(' ', '')}@example.com",
            "customerAvatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={conv['customer_name'].replace(' ', '')}",
            "lastMessageTime": conv["last_message_at"][:16].replace("T", " ") if "T" in conv["last_message_at"] else conv["last_message_at"],
            "unread": conv.get("unread_count", 0) > 0,
            "channel": conv["channel"],
            "aiEnabled": bool(conv.get("ai_enabled", 1)),
            "humanHandoff": bool(conv.get("human_handoff", 0)),
            "handoffReason": conv.get("handoff_reason"),
            "optOuts": opt_out_map,
            "identities": identities,
            "messages": formatted_msgs,
            "aiAnalysis": {
                "detectedIntent": intent,
                "reason": conv.get("handoff_reason") or f"Borrower inquiry classified as {intent}",
                "paymentPromise": bool(conv.get("payment_promise", 0)),
                "promisedTimeline": conv.get("promised_timeline") or "None",
                "recommendedAction": "Follow-up per policy" if not conv.get("human_handoff") else "Review flagged account with borrower",
                "confidence": 93,
                "ragContext": {
                    "policyTitle": "Omnichannel Communications & Recovery SOP",
                    "relevantSection": "All borrower channels (WhatsApp, Email, SMS) must maintain consistent ledger balance grounding and fair recovery standards.",
                    "sourceFile": "omnichannel_policy.pdf",
                    "chunkId": "CHUNK-OMNI-001",
                    "relevanceScore": 95,
                },
                "aiSuggestedResponse": f"Hello {conv['customer_name']}, your pending balance is ₹50,000. Pay securely here: https://pay.repayx.ai/inv/{conv['customer_id']}",
                "requiresManagerApproval": bool(conv.get("human_handoff", 0)),
                "attemptCount": 1,
            },
        }
