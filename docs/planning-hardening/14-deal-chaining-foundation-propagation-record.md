# Deal-Chaining Foundation Propagation Record

Date: 2026-08-01  
Status: PROPAGATED PLANNING EVIDENCE — foundation approved 2026-08-01; count/batch contract extended by the accepted 58-table authority on 2026-08-09; E0-S2 and pilot activation remain gated
Authority: subordinate to the controlling artifact chain in `05-artifact-authority-and-supersession-map.md`

This record captures the propagation of the founder-approved Deal-Chaining direction into the rebuilt planning authorities. It records a bounded coordination foundation, not a migration, catalog, implementation, or pilot-readiness result.

The 2026-08-09 initiative architecture extension preserves the four-table Deal-Chaining boundary but supersedes this record's former 46-table/Batch 000–007 totals with the canonical 58-table/Batch 000–009 contract.

## Changed artifact categories

- **Product and decision authority:** Deal-Chaining is committed as a foundation, with bounded functionality sequenced after the ordinary marketplace spine and pilot activation separately gated.
- **Domain and state contracts:** Added the DealChain, DealNeed, DealDependency, and DealInvitation vocabulary, ownership boundary, lifecycle intent, authorization/acting-for rules, dependency behavior, replacement behavior, and recovery invariants.
- **Schema and ERD authority:** Added the approved four-table foundation inventory, lineage relationship, foreign-key/cardinality intent, constraint/index expectations, optimistic-version/audit/outbox/idempotency requirements, and this labeled companion ERD.
- **ADR and architecture authority:** Propagated coordination-aggregate ownership, independent child-Order boundaries, dependency enforcement, replacement/history preservation, and feature-activation separation.
- **Epic/story/OpenSpec traceability:** Foundation work is represented as its own bounded planning concern; ordinary Request/Quote/Order/Work/Payment contracts are reused rather than replaced.
- **UX and roadmap authority:** The coordination lab is future/conditional and cannot be represented as an initial-pilot promise.

## File-level propagation register

The authority pass covers these bounded planning artifacts (historical originals remain preserved):

- `_bmad-output/planning-artifacts/adr-catalog-rebuilt.md` — ADR-R-029 and its downstream authority scope.
- `_bmad-output/planning-artifacts/architecture-rebuilt.md` — Deal Coordination ownership and E0-S2 schema dependency.
- `_bmad-output/planning-artifacts/prd-rebuilt.md` — PRD-022/BR-011 foundation GO versus later functionality/pilot gates.
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md` — foundation is not a user-facing feature; UX-024 is separate.
- `_bmad-output/planning-artifacts/epics-and-stories-rebuilt.md` — E0-S2 authority note and future-story dependency; Slice 1 unchanged.
- `_bmad-output/implementation-artifacts/connected-frontend-story-integration-matrix.md` — DCL requires a new bounded story/authority update, not E9-S1.
- `openspec/changes/harden-connected-frontend-experience/{proposal.md,design.md,tasks.md,specs/connected-marketplace-journeys/spec.md}` — stale rejection/unresolved wording corrected to foundation/deferred-feature gates without functional requirements.
- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`, `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`, and `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` — canonical four-table chain and lineage authority reconciled/preserved.
- `docs/planning-hardening/07-deal-chaining-foundation-erd.svg` — exactly four foundation entities; companion/planning evidence only.

## Approved model and cardinality

- `users` coordinates many `deal_chains`; a chain has one coordinator boundary and remains a coordination aggregate.
- A `deal_chain` contains an ordered set of many `deal_needs`; each Need belongs to one chain.
- A `deal_need` may participate in directed dependency edges as a predecessor and/or successor through `deal_dependencies`. Edges are same-chain, no self-edges, and cycles are invalid.
- A `deal_need` receives many `deal_invitations`; each invitation targets exactly one Need and one Provider under explicit scope, expiry, response, actor, revocation, and version fields.
- A Need reuses ordinary Requests and Quotes and may have at most one active non-cancelled/non-closed child Order. A child Order remains an ordinary Order with independent parties, terms, Work, Payment Obligations, evidence, disputes, authorization, audit, and idempotency boundaries.
- The parent derives progress and cost summaries. It does not own pooled money, custody, escrow, automatic splitting, automatic liability reassignment, or a parent-wide guarantee.

## Approved invariants

- Invitation acceptance does not itself create an Order; explicit child-agreement formation is separate.
- Dependency validation rejects self-edges and cycles and blocks only named downstream transitions.
- Replacement creates new Need/Order sourcing and link history; it never rewrites or deletes prior child history.
- One child failure does not silently cancel, refund, release, dispute, or reassign sibling children.
- Acting-for commands require an active Owner-scoped consent grant and attributable Agent context; revocation/expiry blocks future commands without rewriting history.
- Every state change carries actor, correlation, idempotency, expected-version, audit, and outbox context.
- Payment confirmation never completes Work, and Work completion never silently proves payment.
- No offline or fixture state is final authority for chain, Order, payment, inventory, consent, or release.

## Unresolved decisions only

The product direction and bounded four-entity model are resolved. Remaining decisions are implementation or activation gates only:

- The final column-level migration manifest, catalog comparison, named constraints/indexes, and database enforcement details must be proven during E0-S2.
- The complete implementation transition matrix, command/event story acceptance set, and operational recovery evidence must be approved before bounded functionality enters delivery.
- Pilot activation thresholds, navigation exposure, support rehearsal, and browser/accessibility evidence for the later coordination capability remain separately to be approved; foundation presence does not activate the feature.

## Explicit E0-S2 blockers

E0-S2 is **BLOCKED** until real tool evidence exists and the following are synchronized and independently reviewed:

1. Domain aggregate, lifecycle, transition, authorization, Agent acting-for, and recovery contracts.
2. Canonical schema table/column/constraint/index definitions, nullable lineage rules, and the observed 47 plus eleven additions = 58 planning inventory.
3. Schema implementation contract, migration batches 000–009, and checksum plan.
4. Relationship-level canonical 58-table ERD plus the focused four-entity Deal-Chaining companion SVG.
5. ADR consequences, architecture module ownership, and the E0-S2 dependency.
6. Epic/story traceability and OpenSpec foundation/deferred-feature gate wording.
7. A PostgreSQL 16 disposable migration rehearsal from empty state and from the observed baseline, with catalog comparison reporting exactly 58 application tables.
8. Constraint/index and negative tests for invalid status/FK, same-chain/self-edge/cycle rules, lineage, idempotency, version conflicts, audit/outbox, and one active child Order per Need.
9. Backup/restore rehearsal with matching migration checksums and a separate implementation-entry approval.

No migrations have been run or authorized by this record. No PostgreSQL catalog proof, live catalog, E0-S2 completion, functional Deal-Chaining readiness, pilot readiness, or pilot activation claim is made. The companion ERD is planning evidence only. This propagation pass changes documentation only; Laravel/PHP, React/TypeScript, package files, standalone frontend, and migrations remain outside scope.
