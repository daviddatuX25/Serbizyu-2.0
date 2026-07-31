# Serbizyu 2.0 — Rebuilt Product Requirements Document

Status: REBUILT DRAFT — founder review required before becoming authoritative
BMAD phase: Phase 2 — Planning / Product Requirements
Inputs:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/phase-1-handoff-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
- `docs/planning-hardening/03-dual-success-and-go-no-go-scorecards.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`

This document is the rebuilt product contract. The previous PRD remains historical source material until this document is approved and the old file is explicitly marked superseded.

## 1. Product boundary

Serbizyu is a Tagudin-first, community-centered marketplace foundation for local services and goods. It supports Providers/Owners, Buyers/Customers, and approved Agents through clear listing, order, fulfillment, evidence, payment-lane, and support contracts.

The product has three planes:

- **Capstone plane** — coherent software demonstration with sandbox/test data.
- **Tagudin validation plane** — approximately 30 genuine community participants and real initial pilot activity.
- **Startup-foundation plane** — reusable contracts, operations, evidence, and extension points for later growth.

The first pilot is not province-wide scale and does not include production Direct Digital or Tiwala Protected Digital.

## 2. Goals and non-goals

### 2.1 Goals

- Make local services and goods easier to discover and request.
- Preserve low-barrier participation for cash users, small jobs, informal providers, and assisted users.
- Support four canonical listing types.
- Support A1, A3, A4, and A9 work shapes when their complete contracts are ready.
- Separate payment confirmation from work completion.
- Make payment custody and protection promises visible.
- Record evidence, consent, actor attribution, and important corrections.
- Provide a supportable Tagudin validation cohort.
- Create technical/product extension seams without enabling unsupported features.
- Produce trustworthy evidence for capstone evaluation and startup learning.

### 2.2 Non-goals for the initial pilot

- Province-wide or national launch.
- Production Direct Digital.
- Production Tiwala Protected Digital.
- Legal escrow, insurance, or guaranteed recovery claims.
- Agent cash or goods custody.
- Kiosk deposits, cash float, or payout operation.
- Offline digital payment, payout, release, or final authority.
- Unbounded Deal-Chaining.
- Rental deposits and asset-custody operations.
- Recurring/open-ended billing.
- Full transport/dispatch or emergency response.
- High-risk regulated categories without a dedicated gate.
- AI decisions for money, identity, consent, dispute, or publication.
- Immediate platform profitability as a pilot requirement.

## 3. Personas and actors

### P-01 Provider/Owner

A local person, informal worker, small seller, or organization offering a service/product.

Needs:

- Simple listing creation or approved assistance
- Clear scope/price/capacity
- Visibility to relevant Tagudin Buyers
- Evidence and transaction history
- Safe communication
- Control over Agent assistance
- Clear payment-lane meaning

### P-02 Buyer/Customer

A person seeking a local service, product, or purchase-on-behalf request.

Needs:

- Relevant discovery
- Trust and safety signals
- Understandable price/quote/capacity
- Simple request and order flow
- Payment-lane clarity
- Work progress/evidence
- Completion, dispute, and support path

### P-03 Agent

A delegated platform-management or assistance actor.

Needs:

- Explicit permission scope
- Owner consent and notices
- Clear interface for permitted actions
- Attribution and correction behavior
- Revocation and escalation

Boundary: Agent status does not grant money, goods, listing ownership, or custody authority by default.

### P-04 Admin/Operator

A trained support and operations actor.

Needs:

- Search and inspect Orders/Work/Evidence
- Manage holds and disputes
- Correct through auditable events
- Handle failed events
- Support safety incidents
- Reconcile pilot evidence
- Operate backup/recovery procedures

### P-05 Capstone evaluator

A reviewer who needs to see that the system is coherent, usable, traceable, and technically defensible without confusing sandbox behavior with production readiness.

## 4. Pilot cohort and success boundary

The Tagudin validation target is approximately 30 genuine onboarded participants:

- Approximately 10 Providers/Owners
- Approximately 20 Buyers/Customers
- At least 5 participants experiencing assisted or low-literacy-compatible access
- Target of approximately 4 live category families if supply/safety permit
- Target of approximately 30–40 completed genuine Orders

Evidence floor for evaluable validation:

- 20 genuine participants
- 8 Providers/Owners
- 12 Buyers/Customers
- 3 live category families
- 20 completed genuine Orders

Team, seeded, demo, sandbox, and training records do not count as genuine Tagudin validation.

## 5. Definitions

- **Listing** — offer/request record with terms and lifecycle.
- **Order** — agreed commercial/operational container.
- **Payment Obligation** — one amount due for a defined purpose and one payment lane initially.
- **Work Instance** — execution record for the agreed fulfillment shape.
- **Evidence** — record supporting an event or claim.
- **Payment lane** — custody and confirmation semantics.
- **Completion** — Work Instance state reached through authorized fulfillment evidence; never inferred only from payment.
- **Onboarded participant** — genuine person who completed applicable account/consent/access steps and performed an intended marketplace action.
- **Activated Provider** — approved Provider with a live listing and genuine marketplace action.
- **Activated Buyer** — genuine Buyer who creates a request, contacts a Provider, or starts an Order for a real need.
- **Genuine Order** — real community transaction, not seed/demo/training/sandbox activity.

## 6. Capability status and requirement planes

Every requirement uses one status:

- `CAPSTONE` — required for coherent demonstration.
- `PILOT` — initial Tagudin commitment.
- `PILOT-CONDITIONAL` — requires activation gate.
- `SANDBOX-ONLY` — simulated/provider-sandbox only.
- `FOUNDATION` — extension seam or operational contract.
- `DEFERRED` — not initial delivery.
- `EXCLUDED` — not supported without a new decision.

Every requirement must also identify its plane:

- `C` — capstone
- `T` — Tagudin validation
- `S` — startup foundation
- `F` — future expansion

## 7. Functional requirements

### 7.1 Identity, access, and assisted participation

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-001 | The system shall support account identity and least-privilege access for Buyer, Provider/Owner, Agent, and Admin capabilities. | PILOT / C,T,S |
| PRD-002 | The system shall provide a government-ID verification path with consent, least-privilege access, manual-review fallback, retention/deletion rules, and legal/privacy gate before live sensitive collection. | PILOT-CONDITIONAL / C,T,S |
| PRD-003 | The system shall separate verified identity evidence from public trust badges and shall not imply stronger verification than was performed. | PILOT / C,T,S |
| PRD-004 | The system shall support Agent delegation with scope, owner consent, actor attribution, notices, revocation, and audit history. | PILOT / C,T,S |
| PRD-005 | The system shall prevent Agent assistance from silently changing ownership, payer, recipient, cash custodian, goods custodian, or final authority. | PILOT / C,T,S |
| PRD-006 | The system shall support L0 feature-phone owner notices/critical confirmations through an approved assisted process. | PILOT-CONDITIONAL / C,T,S |
| PRD-007 | The system shall support L1 assisted access only when the kiosk/access operating model, training, attribution, and safety controls are approved. | PILOT-CONDITIONAL / C,T,S |
| PRD-008 | The system shall support low-data L2 behavior with safe retry and draft handling; stale offline data shall not authorize irreversible actions. | PILOT-CONDITIONAL / C,T,S |
| PRD-009 | The system shall provide L3 online journeys and L4 audited Admin operations. | PILOT / C,T,S |

### 7.2 Listing and discovery

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-010 | The system shall support Service Listing, Product Listing, Service Request, and Product Request as the four canonical listing types. | CAPSTONE / C,S |
| PRD-011 | A listing shall include type, owner, category family, scope, terms, price/quote/budget semantics, capacity/availability, area, safety/data class, evidence requirements, and lifecycle. | PILOT / C,T,S |
| PRD-012 | Listing lifecycle shall distinguish draft, review, active, paused, unavailable, expired, archived, and rejected states as applicable. | PILOT / C,T,S |
| PRD-013 | Discovery shall be Tagudin-scoped for the initial validation plane and shall avoid displaying stale or unavailable capacity as active supply. | PILOT / T |
| PRD-014 | Product listings shall not be active pilot capability without capacity/stock/oversell behavior and pickup/handoff semantics. | PILOT / C,T |
| PRD-015 | Category families shall carry supported shapes, safety class, data class, identity requirement, evidence requirement, and pilot/future status. | PILOT / C,T,S |
| PRD-016 | The system shall not publish unsupported categories merely because they exist in a historical catalog. | PILOT / C,T,S |

### 7.3 Transaction formation

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-017 | The system shall support Direct Booking for approved listing/capability profiles. | PILOT / C,T |
| PRD-018 | The system shall support Quote Request as a separate conditional mechanism with expiry, scope, amount, validity, acceptance, decline, and snapshot behavior. | PILOT-CONDITIONAL / C,S |
| PRD-019 | The system shall support Reverse Bidding only after response eligibility, anti-spam, expiry, selection, and liquidity gates pass. | PILOT-CONDITIONAL / C,S |
| PRD-020 | Quick Deal shall be treated as order formation, not fulfillment, with explicit terms, counterparty confirmation, expiry, retry, and safety behavior. | PILOT-CONDITIONAL / C,S |
| PRD-021 | Air-gapped/offline Quick Deal shall not authorize digital payment, payout, release, final inventory, or irreversible consent. | DEFERRED / C,S |
| PRD-022 | Deal-Chaining shall remain deferred until parent/child responsibility, financial, dispute, and cancellation contracts exist. | DEFERRED / S,F |
| PRD-023 | An Agent-created or Agent-assisted transaction shall retain the affected Owner/Buyer and acting Agent as separate actors. | PILOT / C,T,S |

### 7.4 Work/fulfillment

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-024 | The system shall maintain a Work Instance separate from Order and Payment Obligation. | PILOT / C,T,S |
| PRD-025 | A1 Linear Project shall support scope, steps, evidence, revisions, completion proposal, sign-off/review, and dispute behavior. | PILOT / C,T |
| PRD-026 | A3 Appointment shall support availability, reservation conflict control, confirmation, reschedule/cancel, attendance/no-show, safety, and completion. | PILOT / C,T |
| PRD-027 | A4 Handoff shall support preparation, capacity/stock or sourcing, pickup/handoff, receipt/acceptance, mismatch, and dispute evidence. | PILOT / C,T |
| PRD-028 | A4 purchase-on-behalf extension shall support requested item, estimate/budget, approval, actual cost, variance, receipt, service fee if applicable, and handoff. | PILOT-CONDITIONAL / C,T,S |
| PRD-029 | A9 Digital Delivery shall support artifact scope, secure delivery, access, acceptance/revision, version, retention, and dispute evidence. | PILOT / C,T |
| PRD-030 | A2, A5, A6, A8, and A10 shall remain deferred until their activation records pass. | DEFERRED / S,F |
| PRD-031 | The system shall never mark Work complete solely because a Payment Obligation is confirmed. | PILOT / C,T,S |

### 7.5 Payment and trust lanes

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-032 | Each Payment Obligation shall have purpose, amount, due condition, payment lane, terms/policy snapshot, actor responsibility, evidence state, and correction behavior. | PILOT / C,T,S |
| PRD-033 | External Cash shall record buyer-paid/provider-received declarations, mutual acknowledgment, mismatch/dispute states, and no Serbizyu cash custody. | PILOT / C,T,S |
| PRD-034 | External Cash shall use 0% platform commission during capstone and initial Tagudin pilot and shall create no cash commission receivable. | PILOT / C,T,S |
| PRD-035 | External Digital Proof shall distinguish reported, counterparty-confirmed, provider-verified, disputed, rejected, and superseded evidence. | PILOT / C,T,S |
| PRD-036 | A screenshot/reference shall not be labeled provider-verified without a trusted provider adapter/API. | PILOT / C,T,S |
| PRD-037 | Payment evidence files shall support validation, malware scanning, masking/redaction guidance, access logging, retention/deletion, and dispute/legal hold. | PILOT / C,T,S |
| PRD-038 | Direct Digital shall be demonstrated only in sandbox unless provider, legal, financial, refund, security, reconciliation, and operations gates pass. | SANDBOX-ONLY / C,S |
| PRD-039 | Tiwala Protected Digital shall be demonstrated only in sandbox unless provider, legal, financial, refund, security, reconciliation, and operations gates pass. | SANDBOX-ONLY / C,S |
| PRD-040 | Tiwala release shall require authorized completion, sign-off/review-window eligibility, no active dispute, no fraud/admin/legal hold, reconciled amount, idempotency, and concurrency safety. | SANDBOX-ONLY / C,S |
| PRD-041 | No release clock shall begin at Order creation. | SANDBOX-ONLY / C,S |
| PRD-042 | The UI shall show actual peso cost and protection/custody meaning for connected-payment simulations; small jobs remain valid. | CAPSTONE / C,T,S |
| PRD-043 | Payment-lane changes after evidence exists shall use correction, cancellation, supersession, or refund events rather than overwriting history. | PILOT / C,T,S |

### 7.6 Communication, evidence, trust, and support

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-044 | The system shall notify affected actors when listing, Order, Work, evidence, consent, dispute, hold, or payment-lane state changes. | PILOT / C,T,S |
| PRD-045 | The system shall provide traceable Buyer/Provider/Agent/Admin messaging or support routing for committed journeys. | PILOT / C,T,S |
| PRD-046 | Each committed Work shape shall define required completion/handoff/attendance/delivery evidence. | PILOT / C,T,S |
| PRD-047 | Reviews shall be eligible only after a supported completed interaction and shall not imply unperformed verification. | PILOT / C,T,S |
| PRD-048 | Dispute intake shall preserve evidence, identify affected obligations, support holds/restrictions, and record an administrative resolution. | PILOT / C,T,S |
| PRD-049 | External Cash disputes shall not promise automatic refunds or cash recovery by Serbizyu. | PILOT / C,T,S |
| PRD-050 | The system shall support block/report and category-sensitive safety escalation. | PILOT / C,T,S |
| PRD-051 | Meeting guidance shall prefer public/safer settings and avoid default home-entry requirements where applicable. | PILOT / C,T,S |

### 7.7 Operations and measurement

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-052 | Admin shall inspect Orders, Work Instances, Payment Obligations, evidence, consent, disputes, holds, and correction history. | PILOT / C,T,S |
| PRD-053 | High-risk actions shall be attributable, permission-checked, logged, and recoverable through a defined procedure. | PILOT / C,T,S |
| PRD-054 | The system shall provide a failed-event/retry path for notifications, evidence processing, provider events, and other critical asynchronous work. | PILOT / C,T,S |
| PRD-055 | Operations shall support holds/disablement for fraud, safety, legal, dispute, and provider incidents. | PILOT / C,T,S |
| PRD-056 | The system shall record cohort/evidence class so demo, team, sandbox, training, and genuine Tagudin activity cannot be confused. | PILOT / C,T,S |
| PRD-057 | The system shall measure activation, response/liquidity, completion, repeat, retention, disputes, incidents, support burden, evidence confirmation, and operating cost. | PILOT / C,T,S |
| PRD-058 | Backup/restore and incident-recovery procedures shall be testable before pilot launch. | PILOT / C,T,S |
| PRD-059 | The pilot shall not report revenue from External Cash transactions that Serbizyu did not collect. | PILOT / C,T,S |

## 8. Business rules

### BR-001 — Order/work separation

Order agreement, Payment Obligation confirmation, Work progress, Work completion, Buyer sign-off, review-window expiry, dispute, and release are separate concepts.

### BR-002 — Completion authority

Completion requires authorized Work evidence appropriate to the Work shape. Payment confirmation cannot substitute for completion.

### BR-003 — Release safety

Any protected release must require completion eligibility, sign-off/review eligibility, no active dispute, no hold, reconciliation, idempotency, and concurrency-safe transition.

### BR-004 — Historical integrity

Confirmed amounts, fees, terms, lane, policy version, and actor attribution are snapshotted. Corrections create new events/records.

### BR-005 — One lane per obligation

Mixed tender within one Payment Obligation is excluded initially. A later obligation or explicit replacement is required for a different lane.

### BR-006 — Cash boundary

Serbizyu does not hold cash, create a cash commission receivable, promise automatic cash refunds, or make Agents/Kiosks cash custodians by default.

### BR-007 — Evidence boundary

User-submitted evidence supports a claim but does not automatically prove it. Provider verification requires a trusted provider signal.

### BR-008 — Assisted-action boundary

Agent actions require permission and attribution. Owner consent is required for the defined scope; sensitive or irreversible actions require the stronger confirmation specified by UX/domain contracts.

### BR-009 — Low-barrier rule

Small practical jobs remain valid. Fixed gateway cost may be displayed as a warning or lead to an available lane recommendation, not a hidden universal minimum.

### BR-010 — Geography

Initial genuine validation is Tagudin-only. Candon and other locations may appear only as historical/research context unless a new geography gate is approved.

## 9. UX and accessibility requirements

- UX must use plain language and one clear primary action where practical.
- Icons supplement words.
- Payment lane, fee, custody, and protection meaning must be visible before confirmation.
- External Digital Proof must display that Serbizyu did not control the external funds.
- Agent screens must show “acting for” identity and permission scope.
- Low-data and assisted flows must define retry, fallback, and confirmation behavior.
- Safety guidance must be category-sensitive.
- Forms must identify required versus optional information.
- Evidence uploads must explain redaction and unrelated-data risks.
- Status displays must distinguish payment, fulfillment, dispute, and support states.
- Error messages must explain the next safe action.

## 10. Measurement requirements

The product shall report separately:

- Capstone/test activity
- Sandbox/provider-test activity
- Training/team activity
- Genuine Tagudin activity

Tagudin metrics shall include:

- Approximately 30 participant target
- Evidence-floor counts
- Provider activation
- Buyer activation
- Category-family coverage
- Response within 24 hours
- Completed Orders
- Completion rate
- Repeat Buyers
- Retained Providers
- Payment evidence acknowledgment
- Dispute and incident rate
- Support minutes/cost estimate
- Recruitment effort
- Operating cost
- Future payment-fee comprehension

## 11. Traceability requirements

Every PRD requirement must be mapped to:

- Product Vision section
- Taxonomy/capability profile
- UX journey or component
- Domain/state contract
- Owning epic/story
- Acceptance test intent
- Evidence class
- Status and plane

The PRD is not implementation-ready until no committed requirement has an unmapped UX, domain, story, or acceptance-test target.

## 12. Deferred/foundation policy

A deferred capability may appear in future architecture only as an explicit extension point or activation record. It must not silently add pilot promises, state transitions, payment behavior, or operational duties.

The following remain deferred or separately gated:

- Production Direct Digital
- Production Tiwala Protected Digital
- Offline payment/release
- Deal-Chaining
- Rental
- Recurring/open-ended work
- Dispatch/transport/emergency
- Kiosk cash operations
- Agent custody
- High-risk regulated categories
- Province-wide expansion
- Broad channel distribution without operations ownership

## 13. PRD acceptance gate

The rebuilt PRD is ready for UX reconstruction only when:

- All requirements use unique IDs.
- Product Vision and Taxonomy terms are used consistently.
- Pilot/capstone/foundation/future statuses are visible.
- Payment lanes and Payment Obligations are explicit.
- Order, Work, payment, dispute, and consent boundaries are explicit.
- Safety/privacy/low-literacy requirements are included.
- Tagudin cohort and evidence classification are included.
- Old revenue, escrow, geography, category, and deployment assumptions are absent.
- Every committed journey has a UX traceability target.
- Conditional and sandbox features have activation gates.
- The founder approves the product contract.

Next artifact: rebuilt UX specification and traceability matrix.
