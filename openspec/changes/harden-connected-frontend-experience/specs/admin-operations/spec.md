# Admin and Operations Frontend Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-001–009, PRD-044–059; UX-013–023; P-04; E5-S2–S5; E6-S1–S5; `role_assignments`, `identity_verifications`, `listings`, `listing_versions`, `orders`, `work_instances`, `payment_obligations`, `evidence_files`, `disputes`, `dispute_events`, `administrative_holds`, `support_cases`, `safety_incidents`, `notifications`, `notification_deliveries`, `cohort_classifications`, `audit_events`, `outbox_messages`, `idempotency_keys`, `retention_holds`

## ADDED Requirements

### Requirement: Protected Admin shell and scoped operations permissions

ID: AOP-REQ-001

The frontend SHALL expose Admin/Operations through a separate `#/ops` shell available only to a product mock session with explicit Admin capability and the required operation permission. It SHALL not be reachable through consumer role switching, self-onboarding, Agent grants, or Scenario Lab appearance alone.

#### Scenario: Authorized operations account enters Admin

- GIVEN a mock-authenticated account has Admin capability and `ops.view`
- WHEN it opens `#/ops`
- THEN the Operations shell and only permitted navigation items render
- AND consumer Buyer/Provider relationships remain unchanged
- AND a persistent fictional-operations boundary is shown.

#### Scenario: Ordinary user opens Admin URL

- GIVEN the current account lacks Admin capability
- WHEN it opens `#/ops`
- THEN access is denied before protected counts or record summaries load
- AND the user receives a safe return/help route
- AND no Admin role is granted.

#### Scenario: Admin lacks specific scope

- GIVEN an Admin account may view the dashboard but lacks `identity.review`
- WHEN it opens a verification route
- THEN the route is denied without evidence metadata
- AND the missing operation scope is explained
- AND no reviewer shortcut bypasses the product permission check.

### Requirement: State-derived operations dashboard

ID: AOP-REQ-002

The Operations dashboard SHALL derive queue counts and warnings from the normalized scenario repository. It SHALL summarize verification, listing review, disputes, holds, safety incidents, support, critical failures, classification, and disabled fixture capabilities. Every card SHALL navigate, perform an authorized action, or explain unavailability.

#### Scenario: New failed critical notice appears

- GIVEN a critical notification delivery enters simulated failure
- WHEN an authorized Admin opens the dashboard
- THEN the failure count updates from shared state
- AND the card opens the exact failure/notification record
- AND the originating domain action remains unchanged.

#### Scenario: Dashboard queue is empty

- GIVEN no fixture records need identity review
- WHEN the verification card renders
- THEN it shows a truthful zero/empty state
- AND does not display seeded fake urgency
- AND may link to verification history where authorized.

### Requirement: Unified operations queue

ID: AOP-REQ-003

The Admin SHALL have a unified action queue with URL-persistent filters for queue type, status, severity/priority, assignment, evidence class, geography, and age/expiry where canonical. Queue items SHALL identify the target entity, actors, current version, blocked reason, permission, and one next action.

#### Scenario: Filter to unresolved safety incidents

- GIVEN the repository contains several operation items
- WHEN the Admin filters to unresolved safety incidents
- THEN the URL/filter state persists through refresh
- AND only authorized minimum-necessary incident summaries render
- AND each item opens the exact incident ID.

#### Scenario: Queue data becomes stale

- GIVEN another authorized perspective resolved an item
- WHEN the Admin attempts an action from an older queue version
- THEN the command returns stale/conflict
- AND the queue refreshes with explicit re-review
- AND no older decision overwrites the resolution.

### Requirement: User, account, capability, and grant inspection

ID: AOP-REQ-004

Authorized Admin users SHALL inspect account status, safe profile fields, access tier, role assignments, verification states, consent grants, restrictions/holds, cohort classification, support/notice history, and audit events. Sensitive values SHALL be redacted or referenced. Admin inspection SHALL never become account impersonation.

#### Scenario: Inspect Agent-assisted Owner

- GIVEN Lola Nena has an active grant to Rosa
- WHEN an authorized Admin opens Lola Nena’s account
- THEN Owner identity, Agent identity, scope, expiry, notices, and attributed actions are distinct
- AND no control signs the Admin in as Lola Nena
- AND unrelated sensitive evidence is hidden.

#### Scenario: Suspend a fixture capability

- GIVEN an Admin has the required user/capability operation permission
- WHEN they confirm suspension with reason and expected version
- THEN the permitted status change is appended as an event
- AND affected future commands are blocked
- AND prior actions/history remain
- AND the Admin does not edit the role-assignment history directly.

### Requirement: Identity review queue and protected evidence metadata

ID: AOP-REQ-005

An authorized identity reviewer SHALL inspect the requested verification type, consent/retention meaning, synthetic evidence metadata, scan/fixture state, access history, prior decisions, and current version. They MAY request more information, approve a fixture, or reject with reason. The UI SHALL not display real government-ID/selfie evidence or claim live verification.

#### Scenario: Approve fictional verification

- GIVEN a CAPSTONE verification fixture is pending and the reviewer has `identity.review`
- WHEN they approve with reason and current expected version
- THEN the fixture status changes through an attributed event
- AND the account receives a notification intent
- AND the public interface may show only the exact fictional verification meaning
- AND no real identity proof claim is made.

#### Scenario: Evidence access is not permitted

- GIVEN an Admin can inspect users but lacks identity-review access
- WHEN they open the verification detail
- THEN sensitive fixture metadata is withheld
- AND access denial is recorded where appropriate
- AND no client-only hidden panel exposes it.

#### Scenario: Request more information

- GIVEN the evidence fixture is incomplete
- WHEN the reviewer requests more information with a non-sensitive reason
- THEN the prior evidence/decision history remains
- AND the User receives an action-required notice
- AND review does not become approved.

### Requirement: Listing review and moderation

ID: AOP-REQ-006

Listing operations SHALL show Owner, acting Agent, current/pending versions, category/capability/safety/data requirements, capacity, previous decisions, and Buyer preview. Authorized commands SHALL include fixture approve, reject, request correction, pause/disable, and resume where canonical. Reasons and expected versions are required.

#### Scenario: Approve Agent-created Owner listing

- GIVEN Rosa created a draft for Lola Nena and Owner approval is satisfied
- WHEN an authorized listing reviewer approves the current pending version
- THEN Lola Nena remains Owner
- AND Rosa remains acting Agent in history
- AND the approved listing version becomes active
- AND accepted historical Order terms are unchanged.

#### Scenario: Reject listing with correction route

- GIVEN a listing violates a fixture safety/capability requirement
- WHEN the reviewer rejects it with reason
- THEN the pending version becomes rejected
- AND Owner/Agent receives a correction notice
- AND the editable draft is preserved or recreated according to explicit fixture behavior
- AND no other listings are affected.

#### Scenario: Admin tries to rewrite listing content

- GIVEN the listing is under review
- WHEN the Admin inspects it
- THEN content fields are read-only
- AND the available actions are decision/correction-request actions
- AND no silent Admin edit of Owner-authored content exists.

### Requirement: Request, quote, Order, Work, Payment, and Evidence inspection

ID: AOP-REQ-007

The Admin composite inspector SHALL display Request, Quote versions, accepted Order terms, Work, Payment Obligations, Evidence, Disputes/Holds, Notifications, and Audit as separate linked records. It SHALL not collapse or directly rewrite them.

#### Scenario: Inspect Order formed from accepted bid

- GIVEN an Order originated from a Request and accepted Quote
- WHEN an authorized Admin opens the Order
- THEN the exact Request, selected Quote version, immutable terms snapshot, parties, Work, and Payment Obligation are linked
- AND unselected responses remain separately inspectable where authorized
- AND payment status is not presented as Work status.

#### Scenario: Admin attempts to report cash for a party

- GIVEN an External Cash obligation awaits party reports
- WHEN the Admin views the obligation
- THEN no normal action lets Admin report `Cash paid` or `Cash received` as Buyer/Provider
- AND only authorized hold/support/correction paths are available
- AND Admin cannot impersonate a party.

### Requirement: Dispute operations and explicit downstream effects

ID: AOP-REQ-008

The dispute workspace SHALL show reporter/parties, affected aggregates, reason/category/severity, requested remedy, evidence metadata, event history, active holds, prior resolutions, assigned operator, and next action. Authorized actions SHALL append events and explicitly state effects on Order, Work, Payment, Evidence, or Hold.

#### Scenario: Request dispute evidence

- GIVEN a dispute lacks sufficient fixture evidence
- WHEN an authorized operator requests information
- THEN the dispute enters the appropriate evidence-request state
- AND affected parties receive notices
- AND existing payment/Work reports remain unchanged
- AND the request is appended to dispute history.

#### Scenario: Resolve External Cash dispute

- GIVEN an External Cash mismatch dispute is under review
- WHEN the Admin records an approved fixture resolution
- THEN the resolution summary and affected states are shown before confirmation
- AND the event is attributable and immutable
- AND Serbizyu does not promise or execute automatic cash recovery/refund.

#### Scenario: Admin uses stale dispute version

- GIVEN the dispute changed after the Admin opened it
- WHEN they submit a resolution against the old version
- THEN the action is rejected as stale
- AND the current history must be reviewed
- AND no partial downstream effect occurs.

### Requirement: Administrative hold lifecycle

ID: AOP-REQ-009

Authorized Admin users SHALL place and release fraud, safety, legal, dispute, or provider-related fixture holds only on supported targets. Every hold SHALL record target, reason class, creator/approver, conditions, effective/released time, and audit. Holds SHALL affect only explicitly defined transitions.

#### Scenario: Place hold on disputed obligation

- GIVEN a protected/sandbox obligation has an active dispute
- WHEN an authorized operator places a hold with reason and conditions
- THEN the hold becomes visible on the obligation and dispute
- AND blocked transitions explain the hold
- AND unrelated Work state does not change unless the hold contract explicitly affects it.

#### Scenario: Release hold before conditions pass

- GIVEN hold release conditions remain unsatisfied
- WHEN an Admin attempts release
- THEN release is denied with the missing condition
- AND the hold remains active
- AND no protected transition is unlocked.

### Requirement: Safety incident and support operations

ID: AOP-REQ-010

Safety incidents SHALL use restricted, minimum-necessary views and attributable response events. Support cases SHALL remain distinct from disputes. Authorized actions MAY block/restrict/hold/escalate/assign/close only within approved fixture policy. The frontend SHALL not invent an emergency response, hotline, guarantee, or resolution deadline.

#### Scenario: Open severe fixture safety incident

- GIVEN a high-severity fictional incident is reported
- WHEN an authorized safety operator opens it
- THEN access purpose and sensitive-data boundary are visible
- AND related listing/Order/meeting and current restrictions are shown
- AND unrelated private evidence is withheld.

#### Scenario: Convert support issue to dispute

- GIVEN a support case identifies a payment/work disagreement
- WHEN the operator uses an approved escalation action
- THEN a distinct Dispute is created and linked
- AND the support case history remains
- AND the system does not mutate the support case into a dispute record.

### Requirement: Failed-event and idempotent retry operations

ID: AOP-REQ-011

Operations SHALL inspect failures for notification delivery, evidence processing, outbox publication, provider/sandbox events, and scheduled-job fixtures. Detail SHALL show intent, source event, target, attempts, failure class, next retry, idempotency, current domain effect, and support owner. Retry SHALL be guarded, attributable, and idempotent.

#### Scenario: Retry failed notification delivery

- GIVEN a notification intent exists and its simulated SMS delivery failed
- WHEN an authorized operator retries with the current version
- THEN a new delivery attempt is appended
- AND the original intent and failed attempt remain
- AND the underlying domain event is not repeated.

#### Scenario: Duplicate retry command

- GIVEN the first retry command already succeeded
- WHEN the same idempotency key is submitted again
- THEN no duplicate delivery/domain event is created
- AND the original retry result is returned.

#### Scenario: Retry fails again

- GIVEN the selected failure variant remains active
- WHEN the operator retries
- THEN a further failed attempt is recorded
- AND the case remains unresolved with support/escalation guidance
- AND no false success appears.

### Requirement: Notification and delivery inspection

ID: AOP-REQ-012

Authorized Operations users SHALL inspect notification intent separately from channel delivery attempts. The view SHALL identify event source, recipient, priority, required action, channel, provider fixture reference, status, retries, failure reason, and fallback/support state.

#### Scenario: In-app delivered but SMS failed

- GIVEN one critical Owner notice has successful in-app delivery and failed simulated SMS
- WHEN the Admin inspects it
- THEN both delivery outcomes remain visible
- AND the notice intent remains valid
- AND the UI states that no real SMS transport exists
- AND retrying SMS cannot duplicate the Owner approval action.

### Requirement: Cohort classification and truthful metrics

ID: AOP-REQ-013

Operations SHALL distinguish CAPSTONE, SANDBOX, TEAM_TRAINING, and GENUINE_PILOT classifications where canonically allowed. Frontend fixtures SHALL default to non-genuine classes. Classification corrections SHALL require reason and audit. Metrics SHALL expose filters, time/geography/evidence class, sample counts, and source meaning.

#### Scenario: View frontend demo metrics

- GIVEN all current records are CAPSTONE or TEAM_TRAINING
- WHEN the Admin opens Metrics
- THEN the page visibly filters them as non-genuine
- AND genuine Tagudin counts remain zero
- AND no validation conclusion is displayed.

#### Scenario: Attempt casual genuine reclassification

- GIVEN a CAPSTONE Order exists
- WHEN an operator without classification permission attempts to mark it genuine
- THEN the action is denied
- AND the metric remains unchanged
- AND no hidden client edit can alter classification.

#### Scenario: External Cash revenue metric

- GIVEN CAPSTONE External Cash Orders exist
- WHEN revenue metrics render
- THEN platform External Cash revenue is zero
- AND transaction count/value may be shown only with non-custodial/evidence-class meaning
- AND no uncollected commission is reported as revenue.

### Requirement: Policy versions and fixture kill switches

ID: AOP-REQ-014

Operations SHALL inspect policy version, status/effective range, affected capability profile, and audit history. A scoped fixture supervisor MAY disable or enable approved capability/provider/Agent paths through reason-required, expected-version commands. The UI SHALL not create ad hoc financial rates, deadlines, tax rules, refund rules, or legal requirements.

#### Scenario: Disable Quick Deal fixture capability

- GIVEN a fictional safety/operations variant requires Quick Deal disabled
- WHEN an authorized supervisor confirms the fixture kill switch with reason
- THEN new Quick Deal initiation is blocked
- AND existing sessions show the approved affected behavior
- AND the change is audited
- AND public copy does not imply a production incident.

#### Scenario: Operator lacks policy permission

- GIVEN an Admin may inspect policies but lacks the fixture-toggle scope
- WHEN they view the capability gate
- THEN the status and history are read-only
- AND no enabled-looking control can change it.

### Requirement: Append-only operations audit

ID: AOP-REQ-015

Every high-risk operation SHALL append an audit event containing actor, operation, target, previous/new summary, reason, correlation, permission source, fixture class, and timestamp. Sensitive values SHALL be redacted/referenced. Audit history SHALL not be edited or deleted through the frontend.

#### Scenario: Review administrative sequence

- GIVEN a listing was rejected, corrected, resubmitted, and approved
- WHEN an authorized audit viewer searches the listing ID
- THEN each decision and actor appears in order
- AND prior reasons remain
- AND the current listing state links to the full sequence.

#### Scenario: Attempt audit edit

- GIVEN an Admin opens an audit event
- WHEN the event detail renders
- THEN no edit/delete control exists
- AND any correction is represented by a later linked event
- AND sensitive values remain redacted.

### Requirement: Operational-readiness evidence remains truthful

ID: AOP-REQ-016

The Admin readiness view MAY display fixture/checklist evidence for scenario migration/reset, frontend production-build tests, mock restore rehearsal, failed queues, policy gates, and planning blockers. It SHALL NOT execute or claim real database backup/restore, infrastructure health, provider reconciliation, incident response, or production readiness.

#### Scenario: Open readiness page in static frontend

- GIVEN the application is a deterministic static review build
- WHEN an Admin opens Operational Readiness
- THEN every infrastructure/backend item is labeled fixture, checklist, unavailable, or pending evidence
- AND frontend test evidence may link to actual saved artifacts
- AND no `Backup complete`, `Provider reconciled`, or `Production healthy` claim is generated without external evidence.

### Requirement: Work, Payment Obligation, and Evidence inspectors preserve aggregate boundaries

ID: AOP-REQ-017

Operations SHALL provide protected aggregate-specific inspection of Work, Payment Obligations, and Evidence without collapsing their states into Order status. Payment and financial histories SHALL be append-only; evidence SHALL be metadata/placeholder based and redacted by default. Evidence acceptance SHALL NOT complete Work or confirm Payment, and Payment SHALL NOT complete Work.

#### Scenario: Payment is acknowledged while Work continues

- GIVEN an External Cash fixture records separate Buyer and Provider acknowledgments
- AND related Work remains `in_progress`
- WHEN an authorized Admin opens the Order, Work, and Payment views
- THEN each aggregate retains and displays its independent state
- AND no `edit balance`, `mark paid as party`, or automatic Work-completion control exists
- AND any correction is a linked later event/record.

#### Scenario: Authorized operator opens sensitive evidence

- GIVEN evidence metadata is classified sensitive and redacted by default
- WHEN an operator with approved sensitive-view scope provides any required access reason
- THEN the allowed fixture fields become visible for that access only
- AND storage secrets/raw real identity data are never shown
- AND an attributable evidence-access audit event is appended
- AND retention/legal-hold state remains visible.

#### Scenario: Evidence processing fixture fails

- GIVEN evidence remains in fixture processing state
- WHEN the deterministic scan fixture fails
- THEN evidence becomes rejected/more-information-needed with reason and resubmission
- AND Work and Payment remain unchanged
- AND the failure appears in Operations recovery where configured.

### Requirement: Outbox and provider-event reconciliation is idempotent and non-financial by default

ID: AOP-REQ-018

Operations SHALL distinguish notification intent, outbox publication, delivery attempts, provider events, reconciliation mismatches, and domain effects. Retry/reconciliation SHALL preserve original intent/correlation and SHALL NOT duplicate financial or marketplace effects. Unverified screenshots/references SHALL NOT become provider-verified evidence.

#### Scenario: Duplicate provider event arrives

- GIVEN a fixture provider event with the same provider/event ID was already applied
- WHEN Operations processes or retries it
- THEN the result is an idempotent no-op/reconciled outcome
- AND no duplicate Payment event, financial entry, notice, or release occurs
- AND the duplicate relationship is auditable.

#### Scenario: Out-of-order provider event arrives

- GIVEN a provider event cannot validly follow the current fixture state
- WHEN it is ingested
- THEN it enters reconciliation with exact reason/current state
- AND no trusted status is fabricated
- AND the operator may escalate or apply only an approved correction flow.

### Requirement: High-risk Admin actions use preflight, reason, confirmation, version, and result

ID: AOP-REQ-019

Rejection, force cancellation, hold create/release, safety restriction, sensitive access where required, correction, cohort/metric correction, evidence rejection/deletion, provider reconciliation, and simulated protected release SHALL use a high-risk command pattern. It SHALL show current state/version, guards, affected actors/aggregates, expected effects, required reason, explicit confirmation, idempotency/correlation, and server/gateway result. UI visibility alone is never authorization.

#### Scenario: User changed the aggregate before Admin confirmation

- GIVEN Admin preflighted version 4
- AND a user command produced version 5
- WHEN Admin confirms the version-4 operation
- THEN the command is rejected as stale
- AND the UI preserves inputs and shows refresh/diff guidance
- AND version 5 is not overwritten.

#### Scenario: Hold release guard fails

- GIVEN an authorized Admin supplies a reason and confirms release
- BUT a required release condition no longer holds
- WHEN the command is revalidated
- THEN no state change occurs
- AND the exact failed condition is shown
- AND an allowed rejected-attempt record is attributable.

### Requirement: Sandbox payment and protected release remain visibly non-production and fully guarded

ID: AOP-REQ-020

Direct Digital and Tiwala Protected Digital operations SHALL remain sandbox/demo-only. Any simulated protected release SHALL require correct pre-release state, completed eligible Work, valid sign-off/review eligibility, no dispute, no hold, reconciliation, immutable policy snapshot, no prior release, concurrency/idempotency protection, and one attributable release event. It SHALL NOT imply live custody, escrow, payout, refund, legal protection, or production provider health.

#### Scenario: Sandbox release is blocked by one guard

- GIVEN a Tiwala sandbox obligation has an active hold, dispute, incomplete Work, missing sign-off, reconciliation mismatch, stale version, or prior release
- WHEN simulated release is requested
- THEN release is blocked with the exact guard
- AND no balance/payment/Order/Work state is silently changed
- AND the sandbox boundary remains prominent.

#### Scenario: All sandbox guards pass

- GIVEN every approved guard passes for an unreleased sandbox obligation
- WHEN an authorized fixture operator confirms with reason and idempotency key
- THEN one simulated append-only release event may be created
- AND retry returns the original result
- AND copy states that no live money moved and no legal escrow/custody existed.
