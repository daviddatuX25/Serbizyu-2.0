# Serbizyu 2.0 — Rebuilt Epics, Stories, and Delivery Plan

Status: REBUILT DRAFT — founder review required before implementation planning becomes executable
BMAD phase: Phase 3 — Implementation planning
Depends on:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `_bmad-output/planning-artifacts/adr-catalog-rebuilt.md`
- `_bmad-output/planning-artifacts/architecture-rebuilt.md`

This replaces the historical epics/stories plan after approval. Stories below are implementation candidates, not proof that implementation is currently cleared.

## 1. Delivery rules

- Build vertical slices, not isolated tables or screens.
- Every story names a PRD requirement, domain contract, UX journey, acceptance evidence, and operational impact.
- No story may enable a deferred/sandbox capability accidentally.
- Financial stories include idempotency, correction, reconciliation, and failure behavior.
- Sensitive-data stories include consent, access, retention, deletion, and audit behavior.
- A story is not done when the happy path works; it is done when failure, authorization, evidence, and recovery behavior pass.
- Capstone, sandbox, team, training, and genuine Tagudin activity remain separately classified.

## 2. Story status vocabulary

- `C` — capstone requirement
- `T` — Tagudin pilot requirement
- `S` — startup foundation
- `SB` — sandbox-only
- `COND` — activation-gated
- `FUT` — future/deferred

## 3. Epic map

| Epic | Outcome | Main plane | Dependencies |
|---|---|---|---|
| E0 | Build/test/security/operational foundation | C,S | Approved schema/architecture |
| E1 | Identity, roles, verification, and Agent consent | C,T,S | E0 |
| E2 | Listings, taxonomy, capacity, and discovery | C,T,S | E0,E1 |
| E3 | Orders and A1/A3/A4/A9 Work | C,T,S | E1,E2 |
| E4 | External Cash and External Digital Proof | C,T,S | E3 |
| E5 | Evidence, notifications, support, disputes, safety | C,T,S | E1–E4 |
| E6 | Admin operations, financial integrity, recovery, measurement | C,T,S | E0–E5 |
| E7 | Direct Digital/Tiwala sandbox demonstrations | C,SB,S | E3,E4,E6; never live pilot |
| E8 | Controlled Tagudin validation readiness | T,S | E1–E6 and G3 |
| E9 | Future capability activation seams | S,F | Post-pilot evidence |

## 4. Epic E0 — Foundation and verification

### E0-S1 — Application skeleton and module boundaries

Status: C,S

Refs: ADR-R-004, ADR-R-005, ADR-R-022; PRD-001, PRD-024

Acceptance:

- Modules/bounded contexts match architecture.
- Request/command/read boundaries are documented.
- Domain state transitions cannot be bypassed through UI-only checks.
- Environment configuration separates local/test/capstone/pilot.
- No production credentials committed.

### E0-S2 — Canonical schema migration baseline

Status: C,S

Refs: canonical schema, domain contract

Acceptance:

- Migration order follows Batch 0–7.
- 42-table inventory is represented or deviations have approved schema decision.
- FKs, uniqueness, checks, indexes, retention metadata, and version fields exist.
- Forward migration rehearses successfully.
- Destructive changes have rollback/restore procedure.

### E0-S3 — Test harness and contract fixtures

Status: C,S

Acceptance:

- Unit, domain-transition, integration, browser, and authorization test categories exist.
- Fixtures distinguish capstone, sandbox, team/training, and genuine pilot records.
- A1/A3/A4/A9 and four payment lanes have representative fixtures.
- Tests can assert outbox/idempotency/ledger behavior.

### E0-S4 — Secure configuration and secrets boundary

Status: C,S

Acceptance:

- Secrets are external to repository/logs.
- Environment-specific values are validated at startup.
- Sensitive values are redacted in logs/errors.
- Rotation/revocation procedure is documented.

## 5. Epic E1 — Identity, access, and delegation

### E1-S1 — User account and access tiers

Status: C,T,S

Refs: PRD-001, PRD-009; UX-001, UX-002, UX-020

Acceptance:

- User can register/login through approved method.
- L3 online path works.
- L0/L1/L2 are visibly conditional unless their operations are enabled.
- Role capabilities are additive, not a mutually exclusive role column.
- Unauthorized actions are denied server-side and tested.

### E1-S2 — Provider/Buyer profile and privacy controls

Status: C,T,S

Refs: PRD-003, PRD-011; UX-001/002

Acceptance:

- Public/private profile fields are separated.
- Location/contact exposure follows policy.
- User can view relevant account/privacy state.
- Access logs exist for sensitive profile data.

### E1-S3 — Government-ID verification workflow

Status: C,COND,T,S

Refs: PRD-002, PRD-003; UX-001

Acceptance:

- Capstone can use safe fixture/sandbox evidence.
- Live sensitive collection remains disabled until legal/privacy/operations gate.
- Manual review, rejection, resubmission, retention, deletion, and access audit exist.
- No AI-only identity decision is required.

### E1-S4 — Agent consent and delegated listing assistance

Status: C,T,S

Refs: PRD-004–008, PRD-023; UX-003

Acceptance:

- Owner grants scoped permission.
- Agent sees only permitted actions.
- Owner receives action notice.
- Every action records Agent and affected Owner.
- Revocation prevents future action.
- Agent has no default money/goods custody.

## 6. Epic E2 — Listings, taxonomy, and discovery

### E2-S1 — Service Listing lifecycle

Status: C,T,S

Refs: PRD-010–013, PRD-016; UX-004

Acceptance:

- Draft/review/active/paused/unavailable/expired/archive states work.
- Capability profile and category/safety requirements are enforced.
- Listing version is snapshotted.
- Tagudin pilot visibility is enforced.

### E2-S2 — Product Listing capacity and handoff readiness

Status: C,T,S

Refs: PRD-010–015; UX-005

Acceptance:

- Product capacity/stock/slot behavior exists.
- Oversell/negative capacity is prevented.
- Pickup/handoff terms are visible.
- Availability changes are auditable.

### E2-S3 — Service/Product Request foundation

Status: C,COND,T,S

Refs: PRD-010, PRD-018–019; UX-006/007

Acceptance:

- Request captures scope/item, timing, location, budget/estimate, privacy/safety.
- Expiry and response states exist.
- Feature remains disabled if response/liquidity operations are not ready.

### E2-S4 — Quote Request and response

Status: C,COND,T,S

Refs: PRD-018; UX-006/007

Acceptance:

- Quote captures amount, scope, inclusions/exclusions, expiry, shape, and lane.
- Expired quote cannot be accepted.
- Accepted quote creates immutable Order terms snapshot.
- No quote implies payment/work completion.

### E2-S5 — Search/discovery baseline

Status: C,T,S

Refs: PRD-009–016; UX-002

Acceptance:

- Tagudin/category/capability/status filters work.
- Unavailable/expired listings are not presented as active.
- Anonymous and authenticated cache behavior is safe.
- Search failure has a usable fallback.

## 7. Epic E3 — Orders and fulfillment

### E3-S1 — Direct Booking Order and terms snapshot

Status: C,T,S

Refs: PRD-017, PRD-024, PRD-032; UX-004/005

Acceptance:

- Buyer selects approved listing/profile.
- Terms, amount, lane, policy, and capability snapshot atomically.
- Duplicate submission is idempotent.
- Order and required Work/Payment records are linked.

### E3-S2 — A1 Linear Project Work

Status: C,T,S

Refs: PRD-025, PRD-031; UX-008

Acceptance:

- Scope/progress/evidence/revision/completion proposal work.
- Buyer sign-off/review is separate from payment.
- Dispute/hold blocks applicable completion/release.
- Completion cannot occur through payment-only event.

### E3-S3 — A3 Appointment Work

Status: C,T,S

Refs: PRD-026; UX-009

Acceptance:

- Availability/slot reservation is concurrency-safe.
- Confirm/reschedule/cancel/no-show behavior exists.
- Safety guidance appears.
- Completion evidence and disputes work.

### E3-S4 — A4 Handoff Work

Status: C,T,S

Refs: PRD-027; UX-010

Acceptance:

- Ready/preparation/pickup/handoff/receipt states work.
- Capacity/quantity mismatch is captured.
- Buyer acceptance is not inferred from payment.
- Dispute evidence is preserved.

### E3-S5 — A4 purchase-on-behalf extension

Status: C,COND,T,S

Refs: PRD-028; UX-007/010

Acceptance:

- Item list, estimate/budget, alternatives, approval, actual cost, variance, receipt, service fee, and handoff are explicit.
- Agent cannot spend without permission.
- No custom cash custody or hidden commission path is introduced.

### E3-S6 — A9 Digital Delivery Work

Status: C,T,S

Refs: PRD-029; UX-011

Acceptance:

- Secure artifact/version/delivery/access/revision/acceptance behavior works.
- Evidence retention/deletion rules apply.
- Upload failure is retryable and does not mark completion.

### E3-S7 — Cancellation and Order closure

Status: C,T,S

Refs: PRD-043; UX-017

Acceptance:

- Pre-evidence cancellation and post-evidence correction differ.
- Required parties are notified.
- Work/payment/dispute effects are explicit.
- Close is blocked until required terminal conditions satisfy domain contract.

## 8. Epic E4 — Initial payment/evidence lanes

### E4-S1 — External Cash declaration

Status: C,T,S

Refs: PRD-032–034, PRD-049; UX-012

Acceptance:

- Buyer-paid and Provider-received declarations are separate.
- Mutual acknowledgment/mismatch/dispute states work.
- No Serbizyu cash custody or commission receivable appears.
- UI shows no automatic cash-refund promise.
- ₱50–₱100 orders remain valid.

### E4-S2 — External Digital Proof evidence

Status: C,T,S

Refs: PRD-035–037; UX-013

Acceptance:

- Declaration/reference/file evidence flow works.
- States distinguish reported, acknowledged, provider-verified, disputed, rejected, superseded.
- Screenshot is not provider-verified by default.
- Redaction, malware scan, access log, retention, and deletion apply.

### E4-S3 — Payment Obligation amount/policy snapshot

Status: C,T,S

Refs: PRD-032, PRD-042–043; UX-012–015

Acceptance:

- Purpose, amount, lane, fee, policy version, payer/recipient, and due condition snapshot.
- Policy changes do not rewrite existing records.
- Mixed tender within one obligation is rejected.

### E4-S4 — Financial event and correction spine

Status: C,T,S

Refs: PRD-043, PRD-059; ADR-R-012/013

Acceptance:

- Financial transactions balance.
- Corrections/refunds/reversals are append-only linked events.
- Duplicate/out-of-order events are safe.
- Admin can inspect source/effect without direct balance overwrite.

## 9. Epic E5 — Trust, communication, safety, and support

### E5-S1 — Fulfillment evidence and completion review

Status: C,T,S

Refs: PRD-046–047; UX-008–011, UX-016

Acceptance:

- Shape-specific evidence is required.
- Completion proposal/sign-off/review expiry behavior works.
- Review eligibility requires supported completed interaction.
- Completion and payment statuses remain separate.

### E5-S2 — Notifications and delivery retry

Status: C,T,S

Refs: PRD-044; UX-019

Acceptance:

- Critical state changes generate notification intent.
- Delivery attempts/retries/failures are visible.
- Failed notification creates support path.
- Duplicate delivery does not duplicate domain effect.

### E5-S3 — Messaging and support cases

Status: C,T,S

Refs: PRD-045; UX-019/022

Acceptance:

- Relevant participants can communicate through approved channels.
- Agent/admin activity is attributed.
- Support case can be linked to Order/Work/Obligation.
- Sensitive evidence is not exposed broadly.

### E5-S4 — Dispute, hold, and resolution

Status: C,T,S

Refs: PRD-048–049; UX-018

Acceptance:

- Buyer/Provider can open dispute with reason/evidence.
- Relevant hold prevents unsafe release.
- Admin resolution records effects on Work/Obligation/refund/correction.
- No universal three-round cap is introduced.

### E5-S5 — Safety report/block/escalation

Status: C,T,S

Refs: PRD-050–051; UX-021

Acceptance:

- Block/report exists.
- Category-sensitive guidance is displayed.
- Severe incident creates immediate operational route.
- Safety data is access-controlled and retained appropriately.

## 10. Epic E6 — Operations, recovery, and measurement

### E6-S1 — Admin operations console

Status: C,T,S

Refs: PRD-052–055; UX-022

Acceptance:

- Admin can inspect aggregate timeline, evidence, holds, disputes, obligations, provider events, and failures.
- High-risk actions require permission/reason and create audit event.
- Kill switches exist for capability/payment/provider/Agent paths.

### E6-S2 — Outbox, worker, scheduler, and failed-event recovery

Status: C,T,S

Refs: PRD-054; architecture blueprint

Acceptance:

- Named worker and scheduler processes run.
- Outbox intent is transactionally linked.
- Retry/dead-letter/support path works.
- Each scheduled job has owner, health signal, and last-success record.

### E6-S3 — Provider-event authenticity/reconciliation harness

Status: C,SB,T,S

Refs: PRD-038–040, PRD-054; ADR-R-014

Acceptance:

- Sandbox/provider test event authenticity is validated.
- Duplicate/out-of-order events are safe.
- Mismatch enters operations queue.
- No live provider integration claim is made.

### E6-S4 — Backup/restore and retention operations

Status: C,T,S

Refs: PRD-037, PRD-058; architecture blueprint

Acceptance:

- Database and evidence backup policy exists.
- Restore rehearsal passes in disposable environment.
- Retention/deletion honors legal/dispute holds.
- Runbook names owner, RPO/RTO target, verification, and escalation.

### E6-S5 — Cohort and pilot measurement

Status: C,T,S

Refs: PRD-056–057, PRD-059; UX-023

Acceptance:

- Demo/sandbox/team/training/genuine records are distinguishable.
- Scorecard metrics are reproducible from stored events.
- Operating cost/support effort is tracked.
- Cash pilot produces no false revenue.

## 11. Epic E7 — Connected-payment sandbox only

### E7-S1 — Direct Digital sandbox adapter

Status: C,SB,S

Acceptance:

- Provider sandbox contract/test evidence is recorded.
- Fees/amounts/refunds/provider statuses are visible.
- No live-money or Tiwala protection claim.
- Provider secrets/authenticity/idempotency tests pass.

### E7-S2 — Tiwala Protected Digital sandbox release

Status: C,SB,S

Acceptance:

- Completion/sign-off/review-window guards are exercised.
- Dispute/hold/fraud/admin gates block release.
- Release is idempotent/concurrency-safe.
- Refund/reversal/reconciliation cases are tested.
- UI says sandbox and not legal escrow.

## 12. Epic E8 — Tagudin validation readiness

### E8-S1 — Pilot onboarding and training

Status: T,S

Acceptance:

- Provider/Buyer/Agent training material exists.
- Approximately 30-person target and evidence floor are measurable.
- Team/support capacity and escalation schedule are explicit.
- Agents are not trained as cash custodians by default.

### E8-S2 — Capability activation review

Status: T,S

Acceptance:

- Each enabled category/profile has status, owner, safety review, support procedure, rollback, and metrics.
- Conditional paths remain disabled without activation record.
- Payment lanes are limited to External Cash/External Digital Proof for genuine initial pilot.

### E8-S3 — G3 launch readiness evidence

Status: T,S

Acceptance:

- Fresh readiness checks pass.
- Critical security/privacy/data recovery tests pass.
- Operations console and runbooks are usable.
- No critical red-line condition is open.
- Pilot cohort classification is verified.

## 13. Epic E9 — Future activation seams

### E9-S1 — Request liquidity activation

Status: COND,FUT

Requires evidence of supply/response, quote/reverse-bid controls, and support capacity.

### E9-S2 — Online Quick Deal activation

Status: COND,FUT

Requires terms/counterparty/safety/retry contract and measurable user need.

### E9-S3 — Additional fulfillment adapter

Status: FUT

Requires activation record, domain/state extension, schema impact, UX, safety, operations, and rollback.

### E9-S4 — Connected-money G6 preparation

Status: FUT

Requires legal/provider/financial/operations/security/reconciliation gates from scorecard.

## 13.1 Complete PRD-to-story coverage index

This index makes coverage mechanically verifiable. It does not replace the detailed story acceptance criteria.

| PRD requirements | Owning story/stories |
|---|---|
| PRD-001, PRD-002, PRD-003 | E1-S1, E1-S2, E1-S3 |
| PRD-004, PRD-005, PRD-006, PRD-007, PRD-008, PRD-009 | E1-S1, E1-S3, E1-S4 |
| PRD-010, PRD-011, PRD-012, PRD-013, PRD-014, PRD-015, PRD-016 | E2-S1, E2-S2, E2-S5 |
| PRD-017, PRD-018, PRD-019, PRD-020, PRD-021, PRD-022, PRD-023 | E2-S3, E2-S4, E3-S1, E1-S4 |
| PRD-024, PRD-025, PRD-026, PRD-027, PRD-028, PRD-029, PRD-030, PRD-031 | E3-S1, E3-S2, E3-S3, E3-S4, E3-S5, E3-S6, E3-S7 |
| PRD-032, PRD-033, PRD-034, PRD-035, PRD-036, PRD-037 | E4-S1, E4-S2, E4-S3 |
| PRD-038, PRD-039, PRD-040, PRD-041, PRD-042, PRD-043 | E4-S3, E4-S4, E7-S1, E7-S2, E3-S7 |
| PRD-044, PRD-045, PRD-046, PRD-047, PRD-048, PRD-049, PRD-050, PRD-051 | E5-S1, E5-S2, E5-S3, E5-S4, E5-S5 |
| PRD-052, PRD-053, PRD-054, PRD-055, PRD-056, PRD-057, PRD-058, PRD-059 | E6-S1, E6-S2, E6-S3, E6-S4, E6-S5 |

## 14. Thin vertical-slice sequence

### Slice 1 — Identity to Service Listing

E0-S1–S4, E1-S1–S2, E2-S1, E2-S5.

Evidence: Provider registers, publishes a Tagudin service listing, Buyer discovers it, unauthorized access is denied.

### Slice 2 — Direct Booking to A1 completion

E3-S1, E3-S2, E5-S1, E5-S2.

Evidence: Buyer books, Provider performs Work, evidence/sign-off occurs, notifications and audit history exist.

### Slice 3 — Product A4 handoff

E2-S2, E3-S4, E4-S1, E5-S1.

Evidence: capacity/handoff/receipt/mismatch behavior works with External Cash.

### Slice 4 — A3 appointment

E3-S3, E5-S5.

Evidence: slot conflict/no-show/safety/completion behavior works.

### Slice 5 — A9 digital delivery

E3-S6, E4-S2, E5-S1.

Evidence: private artifact delivery, acceptance/revision, evidence privacy/retention work.

### Slice 6 — Agent-assisted access

E1-S4, E5-S2–S3.

Evidence: consent, scoped action, owner notice, revocation, attribution.

### Slice 7 — Admin recovery

E6-S1–S5.

Evidence: failed event, dispute, hold, evidence access, backup/restore, and metric classification are operable.

### Slice 8 — Sandbox connected payment

E7-S1–S2 only after core slices and operations are stable.

## 15. Dependency and sequencing rules

- E0 precedes all data/domain implementation.
- E1 precedes listings with ownership/consent.
- E2 precedes Orders.
- E3 precedes payment evidence tied to an Order/Work.
- E4/E5 must exist before connected-payment sandbox claims.
- E6 must exist before G3 pilot launch.
- E7 never unblocks live-money use by itself.
- E8 is a readiness gate, not a feature epic.
- E9 begins only after genuine pilot evidence.

## 16. Delivery capacity and schedule guard

A 12-week capstone/pilot-foundation schedule is a candidate, not an automatic promise.

Before committing dates, the team must:

- Count available developers and non-development operators.
- Estimate each story after schema/domain review.
- Reserve defect, security, recovery, and documentation buffer.
- Identify stories that can be parallelized safely.
- Select the smallest pilot slice.
- Define stop/defer criteria.

If capacity cannot complete E0–E6 and the committed vertical slices, defer conditional features rather than weakening financial, privacy, safety, or recovery controls.

## 17. Story acceptance template

Every implementation story must contain:

- Story ID and user outcome
- Plane/status
- PRD requirement IDs
- UX journey/screen IDs
- Domain state/events
- Schema tables/constraints
- Authorization/privacy/safety impact
- Acceptance scenarios
- Failure/retry/idempotency scenarios
- Observability/operations impact
- Evidence class
- Dependencies
- Estimate and owner
- Rollback/disablement behavior

## 18. Implementation-planning exit gate

The epics/stories plan is ready for implementation only when:

- Every committed PRD requirement has a story or explicit non-code owner.
- Every story maps to UX, domain, schema, ADR, and acceptance evidence.
- Payment, consent, safety, outbox, scheduler, backup, and recovery stories exist.
- Direct Digital/Tiwala stories are sandbox-only.
- Conditional/deferred capabilities have no accidental pilot stories.
- Estimates, capacity, dependencies, and buffer are reviewed.
- A fresh readiness audit passes after all rebuilt artifacts are approved.
