# Complete Phone Password Recovery Journey & Retire Legacy Interfaces

**Status:** PROPOSED  
**Change ID:** `complete-auth-recovery-and-retire-legacy-interfaces`  
**Plane:** Frontend UX/UI (`F`), Identity & Access (`S`), Architectural Hygiene (`A`)  
**Date:** 2026-09-22  
**Canonical Authorities:**  
- `docs/architecture/MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md`  
- `docs/design-kit/NON-ADMIN-SPECIFICATION.md`  
- `openspec/changes/hybrid-browser-auth-phone-step-up/proposal.md` (`ADR-R-030` amended)  
- `docs/research/authentication-ux-guidance.md`
- Visual Prototypes: `docs/design-kit/auth-recovery-mobile.html` (Screen 28), `docs/design-kit/onboarding-mobile.html` (Screen 29)

---

## 1. Executive Problem Statement

### 1.1 The Password Recovery UI Disconnect
During local manual testing and user acceptance tests (UAT), requesting an SMS password reset for a Philippine mobile number (`09XXXXXXXXX`) via `/auth/password/forgot` results in a confusing and broken user experience:
1. **The Dead-End Screen**: When the user submits their phone number, the UI displays a static notice (*"Check your messages: If an account matches those details, we’ll send reset instructions shortly"*), identical to the email flow. It **never provides an input field for the 6-digit SMS OTP**, **never provides new password input fields**, and **provides no "Resend OTP" button or countdown cooldown**.
2. **Disconnected Backend**: The backend implementation (`POST /auth/password/phone/verify` handled by `ResetPasswordWithSmsOtp` in `app/Modules/IdentityAccess/Application/ResetPasswordWithSmsOtp.php`) is fully built and covered by automated PHP tests (`PasswordRecoveryP0cTest.php`), but has **no frontend consumer**.
3. **Anti-Enumeration Confusion**: By deliberate security design (`ADR-R-030 decision 12`), `RequestResetSmsOtp` returns a generic confirmation (`code_pending`) for unverified accounts (`phone_verified_at == null`), suspended accounts, or non-existent numbers without minting an OTP. Without a visible Step 2 in the UI, operators executing `serbizyu:otp:peek` report that the system appears non-functional or disconnected.

### 1.2 Legacy Interface Debt & Obsolete Monoliths
While the new canonical mobile-first architecture (`NON-ADMIN-SPECIFICATION.md` and `MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md`) is now active, the repository still carries obsolete, pre-design-kit interfaces that clutter the frontend and confuse navigation:
1. **`ProductExperience.tsx` Monolith**: A 630-line legacy page-mode controller containing outdated tab switchers, inline mock state, and duplicate UI. `Home.tsx` still contains conditional branching to render this monolith (`if (props.experience === 'foundation_v1')`).
2. **`AlmostThereOnboarding.tsx`**: A 500-line legacy wizard utilizing custom un-tokenized styling (`almost-there-onboarding.css`), slow typewriter animations of Tagudin regional trivia, and pre-design-kit card components. It does not align with the modern `AuthShell` and mobile design kit.
3. **Mockup Residue**: Legacy mock/demo tabs in `MockupPreview.tsx` (e.g. Tab 4 "Storefront Onboarding") and flat un-versioned forms in `MyListings.tsx`.

---

## 2. Objectives & Scope

### 2.1 Complete Phone Password Recovery Journey
Implement the complete, interactive recovery state machine in `resources/js/Pages/Auth/ForgotPassword.tsx`:
- **Step 1 (Request)**: Phone number input, validation, and submission to `POST /auth/password/phone`.
- **Step 2 (Challenge & Reset)**:
  - 6-digit OTP entry using `OtpPinInput` with auto-focus and paste support.
  - New password and password confirmation inputs using `PasswordInput`.
  - **Resend Code Action**: Prominent "Resend code" button with an active 60-second countdown timer, triggering a re-request to `POST /auth/password/phone` within existing rate limits (`auth-password-reset`).
  - Submission to `POST /auth/password/phone/verify` (`ResetPasswordSmsRequest`).
  - Dev mode inspection integration (`DevOtpReceiver`) for local, test, and capstone environments matching `SignIn.tsx` and `Register.tsx`.
- **Step 3 (Success)**: Clear confirmation indicating password update and direct transition link/redirect to `/auth/sign-in`.
- **Controller Props**: Update `AuthController::showForgot` to pass `session` context (`auth_reset_phone_pending`), `devMode`, and `temporaryOtpPreview` for seamless browser preview during local development.

### 2.2 Modernize Onboarding Interface
- Replace the legacy `AlmostThereOnboarding.tsx` component with a clean, touch-first `Onboarding.tsx` view rendered via `AuthShell` / design-kit standards.
- Maintain strict contract compatibility with `POST /onboarding` (`OnboardingRequest`: `display_name`, `area_code`, `language_code`, `provider_intent`, `password`, `password_confirmation`).
- Delete `almost-there-onboarding.css` and obsolete typewriter animation loops.

### 2.3 Retire Legacy Interfaces
- Formally deprecate and remove `resources/js/Pages/ProductExperience.tsx`.
- Remove legacy `foundation_v1` experience switching in `resources/js/Pages/Home.tsx`.
- Retire Tab 4 from `MockupPreview.tsx` in favor of canonical onboarding and creation routes.

---

## 3. Non-Goals

1. **Weakening Anti-Enumeration Security**: We will NOT expose whether an account exists or is verified during the reset request. The generic response behavior (`code_pending`) is preserved.
2. **Changing Core Cryptography or OTP TTL**: The 6-digit random token, SHA-256 hash storage in `auth_otps`, and 600-second expiry remain untouched.
3. **Modifying Email Recovery**: The email link reset flow (`/auth/password/email` $\to$ Mailpit $\to$ `/auth/password/reset` token form) works correctly and will remain unchanged.
4. **Altering Production SMS Gates**: No third-party SMS providers will be introduced; the existing `LogOtpDelivery` and `FakeOtpDelivery` channels in local/testing environments remain authoritative.

---

## 4. Success Criteria

1. A verified user (`phone_verified_at != null`) can navigate to `/auth/password/forgot`, enter their mobile number, receive an OTP, see the resend countdown timer, input the OTP and new password, submit to `/auth/password/phone/verify`, and immediately log in with the new password.
2. Local developers and QA testers can inspect the generated OTP code via:
   - In-page `DevOtpReceiver` badge (when `devMode` is active).
   - Artisan CLI command: `php artisan serbizyu:otp:peek {phone} --purpose=reset`.
3. `ForgotPassword.tsx` provides an active 60-second cooldown timer before allowing an OTP resend.
4. `ProductExperience.tsx` and `almost-there-onboarding.css` are completely eliminated from the codebase without breaking existing feature tests.
5. All relevant Pest feature tests and TypeScript typechecks pass cleanly.
