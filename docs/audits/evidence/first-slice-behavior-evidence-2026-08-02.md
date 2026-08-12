# First-Slice Behavior, Audit, Outbox, and Idempotency Evidence

Date: 2026-08-02T03:35:21+08:00 (Asia/Manila)
Evidence class: CAPSTONE / TEAM_TRAINING
Scope: local/mock first connected vertical slice only

## Focused integration behavior gate

Command:

```sh
docker compose run --rm --no-deps -u root \
  -e DB_DATABASE=serbizyu_ci_verify \
  -v "$PWD/app:/var/www/html/app" \
  -v "$PWD/config:/var/www/html/config" \
  -v "$PWD/routes:/var/www/html/routes" \
  -v "$PWD/database:/var/www/html/database" \
  -v "$PWD/tests:/var/www/html/tests" \
  -v "$PWD/phpunit.xml:/var/www/html/phpunit.xml:ro" \
  -v "$PWD/vendor:/var/www/html/vendor" \
  -v "$PWD/.env:/var/www/html/.env:ro" \
  app vendor/bin/pest \
  --filter='submit_is_idempotent_and_immutable_and_stale_writes_are_rejected' --compact
```

Observed result:

```text
Tests:    1 passed (13 assertions)
Duration: 0.71s
```

The test asserts, within one transaction:

- repeated submission with the same idempotency key returns the same listing;
- listing versions remain immutable and the expected version count is preserved;
- an `idempotency_keys` row reaches `succeeded`;
- a `listing.submit_review` audit event is written;
- a `listing.submitted_for_review` outbox message is written;
- a stale update returns HTTP 409 with `VERSION_CONFLICT`.

The separate authorization feature test asserts JSON `AUTHORIZATION_DENIED`, the requested correlation ID, and the `X-Correlation-Id` response header.

## Persisted local/mock browser evidence

The following read-only query was run against the local Compose application database after the manually verified browser listing submission:

```sh
docker compose exec -T db psql -U serbizyu -d serbizyu -Atc "SELECT 'latest_audit=' || action || '|' || target_id || '|' || correlation_id FROM audit_events WHERE action='listing.submit_review' ORDER BY occurred_at DESC LIMIT 1; SELECT 'latest_outbox=' || event_type || '|' || aggregate_id FROM outbox_messages WHERE event_type='listing.submitted_for_review' ORDER BY created_at DESC LIMIT 1; SELECT 'latest_idempotency=' || scope || '|' || key || '|' || status FROM idempotency_keys ORDER BY created_at DESC LIMIT 1;"
```

Observed result, with the idempotency key redacted here:

```text
latest_audit=listing.submit_review|019fbea4-0625-703a-9f7c-6bc6e11d2f39|b0747f54-ab05-4790-9f28-c9c06a8f8011
latest_outbox=listing.submitted_for_review|019fbea4-0625-703a-9f7c-6bc6e11d2f39
latest_idempotency=listing.submit:019fbea4-0625-703a-9f7c-6bc6e11d2f39|[REDACTED]|succeeded
```

The audit and outbox rows share the same aggregate ID, and the idempotency record is in `succeeded` state for that submission scope.

## Evidence boundary

- The persisted rows are from the local/mock Compose database, not production.
- The focused Pest test uses `DatabaseTransactions`; its rows are intentionally rolled back after assertions. Its output proves behavior, while the query above proves persistence from the separately exercised local browser flow.
- No credentials, secrets, connection strings, or idempotency key values are retained.
