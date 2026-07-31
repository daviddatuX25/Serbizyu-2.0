# Serbizyu 2.0 — Development Standards and BMAD/OpenSpec Workflow Contract

Status: CANONICAL DEVELOPMENT-STANDARDS CONTRACT — founder-approved 2026-07-31
Depends on: `05-artifact-authority-and-supersession-map.md`, `06-implementation-story-contract-and-e0-pack.md`, `07-schema-implementation-and-erd-contract.md`, `08-runtime-stack-and-environment-contract.md`, and the `bmad-methodology` skill.
Scope: future implementation workflow and mockup/OpenSpec preparation. This artifact does not authorize production deployment, live money, sensitive-ID collection, or genuine Tagudin validation.

## 1. Non-negotiable authority rule

BMAD remains the governing product-development methodology.

- Founder-approved planning-hardening decisions control unresolved product, payment, privacy, safety, and scope questions.
- Canonical BMAD artifacts control product, UX, domain, schema, ADR, architecture, epics, and readiness intent.
- OpenSpec is a change-level specification layer. It does not replace BMAD ceremonies, silently revise the PRD, or make a deferred feature committed.
- Context7 is an evidence lookup tool for current library/API documentation. It does not decide product policy or override an ADR.
- Laravel Boost is scaffolding assistance only. Generated code remains subject to the story contract, tests, architecture, security review, and code review.
- Skills and agents are process aids. They are not authorities; the lead architect verifies outputs against the repository contracts.

If a proposed OpenSpec change conflicts with a canonical BMAD artifact, stop the change and reopen the affected BMAD artifact in dependency order. Do not “resolve” the contradiction inside the implementation change.

## 2. BMAD ceremony integrity

The sequence remains:

1. Analysis/product decision: product vision, taxonomy, handoff, contradiction disposition.
2. Planning: PRD and UX contract.
3. Solutioning: domain/state, schema/ERD, ADRs, architecture/operations, epics/stories.
4. Readiness: independent evidence-based audit.
5. Implementation: BMAD sprint planning, story creation, development, code review, and retrospective.

The following BMAD workflows remain required for Phase 4:

- `bmad-sprint-planning` before a sprint begins.
- `bmad-create-story` only from a selected and hardened canonical story.
- `bmad-dev-story` for implementation execution.
- `bmad-code-review` before merge.
- `bmad-retrospective` after the epic/sprint boundary.

A tool, skill, or agent may help execute a ceremony, but it may not skip the ceremony's artifact, approval, or traceability evidence.

## 3. OpenSpec integration

The external OpenSpec skill/process is used for implementation-sized changes and connected mockup changes. Before generating or validating an OpenSpec change:

1. Load the external OpenSpec skill if it is installed in the active execution environment.
2. Read the relevant canonical BMAD sources and the mockup bridge when the change concerns UX.
3. Confirm the selected story is implementation-ready under `06-implementation-story-contract-and-e0-pack.md`.
4. Create one change package with a unique kebab-case ID.
5. Include `proposal.md`, `design.md`, `tasks.md`, and one or more delta specs.
6. Keep all requirement language normative and scenario-based.
7. Validate the OpenSpec package before implementation.
8. Implement only the approved tasks.
9. Record test/evidence output and update the story completion record.

Recommended future workspace:

```text
openspec/
├── README.md
├── project.md
├── specs/
│   ├── product/
│   ├── ux/
│   ├── domain/
│   └── mockup/
└── changes/
    └── <change-id>/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/
            └── <capability>/spec.md
```

OpenSpec delta rules:

- `ADDED` introduces behavior not present in the current capability spec.
- `MODIFIED` changes an existing requirement and must cite the upstream BMAD artifact being changed.
- `REMOVED` requires an explicit supersession/rollback explanation.
- `RENAMED` preserves traceability from old to new requirement identifiers.
- Every requirement has at least one `#### Scenario:` with Given/When/Then behavior.
- Every change package names PRD IDs, UX IDs, domain states/events, schema tables/constraints, ADRs, story IDs, and test evidence.
- No change package may use “TBD” or “implement as appropriate” for behavior that affects money, privacy, authorization, or state.

## 4. Context7 documentation standard

Use Context7 for library/API behavior that can change by version:

- Resolve the exact library ID before querying documentation.
- Query one concept at a time and include the locked version where available.
- Do not put secrets, proprietary code, credentials, or personal data into queries.
- Record the relevant documentation source/version in the change design or ADR when the behavior affects implementation.
- Treat Context7 results as technical evidence, not product authority.
- If docs conflict with an approved ADR, stop and raise the conflict rather than silently adopting the docs' preferred pattern.

## 5. Toolchain and quality gates

### 5.1 PHP/backend

- PHP 8.4 and Laravel 12 are the runtime baseline.
- Laravel Boost may scaffold repetitive Laravel structures only after the story and schema contract are approved.
- Pest is the default PHP test framework.
- PHPStan/Larastan checks are required for backend changes.
- Pint is required for formatting.
- Financial/domain/state tests are load-bearing; they are not optional coverage polish.

### 5.2 Frontend/browser

- React 19.2, Inertia 3.6, TypeScript 5.9, and Node 22 LTS are the baseline.
- Playwright covers browser journeys, role/access variants, payment-versus-Work separation, recovery states, and responsive/accessibility smoke checks.
- TypeScript checks and ESLint/Prettier checks are required where configured.
- The connected mockup remains pure HTML/CSS/JS until a later approved implementation decision changes its delivery form; it still follows the bridge's scenario/traceability contract.

### 5.3 Database/operations

- PostgreSQL catalog and migration checks are required for schema changes.
- Redis is tested as survivable infrastructure, never as domain/financial authority.
- Outbox, idempotency, retries, locks, and scheduler behavior require automated tests.
- Backup/restore and migration rehearsal are evidence gates, not README claims.

## 6. Branch, commit, and review discipline

- Work remains on a dedicated planning or implementation branch.
- One controlling artifact or one implementation change per focused commit.
- Commit messages identify the artifact/change and intent.
- Do not mix a product decision, schema change, UI rewrite, and unrelated formatting cleanup in one commit.
- Every implementation commit links the story ID and OpenSpec change ID where applicable.
- Every merge requires automated checks plus human/agent code review against the story contract.
- A red CI check blocks merge unless the failing check is explicitly dispositioned and the exception is recorded.
- Secrets, credentials, tokens, personal data, real government-ID files, and real payment evidence never enter Git or fixtures.

## 7. Required implementation change flow

```text
BMAD source/decision
        |
        v
Hardened story selected
        |
        v
OpenSpec change + scenarios + traceability
        |
        v
Context7/API verification + design review
        |
        v
Implementation via BMAD dev-story workflow
        |
        v
Pest/Playwright/static analysis/format/schema checks
        |
        v
Code review + evidence record
        |
        v
Focused commit and story completion
        |
        v
Readiness/release gate appropriate to the plane
```

Required stop conditions:

- Upstream BMAD artifact conflict.
- Missing story traceability.
- Missing state/schema/ADR decision.
- Missing failure or recovery scenario.
- Missing privacy/authorization/financial boundary.
- Toolchain or version mismatch.
- CI/test failure that is not understood.
- A sandbox/capstone action being mistaken for pilot or production evidence.

## 8. Development data and evidence classes

Every record created by tests, mockups, fixtures, demos, agents, or team rehearsal must carry its evidence class:

- `CAPSTONE`
- `SANDBOX`
- `TEAM_TRAINING`
- `GENUINE_PILOT`

Only explicitly approved genuine Tagudin records can contribute to pilot metrics. No test harness, OpenSpec mockup, seeded dataset, or sandbox payment can count as market validation.

## 9. Definition of done

A change is done only when:

- The BMAD story and OpenSpec change are linked.
- Canonical requirements/states/schema/ADR references resolve.
- Acceptance and failure/recovery scenarios pass.
- Authorization, consent, privacy, audit, and evidence classification are tested where relevant.
- Payment and Work remain independent where the lane requires it.
- Migration/schema checks pass where relevant.
- Browser/accessibility checks pass where relevant.
- Static analysis and formatting pass.
- No secrets or stale product claims were introduced.
- Evidence output is saved with the correct class.
- Code review is complete.
- The focused commit is present.

## 10. Mockup-specific rule

The later connected mockup is a BMAD UX artifact implemented through OpenSpec change packages. The mockup bridge remains the normative bridge for screen IDs, connected scenarios, shared role state, stale-term gates, and acceptance behavior. The mockup may be produced after this P0 closure, but it must not become the excuse to bypass BMAD, schema/domain decisions, or story readiness.
