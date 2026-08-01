# OpenSpec Change: Create Lo-Fi UI Design Kit

Status: DRAFT FOR FOUNDER REVIEW
Change ID: `create-lofi-ui-design-kit`
Capability status: REFERENCE-ONLY / DESIGN FOUNDATION

## Problem

The UX/UI reference workspace (10/10a/10b) defines journeys, screens, and scenarios, but a design agent still lacks a **reusable element suite**: the small, fundamental, composable UI pieces from which every screen is assembled. Without them, each screen re-invents chips, cards, banners, and edge-case widgets inconsistently.

The user explicitly asked for **elements, not bulk screens**: a design kit that jumpstarts UI design, including edge/fundamental elements such as the QR live feed for the air-gapped feature and archetype formulation interfaces.

## Scope

Create a disposable, lo-fi, static, no-backend design kit at `docs/design-kit/` containing:

- **Tokens** — color, type, spacing, radii, shadows (low-fidelity grayscale-first, one accent).
- **Primitives** — buttons, inputs, selects, chips, badges, cards, modal, toast, table, avatar, progress, skeleton, empty state.
- **Banners** — sandbox, reference-only, offline/low-data, acting-for (agent), hold, disputed, conditional/deferred.
- **State variants** — the full state-variant matrix rendered as live elements (loading, empty, error, offline, stale, retry, mismatch, hold, corrected, deferred, sandbox).
- **Composite elements** —
  - Payment Obligation card (per lane: External Cash, External Digital Proof, Direct Digital sandbox, Tiwala sandbox).
  - Two-sided External Cash report element (buyer_reported / provider_reported / mutually_acknowledged).
  - Order / Work / Payment separation panel.
  - Evidence card with lifecycle states.
  - Release-guard checklist (Tiwala sandbox).
  - Event timeline.
  - Consent grant card (agent scope, suspended/revoked/expired).
  - Dispute intake summary.
- **Edge/fundamental elements** —
  - QR live feed for air-gapped order formation (chunked frame sequence, frame counter, expiry, offline-authority boundary).
  - Archetype formulation interface (mechanism × Work-shape × lane composer with validity guards).
  - Safety-at-point-of-risk panel (meeting/handoff).
  - Policy-to-be-defined placeholder element (unresolved-policy register).
- **README** — element → dossier/screen mapping, usage rules, and "do not bulk-produce screens" boundary.

## Non-goals

- No 74-screen production. Only exemplar compositions where needed to show an element in context.
- No backend, routing state, real QR encoding, real payments, or real identity data.
- No final branding; lo-fi grayscale-first with a single accent is intentional.
- No change to the UX/UI reference dossier, matrix, or blueprints except link references.

## Source order

1. `10b-ux-ui-scenario-blueprints.md` (edge behavior, air-gapped, guards).
2. `10-ux-ui-reference-dossier.md` (state variants, microcopy, layout archetypes, unresolved-policy register).
3. `10a-ux-ui-screen-perspective-matrix.md` (element-to-screen mapping).
4. Canonical BMAD artifacts via those files.

## Approval question

Does this element suite give a designer everything needed to assemble any canonical screen without re-inventing primitives or edge widgets?
