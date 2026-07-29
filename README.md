# Serbizyu 2.0

> **Bayanihan Street to Digital Marketplace.**  
> An inclusive services and goods commerce platform for Philippine provincial economies — Tagudin, Ilocos Sur.

**Status:** Phase 3 (Solutioning) ✅ Complete — Phase 4 (Implementation) pending  
**Stack:** PHP 8.4 · Laravel 12 · React 19.2 · Inertia v3.6 · Tailwind 4.3 · shadcn/ui 4.16 · PostgreSQL 16 + PostGIS · Redis 7 · Meilisearch 1.51 · Laravel Reverb 1.11 · Dexie.js 4.4  
**Infrastructure:** Dokploy on Proxmox VPS · Cloudflare Edge · TextBee Android SMS Gateway · Xendit xenPlatform  
**Deployment:** `dxtechph.online` · GitHub → Dokploy CI/CD

---

## Directory Index

### BMAD Framework
| Path | Purpose |
|---|---|
| `_bmad/` | BMAD method — agents, config, scripts |
| `_bmad-output/planning-artifacts/` | Active planning documents (see below) |
| `_bmad-output/implementation-artifacts/` | Sprint plans, stories (Phase 4) |

### Planning Artifacts (Phase 1–3 — Locked)

| Document | Status |
|---|---|
| `_bmad-output/planning-artifacts/prfaq-press-release.md` | ✅ Phase 1 — Product vision + founder quote |
| `_bmad-output/planning-artifacts/prfaq-faq-challenges.md` | ✅ Phase 1 — Trust, economics, competition, risk |
| `_bmad-output/planning-artifacts/prd.md` | ✅ Phase 2 — 9 sections locked (v3.0.1, patched) |
| `_bmad-output/planning-artifacts/ux-spec.md` | ✅ Phase 2 — 39 mockup screens |
| `_bmad-output/planning-artifacts/listing-model-taxonomy.md` | ✅ Phase 2 — 4 listing types, 5 mechanisms, 10 archetypes |
| `_bmad-output/planning-artifacts/architecture.md` | ✅ Phase 3 — Topology, ERD, sequence diagrams, stack (v3.2.0) |
| `_bmad-output/planning-artifacts/adr-catalog.md` | ✅ Phase 3 — 26 Architecture Decision Records (v4.2.0) |
| `_bmad-output/planning-artifacts/epics-and-stories.md` | ✅ Phase 3 — 3-epic core + Sprint 0 (v4.0.0) |
| `_bmad-output/planning-artifacts/readiness-report.md` | ✅ Phase 3 — Phase 4 clearance (v5.0.0) |
| `_bmad-output/planning-artifacts/research-agenda.md` | ✅ Phase 1 — Research questions tracked |
| `_bmad-output/planning-artifacts/stakeholder-briefing.html` | ✅ Project summary for external readers |

### Architecture Deep-Dives (Phase 3 Foundation)
| Document | Purpose |
|---|---|
| `docs/critical-decision-brainstorming/01-proposal-academic-baseline.md` | Academic context + scope baseline |
| `docs/critical-decision-brainstorming/02-onboarding-formalization-agent-strategy.md` | Agent network design rationale |
| `docs/critical-decision-brainstorming/03-technical-architecture-cost-sneak-peek.md` | Cost model analysis |
| `docs/critical-decision-brainstorming/04-engineering-architecture-master-reference.md` | Cross-cutting architecture reference |
| `docs/critical-decision-brainstorming/05-quick-deal-deal-chaining-spec.md` | Quick Deal + Deal-Chaining spec |
| `docs/critical-decision-brainstorming/INDEX.md` | Navigation index for deep-dives |

### Pre-BMAD Documents (Archived — `old-docs/`)
| Path | Purpose |
|---|---|
| `old-docs/architecture/` | Connector, deal system, fulfillment archetypes, inbox, workflow builder |
| `old-docs/brand/` | Brand system (colors, typography, voice) |
| `old-docs/case-studies/` | Tricycle fulfillment case study |
| `old-docs/decisions/` | Decision matrix (D1–D29, pre-BMAD) |
| `old-docs/mockup/` | 39 HTML screens (01–39) + shared CSS/JS + kiosk |
| `old-docs/roadmap/` | Phased build plan, spec expansion plan |
| `old-docs/spikes/` | Technical spikes (Xendit escrow, Semaphore OTP, GPS) |
| `old-docs/strategies/` | Industry coverage matrix, strategy matrix |

### Mockups & Presentation
| Path | Purpose |
|---|---|
| `docs/mockup.html` | Mockup hub (navigable index of all 39 screens) |
| `docs/deck-defense.html` | Defense deck (16 slides, sand/teal design) |
| `docs/deck-defense.draft.html` | Draft version |
| `docs/deck-notes.html` | Speaker notes companion |
| `docs/prototype.html` | Interactive prototype |
| `presenter-script.html` | Printable presenter script |
| `presenter-script.md` | Markdown source |

### Research
| Document | Purpose |
|---|---|
| `research/serbizyu-ph-regulatory-report.md` | PH legal/regulatory landscape (BIR, BSP, DPA, DOLE, DTI, LGU) |
| `serbi-ai-assistant-research.md` | Serbi AI baseline — Laravel AI SDK patterns, caching, guardrails (47KB) |
| `serbizyu-financial-architecture-research.md` | Balance caching + Xendit dependency analysis |
| `serbizyu-stack-compatibility-report.md` | Tech stack version audit (all 13 components) |

### Root Files
| Path | Purpose |
|---|---|
| `README.md` | This index |
| `.nojekyll` | GitHub Pages config (serves raw files) |

---

## BMAD Phase Tracker

| Phase | Status | Artifacts |
|---|---|---|
| **1. Analysis** | ✅ Complete | PRFAQ, regulatory research, architectural deep-dives |
| **2. Planning** | ✅ Complete | PRD (9 sections locked), UX spec (39 screens), listing taxonomy |
| **3. Solutioning** | ✅ Complete | Architecture v3.2.0, 26 ADRs v4.2.0, Epics v4.0.0, Readiness v5.0.0 |
| **4. Implementation** | 🔜 Sprint 0 | Dokploy + CI/CD + TextBee + schema migrations + dev workflow |

### Deferred Features (Phase 2+)
Serbi AI · Deal-Chaining · Kiosk Access Points · 3-Lane Compliance Dashboard · Boost/Advertising · Points/Affiliate · Push/In-App Notifications · Channel Connectors (FB/Messenger/TikTok) · Backup Restore Automation · Reverse Bidding
