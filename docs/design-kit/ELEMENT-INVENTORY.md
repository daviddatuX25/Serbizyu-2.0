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

## 4 · Payment elements

| Element | Status | Priority |
|---|---|---|
| Order/Work/Payment separation | Gap | Later |
| Two-sided External Cash | Gap | Later |
| Lane cards / Tiwala guards | Gap | Later |

## 5 · Evidence & trust

| Element | Status | Priority |
|---|---|---|
| Evidence lifecycle / consent / dispute / timeline | Gap | Later |

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
| Guided form & review (Auth / setup / listing) | Present | — |
| Shared transaction workspace | Gap | Later |
| Appointment/handoff / Digital delivery | Gap | Later |
| Evidence/concern/support | Gap | Later |
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
| Preview / Detail | Listing preview + primary actions | Feature-promise copy |

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

---

## Open choices

1. Lock Provider/Buyer nav IA in EXPERIENCE.md now, or keep temporary simple shell (Home / Browse / My Listings only — no Activity) until more surfaces exist?
2. During foundation pass: map kit tokens → Tailwind/shadcn theme variables 1:1 (preferred), vs redesign while keeping EXPERIENCE behavior?

## Immediate next (accepted flow)

1. Install Tailwind + owned shadcn-style primitives themed to kit.
2. Foundation UI pass on live Auth → Onboarding → My Listings → Browse → Detail.
3. Shell cleanup (drop Activity until real); remove pollution copy.
4. New features thereafter use WORKFLOW.md kit-first phase.
