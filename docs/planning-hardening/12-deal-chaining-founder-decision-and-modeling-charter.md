# Serbizyu 2.0 — Deal-Chaining Founder Decision and Modeling Charter

Status: FOUNDER-APPROVED PRODUCT DIRECTION — domain/schema propagation required before E0-S2
Date: 2026-08-01
Authority: planning-hardening controlling decision under `05-artifact-authority-and-supersession-map.md`
Depends on: rebuilt PRD, domain/state contracts, canonical schema, ADR catalog, architecture, epics/stories, and `harden-connected-frontend-experience`

## 1. Founder decision

Deal-Chaining is a committed Serbizyu product direction.

The controlling interpretation is:

1. **Initial foundation is committed.** The initial domain architecture and canonical schema shall include a bounded Deal-Chain coordination foundation so later activation does not require inventing parent/child semantics or corrupting ordinary Order, Work, and Payment models.
2. **Functional delivery is sequenced later.** The bounded user capability is implemented only after ordinary Request, Quote, Order, Work, and Payment Obligation boundaries are proven.
3. **Pilot activation is separately gated.** The capability remains disabled or absent from normal pilot navigation until its authorization, recovery, operations, and browser evidence pass.

“Deferred” must no longer mean “the feature is rejected” or “no foundation may exist.” It may describe only the sequencing of functional implementation or pilot activation.

## 2. Conflict being resolved

The founder’s intent was “supported from the beginning, developed well later.” Existing artifacts encoded the feature as fully deferred because no approved coordination aggregate, state machine, persistence model, authorization contract, or dedicated story existed. OpenSpec therefore correctly prevented implementation agents from inventing a generic checklist or unsupported parent/child transaction semantics, but that stop condition was repeatedly communicated as a product veto.

This decision resolves product direction. It does not waive the remaining domain/schema design gate.

## 3. Bounded initial capability

The bounded Deal-Chaining model shall coordinate independent work without becoming a pooled transaction or a generic editable checklist.

### Required concepts

- **Deal Chain** — the coordinator-owned parent plan and roll-up boundary.
- **Deal Need** — a required service/product outcome with its own identity, sourcing state, schedule, and fulfillment link.
- **Deal Dependency** — an explicit directed dependency between Needs. Cycles are invalid.
- **Deal Invitation** — direct invitation to a Provider under an explicit lifecycle.
- **Open sourcing link** — a Deal Need may use the existing Request/Quote mechanism rather than inventing a second bidding system.
- **Child Order link** — an accepted invitation or Quote forms an ordinary Order snapshot. Replacement attempts preserve history rather than rewriting the earlier child.

The final cardinalities, lifecycle values, active-link constraints, and replacement semantics must be approved in the domain/schema pass before migrations.

### Required invariants

- Every child Order remains an ordinary Order with its own parties, immutable terms, Work, Payment Obligations, evidence, dispute behavior, authorization, version, audit history, and idempotency boundary.
- Parent progress and cost are derived summaries. The Deal Chain is not the source of Work completion or payment truth.
- Payment confirmation never completes Work, and Work completion never silently proves payment.
- One child failure does not automatically cancel, refund, release, or reassign another child.
- Dependency rules block only named downstream transitions.
- Replacement creates new sourcing/link history; it does not erase a withdrawn, failed, or cancelled child.
- Acting-for behavior requires an active Owner-scoped consent grant and attributable Agent context.
- All state changes carry actor, correlation, idempotency, expected version, audit, and outbox context.

## 4. Explicit exclusions from the bounded foundation

The initial Deal-Chaining model shall not provide or imply:

- pooled parent escrow, wallet, or balance;
- automatic fund splitting or payout allocation;
- automatic liability reassignment;
- automatic parent-wide cancellation/refund cascades;
- a guarantee that one child protects every other child;
- Agent or kiosk custody of cash, goods, credentials, or payment authority;
- offline cryptographic settlement, digital signatures as transaction authority, or air-gapped financial synchronization;
- production connected-payment behavior without the existing G6 gates.

Historical Deal-Chaining documents remain evidence only and may not be used as migration authority.

## 5. Commitment levels

| Level | Commitment | Timing | Evidence gate |
|---|---|---|---|
| Architecture/schema foundation | Committed | Before E0-S2 migration baseline is approved | Domain aggregate, state machine, schema/ERD, ADR, catalog/constraint review |
| Bounded functional capability | Committed | Later vertical-slice epic after ordinary marketplace spine is proven | Hardened BMAD stories, OpenSpec scenarios, TDD, authorization/recovery/operations tests |
| Pilot activation | Conditional | After feature implementation and operations rehearsal | Browser/accessibility, isolation, failure/replacement, support, observability, founder activation |
| Connected money or sensitive evidence expansion | Blocked pending existing gates | Future only | Provider/legal/financial/privacy/operations approval |

## 6. Current ERD effect

The existing 42-table ERD remains a coherent planning baseline for the previously approved core. It is not yet execution-proven: no E0-S2 migrations, PostgreSQL catalog comparison, negative-constraint suite, backup/restore rehearsal, or migration checksum evidence has passed.

Because the 42-table model contains no Deal-Chain coordination aggregate, it is no longer the final E0-S2 migration authority after this founder decision. E0-S2 is blocked until the following are synchronized:

1. Domain aggregate and state contracts.
2. Canonical schema table/column/constraint/index definitions.
3. Schema implementation contract and migration batches.
4. Relationship-level ERD and rendered SVG.
5. ADR consequences and architecture module ownership.
6. Epic/story traceability and OpenSpec requirement/scenario changes.
7. Updated readiness evidence and table-count assertions.

The final additional table count is not decided by this charter. It must be derived from approved cardinalities and history requirements rather than forced into a preselected number.

## 7. Required propagation order

1. Update the contradiction/supersession record and pilot capability status.
2. Modify the rebuilt PRD so product direction is committed while activation remains gated.
3. Add Deal Chain aggregate vocabulary, lifecycle, commands, events, invariants, authorization, and recovery to domain/state contracts.
4. Define schema tables, FKs, delete behavior, uniques, checks, partial indexes, optimistic versions, audit/outbox causality, retention, and migration order.
5. Update the schema implementation contract and regenerate the relationship ERD/SVG.
6. Add or revise ADRs for aggregate ownership, child-Order linkage, dependencies, and activation.
7. Update architecture module boundaries, commands/queries/events, jobs, operations inspection, and feature flags.
8. Add a dedicated bounded Deal-Chaining epic/story set rather than mislabeling an unrelated E9 story.
9. Modify OpenSpec Gate D from “decide whether the feature exists” to “approve and implement the concrete bounded model.”
10. Re-run mechanical traceability and readiness audits before E0-S2.

No single downstream OpenSpec or migration may silently perform this entire propagation.

## 8. Implementation guardrails

Every Deal-Chaining implementation story shall use the normal Serbizyu delivery contract:

- founder-approved BMAD source and hardened story;
- linked OpenSpec requirements, Given/When/Then scenarios, and recovery paths;
- Context7 lookup against locked Laravel/Inertia/PostgreSQL/library versions for changeable API behavior;
- tests written with or before the behavior at command/domain boundaries;
- Pest architecture/unit/integration tests, PostgreSQL catalog/constraint tests, and Playwright browser journeys where applicable;
- PHPStan/Larastan, Pint, TypeScript, ESLint, Prettier, dependency/security audit, secret scan, and CI;
- separate specification-compliance and code-quality reviews;
- no feature completion claim based only on source presence, a green compile, or a mock screen.

## 9. Immediate project-management consequence

- E0-S1 application skeleton may continue because it does not create the canonical product schema.
- E0-S2 shall not start until this decision is propagated and the revised ERD/schema contract passes an independent evidence-only review.
- E0-S3/E0-S4 planning may continue, but no fixture or feature code may invent Deal-Chaining semantics before the updated contracts are approved.
- The existing `frontend/` remains reference evidence; any Deal-Chaining lab there remains non-production until it is reconciled to the bounded model.
