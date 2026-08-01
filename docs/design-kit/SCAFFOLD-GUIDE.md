# How to Scaffold the Final Mockup — Junior Guide

Status: REFERENCE ONLY · read this top to bottom before writing any HTML
Audience: the agent/person building the mockup from the design kit
OpenSpec change: `openspec/changes/create-lofi-ui-design-kit/`

This guide is deliberately mechanical. If you follow the steps in order, you cannot drift far. When a step tells you to STOP and ASK, stop and ask — do not guess.

---

## PART 0 — Read these first (in this order, nothing else)

| # | File | What you take from it | Time |
|---|---|---|---|
| 1 | `docs/design-kit/README.md` | What the kit is, the 8 hard rules | 5 min |
| 2 | `docs/design-kit/index.html` (open in browser) | What every element looks like | 15 min |
| 3 | `docs/planning-hardening/10b-ux-ui-scenario-blueprints.md` | The scenario you are building: route, fixture, actors, failure branch, feedback task | 15 min |
| 4 | `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md` | For EACH screen you build: actor, user job, must-see, primary action, recovery | per screen |
| 5 | `docs/planning-hardening/10-ux-ui-reference-dossier.md` §8, §11, §12, §13 | Screen anatomy, state variants, interaction rules, banned words | reference |

Do NOT read the old `docs/mockup-v2/` or `old-docs/mockup/` for behavior. They are wrong in known ways. Visual inspiration only.

---

## PART 1 — The 10 golden rules (memorize, check every screen)

1. **One screen = one row in `10a`.** Fill the row's columns. Add nothing the row does not mention.
2. **One screen = one primary action.** Exactly one blue `dk-btn dk-primary`.
3. **Payment ≠ Work.** Any screen touching an Order shows the separation panel (kit §4.1). No exceptions.
4. **Cash is two-sided.** Never a single "Paid" toggle. Use the `dk-cash2` element (kit §4.2).
5. **Labels never come off.** `SANDBOX ONLY`, `PILOT-CONDITIONAL`, `REFERENCE ONLY`, offline banners — copy them with the element, always.
6. **No invented policy.** If the matrix row needs a deadline, fee, SLA, or rule that no source defines, use the policy-TBD element (kit §6.4) and STOP and ASK.
7. **Recovery is a state, not a toast.** Every screen must show its failure/recovery variant somewhere reachable (toggle, link, or annotated sibling).
8. **Fictional fixtures only.** Use the fixture from the scenario blueprint (names like `BUYER-01`, amounts like `₱80`). No real names, no real documents.
9. **Kit classes only.** Use `dk-*` classes from `docs/design-kit/styles.css`. If you need something new, build it from tokens (§0) and add it to the kit, not to one screen.
10. **Link, don't dead-end.** Every screen links forward and back along the scenario route. No orphan screens, no fake buttons that go nowhere — if an action has no screen yet, it opens the confirmation modal pattern or is visibly `disabled` with a reason.

---

## PART 2 — Where files go

Build inside `docs/mockup-v2/` (the old attempt there is disposable — overwrite it).

```text
docs/mockup-v2/
├── index.html              ← scenario picker (SYS-001) — link to every scenario
├── assets/
│   ├── dk.css              ← COPY of docs/design-kit/styles.css (do not edit here)
│   └── mockup.js           ← shared mockup behavior (router, state toggles)
├── scn-01/
│   ├── index.html          ← SCN-01 entry (its route step 1)
│   ├── ord-002.html        ← one file per screen in the route
│   └── ...
├── scn-07/
│   └── ...
└── README.md               ← what exists, what's covered, what's pending
```

Rules:

- One HTML file per canonical screen ID. Name = lowercased screen ID (`pay-003.html`, `ord-002.html`).
- If two matrix rows genuinely share one composition, one file is fine — but every covered screen ID must be selectable in a visible state switcher on that page.
- `dk.css` is a copy. If you change it, change `docs/design-kit/styles.css` first and re-copy. Screens never fork the kit.

---

## PART 3 — How to build ONE screen (the recipe)

Do this for every screen, in route order. Budget: 30–60 min per screen.

### Step 1 — Open the matrix row

Find your screen ID in `10a-ux-ui-screen-perspective-matrix.md`. Copy its row into your notes: Actor / User job / Must see / Primary action / Failure-recovery.

### Step 2 — Copy the screen template

Create `docs/mockup-v2/scn-XX/<screen-id>.html` from this exact skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__SCREEN_ID__ — __SCREEN_NAME__ | Serbizyu mockup</title>
<link rel="stylesheet" href="../assets/dk.css">
</head>
<body>
<main class="dk-main" style="max-width:760px;margin:0 auto;padding:24px">

  <!-- 1. SCREEN HEADER: ID badge + actor + goal (always) -->
  <header style="margin-bottom:16px">
    <span class="dk-badge dk-b-neutral">__SCREEN_ID__</span>
    <span class="dk-badge dk-b-info">Actor: __ACTOR__</span>
    <span class="dk-badge dk-b-sandbox">🧩 REFERENCE ONLY</span>
    <h1 style="font-size:22px;margin:8px 0 4px">__SCREEN_NAME__</h1>
    <p class="dk-note">Goal: __USER_JOB_FROM_MATRIX__</p>
  </header>

  <!-- 2. CONTEXT BANNERS: acting-for / offline / sandbox / hold, if the row needs them -->

  <!-- 3. MUST-SEE CONTENT: every item in the matrix "Must see" column, in priority order:
       user goal → immediate truth/risk → next action → supporting detail → history -->

  <!-- 4. PRIMARY ACTION BAR: exactly one dk-btn dk-primary, labeled with the matrix verb -->
  <div class="dk-actionbar" style="position:sticky;bottom:0">
    <button class="dk-btn dk-primary">__PRIMARY_ACTION__</button>
    <button class="dk-btn dk-ghost">Get help</button>
  </div>

  <!-- 5. RECOVERY VARIANT: the matrix "Failure/recovery" column, reachable on this page
       (a toggle, an annotated sibling state, or a linked variant) -->

  <!-- 6. NAV: previous + next route steps from the scenario blueprint -->
  <nav style="margin-top:16px;font-size:13px">
    ← <a href="__PREV__.html">__PREV_ID__</a> ·
    <a href="index.html">Scenario map</a> ·
    <a href="__NEXT__.html">__NEXT_ID__</a> →
  </nav>
</main>
</body>
</html>
```

### Step 3 — Fill the 8 blanks (and nothing else)

| Blank | Fill from |
|---|---|
| `__SCREEN_ID__` / name | Matrix row |
| `__ACTOR__` | Matrix row, col 2 |
| `__USER_JOB__` | Matrix row, col 3, verbatim |
| Must-see content | Matrix row, col 4 — one kit element per item |
| `__PRIMARY_ACTION__` | Matrix row, col 5 — use its verb |
| Recovery variant | Matrix row, col 6 |
| Prev/next | Scenario blueprint `Connected route` |
| Data | Scenario blueprint `Fixture` section only |

### Step 4 — Pick kit elements for each must-see item

| Must-see item type | Use this kit element |
|---|---|
| Status | `dk-badge` with icon + text |
| Order/Work/Payment | `dk-sep` separation panel (§4.1) — mandatory |
| Cash state | `dk-cash2` two-sided report (§4.2) |
| Lane meaning | lane card (§4.3) |
| Release eligibility | guard checklist (§4.4) |
| Evidence | evidence card (§5.1) |
| Agent context | acting-for banner + consent card (§2, §5.2) |
| History | `dk-timeline` (§5.4) |
| Physical meetup | safety panel (§6.3) |
| Unknown rule | policy-TBD placeholder (§6.4) |
| Air-gapped exchange | QR feed (§6.1) — copy the whole block incl. offline banner |
| Mechanism/shape choice | archetype composer (§6.2) — read-only mode is fine |

### Step 5 — Run the screen checklist (Part 4). Fix before moving on.

### Step 6 — Commit per screen (or per route chunk)

```bash
git add docs/mockup-v2 && git commit -m "mockup(scn-01): add pay-003 two-sided cash report"
```

Small commits. One scenario = one PR-sized chunk of commits.

---

## PART 4 — Screen checklist (paste into your notes, tick all before "done")

```text
[ ] Screen ID badge + actor badge visible at top
[ ] User goal written in plain language under the title
[ ] Every "Must see" item from the matrix row is on the page
[ ] Exactly ONE primary action, using the matrix verb
[ ] REFERENCE ONLY badge present
[ ] If payment-related: separation panel present, payment ≠ work
[ ] If cash: two-sided dk-cash2, no single "Paid" toggle
[ ] If sandbox lane: SANDBOX ONLY banner inside the card, not just the page
[ ] If conditional mechanism: PILOT-CONDITIONAL flag visible
[ ] Recovery/failure state reachable and labeled
[ ] Get-help route exists (button or link — never dead)
[ ] Prev/next links match the scenario route, and they work
[ ] Only fictional fixture data (names like BUYER-01, amounts from the blueprint)
[ ] No invented numbers: no deadlines, SLAs, fees, percentages, countdowns
[ ] Icon+text on every status (nothing color-only)
[ ] Works at 360px width (open devtools, check: no horizontal scroll)
```

---

## PART 5 — Build order (do not skip ahead)

| Batch | What | Screens | Done when |
|---|---|---|---|
| 0 | Shell | `index.html` (SYS-001 scenario picker), `assets/`, README | Picker links resolve; kit CSS loads |
| 1 | SCN-01 happy path | SYS-001→…→ORD-003 per route (~14 screens) | A reviewer can walk Buyer view end-to-end and answer "did Serbizyu hold the ₱80?" = No |
| 2 | SCN-01 role views | Same screens re-framed for Provider + Admin (state switcher or separate files) | Provider sees `Report cash received`; Admin sees both attestations |
| 3 | SCN-07 recovery | Missing-provider-report + mismatch + TRU-002 + OPS-003/004/005 | Recovery is visible without breaking batch-1 history |
| 4 | SCN-06 agent | AGT-001–004 + affected LST screens | Acting-for banner + revoke + forbidden-action block |
| 5 | SCN-02/03/05 | Appointment, handoff, digital delivery | Each keeps payment/work separation + its failure branch |
| 6 | SCN-04 | Purchase-on-behalf | Budget approval gate blocks overspend visibly |
| 7 | SCN-08/09 | Sandboxes | Persistent sandbox labels; guard checklist blocks bad release |
| 8 | SYS-002/003/004 polish | Role switcher, journey map, reset | Reviewer can navigate without help |

After each batch: show David. Do not start the next batch until the feedback task for the current one is answered. Batches 5–8 may be reordered by David.

---

## PART 6 — Verify before you say "done" (run these, paste output)

```bash
# 1. No banned/stale terms (must print nothing)
grep -rnEi "candon|gcash|xendit|semaphore|trust score|ID Verified|75/10/15|deal-chaining|24h|48h" docs/mockup-v2/ || echo "CLEAN"

# 2. No single-sided paid toggle (must print nothing)
grep -rniE "mark as paid|payment successful|paid ✓" docs/mockup-v2/ || echo "CLEAN"

# 3. No dead links (every href target must exist)
python3 - <<'EOF'
import re, pathlib
root = pathlib.Path("docs/mockup-v2")
bad = []
for f in root.rglob("*.html"):
    for href in re.findall(r'href="([^"#]+)"', f.read_text()):
        if href.startswith(("http", "mailto")): continue
        if not (f.parent / href).resolve().exists(): bad.append(f"{f}: {href}")
print("\n".join(bad) or "ALL LINKS OK")
EOF

# 4. Serve and click through the route yourself
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/docs/mockup-v2/ and walk SCN-01 with your mouse
```

---

## PART 7 — Common mistakes (wrong → right)

| Wrong (never do this) | Right (do this) |
|---|---|
| "Payment successful" | "You reported paying ₱80. Provider report missing." |
| One "Mark as paid" button | `dk-cash2`: Buyer reports paid / Provider reports received |
| Disabled button alone | Disabled button + reason text + what unblocks it |
| "Escrow protects your payment" | "Sandbox only — protected-release behavior is simulated" |
| Invented "resolve within 48h" | policy-TBD placeholder + STOP and ASK |
| Provider auto-confirms receipt | Provider gets `Report cash received`; silence ≠ proof |
| Completion marks payment done | Separation panel: Work completed, payment state unchanged |
| Toast says "Saved" | Toast + on-screen draft state ("saved on device, not submitted") |
| New one-off styles in a screen | Add the element to the kit, use `dk-*` everywhere |
| Building all 74 screens first | Batch 1–3, feedback, then continue |

---

## PART 8 — When to STOP and ASK David

Stop immediately, add a policy-TBD element, and ask when you need:

- Any deadline, countdown, expiry length, SLA, or appeal window.
- Any fee, percentage, split, or price not in the fixture.
- Any verification badge, ID requirement, or "verified" label.
- Any refund/recovery outcome for External Cash.
- A provider brand name for payments.
- Any behavior not in the matrix row or scenario blueprint.
- Anything that feels like it "should obviously work this way" but is not written down.

Write the question in the mockup README under "Open questions" so the placeholder and the question stay together.

---

## PART 9 — Definition of done (whole mockup)

- Every batch-1..8 checklist green; every screen checklist green.
- All 21 dossier review tasks demonstrable by clicking (dossier §14).
- All four lane behaviors visible; payment/work separation never violated.
- SCN-01→09 reachable from the picker; each failure branch reachable.
- Verification commands in Part 6 all clean.
- `docs/mockup-v2/README.md` lists: covered screens, pending screens, open questions.
- David has answered each scenario's feedback task.
