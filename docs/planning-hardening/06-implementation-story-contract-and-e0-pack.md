# Serbizyu 2.0 — Implementation Story Contract and E0 Foundation Story Pack

Status: CANONICAL IMPLEMENTATION-PLANNING CONTRACT — founder-approved 2026-07-31
Scope: E0 foundation only; this does not authorize production deployment, live money, sensitive-ID collection, or Tagudin validation.

## 1. Purpose

The rebuilt epics file provides complete aggregate coverage, but aggregate coverage is not the same as an executable story. This artifact defines the minimum contract for a story to enter a sprint and hardens the first four E0 stories against the P0-02 audit.

A story is executable only when a developer can identify:

- Why the story exists.
- The exact product, UX, domain, schema, ADR, and architecture contracts it implements.
- The command/query/event boundary.
- The affected tables and invariants.
- Authorization and sensitive-data behavior.
- Failure, retry, idempotency, and rollback behavior.
- Test evidence and fixture classification.
- Operational owner, estimate, dependencies, and completion evidence.

A story may remain a candidate when any of those are not yet resolved. Candidate status is not implementation clearance.

## 2. Required story contract

Every future sprint story shall contain these fields:

1. Stable story ID and title.
2. Epic and delivery plane (`C`, `T`, `S`, `SB`, `COND`, or `FUT`).
3. User/value outcome.
4. Direct PRD requirement IDs.
5. Direct UX journey/screen IDs.
6. Direct domain/state contract references.
7. Direct schema/table/constraint/index references.
8. Direct ADR and architecture references.
9. Dependencies and explicitly excluded scope.
10. Commands, queries, events, jobs, and external adapters.
11. Authorization, consent, privacy, and audit behavior.
12. Success-path acceptance scenarios.
13. Failure/retry/idempotency/concurrency scenarios.
14. Data/fixture classification and test evidence.
15. Observability and operational evidence.
16. Owner role, estimate, review gate, and rollback/disablement plan.

## 3. Definition of ready

A story may enter a sprint only if:

- Every reference resolves to an existing canonical artifact.
- Every referenced state transition exists in the domain/state contract.
- Every referenced table/constraint exists in the canonical schema or is explicitly introduced by the story.
- Payment stories identify lane, custody, evidence, correction, and journal behavior.
- Sensitive-data stories identify consent, access, retention, deletion, and audit behavior.
- At least one failure/recovery scenario exists in addition to the happy path.
- The test fixture class is explicit: `CAPSTONE`, `SANDBOX`, `TEAM/TRAINING`, or `GENUINE_PILOT`.
- The story has a named owner role and a bounded estimate.
- A reviewer can determine the story's completion evidence without asking what “done” means.

## 4. E0 foundation story pack

E0 is the first implementation-preparation slice. It establishes boundaries and testability; it does not implement marketplace features or connected money.

### E0-S1 — Application skeleton and module boundaries

Status: IMPLEMENTATION-READY FOR E0 AFTER TOOLCHAIN GATE
Plane: `C`, `S`
Estimate: 3 engineering days
Owner: Technical lead; reviewed by Architect and QA lead

#### Direct traceability

- PRD: `PRD-001`, `PRD-024`
- UX: `UX-001`, `UX-020`
- Domain/state: domain boundary rules and server-authoritative transition requirement in `domain-state-contracts-rebuilt.md`
- Schema: `audit_events`, `outbox_messages`, `idempotency_keys`, `migration_checkpoints`
- ADRs: `ADR-R-004`, `ADR-R-005`, `ADR-R-022`
- Architecture: module boundaries, request/command/read separation, environment promotion, and server-side authorization in `architecture-rebuilt.md`

#### Scope

- Create the application module structure for Identity/Access, Listings, Orders/Work, Payment Obligations, Trust/Support, and Operations.
- Define command, query, domain-event, job, and adapter namespaces.
- Define a server-authoritative application boundary so UI state cannot directly mutate domain state.
- Define local, test, capstone, and pilot environment profiles without production credentials.

#### Explicit exclusions

- No live payment adapter.
- No production database migration.
- No government-ID upload.
- No pilot activation.
- No deployment promotion.

#### Acceptance scenarios

- Given a valid command, when it reaches the application boundary, then authorization, validation, state transition, event publication, and audit context are visible in the defined order.
- Given a UI request that attempts to bypass a transition guard, when the server handles it, then the command is rejected and no aggregate state changes.
- Given each supported environment, when configuration validation runs, then only the environment-approved adapters are enabled and missing required values fail closed.
- Given a module imports another module, when architecture checks run, then only approved dependency directions pass.

#### Failure, retry, and security contract

- Invalid commands return a stable error code and correlation ID without leaking internals.
- Authorization is server-side and denial is audit-visible without exposing sensitive fields.
- Domain events are emitted through the outbox boundary; callers do not retry non-idempotent commands blindly.
- Module-boundary or configuration checks fail CI before merge.

#### Evidence and tests

- `E0-S1-T01` module dependency check.
- `E0-S1-T02` authorization denial test.
- `E0-S1-T03` environment validation matrix.
- `E0-S1-T04` command/event/audit integration test using `CAPSTONE` fixtures.

#### Completion evidence

- Architecture dependency report.
- Passing unit/integration test output.
- Redacted configuration-validation output for all non-production profiles.
- Reviewer sign-off that no secret or live adapter entered the repository.

#### Rollback

Delete the disposable application skeleton and revert the module-boundary commit. No production data or irreversible migration is allowed in this story.

### E0-S2 — Canonical schema migration baseline

Status: IMPLEMENTATION-READY ONLY AFTER P0-03 SCHEMA CONTRACT COMMIT
Plane: `C`, `S`
Estimate: 5 engineering days
Owner: Data/Backend lead; reviewed by Architect and QA lead

#### Direct traceability

- PRD: `PRD-024`, `PRD-032`, `PRD-055`, `PRD-056`, `PRD-057`, `PRD-058`, `PRD-059`
- UX: `UX-020`, `UX-021`, `UX-022`, `UX-023`
- Domain/state: all canonical aggregate identifiers, transition-history, audit, outbox, and idempotency boundaries
- Schema: all 42 canonical tables; `migration_checkpoints`; every declared FK, unique constraint, check constraint, index, retention field, and version field
- ADRs: `ADR-R-001`, `ADR-R-002`, `ADR-R-003`, `ADR-R-006`, `ADR-R-007`, `ADR-R-008`, `ADR-R-009`, `ADR-R-010`, `ADR-R-011`, `ADR-R-012`, `ADR-R-013`, `ADR-R-014`, `ADR-R-015`, `ADR-R-016`, `ADR-R-017`, `ADR-R-018`, `ADR-R-019`, `ADR-R-020`, `ADR-R-021`, `ADR-R-023`, `ADR-R-024`, `ADR-R-025`, `ADR-R-026`, `ADR-R-027`, `ADR-R-028`
- Architecture: database ownership, backup/restore, migration promotion, transaction boundaries, and observability

#### Scope

- Generate migrations in the approved Batch 0–7 order.
- Create the canonical ERD and migration manifest from the P0-03 schema contract.
- Rehearse forward migration, clean rebuild, backup restore, and a documented rollback rehearsal in disposable environments.
- Prove all declared constraints and indexes exist in the database catalog.

#### Explicit exclusions

- No production migration.
- No production data import.
- No live Xendit/provider credentials.
- No sensitive-ID collection.
- No financial posting or payout behavior beyond schema/contract tests.

#### Acceptance scenarios

- Given an empty disposable PostgreSQL 16 database, when Batch 0–7 migrations run, then all 42 tables, constraints, indexes, audit fields, retention fields, and checkpoints exist.
- Given a clean rebuild, when the migration manifest is replayed, then the resulting catalog matches the canonical ERD inventory.
- Given an intentionally invalid FK, duplicate idempotency key, invalid status, negative amount, or unbalanced financial transaction, when the database receives it, then the write is rejected at the declared application/DB enforcement boundary.
- Given a backup taken after the final checkpoint, when it is restored into a disposable database, then schema version and migration checksums match.
- Given a failed batch in a disposable database, when the rollback procedure runs, then the checkpoint identifies the failed batch and no later batch is marked applied.

#### Failure, retry, and security contract

- Migration batches are checkpointed and rerunnable only when the manifest declares them idempotent.
- Destructive changes require an explicit expand/contract migration and restore rehearsal.
- Database credentials are environment-injected and never stored in migrations, fixtures, or logs.
- Schema drift blocks CI and promotion.

#### Evidence and tests

- `E0-S2-T01` clean migration test.
- `E0-S2-T02` schema-catalog-to-ERD comparison.
- `E0-S2-T03` constraint/index negative tests.
- `E0-S2-T04` backup/restore rehearsal.
- `E0-S2-T05` failed-batch checkpoint/rollback rehearsal.

#### Completion evidence

- Migration manifest with checksums.
- Generated canonical ERD.
- PostgreSQL catalog comparison report.
- Disposable backup/restore log with secrets redacted.
- Architect and Data/Backend lead approval.

#### Rollback

Restore the disposable database to its pre-batch snapshot and mark the failed checkpoint. No production rollback is permitted because this story is not a production migration authorization.

### E0-S3 — Test harness and contract fixtures

Status: IMPLEMENTATION-READY FOR E0 AFTER P0-05 TOOLCHAIN GATE
Plane: `C`, `S`
Estimate: 4 engineering days
Owner: QA/Platform lead; reviewed by Backend, UX, and Architect

#### Direct traceability

- PRD: `PRD-024`, `PRD-032`, `PRD-055`, `PRD-056`, `PRD-057`, `PRD-058`, `PRD-059`
- UX: all 23 canonical journeys through the fixture coverage index; minimum E0 smoke paths `UX-001`, `UX-004`, `UX-008`, `UX-009`, `UX-010`, `UX-011`, `UX-012`, `UX-013`, `UX-014`, `UX-015`, `UX-016`, `UX-017`, `UX-018`, `UX-019`, `UX-020`, `UX-021`, `UX-022`, `UX-023`
- Domain/state: order, Work, payment obligation, external evidence, dispute, hold, release/payout, and Agent consent contracts
- Schema: all state-bearing tables plus `audit_events`, `outbox_messages`, `idempotency_keys`, `cohort_classifications`
- ADRs: `ADR-R-006`, `ADR-R-007`, `ADR-R-008`, `ADR-R-009`, `ADR-R-010`, `ADR-R-011`, `ADR-R-012`, `ADR-R-013`, `ADR-R-014`, `ADR-R-015`, `ADR-R-016`, `ADR-R-017`, `ADR-R-018`, `ADR-R-019`, `ADR-R-020`, `ADR-R-021`, `ADR-R-022`, `ADR-R-023`, `ADR-R-024`, `ADR-R-025`, `ADR-R-026`, `ADR-R-027`, `ADR-R-028`
- Architecture: testing pyramid, fixture isolation, observability, queue/outbox, and environment promotion

#### Scope

- Establish unit, domain-transition, integration, authorization, browser, accessibility, and contract-test categories.
- Create deterministic fixtures for `CAPSTONE`, `SANDBOX`, `TEAM/TRAINING`, and `GENUINE_PILOT` records.
- Create representative A1/A3/A4/A9 and four-lane fixtures without live providers.
- Add assertions for outbox delivery, idempotency, ledger balancing, state separation, and cohort classification.

#### Explicit exclusions

- No fixture may count as genuine Tagudin validation.
- No live provider call.
- No real ID document.
- No real money or production webhook.

#### Acceptance scenarios

- Given a test run, when fixtures are loaded, then each fixture carries its evidence class and test data cannot be counted by pilot metrics.
- Given an A1/A3/A4/A9 fixture, when Work and payment events are exercised, then payment confirmation never silently completes Work.
- Given duplicate/out-of-order event delivery, when the test harness replays it, then idempotency and state guards produce one effective transition.
- Given a disputed or held obligation, when completion/release is attempted, then the applicable transition is blocked and an audit event is emitted.
- Given a browser journey, when keyboard-only and mobile viewport checks run, then primary actions, status language, and error recovery remain usable.

#### Evidence and tests

- `E0-S3-T01` fixture-classification test.
- `E0-S3-T02` state-contract property tests.
- `E0-S3-T03` duplicate/out-of-order event tests.
- `E0-S3-T04` payment-versus-Work separation tests.
- `E0-S3-T05` browser/accessibility smoke suite.
- `E0-S3-T06` pilot-metric exclusion test.

#### Completion evidence

- Test tool configuration and commands.
- Fixture catalog with evidence classes.
- Initial green test report.
- Deliberately failing negative-test report converted to passing assertions.
- QA lead approval.

#### Rollback

Remove only disposable test configuration/fixtures and revert the test-harness commit. No application data is affected.

### E0-S4 — Secure configuration and secrets boundary

Status: IMPLEMENTATION-READY FOR E0 AFTER P0-05 TOOLCHAIN GATE
Plane: `C`, `S`
Estimate: 3 engineering days
Owner: Platform/security lead; reviewed by Architect and QA lead

#### Direct traceability

- PRD: `PRD-003`, `PRD-024`, `PRD-055`, `PRD-056`, `PRD-057`, `PRD-058`, `PRD-059`
- UX: `UX-001`, `UX-020`, `UX-021`, `UX-022`, `UX-023`
- Domain/state: authorization, consent, evidence, audit, and administrative hold boundaries
- Schema: `audit_events`, `retention_holds`, `evidence_files`, `identity_verifications`, `provider_events`, `outbox_messages`
- ADRs: `ADR-R-003`, `ADR-R-004`, `ADR-R-005`, `ADR-R-006`, `ADR-R-017`, `ADR-R-020`, `ADR-R-021`, `ADR-R-022`, `ADR-R-024`, `ADR-R-027`, `ADR-R-028`
- Architecture: environment isolation, private evidence storage, redaction, logging, backup, rotation, and deployment promotion

#### Scope

- Define environment-variable schema and startup validation.
- Keep secrets outside Git, fixtures, logs, error pages, screenshots, and mock data.
- Define redaction rules and secret rotation/revocation procedure.
- Define disabled-by-default flags for live providers, sensitive-ID collection, production queues, and connected-money behavior.

#### Explicit exclusions

- No secret generation or insertion.
- No live provider activation.
- No production identity evidence.
- No deployment.

#### Acceptance scenarios

- Given a missing required environment variable, when the application starts, then it fails closed with a redacted configuration error.
- Given a secret-like value in a request, exception, job, or log context, when redaction runs, then the value is not persisted or rendered.
- Given a developer tries to enable a live provider in a capstone/test profile, when configuration validation runs, then the profile is rejected.
- Given a key rotation, when the old key is revoked, then new operations use the replacement and old credentials are absent from logs and configuration snapshots.
- Given a sensitive evidence feature flag is disabled, when a client requests upload, then the request is rejected without accepting or storing the file.

#### Evidence and tests

- `E0-S4-T01` environment-schema validation matrix.
- `E0-S4-T02` secret-scanning and redaction tests.
- `E0-S4-T03` disabled-provider fail-closed test.
- `E0-S4-T04` rotation/revocation rehearsal with synthetic values.
- `E0-S4-T05` sensitive-upload-disabled test.

#### Completion evidence

- Redacted environment contract.
- Secret scanning configuration and CI output.
- Rotation/revocation runbook using synthetic credentials only.
- Fail-closed test output.
- Security/platform lead approval.

#### Rollback

Disable the affected feature flag and revert configuration validation changes. Never roll back by exposing a secret or enabling a default credential.

## 5. Subsequent-story gate

E1–E9 stories remain canonical candidates until each selected story receives this contract. Aggregate `59/59` coverage is retained as planning completeness, not evidence that all stories are executable.

The next story pack must be approved after E0 evidence exists and must begin with the smallest connected identity/access slice, not a batch rewrite of all remaining stories.
