# First Connected Vertical Slice — Identity to Service Listing

Date: 2026-08-01
Status: PM/Lead Engineer implementation brief; code not started by this artifact
Canonical sequence: `E0-S1–S4, E1-S1–S2, E2-S1, E2-S5`
Evidence target: Provider registers/enters a deterministic local session, completes applicable readiness, creates and submits a Tagudin Service Listing, Buyer discovers and opens it, unauthorized actions are denied, and refresh preserves state.

## Authority and boundaries

This brief is subordinate to BMAD story contracts, OpenSpec requirements/scenarios/tasks, the schema implementation contract, and the final Deal-Chaining foundation decision. If a lower-level document conflicts, stop and report the conflict; do not infer a new product rule.

Production structure is the root Laravel modular monolith with React/Inertia under `resources/js`. The standalone `frontend/` remains reference-only and must not be modified by this slice.

This slice is CAPSTONE/SANDBOX only. It must not claim pilot or production readiness and must not implement:

- real SMS/OTP, passwords, or identity-provider integration;
- government-ID collection or sensitive evidence storage;
- live payment, escrow, payout, custody, or financial-provider integration;
- real search-provider integration;
- Quick Deal or Deal-Chaining user-facing functionality;
- Admin self-assignment, Agent impersonation, or global Buyer/Provider role switching.

Mock authentication must be visibly simulated and must not store secrets or plaintext credentials.

## Required outcome

A browser can complete this path against the root Compose stack:

1. Open the fictional welcome/login boundary.
2. Enter a deterministic fixture identifier.
3. See explicit `Demo only — no SMS was sent` language.
4. Complete a simulated challenge using a fixture-safe path.
5. Resume or complete onboarding/readiness; mock session and onboarding progress are fixture/local state unless represented by existing canonical durable tables.
6. Select additive capability intent without switching persona.
7. Enter the Provider/Owner listing workspace.
8. Create a Service Listing draft with server-side validation.
9. Save/reload the draft without losing state.
10. Submit a valid listing, create an immutable Listing Version, and move the listing to `pending_review`.
11. Assert that the submitted-but-unapproved listing is not public; open public Browse as a Buyer and find a deterministic pre-approved active Tagudin fixture (or an explicitly test-only approval fixture).
12. Open listing detail and verify owner-safe/public-safe projection.
13. Attempt an unauthorized owner action and receive a safe denial with correlation ID.
14. Refresh each important route and retain or recover state.
15. Inspect audit/event evidence for state-changing commands.

## Stories and evidence mapping

### E0-S1–S4 — foundation

The existing root skeleton must remain the runtime boundary:

- module seams and dependency direction;
- shared command/query/event/error envelopes;
- correlation ID propagation;
- authorization context;
- idempotency contract;
- environment validation and fail-closed readiness;
- Docker Compose reproducibility;
- test and CI gates.

No controller may mutate domain state directly. Controllers/Inertia pages call application commands/queries; repositories/adapters own persistence boundaries.

### E1-S1 — User account and access tiers

Required behavior for this slice:

- deterministic fixture account/session only;
- session source visibly `mock_login` or equivalent fixture source;
- session expiry and signed-out denial have explicit recovery;
- capabilities are additive records/derived permissions, not mutually exclusive persona switching;
- unauthorized state-changing action is denied server-side;
- no user can assign Admin capability through onboarding;
- actor, correlation ID, command ID, and evidence class are available to audit context.

### E1-S2 — Provider/Buyer profile and privacy controls

Required behavior for this slice:

- persist only durable profile/readiness facts represented by existing canonical tables (`users`, `user_profiles`, `role_assignments`, `identity_verifications`, and listing tables);
- mock session/onboarding progress remains fixture/local state unless an existing canonical durable table represents it; do not invent `onboarding_progress`;
- safe Tagudin area and language/accessibility preferences;
- public listing projection excludes private profile fields;
- profile/privacy view has an explicit boundary between public and protected data;
- sensitive reads are attributable if implemented in the slice.

### E2-S1 — Service Listing lifecycle

Required behavior:

- Provider/Owner can create a draft Service Listing;
- draft validation explains missing/invalid fields without claiming publication;
- listing remains Owner-owned even when acting-for context exists;
- submit creates an immutable Listing Version and transitions the listing from `draft` to `pending_review`;
- lifecycle is explicit: `draft` -> `pending_review` -> `active` only after the approved review/policy gate;
- because E6 Admin is outside this slice, active/public acceptance uses a deterministic pre-approved Tagudin fixture or bounded test-only policy evidence; do not invent an Admin product feature;
- `pending_review` and any submitted-but-unapproved listing cannot appear in public discovery;
- rejected, expired, unavailable, paused, and archived listings are non-active and must be excluded from active public supply;
- identity review pending may allow draft save but cannot produce false active-publication success;
- every lifecycle transition records actor/attribution and expected-version/idempotency context;
- version updates create a new version and do not mutate the prior published version;
- Tagudin pilot visibility is enforced only as the canonical contract requires.

Minimum Service Listing fields must come from the canonical schema contract, not this brief. Do not invent pricing, payment, legal, safety, or availability semantics.

### E2-S5 — Search/discovery baseline

Required behavior:

- Buyer can browse active public Service Listings;
- search/filter behavior is deterministic and backed by a repository/query contract;
- listing detail is safe for anonymous or authenticated Buyer context as specified;
- inactive, private, or unauthorized records do not leak into public results;
- no trust score, fake ranking, or cheapest-provider selection is invented;
- empty, stale, unavailable, and invalid-ID states have recovery guidance.

## Persistence and migration requirements

The slice cannot bypass E0-S2 or claim a slice-only production schema. Before production-like feature acceptance, the full approved migration gate remains required: core 42 tables plus four Deal-Chaining foundation tables = 46 tables, delivered through Batches 000-007, with catalog, constraint, negative-test, and restore evidence. Only after that gate may this slice use the approved dependency frontier; it may not use ad hoc SQLite, browser-only persistence, or unapproved tables.

- use PostgreSQL 16/PostGIS;
- use application-generated UUIDv7/native UUID consistently;
- enforce foreign keys, unique version numbering, active/public visibility constraints, owner attribution, optimistic versions, audit references, and idempotency rules;
- prove clean rebuild/restore and negative constraint cases before feature acceptance.

## Test-first requirements

Before implementation is accepted, tests must cover:

### Unit/domain

- identifier generation/validation;
- capability derivation;
- onboarding/readiness transitions;
- listing draft validation;
- Listing Version immutability;
- lifecycle transition guards, including the `pending_review` public-visibility guard;
- public/private projection;
- unauthorized action denial;
- stale expected-version conflict;
- duplicate idempotency behavior.

### Feature/integration

- mock login success/unknown fixture/session expiry;
- onboarding save/resume;
- draft create/save/submit moves the listing to `pending_review` without making it public;
- public discovery uses a deterministic pre-approved active Tagudin fixture (or explicitly test-only approval fixture);
- public discovery excludes all rejected, expired, unavailable, paused, archived, and other non-active/private records;
- durable-vs-fixture boundary distinguishes canonical durable facts from mock session/onboarding local state and proves refresh/reset behavior;
- unauthorized update/submit returns stable safe error;
- audit/outbox/idempotency evidence exists;
- database rebuild/migration tests.

### Browser

- root welcome/login/onboarding/readiness/listing/discovery path;
- pending_review guard, pre-approved active fixture, and all non-active exclusion branches;
- durable-vs-fixture boundary and refresh persistence;
- visible simulated boundary;
- denial and recovery state;
- no console errors;
- 360px/375px layout smoke;
- no dead visible controls on selected routes.

## Acceptance evidence package

The implementing lane must return:

- changed-file list grouped by module;
- story/OpenSpec traceability table;
- migration/catalog evidence;
- targeted test output and full-suite output;
- browser screenshots or Playwright evidence;
- correlation IDs for denial/failure cases;
- audit/event/idempotency evidence;
- `docker compose config`, build, readiness, and HTTP evidence;
- security and secret-scan results;
- explicit non-scope and residual risks.

The parent PM/Lead Engineer independently reruns the important commands and issues the final `PASS`, `CONDITIONAL`, or `BLOCKED` verdict.

## Delegation plan

1. Domain/schema authority reviewer: read-only, complete before migration.
2. Quality-toolchain lane: manifests/config/CI only, no product code.
3. Migration lane: bounded tables and catalog tests only after authority gate.
4. Backend lane: commands/queries/policies/repositories/features/tests only.
5. Frontend lane: `resources/js`, Inertia pages, component tests, browser journeys only.
6. Independent specification reviewer: read-only against this brief and OpenSpec.
7. Independent quality/security reviewer: read-only after implementation.

Backend and frontend writers may run in parallel only after the application contracts and migration interfaces are frozen and their file scopes are disjoint.
