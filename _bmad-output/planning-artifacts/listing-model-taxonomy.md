# Serbizyu — Listing Model Taxonomy

> BMAD Phase 1: Analysis Artifact  
> Date: July 25, 2026  
> Purpose: Formalize the data design foundation — terminology, listing primitives, fulfillment archetypes, and naming conventions. LOCK before Phase 2 (PRD) to ensure consistent terminology across all downstream documents.  
> Source: BMAD reference template + Serbizyu old-docs (fulfillment archetypes, decision matrix, deal system spec)

---

## 1. The Four Listing Types

All platform content = Listings. Every transaction starts from one of these four:

```
All platform content = Listings
  ├── Service Listing      (Service Provider offers a service — physical or digital)
  ├── Product Listing      (Seller sells a product — physical or digital)
  ├── Service Request      (Customer needs a service — posts for bids)
  └── Product Request      (Buyer needs a product — posts for bids)
```

**Terminology (LOCKED):**

| Context | Provider Side | Consumer Side | Umbrella |
|---|---|---|---|
| **Service** | Service Provider | Customer | Ka-Serbizyu |
| **Product** | Seller | Buyer | Ka-Serbizyu |

"Ka-Serbizyu" is the community name for everyone on the platform — used in UI, notifications, emails, and community-facing communication. Example: "Welcome, Ka-Serbizyu!" / "Ka-Serbizyu, your booking is confirmed."

Digital is NOT a separate listing type. A digital product IS a Product Listing fulfilled via A9 (Digital Deliverable). A digital service IS a Service Listing fulfilled via A9.

Separate from listing types are **Transaction Mechanisms** — how a listing becomes an order:

| Mechanism | Description |
|---|---|
| Direct Booking | Buyer browses a listing and books directly |
| Reverse Bidding | Buyer posts a Request, servicers bid |
| Quick Deal | Face-to-face via QR/NFC/SMS, references or creates a listing on the fly |
| Deal-Chaining | Multi-slot container; each slot spawns an independent Order from a listing |
| Agent-Mediated | Agent creates/manages listing on behalf of offline owner; SMS consent gates critical actions |

---

## 2. Dimensional Breakdown

### Dimension 1 — Fulfillment Type (what is being transacted)

| Type | Example | Archetype |
|---|---|---|
| Service | Plumbing, haircut, tutoring, tricycle ride | A1–A10 |
| Product | Lutong Bahay meal, hardware item, handmade craft | A4 (Handoff) |
| Digital | Logo design, consultation recording, e-book | A9 (Digital Deliverable) |

**Rule:** Digital products are NOT a separate commerce primitive. They flow through Product Listings using A9: Digital Deliverable as their fulfillment archetype. The listing type captures the offering; the fulfillment archetype handles delivery mechanics.

### Dimension 2 — Initiation (who creates)

| Initiation | Created By | Fulfilled By |
|---|---|---|
| Offer / Listing | Servicer posts | Servicer |
| Request | Buyer posts | Any servicer who bids/accepts |
| Quick Deal | Face-to-face, either party | Servicer |
| Agent Listing | Agent on behalf of Owner | Servicer (Owner) |

### Dimension 3 — Origin (how the transaction started)

Recorded as metadata on the Order. Distinct from the listing type.

| Origin | Meaning |
|---|---|
| `direct_booking` | Buyer browsed a Service/Product Listing and booked |
| `request_to_accept` | Buyer posted a Request, servicer accepted/bid |
| `quick_deal` | Face-to-face via QR/NFC/SMS |
| `agent_mediated` | Agent arranged the deal on behalf of an offline owner |
| `deal_chain` | Multi-slot deal container |
| `offline_sync` | Created offline on a device, synced later |

---

## 3. Relationship to Orders

Each transaction type flows to an Order, which gets a Work Instance:

```
Listing → Order → Work Instance (per archetype A1–A10)
Request → Order → Work Instance
Quick Deal → Order → Work Instance
Deal-Chain → [Order per slot] → [Work Instance per slot]
```

The Order state machine (D6 status contract: `not_started | in_progress | awaiting_signoff | completed | disputed`) is shared across all origins.

---

## 4. The 10 Fulfillment Archetypes

*Source: Old-docs architecture/fulfillment-archetypes.md — embedded here as single source of truth.*

Every product or service, from a haircut to a hectare of rice to a hired hearse, reduces to one of ten fulfillment shapes. Two services can be in completely different industries and share a shape (tutoring and dental cleaning are both appointment shapes). Two services in the same industry can have different shapes (a scheduled airport van is appointment-shaped; an on-call tricycle is dispatch-shaped).

Every archetype must answer three questions:
1. What is the current status?
2. Is it ready for escrow release?
3. What does the buyer see as proof of progress?

### A1. Linear Project (milestone sequence)

**Shape:** Ordered steps, each gated by buyer sign-off. Days to weeks.

```
not_started → in_progress(step N) → awaiting_signoff(step N) → in_progress(step N+1) → ... → completed
```

**Proof types:** File uploads, photos, links, written reports.
**Template tier:** 1 (preset). This is the original Work model.
**Examples:** Web design, logo design, house construction, event planning, thesis editing.
**Escrow:** Released per milestone or in full at completion. Per-milestone release is a config flag on the template.

### A2. Instant Dispatch (state machine, location-triggered)

**Shape:** Auto-advancing states driven by GPS or simple confirmations. Minutes to hours.

```
not_started → en_route_pickup → passenger_boarded → en_route_dropoff → completed
                   ↓ (timeout/unresponsive)
                disputed
```

**Proof types:** GPS location, one-tap confirmations, optional photo at handoff.
**Template tier:** 2 (customized preset). Structure is standard; fares, zones, and radius thresholds are per-servicer config.
**Examples:** Tricycle, habal-habal, same-day delivery, towing.
**Escrow:** Held at booking, released on arrival confirmation. Auto-confirm after timeout with buyer notification.

### A3. Appointment (calendar slot)

**Shape:** Book a time, show up, mark done. The calendar is the source of truth.

```
not_started → scheduled → in_progress (at slot time) → completed
                   ↓ (no-show by either party)
                disputed / cancelled
```

**Proof types:** Attendance confirmation (both parties), optional session notes or photo.
**Template tier:** 2. Slot duration, buffer, advance window, cancellation policy are config.
**Examples:** Tutoring, salon, dental cleaning, massage, consulting, driving lessons.
**Escrow:** Held at booking. Released on completion confirmation. Cancellation policy configurable.

### A4. Handoff (pack, ship, receive)

**Shape:** The product fulfillment shape. No milestones, just custody transfer.

```
not_started → preparing → ready_for_pickup / shipped → received → completed
                                ↓ (item not as described)
                             disputed
```

**Proof types:** Photo of packed item, courier tracking number, buyer receipt confirmation, photo on receipt.
**Template tier:** 1 preset. Deliberately simple; complexity lives in Offer attributes (weight, variants, perishability).
**Examples:** Meat vendor, baked goods, crafts, ukay-ukay, produce, sari-sari restock orders.
**Escrow:** Released on receipt confirmation. Auto-confirm after N days if tracking shows delivered.

### A5. Rental / Asset Return (checkout, use, return, condition check)

**Shape:** Two handoffs with a condition check in between. The only archetype with two custody transfers.

```
not_started → checked_out → in_use → returned → condition_verified → completed
                                                 ↓ (damage/late)
                                              disputed
```

**Proof types:** Photo set at checkout (asset condition), photo set at return, timestamps, optional deposit hold.
**Template tier:** 2. Deposit amount, late fee, condition checklist are config.
**Examples:** Sound system, karaoke machine, welding equipment, gowns/barong, tables and chairs, vehicle rental.
**Escrow:** Two holds: rental fee + security deposit. Fee releases on condition verification.

### A6. Recurring / Subscription (repeating schedule)

**Shape:** One Order, N repeating Work Instances. Parent Order owns the escrow schedule.

```
parent: active
  child cycle N: not_started → in_progress → completed → (escrow release for cycle N)
parent: completed (when all cycles done or subscription ends)
```

**Proof types:** Per-cycle confirmation, photo, or log entry.
**Template tier:** 2. Frequency, cycle count, skip/pause policy, per-cycle vs lump payment are config.
**Examples:** Weekly house cleaning, garden maintenance, garbage collection, bookkeeping retainer, caregiver shifts.
**Escrow:** Per-cycle release recommended. Lump-sum upfront allowed but flagged as higher risk to buyer.

### A7. Quoted / Negotiated (request, bid, custom scope)

**Shape:** Buyer posts a request, servicers bid, the winner's bid becomes the Work Template.

```
request_open → bids_received → bid_accepted → [generates A1/A3/A5-shaped instance] → completed
```

**Proof types:** Inherited from whatever archetype the winning bid specifies.
**Template tier:** 3 (structurally flexible). Winning servicer proposes scope structure, price breakdown.
**Examples:** House construction, catering for 200 pax, bulk printing, land clearing, full-home renovation.
**Escrow:** Follows the generated instance's archetype. Usually milestone-based (A1).

### A8. Emergency / On-Demand (first-accept dispatch)

**Shape:** Broadcast to N nearby servicers, first accept wins. Speed matters more than price.

```
broadcast → accepted → en_route → on_site → work_done → completed
               ↓ (no accept in X min)
            escalated (wider radius or ops assist)
```

**Proof types:** GPS, photo before/after, buyer confirmation.
**Template tier:** 2. Radius, escalation ladder, surge flag (manual in v1) are config.
**Examples:** Plumbing emergency, locksmith, towing, electrical fault, urgent appliance repair.
**Escrow:** Estimated range held at accept, trued up at completion with buyer approval for overage.

### A9. Digital Delivery (file or link handover)

**Shape:** No physical custody. Proof is the delivered artifact plus buyer confirmation.

```
not_started → in_progress → delivered → accepted → completed
                                 ↓ (revision rounds, config count)
                             in_progress
```

**Proof types:** The artifact itself (stored in media system), revision thread, acceptance click.
**Template tier:** 1 preset. Revision round count and delivery format are config.
**Examples:** Graphic design, layout, video edit, resume writing, spreadsheet work, online research.
**Escrow:** Released on acceptance or after auto-accept window (default 3 days).

### A10. Long-Running / Open-Ended (retainer)

**Shape:** No defined end. Work Instance is a container for logged sessions, billed periodically.

```
active (rolling) → session logs accumulate → periodic invoice → paid → continues
     ↓ (either party ends, notice period config)
  winding_down → completed
```

**Proof types:** Session logs (date, hours, notes), periodic summary reports.
**Template tier:** 2. Billing period, notice period, session log requirements are config.
**Examples:** Virtual assistant, ongoing bookkeeping, regular caregiving, social media management, farm caretaking.
**Escrow:** Not a single hold. Each period is invoiced and paid through the same ledger (escrow-per-period).

### Archetype Coverage Summary

| # | Archetype | Duration | Custody transfers | Primary trigger | Template tier |
|---|---|---|---|---|---|
| A1 | Linear Project | days–weeks | 0–1 (final artifact) | Buyer sign-off | 1 |
| A2 | Instant Dispatch | minutes–hours | 1 (passenger/item) | GPS / confirmations | 2 |
| A3 | Appointment | hours | 0 | Calendar time | 2 |
| A4 | Handoff | hours–days | 1 | Receipt confirmation | 1 |
| A5 | Rental | hours–days | 2 (out and back) | Condition check | 2 |
| A6 | Recurring | weeks–months | per cycle | Schedule | 2 |
| A7 | Quoted | varies | varies | Winning bid defines it | 3 |
| A8 | Emergency | minutes–hours | 0–1 | First accept | 2 |
| A9 | Digital Delivery | days | 0 (file) | Acceptance click | 1 |
| A10 | Long-Running | indefinite | 0 | Periodic invoice | 2 |

**Presets needed at launch: 4** (A1, A3, A4, A9). The rest are tier-2 configurations or Phase 3 builds. Four presets cover the majority of a provincial service economy; the archetype library proves the other six need config, not re-architecture.

---

## 5. Naming Convention Rules

As the architecture evolves, keep these terms distinct:

- **Listing** = anything posted on the platform available for transaction
- **Fulfillment Type** = service vs product vs digital (determines archetype)
- **Origin** = how the transaction began (metadata, not a separate model)
- **Deal** = a container that coordinates multiple Orders (Deal-Chain) or a face-to-face transaction (Quick Deal)
- **Order** = the financial/contractual wrapper for a transaction. Feeds into the Order state machine (D6)
- **Work Instance** = the operational execution of an Order. Follows a specific fulfillment archetype
- **My Space** = servicer's configurable platform hub for connectors, tools, and profile management

---

## 6. Quick Deal Archetype Compatibility

Quick Deal involves face-to-face, impromptu transactions. Not all archetypes are compatible:

| Archetype | Quick Deal Compatible? | Rationale |
|---|---|---|
| A1 Linear Project | No | Requires planning, milestones, scope definition |
| A2 Instant Dispatch | Conditional | Works for pre-negotiated trips; GPS auto-advance needs app open |
| A3 Appointment | Yes | Ideal: check calendar availability on the spot |
| A4 Handoff | Yes | Ideal: immediate exchange |
| A5 Rental | No | Requires deposit hold, condition check-in/out |
| A6 Recurring | No | Can't establish subscription in single impromptu meeting |
| A7 Quoted | No | Requires bidding; contradicts impromptu flow |
| A8 Emergency | Yes | Emergency dispatch via Quick Deal works |
| A9 Digital Delivery | No | Digital delivery doesn't happen face-to-face |
| A10 Long-Running | No | Retainer can't be negotiated in impromptu QR scan |

---

*Taxonomy LOCKED. All downstream artifacts (PRD, Architecture, Epics & Stories) must use these terms consistently.*
