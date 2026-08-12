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

## Accepted auth authority (implementation packet next)

`changes/hybrid-browser-auth-phone-step-up/` — **Accepted 2026-08-10.** Signup: strict mobile OTP. Sign-in: email/password, SMS OTP, Google OAuth (live SMS/Google still gated).

ADR-R-030, foundation plan, `.ai/rules/http-and-auth`, PRD-001, UX-025, and PROGRAM identity row amended. **Code flip still requires §1 implementation OpenSpec + Pest** — do not merge auth routes without that packet.

## Next packet (not started)

**T2** Governed catalog / capacity / **server** discovery (Tagudin search/filter) — author OpenSpec before implementation.

## Completed T1A packet

`changes/t1a-identity-onboarding-delegation/` — additive roles, consent acting-for on listing writes, live gov-ID fail-closed, UserFactory. GO 2026-08-10.

Reviews remain **T6**; nearby/server search remains **T2**.

## Completed T1 packet

`changes/t1-application-kernel-spine/` — Shared idempotency/audit/outbox/inbox kernel; Listings submit adopted. GO recorded 2026-08-10.

## Completed T0 packet

`changes/e0-s2-canonical-schema-migration-baseline/` — canonical 58-table migration baseline. GO recorded 2026-08-10.

Neither T0 nor T1 authorizes production migrate, live providers, or T1A/T2 feature work without their own packets.

A proposed implementation-grade change for the complete connected frontend system is present at:

`changes/harden-connected-frontend-experience/`

It combines the independently corroborated UX-closure audit with the founder-directed mock authentication, progressive onboarding/formalization, complete listing management, shared Agent/Owner context, request bidding, standalone Quick Deal, connected Order/Work/Payment, and scoped Admin/Operations contracts. It requires founder approval before application-code changes and treats prior checked frontend tasks as completed foundation slices rather than proof of connected journey closure.

The UX/UI reference dossier remains available at:

`changes/create-ux-ui-reference-dossier/`

It is a reference input, not by itself an approved implementation change. Founder/designer review remains required before its design decisions are treated as locked.
