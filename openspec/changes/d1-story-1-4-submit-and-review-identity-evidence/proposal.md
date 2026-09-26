# Proposal — D1-Story-1.4: Submit and Review Identity Evidence Safely

## Change ID
`d1-story-1-4-submit-and-review-identity-evidence`

## Delivery Unit & Story Reference
- **Delivery Unit:** `D1` — Participant Identity, Attributable Authority, and Operational Readiness
- **Story:** `Story 1.4: Submit and Review Identity Evidence Safely` (`1-4-submit-and-review-identity-evidence-safely`)
- **Epic:** `Epic 1: Participant Identity, Attributable Authority, and Operational Readiness`
- **Requirements Reference:** `PRD-002`, `PRD-003`, `PRD-037`, `PRD-071`, `PRD-075`; `UX-DR14`.
- **Architectural Reference:** ADR-R-004, ADR-R-016 (Access Tiers vs Identity Levels), ADR-R-030 (Hybrid Auth).
- **Rule Reference:** `.ai/rules/identity.md`, `.ai/rules/http-and-auth.md`.

---

## 1. Problem Statement
In community marketplaces, sensitive identity documents (such as Barangay clearance certificates and government-issued national IDs) are frequently handled haphazardly: uploaded to public or world-readable storage buckets, displayed unredacted to buyers or providers, or conflated with device access tiers (`L0`–`L4`). Furthermore, platforms often inflate trust indicators by creating misleading public badges that claim stronger verification than was ever performed, or leak internal investigation notes and heuristic detection logic in rejection messages.

In Serbizyu 2.0:
1. **Private Storage & Quarantine**: All raw identity evidence documents are stored strictly in private, access-controlled disk storage. They are never world-readable or accessible via public URLs.
2. **Monotonic Trust Ladder**: Trust levels advance monotonically:
   - `Level 1: Phone Verified` (baseline mobile OTP verification)
   - `Level 2: Barangay Endorsed` (verified Barangay certificate)
   - `Level 3: Formally Verified` (verified Government ID or Trade License)
   Level progression enforces strict prerequisites (Level 1 required for Level 2; Level 2 required for Level 3). Rejection of higher-tier evidence does not demote prior verified levels.
3. **Purpose-Scoped Redacted Projections**: Unauthorized participants cannot access raw evidence files. Public profiles and browsing projections expose strictly the verified trust badge/level without exposing raw documents, storage keys, document identifiers, or personal data. Submitting owners view purpose-scoped metadata without leaking internal operator heuristics.
4. **Immutable Reviewer Attribution & Maker-Checker Separation**: Reviews (approval/rejection) require authorized administrator credentials. Self-review (a participant approving their own document) is strictly denied. Review events are immutably recorded in `audit_events` with actor attribution, timestamps, and previous/next states.
5. **Non-Disclosing Rejection Reasons**: Rejection reasons adhere to an explicit, safe whitelist (e.g. `DOCUMENT_UNREADABLE`, `NAME_MISMATCH`, `DOCUMENT_EXPIRED`, `INVALID_DOCUMENT_TYPE`, `INCOMPLETE_DOCUMENT`, `SUSPECTED_ALTERATION`) preventing disclosure of internal security heuristics or sensitive participant data.
6. **Retention Schedules & Hold Enforcement**: Evidence files are assigned formal retention policies. Active retention holds (in `retention_holds`) block premature deletion at both the domain service level and through database integrity triggers (`evidence_files_retention_hold_guard`).
7. **Fail-Closed Privacy Gate**: Sensitive government ID collection is gated by `IdentityVerificationGate` (`serbizyu.identity.live_government_id_collection`), failing closed with HTTP 403 / `CAPABILITY_DISABLED` when live collection is disabled.

---

## 2. In-Scope Deliverables
1. **Domain Services**:
   - `IdentityVerificationService`: Handles evidence submission, SHA-256 content hashing, private storage placement, duplicate detection, monotonic verification level calculation, maker-checker review decisioning, safe non-disclosing rejection sanitization, owner projection generation, and retention hold enforcement.
   - `IdentityVerificationGate`: Enforces legal/privacy fail-closed gating for live government ID submissions.
2. **HTTP Interfaces**:
   - `POST /account/identity/evidence`: Multipart evidence submission for authenticated participants.
   - `GET /account/identity/evidence`: Owner's purpose-scoped evidence and verification projection.
   - `GET /account/identity/evidence/{id}/file`: Authorized raw file retrieval (owner or admin only; quarantined files blocked).
   - `DELETE /account/identity/evidence/{id}`: Retention-governed evidence purge (denied if under active hold).
   - `GET /account/identity/trust-level`: Current participant verification level.
   - `GET /users/{userId}/trust-profile`: Public trust projection exposing only legitimate verification level and badge.
   - `GET /admin/identity-verifications`: Review queue for authorized administrators.
   - `POST /admin/identity-verifications/{id}/review`: Reviewer approval/rejection with attribution.
   - `POST /admin/identity/retention-holds`: Place compliance/legal retention hold.
   - `DELETE /admin/identity/retention-holds/{id}`: Release retention hold.
3. **Audit & Integrity Integration**:
   - Audit trail in `audit_events` recording reviewer attribution, target verification, timestamps, and correlation IDs.
   - Verification of PostgreSQL trigger `evidence_files_retention_hold_guard`.
4. **Comprehensive Test Suite**:
   - `tests/Feature/IdentityAccess/Story1_4_IdentityEvidenceAndVerificationTest.php` covering all acceptance criteria under Pest with database transactions and PostgreSQL guards.
