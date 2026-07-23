# Serbizyu — Deal System Specification (Quick Deal + Deal-Chaining)

*Harmonized specification resolving integration gaps between D28 (Deal System) and the existing Order state machine (D6), Escrow (D21), Notifications (D25), Disputes (D24), Cash Handling (D27), Work Engine, Fulfillment Archetypes, and Agent Model (D19).*

---

## Table of Contents

1. [Deal System Overview](#1-deal-system-overview)
2. [Quick Deal Specification](#2-quick-deal-specification)
3. [Deal-Chaining Specification](#3-deal-chaining-specification)
4. [State Machine & Status Contract](#4-state-machine--status-contract)
5. [Escrow Architecture](#5-escrow-architecture)
6. [Dispute Propagation Rules](#6-dispute-propagation-rules)
7. [Archetype Compatibility Matrix](#7-archetype-compatibility-matrix)
8. [Notification Events (extends D25)](#8-notification-events-extends-d25)
9. [Agent-Managed Deal Rules](#9-agent-managed-deal-rules)
10. [Cancellation & Cascading](#10-cancellation--cascading)
11. [Quick Deal QR Security](#11-quick-deal-qr-security)
12. [Cash Handling in Deals](#12-cash-handling-in-deals)
13. [Work Engine Integration](#13-work-engine-integration)
14. [Pricing & Fee Calculation](#14-pricing--fee-calculation)
15. [Schema Changes](#15-schema-changes)
16. [Build Order & Phase Placement](#16-build-order--phase-placement)
17. [Design Rationale & Resolved Tensions](#17-design-rationale--resolved-tensions)

---

## 1. Deal System Overview

The Deal system introduces two new transaction primitives that sit **between listing browsing and Order creation** in the marketplace flow.

```
Listing / Servicer Profile
        │
        ├── [Book Now]  → Standard Order (existing D6 path)
        ├── [Quick Deal] → Impromptu face-to-face → Dual confirmation → Order
        ├── [Reviews]   → Trust display (existing)
        └── [Message]   → Inbox (existing)

        ┌── Deal-Chaining (project-tagged linked Orders)
        │     Slot 1 ── Order (Servicer A)
        │     Slot 2 ── Order (Servicer B)   ← complete all → completed
        │     Slot 3 ── Order (Servicer C)
```

### Key Terminology

| Term | Definition |
|------|-----------|
| **Deal** | A container that groups multiple Orders into a coordinated transaction. Has its own lifecycle. |
| **Slot** | A position within a Deal that will be filled by one Order from one Servicer. |
| **Quick Deal** | A face-to-face impromptu transaction initiated by QR scan. Converts to a single Order on dual confirmation. NOT a Deal-Chain — Quick Deal generates exactly one Order. |
| **Deal-Chain** | A multi-slot Deal with 2+ servicers. Each slot is an independent Order with its own Work Instance. |
| **Deal Owner** | The party who created the Deal (either buyer or a servicer, per D28 "either party can invite"). |
| **Slot Invitation** | A pending offer to a servicer to fill a Deal slot. |

### Architectural Constraint

The Deal system is an **Order orchestration layer**, not a replacement for the Order/Work engine. Every slot eventually becomes an Order with its own Work Instance (D6), its own WorkStatus, and its own escrow tracking. The Deal layer coordinates lifecycle, notifications, and dispute handling across slots.

**This resolves the conflict with WorkflowBuilder spec §7** ("No multi-party orchestration in v1"): the WorkflowBuilder remains single-servicer. Deal-Chaining orchestrates multiple existing Work Instances — it does not build a multi-servicer Work Instance. The Work engine never sees a Deal; it only sees individual Orders.

---

## 2. Quick Deal Specification

### 2.1 Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      QUICK DEAL FLOW                            │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Buyer scans QR ──→ Landing page ──→ Taps "Quick Deal"          │
│       │                                                            │
│       ▼                                                            │
│  Price negotiation screen:                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Servicer: Mang Jose's Tricycle                               │ │
│  │ Service: Standard Trip                                        │ │
│  │ Suggested price: ₱50                                         │ │
│  │ Your offer: [____₱40____]                                    │ │
│  │ Message to Mang Jose: [__short_trip__]                       │ │
│  │ [Send Offer]                                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│       │                                                            │
│       ▼                                                            │
│  Servicer notified (in-app + SMS if applicable)                   │
│       │                                                            │
│       ▼                                                            │
│  Servicer reviews offer: [Accept ₱40] [Counter ₱45] [Decline]    │
│       │                                                            │
│       ├── Accept → Dual confirmation → Order Created              │
│       ├── Counter → Buyer reviews counter: [Accept] [Decline]     │
│       │               │                                            │
│       │               ├── Accept → Order Created                  │
│       │               └── Decline → Deal expired                  │
│       └── Decline → Deal expired (buyer notified)                 │
│                                                                  │
│  On Order Created: standard Order state machine + Work Instance  │
│  Escrow created per D21 rules, with an ORIGIN flag 'quick_deal'  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 QR Behavior

- **One QR per servicer**, not per listing. Scanning the QR opens a landing page showing the servicer's profile, primary listing, and action buttons (Book Now, Quick Deal, Reviews, Message).
- The QR is **static** (no time limit on the QR image itself). The landing page it serves is dynamic and reflects current servicer availability.
- Servicer can **toggle Quick Deal availability** on/off from their dashboard. When off, the QR landing page still shows but the Quick Deal button is disabled with message "Servicer is not accepting Quick Deals right now."

### 2.3 Listing Association

When a Quick Deal converts to an Order, it **must be associated with one of the servicer's active listings**. This determines:
- Which category attributes apply
- Which archetype drives the Work Instance
- The commission rate (per D17 category overrides)

**If the servicer has no active listings**, the Quick Deal flow prompts them to create a minimal listing first (name, category, price). This listing is auto-drafted and goes live on Quick Deal confirmation.

**If the servicer has multiple active listings**, the Quick Deal landing page shows a service picker so the buyer selects which service they're requesting.

### 2.4 Dual Confirmation

The Quick Deal is NOT an Order until both parties confirm. This protects against:
- Buyer scanning a QR and claiming a deal was made
- Servicer claiming a price the buyer didn't agree to

Dual confirmation takes one of two forms:
1. **In-app:** both parties tap [Confirm] in the app
2. **SMS fallback:** buyer responds to the Quick Deal SMS, servicer responds to confirmation SMS

### 2.5 Price Negotiation Guardrails

Per D28's review trigger: if >20% of Quick Deals modify price by >30%, add price-change justification requirement.

To prevent abuse in the initial design:
- **Max 3 counter-rounds** per Quick Deal session (buyer offers → servicer counters → buyer accepts/declines). After 3 rounds, the deal expires and both parties must start fresh.
- **Extreme deviation warning:** if either party's offer deviates >50% from the listing price, the UI shows a confirmation dialog: "This is significantly different from the listed price. Are you sure?"
- **No floor/ceiling enforcement** — servicers can price freely. The warning is informational.

---

## 3. Deal-Chaining Specification

### 3.1 Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     DEAL-CHAINING FLOW                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Either party creates a Deal:                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ New Deal: Fiesta Preparation                              │  │
│  │ Slot 1: Lechon — [Invite Servicer]  ← buyer finds/selects │  │
│  │ Slot 2: Sound System — [Invite Servicer]                   │  │
│  │ Slot 3: Catering — [Invite Servicer]                       │  │
│  │ Budget: ₱6,700                                             │  │
│  │ [Create Deal]                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│       │                                                        │
│       ▼                                                        │
│  Deal status: pending_slots                                    │
│       │                                                        │
│       ▼                                                        │
│  Invitations sent to servicers                                 │
│       │                                                        │
│       ├── Servicer accepts → Slot filled, Deal notified        │
│       │       │                                                │
│       │       └── Servicer negotiates price with buyer         │
│       │            (same Quick Deal-style negotiation)         │
│       │                                                        │
│       ├── Servicer declines → Slot still open                  │
│       │       │                                                │
│       │       └── Buyer may invite another servicer            │
│       │                                                        │
│       └── No response in 48hr → Invitation expires            │
│             Buyer notified to invite someone else              │
│                                                                  │
│  Once all slots filled:                                         │
│       ▼                                                        │
│  Deal status: all_filled                                       │
│       │                                                        │
│       ▼                                                        │
│  Buyer makes single payment (or confirms payment schedule)      │
│       │                                                        │
│       ▼                                                        │
│  Deal status: in_progress                                      │
│  Each slot's Order proceeds independently                      │
│       │                                                        │
│       ▼                                                        │
│  As each slot completes (Order → completed):                    │
│  - Slot's escrow is held until all slots complete               │
│  - Buyer sees per-slot completion status                        │
│       │                                                        │
│       ▼                                                        │
│  All slots completed → Deal status: completed                   │
│  All escrows released simultaneously                            │
│       │                                                        │
│       ▼                                                        │
│  Review prompt for each servicer (independent reviews)          │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Deal Ownership

- **Either party can create a Deal-Chain** per D28. The creator is the "Deal Owner."
- If a **buyer** creates it: they define the slots and invite servicers. They set the budget or let servicers propose prices per slot.
- If a **servicer** creates it: they define their own slot and invite other servicers to fill remaining slots. The buyer then approves the Deal before payment is collected.
- In both cases: **buyer must approve the final Deal before any payment is collected**. The buyer is the payer and has ultimate veto.

### 3.3 Slot Definition

Each slot in a Deal-Chain has:

| Field | Type | Description |
|-------|------|-------------|
| `slot_id` | UUID | Unique identifier |
| `deal_id` | UUID | Parent deal |
| `category_id` | UUID | Matches the servicer's listing category |
| `description` | Text | What this slot covers |
| `assigned_servicer_id` | UUID (nullable) | Filled when invitation accepted |
| `price` | Decimal | Negotiated or buyer-set price for this slot |
| `order_id` | UUID (nullable) | The Order created when this slot is confirmed |
| `status` | Enum | `pending | invitation_sent | filled | order_created | completed | disputed` |
| `invited_at` | Timestamp | When the last invitation was sent |
| `expires_at` | Timestamp | 48 hours from invitation |

### 3.4 Slot Invitation & Acceptance

- **Who can invite:** Deal Owner (buyer or creator servicer).
- **How they find servicers:** platform search/browse within the Deal's town/category.
- **Invitation lifecycle:**
  1. Invitation sent → status `invitation_sent`
  2. Servicer has **48 hours to respond** or invitation auto-expires
  3. Servicer can: Accept, Decline, or Counter (propose different price)
  4. If declined/expired, Deal Owner invites another servicer
  5. Same servicer cannot be re-invited to the same slot within 30 days
- **Servicer concurrency check:** invited servicer must NOT have a conflicting active Deal/Order at the same time window. System prompts servicer to confirm availability.

### 3.5 Per-Slot Order Creation

When all slots are filled and buyer approves:
1. For each filled slot, an **Order** is created via the standard Order state machine (D6)
2. Each Order references its parent Deal via `orders.deal_id`
3. Each Order gets its own Work Instance, cloned from the servicer's template for that listing
4. Each Order's `escrow_hold` tracks the slot amount independently
5. Each Order carries `origin = 'deal_chain'` in its metadata

### 3.6 Slot Replacement

If a servicer becomes unavailable after filling a slot but before the Deal starts:
- The Deal Owner can **unassign** the servicer and invite a replacement.
- If the servicer was already notified, the slot goes back to `pending`.
- If the servicer accepted but the deal hasn't started, no penalty (no escrow was created yet).

**If a servicer needs to drop out mid-Deal (after Orders are created and escrow is held):**
- This is treated as a **slot-level cancellation** (see §10).
- The Deal Owner can invite a replacement for the slot.
- A replacement servicer creates a NEW Order for that slot.
- The original servicer's escrow is released back to the buyer minus applicable fees.

---

## 4. State Machine & Status Contract

### 4.1 DealStatus (new top-level enum)

The Deal system introduces a `DealStatus` enum, separate from `WorkStatus` (D6). DealStatus lives on the `deals` table.

```
pending_slots ──→ all_filled ──→ in_progress ──→ completed
       │               │              │
       ▼               ▼              ▼
   cancelled        cancelled      disputed ──→ partially_completed
                                                (admin resolves)
```

| Status | Meaning | Transitions To |
|--------|---------|---------------|
| `pending_slots` | Deal created, not all slots filled | `all_filled`, `cancelled` |
| `all_filled` | All slots have accepted servicers, buyer reviewing | `in_progress`, `cancelled` |
| `in_progress` | Payment collected, work started on at least one slot | `completed`, `disputed` |
| `completed` | All slots completed → all escrows released | (terminal) |
| `disputed` | One or more slots disputed | `partially_completed`, `completed` (if resolved) |
| `partially_completed` | Admin resolved: some slots complete, others cancelled/refunded | (terminal) |
| `cancelled` | Entire Deal cancelled before full completion | (terminal) |

### 4.2 SlotStatus (per-slot enum)

Each slot within a Deal has its own status, orthogonal to the Deal's overall status:

| Status | Meaning |
|--------|---------|
| `pending` | Slot defined, no invitation active |
| `invitation_sent` | Servicer has been invited, awaiting response |
| `filled` | Servicer accepted, price agreed |
| `order_created` | Order created, escrow held |
| `in_progress` | Work started on this slot's Order |
| `completed` | This slot's Order reached completed status |
| `disputed` | This slot's Order is in dispute |
| `cancelled` | This slot was cancelled (replacement invited or deal ended) |

### 4.3 DealStatus × SlotStatus Interaction Rules

| Deal Status | Allowed Slot Statuses | Rule |
|-------------|----------------------|------|
| `pending_slots` | `pending`, `invitation_sent`, `filled` | No Orders exist yet |
| `all_filled` | `filled` | All slots must be `filled`. No Orders yet. Buyer approval pending. |
| `in_progress` | `order_created`, `in_progress`, `completed` | At least one slot must be `order_created` or `in_progress` |
| `completed` | `completed` (all) | ALL slots must be `completed` |
| `disputed` | Any + `disputed` | At least one slot `disputed`. Other slots continue. |
| `partially_completed` | `completed`, `cancelled` | Admin decision: some completed, some cancelled |
| `cancelled` | Any (all terminated) | All slots are terminated |

### 4.4 Escrow Release Rule (resolved)

**Per-slot escrow, released when the entire Deal reaches `completed`.**

This is the single most impactful design decision. Rationale:

- **One pool = buyer pays once.** The buyer makes ONE payment of the total Deal amount. The system splits this into per-slot escrow holds internally.
- **Per-slot holds.** Each slot's amount is tracked in the ledger as a separate hold, all within a single Xendit payment transaction. The system ledger tracks `hold_amount_per_slot`.
- **All-or-nothing release protects the buyer.** If Slot 2 fails but Slot 1 completed, the buyer doesn't lose money on Slot 1. The admin can release Slot 1's escrow as part of partial completion resolution.
- **Cash flow is a recognized problem** (see §5.5 for mitigation).

### 4.5 Release with Partial Completion Option

To avoid the "completed slot waiting forever" problem:

**The Deal system supports an optional per-slot partial release flag** that servicers can opt into when accepting a slot. If enabled:

- When a slot reaches `completed`, its escrow is released immediately (or with a 1-day hold for dispute window).
- The slot's servicer is paid even if other slots haven't completed.
- The buyer's dispute risk is covered by the per-slot dispute process (see §6).
- If the Deal eventually fails and other slots are refunded, the completed slot's payment is NOT clawed back (ledger immutability).

This is **opt-in per slot, not the default.** The default is all-or-nothing as specified in D28. The servicer sees a toggle when accepting a slot invitation:
> "Release my payment immediately when I complete? [Yes / No (default)]"

If the servicer chooses "No" (default), they wait for all slots.

If the servicer chooses "Yes," they get paid on completion but accept that their review/history is decoupled from the overall Deal.

---

## 5. Escrow Architecture

### 5.1 Single Payment, Multi-Slot Holds

```
Buyer pays ₱6,700
         │
         ▼
  Xendit captures ₱6,700 as one payment
         │
         ▼
  Internal ledger (source of truth):
  ┌──────────────────────────────────────────────────────┐
  │ transaction_id | type       | amount | slot_id        │
  ├──────────────────────────────────────────────────────┤
  │ T001           | capture    | ₱6,700 | NULL (master) │
  │ T002           | hold       | ₱3,000 | Slot 1 (Lechon)│
  │ T003           | hold       | ₱1,200 | Slot 2 (Sound) │
  │ T004           | hold       | ₱2,500 | Slot 3 (Cater) │
  └──────────────────────────────────────────────────────┘
```

### 5.2 Release on All Complete

When all slots reach `completed` → DealStatus → `completed`:

1. All per-slot holds are converted to releases simultaneously
2. Internal ledger: `release` entries for each slot, disbursement queued
3. Xendit batch disbursement sent to each servicer
4. One notification per servicer

### 5.3 Release on Partial Completion (admin resolution)

If Deal reaches `disputed` and admin resolves as `partially_completed`:

1. Completed slots: escrow released as normal
2. Failed slots: escrow refunded to buyer (minus applicable fees)
3. The calculation: `buyer_refund = sum(failed_slot_amounts) - cancellation_fees`
4. Admin tool performs this atomically to prevent ledger imbalance

### 5.4 Xendit Constraints & Mitigation

**Constraint:** Xendit's marketplace escrow may not support sub-transaction holds within a single payment.

**Mitigation:** The internal ledger is the source of truth. Xendit is the payment rail only. The system:
1. Creates a single Xendit invoice for the total Deal amount
2. On payment callback, records the full capture in the internal ledger
3. Tracks per-slot holds purely in the internal ledger
4. At release time, submits individual Xendit disbursements per servicer

**If Xendit does not support batch disbursement:** each release is a single disbursement, processed sequentially. The total payout may take minutes, not seconds, but the ledger is updated atomically.

### 5.5 Cash Flow Mitigation for Early-Completing Servicers

**Problem:** Slot 1 (tricycle, ₱50) completes in 15 minutes. Slot 3 (lechon, ₱3,000) takes 4 hours. The tricycle driver waits 4 hours for ₱50.

**Mitigations (in priority order):**

1. **Per-slot partial release opt-in** (see §4.5). Servicers who need immediate cash can receive payment on completion.
2. **Serbizyu wallet instant credit.** When a slot completes, the amount shows as "Available" in the servicer's wallet immediately, even though the actual bank/GCash disbursement happens at Deal completion. This enables on-platform reuse (e.g., the tricycle driver can pay for gas via Serbizyu wallet).
3. **Early-release micro-loan (Phase 3+).** Serbizyu fronts the payment to the completed servicer at a small fee (₱5–10), collecting from the eventual escrow release. Requires capital reserves.

---

## 6. Dispute Propagation Rules

### 6.1 Principle: Slot-Isolated by Default

Disputes are **scoped to individual slots** by default. A dispute on Slot 2 does NOT freeze Slot 1's payment.

**Rationale:** Slot isolation prevents a bad actor from holding an entire Deal hostage by disputing one slot. If a buyer is unhappy with the tricycle driver (Slot 2), the lechon vendor (Slot 1) who performed perfectly should still get paid.

### 6.2 When Escrow Freezes

| Scenario | Slot 1 Escrow | Slot 2 Escrow | Deal Status |
|----------|--------------|--------------|-------------|
| No dispute | Released on completion | Released on completion | `completed` |
| Slot 2 disputed | Unaffected — releases normally | Frozen, pending resolution | `disputed` |
| Slot 2 disputed (buyer claims "whole deal ruined") | **Frozen pending admin review** | Frozen, pending resolution | `disputed` |
| Admin resolves "Slot 2 only" | Slot 1 released (if not already) | Resolved per D24 (refund/release) | `partially_completed` |
| Admin resolves "whole deal invalid" | Refunded to buyer | Refunded to buyer | `partially_completed` |

### 6.3 "Whole Deal Ruined" Claim

A buyer can claim that a single slot failure ruined the entire Deal value (e.g., the sound system didn't show up for a wedding — the caterer and lechon are now pointless). In this case:

1. Buyer flags the dispute with reason "whole_deal_impacted"
2. All slot escrows are frozen (Slot 1 and Slot 3's payments held)
3. Admin reviews within D24 SLA (<4 hours business hours)
4. Admin outcome options:
   - **Reject:** only the disputed slot is affected. Other slots released.
   - **Partial refund:** other slot servicers keep a percentage (e.g., 50% for food already prepared) and remainder refunded to buyer.
   - **Full refund (rare):** all escrow returned to buyer. Servicers compensated via Serbizyu dispute fund (see §6.6).

### 6.4 Admin Dispute Resolution Panel (Deal View)

The admin dispute panel must show:
- The Deal overview (all slots, each servicer's name, price, status)
- Each slot's evidence (per D24: GPS logs, photos, chat, confirmations)
- Per-slot recommendation engine (which servicers performed, which failed)
- Tools to resolve: per-slot refund %, per-slot release, or global resolution
- Atomic commit: changes take effect on all affected slots in one transaction

### 6.5 Evidence Tier Applied Per-Slot

D24's evidence tiers apply **per servicer, per slot**, not to the Deal as a whole.

- Slot 1 servicer (high tier: GPS tracking, photo proof) → near-automatic protection
- Slot 2 servicer (low tier: cash handshake, no tools) → burden falls on servicer
- This means the same Deal can have different outcomes per servicer

### 6.6 Dispute Fund

For cases where the admin determines that a performing servicer should be paid even though the buyer gets a full refund (e.g., "the sound system failed, but the caterer already cooked ₱2,000 worth of food"):

- **Dispute fund model:** a pooled account funded by a 0.5% levy on all Deal transactions
- Only applies to Deal-Chaining, not standard Orders
- Cap: ₱5,000 per dispute event
- Phase 3+ implementation; Phase 1–2, admin manually handles these via partial release

---

## 7. Archetype Compatibility Matrix

### 7.1 Quick Deal Compatibility

Quick Deal involves face-to-face, impromptu transactions with negotiable price. Not all archetypes are compatible.

| Archetype | Name | Quick Deal Compatible? | Rationale |
|-----------|------|----------------------|-----------|
| A1 | Linear Project | ❌ No | Projects require planning, milestones, and scope. An impromptu face-to-face can't define a multi-week project. |
| A2 | Instant Dispatch | ✅ Conditional | Works for pre-negotiated trips (e.g., "hatid to the market ₱40"), but GPS auto-advance requires both parties to have the app open. Fallback: manual confirmations. |
| A3 | Appointment | ✅ Yes | Ideal: "Can you cut my hair now?" — servicer checks calendar availability on the spot. |
| A4 | Handoff | ✅ Yes | Ideal: "Let me buy that lechon now." — immediate exchange. |
| A5 | Rental | ❌ No | Requires deposit hold, condition check-in/out. Cannot be resolved face-to-face instantly. |
| A6 | Recurring | ❌ No | Recurring subscription can't be established in a single impromptu meeting. |
| A7 | Quoted | ❌ No | The whole deal requires bidding. Impromptu contradicts the quote flow. |
| A8 | Emergency | ✅ Yes | "I need help right now" — Quick Deal for emergency dispatch works. |
| A9 | Digital Delivery | ❌ No | Digital delivery doesn't happen face-to-face. |
| A10 | Long-Running | ❌ No | A retainer can't be negotiated in an impromptu QR scan. |

**Implementation:** When a Quick Deal is initiated, the system checks which listing the buyer selected, reads the listing's archetype, and either allows or blocks the Quick Deal flow with a clear message explaining why.

### 7.2 Deal-Chaining Compatibility

Deal-Chaining involves coordinating multiple independent servicers. Archetypes affect how slots interact.

| Archetype | Name | Chain Compatible? | Notes |
|-----------|------|------------------|-------|
| A1 | Linear Project | ✅ Yes | Each slot is a project phase. Natural fit: "Carpenter builds frame (Slot 1), Painter paints (Slot 2)." |
| A2 | Instant Dispatch | ✅ Yes | Each slot is a separate trip. "Tricycle to market (Slot 1), Tricycle back (Slot 2)" — different drivers. |
| A3 | Appointment | ✅ Yes | Each slot is a separate appointment. "Massage 10am (Slot 1), Hilot 2pm (Slot 2)." |
| A4 | Handoff | ✅ Yes | Each slot is a separate delivery. "Lechon (Slot 1), Cake (Slot 2)." |
| A5 | Rental | ⚠️ Conditional | Rental requires two custody transfers. If the rental slot is one of many, the other slots may need to wait. |
| A6 | Recurring | ❌ No | One servicer, recurring schedule. Multi-servicer recurring is an anti-pattern. |
| A7 | Quoted | ❌ No | Quoted work becomes A1/A3/A5 after award. The bidding is single-servicer. |
| A8 | Emergency | ✅ Yes | "Electrician (Slot 1), Plumber (Slot 2)" for concurrent emergencies. |
| A9 | Digital Delivery | ✅ Yes | "Graphic designer does flyer (Slot 1), Printer does physical print (Slot 2)." |
| A10 | Long-Running | ❌ No | Retainer arrangements are single-servicer by nature. |

### 7.3 Archetype Change on Quick Deal

If a servicer's listing uses A2 (dispatch) but the Quick Deal is for a fixed-price special trip (which would normally be A3/appointment-shaped), the archetype does NOT change. The Quick Deal generates an Order using the listing's existing archetype.

**Exception:** The buyer and servicer can agree on the spot to modify the service (e.g., "instead of a point-to-point trip, take me to 3 stops and wait"). In this case:
1. The Work Instance is created with the listing's archetype
2. Additional instructions are captured in the Order's `notes` field
3. The servicer can adjust the Work Template steps via the WorkflowBuilder before the Work Instance starts
4. The archetype itself is fixed — it reflects the service category, not the specific trip arrangement

---

## 8. Notification Events (extends D25)

### 8.1 New Events for Deal System

These events are added to the D25 notification matrix. Trigger conditions are per-notification-type (in-app, SMS) following D25's principle: "SMS is for time-sensitive actions only."

| Event | Buyer | Servicer (per-slot) | Agent | Owner (SMS-only) | Trigger |
|-------|-------|---------------------|-------|-------------------|---------|
| Quick Deal offer received | — | In-app + SMS | — | — | Buyer sent Quick Deal offer |
| Quick Deal counter-offer | In-app + SMS | — | — | — | Servicer countered price |
| Quick Deal accepted | In-app + SMS | In-app + SMS | — | — | Both parties confirmed |
| Quick Deal declined | In-app | — | — | — | Servicer declined |
| Deal invitation sent | — | In-app + SMS | In-app | — | Invited to fill a Deal slot |
| Deal invitation declined | In-app | — | — | — | Servicer declined slot |
| Deal invitation expired | In-app | — | — | — | 48hr no response |
| Slot filled | In-app | In-app (to slot servicer) | — | — | Servicer accepted slot |
| All slots filled | In-app + SMS | — (each knows their slot) | In-app | SMS (if owner) | Deal fully staffed |
| Deal payment collected | In-app | In-app | — | SMS (amount only) | Buyer paid total |
| Work started (per slot) | In-app | In-app | — | — | Slot Order reached `in_progress` |
| Slot completed (others pending) | In-app (info only) | In-app + SMS (to that servicer only) | — | — | Single slot Order completed |
| All slots completed | In-app + SMS | In-app + SMS | In-app | SMS (amount only) | All slots `completed` |
| Escrow released (per slot, partial release opt-in) | In-app | In-app + SMS | In-app | SMS (if owner) | Per-slot escrow release triggered |
| Escrow released (all slots) | In-app + SMS | In-app + SMS | In-app | SMS (amount + breakdown) | Deal `completed` → all escrow released |
| Deal disputed (single slot) | In-app + SMS | In-app + SMS (only disputed slot's servicer) | In-app + SMS | SMS (alert only) | Single slot disputed |
| Deal disputed (whole deal) | In-app + SMS | In-app + SMS (ALL slot servicers) | In-app + SMS | SMS (alert only) | Buyer claimed "whole deal ruined" |
| Deal cancelled | In-app + SMS | In-app + SMS (ALL slot servicers) | In-app | SMS (alert) | Deal cancelled |
| Slot replacement invited | — | — | — | — | Only the newly invited servicer gets standard invitation notification |

### 8.2 Modified Existing Events

| Existing Event (D25) | Deal System Modification |
|---------------------|--------------------------|
| Booking confirmed | If `order.origin = 'deal_chain'`, notification reads "Your slot in [Deal name] is confirmed" instead of "Booking confirmed" |
| Work started | Include Deal name + slot number: "[Servicer] started work on Slot 2 of [Deal name]" |
| Work completed / review window | Message distinguishes "single slot completed" vs "all slots completed" |
| Escrow released | Include total Deal amount + per-slot breakdown for buyer; servicer sees their slot amount only |
| Dispute opened | Slot identifier included: "Slot 2 (Sound System) has been disputed" |

### 8.3 Aggregation Rules for SMS-Only Owners (D19)

Agent-managed owners who receive SMS-only notifications get **aggregated Deal notifications**, not per-slot:

- **Deal created:** "[Agent] created a Deal for your [listing]. All items included: [slot summary]."
- **Slot completed:** NOT sent separately. Owner gets only "all slots completed" or "Deal disputed."
- **Deal completed:** "[Agent] completed a Deal for your [listing]. Total: ₱X,XXX. Your share: ₱X,XXX."
- **Deal disputed:** "[Agent]'s Deal for your [listing] has a dispute. [Agent] will handle it."

This prevents SMS overload for owners who don't actively manage the platform.

---

## 9. Agent-Managed Deal Rules

### 9.1 Agent Deal Creation

Per D19, agents manage listings for SMS-only owners. An agent **can** create a Deal-Chain on behalf of an owner, subject to:

1. **Owner consent:** The agent must have active, non-revoked consent from the owner to manage their listing (per `servicer_channel_consents` or equivalent agent authorization table).
2. **Owner notification:** The owner receives an SMS: "[Agent] created a Deal for your [listing]. Reply STOP if you did not authorize this."
3. **Transaction limit:** Agent cannot commit the owner to a Deal slot worth >₱10,000 (configurable) without owner SMS confirmation. This prevents an agent from creating large Deals without owner knowledge.

### 9.2 Commission Splitting on Chained Deals

Per D19: 75% owner / 10% agent / 15% platform.

**For Deal-Chaining:** The commission split applies **per slot**, not per Deal.

- Slot 1 (Agent A's client): ₱3,000 → ₱2,250 owner / ₱300 agent A / ₱450 platform
- Slot 2 (Agent B's client): ₱2,500 → ₱1,875 owner / ₱250 agent B / ₱375 platform
- Slot 3 (no agent, direct servicer): ₱1,200 → ₱1,020 servicer / ₱180 platform

**If the same agent manages multiple owners in the same Deal:** the agent gets 10% of each owner's slot, not 10% of the total Deal.

### 9.3 Agent Notification When Owner's Slot is Disputed

Per D19: "Agent and owner both notified on disputes."

- Agent gets full dispute details (evidence, chat logs, admin actions) — in-app + SMS
- Owner gets SMS alert only: "Your listing in [Deal] has a dispute. [Agent] is handling it."
- Agent is responsible for communicating with the owner about the dispute outcome

### 9.4 Agent Graduation Impact on Deals

If an owner graduates from agent-managed to independent (D19's graduation bonus):
- Existing Deals that include slots for this owner are **unaffected** — they continue with the same arrangement
- Future Deal invitations for this owner go directly to the owner, not the agent
- The agent cannot create new Deals for this owner after graduation
- The agent still receives their commissions for in-progress Deals at the time of graduation

---

## 10. Cancellation & Cascading

### 10.1 Cancellation Timing

Cancellation triggers depend on Deal status at cancellation time:

| Deal Status | Cancellation Effect | Buyer Pays | Servicers Paid |
|-------------|--------------------|-----------|----------------|
| `pending_slots` | Deal deleted. No slots filled, no payment. | Nothing | Nothing |
| `all_filled` (payment NOT yet collected) | Deal cancelled. Slots released, invitations cancelled. | Nothing | Nothing |
| `all_filled` (payment collected) | Full refund minus cancellation fees. | ₱50 per *slot* cancellation fee | ₱50 per slot paid to each servicer who accepted |
| `in_progress` (no slot completed yet) | Full refund minus cancellation fee per slot. | ₱50 per slot | ₱50 per slot to each servicer |
| `in_progress` (some slots completed) | Completed slots: pay out. Pending/cancelled slots: refund minus ₱50 each. | ₱50 per incomplete slot | Completed servicers: full slot amount. Incomplete servicers: ₱50 each. |

### 10.2 Cancellation Fee: Per-Slot, Not Per-Deal

**Decision: ₱50 cancellation fee is applied per slot, not per Deal.**

Rationale: Each servicer has reserved time and capacity for this Deal. A ₱50 fee on a 3-slot Deal (₱150 total) compensates servicers proportionally. A single ₱50 fee spread across 3 servicers would be ₱17 each — insufficient for the inconvenience.

**Fee cap:** Maximum ₱250 total cancellation fee per Deal (i.e., waiver for Deals with >5 slots).

### 10.3 Who Pays the Cancellation Fee

- **Buyer-initiated cancellation** (any time before Deal completion): buyer pays all per-slot fees.
- **Servicer-initiated dropout** (after Order created but before work starts): the dropping servicer's fee is deducted from their (non-existent yet) payout. If no payout exists, the Deal Owner absorbs the cost.
- **Mutual cancellation:** both parties agree to cancel. No fees. System processes full refund.
- **Force majeure / system bug:** admin can waive all cancellation fees.

### 10.4 What Happens to In-Progress Servicers

If a buyer cancels a Deal mid-stream and some servicers have started working (but not yet completed):

1. Those servicers are notified: "The buyer has cancelled Deal [name]. You have started work."
2. They can submit a **partial work claim** via the dispute system:
   - Upload evidence of work performed
   - Admin reviews within 4 hours
   - Compensation awarded from the buyer's paid amount (up to 50% of the slot price)
3. If the servicer hasn't started, they just get the ₱50 cancellation fee.

### 10.5 Replacement vs Cancellation

Not every slot issue triggers full Deal cancellation. **Slot replacement** (see §3.6) is the preferred path for single-slot problems. Full cancellation is reserved for:

- Buyer no longer needs the service
- Multiple slots fail simultaneously
- The Deal's core purpose is compromised (e.g., wedding date moved)

---

## 11. Quick Deal QR Security

### 11.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| QR scanned by malicious user, spam Quick Deals created | Servicer receives dozens of fake offers | Rate limits per buyer+servicer pair |
| Fake QR printed, pasted over legitimate QR | Buyer scans and pays wrong servicer | QR encodes a servicer UUID. System validates against the physical location (Phase 3: GPS-anchored QR). For Phase 1–2: clear branding on QR landing page. |
| QR scanned outside business hours | Buyer offers sent to unresponsive servicer | Servicer toggles Quick Deal availability. When OFF, Quick Deal button is disabled. |
| Buyer creates Quick Deal, then claims "I paid cash" and never confirms | Servicer does work for free | Dual confirmation is REQUIRED. No confirmation = no Order = no platform record. Servicer should not provide service without confirmation. UI warns both parties. |
| QR shared in screenshot, scanned remotely | Buyer initiates Quick Deal while not face-to-face | Quick Deal is designed for face-to-face. System shows a prompt: "Are you with the servicer in person?" This is informational, not enforced. Remote Quick Deals are permitted but marked. |

### 11.2 Rate Limits

| Rate Limit | Value | Enforcement |
|-----------|-------|-------------|
| Max pending Quick Deals per servicer | 3 | Once 3 Quick Deal offers are pending (awaiting servicer response), new offers are blocked with "Servicer has reached maximum pending Quick Deals." |
| Max Quick Deals per buyer per servicer per hour | 5 | Prevents spam/fake offers from a single buyer. |
| Max Quick Deals per buyer across all servicers per day | 20 | Prevents an automated script from spamming the platform. |
| Quick Deal offer expiration | 30 minutes | If servicer doesn't respond within 30 minutes, the offer expires. No notification; offer simply vanishes. |

### 11.3 Verification for High-Value Quick Deals

- Quick Deals >₱2,000: system prompts for **additional buyer verification** (SMS OTP reconfirmation) before the offer is sent.
- Quick Deals >₱5,000 (cash, per D27): **barangay witness** requirement is enforced. Buyer and servicer confirm witness presence in the app before proceeding.

### 11.4 Quick Deal vs Standard Order Pricing

A Quick Deal **cannot bypass** marketplace pricing guardrails:
- The servicer's minimum acceptable price (if configured) is enforced server-side
- Extreme deviation (>50% from listing) shows a confirmation dialog
- Platform fees still apply at the listing's category rate (see D17, D27)

---

## 12. Cash Handling in Deals

### 12.1 Per-Slot Payment Method

**Each slot in a Deal-Chain can have its own payment method.** Slot 1 can be digital (8% fee), Slot 2 can be cash (12% fee). The buyer makes ONE payment (total Deal amount) via the platform, and the system tracks which portion is treated as "cash" for commission purposes.

**Rationale:** Forcing all slots to use the same payment method is unrealistic. A lechon vendor may accept GCash (digital) while the tricycle driver only takes cash.

### 12.2 Commission Rate Calculation

| Scenario | Calculation |
|----------|------------|
| All slots digital | 8% of total Deal GMV |
| All slots cash (dual confirmed) | 12% of total Deal GMV |
| Mixed payment methods | Per-slot rate applied to each slot's price, summed: Σ(slot_price × slot_rate) |
| Any slot cash >₱5K | 15% on THAT slot only; other slots unaffected |

**Example:**
- Slot 1 (digital): ₱3,000 × 8% = ₱240
- Slot 2 (cash, dual confirmed): ₱1,200 × 12% = ₱144
- Slot 3 (cash, high value ₱6K): ₱2,500 × 15% = ₱375
- **Total platform fee:** ₱240 + ₱144 + ₱375 = ₱759 (9.4% effective rate)

### 12.3 Cash Confirmation Per Slot

For slots using cash payment method:

1. Buyer's single payment to the platform covers all slots
2. For cash slots, the platform marks the internal ledger as "cash equivalent"
3. Servicer collects cash directly from the buyer (per D27's Grab/Gojek model)
4. Dual confirmation required per slot: buyer confirms "paid in cash for this slot" → servicer confirms receipt
5. If buyer doesn't confirm cash payment within 24 hours of slot completion, servicer can flag for admin review

### 12.4 Quick Deal Cash Handling

Quick Deal impromptu transactions are **naturally cash-heavy** (face-to-face, no time to set up digital payment). 

For Quick Deal:
- **Default payment method is cash** (12% rate)
- Buyer and servicer can agree to digital payment during negotiation
- If the negotiated price >₱5K and cash is chosen, the barangay witness requirement (D27) is enforced
- The platform's "Protected" tier (+₱10–15/transaction, D27) is optional and must be agreed during the Quick Deal negotiation

---

## 13. Work Engine Integration

### 13.1 Single Work Instance Per Slot

Each slot in a Deal-Chain creates one Order → one Work Instance. The Work engine (D5, D6) is completely unaware of Deals. It processes each Order exactly as it would a standard Order.

**This is by design.** The Work engine's `WorkStatus` (D6) operates per-instance. A Deal-Chain is an orchestration layer above the Work engine, not a modification of it.

### 13.2 DealStatus vs WorkStatus Mapping

| DealStatus | SlotStatus (per slot) | WorkStatus (of slot's Work Instance) |
|-----------|----------------------|--------------------------------------|
| `pending_slots` | `pending / invitation_sent / filled` | (no Work Instance yet) |
| `all_filled` | `filled` | (no Work Instance yet) |
| `in_progress` | `order_created` | `not_started` |
| `in_progress` | `in_progress` | `in_progress / awaiting_signoff` |
| `completed` | `completed` | `completed` |
| `disputed` | `disputed` | `disputed` |
| `partially_completed` | mix of `completed` and `cancelled` | mix of `completed` and `disputed/cancelled` |
| `cancelled` | `cancelled` | (if started: `disputed` then resolved) |

### 13.3 WorkflowBuilder Compatibility

The WorkflowBuilder (§7 of workflow-builder-spec.md) states: "No multi-party orchestration in v1."

**Resolution:** Deal-Chaining is NOT multi-party Work orchestration. It is multi-Order orchestration. The WorkflowBuilder still creates single-servicer Work Templates. Deal-Chaining creates a container that links independent Orders. The WorkflowBuilder spec is not violated.

**Phase 2+ enhancement:** A "Deal Template" could extend the WorkflowBuilder to define slot templates (what archetype each slot uses, what tools are expected). This is explicitly deferred to post-pitch.

### 13.4 Contract Checker for Deal Slots

The existing contract checker (workflow-builder-spec.md §3.3) validates each Work Template independently. For Deal-Chaining, no additional contract checking is needed because each slot is an independent Order.

**Future enhancement:** A "Deal Compatibility Checker" could validate that:
- All slots have compatible timeframes (e.g., they can happen on the same day)
- No category conflicts (e.g., two slots in the same narrow category that could confuse buyers)
- Each slot's servicer has availability for the Deal window

This is Phase 3+.

---

## 14. Pricing & Fee Calculation

### 14.1 Who Sets Slot Prices

| Deal Type | Price Setting | Rule |
|-----------|--------------|------|
| Buyer-created Deal | Buyer proposes per-slot budget; servicers accept, counter, or decline | Maximum 3 counter rounds per slot |
| Servicer-created Deal | Servicer sets their own slot price + proposes prices for other slots they invite | Buyer must approve ALL prices before payment |

### 14.2 Platform Fee Application

Platform fees (D17: 8%/12%/15% per D27) are calculated **per slot**, not on the total Deal GMV.

**Why per-slot:**
- Each servicer operates under their own commission structure (category overrides, payment method)
- A blended Deal rate would unfairly penalize digital servicers in a mixed Deal
- Per-slot aligns with the accounting: each slot is a separate Order in the ledger

### 14.3 Fee Cap Application

D17's fee caps (₱150 micro / ₱150 standard / ₱500 premium) apply **per slot, per servicer, per transaction.**

- Slot 1 (digital, ₱3,000): 8% = ₱240 → capped at ₱150 → ₱150
- Slot 2 (digital, ₱8,000): 8% = ₱640 → capped at ₱500 → ₱500
- Total platform fee: ₱650

### 14.4 Subsidy Override (D17)

Category subsidy overrides (tricycle at 0–3%, farm labor at 0–3%, emergencies at 0%) apply **per slot, per category.**

- Slot 1 (Tricycle, ₱50): 0% = ₱0 (subsidized)
- Slot 2 (Catering, ₱3,000): 8% = ₱240 (standard rate)
- Slot 3 (Digital Services, ₱1,000): 8% = ₱80

---

## 15. Schema Changes

### 15.1 New Tables

#### `deals`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `deal_type` | ENUM | `quick_deal`, `deal_chain` | Distinguishes Quick Deal (single Order) from Chain (multi-slot) |
| `name` | VARCHAR(255) | NOT NULL | Buyer-facing Deal name |
| `buyer_id` | UUID | FK → users.id | The buyer/payer |
| `creator_id` | UUID | FK → users.id | Who created this Deal (buyer or servicer) |
| `creator_type` | ENUM | `buyer`, `servicer` | Role of creator |
| `status` | ENUM | See §4.1 DealStatus | |
| `total_amount` | DECIMAL(10,2) | NOT NULL | Sum of all slot prices |
| `payment_method` | ENUM | `digital`, `cash`, `mixed` | Overall payment method (mixed when slots differ) |
| `commission_total` | DECIMAL(10,2) | | Sum of all slot commissions |
| `platform_fee_total` | DECIMAL(10,2) | | Total platform fee |
| `created_at` | TIMESTAMP | | |
| `started_at` | TIMESTAMP | Nullable | When in_progress |
| `completed_at` | TIMESTAMP | Nullable | When completed |
| `expires_at` | TIMESTAMP | | Auto-cancel if still pending_slots after N days (default: 7) |

#### `deal_slots`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `deal_id` | UUID | FK → deals.id, NOT NULL | |
| `category_id` | UUID | FK → categories.id | |
| `description` | TEXT | | What this slot covers |
| `status` | ENUM | See §4.2 SlotStatus | |
| `price` | DECIMAL(10,2) | NOT NULL | Agreed slot price |
| `payment_method` | ENUM | `digital`, `cash_dual`, `cash_high_value` | Per-slot payment method |
| `commission_rate` | DECIMAL(3,3) | | Effective rate after category override |
| `commission_amount` | DECIMAL(10,2) | | |
| `servicer_id` | UUID | FK → users.id, nullable | Assigned servicer |
| `order_id` | UUID | FK → orders.id, nullable | Generated Order |
| `partial_release_opt_in` | BOOLEAN | DEFAULT false | Servicer opted into immediate per-slot release |
| `seller_listing_id` | UUID | FK → offers.id | Which listing this slot uses |
| `negotiation_rounds` | INTEGER | DEFAULT 0 | Counter-offer rounds used |
| `invited_at` | TIMESTAMP | Nullable | |
| `accepted_at` | TIMESTAMP | Nullable | |
| `expires_at` | TIMESTAMP | | 48h from invitation |
| `sort_order` | INTEGER | | Visual order in Deal |

#### `deal_invitations`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `deal_slot_id` | UUID | FK → deal_slots.id | |
| `servicer_id` | UUID | FK → users.id | Invited servicer |
| `invited_by` | UUID | FK → users.id | Who sent the invitation |
| `status` | ENUM | `pending`, `accepted`, `countered`, `declined`, `expired` | |
| `proposed_price` | DECIMAL(10,2) | | Servicer's counter-offer price |
| `counter_message` | TEXT | | Servicer's message with their counter |
| `decline_reason` | TEXT | | Optional reason |
| `created_at` | TIMESTAMP | | |
| `responded_at` | TIMESTAMP | Nullable | |

### 15.2 Modified Tables

#### `orders` (existing)

Add columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `deal_id` | UUID, FK → deals.id | NULL | NULL for standard Orders |
| `deal_slot_id` | UUID, FK → deal_slots.id | NULL | Which slot this Order fulfills |
| `origin` | ENUM | `direct_booking` | New values: `quick_deal`, `deal_chain` |

#### `work_instances` (existing)

No changes needed. Work Instances are per-Order, Deal-agnostic.

#### `notifications` (existing)

Add notification events from §8. No schema changes unless events need categorization.

### 15.3 Indexes

```sql
CREATE INDEX idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deal_slots_deal_id ON deal_slots(deal_id);
CREATE INDEX idx_deal_slots_servicer_id ON deal_slots(servicer_id);
CREATE INDEX idx_deal_slots_order_id ON deal_slots(order_id);
CREATE INDEX idx_deal_invitations_servicer_id ON deal_invitations(servicer_id);
CREATE INDEX idx_deal_invitations_slot_id ON deal_invitations(deal_slot_id);
CREATE INDEX idx_orders_deal_id ON orders(deal_id);
CREATE UNIQUE INDEX idx_deal_slots_order_unique ON deal_slots(order_id) WHERE order_id IS NOT NULL;
```

---

## 16. Build Order & Phase Placement

### 16.1 Quick Deal (Phase 1 — Sprint 13)

Quick Deal is a **Phase 1 feature** (shipping alongside the core booking flow). It requires:
- Basic QR generation (servicer profile page → downloadable QR)
- Quick Deal landing page (React component)
- Price negotiation UI (2-person, max 3 counter-rounds)
- Dual confirmation → Order creation
- Rate limiting

### 16.2 Deal-Chaining (Sprint 15–16)

Deal-Chaining is a **Sprint 15–16 feature**, building on:
- WorkflowBuilder (Sprint 15)
- Human Agent System (Sprint 14)
- Request/Bid flow (Sprint 11)
- Advanced features sprint (Sprint 16)

**Alignment with existing build plan:** Deal-Chaining is not listed in the build plan, but the plan lists "Payment Split connector (multi-vendor orders)" in the Extended Features (post-pitch) section. Deal-Chaining is more than a payment split — it's a full coordination layer. It should be scheduled for Sprint 15–16.

### 16.3 Priority Within Sprint 16

| Feature | Dependency | Priority |
|---------|-----------|----------|
| Deal CRUD (create, list, view) | None | P0 |
| Slot management (add, assign) | Deal CRUD | P0 |
| Invitation flow (invite, accept, decline, counter) | Slot management | P0 |
| Single payment → multi-slot escrow | Xendit integration (Sprint 4) | P0 |
| Deal status state machine | Deal CRUD | P0 |
| Deal notification events | Notifications domain (Sprint 5) | P0 |
| Slot replacement | Invitation flow | P1 |
| Per-slot partial release opt-in | Escrow system | P1 |
| Deal dispute panel (admin) | Dispute system (Sprint 7) | P2 |
| Deal-Chaining in WorkflowBuilder | WorkflowBuilder (Sprint 15) | P3 |

---

## 17. Design Rationale & Resolved Tensions

### 17.1 Tension: "No Multi-Party Orchestration" (WorkflowBuilder §7) vs Deal-Chaining

**Resolution:** Deal-Chaining orchestrates Orders, not Work. The WorkflowBuilder remains single-servicer per D28's own definition. No conflict.

### 17.2 Tension: All-or-Nothing Release vs Servicer Cash Flow

**Resolution:** Default is all-or-nothing (D28). Per-slot partial release is an opt-in toggles for servicers who prioritize cash flow. The default protects buyers. The opt-in protects servicers. Both use cases are supported.

### 17.3 Tension: Single QR per Servicer vs Multiple Listings

**Resolution:** QR links to a landing page, not a listing. The buyer chooses which service they want from the servicer's active listings. If only one listing exists, the page pre-selects it.

### 17.4 Tension: Deal-Chaining as a "Project Tag" vs Full-Fledged Feature

**Resolution (adopting D28's original intent):** Deal-Chaining starts as "project-tagged linked Orders" — the Deal is a container that groups Orders. The full multi-slot coordination layer (slot replacement, partial release, Deal dispute panel) is built out post-pitch as usage warrants.

### 17.5 Tension: Quick Deal Archetype Restrictions vs Servicer Freedom

**Resolution:** Quick Deal is restricted to compatible archetypes (A2, A3, A4, A8) at the app level. If a servicer's primary listing uses an incompatible archetype (A1, A5, A6, A7, A9, A10), they must create a compatible listing or the Quick Deal button is disabled. This protects both parties from a workflow that doesn't fit impromptu transactions.

### 17.6 Tension: Cash Rate Blending in Mixed Deals

**Resolution:** Per-slot rates, summed. No blending. Each slot's payment method determines its rate. This adds complexity in the fee calculation (must compute per slot rather than once-per-deal) but is fairer for all parties.

### 17.7 Tension: Deal Cancellation Fee Overlap with D21

**Resolution:** D21's ₱50 cancellation fee applies to individual Orders. For Deal-Chaining, the same ₱50 is applied per slot (each slot = one future Order). A Deal cancellation is effectively N × ₱50 in cancellation fees. This is consistent with treating each slot as an independent service commitment.

### 17.8 Tension: Agent Commission on Chained Deals

**Resolution:** Per-slot commission split, not per-deal. This is consistent with treating each slot as an independent service engagement. An agent represents one owner's listing; they earn commission on that listing's slot only.

### 17.9 Tension: Xendit Single Payment vs Multi-Slot Escrow

**Resolution:** The internal ledger handles the mapping. Xendit sees one payment and N disbursements. The system guarantees the sum of per-slot holds equals the full payment capture, and the sum of per-slot releases/refunds equals the sum of holds. Ledger reconciliation is enforced via a CHECK constraint at the transaction level.

### 17.10 Tension: Quick Deal Trust Without Platform Tools

**Resolution:** Quick Deal inherently has low evidence (D24: no GPS, no step tracking). By default, Quick Deals operate at the "Low" evidence tier, meaning:
- Cash Quick Deals: burden falls on servicer for disputes (D24 Low tier)
- Digital Quick Deals: the platform record (dual confirmation, price negotiation, timestamps) counts as "Medium" evidence
- The Quick Deal flow recommends both parties take a photo during the transaction for evidence
- The dual confirmation IS the proof — if both parties confirm, no dispute arises

---

## Appendix A: Edge Cases Catalog

| # | Edge Case | Resolution |
|---|-----------|-----------|
| EC1 | Servicer invited to same Deal slot by two different buyers | System checks: a servicer cannot have >1 pending `invitation_sent` for different buyer Deals that overlap. If they accept one, the other is auto-declined. |
| EC2 | Buyer creates Deal-Chain, invites servicer who is also the deal creator's competitor | No restriction. Servicers can participate in any Deal they're invited to. |
| EC3 | Quick Deal QR scanned by buyer with insufficient app permissions (no phone number visible) | System prompts buyer to grant permissions before proceeding. If declined, Quick Deal is disabled but standard booking via the listing still works. |
| EC4 | All slots filled but buyer takes >72 hours to approve and pay | Deal auto-cancels at 72 hours. Slots are released. Invited servicers are notified. |
| EC5 | Servicer accepts slot, then realizes they're double-booked | Within the 48-hour invitation window: slot goes back to `pending`, buyer invited to replace. After slot is `filled`: treated as servicer-initiated dropout — dealer's fee applies. |
| EC6 | Partial release opted-in servicer completes, but Deal is later disputed by buyer for "whole deal ruined" | The partial release payment is NOT clawed back from the servicer. The dispute fund covers the buyer's loss. The completed servicer is unaffected. |
| EC7 | Deal `in_progress` and a natural disaster prevents all servicers from completing | Admin force-cancels the Deal with full refund to buyer. Servicers who already completed work submit claims to the dispute fund. Force majeure clause in ToS. |
| EC8 | Buyer scans Quick Deal QR, sends offer, then leaves the vicinity | The 30-minute offer window still applies. Servicer can accept; buyer is notified. If buyer doesn't confirm within 15 minutes of servicer acceptance, the Order is auto-cancelled. Servicer gets ₱50 cancellation fee. |
| EC9 | Quick Deal created for a listing that the servicer has paused | System checks `offer.status` at Quick Deal initiation. If listing is inactive, Quick Deal button is disabled with "This service is currently unavailable." |
| EC10 | Deal-Chain with 0 price slot (free service) | Permitted. The slot has ₱0 price, 0% commission, and is automatically considered "completed" for escrow purposes. The servicer still gets a review. |
| EC11 | Same servicer in multiple slots of one Deal | **Prohibited.** A servicer can only fill ONE slot per Deal. This prevents concentration risk and ensures each slot has independent fulfillment. |
| EC12 | Deal-Chain for services that must be sequential (lechon must arrive before catering can plate) | The Deal system does NOT enforce ordering. It is the buyer's responsibility to coordinate timing. Future enhancement: "Slot Dependency" field (`depends_on_slot_id`) for Phase 3+. |

---

## Appendix B: Quick Decision Reference

| Issue | Decision | Rationale |
|-------|----------|-----------|
| Single payment vs per-slot payment | Single buyer payment, internal multi-slot holds | Better UX, consistent with "one deal, one payment" mental model |
| All-or-nothing release vs per-slot release | All-or-nothing default, per-slot opt-in available | Balances buyer protection with servicer cash flow |
| Cancellation fee: per-slot vs per-deal | Per-slot | Each servicer's time is independently valuable |
| Dispute: slot-isolated vs whole-deal | Slot-isolated default, "whole deal ruined" exception | Prevents hostage-taking while allowing legitimate claims |
| Commission: per-slot vs blended | Per-slot rates, summed | Each slot's payment method & category determine its own rate |
| Archetype change on Quick Deal | No change; listing's archetype is preserved | Consistency with the listing's service category |
| Agent commission on chained deals | Per-slot, per-owner | Agent represents one owner's listing |
| Quick Deal max counter-rounds | 3 rounds | Prevents negotiation fatigue while allowing price discovery |
| Invitation timeout | 48 hours | Long enough for provincial response times; short enough to move forward |
| Servicers in multiple slots per Deal | Prohibited | Prevents concentration risk and identity confusion |

---

*End of Deal System Specification. This document serves as the authoritative spec for Quick Deal and Deal-Chaining, extending D28 with all integration points resolved against D6, D17, D19, D20, D21, D24, D25, D26, D27, the WorkflowBuilder Spec, and the Fulfillment Archetype Library.*
