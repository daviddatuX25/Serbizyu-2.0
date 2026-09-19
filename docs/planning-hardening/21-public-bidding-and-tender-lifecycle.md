# Serbizyu 2.0 — Public Bidding, Sealed Bidding, and Sourcing Tender Lifecycle

**Document reference:** `docs/planning-hardening/21-public-bidding-and-tender-lifecycle.md`  
**Status:** PROPOSED HARDENING SPECIFICATION — requires founder/domain/schema review before migration or pilot activation  
**Date:** 2026-09-08  
**Scope:** Citizen-created sourcing requests, Open/Public Tenders, Sealed Tenders, and Direct Invite Tenders from draft through award, contract formation, and unfulfilled/expired recovery.

> This document is a downstream specification. It does not authorize a production migration, connected money, legal escrow, cryptographic sealing, or pilot activation. Existing canonical artifacts and the recovery charter remain authoritative until this specification is reviewed and propagated.

## 1. Executive decision

A **Sourcing Tender** is a request for a citizen-defined service or product outcome. It uses the existing `requests → quotes → orders` contract. The user-facing word **Bid** is an alias for a `quotes` response; a second canonical `bids` table is not introduced.

A tender has one of three visibility/participation modes:

| User-facing mode | Canonical `tender_mode` | Meaning |
|---|---|---|
| Public Bidding / Open Tender | `open_tender` | Any eligible, verified local provider may discover and submit a response during the response window. |
| Sealed Bidding | `sealed_tender` | Eligible providers may respond, but bid content and competitor signals are hidden until the response window closes. This is application-level access control, not a cryptographic commitment unless a later security decision adds one. |
| Direct Invite | `direct_invite` | Only explicitly invited eligible providers may see the request and respond. It is not publicly discoverable. |

The modes share the same tender, bid/version, authorization, expiration, selection, and contract-finalization machinery. Only the read projections, invitation requirements, and privacy policy differ.

### 1.1 Existing model preserved

The current schema already has:

- `requests` with requester, category, capability profile, description/item list, budget, timing, location, status, expiry, privacy, and safety fields;
- `quotes` with provider, request, amount, scope, inclusions/exclusions, validity, work shape, payment-lane options, and response status;
- `orders`, immutable order terms, Work Instances, Payment Obligations, audit events, outbox messages, and idempotency records;
- Deal-Chain foundations (`deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`) for later multi-provider coordination.

The tender extension adds explicit mode/phase/timeline and bid-lineage semantics without manufacturing a composite listing or a pooled parent order.

### 1.2 Non-negotiable invariants

1. A tender is a request, not a listing owned by Serbizyu. A listing remains owned by one merchant/provider.
2. One request may have many concurrent provider bid lineages. Exactly one bid lineage may be awarded for an ordinary tender.
3. One bid lineage has at most one active submitted version. Amendments create immutable new `quotes` rows and supersede the old version.
4. Closing or expiring a tender freezes new submissions. It never silently awards the cheapest bid.
5. Acceptance is an explicit citizen decision. Ranking, sorting, or score assistance may be shown, but no automatic winner is selected.
6. Bid acceptance and child-order creation are one guarded contract-finalization operation. A failed finalization leaves the tender and competing bids unchanged.
7. An accepted multi-node bid creates independent ordinary child Orders. Each child Order owns its own Work, Payment Obligations, evidence, dispute, cancellation, and audit boundary.
8. There is no tender-level Payment Obligation, wallet, pooled balance, or parent escrow. Payment attaches one-to-one to each child Order.
9. A readiness fact such as `ready_for_collection` activates a named downstream dependency; it does not complete the upstream Work Instance or Order.
10. Public catalog references may use `STANDARD_AUTO_BIND` when the listing policy, immutable version, price, quantity, schedule, and terms still match. No speculative partner notification is sent. `CUSTOM_TERMS` requires explicit partner confirmation before contract finalization.
11. Every mutation has an actor, optional acting-for Owner, authorization/consent, expected version, idempotency key, correlation ID, audit event, and transactional outbox intent.
12. Privacy projections must fail closed. A non-invited user must not learn that a Direct Invite Tender exists by changing a URL or identifier.

## 2. Terminology and aggregate boundaries

### 2.1 Tender

A Tender is a `requests` aggregate with `mechanism = reverse_bidding` (or the approved equivalent) and a non-null `tender_mode`. It owns:

- the citizen's need and sourcing deadline;
- category and capability requirements;
- budget meaning and visibility policy;
- safe/private location and media policy;
- eligibility snapshot and response limits;
- Tender phase, close/expiry reason, selection deadline, and selected bid reference.

It does **not** own provider Work, payment, payout, or child-order completion.

### 2.2 Bid and bid version

A **Bid** is a provider's response to a Tender and is persisted as one or more `quotes` rows. A bid lineage groups revisions from one provider for one Tender. Each revision is immutable.

- `bid_lineage_id` groups one provider's alternative/response history.
- `quote_version` remains the request-local immutable quote identity already present in the schema.
- `revision_no` is monotonic within a bid lineage.
- `supersedes_quote_id` points to the prior version when an amendment is submitted.
- `status = submitted` identifies the one current active version in a lineage.
- A withdrawal terminalizes the lineage; a later response, if policy permits, starts a new lineage rather than silently reviving the withdrawn terms.

The term **bid** is presentation vocabulary. A `quote` remains the canonical commercial response and accepted source for normal Order formation.

### 2.3 Tender modes are not listing types

`open_tender`, `sealed_tender`, and `direct_invite` are sourcing/visibility mechanisms. They do not create new Listing Types, Work Shapes, or Payment Lanes. The selected response must resolve into an approved Work Shape such as A1 Linear Project, A3 Appointment, A4 Handoff, or A9 Digital Delivery. A7 Quoted/Negotiated is contract formation, not an execution state machine.

## 3. Citizen tender creation

### 3.1 Required draft fields

A citizen may create a Tender as a draft and save it before publishing. The API must reject publication until all required fields and media checks pass.

| Field | Required contract | Notes |
|---|---|---|
| `category_id` + pinned category version | Yes | Category classifies discovery and safety. It does not create a category-specific state machine. |
| `title` | Yes | Short, neutral summary; no private phone/address data. |
| `description` / problem scope | Yes | Plain-language problem, desired result, constraints, inclusions, exclusions, and acceptance evidence. |
| `item_list` or structured scope | Conditional | Required for product sourcing; optional for service requests. May contain quantities, units, acceptable substitutes, and brand/model constraints. |
| `capability_profile_id` + version | Yes | Required capability family and safety/data requirements. The profile is snapshotted at publication. |
| `photos` | Optional but recommended | Stored as `evidence_files` attached to the request with purpose `tender_photo`. See media contract below. |
| `target_budget` | Optional by policy, but strongly recommended | `amount_minor`, `currency`, and `budget_semantics`; never interpret an estimate as a hard cap without the explicit semantic. |
| `location` | Yes for physical work | Coarse area for discovery; precise address is protected until the policy/contract allows disclosure. |
| `timing` | Yes | Desired service window, not merely tender deadline. |
| `sourcing_timeline` | Yes | Preset or custom response and selection deadlines, stored in UTC. |
| `tender_mode` | Yes | Open, sealed, or direct invite. Mode is immutable after publication. |
| `safety_preferences` | Conditional | No-entry, safe meeting location, category restrictions, and contact/privacy boundaries. |
| `payment_lane_options` | Yes | Available lanes are displayed before bidding; a bid may select only enabled lanes. This does not authorize connected money. |
| `visibility_preferences` | Yes | Budget, location, photos, and requester identity disclosure are field-level choices subject to minimum safety policy. |

### 3.2 Problem-scope contract

The request editor must collect enough detail for a provider to decide whether to respond without requiring a private chat first:

1. **Outcome:** what should be true when the job is done.
2. **Current condition:** symptoms, measurements, known damage, or item requested.
3. **Deliverables:** specific output, quantity, dimensions, service level, or handoff.
4. **Constraints:** materials, brands, access restrictions, schedule, language, safety, or location boundaries.
5. **Exclusions:** work/items explicitly not requested.
6. **Evidence:** what completion evidence the citizen expects (photo, receipt, test, sign-off, artifact delivery).
7. **Clarification path:** providers can ask questions without editing the citizen's request.

The server stores query-critical fields relationally where they are used for authorization or filtering. JSON is limited to bounded versioned scope extensions; every such payload has a `payload_version` and validator.

### 3.3 Photos and evidence

Photos are not public bytes by default. The media contract is:

- upload through the existing evidence pipeline with MIME, size, malware, active-content, and hash checks;
- strip EXIF/GPS metadata from public/eligible-provider derivatives;
- reject or quarantine government IDs, faces, or unrelated private documents unless the approved safety/data policy permits them;
- store `data_class`, `purpose`, `subject_type=request`, `subject_id`, uploader, scan status, retention, and access policy;
- public/open projections return only a sanitized derivative when `public_photo = true`;
- private photos may be visible to the citizen, authorized admin, and eligible/selected provider according to the mode policy;
- a photo cannot be deleted while a retention hold or active dispute requires it; deletion is audited and does not erase the event history.

A photo upload or scan failure must not publish a Tender. A citizen may save a draft while a scan is pending.

### 3.4 Budget semantics

The target budget must have an explicit meaning:

| `budget_semantics` | Meaning | Provider behavior |
|---|---|---|
| `target` | Citizen's desired amount; reasonable over/under responses are allowed. | Bid must show exact amount and reason for variance. |
| `ceiling` | Citizen does not authorize a bid above the amount without a revised request. | Server rejects or marks an over-ceiling bid as non-compliant; citizen may not accidentally accept it. |
| `range` | Citizen provides a lower and upper target. | Bid outside range requires an explicit warning and citizen acknowledgment. |
| `estimate` | Citizen expects help estimating the job. | Providers must mark assumptions; acceptance still uses an exact quoted amount. |
| `undisclosed` | Budget is withheld from providers. | Allowed only for Open/Sealed policy variants; citizen still sees exact bid amounts. |

Amounts use integer minor units and an explicit ISO currency. The server recomputes totals from normalized bid lines; clients cannot alter a displayed total by editing JSON.

### 3.5 Timeline presets

Timeline settings are copied from a versioned sourcing policy at publication. The examples below are defaults, not promises of provider availability:

| Preset | Response window | Selection window after response close | Intended use | Default notices |
|---|---:|---:|---|---|
| `emergency_24h` | 24 hours | 2 hours | Urgent household repair or safety-sensitive need. | Publish, midpoint reminder at 12h, close/selection notice. |
| `community_7d` | 7 days | 48 hours | Non-urgent neighborhood sourcing with comparison time. | Publish, 72h reminder, 24h remaining reminder, close/selection notice. |
| `custom` | Policy-bounded | Policy-bounded | Only where the citizen chooses a permitted duration. | Server derives notices from the policy version. |

Rules:

- All timestamps are `TIMESTAMPTZ` in UTC; the UI may display the citizen's locale.
- `response_deadline_at > published_at`; `selection_deadline_at > response_deadline_at`.
- A citizen may shorten the response window only while the Tender is open. A material extension creates an auditable timeline amendment and does not reopen a closed Tender.
- An emergency Tender cannot silently convert to a seven-day Tender; the citizen must explicitly amend while open.
- The deadline is a sourcing deadline, not a Work completion deadline. The accepted Order has its own schedule and Work state.

### 3.6 Publish validation

`publish_tender` succeeds only when:

1. requester is authenticated and allowed to create a request;
2. category and capability versions are active and compatible;
3. physical category has a valid area/safety policy;
4. scope and budget semantics validate;
5. all media is scanned or intentionally omitted;
6. response/selection deadlines satisfy policy bounds;
7. mode-specific visibility rules do not expose a precise address or sensitive media;
8. Direct Invite has at least one intended invitee or a controlled draft invitation plan;
9. the provider eligibility query can be evaluated from the capability/profile version;
10. an idempotency record, audit event, and outbox publication intent are written in one transaction.

Open/Sealed publication may warn that no currently eligible local provider is known; the citizen must acknowledge the low-supply warning. Direct Invite publication requires a concrete invite list.

## 4. Participation and provider eligibility

### 4.1 Who may bid

A provider or authorized Agent may submit a response only if all applicable conditions pass at submission time:

- account is active and not suspended or category-blocked;
- required identity verification tier is approved;
- a current active `capability_profile` covers the requested category, Work Shape, safety class, and area;
- a provider-owned active listing/version is supplied where the mechanism requires a listing reference;
- service area and desired Work window are compatible;
- capacity/availability is not known to be unavailable;
- provider is not the requesting citizen unless an explicit self-dealing policy enables it (default: reject);
- provider has not exceeded Tender/provider/category rate limits;
- Agent action is covered by an unexpired Owner consent grant with the required scope; the Agent is recorded but never becomes the provider/owner;
- Direct Invite provider is the intended invitee and the invitation is current;
- required safety attestations and category restrictions pass.

Eligibility is evaluated again during acceptance. A provider being eligible at submission does not reserve capacity or guarantee acceptance.

### 4.2 Eligibility snapshot and revalidation

At publication, the system stores a versioned eligibility/policy snapshot sufficient to explain why a provider was discoverable. At bid submission, it stores provider/profile/listing version references. At citizen acceptance, it revalidates:

- provider identity/status and capability;
- listing/version publication and owner;
- quote validity and schedule;
- capacity, route, service area, and policy activation;
- any required partner confirmation.

A failed revalidation returns a specific `409`/`422` error and leaves all tender and bid states unchanged.

### 4.3 Concurrent bids and alternatives

Concurrency is expected:

- many providers may submit concurrently;
- one provider may submit one active lineage by default;
- a Tender may opt into multiple alternatives per provider using `max_active_bid_lineages_per_provider` (default `1`, policy maximum `3`);
- each alternative must have a distinct `alternative_key` and explicit inclusions/exclusions;
- every lineage has at most one active `submitted` version;
- the citizen can select at most one lineage for an ordinary Tender, including only one alternative from the same provider;
- submitted version count is not bid count; UI counts lineages, not amendments;
- concurrent provider submissions do not lock one another; request-level locking is reserved for close, deadline, selection, and contract finalization.

The citizen may compare scope, price, schedule, evidence, capability, and safety facts. The server must not label the lowest amount as the winner or fabricate a quality score.

### 4.4 Bid contents

A submitted Bid must include:

- `request_id`, provider/acting-for context, and current policy/profile versions;
- amount lines with quantity, unit, currency, and `amount_components`;
- scope, inclusions, exclusions, assumptions, and requested clarifications;
- Work Shape and proposed schedule/capacity;
- validity/`expires_at`, which cannot exceed the Tender selection policy;
- payment-lane options among those enabled by the Tender;
- source listing/version, `pricing_mode`, and terms hash when applicable;
- optional multi-node plan with provider/listing references, dependencies, and per-node amounts;
- `STANDARD_AUTO_BIND` or `CUSTOM_TERMS` for every referenced third-party node;
- evidence expectations and cancellation/change meaning;
- provider acknowledgment that the response is not an Order until the citizen accepts and contract finalization succeeds.

The server recalculates totals and validates that provider/customer amounts, currency, quantity, and terms hashes agree. Chat messages can explain a Bid but are never the terms source.

### 4.5 Amendments

A provider may amend a current Bid only while the Tender phase is `open` and before the response deadline:

1. lock Tender and current lineage using expected versions;
2. verify the provider still qualifies;
3. mark the prior quote version `superseded`;
4. copy unchanged terms and apply the amendment into a new immutable quote version;
5. recalculate totals and terms hash;
6. invalidate partner consent if any material node/term changed;
7. create a new outbox/audit event and notify only permitted parties;
8. leave the new version `submitted`.

Material changes include price, scope, quantity, schedule, provider/listing, payment lane, cancellation, or evidence terms. A material amendment is shown as an amendment to the citizen; it is not silently substituted.

After `closed_for_bids`, a provider cannot amend. If the citizen needs changed scope, the Tender must be cancelled/replaced or explicitly reopened under a policy that preserves all history. An accepted/locked Bid cannot be amended; post-contract changes require an Order amendment, cancellation/replacement, or a new Tender.

### 4.6 Withdrawals

A provider may withdraw its current lineage while the Tender is `open` and before the response deadline. Withdrawal:

- records actor, reason, timestamp, and current quote version;
- marks the current version `withdrawn` and the lineage terminal;
- preserves all prior versions and audit history;
- removes the provider's Bid from active comparison/counts;
- does not notify competitors;
- permits a fresh lineage only when the Tender policy allows resubmission and the provider remains within limits.

After response close, withdrawal is disabled by default. An exceptional admin withdrawal requires reason, audit, and an explicit citizen notice; it does not silently change a selected contract.

The citizen may cancel the Tender. That is distinct from provider withdrawal and records an impact plan for every active Bid/invitation.

## 5. State contracts

### 5.1 Tender phase state machine

`requests.status` remains the existing coarse request lifecycle (`draft`, `published`, `sourcing`, `quoted`, `accepted`, `expired`, `cancelled`, `closed`). A new `tender_phase` gives the sourcing lifecycle precise meaning. Non-Tender requests leave `tender_phase = null`.

| Tender phase | Meaning | Existing request status projection |
|---|---|---|
| `draft` | Editable; no provider access. | `draft` |
| `scheduled` | Published for a future start time; no responses yet. | `published` |
| `open` | Eligible providers may discover/respond. | `sourcing` |
| `paused` | Temporarily no new bids; citizen may resume before deadline. | `sourcing` |
| `closed_for_bids` | Response window closed; no new submissions/amendments. | `quoted` |
| `selection_open` | Citizen may inspect/review eligible current Bids. | `quoted` |
| `contract_pending` | Selection command passed initial guards; finalization is creating one contract and its Orders. | `accepted` only within the finalization transaction |
| `awarded` | Contract and required child Orders committed. | `accepted` |
| `unfulfilled` | No award by deadline/selection expiry, or all responses invalid/withdrawn. | `expired` |
| `cancelled` | Citizen/admin cancelled before award, or policy cancelled after a failure. | `cancelled` |
| `archived` | Terminal history retained; no new actions. | `closed` |

Allowed transitions:

| From | Command/event | To | Guard/effect |
|---|---|---|---|
| `draft` | `publish_tender` | `scheduled` or `open` | Publish validation; future start determines `scheduled`. |
| `scheduled` | `start_tender` | `open` | Scheduler verifies policy/deadline; idempotent. |
| `open` | `pause_tender` | `paused` | Citizen/admin policy; reason required; no new bids while paused. |
| `paused` | `resume_tender` | `open` | Citizen; current deadline and eligibility still valid. |
| `open`/`paused` | `close_tender` | `closed_for_bids` | Citizen early close; locks response writes. |
| `open` | `response_deadline_reached` | `closed_for_bids` | Scheduler CAS under Tender lock. |
| `closed_for_bids` | `open_selection` | `selection_open` | At least one current non-withdrawn/non-expired Bid; reveal policy applied. |
| `closed_for_bids` | `mark_unfulfilled` | `unfulfilled` | No eligible current Bid; no award. |
| `selection_open` | `accept_bid` | `contract_pending` | Citizen authorized; selected Bid current, valid, revalidated. |
| `contract_pending` | `contract_finalized` | `awarded` | All required child Orders/terms/obligations atomically created. |
| `contract_pending` | `contract_failed` | `selection_open` | No partial effects; specific conflict recorded. |
| `selection_open` | `selection_deadline_reached` | `unfulfilled` | No selection; never auto-award. |
| any nonterminal before award | `cancel_tender` | `cancelled` | Citizen/admin reason and impact plan. |
| `unfulfilled`/`cancelled`/`awarded` | `archive_tender` | `archived` | Retention/history rules satisfied. |

A close/expiry operation is compare-and-set (CAS). A concurrent submission either commits before the close lock and is considered, or receives `TENDER_CLOSED`; it is never half-visible.

### 5.2 Bid lineage/version state machine

The existing `quotes.status` values are retained and interpreted as follows:

| Quote status | Meaning | Terminal? |
|---|---|---:|
| `draft` | Provider-only unsent draft. | No |
| `submitted` | Current active version in a Bid lineage. | No |
| `superseded` | Prior version replaced by an amendment. | Yes |
| `withdrawn` | Provider withdrew the lineage/version. | Yes |
| `expired` | Validity expired before selection, or Tender selection ended. | Yes |
| `accepted` | Selected current version; may proceed only through contract finalization. | Terminal after lock |
| `declined` | Not selected, citizen declined, Tender cancelled, or contract not awarded. `decision_code` explains which. | Yes |

Transitions:

- `draft → submitted` via `submit_bid`;
- `submitted → superseded` via `amend_bid`, with a new version becoming `submitted`;
- `submitted → withdrawn` via provider `withdraw_bid` while open;
- `submitted → expired` via validity/Tender deadline worker;
- `submitted → accepted` only in the citizen selection/finalization transaction;
- other current submitted lineages → `declined` with `not_selected` after the selected contract commits;
- `accepted →` no further Bid mutation; Order/Work state is separate.

An amendment never changes the old row. The current version is found by the lineage's one-row partial unique `submitted` index.

### 5.3 Direct invitation state machine

`request_invitations` use:

`draft → sent → viewed → accepted` or `declined`, `expired`, `revoked`, `superseded`, `cancelled`.

Invitation acceptance means only “this provider may inspect/respond.” It does not form an Order. A provider may still decline to Bid.

### 5.4 Contract and child-order consequence

For a normal single-provider Bid:

```text
accept current quote
  → create one Order and immutable order_terms_snapshot
  → create that Order's Work Instance(s)
  → create one Payment Obligation per enabled obligation/lane
  → mark quote accepted/locked and Tender awarded
```

For a multi-node Bid:

```text
accept one Bid lineage
  → create one coordination DealChain (derived parent only)
  → create one DealNeed per required node
  → create one ordinary child Order per billable provider/node
  → create one Payment Obligation per child Order
  → preserve each child Work/evidence/dispute/cancellation boundary
```

The finalization transaction either creates all required child Orders and exact terms or creates none. A later child failure does not cancel, refund, release, or reassign another child automatically.

## 6. Closing, expiry, and selection

### 6.1 Citizen closes early

The citizen may close an `open` or `paused` Tender before its response deadline:

- response writes are frozen immediately under a Tender lock;
- current provider Bid versions are snapshotted for comparison;
- active invitations become `cancelled` or `superseded` according to mode;
- if no eligible current Bid remains, phase becomes `unfulfilled` with `close_reason = citizen_closed_no_bids`;
- if at least one eligible Bid remains, phase becomes `selection_open` and a selection deadline is calculated from the policy;
- closing early does not reveal sealed Bid content until the sealed reveal point;
- providers receive only their own outcome/status according to the privacy matrix.

The UI must distinguish “closed for new responses” from “awarded.” Closing is not acceptance.

### 6.2 Automatic expiration

A scheduler scans indexed `(tender_phase, response_deadline_at)` rows. Each due Tender is locked and processed once:

1. set `closed_for_bids`;
2. expire any current Bid whose validity has ended;
3. compute eligible current lineages;
4. transition to `selection_open` if any remain, otherwise `unfulfilled`;
5. set `selection_deadline_at` where applicable;
6. write audit/outbox events and notices.

At selection deadline, if the citizen has not selected a Bid, the Tender becomes `unfulfilled`; it is never automatically awarded, even when one Bid is cheapest or only one remains.

### 6.3 Citizen accepts one Bid

`accept_bid` is a single idempotent command:

1. authenticate citizen/authorized Agent and verify Tender ownership/consent;
2. lock Tender, selected quote lineage/version, and all current competing lineages;
3. verify phase `selection_open`, expected versions, quote validity, policy, and no prior award;
4. revalidate provider/capability/listing/version, schedule, capacity, service area, safety, and payment-lane eligibility;
5. validate all multi-node terms and `STANDARD_AUTO_BIND`/`CUSTOM_TERMS` gates;
6. if a custom partner confirmation is pending, return `PARTNER_CONFIRMATION_REQUIRED` without changing Bid outcomes;
7. create immutable Order terms and all required ordinary child Orders/Work/Payment Obligations in one transaction;
8. mark selected current quote `accepted`, then `locked` through the finalization boundary;
9. mark all other current active Bid lineages `declined` with `decision_code = not_selected`; preserve withdrawn/expired history unchanged;
10. mark Tender `awarded`, write audit and outbox records, then deliver mode-appropriate notifications after commit.

A duplicate request with the same idempotency key returns the original award result. A different payload using the same key is rejected.

### 6.4 Competing bids after award

| Competing response state at award | Result |
|---|---|
| Current `submitted` | `declined`, `decision_code = not_selected`; provider sees only the permitted outcome. |
| Prior `superseded` version | Remains historical `superseded`. |
| `withdrawn` | Remains `withdrawn`; no further transition. |
| `expired` | Remains `expired`; no further transition. |
| Draft not submitted | Remains private to provider; no outcome notification. |
| Pending Direct Invite | `cancelled`/`superseded` invitation; no competitor disclosure. |

If finalization fails due to stale capacity, listing closure, provider suspension, or partner confirmation, no competing response is declined and the citizen remains in `selection_open` with a precise recovery action.

### 6.5 Readiness is not completion

For a selected multi-node Tender:

- upstream provider may emit `ready_for_collection` when the goods/work are prepared;
- this event satisfies only the named dependency and can enable a courier/installer child Order;
- it does not set upstream Work to `completed`, close its Order, or prove payment;
- each child Order still requires its own Work evidence, sign-off/completion, payment declaration/confirmation, dispute and hold evaluation.

## 7. Transparency versus privacy matrix

**Open** means open participation and public-safe request discovery, not an unrestricted public price book. **Sealed** hides Bid content/signals until the response window closes. **Direct Invite** hides the Tender from non-invitees. Field-level policy is evaluated per actor and data class.

Legend: **Full** = exact value; **Coarse** = generalized/sanitized value; **Own** = actor's own row only; **Count** = aggregate count without identity/terms; **After close** = available only when `selection_open`; **Never** = not exposed by this projection.

### 7.1 Request and identity fields

| Data field | Anonymous public — Open | Eligible provider — Open | Anonymous public — Sealed | Eligible provider — Sealed | Non-invited user — Direct Invite | Invited provider — Direct Invite | Citizen/requester — all modes |
|---|---|---|---|---|---|---|---|
| Tender exists/status | Coarse | Full eligible view | Coarse metadata if policy publishes existence | Full eligible view | Never/non-enumerating | Full | Full |
| Category/title | Coarse | Full | Coarse | Full | Never | Full | Full |
| Problem scope | Safe summary only | Full safe scope | Safe summary or policy-redacted | Full safe scope | Never | Full invite scope | Full |
| Inclusions/exclusions | Never | Full | Never before close | Full own eligible scope | Never | Full invite scope | Full |
| Photos | Public sanitized derivative only if opted in | Sanitized derivative; private attachments only if policy allows | Never by default | Sanitized/private according to eligibility | Never | Invite-policy derivative/private | Full, including private files subject to evidence policy |
| Target budget | Only if citizen opts into public budget | Per budget visibility setting | Never unless policy explicitly publishes a range | Per sealed budget policy; exact hidden if configured | Never | Invitation projection | Full exact target |
| Coarse area | Yes if public | Yes | Optional/coarse | Yes | Never | Coarse before contract; exact only when authorized | Full |
| Exact address/contact | Never | Never before award/consent | Never | Never before award/consent | Never | Never before award/consent | Full; requester controls own data |
| Response/selection deadlines | Yes | Yes | Yes | Yes | Never | Yes | Full |
| Requester identity | Display/pseudonym only if opted in | Display/pseudonym; exact contact withheld | Never or pseudonym per policy | Pseudonym/display only | Never | Display/pseudonym | Full own identity |
| Safety instructions | Public-safe subset | Full relevant safety policy | Public-safe subset | Full relevant safety policy | Never | Full relevant safety policy | Full |

### 7.2 Bid and award fields

| Data field | Anonymous public — Open | Other providers — Open | Bidder's own row | Citizen before close — Sealed | Other providers — Sealed | Citizen after close — Sealed | Invited provider — Direct Invite | Public after award |
|---|---|---|---|---|---|---|---|---|
| Bid count | Anonymized count if citizen enabled it | Count only if policy enables; no identities | Own status; no competitor signal | Count only, not terms/identity | Never | Full count and all eligible current bids | Own status; no other invitees | Award count/summary only |
| Exact amount/line items | Never | Never by default | Full own current version/history | Never before close | Never | Full current versions and permitted history | Full own current version/history | Winning amount only if citizen opts in/public policy |
| Scope/schedule/validity | Never | Never by default | Full own | Never before close | Never | Full current bids | Full own | Winning contract summary only |
| Provider identity/profile | Winning provider only after award/public policy | Own only | Full own | Never before close | Never | Full provider facts for comparison | Own; no other invitees | Winning provider public profile only if permitted |
| Amendment history | Never | Never | Own history | Never before close | Never | Current + historical versions where needed for audit/comparison | Own history | Never for losing bids |
| Withdrawal reason | Never | Never | Own reason | Never before close | Never | Citizen may see exact reason; public does not | Own reason | Never |
| Ranking/score | No fabricated score | No competitor rank | Own compliance signals | No ranking before close | No hints | Comparable facts; no automatic winner | Own compliance signals | Award result only |
| Losing-bid terms/identity | Never | Never | Never | Never before close | Never | Citizen/admin only, least privilege | Never | Never |
| Audit/correlation/idempotency values | Never | Never | Own reference only | Never | Never | Admin/audit projection only | Own reference only | Never |

### 7.3 Administrative access

Admins/support may access exact tender, invitation, Bid, media, and transition history only under an authorized operational purpose. Every read of sealed/private Bid content is audited. Admin access does not change selection authority; an admin cannot award without a controlled override policy, reason, approval, and audit event.

### 7.4 Privacy rules by mode

- **Open Tender:** public/eligible projections may expose safe request facts, but exact addresses, private photos, direct contact, competitor exact terms, and private audit data remain protected. A winning provider's public profile is revealed only according to the citizen's disclosure choice and platform policy.
- **Sealed Tender:** before close, the citizen sees only receipt/count (not exact provider/price/scope); each provider sees its own submission only; no endpoint, notification, sorting, or error may reveal competitor terms. After close, the citizen receives a comparison projection; losing details remain private to the citizen/admin and are not published.
- **Direct Invite:** non-invitees receive a non-enumerating 404/403-equivalent projection. Invitees cannot see the invite list or each other's terms. A standard catalog reference does not notify the referenced provider before citizen acceptance; custom terms issue an explicit partner confirmation invitation.

## 8. Database schema and integrity contract

This section is a proposed schema delta over the existing canonical 58-table planning baseline. It must be propagated to `canonical-schema-rebuilt.md`, the schema implementation contract, ERD, migration manifest, domain-state contract, and story/OpenSpec artifacts before implementation.

### 8.1 Reused canonical tables

| Table | Tender use |
|---|---|
| `users`, `user_profiles`, `identity_verifications` | Requester/provider identity and verification. |
| `categories`, `category_versions` | Category and immutable taxonomy version. |
| `capability_profiles` | Provider capability/area/safety eligibility and request requirements. |
| `listings`, `listing_versions`, `listing_capacity`, `listing_capacity_reservations` | Provider-owned source listings and acceptance-time capacity checks. |
| `requests` | Tender aggregate and lifecycle. |
| `quotes` | Bid lineage versions and accepted commercial response. |
| `evidence_files` | Request photos, bid evidence, and access/retention metadata. |
| `orders`, `order_parties`, `order_terms_snapshots` | Final agreement and independent child Orders. |
| `work_instances`, `work_events` | Separate Work lifecycle and readiness/completion evidence. |
| `payment_obligations`, `payment_events` | One-lane, child-Order-scoped payment obligations. |
| `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations` | Multi-node accepted Bid coordination only; no parent money. |
| `audit_events`, `outbox_messages`, `idempotency_keys`, `notifications`, `notification_deliveries` | Attributed history, async publication, replay safety, and notices. |

### 8.2 `requests` additions

Existing request fields remain (`requester_user_id`, `category_id`, `capability_profile_id`, `description`, `item_list`, `budget_amount_minor`, `budget_currency`, `timing`, `location`, `status`, `expires_at`, `privacy_preferences`, `safety_preferences`, lineage fields, version, correlation, timestamps). Add query-critical tender fields:

```text
mechanism TEXT NULL
  CHECK mechanism IS NULL OR mechanism IN ('quote_request', 'reverse_bidding')

tender_mode TEXT NULL
  CHECK tender_mode IS NULL OR tender_mode IN ('open_tender', 'sealed_tender', 'direct_invite')

tender_phase TEXT NULL
  CHECK tender_phase IS NULL OR tender_phase IN (
    'draft', 'scheduled', 'open', 'paused', 'closed_for_bids',
    'selection_open', 'contract_pending', 'awarded',
    'unfulfilled', 'cancelled', 'archived'
  )

tender_policy_version UUID NULL REFERENCES policy_versions(id)
category_version_id UUID NULL REFERENCES category_versions(id)
capability_profile_version INTEGER NULL
budget_semantics TEXT NULL
  CHECK budget_semantics IS NULL OR budget_semantics IN ('target', 'ceiling', 'range', 'estimate', 'undisclosed')
budget_upper_amount_minor BIGINT NULL CHECK (budget_upper_amount_minor >= 0)
visibility_policy_version INTEGER NULL
response_starts_at TIMESTAMPTZ NULL
response_deadline_at TIMESTAMPTZ NULL
selection_deadline_at TIMESTAMPTZ NULL
published_at TIMESTAMPTZ NULL
closed_at TIMESTAMPTZ NULL
closed_by_user_id UUID NULL REFERENCES users(id)
close_reason TEXT NULL
selected_quote_id UUID NULL
max_active_bid_lineages_per_provider SMALLINT NOT NULL DEFAULT 1
allow_bid_amendments BOOLEAN NOT NULL DEFAULT TRUE
allow_resubmit_after_withdrawal BOOLEAN NOT NULL DEFAULT FALSE
budget_visibility TEXT NOT NULL DEFAULT 'request_policy'
location_visibility TEXT NOT NULL DEFAULT 'coarse_until_award'
requester_visibility TEXT NOT NULL DEFAULT 'pseudonymous'
row_version INTEGER NOT NULL DEFAULT 1
```

Cross-row checks/triggers must enforce:

- Tender fields are non-null together when `mechanism = reverse_bidding`;
- `response_deadline_at > response_starts_at` and selection deadline is later;
- budget upper bound is not below target/ceiling where both are present;
- Direct Invite has at least one active invitation before publication;
- `selected_quote_id` belongs to the same Request and is the only accepted quote;
- only allowed phase transitions can change `tender_phase`;
- `status` is a compatibility projection, not an alternate uncontrolled state machine;
- request lineage (`deal_chain_id`, `deal_need_id`) remains all-or-none and composite-FK valid.

`expires_at` may be retained as a compatibility alias for `response_deadline_at`; new code must use the explicit response deadline and record the alias consistently.

### 8.3 `quotes` additions for Bid lineages

Existing quote fields remain (`request_id`, `listing_id`, `provider_user_id`, `quote_version`, amount/currency, amount components, scope, inclusions/exclusions, `expires_at`, `work_shape`, payment-lane options, status, Deal-Chain lineage, version, correlation, timestamps). Add:

```text
bid_lineage_id UUID NULL
revision_no INTEGER NULL
supersedes_quote_id UUID NULL REFERENCES quotes(id)
alternative_key TEXT NULL
submitted_at TIMESTAMPTZ NULL
withdrawn_at TIMESTAMPTZ NULL
withdrawal_reason TEXT NULL
decision_code TEXT NULL
terms_hash BYTEA NULL
source_listing_version_id UUID NULL REFERENCES listing_versions(id)
pricing_mode TEXT NULL
  CHECK pricing_mode IS NULL OR pricing_mode IN ('own_quote', 'standard_auto_bind', 'custom_terms')
partner_confirmation_state TEXT NOT NULL DEFAULT 'not_required'
  CHECK partner_confirmation_state IN ('not_required', 'pending', 'accepted', 'declined', 'countered', 'expired', 'cancelled')
acting_for_user_id UUID NULL REFERENCES users(id)
row_version INTEGER NOT NULL DEFAULT 1
```

Tender-only constraints:

```sql
-- Exactly one current submitted version per provider lineage.
CREATE UNIQUE INDEX uq_quotes_one_submitted_version_per_lineage
ON quotes (request_id, bid_lineage_id)
WHERE bid_lineage_id IS NOT NULL AND status = 'submitted';

-- At most one accepted quote for a request.
CREATE UNIQUE INDEX uq_quotes_one_accepted_per_request
ON quotes (request_id)
WHERE status = 'accepted';

-- Immutable lineage version identity.
CREATE UNIQUE INDEX uq_quotes_lineage_revision
ON quotes (request_id, bid_lineage_id, revision_no)
WHERE bid_lineage_id IS NOT NULL;
```

A constraint trigger/command guard must prove that all rows in a lineage have the same Request and provider, that `supersedes_quote_id` belongs to the same lineage, and that `revision_no` increases by one. Configurable maximum active lineages per provider is enforced in the locked application command because a normal database check cannot compare against a per-request policy value.

For ordinary non-Tender quote requests, the existing lifecycle remains valid; the new Bid lineage fields may be null.

### 8.4 `request_invitations`

Direct Invite requires an ordinary-request invitation record; `deal_invitations` is reserved for a `deal_need` and cannot be reused by a standalone request.

```text
request_invitations
-------------------
id UUID PRIMARY KEY
request_id UUID NOT NULL REFERENCES requests(id) ON DELETE RESTRICT
invited_provider_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
acting_for_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
scope_snapshot JSONB NOT NULL
payload_version INTEGER NOT NULL DEFAULT 1
status TEXT NOT NULL
  CHECK status IN ('draft', 'sent', 'viewed', 'accepted', 'declined',
                   'expired', 'revoked', 'superseded', 'cancelled')
expires_at TIMESTAMPTZ NOT NULL
responded_at TIMESTAMPTZ NULL
response_note TEXT NULL
row_version INTEGER NOT NULL DEFAULT 1
correlation_id UUID NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Indexes/constraints:

- partial uniqueness for one active invitation per `(request_id, invited_provider_user_id)`;
- `(invited_provider_user_id, status, expires_at)` for inbox discovery;
- `expires_at > created_at`, status/time consistency, payload version positive;
- no destructive deletion while referenced by audit/history;
- scope snapshot contains only fields permitted for pre-award invite visibility.

### 8.5 Media, privacy, and audit

`evidence_files` must accept `subject_type = request` and `purpose = tender_photo` (plus bid evidence where approved). Access is resolved at read time from current Tender phase, mode, actor, invitation, selection, retention hold, and purpose. Public URLs never expose storage keys.

All Tender/Bid/Invitation transitions use the shared append-only event/audit contract. Event payloads include aggregate type/id, aggregate sequence, event/payload contract versions, actor/acting-for, client, source/target version, reason, correlation, causation, and idempotency reference. Outbox publication is in the same transaction as the state mutation.

### 8.6 Schema safety rules

- PostgreSQL `TEXT + CHECK` is preferred over business PostgreSQL enums so state changes remain migration-reviewable.
- UUIDv7/native UUID, UTC `TIMESTAMPTZ`, integer minor units, explicit currency, and optimistic row versions follow the existing schema contract.
- Financial, evidence, audit, transition, invitation, and dispute history uses restrictive deletion behavior.
- Sealed privacy is enforced by server-side policy/projection and audited access. This specification does not claim cryptographic bid commitment; such a guarantee needs a separate threat model and key-management decision.
- No `tender_payment_obligations`, parent wallet, pooled escrow, automatic split, or composite listing table may be added.

## 9. API contract

All mutating endpoints require authentication, an `Idempotency-Key`, correlation context, and `If-Match`/expected aggregate version where the resource is mutable. Responses return the canonical state, version, and a safe next-action projection. Errors use the existing application envelope style with a correlation reference.

### 9.1 Citizen/requester endpoints

| Method | Endpoint | Purpose | Guard |
|---|---|---|---|
| `POST` | `/api/v1/tenders` | Create draft with category/scope/budget/timeline/mode. | Authenticated citizen/Agent with request permission. |
| `GET` | `/api/v1/tenders/{tender}` | Requester projection including private scope/media and phase. | Owner, authorized Agent, selected parties, or admin. |
| `PATCH` | `/api/v1/tenders/{tender}` | Edit draft; edit permitted open timeline fields before close. | Expected version; no accepted/locked terms. |
| `POST` | `/api/v1/tenders/{tender}/photos` | Upload/attach tender photo through evidence pipeline. | Owner/consented Agent; scan required. |
| `POST` | `/api/v1/tenders/{tender}/publish` | Validate and publish/open or schedule. | Draft; mode/timeline/policy checks. |
| `POST` | `/api/v1/tenders/{tender}/pause` | Pause response intake. | `open`; owner/admin reason. |
| `POST` | `/api/v1/tenders/{tender}/resume` | Resume response intake. | `paused`; deadline still valid. |
| `POST` | `/api/v1/tenders/{tender}/close` | Close early for bids. | `open`/`paused`; reason optional/required by policy. |
| `POST` | `/api/v1/tenders/{tender}/cancel` | Cancel before award. | No committed contract; impact plan. |
| `GET` | `/api/v1/tenders/{tender}/bids` | Compare current eligible Bids. | Sealed returns count/pre-close projection only; full after close. |
| `GET` | `/api/v1/tenders/{tender}/bids/{bid}` | View one Bid/version history. | Requester/admin; bidder only for own row. |
| `POST` | `/api/v1/tenders/{tender}/bids/{bid}/accept` | Select and finalize one Bid. | `selection_open`; exact quote/version and expected Tender version. |
| `POST` | `/api/v1/tenders/{tender}/invites` | Create/send Direct Invite. | `direct_invite`; invitee eligibility and mode policy. |
| `GET` | `/api/v1/tenders/{tender}/timeline` | Safe transition/audit timeline. | Role-filtered; sealed details withheld pre-close. |

`POST /bids/{bid}/accept` must not first set a loose `accepted` flag and then call a second Order endpoint. The endpoint invokes one finalization command. If the product keeps a two-step UI, the first step is preview only; the final command remains atomic.

### 9.2 Provider/Agent endpoints

| Method | Endpoint | Purpose | Guard |
|---|---|---|---|
| `GET` | `/api/v1/tenders/discover` | Pull eligible Open/Sealed Tenders by category/area/timing. | Provider eligibility, rate limit, no Direct Invite leakage. |
| `GET` | `/api/v1/tenders/{tender}/respond` | Provider-safe response form/projection. | Open/Sealed eligible or accepted Direct Invite. |
| `POST` | `/api/v1/tenders/{tender}/bids` | Create a draft or submit a Bid. | Eligibility, limits, phase open, idempotency. |
| `PATCH` | `/api/v1/tenders/{tender}/bids/{bid}` | Save provider-only draft. | Own lineage; not submitted. |
| `POST` | `/api/v1/tenders/{tender}/bids/{bid}/submit` | Submit current draft version. | `open`, eligibility and terms validation. |
| `POST` | `/api/v1/tenders/{tender}/bids/{bid}/amend` | Supersede current version with immutable amendment. | Before response deadline; expected version. |
| `POST` | `/api/v1/tenders/{tender}/bids/{bid}/withdraw` | Withdraw current lineage. | Before close unless admin policy. |
| `GET` | `/api/v1/me/bids` | Own Bid history across Tenders. | Own rows only; no competitor data. |
| `GET` | `/api/v1/invitations/{invitation}` | Direct Invite safe detail. | Invited provider or sender. |
| `POST` | `/api/v1/invitations/{invitation}/accept` | Accept invitation to inspect/respond. | Invitation current; does not create Order. |
| `POST` | `/api/v1/invitations/{invitation}/decline` | Decline invitation. | Invited provider/consented Agent. |

### 9.3 Internal/scheduler commands

These are authenticated worker commands, not public API promises:

- `start_scheduled_tender(tender_id, expected_version)`;
- `expire_due_tenders(now, bounded_batch)`;
- `expire_due_bids(now, bounded_batch)`;
- `expire_due_invitations(now, bounded_batch)`;
- `open_selection_after_close(tender_id)`;
- `expire_unselected_tenders(now, bounded_batch)`.

Each worker uses the same transition command and idempotency/event/outbox contract as a user request. A worker retry cannot duplicate notifications, awards, Orders, or child obligations.

### 9.4 Response projections

A response always includes:

```json
{
  "id": "uuid",
  "tender_phase": "selection_open",
  "tender_mode": "sealed_tender",
  "version": 4,
  "response_deadline_at": "2026-09-15T00:00:00Z",
  "selection_deadline_at": "2026-09-17T00:00:00Z",
  "next_actions": ["review_bids", "accept_bid", "mark_unfulfilled"],
  "correlation_id": "safe-reference-only"
}
```

Private payloads, storage identifiers, other providers' terms, and sealed Bid fields are omitted rather than null-filled in unauthorized projections. Direct Invite existence is non-enumerating.

### 9.5 Error contract

Minimum stable codes:

- `TENDER_NOT_FOUND_OR_NOT_VISIBLE`
- `TENDER_NOT_OPEN`
- `TENDER_CLOSED`
- `RESPONSE_DEADLINE_PASSED`
- `SELECTION_DEADLINE_PASSED`
- `PROVIDER_NOT_ELIGIBLE`
- `CAPABILITY_PROFILE_MISMATCH`
- `IDENTITY_VERIFICATION_REQUIRED`
- `INVITATION_REQUIRED`
- `INVITATION_EXPIRED`
- `BID_LIMIT_REACHED`
- `BID_VERSION_CONFLICT`
- `BID_ALREADY_WITHDRAWN`
- `BID_EXPIRED`
- `PARTNER_CONFIRMATION_REQUIRED`
- `CAPACITY_UNAVAILABLE`
- `LISTING_NO_LONGER_AVAILABLE`
- `SCHEDULE_UNAVAILABLE`
- `CONTRACT_FINALIZATION_CONFLICT`
- `DUPLICATE_IDEMPOTENCY_KEY`

Errors must not disclose a Direct Invite Tender to an unauthorized actor. Stale/version conflicts are retryable; eligibility/privacy denials are not automatically retried.

## 10. Sequence diagrams

### 10.1 Open/Public Tender with concurrent responses and early close

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant API as Tender API
    participant T as Request/Tender
    participant A as Provider A
    participant B as Provider B
    participant W as Expiry worker
    participant F as Contract finalizer
    participant O as Orders/Outbox

    Citizen->>API: POST draft (category, scope, photos, budget, timeline)
    API->>T: Save draft + evidence references
    Citizen->>API: POST publish
    API->>T: Validate policy, snapshot eligibility, phase=open
    API-->>Citizen: Open Tender + response deadline

    par Concurrent provider responses
        A->>API: POST Bid V1
        API->>T: Validate A capability/listing/limits
        API-->>A: submitted (own status)
    and
        B->>API: POST Bid V1
        API->>T: Validate B capability/listing/limits
        API-->>B: submitted (own status)
    end

    A->>API: POST amend Bid V1 -> V2
    API->>T: Supersede V1, insert immutable V2
    API-->>A: V2 submitted; V1 historical

    Citizen->>API: POST close early
    API->>T: CAS open -> closed_for_bids
    API->>T: Compute eligible current lineages
    API-->>Citizen: selection_open + comparison projection

    Citizen->>API: POST accept Bid B/V1
    API->>F: Lock tender, Bid, capacity, partner gates
    F->>F: Revalidate terms and provider eligibility
    F->>O: Create accepted terms + one/more ordinary child Orders
    O->>T: Mark selected accepted; competing active bids declined
    O->>T: phase=awarded + audit/outbox
    API-->>Citizen: Award + child Order references
    API-->>A: Not selected (privacy-safe)
```

If finalization fails at revalidation, the finalizer rolls back all effects and returns the Tender to `selection_open`; Provider A remains submitted and is not silently declined.

### 10.2 Sealed Tender close, reveal, and selection

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant API as Tender API
    participant T as Sealed Tender
    participant A as Provider A
    participant B as Provider B
    participant W as Scheduler

    Citizen->>API: Publish sealed Tender
    API->>T: phase=open; sealed policy snapshot
    A->>API: Submit sealed Bid A
    API->>T: Store encrypted-at-rest/private terms
    API-->>A: Own receipt only
    B->>API: Submit sealed Bid B
    API->>T: Store private terms
    API-->>B: Own receipt only

    Citizen->>API: GET bids before close
    API-->>Citizen: Count/status only (no price, identity, scope, rank)
    A->>API: GET Tender
    API-->>A: Tender facts + own Bid only

    W->>T: response_deadline_reached
    T->>T: CAS open -> closed_for_bids -> selection_open
    T-->>Citizen: Reveal event + comparison becomes available
    T-->>A: Response window closed; own outcome pending
    T-->>B: Response window closed; own outcome pending

    Citizen->>API: GET bids after close
    API-->>Citizen: Full eligible comparison and provider facts
    Citizen->>API: Accept one current Bid
    API->>T: Atomic award/finalize; decline other active lineages
```

The application must not expose competitor terms through counts, sort order, notification text, validation errors, timing, or an unfiltered audit endpoint. This is a privacy contract, not a claim that database administrators cannot access stored data.

### 10.3 Direct Invite and sourcing without spam

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant API as Tender API
    participant I as Request invitation
    participant P as Invited provider
    participant L as Provider listing policy
    participant F as Finalizer
    participant C as Child Orders

    Citizen->>API: Create direct-invite Tender
    Citizen->>API: Invite Provider P
    API->>I: sent + scoped snapshot
    API-->>P: Invitation notification
    P->>API: Accept invitation
    API->>I: accepted (eligibility still required)
    P->>API: Submit Bid with nodes

    Note over P,L: A standard catalog reference is pre-authorized only when policy/version/price/quantity/schedule/terms match.
    API->>L: Validate STANDARD_AUTO_BIND
    L-->>API: No speculative partner notification

    Note over P,F: A custom partner term cannot silently bind another provider.
    API->>F: Detect CUSTOM_TERMS node
    F->>I: Create explicit partner confirmation invitation
    I-->>P: Pending confirmation (or partner receives scoped invite)
    P->>F: Confirm exact custom terms

    Citizen->>API: Accept Bid
    API->>F: Revalidate all nodes/capacity/consents
    F->>C: Create independent child Order per required node
    F-->>Citizen: Tender awarded; no pooled parent payment
```

A standard reference never sends a speculative message to the referenced provider or exposes the citizen's identity before acceptance. Custom terms create an explicit, attributable confirmation boundary.

### 10.4 Multi-node award, readiness handoff, and independent settlement

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant F as Contract finalizer
    participant S as DealChain coordinator
    participant Seller as Child Order 1: Seller
    participant Courier as Child Order 2: Courier
    participant W as Work/event outbox
    participant Pay as Per-order Payment Obligations

    Citizen->>F: Accept one multi-node Bid
    F->>S: Create derived Chain + Need 1/Need 2
    F->>Seller: Create ORD-101 + exact terms + obligation 1
    F->>Courier: Create ORD-102 + exact terms + obligation 2
    F-->>Citizen: Award committed; two independent Orders

    Seller->>W: Work event ready_for_collection
    W->>S: Evaluate named dependency
    S->>Courier: Enable/notify dispatch for ORD-102
    Note over Seller,Courier: ready_for_collection triggers the next node; it does not complete ORD-101.

    Seller->>W: Submit evidence/propose completion
    Citizen->>W: Sign off or report concern
    W->>Pay: Evaluate only ORD-101 obligation guards
    Courier->>W: Fulfill delivery and submit evidence
    Citizen->>W: Sign off or report concern
    W->>Pay: Evaluate only ORD-102 obligation guards
```

There is no parent payment obligation or pooled escrow balance in this flow. A failure/dispute on ORD-102 does not rewrite ORD-101 history.

## 11. Notifications, jobs, and observability

### 11.1 Notification policy

- Open discovery is primarily pull-based. Optional reminders are sent only to eligible providers who opted into the category/area and have notification consent; no broad speculative spam.
- Sealed mode sends publication/close notices without Bid amounts, competitor identity, count, or rank hints.
- Direct Invite sends only to named invitees and the requester; invitation revocation/expiry is attributable.
- Standard auto-bound listing references do not notify the referenced provider before citizen acceptance and contract finalization.
- Custom partner terms produce a scoped confirmation notification with exact terms and expiry.
- Every delivery attempt has locale/template/policy version, consent basis, attempt status, retry/dead-letter state, and a correlation reference.

### 11.2 Scheduler safety

Workers must be bounded, retry-safe, and observable:

- index due Tenders by phase/deadline;
- lock one Tender at a time and use version/CAS;
- emit one transition event and one logical notice per transition;
- route unknown/future state versions to an operations queue without changing business state;
- keep metrics separate for Open, Sealed, and Direct Invite (published, eligible, responses, amendments, withdrawals, awards, unfulfilled, privacy denials, stale finalization conflicts).

### 11.3 Audit evidence

At minimum record:

- citizen draft/publish/edit/pause/resume/close/cancel/select actions;
- provider eligibility result, Bid submit/amend/withdraw, and Agent consent used;
- invitation send/view/accept/decline/expire/revoke;
- sealed/private field access by admin/support;
- scheduler expiry and selection deadline decisions;
- selected/competing outcomes and reasons;
- contract finalization, child Order IDs, terms hashes, capacity reservations, and outbox IDs;
- every rejection/conflict without leaking unauthorized data.

## 12. Acceptance and verification matrix

This specification is complete only when the implementation proves these observable contracts:

| Area | Required proof |
|---|---|
| Citizen creation | Draft save/reload; category/scope/budget/timeline validation; media scan/privacy failure; publish/scheduled start. |
| Timeline | `emergency_24h`, `community_7d`, custom bounds, UTC display, early close, response and selection deadlines. |
| Eligibility | Unverified/suspended/wrong-category/out-of-area/self-bid rejection; approved provider and scoped Agent success. |
| Concurrency | Two provider submissions both persist; same-provider active-lineage limit; duplicate idempotency replay; close/submit race has one deterministic winner. |
| Amendments | Immutable V1/V2 history; one active current version; terms hash/partner-consent invalidation; no amendment after close. |
| Withdrawals | Provider withdrawal preserves history; counts/projections update; resubmission policy enforced. |
| Open privacy | Public-safe projection; no exact address/private media/competitor terms; winning disclosure only by policy. |
| Sealed privacy | Pre-close no amounts/identities/count/rank hints; post-close citizen reveal; provider own-only projection; admin access audited. |
| Direct Invite privacy | Non-invitee non-enumeration; invitee-only content; no invite-list leakage; standard reference no spam; custom terms confirmation. |
| Expiry | Due worker transitions once; no bids → unfulfilled; bids → selection; no automatic cheapest-bid award; selection timeout unfulfilled. |
| Selection | One citizen decision; stale quote/capacity/provider conflict returns 409 without partial state; competing active Bids declined only after successful finalization. |
| Contract formation | One ordinary Order for single-node; all required independent child Orders for multi-node; exact immutable terms; one obligation per child; no pooled parent payment. |
| Work boundary | `ready_for_collection` enables next dependency but does not complete upstream Work/Order; Work, payment, and dispute remain separate. |
| Recovery | Cancelled/unfulfilled Tender can be re-requested without rewriting history; failed child replacement preserves prior Need/Order; no parent-wide financial cascade. |

Recommended focused test vectors include: deadline at exact boundary, duplicate provider submission, amendment arriving with stale `If-Match`, sealed request accessed through guessed ID, Direct Invite notification to a non-invitee, selected Bid expiry during finalization, partner counter after citizen preview, one child capacity failure in a multi-node Bid, and repeated scheduler execution.

## 13. Implementation and migration sequence

1. Review this specification against the founder register, pilot capability matrix, domain/state contract, and canonical schema.
2. Resolve product choices that remain policy inputs: whether Open mode exposes public bid counts, whether Sealed mode hides the citizen's pre-close count, maximum alternatives per provider, timeline bounds, selection windows, and award disclosure.
3. Amend domain/state authority with Tender phase, Bid lineage/version, invitation, and selection events.
4. Amend canonical schema and ERD with request fields, quote lineage fields, `request_invitations`, indexes, triggers, privacy/access classes, and migration order.
5. Define module ownership and application commands behind existing modular-monolith boundaries. Tender commands must not write another module's persistence directly.
6. Implement focused database constraint/transition tests before browser work.
7. Implement provider/requester API projections and idempotent command handlers.
8. Add scheduler/outbox/notification workers and operational dashboards.
9. Implement Open first, then Sealed, then Direct Invite behind capability activation gates; do not expose an unimplemented mode in pilot navigation.
10. Rehearse multi-node acceptance with independent child Orders and per-order payment obligations; prove readiness is not completion.
11. Obtain privacy/security, operations, payment/legal, and founder activation approvals before claiming pilot readiness.

No migration should add a generic `bids` table, pooled tender payment, parent escrow, composite listing, or automatic lowest-bid award. If a future requirement needs cryptographic sealed commitments, it requires a separate threat model, key-management contract, recovery plan, and ADR rather than silently changing the meaning of `sealed_tender`.

## 14. Open decisions requiring review

1. Confirm the product name shown to citizens: `Public Bidding`, `Open Tender`, or both.
2. Confirm whether anonymous Open discovery shows a Bid count; default in this specification is opt-in anonymized count only.
3. Confirm whether a Sealed requester sees a pre-close count; default is count/status only, never terms or identities.
4. Confirm policy maximum for active provider alternatives and whether multiple alternatives are enabled in the initial pilot.
5. Confirm emergency selection window and whether a citizen may extend it after response close without reopening submissions.
6. Confirm exact award disclosure to public/losing providers and retention period for losing Bid terms.
7. Confirm category-specific requirements for verified ID, safety evidence, photos, and private address disclosure.
8. Confirm whether Direct Invite should support a provider accepting an invitation without submitting a Bid, and how long that acceptance remains valid.
9. Confirm whether a Bid may contain optional nodes or only mandatory nodes at first release.
10. Confirm legal/security language for “sealed”; this document intentionally does not claim cryptographic sealing.

## 15. Evidence and source references

Project claims above are grounded in the following primary repository artifacts:

- [`docs/planning-hardening/00-recovery-charter.md`](00-recovery-charter.md) — authority hierarchy, migration/readiness freeze, Tagudin/low-barrier direction, and independent state-machine requirement.
- [`docs/planning-hardening/01-contradiction-and-supersession-register.md`](01-contradiction-and-supersession-register.md) — request/quote lifecycle gap, privacy, Agent attribution, quote grandfathering, no pooled custody, and sourcing anti-spam decisions.
- [`docs/planning-hardening/04-pilot-capability-matrix.md`](04-pilot-capability-matrix.md) — Service/Product Requests, Reverse Bidding, Quote Request, A7/A8 boundaries, and child-Order/pilot gates.
- [`docs/planning-hardening/11-founder-frontend-review-and-replanning-table.md`](11-founder-frontend-review-and-replanning-table.md) — missing request-response UX, canonical `requests → quotes → orders` default, amendment/withdrawal/expiry/acceptance requirements, and rejection of a separate `bids` table absent a proven invariant.
- [`docs/planning-hardening/12-deal-chaining-founder-decision-and-modeling-charter.md`](12-deal-chaining-founder-decision-and-modeling-charter.md) — bounded Chain/Need/Invitation foundation, open sourcing through Requests/Quotes, independent child Orders, no pooled payment, and explicit partner consent boundaries.
- [`docs/planning-hardening/18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md`](18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md) — single-owner listings, modular extensions, child-order isolation, readiness handoff semantics, and capacity/version revalidation.
- [`docs/planning-hardening/19-advisor-deal-chaining-and-bidding-schema-evaluation.md`](19-advisor-deal-chaining-and-bidding-schema-evaluation.md) — normalized quote lines/packages, immutable terms, partner confirmation, and one obligation per child Order (supporting evaluation, not migration authority).
- [`docs/planning-hardening/20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md`](20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md) — supporting visibility modes, one active version per proposal lineage, one accepted lineage per request, and standard/custom partner-binding behavior (evaluation, not canonical replacement).
- [`_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md) — canonical separation of Order/Work/Payment, transition guards, actor/idempotency/outbox requirements, Deal-Chain invariants, and acceptance-time revalidation.
- [`_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`](../../_bmad-output/planning-artifacts/canonical-schema-rebuilt.md) — current `requests`/`quotes` contract, UUID/time/money/version rules, evidence/privacy/retention, and no separate Bid aggregate.
- [`docs/planning-hardening/07-schema-implementation-and-erd-contract.md`](07-schema-implementation-and-erd-contract.md) — PostgreSQL `TEXT + CHECK`, child lineage, no parent Payment Obligation, and migration/constraint review gates.
- [`database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php`](../../database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php) — observed request/quote columns and current allowed coarse statuses.
- [`database/migrations/2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php`](../../database/migrations/2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php) — observed Deal-Chain/Need/Invitation tables, lineage FKs, and lifecycle checks.

This document deliberately labels new Tender fields, phases, indexes, invitation storage, and API routes as proposed changes. They are not evidence that the current application already implements Public, Sealed, or Direct Invite bidding.
