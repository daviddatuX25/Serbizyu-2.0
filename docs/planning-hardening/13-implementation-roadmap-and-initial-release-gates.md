# Serbizyu 2.0 — Implementation Roadmap and Initial Release Gates

Date: 2026-08-01
Status: PM/Lead Engineer execution roadmap
Authority: subordinate to the artifact authority chain in `05-artifact-authority-and-supersession-map.md`

## Operating model

The parent session owns product scope, architecture, sequencing, source-of-truth reconciliation, risk, acceptance criteria, and final PASS/BLOCKED decisions. Low-level implementation is delegated in bounded lanes. Every implementation lane receives a self-contained brief with allowed files, forbidden scope, TDD expectations, commands, and required evidence. Delegated claims are hypotheses until the parent inspects the live worktree and reruns the important checks.

No subagent may commit, push, reset, stash, clean, delete unrelated work, invent credentials, activate a live provider, or silently promote a CAPSTONE/SANDBOX behavior to pilot or production behavior.

## Current baseline

E0-S1 has a runnable Laravel 12/PHP 8.4-FPM + React 19.2/Inertia + PostgreSQL/PostGIS + Redis + Nginx + Mailpit foundation. The following have already been exercised at least once in containers: root/frontend typecheck and build, PHP tests, Pint, Composer/npm audit, Compose config/build/startup, HTTP/Inertia smoke, readiness success, Redis readiness failure/recovery, strict OpenSpec validation, and secret scanning.

The full quality-toolchain gate is still open until the configured and proven states of Pest, PHPStan/Larastan, Pint configuration, ESLint, Prettier, Vitest, Playwright, CI, and security checks are recorded.

The standalone `frontend/` remains a behavior/reference implementation until production parity is demonstrated. It is not a second production backend.

## Delivery phases

### Phase A — Quality/tooling gate

Implement and prove the minimum guardrail system before feature work:

- Pest 4 or a documented PHPUnit compatibility exception;
- PHPStan/Larastan level 6 with a reviewed baseline;
- explicit `pint.json`;
- ESLint flat config for React/TypeScript;
- Prettier config and ignore rules;
- Vitest + React Testing Library smoke coverage;
- Playwright configuration with a bounded browser smoke;
- Composer/npm audits and secret scan;
- architecture/dependency checks;
- CI quality workflow;
- reproducible container commands for host environments without PHP/Composer.

A tool is not ready because it appears in a dependency file. The gate records four states separately: planned, installed, configured, and proven.

### Phase B — Deal-Chaining foundation authority

Propagate the founder-approved three-level decision through canonical artifacts:

1. foundation now;
2. bounded functionality later;
3. pilot activation separately gated.

The bounded foundation uses a coordination aggregate (`DealChain`), child requirements (`DealNeed`), explicit dependency edges (`DealDependency`), and invitations (`DealInvitation`). Ordinary Requests/Quotes and independent child Orders are reused. Parent coordination does not own pooled money, escrow, child Work, disputes, provider liability, or parent-wide financial guarantees.

The exact tables, cardinalities, checks, indexes, lifecycle, authorization, acting-for, events, audit, outbox, idempotency, replacement, partial-completion, and failure rules must be written into canonical schema/domain/ADR/architecture/epic/story/OpenSpec artifacts before migrations.

### Phase C — E0-S2 migration baseline

After Phase A and B gates:

- create the approved migration manifest and checksum plan;
- implement the approved 58-table target from the observed 47-table migrated baseline in dependency order;
- use PostgreSQL 16/PostGIS as the canonical engine;
- use application-generated UUIDv7/native UUID values consistently;
- prove foreign keys, unique constraints, checks, indexes, retention fields, optimistic versions, idempotency, outbox/inbox boundaries, and financial invariants;
- run clean rebuild, catalog comparison, negative-constraint, failed-batch, rollback, and disposable backup/restore rehearsals;
- do not run production migrations.

The approved planning model is the observed 47-table migrated baseline plus eleven initiative additions (58 total). It is not implementation proof until the E0-S2 LLD/OpenSpec, clean migration/catalog evidence, and readiness gate pass; no migrations are implemented by this roadmap.

### Phase D — E0-S3 fixtures and browser harness

Create deterministic CAPSTONE/SANDBOX/TEAM fixtures with explicit evidence classes. Establish unit, domain-transition, integration, authorization, browser, accessibility, and contract-test categories. Ensure pilot metrics exclude non-pilot fixtures.

### Phase E — First working connected vertical slice

Implement the smallest real server-authoritative slice after the schema and fixture gates:

1. deterministic local/mock account/session boundary;
2. persisted onboarding/readiness state;
3. additive Buyer/Provider capability readiness;
4. Provider/Owner Listing draft creation and validation;
5. immutable Listing Version on submit/preview;
6. public Buyer discovery and listing detail;
7. server-side authorization denial and safe error/correlation behavior;
8. refresh persistence and explicit not-found/invalid-state recovery;
9. audit/outbox/idempotency seams exercised with CAPSTONE fixtures;
10. cross-role consequence verified in browser.

This slice must not implement real SMS/OTP, government identity, live provider integrations, payments, escrow, payout, or pilot activation. Mock authentication must remain visibly simulated.

### Phase F — Marketplace transaction slice

After the first slice is accepted:

- Buyer Request publication;
- Provider/Agent response and Quote versioning;
- Buyer comparison without cheapest-quote auto-selection;
- explicit Quote acceptance into an ordinary Order;
- immutable Order terms snapshot;
- Order/Work boundary and evidence/revision states;
- independent cash/payment-attestation behavior only where explicitly authorized by the canonical payment lane.

### Phase G — Conditional Quick Deal and later Deal-Chaining functionality

Quick Deal remains a standalone conditional order-formation flow around one eligible Listing Version. It does not mutate public supply or silently become a payment rail. Its final persistence behavior remains subject to the documented Gate B decision.

Deal-Chaining functionality follows stable Request/Quote/Order/Work slices. Its foundation is present earlier, but user-facing coordination, invitations, dependencies, replacement, partial completion, and activation remain bounded stories with their own OpenSpec and pilot gates.

## Initial-version definition

A working initial version may be called `CAPSTONE READY` only when:

- the root Compose stack is reproducible;
- the canonical migration/fixture/test gates for the implemented slice pass;
- the first connected vertical slice works from browser entry through persistence and recovery;
- authorization, audit, idempotency, correlation, and error boundaries are exercised;
- no live payment, SMS, identity provider, or production credentials are used;
- the UI clearly labels simulated/local boundaries;
- the standalone frontend/reference and root production app are not conflated;
- all required quality checks are green or explicitly recorded as non-blocking with an owner and follow-up story.

`CAPSTONE READY` is not `PILOT READY` and is not `PRODUCTION READY`.

## Subagent lane discipline

Use one writer per shared concern at a time:

- Tooling lane: manifests, configs, tests/quality scripts, CI only.
- Domain-authority lane: canonical documents and diagrams only; no migrations.
- Schema lane: migrations/manifest/catalog tests only after authority gate.
- Backend vertical-slice lane: module code, migrations only when authorized, application tests.
- Frontend vertical-slice lane: `resources/js` and browser tests; no canonical-domain edits.
- Spec reviewer: read-only compliance against the exact story/OpenSpec contract.
- Quality reviewer: read-only code/security/edge-case review after spec compliance.
- Integration owner: parent session serializes shared-file reconciliation and runs final evidence.

Parallel work is allowed only when file scopes are disjoint or isolated worktrees are used. A timed-out subagent never constitutes acceptance evidence.

## Stop conditions

Stop and escalate rather than inventing semantics when:

- a canonical product decision is missing;
- a migration would encode unresolved cardinality or liability;
- a requested behavior requires live credentials or a real provider;
- a fixture would be mistaken for pilot evidence;
- the required recovery/authorization/idempotency behavior cannot be specified;
- a subagent's requested scope conflicts with BMAD/OpenSpec authority;
- an independent review finds a critical issue.
