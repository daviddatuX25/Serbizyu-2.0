# Canonical Schema and Restore-Manifest Verification

Date: 2026-08-02T03:35:21+08:00 (Asia/Manila)
Evidence class: CAPSTONE / TEAM_TRAINING
Database target: isolated local PostgreSQL database `serbizyu_ci_verify`

## Scope

This artifact records the earlier non-destructive verification of the canonical PostgreSQL schema and the readability of a custom-format backup archive. It does not claim production backup readiness. The later full disposable restore rehearsal is retained in `docs/audits/evidence/schema-restore-2026-08-02-041233/`.

## Canonical catalog gate

Command:

```sh
docker compose exec -T db psql -U serbizyu -d serbizyu_ci_verify -Atc "SELECT 'application_tables=' || count(*) FROM pg_catalog.pg_tables WHERE schemaname=current_schema() AND tablename NOT IN ('migrations','spatial_ref_sys'); SELECT 'catalog_objects=' || count(*) FROM (SELECT indexname AS name FROM pg_catalog.pg_indexes WHERE schemaname=current_schema() UNION SELECT conname AS name FROM pg_catalog.pg_constraint WHERE connamespace=current_schema()::regnamespace) catalog_objects WHERE name IN ('cohort_classifications_classified_at_idx','idempotency_keys_scope_key_uq','outbox_messages_pending_delivery_idx','outbox_messages_status_ck','retention_holds_active_evidence_idx','retention_holds_status_ck');"
```

Observed result:

```text
application_tables=46
catalog_objects=6
```

The repository contract test also passed:

```text
tests/Feature/DatabaseCatalogContractTest.php
Tests: 1 passed (2 assertions)
```

The catalog intentionally excludes PostgreSQL/PostGIS system tables `migrations` and `spatial_ref_sys`, matching `DatabaseCatalogContractTest.php`.

## Custom-format archive readability

Command:

```sh
docker compose exec -T db sh -lc 'set -eu; pg_dump -Fc --no-owner -U serbizyu -d serbizyu_ci_verify -f /tmp/serbizyu-ci-verify.dump; pg_restore --list /tmp/serbizyu-ci-verify.dump; rm -f /tmp/serbizyu-ci-verify.dump'
```

Observed archive header:

```text
Archive created at 2026-08-01 19:32:18 UTC
Database: serbizyu_ci_verify
TOC Entries: 419
Compression: gzip
Format: CUSTOM
Dumped from database version: 16.9
Dumped by pg_dump version: 16.9
```

The `pg_restore --list` operation successfully enumerated tables, table data, primary keys, unique constraints, indexes, triggers, and foreign-key constraints. The manifest included all 46 canonical application tables plus the expected PostGIS system table entry.

## Safety boundary

- No database was dropped, reset, or altered by this evidence run.
- The archive existed only as `/tmp/serbizyu-ci-verify.dump` inside the database container and was removed after manifest validation.
- The full disposable replay that supersedes this manifest-only check is retained in `docs/audits/evidence/schema-restore-2026-08-02-041233/`; it used a second tmpfs PostGIS target and matched the migration checkpoint chain and application table census.
