# Capability Spec — Canonical schema migration baseline

Change ID: `e0-s2-canonical-schema-migration-baseline`  
Capability: `canonical-schema-migration`  
Story: `E0-S2`

## ADDED Requirements

### Requirement: Canonical 58-table inventory is the only active catalog authority

The system MUST treat the approved 58-table inventory (observed 47-table migrated baseline plus eleven initiative additions) as the only active application-table planning and verification count. Historical 46-table evidence MUST NOT be used as current pass criteria.

#### Scenario: Catalog assertion counts exactly 58 application tables

- **Given** a disposable PostgreSQL 16 database after the approved migration chain completes
- **When** application tables are listed excluding `migrations` and `spatial_ref_sys`
- **Then** the sorted list equals the canonical 58 names
- **And** the eleven initiative tables are present: `category_versions`, `listing_capacity_reservations`, `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, `integration_sync_cursors`, `inbox_messages`, `capability_activations`, `command_approvals`

#### Scenario: ERD and catalog agree

- **Given** `docs/planning-hardening/07-canonical-erd.svg` and the live catalog
- **When** table names are compared
- **Then** every canonical table appears in both
- **And** no extra application table exists in the catalog

---

### Requirement: Logical Batch 000–009 migration order with durable checkpoints

Migrations MUST follow the logical Batch 000–009 manifest. Each completed logical batch MUST record a durable checkpoint under `migration_version = 'canonical-58-v1'` with batch codes `000` through `009`, status, and checksum. A failed batch MUST NOT be marked completed and MUST block later canonical batches.

#### Scenario: Successful chain writes completed checkpoints 000–009

- **Given** an empty disposable database
- **When** historical migrations and E0-S2 delta migrations run successfully
- **Then** `canonical-58-v1` checkpoints `000`–`009` exist with `status = completed`
- **And** each completed row stores a checksum for the implementing migration content

#### Scenario: Failed batch stops advancement

- **Given** a disposable database where logical batch `N` fails mid-apply
- **When** checkpoint state is inspected
- **Then** batch `N` is not `completed`
- **And** no canonical batch `> N` is `completed`

#### Scenario: Historical idempotency hardening is not logical Batch 008

- **Given** the historical migration that inserted a checkpoint with `batch = '008'` under a per-file `migration_version`
- **When** canonical Batch 008 readiness is evaluated
- **Then** only `migration_version = 'canonical-58-v1'` and `batch = '008'` counting integration/activation/approval objects MAY satisfy Batch 008
- **And** the historical label MUST NOT be treated as proof of integrations schema

---

### Requirement: Clean-build and observed-baseline paths converge

The migration chain MUST support an empty-database path and an observed 47-table baseline path. Both MUST converge on the same catalog, required constraints/indexes, and canonical checkpoint set.

#### Scenario: Empty database clean build

- **Given** an empty disposable PostgreSQL 16 database
- **When** the full Laravel migration chain runs
- **Then** the catalog matches the 58-table authority

#### Scenario: Brownfield from observed baseline

- **Given** a disposable database restored or migrated to the observed 47 application tables and no eleven initiative tables
- **When** only the E0-S2 additive delta migrations run
- **Then** the catalog matches the same 58-table authority as the empty path
- **And** historical migration files are not rewritten

---

### Requirement: Initiative tables and amendments enforce declared integrity

PostgreSQL MUST enforce the FK, unique, partial unique, check, exclusion, and trigger contracts declared for the eleven initiative tables and required existing-table amendments in `canonical-schema-rebuilt.md`.

#### Scenario: Reservation oversell is rejected

- **Given** an active held or committed reservation occupying a capacity slot/resource
- **When** a conflicting held/committed reservation is inserted for the same protected key
- **Then** the database rejects the write

#### Scenario: Unbalanced ledger posting is rejected

- **Given** a financial transaction whose entries do not balance per currency
- **When** the posting write is attempted
- **Then** the database rejects the write

#### Scenario: Inbox duplicate identity is rejected

- **Given** an existing `inbox_messages` row for a consumer and source event
- **When** another row with the same `(consumer, source_event_id)` is inserted
- **Then** the database rejects the write

#### Scenario: Integration secrets are non-recoverable plaintext

- **Given** an `integration_credentials` row
- **When** the schema is inspected
- **Then** only hash or secret-reference storage columns exist
- **And** no plaintext secret column is present

#### Scenario: Deal dependency cycle is rejected

- **Given** deal needs within one chain
- **When** an active dependency edge that would create a cycle is inserted
- **Then** the database trigger or constraint rejects the write

#### Scenario: Cross-owner integration mapping is rejected

- **Given** an integration client owned by user A
- **When** a mapping is inserted that attributes ownership to user B without satisfying the composite owner/client FK
- **Then** the database rejects the write

---

### Requirement: Backup/restore and rollback rehearsals are evidence gates

E0-S2 MUST NOT be marked complete without disposable backup/restore and failed-batch rollback rehearsals whose checksums and catalogs match. Success in disposable environments MUST NOT be interpreted as production migration authorization.

#### Scenario: Backup restore matches checksums

- **Given** a disposable database after canonical checkpoint `009` completed
- **When** a custom-format dump is restored into a fresh disposable database
- **Then** application catalog and `canonical-58-v1` checksums match the source
- **And** evidence is labeled `CAPSTONE` or `TEAM_TRAINING` with secrets redacted

#### Scenario: Rollback restores pre-batch snapshot

- **Given** a disposable snapshot taken before a deliberate failed batch
- **When** the rollback/restore procedure runs
- **Then** the database matches the pre-batch snapshot
- **And** the failed batch is identifiable in checkpoint evidence

#### Scenario: Production migration remains unauthorized

- **Given** all disposable E0-S2 proofs pass
- **When** operators interpret the result
- **Then** no production migration, live credential use, or customer activation is authorized by this capability alone

---

### Requirement: Implementation stop/go precedes T1

T1 and feature migrations MUST remain blocked until this change records readiness PASS from Data/Backend lead, Architect, and QA lead against the verification matrix.

#### Scenario: STOP when catalog proof missing

- **Given** the OpenSpec packet exists but E0-S2-T01–T07 evidence is incomplete
- **When** a contributor proposes starting T1 kernel implementation
- **Then** the stop/go gate is STOP
- **And** no T1 implementation task may proceed

#### Scenario: GO unlocks only T0 completion handoff to T1 packet authoring

- **Given** packet reviews pass and E0-S2-T01–T07 evidence passes
- **When** stop/go is recorded GO
- **Then** T0 schema baseline may be marked complete
- **And** the next authorized step is authoring the T1 LLD/OpenSpec, not ad-hoc feature migrations
