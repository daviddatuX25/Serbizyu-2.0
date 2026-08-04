# E0-S1 — Application Skeleton and Module Boundaries

Status: IN IMPLEMENTATION — bounded to skeleton/contracts only
Plane: `C`, `S`
Owner: Technical lead; review: Architect + QA lead
Estimate: 3 engineering days
OpenSpec: `harden-connected-frontend-experience` is the connected-frontend authority for later frontend work; this story is the root-backend foundation and does not implement that change's product tasks.

## Authority and traceability

- PRD: `PRD-001`, `PRD-024`
- UX: `UX-001`, `UX-020` (server-rendered shell/page-data proof only)
- Domain/state: server-authoritative transition and aggregate-boundary rules in `domain-state-contracts-rebuilt.md`
- Schema touchpoints reserved, not migrated: `audit_events`, `outbox_messages`, `idempotency_keys`, `migration_checkpoints`
- ADRs: `ADR-R-004`, `ADR-R-005`, `ADR-R-022`
- Architecture: `architecture-rebuilt.md` §§2–5 and runtime contract §§3–6

## Outcome

A developer can run one Laravel application boundary in Compose, render an Inertia page from Laravel into React, and add a state-changing domain command only through explicit command/authorization/audit/outbox seams. The module graph is mechanically checked so a UI/controller cannot directly mutate domain state or import another module's internals.

## Scope

- Root Laravel 12/PHP 8.4-FPM application scaffold.
- Module seams for Identity/Access, Listings, Orders/Work, Payment Obligations, Trust/Support, and Operations.
- Shared envelopes/interfaces for commands, queries, domain events, jobs, external adapters, authorization context, audit context, correlation IDs, idempotency, and stable errors.
- A minimal no-op/example command path that makes authorization → validation → state transition → event/outbox → audit ordering inspectable without a product aggregate.
- Inertia React TypeScript shell under `resources/js` proving server page data reaches React.
- `local`, `test`, `capstone`, and `pilot`/`production-connected` environment gates with live providers disabled outside approved production-connected conditions.
- Compose: `web`, `app`, `db` PostGIS, `redis`, `mailpit`; worker/scheduler/SSR remain disabled/deferred profiles or documented future seams.
- Mechanical allowed/forbidden dependency checks.

## Explicit exclusions

- No authentication, MFA/OTP, onboarding, listings, requests, quotes, Quick Deal, Admin operations, payment execution, SMS, government-ID upload, live provider adapters, production schema migrations, or deployment promotion.
- No migration or persistence of the canonical core 42 plus approved Deal-Chaining foundation schema; E0-S2 owns that work.
- No migration of the existing standalone `frontend/`; it remains a separate reference implementation.

## Contracts

### Request/application boundary

HTTP controllers may construct a command/query and call an application handler. They may not mutate Eloquent models, write to the database, publish events, or call external providers directly. Inertia page props are read-only presentation data.

### Command envelope

Every state-changing command carries command ID, actor/authorization context, correlation ID, idempotency key, expected version, evidence class, target, and payload. Duplicate idempotency keys return the original result; stale versions return a stable conflict error.

### Query envelope

Queries are read-only and return a typed result or stable error. Query handlers do not dispatch commands or mutate state.

### Event/job/adapter seams

Domain events are immutable facts. Outbox publication is the side-effect seam. Jobs are retryable/idempotent units. External adapters are interfaces only in this slice and are disabled by environment policy; no real provider implementation is present.

### Authorization/audit/correlation

Authorization is server-side. Denial returns a stable `AUTHORIZATION_DENIED` error with correlation ID and safe public message and creates an audit-visible decision without sensitive values. Correlation IDs propagate from request to command/event/audit envelope.

### Stable errors

All application failures use `ErrorEnvelope`: stable code, safe message, correlation ID, retryable flag, field errors, and optional metadata. Internal exception text is not rendered.

## Acceptance scenarios

1. **Server-authoritative command order** — a valid command crosses authorization, validation, transition, event/outbox, and audit seams in that order.
2. **Transition bypass denial** — an invalid command returns `INVALID_STATE`/`AUTHORIZATION_DENIED`; no aggregate mutation occurs.
3. **Environment fail-closed** — local/test/capstone reject live provider credentials and only enable local/fake adapters; missing required values fail with redacted errors.
4. **Dependency policy** — allowed imports pass; forbidden module-to-module and controller-to-infrastructure/domain-state imports fail the architecture check.
5. **Inertia smoke** — `GET /` returns an Inertia response whose `component` and `props.app` values are rendered by React.
6. **Correlation** — request correlation header is accepted/preserved or generated, returned in response, and included in the page payload/contract error.
7. **Authorization denial shape** — denial has stable code/message/correlation and no secret/internal detail.

## Evidence and tests

- `tests/Unit/Architecture/ModuleDependencyTest.php`
- `tests/Unit/Shared/ApplicationEnvelopeTest.php`
- `tests/Feature/EnvironmentConfigurationTest.php`
- `tests/Feature/InertiaShellTest.php`
- `tests/Feature/HealthEndpointTest.php`
- `tests/Support/ArchitectureCheck.php` and `tests/Support/EnvironmentMatrix.php`
- Compose config/build/health output and root/frontend typecheck/build output.

## Rollback/disablement

The skeleton is disposable. Remove only files introduced by this story if rollback is needed. Disable worker/scheduler/SSR profiles and all external adapters by default; no production data or irreversible migration exists.

## Completion record

The story is complete only after the implementation worker records exact commands, exit codes, health checks, test output, OpenSpec validation result, secret scan result, and clean service shutdown. E0-S2+ remain unstarted.
