"""
Routing Agent — Decides the optimal next-life path for a product.
"""
from agents.base_agent import BaseAgent
from utils.scoring import calculate_green_impact


class RoutingAgent(BaseAgent):
    """
    Input: condition score, category, demand level, original price
    Output: routing action, estimated value, buyback offer, time to sell
    """

    async def run(self, input_data: dict) -> dict:
        condition_score = input_data.get("condition_score", 50)
        category = input_data.get("category", "General")
        demand_level = input_data.get("demand_level", "Medium")
        original_price = input_data.get("original_price", 5000)

        # Get AI routing decision
        result = await self.gemini.get_routing_decision(
            condition_score=condition_score,
            category=category,
            demand_level=demand_level,
            original_price=original_price
        )

        # Ensure required fields
        action = result.get("action", "direct_resale")
        estimated_value = result.get("estimated_value", int(original_price * 0.5))
        buyback_offer = result.get("buyback_offer", int(estimated_value * 0.65))

        # Calculate green impact
        green_impact = calculate_green_impact(category, action)

        return {
            "action": action,
            "reasoning": result.get("reasoning", "Routing based on condition and demand analysis."),
            "estimated_value": estimated_value,
            "buyback_offer": buyback_offer,
            "confidence": result.get("confidence", 0.7),
            "time_to_sell_days": result.get("time_to_sell_days", 7),
            "green_impact_kg": green_impact
        }
