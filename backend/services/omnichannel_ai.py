"""RepayX Omnichannel AI Engine: Intent Classification, Loan Data Grounding, and Safety Rules."""

from __future__ import annotations

import re
from typing import Any

from services.omnichannel_models import (
    AIAnalysisResult,
    AIIntentType,
    ChannelType,
    CustomerProfileDTO,
)


class OmnichannelAIEngine:
    """Evaluates borrower messages across WhatsApp, Email, and SMS with exact loan grounding and safety guardrails."""

    OPT_OUT_PATTERNS = re.compile(
        r"\b(stop|unsubscribe|cancel|opt\s*out|dont\s*message|do\s*not\s*(?:message|contact|call)|cease)\b",
        re.I,
    )
    HARDSHIP_PATTERNS = re.compile(
        r"\b(lost\s*job|job\s*loss|unemployed|medical\s*emergency|hospital(?:ized)?|cannot\s*afford|no\s*money|broke|bankrupt|accident|salary\s*delayed?|critical\s*illness)\b",
        re.I,
    )
    DISPUTE_PATTERNS = re.compile(
        r"\b(wrong\s*person|not\s*my\s*loan|never\s*took|fraud|scam|harass(?:ment)?|police|legal\s*action|already\s*paid|paid\s*yesterday|complaint|dispute)\b",
        re.I,
    )
    BALANCE_PATTERNS = re.compile(
        r"\b(balance|how\s*much|left|remaining|due|pending|outstanding|total\s*due|amount|emi\s*due)\b",
        re.I,
    )
    LINK_PATTERNS = re.compile(
        r"\b(link|pay|payment|upi|qr|bharat\s*qr|how\s*to\s*pay|netbanking|card|where\s*to\s*pay)\b",
        re.I,
    )
    PROMISE_PATTERNS = re.compile(
        r"\b(will\s*pay|pay\s*(?:tomorrow|next\s*week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|on\s*\d+|by\s*\d+|end\s*of\s*month)|salary\s*(?:on|coming))\b",
        re.I,
    )
    CONCESSION_PATTERNS = re.compile(
        r"\b(discount|waiver|concession|settlement|ots|one[\s-]time|reduce|relie[fv])\b",
        re.I,
    )
    GREETING_PATTERNS = re.compile(
        r"\b(hello|hi|hey|good\s*morning|good\s*afternoon|good\s*evening|greetings)\b",
        re.I,
    )

    def analyze(
        self,
        customer: CustomerProfileDTO,
        channel: ChannelType,
        text: str,
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> AIAnalysisResult:
        query = text.strip()

        # 1. DISPUTE / FRAUD / COMPLAINT Check -> Triggers human handoff (highest priority regulatory escalation)
        if self.DISPUTE_PATTERNS.search(query):
            reply = self._format_dispute_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="DISPUTE_OR_COMPLAINT",
                confidence=0.96,
                reason="Borrower disputes loan identity or reports payment discrepancy / harassment",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Freeze recovery notifications and initiate supervisor dispute investigation",
                suggested_reply=reply,
                trigger_human_handoff=True,
                handoff_reason="dispute_investigation",
            )

        # 2. FINANCIAL HARDSHIP Check -> Triggers human handoff
        if self.HARDSHIP_PATTERNS.search(query):
            reply = self._format_hardship_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="FINANCIAL_HARDSHIP",
                confidence=0.95,
                reason="Borrower indicated severe financial hardship / job loss / medical emergency",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Assign to Senior Collections Counselor for loan restructuring or tenure extension",
                suggested_reply=reply,
                trigger_human_handoff=True,
                handoff_reason="financial_hardship",
            )

        # 3. OPT OUT Check
        if self.OPT_OUT_PATTERNS.search(query):
            reply = self._format_opt_out_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="OPT_OUT",
                confidence=0.99,
                reason="Borrower explicitly requested communication opt-out",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Halt automated messaging on channel; record regulatory opt-out",
                suggested_reply=reply,
                is_opt_out=True,
            )

        # 4. PROMISE TO PAY Check (evaluated before generic link/upi patterns)
        if self.PROMISE_PATTERNS.search(query):
            match = self.PROMISE_PATTERNS.search(query)
            timeline = match.group(0) if match else "Expected soon"
            reply = self._format_promise_reply(customer, channel, timeline)
            return AIAnalysisResult(
                detected_intent="PAYMENT_PROMISE",
                confidence=0.92,
                reason="Customer committed to an upcoming repayment date",
                payment_promise=True,
                promised_timeline=timeline.title(),
                recommended_action=f"Schedule automated non-intrusive reminder for {timeline}",
                suggested_reply=reply,
            )

        # 5. BALANCE INQUIRY
        if self.BALANCE_PATTERNS.search(query):
            reply = self._format_balance_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="BALANCE_INQUIRY",
                confidence=0.94,
                reason="Customer inquired regarding loan balance, paid EMI, or outstanding amount",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Provide verified ledger statement with direct payment link",
                suggested_reply=reply,
            )

        # 6. PAYMENT LINK
        if self.LINK_PATTERNS.search(query):
            reply = self._format_link_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="PAYMENT_LINK",
                confidence=0.95,
                reason="Customer requested direct payment options or UPI link",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Deliver secure UPI / Bharat QR payment gateway URL",
                suggested_reply=reply,
            )

        # 7. DISCOUNT / CONCESSION / OTS
        if self.CONCESSION_PATTERNS.search(query):
            reply = self._format_concession_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="DISCOUNT_CONCESSION",
                confidence=0.91,
                reason="Customer requested late fee waiver or One-Time Settlement (OTS)",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Present OTS concession policy with principal clearance link",
                suggested_reply=reply,
            )

        # 8. GREETING
        if self.GREETING_PATTERNS.search(query):
            reply = self._format_greeting_reply(customer, channel)
            return AIAnalysisResult(
                detected_intent="GREETING",
                confidence=0.90,
                reason="General greeting from borrower",
                payment_promise=False,
                promised_timeline=None,
                recommended_action="Greet customer politely and present active loan status",
                suggested_reply=reply,
            )

        # 9. GENERAL QUERY
        reply = self._format_general_reply(customer, channel)
        return AIAnalysisResult(
            detected_intent="GENERAL_QUERY",
            confidence=0.85,
            reason="General inquiry regarding loan repayment",
            payment_promise=False,
            promised_timeline=None,
            recommended_action="Provide standard recovery support response",
            suggested_reply=reply,
        )

    # ---------------- Channel-Specific Response Formatters ----------------

    def _format_balance_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return (
                f"RepayX: Hi {c.name}, Loan #{c.loan_id} bal: Rs.{c.emi_left_to_repay:,.2f} "
                f"({c.days_past_due}d overdue). Total loan: Rs.{c.total_loan_amount:,.2f}. "
                f"Pay now: {c.payment_link}"
            )
        elif channel == "WhatsApp":
            return (
                f"Hello *{c.name}*, here is your verified RepayX Loan summary for Account *#{c.loan_id}*:\n\n"
                f"• *Total Loan Sanctioned:* ₹{c.total_loan_amount:,.2f}\n"
                f"• *Total EMI Paid to Date:* ₹{c.emi_paid_amount:,.2f}\n"
                f"• *Remaining Overdue Balance:* ₹{c.emi_left_to_repay:,.2f}\n"
                f"• *Status:* {c.days_past_due} days past due\n\n"
                f"Pay securely via UPI, QR, or NetBanking: {c.payment_link}\n"
                f"Feel free to reply if you need assistance with payment plans."
            )
        else:  # Email
            return (
                f"Dear {c.name},\n\n"
                f"Thank you for contacting RepayX Loan Support. Below is the current ledger statement for your Loan Account #{c.loan_id}:\n\n"
                f"  - Total Loan Amount: ₹{c.total_loan_amount:,.2f}\n"
                f"  - Total Repaid to Date: ₹{c.emi_paid_amount:,.2f}\n"
                f"  - Current Overdue Balance: ₹{c.emi_left_to_repay:,.2f}\n"
                f"  - Overdue Aging: {c.days_past_due} days past due\n\n"
                f"To maintain a healthy credit bureau score, please clear your outstanding balance using our secure portal:\n"
                f"{c.payment_link}\n\n"
                f"Sincerely,\n"
                f"RepayX Recovery & Settlements Team"
            )

    def _format_link_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return f"RepayX: Hi {c.name}, pay your pending EMI of Rs.{c.emi_left_to_repay:,.2f} for Loan #{c.loan_id} instantly here: {c.payment_link}"
        elif channel == "WhatsApp":
            return (
                f"Hello *{c.name}*, your direct payment gateway link for Loan *#{c.loan_id}* is ready:\n\n"
                f"👉 {c.payment_link}\n\n"
                f"Amount Due: *₹{c.emi_left_to_repay:,.2f}*\n"
                f"Accepted methods: UPI (Google Pay, PhonePe, Paytm), Bharat QR, NetBanking, and Debit Cards. "
                f"Your payment will reflect instantly."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"As requested, here is your official RepayX repayment link for Loan Account #{c.loan_id}:\n\n"
                f"{c.payment_link}\n\n"
                f"Outstanding Balance: ₹{c.emi_left_to_repay:,.2f}\n"
                f"Payment Modes Supported: UPI, Bharat QR, Internet Banking, and Debit Cards.\n\n"
                f"Warm regards,\n"
                f"RepayX Digital Collections"
            )

    def _format_promise_reply(self, c: CustomerProfileDTO, channel: ChannelType, timeline: str) -> str:
        if channel == "SMS":
            return (
                f"RepayX: Hi {c.name}, noted your commitment to pay ({timeline}). "
                f"Loan #{c.loan_id} bal: Rs.{c.emi_left_to_repay:,.2f}. Link: {c.payment_link}"
            )
        elif channel == "WhatsApp":
            return (
                f"Thank you, *{c.name}*. We have registered your repayment commitment (*{timeline}*) "
                f"for Loan *#{c.loan_id}* (Remaining Balance: ₹{c.emi_left_to_repay:,.2f}).\n\n"
                f"We will hold secondary follow-ups until your promised date. You can complete your EMI when ready here: {c.payment_link}"
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"We acknowledge your commitment to settle the pending EMI on your Loan Account #{c.loan_id} ({timeline}).\n"
                f"We have updated your file accordingly and paused routine escalation calls. When you are ready to pay, please visit:\n"
                f"{c.payment_link}\n\n"
                f"Best regards,\n"
                f"RepayX Operations Desk"
            )

    def _format_concession_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return (
                f"RepayX: Hi {c.name}, special 100% late fee waiver available on Loan #{c.loan_id}. "
                f"Pay principal Rs.{c.emi_left_to_repay:,.2f} today: {c.payment_link}"
            )
        elif channel == "WhatsApp":
            return (
                f"Good news *{c.name}*! Under our One-Time Settlement (OTS) program for Loan *#{c.loan_id}*, "
                f"we can waive accumulated late penalties if you clear your overdue principal today:\n\n"
                f"• Amount to Settle: *₹{c.emi_left_to_repay:,.2f}*\n"
                f"• Link: {c.payment_link}\n\n"
                f"Completing this will clear the default flag on your account and update your bureau records."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"Regarding your inquiry on concessions for Loan Account #{c.loan_id}: RepayX offers an approved One-Time Settlement (OTS) relief option. "
                f"If you clear the overdue balance of ₹{c.emi_left_to_repay:,.2f} today, our committee can approve a 100% waiver of accrued late charges.\n\n"
                f"To execute settlement: {c.payment_link}\n\n"
                f"Sincerely,\n"
                f"RepayX Concession & Settlement Committee"
            )

    def _format_hardship_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return (
                f"RepayX: We understand your difficulty, {c.name}. A senior counselor will review Loan #{c.loan_id} "
                f"for restructuring options. Support: support@repayx.ai"
            )
        elif channel == "WhatsApp":
            return (
                f"Dear *{c.name}*, we sincerely understand and empathize with your current financial difficulty regarding Loan *#{c.loan_id}*.\n\n"
                f"RepayX has dedicated relief programs, including tenure extensions and customized EMI restructuring. "
                f"I have flagged your account for priority review by our Senior Resolution Counselor, Priya Parihar, who will reach out shortly with flexible options."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"We have received your message regarding financial hardship on Loan Account #{c.loan_id}. We recognize that unexpected life challenges occur, and our goal is to support you.\n\n"
                f"Your account has been forwarded to our Senior Hardship Committee for an evaluation of tenure extension or restructured installments under RBI guidelines. A dedicated counselor will contact you within 24 hours.\n\n"
                f"Sincerely,\n"
                f"RepayX Borrower Care Team"
            )

    def _format_dispute_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return (
                f"RepayX Notice: We have logged your dispute for Loan #{c.loan_id}. "
                f"Recovery calls are paused pending ledger verification. Ref: DISP-{c.loan_id}"
            )
        elif channel == "WhatsApp":
            return (
                f"Dear *{c.name}*, we take your report very seriously. We have logged a formal dispute ticket (*DISP-{c.loan_id}*) for your Loan Account.\n\n"
                f"All automated recovery actions on this account are immediately placed on hold while our supervisor reviews payments and ledger verification. "
                f"If you have already paid, please share the transaction reference number."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"Thank you for contacting RepayX Compliance. We have initiated a formal dispute verification under Case Reference DISP-{c.loan_id} for Loan Account #{c.loan_id}.\n\n"
                f"All outbound collection communications for this account are placed on hold. A compliance supervisor will verify payment records and audit our ledger.\n\n"
                f"Respectfully,\n"
                f"RepayX Compliance & Quality Assurance"
            )

    def _format_opt_out_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return f"RepayX: You have been unsubscribed from SMS alerts for Loan #{c.loan_id}. Reply START to resume."
        elif channel == "WhatsApp":
            return (
                f"You have been successfully unsubscribed from RepayX WhatsApp alerts. "
                f"We will not send automated WhatsApp notifications to this number. To resume updates at any time, reply *START*."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"You have been successfully unsubscribed from RepayX email recovery alerts regarding Loan #{c.loan_id}.\n\n"
                f"If you ever wish to opt back in, reply START to this email.\n\n"
                f"RepayX Privacy Desk"
            )

    def _format_greeting_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return f"RepayX: Hi {c.name}, your Loan #{c.loan_id} balance is Rs.{c.emi_left_to_repay:,.2f}. Pay: {c.payment_link}. Reply for help."
        elif channel == "WhatsApp":
            return (
                f"Hello *{c.name}*! 👋 I am your RepayX AI Recovery Assistant. "
                f"Regarding your active Loan Account *#{c.loan_id}*, you have an overdue balance of *₹{c.emi_left_to_repay:,.2f}*.\n\n"
                f"How may I assist you today? You can ask about your balance, request a payment link, or explore settlement waivers: {c.payment_link}"
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"Thank you for reaching out to RepayX. Your active Loan Account #{c.loan_id} has a pending balance of ₹{c.emi_left_to_repay:,.2f}.\n\n"
                f"Our AI recovery portal is available 24/7 to assist with statements, settlement options, and instant payment clearance: {c.payment_link}\n\n"
                f"Best regards,\n"
                f"RepayX AI Assistant"
            )

    def _format_general_reply(self, c: CustomerProfileDTO, channel: ChannelType) -> str:
        if channel == "SMS":
            return f"RepayX: Hi {c.name}, your Loan #{c.loan_id} balance is Rs.{c.emi_left_to_repay:,.2f}. Pay: {c.payment_link}. Support: support@repayx.ai"
        elif channel == "WhatsApp":
            return (
                f"Thank you for reaching out, *{c.name}*. Regarding your Loan *#{c.loan_id}* "
                f"(Overdue Balance: *₹{c.emi_left_to_repay:,.2f}*):\n\n"
                f"Our recovery team has logged your message. To prevent negative credit score reporting, "
                f"please settle your EMI here: {c.payment_link}\n"
                f"You may also reply directly with your query."
            )
        else:
            return (
                f"Dear {c.name},\n\n"
                f"Thank you for writing to RepayX. Regarding Loan Account #{c.loan_id} (Balance: ₹{c.emi_left_to_repay:,.2f}):\n\n"
                f"Our system has logged your communication. Please clear pending installments at: {c.payment_link} to keep your account in good standing.\n\n"
                f"Sincerely,\n"
                f"RepayX Customer Support"
            )
