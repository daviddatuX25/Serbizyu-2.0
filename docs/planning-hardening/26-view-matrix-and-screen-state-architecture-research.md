# Serbizyu 2.0 Architectural Specification & UI Projection Invariant Matrix

---

## Executive Architectural Review

* **Document Version:** 2.0.0-PROD-SPEC
* **Status:** Canonical Architecture Standard
* **Target Platforms:** Mobile Web (`browse-mobile.html`), Progressive Web Application (PWA), Native Shells (iOS/Android WebViews)
* **Domain:** Hyperlocal Multi-Sided Services & Dispatch Marketplace

---

# Part 1: Architectural Paradigms & Engineering Methodology

## 1. Industry Benchmark Analysis (Multi-Sided Marketplaces)

Top-tier multi-sided marketplaces handle role-based state segregation using strict patterns rather than ad-hoc UI conditionals:

```
                  ┌─────────────────────────────────────────┐
                  │          Global Domain Entity           │
                  │   (Citizen Request / Storefront SKU)    │
                  └────────────────────┬────────────────────┘
                                       │
                    Passed Through Access Boundary Engine
                         (RBAC / State Validation)
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│  Demand Projection    │                             │   Supply Projection   │
│       (Buyer)         │                             │       (Seller)        │
├───────────────────────┤                             ├───────────────────────┤
│ • Budget Target       │                             │ • Net Payout          │
│ • "Accept Offer" CTA  │                             │ • Sealed Competitors  │
│ • Cart Steppers       │                             │ • "Place Bid" CTA     │
└───────────────────────┘                             └───────────────────────┘
```

*   **Airbnb (Lona / Ghost Platform):** Segregates the "Guest" and "Host" applications into distinct UI dependency graphs. Shared primitives (e.g., calendar components) receive distinct, strictly validated ViewModels (`GuestCalendarConfig` vs. `HostInventoryMatrixConfig`). A state boundary layer strips pricing models, guest identity fields, and payout structures before hydration.
*   **Uber Freight:** Implements cross-role decoupling via **Role-Based Server-Driven UI (SDUI)**. A driver viewing a load receives an immutable layout projection containing net payout and deadhead miles; a carrier dispatcher sees gross margin and driver assignment selectors. The mobile runtime contains zero `if (role === 'carrier')` conditionals; it processes polymorphically typed component trees emitted by backend composition services.
*   **Upwork:** Implements strict **Dual-Bounded Contexts** (Client Context vs. Freelancer Context). A contract proposal entity uses sealed fields: freelancers cannot access client milestone escrow funds until release, and clients cannot see freelancer internal service fees. ViewModels are transformed through an explicit sanitization pipeline prior to DOM emission.
*   **TaskRabbit:** Enforces a state-machine-driven **Action Resolution Pipeline**. Action surfaces (e.g., "Confirm Booking," "Counter Terms") are not determined at the component template layer. Instead, an action engine resolves:
    $$\text{Action Set} = f(\text{Entity State}, \text{Actor Role}, \text{Policy Invariants})$$
    If a condition evaluates to false, the action node is omitted entirely from the schema sent to the client, preventing element leakage.

---

## 2. Engineering Disciplines & Structural Safeguards

Eliminating UI leakage across 5 roles and 6 core surfaces requires five foundational architecture layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Layer 5: Defensive Typed UI Components                   │
│     Render primitives reject unverified payloads at the DOM level      │
├────────────────────────────────────────────────────────────────────────┤
│             Layer 4: Statechart Action-Intent Evaluator                │
│    Transforms transitions: (CurrentState, ActorRole, Intent) ➔ Action   │
├────────────────────────────────────────────────────────────────────────┤
│            Layer 3: ViewModel Mappers & Structural Isolation           │
│     Transforms raw backend entities into role-blinded UI projections   │
├────────────────────────────────────────────────────────────────────────┤
│           Layer 2: Domain-Driven UI (DD-UI) Bounded Contexts           │
│       Demand Context (Request/Escrow) vs Supply Context (SKU/Bid)      │
├────────────────────────────────────────────────────────────────────────┤
│            Layer 1: Deterministic Finite State Machines (FSM)          │
│      Validates all state transitions across system entity lifecycles   │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Deterministic Finite State Machines (FSM)
Every interactive domain entity (Citizen Request, Turnkey Node, Courier Dispatch, Escrow Ledger) executes against a formalized Mealy/Moore State Machine:
$$M = (Q, \Sigma, \delta, q_0, F)$$
Where:
*   $Q$ is the finite set of mutually exclusive states.
*   $\Sigma$ is the set of explicit input actions.
*   $\delta: Q \times \Sigma \to Q$ is the state transition function.
*   $q_0$ is the initial state.
*   $F$ is the set of terminal states.

*Invariant:* No UI renderer may evaluate conditions outside of the active state $q \in Q$. If an entity is in state `IN_ESCROW`, bidding mechanisms are removed from the action set; they are not rendered disabled, hidden, or conditionally styled.

### Layer 2: Domain-Driven UI (DD-UI) Bounded Contexts
We enforce a separation between **Demand Contexts** (Citizen Requests, Work Packages, Service Consents) and **Supply Contexts** (Storefront Listings, Fixed-SKUs, Bid Tenders).
*   Demand models define **Budget Targets** and consume **Invoices**.
*   Supply models define **Rates / Unit Prices** and consume **Payouts**.
*   These contexts are isolated within distinct modules. Mixing fields (such as rendering a fixed-price "Quantity Stepper" inside an asynchronous "Citizen Request" work order) triggers structural layout exceptions at compilation or schema validation.

### Layer 3: Role-Filtered ViewModel Projections
Raw Domain Entities ($E$) are never passed directly to templates. Instead, every render target passes through a pure projection function parameterized by the validated session actor ($R$):
$$V = \Pi_R(E)$$
The projection layer $\Pi_R$ explicitly blinds and redacts unauthorized data. If an unauthenticated guest or competitor accesses a Citizen Request, the returned ViewModel strictly omits competitor proposal values, counter-bids, and direct contact metadata:

```typescript
// Structural invariant: Downstream components cannot render what does not exist
type CitizenRequestViewModel = {
  id: string;
  title: string;
  description: string;
  locationFuzzed: string; // Fuzzed geo-fence for public, exact address for matched provider
  economicContext: 
    | { type: 'RETAIL_PRICE'; amountCents: number; currency: 'PHP' }
    | { type: 'TARGET_BUDGET'; targetCents: number; currency: 'PHP' }
    | { type: 'QUOTED_PAYOUT'; payoutCents: number; currency: 'PHP' };
  actionMatrix: UIActionContract[];
};
```

### Layer 4: Statechart Action-Intent Evaluators
To prevent authorization logic leaks in template files, actions are computed upstream. A template receives an array of typed action descriptors:

```typescript
interface UIActionContract {
  id: string;
  token: 'PRIMARY_ACTION' | 'SECONDARY_ACTION' | 'TERTIARY_ACTION';
  label: string;
  intent: AppIntent;
  isEnabled: boolean;
  validationErrorCode?: string;
}
```

The template maps `token === 'PRIMARY_ACTION'` directly to the primary action container. The template engine does not evaluate whether the user is an owner, bidder, or guest; it renders the resolved contract.

### Layer 5: Defensive Typed UI Components
Leaf-node components enforce defensive type boundaries:
*   A `StorefrontBookingBar` component requires an instance of `StorefrontItemModel`. It will throw a runtime error if handed a `CitizenRequestModel`.
*   An `AcceptOfferCTA` component requires an asserted, authenticated `RequestOwnerToken`. If passed an empty or unverified token, it safely unmounts from the DOM.

---

## 3. The Failure of Ad-Hoc Template Conditionals

Ad-hoc template conditionals fail as state complexity increases:

```
Ad-Hoc Inlines (Anti-Pattern):
State Complexity ──> Exponentiated Permutations ──> Leaked CTAs & Data Breaches

State-Driven Projections (Architecture Standard):
State Matrix (FSM) ──> Unified Projection Engine ──> Deterministic UI Render
```

### Mathematical Explosion of Invalid States
Given:
*   $S$ screens ($n = 6$)
*   $R$ stakeholder roles ($n = 5$)
*   $L$ lifecycle states ($n \ge 8$ per entity)
*   $A$ dynamic UI actions ($n \ge 6$)

Ad-hoc conditional implementations attempt to handle this state space inline:
```javascript
// ANTI-PATTERN: Brittle, unmaintainable, leaks state
if (role === 'CITIZEN' && (state === 'OPEN' || state === 'NEGOTIATING') && !item.hasAcceptedBid) {
  if (user.id === item.authorId) {
    return `<button class="accept-btn">Accept Offer</button>`;
  } else if (item.bids.some(b => b.userId === user.id)) {
    return `<button class="counter-btn">Adjust Terms</button>`;
  }
}
```
*   **Combinatorial Risk:** Inline conditionals must evaluate up to $S \times R \times L \times A = 1,440$ execution paths. Missing a single clause (such as `user.id === item.authorId`) instantly leaks authoritative controls to unauthorized actors.
*   **View-State Contamination:** If a user switches roles mid-session (e.g., from Citizen Requester to Turnkey Bidder), cached volatile variables cause UI components to flash or expose mismatched states (e.g., a "Book Service" button appearing inside a live bidding negotiation drawer).
*   **Information Disclosure:** Blindly passing a unified entity to an HTML template leaves private metadata (such as sealed bids, internal margins, and escrow status) exposed in client memory, even when hidden via CSS (`display: none`).
*   **Architectural Standard:** The ad-hoc approach is replaced with **Role-Filtered View Projection Pipelines** and **Type-Constrained Polymorphic Component Templates**.

---

# Part 2: The Canonical View, Role & State Reality Matrix

## Stakeholder Role Definitions

*   **R1: Citizen Requester / Owner (Aling Nena)** — Initiator of demand. Owns the request entity, funds the escrow balance, issues adjustments, and provides completion sign-offs.
*   **R2: Storefront Merchant / Seller (Ate Gina)** — Provider of fixed-price catalog services, packaged materials, and direct appointments.
*   **R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)** — Service professional responding to open market requests, building multi-item labor/materials proposals, and assigning tasks to downstream couriers.
*   **R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)** — Logistics provider responsible for pickup, transit, and delivery tasks linked to complex multi-provider turnkey workflows.
*   **R5: Public Citizen / Guest / Unbid Tradesperson** — Unauthenticated user, or authenticated professional who has not placed a bid on the active entity.

---

## View Surface Matrix: Full Structural Intersections

### Screen S1: Browse / Marketplace Feed (Grid, Split & Category Views)

```
┌─────────────────────────────────────────────────────────────┐
│ [ Search Marketplace...                        ] [ Filter ] │
├─────────────────────────────────────────────────────────────┤
│ Demand Intent (Citizen Request)                             │
│ "Rewire Outlets & Breaker Box"                              │
│ Budget: ₱4,500 Target • 4 Bids Active                       │
│ [ Review & Submit Bid ]                                     │
├─────────────────────────────────────────────────────────────┤
│ Supply Catalog (Storefront Listing)                         │
│ "Standard A/C Cleaning Package (Window Type)"               │
│ Price: ₱850.00 Retail Fixed                                 │
│ [ Book Service ]                                            │
└─────────────────────────────────────────────────────────────┘
```

#### State 1.1: Live Global Catalog (Mixed Demand Requests & Storefront Supply Listings)

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   **Visible Data Elements:**
    *   *Storefront Items:* SKU Title, Merchant Profile Badge, Base Retail Price ("₱X.XX Retail"), Merchant Rating, Geo-Distance.
    *   *Self-Created Requests:* Request Title, Target Budget ("₱X.XX My Target"), Active Proposal Counter ("N Active Proposals"), Current Status Indicator ("Draft", "Accepting Proposals", "In Escrow").
    *   *External Citizen Requests:* Request Title, General Vicinity Tag (fuzzed), Target Budget Range, Creation Timestamp.
*   **Forbidden / Blinded Elements:** Merchant wholesale inventory margins, competitor pricing calculation variables, internal operational statuses.
*   **Primary Sticky Action CTA:**
    *   *On Storefront Cards:* `[ Book Service ]` (Solid Blue, `intent: NAVIGATE_STOREFRONT_CHECKOUT`).
    *   *On Self Requests:* `[ View Proposals (N) ]` (Solid Indigo, `intent: NAVIGATE_ACTIVE_REQUEST_DETAILS`).
    *   *On Global Header:* `[ + Post New Task ]` (Floating Accent Amber, `intent: OPEN_REQUEST_CREATION_MODAL`).
*   **Secondary Actions:** Filter by Service Category, Sort by Distance, Save to Bookmarks.
*   **State Transitions & Invariants:**
    *   Selecting `[ + Post New Task ]` transitions workspace to `REQUEST_DRAFTING` (Entity ID: null $\to$ temp-UUID).
    *   Selecting a Storefront triggers supply item resolution, opening **S2** (`STOREFRONT_DETAIL`).

##### Role R2: Storefront Merchant / Seller (Ate Gina)
*   **Visible Data Elements:**
    *   *Owned Storefront Items:* SKU Title, Active Base Price, Real-time Sales / Booking Counter ("12 Bookings this week"), "My Listing" Badge.
    *   *Third-Party Listings:* Standard Public Retail Cards.
    *   *Citizen Requests:* Filterable Work Opportunities within certified trade category.
*   **Forbidden / Blinded Elements:** Add-to-cart operations on own storefront items; unreleased Citizen Request consumer addresses.
*   **Primary Sticky Action CTA:**
    *   *On Owned Listings:* `[ Edit Catalog Item ]` (Outline Blue, `intent: OPEN_MERCHANT_SKU_EDITOR`).
    *   *On Sourced Requests (matching category):* `[ Quote Package ]` (Solid Green, `intent: OPEN_COUNTER_PROPOSAL_DRAWER`).
*   **Secondary Actions:** Toggle Active Inventory Availability (Available/Busy Switch), Filter Matched Requests by Proximity.
*   **State Transitions & Invariants:**
    *   *Invariant:* Storefront owners cannot book their own SKUs. Cart mechanisms must yield an edit state:
        $$\forall \, item \in Catalog: \text{item.merchantId} = \text{actor.id} \implies CTA = \text{EDIT\_LISTING} \neq \text{BOOK\_NOW}$$

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   **Visible Data Elements:**
    *   *Citizen Requests:* Title, Trade Requirements, Target Budget ("₱X.XX Target Budget"), Bid Velocity Counter ("3 bids submitted"), Distance Matrix ("Within 4.2 km").
    *   *Storefront Supplies:* Material/Hardware Listings with Merchant Availability (e.g., Ate Gina’s Electrical Conduits).
*   **Forbidden / Blinded Elements:** Actual bid values of competitor providers (blinded marketplace configuration); Customer’s exact phone number or private street address.
*   **Primary Sticky Action CTA:**
    *   *On Unbid Requests:* `[ Prepare Proposal ]` (Solid Indigo, `intent: OPEN_PROPOSAL_BUILDER`).
    *   *On Active Submitted Proposals:* `[ Track Submitted Bid ]` (Outline Indigo, `intent: NAVIGATE_CHAT_NEGOTIATION`).
*   **Secondary Actions:** Save to Watchlist, Share Lead to Subcontractor Network, Route Materials Query to Merchant.
*   **State Transitions & Invariants:**
    *   Selecting `[ Prepare Proposal ]` initiates Bid Context initialization ($q_0: \text{DRAFTING\_BID}$).

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   **Visible Data Elements:**
    *   *Citizen Requests:* Supply-chain/Delivery Sub-Nodes ("Materials Transit Required"), Route Polygon (Origin: Merchant Hardware $\to$ Destination: Job Site), Payout Tag ("₱XXX Estimated Delivery Share").
    *   *Storefront Listings:* Ineligible for direct booking; visible as delivery item source points.
*   **Forbidden / Blinded Elements:** Master turnkey labor margins, home rewiring electrical diagrams, structural blueprints.
*   **Primary Sticky Action CTA:**
    *   *On Requests needing logistics:* `[ Claim Delivery Leg ]` (Solid Emerald, `intent: OPEN_COURIER_BID_DRAWER`).
    *   *On Independent Direct Bookings:* `[ View Delivery Details ]`.
*   **Secondary Actions:** Calculate Route Fuel/Time Matrix, Check Merchant Loading Dock Status.
*   **State Transitions & Invariants:**
    *   Courier can only claim the logistics node; core turnkey labor remains locked to qualified primary trades.

##### Role R5: Public Citizen / Guest / Unbid Tradesperson
*   **Visible Data Elements:** Public Catalog Metadata, Anonymized Citizen Job Summaries, Public Reviews, Base Tier Pricing.
*   **Forbidden / Blinded Elements:** Bid submission controls, internal chat triggers, exact user locations, real-time dispatch telemetry.
*   **Primary Sticky Action CTA:** `[ Sign In / Register to Bid ]` (Solid High-Contrast Neutral, `intent: OPEN_AUTH_FLOW`).
*   **Secondary Actions:** Category exploration, Localization filter (Barangay/City toggle).
*   **State Transitions & Invariants:**
    *   All interactions targeting operational states redirect to the authentication gateway with an intentional `returnUrl` deep link.

---

### Screen S2: Storefront Listing Detail Page (Supply View)

```
┌─────────────────────────────────────────────────────────────┐
│ [ Back ]             Storefront Service            [ Share ]│
├─────────────────────────────────────────────────────────────┤
│ Ate Gina's Professional Plumbing & Supplies                 │
│ ★ 4.9 (128 reviews) • DTI Certified                         │
│                                                             │
│ Standard Pressure Line Repair Package                       │
│ ₱1,200.00 Fixed Retail Price                                │
│ Includes: 2h Onsite Labor + PEX Pipe Replacements           │
│                                                             │
│ Availability: Today, 2:00 PM - 6:00 PM                      │
├─────────────────────────────────────────────────────────────┤
│ [ Book Service Now - ₱1,200.00                            ] │
└─────────────────────────────────────────────────────────────┘
```

#### State 2.1: Active Available Storefront SKU

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   **Visible Data Elements:** Verified Merchant Identity, Complete Package Description, Material Inclusions, Fixed Retail Price ("₱1,200.00"), Merchant Cancellation Policy, Calendar Availability Slots.
*   **Forbidden / Blinded Elements:** Merchant payout commission rate (Serbizyu 2.0 platform rake), Supplier inventory source pricing.
*   **Primary Sticky Action CTA:** `[ Book Service Now - ₱X.XX ]` (Solid Blue, `intent: INITIATE_STOREFRONT_CHECKOUT`).
*   **Secondary Actions:** `[ Message Merchant ]` (Chat intent), `[ Request Custom Scope Counter ]` (Opens drawer S5).
*   **State Transitions & Invariants:**
    *   Clicking `[ Book Service Now ]` transitions item into checkout pipeline ($q: \text{AWAITING\_ESCROW\_PAYMENT}$), locking the selected merchant availability slot.

##### Role R2: Storefront Merchant / Seller (Ate Gina - Owner of Listing)
*   **Visible Data Elements:** Public Item View, Active Orders Count, Raw Payout per unit after platform rake ("Net: ₱X.XX"), SKU Status ("Active / Paused").
*   **Forbidden / Blinded Elements:** Add to Cart, Instant Booking CTA, Self-Review interface.
*   **Primary Sticky Action CTA:** `[ Edit SKU Details & Pricing ]` (Outline Slate, `intent: OPEN_SKU_ADMIN_DRAWER`).
*   **Secondary Actions:** `[ Pause Listing / Mark Unavailable ]`, `[ View Linked Booking Schedule ]`.
*   **State Transitions & Invariants:**
    *   *Defensive Block:* The checkout controller returns a hard 403 error if `buyerId === merchantId`.

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   **Visible Data Elements:** Item SKU details, Component Material Specification, Bulk/Trade Pricing (if established by merchant), Retail Rate.
*   **Forbidden / Blinded Elements:** Merchant administrative configurations.
*   **Primary Sticky Action CTA:** `[ Link Materials to Proposal ]` (Solid Emerald, `intent: ATTACH_SKU_TO_ACTIVE_BID`).
*   **Secondary Actions:** `[ Ask Merchant Bulk Availability ]`.
*   **State Transitions & Invariants:**
    *   Attaching SKU creates a linked reference node inside active Proposal Workspace (**S4**).

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   **Visible Data Elements:** Physical specifications (Weight, Dimensions, Fragility Index), Pickup Location Geo-coordinates, Loading Dock Operating Hours.
*   **Forbidden / Blinded Elements:** Master Service margins, Installation warranties.
*   **Primary Sticky Action CTA:** `[ Register as Delivery Partner for SKU ]` (Outline Blue, `intent: REGISTER_LOGISTICS_INTEREST`).
*   **Secondary Actions:** Route evaluation, Geo-fence checks.

##### Role R5: Public Citizen / Guest
*   **Visible Data Elements:** High-level details, Retail Price, Base Merchant info.
*   **Forbidden / Blinded Elements:** Booking triggers, direct messaging interfaces.
*   **Primary Sticky Action CTA:** `[ Sign In to Book ]` (Solid Blue, `intent: TRIGGER_AUTH`).
*   **Secondary Actions:** Share SKU link.

---

### Screen S3: Citizen Request Detail Page (Demand View)

```
┌─────────────────────────────────────────────────────────────┐
│ [ Back ]              Citizen Request              [ Alert ]│
├─────────────────────────────────────────────────────────────┤
│ Residential Rewiring & Electrical Upgrade                   │
│ Posted by: Aling Nena • Brgy. San Antonio                   │
│ Target Budget: ₱4,500.00 (Escrow Pending)                   │
│ Status: ACCEPTING PROPOSALS                                 │
│                                                             │
│ Proposals Received: 3 Turnkey Bids                          │
│ [ Sealed Bid Environment: Rates Hidden to Competitors     ] │
├─────────────────────────────────────────────────────────────┤
│ [ Submit Proposal / Quote                                 ] │
└─────────────────────────────────────────────────────────────┘
```

#### State 3.1: Open for Bidding / Proposals (State: `STATE_ACCEPTING_PROPOSALS`)

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   **Visible Data Elements:** Self-Published Work Scope, Target Budget, Verified Status Badges, Full Table of Incoming Proposals/Bids with itemized labor/materials breakdowns, Provider identities, ratings, and historical performance cards.
*   **Forbidden / Blinded Elements:** "Submit Proposal" CTA, Cart Steppers, Provider-side profit margin analyses.
*   **Primary Sticky Action CTA:**
    *   *If Bids Exist:* `[ Review Proposals (N) ]` (Solid Indigo, `intent: EXPAND_PROPOSAL_ACCORDION`).
    *   *If No Bids:* `[ Boost Request Visibility ]` (Solid Amber, `intent: LAUNCH_BOOST_PAYMENT`).
*   **Secondary Actions:** `[ Edit Request Parameters ]`, `[ Cancel Request ]` (Transitions state to `CANCELLED`).
*   **State Transitions & Invariants:**
    *   Selecting an incoming proposal expands node evaluation, making available the `ACCEPT_OFFER` intent.

##### Role R2: Storefront Merchant / Seller (Ate Gina)
*   **Visible Data Elements:** Job Description, Materials bill-of-quantities wishlist (if declared by Aling Nena), Distance, Requester Verification Tier.
*   **Forbidden / Blinded Elements:** Unrelated competitor bids, personal identification parameters of the homeowner.
*   **Primary Sticky Action CTA:** `[ Supply Materials for this Job ]` (Solid Slate, `intent: INITIATE_SUPPLY_CHAIN_PROPOSAL`).
*   **Secondary Actions:** Direct inquiry regarding item specifications.

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   **Visible Data Elements:** Technical Scoping Documents, Visual Attachments, Target Budget, Total Bids Submitted (Count only), Current Actor's Own Bid Status (if previously submitted).
*   **Forbidden / Blinded Elements:**
    *   *CRITICAL STRUCTURAL BLINDING:* Competitor bid values, breakdown line items, subcontractor margins from rival providers.
    *   *CRITICAL LEAKAGE GUARD:* "Book Service Now" or "Add to Picks" buttons are strictly non-existent on Demand views.
*   **Primary Sticky Action CTA:**
    *   *If No Bid Placed:* `[ Submit Proposal / Bid ]` (Solid Blue, `intent: LAUNCH_TURNKEY_PROPOSAL_BUILDER`).
    *   *If Bid Placed (State: BID_SUBMITTED):* `[ View / Adjust My Submitted Bid ]` (Outline Indigo, `intent: OPEN_PROPOSAL_WORKSPACE`).
*   **Secondary Actions:** Ask Public Technical Question (Clarification Board), Share Opportunity.
*   **State Transitions & Invariants:**
    *   Clicking `[ Submit Proposal / Bid ]` opens Screen **S5** in Turnkey Provisioning Mode.

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   **Visible Data Elements:** Logistics route profile (General Area $\to$ Site), Estimated payload volume (e.g., "Heavy: 4x Conduit Bundles").
*   **Forbidden / Blinded Elements:** Homeowner’s private contact details, Lead trade pricing.
*   **Primary Sticky Action CTA:** `[ Offer Materials Hauling ]` (Solid Emerald, `intent: OPEN_LOGISTICS_PROPOSAL_DRAWER`).
*   **Secondary Actions:** Flag transit hazard, Calculate route tolls.

##### Role R5: Public Citizen / Guest
*   **Visible Data Elements:** Request Title, General Vicinity, Target Budget Range, Proposal Count.
*   **Forbidden / Blinded Elements:** All detailed work scopes, contact data, all bid documents.
*   **Primary Sticky Action CTA:** `[ Log In to Submit Proposal ]` (Solid High-Contrast Neutral, `intent: OPEN_AUTH_MODAL`).
*   **Secondary Actions:** Share publicly.

---

### Screen S4: In-Chat Negotiation & Proposal Workspace

```
┌─────────────────────────────────────────────────────────────┐
│ [ Back ]       Negotiation: Kuya Ben Electrical    [ Details]│
├─────────────────────────────────────────────────────────────┤
│ Aling Nena: "Please include the heavy-duty breaker box."    │
│ Kuya Ben: "Understood. Updating the proposal node now."     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PROPOSAL #PROP-9021-REV2                     UPDATED    │ │
│ │ Labor: Rewire Outlets & Main Panel         ₱3,200.00    │ │
│ │ Materials (Ate Gina Plbg & Supplies)         ₱1,800.00    │ │
│ │ Logistics (Kuya Danny Express Delivery)        ₱350.00    │ │
│ │ TOTAL ESCROW REQUIREMENT:                  ₱5,350.00    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [ ACCEPT OFFER & FUND ESCROW (₱5,350.00)                 ] │
└─────────────────────────────────────────────────────────────┘
```

#### State 4.1: Proposal Pending Citizen Action (State: `PROPOSAL_PENDING_CLIENT_SIGN_OFF`)

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   **Visible Data Elements:** Full Itemized Proposal Card, Milestone schedule, Provider certifications, Real-time message ledger, Platform Escrow Protection Seal, Explicit Total Payable ("₱5,350.00 Total").
*   **Forbidden / Blinded Elements:** Kuya Ben’s platform fee breakdown, Merchant backend trade discounts, Courier contractor-split ratios.
*   **Primary Sticky Action CTA:** `[ ACCEPT OFFER & FUND ESCROW (₱5,350.00) ]` (Solid Emerald, `intent: LAUNCH_PAYMENT_GATEWAY`).
*   **Secondary Actions:** `[ Request Modification / Counter ]` (Solid Slate, opens Drawer **S5**), `[ Decline Proposal ]` (Destructive Outline Red), `[ Send Message ]`.
*   **State Transitions & Invariants:**
    *   *CRITICAL INVARIANT SAFEGUARD:* `[ ACCEPT OFFER ]` requires cryptographic confirmation that `session.userId === request.ownerId`.
    *   Upon tap: State shifts atomically to `ESCROW_PROCESSING`. CTA enters disabled spinner state. Chat broadcasts systemic transaction log.

##### Role R2: Storefront Merchant / Seller (Ate Gina)
*   **Visible Data Elements:** Dedicated Materials Node inside the proposal ("Line Item: ₱1,800 Materials"), Delivery Address (Merchant Loading Point), Pickup Confirmation Token.
*   **Forbidden / Blinded Elements:** Core Electrical Labor Scope Pricing, Customer-Electrician direct contractual covenants.
*   **Primary Sticky Action CTA:** `[ Confirm Item Availability / Lock Inventory ]` (Solid Blue, `intent: COMMIT_SUPPLIES`).
*   **Secondary Actions:** `[ Message Lead Provider Kuya Ben ]`.
*   **State Transitions & Invariants:**
    *   Locking inventory creates a holding reservation in merchant catalog system ($q: \text{SKU\_RESERVED}$).

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   **Visible Data Elements:** Unified Work Plan, Node Status (Subcontractor status: Confirmed/Unconfirmed), Client Verification Status, Payout Net Breakdown ("Gross: ₱5,350 $\to$ Net Labor Payout: ₱3,200").
*   **Forbidden / Blinded Elements:**
    *   *CRITICAL INVARIANT SAFEGUARD:* Kuya Ben must **NEVER** see an `[ Accept Offer ]` CTA. Accepting an offer as the bidder is an invalid state that corrupts escrow mechanics.
*   **Primary Sticky Action CTA:** `[ Adjust Proposal Terms / Re-Quote ]` (Solid Indigo, `intent: OPEN_NODE_ADJUSTER_S5`).
*   **Secondary Actions:** `[ Ping Courier for Confirmation ]`, `[ Cancel Submitted Proposal ]`, `[ Chat Input ]`.
*   **State Transitions & Invariants:**
    *   Triggering an adjustment moves the proposal state to `PROPOSAL_DRAFT_MUTATING`, which invalidates any pending client sign-off signatures until re-published.

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   **Visible Data Elements:** Logistics Node Parameters: Pickup Location (Ate Gina's Hardware), Drop-off Location (Citizen Worksite), Allocated Freight Compensation ("₱350.00 Hauling Fee").
*   **Forbidden / Blinded Elements:** Unrelated Electrical Task Execution Steps, Customer-Electrician Total Contract Price.
*   **Primary Sticky Action CTA:** `[ Accept Delivery Commitment ]` (Solid Emerald, `intent: BIND_LOGISTICS_NODE`).
*   **Secondary Actions:** Request Loading Access Modification.
*   **State Transitions & Invariants:**
    *   Couriers can only bind or release the logistics segment. Confirming transitions the courier node to `COURIER_NODE_LOCKED`.

##### Role R5: Public Citizen / Guest
*   **Forbidden / Blinded Elements:** Zero Visibility. Screen **S4** is access-controlled ($401 / 403 \implies \text{Redirect to Home Feed}$).

---

### Screen S5: Glovo-Wave Counter & Node Adjuster Drawer

```
┌─────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════ │
│ [ Pull Bar Down to Dismiss ]                                │
├─────────────────────────────────────────────────────────────┤
│ PROPOSAL ARCHITECT & TERM ADJUSTER                          │
│ Request: Residential Rewiring & Electrical Upgrade          │
├─────────────────────────────────────────────────────────────┤
│ Wave Node 1: Primary Labor (Kuya Ben Electrical)            │
│ [ ₱3,200.00 ] [ - ] [ + ]                                   │
│ Scope: Panel Replacements + Outlet Certifications           │
├─────────────────────────────────────────────────────────────┤
│ Wave Node 2: Sourced Hardware (Ate Gina Supplies)           │
│ [ ₱1,800.00 ] [ Linked SKU: Breaker Panel Kit 60A ]         │
├─────────────────────────────────────────────────────────────┤
│ Wave Node 3: Express Transit (Kuya Danny Express)           │
│ [ ₱350.00   ] [ Dispatch Route Locked ]                     │
├─────────────────────────────────────────────────────────────┤
│ TOTAL PROPOSED TRANSACTION: ₱5,350.00                       │
│ [ PUBLISH REVISED PROPOSAL                                ] │
└─────────────────────────────────────────────────────────────┘
```

#### State 5.1: Active Interactive Node Adjustment

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   *Usage Context:* Accessible when counter-proposing structural parameters to Kuya Ben.
*   **Visible Data Elements:** Total Out-of-Pocket Budget Adjuster, Itemized Node Value Limits, Target Delivery Time Slider.
*   **Forbidden / Blinded Elements:** Subcontractor wholesale rates, Provider operational overhead allowances.
*   **Primary Sticky Action CTA:** `[ Transmit Counter-Offer ]` (Solid Indigo, `intent: DISPATCH_BUYER_COUNTER_OFFER`).
*   **Secondary Actions:** `[ Reset to Original Terms ]`, `[ Abandon Counter ]`.
*   **State Transitions & Invariants:**
    *   Emits transaction `CLIENT_COUNTER_PROPOSAL_EMITTED`. Suspends existing proposal state; provider must accept or counter the new terms.

##### Role R2: Storefront Merchant / Seller (Ate Gina)
*   *Usage Context:* Material availability changes or unit price variances.
*   **Visible Data Elements:** Materials Node Item Cost, Quantity Selector, Fulfillment Readiness Window.
*   **Forbidden / Blinded Elements:** Turnkey Electrical Labor and Logistics markup variables.
*   **Primary Sticky Action CTA:** `[ Update Inventory Terms ]` (Solid Blue, `intent: UPDATE_MATERIALS_NODE_IN_PROPOSAL`).
*   **Secondary Actions:** Swap out-of-stock SKU with validated alternative.
*   **State Transitions & Invariants:**
    *   Item replacement forces real-time recalculation of total escrow amounts on all linked views (**S3, S4, S6**).

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   *Usage Context:* Primary proposal configuration, line-item adjustments, subcontractor integration.
*   **Visible Data Elements:** Complete Component Tree: Direct Labor Node (Free input or standard day-rate multiplier), Merchant SKU Linker Node, Courier Logistics Selection Node, Aggregated Total Customer Price vs Net Payout.
*   **Forbidden / Blinded Elements:** Blinding rules do not apply to the Lead Provider's own internal proposal build, except for the customer's personal financial accounts.
*   **Primary Sticky Action CTA:** `[ Publish Revised Proposal ]` (Solid Emerald, `intent: SUBMIT_PROPOSAL_REVISION`).
*   **Secondary Actions:** Add New Material Line Item, Detach Logistics Segment, Revert to Prior Version.
*   **State Transitions & Invariants:**
    *   *Dynamic Wave Invariant:* Modifying the labor cost dynamically recalculates platform processing rakes and updates the proposal total in the chat view:
        $$\text{TotalProposalCents} = \sum \text{NodeCosts} + \text{Taxes} + \text{Logistics}$$
    *   Publishing moves proposal state to `PROPOSAL_PENDING_CLIENT_SIGN_OFF`.

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   *Usage Context:* Adjusting logistics constraints (e.g., oversized delivery surcharge).
*   **Visible Data Elements:** Logistics Pricing Stepper ("₱350.00 Base Hauling Fee"), Route Options (Standard vs Urgent Transit).
*   **Forbidden / Blinded Elements:** Labor margins, Core installation contracts.
*   **Primary Sticky Action CTA:** `[ Submit Logistics Adjustment ]` (Solid Emerald, `intent: SUBMIT_DELIVERY_SURCHARGE`).
*   **Secondary Actions:** Reject Route Assignment.

##### Role R5: Public Citizen / Guest
*   **Forbidden / Blinded Elements:** Zero Visibility. System refuses component mounting.

---

### Screen S6: Your Bookings / Orders & Dispatch Checklist Page

```
┌─────────────────────────────────────────────────────────────┐
│ Active Engagement: ORD-5541-ESCROW                          │
│ Turnkey Lead: Kuya Ben Electrical (Verified Pro)            │
│ Escrow Protection: ₱5,350.00 LOCKED IN ESCROW               │
├─────────────────────────────────────────────────────────────┤
│ MULTI-PARTY WORKFLOW STATUS TRACKER                         │
│ [✓] 1. Escrow Funded by Aling Nena                          │
│ [✓] 2. Materials Picked Up by Kuya Danny (Tagudin Express)  │
│ [▶] 3. Electrical Rewiring & Installation (IN PROGRESS)     │
│ [ ] 4. Citizen Sign-Off & Escrow Release                    │
├─────────────────────────────────────────────────────────────┤
│ [ CONFIRM COMPLETION & RELEASE ESCROW                     ] │
└─────────────────────────────────────────────────────────────┘
```

#### State 6.1: Service Execution In-Progress (State: `STATE_IN_EXECUTION_ESCROW_LOCKED`)

##### Role R1: Citizen Requester / Owner (Aling Nena)
*   **Visible Data Elements:** Locked Escrow Balance Assurance, Multi-party Checklist Tracker (Real-time sync), Identity cards of all authorized onsite actors (Kuya Ben, Kuya Danny), GPS Location Map of active delivery, Proof of Work Photo Feed.
*   **Forbidden / Blinded Elements:** Provider Internal Checklists, platform margin settlement splits.
*   **Primary Sticky Action CTA:**
    *   *While work is in progress:* `[ Confirm Completion & Release Escrow ]` (Disabled/Muted Slate until Provider marks complete, or Active Emerald when completion claimed).
    *   *In Emergency:* `[ Dispute / Escalate to Support ]` (Destructive Outline Red, `intent: TRIGGER_DISPUTE_FLOW`).
*   **Secondary Actions:** Message All Contractors, Call Direct Phone, Upload Verification Photo.
*   **State Transitions & Invariants:**
    *   Selecting `[ Confirm Completion & Release Escrow ]` requires confirmation via a PIN or biometric challenge.
    *   *Invariant:* Escrow release transitions system to `STATE_SETTLED_COMPLETED`. Funds are transferred to provider ledger wallets; this action cannot be undone.

##### Role R2: Storefront Merchant / Seller (Ate Gina)
*   **Visible Data Elements:** Dedicated Delivery Sign-off Node: "Awaiting Logistics Pickup," OTP (One-Time-Pin) Handshake Interface for Courier Danny, Escrow Security Status for SKU Items.
*   **Forbidden / Blinded Elements:** Direct access to citizen escrow release mechanisms.
*   **Primary Sticky Action CTA:** `[ Confirm Cargo Handover (Enter Courier OTP) ]` (Solid Blue, `intent: CONFIRM_MERCHANT_HANDOFF`).
*   **Secondary Actions:** Report Logistics Delay, Download Merchant Tax Invoice.
*   **State Transitions & Invariants:**
    *   Validating OTP transitions materials node to `MATERIALS_IN_TRANSIT`.

##### Role R3: Lead Provider / Turnkey Bidder (Kuya Ben Electrical)
*   **Visible Data Elements:** Job Execution Milestone List, Courier Delivery ETA Tracking, Materials Arrival Confirmation, "Mark Task Complete" checklist triggers, Gross vs Net Earned Payout Tracker.
*   **Forbidden / Blinded Elements:** Citizen's Escrow Release Button (Kuya Ben cannot release escrow funds to himself).
*   **Primary Sticky Action CTA:**
    *   *While executing:* `[ Mark Electrical Work Complete ]` (Solid Blue, `intent: SUBMIT_WORK_COMPLETION_PROOF`).
    *   *After completion submitted:* `[ Awaiting Citizen Sign-Off ]` (Disabled Pulsing Green).
*   **Secondary Actions:** Upload Photo Evidence of Completed Breaker Panel, Add Change Order Request, Alert Courier for Tools Recovery.
*   **State Transitions & Invariants:**
    *   Executing `[ Mark Work Complete ]` shifts state to `AWAITING_CLIENT_VERIFICATION`. Sends push notification and unlocks the Citizen's sign-off CTA.

##### Role R4: Partner Provider / Courier Accomplice (Kuya Danny Tagudin Express)
*   **Visible Data Elements:** Dispatch Telemetry, Merchant Pickup Address, Destination Geo-Fence, Recipient OTP Confirmation Field, Package Safety Checklists.
*   **Forbidden / Blinded Elements:** Core Labor Escrow Status, Technical electrical wiring specifications.
*   **Primary Sticky Action CTA:**
    *   *Phase A (At Merchant):* `[ Scan Merchant Package / Confirm Pickup ]` (Solid Blue, `intent: EXECUTE_PICKUP`).
    *   *Phase B (In Transit):* `[ Complete Delivery (Enter Drop-off OTP) ]` (Solid Emerald, `intent: EXECUTE_DELIVERY_COMPLETION`).
*   **Secondary Actions:** Navigate via Waze/Google Maps, Report Flat Tire / Transit Delay.
*   **State Transitions & Invariants:**
    *   Executing `[ Complete Delivery ]` automatically triggers the materials-received milestone on Kuya Ben's execution sheet and Aling Nena's tracking view.

##### Role R5: Public Citizen / Guest
*   **Forbidden / Blinded Elements:** Entire Screen Blinded. Access to active operational bookings requires verified identity assertion matching an active transaction participant.

---

# Part 3: Cross-Role State Transition Matrix

The table below defines system-wide transitions across core business entities, specifying which role holds execution authority and which roles receive read-only projections:

| Lifecycle State ($q_n$) | Triggering Action / Intent | Executing Role | Post-Condition State ($q_{n+1}$) | System Structural Invariants & Read-Side Projections |
| :--- | :--- | :--- | :--- | :--- |
| **`REQ_DRAFT`** | `PUBLISH_REQUEST` | **R1** (Aling Nena) | **`STATE_ACCEPTING_PROPOSALS`** | Request entity is published. Bidding opens. Target budget is public; contact details are fuzzed. Competitor bid blinding is enforced. |
| **`STATE_ACCEPTING_PROPOSALS`** | `SUBMIT_PROPOSAL_REVISION` | **R3** (Kuya Ben) | **`PROPOSAL_PENDING_CLIENT_SIGN_OFF`** | Creates itemized proposal node. Bid is visible to R1 (Requester) and author R3. Blinded to R5 and competitor R3 providers. R3 cannot self-accept. |
| **`PROPOSAL_PENDING_CLIENT_SIGN_OFF`** | `LAUNCH_PAYMENT_GATEWAY` | **R1** (Aling Nena) | **`ESCROW_PROCESSING`** | Locks proposal parameters. Prevents R3/R4 modifications. Opens payment gateway for the required escrow amount. |
| **`ESCROW_PROCESSING`** | `WEBHOOK_ESCROW_FUNDED` | **System / Gateway** | **`STATE_IN_EXECUTION_ESCROW_LOCKED`** | Funds are held in escrow. Generates operational dispatches. Unlocks the execution checklist (S6). Handoff OTPs are generated for R2, R3, and R4. |
| **`STATE_IN_EXECUTION_ESCROW_LOCKED`** | `CONFIRM_MERCHANT_HANDOFF` | **R2** (Ate Gina) | **`LOGISTICS_IN_TRANSIT`** | Requires verification of R4's OTP at pickup. Changes material status to in-transit. Updates the live delivery tracking node. |
| **`LOGISTICS_IN_TRANSIT`** | `EXECUTE_DELIVERY_COMPLETION` | **R4** (Kuya Danny) | **`MATERIALS_DELIVERED_ONSITE`** | Requires verification of the drop-off OTP at the destination. Triggers a delivery milestone update on R1 and R3 checklist views. |
| **`MATERIALS_DELIVERED_ONSITE`** | `SUBMIT_WORK_COMPLETION_PROOF` | **R3** (Kuya Ben) | **`AWAITING_CLIENT_VERIFICATION`** | Requires at least one completion photo upload. Enables the escrow release CTA on R1's interface. Disables further labor modifications. |
| **`AWAITING_CLIENT_VERIFICATION`** | `CONFIRM_COMPLETION_AND_RELEASE` | **R1** (Aling Nena) | **`STATE_SETTLED_COMPLETED`** | Requires an authenticated security challenge. Releases escrow funds to R2, R3, and R4 ledgers based on the agreed breakdown. Terminal state. |
| **`ANY_ACTIVE_STATE`** | `TRIGGER_DISPUTE_FLOW` | **R1, R2, R3, or R4** | **`STATE_DISPUTED_FROZEN`** | Freezes all escrow releases. Revokes mutation access from all roles. Flags the engagement for operational audit and mediation. |

---

# Part 4: Implementation Architecture

This implementation pattern resolves the problem of ad-hoc conditional logic identified in `browse-mobile.html`. It replaces template-level conditionals with a strictly-typed view projection pipeline.

```
┌─────────────────────────────────────────────────────────────┐
│                 Incoming Backend Entity                     │
│               (Citizen Request / Escrow)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Role-Based Projection Engine                 │
│                 (projectCitizenRequest)                     │
│                                                             │
│   • Blinds competitor proposals via cryptographic checks    │
│   • Sanitizes sensitive address data                        │
│   • Resolves domain-specific price semantics                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Deterministic FSM Action Resolver              │
│                  (resolveActionMatrix)                      │
│                                                             │
│   • Evaluates: State x ActorRole x Invariant Checks         │
│   • Returns immutable array: UIActionContract[]             │
│   • Prevents unauthorized CTAs from entering the DOM        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Polymorphic Component Renderer                  │
│                (renderRequestDetailView)                    │
│                                                             │
│   • Renders pre-computed ViewModel without conditional logic│
│   • Directly binds action tokens to container targets       │
└─────────────────────────────────────────────────────────────┘
```

The unified data flow operates as follows:

```typescript
// 1. Structural Domain Entities
export type Role = 'CITIZEN_OWNER' | 'MERCHANT' | 'LEAD_PROVIDER' | 'COURIER' | 'PUBLIC_GUEST';

export type RequestState = 
  | 'REQ_DRAFT'
  | 'STATE_ACCEPTING_PROPOSALS'
  | 'PROPOSAL_PENDING_CLIENT_SIGN_OFF'
  | 'ESCROW_PROCESSING'
  | 'STATE_IN_EXECUTION_ESCROW_LOCKED'
  | 'AWAITING_CLIENT_VERIFICATION'
  | 'STATE_SETTLED_COMPLETED'
  | 'STATE_DISPUTED_FROZEN';

export interface ProposalNode {
  id: string;
  providerId: string;
  providerName: string;
  laborAmountCents: number;
  materialsAmountCents: number;
  logisticsAmountCents: number;
  totalAmountCents: number;
}

export interface CitizenRequestEntity {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  fuzzedBarangay: string;
  exactAddress: string;
  targetBudgetCents: number;
  state: RequestState;
  proposals: ProposalNode[];
  selectedProposalId?: string;
}

// 2. Projected UI Contracts (Role-blinded, defensive ViewModels)
export interface UIActionContract {
  token: 'PRIMARY_STICKY_CTA' | 'SECONDARY_CTA' | 'DESTRUCTIVE_CTA';
  label: string;
  intent: string;
  isEnabled: boolean;
}

export interface CitizenRequestViewModel {
  requestId: string;
  displayTitle: string;
  displayDescription: string;
  displayLocation: string;
  pricingDisplay: {
    label: string;
    amountFormatted: string;
  };
  visibleProposals: Array<{
    proposalId: string;
    providerName: string;
    totalFormatted: string;
    isOwnProposal: boolean;
  }>;
  actions: UIActionContract[];
}

// 3. Deterministic Invariant Evaluator & Projection Engine
export class CitizenRequestProjectionEngine {
  public static project(
    entity: CitizenRequestEntity, 
    actor: { id: string; role: Role }
  ): CitizenRequestViewModel {
    const isOwner = actor.id === entity.ownerId;

    return {
      requestId: entity.id,
      displayTitle: entity.title,
      displayDescription: entity.description,
      // Invariant: Exact street address is never exposed during bidding phases
      displayLocation: (isOwner || entity.state === 'STATE_IN_EXECUTION_ESCROW_LOCKED') 
        ? entity.exactAddress 
        : entity.fuzzedBarangay,
      pricingDisplay: {
        label: isOwner ? 'Your Target Budget' : 'Target Budget',
        amountFormatted: `₱${(entity.targetBudgetCents / 100).toFixed(2)}`
      },
      // Invariant: Sealed Competitor Bidding. Only the owner can see all bids.
      // Tradespeople see only their own proposals. Guests see zero bids.
      visibleProposals: entity.proposals
        .filter(proposal => {
          if (isOwner) return true;
          if (actor.role === 'LEAD_PROVIDER' && proposal.providerId === actor.id) return true;
          return false;
        })
        .map(proposal => ({
          proposalId: proposal.id,
          providerName: proposal.providerName,
          totalFormatted: `₱${(proposal.totalAmountCents / 100).toFixed(2)}`,
          isOwnProposal: proposal.providerId === actor.id
        })),
      actions: this.resolveActionMatrix(entity, actor)
    };
  }

  private static resolveActionMatrix(
    entity: CitizenRequestEntity, 
    actor: { id: string; role: Role }
  ): UIActionContract[] {
    const actions: UIActionContract[] = [];
    const isOwner = actor.id === entity.ownerId;
    const hasActiveBid = entity.proposals.some(p => p.providerId === actor.id);

    switch (entity.state) {
      case 'STATE_ACCEPTING_PROPOSALS':
        if (isOwner) {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: entity.proposals.length > 0 
              ? `Review Proposals (${entity.proposals.length})` 
              : 'Boost Request Visibility',
            intent: entity.proposals.length > 0 
              ? 'EXPAND_PROPOSALS' 
              : 'PURCHASE_BOOST',
            isEnabled: true
          });
          actions.push({
            token: 'SECONDARY_CTA',
            label: 'Edit Request Scope',
            intent: 'EDIT_REQUEST',
            isEnabled: true
          });
        } else if (actor.role === 'LEAD_PROVIDER') {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: hasActiveBid ? 'View / Adjust My Submitted Bid' : 'Submit Proposal / Bid',
            intent: hasActiveBid ? 'OPEN_PROPOSAL_DRAWER' : 'BUILD_NEW_PROPOSAL',
            isEnabled: true
          });
        } else if (actor.role === 'PUBLIC_GUEST') {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: 'Sign In to Submit Proposal',
            intent: 'AUTH_GATEWAY',
            isEnabled: true
          });
        }
        break;

      case 'PROPOSAL_PENDING_CLIENT_SIGN_OFF':
        if (isOwner) {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: 'Accept Offer & Fund Escrow',
            intent: 'LAUNCH_PAYMENT_GATEWAY',
            isEnabled: true
          });
          actions.push({
            token: 'SECONDARY_CTA',
            label: 'Request Modification / Counter',
            intent: 'LAUNCH_COUNTER_DRAWER',
            isEnabled: true
          });
        } else if (actor.role === 'LEAD_PROVIDER' && hasActiveBid) {
          // CRITICAL INVARIANT: Bidders CANNOT accept their own proposals
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: 'Modify Proposal Terms',
            intent: 'LAUNCH_COUNTER_DRAWER',
            isEnabled: true
          });
        }
        break;

      case 'STATE_IN_EXECUTION_ESCROW_LOCKED':
        if (isOwner) {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: 'Confirm Completion & Release Escrow',
            intent: 'CONFIRM_COMPLETION',
            isEnabled: false // Only enabled when provider claims work complete
          });
          actions.push({
            token: 'DESTRUCTIVE_CTA',
            label: 'Dispute / Flag Order',
            intent: 'DISPUTE_ORDER',
            isEnabled: true
          });
        } else if (actor.role === 'LEAD_PROVIDER') {
          actions.push({
            token: 'PRIMARY_STICKY_CTA',
            label: 'Mark Work Complete',
            intent: 'SUBMIT_COMPLETION_PROOF',
            isEnabled: true
          });
        }
        break;

      default:
        break;
    }

    return actions;
  }
}

// 4. Defensive Template Renderer
// Operates exclusively on pre-computed ViewModels without conditional logic
export function renderRequestDetailView(viewModel: CitizenRequestViewModel): string {
  const primaryCTA = viewModel.actions.find(a => a.token === 'PRIMARY_STICKY_CTA');
  const secondaryCTA = viewModel.actions.find(a => a.token === 'SECONDARY_CTA');
  const destructiveCTA = viewModel.actions.find(a => a.token === 'DESTRUCTIVE_CTA');

  return `
    <article class="request-detail-surface" data-request-id="${viewModel.requestId}">
      <header class="surface-header">
        <h1 class="font-bold text-xl">${viewModel.displayTitle}</h1>
        <span class="location-badge">${viewModel.displayLocation}</span>
      </header>

      <section class="pricing-container">
        <span class="label">${viewModel.pricingDisplay.label}</span>
        <span class="value font-mono text-lg">${viewModel.pricingDisplay.amountFormatted}</span>
      </section>

      <section class="proposals-matrix">
        ${viewModel.visibleProposals.map(proposal => `
          <div class="proposal-card ${proposal.isOwnProposal ? 'is-own-proposal' : ''}">
            <span class="provider-name">${proposal.providerName}</span>
            <span class="proposal-quote">${proposal.totalFormatted}</span>
          </div>
        `).join('')}
      </section>

      <footer class="action-dock-sticky">
        ${primaryCTA ? `
          <button 
            class="btn-primary" 
            data-intent="${primaryCTA.intent}" 
            ${!primaryCTA.isEnabled ? 'disabled' : ''}>
            ${primaryCTA.label}
          </button>
        ` : ''}

        ${secondaryCTA ? `
          <button 
            class="btn-secondary" 
            data-intent="${secondaryCTA.intent}" 
            ${!secondaryCTA.isEnabled ? 'disabled' : ''}>
            ${secondaryCTA.label}
          </button>
        ` : ''}

        ${destructiveCTA ? `
          <button 
            class="btn-destructive" 
            data-intent="${destructiveCTA.intent}" 
            ${!destructiveCTA.isEnabled ? 'disabled' : ''}>
            ${destructiveCTA.label}
          </button>
        ` : ''}
      </footer>
    </article>
  `;
}
```

---

## Architectural Sign-Off & Verification Invariants

```
             ┌────────────────────────────────────────────────────────┐
             │               DEPLOYMENT HEALTH CHECK                  │
             │           ZERO-TOLERANCE INVARIANT SUITE               │
             └───────────────────────────┬────────────────────────────┘
                                         │
     ┌───────────────────────────────────┼───────────────────────────────────┐
     ▼                                   ▼                                   ▼
[INV-01: SEALED BID]            [INV-02: ANTI-LEAK]                 [INV-03: ESCROW-LOCK]
Competitor bid data is          Demand & Supply components          Escrow release CTAs require
stripped server-side before     share zero DOM renderers.           owner identity validation.
client template emission.       Cart logic strictly excluded.       Providers cannot self-sign.
```

1.  **INV-01 (Sealed Bid Guarantee):** No proposal node belonging to provider $A$ shall be included in any view state projected for competitor provider $B$. Violation halts server-side response emission.
2.  **INV-02 (Demand/Supply Layout Isolation):** Template renderers for Citizen Requests (**S3**) are prohibited from importing or rendering Storefront Checkout components (`StorefrontBookingBar`, `PicksCartStepper`). Cart state logic must not execute on demand-side views.
3.  **INV-03 (Escrow Action Authorization):** The Primary Action CTA `ACCEPT_OFFER_AND_FUND` and its counterpart `RELEASE_ESCROW` can only be generated when `context.actor.id === context.request.ownerId`. These actions are omitted from all other projections.
4.  **INV-04 (Traceable Intent Decoupling):** Templates must not resolve business state inline. If a button click performs a state mutation, it must emit a strongly-typed `AppIntent` token processed by the deterministic FSM Action Resolver. Templates remain purely presentational.