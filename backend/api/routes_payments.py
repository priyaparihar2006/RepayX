"""Razorpay Payment Gateway API Endpoints for RepayX."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from services.razorpay_service import razorpay_service

logger = logging.getLogger("repayx.payments")
router = APIRouter(prefix="/api/payments", tags=["payments"])


class CreatePaymentLinkRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID, e.g. 385057 or RX-CUST-1004")
    customer_name: str = Field(..., description="Customer full name")
    loan_id: str = Field(..., description="Loan ID, e.g. LN_385057")
    amount: float = Field(..., gt=0, description="Amount to be paid in INR")
    phone: Optional[str] = Field(None, description="Customer phone number")
    email: Optional[str] = Field(None, description="Customer email address")
    description: Optional[str] = Field(None, description="Payment description")
    force_new: bool = Field(False, description="Whether to bypass reusing an existing active link")


class TestPaymentSimulationRequest(BaseModel):
    loan_id: str
    customer_id: Optional[str] = None
    amount: float
    payment_link_id: Optional[str] = None
    is_partial: bool = False


@router.get("/summary")
def get_payment_summary():
    """Retrieve aggregate payment metrics for the RepayX dashboard."""
    try:
        return {
            "success": True,
            "data": razorpay_service.get_dashboard_summary(),
        }
    except Exception as exc:
        logger.error("Error fetching payment summary: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/transactions")
def get_payment_transactions(
    status: Optional[str] = Query(None, description="Status filter: all, paid, pending, partially_paid, failed"),
    search: Optional[str] = Query(None, description="Search query across customer name, loan ID, or payment ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Retrieve a paginated list of Razorpay payment transactions and links."""
    try:
        records = razorpay_service.list_payment_records(
            status_filter=status,
            search=search,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "count": len(records),
            "data": records,
        }
    except Exception as exc:
        logger.error("Error listing payment records: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/create-link")
def create_payment_link(req: CreatePaymentLinkRequest):
    """Generate or reuse a dynamic Razorpay payment link for an eligible loan."""
    try:
        result = razorpay_service.get_or_create_payment_link(
            customer_id=req.customer_id,
            customer_name=req.customer_name,
            loan_id=req.loan_id,
            amount=req.amount,
            phone=req.phone,
            email=req.email,
            description=req.description,
            force_new=req.force_new,
        )
        return {
            "success": True,
            "data": {
                "payment_link_id": result.payment_link_id,
                "short_url": result.short_url,
                "amount": result.amount,
                "currency": result.currency,
                "status": result.status,
                "customer_id": result.customer_id,
                "loan_id": result.loan_id,
                "is_reused": result.is_reused,
            },
        }
    except Exception as exc:
        logger.error("Error creating payment link: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/simulate-webhook")
def simulate_payment_webhook(req: TestPaymentSimulationRequest):
    """Safely simulate a verified Razorpay payment webhook in TEST MODE.

    Used for testing the end-to-end payment confirmation flow,
    updating outstanding balances and cancelling reminder jobs.
    """
    event_type = "payment_link.partially_paid" if req.is_partial else "payment_link.paid"
    amount_in_paise = int(round(req.amount * 100))
    link_id = req.payment_link_id or f"plink_test_{req.loan_id}"
    payment_id = f"pay_test_{req.loan_id}_{amount_in_paise}"

    payload = {
        "entity": "event",
        "account_id": "acc_repayx_test",
        "event": event_type,
        "contains": ["payment_link", "payment"],
        "payload": {
            "payment_link": {
                "entity": {
                    "id": link_id,
                    "amount": amount_in_paise,
                    "amount_paid": amount_in_paise,
                    "status": "partially_paid" if req.is_partial else "paid",
                    "notes": {
                        "customer_id": req.customer_id or "385057",
                        "loan_id": req.loan_id,
                    },
                }
            },
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": amount_in_paise,
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi",
                    "notes": {
                        "customer_id": req.customer_id or "385057",
                        "loan_id": req.loan_id,
                    },
                }
            },
        },
    }

    result = razorpay_service.process_webhook_payload(payload)
    return {"success": True, "result": result}
