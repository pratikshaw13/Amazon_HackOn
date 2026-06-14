"""
Routing Portal Router — AI-driven product routing management.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from services.dynamodb_service import DynamoDBService
from services.bedrock_service import BedrockService
from models.seller import RoutingDecisionUpdate
from routers.auth import get_current_user

router = APIRouter()
db = DynamoDBService()
ai = BedrockService()

WAREHOUSES = {
    "Mumbai": {"id": "WH-MUM-01", "city": "Mumbai", "state": "Maharashtra"},
    "Delhi": {"id": "WH-DEL-01", "city": "Delhi", "state": "Delhi"},
    "Bengaluru": {"id": "WH-BLR-01", "city": "Bengaluru", "state": "Karnataka"},
    "Hyderabad": {"id": "WH-HYD-01", "city": "Hyderabad", "state": "Telangana"},
    "Chennai": {"id": "WH-CHN-01", "city": "Chennai", "state": "Tamil Nadu"},
    "Pune": {"id": "WH-PUN-01", "city": "Pune", "state": "Maharashtra"},
    "Kolkata": {"id": "WH-KOL-01", "city": "Kolkata", "state": "West Bengal"},
    "Ahmedabad": {"id": "WH-AMD-01", "city": "Ahmedabad", "state": "Gujarat"},
}


@router.get("/routing/products")
async def get_routing_queue(user: dict = Depends(get_current_user)):
    """Get all products awaiting or completed routing decisions."""
    products = await db.scan_table("sl_products", limit=100)

    routing_items = []
    for p in products:
        if p.get("status") not in ("active", "awaiting_routing", "routed"):
            continue
        routing_items.append({
            "product_id": p.get("product_id"),
            "product_name": p.get("product_name"),
            "category": p.get("category"),
            "condition_grade": p.get("condition_grade", "N/A"),
            "condition_score": p.get("condition_score", 0),
            "current_city": p.get("city", "Unknown"),
            "recommended_city": p.get("recommended_city", ""),
            "demand_score": p.get("demand_score", 0),
            "recommended_warehouse": p.get("recommended_warehouse", ""),
            "routing_action": p.get("routing_action", "pending"),
            "estimated_value": float(p.get("estimated_value", 0)),
            "status": p.get("status", "active"),
        })

    return {"routing_queue": routing_items, "total": len(routing_items)}


@router.post("/routing/recommend/{product_id}")
async def get_ai_routing_recommendation(product_id: str, user: dict = Depends(get_current_user)):
    """Get AI routing recommendation for a specific product."""
    product = await db.get_item("sl_products", {"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    category = product.get("category", "General")
    condition_score = int(product.get("condition_score", 50))
    current_city = product.get("city", "Mumbai")

    # Get demand data
    demand_result = await ai.get_demand_forecast(category)
    city_demand = demand_result.get("city_demand", [])

    # Find best city
    best_city = city_demand[0] if city_demand else {"city": "Bengaluru", "score": 80}
    recommended_city = best_city.get("city", "Bengaluru")
    demand_score = best_city.get("score", 70)

    # Get warehouse
    warehouse = WAREHOUSES.get(recommended_city, WAREHOUSES.get("Mumbai"))

    # Estimate
    expected_days = max(3, 30 - int(demand_score * 0.3))
    expected_value = float(product.get("estimated_value", 5000))

    recommendation = {
        "product_id": product_id,
        "product_name": product.get("product_name"),
        "current_city": current_city,
        "recommended_city": recommended_city,
        "recommended_warehouse": warehouse["id"],
        "demand_score": demand_score,
        "expected_sale_days": expected_days,
        "expected_resale_value": expected_value,
        "reasoning": f"Highest demand for {category} in {recommended_city} (score: {demand_score}/100). "
                     f"Expected to sell within {expected_days} days at ₹{int(expected_value)}."
    }

    # Save recommendation to product
    product["recommended_city"] = recommended_city
    product["recommended_warehouse"] = warehouse["id"]
    product["demand_score"] = demand_score
    await db.put_item("sl_products", product)

    return recommendation


@router.post("/routing/approve")
async def approve_routing(request: RoutingDecisionUpdate, user: dict = Depends(get_current_user)):
    """Approve or modify a routing decision."""
    product = await db.get_item("sl_products", {"product_id": request.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.utcnow().isoformat()

    if request.approved:
        product["status"] = "routed"
        product["routing_approved_at"] = now
        product["routing_approved_by"] = user["user_id"]
        if request.assigned_warehouse:
            product["recommended_warehouse"] = request.assigned_warehouse
        if request.assigned_city:
            product["recommended_city"] = request.assigned_city
    else:
        product["status"] = "routing_rejected"
        product["routing_rejected_at"] = now

    if request.notes:
        routing_history = product.get("routing_history", [])
        routing_history.append({
            "action": "approved" if request.approved else "rejected",
            "by": user["user_id"],
            "at": now,
            "notes": request.notes,
            "warehouse": request.assigned_warehouse or product.get("recommended_warehouse"),
            "city": request.assigned_city or product.get("recommended_city"),
        })
        product["routing_history"] = routing_history

    await db.put_item("sl_products", product)

    return {"message": "Routing decision saved", "status": product["status"]}
