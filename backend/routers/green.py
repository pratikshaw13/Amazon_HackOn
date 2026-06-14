"""
Green Credits Router — Credits, rewards marketplace, ledger, impact metrics.
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.dynamodb_service import DynamoDBService
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter()
db = DynamoDBService()

# Credit amounts per action
CREDIT_AMOUNTS = {
    "sell": 50,
    "donate": 75,
    "buy": 30,
    "exchange": 40,
    "cross_city_reuse": 60,
    "waste_prevented": 20,
    "verify_product": 10,
}

# CO2 savings per action (kg)
CO2_SAVINGS = {
    "sell": 12.0,
    "donate": 18.0,
    "buy": 8.0,
    "exchange": 15.0,
    "cross_city_reuse": 25.0,
    "waste_prevented": 5.0,
}

LEVELS = [
    (0, "Seedling"),
    (100, "Sapling"),
    (300, "Tree"),
    (700, "Forest"),
    (1500, "Ecosystem")
]

# Rewards catalog
REWARDS_CATALOG = [
    {"reward_id": "R001", "name": "₹50 Amazon Pay Cashback", "cost": 500, "category": "cashback", "icon": "💰", "description": "Get ₹50 credited to your Amazon Pay balance"},
    {"reward_id": "R002", "name": "₹100 Amazon Pay Cashback", "cost": 900, "category": "cashback", "icon": "💰", "description": "Get ₹100 credited to your Amazon Pay balance"},
    {"reward_id": "R003", "name": "Free Delivery (5 orders)", "cost": 300, "category": "delivery", "icon": "🚚", "description": "Free delivery on your next 5 SecondLife orders"},
    {"reward_id": "R004", "name": "Plant a Tree", "cost": 200, "category": "impact", "icon": "🌳", "description": "We plant a tree in your name via Grow-Trees.com"},
    {"reward_id": "R005", "name": "5 Trees Planted", "cost": 800, "category": "impact", "icon": "🌲", "description": "5 trees planted — you're growing a mini forest!"},
    {"reward_id": "R006", "name": "Earth Tier Badge", "cost": 150, "category": "badge", "icon": "🌍", "description": "Exclusive Earth Tier badge on your profile"},
    {"reward_id": "R007", "name": "10% Off Next Purchase", "cost": 250, "category": "discount", "icon": "🏷️", "description": "10% discount on your next SecondLife purchase"},
    {"reward_id": "R008", "name": "Priority Listing (7 days)", "cost": 400, "category": "boost", "icon": "⚡", "description": "Your listed products appear at the top for 7 days"},
    {"reward_id": "R009", "name": "₹200 NGO Donation", "cost": 350, "category": "charity", "icon": "❤️", "description": "We donate ₹200 to an NGO partner on your behalf"},
    {"reward_id": "R010", "name": "Carbon Offset Certificate", "cost": 600, "category": "impact", "icon": "📜", "description": "Digital certificate for 100kg CO₂ offset"},
]


def get_level(total_credits: int) -> str:
    level = "Seedling"
    for threshold, name in LEVELS:
        if total_credits >= threshold:
            level = name
    return level


def get_level_progress(total_credits: int) -> dict:
    """Get current level and progress to next."""
    current_level = "Seedling"
    current_threshold = 0
    next_threshold = 100
    next_level = "Sapling"

    for i, (threshold, name) in enumerate(LEVELS):
        if total_credits >= threshold:
            current_level = name
            current_threshold = threshold
            if i + 1 < len(LEVELS):
                next_threshold = LEVELS[i + 1][0]
                next_level = LEVELS[i + 1][1]
            else:
                next_threshold = threshold + 500
                next_level = "Max Level"

    progress = min(100, int(((total_credits - current_threshold) / max(1, next_threshold - current_threshold)) * 100))

    return {
        "current_level": current_level,
        "next_level": next_level,
        "progress_pct": progress,
        "credits_to_next": max(0, next_threshold - total_credits),
    }


class AwardRequest(BaseModel):
    action: str
    product_id: str


class RedeemRequest(BaseModel):
    reward_id: str


# ─── Endpoints ────────────────────────────────────────────────

@router.get("/green/{user_id}")
async def get_green_credits(user_id: str):
    """Fetch user green credits, impact stats, and level progress."""
    user = await db.get_item("sl_users", {"user_id": user_id})

    if not user:
        user = {
            "user_id": user_id,
            "green_credits": 0,
            "total_earned": 0,
            "level": "Seedling",
            "co2_saved_kg": 0,
            "products_saved": 0,
            "packaging_saved_kg": 0,
            "trees_planted": 0,
            "circular_economy_score": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        await db.put_item("sl_users", user)

    balance = int(user.get("green_credits", 0))
    total = int(user.get("total_earned", balance))
    level_info = get_level_progress(total)

    return {
        "user_id": user_id,
        "balance": balance,
        "total_earned": total,
        "level": level_info["current_level"],
        "level_progress": level_info,
        "impact": {
            "co2_saved_kg": float(user.get("co2_saved_kg", 0)),
            "products_saved": int(user.get("products_saved", 0)),
            "packaging_saved_kg": float(user.get("packaging_saved_kg", 0)),
            "trees_planted": int(user.get("trees_planted", 0)),
            "circular_economy_score": min(100, int(total / 15)),
        }
    }


@router.post("/green/{user_id}/award")
async def award_credits(user_id: str, request: AwardRequest):
    """Award Green Credits for a sustainable action."""
    credits_to_award = CREDIT_AMOUNTS.get(request.action, 10)
    co2 = CO2_SAVINGS.get(request.action, 8.0)

    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        user = {
            "user_id": user_id,
            "green_credits": 0,
            "total_earned": 0,
            "level": "Seedling",
            "co2_saved_kg": 0,
            "products_saved": 0,
            "packaging_saved_kg": 0,
            "trees_planted": 0,
            "credit_history": [],
            "created_at": datetime.utcnow().isoformat()
        }

    user["green_credits"] = int(user.get("green_credits", 0)) + credits_to_award
    user["total_earned"] = int(user.get("total_earned", 0)) + credits_to_award
    user["products_saved"] = int(user.get("products_saved", 0)) + 1
    user["co2_saved_kg"] = float(user.get("co2_saved_kg", 0)) + co2
    user["packaging_saved_kg"] = float(user.get("packaging_saved_kg", 0)) + 0.8
    user["level"] = get_level(int(user["total_earned"]))

    # Append to credit ledger
    history = user.get("credit_history", [])
    history.append({
        "id": str(uuid.uuid4())[:8],
        "action": request.action,
        "type": "earn",
        "credits": credits_to_award,
        "co2_saved": co2,
        "product_id": request.product_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    user["credit_history"] = history
    user["updated_at"] = datetime.utcnow().isoformat()

    await db.put_item("sl_users", user)

    return {
        "message": f"Awarded {credits_to_award} Green Credits for {request.action}",
        "credits_awarded": credits_to_award,
        "co2_saved": co2,
        "new_balance": user["green_credits"],
        "level": user["level"]
    }


@router.get("/green/{user_id}/ledger")
async def get_credit_ledger(user_id: str):
    """Get complete credit transaction history for a user."""
    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        return {"ledger": [], "total_earned": 0, "total_spent": 0}

    history = user.get("credit_history", [])
    # Sort newest first
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    total_earned = sum(h.get("credits", 0) for h in history if h.get("type") != "redeem")
    total_spent = sum(h.get("credits", 0) for h in history if h.get("type") == "redeem")

    return {
        "ledger": history[:50],
        "total_earned": total_earned,
        "total_spent": total_spent,
        "net_balance": int(user.get("green_credits", 0))
    }


@router.get("/green/rewards/catalog")
async def get_rewards_catalog():
    """Get available rewards for redemption."""
    return {"rewards": REWARDS_CATALOG}


@router.post("/green/{user_id}/redeem")
async def redeem_reward(user_id: str, request: RedeemRequest):
    """Redeem green credits for a reward."""
    # Find reward
    reward = None
    for r in REWARDS_CATALOG:
        if r["reward_id"] == request.reward_id:
            reward = r
            break

    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    balance = int(user.get("green_credits", 0))
    if balance < reward["cost"]:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {reward['cost']}, have {balance}")

    # Deduct credits
    user["green_credits"] = balance - reward["cost"]

    # Track trees planted
    if "tree" in reward["name"].lower() or "plant" in reward["name"].lower():
        trees = 5 if "5" in reward["name"] else 1
        user["trees_planted"] = int(user.get("trees_planted", 0)) + trees

    # Add to history
    history = user.get("credit_history", [])
    history.append({
        "id": str(uuid.uuid4())[:8],
        "action": f"redeemed_{reward['reward_id']}",
        "type": "redeem",
        "credits": reward["cost"],
        "reward_name": reward["name"],
        "timestamp": datetime.utcnow().isoformat()
    })
    user["credit_history"] = history
    user["updated_at"] = datetime.utcnow().isoformat()

    await db.put_item("sl_users", user)

    return {
        "message": f"🎉 Redeemed: {reward['name']}",
        "reward": reward,
        "credits_spent": reward["cost"],
        "new_balance": user["green_credits"]
    }


@router.get("/green/impact/platform")
async def get_platform_impact():
    """Get platform-wide sustainability metrics."""
    users = await db.scan_table("sl_users", limit=500)

    total_co2 = sum(float(u.get("co2_saved_kg", 0)) for u in users)
    total_products = sum(int(u.get("products_saved", 0)) for u in users)
    total_credits = sum(int(u.get("green_credits", 0)) for u in users)
    total_trees = sum(int(u.get("trees_planted", 0)) for u in users)
    active_users = len([u for u in users if int(u.get("green_credits", 0)) > 0])

    return {
        "total_co2_saved_kg": round(total_co2, 1),
        "total_co2_saved_tons": round(total_co2 / 1000, 2),
        "total_products_saved": total_products,
        "total_credits_in_circulation": total_credits,
        "total_trees_planted": total_trees,
        "active_green_users": active_users,
        "packaging_saved_kg": round(total_products * 0.8, 1),
        "equivalent_car_km_saved": int(total_co2 * 6.5),  # ~6.5 km per kg CO2
        "circular_economy_score": min(100, int(total_products / max(1, active_users) * 10)),
    }


@router.get("/green/leaderboard")
async def get_leaderboard():
    """Top 10 users by Green Credits."""
    users = await db.scan_table("sl_users", limit=100)
    sorted_users = sorted(users, key=lambda x: int(x.get("green_credits", 0)), reverse=True)[:10]

    leaderboard = []
    for i, user in enumerate(sorted_users, 1):
        leaderboard.append({
            "rank": i,
            "user_id": user.get("user_id", "unknown"),
            "name": user.get("name", "Anonymous"),
            "balance": int(user.get("green_credits", 0)),
            "level": get_level(int(user.get("total_earned", user.get("green_credits", 0)))),
            "products_saved": int(user.get("products_saved", 0)),
            "co2_saved_kg": float(user.get("co2_saved_kg", 0)),
        })

    return {"leaderboard": leaderboard}
