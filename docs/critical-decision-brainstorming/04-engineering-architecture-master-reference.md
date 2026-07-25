# **Serbizyu — Engineering & Architecture Master Reference Manual**

**For BMAD Phase 3 (Solutioning) & Phase 4 (Implementation)**

## **1\. Executive System Overview & Architecture Topology**

Serbizyu is an inclusive, escrow-backed marketplace purpose-built for provincial economies. The platform scales statelessly while retaining extreme offline/low-bandwidth resilience across rural municipalities.  
`┌──────────────────────────────────────────────────────────────────────────────────┐`  
`│                            CLIENT LAYER (SvelteKit / PWA)                        │`  
`│  - Optimistic UI State Updates (<0ms perceived latency)                          │`  
`│  - Local Offline IndexedDB Store (Dexie.js)                                      │`  
`│  - PWA Background Sync API Daemon                                                │`  
`└────────────────────────────────────────┬─────────────────────────────────────────┘`  
                                         `│ HTTPS / WSS / SMS (L0–L4 Stack)`  
                                         `▼`  
`┌──────────────────────────────────────────────────────────────────────────────────┐`  
`│                          EDGE LAYER (Cloudflare Global Edge)                     │`  
`│  - Geo-IP & City Location Tagging                                                │`  
`│  - TLS Termination & DDoS Rate Limiting                                          │`  
`│  - Static Asset Edge Caching                                                     │`  
`└────────────────────────────────────────┬─────────────────────────────────────────┘`  
                                         `│`  
                                         `▼`  
`┌──────────────────────────────────────────────────────────────────────────────────┐`  
`│                       APPLICATION ENGINE (Laravel Octane / Swoole)               │`  
`│                                                                                  │`  
`│   ┌──────────────────────────┐  ┌──────────────────────────┐  ┌───────────────┐ │`  
`│   │   CQRS Query Engine      │  │  Transactional Outbox    │  │ Uber H3 Geo   │ │`  
`│   │  (Slim Hydration Reads)  │  │  (Event Dispatcher)      │  │  Search Engine│ │`  
`│   └────────────┬─────────────┘  └────────────┬─────────────┘  └───────┬───────┘ │`  
`└────────────────┼─────────────────────────────┼────────────────────────┼──────────┘`  
                 `│                             │                        │`  
                 `▼                             ▼                        ▼`  
`┌──────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────┐`  
`│  PostgreSQL 16 + PostGIS     │ │       Redis Cluster       │ │ Hybrid AI Engine  │`  
`│  - Immutable Double Ledger   │ │ - Redlock Distributed Lock│ │ - FastEmbed Local │`  
`│  - GIN Indexed JSONB Deltas  │ │ - Session & Queue Store   │ │ - OpenRouter LLM  │`  
`│  - Outbox Events Queue Table │ │ - Reverb WebSockets State │ │   (Fallback)      │`  
`└──────────────────────────────┘ └───────────────────────────┘ └───────────────────┘`

## **2\. Database Architecture (PostgreSQL 16 \+ PostGIS)**

### **Why PostgreSQL 16 \+ PostGIS**

> * **PostGIS Integration:** Provides native geospatial functions (ST\_DWithin, ST\_Contains, spatial bounding box indexing) over MySQL's basic spatial implementation.  
> * **JSONB & GIN Indexing:** Stores unstructured service attributes and offline delta payloads, indexed via Generalized Inverted Indexes (GIN) for millisecond JSON lookups.  
> * **Partial Indexing:** Slashes index RAM by focusing only on active or pending rows.

### **Key DDL Schemas**

#### **Outbox Events Table (Transactional Outbox Pattern)**

`CREATE TABLE outbox_events (`  
    `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`  
    `event_type VARCHAR(255) NOT NULL,`  
    `aggregate_type VARCHAR(100) NOT NULL,`  
    `aggregate_id VARCHAR(100) NOT NULL,`  
    `payload JSONB NOT NULL,`  
    `processed_at TIMESTAMP WITH TIME ZONE NULL,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`  
`);`

`CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at) WHERE processed_at IS NULL;`

#### **Immutable Double-Entry Financial Ledger**

`CREATE TABLE ledger_entries (`  
    `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`  
    `wallet_id UUID NOT NULL,`  
    `booking_id UUID NULL,`  
    `amount NUMERIC(12, 2) NOT NULL, -- Positive = Credit, Negative = Debit`  
    `entry_type VARCHAR(50) NOT NULL, -- 'ESCROW_HOLD', 'COMMISSION_FEE', 'PAYOUT'`  
    `reference_code VARCHAR(100) UNIQUE NOT NULL,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`  
`);`

`CREATE INDEX idx_ledger_wallet ON ledger_entries (wallet_id, created_at DESC);`

#### **Servicer Spatial Directory (PostGIS \+ H3)**

`CREATE EXTENSION IF NOT EXISTS postgis;`

`CREATE TABLE servicers (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `user_id UUID NOT NULL,`  
    `h3_index BIGINT NOT NULL, -- Uber H3 Resolution 8 cell ID`  
    `location GEOMETRY(Point, 4326) NOT NULL,`  
    `verification_tier INT NOT NULL DEFAULT 1,`  
    `bayesian_rating NUMERIC(3, 2) DEFAULT 4.50,`  
    `is_active BOOLEAN DEFAULT TRUE,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`  
`);`

`CREATE INDEX idx_servicers_h3 ON servicers (h3_index) WHERE is_active = TRUE;`  
`CREATE INDEX idx_servicers_gis ON servicers USING GIST (location);`

## **3\. Geospatial Discovery Engine (Uber H3 Indexing)**

To avoid heavy floating-point trigonometric queries across thousands of rows, locations are mapped to Uber’s **H3 Hexagonal Hierarchical Spatial Index**.

> * **Resolution 8:** \~0.73 km² area per cell (\~0.5 km edge length), matching municipal barangay service areas.  
> * **O(1) Proximity Search:** Replaces ST\_Distance calculations with integer set operations.

`use H3\H3;`

`public function getNearbyServicers(float $lat, float $lng, int $kRingRadius = 2): Collection`   
`{`  
    `// 1. Convert user coordinates to an H3 Resolution 8 index`  
    `$centerCell = H3::geoToH3($lat, $lng, 8);`

    `// 2. Expand k-Ring to capture surrounding neighborhood cells`  
    `$searchCells = H3::kRing($centerCell, $kRingRadius);`

    `// 3. Fast database integer lookup`  
    `return Servicer::query()`  
        `->whereIn('h3_index', $searchCells)`  
        `->where('is_active', true)`  
        `->get();`  
`}`

## **4\. Event-Driven Architecture & Transactional Outbox Pattern**

To prevent state desynchronization between PostgreSQL and background queue workers (Redis) during sudden drops in network connectivity:  
`[ HTTP Request ]`  
       `│`  
       `▼`  
`┌─────────────────────────────────────────────────────────────┐`  
`│              SINGLE PostgreSQL ACID TRANSACTION             │`  
`│                                                             │`  
`│  1. INSERT INTO bookings (...) VALUES (...);                │`  
`│  2. INSERT INTO outbox_events (event_type, payload) VALUES; │`  
`└──────────────────────────────┬──────────────────────────────┘`  
                               `│`  
                               `▼ (Committed)`  
`┌─────────────────────────────────────────────────────────────┐`  
`│                 OUTBOX POLING DAEMON / WORKER               │`  
`│                                                             │`  
`│  1. Read unprocessed outbox_events                          │`  
`│  2. Push job to Redis Queue                                 │`  
`│  3. UPDATE outbox_events SET processed_at = NOW()           │`  
`└─────────────────────────────────────────────────────────────┘`

`DB::transaction(function () use ($bookingData) {`  
    `$booking = Booking::create($bookingData);`

    `OutboxEvent::create([`  
        `'event_type'     => 'BookingCreated',`  
        `'aggregate_type' => 'Booking',`  
        `'aggregate_id'   => $booking->id,`  
        `'payload'        => [`  
            `'booking_id'  => $booking->id,`  
            `'customer_id' => $booking->customer_id,`  
            `'amount'      => $booking->total_amount,`  
        `],`  
    `]);`  
`});`

## **5\. Financial Accounting & Escrow State Machine**

Balances are calculated by summing immutable ledger rows rather than executing direct balance mutations (UPDATE users SET balance \= balance \+ X).  
               `┌───────────────────┐`  
               `│      CREATED      │`  
               `└─────────┬─────────┘`  
                         `│ Customer Pays (Escrow Hold Entry)`  
                         `▼`  
               `┌───────────────────┐`  
               `│    HELD_IN_ESCROW │`  
               `└─────────┬─────────┘`  
                         `│ Service Completed & Confirmed`  
                         `▼`  
               `┌───────────────────┐`  
               `│     DISBURSED     │`  
               `│ (Payout + Fee)    │`  
               `└───────────────────┘`

`public function releaseEscrow(Booking $booking): void`  
`{`  
    `DB::transaction(function () use ($booking) {`  
        `$platformFee = $booking->total_amount * 0.08; // 8% commission`  
        `$servicerPayout = $booking->total_amount - $platformFee;`

        `// 1. Debit Escrow Wallet`  
        `LedgerEntry::create([`  
            `'wallet_id'      => $booking->escrow_wallet_id,`  
            `'booking_id'     => $booking->id,`  
            `'amount'         => -$booking->total_amount,`  
            `'entry_type'     => 'ESCROW_RELEASE',`  
            `'reference_code' => "REL-{$booking->id}",`  
        `]);`

        `// 2. Credit Servicer Wallet`  
        `LedgerEntry::create([`  
            `'wallet_id'      => $booking->servicer_wallet_id,`  
            `'booking_id'     => $booking->id,`  
            `'amount'         => $servicerPayout,`  
            `'entry_type'     => 'SERVICER_PAYOUT',`  
            `'reference_code' => "PAY-{$booking->id}",`  
        `]);`

        `// 3. Credit Platform Revenue Account`  
        `LedgerEntry::create([`  
            `'wallet_id'      => config('finance.platform_wallet_id'),`  
            `'booking_id'     => $booking->id,`  
            `'amount'         => $platformFee,`  
            `'entry_type'     => 'COMMISSION_FEE',`  
            `'reference_code' => "COM-{$booking->id}",`  
        `]);`

        `$booking->update(['status' => 'DISBURSED']);`  
    `});`  
`}`

## **6\. Dynamic E-Commerce & Algorithmic Engines**

### **A. Epsilon-Greedy (\\epsilon-Greedy) Recommendation Algorithm**

Solves the provider "cold-start" problem by allocating 80% of impressions to top-rated providers and 20% to newly onboarded local workers.  
`public function getFeed(array $h3Cells): Collection`  
`{`  
    `$epsilon = 0.20; // 20% exploration rate`

    `if ((mt_rand(1, 100) / 100) < $epsilon) {`  
        `// EXPLORE: Show newly verified providers with <= 5 completed jobs`  
        `return Servicer::query()`  
            `->whereIn('h3_index', $h3Cells)`  
            `->where('completed_jobs', '<=', 5)`  
            `->inRandomOrder()`  
            `->take(5)`  
            `->get();`  
    `}`

    `// EXPLOIT: Show top Bayesian-ranked providers`  
    `return Servicer::query()`  
        `->whereIn('h3_index', $h3Cells)`  
        `->orderByDesc('bayesian_rating')`  
        `->take(5)`  
        `->get();`  
`}`

### **B. Weighted Bayesian Rating Calculation**

Prevents rating distortion from low sample sizes:  
> WR \= \\frac{v}{v \+ m} \\times R \+ \\frac{m}{v \+ m} \\times C

> * v \= Total reviews for the provider.  
> * m \= Minimum review threshold (e.g., 5).  
> * R \= Provider's average rating.  
> * C \= Platform mean rating across all categories (e.g., 4.60).

### **C. Atomic Cart Reservation (Redis Locks)**

Prevents double bookings without creating database lock contention:  
`$lockKey = "slot_reservation:{$slotId}";`  
`$acquired = Redis::set($lockKey, $userId, 'EX', 900, 'NX'); // 15-minute lock`

`if (!$acquired) {`  
    `return response()->json(['error' => 'Slot is currently being booked by another user.'], 409);`  
`}`

## **7\. Hybrid AI Topology & Low-Cost Infrastructure**

`[ User Prompt ] ──► Tier 1: Local Regex / SQL Search ($0)`  
                         `│ (Fallback on no match)`  
                         `▼`  
                    `Tier 2: On-Device FastEmbed SLM ($0 API Cost)`  
                         `│ (Fallback on low confidence)`  
                         `▼`  
                    `Tier 3: OpenRouter API Proxy + Redis Prompt Cache`

> * **Tier 1 (Regex & Rules):** Category mapping and explicit FAQ lookup.  
> * **Tier 2 (Self-Hosted SLM):** Runs ONNX / FastEmbed-PHP in memory to parse local dialect intent (*"mabaho aircon"*) into structured service tags.  
> * **Tier 3 (Cloud LLM Fallback):** Calls OpenRouter endpoints for complex disputes or agent voice processing. Responses are hashed and cached in Redis (TTL: 24h) to eliminate duplicate API costs.

## **8\. Hybrid Offline Infrastructure (L0–L4 Stack)**

Designed to guarantee transaction completion across varying degrees of provincial connectivity:

| Layer | Transport Channel | Execution Mechanism | Hardware Target |
| :---- | :---- | :---- | :---- |
| **L0** | WebSockets (Reverb) / HTTPS | Real-time app interface with optimistic UI updates. | Smartphones on 4G/5G/Wi-Fi |
| **L1** | SMS via Semaphore API | 4-character Crockford base32 confirmation tokens (ACCEPT X7K3). | Feature phones (2G/3G) |
| **L2** | Local Kiosk Terminals | Shared Android tablets at sari-sari stores printing paper QR receipts. | Local merchant kiosks |
| **L3** | PWA Background Sync | Local IndexedDB persistence via Dexie.js; auto-flushed on reconnection. | Mobile web PWA |
| **L4** | Paper Audit Trail | Ledger-stamped physical paper logs mediated by local agents. | Non-digital users |

## **9\. Regulatory Formalization Matrix (RR 16-2023 Three-Lane Strategy)**

Formalization is introduced as a feature unlock rather than a mandatory onboarding barrier:  
`[ Unregistered Lane ] ──(Exceeds ₱250K/yr)──► [ Sworn Declaration Lane ] ──(Exceeds ₱500K/yr)──► [ Registered BIR 2303 Lane ]`  
 `(Capped Volume)                               (0% Withholding Kept)                           (Full Business Tier)`

| Lane | Regulatory Posture | Platform Capabilities | Driver for Upgrade |
| :---- | :---- | :---- | :---- |
| **1\. Unregistered / Informal** | No TIN or BIR 2303 required. Default compliant state under BIR RR 16-2023 (\<₱500K/yr gross). | Standard listing, transaction processing, capped monthly payout limits. | Reaching monthly payout limit thresholds. |
| **2\. Sworn Declaration** | Files annual BIR Sworn Declaration (\<₱250K/yr total income). | Unlocked higher payout caps; exempt from 1% creditable withholding tax. | "Keep 100% of your earnings" incentive pitch. |
| **3\. Registered (BIR 2303 / BMBE)** | Full Certificate of Registration \+ BMBE exemption certificate. | Uncapped payouts, "Business Verified" trust badge, priority search ranking. | Access to featured slots and corporate/LGU booking pools. |

## **10\. Agent Network Incentive Architecture**

Independent agents act as local trust bridges without triggering DOLE employee misclassification risks. Incentives are outcome-based rather than tied to fixed schedules or process supervision.

| Tier | Qualification Threshold | Commission Rate | Contractor Risk Shield |
| :---- | :---- | :---- | :---- |
| **Bronze** | Tier-3 verification \+ first merchant onboarded. | **10%** baseline commission | ✅ Independent schedule and methods |
| **Silver** | 10 active managed merchants (3-month retention). | **11–12%** commission \+ Featured Agent Badge | ✅ Commission-based, no supervision |
| **Gold** | 50 active merchants \+ \<2% dispute rate. | **13–15%** commission \+ priority regional expansion | ✅ Performance-driven, no equipment provided |
| **Platinum** | Top percentile sustained monthly volume. | Maximum commission tier \+ referral network bonuses | ✅ Mentorship-based peer bonuses |

## **11\. Modern Frontend Architecture & UI/UX Strategies**

`┌─────────────────────────────────────────────────────────────────────────────┐`  
`│                            SVELTEKIT CLIENT APP                             │`  
`│                                                                             │`  
`│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │`  
`│  │  Optimistic Store UI  │  │ IndexedDB Sync Queue  │  │ Skeleton Shell   │ │`  
`│  │  (Instant Feedback)   │  │ (Dexie.js Offline)    │  │ (<20KB Payload)  │ │`  
`│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘ │`  
`└──────────────┼──────────────────────────┼───────────────────────┼───────────┘`  
               `│                          │                       │`  
               `▼                          ▼                       ▼`  
 `┌──────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐`  
 `│ Render Immediate Change  │ │ Background Sync Daemon│ │ Low-Data Asset Mode  │`  
 `│ (Revert on API Error)    │ │ (Flushes Payload)    │ │ (WebP / Disabled Vid)│`  
 `└──────────────────────────┘ └──────────────────────┘ └──────────────────────┘`

> 1. **Optimistic UI Execution:** Frontend Svelte stores immediately reflect completed actions (*Job Accepted*, *Payment Sent*). If the background network request fails, the state gracefully rolls back with a toast message.  
> 2. **Network-Adaptive Asset Delivery:** Detects low-bandwidth states via navigator.connection.effectiveType to toggle high-compression assets and defer non-critical scripts.  
> 3. **Voice-First Input Wrappers:** Integrated Web Speech API controls alongside input forms to assist users who prefer speaking over typing.

## **12\. BMAD Phase 3 (Solutioning) Checklist**

> * \[ \] **Database Migrations:** Run migrations for outbox\_events, ledger\_entries, servicers, and h3\_index spatial columns on PostgreSQL 16\.  
> * \[ \] **PostGIS Extension Activation:** Execute CREATE EXTENSION IF NOT EXISTS postgis; in Sprint 0 setup.  
> * \[ \] **ADR Documentation:** Document Architectural Decision Records for PostgreSQL \+ PostGIS, SvelteKit \+ Inertia, and Redis Redlock.  
> * \[ \] **Queue Worker Configuration:** Configure background supervisor daemons for processing outbox events and dispatching webhook callbacks.  
> * \[ \] **Outbox Daemon Setup:** Deploy the background worker to poll outbox\_events and forward payloads to Redis.

This document serves as the complete technical, operational, and architectural reference manual for engineering planning sessions across all phases of Serbizyu.