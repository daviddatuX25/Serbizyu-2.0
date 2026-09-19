# Serbizyu 2.0 — Admin & Backoffice Master Architecture, Console Catalog, and Implementation Roadmap

**Document Reference:** `docs/planning-hardening/33-admin-backoffice-master-architecture-and-console-catalog.md`  
**Classification:** Canonical Master Backoffice Architecture Specification  
**Authority:** Subordinate to `ARCHITECTURE-SPINE.md` (`AD-1`–`AD-29`), Canonical Schema (58-Table Model), Rebuilt PRD (`PRD-001`–`PRD-076`), and UX Reference Dossier (`J-13`, `OPS-001`–`OPS-009`).  
**Status:** APPROVED ARCHITECTURAL SPECIFICATION & SLICE EXECUTION BLUEPRINT  

---

## 1. Executive Summary & Design System Adoption

Serbizyu 2.0's administrative subsystem is a **desktop-first, audit-governed operations and market-integrity console**. Following engineering review, the console adopts the **`laravel-shadcn-admin`** architectural standard (combining Laravel 12, Inertia.js v3, React 19, TypeScript, Tailwind CSS v4, and Shadcn UI primitives), applying the strict quality guidelines of the **`impeccable`** design system:

1. **Desktop-First Ergonomics**: Replaces consumer mobile shells with a high-density, accessible left sidebar (`<SidebarProvider>`, `<AppSidebar>`), persistent top header with breadcrumbs and global search, and high-volume data tables.
2. **Impeccable Visual Quality Floor**:
   - Zero Unicode emojis (replaced by clean, accessible, authored inline SVGs with 1.75–2px stroke).
   - No "->" or directional text arrows on buttons; controls utilize clear, actionable verbs.
   - Refined 1px specular borders; no heavy colored left-border callouts.
   - Concise, information-dense copy without conversational filler.
3. **Decoupled Aggregate Separation**:
   - The platform never conflates Order agreement, Work milestone progression, Payment obligation status, and Evidence files. Each aggregate possesses independent state machines.

---

## 2. The 37-Console Master Operational Map

The entire operational surface area of the platform is decomposed into seven specialized functional hubs across 37 concrete operational consoles:

```text
SERBIZYU OPERATIONS CONSOLE (Desktop Sidebar)
│
├── 1. Operations Hub
│   ├── [1] Triage Queue (OPS-001)                - Master priority inbox (holds, disputes, dead-letters)
│   ├── [2] Multi-Aggregate Inspector (OPS-003)   - Order vs. Work vs. Payment vs. Evidence diagnostic view
│   └── [3] Diagnostic Pause & SLA Monitor        - Manages halted jobs, customer change orders, and stalled SLAs
│
├── 2. Catalogs & Orchestration
│   ├── [4] Category Versions & Taxonomy          - Manages immutable business versions, S1-S3 safety, and data classes
│   ├── [5] Capability Profiles Studio            - Dimension matrix builder (listing_type x shape x lane x tier)
│   ├── [6] Work Contract Step Templates          - Step milestones, evidence rules, and buy-on-behalf variance thresholds
│   ├── [7] Deal-Chain DAG Archetypes             - Pre-configured multi-party coordination patterns and cycle detection
│   └── [8] Partner Extensions & Substitutions   - Merchant default delivery presets and buyer substitution rules
│
├── 3. Sourcing & Bidding
│   ├── [9] Tender Lifecycle Manager              - Open, Sealed, and Direct Invite sourcing requests
│   ├── [10] Sealed Bid Evaluation & Reveal       - Blinded bid access auditing, reveal countdown, and CAS close locks
│   └── [11] Anti-Collusion & Bayesian Dampener   - Detects circular Sybil rings and applies Bayesian rating adjustments
│
├── 4. Financials & Escrow
│   ├── [12] Release Guard Inspector (OPS-004)    - 5-guard checklist verifying work sign-off before funds release
│   ├── [13] Three-Way Reconciliation Queue       - Real-time matching: Obligation <-> Gateway Webhook <-> Ledger
│   ├── [14] General Ledger & Chart of Accounts   - Double-entry ledger browser, balance verification, and trial balances
│   ├── [15] Manual Adjustments (financial_adj)   - Compensating ledger corrections, reversals, and approved write-offs
│   └── [16] Financial Circuit Breakers          - Emergency kill switches for payment intents, releases, and webhooks
│
├── 5. Governance & Risk
│   ├── [17] Targeted Holds Console (OPS-005)     - Surgical scope freezing (obligation vs. work vs. entire order)
│   ├── [18] Dispute Mediation & Lupon Export    - Case manager and court-ready PDF dossier generator for Barangay Lupon
│   ├── [19] Masked ID & Capability Review (002)  - Least-privilege document review with PII inspection access logging
│   ├── [20] Safety Incidents Console (OPS-006)   - In-person incident triage, emergency contact triggers, and restrictions
│   └── [21] Maker/Checker Approval Inbox         - Dual-operator authorization quorum for high-risk platform actions
│
├── 6. Tax, Community & Partners
│   ├── [22] BIR RR 16-2023 Tax Monitor           - ₱500K gross remittance tracker, Sworn Declarations, Form 2307 certs
│   ├── [23] Agent Network & Graduation Ledger    - Manages consent grants, attribution, and 3x Graduation bonus payouts
│   └── [24] Kiosk Stations & LGU Endorsements    - Physical terminal registry, operator credentials, and barangay pacts
│
└── 7. System & Telemetry
    ├── [25] Capability Activation Matrix         - Multi-dimensional rollout engine (environment x geography x profile)
    ├── [26] Outbox Dead-Letter & Replay (007)    - Transactional outbox monitor with idempotent replay execution
    ├── [27] Inbox Sequence Gap Monitor           - Ordered consumer gap detector for out-of-order asynchronous messages
    ├── [28] Capacity Hoarding & Squat Locks      - 15-min reservation TTL monitor and manual slot lock release
    ├── [29] Evidence Quarantine & Legal Locks    - Malware scanning pipeline and dispute retention freeze overrides
    ├── [30] Geospatial H3 & Barangay Manager     - Uber H3 hex cluster mapping and municipal geofence enforcement
    ├── [31] Realtime Reverb & WebSocket Monitor  - Active socket counts, channel throughput, and broadcast health
    ├── [32] Meilisearch Sync & Ilocano Lexicon   - Search index latency, re-index triggers, and localized vocabulary
    ├── [33] Carrier SMS Telemetry & Manual OTP   - Semaphore credit burn, carrier delivery rates, and manual OTP fallback
    ├── [34] API Clients & SSRF Webhook Egress    - Service principal management and outbound webhook IP filtering
    ├── [35] Audit Events Ledger Explorer         - Searchable append-only audit trail across all platform entities
    ├── [36] Disaster Recovery & Restore (OPS-009)- Verification of disposable restore rehearsals and backup checksums
    └── [37] Program Gate Scorecard (OPS-008)     - Tracks G0-G6 release gates with strict evidence classification
```

---

## 3. Foundational Prerequisites Status (Backend & Frontend)

To execute slices cleanly without cross-module regressions, the core runtime foundation must be in place.

### 3.1 What Is Already Migrated in the Database (58-Table Target)
- **Identity & Authorization (Batch 001)**: `users`, `user_profiles`, `role_assignments`, `identity_verifications`, `evidence_files`, `consent_grants`. Check constraint enforces `primary_access_tier IN ('L0', 'L1', 'L2', 'L3', 'L4')` where **`L4` = Admin**.
- **Product Taxonomy & Governance (Batch 002 & 002a)**: `categories`, `category_versions`, `capability_profiles`, `policy_versions`, `listings`, `listing_versions`, `listing_capacity`, `listing_capacity_reservations`, `requests`, `quotes`, `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`.
- **Order & Work Execution (Batch 003 & 004)**: `orders`, `order_parties`, `order_terms_snapshots`, `work_instances`, `work_events`, `payment_obligations`, `payment_events`, `financial_accounts`, `financial_transactions`, `financial_entries`, `financial_adjustments`, `provider_events`.
- **Trust, Safety & Measurement (Batch 005 & 006)**: `disputes`, `dispute_events`, `administrative_holds`, `support_cases`, `safety_incidents`, `reviews`, `conversations`, `messages`, `notifications`, `idempotency_keys`, `audit_events`, `outbox_messages`, `cohort_classifications`.
- **Initiative Additions (Batch 007–009)**: `inbox_messages`, `capability_activations`, `command_approvals`, `integration_clients`, `integration_credentials`.

### 3.2 What Needs to Be Stood Up for the Foundation Layer

Before delegating specific slice work to subagents, the following foundational components must be established:

```text
FOUNDATION LAYER TO SETUP:
├── 1. Backend Core (app/Modules/Operations/ & app/Http/)
│   ├── App\Http\Middleware\EnsureAdmin (Tier L4 / active 'admin' role check)
│   ├── App\Modules\Operations\Application\AdminTriageQuery
│   ├── App\Modules\Operations\Application\AdminOrderInspectionQuery
│   ├── App\Modules\Operations\Application\RecordAdministrativeHold
│   └── App\Modules\Operations\Application\ReleaseAdministrativeHold
│
├── 2. HTTP Routing (routes/web.php)
│   └── Route::prefix('admin')->middleware(['auth', EnsureAdmin::class])->group(...)
│
├── 3. Shadcn UI Desktop Primitives (resources/js/components/ui/)
│   ├── table.tsx    (TableHeader, TableBody, TableRow, TableHead, TableCell)
│   ├── sheet.tsx    (Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription)
│   └── sidebar.tsx  (SidebarProvider, Sidebar, SidebarContent, SidebarMenu, etc.)
│
└── 4. Desktop Admin Layout Shell (resources/js/layouts/)
    └── AdminLayout.tsx (AppSidebar, Topbar Header, Breadcrumbs, Cohort Glider, User Menu)
```

---

## 4. Agent-Focused Work Slice Roadmap

Once the foundation layer (Middleware, Routes, Shadcn Layout Shell, and UI Primitives) is active, development proceeds in **independent, parallelizable agent work slices**:

### Slice A — Core Operations & Triage (Epic E6-S1 / OPS-001, OPS-003, OPS-005)
- **Owner Focus**: The primary operator daily workflow.
- **Components**: `Pages/Admin/Triage.tsx`, `Pages/Admin/OrderInspector.tsx`, `Pages/Admin/HoldSheet.tsx`.
- **Backend Query**: `AdminTriageController`, `AdminInspectorController`, `AdminHoldController`.
- **Key Invariants**: Multi-aggregate isolation (Order $\neq$ Work $\neq$ Payment $\neq$ Evidence); targeted hold placement with mandatory reason class.

### Slice B — Catalogs, Taxonomy & Capability Profiles (AD-11 / PRD-061–062)
- **Owner Focus**: Business version authoring, category lifecycles, and capability profiles.
- **Components**: `Pages/Admin/Categories/Index.tsx`, `Pages/Admin/CapabilityProfiles/Index.tsx`.
- **Backend Services**: `GovernedCatalogService`, `CategoryVersionService`, `CapabilityProfileStudio`.

### Slice C — Financial Integrity, Reconciliation & Escrow Release (AD-17 / PRD-040, PRD-070)
- **Owner Focus**: Ledger balance, release guard diagnostics, and circuit breakers.
- **Components**: `Pages/Admin/Financials/Reconciliation.tsx`, `Pages/Admin/Financials/ReleaseValidator.tsx`.
- **Backend Services**: `ThreeWayReconciliationService`, `FinancialAdjustmentService`, `KillSwitchService`.

### Slice D — Governance, Risk & Lupon Legal Dossier (PRD-048, PRD-050, PRD-073)
- **Owner Focus**: Dispute resolution, physical safety incident response, and court-ready PDF exports.
- **Components**: `Pages/Admin/Disputes/Index.tsx`, `Pages/Admin/Safety/Index.tsx`, `Pages/Admin/Approvals/Index.tsx`.
- **Backend Services**: `DisputeResolutionService`, `NotarizedLuponDossierExport`, `CommandApprovalQuorum`.

### Slice E — System Reliability, Outbox & Telemetry (PRD-054, PRD-068, PRD-072)
- **Owner Focus**: Asynchronous event health, dead-letter recovery, and restore rehearsals.
- **Components**: `Pages/Admin/System/Outbox.tsx`, `Pages/Admin/System/InboxGaps.tsx`, `Pages/Admin/System/Scorecard.tsx`.
- **Backend Services**: `OutboxReplayService`, `InboxSequenceInspector`, `RestoreRehearsalTelemetry`.

---

## 5. Architectural Verification & Acceptance Criteria

Every administrative view and command must satisfy these architectural rules before completion:
1. **Deny-by-Default Authorization**: Non-L4 users accessing `/admin/*` receive an immediate 403 Forbidden or redirect to sign-in.
2. **Maker/Checker Quorum**: Commands involving financial movements, account suspensions, or live capability promotions cannot be self-authorized by the initiator.
3. **Zero History Erasure**: Reversals, releases, and corrections write append-only records to `audit_events` and `financial_adjustments`.
4. **Revenue Transparency (PRD-059)**: All financial dashboards distinguish custodial digital balances from non-custodial External Cash turnover.
