# Design — T3 Ordinary Order formation (thin)

Change ID: `t3-ordinary-order-formation`

## Scope

**In:** listing-sourced propose/finalize, Shared ports, Pest.  
**Out:** quotes, Quick Deal, Deal-Chaining, Work shape engine, payment adapters, UI.

## Commands

| Command | Idempotency | Result |
|---|---|---|
| `SubmitOrderProposal` | `order.propose:{buyer}:{listing}` + key | `pending_acceptance` order + parties; optional capacity hold |
| `FinalizeOrderAgreement` | `order.finalize:{order}` + key | `accepted` + terms v1 + work `not_started` + obligation `created`/`external_cash` + capacity commit |

Standing acceptance: active approved listing counts as provider standing acceptance — **buyer** may finalize their own pending proposal.

## Ports (Shared)

- `OrderListingSourcePort::activeApproved(listingId)` → owner, version id/number, pins, price hints, geography
- `OrderCapacityPort::hold/commit/release` → wraps Listings capacity service

## Transaction

One `DB::transaction`: lock order → re-read listing source → IdempotencyGuard → mutate → audit → outbox → succeed. Child failure aborts all.

## Verification

T3-01 propose pending; T3-02 finalize accepted children; T3-03 stale listing version deny; T3-04 idempotent finalize replay; T3-05 capacity oversell blocks propose when required.

Edge proofs (2026-08-10): propose replay + fingerprint reuse; propose stale version; hold→commit capacity path; provider finalize; finalize rolls back children when capacity commit fails.

Throwaway HTTP (2026-08-10): auth-gated `GET /listings/{id}/book` → plain `Orders/Show` finalize. Hi-fi Browse/Detail/Onboarding stay; Book CTA only gains a real action.
