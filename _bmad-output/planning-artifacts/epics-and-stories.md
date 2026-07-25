# Serbizyu 2.0 — Epics & User Stories Breakdown

> **BMAD Method Phase 3 Artifact: Solutioning Epics & Stories**  
> *Document Version:* 3.0.0  
> *Date:* July 25, 2026  
> *Authors:* John (Product Manager) & Engineering Lead  

---

## 1. Epic Overview & Dependency Map

```
+-----------------------------------------------------------------------------------+
| EPIC 1: Foundation & Identity (Weeks 1-3)                                         |
| - Authentication, User Roles, SMS OTP, H3 Geospatial Setup                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| EPIC 2: Marketplace Core & Financial Ledger (Weeks 4-6)                           |
| - Direct Offers, Reverse Bidding, Double-Entry Escrow Ledger                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| EPIC 3: Transaction Primitives & Agent System (Weeks 7-9)                          |
| - Face-to-Face Quick Deal (QR), Human Agent Network, SMS Delegated Consent        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| EPIC 4: Advanced Coordination & Pilot Verification (Weeks 10-12)                  |
| - Deal-Chaining (DAG), PWA Background Sync, 3-Lane Compliance Dashboard           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detailed Epic & User Story Breakdown

### Epic 1: Foundation, Spatial Directory & User Identity (Weeks 1–3)

#### Story 1.1: Multi-Role User Registration & Authentication
* **As a** new user (Buyer, Servicer, Agent, Kiosk Partner),
* **I want to** register using my mobile phone number with SMS OTP verification,
* **So that** I can create a secure identity without requiring an email address.
* **Acceptance Criteria:**
  * System sends 6-digit OTP via Semaphore API within <10 seconds.
  * User roles (Buyer, Servicer, Agent, Kiosk) selectable during signup.
  * Basic profile stores name, phone, government ID scan, and barangay location.

#### Story 1.2: Uber H3 Spatial Cell Indexing & Location Filter
* **As a** platform user,
* **I want to** select my barangay location in Tagudin or Candon City,
* **So that** the app filters nearby service providers within a ~0.5 km radius.
* **Acceptance Criteria:**
  * Coordinates converted to Uber H3 Resolution 8 cell ID (`H3::geoToH3`).
  * $k$-ring array lookup retrieves nearby active providers in $O(1)$ time.

---

### Epic 2: Marketplace Core & Financial Escrow Engine (Weeks 4–6)

#### Story 2.1: Direct Offer Listing & Booking Calendar
* **As a** service provider or agent,
* **I want to** post structured listings with fixed or tiered pricing and available time slots,
* **So that** buyers can browse and book my services directly.
* **Acceptance Criteria:**
  * Provider can set pricing tiers, category tags, and service radius.
  * Buyer can select a slot, lock it for 15 minutes via Redis Redlock, and proceed to checkout.

#### Story 2.2: Reverse Bidding Engine (Post & Bid)
* **As a** buyer,
* **I want to** post a custom job request with budget, location, and photos,
* **So that** local service providers can submit competitive price quotes.
* **Acceptance Criteria:**
  * Buyer posts job; notification dispatched to matching H3 cell providers.
  * Providers submit bids with price, completion timeline, and work scope.
  * System tracks Provider Liquidity Ratio ($\ge 2.0$ bids per request target).

#### Story 2.3: Double-Entry Escrow Ledger & Xendit Integration
* **As a** platform administrator,
* **I want all** digital and cash payments recorded in an immutable double-entry accounting ledger,
* **So that** escrow balance drift remains exactly 0%.
* **Acceptance Criteria:**
  * Every transaction writes positive (credit) and negative (debit) rows in `ledger_entries`.
  * Xendit xenPlatform API handles digital card/GCash escrow holds and splits.
  * Shopee-style 3-day buffer auto-releases funds after job sign-off if no dispute is opened.

---

### Epic 3: Transaction Primitives & Human Agent System (Weeks 7–9)

#### Story 3.1: Face-to-Face Quick Deal via Optical QR Streaming
* **As a** buyer and seller in person,
* **I want to** negotiate and confirm a deal on-site using animated QR code scanning,
* **So that** we can execute transactions instantly without typing or internet connectivity.
* **Acceptance Criteria:**
  * Optical stream splits payload into RaptorQ / Fountain Code symbols looping at 3–5 FPS.
  * Camera viewfinder detects and reconstructs payload in <200ms.
  * Counter-offer stepper supports max 3 negotiation rounds.
  * Locks upon dual confirmation (app tap or SMS reply `ACCEPT <CODE>`).

#### Story 3.2: Human Agent Delegated Access & SMS Consent
* **As a** human agent,
* **I want to** create and manage listings for offline micro-servicers,
* **So that** feature-phone owners can participate in the digital marketplace.
* **Acceptance Criteria:**
  * Agent inputs owner details and creates listings on their behalf.
  * Critical owner actions trigger an SMS OTP prompt (`APPROVE <OTP>`) to owner's feature phone.
  * Revenue auto-splits: 75% Owner / 10% Agent / 15% Platform.
  * Agent receives 3× monthly commission Graduation Bonus when owner transitions to smartphone.

---

### Epic 4: Advanced Coordination, Offline DAG & Compliance (Weeks 10–12)

#### Story 4.1: Multi-Slot Deal-Chaining & Personal Liability Shield
* **As a** lead contractor or event organizer,
* **I want to** bundle multiple service/product slots under a single parent budget container,
* **So that** I can coordinate complex multi-provider projects seamlessly.
* **Acceptance Criteria:**
  * Spawns Tree DAG nodes with SHA-256 parent hashes and ECDSA P-256 Web Crypto signatures.
  * Fulfiller Liability Shield converts offline over-budget draws into personal lead contractor debt upon cloud sync.

#### Story 4.2: 3-Lane Regulatory Formalization Dashboard (D30)
* **As a** micro-servicer,
* **I want a** gamified earnings ladder for tax compliance,
* **So that** I can unlock higher payout caps without being intimidated by BIR forms.
* **Acceptance Criteria:**
  * Lane 1 Unregistered (default compliant starting state).
  * Lane 2 Sworn Declaration (`<₱250K/yr`, "keep 100% earnings", exempt from 1% withholding).
  * Lane 3 Registered BIR 2303 / BMBE ("Business Verified" badge, uncapped payouts).

---
*End of Epics & User Stories Breakdown.*
