# Listing Detail + Shell Switching Drawer — Handoff

Date: 2026-08-07 (Asia/Manila)
Evidence class: TEAM_TRAINING / KIT-FIRST UI PERSIST
Status: PERSISTED FOR HANDOFF — live UI accepted for continuation; Message / Buy / Visit-us Maps / reviews remain gated or preview until capability-true

## How we work here (kit-first virtues)

Follow `docs/design-kit/WORKFLOW.md` and `.cursor/skills/ui-kit-first-development/SKILL.md`:

1. **Capability truth first** — do not invent live chrome for Request / Book / Pay / Escrow / verified badges until the server capability exists. Preview and gated CTAs are allowed when labeled honestly.
2. **Kit before permanent React** for non-trivial taste changes — light hi-fi / Stitch → founder choose → solidify kit → then `resources/js/`.
3. **Dual track** — backend Pest/domain and UI move together; UI must not contradict ERD / capability matrix / dossier.
4. **Adaptive shell** — mobile bottom chrome and tablet/desktop rail are one product shell (`ProductShell`), not separate apps.
5. **Handoff leaves a recipe** — next owner can reproduce, see exclusions, and know the next bounded slice.

## What this slice delivered

### Public listing detail (live)

- `resources/js/components/listings/ListingDetailView.tsx` + `listing-detail.css`
- Wired from `resources/js/Pages/ProductExperience.tsx` `DetailState`
- Kit winner recorded as **C — Stitch Media dock** in `docs/design-kit/proposals/README.md`
- Desktop layout: media + copy on top; How-this-works + Reviews full-width below
- Provider card shows **account-wide** preview totals (rating / orders served / active listings), separate from **this listing** score chip
- Place row + **Visit us** Maps deep-link (`mapsDirectionsUrl` — coords when present, search query otherwise)
- Hero **listed price once** (larger); not repeated on Buy
- Reviews: stacked cycling suite + mini strip (sample data; honesty labeled)
- Workflow steps: provider titles + short/expandable descriptions (archetype-adaptable preview)

### Shell switching drawer (conditional)

- Owned by `ProductShell` via `useRegisterShellDrawerActions(...)`
- Listing detail registers Pin / Message / Buy|Book into the shell
- **Mobile:** actions ↔ nav switching drawer; collapsed side is a slim same-height pill tab (width-only animation, no height grow from a circle)
- **Nav auto-return:** after ~3s back to actions unless held via `data-sz-nav-hold="true"` (future dropdowns)
- **Tablet/desktop (≥900px):** bottom nav hidden; sticky CTA bar only (rail owns nav)
- Styles live in `resources/css/design-system.css` (`.sz-switch-drawer*`)

## Explicit exclusions / still gated

- Message / Buy|Book — docked UI only; open notes until unified inbox / Direct Booking capability-true
- Verified provider badge — ghost / later
- Sample reviews — layout only
- Workflow copy / photos / distance / listing scores — UI preview until projected
- No inventing escrow, Quick Deal negotiation chrome, or Deal-Chaining on this page
- Backend browse/catalog CRUD enrichment (categories, capacity vs quantity, etc.) was identified as next plane — **not shipped in this persist**

## Reproduction

```sh
cd /home/user/Serbizyu-2.0
# focused UI tests
npx vitest run \
  resources/js/components/listings/ListingDetailView.test.tsx \
  resources/js/components/ProductShell.test.tsx

# rebuild live assets (Sail/Vite as your env requires)
npx vite build
# open a public listing, e.g.
# http://localhost:8081/listings/<active-listing-id>
```

Expected:

- Detail shows media lead, provider totals, place + Visit us, big price, workflow + reviews
- Mobile bottom: switching drawer; open nav → returns to actions ~3s later
- ≥900px: sticky CTA bar only; rail for nav

## Files in this persist

| Path | Role |
|---|---|
| `resources/js/components/listings/ListingDetailView.tsx` | Detail surface + drawer action registration |
| `resources/js/components/listings/listing-detail.css` | Detail layout |
| `resources/js/components/listings/ListingDetailView.test.tsx` | Vitest |
| `resources/js/components/ProductShell.tsx` | Switching drawer + `useRegisterShellDrawerActions` |
| `resources/js/components/ProductShell.test.tsx` | Shell / auto-return tests |
| `resources/css/design-system.css` | `.sz-switch-drawer*` + clearance |
| `resources/js/Pages/ProductExperience.tsx` | DetailState → ListingDetailView |
| `docs/design-kit/proposals/README.md` | Accepted C |
| `docs/design-kit/ELEMENT-INVENTORY.md` | Inventory row |
| `docs/design-kit/proposals/taste-listing-detail-drafts.*` | Kit chooser A/B/C |
| `docs/design-kit/proposals/stitch/` | Stitch media-lead reference |
| This handoff | Continuation contract |

## Suggested next slices for other owners

1. **Browse/catalog backend truth** — categories, listing projection fields needed by detail (media, geo, workflow template, provider aggregates) per ERD / epic pack; keep UI honesty until projected.
2. **Capability-true Message** — unified inbox seam; wire Message CTA; keep multi-channel story (in-app / SMS / Messenger) as one conversation.
3. **Capability-true Buy/Book** — Direct Booking / purchase only when matrix says true for the listing shape.
4. **Reviews eligibility** — replace sample suite when completed-work review projection exists.
5. **Nav hold interactions** — if Home/Browse gain dropdowns, set `data-sz-nav-hold="true"` on the interactive root so the 3s auto-return pauses.

## Rollback / disablement

- Remove `useRegisterShellDrawerActions` usage from `ListingDetailView` → shell falls back to plain `.sz-dock`.
- Revert DetailState to card-only detail if ListingDetailView must be pulled.
- Kit chooser C remains historical even if live UI reverts.

## Verification already run in this workstream

- `npx vitest run` on ListingDetailView + ProductShell — PASS (including 3s auto-return with fake timers)
- `npx vite build` — PASS
