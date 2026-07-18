# Serbizyu — Spec Workspace

The hardened, buildable specification for the Serbizyu platform. Start here.

## Reading Order

1. **Foundation** — the original full spec (serbizyu-full-spec.md in the project root / chat attachment). Domains, data architecture, build sequencing.
2. **[decisions/decision-matrix.md](decisions/decision-matrix.md)** — every open question from §14, resolved with rationale and review triggers. Postgres, Forge+hybrid SSR, shadcn/ui, Mapbox, OpenRouter, and more.
3. **[brand/serbizyu-brand-system.md](brand/serbizyu-brand-system.md)** — color tokens, typography, shadcn/ui config, voice and tone. Implementation-ready.
4. **[architecture/fulfillment-archetypes.md](architecture/fulfillment-archetypes.md)** — the 10 shapes (A1–A10) that cover all products and services. The answer to "can the system support the whole industry."
5. **[architecture/connector-architecture.md](architecture/connector-architecture.md)** — one adapter per channel serving both Distribution (outbound) and Messaging (inbound). Facebook, Messenger, SMS, TikTok, and how to add #8.
6. **[architecture/work-connector-ecosystem.md](architecture/work-connector-ecosystem.md)** — pluggable tools (Mapbox, Calendar, Route Planner, Documents) that Work Templates reference. This is what makes Serbizyu a platform, not just a marketplace.
7. **[architecture/workflow-builder-spec.md](architecture/workflow-builder-spec.md)** — how Work is built (servicer canvas, contract checker, AI drafting) and shown (three buyer render modes).
8. **[strategies/industry-coverage-matrix.md](strategies/industry-coverage-matrix.md)** — every industry mapped to an archetype, with readiness verdicts, marketing angles, and explicit exclusions.
9. **[strategies/strategy-matrix.md](strategies/strategy-matrix.md)** — UX psychology, market reach per segment, growth loops, affiliate models, trust density.
10. **[case-studies/tricycle-fulfillment.md](case-studies/tricycle-fulfillment.md)** — the A2 dispatch archetype end to end. The proof that a non-project service works without a dedicated domain.
11. **[roadmap/phased-build-plan.md](roadmap/phased-build-plan.md)** — Phase 0 checklist, 10 sprints to launch gate, Phase 2/3 epics, schema checklist per phase, risk register, definition of ready/done.
12. **[architecture/channels/](architecture/channels/)** — per-channel implementation specs: facebook.md, messenger.md, sms.md, tiktok.md. Credentials, API flows, rate limits, ToS risks, fallbacks, tests.

## The One-Paragraph Thesis

The platform supports the whole industry not by building infinite features but by recognizing that every product and service reduces to one of ten fulfillment archetypes. Four presets (project, appointment, handoff, digital) plus one configured dispatch template cover ~80% of a provincial economy at launch. The Work engine's JSONB structure absorbs variation; the fixed status contract keeps Payments, Notifications, and Trust unaware of category shape. Channels are one adapter each, serving both marketing distribution and buyer messaging. Tools (maps, calendar, documents) plug into templates without touching the engine. Build order: prove liquidity in one town with four presets, then earn each layer of generality with real usage.

## Status

| Document | State |
|---|---|
| Full spec (source) | Stable foundation |
| Decision matrix | Complete, 16 decisions |
| Brand system | Complete, implementation-ready |
| Archetype library | Complete, 10 archetypes |
| Connector architecture | Complete |
| Tool ecosystem | Complete |
| WorkflowBuilder spec | Complete |
| Industry coverage | Complete, 9 sectors + exclusions |
| Strategy matrix | Complete |
| Tricycle case study | Complete |
| Build plan (roadmap) | Complete, sprint-ready |
| Channel specs (4) | Complete: FB, Messenger, SMS, TikTok |

*Last updated: 2026-07-18*
