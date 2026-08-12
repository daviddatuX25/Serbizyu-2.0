# Design — T2 Governed catalog, listings, capacity, and discovery

Change ID: `t2-governed-catalog-listings-capacity`

## 1. Intent and authority

Implement PROGRAM §T2 / Epic E2-S1, E2-S2, E2-S5, E2-S6 so supply is trustworthy enough for T3 Orders. BMAD remains authority; no schema reopen beyond existing 58-table catalog.

## 2. Scope / non-goals

**In:** published category versions, capability business-version pins on listing versions, capacity buckets + reservation lifecycle, Tagudin discovery filters/cursor, Pest proofs, seed path alignment.  
**Out:** Orders, Quotes/Requests, admin hi-fi, free-world GPS, Reviews, production activation.

Activation default: governed catalog always-on in local/CI once migrations exist.

## 3. Actors and authorization matrix

| Actor | May | Must not |
| --- | --- | --- |
| Provider/owner | Draft/update/submit listings against published category + active profile | Invent unpublished category meaning |
| Agent (acting-for) | Same listing writes when consent active | Exceed consent; bypass pins |
| Anonymous/buyer | Discover public Tagudin approved listings | See draft/pending, private owner IDs, reservation internals |
| System | Expire holds; seed CAPSTONE catalog | Count fixtures as genuine pilot |

## 4. Commands and queries

| Command | Notes |
| --- | --- |
| `EnsurePublishedCategoryVersion` | Creates/activates category family + published business version 1+ |
| `EnsureActiveCapabilityProfile` | Active profile family + business_version |
| `Create/UpdateListingDraft` / `SubmitListing` | Existing; now pin versions on each listing_versions insert |
| `EnsureCapacityBucket` | quantity/slot bucket for a listing version |
| `HoldCapacity` / `CommitCapacity` / `ReleaseCapacity` / `ExpireCapacity` | Idempotent via `(command_scope, idempotency_key)` |

Queries: `DiscoverPublicListings` (area, category_code, cursor, limit), `PublicListingDetail` (unchanged privacy rules).

Kernel: reservation mutations use `DB::transaction` + `lockForUpdate` on capacity row; optional `IdempotencyGuard` when HTTP later — first slice uses reservation unique key.

## 5. State / version model

- **category_versions.status:** `draft` → `published` → `paused`/`retired`; one published per category (partial unique index).
- **capability_profiles:** family + immutable `business_version`; `row_version` optimistic; one active family (partial unique).
- **listing_versions:** pin category + capability business versions; `row_version` separate from payload version.
- **reservations.status:** `held` → `committed` | `released` | `expired` (one terminal release path).

## 6. Persistence / ERD delta

No new tables. Uses E0-S2:

- `categories`, `category_versions`
- `capability_profiles`
- `listings`, `listing_versions`
- `listing_capacity`, `listing_capacity_reservations`

## 7. Transaction and lock boundary

Hold/commit/release: lock capacity row → recompute active reserved quantity → mutate reservation → update `remaining_quantity` → commit. Concurrent oversell must fail one writer.

## 8. Event / consumer contract

Optional outbox on reservation terminal transitions in a later hardening pass; first slice proves DB invariants + Pest.

## 9. Async / operations

Expire-holds scheduled command may follow; first slice supports explicit `ExpireCapacity` for tests.

## 10. External adapter contract

N/A. Search stays PostgreSQL-backed; no Meilisearch required for Tagudin pilot baseline.

## 11. Privacy / security

Public projections exclude `owner_user_id`, internal review notes, reservation rows, capability policy internals beyond public codes. Geography limited to Tagudin area_code for pilot.

## 12. UX contract

Reuse hi-fi Browse/Detail. Discovery service powers existing browse; optional query params do not invent Activity/payment chrome.

## 13. Verification matrix

| ID | Proof |
| --- | --- |
| T2-01 | Ensure published category version; unpublished category cannot be pinned |
| T2-02 | Listing version insert pins category + capability business versions |
| T2-03 | Capacity hold rejects oversell |
| T2-04 | Duplicate hold idempotency key replays same reservation |
| T2-05 | Discovery filters Tagudin + category; excludes draft/non-approved |
| T2-06 | FirstSlice / MyListings / browse seeder regressions still pass |

## 14. Stop/go

GO when Pest T2-01…T2-06 green and no cross-module import violations. T3 packet opened and GO 2026-08-10; next is T4 only.
