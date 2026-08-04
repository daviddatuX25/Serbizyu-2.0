# Serbizyu 2.0 — Sprint 0 Plan

Status: IMPLEMENTATION SLICE PLAN — E0-S1 only
Authority: founder-approved planning-hardening contracts and promoted rebuilt BMAD artifacts
OpenSpec change: `openspec/changes/harden-connected-frontend-experience/`
Date: 2026-08-01

## Scope gate

This sprint implements only **E0-S1 Application Skeleton and Module Boundaries**. It establishes a runnable Laravel 12 modular-monolith boundary, Inertia/React render proof, stable application contracts, environment gates, Compose foundation, and mechanical architecture tests. It does **not** implement E0-S2 schema migrations, E0-S3 fixtures, E0-S4 full secrets hardening, authentication, listings, Quick Deal, bidding, Admin operations, payment, SMS, identity evidence, or any later story.

The existing `frontend/` Vite/React application remains untouched as a deterministic behavior/reference implementation. It is verified separately and is not migrated in this slice.

## Baseline evidence captured before edits

- Repository: `/home/user/Serbizyu-2.0`
- Branch: `planning-hardening`
- HEAD: `939e952179ebc141e42e7a625a11ee4576ebbe52`
- Existing worktree: dirty before this slice; unrelated changes preserved.
- Node: `v24.18.0`; npm: `11.16.0`
- Docker: `29.5.2`; Compose: `v5.1.4`
- Existing frontend `npm run typecheck`: pass
- Existing frontend `npm run build`: pass (Vite 7.3.6)
- Host PHP/Composer: unavailable on PATH; Docker Composer/PHP is used.

## Toolchain gate

Registry checks performed before scaffolding:

- Laravel 12 skeleton versions available on Packagist (`laravel/laravel` v12.x).
- `inertiajs/inertia-laravel` v3.x is available and declares Laravel 12 compatibility.
- npm registry contains React 19.2.x, TypeScript 5.9.x, Vite 7.x, `@inertiajs/react` 3.6.x, and `laravel-vite-plugin` 3.x.
- Docker manifests are required for PHP 8.4-FPM, PostgreSQL/PostGIS 16, Redis 7, Nginx, and Mailpit; the Compose verification is the final compatibility gate.

## Work packages

| ID | Work | Evidence | Story boundary |
|---|---|---|---|
| S0.1 | Root Laravel 12 scaffold and Composer lock | `composer.json`, `composer.lock`, Docker build | E0-S1 |
| S0.2 | Module seams and dependency policy | `app/Modules`, `architecture.php`, architecture test | E0-S1 |
| S0.3 | Stable application envelopes | `app/Shared/Application`, `app/Shared/Support`, contract tests | E0-S1 |
| S0.4 | Inertia shell and server page-data render | `routes/web.php`, `resources/js`, feature smoke test | E0-S1 |
| S0.5 | Environment/provider gate | `config/serbizyu.php`, validator, tests | E0-S1; narrow S0.4 support |
| S0.6 | Compose foundation | `compose.yaml`, Dockerfiles, Nginx config, health checks | E0-S1 |
| S0.7 | Required artifact and traceability record | this plan, E0-S1 story, matrix, status | implementation process |

## Dependency order

1. Toolchain and compatibility gate.
2. Laravel skeleton and Composer package lock.
3. Shared contracts and module directories.
4. HTTP/Inertia proof page and route/controller boundary.
5. Environment validation and disabled-provider wiring.
6. Compose services and readiness chain.
7. Architecture/security/static scans and test evidence.

## Definition of done for this sprint

- `docker compose config` succeeds.
- Docker image builds succeed for `app` and `web`.
- Laravel/Pest tests cover allowed and forbidden imports, stable errors, authorization denial, correlation IDs, environment/provider gates, and Inertia page data.
- Root TypeScript typecheck/build succeeds.
- Existing `frontend/` typecheck/build still succeeds.
- Strict OpenSpec validation succeeds, or any validator/tool blocker is recorded honestly.
- Secret-pattern scan finds no committed secret values.
- `git diff --check` succeeds for worker changes.
- Services are shut down cleanly after smoke verification.

## Explicit stop boundary

Do not mark E0-S2, E0-S3, E0-S4, E1+, or any connected frontend product task complete. No production migration, provider credentials, sensitive IDs, live money, real SMS, or pilot evidence is permitted.
