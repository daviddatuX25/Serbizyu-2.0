# Serbizyu 2.0 — Product Requirements Document (PRD)

> **BMAD Method Phase 2 Artifact: Planning & Scoping**  
> *Document Version:* 2.2.0 (Full-Breadth Product Requirements)  
> *Date:* July 25, 2026  
> *Authors:* David Datu N. Sarmiento, Christine M. Lopez, Jaypee G. Pagaduan, Prince John Vidaña (BSIT 4B, CCSIT 215)  
> *Project Scope:* Tagudin & Candon City, Ilocos Sur, Philippines  

---

## 1. Product Purpose & Strategic Intent

**Serbizyu** is an inclusive, two-sided service marketplace and trust infrastructure purpose-built for Philippine provincial economies. Unlike metropolitan e-commerce apps designed for smartphone-native populations, Serbizyu bridges the provincial digital divide where ~70% of micro-entrepreneurs operate informally and rely on feature phones, cash transactions, or intermittent cellular data.

### 1.1 Core Strategic Objectives
* **Inclusive Access:** Enable non-digital-literate trade workers to participate in internet commerce through a human agent network without requiring upfront smartphone ownership.
* **Invisible Formalization:** Eliminate tax registration drop-off by embedding compliance into an earnings progression ladder.
* **Financial Safety:** Establish consumer and provider protection through double-entry escrow, supporting both digital payments and dual-confirmed cash.
* **Full-Spectrum Commerce:** Unify direct booking, reverse bidding, face-to-face QR deals, and multi-servicer package chaining under one platform.

---

## 2. Target Audience, Personas & Jobs-to-be-Done (JTBD)

| Persona | Role & Context | Core Job-to-be-Done (JTBD) | Key Pain Point Solved |
|---|---|---|---|
| **PER-01: Provincial Buyer** (Maria) | Local resident or event organizer with a smartphone | "When I need home repairs or event services, I want to compare transparent quotes and pay safely into escrow so I don't get overcharged or abandoned." | Prevents deposit loss, arbitrary price haggling, and unverified service quality. |
| **PER-02: Offline Micro-Servicer** (Tatay Ben) | Plumber/carpenter using a basic feature phone | "When I need more job orders, I want a trusted local agent to manage my digital presence via simple SMS confirmation so I can earn more without buying expensive tech." | Eliminates smartphone barrier and complex app navigation. |
| **PER-03: Tech-Savvy Servicer** (Ate Grace) | Aircon technician with a smartphone | "When I operate my business, I want a professional booking calendar, bidding tools, and verified reviews so I can scale beyond word-of-mouth." | Solves Facebook Marketplace policy bans on service listings and unorganized chat threads. |
| **PER-04: Human Agent** (Kevin) | Tech-savvy community youth | "When I help local trade workers get online, I want to earn transparent commissions and receive bonuses when workers graduate to smartphones." | Provides flexible local gig income while building community trust. |
| **PER-05: Kiosk Partner** (Nanay Cora) | Sari-sari store owner | "When neighbors need cash deposits or printed transaction receipts, I want my store to serve as a verified local service station." | Generates foot traffic and transaction fee earnings. |
| **PER-06: Platform Admin** (Project Team) | Course project team & operations leads | "When dispute or financial events occur, I want clear evidence logs and automated ledger audits to resolve issues within 4 hours." | Guarantees system integrity and 0% financial ledger drift. |

---

## 3. Product Scope & Functional Requirements

### 3.1 Catalog & Classification Scope
* **REQ-CAT-01 (28 Categories):** System shall support 28 service and product categories across 8 primary domains (Home Repairs, Beauty & Wellness, Local Transport, Agricultural Labor, Education & Tutoring, Events & Catering, Digital Services, Local Goods).
* **REQ-CAT-02 (Professional Verification Flags):** Categories requiring legal licenses (e.g., Electrician, Engineer) shall enforce a verified license check badge before listing publication.
* **REQ-CAT-03 (10 Fulfillment Archetypes):** System shall support 10 operational fulfillment modes: Single Visit, Multi-Slot Event, Recurring Retainer, On-Demand Dispatch, Delivery & Pickup, Digital Deliverable, Kiosk Pickup, Field Agritech Labor, Emergency Assist, and Face-to-Face Quick Deal.

### 3.2 Commerce Primitives (Functional Scope)

#### Primitive 1: Direct Offer & Booking Engine
* **REQ-DIR-01:** Providers/Agents shall create fixed or tiered service listings specifying service radius, pricing tiers, and calendar availability.
* **REQ-DIR-02:** Buyers shall browse listings, select options, and initiate direct bookings protected by escrow.

#### Primitive 2: Reverse Bidding Engine (Post & Bid)
* **REQ-BID-01:** Buyers shall post custom job or product requests specifying budget, target date, location, and description/photo requirements.
* **REQ-BID-02:** Eligible local providers shall receive notifications and submit competitive proposals (price, timeline, scope details).
* **REQ-BID-03:** System shall track and optimize Provider Liquidity Ratio (aiming for $\ge 2.0$ bids per open request).

#### Primitive 3: Face-to-Face Quick Deal Engine
* **REQ-QDL-01:** Buyers and sellers in physical proximity shall initiate impromptu deals by scanning a dynamic or static QR code.
* **REQ-QDL-02 (Counter-Offer Stepper):** Interface shall support real-time price adjustments capped at a maximum of 3 counter-negotiation rounds.
* **REQ-QDL-03 (Dual Confirmation):** Deals shall lock only upon dual confirmation (Buyer scan/confirm + Seller app tap or SMS reply `ACCEPT <CODE>`).

#### Primitive 4: Multi-Slot Deal-Chaining Engine
* **REQ-CHN-01:** Buyers organizing complex projects (e.g., weddings, home construction) shall create a single Deal Container bundling multiple product and service slots under one payment.
* **REQ-CHN-02 (Delegated Sub-Budgets):** Lead contractors shall spawn child deal slots for specialized sub-contractors or suppliers within an authorized budget limit.
* **REQ-CHN-03 (Fulfillment Isolation):** Each slot within a chain shall operate with independent status tracking and isolated escrow release upon slot completion.

---

## 4. Business Rules, Revenue Model & Agent Incentive Architecture

### 4.1 Commission Structure & Platform Revenue
* **REQ-REV-01 (Standard Split):** Default completed deal revenue shall split as **75% Servicer Owner / 10% Agent / 15% Platform**.
* **REQ-REV-02 (Three-Tier Sliding Scale):** Platform commission shall apply a tiered rate based on deal size:
  * Micro-deals (< ₱200): ₱10 flat fee.
  * Mid-tier deals (₱200 – ₱2,000): 8% commission (capped at ₱150).
  * High-tier deals (> ₱2,000): 6% commission (capped at ₱500).
* **REQ-REV-03 (Cash Handling Rate):** Cash-settled transactions mediated by platform dispute protection shall incur a 12% fee structure to cover risk buffer and agent handling.

### 4.2 Human Agent Progression & Incentives
* **REQ-AGT-01 (Agent Tier Ladder):** Agents shall progress through performance tiers based on active managed merchants and low dispute rates:
  * **Bronze:** Baseline entry (10% commission share).
  * **Silver:** 10+ active merchants, 3-month retention (11–12% commission share + Featured Badge).
  * **Gold:** 50+ active merchants, <2% dispute rate (13–15% commission share + priority regional expansion).
  * **Platinum:** Top volume percentile (Maximum commission share + peer mentorship referral bonus).
* **REQ-AGT-02 (Agent Graduation Bonus):** When an agent successfully assists an offline business owner in adopting independent smartphone app usage, the agent shall receive a one-time **Graduation Bonus equal to 3× the owner's average monthly platform commission**.
* **REQ-AGT-03 (DOLE Labor Compliance Shield):** Agent incentives shall remain strictly outcome-based and performance-driven. The platform shall never prescribe agent work hours, mandatory schedules, or operational methods, preserving independent contractor status under Philippine labor law.

---

## 5. 3-Lane Regulatory & Compliance Architecture (D30 Alignment)

To comply with BIR Revenue Regulations No. 16-2023 and the BMBE Act without discouraging micro-servicer onboarding, Serbizyu shall enforce a **3-Lane Formalization Ladder**:

```
+-----------------------------------------------------------------------------------+
| LANE 1: UNREGISTERED / INFORMAL                                                    |
| - Requirement: Basic Phone + Government ID / Barangay Clearance                   |
| - Capability: Standard listing, cash/digital transactions, capped monthly payout  |
| - Framing: Default starting point for all new micro-servicers                     |
+-----------------------------------------------------------------------------------+
                                        | (Reaches Payout Cap Threshold)
                                        v
+-----------------------------------------------------------------------------------+
| LANE 2: SWORN DECLARATION TIER (< P250,000 / year)                                |
| - Requirement: 2-minute digital Sworn Declaration under BIR RR 16-2023           |
| - Capability: Full digital payouts, NO 1% withholding tax deducted                |
| - Framing: "Keep 100% of your earnings" (savings lever, not tax filing)            |
+-----------------------------------------------------------------------------------+
                                        | (Exceeds P500,000 / year Gross Remittances)
                                        v
+-----------------------------------------------------------------------------------+
| LANE 3: REGISTERED / BIR FORM 2303 TIER                                           |
| - Requirement: Certificate of Registration (Form 2303) + BMBE Certificate         |
| - Capability: Unlimited payouts, "Business Verified" badge, priority ranking      |
| - Framing: Top-tier search placement, lower platform commission fees              |
+-----------------------------------------------------------------------------------+
```

---

## 6. Financial Integrity, Escrow & Risk Guardrails

### 6.1 Cloud Truth Boundary
* **REQ-TRU-01:** Real money digital balances, escrow holds, and split disbursements shall be governed **exclusively by the cloud backend infrastructure and payment gateway (Xendit)**. Client-side caches or local mobile databases shall have zero authority to disburse or move digital funds.
* **REQ-TRU-02 (Air-Gapped Offline Rule):** Any transaction executed while offline (`navigator.onLine === false`) **MUST default strictly to Physical External Cash settlement**. Digital escrow cannot be validated or disbursed offline.

### 6.2 Double-Entry Escrow Ledger & Protection Rules
* **REQ-ESC-01:** All financial transactions (digital and cash) shall be recorded in an immutable double-entry ledger maintaining **0% balance drift** across pending, escrow-held, disbursed, and disputed states.
* **REQ-ESC-02 (Shopee-Style Guarantee):** Escrow funds shall be held until buyer job sign-off, with a **3-day auto-release buffer** if no dispute is opened.
* **REQ-ESC-03 (Fulfiller Personal Liability Shield):** In Deal-Chaining, if a lead contractor creates sub-deals exceeding the authorized budget pool while offline, the excess amount **CANNOT be charged to the Primary Buyer**. Upon cloud sync, the excess shall convert into a direct personal debt against the lead contractor.

---

## 7. Discovery, Recommendation & Accessibility Requirements

### 7.1 Geospatial Discovery & Cold-Start Balancing
* **REQ-DIS-01 (Barangay Proximity):** Listings and search results shall be filtered by municipal barangay boundaries to prioritize local providers.
* **REQ-DIS-02 ($\epsilon$-Greedy Cold-Start Balancing):** Recommendation engine shall allocate **80% of search impressions to top Bayesian-rated providers** and **20% to newly onboarded providers** ($\le 5$ completed jobs) to ensure fair market entry for new micro-servicers.

### 7.2 Low-Bandwidth & Offline Transport Channels (L0–L4)
* **REQ-ACC-01 (L0 Online):** Full-featured responsive web and PWA interface over 4G/5G/Wi-Fi.
* **REQ-ACC-02 (L1 SMS Gate):** Feature-phone owners shall receive SMS notifications and approve actions via shortcodes (`APPROVE <OTP>`, `ACCEPT <CODE>`).
* **REQ-ACC-03 (L2 Merchant Kiosks):** Shared Android tablets at local sari-sari stores shall provide cash deposit and QR receipt printing services.
* **REQ-ACC-04 (L3 PWA Offline Sync):** Mobile app shall cache catalog data locally for offline browsing and queue offline actions to flush automatically upon network connection.
* **REQ-ACC-05 (L4 Paper Audit Trail):** Physical paper receipts mediated by agents for non-digital users.

---

## 8. Non-Functional Requirements (NFR) & Quality SLAs

| Metric ID | Quality Area | Target SLA / Requirement | Measurement / Verification |
|---|---|---|---|
| **NFR-01** | System Latency | < 50ms average backend response time on single node | API performance benchmark |
| **NFR-02** | Quick Deal Speed | < 2 minutes total creation to dual confirmation | Field user testing trial |
| **NFR-03** | Financial Precision | 0% balance drift in double-entry escrow ledger | Automated accounting test suite |
| **NFR-04** | SMS Reliability | < 10s OTP delivery time on local cellular networks | SMS gateway log monitoring |
| **NFR-05** | Offline Resilience | 100% catalog browsing availability offline | Flight-mode PWA audit |
| **NFR-06** | Dispute Resolution | > 90% of user disputes resolved within 4-hour SLA | Admin dashboard timer metrics |

---

## 9. Academic Scope Boundaries & Traceability Matrix

### 9.1 Academic Boundary & Out-of-Scope Rules
* **In-Scope:** Tagudin & Candon City pilot deployment, 50+ active test listings across 28 categories, full 4 commerce primitives, 3-Lane formalization, double-entry escrow ledger.
* **Out-of-Scope:** Geographic expansion outside Tagudin/Candon during course timeline, paid commercial filings (SEC corporate registration, BSP MSB/OPS formal license fees), custom hardware manufacturing.

### 9.2 SMART Objectives Traceability Matrix

| SMART Objective | Target Benchmark | PRD Requirements Mapping |
|---|---|---|
| **Obj 1: Market Liquidity** | 50+ active providers, ≥40% agent-onboarded, Liquidity Ratio ≥2.0 | REQ-CAT-01, REQ-BID-03, REQ-REV-01, REQ-AGT-01, REQ-DIS-02 |
| **Obj 2: Operational Velocity** | Quick Deal <2 min, Server Latency <50ms | REQ-QDL-01, REQ-QDL-02, REQ-QDL-03, NFR-01, NFR-02 |
| **Obj 3: Financial & Dispute Safety** | 0% ledger drift, >90% disputes resolved in <4 hrs | REQ-TRU-01, REQ-ESC-01, REQ-ESC-02, NFR-03, NFR-06 |
| **Obj 4: Frictionless Formalization** | 100% providers classified in 3-Lane Ladder | Section 5 (3-Lane Ladder), REQ-AGT-02 (Graduation) |

---
*End of Phase 2 Product Requirements Document.*
