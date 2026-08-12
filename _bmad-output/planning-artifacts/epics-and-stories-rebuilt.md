# Serbizyu 2.0 — Rebuilt Epics, Stories, and Delivery Plan

Status: CANONICAL DELIVERY PLAN — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; only individually hardened stories are implementation-ready
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
- `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md`
- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`
- `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`
- `docs/planning-hardening/09-development-standards-and-bmad-openspec-contract.md`

This replaces the historical epics/stories plan. Stories below are implementation candidates; only a story with its complete LLD/OpenSpec and passing readiness gate is cleared to build.

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
| E3 | Orders and A1/A3/A4/A9 Work | C,T,S | E1 and E2-S1/E2-S2/E2-S5; E2-S3/E2-S4 consume E3 final-formation seam |
| E4 | External Cash and External Digital Proof | C,T,S | E3 |
| E5 | Evidence, notifications, support, disputes, safety | C,T,S | E1–E4 |
| E6 | Admin operations, financial integrity, recovery, measurement | C,T,S | E6-S2/S4/S6: E0; E6-S1/S5: E1–E5; E6-S3: E4 and the T6 posting baseline |
| E7 | Direct Digital/Tiwala sandbox demonstrations | C,SB,S | E3,E4,E6-S1/S2/S3/S4/S6; E6-S3 executes first within T7; never live pilot |
| E8 | Controlled Tagudin validation readiness | T,S | E1–E5, E6-S1/S2/S4/S5/S6, and G3; never waits on sandbox/future E7/E9 |
| E9 | Phased Deal-Chaining, account integrations, AI handoff, and future activation | C,S,COND,FUT | E9-S5: stable E0–E6 and T4/T5/T6; E9-S7/S8: stable E0–E6 application ports; E9-S6/S9 add their named activation/UAT gates |

## 4. Epic E0 — Foundation and verification

### E0-S1 — Application skeleton and module boundaries

Status: C,S

Implementation contract: `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md#e0-s1--application-skeleton-and-module-boundaries`

Refs: ADR-R-004, ADR-R-005, ADR-R-022; PRD-001, PRD-024

Acceptance:

- Modules/bounded contexts match architecture.
- Request/command/read boundaries are documented.
- Domain state transitions cannot be bypassed through UI-only checks.
- Environment configuration separates local/test/capstone/pilot.
- No production credentials committed.

### E0-S2 — Canonical schema migration baseline

Status: C,S

Implementation contract: `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md#e0-s2--canonical-schema-migration-baseline`

Refs: canonical schema, domain contract

Acceptance:

- Migration order follows canonical Batch 0–9.
- Observed 47-table baseline plus eleven approved initiative additions is represented as the 58-table authority.
- Required columns/types, FK/delete behavior, checks, composite/partial uniqueness, indexes, retention, business/row/payload versions, and migration/backfill order exist.
- Forward migration rehearses on production-shaped data.
- Destructive/backfill changes have rollback/restore procedure.

Authority note: E0-S2 consumes the approved Deal-Chaining foundation and lineage contract as schema headroom; it does not implement or expose the later coordination UX. A separate bounded story and activation review must be approved before any user-facing Deal-Chaining work, and Slice 1 remains unchanged.

### E0-S3 — Test harness and contract fixtures

Status: C,S

Implementation contract: `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md#e0-s3--test-harness-and-contract-fixtures`

Acceptance:

- Unit, domain-transition, integration, browser, and authorization test categories exist.
- Fixtures distinguish capstone, sandbox, team/training, and genuine pilot records.
- A1/A3/A4/A9 and four payment lanes have representative fixtures.
- Tests can assert outbox/idempotency/ledger behavior.

### E0-S4 — Secure configuration and secrets boundary

Status: C,S

Implementation contract: `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md#e0-s4--secure-configuration-and-secrets-boundary`

Acceptance:

- Secrets are external to repository/logs.
- Environment-specific values are validated at startup.
- Sensitive values are redacted in logs/errors.
- Rotation/revocation procedure is documented.

### E0-S5 — Initiative authority, ERD, and kernel contract propagation

Status: C,T,S — completed planning-authority propagation; no implementation train

Refs: PRD-060–076; domain §16; canonical schema §2.2; ADR-R-031–040; architecture spine AD-1–29; UX-025–031.
Completion record (2026-08-09): founder acceptance, canonical propagation, final reviews, and mechanical authority/traceability checks passed. T0 begins with the still-pending E0-S2 LLD/OpenSpec and migration evidence; it does not repeat E0-S5.

Acceptance:

- Founder acceptance and identical capability/module/version/state/security/activation terms are propagated across every canonical artifact.
- Canonical schema, relationship ERD, migration manifest, retention classes, and planned catalog/constraint evidence agree on the 58-table authority.
- Every later train is mapped to one future LLD/OpenSpec packet using the mandatory 15-section contract; those executable packets remain train entry gates, not E0-S5 work.
- The superseded 46-table planning count cannot authorize an integration/platform-kernel migration or endpoint.
- Final planning reviews contain no unresolved architecture/domain/schema/authorization/privacy/financial/operations decision; T0 execution evidence remains exclusively E0-S2.

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

Refs: PRD-018, PRD-063; UX-006/007, UX-027

Acceptance:

- Quote captures amount, scope, inclusions/exclusions, expiry, shape, and lane.
- Expired quote cannot be accepted.
- Accepted quote invokes E3-S8 `FinalizeOrderAgreement`; it never creates a quote-specific Order path.
- No quote implies payment/work completion.

### E2-S5 — Search/discovery baseline

Status: C,T,S

Refs: PRD-009–016; UX-002

Acceptance:

- Tagudin/category/capability/status filters work.
- Unavailable/expired listings are not presented as active.
- Anonymous and authenticated cache behavior is safe.
- Search failure has a usable fallback.

### E2-S6 — Governed business versions and capacity reservations

Status: C,T,S

Refs: PRD-061–062; UX-026; ADR-R-032–033

Acceptance:

- Category and capability-profile family identity, immutable positive business version, and optimistic `row_version` are separate and database-guarded.
- Published Listing Versions pin exact Category and Capability business-version candidate keys; later edits cannot change accepted meaning.
- Capacity buckets identify listing version, capacity type, and resource; reservations transition held→committed/released/expired with one terminal release.
- Concurrent quantity, slot, and resource tests reject oversell/double booking and cross-listing/version references.

## 7. Epic E3 — Orders and fulfillment

### E3-S1 — Direct Booking Order and terms snapshot

Status: C,T,S

Refs: PRD-017, PRD-024, PRD-032, PRD-063; UX-004/005, UX-027

Acceptance:

- Buyer selects an approved Listing/Profile and submits a typed proposal; no mechanism writes an accepted Order directly.
- E3-S8 finalization snapshots terms, amount, lane, policy, category/profile/source versions and acceptance proof atomically.
- Duplicate submission returns the prior result; stale terms/source/capacity require refresh and reconfirmation.
- Accepted Order and required Work/Payment children are same-Order linked.

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

### E3-S8 — Sole atomic final agreement

Status: C,T,S

Refs: PRD-063; UX-027; ADR-R-033

Acceptance:

- Every Listing, Quote/Bid, Quick Deal, and Deal-Need mechanism converges on `SubmitOrderProposal` then `FinalizeOrderAgreement`.
- Order Management owns one fixed-lock-order PostgreSQL transaction that validates source/category/profile/policy/capacity/parties/acceptance.
- Accepted Order, parties, exact terms, required Work, one-lane Obligations, committed reservations, audit, idempotency result, and outbox all commit or all roll back.
- Concurrency, stale-version, duplicate, constraint-failure, and required-child-failure tests prove no partial accepted Order.

### E3-S9 — Retained Work contract-version registry

Status: C,T,S

Refs: PRD-064; UX-027; ADR-R-032

Acceptance:

- One registry resolves each pinned profile to shape code, shape-contract version, and payload-schema version for A1/A3/A4/A9.
- Validators/readers remain available for every version referenced by retained Work/events/evidence.
- Unknown or unavailable versions park with stable no-effect recovery and never fall through to the latest handler.
- Aggregate `row_version`, event version, shape-contract version, payload version, and artifact/revision version remain distinct.
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

### E6-S6 — Ordered consumers, activation, approvals, and financial containment

Status: C,T,S

Refs: PRD-068–073; UX-030–031; ADR-R-034–039.

Acceptance:

- Inbox deduplicates and applies per aggregate sequence; gaps/unknown versions/dead letters remain inspectable and replayable without duplicate effect.
- Every adapter and queued irreversible effect evaluates dimensioned activation in the owning service.
- Exact approvals consume atomically; configured high-risk actions enforce maker/checker and reject self-approval.
- Separate financial gates safely contain intents, release/payout, refund/reversal, outbound, inbound, query, and reconciliation without blocking required recovery.
- Operations can inspect cause, impact, actor/client, evidence, retry/disable/replay outcome, and last-success health.

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

### E7-S3 — Balanced financial posting and reconciliation

Status: C,SB,T,S

Refs: PRD-070–074; UX-028, UX-030; ADR-R-035, ADR-R-038.

Acceptance:

- One Obligation has one lane and each money effect posts one immutable idempotency-linked transaction.
- Debits equal credits per currency; entry, transaction, and active account currencies match.
- Obligation/event↔provider↔ledger mismatch enters reconciliation, blocks protected release, and resolves through attributable evidence plus linked compensation.
- Refund/reversal/release races and duplicate/reordered/mismatched provider events cannot double-post.
- Xendit/Tiwala records remain sandbox-classified and production effects cannot activate through configuration alone.

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

## 13. Epic E9 — Phased platform capabilities and future activation seams

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

### E9-S5 — Bounded Deal-Chaining coordination slice

Status: C,T,S,F,COND — committed T8 implementation; capstone/Tagudin/customer exposure remains activation-gated

Refs: PRD-022, PRD-076; UX-024; ADR-R-020, ADR-R-021, ADR-R-024, ADR-R-027, ADR-R-029; canonical `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations` and `(deal_chain_id, deal_need_id)` lineage.

This story is intentionally contract-ready rather than an authorization to build the complete feature now. It follows the ordinary Request/Quote/Order/Work spine and consumes the approved foundation propagated before E0-S2.

Acceptance:

- Chain/Need/Dependency/Invitation commands use actor, acting-for grant, expected version, correlation, idempotency, audit, and outbox context.
- Open Needs reuse existing Requests/Quotes; direct invitations target one Need; invitation acceptance does not itself create an Order.
- A separate accepted-Need command creates/links one ordinary child Order with isolated parties, terms, Work, Payment Obligations, evidence, disputes, cancellation, replacement, and liability.
- Same-chain, no-self-edge, active-edge uniqueness, and cycle prevention are enforced; dependencies block only named transitions.
- Partial completion, failure, cancellation, and replacement preserve child history and never perform an automatic sibling/parent financial cascade.
- The feature remains behind a separate pilot activation record and is absent from normal pilot navigation until authorization, recovery, operations, browser, accessibility, and founder activation evidence pass.

### E9-S6 — Deal-Chaining pilot activation review

Status: COND,FUT

Requires the bounded slice, child-isolation tests, dependency-cycle and idempotency tests, failure/replacement/partial-completion recovery, support/observability runbook, and founder activation decision. Foundation presence or a capstone lab does not pass this gate.

### E9-S7 — Account integration foundation and secure service principals

Status: C,S,COND — committed T9 implementation; endpoint/client activation remains gated

Refs: PRD-065–066, PRD-068–069, PRD-072–073; UX-029–031; ADR-R-036–040; canonical integration tables.

Acceptance:

- One owner-scoped client has restrictive versioned scopes and separately rotatable/revocable environment-bound credentials.
- Owner derives only from authenticated client; cross-owner identifiers are non-enumerating and idempotency/mappings/cursors remain client-scoped.
- `/api/v1` adapters call the same application commands/queries and cannot bypass policies, versions, activation, or reservations.
- Signed webhook retries are observable and reject DNS rebinding, redirects/private/reserved/metadata IPv4/IPv6, invalid TLS/ports, and oversized/slow responses.
- Credential issuance/scope expansion requires recent attributable human step-up; no plaintext secret is recoverable.

### E9-S8 — Exact AI handoff

Status: C,S,COND — committed T9 implementation; command activation remains gated

Refs: PRD-067, PRD-073, PRD-075; UX-029, UX-031; ADR-R-038.

Acceptance:

- AI drafts/explanations have no mutation authority.
- Confirmation-required command binds exact human/client/command/payload/target/version/economics/policy/evidence/expiry/idempotency.
- Changed, stale, expired, revoked, consumed, cross-owner, out-of-scope, or inactive approvals fail with no effect.
- Publication, Order/Work, money, consent, dispute, credential, export, hold, correction, release/payout, and activation remain absent by default.

### E9-S9 — Integration and AI activation review

Status: COND,FUT

Requires authority/schema completion, client/webhook/approval abuse and concurrency evidence, operations/support runbook, restore/revocation drill, browser/accessibility/low-data UAT, and founder activation. Contract presence does not expose endpoints or navigation.

## 13.1 Complete PRD-to-story coverage index

This index makes coverage mechanically verifiable. It does not replace the detailed story acceptance criteria.

| PRD requirements | Owning story/stories |
|---|---|
| PRD-001, PRD-002, PRD-003 | E1-S1, E1-S2, E1-S3 |
| PRD-004, PRD-005, PRD-006, PRD-007, PRD-008, PRD-009 | E1-S1, E1-S3, E1-S4 |
| PRD-010, PRD-011, PRD-012, PRD-013, PRD-014, PRD-015, PRD-016 | E2-S1, E2-S2, E2-S5 |
| PRD-017, PRD-018, PRD-019, PRD-020, PRD-021, PRD-023 | E2-S3, E2-S4, E3-S1, E1-S4 |
| PRD-022 | E0-S2 foundation contract; E9-S5 bounded coordination slice; E9-S6 pilot activation review |
| PRD-024, PRD-025, PRD-026, PRD-027, PRD-028, PRD-029, PRD-030, PRD-031 | E3-S1, E3-S2, E3-S3, E3-S4, E3-S5, E3-S6, E3-S7 |
| PRD-032, PRD-033, PRD-034, PRD-035, PRD-036, PRD-037 | E4-S1, E4-S2, E4-S3 |
| PRD-038, PRD-039, PRD-040, PRD-041, PRD-042, PRD-043 | E4-S3, E4-S4, E7-S1, E7-S2, E3-S7 |
| PRD-044, PRD-045, PRD-046, PRD-047, PRD-048, PRD-049, PRD-050, PRD-051 | E5-S1, E5-S2, E5-S3, E5-S4, E5-S5 |
| PRD-052, PRD-053, PRD-054, PRD-055, PRD-056, PRD-057, PRD-058, PRD-059 | E6-S1, E6-S2, E6-S3, E6-S4, E6-S5 |
| PRD-060 | E0-S5 |
| PRD-061 | E2-S6 |
| PRD-062 | E2-S6 |
| PRD-063 | E3-S1, E3-S8; E2-S4 consumes E3-S8 |
| PRD-064 | E3-S2–S6, E3-S9 |
| PRD-065 | E9-S7, E9-S9 |
| PRD-066 | E9-S7, E9-S9 |
| PRD-067 | E9-S8, E9-S9 |
| PRD-068 | E6-S2, E6-S6 |
| PRD-069 | E6-S6, E8-S2 |
| PRD-070 | E4-S4, E6-S3, E7-S3 |
| PRD-071 | E5-S1, E6-S3, E7-S1 |
| PRD-072 | E0-S4, E6-S2, E6-S4 |
| PRD-073 | E1-S4, E6-S1, E6-S6 |
| PRD-074 | E7-S1–S3 |
| PRD-075 | Every implementation story; E8-S1–S3; E9-S6/S9 |
| PRD-076 | E0-S2, E9-S5, E9-S6 |

### 13.2 Initiative requirement execution matrix

| PRD | UX | Domain/schema/ADR authority | Story / train | Verification intent / evidence |
| --- | --- | --- | --- | --- |
| 060 | UX-031 | Domain §16; Schema §16; ADR-R-031 | E0-S5 / T0 | authority/spine lint + readiness report / TEAM |
| 061 | UX-026 | Domain §16.1; Schema §2.2, §5; ADR-R-032 | E2-S6 / T2 | immutable-version/FK/catalog tests / TEAM |
| 062 | UX-026 | Domain §16.1–16.2; Schema §2.2, §5; ADR-R-032/033 | E2-S6 / T2 | quantity/slot/resource concurrency tests / TEAM |
| 063 | UX-027 | Domain §16.2; Schema §2.2, §15; ADR-R-033 | E3-S8 / T3 | atomic rollback/idempotency/required-child tests / TEAM |
| 064 | UX-027 | Domain §16.1; Schema §2.2; ADR-R-032 | E3-S9 / T4 | retained-handler/unknown-version no-effect tests / TEAM |
| 065 | UX-029 | Domain §16.5–16.6; Schema §2.2; ADR-R-036 | E9-S7 / T9 | credential/owner/scope/revocation abuse tests / TEAM |
| 066 | UX-029 | Domain §16.6–16.7; Schema §2.2; ADR-R-036/037 | E9-S7 / T9 | API conflict/idempotency/SSRF/webhook tests / TEAM |
| 067 | UX-029 | Domain §16.6/16.8; Schema §2.2; ADR-R-038 | E9-S8 / T9 | exact-approval mutation/no-effect tests / TEAM |
| 068 | UX-030 | Domain §16.4; Schema §2.2; ADR-R-034 | E6-S2/S6 / T1 | duplicate/gap/order/dead-letter replay tests / TEAM |
| 069 | UX-030 | Domain §16.5; Schema §2.2; ADR-R-039 | E6-S6 / T1 | activation matrix/queued-effect recheck tests / TEAM |
| 070 | UX-028/030 | Domain §16.7; Schema §2.2, §7; ADR-R-035 | E4-S4/E7-S3 / T6–T7 | per-currency balance/race/reconciliation tests / TEAM+SANDBOX |
| 071 | UX-028/030 | Domain §16.7; Schema §4/§7; ADR-R-037 | E5-S1/E6-S3 / T6–T7 | quarantine/binding/replay/retention tests / TEAM+SANDBOX |
| 072 | UX-030/031 | Domain §16.9; Schema §14–16; ADR-R-039 | E0-S4/E6-S2/S4 / T0–T1 | process health/degradation/restore rehearsal / TEAM |
| 073 | UX-029–031 | Domain §16.8; Schema §2.2; ADR-R-038 | E6-S1/S6 / T1/T6 | deny-by-default/maker-checker/atomic-consume tests / TEAM |
| 074 | UX-028 | Domain §16.7; ADR-R-035/037 | E7-S1–S3 / T7 | sandbox contract/reconciliation/no-live-effect tests / SANDBOX |
| 075 | UX-031 | Domain §16.10; ADR-R-031 | all trains / T10 gate | browser accessibility/low-data/recovery + human UAT / matching plane |
| 076 | UX-024 | Domain §16.11; Schema §2.2/§15; ADR-R-029/033 | E9-S5 / T8 | same-Chain/Need/cycle/replacement/child-isolation tests / TEAM |

## 14. Thin vertical-slice sequence

### Slice 1 — Identity to Service Listing

Consumes completed E0-S5 authority propagation; implements E0-S1–S4, E1-S1–S2, E2-S1, E2-S5, and E2-S6.

Evidence: Provider registers, publishes a Tagudin service listing, Buyer discovers it, unauthorized access is denied.

### Slice 2 — Direct Booking to A1 completion

E3-S1, E3-S2, E3-S8, E3-S9, E5-S1, E5-S2; consumes E2-S6 governed-version/reservation contracts from Slice 1.

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

### Slice 9 — Account integration and AI sandbox

E9-S7–S9 only after T0/T1/T2 and stable owner application ports.

Evidence: owner issues and revokes a restricted client, guarded capacity sync preserves reservations, webhook failure recovers without SSRF/replay, and AI exact approval cannot exceed owner/client/policy/activation authority.

## 15. Dependency and sequencing rules

- E0 precedes all data/domain implementation.
- E1 precedes listings with ownership/consent.
- E2-S1/S2/S5/S6 precede E3 Order formation; E2-S3/S4 execute after and consume the E3-S8 exact final-agreement seam.
- E3 precedes payment evidence tied to an Order/Work.
- E4/E5 must exist before connected-payment sandbox claims.
- E6-S1/S2/S4/S5/S6 precede E8/G3 pilot readiness; E6-S3 precedes E7-S1–S3 within T7 and does not block the non-connected pilot.
- E7 never unblocks live-money use by itself.
- E8 is a readiness gate, not a feature epic.
- Deal-Chaining foundation propagation is an E0-S2 prerequisite; E9-S5/S6 begin only after the ordinary marketplace spine and their explicit activation evidence exist.

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
- Deal-Chaining foundation, later bounded implementation, and pilot activation are traced as separate gates.
- Estimates, capacity, dependencies, and buffer are reviewed.
- A fresh readiness audit passes after all rebuilt artifacts are approved.
