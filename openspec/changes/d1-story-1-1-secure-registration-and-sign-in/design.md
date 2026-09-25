# Design — D1-Story-1.1: Create and Resume a Secure Account

## Change ID
`d1-story-1-1-secure-registration-and-sign-in`

## Master Delivery Plan §7 Conformance (15-Section LLD Contract + §7.1 Review Matrix)

---

### 1. Functional Context & Use Cases
- **Actor:** Unregistered or in-progress Citizen or Provider (Direct Participation Mode).
- **Use Case 1 (Fresh Registration):** Participant provides Philippine mobile number and optional display name. Platform normalizes phone to `+639xxxxxxxxx`, registers user with `status = 'pending'`, issues 6-digit cryptographic OTP hashed with SHA-256 into `auth_otps` (`purpose = 'signup_verify'`, `expires_at = now() + 600s`).
- **Use Case 2 (Verification & Activation):** Participant submits the 6-digit code. Platform validates hash, checks expiration and attempt count, invalidates challenge (`consumed_at = now()`), activates user (`status = 'active'`, `phone_verified_at = now()`), authenticates the session, and redirects to `/onboarding`.
- **Use Case 3 (Resumed Onboarding):** If user abandons or session expires prior to setting password/completing onboarding, subsequent registration request with the same unverified phone re-uses the existing pending user without duplicating records.
- **Use Case 4 (Anti-Enumeration Protection):** If an already-verified or suspended phone requests signup OTP, system returns identical generic response (`status: 'code_pending'`) but neither records a new OTP in `auth_otps` nor sends SMS.

---

### 2. Relational Schema & State Storage
- **`users` table:**
  - `id`: UUIDv7 primary key.
  - `phone_e164`: Unique string (`+639\d{9}`).
  - `status`: Enum string (`pending`, `active`, `suspended`, `closed`, `archived`).
  - `phone_verified_at`: Timestamp (null for pending signups).
  - `primary_access_tier`: Default `'L0'`.
- **`user_profiles` table:**
  - `user_id`: Foreign key to `users.id` (1:1).
  - `display_name`: Participant visible name.
- **`auth_otps` table:**
  - `id`: UUIDv7 primary key.
  - `phone_e164`: Foreign identifier string.
  - `purpose`: `'signup_verify'` (and `'login'` for return flow).
  - `code_hash`: SHA-256 string hash of the 6-digit secret.
  - `attempts`: Integer (0–5).
  - `expires_at`: Timestamp (`created_at + 10 minutes`).
  - `consumed_at`: Nullable timestamp (set on successful verification or replacement).

---

### 3. Application Services & Invariants
- **`PhoneNumber::normalizePhilippineMobile(string $phone): string`**
  - Accepts `09171234567`, `+639171234567`, `(0917) 123-4567`.
  - Rejects foreign, malformed, or landline numbers with `RuntimeException('Use a valid Philippine mobile number.')`.
- **`StartSignup::handle(string $phone, string $correlationId, ?string $displayName = null): array`**
  - Checks if user exists:
    - If `phone_verified_at !== null` or `status in ['suspended', 'closed', 'archived']`, returns generic `code_pending` without OTP.
    - If `user === null`, inserts `pending` user and `user_profile`.
    - If `user !== null` (pending), reuses existing user and updates display name if provided.
  - Generates secure random 6-digit numeric string.
  - Invalidates any prior active OTP for `phone_e164` and `purpose = 'signup_verify'` (`consumed_at = now()`).
  - Inserts new `auth_otps` record and dispatches via `OtpDeliveryChannel`.
- **`CompleteSignupPhoneOtp::handle(string $phone, string $code, Request $request, string $correlationId): User`**
  - Fetches latest active OTP.
  - Verifies: `otp !== null`, `now() <= otp->expires_at`, `attempts < 5`.
  - Constant-time hash verification via `hash_equals()`. On failure, increments `attempts` in database and throws `IdentityAccessError('OTP_INVALID', ..., 422)`.
  - On 5th attempt failure, subsequent attempts are rejected outright.
  - In a single transaction: marks OTP consumed, marks user `active`, sets `phone_verified_at`, updates `correlation_id`.
  - Logs user into session and calls `$request->session()->regenerate()`.

---

### 4. Rate Limiting & Abuse Prevention
- **`auth-otp-request` limiter:** Keyed by identifier + IP, enforcing strict cooldowns (3 per minute, burst protection).
- **`auth-otp-verify` limiter:** Keyed by identifier + IP (5 per minute).
- **In-Database Attempt Lock:** Max 5 attempts tracked on the `auth_otps` row directly.

---

### 5. Security & Privacy Analysis
- **Timing Attack Mitigation:** SHA-256 hash comparison uses PHP's constant-time `hash_equals()`.
- **Zero Raw Code Persistence:** Raw 6-digit OTP is never persisted to database; only `code_hash` is stored.
- **Enumeration Prevention:** All public challenge endpoints return identical JSON schema:
  `{"data": {"phone_e164": "+639...", "status": "code_pending", "expires_in_seconds": 600}}`.

---

### 6. §7.1 Engineering Review Matrix (21-Area Assessment)
1. **Relational:** Primary keys are UUIDv7; foreign keys adhere to cascade/restrict; unique indexes on `phone_e164`.
2. **State Machines:** Registration states follow `pending -> active`; OTP follows `issued -> consumed / invalidated / expired`.
3. **Cutover & Concurrency:** Serialized database transactions for user creation and OTP invalidation; no race conditions on duplicate request.
4. **Sourcing Authority:** Phone identity is the single source of truth for participant authentication.
5. **Notice Intents:** High-risk auth mutations dispatch structured audit and delivery notices.
6. **Error Handling:** Standardized `IdentityAccessError` envelope with machine-readable error codes (`OTP_INVALID`, `PHONE_INVALID`, `ACCOUNT_UNAVAILABLE`).
7. **Session Management:** Regenerates session on authentication; destroys session on logout.
