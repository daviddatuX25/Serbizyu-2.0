# Serbizyu — WorkflowBuilder & Work Presentation Spec
*How Work is built by servicers and shown to buyers. Two audiences, two interfaces, one underlying engine.*

---

## 1. The Two Interfaces

The Work engine has exactly two presentation surfaces:

1. **WorkflowBuilder** — the servicer-facing editor. Creates and edits Work Templates.
2. **Work Presentation Layer** — the buyer-facing renderer. Turns a Work Template (or live Work Instance) into a visual the buyer understands.

Both are driven by the same JSONB `structure`. Neither knows the other's layout logic. The contract between them is the template schema, nothing more.

---

## 2. Buyer-Facing Work Presentation

The buyer never sees "JSONB structure." They see one of three render modes, chosen automatically from the template's archetype:

### Mode 1: Milestone Stepper (A1, A7)
```
[✓ Design approved] — [✓ Frame built] — [● Painting] — [○ Delivery]
        ₱2,000             ₱3,000           ₱2,500          ₱2,500
              Released       Released      In progress       Pending
```
- Horizontal stepper, each node a milestone with label, amount, status.
- Current step expands to show proof (photos/files) and the sign-off button.
- Used on: project services, quoted work.

### Mode 2: Live Tracker (A2, A8)
```
  [map with driver position + route]
  
  ● En route to pickup — 4 min away
  ○ Passenger boarded
  ○ En route to dropoff
  ○ Ride completed
```
- Map-first layout. Step list is secondary, below the map.
- Real-time via Reverb channel. GPS dot animates.
- Used on: dispatch, transport, emergency.

### Mode 3: Simple Status Card (A3, A4, A5, A6, A9, A10)
```
  ┌─────────────────────────────────┐
  │  Scheduled: Sat, July 20, 2 PM   │
  │  Status: Confirmed               │
  │  Provider: Mang Tomas (✓ ID)     │
  │  [Reschedule]  [Message]         │
  └─────────────────────────────────┘
```
- Single status line, next action prominent. No stepper needed when there's one event.
- Rental (A5) variant shows two cards: checkout and return, each with photo checklist.
- Recurring (A6) variant shows a cycle list: "Visit 4 of 12 — completed ✓".

**The rule:** the buyer's UI complexity is proportional to the archetype's actual complexity. A haircut never shows a Gantt chart.

---

## 3. WorkflowBuilder — Servicer-Facing Editor

### 3.1 Entry Points

| Entry | Who | Result |
|---|---|---|
| "Use recommended template" | New servicer, common category | Tier-1 preset cloned to their account, zero editing required |
| "Customize template" | Servicer straining preset | Tier-2: edit labels, proof requirements, amounts, timeouts |
| "Describe how you work" | Unusual category | Tier-3: LLM drafts a structure from plain language, servicer edits and approves |

The default path is always the preset. Customization is one click deeper. AI drafting is two clicks deeper. Complexity is opt-in, never imposed.

### 3.2 Builder Canvas (React, dnd-kit)

```
┌────────────────────────────────────────────────────────┐
│  Template: Standard Tricycle Ride          [Preview ▶] │
├──────────────┬─────────────────────────────────────────┤
│  PALETTE     │  CANVAS                                 │
│              │                                         │
│  + Step      │  ┌─[1] En route to pickup ──────────┐   │
│  + Tool      │  │ Proof: GPS auto                   │   │
│  + Condition │  │ Auto-advance: within 500m         │   │
│              │  └───────────────────────────────────┘   │
│  Tools:      │              ↓                           │
│  ▸ Map       │  ┌─[2] Passenger boarded ────────────┐  │
│  ▸ Calendar  │  │ Proof: Driver confirms            │  │
│  ▸ Document  │  └───────────────────────────────────┘  │
│  ▸ Weather   │              ↓                           │
│              │  ┌─[3] En route to dropoff ──────────┐  │
│              │  └───────────────────────────────────┘  │
│              │              ↓                           │
│              │  ┌─[4] Completed ─────────────────────┐  │
│              │  │ Proof: Passenger confirms          │  │
│              │  │ ★ Releases escrow                  │  │
│              │  └───────────────────────────────────┘  │
├──────────────┴─────────────────────────────────────────┤
│  Contract check: ✓ status mapping  ✓ escrow trigger    │
│  ✓ buyer proof visible at every step                   │
│                              [Save Draft]  [Publish]   │
└────────────────────────────────────────────────────────┘
```

**Interactions:**
- Drag steps to reorder (where the archetype permits reordering; A2's GPS chain doesn't).
- Drag a tool from the palette onto a step → config drawer opens (form generated from the tool's `configSchema()`).
- Click a step → edit label, proof type, auto-advance condition, timeout.
- Toggle on any step: "Releases escrow" (full or percentage).

### 3.3 The Contract Checker (always on)

The builder continuously validates the template against the Work contract:

| Check | Error if violated |
|---|---|
| Status mapping | Every step maps to a valid `status` enum value |
| Escrow trigger | Exactly one step (or explicit milestone set) releases funds |
| Buyer proof | Every step declares what the buyer sees |
| Timeout safety | Auto-advancing steps have a timeout or a dispute path |
| Tool compatibility | Tools attached are valid for the Offer's category |
| Dispute path | Every non-terminal step can reach `disputed` |

Publish is blocked until all checks pass. This is the structural enforcement of §5a's non-negotiable boundary: creativity inside, contract outside.

### 3.4 Tier-3 AI Drafting Flow

1. Servicer picks "Describe how you work."
2. Plain-language prompt: *"I deliver frozen goods to sari-sari stores every Tuesday and Friday. Stores order the day before. I collect payment on delivery for some, weekly for regulars."*
3. LLM returns a draft structure (archetype guess: A6 recurring + A4 handoff hybrid), step list, proof suggestions, and a confidence note.
4. Draft loads into the builder canvas as editable blocks. Servicer adjusts, contract checker validates, human publishes.
5. Nothing goes live from the LLM directly. The servicer is the publisher; the model is the typist.

**Guardrails:** The LLM receives the archetype library as context and must output one of the ten shapes or a documented composition of two. No free-form structures. This keeps tier-3 inside the contract.

---

## 4. Template Marketplace (Phase 3+)

Once enough servicers build good tier-2 templates, let them share:

- A servicer in Candon publishes their "Lechon Fiesta Package" template.
- A lechon vendor in Vigan clones it, adjusts prices, publishes their own Offer in minutes.
- Template attribution + optional "featured template" slot in the builder palette.

This turns workflow design into a community asset. The best operator in each category effectively writes the playbook for everyone else. Serbizyu curates, never auto-applies.

---

## 5. Offer Page: How Work Shows Up Pre-Booking

Before booking, the buyer sees the Work Template as a promise:

```
What happens when you book:

  1. Driver heads to your pickup point (you'll see them on the map)
  2. You confirm you're aboard
  3. Driver takes you to your destination
  4. You confirm arrival — payment is released

Your ₱45 is held by Serbizyu until step 4. 
```

Generated from the template's step list + escrow config. Every Offer page gets this for free — the template *is* the sales copy for the process. Trust is structural, so the structure is shown.

---

## 6. Ops View: Work Instance Debugger

Admin/Ops dashboard gets a raw view per instance:

- Current status + full step state (JSON pretty-printed)
- Event history (every transition, who triggered it, timestamp)
- Proof artifacts (photos, GPS logs, confirmations)
- Contract mapping: which steps touched escrow, notifications fired
- Force-transition control (dispute resolution tool, audit-logged)

This is the support team's truth serum: when a buyer says "the driver never arrived" and the GPS log shows 40 minutes at the pickup point, the dispute resolves itself.

---

## 7. What the Builder Does NOT Do

- No scripting. Conditions are chosen from a finite list (GPS radius, time elapsed, confirmation received), not free code.
- No arbitrary state machines. Archetype shapes are the vocabulary; tier-3 compositions are still archetype-shaped.
- No payment logic beyond "this step releases escrow / this percentage." Splits, refunds, and penalties live in Payments, not the builder.
- No multi-party orchestration in v1 (e.g., a wedding needing caterer + band + photographer as one Work Instance). That's three Orders linked by a "project" tag, Phase 3+ at the earliest.

---

## 8. Build Order

| Phase | Builder capability |
|---|---|
| 1 | No builder. Four preset templates (A1, A3, A4, A9), hardcoded, assigned by category. |
| 2 | Tier-2 builder: edit labels, proof types, amounts, timeouts on presets. A2 configured for tricycle pilot. Buyer presentation modes 1–3. |
| 3 | Tool palette (Map, Calendar, Document), tier-3 AI drafting, template cloning/marketplace, contract checker as a standalone validation service. |

The sequencing mirrors the full spec's §12: prove liquidity with presets, earn the right to build the builder.

---

*End of WorkflowBuilder & Work Presentation Spec. The buyer sees a promise, the servicer sees a canvas, the engine sees a contract. Three views, one truth.*
