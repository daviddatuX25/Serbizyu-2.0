# Specification — D1-Story-1.4: Submit and Review Identity Evidence Safely

## Change ID
`d1-story-1-4-submit-and-review-identity-evidence`

## Acceptance Criteria (from `epics.md` Story 1.4 & PRD-002, PRD-003, PRD-037, PRD-071, PRD-075)

```gherkin
Feature: Submit and Review Identity Evidence Safely (Story 1.4)

  Scenario: Submitting identity evidence with private disk storage
    Given an authenticated, phone-verified participant
    When the participant submits a valid Barangay Certificate file
    Then the raw document is stored on the private disk
    And an evidence record is created with visibility "private" and scan status "clean"
    And a pending identity verification is registered
    And the returned response contains a sanitized projection without the private storage key

  Scenario: Live government ID collection is gated by legal/privacy activation
    Given the live government ID collection setting is disabled
    When a participant attempts to submit a Government ID document
    Then the request is rejected with HTTP 403 and error code "CAPABILITY_DISABLED"
    When the live government ID collection setting is enabled
    Then the participant can submit the Government ID document

  Scenario: Monotonic advancement of verification levels (Level 1 -> Level 2 -> Level 3)
    Given an unverified participant with no verified phone
    When the participant attempts to submit identity evidence
    Then the request is rejected with error code "PHONE_VERIFICATION_REQUIRED"
    When the participant completes mobile OTP verification
    Then the participant's trust level is "Level 1: Phone Verified"
    When the participant submits a Barangay Certificate and an admin approves it
    Then the participant's trust level advances monotonically to "Level 2: Barangay Endorsed"
    When a Level 1 participant attempts to submit a Government ID without Level 2 endorsement
    Then the request is rejected with error code "PREREQUISITE_NOT_MET"
    When the Level 2 participant submits a Government ID and an admin approves it
    Then the participant's trust level advances monotonically to "Level 3: Formally Verified"

  Scenario: Rejection records explicit non-disclosing reasons and preserves monotonic level
    Given a participant at "Level 2: Barangay Endorsed"
    When the participant submits a Government ID for Level 3 verification
    And an admin rejects the submission with code "DOCUMENT_UNREADABLE"
    Then the verification status transitions to "rejected"
    And the non-disclosing reason "The submitted document is unreadable, blurry, or low quality." is recorded
    And the participant's trust level remains at "Level 2: Barangay Endorsed"
    And invalid or disclosing rejection reasons are rejected by validation

  Scenario: Reviewer attribution, maker-checker separation, and immutable audit events
    Given a pending identity verification submitted by Participant A
    When an unauthorized user without the admin role attempts to review the verification
    Then the request is denied with HTTP 403
    When Admin user B approves the verification
    Then the verification records reviewed_by_user_id matching Admin B
    And an append-only audit event is recorded with action "identity_verification.approved"
    When an admin attempts to review their own verification submission
    Then the request is rejected with error code "CANNOT_REVIEW_OWN_EVIDENCE"

  Scenario: Privacy protection prevents unauthorized access to raw evidence
    Given Participant A has submitted an identity document
    When Participant B (an unrelated buyer or provider) requests the raw document file
    Then the request is denied with HTTP 403
    When an unauthenticated visitor requests the raw document file
    Then the request is denied
    When Participant A or an authorized Admin requests the raw file
    Then the file download is permitted
    When an evidence file is marked with scan status "quarantined"
    Then downloading the raw file is blocked even for the owner
    When any user requests the public trust profile of Participant A
    Then the response contains only the trust level and badge without raw file IDs or storage paths

  Scenario: Idempotency and anti-tamper safeguards
    Given a participant submits a document with a specific content hash
    When the participant submits an identical document while a verification is pending
    Then the server idempotently reuses the existing pending verification
    When a client submits an unsupported or executable file type
    Then the upload is rejected with HTTP 422

  Scenario: Retention schedules and retention hold enforcement
    Given an evidence file associated with an identity verification
    When an admin places an active retention hold on the evidence file
    Then attempting to delete the evidence file via API is blocked with HTTP 409
    And direct deletion in the database is blocked by the retention hold trigger
    When the retention hold is released
    Then deletion of the evidence file succeeds and the raw file is removed from private disk
```
