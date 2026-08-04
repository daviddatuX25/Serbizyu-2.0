## 1. Contract
- [x] Lock phone-first OTP + hashed `auth_otps` lifecycle.
- [x] Lock swappable `OtpDeliveryChannel` / `NotificationChannel` ports.
- [x] Lock Laravel session auth for product pages.
- [x] Document local OTP peek seam (`serbizyu:otp:peek`) without UI bypass.
- [ ] Founder acknowledge ADR-R-030 and retire fixture-auth OpenSpec claims for the active path.

## 2. Backend
- [x] `auth_otps` migration and indexes.
- [x] Request/verify/logout application path.
- [x] Fake + Log adapters; Mailpit notification channel scaffold.
- [x] OTP feature tests (register, login, attempts, expiry, reuse, suspend, session).
- [x] Architecture guard against mock auth middleware on product routes.
- [x] Migrate `FirstSliceFeatureTest` off `/demo/*`.
- [x] Remove `/demo/*` from active routes after migration.

## 3. Frontend / UAT
- [x] `/auth/phone` page without fictional credentials.
- [x] ProductExperience sign-in entry to phone OTP.
- [x] Guest `/my-listings` redirects to auth.
- [ ] Browser/Playwright journey: phone → OTP peek → verify → onboarding → draft → submit → browse privacy.
- [x] Shared mock-v2 `ListingCard` across Browse / My Listings / Preview.

## 4. Evidence
- [x] Focused Pest OTP suite green.
- [ ] Compose clean migration + readiness recorded for this change.
- [ ] No live SMS / pilot readiness claim in evidence.
