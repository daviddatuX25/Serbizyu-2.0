# Serbizyu 2.0 — BMAD Workspace

> **Build More, Architect Dreams.**  
> AI-driven agile development with specialized agents and guided workflows.

---

## Directory Structure

```
_bmad/                     # BMAD Method framework — agents, config, scripts
_bmad-output/              # BMAD-generated artifacts
  ├── planning-artifacts/  # PRD, PRFAQ, architecture docs (active)
  └── implementation-artifacts/  # Sprint plans, stories (when building)
old-docs/                  # Pre-BMAD specification workspace (archived)
  ├── architecture/        # Connector, deal system, archetypes, inbox, etc.
  ├── brand/               # Brand system (colors, typography, voice)
  ├── case-studies/        # Tricycle fulfillment case study
  ├── decisions/           # Decision matrix (D1–D29, resolved & rationale)
  ├── mockup/              # 21+ screens, deck builder
  ├── roadmap/             # Build plan, spec expansion plan
  ├── spikes/              # Technical validation spikes (Xendit, GPS, SMS)
  └── strategies/          # Industry coverage, strategy matrix
research/                  # Research reports
  └── serbizyu-ph-regulatory-report.md  # PH legal/regulatory landscape
```

---

## BMAD Method Track

Using the **BMad Method** planning track (full PRD + Architecture + Epics).

| Phase | Status | Description |
|---|---|---|
| **1. Analysis** | ✅ Complete | Brainstorming, PRFAQ, market/legal research, architecture deep-dive |
| **2. Planning** | 🔲 Next | PRD, UX |
| **3. Solutioning** | 🔲 Pending | Architecture spine, ADRs, Epics & Stories |
| **4. Implementation** | 🔲 Pending | Sprint planning, story cycle |

---

## Key Documents

| Document | Location | Status |
|---|---|---|
| Press Release (PRFAQ) | `_bmad-output/planning-artifacts/prfaq-press-release.md` | Drafted |
| PH Regulatory Report | `research/serbizyu-ph-regulatory-report.md` | Complete |
| Decision Matrix (D1–D29) | `old-docs/decisions/decision-matrix.md` | Complete |
| Fulfillment Archetypes (A1–A10) | `old-docs/architecture/fulfillment-archetypes.md` | Stable |
| Deal System Spec (Quick Deal + Deal-Chaining) | `old-docs/architecture/deal-system-spec.md` | Complete |
| Offline/Hybrid Deal Architecture | `old-docs/architecture/offline-deal-spec.md` | Complete |
| Build Plan (17 sprints) | `old-docs/roadmap/phased-build-plan.md` | Sprint-ready |

---

## Tech Stack (Resolved per D1–D16)

Laravel 12 / PHP 8.3 / Inertia + React + TypeScript / shadcn/ui (New York) / PostgreSQL 16 / Redis / Meilisearch / Laravel Reverb / Mapbox / Xendit / OpenRouter / Pest + Vitest + Playwright
