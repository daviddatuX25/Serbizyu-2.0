# Serbizyu 2.0 — Rebuilt Technical Architecture and Operations Blueprint

Status: REBUILT DRAFT — founder review required before implementation/deployment authority
BMAD phase: Phase 3 — Architecture and operations
Depends on:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `_bmad-output/planning-artifacts/adr-catalog-rebuilt.md`

Purpose: provide a buildable, supportable technical blueprint without allowing future deployment or live-payment ambitions to dictate the initial product boundary.

## 1. Architecture goals

- Preserve domain/state invariants.
- Make the pilot operable by a small team.
- Keep payment, evidence, consent, and safety boundaries explicit.
- Support capstone sandbox demonstrations without claiming production readiness.
- Make Tagudin validation measurable and recoverable.
- Permit future adapters without building every future capability now.
- Keep deployment choices replaceable where they are not product contracts.

## 2. Architecture stance

### 2.1 Initial system shape

Use a modular monolith as the initial application boundary:

- One Laravel application boundary.
- Domain modules aligned to bounded contexts.
- PostgreSQL as transactional authority.
- Redis only where required for queue/cache/coordination and never as financial authority.
- Object/file storage for evidence with private access.
- Queue worker for asynchronous work.
- Scheduler for expiry/retry/reconciliation/retention tasks.
- Separate SSR process only if the approved UX/stack requires it; it must be explicitly health-checked and deployed.
- Search begins with PostgreSQL capabilities where sufficient; external search is an adapter/scale option, not a pilot dependency.
- Realtime is optional for pilot UX where polling/notifications are adequate; it must not become a hidden reliability dependency.

### 2.2 Deployment-neutral boundary

The architecture describes processes and contracts, not a permanent hosting vendor. Dokploy, Docker Compose, Cloudflare, or another platform may be selected later only if it satisfies:

- Process health and restart
- Private secrets handling
- Database backup/restore
- Migration promotion/rollback
- Queue/scheduler reliability
- Private evidence storage
- Observability
- Support ownership

A deployment diagram is not evidence that these controls exist.

## 3. Bounded contexts/modules

### Identity and Access

Owns users, profiles, roles, verification status, access tiers, and authorization policy.

Does not own listing business state, money, or Agent consent history beyond authorization reference.

### Delegation and Consent

Owns Agent grants, scopes, notices, revocations, and action attribution.

### Product Catalog and Taxonomy

Owns categories, capability profiles, listings, versions, capacity, requests, and quotes.

### Order Management

Owns Order parties, accepted terms, commercial lifecycle, cancellation, and closure eligibility.

### Fulfillment/Work Engine

Owns Work Instances, shape-specific data, progress, completion evidence, and work state.

### Payment and Financial Integrity

Owns Payment Obligations, payment events, policy snapshots, provider events, ledger transactions/entries, refunds, reversals, and release guards.

### Trust, Evidence, and Safety

Owns evidence metadata, disputes, holds, safety incidents, retention, and access logging.

### Communication and Support

Owns conversations, messages, notifications, delivery attempts, support cases, and retries.

### Measurement and Operations

Owns cohort classification, audit events, operational dashboards, incident records, and recovery procedures.

## 4. Request/data flow

### 4.1 Normal listing-to-work flow

1. User authenticates.
2. Authorization policy resolves role/access/consent.
3. Listing/read model returns active version and capability profile.
4. Buyer creates Booking/Request through an application command.
5. Domain validates listing, terms, capacity, geography, and mechanism.
6. Order and terms snapshot commit transactionally.
7. Work Instance and required Payment Obligations are created.
8. Domain events/outbox records commit with the state change.
9. Worker sends notifications and processes noncritical side effects.
10. Provider performs Work and submits evidence.
11. Buyer sign-off/review/dispute command transitions Work.
12. Payment subsystem updates obligations independently.
13. Admin/support can inspect and intervene through audited commands.

### 4.2 External Cash flow

- Buyer reports payment.
- Provider reports receipt.
- System records separate evidence events.
- Mutual acknowledgment may produce `counterparty_confirmed`.
- Mismatch creates dispute/support path.
- No Serbizyu cash custody or automatic refund effect.

### 4.3 External Digital Proof flow

- User submits declaration/reference/evidence.
- File is validated/scanned and stored privately.
- Evidence state is recorded.
- Counterparty may acknowledge.
- Provider verification is possible only through trusted adapter/API.
- No Tiwala protection/release effect.

### 4.4 Sandbox connected-payment flow

- Adapter is clearly marked sandbox.
- Provider event authenticity/idempotency is exercised.
- Amount/fee/reversal/reconciliation behavior is tested.
- No live-money status or Tagudin pilot metric is produced.

## 5. Process topology

### Required for pilot

| Process | Responsibility | Failure behavior | Health signal |
|---|---|---|---|
| Web/application | Authenticated/public HTTP, commands, reads | Request error; no partial domain effect | HTTP health + dependency check |
| Database | Transactional state/ledger | Stop writes safely; alert | Connection/latency/storage |
| Queue worker | Outbox, notifications, scans, retries, non-request jobs | Retry/backoff/dead-letter/support queue | Queue age/failure count |
| Scheduler | Expiry, reminders, review-window checks, retention, reconciliation candidates | Alert and retry; no guard bypass | Last successful run per job |
| Private file storage | Evidence/artifact bytes | Block sensitive use; retain metadata | Availability/access/error |
| Observability | Logs/metrics/audit/alerts | Alert delivery fallback | Alert health |

### Conditional/optional

| Process | Initial stance | Activation condition |
|---|---|---|
| SSR Node process | Use only if approved UX requires SSR | Separate health check, deployment, cache policy, and rollback |
| Redis | Use for queue/cache/coordination if needed | Database remains authority; eviction/flush is survivable |
| Realtime process | Optional | Pilot user value and operational capacity justify it; polling fallback exists |
| External search | Optional | Measured PostgreSQL search limitation and owned index rebuild/recovery |
| Connected payment adapter | Sandbox-only | G6 provider/legal/financial/operations gate |
| AI assistant | Draft/help only | Explicit scope, safety, cost, privacy, and no-authority tests |

## 6. Security architecture

### Identity/authentication

- Use secure session/token design appropriate to the selected frontend pattern.
- Never store plaintext OTPs, passwords, provider secrets, or payment credentials.
- Rate-limit authentication, evidence submission, Agent actions, and payment commands.
- Require step-up confirmation for sensitive/irreversible actions where policy says so.

### Authorization

- Policy checks occur server-side.
- Scope includes actor, role assignment, consent grant, resource, action, status, and category/safety restrictions.
- UI hiding is not authorization.
- Admin overrides require explicit permission and audit reason.

### Evidence/privacy

- Private object storage, signed short-lived access, no public directory listing.
- P3/P4 data never enters anonymous cache.
- Redaction/masking guidance in upload UI.
- Malware/content scan before sensitive evidence use.
- Access log for identity/payment/safety evidence.
- Retention and deletion jobs honor legal/dispute holds.

### Web/cache/SSR

- Public edge caching only for anonymous-safe responses.
- Authenticated pages use private/no-store or equivalent session-safe headers.
- SSR must not render another user’s personalized data.
- Payment/identity/evidence pages cannot be publicly cached.

### Provider integrations

- Secrets stored outside repository and logs.
- Signature/authenticity validation before event processing.
- Provider event IDs unique and idempotent.
- Raw payload minimized/restricted; sensitive values redacted from logs.
- Provider status reconciliation available for exceptions.

## 7. Financial architecture

### Financial source of truth

- Payment events capture external/application event history.
- Financial transactions/entries capture balanced accounting effects.
- Application balances are derived, not directly overwritten.
- External Cash has no Serbizyu commission receivable in the initial pilot.
- External Digital Proof has no custody/release effect.
- Direct Digital/Tiwala live effects are blocked until G6.

### Release worker

The release scheduler may find candidate obligations but must call the guarded release application service. The service atomically checks:

- Obligation state
- Work completion
- Sign-off/review eligibility
- Active disputes
- Active holds
- Reconciliation
- Policy snapshot
- Prior release
- Version/lock

### Refund/reversal

Refund/reversal is a new financial adjustment and event linked to the original effect. It cannot mutate original entries.

### Operations console minimum

Before any connected-money pilot, Admin must inspect:

- Order/Work timeline
- Payment Obligations
- Provider events
- Ledger transactions/entries
- Failed jobs/events
- Active holds
- Refund/reversal status
- Reconciliation mismatch
- Idempotency conflict

## 8. Reliability and asynchronous work

### Outbox pattern

Domain transaction writes state and outbox message together. Worker publishes/executes side effects with idempotency.

### Retry categories

- Transient: exponential backoff.
- Permanent validation: dead-letter/support case.
- Provider mismatch: reconciliation queue.
- Sensitive evidence failure: blocked state plus human review.
- Notification failure: alternate channel/support escalation.

### Scheduler jobs

Required named jobs:

- Listing expiry/capacity reconciliation
- Request/quote expiry
- Appointment reminders
- Completion/review-window reminders
- Protected release candidate discovery (sandbox only until G6)
- Provider-event reconciliation
- Outbox retry/dead-letter review
- Evidence scan/retention purge
- Backup verification/reporting
- Pilot metric aggregation

Each job has owner, schedule, retry, alert, idempotency, and last-success record.

## 9. Observability and operations

### Required logs

Structured logs include:

- Correlation/request ID
- Actor classification, not unnecessary sensitive data
- Aggregate/event ID
- Outcome/error class
- Duration
- Retry count
- Provider reference where safe

### Required metrics

- HTTP error/latency
- Authentication failures/rate limiting
- Queue age/failures
- Scheduler last-success/lag
- Outbox dead letters
- Evidence scan failures
- Provider-event authenticity failures
- Idempotency conflicts
- Release/refund/reversal attempts
- Database errors/latency/storage
- Private storage errors
- Support/dispute volume
- Safety incidents
- Pilot activation/liquidity/completion/repeat/support cost

### Alerts

Page or notify the named owner for:

- Data loss or restore failure
- Database unavailable/storage exhaustion
- Queue backlog beyond threshold
- Critical job not running
- Provider signature failures spike
- Duplicate financial event conflict
- Unauthorized access/error spike
- Sensitive evidence exposure
- Severe safety incident
- Backup verification failure

Thresholds, owners, and channels must be configuration/runbook decisions before G3.

## 10. Backup, restore, and disaster recovery

Xendit/provider records are not application backups.

Required:

- Scheduled database backups
- Private evidence backup policy
- Backup encryption/access control
- Retention schedule
- Restore rehearsal in a disposable environment
- Checksum/consistency verification
- Documented RPO/RTO targets approved for the pilot
- Restore runbook owned by a named person
- Post-restore reconciliation for outbox/provider events/financial records

A backup that has never been restored is not readiness evidence.

## 11. Deployment and migration flow

### Environments

- Local development
- Shared test/integration
- Capstone/demo
- Controlled Tagudin pilot
- Future live-connected environment only after G6

Environment data is classified; production/pilot evidence must not be copied into lower environments without approved anonymization.

### Promotion

1. Source commit and review.
2. Automated unit/integration/static/security checks.
3. Migration forward rehearsal.
4. Backup/restore verification where relevant.
5. Test environment smoke/contract tests.
6. Capstone/UAT evidence.
7. Pilot change review and rollback plan.
8. Controlled promotion.
9. Post-deploy health/metric review.

### Migration rules

- Expand/contract for incompatible changes.
- Never drop/rename financial or evidence columns without verified migration/backup.
- Backfill is resumable/idempotent.
- Migration locks and duration are assessed.
- Rollback is documented; down migration is not assumed safe for data-destructive changes.
- Schema version is recorded.

## 12. Support and incident operations

### Severity baseline

- S0: data loss, unauthorized money movement, sensitive evidence exposure, severe safety event.
- S1: critical pilot journey unavailable, duplicate/reversed financial event, broad auth failure.
- S2: category/feature unavailable, notification failure, repeated evidence/queue failures.
- S3: minor UX/content defect.

### Response requirements

- Named owner and backup.
- User communication template.
- Containment/kill switch.
- Evidence preservation.
- Root-cause record.
- Recovery verification.
- Follow-up corrective action.

### Kill switches

At minimum:

- Disable payment lane/capability profile.
- Pause category/listing family.
- Suspend Agent grant.
- Place Order/obligation hold.
- Disable provider adapter.
- Disable upload path if evidence scanner fails.
- Disable new pilot onboarding if support/safety capacity is exceeded.

## 13. Performance and capacity assumptions

Initial architecture is sized for a small Tagudin cohort, not province-wide traffic. The build must measure actual limits before scaling:

- Concurrent active users
- Listing/search response time
- Queue throughput
- File upload/storage growth
- Message/notification volume
- Database connection/lock behavior
- Admin support workload

Do not add distributed services merely because future scale is imaginable. Add a service only when a measured boundary, reliability need, or ownership contract justifies it.

## 14. Architecture decision gates

### Before implementation

- Domain/schema/ADR approval.
- Process topology selected.
- Runtime/version compatibility tested.
- Auth/authorization design tested.
- Evidence storage/privacy path tested.
- Queue/scheduler/outbox path tested.
- Backup/restore rehearsal completed.
- Pilot observability/ownership defined.

### Before G3 Tagudin launch

- Pilot capability profiles enabled only where complete.
- Support/admin console operational.
- Safety/incident path trained.
- Cohort classification verified.
- Backup/restore evidence current.
- Critical jobs monitored.
- External Cash/Proof copy reviewed.
- No connected-money lane accidentally enabled.

### Before G6 connected money

- Provider contract and sandbox evidence.
- Legal/accounting review.
- KYC/identity operations.
- Webhook authenticity/reconciliation.
- Refund/reversal/chargeback behavior.
- Financial operations console.
- Monitoring/alerting and incident runbooks.
- Restore/reconciliation rehearsal.
- User comprehension and fee disclosure.

## 15. Architecture acceptance gate

The architecture is ready for epics/build planning only when:

- Every required process has an owner and health signal.
- Domain/schema/ADR contracts are referenced, not reinterpreted.
- SSR, worker, scheduler, search, realtime, and edge behavior are explicit.
- Backup/restore, migration, rollback, and promotion are operationally testable.
- Sensitive evidence and authenticated-cache isolation are explicit.
- Financial release/refund/reconciliation is not a happy-path-only design.
- Pilot runtime is not overloaded with future deployment ambitions.
- A small team can operate the selected topology.
- The architecture can be implemented as thin vertical slices.
