# Serbizyu 2.0 OpenSpec Workspace

This directory is the change-spec layer for implementation-sized work and the later connected mockup.

BMAD remains the governing product, UX, domain, schema, ADR, architecture, epic, and readiness authority. OpenSpec changes may implement an approved BMAD story or propose a change that reopens the affected BMAD artifact; they may not silently override it.

Read first:

1. `../docs/planning-hardening/09-development-standards-and-bmad-openspec-contract.md`
2. `../docs/planning-hardening/05-artifact-authority-and-supersession-map.md`
3. The selected canonical BMAD artifact and hardened story contract.
4. `../_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md` for future mockup changes.

Expected layout:

```text
openspec/
├── project.md
├── specs/
│   ├── product/
│   ├── ux/
│   ├── domain/
│   └── mockup/
└── changes/
    └── <change-id>/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/<capability>/spec.md
```

## Accepted auth authority (P0–P1/P0c delivered; P2/P3 deferred)

`changes/hybrid-browser-auth-phone-step-up/` — **Accepted 2026-08-10.** Signup: strict mobile OTP. Sign-in: email/password, phone/password, SMS OTP (fallback), Google OAuth (deferred behind port).

P0–P1/P0c slices delivered (phone OTP signup, password setup/auth, session, fake/mailpit delivery, role assignment). P2 Google OAuth and P3 live SMS/phone providers remain deferred and gated.

## Next packet (not started)

**T4** Work fulfillment & extension engine (`changes/t4-work-fulfillment/`) — common Work kernel + A1 Linear Project first implementation slice. Sequenced A3/A4/A9 and closure; no live payments, no connected money.

## Completed T3 packet

`changes/t3-ordinary-order-formation/` — Direct Booking proposal + sole atomic finalize agreement seam (`SubmitOrderProposal`, `FinalizeOrderAgreement`, immutable terms snapshot v1, stub work `not_started`, obligation `created`/`external_cash`, capacity commit). GO recorded 2026-08-10.

## Completed T2 packet

`changes/t2-governed-catalog-listings-capacity/` — Governed category versioning, capability profiles, listing version pins, capacity reservation hold/commit/release/oversell rejection, Tagudin area/category discovery. GO recorded 2026-08-10.

## Completed T1A packet

`changes/t1a-identity-onboarding-delegation/` — additive roles, consent acting-for on listing writes, live gov-ID fail-closed, UserFactory. GO recorded 2026-08-10.

Reviews remain **T6**; nearby/server search adopted in **T2**.

## Completed T1 packet

`changes/t1-application-kernel-spine/` — Shared idempotency/audit/outbox/inbox kernel; Listings submit adopted. GO recorded 2026-08-10.

## Completed T0 packet

`changes/e0-s2-canonical-schema-migration-baseline/` — canonical 58-table migration baseline. GO recorded 2026-08-10.

Neither T0, T1, T1A, T2, nor T3 authorizes production migrate, live providers, connected money, or downstream feature work without their own packets.
A program-level connected frontend requirement inventory is retained at:

`changes/harden-connected-frontend-experience/`

It is not executed as one change. The founder-directed frontend-first architecture splits it into reviewable vertical child packets using the current React/Inertia `resources/js` application. The first packet is `changes/establish-frontend-view-projection-kernel/`; it establishes typed projections, resolved actions, deterministic JSON behavior, and a reviewer-only Scenario Lab without replacing real Laravel authentication or existing backend slices.

The UX/UI reference dossier remains available at:

`changes/create-ux-ui-reference-dossier/`

It is a reference input, not by itself an approved implementation change. Founder/designer review remains required before its design decisions are treated as locked.
