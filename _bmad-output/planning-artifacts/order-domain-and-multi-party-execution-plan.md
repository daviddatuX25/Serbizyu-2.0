# Order Domain & Multi-Party Execution Architecture Plan
**Document**: Production Implementation Specification & Tracer-Bullet Roadmap  
**Status**: APPROVED & READY FOR PHASED EXECUTION  
**Target Systems**: `App\Modules\DealCoordination`, `App\Modules\OrdersWork`, `App\Modules\PaymentObligations`, `resources/js/Pages/Orders/`

---

## 1. Executive Summary & Core Bounded Contexts

Following the architectural review (`OrderDomainAndSeederArchitect`), the Order Domain is structured as three strictly decoupled modules collaborating through neutral contracts under `App\Shared\Contracts\`:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     DEAL COORDINATION MODULE                                    │
│   • Owns: `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`, `runtime_gates`│
│   • Authority: Coordination planning, partner sourcing, N-slot DAGs, and parent roll-up         │
│   • Invariant: NEVER writes directly to `orders`, `work_instances`, or `payment_obligations`    │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │
                                  │ Invokes via `ChildOrderFormationPort` & `DealNeedOrderLinkPort`
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ORDERS & WORK MODULE                                      │
│   • Owns: `orders`, `order_parties`, `order_terms_snapshots`, `work_instances`, `work_events`   │
│   • Authority: Bilateral commercial agreement formation and single-provider execution          │
│   • Invariant: Atomically commits Order, Terms, Work, Parties, and Primary Obligation           │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │
                                  │ Emits verified completion facts via `FulfillmentFactPort`
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PAYMENT OBLIGATIONS MODULE                                   │
│   • Owns: `payment_obligations`, `payment_events`, `financial_transactions`, `financial_entries`│
│   • Authority: Tiwala escrow release, double-entry ledger balance, and non-cascading payout     │
│   • Invariant: Append-only ledger; corrections are offsetting pairs, never in-place updates     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic $N$-Slot Architecture & Rich Status Continuum

### A. Dynamic $N$-Slot Support
Deal Chains are **arbitrary Directed Acyclic Graphs (DAGs)**. The system dynamically scales to any number of nodes:
- **2-Slot Flow**: Store Supply $\to$ Motorcycle Courier (e.g. food, retail goods).
- **3-Slot Flow**: Store Parts $\to$ Motorcycle Courier $\to$ Technician Labor (e.g. AC capacitor replacement).
- **4-Slot Flow**: Construction Supply $\to$ Flatbed Hauler $\to$ Masonry Laborer $\to$ Scrap Hauler (e.g. renovation & debris clearing).
- **5-Slot Flow**: Wet Palay Harvest $\to$ Tractor Haul $\to$ Solar Dryer Yard $\to$ Truck Logistics $\to$ Rice Mill (e.g. agricultural processing).

### B. The 10-State Progress Continuum

| State Key | Badge Display | Meaning & Authority |
|---|---|---|
| `sourcing` | `Seeking Bids` | Unbound open slot awaiting provider proposals in the quote marketplace. |
| `invited` | `Invited` | Partner slot has a pending `deal_invitation`; awaiting provider response. |
| `partner_confirmed` | `Partner Ready` | Provider accepted invitation; awaiting customer's final order confirmation. |
| `counter_ready` | `Counter Ready` | Merchant has packaged and verified the items at the stall counter. |
| `in_transit` | `In Transit (~8m)` | Courier has collected custody and is actively en route with live ETA. |
| `on_site_prep` | `On-Site Prepping` | Technician checked in at customer location; unblocked by courier delivery. |
| `awaiting_signoff` | `Needs Sign-off` | Work completed; awaiting customer inspection and OTP verification. |
| `completed` | `✓ Completed` | Step finished and verified; eligible for Tiwala escrow release. |
| `blocked` | `⬡ Blocked` | Active dependency gate waiting for upstream proof, or administrative hold. |
| `replacement_needed`| `Replacing Partner` | Provider declined or timed out; auto-sourcing alternative partner. |

---

## 3. Replayability, Event Sourcing & Causal Logging

Every state mutation in the Order domain adheres to **immutable, append-only persistence**:

```
                       ATOMIC DATABASE TRANSACTION (Commit All or Rollback)
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Aggregate Mutation: `orders`, `deal_needs` updated with row_version CAS                     │
│ 2. Append-Only Event:  `work_events` or `payment_events` inserted with sequence # & hash       │
│ 3. Causal Audit Trail: `audit_events` inserted with `actor`, `command_name`, and `causation_id`│
│ 4. Idempotency Guard:  `idempotency_keys` committed with response payload & status 200        │
│ 5. Transaction Outbox: `outbox_messages` enqueued for asynchronous worker delivery             │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Deterministic Replay Guarantees
1. **Zero State Overwrite**: Money and fulfillment history are INSERT-only. Even if an order is cancelled or disputed, all prior milestones and payment attempts remain queryable.
2. **Causal Lineage**: Every child order points to its parent `deal_chain_id` and `deal_need_id`. Every audit event records the `causation_id` that triggered it, creating an unbroken causal DAG from initial quotation to final escrow payout.
3. **Replay from Checkpoint**: Outbox workers track a monotonic sequence. In the event of a worker crash or external network timeout, events can be safely replayed from any checkpoint without duplicating financial or commercial effects.

---

## 4. Multi-Role RBAC Projections

| Persona | Hub View (/orders) | Operational Scope | Permitted Actions |
|---|---|---|---|
| **Buyer / Resident** (e.g. Maria) | Unified Ongoing Deal Chain set card with live Slots Strip; separate History receipts | Full project progress, estimated ETA, total committed cost | Track live DAG, message relay team, sign off completed work |
| **Provider / Technician** (e.g. Kuya Ben) | Assigned service child tasks only | Own work checklist, required evidence, upstream dependency gate | Check in on site, upload photo proof, propose completion |
| **Courier Runner** (e.g. Danny Express) | Assigned delivery child tasks only | Pickup location, drop-off location, route fee | Confirm pickup at counter, report transit, confirm site drop-off |
| **Store Merchant** (e.g. Tagudin Hardware) | Assigned product supply tasks only | Order item list, preparation status, courier handoff | Mark items counter-ready, hand package to courier |
| **Coordinator / Agent** (e.g. Rosa Navarro) | Full multi-party relay management overview | All nodes, slots, invitations, blockers, and replacement lineage | Re-invite partner, coordinate replacement, authorized emergency unblock |

---

## 5. Phased Tracer-Bullet Implementation Roadmap

### Slice 1: Dynamic $N$-Slot Hub Aggregation (Frontend & Backend)
- Refactor `OrderController::index` to support arbitrary $N$-slot DAGs (2 to 5+ nodes).
- Support the complete 10-state progress continuum (`sourcing`, `invited`, `counter_ready`, `in_transit`, `on_site_prep`, `awaiting_signoff`, `completed`, `blocked`).
- Exclude buyer child orders from being loose duplicates on Ongoing tab; retain completed child orders as standalone receipts in History.

### Slice 2: State Transition & Dependency Unblocking Pipeline
- Implement `AdvanceWorkNodeCommand` handling role-specific transitions:
  * `courier_pickup` $\to$ sets courier work to `in_progress`.
  * `courier_handoff` $\to$ sets courier work to `completed`, emits fact `delivered_to_site`.
  * Unblocks downstream dependency gate (`condition_code = 'delivered_to_site'`), advancing technician status to `on_site_prep`!
- Connect `OrderController::courierPickup()` and `courierHandoff()` to execute this pipeline.

### Slice 3: Role-Specific Action Workspaces (`Orders/Show.tsx`)
- Render role-tailored action panels on `Orders/Show.tsx`:
  * Courier view: `[ Confirm Package Pickup ]` and `[ Confirm Site Drop-Off ]`.
  * Technician view: `[ Check-In on Site ]`, `[ Upload Milestone Photo Proof ]`, and `[ Propose Completion ]`.
  * Buyer view: `[ Inspect Photo Proof & Sign Off ]`.

### Slice 4: Automated Testing & Verification
- Add Feature tests in `tests/Feature/OrdersWork/OrderTransitionPipelineTest.php` testing:
  * Dynamic $N$-slot aggregation.
  * Courier site handoff unblocking technician labor gate.
  * Buyer sign-off triggering obligation settlement.
- Verify 100% green test suite in Pest and Vitest.
