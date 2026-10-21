# Serbizyu 2.0 — Canonical Schema and ERD Decision Contract

Status: CANONICAL SCHEMA AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; Request/Tender foundation reconciled 2026-09-25; implementation remains migration-gated
BMAD phase: Phase 3 — Data model / schema contract
Depends on:

- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`
- `docs/planning-hardening/07-canonical-erd.svg` (rendered relationship ERD)
- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`

This document is the sole current schema inventory for the rebuilt plan. It replaces the old conflicting 30/31/38/39-table claims after approval. No migration may be generated from the historical architecture or ADR catalog directly.

## 1. Schema principles

- PostgreSQL is the authoritative transactional store for application state.
- Money amounts use integer minor units (`BIGINT` centavos) plus explicit ISO currency.
- Event/history records are append-only; corrections create new records.
- Business state transitions are explicit and validated against the domain contract.
- Foreign keys, uniqueness, check constraints, and indexes are part of the schema contract.
- Sensitive evidence is referenced through controlled file metadata, not exposed as public URLs.
- Every mutable aggregate has a `version`/concurrency field and timestamps.
- Soft deletion/archival is used where history or evidence must remain traceable.
- JSONB is permitted only for versioned shape-specific payloads with application/schema validation; it must not hide core relational invariants.
- The initial pilot does not create tables for unapproved live connected-payment or deferred product features merely because future extension is desired.

## 2. Canonical inventory

The approved canonical inventory contains the observed **47-table migrated baseline** (the prior core 42, four-table Deal-Chaining foundation, and `auth_otps`) plus **fourteen approved extension tables**. The resulting planning inventory is **61 tables**. Deal-Chaining remains coordination-only, Tender Invitations remain Request-owned, catalog versions remain non-runtime authoring inputs, account integrations remain owner-scoped adapters, and no pooled finance, custody, offline authority, or parent liability is implied.

### Identity and authorization

1. `users`
2. `user_profiles`
3. `role_assignments`
4. `identity_verifications`
5. `evidence_files`
6. `consent_grants`

### Product and taxonomy

7. `categories`
8. `capability_profiles`
9. `listings`
10. `listing_versions`
11. `listing_capacity`
12. `requests`
13. `quotes`

### Orders and fulfillment

14. `orders`
15. `order_parties`
16. `order_terms_snapshots`
17. `work_instances`
18. `work_events`

### Payments and accounting

19. `payment_obligations`
20. `payment_events`
21. `policy_versions`
22. `financial_accounts`
23. `financial_transactions`
24. `financial_entries`
25. `provider_events`
26. `financial_adjustments`

### Trust, support, and safety

27. `disputes`
28. `dispute_events`
29. `administrative_holds`
30. `support_cases`
31. `safety_incidents`
32. `reviews`

### Communication and evidence operations

33. `conversations`
34. `messages`
35. `notifications`
36. `notification_deliveries`
37. `cohort_classifications`

### Platform integrity and audit

38. `audit_events`
39. `outbox_messages`
40. `idempotency_keys`
41. `retention_holds`
42. `migration_checkpoints`

`migration_checkpoints` is operational migration metadata, not product data. It must not be used as a substitute for backups or a schema migration tool’s own history.

### 2.1 Approved bounded Deal-Chaining foundation inventory

This founder-approved foundation contract is part of canonical D0 schema reconciliation. It commits persistence headroom and aggregate boundaries; it does **not** authorize the later bounded user-facing feature or pilot activation.

43. `deal_chains`
44. `deal_needs`
45. `deal_dependencies`
46. `deal_invitations`

#### `deal_chains`

Purpose: coordinator-owned parent plan and derived roll-up boundary. It is not an Order, wallet, escrow, financial account, or parent-wide liability owner.

Required columns:

- `id UUID PRIMARY KEY`
- `coordinator_user_id UUID NOT NULL` → `users(id)` with `ON DELETE RESTRICT`
- `status TEXT NOT NULL` — `draft`, `planning`, `sourcing`, `in_progress`, `partially_complete`, `blocked`, `completed`, `cancelled`, `archived`
- `title TEXT NOT NULL`, `goal TEXT NOT NULL`
- `target_at TIMESTAMPTZ NULL`, `target_location JSONB NULL` with `payload_version INTEGER NOT NULL` when present
- `row_version INTEGER NOT NULL`, `correlation_id UUID NOT NULL`, timestamps, `archived_at TIMESTAMPTZ NULL`

The chain’s progress and cost are derived from child Needs and independent child Orders; no parent payment obligation, pooled balance, automatic split, or parent-wide guarantee is stored.

#### `deal_needs`

Purpose: one required ordered service/product slot within a Deal Chain.

Required columns:

- `id UUID PRIMARY KEY`, `deal_chain_id UUID NOT NULL` → `deal_chains(id)` with `ON DELETE RESTRICT`
- `ordinal INTEGER NOT NULL CHECK (ordinal > 0)`
- `need_kind TEXT NOT NULL` — `service` or `product`
- `title TEXT NOT NULL`, `description TEXT NOT NULL`
- `status TEXT NOT NULL` — `draft`, `open`, `sourcing`, `invited`, `quoted`, `partner_confirmed`, `in_progress`, `blocked`, `completed`, `failed`, `cancelled`, `replacement_needed`, `superseded`
- `requested_at TIMESTAMPTZ NOT NULL`, `due_at TIMESTAMPTZ NULL`
- `replaces_deal_need_id UUID NULL` → same-chain `deal_needs(id)` with `ON DELETE RESTRICT`
- `row_version INTEGER NOT NULL`, `correlation_id UUID NOT NULL`, timestamps

One Need may have many linked Requests and Quotes, but at most one active non-cancelled child Order. `partner_confirmed` records invitation response only and has no Order authority; every `in_progress` or later execution state requires the same-Need child Order. Replacement creates a new Need and preserves the prior Need/Order history.

#### `deal_dependencies`

Purpose: explicit directed `blocks` edge between two Needs in the same Chain.

Required columns:

- `id UUID PRIMARY KEY`, `deal_chain_id UUID NOT NULL` → `deal_chains(id)` with `ON DELETE RESTRICT`
- `predecessor_need_id UUID NOT NULL`, `successor_need_id UUID NOT NULL`
- `dependency_type TEXT NOT NULL CHECK (dependency_type = 'blocks')`
- `status TEXT NOT NULL` — `active`, `removed`, `superseded`
- `condition_code TEXT NOT NULL`, `created_by_user_id UUID NOT NULL` → `users(id)`
- `row_version INTEGER NOT NULL`, `correlation_id UUID NOT NULL`, timestamps, `removed_at TIMESTAMPTZ NULL`

Composite foreign keys `(deal_chain_id, predecessor_need_id)` and `(deal_chain_id, successor_need_id)` reference `(deal_chain_id, id)` on `deal_needs`, proving same-chain membership. `CHECK (predecessor_need_id <> successor_need_id)` rejects self-edges. A partial unique index on `(deal_chain_id, predecessor_need_id, successor_need_id, dependency_type)` where `status = 'active'` rejects duplicate active edges. Cycle prevention is enforced by the command transaction under a chain dependency lock plus a database constraint-trigger/reachability check; cycles are never accepted.

#### `deal_invitations`

Purpose: invitation to one specific Need; accepting it is not Order creation.

Required columns:

- `id UUID PRIMARY KEY`, `deal_need_id UUID NOT NULL` → `deal_needs(id)` with `ON DELETE RESTRICT`
- `invited_provider_user_id UUID NOT NULL` → `users(id)` with `ON DELETE RESTRICT`
- `invited_by_user_id UUID NOT NULL` → `users(id)` with `ON DELETE RESTRICT`
- `acting_for_user_id UUID NULL` → `users(id)` with `ON DELETE SET NULL` only when audit/anonymization policy permits
- `purpose TEXT NOT NULL`, `scope JSONB NOT NULL`, `payload_version INTEGER NOT NULL`
- `status TEXT NOT NULL` — `draft`, `sent`, `viewed`, `accepted`, `declined`, `expired`, `revoked`, `superseded`, `cancelled`
- `expires_at TIMESTAMPTZ NOT NULL`, `responded_at TIMESTAMPTZ NULL`, `response_note TEXT NULL`
- `acceptance_idempotency_key TEXT NULL`, `acceptance_correlation_id UUID NULL`
- `row_version INTEGER NOT NULL`, `correlation_id UUID NOT NULL`, timestamps, `revoked_at TIMESTAMPTZ NULL`

Direct invitation response is actor-attributed, version-checked, idempotent through the shared `idempotency_keys` boundary (with a unique invitation/key guard), and audit/outbox-backed. Acceptance may move a Need to `partner_confirmed` but creates no agreement; a separate child-agreement command forms or links an ordinary Order and atomically moves the Need to Order-backed `in_progress`.

#### Existing-table lineage columns and rules

- `requests.deal_chain_id UUID NULL` and `requests.deal_need_id UUID NULL`; both null or both non-null, with composite FK to `deal_needs` and indexes on `(deal_need_id, status, expires_at)`.
- `quotes.deal_chain_id UUID NULL` and `quotes.deal_need_id UUID NULL`; both null or both non-null, with composite FK to `deal_needs`. When a Quote references a Request, the lineage pair must match the Request through an application/constraint-trigger check; no parallel bidding model is introduced.
- `orders.deal_chain_id UUID NULL`, `orders.deal_need_id UUID NULL`, and `origin = 'deal_chain'` for child Orders. Both lineage columns are null or both non-null, with composite FK to `deal_needs`; a partial unique index on `deal_need_id` where the Order is non-cancelled and non-closed allows at most one active child Order per Need.
- `order_terms_snapshots`, `work_instances`, `payment_obligations`, `order_parties`, `evidence_files`, and `disputes` remain ordinary child-Order records. They retain independent parties, terms, Work, evidence, payment, dispute, cancellation, audit, and idempotency boundaries.
- Shared `audit_events`, `outbox_messages`, and `idempotency_keys` carry actor, acting-for, correlation, expected-version, command, and publication causality for all four foundation aggregates and lineage changes. No Deal-Chaining-specific history table is added.


### 2.2 Approved 2026-08-09 initiative-extension inventory

The numbers below extend, rather than renumber, the founder-approved inventory:

47. `auth_otps` — observed permanent phone-authentication table already migrated
48. `category_versions`
49. `listing_capacity_reservations`
50. `integration_clients`
51. `integration_credentials`
52. `integration_object_mappings`
53. `integration_webhook_subscriptions`
54. `integration_webhook_deliveries`
55. `integration_sync_cursors`
56. `inbox_messages`
57. `capability_activations`
58. `command_approvals`
59. `request_invitations`
60. `work_catalog_versions` — observed permanent governed authoring catalog already migrated
61. `deal_chain_catalog_versions` — observed permanent governed authoring catalog already migrated

#### `auth_otps`

- Columns: `id UUID PK`, normalized `phone_e164 TEXT`, `purpose TEXT`, `code_hash CHAR(64)`, `status pending|invalidated|consumed|expired`, `attempts SMALLINT`, `expires_at`, nullable `invalidated_at`/`consumed_at`, `row_version`, `correlation_id UUID`, timestamps.
- Checks/indexes: `attempts BETWEEN 0 AND 5`; lifecycle/time consistency; partial unique `(phone_e164, purpose) WHERE status = 'pending'`; phone/purpose/expiry, correlation, and purge indexes.
- Concurrency: issuance takes a transaction-scoped phone/purpose advisory lock, invalidates the current pending row, then inserts one pending challenge. Verification selects that row under lock and atomically increments attempts or changes it to consumed; expiry/invalidated/consumed rows never verify and concurrent verification cannot consume twice.
- Ownership/retention: `IdentityAccess`, P1 security data; purge expired/consumed/invalidated challenge rows after the policy period while preserving non-secret audit evidence.

#### `category_versions`

- Columns: `id UUID PK`, `category_id UUID NOT NULL`, `business_version INTEGER NOT NULL`, `status TEXT`, name/description/safety/data content, per-mechanism `sourcing_policy` with response eligibility, submission/revision/alternative limits, duplicate/replay rules, expiry/selection behavior, liquidity evidence thresholds, accountable Product owner, `sourcing_policy_schema_version`, `sourcing_policy_checksum`, `content_schema_version`, full checksum, nullable effective/published/paused/retired times, `created_by_user_id`, `correlation_id`, timestamps.
- FKs: category, Product owner, and creator `ON DELETE RESTRICT`.
- Checks/indexes: unique `(category_id, business_version)`; positive versions; sourcing-policy payload validates against its schema and has a deterministic checksum; lifecycle/time consistency; one current active version per category by partial unique index; published content and sourcing policy are immutable.
- Ownership/retention: `Listings`, P2 governed policy and sole reverse-sourcing content authority; retain every version referenced by profile, Listing, Request, terms, or activation.

#### `listing_capacity_reservations`

- Columns: `id UUID PK`, `listing_capacity_id`, `listing_version_id`, nullable `order_id`, `source_mechanism`, `source_reference_id`, positive `quantity`, nullable slot start/end, `status held|committed|released|expired`, `command_scope`, `idempotency_key`, `row_version`, nullable expiry/committed/released timestamps, `correlation_id`, timestamps.
- FKs: composite capacity/listing-version membership and optional Order use `ON DELETE RESTRICT`; source records are retained or explicitly nullable only by their retention contract.
- Checks/indexes: quantity/slot/status-time consistency; unique `(command_scope, idempotency_key)`; partial unique slot/resource ownership for held/committed rows; active expiry and Order indexes.
- Ownership/retention: `Listings`, P2 transaction history; terminal records remain with Order/audit history.

#### `integration_clients`

- Columns: `id UUID PK`, `owner_user_id UUID`, name, `status draft|active|suspended|revoked|archived`, `environment`, `audience`, `granted_scopes JSONB`, `scope_schema_version`, `scope_version`, `row_version`, nullable activated/revoked/archived times, `created_by_user_id`, `correlation_id`, timestamps.
- FKs: owner/creator `ON DELETE RESTRICT`. Unique `(owner_user_id, name)` among non-archived clients and `(id, owner_user_id)` for composite owner guards.
- Checks/indexes: scope is a versioned allow-list; lifecycle/time consistency; owner/status and revocation indexes.
- Ownership/retention: `Integrations`, P1/P2; archive, never delete while credentials/mappings/audit remain.

#### `integration_credentials`

- Columns: `id UUID PK`, `integration_client_id`, globally unique unguessable `public_selector`, `secret_hash` or `secret_reference`, algorithm/version, environment/audience, immutable `granted_scopes JSONB`, `scope_schema_version`, `granted_scope_version`, `status active|overlap|revoked|expired`, nullable `rotates_from_credential_id`, `overlap_ends_at`, `revoked_at`, `last_used_at`, revoke reason, issued/expiry times, `row_version`, `correlation_id`, timestamps.
- FKs/checks/indexes: client/issuer/self rotation predecessor `ON DELETE RESTRICT`; exactly one secret storage form; positive grant version; rotation lineage cannot self-reference; active/overlap require unexpired secret and lifecycle-consistent times; unique selector plus client/status/expiry and overlap indexes.
- Authorization: effective scopes are the intersection of the credential's immutable grant, current restrictive client policy, owner/resource policy, and activation. Client scope expansion never expands an existing credential and requires a newly issued credential; reduction/suspension/revocation invalidates affected credentials immediately in web/workers/caches. Overlap has one bounded end and both generations remain auditable.
- Ownership/retention: `Integrations`, P1 secret metadata; plaintext is never stored/recoverable, and retired records remain for security audit.

#### `integration_object_mappings`

- Columns: `id UUID PK`, `integration_client_id`, `owner_user_id`, resource type, external ID, internal UUID, expected sync/business version, status, mapping schema version, nullable archived time, `correlation_id`, timestamps.
- FKs: composite `(client, owner)` to client ownership `ON DELETE RESTRICT`; internal resource FK is materialized per allowed resource type rather than an unconstrained polymorphic owner.
- Checks/indexes: unique `(client, resource_type, external_id)` and `(client, resource_type, internal_id)`; owner/client/resource/status indexes.
- Ownership/retention: `Integrations`, P2; archived mapping preserves sync and attribution history.

#### `integration_webhook_subscriptions`

- Columns: `id UUID PK`, `integration_client_id`, `owner_user_id`, normalized HTTPS endpoint, event allow-list, filter schema/version, secret reference, environment, status/version, endpoint-verification evidence, nullable suspended/revoked times, `correlation_id`, timestamps.
- FKs: composite client/owner `ON DELETE RESTRICT`; unique active `(client, endpoint)`; no secret value; lifecycle/time and HTTPS-outside-local checks.
- Ownership/retention: `Integrations`, P1/P2; preserve configuration and revocation history while deliveries/audit exist.

#### `integration_webhook_deliveries`

- Columns: `id UUID PK`, subscription/client/owner IDs, `outbox_message_id`, event/payload contract versions and hash, attempt number, destination host/IP snapshot, status, HTTP response class, retry count, next-attempt/dead-letter times, bounded error code, `correlation_id`, timestamps.
- FKs: subscription, composite client/owner, and outbox source `ON DELETE RESTRICT`.
- Checks/indexes: unique `(subscription_id, outbox_message_id, attempt_number)`; attempt/time/status consistency; due-retry, dead-letter, and correlation indexes.
- Ownership/retention: `Integrations`, P2; minimized payload follows source data class, delivery metadata survives through audit/replay policy.

#### `integration_sync_cursors`

- Columns: `id UUID PK`, client/owner IDs, resource stream, opaque cursor plus monotonic numeric sequence, contract version, status, nullable expiry/reset time/reason, `row_version`, `correlation_id`, timestamps.
- FKs: composite client/owner `ON DELETE RESTRICT`; unique `(client, resource_stream)`; sequence nonnegative and reset/time consistency.
- Ownership/retention: `Integrations`, P2; resets append audit and never silently move the sequence backward.

#### `inbox_messages`

- Columns: `id UUID PK`, consumer, source event ID, aggregate type/ID/version/sequence, event/payload contract versions, payload hash, status received|processing|processed|gap|unsupported|dead_letter, attempts, nullable prior-sequence/processed/next-attempt times, bounded error code, `correlation_id`, timestamps.
- Checks/indexes: unique `(consumer, source_event_id)` and `(consumer, aggregate_type, aggregate_id, aggregate_sequence)`; positive versions/sequences; lifecycle/time checks; due/gap/dead-letter indexes.
- Ownership/retention: `Operations`, P2 or source-higher class; retain beyond the maximum replay/reconciliation window.

#### `capability_activations`

- Columns: `id UUID PK`, capability code/version, explicit environment/cohort/geography, nullable owner, exact category `(category_id, category_business_version)`, exact profile `(capability_profile_family_code, capability_profile_business_version)`, mechanism/shape/lane/provider/client dimensions (`NULL` pair/value = wildcard), deterministic dimension fingerprint, decision enabled|disabled, immutable evidence/approval references, accountable Operations owner, `effective_at`, nullable `expires_at`, generated half-open `effective_range`, rollback/incident owner, nullable `supersedes_id`, `row_version`, `correlation_id`, timestamps.
- FKs/checks/indexes: exact category-version and capability-profile candidate keys, other governed dimensions, owners, and `supersedes_id` use `ON DELETE RESTRICT`; each versioned dimension is either wholly null or wholly populated; no polymorphic owner; `effective_at < expires_at` when bounded; GiST exclusion prevents overlap for one fingerprint; matching-dimension/current-decision indexes support one deterministic query.
- Temporal cutover: generate the successor ID, lock the current same-fingerprint row, verify expected `row_version`, choose one UTC cutover instant, update only its `expires_at` and closure metadata, then insert the immutable successor with the same instant as `effective_at` and the prior ID as `supersedes_id`. The update happens before insert so the exclusion constraint remains valid; both operations, audit, idempotency, and outbox commit together or none do. Decision/dimensions/evidence/approval/original effective time never mutate. Concurrent or stale cutover loses the lock/version check and has no effect.
- Evaluation/retention: lock all current tuple matches. Any matching deny is absolute. With zero denies, at least one enable is required; the enable with most non-null dimensions, then latest `effective_at`/ID, supplies the winning activation ID. The decision fingerprint hashes every matched activation ID/version/decision/effective range. Conditional/live-money/reverse-sourcing absence denies. Every adapter and queued irreversible effect rechecks before mutation. `Operations` owns P2/P4 rows; expired/superseded history remains with audit and accepted snapshots.

#### `command_approvals`

- Columns: `id UUID PK`, `approval_set_id UUID`, initiator/approver user IDs, `required_approver_role`, `approver_role`, nullable integration client, command type, immutable `command_fingerprint`, normalized payload hash, target IDs/versions/scopes, nullable amount/currency, policy version, reason/evidence, status pending|approved|consumed|expired|revoked, issued/expiry/consumed times, idempotency scope/key, `correlation_id`, timestamps.
- FKs: users/client/evidence `ON DELETE RESTRICT`; initiator differs from approver whenever maker/checker applies. Every row in one set binds the same command/payload/target/version/economics/policy/evidence/expiry fingerprint.
- Checks/indexes: unique `(approval_set_id, approver_user_id, approver_role)` and `(idempotency_scope, idempotency_key)`; required/actual role compatibility; one atomic set consumption; expiry/status/time, amount/currency, target/version checks; pending/expiry/fingerprint/actor indexes.
- Quorum: policy maps a command fingerprint to required independent roles. Live connected-money activation requires distinct founder, financial, security, and operations attestations; no actor satisfies two required roles in one set. The guarded command locks the set, proves the exact quorum current, then atomically consumes every attestation with activation/state/audit/idempotency/outbox or consumes none.
- Ownership/retention: `Operations`, P2/P4 by command; append-only approval, attestation, and consumption evidence.

#### `request_invitations`

- Columns: `id UUID PK`, `request_id UUID NOT NULL`, `inviter_user_id UUID NOT NULL`, `invited_provider_user_id UUID NOT NULL`, nullable `acting_for_user_id` and `consent_grant_id`, `purpose_code direct_invite_bid NOT NULL`, positive `purpose_version NOT NULL`, `status draft|sent|viewed|accepted|declined|expired|revoked|superseded|cancelled`, `expires_at TIMESTAMPTZ NOT NULL`, nullable responded/revoked timestamps and reason, `row_version`, `idempotency_scope`, `idempotency_key`, `correlation_id`, timestamps.
- FKs: Request, inviter, invited provider, acting-for user, and consent grant use `ON DELETE RESTRICT`; unique `(id, request_id, invited_provider_user_id)` is the exact relational target for Direct Invite Quotes.
- Checks/indexes: Request must be `direct_invite`; lifecycle/time consistency; time expiry is evaluated synchronously even before an expiry worker persists `expired`; inviter and invitee differ unless a separately activated self-dealing policy permits otherwise; partial unique `(request_id, invited_provider_user_id)` where status is `sent|viewed|accepted`; unique `(idempotency_scope, idempotency_key)`; invited-provider/status/expiry and Request/status indexes retain historical reinvitations.
- Authority: `sent|viewed|accepted` authorizes non-enumerating view while current; a valid Bid submission atomically advances `sent|viewed` to `accepted`; only current, unexpired `accepted` authorizes selection/finalization. Decline, revoke, supersession, cancellation, or synchronous expiry disqualifies every active Quote under that exact invitation before award.
- Privacy: no public lookup. Every query derives the invited provider from authenticated actor/acting context and returns the same non-enumerating denial for missing, expired, revoked, wrong-provider, and unauthorized identifiers.
- Ownership/retention: `Listings`, P1/P2 sourcing history; archive rather than delete while a Quote, Order, audit event, support case, or retention hold refers to the invitation.

#### `work_catalog_versions`

- Columns: `id UUID PK`, `catalog_code TEXT`, `work_shape TEXT`, positive `shape_contract_version`, `payload_schema_version`, and `catalog_version`, title, summary, `status draft|published|retired`, versioned `definition JSONB`, `payload_version`, `correlation_id`, timestamps.
- Checks/indexes: unique `(catalog_code, catalog_version)` and `(work_shape, shape_contract_version, payload_schema_version, catalog_version)`; status/shape index; published definitions are immutable and may reference only registered A1/A3/A4/A9 contracts and activated governed dimensions.
- Ownership/retention: `Catalogs`, P2 governed authoring input; retain every published version referenced by a source specification or accepted terms snapshot. It is never Work execution authority.

#### `deal_chain_catalog_versions`

- Columns: `id UUID PK`, `recipe_code TEXT`, positive `catalog_version`, title, `pattern`, description, `status draft|published|retired`, versioned category/listing-type/Work-shape sets, nonnegative `extra_fee_amount_minor`, `currency CHAR(3)`, rating from 0 through 5, nonnegative `booked_count`, versioned `definition JSONB`, `payload_version`, `correlation_id`, timestamps.
- Checks/indexes: unique `(recipe_code, catalog_version)`; status/recipe index; money/currency and rating/count consistency; published definitions are immutable and may generate only same-Chain acyclic Needs governed by current category, mechanism, and Work contracts.
- Ownership/retention: `Catalogs`, P2 governed authoring input; retain every published version referenced by a Deal Chain/Need source specification. It never owns child Orders, Work, Obligations, disputes, cancellation, replacement, or liability.

#### Existing-table amendments

- `capability_profiles` uses `profile_family_code`, immutable positive `business_version`, `content_schema_version`, and optimistic `row_version`; unique `(profile_family_code, business_version)` is the referenced candidate key and only one current active version exists per family. `category_versions` follows the equivalent category/business-version contract.
- `listing_versions` stores `category_id` + `category_business_version` and `capability_profile_family_code` + `capability_profile_business_version`; composite `ON DELETE RESTRICT` FKs pin the exact candidate keys. `listing_capacity` replaces unique `listing_id` with bucket identity `(listing_id, listing_version_id, capacity_type, resource_key)` and a composite membership key.
- Accepted `orders` require a same-Order current terms snapshot; `payment_obligations` require exactly one lane and any Work reference must be same-Order.
- Request/Quote/Tender and Deal replacement/dependency lineage use composite same-parent FKs plus documented partial uniqueness and constraint triggers. Every Direct Invite Quote stores non-null `request_invitation_id`; unique invitation `(id, request_id, invited_provider_user_id)` and Quote `(request_invitation_id, request_id, provider_user_id)` columns form an `ON DELETE RESTRICT` composite FK. Open and Sealed Quotes must not reference invitation authority. Submission and `FinalizeOrderAgreement` synchronously lock and revalidate the exact invitation's purpose, status, expiry, Request, and provider.
- `financial_transactions` and entries store one currency; entry currency equals transaction and active account currency, and posting is rejected unless debits equal credits.
- `audit_events`, `idempotency_keys`, outbox/event envelopes gain nullable client attribution while preserving owner and human/system actor. Core owner remains `users(id)`.

## 3. Shared column conventions

Every table uses:

- `id UUID PRIMARY KEY`, generated by the application with UUIDv7 semantics and stored in PostgreSQL native `uuid` format; this follows the implementation contract and remains the authority before migrations.
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL` where mutable
- `row_version INTEGER NOT NULL DEFAULT 1` where optimistic concurrency is required; immutable business/contract/payload/event versions use explicit semantic names and never share this counter.

Additional conventions:

- `actor_user_id` references `users(id)` when a human caused an action.
- `correlation_id UUID NOT NULL` on events/operations spanning aggregates.
- `idempotency_key` is unique within its declared scope.
- `currency CHAR(3) NOT NULL` on money-bearing records.
- `amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0)`.
- Timestamps are stored in UTC; display timezone is presentation policy.
- Status values are constrained through database enum/check strategy selected in the migration ADR.
- Foreign-key delete behavior is `RESTRICT` for financial/history records and explicit archive/null behavior elsewhere.

## 4. Identity and authorization tables

### 4.1 `users`

Purpose: account identity and lifecycle.

Required columns:

- `id`
- `phone_e164` or approved login identifier
- `status`
- `primary_access_tier`
- `locale`
- `timezone`
- `version`
- timestamps

Constraints/indexes:

- Unique normalized phone/login identifier.
- Status check.
- No plaintext secrets or verification codes.
- Index active users by normalized login identifier.

Retention: account identity retained according to legal/accounting policy; anonymization may preserve history references.

### 4.2 `user_profiles`

Purpose: display/profile information.

Columns:

- `user_id PK/FK`
- display name
- public bio
- avatar/file reference if applicable
- service area display policy
- accessibility/language preferences
- emergency/safety contact policy only if approved

Constraints: private contact/location fields are not public by default.

### 4.3 `role_assignments`

Purpose: multiple simultaneous capabilities.

Columns:

- `user_id`
- `role_code`
- `status`
- `granted_by_user_id`
- `effective_at`
- `expires_at`

Constraints:

- Unique active assignment per user/role/scope.
- No mutually exclusive single-role column.
- Admin capability requires explicit grant and audit event.

### 4.4 `identity_verifications`

Purpose: identity-review lifecycle, not public trust guarantee.

Columns:

- `user_id`
- verification type
- status
- provider/manual reviewer
- evidence reference
- reason/status detail
- reviewed_at
- retention class

Constraints:

- Sensitive evidence access controlled.
- Manual-review fallback state supported.
- Public badges derive from performed verification, not arbitrary status text.

### 4.5 `evidence_files`

Purpose: metadata for uploaded evidence/artifacts.

Columns:

- `owner_user_id`
- constrained `subject_type` enum (`identity_verification`, `listing`, `work_instance`, `payment_obligation`, `dispute`, `safety_incident`, `support_case`, `command_approval`, `capability_activation`) and `subject_id UUID`
- `subject_owner_user_id`, `purpose_code`, and `resolver_contract_version`
- `storage_key`, media type/size/hash, evidence/data class, scan/quarantine status
- visibility/access policy, retention policy, and `deleted_at`

Constraints/indexes:

- Each row is a typed attachment. A deferred constraint trigger resolves the declared subject table, proves that the subject exists and `subject_owner_user_id` matches its canonical owner, and rejects an unsupported type/purpose pair; subject identity is never hidden in JSON.
- Access grants are short-lived signed envelopes, not a new authority table: unique grant ID, evidence ID, principal, purpose, resolver version, issued/expiry times, and correlation ID are authenticated in the envelope; issuance/use persist only minimized `audit_events`.
- Retrieval re-resolves current subject participants/admin purpose, active hold, data class, scan state, and grant expiry. Failure is non-enumerating; no public storage key, unsafe byte, or stale grant is exposed.
- File type/size/hash checks and malware/active-content policy pass before sensitive use; active retention hold blocks delete/purge.

### 4.6 `consent_grants`

Purpose: Agent delegation and other consent grants.

Columns:

- grantor user
- grantee/Agent user
- resource type/id or scoped capability
- permission scope
- status
- starts/expires/revoked/suspended times
- consent evidence reference
- version

Constraints:

- Explicit scope and grantor.
- Revocation does not delete prior actions.
- High-risk actions may require per-action consent beyond active grant.

## 5. Product and taxonomy tables

### 5.1 `categories`

Columns:

- code/name/parent
- safety class
- data class
- status
- pilot/future status
- metadata version

Constraints: category enablement requires supported capability profile and approval status.

### 5.2 `capability_profiles`

Purpose: approved composition of taxonomy dimensions.

Columns:

- `profile_family_code`
- immutable positive `business_version`
- `content_schema_version`
- listing type, mechanism, Work shape/contract version
- allowed payment lanes and access tiers
- safety/data class
- lifecycle status and activation record reference
- optimistic `row_version`

Constraints:

- Unique candidate key `(profile_family_code, business_version)`; one current active version per family by partial unique index.
- Published content and business-version identity are immutable; changes create a new version, while `row_version` guards mutable draft/review state.
- No active profile may reference an excluded lane/shape.
- Pilot profile must have safety/operations gate status.

### 5.3 `listings`

Columns:

- owner user
- capability profile
- category
- listing type
- lifecycle status
- geography
- current version
- review status
- version/concurrency

Constraints/indexes:

- Active listing requires approved owner/capability/category conditions.
- Tagudin geography constraint for initial pilot records.
- Search indexes cover active status, category, geography, and profile.

### 5.4 `listing_versions`

Purpose: immutable terms/capacity/price snapshots.

Columns:

- listing ID and immutable version number
- exact `category_id` + `category_business_version`
- exact `capability_profile_family_code` + `capability_profile_business_version`
- description/terms
- price/quote/budget mode
- payment-lane availability
- availability/capacity summary
- safety copy, effective dates, authored actor

Constraints: unique `(listing_id, version_number)`; composite FKs reference the exact Category and Capability business-version candidate keys with `ON DELETE RESTRICT`; published versions are immutable.

### 5.5 `listing_capacity`

Purpose: generic stock, slots, availability, or capacity.

Columns:

- listing/version
- capacity type
- quantity/remaining
- slot start/end where applicable
- reservation status/version

Constraints:

- No negative remaining quantity.
- Reservation updates are concurrency-safe.
- Shape-specific capacity cannot silently use a different unit.

### 5.6 `requests`

Purpose: buyer/citizen-owned Service or Product Request, including Sourcing Tender state.

Columns:

- requester and optional Deal Chain/Need lineage
- request type and formation mechanism
- exact category and capability-profile business versions
- title, description, bounded versioned item/scope payload
- `budget_semantics target|ceiling|range|estimate|undisclosed`, amount/range minor units, and currency
- requested Work shape/specification version and payment-lane options
- coarse geography, protected precise-location reference, timing/service window
- lifecycle status, `tender_mode open_tender|sealed_tender|direct_invite`, and Tender phase
- published/response/selection/expiry/closed/awarded timestamps and close reason
- exact immutable sourcing-policy category/business version, schema version, and checksum; publication winning `capability_activation_id` plus complete activation-decision fingerprint
- selected Quote/lineage reference
- privacy, photo/media, safety, evidence, and disclosure preferences
- active-response and per-provider-alternative limits copied from the pinned sourcing policy only for enforcement/snapshot comparison
- `row_version`, actor/acting-for, correlation, and audit/outbox causality

Constraints/indexes:

- Tender mode is required only for reverse-bidding Requests and is immutable after publication.
- Publication locks the exact active `category_versions` row and every matching `capability_activations` row, verifies policy checksum/current effective range/no deny/evidence, then stores the winning activation ID and complete decision fingerprint. Submission/finalization repeat that locked evaluation; free JSON and Payment `policy_versions` are not sourcing authority.
- Response deadline follows publication; selection deadline follows response close; Work timing remains separate.
- Budget fields and currency must match the selected semantics.
- Selected Quote belongs to the same Request and only one selection may become awarded.
- Direct Invite publication requires at least one current invitation; Direct Invite is absent from public discovery indexes.
- Public/coarse indexes cover only approved Open/Sealed phases, category/profile, geography, deadlines, and normalized search fields.
- Valid mechanism transitions are required before Quote submission or final agreement.

### 5.7 `quotes`

Purpose: immutable Quote/Bid response versions and accepted source for ordinary Order formation.

Columns:

- Request and optional Listing/Order/Deal Chain/Need references
- provider and exact provider capability/Listing business versions
- immutable request-local `quote_version`
- `bid_lineage_id`, monotonic `revision_no`, nullable `supersedes_quote_id`, and `alternative_key`
- amount components, normalized lines/packages, total minor units, and currency
- scope, inclusions, exclusions, assumptions, and required-node coverage
- validity/expiry, schedule, capacity intent, Work shape/specification version
- payment-lane choice/options and partner-confirmation references
- `status draft|submitted|superseded|withdrawn|declined|expired|accepted|not_selected|invalidated`, terminal reason, and immutable terms hash
- nullable Direct Invite reference for Open/Sealed; non-null `request_invitation_id` for Direct Invite, included with Request/provider in the exact composite authority FK
- actor/acting-for, policy versions, `row_version`, idempotency, correlation, audit/outbox causality

Constraints/indexes:

- Unique `(request_id, quote_version)` and `(bid_lineage_id, revision_no)`; positive monotonic revisions and immutable submitted/terminal content.
- Partial unique `(bid_lineage_id) WHERE status = 'submitted'` leaves exactly one current submitted revision; revision locks the lineage, atomically marks the old row `superseded`, and inserts `revision_no + 1`.
- Legal persisted transitions are only `draft→submitted`; `submitted→superseded|withdrawn|declined|expired|accepted|not_selected|invalidated`. Terminal rows never transition. `ineligible` and `stale` are derived current disqualifications and are never persisted as Quote status.
- Initial activation permits one active alternative per provider/Request; schema supports policy maximum three through distinct `alternative_key`.
- Direct Invite submission requires and locks the exact current `direct_invite_bid` invitation for the authenticated provider, atomically accepts it on valid submission, and revalidates the same invitation during award; other modes reject invitation authority.
- Sealed/Open projection privacy is application policy backed by purpose-specific indexes; no public Bid-content index or cache is permitted.
- `decline_quote` requires current actor authority and current reveal-policy access to the exact revision; Sealed requires committed `selection_open`. Unrevealed/unauthorized identifiers receive uniform no-effect denial, and no notification intent is emitted.
- Only a current `submitted` Quote with current actor/source/invitation/policy/activation/schedule/capacity/version facts is selectable. The exact Quote becomes `accepted` and competing submitted revisions become `not_selected` only inside successful all-or-none Order/award formation; no durable pre-Order selection exists.

## 6. Order and fulfillment tables

### 6.1 `orders`

Columns:

- origin/mechanism
- listing/request/quote reference
- buyer/primary provider references
- order status
- geography
- current version
- correlation id

Constraints/indexes:

- Accepted Order requires terms snapshot.
- Status transitions follow domain contract.
- No close while required Work/Obligation remains unresolved.
- Index status, geography, actor, and updated time.

### 6.2 `order_parties`

Purpose: multiple parties without a single-role assumption.

Columns:

- order
- user
- party type
- responsibility/scope
- consent/authorization reference
- effective status

Constraints: unique active party role/scope as defined by capability profile.

### 6.3 `order_terms_snapshots`

Purpose: immutable accepted commercial terms.

Columns:

- order/version
- source listing/quote version
- scope/amount summary
- policy version
- payment-lane options
- cancellation/review rules
- actor/time

Constraints: unique order/version; no mutation after acceptance.

### 6.4 `work_instances`

Columns:

- order
- capability/work shape
- status
- scheduled/started/completion timestamps
- current version
- shape-specific validated payload reference
- completion evidence reference

Constraints:

- Shape must be supported by capability profile.
- Completion requires domain guards.
- The approved Deal-Chaining foundation uses nullable lineage on existing Request/Quote/Order records; child Work remains an ordinary Order boundary. This schema headroom does not authorize the later user-facing feature or pilot activation.

### 6.5 `work_events`

Purpose: append-only progress/transition history.

Columns:

- work instance
- previous/new status
- event type/version
- actor
- evidence reference
- payload
- correlation/idempotency
- occurred/effective time

Constraints: event sequence cannot create invalid transition; unique idempotency key.

## 7. Payment and accounting tables

### 7.1 `payment_obligations`

Columns:

- order/work reference
- purpose
- amount_minor/currency
- lane
- status
- due condition
- policy version
- fee/amount snapshot
- responsible payer/recipient references
- current version

Constraints:

- One lane per obligation initially.
- Allowed initial lane values are exactly `external_cash`, `external_digital_proof`, `direct_digital`, and `tiwala_protected_digital`.
- `direct_digital` and `tiwala_protected_digital` records may exist only for capstone/sandbox cohorts until G6.
- Amount nonnegative; zero only for explicitly allowed evidence/no-charge purposes.
- Immutable purpose/amount/lane snapshot after evidence begins.
- No hidden commission receivable for External Cash.

### 7.2 `payment_events`

Purpose: declarations, acknowledgments, provider verification, release/refund state.

Columns:

- obligation
- event type
- lane
- amount/currency
- external reference
- actor/provider
- evidence reference
- previous/new status
- idempotency/correlation

Constraints: append-only; duplicate provider/reference handling explicit.

### 7.3 `policy_versions`

Purpose: versioned fee, lane, release, refund, retention, and capability policy snapshots.

Columns:

- policy type/key
- version
- effective from/to
- configuration payload validated by schema
- approval/status
- authored actor

Constraints: immutable published versions; existing Order/Obligation references exact version.

### 7.4 `financial_accounts`

Purpose: logical ledger accounts for application accounting.

Columns:

- account code/type
- owner/context reference
- currency
- status

Constraints: unique account code/scope/currency; no direct balance overwrite.

### 7.5 `financial_transactions`

Purpose: balanced accounting transaction header.

Columns:

- transaction type
- source event
- currency
- status
- occurred/effective time
- correlation/idempotency

Constraints: cannot post without balanced entries; source event linkage.

### 7.6 `financial_entries`

Purpose: debit/credit lines.

Columns:

- transaction
- account
- direction
- amount_minor
- currency
- reference

Constraints:

- Amount positive per line.
- Sum debits equals sum credits per transaction/currency.
- Posted entries immutable; correction uses new transaction.
- Index account/time/source.

### 7.7 `provider_events`

Purpose: external gateway/provider events.

Columns:

- provider, authenticated provider-account ID, environment/audience
- provider event ID/type and provider object ID/type
- canonical-payload hash, signature algorithm/key reference, verification result, replay timestamp/window result
- expected owner, Payment Obligation, amount/currency, and transition
- stable `business_effect_key`
- raw encrypted/minimized payload reference
- received/quarantined/processed times, processing/reconciliation status and bounded error
- nullable related financial transaction

Constraints:

- Unique `(provider, provider_account_id, environment, provider_event_id)` and `(provider, provider_account_id, environment, business_effect_key)`.
- Amount/currency/owner/object/Obligation/expected-transition binding and canonical-byte authenticity/replay checks become immutable verification outcomes before any financial effect.
- One transaction records accepted provider receipt, payment event, balanced financial transaction, audit/idempotency result, and outbox; mismatch/unknown/replay enters visible quarantine/reconciliation with no effect.

### 7.8 `financial_adjustments`

Purpose: refunds, reversals, chargebacks, write-offs, and approved corrections.

Columns:

- source obligation/transaction
- adjustment type/reason
- amount/currency
- approval actor
- policy version
- status
- external reference

Constraints: never overwrite original entry; amount cannot exceed allowed remaining exposure without explicit override.

## 8. Trust, support, and safety tables

### 8.1 `disputes`

Columns:

- reporter/parties
- order/work/obligation references
- reason/category
- status
- severity
- opened/resolved times
- resolution summary

Constraints: active dispute can create relevant hold; no universal round count.

### 8.2 `dispute_events`

Append-only timeline of evidence requests, responses, decisions, appeals, and notices.

### 8.3 `administrative_holds`

Columns:

- target aggregate/obligation
- reason class
- status
- creator/approver
- effective/released times
- conditions

Constraints: protected release checks active relevant holds.

### 8.4 `support_cases`

Purpose: non-dispute support and operational cases.

Columns:

- reporter/requester
- category/severity
- related aggregate
- status/owner
- resolution
- SLA timestamps

### 8.5 `safety_incidents`

Purpose: physical safety, harassment, fraud, or incident records.

Columns:

- reporter/affected parties
- category/severity
- related Order/meeting/listing
- response status
- escalation/owner
- sensitive retention class

### 8.6 `reviews`

Columns:

- order/work reference
- author/subject
- rating/content
- eligibility evidence
- moderation/status

Constraints: only supported completed interactions can create eligible reviews; no fabricated verification.

## 9. Communication and evidence operations

### 9.1 `conversations`

Participants, scope, access policy, status, and related Order/Work references.

### 9.2 `messages`

Conversation, actor, content, attachment/evidence reference, delivery state, and audit metadata.

Constraints: Agent/admin participation is attributable; sensitive data is access-controlled.

### 9.3 `notifications`

One recipient/purpose/source-event intent. Columns include exact source event/contract version, recipient, purpose, privacy class, template/locale/policy versions, mandatory/preference decision, route-success rule, deduplication key, `delivery_generation`, `status pending|dispatching|delivery_settling|cancellation_requested|delivered|dead_letter|cancelled`, bounded terminal reason, nullable `cancellation_requested_at`, `settlement_started_at`, `first_delivered_at`, delivered/dead-letter/cancelled/recipient-acknowledged times, `row_version`, actor/support attribution, correlation, and timestamps.

Constraints/indexes: unique `(recipient_id, purpose, source_event_id, source_contract_version)` and deduplication key in scope; lifecycle/time consistency; `delivery_settling` or `cancellation_requested` requires its timestamp and at least one `sending` attempt at transition time; constraint triggers enforce parent/attempt settlement. No claim/retry/new route is legal outside `dispatching`. `cancelled` may retain `first_delivered_at` as evidence of an in-flight delivery that could not be recalled. Current mandatory policy blocks cancellation while authority remains valid. Only domain §17.8 transitions are legal. Due-dispatch, settlement/reconciliation, dead-letter/support, recipient/status, source, and retention indexes are required.

### 9.4 `notification_deliveries`

One immutable-identity/content channel attempt. Columns include notification, positive generation/attempt number, channel, provider/request fingerprint and nullable provider reference, rendered-content hash/reference, `status pending|sending|delivered|retryable_failed|permanent_failed|outcome_unknown|cancelled`, timeout/retry/backoff policy version, sending lease/deadline, bounded failure/uncertainty code, reconciliation evidence/reference, nullable authentic late-result status/time/hash, started/completed/next-attempt times, worker/correlation attribution, and timestamps.

Constraints/indexes: unique `(notification_id, delivery_generation, channel, attempt_no)`; provider reference/request fingerprint deduplicates callbacks/results; only `pending→sending|cancelled` and `sending→delivered|retryable_failed|permanent_failed|outcome_unknown|cancelled` are legal. Parent-first claim/cancel/success/reconciliation locking applies. A route success or cancellation cancels pending attempts and blocks new claims/routes; already-sending attempts settle authentically or become `outcome_unknown` after bounded lease/deadline and provider reconciliation, without holding a transaction across I/O. Late authentic results append evidence without changing settled status or causing effects. A next attempt requires prior retryable failure, budget, `dispatching`, and current authorization. Due, stuck-sending, settlement, provider-reference, correlation, and retention indexes are required. Source inbox acknowledgment follows intent/initial scheduling commit, never provider success.

### 9.5 `cohort_classifications`

Purpose: distinguish genuine Tagudin, capstone demo, sandbox, team, training, and support activity.

Columns:

- related actor/event/order
- cohort class
- geography
- source
- classified by/at
- reason

Constraints: metrics must filter by classification; classification corrections are audited.

## 10. Platform integrity and audit

### 10.1 `audit_events`

Append-only actor/action/target/previous/new value summary, reason, correlation, and timestamp.

Sensitive values are redacted or referenced, not copied into broad audit payloads.

### 10.2 `outbox_messages`

Typed transactional envelope columns: unique event ID; event type and event-contract version; aggregate type/ID, aggregate `row_version`, and positive aggregate sequence; payload-contract version and payload hash/reference; causation/correlation IDs; owner, human/system actor and nullable client attribution; occurred/effective time; status, attempt count, next attempt, and bounded failure.

Constraints: unique `(aggregate_type, aggregate_id, aggregate_sequence)` and event ID. The owning aggregate allocates the next sequence under its mutation lock; state, sequence, audit, idempotency result, and outbox insert share one transaction. A consumer locks its inbox/checkpoint, applies the next effect plus advances sequence/status in one transaction, then acknowledges; duplicate, gap, unsupported version, or failed effect never advances acknowledgment.

### 10.3 `idempotency_keys`

Scope, key, actor, request hash, resulting event/reference, status, and expiry.

Constraint: duplicate request with different payload is rejected, not merged.

### 10.4 `retention_holds`

Legal/dispute/operational retention hold for evidence or records.

Constraint: deletion job must honor active hold.

### 10.5 `migration_checkpoints`

Version, batch, status, checksum, started/completed time, and operator.

Constraint: does not replace backup/restore or deployment rollback procedure.

## 11. State and enum source

The following states must be generated from `domain-state-contracts-rebuilt.md`, not retyped independently in migrations:

- Listing lifecycle
- Order lifecycle
- Work lifecycle
- Payment Obligation lifecycle
- Evidence lifecycle
- Consent lifecycle
- Dispute lifecycle
- Administrative Hold lifecycle
- Notification/delivery lifecycle
- Provider-event processing lifecycle

If implementation requires a new state, the domain contract and this schema artifact must be updated first.

## 12. Retention and privacy classes

| Class | Examples | Default treatment |
|---|---|---|
| P0 public | Active listing public content | User-controlled archive; ordinary product retention |
| P1 account | Profile, role, access, consent metadata | Account/lifecycle retention; anonymize where allowed |
| P2 operational | Messages, support, audit, order history | Retain for support/accounting/legal period |
| P3 sensitive | Government ID, payment screenshots, safety incidents | Least privilege, access log, defined retention/deletion, legal hold |
| P4 financial | Ledger, payment events, refunds, provider reconciliation | Immutable accounting retention; correction entries |

No public cache or API may expose P3/P4 records without an explicit authorized view.

## 13. Index and integrity baseline

Required indexes include:

- User login identifier
- Active listing/category/geography/profile
- Request status/expiry
- Quote request/status/expiry
- Order actor/status/geography/updated time
- Work status/schedule/updated time
- Payment Obligation order/status/lane
- Payment event obligation/external reference
- Provider event provider/event ID/status
- Financial transaction source/time
- Dispute active target/severity
- Hold active target
- Notification recipient/status/next attempt
- Outbox status/next attempt and aggregate sequence
- Inbox consumer/event and aggregate sequence/status
- Idempotency scope/key
- Evidence subject/data class/retention
- Capacity bucket/version/resource and active reservation expiry
- Client owner/status/environment and credential selector/expiry/revocation
- Mapping client/resource/external/internal identity
- Webhook subscription status and delivery retry/dead-letter
- Activation dimension fingerprint/effective/expiry
- Approval actor/status/expiry/command/payload hash

Required integrity checks include:

- No negative money, quantity, or capacity values.
- No duplicate provider event, inbox event, business-effect, or idempotency identity.
- Balanced financial transaction entries per currency; entry/transaction/account currencies match.
- Valid lifecycle and timestamp transitions.
- No active listing without exact capability/category business-version approval.
- No capacity or reservation linked to another listing/version and no active slot overlap.
- Accepted Orders have same-Order terms and required children; Obligation→Work remains same-Order.
- No protected release with mismatch, active dispute, or relevant hold.
- No deleted evidence under active retention hold.
- No Agent/client action without owner authority, scope, activation, and required exact approval.
- No cross-owner integration lookup/mapping/cursor/subscription/delivery identity.

## 14. Migration dependency and first-consumer order

Migration authority is a dependency DAG, not a big-bang numbered batch. The repository's observed permanent tables and migration history remain the in-place baseline. D0 inventories and verifies them; it does not recreate them or pre-create unrelated future persistence. A clean install may execute prerequisite migrations in repository order, but each delivery packet owns only its first-needed schema, backfill, compatibility, rollback/roll-forward, and production-shaped rehearsal.

| Delivery owner | First-needed schema responsibility | Must not pull forward |
|---|---|---|
| D0 / Story 2.1 | Reconcile the exact 61-table manifest, observed constraints, migration checksums, the already-migrated `work_catalog_versions` and `deal_chain_catalog_versions`, clean/in-place paths, and per-change first consumer. | Product writes, future backfills, or unrelated table creation. |
| D1 / Stories 1.1–1.8 | Verify baseline identity/auth/audit/outbox/idempotency/notification tables; first consume `auth_otps`, `inbox_messages`, and `command_approvals` with actor, approval, ordering, notification settlement, retry, and retention constraints. | Category/activation, Listing, Tender, money, Deal, Messaging, or Integration persistence. |
| D2 / Stories 2.2–2.8 | First consume `category_versions`, then in the same delivery unit create/extend `capability_activations` only after exact category/profile candidate keys exist; verify existing catalog-version tables and add exact source-specification/immutable-version keys. Story 2.3 owns activation temporal cutover, complete fingerprint, FKs, audit/idempotency/outbox, rollback, and clean/in-place proof before Work catalog publication or any conditional publisher. | Publication, reservation, Order, Tender-response, or runtime Deal state. |
| D3 / Stories 3.1–3.5 | First consume `listing_capacity_reservations` and Listing/capacity/Browse access-path changes. Optional discovery-cache activation adds no domain table. | Request Invitation, Bid award, Order, or Messaging schema. |
| D4 / Stories 4.1–4.6 | Add/verify proposal, Order-party/terms, same-Order Work/Obligation, reservation-commit, and fixed-lock finalization constraints first exercised by ordinary formation. | Tender-mode or Deal-specific authority. |
| D5 / Stories 5.1–5.7 | Add Request Tender phase/policy/deadline and exhaustive Quote revision-state/lineage constraints, indexes, and backfill first exercised by Open bidding. | Request Invitations or private-mode-only fields beyond nullable compatibility. |
| D6 / Stories 6.1–6.5 | First consume `request_invitations`; add exact composite invitation/Quote authority and Sealed/Direct projection access paths. | Deal-Chain or Messaging persistence. |
| D7 / Stories 7.1–7.6 | First consume or reconcile `deal_chains`, `deal_needs`, `deal_dependencies`, and `deal_invitations`; add same-Chain/Need keys, cycle trigger, and one-active-child constraints. | Pooled money or sibling authority. |
| D8 / Stories 8.1–9.6 | Add/verify evidence/dispute/hold/support/classification/operations access paths and recovery metadata only when first exercised; Story 9.3 rehearses the already-established Story 2.3 activation command rather than creating its authority. | Conversation/message tables or connected-money/Integration activation. |
| D9 / Stories 10.1–10.4 | First consume or amend `conversations` and `messages` for exact participant/purpose/membership/retention contracts; reuse established notification transport. | Connected-money or Integration persistence. |
| D10 / Epic 11 | Add/verify provider-event, ledger, adjustment, reconciliation, refund/reversal, and sandbox-separation constraints when connected-money sandbox starts. | Live credentials or live-money activation. |
| D11 / Epic 12 | First consume `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, and `integration_sync_cursors`; add owner/client/webhook/cursor FKs and indexes. | Any authority broader than current Owner policy and activation. |

Prerequisite edges are: identity/actor keys before owned rows; immutable category/catalog versions before source references; Listing/Request/Quote sources before formation; Orders before same-Order children; Obligations before financial effects; outbox before asynchronous delivery; inbox before replay; evidence before approvals that reference evidence; Owner/client rows before Integration mappings; and parent rows before composite same-parent constraints. PostgreSQL extensions, UUID strategy, currency/time/version conventions, and migration metadata precede all consumers.

Every packet must prove both a clean path and the actual in-place path. Expand-and-contract is required where mixed application versions can coexist: add compatible nullable/defaulted structure, deploy dual-compatible code, backfill idempotently with checkpoints, verify checksums/constraints, switch reads/writes, enforce final constraints, then remove obsolete structure only in a later explicitly authorized packet. Large-table lock/runtime risk is measured before activation. Rollback means a tested safe code/data path or roll-forward/restore decision; destructive down-migrations are never assumed.

## 15. ERD relationship summary

- User owns Profile, Roles, Listings, Requests, Evidence, Consent Grants, Integration Clients, and accountable Activations.
- Category has immutable Versions; Catalogs publishes immutable Work and Deal-Chain authoring versions; Listing pins one Category/Capability version and has Listing Versions, Capacity Buckets, and Reservations.
- Request may receive versioned Quote/Bid lineages; Direct Invite authority comes from one exact current Request Invitation; only explicit atomic final agreement creates one accepted ordinary Order.
- Order has Parties, exact Terms Snapshots, Work Instances, one-lane Payment Obligations, Disputes, Conversations, and Notifications.
- Work Instance has versioned Work Events, Evidence, Disputes, and shape-contract references.
- Payment Obligation has Payment Events, immutable balanced Financial Transactions/Entries, Provider Events, Adjustments, Disputes, and Holds.
- Deal Chain has same-chain Needs/Dependencies/Invitations and isolated ordinary child Orders.
- Integration Client has Credentials, Mappings, Subscriptions/Deliveries, and Sync Cursors under one owner.
- Outbox Events feed consumer Inbox records; critical commands link Audit, Idempotency, Activation, and where required exact Approval.
- Evidence may support Identity, Listing, Work, Payment, Dispute, Safety, Support, Approval, and Activation under purpose/data-class access.

## 16. Schema acceptance gate

This schema is ready for implementation design only when:

- The 61-table inventory (47 observed baseline plus fourteen approved extension tables) is the only active planning count.
- Every table has owner/bounded context, required columns/types, FK/delete behavior, checks, unique/partial indexes, retention class, and migration order.
- Domain states and business/row/event/payload versions match the domain contract.
- Capacity/reservation, Request/Invitation/Quote/Tender, Deal lineage, accepted terms, and same-Order child lineage are relationally guarded.
- One-lane obligations, balanced per-currency ledger posting, immutable corrections, and three-way reconciliation are explicit.
- Provider/webhook authenticity, business binding, replay/idempotency, SSRF controls, and recovery are represented.
- Sensitive evidence quarantine/access/download/retention/hold controls are represented.
- Inbox ordering, dimensioned activation, exact approval, and maker/checker state are represented.
- Forward/backfill/rollback and backup/restore rehearsal are defined.
- No historical table count remains an active source.
- ERD is generated from this inventory, not drawn independently.
- DealChain remains coordination-only; child Orders remain isolated ordinary Orders.
