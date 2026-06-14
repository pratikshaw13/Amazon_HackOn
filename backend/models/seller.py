"""
Pydantic models for Seller Portal.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SellerRegister(BaseModel):
    seller_name: str = Field(..., min_length=1)
    business_name: Optional[str] = None
    phone: str
    email: str
    password: str = Field(..., min_length=8)
    warehouse_location: Optional[str] = None


class SellerLogin(BaseModel):
    email: str
    password: str


class SellerProfile(BaseModel):
    seller_id: str
    seller_name: str
    business_name: Optional[str] = None
    phone: str
    email: str
    warehouse_location: Optional[str] = None
    products_listed: int = 0
    products_sold: int = 0
    revenue_generated: float = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RoutingDecisionUpdate(BaseModel):
    product_id: str
    approved: bool = True
    assigned_warehouse: Optional[str] = None
    assigned_city: Optional[str] = None
    notes: Optional[str] = None
