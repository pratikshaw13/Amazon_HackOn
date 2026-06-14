"""
Pydantic models for Marketplace Transactions.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    product_id: str
    transaction_type: str = Field(..., description="buy|sell|donate")
    price: Optional[float] = None
    warehouse_location: Optional[str] = None


class TransactionRecord(BaseModel):
    transaction_id: str
    product_id: str
    buyer_id: Optional[str] = None
    seller_id: Optional[str] = None
    transaction_type: str
    price: float = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    condition_grade: Optional[str] = None
    warehouse_location: Optional[str] = None
    status: str = "completed"


class DonationRequest(BaseModel):
    product_id: str
    recipient_org: Optional[str] = None
    warehouse_location: Optional[str] = None
