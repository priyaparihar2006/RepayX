"""Data models, DTOs, and SQLite schema for RepayX Omnichannel Platform."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal


ChannelType = Literal["WhatsApp", "Email", "SMS"]
MessageDirection = Literal["inbound", "outbound"]
MessageStatus = Literal["sent", "delivered", "read", "received", "failed"]
ConversationStatus = Literal["active", "paused", "closed", "escalated"]

AIIntentType = Literal[
    "BALANCE_INQUIRY",
    "PAYMENT_LINK",
    "PAYMENT_DELAY",
    "PAYMENT_PROMISE",
    "DISCOUNT_CONCESSION",
    "FINANCIAL_HARDSHIP",
    "DISPUTE_OR_COMPLAINT",
    "OPT_OUT",
    "GREETING",
    "GENERAL_QUERY",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ChannelSendResult:
    success: bool
    channel: ChannelType
    recipient: str
    provider_message_id: str
    status: MessageStatus
    error: str | None = None
    character_count: int = 0
    segments: int = 1
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class InboundMessageDTO:
    channel: ChannelType
    sender: str
    recipient: str
    content: str
    subject: str | None = None
    provider_message_id: str | None = None
    thread_id: str | None = None
    raw_payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class CustomerProfileDTO:
    customer_id: str
    name: str
    phone: str
    email: str | None = None
    loan_id: str = "LN1001"
    total_loan_amount: float = 0.0
    emi_paid_amount: float = 0.0
    emi_left_to_repay: float = 0.0
    monthly_emi: float = 0.0
    days_past_due: int = 0
    risk_tier: str = "Medium Risk"
    risk_score: float = 50.0
    payment_link: str = ""
    is_opted_out: dict[str, bool] = field(default_factory=dict)


@dataclass
class AIAnalysisResult:
    detected_intent: AIIntentType
    confidence: float
    reason: str
    payment_promise: bool
    promised_timeline: str | None
    recommended_action: str
    suggested_reply: str
    trigger_human_handoff: bool = False
    handoff_reason: str | None = None
    is_opt_out: bool = False


# SQL statements for SQLite tables in backend/data/whatsapp.sqlite3
CREATE_OMNICHANNEL_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    loan_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'WhatsApp',
    status TEXT NOT NULL DEFAULT 'active',
    ai_enabled INTEGER NOT NULL DEFAULT 1,
    human_handoff INTEGER NOT NULL DEFAULT 0,
    handoff_reason TEXT,
    last_message_text TEXT,
    last_message_at TEXT NOT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    detected_intent TEXT DEFAULT 'GENERAL_QUERY',
    payment_promise INTEGER DEFAULT 0,
    promised_timeline TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS omnichannel_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    error TEXT,
    intent TEXT,
    ai_generated INTEGER DEFAULT 0,
    thread_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS customer_channel_identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    identifier TEXT NOT NULL,
    verified INTEGER DEFAULT 1,
    is_primary INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(customer_id, channel, identifier)
);

CREATE TABLE IF NOT EXISTS channel_opt_outs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    channel TEXT NOT NULL,
    identifier TEXT NOT NULL,
    opted_out_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    UNIQUE(channel, identifier)
);

CREATE INDEX IF NOT EXISTS idx_conv_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conv_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_conv_id ON omnichannel_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ident_identifier ON customer_channel_identities(identifier);
CREATE INDEX IF NOT EXISTS idx_optouts_chan_ident ON channel_opt_outs(channel, identifier);
"""
