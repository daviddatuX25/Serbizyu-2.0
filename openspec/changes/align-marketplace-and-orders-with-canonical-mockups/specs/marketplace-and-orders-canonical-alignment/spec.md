# Capability Spec: Marketplace & Orders Canonical Alignment

**Capability:** `marketplace-and-orders-canonical-alignment`  
**Parent Change:** `align-marketplace-and-orders-with-canonical-mockups`  
**Status:** SPECIFICATION  

---

## 1. Requirement: The "Post (+)" Creator Drawer & Working Destinations

### Scenario: Tapping Post opens the 3-pathway creator drawer
- **GIVEN** a user is browsing the marketplace on mobile
- **WHEN** the user taps the center `Post (+)` tab on `BottomNavBar`
- **THEN** the application opens `CreatorPostModal` using the Glovo Organic Wave sheet
- **AND** displays three distinct creation options:
  - `Post a Request` linking to `/requests/create`
  - `Service Listing` linking to `/listings/create/service`
  - `Product Listing` linking to `/listings/create/product`
- **AND** each link resolves to an active, working creation surface rather than returning HTTP 404

---

## 2. Requirement: The Canonical Orders Hub (`/orders`)

### Scenario: Viewing ongoing and history orders with full lifecycle mapping
- **GIVEN** an authenticated user who is a buyer, provider, or active party on orders
- **WHEN** the user visits `/orders` or taps the `Orders` tab in the bottom navigation bar
- **THEN** the application renders `Pages/Orders/Index.tsx`
- **AND** displays the segmented switcher `Ongoing (N)` and `History (N)`
- **WHEN** the user is on the `Ongoing` tab
- **THEN** orders in `pending_acceptance` display `⏳ Pending Acceptance`
- **AND** orders in `accepted` with work `in_progress` display `🟢 In Progress · ETA ~45 mins` with a pulsing live status dot (`live-dot-pulse`)
- **AND** orders in `accepted` with work `awaiting_signoff` display `⏳ Work Done · Awaiting Sign-off`
- **AND** orders display their truthful price from `order_terms_snapshots` or `proposal`, not zero defaults
- **AND** each ongoing order provides a direct `Track Order Details →` button linking to `/orders/{orderId}`

### Scenario: Staged Deal Chains visible to coordinator
- **GIVEN** a user who has authorized a coordinated deal chain in `sourcing` status
- **WHEN** the user visits `/orders`
- **THEN** the staged deal chain appears under the `Ongoing` tab with badge `🔵 Sourcing Partners · Deal Chain #DC-XXXX`
- **AND** provides a button linking to `/deal-chains/{dealChainId}`

### Scenario: Guest access to orders is protected
- **GIVEN** an unauthenticated visitor
- **WHEN** the visitor attempts to navigate to `/orders`
- **THEN** the `EnsureAuthenticated` middleware intercepts and redirects to `/auth/sign-in` with `returnTo = /orders`

---

## 3. Requirement: Deal Chain Slot Listing Customization & Backend Overrides

### Scenario: Swapping a partner listing inside a combo and submitting overrides
- **GIVEN** a user has attached a Deal Chain combination with multiple partner slots (e.g. `[STORE]` and `[COURIER]`)
- **WHEN** the user views the slot rows in the Picks Drawer or standalone `/picks` page
- **THEN** each partner slot displays a `[ Change ▾ ]` button identified by `(itemId, nodeId)`
- **WHEN** the user taps `[ Change ▾ ]`
- **THEN** `SlotListingPickerModal` opens with the Glovo wave cap
- **AND** displays verified Tagudin providers matching that specific role with price, photo, and handoff SLA
- **WHEN** the user selects an alternative partner listing
- **THEN** that slot node is updated with the new listing ID, title, and price
- **AND** the combination subtotal and extra fees are recalculated immediately
- **WHEN** the user authorizes the deal chain plan
- **THEN** the request payload includes `slot_overrides` mapping each node ID to its chosen listing ID
- **AND** the backend binds the overridden partner listings into `deal_needs`

---

## 4. Requirement: Order Details Multi-Actor Perspective Matrix

### Scenario: Viewing an order as a Customer
- **GIVEN** an order where the authenticated user is the buyer
- **WHEN** the user views `/orders/{orderId}`
- **THEN** the screen defaults to the `Customer` perspective
- **AND** displays live ETA, "Team Chat" button (`/orders/{orderId}/chat`), and settlement action docks
- **AND** private provider payouts and courier margins are redacted from the response

### Scenario: Viewing an order as a Provider or Technician
- **GIVEN** an order where the authenticated user is the provider
- **WHEN** the user views `/orders/{orderId}`
- **THEN** the screen displays the `Provider` perspective
- **AND** displays the execution task checklist (A1/A9 milestones), transit relay gating, and photo evidence upload controls

### Scenario: Viewing an order as a Courier
- **GIVEN** an order where the authenticated user is recorded as an active courier in `order_parties`
- **WHEN** the user views `/orders/{orderId}`
- **THEN** the user is authorized (HTTP 200)
- **AND** the screen displays the `Courier` perspective
- **AND** displays the `Confirm Hand-off at Gate` action dock

### Scenario: Direct / Solo Order Presentation
- **GIVEN** an ordinary direct booking without deal chain lineage (`deal_chain_id IS NULL`)
- **WHEN** viewed on `/orders/{orderId}`
- **THEN** the multi-node relay header is hidden in favor of a direct single-provider milestone card

---

## 5. Requirement: Quick Deal QR Scanner Sheet & Live Navigation

### Scenario: Tapping the center elevated QR FAB
- **GIVEN** a user browsing the marketplace on mobile
- **WHEN** the user taps the center elevated Quick Deal QR FAB in the bottom navigation bar
- **THEN** `QuickDealScanModal` opens
- **AND** displays the user's personal Tagudin handshake QR code and camera viewfinder frame
- **AND** does NOT trigger an empty cart checkout or post to `/deal-chains/authorize`

### Scenario: Orders badge reflects real ongoing orders
- **GIVEN** an authenticated user with no active orders and two staged items in Picks
- **WHEN** the user views the bottom navigation bar
- **THEN** the `Orders` tab displays no numerical badge
- **AND** the `Picks` cart icon displays badge `2`
