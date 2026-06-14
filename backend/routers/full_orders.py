"""
Full Orders Router — Complete buyer-seller-delivery lifecycle.
Triggered when buyer clicks "Buy Now" → creates order → triggers pickup → transit → delivery.
"""
import uuid
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from services.dynamodb_service import DynamoDBService
from routers.auth import get_current_user
from routers.delivery_partner import get_current_delivery_partner

router = APIRouter()
db = DynamoDBService()

# City coordinates for location simulation
CITY_COORDS = {
    "Mumbai": {"lat": 19.076, "lng": 72.877},
    "Delhi": {"lat": 28.613, "lng": 77.209},
    "Bengaluru": {"lat": 12.971, "lng": 77.594},
    "Hyderabad": {"lat": 17.385, "lng": 78.486},
    "Chennai": {"lat": 13.082, "lng": 80.270},
    "Pune": {"lat": 18.520, "lng": 73.856},
    "Kolkata": {"lat": 22.572, "lng": 88.363},
    "Ahmedabad": {"lat": 23.022, "lng": 72.571},
    "Jaipur": {"lat": 26.912, "lng": 75.787},
    "Kochi": {"lat": 9.931, "lng": 76.267},
}

PROGRESS_MAP = {
    "order_placed": 5,
    "pickup_assigned": 15,
    "pickup_in_transit": 25,
    "picked_up_from_seller": 35,
    "at_seller_warehouse": 45,
    "inter_city_transit": 55,
    "at_buyer_warehouse": 65,
    "delivery_assigned": 75,
    "delivery_in_transit": 85,
    "delivered_to_buyer": 95,
    "payment_confirmed": 100,
}


class BuyNowRequest(BaseModel):
    product_id: str
    buyer_city: Optional[str] = None
    buyer_address: Optional[str] = ""


class PaymentConfirmRequest(BaseModel):
    order_id: str
    payment_method: str = "UPI"
    payment_reference: str = ""


# ─── Buyer Endpoints ──────────────────────────────

@router.post("/full-orders/buy")
async def create_full_order(request: BuyNowRequest, user: dict = Depends(get_current_user)):
    """Buyer clicks Buy Now → Full order created, triggers pickup chain."""
    product = await db.get_item("sl_products", {"product_id": request.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail="Product no longer available")

    # Get seller info
    seller_id = product.get("seller_id", "")
    seller = await db.get_item("sl_users", {"user_id": seller_id})
    seller_name = seller.get("name", "Seller") if seller else "Seller"
    seller_phone = seller.get("phone", "") if seller else ""
    seller_city = product.get("city", "Mumbai")

    # Buyer info
    buyer_city = request.buyer_city or user.get("city", "Mumbai")
    buyer_coords = CITY_COORDS.get(buyer_city, CITY_COORDS.get("Mumbai", {"lat": 19.076, "lng": 72.877}))
    seller_coords = CITY_COORDS.get(seller_city, CITY_COORDS["Mumbai"])

    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    price = float(product.get("estimated_value", 0))

    # Generate OTPs
    pickup_otp = str(random.randint(1000, 9999))
    delivery_otp = str(random.randint(1000, 9999))

    order = {
        "order_id": order_id,
        "product_id": request.product_id,
        "product_name": product.get("product_name", ""),
        "product_image": (product.get("image_urls") or [""])[0],
        "category": product.get("category", ""),
        "price": str(price),

        "buyer_id": user["user_id"],
        "buyer_name": user.get("name", ""),
        "buyer_phone": user.get("phone", ""),
        "buyer_city": buyer_city,
        "buyer_address": request.buyer_address or f"{user.get('name', 'Buyer')}'s address, {buyer_city}",
        "buyer_lat": str(buyer_coords["lat"]),
        "buyer_lng": str(buyer_coords["lng"]),

        "seller_id": seller_id,
        "seller_name": seller_name,
        "seller_phone": seller_phone,
        "seller_city": seller_city,
        "seller_address": f"{seller_name}'s location, {seller_city}",
        "seller_lat": str(seller_coords["lat"]),
        "seller_lng": str(seller_coords["lng"]),

        "pickup_partner_id": "",
        "pickup_partner_name": "",
        "pickup_otp": pickup_otp,
        "pickup_status": "pending",

        "delivery_partner_id": "",
        "delivery_partner_name": "",
        "delivery_otp": delivery_otp,
        "delivery_status": "pending",

        "progress_pct": 5,
        "status": "order_placed",
        "is_intercity": seller_city != buyer_city,
        "payment_done": False,
        "payment_method": "",
        "payment_reference": "",

        "timeline": [{"status": "order_placed", "timestamp": now, "note": f"Order placed by {user.get('name', 'Buyer')}"}],
        "created_at": now,
        "completed_at": "",
    }

    await db.put_item("sl_full_orders", order)

    # Mark product as SOLD immediately — removed from marketplace
    product["status"] = "sold"
    product["buyer_id"] = user["user_id"]
    product["order_id"] = order_id
    product["sold_at"] = now
    await db.put_item("sl_products", product)

    return {
        "message": f"Order placed! A delivery partner will pick up from the seller.",
        "order_id": order_id,
        "progress_pct": 5,
        "status": "order_placed",
        "pickup_otp": pickup_otp,
        "estimated_delivery": "2-4 days" if order["is_intercity"] else "Same day",
    }


@router.get("/full-orders/buyer")
async def get_buyer_orders(user: dict = Depends(get_current_user)):
    """Get all orders for the current buyer."""
    all_orders = await db.scan_table("sl_full_orders", limit=100)
    my_orders = [o for o in all_orders if o.get("buyer_id") == user["user_id"]]
    my_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"orders": my_orders}


@router.get("/full-orders/seller")
async def get_seller_orders(user: dict = Depends(get_current_user)):
    """Get all orders where current user is the seller."""
    all_orders = await db.scan_table("sl_full_orders", limit=100)
    my_orders = [o for o in all_orders if o.get("seller_id") == user["user_id"]]
    my_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"orders": my_orders}


@router.get("/full-orders/pickup-queue")
async def get_pickup_queue(partner: dict = Depends(get_current_delivery_partner)):
    """Available pickups from sellers — filtered to partner's city only."""
    all_orders = await db.scan_table("sl_full_orders", limit=100)
    partner_city = partner.get("city", "").lower()

    available = [
        o for o in all_orders
        if o.get("pickup_status") == "pending"
        and o.get("pickup_partner_id") == ""
        and (not partner_city or o.get("seller_city", "").lower() == partner_city)
    ]
    for o in available:
        o["estimated_earning"] = random.randint(15, 20)
        o["estimated_green_credits"] = 15
        o["estimated_distance_km"] = round(random.uniform(2.0, 7.0), 1)
    return {"pickups": available, "total": len(available)}


@router.get("/full-orders/delivery-queue")
async def get_delivery_queue(partner: dict = Depends(get_current_delivery_partner)):
    """Available deliveries to buyers — filtered to partner's city only."""
    all_orders = await db.scan_table("sl_full_orders", limit=100)
    partner_city = partner.get("city", "").lower()

    available = [
        o for o in all_orders
        if o.get("delivery_status") == "pending"
        and o.get("delivery_partner_id") == ""
        and o.get("pickup_status") == "completed"
        and (not partner_city or o.get("buyer_city", "").lower() == partner_city)
    ]
    for o in available:
        o["estimated_earning"] = random.randint(15, 20)
        o["estimated_green_credits"] = 15
    return {"deliveries": available, "total": len(available)}


@router.get("/full-orders/{order_id}")
async def get_order_detail(order_id: str):
    """Get full order details with progress."""
    order = await db.get_item("sl_full_orders", {"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/full-orders/confirm-payment")
async def confirm_payment(request: PaymentConfirmRequest, user: dict = Depends(get_current_user)):
    """Buyer confirms payment → order complete, product removed from marketplace."""
    order = await db.get_item("sl_full_orders", {"order_id": request.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("buyer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    now = datetime.now(timezone.utc).isoformat()

    order["payment_done"] = True
    order["payment_method"] = request.payment_method
    order["payment_reference"] = request.payment_reference
    order["status"] = "payment_confirmed"
    order["progress_pct"] = 100
    order["completed_at"] = now

    timeline = order.get("timeline", [])
    timeline.append({"status": "payment_confirmed", "timestamp": now, "note": f"Payment confirmed via {request.payment_method}"})
    order["timeline"] = timeline

    await db.put_item("sl_full_orders", order)

    # Remove product from marketplace
    product = await db.get_item("sl_products", {"product_id": order.get("product_id", "")})
    if product:
        product["status"] = "sold"
        product["sold_at"] = now
        await db.put_item("sl_products", product)

    # Award green credits to buyer
    buyer = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if buyer:
        buyer["green_credits"] = int(buyer.get("green_credits", 0)) + 30
        await db.put_item("sl_users", buyer)

    # Credit seller: green credits based on listing scope (local=50, regional=30)
    seller_id = order.get("seller_id", "")
    if seller_id:
        seller = await db.get_item("sl_users", {"user_id": seller_id})
        if seller:
            # Check product listing scope for credit amount
            product = await db.get_item("sl_products", {"product_id": order.get("product_id", "")})
            listing_scope = product.get("listing_scope", "regional") if product else "regional"
            seller_credits = 50 if listing_scope == "local" else 30

            seller["green_credits"] = int(seller.get("green_credits", 0)) + seller_credits
            products_sold = seller.get("products_sold", [])
            products_sold.append(order.get("product_id", ""))
            seller["products_sold"] = products_sold
            seller["total_earned"] = str(float(seller.get("total_earned", 0)) + float(order.get("price", 0)))
            await db.put_item("sl_users", seller)

    return {
        "message": "Payment confirmed! Order complete. Seller has been credited.",
        "progress_pct": 100,
        "green_credits_earned": 30,
    }


# ─── Delivery Partner Endpoints ───────────────────

@router.post("/full-orders/accept-pickup")
async def accept_pickup(order_id: str, partner: dict = Depends(get_current_delivery_partner)):
    """Delivery partner accepts pickup from seller."""
    order = await db.get_item("sl_full_orders", {"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("pickup_partner_id"):
        raise HTTPException(status_code=400, detail="Already assigned")

    now = datetime.now(timezone.utc).isoformat()

    order["pickup_partner_id"] = partner["partner_id"]
    order["pickup_partner_name"] = partner["partner_name"]
    order["pickup_partner_phone"] = partner.get("phone", "")
    order["pickup_status"] = "assigned"
    order["status"] = "pickup_assigned"
    order["progress_pct"] = PROGRESS_MAP["pickup_assigned"]

    timeline = order.get("timeline", [])
    timeline.append({"status": "pickup_assigned", "timestamp": now, "note": f"Pickup partner: {partner['partner_name']}"})
    order["timeline"] = timeline

    await db.put_item("sl_full_orders", order)

    return {
        "message": f"Pickup accepted! Go to seller: {order.get('seller_name')}. Ask seller for the OTP.",
        "seller_contact": {
            "name": order.get("seller_name"),
            "phone": order.get("seller_phone"),
            "address": order.get("seller_address"),
            "city": order.get("seller_city"),
        },
        "order_id": order_id,
    }


@router.post("/full-orders/complete-pickup")
async def complete_pickup(order_id: str, otp: str, partner: dict = Depends(get_current_delivery_partner)):
    """Delivery boy confirms pickup with OTP → product goes to warehouse."""
    order = await db.get_item("sl_full_orders", {"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("pickup_otp") != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    now = datetime.now(timezone.utc).isoformat()

    order["pickup_status"] = "completed"
    order["status"] = "at_seller_warehouse"
    order["progress_pct"] = PROGRESS_MAP["at_seller_warehouse"]

    timeline = order.get("timeline", [])
    timeline.append({"status": "picked_up_from_seller", "timestamp": now, "note": "Picked up from seller (OTP verified)"})
    timeline.append({"status": "at_seller_warehouse", "timestamp": now, "note": f"Delivered to warehouse ({order.get('seller_city')})"})
    order["timeline"] = timeline

    # If intercity, auto-progress to buyer warehouse
    if order.get("is_intercity"):
        order["status"] = "at_buyer_warehouse"
        order["progress_pct"] = PROGRESS_MAP["at_buyer_warehouse"]
        timeline.append({"status": "inter_city_transit", "timestamp": now, "note": f"In transit: {order.get('seller_city')} → {order.get('buyer_city')}"})
        timeline.append({"status": "at_buyer_warehouse", "timestamp": now, "note": f"Arrived at {order.get('buyer_city')} warehouse"})
        order["delivery_status"] = "pending"  # Now available for buyer-city delivery
    else:
        order["delivery_status"] = "pending"

    await db.put_item("sl_full_orders", order)

    # Credit pickup partner
    partner["total_deliveries"] = int(partner.get("total_deliveries", 0)) + 1
    partner["total_earnings"] = str(float(partner.get("total_earnings", 0)) + 18)
    partner["green_credits_earned"] = int(partner.get("green_credits_earned", 0)) + 15
    await db.put_item("delivery_partners", partner)

    return {"message": "Pickup complete! Product at warehouse.", "progress_pct": order["progress_pct"]}


# ─── Buyer-city delivery ──────────────────────────

@router.post("/full-orders/accept-delivery")
async def accept_delivery(order_id: str, partner: dict = Depends(get_current_delivery_partner)):
    """Delivery partner accepts last-mile delivery to buyer."""
    order = await db.get_item("sl_full_orders", {"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc).isoformat()

    order["delivery_partner_id"] = partner["partner_id"]
    order["delivery_partner_name"] = partner["partner_name"]
    order["delivery_partner_phone"] = partner.get("phone", "")
    order["delivery_status"] = "assigned"
    order["status"] = "delivery_assigned"
    order["progress_pct"] = PROGRESS_MAP["delivery_assigned"]

    timeline = order.get("timeline", [])
    timeline.append({"status": "delivery_assigned", "timestamp": now, "note": f"Delivery partner: {partner['partner_name']}"})
    order["timeline"] = timeline

    await db.put_item("sl_full_orders", order)

    return {
        "message": f"Delivery accepted! Deliver to: {order.get('buyer_name')}. Ask buyer for the OTP.",
        "buyer_contact": {
            "name": order.get("buyer_name"),
            "phone": order.get("buyer_phone"),
            "address": order.get("buyer_address"),
            "city": order.get("buyer_city"),
        },
    }


@router.post("/full-orders/complete-delivery")
async def complete_delivery(order_id: str, otp: str, partner: dict = Depends(get_current_delivery_partner)):
    """Delivery boy delivers to buyer, verified with OTP."""
    order = await db.get_item("sl_full_orders", {"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("delivery_otp") != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    now = datetime.now(timezone.utc).isoformat()

    order["delivery_status"] = "completed"
    order["status"] = "delivered_to_buyer"
    order["progress_pct"] = PROGRESS_MAP["delivered_to_buyer"]

    timeline = order.get("timeline", [])
    timeline.append({"status": "delivered_to_buyer", "timestamp": now, "note": "Delivered to buyer (OTP verified). Awaiting payment confirmation."})
    order["timeline"] = timeline

    await db.put_item("sl_full_orders", order)

    # Credit delivery partner
    partner["total_deliveries"] = int(partner.get("total_deliveries", 0)) + 1
    partner["total_earnings"] = str(float(partner.get("total_earnings", 0)) + 18)
    partner["green_credits_earned"] = int(partner.get("green_credits_earned", 0)) + 15
    await db.put_item("delivery_partners", partner)

    return {"message": "Delivered to buyer! Awaiting payment.", "progress_pct": 95}
