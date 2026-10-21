# Tasks — D0-Story-2.1: Canonical Migration Manifest and Catalog Baseline

Change ID: `d0-story-2-1-canonical-manifest-and-catalog-baseline`  
Story: `Story 2.1`  
Delivery Unit: `D0`

---

## 0. Packet Readiness (Specification & Architecture Gate)

- [x] 0.1 Author `proposal.md` with problem statement, canonical 61-table inventory scope, non-goals, and frozen canonical authority references.
- [x] 0.2 Author `design.md` covering Master Delivery Plan §7 sections 1–15 plus §7.1 (21-area review matrix).
- [x] 0.3 Author `specs/canonical-migration-manifest.spec.md` with normative Given/When/Then scenarios.
- [x] 0.4 Reconcile observed database tables: identify 60 active canonical tables, 1 deferred canonical table (`request_invitations`), 2 engine tables (`migrations`, `spatial_ref_sys`), and 3 auxiliary tables (`oauth_identities`, `password_reset_tokens`, `t4_work_migration_audits`).
- [x] 0.5 Confirm first-consuming dependency DAG ordering from D0 through D11.

---

## 1. Automated Verification Implementation
- [x] 1.1 Author `tests/Feature/CanonicalMigrationManifestTest.php` implementing:
  - Test 1: Canonical 61-table manifest definition and table-by-table presence check.
  - Test 2: Active database inventory classification (60 active domain + 1 deferred + 2 engine + 3 auxiliary = 65 total).
  - Test 3: Candidate keys and constraint verification on existing authoring catalog tables (`work_catalog_versions` and `deal_chain_catalog_versions`).
  - Test 4: First-consumer DAG acyclic integrity check.
- [x] 1.2 Run Pest on `tests/Feature/CanonicalMigrationManifestTest.php` and ensure all assertions pass (5 passed, 80 assertions).
- [x] 1.3 Run Pint code formatter on modified/created PHP files (`vendor/bin/sail bin pint --dirty --format agent`).

---

## 2. Rehearsal & Verification Evidence

- [x] 2.1 Execute schema introspection query against PostgreSQL (65 tables in `public` schema verified).
- [x] 2.2 Verify candidate keys on `work_catalog_versions`:
  - `uq_work_catalog_code_version` (`catalog_code`, `catalog_version`)
  - `uq_work_catalog_shape_version` (`work_shape`, `shape_contract_version`, `payload_schema_version`, `catalog_version`)
- [x] 2.3 Verify candidate keys on `deal_chain_catalog_versions`:
  - `uq_deal_chain_catalog_recipe_version` (`recipe_code`, `catalog_version`)
- [x] 2.4 Verify checkpoint state machine for `canonical-58-v1` batches 000–009.
- [x] 2.5 Confirm `request_invitations` is not present in the current database, proving no premature table creation.

---

## 3. Stop/Go and Handoff Gate

- [x] 3.1 Verify Story 2.1 Acceptance Criteria in `epics.md`:
  - *Given the observed 47-table baseline, the two already-migrated catalog-version tables, and fourteen approved extensions* — Verified against PostgreSQL information schema.
  - *When the implementation packet reconciles inventory, ownership, dependency order, and clean/in-place migration/rollback paths* — Formally established in `design.md`.
  - *Then the canonical manifest contains exactly 61 tables and maps every not-yet-needed table to its first consuming story* — Verified in `specs/canonical-migration-manifest.spec.md` and `CanonicalMigrationManifestTest.php`.
  - *And this story verifies current catalog constraints plus production-shaped migration fixtures without pre-creating unrelated future tables* — Verified with 5 passing Pest tests.
- [x] 3.2 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: mark `2-1-reconcile-the-canonical-migration-manifest-and-existing-catalog-baseline` as `done` and `epic-2` as `in-progress`.
- [x] 3.3 Handoff to D1 / Story 1.1 (`1-1-secure-registration-and-sign-in-for-citizens-and-providers`).
