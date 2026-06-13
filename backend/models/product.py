"""
Pydantic models for Product entities.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProductCreate(BaseModel):
    product_name: str = Field(..., description="Name of the product")
    category: str = Field(..., description="Product category")
    original_price: Optional[float] = Field(None, description="Original purchase price in INR")
    description: Optional[str] = Field(None, description="Product description")


class ProductListing(BaseModel):
    product_id: str
    product_name: str
    category: str
    original_price: Optional[float] = None
    estimated_value: Optional[float] = None
    condition_grade: Optional[str] = None
    condition_score: Optional[int] = None
    image_urls: List[str] = []
    routing_action: Optional[str] = None
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    city: Optional[str] = None
    seller_id: str = "demo_user"
    buyer_match_score: Optional[int] = None
    green_impact_kg: Optional[float] = None


class ProductResponse(BaseModel):
    product_id: str
    product_name: str
    category: str
    original_price: Optional[float] = None
    estimated_value: Optional[float] = None
    condition_grade: Optional[str] = None
    condition_score: Optional[int] = None
    image_urls: List[str] = []
    routing_action: Optional[str] = None
    routing_reasoning: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
