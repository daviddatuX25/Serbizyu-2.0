# Align Marketplace & Orders with Canonical Mockups

**Status:** PROPOSED  
**Change ID:** `align-marketplace-and-orders-with-canonical-mockups`  
**Plane:** Frontend UX/UI (`F`), Orders & Fulfillment (`T`), Marketplace & Deals (`C`)  
**Date:** 2026-09-23  
**Canonical Authorities:**  
- `docs/design-kit/NON-ADMIN-SPECIFICATION.md` (Screens 08, 16, 17, 21, 05)  
- `docs/architecture/MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md`  
- `openspec/changes/t3-ordinary-order-formation/proposal.md`  
- Canonical Mockup Prototypes in `docs/design-kit/`:  
  - `browse-mobile.html` (Screen 08: Single-row sticky header, Creator Drawer, Quick Deal FAB)  
  - `orders-mobile.html` (Screen 16: Orders Hub with Ongoing & History)  
  - `order-detail-mobile.html` (Screen 17: Multi-Actor Perspective Matrix & Action Docks)  
  - `bookings-checklist.html` (Screen 21: Picks Tray with Slot Binders & `slot-listing-picker-modal`)  
  - `deal-chain-builder.html` (Screen 05: Dynamic Sourcing & DAG Node Binding)

---

## 1. Problem Statement & Audit Findings

An exhaustive adversarial audit between the canonical HTML prototypes in `docs/design-kit/` and the live application revealed that the frontend implementation has deviated from the hardened design specifications in four primary functional domains, alongside three operational regressions:

### 1.1 The "Post (+)" Creator Drawer Was Bypassed
In `browse-mobile.html` (lines 3816–3873, 6614–6637), tapping the center `Post (+)` tab in the bottom navigation opens the **"What would you like to create?" Glovo Organic Wave Drawer** (`#create-post-modal`), offering three distinct creation paths:
1. **Request** (`/requests/create`): Post what you need to receive quotes and bids from local providers.
2. **Service Listing** (`/listings/create/service`): Offer a trade or service with defined labor rates and work pipeline.
3. **Product Listing** (`/listings/create/product`): Sell physical supplies, fresh food, or handmade crafts.
In `Browse.tsx`, tapping `Post` was hardcoded to `router.visit('/my-listings')`, silently jumping the user away from Browse into My Listings.

### 1.2 The Orders Hub (`/orders`) Did Not Exist
In `orders-mobile.html` (Screen 16), the Orders Hub is a dedicated customer and provider workspace featuring:
- **Ongoing Tab**: Active orders with pulsing status indicators (`In Progress`, `Awaiting Sign-off`), partner role tags, ETA, and direct links to `/orders/{id}`.
- **History Tab**: Completed/settled transactions with star ratings and receipts.
In the repository, `resources/js/Pages/Orders/Index.tsx` does not exist, and `routes/web.php` lacks a `GET /orders` route. The bottom navigation bar was forced to fall back to `/my-listings`.

### 1.3 Deal Chain Slot Customization Was Hardcoded
In `bookings-checklist.html` (lines 2386–2420) and `NON-ADMIN-SPECIFICATION.md` §1.4, when a user selects a Deal Chain combination (e.g. *Turnkey Sourced Parts*), each role slot (`[STORE]`, `[COURIER]`, `[LABOR]`) features an interactive **Slot Binder**:
- Tapping `[ Change ▾ ]` opens the **`slot-listing-picker-modal`** (Glovo Wave Sheet).
- The user can search, filter (`All in Tagudin`, `Top Rated`, `Favorites`), and swap individual partner listings (e.g. swap "Tagudin Hardware" for "Centro Builders", or "Danny Express" for "Kuya Jun Courier").
- Swapping a listing recalculates the combination subtotal, updates handoff SLAs, and refreshes the DAG preview.
In the codebase, `BundleChainModal.tsx` and `PicksDrawer.tsx` only supported selecting static pre-canned recipe cards with read-only slot rows, preventing users from customizing individual partner nodes.

### 1.4 Order Details (`/orders/{id}`) Missing the Actor Perspective Matrix
In `order-detail-mobile.html` (Screen 17), the order details view is dynamic and role-aware:
- **Customer View**: Live ETA, "Team Chat" (`/orders/{id}/chat`), and "Review Work & Settle ₱XXX".
- **Technician / Provider View**: Execution task checklist (A1/A9 Work Scope), transit relay gating, bypass controls, and photo evidence upload.
- **Courier View**: Pickup store location, dropoff destination, and handoff sign-off.
- **Fixed Bottom Dock**: Role-specific primary actions based on the active viewer and order status.
In the codebase, `Pages/Orders/Show.tsx` only renders a static two-column view displaying raw proposal fields and a single finalize button.

### 1.5 Operational Regressions
1. **Quick Deal QR FAB**: Tapped center FAB opened the coordinated deal-chain checkout drawer instead of launching the Quick Deal QR scanner dialog.
2. **Unbound Navigation on `MyListings.tsx`**: `BottomNavBar` on `/my-listings` dropped `post` and `profile` events, leaving them non-functional.
3. **Misleading Orders Badge**: `ordersCount` in the bottom bar was passed `basket.length`, placing a badge over Orders before any real order was placed.

---

## 2. Objectives & Scope

1. **Mount Creator Post Drawer & Working Routes**:
   - Add `CreatorPostModal` to `Browse.tsx` and `MyListings.tsx` using `GlovoWaveModal`.
   - Register authenticated routes in `routes/web.php` for `/requests/create`, `/listings/create/service`, and `/listings/create/product` with clean creation views.
2. **Build the Canonical Orders Hub**:
   - Register `GET /orders` in `routes/web.php` with `EnsureAuthenticated`.
   - Implement `OrderController::index` querying `buyer_user_id`, `provider_user_id`, `order_parties`, and `deal_chains.coordinator_user_id`.
   - Project truthful status-aware amounts (avoiding zero defaults) and complete work status mapping.
   - Build `resources/js/Pages/Orders/Index.tsx` directly faithfully reproducing `orders-mobile.html` (Ongoing vs History).
   - Share `counts.ongoing_orders` in Inertia middleware and point bottom nav to `/orders`.
3. **Implement Slot Listing Customizer**:
   - Implement candidate query `GET /api/deal-chains/slot-candidates` filtered by role (`STORE`, `COURIER`, `LABOR`, `AUDIT`, `RECYCLE`) and Tagudin area.
   - Build `SlotListingPickerModal.tsx` using `GlovoWaveModal`.
   - Wire `[ Change ▾ ]` buttons on slot rows in `PicksDrawer.tsx`, `BundleChainModal.tsx`, and `Pages/Picks.tsx` keyed by `(itemId, nodeId)`.
   - Update `DealChainController::authorize` to accept, validate, and bind `slot_overrides` into `deal_needs`.
4. **Upgrade Order Details View**:
   - Update `OrderController::show` to authorize active `order_parties` (including couriers), project `allowed_perspectives`, and redact private pricing margins.
   - Upgrade `resources/js/Pages/Orders/Show.tsx` to faithfully match `order-detail-mobile.html`: multi-actor perspective switcher (`Customer`, `Technician/Provider`, `Courier`), milestone task checklist, graphic invoice, and role-appropriate action docks.
   - Provide a distinct solo direct-booking view for single-provider orders.
5. **Fix Operational Regressions**:
   - Wire center elevated Quick Deal FAB to `QuickDealScanModal` (QR handshake).
   - Unify bottom navigation event handling across `Browse.tsx` and `MyListings.tsx`.
   - Separate staged Picks count from actual ongoing orders.
3. No desktop admin alterations: this change strictly addresses the non-admin customer, provider, and courier mobile experience.

---

## 4. Success Criteria

1. Tapping `Post (+)` in the bottom navigation bar on any page opens the Glovo Wave Creator Drawer with the three canonical options.
2. Tapping `Orders` in the bottom navigation bar navigates to `/orders`, rendering `Pages/Orders/Index.tsx` with Ongoing and History tabs matching `orders-mobile.html`.
3. When viewing an attached Deal Chain combination in the Picks Drawer or standalone Picks page, each slot displays a `[ Change ▾ ]` button that opens `SlotListingPickerModal`, allowing the user to swap the assigned listing and recalculating the price.
4. `/orders/{id}` supports viewing the order from Customer, Provider, and Courier perspectives with live progress steps and role-appropriate action docks matching `order-detail-mobile.html`.
5. Tapping the Quick Deal FAB opens the QR scanner sheet rather than the cart checkout.
6. All Pest feature tests in `tests/Feature/OrdersWork/` and `tests/Feature/IdentityAccess/` pass with zero regressions.
7. `npm run typecheck` and `npm run test` pass with 0 errors.
