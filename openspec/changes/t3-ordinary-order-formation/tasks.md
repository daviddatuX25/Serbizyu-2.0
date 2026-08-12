# Tasks — T3 Ordinary Order formation (thin)

## 0. Packet

- [x] 0.1 Proposal / design / spec authored
- [x] 0.2 Depends on T2 GO
- [x] 0.3 Solo packet PASS (2026-08-10)

## 1. Shared ports + Listings adapters

- [x] 1.1 `OrderListingSourcePort` + Listings adapter
- [x] 1.2 `OrderCapacityPort` + Listings adapter
- [x] 1.3 Bind in `AppServiceProvider`

## 2. OrdersWork application

- [x] 2.1 `OrderError` + `SubmitOrderProposal`
- [x] 2.2 `FinalizeOrderAgreement` (terms, work, obligation, capacity commit)
- [x] 2.3 Kernel idempotency/audit/outbox on both commands

## 3. Verification

- [x] 3.1 Pest T3-01…T3-05 (+ edges)
- [x] 3.2 Pint dirty PHP
- [x] 3.3 Solo GO — then only T4 packet next
- [x] 3.4 Edge suite: propose replay/fingerprint, hold→commit, provider finalize, orphan rollback
