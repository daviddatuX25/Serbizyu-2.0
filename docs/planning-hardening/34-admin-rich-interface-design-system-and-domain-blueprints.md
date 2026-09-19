# Serbizyu 2.0 — Admin Rich Interface Design System, Domain Blueprints, and UX Architecture

**Document Reference:** `docs/planning-hardening/34-admin-rich-interface-design-system-and-domain-blueprints.md`  
**Classification:** Canonical Master Design System & Backoffice UX Architecture  
**Authority:** Subordinate to `ARCHITECTURE-SPINE.md` (`AD-1`–`AD-29`), Canonical Schema (58-Table Model), Rebuilt PRD (`PRD-001`–`PRD-076`), and UX Reference Dossier (`J-13`, `OPS-001`–`OPS-009`).  
**Status:** APPROVED DESIGN SYSTEM SPECIFICATION & FRONTEND IMPLEMENTATION BLUEPRINT  

---

## 1. Design Thinking Philosophy & Core Operating Axioms

The Serbizyu administrative interface is designed for high-stakes operational clarity in a provincial municipal marketplace. Operators in Tagudin oversee physical trades, multi-vendor deliveries, informal micro-servicers, and community agents. The design philosophy adheres to four foundational axioms:

### 1.1 UI Minimalism Through Earned Familiarity (`impeccable` Standard)
- **The tool recedes into the task**: Unnecessary decorative chrome, bloated marketing illustrations, conversational AI filler text, and visual clutter are prohibited.
- **Zero Emojis**: Every indicator and control utilizes clean, accessible, authored inline SVGs with a consistent 1.75–2px stroke weight from the Lucide library.
- **Actionable Precision**: Buttons never contain directional arrows (no "->", "-->"). Controls use direct, unambiguous action verbs (`Inspect Order`, `Resolve Hold`, `Replay Event`, `Review Evidence`, `Export Lupon Dossier`).
- **Refined Surface Physics**: 1px subtle specular borders (`rgba(255,255,255,0.08)` in dark, `#e2e8f0` in light). Heavy colored left-borders on cards or callouts are banned.
- **Dual-Theme Parity**: Seamless toggling between **Executive Command Dark** (`#090d16` canvas, `#0f172a` cards, emerald accents) and **Crisp Slate Light** (`#f8fafc` canvas, `#ffffff` cards, deep slate text), persisted in local storage.

### 1.2 The Three Operating Altitudes
Operators navigate through a clear cognitive hierarchy:
1. **Altitude 1: The Executive Cockpit (Daily Urgent Inbox)**: "What requires immediate human intervention today?" (Triage Queue `OPS-001`, active targeted holds, open disputes, failed outbox tasks).
2. **Altitude 2: Domain Master Registries (Searchable Truth)**: "What is the complete status of all entities in a given domain?" (High-density data tables for all Orders, all Listings, all Tenders, all Accounts).
3. **Altitude 3: Platform Blueprint Studios (Admin-Authored Engines)**: "How does commerce execute across the municipality?" (Work Catalog step templates, Deal-Chain DAG archetypes, Category versions, Capability profiles).

### 1.3 Multi-Aggregate Separation Invariant
The user interface strictly maintains separation between four commercial truths:
$$\text{Order Contract} \neq \text{Work Execution} \neq \text{Payment Obligation} \neq \text{Evidence Proof}$$
An order is never generically labeled "Completed" if work is done but payment attestation remains unacknowledged or on hold.

---

## 2. Uniform Functional Patterns Across All Domains

To ensure effortless learnability and muscle memory, every domain console adheres to five uniform layout and interaction standards:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIFORM DOMAIN CONSOLE LAYOUT                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. UNIFORM HEADER                                                                                │
│    [=] Breadcrumbs / Domain Title      [ Search input (Cmd+K) ]   [ Cohort Switcher ] [Sun/Moon] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. UNIFORM GRAPHIC KPI ROW (4 Cards with Vector Micro-Charts & Live Beacons)                     │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│    │ Metric A     │   │ Metric B     │   │ Metric C     │   │ Metric D     │                     │
│    │ [Sparkline]  │   │ [Split Bar]  │   │ [Pulse Bar]  │   │ [Donut Ring] │                     │
│    └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. UNIFORM FILTER & CONTROL TOOLBAR                                                              │
│    [ Status Tabs: All | Active | On Hold | Completed ]   [ Filter Dropdown ]   [ Action Button ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. UNIFORM HIGH-DENSITY DATA TABLE                                                               │
│    [Check] Priority | Reference | Entity | Counterparties | Amount | Context | SLA | Actions     │
│    Row clicks drill down into Deep Inspector; Action buttons trigger surgical sheets.            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. UNIFORM SLIDE-OVER ACTION SHEET (Right-side 440px Drawer with Backdrop Blur)                  │
│    Surgical scope selection, mandatory reason class, justification textarea, confirm action.     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Graphic Metric & Vector Chart Language
To replace flat "pure words" text cards with visual aliveness without external chart library bloat:
- **Pulsing Beacons**: Animated CSS ping beacons indicating real-time activity (amber for holds, red for disputes, purple for outbox, emerald for healthy).
- **Segmented Distribution Tracks**: Dual/tri-color horizontal tracks visualizing ratio breakdowns (e.g. `50% Payment / 50% Work`, `67% Cash / 33% Scope`).
- **SVG Vector Sparklines**: Lightweight inline SVG paths displaying 7-day volume trends with gradient fill and terminal coordinate dots.
- **Circular Progress Rings (Donut Gauges)**: Compact SVG circular meters displaying percentage completion (e.g. `75% Verified`).
- **Heartbeat Rhythm Bars**: Animated pulse lines indicating background worker telemetry and retry countdowns.

---

## 3. Domain-by-Domain Interface Blueprints

### Domain 1: Executive Cockpit (`OPS-001`)
- **Triage Queue**: Surfaces only actionable P1/P2/P3 items across holds, disputes, dead-letters, and unverified credentials.
- **PRD-059 Revenue Integrity Guarantee**: Clear disclosure stating External Cash volume is non-custodial (₱0.00 platform escrow).
- **Diagnostic Pause & SLA Monitor**: Tracks jobs paused for weather or site discoveries with customer change order timers.

### Domain 2: Orders & Fulfillment Operations
- **Orders Master Index (`/admin/orders`)**:
  - Filter tabs: `All`, `Active`, `On Hold`, `Completed`, `Disputed`.
  - Filters: Work Shape (`A1`, `A3`, `A4`, `A9`), Payment Lane (`Cash`, `Proof`, `Tiwala`).
  - Columns: Reference ID, Work Shape Badge, Counterparty Avatars, Amount, Status, SLA, Actions.
- **Diagnostic Order Inspector (`OPS-003`)**:
  - Horizontal **Live Work Execution Pipeline**: Step 1 (Disassembly ✓), Step 2 (Replacement in progress with 65% bar), Step 3 (Amperage Load Test gated).
  - Parallel decoupled cards for Order Agreement, Work Execution, and Payment Obligation.
  - Chronological 5-event immutable audit timeline from `audit_events`.

### Domain 3: Provider Listings & Sourcing Tenders
- **Provider Listings Inventory (`/admin/listings`)**:
  - Inventory of published listings, drafts, and paused capacity.
  - Columns: Title, Provider, Category Family, Work Shape, Base Fee, Capacity Slots (e.g. `2/3 available`), Moderation Status.
- **Sourcing Tenders & Reverse Bidding (`/admin/tenders`)**:
  - Tenders by mode: `open_tender`, `sealed_tender`, `direct_invite`.
  - Sealed reveal window countdown, blinded bid access audit log, and anti-collusion ring indicators.

### Domain 4: Accounts, Community Agents & Verification (`OPS-002`)
- **Accounts Directory (`/admin/users`)**:
  - Access tier filters: `L0` Feature Phone, `L1` Assisted Kiosk, `L2` Low Data, `L3` Online, `L4` Admin.
  - Verification state: Unverified, Barangay Endorsement, Form 2303 Registered.
- **Community Agent Network & Consent Grants**:
  - Active owner consent grants, delegation scopes, and 3x Commission Graduation Bonus authorizations.
- **Masked ID Review Console**:
  - Least-privilege document review with PII masking and mandatory reason logging on full unredaction.

### Domain 5: Platform Blueprint Studios (Admin-Authored)
- **Work Catalog Studio (`/admin/catalogs/work`)**:
  - Visual milestone editor for `A1 Linear Project`, `A3 Appointment`, `A4 Physical Handoff`, and `A9 Digital Delivery`.
  - Step evidence rules and purchase-on-behalf variance thresholds ($\pm 10\%$).
- **Deal Chain DAG Studio (`/admin/catalogs/deal-chains`)**:
  - Node/edge archetype builder (e.g. `MATERIAL_COURIER_LABOR`).
  - Dependency wait gate connectors (`blocks` triggers) with acyclic cycle validation.
- **Taxonomy & Capability Profiles Matrix (`/admin/catalogs/taxonomy`)**:
  - Category versions with S1–S3 safety classes and capability profile dimension matrices.

### Domain 6: Financials, Escrow & Governance
- **Payments & Escrow Releases (`/admin/financials`)**:
  - **5-Guard Release Validator (`OPS-004`)**: Verified work completion, sign-off window passed, zero active disputes, zero holds, reconciled ledger.
  - **Three-Way Reconciliation Queue**: Matches `payment_obligations` $\leftrightarrow$ `provider_events` $\leftrightarrow$ `financial_entries`.
  - **General Ledger**: Chart of accounts browser (asset, liability, control accounts) with balanced debit/credit checks.
- **Targeted Holds & Dispute Mediation (`OPS-005`)**:
  - Granular scope selector: `Payment Obligation Only`, `Work Instance Only`, `Entire Order`.
  - Reason classification check constraint (`dispute`, `fraud`, `safety`, `legal`, `provider`, `operational`).
  - **Barangay Lupon Legal Dossier Export**: Court-ready PDF dossier generator for formal Katarungang Pambarangay arbitration.
- **Tax Compliance (BIR RR 16-2023)**:
  - ₱500K annual gross remittance ceiling tracker, Sworn Declarations, and BIR Form 2307 certificates.
- **Maker/Checker Approval Quorum (`command_approvals`)**:
  - Dual-operator authorization for high-risk financial disbursements and account suspensions.

### Domain 7: System Engine & Telemetry
- **Outbox Dead-Letter Queue (`OPS-007`)**:
  - Inspection of failed asynchronous messages with safe, idempotent replay execution.
- **Ordered Consumer Inbox Gap Monitor (`inbox_messages`)**:
  - Sequence gap detector for out-of-order asynchronous delivery.
- **Capacity Reservation Squat Inspector (`listing_capacity_reservations`)**:
  - 15-minute reservation TTL monitor and manual slot lock release.
- **Audit Events Ledger Explorer (`audit_events`)**:
  - Searchable append-only audit trail across all platform mutations.

---

## 4. Master Navigation Structure

```text
SERBIZYU OPERATIONS CONSOLE (Sidebar)
│
├── Overview
│   ├── Triage Queue (OPS-001)                [4 active items]
│   └── Diagnostic Pause & SLA Monitor        [Halted jobs tracker]
│
├── Marketplace Operations
│   ├── Orders & Work (Index)                 [Master orders registry]
│   ├── Sourcing Tenders & Quotes             [Reverse bidding & sealed tenders]
│   ├── Provider Listings                     [Inventory & capacity buckets]
│   └── Accounts & Community Agents           [L0-L4 users, agents, ID review]
│
├── Platform Blueprints
│   ├── Work Catalog Studio                   [A1, A3, A4, A9 step templates]
│   ├── Deal Chain DAG Studio                 [Multi-vendor archetypes & wait gates]
│   └── Taxonomy & Capability Profiles        [Category versions & profile matrices]
│
├── Financials & Governance
│   ├── Payments & Escrow Releases (OPS-004)  [5-guard release & 3-way reconciliation]
│   ├── Targeted Holds & Disputes (OPS-005)   [Surgical holds & Lupon legal export]
│   ├── Tax Compliance (BIR RR 16-2023)       [₱500K remittance cap & 2307 certs]
│   └── Maker/Checker Quorum Inbox            [Dual-operator approval inbox]
│
└── System Engine & Telemetry
    ├── Outbox Dead-Letter & Replay (OPS-007) [Asynchronous task replay]
    ├── Inbox Sequence Gap Monitor            [Out-of-order message monitor]
    ├── Capacity Reservation Locks            [15-min reservation TTL monitor]
    └── Audit Events Ledger                   [Append-only chronological log]
```
