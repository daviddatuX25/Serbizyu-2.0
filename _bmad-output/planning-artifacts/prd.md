# Serbizyu 2.0 — Product Requirements Document (PRD)

> **BMAD Method Phase 2 Artifact: Planning & Scoping**  
> *Document Version:* 2.1.0 (Comprehensive Master Edition)  
> *Date:* July 25, 2026  
> *Authors:* David Datu N. Sarmiento, Christine M. Lopez, Jaypee G. Pagaduan, Prince John Vidaña (BSIT 4B, CCSIT 215)  
> *Project Target:* Tagudin & Candon City, Ilocos Sur, Philippines  

---

## 1. Executive Summary & Strategic Intent

**Serbizyu** is an inclusive, two-sided marketplace and financial trust infrastructure purpose-built for Philippine provincial economies. Unlike Metro Manila-centric service apps optimized for smartphone-native users, Serbizyu bridges the provincial digital divide where ~70% of micro-entrepreneurs operate informally and rely on feature phones or intermittent cellular data.

### Core Value Propositions
1. **Inclusive Human Agent Network (Delegated Access):** Non-digital-literate micro-entrepreneurs list and manage their services via local human agents using SMS-based consent (`APPROVE <OTP>`), retaining full ownership while leveraging local youth agents.
2. **Invisible Formalization Ladder (3-Lane Compliance):** Converts intimidating government tax compliance (BIR RR 16-2023, BMBE Act) into gamified earnings incentives ("keep 100% of your payout via Sworn Declaration"), eliminating upfront registration drop-off.
3. **Double-Entry Escrow & Financial Protection:** Adapts e-commerce escrow (Shopee Guarantee) to physical services, local products, and digital deliverables, supporting both digital payments (Xendit) and dual-confirmed cash transactions.
4. **Full Transaction Suite (4 Primitives):** Direct Offers, Reverse Bidding (Post & Bid), Face-to-Face Quick Deals (QR-initiated), and Multi-Slot Deal-Chaining.
5. **L0–L4 Hybrid Offline Transport Architecture:** Guarantees transaction completion across 5 transport channels (WebSockets, SMS, Merchant Kiosks, PWA Sync, Paper Audit Trail).

---

## 2. System Axioms & Truth Boundaries

### 2.1 The Cloud Truth Boundary (Financial Guardrail)
* **Real Money & Escrow Integrity:** Real digital money balances, escrow holds, and split payouts reside **exclusively in the cloud infrastructure** (PostgreSQL 16 Primary Database + Xendit Gateway).
* **Non-Authoritative Client State:** Local client databases (IndexedDB / Dexie.js), session tokens, and local cache representations are **strictly non-authoritative** for digital balance movements. Client caches cannot confirm, disburse, or move digital funds.
* **Offline Settlement Enclosure (External Cash Only):** When a transaction is executed air-gapped without an active cloud link (`navigator.onLine === false`), the settlement layer **MUST default strictly to Physical External Cash** (face-to-face physical currency exchange).
* **Provisional Intent Logging:** If parties initiate a digital escrow transaction while offline, the system writes a **Provisional Intent Record**. No digital funds move on the server until both nodes synchronize with the cloud backend and the server validates account balances and cryptographic signatures.

### 2.2 Feature Availability Matrix across L0–L4 Transport Layers

| Interface / Feature | L0: Online App Mode | L1: SMS Gate Mode | L2: Kiosk Mode | L3/L4: Air-Gapped Offline Mode |
|---|---|---|---|---|
| **Catalog Browsing** | Live Search & H3 Discovery | Keyword Shortcodes (`SEARCH AIRCON`) | Kiosk Cache | Pre-cached Dexie.js Catalog |
| **Quick Deal Negotiation** | WebSockets (Reverb) | SMS Crockford Tokens | Printed QR Receipt | **Air-Gapped Optical QR Handshake** |
| **Deal Chaining Execution** | Live Cloud DAG Graph | SMS Relay Chaining | Agent Kiosk Relay | **Local Cryptographic Envelope Tree** |
| **Payment Settlement** | Digital Wallet / GCash / Escrow | Agent Escrow Hold | Cash / Kiosk Voucher | **Physical External Cash Only** |
| **Dispute Filing** | Live Dispute Ticket | SMS `DISPUTE <ID>` | Kiosk Agent Log | Local Queue (Flushes upon Sync) |

---

## 3. Stakeholder Matrix & User Personas

| Persona ID | Archetype | Tech Literacy | Primary Pain Point | Platform Goal |
|---|---|---|---|---|
| **PER-01** | **Provincial Buyer** (Maria) | High (Smartphone/PWA) | Unreliable providers, price haggling, zero dispute protection | Verified local providers, fixed/transparent quotes, escrow safety |
| **PER-02** | **Offline Micro-Servicer** (Tatay Ben, Plumber/Carpenter) | Low (Feature Phone / SMS) | Excluded by app-only platforms, fears BIR tax penalties | Work through local agent via SMS OTP; earn more without smartphone hassle |
| **PER-03** | **Tech-Savvy Servicer** (Ate Grace, AC Technician) | Medium (Smartphone/PWA) | Facebook Marketplace policy bans service listings; unorganized Messenger chats | Direct booking calendar, verified reviews, formal quotes & bidding |
| **PER-04** | **Human Agent** (Kevin, Community Youth) | High (Smartphone/App) | Seeking gig income in provincial town | Earn 10% commission managing offline listings; receive 3× monthly bonus when owner graduates |
| **PER-05** | **Kiosk / Sari-Sari Partner** (Nanay Cora) | Medium (Basic App/QR) | Needs foot traffic and extra revenue | Serve as local cash-in/cash-out touchpoint and QR Quick Deal station |
| **PER-06** | **Platform Ops / Admin** (Project Team) | High (Admin Dashboard) | Manual dispute triage, audit compliance, fraud risk | Automated double-entry ledger audits, 4-hr dispute SLA dashboard, 3-Lane formalization tracking |

---

## 4. 3-Lane Formalization & Regulatory Architecture (D30 Alignment)

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
* **Outcome-Based Incentives Only:** Agent commission tiers (Bronze 10%, Silver 11–12%, Gold 13–15%, Platinum top band + referral bonus) are strictly tied to volume and dispute-free ratings.
* **No Schedule/Method Control:** Agents and servicers set their own hours and methods. Serbizyu provides peer mentorship referral bonuses, never managerial oversight.

---

## 5. Functional Requirements (FR)

### FR-1: Catalog & Classification (28 Categories, 8 Tiers, 10 Archetypes)
* **FR-1.1:** System shall support 28 predefined service and product categories across 8 tiers (Home Repairs, Beauty & Wellness, Transport, Agricultural Labor, Education/Tutoring, Events & Catering, Digital Services, Local Goods).
* **FR-1.2:** Each category shall specify regulatory licensure requirements (e.g., PRC license flag for Electrician/Engineer, TESDA certification flag for Welding).
* **FR-1.3:** System shall support 10 fulfillment archetypes (Single Visit, Multi-Slot Event, Recurring Retainer, On-Demand Dispatch, Delivery & Pick-up, Digital Deliverable, Kiosk Counter Pickup, Field Agritech Labor, Emergency Assist, Quick Deal Handshake).

### FR-2: Direct Offer & Booking Engine
* **FR-2.1:** Servicers/Agents shall post structured listings with fixed or tiered pricing, service radius, and available time slots.
* **FR-2.2:** Buyers can search, filter by distance/rating/verification tier, and book directly into escrow.

### FR-3: Reverse Bidding Engine (Buyer Request & Provider Quotes)
* **FR-3.1:** Buyers can post custom job or product requests specifying budget, location, target date, and media attachments.
* **FR-3.2:** Eligible local providers receive notifications and submit competitive bids (price, completion timeline, scope details).
* **FR-3.3:** System shall track and optimize Provider Liquidity Ratio (targeting ≥ 2.0 bids per request).

### FR-4: Face-to-Face Quick Deal Engine & Optical QR Transport
* **FR-4.1:** Impromptu transactions can be initiated on-site by scanning a seller/servicer's static or dynamic QR code.
* **FR-4.2 (Optical Stream):** Transmits complete transaction envelopes (up to 1.5 KB payload compressed to 600 Bytes via gzip) over optical camera links using **Fountain Codes / RaptorQ symbol splitting** looping at 3–5 FPS. Receiving camera reconstructs payload from any $N$ unique symbols out of $N+K$ total parity frames.
* **FR-4.3:** Supports maximum 3 rounds of on-screen price/scope counter-negotiation (circuit breaker).
* **FR-4.4:** Transaction locks upon Dual Confirmation (Buyer App Scan/Confirm + Servicer App tap or SMS OTP reply `ACCEPT <CODE>`).

### FR-5: Multi-Slot Deal-Chaining Engine & DAG Budget Trees
* **FR-5.1:** Buyers creating complex events (e.g., weddings, fiesta catering) can build a single Deal Container holding multiple product/service slots represented as a **Tree Directed Acyclic Graph (DAG)**.
* **FR-5.2 (Topology Models):** Supports Vertical Parent-Child delegation chains and Horizontal Peer Grouping (co-contractors/co-buyers).
* **FR-5.3 (Fulfiller Liability Shield):** Sub-contractors cannot overdraw parent budget pools. If a Lead Contractor spawns sub-deals exceeding the authorized pool while offline, the excess amount **CANNOT be charged to the Primary Buyer**. Upon cloud sync, server converts overage into direct personal debt against the Lead Contractor:
  $$\text{Liability}_{\text{Lead}} = \max\left(0, \, \sum \text{Sub-Deals} - \text{Authorized Budget}_{\text{Root}}\right)$$
* **FR-5.4 (Cryptographic Envelope):** On-device ECDSA (P-256 curve) signing via Web Crypto API with SHA-256 parent node hashes and `UNIQUE(nonce)` replay protection.

### FR-6: Human Agent Network (Delegated Access)
* **FR-6.1:** Agents can create and manage listings on behalf of non-digital business owners.
* **FR-6.2:** All critical actions (booking acceptance, price change, payout withdrawal) require Owner consent via SMS OTP (`APPROVE <OTP>`).
* **FR-6.3:** Commission engine automatically splits completed deal revenue: **75% Servicer Owner / 10% Agent / 15% Platform** (default tier).
* **FR-6.4:** Platform fee operates on a Three-Tier Sliding Scale: ₱10 flat for micro-deals (<₱200), 8% capped at ₱150 for mid-tier, 6% capped at ₱500 for high-tier. Cash transactions incur a 12% cash-handling rate (includes dispute safety buffer).
* **FR-6.5:** Agent Tier progression (Bronze 10% → Silver 11–12% → Gold 13–15% → Platinum top band) based on active managed owners and dispute rates (<2%).
* **FR-6.6 (Graduation Bonus):** When an agent transitions an offline owner to independent smartphone usage, the agent receives a one-time bonus of 3× the owner's average monthly platform commission.

### FR-7: Geospatial Discovery & Recommendation Engine
* **FR-7.1 (Uber H3 Indexing):** Maps locations to Uber H3 Resolution 8 cells (~0.73 km² area, ~0.5 km edge length) matching municipal barangay service areas. Nearby lookups use $O(1)$ integer $k$-ring array operations (`H3::kRing($centerCell, 2)`).
* **FR-7.2 ($\epsilon$-Greedy Cold-Start Recommendation):** Allocates 80% of impressions to top Bayesian-rated providers ($\text{Exploit}$) and 20% ($\epsilon=0.20$) to newly onboarded local workers with $\le 5$ completed jobs ($\text{Explore}$).
* **FR-7.3 (Weighted Bayesian Rating):** Prevents rating distortion for new providers:
  $$WR = \frac{v}{v+m} \cdot R + \frac{m}{v+m} \cdot C$$
  where $v = \text{total reviews}$, $m = 5$ (threshold), $R = \text{provider avg rating}$, $C = 4.60$ (platform mean).

### FR-8: Triple-Tier Hybrid AI Engine
* **FR-8.1 (Tier 1):** Regex / SQL rule lookup ($0 cost) for category mapping and standard FAQs.
* **FR-8.2 (Tier 2):** On-device FastEmbed SLM ($0 API cost) for local Ilocano/Tagalog dialect intent parsing (*"mabaho aircon"*) into structured service tags.
* **FR-8.3 (Tier 3):** OpenRouter API proxy + Redis 24h Prompt Cache for complex dispute triage or agent voice processing. All output requires mandatory human approval before execution.

### FR-9: Double-Entry Escrow & Financial Ledger
* **FR-9.1:** All funds (digital via Xendit gateway, cash via agent/kiosk touchpoint) are tracked in an immutable double-entry accounting ledger (`ledger_entries`).
* **FR-9.2:** Ledger must maintain **0% balance drift** across pending, held (escrow), released, and disputed accounts.
* **FR-9.3 (Transactional Outbox Pattern):** Writes booking changes and `outbox_events` in the same PostgreSQL ACID transaction to prevent desynchronization with Redis queues during connectivity drops.
* **FR-9.4:** Implements Shopee-style 3-day auto-release buffer after job sign-off unless a dispute is flagged.

### FR-10: Dispute Resolution & Evidence System
* **FR-10.1:** Either party can open a dispute prior to escrow release by submitting evidence (photos, GPS timestamps, chat/SMS logs).
* **FR-10.2:** Admin dashboard presents dispute evidence with a **4-hour standard SLA** target for resolution (refund, partial split, or full release).

---

## 6. Production Database Schemas (DDL Specifications)

### 6.1 PostgreSQL 16 + PostGIS Core DDL
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Transactional Outbox Table
CREATE TABLE outbox_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at) WHERE processed_at IS NULL;

-- Immutable Double-Entry Financial Ledger Table
CREATE TABLE ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id UUID NOT NULL,
    booking_id UUID NULL,
    tree_node_id UUID NULL,
    amount NUMERIC(12, 2) NOT NULL, -- Positive = Credit, Negative = Debit
    entry_type VARCHAR(50) NOT NULL, -- 'ESCROW_HOLD', 'SERVICER_PAYOUT', 'COMMISSION_FEE'
    reference_code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ledger_wallet ON ledger_entries (wallet_id, created_at DESC);

-- Servicer Spatial Directory Table (H3 + PostGIS)
CREATE TABLE servicers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    h3_index BIGINT NOT NULL, -- Uber H3 Resolution 8 cell ID
    location GEOMETRY(Point, 4326) NOT NULL,
    verification_tier INT NOT NULL DEFAULT 1,
    bayesian_rating NUMERIC(3, 2) DEFAULT 4.50,
    completed_jobs INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_servicers_h3 ON servicers (h3_index) WHERE is_active = TRUE;
CREATE INDEX idx_servicers_gis ON servicers USING GIST (location);

-- Hierarchical Budget Tree & Chaining Table
CREATE TABLE budget_tree_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL,
    parent_node_hash VARCHAR(64) NULL,
    node_type VARCHAR(30) NOT NULL DEFAULT 'VERTICAL_CHILD',
    settlement_mode VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL_CASH',
    root_buyer_id UUID NOT NULL,
    issuer_id UUID NOT NULL,
    counterparty_id UUID NOT NULL,
    authorized_budget NUMERIC(12, 2) NOT NULL,
    transaction_amount NUMERIC(12, 2) NOT NULL,
    nonce VARCHAR(64) UNIQUE NOT NULL,
    state VARCHAR(30) NOT NULL DEFAULT 'PROVISIONAL_PENDING_SYNC',
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tree_nodes_parent ON budget_tree_nodes (parent_node_hash);
```

### 6.2 Client Dexie.js / IndexedDB Schema
```typescript
import Dexie from 'dexie';

export const db = new Dexie('SerbizyuOfflineDB');
db.version(1).stores({
    cached_listings: 'id, title, category_id, price, seller_id, h3_index',
    public_keys: 'user_id, public_key_pem',
    tree_nodes: 'node_id, tree_id, parent_node_hash, node_type, settlement_mode, status, created_at',
    sync_outbox: 'id, status, created_at, retry_count'
});
```

---

## 7. Non-Functional Requirements (NFR) & Technical SLAs

| Metric ID | Parameter | Target Requirement | Verification Method |
|---|---|---|---|
| **NFR-01** | System Latency | < 50ms response latency on single self-hosted node | Benchmark API load testing |
| **NFR-02** | Quick Deal Velocity | < 2 minutes total creation to dual confirmation | Stopwatch trial in field testing |
| **NFR-03** | Optical QR Scan Rate | Reconstruct 1.5KB payload in < 200ms at 3–5 FPS | Viewfinder camera trial |
| **NFR-04** | Financial Precision | 0% balance drift in double-entry ledger | Automated reconciliation unit tests |
| **NFR-05** | SMS Delivery | < 10s OTP delivery over local cellular networks | SMS gateway logging |
| **NFR-06** | Offline Resilience | Service catalog browseable offline via PWA cache | Flight-mode PWA testing |
| **NFR-07** | Dispute Resolution | > 90% disputes resolved within 4-hour SLA | Admin dashboard timer audit |

---

## 8. Academic Scope Fence & Constraints (Tagudin Baseline)

### In-Scope (12-Week Production Prototype)
* Tagudin & Candon City, Ilocos Sur pilot deployment.
* Monolithic web/PWA application + PostgreSQL + Redis + WebSocket backend.
* Dual digital (Xendit Sandbox/Production API) + cash payment workflows.
* SMS Gateway integration (Semaphore API) for OTP & delegated owner authorization.
* 50+ active test listings across 28 service/product categories.

### Out-of-Scope (Academic Boundary)
* Geographic expansion beyond Tagudin/Candon during course timeline.
* Commercial paid filings (SEC corporate registration, BSP MSB/OPS formal license applications).
* Custom hardware manufacturing (standard smartphones, feature phones, and printed QR cards suffice).

---

## 9. Traceability Matrix (SMART Objectives to PRD Requirements)

| SMART Objective | Target Metric | PRD Requirements |
|---|---|---|
| **Obj 1: Market Onboarding** | 50+ providers, ≥40% agent onboarded, Liquidity Ratio ≥2.0 | FR-1, FR-3 (Reverse Bidding), FR-6 (Agent Network), FR-7 ($\epsilon$-Greedy) |
| **Obj 2: Operational Velocity** | Quick Deal <2 min, Server Latency <50ms | FR-4 (Quick Deal QR), NFR-01, NFR-02, NFR-03 |
| **Obj 3: Financial & Dispute Safety** | 0% ledger drift, >90% disputes resolved in <4 hrs | FR-9 (Double-Entry Ledger), FR-10 (Disputes), NFR-04, NFR-07 |
| **Obj 4: Frictionless Formalization** | 100% providers classified in 3-Lane Ladder | Section 4 (3-Lane Ladder), FR-6 (Agent Graduation) |

---
*End of Phase 2 Comprehensive Product Requirements Document.*
