---
baseline_commit: 5520a0d355ada4106c83d59df6fdd09ed0ab55b1
story_key: t4-0-order-work-readiness-hardening
status: done
---

# T4.0 — Order and Work Readiness Hardening

## Story

As the marketplace runtime, I need Order finalization to own capacity commitment and canonical Work creation in one ordered transaction so that later Work lifecycle features cannot oversell supply, deadlock aggregates, or execute ambiguous legacy shapes.

## Scope

This story closes T4 packet prerequisites 0.3.1–0.3.3 only. It does not implement Work progress, completion, sign-off, revision, A3, A4 behavior, A9 behavior, Quotes, Quick Deal, connected payments, or pilot activation.

## Acceptance Criteria

1. `SubmitOrderProposal` creates a `pending_acceptance` Order and its party/proposal records without creating or mutating capacity reservations, Work, terms snapshots, or Payment Obligations.
2. Proposal succeeds when the listing is currently active and version-current even when requested quantity exceeds current capacity; finalization owns the authoritative capacity decision.
3. `FinalizeOrderAgreement` performs source/listing and capacity acquisition before the Order write lock, then creates the accepted Order, immutable terms, committed capacity reservation when capacity applies, Work, Payment Obligation, audit, outbox, and idempotency result in one database transaction.
4. Any failure during finalization rolls back every effect, including capacity reservation/quantity changes and integrity records.
5. Finalization revalidates Order status/version, listing status/version, provider ownership, quantity, and capacity after locks are acquired.
6. Identical finalization replay returns the stored result without duplicate capacity reservations, Work, terms, obligations, audit events, or outbox messages. A fingerprint mismatch remains a conflict.
7. Work shape is resolved from the immutable capability-profile business version pinned by the accepted listing version. Listing type is not used as the runtime shape selector.
8. New Work records use only canonical shape codes `A1`, `A3`, `A4`, or `A9`, with explicit `shape_contract_version`, `payload_schema_version`, and `row_version`.
9. An audited migration maps only approved legacy records: `local_service` to `A1` and `product_handoff` to `A4`. It does not add runtime aliases.
10. Unmapped or unsupported shape/version combinations return `WORK_CONTRACT_VERSION_UNSUPPORTED`, remain read-only, and cause zero business mutation.
11. Existing T1–T3 module-dependency and architecture tests remain green. OrdersWork uses neutral Shared ports and does not write Listings-owned aggregates directly.
12. The T4 OpenSpec readiness items 0.3.1–0.3.3 are checked only after all focused tests pass.

## Architecture Decisions

### Transaction ownership

`FinalizeOrderAgreement` remains the orchestration boundary. Listings retains exclusive ownership of listing and capacity persistence through `OrderListingSourcePort` and `OrderCapacityPort`. OrdersWork owns Order, Work, and terms. Payment obligation creation must move behind a neutral application port before T4 feature expansion if direct table writes cannot preserve module ownership.

### Fixed acquisition order

```text
listing source/version
    -> capacity bucket/reservation
    -> Order
    -> Work
    -> Payment Obligation
    -> idempotency/audit/outbox integrity
```

A preliminary non-locking Order read may discover identifiers, but all decision-bearing values must be re-read and compared after the ordered locks are held.

### Proposal purity

Proposal data stores immutable intent: requested quantity, amount/currency, and the pinned listing/capability versions. It stores no reservation identifier and performs no resource mutation.

### Capacity finalization seam

Expose one Listings-owned operation that reserves and commits capacity for final Order formation inside the caller's ambient transaction. It must be idempotent by finalization command identity, lock the bucket before mutation, associate the reservation with the Order, and return a committed reservation result. Do not compose public `hold()` then `commit()` as an accidental cross-module protocol.

### Work contract registry

Create an OrdersWork-owned registry interface whose lookup key is the pinned capability profile family/business version. It returns a typed definition containing canonical shape code, shape contract version, payload schema version, and handler. Unknown definitions fail closed with `WORK_CONTRACT_VERSION_UNSUPPORTED`.

No runtime compatibility aliases. Historical strings are handled once by the audited data migration.

## Planned File Changes

### Update

- `app/Modules/OrdersWork/Application/SubmitOrderProposal.php`
- `app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`
- `app/Shared/Contracts/OrderCapacityPort.php`
- `app/Shared/Contracts/OrderListingSourcePort.php`
- `app/Modules/Listings/Application/OrderCapacityAdapter.php`
- `app/Modules/Listings/Application/OrderListingSourceAdapter.php`
- `app/Modules/Listings/Application/CapacityReservationService.php`
- `app/Shared/Application/CapabilityCatalog.php`
- `app/Providers/AppServiceProvider.php`
- `tests/Feature/OrdersWork/T3OrdinaryOrderFormationTest.php`
- `tests/Feature/OrdersWork/T3OrdinaryOrderFormationEdgeTest.php`
- `openspec/changes/t4-work-fulfillment/tasks.md`

### Add through Artisan

- migration adding/pinning Work contract-version fields and migrating approved legacy rows
- OrdersWork Work contract registry and typed definition
- focused Work registry test

## Implementation Tasks

- [ ] Add failing proposal-purity tests, including a capacity-backed listing whose proposal does not change remaining quantity or create a reservation.
- [ ] Remove capacity lookup/hold and reservation IDs from `SubmitOrderProposal` response and stored proposal payload.
- [ ] Add failing finalization tests for capacity commit, oversell-at-finalize, rollback, and replay.
- [ ] Add Listings-owned atomic finalization-capacity port operation and ordered source lock seam.
- [ ] Reorder `FinalizeOrderAgreement` acquisition and revalidation while preserving idempotent replay.
- [ ] Add failing registry tests for canonical resolution and unsupported version parking.
- [ ] Add Work contract registry and resolve shape from the pinned capability profile rather than listing type.
- [ ] Generate and implement the audited legacy-shape migration with explicit reversible behavior.
- [ ] Update seed capability profiles to canonical shape assignments appropriate to the seeded capability; do not infer every service as A1 permanently.
- [ ] Run targeted T3/T4 tests, architecture tests, Pint, and frontend regressions.
- [ ] Mark T4 prerequisites 0.3.1–0.3.3 complete only after verification evidence passes.

### Review Findings

- [x] [Review][Patch] Authorize actors before returning idempotent replay and preserve the fixed lock hierarchy [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:56]
- [x] [Review][Patch] Translate unsupported Work contracts into `WORK_CONTRACT_VERSION_UNSUPPORTED` instead of an uncaught 500 [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:98]
- [x] [Review][Patch] Fail closed when the active primary buyer proposal is missing or malformed [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:140]
- [x] [Review][Patch] Revalidate the immutable listing-version ID and capability-profile pins, not only the version number [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:162]
- [x] [Review][Patch] Acquire capacity before the Order write lock and add a real post-capacity rollback proof [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:118]
- [x] [Review][Patch] Reconcile legacy proposal-time held reservations without consuming capacity twice [`app/Modules/Listings/Application/CapacityReservationService.php`:203]
- [x] [Review][Patch] Reject ambiguous or unsupported capacity bucket selection and non-committed reservation replay [`app/Modules/Listings/Application/CapacityReservationService.php`:230]
- [x] [Review][Patch] Make required Work contract columns unconditional at storage validation and insertion [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:237]
- [x] [Review][Patch] Remove OrdersWork reads of Listings-owned capability profile tables through a pure registry/source projection seam [`app/Modules/OrdersWork/Application/DefaultWorkContractRegistry.php`:27]
- [x] [Review][Patch] Move Payment Obligation creation behind a neutral Shared port owned by PaymentObligations [`app/Modules/OrdersWork/Application/FinalizeOrderAgreement.php`:266]
- [x] [Review][Patch] Persist explicit capability shape across every listing draft/version/submit path; remove listing-type inference [`app/Modules/Listings/Infrastructure/ListingRepository.php`:50]
- [x] [Review][Patch] Serialize governed capability-profile version creation and repair fixture version pins [`app/Modules/Listings/Application/GovernedCatalogService.php`:203]
- [x] [Review][Patch] Make migration rollback discriminate unchanged migrated rows and refuse when audit evidence is unavailable [`database/migrations/2026_09_04_050939_harden_work_contract_versions_for_t4.php`:96]
- [x] [Review][Patch] Replace conditional/copied migration tests with actual schema, migration, rollback, unsupported-finalization, and fingerprint-conflict proofs [`tests/Feature/OrdersWork/T4WorkMigrationBackfillTest.php`:18]
- [x] [Review][Patch] Restore the accidentally removed OAuth port binding and delete decorative Work handler abstractions [`app/Providers/AppServiceProvider.php`:38]
- [x] [Review][Patch] Update T3/T4 readiness specifications only after every focused and architecture check passes [`openspec/changes/t4-work-fulfillment/tasks.md`:9]
## Test Seams

- Public application seam: `SubmitOrderProposal::handle()`.
- Public application seam: `FinalizeOrderAgreement::handle()`.
- Shared module seam: `OrderCapacityPort` finalization operation.
- Registry seam: capability profile/version to canonical Work contract definition.
- Migration seam: pre-migration legacy rows to canonical or explicitly parked rows.
- HTTP regression seam: existing Order proposal/finalization routes.

## Verification Commands

```bash
COMPOSE_FILE=compose.sail.yaml SAIL_APP_PORT=18081 vendor/bin/sail artisan test --compact tests/Feature/OrdersWork
COMPOSE_FILE=compose.sail.yaml SAIL_APP_PORT=18081 vendor/bin/sail artisan test --compact tests/Unit/Architecture tests/Feature/Shared tests/Feature/Listings
COMPOSE_FILE=compose.sail.yaml SAIL_APP_PORT=18081 vendor/bin/sail bin pint --dirty --format agent
npm run typecheck
npm test -- --run
```

## Rollback

Application changes and the migration deploy together. Rollback must restore only rows migrated by the approved legacy mapping and must not convert canonical rows created after deployment. If safe discrimination is unavailable, the migration is forward-only and its `down()` must refuse destructive inference rather than guess historical values.

## Risks

- Nested Laravel transactions do not create independent atomic boundaries; adapter operations must participate in the outer transaction.
- Lock ordering is a concurrency contract and cannot be proven only by source assertions. Behavioral concurrency coverage is required where deterministic PostgreSQL testing permits it.
- Existing capability seed data currently uses the generic `request_based` work shape. Canonical assignment must be explicit per capability profile before the registry becomes authoritative.
- Direct Payment Obligation table writes from OrdersWork may violate strict module ownership; keep this visible as a boundary decision rather than hiding it in T4 implementation.

## Dev Agent Record

### Current Findings

- Existing T3 baseline: 12 tests pass with 46 assertions.
- `SubmitOrderProposal` currently calls capacity `hold()` and stores `capacity_reservation_id`.
- `FinalizeOrderAgreement` currently locks `orders` before source/capacity and maps product/service directly to legacy Work shape strings.
- `CapabilityCatalog` currently seeds `work_shape = request_based`, which is not a canonical T4 runtime shape.

### Status

Ready for development. Implement vertically in red-green cycles; do not begin T4 A1 lifecycle commands until this story is verified.
