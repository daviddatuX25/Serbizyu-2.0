---
name: Serbizyu Platform Founder Decision Brief
status: accepted
created: 2026-08-09
accepted: 2026-08-09
architecture: ARCHITECTURE-SPINE.md
implementation_plan: PROGRAM-IMPLEMENTATION-PLAN.md
---

# Serbizyu Platform — Founder Decision Brief

## Decision

Plan the **full platform contract now** and build it through dependency-ordered capability trains. This avoids ad hoc later extensions without forcing every capability into one coupled launch.

**Acceptance record (2026-08-09):** the founder chose the full contract with phased implementation, all four Work shapes now, governed category management, account-scoped integrations, bounded complete Deal-Chaining, detailed customer UX/LoFi contracts with backend LLDs, and Xendit as the first sandbox adapter behind a provider-neutral port. Canonical authority propagation is complete; this does not authorize live-money or customer activation.

## What the platform contract includes

- Governed category and capability activation.
- Service/Product Listings and Requests.
- Direct Booking, Quote Request, Reverse Bidding, and online Quick Deal.
- Ordinary immutable Orders.
- A1 Linear Project, A3 Appointment, A4 Handoff, and A9 Digital Delivery Work.
- External Cash, External Digital Proof, Direct Digital sandbox, and Tiwala Protected Digital sandbox.
- Evidence, disputes, holds, support, messaging/notification fallback, operations, and recovery.
- Complete bounded Deal-Chaining using independent ordinary child Orders.
- Account-scoped integrations for listing creation/update, stock/capacity synchronization, authorized reads/commands, and signed events.
- A controlled handoff seam for future AI features using the same authorization and command rules.

## Non-negotiable boundaries

1. Serbizyu owns marketplace truth; external apps synchronize but do not override it.
2. Order, Work, Payment Obligation, Evidence, Dispute, Consent, and Hold remain separate.
3. Payment never proves Work completion.
4. Bidding, Quick Deal, and Deal-Chaining form or coordinate ordinary Orders; they do not create parallel Order systems.
5. All four Work shapes share a common lifecycle but retain shape-specific rules and payloads.
6. Category management is governed activation, not unrestricted CRUD.
7. Xendit is the first sandbox adapter, not the payment domain.
8. Tiwala remains sandbox-only and must not be described as legal escrow.
9. AI and external integrations use revocable account-scoped service principals and the same application policies as first-party UI.
10. No capability is complete without denial, retry, recovery, admin inspection, monitoring, backup/restore, and disable behavior.

## Why this is not restrictive

The design fixes **stable boundaries**, not a narrow feature list. New providers, mechanisms, Work shapes, categories, clients, and AI tools plug into explicit ports and governed capability profiles. Extension is deliberate and testable rather than one-off.

## Why this is not a big-bang release

Architecture breadth and release breadth are different:

- The architecture supports the complete intended platform.
- Delivery trains stabilize prerequisites before dependents.
- Conditional/sandbox capabilities may be executable without being customer-activated.
- Polished frontend follows stable backend contracts, while detailed UX/LoFi contracts are written alongside each backend LLD.

## Acceptance boundary

This final architecture package authorizes dependency-ordered LLD/OpenSpec preparation and implementation only after each train's readiness gate. It does **not** authorize:

- Production Xendit credentials or live money movement.
- Legal escrow claims.
- Air-gapped irreversible Quick Deal.
- Organization/team tenancy before a separate ownership decision.
- A customer-facing Deal-Chaining launch before ordinary Order/Work evidence and its activation review.
- Permanent integration migrations/endpoints before the T9 LLD/OpenSpec, completed prerequisites, and readiness gate.

## Final operational decisions

- **Activation:** any current matching deny is absolute; no narrower enable overrides it. Conditional effects require an explicit enable, no matching deny, non-overlapping effective range, and a mutation-time recheck.
- **Credentials:** recent owner step-up covers issuance/rotation within approved scopes, scope reduction, and immediate revocation. Scope expansion, environment changes, and webhook-signing-secret changes also require an independent Operations checker; emergency revocation never waits.

## Immediate next milestone

1. Produce and pass the T0/E0-S2 LLD/OpenSpec for the 47→58 Batch 0–9 migration, catalog/constraint proof, rollback, and restore rehearsal.
2. Implement T1 only after T0: actor context, command/idempotency/audit/outbox/inbox, workers, activation, approvals, and operations kernel.
3. Implement T1A phone onboarding, identity/delegation/consent, then T2 governed category/listing/capacity/discovery.
4. Only then implement the T3 ordinary final-agreement seam used by every later mechanism.
