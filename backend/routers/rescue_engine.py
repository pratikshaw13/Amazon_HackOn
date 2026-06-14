"""
Rescue Engine Router — 7 AI strategies to recover dead/returned inventory.
1. Cross-City Matching
2. AI Dynamic Pricing
3. AI Bundle Generator
4. Local Buyer Matching
5. Rental Model
6. Donation Routing
7. Green Marketplace Boost
"""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.dynamodb_service import DynamoDBService
from services.bedrock_service import BedrockService
from routers.certified_seller import get_current_certified_seller

router = APIRouter()
db = DynamoDBService()
ai = BedrockService()

CITY_DEMAND = {
    "Bengaluru": 88, "Mumbai": 79, "Delhi": 76, "Hyderabad": 74,
    "Pune": 67, "Chennai": 63, "Kolkata": 55, "Ahmedabad": 52,
    "Jaipur": 45, "Kochi": 58, "Lucknow": 40, "Chandigarh": 42,
}

NGO_PARTNERS = [
    {"name": "Goonj Foundation", "type": "NGO", "city": "Delhi", "focus": "Clothing, household items"},
    {"name": "Pratham Education", "type": "School", "city": "Mumbai", "focus": "Books, educational materials"},
    {"name": "CRY India", "type": "NGO", "city": "Bengaluru", "focus": "Children's products"},
    {"name": "Akshaya Patra", "type": "School", "city": "Hyderabad", "focus": "Kitchen, food equipment"},
    {"name": "HelpAge India", "type": "Hospital", "city": "Chennai", "focus": "Healthcare, electronics"},
    {"name": "Smile Foundation", "type": "NGO", "city": "Pune", "focus": "General household items"},
]


class RescueRequest(BaseModel):
    product_id: str


@router.get("/rescue/dead-inventory")
async def get_dead_inventory(seller: dict = Depends(get_current_certified_seller)):
    """Get all dead/returned inventory eligible for rescue."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    dead = [
        i for i in all_items
        if i.get("seller_id") == seller["seller_id"]
        and i.get("status") in ("dead", "returned")
    ]
    dead.sort(key=lambda x: int(x.get("demand_score", 50)))
    return {"dead_inventory": dead, "total": len(dead)}


@router.post("/rescue/strategies/{product_id}")
async def get_all_strategies(product_id: str, seller: dict = Depends(get_current_certified_seller)):
    """Generate all 7 rescue strategies for a dead inventory product."""
    item = await db.get_item("seller_inventory", {"product_id": product_id})
    if not item or item.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=404, detail="Product not found")

    product_name = item.get("product_name", "Product")
    category = item.get("category", "General")
    current_city = item.get("warehouse_city", "Mumbai")
    current_price = float(item.get("current_price", 5000))
    original_price = float(item.get("original_price", 8000))
    demand_score = int(item.get("demand_score", 30))

    strategies = []

    # ═══ STRATEGY 1: Cross-City Matching ═══
    best_cities = sorted(
        [(c, s) for c, s in CITY_DEMAND.items() if c != current_city],
        key=lambda x: x[1], reverse=True
    )[:3]
    strategies.append({
        "id": "cross_city",
        "name": "Cross-City Matching",
        "icon": "🗺️",
        "description": f"Transfer to higher-demand city",
        "recommendation": {
            "best_city": best_cities[0][0],
            "demand_score": best_cities[0][1],
            "current_demand": CITY_DEMAND.get(current_city, 30),
            "increase": f"+{best_cities[0][1] - CITY_DEMAND.get(current_city, 30)}",
            "sale_probability": f"{min(92, best_cities[0][1])}%",
            "alternatives": [{"city": c, "score": s} for c, s in best_cities],
        },
        "impact": f"Demand increase of +{best_cities[0][1] - CITY_DEMAND.get(current_city, 30)} points",
        "confidence": 0.85,
    })

    # ═══ STRATEGY 2: AI Dynamic Pricing ═══
    price_tiers = [
        {"price": int(current_price * 0.90), "probability": "65%", "days": "12-15"},
        {"price": int(current_price * 0.80), "probability": "78%", "days": "7-10"},
        {"price": int(current_price * 0.65), "probability": "92%", "days": "3-5"},
    ]
    strategies.append({
        "id": "dynamic_pricing",
        "name": "AI Dynamic Pricing",
        "icon": "💰",
        "description": "Reduce price strategically to increase sale probability",
        "recommendation": {
            "original_price": int(original_price),
            "current_price": int(current_price),
            "price_tiers": price_tiers,
            "best_tier": price_tiers[1],
        },
        "impact": f"78% sale probability at ₹{price_tiers[1]['price']:,}",
        "confidence": 0.78,
    })

    # ═══ STRATEGY 3: AI Bundle Generator ═══
    bundle_items = _generate_bundle(category, product_name)
    strategies.append({
        "id": "bundle",
        "name": "AI Bundle Generator",
        "icon": "📦",
        "description": "Bundle with complementary products for higher value",
        "recommendation": {
            "main_product": product_name,
            "bundle_items": bundle_items,
            "expected_demand_increase": "+48%",
            "bundle_discount": "15%",
            "bundle_price": int(current_price * 1.8),
        },
        "impact": "Expected demand increase of +48%",
        "confidence": 0.72,
    })

    # ═══ STRATEGY 4: Local Buyer Matching ═══
    buyers = _generate_buyer_matches(category, current_city)
    strategies.append({
        "id": "buyer_matching",
        "name": "Local Buyer Matching",
        "icon": "👥",
        "description": "Find nearby likely buyers based on purchase patterns",
        "recommendation": {
            "potential_buyers": buyers,
            "total_matches": len(buyers),
            "best_match_score": buyers[0]["match_score"] if buyers else 0,
        },
        "impact": f"{len(buyers)} potential buyers found with avg {sum(b['match_score'] for b in buyers)//max(1,len(buyers))}% match",
        "confidence": 0.68,
    })

    # ═══ STRATEGY 5: Rental Model ═══
    monthly_rent = int(current_price * 0.08)
    strategies.append({
        "id": "rental",
        "name": "Rental Model",
        "icon": "🔄",
        "description": "Rent instead of sell — recurring revenue for slow-moving items",
        "recommendation": {
            "monthly_rent": monthly_rent,
            "projected_6month_revenue": monthly_rent * 6,
            "projected_12month_revenue": monthly_rent * 12,
            "deposit": int(current_price * 0.3),
            "suitable": category in ("Baby Products", "Books", "Sports", "Electronics", "Home"),
            "reason": f"{category} products are ideal for rental due to temporary usage patterns",
        },
        "impact": f"₹{monthly_rent * 12:,}/year recurring revenue",
        "confidence": 0.65 if category in ("Baby Products", "Books", "Sports") else 0.45,
    })

    # ═══ STRATEGY 6: Donation Routing ═══
    matching_ngos = [n for n in NGO_PARTNERS if category.lower() in n["focus"].lower() or n["city"] == current_city]
    if not matching_ngos:
        matching_ngos = NGO_PARTNERS[:2]
    strategies.append({
        "id": "donation",
        "name": "Donation Routing",
        "icon": "💚",
        "description": "Donate to NGOs — earn green credits and tax benefits",
        "recommendation": {
            "partners": matching_ngos[:3],
            "green_credits_earned": int(current_price * 0.05) + 75,
            "tax_deduction": f"₹{int(current_price * 0.5):,} (Section 80G)",
            "co2_saved_kg": round(random.uniform(8, 25), 1),
        },
        "impact": f"+{int(current_price * 0.05) + 75} Green Credits + tax deduction",
        "confidence": 0.95,
    })

    # ═══ STRATEGY 7: Green Marketplace Boost ═══
    strategies.append({
        "id": "green_boost",
        "name": "Green Marketplace Boost",
        "icon": "🌱",
        "description": 'Featured placement with "Save from landfill" badge',
        "recommendation": {
            "badge": "🛡️ Save this item from landfill",
            "featured_placement": True,
            "visibility_boost": "+340%",
            "eco_appeal_score": 89,
            "co2_if_landfilled": round(random.uniform(12, 40), 1),
            "expected_sale_days": max(3, 14 - int(demand_score * 0.1)),
        },
        "impact": "+340% visibility, appeals to eco-conscious buyers",
        "confidence": 0.74,
    })

    return {
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "current_city": current_city,
        "current_price": int(current_price),
        "demand_score": demand_score,
        "status": item.get("status"),
        "strategies": strategies,
    }


@router.post("/rescue/apply")
async def apply_strategy(
    product_id: str = "",
    strategy_id: str = "",
    seller: dict = Depends(get_current_certified_seller)
):
    """Apply a rescue strategy to a product."""
    item = await db.get_item("seller_inventory", {"product_id": product_id})
    if not item or item.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc).isoformat()

    # Update product status
    item["status"] = "rescued"
    item["rescue_strategy"] = strategy_id
    item["rescued_at"] = now

    await db.put_item("seller_inventory", item)

    # Log to rescue_strategies table
    await db.put_item("rescue_strategies", {
        "product_id": product_id,
        "strategy_id": strategy_id,
        "seller_id": seller["seller_id"],
        "applied_at": now,
        "product_name": item.get("product_name"),
    })

    strategy_names = {
        "cross_city": "Cross-City Matching",
        "dynamic_pricing": "Dynamic Pricing",
        "bundle": "Bundle Generator",
        "buyer_matching": "Buyer Matching",
        "rental": "Rental Model",
        "donation": "Donation Routing",
        "green_boost": "Green Marketplace Boost",
    }

    return {
        "message": f"✅ Rescue strategy '{strategy_names.get(strategy_id, strategy_id)}' applied to {item.get('product_name')}!",
        "product_id": product_id,
        "strategy": strategy_id,
        "new_status": "rescued",
    }


def _generate_bundle(category, product_name):
    """Generate bundle suggestions based on category."""
    bundles = {
        "Electronics": ["USB-C Cable", "Screen Protector", "Carrying Case", "Power Bank"],
        "Baby Products": ["Baby Wipes", "Diaper Bag", "Baby Bottle Set", "Teething Toy"],
        "Sports": ["Water Bottle", "Gym Towel", "Resistance Band", "Protein Shaker"],
        "Kitchen": ["Kitchen Towels", "Spice Set", "Measuring Cups", "Recipe Book"],
        "Home": ["LED Bulbs", "Extension Cord", "Wall Hooks", "Cleaning Kit"],
        "Books": ["Bookmark Set", "Book Light", "Reading Stand", "Highlighters"],
        "Personal Care": ["Face Mask", "Moisturizer", "Cotton Pads", "Travel Pouch"],
        "Fashion": ["Belt", "Socks Set", "Shoe Cleaner", "Garment Bag"],
    }
    items = bundles.get(category, ["Accessory 1", "Accessory 2", "Accessory 3"])
    return random.sample(items, min(3, len(items)))


def _generate_buyer_matches(category, city):
    """Generate simulated buyer matches."""
    profiles = {
        "Electronics": ["Tech Professional", "College Student", "Remote Worker", "Content Creator"],
        "Baby Products": ["New Parent", "Expecting Mother", "Grandparent", "Daycare Owner"],
        "Sports": ["Fitness Enthusiast", "Weekend Athlete", "Personal Trainer", "College Student"],
        "Kitchen": ["Home Chef", "New Apartment Owner", "Working Professional", "Food Blogger"],
        "Home": ["New Homeowner", "Interior Designer", "Student", "Young Couple"],
        "Books": ["Student", "Avid Reader", "Researcher", "Book Club Member"],
        "Personal Care": ["Self-Care Enthusiast", "Working Professional", "Teenager", "Traveler"],
        "Fashion": ["Fashion Enthusiast", "Working Professional", "College Student", "Influencer"],
    }
    buyer_types = profiles.get(category, ["Potential Buyer"])
    return [
        {"profile": bt, "match_score": random.randint(65, 95), "city": city, "interest": category}
        for bt in buyer_types[:4]
    ]
