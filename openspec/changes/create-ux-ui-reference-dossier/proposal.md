# OpenSpec Change: Create Comprehensive UX/UI Reference Dossier

Status: DRAFT FOR FOUNDER/DESIGNER REVIEW
Change ID: `create-ux-ui-reference-dossier`
Capability status: FOUNDATION / REFERENCE-ONLY

## Problem

The current disposable mockup is too feature-reporting oriented. It names capabilities and routes, but does not adequately show what each actor is trying to do, what they see at each point, what decisions they must make, what failure/recovery looks like, or how a state change is perceived by another role.

A future design agent should not have to infer these details from the 74-screen bridge, the historical mockup, or the PRD. We need a dedicated reference artifact that captures the intended user perspective and interaction detail before another visual mockup is designed.

## Scope

Create a comprehensive, design-agent-readable UX/UI reference workspace covering:

- A main perspective and flow dossier.
- A 74-screen perspective matrix with one row per canonical screen ID.
- Nine connected scenario blueprints for `SCN-01` through `SCN-09`.
- Actor archetypes and access contexts.
- Information architecture and route organization.
- Screen anatomy and hierarchy.
- Buyer, Provider/Owner, Agent, Admin/Operator, assisted-user, and evaluator perspectives.
- End-to-end journeys for discovery, listing, request/quote, Order, Work, payment lanes, evidence, completion, dispute, safety, support, and recovery.
- A1, A3, A4, A4 purchase-on-behalf conditional, and A9 Work shapes.
- External Cash, External Digital Proof, Direct Digital sandbox, and Tiwala sandbox semantics.
- Loading, empty, validation, permission, offline, retry, stale, mismatch, disputed, hold, corrected, and deferred states.
- Low-literacy, low-data, assisted-access, consent, privacy, safety, and support details.
- Cross-role visibility: what changes for the other parties after an action.
- Traceability to the canonical PRD, UX, domain/state, and mockup bridge IDs.
- Concrete review tasks for the later visual designer.

## Non-goals

- No backend implementation.
- No production React/Laravel architecture.
- No real payments, identity verification, messaging, storage, or location services.
- No replacement of the canonical PRD, UX specification, domain/state contract, schema, ADRs, or implementation stories.
- No commitment to a final visual style, exact component library, or final screen count.
- No promotion of `docs/mockup-v2/` as accepted product design.

## Source order

1. Founder-approved BMAD planning artifacts.
2. `ux-spec-rebuilt.md`.
3. `domain-state-contracts-rebuilt.md`.
4. `prd-rebuilt.md`.
5. `mockup-experience-expansion-bridge.md`.
6. This UX/UI reference workspace for design perspective, UI detail, review tasks, and handoff.
7. Historical mockup only for visual inspiration, never behavior or product truth.

## Approval question

Does the reference workspace sufficiently describe the user-facing experience for a separate design agent to produce a stronger low-fidelity connected reference mockup without inventing product behavior or asking the founder to restate the flows?
