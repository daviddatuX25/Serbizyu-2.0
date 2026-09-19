# Tasks: Establish the frontend view-projection kernel

Status: PROPOSED — implementation intentionally unchecked  
Change: `establish-frontend-view-projection-kernel`

## Execution rules

- Work in the existing `resources/js` tree.
- Preserve production Laravel/Inertia auth and existing backend behavior.
- Add no dependency.
- Do not edit role/view/state behavior into the static mobile HTML prototype.
- One task closes only with its named behavior and narrow verification.
- Stop on a canonical product/domain conflict; represent unresolved policy as unavailable rather than choosing it in code.

## Phase 0 — Authority and baseline

- [ ] 0.1 Record the current production routes, Inertia props, Listing detail actions, and affected tests without treating the HTML prototype as behavior authority.
- [ ] 0.2 Approve the feature architecture and `VP-BRW-001`, `VP-BRW-002`, `VP-LST-001`–`VP-LST-006` matrix rows.
- [ ] 0.3 Mark `harden-connected-frontend-experience` as a program requirement inventory whose implementation paths/tasks are superseded by child OpenSpec packets.

### Gate 0

Implementation does not begin until the feature spine and first-slice matrix rows are accepted.

## Phase 1 — Contract seam

- [ ] 1.1 Add branded canonical IDs, structured principal/effective-Owner/current-grant/access-purpose context, Listing relationships, evidence/data-origin class, complete projection query identity, and exhaustive status types.
- [ ] 1.2 Add the registered Listing projection schema, discriminated available-versus-disabled action descriptors, and typed error/result contracts.
- [ ] 1.3 Add the bounded `ActionDispatchRegistry` and untrusted `CommandIntent`; keep trusted principal/Owner/grant/policy fields out of browser input.
- [ ] 1.4 Add the minimal `MarketplaceGateway` projection/intent port with unsupported-version and registry-mismatch recovery.
- [ ] 1.5 Add compile-time exhaustive checks preventing Request/Quote actions from entering the Listing registry/union.
- [ ] 1.6 Add type/contract tests for serialized omission, version identities, unsupported envelope versions, disabled actions without targets, and typed errors.

### Gate 1

No new screen component may receive raw fixture records, dual snake/camel values, or generic string action codes.

## Phase 2 — Deterministic repository

- [ ] 2.1 Add `ScenarioSnapshotV1` with synthetic origin, stable users, capabilities, grants, Listings, Listing Versions, immutable source versions, row revisions, repository revision, idempotency results, events, clock, review perspective, and evidence class.
- [ ] 2.2 Add immutable synthetic fixtures covering active direct product, active quote-based service, paused/unavailable Listing, Owner, unrelated member, and authorized/expired Agent grant.
- [ ] 2.3 Add `ScenarioClock`, schema/origin validation, environment/evidence/scenario/schema-namespaced storage adapter, repository load, compatible migration hook, explained failure/reset/export, and exact deterministic reset.
- [ ] 2.4 Add guarded dispatch with registry validation, repository-derived execution context, overlap/self-dealing denial, copied next-state validation, expected row revision, idempotency replay/conflict, event append, repository CAS, and atomic aggregate/event/result commit.
- [ ] 2.5 Test refresh persistence, reset equality, corrupt/quota/CAS failure atomicity, grant expiry, stale rejection, idempotent replay, semantic-key conflict, event attribution, and non-synthetic data rejection.

### Gate 2

A failed or unauthorized command produces no aggregate version change and no success event. Reset deep-equals the canonical fixture.

## Phase 3 — Projection and adapters

- [ ] 3.1 Implement pure Listing relationship derivation for guest, member, Owner, and acting Agent.
- [ ] 3.2 Implement `listingProjector` for matrix rows `VP-BRW-001`, `VP-BRW-002`, and `VP-LST-001`–`VP-LST-006`.
- [ ] 3.3 Assert unauthorized facts are absent from serialized projections, not merely hidden in rendered DOM, and that async context changes discard stale projections.
- [ ] 3.4 Implement `ScenarioMarketplaceAdapter` over the synthetic repository and shared registries.
- [ ] 3.5 Implement Laravel server-side Listing purpose projection; make `InertiaMarketplaceAdapter` validate/translate only the safe registered envelope.
- [ ] 3.6 Add contract tests proving both adapters satisfy the same schema/action/result registry and unknown versions fail without commercial actions.
- [ ] 3.7 Add an import-boundary check preventing production composition from importing `scenario/**`.
### Gate 3

Both adapters satisfy the same gateway contract. Production authority is not simulated; missing production capabilities remain omitted/unavailable.

## Phase 4 — React composition and one migrated screen

- [ ] 4.1 Add gateway composition/context without changing unrelated pages.
- [ ] 4.2 Refactor Listing detail presentation to consume `ListingDetailProjection` and render the supplied actions.
- [ ] 4.3 Remove Listing action inference based on `listingType` string, `booking.is_owner`, and local CTA construction from the presentation component; keep adapter translation at the boundary.
- [ ] 4.4 Preserve existing production booking route behavior, pin behavior, visual hierarchy, denial recovery, responsive layout, and accessibility names.
- [ ] 4.5 Add Scenario Lab only through a server/build-controlled, explicitly activated reviewer composition; require reviewer authorization and synthetic-origin state on a production-isolated origin/application.
- [ ] 4.6 Keep Scenario Lab absent from consumer navigation/build dependencies and ensure it has no production cookies, APIs, storage, cache, service worker, or real mutation request.
- [ ] 4.7 Update affected component tests to assert consumer-observable actions and denial behavior.

### Gate 4

The same Listing screen renders production and deterministic projections. The component contains no relationship/permission policy and cannot render an action not supplied by the projection.

## Phase 5 — Behavioral verification

- [ ] 5.1 Run the affected Vitest contract/component tests.
- [ ] 5.2 Run TypeScript, ESLint, and Prettier checks on changed frontend paths.
- [ ] 5.3 Run the narrow Laravel/Pest tests covering the production Listing detail route and booking projection.
- [ ] 5.4 Build the production Vite artifact.
- [ ] 5.5 Use Playwright/browser verification at desktop and 360–375px for the real Listing route and Scenario Lab guest/member/Owner/Agent perspectives.
- [ ] 5.6 Verify refresh persistence, exact reset, unavailable recovery, and expired grant behavior.
- [ ] 5.7 Verify consumer navigation/session contains no reviewer switch or fixture control.
- [ ] 5.8 Save CAPSTONE-classified evidence and record unresolved UI/domain findings without expanding this change.

### Gate 5

All `FVPK-REQ-*` scenarios pass. No Request/Quote behavior or second frontend runtime has entered scope.

## Completion handoff

After this packet passes, create `separate-listing-request-views`. It must consume these contracts rather than add direct role checks to Browse or detail components.