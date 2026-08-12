# Deal-Chaining ERD and Schema Audit

Date: 2026-08-01
Status: CONDITIONAL BLOCKER for E0-S2
Authority: independent read-only audit of the canonical planning chain

## Verdict

The existing 42-table claim is internally consistent across the current canonical schema inventory, schema/ERD implementation contract, and rendered ERD. A mechanical comparison found:

- 42 canonical table names;
- 42 unique names;
- 42 names in the implementation contract;
- 42 ERD entities;
- no missing or extra names between those three sources.

This is planning-level consistency, not executable database proof. The repository has no `database/migrations/**`, catalog report, rollback rehearsal, or backup/restore evidence yet.

The founder-approved Deal-Chaining decision makes the current 42-table baseline stale for E0-S2. E0-S2 must not begin against the unchanged manifest.

## Bounded foundation

Add four coordination entities:

1. `deal_chains` — coordination container, never an Order, wallet, escrow, or financial account.
2. `deal_needs` — ordered child requirement/slot within a chain.
3. `deal_dependencies` — directed `blocks` edges between needs, with self-edge rejection, same-chain composite FKs, active-edge uniqueness, and application/database cycle prevention.
4. `deal_invitations` — provider invitation for a specific Need, with expiry, response state, actor attribution, and idempotent acceptance that does not itself create an Order.

Expected baseline after this foundation: 46 tables.

## Existing-table linkage

Reuse the existing normal transaction model rather than creating parallel financial systems:

- `requests`: nullable chain/need linkage; both linkage columns null or both non-null;
- `quotes`: explicit chain/need linkage or enforced derivation through the linked Request;
- `orders`: nullable chain/need linkage, `origin='deal_chain'`, and at most one active non-cancelled child Order per Need;
- `order_terms_snapshots`: immutable accepted child terms;
- `work_instances`, `payment_obligations`, `evidence_files`, `disputes`, and `order_parties`: child Order-scoped and independent.

There must be no parent-level payment obligation, pooled balance, automatic split, offline financial authority, or parent cancellation cascade that deletes child truth.

## Required invariants

- DealChain is coordination, not commerce settlement.
- A Need may have many Requests/Quotes but at most one active child Order.
- A child is an ordinary Order with explicit Deal-Chaining origin.
- Parent roll-up is derived and cannot overwrite child state.
- Replacement cancels/supersedes prior child Orders without deleting history.
- Dependencies cannot self-reference or form cycles.
- Invitations, Need transitions, child-order creation, and cancellation are actor-attributed, audited, idempotent, and outbox-backed.
- No offline client authorizes final chain, Order, payment, inventory, consent, or release state.
- Schema presence does not activate the capability for the pilot.

## Existing ERD corrections required

Before catalog-to-ERD verification, correct relationships already promised by the schema contract:

- Listing → Request;
- User → Order Party;
- Work → Evidence;
- Provider Event → its obligation/financial target;
- Retention Hold → all protected subject classes;
- Safety Incident and Review actor/subject relationships;
- audit, outbox, and idempotency as cross-aggregate infrastructure rather than misleading parent-child edges.

## P0/P1 blockers

P0:

- founder decision is not yet propagated through canonical schema, domain, ADR, architecture, ERD, and E0-S2 manifest;
- no executable migration/catalog/rollback/restore evidence;
- per-table DDL remains under-specified for several existing tables.

P1:

- relationship-level ERD omissions/misrepresentations;
- aggregate target and causal linkage for audit/outbox/idempotency need explicit implementation rules;
- retention/privacy enforcement remains policy-level;
- financial posting/balancing procedure has no executable implementation or negative tests.

## Required propagation before E0-S2

Update the canonical schema, schema/ERD implementation contract, SVG ERD, domain-state contracts, ADR catalog, architecture, E0 story contract, PRD/epics where Deal-Chaining is currently fully deferred, pilot capability matrix, README, frontend mockup planning statement, and P0 closure evidence. Then regenerate the table manifest and review all migration batches before writing migrations.
