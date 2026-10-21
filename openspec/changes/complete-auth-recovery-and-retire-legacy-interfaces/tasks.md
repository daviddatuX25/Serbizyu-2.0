# Tasks: Complete Password Recovery Journey & Interface Retirement

**Change ID:** `complete-auth-recovery-and-retire-legacy-interfaces`  
**Status:** PROPOSED  

---

## Phase 1: Controller & Session State Wiring
- [x] 1.1 Update `AuthController::requestSmsReset` to record `auth_reset_phone_pending` and `auth_reset_phone_requested_at` in session.
- [x] 1.2 Update `AuthController::showForgot` to read session values, calculate `cooldown_remaining_seconds`, and pass `session`, `devMode`, and `temporaryOtpPreview` (purpose: `reset`) to `Auth/ForgotPassword` page props.
- [x] 1.3 Ensure `ResetPasswordWithSmsOtp` returns generic `RESET_INVALID` error code if account status changes to suspended/closed before confirmation.

## Phase 2: Complete `ForgotPassword.tsx` Recovery Journey
- [x] 2.1 Refactor `ForgotPassword.tsx` state into distinct recovery phases:
  - Email mode (existing signed link dispatch to Mailpit/SMTP).
  - Mobile mode Step 1 (phone entry & submission to `POST /auth/password/phone`).
  - Mobile mode Step 2 (OTP code input + new password + password confirmation).
  - Success confirmation view with direct navigation to `/auth/sign-in`.
- [x] 2.2 Integrate `OtpPinInput` for 6-digit OTP code entry.
- [x] 2.3 Wire "Resend code" button with an active 60-second countdown timer, hydrated from `session.cooldown_remaining_seconds` so reloads do not wipe cooldown.
- [x] 2.4 Integrate `DevOtpReceiver` for local development, binding its resend action to the 60-second cooldown timer.
- [x] 2.5 Wire form submission to `POST /auth/password/phone/verify` (`ResetPasswordSmsRequest`) and render validation and failure notices from `page.props.errors`.

## Phase 3: Modernize Onboarding Interface
- [x] 3.1 Author touch-first `ModernOnboarding` component wrapped in `AuthShell` and styled with Tailwind tokens (`#0F2F58`, `#FFC72C`).
- [x] 3.2 Ensure form inputs satisfy `OnboardingRequest` and `OnboardingService`:
  - `provider_intent: true`
  - `display_name` (string, max 120)
  - `area_code` (options restricted to `'Tagudin'` and `'Tagudin Centro'`)
  - `language_code` (`'fil'` or `'en'`)
  - `password` and `password_confirmation` (required, confirmed)
- [x] 3.3 Replace the ad-hoc inline form in active authenticated view `resources/js/Pages/MyListings.tsx` with `ModernOnboarding`.
- [x] 3.4 Delete legacy `resources/js/components/onboarding/AlmostThereOnboarding.tsx` and `almost-there-onboarding.css`.

## Phase 4: Interface Retirement & Cleanup
- [x] 4.1 Remove `ProductExperience.tsx` imports and `foundation_v1` experience branching from `Home.tsx`.
- [x] 4.2 Delete obsolete monolith `resources/js/Pages/ProductExperience.tsx`.
- [x] 4.3 Remove deprecated Tab 4 ("Storefront Onboarding") from `MockupPreview.tsx`.
- [x] 4.4 Verify no orphaned imports or broken routing contracts across `resources/js`.

## Phase 5: Verification & Acceptance
- [x] 5.1 Run all feature tests in `tests/Feature/IdentityAccess/PasswordRecoveryP0cTest.php`.
- [x] 5.2 Verify local inspection CLI seam:
  - `php artisan serbizyu:otp:peek {phone} --purpose=reset` outputs code with exit 0 for verified accounts.
  - Exits with code 1 when no fake delivery exists.
- [x] 5.3 Run TypeScript type checking (`npx tsc --noEmit`).
- [x] 5.4 Run Pint code style formatter.
