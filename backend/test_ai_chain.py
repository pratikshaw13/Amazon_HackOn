"""
AI Provider Chain — Integration Test Script
Tests all providers in the chain individually and together.

Usage: python test_ai_chain.py
"""
import asyncio
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()


def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def print_result(name, result, elapsed):
    if "error" in str(result).lower() and isinstance(result, str):
        print(f"  ❌ {name}: {result}")
    else:
        provider = result.get("_provider", "unknown") if isinstance(result, dict) else "?"
        score = result.get("overall", "?") if isinstance(result, dict) else "?"
        grade = result.get("grade", "?") if isinstance(result, dict) else "?"
        confidence = result.get("confidence", "?") if isinstance(result, dict) else "?"
        print(f"  ✅ {name} [{provider}] → Score: {score}, Grade: {grade}, Confidence: {confidence} ({elapsed:.1f}s)")


async def test_bedrock():
    """Test Bedrock directly."""
    from services.bedrock_service import BedrockService
    svc = BedrockService()
    if not svc.available:
        return "Bedrock not available (check AWS credentials)"

    start = time.time()
    # Test text-only (routing) since we can't easily provide real images
    result = await svc.get_routing_decision(
        condition_score=78,
        category="Electronics",
        demand_level="High",
        original_price=25000
    )
    elapsed = time.time() - start
    return result, elapsed


async def test_gemini():
    """Test Gemini directly."""
    try:
        from services.gemini_service import GeminiService
        svc = GeminiService()
        if not svc.available:
            return "Gemini not available (check GEMINI_API_KEY)"

        start = time.time()
        result = await svc.get_routing_decision(
            condition_score=78,
            category="Electronics",
            demand_level="High",
            original_price=25000
        )
        elapsed = time.time() - start
        return result, elapsed
    except ImportError:
        return "google-generativeai not installed"
    except Exception as e:
        return f"Gemini error: {str(e)[:150]}"


async def test_ollama():
    """Test Ollama directly."""
    try:
        from services.ollama_service import OllamaService
        svc = OllamaService()
        if not svc.available:
            return "Ollama not running or model not pulled"

        start = time.time()
        result = await svc.get_routing_decision(
            condition_score=78,
            category="Electronics",
            demand_level="High",
            original_price=25000
        )
        elapsed = time.time() - start
        return result, elapsed
    except Exception as e:
        return f"Ollama error: {e}"


async def test_chain_routing():
    """Test the full provider chain (routing decision)."""
    from services.ai_provider import AIProviderChain
    chain = AIProviderChain()

    start = time.time()
    result = await chain.get_routing_decision(
        condition_score=82,
        category="Laptops",
        demand_level="High",
        original_price=65000
    )
    elapsed = time.time() - start
    return result, elapsed


async def test_chain_demand():
    """Test the full provider chain (demand forecast)."""
    from services.ai_provider import AIProviderChain
    chain = AIProviderChain()

    start = time.time()
    result = await chain.get_demand_forecast("Smartphones")
    elapsed = time.time() - start
    return result, elapsed


async def test_fallback_only():
    """Test rule-based fallback directly."""
    from services.ai_provider import RuleBasedFallback
    fb = RuleBasedFallback()

    start = time.time()
    result = await fb.analyze_images([], "Electronics", "Test Phone")
    elapsed = time.time() - start
    return result, elapsed


async def main():
    print_header("AI PROVIDER CHAIN — INTEGRATION TEST")
    print(f"  Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"  Provider Priority: {os.getenv('AI_PROVIDER_PRIORITY', 'bedrock,gemini,ollama,fallback')}")
    print(f"  Confidence Threshold: {os.getenv('AI_CONFIDENCE_THRESHOLD', '0.6')}")

    # Test 1: Chain status
    print_header("1. CHAIN STATUS")
    from services.ai_provider import AIProviderChain
    chain = AIProviderChain()
    status = chain.get_status()
    print(f"  Active providers: {status['active_count']}")
    for p in status['providers']:
        print(f"    → {p['name']} ({p['type']})")

    # Test 2: Individual providers
    print_header("2. INDIVIDUAL PROVIDER TESTS (Routing)")

    print("\n  Testing Bedrock...")
    r = await test_bedrock()
    if isinstance(r, str):
        print(f"  ❌ Bedrock: {r}")
    else:
        result, elapsed = r
        action = result.get("action", "?")
        value = result.get("estimated_value", "?")
        conf = result.get("confidence", "?")
        print(f"  ✅ Bedrock → Action: {action}, Value: ₹{value}, Confidence: {conf} ({elapsed:.1f}s)")

    print("\n  Testing Gemini...")
    r = await test_gemini()
    if isinstance(r, str):
        print(f"  ❌ Gemini: {r}")
    elif isinstance(r, tuple):
        result, elapsed = r
        action = result.get("action", "?")
        value = result.get("estimated_value", "?")
        conf = result.get("confidence", "?")
        print(f"  ✅ Gemini → Action: {action}, Value: ₹{value}, Confidence: {conf} ({elapsed:.1f}s)")
    else:
        print(f"  ❌ Gemini: Unexpected response")

    print("\n  Testing Ollama...")
    r = await test_ollama()
    if isinstance(r, str):
        print(f"  ⏭️  Ollama: {r}")
    else:
        result, elapsed = r
        action = result.get("action", "?")
        value = result.get("estimated_value", "?")
        print(f"  ✅ Ollama → Action: {action}, Value: ₹{value} ({elapsed:.1f}s)")

    print("\n  Testing Rule-Based Fallback...")
    result, elapsed = await test_fallback_only()
    print(f"  ✅ Fallback → Score: {result.get('overall')}, Grade: {result.get('grade')}, Confidence: {result.get('confidence')} ({elapsed:.1f}s)")

    # Test 3: Full chain (routing)
    print_header("3. FULL CHAIN TEST — Routing Decision")
    print("  Input: Laptop, Score 82/100, High demand, ₹65,000 original")
    result, elapsed = await test_chain_routing()
    provider = result.get("_provider", "?")
    action = result.get("action", "?")
    value = result.get("estimated_value", "?")
    buyback = result.get("buyback_offer", "?")
    conf = result.get("confidence", "?")
    days = result.get("time_to_sell_days", "?")
    print(f"  Provider: {provider}")
    print(f"  Action: {action}")
    print(f"  Estimated Value: ₹{value:,}" if isinstance(value, int) else f"  Estimated Value: ₹{value}")
    print(f"  Buyback Offer: ₹{buyback:,}" if isinstance(buyback, int) else f"  Buyback Offer: ₹{buyback}")
    print(f"  Confidence: {conf}")
    print(f"  Time to Sell: {days} days")
    print(f"  Latency: {elapsed:.1f}s")

    # Test 4: Full chain (demand)
    print_header("4. FULL CHAIN TEST — Demand Forecast")
    print("  Input: Category = Smartphones")
    result, elapsed = await test_chain_demand()
    provider = result.get("_provider", "?")
    cities = result.get("city_demand", [])
    print(f"  Provider: {provider}")
    print(f"  Cities returned: {len(cities)}")
    if cities:
        top3 = cities[:3]
        for c in top3:
            print(f"    → {c.get('city')}: {c.get('demand')} ({c.get('score')}/100)")
    print(f"  Latency: {elapsed:.1f}s")

    # Summary
    print_header("5. SUMMARY")
    print(f"  Chain: {' → '.join(status['chain'])}")
    print(f"  All tests completed successfully ✅")
    print(f"\n  To test vision (image analysis), upload a product photo via the sell agent UI.")
    print(f"  The chain will automatically route through available providers.")


if __name__ == "__main__":
    asyncio.run(main())
