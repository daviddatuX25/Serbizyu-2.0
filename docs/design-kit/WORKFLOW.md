# Serbizyu UI Kit–First Workflow

**Status:** LOCKED process (2026-08-05)  
**Agent skill:** `.cursor/skills/ui-kit-first-development/SKILL.md`  
**Note:** Prefer also copying that skill into `.agents/skills/ui-kit-first-development/` and listing it in `boost.json` / `AGENTS.md` when those paths are writable (currently root-owned on this machine).  
**Pairs with:** backend Pest / Laravel skills (unchanged)

## Dual track

Backend and UI run together. Backend keeps current tests and domain guidance. UI must not invent chrome without capability truth.

```text
Domain / backend                  UI / experience
─────────────────                 ────────────────
HLD/LLD + contracts               Inventory gap check
Actions, policies, schema         UX psychology + placement
Pest / feature tests              Light hi-fi kit prototype(s)
Ship capability truth       ←→    Founder choose → solidify in kit
                                  Then permanent React from kit
```

## Authority

| Concern | Source |
|---|---|
| Look + specimens | `docs/design-kit/index.html` + `styles.css` |
| Gaps / backlog | `ELEMENT-INVENTORY.md` |
| Behavior | UX dossier / PRD / planning contracts |
| Live UI | `resources/js/` matching solidified kit |

## New feature / non-trivial UI (required)

1. **Capability truth** — what works now; roles; empty/loading/error/disabled+reason. BLOCKED if domain unresolved.
2. **UX psychology & placement** (short notes) — primary job; primary action placement; hierarchy (context → truth → decision → recovery); one primary verb; icon+text status; privacy projection; no roadmap pollution.
3. **Light hi-fi in the kit** — 1–2 alternatives only when the choice matters; Tagudin fixtures; serve `/design-kit/` for review.
4. **Choose → solidify** — update kit + inventory row.
5. **Live implement** — match kit; strip dead chrome; Pest + focused UI checks.

## Foundation pass (current next step)

Kit already accepted → skip alternate prototypes. Align live Auth → Onboarding → My Listings → Browse → Detail to the kit. Remove Activity / pollution chrome. Do not build unique features in this pass.

## Stack (accepted)

- Kit: hi-fi SoT  
- Live: Tailwind + owned shadcn-style primitives themed to kit forest tokens  
- Until install: do not pretend shadcn is present

## Anti-patterns

React page before kit specimen · nav without backend truth · second lo-fi kit · unthemed shadcn · left-border status · color-only meaning · feature scope during foundation pass
