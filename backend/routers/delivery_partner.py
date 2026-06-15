"""
Delivery Partner Router — Amazon Flex-style delivery partner authentication and profile.
Partners cannot self-register. Accounts are pre-approved.
Login: Partner ID + Phone + Aadhaar last 4 digits.
"""
import os
import warnings
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from services.dynamodb_service import DynamoDBService

warnings.filterwarnings("ignore", ".*error reading bcrypt version.*")

router = APIRouter()
db = DynamoDBService()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
bearer_scheme = HTTPBearer(auto_error=False)


class DeliveryLoginRequest(BaseModel):
    partner_id: str
    phone: str
    aadhaar_last4: str


# ─── Dependency ───────────────────────────────────────────────

async def get_current_delivery_partner(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """Extract delivery partner from JWT."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        partner_id = payload.get("sub")
        if not partner_id or not partner_id.startswith("FLEX-DEL"):
            raise HTTPException(status_code=401, detail="Invalid delivery partner token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    partner = await db.get_item("delivery_partners", {"partner_id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return partner


# ─── Endpoints ────────────────────────────────────────────────

@router.post("/delivery-partner/login")
async def delivery_partner_login(request: DeliveryLoginRequest):
    """
    Delivery partner login. Requires partner_id + phone + aadhaar_last4.
    """
    if not request.partner_id.startswith("FLEX-DEL-"):
        raise HTTPException(status_code=400, detail="Invalid Partner ID format. Must be FLEX-DEL-XXXX")

    partner = await db.get_item("delivery_partners", {"partner_id": request.partner_id})
    if not partner:
        raise HTTPException(status_code=401, detail="Partner ID not found. Only pre-approved delivery partners can access this portal.")

    # Verify phone
    stored_phone = partner.get("phone", "")
    if stored_phone != request.phone:
        raise HTTPException(status_code=401, detail="Phone number does not match.")

    # Verify Aadhaar last 4
    stored_aadhaar = partner.get("aadhaar_last4", "")
    if stored_aadhaar != request.aadhaar_last4:
        raise HTTPException(status_code=401, detail="Aadhaar verification failed.")

    # Update last login
    partner["last_login"] = datetime.now(timezone.utc).isoformat()
    partner["current_status"] = "available"
    await db.put_item("delivery_partners", partner)

    # Generate token
    token = jwt.encode(
        {
            "sub": partner["partner_id"],
            "name": partner["partner_name"],
            "city": partner.get("city", ""),
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "type": "delivery_partner"
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "city": partner.get("city", ""),
        "vehicle_type": partner.get("vehicle_type", ""),
    }


@router.get("/delivery-partner/me")
async def get_partner_profile(partner: dict = Depends(get_current_delivery_partner)):
    """Get current delivery partner profile."""
    safe = {k: v for k, v in partner.items() if k not in ("password_hash", "aadhaar_last4")}
    return safe


@router.get("/delivery-partner/dashboard")
async def get_partner_dashboard(partner: dict = Depends(get_current_delivery_partner)):
    """Dashboard stats for delivery partner."""
    total_deliveries = int(partner.get("total_deliveries", 0))
    total_earnings = float(partner.get("total_earnings", 0))
    green_credits = int(partner.get("green_credits_earned", 0))
    orders_accepted = int(partner.get("orders_accepted", 0))
    orders_rejected = int(partner.get("orders_rejected", 0))

    # Calculate flex earnings
    hours_worked = total_deliveries * 0.5  # ~30 min per delivery
    flex_blocks = hours_worked / 4
    flex_base = flex_blocks * 470
    per_delivery_bonus = total_deliveries * 17.5  # avg ₹17.5 per delivery

    return {
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "city": partner.get("city", ""),
        "vehicle_type": partner.get("vehicle_type", ""),
        "rating": float(partner.get("rating", 0)),
        "current_status": partner.get("current_status", "offline"),
        "stats": {
            "total_deliveries": total_deliveries,
            "total_earnings": total_earnings,
            "green_credits_earned": green_credits,
            "orders_accepted": orders_accepted,
            "orders_rejected": orders_rejected,
            "flex_base_earned": round(flex_base),
            "per_delivery_bonus": round(per_delivery_bonus),
            "avg_per_delivery": round(total_earnings / max(1, total_deliveries)),
        }
    }


@router.post("/delivery-partner/go-online")
async def go_online(partner: dict = Depends(get_current_delivery_partner)):
    """Set partner status to available."""
    partner["current_status"] = "available"
    await db.put_item("delivery_partners", partner)
    return {"status": "available", "message": "You're now online and can accept pickups!"}


@router.post("/delivery-partner/go-offline")
async def go_offline(partner: dict = Depends(get_current_delivery_partner)):
    """Set partner status to offline."""
    partner["current_status"] = "offline"
    await db.put_item("delivery_partners", partner)
    return {"status": "offline", "message": "You're now offline."}


@router.get("/delivery-partner/history")
async def get_delivery_history(partner: dict = Depends(get_current_delivery_partner)):
    """Get all completed deliveries for this partner."""
    all_orders = await db.scan_table("delivery_orders", limit=200)
    my_orders = [
        o for o in all_orders
        if o.get("partner_id") == partner["partner_id"]
        and o.get("status") == "completed"
    ]
    my_orders.sort(key=lambda x: x.get("completed_at", x.get("created_at", "")), reverse=True)

    return {"deliveries": my_orders, "total": len(my_orders)}


@router.get("/delivery-partner/earnings")
async def get_earnings_breakdown(partner: dict = Depends(get_current_delivery_partner)):
    """Detailed earnings breakdown."""
    all_orders = await db.scan_table("delivery_orders", limit=200)
    completed = [
        o for o in all_orders
        if o.get("partner_id") == partner["partner_id"]
        and o.get("status") == "completed"
    ]

    total_earnings = float(partner.get("total_earnings", 0))
    total_deliveries = int(partner.get("total_deliveries", 0))
    green_credits = int(partner.get("green_credits_earned", 0))

    # Calculate breakdowns
    hours_worked = total_deliveries * 0.5
    flex_blocks = hours_worked / 4
    flex_base = flex_blocks * 470
    per_delivery_total = sum(float(o.get("earning", 0)) for o in completed)

    # Per-delivery log
    delivery_log = []
    for o in completed[:20]:
        delivery_log.append({
            "order_id": o.get("order_id"),
            "product_name": o.get("product_name"),
            "date": o.get("completed_at", o.get("created_at", "")),
            "earning": float(o.get("earning", 0)),
            "green_credits": int(o.get("green_credits", 0)),
            "distance_km": float(o.get("distance_km", 0)),
            "seller_city": o.get("seller_city", ""),
        })

    # Today's earnings
    today = datetime.now(timezone.utc).date().isoformat()
    today_orders = [o for o in completed if o.get("completed_at", "").startswith(today)]
    today_earnings = sum(float(o.get("earning", 0)) for o in today_orders)
    today_credits = sum(int(o.get("green_credits", 0)) for o in today_orders)

    return {
        "summary": {
            "total_earnings": total_earnings,
            "total_deliveries": total_deliveries,
            "green_credits_earned": green_credits,
            "flex_base_earned": round(flex_base),
            "per_delivery_earned": round(per_delivery_total),
            "avg_per_delivery": round(total_earnings / max(1, total_deliveries)),
            "hours_worked_approx": round(hours_worked, 1),
            "today_earnings": today_earnings,
            "today_deliveries": len(today_orders),
            "today_green_credits": today_credits,
        },
        "delivery_log": delivery_log,
        "rate_card": {
            "flex_base_per_4hr": 470,
            "per_delivery_min": 15,
            "per_delivery_max": 20,
            "green_credits_per_delivery": 15,
            "peak_hour_bonus": 5,
            "high_rating_bonus": 3,
        }
    }


@router.post("/delivery-partner/update-city")
async def update_rider_city(data: dict, partner: dict = Depends(get_current_delivery_partner)):
    """Update delivery partner's city."""
    city = data.get("city", "")
    if not city:
        raise HTTPException(status_code=400, detail="City is required")

    partner["city"] = city
    await db.put_item("delivery_partners", partner)

    return {"message": f"City updated to {city}", "city": city}


@router.get("/delivery-partner/green-credits")
async def get_rider_green_credits(partner: dict = Depends(get_current_delivery_partner)):
    """Get delivery partner's green credits balance and history."""
    balance = int(partner.get("green_credits_earned", 0))
    history = partner.get("green_credits_history", [])
    # Sort newest first
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    total_earned = sum(h.get("credits", 0) for h in history if h.get("type") == "earn")
    total_redeemed = sum(h.get("credits", 0) for h in history if h.get("type") == "redeem")

    return {
        "balance": balance,
        "total_earned": total_earned,
        "total_redeemed": total_redeemed,
        "history": history[:50],
    }


@router.post("/delivery-partner/redeem-credits")
async def redeem_rider_credits(data: dict, partner: dict = Depends(get_current_delivery_partner)):
    """Redeem green credits for a voucher/coupon."""
    amount = int(data.get("amount", 0))
    voucher_type = data.get("voucher_type", "")

    if not amount or not voucher_type:
        raise HTTPException(status_code=400, detail="Amount and voucher type required")

    balance = int(partner.get("green_credits_earned", 0))
    if balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Have {balance}, need {amount}")

    import random, string
    voucher_code = "SL-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    partner["green_credits_earned"] = balance - amount
    gc_history = partner.get("green_credits_history", [])
    gc_history.append({
        "credits": amount,
        "type": "redeem",
        "reason": f"Redeemed: {voucher_type}",
        "voucher_code": voucher_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    partner["green_credits_history"] = gc_history
    await db.put_item("delivery_partners", partner)

    return {
        "message": f"🎉 Redeemed {amount} credits for {voucher_type}!",
        "voucher_code": voucher_code,
        "new_balance": partner["green_credits_earned"],
    }
