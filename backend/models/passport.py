"""
Pydantic models for Product Health Passport.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class OwnershipEvent(BaseModel):
    event_type: str = Field(..., description="purchased|listed|sold|donated|inspected")
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    description: str = Field(..., description="Event description")
    actor: Optional[str] = None


class HealthPassport(BaseModel):
    product_id: str
    product_name: str
    category: str
    image_urls: List[str] = []
    condition_score: int = Field(..., ge=0, le=100)
    condition_grade: str
    scores: dict = Field(default_factory=dict, description="Sub-scores: surface, parts, accessories, packaging")
    defects_found: List[str] = Field(default_factory=list)
    missing_accessories: List[str] = Field(default_factory=list)
    ai_reasoning: str = ""
    routing_action: Optional[str] = None
    routing_reasoning: Optional[str] = None
    estimated_value: Optional[float] = None
    ownership_history: List[OwnershipEvent] = Field(default_factory=list)
    ai_verified: bool = True
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    green_impact_kg: Optional[float] = None


class PassportCreate(BaseModel):
    product_id: str
    product_name: str
    category: str
    image_urls: List[str] = []
    condition_score: int
    condition_grade: str
    scores: dict = {}
    defects_found: List[str] = []
    missing_accessories: List[str] = []
    ai_reasoning: str = ""
    routing_action: Optional[str] = None
    routing_reasoning: Optional[str] = None
    estimated_value: Optional[float] = None


class PassportUpdate(BaseModel):
    event_type: str
    description: str
    actor: Optional[str] = None
