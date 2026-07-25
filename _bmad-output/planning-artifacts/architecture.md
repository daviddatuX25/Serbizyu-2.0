# Serbizyu 2.0 — System Architecture Spine & Technical Specification

> **BMAD Method Phase 3 Artifact: Architecture Spine**  
> *Document Version:* 3.0.0  
> *Date:* July 25, 2026  
> *Authors:* Winston (System Architect persona) & Engineering Lead  
> *Target System:* Serbizyu 2.0 Production & Pilot Infrastructure  

---

## 1. Executive Architecture Topology

Serbizyu 2.0 scales statelessly over a monolithic application core while retaining extreme low-bandwidth and offline resilience across provincial municipalities.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (SvelteKit / PWA)                        │
│  - Optimistic UI State Updates (<0ms perceived latency)                          │
│  - Local Offline IndexedDB Store (Dexie.js)                                      │
│  - PWA Background Sync API Daemon & Web Crypto ECDSA Engine                      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / WSS / SMS (L0–L4 Stack)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          EDGE LAYER (Cloudflare Global Edge)                     │
│  - Geo-IP & City Location Tagging (Tagudin / Candon Routing)                     │
│  - TLS Termination & DDoS Rate Limiting                                          │
│  - Static Asset Edge Caching                                                     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION ENGINE (Laravel Octane / PHP 8.3)              │
│                                                                                  │
│   ┌──────────────────────────┐  ┌──────────────────────────┐  ┌───────────────┐ │
│   │   CQRS Query Engine      │  │  Transactional Outbox    │  │ Uber H3 Geo   │ │
│   │  (Slim Hydration Reads)  │  │  (Event Dispatcher)      │  │  Search Engine│ │
│   └────────────┬─────────────┘  └────────────┬─────────────┘  └───────┬───────┘ │
└────────────────┼─────────────────────────────┼────────────────────────┼──────────┘
                 │                             │                        │
                 ▼                             ▼                        ▼
┌──────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────┐
│  PostgreSQL 16 + PostGIS     │ │       Redis Cluster       │ │ Hybrid AI Engine  │
│  - Immutable Double Ledger   │ │ - Redlock Lock (15m Cart) │ │ - FastEmbed SLM   │
│  - GIN Indexed JSONB Deltas  │ │ - Session & Queue Store   │ │ - OpenRouter LLM  │
│  - Outbox Events Queue Table │ │ - Reverb WebSockets State │ │   (24h Cache)     │
└──────────────────────────────┘ └───────────────────────────┘ └───────────────────┘
```

---

## 2. Technology Stack Rationale

| System Layer | Technology | Decision Rationale |
|---|---|---|
| **Backend Core** | Laravel 12 / PHP 8.3 (Octane) | Proven developer velocity, built-in queue system, robust database ORM, low RAM footprint on self-hosted VPS. |
| **Frontend Framework** | SvelteKit / Inertia.js (TypeScript) | Zero-API glue boilerplate, instant client state reactivity, sub-20KB JS bundle footprint critical for low-data provincial connections. |
| **Database** | PostgreSQL 16 + PostGIS | Native spatial indexing (`ST_DWithin`, GIST), JSONB GIN indexing for flexible attributes, partial indexing for active queues. |
| **Caching & Locking** | Redis (Redlock) | Atomic cart slot reservations (15-min TTL lock), prompt caching, session persistence. |
| **Realtime Messaging** | Laravel Reverb | Self-hosted WebSockets compatible with Pusher protocol; zero third-party SaaS per-connection fee. |
| **Search Engine** | Meilisearch | Lightweight, self-hosted typo-tolerant search engine optimized for local dialect service names (*"mabaho aircon"*). |
| **Payment Gateway** | Xendit (xenPlatform API) | Sub-accounts and automated split rules for marketplace payouts; insulates platform under BSP-licensed custody. |
| **SMS Gateway** | Semaphore API | Native Philippine cellular carrier delivery (Globe/Smart/DITO) for Crockford OTP confirmation tokens (`ACCEPT X7K3`). |
| **Hybrid AI** | On-Device FastEmbed + OpenRouter | Tier 1 SQL rules ($0) $\rightarrow$ Tier 2 local FastEmbed SLM ($0 API) $\rightarrow$ Tier 3 OpenRouter LLM with 24h Redis prompt caching. |

---

## 3. Production Database Architecture & DDL Schemas

### 3.1 Outbox Events Table (Transactional Outbox Pattern)
```sql
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
```

### 3.2 Immutable Double-Entry Financial Ledger
```sql
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
```

### 3.3 Servicer Spatial Directory (PostGIS + Uber H3 Index)
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

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
```

### 3.4 Hierarchical Budget Tree & Chaining Table
```sql
CREATE TABLE budget_tree_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL,
    parent_node_hash VARCHAR(64) NULL, -- SHA-256 Hash of parent envelope
    node_type VARCHAR(30) NOT NULL DEFAULT 'VERTICAL_CHILD', -- VERTICAL_CHILD | HORIZONTAL_PEER
    settlement_mode VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL_CASH', -- EXTERNAL_CASH | DIGITAL_ESCROW
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
CREATE INDEX idx_tree_lookup ON budget_tree_nodes (tree_id, state);
```

### 3.5 Client Storage Schema (Dexie.js / IndexedDB)
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

## 4. Algorithmic & Cryptographic Specifications

### 4.1 Uber H3 Geospatial Discovery Engine
Proximity lookups avoid trigonometric floating-point operations by mapping coordinates to **Uber H3 Resolution 8 cells** (~0.73 km² cell area). Proximity search executes via $O(1)$ integer array lookups:
```php
public function getNearbyServicers(float $lat, float $lng, int $kRingRadius = 2): Collection 
{
    $centerCell = H3::geoToH3($lat, $lng, 8);
    $searchCells = H3::kRing($centerCell, $kRingRadius);

    return Servicer::query()
        ->whereIn('h3_index', $searchCells)
        ->where('is_active', true)
        ->get();
}
```

### 4.2 $\epsilon$-Greedy Cold-Start Recommendation Algorithm
Prevents newly onboarded provincial providers from being buried by legacy ratings:
```php
public function getFeed(array $h3Cells): Collection 
{
    $epsilon = 0.20; // 20% exploration rate

    if ((mt_rand(1, 100) / 100) < $epsilon) {
        // EXPLORE: Show newly verified providers with <= 5 completed jobs
        return Servicer::query()
            ->whereIn('h3_index', $h3Cells)
            ->where('completed_jobs', '<=', 5)
            ->inRandomOrder()
            ->take(5)
            ->get();
    }

    // EXPLOIT: Show top Bayesian-ranked providers
    return Servicer::query()
        ->whereIn('h3_index', $h3Cells)
        ->orderByDesc('bayesian_rating')
        ->take(5)
        ->get();
}
```

### 4.3 Weighted Bayesian Rating Formula
Prevents rating distortion from low sample sizes:
$$WR = \frac{v}{v + m} \cdot R + \frac{m}{v + m} \cdot C$$
* $v = \text{total reviews for provider}$
* $m = 5 \text{ (minimum review threshold)}$
* $R = \text{provider average rating}$
* $C = 4.60 \text{ (platform mean rating across all categories)}$

### 4.4 Optical Transport QR Fountain Codes (Quick Deal)
Quick Deal envelopes (up to 1.5 KB payload) are compressed with gzip to 600 Bytes, split into RaptorQ / Fountain Code symbols with forward error correction (FEC) parity, and animated at 3–5 FPS. The receiving phone camera reconstructs the payload from any $N$ unique symbols out of $N+K$ total parity frames regardless of frame start index.

---

## 5. Architectural Decision Records (ADRs)

### ADR-001: PostgreSQL 16 + PostGIS over MySQL 8
* **Status:** Approved
* **Context:** Need native geospatial indexing for barangay cells and flexible JSONB attribute querying.
* **Decision:** Choose PostgreSQL 16 with PostGIS extension.
* **Consequences:** Provides native $O(1)$ spatial queries and partial GIN indexing; requires PostgreSQL expertise on server node.

### ADR-002: Transactional Outbox Pattern over Direct Queue Dispatch
* **Status:** Approved
* **Context:** Network drops during booking transactions could desynchronize PostgreSQL database state from Redis queue workers.
* **Decision:** Write events to an `outbox_events` table within the same ACID database transaction, then poll outbox via background supervisor daemon.
* **Consequences:** 100% event consistency guarantee; adds minor latency (<100ms) for outbox polling daemon.

### ADR-003: Double-Entry Accounting Ledger over Single Balance Column
* **Status:** Approved
* **Context:** Financial audits require 0% balance drift and immutable transaction histories.
* **Decision:** Record all funds as immutable positive (credit) and negative (debit) rows in a `ledger_entries` table. Balances are calculated by `SUM(amount)`.
* **Consequences:** Prevents race conditions and balance tampering; requires index optimization for fast aggregation queries.

---

## 6. Phase 1 Cloud Hosting & Monthly Cost Model

Single-town pilot (Tagudin / Candon, ~30 servicers, ~50 bookings/week):

| Component | Provider / Strategy | Monthly Cost |
|---|---|---|
| **VPS Node** | Laravel Forge + DigitalOcean (4GB RAM / 2 vCPU) | $24.00 / mo |
| **Database & Cache** | Self-hosted Postgres 16 + Redis + Meilisearch on DO box | $0.00 (included) |
| **Map Services** | Mapbox GL JS (Free tier: 50k map loads / 100k geocoding) | $0.00 / mo |
| **Payment Gateway** | Xendit (Per-transaction processing ~1.5–3% + ₱11) | $0.00 fixed / mo |
| **SMS Gateway** | Semaphore API (~1,000 OTPs / month) | ~$22.00 – $45.00 / mo |
| **AI Assist** | OpenRouter proxy with 24h Redis prompt cache | ~$20.00 – $50.00 / mo |
| **Domain & SSL** | Registrar + Let's Encrypt | ~$1.50 / mo |
| **Total Pilot Run Cost** | | **~$70 – $145 / mo** (₱4,000 – ₱8,200) |

---
*End of Phase 3 System Architecture Spine.*
