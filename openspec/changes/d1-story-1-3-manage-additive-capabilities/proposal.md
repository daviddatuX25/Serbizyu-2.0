# Proposal — D1-Story-1.3: Manage Additive Capabilities and Profile Readiness

## Change ID
`d1-story-1-3-manage-additive-capabilities`

## Delivery Unit & Story Reference
- **Delivery Unit:** `D1` — Participant Identity, Attributable Authority, and Operational Readiness
- **Story:** `Story 1.3: Manage Additive Capabilities and Profile Readiness` (`1-3-manage-additive-capabilities-and-profile-readiness`)
- **Epic:** `Epic 1: Participant Identity, Attributable Authority, and Operational Readiness`
- **Requirements Reference:** `PRD-001`, `PRD-003`, `PRD-023`, `PRD-075`; `UX-DR14`.
- **Architectural Reference:** ADR-R-004 (Additive capabilities without persona switching), ADR-R-030 (Hybrid mobile auth).
- **Rule Reference:** `.ai/rules/identity.md`, `.ai/rules/http-and-auth.md`, `.ai/rules/agent-delegation.md`.

---

## 1. Problem Statement
In traditional platforms, a user must switch "personas" (e.g. toggle between a Customer account and a Provider account) or create completely separate accounts for each marketplace role. This fragments transaction history, obscures auditability, and leads to account duplication.

In Serbizyu 2.0:
1. An account identity is singular, anchored by the participant's verified Philippine mobile number (`phone_e164`) and attributable profile.
2. Market roles (`Buyer`, `Provider`, `Merchant`, `Agent`) attach **additively** as capability records (`role_assignments`), allowing one member to participate in various transactions without global role switching.
3. Profile readiness progresses **monotonically** from `setup_required` to `ready` once mandatory profile attributes (display name, service area) and account password credentials are satisfied.
4. Operational actions (such as creating service listings, submitting product offers, or publishing buyer requests) must enforce capability prerequisites at the server boundary.
5. Revoking or missing a prerequisite must immediately disable dependent operational actions without corrupting or revoking independent capabilities.
6. Client-supplied Owner parameters and unauthorized/unsupported capability activations (e.g. self-assigning `admin`) must be strictly forbidden.

---

## 2. In-Scope Deliverables
1. **Additive Capability Management:**
   - Additive assignment and verification for `buyer`, `provider`, `merchant`, and `agent` roles in `RoleAssignmentService`.
   - Rejection of unsupported capability codes and restricted roles (`admin`) during participant self-activation.
   - Idempotent attachment preventing duplicate active records for the same role.
2. **Monotonic Profile Readiness:**
   - Monotonic transition of profile readiness from `setup_required` to `ready` upon complete profile setup and password definition.
   - Separation of profile readiness from capability states.
   - Generation of purpose-specific actions and operational readiness projections.
3. **Operational Prerequisite Enforcement:**
   - Operational gating on listing creation requiring active `provider` or `merchant` capability and completed profile readiness.
   - Operational gating on request creation requiring active `buyer` capability.
   - Operational gating on agent delegation requiring active `agent` capability and valid consent grant.
   - Rejection of client-supplied `owner_user_id` without valid Agent delegation authority.
4. **Independent Capability Preservation:**
   - Revocation of a capability disables dependent actions immediately while preserving all independent active capabilities.
5. **HTTP & Application Seams:**
   - `GET /account/capabilities`: Inspect active capabilities, profile readiness, and purpose-specific actions.
   - `POST /account/capabilities`: Request additive capability activation.
   - `DELETE /account/capabilities/{role}`: Revoke a specific capability.
   - `GET /account/readiness`: Inspect profile readiness state and blockers.
   - Enhancements to `OnboardingService` and `SliceStateQuery` to reflect additive capabilities.
6. **Comprehensive TDD Test Suite:**
   - Author `tests/Feature/IdentityAccess/Story1_3_AdditiveCapabilitiesAndReadinessTest.php` covering all Story 1.3 acceptance criteria.
