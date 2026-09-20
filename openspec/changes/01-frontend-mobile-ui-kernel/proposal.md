# Frontend Mobile UI Kernel

Status: PROPOSED — Phase 1 of the Serbizyu 2.0 Mobile-First Rebuild  
Date: 2026-09-20  
Change ID: `01-frontend-mobile-ui-kernel`  
Implementation plane: React/TypeScript foundational component library under `resources/js/components/mobile/`

## Why

Serbizyu 2.0 has 27 hardened HTML prototype specimens (`docs/design-kit/*.html`) that encode a mature, mobile-first design language — Guided Step-by-Step Wizards, Light-Mode DAG Canvases, Horizontal Paginated Carousel Decks, Glovo-style Wave Modals, and Editable Stage Rows. Every non-admin page in the product (Creation Trinity, Marketplace, Orders, Chat) reuses these same structural primitives repeatedly.

Without a deep reusable component kernel, the implementation path is either:

1. **Copy-paste HTML/CSS from prototypes into each Inertia page** — producing a fragile, inconsistent, untestable frontend where visual regressions compound per-page and style token drift is invisible.
2. **Shallow wrappers around Radix/Shadcn** — adding indirection without encoding the product-specific layout contracts (sticky dock navigation, scroll-snap carousel pagination, SVG curve math for fork/join DAGs) that distinguish Serbizyu from generic admin panels.

This change extracts the seven foundational mobile-first React modules that every downstream OpenSpec packet (`02-creation-trinity-service-product` through `05-bidding-orders-and-deal-chain`) depends on, with typed prop contracts anchored to the canonical domain interfaces in `resources/js/components/mobile/types.ts`.

## Authority and trace

- Canonical UX: `docs/design-kit/NON-ADMIN-SPECIFICATION.md` §§1.1–1.4, §4.1–4.3, §5.
- Design prototypes: `docs/design-kit/listing-service-editor.html`, `listing-product-editor.html`, `request-service-builder.html`.
- Rebuild blueprint: `docs/architecture/MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md` §6 (Frontend Rebuild Strategy), §7 (OpenSpec Plan).
- Domain contracts: `resources/js/components/mobile/types.ts` (`WorkStage`, `WorkTemplate`, `PartnerSlot`, `DealChainNode`, `DealChainCombination`, `ActingContextData`).
- Style tokens: Forest brand tokens from `listing-service-editor.html` `:root` block (`--forest-900` through `--forest-50`, ink hierarchy, surface and line tokens, radius and shadow scales).

## Scope

1. **`AppLayout`** — Responsive mobile-first shell: sticky top bar, scrollable content body, sticky bottom dock area. Full-bleed 100vw on mobile, centered `max-w-2xl` on desktop.
2. **`StickyDock`** — Fixed bottom navigation bar housing step progress dots, primary action button, and mode-switcher toggle. 44px minimum tap targets, `--shadow-dock` elevation.
3. **`StepWizardHeader`** — Pill-dot step progress visualization (`● ○ ○`) with smooth CSS transitions, step title, and counter text. Supports Guided vs. All-in-One mode signaling.
4. **`WorkPipelineCanvas`** — Light-mode horizontal scrollable DAG canvas rendering Linear, Parallel Fork/Join, and Decision Branch topologies from `WorkStage[]` and `WorkTemplate` data. SVG curve math for fork/join connectors, 3px themed scrollbar, live SLA recalculation.
5. **`DealChainCarousel`** — Horizontal scroll-snap paginated carousel deck rendering `DealChainCombination[]` with compact inline DAG preview per slide, slot binder rows, pagination controls (`‹ Prev`, dots, counter, `Next ›`), and catalog attachment trigger.
6. **`GlovoWaveModal`** — Full-screen modal overlay with asymmetric SVG wave cap, pinned fixed header (title, subtitle, search, filter chips), scrollable card body with thin themed scrollbar, and pinned bottom action bar.
7. **`EditableStageRow`** — Visibly editable milestone row: stage title input with 1px `#D1D5DB` border, clock-icon duration pill (`<input type="number" min="1" max="480" step="5">` + `"m"` suffix), scope description, camera-icon evidence tag, and remove button. 44px touch targets.

## Non-goals

- No backend controllers, FormRequests, database migrations, or server endpoints.
- No page-level Inertia routes (`Pages/Listings/CreateService.tsx`, etc.) — those belong to `02-creation-trinity-service-product`.
- No form state management, validation logic, or API submission.
- No live data fetching, WebSocket connections, or production backend integration.
- No Svelte, second frontend application, or `frontend/src` tree.
- No changes to `docs/design-kit/*.html` prototype specimens.
- No authentication, authorization, OBAC delegation, or payment behavior.
- No admin/operations workbench components.

## Success

The change is complete when:

1. All seven components render correctly in isolation with test fixtures matching the canonical `types.ts` contracts.
2. `WorkPipelineCanvas` renders Linear, Parallel, and Branch topologies with correct SVG connectors and computes total SLA from stage durations.
3. `DealChainCarousel` supports scroll-snap pagination, dot indicators, and slot binder rows.
4. `GlovoWaveModal` renders the asymmetric wave cap SVG, pins header and footer, and scrolls the body independently.
5. `EditableStageRow` produces 44px-minimum touch targets with numeric keyboard input for duration fields.
6. `AppLayout` achieves full-bleed 100vw on mobile and centered `max-w-2xl mx-auto` on desktop with no artificial phone bezels.
7. `StickyDock` and `StepWizardHeader` animate step transitions with CSS pill-dot progress.
8. Vitest unit tests verify prop contracts, mode switching, SLA computation, pagination arithmetic, and accessibility attributes.
9. Forest brand tokens (`--forest-600`, `--forest-50`, `--forest-900`) are applied consistently; no hardcoded color strings leak into component markup.
10. All downstream OpenSpec packets (`02` through `05`) can import these components without modification.
