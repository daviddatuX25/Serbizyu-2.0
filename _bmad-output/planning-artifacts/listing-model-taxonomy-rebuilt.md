# Serbizyu 2.0 — Rebuilt Listing, Transaction, Fulfillment, and Access Taxonomy

Status: CANONICAL PLANNING AUTHORITY — founder-approved 2026-07-31; implementation/live-money gates remain separate
BMAD phase: Phase 1 — Analysis / Product Taxonomy
Depends on:

- `docs/planning-hardening/00-recovery-charter.md`
- `docs/planning-hardening/01-contradiction-and-supersession-register.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
- `docs/planning-hardening/03-dual-success-and-go-no-go-scorecards.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`
- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`

Purpose: provide a canonical vocabulary and composition model for the PRD, UX, domain contracts, schema, architecture, and epics without freezing unapproved future capabilities into the first pilot

## 1. Taxonomy design rule

Serbizyu must classify a marketplace capability using separate dimensions. A category is not a workflow. A payment lane is not a fulfillment shape. An Agent is not an owner. A quote is not work completion.

Canonical composition:

`Listing Type + Transaction Mechanism + Work/Fulfillment Shape + Payment Obligation/Lane + Access Tier + Category/Safety Class`

The taxonomy defines the vocabulary and valid combinations. The domain/state ceremony will define transitions. The schema ceremony will define persistence. The UX ceremony will define screens and language.

## 2. Core nouns

| Noun | Meaning | Does not mean |
|---|---|---|
| **Listing** | A published offer or request with terms, scope, capacity, area, and lifecycle | A completed order or guaranteed availability |
| **Service Listing** | An offer to perform work or provide a service | A commitment before an Order is accepted |
| **Product Listing** | An offer of a good, prepared item, or capacity-backed product | A guarantee that stock remains available after publication |
| **Service Request** | A Buyer/Customer request for work or a service | An automatically funded or assigned job |
| **Product Request** | A Buyer/Customer request for a good or purchase-on-behalf need | A permission for an Agent to buy without approval |
| **Transaction Mechanism** | How the parties form or revise an Order | The way work is executed |
| **Order** | The agreed commercial and operational container between parties | Proof that payment or work is complete |
| **Payment Obligation** | One amount due for a defined purpose, such as deposit, milestone, final balance, reimbursement, budget, or service fee | The whole financial history of an Order |
| **Work Instance** | The execution record for the agreed service/product fulfillment | A gateway payment or review record |
| **Evidence** | A user/system/provider record supporting an event or claim | Automatic proof merely because a file exists |
| **Payment Lane** | The custody, confirmation, and protection semantics for one Payment Obligation | A generic “paid” badge |
| **Access Tier** | The interaction path and capabilities available to a user | A different authorization model that bypasses consent |
| **Agent** | A delegated platform-management or assistance actor | Automatic owner, payer, recipient, cash custodian, or goods custodian |
| **Category Family** | A discovery and policy grouping with safety/data requirements | A bespoke database workflow |
| **Capability Profile** | An approved combination of the dimensions above | A license to enable every possible combination |

## 3. Listing type model

### 3.1 Offer/request axis

Every listing is one of:

- `offer` — a Provider/Owner offers a service or product.
- `request` — a Buyer/Customer requests a service or product.

### 3.2 Service/product axis

Every listing is one of:

- `service` — value is primarily performed work, time, expertise, or a digital deliverable.
- `product` — value is primarily a physical or digital good, prepared item, or capacity-backed unit.

This creates four canonical listing types:

| Code | Listing type | Initial examples | First work shape |
|---|---|---|---|
| `service_offer` | Service Listing | tutoring, design, repair, cleaning, appointment service | A1/A3/A9 |
| `product_offer` | Product Listing | food, craft, household item, digital product | A4/A9 |
| `service_request` | Service Request | “I need a poster designed,” “I need tutoring” | A1/A3/A9 |
| `product_request` | Product Request | “I need this item,” pabili-like sourcing | A4/A9 |

Digital work is classified by its commercial shape, not treated as an unrelated fifth listing type.

### 3.3 Listing lifecycle vocabulary

The rebuilt domain must support at least:

- `draft`
- `pending_review`
- `active`
- `paused`
- `unavailable`
- `expired`
- `archived`
- `rejected`

The exact transition actors, guards, and events belong to the domain/state ceremony. No listing may imply that an active offer guarantees future capacity.

### 3.4 Listing contract

A supported listing needs:

- Listing type
- Owner identity and authorization
- Title and plain-language description
- Category family
- Fulfillment shape
- Transaction mechanism availability
- Price, quote, or budget semantics
- Availability/capacity semantics
- Service area or pickup/handoff information
- Safety/data class
- Required evidence
- Cancellation and expiry behavior
- Payment-lane availability
- Access/assistance status
- Versioned terms snapshot when an Order is formed

## 4. Transaction mechanism model

Transaction mechanisms are orthogonal to listing type and work shape.

### 4.1 Direct Booking

`browse → select → confirm terms → create Order`

Use when a Provider/Owner publishes sufficiently clear price, scope, capacity, and availability.

Pilot status: `PILOT` for supported Service/Product Listings.

### 4.2 Quote Request

`request → provider submits quote → Buyer reviews → accept/decline/expire → Order`

A quote must snapshot:

- Scope
- Amount or amount components
- Validity/expiry
- Inclusions/exclusions
- Provider
- Fulfillment shape
- Payment-lane options
- Adjustment rules

Pilot status: `PILOT-CONDITIONAL`.

A quote does not prove that work started or payment cleared.

### 4.3 Reverse Bidding

`request → qualified responses → Buyer selects → Order`

Reverse bidding requires:

- Response eligibility
- Expiry
- Anti-spam/rate controls
- Minimum response content
- Buyer selection/decline behavior
- No automatic award merely because a bid is cheapest
- Evidence of what was selected

Pilot status: `PILOT-CONDITIONAL`.

### 4.4 Quick Deal

Quick Deal is a rapid order-formation mechanism, not a work shape.

The initial design distinguishes:

- Connected online Quick Deal — possible conditional pilot capability.
- Air-gapped/offline Quick Deal — deferred; no offline payment authorization, release, or final authority.

Required controls:

- Explicit counterparty confirmation
- Terms/amount snapshot
- Expiry and cancellation
- Safe retry/idempotency
- Safety reminder where physical interaction occurs
- Payment lane disclosure

### 4.5 Agent-Mediated origin

Agent-Mediated is an origin/assistance mode that can accompany Direct Booking, Quote Request, or approved Request flows.

It requires:

- Owner consent
- Scope-limited permission
- Actor attribution
- Owner notification
- Revocation
- Correction/cancellation boundaries
- No automatic money/goods/custody authority

The system must record both:

- The Agent who performed the action.
- The person whose listing, request, or obligation was affected.

### 4.6 Deal-Chaining

Deal-Chaining is a future coordination container that can create parent/child Orders or Work Instances.

It is not an initial pilot mechanism because it requires:

- Child responsibility
- Parent/child cancellation
- Multiple payment obligations
- Subcontractor evidence
- Completion dependency
- Dispute propagation
- Payout/reversal handling

Status: `DEFERRED`, with an explicit future foundation seam.

## 5. Work and fulfillment shape model

A Work Instance describes how an accepted Order is fulfilled. It is independent of payment confirmation.

### A1 — Linear Project

For scoped work with steps, deliverables, revisions, and completion.

Required concepts:

- Scope and deliverables
- Optional milestones
- Progress evidence
- Revision rules
- Completion proposal
- Buyer sign-off/review window
- Dispute/hold behavior

Initial status: `PILOT`.

### A3 — Appointment

For scheduled service at a time or slot.

Required concepts:

- Availability/slot
- Reservation conflict control
- Confirm/reschedule/cancel
- Attendance/no-show
- Safe meeting guidance
- Completion evidence

Initial status: `PILOT`.

### A4 — Handoff

For physical or digital product transfer, pickup, receipt, or purchase-on-behalf completion.

Required concepts:

- Stock/capacity or sourcing request
- Preparation/ready status
- Pickup/handoff location rules
- Receipt/acceptance evidence
- Mismatch/dispute path
- Cancellation and variance behavior

Initial status: `PILOT`.

#### A4 purchase-on-behalf extension

Pabili-like work uses the generic A4 shape with additional fields/events:

- Requested item/service
- Quantity and acceptable alternatives
- Estimate or spending budget
- Provider/Agent approval before purchase
- Actual cost
- Variance reason and approval
- Store receipt/evidence
- Service fee if applicable and approved
- Handoff/receipt
- Unavailable/refund/cancellation treatment

It must not create a separate payment system or imply that an Agent may spend without authority.

### A9 — Digital Delivery

For digital artifacts, files, or digital service outputs.

Required concepts:

- Artifact scope and rights
- Secure upload/access
- Delivery event
- Acceptance or revision
- Version history
- Retention/deletion
- Dispute/evidence treatment

Initial status: `PILOT`.

### A2 — Instant Dispatch

For location/time-sensitive pickup, dropoff, or rapid dispatch.

Required concepts:

- Dispatch request
- Location/privacy policy
- Availability
- Pickup/dropoff
- Timeout/reassignment
- Safety and transport boundary

Status: `DEFERRED`.

### A5 — Rental / Asset Return

For temporary custody of an asset.

Required concepts:

- Condition at release
- Deposit or guarantee semantics
- Due/return state
- Condition at return
- Damage/late dispute
- Reversal/refund

Status: `DEFERRED`.

### A6 — Recurring / Subscription

For repeated cycles of work or supply.

Required concepts:

- Parent agreement
- Child cycle Orders/obligations
- Skip/pause/cancel
- Per-cycle evidence
- End date and termination

Status: `DEFERRED`.

### A8 — Emergency / On-Demand

For urgent dispatch or escalation.

This is partly a dispatch/safety policy and may resolve into A1, A2, A3, or A4.

Status: `DEFERRED`.

### A10 — Long-Running / Open-Ended

For work that cannot be represented as one short project or appointment.

Required concepts:

- Sessions/periods
- Logs
- Periodic completion
- Ending/winding down
- Payment obligations without indefinite ambiguity

Status: `DEFERRED`.

## 6. Taxonomy correction: A7 and A8

The old taxonomy treated A7 Quoted/Negotiated and A8 Emergency/On-Demand as if they were identical kinds of fulfillment shape.

The rebuilt model classifies them as:

- **Quote/Negotiation** — an order-formation mechanism or policy that produces a Work Instance.
- **Emergency/On-Demand** — a dispatch/escalation policy that may produce a Work Instance.

The names may remain familiar for product communication, but the domain and schema must not create a single “archetype” enum that hides these distinctions.

## 7. Payment-obligation and payment-lane model

The taxonomy exposes payment semantics without defining the ledger implementation.

### 7.1 Payment Obligation purposes

A Work Instance or Order may contain one or more future obligations, but mixed tender within one obligation is excluded initially.

Supported purpose candidates:

- Deposit
- Milestone
- Final balance
- Approved reimbursement
- Purchase-on-behalf budget
- Service/protection fee
- Refund/reversal correction

Each obligation must have:

- Purpose
- Amount
- Currency/centavo representation
- Due condition
- Payment lane
- Terms/policy snapshot
- Actor responsibility
- Evidence state
- Refund/reversal behavior

### 7.2 Payment lanes

| Lane | Initial status | Meaning |
|---|---|---|
| External Cash | PILOT | Parties exchange cash directly; Serbizyu records mutual evidence; no Serbizyu custody or automatic refund promise |
| External Digital Proof | PILOT | Parties use an outside provider; Serbizyu records declared/evidence states; screenshots do not prove cleared funds |
| Direct Gateway Digital | SANDBOX-ONLY | Provider-controlled gateway semantics; never mislabeled as completion-protected Tiwala |
| Tiwala Protected Digital | SANDBOX-ONLY | Delayed-payout/protection semantics only after legal/provider/operations approval; release follows authorized completion, not order creation |

Payment confirmation never changes a Work Instance to completed by itself.

## 8. Access-tier model

### L0 — Feature-phone owner

May receive notices and give critical confirmations through supported assisted channels.

Not authorized by default to:

- Release funds
- Hold cash
- Hold goods
- Change ownership
- Approve unreviewed high-risk action

### L1 — Assisted kiosk/access point

May provide assisted discovery, navigation, consent support, and help routing when the operating model is approved.

Not a bank, deposit point, cash float, payout operator, or hidden Agent authority.

### L2 — Low-data/intermittent smartphone

May support low-bandwidth browsing, forms, safe drafts, and retry.

Offline state cannot become final authority for:

- Digital payment
- Payout/release
- Final inventory
- Consent-sensitive action
- Irreversible Order transition

### L3 — Online smartphone/PWA

Supports complete approved marketplace journeys.

### L4 — Admin/operator

Supports inspection, evidence, disputes, holds, reconciliation, safety, and recovery with audit attribution.

## 9. Category-family and safety-class model

Categories remain broad and expandable. The taxonomy avoids a permanently authoritative category count.

Each category family needs metadata for:

- Buyer/Provider visibility
- Supported listing types
- Supported mechanisms
- Supported work shapes
- Safety class
- Data class
- Identity/verification requirement
- Meeting/location policy
- Evidence requirement
- Cancellation/refund policy
- Agent-assistance eligibility
- Pilot/future status

Initial family groups:

- Digital, creative, academic, administrative
- Appointments and personal services
- Local products and prepared goods
- Home and practical services
- Simple errands/purchase-on-behalf
- Agriculture and seasonal work
- Transport and delivery
- Emergency/on-demand
- Rental/assets
- Recurring/caregiving/open-ended
- High-risk or specially regulated work

A category family does not imply that every individual category is enabled. The pilot matrix and activation record control availability.

### 9.1 Safety classes

| Safety class | Examples | Minimum treatment |
|---|---|---|
| S0 — Low physical exposure | Digital delivery, ordinary creative/admin work | Identity, scope, evidence, privacy, dispute path |
| S1 — Routine public interaction | Pickup, appointment, ordinary local service | Public/safe meeting guidance, contact privacy, report/block |
| S2 — Home/material/skill exposure | Repair, cleaning, practical work | Scope, skill/evidence, no-entry defaults where appropriate, incident escalation |
| S3 — Elevated vulnerability or risk | Minors, caregiving, emergency, regulated/physical risk | Separate legal/safeguarding decision; not pilot by default |
| S4 — Prohibited/unapproved | Controlled goods, unsafe/illegal activity | Excluded |

## 10. Evidence/proof taxonomy

Evidence supports a claim; it does not automatically establish truth.

### 10.1 Evidence types

- Identity evidence
- Consent evidence
- Listing/terms snapshot
- Quote/bid evidence
- Payment declaration
- Payment receipt/reference
- Counterparty acknowledgment
- Trusted provider verification
- Progress evidence
- Completion/sign-off
- Handoff/receipt
- Attendance/no-show
- Delivery/download/access
- Dispute statement
- Administrative decision
- Safety/incident report

### 10.2 Payment-evidence states

External Digital Proof must use distinct states such as:

- `reported`
- `counterparty_confirmed`
- `provider_verified`
- `disputed`
- `rejected`
- `superseded`

`provider_verified` requires a trusted provider adapter/API. A screenshot or reference number alone cannot receive that state.

### 10.3 Evidence handling

Payment screenshots and sensitive evidence require:

- File validation
- Malware scanning
- Redaction/masking guidance
- Least-privilege access
- Access logging
- Retention/deletion policy
- Dispute/legal hold exception
- No exposure through public or authenticated-cache leakage

## 11. Capability-profile examples

These examples are illustrative profiles for the PRD/UX ceremony. They are not schema tables or automatic enablement.

### Profile P-01 — Creative digital service

- Listing: `service_offer`
- Mechanism: Direct Booking or Quote Request
- Work: A1 or A9
- Payment: External Cash or External Digital Proof
- Access: L2/L3; L0/L1 assisted creation conditional
- Safety: S0
- Pilot: PILOT

### Profile P-02 — Appointment service

- Listing: `service_offer`
- Mechanism: Direct Booking
- Work: A3
- Payment: External Cash or External Digital Proof
- Access: L2/L3
- Safety: S1 or category-specific S2
- Pilot: PILOT if availability/no-show/safety contract passes

### Profile P-03 — Local product pickup

- Listing: `product_offer`
- Mechanism: Direct Booking
- Work: A4
- Payment: External Cash or External Digital Proof
- Access: L1/L2/L3
- Safety: S1
- Pilot: PILOT if capacity/handoff evidence passes

### Profile P-04 — Pabili-like purchase request

- Listing: `product_request`
- Mechanism: Quote Request or Agent-Mediated request
- Work: A4 purchase-on-behalf extension
- Payment: External Cash or External Digital Proof for approved obligation
- Access: L0/L1/L2/L3
- Safety: S1/S2 depending on item and handoff
- Pilot: PILOT-CONDITIONAL

### Profile P-05 — Direct Digital sandbox

- Any approved listing/order shape
- Payment: Direct Gateway Digital
- Status: SANDBOX-ONLY
- No live Tagudin money claim
- No Tiwala protection promise

## 12. Invalid combinations for the initial pilot

The following combinations are invalid unless separately activated:

- Any payment lane that claims Serbizyu custody without Tiwala G6 approval
- Offline digital payment, payout, or release
- Agent-mediated action without owner consent and attribution
- Kiosk action that accepts deposits or holds cash
- A5 rental without deposit/custody/reversal design
- A6/A10 recurring work without cycle and cancellation contracts
- A2/A8 dispatch without location/safety/operations controls
- S3/S4 categories without safeguarding/legal approval
- Product listing without capacity/oversell behavior
- Quote/request flow without expiry and acceptance semantics
- Completion without archetype-appropriate evidence
- Review or trust badge without completed-order eligibility
- A screenshot labeled provider-verified without trusted provider evidence

## 13. Taxonomy-to-domain handoff

The next domain/state ceremony must produce:

1. Order and Work Instance relationship
2. Order-formation transitions per mechanism
3. Work transitions per fulfillment shape
4. Payment Obligation relationship and invariants
5. Payment-lane evidence states
6. Consent and Agent authorization transitions
7. Listing lifecycle transitions
8. Completion/sign-off/review-window rules
9. Dispute and administrative hold interactions
10. Events and idempotency boundaries

The taxonomy intentionally does not choose:

- Final database table count
- ORM models
- Migration order
- Queue topology
- Deployment platform
- Provider contract
- Legal classification

Those belong to later ceremonies and must remain downstream of approved product/domain decisions.

## 14. Taxonomy approval gate

Before becoming authoritative, confirm:

- The four listing types
- The separation between mechanism and fulfillment
- The A1/A3/A4/A9 initial shapes
- A7/A8 normalization
- The payment-obligation model
- The four payment lanes and pilot statuses
- L0–L4 access semantics
- Category-family and safety-class behavior
- Evidence states
- Pabili as a generic A4 extension
- Deferred capability activation records
- No deployment decision embedded in taxonomy

After approval, this taxonomy becomes the source for the PRD, UX, domain/state contracts, schema, and architecture.
