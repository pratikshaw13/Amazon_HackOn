"""
Seller Portal Router — Seller registration, dashboard, and product management.
"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import os

from models.seller import SellerRegister, SellerLogin, RoutingDecisionUpdate
from services.dynamodb_service import DynamoDBService
from passlib.context import CryptContext

router = APIRouter()
db = DynamoDBService()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_seller(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """Dependency: extract seller from JWT."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        seller_id = payload.get("sub")
        if not seller_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    seller = await db.get_item("sl_sellers", {"seller_id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller


@router.post("/seller/register", status_code=201)
async def register_seller(request: SellerRegister):
    """Register a new seller."""
    # Check email uniqueness
    sellers = await db.scan_table("sl_sellers", limit=500)
    for s in sellers:
        if s.get("email", "").lower() == request.email.lower():
            raise HTTPException(status_code=409, detail="Email already registered as seller")

    seller_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    seller_record = {
        "seller_id": seller_id,
        "seller_name": request.seller_name,
        "business_name": request.business_name or "",
        "phone": request.phone,
        "email": request.email.lower().strip(),
        "password_hash": pwd_context.hash(request.password),
        "warehouse_location": request.warehouse_location or "",
        "products_listed": 0,
        "products_sold": 0,
        "revenue_generated": "0",
        "products": [],
        "created_at": now
    }
    await db.put_item("sl_sellers", seller_record)

    token = jwt.encode(
        {"sub": seller_id, "name": request.seller_name, "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
        JWT_SECRET_KEY, algorithm=JWT_ALGORITHM
    )

    return {
        "access_token": token,
        "seller_id": seller_id,
        "seller_name": request.seller_name,
        "message": "Seller registered successfully"
    }


@router.post("/seller/login")
async def login_seller(request: SellerLogin):
    """Seller login."""
    sellers = await db.scan_table("sl_sellers", limit=500)
    seller = None
    for s in sellers:
        if s.get("email", "").lower() == request.email.lower():
            seller = s
            break

    if not seller:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(request.password, seller.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"sub": seller["seller_id"], "name": seller["seller_name"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET_KEY, algorithm=JWT_ALGORITHM
    )

    return {
        "access_token": token,
        "seller_id": seller["seller_id"],
        "seller_name": seller["seller_name"]
    }


@router.get("/seller/dashboard")
async def seller_dashboard(seller: dict = Depends(get_current_seller)):
    """Seller dashboard with product stats."""
    # Get all products by this seller
    all_products = await db.scan_table("sl_products", limit=200)
    seller_products = [p for p in all_products if p.get("seller_id") == seller["seller_id"]]

    awaiting_review = [p for p in seller_products if p.get("status") == "pending_review"]
    graded = [p for p in seller_products if p.get("condition_grade")]
    awaiting_routing = [p for p in seller_products if p.get("status") == "awaiting_routing"]
    routed = [p for p in seller_products if p.get("routing_action")]
    sold = [p for p in seller_products if p.get("status") == "sold"]

    revenue = sum(float(p.get("estimated_value", 0)) for p in sold)

    return {
        "seller": {
            "seller_id": seller["seller_id"],
            "seller_name": seller["seller_name"],
            "business_name": seller.get("business_name", ""),
            "warehouse_location": seller.get("warehouse_location", ""),
        },
        "stats": {
            "products_listed": len(seller_products),
            "awaiting_review": len(awaiting_review),
            "graded_by_ai": len(graded),
            "awaiting_routing": len(awaiting_routing),
            "routed": len(routed),
            "sold": len(sold),
            "revenue_generated": revenue
        },
        "products": seller_products[:20]
    }


@router.get("/seller/products")
async def seller_products(seller: dict = Depends(get_current_seller)):
    """Get all products listed by this seller."""
    all_products = await db.scan_table("sl_products", limit=200)
    seller_products = [p for p in all_products if p.get("seller_id") == seller["seller_id"]]
    return {"products": seller_products}
