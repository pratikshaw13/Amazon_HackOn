"""
Passport Router — Product Health Passport CRUD.
"""
from fastapi import APIRouter, HTTPException
from services.dynamodb_service import DynamoDBService
from models.passport import PassportUpdate
from datetime import datetime

router = APIRouter()
db = DynamoDBService()


@router.get("/passport/{product_id}")
async def get_passport(product_id: str):
    """Fetch the full Health Passport for a product."""
    passport = await db.get_item("sl_passports", {"product_id": product_id})

    if not passport:
        raise HTTPException(status_code=404, detail="Health Passport not found")

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
