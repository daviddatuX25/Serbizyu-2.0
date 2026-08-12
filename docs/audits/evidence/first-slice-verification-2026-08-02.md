# First Connected Vertical Slice Verification

Date: 2026-08-02T17:52:10+08:00 (Asia/Manila)
Evidence class: CAPSTONE / TEAM_TRAINING
Status: CONDITIONAL — working initial version candidate; not yet final CAPSTONE READY

## Scope verified

The verified boundary is the root Laravel/Inertia connected slice:

- deterministic fictional fixture login;
- visibly simulated challenge (`Demo only — no SMS was sent`);
- challenge completion and refresh persistence;
- Provider/Owner listing workspace;
- server-backed draft save and `pending_review` submission;
- public-browse privacy boundary;
- deterministic active Tagudin fixture;
- PostgreSQL/PostGIS + Redis + Nginx + Mailpit Compose runtime.

Real SMS/OTP, identity providers, payments, escrow, payout, live search providers, Quick Deal user-facing behavior, Deal-Chaining user-facing behavior, pilot activation, and production credentials remain out of scope.

## Reproduction recipe (local/mock only)

From `/home/user/Serbizyu-2.0` with Docker, Node 22, and the project `.env` configured:

```sh
docker compose build app web
docker compose up -d --force-recreate app web
docker compose exec -T app php artisan migrate:fresh --force
curl -fsS http://127.0.0.1:8080/health/ready
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run e2e:smoke
```

The `migrate:fresh` command is destructive to the local Compose database and must not be used against a shared or production database. The browser suite is opt-in and uses the live local web container.

## Parent-verified commands and results

### Frontend quality

- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run format:check` — PASS.
- `npm test` / Vitest — PASS, 2 tests.
- `npm run build` — PASS; Vite production bundle generated.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run e2e:smoke` — PASS, 12 tests across desktop, 360px, and 375px projects.

The E2E regression tests are in `e2e/root-shell.spec.ts` and `e2e/browse-privacy.spec.ts`. They cover login → simulated challenge → authenticated workspace → refresh persistence, unknown-fixture recovery, active browse/detail identity, pending-public-supply guidance, and protected-action denial with a correlation reference.

### PHP and application quality

- Isolated PostgreSQL database migrated through all 9 migration batches — PASS.
- Direct Pest run against the isolated database — PASS, 30 tests / 136 assertions / 0 failures / 0 warnings.
- `tests/Feature/DatabaseCatalogContractTest.php` — PASS, 1 test / 2 assertions.
- Targeted Pint remediation applied to five migration files and the PHPStan remediation set.
- Full Pint check — PASS, 100 files.
- PHPStan level 6 — PASS, no errors.
- `git diff --check` — PASS.
- Repository search for temporary session probes, `console.log`, `debugger`, and `window.location.reload()` — no matches.

### Runtime

- `docker compose build app web` — PASS.
- `docker compose up -d --force-recreate app web` — PASS.
- Laravel-served Vite manifest and Nginx-served entry asset — PASS; both app and web containers contain the manifest-referenced JavaScript and the HTTP asset probe returned 200.
- `GET /health/ready` — HTTP 200:

```json
{
  "status": "ready",
  "app": "Serbizyu",
  "environment": "local",
  "checks": {
    "configuration": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

### Browser evidence

A fresh Playwright context produced:

1. Root: `Welcome to Serbizyu`.
2. Fixture login: `Confirm this simulated session`.
3. Challenge completion: `Turn an idea into a reviewed listing`.
4. Full refresh: same authenticated listing workspace.
5. Draft save: server returned the Owner draft workspace and lifecycle guidance.
6. Submit: Owner view reported `pending review`.
7. Public `/browse`: submitted title was absent; deterministic active `Tagudin local help` remained visible.
8. Protected owner action: safe authorization denial was visible with a `Reference:` correlation value.
9. Unknown fixture: safe field-level recovery message and `Reference:` correlation value were visible; welcome state remained usable.
10. Browser page errors: 0.
11. Failed network requests: 0.

### Specification and scope

- `npx --no-install openspec validate harden-connected-frontend-experience --strict` — PASS.
- The first-slice boundary remains limited to the connected local/mock workflow; no production integrations are implied.

## Independent reconciliation disposition

The independent review was completed against the BMAD first-slice brief and the active OpenSpec requirements. Its initial execution-status comments about skipped PostgreSQL tests, PHPStan, and session persistence predate the latest parent verification and are superseded by the evidence above:

- PostgreSQL feature suite: 30 passed / 136 assertions in an isolated database.
- PHPStan level 6: no errors.
- Redis session and refresh persistence: live browser PASS.
- Strict OpenSpec validation: PASS.
- Exact simulated-demo notice: reconciled to `Demo only — no SMS was sent` in backend, test, brief, and UI contract.

The remaining findings are still valid as acceptance-scope gaps:

- Browser automation covers auth/challenge/refresh, active browse/detail identity, protected denial/correlation, and desktop/360/375px smoke; it does not yet cover every required draft lifecycle, stale-version, idempotency, and recovery branch.
- Audit/outbox/idempotency and authorization evidence is retained in `docs/audits/evidence/first-slice-behavior-evidence-2026-08-02.md`, including the transactional behavior gate and persisted local/mock row chain.
- The Listings application path now uses the narrow `ListingCommandStore` and `PublicListingReader` contracts with one active Infrastructure implementation, `ListingRepository`. The application layer has no direct database imports. No external/provider gateway is needed for this local/mock slice.
- Canonical catalog and custom-format restore-manifest evidence is retained in `docs/audits/evidence/schema-restore-verification-2026-08-02.md`; the superseding disposable migration/negative-constraint/dump/restore replay is retained in `docs/audits/evidence/schema-restore-2026-08-02-041233/`.

## Superseding disposable database evidence

The isolated tmpfs PostgreSQL/PostGIS run migrated all 9 batches, recorded 9 completed migration checkpoints with checksums, counted 46 application tables, and found all 6 named catalog objects. The negative harness passed 10 expected-failure cases:

- audit append-only mutation — SQLSTATE `55000`;
- evidence deletion under active retention hold — SQLSTATE `55000`;
- duplicate idempotency scope/key — SQLSTATE `23505`;
- invalid outbox status — SQLSTATE `23514`;
- negative payment amount — SQLSTATE `23514`;
- duplicate provider event identity — SQLSTATE `23505`;
- invalid retention-hold status — SQLSTATE `23514`;
- retention hold without a target — SQLSTATE `23514`;
- unbalanced financial transaction — SQLSTATE `23514`;
- invalid user-profile foreign key — SQLSTATE `23503`.

A custom-format dump was restored into a second disposable PostGIS container using a filtered restore TOC that excludes only target-preprovisioned PostGIS auxiliary objects. The restored database contained 46 application tables, and the migration-checkpoint diff was empty. The run ended with `SCHEMA_RESTORE_EVIDENCE_PASS` and automatically removed both disposable containers and their network.

## Root cause fixed during verification

`Home.tsx` checked unauthenticated welcome state before `challenge_pending`. Because a pending simulated challenge intentionally has `authenticated=false`, the challenge branch was unreachable. The rendering priority is now:

1. pending challenge;
2. unauthenticated welcome;
3. readiness/listing workspace.

The temporary full-page reload workaround was removed. Login and challenge now use normal Inertia updates with `preserveState: 'errors'`, preserving local feedback on failure while replacing server state on success.

The invalid-fixture browser recovery path initially lost its local error state because login/challenge used `preserveState: false` for all outcomes. The callbacks now use `preserveState: 'errors'`, preserving field errors and correlation references on failure while still replacing server state on successful login/challenge.

The final Compose browser run also exposed an app/web asset mismatch: Laravel referenced a JavaScript hash from the app image while Nginx served a different web-image hash. Rebuilding and recreating both explicit `app` and `web` targets together restored manifest/asset parity.

## Remaining blockers / follow-up owners

### P0 acceptance blockers

- Independent BMAD/OpenSpec reconciliation is complete; stale skipped-test findings were superseded by the retained PostgreSQL/PHPStan/runtime results above.
- Named audit/outbox/idempotency and authorization evidence is retained in `docs/audits/evidence/first-slice-behavior-evidence-2026-08-02.md`; it remains local/mock evidence and is not production readiness evidence.
- The repository/gateway boundary review is retained in `docs/audits/evidence/first-slice-architecture-seam-2026-08-02.md`; the canonical Listings persistence seam is now reconciled to one active adapter and two narrow application contracts.
- The catalog contract, negative-constraint matrix, and disposable restore replay now pass and are retained. Final `CAPSTONE READY` remains conditional on the remaining browser lifecycle coverage and the explicitly scoped architecture/validation follow-ups below.

### Quality status

- PHPStan level 6 is now green after bounded generic-type annotations, the corrected fixture upsert call, and removal of forbidden cross-module fixture calls from `ListingRepository`.
- Pint and the architecture test remain green after the remediation.

### P1 browser coverage

- The automated Playwright suite now protects root shell, auth/challenge/refresh, unknown-fixture recovery, active browse/detail identity, and protected denial/correlation across desktop, 360px, and 375px. Draft lifecycle, stale-version, idempotency, and recovery branches still need repeatable E2E cases beyond the covered fixture-recovery path.

## PM/Lead decision

Do not call this pilot-ready or production-ready. Treat it as a working CAPSTONE candidate with the connected first slice proven in a live local Compose stack, conditional on the explicit blockers above. The next implementation lane should be a bounded quality/evidence lane, not broad feature expansion.
