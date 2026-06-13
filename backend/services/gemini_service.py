"""
Gemini AI Service — Wrapper for Google Gemini text and vision calls.
Uses the new google-genai package.
"""
import os
import json
import base64
import traceback
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("⚠️  ACTION REQUIRED: Set GEMINI_API_KEY in /backend/.env — see .env.example for instructions.")
            self.available = False
            return

        try:
            from google import genai
            self.client = genai.Client(api_key=api_key)
            # Try models in order of preference
            self.model_candidates = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
            self.model_name = self.model_candidates[0]
            self.available = True
            print(f"✅ Gemini AI initialized (model: {self.model_name})")
        except Exception as e:
            print(f"⚠️  Gemini initialization failed: {e}")
            self.available = False

    def _parse_json_response(self, text: str) -> dict:
        """Clean and parse JSON from Gemini response."""
        text = text.strip()
        # Remove markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return json.loads(text)

    def _call_gemini(self, contents, retries=2):
        """Call Gemini with model fallback and retry logic."""
        import time
        for model in self.model_candidates:
            for attempt in range(retries):
                try:
                    response = self.client.models.generate_content(
                        model=model,
                        contents=contents
                    )
                    self.model_name = model  # Remember working model
                    return response
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        # Rate limited — try next model or wait
                        if attempt < retries - 1:
                            time.sleep(2)
                            continue
                        else:
                            break  # Try next model
                    elif "404" in err_str:
                        break  # Model not available, try next
                    else:
                        if attempt < retries - 1:
                            time.sleep(1)
                            continue
                        raise e
        raise Exception("All Gemini models exhausted or rate limited")

    async def analyze_images(self, images_base64: list, category: str, product_name: str = "") -> dict:
        """
        Send images to Gemini Vision for condition assessment.
        """
        if not self.available:
            return self._fallback_condition_response(category)

        prompt = f"""You are an expert product inspector working for Amazon's quality team.
Analyse these {len(images_base64)} photos of a {category} product{f' ({product_name})' if product_name else ''}.

Identify and score each of the following (0-100):
- Surface condition (scratches, dents, discolouration)
- Functional parts integrity
- Accessories completeness
- Packaging quality

Return ONLY valid JSON, no markdown, no explanation:
{{"surface": <int>, "parts": <int>, "accessories": <int>, "packaging": <int>, "overall": <int>, "grade": "<Like New|Excellent|Good|Fair|Needs Refurbishment>", "defects_found": ["<defect1>", "<defect2>"], "missing_accessories": ["<item1>"], "reasoning": "<your detailed reasoning>"}}

Scoring guide:
- 90-100: Like New (no visible wear)
- 75-89: Excellent (minimal wear, fully functional)
- 60-74: Good (visible wear, fully functional)
- 40-59: Fair (significant wear, functional with minor issues)
- 0-39: Needs Refurbishment (major issues)

Be specific about actual defects you see in the images. Vary your scores based on what you actually observe."""

        try:
            from google.genai import types

            # Build parts list: text prompt + images
            parts = [types.Part.from_text(text=prompt)]
            for img_b64 in images_base64:
                parts.append(types.Part.from_bytes(
                    data=base64.b64decode(img_b64),
                    mime_type="image/jpeg"
                ))

            response = self._call_gemini(
                contents=[types.Content(role="user", parts=parts)]
            )

            result_text = response.text.strip()
            result = self._parse_json_response(result_text)
            print(f"✅ Gemini Vision analysis complete: score={result.get('overall')}, grade={result.get('grade')}")
            return result
        except json.JSONDecodeError as e:
            print(f"Gemini JSON parse error: {e}")
            print(f"Raw response: {result_text[:500] if 'result_text' in dir() else 'N/A'}")
            return self._fallback_condition_response(category)
        except Exception as e:
            print(f"Gemini Vision error: {e}")
            traceback.print_exc()
            return self._fallback_condition_response(category)

    async def get_routing_decision(self, condition_score: int, category: str,
                                    demand_level: str, original_price: float,
                                    rag_context: str = "") -> dict:
        """Get AI routing recommendation for a product."""
        if not self.available:
            return self._fallback_routing_response(condition_score, original_price)

        prompt = f"""Given the following product data, decide the optimal routing for resale:

Condition score: {condition_score}/100
Category: {category}
Demand level: {demand_level}
Original price: ₹{original_price}

{f'Context: {rag_context}' if rag_context else ''}

Options: "direct_resale", "refurbish_then_sell", "peer_to_peer", "donate", "recycle"

Decision rules:
- Score 80+ with high demand → direct_resale at 60-75% of original
- Score 80+ with low demand → direct_resale at 50-60% or peer_to_peer
- Score 60-79 → direct_resale at 40-55% or refurbish_then_sell
- Score 40-59 → refurbish_then_sell or donate
- Score <40 → recycle

Return ONLY valid JSON:
{{"action": "<action>", "reasoning": "<reason>", "estimated_value": <int>, "buyback_offer": <int>, "confidence": <float 0-1>, "time_to_sell_days": <int>}}"""

        try:
            response = self._call_gemini(contents=prompt)
            result = self._parse_json_response(response.text)
            return result
        except Exception as e:
            print(f"Gemini routing error: {e}")
            return self._fallback_routing_response(condition_score, original_price)

    async def get_demand_forecast(self, category: str) -> dict:
        """Get demand forecast across Indian cities."""
        if not self.available:
            return self._fallback_demand_response(category)

        prompt = f"""Predict current resale demand for used {category} across major Indian cities.
Consider: tech hub density, income levels, student population, typical buyers.

Cities: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Kochi, Lucknow, Chandigarh

Return ONLY valid JSON:
{{"city_demand": [{{"city": "<city>", "demand": "<Very High|High|Medium|Low>", "score": <int 0-100>, "reasoning": "<brief reason>"}}]}}"""

        try:
            response = self._call_gemini(contents=prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Gemini demand error: {e}")
            return self._fallback_demand_response(category)

    async def get_return_risk(self, product_name: str, category: str,
                              user_history: list) -> dict:
        """Predict return probability for a product given user history."""
        if not self.available:
            return self._fallback_prevention_response()

        prompt = f"""A customer with purchase history [{', '.join(user_history)}] is about to buy "{product_name}" (category: {category}).

Predict return probability and reasons. Consider: feature mismatch, sizing issues, quality expectations, duplicate purchases.

Return ONLY valid JSON:
{{"return_risk_score": <int 0-100>, "risk_level": "<Low|Medium|High>", "risk_reasons": ["<reason1>", "<reason2>"], "recommendations": ["<rec1>", "<rec2>"], "alternative_suggestion": "<alternative>"}}"""

        try:
            response = self._call_gemini(contents=prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Gemini prevention error: {e}")
            return self._fallback_prevention_response()

    # ── Fallback responses when AI is unavailable ──

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
            action, value_pct = "direct_resale", 0.65
        elif condition_score >= 60:
            action, value_pct = "direct_resale", 0.45
        elif condition_score >= 40:
            action, value_pct = "refurbish_then_sell", 0.35
        else:
            action, value_pct = "donate", 0.15

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
