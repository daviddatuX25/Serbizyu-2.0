# Phone OTP identity

## Purpose

Define the active authentication capability for the first vertical slice.

## Requirements

### Requirement: Phone-first OTP authentication
The system SHALL authenticate browser users using an E.164 Philippine mobile number and a one-time code.

#### Scenario: New phone registration
- **WHEN** an unknown valid Philippine mobile number requests a code
- **THEN** the system creates a pending user + profile, persists a hashed OTP challenge, and delivers through the configured `OtpDeliveryChannel`

#### Scenario: Existing phone login
- **WHEN** an existing non-suspended phone requests and verifies a valid code
- **THEN** the system authenticates that same user row and regenerates the session

#### Scenario: Invalid or expired code
- **WHEN** verification fails for invalid, expired, consumed, or locked challenges
- **THEN** the system returns a generic OTP failure and does not authenticate

### Requirement: Swappable delivery without domain coupling
OTP delivery SHALL go through `OtpDeliveryChannel`. Disposable environments use fake/log adapters. Live SMS adapters remain disabled until a separate provider gate.

#### Scenario: Local UAT inspection
- **WHEN** an operator runs `serbizyu:otp:peek` in local/testing/capstone
- **THEN** the latest fake delivery code may be inspected
- **AND** the product UI MUST NOT display the code or any universal bypass

### Requirement: Product routes use real session auth
Protected product routes SHALL use Laravel authentication (`EnsureAuthenticated` / `Auth::user()`), not fixture/`mock_auth` session middleware.

#### Scenario: Guest opens My Listings
- **WHEN** an unauthenticated user requests `/my-listings`
- **THEN** they are redirected to `/auth/phone`
