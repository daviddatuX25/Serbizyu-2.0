---
globs: app/Http/**, routes/**
---

# HTTP & Identity Auth Rules

- **Strict mobile signup:** A completed registration MUST verify an E.164 Philippine mobile (`+63...`) via OTP and set `phone_verified_at`. Email-only or Google-only completed signup is forbidden.
- **Password-first return login:** After phone verify, AlmostThere onboarding MUST set `users.password`. Prefer `phone + password` and `email + password` for ordinary return sign-in to avoid SMS cost. SMS OTP is fallback / signup / high-trust step-up — not the primary return path.
- **Email optional:** Email may be linked during or after onboarding; it is never required to finish signup or readiness. Password is account-level and independent of email.
- **Multi-method sign-in:** Phone-verified accounts may sign in with phone/password, email/password (if linked), SMS OTP (fallback), or Google OAuth (adapters phased; live Google/SMS remain gated). All return methods live on the single `/auth/sign-in` hub (`Auth/SignIn`): segmented method picker with the SMS challenge inline (`challenge_pending` session state) — no cross-page bounce. Method picker UX must lead with password paths.
- **SMS login is return-only (P1):** `/auth/phone/*` (`PhoneOtpAuthService`, `purpose: 'login'`) MUST NOT auto-provision users, MUST NOT complete or mutate signup state (`phone_verified_at`/`status`), and MUST be non-enumerating — unknown/unverified/suspended numbers answer a generic `code_pending` with no OTP minted or delivered. Signup OTP lives only in `StartSignup`/`CompleteSignupPhoneOtp` (`/auth/register/*`).
- **Named auth rate limiters:** Use `RateLimiter::for('auth-login'|'auth-otp-request'|'auth-otp-verify'|'auth-onboarding'|'auth-email-link'|'auth-password-reset'|'auth-password-reset-confirm')` per OpenSpec matrix — key by identifier+IP. Do not leave auth mutations on bare `throttle:N,1` only.
- **Login attempt shape:** Prefer `Auth::attempt` with `email` or `phone_e164` + `password`; always regenerate session on success; generic failure copy.
- **Password recovery:** Email reset link via Laravel Password broker (if email linked) or SMS-OTP-verified reset (fallback); single-use tokens + short expiry; request/confirm rate-limited (`auth-password-reset*`, 3/min); generic copy (no account-existence leak).
- **Password policy:** Define `Password::defaults()` once in a service provider (not inline per request); sensitive identity mutations (change password, unlink last recovery method) require fresh `password.confirm` within `auth.password_confirmation_at`.
- **Verified contact identity:** `phone_e164` remains the canonical contact/trust identity for notices, Agent consent, and high-trust step-up.
- **OTP lifecycle:** OTP requests/verifications persist hashed challenges in `auth_otps` with expiry, attempt limits, single-use consumption, and explicit purposes (`signup_verify`, `login`, `step_up_*`, …).
- **Session cookie auth:** Successful sign-in (any method) uses Laravel's session guard (`Auth::login` / `Auth::attempt`, session regeneration). Logout invalidates the session.
- **Step-up:** Provider enable, Agent consent, and money/payout MAY require a fresh phone OTP even when the session was opened via email or password.
- **Ports:** SMS via `OtpDeliveryChannel`; email via mail/`NotificationChannel`; Google via `OAuthLoginPort`. Disposable envs use Fake/Log OTP and mock/disabled Google. Mailpit is not an SMS simulator.
- **Retired:** `/demo/*` email/password fixture auth is not the product authorization boundary. Do not couple password-set to email-only (`SetEmailPassword`); use `SetAccountPassword` + optional `LinkEmail`.
- **Inertia responses:** Web endpoints return Inertia pages (`Inertia::render()`) carrying safe, non-sensitive session and slice props.
- **Authority:** ADR-R-030 (amended 2026-08-10); `openspec/changes/hybrid-browser-auth-phone-step-up/` (password-first + auth rate-limit amend 2026-08-10).
