"""
Transactions Router — Buy, Sell, Donate with full audit trail.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from models.transaction import TransactionCreate, DonationRequest
from services.dynamodb_service import DynamoDBService
from routers.auth import get_current_user

router = APIRouter()
db = DynamoDBService()


@router.post("/transactions/buy")
async def buy_product(request: TransactionCreate, user: dict = Depends(get_current_user)):
    """Buy a product from the marketplace."""
    product = await db.get_item("sl_products", {"product_id": request.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail="Product is no longer available")

    transaction_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    price = float(product.get("estimated_value", 0))

    # Create transaction record
    transaction = {
        "transaction_id": transaction_id,
        "timestamp": now,
        "product_id": request.product_id,
        "buyer_id": user["user_id"],
        "seller_id": product.get("seller_id", "unknown"),
        "transaction_type": "buy",
        "price": str(price),
        "condition_grade": product.get("condition_grade", ""),
        "warehouse_location": request.warehouse_location or product.get("city", ""),
        "status": "completed"
    }
    await db.put_item("sl_transactions", transaction)

    # Update product status
    product["status"] = "sold"
    product["buyer_id"] = user["user_id"]
    product["sold_at"] = now
    await db.put_item("sl_products", product)

    # Update buyer profile
    buyer = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if buyer:
        bought = buyer.get("products_bought", [])
        bought.append(request.product_id)
        buyer["products_bought"] = bought
        txns = buyer.get("transactions", [])
        txns.append(transaction_id)
        buyer["transactions"] = txns
        await db.put_item("sl_users", buyer)

    # Update seller profile
    seller = await db.get_item("sl_users", {"user_id": product.get("seller_id", "")})
    if seller:
        sold = seller.get("products_sold", [])
        sold.append(request.product_id)
        seller["products_sold"] = sold
        txns = seller.get("transactions", [])
        txns.append(transaction_id)
        seller["transactions"] = txns
        await db.put_item("sl_users", seller)

    # Award green credits to buyer
    buyer_credits = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if buyer_credits:
        buyer_credits["green_credits"] = int(buyer_credits.get("green_credits", 0)) + 30
        await db.put_item("sl_users", buyer_credits)

    return {
        "message": "Purchase successful!",
        "transaction_id": transaction_id,
        "product_name": product.get("product_name"),
        "price": price,
        "green_credits_earned": 30
    }


@router.post("/transactions/donate")
async def donate_product(request: DonationRequest, user: dict = Depends(get_current_user)):
    """Donate a product."""
    product = await db.get_item("sl_products", {"product_id": request.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    transaction_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    transaction = {
        "transaction_id": transaction_id,
        "timestamp": now,
        "product_id": request.product_id,
        "buyer_id": request.recipient_org or "donation_partner",
        "seller_id": user["user_id"],
        "transaction_type": "donate",
        "price": "0",
        "condition_grade": product.get("condition_grade", ""),
        "warehouse_location": request.warehouse_location or "",
        "status": "completed"
    }
    await db.put_item("sl_transactions", transaction)

    # Update product
    product["status"] = "donated"
    product["donated_at"] = now
    product["donor_id"] = user["user_id"]
    await db.put_item("sl_products", product)

    # Update user profile
    donor = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if donor:
        donated = donor.get("products_donated", [])
        donated.append(request.product_id)
        donor["products_donated"] = donated
        donor["green_credits"] = int(donor.get("green_credits", 0)) + 75
        txns = donor.get("transactions", [])
        txns.append(transaction_id)
        donor["transactions"] = txns
        await db.put_item("sl_users", donor)

    return {
        "message": "Donation successful! Thank you for giving this product a second life.",
        "transaction_id": transaction_id,
        "product_name": product.get("product_name"),
        "green_credits_earned": 75
    }


@router.get("/transactions/history")
async def get_transaction_history(user: dict = Depends(get_current_user)):
    """Get transaction history for the current user."""
    all_transactions = await db.scan_table("sl_transactions", limit=100)

    user_transactions = [
        t for t in all_transactions
        if t.get("buyer_id") == user["user_id"] or t.get("seller_id") == user["user_id"]
    ]

    user_transactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"transactions": user_transactions}
