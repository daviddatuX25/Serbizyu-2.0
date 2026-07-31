# Serbizyu 2.0 — Rebuilt Architecture Decision Record Catalog

Status: REBUILT DRAFT — founder review required before implementation decisions become binding
BMAD phase: Phase 3 — Architecture decisions
Inputs:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`

These rebuilt ADRs supersede the old catalog after approval. Historical ADR numbers remain evidence only unless explicitly adopted below.

## ADR-R-001 — Recovery source-of-truth hierarchy

Status: Accepted for rebuild

Context: Historical files conflict and generated-looking outputs were treated as authoritative without ceremony evidence.

Decision:

1. Founder-approved control artifacts govern recovery process and contradiction disposition.
2. Rebuilt BMAD artifacts govern product/domain/technical behavior after approval.
3. Research supports decisions but does not become product policy automatically.
4. Historical outputs remain preserved and labeled historical/superseded.
5. Fresh readiness audit is generated last.

Consequences: downstream artifacts must cite upstream inputs; duplicate source files cannot silently compete.

## ADR-R-002 — Tagudin-first validation boundary

Status: Accepted for rebuild

Decision: Initial genuine validation is Tagudin-only. Candon and other geography appear only as historical/research context until a new geography gate passes.

Consequences: location filters, metrics, safety operations, and pilot stories use Tagudin. This does not prevent future geography extension.

## ADR-R-003 — Three-plane product strategy

Status: Accepted for rebuild

Decision: Separate capstone demonstration, Tagudin validation, and startup foundation. Sandbox and team activity cannot count as genuine market evidence.

Consequences: every capability and metric has a plane/status; technical demo success cannot be reported as adoption.

## ADR-R-004 — Orthogonal taxonomy dimensions

Status: Accepted for rebuild

Decision: Listing type, transaction mechanism, work shape, payment obligation/lane, access tier, and category/safety class remain separate dimensions.

Consequences: no universal “archetype” enum may hide quote, dispatch, payment, or safety semantics. A7 quote and A8 emergency are normalized as mechanism/policy overlays rather than identical fulfillment shapes.

## ADR-R-005 — Shared Order and Work separation

Status: Accepted for rebuild

Decision: Order captures accepted commercial/relationship terms. Work Instance captures fulfillment execution. They have separate state machines and events.

Consequences: payment confirmation cannot complete Work; work completion cannot silently settle payment.

## ADR-R-006 — Payment Obligation as accounting boundary

Status: Accepted for rebuild

Decision: Deposits, milestones, final balances, approved reimbursements, purchase budgets, and service/protection fees are Payment Obligations. One obligation uses one lane initially.

Consequences: an Order may have multiple obligations without forcing one payment mode across all work. Mixed tender within one obligation is deferred.

## ADR-R-007 — Four explicit payment lanes

Status: Accepted for rebuild; production connected lanes gated

Decision: Use exactly:

- External Cash
- External Digital Proof
- Direct Digital
- Tiwala Protected Digital

Consequences: UI, schema, events, reports, and support must identify lane. Direct Digital cannot be represented as Tiwala.

## ADR-R-008 — Cash-first low-barrier policy

Status: Accepted for capstone and initial Tagudin pilot

Decision:

- External Cash is supported.
- Platform commission is 0% during capstone and initial Tagudin pilot.
- No cash commission receivable is created.
- Serbizyu does not hold cash or promise automatic cash recovery/refund.
- Small practical jobs remain valid.

Consequences: startup viability measures operating cost, repeat value, and future monetization learning rather than invented cash revenue.

## ADR-R-009 — External Digital Proof is evidence, not custody

Status: Accepted for capstone and initial Tagudin pilot

Decision: External Digital Proof records declared/reference/screenshot evidence and counterparty acknowledgment. Provider verification requires a trusted adapter/API. The lane provides no Tiwala guarantee.

Consequences: evidence states, privacy controls, disclaimers, and disputes are required. Screenshots cannot be labeled cleared funds.

## ADR-R-010 — Protected release starts after completion eligibility

Status: Accepted for sandbox; live use gated

Decision: Tiwala Protected Digital release eligibility begins only after authorized Work completion and sign-off/review eligibility. It requires no active dispute, no relevant hold, reconciled amount, policy snapshot, idempotency, and concurrency safety.

Consequences: no release timestamp derived from Order creation; scheduler only discovers candidates and never bypasses guards.

## ADR-R-011 — No unqualified escrow/legal promise

Status: Accepted

Decision: The product must not call Tiwala legal escrow, insurance, or guaranteed recovery until legal/provider/operational gates pass.

Consequences: sandbox UI uses explicit simulation language; live claims require G6 evidence.

## ADR-R-012 — Append-only financial correction

Status: Accepted

Decision: Money events, fee snapshots, releases, refunds, reversals, and ledger entries are append-only and immutable after posting. Corrections create new linked entries.

Consequences: reconciliation and audit are possible; direct balance overwrite is prohibited.

## ADR-R-013 — Double-entry ledger invariant

Status: Accepted for financial implementation

Decision: Posted financial transactions must balance debits and credits by currency. Every provider/payment/refund/release effect links to a source event and idempotency key.

Consequences: micro-refunds, payout fees, reversals, chargebacks, and corrections must be explicitly modeled rather than hidden in a net amount.

## ADR-R-014 — Webhook authenticity and idempotency

Status: Accepted for provider integration

Decision: Provider events require authenticity validation before financial effect, unique provider-event identity, payload/version recording, reconciliation status, and safe duplicate/out-of-order handling.

Consequences: a webhook endpoint alone is insufficient; provider contract and sandbox evidence remain G6 gates.

## ADR-R-015 — Delegated Agent authority

Status: Accepted

Decision: Agents are scoped platform-management/assistance actors. Permission is explicit, revocable, attributable, and auditable. Cash/goods custody is not granted by default.

Consequences: role assignments cannot be a single mutually exclusive role; consent grants and actor attribution are domain/schema requirements.

## ADR-R-016 — Kiosk assisted-access boundary

Status: Accepted as baseline

Decision: Kiosks are assisted access points, not banks, deposits, cash floats, payout operators, or automatic owners.

Consequences: kiosk capability is conditional on training, attribution, consent, support, and safety operations.

## ADR-R-017 — Offline safety boundary

Status: Accepted

Decision: Offline/low-data drafts may be supported only where safe. Cloud/server authority is required for final Order, payment, release, inventory, consent-sensitive, and irreversible transitions.

Consequences: offline Quick Deal and offline payment remain deferred; retry/replay and conflict handling are required for any future sync.

## ADR-R-018 — Sensitive evidence privacy

Status: Accepted

Decision: Government-ID, payment screenshots, and safety evidence use data classification, least privilege, malware scanning, masking/redaction guidance, access logging, retention/deletion, and legal/dispute holds.

Consequences: evidence metadata and retention are schema/operations requirements; public/authenticated caching must not expose sensitive data.

## ADR-R-019 — Generic fulfillment extension points

Status: Accepted

Decision: A1/A3/A4/A9 form the initial work-shape contract. A2/A5/A6/A8/A10 remain future adapters. Pabili uses an A4 extension rather than a bespoke payment system.

Consequences: future expansion requires activation records and does not require rewriting the core Order/Payment Obligation model.

## ADR-R-020 — Canonical schema inventory

Status: Accepted for rebuild; implementation pending approval

Decision: The rebuilt schema contract defines 42 tables, ownership, constraints, retention, indexes, and migration order. The old 30/31/38/39 claims are superseded.

Consequences: ERD and migrations must derive from `canonical-schema-rebuilt.md`; new tables require a schema decision.

## ADR-R-021 — Event/outbox consistency

Status: Accepted

Decision: Critical domain state changes and the outbox intent are committed transactionally. External delivery is retried asynchronously and is not allowed to create duplicate domain effects.

Consequences: workers, failure queues, idempotency, and operations inspection are required before pilot launch.

## ADR-R-022 — Runtime/deployment decisions remain downstream

Status: Accepted process decision

Decision: Laravel/React/SSR/worker/search/realtime/container/edge choices remain technical candidates until product/domain/schema/operations requirements are complete. No deployment dream becomes a product requirement.

Consequences: the architecture artifact must justify each process against actual pilot requirements, choose a minimum supportable runtime, and document alternatives/rollback.

## ADR-R-023 — Anonymous-only edge caching

Status: Accepted security boundary

Decision: Public edge caching may serve only anonymous-safe content. Authenticated, personalized, payment, identity, evidence, and support responses are not publicly cacheable.

Consequences: cache headers, session isolation, SSR behavior, and tests are architecture/security requirements.

## ADR-R-024 — Operational recovery is part of feature readiness

Status: Accepted

Decision: A pilot capability is not ready until failed events, notification retries, webhook reconciliation, holds, support escalation, backups, restore rehearsal, monitoring, and ownership exist for it.

Consequences: Operations stories are not optional post-launch work; readiness cannot pass on functional happy paths alone.

## ADR-R-025 — Configuration is versioned and snapshotted

Status: Accepted

Decision: Fees, subsidies, lane availability, release rules, retention settings, category restrictions, and safety rules are versioned. Confirmed Orders/Obligations snapshot the applicable policy version.

Consequences: later changes cannot rewrite historical economics or protections; configuration changes require audit and owner.

## ADR-R-026 — No automatic pilot monetization claim

Status: Accepted

Decision: Initial Tagudin pilot success does not require platform revenue. Revenue experiments may occur only with explicit founder/legal/commercial approval and transparent economics.

Consequences: scorecards track operating burden, value, repeat, willingness to pay, and future collectibility rather than fake cash commissions.

## ADR-R-027 — Requirement/story/test traceability

Status: Accepted

Decision: Every committed PRD requirement maps to UX, domain/state, schema/ADR implications, owning story, acceptance test, and evidence class.

Consequences: missing traceability blocks readiness; old story counts are not accepted without a mechanical matrix.

## ADR-R-028 — Founder approval and supersession

Status: Accepted process decision

Decision: A rebuilt artifact becomes authoritative only after founder review. Historical artifacts remain preserved and are labeled historical/superseded rather than silently edited into a new meaning.

Consequences: implementation readiness cannot be claimed while only draft replacements exist; approval and propagation are explicit ceremony outputs.

## ADR approval gate

The ADR catalog is ready for architecture/operations design only when:

- The founder approves the rebuilt product/domain/payment/schema decisions.
- Any open legal/provider questions are represented as gates, not hidden assumptions.
- Runtime/deployment choices remain downstream of operations needs.
- Every ADR has owner, status, alternatives, consequences, and affected artifacts.
- The old catalog is marked historical/superseded after this catalog is accepted.
