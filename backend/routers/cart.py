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
    """Get current user's cart items with product details."""
    cart_items = user.get("cart", [])

    # Fetch product details for each cart item
    products = []
    for product_id in cart_items:
        product = await db.get_item("sl_products", {"product_id": product_id})
        if product and product.get("status") == "active":
            products.append(product)

    total = sum(float(p.get("estimated_value", 0)) for p in products)

    return {
        "items": products,
        "count": len(products),
        "total": total,
        "green_credits_on_purchase": len(products) * 30
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
    """Purchase all items in cart."""
    cart = user.get("cart", [])
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    purchased = []
    total_spent = 0
    total_green_credits = 0

    for product_id in cart:
        product = await db.get_item("sl_products", {"product_id": product_id})
        if not product or product.get("status") != "active":
            continue

        price = float(product.get("estimated_value", 0))
        transaction_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        # Create transaction
        transaction = {
            "transaction_id": transaction_id,
            "timestamp": now,
            "product_id": product_id,
            "buyer_id": user["user_id"],
            "seller_id": product.get("seller_id", "unknown"),
            "transaction_type": "buy",
            "price": str(price),
            "condition_grade": product.get("condition_grade", ""),
            "warehouse_location": product.get("city", ""),
            "status": "completed",
            "shipping_address": request.shipping_address,
        }
        await db.put_item("sl_transactions", transaction)

        # Update product status
        product["status"] = "sold"
        product["buyer_id"] = user["user_id"]
        product["sold_at"] = now
        await db.put_item("sl_products", product)

        purchased.append({
            "product_name": product.get("product_name"),
            "price": price,
            "transaction_id": transaction_id
        })
        total_spent += price
        total_green_credits += 30

    # Clear cart and update user
    user["cart"] = []
    orders = user.get("orders", [])
    orders.extend([p["transaction_id"] for p in purchased])
    user["orders"] = orders
    bought = user.get("products_bought", [])
    bought.extend([product_id for product_id in cart if any(p["transaction_id"] for p in purchased)])
    user["products_bought"] = bought
    user["green_credits"] = int(user.get("green_credits", 0)) + total_green_credits
    await db.put_item("sl_users", user)

    return {
        "message": f"Successfully purchased {len(purchased)} items!",
        "items_purchased": purchased,
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
