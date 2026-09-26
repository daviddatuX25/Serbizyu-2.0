# Tasks — D1-Story-1.4: Submit and Review Identity Evidence Safely

## Change ID
`d1-story-1-4-submit-and-review-identity-evidence`

## Task List

- [x] **Task 1: Test Suite Construction (TDD Seam)**
  - Author `tests/Feature/IdentityAccess/Story1_4_IdentityEvidenceAndVerificationTest.php` with Pest covering:
    - Submission of Barangay certificate and Government ID with private disk storage.
    - Live government ID collection gate enforcement (`serbizyu.identity.live_government_id_collection`).
    - Monotonic ladder progression (Level 1: Phone Verified -> Level 2: Barangay Endorsed -> Level 3: Formally Verified) and prerequisite enforcement.
    - Reviewer decisioning (approve/reject) with maker-checker separation and non-disclosing reasons.
    - Privacy protection: raw evidence file access control and purpose-scoped public trust projections.
    - Idempotent deduplication and MIME type anti-tamper validation.
    - Retention policy and retention hold enforcement (including PostgreSQL trigger verification).

- [x] **Task 2: Core Domain Service Implementation**
  - Implement `App\Modules\IdentityAccess\Application\IdentityVerificationService`:
    - Document type validation and prerequisite checking.
    - SHA-256 calculation and duplicate detection.
    - Private disk upload and `evidence_files` creation.
    - `identity_verifications` creation and status transitions.
    - Monotonic trust level calculation.
    - Non-disclosing reason dictionary enforcement.
    - Maker-checker separation and admin authorization.
    - Audit event recording via `AuditRecorder`.
    - Retention hold placement, release, and evidence deletion.

- [x] **Task 3: HTTP Controllers and Route Registration**
  - Implement `App\Http\Controllers\IdentityEvidenceController`:
    - `store`: Multipart upload handling.
    - `index`: Purpose-scoped owner projections.
    - `download`: Raw file retrieval with authorization checks.
    - `destroy`: Retention-governed deletion.
    - `trustLevel`: Current user trust level.
    - `publicTrustProfile`: Public trust badge projection.
  - Implement `App\Http\Controllers\AdminIdentityVerificationController`:
    - `index`: Pending review queue.
    - `review`: Admin approve/reject endpoint with non-disclosing reasons.
    - `createRetentionHold`: Compliance hold placement.
    - `releaseRetentionHold`: Hold release.
  - Register endpoints in `routes/web.php`.

- [x] **Task 4: Verification and Quality Assurance**
  - Run Pest test suite for Story 1.4:
    `docker compose exec app vendor/bin/pest tests/Feature/IdentityAccess/Story1_4_IdentityEvidenceAndVerificationTest.php`
  - Run Pint formatter:
    `docker compose exec -u "$(id -u):$(id -g)" app ./vendor/bin/pint app/ tests/ --format agent`
  - Run full IdentityAccess test suite:
    `docker compose exec app vendor/bin/pest tests/Feature/IdentityAccess/`

- [x] **Task 5: Project Documentation and Sprint Closure**
  - Update `_bmad-output/implementation-artifacts/sprint-status.yaml` marking `1-4-submit-and-review-identity-evidence-safely` as `done`.
  - Git commit with message `feat(identity): implement Story 1.4 submit and review identity evidence safely (D1)`.
