# Tasks — D1-Story-1.3: Manage Additive Capabilities and Profile Readiness

## Change ID: `d1-story-1-3-manage-additive-capabilities`
- **Story:** `Story 1.3: Manage Additive Capabilities and Profile Readiness` (`1-3-manage-additive-capabilities-and-profile-readiness`)
- **Delivery Unit:** `D1`

---

## 0. Packet Readiness & Seam Confirmation
- [x] 0.1 Author `proposal.md`, `design.md`, `specs/additive-capabilities.spec.md`, `tasks.md`.
- [x] 0.2 Confirm public testing seams:
  - `GET /account/capabilities`
  - `POST /account/capabilities`
  - `DELETE /account/capabilities/{role}`
  - `GET /account/readiness`
  - `POST /onboarding`
  - `POST /listings`
  - `POST /requests`

---

## 1. Domain & Application Implementation
- [x] 1.1 Enhance `RoleAssignmentService`:
  - Add supported participant roles (`buyer`, `provider`, `merchant`, `agent`) and restricted roles (`admin`).
  - Add canonical mapping and aliasing (`buy` <-> `buyer`, `provide` <-> `provider`).
  - Add `ensureActive()` with role validation (rejecting `admin` and unsupported roles with 422).
  - Add `revoke()` setting `status = 'revoked'` and incrementing version atomically.
  - Add `hasActive()` with alias resolution.
  - Add `activeCapabilities()` returning normalized unique roles.
  - Add `readinessState()` computing profile completeness, password definition, and monotonic readiness.
  - Add `purposeSpecificActions()` projecting actions based on active capabilities and readiness.
  - Add `assertOperationalPrerequisite()` for fail-closed operational enforcement.
- [x] 1.2 Implement `CapabilityController` handling `GET /account/capabilities`, `POST /account/capabilities`, `DELETE /account/capabilities/{role}`, and `GET /account/readiness`.
- [x] 1.3 Register `/account/capabilities` and `/account/readiness` routes in `routes/web.php` under `EnsureAuthenticated`.
- [x] 1.4 Enhance `OnboardingService` and `OnboardingRequest` to accept additive roles/capabilities while preserving backwards compatibility with `provider_intent`.
- [x] 1.5 Enhance `SliceStateQuery` to return active capabilities, active roles, and purpose-specific actions.
- [x] 1.6 Implement operational gates:
  - Guard `ListingController::store` with `provider` or `merchant` capability and completed profile readiness.
  - Guard `RequestController::store` with `buyer` capability.
  - Guard `ResourceActorResolver::resolve` against client-supplied `owner_user_id` and requiring active `agent` role for acting-for delegations.

---

## 2. Test Execution & Verification Gate
- [x] 2.1 Author `tests/Feature/IdentityAccess/Story1_3_AdditiveCapabilitiesAndReadinessTest.php` covering all scenarios.
- [x] 2.2 Run Pest on `Story1_3_AdditiveCapabilitiesAndReadinessTest.php` (11 passed, 98 assertions).
- [x] 2.3 Run Pint formatting on modified and created files.
- [x] 2.4 Run full IdentityAccess test suite (75 passed, 496 assertions).
- [x] 2.5 Update `_bmad-output/implementation-artifacts/sprint-status.yaml` marking `1-3-manage-additive-capabilities-and-profile-readiness` as `done`.
- [x] 2.6 Commit with message `feat(identity): implement Story 1.3 manage additive capabilities and profile readiness (D1)`.
