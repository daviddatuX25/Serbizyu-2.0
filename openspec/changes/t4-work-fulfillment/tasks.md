# Tasks — T4 Work Fulfillment & Extension Engine (Common Kernel + A1 First Slice)

Rule: No permanent T4 feature expansion marked complete until §0 packet readiness PASS.

## 0. Packet Readiness & Upstream Prerequisites

- [x] 0.1 Proposal / design / capability spec authored with mandatory 15-section LLD coverage
- [x] 0.2 Upstream train dependency verified (T3 Ordinary Order Formation completed)
- [x] 0.3 Packet Readiness: **UNBLOCKED & PREREQUISITES HARDENED** (0.3.1–0.3.3 closed and verified)
  - [x] 0.3.1 **Canonical Lock-Order Reconciliation:** Fixed hierarchy enforced: listing source lock -> capacity bucket/reservation -> Order write lock -> revalidated buyer proposal terms -> Work -> Payment Obligation -> audit/outbox/idempotency integrity tail.
  - [x] 0.3.2 **Singular Proposal/Finalization Reservation Contract:** Proposal is pure pending with zero capacity reservation side effects; capacity commit occurs strictly at finalization with actor-bound replay protection and post-capacity rollback safety.
  - [x] 0.3.3 **Legacy Shape Migration & Strict Registry Parking:** Audited migration 2026_09_04_050939 maps legacy `local_service` -> A1 and `product_handoff` -> A4 with guarded rollback; pure WorkContractRegistry resolves canonical A1/A3/A4/A9 and strictly parks unmapped shapes with `WORK_CONTRACT_VERSION_UNSUPPORTED` (422) with zero state mutation.
---

## 1. Work Contract-Version Registry & Shared Ports

- [ ] 1.1 `WorkContractRegistry` interface & implementation (resolves capability profile and shape codes `A1`, `A3`, `A4`, `A9` to `shape_contract_version`, `payload_schema_version`, and shape strategy handlers)
- [ ] 1.2 Shape contracts & JSON schema structure validators for A1, A3, A4, A9
- [ ] 1.3 Strict unsupported contract version parking (`WORK_CONTRACT_VERSION_UNSUPPORTED` returns 422 with zero database mutation)
- [ ] 1.4 `WorkEvidencePort` adapter (TrustSupport) for evidence reference validation, quarantine check, and uploader attribution
- [ ] 1.5 `WorkDisputePort` adapter (TrustSupport) for active dispute and administrative hold checks (SCN-07)
- [ ] 1.6 `WorkPaymentPort` adapter (PaymentObligations) for read-only obligation inspection (payment confirmation NEVER causes Work completion; SCN-01)
- [ ] 1.7 `WorkNotificationPort` adapter (TrustSupport / Operations) for asynchronous notification intent dispatch with decoupled worker retry

---

## 2. Common Work Kernel & A1 Application Seam

- [ ] 2.1 `WorkError` domain exception with structured error bags, diagnostic payloads, and standard HTTP status mappings
- [ ] 2.2 Actor & Acting-For Context validation: Verify `actor_context`, role permissions, and active, unrevoked `consent_grant_id` for delegated agents
- [ ] 2.3 `StartWorkInstance` command (asserts provider role, transitions `not_started` → `in_progress`, sets `started_at`, emits `work.started`)
- [ ] 2.4 `RecordWorkProgress` command (verifies evidence via `WorkEvidencePort`, appends milestone note to `work_events`, increments `row_version`, emits `work.progress_recorded`)
- [ ] 2.5 `ProposeWorkCompletion` command (validates deliverable snapshots, sets `completion_proposed`, records `completion_proposed_at`, emits `work.completion_proposed`)
- [ ] 2.6 `RequestSignoff` system command / trigger (transitions `completion_proposed` → `awaiting_signoff`, sets `awaiting_signoff_at`, initiates review window, emits `work.signoff_requested`)
- [ ] 2.7 `SignOffWorkCompletion` command (asserts buyer role, verifies no active dispute/hold via `WorkDisputePort`, transitions to `completed`, sets `completed_at`, emits `work.completed`)
- [ ] 2.8 `RequestWorkRevision` command (validates `revisions_used < revisions_allowed`, returns state to `in_progress`, increments `revisions_used`, emits `work.revision_requested`)
- [ ] 2.9 Transactional safety: Enforce AD-25 lock hierarchy, optimistic concurrency (`row_version`), `IdempotencyGuard`, `AuditRecorder`, and transactional `OutboxWriter` on all mutating commands

---

## 3. Ordered Work Events & Consumer Inbox Lifecycle

- [ ] 3.1 `WorkEvents` append-only repository with monotonic sequence numbering per `work_instance_id` and SHA-256 payload checksum generation
- [ ] 3.2 Canonical event envelope serializer (`event_id`, `event_type`, `event_contract_version`, `sequence_number`, `actor_context`, `correlation_id`, `causation_id`, `payload`)
- [ ] 3.3 Consumer `InboxMessageManager` with deduplication by `(consumer_name, event_id)` and sequence gap detection/parking
- [ ] 3.4 Operator replay command `php artisan work:inbox:replay {consumer} {work_instance_id}` and dead-letter monitoring

---

## 4. Projections, Inertia `Orders/Show` Web Surface & Low-Data / Safety UX

- [ ] 4.1 `GetWorkInstanceDetailQuery` & `GetWorkEventsTimelineQuery` projections with privacy-safe field masking
- [ ] 4.2 Inertia `Orders/Show` component extension mapping responsive role views (Provider Workspace, Buyer Review & Sign-Off, SCN-07 Dispute/Hold Timeline)
- [ ] 4.3 Form POST handlers for `/orders/{order}/work/start`, `/progress`, `/propose-completion`, `/sign-off`, `/revision` with Inertia redirects and flash messages
- [ ] 4.4 Low-data / minimal-image mode fallback rendering text deliverable descriptors and preserved offline draft notices
- [ ] 4.5 Point-of-risk safety notices embedded inline at on-site location and progress update action points

---

## 5. Sequenced T4 Follow-On Units (Explicitly Sequenced, Not In Slice 1)

- [ ] 5.1 E3-S3 A3 Appointment Work (slot booking, reschedule, attendance/no-show, local time / safety guidance)
- [ ] 5.2 E3-S4 A4 Handoff Work (preparation, pickup/receipt, variance)
- [ ] 5.3 E3-S5 A4 Purchase-on-behalf extension
- [ ] 5.4 E3-S6 A9 Digital Delivery Work (secure artifact versioning, download access grants, acceptance confirmation)
- [ ] 5.5 E3-S7 Cancellation & Order Closure cascade across nonterminal children (in Slice 1, cancellation commands return `CAPABILITY_INACTIVE`)

---

## 6. Verification & Proof Obligations

- [ ] 6.1 Pest T4-01: `WorkContractRegistry` resolution & unsupported/legacy contract version parking
- [ ] 6.2 Pest T4-02: `StartWorkInstance` progression, authorization, and `work.started` sequence emission
- [ ] 6.3 Pest T4-03: `RecordWorkProgress` milestone notes and verified evidence attachment
- [ ] 6.4 Pest T4-04: Two-step completion proposal (`ProposeWorkCompletion` → `completion_proposed` → `RequestSignoff` → `awaiting_signoff`)
- [ ] 6.5 Pest T4-05: Independent buyer sign-off & `completed` terminal state transition
- [ ] 6.6 Pest T4-06: Payment event decoupling (SCN-01: payment obligation confirmation/release never completes Work)
- [ ] 6.7 Pest T4-07: Active dispute and administrative hold immediately block completion sign-off (SCN-07)
- [ ] 6.8 Pest T4-08: Revision request limits and return to `in_progress`
- [ ] 6.9 Pest T4-09: Optimistic concurrency conflict (`row_version` mismatch returns 409 Conflict)
- [ ] 6.10 Pest T4-10: Idempotent command replay (identical key returns cached result; fingerprint mismatch returns 409)
- [ ] 6.11 Pest T4-11: Acting-for consent authorization (active grant succeeds; revoked/expired grant returns 403)
- [ ] 6.12 Pest T4-12: Ordered outbox/inbox monotonic sequence and duplicate/gap handling
- [ ] 6.13 Pest T4-13: Inertia `Orders/Show` POST actions, redirects, flash banners, and low-data / safety rendering

---

## Explicit Blockers (Remain Unchecked)

- [ ] Production migrate / pilot activation
- [ ] Live connected payments / escrow / digital disbursement / settlement
- [ ] Live SMS / Google OAuth / live government ID verification
- [ ] Silent implementation of A3, A4, or A9 in first slice
- [ ] T5 Quotes / Reverse Bidding / Quick Deal formation
