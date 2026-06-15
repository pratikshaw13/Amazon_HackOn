"""
Google Gemini AI Service — Secondary provider for the AI fallback chain.
Uses Gemini 1.5 Flash (free tier: 15 RPM, 1M tokens/day).

Provides the same interface as BedrockService so it can be used as a
drop-in replacement in the AIProviderChain.
"""
import os
import json
import base64
import traceback
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    """
    AI service using Google Gemini API.
    Supports vision (image analysis) and text generation.
    Same interface methods as BedrockService for chain compatibility.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.available = False

        if not self.api_key or self.api_key == "your_gemini_api_key":
            print("⚠️  Gemini API key not configured.")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
            self.available = True
            print(f"✅ Gemini initialized (model: {self.model_name})")
        except ImportError:
            print("⚠️  google-generativeai package not installed. Run: pip install google-generativeai")
        except Exception as e:
            print(f"⚠️  Gemini init error: {e}")

    async def analyze_images(self, images_base64: list, category: str, product_name: str = "") -> dict:
        """
        Analyze product images using Gemini Vision.
        Returns condition scores, grade, defects, reasoning.
        """
        if not self.available:
            raise RuntimeError("Gemini not available")

        import google.generativeai as genai
        from PIL import Image
        import io

        prompt = f"""You are an expert product appraiser for Amazon SecondLife with 10 years of experience grading used consumer goods.

PRODUCT: {product_name or 'Unknown'} | Category: {category}

Analyze the uploaded product photo(s) carefully.

SCORING DIMENSIONS (0-100 each):
- Surface: Scratches, dents, discoloration, stains, scuffs, wear marks
- Parts: Buttons, ports, hinges, screen condition, moving parts integrity
- Accessories: Original box, charger, manual, cables, extras visible
- Packaging: Protective packaging quality for safe shipping

GRADING SCALE:
- 90-100: Like New (unboxed, zero visible wear)
- 75-89: Excellent (minimal cosmetic wear, fully functional)
- 60-74: Good (visible wear, fully functional)
- 40-59: Fair (significant wear, minor functional issues)
- 0-39: Poor (needs repair/refurbishment)

IMPORTANT: List ONLY defects you can actually observe. Do NOT hallucinate defects.

Return ONLY valid JSON (no markdown, no extra text):
{{"surface": <int>, "parts": <int>, "accessories": <int>, "packaging": <int>, "overall": <int>, "grade": "<string>", "defects_found": ["<specific defect>"], "missing_accessories": ["<item>"], "reasoning": "<2-3 sentences>", "confidence": <float 0.0-1.0>}}"""

        # Build content parts
        content_parts = []

        # Add images
        for img_b64 in images_base64[:3]:  # Gemini free tier: limit to 3 images
            try:
                img_bytes = base64.b64decode(img_b64)
                img = Image.open(io.BytesIO(img_bytes))
                content_parts.append(img)
            except Exception:
                continue

        if not content_parts:
            raise RuntimeError("No valid images to analyze")

        content_parts.append(prompt)

        # Call Gemini
        try:
            response = self.model.generate_content(
                content_parts,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
                request_options={"timeout": 10},  # 10 second timeout
            )
            result_text = response.text.strip()
            result = self._parse_json(result_text)
            print(f"✅ Gemini Vision: score={result.get('overall')}, grade={result.get('grade')}")
            return result
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                raise RuntimeError(f"Gemini quota/rate limit: {err_str[:100]}")
            raise

    async def get_routing_decision(self, condition_score: int, category: str,
                                    demand_level: str, original_price: float) -> dict:
        """Get AI routing/pricing decision using Gemini text."""
        if not self.available:
            raise RuntimeError("Gemini not available")

        import google.generativeai as genai

        prompt = f"""You are Amazon's pricing engine for secondhand goods.

INPUT:
- Condition Score: {condition_score}/100
- Category: {category}
- Original Price: ₹{original_price}
- Market Demand: {demand_level}

PRICING RULES:
- Like New (90+): 65-80% of original price
- Excellent (75-89): 50-65%
- Good (60-74): 35-50%
- Fair (40-59): 20-35%
- Poor (<40): 10-20% or donate/recycle

ROUTING OPTIONS:
- "direct_resale": Score 60+, demand Medium+
- "refurbish_then_sell": Score 40-70, high-value items
- "peer_to_peer": Score 50+, niche items
- "donate": Score < 40 OR no market demand
- "recycle": Irreparable items

Return ONLY valid JSON (no markdown):
{{"action": "<routing>", "estimated_value": <int>, "buyback_offer": <int>, "confidence": <float>, "time_to_sell_days": <int>, "reasoning": "<why>"}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=512,
                ),
                request_options={"timeout": 10},
            )
            return self._parse_json(response.text.strip())
        except Exception as e:
            raise RuntimeError(f"Gemini routing error: {str(e)[:100]}")

    async def get_demand_forecast(self, category: str) -> dict:
        """Get demand forecast using Gemini text."""
        if not self.available:
            raise RuntimeError("Gemini not available")

        import google.generativeai as genai

        prompt = f"""Predict resale demand for used {category} across major Indian cities.
Consider: tech adoption, income levels, student population, market size.

Cities: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Kochi, Lucknow, Chandigarh

Return ONLY valid JSON (no markdown):
{{"city_demand": [{{"city": "<name>", "demand": "<Very High|High|Medium|Low>", "score": <0-100>, "reasoning": "<brief>"}}]}}

Include all 12 cities sorted by score descending."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
                request_options={"timeout": 10},
            )
            return self._parse_json(response.text.strip())
        except Exception as e:
            raise RuntimeError(f"Gemini demand error: {str(e)[:100]}")

    def _parse_json(self, text: str) -> dict:
        """Clean and parse JSON from Gemini response."""
        text = text.strip()

        # Remove markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            lines = lines[1:]  # Remove first ``` line
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Find JSON object
        if not text.startswith("{"):
            start = text.find("{")
            if start != -1:
                depth = 0
                for i in range(start, len(text)):
                    if text[i] == "{":
                        depth += 1
                    elif text[i] == "}":
                        depth -= 1
                        if depth == 0:
                            text = text[start:i+1]
                            break

        return json.loads(text)
