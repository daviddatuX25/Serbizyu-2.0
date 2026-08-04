# Design — Real phone OTP identity foundation

## Shape

```text
Inertia Auth/Phone
  -> AuthController + PhoneOtpRequest
  -> PhoneOtpAuthService
  -> auth_otps (hashed) + users/user_profiles
  -> OtpDeliveryChannel (Fake/Log now; SMS later)
  -> Auth::login + session regenerate
```

## Decisions

1. **Phone-first OTP** is the only active primary identity path for this slice.
2. **PostgreSQL** owns OTP challenge truth; Redis may hold sessions/rate limits/local peek mirrors only.
3. **No UI OTP bypass.** Local UAT uses `php artisan serbizyu:otp:peek {phone}` in disposable environments.
4. **Generic errors** avoid account-enumeration leaks where practical.
5. **Legacy `/demo/*`** remains temporarily for unmigrated FirstSlice tests; protected product routes use `EnsureAuthenticated` + Laravel `Auth`.
6. Listing commands continue to call `CurrentSession::requireUser()`; Policies/Gates follow once FirstSlice migrates fully.

## Failure / recovery

| Case | Behavior |
|---|---|
| Invalid/expired/locked OTP | `OTP_INVALID` generic message |
| Suspended/closed account | No OTP delivery; verify fails generically |
| Duplicate OTP request | Prior pending challenge consumed |
| Unauthenticated private page | Redirect to `/auth/phone`, persist `auth_return_to` |
| Provider later unavailable | Adapter failure; domain challenge still authoritative |

## Verification

- Feature: `tests/Feature/IdentityAccess/PhoneOtpAuthenticationTest.php`
- Architecture: active routes must not use `mock.auth` middleware
- Manual UAT: request OTP → `serbizyu:otp:peek` → verify → onboarding/listings
