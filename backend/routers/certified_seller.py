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
