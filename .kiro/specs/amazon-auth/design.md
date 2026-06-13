# Technical Design Document

## Overview

Adds Amazon-style authentication to SecondLife AI. Zero changes to existing routers, pages, or business logic. New backend router + model + frontend pages + context.

## Architecture

### Backend Changes

**New files:**
- `backend/routers/auth.py` — register, login, `/me` endpoints + `get_current_user` dependency
- `backend/models/user.py` — Pydantic models: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserPublic`

**Modified files (minimal):**
- `backend/main.py` — add 2 lines: import auth router + mount it
- `backend/requirements.txt` — add `python-jose[cryptography]>=3.3.0` and `passlib[bcrypt]>=1.7.4`
- `backend/.env.example` — add `JWT_SECRET_KEY` and `JWT_ALGORITHM=HS256`

### Frontend Changes

**New files:**
- `frontend/src/context/AuthContext.jsx` — React context: `user`, `login()`, `logout()`, `isAuthenticated`
- `frontend/src/hooks/useAuth.js` — thin hook that consumes AuthContext
- `frontend/src/app/login/page.jsx` — Amazon-style login page
- `frontend/src/app/register/page.jsx` — Amazon-style registration page

**Modified files (minimal):**
- `frontend/src/app/layout.jsx` — wrap body with `<AuthProvider>`
- `frontend/src/components/layout/Navbar.jsx` — add auth-aware section at end of desktop nav and mobile menu
- `frontend/src/lib/api.js` — add `authApi` object + 401 response interceptor
- `frontend/package.json` — add `"js-cookie": "^3.0.5"`

### Data Model

`sl_users` DynamoDB table (partition key: `user_id`):
```json
{
  "user_id": "uuid-v4",
  "name": "string (1-100 chars)",
  "email": "string (unique, RFC5321)",
  "phone": "string (Indian_Phone ^[6-9]\\d{9}$)",
  "password_hash": "string (bcrypt)",
  "green_credits": 0,
  "products_sold": [],
  "products_bought": [],
  "products_donated": [],
  "transactions": [],
  "created_at": "ISO8601 UTC"
}
```

### JWT Structure

```json
{"sub": "user_id", "exp": unix_timestamp, "name": "user name", "email": "user email"}
```

- Default expiry: 24 hours
- Remember-me expiry: 7 days
- Algorithm: HS256 (from `JWT_ALGORITHM` env)
- Secret: from `JWT_SECRET_KEY` env

### Rate Limiting

In-memory dict in `auth.py`: tracks `{identifier: [timestamp, ...]}`. If 5 failures within 15 min → HTTP 429.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | None | Register new user |
| POST | /api/v1/auth/login | None | Login, returns JWT |
| GET | /api/v1/auth/me | Bearer JWT | Returns current user |

### Scan-based Uniqueness Check

Since `sl_users` uses `user_id` as partition key only, email/phone uniqueness is checked by scanning the table for matching values before insert. The DynamoDBService.scan_table() method is already implemented and handles both real DynamoDB and local fallback.

### AuthContext Initialization

On mount, reads `localStorage.sl_token`, base64-decodes the JWT payload, checks `exp` vs Date.now()/1000. If valid → sets user state. If expired/malformed → removes token.

### 401 Auto-Logout

`api.js` response interceptor: on 401, if `window.location.pathname !== '/login'`, calls `localStorage.removeItem('sl_token')` and `window.location.href = '/login'`.
