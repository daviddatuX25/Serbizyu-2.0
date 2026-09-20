# Serbizyu 2.0 — Master Supersession, Architecture Consolidation & Rebuild Blueprint

**Document Reference:** `docs/architecture/MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md`  
**Authority:** Principal Reviewer & Lead Systems Architect  
**Status:** CANONICAL REBUILD DIRECTIVE & GOVERNANCE CONTRACT  
**Date:** 2026-09-20  
**Supersedes:** `docs/mockup-v2/`, `old-docs/`, legacy `ProductExperience.tsx` monolith, and unhardened planning drafts.  

---

## 1. Executive Charter: The Rebuild Stance

Over the past sessions, the Serbizyu 2.0 engineering core has authored, hardened, and verified two major architectural pillars:
1. **The Non-Admin Mobile-First Core (`docs/design-kit/NON-ADMIN-SPECIFICATION.md`)**: The Creation Trinity (Service Editor, Product Editor, Request Builder), light-mode Work Execution Pipeline DAGs, Deal Chain swipeable carousel decks, and 27 responsive mobile-first surfaces.
2. **The Admin & Agent Delegation Architecture (`docs/architecture/admin-operations-workbench-architecture.md` & `35-agent-intermediary-and-capability-delegation-contract.md`)**: The Operations Console, Triage Desk, Dispute Console, Inspector, and the **OBAC (Object-Bound Actor Capabilities)** field agent delegation model.

This document acts as the **lead architect's unchallengeable consolidation blueprint**. It establishes the exact supersession register, settles the database and domain stance, unifies the non-admin and admin/agent subsystems, and locks the phased OpenSpec execution plan.

---

## 2. Master Supersession Register (Overruling Outdated Docs)

Any developer, agent, or automated process building Serbizyu 2.0 MUST adhere to the following strict supersession hierarchy. Artifacts marked **SUPERSEDED** are historical evidence only and must not be used to justify implementation choices:

| Domain / Subsystem | Former / Conflicting Artifact | Current Canonical Authority | Reason for Supersession |
| :--- | :--- | :--- | :--- |
| **Non-Admin UI & UX** | `old-docs/mockup/*.html` (39-screen HTML) & `docs/mockup-v2/` | **`docs/design-kit/NON-ADMIN-SPECIFICATION.md`** & `docs/design-kit/*.html` | Replaced by hardened hi-fi specimens with real responsive layouts, unbloated copy, light-mode DAGs, and interactive carousels. |
| **Listing Creation UX** | Flat 4-field `MyListingsWorkspace.tsx` & monolithic `ProductExperience.tsx` | **`listing-service-editor.html` & `listing-product-editor.html`** | Replaced by Guided 3-Step Mode with What's Included / Specs, Work Catalog DAG, and Deal Chain carousel deck. |
| **Request Creation UX** | Legacy `18-post-request.html` & isolated `Card 4 Flow of Work` | **`request-service-builder.html`** | Replaced by 3-step builder with simple checklist default, optional Governed Work Pipeline toggle, and Deal Chain sourcing deck. |
| **Admin Operations** | Loose admin prototypes & generic backoffice notes | **`docs/architecture/admin-operations-workbench-architecture.md`** | Complete specification of Triage, Disputes, Inspector, Holds, Financials, and Catalog studios. |
| **Agent Delegation / Acting-for** | Informal middleman notes & static RBAC role concepts | **`docs/planning-hardening/35-agent-intermediary-and-capability-delegation-contract.md`** | Formally governed by **OBAC** (Object-Bound Actor Capabilities) via Table 4.6 `consent_grants` and `ActingContext` DTOs. |
| **Database Schema** | Historical 30/31/38/39-table claims in early ADRs | **`_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`** + Batches 001–003 | Replaced by founder-approved 58-table schema (Postgres migrations `batch_001`, `batch_002`, `batch_002a`, `batch_003`). |
| **Fulfillment Shape** | Raw radio selectors for `A1, A2, A3, A4, A9` on creation forms | **Inferred Topological Metadata** | Removed from user forms. Shape is inferred automatically by `WorkShapeInferrer` from the attached Work Pipeline DAG. (`A2` removed as invalid). |

---

## 3. Database Architecture: Relational Spine + Flexible JSONB Envelopes

To prevent both database bloat and consistency bugs, Serbizyu 2.0 enforces a **Hybrid Persistence Model**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE RIGID RELATIONAL SPINE (SQL TABLES)                  │
│       Strict PostgreSQL Constraints · Foreign Keys · Idempotency Keys       │
├─────────────────────────────────────────────────────────────────────────────┤
│  • users & identity_verifications (Citizen identities & trust tiers)        │
│  • consent_grants (OBAC delegation tokens: actor_id, owner_id, scopes)       │
│  • orders & order_parties (Accountable commercial contracts)                │
│  • deal_chains, deal_needs, deal_dependencies (Topological graph constraints)│
│  • payment_obligations & settlements (Non-negative minor currencies)         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ binds immutable snapshots to
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               THE FLEXIBLE VERSIONED ENVELOPES (POSTGRES JSONB)             │
│            Schema-Versioned DTOs for 100+ Regional Trade Variants           │
├─────────────────────────────────────────────────────────────────────────────┤
│  • listing_versions.terms (jsonb · schema_v2)                                │
│    ├── work_pipeline: [{ num, title, dur, desc, evidence, color, bg }]      │
│    ├── inclusions / specifications: ["35uF ±5% rating", "450VAC can", ...]   │
│    └── package_tiers: [{ name, price_minor, is_default, scope }]            │
│                                                                             │
│  • work_instances.structure (jsonb · payload_version)                        │
│    └── Frozen operational DAG snapshot agreed at order formation time       │
│                                                                             │
│  • requests.item_list & deal_chain_options (jsonb)                          │
│    └── Milestone tasks, evidence pledges, and pre-bundled sourcing options   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Architectural Principles:
1. **Never mutate `listing_versions` rows**: Versions are immutable event-sourced snapshots. Work-in-progress edits are buffered client-side in React state and saved only when the provider clicks `Save Draft` or `Publish`.
2. **Deal Chain Relational Projection**: The `Listings` module never writes directly to `deal_chains` tables. The frontend receives a computed `DealChainCombination[]` DTO produced by an application read-projection (`DealChainProjectionPort`).
3. **No Phantom Columns**: We do not create redundant standalone columns (`inclusions`, `work_pipeline`) on `listing_versions`. They live cleanly as version-governed keys inside the canonical `terms` JSONB column.

---

## 4. The Agent Delegation Pillar: OBAC (Object-Bound Actor Capabilities)

Serbizyu's field agent model operates on the **Meesho Social-Commerce / Facebook Page Access** thesis: offline micro-merchants (Lola Nena's store, Mang Jose's tricycle) are represented digitally by authorized community agents (Rosa, local youth leaders).

### 4.1 The Mathematical Authorization Invariant
From canonical governance §16.5, authorization for any agent action is the intersection of five independent constraints:

$$\text{Authorization} = P_{\text{owner}} \cap S_{\text{client}} \cap C_{\text{acting-for}} \cap K_{\text{capability}} \cap E_{\text{approval}}$$

### 4.2 OBAC Core Invariants
1. **Actor vs. Principal Duality**:
   * Every request identifies both the physical operator (`actor_user_id`) and the accountable business entity (`owner_user_id`).
   * Example: Rosa logs in with her own phone OTP, but sets active context to `Mang Jose's Vulcanizing`.
2. **The `ConsentGrant` Token (Table 4.6)**:
   * Stored in `consent_grants` table with composite key `(granter_user_id, grantee_user_id, grant_type)`.
   * Scope-attenuated: can only narrow permissions (e.g. `listings.create`, `orders.view`), never escalate beyond the owner's verification tier.
3. **Zero Cash Custody**:
   * Agents are digital operators, not money couriers. Customer payments route directly to the principal's verified payout account or settle via Dual-Confirmed Cash on Delivery.
4. **Anti-Gatekeeping 3× Graduation Bonus**:
   * When an agent successfully trains an offline merchant to self-manage their account, the agent receives a platform graduation payout equivalent to 3 months of average commissions.
5. **Zero Telephony Debt**:
   * Delegation pairing works via in-app QR/handshake tokens and local physical witness signatures, removing dependency on expensive third-party SMS gateway bills in early deployment.

---

## 5. The Admin Operations Pillar: The Operations Workbench

The Admin subsystem (`app/Modules/Operations/` & `resources/js/Pages/Admin/`) is an operational flight deck designed for staff on desktop viewports:

1. **Operations Triage Desk (`Triage.tsx`)**: Consolidated queue grouping identity verifications, safety incidents, dispute alerts, and stuck escrow holds by priority score.
2. **Dispute & Hold Console (`Disputes/Index.tsx`)**: Structured evidence review with bilateral chat transcript inspection, photo metadata verification, and partial escrow allocation tools.
3. **System Telemetry & Outbox Auditor (`TelemetryIndex.tsx`)**: Real-time event log, idempotency key verification, SMS circuit breaker status, and transactional outbox health.
4. **Catalog Studios (`Catalogs/`)**: Visual editors for managing town-wide Work Archetype templates (`WorkCatalog.tsx`), Deal Chain combination blueprints (`DealChainStudio.tsx`), and Tagudin trade taxonomy (`TaxonomyStudio.tsx`).

---

## 6. Frontend Rebuild Strategy: True Mobile-First Web Modules

```
      TRUE MOBILE-FIRST BREAKPOINT BEHAVIOR
      
      Mobile (<640px)                Desktop (≥1024px)
┌─────────────────────────┐    ┌──────────────────────────────────┐
│ 100vw Full Bleed        │    │ Centered Container (max-w-2xl)   │
│ Touch-First Tap (44px)  │ ── │ Keyboard Nav & Dual Columns      │
│ Bottom Sticky Dock      │    │ Floating Centered Dialogs        │
│ Slide-up Sheet Modals   │    │ Full Desktop Overview            │
└─────────────────────────┘    └──────────────────────────────────┘
```

* **No Artificial Simulator Bezels**: The `.phone-shell` wrapper from the design kit is strictly a desktop preview harness. In the production React build, pages are natively responsive.
* **Deep Modular Architecture**:
  * `WorkPipelineCanvas.tsx`: Encapsulates SVG curve math, branch/join rendering, and $3\text{px}$ themed scrollbar.
  * `DealChainCarousel.tsx`: Encapsulates horizontal scroll-snap, compact DAG rendering, and slot provider re-binding.
  * `GlovoWaveModal.tsx`: Encapsulates asymmetrical wave cap styling, fixed header search, scroll body, and bottom studio links.
  * `EditableStageList.tsx`: Encapsulates visible 1px borders, clock duration inputs (`type="number"`), and camera evidence tags.

---

## 7. OpenSpec Plan-Implement-Iterate Engine

All code changes will execute through five discrete, test-defended OpenSpec change packages under `openspec/changes/`:

```
openspec/changes/
├── 01-frontend-mobile-ui-kernel/
│   ├── proposal.md       # Problem, goals, mobile-first responsive contract
│   ├── design.md         # Deep module interfaces: WorkPipeline, DealChainDeck, GlovoModal
│   ├── tasks.md          # Phased checklist (components, Tailwind tokens, Vitest)
│   └── specs/ui-kernel/  # Given/When/Then component contract tests
│
├── 02-creation-trinity-service-product/
│   ├── proposal.md       # Service & Product creator specification
│   ├── design.md         # FormRequests, terms.work_pipeline schema v2, controller endpoints
│   ├── tasks.md          # Implementation checklist (CreateService, CreateProduct, Pest tests)
│   └── specs/creation/   # Step-by-step onboarding & all-in-one form specs
│
├── 03-creation-trinity-request-builder/
│   ├── proposal.md       # Citizen RFP & Tender creation specification
│   ├── design.md         # Simple checklist vs. Governed Pipeline toggle, tender modes
│   ├── tasks.md          # RequestController, RequestCreate page, Pest tests
│   └── specs/requests/   # Tender creation and deal chain sourcing specs
│
├── 04-marketplace-discovery-and-detail/
│   ├── proposal.md       # Mobile PLP & Listing Detail refactoring
│   ├── design.md         # PublicListingDetailQuery DTO projection, category tabs, fee tracker
│   ├── tasks.md          # Browse.tsx, ListingDetail.tsx, Booking checklist
│   └── specs/discovery/  # Filtering, add-on price calculations, booking dock
│
└── 05-bidding-orders-and-deal-chain/
    ├── proposal.md       # Bids, live order execution, and multi-party deal chains
    ├── design.md         # QuoteComposer, CompareBids, DealChainActive, Escrow release
    ├── tasks.md          # BidController, Order execution pages, Pest/Vitest suites
    └── specs/fulfillment/# Multi-node tracking (Store → Courier → Labor) specs
```

---

## 8. Immediate Execution Mandate

With this blueprint formally adopted, all prior contradictory documentation is superseded. The engineering team and subagents will commence execution on:

**`openspec/changes/01-frontend-mobile-ui-kernel/`**
