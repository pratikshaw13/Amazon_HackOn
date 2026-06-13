"""
Pydantic models for Green Credits.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class GreenCredits(BaseModel):
    user_id: str
    balance: int = 0
    level: str = "Seedling"
    total_earned: int = 0
    co2_saved_kg: float = 0.0
    products_saved: int = 0
    packaging_saved_kg: float = 0.0


class GreenCreditAward(BaseModel):
    action: str = Field(..., description="sell|donate|buy|exchange")
    product_id: str


class LeaderboardEntry(BaseModel):
    user_id: str
    balance: int
    level: str
    products_saved: int
