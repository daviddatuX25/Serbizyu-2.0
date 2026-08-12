# Serbizyu

> **Bayanihan Street → Digital Marketplace** · Inclusive services & goods commerce for provincial Philippines
> Tagudin, Ilocos Sur · BSIT Capstone · dxtechph.online

## What Serbizyu is

Serbizyu turns the bayanihan street into a **local-first marketplace**: neighbors in Tagudin
can browse what's active nearby, sign in with their phone number, set up a verified local
profile, and offer or request services and goods — with clear, honest information at every
step.

- **Local first** — pilot scope is Tagudin only; geography, trust, and cash-first dealing are the product.
- **Cash-first, low barrier** — the platform never holds money. Payment is declared between neighbors (External Cash / External Digital Proof today; Direct & Tiwala Protected Digital are sandbox-only).
- **Capability-honest** — deferred features render as deferred, never as committed promises.
- **Identity-forward** — phone-first OTP sign-in; profile & trust setup first, ID verification and permits come later as their own formalization track.

## Status

```
Phase 1–3 · Analysis/Planning/Solutioning ✅ Canonical planning authority
E0 · Implementation               🔒 Conditional — foundation contracts first
Tagudin pilot / live money        🔒 Not cleared
```

The rebuilt planning chain is founder-approved for planning authority. This does **not**
authorize production migrations, live payments, production Tiwala, sensitive-ID collection,
deployment, or genuine Tagudin validation.

## Development

**Docker Compose is the primary run & deploy path** (`compose.yaml`: `db` postgis → `redis` →
`mailpit` → `app` php-fpm → `web` nginx, all healthchained):

```bash
cp .env.example .env          # then set APP_KEY + DB_PASSWORD (compose refuses to start without them)
docker compose up -d --build
docker compose exec app php artisan key:generate   # first run only
docker compose exec app php artisan migrate
docker compose exec app php artisan test

# App → http://localhost:8080 · Mailpit UI → http://127.0.0.1:8025
# The Dockerfile runs `npm run typecheck && npm run build` in its assets stage,
# so a compose build also verifies the frontend.
```

Frontend-only work (React 19 · Inertia 3 · TypeScript 5.9 · Vite):

```bash
npm install
npm run dev          # or: npm run build / npm test / npm run typecheck
```

Sail (`compose.sail.yaml`) and ephemeral `composer:2` containers remain valid
alternatives for isolated backend work; `compose.yaml` is the canonical stack.

| Layer | Locked baseline |
|---|---|
| Backend | PHP 8.4 · Laravel 12 · PHP-FPM, modular monolith w/ hexagonal ports & adapters |
| Frontend | React 19 · Inertia 3 · TypeScript 5.9 · Vite |
| UI | Rebuilt UX token/CSS contract (`resources/css/design-system.css`); Tailwind/shadcn are utilities, not authority |
| Database | PostgreSQL 16 + PostGIS 3.x |
| Payments | External Cash + External Digital Proof baseline; Direct/Tiwala sandbox-only |
| Infra | Docker Compose (`compose.yaml`) primary run path; Dokploy later promotion target only |

**Agent/editor context lives in the repo** so any machine picks up the same conventions:
`AGENTS.md` (workflow), `.ai/rules/` (settled decisions & standing constraints), `.agents/skills/`
& `.cursor/skills/` (framework guidance), `openspec/changes/` (OpenSpec change packages).

## Architecture & data model

- **Canonical ERD — full table view** [`docs/planning-hardening/07-canonical-erd.svg`](docs/planning-hardening/07-canonical-erd.svg) — the founder-approved 58-table schema across eight bounded modules ([PNG export](docs/planning-hardening/07-canonical-erd.png), [Deal-Chaining foundation ERD](docs/planning-hardening/07-deal-chaining-foundation-erd.svg)). Schema authority: `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md` + `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`.
- **Generated architecture export (2026-08-09)** — `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/`:
  - `ARCHITECTURE-SPINE.md` — paradigm, scope, module map, binds E0–E9
  - `PROGRAM-IMPLEMENTATION-PLAN.md` — delivery sequencing
  - `FOUNDER-DECISION-BRIEF.md` — decisions needing the founder
  - `FINAL-READINESS-REPORT.md` — readiness baseline + review records (`reviews/`)
- **Architecture deep-dives** — `docs/critical-decision-brainstorming/` (01 academic baseline · 02 agent network rationale · 03 cost model · 04 engineering master reference · 05 Quick Deal & Deal-Chaining spec).
- **Implementation contracts** — `docs/planning-hardening/` (payment-lane policy, capability matrix, artifact authority map, story contract & E0 pack, runtime/environment contract, dev standards, UX/UI dossier).

## Docs & planning artifacts

| Where | What |
|---|---|
| `_bmad-output/planning-artifacts/` | Canonical planning authority: PRD (59 reqs), UX spec (23 journeys), domain/state contracts, canonical schema (58 tables), ADR catalog (28), architecture blueprint, E0–E9 epics |
| `docs/planning-hardening/` | P0 implementation contracts, ERD exports, UX/UI reference dossier, founder decision records |
| `openspec/changes/` | OpenSpec change packages (proposal → design → tasks → delta spec) |
| `docs/audits/` | Verified audit evidence (schema, UX closure, deal-chaining ERD) |
| `old-docs/mockup/` | Historical 39-screen HTML mockup — visual input only, **not** implementation authority |
| `docs/research/` | Research notes (auth UX guidance, etc.) |

## Deferred (Phase 2+)

Serbi AI · bounded Deal-Chaining functionality · Kiosk · Compliance Dashboard · Boost/Ads ·
Points/Affiliate · Push Notifications · Channel Connectors · Backup Automation · Reverse Bidding
