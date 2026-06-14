"""
Search Router — Marketplace search with auto-suggestions and ranking.
"""
from fastapi import APIRouter, Query
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()


def fuzzy_match(query: str, text: str) -> float:
    """Simple fuzzy match score (0-1). Higher = better match."""
    query_lower = query.lower()
    text_lower = text.lower()

    # Exact substring match
    if query_lower in text_lower:
        return 1.0

    # Word-level matching
    query_words = set(query_lower.split())
    text_words = set(text_lower.split())
    if query_words & text_words:
        return len(query_words & text_words) / max(len(query_words), 1)

    # Character prefix matching
    if text_lower.startswith(query_lower[:3]):
        return 0.5

    return 0.0


def refresh_image_urls(item: dict) -> dict:
    """Regenerate fresh presigned URLs for S3 images."""
    image_urls = item.get("image_urls", [])
    if not image_urls or not s3.available:
        return item

    refreshed = []
    for url in image_urls:
        if url.startswith("https://") and "amazonaws.com" in url:
            try:
                path_with_host = url.split("?")[0]
                if "/products/" in path_with_host:
                    s3_key = "products/" + path_with_host.split("/products/")[1]
                    fresh_url = s3.s3_client.generate_presigned_url(
                        "get_object", Params={"Bucket": s3.bucket_name, "Key": s3_key}, ExpiresIn=604800)
                    refreshed.append(fresh_url)
                else:
                    refreshed.append(url)
            except Exception:
                refreshed.append(url)
        else:
            refreshed.append(url)

    item["image_urls"] = refreshed
    return item


@router.get("/search")
async def search_marketplace(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=50)
):
    """
    Search marketplace products with fuzzy matching.
    Rankings: relevance > green_credits > demand_score > estimated_value
    """
    items = await db.scan_table("sl_products", limit=200)

    # Score and filter
    scored_items = []
    for item in items:
        if item.get("status") != "active":
            continue

        # Match against product name, category, and search keywords
        name_score = fuzzy_match(q, item.get("product_name", ""))
        cat_score = fuzzy_match(q, item.get("category", ""))
        kw_score = fuzzy_match(q, item.get("search_keywords", ""))

        relevance = max(name_score, cat_score * 0.8, kw_score * 0.9)

        if relevance > 0:
            item["_relevance"] = relevance
            item = refresh_image_urls(item)
            scored_items.append(item)

    # Sort: relevance DESC, then green_credits DESC, demand_score DESC, value DESC
    scored_items.sort(key=lambda x: (
        -x.get("_relevance", 0),
        -int(x.get("green_credits", 0)),
        -int(x.get("demand_score", 0)),
        -float(x.get("estimated_value", 0))
    ))

    # Clean up internal scoring field
    results = []
    for item in scored_items[:limit]:
        item.pop("_relevance", None)
        results.append(item)

    return {"results": results, "total": len(results), "query": q}


@router.get("/search/suggest")
async def search_suggestions(
    q: str = Query(..., min_length=1)
):
    """Auto-suggest product names and categories matching partial query."""
    if len(q) < 2:
        return {"suggestions": []}

    items = await db.scan_table("sl_products", limit=200)

    suggestions = set()
    q_lower = q.lower()

    for item in items:
        if item.get("status") != "active":
            continue

        name = item.get("product_name", "")
        category = item.get("category", "")

        # Add matching product names
        if q_lower in name.lower():
            suggestions.add(name)

        # Add matching categories
        if q_lower in category.lower():
            suggestions.add(category)

        # Add keyword-based suggestions
        keywords = item.get("search_keywords", "")
        for word in keywords.split():
            if word.startswith(q_lower) and len(word) > 2:
                suggestions.add(word.title())

    # Limit and sort
    sorted_suggestions = sorted(suggestions)[:8]

    return {"suggestions": sorted_suggestions, "query": q}
