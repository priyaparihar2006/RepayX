"""RepayX NLP Document & Defaulter Extraction Service.

Supports PDF, Word (.docx), CSV, and JSON files.
Uses NLP entity extraction, regex patterns, table parsing, and date intelligence
to extract borrower details, loan figures, and the exact last date to pay EMI.
"""

from __future__ import annotations

import csv
import io
import json
import re
from datetime import datetime, date
from typing import Any
import dateutil.parser
from pypdf import PdfReader
from docx import Document


class NLPDocumentParser:
    """Intelligent document parser for loan defaulter records across PDF, DOCX, CSV, and JSON."""

    # Regex patterns for entity extraction
    PHONE_REGEX = re.compile(r"(?:\+91[\s-]?)?[6-9]\d{9}\b")
    AMOUNT_REGEX = re.compile(r"(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)")
    DATE_REGEX = re.compile(
        r"\b(?:\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s,]+\d{2,4})?)\b",
        re.IGNORECASE,
    )

    @classmethod
    def parse_file(cls, filename: str, content_bytes: bytes) -> list[dict[str, Any]]:
        """Main entrypoint: parses file content based on extension."""
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        if ext == "json":
            return cls._parse_json(content_bytes)
        elif ext == "csv":
            return cls._parse_csv(content_bytes)
        elif ext in ("docx", "doc"):
            return cls._parse_docx(content_bytes)
        elif ext == "pdf":
            return cls._parse_pdf(content_bytes)
        else:
            # Fallback text parsing
            try:
                text = content_bytes.decode("utf-8", errors="ignore")
                return cls._parse_unstructured_text(text)
            except Exception:
                return []

    @classmethod
    def _parse_json(cls, content_bytes: bytes) -> list[dict[str, Any]]:
        try:
            data = json.loads(content_bytes.decode("utf-8", errors="ignore"))
            if isinstance(data, dict):
                # If wrapped in a key like "defaulters", "users", "borrowers", "records"
                for key in ("defaulters", "users", "borrowers", "data", "records", "customers"):
                    if key in data and isinstance(data[key], list):
                        data = data[key]
                        break
                else:
                    data = [data]

            if not isinstance(data, list):
                return []

            results = []
            for item in data:
                if isinstance(item, dict):
                    parsed = cls._normalize_record(item)
                    if parsed:
                        results.append(parsed)
            return results
        except Exception:
            return []

    @classmethod
    def _parse_csv(cls, content_bytes: bytes) -> list[dict[str, Any]]:
        try:
            text = content_bytes.decode("utf-8-sig", errors="ignore")
            # If CSV contains scheduling columns, use CSVSchedulerService
            if "scheduled_message_time" in text.lower() or "unpaid_amount" in text.lower() or "timezone" in text.lower():
                from services.csv_scheduler_service import CSVSchedulerService
                scheduler = CSVSchedulerService()
                res = scheduler.parse_csv_content(text)
                return res["records"]

            reader = csv.DictReader(io.StringIO(text))
            results = []
            for row in reader:
                parsed = cls._normalize_record(row)
                if parsed:
                    results.append(parsed)
            return results
        except Exception:
            return []

    @classmethod
    def _parse_docx(cls, content_bytes: bytes) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        try:
            doc = Document(io.BytesIO(content_bytes))
            
            # 1. Parse tables in docx
            for table in doc.tables:
                if len(table.rows) > 1:
                    headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
                    for row in table.rows[1:]:
                        row_dict = {}
                        for i, cell in enumerate(row.cells):
                            if i < len(headers):
                                row_dict[headers[i]] = cell.text.strip()
                        parsed = cls._normalize_record(row_dict)
                        if parsed:
                            results.append(parsed)

            # 2. If no table rows found, parse paragraphs with NLP entity recognition
            if not results:
                full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                results = cls._parse_unstructured_text(full_text)

            return results
        except Exception as exc:
            # Fallback to text parsing
            try:
                return cls._parse_unstructured_text(content_bytes.decode("utf-8", errors="ignore"))
            except Exception:
                return []

    @classmethod
    def _parse_pdf(cls, content_bytes: bytes) -> list[dict[str, Any]]:
        try:
            reader = PdfReader(io.BytesIO(content_bytes))
            full_text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    full_text += t + "\n"
            return cls._parse_unstructured_text(full_text)
        except Exception:
            return []

    @classmethod
    def _parse_unstructured_text(cls, text: str) -> list[dict[str, Any]]:
        """NLP Entity & Pattern Extractor for unstructured documents."""
        records: list[dict[str, Any]] = []
        
        # Split by borrower sections or double newlines
        # Detect if text has "Borrower Name:" or "Customer Name:" as block boundaries
        pattern = r"(?=(?:(?:Borrower|Customer|Client|Account|Defaulter)\s*(?:Name)?\s*[:=\-]))"
        if re.search(pattern, text, flags=re.IGNORECASE):
            raw_chunks = re.split(pattern, text, flags=re.IGNORECASE)
        else:
            raw_chunks = re.split(r"(?:\n\s*[-—*#\d]+[\.\)]\s*|\n{2,})", text)
        
        invalid_names = {"statements", "name", "id", "customer", "borrower", "defaulters", "account", "loan", "repayment", "notice"}

        for chunk in raw_chunks:
            chunk_clean = chunk.strip()
            if len(chunk_clean) < 15:
                continue

            record: dict[str, Any] = {}

            # Extract Phone
            phones = cls.PHONE_REGEX.findall(chunk_clean)
            if phones:
                record["phone"] = cls._clean_phone(phones[0])

            # Extract Name
            name_match = re.search(r"(?:Borrower(?:\s+Name)?|Customer(?:\s+Name)?|Client(?:\s+Name)?|Name|Dear|Holder)\s*[:=\-]?\s*([^\n\r,:=#\d]{3,30})", chunk_clean, re.IGNORECASE)
            if name_match:
                candidate_name = name_match.group(1).strip()
                if candidate_name.lower() not in invalid_names and len(candidate_name.split()) <= 4:
                    record["customer_name"] = candidate_name
            else:
                first_line = chunk_clean.split("\n")[0].strip()
                words = re.findall(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", first_line)
                if words and words[0].lower() not in invalid_names and len(words[0]) > 2:
                    record["customer_name"] = words[0]

            # Extract Customer ID
            cid_match = re.search(r"(?:Customer|Account|Borrower|Loan)\s*(?:ID|#|No\.?|Number)\s*[:=\-]?\s*([A-Z0-9_-]+)", chunk_clean, re.IGNORECASE)
            if cid_match:
                record["customer_id"] = cid_match.group(1).strip()

            # Extract Due Date / Last Date to Pay
            date_match = re.search(r"(?:Last\s+Date(?:\s+to\s+Pay(?:\s+EMI)?)?|Due\s+Date|Pay\s+Before|Payment\s+Date|Deadline|EMI\s+Date)\s*[:=\-]?\s*([^\n,]+)", chunk_clean, re.IGNORECASE)
            if date_match:
                raw_date_str = date_match.group(1).strip()
                extracted_dates = cls.DATE_REGEX.findall(raw_date_str)
                if extracted_dates:
                    record["last_date_to_pay"] = extracted_dates[0]
                else:
                    record["last_date_to_pay"] = raw_date_str
            else:
                dates = cls.DATE_REGEX.findall(chunk_clean)
                if dates:
                    record["last_date_to_pay"] = dates[0]

            # Extract Amounts (Loan Taken, EMI Paid, EMI Left)
            loan_match = re.search(r"(?:Total\s+Loan(?:\s+Disbursed)?|Loan\s+Amount|Disbursed|Principal)\s*[:=\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]+)?)", chunk_clean, re.IGNORECASE)
            if loan_match:
                record["total_loan_amount"] = cls._clean_amount(loan_match.group(1))

            paid_match = re.search(r"(?:EMI\s+Paid|Amount\s+Paid|Paid\s+So\s+Far|Cleared|Amount\s+Cleared)\s*[:=\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]+)?)", chunk_clean, re.IGNORECASE)
            if paid_match:
                record["emi_paid_amount"] = cls._clean_amount(paid_match.group(1))

            due_match = re.search(r"(?:EMI\s+Left|Overdue(?:\s+Balance)?|Balance(?:\s+Remaining)?|Remaining|Due\s+Amount|Pending)\s*[:=\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]+)?)", chunk_clean, re.IGNORECASE)
            if due_match:
                record["emi_left_to_repay"] = cls._clean_amount(due_match.group(1))

            if (record.get("phone") or record.get("customer_name")) and (record.get("emi_left_to_repay") or record.get("total_loan_amount")):
                normalized = cls._normalize_record(record)
                if normalized and normalized.get("customer_name", "").lower() not in invalid_names:
                    records.append(normalized)

        return records

    @classmethod
    def _normalize_record(cls, raw: dict[str, Any]) -> dict[str, Any] | None:
        """Fuzzy match dictionary keys, calculate date difference and generate NLP messaging."""
        flat = {str(k).lower().strip().replace(" ", "_").replace("-", "_"): v for k, v in raw.items()}

        def get_field(*keys: str, default: Any = None) -> Any:
            for k in keys:
                if k in flat and flat[k] is not None and str(flat[k]).strip() != "":
                    return flat[k]
            return default

        name = get_field("customer_name", "name", "borrower_name", "borrower", "client", "full_name", default="Customer")
        phone = get_field("phone", "mobile", "phone_number", "contact", "whatsapp_number", "mobile_number", default="")
        cid = get_field("customer_id", "id", "account_id", "loan_id", "borrower_id", default=str(abs(hash(name + phone)) % 900000 + 100000))
        
        total_loan = cls._clean_amount(get_field("total_loan_amount", "total_loan", "loan_amount", "principal", "disbursed_amount", default=0))
        emi_paid = cls._clean_amount(get_field("emi_paid_amount", "emi_paid", "paid_amount", "cleared_amount", default=0))
        emi_left = cls._clean_amount(get_field("emi_left_to_repay", "emi_left", "unpaid_amount", "overdue_amount", "balance_due", "pending_amount", default=0))

        if total_loan > 0 and emi_left == 0 and emi_paid > 0:
            emi_left = max(0.0, total_loan - emi_paid)
        if total_loan > 0 and emi_paid == 0 and emi_left > 0:
            emi_paid = max(0.0, total_loan - emi_left)
        if total_loan == 0 and (emi_paid > 0 or emi_left > 0):
            total_loan = emi_paid + emi_left

        raw_due_date = str(get_field("last_date_to_pay", "due_date", "payment_due_date", "last_date", "expiry_date", "next_due_date", default=""))
        parsed_date_iso, days_diff, date_status = cls._analyze_due_date(raw_due_date)

        clean_p = cls._clean_phone(str(phone))
        if not clean_p and not name:
            return None

        # Build NLP Message Tailored to Due Date
        link = f"https://pay.repayx.ai/inv/{cid}"
        generated_msg = cls._generate_nlp_due_message(
            name=name,
            cid=cid,
            total_loan=total_loan,
            emi_paid=emi_paid,
            emi_left=emi_left,
            last_date=raw_due_date or parsed_date_iso,
            days_diff=days_diff,
            date_status=date_status,
            link=link,
        )

        raw_sched_time = get_field("scheduled_message_time", "schedule_time", "message_time", "time", default=None)
        sched_time = None
        if raw_sched_time is not None:
            raw_sched_str = str(raw_sched_time).strip()
            if raw_sched_str and raw_sched_str.lower() not in ("none", "null", "undefined", "nan", "--", "-"):
                sched_time = raw_sched_str

        raw_tz = get_field("timezone", "tz", default=None)
        tz_str = "Asia/Kolkata"
        if raw_tz is not None:
            raw_tz_clean = str(raw_tz).strip()
            if raw_tz_clean and raw_tz_clean.lower() not in ("none", "null", "undefined", "nan", "--", "-"):
                tz_str = raw_tz_clean

        sched_status = "SCHEDULED" if sched_time else "UNSCHEDULED"

        return {
            "customer_id": int(cid) if str(cid).isdigit() else cid,
            "customer_name": str(name).strip(),
            "phone": clean_p or "+918650629360",
            "phone_number": clean_p or "+918650629360",
            "total_loan_amount": round(float(total_loan), 2),
            "emi_paid_amount": round(float(emi_paid), 2),
            "emi_left_to_repay": round(float(emi_left), 2),
            "unpaid_amount": round(float(emi_left), 2),
            "last_date_to_pay": raw_due_date or parsed_date_iso,
            "parsed_due_date": parsed_date_iso,
            "days_diff": days_diff,
            "urgency_status": date_status,  # "OVERDUE", "DUE_TODAY", "UPCOMING"
            "payment_link": link,
            "scheduled_message_time": sched_time,
            "timezone": tz_str,
            "schedule_status": sched_status,
            "generated_message": generated_msg,
        }

    @classmethod
    def _analyze_due_date(cls, raw_date_str: str) -> tuple[str, int, str]:
        """Calculates days remaining / overdue from the due date string."""
        if not raw_date_str:
            return (datetime.now().strftime("%Y-%m-%d"), -1, "OVERDUE")
        
        try:
            parsed = dateutil.parser.parse(raw_date_str, fuzzy=True)
            today = datetime.now().date()
            due = parsed.date()
            diff = (due - today).days

            if diff < 0:
                status = "OVERDUE"
            elif diff == 0:
                status = "DUE_TODAY"
            else:
                status = "UPCOMING"
            return (due.strftime("%Y-%m-%d"), diff, status)
        except Exception:
            return (raw_date_str, -1, "OVERDUE")

    @classmethod
    def _generate_nlp_due_message(
        cls,
        name: str,
        cid: Any,
        total_loan: float,
        emi_paid: float,
        emi_left: float,
        last_date: str,
        days_diff: int,
        date_status: str,
        link: str,
    ) -> str:
        """Generates dynamic WhatsApp follow-up copy tailored to the last date to pay EMI."""
        if date_status == "OVERDUE":
            late_days = abs(days_diff)
            return (
                f"🚨 *URGENT REPAYMENT NOTICE* 🚨\n\n"
                f"Dear *{name}*, your RepayX Loan Account *#{cid}* is currently *OVERDUE*.\n"
                f"• *Last Date to Pay EMI Was:* {last_date} ({late_days} days past due)\n"
                f"• *Total Loan Taken:* ₹{total_loan:,.2f}\n"
                f"• *EMI Paid So Far:* ₹{emi_paid:,.2f}\n"
                f"• *Remaining Overdue Balance:* ₹{emi_left:,.2f}\n\n"
                f"⚠️ *Immediate Action Required:* Please clear your pending EMI immediately to avoid late penal charges and credit rating reporting.\n"
                f"👉 *Direct Payment Link:* {link}\n\n"
                f"For settlement assistance or payment confirmation, simply reply to this WhatsApp chat."
            )
        elif date_status == "DUE_TODAY":
            return (
                f"⏳ *PAYMENT REMINDER: DUE TODAY* ⏳\n\n"
                f"Dear *{name}*, this is a reminder from RepayX that your scheduled EMI for Loan Account *#{cid}* is *DUE TODAY* ({last_date}).\n\n"
                f"• *Total Loan Amount:* ₹{total_loan:,.2f}\n"
                f"• *Total EMI Paid:* ₹{emi_paid:,.2f}\n"
                f"• *Amount Due Today:* ₹{emi_left:,.2f}\n\n"
                f"To maintain a 100% on-time credit record, please complete your payment before 11:59 PM today.\n"
                f"👉 *Instant Pay Link:* {link}\n\n"
                f"Reply to this chat if you have already transferred the amount."
            )
        else:
            # UPCOMING
            return (
                f"📅 *UPCOMING EMI REMINDER* 📅\n\n"
                f"Dear *{name}*, your next scheduled EMI installment for RepayX Loan *#{cid}* is coming up.\n\n"
                f"• *Last Date to Pay EMI:* {last_date} (In {days_diff} days)\n"
                f"• *Total Loan Taken:* ₹{total_loan:,.2f}\n"
                f"• *EMI Paid So Far:* ₹{emi_paid:,.2f}\n"
                f"• *Remaining Installment Amount:* ₹{emi_left:,.2f}\n\n"
                f"Ensure sufficient balance in your account or pay early using your secure link:\n"
                f"👉 *Early Payment Link:* {link}\n\n"
                f"Thank you for choosing RepayX Intelligence."
            )

    @staticmethod
    def _clean_phone(raw: str) -> str:
        digits = re.sub(r"[^\d]", "", raw)
        if len(digits) == 10:
            return "+91" + digits
        elif len(digits) == 12 and digits.startswith("91"):
            return "+" + digits
        elif len(digits) > 10:
            return "+" + digits
        return ""

    @staticmethod
    def _clean_amount(val: Any) -> float:
        if isinstance(val, (int, float)):
            return float(val)
        if not val:
            return 0.0
        cleaned = re.sub(r"[^\d\.]", "", str(val))
        try:
            return float(cleaned)
        except Exception:
            return 0.0
