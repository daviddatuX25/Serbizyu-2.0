# UX/UI Reference Capability

Status: FOUNDATION / REFERENCE-ONLY
Change: `create-ux-ui-reference-dossier`
Trace: `prd-rebuilt.md`; `ux-spec-rebuilt.md`; `domain-state-contracts-rebuilt.md`; `mockup-experience-expansion-bridge.md`

## ADDED Requirements

### Requirement: Design-agent reference coverage

ID: UXREF-REQ-001
Status: FOUNDATION

The project SHALL maintain a design-agent-readable reference dossier that describes actor perspective, user goal, visible information, decision points, primary action, alternatives, failure/recovery, and cross-role consequences for every committed journey family.

#### Scenario: Designer starts a new mockup

- GIVEN a designer has not seen the historical mockup or prior prototype
- WHEN they read the dossier and the linked canonical artifacts
- THEN they can identify who uses each flow, what the person sees, what they must decide, and what behavior is explicitly out of scope
- AND they do not need to infer product behavior from feature names alone.

### Requirement: Screen perspective contract

ID: UXREF-REQ-002
Status: FOUNDATION

Every canonical screen or visually grouped screen state SHALL be representable with: actor, access context, entry reason, goal, visible hierarchy, primary action, secondary actions, status meaning, safe exit, error/recovery, support route, and next/alternative routes.

#### Scenario: Screen is reviewed for design completeness

- GIVEN a proposed screen is mapped to a canonical screen ID
- WHEN the designer performs a reference review
- THEN the screen has a user goal and decision order rather than a feature description
- AND critical amount, custody, safety, consent, status, and support information is visible before irreversible action.

### Requirement: Cross-role consequence visibility

ID: UXREF-REQ-003
Status: FOUNDATION

The dossier SHALL document what each authorized role sees after a state-changing action and SHALL preserve separate Order, Work, Payment Obligation, Evidence, Dispute, Consent, and Hold meanings.

#### Scenario: Buyer declares External Cash

- GIVEN Buyer and Provider are viewing the same Order
- WHEN Buyer declares that cash was paid
- THEN Buyer sees `Payment declared` and the event appears in the timeline
- AND Provider sees a receipt-confirmation action rather than automatic confirmation
- AND Admin can inspect the actor, event, and affected obligation
- AND Work remains unchanged.

### Requirement: Recovery-first interaction detail

ID: UXREF-REQ-004
Status: FOUNDATION

The dossier SHALL include non-happy-path behavior for validation failure, permission denial, offline/low-data interruption, expired information, retryable failure, mismatch, dispute, hold, correction, and deferred capability.

#### Scenario: Evidence does not match

- GIVEN a Buyer reports that the received item or payment evidence does not match the Order
- WHEN the Buyer submits a concern
- THEN the screen identifies the affected Order/Work/Payment Obligation
- AND asks for the smallest useful evidence and requested remedy
- AND provides support/dispute next steps
- AND does not promise an automatic refund or erase prior history.

### Requirement: Assisted and low-literacy perspective

ID: UXREF-REQ-005
Status: FOUNDATION / PILOT-CONDITIONAL where applicable

The dossier SHALL describe how a low-literacy, low-data, feature-phone-notice, kiosk-assisted, or Agent-assisted person understands and completes each high-impact action.

#### Scenario: Assisted Owner approves an Agent action

- GIVEN an Agent is helping an Owner
- WHEN the Owner receives an approval request
- THEN the interface identifies the Owner, Agent, action, affected resource, permission scope, and consequence in plain language
- AND approval is distinct from merely viewing a notice
- AND revocation or help remains available.

### Requirement: Prototype boundary

ID: UXREF-REQ-006
Status: REFERENCE-ONLY

The dossier and later disposable mockups SHALL not imply backend persistence, real payment, live identity verification, production payout, legal protection, or genuine pilot evidence.

#### Scenario: Design agent shows a connected-payment flow

- GIVEN Direct Digital or Tiwala is being shown
- WHEN the screen renders
- THEN it carries a persistent sandbox/demo label and test data context
- AND it does not present a production transaction or legal escrow promise.

### Requirement: Canonical screen perspective completeness

ID: UXREF-REQ-007
Status: FOUNDATION

The reference workspace SHALL define the actor goal, visible hierarchy, primary action, and failure/recovery route for every canonical screen ID in the mockup bridge.

#### Scenario: Screen inventory is validated

- GIVEN the bridge defines 74 canonical screen IDs
- WHEN the reference workspace is mechanically scanned
- THEN all 74 IDs appear exactly once as primary rows in the screen perspective matrix
- AND no screen requires the designer to invent its user goal or recovery behavior.

### Requirement: Connected scenario completeness

ID: UXREF-REQ-008
Status: FOUNDATION

The reference workspace SHALL define a deterministic route, fixture, cross-role consequence, non-happy-path branch, and feedback task for `SCN-01` through `SCN-09`.

#### Scenario: Scenario inventory is validated

- GIVEN the bridge defines nine canonical scenario fixtures
- WHEN the reference workspace is mechanically scanned
- THEN all nine scenario IDs have design blueprints
- AND each blueprint distinguishes Order, Work, Payment, Evidence, Dispute, Consent, and Hold where applicable.

### Requirement: No inferred policy

ID: UXREF-REQ-009
Status: FOUNDATION

The reference workspace SHALL label unresolved policy rather than inventing a deadline, automatic completion rule, refund promise, trust score, verification claim, or release behavior.

#### Scenario: Designer encounters an unresolved rule

- GIVEN an upstream artifact does not define an exact timeout, appeal window, refund outcome, or verification strength
- WHEN the designer needs to represent that situation
- THEN the design uses conditional or support-oriented language
- AND does not invent a number or automatic outcome.
