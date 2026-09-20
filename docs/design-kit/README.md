# Serbizyu 2.0 — UI Design Kit

**Status:** SOURCE OF TRUTH for product UI look, language, and foundation specimens  
**Accepted:** 2026-08-05 (hi-fi taste v2 promoted; lo-fi element suite retired)  
**Process:** [`WORKFLOW.md`](./WORKFLOW.md) — kit-first dual track (UX psychology → light hi-fi → choose → solidify → live UI) hand-in-hand with backend Pest  
**Inventory checklist:** [`ELEMENT-INVENTORY.md`](./ELEMENT-INVENTORY.md) — coverage gaps and extension backlog  
**Agent skill:** `.cursor/skills/ui-kit-first-development/` (also register under `.agents/skills/` when writable)  
**Not live app code:** this kit is static HTML/CSS. Product surfaces must follow it; they are not auto-generated from it.

## Open it

Same host as the product (preferred):

- Kit home: http://127.0.0.1:8081/design-kit/
- Direct: http://127.0.0.1:8081/design-kit/index.html

Or from repo root:

```bash
cd /home/user/Serbizyu-2.0
python3 -m http.server 4173 --bind 127.0.0.1
# → http://127.0.0.1:4173/docs/design-kit/
```

## What this is

The canonical **visual + interaction specimen kit** for Serbizyu foundation surfaces:

- Forest brand tokens
- Icon + text actions and statuses
- Listing cards with real craft/place photos
- Phone OTP, profile setup, browse, shell/nav
- Visual target for **live** stack: Laravel + Inertia **React** + Tailwind + real shadcn (Nova/Radix) in `resources/js/components/ui/`

Extend this kit when unique features land. Do not revive a separate colorful “lo-fi” page — skeletons and wireframes belong in planning docs if needed, not as a second live kit.

## Files

| File | Role |
|---|---|
| `index.html` | Canonical kit page |
| `styles.css` | Kit tokens and specimens (`tk-` prefixed) |
| `NON-ADMIN-SPECIFICATION.md` | **Canonical implementation authority for all non-admin mocks & screens** |
| `WORKFLOW.md` | Dual-track kit-first process (required for new UI) |
| `ELEMENT-INVENTORY.md` | UX/PRD coverage checklist + gaps |
| `README.md` | This authority note |
## Hard rules

1. **One kit.** `docs/design-kit/` is the only UI kit authority.
2. **Current capability truth only** in product UI — no roadmap cards, planned-feature chrome, or engineering diary copy.
3. **Icon + text** for actions and statuses; color alone is never enough.
4. **No left-border status accents** on listing cards.
5. **Tagudin fixtures** stay concrete (e.g. Maya Tagudin, greeting-card layout, ₱80 exact).
6. **Live stack locked:** Laravel + Inertia **React** (not Svelte) + Tailwind v4 + real shadcn components themed to this kit. The kit itself stays static HTML specimens.
7. **Inventory + workflow first** — for new features, light hi-fi in this kit and founder choose before permanent React.
8. **Current workstream:** execute the 37 fixed-perspective mobile sessions in `../../_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/FRONTEND-FIRST-SOLUTION-DESIGN.md` §8.3 one at a time through `WORKFLOW.md`; do not build a shared role/state static runtime.

## Relationship to other artifacts

- Behavior contract: `docs/planning-hardening/10-ux-ui-reference-dossier.md`
- Experience / product rules: EXPERIENCE / PRD rebuilt sources under planning docs
- Prior disposable prototype (`docs/mockup-v2/`): not the design standard
- Static session backlog and architecture boundary: `../../_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/FRONTEND-FIRST-SOLUTION-DESIGN.md` §8.3 and `ARCHITECTURE-SPINE.md` AD-2
- Retired: lo-fi `dk-*` suite, `kit.js`, `SCAFFOLD-GUIDE.md`, and `proposals/hi-fi-taste-v*`
