# Specification — D1-Story-1.3: Manage Additive Capabilities and Profile Readiness

## Change ID
`d1-story-1-3-manage-additive-capabilities`

## Acceptance Criteria (from `epics.md` Story 1.3)

```gherkin
Feature: Manage Additive Capabilities and Profile Readiness (Story 1.3)

  Scenario: Additive capability attachment without persona switching
    Given an authenticated participant
    When the participant activates the "buyer" capability
    Then the "buyer" capability is active for the account
    When the participant subsequently activates the "provider" capability
    Then both "buyer" and "provider" capabilities are active simultaneously
    When the participant subsequently activates "merchant" and "agent" capabilities
    Then all four capabilities attach additively to the singular attributable identity

  Scenario: Idempotent capability attachment
    Given an authenticated participant with an active "provider" capability
    When the participant requests activation of "provider" again
    Then the request succeeds idempotently without creating duplicate active records

  Scenario: Rejection of unsupported and restricted capabilities
    Given an authenticated participant
    When the participant attempts to self-activate the "admin" capability
    Then the request is rejected with validation error "UNSUPPORTED_CAPABILITY"
    When the participant attempts to activate an unknown capability "superuser"
    Then the request is rejected with validation error "UNSUPPORTED_CAPABILITY"
    And no unauthorized capability is attached

  Scenario: Monotonic profile readiness transition
    Given an authenticated participant with unconfigured profile fields and no password
    When the participant queries account readiness
    Then the readiness status is "setup_required" and ready is false
    When the participant submits valid profile fields and sets an account password
    Then the readiness state transitions to "ready"
    And subsequent capability activations preserve the "ready" state

  Scenario: Incomplete readiness submissions do not advance state prematurely
    Given an authenticated participant with status "setup_required"
    When the participant submits profile updates with missing required fields
    Then the server rejects the request with validation errors
    And the readiness status remains "setup_required"

  Scenario: Purpose-specific actions projection
    Given an authenticated participant with a completed profile
    When the account holds only the "buyer" capability
    Then the returned actions include "browse_listings" and "create_request"
    And "create_listing" is not included
    When the "provider" capability is added
    Then the returned actions include "create_listing" alongside buyer actions
    When the "agent" capability is added
    Then the returned actions include "view_client_roster"

  Scenario: Operational gating on listing creation
    Given an authenticated participant with only the "buyer" capability
    When the participant attempts to create a listing draft via POST /listings
    Then the action is denied with 403 "PREREQUISITE_FAILED"
    Given an authenticated participant with the "provider" capability but incomplete profile readiness
    When the participant attempts to create a listing draft
    Then the action is denied with 403 "PREREQUISITE_FAILED"
    Given an authenticated participant with the "provider" capability and completed profile readiness
    When the participant creates a listing draft
    Then the listing draft is created successfully with 201 Created

  Scenario: Operational gating on request creation
    Given an authenticated participant without the "buyer" capability
    When the participant attempts to create a request via POST /requests
    Then the action is denied with 403 "PREREQUISITE_FAILED"
    Given an authenticated participant with the "buyer" capability
    When the participant creates a request
    Then the request is accepted successfully

  Scenario: Independent capability preservation upon revocation
    Given an authenticated participant holding both "buyer" and "provider" capabilities
    When the participant revokes the "provider" capability
    Then the "provider" capability is marked revoked immediately
    And attempts to create listing drafts are denied with 403
    And the "buyer" capability remains active and undamaged
    And the participant can still create buyer requests successfully

  Scenario: Anti-hijacking denial of client-supplied Owner
    Given an authenticated participant
    When the participant attempts to create a listing supplying another user's ID as "owner_user_id" without an active Agent consent grant
    Then the operation is denied with 403 "AUTHORIZATION_DENIED"

  Scenario: Agent delegation operational gate
    Given an authenticated participant without the "agent" capability
    When the participant attempts to perform an acting-for operation on behalf of an owner
    Then the operation is denied with 403 "AUTHORIZATION_DENIED"
    Given an authenticated participant with the "agent" capability and an active consent grant
    When the participant performs an authorized acting-for update on the owner's listing
    Then the operation succeeds with attribution recorded
    When the participant's "agent" capability is revoked
    Then subsequent acting-for operations are denied with 403 immediately
```
