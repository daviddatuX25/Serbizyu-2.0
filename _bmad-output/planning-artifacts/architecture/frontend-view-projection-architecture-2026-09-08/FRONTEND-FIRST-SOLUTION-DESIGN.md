# Serbizyu Frontend-First Executable Product Model

Status: ARCHITECTURE COMPANION — founder-directed; implementation requires approved OpenSpec slices  
Date: 2026-09-08  
Audience: Founder, product/UX, frontend engineers, backend engineers, QA, and implementation agents  
Primary authority: `ARCHITECTURE-SPINE.md`  
Matrix: `VIEW-PROJECTION-MATRIX.md`

## 1. Decision

Serbizyu will continue **frontend-first**, but not by expanding the static mobile HTML into a simulated application.

The next product-discovery surface is the existing React 19 + Inertia 3 application. It will support two explicit compositions:

1. **Production composition** — real Laravel session authentication and already implemented backend slices.
2. **Scenario Lab composition** — deterministic JSON-backed behavior for product slices whose backend is intentionally unfinished.

Both compositions feed the same screen contracts. This allows the founder to refine real interactions, roles, views, and state transitions before funding all backend implementation, while preventing mock-only shortcuts from becoming accidental production architecture.

## 2. Why the earlier mock became unstable

The connected HTML prototype proved the desired visual language, listing richness, compact mobile composition, image treatment, and several useful interaction ideas. It became unstable when one document also began owning:

- session and persona simulation;
- listing and request polymorphism;
- request-owner versus bidder decisions;
- public versus sealed bid visibility;
- partner/deal-node views;
- sticky CTA selection;
- negotiation state;
- Orders and fulfillment;
- local persistence; and
- backend-like transitions.

Those concerns do not fail because HTML is incapable. They fail because a single untyped surface has no enforceable boundary between domain state, authorization, projection, and presentation. Each refinement adds another condition against mutable shared variables. A new visual decision can therefore change the wrong role or resource.

The remedy is not a full backend first. The remedy is an **executable frontend product model with typed boundaries**.

## 3. Reality audit

### 3.1 Installed application reality

The repository already uses:

- Laravel 12.68 and PHP 8.4;
- Inertia Laravel 3.2.1;
- React 19.2.8 and React DOM 19.2.8;
- TypeScript 5.9.3;
- Vite 7.3.6;
- Tailwind CSS 4.3.3;
- Vitest 4.1.10 and Playwright 1.62.1.

There is no stack choice to make. Svelte would create a second component/runtime system without removing Laravel/Inertia or the existing React code.

### 3.2 Existing production slices

The current application already contains real foundations for:

- Laravel browser-session authentication and onboarding;
- public listing Browse;
- listing details;
- listing-owner workspace and lifecycle;
- governed categories/capability profiles/capacity;
- ordinary Order proposal/finalization foundations;
- Pest, Vitest, and browser tooling.

The frontend is not an empty prototype. New architecture must evolve these files rather than propose a separate `frontend/src` application.

### 3.3 Current frontend fault line

`resources/js/types.ts` currently accepts both camelCase and snake_case copies and permits open-ended lifecycle strings. `ProductExperience.tsx` still acts as a broad page-mode controller. `ListingDetailView.tsx` derives resource meaning from string inspection and resolves Buy/Book behavior inside the component. `MarketplaceBrowsePage.tsx` assumes every result can be added to a basket.

These are understandable foundation shortcuts. They are precisely where Request and role-dependent behavior would compound into conditional spaghetti.

### 3.4 Planning reality

The promoted domain and architecture already settle the load-bearing model:

- Listing is supply owned by one provider/owner.
- Request is demand owned by one requester.
- Bid is presentation vocabulary for a versioned Quote response.
- Accepted terms form an ordinary immutable Order.
- Work, Payment Obligation, Evidence, Dispute, Consent, and Hold are independent authorities.
- Deal Chain coordinates independent Deal Needs and child Orders; it is not a parent Order or wallet.
- No pooled escrow or parent financial liability exists.
- Agent action is scoped acting-for behavior, not identity impersonation or ownership transfer.

Documents 21–24 add useful proposed detail for public/sealed/direct-invite tenders, proposal provenance, child-order execution, and fault testing. They remain subordinate where they have not been propagated into promoted authorities.

### 3.5 Documentation conflicts disposition

| Input | Useful contribution | Disposition |
| --- | --- | --- |
| Docs 10/10a/10b | Screen IDs, UX anatomy, connected scenarios | Retain as design-reference input; matrix here normalizes relationship/action logic. |
| Doc 11a | JSON-backed connected mock concept | Superseded for source layout and baseline claims; retained for deterministic-state intent. |
| Docs 12/14 | Founder-approved Deal-Chain foundation | Binding through promoted domain/architecture. |
| Docs 15/16 | DAG and handoff exploration | Historical research only; pooled escrow, automatic release, bonds, and universal custody rules are rejected. |
| Docs 17–20 | Corrections, listing extensions, role evaluation | Supporting design evidence; only promoted invariants are binding. |
| Docs 21–24 | Tender/proposal/work/QA hardening | Proposed slice specifications; consume where compatible, propagate before production backend behavior. |
| Doc 25 | Broad synthesis | Supporting synthesis; exact API/table claims do not override canonical contracts. |
| Doc 26 | View projection direction | Research input only. Its raw-entity avoidance is adopted; its escrow and global role terminology are rejected. |
| Static mobile HTML | Visual reference and founder preference evidence | Frozen for role/view/state implementation. Continue only isolated visual refinements. |
| Existing `harden-connected-frontend-experience` OpenSpec | Rich requirement inventory | Reframe as a program/reference package; implementation must be split into reviewable vertical changes using current paths and actual baseline. |

## 4. Product model for frontend discovery

### 4.1 Separate account capability from resource relationship

An account may have additive capabilities such as:

- create requests;
- offer products/services;
- act as an Agent under grants;
- perform operations under explicit scopes.

A screen-level relationship is derived from the resource:

- a person is `requester` for a Request they own;
- `eligible_responder` before submitting a Quote;
- `bidder` for their own Quote lineage;
- `listing_owner` for their Listing;
- `buyer` or `provider` for an accepted Order;
- `invited_partner` for one Deal Need;
- `acting_agent` only while a valid grant and owner context apply.

No user permanently switches into Buyer or Provider mode.

### 4.2 Projection formula

For each addressed resource:

```text
principal account
+ effective Owner and current grant version
+ access purpose
+ resource kind and immutable source/business versions
+ aggregate row revision and lifecycle state
+ viewer-resource relationship set
+ visibility, reveal, and activation policy versions
= purpose-specific view projection
```

This full tuple is the query/cache identity. Mutation, logout, perspective/Owner/grant/policy/reset changes invalidate affected projections. The projection decides:

- fields included or omitted;
- exhaustive status and safe explanation;
- one primary action;
- secondary and recovery actions;
- whether a non-sensitive disabled educational action is appropriate;
- registry-owned command target and expected row revision.

### 4.3 Projection envelope

```ts
type ViewProjection<K extends ResourceKind, F, V extends number> = {
    schemaVersion: V;
    resource: {
        kind: K;
        id: ResourceId<K>;
        sourceVersionIds: string[];
        rowRevision: number;
    };
    viewer: {
        principalAccountId: UserId | null;
        effectiveOwnerId: UserId | null;
        resolvedGrantVersion: number | null;
        accessPurpose: AccessPurpose;
    };
    relationships: readonly RelationshipCode[];
    facts: F;
    status: StatusMeaningByResource[K];
    primaryAction: AvailableActionDescriptor<K> | null;
    secondaryActions: readonly ActionDescriptor<K>[];
    recoveryActions: readonly ActionDescriptor<K>[];
    meta: {
        authority: 'canonical' | 'simulation';
        dataOrigin: 'production_projected' | 'synthetic';
        evidenceClass: 'CAPSTONE' | 'SANDBOX' | 'TEAM_TRAINING';
        visibilityPolicyVersion: string;
        activationPolicyVersion: string;
        generatedAt: string;
    };
};
```

### 4.4 Action descriptor

```ts
type AvailableActionDescriptor<K extends ResourceKind> = {
    availability: 'available';
    code: ActionCodeFor<K>;
    label: string;
    intent: 'navigate' | 'command' | 'open_composer' | 'open_dialog';
    target: RegisteredActionTarget<K>;
    confirmation?: { title: string; consequence: string };
};

type DisabledEducationalAction = {
    availability: 'disabled';
    code: RecoveryActionCode;
    label: string;
    disabledReason: SafeDisabledReason;
};

type ActionDescriptor<K extends ResourceKind> =
    | AvailableActionDescriptor<K>
    | DisabledEducationalAction;

An action absent from the projection must not render. A disabled educational action has no executable target and appears only when the viewer may safely know the unmet dependency; unauthorized/private actions are omitted. CSS hiding and prior action presence are never authorization.

### 4.5 Resource-specific detail types

Do not create one `MarketplaceItemDetail` with dozens of optional fields.

```ts
type ListingDetailProjection = ViewProjection<'listing', ListingDetailFacts>;
type RequestDetailProjection = ViewProjection<'request', RequestDetailFacts>;
type QuoteDetailProjection = ViewProjection<'quote', QuoteDetailFacts>;
type OrderWorkspaceProjection = ViewProjection<'order', OrderWorkspaceFacts>;
```

A Listing detail may own fulfillment selection and `listing.book`/`listing.request_quote`. A Request detail may own `request.submit_quote`, `request.review_quotes`, or `request.manage`. This type separation makes an `Add to Picks` Request state unrepresentable.

## 5. Deterministic scenario architecture

### 5.1 What the JSON layer is

It is a local adapter with domain-shaped behavior, not a collection of hard-coded API responses.

It must prove:

- the same entity is seen differently by authorized relationships;
- state changes persist through refresh;
- stale versions fail;
- idempotent retries do not duplicate effects;
- sealed data never enters competitor projections;
- accepted terms create the correct downstream simulated records;
- forbidden controls do not leak;
- reset returns the exact fixture.

It does not prove Laravel authorization, database constraints, live payment behavior, or production security.

### 5.2 Repository shape

The first repository version should contain only entities needed by implemented slices:

```ts
type ScenarioSnapshotV1 = {
    schemaVersion: 1;
    scenarioId: ScenarioId;
    dataOrigin: 'synthetic';
    evidenceClass: 'CAPSTONE' | 'SANDBOX' | 'TEAM_TRAINING';
    repositoryRevision: number;
    clock: { now: string };
    review: { perspectiveAccountId: UserId; failureVariant?: string };
    users: Record<UserId, ScenarioUser>;
    capabilities: Record<UserId, CapabilityCode[]>;
    grants: Record<ConsentGrantId, ConsentGrant>;
    listings: Record<ListingId, Listing>;
    listingVersions: Record<ListingVersionId, ListingVersion>;
    requests: Record<RequestId, Request>;
    quotes: Record<QuoteId, QuoteVersion>;
    orders: Record<OrderId, Order>;
    workInstances: Record<WorkId, WorkInstance>;
    obligations: Record<ObligationId, PaymentObligation>;
    events: ScenarioEvent[];
    rowRevisions: Record<string, number>;
    idempotencyResults: Record<string, ScenarioCommandResult>;
};
```

Do not pre-create every table from the 58-table backend schema. Add a normalized collection only when an implemented UI slice needs its identity, lifecycle, relationship, or cross-perspective consequence.

### 5.3 Fixture authority labels

Every fixture record identifies:

- `authority: canonical | proposed | simulation`;
- `sourceRef`, such as `UX-006`, `RBQ-REQ-004`, or `Doc21 §5`;
- `evidenceClass`;
- optional `policyPending` flags.

A proposed tender rule can therefore be explored without being mistaken for a migrated production contract.

### 5.4 Command execution

```text
receive untrusted intent
→ validate action code, target fingerprint, and payload against ActionDispatchRegistry
→ derive simulated principal/effective Owner/current grant from repository session
→ reject overlapping-party/self-award context
→ load exact target and compare row revision
→ enforce current relationship + visibility + activation
→ enforce lifecycle guard
→ apply one deterministic transition to a copy
→ append attributable event and idempotency result
→ compare repository revision and commit state/event/result atomically
→ invalidate affected projection identities
→ return authoritative typed projection or typed failure
```

The deterministic repository uses a copy/validate/CAS/commit boundary so a failed operation leaves the prior valid snapshot authoritative. It does not prove database locking, durable outbox/inbox, crash recovery, audit completeness, or production security.

## 6. UI discovery program

### Slice F0 — Projection kernel and Scenario Lab

Purpose: establish the reusable mechanism before adding another role-aware screen.

Deliver:

- canonical projection/action types;
- production and scenario adapter interfaces;
- versioned scenario repository and reset;
- reviewer-only route and perspective selector;
- deterministic clock and typed errors;
- current real listing fixtures translated at an adapter boundary.

Exit evidence:

- production Browse still uses the real Laravel path;
- Scenario Lab can show one Listing from guest, unrelated authenticated account, Owner, and acting Agent perspectives;
- crafted direct intent is denied by current command policy even if the prior projection contained or omitted an action;
- refresh and reset behave deterministically.

### Slice F1 — Browse, Listing Detail, and Request Detail separation

Purpose: fix the exact class of CTA/view contamination the founder observed.

Deliver:

- separate listing and request cards;
- separate typed detail screens;
- resource-aware routes;
- projection-owned sticky docks;
- owner/responder/guest perspectives;
- no basket action on Requests;
- no bid/review-offers action on Listings.

Exit evidence:

- visual design follows the accepted mobile kit;
- the same Request shows `Review offers` only to its requester;
- an eligible responder sees `Submit bid`;
- a bidder sees their response status/revision action;
- an unrelated/guest viewer sees only policy-authorized public facts;
- sealed competitor terms are absent from the projection object, not CSS-hidden.

### Slice F2 — Quote/Bid and negotiation

Purpose: explore the complete pre-contract behavior before backend expansion.

Deliver:

- proposal source selection from owned Listing Version or approved capability profile;
- structured scope, price, schedule, parts, warranty, deliverables, Work shape, and validity;
- immutable Quote versions;
- clarification separate from terms;
- counteroffer as a new version;
- public/open, sealed, and direct-invite projection variants;
- requester comparison and explicit award.

Exit evidence:

- cheapest bid is never auto-awarded;
- only the requester can accept;
- provider cannot accept their own bid;
- sealed competitors cannot inspect each other;
- stale/expired/superseded Quote acceptance fails without creating an Order.

### Slice F3 — Agreement consequence

Purpose: ensure frontend bidding decisions do not imply impossible backend state.

Deliver:

- accepted terms summary;
- simulated idempotent Order formation;
- immutable source/version links;
- separate Order, Work, and Payment Obligation panels;
- Activity entries for buyer/provider;
- failure and retry states.

Exit evidence:

- one accepted ordinary bid creates one Order;
- a multi-node accepted plan creates one independent child Order per billable Need;
- payment remains unresolved and Work not completed;
- retry cannot duplicate Orders.

### Slice F4 — Partner and Deal-Chain coordination

Purpose: explore partnered fulfillment only after ordinary bilateral behavior is stable.

Deliver:

- coordinator, invited partner, and unrelated-provider projections;
- Need-specific invitation and standard-auto-bind distinction;
- partner view limited to their Need/child Order;
- dependency/readiness visualization;
- replacement and partial-completion paths;
- derived parent cost/progress only.

Exit evidence:

- no parent Order, payment obligation, wallet, or pooled escrow;
- readiness unblocks only the named downstream action;
- sibling failure does not rewrite completed child truth;
- custom partner terms require exact confirmation.

### Slice F5 — Operations and recovery

Purpose: validate that discovered behavior can be supported before backend commitment.

Deliver:

- read-only multi-aggregate inspector;
- permission/visibility debugging;
- stale/idempotency event inspection;
- simulated notification failure and retry;
- dispute/hold views without history mutation;
- coverage report for matrix rows.

## 7. Use-case catalogue carried into implementation

| Use case | Minimum perspectives | Critical decision revealed |
| --- | --- | --- |
| Fixed-price product with pickup/delivery | guest, buyer, listing owner, selected courier | Listing action versus fulfillment-extension selection. |
| Service listing with quote request | guest, requester/buyer, provider | Direct booking versus structured quote formation. |
| Citizen electrical-work request | requester, eligible electrician, submitted bidder, unrelated provider | Request ownership, bid revision, sealed visibility, acceptance authority. |
| Product sourcing tender | requester, merchant bidder, public viewer | Product Request is demand, not a purchasable listing. |
| Unrelated viewer opens an Open Tender | guest/unrelated member, eligible responder, requester | Public-safe Request visibility is distinct from Bid visibility; current safe contract omits exact competitor Bid terms. |
| Unrelated viewer opens a Sealed Tender | guest/unrelated member, bidder, requester before/after close | Before reveal, Bid existence/signals and content are omitted according to policy; requester post-close comparison is a separate projection. |
| Agent drafts Owner listing | Owner, Agent, guest | Acting-for attribution and approval without impersonation. |
| Multi-node food plus courier proposal | requester, lead provider, courier partner | Independent source terms, invitation policy, child Orders, readiness dependency. |
| Accepted ordinary Quote | buyer, provider | Immutable Order terms and independent Work/Payment truth. |
| Expired/superseded Quote | requester, bidder | Stale re-review and no side effects. |
| Failed partner/custom-term confirmation | requester, lead bidder, partner | Incomplete proposal cannot be accepted. |
| Cash declaration mismatch | buyer, provider, operations | Independent attestations and no custody/refund promise. |

## 8. Known interface backlog and editing boundaries

These interfaces are required by the program but are not delivered by the F0 projection-kernel packet:

| Interface | Planning status | Required boundary |
| --- | --- | --- |
| Listing lifecycle manager/editor | Confirmed gap; existing management path is incomplete | Creates a new Listing draft/business version; active published meaning is never overwritten in place. |
| Request builder/editor | Program-defined, later F1/F2 packet | Owns Request draft, tender mode, visibility, Work specification, deadlines, and publication validation. |
| Quote/Bid composer and revision workspace | Program-defined, later F2 packet | Produces immutable Quote versions; material edits create successors rather than mutating submitted terms. |
| Work specification builder | Required but not yet a complete production interface | Used before agreement by Listing/Request/Quote authoring; selects an approved shape and validates `{shapeCode, shapeContractVersion, payloadSchemaVersion, payload}`. It is not a post-acceptance JSON editor. |
| Order workspace | Seed exists; complete role/state coverage remains later F3 work | Displays immutable terms and separate Work, Obligation, evidence, dispute, and hold state. |
| Shape-specific Work execution workspace | Required per Work Instance; later F3/T4 work | Updates execution through shape-owned commands/events. Accepted structure changes require an affected-party terms amendment, not direct editing. |
| Deal Chain builder/coordinator workspace | Planned later F4 capability | Edits Needs, dependencies, and invitations; it cannot edit child Order/Work truth or pool child money. |
| Agent Owner-scoped management workspace | Confirmed gap | Reuses the same Listing/Request/Work interfaces under explicit current grants and attribution; no parallel Agent editor. |
| Operations/recovery interfaces | Planned later F5 capability | Purpose-scoped inspection and explicit append-only recovery commands; no direct history editing. |

### 8.1 Work and Deal-Chain schema rule

Work belongs to an ordinary Order, not to a Request, Quote, or Deal Chain. Final agreement atomically creates the accepted Order, immutable terms, and its required one-or-more Work Instances. Every Work Instance has a common lifecycle plus a registered shape payload:

```ts
type WorkContract = {
    orderId: OrderId;
    shapeCode: 'A1' | 'A3' | 'A4' | 'A9';
    shapeContractVersion: string;
    payloadSchemaVersion: string;
    payload: ShapePayload;
    rowRevision: number;
};
```

The payload is flexible JSON at persistence boundaries but never untyped in application code: the shape/version registry chooses the validator, commands, transitions, and UI adapter. Unknown versions are read-only/unavailable rather than guessed.

A Deal Chain contains ordered Needs and explicit dependency edges. Sourcing a Need reuses Request/Quote or Invitation behavior. Agreement for a billable Need creates or links one ordinary child Order; that child owns its own terms, Work Instances, Obligations, evidence, disputes, holds, and history. Chain progress and cost are derived summaries. One Need has at most one active child Order, and sibling state never mutates another child's truth.

In the consumer cart (My Picks), staging multiple items into a Deal Chain follows the **Need Slot Staging Model**:

1. **Container Formation:** When related items (e.g. food bakery, beverages, and courier delivery) are chained, they merge into a single visual `DealChain` container within the cart.
2. **Incomplete Slot Rule:** If a chain container requires a dependency node that is not yet selected (e.g., courier delivery for off-site items), the chain is marked `incomplete`. The group **fails closed**: checkout is disabled for that container until the missing slot is filled or the chain is disbanded.
3. **Contextual Slot Routing:** Tapping `Find Provider to Fill Slot` routes the user to Browse with contextual metadata (`?chain_slot=<slot_type>`). On matching provider listings, the primary CTA dynamically adapts from `Book Service` to `Add to Chain Slot (+₱<rate>)`, instantly completing the slot and returning the user to the cart with a fully bookable container.
4. **Independent Agreements:** When the complete container is confirmed at checkout, `FinalizeOrderAgreement` creates an ordinary independent child Order per filled billable Need, preserving individual provider accountability.
5. **Canonical Topology Fingerprinting (`ChainArchetype`):** To prevent catalog bloat and database sprawl from infinite duplicate chain definitions, chain structures are normalized into an abstract DAG of Need Types and dependency edges. A deterministic hash (`fingerprint = SHA256(canonical_nodes_edges_json)` with `UNIQUE(fingerprint)`) maps all matching workflows (e.g. `[MATERIAL_SOURCING, TRANSIT_COURIER, FIELD_LABOR]`) to one shared canonical archetype record.
6. **Provider Decoupling & Proven Pairings (`ChainProvenPairing`):** Canonical archetypes contain zero provider IDs. Specific local combinations (e.g. Kuya Ben + Kuya Danny + Tagudin Hardware) are recorded as lightweight co-occurrence projections (`chain_proven_pairings`) scoped to barangays with community metrics (frequency count, completion rate, average price).
7. **Cascading Review & Dual-Level Reputation:** A single post-project review modal rates the entire coordinated chain run, eliminating review fatigue. By default, the rating cascades to each participating child Order with a `verified_chain_run` badge, while allowing optional per-node overrides for exceptions. Ratings simultaneously roll up to both the **Chain Archetype Catalog Metric** (e.g. `★ 4.9 · 84 Tagudin runs`) and each provider's personal listing score.
8. **Partial Failure Cascades & Child Isolation (`AD-17` & `AD-20`):** A parent Deal Chain cannot unilaterally seize, cancel, or auto-refund sibling child orders. If Node 3 (e.g. technician labor) cancels while Node 1 (sourced part) is fulfilled and Node 2 (courier) is dispatched, Node 3 transitions to `failed` / `replacement_needed`. The parent chain transitions to `partially_complete` / `blocked`. Sibling contracts remain legally isolated: Node 2 is compensated for its dispatched transit obligation under its own cancellation terms, while Node 1 is governed by its merchant return policy.
9. **DAG Concurrency & Cycle Prevention:** All dependency edge insertions require an exclusive row lock (`SELECT ... FOR UPDATE`) on the parent `deal_chains` row to prevent concurrent edge insertion races (`A ➔ B` and `B ➔ A` racing under `READ COMMITTED`). An in-memory topological sort (Kahn's algorithm or cycle-detecting DFS) must validate acyclicity before persisting.
10. **Slot Replacement & Partial Uniqueness:** To enable seamless slot replacement without breaking historical order auditability, the database enforces a partial unique index: `CREATE UNIQUE INDEX unique_active_child_order_per_need ON orders (deal_need_id) WHERE status NOT IN ('cancelled', 'refunded', 'disbanded');`. A full unique constraint on `deal_need_id` is strictly prohibited because it blocks replacement orders.
11. **Anti-Sybil & Review Dampening:** To prevent collusion networks from inflating archetype scores through micro-transactions (e.g. dummy ₱5 chains), reviews require verified physical fulfillment and settled payment obligations meeting a category-specific economic threshold. Catalog archetype scores use Bayesian prior dampening to prevent small clusters of repeated buyer-seller pairings from dominating community rankings.
12. **The n8n Workflow Model & External Dependency Gates:** The system decouples the macro coordination graph (Deal Chain Needs & edges) from micro Work execution (internal steps owned by a single Work Instance). Internal work steps are not graph nodes. Cross-boundary synchronization is mediated exclusively by `work_step_dependency_gates` table rows.
    * **Parallel Fork:** Independent child orders execute concurrently (e.g. technician on-site electrical triage runs in parallel with a motorcycle courier transit to a hardware merchant).
    * **Join / Dependency Gate:** An internal work step (e.g. `install_capacitor`) remains in status `WAITING_FOR_DEPENDENCY` until all active required predecessor conditions (`chain_node_completed`, `delivered_to_site`) emit verified evidence.
    * **Asynchronous Unblocking:** The producer transaction commits only its own child Order fact + outbox event. An asynchronous consumer validates the immutable graph version and marks the gate `unblocked`, authorizing the target step to begin without synchronous cross-order database deadlocks.
13. **Bypass & Disruption Governance:**
    * **Gate Bypass:** If an external dependency is rendered unnecessary on-site (e.g. homeowner supplies their own pre-bought capacitor), the gate requires an explicit `DealChainGateBypassed` event with compatibility verification evidence, rather than retroactively rewriting chain contracts or deleting accepted orders.
    * **Disruption Parking:** If a dependency is delayed (e.g. heavy rain delaying a courier), `DealChainNodeDisrupted` parks the dependent work step in a non-dispute waiting state with updated ETAs, preventing premature contract cancellations.

14. **Proposal Variance Recording & Listing Option Adoption (`AD-20`):** Bids submitted by providers are fundamentally rooted in an existing published Listing snapshot (`foundation_listing_id` + version hash). Customizations made during bidding (adjusted labor rates, added parts, custom work steps) are captured in an immutable `quote_variances` payload attached to the Quote. This variance data serves as a double-duty asset: the provider workspace tracks frequently quoted variances (e.g. quoted 3+ times) and surfaces an **"Adopt as Permanent Listing Preset"** prompt, allowing providers to evolve their public catalog directly from real market bidding without manual re-entry.
15. **Touch-First n8n Workflow Builder Primitives:** Both the Deal Chain Builder and the Work Pipeline Builder reject desktop-only node wiring (dragging Bezier curves) in favor of **Linear Block-Chain Cards with Step Gating Connectors**:
    * Users tap `[ + Add Task Node ]` or `[ + Add External Wait Gate ]` to insert pipeline milestones.
    * Dependency Gates configure external partner triggers (`courier_delivered`, `merchant_ready`, `buyer_approved`) via structured selectors.
    * Parallel forks are visually rendered as split side-by-side sub-cards converging at an explicit join gate.
    * Drag-and-drop reordering recalculates topological dependency validity in real-time.
### 8.2 Open-versus-sealed visibility decision

The current proposed tender contract uses **Open Tender** to mean open participation plus public-safe Request discovery—not an unrestricted public Bid board. An unrelated viewer does not receive exact Bid amount, scope, schedule, provider identity, or losing terms. **Sealed Tender** additionally hides Bid content and participation signals before the reveal point.

If the intended product behavior is that unrelated viewers can inspect live Bid terms on an Open Tender, that is a new founder/domain policy decision. It requires a distinct public Bid projection, disclosure consent, exact field matrix, withdrawal/history rules, search/cache/notification treatment, and anti-collusion/harassment review. The architecture records this as unresolved rather than silently treating “public” as “public bids.”

### 8.3 Static mobile session-mock backlog

Static mocks are visual discovery artifacts, not application prototypes. Each URL fixes one fictional actor, relationship, resource state, and decision. It may link to another static URL, but it has no role switcher, policy engine, shared mutable fixture, fake login, persistence, command dispatcher, or backend call. Shared tokens/icons/base CSS are allowed; repeating page markup is preferable to building a second framework. Architecture, OpenSpec, and projection rows win on conflict.

Existing visual coverage is limited to Browse/Listing detail/booking (`browse-mobile.html`), a combined bidding/negotiation study (`bidding-negotiation.html`), the design-system studio, and taste drafts for auth, onboarding, shell, Browse cards, Listing detail, and a basic My Listings/draft editor. These are references, not proof that the journeys below are designed.

Proposed files live under `docs/design-kit/sessions/`; each has a matching published URL only when deliberately copied to `public/design-sessions/`.

#### Wave A — Formation surfaces; design before connected Request/Bid frontend

| Session file | Fixed perspective/state | Visual question |
| --- | --- | --- |
| `listing-service-editor.html` | Provider editing a private Service Listing draft | Completed & Published. Scope, inclusions, rate/quote meaning, area, evidence, visual work pipeline foundation, and bidding variances. |
| `listing-product-editor.html` | Merchant editing a private Product Listing draft | Unit, quantity/capacity, price, pickup/handoff, substitutions. |
| `listing-preview-review.html` | Owner previewing a version before publish/review | Missing fields, public preview, lifecycle, Agent attribution, rejection recovery. |
| `request-service-builder.html` | Buyer drafting a Service Request | Scope, timing, area, budget meaning, safety/privacy, tender mode, Work specification. |
| `request-product-builder.html` | Buyer drafting a Product Request | Item/unit/quantity, sourcing alternatives, delivery/handoff, budget and deadline. |
| `request-open-public-view.html` | Unrelated viewer on discoverable Open Tender | Public-safe Request facts; no accidental public competitor terms. |
| `request-sealed-public-view.html` | Unrelated viewer on discoverable Sealed Tender before reveal | Coarse facts and sealed explanation without Bid signals. |
| `request-eligible-provider-view.html` | Eligible Provider deciding whether to respond | Full responder-safe scope, eligibility, deadline, existing-response state. |
| `quote-composer.html` | Provider preparing a versioned response | Completed & Published. Foundation listing picker, inherited work flow pipeline, in-context variance controls, all-in partner chaining, and direct note. |
| `quote-own-submitted.html` | Bidder viewing current submitted Quote | Current version, history, clarification, revise/withdraw/expiry meaning. |
| `responses-open-comparison.html` | Requester comparing current Open-Tender Quotes | Comparable terms without fake rank or cheapest-wins behavior. |
| `responses-sealed-before-close.html` | Requester before sealed reveal | Waiting/count policy, what is hidden, close/reveal explanation. |
| `responses-sealed-after-close.html` | Requester after sealed reveal | Exact eligible current versions, expiry, comparison, deliberate selection. |
| `quote-acceptance-review.html` | Requester re-reviewing selected exact Quote version | Accepted source/version, Work/Obligation meaning, stale/changed confirmation. |

#### Wave B — Order and Work surfaces; design before connected execution frontend

| Session file | Fixed perspective/state | Visual question |
| --- | --- | --- |
| `order-accepted-workspace.html` | Buyer on accepted ordinary Order | Immutable terms plus separate Work, Obligation, evidence, dispute/hold, and next actor. |
| `order-provider-workspace.html` | Provider on the same accepted Order | Shared truth with provider-specific next action and no buyer impersonation. |
| `order-change-cancel.html` | Party requesting terms change/cancellation | Impact across still-separate Work/Obligation/dispute/hold states and approvals. |
| `work-spec-a1-builder.html` | Author defining linear-project Work before agreement | Deliverables, steps, revision and completion criteria. |
| `work-spec-a3-builder.html` | Author defining appointment Work before agreement | Slot/duration/location, attendance, reschedule/no-show, safety. |
| `work-spec-a4-builder.html` | Author defining handoff Work before agreement | Items/quantity, preparation, pickup/handoff, receipt/mismatch. |
| `work-spec-a9-builder.html` | Author defining digital-delivery Work before agreement | Artifact/format, versions, access, revisions, acceptance, retention. |
| `work-a1-progress.html` | Provider/Buyer on active A1 Work Instance | Current step, evidence, revision, completion proposal; Payment stays separate. |
| `work-a3-appointment.html` | Buyer/Provider on confirmed or disrupted A3 | Slot conflict, attendance/no-show, reschedule and safety. |
| `work-a4-handoff.html` | Buyer/Provider on preparing/handoff/mismatch A4 | Quantity/custody facts, dual confirmation, mismatch recovery. |
| `work-a9-delivery.html` | Buyer/Provider reviewing A9 artifact version | Version history, access/scan state, revision versus acceptance. |
| `obligation-external-cash.html` | Buyer or Provider reporting one side of cash exchange | Independent declarations, mismatch, no Work completion implication. |
| `activity-needs-action.html` | One account with actionable and waiting items | Cross-aggregate next action, relationship, delivery failure, deep link. |

#### Wave C — Coordination and governed recovery; design before later vertical packets

| Session file | Fixed perspective/state | Visual question |
| --- | --- | --- |
| `agent-owner-workspace.html` | Agent working for one selected Owner | Persistent acting context, grants, approvals, listing/request/work tasks, exit. |
| `owner-agent-review.html` | Owner reviewing Agent draft/sensitive action | Exact diff, attribution, approve/decline/revoke and future effect. |
| `quick-deal-session.html` | Initiator/counterparty on dedicated Quick Deal | Exact proposal, counterparty confirmation, expiry; no incidental Listing-card shortcut. |
| `deal-chain-builder.html` | Coordinator arranging ordered Needs/dependencies | Completed & Published (flow-canvas-builder.html). Touch dot-grid canvas, parallel fork (Technician vs Courier), join point with Citizen Approval Gate, quick-add (+) ports, floating toolbelt, and Glovo wave inspector. |
| `deal-chain-lead-proposal.html` | Lead provider composing multi-Need proposal | Owned nodes, source versions, partner terms, confirmation completeness. |
| `deal-chain-partner-invite.html` | Invited partner seeing only one Need | Exact assigned terms, accept/counter/decline, hidden siblings. |
| `deal-chain-active.html` | Coordinator observing independent child Orders | Completed & Published. Macro coordination pipeline, n8n live dependency gate (waiting for courier arrival), live delay disruption, gate bypass for homeowner-supplied part, and isolated child order obligations. |
| `deal-chain-partial-failure.html` | Coordinator replacing one failed Need/child | Completed sibling truth preserved; replacement and recovery explicit. |
| `support-dispute-intake.html` | Buyer/Provider reporting a Work/receipt/payment mismatch | Correct aggregate, evidence/privacy, requested remedy, no promised outcome. |
| `operations-recovery.html` | Authorized Ops inspecting one correlated failure | Purpose, audit, stale state, retry/idempotency, scoped recovery without history edit. |

#### Static-mock completion rule

A session is visually explored when the phone-width page shows: actor/context label, exact resource/state, essential facts, one primary decision, important secondary/recovery actions, and one visible failure/blocked-state treatment. It does not need working submission, role switching, persistent data, or exhaustive alternate states. Any discovered policy or lifecycle gap is added to the matrix/OpenSpec before connected frontend implementation; it is not solved with mock JavaScript.

## 9. How UI discoveries become architecture decisions


Frontend-first work is useful only if discoveries are captured rather than buried in fixture logic.

For each discovered gap:

1. Record the exact screen, actor relationship, resource state, attempted action, and expected consequence.
2. Classify it:
   - visual/composition;
   - projection/visibility;
   - authorization policy;
   - domain lifecycle;
   - data/schema;
   - money/trust/safety;
   - operational recovery.
3. Visual-only findings may update the design system directly.
4. Projection findings update the matrix and the current OpenSpec slice.
5. Authorization/domain/schema/money findings become explicit proposed decisions and remain `policyPending` in fixtures.
6. Propagate approved decisions through the authority chain before the production adapter exposes them.
7. Keep the fixture behavior and production behavior distinguishable until backend evidence exists.

A UI prototype must never settle a money, liability, privacy, or authorization policy merely because one interaction looked convenient.

## 10. OpenSpec decomposition

The existing `harden-connected-frontend-experience` package is too broad to execute as one implementation change and contains stale assumptions such as a separate `frontend/src` root and an empty frontend test baseline. It remains a **program requirement inventory**.

Implementation should use these child changes:

1. `establish-frontend-view-projection-kernel`
2. `separate-listing-request-views`
3. `simulate-request-bidding-negotiation`
4. `simulate-agreement-work-obligation-consequences`
5. `simulate-partnered-deal-coordination`
6. `add-frontend-scenario-operations-recovery`

Each child change must:

- cite this spine and exact matrix rows;
- use current `resources/js` paths;
- preserve real auth and real existing backend slices;
- add no dependency without founder approval;
- state which adapter is authoritative for each scenario;
- include cross-perspective and forbidden-action scenarios;
- stop on unresolved production policy rather than encoding a fixture guess.

The first child package is created under `openspec/changes/establish-frontend-view-projection-kernel/`.

## 11. Acceptance of the architecture direction

This direction succeeds when:

- UI refinement can continue in React before backend completion;
- a founder can switch Scenario Lab perspective without changing product login semantics;
- a screen cannot receive an action inappropriate to its resource kind;
- sealed/private data is absent from unauthorized projections;
- local simulation rejects invalid/stale/unauthorized commands;
- production adapters can replace simulated data without redesigning screens;
- discovered domain gaps are visible and traceable;
- the static mobile prototype remains a clean visual reference rather than a growing application runtime;
- OpenSpec packets are small enough to implement and review vertically.
