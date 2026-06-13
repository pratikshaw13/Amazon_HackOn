"""
Gemini AI Service — Wrapper for Google Gemini text and vision calls.
"""
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("⚠️  ACTION REQUIRED: Set GEMINI_API_KEY in /backend/.env — see .env.example for instructions.")
            self.available = False
            return

        genai.configure(api_key=api_key)
        self.text_model = genai.GenerativeModel("gemini-1.5-flash")
        self.vision_model = genai.GenerativeModel("gemini-1.5-flash")
        self.available = True

    async def analyze_images(self, images_base64: list, category: str, product_name: str = "") -> dict:
        """
        Send images to Gemini Vision for condition assessment.
        Returns structured JSON with scores and defects.
        """
        if not self.available:
            return self._fallback_condition_response(category)

        # Build image parts for Gemini
        image_parts = []
        for img_b64 in images_base64:
            image_parts.append({
                "mime_type": "image/jpeg",
                "data": img_b64
            })

        prompt = f"""You are an expert product inspector working for Amazon's quality team.
Analyse these {len(images_base64)} photos of a {category} product{f' ({product_name})' if product_name else ''}.

Identify and score each of the following (0-100):
- Surface condition (scratches, dents, discolouration)
- Functional parts integrity
- Accessories completeness
- Packaging quality

Return JSON only, no markdown, no explanation outside JSON:
{{"surface": int, "parts": int, "accessories": int, "packaging": int, "overall": int, "grade": "Like New|Excellent|Good|Fair|Needs Refurbishment", "defects_found": [str], "missing_accessories": [str], "reasoning": str}}

Scoring guide:
- 90-100: Like New (no visible wear)
- 75-89: Excellent (minimal wear, fully functional)
- 60-74: Good (visible wear, fully functional)
- 40-59: Fair (significant wear, functional with minor issues)
- 0-39: Needs Refurbishment (major issues)
"""

        try:
            content = [prompt] + image_parts
            response = self.vision_model.generate_content(content)
            result_text = response.text.strip()

            # Clean markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"Gemini Vision error: {e}")
            return self._fallback_condition_response(category)

    async def get_routing_decision(self, condition_score: int, category: str,
                                    demand_level: str, original_price: float,
                                    rag_context: str = "") -> dict:
        """
        Get AI routing recommendation for a product.
        """
        if not self.available:
            return self._fallback_routing_response(condition_score, original_price)

        prompt = f"""Given the following product data, decide the optimal routing for resale:

Condition score: {condition_score}/100
Category: {category}
Demand level: {demand_level}
Original price: ₹{original_price}

{f'Context from knowledge base: {rag_context}' if rag_context else ''}

Options: "direct_resale", "refurbish_then_sell", "peer_to_peer", "donate", "recycle"

Decision rules:
- Score 80+ with high demand → direct_resale at 60-75% of original
- Score 80+ with low demand → direct_resale at 50-60% or peer_to_peer
- Score 60-79 → direct_resale at 40-55% or refurbish_then_sell
- Score 40-59 → refurbish_then_sell or donate
- Score <40 → recycle

Return JSON only, no markdown:
{{"action": str, "reasoning": str, "estimated_value": int, "buyback_offer": int, "confidence": float, "time_to_sell_days": int}}
"""

        try:
            response = self.text_model.generate_content(prompt)
            result_text = response.text.strip()

            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"Gemini routing error: {e}")
            return self._fallback_routing_response(condition_score, original_price)

    async def get_demand_forecast(self, category: str) -> dict:
        """
        Get demand forecast across Indian cities for a category.
        """
        if not self.available:
            return self._fallback_demand_response(category)

        prompt = f"""Predict current resale demand for used {category} across major Indian cities.
Consider: tech hub density, income levels, student population, typical buyers.

Cities: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Kochi, Lucknow, Chandigarh

Return JSON only, no markdown:
{{"city_demand": [{{"city": str, "demand": "Very High|High|Medium|Low", "score": int, "reasoning": str}}]}}
"""

        try:
            response = self.text_model.generate_content(prompt)
            result_text = response.text.strip()

            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"Gemini demand error: {e}")
            return self._fallback_demand_response(category)

    async def get_return_risk(self, product_name: str, category: str,
                              user_history: list) -> dict:
        """
        Predict return probability for a product given user history.
        """
        if not self.available:
            return self._fallback_prevention_response()

        prompt = f"""A customer with purchase history [{', '.join(user_history)}] is about to buy {product_name} (category: {category}).

Predict return probability and reasons. Consider: feature mismatch, sizing issues, quality expectations, duplicate purchases.

Return JSON only, no markdown:
{{"return_risk_score": int, "risk_level": "Low|Medium|High", "risk_reasons": [str], "recommendations": [str], "alternative_suggestion": str}}
"""

        try:
            response = self.text_model.generate_content(prompt)
            result_text = response.text.strip()

            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"Gemini prevention error: {e}")
            return self._fallback_prevention_response()

    def _fallback_condition_response(self, category: str) -> dict:
        return {
            "surface": 78, "parts": 85, "accessories": 70, "packaging": 60,
            "overall": 74, "grade": "Good",
            "defects_found": ["Minor surface scratches", "Light wear on edges"],
            "missing_accessories": ["Original packaging insert"],
            "reasoning": f"Fallback assessment for {category}. AI service unavailable — using estimated scores based on category averages."
        }

    def _fallback_routing_response(self, condition_score: int, original_price: float) -> dict:
        if condition_score >= 80:
            action = "direct_resale"
            value_pct = 0.65
        elif condition_score >= 60:
            action = "direct_resale"
            value_pct = 0.45
        elif condition_score >= 40:
            action = "refurbish_then_sell"
            value_pct = 0.35
        else:
            action = "donate"
            value_pct = 0.15

        est_value = int(original_price * value_pct)
        return {
            "action": action,
            "reasoning": "Fallback routing based on condition score thresholds.",
            "estimated_value": est_value,
            "buyback_offer": int(est_value * 0.65),
            "confidence": 0.6,
            "time_to_sell_days": 7
        }

    def _fallback_demand_response(self, category: str) -> dict:
        return {
            "city_demand": [
                {"city": "Bengaluru", "demand": "Very High", "score": 92, "reasoning": "Tech hub, young professionals"},
                {"city": "Mumbai", "demand": "High", "score": 80, "reasoning": "Large market, diverse buyers"},
                {"city": "Delhi", "demand": "High", "score": 78, "reasoning": "Large population, strong e-commerce"},
                {"city": "Hyderabad", "demand": "High", "score": 75, "reasoning": "Growing tech sector"},
                {"city": "Pune", "demand": "Medium", "score": 65, "reasoning": "IT hub, student population"},
                {"city": "Chennai", "demand": "Medium", "score": 62, "reasoning": "Industrial base"},
                {"city": "Kolkata", "demand": "Medium", "score": 55, "reasoning": "Price-sensitive market"},
                {"city": "Ahmedabad", "demand": "Medium", "score": 52, "reasoning": "Growing market"},
                {"city": "Jaipur", "demand": "Low", "score": 40, "reasoning": "Smaller tech presence"},
                {"city": "Kochi", "demand": "Medium", "score": 58, "reasoning": "High literacy, tech-aware"},
                {"city": "Lucknow", "demand": "Low", "score": 38, "reasoning": "Emerging market"},
                {"city": "Chandigarh", "demand": "Low", "score": 42, "reasoning": "Smaller market size"}
            ]
        }

    def _fallback_prevention_response(self) -> dict:
        return {
            "return_risk_score": 45,
            "risk_level": "Medium",
            "risk_reasons": ["Product may not match expectations based on purchase history"],
            "recommendations": ["Verify product dimensions before purchase", "Check compatibility with existing setup"],
            "alternative_suggestion": "Consider reading recent customer reviews focusing on size and compatibility"
        }
