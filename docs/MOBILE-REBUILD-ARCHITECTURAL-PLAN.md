# Serbizyu 2.0 — Mobile-First Rebuild Architectural Plan

**Status:** Proposed Architecture & Migration Blueprint  
**Authors:** Serbizyu Engineering Core  
**Scope:** Complete Non-Admin Frontend & Backend Domain Solidification  
**Authority:** `docs/design-kit/NON-ADMIN-SPECIFICATION.md`, `_bmad-output/planning-artifacts/`  

---

## 1. Core Architectural Paradigm: True Mobile-First Responsive Web

### 1.1 Dispelling the Phone Shell Fallacy
The `.phone-shell` container present in `docs/design-kit/*.html` is strictly a static preview device for desktop evaluation. In the production Laravel 12 + Inertia.js React v3 application, there will be **no artificial phone bezels, faux notches, or fixed simulator containers**.

Instead, the application follows **True Mobile-First Responsive Design**:
* **Mobile Viewports (`< 640px`)**:
  * $100\text{vw}$ full-bleed fluid layout.
  * $44\text{px}$ minimum tap targets on all touch affordances.
  * Sticky bottom action docks (`position: sticky; bottom: 0; padding-bottom: env(safe-area-inset-bottom);`).
  * Bottom-anchored slide-up sheets (`GlovoWaveModal`).
* **Desktop & Tablet Viewports (`≥ 640px` and `≥ 1024px`)**:
  * Centered responsive containers (`max-w-2xl` for creation forms; `max-w-5xl` for marketplace grids and order workspaces).
  * Smooth transition from single-column touch wizard to dual-column desktop overview.
  * Modals transform from full-width bottom sheets into centered backdrop dialogs.

---

## 2. Deep Frontend Component Hierarchy (`resources/js/`)

Following the deep modules principle (*small interface, rich hidden implementation*), we construct reusable, composable React components built on **Shadcn/Radix** primitives and styled with **Tailwind v4**:

```
resources/js/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           # Universal responsive page shell (header, body, bottom dock)
│   │   ├── StickyDock.tsx          # Adaptive mobile-first action dock with safe-area padding
│   │   └── StepWizardHeader.tsx    # Glovo-style progress pill dots & back navigation
│   │
│   ├── work/
│   │   ├── WorkPipelineCanvas.tsx  # Light DAG canvas, SVG branch/join curves, thin 3px scrollbar
│   │   ├── EditableStageList.tsx   # Visibly editable stage rows with clock/duration & camera/evidence inputs
│   │   ├── WorkCatalogModal.tsx    # Searchable catalog template drawer with custom studio link
│   │   └── types.ts                # WorkStage, WorkTemplate, WorkShape domain types
│   │
│   ├── deal-chain/
│   │   ├── DealChainCarousel.tsx   # Horizontal scroll-snap deck (.partner-combos-deck) with compact DAG view
│   │   ├── SlotBinderRow.tsx       # Role-based partner slot selector with live re-binding
│   │   ├── DealChainModal.tsx      # Multi-combination catalog sheet with Deal Studio link
│   │   └── types.ts                # DealChainCombo, PartnerSlot, DealChainNode
│   │
│   └── ui/                         # Atomic Primitives (Shadcn / Radix)
│       ├── button.tsx, card.tsx, input.tsx, textarea.tsx, badge.tsx, select.tsx
│       ├── dialog.tsx, sheet.tsx, tabs.tsx, switch.tsx, tooltip.tsx
│
└── Pages/                          # Thin Inertia Route Controllers
    ├── Listings/CreateService.tsx  # 3-step guided service creator + all-in-one toggle
    ├── Listings/CreateProduct.tsx  # Product creator (specs + variants + delivery deck)
    ├── Requests/CreateRequest.tsx  # Request builder (simple checklist + optional DAG)
    ├── Browse.tsx                  # Marketplace Mobile PLP (filters, fee tracker, sticky basket)
    ├── ListingDetail.tsx           # Service & product detail view (specs, DAG, partner combos)
    ├── Orders/Show.tsx             # Order execution detail with live milestone DAG tracker
    └── Orders/DealChainShow.tsx    # Coordinated multi-node status grid (Store → Courier → Labor)
```

---

## 3. Parallel Backend Solidification (Modular Monolith)

The backend (`app/Modules/`) houses existing domain logic. We extend and solidify it to serialize the rich JSON payloads defined in the design kit:

### 3.1 Model JSON Casts & Schema Alignment
* **`ListingVersion.php`**:
  * `inclusions`: array of strings (`What's Included` deliverables / `Specifications & Features`).
  * `work_pipeline`: array of objects `[{ id, num, title, dur, desc, evidence, color, bg }]`.
  * `work_shape`: string (`A1`, `A2`, `A3`, `A4`, `A9`) inferred automatically from pipeline structure.
  * `package_tiers`: array of add-on objects `[{ id, name, price, is_default }]`.
* **`ListingDealChain.php`**:
  * `combinations`: array of combo objects `[{ id, title, nodes: [...], slots: [...] }]`.
* **`ServiceRequest.php`**:
  * `milestone_tasks`: array of requirement objects `[{ id, title, dur, evidence }]`.
  * `has_governed_pipeline`: boolean flag toggling between simple checklist and formal DAG.
  * `tender_mode`: enum string (`open_tender`, `sealed_tender`, `direct_invite`).
  * `deal_chain_options`: array of pre-bundled sourcing combos attached to RFQ.

### 3.2 Form Requests (Strict Validation Boundaries)
* **`app/Http/Requests/CreateServiceListingRequest.php`**: Validates title, description, category, inclusions, work pipeline stages, base price, add-ons, and deal chain combinations.
* **`app/Http/Requests/CreateProductListingRequest.php`**: Validates title, description, category, specifications, unit price, stock, variations with prices and inventory, and delivery options.
* **`app/Http/Requests/CreateServiceRequestRequest.php`**: Validates title, category, photos, tasks, governed pipeline toggle, budget mode, target budget, and tender mode.

---

## 4. OpenSpec Change Packages: Plan-Implement-Iterate

We execute this rebuild through discrete, reviewable OpenSpec change packages under `openspec/changes/`:

1. **`openspec/changes/01-frontend-mobile-ui-kernel/`**:
   * Shared responsive `AppLayout.tsx`, `StickyDock.tsx`, `StepWizardHeader.tsx`.
   * Deep `WorkPipelineCanvas.tsx`, `DealChainCarousel.tsx`, `EditableStageList.tsx`, `GlovoWaveModal.tsx`.
   * Vitest unit test suite.
2. **`openspec/changes/02-creation-trinity-service-product/`**:
   * `Pages/Listings/CreateService.tsx` & `CreateProduct.tsx`.
   * Backend Form Requests & Controller endpoints.
   * Pest feature tests.
3. **`openspec/changes/03-creation-trinity-request-builder/`**:
   * `Pages/Requests/CreateRequest.tsx` (simple checklist + optional governed DAG toggle).
   * Backend request submission & tender storage.
4. **`openspec/changes/04-marketplace-discovery-and-detail/`**:
   * Mobile PLP (`Browse.tsx`) & Detail View (`ListingDetail.tsx`).
   * `PublicListingDetailQuery` enhancements.
5. **`openspec/changes/05-bidding-orders-and-deal-chain/`**:
   * Servicer bid composer, buyer bid comparison, live milestone DAG tracker, and multi-party deal chain execution.

---

## 5. Risk Defenses & Invariants

* **Multi-Step Validation Error Handling**: If validation fails on Step 1 while the user is on Step 3, the wizard automatically switches the active step back to Step 1 and pulses the invalid field.
* **Inertia Form State Recovery**: Multi-step forms use Inertia's `useForm` combined with `useRemember` to prevent draft loss on accidental refresh or back-navigation.
* **Mobile Keyboard Viewport Shifts**: Docks use `position: sticky; bottom: 0;` paired with `dvh` (dynamic viewport height) units and `padding-bottom: env(safe-area-inset-bottom)` to prevent virtual keyboards from obscuring submit buttons.
* **Modular Monolith Integrity**: `Listings` and `OrdersWork` modules communicate strictly across application query and event contracts, never via cross-module direct database queries.
