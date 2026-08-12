# T3 — Ordinary Order formation (thin Direct Booking slice)

Status: ACTIVE LLD/OpenSpec  
Plane: `C`, `T`, `S`  
Story refs: `E3-S1`, `E3-S8`  
Train: `T3`  
Change ID: `t3-ordinary-order-formation`  
Depends on: T2 GO (`t2-governed-catalog-listings-capacity`)

## Why

T2 made supply trustworthy. Every later mechanism (Quotes, Quick Deal, Deal-Need, Work, payment) must form **one** ordinary Order with immutable terms — not parallel order systems.

## Thin slice (this change)

1. `SubmitOrderProposal` from an **active approved listing** → `pending_acceptance` Order + buyer/provider parties (+ optional capacity hold).
2. `FinalizeOrderAgreement` → `accepted` + terms snapshot + Work stub + External Cash Obligation + capacity commit; uses T1 idempotency/audit/outbox.
3. Shared ports so OrdersWork never imports Listings: listing source reader + capacity port.
4. Pest: stale listing reject, idempotent propose/finalize, atomic failure leaves no orphan Order children.

## Non-goals

- Quotes/bidding/Quick Deal/Deal-Chaining (T5/T8)
- Full Work engine shapes (T4)
- Payment provider / live money (T6/T7)
- Order hi-fi UI (reuse props later; service-first)
- Cancel/close/dispute flows beyond reject of invalid finalize

## Success

Stale listing/capacity cannot finalize. Duplicate keys replay. Failure rolls back Order+terms+Work+obligation+reservation commit together.
