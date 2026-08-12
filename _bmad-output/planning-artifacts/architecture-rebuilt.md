# Serbizyu 2.0 — Rebuilt Technical Architecture and Operations Blueprint

Status: CANONICAL ARCHITECTURE/OPERATIONS AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; deployment/live-money gates remain separate
BMAD phase: Phase 3 — Architecture and operations
Depends on:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `_bmad-output/planning-artifacts/adr-catalog-rebuilt.md`
- `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`

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

Use the locked runtime baseline in `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`:

- One Laravel 12 modular-monolith application boundary on PHP 8.4/PHP-FPM.
- PostgreSQL 16/PostGIS as transactional authority.
- Redis 7 only where required for queue/cache/coordination and never as financial authority.
- Private evidence storage through an adapter.
- Queue worker and scheduler with health, retry, and idempotency contracts.
- Node 22 LTS SSR as a separate health-checked process.
- PostgreSQL search baseline; Meilisearch is an optional adapter after measured need.
- Polling/notifications baseline; Reverb is optional and never a correctness dependency.
- Docker Compose is the reproducible local/test topology; Dokploy is a later promotion target, not a product contract.

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

### Deal Coordination

Owns `DealChain`, ordered `DealNeed` slots, same-chain `DealDependency` edges, `DealInvitation` lifecycle, derived parent roll-up, and coordination notifications. It owns neither commercial settlement nor child fulfillment truth.

The module exposes a small command/read seam: create/update Chain, add/reorder/replace Need, publish an open Need through the existing Request/Quote adapters, send/respond/revoke Invitation, add/remove Dependency, and inspect a derived roll-up. Every command carries actor, optional acting-for Owner and consent grant, target ID, expected version, correlation ID, and idempotency key. State change, audit event, and outbox intent commit together.

It must not create a parent Payment Obligation, pooled balance, automatic split, parent-wide refund/cancellation cascade, or child-liability reassignment. Child Order formation is handed to Order Management through an explicit child-agreement command; the resulting Order remains independently authoritative.

Foundation dependency: `deal_chains`, `deal_needs`, `deal_dependencies`, and `deal_invitations`, plus nullable lineage on existing Request/Quote/Order records, are required schema headroom before E0-S2 under the schema contract. Their planning presence is not migration/catalog proof and does not enable a user-facing feature. The later bounded coordination story and pilot activation review remain separate gates.

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

1. User authenticates; policy resolves role, access, ownership, and acting-for consent.
2. Read models return the active Listing Version and exact Category/Capability business versions.
3. A mechanism submits `SubmitOrderProposal` with source proof, exact terms, expected versions, capacity intent, actor, correlation, and idempotency context.
4. Standing acceptance or an attributable counterparty acceptance makes the proposal eligible; Request, Quote, bid, Quick Deal, and Deal Need do not create accepted Orders directly.
5. `FinalizeOrderAgreement` revalidates source/category/profile/policy/capacity/parties/acceptance under one fixed lock order.
6. One Order-owned PostgreSQL transaction creates the accepted Order, parties, exact terms snapshot, required Work, one-lane Payment Obligations, committed reservations, audit, idempotency result, and outbox—or creates none.
7. Workers publish notifications and other noncritical post-commit effects; jobs never repair missing required children.
8. Provider performs Work and submits purpose-bound evidence.
9. Buyer sign-off/review/dispute commands transition Work independently from Payment Obligation state.
10. Payment events use their lane contract and cannot complete Work; admin/support interventions remain attributable audited commands.

### 4.5 Bounded Deal-Chaining coordination flow

1. Coordinator/authorized Agent creates a Chain and ordered Needs under the active acting-for grant.
2. An open Need reuses `requests`/`quotes`; a direct branch sends a Need-specific Invitation. Neither branch creates an Order merely by being published or accepted.
3. A separate child-agreement command validates current terms, parties, dependency guards, and idempotency, then creates/links one ordinary child Order with `(deal_chain_id, deal_need_id)` lineage.
4. Order Management creates the child’s own terms, Work, Payment Obligations, parties, evidence, disputes, and notices. Deal Coordination reads derived status/cost only.
5. Dependencies block only declared downstream transitions. Partial completion, failure, cancellation, and replacement are shown per Need; no sibling or parent financial cascade is automatic.
6. A worker recomputes/read-models roll-up and sends notifications from outbox events. It never overwrites child state or authorizes offline final state.

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
| Redis | Queue, cache, locks/coordination; never domain authority | Queue-dependent effects stop safely; authenticated reads use defined degradation where safe | Connection/latency/memory/eviction |
| Queue worker | Outbox, notifications, scans, retries, non-request jobs | Retry/backoff/dead-letter/support queue | Queue age/failure count |
| Scheduler | Expiry, reminders, review-window checks, retention, reconciliation candidates | Alert and retry; no guard bypass | Last successful run per job |
| Private file storage | Evidence/artifact bytes | Block sensitive use; retain metadata | Availability/access/error |
| Observability | Logs/metrics/audit/alerts | Alert delivery fallback | Alert health |

### Separate and conditional processes

| Process | Initial stance | Activation condition |
|---|---|---|
| SSR Node process | Separate presentation optimization with mandatory safe client-render fallback | Deploy and health-check independently when server rendering is enabled; never domain/cache authority |
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
- Deal Chain/Need/dependency/invitation timeline and child-Order lineage
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
- Deal-Chaining dependency-cycle rejections, invitation expiry/idempotency conflicts, child-Order isolation, replacement recovery, and pilot-gate status

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
- Parent roll-up divergence from child Order truth

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
- Deal-Chaining foundation exists in the approved schema/domain/ADR chain, but the bounded capability remains disabled until its separate activation gate passes.

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
- Deal Coordination is isolated from Order/Payment authority and its failure/replacement/partial-completion operations are explicit.

## 16. Accepted initiative architecture extension — 2026-08-09

`ARCHITECTURE-SPINE.md` AD-1–29 is the lean implementation spine for PRD-060–076, domain §16, canonical schema §2.2, and ADR-R-031–040. The following additions are authoritative:

### 16.1 Brownfield topology

- `IdentityAccess`: users, OTP, profile, roles, identity review, delegation, consent.
- `Listings`: category/profile business versions, listings/versions, capacity/reservations, requests, quotes.
- `OrdersWork`: proposal/final Order formation, parties/terms, A1/A3/A4/A9 Work/events.
- `PaymentObligations`: one-lane Obligations, provider events/ports, balanced ledger, refund/reversal/release, reconciliation.
- `TrustSupport`: evidence, disputes, holds, safety, conversations/messages/notifications, support.
- `Operations`: audit, outbox/inbox, idempotency, activations/approvals, jobs, recovery, measurement.
- `DealCoordination` and `Integrations`: only their named aggregates; both call existing owner ports and never rewrite marketplace truth.
- Cross-module commands use application ports and neutral shared envelopes; only owners write aggregates.

### 16.2 Synchronous correctness boundary

Order Management owns `FinalizeOrderAgreement`. One PostgreSQL transaction locks source/listing/capacity → Order → Work → Obligation → integrity rows and either creates the accepted Order, exact terms, parties, required Work, one-lane Obligations, reservations, audit, idempotency result, and outbox or creates none. Jobs never repair required child creation after a nominal success.

Published category/profile/listing/policy meaning is immutable and distinct from `row_version`. Capacity bucket/version/resource and Reservation lifecycle, Deal/Request/Quote lineage, accepted terms, and same-Order child references are relationally guarded.

### 16.3 Asynchronous and activation boundary

Every consumer uses inbox deduplication and per-aggregate ordering; gaps and unsupported contract versions park visibly. Activation is an immutable evidence/approval-backed decision over explicit dimensions and is evaluated inside each owning service. Effect-specific financial containment blocks only unsafe directions and preserves authenticated intake, reads, reconciliation, refunds/reversals, evidence, and support recovery.

### 16.4 Runtime and environment topology

- Required: Nginx→PHP-FPM web, PostgreSQL/PostGIS, Redis, queue worker, scheduler, private evidence adapter, health/alerts, backup/restore.
- Separate presentation optimization: Node SSR with safe client-render fallback.
- Baseline discovery/realtime: PostgreSQL search and polling/notifications; Meilisearch/Reverb require measured adoption evidence.
- Local/test Compose is the reference topology, not production deployment authority.
- Local/test, capstone sandbox, genuine pilot, and production isolate accounts, secrets, data classes, metrics, activations, and promotion evidence.

### 16.5 Integration, AI, evidence, and financial security

Owner derives from authenticated client. Client scope only reduces owner/resource policy. Credentials are selector-plus-hash/secret-reference, environment/audience bound, rotatable/revocable, and issued/expanded after recent step-up. Webhook delivery revalidates DNS/IP/redirect on every attempt and rejects private/reserved/metadata destinations.

AI uses the same application ports and exact single-use approval for confirmation-required commands; general consent/model output is never authority. High-risk admin/financial/security actions use maker/checker policy. Provider events require authenticity plus expected business binding. Evidence stays private/quarantined until validated/scanned and is re-authorized for each isolated-origin download.

### 16.6 Architecture extension gate

- Canonical authorities cite the same PRD/domain/schema/ADR/UX/story identifiers and 58-table inventory.
- Each train OpenSpec uses `PROGRAM-IMPLEMENTATION-PLAN.md` §6 and contains executable transaction, constraint, event-order, security, operations, UX, verification, activation, and rollback contracts.
- Connected UI is not complete on Pest evidence alone; browser paths plus target-user comprehension/accessibility/low-data UAT are required.
- Xendit/Tiwala stay sandbox-only until a current G6 activation record and independent approvals exist.
