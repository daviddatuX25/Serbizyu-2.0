# Serbizyu UI Kit–First Workflow

**Status:** LOCKED process (2026-08-05)  
**Agent skill:** `.cursor/skills/ui-kit-first-development/SKILL.md`  
**Note:** Prefer also copying that skill into `.agents/skills/ui-kit-first-development/` and listing it in `boost.json` / `AGENTS.md` when those paths are writable (currently root-owned on this machine).  
**Pairs with:** backend Pest / Laravel skills (unchanged)

## Current program goal

Before broad connected frontend integration, explore the unbuilt marketplace surfaces as a sequence of simple static mobile session mocks. The canonical 37-session backlog and wave order live in:

`../../_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/FRONTEND-FIRST-SOLUTION-DESIGN.md` §8.3.

Each session fixes one fictional actor, relationship, resource state, and decision at its own URL under `docs/design-kit/sessions/`. It is visual discovery—not a second application. Do not add role switching, shared mutable fixtures, fake authentication, persistence, policy engines, command dispatch, or backend calls. Shared kit assets are allowed; repeated page markup is acceptable.

The long-term goal is to expose and resolve missing interfaces, state meaning, recovery, and architecture questions before implementing the corresponding vertical React/Inertia plus Laravel integration. Findings update the projection matrix, architecture, and OpenSpec first. Static mocks never become behavioral authority.

## Dual track

```text
Architecture / behavior             UI / experience discovery
───────────────────────             ─────────────────────────
Spine + projection matrix           Select one backlog session
OpenSpec capability contract        Fixed actor/state mobile mock
Resolve discovered policy gaps  ←→  Founder review + UX/QA refinement
Backend vertical capability         Permanent React/Inertia integration
```

## Authority

| Concern | Source |
|---|---|
| Look + specimens | `docs/design-kit/index.html` + `styles.css` |
| Gaps / backlog | `ELEMENT-INVENTORY.md` |
| Behavior | UX dossier / PRD / planning contracts |
| Live UI | `resources/js/` matching solidified kit |

## One-session procedure

1. Select exactly one row from the §8.3 session backlog.
2. Load its cited architecture, projection-matrix rows, and OpenSpec requirements; do not infer missing policy.
3. State the fixed actor, relationship, resource state, primary decision, and recovery state.
4. Create or refine only that static mobile HTML session; one or two alternatives only when a real choice needs review.
5. Apply accessibility, responsive, UX-writing, visual-detail, and QA passes when requested.
6. Record any behavior/schema/authorization gap upstream before choosing a permanent interaction.
7. Mark the visual direction selected; do not implement React or Laravel until a separately authorized vertical build task.

## Visual authority and inspiration

- **Authority:** `docs/design-kit/index.html`, `styles.css`, brand assets, and accepted taste decisions.
- **Theme:** Serbizyu forest, warm neutral/paper surfaces, restrained mango/coral accents, concrete Tagudin fixtures, icon-plus-text status/action, and one primary verb.
- **Glovo:** interaction inspiration only—mobile-commerce hierarchy, compact discovery, sticky action placement, sheets, and progressive disclosure where they fit the Serbizyu task.
- **Never copy from Glovo:** branding, color palette, proprietary assets, marketplace semantics, navigation labels, dark patterns, or business rules.
- The Serbizyu kit and accepted architecture always override external inspiration.

## New feature / non-trivial UI

1. **Capability truth** — what works now; relationships; empty/loading/error/disabled+reason. BLOCKED if domain unresolved.
2. **UX psychology & placement** — primary job; hierarchy (context → truth → decision → recovery); one primary verb; icon+text status; privacy projection; no roadmap pollution.
3. **Static session mock** — fixed actor/state URL, Tagudin fixture, no behavior engine.
4. **Choose → record** — preserve the selected visual direction and upstream findings.
5. **Later live implementation** — implement the separately authorized vertical slice in React/Inertia against Laravel authority.

## Current next step

Work through Wave A of the persisted session backlog one file at a time, starting with `request-service-builder.html`. This workflow records the goal only; it does not authorize bulk mock generation or connected frontend/backend implementation.

### Creation Interface Pattern (Request, Service, Product)

Creation flows default to a **Glovo-inspired minimal full-bleed onboarding stepper**:
1. **Full-Bleed Canvas:** No nested cards, borders, or grey containers. Pure clean canvas with generous white space and 24px conversational headline per step ("one-by-one friendly ask").
2. **Bottom Thumb Dock:**
   - 3 organic pill progress dots (`[ ▬▬ ] [ ● ] [ ● ]`).
   - Tactile primary CTA button ("Continue" on intermediate steps; only "Post Request" / "Publish" on the final step).
   - "⚡ Switch to all-in-one form" mode toggle.
3. **Advanced Mode (Power User Canvas):**
   - Toggles into the all-in-one dense creator canvas (clean cards, interactive flow canvas, deal chain macro trigger).
   - Stripped of form nuisance (no `*`, `(Required)`, `(Optional)`, or warning lectures).
   - "🌱 Switch to step-by-step guide" toggle returns to guided onboarding.
4. **State Integrity:** Both modes bind to the exact same underlying form inputs, ensuring zero state loss across view transitions.

### Canonical Order Detail & Chat Architecture (Locked 2026-09-17)

1. **One True Order Detail Page (`order-detail-mobile.html`):**
   - Eliminates disjointed competing screens. `deal-chain-active.html` forwards directly to `order-detail-mobile.html`.
   - **Deal Chain Project Variation:** Execution relay displays the signature animated moving dashed lines (`animation: dashMoveV 1.2s linear infinite;`), dependency gating connectors, and focus states (settled muted / active focus / gated muted).
   - **Solo Order Variation:** Displays single verified provider card, route/fare, and return ride booking.
   - **Desktop Meta Context Switcher:** Pinned outside the phone shell in the studio banner (`[Deal Chain Project (#ORD-7721)]` | `[Solo Order (#ORD-619)]`), keeping the in-page mobile shell 100% true to production.
   - **No Repeated Prices:** Prices live strictly in the Invoice section and macro hero; removed from individual execution slot cards to isolate logistics from billing.
   - **One Status Per Node:** Execution slots carry exactly ONE definitive, latest status badge (e.g. `[Sourced at Counter]`, `[In Transit (ETA ~8m)]`, `[Waiting on Slot 2 delivery]`), removing multi-chip intermediate clutter.
   - **Fixed Bottom Dock:** Primary actions (`[Open Team Relay Room]` or `[Book Return Ride]`) are anchored at the base of the screen with an audit footnote.

2. **Minimalist Graphic Invoice Pattern:**
   - **Zero Word Bloat:** Stripped of all multi-sentence legalistic descriptions about escrow custody and release rules.
   - **Pure Vector Hierarchy:** Monochrome 32px SVG icon boxes (Wrench, Package, Delivery Truck, Cab), exact numbers in `JetBrains Mono`, clean divider, and total line.

3. **3-Tier Chat Architecture:**
   - **Pre-Order Negotiation (`bidding-negotiation.html`):** Pre-agreement proposal versioning, toggleable between Buyer View and Bidder/Provider View with Glovo wave counteroffer drawer.
   - **1:1 In-Order Fulfillment (`order-chat-mobile.html`):** Messenger-style clean header (`Kuya Ben`, `Active now`, call button `[📞]`, no ID tags), centered milestone pills, and `+` button opening the Glovo wave bottom drawer for photo/video evidence, location pins, and checkpoints.
   - **Multi-Party Relay Room (`deal-chain-chat-mobile.html`):** Coordinated cross-slot logistics without pinned tab clutter. Tapping any participant avatar opens the Glovo wave drawer displaying handoff relations with direct `[💬 1:1 Message]` and `[📞 Call]` actions.


## Stack (accepted)

- Kit: hi-fi visual SoT (static HTML/CSS specimens — not a running React app)  
- Live: Laravel + **Inertia React** + Tailwind v4 + **real shadcn** (Nova/Radix) under `resources/js/components/ui/`, themed to kit forest tokens  
- Not used: Inertia Svelte  

## Anti-patterns

React page before kit specimen · nav without backend truth · second lo-fi kit · unthemed shadcn · left-border status · color-only meaning · feature scope during foundation pass
