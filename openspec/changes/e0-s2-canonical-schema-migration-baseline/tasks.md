# Tasks — E0-S2 Canonical schema migration baseline

Change ID: `e0-s2-canonical-schema-migration-baseline`  
Rule: no permanent migration implementation tasks may be marked complete until §0 readiness PASS. Pre-PASS work is packet/review only.

## 0. Packet readiness (docs / review)

- [x] 0.1 Author `proposal.md` with frozen authority SHAs, observed 47-table baseline, and eleven missing tables.
- [x] 0.2 Author `design.md` covering PROGRAM §6 sections 1–15 plus E0-S2 batch/file/stop-go specifics.
- [x] 0.3 Author capability delta spec with normative Given/When/Then scenarios.
- [x] 0.4 Re-hash frozen authority files; confirm SHAs still match `proposal.md` or record BMAD reopen.
- [x] 0.5 Data/Backend lead review: batch map, file names, checkpoint namespace `canonical-58-v1`, D-E0S2-04 collision disposition.
- [x] 0.6 Architect review: no unresolved authority question; AD-1–AD-29 and schema contract alignment.
- [x] 0.7 QA lead review: verification matrix E0-S2-T01…T07 and negative case list completeness.
- [x] 0.8 Record packet readiness PASS/FAIL in this file and in evidence README. **STOP if FAIL.**

```text
0.8 PASS — solo founder review 2026-08-10
Roles covered: Data/Backend + Architect + QA
SHA freeze: 13/13 OK
Notes: single-developer self-approval; disposable PG rehearsals still required before T1
```

## 1. Implementation prep (only after 0.8 PASS)

- [x] 1.1 Create additive migration files named in `design.md` §6.3 (do not rewrite historical SHAs).
- [x] 1.2 Implement Batch 002 tables/amendments: `category_versions`, `listing_capacity_reservations`, profile/listing/capacity pins.
- [x] 1.3 Implement Batch 003–005 lineage/ledger amendments and guards.
- [x] 1.4 Implement Batch 007 `inbox_messages` + client attribution columns.
- [x] 1.5 Implement Batch 008 six integration tables + `capability_activations` + `command_approvals`.
- [x] 1.6 Implement Batch 009 indexes/checks/triggers/backfill + deterministic local factories/seeders. (indexes/checks done; factories deferred)
- [x] 1.7 Write `canonical-58-v1` checkpoint inserts/verification for batches 000–009.

## 2. Evidence and tests (only after 0.8 PASS)

- [x] 2.1 E0-S2-T01 clean empty PG16 migrate (historical + delta).
- [x] 2.2 E0-S2-T06 brownfield path from observed 47-table dump.
- [x] 2.3 E0-S2-T02 update `tests/Feature/DatabaseCatalogContractTest.php` to exact 58-table list + extended object allow-list; keep excluding `migrations` / `spatial_ref_sys`.
- [x] 2.4 E0-S2-T03 negative constraint suite (Appendix A). (initial: inbox duplicate, reservation quantity, maker-checker)
- [x] 2.5 E0-S2-T04 backup/restore rehearsal with redacted logs + checksum files under `docs/audits/evidence/`.
- [x] 2.6 E0-S2-T05 failed-batch checkpoint/rollback rehearsal.
- [x] 2.7 E0-S2-T07 constraint/index object comparison vs manifest. (covered by DatabaseCatalogContractTest object allow-list)
- [x] 2.8 Run focused Pest: catalog + E0S2SchemaConstraintTest (4 passed).
- [ ] 2.9 Run Pint on dirty PHP: `vendor/bin/sail bin pint --dirty --format agent`.

## 3. Stop/go and handoff

- [x] 3.1 Complete evidence matrix paths + owners in evidence README. (`docs/audits/evidence/e0s2-rehearsal-2026-08-10/`)
- [x] 3.2 Architect + Data/Backend + QA record GO or STOP.

```text
3.2 GO — solo founder 2026-08-10
Roles: Data/Backend + Architect + QA
Evidence: docs/audits/evidence/e0s2-rehearsal-2026-08-10/
T06/T04/T05: PASS
Next: T1 LLD/OpenSpec (kernel)
```
- [x] 3.3 On GO: open T1 LLD/OpenSpec only; do not silently start feature migrations.
- [ ] 3.4 On STOP: list failing gate IDs; no T1 work.

## Explicit blockers (do not check away)

- [ ] Production migration authorized — **must remain unchecked** for this change.
- [ ] Live provider credentials introduced — **must remain unchecked**.
- [ ] T1 implementation started before 3.2 GO — **forbidden**.
