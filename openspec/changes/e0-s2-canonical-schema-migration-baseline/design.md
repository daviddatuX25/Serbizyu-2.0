# Design — E0-S2 Canonical schema migration baseline

Change ID: `e0-s2-canonical-schema-migration-baseline`  
Story: `E0-S2` / Train: `T0`  
Packet contract: PROGRAM §6 (15 sections) + E0-S2 story pack

This design is the executable LLD for schema baseline work only. Permanent migration code may be written only after the stop/go gate in §14–§15 records PASS.

---

## 1. Intent and authority

### 1.1 Intent

Produce one migration chain that:

- Preserves the observed 47-table PostgreSQL baseline as truth, not a discarded 46-table myth.
- Adds exactly the eleven approved initiative tables and required amendments.
- Proves empty-DB and brownfield paths converge on the same 58-table catalog, constraints, indexes, checksums, and ERD inventory.
- Leaves no unresolved authority question for T0 schema work.

### 1.2 Authority and supersession

- Governing: BMAD rebuilt PRD/UX/domain/schema/ADR/architecture/epics + planning-hardening schema contract.
- Implementing: this OpenSpec.
- Conflict rule: if implementation evidence contradicts a frozen SHA in `proposal.md`, stop and reopen BMAD in dependency order. Do not “fix” inside migration code.
- Deal-Chaining foundation tables already present are schema headroom only; no coordination UX activation.

### 1.3 Locked decisions

| ID | Decision |
| --- | --- |
| D-E0S2-01 | One Laravel migration chain: immutable historical files + additive E0-S2 delta files. No dual trees. |
| D-E0S2-02 | Logical Batch **000–009** is the authority manifest; physical filenames map to those batches (see §6). |
| D-E0S2-03 | Canonical checkpoint series uses `migration_version = 'canonical-58-v1'` and `batch ∈ {000…009}`. Historical per-file checkpoints remain; they are not the 58-table proof series. |
| D-E0S2-04 | Historical `harden_idempotency_responses` row with `batch='008'` is **not** logical Batch 008. Logical 008 is integrations/activation/approvals under `canonical-58-v1`. |
| D-E0S2-05 | Application tables counted for the gate exclude `migrations` and PostGIS `spatial_ref_sys` only. Target count = **58**. |
| D-E0S2-06 | No production migration, live credentials, or T1 domain endpoints from this change. |
| D-E0S2-07 | Destructive changes use expand/contract; Batch 009 may backfill but must not drop recoverable history without restore rehearsal. |

---

## 2. Scope / non-goals

### 2.1 In scope

- Logical Batch 000–009 contents, file names, checksum recording, and checkpoint status machine.
- Clean-build (empty disposable PG16) and observed-baseline (47-table) paths.
- Eleven new tables + existing-table amendments from canonical schema §2.2.
- Constraints, partial/unique indexes, exclusion constraints, and dependency-cycle trigger(s).
- Catalog, negative constraint, rollback, and backup/restore evidence.
- Local/test factory/seeder declarations required for Batch 009 determinism (CAPSTONE/SANDBOX only).

### 2.2 Activation posture

| Dimension | E0-S2 default |
| --- | --- |
| Environment | disposable local/CI PostgreSQL 16 only |
| Cohort / geography | none |
| Owner / category / mechanism / shape / lane | schema only; no product activation |
| Provider / client | schema tables only; adapters disabled |
| Capability activations rows | may exist as fixture/schema proof; no live irreversible effects |

### 2.3 Non-goals

Listed in `proposal.md`. Explicitly out: T1 kernel, `/api/v1`, Xendit sandbox activation, SMS, pilot metrics, production restore as authorization.

---

## 3. Actors and authorization matrix

| Actor | Schema role | Allowed | Denied |
| --- | --- | --- | --- |
| Data/Backend lead | migration author + rehearsal operator | run disposable migrate/rollback/restore; write evidence under `docs/audits/evidence/` | production migrate; commit secrets |
| Architect | readiness reviewer | approve/reject packet and catalog proof | bypass stop/go |
| QA lead | evidence reviewer | approve negative/restore suites | mark production ready |
| CI service principal | automated runner | migrate disposable DB; run Pest catalog/negative tests | hold production credentials |
| Human product users | none in E0-S2 | — | any schema mutation path |
| Integration client | none in E0-S2 | — | credential issuance beyond schema shape tests |
| System job | none beyond migrate CLI | — | financial posting |

Field visibility for operator runbooks: batch id, status, checksum, failed batch, restore match/fail. No plaintext secrets in logs.

Step-up / maker-checker: not required for disposable rehearsals; required before any future production migration entry (separate gate, not this story).

---

## 4. Commands and queries

E0-S2 has no product command bus. Operator commands only:

| Command | Input | Idempotency | Output / errors |
| --- | --- | --- | --- |
| `migrate:fresh` / `migrate` on disposable DB | env DSN | Laravel migration table + `canonical-58-v1` checkpoints | success; or failed batch id |
| `migrate:rollback` / batch down() | target batch | down() must reverse only that batch’s objects | checkpoint not marked completed |
| `pg_dump -Fc` | disposable DB | n/a | redacted evidence path |
| `pg_restore` into empty disposable DB | dump + target DSN | n/a | catalog+checksum match or FAIL |
| Catalog assertion query | SQL against `pg_tables` / constraints / indexes | n/a | exact 58 names + required objects |

Stable error classes for operator evidence: `BATCH_FAILED`, `CHECKSUM_MISMATCH`, `CATALOG_DRIFT`, `CONSTRAINT_UNEXPECTEDLY_ACCEPTED`, `RESTORE_MISMATCH`.

No HTTP product API is introduced.

---

## 5. State / version model

### 5.1 Checkpoint state

`migration_checkpoints` rows for `migration_version='canonical-58-v1'`:

| Status | Meaning |
| --- | --- |
| `started` | batch began; not durable success |
| `completed` | batch objects present; checksum recorded |
| `failed` | batch aborted; no later canonical batch may be marked completed |

Rules:

- A failed batch never advances its checkpoint to `completed`.
- Later logical batches require prior `000…N-1` completed under `canonical-58-v1`.
- Rerun allowed only when the migration declares itself idempotent for missing objects (IF NOT EXISTS / guarded expands).

### 5.2 Aggregate version fields (schema contract)

- Mutable aggregates: optimistic `row_version`.
- Immutable business/contract/payload/event versions: explicit semantic columns (`business_version`, `content_schema_version`, event/payload contract versions). Never alias to `row_version`.
- Batch 009 backfill: where legacy columns named `version` mean optimistic concurrency, rename/expand to `row_version` without collapsing business versions.

### 5.3 Domain states

Enum/check sources remain `domain-state-contracts-rebuilt.md`. Batch 009 installs CHECK constraints for statuses named in canonical schema; application transition guards remain later trains’ responsibility (Batch 009 is not a substitute for them).

---

## 6. Persistence / ERD delta

### 6.1 Target inventory (58)

Authority list from `07-schema-implementation-and-erd-contract.md` §2. ERD SVG already contains all 58 names.

**Observed present (47):**  
`administrative_holds`, `audit_events`, `auth_otps`, `capability_profiles`, `categories`, `cohort_classifications`, `consent_grants`, `conversations`, `deal_chains`, `deal_dependencies`, `deal_invitations`, `deal_needs`, `dispute_events`, `disputes`, `evidence_files`, `financial_accounts`, `financial_adjustments`, `financial_entries`, `financial_transactions`, `idempotency_keys`, `identity_verifications`, `listing_capacity`, `listing_versions`, `listings`, `messages`, `migration_checkpoints`, `notification_deliveries`, `notifications`, `order_parties`, `order_terms_snapshots`, `orders`, `outbox_messages`, `payment_events`, `payment_obligations`, `policy_versions`, `provider_events`, `quotes`, `requests`, `retention_holds`, `reviews`, `role_assignments`, `safety_incidents`, `support_cases`, `user_profiles`, `users`, `work_events`, `work_instances`

**Must add (11):**  
`category_versions`, `listing_capacity_reservations`, `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, `integration_sync_cursors`, `inbox_messages`, `capability_activations`, `command_approvals`

### 6.2 Logical Batch 000–009 manifest

| Batch | Contents | Gate |
| --- | --- | --- |
| 000 | Extensions/conventions; `migration_checkpoints`; PostGIS if required | Disposable catalog |
| 001 | Identity + `auth_otps` + profiles/roles/evidence/consent | Identity/OTP contract |
| 002 | Categories/profiles/policies/listings/versions/capacity + **`category_versions`** + **`listing_capacity_reservations`** + version pin amendments | Taxonomy/capacity |
| 003 | Deal-Chain foundation + same-chain keys + dependency cycle trigger + Request/Quote/Order lineage pairs | Deal coordination |
| 004 | Orders/parties/terms/Work + same-Order and child-Order lineage + one-active-child-per-Need | Order/Work |
| 005 | Payment/ledger/provider/adjustments + currency-balance guards | Ledger/lane |
| 006 | Trust/support/comms/reviews | Trust/support |
| 007 | Cohorts/audit/outbox/**inbox**/idempotency/retention + client-attribution columns | Integrity/ordering |
| 008 | Six integration tables + **`capability_activations`** + **`command_approvals`** + cross FKs | Integration/activation |
| 009 | Backfill/cutover, named/partial indexes, checks/triggers, factories, forward/rollback/restore rehearsal | Full disposable rehearsal |

### 6.3 Physical file map

#### Historical files (immutable; already in repo)

| File | SHA-256 | Contributes to logical |
| --- | --- | --- |
| `2026_08_01_000000_batch_000_foundation.php` | `aa4c22eac58dc7d60ab85454d5a04bfa0e7bb79f142d840a20356c05163d62fc` | 000 |
| `2026_08_01_000100_batch_001_identity_authorization.php` | `bb0efe3141b947961cf47d8c631390c4309fe87bce58729718d532bb62a5bc53` | 001 |
| `2026_08_03_000200_create_auth_otps.php` | `1b4746b66f0cee840599d6e1e57df749c0f2f0f4dcf953f3d302c82be1f6f889` | 001 |
| `2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php` | `d5444b27d7140804dadb4f3d24c4b8fa4ed5728606b2fff91c71504ec1c19551` | 002 (partial) |
| `2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php` | `ad305325643a740df14da2423a88dfc8c906475f1c734c22050885420766ba41` | 003 (partial) |
| `2026_08_01_003000_batch_003_orders_and_work.php` | `60b988ab75e89f29a295d8efbbc65ad7025d890400a6b818ba3961e37739b650` | 004 (partial) |
| `2026_08_01_004000_batch_004_payment_and_accounting.php` | `4d8d4881efc19c2d9ce75ce3de7fa3637df850e86fd2b2807c356688196a9888` | 005 (partial) |
| `2026_08_01_005000_batch_005_trust_support_communications.php` | `a549a2de72028f5eccd1161fc20c96dc530fc22b2a528e6ae797866af0a9e094` | 006 |
| `2026_08_01_006000_batch_006_integrity_measurement.php` | `f4af7cf3f5b776e357d3c8b8616b9275c629977dbae69fb18300a03c4d49c009` | 007 (partial) |
| `2026_08_01_007000_batch_007_integrity_indexes_checks_and_guards.php` | `474c71c0307bb6f3291a73e295c32f063621a1893200b7d52a8bb0d60270b750` | 007/009 partial |
| `2026_08_02_000100_harden_idempotency_responses.php` | `deffebcb8c5a19ec937e55a016ee32fb1c9ee3f76bbf1c60899b5dffc48ba329` | 007 amendment (historical checkpoint label `008` ignored for canonical-58) |

#### Additive E0-S2 files (authorized only after stop/go PASS)

| File | Logical batch | Purpose |
| --- | --- | --- |
| `2026_08_10_100000_e0s2_canonical58_checkpoint_bootstrap.php` | 000–001 registrar | Insert/verify `canonical-58-v1` checkpoints for already-satisfied 000/001; add any missing foundation extensions (`btree_gist` if required by activations) |
| `2026_08_10_100200_e0s2_batch_002_product_versions_and_reservations.php` | 002 | Create `category_versions`, `listing_capacity_reservations`; amend `capability_profiles`, `listing_versions`, `listing_capacity` |
| `2026_08_10_100300_e0s2_batch_003_deal_lineage_amendments.php` | 003 | Ensure Deal foundation + Request/Quote/Order `(deal_chain_id, deal_need_id)` all-or-none + composite FKs + cycle trigger |
| `2026_08_10_100400_e0s2_batch_004_order_work_lineage_amendments.php` | 004 | Same-Order terms/Work/obligation guards; one-active-child-per-Need partial unique |
| `2026_08_10_100500_e0s2_batch_005_ledger_currency_guards.php` | 005 | Entry/account/tx currency equality; balanced posting check/trigger |
| `2026_08_10_100600_e0s2_batch_006_checkpoint.php` | 006 | Registrar only if 006 already complete |
| `2026_08_10_100700_e0s2_batch_007_inbox_and_client_attribution.php` | 007 | Create `inbox_messages`; nullable `integration_client_id` on audit/idempotency/outbox envelopes |
| `2026_08_10_100800_e0s2_batch_008_integrations_activation_approvals.php` | 008 | Six integration tables + `capability_activations` + `command_approvals` |
| `2026_08_10_100900_e0s2_batch_009_indexes_checks_backfill_rehearsal.php` | 009 | Remaining indexes/checks/triggers; business-version backfill; factories; rehearsal hooks |

Timestamps are provisional; final filenames must remain lexicographically after historical files and must not collide.

### 6.4 Eleven-table contracts (summary)

Column/FK/check/index/retention detail is normative in `canonical-schema-rebuilt.md` §2.2. Implementation must not weaken:

- `category_versions` — unique `(category_id, business_version)`; published immutability; one current active partial unique.
- `listing_capacity_reservations` — composite capacity/version ownership; positive quantity; unique `(command_scope, idempotency_key)`; held/committed partial uniques.
- Integration set — owner-scoped; secret hash/reference only; unique selectors/mappings; HTTPS webhook endpoint constraints; delivery attempt uniqueness; monotonic sync cursors.
- `inbox_messages` — unique consumer/event and consumer/aggregate/sequence.
- `capability_activations` — dimension fingerprint; deny-absolute evaluation represented by append-only rows + GiST exclusion on effective ranges.
- `command_approvals` — exact fingerprint; initiator≠approver when maker/checker; unique consumption.

### 6.5 Existing-table amendments

As listed in canonical schema “Existing-table amendments”: profile/category business versions; listing pin composite FKs; capacity bucket identity; accepted-order terms membership; one-lane obligations; Deal/Request/Quote lineage; ledger currency balance; nullable client attribution without polymorphic ownership.

### 6.6 Delete / FK behavior

Default `ON DELETE RESTRICT` for ownership and lineage FKs per schema. No cascade that erases financial, evidence, or audit history.

### 6.7 Paths

```text
Empty disposable DB
  -> historical migrations (47 tables)
  -> E0-S2 delta files
  -> canonical-58-v1 checkpoints 000-009 completed
  -> catalog == 58

Observed 47-table baseline dump restored
  -> mark historical Laravel migrations applied as needed
  -> E0-S2 delta files only
  -> same catalog == 58
```

Both paths must produce identical sorted table lists and required constraint/index object sets.

---

## 7. Transaction and lock boundary

| Operation | Boundary |
| --- | --- |
| Single logical batch `up()` | One DB transaction where PostgreSQL/Laravel allow; DDL that cannot transactionalize must still checkpoint only after verification queries pass |
| Reservation / approval / ledger negative tests | Single statement or explicit transaction proving rejection |
| Dependency cycle trigger | Command transaction locks Need rows; trigger rejects cycle |
| Checkpoint write | Same success path as batch completion; failure path writes `failed` or leaves incomplete and never marks `completed` |
| Backup | After final checkpoint `009/completed`; dump is evidence, not authority |

Lock order for multi-table amends: parent ownership rows before children; never take application locks during migrate beyond advisory locks documented for OTP/activation tests.

All-or-nothing: if any object in a batch fails, batch is failed; no later canonical batch completes.

---

## 8. Event / consumer contract

Schema only in E0-S2:

- `outbox_messages` remains delivery source.
- `inbox_messages` adds ordered consumer uniqueness and gap/dead-letter columns.
- No new event payload versions are activated for product consumers in this story.
- Fixture events used in negative/idempotency tests are `CAPSTONE` / `SANDBOX` only.

Gap/unsupported-version recovery tooling is T1; E0-S2 only proves columns/constraints exist.

---

## 9. Async / operations

| Process | E0-S2 expectation |
| --- | --- |
| Queue workers | not required for schema gate |
| Scheduler | not required |
| Alerts | CI fails on catalog drift |
| Kill switches | N/A beyond refusing production migrate |
| Rehearsal jobs | documented shell/Sail commands in tasks/evidence |

Evidence class labels required on all rehearsal artifacts: `CAPSTONE` or `TEAM_TRAINING` (never `GENUINE_PILOT`).

---

## 10. External adapter contract

No live adapters. Schema must accommodate:

- Provider events table already present.
- Integration credential **hash/reference** columns only.
- Webhook subscription secret **reference** only.
- Xendit remains future first sandbox adapter under a later train LLD; E0-S2 does not enable egress.

Contract tests: insert shapes that violate uniqueness/HTTPS/owner scope must fail at DB.

---

## 11. Privacy / security

- DB credentials via environment only; never in migrations, fixtures, dumps committed to git, or logs.
- Evidence dumps stored under `docs/audits/evidence/` must be redacted or local-only; do not commit dumps containing secrets. Prefer redacted logs + checksum files in git.
- `evidence_files` + `retention_holds` constraints remain; deleted-held evidence negative test required.
- Cross-owner lookup negative tests for integration mappings and reservations.
- No plaintext OTP/integration secrets in schema or factories.
- SSRF: webhook endpoint CHECK rejects non-HTTPS (except explicit local disposable allow-list documented in Batch 008).

---

## 12. UX contract

No customer UI in E0-S2. Operator/support-facing contract only, aligned to `UX-020`–`UX-031` recovery language:

| Situation | Visible authority | Primary action | Copy rule |
| --- | --- | --- | --- |
| Batch failed | failed batch id + checksum | restore pre-batch snapshot; do not continue | no “partially upgraded product” claim |
| Catalog drift | expected vs actual table list | block CI/promotion | exact counts |
| Restore mismatch | schema version + checksum | reject environment | no silent continue |
| Low-data / a11y | N/A product UI | — | runbooks must be plain text readable |

Sandbox language: every evidence README states disposable-only.

---

## 13. Verification matrix

| ID | Proof | Required result |
| --- | --- | --- |
| E0-S2-T01 | Clean empty PG16 migrate historical+delta | 58 tables; checkpoints 000–009 completed |
| E0-S2-T02 | Catalog vs ERD/inventory sorted compare | exact match; update `DatabaseCatalogContractTest` to 58 |
| E0-S2-T03 | Negative constraint suite | invalid FK, duplicate idempotency/provider/inbox, invalid status, negative amount/capacity, oversell/double reservation, cross-owner, unbalanced ledger, invalid approval/version/lineage, dependency cycle — all rejected |
| E0-S2-T04 | `pg_dump -Fc` + `pg_restore` | migration checksums + catalog match |
| E0-S2-T05 | Fail batch mid-way in disposable DB | checkpoint identifies failed batch; no later canonical batch completed; rollback restores pre-batch snapshot |
| E0-S2-T06 | Brownfield path from 47-table dump | same final catalog as T01 |
| E0-S2-T07 | Index/constraint object allow-list | required names present (extends current 6-object sample) |

Prior 2026-08-02 restore evidence proved **46**-table era and is historical only; it does not satisfy E0-S2.

---

## 14. Activation and rollback

### 14.1 Activation

- Default: schema work enabled in disposable/CI only after this packet’s readiness PASS.
- Production/customer activation: **denied** by this packet.
- Capability/finance/integration product defaults remain disabled pending later train LLDs.

### 14.2 Rollback

- Disposable: restore pre-batch snapshot; mark failed checkpoint; delete or leave non-completed canonical rows per runbook.
- `down()` for each additive file must drop only that file’s objects and remove its `canonical-58-v1` batch row.
- No production rollback authorization is granted because no production migrate is authorized.

### 14.3 Data preservation

- Expand/contract preserves existing 47-table data.
- Backfills are additive and reversible via restore, not destructive in-place without rehearsal proof.

---

## 15. Implementation evidence and stop/go

### 15.1 Evidence owners

| Evidence | Owner | Reviewer |
| --- | --- | --- |
| Packet completeness (this change) | Data/Backend lead | Architect |
| T01/T06 migrate logs | Data/Backend lead | QA lead |
| T02 catalog report + updated Pest test | Data/Backend lead | Architect |
| T03 negative suite | Data/Backend lead | QA lead |
| T04 restore log (redacted) | Data/Backend lead | QA lead |
| T05 rollback rehearsal | Data/Backend lead | Architect + QA |
| Stop/go record | Architect | Founder (if any production-entry question arises; otherwise Architect+QA sufficient for disposable PASS) |

### 15.2 Stop/go gate

**GO** only when all are true:

1. This OpenSpec has no unresolved authority question and frozen SHAs still match workspace files (or a recorded BMAD reopen updated them).
2. Empty and brownfield disposable paths both yield the same 58-table catalog.
3. ERD, migration manifest, constraints, indexes, and `canonical-58-v1` checksums agree.
4. E0-S2-T01…T07 pass with saved evidence paths.
5. Data/Backend lead, Architect, and QA lead recorded approvals on the change.

**STOP** (block T1 and feature migrations) if any item fails.

### 15.3 Explicit non-authorization after GO

Even after GO, this packet does **not** authorize: production migrate, live money, SMS, sensitive-ID upload, Deal-Chaining UX, integration API enablement, or pilot launch. Those require their own train LLDs and activation evidence.

---

## Appendix A — Required negative cases (normative list)

1. Invalid FK to missing parent.
2. Duplicate idempotency `(scope, key)`.
3. Duplicate provider event identity where uniqueness is declared.
4. Duplicate inbox `(consumer, source_event_id)` or aggregate sequence.
5. Invalid status not in CHECK.
6. Negative amount or capacity quantity.
7. Oversell / double held reservation on same slot/resource.
8. Cross-owner integration mapping or reservation link.
9. Unbalanced financial transaction entries.
10. Invalid approval fingerprint consumption / initiator=approver when forbidden.
11. Invalid business-version / lineage pair.
12. Deal dependency cycle.

## Appendix B — Catalog assertion SQL (normative shape)

```sql
SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = current_schema()
  AND tablename <> 'migrations'
  AND tablename <> 'spatial_ref_sys'
ORDER BY tablename;
-- expect exactly the 58 canonical names
```
