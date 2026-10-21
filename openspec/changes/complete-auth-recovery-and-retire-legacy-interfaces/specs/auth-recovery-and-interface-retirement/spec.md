# Capability Spec: Auth Recovery & Interface Retirement

**Capability:** `auth-recovery-and-interface-retirement`  
**Parent Change:** `complete-auth-recovery-and-retire-legacy-interfaces`  
**Status:** SPECIFICATION  

---

## 1. Requirement: Phone-Based Password Recovery State Machine

### Scenario: Requesting OTP for a verified phone number
- **GIVEN** an active user with verified phone `09171234567` (`phone_verified_at != null`)
- **WHEN** the user visits `/auth/password/forgot` and selects the "Mobile" recovery tab
- **AND** submits their phone number `09171234567`
- **THEN** the application issues `POST /auth/password/phone`
- **AND** the backend records an OTP challenge in `auth_otps` with `purpose = 'reset'`
- **AND** the session stores `auth_reset_phone_pending` and `auth_reset_phone_requested_at`
- **AND** the UI transitions into Step 2: "Verify code & set new password"
- **AND** a 60-second cooldown timer begins for the "Resend code" button and `DevOtpReceiver` action

### Scenario: Cooldown timer persists across page reloads
- **GIVEN** a user requested an SMS reset code 20 seconds ago
- **WHEN** the user refreshes `/auth/password/forgot`
- **THEN** the server computes remaining cooldown time ($60 - 20 = 40$ seconds)
- **AND** passes `cooldown_remaining_seconds: 40` in `session` props
- **AND** the UI initializes the cooldown timer at 40 seconds
- **AND** "Resend code" remains strictly disabled until the timer reaches 0 seconds

### Scenario: Submitting correct OTP and new password
- **GIVEN** the user is on Step 2 of mobile recovery for `09171234567`
- **AND** the backend generated a 6-digit OTP code `354679`
- **WHEN** the user inputs `354679` into the `OtpPinInput`
- **AND** inputs `NewSecurePassword1!` into both `password` and `password_confirmation`
- **AND** submits the form
- **THEN** the client issues `POST /auth/password/phone/verify`
- **AND** the backend verifies the code, updates the hashed password in `users`, and consumes the OTP
- **AND** the UI displays a success confirmation with a link/action to sign in
- **AND** the user can immediately log in via `/auth/phone/login` using `09171234567` and `NewSecurePassword1!`

### Scenario: Handling invalid or expired OTP code
- **GIVEN** the user is on Step 2 of mobile recovery
- **WHEN** the user submits an incorrect or expired code
- **THEN** the backend redirects back with error notice `form: ["Invalid or expired reset code."]`
- **AND** the UI remains on Step 2
- **AND** displays the error notice in a danger `Notice` banner

### Scenario: Rate limit protection on reset requests
- **GIVEN** a client has issued 3 password reset requests within 60 seconds
- **WHEN** a 4th request is attempted
- **THEN** the backend rejects the request with HTTP 429 Too Many Requests per `auth-password-reset` limiter (3 per minute)

### Scenario: Anti-enumeration for unverified or unknown numbers
- **GIVEN** an unverified phone `09935240627` (`phone_verified_at == null`) or non-existent number
- **WHEN** the user enters this number on `/auth/password/forgot` and clicks "Send code"
- **THEN** the API returns HTTP 200 with `status: "code_pending"`
- **AND** NO OTP is recorded in `auth_otps`
- **AND** NO SMS delivery is initiated
- **AND** the UI still transitions to Step 2 to prevent account enumeration leaks
- **WHEN** any code is submitted on Step 2
- **THEN** the backend rejects with generic error message `RESET_INVALID`

### Scenario: Local operator inspection seam
- **GIVEN** a local or testing environment (`APP_ENV=local`)
- **WHEN** an operator runs:
  ```bash
  php artisan serbizyu:otp:peek {phone} --purpose=reset
  ```
- **THEN**:
  - If a valid fake delivery exists for that phone and purpose, the command outputs the code and exits with code `0`.
  - If no fake delivery exists, the command outputs `No fake OTP delivery found for that phone/purpose.` and exits with code `1`.

---

## 2. Requirement: Interface Modernization & Legacy Retirement

### Scenario: Modern Onboarding Presentation & Contract
- **GIVEN** an authenticated user accessing the onboarding storefront setup on `/my-listings`
- **WHEN** the onboarding interface renders
- **THEN** it MUST render the modern `ModernOnboarding` component using Tailwind tokens and `AuthShell`
- **AND** it MUST NOT load `almost-there-onboarding.css` or run typewriter animations
- **AND** the area selector MUST restrict options to `'Tagudin'` and `'Tagudin Centro'`
- **AND** the submission payload MUST include `provider_intent`, `display_name`, `area_code`, `language_code`, `password`, and `password_confirmation`

### Scenario: Retirement of `ProductExperience.tsx` and Legacy Branching
- **GIVEN** any active route in the application (`/`, `/browse`, `/my-listings`)
- **WHEN** navigated to by a user
- **THEN** the route MUST NOT branch to or render `ProductExperience.tsx`
- **AND** `resources/js/Pages/ProductExperience.tsx` MUST be removed from the repository
