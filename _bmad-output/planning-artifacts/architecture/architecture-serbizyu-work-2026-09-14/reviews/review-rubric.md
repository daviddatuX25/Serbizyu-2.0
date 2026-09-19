# Work Architecture Spine — Good-Spine Rubric Review

## Verdict

**Incorrect — not ready for handoff without the high-priority corrections below.** The spine has a strong accountability model, bounded shape strategy, source/template separation, immutable specification envelope, and broad scenario headroom. The remaining gaps are not stylistic: they leave boundary consumers, deferred shapes, payment policies, and failure handling open to incompatible implementations.

## What passes the rubric

- **Real divergence points:** WAD-1 through WAD-14 cover the important Work-specific seams: authority ownership, Order/Work/Chain cardinality, finite shape contracts, canonicalization, templates, session separation, formation atomicity, event-driven execution, bounded internal topology, amendments, payment separation, evidence/safety/privacy, adapters, and version dimensions.
- **Rule/Prevents fit:** Most rules are enforceable and name the divergence they prevent. The relational-provider and same-Order constraints, immutable hashes, typed formation plan, no-executable-payload rule, and adapter boundary are particularly useful.
- **Seed discipline:** The document generally distinguishes code-owned invariants from structural seed: it allows equivalent schema names, makes templates optional, and puts implementation sequencing in a delivery order rather than pretending the current PHP is authoritative.
- **Scenario coverage:** The companion corrects the 100-case claim to 79 located cases, rejects universal Deal Chains, and covers ordinary bilateral work, multiple providers, hard windows, custody, digital artifacts, batches/lots, sensitive data, partial fulfillment, and deferred rental/dispatch/recurrence/program semantics.

## Findings

### HIGH — Make deferred shape codes fail closed at every boundary

**Citations:** `ARCHITECTURE-SPINE.md` § WAD-3 (lines 138–159), § WAD-5 (lines 201–210), and § Verification Gate (lines 459–471); `WORK-SCENARIO-COVERAGE.md` § Scenario Family Matrix (lines 69–73) and § Coverage Result (lines 174–180).

A2, A5, A6, and A10 are labeled `Deferred` and the companion correctly says they must not be emulated by A4/A1/etc., but no normative rule currently excludes those codes from active capability profiles or specifies the result of receiving them at authoring, normalization, formation, or execution. The verification gate says they must eventually be rejected, but a downstream unit can still treat a known deferred code as an A1/A3/A4 payload, reserve the wrong capacity, or create obligations with the wrong lifecycle; another unit can reject it. Add an explicit WAD-3 rule that deferred codes are absent from active allow-lists and every source/port/registry/finalizer/command path returns one stable inactive/unsupported result with no Work, reservation, or obligation effect; activation must require a separately versioned contract and policy promotion.

### HIGH — Specify one formation event/outbox contract per child aggregate

**Citations:** `ARCHITECTURE-SPINE.md` § WAD-7 (lines 222–242), § Data Model Consequences (lines 372–382), and § Current Implementation Delta (lines 405–416).

WAD-7 requires an atomic outbox write but does not define the canonical event vocabulary, cardinality, payload keys, or consumer routing for each accepted Work Instance and Payment Obligation. The document itself records that the current finalizer emits only `order.accepted` and lacks complete per-Work/per-obligation facts. Without a required per-child contract, independently built DealCoordination, PaymentObligations, and projection consumers can either wait for events that never arrive or infer children from an order-level event, producing silent omissions or duplicate/reordered facts. Name the versioned formation events (one explicit event/fact for each created Work and obligation, with Order/Work/obligation and specification keys), require them to be committed in the same outbox transaction, and define the inherited sequence, inbox/deduplication, gap, and unsupported-version handling for their consumers.

### HIGH — Carry all applicable inherited runtime, security, activation, and projection constraints into this feature spine

**Citations:** `ARCHITECTURE-SPINE.md` § Inherited Invariants (lines 44–59), § WAD-8/WAD-12/WAD-13 (lines 244–308), and § UI Handoff Boundaries (lines 444–457). The binding parent rules are platform AD-18, AD-19, AD-24, AD-27, AD-28, and AD-29; the binding frontend rules include projection AD-4–AD-6, AD-10, AD-14–AD-18, and AD-20.

The inherited table carries only platform AD-4–AD-9 and AD-25/AD-26 plus frontend AD-20/AD-22, while the Work scope includes execution workers, adapters, evidence, payment facts, conditional activation, and UI sessions. The local rules therefore do not state the required operational envelope (health/alerts, retry/dead-letter/support inspection, reconciliation, retention, backup/restore, rollback, and environment separation), immediate deny re-evaluation, evidence/webhook security and maker/checker approvals, or the server-shaped relationship-scoped projection/action contract. One downstream unit can ship a happy-path worker or raw Work UI while another implements the parent safeguards, despite both conforming to this document's explicit local bindings. Expand `Inherited Invariants` with every applicable parent/projection AD and give each a Work-specific consequence; explicitly bind the UI handoff and execution delivery to those inherited contracts rather than relying on the sentence that the spine merely narrows the parent.

### HIGH — Constrain obligation due-condition policies to code-owned evaluators

**Citations:** `ARCHITECTURE-SPINE.md` § WAD-3 (lines 138–160), § WAD-4 (lines 162–199), § WAD-7 (lines 222–242), and § WAD-11 (lines 280–286).

WAD-11 allows an obligation to use a “finite set or predicate” of Work/fact keys, but it does not say that predicates are code-owned, allow-listed, versioned evaluators or define their typed input and conjunction/disjunction semantics beyond a brief sentence. WAD-3 bans executable predicates only inside Work payloads, so a builder can put an arbitrary expression in a due-condition policy while another uses hard-coded facts; payment release can then differ for the same accepted Work, especially for multiple Work and partial/failure outcomes. Require every due condition to reference a retained, code-owned policy ID/version whose evaluator accepts only typed verified fact keys and an explicit bounded operator/cardinality vocabulary; unknown policy versions must fail closed and the immutable policy snapshot must be part of the obligation lineage.

### MEDIUM — Define partial fulfillment and mismatch as explicit launch-shape semantics

**Citations:** `WORK-SCENARIO-COVERAGE.md` § Cross-cutting Flexibility Requirements / Failure, cancellation, and replacement (lines 131–138), the counter mismatch scenario (lines 49–55), and the coffee-cart scenario (lines 79–82); `ARCHITECTURE-SPINE.md` § WAD-8 (lines 244–250), § WAD-10 (lines 267–278), and § Verification Gate (lines 461–469).

The companion marks partial fulfillment as required and explicitly keeps a counter shortage in the same A4 Work, but the spine leaves partial/mismatch behavior to each shape's future policy without defining a shared fact/state, completion rule, capacity effect, or obligation input. A4 and A1 implementers can therefore create a second Work, mark the original complete with a shortage, or leave it pending/reconciliation-required, and all choices appear compatible with WAD-8/WAD-10. Add a launch-shape contract requirement for a typed partial/mismatch fact and guarded transition (whole Work is not complete), including explicit capacity and obligation-policy inputs and the no-implicit-child-Work rule; each A1/A3/A4/A9 contract must either implement it or explicitly reject the capability profile that needs it.

## Smallest handoff sequence

1. Add the fail-closed deferred-shape rule and the code-owned due-condition policy rule.
2. Add the per-child formation/outbox event contract and consumer routing semantics.
3. Expand inherited invariants and tie execution/UI delivery to the parent operational, security, activation, and projection rules.
4. Resolve partial/mismatch semantics in the launch shape contracts and coverage matrix.

After those changes, rerun the same rubric against the amended spine and its companion; no broad rewrite of the existing WAD model is needed.
