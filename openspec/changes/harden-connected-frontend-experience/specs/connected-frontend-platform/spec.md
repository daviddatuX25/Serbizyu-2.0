# Connected Frontend Platform Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-001–005, PRD-018–021; UX-001–023; SYS-001–004; domain-state contracts §§1–9; frontend UX closure audit §§2, 5, 13–15

## ADDED Requirements

### Requirement: Versioned deterministic scenario state

ID: CFP-REQ-001

The review frontend SHALL persist normalized fictional scenario state, aggregate versions, current reviewer actor, fixture classification, failure variant, and append-only events through refresh. It SHALL provide an explicit deterministic reset and schema-version recovery.

#### Scenario: Refresh a connected scenario

- GIVEN `SCN-01` has advanced after the Buyer reports cash paid
- WHEN the browser reloads
- THEN the same Order, Work, Payment Obligation, actors, aggregate versions, and attributed events remain visible
- AND Work remains unchanged
- AND the interface continues from the correct next action rather than returning to seed state.

#### Scenario: Reset a scenario

- GIVEN a reviewer has changed several records
- WHEN they confirm `Reset this fictional scenario`
- THEN the repository restores the exact canonical fixture
- AND clears only that scenario’s generated state
- AND shows the fictional/no-backend boundary.

#### Scenario: Persisted schema is incompatible

- GIVEN stored fixture state has an unsupported schema version
- WHEN the application loads
- THEN it migrates with recorded result or offers an explained reset
- AND never silently renders mixed or stale aggregate state.

### Requirement: Entity-scoped routing and query identity

ID: CFP-REQ-002

Every listing, request, quote, Order, Work Instance, Payment Obligation, Owner grant, and Quick Deal session SHALL be addressed by a stable entity ID in the route and query key. A navigation action SHALL preserve the selected entity and SHALL NOT substitute a global fixture.

#### Scenario: Open a listing

- GIVEN Lina’s `Basic trouser alteration` card is selected
- WHEN the user opens the listing and starts an allowed action
- THEN every resulting screen retains Lina, the selected listing ID/version, and its amount semantics
- AND no Noel Ramos fixture is substituted.

#### Scenario: Invalid entity route

- GIVEN a route contains an unknown Order ID
- WHEN the route resolves
- THEN the application shows an Order-not-found recovery state
- AND offers Activity, Browse, or scenario reset as appropriate
- AND does not silently render Home.

### Requirement: Central route registry and guarded recovery

ID: CFP-REQ-003

The frontend SHALL define routes centrally with parameter parsing, route titles, authorization requirements, loading behavior, and explicit not-found/invalid-state recovery. Unknown hashes SHALL not fall through to Home.

#### Scenario: Unauthorized Agent route

- GIVEN the current viewer has no active grant for the requested Owner
- WHEN they open an Owner-specific Agent route
- THEN the route is denied with the missing/revoked/expired grant explanation
- AND offers a safe exit or approval/help route
- AND reveals no Owner-private task data.

### Requirement: Reviewer-only scenario harness

ID: CFP-REQ-004

The frontend SHALL provide an internal, clearly labeled scenario harness that selects implemented canonical fixtures, switches only among authorized fixture actors, preserves shared state, exposes separate aggregate state, injects deterministic failure variants, and resets safely. It SHALL be absent from normal consumer navigation.

#### Scenario: Switch authorized perspective

- GIVEN an `SCN-01` Order is shared by its fictional Buyer and Provider
- WHEN the reviewer switches from Buyer to Provider
- THEN the same accepted terms and event history remain stable
- AND only Provider-authorized actions become primary
- AND the consumer interface does not present this switch as a real account persona toggle.

#### Scenario: Attempt unauthorized perspective

- GIVEN an actor is not part of the selected fixture
- WHEN the reviewer tries to switch to that actor
- THEN the harness blocks the switch and explains fixture authorization.

### Requirement: Actor-attributed guarded commands

ID: CFP-REQ-005

All state-changing frontend commands SHALL include an idempotency key, acting account, optional acting-for Owner, target aggregate and ID, expected aggregate version, fixture/evidence class, and payload. The adapter SHALL validate guards, append an event, and return typed success or failure.

#### Scenario: Retry an already applied command

- GIVEN a cash-report command succeeded but the UI did not receive the first response
- WHEN the same idempotency key is retried
- THEN the report is not duplicated
- AND the original result and event remain authoritative in the fictional repository.

#### Scenario: Submit against stale version

- GIVEN accepted terms changed in another authorized perspective
- WHEN a command uses the prior expected version
- THEN the adapter returns a stale/conflict result
- AND the UI requires refresh and explicit re-review
- AND does not silently overwrite the newer state.

### Requirement: Swappable local and backend gateway

ID: CFP-REQ-006

Consumer journey modules SHALL depend on a typed `MarketplaceGateway` and entity-scoped hooks. The deterministic local adapter and future Laravel HTTP adapter SHALL implement the same view contracts, command inputs, actor attribution, version semantics, and typed error classes.

#### Scenario: Replace the adapter

- GIVEN a journey passes against the deterministic adapter
- WHEN the application is configured with a conforming HTTP adapter
- THEN route components and user-facing state logic require no redesign
- AND only transport, authentication, and server integration behavior changes.

### Requirement: Visible actionable control contract

ID: CFP-REQ-007

Every visible interactive-looking control SHALL either perform the stated action, navigate to a valid route, or be explicitly disabled with a plain-language reason and next step. Plain display cards SHALL not be styled or announced as controls.

#### Scenario: Capability is deferred

- GIVEN a user encounters a deferred or sandbox capability
- WHEN they inspect its action
- THEN the action is unavailable with persistent status, reason, and nearest valid alternative
- AND clicking it cannot produce a false success.

### Requirement: Recovery-state coverage

ID: CFP-REQ-008

Major journeys SHALL provide stable, non-toast-only UI for validation, permission denial, stale/conflict, expiry, offline/unavailable, retryable failure, mismatch, dispute/hold, deferred capability, empty result, and invalid entity where applicable. User input and attributable history SHALL be preserved when safe.

#### Scenario: Browse has no results

- GIVEN filters produce no matching active supply
- WHEN Browse renders the empty state
- THEN it offers clear filters, create a request, browse another category, or get help
- AND does not show an unexplained blank panel.

### Requirement: Responsive low-literacy and accessibility baseline

ID: CFP-REQ-009

The frontend SHALL support 360px–desktop layouts with one obvious primary action, approximately 48px mobile targets, icon plus concrete text, reserved bottom-navigation space, safe-area-aware sticky actions, visible focus, logical keyboard order, dialog focus management, text state meaning, and reduced-motion behavior.

#### Scenario: Complete a primary task at 360px

- GIVEN the application is rendered at 360px width
- WHEN the user follows a primary journey
- THEN the primary action is visible or predictably sticky above navigation
- AND no content/action is covered by bottom navigation
- AND no horizontal scrolling is required.

### Requirement: Production-artifact browser verification

ID: CFP-REQ-010

Connected frontend acceptance SHALL run through automated browser tests against the production build artifact and SHALL be repeated against the published GitHub Pages build. Build success alone SHALL not count as journey acceptance.

#### Scenario: Deploy a completed slice

- GIVEN a vertical slice passes typecheck and unit tests
- WHEN it is proposed as complete
- THEN desktop and 360–375px browser scenarios pass against the production artifact
- AND the public deployed routes, transitions, refresh behavior, console, and selected-entity identity are re-tested.
