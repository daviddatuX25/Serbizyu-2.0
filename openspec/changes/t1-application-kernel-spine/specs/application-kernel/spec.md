# Capability Spec — Application kernel

Change ID: `t1-application-kernel-spine`

## ADDED Requirements

### Requirement: Idempotent commands replay identical payloads

Writable commands MUST reserve an idempotency row under `(scope, key)` inside a transaction. Identical `request_hash` MUST replay the stored successful response. A different hash under the same key MUST fail with `IDEMPOTENCY_KEY_REUSED`.

#### Scenario: Replay succeeds

- **Given** a succeeded idempotency row for scope/key/hash
- **When** the same command is submitted again
- **Then** the prior response payload is returned
- **And** no second domain mutation occurs

#### Scenario: Conflicting payload is rejected

- **Given** an existing idempotency row for scope/key
- **When** a command arrives with a different request hash
- **Then** the system rejects with `IDEMPOTENCY_KEY_REUSED`

### Requirement: Audit and outbox commit with the mutation

Successful commands MUST write an `audit_events` row and a pending `outbox_messages` row in the same database transaction as the domain mutation and idempotency success update.

#### Scenario: Transactional integrity

- **Given** a command that mutates an aggregate
- **When** the transaction commits
- **Then** audit and outbox rows exist for that correlation
- **And** if the transaction rolls back, neither mutation nor outbox remains

### Requirement: Inbox ignores duplicates and parks gaps

Consumers MUST not process the same `(consumer, source_event_id)` twice. A sequence gap MUST be parked as `gap` rather than silently advancing.

#### Scenario: Duplicate inbox event

- **Given** an inbox row for a consumer and source event
- **When** the same pair is recorded again
- **Then** the database unique constraint or consumer helper rejects/ignores the duplicate

### Requirement: Authorization denials do not enumerate

Denied actors MUST receive the stable `AUTHORIZATION_DENIED` envelope without revealing whether the target exists when policy requires non-enumeration.
