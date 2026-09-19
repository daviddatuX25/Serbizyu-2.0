# Architectural Synthesis & Master Engineering Review: Work, Orders, and Bids

**Role:** Chief System Architect & Principal QA Engineer  
**Document Classification:** Definitive Engineering Directive & Implementation Roadmap  
**Subordinate Artifacts:** Specs 21, 22, 23, and 24 (`docs/planning-hardening/`)  

---

## 1. System Spine: End-to-End Unified Lifecycle

The Serbizyu 2.0 transaction spine preserves bilateral legal liability while accommodating multi-provider fulfillment chains. The system establishes a strict separation between **Planning/Coordination**, **Contract Formation**, **Execution Facts**, and **Settlement Realization**.

```
[ Request / Tender ]
       │
       ▼
[ Sourcing Pipeline ] ──► (Public | Sealed | Direct Invite)
       │
       ▼
[ Bid / Proposal Lineage ] (v1 -> v2 counteroffers; rooted in Listings or Capability Profiles)
       │
       ▼
[ Deal-Chain Assembly ] ──► Need 1: Goods (Merchant)
                            Need 2: Delivery (Courier)
                            Need 3: Assembly (Technician)
       │
       ▼
══════════════════════════════════════════════════════════════════════════
 ATOMIC CONTRACT FINALIZATION BOUNDARY (Single Engine Command)
 - Verify immutable term hashes (SHA-256)
 - Assert capacity slots & profile validation
 - Write Canonical Records in ONE PostgreSQL Transaction:
   ├── Deal Chain state -> ACTIVE
   ├── Freeze Proposal Lineage (ACCEPTED)
   ├── Generate Child Orders: ORD-101, ORD-102, ORD-103
   ├── Generate Work Instances: WRK-101, WRK-102, WRK-103
   ├── Generate Payment Obligations: POL-101, POL-102, POL-103
   └── Write Transactional Outbox Intents (Payment Auth, Telemetry)
══════════════════════════════════════════════════════════════════════════
       │
       ▼
[ Decentralized Execution & Staggered Settlement ]
 (No pooled escrow balance; independent bilateral payment lanes & dispute domains)
```

### 1.1 Sourcing and Tender Initiation
A citizen publishes a `requests` row designated by `tender_mode`:
* `open_tender`: Publicly discoverable by verified providers matching service category and geo-fencing requirements.
* `sealed_tender`: Visible to eligible providers; bids are blinded via application access-control barriers (masking unit rates, proposal narratives, and competitor identities) until the tender phase shifts to `evaluation_window`.
* `direct_invite`: Visible only through explicit `request_invitations` bindings.

### 1.2 In-Chat Bargaining and Proposal Lineages
Bargaining does not mutate active database states via unstructured chat text. Counteroffers follow a deterministic lineage:
* A bid is a structured record in the `quotes`/`proposals` table referencing `request_id`.
* Revisions create an immutable successor proposal pointing back via `parent_proposal_id`, with a monotonically incremented `lineage_version`.
* When a party modifies terms in a negotiation chat, the client invokes `POST /api/v1/proposals/:id/counter`, creating version $N+1$ in a `PENDING_REVIEW` state. Older versions transition to `SUPERSEDED`.
* The chat thread references the `proposal_version_id` hash. Text messages are conversational context; only the referenced proposal model carries legal authority.

### 1.3 Atomic Contract Finalization
When the citizen signs off on a proposal (or a multi-node Deal Chain composed of several proposals), finalization occurs inside a single database transaction via `FinalizeDealChainCommand`:
1. **Concurrency and Capacity Locks:** `SELECT ... FOR UPDATE` acquires locks on target provider capacity calendars and listing versions to confirm validity.
2. **Snapshot Persistence:** Snapshots the accepted proposal versions, calculating the exact terms hash.
3. **Atomic Child Order Materialization:** The single transaction writes:
   * Independent child `orders` rows: `ORD-101` (Merchant), `ORD-102` (Courier), `ORD-103` (Technician).
   * Corresponding `work_instances` entries: `WRK-101`, `WRK-102`, `WRK-103`.
   * Discrete `payment_obligations` entries: `POL-101`, `POL-102`, `POL-103`.
   * Outbox events for external processing (`payment.authorize_requested`, `audit.contract_finalized`).
4. **Failure Guarantee:** If any dependency fails validation (such as a provider's suspended license or an expired capacity slot), the entire transaction aborts. No partial order states are committed.

### 1.4 Staggered Settlement Without Pooled Escrow
Serbizyu explicitly rejects pooled parent escrow balances or platform-held custodial money aggregates.
* **Bilateral Independence:** `ORD-101`, `ORD-102`, and `ORD-103` maintain independent payment lifecycles. 
* **Per-Node Authorizations:** Payment methods authorize discrete amounts per child order (e.g., three distinct PSP pre-authorizations or dedicated payment intent captures partitioned by merchant ID).
* **Decoupled Capture:** Capture of `POL-101` occurs when `WRK-101` reaches its verifiable terminal success milestone, completely decoupled from whether `WRK-102` or `WRK-103` are active, stalled, or disputed.

---

## 2. Provenance Guarantee: Rooted Proposals vs. Unbounded Offers

To prevent rogue pricing, regulatory drift, and unverified platform commitments, every provider bid must be strictly rooted in an existing, verified platform artifact.

```
                  ┌─────────────────────────────────┐
                  │ PROPOSAL SUBMISSION CONTRACT    │
                  └────────────────┬────────────────┘
                                   │
             ┌─────────────────────┴─────────────────────┐
             ▼                                           ▼
  [ PATH A: Listing Sourced ]               [ PATH B: Capability Profile Sourced ]
  - listing_id                              - capability_profile_id
  - listing_version_id (Exact SHA-256)      - capability_profile_version_id
  - Provider must OWN the listing           - Provider must hold VALID activation
             │                                           │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
                    [ BOUNDARY ENFORCEMENT ENGINE ]
                    - Checks structural bounds
                    - Enforces price floors/ceilings
                    - Validates safety/credential classes
                    - Enforces allowed payment lanes
                                   │
                                   ▼
                     [ IMMUTABLE PROPOSAL VERSION ]
```

### 2.1 The Two Authorized Provenance Paths
Free-form, source-less offers are rejected by the API layer:

```typescript
type ProposalProvenance = 
  | {
      provenance_type: 'LISTING_VERSION';
      source_listing_id: UUID;
      source_listing_version_id: UUID;
    }
  | {
      provenance_type: 'CAPABILITY_PROFILE';
      source_capability_profile_id: UUID;
      source_capability_version_id: UUID;
      provider_activation_id: UUID;
    };
```

1. **Path A (Listing Sourced):** The provider links an active, published service listing (`listing_versions`). The listing's canonical owner must match the proposing provider. Base rates, service parameters, structural bounds, and categories inherit from this version.
2. **Path B (Capability Profile Sourced):** Used when responding to bespoke sourcing requests where the provider does not maintain a public listing. The provider must pin an approved system-wide `capability_profiles` business version and an active, unrevoked `provider_activations` record proving verification for that operational tier.

### 2.2 Customization Boundary & Overrides
Providers cannot rewrite contracts arbitrarily. Overrides must remain within bounded constraints:

| Proposal Attribute | Customization Rule | Bounding & Validation Logic |
|---|---|---|
| **Price / Payout** | Modifiable | Verified against listing minimum floor and maximum category ceiling. Currency must match the base profile. |
| **Deliverables / Scope** | Overridable | Must be a structural subset or direct extension of the base capability's deliverables schema. |
| **Parts & Materials** | Explicit Array | Must specify supplying party (`CUSTOMER`, `PROVIDER`, `THIRD_PARTY`). Payout components tagged explicitly. |
| **Work Specification** | Overridable Structure | Phases, checklist checkpoints, and mandatory evidence capture nodes (photos, timestamps, geostamps) must meet or exceed base safety-class requirements. |
| **Payment Lanes** | Constrained Selection | Limited to the intersection of the Citizen's requested payment rail and the Source Capability's allowed payment rails. |

---

## 3. Multi-Party Deal Chaining & Partner Attachment

Multi-provider coordination requires predictable partner binding without unbounded partner spam or non-consensual liability assignment. Serbizyu enforces an explicit operational distinction between pre-authorized automatic bindings and bespoke partner negotiations:

```
                      ┌─────────────────────────────────┐
                      │    ADD PARTNER NEED TO CHAIN    │
                      └────────────────┬────────────────┘
                                       │
                      Can partner be auto-bound?
                      - Active partnership agreement?
                      - Listing marked standard/catalog?
                      - Pricing predictable via matrix?
                      - Capacity pre-authorized?
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
                     YES                                NO
             [ STANDARD_AUTO_BIND ]             [ CUSTOM_TERMS ]
             - Zero spam pings                  - Out-of-band invitation ping
             - Immediate reservation            - Explicit acceptance required
             - Immutable terms auto-copied      - 24-hr TTL counter-window
             - Auto-included in atomic commit   - Must resolve before final commit
```

### 3.1 Mechanism Definitions
1. **`STANDARD_AUTO_BIND`:**
   * **Pre-conditions:** A formal, active partnership agreement exists between the primary provider and partner; the partner has designated a specific `listing_version` as a standardized catalog service; pricing is calculable via an agreed matrix; the partner has pre-authorized standard capacity allocations for the primary provider.
   * **Execution:** System automatically binds the partner's catalog listing into the Deal Chain as a distinct Deal Need without dispatching ad-hoc acceptance requests. Capacity reservations and terms-binding execute silently.
2. **`CUSTOM_TERMS`:**
   * **Pre-conditions:** Bespoke work, dynamic pricing outside standard matrices, non-standard delivery parameters, or absence of a formalized partner pact.
   * **Execution:** System emits a structured invitation. The proposed partner must inspect the incoming scope, adjust their proposal version if necessary, and submit an explicit `ACCEPT_INVITATION` transaction within the designated TTL window.

### 3.2 Concurrency, Expiry, and Conflict Resolution Matrix

| Scenario | State Machine Handling | Resolution & Failure Isolation |
|---|---|---|
| **Partner proposal expires before citizen accepts** | Chain state shifts from `READY` to `DEGRADED_INVALID_DEPENDENCY`. | Atomic finalization transaction halts. Citizen cannot accept until the expired node is refreshed or replaced. |
| **Partner rejects or counter-offers `CUSTOM_TERMS`** | Deal Need moves to `REJECTED` or `AMENDED`. | Primary provider receives webhook. Deal Chain cannot be checked out until renegotiation concludes. |
| **Capacity race condition on checkout** | Engine executes `SELECT FOR UPDATE` on provider capacity calendars. | If any provider's slot was claimed concurrently, the transaction rolls back with code `CAPACITY_CONFLICT`. No orders or payment obligations are written. |
| **Mid-flight listing change during negotiation** | Proposal pinned to immutable `listing_version_id`. | Edits to the underlying listing create a new version without altering the pinned ID. The active proposal remains structurally valid. |

---

## 4. The Readiness vs. Completion Invariant

A critical operational boundary is the distinction between **Readiness for Downstream Action** and **Order Completion**:

> **Non-Negotiable Invariant:**  
> `ready_for_collection`, `ready_for_handoff`, or equivalent upstream execution facts verify that handoff conditions are met. They do not complete the upstream Order or Work Instance, and they do not authorize settlement.

```
       MERCHANT (ORD-101)                 COURIER (ORD-102)                TECHNICIAN (ORD-103)
  ┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
  │ WRK-101: In-Preparation │        │ WRK-102: Dispatched     │        │ WRK-103: Scheduled      │
  └────────────┬────────────┘        └────────────┬────────────┘        └────────────┬────────────┘
               │                                  │                                  │
      (Emits Execution Fact)                      │                                  │
  "ready_for_collection"                          │                                  │
               │                                  │                                  │
               ├─────────────────────────────────►│                                  │
               │   (Unlocks Pickup Phase)         │                                  │
               │                                  │                                  │
  ┌────────────┴────────────┐        ┌────────────┴────────────┐                     │
  │ WRK-101: HANDED_OVER    │        │ WRK-102: In-Transit     │                     │
  │ Payment capture: LOCKED │        │ Payment capture: LOCKED │                     │
  └─────────────────────────┘        └────────────┬────────────┘                     │
                                                  │                                  │
                                         (Emits Execution Fact)                      │
                                           "delivered_to_site"                       │
                                                  │                                  │
                                                  ├─────────────────────────────────►│
                                                  │    (Unlocks Installation Phase)  │
                                                  │                                  │
                                     ┌────────────┴────────────┐        ┌────────────┴────────────┐
                                     │ WRK-102: COMPLETED      │        │ WRK-103: In-Execution   │
                                     │ Payment POL-102 CAPTURED│        │ Payment capture: LOCKED │
                                     └─────────────────────────┘        └─────────────────────────┘
```

### 4.1 Upstream/Downstream Interaction Pattern
1. **Fact Assertion:** The merchant (`ORD-101`) completes fabrication and moves the local work instance state to `ready_for_collection`. This transition requires proof (e.g., photo evidence of packaged goods, packaging checklist hash).
2. **State Decoupling:**
   * `ORD-101` status moves to `AWAITING_HANDOFF`. It does **not** move to `COMPLETED`.
   * `POL-101` remains in an `AUTHORIZED` state; no payout capture occurs.
3. **Downstream Unlocking:**
   * The transition of `ORD-101` to `ready_for_collection` triggers an event that satisfies the prerequisite dependency for `ORD-102` (Courier).
   * `WRK-102` transitions from `BLOCKED_ON_DEPENDENCY` to `READY_FOR_PICKUP`, authorizing courier dispatch.
4. **Physical Handoff Attestation:**
   * At physical exchange, the courier scans the merchant's cryptographically secured dynamic QR code.
   * This attestation transitions `ORD-101` to `FULFILLED_PENDING_SETTLEMENT`.
   * Settlement for `ORD-101` executes based on its own terms (e.g., immediate release upon handoff confirmation or a 24-hour dispute review hold).
   * Merchant settlement remains insulated from downline failures—such as the courier damaging items during transport or the technician failing to complete assembly.

---

## 5. QA Architecture, Adversarial Edge Cases, and Test Oracles

Implementation correctness is governed by Spec 24 validation requirements.

```
                      ADVERSARIAL ATTACK VECTOR TEST HARNESS
                                        │
    ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
    ▼                   ▼                               ▼                   ▼
[ ATTACK 1 ]        [ ATTACK 2 ]                   [ ATTACK 3 ]        [ ATTACK 4 ]
Stale Pricing       Split-Brain Rejection          Unchecked Handoff   Cascading Settlement
Race Condition      During Checkout                Forging             Contagion
    │                   │                               │                   │
    ▼                   ▼                               ▼                   ▼
Assert version hash Rollback entire child           Assert HMAC QR sign Assert sibling child
check failure       tree; zero isolated records     token validation    orders remain unblocked
```

### 5.1 Adversarial Test Suite

#### Case 1: Concurrent Counteroffer and Atomic Finalization (Race Condition)
* **Attack Profile:** A provider attempts to silently inflate pricing by dispatching an `UPDATE_PROPOSAL` transaction concurrently with a citizen's `FINALIZE_CONTRACT` call.
* **Deterministic Oracle:** The finalization transaction inspects the submitted `proposal_version_hash`. The database enforces strict snapshot isolation (`SERIALIZABLE` or `REPEATABLE READ` with explicit row-level version matching). The counteroffer updates the row's version number. The finalization engine detects a hash mismatch and aborts:
  $$\text{Expected Result:} \rightarrow \texttt{409 Conflict: PROPOSAL\_STALE\_REVISION\_DETECTED}$$

#### Case 2: Partial Child Formation Failure (Transaction Atomicity)
* **Attack Profile:** During contract checkout for a 3-node Deal Chain, `ORD-101` and `ORD-102` write successfully, but a database constraint or capacity failure aborts `ORD-103`.
* **Deterministic Oracle:** The database transaction boundary encapsulates all writes. The application must not use multi-step application-level commits. Zero records are written to `orders`, `work_instances`, or `payment_obligations`.
  $$\text{Expected Result:} \rightarrow \text{All child records rolled back; outbox contains zero emission intents.}$$

#### Case 3: Unauthorized Handoff Signal Injection
* **Attack Profile:** A courier invokes `POST /api/v1/work/:id/facts/ready_for_collection` on behalf of a merchant to force-advance a delivery route without visiting the physical store.
* **Deterministic Oracle:** The execution engine enforces strict role-based access control and authority boundaries on fact assertions:
  1. The caller's actor ID must match the assigned provider identity on `WRK-101`.
  2. Physical handoff transitions require mutual verification (e.g., an HMAC-signed one-time token presented by the merchant and scanned by the courier).
  $$\text{Expected Result:} \rightarrow \texttt{403 Forbidden: ACTOR\_LACKS\_STATE\_TRANSITION\_AUTHORITY}$$

#### Case 4: Upstream Cancellation Settlement Contagion
* **Attack Profile:** `ORD-101` (Merchant) successfully delivers goods, authenticated by handoff evidence. `ORD-103` (Technician) fails to arrive on site. The customer triggers a dispute and attempts to cancel the entire Deal Chain, withholding payment from the merchant.
* **Deterministic Oracle:** The dispute on `ORD-103` is isolated to `POL-103`. The platform rejects aggregate dispute cascades. `POL-101` proceeds through its standard settlement pipeline unaffected.
  $$\text{Expected Result:} \rightarrow \texttt{ORD-103: DISPUTED},\; \texttt{ORD-101: SETTLED},\; \texttt{Escrow Cascade: DENIED}$$

---

## 6. Implementation Readiness: Migrations, API Surface, and Execution Plan

To execute this architecture safely, the engineering team must deploy the schema migrations, API routes, and engine commands in three strictly gated phases.

### 6.1 Database Migration Batches

#### Migration 001: Tender Lifecycle & Sourcing Core
```sql
-- Migration 001: Tender modes, lineage tracking, and visibility controls
CREATE TYPE tender_mode_enum AS ENUM ('open_tender', 'sealed_tender', 'direct_invite');
CREATE TYPE proposal_status_enum AS ENUM ('draft', 'pending_review', 'superseded', 'accepted', 'rejected', 'withdrawn');

ALTER TABLE requests
  ADD COLUMN tender_mode tender_mode_enum NOT NULL DEFAULT 'open_tender',
  ADD COLUMN response_window_closes_at TIMESTAMPTZ,
  ADD COLUMN evaluation_window_closes_at TIMESTAMPTZ,
  ADD COLUMN sealed_bids_unsealed_at TIMESTAMPTZ;

ALTER TABLE quotes
  ADD COLUMN lineage_id UUID NOT NULL,
  ADD COLUMN lineage_version INT NOT NULL DEFAULT 1,
  ADD COLUMN parent_proposal_id UUID REFERENCES quotes(id),
  ADD COLUMN proposal_status proposal_status_enum NOT NULL DEFAULT 'pending_review',
  ADD COLUMN proposal_hash VARCHAR(64) NOT NULL,
  ADD CONSTRAINT uq_lineage_version UNIQUE (lineage_id, lineage_version);

CREATE INDEX idx_requests_tender_search 
  ON requests (tender_mode, status, response_window_closes_at);
```

#### Migration 002: Work Specification Customization & Provenance
```sql
-- Migration 002: Provenance pinning, custom work specifications, and bounds
CREATE TYPE provenance_type_enum AS ENUM ('LISTING_VERSION', 'CAPABILITY_PROFILE');

ALTER TABLE quotes
  ADD COLUMN provenance_type provenance_type_enum NOT NULL,
  ADD COLUMN source_listing_version_id UUID REFERENCES listing_versions(id),
  ADD COLUMN source_capability_version_id UUID,
  ADD COLUMN provider_activation_id UUID,
  ADD COLUMN custom_work_specification JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT chk_provenance_integrity CHECK (
    (provenance_type = 'LISTING_VERSION' AND source_listing_version_id IS NOT NULL AND source_capability_version_id IS NULL) OR
    (provenance_type = 'CAPABILITY_PROFILE' AND source_capability_version_id IS NOT NULL AND provider_activation_id IS NOT NULL AND source_listing_version_id IS NULL)
  );

CREATE INDEX idx_quotes_provenance_listing 
  ON quotes (source_listing_version_id) WHERE source_listing_version_id IS NOT NULL;
```

#### Migration 003: Child Orders, Deal Chains, and Independent Settlement
```sql
-- Migration 003: Deal Chain coordination, child orders, and execution tracking
CREATE TYPE deal_binding_type_enum AS ENUM ('STANDARD_AUTO_BIND', 'CUSTOM_TERMS');
CREATE TYPE work_fact_type_enum AS ENUM (
  'ready_for_collection', 'handed_over', 'in_transit', 'delivered_to_site', 'work_completed'
);

ALTER TABLE deal_needs
  ADD COLUMN binding_type deal_binding_type_enum NOT NULL DEFAULT 'CUSTOM_TERMS',
  ADD COLUMN active_child_order_id UUID,
  ADD COLUMN dependency_need_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

ALTER TABLE orders
  ADD COLUMN deal_chain_id UUID REFERENCES deal_chains(id),
  ADD COLUMN deal_need_id UUID REFERENCES deal_needs(id),
  ADD COLUMN accepted_terms_hash VARCHAR(64) NOT NULL,
  ADD CONSTRAINT uq_need_active_order UNIQUE (deal_need_id);

CREATE TABLE work_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_instance_id UUID NOT NULL REFERENCES work_instances(id),
  fact_type work_fact_type_enum NOT NULL,
  actor_id UUID NOT NULL,
  evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  asserted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_work_facts_instance ON work_facts(work_instance_id, fact_type);
```

---

### 6.2 Core API Surface

```yaml
# SOURCING & TENDER ENDPOINTS
POST /api/v1/requests/tender:
  summary: Create a public, sealed, or direct-invite sourcing tender
  body:
    tender_mode: "open_tender" | "sealed_tender" | "direct_invite"
    category_id: UUID
    scope_details: JSON
    budget_range: { min: Decimal, max: Decimal }
    response_window_closes_at: ISO8601String

GET /api/v1/tenders:
  summary: Discover active tenders (Applies sealed bid read-protection projections)

# PROPOSAL LINEAGE & BARGAINING ENDPOINTS
POST /api/v1/tenders/:id/proposals:
  summary: Submit rooted proposal (v1)
  body:
    provenance_type: "LISTING_VERSION" | "CAPABILITY_PROFILE"
    source_listing_version_id: UUID (Optional)
    source_capability_version_id: UUID (Optional)
    custom_work_specification: JSON
    price: Decimal

POST /api/v1/proposals/:id/counter:
  summary: Submit in-chat negotiation counteroffer (Generates lineage vN+1)
  body:
    parent_proposal_id: UUID
    adjusted_price: Decimal
    work_spec_overrides: JSON

# ATOMIC CONTRACT FORMATION ENDPOINTS
POST /api/v1/deal-chains/:id/finalize:
  summary: Single command to validate all pins and commit child orders atomically
  body:
    deal_chain_version_hash: String
    payment_methods:
      - need_id: UUID
        payment_lane: "CARD" | "WALLET" | "BANK_DIRECT"
        payment_token: String

# EXECUTION FACTS & SETTLEMENT ADVANCEMENT
POST /api/v1/work/:id/facts:
  summary: Assert execution progress event (e.g. ready_for_collection)
  body:
    fact_type: "ready_for_collection" | "handed_over" | "delivered_to_site"
    evidence_signature: String
    metadata: JSON
```

---

### 6.3 Final QA Sign-Off Gate

Implementation may enter production **only** after satisfying the following sign-off checks:

```
[ ] Invariant 1: Multi-Need Atomicity Guarantee
    - A transaction inserting 3 child orders, 3 work records, and 3 obligations
      must completely roll back if order #3 encounters a unique constraint violation.
    - Zero orphaned parent records; zero unlinked payments.

[ ] Invariant 2: Provenance Enforcement
    - Reject any quote creation request missing both an active listing_version_id
      and an approved capability_profile_version_id with HTTP 422 Unprocessable Entity.

[ ] Invariant 3: Lineage Hash Consistency
    - Counteroffer submissions must reject calls where parent_proposal_id does not
      match the latest lineage version, preventing branch-split races during chat negotiations.

[ ] Invariant 4: Settlement Decoupling
    - Emitting ready_for_collection on ORD-101 updates downstream dependency states in ORD-102
      without transitioning ORD-101 to COMPLETED or capturing POL-101 funds.
```

---

### 6.4 Implementation Sequencing

```
┌────────────────────────────────────────────────────────────────────────┐
│ SPRINT 1: SCHEMA MIGRATION & PROVENANCE VALIDATION                     │
│ 1. Run Migrations 001 & 002.                                           │
│ 2. Implement Provenance Guard Middleware in Proposal Submission Engine.│
│ 3. Implement Lineage Version Hash Validations.                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SPRINT 2: ATOMIC CONTRACT ENGINE & DEAL CHAIN ORCHESTRATION            │
│ 1. Run Migration 003.                                                  │
│ 2. Build `FinalizeDealChainCommand` with PostgreSQL Isolation Locks.  │
│ 3. Implement `STANDARD_AUTO_BIND` vs `CUSTOM_TERMS` state machine.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SPRINT 3: WORK EXECUTION FACTS, HANDOFF TOKENS & SETTLEMENT            │
│ 1. Implement Work Fact assertion engine & HMAC verification.           │
│ 2. Wire transactional outbox emission to Payment Intent captures.      │
│ 3. Run full Adversarial Test Matrix (Cases 1-4) in Integration Sandbox.│
└────────────────────────────────────────────────────────────────────────┘
```

This completes the architectural review and master synthesis. The technical requirements are verified structurally consistent, the transactional boundaries are tightly defined, and the execution roadmap is unblocked for implementation.