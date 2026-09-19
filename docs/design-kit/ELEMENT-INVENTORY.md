# Serbizyu 2.0 — UI Design Kit Element Inventory

**Status:** ACTIVE coverage checklist + extension backlog  
**Decision locked (2026-08-04):** One kit only — `docs/design-kit/` (do not fork).  
**Decision locked (2026-08-05):** Hi-fi taste v2 is **source of truth**. Lo-fi colorful element suite retired.  
**Decision locked (2026-08-05):** Kit-first dual-track workflow — see [`WORKFLOW.md`](./WORKFLOW.md). New features: UX psychology + light hi-fi → choose → solidify → live UI. Backend Pest/domain stays; both tracks hand-in-hand.  
**Decision locked (2026-08-05):** Live stack = Laravel + Inertia **React** + Tailwind v4 + real shadcn (Nova/Radix), themed to kit forest tokens. Kit remains static visual SoT.  
**Authority (look + foundation specimens):** `docs/design-kit/index.html` + `styles.css`  
**Authority (behavior):** `ux-spec-rebuilt.md` · `prd-rebuilt.md` · `10-ux-ui-reference-dossier.md` · expansion bridge  
**This file:** inventory / gap tracker — not a second visual kit.

---

## How to use this inventory

1. Follow [`WORKFLOW.md`](./WORKFLOW.md) for any new or non-trivial UI.
2. Open the kit (`index.html`) for visual truth.
3. Use this file to see what the kit already covers vs what to add next.
4. When a unique feature lands: placement/psychology notes → light hi-fi specimen(s) → choose → solidify here + kit → then React.
5. Do not recreate a separate lo-fi kit.

**Hard product rule:** Live UI shows **current capability truth only**. No “next vertical slice”, “planned · not enabled”, or engineering diary copy inside product chrome.

---

## Inventory legend

- **Present** — rendered in `index.html` / styled in `styles.css`
- **Partial** — concept exists but missing required anatomy/variants
- **Gap** — required by dossier/PRD/UX; not yet a kit specimen
- **Foundation-now** — needed to stop ad-hoc UI on the current vertical slice
- **Later** — unique / marketplace features; extend the kit when those slices ship

---

## Present in the canonical kit (2026-08-05)

| Area | Specimens |
|---|---|
| Brand / tokens | Forest brand, type, radius, surfaces (`tk-*`) |
| Iconography | Foundation icon set (nav, actions, status) — icon + text rule |
| Actions | Primary / secondary / danger / disabled+reason |
| Fields | Input + invalid textarea with guidance |
| Listings | Photo cards, status badge (no left stripe), Tagudin fixtures |
| Auth | Phone OTP sign-in, profile setup |
| Browse | PLP Plus locked (sticky chrome, rec rail, cards/list/highlight desktop, pin tray) |
| Browse card anatomy | **D Split Service** locked — horizontal media\|copy, twin rating/orders + place/distance, photo rail + dots, dwell expand |
| shadcn-shaped | Card / Button / Badge / Input / Avatar preview (not installed) |
| Shell | Buyer + Provider nav subsets |
| States | Loading skeleton + empty |
| Language | Prefer / Avoid designer rules + pollution ban |

---

## 0 · Tokens

| Element | Status | Source | Priority |
|---|---|---|---|
| Forest brand color / type / space / radius | Present | kit | — |
| Touch target ≥44px | Partial | §12.6 | Foundation-now |
| Reduced-motion note | Partial (skeleton) | §12.6 | Foundation-now |

## 1 · Primitives

| Element | Status | Source | Priority |
|---|---|---|---|
| Button primary/secondary/danger + disabled reason | Present | §8.1 | — |
| Field / input / textarea + invalid | Present | §12.5 | — |
| Badge (icon+text) / avatar | Present | §8.3 | — |
| Skeleton / empty | Present | §11 | — |
| Chip / progress / table | Gap | §8 | Later |
| Modal / toast / sticky action bar | Gap | §8 | Later |
| Card left-accent status stripe | **Banned** | founder | Never promote |


### Badge UI Design Rules (Setproduct Standard)
- **Pure Count Badges:** Display only the numeric value (e.g. `1`, `2`, `99+`). Never append redundant nouns (`2` instead of `2 Listings`, `1` instead of `1 Active`).
- **Anatomy:** 20–22px height pill/circular badge, shaded surface (`var(--forest-50)`), 1px border stroke (`var(--forest-200)`), subtle 1px elevation shadow, and bold monospace numerals (`JetBrains Mono`).
- **Accessibility:** Deliver semantic meaning via `aria-label="2 active listings"` without polluting the visual layout.
## 2 · Banners

| Element | Status | Priority |
|---|---|---|
| Offline / hold / conditional / acting-for | Gap | Later (add when live surface needs them) |
| Sandbox / reference-only banners | Retired with lo-fi kit | Do not revive in product |

## 3 · State variants (§11)

| Variant | Status | Priority |
|---|---|---|
| Loading + empty | Present | — |
| Full 15-variant grid | Gap | Later |

## 4 · Payment & Order elements

| Element | Status | Priority |
|---|---|---|
| Unified Order Detail (`order-detail-mobile.html`) | Present / Accepted | — |
| Minimalist Graphic Invoice (monochrome SVGs, amounts, zero words) | Present / Accepted | — |
| Order/Work/Payment separation | Present / Accepted | — |
| Two-sided External Cash | Present (Solo order specimen) | — |
| Digital Escrow (Lane 2 GCash / Maya) | Present (Deal chain specimen) | — |
| Lane cards / Tiwala guards | Gap | Later |

## 5 · Evidence & Communication

| Element | Status | Priority |
|---|---|---|
| 1:1 In-Order Fulfillment Chat (`order-chat-mobile.html`) | Present / Accepted | — |
| Multi-Party Relay Room (`deal-chain-chat-mobile.html`) | Present / Accepted | — |
| 1:1 Pre-Order Negotiation (`bidding-negotiation.html`) | Present / Accepted | — |
| Glovo Wave Organic Asymmetrical Attachment Drawer | Present / Accepted | — |
| Contextual Participant Handoff Sheet | Present / Accepted | — |
| Evidence lifecycle / consent / dispute / timeline | Partial (photo evidence & hold actions) | Next |
## 6 · Edge / unique features

| Element | Status | Priority |
|---|---|---|
| QR air-gapped feed | Gap | Later |
| Archetype formulation composer | Gap | Later |
| Safety-at-risk / policy-TBD | Gap | Later |

## 7 · Exemplars

| Element | Status | Priority |
|---|---|---|
| Foundation Tagudin journey specimens (auth→browse→listing) | Present | — |
| Full SCN-01 composition | Gap | Later |

## 8 · Screen anatomy

| Element | Status | Source | Priority |
|---|---|---|---|
| Context / headline / truth / decision (embedded in specimens) | Partial | §8 | Foundation-now |
| Product shell / primary nav (adaptive rail) | Present / accepted | proposals/taste-shell-nav-drafts.html · ProductShell.tsx | A — Adaptive rail (2026-08-05) |
| Explicit anatomy shells as labeled blocks | Gap | §8 | Later |
| Prototype metadata strip | Never in product | §8 | Connected mock only |

## 9 · Layout archetypes

| Archetype | Status | Priority |
|---|---|---|
| Discovery & comparison (Browse) | Present | — |
| Guided form & review (Auth / setup / listing / requests) | Present (`request-service-builder.html`, `listing-service-editor.html`, `listing-product-editor.html`) | — |
| Tender & Quote Workspace | Present (`responses-open-comparison.html`, `quote-composer.html`, `quote-own-submitted.html`, `request-open-public-view.html`) | — |
| Shared transaction workspace | Present (`payment-flow-mobile.html`, `settlements-mobile.html`, `order-detail-mobile.html`) | — |
| Appointment/handoff / Digital delivery | Gap | Later |
| Evidence/concern/support | Present (`payment-flow-mobile.html` dispute drawer + hold stage, `admin-triage.html`) | — |
| Completion & Review Ceremony | Present (`review-ceremony-mobile.html`, `payment-flow-mobile.html`) | — |
| Agent-assisted / Admin | Gap | Later |

## 10 · Shell & navigation

| Element | Status | Priority |
|---|---|---|
| Buyer nav specimen | Present | — |
| Provider nav specimen | Present | — |
| Adaptive product rail + mobile dock | Present / accepted | ProductShell |
| Agent / Admin nav | Gap | Later |
| Journey map | Gap | Later |

## 11 · Foundation domain

| Element | Status | Priority |
|---|---|---|
| Phone OTP challenge | Present (Laguna Split accepted 2026-08-05) | — |
| Onboarding profile step | Present | — |
| Listing card (no left stripe) + photos | Present | — |
| Listing status badge set (draft→rejected) | Partial | Foundation-now |
| Listing preview / edit actions | Present | — |
| Public vs private projection callout | Partial | Foundation-now |

## 12 · Content language & anti-patterns

| Element | Status | Priority |
|---|---|---|
| Prefer / Avoid rules | Present | — |
| Product pollution ban | Present | — |

---

## Foundation surface → kit

| Live surface | Assemble from kit | Must not include |
|---|---|---|
| `/auth/phone` | OTP, guided form, primary verb | Roadmap cards, fake SMS provider UI |
| Onboarding | Profile setup specimen | Identity/gov-ID collection UI |
| Browse | PLP Plus live on `/browse` | Draft/pending, payment/Activity chrome |
| My Listings | List Dock (locked) + owner cards + create/save/submit | Pause/archive/capacity, Marketplace hub, Orders/Quotes |
| Preview / Detail | **A — Media lead** live on `/listings/{id}` | Request/Book/Pay chrome |
| Detail taste **C — Stitch Media dock** | Open option in kit chooser `?variant=C` | Founder lock before live |
| Detail badges / adapted A1 steps / sample reviews / Deal&message later seam | Present (honesty-labeled preview) | Live verification badges, reviews projection, dealing+unified inbox |

---

## Extension order (as we go)

1. Close foundation Partials (full listing status set, public/private callout, touch/reduced-motion notes).
2. Align live product CSS (`sz-*` / design-system) to kit tokens deliberately.
3. Add specimens when unique features ship (payments, QR, evidence, Deal-Chaining, etc.).
4. Keep this inventory updated with each kit addition.

### Browse media expand (D Split Service — live scaffold)

**Card media dwell → expand wrapper + swipeable photos** (video later when media schema + consent exist):

- Desktop: hover dwell 2s expands media column / height.
- Single-column touch: scroll must settle ~1.3s, then the **full card** needs ≥~58% visible intersection before expand. **2-col (≥900px)**: IO expand off — hover/tap only.
- Photo rail: horizontal scroll-snap + larger tappable dots; swipe left/right when multiple preview frames exist.
- Dot tap / desktop hover dwell expands media immediately (dot) or after 1.3s dwell; while expanded, auto-advance photos (~3s) and loop; collapse resets to first preview frame. Subtle image scale only. Video play when media schema exists.
- Later: muted video / Reels lane can reuse the same media stage + dwell contract.
- Do not claim stock/preview frames as listing-owned media until projected from backend.


### Signature Glovo Organic Asymmetrical Wave Bottom Sheet (Locked Pattern)

**Canonical source:** `docs/design-kit/browse-mobile.html` (`#glovo-filter-modal`), replicated on `order-detail-mobile.html` and `review-ceremony-mobile.html`.

- **Structural Contract:**
  1. `.sheet-backdrop` / `.glovo-drawer-overlay`: `background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; flex-direction: column; justify-content: flex-end; align-items: center;`
  2. `.glovo-organic-modal` / `.glovo-drawer-sheet`: `width: 100%; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); max-height: 85%; background: transparent;`
  3. `<svg class="glovo-wave-cap">`: `width: 100%; height: 34px; margin-bottom: -1px; display: block; flex-shrink: 0;` with path `M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z` and `fill="#FFFFFF"`.
  4. `.glovo-modal-content` / `.drawer-content-box`: `background: #FFFFFF; padding: 6px 20px 28px; display: flex; flex-direction: column; gap: 12px;`
- **Invariants:**
  - Wrapper MUST have `background: transparent;`. Setting white on the wrapper paints over the wave cutout and turns it into a flat rectangle.
  - Content box below MUST have `background: #FFFFFF;` and `-1px` top margin so the white SVG wave seamlessly fuses into the white body.
  - All option tiles inside MUST be clean white cards with subtle borders. No grey (`#F8FAFC`, `#F1F5F9`) fills.
---

## Prior foundation choices

Provider/Buyer navigation IA and one-to-one kit-token mapping remain separate future decisions. They do not block fixed-perspective static session mocks and must not trigger a shared role-aware static shell.

## Immediate next — static session discovery program

The prior foundation pass is retained as completed/history. Current next work is the 37-session static mobile backlog in `../../_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/FRONTEND-FIRST-SOLUTION-DESIGN.md` §8.3, executed through `WORKFLOW.md`.

Start with Wave A, one fixed-perspective URL at a time:

1. `request-service-builder.html`
2. `request-open-public-view.html`
3. `request-sealed-public-view.html`
4. `request-eligible-provider-view.html`
5. `quote-composer.html`
6. `responses-sealed-after-close.html`

This inventory tracks visual/component gaps only. Behavior, authorization, schema, and lifecycle discoveries must be promoted through the projection matrix, architecture, and OpenSpec before permanent React/Laravel integration.
