# Establish the frontend view-projection kernel

Status: PROPOSED — first implementation child of the frontend-first architecture  
Date: 2026-09-08  
Change ID: `establish-frontend-view-projection-kernel`  
Implementation plane: React/Inertia production frontend plus reviewer-only deterministic Scenario Lab

## Why

Serbizyu has a working Laravel/Inertia/React foundation and a strong visual mobile prototype. Role-, resource-, and state-dependent behavior is currently unsafe to keep adding directly to the static HTML or to broad components that infer actions from raw records.

This change establishes the smallest reusable seam needed for frontend-first product discovery:

- purpose-specific view projections;
- resolved action descriptors;
- separate production and simulation adapters;
- normalized deterministic JSON state;
- reviewer-only perspective switching;
- guarded, versioned, idempotent simulated commands; and
- one Listing projection proving the seam without redesigning the product.

## Authority and trace

- Parent architecture: `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md` AD-1, AD-4–6, AD-12, AD-18, AD-20, AD-27.
- Feature architecture: `_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/ARCHITECTURE-SPINE.md` AD-1–13.
- Solution design: `_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/FRONTEND-FIRST-SOLUTION-DESIGN.md` §§3–6.
- Matrix: `_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/VIEW-PROJECTION-MATRIX.md` `VP-BRW-001`, `VP-BRW-002`, `VP-LST-001`–`VP-LST-006`, state overlays, and action-leak assertions.
- Canonical UX: `_bmad-output/planning-artifacts/ux-spec-rebuilt.md` UX principles and UX-002/004/005/031.
- Canonical domain: `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` Listing state machine and authorization invariants.
- Program inventory: `openspec/changes/harden-connected-frontend-experience/` CFP-REQ-001–010 and CMJ-REQ-001–002.

## Scope

1. Add versioned projection, action, viewer, relationship, command-envelope, and typed-error contracts under `resources/js`.
2. Add a frontend gateway/composition seam that can select production or reviewer simulation without changing screen components.
3. Add a minimal schema-versioned normalized Scenario repository with immutable Listing fixtures, deterministic time, events, versions, migration/reset, and namespaced storage.
4. Add a reviewer-only Scenario Lab route/surface separated from product session state and consumer navigation.
5. Add pure Listing projection logic for guest, unrelated member, Owner, and authorized acting Agent.
6. Adapt the existing Listing detail to consume the projection-owned action set for the implemented path; preserve current real Laravel behavior.
7. Add behavioral and browser evidence for projection privacy, forbidden action leakage, stale version, idempotency, refresh, and reset.

## Non-goals

- No Request/Quote/Bid implementation; that is the next vertical change.
- No migration, database schema change, new backend aggregate, or production permission policy.
- No replacement of Laravel authentication or Inertia routing.
- No Svelte or second frontend application.
- No live SMS, identity evidence, payment, Tiwala, QR, realtime, or production pilot behavior.
- No role/state expansion in `docs/design-kit/browse-mobile.html` or `public/browse-mobile.html`.
- No attempt to mirror all 58 backend tables in JSON.

## Success

The change is complete when the existing production Listing path remains operational, a reviewer can open the same deterministic Listing from authorized perspectives without changing product login, each perspective receives only its allowed facts/actions, direct forbidden commands fail, refresh preserves state, reset restores the exact fixture, and no consumer component imports fixture storage.