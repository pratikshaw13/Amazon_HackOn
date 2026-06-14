"""
Pydantic models for Product Verification Engine.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class VerificationResult(BaseModel):
    product_id: str
    amazon_verified: bool = False
    confidence_score: float = 0.0
    verification_reason: str = ""
    order_number: Optional[str] = None
    purchase_date: Optional[str] = None
    original_price: Optional[float] = None
    extracted_product_name: Optional[str] = None
    invoice_type: Optional[str] = None  # "screenshot" | "pdf" | "order_page"


class RoutingRecord(BaseModel):
    product_id: str
    product_name: str
    category: str
    condition_grade: str
    current_city: Optional[str] = None
    recommended_city: Optional[str] = None
    demand_score: Optional[int] = None
    recommended_warehouse: Optional[str] = None
    expected_sale_days: Optional[int] = None
    expected_resale_value: Optional[float] = None
    status: str = "pending"  # pending | approved | in_transit | delivered
    seller_id: Optional[str] = None
    approved_at: Optional[str] = None
    notes: Optional[str] = None
