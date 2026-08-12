# Tasks — T2 Governed catalog, listings, capacity, and discovery

Rule: no permanent T2 feature expansion marked complete until §0 packet readiness PASS.

## 0. Packet readiness

- [x] 0.1 Proposal / design / capability spec authored
- [x] 0.2 Depends on T1A GO
- [x] 0.3 Deferred Orders (T3), Quotes (T5), Reviews (T6) recorded
- [x] 0.4 Solo Data/Backend + Architect + QA packet readiness PASS (2026-08-10)

## 1. Governed catalog services

- [x] 1.1 `GovernedCatalogService` — ensure/resolve published category version + active capability profile
- [x] 1.2 Harden `CapabilityCatalog::ensure` to also publish `category_versions` for seed/CAPSTONE
- [x] 1.3 Pin category/capability business versions on `ListingRepository::insertVersion`
- [x] 1.4 Reject listing draft/submit when no published category version exists for code

## 2. Capacity reservations

- [x] 2.1 `CapacityReservationService` — ensure bucket, hold, commit, release, expire
- [x] 2.2 Oversell rejection under locked remaining quantity
- [x] 2.3 Idempotent hold via reservation `(command_scope, idempotency_key)`

## 3. Discovery

- [x] 3.1 Extend public reader with Tagudin area + category + cursor/limit discover query
- [x] 3.2 Keep public projection privacy (no owner_user_id / reservation internals)
- [x] 3.3 Align Tagudin browse seeder listing_versions pins when columns present

## 4. Verification

- [x] 4.1 Pest: T2-01/02 category publish + listing pins
- [x] 4.1b Edge expansion: capacity release/commit/expire/oversell codes + discovery geography/cursor/privacy (`T2CapacityReservationEdgeTest`, `T2CatalogDiscoveryEdgeTest`)
- [x] 4.2 Pest: T2-03/04 capacity oversell + idempotent hold
- [x] 4.3 Pest: T2-05 discovery filter
- [x] 4.4 Regression: Listings MyListings / seeder / FirstSlice subset
- [x] 4.5 Pint dirty PHP

## 5. Stop/go

- [x] 5.1 Solo GO after Pest green (2026-08-10) — T2GovernedCatalogTest 5 passed; MyListings/kernel/T1A regressions green
- [ ] 5.2 Open T3 LLD only after T2 GO — do not silently start Order work

## Explicit blockers (remain unchecked)

- [ ] Production migrate / pilot activation
- [ ] T3 Order formation started before T2 GO
- [ ] Free-world GPS nearby product
- [ ] Admin category hi-fi UI required for this slice
