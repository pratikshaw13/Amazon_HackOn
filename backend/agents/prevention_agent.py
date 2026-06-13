"""
Prevention Agent — Predicts return risk before purchase.
"""
from agents.base_agent import BaseAgent


class PreventionAgent(BaseAgent):
    """
    Input: product_name, category, user purchase history
    Output: return risk score, risk level, reasons, recommendations
    """

    async def run(self, input_data: dict) -> dict:
        product_name = input_data.get("product_name", "Unknown Product")
        category = input_data.get("category", "General")
        user_history = input_data.get("user_history", [])

        result = await self.gemini.get_return_risk(
            product_name=product_name,
            category=category,
            user_history=user_history
        )

        return {
            "return_risk_score": result.get("return_risk_score", 50),
            "risk_level": result.get("risk_level", "Medium"),
            "risk_reasons": result.get("risk_reasons", []),
            "recommendations": result.get("recommendations", []),
            "alternative_suggestion": result.get("alternative_suggestion", "")
        }
