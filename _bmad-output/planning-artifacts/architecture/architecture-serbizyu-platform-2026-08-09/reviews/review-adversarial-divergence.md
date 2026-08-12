# Adversarial Divergence Review

**Target:** `ARCHITECTURE-SPINE.md` and `PROGRAM-IMPLEMENTATION-PLAN.md`  
**Verdict:** **NOT READY FOR FINALIZATION**  
**Review mode:** Independent literal implementations of Catalog, Order formation, Work shapes, Payment providers, Deal-Chaining, account integrations, and AI handoff.

The spine has a strong direction, but several cross-module contracts remain names rather than executable invariants. Independent teams can obey the prose and still produce incompatible command shapes, transaction boundaries, version semantics, asynchronous consumers, activation behavior, and authority boundaries.

## Evidence reviewed

- Target spine and companion implementation plan
- Canonical rebuilt PRD, domain/state, schema/ERD, ADR, architecture, and epics artifacts
- Current Catalog, Orders/Work, Payments, Deal-Chaining, and platform-integrity migrations

## Findings

### ADV-01 — Canonicalize integrations before binding them

- **Tier:** critical
- **Fix class:** founder/authority decision, then mechanical propagation
- **Evidence:** Spine AD-1 makes rebuilt PRD/domain/schema/ADR/epics authoritative; AD-13 and AD-21 introduce `/api/v1` and six integration tables. Program §3 explicitly says those canonical artifacts require amendments and forbids integration migrations/endpoints before approval. The current rebuilt PRD, domain, schema, ADR, and epics contain no service-principal, account-integration, `/api/v1`, or integration-table contract; the canonical schema still declares itself the sole 46-table inventory.
- **Incompatible outcome:** One team follows AD-21 and creates a 52-table schema while another follows the canonical schema and either refuses the feature or stores integration state outside the required tables. Both can claim to follow the authority chain.
- **Tightened rule text:** “AD-13 and AD-21–22 are `PROPOSED/BLOCKED`, not adopted. No integration or AI command adapter, endpoint, migration, or credential is permanent until revised PRD, domain, schema/ERD, ADR, UX, and epic artifacts are approved and identified by exact revision in this spine. Finalization requires those sources to contain the same client states, scopes, six-table inventory, commands, errors, and activation status.”

### ADV-02 — Define the `OrderAgreement` contract and lifecycle point

- **Tier:** high
- **Fix class:** founder/domain decision
- **Evidence:** AD-5 names `OrderAgreement` but does not define its fields or output; Program T3 repeats the name without a schema. The canonical Order state machine says `submit_order` creates `pending_acceptance` and only `accept_order` creates the accepted terms snapshot, while AD-5 says every formation mechanism submits `OrderAgreement` and atomically creates terms, Work, and Obligations.
- **Incompatible outcome:** Direct Booking may create Work/Obligations at submission while Quote, Quick Deal, and Deal-Chaining create them only after counterparty acceptance. API and webhook consumers then disagree whether `order.created` means proposed, pending, or accepted.
- **Tightened rule text:** “`OrderAgreement` is the sole final-formation command and is accepted only after every required party acceptance is current. Proposals, quotes, bids, invitations, and Quick Deal confirmations remain source-module records. `OrderAgreement` carries a discriminated source, source IDs and immutable versions, party/acceptance proofs, terms snapshot input, Work specifications, Obligation specifications, expected versions for every guarded source, actor context, correlation ID, and idempotency key. Success creates an `accepted` Order and all required children; failure creates none. If a pending Order is required, define a separate `SubmitOrderProposal` command and prohibit child creation until `AcceptOrder`.”

### ADV-03 — Name one transaction coordinator for formation

- **Tier:** high
- **Fix class:** clear architecture autofix
- **Evidence:** AD-3 allows only aggregate owners to write their state. AD-5 and Program T3 require one atomic operation spanning Catalog reservation, Order, terms, parties, Work, Payment Obligations, audit, idempotency, and outbox. No rule names the transaction owner, shared unit-of-work contract, port semantics, lock order, or rollback behavior.
- **Incompatible outcome:** Catalog can commit a reservation before Order formation while Work or Payment queues child creation after commit; a later failure leaves reserved capacity, missing children, or an accepted Order without a required Obligation.
- **Tightened rule text:** “Order Management owns the formation application transaction. In-process Catalog, Work, Payment, and Integrity creation ports must enlist in the same PostgreSQL transaction and receive the same command/correlation/idempotency context; they may not queue required formation writes. Lock order is Catalog source/capacity → Order → Work → Obligation → integrity records. Any validation, optimistic-version, constraint, or child-creation failure rolls back every write. Only post-commit effects use the outbox.”

### ADV-04 — Introduce a real reservation identity and lifecycle

- **Tier:** high
- **Fix class:** clear schema/domain autofix
- **Evidence:** AD-9 requires atomic reservation and Program T2 requires reserve/release/reconcile commands, but neither defines reservation identity, owner, lease/expiry, quantity/slot, conversion, or release triggers. The canonical schema describes only `listing_capacity`. The current migration enforces one `listing_capacity` row per `listing_id` and stores only `reservation_status`; it has no reservation/Order/idempotency owner link and cannot represent many A3 slots or concurrent partial quantity reservations.
- **Incompatible outcome:** One implementation decrements remaining quantity permanently, another holds an expiring reservation, and another marks the single listing row reserved. Decline, timeout, cancellation, and retry then leak capacity or release capacity still committed to an accepted Order.
- **Tightened rule text:** “A capacity reservation is an owned record with reservation ID, listing and immutable listing-version ID, capacity unit/slot, quantity, source mechanism, command/idempotency identity, optional Order ID, status (`held|committed|released|expired`), expected capacity version, and expiry where applicable. Formation changes `held` to `committed` in the Order transaction. Decline/expiry/cancellation invokes one idempotent release transition under Catalog ownership. A3 permits multiple distinct slots; quantity reservations sum under a locked capacity bucket and never drive remaining below zero.”

### ADV-05 — Separate immutable business versions from concurrency revisions

- **Tier:** high
- **Fix class:** clear schema/domain autofix
- **Evidence:** AD-6 requires Orders to reference immutable listing, quote, category, capability, and policy versions. Current `order_terms_snapshots` references listing version, quote, and policy only. Current `listing_versions` does not pin category or capability-profile versions. `categories.version` is a mutable concurrency field, and `capability_profiles.version` is simultaneously used in a unique business key and as the mutable row version.
- **Incompatible outcome:** After category safety/data class or capability lane/shape rules change, one implementation reconstructs accepted terms from current rows while another copies selected fields into JSON. Historical authorization, safety, Work shape, and allowed-lane decisions then differ.
- **Tightened rule text:** “Every governed artifact has a stable family ID, an immutable published business-version ID/number, and a separate optimistic `row_version`. Published category/profile/listing/quote/policy rows are append-only. `listing_versions` pins exact category-version and capability-profile-version IDs; `order_terms_snapshots` pins all five exact source-version IDs or an explicitly equivalent immutable composite snapshot. No concurrency counter is a business-version identifier.”

### ADV-06 — Fix Work payload identity and evolution

- **Tier:** high
- **Fix class:** clear architecture autofix
- **Evidence:** AD-7 requires a versioned validated payload and Program T4 adds a shape registry, but no shared envelope distinguishes aggregate version, payload-schema version, Work-shape version, A9 artifact version, or event version. No rule states whether accepted structure is immutable, how revisions are represented, which adapter reads old versions, or what happens to an unknown version.
- **Incompatible outcome:** An A9 adapter can interpret `version=2` as artifact revision while the common kernel interprets it as JSON schema v2; replay or a new deployment can reject, reinterpret, or overwrite accepted Work structure.
- **Tightened rule text:** “Every Work structure and shape event uses `{shape_code, shape_contract_version, payload_schema_version, payload}`. The accepted Order pins `shape_code` and `shape_contract_version`. Aggregate `row_version`, event version, and artifact/revision numbers are separate fields. Accepted structure is immutable; scope/revision changes append a versioned event or affected-party terms amendment. The registry retains readers/validators for every non-retired referenced version. Unknown versions produce `work_contract_version_unsupported`, no state effect, and an operations inspection item.”

### ADV-07 — Make asynchronous consumption ordered and idempotent

- **Tier:** high
- **Fix class:** clear architecture/schema autofix
- **Evidence:** AD-18 atomically writes an outbox intent and says workers are retryable, but does not define consumer deduplication, per-aggregate ordering, gap handling, or unknown event versions. The current `outbox_messages` table has event ID/type, aggregate identity, payload version, and retry state, but no aggregate version/sequence or causation ID. Deal roll-up, webhook delivery, projections, and integration feeds all consume these events.
- **Incompatible outcome:** A retry or reordered delivery can apply child Order version 7 before version 6, regress a Deal roll-up, issue contradictory webhooks, or repeat a non-idempotent notification while every producer remains locally correct.
- **Tightened rule text:** “Every cross-module event/outbox record carries event ID, event contract version, aggregate type/ID, aggregate version/sequence, causation event/command ID, correlation ID, actor/client attribution, occurred/effective times, and payload-schema version. Every consumer persists an inbox/deduplication result. A consumer applies only the next aggregate version, ignores an already-applied event ID/version, parks gaps for retry/rebuild, and dead-letters unsupported versions without acknowledging successful business processing.”

### ADV-08 — Define activation evaluation and disable semantics

- **Tier:** high
- **Fix class:** founder decision for disable behavior; mechanical contract afterward
- **Evidence:** AD-2 requires server-side activation gates and Program T1 calls for a neutral activation query, but no canonical gate key, precedence, evaluation instant, denial code, or behavior for already-accepted Orders exists. Program T10 expects independent mechanism/shape/provider disablement without corrupting Orders.
- **Incompatible outcome:** The UI can hide Direct Digital while `/api/v1` or AI still forms it; a provider kill switch may either block required refunds/reconciliation or allow new charges; pausing a capability profile may rewrite an existing Work path in one implementation but not another.
- **Tightened rule text:** “Every command declares its activation dimensions: environment, cohort, geography, owner/account, category/profile business version, mechanism, Work shape, payment lane/provider, and adapter/client class. The owning application service evaluates the gate immediately before mutation for UI/API/AI/job callers. Denial returns stable `capability_inactive` with no state effect. Disable blocks new starts and irreversible forward effects but never blocks reads, support, reconciliation, refund/reversal, evidence retention, or safe completion/cancellation of accepted obligations. Gate changes never rewrite accepted snapshots.”

### ADV-09 — Bind human approval to the exact AI command

- **Tier:** high
- **Fix class:** clear security invariant; founder input only for the command list
- **Evidence:** Program T9 says AI uses the same scopes and that high-impact commands require human-authorized policy, but defines no confirmation artifact or verification rule. “May require human confirmation” also conflicts with the exit rule that AI cannot publish, charge, release, resolve disputes, or consent without explicit authorization.
- **Incompatible outcome:** An implementation can store `confirmed=true` in a session and later execute a changed payload, a stale expected version, or repeated publish/formation commands under the same approval.
- **Tightened rule text:** “For every confirmation-required AI proposal, persist a one-time approval containing owner/human actor, integration client, canonical command name, target IDs, canonical payload hash, expected versions, scopes, policy version, issued/expiry times, and approval ID. Execution must present that approval and the same idempotency key; any payload, target, scope, policy, or version mismatch is rejected. Approval is consumed atomically with successful command execution and cannot be replayed. The founder-approved policy enumerates commands that always require confirmation; draft/help remains non-authoritative.”

### ADV-10 — Standardize provider-event dispatch and unknown outcomes

- **Tier:** high
- **Fix class:** clear payment contract autofix
- **Evidence:** AD-14 requires adapters to map provider events into canonical append-only payment events, and T7 tests malformed/reordered/mismatched events, but neither defines the canonical discriminated event set, required fields, legal Obligation transitions, or the consuming dispatch rule for authentic-but-unknown provider types. The current provider inbox stores free-text `event_type` and `processing_status`.
- **Incompatible outcome:** Xendit `payment.succeeded` can become `provider_verified`, `counterparty_confirmed`, or an immediate ledger post depending on adapter; a new authentic provider event can be silently ignored by one worker and retried forever by another.
- **Tightened rule text:** “Provider adapters emit only a versioned canonical outcome set, each carrying provider identity, provider event ID, obligation/intent mapping, amount/currency, provider effective time, authenticity result, and raw-reference hash. Payment owns one exhaustive dispatcher mapping every outcome to allowed Obligation/ledger transitions. Unknown, malformed, unmapped, amount/currency-mismatched, or illegal-state outcomes remain persisted as `reconciliation_required`, produce no financial effect, and surface a stable operations error.”

## Coverage

| Required area | Findings |
| --- | --- |
| Shared data shapes | ADV-02, ADV-06, ADV-10 |
| Ownership | ADV-03, ADV-04 |
| Mutation paths | ADV-02–04, ADV-08–10 |
| Versions | ADV-05–07, ADV-09 |
| Transactions | ADV-03–04, ADV-07, ADV-09 |
| Asynchronous effects | ADV-07, ADV-10 |
| Activation | ADV-01, ADV-08–09 |
| Errors/recovery | ADV-06–10 |

## Top blockers

1. Canonicalize account integrations/AI before marking their spine rules adopted.
2. Resolve what `OrderAgreement` means and make its command schema normative.
3. Define one shared PostgreSQL transaction boundary for capacity, Order, Work, Payment, and integrity writes.
4. Repair reservation persistence and immutable category/capability versioning.
5. Add ordered/deduplicated consumer rules, activation disable semantics, and exact AI approval binding.
