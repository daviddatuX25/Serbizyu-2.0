# Specification — D1-Story-1.1: Create and Resume a Secure Account

## Change ID
`d1-story-1-1-secure-registration-and-sign-in`

## Acceptance Criteria (from `epics.md` Story 1.1)

```gherkin
Feature: Create and Resume a Secure Account (Story 1.1)

  Scenario: Successful fresh registration with valid Philippine mobile
    Given an unregistered mobile number in standard format "09171234567"
    When the member requests registration challenge
    Then the phone number is normalized to "+639171234567"
    And a pending user record is created in the database
    And a single-use 6-digit challenge is hashed and stored in "auth_otps" with 600-second TTL
    And the HTTP response returns "status: code_pending" without exposing internal user state

  Scenario: Atomic verification and session establishment
    Given a pending user with an active "signup_verify" challenge
    When the member submits the correct 6-digit verification code
    Then the challenge is atomically marked "consumed_at"
    And the user is transitioned to "status: active" with "phone_verified_at" set
    And the member is authenticated with a fresh, regenerated session
    And subsequent submission of the same code is rejected with "OTP_INVALID"

  Scenario: Resuming interrupted onboarding
    Given a member who requested registration but did not complete onboarding
    When the member re-enters the same unregistered or pending mobile number
    Then the platform re-uses the existing pending user record without creating a duplicate record
    And any previous pending challenge for that phone is invalidated
    And a new challenge is issued and delivered

  Scenario: Anti-enumeration for existing verified accounts
    Given a mobile number that already belongs to an active, verified account
    When a visitor submits this number to the registration endpoint
    Then the platform returns a generic "code_pending" response
    And no new OTP challenge is created in "auth_otps"
    And no SMS is dispatched to the user

  Scenario: Anti-enumeration for suspended accounts
    Given a mobile number that belongs to a suspended account
    When a visitor submits this number to the registration endpoint
    Then the platform returns a generic "code_pending" response
    And no challenge is created in "auth_otps"
    And attempting to verify an arbitrary code fails with "OTP_INVALID"

  Scenario: Challenge lockout after maximum failed attempts
    Given an active "signup_verify" challenge
    When the member submits 5 consecutive incorrect 6-digit codes
    Then each failure increments the attempt counter
    And after the 5th failure, even the correct code is rejected with "OTP_INVALID"

  Scenario: Rejection of expired challenges
    Given an active "signup_verify" challenge whose "expires_at" is in the past
    When the member submits the correct code
    Then the request is rejected with "OTP_INVALID"
    And the user remains in "pending" status without being verified
```
