# 🏪 Serbizyu 2.0

> **Bayanihan Street → Digital Marketplace**  
> Inclusive services & goods commerce for provincial Philippines  
> Tagudin, Ilocos Sur · BSIT Capstone · dxtechph.online

---

## 📊 Status

```
Phase 1 · Analysis    ████████████ ✅ Complete
Phase 2 · Planning    ████████████ ✅ Complete
Phase 3 · Solutioning ████████████ ✅ Complete (26 ADRs · 31 tables · 3 epics)
Phase 4 · Sprint 0    ░░░░░░░░░░░░ 🔜 Next
```

---

## 🧱 Stack

| Layer | Tech |
|---|---|
| Backend | PHP 8.4 · Laravel 12 (Octane) |
| Frontend | React 19.2 · Inertia v3.6 · TypeScript |
| UI | Tailwind 4.3 · shadcn/ui 4.16 |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| Search | Meilisearch 1.51 (self-hosted) |
| Realtime | Laravel Reverb 1.11 |
| PWA | Dexie.js 4.4 (IndexedDB) |
| SMS | TextBee Android Gateway (swappable driver) |
| Payments | Xendit xenPlatform |
| AI | Serbi — Laravel AI SDK → OpenRouter |
| Infra | Dokploy on Proxmox · Cloudflare Edge · GitHub CI/CD |

---

## 📁 Planning Artifacts (Phase 1–3)

| Document | What it is |
|---|---|
| `prfaq-press-release.md` | Product vision & founder origin story |
| `prfaq-faq-challenges.md` | Trust, economics, competition, risk |
| `prd.md` | 9 sections — locked & patched |
| `ux-spec.md` | UX specification |
| `listing-model-taxonomy.md` | 4 listing types · 5 mechanisms · 10 archetypes |
| `architecture.md` | Topology, ERD, sequence diagrams, stack |
| `adr-catalog.md` | **26 Architecture Decision Records** |
| `epics-and-stories.md` | 3-epic core + Sprint 0 + 10 deferrals |
| `readiness-report.md` | Phase 4 clearance — all gates passed |
| `research-agenda.md` | Tracked research questions |
| `stakeholder-briefing.html` | Project summary deck |

All under `_bmad-output/planning-artifacts/`.

---

## 🧠 Architecture Deep-Dives

```
01 · Academic baseline & scope
02 · Agent network design rationale
03 · Cost model analysis
04 · Engineering architecture master reference
05 · Quick Deal & Deal-Chaining spec
```

Under `docs/critical-decision-brainstorming/`.

---

## 📱 Mockups & Decks

| File | Purpose |
|---|---|
| `docs/mockup.html` | Navigable hub — all 39 screens |
| `docs/deck-defense.html` | 16-slide defense deck |
| `presenter-script.html` | Printable speaker notes |

---

## 🗄️ Archived (Pre-BMAD)

```
old-docs/
  ├── architecture/     Connector, deal system, archetypes, inbox
  ├── brand/            Colors, typography, voice
  ├── case-studies/     Tricycle fulfillment
  ├── decisions/        D1–D29 decision matrix
  ├── mockup/           39 HTML screens + shared CSS/JS
  ├── roadmap/          Phased build plan
  ├── spikes/           Xendit, SMS, GPS validation
  └── strategies/       Industry coverage, strategy matrix
```

---

## 🔬 Research

| Document | Topic |
|---|---|
| `serbizyu-ph-regulatory-report.md` | BIR · BSP · DPA · DOLE · DTI · LGU |
| `serbi-ai-assistant-research.md` | Serbi AI — SDK patterns, caching, guardrails |
| `serbizyu-financial-architecture-research.md` | Balance caching + Xendit dependency |
| `serbizyu-stack-compatibility-report.md` | 13-component version audit |

---

## 🚀 Deferred (Phase 2+)

Serbi AI · Deal-Chaining · Kiosk · Compliance Dashboard · Boost/Ads · Points/Affiliate · Push Notifications · Channel Connectors · Backup Automation · Reverse Bidding
