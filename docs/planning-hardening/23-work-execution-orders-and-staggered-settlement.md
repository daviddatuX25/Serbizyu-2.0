# Serbizyu 2.0 — Work Execution, Child Orders, and Staggered Settlement

**Document reference:** `docs/planning-hardening/23-work-execution-orders-and-staggered-settlement.md`  
**Status:** IMPLEMENTATION SPECIFICATION — canonical follow-on for the accepted Bid/Deal Chain seam  
**Date:** 2026-09-08  
**Scope:** Formation of independent child Orders from an accepted Bid/Deal Chain, execution facts and evidence, per-child payment authorization/capture, and the event/outbox protocol for merchant, courier, and technician handoffs.  
**Authority:** This document operationalizes the founder charter, the canonical domain/state contract, the architecture spine, and Documents 17–20. It does not authorize live connected money, legal escrow, a new composite listing, or a new parent Order.

> **Implementation boundary:** A database transaction can atomically form the local contract and all of its child records. A gateway authorization/capture, notification, or dispatch call is an external side effect and cannot be held open inside that transaction. Those effects use transactional outbox messages, stable effect identities, provider reconciliation, and explicit recovery states.

---

## 1. Decision summary

Serbizyu treats a multi-node bid as a plan until the requester accepts one exact version. Acceptance then produces ordinary bilateral agreements, one per billable Deal Need. The Deal Chain remains a coordination aggregate and a derived progress view; it is never a parent Order, wallet, escrow balance, or financial liability holder.

The following decisions are binding for this seam:

1. **The Need is the node identity.** A Need is one required outcome. A listing, provider, person, chat message, or visual card is not a node identity. Selecting the same listing twice creates two Need identities and, when accepted, two independent child Orders.
2. **No fake composite listings.** A merchant owns its listing. Delivery, installation, preparation, and other complementary work are separate Needs sourced from separate listings or quotes.
3. **Acceptance is the only contract-formation boundary.** Invitation acceptance, a bid, a quote, a standard catalog reference, or a chat message does not create an Order or Payment Obligation.
4. **Atomic child formation.** The accepted version, required source/capacity reservations, every required child Order, each immutable terms snapshot, Work Instance, primary Payment Obligation, audit record, idempotency result, and outbox intent are all committed together or none are committed.
5. **One-to-one money.** Every child Order has its own primary Payment Obligation, payment authorization identity, capture/release history, ledger transactions, disputes, and reconciliation. A displayed chain total is a read-only sum, never a settlement source.
6. **Readiness is not completion.** `ready_for_collection` is a Work fact that can satisfy a specifically named handoff condition. It does not complete the source Order, release money, or prove that custody transferred.
7. **Handoff is not payment authority.** A handoff event is evidence for the relevant Work and dependency contract. Payment eligibility is evaluated by the Obligation's snapshotted lane, due condition, evidence policy, holds, disputes, and reconciliation state.
8. **The graph only removes named blockers.** A dependency condition authorizes a named target action; it does not dispatch a provider, complete a Need, release money, or reassign liability.
9. **History is append-only.** A changed listing, failed provider, replacement Need, dispute, refund, correction, or late provider event creates new history. It never rewrites accepted terms, prior Work facts, or prior financial effects.
10. **Standard sourcing is quiet; custom terms are explicit.** A valid `STANDARD_AUTO_BIND` listing reference causes no speculative partner invitation, reservation, or notification. A custom price, scope, schedule, or payment arrangement requires explicit partner confirmation before requester acceptance.

The implementation must preserve the current separation between `orders`, `work_instances`, `payment_obligations`, `evidence_files`, `disputes`, `administrative_holds`, `deal_chains`, `deal_needs`, `deal_dependencies`, `outbox_messages`, and `inbox_messages`.

---

## 2. Domain vocabulary and aggregate boundaries

| Term | Meaning | Owns | Does not own |
|---|---|---|---|
| **Bid/proposal version** | One immutable, requester-facing commercial proposal containing one or more node terms and dependency intent. A later counteroffer creates a new version. | Proposed amounts, source version references, partner-confirmation state, validity, terms hash. | Orders, payment custody, completed Work. |
| **Deal Chain** | Coordination aggregate for one accepted plan and its directed dependency graph. | Chain status/version, Needs, Dependencies, acceptance lineage, derived progress. | A parent Order, pooled funds, a universal liability decision. |
| **Deal Need** | One required product/service outcome in the chain. | Required outcome, ordinal, role/kind, sourcing lineage, replacement lineage, Need status. | Mutable listing terms, another Need's Work, payment settlement. |
| **Deal Dependency** | Versioned edge stating which source fact blocks one named target transition. | Source/target Need, condition code/version, active/superseded state. | Automatic dispatch, completion, release, or liability assignment. |
| **Child Order** | One ordinary, accepted bilateral agreement formed for one Need. | Buyer/provider parties, accepted terms, Order lifecycle, references to Work and Obligations. | Sibling Orders, chain-wide cancellation or money. |
| **Work Instance** | Execution state for exactly one child Order, interpreted by an accepted Work shape contract (A1/A3/A4/A9). | Work lifecycle, checkpoint facts, completion proposal/signoff, Work evidence references. | Payment settlement, another Order's status. |
| **Work fact/checkpoint** | Append-only event such as `ready_for_collection` or `collected`. | Actor, time, evidence, payload, idempotency, source Work version. | The entire Work lifecycle or a legal conclusion. |
| **Payment Obligation** | One amount due for one child Order and one settlement purpose. | Lane, amount/currency, payer/recipient, due condition, payment events, release/capture history. | Pooled chain balance or automatic sibling remedies. |
| **Evidence File** | Quarantined/accepted file or structured proof reference subject to access and retention policy. | Ownership, type, hash, scan status, data class, retention. | Automatic completion or payment authority without a relevant policy. |
| **Public reference** | Human-facing identifier such as `ORD-101`, `BID-44`, or `CHAIN-7`. | Display/search identity. | Database identity or authorization boundary; UUIDs remain primary keys. |

### 2.1 Aggregate relationships

```text
Accepted Bid Version
        │ one exact source version
        ▼
Deal Chain (coordination only)
  ├── Deal Need 01 ──► Child Order ORD-101 ──► Work Instance ──► Obligation 01
  ├── Deal Need 02 ──► Child Order ORD-102 ──► Work Instance ──► Obligation 02
  └── Deal Need 03 ──► Child Order ORD-103 ──► Work Instance ──► Obligation 03
        ╲           versioned dependency edges           ╱
         └── readiness/custody facts gate named transitions
```

There is no `parent_order_id`, `package_payment`, `deal_chain_wallet`, or chain-level escrow balance in this design. A chain projection may show `₱480.00` as the sum of three PHP child amounts, but that value is recomputed from authorized child records and cannot be sent to a payment adapter.

---

## 3. Reference three-node formation

The following example is normative for cardinality and isolation, not a fixed product catalog.

| Ordinal | Deal Need / role | Responsible provider | Customer amount | Public child Order | Primary Work shape | Primary settlement fact |
|---:|---|---|---:|---|---|---|
| 1 | Prepare and supply the accepted item | Merchant A | PHP 180.00 | `ORD-101` | A4 handoff/product | verified `collected` under the accepted A4 terms |
| 2 | Transport the item to the destination | Courier B | PHP 60.00 | `ORD-102` | A4 handoff/transport | verified `work_completed`/receipt under courier terms |
| 3 | Install or perform the downstream service | Technician C | PHP 240.00 | `ORD-103` | A1/A3 as accepted | verified `work_completed` plus required signoff |

Dependencies are explicit, for example:

```text
Need 01 --[source fact: ready_for_collection; target action: authorize courier collection]--> Need 02
Need 02 --[source fact: delivered_to_site; target action: authorize technician start]--> Need 03
```

`Need 01.ready_for_collection` may authorize a courier to attempt collection while the merchant Order remains non-terminal. It does not authorize capture by itself. `Need 01.collected` records the custody transfer; it may complete the merchant's A4 Work and make its Obligation eligible only when the accepted merchant terms say that verified custody is the completion/due condition.

A re-entrant provider is represented by separate Needs and separate Orders. For example, a technician who dismantles before transport and reinstalls afterward owns `ORD-101` and `ORD-103`, not one Order that is both completed and in progress.

---

## 4. Acceptance preconditions

The formation command is allowed only for an exact, current Bid/Deal Chain version. The command must fail without side effects if any precondition is false.

### 4.1 Bid and partner gates

1. The requester is authenticated, owns the Request or has current scoped acting-for authority, and is authorized to accept the selected version.
2. The selected Bid/proposal version is current, not withdrawn, superseded, expired, or already locked into a contract.
3. Every mandatory node has one responsible provider, one immutable source reference or an accepted provider quote, one positive quantity, one amount/currency, and one supported Work shape.
4. A standard catalog reference is allowed only when the referenced listing version is published, its owner enabled chain participation, its policy is `STANDARD_AUTO_BIND`, its price/quantity/unit/schedule/fulfillment terms match the proposed snapshot, and its pre-authorization has not expired.
5. A custom term (discount, changed scope, changed hours, changed quantity, changed payment timing, or changed fulfillment obligation) is allowed only after the exact partner invitation is `accepted`. `pending`, `countered`, `declined`, `expired`, or `revoked` blocks requester acceptance.
6. Invitation acceptance remains sourcing consent. It does not create an Order. Final requester acceptance plus final validation plus this formation command creates the Order.
7. No notification or reservation is sent to a standard-reference partner during speculative bidding. The provider notification and capacity reservation occur only as part of final formation.

### 4.2 Graph and source gates

1. All Needs and active Dependencies belong to the same Deal Chain.
2. Need endpoints are distinct and the graph is acyclic under the chain lock.
3. Every active required inbound condition for a target action names a source fact, condition version, target transition, evidence rule, and stale/revocation behavior.
4. A failed, cancelled, or superseded Need is not a satisfied dependency. A replacement Need must be explicitly wired as the new source and must preserve old history.
5. Every listing/quote/policy/capability version referenced by a node is still eligible. A mutable current listing row is never used as the accepted terms source.
6. Provider account status, category/profile activation, geography, Work shape, lane activation, and safety/access gates are current.
7. Capacity/stock/slot reservations are held or atomically reservable for the exact immutable source version. A plan estimate cannot override unavailable capacity.
8. The chain has no already accepted active child Order for a Need. The existing partial uniqueness guard and an application compare-and-set both enforce this.

### 4.3 Payment and execution gates

1. Each child has one immutable `due_condition_code` and lane/policy snapshot. The condition is executable only through the versioned condition catalog; free text is not policy.
2. Connected Direct Digital and Tiwala Protected Digital are sandbox-only until the independent G6/live-money gates close. Sandbox success must never be shown as live-money protection.
3. External Cash and External Digital Proof may be selected only with their declaration/evidence/disclaimer behavior. They do not create a Serbizyu custody promise or automatic payout.
4. If checkout authorization is required before any execution, formation creates accepted child Orders but the chain cannot begin executable Work until every required child authorization is independently verified. A failed authorization does not roll back an already committed contract; it places execution behind a payment gate and provides reauthorization/recovery.

---

## 5. Atomic acceptance and child-order formation

### 5.1 Command contract

Use one application seam, for example `AcceptBidAndFormDealChain`, with this minimum input:

```text
request_id
bid_id / proposal_id
bid_version_id and expected bid lock_version
chain_id and expected chain version
requester actor and optional acting-for consent
selected optional-node/alternative choices (already resolved in the version)
selected payment lanes/configuration per child
expected source/listing/capacity versions
idempotency_key
correlation_id
```

The command must be idempotent within the requester/command/chain scope. A replay with the same key and identical normalized request returns the original result. Reuse with different semantic input is rejected. A different idempotency key cannot create a second active child for the same Need.

### 5.2 Transaction protocol

The transaction uses PostgreSQL row locks or equivalent compare-and-set guards. Locks are acquired in one documented order for every caller; no network call is made while locks are held.

```text
BEGIN
  1. Reserve/check command idempotency key.
  2. Lock Request (if present), then Bid/Proposal lineage and selected version.
  3. Lock Deal Chain and read its current version/status.
  4. Lock all selected Needs and active Dependencies in deterministic ordinal/UUID order.
  5. Revalidate graph, versions, invitations, policy, authority, and alternatives.
  6. Lock all source listing versions/capacity buckets in deterministic order.
  7. Commit/attach each exact capacity reservation.
  8. For each selected billable Need in ordinal order:
       a. insert one accepted child Order;
       b. insert active buyer/provider parties;
       c. insert immutable terms snapshot version 1;
       d. insert exactly one required Work Instance;
       e. insert one primary Payment Obligation.
  9. Move each formed Need to `in_progress` (or the exact canonical formation state)
     and lock the accepted Bid version.
 10. Record chain acceptance/finalization metadata and set the chain's next version.
 11. Record audit events and all child/chain outbox intents.
 12. Store the successful idempotency response.
COMMIT
```

Any failure at steps 2–12 rolls back the entire local transaction: no accepted child, terms snapshot, Work Instance, Obligation, committed capacity, chain state, audit, or outbox row survives. External provider calls occur after commit and are tied to the persisted effect identity.

### 5.3 Formation result

For the reference chain, one successful result contains:

```text
Deal Chain: CHAIN-001, accepted bid version BID-001/V4, expected_child_count = 3
ORD-101: buyer ↔ Merchant A, amount PHP 18000, Work W-101, Obligation P-101
ORD-102: buyer ↔ Courier B, amount PHP 6000,  Work W-102, Obligation P-102
ORD-103: buyer ↔ Technician C, amount PHP 24000, Work W-103, Obligation P-103
```

The Orders are `accepted`; their Work Instances begin at `not_started`; Obligations are `created`/`due` according to the selected lane. They are not completed, paid out, or dispatched by formation. The chain remains blocked from executable dispatch until its checkout and dependency gates permit execution. Parent progress and displayed totals are projections of these child records.

### 5.4 Completion of the acceptance command

The command emits, within the same transaction, at least:

- `deal_chain.accepted`;
- one `order.accepted` per child;
- one `work.created` per child;
- one `payment_obligation.created` per child;
- `deal_chain.checkout_authorization_required` when a connected lane requires checkout authorization.

The outbox is a durable intent. A worker publishes it after commit. A notification or dispatch worker must not infer success from a missing/failed publish attempt.

---

## 6. Data and schema contract

The existing migrations provide the base tables. The following fields and relational rules close the formation/execution gap without adding a parent Order or pooled account.

### 6.1 Deal Chain and Need

`deal_chains` retains coordination fields and should additionally expose or derive:

```text
accepted_bid_id / accepted_proposal_id       nullable until finalization
accepted_bid_version_id                      nullable until finalization
accepted_terms_hash                          nullable until finalization
accepted_by_user_id                          nullable until finalization
accepted_at                                  nullable until finalization
expected_child_count                         nullable until finalization
formed_child_count                           derived/checked
finalized_at                                 nullable until finalization
```

If a separate acceptance table is introduced, it is an append-only acceptance record, not a financial or Order parent. Existing `audit_events` and `outbox_messages` remain the authority for attribution and event delivery.

`deal_needs` retains the Need identity and replacement lineage and should carry or resolve:

```text
source_listing_id
source_listing_version_id
source_quote_id / quote_version
responsible_provider_user_id
role_code                                  -- prepare, supply, transport, install, etc.
customer_amount_minor
provider_payout_amount_minor
currency
terms_hash
work_shape / shape_contract_version
payment_due_condition_code
payment_due_condition_version
required boolean
```

A Need's sourcing reference is immutable once its child Order is accepted. A listing edit creates a new version or an explicit amendment/replacement; it never mutates the Order's source.

`deal_dependencies` must retain the existing same-chain FKs and active-edge uniqueness and add/resolve the executable condition contract:

```text
condition_code                  stable identifier, not executable by itself
condition_version               positive immutable registry version
source_fact_code                e.g. work.ready_for_collection
source_work_shape               e.g. A4
blocks_transition               the exact target action/transition
required_evidence_policy       immutable policy/version reference
revocation_behavior             block | pause | require_reconfirmation
```

The condition registry may be a versioned application policy during the pilot, but every accepted Dependency stores the exact version. Unsupported or unknown conditions refuse activation; arbitrary text must never authorize a handoff.

### 6.2 Orders, parties, and immutable terms

`orders` uses the existing UUID primary key and `origin = 'deal_chain'` plus the same `deal_chain_id` and `deal_need_id`. Add a unique human `public_reference` if one does not already exist. `ORD-101` is a display identity, not the UUID and not a substitute for the existing active `(deal_need_id)` uniqueness guard.

Each accepted child has:

- exactly one active buyer party and one provider party, with scoped responsibility;
- a same-Order `order_terms_snapshots` version 1;
- exactly one required Work Instance for the accepted Work shape;
- one primary Obligation for the accepted customer amount, with later adjustments represented separately;
- a source lineage that proves the Need, Request/Quote, listing version, and provider are consistent.

The immutable terms snapshot must include or reference:

```json
{
  "terms_snapshot_version": 1,
  "deal_chain_id": "CHAIN-001",
  "deal_need_id": "NEED-001",
  "source": {
    "listing_id": "LST-001",
    "listing_version_id": "LST-001/V7",
    "quote_id": null,
    "bid_version_id": "BID-001/V4"
  },
  "buyer_user_id": "USR-BUYER",
  "provider_user_id": "USR-MERCHANT",
  "role_code": "prepare_and_supply",
  "work": {
    "shape_code": "A4",
    "shape_contract_version": 1,
    "payload_schema_version": 1,
    "scope": {"quantity": 1, "unit": "tray"},
    "schedule_constraints": {"earliest_ready_at": "...", "latest_ready_at": "..."}
  },
  "fulfillment": {
    "origin": "Market Stall 4",
    "destination": "handoff_to_next_need",
    "handoff_instructions": "..."
  },
  "commercial": {
    "customer_amount_minor": 18000,
    "provider_payout_amount_minor": 18000,
    "discount_amount_minor": 0,
    "discount_funder": null,
    "currency": "PHP"
  },
  "payment": {
    "lane": "tiwala_protected_digital",
    "policy_version_id": "POLICY/V3",
    "due_condition_code": "A4.CUSTODY_VERIFIED",
    "due_condition_version": 1
  },
  "cancellation_rules": {"policy_version_id": "..."},
  "review_rules": {"eligible_after": "work_completed"},
  "terms_hash": "sha256:..."
}
```

The example is illustrative. The persisted schema keeps critical relational fields in columns and uses versioned JSON only for bounded shape/terms payloads. The terms hash covers a canonical serialization, including the exact source versions, amounts, lane, due condition, schedule, location, evidence policy, and provider/buyer identities. `order_terms_snapshots` is append-only; accepted snapshot version 1 cannot be updated in place.

### 6.3 Work and evidence

The current `work_instances` and `work_events` tables remain the Work kernel:

- `work_instances.status` remains the common lifecycle (`not_started`, `scheduled`, `in_progress`, `completion_proposed`, `awaiting_signoff`, `completed`, `disputed`, `cancel_requested`, `cancelled`, `failed`).
- The requested operational facts are `work_events.event_type` values and payloads, not new Order statuses. Do not set `new_status = 'ready_for_collection'`; retain the common Work status and record the fact in the event.
- `work_instances.structure` is the accepted shape payload. It is versioned and immutable as accepted terms; a change requires an event or an approved amendment.
- `work_events` is append-only, idempotent per Work Instance/command key, actor-attributed, linked to accepted evidence, and emitted through the outbox in the same transaction as the state/fact mutation.

### 6.4 Payment and accounting

`payment_obligations` remains the source for one child amount, lane, payer, recipient, due condition, policy version, and Work linkage. Enforce:

```text
payment_obligation.order_id = one accepted child Order
payment_obligation.work_instance_id is null or belongs to that same Order
one primary obligation per child Order and settlement purpose
obligation.currency = terms currency
obligation.amount_minor = snapshotted customer amount (unless an explicit amendment creates a new obligation)
```

For connected lanes, maintain an append-only authorization/capture projection or equivalent fields on the obligation, with at least:

```text
authorization_state                    not_requested | pending | authorized | expired | voided | unknown
authorized_amount_minor                non-negative, per obligation
authorization_reference                provider-neutral external identity
authorization_expires_at               provider-supplied expiry
captured_amount_minor                  non-negative, <= authorized unless approved overcapture policy
capture_reference(s)                   immutable provider event identities
last_reconciled_provider_event_id      provider event lineage
```

The projection is not a replacement for `payment_events`, `provider_events`, `financial_transactions`, or `financial_entries`. Every provider effect has one stable effect identity and one balanced ledger transaction once confirmed. Corrections are compensating transactions linked to the source; no financial row is rewritten.

A child may have additional explicitly approved adjustment/refund/reimbursement Obligations, but those are separate rows with their own purpose, terms, authorization, and history. They do not turn the chain into a pooled account.

### 6.5 Outbox/inbox and event ordering

The existing outbox must preserve, directly or through a versioned envelope:

```text
event_id
source aggregate_type / aggregate_id / aggregate_version / aggregate_sequence
event_contract_version / payload_contract_version
causation_event_id
correlation_id
actor/client/acting-for context
payload hash and payload
```

The existing `inbox_messages` rules apply: one consumer/event identity, one aggregate sequence, `received → processing → processed`, gap parking, unsupported-version parking, and dead-letter recovery. A correlation ID is for tracing; it is not deduplication.

---

## 7. Work execution pipeline

### 7.1 Two layers, no state leakage

**Macro layer — Deal Chain:** evaluates dependencies, records which source facts satisfy which target actions, and emits handoff intents. It never writes another provider's Work as completed and never calls a payment adapter directly.

**Micro layer — one child Work Instance:** records the provider's execution phases, evidence, custody facts, completion proposal, and signoff under one accepted Order. Internal steps such as `design → print → pack` stay inside that Work Instance. They do not create extra Needs unless a separately accepted external service is required.

### 7.2 Phase and fact model

| Phase/fact | Authorized actor(s) | Required evidence | Work/Order meaning | Allowed downstream effect |
|---|---|---|---|---|
| `work_started` | Provider/authorized Agent under current consent | Start attestation; shape-specific context | Work may move to `in_progress`; Order remains `accepted` | Enables internal progress; no payment capture. |
| `ready_for_collection` | Merchant/provider responsible for preparation | Accepted packaging/readiness evidence; quantity/location; actor/time | Readiness fact only. Work remains non-terminal; Order is not complete. | May satisfy a dependency that specifically authorizes a courier collection attempt. |
| `collected` | Courier plus merchant/authorized receiver, or the exact A4 dual-attestation policy | Handoff actors, quantity/identity/condition, timestamp, evidence; mismatch if any | Records custody transfer. It may complete the source A4 Work only if its terms define custody as completion. | May satisfy a custody dependency; may make merchant Obligation eligible if the snapshotted due condition and release guards pass. |
| `in_transit` | Courier/provider | Dispatch/route/custody evidence as required by shape/policy | Courier Work remains active; source Work does not regress or become re-opened. | Updates authorized projections/notifications; does not settle by itself. |
| `work_completed` | Provider proposes; authorized buyer/reviewer/system policy confirms | Shape-specific completion evidence and signoff/review where required | Work can move through `completion_proposed`/`awaiting_signoff` to `completed`; Order closure remains separate. | May make the linked Obligation eligible after holds, disputes, reconciliation, and policy checks. |

A fact is valid only when its actor, accepted Work shape, current Work version, evidence references, and timing satisfy the command guard. A stale or withdrawn readiness fact cannot satisfy a newer dependency version. The event remains in history, but the dependency evaluator must recheck whether it is currently effective.

### 7.3 Normative three-node execution sequence

1. **Merchant preparation:** Merchant starts its A4 Work and records `work_started`.
2. **Merchant readiness:** Merchant records `ready_for_collection` with accepted evidence. The chain consumer evaluates the edge to Courier B. If the edge is current and all target guards pass, it emits `handoff.collection_authorized`; it does not mark the merchant Order complete or capture its Obligation.
3. **Courier collection:** Courier accepts/starts the accepted child Order, verifies the relevant package/quantity/condition, and records `collected`. A mismatch records the fact and mismatch evidence; it does not erase the physical handoff or invent customer acceptance. If the merchant's accepted A4 terms define verified custody as completion, the merchant Work can complete through its normal completion guard and its Obligation can become settlement-eligible.
4. **Courier transit:** Courier records `in_transit`. The source merchant Work stays terminal/non-terminal according to its own contract; no sibling state is rewritten.
5. **Delivery/site handoff:** Courier records the accepted delivery/site-arrival fact. The chain consumer evaluates whether this satisfies the edge to Technician C. It emits `handoff.technician_start_authorized` only when the technician Order, availability, safety, capacity, and payment gates are current.
6. **Technician work:** Technician records `work_started`, then proposes `work_completed` with shape-specific evidence. Buyer/authorized reviewer signs off when required. Only then can Technician C's Work become `completed` and its Obligation enter the protected release/capture decision.
7. **Chain closure:** The chain closes only when every required Need is completed or explicitly resolved under the canonical closure rules. A readiness fact, one completed sibling, or payment confirmation cannot close the chain.

### 7.4 Evidence contract

Each Work fact must carry:

```text
work_instance_id
order_id / deal_need_id / deal_chain_id
fact_code and event contract version
previous Work status and resulting Work status (if changed)
actor_user_id, acting_for_user_id, client/adapter identity and current consent
occurred_at and effective_at
accepted Work/terms/graph versions
idempotency key, causation event ID, correlation ID
quantity/identity/condition/location payload appropriate to the shape
zero or more evidence_file_id references and evidence purpose
```

Evidence files must pass the existing scan/quarantine/visibility/retention rules. A packaging photo, GPS value, QR/OTP, signature, or provider webhook is evidence of a stated fact only; none is a universal legal conclusion. Evidence acceptance does not automatically complete Work or confirm payment.

For custody facts, the minimum evidence policy should distinguish:

- the merchant's readiness/packing assertion;
- the courier's collection attempt and acceptance/rejection;
- the receiver/courier custody acknowledgment;
- item/quantity/condition mismatch;
- final recipient/site receipt or technician signoff.

Missing evidence makes the fact unverified or disputed according to policy. It does not manufacture a universal liability split or automatic 50/50 remedy.

---

## 8. Multi-party handoff DAG

### 8.1 Dependency condition contract

Each active edge is a versioned rule with this shape:

```text
Condition C-001/V1
  source aggregate: Work Instance W-101
  source fact:      A4.ready_for_collection
  target aggregate: Child Order ORD-102 / Work W-102
  target action:     authorize_collection_attempt
  evidence policy:   A4.readiness.v1
  all-of semantics:  all active required conditions for this action
  revocation:        block future collection authorization; retain history
```

A condition evaluator must:

1. lock or compare-and-set the chain/dependency version and re-read authoritative source facts;
2. verify all active required inbound conditions for the named target action;
3. reject failed, cancelled, superseded, stale, or unsupported source facts;
4. verify target Order acceptance, provider authority, capacity/schedule, safety holds, and current capability activation;
5. record a satisfaction decision with the exact edge and source event IDs;
6. emit an outbox intent for the target action only after the decision commits.

A green projection or previously delivered notification is not authorization. If a graph edit races with a start/dispatch command, the command must validate the graph version and source facts in the same consistency boundary as its mutation. The losing stale command returns a version conflict or is parked for re-evaluation.

### 8.2 Fan-in and replacement

For `[Need A + Need B] → Need C`, the target action remains blocked until every active required condition is satisfied. One successful input plus one failed/cancelled input is not fan-in satisfaction. If B is replaced:

1. preserve B, its Order, Work, evidence, and payment history;
2. create replacement Need B2 with `replaces_deal_need_id = B` in the same chain;
3. supersede only the obsolete B edge and add a versioned B2 edge;
4. re-evaluate C under the new graph version;
5. do not silently waive B or cancel/refund sibling A.

### 8.3 Conditional outcomes

Diagnosis may produce evidence, but it does not silently execute both branches. An authorized decision selects one path, records the disposition of alternatives, and forms any new paid Need through a new acceptance/amendment command. Until branch selection is explicit, downstream actions remain blocked.

---

## 9. Staggered settlement protocol

### 9.1 Money model

The buyer-facing total is a derived display:

```text
chain_display_total(currency) = Σ accepted child Order customer_amount_minor
```

It is never posted, authorized, captured, refunded, or paid out as one chain amount. For the reference chain, there are three obligations:

```text
P-101: ORD-101 / Merchant A / PHP 18000 / one lane / one auth identity
P-102: ORD-102 / Courier B  / PHP  6000 / one lane / one auth identity
P-103: ORD-103 / Technician C / PHP 24000 / one lane / one auth identity
```

A payout or release for P-101 cannot cancel, reverse, or withhold P-102/P-103 merely because they share a chain. Any cross-child financial remedy needs an explicit dispute/adjustment decision that references each affected Obligation.

### 9.2 Checkout authorization: one authorization per obligation

Checkout is a payment authorization phase after local contract formation (or a coordinated UI flow that calls the formation command before presenting success). It must:

1. lock each Obligation in deterministic UUID order and verify it is still `created`/`due`, current, and not held/disputed/cancelled;
2. verify the lane/policy/activation and the exact amount/currency from the terms snapshot;
3. create one provider-neutral authorization intent per connected child Obligation, with effect key `obligation:{id}:authorize:{terms_snapshot_version}`;
4. persist the request/outbox intent without calling the provider inside the database transaction;
5. send the provider request with the same stable idempotency identity;
6. ingest and authenticate the provider response/webhook into `provider_events` and `payment_events`;
7. reconcile amount, currency, buyer/payment instrument scope, provider account/environment, and obligation identity before marking that authorization verified;
8. allow execution/dispatch only when every required child authorization has a verified independent result, unless the accepted contract explicitly supports a different lane and recovery rule.

The platform must not create one package-level PaymentIntent and then treat its amount as a pooled balance. If a provider offers multicapture, it is an adapter optimization only when every capture is still mapped to one independently identified Obligation and the provider contract preserves independent reconciliation. The default and safest implementation is one authorization object per Obligation.

Authorization is not capture, payout, Work completion, or customer acceptance. It is a provider-side hold/permission whose expiry and method limitations remain external. The provider-neutral domain must not expose provider status names as its business contract.

### 9.3 Eligibility and capture/release

When a Work fact is recorded, the settlement consumer evaluates the linked Obligation in a short transaction:

```text
BEGIN
  lock Obligation, Work Instance, relevant Order/hold/dispute rows
  verify current terms and due-condition code/version
  verify the required authoritative Work fact and evidence
  verify no active dispute or relevant fraud/safety/legal/admin hold
  verify amount/currency and provider authorization reconcile
  verify no prior capture/release effect exists
  transition to `eligible_for_release` (or lane-equivalent eligibility projection)
  append payment eligibility event and audit
  enqueue one capture/release outbox effect with stable effect identity
COMMIT
```

The provider call is then made outside the transaction. A successful request or webhook is reconciled by the same effect identity; a timeout is `unknown` and triggers query/reconciliation, never a blind second capture. Once provider confirmation and balanced ledger posting exist, append the corresponding `released`/`paid_out` or lane-specific payment event. Capture of the buyer charge and payout/release to a provider are separate facts and may have separate provider/ledger effects.

### 9.4 Node-level capture examples

The accepted `payment_due_condition_code` controls when an Obligation can become eligible. Example policy for the reference chain:

| Obligation | Eligible after | Required proof | Not sufficient |
|---|---|---|---|
| Merchant P-101 | `A4.CUSTODY_VERIFIED` | Accepted `collected` fact, required dual/authorized handoff evidence, no mismatch/hold, terms say merchant Work is complete at custody | Merchant's `ready_for_collection` assertion alone; courier dispatch notification. |
| Courier P-102 | `A4.DELIVERY_VERIFIED` | Courier `work_completed`, recipient/site receipt or accepted review path, no dispute/hold, provider reconciliation | `in_transit`; a route ping; merchant settlement. |
| Technician P-103 | `A1/A3.WORK_COMPLETED` | Completion evidence plus required buyer/reviewer signoff or valid review-window policy | `work_started`; a completion proposal without required signoff. |

This is staggered settlement without pooled escrow: each provider's charge/release decision is made against its own Work and Obligation. A downstream failure does not roll back a previously settled upstream Obligation. A dispute can still open against a settled Obligation and produce a separately approved refund/reversal/adjustment; settlement is not immunity from review.
A contract may define a preparation-only Obligation whose due condition is an independently verified readiness fact. That exception must be explicit in the immutable terms/policy snapshot, require the shape's authorized evidence and hold/dispute checks, and must not change the Work/Order completion state. The protected Tiwala lane still uses the canonical completion/signoff guards; `ready_for_collection` alone is not a protected release trigger. This keeps “verified readiness” useful for a priced preparation milestone without treating every readiness assertion as payment authority.


### 9.5 Lane behavior

| Lane | Checkout authorization | Eligibility/capture | Platform custody/promise |
|---|---|---|---|
| `external_cash` | None. Record the selected lane and obligation. | Declaration/acknowledgment is evidence only; no automated connected capture or provider payout. | No Serbizyu cash custody or automatic reimbursement. |
| `external_digital_proof` | None unless an approved adapter exists. | Screenshot/reference is a declaration; trusted verification is required for `provider_verified`; disputes remain possible. | No protected custody promise. |
| `direct_digital` | Per-Obligation authorization only in approved sandbox/pilot gates. | Provider-verified capture/reconciliation per child; no automatic Work completion. | Sandbox-only until G6; no production guarantee here. |
| `tiwala_protected_digital` | Per-Obligation authorization only in approved sandbox/pilot gates. | Protected release requires authorized Work completion/signoff/review eligibility, no relevant holds/dispute, reconciled amount, and a concurrency-safe release effect. | Never called legal escrow; live use is separately gated. |

### 9.6 Authorization expiry and partial outcomes

Authorization validity is provider/method-specific. For example, Stripe documents that manual capture separates authorization and capture, that authorizations expire, and that payment methods differ in support and capture windows ([Stripe manual capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)). Stripe also documents that multicapture is only available for certain payment methods/eligibility combinations ([Stripe multicapture](https://docs.stripe.com/payments/multicapture)). These facts are adapter constraints, not Serbizyu policy.

If an authorization expires before the Obligation's due condition:

1. record `authorization_expired` and the provider reference;
2. keep the Obligation and child Order immutable;
3. stop new irreversible Work dispatch for that child and any target action that requires paid authorization;
4. query/reconcile the provider before deciding whether money moved;
5. request a new explicit authorization against the same or an amended accepted Obligation only through an idempotent reauthorization command;
6. never silently increase, decrease, or pool the amount.

A partial capture is a deliberate approved adjustment, not a rewrite of the original amount. The captured amount, released remainder, reason, approval, and provider events are all recorded. If a provider supports only one capture for an authorization, a second node must not attempt to reuse it; the model's separate per-Obligation authorization prevents that coupling.

---

## 10. Event bus and transactional outbox protocol

### 10.1 End-to-end flow

```mermaid
sequenceDiagram
    actor Buyer
    participant API as Application command seam
    participant DB as PostgreSQL
    participant O as Outbox
    participant C as Deal coordinator
    participant M as Merchant Work
    participant R as Courier Work
    participant T as Technician Work
    participant Pay as Payment adapter

    Buyer->>API: Accept exact Bid/Deal Chain version
    API->>DB: Atomic chain + ORD-101/102/103 + Work + Obligations
    DB-->>O: accepted/order/work/obligation outbox intents
    Buyer->>API: Checkout authorization
    API->>O: one authorization effect per Obligation
    O->>Pay: authorize P-101, P-102, P-103 independently
    Pay-->>O: provider events; reconcile per obligation
    O->>C: all required payment gates verified
    C->>M: merchant Work may begin
    M->>DB: work_started, ready_for_collection (+ evidence)
    DB-->>O: Work fact + dependency evaluation intent
    O->>C: collection condition satisfied
    C->>R: collection action authorized
    R->>DB: collected, in_transit (+ evidence)
    DB-->>O: custody/delivery condition intent
    O->>C: technician start condition satisfied
    C->>T: technician start action authorized
    T->>DB: work_started, work_completed/signoff
    DB-->>O: per-node settlement eligibility
    O->>Pay: capture/release only the eligible child Obligation
```

### 10.2 Event catalog

| Event | Aggregate | Produced when | Consumers/effects |
|---|---|---|---|
| `deal_chain.accepted` | Deal Chain | Atomic formation commits | Chain projection, participant notifications, operations. |
| `order.accepted` | Child Order | One child row and terms snapshot commit | Buyer/provider views; no payment by itself. |
| `work.created` | Work Instance | Child formation commits | Work projection; no start or completion. |
| `payment_obligation.created` | Obligation | Child formation commits | Checkout coordinator; no charge. |
| `payment.authorization.requested` | Obligation | Checkout gate commits effect identity | Payment adapter job. |
| `payment.authorization.verified` | Obligation | Authenticated provider result reconciles | Execution gate; no capture. |
| `work.started` | Work Instance | Authorized provider start commits | Work projection, notifications. |
| `work.ready_for_collection` | Work Instance | Merchant readiness fact commits | Dependency evaluator; optional payment candidate only if an explicit due condition says so (default: no). |
| `handoff.collection_authorized` | Dependency/chain | Condition evaluation commits | Courier UI/dispatch adapter; not proof of collection. |
| `work.collected` | Work Instance | Custody fact commits | Source/target Work projections; possible source settlement eligibility per terms. |
| `work.in_transit` | Work Instance | Courier transit fact commits | Tracking/notifications; no automatic settlement. |
| `handoff.technician_start_authorized` | Dependency/chain | Delivery/site condition commits | Technician start gate. |
| `work.completed` | Work Instance | Completion guard/signoff commits | Need closure, settlement eligibility consumer. |
| `payment.capture.eligible` | Obligation | Atomic release decision commits | Capture job; no provider call in transaction. |
| `payment.capture.requested` | Obligation | Capture effect is claimed | Provider adapter with stable key. |
| `payment.capture.confirmed` | Obligation | Provider event reconciles | Ledger posting/release projection. |
| `payment.reconciliation_required` | Obligation | Unknown/mismatched provider result | Operations queue; blocks irreversible release/capture retry. |
| `deal_need.replacement_needed` | Need | Explicit failure/recovery command commits | Replacement sourcing; preserves old history. |

Event names are versioned contracts. A consumer must use the source aggregate sequence, not wall-clock order, and must park a gap or unsupported payload rather than applying a stale projection.

### 10.3 Consumer responsibilities

- **Deal coordinator consumer:** consumes Work facts; evaluates only active, versioned Dependencies; locks/rechecks source and target; records a satisfaction decision; emits the named target action.
- **Work action consumer:** checks target Order authority, provider capacity, safety/administrative holds, and payment gate immediately before a start/dispatch mutation. It may notify a provider or call an approved dispatch adapter, but notification is never proof of action.
- **Settlement consumer:** consumes authoritative Work completion/custody facts; locks the relevant Obligation; evaluates the lane/due condition/holds/disputes/reconciliation; emits one capture/release effect per Obligation.
- **Payment adapter consumer:** sends the external request outside the DB transaction with stable idempotency/effect identity; stores the provider response/webhook and never invents success from a timeout.
- **Notification consumer:** sends only participant-authorized fields. A courier may see the handoff data required for its child, not another provider's private payment/evidence details.
- **Operations/reconciliation consumer:** retries safe delivery, parks unsupported/gap messages, reconciles unknown provider effects, and exposes dead-letter/hold/recovery work to authorized operations staff.

### 10.4 Exactly-once business effects

The system provides at-least-once delivery with exactly-once business effects through:

- command idempotency scoped to actor/command/target/semantic key;
- database uniqueness for one active child per Need and one primary Obligation per child;
- append-only event IDs and consumer inbox records;
- provider effect identities and provider-event uniqueness;
- aggregate sequence ordering and gap parking;
- compare-and-set/row locks for completion, release, capture, refund, and replacement races;
- outbox intent written in the same transaction as the state change it announces.

A shared `correlation_id` alone is never used to deduplicate dispatch, payment, or Work effects.

---

## 11. Failure, dispute, and recovery rules

| Failure/race | Required result |
|---|---|
| One source listing/capacity check fails during acceptance | Roll back all child Orders, snapshots, Work, Obligations, reservations, audit/outbox formation rows; return a stable version/capacity conflict. |
| Two users accept the same Request/Bid concurrently | Request/lineage lock and unique contract/active-child guards allow one; the loser sees a conflict with no partial children. PostgreSQL row locks block conflicting writers until transaction end; all callers use the same lock order ([PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)). |
| Same Need formed with two idempotency keys | Partial unique active-child guard rejects the second; no duplicate Obligation. |
| Standard auto-bind listing changes after proposal | Revalidate the exact quoted listing version. Honor it only while valid; otherwise return an explicit stale/unavailable conflict. Never silently substitute a new price/provider. |
| Custom partner invitation is pending/changed | Requester acceptance is blocked; partner consent must be renewed for the exact new terms. |
| Merchant marks `ready_for_collection` but item is missing | Retain readiness assertion and evidence; collection attempt records mismatch/no custody. Do not complete merchant Work or capture solely from readiness. |
| Courier collects wrong/damaged item | Record actual `collected`/mismatch facts and evidence. Do not erase custody history or infer acceptance; route the affected child through the mismatch/dispute policy. |
| Courier fails after merchant custody settlement | Merchant child history/settlement remains. Courier child is independently failed/disputed/replaced/refunded under its own terms; no sibling rollback. |
| Required input fails in a fan-in | Target remains blocked. A failure is not satisfaction. Replacement is a new Need/edge with preserved lineage. |
| Work fact arrives after a graph edit | Consumer rechecks chain/dependency version and source fact validity; stale fact cannot satisfy the replaced edge. |
| Payment provider times out after auth/capture request | Store unknown effect identity; query/reconcile using the same provider reference/key. Do not retry blindly. |
| Authorization expires before completion | Record expiry, stop affected irreversible action, reconcile, and request explicit reauthorization/amendment. Do not reuse a different Obligation or pooled amount. |
| Capture succeeds, then dispute opens | Keep the capture/ledger history; open the relevant dispute/hold and process a separate refund/reversal/adjustment if authorized. Settlement does not erase remedies. |
| Admin/safety/legal/fraud hold appears | Block affected start, completion, and protected release according to hold scope; preserve unrelated child Work and payment history. |
| Chain cancellation is requested | Record an impact plan; execute explicit child cancellation/obligation actions where policy permits. Never cascade cancellation/refund/release silently. |
| Same provider returns later in the DAG | Use separate Need/Order/Work identities. Provider identity repetition is not a graph cycle. |
| Coordinator consent is revoked before queued work executes | Recheck authority at execution; refuse new unauthorized commands while preserving accepted agreements and attribution. |
| Duplicate or out-of-order outbox event | Inbox records duplicate/gap; no repeated dispatch/capture and no projection regression. |

---

## 12. Application command surfaces

All commands use the shared command envelope: actor/client/acting-for context, target, expected version, correlation ID, idempotency key, capability activation, authorization, audit, and transactional outbox.

| Command | Guard | Effect |
|---|---|---|
| `AcceptBidAndFormDealChain` | Exact current version, partner/capacity/graph gates, requester authority | Atomic accepted chain, independent child Orders, snapshots, Work, Obligations. |
| `AuthorizeDealCheckout` | All child Obligations current and lane-eligible | One independent auth intent per connected Obligation; no Work capture. |
| `RecordWorkFact` | Current Work/terms/graph version, actor, shape/evidence policy, idempotency | Append `work_started`, `ready_for_collection`, `collected`, `in_transit`, or other fact; update Work status only when contract says so. |
| `AuthorizeHandoffAction` | Active Dependency condition and all target guards | Record named condition satisfaction and emit target action intent; never mark target completed. |
| `ConfirmHandoff` | Authorized participating actors, exact transfer, evidence/mismatch fields | Append custody fact and evidence; possible source completion/settlement eligibility only by terms. |
| `ProposeWorkCompletion` | Provider/authorized Agent, required evidence | Move Work to `completion_proposed`; notify reviewer; no payment by itself. |
| `SignoffWork` | Authorized buyer/reviewer or valid review-window policy | Complete Work when shape/policy/hold guards pass; emit settlement eligibility candidate. |
| `EvaluateObligationSettlement` | Due condition, Work proof, no hold/dispute, auth/reconciliation | CAS to eligibility and enqueue one capture/release effect. |
| `ReconcilePaymentProviderEvent` | Authenticated provider event, stable provider identity, amount/currency/object match | Append payment/ledger effects or `reconciliation_required`; no malformed/mismatched effect. |
| `RequestNeedReplacement` / `FormReplacementChildOrder` | Explicit failure/recovery authority, same-chain lineage, new accepted terms | Preserve old Need/Order; create and wire replacement, without financial contagion. |
| `OpenDispute` / `PlaceHold` | Authorized party/admin and reason/evidence | Pause relevant completion/release; preserve all existing facts and amounts. |

Adapters (HTTP, Inertia, jobs, integrations, AI) call these application commands. They must not insert Orders, Work, Obligations, or payment events directly.

---

## 13. Authorization, privacy, and participant projections

- The buyer may view the chain summary and each child to which they are a party.
- A merchant sees its own Order, Work, handoff facts needed to transfer custody, and its own Obligation/payment status; it does not see unrelated child private evidence or payment instruments.
- A courier sees only the courier child, the authorized pickup/delivery instructions, the minimum merchant/customer identity and condition data, and evidence grants required for that handoff.
- A technician sees its own child, the accepted scope, required input arrival facts, site instructions, and its own settlement state.
- A coordinator's chain access does not grant payer/recipient authority, provider ownership, private evidence access, or the ability to release another party's money.
- Every read and evidence download applies aggregate participant, role, consent, data-class, and retention checks. A chain projection is not an authorization shortcut.
- Notifications are derived from committed events and contain only fields allowed for their audience. Chat messages can reference a version/fact but are never the source of terms or completion.

---

## 14. Operational controls and observability

A production-ready implementation must expose, at minimum:

1. chain acceptance/formation success and rollback reason by version;
2. expected vs. formed child count and one-to-one Order/Work/Obligation integrity;
3. blocked dependency reason, condition version, source event, and graph freshness;
4. Work fact age, evidence acceptance/rejection, mismatch/dispute rate, and stale-event count;
5. authorization pending/expiry/unknown counts per lane/provider and per Obligation;
6. capture/release eligibility, provider effect identity, reconciliation status, ledger posting status, and payout confirmation separately;
7. outbox pending/retry/dead-letter/gap/unsupported counts;
8. active holds, unresolved disputes, replacement-needed Needs, and partial chain completion;
9. capability activation and disablement decisions for every queued irreversible effect;
10. operator replay/reconciliation actions with maker/checker approval where required.

Disablement must block new starts and irreversible forward effects but preserve reads, evidence retention, support, reconciliation, refunds/reversals, and safe cancellation/completion paths.

---

## 15. Implementation acceptance criteria

The implementation is complete only when the following observable scenarios pass at the application boundary:

### Formation

- Accepting one three-node Bid creates exactly three independent child Orders (`ORD-101`, `ORD-102`, `ORD-103` as display references), three Work Instances, three primary Obligations, three terms snapshots, and no parent Order/payment/escrow row.
- Any validation, capacity, invitation, graph, or child insert failure leaves no partial formation rows or committed reservations.
- A replay returns the original response; a competing command cannot create a second active child for a Need.
- Listing/provider changes after acceptance do not rewrite any child snapshot, amount, provider, Work shape, lane, or due condition.
- `STANDARD_AUTO_BIND` produces no speculative partner invitation/notification/reservation; a custom term cannot proceed while partner confirmation is pending.
- The same provider appearing in two non-cyclic Needs receives two child Orders with independent status and money.

### Work and evidence

- `ready_for_collection` records a Work fact/evidence and authorizes only the specifically named collection action; it does not set the Order closed, the Work completed, or the Obligation captured.
- `collected`, `in_transit`, `work_started`, and `work_completed` are append-only, actor/evidence/idempotency guarded facts with correct common Work status mapping.
- A mismatch preserves both the actual transfer fact and mismatch evidence and blocks the affected action according to policy.
- A stale or revoked source fact cannot satisfy a newer dependency; a failed input cannot satisfy a fan-in.
- Completion requires the shape-specific evidence/signoff and is independent of payment confirmation.

### Settlement

- Checkout creates and reconciles one independent authorization identity per child Obligation; a chain display total cannot be submitted as one payment.
- Capture/release eligibility is evaluated only after the accepted due condition, required evidence, no relevant hold/dispute, and provider reconciliation checks pass.
- A duplicate capture/release command produces one business effect; a provider timeout produces reconciliation work, not a blind retry.
- Upstream settlement remains recorded when a downstream child fails; remedies are child-scoped and append-only.
- Authorization expiry, partial capture, refund, reversal, and payout confirmation retain separate amounts/events and never rewrite the accepted Obligation.

### Eventing and recovery

- Every state-changing command writes state, audit, idempotency, and outbox intent in one transaction.
- Consumers deduplicate by event identity and aggregate sequence, park gaps/unsupported contracts, and do not regress projections under reordering.
- A worker crash after commit leaves a durable outbox intent and a retryable, idempotent effect.
- A revoked acting-for consent is rechecked before a delayed mutation; historical attribution remains.
- Chain closure requires every required Need completed or explicitly resolved; partial completion is visible and does not imply financial completion.

---

## 16. Non-goals and deferred decisions

This specification deliberately does **not**:

- create a composite listing or a parent Order;
- create pooled escrow, a chain wallet, a kiosk deposit, or an operating balance;
- promise legal escrow, guaranteed reimbursement, universal provider liability, or automatic 50/50 fault allocation;
- make QR, OTP, GPS, screenshot, notification, or correlation ID a universal payment/completion authority;
- authorize production Direct Digital/Tiwala money, revenue splits, connected payouts, or live provider credentials;
- invent a universal appointment delay, freshness TTL, cancellation fee, abono/advance policy, or branch timeout;
- allow active-chain scope changes to rewrite accepted children. Such a change requires a separately approved amendment or cancellation/replacement contract;
- make an event bus a source of truth. PostgreSQL aggregates, append-only events, accepted snapshots, evidence, and reconciled money records remain authoritative.

---

## 17. Source references

### Internal authority and design records

- [Founder decision and modeling charter](12-deal-chaining-founder-decision-and-modeling-charter.md) — independent child authority, derived roll-ups, and no pooled money.
- [Deal-Chaining logic soundness review](17-deal-chaining-logic-soundness-review.md) — Need identity, dependency conditions, readiness/completion/payment separation, replacement, concurrency, and recovery corrections.
- [Listing extensions and partnered Deal-Chaining specification](18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md) — single-owner listings, modular extensions, standard auto-bind, and child-order examples.
- [Advisor role-oriented bidding and partner extensions evaluation](20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md) — proposal versions, standard/custom partner gates, exact acceptance transaction, and immutable node terms.
- [Advisor Deal-Chaining and bidding schema evaluation](19-advisor-deal-chaining-and-bidding-schema-evaluation.md) — quote package versus Deal Chain, independent obligations, and acceptance sequencing.
- [Rebuilt domain/state contracts](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md) — canonical Order/Work/Payment/Deal state machines, evidence, holds, idempotency, and release guards.
- [Architecture spine](../../_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md) — AD-4–7, AD-17–19, AD-23, AD-25–29.
- [Payment and trust-lane policy](02-payment-and-trust-lane-policy.md) — lane boundaries, evidence disclaimers, sandbox/live gates, and no cash custody.
- [Canonical schema implementation contract](07-schema-implementation-and-erd-contract.md) — UUIDs, immutable versions, Work/Order/Obligation tables, outbox/inbox, and relational guards.

### External technical references

- [Stripe — Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — authorization/capture separation, authorization expiry, and payment-method limitations. Used only as an adapter constraint example; not as Serbizyu payment policy.
- [Stripe — Capture a payment multiple times](https://docs.stripe.com/payments/multicapture) — multicapture eligibility is provider/payment-method specific and cannot justify a pooled domain payment.
- [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) — row locks, transaction scope, deadlock risk, and consistent lock ordering.
- [PostgreSQL — `SELECT` locking clauses](https://www.postgresql.org/docs/current/sql-select.html) — `FOR UPDATE`/related row-lock semantics used by guarded formation and release decisions.
