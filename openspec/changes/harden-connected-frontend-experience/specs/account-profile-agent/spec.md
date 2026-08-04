# Account, Profile, and Agent Experience Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-001–005; UX-001–004; ACC-001–007; LST-001–007; AGT-001–004; TRU-001–004; SCN-06; frontend UX closure audit §§11–12

## ADDED Requirements

### Requirement: One account with contextual capabilities

ID: APA-REQ-001

The consumer frontend SHALL present one signed-in account whose capabilities determine eligible actions. Buyer and Provider SHALL appear only as relationships to a specific transaction. Agent SHALL appear only through explicit Owner-specific consent grants.

#### Scenario: Account participates in different relationships

- GIVEN Rosa owns one listing, requests another service, provides work on another Order, and helps an Owner
- WHEN she opens Activity or Me
- THEN each item states the relevant relationship and affected entity
- AND no global Buyer/Provider/Agent persona switch is required.

### Requirement: Account overview and access meaning

ID: APA-REQ-002

Me Overview SHALL show display identity, safe location precision, access tier, active capabilities, conditional/forbidden actions, evidence-based public status, privacy boundary, and one useful setup/next action.

#### Scenario: Capability is gated

- GIVEN an account may browse but lacks a required grant or setup gate for an action
- WHEN the action is selected
- THEN the UI explains the missing permission/evidence/setup
- AND offers approval, help, save-draft, browse, or safe exit as applicable
- AND does not imply broad identity verification.

### Requirement: My Marketplace hub

ID: APA-REQ-003

Me SHALL provide actionable views for My Requests, My Listings, Orders as Buyer, and Orders as Provider. Each item SHALL preserve entity identity, state meaning, next action, and contextual relationship.

#### Scenario: Open owned listing

- GIVEN Rosa owns an active listing
- WHEN she opens My Listings and selects it
- THEN the listing-management route opens with Owner attribution and lifecycle actions
- AND not a generic capability card.

### Requirement: Privacy and accessibility controls

ID: APA-REQ-004

Me SHALL expose public/private profile-field meaning, location/contact exposure, consent/data-use status, language, low-data/readability/help preferences, and retention/deletion information. Controls that require backend enforcement SHALL be contract-ready and labeled unavailable or simulated until enforcement exists.

#### Scenario: Change a frontend-safe preference

- GIVEN the user changes language/readability/low-data preference in the deterministic frontend
- WHEN they save and reload
- THEN the preference persists locally and affected UI behavior changes where implemented
- AND the screen states that account-wide server synchronization awaits backend support.

### Requirement: Notifications, support, and account lifecycle seams

ID: APA-REQ-005

Me SHALL expose notification preferences/fallback meaning, critical notice history, support cases, reports/disputes initiated by the user, logout, recovery/contact-update, pause/deactivation, and data export/deletion-request seams. Unsettled policy or backend-dependent actions SHALL remain explicit and nonfunctional rather than false-success controls.

#### Scenario: Backend-dependent lifecycle action

- GIVEN account deletion is not implemented by a backend
- WHEN the user opens the control
- THEN the screen explains that the action is unavailable in the fictional frontend
- AND provides the approved support/info path if one exists
- AND does not display a synthetic deletion success.

### Requirement: Agent invitation and scoped consent

ID: APA-REQ-006

Agent assistance SHALL begin with an Owner/Agent invitation and a Consent Grant defining purpose, resources, allowed actions, approval-required actions, always-forbidden actions, start/expiry, attribution, notices, pause, and revocation.

#### Scenario: Owner approves draft-only scope

- GIVEN Lola Nena reviews Rosa’s fictional invitation
- WHEN she approves permission to draft a Product Listing but not publish or handle money
- THEN an active versioned grant is created
- AND both actors see its scope, expiry, and revocation route
- AND publication/custody remain blocked without separate authority.

#### Scenario: Invitation expires

- GIVEN an invitation is expired
- WHEN either actor attempts activation
- THEN activation is blocked
- AND the expired invitation remains in history
- AND a new invitation or help route is offered.

### Requirement: Agent Today workspace

ID: APA-REQ-007

An account with active Agent grants SHALL have an Agent Today workspace organized by Needs action now, Waiting for Owner approval, Due today, Overdue/permission expiring, Waiting for Buyer/Provider, and Completed today.

Each task SHALL identify Owner, resource, changed state, permitted next action, grant status, approval requirement, and blocked reason.

#### Scenario: Open Agent task

- GIVEN Rosa has a permitted draft-listing task for Lola Nena
- WHEN she opens the task from Agent Today
- THEN the Owner, grant scope, affected resource, attribution, and permitted primary action are visible before editing
- AND actions outside scope are not offered as normal actions.

### Requirement: Persistent acting-for context and attribution

ID: APA-REQ-008

While acting for an Owner, the interface SHALL display a persistent acting-for banner, scope/expiry, actions requiring approval, always-forbidden actions, and an exit control. Every command/event SHALL preserve both Agent and Owner attribution without transferring ownership.

#### Scenario: Agent creates Owner listing draft

- GIVEN Rosa is acting under Lola Nena’s draft-only grant
- WHEN Rosa saves a Product Listing draft
- THEN Lola Nena remains the Owner
- AND Rosa is recorded as the acting Agent
- AND an Owner notice is created
- AND the draft is not publicly active.

### Requirement: Owner approval, notices, and revocation

ID: APA-REQ-009

The Owner SHALL review attributed Agent actions, approve or decline approval-required actions, pause or revoke access, and see the future-action consequence. Revocation SHALL preserve prior history and block future commands.

#### Scenario: Owner approves publication

- GIVEN an Agent-created draft requires Owner approval
- WHEN Lola Nena reviews the exact listing preview and approves
- THEN the allowed publication transition occurs under Owner authority
- AND Agent and Owner attribution remain in history.

#### Scenario: Owner revokes grant

- GIVEN an active grant exists
- WHEN Lola Nena revokes it
- THEN future Agent commands are denied
- AND current/past actions and notices remain visible
- AND Rosa sees the revoked reason/status rather than a generic failure.

### Requirement: Forbidden Agent custody and ownership actions

ID: APA-REQ-010

Agent permission SHALL never imply money custody, payout authority, ownership transfer, identity ownership, or broad account control. Forbidden actions SHALL remain blocked even if a fixture Owner tries to approve them.

#### Scenario: Agent attempts cash custody

- GIVEN Rosa is acting for Lola Nena
- WHEN she attempts to receive, hold, confirm, or redirect Lola Nena’s cash as platform authority
- THEN the action is blocked with the canonical boundary
- AND the attempt is attributable in the fictional audit history if appropriate
- AND no payment or Work state changes.

### Requirement: Complete SCN-06

ID: APA-REQ-011

The frontend SHALL not call Agent assistance implemented until the deterministic `SCN-06` route passes invitation, explanation, draft-only grant, Agent Today task, acting-for draft creation, Owner notice, Owner publication approval, forbidden custody blocking, revocation, future-action denial, and preserved history.

#### Scenario: Review complete Agent journey

- GIVEN the canonical `SCN-06` fixture is reset
- WHEN a reviewer completes the Owner and Agent perspectives
- THEN every cross-actor consequence is visible after the relevant action
- AND ownership, permission, attribution, approval, and revocation remain distinct
- AND browser automation passes after refresh.

### Requirement: Agent reuses normal Owner resource interfaces

ID: APA-REQ-012

After selecting an authorized Owner, the Agent SHALL use the same My Listings, My Requests, My Responses, Orders, Work, and related resource routes/components as the Owner. `ViewerContext`, active Consent Grant, resource scope, and command permission SHALL determine available controls. The frontend SHALL NOT maintain a duplicate Agent-specific transactional interface for those resources.

#### Scenario: Owner and Agent open the same listing editor

- GIVEN Lola Nena owns Listing L-101
- AND Rosa has an active draft-edit grant for L-101
- WHEN Lola opens L-101 from My Listings and Rosa opens it from Agent Today
- THEN both routes resolve to the same listing editor implementation and Listing ID/version
- AND Lola sees Owner authority
- AND Rosa sees the acting-for banner and grant-limited commands
- AND entity facts do not diverge.

#### Scenario: Agent exits Owner workspace

- GIVEN Rosa is acting for Lola Nena
- WHEN Rosa uses `Exit Owner workspace`
- THEN the acting-for context clears
- AND Owner-scoped cached queries/commands cannot be reused without a new valid context
- AND Rosa returns to Agent Today or Managed Owners.

#### Scenario: Agent switches between two managed Owners

- GIVEN Rosa has one active grant for Lola Nena and another active grant for Owner B
- AND both Owners have intentionally similar listing/request fixtures
- WHEN Rosa switches from Lola Nena to Owner B
- THEN every query/cache key, route lookup, command envelope, notice, and permission check uses Owner B plus its Consent Grant/version
- AND no Lola Nena Listing, Request, Quote, Order, notice, or grant detail appears in Owner B context
- AND a stale deep link or cached command from Lola Nena is rejected until its original context is explicitly re-entered
- AND each Owner independently sees the same canonical resource versions/history that Rosa saw while acting for that Owner.

### Requirement: Grant scope is resource, action, sensitivity, and duration aware

ID: APA-REQ-013

A Consent Grant SHALL define grantor, grantee, purpose, resource scope, allowed actions, sensitivity, approval requirements, notice behavior, effective/expiry time, and status. Permission checks SHALL occur at command dispatch, not only by hiding controls.

#### Scenario: Hidden control is invoked directly

- GIVEN Rosa’s grant does not permit Quote submission
- WHEN a crafted/direct command attempts submission despite the control being absent
- THEN gateway authorization denies the command
- AND no Quote, notification, or event is created except an allowed denied-attempt audit record
- AND Owner resources remain unchanged.

#### Scenario: Grant expires while editor is open

- GIVEN Rosa opened an Owner listing before grant expiry
- WHEN the grant expires before save
- THEN save is denied with expired-grant recovery
- AND safe local input may be preserved for Owner handoff
- AND no resource update occurs.

### Requirement: Owner notice intent and simulated delivery remain separate

ID: APA-REQ-014

Critical Agent actions SHALL create an Owner notification intent linked to the exact resource/action. In-app and simulated SMS deliveries SHALL be separate attempts with queued, delivered, failed, retry, and fallback states. The frontend SHALL always state that no real SMS was sent and SHALL not roll back the domain action merely because delivery failed.

#### Scenario: Agent action succeeds but simulated SMS fails

- GIVEN Rosa saves an authorized Owner listing draft
- WHEN the Owner notification intent is created and simulated SMS delivery fails
- THEN the draft and Agent attribution remain
- AND Lola can see the notice in-app after login
- AND failure/retry/support state is visible
- AND retrying delivery does not repeat the draft save.

#### Scenario: Simulated STOP or REVOKE reply

- GIVEN a fictional Owner notice exposes an SMS reply demonstration
- WHEN the reviewer triggers `STOP` or `REVOKE`
- THEN the fixture applies the defined pause/revoke effect idempotently
- AND records correlation and attribution
- AND the UI says the inbound provider/OTP/replay-security flow is simulated and still requires backend design.
