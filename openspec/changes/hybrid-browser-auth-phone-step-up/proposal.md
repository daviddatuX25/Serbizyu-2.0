# Multi-method sign-in + strict mobile signup

Status: **ACCEPTED 2026-08-10** — authority amended; implementation not authorized until §1 implementation OpenSpec + Pest GO  
Change ID: `hybrid-browser-auth-phone-step-up`  
Plane: `C`, `T`, `S`  
Date: 2026-08-10 (intent clarified same day)  
Founder choice: **Rich sign-in options** + **strict mobile on signup**

## Intent (clear)

**Two different jobs — do not conflate them:**

| Job | Rule |
| --- | --- |
| **Sign up / register** | **Strict mobile verification is required.** Every new account must prove an E.164 Philippine mobile via OTP before signup is complete. Phone is the verified contact identity for the platform. |
| **Sign in / return visit** | **Rich options, password-first.** A returning user may sign in with **phone + password** or **email + password** (preferred, no SMS), **SMS OTP** (fallback), or **Google OAuth** (and later peers behind the same port). Ordinary return login should not force SMS-only. |

SMS cost control comes from: sessions after sign-in, throttles/cooldowns, and not making SMS the *only* return path — **not** from dropping phone on signup.

## Why this reopen

- Current ADR-R-030 / foundation plan make **phone-first OTP the primary browser identity** for ordinary login. That over-uses SMS for return visits.
- Tagudin still needs a **real verified mobile** for notices, Agent consent, L0, Provider trust, and recovery.
- Users expect modern sign-in choice (email, SMS, Google) once the account exists.

## Decision table

| Concern | Rule |
| --- | --- |
| Signup completeness | Blocked until `phone_verified_at` is set via OTP bind. No Google-only or email-only completed signup. |
| Onboarding | **Password required** (account-level) to finish AlmostThere/readiness; email remains optional. |
| Sign-in methods (L3) | **Password-first:** phone/password and email/password preferred; SMS OTP fallback; Google OAuth phased (contract includes all; live gated). |
| Password recovery | Email reset link (if email linked) or **SMS-OTP-verified reset** (fallback for phone-only accounts); single-use tokens, short expiry, rate-limited, generic copy. |
| Account linking | Google / email identities link to the **same user** that owns the verified phone. One phone → one account. |
| High-trust step-up | Provider enable, Agent consent, money/payout may still require fresh phone OTP even if signed in via Google/email. |
| Live SMS / live Google | Separately gated. Disposable envs: Fake OTP + mock/disabled Google. |
| L0 feature-phone | Unchanged: SMS notices / assisted paths; not “Google primary for L0”. |

## What this reopens (before any code)

| Artifact | Change |
| --- | --- |
| **ADR-R-030** | Amend: signup = mandatory phone verify; sign-in = multi-method (email/password, SMS OTP, Google OAuth). |
| `initial-foundation-plan.md` | Replace phone-only-primary login; keep phone-mandatory signup. |
| `.ai/rules/http-and-auth.md` | Multi-method sign-in; strict mobile signup. |
| PRD / UX | Split Register vs Sign-in journeys; method picker on sign-in. |
| Schema | Email/password; OAuth identities table/port; keep `phone_e164` + `auth_otps`. |
| `real-phone-otp-identity-foundation` | Supersede “phone OTP only primary login”; keep OTP for signup + SMS sign-in + step-up. |

## Non-goals

- Completing signup without mobile verification.
- Removing phone as the verified contact identity.
- Live SMS or live Google credentials without their gates.
- Apple/Facebook/etc. in v1 contract (extension ports later).
- Implementing auth UI/code before founder accept + ADR amend.

## Success

- New users **always** verify mobile at signup.
- Onboarding **always** sets a password (email optional).
- Returning users pick **phone/password, email/password, SMS, or Google** to sign in.
- A password-losing user recovers via **email reset link or SMS-verified reset** without support.
- SMS is used for signup verify, optional SMS sign-in, and high-trust step-up — not as the sole return path.
- Authority docs agree before implementation.

## Authority freeze at intent authoring

| Artifact | SHA-256 (pre-amendment) |
| --- | --- |
| `adr-catalog-rebuilt.md` | `5b6489017657c7b7ba4a2f4504cf92332d2607e42736a8b9b5e1aa4805b1b16f` |
| `initial-foundation-plan.md` | `658daa075363457322c21d8a6ce06293f76369d0e984c7e9a805db5198e4afd1` |
| `.ai/rules/http-and-auth.md` | `4b6b1becee706855d060808d84c3151ac2339facb07efc7af660ffa9cae627f4` |
