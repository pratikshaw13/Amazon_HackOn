"""
Prevention Router — Return risk scoring endpoint.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from agents.prevention_agent import PreventionAgent

router = APIRouter()
prevention_agent = PreventionAgent()


class PreventionCheckRequest(BaseModel):
    product_name: str
    category: str
    product_id: Optional[str] = None
    user_history: List[str] = []


@router.post("/prevention/check")
async def check_return_risk(request: PreventionCheckRequest):
    """Predict return probability for a product given user history."""
    result = await prevention_agent.run({
        "product_name": request.product_name,
        "category": request.category,
        "user_history": request.user_history
    })

    return result
