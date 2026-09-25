# Proposal — D1-Story-1.1: Create and Resume a Secure Account

## Change ID
`d1-story-1-1-secure-registration-and-sign-in`

## Delivery Unit & Story Reference
- **Delivery Unit:** `D1` — Identity and attributable command integrity
- **Story:** `Story 1.1: Create and Resume a Secure Account` (`1-1-secure-registration-and-sign-in-for-citizens-and-providers`)
- **Epic:** `Epic 1: Participant Identity, Attributable Authority, and Operational Readiness`
- **Requirements Reference:** `PRD-001`, `PRD-008–009`; `UX-DR03`, `UX-DR14`.
- **Architectural Reference:** ADR-R-030 (Password-first hybrid mobile auth with SMS OTP fallback), ADR-R-044 (Essential notices).
- **Rule Reference:** `.ai/rules/http-and-auth.md`, `.ai/rules/identity.md`, `.ai/rules/agent-delegation.md`.

---

## 1. Problem Statement
In Serbizyu 2.0, participant identity is rooted in Philippine E.164 mobile numbers (+639...). To establish trustworthy participants while minimizing SMS operational cost and preventing fraud:
1. Registration requires real-time cryptographic/hash challenge verification (`auth_otps` with `purpose = 'signup_verify'`) before any account status becomes active.
2. Completed registration must immediately establish recoverable credentials (password set at onboarding) so return sign-in avoids SMS dependency.
3. Interrupted registrations must be safely and idempotently resumable without losing progress or creating orphaned database records.
4. All challenge issuance and verification must be rate-limited, strictly non-enumerating for existing/unknown accounts, single-use, lockable after 5 failed attempts, and reject expired challenges.

---

## 2. In-Scope Deliverables
1. **Phone Normalization & Verification Pipeline:**
   - Strict normalization of Philippine mobile numbers (09xx, +639xx, spaces/dashes stripped) to canonical E.164 (`+639xxxxxxxxx`).
   - Single-use, hashed challenge issuance to `auth_otps` (`signup_verify`).
   - Resumable onboarding: user record created in `pending` state upon request, transition to `active` and `phone_verified_at` stamped atomically upon successful OTP verification.
2. **Challenge Invariants & Anti-Enumeration:**
   - Existing verified accounts requesting signup OTP receive non-enumerating generic response (`code_pending`) without minting or delivering an OTP.
   - Suspended, closed, or archived accounts receive non-enumerating generic response.
   - Re-requesting an OTP invalidates any prior unconsumed OTP for the same phone and purpose.
   - 5 consecutive invalid code verification attempts lock out the OTP challenge.
   - Expired OTPs (> 600s TTL) are rejected with `OTP_INVALID`.
3. **Session & Idempotent Onboarding Continuation:**
   - Successful verification establishes an authenticated session (`Auth::login`) and regenerates the session ID.
   - Unauthenticated or incomplete users visiting `/onboarding` are redirected to `/auth/sign-in` or resume their pending profile completion without duplicate key conflicts.
4. **Automated Verification Suite:**
   - Dedicated Pest test suite `tests/Feature/IdentityAccess/Story1_1_RegistrationAndAccountCreationTest.php` proving every acceptance criterion under TDD.

---

## 3. Strict Non-Goals
- Return sign-in fallback and password-based sign-in are covered in Story 1.2 (`1-2-sign-in-and-recover-without-enumeration`).
- Role capability assignments and profile readiness ladder are covered in Story 1.3 (`1-3-manage-additive-capabilities-and-profile-readiness`).
- Identity evidence and verification review workflows belong to Story 1.4 (`1-4-submit-and-review-identity-evidence-safely`).
- Agent consent grants belong to Story 1.5 (`1-5-grant-and-revoke-agent-authority`).
- No modifications to database schemas or table creations: all required persistence tables (`users`, `user_profiles`, `auth_otps`) are already part of the canonical baseline.
