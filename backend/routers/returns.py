"""
Returns Router — Customer-initiated Amazon product returns.
Chatbot-style return request → rider pickup → warehouse delivery.
"""
import uuid
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional, List
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from routers.auth import get_current_user
from utils.image_utils import validate_image, resize_image

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()

RETURN_REASONS = [
    "Product not as described",
    "Defective / Damaged",
    "Wrong item delivered",
    "Better price available",
    "No longer needed",
    "Size/fit issue",
    "Quality not satisfactory",
    "Missing parts/accessories",
    "Arrived too late",
    "Changed my mind",
]

CATEGORIES = [
    "Electronics", "Baby Products", "Fashion", "Home", "Kitchen",
    "Books", "Sports", "Personal Care", "Toys", "Furniture",
]

# Map cities to warehouses
CITY_WAREHOUSE = {
    "Mumbai": {"id": "WH-MUM-01", "address": "Plot 45, Bhiwandi, Thane"},
    "Delhi": {"id": "WH-DEL-01", "address": "Sector 62, Noida"},
    "Bengaluru": {"id": "WH-BLR-01", "address": "Devanahalli, Bengaluru North"},
    "Hyderabad": {"id": "WH-HYD-01", "address": "Shamshabad, Rangareddy"},
    "Chennai": {"id": "WH-CHN-01", "address": "Sriperumbudur, Kancheepuram"},
    "Pune": {"id": "WH-PUN-01", "address": "Chakan MIDC, Pune"},
    "Kolkata": {"id": "WH-KOL-01", "address": "Dankuni, Hooghly"},
    "Ahmedabad": {"id": "WH-AMD-01", "address": "Sanand GIDC, Ahmedabad"},
    "Jaipur": {"id": "WH-JAI-01", "address": "Sitapura Industrial Area"},
    "Kochi": {"id": "WH-KOC-01", "address": "Kakkanad, Ernakulam"},
    "Lucknow": {"id": "WH-LKO-01", "address": "Chinhat, Lucknow"},
    "Chandigarh": {"id": "WH-CHD-01", "address": "Industrial Area Phase 1"},
}

# Certified sellers (assigned to first seller for demo — ensures seller portal visibility)
CERTIFIED_SELLERS = ["AMZ-SELLER-1001", "AMZ-SELLER-1002", "AMZ-SELLER-1003", "AMZ-SELLER-1004", "AMZ-SELLER-1005"]
DEFAULT_SELLER = "AMZ-SELLER-1001"


@router.get("/returns/reasons")
async def get_return_reasons():
    """Get list of return reasons and categories for the chatbot UI."""
    return {
        "reasons": RETURN_REASONS,
        "categories": CATEGORIES,
    }


@router.post("/returns/create")
async def create_return(
    product_name: str = Form(...),
    category: str = Form(...),
    order_number: str = Form(""),
    return_reason: str = Form(...),
    description: str = Form(""),
    original_price: float = Form(0),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    """Create a new return request — initiates rider pickup flow."""
    return_id = f"RET-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    customer_city = user.get("city", "Mumbai")

    # Upload image if provided
    image_url = ""
    if image:
        img_bytes = await image.read()
        is_valid, _ = validate_image(img_bytes)
        if is_valid:
            resized = resize_image(img_bytes)
            image_url = await s3.upload_image(resized, f"returns/{return_id}")

    # Determine nearest warehouse
    warehouse = CITY_WAREHOUSE.get(customer_city, CITY_WAREHOUSE["Mumbai"])

    # Assign to the default certified seller (ensures seller portal visibility for demo)
    seller_id = DEFAULT_SELLER

    # Generate pickup OTP
    pickup_otp = str(random.randint(1000, 9999))

    return_record = {
        "return_id": return_id,
        "customer_id": user["user_id"],
        "customer_name": user.get("name", ""),
        "customer_phone": user.get("phone", ""),
        "customer_city": customer_city,
        "customer_address": f"{user.get('name', 'Customer')}'s location, {customer_city}",

        "product_name": product_name,
        "category": category,
        "order_number": order_number or f"AMZ-{random.randint(100, 999)}-{random.randint(1000000, 9999999)}",
        "return_reason": return_reason,
        "description": description,
        "original_price": str(original_price),
        "product_image_url": image_url,

        "seller_id": seller_id,
        "status": "pending",
        "pickup_otp": pickup_otp,
        "rider_id": "",
        "rider_name": "",

        "warehouse_city": customer_city,
        "warehouse_id": warehouse["id"],
        "warehouse_address": warehouse["address"],

        "green_score": 0,
        "listing_price": "0",
        "routed_to_city": "",
        "routing_fee": "0",

        "timeline": [
            {"status": "pending", "timestamp": now, "note": "Return request initiated"}
        ],
        "created_at": now,
    }

    await db.put_item("sl_returns", return_record)

    return {
        "message": "Return request submitted! A delivery partner will be assigned to pick up the item.",
        "return_id": return_id,
        "pickup_otp": pickup_otp,
        "warehouse": warehouse,
        "status": "pending",
    }


@router.get("/returns/my-returns")
async def get_my_returns(user: dict = Depends(get_current_user)):
    """Get all return requests for the current user."""
    all_returns = await db.scan_table("sl_returns", limit=100)
    my_returns = [r for r in all_returns if r.get("customer_id") == user["user_id"]]
    my_returns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"returns": my_returns, "total": len(my_returns)}


# ─── Rider Endpoints for Return Pickups ───────────────────────
# NOTE: These MUST be above /returns/{return_id} to avoid path parameter catching them

from routers.delivery_partner import get_current_delivery_partner


@router.get("/returns/pickup-queue")
async def get_return_pickup_queue(partner: dict = Depends(get_current_delivery_partner)):
    """Available return pickups for delivery partners — only same city as rider."""
    all_returns = await db.scan_table("sl_returns", limit=100)
    partner_city = partner.get("city", "").lower()

    available = [
        r for r in all_returns
        if r.get("status") == "pending"
        and r.get("rider_id", "") == ""
    ]

    # Strict city filter: rider only sees returns from their own city
    if partner_city:
        available = [r for r in available if r.get("customer_city", "").lower() == partner_city]

    # Enrich with earnings
    for r in available:
        r["estimated_earning"] = random.randint(15, 20)
        r["estimated_green_credits"] = 15

    return {"return_pickups": available, "total": len(available)}


@router.get("/returns/{return_id}")
async def get_return_detail(return_id: str):
    """Get return details."""
    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    return ret


@router.post("/returns/accept-pickup")
async def accept_return_pickup(return_id: str, partner: dict = Depends(get_current_delivery_partner)):
    """Rider accepts a return pickup."""
    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret.get("rider_id"):
        raise HTTPException(status_code=400, detail="Already assigned to another rider")

    now = datetime.now(timezone.utc).isoformat()

    ret["rider_id"] = partner["partner_id"]
    ret["rider_name"] = partner["partner_name"]
    ret["status"] = "rider_assigned"

    timeline = ret.get("timeline", [])
    timeline.append({"status": "rider_assigned", "timestamp": now, "note": f"Rider {partner['partner_name']} assigned"})
    ret["timeline"] = timeline

    await db.put_item("sl_returns", ret)

    return {
        "message": f"Return pickup accepted! Go to: {ret.get('customer_name')}. Ask for OTP.",
        "customer_contact": {
            "name": ret.get("customer_name"),
            "phone": ret.get("customer_phone"),
            "address": ret.get("customer_address"),
            "city": ret.get("customer_city"),
        },
        "return_id": return_id,
        "product_name": ret.get("product_name"),
    }


@router.post("/returns/complete-pickup")
async def complete_return_pickup(return_id: str, otp: str, partner: dict = Depends(get_current_delivery_partner)):
    """Rider verifies OTP and confirms pickup from customer."""
    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret.get("pickup_otp") != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if ret.get("rider_id") != partner["partner_id"]:
        raise HTTPException(status_code=403, detail="Not your pickup")

    now = datetime.now(timezone.utc).isoformat()

    ret["status"] = "picked_up"
    timeline = ret.get("timeline", [])
    timeline.append({"status": "picked_up", "timestamp": now, "note": "Picked up from customer (OTP verified)"})
    ret["timeline"] = timeline

    await db.put_item("sl_returns", ret)

    return {
        "message": "Pickup verified! Now deliver to nearest warehouse.",
        "warehouse": {
            "id": ret.get("warehouse_id"),
            "city": ret.get("warehouse_city"),
            "address": ret.get("warehouse_address"),
        },
        "return_id": return_id,
    }


@router.post("/returns/warehouse-drop")
async def warehouse_drop(return_id: str, partner: dict = Depends(get_current_delivery_partner)):
    """Rider confirms product dropped at warehouse."""
    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret.get("rider_id") != partner["partner_id"]:
        raise HTTPException(status_code=403, detail="Not your pickup")

    now = datetime.now(timezone.utc).isoformat()

    ret["status"] = "at_warehouse"
    timeline = ret.get("timeline", [])
    timeline.append({"status": "at_warehouse", "timestamp": now, "note": f"Delivered to {ret.get('warehouse_city')} warehouse ({ret.get('warehouse_id')})"})
    ret["timeline"] = timeline

    await db.put_item("sl_returns", ret)

    # Credit rider earnings
    partner["total_deliveries"] = int(partner.get("total_deliveries", 0)) + 1
    partner["total_earnings"] = str(float(partner.get("total_earnings", 0)) + 18)
    partner["green_credits_earned"] = int(partner.get("green_credits_earned", 0)) + 15
    # Add to green credits history
    gc_history = partner.get("green_credits_history", [])
    gc_history.append({
        "credits": 15,
        "type": "earn",
        "reason": f"Return drop at warehouse: {ret.get('product_name', 'Product')}",
        "return_id": return_id,
        "timestamp": now,
    })
    partner["green_credits_history"] = gc_history
    await db.put_item("delivery_partners", partner)

    return {
        "message": "✅ Product dropped at warehouse! Earnings credited.",
        "return_id": return_id,
        "warehouse_city": ret.get("warehouse_city"),
    }
