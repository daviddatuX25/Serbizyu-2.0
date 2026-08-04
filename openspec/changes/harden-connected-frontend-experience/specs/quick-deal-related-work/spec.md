# Standalone Quick Deal and Future Deal-Chaining Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-021–023; UX-018; QD-001–010; DEC-UI-01–05; canonical `listings`, `listing_versions`, `orders`, `order_parties`, `order_terms_snapshots`, `work_instances`, `payment_obligations`, `notifications`, `audit_events`; future parent/child schema extension remains unresolved

## ADDED Requirements

### Requirement: Dedicated Quick Deal entry outside Browse/Listings

ID: QDS-REQ-001

Quick Deal SHALL have a dedicated top-level launcher and `#/quick-deal` route with `Start a deal` and `Join a deal`. Public Browse cards and public Listing Detail SHALL NOT expose Quick Deal actions. A discovered listing MAY continue through its normal Direct Booking, Quote, or Request mechanism.

#### Scenario: Buyer browses listing

- GIVEN the Buyer is viewing public Browse or Listing Detail
- WHEN available actions render
- THEN normal listing mechanism actions appear
- AND no Quick Deal action appears on the card/detail
- AND the Buyer is not asked to create a Quick Deal session from discovery.

#### Scenario: User opens top-level Quick Deal

- GIVEN the current session may start or join a fixture deal
- WHEN the user opens the Quick Deal launcher
- THEN the dedicated Start/Join landing renders
- AND no listing is preselected merely from prior Browse history.

### Requirement: Initiator selects one eligible owned listing

ID: QDS-REQ-002

An Owner/Provider or authorized Agent SHALL enter `Start a deal` and select one eligible listing owned by the active Owner context. Eligibility SHALL check listing state/version, management grant, capacity/availability, and fixture capability profile. Initial fixture cardinality SHALL be one listing until Gate B approves bundling.

#### Scenario: Owner starts from eligible listing

- GIVEN Miguel owns two active Quick Deal-compatible listings
- WHEN he enters Start and selects one
- THEN a new fixture session references that Listing ID and immutable Listing Version ID
- AND the other listing is not silently included
- AND no Order exists yet.

#### Scenario: Agent starts for Owner

- GIVEN Rosa is acting for Lola Nena under a grant permitting Quick Deal initiation for listing L-101
- WHEN Rosa selects L-101
- THEN Lola Nena remains initiator Owner/commercial party
- AND Rosa is recorded as acting Agent
- AND the session references the active grant.

#### Scenario: Listing is not eligible

- GIVEN a listing is draft, paused, expired, capacity-unavailable, outside scope, or grant-forbidden
- WHEN Start lists eligible supply
- THEN that listing is absent or disabled with a concrete reason
- AND no session is created from it.

### Requirement: Session creation, presentation, and recipient join

ID: QDS-REQ-003

Selecting an eligible listing SHALL create a fixture-only Quick Deal session in `waiting_for_recipient`, derived from the listing version. The initiator SHALL see a simulated QR/join artifact, session reference, expiry, terms, Owner/Agent attribution, and leave/cancel action. A Buyer/recipient SHALL scan or manually open that existing session and review before joining.

#### Scenario: Present session

- GIVEN an eligible listing was selected
- WHEN session creation succeeds
- THEN the initiator sees the selected listing/Owner/listed terms, simulated QR/join artifact, expiry, waiting state, and explicit simulation disclosure
- AND the session survives refresh
- AND no payment/Order success is shown.

#### Scenario: Recipient scans simulated QR

- GIVEN the session is current and waiting
- WHEN the Buyer uses the camera simulation or manual join code
- THEN the app opens the exact session ID
- AND shows Owner, listing, current terms, expiry, safety/cash meaning, and Join/Decline
- AND it does not route the Buyer back through Browse.

#### Scenario: Camera is unavailable

- GIVEN camera permission is denied or unavailable in the fixture
- WHEN the Buyer chooses Join
- THEN manual simulated entry is offered
- AND the user can cancel/help
- AND no claim of real QR scanning or secure transport is made.

### Requirement: Attributed proposal and negotiation rounds

ID: QDS-REQ-004

A joined session MAY negotiate approved session-specific price, quantity/scope, schedule, inclusions, add-ons, and notes. Each material proposal SHALL preserve prior terms, proposed terms, actor/acting Owner, version, and timestamp. It SHALL never mutate the source public listing or a previously accepted Order.

#### Scenario: Buyer proposes lower price

- GIVEN Buyer and Owner are in a current negotiating session
- WHEN the Buyer proposes a lower price
- THEN one new proposal round is appended
- AND the listed price and prior rounds remain visible
- AND the source Listing Version is unchanged
- AND prior confirmations clear.

#### Scenario: Owner accepts tailoring only for this deal

- GIVEN the Owner accepts a changed scope/add-on
- WHEN the session terms update
- THEN the change applies only to the current Quick Deal session
- AND the public listing remains unchanged
- AND any future `Save as listing draft/version` is a separate explicit action outside Order formation.

#### Scenario: Agent proposes outside grant

- GIVEN the Agent grant permits initiation but not price reduction beyond its approved scope
- WHEN the Agent attempts the prohibited proposal
- THEN the action is blocked with the exact permission reason
- AND no proposal/version/event is created
- AND Owner approval/help can be offered where defined.

### Requirement: Material changes invalidate confirmation

ID: QDS-REQ-005

Buyer and Seller/Owner confirmations SHALL be independent, attributable, version-bound, and invalidated by any material term change. An Agent may satisfy the Owner side only with explicit grant authority. The same product actor SHALL not confirm both sides.

#### Scenario: Both parties confirm current terms

- GIVEN the session is at version 4 and both parties reviewed version 4
- WHEN Buyer and Seller/Owner confirm independently
- THEN each confirmation records actor, party side, and session version
- AND the session becomes eligible for Order formation only after both valid confirmations.

#### Scenario: Terms change after Buyer confirms

- GIVEN Buyer confirmed version 4
- WHEN Seller proposes version 5
- THEN Buyer’s version-4 confirmation becomes invalid for finalization
- AND both parties must review/confirm version 5
- AND no Order is formed from mixed-version consent.

#### Scenario: Same actor attempts both sides

- GIVEN one product account confirmed the Buyer side
- WHEN that account attempts the Seller/Owner confirmation without authorized distinct-party context
- THEN the second confirmation is denied
- AND session state remains awaiting the other required party.

### Requirement: Valid final confirmation creates one normal Order

ID: QDS-REQ-006

Before both valid current-version confirmations, the fixture-only Quick Deal session SHALL create no Order. After both confirmations, the deterministic frontend SHALL atomically create exactly one accepted normal Order, immutable Order Terms Snapshot sourced from the listing/proposal version, Order parties, applicable Work, unresolved Payment Obligation, Activity items, notifications, and audit correlation. This accepted-on-finalization fixture rule SHALL be identified as proposed frontend behavior pending Gate B's backend decision about a `pending_acceptance` persistence step. Quick Deal SHALL not create payment settlement or Work completion.

#### Scenario: Form Order from Quick Deal

- GIVEN both required parties confirmed the same current eligible terms
- WHEN finalization runs
- THEN exactly one Order and immutable terms snapshot are created
- AND its deterministic fixture state is `accepted` only because both parties already confirmed the exact session version
- AND origin/mechanism identifies Quick Deal
- AND Buyer/Owner/acting Agent attribution is preserved
- AND Work is not completed
- AND Payment Obligation remains unresolved
- AND the result links to the normal Order workspace.

#### Scenario: Duplicate finalization retry

- GIVEN finalization already created Order O-220 but the client did not receive the response
- WHEN the same idempotency key retries
- THEN O-220 is returned
- AND no duplicate Order, Work, Payment Obligation, notice, or event is created.

#### Scenario: Result receipt is shown

- GIVEN the Quick Deal Order exists
- WHEN either party opens the result
- THEN the interface labels the result as agreed Order/terms record
- AND explicitly states it is not payment proof
- AND the next action opens Activity or the Order.

### Requirement: Expiry, leave, decline, capacity, conflict, and uncertain-result recovery

ID: QDS-REQ-007

Quick Deal SHALL support no-eligible-listing, stale/paused listing, insufficient capacity, recipient mismatch, decline, leave, session expiry, version conflict, transport retry, duplicate confirmation, and uncertain Order-creation outcomes. Recovery SHALL preserve safe history and SHALL not fabricate success.

#### Scenario: Session expires before confirmation

- GIVEN a Quick Deal session expires while negotiating
- WHEN either party attempts proposal or confirmation
- THEN the command is blocked
- AND the session shows expired terms/history and restart guidance
- AND no Order is created.

#### Scenario: Listing capacity changes before finalization

- GIVEN the selected listing capacity became insufficient
- WHEN final confirmation revalidates
- THEN Order formation is blocked
- AND the conflict/capacity reason is shown
- AND parties may revise/restart where policy permits
- AND no negative capacity occurs.

#### Scenario: Local result is uncertain

- GIVEN finalization transport fails after command submission and the client cannot know the result
- WHEN the result screen opens
- THEN it shows pending reconciliation/retry by idempotency rather than `Order created`
- AND later retrieval resolves to the existing Order or a safe failed state.

### Requirement: Cross-actor visibility and Owner notices

ID: QDS-REQ-008

The Quick Deal session, proposals, confirmations, and resulting Order SHALL be visible according to party/grant authorization from Buyer, Owner, acting Agent, and Admin inspector perspectives. Critical Agent-initiated actions SHALL create Owner notice intents and simulated delivery states without claiming real SMS transport.

#### Scenario: Owner reviews Agent-started Quick Deal

- GIVEN Rosa started and completed an authorized Quick Deal for Lola Nena
- WHEN Lola Nena logs in independently
- THEN the Owner sees the source listing, Agent attribution, proposal/confirmation history, resulting Order, and notice delivery state
- AND may use help/report/revoke paths
- AND no password/account takeover occurred.

#### Scenario: Simulated Owner SMS fails

- GIVEN an Agent proposal requires an Owner notice
- WHEN simulated SMS delivery fails
- THEN in-app history and the domain action remain
- AND failure/retry/fallback is visible
- AND no real SMS delivery is claimed
- AND retry cannot repeat the proposal.

### Requirement: Deal Chaining remains a separate decision-gated future capability

ID: DCL-REQ-001

Deal Chaining SHALL remain outside ordinary pilot navigation and SHALL carry persistent deferred/future, fictional-data, no-pooled-money, no-liability/escrow/protection-promise labeling. The old mutable checklist SHALL not represent this capability.

#### Scenario: Reviewer opens future lab before Gate D

- GIVEN the parent/child/open-need model is unresolved
- WHEN the reviewer opens the Deal-Chaining future route
- THEN the decision questions and conceptual variants render
- AND creation/assignment/acceptance controls are unavailable
- AND no pilot user sees the capability in consumer navigation.

### Requirement: Parent coordination intent and child needs are distinct

ID: DCL-REQ-002

After Gate D approval, a Deal Chain SHALL represent one parent coordination intent with distinct child needs/slots, dependencies, invitations/open-call state, assigned Provider, child agreement/Order link, cost estimate/accepted amount, progress, and blocked/failed/disputed state. Parent progress SHALL not overwrite child state.

#### Scenario: Parent has three child needs

- GIVEN an approved fixture coordination plan has venue, food, and transport needs
- WHEN the parent workspace renders
- THEN each need has its own identity, acquisition state, dependency, Provider, agreement, and status
- AND the parent summary derives from those children
- AND it is not a generic editable checklist item.

### Requirement: Direct invitation and open-need variants remain explicit

ID: DCL-REQ-003

The lab MAY present direct invitation and open-need publication as alternative acquisition variants. It SHALL not silently decide whether an open need is a Request status/tag, Request subtype, child-need object, or another model until the founder approves Gate D.

#### Scenario: Compare acquisition variants

- GIVEN Gate D taxonomy is unresolved
- WHEN the reviewer compares invitation and open-call concepts
- THEN both are labeled alternative models under review
- AND their object/state implications are stated
- AND neither can create a production-looking published opportunity.

### Requirement: Each accepted child has an independent agreement spine

ID: DCL-REQ-004

An accepted child need SHALL create or link an independently inspectable agreement/Order with its own parties, immutable terms, Work, Payment Obligation, Evidence, Dispute/Hold, cancellation/replacement, and history. Parent identity SHALL not replace child ownership or commercial terms.

#### Scenario: Accept food-provider response

- GIVEN the approved food child need has a current eligible response
- WHEN the coordinator accepts it
- THEN one child Order/terms snapshot is linked
- AND venue/transport children remain unchanged
- AND the food Provider’s responsibility and payment lane are explicit.

### Requirement: Dependencies and handoffs block only defined transitions

ID: DCL-REQ-005

Child dependencies and handoffs SHALL identify predecessor/successor, required evidence/condition, responsible actor, and blocked next action. A dependency SHALL affect only transitions explicitly approved in the parent/child contract.

#### Scenario: Transport depends on venue address confirmation

- GIVEN venue address confirmation is incomplete
- WHEN transport tries to confirm schedule
- THEN only the dependent transport transition is blocked with the missing condition
- AND unrelated food work remains available
- AND no parent-wide cancellation occurs.

### Requirement: Deal-Chaining money remains child-specific and non-custodial by default

ID: DCL-REQ-006

The parent MAY summarize estimated and accepted child costs, but SHALL not present pooled held funds, parent balance, platform custody, automatic distribution, shared refund, or aggregate payment protection. Each child Payment Obligation retains its lane and evidence.

#### Scenario: Parent cost summary renders

- GIVEN three children have different estimated/accepted costs and payment states
- WHEN the coordinator views totals
- THEN the UI distinguishes estimate from accepted amount and reported child obligations
- AND does not label any total as held, wallet, escrow, paid, or platform revenue
- AND each figure links to its child agreement.

### Requirement: Child failure, cancellation, replacement, and dispute are isolated and visible

ID: DCL-REQ-007

A child need MAY become blocked, failed, cancelled, replacement-needed, or disputed only through approved events. The parent SHALL summarize the consequence and recovery without silently changing unrelated children.

#### Scenario: Child Provider withdraws

- GIVEN the transport child Provider withdraws under an approved rule
- WHEN the event is applied
- THEN transport becomes replacement-needed or the approved recovery state
- AND prior agreement/history remains
- AND venue/food children preserve their state
- AND the coordinator receives a next action.

#### Scenario: Child dispute opens

- GIVEN food delivery is disputed
- WHEN a dispute is opened
- THEN it links only to the food child Order/Work/Payment unless a separate parent impact is explicitly approved
- AND the parent summary shows the risk
- AND other children are not auto-disputed.

### Requirement: Deal-Chaining implementation is blocked by explicit domain decisions

ID: DCL-REQ-008

No functional Deal-Chaining lab beyond static variant explanation SHALL be implemented until the founder approves open-need taxonomy, parent/child ownership, invitation/publication, child agreement/Order formation, responsibility, dependencies, cancellation/replacement, payment, dispute, state machine, and schema extension.

#### Scenario: Implementer reaches unresolved open-need object

- GIVEN a task requires choosing Request tag, subtype, or child object
- WHEN no approved Gate D record exists
- THEN the task stops and reports the decision need
- AND no frontend-only canonical object is invented
- AND the static future explanation may remain.
