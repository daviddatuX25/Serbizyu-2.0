# Design — D1-Story-1.2: Sign In and Recover Without Enumeration

## Change ID
`d1-story-1-2-sign-in-and-recover`

## Master Delivery Plan §7 Conformance (15-Section LLD Contract + §7.1 Review Matrix)

---

### 1. Functional Context & Use Cases
- **Actor:** Returning Citizen or Provider (Direct Participation Mode).
- **Use Case 1 (Phone + Password Sign-In):** Participant inputs E.164 phone and password. System checks hash via `Hash::check()`, ensures user is `active` and `phone_verified_at` is set, regenerates session, and signs in.
- **Use Case 2 (Email + Password Sign-In):** Participant inputs linked email and password. System authenticates user, ensures user is `active` and verified, and regenerates session.
- **Use Case 3 (SMS OTP Fallback Sign-In):** Participant requests login OTP on verified phone. System issues hashed challenge to `auth_otps` (`purpose = 'login'`). Verification consumes OTP, regenerates session, and signs in without touching `phone_verified_at`.
- **Use Case 4 (Password Reset via Email):** Participant requests reset link. System dispatches email token. Form submission validates token, resets password, marks token consumed, and redirects to sign-in without logging the user in.
- **Use Case 5 (Password Reset via SMS):** Participant requests SMS reset. System dispatches 6-digit OTP (`purpose = 'password_reset'`). Verification and password update consume OTP and invalidate other sessions without logging user in.
- **Use Case 6 (Anti-Enumeration Protection):** Requests for unknown, unverified, or suspended identifiers receive generic responses (`code_pending` or generic credentials error).

---

### 2. State & Security Invariants
- **Zero Account Provisioning on SMS Login:** `PhoneOtpAuthService` never creates users.
- **Single-Use Consumption:** Every OTP and password reset token is consumed atomically.
- **Attempt Tracking & Lockout:** Max 5 failed attempts per challenge.
- **Named Rate Limiting:** All endpoints bounded by named limiters in `bootstrap/app.php`.
- **Session Regeneration:** `$request->session()->regenerate()` on every sign-in; `$request->session()->invalidate()` on logout.
