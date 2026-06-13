"""
Green Credits Router — CRUD and leaderboard.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.dynamodb_service import DynamoDBService
from datetime import datetime

router = APIRouter()
db = DynamoDBService()

# Credit amounts per action
CREDIT_AMOUNTS = {
    "sell": 50,
    "donate": 75,
    "buy": 30,
    "exchange": 40
}

LEVELS = [
    (0, "Seedling"),
    (100, "Sapling"),
    (300, "Tree"),
    (700, "Forest"),
    (1500, "Ecosystem")
]


def get_level(total_credits: int) -> str:
    level = "Seedling"
    for threshold, name in LEVELS:
        if total_credits >= threshold:
            level = name
    return level


class AwardRequest(BaseModel):
    action: str
    product_id: str


@router.get("/green/{user_id}")
async def get_green_credits(user_id: str):
    """Fetch user green credits and impact stats."""
    user = await db.get_item("sl_users", {"user_id": user_id})

    if not user:
        # Create default user profile
        user = {
            "user_id": user_id,
            "balance": 150,
            "total_earned": 150,
            "level": "Sapling",
            "co2_saved_kg": 45.2,
            "products_saved": 3,
            "packaging_saved_kg": 2.1,
            "created_at": datetime.utcnow().isoformat()
        }
        await db.put_item("sl_users", user)

    return user


@router.post("/green/{user_id}/award")
async def award_credits(user_id: str, request: AwardRequest):
    """Award Green Credits for a sustainable action."""
    credits_to_award = CREDIT_AMOUNTS.get(request.action, 10)

    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        user = {
            "user_id": user_id,
            "balance": 0,
            "total_earned": 0,
            "level": "Seedling",
            "co2_saved_kg": 0,
            "products_saved": 0,
            "packaging_saved_kg": 0,
            "created_at": datetime.utcnow().isoformat()
        }

    # Update balance
    user["balance"] = int(user.get("balance", 0)) + credits_to_award
    user["total_earned"] = int(user.get("total_earned", 0)) + credits_to_award
    user["products_saved"] = int(user.get("products_saved", 0)) + 1
    user["co2_saved_kg"] = float(user.get("co2_saved_kg", 0)) + 12.0
    user["level"] = get_level(int(user["total_earned"]))
    user["updated_at"] = datetime.utcnow().isoformat()

    await db.put_item("sl_users", user)

    return {
        "message": f"Awarded {credits_to_award} Green Credits for {request.action}",
        "credits_awarded": credits_to_award,
        "new_balance": user["balance"],
        "level": user["level"]
    }


@router.get("/green/leaderboard")
async def get_leaderboard():
    """Top 10 users by Green Credits."""
    users = await db.scan_table("sl_users", limit=50)

    # Sort by balance descending
    sorted_users = sorted(users, key=lambda x: int(x.get("balance", 0)), reverse=True)[:10]

    leaderboard = []
    for i, user in enumerate(sorted_users, 1):
        leaderboard.append({
            "rank": i,
            "user_id": user.get("user_id", "unknown"),
            "balance": int(user.get("balance", 0)),
            "level": user.get("level", "Seedling"),
            "products_saved": int(user.get("products_saved", 0))
        })

    return {"leaderboard": leaderboard}
