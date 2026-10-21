# Design: Align Marketplace & Orders with Canonical Mockups

**Change ID:** `align-marketplace-and-orders-with-canonical-mockups`  
**Status:** PROPOSED (Hardened per Reviewer Audit v2)  

---

## 1. System Architecture & Complete Flow

```mermaid
graph TD
    subgraph BottomNav [Bottom Navigation Bar]
        TabExplore[1. Explore / Home]
        TabPost[2. Post / Create +]
        FabQuickDeal[3. Center Elevated QR FAB]
        TabOrders[4. Orders & Deals]
        TabProfile[5. Profile Drawer]
    end

    TabExplore -->|Renders| BrowsePage[Pages/Browse.tsx]
    TabPost -->|Opens Wave Drawer| CreatorDrawer[CreatorPostModal.tsx]
    FabQuickDeal -->|Opens Scanner Sheet| QrModal[QuickDealScanModal.tsx]
    TabOrders -->|Navigates to| OrdersHub[Pages/Orders/Index.tsx]
    TabProfile -->|Opens Wave Drawer| ProfileDrawer[GlovoWaveModal: Profile]

    CreatorDrawer -->|Option 1: Request| CreateRequest[/requests/create]
    CreatorDrawer -->|Option 2: Service| CreateService[/listings/create/service]
    CreatorDrawer -->|Option 3: Product| CreateProduct[/listings/create/product]

    OrdersHub -->|Ongoing / History Card| OrderDetail[Pages/Orders/Show.tsx]
    
    subgraph PicksAndCheckout [Picks & Order Formation]
        PicksTray[PicksDrawer.tsx / Pages/Picks.tsx / ListingDetail.tsx]
        SlotPicker[SlotListingPickerModal.tsx]
        DealChainModal[DealChainCheckoutModal.tsx]
    end

    PicksTray -->|Change ▾ on (itemId, nodeId)| SlotPicker
    SlotPicker -->|Swaps Partner Listing & Reprices| PicksTray
    PicksTray -->|Direct Listing: Confirm Booking| CreateOrder[POST /listings/id/orders]
    PicksTray -->|Multi-Partner: Review Coordinated Chain| DealChainModal
    DealChainModal -->|Submits slot_overrides| StageChain[POST /deal-chains/authorize]
    StageChain -->|Durable Binding via deal_invitations| StagedPlan[deal_chains + deal_needs]
    CreateOrder -->|Inertia Redirect| OrderDetail
```

---

## 2. Component Design & Contracts

### 2.1 The Creator Post Drawer (`CreatorPostModal.tsx`) & Real Destinations
Rendered via `GlovoWaveModal` with the signature asymmetrical organic wave cap:
- **Header**:
  - Title: *"What would you like to create?"*
  - Subtitle: *"Tagudin Community Marketplace"*
- **Option 1: Request (`creator-icon-demand`)**:
  - Badge: `Request`
  - Title: `Post a Request`
  - Description: *"Post what you need — get bids and proposals from verified local providers."*
  - Target: `/requests/create`
- **Option 2: Service Listing (`creator-icon-service`)**:
  - Badge: `Service`
  - Title: `Service Listing`
  - Description: *"Offer a trade or service with defined labor rates, inclusions, and work pipeline steps."*
  - Target: `/listings/create/service`
- **Option 3: Product Listing (`creator-icon-product`)**:
  - Badge: `Product`
  - Title: `Product Listing`
  - Description: *"Sell physical goods, replacement parts, handmade crafts, or local food."*
  - Target: `/listings/create/product`

#### Creation Route & Page Resolution:
To eliminate 404 dead ends, register authenticated routes and author renderable creation forms in `resources/js/Pages/`:
1. `Route::get('/requests/create', [RequestController::class, 'create'])->name('requests.create');`
   - Renders `Pages/Requests/CreateRequest.tsx` matching `docs/design-kit/request-service-builder.html` (Screen 03).
2. `Route::get('/listings/create/service', [ListingController::class, 'createService'])->name('listings.create.service');`
   - Renders `Pages/Listings/CreateService.tsx` matching `docs/design-kit/listing-service-editor.html` (Screen 01).
3. `Route::get('/listings/create/product', [ListingController::class, 'createProduct'])->name('listings.create.product');`
   - Renders `Pages/Listings/CreateProduct.tsx` matching `docs/design-kit/listing-product-editor.html` (Screen 02).

---

### 2.2 The Orders Hub (`resources/js/Pages/Orders/Index.tsx` · Screen 16)

#### Controller Projection Contract (`OrderController::index`):
1. **Accountable Membership Query**:
   Query all entries where the authenticated user is:
   - The buyer (`orders.buyer_user_id = auth->id`).
   - The provider (`orders.provider_user_id = auth->id`).
   - An active accountable party in `order_parties` (`user_id = auth->id`, including assigned couriers).
   - The coordinator of a staged deal chain (`deal_chains.coordinator_user_id = auth->id`).
2. **Truthful Financial Projections**:
   Resolves status-aware pricing (avoiding zero defaults):
   - Accepted orders: `amount_minor = order_terms_snapshots.amount_minor`, `currency = order_terms_snapshots.currency`, `price_status: 'fixed'`.
   - Proposed orders: `amount_minor = order_parties[buyer].scope.proposal.amount_minor`, `currency = 'PHP'`, `price_status: 'pending_confirmation'`.
   - Staged Deal Chains: Sum of node estimates with `price_status: 'planning_estimate'`.
3. **Comprehensive Order & Work Status Precedence Matrix**:
   Precedence evaluates `work_instances.status` for accepted orders, capturing all schema-constrained states:

| Order Status | Work Instance Status | Tab | UI Live Status Badge & Banner |
| :--- | :--- | :--- | :--- |
| `draft` | Any | **Ongoing** | `📝 Draft Order` |
| `pending_acceptance` | `null` | **Ongoing** | `⏳ Pending Acceptance · Awaiting Provider` |
| `accepted` | `not_started` | **Ongoing** | `🟢 Accepted · Work Queued` |
| `accepted` | `scheduled` | **Ongoing** | `📅 Scheduled Execution` |
| `accepted` | `in_progress` | **Ongoing** | `🟢 In Progress · ETA ~45 mins (pulsing dot)` |
| `accepted` | `completion_proposed` | **Ongoing** | `⏳ Completion Proposed · Review Proof` |
| `accepted` | `awaiting_signoff` | **Ongoing** | `⏳ Work Done · Awaiting Customer Sign-off` |
| `cancel_requested` | Any | **Ongoing** | `⚠️ Cancellation Requested` |
| `deal_chains.status = 'sourcing'` | `null` | **Ongoing** | `🔵 Sourcing Partners · Deal Chain #DC-XXXX` |
| `closed` | `completed` | **History** | `✓ Settled & Closed (Cash/COD)` |
| `cancelled` | Any | **History** | `✕ Cancelled` |
| `accepted` | `disputed` | **Ongoing** | `🚨 Under Triage Review` |
| `accepted` | `failed` | **History** | `✕ Work Failed` |
| `deal_chains.status = 'closed'` | `null` | **History** | `✓ Plan Finalized` |

---

### 2.3 Deal Chain Slot Customizer & Durable Storage

#### Stable Node Identity & Swapping:
In `resources/js/marketplace/types.ts`, enhance `DealChainNode`:
```typescript
export interface DealChainNode {
    id: string;               // Stable unique node ID (e.g. 'store_1', 'courier_1', 'labor_1')
    role: 'STORE' | 'COURIER' | 'LABOR' | 'AUDIT' | 'RECYCLE';
    title: string;
    sub: string;
    type: 'store' | 'delivery' | 'labor' | 'audit' | 'recycle';
    listingId?: string;       // Bound listing ID
    providerId?: string;      // Bound provider user ID
    priceMinor?: number;      // Resolved item cost
}
```

#### Candidate Listings Query (`GET /api/deal-chains/slot-candidates`):
- Filtered by `role` and Tagudin geography.
- Returns verified candidate offerings with photo, rating, price, and SLA.

#### Durable Storage Boundary (`DealChainController::authorize`):
- All submission boundaries (`Browse.tsx`, `Pages/Picks.tsx`, and `ListingDetail.tsx`) include `slot_overrides`:
  ```typescript
  slot_overrides: {
      [nodeId: string]: {
          listing_id: string;
          provider_user_id: string;
          price_minor: number;
      }
  }
  ```
- In `DealChainController::appendPlan`:
  - When inserting `deal_needs`, if `slot_overrides` contains that node ID:
    - Inserts a durable record in `deal_invitations`:
      `deal_need_id = $dealNeedId`, `invited_provider_user_id = $override['provider_user_id']`, `scope = json_encode(['listing_id' => $override['listing_id'], 'price_minor' => $override['price_minor']])`.
    - This durably anchors the selected partner so staged chains retain chosen listings rather than reverting to static templates.

---

### 2.4 Order Details Multi-Actor Perspective Matrix (`Pages/Orders/Show.tsx`)

#### Membership Authorization:
`OrderController::show` authorizes access if the authenticated user is:
- `orders.buyer_user_id`
- `orders.provider_user_id`
- An active party in `order_parties` (including assigned couriers).
- Returns `allowed_perspectives: ('customer' | 'provider' | 'courier')[]`.
- Server strictly redacts private labor payout margins and courier costs from customer projections.

#### Role-Specific Docks & Actions:
1. **Customer Perspective (`customer`)**:
   - `Team Chat` button linking to `/orders/{id}/chat`.
   - `Review Work & Settle ₱XXX.XX` (when `work.status = awaiting_signoff`).
   - `Rate & Review` (when `orders.status = closed`).
2. **Technician / Provider Perspective (`tech`)**:
   - Milestone checklist with interactive completion toggles (`✓ Intake Freon check`, `⏳ Install capacitor`).
   - `Upload Photo Evidence` / `Propose Completion`.
   - `Bypass (Part on Site)` toggle.
3. **Courier Perspective (`courier`)**:
   - `Confirm Pickup at Store` button.
   - `Confirm Hand-off at Gate` button.
4. **Solo Direct Booking State (`solo`)**:
   - When `deal_chain_id IS NULL`, the multi-node relay collage and transit gating are hidden in favor of a clean single-provider milestone card.

---

### 2.5 Quick Deal QR Scanner Sheet & Live Navigation

1. **Quick Deal Handshake Sheet (`QuickDealScanModal.tsx`)**:
   - Tapping the center elevated QR FAB opens `QuickDealScanModal`.
   - Renders personal Tagudin QR handshake code, simulated viewfinder, and instructions.
2. **Shared Orders Badge Count**:
   - In `HandleInertiaRequests.php`, share `counts.ongoing_orders` for authenticated users (defaulting to 0 for guests).
   - `BottomNavBar` binds its numerical badge strictly to `props.counts?.ongoing_orders`.
3. **Navigation Unification**:
   - Wire all 5 tabs (`explore`, `post`, `quick_deal`, `orders`, `profile`) consistently across `Browse.tsx`, `MyListings.tsx`, and `Orders/Index.tsx`.
