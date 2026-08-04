# Serbizyu 2.0 — Engineering Guardrails and Quality-Gate Enforcement Plan

Status: ACTIVE IMPLEMENTATION-GATE CONTRACT — enforcement incomplete
Date: 2026-08-01
Authority: downstream enforcement companion to `09-development-standards-and-bmad-openspec-contract.md`
Scope: E0 implementation and every later full-stack story. This file does not authorize a product feature, production deployment, live integration, or schema migration.

## 1. Purpose

Serbizyu shall not rely on an agent or developer merely “knowing best practices.” Best practices must be encoded as repository commands, tests, static rules, CI checks, review gates, and saved evidence.

A story is not complete because source exists, TypeScript compiles, Laravel boots, or an agent reports success. It is complete only when the story contract, OpenSpec scenarios, executable gates, and independent reviews agree.

## 2. Authority and evidence order

1. Founder-approved planning-hardening decision.
2. Canonical BMAD PRD/UX/domain/schema/ADR/architecture.
3. Hardened BMAD story and Definition of Ready.
4. Approved OpenSpec change with normative scenarios.
5. Context7/official documentation evidence for version-sensitive APIs.
6. Tests and implementation.
7. Static analysis, formatting, security, schema, browser, and operations checks.
8. Independent specification-compliance review.
9. Independent code-quality review.
10. Focused completion evidence and release/readiness gate.

A downstream tool or library recommendation never silently overrides an upstream product/domain decision.

## 3. Locked stack baseline

- PHP 8.4.x.
- Laravel 12.x modular monolith.
- Nginx + PHP-FPM.
- PostgreSQL 16.x + PostGIS 3.x as transactional authority.
- Redis 7.x as queue/cache/coordination only.
- React 19.2.x.
- Inertia 3.6.x.
- TypeScript 5.9.x.
- Node 22 LTS.
- Vite 7.x.
- Docker Compose for local/test disposable topology.
- Mailpit for local/test SMTP capture.

Lockfiles and image digests select patches. Major/minor changes require ADR review; patch changes require compatibility tests.

## 4. Context7 gate

Context7 is configured in Hermes as `npx -y @upstash/context7-mcp`. On 2026-08-01, `hermes mcp test context7` connected successfully and discovered `resolve-library-id` and `query-docs`.

For every version-sensitive integration or unfamiliar API:

1. Resolve the exact Context7 library ID.
2. Query one concept at a time using the locked version where available.
3. Compare against package source/official release notes for security- or data-critical behavior.
4. Record the library/version/topic and resulting design consequence in the OpenSpec design, ADR, or story evidence.
5. Never send secrets, personal data, private source, or real credentials.
6. If documentation conflicts with the locked ADR/runtime contract, stop and raise an upstream change; do not silently substitute.

Context7 is technical evidence, not product authority and not a replacement for tests.

## 5. Test-driven development contract

Every behavior-bearing story follows Red → Green → Refactor:

1. Select one acceptance or recovery scenario from the hardened story/OpenSpec.
2. Write the narrowest executable test at the correct boundary.
3. Run it and confirm it fails for the expected missing/incorrect behavior—not a setup error.
4. Implement the smallest coherent behavior that satisfies the contract.
5. Run the targeted test, then the affected suite.
6. Refactor only while the suite remains green.
7. Add negative, authorization, stale-version, idempotency, concurrency, and recovery tests where the contract applies.
8. Save commands and results in the story completion record.

Test-first evidence may be a focused commit sequence or a recorded deliberate failing assertion converted to green. Global line-coverage percentages do not replace invariant and scenario coverage.

### Required test layers

- **Architecture:** module imports, forbidden dependencies, controller/application boundaries.
- **Unit/value:** identifiers, amounts, state guards, policy decisions, error envelopes.
- **Domain/application:** commands, authorization, expected version, idempotency, audit/outbox ordering.
- **Integration:** Laravel services, PostgreSQL constraints/catalog, Redis survivability, queue/outbox retries, adapters/fakes.
- **Feature/Inertia:** authorized page props, validation/errors, redirects, correlation, no direct mutation bypass.
- **Browser:** critical journey, role/access variants, invalid entity, failure/recovery, refresh/persistence, mobile/keyboard/accessibility, console errors.
- **Operations:** health/readiness, backup/restore, failed migration batch, retry/dead-letter, provider-event reconciliation.

## 6. Required repository toolchain before product stories

### PHP/backend

- Pest 4 stable line with Laravel plugin as the default runner.
- Pest architecture tests for module boundaries.
- PHPStan 2 + Larastan 3 at level 6 initially; no new baseline debt without review.
- Laravel Pint with committed `pint.json`; CI runs `pint --test`.
- `composer validate` and `composer audit`.
- PostgreSQL catalog/constraint test utilities.

A temporary PHPUnit scaffold may help E0 bootstrap, but E0 is not quality-gate complete until the canonical Pest toolchain is installed and passing. Do not maintain duplicate PHPUnit/Pest story suites.

### React/Inertia frontend

- `tsc --noEmit` with strict TypeScript.
- ESLint flat configuration suitable for React/TypeScript.
- Prettier with a committed configuration and check-only CI command.
- Vitest + React Testing Library for components/helpers/application adapters where useful.
- Playwright for critical Inertia/browser journeys and accessibility smoke.
- `npm audit` or approved dependency audit command.
- Production Vite build and browser runtime/console verification.

### Shared/CI

- One deterministic `quality` entry point for backend and frontend checks.
- A CI workflow suitable for the repository host, running the same commands as local containers.
- Secret-pattern scan and forbidden-fixture scan.
- OpenSpec strict validation and `git diff --check`.
- Build/test caches may improve speed but may not change correctness.
- Any red required gate blocks merge unless an explicit, reviewed exception identifies scope, owner, expiry, and compensating control.

## 7. Laravel modular-monolith practices

- Controllers translate HTTP/Inertia requests into application commands or queries; they do not directly mutate domain state.
- Form/request validation handles input shape. Domain handlers enforce business invariants and state transitions.
- Policies/authorization execute server-side using actor, capability, consent grant, represented Owner, resource, and action context.
- Each module owns its internals. Cross-module interaction uses public application contracts/events, never another module's models/repositories as a shortcut.
- Aggregate state, audit intent, and outbox intent commit transactionally where required.
- Commands carry command ID, actor/authorization context, correlation ID, idempotency key, expected version, target, and evidence class.
- Read models/page props are authorization-scoped, minimal, and safe for hydration. Sensitive/private responses use no-store/private cache policy.
- Eloquent convenience does not override aggregate boundaries, optimistic concurrency, FK/unique/check constraints, or append-only history.
- Jobs are retryable/idempotent and have owner, backoff, maximum attempts, dead-letter/support path, metrics, and last-success evidence.
- External providers remain adapters behind interfaces and are disabled by environment policy unless separately approved.

## 8. React/Inertia practices

- Laravel/Inertia is the production application boundary; do not recreate the whole backend as an unrelated REST client without a justified contract.
- Server-authorized page props are treated as input, not authority to bypass commands.
- Mutations use typed application endpoints/actions and surface validation, authorization, stale-version, idempotency, and recovery states.
- Product session state and reviewer/scenario-lab state remain separate.
- Buyer and Provider are additive account capabilities; ordinary consumer navigation has no global persona switch.
- Admin/Operations is permission-protected, not a consumer persona.
- Agent acting-for context is explicit and Owner/grant/resource scoped.
- Routes and query/cache keys are entity-scoped; invalid IDs have explicit recovery.
- Loading, empty, denied, expired, stale, offline/sync, and retry states are implemented and browser-tested where applicable.
- A green typecheck/build is necessary but insufficient; the primary action and first failure/recovery branch must be browser-observable with zero unexplained console errors.

## 9. Database and ERD gates

Before an E0-S2 or later schema story completes:

- Canonical schema, schema implementation contract, migration manifest, ERD source, rendered SVG, and domain states are synchronized.
- Migrations run from an empty PostgreSQL 16 database.
- The live catalog is compared mechanically to the manifest for tables, FKs, unique/check constraints, indexes, partial indexes, procedures, and delete behavior.
- Invalid FK, status, amount, duplicate idempotency/provider event, held-evidence deletion, unbalanced ledger, stale version, and dependency-cycle writes fail at the declared boundary.
- Upgrade, clean rebuild, failed-batch recovery, backup/restore, and checksum reconciliation are rehearsed in disposable environments.
- Destructive data-bearing rollback is not treated as the normal recovery method; use expand/contract and verified restore strategy.
- An independent evidence-only data-integrity review confirms claims with file:line and live catalog evidence.

The founder-approved Deal-Chaining charter is an upstream schema change. E0-S2 remains blocked until its domain and ERD propagation is complete.

## 10. Review gates

Every implementation tranche receives two independent reviews in order:

1. **Specification-compliance review** — verifies scope, traceability, acceptance/recovery scenarios, domain/schema/authorization/privacy/financial boundaries, and exclusions.
2. **Code-quality review** — verifies architecture, maintainability, security, concurrency, performance hazards, test quality, dependency hygiene, and operational behavior.

A reviewer report is a hypothesis until the project manager reconciles it against the live worktree and reruns the actual commands. Source presence or a failed reviewer is not proof.

## 11. Current enforcement inventory — 2026-08-01 snapshot

| Guardrail | Current state | Gate consequence |
|---|---|---|
| BMAD/OpenSpec authority contract | Present | Must remain linked per story |
| Context7 MCP | Configured and connectivity-tested; 2 tools discovered | Use and cite per version-sensitive change |
| Laravel 12/PHP 8.4/Inertia Laravel 3 constraints | Present in root Composer manifest | Verify lock/install/tests in container |
| React 19.2/Inertia React 3.6/TS 5.9/Vite 7 manifest | Present in root npm manifest | Verify Node 22 lock/typecheck/build |
| Pest | Not present in inspected root manifest/config | Required before quality-toolchain gate passes |
| PHPStan/Larastan | Not directly installed/configured | Required before backend feature stories |
| Pint | Declared; no committed `pint.json` found | Pin config and run check |
| ESLint/Prettier | No root configuration found | Required before frontend feature stories |
| Vitest/React Testing Library | No root configuration found | Establish in E0-S3 where useful |
| Playwright | No root configuration found | Required for connected critical-path stories |
| CI quality workflow | No workflow found in inspected tree | Required before merge/promotion claims |
| PostgreSQL migrations/catalog evidence | Not yet implemented | E0-S2 blocked |
| Deal-Chaining ERD/domain propagation | Founder decision recorded; propagation/audit active | E0-S2 blocked |
| E0-S1 Compose/tests/runtime | Active worker continuation; not independently verified | No E0-S1 PASS yet |

This table must be updated from real tool output as E0 work lands. “Planned” never equals “passing.”

## 12. Story completion evidence template

Every completion record includes:

- story ID and OpenSpec change/requirement/scenario IDs;
- exact files changed and exclusions preserved;
- Context7/official documentation evidence used;
- Red/Green/Refactor evidence for behavior changes;
- targeted and full test commands/results;
- static analysis, format, typecheck, build, dependency/security, schema, secret, and OpenSpec results as applicable;
- browser/runtime/health evidence as applicable;
- pre-existing failures separated from tranche failures;
- specification review findings and dispositions;
- code-quality review findings and dispositions;
- rollback/disablement evidence;
- final PASS/BLOCKED verdict with unresolved owner and next gate.
