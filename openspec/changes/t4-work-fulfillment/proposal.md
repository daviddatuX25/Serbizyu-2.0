# T4 — Work Fulfillment & Extension Engine (Common Kernel + A1 First Slice)

Status: PREREQUISITES COMPLETED (0.3.1–0.3.3 HARDENED & VERIFIED) / READY FOR IMPLEMENTATION (1.x+)  
Plane: `C`, `T`, `S`  
Story refs: `E3-S2` (A1 Linear Project), `E3-S3` (A3 Appointment — sequenced), `E3-S4` (A4 Handoff — sequenced), `E3-S5` (A4 Purchase-on-behalf — sequenced), `E3-S6` (A9 Digital Delivery — sequenced), `E3-S7` (Cancellation & Order closure — sequenced), `E3-S9` (Retained Work contract-version registry)  
Train: `T4`  
Change ID: `t4-work-fulfillment`  
Depends on: T3 GO (`t3-ordinary-order-formation`) + T3 Alignment Prerequisites Resolution

---

## 0. Implementation Readiness Verdict: UNBLOCKED (Prerequisites Closed)

The blocking upstream prerequisites 0.3.1–0.3.3 have been formally reconciled and verified:
1. **Canonical Lock-Order Alignment (AD-25 / ADR-R-033):**
   - *Conflict:* Canonical Spine AD-25 and ADR-R-033 require the fixed lock hierarchy `source/listing/capacity → Order → Work → Obligation → integrity records`. Current T3 `FinalizeOrderAgreement` locks `orders` before reading capacity.
   - *Blocking Prerequisite:* T3 finalization coordinator must be brought into strict compliance with AD-25 (or an approved canonical spine amendment recorded) before any cross-aggregate Work mutations can be implemented. T4 transactions strictly enforce the canonical order for any multi-aggregate operation.
2. **Single Proposal/Finalization Capacity Reservation Contract (AD-5 / ADR-R-032 / ADR-R-033 / Domain §16.2):**
   - *Conflict:* Canonical rules mandate that `SubmitOrderProposal` is pure pending with zero resource side effects, and `FinalizeOrderAgreement` performs the atomic capacity commit. T3 implementation permitted an optional proposal-time capacity hold.
   - *Blocking Prerequisite:* The proposal/finalization reservation lifecycle must be reconciled to the single canonical contract across T2/T3 before T4 consumes Order formation results. Dual-timing acceptance inside T4 is prohibited.
3. **Removal of Legacy Shape Aliases & Strict Contract Registry (AD-1 / AD-7 / E3-S9):**
   - *Conflict:* Legacy code inserted stub strings `local_service` and `product_handoff`.
   - *Blocking Prerequisite:* Strict canonical shape codes (`A1`, `A3`, `A4`, `A9`) are enforced with no backward-compatibility aliases. All legacy unmapped records must be parked read-only with `WORK_CONTRACT_VERSION_UNSUPPORTED` until an audited, versioned data migration exists.
4. **Mandatory 15-Section LLD Coverage & Verification Evidence (`PROGRAM-IMPLEMENTATION-PLAN.md` §6):**
   - *Resolution:* This packet fully supplies the mandatory 15-section design, ordered work event envelope, inbox gap/dead-letter lifecycle, acting-for consent matrix, persistence delta, failure/recovery matrix, and low-data UX variants.

---

## 1. Canonical & Hardened Authority

| Layer | Canonical Reference | Governed Invariant / Contract |
|---|---|---|
| Product | `prd-rebuilt.md`: PRD-025 (A1), PRD-026 (A3), PRD-027 (A4), PRD-028 (A4 Purchase), PRD-029 (A9), PRD-031 (Milestone/progress), PRD-043 (Cancellation), PRD-064 (Registry) | Typed fulfillment shapes; independent sign-off; cancellation guards; contract version registry |
| UX | `ux-spec-rebuilt.md`: UX-008 (A1 Flow), UX-009 (A3), UX-010 (A4), UX-011 (A9), UX-016 (Copy/Inactivity), UX-017 (Cancel), UX-018 (Dispute/Hold), UX-019 (Retry/Notification), UX-020 (Low-data/No-image), UX-021 (Point-of-Risk Safety), UX-027 (Layout), UX-031 (Degraded/Error/Offline) | Agreed → in_progress → completion_proposed → awaiting_signoff → buyer sign-off → completed; payment never completes Work; point-of-risk safety; error recovery |
| Domain / State | `domain-state-contracts-rebuilt.md`: §2.4, §5 (Work state machine), §11 (Invariants), §16.2 (Reservations), §16.4 (Ordered Events) | Common Work lifecycle; 2-step completion progression; payment never completes Work; dispute/hold pauses completion; immutable shape payload |
| Schema / ERD | `canonical-schema-rebuilt.md`: §6.4 `work_instances`, §6.5 `work_events`, `inbox_messages`, Batch 4 | Pinned capability profile; append-only work events; optimistic `row_version` vs contract version vs sequence number |
| Architecture | `ARCHITECTURE-SPINE.md`: AD-4 (Modules), AD-7 (Common Work kernel), AD-12 (Acting-for), AD-18 (Ordered Outbox/Inbox), AD-25 (Fixed Lock Order), AD-26 (Lineage), AD-27 | `OrdersWork` module owns Order/Work boundary; ports to TrustSupport and PaymentObligations; no universal ad hoc payload; fixed lock hierarchy |
| Decisions | `adr-catalog-rebuilt.md`: ADR-R-004, ADR-R-007, ADR-R-032 (Registry), ADR-R-033 (Final agreement & Lock order) | Immutable versions; unknown version parking (`WORK_CONTRACT_VERSION_UNSUPPORTED`); sole atomic agreement |
| Delivery Plan | `PROGRAM-IMPLEMENTATION-PLAN.md`: §6 (15-Section LLD), §7 T4 Work Engine, §9 UX Capability Map | Common Work engine + registry; all 4 shapes specified; A1 implemented first; A3/A4/A9 sequenced; 15 mandatory sections |
| Mockup Bridge | `mockup-experience-expansion-bridge.md`: ORD-001..005, A1-001..003, SCN-01 (Payment Separation), SCN-07 (Dispute/Hold Recovery) | Shared Inertia `Orders/Show` extension; progress evidence timeline; sign-off review; dispute escalation and Operations recovery |

---

## 2. Why

T3 established the sole ordinary Order formation seam and creates a `not_started` Work stub upon final agreement. However, current `OrdersWork` has no Work transition commands, no work-event engine, no contract-version registry, and no shape-specific execution logic.

To fulfill ordinary orders without introducing a fragile universal ad hoc payload, conflating work completion with payment, or compromising transactional safety, T4 introduces:
1. A **Retained Work Contract-Version Registry** that maps capability profiles to immutable shape codes (`A1`, `A3`, `A4`, `A9`), shape-contract versions, and payload-schema versions, with fail-safe parking (`WORK_CONTRACT_VERSION_UNSUPPORTED`) for unmapped or legacy shapes.
2. A **Common Work State Machine** enforcing strict 2-step completion progression (`in_progress` → `completion_proposed` → `awaiting_signoff` → `completed`), optimistic concurrency (`row_version`), actor and acting-for authorization, audit logging, outbox event emission, ordered inbox consumption, and idempotency guarantees.
3. The **A1 Linear Project Work First Slice** (E3-S2) implementing project initiation, milestone progress notes, deliverable evidence attachment, completion proposal, buyer review/revision, and independent buyer sign-off via the existing Inertia `Orders/Show` interface.
4. Clean **seams to TrustSupport** (disputes, holds, evidence, notification delivery) and **PaymentObligations** (read-only obligation inspection), strictly ensuring payment confirmation never causes Work completion and active disputes/holds block completion sign-off.

---

## 3. Implementation Slices & Phasing

- **First Implementation Slice (T4.1 — This Change Contract):**
  - Common Work state machine (`not_started`, `in_progress`, `completion_proposed`, `awaiting_signoff`, `completed`, `cancel_requested`, `cancelled`, `disputed`, `failed`).
  - Retained Work Contract-Version Registry with canonical A1/A3/A4/A9 shape contract definitions and unknown/legacy version parking (`WORK_CONTRACT_VERSION_UNSUPPORTED`).
  - A1 Linear Project application commands: `StartWorkInstance`, `RecordWorkProgress`, `ProposeWorkCompletion`, `RequestSignoff` (System/Engine trigger), `SignOffWorkCompletion`, `RequestWorkRevision`.
  - Actor and acting-for consent authorization checking (`actor_context`).
  - Ordered Work event envelope, monotonic sequence generation, outbox emission, and consumer inbox contract (deduplication, gap parking, dead-lettering).
  - Web UI integration extending existing Inertia `Orders/Show` surface (ORD-002, ORD-003, ORD-005, A1-001..003) with responsive desktop, mobile, low-data, and point-of-risk safety states.
  - Shared ports for evidence validation, dispute/hold checks, notification intent dispatch, and read-only payment obligation inspection.
  - Pest test suite proving transitions, concurrency, idempotency replay, dispute/hold blocking, payment decoupling, acting-for denial, and out-of-order event handling.

- **Sequenced Follow-On Units (T4.2–T4.5 — Explicitly Sequenced, Not In Slice 1):**
  - **T4.2 (E3-S3):** A3 Appointment Work (slot booking, reschedule, attendance/no-show, safety guidance).
  - **T4.3 (E3-S4 & E3-S5):** A4 Handoff Work (preparation, pickup/receipt, variance, purchase-on-behalf extension).
  - **T4.4 (E3-S6):** A9 Digital Delivery Work (secure artifact versioning, download access grants, delivery confirmation).
  - **T4.5 (E3-S7):** Cancellation & Order Closure cascade across nonterminal children (in Slice 1, cancellation commands return `CAPABILITY_INACTIVE` or safe support routes).

---

## 4. Non-Goals & Explicit Exclusions

- **No Premature Implementation Before T3 Prerequisites Close:** Code implementation will not begin until T3 lock order, reservation contract, and legacy shape migration prerequisites are formally closed.
- **No Live Payments or Connected Money:** Payment execution, escrow, digital disbursement, and settlement remain gated under T6/T7. Payment confirmation never triggers Work completion.
- **No Formation Expansion:** Quotes, Reverse Bidding, and Quick Deal formation remain gated under T5.
- **No Reviews or Ratings:** Public ratings, reputation, and reviews remain gated under T6.
- **No Live External Providers:** Live SMS, Google OAuth, and live government ID verification remain disabled/deferred behind ports.
- **No Pilot or Field Activation:** No live pilot or field deployment in Tagudin without founder review and explicit G3 readiness.
- **No Silent A3/A4/A9 Implementation:** Only A1 is implemented in this slice; A3, A4, and A9 contracts and schemas are registered in the registry but execution handlers are sequenced.
- **No Silent E3-S7 Cancellation/Closure Execution in Slice 1:** Full cancellation cascades and Order closure are sequenced to T4.5.

---

## 5. Success Criteria

1. **Deterministic 2-Step Completion Lifecycle:** An A1 Work instance advances through `in_progress` → `completion_proposed` → `awaiting_signoff` → `completed` under authorized actor commands and emits append-only `work_events` with monotonic sequence numbers.
2. **Payment Decoupling:** Work completion is strictly governed by buyer sign-off or administrative dispute resolution; no payment event can cause `completed`. SCN-01 Payment Obligation truth is projected separately.
3. **Dispute & Hold Invariant (SCN-07):** Active disputes or administrative holds immediately block completion sign-off, surface clear hold copy, and provide an Operations resolution recovery path.
4. **Idempotency & Replay Safety:** Replaying identical command keys returns cached responses without duplicating events, audits, or state transitions.
5. **Version & Legacy Parking Safety:** Pinned shape contracts and schemas execute reliably; unsupported, unmapped, or legacy shape strings park safely with `WORK_CONTRACT_VERSION_UNSUPPORTED` and zero state mutation.
6. **Actor & Acting-For Consent Enforcement:** Commands verify actor role and active, unrevoked consent grants; unauthorized or expired acting-for attempts fail safely.
7. **Ordered Event & Inbox Robustness:** Work events carry complete metadata (sequence, causation, actor context, payload hash); consumer inbox detects duplicate events and parks sequence gaps safely.
8. **Responsive & Low-Data UX Integration:** Extended Inertia `Orders/Show` provides complete coverage across desktop, mobile, low-data/no-image mode, and point-of-risk safety guidance.
