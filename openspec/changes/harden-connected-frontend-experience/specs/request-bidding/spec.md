# Request Response, Bidding, and Quote Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-010–019, PRD-023, PRD-044–045; UX-006–007, UX-019; CMJ-REQ-003–005; `requests`, `quotes`, `orders`, `order_terms_snapshots`, `consent_grants`, `notifications`, `audit_events`; planning-hardening FR-15

## ADDED Requirements

### Requirement: Persistent Service/Product Request formation

ID: RBQ-REQ-001

The frontend SHALL support routable, persistent Service Request and Product Request drafts and publication. A Request SHALL retain requester, description/item list, budget/estimate meaning, timing/location, status/expiry, privacy/safety choices, version, and evidence class. Publication SHALL invite eligible responses; it SHALL not claim a match.

#### Scenario: Publish Service Request

- GIVEN an authenticated Buyer has completed the required request fields
- WHEN they review and publish the fictional Request
- THEN one versioned Request ID is created
- AND it appears in My Requests, Activity, and eligible Open Requests after refresh
- AND the state says waiting for responses rather than matched.

#### Scenario: Save incomplete Request draft

- GIVEN required publication fields are missing
- WHEN the Buyer saves instead of publishing
- THEN the draft persists through refresh
- AND validation issues remain actionable
- AND the Request is not visible to Providers.

### Requirement: Eligible Provider/Agent Open Requests

ID: RBQ-REQ-002

Eligible Provider/Owner contexts SHALL have an Open Requests view showing Service/Product type, scope/item summary, budget meaning, timing/area, safety/privacy boundary, response expiry, current response state, and eligibility/blocked reason. An Agent SHALL see a Request only when the active Owner context and grant permit response work.

#### Scenario: Provider opens eligible Request

- GIVEN an active Provider fixture meets the Request/category/capability rules
- WHEN they select the Request
- THEN the exact Request ID/version and requester-safe facts open
- AND `Respond` is available
- AND no private data outside the Request contract is shown.

#### Scenario: Agent lacks response permission

- GIVEN Rosa is acting for Lola Nena under listing-draft-only scope
- WHEN Rosa opens an Open Request
- THEN response creation is blocked with the missing grant action
- AND the Request may remain read-only only if discovery is authorized
- AND no response draft is created.

#### Scenario: Request is expired

- GIVEN a Request expired
- WHEN a Provider opens it
- THEN new response submission is blocked
- AND expiry/history meaning is visible
- AND the Provider may return to current Open Requests.

### Requirement: Attributed clarification thread

ID: RBQ-REQ-003

Requester and eligible responder SHALL exchange attributable clarification questions/answers linked to the Request and, where applicable, a Quote version. Clarification SHALL not constitute acceptance, change immutable history, or reveal unauthorized contact information.

#### Scenario: Provider asks scope question

- GIVEN a current open Request is eligible
- WHEN the Provider submits a clarification question
- THEN the question is linked to the Request and Provider context
- AND the Buyer receives an Activity/notification item
- AND no Quote or Order is marked accepted.

#### Scenario: Buyer answers clarification

- GIVEN a clarification is waiting for Buyer response
- WHEN the Buyer answers
- THEN both parties see the attributable answer after refresh
- AND the Provider may continue the quote draft
- AND prior Request wording remains versioned/history-preserved.

### Requirement: Complete quote/bid composer

ID: RBQ-REQ-004

The response composer SHALL capture introduction, scope, inclusions/exclusions, amount components/total meaning, schedule/availability, validity/expiry, Work shape, payment-lane options, evidence expectations, assumptions/alternatives, and Owner/Agent attribution. User-facing competitive copy MAY say Bid; the canonical frontend object SHALL remain a Quote.

#### Scenario: Provider prepares competitive bid

- GIVEN an eligible Provider opens a Reverse Bidding Request
- WHEN they complete the response composer
- THEN review shows every material term before submission
- AND the object is a versioned Quote linked to the Request and Provider
- AND no separate canonical Bid aggregate/table is implied.

#### Scenario: Invalid quote terms

- GIVEN amount, validity, or required scope is invalid
- WHEN submission is attempted
- THEN field/action corrections are shown
- AND safe input remains
- AND no notification or submitted Quote is created.

### Requirement: Submit, replace, and withdraw quote versions

ID: RBQ-REQ-005

A Provider/authorized Agent SHALL submit one current Quote response, replace it by creating a new version, or withdraw it before acceptance where the fixture permits. Prior versions SHALL remain history. Accepted, expired, withdrawn, or superseded versions SHALL not be edited or accepted.

#### Scenario: Submit first Quote

- GIVEN the Quote draft is valid and the Request remains current
- WHEN the Provider submits
- THEN one current Quote version is created
- AND the Buyer receives a response notification
- AND the Quote appears in My Responses and the Buyer response inbox.

#### Scenario: Replace submitted Quote

- GIVEN Quote version 1 is current and unaccepted
- WHEN the Provider changes material terms and submits version 2
- THEN version 1 becomes superseded
- AND version 2 becomes current
- AND the Buyer must review the changed terms
- AND both versions remain attributable.

#### Scenario: Withdraw Quote

- GIVEN a current unaccepted Quote is withdrawable
- WHEN the Provider confirms withdrawal
- THEN the Quote becomes withdrawn
- AND the Buyer sees that it is unavailable
- AND the Request remains open according to its own state
- AND no Order is created.

### Requirement: Agent response preserves Owner and permission

ID: RBQ-REQ-006

When an Agent responds for an Owner, the Quote SHALL identify the Owner/Provider as the commercial party and the Agent as the acting account. Grant scope SHALL determine draft, submit, revise, or withdraw authority; approval-required actions SHALL create Owner tasks rather than bypass consent.

#### Scenario: Agent drafts but cannot submit

- GIVEN Rosa has permission to draft a response for Lola Nena but submission requires Owner approval
- WHEN Rosa finishes the Quote draft
- THEN Lola Nena remains the responding Owner/Provider
- AND Rosa is recorded as acting Agent
- AND an Owner approval task/notice is created
- AND the Buyer does not receive a submitted Quote yet.

#### Scenario: Owner approves exact Quote version

- GIVEN Lola Nena reviews the exact current draft and consequences
- WHEN she approves submission
- THEN that version becomes submitted under Owner authority
- AND Rosa/Lola attribution remains
- AND changed later terms require a new approval when configured.

### Requirement: Buyer response inbox and meaningful comparison

ID: RBQ-REQ-007

The Buyer SHALL have a response inbox and comparison view showing current Quote scope, amount components, inclusions/exclusions, schedule, validity, Work shape, lane/protection meaning, evidence, clarification state, and truthful Provider facts. The frontend SHALL not invent ranking, automatic award, trust score, or “best” recommendation.

#### Scenario: Compare two current Quotes

- GIVEN two eligible current Quotes exist
- WHEN the Buyer opens comparison
- THEN differences are aligned by meaning
- AND expired/changed warnings are visible
- AND no Quote is preselected as best
- AND the Buyer may inspect, clarify, decline, or accept explicitly.

#### Scenario: No responses yet

- GIVEN an open Request has no submitted Quotes
- WHEN the Buyer opens Responses
- THEN a truthful waiting state appears
- AND expiry/edit/cancel/help actions are offered where valid
- AND seeded fake responders are not shown.

### Requirement: Decline, expiry, stale, and re-review behavior

ID: RBQ-REQ-008

The Buyer MAY decline a Quote with explicit fixture behavior. Quote/Request expiry, replacement, or stale expected version SHALL block acceptance and require current-term re-review. History and draft inputs SHALL remain where safe.

#### Scenario: Quote expires while Buyer reviews

- GIVEN the Buyer opened a current Quote before expiry
- WHEN they attempt acceptance after expiry
- THEN acceptance is blocked
- AND the expiry state and alternatives are shown
- AND no Order or terms snapshot is created.

#### Scenario: Provider replaces Quote during Buyer review

- GIVEN the Buyer is viewing Quote version 1
- WHEN version 2 becomes current before acceptance
- THEN the acceptance command returns stale/conflict
- AND version 2 differences must be reviewed
- AND version 1 remains history.

#### Scenario: Buyer declines Quote

- GIVEN a current Quote is eligible for decision
- WHEN the Buyer declines with the required confirmation/reason behavior
- THEN the Quote becomes declined or the decline event is recorded according to fixture contract
- AND the Provider is notified
- AND the Request remains independently open/closed according to explicit Request rules.

### Requirement: Accept current Quote into normal Order

ID: RBQ-REQ-009

Only the Requester/authorized Buyer SHALL accept one current eligible Quote. Acceptance SHALL atomically revalidate Request and Quote versions, create one immutable Order terms snapshot and normal Order, establish parties, create separate Work/Payment records as required, and link Activity/notifications/audit. It SHALL not complete Work or settle Payment.

#### Scenario: Buyer accepts current Quote

- GIVEN the Request and Quote are current, eligible, and unexpired
- WHEN the Buyer reviews final terms/lane meaning and confirms
- THEN one idempotent Order is created
- AND the accepted Quote version becomes immutable snapshot source
- AND Request, Quote, Order, Work, Payment, Activity, and timeline IDs link
- AND payment remains unresolved and Work not completed.

#### Scenario: Duplicate acceptance retry

- GIVEN Order formation succeeded but the first response was lost
- WHEN the same idempotency key is retried
- THEN no duplicate Order is created
- AND the existing result is returned.

#### Scenario: Unauthorized account accepts Quote

- GIVEN an account is not the Requester/authorized Buyer
- WHEN it attempts acceptance
- THEN permission is denied
- AND no Request, Quote, Order, Work, or Payment state changes.

### Requirement: Cross-actor notifications, Activity, and audit

ID: RBQ-REQ-010

Every material Request/clarification/Quote/decision transition SHALL create the appropriate shared state, Activity items, notification intents, and attributable events. Delivery failure SHALL not roll back the domain transition, and retry SHALL not duplicate it.

#### Scenario: Quote submission notification fails

- GIVEN the Provider successfully submits a Quote
- WHEN the Buyer’s simulated notification delivery fails
- THEN the Quote remains submitted
- AND a failed delivery/retry/support state exists
- AND the Buyer can still discover the response through Responses/Activity after refresh
- AND retrying notification does not resubmit the Quote.

#### Scenario: Trace accepted response

- GIVEN a Quote produced an Order
- WHEN Buyer, Provider, Agent if applicable, or authorized Admin inspect history
- THEN the Request, clarification, Quote versions, acceptance actor, Owner/Agent attribution, and resulting Order correlation are traceable
- AND sensitive/private fields obey access boundaries.

### Requirement: Reverse-Bidding participation obeys explicit policy guards

ID: RBQ-REQ-011

Competitive response SHALL enforce an approved fixture policy for responder eligibility, minimum response content, duplicate/idempotency behavior, response-frequency/rate limits, expiry, and selection/decline handling. Exact thresholds SHALL be versioned policy fixtures until approved upstream. The frontend SHALL NOT automatically award the cheapest Quote.

#### Scenario: Ineligible Provider attempts response

- GIVEN a Provider fails category, capability, geography, status, capacity, Owner-grant, or other approved eligibility guard
- WHEN it opens or directly submits a response
- THEN the interface explains the blocking guard
- AND the gateway rejects direct submission
- AND no Quote/version/notification is created.

#### Scenario: Minimum response or response-frequency guard fails

- GIVEN the response omits required scope/amount/timing/evidence meaning or exceeds the approved fixture frequency limit
- WHEN submission is attempted
- THEN the draft is preserved with exact correction guidance
- AND no submitted Quote is created
- AND the displayed policy version/limit is traceable rather than hard-coded silently.

#### Scenario: Cheapest Quote is not auto-selected

- GIVEN the Buyer has several eligible Quotes with different scope, amount meaning, timing, evidence, and Provider facts
- WHEN comparison opens
- THEN no Quote is pre-awarded solely because it has the lowest amount
- AND Buyer must deliberately review and accept one eligible current version
- AND other responses retain explicit post-decision state/history.
