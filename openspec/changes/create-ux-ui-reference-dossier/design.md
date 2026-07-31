# Design: UX/UI Reference Dossier

## Decision

Create one canonical reference dossier at:

`docs/planning-hardening/10-ux-ui-reference-dossier.md`

The dossier is a design input, not an implementation specification. It will be read by any future mockup/design agent before authoring screens. It complements, rather than replaces, the 74-screen bridge.

## Why a separate dossier is needed

The bridge answers “which screen/state must exist?” The dossier answers “what should the user experience on that screen feel like and understand?” It adds:

- Goal and anxiety at each stage.
- Visible hierarchy and decision order.
- Primary and secondary actions.
- What must never be hidden.
- Error/recovery behavior.
- Cross-role consequences.
- Low-literacy and assisted-access adaptations.
- Designer review prompts.

## Artifact structure

The dossier is organized in this order:

1. How to use this artifact.
2. Experience stance and non-negotiable boundaries.
3. Actors and access contexts.
4. Global information architecture and shell.
5. Screen anatomy and reusable UI patterns.
6. Detailed journey playbooks.
7. Cross-role/state visibility matrix.
8. State-variant and recovery matrix.
9. Special contexts: low literacy, low data, assisted access, privacy, safety, and support.
10. Copy and status language.
11. Design-agent review tasks.
12. Traceability and acceptance evidence.

## Design-agent operating rule

Design from the user's job and uncertainty, not from a feature list. Every proposed screen must answer:

- Who is here?
- What are they trying to accomplish now?
- What do they already know?
- What decision must they make?
- What would make them hesitate or distrust the screen?
- What is the one safe primary action?
- What happens if they do nothing, make a mistake, lose connection, or disagree?
- What will the other authorized roles see afterward?

## Default visual direction

The later designer may choose the exact visual language, but the reference should default to:

- Low-fidelity, product-like, and legible rather than decorative.
- Desktop/workspace or route canvas when a phone frame hides the journey.
- Cards, timelines, status panels, forms, drawers, and confirmation summaries used to expose hierarchy.
- Responsive narrow layout as a secondary view, not a fake device shell.
- One strong primary action per screen.
- Color paired with text/icon; no color-only meaning.
- Visible prototype labels: `REFERENCE ONLY`, `NO BACKEND`, `SANDBOX` where applicable.

## Relationship to the current prototype

`docs/mockup-v2/` is a disposable first attempt and is not evidence that this dossier is satisfied. The next designer may replace its layout entirely. The dossier is the reference; the current mockup is only a review artifact.

## Open questions deliberately left to the visual designer

- Exact typeface and visual theme.
- Whether the final reference is one routed page or multiple linked HTML pages.
- Desktop canvas versus responsive split-pane proportions.
- Exact illustration/icon style.
- How many canonical screen IDs are visually grouped into a single composition.

These choices may vary only if they preserve the experience contracts in the dossier and the upstream BMAD artifacts.
