# Serbizyu 2.0 — Listing Extensions, Partnered Deal-Chaining, and Buyer Substitution Specification

**Document Reference:** `docs/planning-hardening/18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md`  
**Status:** CANONICAL ARCHITECTURAL SPECIFICATION & DOMAIN GOVERNANCE  
**Date:** 2026-09-07  
**Authority:** Follows Founder Charter (Doc 12) and Deal-Chaining Logic Soundness Review (Doc 17). Establishes formal contract for listing extensions, partner recommendations, buyer substitution, and universal product workflows.  
**Subordinate To:** Canonical Domain State Contracts (`domain-state-contracts-rebuilt.md`) and Architecture Spine (`ARCHITECTURE-SPINE.md`).

---

## 1. Context & Architectural Thesis

Earlier exploratory designs (Documents 15 and 16) attempted to model multi-party fulfillment by manufacturing artificial "composite listings" (e.g. creating a joint entity called *"Ate Gina + Tagudin Express Delivery"*). 

As proven in the **Deal-Chaining Logic Soundness Review (Document 17)**, composite listings violate core domain invariants:
1. **Identity & Reputation Distortion:** A food vendor should not have their 5-star culinary rating contaminated by an independent motorcycle rider's flat tire.
2. **Liability Entanglement:** If an external courier fails during transit, a food vendor who has already cooked and packaged perishable goods must not suffer automatic forfeiture or cancellation.
3. **Rigid Lock-In:** In a town economy like Tagudin, merchants do not operate closed logistics fleets. A single bakery may offer stall pickup, in-house bicycle delivery to close neighbors, or dispatch through an open motorcycle pool for distant barangays.

**The Settled Architectural Thesis:**  
Listings are strictly **single-owner, immutable base contracts**. Sibling or downstream fulfillment operations are modeled as **Listing Extensions**. The seller publishes pre-configured partnership recommendations, while the buyer retains sovereign agency to substitute providers at checkout without altering the merchant's underlying offer.

---

## 2. Ontological Definitions: Extensions vs. Listings

### 2.1 The Base Listing (Single Owner)
* **Definition:** An offer owned exclusively by one legal identity (`owner_user_id`), with an immutable deliverable, price (`price_amount_minor`), unit label (`unit_label`), and category code (`category_code`).
* **Invariance:** A listing never merges multiple provider identities into a synthetic composite name. Ate Gina's listing remains strictly *"Weekend Bibingka Tray (6 pcs)"* by *Ate Gina Traditional Bakes*.

### 2.2 Listing Extensions (Modular Service Attachments)
* **Definition:** An optional, downstream, or auxiliary service that can be attached to a base listing to form an executable fulfillment plan.
* **Extension Archetypes:**
  1. **Fulfillment / Delivery Extensions:** Transporting physical goods from merchant origin to resident doorstep (e.g. motorcycle courier, cargo tricycle sidecar, neighborhood foot courier).
  2. **Installation / Trade Skill Extensions:** Attaching certified technical labor to a physical part (e.g. attaching Kuya Ben’s on-site installation labor to a replacement AC run capacitor).
  3. **Preparation / Facilitation Extensions:** Ancillary setup (e.g. catering party table setup attached to food trays).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BASE LISTING: Weekend Bibingka Tray · Ate Gina (₱180.00)                    │
│ [Single Owner Contract · Market Stall #4 · Category: local-food]            │
├─────────────────────────────────────────────────────────────────────────────┤
│ EXTENSION OPTIONS (Fulfillment Modes):                                      │
│                                                                             │
│ Option 1: Self / Counter Pickup (Free)                                      │
│   └── 1-Node Shop Workflow (Single-Provider Order)                          │
│                                                                             │
│ Option 2: Pre-Packaged Partner Delivery (+₱60.00 · Tagudin Express)         │
│   └── 2-Node Deal Chain DAG (Default Partner Recommendation)                │
│                                                                             │
│ Option 3: Buyer-Substituted Cargo Delivery (+₱80.00 · Kuya Danny Tricycle)  │
│   └── 2-Node Deal Chain DAG (Substituted Downstream Provider)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Provider-Originated Partnerships vs. Buyer-Controlled Substitution

### 3.1 Provider-Originated Partnerships (Merchant Defaults)
Merchants are empowered to curate trusted partnerships to remove buyer friction:
* When Ate Gina lists fresh bibingka, she specifies a preferred default delivery partner (e.g., *Tagudin Express Motorcycle Pool* with standard insulated food boxes for ₱60.00).
* The merchant listing embeds this configuration as a **Fulfillment Preset**:
  ```json
  {
    "fulfillment_presets": [
      {
        "id": "fp-pickup",
        "mode": "pickup",
        "label": "Market Stall Pickup",
        "fee_minor": 0,
        "is_default": true
      },
      {
        "id": "fp-delivery",
        "mode": "chain_service",
        "label": "Doorstep Delivery",
        "default_listing_id": "lst-tagudin-express-moto",
        "default_provider_name": "Tagudin Express Motorcycle Pool",
        "fee_minor": 6000
      }
    ]
  }
  ```

### 3.2 Buyer-Controlled Provider Substitution
While the merchant recommends a default, **the buyer is never locked into an inflexible monopoly**:
* A resident ordering 5 party trays for a family gathering in Barangay Pudoc West may determine that a motorcycle box is too small.
* In the UI, the buyer taps `[ Change Courier ⌵ ]` on the fulfillment switcher row.
* An organic bottom sheet displays all verified Tagudin transport partners matching the required route:
  1. **Tagudin Express Motorcycle Pool** (`₱60.00 · Fast 15-25m · Insulated box`)
  2. **Kuya Danny Tricycle Cargo** (`₱80.00 · Heavy/Party cargo · Spacious sidecar`)
  3. **Barangay Centro Bicycle Courier** (`₱40.00 · Short-distance Centro delivery`)
* Selecting an alternative provider:
  1. Replaces the proposed downstream `DealNeed` provider binding.
  2. Updates the delivery price delta (`+₱80.00`).
  3. Updates Node 02 in the live Workflow diagram.
  4. Recalculates the sticky bottom dock commitment (`₱180 + ₱80 = ₱260.00`).

---

## 4. Universal Concept of Work: Products vs. Services

A central flaw of conventional e-commerce interfaces is assuming that only skilled services have "workflows", while products are passive transactions. In Serbizyu, **all economic activity in Tagudin represents work**.

### 4.1 The Universal 3-Phase Work Paradigm

Every listing—regardless of category—features an active, visible **Work Pipeline**:

```
┌───────────────────┬──────────────────────────────────┬──────────────────────────────────┐
│ Phase             │ Physical Goods / Products        │ Skilled Labor / Services         │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 1: Inception│ Batching & Preparation           │ Triage & Diagnostics             │
│                   │ (Baking, measuring, shelf-pick)  │ (Load test, leak inspection)     │
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 2: Refinement│ Inspection & Packaging          │ Execution & Treatment            │
│                   │ (Banana leaf wrap, counter tag)  │ (Chemical wash, component rewire)│
├───────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Phase 3: Handover │ Custody Release & Verification   │ Warranty Seal & Sign-off         │
│                   │ (Stall handover / rider pickup)  │ (Differential test, warranty card│
└───────────────────┴──────────────────────────────────┴──────────────────────────────────┘
```

### 4.2 Dynamic DAG Expansion
When a buyer toggles between **Pickup** and **Delivery**:
* **When Pickup is selected:** The workflow renders as a **1-Party Preparation Pipeline** (Seller Phase 1 $\rightarrow$ Phase 2 $\rightarrow$ Counter Collection).
* **When Delivery is selected:** The workflow dynamically extends into a **2-Node Deal Chain DAG**:
  * **Node 01 (Seller):** Item Preparation & Packaging at Market Stall.
  * **Animated Dotted Bus:** Handover gate (`Condition: item_ready_at_stall`).
  * **Node 02 (Selected Courier):** Direct Doorstep Transport & Custody Sign-off.

---

## 5. Settlement, Escrow, and Soundness Rules (Document 17 Compliance)

This specification strictly conforms to the corrective rulings established in **Document 17**:

1. **Independent Child Orders (No Composite Entity):**
   * Selecting `Bibingka (₱180) + Kuya Danny Delivery (₱80)` forms a parent `DealChain` record containing **two distinct child orders**:
     * `Order #ORD-101`: Ate Gina Traditional Bakes (`amount_minor: 18000`).
     * `Order #ORD-102`: Kuya Danny Tricycle Cargo (`amount_minor: 8000`).
2. **No Pooled Money / Non-Cascading Settlement:**
   * Payment obligations remain strictly attached to child orders. There is no pooled wallet or communal escrow balance.
   * If Kuya Danny encounters road blockages, Ate Gina’s completed ₱180 baking order is **financially isolated and protected from cancellation**.
3. **Explicit Handoff Readiness Gates:**
   * Node 02 (Courier dispatch) is gated by Node 01's readiness trigger (`item_packed_at_stall`).
   * Couriers are not dispatched prematurely while food is still baking, eliminating idle wait times and disputes.
4. **Idempotency & Version Locking:**
   * Switching delivery couriers mutates the proposed deal graph version. If a provider's capacity expires prior to checkout, the version guard halts checkout and prompts re-selection.

---

## 6. UI & Design System Standards

The architectural patterns above are persisted and visually verified in the Serbizyu design system:

1. **Brand Identity:** 
   * Primary: Serbizyu Navy Blue (`#0F2F58`).
   * Accent / Badges: Warm Gold (`#FFC244`).
   * No Glovo emerald/teal green contamination.
2. **Card Standard Metadata Row:**
   * Uniform 2-segment row below price: `[Segment 1] · [Segment 2]`.
   * Service Offers: `Availability Window · Duration/Warranty` (`Today 2:00 PM · 60–90 mins`).
   * Service Requests: `Active Timer · Target Schedule` (`Active 2h ago · Need Today`).
   * Product Offers: `Batch/Stock · Packaging` (`Saturday Morning Batch · Banana Leaf Basket`).
   * Product Requests: `Active Timer · Destination` (`Active 45m ago · To Barangay Pudoc West`).
3. **Pure White Card Canvas:**
   * 100% white backgrounds (`#FFFFFF`) on all cards.
   * Request distinction is handled cleanly via a subtle Warm Gold pill (`REQUEST`) on the photo, eliminating yellow card highlighting.
4. **3-Segment Sticky Bottom Dock:**
   * Left (~70%): Primary action CTA in Navy Blue.
   * Right (~30%): Transparent ghost link `[🔗 Chain]` in the middle + Far-right Quantity Stepper `− 1 +`.
5. **Expandable Detailed Notes:**
   * Truncated to 2 lines initially with an interactive `Read more ⌵` / `Show less ▴` toggle.

---

## 7. Verification Cross-References

* **Design System Studio Implementation:** `docs/design-kit/mobile-design-system.html`
* **Mobile Web Implementation:** `docs/design-kit/browse-mobile.html`
* **Interactive Artifacts:** Verified via Puppeteer headless browser screenshots (feed, 3-segment dock, courier modal, and deal chain canvas).
