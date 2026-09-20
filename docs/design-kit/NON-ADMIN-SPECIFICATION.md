# Serbizyu 2.0 — Non-Admin Screens & Mocks Canonical Specification

**Status:** Canonical Implementation Authority for Non-Admin UI/UX  
**Target Stack:** Laravel 12 · Inertia.js React (v3) · Tailwind CSS · TypeScript · Shadcn/Radix Primitives  
**Source Prototypes:** `docs/design-kit/*.html` (Live preview on port 8080)  
**Audience:** Autonomous Implementation Agents, Full-Stack Engineers, QA Edge Auditors  

---

## 1. Architectural Spine & Universal UX Principles

All non-admin surfaces in Serbizyu 2.0 adhere to four foundational design tenets established during the prototype hardening sessions:

### 1.1 Dual-Mode Rendering (Guided Onboarding vs. All-in-One Advanced)
Every major creator and composition interface defaults to a **Guided Step-by-Step Onboarding Mode** designed for mobile touchscreens, with an explicit mode switch anchored in the sticky footer dock:
* **Guided Mode (Default)**:
  * Presents one logical step at a time (e.g., Step 1: Scope $\to$ Step 2: Commercial Terms $\to$ Step 3: Partner Extensions).
  * Navigation is controlled via bottom dock: `Continue →` advances through steps; primary submission (`Publish Listing` / `Post Request`) is gated strictly until the final step.
  * Step progress is visualized via Glovo-style pill dots (`● ○ ○` with smooth CSS transitions).
* **All-in-One Advanced Mode**:
  * Toggled via `[ ⚡ Switch to all-in-one form ]`.
  * Renders all form sections simultaneously in a single vertical scroll body for experienced desktop power users or fast keyboard entry.
  * The footer button changes to `⚡ Switch to guided steps`.

### 1.2 Minimalist Copy & Visible Input Affordances
* **No Parenthetical Nuisance**: Parenthetical disclaimers, redundant hints, and long verbose sentences are eliminated across all cards and forms.
* **Visibly Editable Affordances**: Inputs never appear as invisible, borderless plain text. Every editable property has an explicit 1px border (`#D1D5DB` or `#CBD5E1`), a subtle background (`#FAFCFB`), hover/focus states (`var(--forest-600)` border), and concise placeholders.
* **Duration Inputs with Icons**: Time fields utilize a dedicated compact pill container containing a green clock SVG icon, an `<input type="number" min="1" max="480" step="5">` triggering numeric keypads on mobile, and a monospace `"m"` suffix.
* **Evidence Inputs with Icons**: Verification requirement fields feature a blue camera SVG icon and a concise text input for required photos, gauge telemetry, or citizen OTP sign-offs.

### 1.3 The Work Execution Pipeline (Light-Mode DAG Canvas)
* **Topological Separation**: Parallel branches, sequential steps, and conditional forks are graph relationship patterns, not category menu pills.
* **Catalog-Driven**: The listing or request attaches a standardized workflow template from the **Work Execution Catalog** (with search bar, category chips, template list, and a dedicated bottom affordance `[ ＋ Build Custom Workflow in Work Studio ↗ ]`).
* **Light-Mode Canvas**: Bounded horizontal canvas container (`background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 10px 12px; overflow-x: auto;`).
* **Delicate Themed Scrollbar**: $3\text{px}$ thin scrollbar with forest green thumb (`rgba(13, 113, 95, 0.25)`).
* **Live Sync**: Editing any stage title, duration, or evidence gate in the form immediately live-syncs to the visual DAG canvas and recalculates total SLA in the header.

### 1.4 Deal Chain Partner Extensions (Horizontal Paginated Carousel Deck)
* **Multi-Combination Offerings**: Listings and requests support multiple customer-selectable Deal Chain combinations (e.g. Option 1: *Turnkey Sourced Parts*, Option 2: *Post-Service Safety Audit*, Option 3: *Eco-Scrap Hauling*).
* **Swipe Deck Architecture**: Uses `.partner-combos-deck` (`display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 10px; scrollbar-width: none;`).
* **Compact DAG View**: Each combination card embeds its own minimalist light-mode DAG preview showing connected roles and costs (`[ STORE ₱180 ]` ── `[ COURIER ₱80 ]` ── `[ YOU ₱450 ]`).
* **Slot Binders**: Interactive rows displaying role, current assigned partner (or `Open Slot`), and cost, with a `[ Change ▾ ]` button invoking `slot-listing-picker-modal`.
* **Pagination Controls**: `‹ Prev` button, interactive indicator dots (`● ○`), dynamic counter (`Option 1 of 2`), and `Next ›` button.
* **Unredundant Deal Studio Link**: Catalog modal features clean, description-free cards and a single dedicated bottom action:
  $$\boxed{\boldsymbol{＋}\;\text{Build Custom Chain in Deal Studio ↗}}$$
  linking directly to `deal-chain-builder.html`.

---

## 2. Master Screen Inventory (Non-Admin Surfaces)

| # | Specimen File (`docs/design-kit/`) | Primary Actor | Target Inertia Page / Route | Functional Cluster | Status |
|---|---|---|---|---|---|
| **01** | `listing-service-editor.html` | Provider (Tradesperson) | `Pages/Listings/CreateService.tsx`<br>`GET /listings/create/service` | Creation Suite | Complete |
| **02** | `listing-product-editor.html` | Merchant / Store / Farmer | `Pages/Listings/CreateProduct.tsx`<br>`GET /listings/create/product` | Creation Suite | Complete |
| **03** | `request-service-builder.html` | Citizen / Buyer / RFP Requester | `Pages/Requests/CreateRequest.tsx`<br>`GET /requests/create` | Creation Suite | Complete |
| **04** | `work-workspace.html` | Provider / Citizen / Engineer | `Pages/Work/Studio.tsx`<br>`GET /work/studio` | DAG Studios | Complete |
| **05** | `deal-chain-builder.html` | Provider / Coordinator | `Pages/DealChain/Studio.tsx`<br>`GET /deal-chain/studio` | DAG Studios | Complete |
| **06** | `work-spec-a1-builder.html` | Provider (A1 Linear Specialist) | `Pages/Work/A1Builder.tsx`<br>`GET /work/a1-spec` | DAG Studios | Complete |
| **07** | `flow-canvas-builder.html` | Architect / Integrator | `Pages/Work/FlowCanvas.tsx`<br>`GET /work/flow-canvas` | DAG Studios | Complete |
| **08** | `browse-mobile.html` | Customer / Buyer / Citizen | `Pages/Browse.tsx`<br>`GET /browse` | Marketplace | Complete |
| **09** | `listing-detail.html` | Customer / Buyer / Citizen | `Pages/ListingDetail.tsx`<br>`GET /listings/{id}` | Marketplace | Complete |
| **10** | `request-open-public-view.html` | Servicers / Public Bidders | `Pages/Requests/OpenShow.tsx`<br>`GET /requests/{id}/open` | Public Tenders | Complete |
| **11** | `request-sealed-public-view.html`| Servicers / Blind Bidders | `Pages/Requests/SealedShow.tsx`<br>`GET /requests/{id}/sealed` | Public Tenders | Complete |
| **12** | `quote-composer.html` | Servicer / Bidding Technician | `Pages/Bids/Create.tsx`<br>`GET /requests/{id}/bid` | Bidding & Negotiation | Complete |
| **13** | `quote-own-submitted.html` | Servicer (Bidder) | `Pages/Bids/Show.tsx`<br>`GET /bids/{id}` | Bidding & Negotiation | Complete |
| **14** | `responses-open-comparison.html`| Buyer / Requester | `Pages/Requests/CompareBids.tsx`<br>`GET /requests/{id}/bids` | Bidding & Negotiation | Complete |
| **15** | `bidding-negotiation.html` | Buyer & Servicer (Pair) | `Pages/Bids/Negotiate.tsx`<br>`GET /bids/{id}/negotiate` | Bidding & Negotiation | Complete |
| **16** | `orders-mobile.html` | Buyer / Servicer | `Pages/Orders/Index.tsx`<br>`GET /orders` | Order Management | Complete |
| **17** | `order-detail-mobile.html` | Buyer / Servicer | `Pages/Orders/Show.tsx`<br>`GET /orders/{id}` | Order Management | Complete |
| **18** | `deal-chain-active.html` | Buyer, Servicer, Courier, Store| `Pages/Orders/DealChainShow.tsx`<br>`GET /orders/deal-chain/{id}`| Order Management | Complete |
| **19** | `order-chat-mobile.html` | Buyer & Servicer | `Pages/Orders/Chat.tsx`<br>`GET /orders/{id}/chat` | Communication | Complete |
| **20** | `deal-chain-chat-mobile.html` | All Multi-Party Node Actors | `Pages/Orders/DealChainChat.tsx`<br>`GET /orders/deal-chain/{id}/chat` | Communication | Complete |
| **21** | `bookings-checklist.html` | Customer / Requester | `Pages/Orders/Checklist.tsx`<br>`GET /listings/{id}/checklist` | Order Management | Complete |
| **22** | `payment-flow-mobile.html` | Customer / Buyer | `Pages/Payments/Checkout.tsx`<br>`GET /orders/{id}/pay` | Escrow & Payments | Complete |
| **23** | `settlements-mobile.html` | Provider / Merchant / Courier | `Pages/Payments/Settlements.tsx`<br>`GET /settlements` | Escrow & Payments | Complete |
| **24** | `review-ceremony-mobile.html` | Customer & Provider (Mutual) | `Pages/Reviews/Create.tsx`<br>`GET /orders/{id}/review` | Trust & Reputation | Complete |
| **25** | `profile-mobile.html` | Public / Neighbors | `Pages/Users/Show.tsx`<br>`GET /users/{id}` | Trust & Reputation | Complete |
| **26** | `agent-today.html` | Barangay Delegate / Agent | `Pages/Agent/Today.tsx`<br>`GET /agent/today` | Neighborhood Mesh | Complete |
| **27** | `account-settings-mobile.html` | Authenticated User | `Pages/Account/Settings.tsx`<br>`GET /account/settings` | User Account | Complete |

---

## 3. Detailed Screen Specifications

---

### Cluster A: The Creation Trinity

#### 1. Service Listing Editor (`listing-service-editor.html`)
* **Route**: `/listings/create/service` | **Controller**: `ListingController::createService`
* **Primary Actor**: Service Provider / Tradesperson (Aircon technician, electrician, plumber, cleaner).
* **Viewport Model**: Fixed mobile container (`width: 390px; height: 844px;`) with desktop framing.
* **Top Bar**: Circular back button (`←`), Center title `"Service Listing"`, Draft pill (`Draft · v1`), Save button.
* **Step 1: Service Identity & Work Pipeline (`card-step-1`)**:
  * `Service Title`: `<input type="text" id="listing-title">` (e.g. *"Inverter Split AC Deep Clean & Checkup"*).
  * `Description`: `<textarea id="listing-description" rows="3">`.
  * `What's Included`: Positioned directly below Description as its natural sibling.
    * Dynamic list of guaranteed deliverables (`.custom-item-card`), each with green checkmark `✓`, text input, and remove `✕`.
    * Button: `[ ＋ Add Included Task ]`.
  * `Category`: `<select id="listing-category">` (Appliance, Electrical, Plumbing, Transport).
  * `Coverage in Tagudin`: Pill selector with active chips (`Tagudin Centro`, `Barangay Bio`, `Barangay Rizal`, `+ Add Barangay`).
  * `Work Execution Pipeline`:
    * Active Catalog Card: Title, inferred shape metadata (`A1 Linear · 4 Stages · 75m SLA`), icon, and `[ Change ▾ ]` button.
    * Light-Mode Compact DAG Canvas (`#work-preview-canvas-box`):
      * Standard Linear: `[1 Intake 15m]` ── `[2 Coil Wash 20m]` ── `[3 Cold Run 15m]` ── `[4 Delta Test 15m]`.
      * Parallel Streams: Fork SVG curve $\to$ vertically stacked lanes (`2A Indoor Coil 25m` / `2B Outdoor Unit 20m`) $\to$ Join SVG curve $\to$ `[3 Joint Test 15m]`.
      * Decision Branch: `[1 Pressure Triage 15m]` ── `[GATE Leak > 0?]` $\to$ `YES: Braze Joint` / `NO: Standard Wash` ── `[3 Temp Test 10m]`.
    * Milestone Requirements & Evidence List:
      * Stage Title input (`#D1D5DB` border, `#FAFCFB` bg).
      * Duration pill: Clock icon + `<input type="number" min="1" max="480" step="5">` + `"m"` suffix.
      * Scope description input.
      * Evidence requirement input with blue camera icon: `📷 Evidence: [ Photo of breaker off ]`.
      * Remove `✕` button.
      * Button: `[ ＋ Add Stage Node ]`.
* **Step 2: Rates & Options (`card-step-2`)**:
  * `Pricing Model`: Segmented pills: `Fixed Rate`, `Price Range`, `Package Tiers` (Single-Provider Volume Bundles).
  * Base Price input: Currency symbol `₱` + large number input.
  * Unit selector: `Per Unit / Appliance`, `Per Hour`, `Per Job`.
  * `Service Add-ons & Upgrades`: 2-row cards with customizable add-on prices (`+ ₱ [150.00]`) and default selection toggle badge (`Optional` vs. `✓ Selected by default`).
  * `Service Schedule`: Segmented pills: `Mon - Sat · 8am-5pm`, `Mon - Fri`, `7 Days / Week`, `Custom Hours ▾` (opens `custom-schedule-modal`).
  * Daily Capacity & Lead Time inputs (`Same-Day 2h notice`, `Next-Day`, `48h notice`).
  * `Accepted Payment Lanes`: Active pills: `Cash on Completion`, `GCash P2P`, `Tiwala Escrow`.
  * *Explicitly Removed: "Safety Precaution" field.*
* **Step 3: Partnered Services / Deal Chain (`card-step-3`)**:
  * Horizontal Paginated Carousel Deck (`#partner-combos-deck`):
    * Slide 1 (`Turnkey Sourced Parts`): Compact DAG `[ STORE ₱180 ]` ── `[ COURIER ₱80 ]` ── `[ YOU ₱450 ]` + Slot rows with `Change ▾` pickers.
    * Slide 2 (`Post-Service Safety Audit`): Compact DAG `[ YOU ₱450 ]` ── `[ AUDIT ₱150 ]` + Slot row with `Change ▾` picker.
  * Carousel Pagination Controls: `‹ Prev`, dots `● ○`, counter `Option 1 of 2`, `Next ›`.
  * Button: `[ ⑂ Attach Partner Combination · DEAL CHAIN ]` invoking `bundle-chain-catalog-modal`.
* **Footer Sticky Dock**:
  * Step progress dots (`● ○ ○`), Primary action button (`Continue →` on Steps 1 & 2; `Publish Listing ✓` on Step 3).
  * Mode Switcher: `[ ⚡ Switch to all-in-one form ]`.

---

#### 2. Product Listing Editor (`listing-product-editor.html`)
* **Route**: `/listings/create/product` | **Controller**: `ListingController::createProduct`
* **Primary Actor**: Merchant / Hardware Store Owner / Farmer / Supplier (Spare parts, building materials, agricultural goods).
* **Step 1: Product Identity (`card-step-1`)**:
  * `Merchant / Storefront`: Read-only tag (e.g. *"Tagudin Hardware & Supply · Poblacion East"*).
  * `Product Title`: `<input type="text" id="product-title">` (e.g. *"35uF Heavy-Duty AC Run Capacitor"*).
  * `Description`: Plain textarea without marketing fluff.
  * `Specifications & Features`: Direct sibling under Description (1:1 parity with What's Included).
    * Dynamic list of technical ratings with checkmark `✓`, text input, and delete `✕`:
      * `✓ 35uF ±5% capacitance tolerance rating`
      * `✓ 450VAC 50/60Hz explosion-proof aluminum can`
      * `✓ Standard 4-pin quick-connect terminals`
    * Button: `[ ＋ Add Specification ]`.
  * `Product Category`: `<select id="product-category">` (Parts & Hardware, Construction, Plumbing, Tools).
  * `Product Photo`: Thumbnail preview with verified counter badge and `[ Replace Photo ]` trigger.
  * *Explicitly Removed: "Fulfillment Shape" selector pills.*
* **Step 2: Pricing & Counter Stock (`card-step-2`)**:
  * `Unit Price (₱)` & `Pricing Unit` (`Piece / Unit`, `Bag 40kg`, `Kilogram`, `Meter / Roll`, `Box`).
  * `Available Counter Stock` & `Low Stock Alert` threshold.
  * `Product Variations & Primary Default`:
    * Visibly editable variant cards (`.variant-option-card`):
      * Variant title input: `<input type="text" class="variant-name-input">` (`#D1D5DB` border).
      * Default toggle: `★ Default` (active) / `Make Default`.
      * Delete button: `✕`.
      * Live editable Price pill: `₱ [ 180.00 ]`.
      * Live editable Stock pill: `[ 24 ] units stock`.
    * Button: `[ ＋ Add Product Variation ]`.
  * `Brand Substitution Policy`: `Equivalent Brand OK` vs. `Exact Brand Only`.
* **Step 3: Fulfillment & Partner Extensions / Deal Chain (`card-step-3`)**:
  * Counter Ready Window (`Immediate 15m`, `Scheduled Warehouse Prep 1h`, `Next-Day`).
  * Courier Pickup Instructions (`Direct counter lane 2 · State Order ID`).
  * Horizontal Paginated Carousel Deck (`#partner-combos-deck`):
    * Slide 1 (`Doorstep Delivery`): Compact DAG `[ PRODUCT ₱180 ]` ── `[ COURIER ₱35 ]` + Courier Slot binder `[ Change ▾ ]`.
    * Slide 2 (`Part & Installation Labor`): Compact DAG `[ PRODUCT ₱180 ]` ── `[ COURIER ₱35 ]` ── `[ INSTALL ₱250 ]` + Courier and Technician Slot binders `[ Change ▾ ]`.
  * Carousel Pagination Controls: `‹ Prev`, dots `● ○`, counter `Option 1 of 2`, `Next ›`.
  * Button: `[ ⑂ Attach Delivery / Service Extension · DEAL CHAIN ]` invoking `bundle-chain-catalog-modal`.

---

#### 3. Request a Service Builder (`request-service-builder.html`)
* **Route**: `/requests/create` | **Controller**: `RequestController::create`
* **Primary Actor**: Citizen / Buyer / Business / Property Owner needing work done.
* **Step 1: Problem Scope & Work Pipeline (`card-step-1`)**:
  * `Request Title`: Clear description of the problem (e.g. *"Repair water line in kitchen and replace gate valve before weekend"*).
  * `Category`: Scrollable pill row (Plumbing, Electrical, Carpentry, Aircon & Ref, `All Categories ▾`).
  * `Photos`: Upload strip with multi-photo preview and remove badges.
  * `Specific Requirements (Simple View · Default)`:
    * Clean, friendly checklist for everyday requests:
      * `✓ Inspect kitchen water line and under-sink pipe fittings` `[ ✕ ]`
      * `✓ Replace corroded brass gate shutoff valve` `[ ✕ ]`
      * `✓ Pressure test joint with household faucets open` `[ ✕ ]`
    * Button: `[ ＋ Add Requirement Task ]`.
  * `Attach Governed Work Pipeline Toggle (Off by Default)`:
    * Toggle switch: `[ Attach Governed Work Pipeline ]` (Subtext: *Standard catalog template with milestone SLAs & evidence gates*).
    * When OFF: Simple checklist above is visible; technical DAG is completely hidden for low friction.
    * When ON: Smoothly reveals `#request-work-pipeline-container`:
      * Active Work Catalog Card (`Plumbing Leak & Valve Triage · 45m SLA` + `[ Change ▾ ]`).
      * Compact Light-Mode DAG Canvas (`[ 1 Triage 15m ]` ── `[ 2 Valve 20m ]` ── `[ 3 Test 10m ]`).
      * Editable Milestone Requirements & Evidence Gates with clock duration inputs and camera proof tags.
* **Step 2: Location & Schedule (`card-step-2`)**:
  * `Barangay Selector`: `<div class="location-select-bar" onclick="openLocationSheet()">` (e.g. *Barangay Tagudin Centro*).
  * `Timing`: Urgency pills (`Flexible this week`, `Urgent`, `Specific Date ▾` opening `schedule-date-modal`).
* **Step 3: Budget & Tender Terms (`card-step-3`)**:
  * `Budget Mode`: `Need Estimate`, `Exact Budget`, `Undisclosed`.
  * `Budget Amount`: Currency symbol `₱` + large number input.
  * `Tender Mode`:
    * `Open Tender`: Public proposals visible to other bidders for price discovery.
    * `🔒 Sealed Bidding`: Bids remain blind until deadline to prevent price undercutting.
    * `✉ Direct Invite`: Tender sent only to selected favored providers.
  * `Preferred Payment`: Cash on Completion, GCash P2P, Tiwala Escrow.
  * `Deal Chain Sourcing Options (Horizontal Paginated Carousel Deck)`:
    * Slide 1 (`Hardware Sourcing + Courier + Trade Labor`): Compact DAG `[ STORE ₱180 ]` ── `[ COURIER ₱80 ]` ── `[ LABOR ₱850 ]`.
    * Slide 2 (`Post-Service Safety Inspection Audit`): Compact DAG `[ LABOR ₱850 ]` ── `[ AUDIT ₱150 ]`.
    * Carousel Controls: `‹ Prev`, dots `● ○`, counter `Option 1 of 2`, `Next ›`.
    * Button: `[ ⑂ Attach Sourcing Combination · DEAL CHAIN ]` invoking `bundle-chain-catalog-modal`.
  * *Explicitly Removed: Old Card 4 (Flow of Work Advanced Card).*

---

### Cluster B: Dedicated Visual DAG Studios

#### 4. Work Execution Pipeline Studio (`work-workspace.html`)
* **Route**: `/work/studio` | **Controller**: `WorkCatalogController::studio`
* **Primary Actor**: Advanced Servicer / Certified Master Tradesperson / System Curator.
* **Viewport Model**: Full-screen zoomable/pannable infinite canvas with floating control HUD.
* **Node Types Supported**:
  1. `Milestone Task Node`: Standard labor operation (e.g., *Intake Inspection*, *Chemical Foam Wash*). Attributes: Title, SLA duration (minutes), labor cost allocation, required tools.
  2. `Parallel Branch Fork & Join`: Splits a sequence into concurrent streams (e.g., *Indoor Evaporator* + *Outdoor Condenser* handled simultaneously by two technicians) and rejoins at a joint sign-off barrier.
  3. `Decision Gate Node (Diamond)`: Conditional branch based on telemetry (e.g., *Nitrogen Pressure Drop > 0 PSI?* $\to$ *Braze Leaking Joint* vs. *Proceed to Wash*).
  4. `Evidence & Sensor Verification Gate`: Photo proof capture, anemometer CFM airflow reading ($\ge 320\text{ CFM}$), multimeter voltage verification ($220\text{V} \pm 10\%$).
  5. `Citizen Dual Sign-Off Node`: SMS/OTP customer authorization before milestone escrow draw.

#### 5. Deal Chain DAG Builder (`deal-chain-builder.html`)
* **Route**: `/deal-chain/studio` | **Controller**: `DealChainController::studio`
* **Primary Actor**: General Contractor / Project Lead / Deal Coordinator.
* **Purpose**: Composition of multi-party cross-provider service agreements.
* **Architecture**:
  * Multi-Slot Container: Assigns accountable roles across different Tagudin business entities.
  * Roles Supported:
    * `STORE`: Sourced replacement parts / materials with pre-allocated budget cap.
    * `COURIER`: Logistics runner / tricycle transport with fixed route delivery fee.
    * `LABOR`: Primary technician / specialist performing craft installation.
    * `AUDIT`: Independent certified inspector providing third-party safety certification.
    * `RECYCLE`: Town eco-scrap hauler transporting hazardous chemical sludge to municipal depot.
  * Staggered Escrow Release Matrix: Defines whether payment releases milestone-by-milestone or all-or-nothing upon final audit.

---

### Cluster C: Marketplace Discovery & Public Tender Views

#### 6. Marketplace Mobile Browse PLP (`browse-mobile.html`)
* **Route**: `/browse` | **Controller**: `BrowseController::__invoke`
* **Primary Actor**: Any Tagudin Resident or Business Buyer.
* **Header & Filters**:
  * Location banner with Tagudin barangay selector (`Bio`, `Centro`, `Rizal`, `Libtong`).
  * Search bar with instant autocomplete.
  * Category Tabs: `All`, `Appliance`, `Plumbing`, `Electrical`, `Transport`, `Agri`.
  * Filter Chips: `⚡ Same-Day Available`, `★ Top Rated`, `⑂ Deal Chain Ready`, `₱ Under 500`.
* **Card Roster**:
  * Shows craft image, provider badge, verified citizen rating, starting price.
  * Deal Chain Extension Pill: Highlights pre-attached partner options (e.g. `⑂ Turnkey Parts Delivery Included`).
* **Sticky Basket / Multi-Quote Bar**: Floats at the bottom when comparing providers.

#### 7. Listing Detail View (`listing-detail.html`)
* **Route**: `/listings/{id}` | **Controller**: `ListingController::show`
* **Header**: Hero image carousel with zoom modal and merchant badge.
* **Section Breakdown**:
  * `Overview`: Title, provider trust badge, barangay coverage radius.
  * `What's Included`: Base guaranteed deliverables checklist.
  * `Work Execution Pipeline Preview`: Compact DAG canvas showing milestone stages.
  * `Rates & Add-ons`: Segmented pricing tier and optional add-on selector.
  * `Partnered Delivery / Deal Chain Options`: Customer picks fulfillment mode (*Self Pickup*, *Doorstep Courier*, *Turnkey Install*).
* **Bottom Dock**: Floating `Book Now ₱[Rate]` bar triggering order creation.

#### 8. Public Open Request / Tender View (`request-open-public-view.html`)
* **Route**: `/requests/{id}/open` | **Controller**: `RequestController::showOpen`
* **Purpose**: Open bidding feed where Tagudin technicians view customer RFQs.
* **Components**:
  * Problem Description & Photo Gallery.
  * Buyer Target Budget & Schedule Urgency.
  * Milestone Requirements Checklist & Target Work Pipeline DAG.
  * Public Bids Feed: Competing bids from nearby providers showing price, arrival SLA, and evidence commitments.
  * Floating Action Button: `[ ＋ Submit Proposal / Bid ]`.

#### 9. Public Sealed Request View (`request-sealed-public-view.html`)
* **Route**: `/requests/{id}/sealed` | **Controller**: `RequestController::showSealed`
* **Purpose**: Blind bidding tender where competing bids are hidden to protect fair market pricing.
* **Components**:
  * Padlock security badge: `🔒 Blind Bidding Protected`.
  * Countdown timer to proposal deadline.
  * Obfuscated bidder count: `"5 verified providers have submitted sealed bids"`.
  * Action: `[ 🔒 Submit Blind Proposal ]`.

---

### Cluster D: Bidding, Negotiation & Proposal Management

#### 10. Quote / Bid Composer (`quote-composer.html`)
* **Route**: `/requests/{id}/bid` | **Controller**: `BidController::create`
* **Primary Actor**: Servicer submitting a proposal on a customer's request.
* **Components**:
  * Proposed Total Price & Cost Breakdown (Labor + Materials + Transit).
  * Arrival Time Commitment (e.g. *Within 2 hours*).
  * Milestone Acceptance: Servicer accepts or modifies the requested Work Pipeline DAG.
  * Evidence Commitment: Checkbox pledge to provide required photos and sensor readings.
  * Slot Claiming: Option to claim the primary labor slot and invite a partner courier/store.

#### 11. Open Bids Comparison Matrix (`responses-open-comparison.html`)
* **Route**: `/requests/{id}/bids` | **Controller**: `RequestController::compareBids`
* **Primary Actor**: Buyer reviewing bids submitted on their request.
* **Components**:
  * Side-by-side proposal cards.
  * Metrics comparison: Price vs. Rating vs. Arrival Speed vs. Verification Tier.
  * Evidence completeness indicator.
  * Action: `[ Accept Proposal & Fund Escrow ]` or `[ Negotiate ▾ ]`.

#### 12. Bidding Negotiation Room (`bidding-negotiation.html`)
* **Route**: `/bids/{id}/negotiate` | **Controller**: `BidController::negotiate`
* **Purpose**: One-on-one pre-contract adjustment between buyer and bidder.
* **Components**:
  * Chat stream with counter-offer cards.
  * Interactive price slider and scope checklist adjustment.
  * Single-tap `[ Accept Modified Terms ]` converting the negotiation into a locked Order.

---

### Cluster E: Orders, Multi-Party Execution & Real-Time Chat

#### 13. Orders List Workspace (`orders-mobile.html`)
* **Route**: `/orders` | **Controller**: `OrderController::index`
* **Tabs**: `Active Orders`, `Awaiting Sign-off`, `Completed`, `Disputed`.
* **Card Anatomy**: Order ID, service/product thumbnail, partner chain indicators, current milestone status pill, escrow state.

#### 14. Single Order Detail & Milestone Tracker (`order-detail-mobile.html`)
* **Route**: `/orders/{id}` | **Controller**: `OrderController::show`
* **Components**:
  * Live Milestone Progress Bar: Highlights active stage in real time.
  * Evidence Gallery: Uploaded photos for each completed stage with timestamps.
  * Action Gate: `[ Approve Milestone & Release Stage Escrow ]` via customer OTP.
  * Dispute Trigger: `[ Report Issue / Pause Escrow ]`.

#### 15. Live Deal Chain Active Execution Tracker (`deal-chain-active.html`)
* **Route**: `/orders/deal-chain/{id}` | **Controller**: `DealChainController::showActive`
* **Purpose**: Real-time tracking of multi-party coordinated orders.
* **Components**:
  * Multi-Node Status Grid:
    * Node 1 (`STORE`): `Parts Prepared & Bagged at Counter ✓`
    * Node 2 (`COURIER`): `In Transit to Customer Site (ETA 12m) 🛵`
    * Node 3 (`LABOR`): `Technician On-Site Awaiting Parts Delivery ⏳`
  * Coordinated Payout Summary: Real-time escrow division tracking.

#### 16. Multi-Party Deal Chain Group Chat (`deal-chain-chat-mobile.html`)
* **Route**: `/orders/deal-chain/{id}/chat` | **Controller**: `DealChainController::chat`
* **Participants**: Buyer, Technician, Hardware Store Cashier, Motorcycle Rider.
* **Features**: Color-coded role chips, delivery location pins, photo sharing, system automated milestone alerts.

---

### Cluster F: Payments, Escrow & Settlement

#### 17. Payment & Escrow Funding Flow (`payment-flow-mobile.html`)
* **Route**: `/orders/{id}/pay` | **Controller**: `PaymentController::checkout`
* **Lanes Supported**:
  1. `Tiwala Escrow (Protected)`: Funds deposited into smart escrow ledger; released upon milestone OTP.
  2. `GCash P2P Direct`: In-app QR generation with reference number verification.
  3. `Cash on Completion`: Physical cash handoff with servicer app receipt confirmation.

#### 18. Settlements & Payout Ledger (`settlements-mobile.html`)
* **Route**: `/settlements` | **Controller**: `SettlementController::index`
* **Primary Actor**: Servicer / Merchant / Courier tracking their earnings.
* **Components**:
  * Available Balance, In-Escrow Funds, Completed Payouts.
  * Deal Chain Split Ledger: Shows exact commission deductions and partner splits.
  * One-tap `[ Withdraw to GCash / Bank ]`.

---

### Cluster G: Post-Order Trust, Reputation & Neighborhood Accounts

#### 19. Review Ceremony (`review-ceremony-mobile.html`)
* **Route**: `/orders/{id}/review` | **Controller**: `ReviewController::create`
* **Dual Review Protocol**:
  * Buyer rates Servicer (Craft quality, punctuality, fair pricing).
  * Servicer rates Buyer (Clear instructions, prompt access, respectful communication).
  * Photo evidence from order is attached to verified public portfolio.

#### 20. Public Citizen Profile (`profile-mobile.html`)
* **Route**: `/users/{id}` | **Controller**: `UserController::show`
* **Components**:
  * Tagudin Barangay residency badge.
  * Tiwala Trust Score ($\text{Scale } 1\text{ to } 100$).
  * Verified Completed Orders & Deal Chain coordination history.
  * Citizen endorsement reviews.

#### 21. Neighborhood Agent / Delegate Workspace (`agent-today.html`)
* **Route**: `/agent/today` | **Controller**: `AgentController::today`
* **Primary Actor**: Barangay Digital Delegate / Sari-Sari Store Owner assisting offline neighbors.
* **Context Switcher**: `[ Acting on Behalf of: Aling Maria / Mang Jose / Kuya Bert ]`.
* **Features**: Cash collection proxy, SMS-to-app order creation, manual receipt printing.

---

## 4. Shared Reusable Component Specifications

### 4.1 Work Execution Pipeline Component (`WorkPipelineCanvas.tsx`)
```typescript
interface WorkStage {
  id: string;
  num: string; // '1', '2A', '2B', 'GATE'
  lane?: 'top' | 'btm' | 'center';
  title: string;
  dur: string; // '15m', '20m'
  desc: string;
  evidence: string;
  color: string;
  bg: string;
}

interface WorkTemplate {
  id: string;
  category: 'appliance' | 'electrical' | 'plumbing' | 'carpentry' | 'transport';
  title: string;
  shape: string; // 'A1 Linear', 'A9 Parallel Streams', 'A1 Decision Branch'
  sla: string;
  flowType: 'linear' | 'parallel' | 'branch';
  description: string;
  stages: WorkStage[];
}
```

### 4.2 Deal Chain Carousel Deck Component (`DealChainCarousel.tsx`)
```typescript
interface PartnerSlot {
  type: 'store' | 'delivery' | 'installation' | 'audit' | 'hauling';
  role: string;
  name: string; // e.g. 'Danny Express Motorcycle Pool' or 'Open Slot'
  meta: string; // e.g. '₱35.00 route fee'
}

interface DealChainNode {
  role: string;
  title: string;
  sub: string;
  type: string;
  bg: string;
  color: string;
}

interface DealChainCombination {
  id: string;
  title: string;
  icon: string;
  isDefault: boolean;
  nodes: DealChainNode[];
  slots: PartnerSlot[];
}
```

### 4.3 Glovo Asymmetrical Wave Modal Component (`GlovoWaveModal.tsx`)
* **Cap SVG**:
  ```html
  <svg class="glovo-wave-cap" viewBox="0 0 390 34" preserveAspectRatio="none">
    <path d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z" fill="#FFFFFF"></path>
  </svg>
  ```
* **Pinned Fixed Header**: Never scrolls off-screen; houses title, subtitle, search bar, and filter chips.
* **Scrollable Body**: Houses cards with custom thin scrollbar.
* **Pinned Bottom Action Bar**: Anchors primary studio redirections (`[ ＋ Build Custom in Studio ↗ ]`).

---

## 5. Downstream Agent Execution Roadmap

When an autonomous agent (or developer team) executes the conversion from mock specimens to live production code:

1. **Step 1: UI Primitives & Components (`resources/js/components/`)**:
   * Build `WorkPipelineCanvas.tsx`, `EditableStagesList.tsx`, `DealChainCarousel.tsx`, `GlovoWaveModal.tsx`.
   * Ensure mobile touch responsiveness and thin scrollbar CSS.
2. **Step 2: Creation Trinity Pages (`resources/js/Pages/`)**:
   * Implement `Listings/CreateService.tsx`, `Listings/CreateProduct.tsx`, `Requests/CreateRequest.tsx`.
   * Wire dual-mode switching (`guided` vs. `advanced`) and form state persistence.
3. **Step 3: Backend Form Requests & Endpoints (`app/Http/`)**:
   * Author `CreateServiceListingRequest.php`, `CreateProductListingRequest.php`, `CreateServiceRequestRequest.php`.
   * Persist `work_pipeline` DAG JSON and `deal_chain_combinations` JSON into canonical Postgres tables.
4. **Step 4: Pest & Vitest Test Coverage**:
   * Test dual-mode state switching, DAG recalculations, and Deal Chain carousel slide navigation.
