"""
Delivery Orders Router — Pickup queue, accept, status updates, tracking.
When a user lists a product, a delivery order is auto-created.
Delivery partners can see and accept available pickups.
"""
import uuid
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.dynamodb_service import DynamoDBService
from routers.delivery_partner import get_current_delivery_partner
from routers.auth import get_current_user

router = APIRouter()
db = DynamoDBService()

WAREHOUSES = {
    "Mumbai": {"name": "Amazon WH Mumbai", "address": "Plot 45, Bhiwandi, Thane"},
    "Delhi": {"name": "Amazon WH Delhi", "address": "Sector 62, Noida"},
    "Bengaluru": {"name": "Amazon WH Bengaluru", "address": "Devanahalli, Bengaluru North"},
    "Hyderabad": {"name": "Amazon WH Hyderabad", "address": "Shamshabad, Rangareddy"},
    "Chennai": {"name": "Amazon WH Chennai", "address": "Sriperumbudur, Kancheepuram"},
    "Pune": {"name": "Amazon WH Pune", "address": "Chakan MIDC, Pune"},
    "Kolkata": {"name": "Amazon WH Kolkata", "address": "Dankuni, Hooghly"},
    "Ahmedabad": {"name": "Amazon WH Ahmedabad", "address": "Sanand GIDC, Ahmedabad"},
    "Jaipur": {"name": "Amazon WH Jaipur", "address": "Sitapura Industrial Area"},
    "Kochi": {"name": "Amazon WH Kochi", "address": "Kakkanad, Ernakulam"},
}


class AcceptOrderRequest(BaseModel):
    order_id: str


class UpdateStatusRequest(BaseModel):
    order_id: str
    status: str  # in_transit | picked_up | delivered_to_warehouse | completed
    lat: Optional[float] = None
    lng: Optional[float] = None


# ─── Delivery Partner Endpoints ───────────────────

@router.get("/delivery-orders/available")
async def get_available_pickups(partner: dict = Depends(get_current_delivery_partner)):
    """Get all pending delivery orders in partner's city (sorted by green credits)."""
    all_orders = await db.scan_table("delivery_orders", limit=100)

    # Filter: pending orders in partner's city (or all cities for demo)
    partner_city = partner.get("city", "")
    available = [
        o for o in all_orders
        if o.get("status") == "pending" and o.get("partner_id", "") == ""
    ]

    # Sort by green_credits desc
    available.sort(key=lambda x: int(x.get("green_credits", 0)), reverse=True)

    return {"available_pickups": available, "total": len(available)}


@router.post("/delivery-orders/accept")
async def accept_order(request: AcceptOrderRequest, partner: dict = Depends(get_current_delivery_partner)):
    """Accept a pickup order."""
    order = await db.get_item("delivery_orders", {"order_id": request.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Order already taken")

    now = datetime.now(timezone.utc).isoformat()

    # Assign partner
    order["partner_id"] = partner["partner_id"]
    order["partner_name"] = partner["partner_name"]
    order["partner_phone"] = partner.get("phone", "")
    order["status"] = "accepted"
    order["accepted_at"] = now

    # Calculate estimated time (random for demo: 15-45 min)
    order["estimated_time_minutes"] = random.randint(15, 45)
    order["distance_km"] = round(random.uniform(2.0, 8.0), 1)

    # Add to timeline
    timeline = order.get("timeline", [])
    timeline.append({"status": "accepted", "timestamp": now, "note": f"Accepted by {partner['partner_name']}"})
    order["timeline"] = timeline

    await db.put_item("delivery_orders", order)

    # Update partner stats
    partner["orders_accepted"] = int(partner.get("orders_accepted", 0)) + 1
    partner["current_status"] = "on_delivery"
    await db.put_item("delivery_partners", partner)

    return {
        "message": f"✅ Pickup accepted! Head to {order.get('seller_address', 'seller location')}",
        "order": order,
        "seller_contact": {
            "name": order.get("seller_name", ""),
            "phone": order.get("seller_phone", ""),
            "address": order.get("seller_address", ""),
            "city": order.get("seller_city", ""),
        },
        "warehouse": WAREHOUSES.get(order.get("seller_city", "Mumbai"), WAREHOUSES["Mumbai"]),
        "estimated_time_minutes": order["estimated_time_minutes"],
        "earning": order.get("earning", "20"),
    }


@router.post("/delivery-orders/update-status")
async def update_order_status(request: UpdateStatusRequest, partner: dict = Depends(get_current_delivery_partner)):
    """Update delivery order status (picked_up, delivered_to_warehouse, completed)."""
    order = await db.get_item("delivery_orders", {"order_id": request.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("partner_id") != partner["partner_id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    now = datetime.now(timezone.utc).isoformat()
    order["status"] = request.status

    # Update location if provided
    if request.lat and request.lng:
        order["partner_lat"] = str(request.lat)
        order["partner_lng"] = str(request.lng)

    # Timeline
    notes = {
        "in_transit": "Partner on the way to seller",
        "picked_up": "Product picked up from seller",
        "delivered_to_warehouse": "Delivered to Amazon warehouse",
        "completed": "Delivery completed successfully",
    }
    timeline = order.get("timeline", [])
    timeline.append({"status": request.status, "timestamp": now, "note": notes.get(request.status, request.status)})
    order["timeline"] = timeline

    # On completion, credit earnings
    if request.status == "completed":
        order["completed_at"] = now
        earning = float(order.get("earning", 20))
        green_credits = int(order.get("green_credits", 15))

        partner["total_deliveries"] = int(partner.get("total_deliveries", 0)) + 1
        partner["total_earnings"] = str(float(partner.get("total_earnings", 0)) + earning)
        partner["green_credits_earned"] = int(partner.get("green_credits_earned", 0)) + green_credits
        partner["current_status"] = "available"
        await db.put_item("delivery_partners", partner)

    await db.put_item("delivery_orders", order)

    return {"message": f"Status updated: {request.status}", "order": order}


@router.get("/delivery-orders/active")
async def get_active_order(partner: dict = Depends(get_current_delivery_partner)):
    """Get partner's currently active delivery."""
    all_orders = await db.scan_table("delivery_orders", limit=100)
    active = [
        o for o in all_orders
        if o.get("partner_id") == partner["partner_id"]
        and o.get("status") in ("accepted", "in_transit", "picked_up")
    ]
    if not active:
        return {"active_order": None}

    order = active[0]
    warehouse = WAREHOUSES.get(order.get("seller_city", "Mumbai"), WAREHOUSES["Mumbai"])

    return {
        "active_order": order,
        "seller_contact": {
            "name": order.get("seller_name", ""),
            "phone": order.get("seller_phone", ""),
            "address": order.get("seller_address", ""),
        },
        "warehouse": warehouse,
    }


# ─── User-facing: Create delivery order when product listed ───

@router.post("/delivery-orders/create-for-listing")
async def create_delivery_order(product_id: str, user: dict = Depends(get_current_user)):
    """Auto-create a delivery order when user lists a product."""
    order_id = f"PICKUP-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    # Get product info
    product = await db.get_item("sl_products", {"product_id": product_id})
    product_name = product.get("product_name", "Product") if product else "Product"
    category = product.get("category", "General") if product else "General"
    image_url = (product.get("image_urls", []) or [""])[0] if product else ""
    green_credits = int(product.get("green_credits", 15)) if product else 15

    order = {
        "order_id": order_id,
        "product_id": product_id,
        "product_name": product_name,
        "product_category": category,
        "product_image": image_url,
        "seller_id": user["user_id"],
        "seller_name": user.get("name", ""),
        "seller_phone": user.get("phone", ""),
        "seller_address": f"{user.get('name', 'User')}'s location",
        "seller_city": "Mumbai",  # Default for demo
        "partner_id": "",
        "partner_name": "",
        "warehouse_destination": "WH-MUM-01",
        "status": "pending",
        "green_credits": green_credits,
        "earning": str(random.randint(15, 20)),
        "estimated_time_minutes": 0,
        "distance_km": 0,
        "timeline": [{"status": "pending", "timestamp": now, "note": "Awaiting delivery partner"}],
        "created_at": now,
    }

    await db.put_item("delivery_orders", order)

    return {
        "message": "Delivery order created! A partner will pick up your product soon.",
        "order_id": order_id,
        "status": "pending",
    }


# ─── User-facing: Track my listing's delivery status ───

@router.get("/delivery-orders/my-listings")
async def get_my_delivery_orders(user: dict = Depends(get_current_user)):
    """Get delivery orders for the current user's listed products."""
    all_orders = await db.scan_table("delivery_orders", limit=100)
    my_orders = [o for o in all_orders if o.get("seller_id") == user["user_id"]]
    my_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"orders": my_orders, "total": len(my_orders)}
