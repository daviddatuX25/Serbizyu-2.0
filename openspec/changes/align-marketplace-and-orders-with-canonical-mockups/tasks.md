# Tasks: Align Marketplace & Orders with Canonical Mockups

**Change ID:** `align-marketplace-and-orders-with-canonical-mockups`  
**Status:** PROPOSED (Hardened per Reviewer Audit v2)  

---

## Phase 1: Creator Post Drawer & Working Destinations
- [x] 1.1 Register creation routes in `routes/web.php`:
  - `GET /requests/create` -> `RequestController::create`
  - `GET /listings/create/service` -> `ListingController::createService`
  - `GET /listings/create/product` -> `ListingController::createProduct`
- [x] 1.2 Implement renderable creation pages:
  - `resources/js/Pages/Requests/CreateRequest.tsx` matching `docs/design-kit/request-service-builder.html` (Screen 03).
  - `resources/js/Pages/Listings/CreateService.tsx` matching `docs/design-kit/listing-service-editor.html` (Screen 01).
  - `resources/js/Pages/Listings/CreateProduct.tsx` matching `docs/design-kit/listing-product-editor.html` (Screen 02).
- [x] 1.3 Author `resources/js/components/marketplace/CreatorPostModal.tsx` using `GlovoWaveModal` with the 3 creation pathways (`Request`, `Service Listing`, `Product Listing`) matching `browse-mobile.html:3816–3873`.
- [x] 1.4 Wire `CreatorPostModal` into `Browse.tsx` and `MyListings.tsx`, triggered by the `post` tab in `BottomNavBar`.
- [x] 1.5 Author `resources/js/components/marketplace/QuickDealScanModal.tsx` with Tagudin handshake QR display and viewfinder simulation.
- [x] 1.6 Wire the center elevated Quick Deal FAB in `BottomNavBar` to open `QuickDealScanModal` instead of cart checkout.

## Phase 2: The Orders Hub (`/orders` -> `Pages/Orders/Index.tsx`)
- [x] 2.1 Register `Route::get('/orders', [OrderController::class, 'index'])` in `routes/web.php` before the dynamic `/orders/{order}` route.
- [x] 2.2 Implement `OrderController::index`:
  - Query orders by `buyer_user_id`, `provider_user_id`, and `order_parties.user_id`.
  - Query staged deal chains by `coordinator_user_id`.
  - Project truthful status-aware amounts from `order_terms_snapshots` or `proposal` (avoiding zero defaults).
  - Map complete lifecycle matrix: `draft`, `pending_acceptance`, `accepted` (mapped to `work.status`: `not_started`, `scheduled`, `in_progress`, `completion_proposed`, `awaiting_signoff`, `disputed`), `cancel_requested`, `closed`, `cancelled`, `failed`.
- [x] 2.3 Author `resources/js/Pages/Orders/Index.tsx` faithfully reproducing `docs/design-kit/orders-mobile.html:480–688`:
  - Topbar with back navigation and Picks bag icon.
  - Glovo Segmented Tab Bar: `Ongoing (count)` vs `History (count)`.
  - Ongoing order cards with pulsing live status dots (`live-dot-pulse`), partner slot tags, and direct `Track Order Details →` buttons.
  - History cards with completion dates and star ratings.
- [x] 2.4 Share `counts.ongoing_orders` in Inertia shared props (`HandleInertiaRequests.php`) and bind `BottomNavBar.ordersCount` to it.
- [x] 2.5 Update `BottomNavBar` on all pages so tapping `orders` navigates directly to `/orders`.

## Phase 3: Deal Chain Slot Customizer & Durable Storage
- [x] 3.1 Enhance `DealChainNode` type in `resources/js/marketplace/types.ts` with stable `id`, `listingId`, `providerId`, `priceMinor`, and support for `RECYCLE` role.
- [x] 3.2 Implement candidate listing endpoint or query `GET /api/deal-chains/slot-candidates` filtered by role (`STORE`, `COURIER`, `LABOR`, `AUDIT`, `RECYCLE`) and area (`Tagudin`).
- [x] 3.3 Author `resources/js/components/marketplace/SlotListingPickerModal.tsx` using `GlovoWaveModal` matching `bookings-checklist.html:2386–2420`:
  - Title, subtitle by role, search input, and Tagudin filter chips (`All in Tagudin`, `Top Rated`, `Favorites`).
  - Partner offering cards with photo, location, price, and handoff SLA.
- [x] 3.4 Update `PicksDrawer.tsx`, `BundleChainModal.tsx`, `Pages/Picks.tsx`, and `ListingDetail.tsx` to add `[ Change ▾ ]` buttons on slot rows identified by `(itemId, nodeId)`.
- [x] 3.5 Implement slot swapping handler that updates the selected partner listing in `basket[index].dealChain.nodes`, recalculates combination price, and refreshes preview.
- [x] 3.6 Update `DealChainController::authorize` across all submission boundaries (`Browse.tsx`, `Pages/Picks.tsx`, `ListingDetail.tsx`) to accept `slot_overrides` and durably bind chosen providers into `deal_invitations`.

## Phase 4: Order Details Actor Perspective Matrix (`/orders/{id}`)
- [x] 4.1 Update `OrderController::show` to authorize access for `order_parties` members (including assigned couriers), project `allowed_perspectives`, and redact private pricing margins per actor.
- [x] 4.2 Upgrade `resources/js/Pages/Orders/Show.tsx` to faithfully match `docs/design-kit/order-detail-mobile.html:870–1040, 1300–1550`:
  - Perspective toggle bar (`Customer`, `Technician/Provider`, `Courier`).
  - Hero feature card with photo collage and ETA.
  - Live progress execution section with milestone task checklist (A1/A9 Work Scope).
  - Graphic invoice card with zero platform commission notice.
  - Role-specific fixed bottom action docks:
    - Customer: `Team Chat`, `Review & Settle`, `Rate & Review`.
    - Provider: `Task checklist`, `Evidence upload`, `Bypass (Part on Site)`.
    - Courier: `Confirm Pickup at Store` and `Confirm Hand-off at Gate`.
  - Solo direct-booking state (single provider without multi-node relay).

## Phase 5: Navigation & Multi-Item Direct Booking Consolidation
- [x] 5.1 Update `MyListings.tsx` to handle all 5 `BottomNavBar` tabs (`explore`, `post`, `quick_deal`, `orders`, `profile`) consistently.
- [x] 5.2 Ensure multi-item direct bookings without deal chains create an order proposal for all selected entries or present a batched confirmation step.

## Phase 6: Automated Verification & Acceptance
- [x] 6.1 Add feature tests in `tests/Feature/OrdersWork/` covering `GET /orders` indexing, status mapping, and multi-actor show projections.
- [x] 6.2 Run the full Pest test suite across `OrdersWork` and `IdentityAccess`.
- [x] 6.3 Run `npm run test` (Vitest) and `npm run typecheck`.
- [x] 6.4 Format PHP code using Pint.
