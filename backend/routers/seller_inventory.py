"""
Seller Inventory Router — CRUD for certified seller product inventory.
"""
from fastapi import APIRouter, Query, Depends
from typing import Optional
from services.dynamodb_service import DynamoDBService
from routers.certified_seller import get_current_certified_seller

router = APIRouter()
db = DynamoDBService()


@router.get("/seller-inventory/all")
async def get_inventory(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("inventory_age"),
    seller: dict = Depends(get_current_certified_seller)
):
    """Get seller's inventory with filters."""
    all_items = await db.scan_table("seller_inventory", limit=200)

    # Filter to this seller
    items = [i for i in all_items if i.get("seller_id") == seller["seller_id"]]

    # Apply filters
    if status:
        items = [i for i in items if i.get("status") == status]
    if category:
        items = [i for i in items if i.get("category", "").lower() == category.lower()]
    if city:
        items = [i for i in items if i.get("warehouse_city", "").lower() == city.lower()]

    # Sort
    if sort_by == "demand_score":
        items.sort(key=lambda x: int(x.get("demand_score", 0)), reverse=True)
    elif sort_by == "price":
        items.sort(key=lambda x: float(x.get("current_price", 0)), reverse=True)
    elif sort_by == "inventory_age":
        items.sort(key=lambda x: int(x.get("inventory_age", 0)), reverse=True)
    elif sort_by == "return_rate":
        items.sort(key=lambda x: float(x.get("return_rate", 0)), reverse=True)

    return {"inventory": items, "total": len(items)}


@router.get("/seller-inventory/returns")
async def get_returns(seller: dict = Depends(get_current_certified_seller)):
    """Get all returned products for this seller."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    returns = [
        i for i in all_items
        if i.get("seller_id") == seller["seller_id"] and i.get("status") in ("returned", "dead")
    ]
    returns.sort(key=lambda x: int(x.get("inventory_age", 0)), reverse=True)
    return {"returns": returns, "total": len(returns)}


@router.get("/seller-inventory/dead")
async def get_dead_inventory(seller: dict = Depends(get_current_certified_seller)):
    """Get dead inventory (returned + low demand + high age)."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    dead = [
        i for i in all_items
        if i.get("seller_id") == seller["seller_id"]
        and (i.get("status") == "dead" or (i.get("status") == "returned" and int(i.get("demand_score", 50)) < 40))
    ]
    dead.sort(key=lambda x: int(x.get("demand_score", 0)))
    return {"dead_inventory": dead, "total": len(dead), "total_value_at_risk": sum(float(i.get("current_price", 0)) for i in dead)}


@router.get("/seller-inventory/stats")
async def get_inventory_stats(seller: dict = Depends(get_current_certified_seller)):
    """Get inventory statistics for dashboard."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    items = [i for i in all_items if i.get("seller_id") == seller["seller_id"]]

    active = [i for i in items if i.get("status") == "active"]
    returned = [i for i in items if i.get("status") == "returned"]
    dead = [i for i in items if i.get("status") == "dead"]
    rescued = [i for i in items if i.get("status") == "rescued"]
    sold = [i for i in items if i.get("status") == "sold"]
    donated = [i for i in items if i.get("status") == "donated"]

    high_demand = [i for i in items if int(i.get("demand_score", 0)) >= 70]
    low_demand = [i for i in items if int(i.get("demand_score", 0)) < 30]

    # Category breakdown
    categories = {}
    for i in items:
        cat = i.get("category", "Other")
        categories[cat] = categories.get(cat, 0) + 1

    # City breakdown
    cities = {}
    for i in items:
        city = i.get("warehouse_city", "Unknown")
        cities[city] = cities.get(city, 0) + 1

    return {
        "total_products": len(items),
        "active": len(active),
        "returned": len(returned),
        "dead": len(dead),
        "rescued": len(rescued),
        "sold": len(sold),
        "donated": len(donated),
        "high_demand": len(high_demand),
        "low_demand": len(low_demand),
        "total_inventory_value": sum(float(i.get("current_price", 0)) for i in items if i.get("status") in ("active", "returned", "dead")),
        "dead_inventory_value": sum(float(i.get("current_price", 0)) for i in dead),
        "avg_inventory_age": int(sum(int(i.get("inventory_age", 0)) for i in items) / max(1, len(items))),
        "avg_return_rate": round(sum(float(i.get("return_rate", 0)) for i in items) / max(1, len(items)), 1),
        "categories": categories,
        "warehouse_distribution": cities,
    }


@router.get("/seller-inventory/{product_id}")
async def get_product_detail(product_id: str, seller: dict = Depends(get_current_certified_seller)):
    """Get single product detail."""
    item = await db.get_item("seller_inventory", {"product_id": product_id})
    if not item or item.get("seller_id") != seller["seller_id"]:
        return {"error": "Product not found"}
    return item
