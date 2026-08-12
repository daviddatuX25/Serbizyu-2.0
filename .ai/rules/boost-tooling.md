---
globs: boost.json, .cursor/mcp.json, .codex/**, .agents/skills/**, .cursor/skills/**, AGENTS.md
---

# Laravel Boost & Agent Tooling

- **Agents:** Keep both `codex` and `cursor` in `boost.json`. Re-run `COMPOSE_FILE=compose.sail.yaml vendor/bin/sail artisan boost:install` (or `boost:update`) after Boost/package upgrades.
- **Sail MCP:** This repo uses `compose.sail.yaml` for the Sail `laravel.test` service. Laravel Boost MCP must set `COMPOSE_FILE=compose.sail.yaml` (see `.cursor/mcp.json` and `.codex/config.toml`). Plain `vendor/bin/sail` against `compose.yaml` will miss `laravel.test`.
- **Skills:** Boost skills live in `.cursor/skills` (Cursor) and `.agents/skills` (Codex). Keep `infer-conventions` installed — use it to record durable conventions into `.ai/rules` via Boost `record-rule`.
- **Project rules:** Settled app conventions belong in `.ai/rules` (not personal memory). Read `.ai/rules/index.md` before planning or editing.
- **Schema visualization (Truss):** `albertoarena/laravel-truss` (dev) renders the live schema as an ER diagram at `/truss` on the Sail `laravel.test` app (`http://localhost:8081/truss`). Local env only; the production `compose.yaml` app (port 8080) does not expose it. Use `vendor/bin/sail artisan truss:*` for CLI exports/diffs (`truss:export`, `truss:diff`, `truss:doctor`).
