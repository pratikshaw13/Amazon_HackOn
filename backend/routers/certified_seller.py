"""
Certified Seller Router — Pre-approved Amazon seller authentication.
Sellers cannot self-register. Accounts are seeded via seed_sellers.py.
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
warnings.filterwarnings("ignore", ".*trapped.*bcrypt.*")

router = APIRouter()
db = DynamoDBService()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
bearer_scheme = HTTPBearer(auto_error=False)


class SellerLoginRequest(BaseModel):
    seller_id: str
    email: str
    password: str


# ─── Dependency ───────────────────────────────────────────────

async def get_current_certified_seller(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """Extract certified seller from JWT. Used as dependency in other seller routers."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        seller_id = payload.get("sub")
        if not seller_id or not seller_id.startswith("AMZ-SELLER"):
            raise HTTPException(status_code=401, detail="Invalid seller token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    seller = await db.get_item("certified_sellers", {"seller_id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller


# ─── Endpoints ────────────────────────────────────────────────

@router.post("/certified-seller/login")
async def seller_login(request: SellerLoginRequest):
    """
    Certified seller login. Requires pre-approved seller_id + email + password.
    """
    # Validate seller_id format
    if not request.seller_id.startswith("AMZ-SELLER-"):
        raise HTTPException(status_code=400, detail="Invalid Seller ID format. Must be AMZ-SELLER-XXXX")

    # Fetch seller by ID
    seller = await db.get_item("certified_sellers", {"seller_id": request.seller_id})
    if not seller:
        raise HTTPException(status_code=401, detail="Seller ID not found. Only pre-approved sellers can access this portal.")

    # Verify email
    if seller.get("email", "").lower() != request.email.lower():
        raise HTTPException(status_code=401, detail="Email does not match the registered seller account.")

    # Verify password
    if not pwd_context.verify(request.password, seller.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid password.")

    # Update last_login
    seller["last_login"] = datetime.now(timezone.utc).isoformat()
    await db.put_item("certified_sellers", seller)

    # Generate token
    token = jwt.encode(
        {
            "sub": seller["seller_id"],
            "name": seller["seller_name"],
            "company": seller.get("company_name", ""),
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "type": "certified_seller"
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "seller_id": seller["seller_id"],
        "seller_name": seller["seller_name"],
        "company_name": seller.get("company_name", ""),
        "warehouse_city": seller.get("warehouse_city", ""),
    }


@router.get("/certified-seller/me")
async def get_seller_profile(seller: dict = Depends(get_current_certified_seller)):
    """Get current seller profile."""
    # Remove sensitive fields
    safe_seller = {k: v for k, v in seller.items() if k != "password_hash"}
    return safe_seller


@router.get("/certified-seller/dashboard-stats")
async def get_dashboard_stats(seller: dict = Depends(get_current_certified_seller)):
    """Get seller dashboard overview stats."""
    return {
        "seller_id": seller["seller_id"],
        "seller_name": seller["seller_name"],
        "company_name": seller.get("company_name", ""),
        "warehouse_city": seller.get("warehouse_city", ""),
        "seller_rating": float(seller.get("seller_rating", 0)),
        "stats": {
            "total_products": int(seller.get("total_products", 0)),
            "total_products_sold": int(seller.get("total_products_sold", 0)),
            "total_products_returned": int(seller.get("total_products_returned", 0)),
            "dead_inventory_count": int(seller.get("dead_inventory_count", 0)),
            "recovered_inventory_value": float(seller.get("recovered_inventory_value", 0)),
            "green_score": int(seller.get("green_score", 0)),
        }
    }


@router.get("/certified-seller/warehouses")
async def get_seller_warehouses(seller: dict = Depends(get_current_certified_seller)):
    """Get warehouse view — products grouped by warehouse city."""
    all_returns = await db.scan_table("sl_returns", limit=200)

    # Filter returns assigned to this seller that are at warehouse
    seller_returns = [
        r for r in all_returns
        if r.get("seller_id") == seller["seller_id"]
        and r.get("status") in ("at_warehouse", "listed", "routed")
    ]

    # Group by warehouse city
    warehouses = {}
    for ret in seller_returns:
        city = ret.get("warehouse_city", "Unknown")
        if city not in warehouses:
            warehouses[city] = {
                "warehouse_id": ret.get("warehouse_id", ""),
                "city": city,
                "address": ret.get("warehouse_address", ""),
                "products": [],
                "count": 0,
            }
        warehouses[city]["products"].append({
            "return_id": ret.get("return_id"),
            "product_name": ret.get("product_name"),
            "category": ret.get("category"),
            "return_reason": ret.get("return_reason"),
            "original_price": ret.get("original_price", "0"),
            "customer_name": ret.get("customer_name", ""),
            "product_image_url": ret.get("product_image_url", ""),
            "status": ret.get("status"),
            "green_score": int(ret.get("green_score", 0)),
            "listing_price": ret.get("listing_price", "0"),
            "created_at": ret.get("created_at", ""),
        })
        warehouses[city]["count"] += 1

    return {
        "warehouses": list(warehouses.values()),
        "total_products": len(seller_returns),
        "total_warehouses": len(warehouses),
    }


@router.get("/certified-seller/returns")
async def get_seller_returns(seller: dict = Depends(get_current_certified_seller)):
    """Get all returns for this seller (all statuses)."""
    all_returns = await db.scan_table("sl_returns", limit=200)
    seller_returns = [r for r in all_returns if r.get("seller_id") == seller["seller_id"]]
    seller_returns.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"returns": seller_returns, "total": len(seller_returns)}


@router.post("/certified-seller/list-return/{return_id}")
async def list_return_on_marketplace(return_id: str, seller: dict = Depends(get_current_certified_seller)):
    """List a returned product on the marketplace with AI-generated green score."""
    from services.bedrock_service import BedrockService
    from routers._city_state_map import CITY_STATE_MAP
    import uuid, random

    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=403, detail="Not your product")
    if ret.get("status") != "at_warehouse":
        raise HTTPException(status_code=400, detail="Product must be at warehouse to list")

    # AI Green Score — based on return reason and category
    ai = BedrockService()
    try:
        prompt = f"""Rate this returned product for resale (0-100 green score).
Product: {ret.get('product_name')}
Category: {ret.get('category')}
Return reason: {ret.get('return_reason')}
Original price: ₹{ret.get('original_price')}

Consider: if reason is "changed my mind" or "no longer needed" → high score (80-95).
If "defective" → lower score (40-60). If "wrong item" → high (85-95).

Return ONLY JSON: {{"green_score": <int>, "suggested_price": <int>, "condition_label": "<Open Box|Like New|Good|Fair>", "reasoning": "<brief>"}}"""

        messages = [{"role": "user", "content": [{"text": prompt}]}]
        response_text = ai._converse(messages)
        ai_result = ai._parse_json_response(response_text)
        green_score = ai_result.get("green_score", 75)
        suggested_price = ai_result.get("suggested_price", int(float(ret.get("original_price", 5000)) * 0.6))
        condition_label = ai_result.get("condition_label", "Open Box")
    except Exception:
        # Fallback if AI fails
        green_score = random.randint(60, 90)
        suggested_price = int(float(ret.get("original_price", 5000)) * 0.6)
        condition_label = "Open Box"

    # Create product listing on marketplace
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    warehouse_city = ret.get("warehouse_city", "Mumbai")
    listing_state = CITY_STATE_MAP.get(warehouse_city, "")

    product_data = {
        "product_id": product_id,
        "product_name": ret.get("product_name", ""),
        "category": ret.get("category", ""),
        "original_price": ret.get("original_price", "0"),
        "estimated_value": str(suggested_price),
        "condition_score": green_score,
        "condition_grade": condition_label,
        "image_urls": [ret.get("product_image_url", "")] if ret.get("product_image_url") else [],
        "routing_action": "direct_resale",
        "status": "active",
        "created_at": now,
        "seller_id": f"certified:{seller['seller_id']}",
        "seller_display_name": seller.get("company_name", seller.get("seller_name", "")),
        "city": warehouse_city,
        "listing_scope": "local",
        "listing_city": warehouse_city,
        "listing_state": listing_state,
        "green_impact_kg": str(round(green_score * 0.3, 1)),
        "green_credits": int(green_score * 0.5),
        "green_score": green_score,
        "demand_score": random.randint(50, 90),
        "amazon_verified": True,
        "is_return": True,
        "return_id": return_id,
        "condition_label": condition_label,
        "search_keywords": f"{ret.get('product_name', '').lower()} {ret.get('category', '').lower()} open box refurbished",
    }
    await db.put_item("sl_products", product_data)

    # Update return status
    ret["status"] = "listed"
    ret["green_score"] = green_score
    ret["listing_price"] = str(suggested_price)
    ret["listed_product_id"] = product_id
    timeline = ret.get("timeline", [])
    timeline.append({"status": "listed", "timestamp": now, "note": f"Listed on marketplace at ₹{suggested_price} (Green Score: {green_score})"})
    ret["timeline"] = timeline
    await db.put_item("sl_returns", ret)

    # Award seller green credits for local listing
    seller["green_credits"] = int(seller.get("green_credits", 0)) + LOCAL_SALE_GREEN_CREDITS
    gc_history = seller.get("green_credits_history", [])
    gc_history.append({
        "credits": LOCAL_SALE_GREEN_CREDITS,
        "type": "earn",
        "reason": f"Listed locally: {ret.get('product_name', 'Product')} in {warehouse_city}",
        "return_id": return_id,
        "timestamp": now,
    })
    seller["green_credits_history"] = gc_history
    await db.put_item("certified_sellers", seller)

    # Update demand score for this city+category (+2 on listing activity)
    try:
        demand_record = await db.get_item("sl_demand_scores", {"city": warehouse_city, "category": ret.get("category", "")})
        if demand_record:
            demand_record["demand_score"] = min(99, int(demand_record.get("demand_score", 50)) + 2)
            demand_record["last_updated"] = now
            await db.put_item("sl_demand_scores", demand_record)
    except Exception:
        pass

    return {
        "message": f"✅ Listed on marketplace! Green Score: {green_score}/100, Price: ₹{suggested_price}. +{LOCAL_SALE_GREEN_CREDITS} green credits earned!",
        "product_id": product_id,
        "green_score": green_score,
        "suggested_price": suggested_price,
        "condition_label": condition_label,
    }


ROUTING_FEE_PER_PRODUCT = 50  # ₹50 routing fee
LOCAL_SALE_GREEN_CREDITS = 50
ROUTED_SALE_GREEN_CREDITS = 30

WAREHOUSE_MAP = {
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


@router.post("/certified-seller/route-product/{return_id}")
async def route_product_to_city(return_id: str, data: dict, seller: dict = Depends(get_current_certified_seller)):
    """Route a warehouse product to another city's warehouse and list on marketplace.
    Also supports re-routing already listed products (seller changes mind)."""
    from routers._city_state_map import CITY_STATE_MAP
    from services.bedrock_service import BedrockService
    import uuid, random

    target_city = data.get("target_city", "")
    if not target_city or target_city not in WAREHOUSE_MAP:
        raise HTTPException(status_code=400, detail="Invalid target city")

    ret = await db.get_item("sl_returns", {"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret.get("seller_id") != seller["seller_id"]:
        raise HTTPException(status_code=403, detail="Not your product")
    if ret.get("status") not in ("at_warehouse", "listed"):
        raise HTTPException(status_code=400, detail="Product must be at warehouse or listed to reroute")

    # If product is currently listed, check it hasn't been sold
    old_product_id = ret.get("listed_product_id", "")
    if ret.get("status") == "listed" and old_product_id:
        old_product = await db.get_item("sl_products", {"product_id": old_product_id})
        if old_product and old_product.get("status") == "sold":
            raise HTTPException(status_code=400, detail="Product already sold — cannot reroute")
        # Deactivate old marketplace listing
        if old_product:
            old_product["status"] = "inactive"
            await db.put_item("sl_products", old_product)

    old_city = ret.get("warehouse_city", "")
    if old_city == target_city:
        return {"message": "Product is already in this warehouse", "city": target_city}

    now = datetime.now(timezone.utc).isoformat()
    target_warehouse = WAREHOUSE_MAP[target_city]
    target_state = CITY_STATE_MAP.get(target_city, "")

    # Update return record — move to target warehouse
    ret["warehouse_city"] = target_city
    ret["warehouse_id"] = target_warehouse["id"]
    ret["warehouse_address"] = target_warehouse["address"]
    ret["routed_to_city"] = target_city
    ret["routing_fee"] = str(ROUTING_FEE_PER_PRODUCT)
    ret["status"] = "listed"  # Auto-list on marketplace after reroute

    timeline = ret.get("timeline", [])
    timeline.append({
        "status": "routed",
        "timestamp": now,
        "note": f"Routed from {old_city} → {target_city} (fee: ₹{ROUTING_FEE_PER_PRODUCT})"
    })
    timeline.append({
        "status": "listed",
        "timestamp": now,
        "note": f"Auto-listed on {target_city} marketplace"
    })
    ret["timeline"] = timeline

    # Generate green score for the product
    try:
        ai = BedrockService()
        prompt = f"""Rate this returned product for resale (0-100 green score).
Product: {ret.get('product_name')}
Category: {ret.get('category')}
Return reason: {ret.get('return_reason')}
Original price: ₹{ret.get('original_price')}

Consider: if reason is "changed my mind" or "no longer needed" → high score (80-95).
If "defective" → lower score (40-60). If "wrong item" → high (85-95).

Return ONLY JSON: {{"green_score": <int>, "suggested_price": <int>, "condition_label": "<Open Box|Like New|Good|Fair>"}}"""

        messages = [{"role": "user", "content": [{"text": prompt}]}]
        response_text = ai._converse(messages)
        ai_result = ai._parse_json_response(response_text)
        green_score = ai_result.get("green_score", 75)
        suggested_price = ai_result.get("suggested_price", int(float(ret.get("original_price", 5000)) * 0.55))
        condition_label = ai_result.get("condition_label", "Open Box")
    except Exception:
        green_score = random.randint(60, 85)
        suggested_price = int(float(ret.get("original_price", 5000)) * 0.55)
        condition_label = "Open Box"

    # Create marketplace listing in target city with state visibility
    product_id = str(uuid.uuid4())
    product_data = {
        "product_id": product_id,
        "product_name": ret.get("product_name", ""),
        "category": ret.get("category", ""),
        "original_price": ret.get("original_price", "0"),
        "estimated_value": str(suggested_price),
        "condition_score": green_score,
        "condition_grade": condition_label,
        "image_urls": [ret.get("product_image_url", "")] if ret.get("product_image_url") else [],
        "routing_action": "routed_resale",
        "status": "active",
        "created_at": now,
        "seller_id": f"certified:{seller['seller_id']}",
        "seller_display_name": seller.get("company_name", seller.get("seller_name", "")),
        "city": target_city,
        "listing_scope": "local",
        "listing_city": target_city,
        "listing_state": target_state,
        "green_impact_kg": str(round(green_score * 0.3, 1)),
        "green_credits": ROUTED_SALE_GREEN_CREDITS,
        "green_score": green_score,
        "demand_score": random.randint(50, 90),
        "amazon_verified": True,
        "is_return": True,
        "return_id": return_id,
        "condition_label": condition_label,
        "routed_from": old_city,
        "search_keywords": f"{ret.get('product_name', '').lower()} {ret.get('category', '').lower()} open box refurbished routed",
    }
    await db.put_item("sl_products", product_data)

    # Update return with listing info
    ret["green_score"] = green_score
    ret["listing_price"] = str(suggested_price)
    ret["listed_product_id"] = product_id
    await db.put_item("sl_returns", ret)

    # Update demand score for target city+category (+2 on routing activity)
    try:
        demand_record = await db.get_item("sl_demand_scores", {"city": target_city, "category": ret.get("category", "")})
        if demand_record:
            demand_record["demand_score"] = min(99, int(demand_record.get("demand_score", 50)) + 2)
            demand_record["last_updated"] = now
            await db.put_item("sl_demand_scores", demand_record)
    except Exception:
        pass

    # Award seller green credits for routed listing (less than local)
    seller["green_credits"] = int(seller.get("green_credits", 0)) + ROUTED_SALE_GREEN_CREDITS
    gc_history = seller.get("green_credits_history", [])
    gc_history.append({
        "credits": ROUTED_SALE_GREEN_CREDITS,
        "type": "earn",
        "reason": f"Routed: {ret.get('product_name', 'Product')} to {target_city}",
        "return_id": return_id,
        "timestamp": now,
    })
    seller["green_credits_history"] = gc_history
    await db.put_item("certified_sellers", seller)

    return {
        "message": f"✅ Routed {old_city} → {target_city} and listed on marketplace! Price: ₹{suggested_price} (Green Score: {green_score}). +{ROUTED_SALE_GREEN_CREDITS} green credits!",
        "from_city": old_city,
        "to_city": target_city,
        "warehouse": target_warehouse,
        "routing_fee": ROUTING_FEE_PER_PRODUCT,
        "green_score": green_score,
        "suggested_price": suggested_price,
        "product_id": product_id,
        "green_credits_on_sale": ROUTED_SALE_GREEN_CREDITS,
    }


@router.get("/certified-seller/demand-overview")
async def get_demand_overview(seller: dict = Depends(get_current_certified_seller)):
    """Get demand overview from DynamoDB — real data, not random."""
    from typing import Optional
    category_filter: Optional[str] = None  # Can be extended with query param later

    cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Lucknow", "Chandigarh"]
    demand = []

    for city in cities:
        # Get all category scores for this city
        city_scores = []
        all_demand = await db.scan_table("sl_demand_scores", limit=200)
        city_records = [d for d in all_demand if d.get("city") == city]

        if city_records:
            avg_score = int(sum(int(r.get("demand_score", 50)) for r in city_records) / len(city_records))
            top_categories = sorted(city_records, key=lambda x: int(x.get("demand_score", 0)), reverse=True)[:2]
            avg_days = int(sum(int(r.get("avg_days_to_sell", 10)) for r in city_records) / len(city_records))
        else:
            avg_score = 50
            top_categories = []
            avg_days = 10

        demand.append({
            "city": city,
            "warehouse_id": WAREHOUSE_MAP.get(city, {}).get("id", ""),
            "demand_score": avg_score,
            "trending_categories": [r.get("category", "") for r in top_categories],
            "avg_days_to_sell": avg_days,
            "buyer_count": int(sum(int(r.get("buyer_count", 0)) for r in city_records)) if city_records else 0,
        })

    demand.sort(key=lambda x: x["demand_score"], reverse=True)
    return {"demand": demand}


@router.get("/certified-seller/demand-by-category")
async def get_demand_by_category(category: str, seller: dict = Depends(get_current_certified_seller)):
    """Get demand scores for a specific category across all cities.
    Returns all 12 warehouses — uses fallback score for cities without specific data."""
    import random

    ALL_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Lucknow", "Chandigarh"]

    all_demand = await db.scan_table("sl_demand_scores", limit=200)
    category_data = [d for d in all_demand if d.get("category", "").lower() == category.lower()]

    # Create lookup by city
    city_demand = {d.get("city"): d for d in category_data}

    result = []
    for city in ALL_CITIES:
        if city in city_demand:
            d = city_demand[city]
            result.append({
                "city": city,
                "demand_score": int(d.get("demand_score", 50)),
                "buyer_count": int(d.get("buyer_count", 0)),
                "avg_days_to_sell": int(d.get("avg_days_to_sell", 10)),
            })
        else:
            # Fallback for categories not in seed data
            result.append({
                "city": city,
                "demand_score": random.randint(30, 65),
                "buyer_count": random.randint(50, 200),
                "avg_days_to_sell": random.randint(8, 18),
            })

    result.sort(key=lambda x: x["demand_score"], reverse=True)
    return {"category": category, "demand": result}


@router.post("/certified-seller/update-city")
async def update_seller_city(data: dict, seller: dict = Depends(get_current_certified_seller)):
    """Update certified seller's city/location."""
    city = data.get("city", "")
    if not city:
        raise HTTPException(status_code=400, detail="City is required")

    seller["city"] = city
    seller["warehouse_city"] = city
    await db.put_item("certified_sellers", seller)

    return {"message": f"Location updated to {city}", "city": city}


@router.get("/certified-seller/green-credits")
async def get_seller_green_credits(seller: dict = Depends(get_current_certified_seller)):
    """Get certified seller's green credits balance and history."""
    balance = int(seller.get("green_credits", 0))
    history = seller.get("green_credits_history", [])
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


@router.post("/certified-seller/redeem-credits")
async def redeem_seller_credits(data: dict, seller: dict = Depends(get_current_certified_seller)):
    """Redeem green credits for a voucher/coupon."""
    amount = int(data.get("amount", 0))
    voucher_type = data.get("voucher_type", "")

    if not amount or not voucher_type:
        raise HTTPException(status_code=400, detail="Amount and voucher type required")

    balance = int(seller.get("green_credits", 0))
    if balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Have {balance}, need {amount}")

    import random as rnd, string
    voucher_code = "SL-" + "".join(rnd.choices(string.ascii_uppercase + string.digits, k=8))

    seller["green_credits"] = balance - amount
    gc_history = seller.get("green_credits_history", [])
    gc_history.append({
        "credits": amount,
        "type": "redeem",
        "reason": f"Redeemed: {voucher_type}",
        "voucher_code": voucher_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    seller["green_credits_history"] = gc_history
    await db.put_item("certified_sellers", seller)

    return {
        "message": f"🎉 Redeemed {amount} credits for {voucher_type}!",
        "voucher_code": voucher_code,
        "new_balance": seller["green_credits"],
    }
