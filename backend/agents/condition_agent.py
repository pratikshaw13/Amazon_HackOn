"""
Condition Agent — Uses Gemini Vision to assess product condition from photos.
"""
from agents.base_agent import BaseAgent
from utils.scoring import normalize_score, calculate_overall_score, score_to_grade


class ConditionAgent(BaseAgent):
    """
    Input: list of base64-encoded product images, product category, product name
    Output: condition scores, grade, defects, reasoning
    """

    async def run(self, input_data: dict) -> dict:
        images_base64 = input_data.get("images", [])
        category = input_data.get("category", "General")
        product_name = input_data.get("product_name", "")

        if not images_base64:
            return {
                "surface": 0, "parts": 0, "accessories": 0, "packaging": 0,
                "overall": 0, "grade": "Needs Refurbishment",
                "defects_found": ["No images provided for assessment"],
                "missing_accessories": [],
                "reasoning": "Cannot assess condition without product photos.",
                "confidence": 0.0
            }

        # Call Gemini Vision
        result = await self.gemini.analyze_images(images_base64, category, product_name)

        # Normalize scores
        surface = normalize_score(result.get("surface", 50))
        parts = normalize_score(result.get("parts", 50))
        accessories = normalize_score(result.get("accessories", 50))
        packaging = normalize_score(result.get("packaging", 50))

        # Recalculate overall to ensure consistency
        overall = result.get("overall")
        if overall is None:
            overall = calculate_overall_score(surface, parts, accessories, packaging)
        else:
            overall = normalize_score(overall)

        # Determine grade
        grade = result.get("grade", score_to_grade(overall))

        # Calculate confidence based on image count and AI availability
        confidence = min(0.95, 0.6 + (len(images_base64) * 0.08))
        if not self.gemini.available:
            confidence = 0.4

        return {
            "surface": surface,
            "parts": parts,
            "accessories": accessories,
            "packaging": packaging,
            "overall": overall,
            "grade": grade,
            "defects_found": result.get("defects_found", []),
            "missing_accessories": result.get("missing_accessories", []),
            "reasoning": result.get("reasoning", "Assessment complete."),
            "confidence": confidence
        }
