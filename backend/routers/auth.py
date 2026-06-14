"""
Auth Router — Register, Login, /me endpoints + get_current_user dependency.
"""
import os
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Optional

# Suppress passlib's bcrypt version warning (bcrypt 4.x dropped __about__)
warnings.filterwarnings("ignore", ".*error reading bcrypt version.*")
warnings.filterwarnings("ignore", ".*trapped.*bcrypt.*")

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext

from services.dynamodb_service import DynamoDBService
from models.user import RegisterRequest, LoginRequest, AuthResponse, UserPublic

router = APIRouter()
db = DynamoDBService()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT config
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Bearer scheme
bearer_scheme = HTTPBearer(auto_error=False)

# In-memory rate limiting: {identifier: [timestamp, ...]}
_failed_attempts: dict = defaultdict(list)
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW = 15 * 60  # 15 minutes in seconds


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: str, name: str, email: str, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": user_id,
        "name": name,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _check_rate_limit(identifier: str):
    """Raise 429 if identifier has >= 5 failures in the last 15 minutes."""
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - RATE_LIMIT_WINDOW
    # Prune old entries
    _failed_attempts[identifier] = [
        t for t in _failed_attempts[identifier] if t > window_start
    ]
    if len(_failed_attempts[identifier]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later."
        )


def _record_failure(identifier: str):
    """Record a failed login attempt."""
    _failed_attempts[identifier].append(datetime.now(timezone.utc).timestamp())


def _clear_failures(identifier: str):
    """Clear failures on successful login."""
    _failed_attempts.pop(identifier, None)


async def _find_user_by_email(email: str) -> Optional[dict]:
    """Scan sl_users for a user with matching email."""
    users = await db.scan_table("sl_users", limit=1000)
    for u in users:
        if u.get("email", "").lower() == email.lower():
            return u
    return None


async def _find_user_by_phone(phone: str) -> Optional[dict]:
    """Scan sl_users for a user with matching phone (strip +91 prefix for comparison)."""
    # Normalize: strip +91 prefix
    normalized = phone[3:] if phone.startswith("+91") else phone
    users = await db.scan_table("sl_users", limit=1000)
    for u in users:
        stored = u.get("phone", "")
        stored_normalized = stored[3:] if stored.startswith("+91") else stored
        if stored_normalized == normalized:
            return u
    return None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/auth/register", status_code=201, response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    # Check email uniqueness
    existing = await _find_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check phone uniqueness
    existing_phone = await _find_user_by_phone(request.phone)
    if existing_phone:
        raise HTTPException(status_code=409, detail="Phone number already registered")

    # Create user record
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_record = {
        "user_id": user_id,
        "name": request.name,
        "email": request.email.lower().strip(),
        "phone": request.phone,
        "password_hash": _hash_password(request.password),
        "green_credits": 0,
        "products_sold": [],
        "products_bought": [],
        "products_donated": [],
        "transactions": [],
        "created_at": now,
    }

    success = await db.put_item("sl_users", user_record)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create user")

    token = _create_token(user_id, request.name, request.email, timedelta(hours=24))
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        name=request.name,
        email=request.email,
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email or phone + password."""
    identifier = (request.identifier or "").strip()
    password = (request.password or "").strip()

    if not identifier or not password:
        raise HTTPException(
            status_code=400,
            detail="identifier and password are required"
        )

    # Rate limit check
    _check_rate_limit(identifier)

    # Find user by email or phone
    user = await _find_user_by_email(identifier)
    if not user:
        user = await _find_user_by_phone(identifier)

    if not user:
        _record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not _verify_password(password, user.get("password_hash", "")):
        _record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Clear failures on success
    _clear_failures(identifier)

    expires = timedelta(days=7) if request.remember_me else timedelta(hours=24)
    token = _create_token(user["user_id"], user["name"], user["email"], expires)

    return AuthResponse(
        access_token=token,
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
    )


@router.get("/auth/me", response_model=UserPublic)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Return the current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserPublic(
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
        phone=user.get("phone", ""),
        green_credits=int(user.get("green_credits", 0)),
    )


# ─── Reusable dependency ──────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """
    FastAPI dependency. Returns the user dict from sl_users.
    Import and use in other routers: Depends(get_current_user)
    Raises 401 if token is missing/invalid/expired.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get_item("sl_users", {"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/auth/update-city")
async def update_city(data: dict, user: dict = Depends(get_current_user)):
    """Update user's city and state location."""
    city = data.get("city", "")
    state = data.get("state", "")
    if not city:
        raise HTTPException(status_code=400, detail="City is required")

    user_record = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if user_record:
        user_record["city"] = city
        user_record["state"] = state
        await db.put_item("sl_users", user_record)

    return {"message": f"Location updated to {city}, {state}", "city": city, "state": state}
