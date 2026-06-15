"""
Seller Analytics Router — Revenue, trends, category performance, warehouse metrics.
"""
from fastapi import APIRouter, Depends
from services.dynamodb_service import DynamoDBService
from routers.certified_seller import get_current_certified_seller

router = APIRouter()
db = DynamoDBService()


@router.get("/seller-analytics/overview")
async def get_analytics_overview(seller: dict = Depends(get_current_certified_seller)):
    """Complete analytics overview for the seller."""
    all_items = await db.scan_table("seller_inventory", limit=200)
    items = [i for i in all_items if i.get("seller_id") == seller["seller_id"]]

    # Also fetch returns data for this seller (marketplace revenue from returns)
    all_returns = await db.scan_table("sl_returns", limit=200)
    seller_returns = [r for r in all_returns if r.get("seller_id") == seller["seller_id"]]
    listed_returns = [r for r in seller_returns if r.get("status") == "listed"]

    # Status counts
    active = [i for i in items if i.get("status") == "active"]
    returned = [i for i in items if i.get("status") == "returned"]
    dead = [i for i in items if i.get("status") == "dead"]
    rescued = [i for i in items if i.get("status") == "rescued"]
    sold = [i for i in items if i.get("status") == "sold"]
    donated = [i for i in items if i.get("status") == "donated"]

    # Revenue — from inventory sold + from return listings sold
    inventory_revenue = sum(float(i.get("current_price", 0)) for i in sold)
    returns_revenue = sum(float(r.get("listing_price", 0)) for r in listed_returns)
    total_revenue = inventory_revenue + returns_revenue

    active_value = sum(float(i.get("current_price", 0)) for i in active)
    dead_value = sum(float(i.get("current_price", 0)) for i in dead)
    rescued_value = sum(float(i.get("current_price", 0)) for i in rescued)

    # Green credits from seller record
    green_credits_balance = int(seller.get("green_credits", 0))

    # Return rate
    total_products = len(items)
    return_rate = round((len(returned) + len(dead)) / max(1, total_products) * 100, 1)

    # Avg inventory age
    avg_age = int(sum(int(i.get("inventory_age", 0)) for i in items) / max(1, len(items)))

    # Category performance
    categories = {}
    for item in items:
        cat = item.get("category", "Other")
        if cat not in categories:
            categories[cat] = {"total": 0, "sold": 0, "returned": 0, "dead": 0, "revenue": 0, "avg_demand": 0, "demand_sum": 0}
        categories[cat]["total"] += 1
        categories[cat]["demand_sum"] += int(item.get("demand_score", 0))
        categories[cat]["avg_demand"] = categories[cat]["demand_sum"] // categories[cat]["total"]
        if item.get("status") == "sold":
            categories[cat]["sold"] += 1
            categories[cat]["revenue"] += float(item.get("current_price", 0))
        elif item.get("status") == "returned":
            categories[cat]["returned"] += 1
        elif item.get("status") == "dead":
            categories[cat]["dead"] += 1

    # Warehouse distribution
    warehouses = {}
    for item in items:
        city = item.get("warehouse_city", "Unknown")
        if city not in warehouses:
            warehouses[city] = {"total": 0, "active": 0, "dead": 0, "value": 0}
        warehouses[city]["total"] += 1
        warehouses[city]["value"] += float(item.get("current_price", 0))
        if item.get("status") == "active":
            warehouses[city]["active"] += 1
        elif item.get("status") == "dead":
            warehouses[city]["dead"] += 1

    # Top/Bottom products by demand
    sorted_by_demand = sorted(items, key=lambda x: int(x.get("demand_score", 0)), reverse=True)
    top_demand = sorted_by_demand[:5]
    low_demand = sorted_by_demand[-5:]

    # Products saved from liquidation
    products_saved = len(rescued) + len(donated) + len(listed_returns)

    return {
        "summary": {
            "total_products": total_products,
            "total_revenue": total_revenue,
            "inventory_revenue": inventory_revenue,
            "returns_revenue": returns_revenue,
            "active_inventory_value": active_value,
            "dead_inventory_value": dead_value,
            "recovered_value": rescued_value,
            "return_rate": return_rate,
            "avg_inventory_age": avg_age,
            "products_saved_from_liquidation": products_saved,
            "green_score": int(seller.get("green_score", 0)),
            "green_credits": green_credits_balance,
            "returns_listed": len(listed_returns),
            "returns_at_warehouse": len([r for r in seller_returns if r.get("status") == "at_warehouse"]),
            "returns_in_transit": len([r for r in seller_returns if r.get("status") in ("pending", "rider_assigned", "picked_up")]),
        },
        "status_breakdown": {
            "active": len(active),
            "returned": len(returned),
            "dead": len(dead),
            "rescued": len(rescued),
            "sold": len(sold),
            "donated": len(donated),
        },
        "category_performance": categories,
        "warehouse_distribution": warehouses,
        "top_demand_products": [
            {"name": p.get("product_name"), "demand": p.get("demand_score"), "price": p.get("current_price"), "status": p.get("status")}
            for p in top_demand
        ],
        "low_demand_products": [
            {"name": p.get("product_name"), "demand": p.get("demand_score"), "price": p.get("current_price"), "status": p.get("status")}
            for p in low_demand
        ],
    }
