# Design — Multi-method sign-in + strict mobile signup

Change ID: `hybrid-browser-auth-phone-step-up`

## 1. Intent and authority

Reopen identity authority to match founder intent:

1. **Signup** — strict mobile OTP verification required to complete registration.
2. **Onboarding** — **password required** (account-level); **email optional**.
3. **Sign-in** — password-first (phone+password, email+password); SMS OTP fallback; Google OAuth phased.

This amends ADR-R-030; it does not silently override BMAD.

**Amend 2026-08-10 (Option 1):** Password is required at AlmostThere to cut ordinary SMS cost. OTP remains for signup once, return fallback, and high-trust step-up.

## 2. Scope / non-goals

**In (planning):** ADR/PRD/UX/rule amendments, schema sketch, command map, linking rules, cost policy, phased enablement, Pest matrix.  
**In (implementation after accept):** register + phone verify; password-required onboarding; multi-method login; password recovery; OAuth port; account link; step-up; flags; tests.  
**Out:** signup without phone; onboarding without password; live SMS/Google without gates; Apple/Facebook v1; removing `auth_otps`.

## 3. Actors and journeys

### Signup (strict)

```text
Start register
  → MUST enter mobile + OTP verify  → phone_verified_at set
  → AlmostThere onboarding
       → MUST set password
       → optionally link email (same session)
  → workspace ready
```

### Sign-in (password-first)

```text
Sign-in screen:
  [ Phone + password ]     ← preferred (no SMS)
  [ Email + password ]     ← if email linked
  [ Sign in with SMS code ] ← secondary / fallback
  [ Continue with Google ] ← later / gated
        ↓
  Laravel session (same user)
```

No method may sign into an account that never completed mobile signup (no phone_verified_at).

### Password recovery

Password is required at onboarding, so forgetting it must not mean support-only recovery:
```text
Request reset (rate-limited)
  → email linked?   → single-use reset link (Laravel Password broker) → set new password
  → no email?       → SMS OTP reset challenge (`auth_otps.purpose: reset_*`) → set new password
```
Tokens single-use + short expiry; generic copy on request (no account-existence leak); request/confirm rate-limited.

### High-trust step-up

Even if signed in via password/email/Google, Provider enable / Agent consent / money may require `StepUpPhoneOtp`.

## 4. Commands

| Command | Purpose |
| --- | --- |
| `StartSignup` / `CompleteSignupPhoneOtp` | Mandatory phone verify to create/activate account |
| `SetAccountPassword` | Required at onboarding; account-level password |
| `LinkEmail` | Optional email attach; does not invent password |
| `LoginWithPhonePassword` | Return sign-in via phone + password; no SMS |
| `LoginWithEmailPassword` | Return sign-in via email + password; no SMS |
| `LoginWithSmsOtp` | Return sign-in via phone OTP (fallback) — realized by hardened `PhoneOtpAuthService` (`purpose: 'login'`; login-only, no auto-provision, phone-verified required, non-enumerating) |
| `LoginWithGoogleOAuth` | Return sign-in / link via Google (later) |
| `LinkGoogle` / `UnlinkGoogle` | Account settings; cannot unlink last recovery path |
| `StepUpPhoneOtp` | High-trust re-challenge |
| `RequestPasswordReset` | Email reset link (if email linked) or SMS OTP reset challenge; rate-limited; generic copy |
| `ResetPasswordWithToken` | Confirm single-use reset token; set new password; consume token |
| `ResetPasswordWithSmsOtp` | SMS-verified reset for phone-only accounts (fallback; no email needed) |

## 5. State model

- `users.phone_e164` + `phone_verified_at` — **required for completed signup**
- `users.password` — **required to complete onboarding / ready**
- `users.email` / `email_verified_at` — optional until user links email
- `oauth_identities` (proposed): `provider`, `provider_subject`, `user_id`, unique `(provider, provider_subject)`
- `auth_otps.purpose`: `signup_verify`, `login`, `reset_*`, `step_up_*`, …
- `password_reset_tokens` (or Laravel Password broker table): single-use, short expiry, rate-limited

**Invariant:** at most one active user per verified phone. Google subject and email map to that user via link tables, never a second shadow account for the same phone.

## 6. Persistence delta (additive)

- users: email, email_verified_at, password (nullable at DB; password required by domain at onboarding)
- oauth_identities (or equivalent)
- widen auth_otps purpose checks
- no drop of phone columns

## 7–11. Locks, events, ops, adapters, security

- Sessions: Laravel guard after any successful sign-in method; **always** `session()->regenerate()` on success (fixation).
- Email: mailer / Mailpit local.
- SMS: `OtpDeliveryChannel` (Fake/Log until live gate) for signup verify, SMS fallback sign-in, step-up.
- Google: `OAuthLoginPort` with disabled/mock adapter until Google client gate.
- Never store Google refresh tokens in logs; map subject → user_id only.
- Password hashing Laravel default (`hashed` cast); `Password::defaults()` on set; generic auth errors; non-enumerating phones/emails.
- Phone password login uses `Auth::attempt(['phone_e164' => …, 'password' => …])` (Laravel username-field pattern), not ad-hoc compare alone.

**SMS cost policy:** prefer password return paths; cooldown + throttle + budget on OTP send; signup OTP unavoidable once per new user; return SMS login secondary; email+OTP / Google later.

### Auth HTTP rate-limit matrix (Boost + Laravel starter-kit aligned)

Named `RateLimiter::for(...)` entries — **not** anonymous `throttle:N,1` only. Key by identifier + IP where an identifier exists (Fortify-style), else IP.

| Named limiter | Routes | Limit | Key |
| --- | --- | --- | --- |
| `auth-login` | `POST /auth/phone/login`, `POST /auth/email/login` | 5 / min | normalized phone or email + IP |
| `auth-otp-request` | `POST /auth/register/request`, `POST /auth/phone/request` | 6 / min | phone + IP (also SMS cost) |
| `auth-otp-verify` | `POST /auth/register/verify`, `POST /auth/phone/verify` | 10 / min | phone + IP (domain also caps attempts per OTP) |
| `auth-onboarding` | `POST /onboarding` | 10 / min | auth user id + IP |
| `auth-email-link` | `POST /auth/email/link` | 6 / min | auth user id + IP |
| `auth-password-reset` | `POST /auth/password/email`, `POST /auth/password/phone` (request) | 3 / min | email or phone + IP (also SMS cost on phone path) |
| `auth-password-reset-confirm` | `POST /auth/password/reset` | 3 / min | IP (token itself is single-use) |

Logout is not aggressively limited. Listing limiters remain separate.

### Auth security checklist (must stay true)

1. Form Requests for all auth mutations.
2. Password required at onboarding; email optional.
3. Generic failure messages (no account existence leak on login).
4. OTP hashed at rest; single-use; attempt + expiry limits in `auth_otps`.
5. Throttles via named limiters above.
6. CSRF via Inertia XSRF (no Blade `@csrf` required).
7. Secrets only via `config()` / env — never hardcode provider keys.
8. Live SMS / Google remain gated.
9. `Password::defaults()` defined **once** in a service provider (argon2id/bcrypt policy), not inline per request.
10. Sensitive identity mutations (change password, unlink last recovery method) require fresh `password.confirm` within `auth.password_confirmation_at`.
11. Password recovery: single-use tokens, short expiry, request/confirm rate-limited, generic copy (no account-existence leak).

## 12. UX

- **Register:** mobile-first OTP once.
- **AlmostThere:** password required inside step 3/4; email optional dashed block.
- **Sign in:** lead with phone+password and email+password; SMS as “instead” link — not “Send verification code” primary.

## 13. Verification matrix

| ID | Proof |
| --- | --- |
| H2-S01 | Signup without phone OTP cannot reach ready session |
| H2-S02 | Signup phone OTP sets phone_verified_at exactly once per challenge |
| H2-O01 | Onboarding without password cannot become ready |
| H2-I00 | Phone+password sign-in creates session; no OTP delivery |
| H2-I01 | Email/password sign-in creates session; no OTP delivery |
| H2-I02 | SMS OTP sign-in works for phone-verified user (fallback) |
| H2-I03 | Google OAuth sign-in (fake adapter) links/logs into phone-verified user |
| H2-I04 | Google sign-in cannot create a completed account without prior/phone signup path |
| H2-T01 | Provider enable denied without verified phone; step-up when required |
| H2-C01 | Live SMS/Google remain disabled by default |
| H2-R01 | Password login routes use named `auth-login` limiter (5/min by identifier+IP) |
| H2-R02 | OTP request/verify and onboarding/email-link use their named limiters |
| H2-R03 | Password-reset request/confirm routes use named limiters; tokens single-use + short expiry |
| H2-R04 | Reset sets new password; token unusable after use; generic copy (no enumeration) |

## 14. Phased enablement (after ADR accept)

1. **P0** Schema + strict phone signup + password-required onboarding + phone/email password sign-in (Fake OTP)  
2. **P0b** Auth security hardening — named rate limiters + `Auth::attempt` phone username (this amend)  
3. **P0c** Password recovery — email reset link (Mailpit) + SMS-verified reset fallback; single-use tokens; `auth-password-reset*` limiters  
4. **P1** SMS as optional return sign-in (same OTP port) — UX secondary — **done (2026-08-10)**  
5. **P2** Google OAuth port + fake adapter tests  
6. **P3** Live Google + live SMS gates (separate packets)

## 15. Sequencing vs trains

```text
Founder accept → ADR/rules/PRD/UX amend → P0 implementation packet
  → then T2+ consume multi-method sessions
```

## 16. P0c implementation detail (password recovery)

Grounded in the current codebase (2026-08-10): `config/auth.php` already defines the stock `users` password broker (`expire: 60`, `throttle: 60`) and `password_timeout: 10800`; `password_reset_tokens` migration already exists (email-keyed, stock Laravel shape); `App\Models\User` extends `Illuminate\Foundation\Auth\User` (has `CanResetPassword` + `MustVerifyEmail` traits); `PhoneOtpAuthService` already persists hashed single-use OTPs with attempt/expiry limits but is hard-wired to `purpose: 'login'`.

### 16.1 Decisions

- **Email path** reuses the stock Laravel Password broker (`Password::broker()`): `Password::sendResetLink()` for request, `Password::reset()` for confirm. Single-use + 60-min expiry + 60s throttle come from config, no new tables.
- **Phone/SMS path** reuses `auth_otps` with a new `purpose: 'reset'` (widen the purpose check in `PhoneOtpAuthService` — do not hard-wire `login`). No auto-provision: reset must **never create** a user (unlike `requestCode`'s auto-create for signup — reset lookup is read-only + generic).
- **No enumeration:** unknown email/phone, unverified phone, and suspended accounts all return the same generic confirmation. No token/OTP is minted for non-existing or non-verified identifiers.
- **`Password::defaults()`** defined once in `AppServiceProvider::boot()` (via `Illuminate\Validation\Rules\Password`), replacing the inline call in `app/Http/Requests/OnboardingRequest.php` (currently `'password' => ['required', 'confirmed', Password::defaults()]`). All password rules (onboarding, reset) then reference the central policy.
- **After reset:** no auto-login. Redirect to sign-in with a generic success notice; session not established.

### 16.2 Commands (application services, IdentityAccess)

| Command | Purpose |
| --- | --- |
| `RequestPasswordReset` | Email branch → `Password::sendResetLink(['email' => …])`; returns generic confirmation regardless of outcome |
| `RequestResetSmsOtp` | Phone branch → purpose-aware reset OTP via `auth_otps.purpose = 'reset'`; **never auto-provisions**; generic confirmation for unknown/unverified/suspended |
| `ResetPasswordWithToken` | `Password::reset()` with credentials + closure calling `SetAccountPassword`; throws `IdentityAccessError('RESET_INVALID')` on bad/expired/replayed token |
| `ResetPasswordWithSmsOtp` | Verify `auth_otps.purpose = 'reset'` (reuse OTP attempt/expiry/single-use semantics) then `SetAccountPassword`; generic failure |

### 16.3 HTTP routes (web.php, guests only, named limiters)

| Route | Controller action | Limiter |
| --- | --- | --- |
| `GET /auth/password/forgot` | `showForgot` (Inertia `Auth/ForgotPassword`) | — |
| `POST /auth/password/email` | `sendResetLink` | `auth-password-reset` (3/min, email+IP) |
| `POST /auth/password/phone` | `requestSmsReset` | `auth-password-reset` (3/min, phone+IP — also SMS cost) |
| `GET /auth/password/reset?token=&email=` | `showReset` (Inertia `Auth/ResetPassword`) | — |
| `POST /auth/password/reset` | `resetWithToken` | `auth-password-reset-confirm` (3/min, IP) |
| `POST /auth/password/phone/verify` | `resetWithSmsOtp` | `auth-password-reset-confirm` (3/min, IP) |

All form mutations use Form Requests: `ForgotPasswordRequest` (email XOR phone), `ResetPasswordRequest` (email+token+password), `ResetPasswordSmsRequest` (phone+code+password). Response envelope: existing `success`/`failure` shape with `correlation_id`.

### 16.4 Mail

- `App\Mail\Auth\PasswordResetLink` (ShouldQueue, `afterCommit`) + markdown template `emails.auth.password-reset-link` — mirrors `EmailCredentialsSet` convention.
- Link target: `route('auth.password.reset', ['token' => …, 'email' => …])`.
- **Broker hook:** `User::sendPasswordResetNotification($token)` override routes the stock broker through the product mailable via `Mail::to($user)->send(...)` (no framework `ResetPassword` notification needed).

### 16.5 Wiring

- `AppServiceProvider::boot()`: `Password::defaults()` once; `RateLimiter::for('auth-password-reset')` and `RateLimiter::for('auth-password-reset-confirm')`.
- `RequestResetSmsOtp` is a dedicated command (not `PhoneOtpAuthService`) so reset never reuses the signup auto-provision path.

### 16.6 Edge cases (beyond H2-R03/R04)

- Reset request for suspended/closed account → generic confirmation, no token, no delivery.
- Email path for a phone-only account (no email linked) → generic confirmation, no mail (broker cannot find by email; must not leak).
- Token replay after use → `RESET_INVALID`, password unchanged.
- Expired token (>60 min) → `RESET_INVALID`.
- SMS reset for non-verified phone → generic confirmation, no OTP minted.
- Reset confirm never logs the user in; old session data is untouched.

## 17. P1 implementation detail (SMS optional return sign-in)

Implemented 2026-08-10. `PhoneOtpAuthService` is the realization of the
`LoginWithSmsOtp` command (same OTP port, `purpose: 'login'`).

### 17.1 Behavior changes (`PhoneOtpAuthService`)

- `requestCode`: **no auto-provision on login.** Unknown, pending/unverified, and
  suspended/closed/archived numbers all return the same generic `code_pending`
  shape and **never mint or deliver an OTP** (non-enumerating; signup stays on
  `/auth/register/*` via `StartSignup`).
- `verifyCode`: requires `phone_verified_at` (else `ACCOUNT_UNAVAILABLE` 403) and
  **never mutates** `phone_verified_at`/`status` — a return login cannot complete
  or alter signup state. Consumes the OTP, updates `last_login_at`, regenerates
  the session. Attempt/expiry/single-use semantics unchanged.

### 17.2 Test landscape

- `PhoneOtpAuthenticationTest` reworked from legacy phone-first suite to SMS
  return-login suite: non-enumerating unknown phone, pending user gets no code,
  verified user round-trip (verified_at untouched), attempt lockout, expiry,
  duplicate-request invalidation, suspended block, session regeneration.
- `HybridAuthP0Test` gains **H2-I02**: SMS OTP fallback sign-in for a
  phone-verified user.
- `AuthenticatesWithPhoneOtp::authenticateWithPhone` now seeds a factory
  user (active + verified) instead of driving `/auth/phone/*` HTTP — the HTTP
  journey is covered by the suites above; the helper is deterministic setup and
  idempotent when a phone is authenticated twice within one test.

## 18. Unified sign-in hub (P1 follow-up, 2026-08-11)

One sign-in page (`/auth/sign-in`, `Auth/SignIn`) hosts every return method, so
a tester never bounces between pages:

- **Segmented method picker** — `Phone + password`, `Email + password`, `SMS code`
  (each gated by the `methods.*` props; Google still shown only when the gate is on).
- **Inline SMS challenge** — `POST /auth/phone/request` stores `auth_phone_pending`
  on the session and `back()`s to the sign-in page; `showSignIn` re-renders the
  same component in `challenge_pending` state (code input + "Use a different
  number" ghost). No navigation to `/auth/phone` is required. `/auth/phone` is a
  **redirect to the hub** (the legacy `Auth/Phone` page was deleted; challenge
  state is carried in the session), so there is exactly one sign-in screen.
- **Forgot password?** link on both password forms → `auth.password.forgot`.
- Proof: `H2-U01` (challenge surfaces on the sign-in page after a code request).
