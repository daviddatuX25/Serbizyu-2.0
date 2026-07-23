# Serbizyu — Fulfillment Archetype Library
*The finite set of shapes behind every product and service. If the engine covers these 10 archetypes, it covers the industry. Everything else is configuration, not engineering.*

---

## 0. The Core Argument

Marketplace categories look infinite. They are not. Every product or service, from a haircut to a hectare of rice to a hired hearse, reduces to one of ten fulfillment shapes. Two services can be in completely different industries and share a shape (tutoring and dental cleaning are both appointment shapes). Two services in the same industry can have different shapes (a scheduled airport van is appointment-shaped; an on-call tricycle is dispatch-shaped).

This is why the Work engine is pluggable: the shape varies, the contract does not. Every archetype must answer the same three questions (§5a of the full spec):

1. What is the current status? (`not_started / in_progress / awaiting_signoff / completed / disputed`)
2. Is it ready for escrow release?
3. What does the buyer see as proof of progress?

Below: each archetype's state machine, proof types, default tools, and template tier. The JSONB `structure` column holds the shape; the `status` column stays fixed.

---

## A1. Linear Project (milestone sequence)

**Shape:** Ordered steps, each gated by buyer sign-off. Days to weeks.

```
not_started → in_progress(step N) → awaiting_signoff(step N) → in_progress(step N+1) → ... → completed
```

**Proof types:** File uploads, photos, links, written reports.
**Tools:** Document Generator, Calendar (optional).
**Template tier:** 1 (preset). This is the original Work model, unchanged.
**Examples:** Web design, logo design, house construction, event planning, thesis editing.
**Escrow:** Released per milestone or in full at completion. Per-milestone release is a config flag on the template.

---

## A2. Instant Dispatch (state machine, location-triggered)

**Shape:** Auto-advancing states driven by GPS or simple confirmations. Minutes to hours.

```
not_started → en_route_pickup → passenger_boarded → en_route_dropoff → completed
                    ↓ (timeout/unresponsive)
                 disputed
```

**Proof types:** GPS location, one-tap confirmations, optional photo at handoff.
**Tools:** Mapbox Map, Route Planner (multi-stop variant), Weather.
**Template tier:** 2 (customized preset). The structure is standard; fares, zones, and radius thresholds are per-servicer config.
**Examples:** Tricycle, habal-habal, same-day delivery, towing.
**Escrow:** Held at booking, released on arrival confirmation. Auto-confirm after timeout (default 30 min) with buyer notification.

---

## A3. Appointment (calendar slot)

**Shape:** Book a time, show up, mark done. The calendar is the source of truth, not a step list.

```
not_started → scheduled → in_progress (at slot time) → completed
                   ↓ (no-show by either party, configurable)
                disputed / cancelled
```

**Proof types:** Attendance confirmation (both parties), optional session notes or photo.
**Tools:** Calendar, Document Generator (certificates, receipts).
**Template tier:** 2. Slot duration, buffer, advance window, cancellation policy are config.
**Examples:** Tutoring, salon, dental cleaning, massage, consulting, driving lessons.
**Escrow:** Held at booking. Released on completion confirmation. Cancellation policy config: who pays what when someone cancels inside the penalty window.

---

## A4. Handoff (pack, ship, receive)

**Shape:** The product fulfillment shape. No milestones, just custody transfer.

```
not_started → preparing → ready_for_pickup / shipped → received → completed
                                 ↓ (item not as described)
                              disputed
```

**Proof types:** Photo of packed item, courier tracking number (optional), buyer receipt confirmation, photo on receipt (optional).
**Tools:** Inventory Check (Phase 3+), Document Generator (receipt).
**Template tier:** 1 preset. This is deliberately simple; complexity lives in the Offer attributes (weight, variants, perishability), not the Work structure.
**Examples:** Meat vendor, baked goods, crafts, ukay-ukay, produce, sari-sari restock orders.
**Escrow:** Released on receipt confirmation. Auto-confirm after N days if tracking shows delivered or if pickup was in person (immediate).

---

## A5. Rental / Asset Return (checkout, use, return, condition check)

**Shape:** Two handoffs with a condition check in between. The only archetype where the Work Instance has two custody transfers.

```
not_started → checked_out → in_use → returned → condition_verified → completed
                                                  ↓ (damage/late)
                                               disputed
```

**Proof types:** Photo set at checkout (asset condition), photo set at return, timestamps, optional deposit hold.
**Tools:** Calendar (booking window), Document Generator (rental agreement), Inventory Check.
**Template tier:** 2. Deposit amount, late fee per hour/day, condition checklist are config.
**Examples:** Sound system, karaoke machine, welding equipment, gowns/barong, tables and chairs, vehicle rental.
**Escrow:** Two holds: rental fee + security deposit. Fee releases on condition verification. Deposit releases in full or partial minus documented damage.

---

## A6. Recurring / Subscription (repeating schedule)

**Shape:** One Order, N repeating Work Instances. The parent Order owns the escrow schedule; each cycle is a child instance.

```
parent: active
  child cycle N: not_started → in_progress → completed → (escrow release for cycle N)
parent: completed (when all cycles done or subscription ends)
```

**Proof types:** Per-cycle confirmation, photo, or log entry.
**Tools:** Calendar (schedule generation), Document Generator (monthly statements).
**Template tier:** 2. Frequency, cycle count, skip/pause policy, per-cycle vs lump payment are config.
**Examples:** Weekly house cleaning, garden maintenance, garbage collection, bookkeeping retainer, caregiver shifts.
**Escrow:** Per-cycle release recommended. Lump-sum upfront is allowed but flagged as higher risk to the buyer in the UI.

---

## A7. Quoted / Negotiated (request, bid, custom scope)

**Shape:** The buyer posts a request, servicers bid, the winner's bid *becomes* the Work Template. This is the `service_request` Offer type wired to the Work engine.

```
request_open → bids_received → bid_accepted → [generates A1/A3/A5-shaped instance] → completed
```

**Proof types:** Inherited from whatever archetype the winning bid specifies.
**Tools:** All, depending on the generated instance.
**Template tier:** 3 (structurally flexible). The winning servicer proposes the scope structure (steps, schedule, price breakdown) as part of the bid. The LLM-assisted builder (§5a tier 3) helps them draft it.
**Examples:** House construction, catering for 200 pax, bulk printing, land clearing, full-home renovation.
**Escrow:** Follows the generated instance's archetype. Usually milestone-based (A1).

---

## A8. Emergency / On-Demand (first-accept dispatch)

**Shape:** Broadcast to N nearby servicers, first accept wins. Speed matters more than price comparison.

```
broadcast → accepted → en_route → on_site → work_done → completed
                ↓ (no accept in X min)
             escalated (wider radius or ops assist)
```

**Proof types:** GPS, photo before/after, buyer confirmation.
**Tools:** Mapbox Map, Weather (relevance: roof leak in storm), Notifications (multi-channel blast).
**Template tier:** 2. Radius, escalation ladder, surge flag (manual, not algorithmic, in v1) are config.
**Examples:** Plumbing emergency, locksmith, towing, electrical fault, appliance repair (urgent).
**Escrow:** Estimated range held at accept, trued up at completion with buyer approval for overage.

---

## A9. Digital Delivery (file or link handover)

**Shape:** No physical custody. Proof is the delivered artifact plus buyer confirmation it opens/works.

```
not_started → in_progress → delivered → accepted → completed
                                  ↓ (revision rounds, config count)
                              in_progress
```

**Proof types:** The artifact itself (stored in media system), revision thread, acceptance click.
**Tools:** Document Generator, (optional) watermarked preview generation.
**Template tier:** 1 preset. Revision round count and delivery format are config.
**Examples:** Graphic design, layout, video edit, resume writing, spreadsheet work, online research.
**Escrow:** Released on acceptance or after auto-accept window (default 3 days). Watermarked previews before release are a Phase 3 trust feature.

---

## A10. Long-Running / Open-Ended (retainer)

**Shape:** No defined end. The Work Instance is a container for logged sessions, billed periodically.

```
active (rolling) → session logs accumulate → periodic invoice → paid → continues
     ↓ (either party ends, notice period config)
  winding_down → completed
```

**Proof types:** Session logs (date, hours, notes), periodic summary reports.
**Tools:** Calendar (recurring sessions), Document Generator (monthly invoice/report).
**Template tier:** 2. Billing period, notice period, session log requirements are config.
**Examples:** Virtual assistant, ongoing bookkeeping, regular caregiving, social media management, farm caretaking.
**Escrow:** Not a single hold. Each period is invoiced and paid through the same ledger. Think escrow-per-period, not escrow-per-order.

---

## Archetype Coverage Summary

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

**Presets needed at launch: 4** (A1, A4, A3, A9). The rest are tier-2 configurations or Phase 3 builds. This is the concrete answer to "how much do we build up front": four presets cover the majority of a provincial service economy, and the archetype library proves the other six need config, not re-architecture.

---

*End of Archetype Library. Ten shapes, one contract, four launch presets. The industry is a combinatorial problem with a closed-form answer.*
