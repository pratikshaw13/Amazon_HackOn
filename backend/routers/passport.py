"""
Passport Router — Product Health Passport CRUD.
"""
from fastapi import APIRouter, HTTPException
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from models.passport import PassportUpdate
from datetime import datetime

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()


def refresh_image_urls(item: dict) -> dict:
    """Generate fresh presigned URLs for S3 images."""
    image_urls = item.get("image_urls", [])
    if not image_urls or not s3.available:
        return item

    refreshed = []
    for url in image_urls:
        s3_key = None

        if url.startswith("https://") and "amazonaws.com" in url:
            try:
                path_with_host = url.split("?")[0]
                if "/products/" in path_with_host:
                    s3_key = "products/" + path_with_host.split("/products/")[1]
                elif s3.bucket_name in path_with_host:
                    s3_key = path_with_host.split(".amazonaws.com/")[1]
            except (IndexError, Exception):
                pass
        elif url.startswith("products/"):
            s3_key = url

        if s3_key:
            try:
                fresh_url = s3.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": s3.bucket_name, "Key": s3_key},
                    ExpiresIn=604800
                )
                refreshed.append(fresh_url)
            except Exception:
                refreshed.append(url)
        else:
            refreshed.append(url)

    item["image_urls"] = refreshed
    return item


@router.get("/passport/{product_id}")
async def get_passport(product_id: str):
    """Fetch the full Health Passport for a product with fresh image URLs."""
    passport = await db.get_item("sl_passports", {"product_id": product_id})

    if not passport:
        raise HTTPException(status_code=404, detail="Health Passport not found")

    # Refresh S3 image URLs
    passport = refresh_image_urls(passport)
    return passport


@router.post("/passport/{product_id}")
async def update_passport(product_id: str, update: PassportUpdate):
    """Add an ownership event to the passport."""
    passport = await db.get_item("sl_passports", {"product_id": product_id})

    if not passport:
        raise HTTPException(status_code=404, detail="Health Passport not found")

    # Add new event to ownership history
    new_event = {
        "event_type": update.event_type,
        "date": datetime.utcnow().isoformat(),
        "description": update.description,
        "actor": update.actor or "system"
    }

    history = passport.get("ownership_history", [])
    history.append(new_event)
    passport["ownership_history"] = history
    passport["updated_at"] = datetime.utcnow().isoformat()

    await db.put_item("sl_passports", passport)

    return {"message": "Passport updated", "event": new_event}
