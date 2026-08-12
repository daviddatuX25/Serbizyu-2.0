# T1 — Application kernel and operations spine

Status: DRAFT LLD/OpenSpec — implementation starts with shared idempotency/audit/outbox extraction  
Plane: `C`, `S`  
Story refs: `E0-S1`, `E0-S3`, `E0-S4`, `E6-S2`, `E6-S4`, `E6-S6`  
Train: `T1`  
Change ID: `t1-application-kernel-spine`  
Depends on: E0-S2 GO (`e0-s2-canonical-schema-migration-baseline`)

## Why

Domain modules already hand-roll transactional idempotency, audit, and outbox (see `ListingRepository`). Before more modules multiply that pattern, T1 extracts one Shared kernel so every command gets the same conflict, replay, and envelope behavior.

## What changes

1. Typed **ActorContext** (human / service principal / system / optional acting-for).
2. Shared **IdempotencyGuard** — same scope+key+hash replays; hash mismatch rejects; concurrent lock.
3. Shared **AuditRecorder** + **OutboxWriter** written in the same DB transaction as the mutation.
4. Shared **InboxConsumer** primitives — duplicate ignore, gap park, unsupported dead-letter.
5. Stable **ErrorEnvelope** codes for conflict / idempotency / authorization.
6. Pest proofs for duplicate replay, payload conflict, and transactional outbox presence.

## Non-goals

- No T1A onboarding expansion beyond what already exists.
- No T2 catalog feature work.
- No live queue worker productization beyond contracts (QUEUE_CONNECTION may stay sync in local).
- No capability-activation product UI; schema already exists from E0-S2.
- No production activation.

## Authority

- `PROGRAM-IMPLEMENTATION-PLAN.md` §T1
- `ARCHITECTURE-SPINE.md` AD-3/AD-25 module ports; command/idempotency/outbox decisions
- Existing Shared envelopes: `CommandEnvelope`, `ErrorEnvelope`, `DomainEventEnvelope`
- Observed implementation pattern in `ListingRepository::submitForReview`

## Success

Modules call Shared kernel helpers inside `DB::transaction`; they do not invent a second idempotency table protocol.
