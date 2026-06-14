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
    Handles all URL formats stored in DynamoDB:
    - https://s3.ap-south-1.amazonaws.com/bucket/key          (path-style, regional)
    - https://s3.amazonaws.com/bucket/key                      (path-style, global)
    - https://bucket.s3.amazonaws.com/key?params               (virtual-hosted + presigned)
    - https://bucket.s3.region.amazonaws.com/key?params        (virtual-hosted regional + presigned)
    - products/uuid/file.jpg                                   (raw key)
    - /api/v1/images/...                                       (local fallback — no S3 object)
    """
    image_urls = item.get("image_urls", [])
    if not image_urls or not s3.available:
        return item

    refreshed_urls = []
    bucket = s3.bucket_name  # e.g. "secondlife-ai-products"

    for url in image_urls:
        s3_key = None
        url_str = str(url).split("?")[0]  # strip query params / presign signature

        if url_str.startswith("https://") and "amazonaws.com" in url_str:
            try:
                # ── Path-style URLs ──────────────────────────────────────────
                # https://s3.amazonaws.com/bucket/key
                # https://s3.region.amazonaws.com/bucket/key
                if url_str.startswith("https://s3.") and "/amazonaws.com/" not in url_str:
                    # e.g. https://s3.ap-south-1.amazonaws.com/secondlife-ai-products/products/...
                    after_host = url_str.split(".amazonaws.com/", 1)[1]  # "bucket/key"
                    if after_host.startswith(bucket + "/"):
                        s3_key = after_host[len(bucket) + 1:]

                # ── Virtual-hosted style URLs ────────────────────────────────
                # https://bucket.s3.amazonaws.com/key
                # https://bucket.s3.region.amazonaws.com/key
                elif url_str.startswith(f"https://{bucket}.s3."):
                    after_host = url_str.split(".amazonaws.com/", 1)[1]  # "key"
                    s3_key = after_host

                # ── Generic fallback: look for /products/ in the path ────────
                if not s3_key and "/products/" in url_str:
                    s3_key = "products/" + url_str.split("/products/", 1)[1]

            except Exception:
                pass

        elif url_str.startswith("products/"):
            # Raw key already
            s3_key = url_str

        # /api/v1/images/... — local fallback, no real S3 object
        # Leave these as-is; they won't load but we can't fix them

        if s3_key:
            try:
                fresh_url = s3.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": s3_key},
                    ExpiresIn=604800  # 7 days
                )
                refreshed_urls.append(fresh_url)
            except Exception:
                refreshed_urls.append(url)  # keep original on error
        else:
            refreshed_urls.append(url)

    item["image_urls"] = refreshed_urls
    return item


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
    """Browse marketplace listings with filters. Returns fresh S3 image URLs."""
    items = await db.scan_table("sl_products", limit=limit)

    # Apply filters in-memory
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
