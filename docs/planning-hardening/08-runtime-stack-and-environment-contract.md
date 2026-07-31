# Serbizyu 2.0 — Runtime, Stack, and Environment Contract

Status: CANONICAL RUNTIME BASELINE — founder-approved 2026-07-31
Depends on: `architecture-rebuilt.md`, `adr-catalog-rebuilt.md`, `canonical-schema-rebuilt.md`, `06-implementation-story-contract-and-e0-pack.md`
Scope: implementation preparation and disposable E0 environments. This does not authorize deployment, live connected payments, production Tiwala, or sensitive-ID collection.

## 1. Baseline decisions

| Boundary | Locked baseline | Deliberately not a pilot dependency |
|---|---|---|
| Application | Laravel 12.x, modular monolith | Microservices |
| PHP runtime | PHP 8.4.x | Octane; use PHP-FPM first |
| Web server | Nginx fronting PHP-FPM | Vendor-specific edge behavior |
| Frontend | React 19.2.x, Inertia 3.6.x, TypeScript 5.9.x | Unapproved component framework replacement |
| Build/SSR | Node.js 22 LTS; Vite 7.x; Inertia SSR as a separately health-checked Node process | SSR as a hidden cache or data authority |
| Styling | Rebuilt UX tokens and accessible CSS contract; Tailwind/shadcn are not required to satisfy the product contract | Old README Tailwind/shadcn versions as authority |
| Transactional database | PostgreSQL 16.x with PostGIS 3.x, image digest pinned by E0 | External search as source of truth |
| Cache/queue/coordination | Redis 7.x; Laravel queue worker and scheduler use explicit health checks | Redis as financial or domain authority |
| Search | PostgreSQL search baseline; Meilisearch adapter may be added only after measured need and owned rebuild/recovery | Meilisearch as pilot prerequisite |
| Realtime | Polling/notifications are the baseline; Laravel Reverb adapter is optional after measured need | Reverb as correctness dependency |
| File/evidence storage | Private object/storage adapter with local disposable implementation for tests | Public disk, browser-direct trust, or unencrypted evidence |
| Email | SMTP adapter; Mailpit for local/test | Production relay before operations/legal gate |
| SMS/assisted channel | Swappable channel adapter; disabled until provider/operations decision | Hard-coded TextBee/Gammu/provider behavior |
| Payment | Native External Cash and External Digital Proof records; Direct/Tiwala adapters sandbox-only | Live Xendit/provider credentials |
| Deployment packaging | Docker Compose for local/test and reproducible disposable rehearsals | Production deployment authorization |
| Promotion target | Dokploy-compatible Compose promotion may be evaluated after gates | Dokploy as a product contract |

Patch-level versions and container digests are locked by the repository lockfiles and Compose image digests during E0. A patch upgrade does not change this contract if compatibility tests pass; a major/minor change requires an ADR review.

## 2. Process topology

```text
Client browser / assisted terminal
        |
        | HTTPS
        v
Nginx
  |-----------------------> Node SSR process (only SSR routes; private/no-store)
  |
  +-----------------------> PHP-FPM Laravel application
                                  |
                   +--------------+----------------+
                   |              |                |
                   v              v                v
             PostgreSQL 16      Redis 7       Private evidence adapter
             + PostGIS           queue/cache   (local disposable / future object)
                   |              |
                   +--------------+
                   |
                   v
             Scheduler + queue worker
                   |
                   +--> Outbox/channel adapters
                   +--> optional Reverb adapter
                   +--> optional Meilisearch adapter
                   +--> sandbox payment adapters only
```

Rules:

- PostgreSQL is the authority for domain state, payment obligations, ledger records, audit events, and pilot evidence classification.
- Redis loss may delay jobs or invalidate caches but must not alter financial truth or domain history.
- SSR reads through authorized application queries; it does not access PostgreSQL directly and does not own session/payment state.
- Workers consume outbox/jobs with idempotency and retry policy; a queue failure creates observable operational evidence.
- Scheduler jobs are single-purpose, lockable, observable, and safe to rerun.
- Nginx, PHP-FPM, SSR, worker, scheduler, PostgreSQL, Redis, and evidence storage each have a health/readiness signal where they exist.

## 3. Application/runtime boundaries

### 3.1 Laravel

- One Laravel application boundary.
- Bounded-context modules follow the canonical architecture.
- Controllers call commands/queries; they do not directly mutate models for stateful business actions.
- Authorization, consent, state guards, idempotency, and audit context execute server-side.
- Database transactions cover aggregate state plus audit/outbox records where the contract requires atomicity.

### 3.2 PHP-FPM and Nginx

- PHP-FPM is the initial runtime because it is simple to operate and compatible with Compose/Dokploy-style promotion.
- Octane is deferred. It may be evaluated only after profiling demonstrates a need and a separate ADR covers worker lifetime, static state, SSR interaction, queue behavior, and rollback.
- Nginx applies request size, timeout, security header, and private-cache policy.
- Authenticated, identity, payment, evidence, support, and Admin responses are private/no-store unless an explicit safe read contract says otherwise.

### 3.3 React/Inertia/SSR

- React/Inertia renders UX states from server-authorized page data and action results.
- SSR is a presentation optimization and accessibility/performance aid, not a domain boundary.
- SSR health failure falls back to a documented client-render path where safe; it cannot block Admin recovery or payment correctness.
- Hydrated data must be scoped to the authenticated user and request correlation context.

### 3.4 Queue and scheduler

- Queue worker handles notifications, outbox delivery, search indexing, reconciliation candidates, retention jobs, and non-request side effects.
- Scheduler handles expiry, reminders, review-window checks, retention, reconciliation scans, and operational summaries.
- Each job has an idempotency key, retry/backoff, maximum attempt policy, dead-letter/support path, and metrics.
- No scheduled job may bypass a domain guard or directly mutate a posted financial record.

## 4. Adapter contracts

The following interfaces are mandatory seams; provider implementations are not implied by the interface:

- `PaymentLane` — External Cash, External Digital Proof, Direct Digital Sandbox, Tiwala Sandbox.
- `NotificationChannel` — email, SMS/assisted channel, in-app, and future channels.
- `EvidenceStorage` — private put/read/delete-under-retention-policy.
- `SearchIndex` — PostgreSQL baseline plus optional Meilisearch adapter.
- `RealtimePublisher` — optional event delivery with polling fallback.
- `ObjectClock`/scheduler lock — deterministic time in tests and safe production scheduling.
- `ProviderEventInbox` — provider ID, event ID, payload hash, processing state, and idempotency.

External provider adapters must:

- Be disabled by default in local/test/capstone profiles unless a synthetic sandbox contract enables them.
- Never become the source of truth for order, Work, obligation, or ledger state.
- Redact credentials and provider payload secrets.
- Map provider states into the canonical payment/event contracts rather than leaking provider vocabulary into product state.
- Have a contract test and a failure/retry/reconciliation runbook before activation.

## 5. Environment contract

| Environment | Data class | Providers | Purpose | Promotion rule |
|---|---|---|---|---|
| `local` | synthetic | all external adapters disabled; Mailpit/local evidence | developer work | no shared persistent secrets |
| `test` | synthetic and fixture-classified | sandbox fakes only | automated unit/integration/browser tests | CI green and schema fresh |
| `capstone` | synthetic/sandbox | Direct/Tiwala sandbox may be demonstrated; no live money | academic demonstration | labeled sandbox; never pilot evidence |
| `pilot-prep` | synthetic plus approved rehearsal data | External Cash and External Digital Proof native behavior; no live connected money | operational rehearsal | G3 evidence and founder gate |
| `pilot` | genuine Tagudin only after G3 | only legally/operationally cleared modes | controlled validation | separate pilot authorization |
| `production-connected` | genuine/live | only after G6/legal/provider/financial/operations approval | future launch | separate release decision |

Environment validation must reject:

- Live provider credentials in `local`, `test`, or `capstone`.
- Sensitive-ID storage when the environment has no approved privacy/retention configuration.
- Production database URLs in a disposable profile.
- Pilot metrics enabled for synthetic/team/sandbox data without explicit cohort classification.
- Connected-money release/payout flags without the G6 gate marker.

## 6. Compose contract

Local/test Compose is the reproducible reference topology and includes only services required for the selected slice:

- `web` — Nginx.
- `app` — PHP-FPM Laravel.
- `ssr` — Node SSR only when the current slice requires it.
- `worker` — queue worker.
- `scheduler` — scheduler.
- `db` — PostgreSQL/PostGIS.
- `redis` — Redis.
- `mailpit` — local SMTP capture.
- `evidence` — local private evidence adapter for tests only.

Compose requirements:

- Health checks for database, Redis, app, SSR when enabled, worker, and scheduler.
- Dependency ordering must wait for readiness, not merely container start.
- Named volumes are disposable by default in test.
- No secret values are committed to Compose; use an ignored environment file or secret injection.
- The same image/build definitions must be usable for local rehearsal and later promotion without treating local data as production data.

## 7. Observability and recovery

Required signals:

- HTTP error rate/latency by route class.
- PHP-FPM saturation and queue age.
- Scheduler last-success timestamp per job.
- Outbox pending/failed counts.
- Provider-event duplicate/mismatch counts.
- Database storage/connection/lock health.
- Redis availability and queue failure counts.
- Evidence access failures and retention-hold conflicts.
- Financial reconciliation discrepancies.
- Authentication/authorization denial spikes.

Every alert has a runbook, owner, severity, and safe response. Recovery may pause side effects, retry idempotent work, or create a support/hold record; it may not bypass a state guard or rewrite financial history.

## 8. Promotion and rollback

Promotion order:

1. Build/test image and lockfiles.
2. Run schema catalog and contract tests.
3. Run browser/accessibility smoke tests.
4. Run health-chain and worker/scheduler checks.
5. Run backup/restore rehearsal.
6. Promote to a disposable capstone environment.
7. Review evidence and founder gate.
8. Only then evaluate pilot-prep or later deployment promotion.

Rollback means:

- Stop promotion before changing the next environment.
- Revert application image/config to the last verified version.
- Preserve database history; do not use destructive down migrations for data-bearing changes.
- Disable affected adapters/feature flags.
- Replay safe outbox jobs only through idempotent handlers.
- Record the incident, decision, and recovery evidence.

## 9. Change control

A change to runtime/version, process topology, SSR policy, database/cache/search/realtime role, adapter semantics, Compose services, environment gates, or promotion/rollback requires:

- An ADR update or new ADR.
- Architecture and this contract updated together.
- A compatibility/health/recovery test plan.
- Updated E0 story references if the change affects implementation scope.
- Re-audit of live-money, privacy, and pilot gates when relevant.
