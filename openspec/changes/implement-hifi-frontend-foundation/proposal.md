# OpenSpec Change: Implement High-Fidelity Frontend Foundation

Status: ACTIVE IMPLEMENTATION SLICE
Change ID: `implement-hifi-frontend-foundation`
Capability: frontend presentation, interaction, and mock endpoint contracts

## Why

The static lo-fi mockup successfully exposed product states but is not an acceptable visual or interaction target. Its one-file-per-screen structure fragments journeys and cannot serve as the real React/Inertia frontend foundation.

This change replaces that visual target with an expressive, responsive React application shell. It keeps the lo-fi files as historical review evidence only.

## Scope

1. Create a standalone React 19.2 + TypeScript 5.9 + Vite 7 frontend under `frontend/`.
2. Structure it for later Laravel/Inertia integration: domain types, future-endpoint mock API, hooks, UI primitives, feature pages.
3. Publish the static review build to `docs/app/` through the existing GitHub Pages source.
4. Implement one persistent shell with a simple Buyer / Provider / Admin role switcher.
5. Implement responsive high-fidelity product areas rather than one route per UX step:
   - role-adaptive Home;
   - Explore;
   - one continuous request composer;
   - Deal Room combining Work, payment, conversation, evidence, and timeline without collapsing their states;
   - Payments;
   - UI/Pattern Lab.
6. Use deterministic synthetic fixtures and in-memory/local state only.

## Non-goals

- Laravel, Inertia SSR, authentication, database, migrations, queues, real uploads, production deployment, or live payment adapters.
- Real identity evidence, live Tagudin pilot claims, or genuine market evidence.
- Recreating all 107 lo-fi route pages.
- Treating Direct Digital or Tiwala as production-capable.

## Authority and traceability

- PRD: `PRD-001–059` as presentation context; this slice directly exercises discovery, request formation, work visibility, payment-lane explanation, support/recovery, and role perspective.
- UX: `UX-001–023`; representative composition prioritizes the SCN-01 success path and SCN-07 recovery concepts.
- Domain/state: `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`.
- Runtime: `docs/planning-hardening/08-runtime-stack-and-environment-contract.md` §3.3.
- UI reference: `docs/planning-hardening/10-ux-ui-reference-dossier.md`, `10a`, `10b`.
- Visual inspiration only: `old-docs/mockup.html`; stale behavior is not reused.

## Safety boundaries

- External Cash remains non-custodial and requires independent Buyer/Provider reports.
- Payment status and Work status remain visibly independent.
- External Digital Proof is evidence, not automatic verification.
- Direct Digital and Tiwala remain persistently marked sandbox-only.
- No invented deadlines, refund guarantees, trust scores, provider verification claims, or policy outcomes.

## Rollback

Delete `frontend/` and `docs/app/`; the canonical BMAD/OpenSpec contracts and historical mockups remain unaffected.
