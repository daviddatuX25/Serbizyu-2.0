# Taste drafts (founder chooser)

## Accepted (2026-08-05)

**Winner: A — Laguna Split** for phone sign-in.

- Asymmetric photo panel + docked form
- Forest brand + Outfit display
- Photo is a placeholder — swap later for a real Tagudin / Philippine market local asset
- Live implementation: `resources/js/Pages/Auth/Phone.tsx`
- Chooser kept for history: [taste-auth-drafts.html](./taste-auth-drafts.html)?variant=A

B / C / D rejected (malformed / not preferred).

## Accepted (2026-08-05) — Onboarding / profile setup

Chooser: [taste-onboarding-drafts.html](./taste-onboarding-drafts.html)?variant=A

**Winner: A — Almost There** (motion goal-gradient progress).

- Large 3/4 + staged nodes + spring fill to 75% + Profile pulse
- **No place photo on onboarding** — market/place imagery reserved for Home / discovery later
- Meta psychology notes hidden by default (`Show notes` toggle)
- Later polish (not blocking): brand mark in shell/nav
- Browse taste locked (PLP Plus) and integrated into live `/browse`
- Creative inputs welcome: kit drafts, **Google Stitch**, OpenDesign

**Capability truth:** phone already verified · `display_name` + Tagudin area (+ language / help / low-data) · no gov-ID · unlocks listing creation only.

**Psychology brief (from dossier guided-form archetype + founder ask):**

| Lever | How it shows up |
|---|---|
| Foot-in-door | Celebrate finished phone step honestly |
| Goal-gradient / Zeigarnik | “Almost there” / 3 of 4 with a short remaining ask |
| Endowment | Speak of *your* workspace before save |
| Commitment verb | `Save setup and open workspace` (not Continue) |
| Avoid | Fake scarcity, tax ladder, guilt, decorative lying progress, gov-ID theater |

## Accepted (2026-08-05) — Browse / public discovery

Chooser: [taste-browse-drafts.html](./taste-browse-drafts.html)?variant=A

**Winner: A — PLP Plus**

- One sticky navbar: long wordmark · Tagudin chip · search/Filter/Sort/Layout · **Pinned** right · mobile collapsible
- Rec rail scrolls away (not sticky); rotating marquee sets ~11s; pause on hover/focus
- Layouts: Cards · List (**Highlight removed** from live — deferred)
- Pin shortlist tray (not cart / no checkout)
- Live: `resources/js/components/browse/BrowsePlp.tsx` on `/browse`
- Brand mark: `public/brand/serbizyu-logo-long.png` (+ kit `docs/design-kit/assets/brand/`)
- Capability truth: active Tagudin listings only · no invented ₱ prices or listing photos · pin is client shortlist

B / C / D rejected (not preferred).

## Accepted (2026-08-05) — Browse card anatomy

Chooser history: [taste-browse-card-drafts.html](./taste-browse-card-drafts.html)

**Winner: D — Split Service** (refined)

- Horizontal media | copy; category chip overlays media
- Twin meta: ★ score + order count | place name + distance (m/km)
- Multi-photo rail: swipe / scroll-snap + slider dots
- Dwell expand: hover 1.3s; single-column touch settle 1.3s then **≥58% full-card intersection**; **2-col (≥900px) disables IO expand** (hover/tap only)
- Whole card opens detail; pin stays separate
- PLP shell remains A — PLP Plus
- Live: `resources/js/components/browse/BrowsePlp.tsx` card body
- Preview honesty: stars/orders/meters/stock photos until backend projects ratings, geo, and listing media

A / B / C / E / F rejected for this lock (history in git).

## Accepted (2026-08-05) — My Listings / owner workspace

Chooser: [taste-my-listings-drafts.html](./taste-my-listings-drafts.html)?variant=A

**Winner: A — List Dock**

- Owner status list primary (draft / pending_review / active badges)
- Sticky **Create listing** dock; draft editor secondary below the list
- ReviewBoundary privacy strip — drafts/pending private until approved active
- Same capability verbs: Create listing · Save draft · Submit for review
- Live: `resources/js/components/listings/MyListingsWorkspace.tsx` on `/my-listings`
- Brand mark via shared ProductShell adaptive rail (accepted)
- Capability truth: auth-gated owner projection · create/save/submit only · no pause/archive/capacity/media/Activity/Orders

B — Editor First rejected for foundation (editor-as-hero fights “My Listings” inventory job; keep as history).


## Accepted (2026-08-05) — Product shell / primary nav

Chooser: [taste-shell-nav-drafts.html](./taste-shell-nav-drafts.html)?variant=A&frame=desktop

**Winner: A — Adaptive rail**

| Frame | Behavior |
|---|---|
| Phone (&lt;900px) | Fixed bottom dock · logo + page secondary sticky together |
| Tablet (900–1099px) | Slim left rail · icons only · **circle logo** |
| Desktop (≥1100px) | Labeled left rail · **long wordmark** |

- Destinations (capability-true): Home · Browse · **Create** (`/my-listings#my-listings-editor`) · My Listings
- Deferred seats: QuickDeal · Activity (no dead chrome)
- Page chrome stays page-local (Browse search/filter/pin is not the product nav)
- Live: `resources/js/components/ProductShell.tsx` + `ProductSecondaryBar` logo-slot pattern
- Brand: circle on **tablet** compact rail; **long wordmark** on desktop labeled rail; mobile secondary slots keep the long logo (e.g. Browse stickybar)

B — Top strip rejected (stacks with Browse sticky chrome; weaker persistent mode switch).


## Accepted (2026-08-05) — Public listing detail

Chooser: [taste-listing-detail-drafts.html](./taste-listing-detail-drafts.html)?variant=A

**Winner (updated): C — Stitch Media dock** (themed into live Media lead)

- Live: `resources/js/components/listings/ListingDetailView.tsx` on `/listings/{id}`
- See Accepted C block below for dock / workflow / review-suite details
- Book/Message are docked for offer listings and remain capability-gated on click

B — Truth sheet rejected for foundation (copy-first fights continuity with Split Service PLP).

### Accepted (2026-08-06) — C · Stitch Media dock → live

Chooser: [taste-listing-detail-drafts.html](./taste-listing-detail-drafts.html)?variant=C

Adopted into live `ListingDetailView` with Serbizyu theme tokens (not raw Stitch chrome).

- Dock: **Pin** · **Message me** · **Book** / **Buy** (offers only; product → Buy)
- How this works: provider step **titles** + short descriptions (expand when long) — no “from Request” wording
- Reviews: pronounced stacked cards + swipe / desktop pills + horizontal mini strip that drives the stack
- Badges: Work shape · category · New Provider · Local safety · Verified · later
- No play/pause · no Deal&message card · no Local safety essay block



## Next draft surfaces (foundation)

1. Keep Auth Laguna + Onboarding Almost There + Browse PLP Plus + My Listings List Dock + Adaptive rail shell + Listing detail Media lead aligned

Do not invent Activity or payment chrome until capability exists.

**Not next:** rebuilding a full lo-fi element suite — kit inventory already tracks foundation Present vs Later gaps.


## Listing detail knowledge lock (2026-08-05)

- **Archetypes** (A1…): base step contracts; listing may rename/detail/adapt labels; JSONB `structure` + API extension later — not a new engine per category.
- **Badges now:** Work shape, category, mechanism, New Provider. Verification badges only from performed `identity_verifications`.
- **Reviews hi-fi:** sample rows OK when labeled Preview; live reviews need completed-work eligibility.
- **Dealing:** shared offer/counter/accept seam with Quick Deal — later on detail and/or chat.
- **Channels:** unified inbox (in-app + SMS + Messenger); channel is message metadata — later.
