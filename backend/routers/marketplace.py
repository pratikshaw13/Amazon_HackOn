"""
Marketplace Router — Browse and filter SecondLife listings.
Generates fresh S3 presigned URLs for product images on every request.
"""
from fastapi import APIRouter, Query
from typing import Optional
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()


def refresh_image_urls(item: dict) -> dict:
    """
    Regenerate fresh presigned URLs for S3 images.
    Handles multiple URL formats stored in DynamoDB:
    - https://bucket.s3.amazonaws.com/key?params
    - https://bucket.s3.region.amazonaws.com/key?params
    - products/uuid/file.jpg (raw key)
    - /api/v1/images/... (local fallback)
    """
    image_urls = item.get("image_urls", [])
    if not image_urls or not s3.available:
        return item

    refreshed_urls = []
    for url in image_urls:
        s3_key = None

        if url.startswith("https://") and "amazonaws.com" in url:
            # Extract S3 key from URL — handle both global and regional endpoints
            try:
                # Remove query params first
                path_with_host = url.split("?")[0]
                # Format 1: https://bucket.s3.amazonaws.com/key
                # Format 2: https://bucket.s3.region.amazonaws.com/key
                if "/" + "products/" in path_with_host:
                    s3_key = "products/" + path_with_host.split("/products/")[1]
                elif s3.bucket_name in path_with_host:
                    # Get everything after the bucket hostname
                    after_host = path_with_host.split(".amazonaws.com/")[1]
                    s3_key = after_host
            except (IndexError, Exception):
                pass

        elif url.startswith("products/"):
            s3_key = url

        if s3_key:
            try:
                fresh_url = s3.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": s3.bucket_name, "Key": s3_key},
                    ExpiresIn=604800  # 7 days
                )
                refreshed_urls.append(fresh_url)
            except Exception:
                refreshed_urls.append(url)
        else:
            # Local fallback URL or unrecognized format — keep as-is
            refreshed_urls.append(url)

    item["image_urls"] = refreshed_urls
    return item


@router.get("/marketplace/listings")
async def get_listings(
    category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    buyer_city: Optional[str] = Query(None),
    buyer_state: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    limit: int = Query(20, le=50)
):
    """Browse marketplace listings filtered by buyer's state for location-based visibility."""
    items = await db.scan_table("sl_products", limit=200)

    # Apply filters in-memory
    filtered = []
    for item in items:
        if item.get("status") != "active":
            continue
        if category and item.get("category", "").lower() != category.lower():
            continue
        if condition and item.get("condition_grade", "").lower() != condition.lower():
            continue

        # State-based visibility filter
        if buyer_state:
            listing_scope = item.get("listing_scope", "")
            listing_state = item.get("listing_state", "")
            listing_city = item.get("listing_city", item.get("city", ""))

            if listing_scope == "regional":
                # Regional = national visibility (all states can see)
                pass
            elif listing_state:
                # Has a state set — only visible to same state buyers
                if buyer_state.lower() != listing_state.lower():
                    continue
            elif listing_city:
                # No state stored, but has city — try to match via city→state map
                from routers._city_state_map import CITY_STATE_MAP
                product_state = CITY_STATE_MAP.get(listing_city, "")
                if product_state and buyer_state.lower() != product_state.lower():
                    continue
            # If no state, no city, no scope (truly old data) — show to everyone as fallback

        # Price filter
        est_value = float(item.get("estimated_value", 0))
        if min_price and est_value < min_price:
            continue
        if max_price and est_value > max_price:
            continue

        # Refresh S3 image URLs
        item = refresh_image_urls(item)
        filtered.append(item)

    # Sort
    if sort_by == "price":
        filtered.sort(key=lambda x: float(x.get("estimated_value", 0)))
    elif sort_by == "score":
        filtered.sort(key=lambda x: int(x.get("condition_score", 0)), reverse=True)
    else:
        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    # Apply response limit
    filtered = filtered[:limit]

    return {
        "listings": filtered,
        "total": len(filtered),
        "page": 1,
        "limit": limit
    }


@router.get("/marketplace/listings/{product_id}")
async def get_listing_detail(product_id: str):
    """Get full product detail with passport and fresh image URLs."""
    product = await db.get_item("sl_products", {"product_id": product_id})
    if not product:
        return {"error": "Product not found"}

    # Refresh image URLs
    product = refresh_image_urls(product)

    passport = await db.get_item("sl_passports", {"product_id": product_id})
    if passport:
        passport = refresh_image_urls(passport)

    return {
        "product": product,
        "passport": passport
    }


@router.post("/marketplace/expand-area/{product_id}")
async def expand_listing_area(product_id: str):
    """Expand a local listing to regional (neighbouring cities)."""
    product = await db.get_item("sl_products", {"product_id": product_id})
    if not product:
        return {"error": "Product not found"}
    if product.get("listing_scope") == "regional":
        return {"message": "Already listed for neighbouring cities", "listing_scope": "regional"}

    product["listing_scope"] = "regional"
    await db.put_item("sl_products", product)

    return {
        "message": "Search area expanded! Your product is now visible to neighbouring cities.",
        "listing_scope": "regional",
        "note": "Green credits on sale will be +30 instead of +50"
    }
