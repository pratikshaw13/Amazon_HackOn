"""
Pydantic models for AI Valuation results.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ConditionScores(BaseModel):
    surface: int = Field(..., ge=0, le=100, description="Surface condition score")
    parts: int = Field(..., ge=0, le=100, description="Functional parts integrity score")
    accessories: int = Field(..., ge=0, le=100, description="Accessories completeness score")
    packaging: int = Field(..., ge=0, le=100, description="Packaging quality score")
    overall: int = Field(..., ge=0, le=100, description="Overall condition score")


class ConditionAssessment(BaseModel):
    scores: ConditionScores
    grade: str = Field(..., description="Like New|Excellent|Good|Fair|Needs Refurbishment")
    defects_found: List[str] = Field(default_factory=list)
    missing_accessories: List[str] = Field(default_factory=list)
    reasoning: str = Field(..., description="AI reasoning for the assessment")
    confidence: float = Field(..., ge=0, le=1.0, description="Assessment confidence")


class RoutingDecision(BaseModel):
    action: str = Field(..., description="direct_resale|refurbish_then_sell|peer_to_peer|donate|recycle")
    reasoning: str = Field(..., description="Why this routing was chosen")
    estimated_value: float = Field(..., description="Estimated resale value in INR")
    buyback_offer: float = Field(..., description="Amazon buyback credit offer in INR")
    confidence: float = Field(..., ge=0, le=1.0)
    time_to_sell_days: int = Field(..., description="Estimated days to sell")


class ValuationResult(BaseModel):
    product_id: str
    product_name: str
    category: str
    image_urls: List[str] = []
    condition: ConditionAssessment
    routing: RoutingDecision
    demand_level: Optional[str] = None
    buyer_match_score: Optional[int] = None
    green_impact_kg: Optional[float] = None
