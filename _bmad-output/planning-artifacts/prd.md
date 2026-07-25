# Serbizyu 2.0 — Product Requirements Document (PRD)

> **BMAD Method Phase 2 Artifact: Planning & Scoping**  
> *Document Version:* 2.0.0  
> *Date:* July 25, 2026  
> *Authors:* David Datu N. Sarmiento, Christine M. Lopez, Jaypee G. Pagaduan, Prince John Vidaña (BSIT 4B, CCSIT 215)  
> *Project Target:* Tagudin & Candon City, Ilocos Sur, Philippines  

---

## 1. Executive Summary & Strategic Intent

**Serbizyu** is an inclusive, two-sided marketplace and financial trust infrastructure purpose-built for Philippine provincial municipalities. Unlike Metro Manila-centric service apps optimized for smartphone-native users, Serbizyu bridges the provincial digital divide where ~70% of micro-entrepreneurs operate informally and rely on feature phones or intermittent cellular data.

### Core Value Propositions
1. **Inclusive Human Agent Network (Delegated Access):** Non-digital-literate micro-entrepreneurs list and manage their services via local human agents using SMS-based consent, keeping full ownership while leveraging local youth agents.
2. **Invisible Formalization Ladder (3-Lane Compliance):** Converts intimidating government tax compliance (BIR RR 16-2023, BMBE Act) into gamified earnings incentives ("keep 100% of your payout via Sworn Declaration"), eliminating upfront registration drop-off.
3. **Double-Entry Escrow & Financial Protection:** Adapts e-commerce escrow (Shopee Guarantee) to physical services, local products, and digital deliverables, supporting both digital payments (Xendit) and dual-confirmed cash transactions.
4. **Full Transaction Suite:** Supports 4 distinct commerce primitives: Direct Offers, Reverse Bidding, Face-to-Face Quick Deals (QR-initiated), and Multi-Slot Deal-Chaining.

---

## 2. Stakeholder Matrix & User Personas

| Persona ID | Archetype | Tech Literacy | Primary Pain Point | Platform Goal |
|---|---|---|---|---|
| **PER-01** | **Provincial Buyer** (Maria) | High (Smartphone/PWA) | Unreliable providers, price haggling, zero dispute protection | Verified local providers, fixed/transparent quotes, escrow safety |
| **PER-02** | **Offline Micro-Servicer** (Tatay Ben, Plumber/Carpenter) | Low (Feature Phone / SMS) | Excluded by app-only platforms, fears BIR tax penalties | Work through local agent via SMS OTP; earn more without smartphone hassle |
| **PER-03** | **Tech-Savvy Servicer** (Ate Grace, AC Technician) | Medium (Smartphone/PWA) | Facebook Marketplace policy bans service listings; unorganized Messenger chats | Direct booking calendar, verified reviews, formal quotes & bidding |
| **PER-04** | **Human Agent** (Kevin, Community Youth) | High (Smartphone/App) | Seeking gig income in provincial town | Earn 10% commission managing offline listings; receive 3× monthly bonus when owner graduates |
| **PER-05** | **Kiosk / Sari-Sari Partner** (Nanay Cora) | Medium (Basic App/QR) | Needs foot traffic and extra revenue | Serve as local cash-in/cash-out touchpoint and QR Quick Deal station |
| **PER-06** | **Platform Ops / Admin** (Project Team) | High (Admin Dashboard) | Manual dispute triage, audit compliance, fraud risk | Automated double-entry ledger audits, 4-hr dispute SLA dashboard, 3-Lane formalization tracking |

---

## 3. 3-Lane Formalization & Regulatory Architecture (D30 Alignment)

To address BIR RR 16-2023 and DOLE independent contractor guidelines without triggering mass onboarding drop-off, Serbizyu enforces a **3-Lane Regulatory Ladder**:

```
+-----------------------------------------------------------------------------------+
| LANE 1: UNREGISTERED / INFORMAL                                                    |
| - Requirements: Phone + Government ID / Barangay Clearance                        |
| - Capabilities: List services, accept cash/digital, capped gross monthly payouts  |
| - Framing: Default starting point for micro-servicers                             |
+-----------------------------------------------------------------------------------+
                                        | (Crosses Payout Threshold)
                                        v
+-----------------------------------------------------------------------------------+
| LANE 2: SWORN DECLARATION TIER (< P250,000 / year)                                |
| - Requirements: 2-minute digital Sworn Declaration under BIR RR 16-2023           |
| - Capabilities: Full digital payouts, NO 1% withholding tax deducted              |
| - Framing: "Keep 100% of your earnings" (savings lever, not tax filing)            |
+-----------------------------------------------------------------------------------+
                                        | (Crosses P500,000 / year Gross Remittance)
                                        v
+-----------------------------------------------------------------------------------+
| LANE 3: REGISTERED / BIR 2303 TIER                                                |
| - Requirements: Full BIR Certificate of Registration (Form 2303) + BMBE Cert      |
| - Capabilities: Unlimited payouts, "Business Verified" badge, agent-graduation    |
| - Framing: Top-tier search ranking, lower platform commission                     |
+-----------------------------------------------------------------------------------+
```

### DOLE Independent Contractor Guardrails
* **Outcome-Based Incentives Only:** Agent commission tiers (Bronze 10%, Silver 11–12%, Gold 13–15%, Platinum top band) are strictly tied to volume and dispute-free ratings.
* **No Schedule/Method Control:** Agents and servicers set their own hours and methods. Serbizyu provides peer mentorship referral bonuses, never managerial oversight.

---

## 4. Functional Requirements (FR)

### FR-1: Catalog & Classification (28 Categories, 8 Tiers)
* **FR-1.1:** System shall support 28 predefined service and product categories across 8 tiers (Home Repairs, Beauty & Wellness, Transport, Agricultural Labor, Education/Tutoring, Events & Catering, Digital Services, Local Goods).
* **FR-1.2:** Each category shall specify regulatory licensure requirements (e.g., PRC license flag for Electrician/Engineer, TESDA certification flag for Welding).

### FR-2: Direct Offer & Booking Engine
* **FR-2.1:** Servicers/Agents shall post structured listings with fixed or tiered pricing, service radius, and available time slots.
* **FR-2.2:** Buyers can search, filter by distance/rating/verification tier, and book directly into escrow.

### FR-3: Reverse Bidding Engine (Buyer Request & Provider Quotes)
* **FR-3.1:** Buyers can post custom job or product requests specifying budget, location, target date, and media attachments.
* **FR-3.2:** Eligible local providers receive notifications and submit competitive bids (price, completion timeline, scope details).
* **FR-3.3:** System shall track and optimize Provider Liquidity Ratio (targeting ≥ 2.0 bids per request).

### FR-4: Face-to-Face Quick Deal Engine
* **FR-4.1:** Impromptu transactions can be initiated on-site by scanning a seller/servicer's static or dynamic QR code.
* **FR-4.2:** Supports maximum 3 rounds of on-screen price/scope counter-negotiation.
* **FR-4.3:** Transaction locks upon Dual Confirmation (Buyer App Scan/Confirm + Servicer App tap or SMS OTP reply `ACCEPT <CODE>`).

### FR-5: Multi-Slot Deal-Chaining Engine
* **FR-5.1:** Buyers creating complex events (e.g., weddings, fiesta catering) can build a single Deal Container holding multiple product/service slots.
* **FR-5.2:** Each slot operates with isolated fulfillment states and independent escrow release upon slot completion.
* **FR-5.3:** Total package checkout is funded via a single unified buyer payment into escrow.

### FR-6: Human Agent Network (Delegated Access)
* **FR-6.1:** Agents can create and manage listings on behalf of non-digital business owners.
* **FR-6.2:** All critical actions (booking acceptance, price change, payout withdrawal) require Owner consent via SMS OTP (`APPROVE <OTP>`).
* **FR-6.3:** Commission engine automatically splits completed deal revenue: **75% Servicer Owner / 10% Agent / 15% Platform** (default tier).
* **FR-6.4:** Agent Tier progression (Bronze → Silver → Gold → Platinum) based on active managed owners and dispute rates.
* **FR-6.5:** **Graduation Bonus:** When an agent transitions an offline owner to independent smartphone usage, the agent receives a one-time bonus of 3× the owner's average monthly platform commission.

### FR-7: Double-Entry Escrow & Financial Ledger
* **FR-7.1:** All funds (digital via Xendit gateway, cash via agent/kiosk touchpoint) are tracked in an immutable double-entry accounting ledger.
* **FR-7.2:** Ledger must maintain **0% balance drift** across pending, held (escrow), released, and disputed accounts.
* **FR-7.3:** Implements Shopee-style 3-day auto-release buffer after job sign-off unless a dispute is flagged.

### FR-8: Dispute Resolution & Evidence System
* **FR-8.1:** Either party can open a dispute prior to escrow release by submitting evidence (photos, GPS timestamps, chat/SMS logs).
* **FR-8.2:** Admin dashboard presents dispute evidence with a **4-hour standard SLA** target for resolution (refund, partial split, or full release).

---

## 5. Non-Functional Requirements (NFR) & Technical SLAs

| Metric ID | Parameter | Target Requirement | Verification Method |
|---|---|---|---|
| **NFR-01** | System Latency | < 50ms response latency on single self-hosted node | Benchmark API load testing |
| **NFR-02** | Quick Deal Velocity | < 2 minutes total creation to dual confirmation | Stopwatch trial in field testing |
| **NFR-03** | Financial Precision | 0% balance drift in double-entry ledger | Automated reconciliation unit tests |
| **NFR-04** | SMS Delivery | < 10s OTP delivery over local cellular networks | SMS gateway logging |
| **NFR-05** | Offline Resilience | Service catalog browseable offline via PWA cache | Flight-mode PWA testing |
| **NFR-06** | Dispute Resolution | > 90% disputes resolved within 4-hour SLA | Admin dashboard timer audit |

---

## 6. Academic Scope Fence & Constraints (Tagudin Baseline)

### In-Scope (12-Week Production Prototype)
* Tagudin & Candon City, Ilocos Sur pilot deployment.
* Monolithic web/PWA application + PostgreSQL + Redis + WebSocket backend.
* Dual digital (Xendit Sandbox/Production API) + cash payment workflows.
* SMS Gateway integration (Twilio / Semaphore) for OTP & delegated owner authorization.
* 50+ active test listings across 28 service/product categories.

### Out-of-Scope (Academic Boundary)
* Geographic expansion beyond Tagudin/Candon during course timeline.
* Commercial paid filings (SEC corporate registration, BSP MSB/OPS formal license applications).
* Custom hardware manufacturing (standard smartphones, feature phones, and printed QR cards suffice).

---

## 7. Traceability Matrix (SMART Objectives to PRD Requirements)

| SMART Objective | Target Metric | PRD Requirements |
|---|---|---|
| **Obj 1: Market Onboarding** | 50+ providers, ≥40% agent onboarded, Liquidity Ratio ≥2.0 | FR-1, FR-3 (Reverse Bidding), FR-6 (Agent Network) |
| **Obj 2: Operational Velocity** | Quick Deal <2 min, Server Latency <50ms | FR-4 (Quick Deal QR), NFR-01, NFR-02 |
| **Obj 3: Financial & Dispute Safety** | 0% ledger drift, >90% disputes resolved in <4 hrs | FR-7 (Double-Entry Ledger), FR-8 (Disputes), NFR-03, NFR-06 |
| **Obj 4: Frictionless Formalization** | 100% providers classified in 3-Lane Ladder | Section 3 (3-Lane Ladder), FR-6 (Agent Graduation) |

---
*End of Phase 2 Product Requirements Document.*
