# D0-Story-2.1 — Canonical Migration Manifest and Catalog Baseline Reconciliation

Status: DRAFT LLD/OpenSpec — Ready for Implementation Hardening  
Plane: `C`, `S`, `T`  
Story: `Story 2.1`  
Delivery Unit: `D0`  
Change ID: `d0-story-2-1-canonical-manifest-and-catalog-baseline`  
Tracking Key: `2-1-reconcile-the-canonical-migration-manifest-and-existing-catalog-baseline`

---

## 1. Intent

Produce an authoritative, verified, and testable database manifest that:
1. Reconciles the observed PostgreSQL database baseline (47 foundation tables, `work_catalog_versions`, `deal_chain_catalog_versions`, and 11 initiative extension tables) against the canonical 61-table architecture inventory.
2. Identifies the exact status of all 65 observed tables in PostgreSQL (60 migrated canonical domain tables + 1 deferred canonical table `request_invitations` + 2 database/extension engine tables `migrations` and `spatial_ref_sys` + 3 auxiliary/transitional tables `oauth_identities`, `password_reset_tokens`, and `t4_work_migration_audits`).
3. Establishes the authoritative **First-Consumer Dependency DAG** (D0 through D11) prohibiting premature schema allocation.
4. Verifies the existing catalog baseline candidate keys, constraints, and deterministic checkpoints.
5. Replaces superseded 58-table train planning gates with the canonical 61-table authority across all operational inspection and verification tooling.

---

## 2. What Changes

1. **OpenSpec Specification:**
   - Detailed 15-section LLD (`design.md`) answering every required technical architecture and operational question.
   - Comprehensive 21-area engineering review matrix (§16 of `design.md`) answering domain correctness, transaction boundaries, lock order, TOCTOU defense, and failure modes.
   - Executable specification (`specs/canonical-migration-manifest.spec.md`) binding table names, candidate keys, and first-consumer assignments.
2. **Automated Verification Suite:**
   - `tests/Feature/CanonicalMigrationManifestTest.php` verifying:
     - Exact 61-table canonical inventory definition.
     - Accurate classification of all observed tables in the active PostgreSQL database.
     - Candidate key, unique index, and check constraint integrity on `work_catalog_versions` and `deal_chain_catalog_versions`.
     - First-consumer dependency mapping: confirming `request_invitations` (#59) is deferred to D6 (Story 6.3) and not prematurely queried by earlier stories.
     - Checkpoint verification under canonical versioning.
3. **Operational Runbook & Checksum Tooling:**
   - Concrete Artisan / SQL verification commands for clean disposable builds vs. brownfield in-place databases.

---

## 3. Scope & Non-Goals

### In Scope
- Verification and classification of all tables in PostgreSQL.
- Formal mapping of every canonical table to its first-consuming delivery unit (D0 through D11).
- Strict enforcement of candidate keys on existing authoring catalog tables.
- Automated Pest verification test for CI/CD and local environments.
- Rollback and backup/restore rehearsal procedure.

### Non-Goals
- **No premature migration execution:** Table `request_invitations` (#59) MUST NOT be created in D0; it belongs to D6 (Stories 6.1–6.5).
- **No deletion of transitional tables:** `oauth_identities`, `password_reset_tokens`, and `t4_work_migration_audits` remain classified and preserved for backward compatibility and audit safety.
- **No HTTP domain mutation endpoints:** Story 2.1 is strictly database architecture and operator governance.
- **No live credentials or third-party connections.**

---

## 4. Governing Authority & Frozen References

This OpenSpec change implements and enforces the following canonical planning artifacts:

| Artifact | Location | Frozen Authority Scope |
| --- | --- | --- |
| Canonical Schema | `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md` | §2 (61-table inventory), §14 (First-consumer DAG) |
| Master Delivery Plan | `_bmad-output/planning-artifacts/master-delivery-plan.md` | §5 (D0 Delivery Unit), §7 (15-section contract), §7.1 (21-area matrix) |
| Delivery Epics & Stories | `_bmad-output/planning-artifacts/epics.md` | Story 2.1 Acceptance Criteria (lines 427–440) |
| Domain & State Contracts | `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` | §§15–17 (Version roles, checkpoint states) |
| Architecture Spine | `_bmad-output/planning-artifacts/architecture-rebuilt.md` | §16 (Technical architecture baseline), §17 (Pre-messaging boundary) |
| Frontend View Matrix | `_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/VIEW-PROJECTION-MATRIX.md` | AD-1–23 plus AD-22A/B |

**Requirements Covered:** `PRD-060`, `PRD-061`, `PRD-072`, `PRD-075`, `PRD-080`, `PRD-084`.
