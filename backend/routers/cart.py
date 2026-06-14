"""
Cart Router — Shopping cart and checkout.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.dynamodb_service import DynamoDBService
from routers.auth import get_current_user

router = APIRouter()
db = DynamoDBService()


class CartAddRequest(BaseModel):
    product_id: str


class CheckoutRequest(BaseModel):
    shipping_address: str = "Demo Address, India"


@router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    """Get current user's cart items with product details. Flags sold items."""
    cart_items = user.get("cart", [])

    # Fetch product details for each cart item
    available_products = []
    sold_products = []

    for product_id in cart_items:
        product = await db.get_item("sl_products", {"product_id": product_id})
        if not product:
            continue
        if product.get("status") == "active":
            available_products.append(product)
        else:
            # Product was sold/reserved by someone else
            product["_sold_message"] = "This item was purchased by another buyer"
            sold_products.append(product)

    # Auto-remove sold items from user's cart
    if sold_products:
        updated_cart = [p for p in cart_items if p not in [s.get("product_id") for s in sold_products]]
        user["cart"] = updated_cart
        await db.put_item("sl_users", user)

    total = sum(float(p.get("estimated_value", 0)) for p in available_products)

    return {
        "items": available_products,
        "sold_items": sold_products,
        "count": len(available_products),
        "total": total,
        "green_credits_on_purchase": len(available_products) * 30
    }


@router.post("/cart/add")
async def add_to_cart(request: CartAddRequest, user: dict = Depends(get_current_user)):
    """Add a product to cart."""
    # Verify product exists and is active
    product = await db.get_item("sl_products", {"product_id": request.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail="Product is no longer available")

    # Add to user's cart
    cart = user.get("cart", [])
    if request.product_id in cart:
        return {"message": "Product already in cart", "cart_count": len(cart)}

    cart.append(request.product_id)
    user["cart"] = cart
    await db.put_item("sl_users", user)

    return {"message": "Added to cart", "cart_count": len(cart)}


@router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    """Remove a product from cart."""
    cart = user.get("cart", [])
    if product_id in cart:
        cart.remove(product_id)
        user["cart"] = cart
        await db.put_item("sl_users", user)

    return {"message": "Removed from cart", "cart_count": len(cart)}


@router.post("/cart/checkout")
async def checkout(request: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Purchase all items in cart as bulk order (creates full orders for each)."""
    import random
    cart = user.get("cart", [])
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    purchased = []
    total_spent = 0
    total_green_credits = 0
    order_ids = []

    now = datetime.utcnow().isoformat()
    buyer_city = user.get("city", "Mumbai")  # Use user's actual city from profile

    CITY_COORDS = {
        "Mumbai": {"lat": 19.076, "lng": 72.877}, "Delhi": {"lat": 28.613, "lng": 77.209},
        "Bengaluru": {"lat": 12.971, "lng": 77.594}, "Hyderabad": {"lat": 17.385, "lng": 78.486},
    }

    for product_id in cart:
        product = await db.get_item("sl_products", {"product_id": product_id})
        if not product or product.get("status") != "active":
            continue

        price = float(product.get("estimated_value", 0))
        seller_id = product.get("seller_id", "")
        seller = await db.get_item("sl_users", {"user_id": seller_id})
        seller_name = seller.get("name", "Seller") if seller else "Seller"
        seller_phone = seller.get("phone", "") if seller else ""
        seller_city = product.get("city", "Mumbai")

        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        pickup_otp = str(random.randint(1000, 9999))
        delivery_otp = str(random.randint(1000, 9999))

        buyer_coords = CITY_COORDS.get(buyer_city, {"lat": 12.971, "lng": 77.594})
        seller_coords = CITY_COORDS.get(seller_city, {"lat": 19.076, "lng": 72.877})

        # Create full order
        order = {
            "order_id": order_id,
            "product_id": product_id,
            "product_name": product.get("product_name", ""),
            "product_image": (product.get("image_urls") or [""])[0],
            "category": product.get("category", ""),
            "price": str(price),
            "buyer_id": user["user_id"],
            "buyer_name": user.get("name", ""),
            "buyer_phone": user.get("phone", ""),
            "buyer_city": buyer_city,
            "buyer_address": request.shipping_address or f"{user.get('name', 'Buyer')}'s address, {buyer_city}",
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
            "timeline": [{"status": "order_placed", "timestamp": now, "note": f"Order placed (bulk checkout)"}],
            "created_at": now,
            "completed_at": "",
        }
        await db.put_item("sl_full_orders", order)

        # Mark product as sold
        product["status"] = "sold"
        product["buyer_id"] = user["user_id"]
        product["order_id"] = order_id
        product["sold_at"] = now
        await db.put_item("sl_products", product)

        purchased.append({"product_name": product.get("product_name"), "price": price, "order_id": order_id})
        order_ids.append(order_id)
        total_spent += price
        total_green_credits += 30

    # Clear cart
    user["cart"] = []
    user["green_credits"] = int(user.get("green_credits", 0)) + total_green_credits
    await db.put_item("sl_users", user)

    return {
        "message": f"Successfully ordered {len(purchased)} items! Track them in My Orders.",
        "items_purchased": purchased,
        "order_ids": order_ids,
        "total_spent": total_spent,
        "green_credits_earned": total_green_credits
    }


@router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    """Get purchase history."""
    all_transactions = await db.scan_table("sl_transactions", limit=200)

    user_orders = [
        t for t in all_transactions
        if t.get("buyer_id") == user["user_id"] and t.get("transaction_type") == "buy"
    ]
    user_orders.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    # Enrich with product names
    for order in user_orders:
        product = await db.get_item("sl_products", {"product_id": order.get("product_id", "")})
        if product:
            order["product_name"] = product.get("product_name")
            order["image_url"] = (product.get("image_urls") or [""])[0]

    return {"orders": user_orders, "total": len(user_orders)}
