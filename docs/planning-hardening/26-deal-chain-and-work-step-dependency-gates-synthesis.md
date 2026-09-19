# Master Synthesis: Deal Chain Coordination, Work Pipeline Dependency Gates, and Escrow Isolation

This document is the authoritative synthesis of the **Serbizyu 2.0 Deal Chain and Work Execution Architecture**. It reconciles, consolidates, and where necessary refutes earlier exploratory planning documents (`docs/planning-hardening/15` through `25`), binding implementation directly to the ratified invariants in `ARCHITECTURE-SPINE.md` (`AD-5`, `AD-17`, `AD-20`, `AD-21`, `AD-22`).

---

## 1. Document Authority Hierarchy & Conflict Resolution

When implementation, schema design, or API contracts conflict across documentation, the following hierarchy strictly governs:

```text
LEVEL 1: ARCHITECTURE-SPINE.md (AD-5, AD-17, AD-20, AD-21, AD-22) [RATIFIED & IMMUTABLE]
   └── LEVEL 2: FRONTEND-FIRST-SOLUTION-DESIGN.md (§8.1–§8.3) [AUTHORITATIVE PROJECTIONS]
          └── LEVEL 3: docs/planning-hardening/26-*.md (This Document) [SYNTHESIS SPECIFICATION]
                 └── LEVEL 4: docs/planning-hardening/15–25 (Historical Explorations) [SUBORDINATE]
```

### Explicit Refutation of Legacy Models in Docs 15 through 25:

| Legacy Concept (Docs 15–25) | Conflict with Modular Monolith | Authoritative Ratified Invariant (`AD-17`, `AD-20`, `AD-22`) |
| :--- | :--- | :--- |
| **Parent Escrow / Pooled Wallet** *(Docs 15, 16, 19)* | Proposed a single parent escrow holding funds for the whole chain and auto-splitting payouts. | **REFUTED & PROHIBITED.** A Deal Chain has NO bank account, wallet, or parent escrow. Each billable Need produces its own bilateral child `Order` with its own isolated `PaymentObligation`. Escrow/settlement is strictly order-scoped. |
| **50/50 Joint Liability & Cross-Provider Penalty** *(Doc 16)* | Suggested sibling providers share blame or financial loss if one provider fails. | **REFUTED.** Sibling providers are legally independent entities. A courier burning gasoline cannot have their payout confiscated because an electrician fails to arrive. |
| **Unconditional Cancellation Cascades** *(Doc 16)* | Proposed that cancellation of Node 3 automatically seizes or cancels Node 1 and Node 2. | **REFUTED.** Sibling orders remain legally isolated. Failed nodes emit `replacement_needed`; completed or in-progress siblings are settled or cancelled strictly under their own independent terms. |
| **Full `UNIQUE(deal_need_id)` on Orders** *(Doc 25 Migration 003)* | Proposed a strict unique index on `orders.deal_need_id`. | **REFUTED.** A full unique index crashes when a failed provider is replaced. Replaced with a **partial unique index**: `WHERE status NOT IN ('cancelled', 'refunded', 'disbanded')`. |
| **Abstract Archetype Labels in UI** *(Docs 18, 20)* | Displayed technical codes like "A1", "A3", "A4" directly to users. | **REFUTED.** Internal engine shapes are never user-facing. The UI renders the **live visual flow of the work** (e.g. `Diagnosis ➔ Part Sourcing ➔ Installation ➔ Test Run`). |

---

## 2. The n8n-Style Workflow Model: Macro Graph vs. Micro Work Pipeline

Serbizyu decouples high-level cross-vendor coordination from low-level internal technician execution:

```text
MACRO DEAL CHAIN (The Inter-Provider Coordination Graph)
┌────────────────────────────────────────────────────────────────────────┐
│  Need 1: Hardware Sourcing ──➔ Need 2: Courier Transit ──➔ Need 3: Labor│
└────────────────────────────────────────────────────────────────────────┘
                                      │
                         (Emits: delivered_to_site)
                                      │
                                      ▼ (Asynchronous Event Bus)
MICRO WORK PIPELINE (Kuya Ben's Internal Execution Steps)
┌────────────────────────────────────────────────────────────────────────┐
│  [ Step 1: Intake Diagnosis ]                                          │
│       │ (Executes concurrently while courier is in transit)            │
│       ▼                                                                │
│  [ Step 2: Capacitor Installation ]  ◄── [ DEPENDENCY GATE: GATED ]    │
│       │                                 (Unlocks when courier arrives) │
│       ▼                                                                │
│  [ Step 3: Amperage Load Test ]                                        │
│       │                                                                │
│       ▼                                                                │
│  [ Step 4: Digital Sign-Off ]                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### The 3 Core Execution Primitives:
1. **Parallel Fork (Concurrent Execution):**  
   Independent child orders run concurrently without waiting for a coarse order-level pipeline. When work begins, Kuya Ben can perform on-site electrical triage while Kuya Danny is riding to Tagudin Hardware.
2. **Dependency Gate (The n8n Join):**  
   Internal work steps are **not** global database nodes. Instead, cross-boundary synchronization is mediated by `work_step_dependency_gates`. A specific internal step (e.g. `install_capacitor`) remains in status `WAITING_FOR_DEPENDENCY` until all required predecessor conditions are verified.
3. **Asynchronous Unblocking via Event Outbox:**  
   The courier's completion transaction commits only his own order and writes to the transactional outbox. An asynchronous consumer validates the immutable graph version and marks the gate `unblocked`, authorizing the technician's step without cross-order database lock contention.

---

## 3. Concrete PostgreSQL Schema DDL

```sql
-- 1. Canonical Chain Archetypes (Unique Topological Graph Fingerprint)
CREATE TABLE chain_archetypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT NOT NULL UNIQUE, -- SHA-256 of canonical normalized DAG (nodes + edges)
    archetype_code TEXT NOT NULL,     -- e.g. 'MATERIAL_COURIER_LABOR'
    title TEXT NOT NULL,              -- e.g. 'All-In Parts Sourcing, Transit & Installation'
    category TEXT NOT NULL,           -- e.g. 'home_appliance'
    dag_structure JSONB NOT NULL,     -- Canonical normalized graph structure
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chain_archetypes_category ON chain_archetypes(category);

-- 2. Barangay-Scoped Proven Pairings Projection (Decoupled from Archetype Schema)
CREATE TABLE chain_proven_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archetype_id UUID NOT NULL REFERENCES chain_archetypes(id) ON DELETE CASCADE,
    barangay_code TEXT NOT NULL,       -- e.g. 'ILO_TAGUDIN_CENTRO'
    provider_ids_hash TEXT NOT NULL,   -- SHA-256 of sorted provider IDs in pairing
    provider_ids JSONB NOT NULL,       -- Array of Provider IDs in sequence
    verified_run_count INTEGER NOT NULL DEFAULT 0,
    average_satisfaction NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    total_price_minor_units BIGINT NOT NULL, -- e.g. 71000 (PHP 710.00)
    currency TEXT NOT NULL DEFAULT 'PHP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (archetype_id, barangay_code, provider_ids_hash)
);
CREATE INDEX idx_proven_pairings_lookup ON chain_proven_pairings(archetype_id, barangay_code, verified_run_count DESC);

-- 3. Work Step Dependency Gates (The Cross-Node Execution Seam)
CREATE TABLE work_step_dependency_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_instance_id UUID NOT NULL REFERENCES work_instances(id) ON DELETE RESTRICT,
    internal_step_key TEXT NOT NULL,    -- e.g. 'install_capacitor'
    deal_chain_id UUID NOT NULL,
    external_deal_need_id UUID NOT NULL,
    condition_code TEXT NOT NULL,       -- 'delivered_to_site', 'ready_for_collection'
    condition_version INTEGER NOT NULL CHECK (condition_version > 0),
    target_action_code TEXT NOT NULL,   -- 'work_step.start', 'work_step.resume'
    required BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL CHECK (status IN ('gated', 'unblocked', 'bypassed', 'revoked', 'superseded')),
    graph_version INTEGER NOT NULL CHECK (graph_version > 0),
    terms_version INTEGER NOT NULL CHECK (terms_version > 0),
    policy_version TEXT NOT NULL,
    satisfied_by_event_id UUID,
    bypass_reason TEXT,
    bypassed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    FOREIGN KEY (deal_chain_id, external_deal_need_id) 
        REFERENCES deal_needs (deal_chain_id, id) ON DELETE RESTRICT,
    CHECK (status <> 'unblocked' OR satisfied_by_event_id IS NOT NULL),
    CHECK (status <> 'bypassed' OR (bypassed_by_user_id IS NOT NULL AND bypass_reason IS NOT NULL))
);

-- Active gate index for sub-millisecond dispatch checks
CREATE UNIQUE INDEX uq_gate_active_target_source 
ON work_step_dependency_gates (work_instance_id, internal_step_key, external_deal_need_id, condition_code) 
WHERE status IN ('gated', 'unblocked');

-- 4. Partial Unique Index on Orders to Allow Replacement History (Fixes Doc 25 Trap)
CREATE UNIQUE INDEX unique_active_child_order_per_need 
ON orders (deal_need_id) 
WHERE status NOT IN ('cancelled', 'refunded', 'disbanded');
```

---

## 4. Canonical Scenario: All-In AC Repair Package & Edge Case Resolution

### Canonical Actors:
* **Buyer:** Maria S. (Barangay Centro, Tagudin)
* **Technician:** Kuya Ben Refrigeration (Labor: ₱350.00)
* **Merchant:** Tagudin Hardware & Supply (Material: ₱180.00)
* **Courier:** Kuya Danny Express (Transit: ₱80.00)

### Execution Trace:
1. **Formation (Atomic Commit):**  
   Maria confirms the package in her Picks. A single PostgreSQL transaction creates `deal_chains`, 3 child `orders`, 3 `work_instances`, 3 `payment_obligations`, and 1 `work_step_dependency_gates` row binding Ben's Step 2 to Danny's delivery.
2. **Parallel Live Execution:**  
   Kuya Ben starts Step 1 (Diagnosis) on-site. Simultaneously, Kuya Danny rides to Tagudin Hardware. At 2:15 PM, Ben completes Step 1; Step 2 enters `WAITING_FOR_DEPENDENCY`.
3. **Gate Unblocked:**  
   Kuya Danny arrives at 2:25 PM with the part, taps `[ Confirm Delivery ]`. The event bus updates the gate row to `unblocked`. Kuya Ben's phone chimes, and Step 2 activates.
4. **Completion & Review:**  
   Kuya Ben completes installation and testing. Maria submits a single 5★ review that cascades across all 3 providers and increments the Tagudin Catalog score for Recipe #CR-892.

### Edge Case Resolution Matrix:

| Edge Case | Failure Scenario | Serbizyu Engine Resolution |
| :--- | :--- | :--- |
| **Edge Case A: Heavy Rain Delay** | Courier Danny is stuck in rain for 25 mins. | Emits `DealChainNodeDisrupted(weather_delay)`. Kuya Ben's Step 2 stays parked in `WAITING_FOR_DEPENDENCY`. Automated ETA updates sent to Ben and Maria. Sibling orders are **not** penalized or cancelled. |
| **Edge Case B: Homeowner Supplies Part** | Maria says: *"Kuya, may nabili na pala akong capacitor kagabi."* | Kuya Ben taps `[ Bypass External Gate ]`. Takes photo evidence of Maria's part. Engine emits `DealChainGateBypassed`. Step 2 unblocks immediately. Hardware and Courier orders are cancelled/settled under their own independent terms. |
| **Edge Case C: Courier Drops Part in Transit** | Courier crashes or drops capacitor. | Courier order transitions to `failed` / `replacement_needed`. Kuya Ben's Step 2 stays parked. Hardware order is **not** double-charged. Buyer sources replacement courier/part without altering completed triage work. |

---

## 5. Review & Reputation Engine (Anti-Sybil Architecture)

1. **Unified Review by Default:**  
   Residents rate the completed project once (`★★★★★` + note). By default, this rating applies to all participating providers.
2. **Granular Per-Node Overrides:**  
   Unchecking the default toggle reveals individual sub-ratings (`Kuya Ben: 5★`, `Hardware: 5★`, `Kuya Danny: 3★`).
3. **Anti-Sybil & Anti-Collusion Defenses:**  
   * **Economic Value Gate:** Reviews only update the public catalog score if child orders have verified physical fulfillment and meet the minimum economic threshold for their category.
   * **Bayesian Dampening:** Catalog scores use Bayesian weighted averages ($WR = \frac{v \times R + m \times C}{v + m}$), preventing collusion micro-transactions from artificially gaming community rankings.
