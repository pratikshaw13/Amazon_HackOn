# Requirements Document

## Introduction

This document defines the requirements for adding Amazon-style authentication to the SecondLife AI platform. The system currently has an MVP with functional pages (Dashboard, Marketplace, Sell/Donate, Heatmap, Prevention, Green Credits, AI Agents, Health Passport) and an `sl_users` DynamoDB table. This feature adds user registration, login, JWT-based session management, and auth-aware navigation — built on top of the existing stack (Next.js 14 App Router + FastAPI + DynamoDB) without modifying any existing routers, pages, or behaviour.

---

## Glossary

- **Auth_Service**: The FastAPI router at `routers/auth.py` that handles registration, login, and identity endpoints.
- **Token_Store**: The browser `localStorage` key `sl_token` where the JWT is persisted on the frontend.
- **JWT**: JSON Web Token — a signed, self-contained access token used to authenticate requests.
- **AuthContext**: The React context (`src/context/AuthContext.jsx`) that exposes `user`, `login()`, `logout()`, and `isAuthenticated` to the frontend component tree.
- **Navbar**: The existing `src/components/layout/Navbar.jsx` component that renders site-wide navigation.
- **User_Schema**: The item structure stored in the `sl_users` DynamoDB table.
- **Password_Hasher**: The `passlib[bcrypt]` utility used to hash and verify passwords.
- **Indian_Phone**: A 10-digit mobile number matching the pattern `^[6-9]\d{9}$` (valid Indian mobile numbers starting with 6–9), optionally prefixed with `+91`.
- **Secret_Key**: The `JWT_SECRET_KEY` environment variable used to sign JWTs.
- **Algorithm**: The `JWT_ALGORITHM` environment variable (e.g., `HS256`) used to sign JWTs.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account with my name, mobile number, email, and password, so that I can access personalised features of the platform.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/v1/auth/register` endpoint that accepts `name` (1–100 characters, required), `email` (valid RFC 5321 format, max 254 characters, required), `phone` (matching Indian_Phone pattern, required), `password` (8–128 characters, required), and `confirm_password` (8–128 characters, required) fields.
2. WHEN a registration request is received with a `phone` value that does not match the Indian_Phone pattern, THE Auth_Service SHALL return HTTP 422 with a field-level validation error identifying the `phone` field.
3. WHEN a registration request is received where `password` and `confirm_password` do not match, THE Auth_Service SHALL return HTTP 400 with a response body containing `{"detail": "Passwords do not match"}`.
4. WHEN a registration request is received with an `email` that already exists in the `sl_users` table, THE Auth_Service SHALL return HTTP 409 with a response body containing `{"detail": "Email already registered"}`.
5. WHEN a registration request is received with a `phone` that already exists in the `sl_users` table (excluding the current request's email), THE Auth_Service SHALL return HTTP 409 with a response body containing `{"detail": "Phone number already registered"}`.
6. WHEN all registration fields are valid and the email and phone are unique, THE Auth_Service SHALL hash the password using the Password_Hasher and store the User_Schema item in `sl_users` with `green_credits` set to 0 and `products_sold`, `products_bought`, `products_donated`, and `transactions` set to empty arrays.
7. WHEN a user is successfully registered, THE Auth_Service SHALL return HTTP 201 with a JSON body containing `access_token` (JWT with 24-hour expiry), `token_type` (`"bearer"`), `user_id`, `name`, and `email`.
8. THE Auth_Service SHALL generate each `user_id` as a UUID v4 at registration time.
9. THE Auth_Service SHALL record `created_at` as the ISO 8601 UTC datetime at the moment of registration.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email or mobile number and password, so that I can access my account.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a `POST /api/v1/auth/login` endpoint that accepts `identifier` (email address or Indian_Phone number, required), `password` (required), and `remember_me` (boolean, optional, defaults to `false`).
2. WHEN a login request is received with `identifier` or `password` missing or empty, THE Auth_Service SHALL return HTTP 400 with `{"detail": "identifier and password are required"}`.
3. WHEN a login request is received with an `identifier` that does not match any record in `sl_users` by email or phone, THE Auth_Service SHALL return HTTP 401 with `{"detail": "Invalid credentials"}`.
4. WHEN a login request is received with a matching `identifier` but an incorrect `password`, THE Auth_Service SHALL return HTTP 401 with `{"detail": "Invalid credentials"}`.
5. WHEN a login request is received with valid `identifier` and `password` and `remember_me` is `true`, THE Auth_Service SHALL return a JWT with a 7-day expiry.
6. WHEN a login request is received with valid `identifier` and `password` and `remember_me` is `false` or absent, THE Auth_Service SHALL return a JWT with a 24-hour expiry.
7. WHEN login succeeds, THE Auth_Service SHALL return HTTP 200 with `access_token` (JWT), `token_type` (`"bearer"`), `user_id`, `name`, and `email`.
8. IF a single `identifier` accumulates 5 consecutive failed login attempts within a 15-minute window, THE Auth_Service SHALL return HTTP 429 with `{"detail": "Too many failed attempts. Try again later."}` for subsequent attempts within that window.

---

### Requirement 3: JWT Generation and Validation

**User Story:** As the platform, I want all API access tokens to be cryptographically signed JWTs, so that user identity can be verified without a database lookup on every request.

#### Acceptance Criteria

1. THE Auth_Service SHALL sign all JWTs using the `JWT_SECRET_KEY` and `JWT_ALGORITHM` values loaded from environment variables, with a minimum payload of `{"sub": user_id, "exp": expiry_timestamp}`.
2. IF a protected endpoint receives a request with a missing `Authorization` header or a header that does not match the pattern `Bearer <token>`, THE Auth_Service SHALL return HTTP 401 with `{"detail": "Not authenticated"}`.
3. IF a protected endpoint receives a request with an expired JWT, THE Auth_Service SHALL return HTTP 401 with `{"detail": "Token has expired"}`.
4. IF a protected endpoint receives a request with a JWT that has an invalid signature or is otherwise malformed, THE Auth_Service SHALL return HTTP 401 with `{"detail": "Invalid token"}`.
5. WHEN a protected endpoint receives a request with a valid, unexpired JWT, THE Auth_Service SHALL extract `user_id` from the token's `sub` claim and make it available to the handler via a `get_current_user` FastAPI dependency that returns the user's record from `sl_users`.
6. THE Auth_Service SHALL expose a `GET /api/v1/auth/me` endpoint that requires a valid JWT and returns the authenticated user's `user_id`, `name`, `email`, `phone`, and `green_credits`; IF the `user_id` from the token does not exist in `sl_users`, the endpoint SHALL return HTTP 404 with `{"detail": "User not found"}`.
7. THE Auth_Service SHALL provide the `get_current_user` dependency function in a shared module (`routers/auth.py` or `utils/auth.py`) so other routers can optionally import and use it without changes to any existing router file.

---

### Requirement 4: Frontend Token Management

**User Story:** As a user, I want my session to persist across browser tabs and page refreshes, so that I do not have to log in repeatedly.

#### Acceptance Criteria

1. WHEN the AuthContext `login()` function is called with a JWT, THE AuthContext SHALL store the token in the Token_Store (`localStorage` key `sl_token`) and update `user` and `isAuthenticated` synchronously.
2. WHEN the AuthContext `logout()` function is called, THE AuthContext SHALL remove the token from the Token_Store and set `user` to `null` and `isAuthenticated` to `false`.
3a. WHEN the AuthContext initialises (page load or refresh) and a token is present in the Token_Store and the token is not expired, THE AuthContext SHALL set `isAuthenticated` to `true` and populate `user` with the decoded token payload (`user_id`, `name`, `email`).
3b. WHEN the AuthContext initialises and a token is present in the Token_Store but the token is expired or malformed, THE AuthContext SHALL remove the token from the Token_Store and set `isAuthenticated` to `false` and `user` to `null`.
4. WHEN the `api.js` module makes any outbound request and a token exists in the Token_Store, THE api.js interceptor SHALL attach the token as `Authorization: Bearer <token>` on that request.
5. WHEN any API response made via the `api.js` module returns HTTP 401 and the browser is not already on the `/login` page, THE AuthContext SHALL call `logout()` and redirect the browser to `/login`.

---

### Requirement 5: Registration Page

**User Story:** As a new visitor, I want an Amazon-style registration page, so that I can create an account through a familiar and trustworthy interface.

#### Acceptance Criteria

1. THE Registration_Page SHALL be accessible at the `/register` route in the Next.js App Router.
2. THE Registration_Page SHALL render a centred white card containing required form fields for Full Name (max 100 characters), Mobile Number, Email Address (max 254 characters), Password (8–128 characters), and Re-enter Password (8–128 characters); all fields must be marked as required.
3. WHEN the user attempts to submit the registration form with any of the following conditions — (a) phone value not matching pattern `^[6-9]\d{9}$`, (b) email value not matching a valid email format, (c) Password and Re-enter Password values not identical — THE Registration_Page SHALL display a field-level inline error message for each failing field and SHALL NOT submit the request to the Auth_Service.
4. WHEN the user attempts to submit the registration form with any required field empty, THE Registration_Page SHALL display a field-level inline error message "This field is required" for each empty field and SHALL NOT submit the request to the Auth_Service.
5. WHEN the registration form passes all client-side validation and the Auth_Service returns HTTP 201, THE Registration_Page SHALL call the AuthContext `login()` function with the returned JWT and redirect the user to the Dashboard (`/`).
6. IF the Auth_Service returns HTTP 409, THE Registration_Page SHALL display the server error message in a banner above the form and SHALL preserve all previously entered field values.
7. IF the Auth_Service returns any non-201, non-409 response or the network request fails, THE Registration_Page SHALL display a generic error banner "Something went wrong. Please try again." and SHALL preserve all previously entered field values.
8. THE Registration_Page SHALL include a link to the `/login` page labelled "Already have an account? Sign in".
9. THE Registration_Page SHALL be responsive: on viewports 320px wide and above, there SHALL be no horizontal scrollbar, no overlapping UI elements, and all form fields and labels SHALL be fully visible.

---

### Requirement 6: Login Page

**User Story:** As a returning user, I want an Amazon-style login page, so that I can sign in quickly and securely.

#### Acceptance Criteria

1. THE Login_Page SHALL be accessible at the `/login` route in the Next.js App Router.
2. THE Login_Page SHALL render a centred white card containing fields for Email or Mobile Number (required), Password (required, input masked), and a "Remember me" checkbox (unchecked by default).
3. WHEN the user clicks the "Forgot password?" link, THE Login_Page SHALL navigate to `#` (placeholder for future implementation).
4. WHEN the user clicks "Create your SecondLife account", THE Login_Page SHALL navigate to `/register`.
5. WHEN the user attempts to submit the login form with the Email/Mobile or Password field empty, THE Login_Page SHALL display a field-level error for each empty field and SHALL NOT submit to the Auth_Service.
6. WHEN the login form is submitted with a non-empty `identifier` and non-empty `password` and the Auth_Service returns HTTP 200, THE Login_Page SHALL store the returned JWT via the AuthContext `login()` function and redirect the user to the Dashboard (`/`).
7. IF the Auth_Service returns HTTP 401 or HTTP 429, THE Login_Page SHALL display the server-provided `detail` message in a banner above the form. IF the Auth_Service returns any other non-200 response or the network request fails, THE Login_Page SHALL display "Something went wrong. Please try again." in a banner above the form.
8. THE Login_Page SHALL mask the password field input (type="password") at all times.
9. THE Login_Page SHALL be responsive: on viewports 320px wide and above, there SHALL be no horizontal scrollbar, no overlapping UI elements, and all fields and buttons SHALL be fully visible and usable.

---

### Requirement 7: Auth-Aware Navbar

**User Story:** As a user, I want the navigation bar to reflect my authentication state, so that I can access my account or log in without navigating away.

#### Acceptance Criteria

1. WHILE `isAuthenticated` is `false`, THE Navbar SHALL display a "Sign In" link pointing to `/login` and a "Register" link pointing to `/register` in the desktop nav area.
2. WHILE `isAuthenticated` is `true`, THE Navbar SHALL display "Hello, {name}" in the desktop nav area where `{name}` is the value of `user.name` from the AuthContext.
3. WHEN the user clicks "Hello, {name}", THE Navbar SHALL toggle a dropdown menu containing links: "Profile" (`href="#"`), "My Listings" (`href="#"`), "My Orders" (`href="#"`), "Green Credits" (`href="/green"`), and "Sign Out"; a second click on "Hello, {name}" SHALL close the dropdown.
4. WHEN the user clicks "Sign Out" in the dropdown, THE Navbar SHALL call the AuthContext `logout()` function and navigate to `/login`.
5. THE Navbar SHALL preserve all existing `navItems` links and their active-state styling unchanged.
6. WHILE `isAuthenticated` is `false` and the mobile menu is open, THE Navbar SHALL display "Sign In" and "Register" links at the bottom of the mobile nav list.
7. WHILE `isAuthenticated` is `true` and the mobile menu is open, THE Navbar SHALL display "Hello, {name}" and a "Sign Out" link at the bottom of the mobile nav list; clicking "Sign Out" SHALL call `logout()`, navigate to `/login`, and close the mobile menu.

---

### Requirement 8: User Schema Extensibility

**User Story:** As the platform, I want the user record to include placeholder arrays for future features, so that the schema is forward-compatible without requiring a migration later.

#### Acceptance Criteria

1. WHEN a new user is created, THE Auth_Service SHALL store the following fields in the `sl_users` table: `user_id` (UUID v4 string), `name` (1–100 characters), `email` (valid email format, max 254 characters), `phone` (Indian_Phone string), `password_hash` (string), `green_credits` (number, default 0), `products_sold` (list, default []), `products_bought` (list, default []), `products_donated` (list, default []), `transactions` (list, default []), and `created_at` (ISO 8601 UTC string).
2. IF a registration request is received with any required field absent or empty, THE Auth_Service SHALL return HTTP 422 with field-level validation errors and SHALL NOT write any partial record to `sl_users`.
3. THE Auth_Service SHALL hash the password using the Password_Hasher before storing it as `password_hash` in the `sl_users` record; the plaintext password SHALL NOT be written to the user record or any log.
4. THE `GET /api/v1/auth/me` endpoint SHALL return exactly the following fields: `user_id`, `name`, `email`, `phone`, and `green_credits`; the `password_hash` field SHALL NOT appear in the response.

---

### Requirement 9: Dependency Additions

**User Story:** As a developer, I want the correct backend and frontend dependencies declared in their respective manifests, so that the project is reproducible across environments.

#### Acceptance Criteria

1. THE `backend/requirements.txt` file SHALL include `python-jose[cryptography]>=3.3.0` as a dependency entry for JWT signing and verification.
2. THE `backend/requirements.txt` file SHALL include `passlib[bcrypt]>=1.7.4` as a dependency entry for password hashing.
3. THE `frontend/package.json` file SHALL include `"js-cookie": "^3.0.5"` as a dependency entry.
