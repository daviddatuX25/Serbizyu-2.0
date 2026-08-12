# Design — T1 Application kernel spine

Change ID: `t1-application-kernel-spine`

## 1. Intent and authority

Extract the transactional command seam already proven in Listings into `App\Shared` so Identity, Orders, and later trains reuse one protocol. BMAD/program remain authority; this OpenSpec implements T1, it does not reopen schema.

## 2. Scope / non-goals

**In:** ActorContext, IdempotencyGuard, AuditRecorder, OutboxWriter, InboxConsumer, Kernel exceptions, Pest proofs, Listings submit path refactored to use the kernel.  
**Out:** T1A/T2 features, Horizon, live SMS, capability UI, production.

Activation default: kernel always-on for writable commands in disposable/local/CI; financial irreversible gates remain fail-closed via existing config.

## 3. Actors and authorization matrix

| Actor kind | Source | May hold idempotency | Notes |
| --- | --- | --- | --- |
| `human` | Laravel `Auth` user id | yes | default product path |
| `service_principal` | integration client (later) | yes | owner-scoped; not implemented as HTTP yet |
| `system` | jobs/scheduler | scoped keys only | no user session |
| `acting_for` | human + consent grant | yes | attribution on audit; consent check is module policy |

Denials use `ErrorEnvelope::authorizationDenied` — non-enumerating.

## 4. Commands and queries

Commands run through:

```text
HTTP/FormRequest
  -> Module application service
    -> DB::transaction
      -> IdempotencyGuard::begin
      -> domain mutation
      -> AuditRecorder::record
      -> OutboxWriter::enqueue
      -> IdempotencyGuard::succeed
```

Queries do not take idempotency keys.

Stable error codes: `AUTHORIZATION_DENIED`, `IDEMPOTENCY_KEY_REUSED`, `VERSION_CONFLICT`, `INVALID_STATE`, plus module codes.

## 5. State / version model

Idempotency status: `in_progress` → `succeeded` | `failed` | `expired`.  
Outbox status: `pending` → `published` | `failed` | `dead_letter`.  
Inbox status: `received` → `processing` → `processed` | `gap` | `unsupported` | `dead_letter`.

Aggregate optimistic concurrency remains module `expected_version` / `row_version`.

## 6. Persistence / ERD delta

No new tables. Uses E0-S2 tables: `idempotency_keys`, `audit_events`, `outbox_messages`, `inbox_messages`.

## 7. Transaction and lock boundary

All begin/mutate/audit/outbox/succeed occur in one `DB::transaction` with `lockForUpdate` on the idempotency row. Side-effect jobs must use `afterCommit` when queued.

## 8. Event / consumer contract

Outbox payload is versioned JSON (`payload_version`). Inbox uniqueness: `(consumer, source_event_id)` and `(consumer, aggregate_type, aggregate_id, aggregate_sequence)`. Gaps park; unsupported versions dead-letter.

## 9. Async / operations

Local/CI may keep `QUEUE_CONNECTION=sync`. Worker/scheduler contracts are documented; full Horizon is later. Health remains existing `/health` endpoints.

## 10. External adapter contract

N/A beyond preserving ports (`OtpDeliveryChannel`, future payment). Kernel does not call adapters inside the idempotency transaction except DB writes.

## 11. Privacy / security

No secrets in idempotency/outbox payloads. Actor attribution required on audit. Service principal cannot exceed owner scopes (enforced when integration HTTP lands).

## 12. UX contract

Kernel errors map to existing Inertia/JSON envelopes with `correlation_id`. No new screens in T1.

## 13. Verification matrix

| ID | Proof |
| --- | --- |
| T1-K01 | Same scope/key/hash replays prior payload |
| T1-K02 | Same scope/key different hash → `IDEMPOTENCY_KEY_REUSED` |
| T1-K03 | Successful command writes audit + pending outbox in same tx |
| T1-K04 | Inbox duplicate source event ignored/rejected at unique boundary |
| T1-K05 | Listing submit still works via kernel helpers |

## 14. Activation and rollback

Kernel code is library-level; rollback = revert deploy. No schema rollback required for T1 helpers.

## 15. Implementation evidence

Pest feature tests under `tests/Feature/Shared/`; Listings submit regression; Pint dirty.
