# Frontend View Projection Kernel Capability

Status: PROPOSED  
Change: `establish-frontend-view-projection-kernel`  
Trace: feature architecture AD-1–AD-19; parent AD-1, AD-3–AD-7, AD-9, AD-12, AD-18–AD-20, AD-23–AD-29; `VP-BRW-001`, `VP-BRW-002`, `VP-LST-001`–`VP-LST-006`; CFP-REQ-001, 004–008; CMJ-REQ-001–002

## ADDED Requirements

### Requirement: Purpose-specific role-safe projection

ID: FVPK-REQ-001

A frontend screen SHALL receive a registered, versioned, purpose-specific projection derived from principal account, effective Owner/current grant, access purpose, addressed resource kind/source versions/row revision/state, relationship set, and visibility/reveal/activation policy versions. Production SHALL authorize and project on the Laravel server before Inertia serialization; only synthetic Scenario data MAY be projected locally. The projection SHALL contain only visible facts and resolved actions; raw persistence or fixture records SHALL NOT be page-component props.

#### Scenario: Unrelated member opens a public Listing

- GIVEN a signed-in account neither owns nor manages an active public Listing
- WHEN Listing detail is projected
- THEN the relationship is `member`
- AND only public/member facts are serialized
- AND owner management facts and actions are absent
- AND the primary commercial action comes from the projection.

#### Scenario: Unauthorized fact is inspected in browser state

- GIVEN a guest projection omits an owner-only capacity-management fact
- WHEN the rendered page props and projection object are inspected
- THEN the owner-only fact is absent
- AND it is not present behind CSS, an `isHidden` flag, or a disabled visual component.

### Requirement: Resource-discriminated actions

ID: FVPK-REQ-002

Action codes and view contracts SHALL be discriminated by resource kind. A Listing projection SHALL accept only Listing, authentication, acting-context, browse, and recovery actions approved by this change. Request and Quote action codes SHALL be unrepresentable in the Listing projection contract.

#### Scenario: Listing actions are constructed

- GIVEN an active product Listing projection
- WHEN actions are resolved
- THEN its action set may contain `listing.begin_booking`, `listing.add_to_picks`, `listing.save`, or other approved Listing actions
- AND cannot contain `request.start_quote`, `request.review_quotes`, or `quote.accept`.

#### Scenario: Presentation component renders actions

- GIVEN a Listing screen receives a projection with no primary action and one recovery action
- WHEN it renders
- THEN it shows the supplied recovery action
- AND does not infer Buy, Book, Manage, or Sign in from Listing fields or session role strings.

### Requirement: Additive account capability and contextual relationship

ID: FVPK-REQ-003

The frontend SHALL model account capabilities as additive and derive Owner, member, guest, and acting-Agent relationships per addressed Listing. It SHALL NOT store a global Buyer/Provider persona mode.

#### Scenario: Owner views own Listing

- GIVEN the current account owns the addressed Listing
- WHEN detail is projected
- THEN the relationship is `listing_owner`
- AND the primary action is the lifecycle-appropriate management action
- AND ordinary Buy/Book of the same Listing is not offered as primary.

#### Scenario: Agent opens the same Listing

- GIVEN an Agent has a current grant covering the Owner, Listing, action, sensitivity, and time
- WHEN the Agent enters that Owner context and opens the Listing
- THEN the relationship is `acting_agent`
- AND the projection preserves Owner identity and Agent attribution
- AND only grant-permitted actions are supplied.

### Requirement: Separate production and reviewer compositions

ID: FVPK-REQ-004

Production Laravel session state and reviewer Scenario state SHALL use separate build/server-selected composition roots, origins/applications, contexts, storage, caches, service workers, APIs, cookies, and navigation exposure. Production code SHALL NOT import `scenario/**`. Reviewer perspective switching SHALL exist only in an explicitly activated and authorized Scenario Lab, SHALL accept only synthetic-origin records, and SHALL NOT mutate or impersonate production authentication. Composition SHALL NOT be selectable by browser query, page props, or storage.

#### Scenario: Consumer opens production navigation

- GIVEN a normal production session or guest route
- WHEN navigation renders
- THEN no scenario selector, perspective switcher, fixture reset, or reviewer inspector appears.

#### Scenario: Reviewer changes perspective

- GIVEN a deterministic Listing scenario includes guest, member, Owner, and Agent perspectives
- WHEN a reviewer selects another authorized perspective
- THEN the addressed Listing facts remain the same canonical scenario state
- AND only the relationship projection changes
- AND no Laravel login/logout request is issued.

### Requirement: Schema-versioned deterministic repository

ID: FVPK-REQ-005

The Scenario adapter SHALL load normalized immutable synthetic JSON fixtures through a schema-versioned repository with stable IDs, deterministic time, distinct immutable business/source versions and aggregate row revisions, repository revision/CAS, append-only events, durable idempotency fingerprints/results, evidence classification, namespaced persistence, compatible migration, and exact reset. Components SHALL NOT import fixtures or browser storage.

#### Scenario: Refresh scenario

- GIVEN a permitted simulated Listing command changes a scenario aggregate
- WHEN the browser reloads
- THEN the same scenario, aggregate version, event, perspective, and evidence class remain
- AND no production account/session state is changed.

#### Scenario: Reset scenario

- GIVEN scenario state has changed
- WHEN the reviewer confirms reset
- THEN the repository restores an exact clone of the immutable seed
- AND removes generated events/idempotency results belonging to that scenario
- AND retains the visible fictional-data boundary.

#### Scenario: Stored schema is incompatible

- GIVEN persisted scenario state cannot be safely migrated
- WHEN the Lab loads
- THEN it shows an explained reset path
- AND does not silently merge incompatible records or render partial state.

### Requirement: Guarded deterministic commands

ID: FVPK-REQ-006

The browser SHALL submit only an allowlisted action code, target ID, expected row revision, idempotency key, and typed payload. It SHALL NOT supply trusted principal, effective Owner, grant, or policy context. Scenario dispatch SHALL derive those values from repository session/state; production SHALL derive them from the authenticated session and authoritative stores. Each action SHALL map through a closed registry to one explicit command/target/payload/result/invalidation contract. Dispatch SHALL reload the target and validate relationship conflicts, current grant, visibility, activation, expected row revision, and lifecycle immediately before one aggregate/event/idempotency-result commit. Prior action visibility SHALL NOT authorize dispatch.

#### Scenario: Direct forbidden command

- GIVEN a member projection contains no Listing management action
- WHEN a crafted `listing.archive` command targets that Listing
- THEN dispatch returns `permission_denied`
- AND no Listing version or event changes.

#### Scenario: Grant expires while screen is open

- GIVEN an acting Agent received a permitted action before grant expiry
- WHEN the deterministic clock passes expiry and the Agent dispatches it
- THEN dispatch returns a grant/permission denial
- AND the next projection offers exit or approval recovery
- AND no Listing state changes.

#### Scenario: Stale expected version

- GIVEN the Listing aggregate advanced from version 2 to 3
- WHEN a command expects version 2
- THEN dispatch returns `stale_version`
- AND requires reloading/reviewing the current projection
- AND does not apply the mutation.

#### Scenario: Idempotent retry

- GIVEN a command succeeded with one idempotency key
- WHEN the identical semantic command is retried with the same key
- THEN the original typed result is returned
- AND no second event or version increment occurs.

#### Scenario: Idempotency key is reused for different input

- GIVEN an idempotency key already identifies one successful command
- WHEN the key is reused with different target, expected version, or payload
- THEN dispatch returns `idempotency_conflict`
- AND no state changes.

### Requirement: Swappable production and scenario gateway

ID: FVPK-REQ-007

The migrated Listing screen SHALL depend on one `MarketplaceGateway` projection/intent contract. Laravel SHALL construct the safe production purpose projection before Inertia serialization; the production browser adapter SHALL only validate/translate that envelope. The deterministic Scenario adapter MAY project synthetic repository state locally. Selecting an adapter SHALL occur at server/build composition, not inside feature components or browser-controlled state.

#### Scenario: Production Listing route

- GIVEN Laravel has authorized and constructed an existing Listing purpose projection
- WHEN the production adapter validates the envelope
- THEN the React screen renders the registered Listing projection
- AND enabled booking still navigates to the server-provided route
- AND unavailable permissions are not fabricated by the adapter
- AND no raw Listing aggregate crosses into the browser projector.

#### Scenario: Scenario Listing route

- GIVEN the Lab addresses a deterministic Listing
- WHEN the Scenario adapter maps it
- THEN the same React screen renders without production HTTP mutation
- AND its actions obey deterministic policy and command guards.

### Requirement: Canonical projection and action registries

ID: FVPK-REQ-010

`application/contracts` SHALL own one Listing projection schema registry and one action-dispatch registry. The projection registry SHALL exhaustively define status, relationship, fact omission, overlays, action vocabulary, and compatibility by schema version. The action registry SHALL map each code to exactly one owner, target kind, explicit command/navigation, payload/result schema, expected row-revision source, and invalidation set. Unknown schema versions SHALL yield `projection_unsupported` with no commercial actions; registry mismatches SHALL yield `invalid_action` with no effect.

#### Scenario: Unsupported projection version arrives

- GIVEN the production adapter receives a Listing envelope with an unregistered schema version
- WHEN it validates the envelope
- THEN it returns the safe `projection_unsupported` recovery state
- AND exposes no commercial action.

#### Scenario: Action target does not match registry

- GIVEN a crafted intent pairs `listing.archive` with a target or row revision fingerprint that violates its registry entry
- WHEN dispatch resolves the action
- THEN it returns `invalid_action`
- AND no state, event, or idempotency result is committed.

### Requirement: Complete projection query identity

ID: FVPK-REQ-011

Projection lookup and caching SHALL bind composition/environment/evidence class, access purpose, resource kind/ID, immutable source/business versions, aggregate row revision, principal, effective Owner/grant version, visibility/reveal/activation policy versions, and every list/filter input. Cross-identity reuse SHALL be prohibited. Mutation, logout, perspective/Owner/grant/policy/reset change SHALL rotate or invalidate affected entries; an asynchronous response SHALL be discarded if its identity no longer matches current context.

#### Scenario: Acting context changes during request

- GIVEN an acting-Agent Listing projection request is in flight
- WHEN the reviewer exits that Owner context before the response resolves
- THEN the stale response is not committed to the current screen or cache
- AND the next query derives the unrelated-account projection.

### Requirement: Static mobile prototype remains visual-only

ID: FVPK-REQ-008

This change SHALL NOT add relationship-, lifecycle-, visibility-, bidding-, or authorization-dependent behavior to `docs/design-kit/browse-mobile.html` or `public/browse-mobile.html`. Those files MAY be consulted for visual composition and MAY receive separately requested isolated visual refinements.

#### Scenario: Implement role-safe Listing behavior

- GIVEN the role-safe Listing screen is implemented
- WHEN source changes are reviewed
- THEN behavioral implementation exists under `resources/js`
- AND no parallel role engine or fixture state was added to the static HTML prototype.

### Requirement: Behavioral verification at real surfaces

ID: FVPK-REQ-009

Completion SHALL require focused contract/component tests and browser verification of the production Listing route and reviewer Scenario Lab at desktop and 360–375px widths. Build success or a static screenshot alone SHALL NOT satisfy acceptance.

#### Scenario: Verify first projection slice

- GIVEN implementation is proposed complete
- WHEN the affected checks and browser journeys run
- THEN guest, member, Owner, authorized Agent, expired Agent, unavailable Listing, stale command, refresh, and reset behaviors pass
- AND consumer navigation exposes no reviewer controls
- AND console/page errors are absent on exercised paths.