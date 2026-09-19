# Reality-check review — Work architecture spine

Date: 2026-09-14

## Verdict

**Incorrect until the findings below are corrected.** The spine is directionally consistent with the parent ownership model and correctly records that the current PHP is incomplete, but several committed seams are not reconciled with current schema/migration behavior, the inherited dependency-gate contract, or the shipped fixture/runtime evidence.

## Findings

### High — Define the Work-shape storage cutover before claiming canonical payload lineage

**Evidence:** `ARCHITECTURE-SPINE.md` WAD-4 and the Deep Module Boundary use `shape_code`, `normalized_payload`, and the normalized envelope as the accepted authority (`ARCHITECTURE-SPINE.md:162-202, 334-347`). The inherited platform AD-7 likewise requires a separate shape-code/payload pair. Current Laravel migrations and the T4 tests still persist `work_shape` and `structure` (`database/migrations/2026_08_01_003000_batch_003_orders_and_work.php:110-138`, `tests/Feature/OrdersWork/T4WorkMigrationBackfillTest.php:80-112`), while `FinalizeOrderAgreement` writes `structure = null` (`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php:318-339`). The spine’s current-delta paragraph acknowledges the null structure, but it never states whether these existing columns are the canonical names or how they map to the new envelope.

**Smallest correction:** Add an explicit schema cutover sentence to WAD-4/Data Model Consequences: “Until the migration, `work_shape` is the legacy storage name for `shape_code` and `structure` is the legacy payload; the cutover renames/maps them into `shape_code`/`normalized_payload` exactly once, with a retained reader for accepted rows and no duplicate authority columns.” If the existing names are retained, replace every target occurrence of `shape_code`/`normalized_payload` with that decision and document the mapping in the canonical schema.

### High — Park unsupported legacy Work contracts instead of leaving them executable

**Evidence:** WAD-8 requires unknown shape-contract or payload-schema versions to park the Work for explicit compatibility handling (`ARCHITECTURE-SPINE.md:246-250`). The actual T4 migration deliberately leaves an unsupported `request_based` row unchanged (`database/migrations/2026_09_04_050939_harden_work_contract_versions_for_t4.php:76-101`), and its test only checks that the row remains `request_based` with its original row version (`tests/Feature/OrdersWork/T4WorkMigrationBackfillTest.php:117-126`); the fixture inserts it as `not_started` (`tests/Feature/OrdersWork/T4WorkMigrationBackfillTest.php:80-99`). No `work_contract_version_unsupported`/parked state, compatibility record, or command guard is created. This permits a row with no retained contract to look like an ordinary runnable Work.

**Smallest correction:** Change the migration contract and test to set an explicit parked/unsupported state plus a compatibility reason/event for every unmapped legacy shape or version, and require all Work commands/projections to reject that state until a retained reader is registered. Alternatively, if unmapped rows are intentionally outside the Work aggregate, state the quarantine table/ownership and remove them from `work_instances`; do not leave `not_started` as the observable state.

### High — Carry the inherited Work-step dependency-gate contract into the Work/DealCoordination boundary

**Evidence:** The inherited frontend spine AD-22 makes `work_step_dependency_gates` the exclusive cross-node synchronization mechanism and requires immutable graph-version validation and asynchronous unblocking (`frontend-view-projection-architecture-2026-09-08/ARCHITECTURE-SPINE.md:233-237`). The Work spine WAD-9 only says that gates “belong to `DealCoordination`” and reference stable Work/fact keys (`ARCHITECTURE-SPINE.md:259-267`); its data-model consequences mention generic relational gate references but omit the gate aggregate/table, target step key, graph version, condition/status, and consumer/outbox contract (`ARCHITECTURE-SPINE.md:374-382`). The current repository has no migration for `work_step_dependency_gates`, and the canonical schema has no such table, so an implementer cannot satisfy the inherited decision from this spine.

**Smallest correction:** Add a binding boundary contract naming `work_step_dependency_gates` as DealCoordination-owned, with `(chain/graph version, predecessor Order/Work/fact key, target Work/step key, condition code, status, evidence/reference, causation/outbox identity)` and asynchronous `waiting → unblocked` semantics; explicitly defer its migration if it is not in this Work train. Do not reduce AD-22 to an untyped Work/fact reference.

### Medium — Reconcile the A9 document-scanning classification with the shipped Laravel fixture

**Evidence:** The companion coverage matrix classifies “Document scanning” as A9 Digital Delivery (`WORK-SCENARIO-COVERAGE.md:49-53`). The current Tagudin catalog fixture for the exact “Document scan soft-copy” listing stores `work_shape: A1` (`app/Modules/Listings/Infrastructure/Demo/TagudinBrowseCatalog.php:112-122`), and the current listing lifecycle accepts that value as a normal service shape. The architecture therefore presents a different shape for an existing scenario without identifying a data/fixture migration; the two sources can drive different formation behavior.

**Smallest correction:** Either change the coverage row to A1 for the current fixture, or state the required fixture/listing-version migration to A9 (including compatibility handling for already-published A1 versions) before treating A9 as the canonical document-scanning classification. Do not leave the discrepancy implicit.

### Medium — Resolve the inherited Laravel baseline before Work implementation uses it

**Evidence:** The platform spine’s Stack says Laravel Framework 12.65.0 (`architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md:303-318`), while the inherited frontend spine says 12.68.0 and Inertia Laravel 3.2.1 (`frontend-view-projection-architecture-2026-09-08/ARCHITECTURE-SPINE.md:245-257`). The checked-in lockfile resolves Laravel 12.68.0 and Inertia Laravel v3.2.1 (`composer.lock:1062-1064,1134-1136`). The Work spine inherits both parent spines but does not resolve the conflicting runtime baseline, making “current Laravel/Inertia” ambiguous for its formation and projection contracts.

**Smallest correction:** Add a Work-stack note that binds implementation to the lockfile (Laravel 12.68.0, Inertia Laravel 3.2.1) and update or supersede the platform 12.65.0 entry. Keep the version declaration in one authoritative runtime contract.
