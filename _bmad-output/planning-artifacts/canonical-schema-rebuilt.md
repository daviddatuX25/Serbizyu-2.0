# Serbizyu 2.0 — Canonical Schema and ERD Decision Contract

Status: CANONICAL SCHEMA/ERD AUTHORITY — founder-approved 2026-07-31; migration execution remains separately gated by P0-03 contract
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

The current proposed canonical inventory contains **42 tables**. This is the count for this schema contract; no additional application table may be introduced without updating this artifact or an approved schema ADR.

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

## 3. Shared column conventions

Every table uses:

- `id BIGINT` or UUID according to the implementation ADR; one identifier strategy must be selected before migrations.
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL` where mutable
- `version INTEGER NOT NULL DEFAULT 1` where concurrency-sensitive

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
- `storage_key`
- media type/size/hash
- evidence/data class
- scan status
- visibility/access policy
- retention policy
- deleted_at

Constraints/indexes:

- No public storage key exposure.
- File type/size/hash checks.
- Malware scan status required before sensitive use.
- Hash index for duplicate detection where appropriate.

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

- listing type
- mechanism
- work shape
- allowed payment lanes
- allowed access tiers
- safety/data class
- status
- activation record reference
- version

Constraints:

- Unique versioned profile code.
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

- listing id/version number
- description/terms
- price/quote/budget mode
- payment-lane availability
- availability/capacity summary
- safety copy
- effective dates
- authored actor

Constraints: unique `(listing_id, version_number)`; no update to published version.

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

Purpose: request-specific detail for Service/Product Request.

Columns:

- request/listing reference
- requester
- description/item list
- budget/estimate
- timing/location
- status/expiry
- privacy/safety preferences

Constraints: request may create quotes/orders only through valid mechanism transitions.

### 5.7 `quotes`

Purpose: quote/bid responses.

Columns:

- request/listing/order reference
- provider
- quote version
- amount components
- scope/inclusions/exclusions
- validity/expiry
- work shape
- payment-lane options
- status

Constraints: accepted quote is immutable snapshot source; expired quote cannot be accepted.

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
- A future Deal-Chaining parent/child relation requires an approved schema extension; initial pilot permits only the defined relationship form.

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

- provider
- provider_event_id
- event type
- raw/minimized payload reference
- authenticated status
- received/processed times
- processing status/error
- related obligation/transaction

Constraints: unique `(provider, provider_event_id)`; authenticity validation before financial effect.

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

Domain notification intent, recipient, event source, priority, and status.

### 9.4 `notification_deliveries`

Channel attempt, provider reference, status, retry count, failure reason, and delivered time.

Constraints: retryable failure does not erase notification intent.

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

Transactional event publication intent, event ID/type, aggregate, payload version, status, attempt count, next attempt, and failure.

Constraint: created in the same transaction as the state change it announces.

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
- Outbox status/next attempt
- Idempotency scope/key
- Evidence subject/data class/retention

Required integrity checks include:

- No negative money or capacity values.
- No duplicate provider event identity.
- No duplicate idempotency scope/key.
- Balanced financial transaction entries.
- Valid status transitions.
- No active listing without capability/category approval.
- No protected release with active relevant hold.
- No deleted evidence under active retention hold.
- No Agent action without applicable consent.

## 14. Migration order

### Batch 0 — Database foundations

- Extensions and identifier strategy
- Currency/time conventions
- Shared audit/version conventions
- Migration metadata

### Batch 1 — Identity and authorization

- users
- user_profiles
- role_assignments
- evidence_files
- identity_verifications
- consent_grants

### Batch 2 — Product contract

- categories
- capability_profiles
- policy_versions
- listings
- listing_versions
- listing_capacity
- requests
- quotes

### Batch 3 — Order/work contract

- orders
- order_parties
- order_terms_snapshots
- work_instances
- work_events

### Batch 4 — Payment/accounting

- payment_obligations
- payment_events
- financial_accounts
- financial_transactions
- financial_entries
- provider_events
- financial_adjustments

### Batch 5 — Trust/support/communication

- disputes
- dispute_events
- administrative_holds
- support_cases
- safety_incidents
- reviews
- conversations
- messages
- notifications
- notification_deliveries

### Batch 6 — Integrity and measurement

- cohort_classifications
- audit_events
- outbox_messages
- idempotency_keys
- retention_holds

### Batch 7 — Indexes, checks, and rehearsal

- concurrent-safe indexes
- transition constraints
- ledger balance checks
- privacy/retention checks
- seed/test fixtures
- forward migration rehearsal
- rollback/restore rehearsal

## 15. ERD relationship summary

- User owns Profile, Roles, Listings, Requests, Evidence, and Consent Grants.
- Listing has Versions, Capacity, Requests/Orders, and one Capability Profile.
- Request may receive Quotes and create an Order.
- Order has Parties, Terms Snapshots, Work Instances, Payment Obligations, Disputes, Conversations, and Notifications.
- Work Instance has Work Events, Evidence, Disputes, and shape-specific references.
- Payment Obligation has Payment Events, Financial Transactions/Entries, Provider Events, Adjustments, Disputes, and Holds.
- Evidence may support Identity, Listing, Work, Payment, Dispute, Safety, or Support records.
- All critical operations emit Audit Events and Outbox Messages with Idempotency Keys.

## 16. Schema acceptance gate

This schema is ready for implementation design only when:

- The 42-table inventory is accepted as the canonical baseline or changed through a schema decision.
- Every table has owner/bounded context, required columns, FK behavior, retention class, and indexes.
- Domain states and transitions match the domain contract.
- Payment/release constraints are represented.
- Ledger balancing and correction rules are explicit.
- Provider webhook authenticity/idempotency is represented.
- Sensitive evidence handling and retention are represented.
- Migration order and rollback/restore rehearsal are defined.
- No historical table count remains an active source.
- ERD is generated from this inventory, not drawn independently.
