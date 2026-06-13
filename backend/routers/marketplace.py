"""
Marketplace Router — Browse and filter SecondLife listings.
"""
from fastapi import APIRouter, Query
from typing import Optional
from services.dynamodb_service import DynamoDBService

router = APIRouter()
db = DynamoDBService()


@router.get("/marketplace/listings")
async def get_listings(
    category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    limit: int = Query(20, le=50)
):
    """Browse marketplace listings with filters."""
    items = await db.scan_table("sl_products", limit=limit)

    # Apply filters in-memory (for prototype; production would use DynamoDB queries)
    filtered = []
    for item in items:
        if item.get("status") != "active":
            continue
        if category and item.get("category", "").lower() != category.lower():
            continue
        if condition and item.get("condition_grade", "").lower() != condition.lower():
            continue

        # Price filter
        est_value = float(item.get("estimated_value", 0))
        if min_price and est_value < min_price:
            continue
        if max_price and est_value > max_price:
            continue

        filtered.append(item)

    # Sort
    if sort_by == "price":
        filtered.sort(key=lambda x: float(x.get("estimated_value", 0)))
    elif sort_by == "score":
        filtered.sort(key=lambda x: int(x.get("condition_score", 0)), reverse=True)
    else:
        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {
        "listings": filtered,
        "total": len(filtered),
        "page": 1,
        "limit": limit
    }


@router.get("/marketplace/listings/{product_id}")
async def get_listing_detail(product_id: str):
    """Get full product detail with passport."""
    product = await db.get_item("sl_products", {"product_id": product_id})
    if not product:
        return {"error": "Product not found"}

    passport = await db.get_item("sl_passports", {"product_id": product_id})

    return {
        "product": product,
        "passport": passport
    }
