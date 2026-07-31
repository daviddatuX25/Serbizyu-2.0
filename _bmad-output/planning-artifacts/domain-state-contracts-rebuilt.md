# Serbizyu 2.0 — Rebuilt Domain and State Contracts

Status: CANONICAL DOMAIN/STATE AUTHORITY — founder-approved 2026-07-31; implementation/live-money gates remain separate
BMAD phase: Phase 3 — Domain/state design
Depends on:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`

Purpose: define the domain vocabulary, aggregate boundaries, state machines, invariants, events, and concurrency rules that the schema, ADRs, architecture, and stories must implement.

## 1. Design rules

1. Order, Work, Payment Obligation, Evidence, Dispute, Consent, and Hold are separate concepts.
2. Payment confirmation never proves Work completion.
3. Work completion never silently proves payment settlement.
4. Every state transition has an actor, guard, event, timestamp, and idempotency key.
5. Historical amounts, terms, fees, lane, policy version, and actor attribution are immutable snapshots.
6. Corrections append events/records; they do not overwrite financial history.
7. Protected release is a guarded transition, not a timestamp-only scheduler action.
8. External Cash and External Digital Proof do not imply Serbizyu custody.
9. Agents can act only within explicit, revocable consent grants.
10. Admin intervention is attributable and auditable.

## 2. Domain aggregates

### 2.1 User/Identity

Owns:

- Account identity
- Role capabilities
- Verification status/evidence reference
- Privacy/retention metadata
- Access tier
- Safety restrictions

Does not own:

- Listing ownership inferred from Agent activity
- Money custody
- Work completion

### 2.2 Listing

Owns:

- Listing type
- Owner reference
- Terms/capacity/availability
- Category/safety/data class
- Mechanism availability
- Lifecycle
- Published version

### 2.3 Order

Owns:

- Parties
- Accepted listing/request/quote snapshot
- Commercial terms snapshot
- Origin/mechanism
- Geography
- Order lifecycle
- References to Work Instances and Payment Obligations

Does not own:

- Detailed work progression
- Provider custody of external funds
- Final financial ledger entries

### 2.4 Work Instance

Owns:

- Fulfillment shape
- Shape-specific execution data
- Progress/evidence references
- Completion proposal/sign-off
- Work lifecycle
- Safety/incident references

### 2.5 Payment Obligation

Owns:

- Purpose
- Amount and currency
- Due condition
- Lane
- Policy/fee snapshot
- Evidence and confirmation state
- Refund/reversal/release references

One obligation uses one lane initially. An Order may have multiple obligations.

### 2.6 Evidence

Owns:

- Evidence type
- Subject aggregate/event
- Uploader/actor
- Privacy/data class
- Storage reference
- Verification status
- Retention/deletion/legal-hold state

### 2.7 Consent Grant

Owns:

- Grantor
- Agent
- Permission scope
- Affected resources
- Start/expiry
- Revocation/suspension
- Notification history

### 2.8 Dispute

Owns:

- Reporter and affected parties
- Affected Order/Work/Obligation/Evidence
- Reason
- Evidence requests
- Hold/restriction references
- Resolution/appeal history

There is no fixed universal dispute-round cap in this contract. Any category-specific limit requires a new decision.

### 2.9 Administrative Hold

Owns:

- Reason class: dispute, fraud, safety, legal, provider, operational
- Target aggregate/obligation
- Creator/approver
- Start/end
- Required release conditions
- Audit history

## 3. Listing state machine

### States

- `draft`
- `pending_review`
- `active`
- `paused`
- `unavailable`
- `expired`
- `archived`
- `rejected`

### Transitions

| From | Event/action | To | Actor/guard |
|---|---|---|---|
| draft | submit_review | pending_review | Owner/Agent with permission; required fields valid |
| pending_review | approve | active | Admin/policy gate; owner identity/category rules pass |
| pending_review | reject | rejected | Admin; reason required |
| active | pause | paused | Owner or authorized Admin; attribution |
| active | capacity_unavailable | unavailable | Owner/system policy; reason or capacity event |
| active | expiry_reached | expired | Scheduler; listing expiry valid |
| paused/unavailable | resume | active | Owner/Admin; current rules pass |
| active/paused/unavailable/expired | archive | archived | Owner/Admin; no prohibited open dependency |

### Invariants

- An archived listing cannot create a new Order.
- A published listing version is snapshotted when an Order/quote is accepted.
- Agent activity does not change owner identity.
- Product listings cannot be active without capacity/stock semantics appropriate to the category.

## 4. Order state machine

Order state is commercial/relationship state, not Work or Payment state.

### States

- `draft`
- `pending_acceptance`
- `accepted`
- `cancel_requested`
- `cancelled`
- `closed`

### Transitions

| From | Event/action | To | Actor/guard |
|---|---|---|---|
| draft | submit_order | pending_acceptance | Buyer/Agent; listing/request/quote valid |
| pending_acceptance | accept_order | accepted | Required parties; terms snapshot created |
| pending_acceptance | decline_order | cancelled | Counterparty; reason recorded |
| accepted | request_cancel | cancel_requested | Buyer/Provider/Admin; policy determines next action |
| cancel_requested | approve_cancel | cancelled | Authorized actor; open obligations handled explicitly |
| cancel_requested | deny_cancel | accepted | Authorized actor; reason recorded |
| accepted | close_order | closed | Work terminal and obligations terminal/explicitly resolved |
| accepted/cancel_requested | force_cancel | cancelled | Admin emergency/policy path; audit/impact required |

### Order invariants

- Accepted terms are immutable snapshots.
- An Order cannot be closed while a required Work Instance remains incomplete.
- An Order cannot be closed while a required Payment Obligation remains unresolved unless the policy explicitly marks it externally settled/disputed/waived.
- Order cancellation does not erase obligations, evidence, or disputes.
- An Order may reference multiple Payment Obligations but no obligation silently changes purpose.

## 5. Work Instance state machine

Work state is independent of payment confirmation.

### Common states

- `not_started`
- `scheduled`
- `in_progress`
- `completion_proposed`
- `awaiting_signoff`
- `completed`
- `disputed`
- `cancel_requested`
- `cancelled`
- `failed`

A specific shape may use a constrained subset and shape-specific labels, but it must map to the common contract.

### Common transitions

| From | Event/action | To | Actor/guard |
|---|---|---|---|
| not_started | schedule/confirm_start | scheduled or in_progress | Parties/shape policy; required terms valid |
| scheduled | start_work | in_progress | Provider/Owner; schedule/availability valid |
| in_progress | propose_completion | completion_proposed | Provider/Owner; required evidence attached |
| completion_proposed | request_signoff | awaiting_signoff | System/policy; Buyer notified |
| awaiting_signoff | signoff | completed | Buyer/authorized actor; evidence valid |
| awaiting_signoff | review_expiry | completed or escalated | Scheduler; only if policy permits and no hold/dispute |
| any nonterminal | open_dispute | disputed | Buyer/Provider/Admin; reason/evidence reference |
| disputed | resolve_complete | completed | Authorized Admin/policy; resolution recorded |
| not_started/scheduled/in_progress | request_cancel | cancel_requested | Party/Admin; policy applies |
| cancel_requested | approve_cancel | cancelled | Authorized actor; obligation impact recorded |
| in_progress | mark_failed | failed | Admin/shape policy; reason and recovery path |

### Work invariants

- Completion requires shape-specific evidence and authorized transition.
- Payment confirmation cannot cause `completed`.
- `completed` cannot be reached while an active safety/fraud/legal hold blocks completion.
- Dispute can pause completion and protected release.
- A Work Instance cannot silently change fulfillment shape after accepted terms; correction requires an explicit change event and affected-party notice.

### Shape-specific requirements

#### A1 Linear Project

- Scope/deliverables snapshot
- Progress evidence
- Revision count/rule if applicable
- Completion proposal
- Sign-off/review

#### A3 Appointment

- Slot reservation
- Reschedule/cancel
- Attendance/no-show
- Completion evidence
- Safety context

#### A4 Handoff

- Preparation/ready
- Stock/sourcing/capacity
- Pickup/handoff
- Receipt/acceptance
- Mismatch/variance evidence

#### A9 Digital Delivery

- Artifact/version
- Delivery/access
- Revision/acceptance
- Retention/deletion

## 6. Payment Obligation state machine

Payment status is separate from Order and Work status.

### States

- `created`
- `due`
- `reported`
- `awaiting_confirmation`
- `counterparty_confirmed`
- `provider_verified`
- `disputed`
- `held`
- `eligible_for_release`
- `released`
- `paid_out`
- `refunded`
- `partially_refunded`
- `reversed`
- `cancelled`
- `superseded`

The exact allowed terminal states depend on lane and purpose.

### Common transitions

| From | Event/action | To | Guard/effect |
|---|---|---|---|
| created | make_due | due | Obligation terms valid |
| due | submit_payment_declaration | reported | Actor and amount captured |
| reported | request_confirmation | awaiting_confirmation | Required counterparty notified |
| awaiting_confirmation | acknowledge | counterparty_confirmed | Counterparty attribution |
| awaiting_confirmation | provider_verify | provider_verified | Trusted provider adapter only |
| reported/counterparty_confirmed/provider_verified | open_dispute | disputed | Reason/evidence/hold created |
| counterparty_confirmed/provider_verified | place_hold | held | Dispute/fraud/legal/admin guard |
| held | clear_hold | eligible_for_release or prior nonterminal | Required hold conditions satisfied |
| counterparty_confirmed/provider_verified | mark_release_eligible | eligible_for_release | Only protected lane; Work/review/reconciliation guards |
| eligible_for_release | release | released | Concurrency-safe compare-and-set; idempotent |
| released | payout_confirmed | paid_out | Provider event/reconciliation |
| any refundable state | refund | refunded/partially_refunded | Refund policy and amount guard |
| any reversible state | reverse | reversed | Provider/ledger correction event |
| created/due | cancel | cancelled | No paid/evidence conflict |
| any nonterminal | supersede | superseded | Replacement obligation linked; original immutable |

### Lane-specific rules

#### External Cash

- `reported` is a declaration, not proof.
- Buyer/provider mutual acknowledgment may reach `counterparty_confirmed`.
- Serbizyu creates no cash custody, payout, or automatic refund.
- Mismatch enters `disputed`.
- Platform commission remains 0% during capstone and initial Tagudin pilot.

#### External Digital Proof

- Screenshot/reference is user evidence.
- `provider_verified` requires trusted adapter/API.
- Evidence can be disputed, rejected, or superseded.
- No Tiwala protection promise.

#### Direct Digital

- Sandbox only until G6.
- Provider/gateway state must reconcile to application event.
- Not a completion-protected hold.

#### Tiwala Protected Digital

- Sandbox only until G6.
- `eligible_for_release` requires authorized Work completion, sign-off/review eligibility, no active dispute, no fraud/admin/legal hold, reconciled amount, and policy snapshot.
- Release must be idempotent and concurrency-safe.
- Release clock begins from completion/sign-off eligibility, never Order creation.

## 7. Release decision contract

A protected release attempt must evaluate atomically:

1. Obligation is in the correct pre-release state.
2. Work Instance is completed under the applicable shape contract.
3. Sign-off or review-window expiry is valid.
4. No active dispute affects the obligation/order/work.
5. No fraud, safety, legal, provider, or administrative hold exists.
6. Amounts reconcile to provider/application records.
7. Policy/fee terms are the snapshotted terms.
8. No prior release/payout event exists.
9. A compare-and-set/lock prevents duplicate release.
10. Success emits one auditable release event.

A scheduler may discover candidates, but it may not bypass these guards.

## 8. Evidence state contract

### Evidence lifecycle

- `created`
- `uploaded`
- `processing`
- `accepted`
- `rejected`
- `superseded`
- `retained_under_hold`
- `deleted`

### Evidence rules

- Every evidence item identifies uploader/actor and subject event.
- Sensitive evidence has data class and access policy.
- Rejection includes a reason and safe resubmission path.
- Deletion respects retention/legal hold.
- Evidence acceptance does not automatically complete Work or confirm payment unless the specific state contract says so.

## 9. Consent Grant state machine

### States

- `proposed`
- `pending_owner_confirmation`
- `active`
- `suspended`
- `revoked`
- `expired`

### Rules

- Scope is explicit: resource, action, duration, and sensitivity.
- Owner confirmation is attributable.
- Agent notices are recorded.
- Revocation stops future actions but does not erase prior history.
- Suspended grants require a reason and reactivation guard.
- High-risk/irreversible actions may require per-action confirmation even with an active grant.

## 10. Dispute state machine

### States

- `opened`
- `evidence_requested`
- `under_review`
- `resolved`
- `rejected`
- `withdrawn`
- `appealed`
- `closed`

### Rules

- Opening a dispute creates/activates relevant holds according to lane policy.
- Evidence requests have deadlines and reminders.
- Resolution identifies affected Work, Obligations, releases, refunds, or corrections.
- External Cash resolution does not imply automatic Serbizyu refund.
- There is no universal three-round cap.
- Appeal behavior is policy/configuration-driven and audited.

## 11. Administrative Hold state machine

### States

- `active`
- `reviewing`
- `released`
- `converted_to_restriction`
- `closed`

### Rules

- Hold reason and scope are required.
- Hold creator and approver are recorded.
- Protected release cannot bypass an active relevant hold.
- Release of hold requires reason and actor.
- Emergency access is logged and reviewed.

## 12. Event and idempotency contract

Every domain event includes:

- Event ID
- Aggregate type/ID
- Event type/version
- Actor type/ID
- Correlation ID
- Idempotency key
- Occurred-at time
- Effective-at time where different
- Policy/terms snapshot reference where relevant
- Payload/schema version
- Previous state
- New state

Critical idempotency boundaries:

- Order acceptance
- Work completion
- Payment declaration/verification
- Webhook ingestion
- Refund/reversal
- Release
- Payout confirmation
- Notification dispatch
- Consent grant/revocation
- Admin hold/release

Duplicate or out-of-order provider events must be safely ignored, reconciled, or placed into an operations queue without double effects.

## 13. Concurrency and consistency rules

- State transitions use optimistic version/CAS or a lock appropriate to the aggregate.
- Release and refund operations are mutually aware.
- Inventory/capacity reservation prevents oversell for committed Product/A3 paths.
- Only one active completion decision can win; later attempts become idempotent/no-op or correction events.
- Admin actions cannot silently race a user transition.
- External provider status is reconciled before irreversible protected financial effects.
- Outbox/event publication is transactionally linked to the state change it announces.

## 14. Authorization matrix baseline

| Action | Buyer | Provider/Owner | Agent | Admin |
|---|---:|---:|---:|---:|
| Create own listing/request | yes | yes | scoped | support override |
| Publish listing | no | yes | scoped + owner consent | review/override |
| Accept Order | yes/no by side | yes/no by side | scoped | controlled override |
| Submit Work evidence | no | yes | scoped | support upload with reason |
| Confirm completion | yes/authorized reviewer | no/shape-specific | scoped only | controlled resolution |
| Declare external payment | yes | yes | scoped, attributed | support correction |
| Verify provider payment | no | no | no | adapter/system only |
| Open dispute | yes | yes | scoped report | yes |
| Place/release hold | no | no | no | authorized Admin/system policy |
| Release protected funds | no | no | no | guarded operation only |
| Grant/revoke Agent | owner | owner | no | emergency suspension |

This table is a baseline; category-specific restrictions may reduce permissions.

## 15. Domain acceptance gate

The domain contract is ready for canonical schema design only when:

- Order and Work states are separate and complete.
- Payment Obligation states are lane-aware.
- Release guards no longer depend on Order creation.
- Evidence, Consent, Dispute, and Hold states are explicit.
- Every transition has actor, guard, event, and financial effect.
- Idempotency and concurrency rules cover money and critical operations.
- A1/A3/A4/A9 differences are represented without separate ad hoc products.
- Deferred shapes have no accidental pilot transitions.
- The schema artifact can reference this contract without inventing states.
