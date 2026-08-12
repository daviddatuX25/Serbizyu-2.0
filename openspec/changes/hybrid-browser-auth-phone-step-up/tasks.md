# Tasks — Multi-method sign-in + strict mobile signup

Rule: **no application auth implementation** until §0 planning PASS and founder accept are checked.

## 0. Planning / authority reopen

- [x] 0.1 Intent proposal authored
- [x] 0.2 Design + capability spec authored
- [x] 0.2b Intent clarified: **signup = strict mobile**; **sign-in = email + SMS + Google OAuth**
- [x] 0.3 Founder accept recorded on this change (sign below)
- [x] 0.4 Amend ADR-R-030 (signup mobile mandatory; multi-method sign-in)
- [x] 0.5 Amend `docs/architecture/initial-foundation-plan.md`
- [x] 0.6 Amend `.ai/rules/http-and-auth.md`
- [x] 0.7 Patch PRD/UX: Register vs Sign-in journeys + method picker
- [x] 0.8 Mark phone-only-primary login claims superseded; keep signup mobile + OTP lifecycle
- [x] 0.9 Planning readiness PASS (2026-08-10) — authority amended; implementation still requires §1 packet

**Founder accept:**

- [x] Accepted clarified intent (strict mobile signup; email/SMS/Google sign-in) on 2026-08-10 by founder (chat ACCEPT)

## 1. Implementation phases (only after 0.9)

- [x] 1.P0 Schema + strict phone signup + email/password sign-in (Fake OTP)
- [x] 1.P0b Auth security hardening (OpenSpec rate-limit matrix + Auth::attempt phone + named limiters)
- [x] 1.P0c Password recovery — email reset link (Mailpit) + SMS-OTP reset fallback; single-use tokens; `auth-password-reset` + `auth-password-reset-confirm` limiters
- [x] 1.P1 SMS optional return sign-in — login-only OTP port (no auto-provision, verified-only, non-enumerating); H2-I02 + reworked PhoneOtpAuthenticationTest; helper seeds factory user
- [ ] 1.P2 Google OAuth port + fake/mock adapter + account link invariants
- [ ] 1.P3 Live Google gate + live SMS cost gate (separate packets)
- [x] 1.T Pest H2-S*/H2-O01/H2-I00/H2-I*/H2-C*; Pint; auth-path architecture guard (password-first)
- [x] 1.T2 Pest H2-R01/H2-R02 named limiter wiring
- [x] 1.T3 Pest H2-R03/H2-R04 reset limiter + single-use token proofs
- [x] 1.T4 Unified sign-in hub (H2-U01) — method picker + inline SMS challenge on `Auth/SignIn`; build + Pint

## 1.P0c — Password recovery (design §16)

### P0c.0 Packet (planning, this amend)

- [x] P0c.0.1 ADR-R-030 amend (decisions 11–13: password required, recovery first-class, centralized policy)
- [x] P0c.0.2 Foundation plan §2.1 recovery bullet; http-and-auth rules; PRD-001 / UX-025 recovery lines
- [x] P0c.0.3 Design §16 + spec scenarios (email link, SMS reset, throttle, non-enumeration, unverified-block) authored
- [x] P0c.0.4 Founder accept recorded for P0c before code (accepted 2026-08-10 chat)

### P0c.1 Application (IdentityAccess)

- [x] P0c.1.1 `RequestPasswordReset` (email branch via `Password::sendResetLink`; generic confirmation)
- [x] P0c.1.2 `ResetPasswordWithToken` (`Password::reset` + `SetAccountPassword` closure; `RESET_INVALID` on bad/expired/replayed)
- [x] P0c.1.3 `ResetPasswordWithSmsOtp` (verify `auth_otps.purpose='reset'`, then `SetAccountPassword`)
- [x] P0c.1.4 `RequestResetSmsOtp` (purpose-aware reset request — **no auto-provision**; generic on unknown/unverified/suspended)

### P0c.2 HTTP + wiring

- [x] P0c.2.1 Form Requests: `ForgotPasswordRequest`, `ResetPasswordRequest`, `ResetPasswordSmsRequest`
- [x] P0c.2.2 `AuthController`: `showForgot`, `sendResetLink`, `requestSmsReset`, `showReset`, `resetWithToken`, `resetWithSmsOtp` (success/failure envelope)
- [x] P0c.2.3 Routes (guest, named limiters per §16.3); Inertia pages `Auth/ForgotPassword`, `Auth/ResetPassword`
- [x] P0c.2.4 `AppServiceProvider`: `Password::defaults()` once (min 8, mixed case, numbers, symbols); `auth-password-reset` (3/min) + `auth-password-reset-confirm` (3/min) limiters
- [x] P0c.2.5 `PasswordResetLink` mailable + `emails.auth.password-reset-link` markdown (ShouldQueue, afterCommit); `User::sendPasswordResetNotification` override routes the broker through the product mailable

### P0c.3 Verification

- [x] P0c.3.1 Pest H2-R03 (limiters wired on reset routes), H2-R04 (single-use token, expiry, generic copy)
- [x] P0c.3.2 Pest edge proofs: unknown identifier non-enumeration; unverified-block; phone-only email path; replay; no auto-login after reset; SMS reset flow
- [x] P0c.3.3 HybridAuth regression green (35 IdentityAccess tests); full suite 112 green; Pint; schema contract updated with `password_reset_tokens` + `oauth_identities`
- [x] P0c.3.4 P0c GO recorded (founder accept in P0c.0.4, 2026-08-10)

## Explicit blockers

- [ ] Live SMS credentials
- [ ] Live Google OAuth credentials
- [ ] Signup without mobile verification
- [ ] Production migrate
- [ ] Code merge before 0.3 + 0.9
