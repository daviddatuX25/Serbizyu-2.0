# Proposal — D1-Story-1.2: Sign In and Recover Without Enumeration

## Change ID
`d1-story-1-2-sign-in-and-recover`

## Delivery Unit & Story Reference
- **Delivery Unit:** `D1` — Identity and attributable command integrity
- **Story:** `Story 1.2: Sign In and Recover Without Enumeration` (`1-2-sign-in-and-recover-without-enumeration`)
- **Epic:** `Epic 1: Participant Identity, Attributable Authority, and Operational Readiness`
- **Requirements Reference:** `PRD-001`, `PRD-008–009`, `PRD-075`; `UX-DR14`.
- **Architectural Reference:** ADR-R-030 (Password-first hybrid mobile auth with SMS OTP fallback).
- **Rule Reference:** `.ai/rules/http-and-auth.md`, `.ai/rules/identity.md`.

---

## 1. Problem Statement
In Serbizyu 2.0, returning participants access their accounts primarily via password (`phone + password` or `email + password`) to eliminate unnecessary SMS gateway expenses, with SMS OTP available as a fallback for verified accounts. 

To safeguard community trust and prevent malicious surveillance:
1. All sign-in and credential recovery endpoints must be strictly non-enumerating. They must never reveal whether an account exists, whether a phone number is registered, or whether an email is linked.
2. Suspended or unverified accounts must not gain access through any route.
3. Password recovery (via email link or phone SMS OTP) must issue single-use tokens with short TTLs and must never automatically authenticate the user upon reset.
4. Named rate limiters (`auth-login`, `auth-otp-request`, `auth-otp-verify`, `auth-password-reset`, `auth-password-reset-confirm`) must guard all endpoints.

---

## 2. In-Scope Deliverables
1. **Multi-Method Return Authentication:**
   - Phone + Password sign-in on `POST /auth/phone/login`.
   - Email + Password sign-in on `POST /auth/email/login`.
   - SMS OTP fallback sign-in on `POST /auth/phone/request` and `POST /auth/phone/verify` (`purpose = 'login'`).
2. **Credential Recovery Pipelines:**
   - Password reset via single-use email token on `POST /auth/password/email` and `POST /auth/password/reset`.
   - Password reset via single-use SMS OTP on `POST /auth/password/sms/request` and `POST /auth/password/sms/reset`.
3. **Anti-Enumeration Invariants:**
   - Nonexistent identifiers return identical generic failure shapes without exposing internal account presence.
   - Suspended/closed accounts reject sign-in with generic messaging.
4. **Session Lifecycle:**
   - Session regeneration on successful authentication (`$request->session()->regenerate()`).
   - Session destruction on logout (`POST /auth/logout`).
5. **Comprehensive TDD Test Suite:**
   - `tests/Feature/IdentityAccess/Story1_2_SignInAndRecoveryTest.php` implementing test-first coverage of all Story 1.2 acceptance criteria.
