# Serbizyu 2.0 — Lo-Fi UI Design Kit

Status: REFERENCE ONLY · disposable lo-fi element suite · no backend · fictional fixtures
OpenSpec change: `openspec/changes/create-lofi-ui-design-kit/`
Feeds: the next mockup batch (SCN-01 + SCN-07 first). This kit does NOT produce the 74 screens.

## Open it

Serve the repo root and open the kit:

```bash
cd /home/user/Serbizyu-2.0
python3 -m http.server 4173 --bind 127.0.0.1
# → http://127.0.0.1:4173/docs/design-kit/
```

GitHub Pages (once branch deploys): `https://daviddatux25.github.io/Serbizyu-2.0/design-kit/`

## What this is

A specialized **element suite**, not a screen batch. Every canonical screen should be assembled from these pieces so behavior, states, and edge cases stay consistent. Deliberately small and fundamental — including the two edge elements called out for jumpstarting design: the **air-gapped QR live feed** and the **archetype formulation interface**.

## Element inventory → reference mapping

| Section | Elements | Reference mapping |
|---|---|---|
| 0 Tokens | color/type/space/radius/elevation/touch target | dossier §8, §12.6 |
| 1 Primitives | buttons (+disabled-with-reason), inputs/select/textarea (+invalid), chips, badges (icon+text), cards, avatar, progress, skeleton, empty, table, modal, toast, sticky action bar | §8 anatomy, §11 variants |
| 2 Banners | sandbox, reference-only, offline/low-data, acting-for, hold, conditional | §11, §12, banner rules in J-03/J-11 |
| 3 State variants | all 15 dossier §11 variants rendered as labeled elements | §11 |
| 4 Payment | Order/Work/Payment separation panel · two-sided External Cash report (buyer_reported / provider_reported / mutually_acknowledged, PAY-003/004) · 4 lane cards · Tiwala guard checklist (PAY-008) | J-11, PRD-031–043 |
| 5 Evidence & trust | evidence lifecycle cards (created→deleted incl. processing, retained_under_hold) · consent grant states (proposed→expired) · dispute intake summary · attributed event timeline | §12.2, J-03, J-12, ORD-003 |
| 6 Edge | **QR air-gapped live feed** (chunked frames, frame counter, payload hash, expiry, re-issue, OFFLINE=intent-only boundary) · **archetype formulation composer** (type × mechanism × shape × lane, validity guards, Order snapshot preview) · safety-at-risk panel · policy-to-be-defined placeholders | J-05 conditional Quick Deal (PRD-020/021), LST-005, §12.3, §13.1 |
| 7 Exemplar | SCN-01 composed only from kit elements | SCN-01 |

## Hard rules for anyone using this kit

1. **No bulk screens.** Assemble one scenario at a time, starting with SCN-01 + its SCN-07 recovery branch.
2. **Labels are non-removable.** `SANDBOX ONLY`, `REFERENCE ONLY`, `PILOT-CONDITIONAL`, offline banners stay visible in every derived mockup.
3. **Two-sided cash is the norm.** Never collapse to a single "Paid" toggle; `buyer_reported`/`provider_reported` are independent attestations.
4. **Payment ≠ Work.** The separation panel pattern is mandatory on any Order view.
5. **QR feed is intent-only.** It can never authorize payment, payout, release, final inventory, or irreversible consent (PRD-021). Expired frames are rejected, never auto-applied.
6. **Archetype composer guards are normative.** Disabled options must show the reason; conditional/sandbox flags are part of the element, not decoration.
7. **Unresolved policy → placeholder.** Use the policy-TBD element; never invent deadlines, SLAs, fees, or outcomes.
8. **Accessibility is part of lo-fi.** Focus ring, ≥44px targets, icon+text status, reduced-motion-safe shimmer.

## Files

- `index.html` — kit page (sections 0–7)
- `styles.css` — tokens + all element styles (`dk-` prefixed)
- `kit.js` — deterministic renderers: variants, lanes, evidence, consent, QR feed loop, archetype composer, modal/toast
- `README.md` — this file

## Relationship to existing artifacts

- Behavior contract: `docs/planning-hardening/10-ux-ui-reference-dossier.md`
- Screen mapping: `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md`
- Scenario fixtures: `docs/planning-hardening/10b-ux-ui-scenario-blueprints.md`
- Prior disposable prototype (`docs/mockup-v2/`): superseded as design standard; do not copy its layout.
