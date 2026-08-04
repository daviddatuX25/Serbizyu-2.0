# Connected Marketplace Journeys Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-006–021; UX-005–016; DSC-001–006; LST-001–007; REQ-001–005; ORD-001–005; A1-001–003; PAY-001–006; TRU-001–004; SCN-01

## Deal-Chaining foundation/deferred-feature gate

This capability spec does not reject the approved Deal-Chaining foundation. The canonical foundation is the four-table coordination model plus nullable `(deal_chain_id, deal_need_id)` lineage on existing Request/Quote/Order records, with ordinary child-Order isolation; it is planning/schema authority required before E0-S2, not a connected-marketplace feature requirement. Any later coordination UX requires its own bounded story, authority update, recovery/operations/browser evidence, and separate pilot-activation decision. No scenario below should be read as claiming Deal-Chaining functionality or readiness.

## ADDED Requirements

### Requirement: Truthful discovery and listing identity

ID: CMJ-REQ-001

Browse SHALL preserve query/filter state, distinguish services, products, and requests, show truthful availability and amount meaning, and open a listing detail retaining the selected listing and Provider/Owner identity.

#### Scenario: Open a listing from Browse

- GIVEN a user filters to a fictional listing
- WHEN they open it
- THEN the detail shows scope, inclusions/exclusions, Provider/Owner, price/quote meaning, capacity/availability, area/timing, Work shape, payment-lane meaning, evidence expectations, and safety/help
- AND its primary action uses that exact listing ID/version.

#### Scenario: Listing becomes unavailable

- GIVEN a viewed listing version is no longer active or capacity is unavailable
- WHEN the user attempts to continue
- THEN confirmation is blocked
- AND the UI offers refresh, corrected quantity/terms, another listing, request creation, or safe exit.

### Requirement: Evidence-based public trust

ID: CMJ-REQ-002

Listing and Provider views SHALL distinguish evidence-based history, new/unknown status, access restrictions, and report/block/help. They SHALL NOT fabricate a verification badge, trust score, or private evidence disclosure.

#### Scenario: Provider has no review history

- GIVEN the fictional Provider has no qualifying completed interactions
- WHEN the public trust panel renders
- THEN it says new/no history or unknown as applicable
- AND still provides safety, report, and support choices
- AND does not label the Provider broadly verified.

### Requirement: Persistent request creation

ID: CMJ-REQ-003

The continuous request composer SHALL be routable, preserve safe drafts and validation corrections, state who can see the request, and create an entity-linked request that survives refresh and appears in Activity.

#### Scenario: Publish a request

- GIVEN a Buyer completes required service/product need, timing, Tagudin area, budget meaning, alternatives, and safety/privacy fields
- WHEN they review and send the fictional request
- THEN the request receives a stable ID and version
- AND appears in Browse and Activity after refresh
- AND the next state invites eligible Provider responses rather than claiming a match.

### Requirement: Response, clarification, and quote progression

ID: CMJ-REQ-004

An eligible Provider SHALL be able to respond, ask or answer clarification, and submit a versioned quote containing scope, inclusions/exclusions, amount meaning, validity, Work shape, schedule, lane, evidence, and cancellation/change meaning.

#### Scenario: Provider responds to request

- GIVEN an open request is valid and the Provider is eligible
- WHEN the Provider submits a clarification and later a quote
- THEN both are attributable and linked to the request
- AND the Buyer sees the new response in Activity
- AND a quote is not presented as accepted before Buyer action.

#### Scenario: Quote expires or changes

- GIVEN a quote is expired or replaced
- WHEN the Buyer attempts acceptance
- THEN acceptance is blocked
- AND the prior version remains in history
- AND the Buyer must review current terms explicitly.

### Requirement: Quote comparison and Order formation

ID: CMJ-REQ-005

The Buyer SHALL compare quotes by scope, amount semantics, timing, evidence, and truthful Provider facts, then clarify, decline, or accept one. Acceptance SHALL create an immutable accepted-terms snapshot and normal Order; it SHALL not silently complete Work or settle Payment.

#### Scenario: Accept selected quote

- GIVEN a current quote is eligible
- WHEN the Buyer confirms the selected terms and lane meaning
- THEN an Order is created with parties, origin, quote/listing snapshot, amount/purpose, Work shape, geography, and references to separate Work and Payment Obligation records
- AND unselected responses remain declined/open according to explicit fixture behavior.

### Requirement: Shared Order workspace

ID: CMJ-REQ-006

The Order workspace SHALL show accepted terms, parties, contextual viewer relationship, next responsible actor, and separate panels for Order, Work, Payment Obligations, Evidence, Dispute/Hold, support, and attributable timeline.

#### Scenario: Inspect one active Order

- GIVEN an accepted Order has Work in progress and cash not fully acknowledged
- WHEN either party opens the Order
- THEN both see the same accepted snapshot and history
- AND each sees only authorized primary actions
- AND neither Work nor Payment status is summarized as the other.

### Requirement: Complete SCN-01 A1 Work

ID: CMJ-REQ-007

The frontend SHALL implement `SCN-01` as the first connected vertical slice: discovery, listing detail/trust, terms confirmation, Order, A1 steps, versioned evidence, revision, completion proposal, Buyer sign-off or concern, and timeline.

#### Scenario: Provider proposes completion

- GIVEN required A1 progress evidence is attached and unresolved revisions are cleared
- WHEN the Provider proposes completion
- THEN Work becomes `completion_proposed` or `awaiting_signoff`
- AND Payment remains unchanged
- AND the Buyer receives a next action.

#### Scenario: Buyer reports a concern

- GIVEN completion is awaiting Buyer decision
- WHEN the Buyer reports a specific concern
- THEN completion is blocked or disputed according to the fixture
- AND the original scope/evidence remains visible
- AND clarification/support/dispute routes are offered without automatic refund promises.

### Requirement: Independent External Cash attestations

ID: CMJ-REQ-008

External Cash SHALL use separate Buyer `Cash paid` and Provider `Cash received` declarations with actor, amount, purpose, and timestamp. Matching reports MAY become `mutually_acknowledged`; missing or conflicting reports SHALL remain pending or disputed. Serbizyu SHALL not imply custody, payout, automatic refund, or payment proof.

#### Scenario: Buyer reports cash paid first

- GIVEN a cash Payment Obligation is due
- WHEN the Buyer reports `Cash paid`
- THEN payment becomes `buyer_reported`
- AND Provider sees `Report cash received` or `Report a mismatch`
- AND Work does not change.

#### Scenario: Reports match

- GIVEN Buyer and Provider independently report the same amount and purpose
- WHEN the second report is accepted
- THEN payment becomes `mutually_acknowledged`
- AND both attributed events remain visible
- AND Work remains in its prior state.

#### Scenario: Reports conflict

- GIVEN the reports disagree on amount or exchange
- WHEN the second report is submitted
- THEN the obligation enters a mismatch/dispute path
- AND original declarations remain immutable
- AND support/dispute is offered without promising recovery.

### Requirement: Activity as connected action queue

ID: CMJ-REQ-009

Activity SHALL derive `Needs action`, `Waiting`, and `History` from entity state and viewer authorization. Every item SHALL link to its affected entity and show contextual relationship, next action, other actor, and blocked/waiting reason.

#### Scenario: Quick Deal creates Order

- GIVEN both authorized Quick Deal participants confirm
- WHEN the normal mock Order is created
- THEN the relevant Activity item appears for each participant
- AND opens that Order by ID
- AND does not remain only as a receipt on the Quick Deal screen.

### Requirement: Listing creation and lifecycle management

ID: CMJ-REQ-010

An Owner or authorized Agent SHALL be able to create and manage Service/Product Listings through draft, validation, preview, review/publish fixture gate, active, paused/unavailable, rejected, expired, and archived states with truthful capacity/availability.

#### Scenario: Owner creates Service Listing

- GIVEN the account has provide capability
- WHEN the Owner completes service scope, category, amount meaning, schedule/area, Work shape, lane, evidence, and preview
- THEN a persistent draft is created
- AND valid fixture publication produces a versioned active listing
- AND invalid combinations or missing requirements preserve the draft with correction guidance.

#### Scenario: Manage Listing control

- GIVEN the account owns or may manage a listing
- WHEN they select `Manage listing`
- THEN the correct listing-management route opens
- AND lifecycle actions are authorized and attributable
- AND the control is never a no-op.

### Requirement: Contextual safety, report, and support

ID: CMJ-REQ-011

Listing, request, Order, Work, payment, appointment/handoff, evidence, and Agent screens SHALL expose safety/report/help at the point of risk. Reports and support cases SHALL identify the affected aggregate and preserve history.

#### Scenario: User reports a mismatch or unsafe interaction

- GIVEN a user is in the affected entity context
- WHEN they choose report/help
- THEN the smallest useful context is preselected
- AND privacy/evidence meaning and requested next step are explained
- AND the flow does not invent a hotline, guarantee, refund, or resolution deadline.

### Requirement: Order formation and lifecycle remain mechanism-specific and canonical

ID: CMJ-REQ-012

Direct Booking, accepted Quote Request, Reverse-Bidding acceptance, and Quick Deal SHALL each create at most one normal Order through an idempotent formation command. The Order SHALL preserve origin/mechanism and immutable accepted source/version. Its lifecycle SHALL distinguish canonical `draft`, `pending_acceptance`, `accepted`, `in_progress`, cancellation, completion/closure, and other approved states rather than treating Work or Payment status as Order status.

#### Scenario: Accepted Quote creates one Order

- GIVEN the Buyer accepts one eligible current Quote version
- WHEN formation completes
- THEN one Order records the Request/Quote/version origin and immutable terms
- AND a retry returns that Order
- AND other Quote states/history remain explicit
- AND no Work or Payment event is inferred as completed.

#### Scenario: Quick Deal forms only after both confirmations

- GIVEN a fixture-only Quick Deal session has fewer than two valid current-version party confirmations
- WHEN Order lookup or finalization runs
- THEN no Order exists or is reported as pending merely from negotiation
- AND after both confirmations the deterministic frontend atomically creates one accepted Order as its proposed fixture behavior
- AND Gate B remains explicit that the backend may require a `pending_acceptance` persistence step.

#### Scenario: Order close or cancellation is guarded

- GIVEN an Order has unresolved Work, Payment Obligation, evidence, dispute, hold, or cancellation-policy conditions
- WHEN close/cancel is attempted
- THEN the command is blocked or routed through the approved state-specific flow
- AND original terms, evidence, notices, events, and actor attribution remain
- AND no Work/Payment change silently rewrites Order state.
