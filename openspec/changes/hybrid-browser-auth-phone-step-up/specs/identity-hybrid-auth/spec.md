# Capability Spec — Multi-method sign-in + strict mobile signup

Change ID: `hybrid-browser-auth-phone-step-up`  
Capability: `identity-hybrid-auth`

## ADDED Requirements

### Requirement: Signup requires strict mobile verification

A new account MUST NOT be treated as signup-complete until an E.164 mobile number is verified via OTP and `phone_verified_at` is set.

#### Scenario: Signup blocked without phone OTP

- **Given** a guest starting registration
- **When** they attempt to finish signup without successful phone OTP verification
- **Then** the account is not ready / not fully registered
- **And** protected Provider capabilities remain unavailable

#### Scenario: Phone OTP completes signup identity

- **Given** a signup in progress with a valid mobile
- **When** the OTP verifies successfully
- **Then** `phone_e164` and `phone_verified_at` are set
- **And** the user may continue onboarding

---

### Requirement: Onboarding requires an account password

AlmostThere / provider readiness MUST NOT become `ready` until `users.password` is set. Email remains optional. Password is account-level and independent of email.

#### Scenario: Onboarding blocked without password

- **Given** a phone-verified user on onboarding
- **When** they submit profile fields without a password
- **Then** validation fails
- **And** readiness remains not ready

#### Scenario: Onboarding with password and no email

- **Given** a phone-verified user
- **When** they complete onboarding with password and no email
- **Then** readiness is ready
- **And** they may sign in with phone + password without OTP delivery

---

### Requirement: Sign-in prefers password over SMS

Ordinary return sign-in MUST prefer password paths to reduce SMS cost. Supported methods for a phone-verified account: phone/password, email/password (if linked), SMS OTP (fallback), and Google OAuth (adapters may be phased).

#### Scenario: Phone/password return sign-in without SMS

- **Given** a phone-verified user with password set
- **When** they sign in with phone + password
- **Then** a session is established
- **And** `OtpDeliveryChannel` is not invoked

#### Scenario: Email/password return sign-in without SMS

- **Given** a phone-verified user with email/password set
- **When** they sign in with email/password
- **Then** a session is established
- **And** `OtpDeliveryChannel` is not invoked

#### Scenario: SMS OTP return sign-in (fallback)

- **Given** a phone-verified user
- **When** they choose SMS sign-in and verify OTP
- **Then** a session is established for that user

#### Scenario: Google OAuth return sign-in

- **Given** a phone-verified user with a linked Google subject (or linking during an authenticated bind flow)
- **When** Google OAuth succeeds via the configured adapter
- **Then** a session is established for that same user
- **And** Google alone MUST NOT create a signup-complete account that skips mobile verification

---

### Requirement: Password recovery is planned and rate-limited

Because onboarding requires an account password, a phone-verified user MUST be able to regain access without support: an email reset link (if email is linked) or an SMS-OTP-verified reset (fallback for phone-only accounts). Reset tokens are single-use with short expiry; request and confirm endpoints use named limiters; copy is generic (no account-existence leak).

#### Scenario: Email reset link resets password

- **Given** a phone-verified user with linked email
- **When** they request a password reset and open the emailed single-use link
- **Then** they set a new password
- **And** the token is consumed once (unusable on replay)

#### Scenario: SMS-verified reset for a phone-only account

- **Given** a phone-verified user with no email linked
- **When** they request a reset via SMS OTP and verify it
- **Then** they set a new password without support intervention

#### Scenario: Reset requests are throttled

- **Given** repeated reset requests for the same identifier
- **When** the `auth-password-reset` limit is exceeded
- **Then** further requests return HTTP 429

#### Scenario: Reset request for unknown identifier is non-enumerating

- **Given** a guest requesting a reset for an email or phone with no account (or a non-verified account)
- **When** the request completes
- **Then** the response is the same generic confirmation as a real identifier (no account-existence leak)
- **And** no reset token or OTP is created

#### Scenario: Reset cannot complete for a non-verified account

- **Given** an account that never completed phone verification
- **When** a reset attempt reaches the confirm step
- **Then** the reset is rejected generically
- **And** the password is not changed

---

### Requirement: High-trust actions may still require phone step-up

Provider enablement, Agent consent, and money/payout policies MAY require a fresh phone OTP step-up even when the current session was opened via email or password.

---

### Requirement: Auth HTTP endpoints are rate-limited

Authentication and credential-setting HTTP endpoints MUST use named Laravel `RateLimiter` definitions (Boost / starter-kit pattern). Anonymous `throttle:N,1` alone is insufficient once multi-method auth ships.

#### Scenario: Password login is throttled by identifier and IP

- **Given** repeated failed or rapid password login attempts for the same phone or email from an IP
- **When** the `auth-login` limit is exceeded
- **Then** further attempts are rejected with HTTP 429 until the window resets

#### Scenario: OTP send is throttled (security + SMS cost)

- **Given** repeated OTP request posts for register or SMS login
- **When** the `auth-otp-request` limit is exceeded
- **Then** further OTP sends are rejected with HTTP 429

---

### Requirement: Live SMS and live Google stay gated

Disposable environments use Fake OTP and mock/disabled Google. Live credentials require separate gates with cost/privacy/ops evidence.

---

### Requirement: Authority reopen before code

Application code MUST NOT ship multi-method sign-in or change primary auth until ADR-R-030 (or superseding ADR), foundation plan, and http-and-auth rules are amended and founder accept on this change is recorded.

## SUPERSEDES (upon founder accept + ADR amend)

- ADR-R-030 claim that phone OTP is the **only** primary ordinary L3 browser sign-in method.
- Foundation-plan non-goal forbidding email/password as a sign-in path; Google OAuth as sign-in is now in-contract (live still gated).
- OpenSpec claims that the only active product login path is phone OTP every session.
- Prior hybrid wording that password was optional until email was chosen (amended Option 1: password required at onboarding).

## DOES NOT SUPERSEDE

- Phone as required verified contact for **completed signup**.
- Phone OTP for SMS sign-in fallback and high-trust step-up.
- Deny-by-default live SMS / live OAuth activation.
- Email remaining optional for completed onboarding.
