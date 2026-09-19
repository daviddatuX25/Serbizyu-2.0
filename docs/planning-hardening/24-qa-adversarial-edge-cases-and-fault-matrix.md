# Work, Orders, and Bids: QA, Adversarial Edge Cases, and Fault Matrix

**Document:** 24
**Status:** Hardening and implementation-entry QA guide; not production authorization
**Scope:** Requests, bids/quotes/proposals, listing versions and capacity, Deal Chains, Deal Needs, independent child Orders, Work, payment obligations, evidence, disputes, invitations, outbox/inbox, and recovery.
**Authority:** The canonical domain/state contracts and architecture spine remain authoritative. Documents 17–20 in this folder provide the Deal-Chaining and partnered-listing decisions this guide tests. This guide adds test oracles, failure matrices, and implementation constraints; it does not authorize pooled escrow, composite listings, unapproved payment behavior, or unsupported workflow states.

## 1. QA verdict and non-negotiable invariants

The architecture is defensible only if the system keeps planning, agreement formation, Work, payment, evidence, and recovery as separate authorities. The most dangerous implementation failure is a plausible happy path that allows one stale or malicious command to cross one of those boundaries.

Every test in this document must preserve these invariants:

1. **One real owner per listing.** A merchant owns a base listing. A courier, installer, or other provider is a separate listing/Need/Order. Never manufacture a composite listing or transfer reputation and liability through display grouping.
2. **A bid is not an Order.** Reverse-bidding Requests and provider Quotes/Proposal versions remain negotiable until the final formation command. A counteroffer is a new immutable version, not a chat edit.
3. **A Deal Chain is coordination only.** It is not an Order, wallet, escrow account, pooled balance, or parent-wide liability holder. Parent progress and cost are derived projections.
4. **A Deal Need is a required outcome.** It is not a listing, provider identity, message, or Order. Each Need has at most one active non-cancelled/non-closed child Order.
5. **Child Orders are independent.** Acceptance of a multi-node proposal creates independent child Orders and one-to-one payment obligations per child. A sibling failure never silently cancels, refunds, releases, disputes, or reassigns another child.
6. **Accepted terms are immutable.** Listing, quote, proposal, policy, Work-shape, capacity, payment-lane, schedule, party, and price facts used by an accepted Order are snapshots. A later listing edit creates a new business version and never rewrites the Order.
7. **Readiness is not completion.** `ready_for_collection`, `ready_for_handoff`, or equivalent facts can satisfy a named downstream condition. They do not complete the upstream Order or Work and do not authorize payment by themselves.
8. **Payment and Work are separate.** Payment confirmation never proves Work completion; Work completion never proves payment. Release requires the payment-lane guards, reconciliation, sign-off/review, and hold/dispute checks.
9. **Standard references are quiet; custom terms are explicit.** A valid `STANDARD_AUTO_BIND` catalog reference does not create speculative partner notifications, invitations, chat, inventory holds, or a provider-side Order. Custom price/scope/schedule/quantity/payment changes require an explicit partner confirmation invitation.
10. **History is append-only.** Failure, cancellation, replacement, dispute, correction, and compensation preserve the original Need, Order, Work, obligation, evidence, event, and actor history. Recovery creates lineage; it does not make history look successful.
11. **Every command is attributable and guarded.** Actor, acting-for context, active consent when applicable, target aggregate, expected version, correlation ID, idempotency key, authorization, and activation dimensions are checked at execution time.
12. **Every committed mutation is observable and recoverable.** Aggregate mutation, transition/audit event, idempotency result, and outbox intent commit together. Consumers use stable event identity and aggregate sequence, not correlation ID, for deduplication.
13. **No offline or client projection is authoritative.** A stale screen, QR/token, cached offer, AI suggestion, or client-computed total can propose an action but cannot authorize final state, payment, inventory, custody, or consent.
14. **No hidden cross-boundary authority.** A coordinator, agent, courier, lead provider, or partner recommendation does not become the owner, payer, recipient, custodian, or final approver unless an explicit scoped contract grants that role.

### 1.1 Release gate

A Work/Order/Bid implementation is **not ready for activation** until all P0/P1 cases below have deterministic outcomes and evidence for both success and no-effect failure. A test that only checks an HTTP status is insufficient; the oracle must include database rows, state histories, capacity, obligations, audit, outbox, inbox, and user-visible recovery state.

- **P0:** duplicate Order/obligation, pooled or cross-Order money, oversell/double-booking, stale acceptance changing price/scope, unauthorized provider binding, lost committed state, event replay causing a second effect, cross-chain replacement, or sibling cascade.
- **P1:** wrong lifecycle state, missed recovery, stale projection authorizing action, privacy/IDOR, notification/invitation spam, evidence or audit loss, unresolved deadlock/retry behavior, or incorrect user-facing conflict.
- **P2:** observability, copy, projection freshness, or operator ergonomics defects that do not change authoritative state or authorization.

## 2. Terminology and test fixture

The canonical model reuses existing Requests and Quotes rather than introducing an unbounded second “bid” primitive. Where this guide says **bid**, use the implementation’s Request/Quote/Proposal command and record the concrete mechanism in the test name.

Use a deterministic fixture with distinct identities and immutable versions:

| Actor | Fixture role | Required facts |
|---|---|---|
| `buyer-1` | citizen/requester | Owns the Request, may accept a proposal, may sign off or dispute under the Work shape |
| `merchant-1` | base-listing owner | Owns product listing version `L1-V1`, capacity bucket `B1`, and product/A4 Work |
| `courier-1` | downstream provider | Owns transport listing version `L2-V1`; may be a standard auto-bind reference or invitation target |
| `courier-2` | replacement provider | Owns a distinct transport listing and capacity bucket |
| `technician-1` | downstream/returning provider | Owns labor listing and A1/A3 Work; may appear in separate Needs without forming a graph cycle |
| `parts-1` | parts supplier | Owns hardware listing and quantity capacity; can report defect/mismatch |
| `agent-1` | scoped delegate | Has a narrow active consent grant, then a revoked or expired grant for queued-command tests |
| `ops-1` / `ops-2` | operations maker/checker | Separate roles for holds, corrections, release, or administrative recovery |
| `attacker-1` | untrusted actor | Must not inspect or mutate another participant’s private chain, evidence, offers, or payment data |

Fixture requirements:

- Use PostgreSQL with real foreign keys, partial indexes, deferred constraints/triggers, and at least two concurrent database sessions. SQLite-only tests do not prove the required locking behavior.
- Freeze or inject the authoritative UTC clock. Test just before, exactly at, and just after expiry; never use browser timers as the oracle.
- Assign known UUIDs and command keys so traces are diffable. Generate distinct correlation IDs for retries to prove that correlation is tracing, not deduplication.
- Give each mutable aggregate a known `row_version`/expected version and each event an aggregate sequence.
- Capture a database snapshot before and after each command, including rows that should not change.
- Drain and inspect `outbox_messages` and consumer inbox rows. A published notification is not proof that the business transition occurred.
- Fail at transaction boundaries and at post-commit boundaries: before validation, after each insert/update, before commit, after commit before publish, during consumer processing, and after external-provider timeout.

## 3. Concurrency and race-condition matrix

### 3.1 Command ordering contract

The result of a race must be determined by the first transaction that successfully acquires the authoritative locks and commits, not by request arrival order, client timestamps, queue order, or browser display. The losing command must receive a stable conflict or safe idempotent replay and must leave no partial rows.

Use this lock hierarchy for commands that touch multiple aggregates. Within one level, lock rows in deterministic UUID order. A command must never acquire a lower-level lock after a higher-level lock has been acquired by another command path.

```text
Request / request lineage
  → proposal lineage and current proposal version
  → DealChain row (for chain commands)
  → DealNeed rows (sorted; only the affected active graph)
  → source listing and immutable listing-version authority
  → capacity bucket/reservation rows (sorted by bucket UUID)
  → Order rows (sorted by Order UUID)
  → Work rows
  → Payment Obligation rows
  → reservation release rows, idempotency, audit, and outbox integrity rows
```

For direct single-Order finalization, the mandatory suffix is:

```text
source/listing/capacity → Order → Work → Obligation → integrity records
```

That suffix matches the architecture spine. For Deal-Chain commands, acquire the Chain/Need locks before the suffix; no path may lock a source/capacity row and then attempt to acquire a Chain lock. For cancellation or release that also restores capacity, locate and lock the affected reservation/bucket before the Order so it follows the same hierarchy as finalization. Never hold a database lock while calling a payment, courier, notification, or other network provider.

Use `READ COMMITTED` with explicit locks for ordinary commands; use `SERIALIZABLE` where a multi-resource allocation cannot be expressed safely with locks and retry serialization failures using the same idempotency key. Do not use `SKIP LOCKED` for final acceptance, final Order formation, capacity allocation, or payment release; it can turn temporary contention into a false “unavailable” decision.

### 3.2 Matrix

| ID | Concurrent actors/trigger | Required transaction guard | Expected committed result | Failure oracle / evidence |
|---|---|---|---|---|
| CON-01 | Many providers submit Quotes to one open Request | Each Quote has its own idempotency scope; provider identity comes from auth; Request remains open for multiple lineages | All valid, unexpired provider Quotes may coexist; no Quote overwrites another | No duplicate Quote from a replay; no provider impersonation; Request is not prematurely contracted |
| CON-02 | Two counteroffers modify one Proposal lineage | Lock Request/lineage; check current version/`If-Match`; supersede old version and insert new immutable version in one transaction; partial unique active-version guard | Exactly one active version; one counter wins; loser gets `VERSION_CONFLICT` or replays the winning result | No two active versions, no in-place mutation, no orphan invitation, totals recomputed from new version |
| CON-03 | Citizen accepts V1 while provider counters V1→V2 | Both commands use Request→lineage lock order; acceptance checks current version and status; counter invalidates prior acceptance when terms change | If acceptance commits first, V1 can lock and counter is rejected as immutable; if counter commits first, V1 acceptance is rejected as stale and V2 requires fresh acceptance | Never create Orders from both; no accepted V1 with V2 terms; no “last write wins” |
| CON-04 | Citizen accepts while a custom partner is still countering | Lock Proposal version and invitation; gate derived from exact invitation status and terms hash | Acceptance returns `PARTNER_CONFIRMATION_REQUIRED` or stale conflict; no child Order exists | Invitation remains pending/countered; no provider Order, payment obligation, or notification implying binding |
| CON-05 | Partner accepts invitation while citizen accepts package | Lock proposal/request and invitation in one order; revalidate partner response, expiry, exact terms, listing policy, and capacity | Either partner consent commits before acceptance and acceptance proceeds, or acceptance sees pending/expired and fails atomically | No acceptance based on an uncommitted response; no stale consent reused after terms hash changes |
| CON-06 | Two different idempotency keys form the same child Order for one Need | Lock Chain/Need; check expected Need version; database partial unique active child index; form child and audit atomically | One active child Order; second command gets a uniqueness/version conflict and can read the winner | Never two obligations for one Need; old cancelled/closed history remains allowed |
| CON-07 | Two different proposal lineages are accepted for one Request | Lock Request first; enforce one accepted Contract/accepted lineage per Request | One lineage forms a Contract; other acceptance returns conflict and becomes non-selectable | No partial Orders from losing lineage; all competing proposals retain history and status |
| CON-08 | Listing price changes while a citizen is reviewing a proposal | Publish a new immutable listing version; acceptance locks/revalidates exact referenced version and quote expiry | Valid unexpired old snapshot is honored; expired/closed/invalid version returns a stable conflict requiring refresh | No silent amount change; accepted terms reference old version; new listing is not mutated back |
| CON-09 | Listing owner pauses/archives while acceptance runs | Lock source listing/current version before validating; owner transition follows the same listing lock order | If pause/archive commits first, acceptance rejects; if acceptance commits first with a valid version, later pause does not rewrite the accepted Order | No Order from archived listing; no mutation of accepted snapshot; audit records both outcomes |
| CON-10 | Two citizens attempt the last product unit | Lock bucket row; compare remaining quantity; decrement and reservation insert atomically; active reservation uniqueness | Exactly one hold/commit succeeds; other gets `CAPACITY_OVERSELL`/conflict; remaining quantity never negative | At most one committed unit; no duplicate payment; no leaked held quantity after failed formation |
| CON-11 | Same citizen double-clicks last-item checkout with same key | Lock command idempotency row or use unique `(scope,key)` and safely replay; include request fingerprint | One business effect and identical replay response | One reservation, one Order, one Work, one obligation, one audit/outbox event |
| CON-12 | Same command key reused with changed amount, listing version, quantity, actor, or target | Persist request hash/fingerprint; compare under lock | Stable `IDEMPOTENCY_CONFLICT`; no state change | Original response/effect remains; changed payload cannot hijack an earlier key |
| CON-13 | Capacity hold insert races with another hold | Lock bucket before quantity check; unique command key is a backstop; handle unique violation as replay/conflict, not 500 | Holds consume capacity exactly once and expire/release exactly once | Remaining quantity equals total minus active/committed reservations; no duplicate hold row |
| CON-14 | Held reservation expires while final Order formation runs | Lock reservation and bucket; evaluate expiry using DB clock; commit only current `held` reservation under the same formation transaction | One command wins: committed before expiry or expired/released before commit; loser retries with a new valid hold | No committed Order pointing to expired reservation; released quantity restored once |
| CON-15 | Listing/capacity version changes while held reservation is used | Composite reservation→bucket/listing-version FK and current-version check under lock | Formation rejects stale version and rolls back reservation/use; client must reprice/rehold | No Order with mixed listing and capacity versions; no quantity loss |
| CON-16 | Courier capacity expires while buyer selects a standard extension | No proposal-time reservation; checkout/acceptance locks exact partner listing/version/capacity and revalidates policy | Accepts only if still available; otherwise clear `CAPACITY_UNAVAILABLE`/`SCHEDULE_UNAVAILABLE` and no courier child | Merchant child is not silently accepted as a “full package”; no speculative courier Order |
| CON-17 | Merchant changes a fulfillment preset while buyer confirms | Preset/business version in offer token; lock checkout/session and revalidate exact preset/partner/listing versions | Old valid offer is consumed; changed/invalid offer returns conflict; no client-supplied fee is trusted | Display total never drives settlement; child obligations use validated node amounts |
| CON-18 | Concurrent dependency edits add A→B and B→A | Lock Chain first, then affected Needs in sorted order; check active graph and deferred cycle trigger before commit | One edge may commit; cycle-forming edit aborts with no partial edge | No active cycle, no orphan edge, no downstream start on an invalid graph |
| CON-19 | A start/dispatch command races with dependency edit or hold placement | Chain/Need and relevant hold/version locks are held during guard and mutation; source facts re-read | Start either sees the old valid graph/guard before edit commits or is rejected/retried after edit; never uses a stale green connector | Event records consumed graph/source versions; no dispatch/payment from stale projection |
| CON-20 | Concurrent fan-in inputs: one succeeds, one fails/cancels | Evaluate every active required predecessor for the named transition; failure/cancellation is not satisfaction | Downstream remains blocked; replacement/waiver requires explicit command and edge version update | One completed input does not count as “all”; no technician start or completion event |
| CON-21 | Failed input is replaced while downstream start is queued | Chain lock; old Need lineage/version and dependency edge are checked; replacement Need is same Chain and explicitly wired | Queued stale start is rejected; new start waits for replacement condition | Old evidence/order preserved; downstream does not wait forever on superseded Need |
| CON-22 | Returning provider A has stages before and after provider B | Distinct Need and child Order identities; cycle check only follows dependency edges | A→B→A by provider identity is valid when edges are acyclic; each stage can fail independently | No identity-based false cycle; no one Order forced to be both complete and in progress |
| CON-23 | Courier reports `ready_for_collection` while merchant Work is still preparing | Condition registry maps readiness to the named downstream transition only; Work state remains separate | Courier may be eligible to attempt collection only if the accepted condition permits; merchant is not completed | No merchant completion, payout, or parent closure from readiness alone |
| CON-24 | Courier/merchant handoff and customer cancellation race | Lock affected child Orders/Work/obligation according to hierarchy; validate actor and custody fact | One custody fact wins; cancellation records impact and does not erase a completed/actual handoff | No impossible “never handed over” history after recorded custody; no automatic payout from QR alone |
| CON-25 | Provider completion and buyer dispute/sign-off race | Lock Work, Order, obligation, and active holds; only one completion decision can win | Authorized sign-off or dispute wins by commit order; later command is no-op/correction path | Completed Work cannot be silently disputed away; release is held when dispute wins |
| CON-26 | Customer cancellation and provider completion race | Same Order/Work lock order; cancellation policy and evidence guard | Either completion commits before cancellation request, or cancellation commits before completion; explicit policy handles the loser | No hidden refund/payout; no delete of evidence or obligation |
| CON-27 | Release and refund/correction race | Lock obligation and linked Work/Order; require reconciliation, no active hold/dispute, expected version; release/refund operations are mutually aware | At most one financially valid effect; competing operation returns conflict or creates an explicit compensating event | No double payout/refund; ledger remains balanced and append-only |
| CON-28 | Payment provider webhook races manual status/report | Provider inbox identity and canonical object/amount/currency/order binding; lock obligation; provider event unique key | Authentic matching event may advance status; manual report remains separate or is reconciled | Authentic-but-wrong, replayed, or mismatched event has no business effect and enters reconciliation |
| CON-29 | Worker retries an outbox event while first consumer is processing | Unique consumer/source-event and aggregate-sequence inbox rows; lock inbox record; apply next sequence only | One consumer effect; retry is no-op or resumes safely | No duplicate dispatch/payment/notification; future sequence is `gap`, not applied out of order |
| CON-30 | Crash after domain commit but before outbox publish | Mutation/audit/idempotency/outbox written in one DB transaction; publisher scans pending outbox | Publisher later emits the already durable event; no rollback or duplicate business mutation | One event ID, retryable outbox row, audit correlation intact |
| CON-31 | Crash after external payment request before response | Stable external effect identity and provider query/reconciliation path | Outcome becomes unknown/pending until queried; retry queries original effect rather than issuing a second charge | No blind duplicate charge, release, refund, or obligation transition |
| CON-32 | Agent consent revoked while queued command waits | Recheck active consent/activation immediately before mutation; lock consent/target as required | New command rejected; prior accepted Order/history remains | No post-revocation mutation; audit shows original acting-for attribution |
| CON-33 | Admin hold races release or completion | Hold is checked under target lock; release/completion cannot bypass active fraud/safety/legal hold | Hold prevents guarded effect; safe reads/reconciliation remain available | No release/completion while hold active; hold creation itself is audited |
| CON-34 | Notification delivery retries while source command is replayed | Notifications keyed to stable source event/effect, not request arrival or correlation ID | One logical notification, multiple delivery attempts only where policy permits | No duplicate business command from a notification; privacy scope unchanged |
| CON-35 | Concurrent active-plan amendment and accepted child execution | Lock Chain/Need and enforce amendment contract; accepted terms cannot mutate in place | Unsupported amendment rejected; supported amendment creates version/consent/impact record before execution | Worker with old graph/version is refused; accepted child terms remain immutable |

### 3.3 Required race harness assertions

For each `CON-*` case run both permutations, at least one forced lock wait, a process crash at the indicated boundary, and a retry with a different correlation ID. Assert:

- final state is one of the documented outcomes, never an unmodeled hybrid;
- no row exists that belongs to a rolled-back command;
- all expected version counters advance exactly once;
- no negative capacity or overlapping active slot exists;
- exactly one active child Order/obligation exists where the invariant requires one;
- all committed state has one audit event and one outbox intent;
- every rejected stale command has a safe stable error and no side effect;
- the losing command cannot become successful merely by replaying a stale body;
- parent projections may lag but never authorize a transition or reveal another participant’s private data.

## 4. Fault-isolation matrix: node failures and recovery

**Protection means preservation of authoritative history and non-cascade, not an automatic payout or legal finding.** An upstream Order can remain completed while its obligation is disputed or corrected under its own terms. A `ready_for_collection` fact is not completion. A downstream failure must not retroactively rewrite an upstream Work row.

| ID | Failure point and observed fact | Upstream protection | Affected child/Need/obligation | Recovery command and evidence | Prohibited behavior |
|---|---|---|---|---|---|
| FI-01 | Courier loses vehicle before accepting or before dispatch | Merchant preparation remains in its own Work state; a readiness fact remains a fact | Courier invitation/Order is declined, cancelled, or failed per its state; no courier payment effect is inferred | Record provider failure/reason; select a replacement courier through a new Need or valid replacement plan; revalidate capacity and terms | Do not cancel or refund merchant child automatically; do not claim package delivery |
| FI-02 | Courier no-show at pickup before custody | Merchant may remain `ready_for_collection`/awaiting handoff; preparation evidence stays | Courier Work/Order records no-show; downstream Need failed or replacement-needed; merchant completion depends on its own handoff contract | A4 attendance/no-show and packaging evidence; replacement courier; explicit reschedule/cancel policy | Do not mark merchant as delivered or courier as collected; do not erase readiness |
| FI-03 | Courier arrives, rejects wrong quantity or visible damage, custody never transfers | Merchant Work records preparation and attempted handoff; no false custody | Courier remains not-collected/blocked; mismatch/dispute targets the relevant child Order(s) | Capture mismatch, photos/evidence, actor, quantity, and custody result; decide return/rework/replacement explicitly | Do not invent handoff, acceptance, courier liability, or automatic payout |
| FI-04 | Courier accepts custody, then breaks down in transit | Merchant’s actual handoff and preparation remain immutable; merchant child can close only under its own guards | Courier Work is in transit/failed/disputed; chain partially complete/blocked; courier obligation follows its lane and evidence | Record custody transfer, location/time/evidence, incident, replacement or return; open dispute/hold where required | Do not roll back merchant Order or erase handoff; do not assign a universal liability split |
| FI-05 | Courier delivers late but customer accepts | Merchant and courier facts remain separate; lateness may be a courier policy issue | Courier Work may complete with lateness evidence; payment/review follows terms | Record arrival/acceptance and SLA outcome independently; apply any agreed adjustment as a new event | Do not infer merchant fault from courier lateness |
| FI-06 | Courier delivers but customer disputes contents after custody | Merchant handoff remains a historical fact; courier custody remains a historical fact | Relevant Work/obligation enters dispute/hold; no automatic blame | Preserve seals, photos, receipt, timestamps, messages, and custody actors; adjudicate under dispute policy | Do not use handoff as immunity or automatic payout authority |
| FI-07 | Parts merchant reports out-of-stock after quote | No accepted upstream Order exists if final capacity validation fails; unrelated children untouched | Parts Need/Quote becomes unavailable/expired; any held reservation is released once | Reprice or source a replacement part; replacement Need is same Chain and versioned | Do not create a phantom hardware Order or silently substitute a part/version |
| FI-08 | Parts arrive but are incompatible/defective before technician starts | Parts custody/preparation facts remain; technician has not completed or accepted installation | Parts Order can be disputed/returned; technician Need remains blocked or rescheduled | Record compatibility evidence, serial/batch, receipt, and safety hold; source replacement; update edge explicitly | Do not mark technician Work complete or automatically charge technician |
| FI-09 | Defect discovered after technician installs part | Technician’s actual diagnostic/installation Work remains evidence, even if outcome is disputed | Parts Order and/or technician Order enters separate dispute/warranty/rework path; no sibling cascade | Preserve pre/post-test evidence; create warranty/replacement/rework Need only after authorized decision | Do not rewrite installation as never performed or assume which provider is liable |
| FI-10 | Hardware is counterfeit or phantom attachment is discovered | Any legitimate upstream child history remains; safety hold can block affected transitions | Suspect part Order/Need is held/disputed/failed; downstream Work stops safely | Verify listing owner/version, serial/receipt, provider identity, and attachment authorization; operations investigation | Do not release funds or expose private merchant data based on a lead provider’s claim |
| FI-11 | Customer cancels before any child Order is accepted | Draft/quoted Needs and proposals remain historical; no accepted Work exists | Cancel selected proposal/Needs; release only holds idempotently; no obligations should be settled | Record requester, policy, impact, and released reservation IDs | Do not create cancellation fees or payment events not present in accepted terms |
| FI-12 | Customer cancels after merchant accepted/prepared but before courier custody | Merchant preparation evidence and Order remain; courier may not have begun | Each child receives an explicit cancellation command under its own policy; obligations are resolved separately | Record cancellation time, readiness, materials, policy snapshot, and any approved fee/refund/hold | Do not parent-cascade cancellation, delete the prepared Work, or call the package one pooled order |
| FI-13 | Customer cancels after courier custody | Actual handoff and custody remain; merchant history cannot be unwound | Courier needs return/delivery resolution; refund/correction/dispute is child-scoped | Record return attempt, location, condition, acceptance/cancellation actor, and obligation effect | Do not pretend the package was never collected; do not auto-refund both children |
| FI-14 | Customer cancels while a protected release is pending | Completed evidence remains; release guard sees cancellation/dispute/hold | Obligation is held or disputed until policy resolution | Place/retain hold; use authorized refund/reversal/correction; append ledger event | Do not release because completion was previously proposed or because a timer elapsed |
| FI-15 | Technician no-show before start | Delivered parts or completed supply child remain completed/recorded | A3 attendance/no-show event; technician Need/Order failed or replacement-needed | Capture scheduled slot, attendance evidence, contact attempts, safety context; source replacement technician | Do not cancel the parts Order automatically or charge a new technician without acceptance |
| FI-16 | Technician starts then abandons job | Parts handoff and partial technician Work remain evidence | Technician Work failed/disputed; Order remains open or is explicitly cancelled; replacement scope records prior progress | Capture completed sub-work, safety state, artifacts, and required rework; new Need/Order if replacement is accepted | Do not mark complete from elapsed time; do not duplicate payment for work not done |
| FI-17 | Customer/site inaccessible at technician appointment | Upstream parts remain unaffected; technician attendance fact remains | A3 no-access/reschedule/cancellation policy applies to technician child | Record attempt, location/time, contact and reschedule decision; hold or resolve obligation per terms | Do not label provider no-show when evidence shows customer/site failure |
| FI-18 | Merchant cannot prepare after courier has been scheduled | Courier reservation/accepted terms remain independent but dispatch guard is rechecked | Merchant Work fails/blocks; courier dispatch is paused/cancelled explicitly; courier child not falsely collected | Notify impact; reschedule or replacement under each Order’s policy; release unneeded capacity | Do not mark readiness because a courier was booked; do not debit courier for a phantom dispatch |
| FI-19 | A required fan-in part arrives and another fails | Successful part child stays complete/accepted; its evidence and obligation stay | Downstream technician remains blocked; failed part Need is replacement-needed/failed | Explicit replacement or authorized waiver; update only affected dependency edges | Do not treat one of two inputs as “all ready”; do not auto-refund successful sibling |
| FI-20 | Replacement provider accepts while old provider’s child is still open | Old child history remains; no silent reassignment | Old Need/Order is cancelled/failed/superseded according to policy; new Need has `replaces_deal_need_id` and same Chain | Lock Chain/old Need/new Need; record lineage and affected dependencies; form ordinary new child Order | Do not overwrite old provider, child Order, terms, or payment recipient |
| FI-21 | Provider account is suspended after acceptance but before start | Accepted terms/history remain; activation gate blocks new irreversible action | Work/Need becomes blocked or operationally held; replacement/cancellation is explicit | Recheck capability/activation at execution; operations records reason and recovery | Do not silently transfer the Order to another provider/listing |
| FI-22 | Evidence upload fails, is quarantined, or is deleted under hold | State does not advance without required evidence; existing evidence/history stays | Work remains awaiting evidence/blocked; release remains ineligible | Retry safe upload; retain hash/scan/access audit; escalate to support if unavailable | Do not treat upload success or filename as completion; do not delete held evidence |
| FI-23 | Payment provider times out or returns mismatched amount/currency | Work/Orders remain unchanged; accepted obligations remain immutable | Payment event is pending/reconciliation-required/disputed; release/payout blocked | Query original provider effect identity; reconcile; append correction/refund if authorized | Do not retry with a new payment identity or mark paid from a screenshot |
| FI-24 | Parent/Deal Chain is cancelled with mixed child states | Completed children and their records remain; open children are not erased | Chain becomes cancelled with impact plan; each eligible child receives an explicit command | Derive partial status; resolve obligations/holds per child policies; retain all lineage | Do not cascade cancellation/refund/release/dispute or delete child truth |
| FI-25 | Downstream dependency is removed while upstream Work is complete | Completed upstream Work stays complete; its edge history is superseded | New graph version/edge status is explicit; downstream readiness is reevaluated | Chain lock, versioned dependency change, impact preview, authorized actor | Do not rewrite old evidence or make completed work satisfy a new unrelated transition |

### 4.1 Fault-isolation state rules

1. A failure event targets the smallest truthful aggregate: Work, Need, Order, obligation, evidence, or provider event. It may also create an operational hold, but it does not gain parent-wide authority merely because the aggregate is in one Chain.
2. A replacement is a new Need in the same Chain, with an explicit `replaces_deal_need_id` lineage and copied/validated requirements. It is not a new provider value written onto the old Need.
3. Downstream edges that referenced a failed Need are not silently satisfied. The replacement plan must explicitly supersede or redirect each relevant edge under the Chain lock.
4. If a child had actually started, return/repair/custody recovery must describe physical state. Cancellation is not a time machine.
5. Financial resolution is obligation-specific: release, hold, refund, reversal, dispute, cancellation, and external-cash acknowledgment follow the obligation’s lane and policy snapshot.

## 5. Malicious and fraudulent pattern matrix

Fraud controls must preserve ordinary marketplace access and avoid treating an anomaly score as a state transition. A signal creates a review/hold/rate-limit path; only an authorized command changes business state.

| ID | Attack or abuse | Preconditions / exploit | Preventive guard | Detection and response | Must never happen |
|---|---|---|---|---|---|
| FR-01 | Bid sniping at expiry | Provider submits seconds before quote expiry or exploits client clock skew | Server UTC `valid_until` check under lock; no browser timer authority; exact expiry boundary tests | Record submission/acceptance times; rate-limit suspicious bursts; review only under policy | An expired Quote or proposal becoming accepted because UI showed time remaining |
| FR-02 | Bid replay after withdrawal | Replays an old Quote/Proposal body and idempotency key after withdrawal/supersession | Current lineage/version/status and request hash checked; immutable version state machine | Stable stale conflict; audit replay; no new Order | Old terms being resurrected or silently reactivated |
| FR-03 | Bid spam / request denial of service | Many accounts flood open Request with speculative Quotes or invitations | Per-actor/request rate and size limits; bounded fan-out; sealed participant views; no partner notification for standard references | Metrics for quote volume, invitation volume, rejected limits; operations throttle | Spam changing eligibility or notifying unrelated providers |
| FR-04 | Collusive pricing ring | Buyer/provider alternate accounts submit fake competing offers to anchor price | Identity/account linkage signals, sealed offers where policy requires, immutable price/payout/subsidy fields, no self-acceptance; anomaly review | Correlate repeated devices/accounts/payment destinations/listing graphs; hold only with authorized reason | Automatic rejection based solely on a heuristic or exposing confidential competing terms |
| FR-05 | Self-dealing / fake provider | Requester controls lead and supposed partner accounts | Provider identity derived from authenticated actor; ownership/listing policy and party separation checked | Flag shared identity/contact/payment patterns; require operations review | A user assigning another account’s listing or accepting as both parties without policy |
| FR-06 | Phantom hardware attachment | Lead provider references a real merchant listing as though the part is guaranteed | Listing owner, published version, `STANDARD_AUTO_BIND` permission, unchanged quantity/price/schedule/terms, and capacity revalidated at acceptance | Audit source listing/version and attachment actor; reject mismatch | Creating a hardware Order, reservation, or customer charge from a proposal-only reference |
| FR-07 | Unauthorized partner exploitation | Lead changes a partner’s price, route, schedule, quantity, warranty, or payout | Any material custom term uses `CUSTOM_TERMS` and explicit invitation; partner accepts exact hash; changed version invalidates prior response | Alert repeated custom invites/declines; expire and cancel old invite | Silent partner binding, chat-only “consent,” or notification spam for standard references |
| FR-08 | Hidden discount/subsidy theft | Customer pays less while provider expects the normal amount | Store customer amount, provider payout, discount, funder, and separate subsidy obligation; exact partner consent | Reconcile node totals and obligations; hold mismatch | One `price` field hiding a provider shortfall or charging another child |
| FR-09 | Capacity hoarding | Attacker creates many checkout holds and lets them expire | Short configured hold lifetime, actor/session/account limits, idempotent expiry/release, no permanent preset reservations | Monitor held/expired ratio and repeated identities; operational release only through safe command | Negative capacity, permanent hold, or bypass by editing remaining quantity |
| FR-10 | Capacity oversell / last-item race | Parallel checkouts use stale remaining quantity | Row lock/CAS, quantity check and decrement in one transaction, partial uniqueness for active slot | Alert negative/failed invariant; reconcile reservations to bucket | Two committed Orders for one unit or overlapping active appointment slots |
| FR-11 | QR/handoff token replay | Reuses a screenshot/token for another transfer or actor | Opaque server token bound to exact Order/Need/transfer, actor pair, expiry, nonce/use state; verify under lock | Log replay/mismatch; dispute/hold affected child; no state change on invalid token | Token scan marking completion/payment or proving contents without an authorized action |
| FR-12 | Evidence forgery/tampering | Uploads altered receipt, packaging photo, or malware | Quarantine, type/size/signature/hash/scan checks, private access grants, retention holds; evidence is not authority by itself | Preserve original hash and access audit; mark suspicious; operations review | Screenshot becoming “provider verified” or unsafe active content being served |
| FR-13 | Payment webhook spoof/replay | Authentic-looking event has wrong owner, amount, currency, environment, or object | Verify canonical raw bytes/signature/replay window and bind object/owner/amount/currency/expected transition/effect key | Persist mismatch as `reconciliation_required`; no business effect; alert | Marking an obligation paid or releasing funds from an unbound webhook |
| FR-14 | Duplicate refund/release | Retries same command with different keys or races release/refund | Obligation lock, immutable financial transaction keyed to source event/effect, balanced ledger and release guards | Reconciliation detects mismatch; correction requires authorized maker/checker | Two payouts/refunds or edited posted ledger rows |
| FR-15 | Agent privilege escalation | Scoped agent submits a broad command or acts after revocation | Derive owner/acting-for context from authenticated grant; exact scope, target, version, and expiry rechecked immediately before mutation | Audit actor/grant/consent; deny and alert out-of-scope calls | Agent becoming listing owner, payer, recipient, custodian, or final authority |
| FR-16 | IDOR/privacy abuse | Courier or one provider guesses another child’s Order/evidence URL | Purpose-specific projections and policy checks at both grant and retrieval; private server keys and non-cacheable access | Log denial/download; test cross-chain and same-chain sibling access | Chain participation granting access to another provider’s evidence/payment/private terms |
| FR-17 | Notification amplification | A retry, replay, or standard reference emits partner messages | Outbox event identity and recipient-specific notification idempotency; standard auto-bind has no invitation/partner notification | Track notification fan-out per command and recipient | Speculative provider/customer identity disclosure or repeated spam |
| FR-18 | Dependency-cycle/graph DoS | Attacker submits large or mutually recursive graph edits | Chain lock, bounded graph size/depth, self/cross-chain/duplicate checks, cycle trigger, command limits | Track rejected graph edits and lock time; support recovery | Partially committing a cycle or hanging all chain execution |
| FR-19 | Stale projection manipulation | User sends an old “green” UI transition after graph/hold/listing changed | Expected versions and authoritative re-read in same mutation boundary | Return stable conflict with refresh path; log source versions | Cached status authorizing dispatch, completion, or payment |
| FR-20 | Provider impersonation / account takeover | Attacker submits quote or invitation response for another provider | Provider identity from auth; step-up and activation/identity status for sensitive actions; invitation bound to invited user | Security event and account hold; no state transition | Accepting an invitation or assigning payout to a user named only in request data |

### 5.1 Fraud test assertions

- A signal is never itself a financial, completion, acceptance, or cancellation decision.
- Holds freeze only the targeted transition/obligation and preserve safe reads, reconciliation, evidence retention, and authorized cancellation where policy allows.
- Every review/hold has actor, reason class, target, start/expiry or release condition, and audit/outbox causality.
- Confidential partner terms and citizen identity are not disclosed before the exact policy gate.
- A false-positive review can be resolved without rewriting accepted terms or deleting historical evidence.

## 6. Edge-case database invariant matrix

The database is a backstop, not the sole state-machine implementation. Application commands must validate actor, expected version, capability activation, policy, and transition; the database must still make invalid cross-row states impossible or fail atomically.

### 6.1 Identity, version, and amount invariants

| Invariant | Required database/application guard | Adversarial test |
|---|---|---|
| IDs and causality | Application-generated UUIDv7/native UUID; explicit FKs; operation-spanning records carry `correlation_id` | Try sequential/foreign-type IDs, missing parent, and event without causality; all reject |
| State values | `TEXT NOT NULL` plus named checks generated from the canonical state contract; transition command validates legal edges | Insert every unknown state and every illegal transition; no direct update bypass |
| Money | `BIGINT amount_minor >= 0`, `CHAR(3)` currency, no floats; signed effects use direction/entries | Negative, overflow, zero where quantity is required, mixed currency, and decimal coercion |
| Quantity and schedule | Positive quantity; `slot_end > slot_start` when both exist; UTC `TIMESTAMPTZ` | Zero/negative/overflow quantity, equal/reversed slot, timezone boundary |
| Business versions | Published listing/category/capability/quote/policy versions append-only; accepted references never repoint | Update published price/schedule in place; accepted snapshot must remain unchanged |
| Mutable versions | `row_version > 0`, expected-version/CAS increments exactly once | Two updates from same version; one commits, one conflict; retry does not increment twice |
| JSONB payloads | Bounded payload only; positive `payload_version`; validator/reader selected by type/version | Unknown or malformed Work/event payload is parked/unsupported with no business effect |
| Deletion | Financial, evidence, audit, transition, provider-event, dispute history `RESTRICT`; referenced content archived | Delete referenced rows and held evidence; reject and audit if legally permitted |

### 6.2 Requests, bids, proposals, and partner binding

The canonical implementation may represent bids as Quotes or proposal versions. If proposal-specific tables are introduced, enforce the following in the same transaction as version changes.

| Invariant | Hardening rule | Test oracle |
|---|---|---|
| Multiple offers per Request | Multiple Proposal/Quote lineages can be active under one Request; do not use one global “active proposal” flag | Three providers submit valid offers; all remain selectable until one contract wins |
| One active version per lineage | Partial unique index on Proposal lineage for `PROPOSED/COUNTERED/ACCEPTED` (or equivalent current statuses); old version superseded before new insert, under lineage lock | Two counters in parallel never leave two active versions |
| One accepted lineage per Request | Unique Contract/accepted lineage per Request (or equivalent partial unique guard before Contract table exists) | Two citizen acceptances form one Contract only; losing lineage has no child rows |
| Counteroffer semantics | New immutable version copies/changes terms; old version is superseded; current pointer and invitations update atomically | Chat message cannot alter price/scope; old acceptance does not apply to changed terms |
| Quote/request lineage | Request/Quote/Need composite lineage must match; expired/declined/withdrawn/superseded Quotes cannot form Orders | Cross-request Quote reference and expired Quote both fail |
| Exact totals | Server derives node and package display totals from line items in one currency; display total never settles | Tamper package total; accepted child amounts still match individual validated nodes |
| Listing reference | `CATALOG_REFERENCE` requires immutable `listing_version_id`; source version belongs to source listing; owner equals provider; terms hash matches | Attach another owner’s listing, closed version, changed quantity, or changed terms; reject |
| Standard auto-bind | Published listing + owner opt-in + `STANDARD_AUTO_BIND` + unchanged price/quantity/schedule/terms + unexpired authorization; no invitation/notification/reservation before acceptance | Proposal creates no partner-side row or alert; acceptance revalidates all facts |
| Custom terms | Price, scope, schedule, quantity, route, payment, or obligation change requires invitation with exact terms hash and expiry; terms edit invalidates prior response | Partner accepts V1; lead creates V2; citizen cannot accept V2 until re-confirmed |
| Partner invitation identity | Invitation targets exactly one Need/version/provider; unique active invitation semantics and acceptance idempotency are enforced | Same response replay, response by wrong provider, expired/revoked response |
| Provider payout versus customer amount | Store customer amount, provider payout, discount, discount funder, and separate subsidy obligation | ₱40 customer/₱60 provider arrangement reconciles; one field cannot hide ₱20 |

### 6.3 Deal Chain, Need, and dependency invariants

| Invariant | Required guard | Test oracle |
|---|---|---|
| Chain is not commerce | No parent payment obligation, financial account, pooled balance, parent escrow, or automatic split FK | Attempt to post parent-level money; reject or keep outside canonical model |
| Need identity | Need is one service/product slot; `need_kind` is only canonical supported values; no chat/checkpoint fake Need | Same listing selected twice creates two Need IDs and separate child Orders |
| One active child | Partial unique index on `orders(deal_need_id)` excluding `cancelled`/`closed` (current migration uses this pattern); application CAS under Need/Chain lock | Different keys concurrently form at most one active child |
| Same-chain lineage | Composite FKs prove `(deal_chain_id, deal_need_id)` for Requests, Quotes, Orders, and replacement lineage | Cross-chain Need/Order/Quote/replacement insert fails |
| Replacement lineage | `replaces_deal_need_id` must prove the predecessor belongs to the same Chain; a single-column FK is insufficient. Use a composite FK or deferred trigger checking same Chain | Attempt replacement from Chain A pointing to Need in Chain B; no row commits |
| Replacement history | Old Need/Order/evidence/obligation remains; new Need points to old; old Need becomes `superseded` only with a recorded replacement command | Recovery never overwrites provider/price/terms or deletes old history |
| Dependency shape | Same Chain, distinct endpoints, `dependency_type='blocks'`, active-edge uniqueness; only named transition is blocked | Self-edge, cross-chain edge, duplicate active edge, unsupported condition all fail |
| Cycle safety | Chain row lock plus sorted Need locks and deferred reachability/cycle trigger; DB trigger alone is not concurrency proof | Two opposite edges concurrently cannot both commit a cycle |
| Condition registry | `condition_code` maps to source fact, target transition, authority, accepted contract/version, revocation, and missing-proof behavior; unknown code refuses activation | Free text/unknown condition cannot dispatch, complete, release, or mark satisfied |
| Fan-in | Every active required predecessor condition must be satisfied; failed/cancelled/superseded is not satisfied; optional/waived input needs an explicit resolution | One of two inputs fails; downstream remains blocked |
| Graph version | Dependency edit and consuming command carry expected Chain/Need/edge versions and re-read under lock | Queued old start cannot use removed/changed edge |
| Chain roll-up | Parent status/cost/progress is derived and role-filtered; cannot overwrite child truth | Stale projection cannot authorize child mutation; sibling private data is hidden |

### 6.4 Listing, capacity, and last-item invariants

- A capacity bucket is identified by `(listing_id, listing_version_id, capacity_type, resource_key)` and has a named unique guard. The bucket version and listing version must be mutually consistent.
- Holds and commits use the same command scope/idempotency identity, positive quantity, expected bucket version, and one atomic decrement/lock. A commit attaches a reservation to exactly one Order; a failed final formation rolls it back or releases it exactly once.
- Active quantity cannot become negative. Reconciliation must compare bucket `remaining_quantity` with the sum of active/committed reservations and report, not silently repair, any discrepancy.
- Active slot/resource reservations cannot overlap. The current exact-tuple unique index prevents duplicate identical `(bucket,start,end)` rows but does **not** by itself prove that two different time ranges do not overlap. If slot capacity is enabled, use a PostgreSQL exclusion constraint/range representation or an equivalent locked overlap check in the authoritative command and test adjacent, equal, nested, and partially overlapping intervals.
- Expiry/release/commit are idempotent terminal transitions. A scheduler racing checkout must not restore the same quantity twice or commit an expired hold.
- External inventory synchronization cannot overwrite a held/committed marketplace reservation. It creates a reconciled discrepancy or a versioned capacity event.
- A listing preset or partner recommendation never permanently reserves capacity; checkout-time offer/reservation is short-lived and exact.

### 6.5 Order, Work, obligation, evidence, and dispute invariants

- Accepted Order has one exact final terms snapshot with the same Order identity. The source listing/Quote/policy/category/capability versions are explicit.
- A child Order carries both Deal Chain and Need lineage or neither; `origin='deal_chain'` requires both. Non-chain Orders cannot smuggle chain IDs.
- Work belongs to exactly one Order and retains `shape_code`, shape contract version, payload schema version, row version, evidence, and event history. An obligation→Work link must prove the same Order through a composite relationship or command-level guard.
- An Order cannot close while required Work is incomplete or required obligations are unresolved, unless policy explicitly records external settlement/dispute/waiver.
- Work `completed` requires shape-specific evidence and authorization and is blocked by active safety/fraud/legal holds. Payment events cannot reach it indirectly.
- Payment obligations remain one-lane and order-scoped. Multiple obligations on one Order are allowed only when the archetype/policy explicitly defines them; no obligation silently changes purpose or currency.
- Posted financial entries are append-only and balanced per currency. Corrections create linked compensating transactions; no posted row update/delete.
- Evidence is private, quarantined until scan/type/size/signature checks pass, access-controlled at grant and retrieval, and protected by retention holds. A file upload or receipt screenshot is never completion or provider verification by itself.
- Dispute/hold rows target the smallest applicable Order/Work/obligation and retain evidence, actors, response windows, and resolution. A Chain membership is not a blanket access or liability scope.

### 6.6 Idempotency, outbox, inbox, and provider event invariants

| Record | Database guard | Required behavior |
|---|---|---|
| Command idempotency | Unique `(scope,key)`; request hash/fingerprint, actor, response reference/status, expiry; scoped to target/command/acting-for/client where applicable | Same key + same semantic input replays the committed response; same key + changed input returns conflict; no key is dedupe for unrelated commands |
| Aggregate event | Unique event ID and `(aggregate_type, aggregate_id, sequence)`; append-only | Sequence increments once; a duplicate event is a no-op; future sequence parks as gap |
| Outbox | Unique `event_id`; aggregate type/ID, payload version, correlation/causation, audit reference, attempts/status | Mutation/audit/idempotency/outbox intent commit together; publisher retry cannot create a second business effect |
| Consumer inbox | Unique `(consumer,source_event_id)` and `(consumer,aggregate_type,aggregate_id,aggregate_sequence)`; statuses `received`, `processing`, `processed`, `gap`, `unsupported`, `dead_letter` | Apply only the next sequence; repeats are safe; unknown payload is parked without acknowledgment as business success |
| Provider event | Unique `(provider,provider_event_id)` plus canonical effect key and object binding | Duplicate/out-of-order/mismatched events are no-op, reconciled, or queued; never duplicate financial effects |
| Financial transaction | Unique source-event/idempotency identity; posted status only through guarded posting procedure; debits equal credits per currency | Replay cannot post twice; mismatch blocks release and creates operational discrepancy |
| Notification delivery | Source event/effect and recipient/channel/attempt identity; delivery retries separate from business command | A notification retry does not repeat Order/payment/Work transition or disclose extra data |

Correlation IDs are for causality and tracing only. Many valid events can share one correlation ID, and a retry may have a different correlation ID; neither case changes the stable idempotency/event identity.

## 7. State-machine QA map

Run transition tests from every canonical state, including illegal and repeated commands. The state machine must reject unknown status values at both application and database boundaries.

| Aggregate | Canonical states to exercise | Critical transition assertions |
|---|---|---|
| Deal Chain | `draft`, `planning`, `sourcing`, `in_progress`, `partially_complete`, `blocked`, `completed`, `cancelled`, `archived` | `close_chain` requires every required Need complete or explicitly resolved; parent cancellation records impact and never silently cancels children |
| Deal Need | `draft`, `open`, `sourcing`, `invited`, `quoted`, `accepted`, `in_progress`, `blocked`, `completed`, `failed`, `cancelled`, `replacement_needed`, `superseded` | Invitation acceptance does not create an Order; child formation is explicit; replacement creates a new Need and preserves old history |
| Dependency | `active`, `removed`, `superseded` | Only named transition is blocked; removed/superseded edge cannot satisfy readiness; cycles/self/cross-chain reject |
| Invitation | `draft`, `sent`, `viewed`, `accepted`, `declined`, `expired`, `revoked`, `superseded`, `cancelled` | Actor, scope, exact version, expiry, and idempotency guard every response; reusing a prior acceptance after terms change fails |
| Listing | `draft`, `pending_review`, `active`, `paused`, `unavailable`, `expired`, `archived`, `rejected` | Archived/invalid listing cannot form a new Order; accepted snapshots are unaffected by later pause/archive |
| Order | `draft`, `pending_acceptance`, `accepted`, `cancel_requested`, `cancelled`, `closed` | Order closure requires terminal Work and obligation; cancellation preserves evidence/obligation/dispute |
| Work | `not_started`, `scheduled`, `in_progress`, `completion_proposed`, `awaiting_signoff`, `completed`, `disputed`, `cancel_requested`, `cancelled`, `failed` | Readiness/handoff does not skip completion guards; active safety/fraud/legal hold blocks completion; only one completion decision wins |
| Payment obligation | `created`, `due`, `reported`, `awaiting_confirmation`, `counterparty_confirmed`, `provider_verified`, `disputed`, `held`, `eligible_for_release`, `released`, `paid_out`, `refunded`, `partially_refunded`, `reversed`, `cancelled`, `superseded` | Lane-specific evidence and release guards apply; refund/release race is serialized; provider event cannot be trusted by shape alone |
| Capacity reservation | `held`, `committed`, `released`, `expired` | Terminal transition is idempotent; quantity restored exactly once; committed reservation cannot be reused for another Order |
| Outbox | `pending`, `published`, `failed`, `dead_letter` | Publish retries preserve event ID and payload hash; dead-letter is recoverable by attributable replay |
| Inbox | `received`, `processing`, `processed`, `gap`, `unsupported`, `dead_letter` | No business acknowledgment before durable effect; future/unknown versions do not regress projections |

### 7.1 Illegal-transition catalogue

At minimum, assert rejection/no-effect for:

- `draft` Need completion without opening/sourcing/accepted terms;
- invitation acceptance by a non-invitee, after expiry/revocation, or for a superseded version;
- child Order creation from invitation acceptance alone;
- second active child Order for one Need;
- Order closure while required Work or obligation is unresolved;
- Work completion from payment success, upload success, readiness, or notification delivery alone;
- payment release from Order creation, readiness, QR scan, or elapsed creation time;
- dependency satisfaction from a failed, cancelled, superseded, or merely existing predecessor;
- graph edit without current Chain version or with a cycle/self-edge/cross-chain Need;
- acceptance of stale listing/quote/proposal version or expired offer;
- standard auto-bind with changed terms or policy; custom terms without partner acceptance;
- capacity commit after expiry or with another listing/version/order;
- release/refund while active dispute, hold, mismatch, or unreconciled provider outcome blocks it;
- post-revocation Agent command; offline/AI/client-projection command without current server authority;
- evidence deletion under active retention hold; posted ledger row mutation;
- direct state update using an unknown status or bypassing transition/audit/outbox creation.

## 8. Fault-injection and recovery test plan

### 8.1 Transaction boundary probes

Inject a controlled exception at each write boundary for final child formation:

1. before source/listing validation;
2. after source/version lock;
3. after capacity hold/commit;
4. after Order update;
5. after terms snapshot;
6. after Work insert;
7. after obligation insert;
8. after audit insert;
9. after outbox insert;
10. after idempotency success but before commit.

For every probe, assert that the outer transaction rolls back all business, capacity, audit, idempotency, and outbox writes. Then rerun with the same command key and assert one clean success. A nested transaction/savepoint must not accidentally commit a child reservation before the final formation transaction commits.

### 8.2 Post-commit probes

- Crash after commit/before publisher: pending outbox row is visible and eventually publishable; no second Order or obligation is created.
- Crash after event publication/before consumer acknowledgment: inbox/source identity makes retry a no-op or resumes safely.
- Consumer worker lease expiry: another worker may recover `processing` only after a safe lease condition; neither worker applies a duplicate effect.
- Provider timeout after request acceptance: reconciliation queries the original provider object/effect ID; no new charge/refund/payout is submitted blindly.
- External provider returns a later contradictory event: append the event and place the obligation in reconciliation/dispute as required; do not overwrite earlier financial history.
- Capability disablement after Order acceptance: reject new irreversible commands, but preserve reads, support, evidence retention, reconciliation, authorized cancellation, and safe completion where the policy permits.

### 8.3 Property/stateful tests

Generate bounded random sequences of valid and invalid commands over a small Chain with two or three Needs. Include duplicate, reordered, stale, expired, unauthorized, and conflicting commands. The model oracle must assert:

- active dependency graph remains acyclic;
- each Need has ≤1 active child Order;
- each child Order belongs to exactly one Chain/Need lineage or no Chain at all;
- no accepted terms mutate;
- no capacity goes below zero or is restored twice;
- parent status is derivable from child state and never becomes an authorization source;
- event sequences are monotonic per aggregate;
- every financial effect is exactly-once by stable effect identity and balanced by currency;
- every failure leaves enough history to reconstruct what physically happened.

## 9. Observability and operational evidence

A passing QA result must be diagnosable without reading application logs alone. Emit or retain:

- command name, actor, acting-for user, client/integration, target, expected/current versions, idempotency scope/key hash, correlation/causation, and retryability;
- lock wait/deadlock/serialization retry counts and the aggregate/resource IDs involved;
- source listing/version, capacity bucket/version, reservation ID, Need/Chain graph version, and selected condition code;
- transition event ID, aggregate sequence, payload/contract versions, event hash, and outbox/inbox status;
- obligation lane, source payment/provider event identity, amount/currency/account binding, reconciliation result, and hold/release reason;
- evidence hash, scan/quarantine/access decision, retention hold, and dispute linkage;
- replacement lineage, old/new Need IDs, superseded edge IDs, and impact plan;
- user-visible stable error code and refresh/recovery action.

Metrics should distinguish:

- stale version conflicts from capacity unavailability;
- idempotent replay from idempotency conflict;
- outbox delivery failure from business command failure;
- provider reconciliation mismatch from customer dispute;
- blocked dependency from failed child;
- standard auto-bind references from custom invitations;
- completed upstream children from active downstream failures.

Alerting must not itself mutate business state. Operator remediation must be an attributable command with current authorization and, for money/release/correction/holds, the required maker/checker approval.

## 10. Implementation-entry checklist

### Required before Deal-Chaining activation

- [ ] All standard and custom partner binding rules are implemented server-side; standard references do not notify/reserve/bind early.
- [ ] Proposal lineage/version model has one active version per lineage and one accepted lineage per Request.
- [ ] Final acceptance locks Request/lineage/Chain/Needs/source listings/capacity in the documented order and forms all child Orders atomically.
- [ ] Child formation cannot create two active Orders for one Need under different keys.
- [ ] Same-chain composite lineage and replacement constraints reject cross-chain data. In particular, a single-column replacement FK is not enough.
- [ ] Cycle checks run under the Chain lock and have a database backstop; concurrent opposite-edge tests pass.
- [ ] Product quantity and service-slot capacity tests pass under parallel sessions; overlapping slot windows are rejected, not only identical tuples.
- [ ] Readiness, handoff, Work completion, sign-off, payment, release, and payout are distinct transitions with distinct evidence and guards.
- [ ] Courier, parts, customer-cancellation, technician-no-show, no-access, mismatch, and provider-suspension recovery paths preserve completed upstream history.
- [ ] Replacement Needs and edges are explicit, same-Chain, versioned, and do not rewrite old providers or Orders.
- [ ] Aggregate mutation, audit, idempotency success, and outbox intent commit atomically; crash-after-commit recovery is proven.
- [ ] Inbox consumers enforce source-event and aggregate-sequence uniqueness, park gaps/unknown versions, and are replay-safe.
- [ ] Provider webhook/payment effects are authentic, object/owner/amount/currency-bound, idempotent, and reconciled before irreversible release.
- [ ] Evidence privacy/retention, same-Chain sibling IDOR, active-content quarantine, and dispute holds are tested.
- [ ] Agent/activation revocation is rechecked immediately before queued irreversible effects.
- [ ] Capability disablement and rollback preserve safe reads, reconciliation, evidence, and explicit recovery for already accepted children.

### Evidence package for sign-off

1. Targeted Pest/domain and database constraint tests for every `CON-*`, `FI-*`, and `FR-*` P0/P1 case.
2. A PostgreSQL two-session concurrency transcript showing lock order, winner/loser, retry, final rows, and no oversell/duplicate child.
3. A transaction fault-injection report showing rollback at every write boundary and outbox recovery after commit.
4. A consumer replay/reordering report showing duplicate, gap, unsupported, and dead-letter behavior.
5. A provider timeout/reconciliation report proving no blind duplicate money effect.
6. Browser/UX evidence for stale acceptance, capacity conflict, partner-confirmation pending, partial chain completion, replacement, and dispute states.
7. Catalog/constraint comparison against the canonical schema manifest, including partial unique indexes, composite FKs, cycle checks, and slot-overlap protection.
8. A red-team report for phantom attachments, unauthorized partner binding, bid replay/sniping, collusion signals, QR replay, webhook spoofing, and same-chain sibling privacy.
9. Restore/replay evidence proving append-only audit, outbox, inbox, evidence, obligation, and replacement history survives recovery.

## 11. Source reconciliation and known implementation boundaries

The database foundation already expresses several important guards: Deal dependency same-chain FKs, self-edge checks, active-edge uniqueness, a cycle trigger, Order lineage checks, a partial unique active-child index, capacity bucket/version uniqueness, reservation idempotency uniqueness, provider-event identity uniqueness, idempotency `(scope,key)`, outbox event identity, and inbox source/aggregate-sequence uniqueness. Those structures are necessary but are not proof that every application command follows the lock, authorization, or transaction protocol.

The current direct Order proposal/finalization path is not evidence that user-facing Deal-Chaining child formation is complete. A direct proposal stores chain identifiers as null, while the canonical Deal-Chaining path requires explicit Need/Chain lineage and independent child formation. Do not use direct-booking smoke tests as proof of multi-node acceptance.

The current capacity schema’s exact-slot unique index is not sufficient to prove non-overlap for distinct time ranges; the implementation entry gate must add an exclusion/locked overlap invariant before A3 slot capacity is relied upon. The current Need replacement foreign key must be strengthened or guarded so a replacement cannot point to another Chain. These are database-hardening requirements, not reasons to weaken the architectural separation.

## 12. Bottom line

The acceptance criterion is not “the happy-path package checkout works.” It is:

> Under concurrency, stale input, provider failure, malicious replay, worker crash, and partial completion, the system creates only authorized independent child agreements, preserves truthful history, keeps money one-to-one with those children, and exposes a recoverable state without inventing completion, custody, partner consent, or liability.

If a scenario has no explicit guard, authoritative owner, state transition, evidence requirement, rollback/compensation rule, and test oracle in this document or the canonical contracts, that behavior must remain unavailable rather than being inferred from a UI diagram or a convenient database row.

### References

- [Deal-Chaining logic soundness review](17-deal-chaining-logic-soundness-review.md)
- [Listing extensions, partnered Deal-Chaining, and buyer substitution](18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md)
- [Deal-Chaining and bidding schema evaluation](19-advisor-deal-chaining-and-bidding-schema-evaluation.md)
- [Role-oriented bidding and partner extensions evaluation](20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md)
- [Canonical schema implementation and ERD contract](07-schema-implementation-and-erd-contract.md)
- [Canonical domain/state contracts](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md)
- [Architecture spine](../../_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md)
