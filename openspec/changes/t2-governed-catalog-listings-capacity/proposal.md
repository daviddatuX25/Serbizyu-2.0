# T2 — Governed catalog, listings, capacity, and discovery

Status: ACTIVE LLD/OpenSpec  
Plane: `C`, `T`, `S`  
Story refs: `E2-S1`, `E2-S2`, `E2-S5`, `E2-S6`  
Train: `T2`  
Change ID: `t2-governed-catalog-listings-capacity`  
Depends on: T1A GO (`t1a-identity-onboarding-delegation`)

## Why

Schema headroom for `category_versions`, listing version pins, and `listing_capacity_reservations` landed in E0-S2, but application code still auto-creates categories/profiles and writes listing versions without pinning published business versions. Capacity reservations and Tagudin-scoped discovery filters are not first-class services. T3 Order formation cannot safely consume stale or unpinned supply.

## What changes

1. Governed category + capability resolution: publish/ensure a **published** `category_versions` row and an **active** capability-profile business version before listing drafts pin them.
2. Listing version writes pin `category_id` + `category_business_version` and capability family/business version (FK-enforced).
3. Capacity bucket + reservation commands: hold / commit / release / expire with oversell rejection and command idempotency.
4. Tagudin-scoped public discovery query: filter/sort/cursor pagination over approved active listings; public projections stay privacy-safe.
5. Seed/CAPSTONE paths use the same governed ensure helpers (no parallel fake catalog protocol).
6. Pest proofs for pin enforcement, unpublished category deny, oversell reject, reservation idempotency, and discovery filters.

## Non-goals

- No T3 Order formation / `FinalizeOrderAgreement`.
- No E2-S3/S4 Requests & Quotes (T5).
- No admin category CRUD UI polish (service + Pest first; hi-fi admin later).
- No free-world geo/nearby ranking beyond Tagudin/barangay-scoped geography JSON.
- No live money, SMS, or production migrate authorization.
- No browse PLP visual rewrite — reuse existing hi-fi Browse/Detail.

## UI stance

Existing hi-fi Browse / My Listings / Detail stay. T2 prefers **backend contracts**; discovery query may add optional query params later without redesigning the kit.

## Authority (frozen SHAs at packet authoring)

| Artifact | SHA-256 |
| --- | --- |
| `prd-rebuilt.md` | `31deb49d783a3e1dcc1dad32fd1b24b9ca929283ef45dcc20e61feb5fa2cb4a9` |
| `PROGRAM-IMPLEMENTATION-PLAN.md` | `50f7aca1d63e0373f0d6e3db6f96fdc247cf0d9105a87a78e33e00d74c6ed092` |
| `FOUNDER-DECISION-BRIEF.md` | `e7d6bb2c71f96dfc566c03ba036d1776a57d748017add13d4070c69c29851bab` |

## Deferred (explicit)

| Capability | Train |
| --- | --- |
| Ordinary Order finalization | T3 |
| Requests / Quotes / Quick Deal | T5 |
| Customer Reviews | T6 |
| Deal-Chaining UX | T8 |

## Success

Listings cannot publish meaning against unpublished category versions. Capacity holds cannot oversell under concurrent tests. Public discovery returns only Tagudin-scoped approved active supply without private owner/moderation fields.
