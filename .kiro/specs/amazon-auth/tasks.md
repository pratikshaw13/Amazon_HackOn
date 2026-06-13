# Implementation Tasks

- [ ] 1. Backend dependencies and environment
  - [ ] 1.1 Add `python-jose[cryptography]>=3.3.0` and `passlib[bcrypt]>=1.7.4` to `backend/requirements.txt`
  - [ ] 1.2 Add `JWT_SECRET_KEY` and `JWT_ALGORITHM=HS256` to `backend/.env.example`

- [ ] 2. Backend user model
  - [ ] 2.1 Create `backend/models/user.py` with RegisterRequest, LoginRequest, AuthResponse, UserPublic Pydantic models

- [ ] 3. Backend auth router
  - [ ] 3.1 Create `backend/routers/auth.py` with POST /register, POST /login, GET /me, and get_current_user dependency

- [ ] 4. Mount auth router in main.py
  - [ ] 4.1 Import auth router and add `app.include_router(auth.router, ...)` to `backend/main.py`

- [ ] 5. Frontend dependency
  - [ ] 5.1 Add `"js-cookie": "^3.0.5"` to `frontend/package.json`

- [ ] 6. AuthContext
  - [ ] 6.1 Create `frontend/src/context/AuthContext.jsx` with user, login(), logout(), isAuthenticated

- [ ] 7. useAuth hook
  - [ ] 7.1 Create `frontend/src/hooks/useAuth.js`

- [ ] 8. Update api.js
  - [ ] 8.1 Add authApi object and 401 response interceptor to `frontend/src/lib/api.js`

- [ ] 9. Update layout.jsx
  - [ ] 9.1 Wrap children with AuthProvider in `frontend/src/app/layout.jsx`

- [ ] 10. Login page
  - [ ] 10.1 Create `frontend/src/app/login/page.jsx` (Amazon-style)

- [ ] 11. Registration page
  - [ ] 11.1 Create `frontend/src/app/register/page.jsx` (Amazon-style)

- [ ] 12. Update Navbar
  - [ ] 12.1 Add auth-aware section to `frontend/src/components/layout/Navbar.jsx`
