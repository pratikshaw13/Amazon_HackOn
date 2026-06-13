"""
Buyer Matching Agent — Predicts ideal buyer profile and best cities.
"""
from agents.base_agent import BaseAgent


class BuyerMatchingAgent(BaseAgent):
    """
    Input: product details (category, condition, price)
    Output: buyer profile, top cities, match score
    """

    async def run(self, input_data: dict) -> dict:
        category = input_data.get("category", "General")
        condition_grade = input_data.get("condition_grade", "Good")
        price = input_data.get("price", 5000)

        # For MVP, use demand data to derive buyer match
        # In production, this would use Amazon Personalize
        if not self.gemini.available:
            return self._fallback_match(category, price)

        prompt = f"""Given a {condition_grade} {category} priced at ₹{price}, predict:
- Most likely buyer profile (age range, occupation, location)
- Top 3 cities where this will sell fastest
- Match confidence score

Return JSON only:
{{"buyer_profile": str, "top_cities": [{{"city": str, "match_score": int, "demand": str}}], "overall_match_score": int, "demand_forecast": "High|Medium|Low"}}"""

        try:
            import json
            response = self.gemini.text_model.generate_content(prompt)
            result_text = response.text.strip()
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()
            return json.loads(result_text)
        except Exception:
            return self._fallback_match(category, price)

    def _fallback_match(self, category: str, price: float) -> dict:
        """Fallback buyer match when AI is unavailable."""
        city_profiles = {
            "Electronics": [
                {"city": "Bengaluru", "match_score": 92, "demand": "Very High"},
                {"city": "Hyderabad", "match_score": 85, "demand": "High"},
                {"city": "Pune", "match_score": 78, "demand": "High"}
            ],
            "Baby Gear": [
                {"city": "Mumbai", "match_score": 88, "demand": "High"},
                {"city": "Delhi", "match_score": 82, "demand": "High"},
                {"city": "Bengaluru", "match_score": 79, "demand": "Medium"}
            ],
            "Monitors": [
                {"city": "Bengaluru", "match_score": 95, "demand": "Very High"},
                {"city": "Hyderabad", "match_score": 88, "demand": "High"},
                {"city": "Chennai", "match_score": 75, "demand": "Medium"}
            ]
        }

        top_cities = city_profiles.get(category, [
            {"city": "Bengaluru", "match_score": 80, "demand": "High"},
            {"city": "Mumbai", "match_score": 75, "demand": "Medium"},
            {"city": "Delhi", "match_score": 70, "demand": "Medium"}
        ])

        buyer_profile = "25-35 year old professional" if price > 5000 else "18-25 year old student"

        return {
            "buyer_profile": buyer_profile,
            "top_cities": top_cities,
            "overall_match_score": top_cities[0]["match_score"] if top_cities else 70,
            "demand_forecast": "High"
        }
