---
name: ui-kit-first-development
description: "Runs Serbizyu's dual-track UI/UX workflow: hi-fi kit light prototype and founder choice before permanent React/Inertia UI, hand-in-hand with backend Pest/domain work. Activates when adding or changing product pages, screens, navigation, components, design tokens, new features with UI, adopting the design kit, hi-fi prototyping, or when the user mentions UI/UX psychology, placement, kit extension, or foundation UI pass."
---

# UI Kit–First Development

Canonical process contract: `docs/design-kit/WORKFLOW.md`.

## When to Apply

Activate whenever work touches **visible product UI** or **new feature surfaces**, including pages, nav, tokens, components, kit extension, or foundation UI pass.

Pair with `inertia-react-development` (React/Inertia), `pest-testing` / `laravel-best-practices` (backend). Architecture / planning authorities still gate domain/state/schema.

## Dual track

```text
Domain / backend                  UI / experience
HLD/LLD + contracts               Inventory gap check
Actions, policies, schema         UX psychology + placement
Pest / feature tests              Light hi-fi kit prototype(s)
Ship capability truth       ←→    Founder choose → solidify in kit
                                  Then permanent React from kit
```

- Backend skills stay as today.
- UI must not invent behavior or chrome without capability truth (no Activity feed before activity exists).

## Required before permanent UI (new / non-trivial)

1. Capability truth (or BLOCKED)
2. UX psychology & placement notes (primary job, action placement, hierarchy, one primary verb, icon+text, pollution ban)
3. Light hi-fi kit prototype (1–2 alts only if meaningful)
4. Founder choose → solidify kit + inventory
5. Live implement + verify (Pest + UI checks)

## Foundation pass exception

Accepted kit already exists → skip alternate prototypes; align live foundation surfaces; strip dead chrome; no unique-feature scope.

## Stack (locked 2026-08-05)

Tailwind + owned shadcn-style primitives themed to `docs/design-kit/` forest tokens. Until install lands, do not pretend shadcn is present.

## Authority

- Look: `docs/design-kit/index.html` + `styles.css`
- Gaps: `docs/design-kit/ELEMENT-INVENTORY.md`
- Process: `docs/design-kit/WORKFLOW.md`
