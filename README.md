# Serbizyu

> **Bayanihan Street → Digital Marketplace** · Inclusive services & goods commerce for provincial Philippines
> Tagudin, Ilocos Sur · BSIT Capstone · dxtechph.online

## What Serbizyu is

Serbizyu turns the bayanihan street into a **local-first marketplace**: neighbors in Tagudin
can browse what's active nearby, sign in with their phone number, set up a verified local
profile, and offer or request services and goods — with clear, honest information at every
step.

- **Local first** — pilot scope is Tagudin only; geography, trust, and cash-first dealing are the product.
- **Cash-first, low barrier** — the platform never holds money. Payment is declared between neighbors (External Cash / External Digital Proof today; Direct & Tiwala Protected Digital are sandbox-only).
- **Capability-honest** — deferred features render as deferred, never as committed promises.
- **Identity-forward** — phone-first OTP sign-in; profile & trust setup first, ID verification and permits come later as their own formalization track.

## Status

```
Phase 1–3 · Analysis/Planning/Solutioning ✅ Canonical planning authority
E0 · Implementation               🔒 Conditional — foundation contracts first
Tagudin pilot / live money        🔒 Not cleared
```

The rebuilt planning chain is founder-approved for planning authority. This does **not**
authorize production migrations, live payments, production Tiwala, sensitive-ID collection,
deployment, or genuine Tagudin validation.

## Development

**Docker Compose is the primary run & deploy path** (`compose.yaml`: `db` postgis → `redis` →
`mailpit` → `app` php-fpm → `web` nginx, all healthchained):

```bash
cp .env.example .env          # then set APP_KEY + DB_PASSWORD (compose refuses to start without them)
docker compose up -d --build
docker compose exec app php artisan key:generate   # first run only
docker compose exec app php artisan migrate
docker compose exec app php artisan test

# App → http://localhost:8080 · Mailpit UI → http://127.0.0.1:8025
# The Dockerfile runs `npm run typecheck && npm run build` in its assets stage,
# so a compose build also verifies the frontend.
```

Frontend verification (React 19 · Inertia 3 · TypeScript 5.9 · Vite) can use the
on-demand Node tools profile without rebuilding or replacing the app/web stack:

```bash
vendor/bin/sail -f compose.sail.yaml --profile tools run --rm --no-deps --pull never -T node-tools npm run typecheck
vendor/bin/sail -f compose.sail.yaml --profile tools run --rm --no-deps --pull never -T node-tools npm run test
vendor/bin/sail -f compose.sail.yaml --profile tools run --rm --no-deps --pull never --user root -T node-tools npm run build
```

The tools profile uses the same `node:22-bookworm-slim` base as the asset build,
mounts the working tree and starts no service dependencies or published ports.
`--pull never` requires that image to be present locally; dependency installation
is not part of these commands. The production PHP image intentionally has no
Node or Composer binary, so plain `sail npm` / `sail composer` cannot target it.
The full `laravel.test` development image in `compose.sail.yaml` remains a separate
option when needed; do not rebuild it merely to run these frontend checks.

The existing generated `public/build` output is root-owned in this stack; the
build command preserves that ownership without changing source permissions.
Tests and type checking do not need that override.

For backend checks against the production-oriented Docker image, pin the process
environment explicitly rather than relying only on PHPUnit's XML defaults:

```bash
vendor/bin/sail exec -u root -e APP_ENV=testing -e DB_DATABASE=serbizyu_ci_verify -e APP_CONFIG_CACHE=/tmp/serbizyu-test-config.php -e CACHE_STORE=array -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array app php artisan test --compact
```

### Isolated saved-partnership QA

`SavedPartnershipQaSeeder` creates a buyer and two independently owned A1 service
offers with a versioned preferred-partner plan. It creates no Orders or payment
records: use the real invitation and customer-confirmation screens to form them.
It refuses non-local/testing environments, databases without a
`serbizyu_savedplan_qa_` prefix, enabled external providers, and partial identity
collisions. Repeating a complete fixture leaves existing accounts and history
unchanged; it is not an account-reset seeder.

Run migrations and this seeder only in a new, explicitly selected prefixed
database, never against the ordinary populated developer database:

```bash
vendor/bin/sail exec -T db sh -c 'createdb --username="$POSTGRES_USER" serbizyu_savedplan_qa_manual'
vendor/bin/sail exec -u root -e APP_ENV=local -e DB_DATABASE=serbizyu_savedplan_qa_manual -e APP_CONFIG_CACHE=/tmp/serbizyu-qa-config.php app php artisan migrate --no-interaction
vendor/bin/sail exec -u root -e APP_ENV=local -e DB_DATABASE=serbizyu_savedplan_qa_manual -e APP_CONFIG_CACHE=/tmp/serbizyu-qa-config.php app php artisan db:seed --class=Database\\Seeders\\SavedPartnershipQaSeeder --no-interaction
```

Use an unused prefixed database name; these commands never reset an existing database.
The seeder prints its synthetic login credentials and listing IDs. Serve the QA
database separately from the normal application. HTTP and dispatcher processes
must share the same database and private-storage root; when supplying
`LARAVEL_STORAGE_PATH`, use PHP `variables_order=EGPCS` so the HTTP SAPI sees it.
The observed three-actor run, environment corrections, and remaining release
gates are recorded in [the resumption audit, §26](docs/planning-hardening/38-orders-and-listing-combination-usability-audit.md#26-saved-partnership-execution--implemented-and-exercised).


### Controlled-pilot QA baseline (F01)

`ControlledPilotQaSeeder` prepares one synthetic direct-service proposal awaiting
provider acceptance, plus distinct buyer, provider, merchant, courier, staff
maker/checker and negative staff actors. It does not prepare the later product,
appointment, delivery, Quick Deal or recovery scenarios.

It refuses genuine/pilot/production environments, databases without the
`serbizyu_pilot_qa_` prefix, ordinary or mismatched storage, enabled external
providers, partial identities and incoherent source/accepted references. Both
local/private disks must resolve to the selected storage root's `app/private`.
Choose an unused database and a root matching
`/tmp/serbizyu-controlled-pilot-qa-<namespace>`; never reset normal data.

Supply `SERBIZYU_QA_PASSWORD` privately in your shell environment before running
the seeder. There is no committed/default QA password. Example isolated setup:

```bash
vendor/bin/sail exec -T db sh -c 'createdb --username="$POSTGRES_USER" serbizyu_pilot_qa_manual'
vendor/bin/sail exec -T -u root app mkdir -p /tmp/serbizyu-controlled-pilot-qa-manual/app/private /tmp/serbizyu-controlled-pilot-qa-manual/framework/views /tmp/serbizyu-controlled-pilot-qa-manual/framework/sessions /tmp/serbizyu-controlled-pilot-qa-manual/logs

pilot_qa() {
  vendor/bin/sail exec -T -u root \
    -e APP_ENV=local -e SERBIZYU_ENV=local \
    -e DB_DATABASE=serbizyu_pilot_qa_manual \
    -e APP_CONFIG_CACHE=/tmp/serbizyu-pilot-qa-config.php \
    -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-manual \
    -e CACHE_STORE=array -e SESSION_DRIVER=file \
    -e SESSION_COOKIE=serbizyu_pilot_qa_manual_session \
    -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array \
    -e SERBIZYU_QA_PASSWORD app php "$@"
}

pilot_qa artisan migrate --no-interaction
pilot_qa artisan db:seed --class=ControlledPilotQaSeeder --no-interaction
```

Keep payment/notification providers disabled, evidence local/disabled, and
`SERBIZYU_EVIDENCE_CLASS=TEAM_TRAINING`. Use the same explicit database/storage
configuration for HTTP, dispatcher and scanner. HTTP additionally needs
`php -d variables_order=EGPCS` and file-backed sessions with a distinct QA cookie;
an array session is suitable for tests, not a multi-request browser login.

The private mode-0600 report is
`<storage-root>/app/private/<database>.json`. It contains synthetic actor access,
scenario references, current state, and the next responsible actor/action.
Keep that report and the supplied password local; publish neither in GitHub.
If an account password changes, rerun preserves it and reports that the supplied
QA password no longer matches rather than resetting the account.

Preparation serializes through private-report publication and uses durable
idempotency provenance. Repeating it preserves progressed/expired facts, accepted
terms, Work, payment, stock and role clocks. Missing reports can be re-exported;
conflicts stop without fixture writes. A failed first-run transaction leaves no
partial actors/scenario. Listing publication is a declared synthetic setup
precondition, not evidence that staff review was performed.

Focused seeder tests require a separate `serbizyu_pilot_qa_test_*` database with
the same isolated-root contract. [F01 evidence](docs/planning-hardening/39-controlled-pilot-implementation-handoff.md#9-f01-implementation-evidence)
records actual login, staff denial/navigation, provider acceptance and
non-rewinding reruns. It does not qualify the remaining commerce journeys.

### Dependency-gate upgrade repair (F05)

`2026_11_02_000100_allow_work_completed_dependency_gates` is repaired for fresh
and pending installations. `2026_11_02_000200_repair_work_completed_dependency_gates`
is the forward reconciliation route when `000100` is already recorded as applied.
Do not delete migration-ledger entries or roll back accepted history to rerun it.

Before any populated developer/pilot deployment, obtain explicit approval and
inspect that target's migration ledger, confirmation schema, gate constraints,
database and private-storage configuration. Rehearse a restored copy first;
pause competing writers/dispatchers for the approved migration window, then run
the normal forward migration command with the approved target explicitly pinned.
Fresh disposable databases run both migrations normally. This change authorizes
neither a migration on the normal database nor deployment.

The repair uses the current confirmation's exact child Order and the runtime
verified-source-fact reconciliation. A completed Work label is insufficient.
Historical condition aliases and events are not relabeled; unsupported conditions,
missing confirmations and incompatible/replaced Work epochs remain blocked and
produce structured `F05 dependency gate` warnings in the configured application
log. Review those references rather than editing conditions or manufacturing facts.
`000100` refuses rollback while any `work_completed` dependency/gate history
exists. `000200` is forward-only: its rollback refuses before changing data or
constraints, including the completion-fact support owned by the earlier migration.

Isolated fresh/populated/applied-ledger runtime evidence and the focused regression
command are recorded in [the F05 handoff evidence](docs/planning-hardening/39-controlled-pilot-implementation-handoff.md#8-f05-implementation-evidence).

### Operational outbox

Apply the forward migrations before running the dispatcher:

```bash
vendor/bin/sail artisan migrate --no-interaction
vendor/bin/sail artisan outbox:dispatch --limit=100
```

Handlers register under the `OutboxConsumerHandler` container tag. A message is
published only after its consumers durably acknowledge delivery; failures retry
with backoff and exhausted attempts remain visible as `dead_letter`. Unsupported
contract versions are parked rather than silently discarded. Schedule the command
with the application scheduler or run it directly when diagnosing local delivery.

Orders and obligations expose sequence-backed `ORD-*` and `OBL-*` references.
Support cases and disputes share the `CASE-*` sequence so a case reference is
unambiguous across both record types.

| Layer | Locked baseline |
|---|---|
| Backend | PHP 8.4 · Laravel 12 · PHP-FPM, modular monolith w/ hexagonal ports & adapters |
| Frontend | React 19 · Inertia 3 · TypeScript 5.9 · Vite |
| UI | Rebuilt UX token/CSS contract (`resources/css/design-system.css`); Tailwind/shadcn are utilities, not authority |
| Database | PostgreSQL 16 + PostGIS 3.x |
| Payments | External Cash + External Digital Proof baseline; Direct/Tiwala sandbox-only |
| Infra | Docker Compose (`compose.yaml`) primary run path; Dokploy later promotion target only |

**Agent/editor context lives in the repo** so any machine picks up the same conventions:
`AGENTS.md` (workflow), `.ai/rules/` (settled decisions & standing constraints), `.agents/skills/`
& `.cursor/skills/` (framework guidance), `openspec/changes/` (OpenSpec change packages).

## Architecture & data model

- **Canonical ERD — full table view** [`docs/planning-hardening/07-canonical-erd.svg`](docs/planning-hardening/07-canonical-erd.svg) — the founder-approved 58-table schema across eight bounded modules ([PNG export](docs/planning-hardening/07-canonical-erd.png), [Deal-Chaining foundation ERD](docs/planning-hardening/07-deal-chaining-foundation-erd.svg)). Schema authority: `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md` + `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`.
- **Generated architecture export (2026-08-09)** — `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/`:
  - `ARCHITECTURE-SPINE.md` — paradigm, scope, module map, binds E0–E9
  - `PROGRAM-IMPLEMENTATION-PLAN.md` — delivery sequencing
  - `FOUNDER-DECISION-BRIEF.md` — decisions needing the founder
  - `FINAL-READINESS-REPORT.md` — readiness baseline + review records (`reviews/`)
- **Architecture deep-dives** — `docs/critical-decision-brainstorming/` (01 academic baseline · 02 agent network rationale · 03 cost model · 04 engineering master reference · 05 Quick Deal & Deal-Chaining spec).
- **Implementation contracts** — `docs/planning-hardening/` (payment-lane policy, capability matrix, artifact authority map, story contract & E0 pack, runtime/environment contract, dev standards, UX/UI dossier).

## Docs & planning artifacts

| Where | What |
|---|---|
| `_bmad-output/planning-artifacts/` | Canonical planning authority: PRD (59 reqs), UX spec (23 journeys), domain/state contracts, canonical schema (58 tables), ADR catalog (28), architecture blueprint, E0–E9 epics |
| `docs/planning-hardening/` | P0 implementation contracts, ERD exports, UX/UI reference dossier, founder decision records |
| `openspec/changes/` | OpenSpec change packages (proposal → design → tasks → delta spec) |
| `docs/audits/` | Verified audit evidence (schema, UX closure, deal-chaining ERD) |
| `old-docs/mockup/` | Historical 39-screen HTML mockup — visual input only, **not** implementation authority |
| `docs/research/` | Research notes (auth UX guidance, etc.) |

## Deferred (Phase 2+)

Serbi AI · bounded Deal-Chaining functionality · Kiosk · Compliance Dashboard · Boost/Ads ·
Points/Affiliate · Push Notifications · Channel Connectors · Backup Automation · Reverse Bidding
