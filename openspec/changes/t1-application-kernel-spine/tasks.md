# Tasks — T1 Application kernel spine

## 0. Packet

- [x] 0.1 Proposal / design / capability spec authored
- [x] 0.2 Depends on E0-S2 GO

## 1. Shared kernel

- [x] 1.1 `ActorContext` value object (human/system/service/acting-for)
- [x] 1.2 `IdempotencyGuard` begin/replay/succeed/fail with row lock
- [x] 1.3 `AuditRecorder` + `OutboxWriter`
- [x] 1.4 `InboxConsumer` record/claim helpers (duplicate + gap)
- [x] 1.5 Kernel exception → `ErrorEnvelope` mapping
- [x] 1.6 Bind services in `AppServiceProvider` if needed (prefer concrete final classes) — not required; Laravel auto-resolves concrete finals

## 2. Adopt in Listings

- [x] 2.1 Refactor `ListingRepository` submit path to use Shared kernel helpers
- [x] 2.2 Keep behavior identical for FirstSlice / listing submit tests

## 3. Verification

- [x] 3.1 Pest: T1-K01 replay, T1-K02 hash conflict, T1-K03 audit+outbox
- [x] 3.2 Pest: inbox duplicate
- [x] 3.3 Run focused listing/submit + Shared kernel tests (15 passed: kernel + FirstSlice + MyListings)
- [x] 3.4 Pint dirty PHP

## 4. Stop/go

- [x] 4.1 Solo Data/Backend + Architect + QA GO for T1 kernel spine (2026-08-10) after Pest green and Listings adoption.
- [x] 4.2 T1A / next train LLD — opened; T1A and T2 packets authored and GO.
