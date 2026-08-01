# Design: Lo-Fi UI Design Kit

## Decision

Build the kit as one self-contained static page (`docs/design-kit/index.html`) plus `styles.css`, `kit.js`, and `README.md`. Sections are navigable by a left rail; every element is a copyable, documented block.

## Structure

| Section | Contents | Dossier mapping |
|---|---|---|
| 0 Tokens | color, type, space, radius, elevation | §8 anatomy |
| 1 Primitives | buttons, fields, chips, badges, cards, modal, toast, table, progress, skeleton, empty | §8, §11 |
| 2 Banners | sandbox, reference-only, offline, acting-for, hold, disputed, conditional | §11 variants, §12 |
| 3 State variants | the full variant matrix as live elements | §11 |
| 4 Payment elements | lane cards, two-sided cash report, Order/Work/Payment panel, guard checklist | J-11, PAY-*, PRD-031–043 |
| 5 Evidence & trust | evidence card lifecycle, dispute summary, consent card, timeline | §12.2, J-03, J-12 |
| 6 Edge elements | QR air-gapped feed, archetype formulation, safety panel, policy-TBD placeholder | J-05 conditional Quick Deal, §12.3, §13.1 |
| 7 Composition exemplar | one SCN-01 Order view assembled only from kit elements | SCN-01 |

## Visual rules

- Grayscale-first lo-fi; one accent (blue) reserved for primary action and links.
- Status color always paired with icon + text; never color-only.
- Persistent labels on sandbox/reference elements; cannot be styled away.
- Every interactive-looking element shows its disabled/invalid/loading sibling nearby.
- Touch targets ≥ 44px; visible focus ring.
- Taglish-friendly microcopy hooks but English baseline.

## QR air-gapped feed contract (edge element)

- Renders a sequence of placeholder QR frames (SVG squares, deterministic pattern) with: frame index/total, payload hash prefix, expiry countdown fixture, and `OFFLINE — draft intent only` banner.
- Explicit boundary text: cannot authorize digital payment, payout, release, final inventory, or irreversible consent (PRD-021).
- States: streaming, paused, expired, resumed/refresh.
- It is a visual element only; no real encoding/decoding.

## Archetype formulation contract (edge element)

- Composer: Listing/Request type → mechanism (Direct Booking / Quote Request / conditional Quick Deal) → Work shape (A1/A3/A4/A9) → lane.
- Validity guard rail: invalid combinations disabled with reason; conditional ones flagged `PILOT-CONDITIONAL`; sandbox lanes flagged.
- Output preview: plain-language summary + JSON-ish contract stub (what the Order snapshot would contain), read-only.

## Element naming

BEM-lite, prefixed `dk-` (design kit) to avoid collisions with future app CSS.
