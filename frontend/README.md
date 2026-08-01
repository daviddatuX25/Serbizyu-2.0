# Serbizyu High-Fidelity Frontend

Status: frontend-first implementation foundation · synthetic review environment
OpenSpec: `../openspec/changes/implement-hifi-frontend-foundation/`

## Stack

- React 19.2
- TypeScript 5.9
- Vite 7
- Tailwind CSS 3
- TanStack Query
- React Router (hash routes for GitHub Pages review)
- Lucide icons

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run typecheck
npm run build
```

The Vite build writes to `../docs/app/` so the current GitHub Pages `/docs` source can publish it at:

```text
https://daviddatux25.github.io/Serbizyu-2.0/app/
```

## Architecture boundary

`src/api/mock.ts` exposes endpoint-shaped operations that can later be replaced by Laravel/Inertia actions without rewriting pages or product components. All records are deterministic synthetic fixtures; no real payment, identity evidence, or Tagudin pilot record is created.

## Product areas

- `/` — role-adaptive Home
- `/explore` — services and open requests
- `/deal` — coherent Deal Room: Work, payment, messages, evidence, timeline
- `/payments` — lane and obligation clarity with two-sided External Cash reporting
- `/patterns` — full high-fidelity design and product-pattern laboratory

The role switcher changes hierarchy and allowed actions while preserving the shared Order facts.
