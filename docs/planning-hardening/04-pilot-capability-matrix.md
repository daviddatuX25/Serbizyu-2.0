# Serbizyu 2.0 — Pilot Capability Matrix

Status: DRAFT — founder review required before this becomes authoritative
Authority: follows the recovery charter, contradiction register, payment/trust-lane policy, and success scorecards
Purpose: classify the product combinations that may be demonstrated, piloted, conditionally enabled, or deferred before rebuilding the BMAD Product Vision, Taxonomy, PRD, UX, and technical contracts
Geography: initial real-user validation is Tagudin, Ilocos Sur; future expansion is not prohibited by this matrix

## 1. Scope thesis

Serbizyu is designed as a broad provincial services-and-goods commerce foundation. The initial Tagudin pilot is a validation cohort, not a permanent product ceiling and not a reason to remove safe, simple work from the future model.

The pilot must still be coherent. A capability is not pilot-ready merely because it can be represented by a table or displayed in a mockup. It must have:

- A complete user contract
- A defined listing, transaction, and fulfillment shape
- A payment/trust lane with matching custody promises
- Safety and consent rules
- Evidence and dispute behavior
- A named operational owner
- A supportable implementation slice
- A measurable success signal
- A rollback or disablement path

This matrix separates product breadth from first-release commitment without allowing “build if capable” to silently expand scope.

## 2. Status vocabulary

| Status | Meaning | Product/architecture consequence |
|---|---|---|
| **CAPSTONE** | Demonstrated with test, seeded, simulated, or sandbox data | Must be coherent and honest, but does not count as market validation or live-money readiness |
| **PILOT** | Allowed for genuine Tagudin validation after G3 launch prerequisites pass | Must have complete UX, operations, safety, evidence, and pilot instrumentation |
| **PILOT-CONDITIONAL** | Eligible for Tagudin only after a named activation gate passes | Build the seam and gate; do not silently enable it |
| **SANDBOX-ONLY** | May be demonstrated with simulated/provider-sandbox behavior | No genuine production money or unsupported guarantee |
| **FOUNDATION** | Contract/headroom may be designed for future expansion but not exposed as a pilot promise | Avoid premature general implementation |
| **DEFERRED** | Not in the initial capstone/pilot delivery slice | Preserve as a future hypothesis and extension point |
| **EXCLUDED** | Not supported in the current product boundary | Requires a new founder decision and safety/legal review |

A capability may have more than one status by plane. For example, Direct Digital is `CAPSTONE + SANDBOX-ONLY + FOUNDATION`, but not initial-pilot production capability.

## 3. Capability dimensions

Every approved pilot combination must be represented as:

`Listing Type × Transaction Mechanism × Fulfillment Archetype × Payment Lane × Access Tier × Safety/Data Class`

These are separate dimensions:

- **Listing Type** — what is offered or requested
- **Transaction Mechanism** — how an order is formed
- **Fulfillment Archetype** — how the work or product is executed
- **Payment Lane** — how money/evidence moves and what Serbizyu promises
- **Access Tier** — how the user interacts with the platform
- **Safety/Data Class** — controls required for the category and evidence involved

Category is a discovery/classification dimension. It must not create a new state machine for every industry.

## 4. Listing-type matrix

| Listing type | Capstone | Initial Tagudin pilot | Required condition | Future direction |
|---|---|---|---|---|
| Service Listing | CAPSTONE | PILOT | Must map to A1, A3, or A9 initially; price/quote, availability, service area, safety, evidence, and completion contract present | Expand to A2/A6/A8/A10 through activation gates |
| Product Listing | CAPSTONE | PILOT | Must map to A4 initially; stock/slot/capacity, preparation, pickup/handoff, pricing, and oversell controls present | Add rental, recurring, delivery, and other product shapes through gates |
| Service Request | CAPSTONE | PILOT-CONDITIONAL | Request creation, qualified response/quote, acceptance, expiry, and generated order must be implemented; no unsupported “request queue” promise | Reverse bidding and richer quote discovery |
| Product Request | CAPSTONE | PILOT-CONDITIONAL | Requested item, budget, location, availability, provider response, approval, and handoff evidence must be implemented | Pabili and broader product sourcing without bespoke core model |
| Digital Service Listing | CAPSTONE | PILOT | Not a fifth listing type; uses Service Listing + A9 | Expand delivery formats and revision policies |
| Digital Product Listing | CAPSTONE | PILOT | Not a fifth listing type; uses Product Listing + A9 | Expand catalog/license/download models after rights and storage controls |

Pilot-conditional requests do not become live merely because the underlying database can store them. They require liquidity instrumentation and an operating response plan.

## 5. Transaction-mechanism matrix

| Mechanism | Capstone | Initial Tagudin pilot | Activation gate / boundary |
|---|---|---|---|
| Direct Booking | CAPSTONE | PILOT | Complete browse → select → obligation → work → evidence → completion flow |
| Agent-Mediated | CAPSTONE | PILOT | Owner consent, configurable permissions, actor attribution, owner notices, revocation, and no implied custody |
| Reverse Bidding | CAPSTONE | PILOT-CONDITIONAL | Qualified provider response, expiry, response SLA, anti-spam, quote acceptance, and enough supply in the selected family |
| Quote Request | CAPSTONE | PILOT-CONDITIONAL | Must reuse the request/quote contract; hidden-price listings cannot bypass a defined quote state |
| Quick Deal — connected | CAPSTONE | PILOT-CONDITIONAL | Online-only pilot version first; clear counter-offer, dual confirmation, safety, and payment-lane behavior |
| Quick Deal — air-gapped/offline | CAPSTONE prototype only | DEFERRED | Requires threat model, device tests, conflict/replay protection, sync contract, and a safe fallback; no money authorization offline |
| Deal-Chaining | CAPSTONE scenario | DEFERRED | Requires parent/child financial obligations, responsibility boundaries, cancellation, subcontractor evidence, and operations support |
| Offline Sync | CAPSTONE prototype | FOUNDATION/DEFERRED | Browse and draft-only behaviors may be explored; cloud remains authority and no digital payment/release is authorized offline |
| Agent-created listing | CAPSTONE | PILOT | Treated as Agent-Mediated origin, not a separate listing type; owner approval and attribution required |

### 5.1 Mechanism rules

- A mechanism creates or modifies an Order; it does not replace the Work Instance.
- A Quick Deal is an initiation mechanism, not a universal fulfillment archetype.
- A Quote Request is a non-competitive request-to-quote path, not a separate listing primitive.
- Deal-Chaining is a coordination container that creates child obligations/orders; it is not part of the initial pilot.
- Offline drafts may be queued, but server authority decides final order, payment, inventory, consent, and release state.

## 6. Fulfillment-archetype matrix

| Shape | Capstone | Initial Tagudin pilot | Pilot contract | Expansion gate |
|---|---|---|---|---|
| A1 Linear Project | CAPSTONE | PILOT | Steps, evidence, sign-off, revisions, completion, cancellation | Additional milestone/payment complexity |
| A3 Appointment | CAPSTONE | PILOT | Availability, reservation conflict control, attendance/no-show, safety, completion | More calendars, recurring schedules, regulated categories |
| A4 Handoff | CAPSTONE | PILOT | Stock/capacity, preparation, pickup/receipt, mismatch/dispute, completion | Delivery/courier, perishable/high-risk goods |
| A9 Digital Delivery | CAPSTONE | PILOT | Secure artifact storage/access, delivery, acceptance, revision, retention | Larger media, licensing, external connectors |
| A2 Instant Dispatch | CAPSTONE scenario | DEFERRED | GPS/location, pickup/dropoff, timeout, safety, fare/variance | Device/location testing, transport/legal review |
| A5 Rental/Asset Return | CAPSTONE scenario | DEFERRED | Two custody transfers, condition evidence, deposit, damage/late rules | Custody and deposit operations |
| A6 Recurring/Subscription | CAPSTONE scenario | DEFERRED | Child cycles, schedule, skip/pause, per-cycle obligation | Scheduler, recurring support, cancellation model |
| A7 Quoted/Negotiated | CAPSTONE as contract-formation flow | PILOT-CONDITIONAL | Must resolve into A1/A3/A4/A9 Work Instance; it is not a standalone execution state machine | Richer bid/quote and pricing rules |
| A8 Emergency/On-Demand | CAPSTONE scenario | DEFERRED | Dispatch/escalation orchestration, safety, response time, availability | Operations and safety coverage |
| A10 Long-Running/Open-Ended | CAPSTONE scenario | DEFERRED | Sessions, periodic obligation, winding down, records | Recurring billing and service logs |

### 6.1 Taxonomy correction required before Phase 1 lock

The existing taxonomy calls all ten items fulfillment archetypes, but A7 and A8 behave partly as transaction/dispatch orchestration:

- **A7 Quoted/Negotiated** forms scope and price, then resolves into a fulfillment shape.
- **A8 Emergency/On-Demand** coordinates rapid acceptance and may resolve into dispatch, handoff, or project work.

The rebuilt taxonomy must preserve the useful names while separating:

1. Work/fulfillment shapes
2. Order-formation mechanisms
3. Dispatch/escalation policies
4. Payment/release policies

No schema or state-machine implementation should freeze the old classification without this correction.

## 7. Payment-lane matrix

| Payment lane | Capstone | Initial Tagudin pilot | Custody/promise | Required evidence |
|---|---|---|---|---|
| External Cash | CAPSTONE | PILOT | Direct party payment; Serbizyu does not hold or insure cash; 0% platform commission | Separate paid/received attestations, acknowledgment, mismatch/dispute state |
| External Digital Proof | CAPSTONE | PILOT | External provider payment; Serbizyu records evidence but did not control money; 0% platform commission | Provider/reference, evidence status, counterparty confirmation, privacy controls |
| Direct Digital | SANDBOX-ONLY | SANDBOX-ONLY | Connected gateway settlement without Tiwala completion hold | Authenticated/idempotent provider event, amount reconciliation, refund/payout status |
| Tiwala Protected Digital | SANDBOX-ONLY | SANDBOX-ONLY | Approved delayed-payout/custody structure; completion-based release and dispute holds | Hold, sign-off, release guard, refund/reversal, reconciliation, legal/provider gate |

### 7.1 Payment rules for the matrix

- Small jobs, including ₱50–₱100 work, remain valid product scope.
- Payment-lane availability may be restricted by provider, legal, operational, fraud, or bounded-subsidy rules; it is not a permanent product minimum.
- Direct Digital and Tiwala must not be represented as live-money pilot capabilities until G6 passes.
- No External Cash or External Digital Proof platform commission receivable is created during the initial pilot.
- One payment obligation uses one lane; later milestones may use another only through explicit state/events.
- Payment confirmation and work completion remain separate.

## 8. Access-tier matrix

| Access tier | Capstone | Initial Tagudin pilot | Supported capability | Hard boundary |
|---|---|---|---|---|
| L0 Feature-phone owner | CAPSTONE | PILOT | SMS notices, owner consent, critical approval/revocation, status summaries through Agent support | No visual-only requirement; no payout/cash custody authority through SMS |
| L1 Assisted kiosk/access point | CAPSTONE | PILOT-CONDITIONAL | Browse, assisted navigation, consent capture, receipt/help routing | No cash deposits, float, custody, or untraceable operator actions |
| L2 Low-data/intermittent smartphone | CAPSTONE | PILOT-CONDITIONAL | Cached discovery, low-bandwidth forms, safe retry, draft/request preparation | No offline digital payment, release, final inventory authority, or unsafe stale action |
| L3 Online smartphone/PWA | CAPSTONE | PILOT | Full committed listing, order, work, evidence, payment-lane, messaging, and review flows | Requires online server authority for final money/state actions |
| L4 Admin/operator | CAPSTONE | PILOT | Support, evidence, dispute, hold, reconciliation, safety, analytics, and audit operations | No unlogged direct database edits; high-risk actions require authorization |

L0/L1/L2 are not merely accessibility decorations. Each enabled tier must have a safe contract and a measured user journey.

## 9. Category-family matrix

The pilot uses category families to preserve breadth without pretending every individual category has equal readiness.

| Category family | Candidate examples | Initial shape | Status | Conditions |
|---|---|---|---|---|
| Digital, creative, academic, and administrative | Design, writing, layout, research, tutoring support | A1/A9 | PILOT | Secure delivery, rights/consent, revision, acceptance |
| Appointments and personal services | Tutoring, salon, barber, appointment-based services | A3 | PILOT | Calendar, no-show, public/safe meeting, category-specific safety |
| Local products and prepared goods | Food, crafts, household goods, small local products | A4 | PILOT | Stock/capacity, pickup/handoff, perishable/food safety rules |
| Home and practical services | Cleaning, repair, painting, tailoring, simple skilled work | A1/A3 | PILOT-CONDITIONAL | Safety, scope, provider verification, material/labor clarity |
| Simple errands and purchase-on-behalf | Pabili-like requests, fetching, small purchases | A4 extension | PILOT-CONDITIONAL | Item list, estimate, approval, actual cost, receipt, variance, handoff, safety |
| Agriculture and seasonal work | Farm labor, rice-related work, seasonal assistance | A1/A3 | PILOT-CONDITIONAL | Safety, scope, location, schedule, worker/provider protections |
| Transport and same-day delivery | Tricycle, porter, water/ice/LPG delivery | A2/A4 | DEFERRED | Dispatch/location, transport/legal, safety, fare/variance contract |
| Emergency/on-demand repair | Urgent plumbing, electrical, locksmith, towing | A8/A2 | DEFERRED | Availability, escalation, safety, response SLA, liability review |
| Rental and asset use | Equipment, tables/chairs, gowns, vehicles | A5 | DEFERRED | Deposit/condition/custody/damage/reversal contract |
| Recurring/caregiving/open-ended | Cleaning cycles, bookkeeping, caregiving, farm care | A6/A10 | DEFERRED | Recurring obligations, schedule, support, termination, records |
| High-risk or specially regulated work | Medical treatment, legal representation, controlled goods, unsafe work, minors without safeguards | Varies | EXCLUDED/REQUIRES NEW GATE | Legal, safeguarding, license, insurance, and category-specific decision |

### 9.1 Category rules

- The matrix does not permanently delete categories from the future taxonomy.
- A category enters the pilot only when it maps to a supported shape and passes its safety/data conditions.
- Professional-license flags may be informational only where legally appropriate; they must not imply endorsement or license verification when not actually performed.
- Sensitive categories require stronger identity, safety, consent, and incident controls.
- “Pabili” remains a validation example for the generic request/handoff model, not a bespoke core product type.

## 10. Cross-cutting capabilities required for PILOT status

The following are not optional decorations. Every PILOT combination depends on them:

| Capability | Minimum pilot contract |
|---|---|
| Identity and access | Phone/account identity, government-ID verification path with privacy controls, least privilege, manual review fallback |
| Agent consent | Owner grant, configurable permissions, notices, revocation, actor attribution, OTP/phishing safeguards |
| Listing lifecycle | Draft, approval, active, unavailable/paused, archived; price/terms/capacity snapshot |
| Discovery | Tagudin scope, category/search, availability/capacity, safe location presentation, no stale promise |
| Order/work separation | Independent order/payment and work states with explicit events and guards |
| Payment evidence | Cash and External Digital Proof states, disclaimers, mismatches, disputes, immutable corrections |
| Fulfillment evidence | Archetype-specific proof, completion/sign-off, acceptance, handoff/attendance/artifact evidence |
| Notifications | User-facing status changes, consent notices, evidence requests, dispute/hold messages, delivery fallback |
| Messaging/support | Traceable buyer/provider/agent/admin communication and escalation |
| Disputes | Intake, evidence, hold/restriction behavior, resolution record, external-handoff boundary |
| Safety | Category-sensitive meeting/no-entry guidance, report/block, incident escalation, emergency boundary |
| Reviews/trust | Completed-transaction eligibility, cautious new-provider status, no fabricated verified review |
| Operations | Admin inspection, failed-event recovery, holds/kill switch, audit logs, backup/restore, support ownership |
| Measurement | Activation, liquidity, completion, repeat, disputes, support burden, evidence status, cohort classification |

## 11. Capstone versus pilot versus foundation

| Capability | Capstone demonstration | Initial pilot | Startup foundation |
|---|---|---|---|
| Four listing types | Demonstrate | Service/Product committed; Requests conditional | General listing contract and extension points |
| Four launch work presets | Demonstrate all A1/A3/A4/A9 | Enable only after each preset passes its complete contract | Additional archetype adapter boundaries |
| Agent network | Demonstrate owner consent and scoped action | Use for real assisted onboarding after training/safety gate | Configurable delegation, revocation, attribution |
| L0–L4 access | Demonstrate selected paths and safe degradation | Enable only the tiers with tested support capacity | Channel adapters and accessibility baseline |
| Cash and External Digital Proof | Demonstrate and pilot | Primary initial lanes | Evidence/reconciliation foundation |
| Direct Digital/Tiwala | Sandbox demonstration | Not live-money enabled | Provider adapters, money events, legal/operations gates |
| Serbi AI | Demonstrate draft-only assistance if implemented safely | Optional support, never required for core completion | Adapter/guardrail seam; no finance/dispute authority |
| Channel distribution | Demonstrate only if non-blocking | Foundation or conditional; no promise of broad channel liquidity | Consent, adapter, publishing, inbound routing architecture |
| Kiosk | Demonstrate assisted access | Conditional; no cash custody | Access-point operating model |
| Quick Deal | Demonstrate online/safe contract | Conditional online version | Offline protocol only after spike and threat model |
| Deal-Chaining | Demonstrate concept only | Deferred | Parent/child order and financial model |

## 12. Activation-gate template for deferred capabilities

A deferred capability may enter a later pilot or expansion only with a written activation record containing:

1. Capability and affected category family
2. User problem and evidence that it matters
3. Listing/mechanism/archetype mapping
4. Payment/trust lane
5. State transitions and invariants
6. Safety/privacy/legal review
7. Required UX and assisted-channel behavior
8. Operations owner and support procedure
9. Data/schema/adapter impact
10. Test evidence and representative-device testing where applicable
11. Success metric and minimum evidence
12. Rollback/disablement plan
13. Founder approval and superseded artifacts

“Build if capable” is replaced by this activation record.

## 13. Explicit exclusions from the initial pilot

The following remain outside initial real-user Tagudin pilot scope unless separately activated:

- Production Direct Digital
- Production Tiwala
- Offline digital payment or release
- Unbounded Deal-Chaining
- Rental deposits and asset-custody operations
- Full emergency dispatch
- Transport/location-critical dispatch
- Recurring/open-ended billing
- Kiosk cash deposits or float
- Agent cash/goods custody
- Unreviewed biometric/AI identity decisions
- High-risk regulated categories without their gate
- Province-wide geographic expansion
- Broad channel-distribution promises without operating ownership

These exclusions preserve the startup option; they do not reject the future vision.

## 14. Required propagation into BMAD artifacts

After founder approval, the following artifacts must be rebuilt from this matrix:

| BMAD artifact | Required propagation |
|---|---|
| Product Vision/PRFAQ | Preserve Bayanihan Street vision; remove unsupported launch promises; distinguish Tagudin validation from future expansion |
| Listing taxonomy | Separate listing types, mechanisms, fulfillment shapes, dispatch policies, access tiers, and category families |
| Phase 1 handoff | Record matrix status, research dependencies, and missing ceremony outputs |
| PRD | Convert every matrix row into committed, conditional, deferred, foundation, or excluded requirements |
| UX specification | Build only pilot journeys plus clearly labeled conditional/sandbox paths |
| Domain/state contracts | Define order/work/payment/dispute/consent/payout states for PILOT combinations |
| Schema/ERD | Model shared contracts and extension points without creating tables for unapproved future features |
| ADRs | Explain irreversible choices, lane boundaries, offline limitations, privacy, and expansion seams |
| Architecture/operations | Design runtime, workers, scheduler, storage, monitoring, backup, support, and deployment for the actual pilot—not deployment dreams |
| Epics/stories | Rebuild thin vertical slices from the matrix; every story gets acceptance and evidence class |
| Readiness report | Verify the matrix is implemented, tested, operationally owned, and traceable |

## 15. Matrix approval questions

Founder approval should confirm:

1. Is approximately 30 genuine onboarded participants the correct initial Tagudin target?
2. Is the approximate 10 Provider/Owner and 20 Buyer/Customer composition reasonable?
3. Should Service/Product Requests remain pilot-conditional until liquidity mechanics are proven?
4. Are A1, A3, A4, and A9 the correct first work shapes?
5. Should simple purchase-on-behalf errands enter the pilot only after the A4 extension contract is complete?
6. Are External Cash and External Digital Proof the only initial real-user payment lanes?
7. Which access tiers can the team safely operate during the first cohort?
8. Are the category-family conditions and exclusions acceptable?
9. Is the future-expansion posture broad enough without creating pilot promises we cannot support?

Until this matrix is approved, no old PRD launch-scope statement should be treated as authoritative.
