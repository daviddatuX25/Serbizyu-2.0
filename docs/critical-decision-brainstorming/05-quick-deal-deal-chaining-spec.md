# **Serbizyu Unified Architectural Specification**

## **Module Engine Specification: Quick Deal & Deal Chaining Architecture**

## **1\. Core Architectural Axioms & System Truth Boundaries**

This specification defines the complete end-to-end operational, technical, cryptographic, and interface mechanics for **Quick Deal** and **Deal Chaining** within Serbizyu. All primitives adhere strictly to the foundational system axioms established across project decisions:

### **A. The Cloud Truth Boundary (Financial Guardrail)**

> * **Real Money & Escrow Integrity:** Real digital money balances, escrow holds, and split payouts reside **exclusively in the cloud infrastructure** (PostgreSQL 16 Primary Database \+ Xendit Gateway).  
> * **Non-Authoritative Client State:** Local client databases (IndexedDB / Dexie.js), session tokens, and local cache representations are **strictly non-authoritative** for digital balance movements. Client caches cannot confirm, disburse, or move digital funds.  
> * **Offline Settlement Enclosure (External Cash Only):** When a transaction is executed air-gapped without an active cloud link (navigator.onLine \=== false), the settlement layer **MUST default strictly to Physical External Cash** (face-to-face physical currency exchange).  
> * **Provisional Intent Logging:** If parties initiate a digital escrow transaction while offline, the system writes a **Provisional Intent Record**. No digital funds move on the server until both nodes synchronize with the cloud backend and the server validates account balances and cryptographic signatures.

### **B. Inclusive Feature Availability Matrix**

| Interface / Feature | Online Mode (L0) | SMS Gate Mode (L1) | Kiosk Mode (L2) | Air-Gapped Offline Mode (L3/L4) |
| :---- | :---- | :---- | :---- | :---- |
| **Catalog Browsing** | Live Search & H3 Discovery | Keyword Shortcodes (SEARCH AIRCON) | Kiosk Cache | Pre-cached Dexie.js Catalog |
| **Quick Deal Negotiation** | WebSockets (Reverb) | SMS Crockford Tokens | Printed QR Receipt | **Air-Gapped Optical QR Handshake** |
| **Deal Chaining Execution** | Live Cloud DAG Graph | SMS Relay Chaining | Agent Kiosk Relay | **Local Cryptographic Envelope Tree** |
| **Payment Settlement** | Digital Wallet / GCash / Escrow | Agent Escrow Hold | Cash / Kiosk Voucher | **Physical External Cash Only** |
| **Dispute Filing** | Live Dispute Ticket | SMS DISPUTE \<ID\> | Kiosk Agent Log | Local Queue (Flushes upon Sync) |

## **2\. Quick Deal Engine Specification**

The **Quick Deal** is an impromptu, face-to-face transaction primitive allowing buyers and sellers to discover, negotiate, and execute deals locally with sub-second responsiveness, even in zero-connectivity environments.

### **A. Optical Transport Layer: Animated QR Streaming (TXQR / Fountain Codes)**

To transmit complete transaction envelopes (catalogs, service parameters, itemized lists, cryptographic signatures) over air-gapped camera optical links without requiring high-density QR codes that fail under sunlight:  
`[ Uncompressed Payload (1.5 KB) ]`  
               `│`  
               `▼ (gzip Compression)`  
`[ Compressed Bytes (600 Bytes) ]`  
               `│`  
               `▼ (Fountain Code / RaptorQ Symbol Split)`  
`┌──────────────┬──────────────┬──────────────┬──────────────┐`  
`│ Symbol 1/4   │ Symbol 2/4   │ Symbol 3/4   │ Symbol 4/4   │`  
`│ + Parity 1   │ + Parity 2   │ + Parity 3   │ + Parity 4   │`  
`└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘`  
       `│              │              │              │`  
       `▼              ▼              ▼              ▼`  
  `[ Frame 1 ]    [ Frame 2 ]    [ Frame 3 ]    [ Frame 4 ]`  
       `└──────────────┴──────┬───────┴──────────────┘`  
                             `│`  
                             `▼ (Looping Animation @ 3–5 FPS)`  
                  `[ Viewfinder Camera Read ]`

> * **Data Frame Header (6 Bytes):** \\text{Header} \= \\{\\text{Session ID (3B)}, \\, \\text{Sequence No (1B)}, \\, \\text{Total Symbols (1B)}, \\, \\text{Parity Flag (1B)}\\}  
> * **Forward Error Correction (FEC):** Receiving cameras capture any N unique symbol frames out of N \+ K total parity frames to reconstruct the full 1.5 KB payload instantly, regardless of frame start index or motion blur.

### **B. Zero-Navigation "Continuous Camera Loop" Interface (UX Workflow)**

To minimize latency during physical price negotiation, the app avoids modal dialogs and screen navigation:  
`┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐`  
`│            BUYER PHONE               │  │           SELLER PHONE               │`  
`│ ┌──────────────────────────────────┐ │  │ ┌──────────────────────────────────┐ │`  
`│ │  LIVE CAMERA VIEWFINDER (Top)    │ │  │ │  LIVE CAMERA VIEWFINDER (Top)    │ │`  
`│ └──────────────────────────────────┘ │  │ └──────────────────────────────────┘ │`  
`│ ┌──────────────────────────────────┐ │  │ ┌──────────────────────────────────┐ │`  
`│ │  DYNAMIC CANVAS QR (Bottom)      │ │  │ │  DYNAMIC CANVAS QR (Bottom)      │ │`  
`│ └──────────────────────────────────┘ │  │ └──────────────────────────────────┘ │`  
`│ [ ₱300 Counter ] [ Quick Adjust +/-] │  │ [ ₱350 Offer ]   [ Quick Adjust +/-] │`  
`└──────────────────────────────────────┘  └──────────────────────────────────────┘`

#### **Step-by-Step Negotiation Cycle:**

> 1. **Initial Offer (Seller):** Seller selects a pre-cached listing (*Aircon Cleaning*). Bottom canvas renders **QR \#1** (Offer: ₱500, signed by Seller).  
> 2. **Scan & Counter (Buyer):** Buyer’s top camera scans QR \#1. Device gives haptic feedback and displays a step counter. Buyer taps \-₱50. Bottom canvas updates to **QR \#2** (Counter: ₱450, signed by Buyer).  
> 3. **Acceptance (Seller):** Seller’s camera scans QR \#2. Screen displays *"Buyer Countered ₱450. \[Tap to Accept\]"*. Seller taps screen.  
> 4. **Final Receipt:** Seller canvas outputs **QR \#3** (Final Acceptance Hash). Buyer camera scans QR \#3. Both phones chime and commit the sealed transaction envelope to IndexedDB (deal\_outbox) in **\<200ms**.  
> 5. **Circuit Breaker:** Negotiation counter-rounds are capped at **3 rounds max** to prevent infinite loop locks.

## **3\. Deal Chaining Engine Specification**

**Deal Chaining** enables complex multi-party and multi-stage service workflows where an initial primary transaction spawns dependent child transactions, horizontal co-contractor tasks, or material supply orders.

### **A. Directed Acyclic Graph (DAG) Structure & Topology Models**

Deal Chaining is represented cryptographically as a **Tree DAG**. Nodes can be arranged in vertical delegation chains or horizontal peer groups.  
                   `[ ROOT NODE 0: Primary Buyer A ]`  
                   `│ Authorized Budget Pool: ₱10,000`  
                   `│ Settlement: ONLINE GCash Escrow`  
                   `└───────────────────────┬───────────────────────┘`  
                                           `│`  
                                           `▼`  
                   `┌──────────────────────────────────────────────┐`  
                   `│   HORIZONTAL PEER GROUP (Same Level Nodes)   │`  
                   `├──────────────────────────────┬───────────────┤`  
                   `│  Node 1.1: Lead Contractor B │  Node 1.2: Co-Contractor C │`  
                   `│  (Sub-budget: ₱6,000)        │  (Sub-budget: ₱4,000)      │`  
                   `└──────────────┬───────────────┴───────────────┘`  
                                  `│`  
                                  `▼ (Air-Gapped QR - External Cash)`  
                   `┌──────────────────────────────┐`  
                   `│ Node 2.1: Material Vendor D  │`  
                   `│ (Draw: ₱3,500 - CASH DEALT)  │`  
                   `└──────────────────────────────┘`

#### **Supported Topology Models:**

> 1. **Vertical Delegation (Parent-Child):** General Contractor receives a root budget pool and spawns child deals for specialized sub-contractors or material suppliers.  
> 2. **Horizontal Peer Grouping (Co-Contractors / Co-Buyers):** Multiple contractors or buyers operating at the same depth level share, split, or co-authorize a parent budget envelope.  
> 3. **Joint & Conditional Execution:** Node completion can be gated by cross-node conditions (PARENT\_SETTLED, PEER\_SIGNATURE\_REQUIRED, PROOF\_OF\_WORK\_UPLOADED).

### **B. Delegated Sub-Budget Envelopes & Liability Isolation**

To prevent sub-contractors or leads from overspending or causing unapproved cost overruns for the primary buyer:

> * **Strict Upward Attribution:** Child deal nodes contain the SHA-256 cryptographic hash of the parent node (parent\_node\_hash).  
> * **Sub-Budget Enclosure:** A Lead Contractor cannot spawn child deals whose aggregate value exceeds the authorized parent budget pool: \\sum \\text{Child Node Amounts} \\le \\text{Authorized Budget}\_{\\text{Parent}}  
> * **Fulfiller Personal Liability Shield:** If a Lead Contractor spawns sub-deals exceeding the authorized pool while offline, the excess amount **CANNOT be charged to the Primary Buyer**. Upon cloud sync, the server automatically converts the overage into a direct debt against the Lead Contractor's account: \\text{Liability}\_{\\text{Lead}} \= \\max\\left(0, \\, \\sum \\text{Sub-Deals} \- \\text{Authorized Budget}\_{\\text{Root}}\\right)  
> * **Isolated Dispute Boundaries:** Disputes at a child leaf node (e.g., defective materials from Vendor D) are isolated between Contractor B and Vendor D. Primary Buyer A’s root escrow remains protected and non-arbitrated unless the primary service deliverable fails.

## **4\. Cryptographic Envelope & Interface Protocols**

Every transaction payload—whether a simple Quick Deal or a complex Chained Budget Node—is signed on-device using **ECDSA (P-256 Curve)** via the native Web Crypto API (window.crypto.subtle).

### **A. Canonical Unified Envelope JSON Schema**

`{`  
  `"v": 1,`  
  `"tree_id": "tree_candon_9918",`  
  `"node_id": "node_sub_02",`  
  `"parent_node_hash": "0x8f2a90b1c3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",`  
  `"node_type": "HORIZONTAL_PEER",`  
  `"settlement_mode": "EXTERNAL_CASH",`  
  `"root_buyer_id": "usr_buyer_101",`  
  `"issuer_id": "usr_contractor_B",`  
  `"counterparty_id": "usr_vendor_C",`  
  `"authorized_budget": 4000.00,`  
  `"transaction_amount": 2500.00,`  
  `"conditions": {`  
    `"execution_gate": "PEER_SIGNATURE_REQUIRED",`  
    `"release_trigger": "PARENT_SETTLED"`  
  `},`  
  `"nonce": "c8f9b1a0-4e12-4c8d-8a2b-1f3e5d7c9a2b",`  
  `"timestamp": 1784930400,`  
  `"expires_at": 1784934000,`  
  `"signatures": {`  
    `"issuer_sig": "MEQCID3k9L8...==",`  
    `"parent_proof_sig": "MEQCIH8a1P2...=="`  
  `}`  
`}`

### **B. Interface Contract Definitions**

#### **1\. Quick Deal Interface (IQuickDealEngine)**

> * initiateDealOffer(listingId, amount) \-\> DealPayload  
> * counterOffer(incomingPayload, newAmount) \-\> DealPayload  
> * acceptOffer(incomingPayload) \-\> SignedReceiptPayload  
> * renderOpticalStream(canvasElement, payload) \-\> void

#### **2\. Deal Chaining Interface (IDealChainEngine)**

> * createChildNode(parentNodeHash, nodeType, counterpartyId, amount, maxPool) \-\> ChainNodePayload  
> * validateSubBudgetAllowance(parentNodeId, proposedAmount) \-\> BudgetValidationResult  
> * appendPeerSignature(nodePayload, peerPrivateKey) \-\> SignedChainNodePayload  
> * resolveDAGTopologicalSort(treeId) \-\> ExecutionOrderGraph

## **5\. Production Database Schemas (DDL Specifications)**

### **A. Server Database Schema (PostgreSQL 16 \+ PostGIS)**

`-- Enables PostGIS extension for spatial directory queries`  
`CREATE EXTENSION IF NOT EXISTS postgis;`

`-- Unified Hierarchical Deal Tree & Chaining Table`  
`CREATE TABLE budget_tree_nodes (`  
    `node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `tree_id UUID NOT NULL,`  
    `parent_node_hash VARCHAR(64) NULL, -- SHA-256 Hash of parent envelope`  
    `node_type VARCHAR(30) NOT NULL DEFAULT 'VERTICAL_CHILD', -- VERTICAL_CHILD | HORIZONTAL_PEER`  
    `settlement_mode VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL_CASH', -- EXTERNAL_CASH | DIGITAL_ESCROW`  
    `root_buyer_id UUID NOT NULL,`  
    `issuer_id UUID NOT NULL,`  
    `counterparty_id UUID NOT NULL,`  
    `authorized_budget NUMERIC(12, 2) NOT NULL,`  
    `transaction_amount NUMERIC(12, 2) NOT NULL,`  
    `nonce VARCHAR(64) UNIQUE NOT NULL,`  
    `state VARCHAR(30) NOT NULL DEFAULT 'PROVISIONAL_PENDING_SYNC',`  
    `payload JSONB NOT NULL,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`CREATE INDEX idx_tree_nodes_parent ON budget_tree_nodes (parent_node_hash);`  
`CREATE INDEX idx_tree_lookup ON budget_tree_nodes (tree_id, state);`

`-- Immutable Double-Entry Ledger Table`  
`CREATE TABLE ledger_entries (`  
    `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`  
    `wallet_id UUID NOT NULL,`  
    `booking_id UUID NULL,`  
    `tree_node_id UUID NULL REFERENCES budget_tree_nodes(node_id),`  
    `amount NUMERIC(12, 2) NOT NULL, -- Positive = Credit, Negative = Debit`  
    `entry_type VARCHAR(50) NOT NULL, -- 'ESCROW_HOLD', 'SERVICER_PAYOUT', 'COMMISSION_FEE'`  
    `reference_code VARCHAR(100) UNIQUE NOT NULL,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`CREATE INDEX idx_ledger_wallet ON ledger_entries (wallet_id, created_at DESC);`

`-- Transactional Outbox Table for Asynchronous Queue Reliability`  
`CREATE TABLE outbox_events (`  
    `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`  
    `event_type VARCHAR(100) NOT NULL,`  
    `aggregate_type VARCHAR(50) NOT NULL,`  
    `aggregate_id VARCHAR(100) NOT NULL,`  
    `payload JSONB NOT NULL,`  
    `processed_at TIMESTAMP WITH TIME ZONE NULL,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at) WHERE processed_at IS NULL;`

### **B. Client Storage Schema (Dexie.js / IndexedDB)**

`import Dexie from 'dexie';`

`export const db = new Dexie('SerbizyuOfflineDB');`

`db.version(1).stores({`  
    `// Cached listing catalogs for browsing and initiating deals offline`  
    `cached_listings: 'id, title, category_id, price, seller_id, h3_index',`

    `// Pre-cached Public Keys of local users, contractors, and agents`  
    `public_keys: 'user_id, public_key_pem',`

    `// Local DAG store for Quick Deals and Chained Budget Trees`  
    `tree_nodes: 'node_id, tree_id, parent_node_hash, node_type, settlement_mode, status, created_at',`

    `// Offline Outbox Queue for Background Sync Daemon`  
    `sync_outbox: 'id, status, created_at, retry_count'`  
`});`

## **6\. End-to-End Client Engine Implementation**

This SvelteKit / TypeScript implementation handles Quick Deals, Deal Chaining, cryptographic ECDSA signatures, and local outbox queueing while strictly enforcing the Cloud Truth Boundary.  
`import { db } from './SerbizyuOfflineDB';`

`export interface CryptoKeyPairPem {`  
    `userId: string;`  
    `privateKey: CryptoKey;`  
    `publicKeyPem: string;`  
`}`

`export class SerbizyuDealEngine {`  
    `private keyPair: CryptoKeyPairPem;`

    `constructor(keyPair: CryptoKeyPairPem) {`  
        `this.keyPair = keyPair;`  
    `}`

    `/**`  
     `* Spawns a Quick Deal or Chained Budget Node in IndexedDB.`  
     `* Strictly enforces the Cloud Truth Guard for digital settlement.`  
     `*/`  
    `async createTransactionNode(params: {`  
        `treeId?: string;`  
        `parentNodeHash?: string | null;`  
        `nodeType?: 'VERTICAL_CHILD' | 'HORIZONTAL_PEER';`  
        `settlementMode?: 'EXTERNAL_CASH' | 'DIGITAL_ESCROW';`  
        `targetUserId: string;`  
        `amount: number;`  
        `maxAllowedPool: number;`  
        `conditions?: Record<string, any>;`  
    `}) {`  
        `const isOnline = navigator.onLine;`  
        `const settlementMode = params.settlementMode || 'EXTERNAL_CASH';`

        `// CLOUD TRUTH GUARD: Digital Escrow CANNOT be executed or validated offline`  
        `if (!isOnline && settlementMode === 'DIGITAL_ESCROW') {`  
            `throw new Error(`  
                `"SECURITY GUARD TRIGGERED: Digital escrow funds cannot be validated offline. " +`  
                `"Switch settlement mode to EXTERNAL_CASH or connect to mobile network."`  
            `);`  
        `}`

        `// Validate local sub-budget pool if chaining under a parent node`  
        `if (params.parentNodeHash) {`  
            `await this.validateLocalParentBudget(params.parentNodeHash, params.amount);`  
        `}`

        ``const nodeId = `node_${crypto.randomUUID()}`;``  
        `const payload: Record<string, any> = {`  
            `v: 1,`  
            ``tree_id: params.treeId || `tree_${nodeId.slice(0, 8)}`,``  
            `node_id: nodeId,`  
            `parent_node_hash: params.parentNodeHash || null,`  
            `node_type: params.nodeType || 'VERTICAL_CHILD',`  
            `settlement_mode: settlementMode,`  
            `issuer_id: this.keyPair.userId,`  
            `counterparty_id: params.targetUserId,`  
            `authorized_budget: params.maxAllowedPool,`  
            `transaction_amount: params.amount,`  
            `conditions: params.conditions || {},`  
            `nonce: crypto.randomUUID(),`  
            `timestamp: Date.now()`  
        `};`

        `// Generate ECDSA Signature`  
        `const signature = await this.signPayload(payload, this.keyPair.privateKey);`  
        `payload.signatures = { issuer_sig: signature };`

        `// Persist locally in IndexedDB Outbox`  
        `await db.tree_nodes.add({`  
            `node_id: nodeId,`  
            `tree_id: payload.tree_id,`  
            `parent_node_hash: payload.parent_node_hash,`  
            `node_type: payload.node_type,`  
            `settlement_mode: settlementMode,`  
            `transaction_amount: params.amount,`  
            `status: isOnline ? 'SYNCED_CLOUD' : 'PENDING_SYNC',`  
            `payload: payload,`  
            `created_at: Date.now()`  
        `});`

        `// Queue Service Worker Background Sync if offline`  
        `if (!isOnline && 'serviceWorker' in navigator && 'SyncManager' in window) {`  
            `const registration = await navigator.serviceWorker.ready;`  
            `await registration.sync.register('flush-deal-outbox');`  
        `}`

        `return payload;`  
    `}`

    `private async validateLocalParentBudget(parentNodeHash: string, proposedAmount: number): Promise<void> {`  
        `const parentNode = await db.tree_nodes.where('parent_node_hash').equals(parentNodeHash).first();`  
        `if (parentNode) {`  
            `const existingChildren = await db.tree_nodes.where('parent_node_hash').equals(parentNodeHash).toArray();`  
            `const totalDrawn = existingChildren.reduce((sum, n) => sum + n.transaction_amount, 0);`  
              
            `if (totalDrawn + proposedAmount > parentNode.payload.authorized_budget) {`  
                `console.warn(`  
                    `` `[BUDGET OVERFLOW] Sub-deal ₱${proposedAmount} exceeds parent pool. ` + ``  
                    `` `Excess will convert to personal direct liability on server sync.` ``  
                `);`  
            `}`  
        `}`  
    `}`

    `private async signPayload(data: Record<string, any>, privateKey: CryptoKey): Promise<string> {`  
        `const encoder = new TextEncoder();`  
        `const byteData = encoder.encode(JSON.stringify(data));`  
        `const signatureBuffer = await window.crypto.subtle.sign(`  
            `{ name: "ECDSA", hash: { name: "SHA-256" } },`  
            `privateKey,`  
            `byteData`  
        `);`  
        `return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));`  
    `}`  
`}`

## **7\. Background Sync & Network Resolution Daemon**

When a smartphone regains cellular data or Wi-Fi connectivity, the PWA Service Worker automatically flushes queued Quick Deals and Chained Budget Trees to the backend.  
`// Service Worker Implementation (sw.js)`  
`self.addEventListener('sync', (event) => {`  
    `if (event.tag === 'flush-deal-outbox') {`  
        `event.waitUntil(flushPendingDeals());`  
    `}`  
`});`

`async function flushPendingDeals() {`  
    `const pendingNodes = await db.tree_nodes.where('status').equals('PENDING_SYNC').toArray();`

    `for (const node of pendingNodes) {`  
        `try {`  
            `const response = await fetch('/api/v1/deals/sync-node', {`  
                `method: 'POST',`  
                `headers: {`   
                    `'Content-Type': 'application/json',`  
                    `'X-Serbizyu-Signature': node.payload.signatures.issuer_sig`  
                `},`  
                `body: JSON.stringify(node.payload)`  
            `});`

            `if (response.ok) {`  
                `await db.tree_nodes.update(node.node_id, { status: 'SYNCED_CLOUD' });`  
            `} else if (response.status === 422) {`  
                `// Unprocessable Entity: Nonce replay or invalid signature`  
                `await db.tree_nodes.update(node.node_id, { status: 'REJECTED_VALIDATION' });`  
            `}`  
        `} catch (err) {`  
            `console.error('[SYNC DAEMON ERROR] Network retry pending:', err);`  
            `break; // Pause loop to preserve battery and wait for stable connection`  
        `}`  
    `}`  
`}`

## **8\. Master System Verification Matrix**

> * \[x\] **Cloud Truth Guard:** Digital escrow balances and real money transfers are strictly authorized by PostgreSQL 16 and Xendit. Client caches cannot move digital funds.  
> * \[x\] **Offline Mode Rule:** Air-gapped Quick Deals & Chained Nodes are strictly restricted to **Physical External Cash Settlement**.  
> * \[x\] **Optical Transport:** Fountain Code animated QR streaming for payloads up to 1.5 KB @ 3–5 FPS.  
> * \[x\] **Zero-Navigation UX:** Split Camera/Canvas view with continuous 15 FPS scanning and haptic steppers.  
> * \[x\] **Topology Support:** Vertical parent-child delegation chains and horizontal peer co-contractor grouping.  
> * \[x\] **Fulfiller Liability Shield:** Un-delegated offline over-budget draws automatically convert to direct Fulfiller personal liability upon cloud sync.  
> * \[x\] **Cryptographic Safeguards:** ECDSA P-256 Web Crypto API signatures with UNIQUE(nonce) replay protection.  
> * \[x\] **Production Database Schemas:** Full DDL for server PostgreSQL 16 (PostGIS, Outbox, Ledger) and client Dexie.js IndexedDB.