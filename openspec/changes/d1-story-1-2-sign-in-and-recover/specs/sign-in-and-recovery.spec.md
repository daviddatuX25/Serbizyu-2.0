# Specification — D1-Story-1.2: Sign In and Recover Without Enumeration

## Change ID
`d1-story-1-2-sign-in-and-recover`

## Acceptance Criteria (from `epics.md` Story 1.2)

```gherkin
Feature: Sign In and Recover Without Enumeration (Story 1.2)

  Scenario: Returning sign-in with phone and password
    Given an active, phone-verified account with a password set
    When the member signs in with valid phone and password
    Then access is restored with a freshly regenerated session
    And no SMS OTP is minted or delivered

  Scenario: Returning sign-in with email and password
    Given an active, phone-verified account with a linked email and password
    When the member signs in with valid email and password
    Then access is restored with a freshly regenerated session

  Scenario: Fallback sign-in with SMS OTP
    Given an active, phone-verified account
    When the member requests an SMS login code and submits the valid OTP
    Then the challenge is consumed
    And access is restored with a regenerated session without altering verification timestamps

  Scenario: Non-enumerating sign-in rejection for nonexistent identifiers
    Given an unregistered phone number or email address
    When a visitor attempts password sign-in or SMS OTP login request
    Then the platform returns generic failure responses without revealing whether the account exists
    And no challenge is recorded in "auth_otps"
    And no notification is dispatched

  Scenario: Non-enumerating rejection for suspended or unverified accounts
    Given an account that is suspended or has not completed phone verification
    When sign-in or SMS OTP login is attempted
    Then access is denied and no session is created

  Scenario: Single-use email password recovery without auto-login
    Given an active account with a linked email
    When the member requests password reset and completes the reset with a valid token
    Then the password is updated
    And the token is invalidated against reuse
    And the user remains unauthenticated until explicit sign-in

  Scenario: Single-use SMS OTP password recovery without auto-login
    Given an active account with a verified mobile
    When the member requests SMS password reset and submits the valid OTP with new password
    Then the password is updated
    And the OTP is marked consumed
    And the user remains unauthenticated until explicit sign-in
```
