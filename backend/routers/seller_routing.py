"""
Seller Routing Router — AI-powered warehouse routing for returned/dead inventory.
Recommends best city + warehouse based on demand scores.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.dynamodb_service import DynamoDBService
from services.bedrock_service import BedrockService
from routers.certified_seller import get_current_certified_seller

router = APIRouter()
db = DynamoDBService()
ai = BedrockService()

CITY_DEMAND_BASELINE = {
    "Bengaluru": 88, "Mumbai": 79, "Delhi": 76, "Hyderabad": 74,
    "Pune": 67, "Chennai": 63, "Kolkata": 55, "Ahmedabad": 52,
    "Jaipur": 45, "Kochi": 58, "Lucknow": 40, "Chandigarh": 42,
}

WAREHOUSES = {
    "Mumbai": "WH-MUM-01", "Delhi": "WH-DEL-01", "Bengaluru": "WH-BLR-01",
    "Hyderabad": "WH-HYD-01", "Chennai": "WH-CHN-01", "Pune": "WH-PUN-01",
    "Kolkata": "WH-KOL-01", "Ahmedabad": "WH-AMD-01", "Jaipur": "WH-JAI-01",
    "Kochi": "WH-KOC-01",
}


class RouteApproveRequest(BaseModel):
    product_id: str
    target_city: str
    target_warehouse: Optional[str] = None
    notes: Optional[str] = None


@router.get("/seller-routing/queue")
async def get_routing_queue(seller: dict = Depends(get_current_certified_seller)):
    """Get all products eligible for routing (returned/dead status)."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    items = [
        i for i in all_items
        if i.get("seller_id") == seller["seller_id"]
        and i.get("status") in ("returned", "dead", "active")
    ]

    # Enrich with AI routing recommendation
    enriched = []
    for item in items:
        current_city = item.get("warehouse_city", "Mumbai")
        current_demand = CITY_DEMAND_BASELINE.get(current_city, 50)

        # Find best city (highest demand, not current city)
        best_city = max(
            [(city, score) for city, score in CITY_DEMAND_BASELINE.items() if city != current_city],
            key=lambda x: x[1]
        )

        demand_increase = best_city[1] - current_demand
        sale_probability_boost = min(85, int(demand_increase * 1.2))

        enriched.append({
            "product_id": item.get("product_id"),
            "product_name": item.get("product_name"),
            "category": item.get("category"),
            "condition_grade": item.get("condition_grade"),
            "current_city": current_city,
            "current_demand": current_demand,
            "recommended_city": best_city[0],
            "recommended_demand": best_city[1],
            "recommended_warehouse": WAREHOUSES.get(best_city[0], "WH-DEFAULT"),
            "demand_increase": f"+{demand_increase}",
            "sale_probability_boost": f"+{sale_probability_boost}%",
            "current_price": item.get("current_price"),
            "inventory_age": item.get("inventory_age"),
            "status": item.get("status"),
            "image_url": item.get("image_url"),
        })

    # Sort: dead first, then returned, then active
    status_order = {"dead": 0, "returned": 1, "active": 2}
    enriched.sort(key=lambda x: (status_order.get(x["status"], 3), -int(x.get("current_demand", 0))))

    return {"routing_queue": enriched, "total": len(enriched)}


@router.post("/seller-routing/recommend/{product_id}")
async def get_ai_recommendation(product_id: str, seller: dict = Depends(get_current_certified_seller)):
    """Get detailed AI routing recommendation for a specific product."""
    item = await db.get_item("seller_inventory", {"product_id": product_id})
    if not item or item.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=404, detail="Product not found")

    category = item.get("category", "General")
    current_city = item.get("warehouse_city", "Mumbai")
    current_price = float(item.get("current_price", 5000))

    # Use Bedrock AI for demand forecast
    demand_result = await ai.get_demand_forecast(category)
    city_demand = demand_result.get("city_demand", [])

    # Find top 3 recommended cities (excluding current)
    recommendations = []
    for city_data in sorted(city_demand, key=lambda x: x.get("score", 0), reverse=True):
        if city_data.get("city") != current_city and len(recommendations) < 3:
            city_name = city_data.get("city")
            score = city_data.get("score", 50)
            current_demand = CITY_DEMAND_BASELINE.get(current_city, 50)
            increase = score - current_demand

            recommendations.append({
                "city": city_name,
                "demand_score": score,
                "demand_level": city_data.get("demand", "Medium"),
                "warehouse": WAREHOUSES.get(city_name, "WH-DEFAULT"),
                "demand_increase": increase,
                "sale_probability": min(95, int(score * 0.9)),
                "expected_days_to_sell": max(3, 30 - int(score * 0.28)),
                "reasoning": city_data.get("reasoning", ""),
            })

    return {
        "product_id": product_id,
        "product_name": item.get("product_name"),
        "category": category,
        "current_city": current_city,
        "current_demand": CITY_DEMAND_BASELINE.get(current_city, 50),
        "recommendations": recommendations,
        "ai_summary": f"Best option: Route to {recommendations[0]['city']} (demand: {recommendations[0]['demand_score']}/100). "
                      f"Expected to sell within {recommendations[0]['expected_days_to_sell']} days with {recommendations[0]['sale_probability']}% probability."
        if recommendations else "No better routing available.",
    }


@router.post("/seller-routing/approve")
async def approve_routing(request: RouteApproveRequest, seller: dict = Depends(get_current_certified_seller)):
    """Approve a routing decision — move product to recommended warehouse."""
    item = await db.get_item("seller_inventory", {"product_id": request.product_id})
    if not item or item.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc).isoformat()
    old_city = item.get("warehouse_city", "Unknown")

    # Update product
    item["warehouse_city"] = request.target_city
    item["status"] = "active"  # Rescued from dead/returned

    # Add to routing history
    history = item.get("routing_history", [])
    history.append({
        "from_city": old_city,
        "to_city": request.target_city,
        "warehouse": request.target_warehouse or WAREHOUSES.get(request.target_city, ""),
        "date": now,
        "reason": request.notes or f"AI recommended: Higher demand in {request.target_city}",
        "approved_by": seller["seller_id"],
    })
    item["routing_history"] = history

    await db.put_item("seller_inventory", item)

    # Also log to routing history table
    await db.put_item("seller_routing_history", {
        "product_id": request.product_id,
        "timestamp": now,
        "from_city": old_city,
        "to_city": request.target_city,
        "seller_id": seller["seller_id"],
        "product_name": item.get("product_name"),
        "notes": request.notes or "",
    })

    return {
        "message": f"✅ Routing approved! {item.get('product_name')} moved from {old_city} → {request.target_city}",
        "product_id": request.product_id,
        "new_city": request.target_city,
        "new_warehouse": request.target_warehouse or WAREHOUSES.get(request.target_city, ""),
    }
