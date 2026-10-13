"""Customer Identity Resolution and Channel Opt-Out Registry for RepayX Omnichannel."""

from __future__ import annotations

import csv
import json
import logging
import re
import sqlite3
from pathlib import Path
from typing import Any

from services.omnichannel_adapters import clean_email, clean_phone
from services.omnichannel_models import CustomerProfileDTO, utc_now_iso

logger = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[2]


class CustomerIdentityService:
    """Resolves borrowers across channels and enforces regulatory opt-out policies."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.loan_emi_json = ROOT / "backend/data/users_loan_emi_data.json"
        self.csv_path = ROOT / "backend/data/users_loan_emi_data.csv"
        self.scheduled_csv = ROOT / "repayx_whatsapp_scheduled_test_customers.csv"

    def normalize_identifier(self, channel: str, identifier: str) -> str:
        """Normalizes identifier according to channel type."""
        if channel.lower() == "email":
            return clean_email(identifier)
        return clean_phone(identifier)

    def is_opted_out(self, channel: str, identifier: str) -> bool:
        """Checks if the identifier has opted out of communications on the given channel."""
        norm_id = self.normalize_identifier(channel, identifier)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            row = cursor.execute(
                "SELECT id FROM channel_opt_outs WHERE LOWER(channel) = LOWER(?) AND identifier = ?",
                (channel, norm_id),
            ).fetchone()
            return row is not None

    def register_opt_out(self, customer_id: str | None, channel: str, identifier: str, reason: str = "USER_REQUEST_STOP") -> bool:
        """Registers a customer's channel opt-out."""
        norm_id = self.normalize_identifier(channel, identifier)
        now_ts = utc_now_iso()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO channel_opt_outs (customer_id, channel, identifier, opted_out_at, reason)
                VALUES (?, ?, ?, ?, ?)
                """,
                (customer_id, channel, norm_id, now_ts, reason),
            )
            conn.commit()
        logger.info("Opt-out recorded for %s on channel %s (Reason: %s)", norm_id, channel, reason)
        return True

    def remove_opt_out(self, channel: str, identifier: str) -> bool:
        """Removes opt-out when customer resubscribes (e.g. sends START)."""
        norm_id = self.normalize_identifier(channel, identifier)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "DELETE FROM channel_opt_outs WHERE LOWER(channel) = LOWER(?) AND identifier = ?",
                (channel, norm_id),
            )
            conn.commit()
        logger.info("Opt-out removed for %s on channel %s", norm_id, channel)
        return True

    def record_channel_identity(self, customer_id: str, channel: str, identifier: str, is_primary: bool = True) -> None:
        """Links a channel identifier to a customer profile."""
        norm_id = self.normalize_identifier(channel, identifier)
        now_ts = utc_now_iso()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO customer_channel_identities (customer_id, channel, identifier, verified, is_primary, created_at)
                VALUES (?, ?, ?, 1, ?, ?)
                """,
                (customer_id, channel, norm_id, 1 if is_primary else 0, now_ts),
            )
            conn.commit()

    def get_identities_for_customer(self, customer_id: str) -> list[dict[str, Any]]:
        """Retrieves all channel identities linked to a customer."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT channel, identifier, verified, is_primary FROM customer_channel_identities WHERE customer_id = ?",
                (str(customer_id),),
            ).fetchall()
            return [dict(r) for r in rows]

    def resolve_customer(self, channel: str, identifier: str) -> CustomerProfileDTO:
        """Identifies borrower by phone or email across identities and datasets."""
        norm_id = self.normalize_identifier(channel, identifier)
        is_email = channel.lower() == "email"

        # 1. Check existing customer_channel_identities table
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT customer_id FROM customer_channel_identities WHERE identifier = ?",
                (norm_id,),
            ).fetchone()
            if row:
                cid = row["customer_id"]
                profile = self._lookup_in_datasets(customer_id=cid)
                if profile:
                    return profile

            # Also check direct phone/email in conversations table
            if is_email:
                row_c = conn.execute("SELECT customer_id FROM conversations WHERE LOWER(customer_email) = LOWER(?)", (norm_id,)).fetchone()
            else:
                row_c = conn.execute("SELECT customer_id FROM conversations WHERE customer_phone = ? OR customer_phone LIKE ?", (norm_id, f"%{norm_id[-10:]}")).fetchone()
            if row_c:
                profile = self._lookup_in_datasets(customer_id=row_c["customer_id"])
                if profile:
                    return profile

        # 2. Match in scheduled CSV if present
        if self.scheduled_csv.exists():
            try:
                with open(self.scheduled_csv, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        r_phone = clean_phone(r.get("phone_number", ""))
                        if not is_email and r_phone and (r_phone == norm_id or r_phone.endswith(norm_id[-10:]) or norm_id.endswith(r_phone[-10:])):
                            cid = str(r.get("customer_id") or "CUS_SCHED")
                            unpaid = float(r.get("unpaid_amount") or 50000.0)
                            return CustomerProfileDTO(
                                customer_id=cid,
                                name=r.get("customer_name") or "Valued Customer",
                                phone=r_phone,
                                email=f"{r.get('customer_name', 'borrower').lower().replace(' ', '.')}@repayx.sample",
                                loan_id=r.get("loan_id") or "LN_SCHED",
                                total_loan_amount=unpaid * 1.5,
                                emi_paid_amount=unpaid * 0.5,
                                emi_left_to_repay=unpaid,
                                monthly_emi=unpaid / 4.0,
                                days_past_due=int(r.get("days_past_due") or 15),
                                risk_tier=r.get("risk_category") or "High Risk",
                                payment_link=r.get("payment_link") or f"https://pay.repayx.ai/inv/{cid}",
                            )
            except Exception as exc:
                logger.debug("Error checking scheduled CSV: %s", exc)

        # 3. Match in users_loan_emi_data.json
        if self.loan_emi_json.exists():
            try:
                records = json.loads(self.loan_emi_json.read_text(encoding="utf-8"))
                for r in records:
                    r_phone = clean_phone(str(r.get("phone", "")))
                    r_email = clean_email(f"{r.get('customer_name', '').lower().replace(' ', '')}@example.com")
                    if is_email:
                        if r_email == norm_id:
                            return self._dto_from_record(r, email=r_email)
                    else:
                        if r_phone and (r_phone == norm_id or r_phone.endswith(norm_id[-10:]) or norm_id.endswith(r_phone[-10:])):
                            return self._dto_from_record(r, email=r_email)
            except Exception as exc:
                logger.debug("Error checking JSON dataset: %s", exc)

        # 4. Fallback default borrower profile for unknown sender
        short_id = norm_id[-4:] if len(norm_id) >= 4 else "001"
        return CustomerProfileDTO(
            customer_id=f"UNKNOWN_{short_id}",
            name=f"Borrower ({norm_id})",
            phone=norm_id if not is_email else "+918650629360",
            email=norm_id if is_email else "borrower@example.com",
            loan_id=f"LN{short_id}",
            total_loan_amount=75000.0,
            emi_paid_amount=25000.0,
            emi_left_to_repay=50000.0,
            monthly_emi=12500.0,
            days_past_due=20,
            risk_tier="Medium Risk",
            payment_link=f"https://pay.repayx.ai/inv/{short_id}",
        )

    def _lookup_in_datasets(self, customer_id: str) -> CustomerProfileDTO | None:
        if self.loan_emi_json.exists():
            try:
                records = json.loads(self.loan_emi_json.read_text(encoding="utf-8"))
                for r in records:
                    if str(r.get("customer_id")) == str(customer_id):
                        email = f"{r.get('customer_name', '').lower().replace(' ', '')}@example.com"
                        return self._dto_from_record(r, email=email)
            except Exception:
                pass

        # Check conversations table
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                row = conn.execute(
                    "SELECT * FROM conversations WHERE customer_id = ?",
                    (str(customer_id),),
                ).fetchone()
                if row:
                    return CustomerProfileDTO(
                        customer_id=str(row["customer_id"]),
                        name=row["customer_name"],
                        phone=row["customer_phone"] or "",
                        email=row["customer_email"] or f"{row['customer_name'].lower().replace(' ', '.')}@example.com",
                        loan_id=row["loan_id"],
                        total_loan_amount=75000.0,
                        emi_paid_amount=25000.0,
                        emi_left_to_repay=50000.0,
                        monthly_emi=12500.0,
                        days_past_due=15,
                        risk_tier="Medium Risk",
                        payment_link=f"https://pay.repayx.ai/inv/{row['customer_id']}",
                    )
        except Exception:
            pass

        return None

    def _dto_from_record(self, r: dict[str, Any], email: str | None = None) -> CustomerProfileDTO:
        cid = str(r.get("customer_id") or "385057")
        return CustomerProfileDTO(
            customer_id=cid,
            name=r.get("customer_name") or "Valued Borrower",
            phone=clean_phone(str(r.get("phone", ""))),
            email=email or f"customer_{cid}@repayx.sample",
            loan_id=f"LN_{cid}",
            total_loan_amount=float(r.get("total_loan_amount", 100000.0)),
            emi_paid_amount=float(r.get("emi_paid_amount", 36497.49)),
            emi_left_to_repay=float(r.get("emi_left_to_repay", 63502.51)),
            monthly_emi=float(r.get("monthly_emi", 12000.0)),
            days_past_due=int(r.get("days_past_due", 40)),
            risk_tier=r.get("risk_tier") or "High Risk",
            risk_score=float(r.get("risk_score", 80.0)),
            payment_link=r.get("payment_link") or f"https://pay.repayx.ai/inv/{cid}",
        )
