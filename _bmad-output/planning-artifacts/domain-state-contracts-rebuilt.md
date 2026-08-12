# Serbizyu 2.0 — Rebuilt Domain and State Contracts

Status: CANONICAL DOMAIN/STATE AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; implementation/live-money gates remain separate
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

### 2.10 DealChain coordination aggregate

DealChain is a coordinator-owned plan and derived roll-up boundary. It is not an Order, wallet, escrow, financial account, or parent-wide liability owner. Its cost/progress summary is derived from child Needs and ordinary child Orders and cannot overwrite child truth.

Owns:

- Coordination goal, coordinator, target context, and ordered Need membership
- Dependency edges and chain-level derived status
- Invitation and sourcing references for child Needs
- Parent-level notices, audit correlation, and operational visibility

Does not own:

- Commercial terms, Work completion, Payment Obligations, evidence, disputes, refunds, or liability for child Orders
- Pooled custody, automatic fund splitting, automatic liability reassignment, or parent-wide cancellation/refund guarantees

### 2.11 DealNeed

DealNeed is one required service/product slot within a DealChain. It is independently stateful and may reuse many existing Requests/Quotes. It has at most one active child Order; replacement creates a new Need and preserves the prior Need/Order history.

### 2.12 DealDependency

DealDependency is a directed same-chain `blocks` edge from a predecessor Need to a successor Need. Self-edges, cross-chain edges, duplicate active edges, and cycles are invalid. An edge blocks only the named downstream transitions and never performs parent-wide cancellation or payment effects.

### 2.13 DealInvitation

DealInvitation targets exactly one Need and records purpose, scope, expiry, response, inviter/invitee, acting-for context where applicable, revocation, version, idempotency, audit, and outbox causality. Accepting an invitation is an attributed sourcing/assignment decision; it does not itself create an Order.

The bounded model is the approved foundation contract. The later user-facing coordination slice remains a separately sequenced story and pilot activation gate.

## 2.14 Deal-Chaining state machines and commands

### DealChain states

`draft`, `planning`, `sourcing`, `in_progress`, `partially_complete`, `blocked`, `completed`, `cancelled`, `archived`

| From | Command/event | To | Guard/effect |
|---|---|---|---|
| draft | `start_planning` | planning | coordinator or scoped Agent; active consent and valid version |
| planning | `open_sourcing` | sourcing | at least one valid Need; no invalid dependency |
| sourcing | `begin_execution` | in_progress | required downstream guards satisfied; does not complete any child |
| in_progress | `record_partial_completion` | partially_complete | one or more child Needs terminal while another remains nonterminal |
| any nonterminal | `mark_blocked` | blocked | named dependency/operational hold; reason required |
| partially_complete/in_progress | `close_chain` | completed | every required Need completed or explicitly resolved; derived summary only |
| any nonterminal | `cancel_chain` | cancelled | coordinator/Admin command; records impact; never silently cascades child cancellation/refund |
| cancelled/completed | `archive_chain` | archived | retention/history rules satisfied |

### DealNeed states

`draft`, `open`, `sourcing`, `invited`, `quoted`, `accepted`, `in_progress`, `blocked`, `completed`, `failed`, `cancelled`, `replacement_needed`, `superseded`

| From | Command/event | To | Guard/effect |
|---|---|---|---|
| draft | `open_need` | open | required service/product slot is valid |
| open | `publish_need_request` | sourcing | creates/links existing Request; no new bidding primitive |
| sourcing | `send_invitation` | invited | invitation targets this Need and is idempotent |
| sourcing/invited | `record_quote` | quoted | existing Quote is valid and unexpired |
| invited | `accept_invitation` | accepted | invite response is current, authorized, and idempotent; **no Order is created** |
| quoted/accepted | `form_child_order` | in_progress | explicit terms/party acceptance creates or links one ordinary child Order |
| in_progress | `complete_need` | completed | child Work completion and Order guards remain authoritative |
| any nonterminal | `mark_need_failed` | failed | actor/reason/recovery recorded; no sibling auto-cascade |
| any nonterminal | `request_need_cancel` | cancelled | explicit Need/child Order impact handling; history retained |
| failed/cancelled | `request_replacement` | replacement_needed | replacement plan recorded |
| replacement_needed | `create_replacement_need` | superseded (old) / draft (new) | new Need references `replaces_deal_need_id`; old history remains |
| any eligible state | `mark_need_blocked` | blocked | only named active dependencies/holds block the transition |

### DealDependency states

`active`, `removed`, `superseded`.

`add_dependency` requires same-chain Needs, distinct endpoints, active-edge uniqueness, and a cycle check under the chain lock. `remove_dependency` and replacement are version-checked, actor-attributed, idempotent, audited, and outbox-backed. A dependency can block only the transitions named by its `condition_code`.

### DealInvitation states

`draft`, `sent`, `viewed`, `accepted`, `declined`, `expired`, `revoked`, `superseded`, `cancelled`.

`send_invitation` requires a current Need and explicit invitation scope. `accept_invitation`, `decline_invitation`, `revoke_invitation`, and expiry are actor-attributed and version/idempotency guarded. Acceptance records the response and may advance Need sourcing state, but child Order formation is a separate command with a separate idempotency boundary.

## 2.15 Deal-Chaining invariants, partial completion, and recovery

- Every child Order is an ordinary Order with its own parties, immutable terms, Work, Payment Obligations, evidence, disputes, cancellation, authorization, version, audit history, and idempotency boundary.
- A Need may have many Requests/Quotes but at most one active non-cancelled/non-closed child Order. Database partial uniqueness and application CAS enforce this.
- Requests/Quotes reuse existing workflows. Open sourcing never bypasses Request/Quote expiry, authorization, or acceptance guards.
- Parent status and cost are derived summaries. Payment confirmation never completes Work; Work completion never proves payment.
- Partial completion is valid: completed children remain completed while other Needs are open, blocked, failed, or replacement-needed. The chain is not complete until all required Needs are completed or explicitly resolved.
- A failed/cancelled child does not automatically cancel, refund, release, dispute, or reassign another child. Replacement creates new Need/Order history and preserves old records.
- A parent cancellation records an impact plan and requires explicit child commands where cancellation is appropriate; it never deletes child truth or performs a parent-wide financial cascade.
- No offline client authorizes a final chain, Need, invitation, Order, payment, inventory, consent, or release state. Offline drafts remain non-authoritative.
- Every command carries actor, optional acting-for Owner, active consent grant when an Agent acts, target aggregate, expected version, correlation ID, idempotency key, audit event, and transactional outbox intent.

## 2.16 Deal-Chaining authorization and Agent acting-for matrix

| Action | Coordinator/Owner | Invited Provider | Scoped Agent | Admin/Operator |
|---|---:|---:|---:|---:|
| Create/update own Chain and Need | yes | no | scoped + active Owner consent | support override with reason |
| Add/remove dependency | yes | no | scoped + explicit dependency permission | controlled override; audit |
| Send/revoke invitation | yes | no | scoped + Owner consent | support action with reason |
| Accept/decline own invitation | no unless also invited party | yes | only for own invited Provider identity | no except controlled resolution |
| Form/link child Order | authorized party by child terms | authorized party | scoped + acting-for context; no ownership transfer | controlled resolution |
| Cancel/replace a Need | coordinator/authorized child parties by policy | own child response | scoped + Owner consent | controlled resolution |
| Inspect chain roll-up | authorized participants | authorized invited/child party | scoped Owner view | authorized operations scope |

Agent activity never changes the Owner/coordinator, child parties, payer/recipient, custody, or final authority. Revocation stops future actions but preserves prior attribution.

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

## 16. Accepted initiative extension — 2026-08-09

This section is canonical for the capabilities in PRD-060–076 and supersedes any legacy use of one generic `version`, one blanket feature flag, or provider/upload success as business truth.

### 16.1 Version roles

| Version | Meaning | Mutation rule |
|---|---|---|
| Business version | Immutable published category/profile/listing/quote/terms/policy meaning | New row/version only; accepted references never repoint. |
| `row_version` | Optimistic concurrency counter for one mutable aggregate row | Increment on guarded mutation; never used as semantic identity. |
| Shape/payload contract version | Validator/reader required for Work/event payload | Registry retains referenced readers; unknown version parks with no effect. |
| Event contract and aggregate sequence | Consumer interpretation and causal order | Append-only; consumer applies only next sequence. |
| Artifact/revision version | A9 file/deliverable revision | Append-only artifact history; not Work aggregate version. |

### 16.2 Proposal and final Order formation

- `SubmitOrderProposal` may create/update only a `pending_acceptance` proposal and party acceptance records.
- `FinalizeOrderAgreement` requires an allowed discriminated source, exact immutable source versions, current acceptance proofs, eligible capability/activation, held or atomically reservable capacity, required Work/Obligation specifications, expected versions, actor/client context, and idempotency.
- One Order-owned transaction locks source/listing/capacity, then Order, Work, Obligation, and integrity records. It creates accepted Order, exact terms, parties, required Work, one-lane Obligations, committed reservations, audit, idempotency result, and outbox or rolls everything back.
- A standing listing/provider quote counts as provider acceptance only when its snapshotted capability policy explicitly grants that meaning.
- Accepted Order requires a same-Order terms snapshot; any Obligation→Work link must share that Order.

### 16.3 Capacity reservation lifecycle

| From | Command | To | Guard/effect |
|---|---|---|---|
| none | hold | held | Exact listing version/bucket/resource, positive quantity or free slot, expected bucket version, expiry and command identity; atomic decrement/lock. |
| held | commit | committed | Final Order transaction, current hold/source/acceptance; attach same Order exactly once. |
| held | release/expire | released/expired | Authorized terminal reason or elapsed expiry; restore capacity exactly once. |
| committed | cancel/reverse | released | Order policy allows release; append event and restore exactly once. |

Quantity remaining never becomes negative; active slot/resource reservations do not overlap; external synchronization cannot overwrite held/committed marketplace authority.

### 16.4 Ordered asynchronous consumption

Every event has event ID, aggregate type/ID/version/sequence, event and payload contract versions, causation/correlation, actor/client, occurred/effective times, and payload hash. A consumer inbox transitions `received → processing → processed`; repeats are no-ops, a future sequence becomes `gap`, an unknown contract becomes `unsupported`, and exhausted safe retries become `dead_letter`. None is acknowledged as business success before its durable effect and next sequence are recorded. Replay is operator-attributed and idempotent.

### 16.5 Service principal and integration states

| Aggregate | States / transition rule |
|---|---|
| Integration Client | `draft → active ↔ suspended → revoked → archived`; revocation is immediate and history-preserving. |
| Credential | `issued → active → overlap → expired or revoked`; rotation overlap is bounded, environment/audience must match, plaintext is never recoverable. |
| Mapping | `active → conflicted or archived`; expected version prevents blind overwrite and owner/client lineage never changes. |
| Webhook Subscription | `pending_verification → active ↔ suspended → revoked`; each delivery revalidates destination and signing state. |
| Webhook Delivery | `pending → delivering → delivered, retry_wait, or dead_letter`; HTTP success is delivery only, never marketplace state authority. |
| Sync Cursor | `active → expired or reset`; sequence is monotonic and reset is explicit/audited. |

Authenticated client derives one owner and immutable granted-scope version. Authorization is `owner resource policy ∩ client scope ∩ acting-for consent if any ∩ capability activation ∩ exact approval if required`; no operand may expand another.

### 16.6 Activation and exact approval

- Activation identity is the tuple of capability/version and explicit environment, cohort, geography, owner, category/profile version, mechanism, Work shape, lane/provider, and client dimensions. `NULL` means wildcard. Every current matching `disabled` record is an absolute deny and no narrower enable may override it. Only when zero denies match may at least one current matching enable authorize; the most specific enable (greatest number of bound dimensions, then latest effective time/ID) supplies attribution. Absence defaults deny for conditional/live-money effects.
- Effective ranges are UTC half-open `[effective_at, expires_at)`; one fingerprint cannot have overlapping current ranges. Supersession is lock-serialized, append-only, and every queued/adapter irreversible effect re-evaluates immediately before mutation.
- Disablement blocks new starts and irreversible forward effects but preserves reads, support, reconciliation, refund/reversal, evidence/holds, and safe completion/cancellation.
- Exact approval states are `pending → approved → consumed` or `expired|revoked`. Approval binds initiator, approver, client, command, normalized payload hash, targets/versions/scopes, amount/currency where relevant, policy, evidence/reason, expiry, and idempotency.
- Approval consumption and command effect are one transaction. Maker/checker policy rejects self-approval; emergency override has a distinct scope, alert, expiry, audit, and review.

### 16.7 Financial, provider, evidence, and webhook states

- One Obligation has one immutable lane. Each provider/payment/refund/reversal/release/correction event produces at most one idempotency-linked immutable financial transaction.
- Posting is rejected unless debits equal credits per currency and every entry currency equals both transaction and active account currency. Corrections link compensating transactions.
- Reconciliation compares Obligation/event, provider object/settlement, and ledger. Mismatch enters `reconciliation_required`, blocks protected release/payout, and resolves only through attributable evidence plus any compensating correction.
- Provider authenticity binds canonical raw bytes, algorithm/header, replay window, provider account/environment/object, owner, amount, currency, expected transition, and business-effect key. Unknown/mismatched results have no business effect.
- Evidence transitions `quarantined → validating → scanning → available|rejected`; hold may block deletion from any retained state. Retrieval re-authorizes purpose/aggregate participant/admin access and produces an audit event.
- Outbound webhook destination validation rejects private/loopback/link-local/reserved/metadata IPv4/IPv6 before and after DNS resolution and redirect; delivery pins the validated address and bounds TLS, ports, time, and response size.

### 16.8 Authorization matrix extension

| Action | Owner/human | Service principal / AI | Admin/operations |
|---|---|---|---|
| Create/update owned listing/capacity | Policy + expected version | Owner policy + explicit scope + activation | Governed support action with reason |
| Publish/submit or form Order | Explicit policy/acceptance | Absent by default; exact approval if separately enabled | Maker/checker where override allowed |
| Work/money/consent/dispute/evidence export | Actor-specific policy | Absent by default; never inferred from general consent | Narrow role + exact approval; maker/checker for configured high-risk actions |
| Credential/scope/activation change | Recent step-up may issue/rotate within current approved scopes, reduce scopes, or revoke immediately; scope expansion, environment change, and webhook-signing-secret change also require an independent Operations checker | Never self-authorized | Operations checker for elevated changes; live-money activation keeps its independent role quorum; emergency credential revocation cannot wait for a checker |
| Reconcile/correct/refund/release/payout | Authorized financial role | No default scope | Exact target/economics approval, mismatch/hold guards, separation of duties |

### 16.9 Extension acceptance gate

- PRD-060–076, canonical 58-table schema, ADR-R-030–040, architecture spine AD-1–29, UX-025–031, and owning epic stories use the same names, states, versions, ownership, and gates.
- Every transition has actor/client, authorization, source/target versions, event, transaction boundary, failure/no-effect behavior, recovery, and activation.
- PostgreSQL examples prove reservation, lineage, accepted-child, per-currency ledger, inbox-order, owner/client, approval-consumption, and active-dimension constraints before each implementation train starts.
