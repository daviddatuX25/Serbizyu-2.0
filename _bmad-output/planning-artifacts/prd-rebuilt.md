# Serbizyu 2.0 — Rebuilt Product Requirements Document

Status: CANONICAL PLANNING AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; Request/Tender and pre-messaging foundation reconciled 2026-09-25; implementation/live-money gates remain separate
BMAD phase: Phase 2 — Planning / Product Requirements
Inputs:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/phase-1-handoff-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
- `docs/planning-hardening/03-dual-success-and-go-no-go-scorecards.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`
- `docs/planning-hardening/21-public-bidding-and-tender-lifecycle.md`
- `_bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/ARCHITECTURE-SPINE.md`

This document is the canonical product contract. The previous PRD is historical source material. PRD-060–076 carry the accepted initiative extension; PRD-077–084 carry the reconciled Request/Tender, Browse, cache, and builder foundation.

## 1. Product boundary

Serbizyu is a Tagudin-first, community-centered marketplace foundation for local services and goods. It supports Providers/Owners, Buyers/Customers, and approved Agents through clear listing, order, fulfillment, evidence, payment-lane, and support contracts.

The product has three planes:

- **Capstone plane** — coherent software demonstration with sandbox/test data.
- **Tagudin validation plane** — approximately 30 genuine community participants and real initial pilot activity.
- **Startup-foundation plane** — reusable contracts, operations, evidence, and extension points for later growth.

The first pilot is not province-wide scale and does not include production Direct Digital or Tiwala Protected Digital. The current implementation wave closes the foundation through governed Listings, Request/Tender bidding, atomic Order formation, Work and Deal-Chain catalogs, and their builder interfaces; Messaging follows as the next bounded capability.

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

- **Listing** — a provider-owned service or product offer with terms, availability, and lifecycle.
- **Request** — a buyer/citizen-owned need for a service or product; it remains a distinct aggregate even when shown beside Listings in Browse.
- **Tender** — a Request using reverse-bidding formation in Open, Sealed, or Direct Invite mode.
- **Bid** — citizen-facing vocabulary for an immutable, versioned Quote response; it is not a separate canonical aggregate or table.
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

- `COMMITTED` — accepted full-platform contract delivered through a dependency-ordered train; it does not imply customer activation.
- `CONDITIONAL` — accepted contract kept disabled until its named prerequisites and activation evidence pass.
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
| PRD-001 | The system shall support account identity and least-privilege access for Buyer, Provider/Owner, Agent, and Admin capabilities. Signup requires verified mobile OTP and an account password; return sign-in is password-first with SMS OTP fallback and gated Google OAuth; recovery is single-use and non-enumerating. | PILOT / C,T,S |
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
| PRD-022 | The system shall implement a bounded Deal-Chaining coordination slice: DealChain, ordered DealNeed slots, same-chain acyclic dependencies, Need-specific invitations, reuse of Request/Quote formation, and isolated ordinary child-Order lineage. Customer activation remains separately gated. | CONDITIONAL / S,F |
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
| PRD-045 | The system shall provide traceable Buyer/Provider/Agent/Admin messaging or support routing for committed journeys. Messaging implementation follows the pre-messaging foundation wave and must consume its settled actor, Request/Quote/Order/Work, privacy, audit, and projection contracts rather than redefining them. | PILOT / C,T,S |
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

### 7.8 Initiative architecture and integration extension

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-060 | The full governed marketplace contract shall be implemented through dependency-ordered capability trains; capability presence shall never imply customer, pilot, provider, or live-money activation. | COMMITTED / C,T,S |
| PRD-061 | Governed category, capability-profile, Listing, Quote, policy, and accepted-terms meaning shall use immutable published business versions distinct from mutable optimistic `row_version`; accepted references shall never repoint. | COMMITTED / C,T,S |
| PRD-062 | Capacity shall use typed quantity, slot, resource, or availability buckets and explicit held, committed, released, and expired reservations with concurrency-safe exactly-once restoration. | COMMITTED / C,T,S |
| PRD-063 | Every formation mechanism shall converge on one final agreement command that atomically creates an accepted ordinary Order, exact terms, parties, required Work, one-lane Obligations, integrity records, and committed reservations or creates none. | COMMITTED / C,T,S |
| PRD-064 | Work shape and payload contract versions referenced by accepted terms shall retain compatible validators/readers; unknown versions shall park safely with no business effect and an attributable recovery path. | COMMITTED / C,T,S |
| PRD-065 | Account integrations shall use owner-scoped, environment-bound service principals with restrictive versioned scopes, separately rotatable/revocable credentials, non-enumerating cross-owner denial, and no special AI authority. | CONDITIONAL / C,S |
| PRD-066 | The account integration API shall use versioned commands/reads, owner/client-scoped idempotency and cursors, explicit conflicts, and signed retryable SSRF-safe outbound webhooks; Serbizyu remains system of record. | CONDITIONAL / C,S |
| PRD-067 | AI or automation shall never treat model output or general consent as authority; confirmation-required commands require a short-lived, single-use approval bound to the exact actor, client, command, normalized payload, targets, versions, economics, policy, and idempotency identity. | CONDITIONAL / C,S |
| PRD-068 | Asynchronous consumers shall deduplicate, enforce per-aggregate order, park gaps and unsupported versions, and support attributable replay/dead-letter recovery without duplicate business effect. | COMMITTED / C,T,S |
| PRD-069 | Capability activation shall be evidence-backed and evaluated at mutation time over explicit environment, cohort, geography, owner, category/profile, mechanism, shape, lane/provider, and client dimensions; any matching deny shall prevail and safe recovery shall remain available. | COMMITTED / C,T,S |
| PRD-070 | Financial effects shall use one immutable transaction per source event, balanced debit/credit entries per currency, immutable compensating corrections, and Obligation/provider/ledger reconciliation before protected release. | COMMITTED / C,T,S |
| PRD-071 | Provider events and evidence shall be authenticated, business-bound, quarantined/access-controlled as applicable, non-enumerating, retained/held by policy, and recoverable without treating upload or signature alone as truth. | COMMITTED / C,T,S |
| PRD-072 | Required web, database, Redis, worker, scheduler, and private-evidence processes shall have owned health, degradation, retry, backup/restore, migration, rollback, promotion, and environment/data-separation behavior; optional SSR/search/realtime adapters shall never become domain authority. | COMMITTED / C,T,S |
| PRD-073 | Publication, identity, money, consent, dispute, credential, evidence-export, hold, mismatch, correction, release/payout, and activation actions shall use deny-by-default authorization and maker/checker separation where policy requires. | COMMITTED / C,T,S |
| PRD-074 | Connected-payment and protected-payment behavior shall remain provider-neutral and sandbox-only until provider, legal, security, financial, reconciliation, refund, operations, and activation gates independently pass. | SANDBOX-ONLY / C,S |
| PRD-075 | Each implementation LLD shall define detailed actor-visible state, authority, primary action, copy, field visibility, loading/empty/denial/conflict/offline/degraded/retry/support, low-data/accessibility, browser, and human-UAT contracts before interface completion. | COMMITTED / C,T,S |
| PRD-076 | Deal-Chain, Need, dependency, invitation, Request, Quote, Order, and Work lineage shall be relationally enforceable; invitation acceptance may only mark a Need `partner_confirmed` and is not agreement. Every Need in an Order-backed `in_progress` or later execution state links one ordinary child Order whose terms, parties, Work, Obligations, disputes, cancellation, replacement, and liability remain isolated. | CONDITIONAL / S,F |

### 7.9 Request, Tender, Browse, cache, and builder foundation

| ID | Requirement | Status/plane |
|---|---|---|
| PRD-077 | A Sourcing Tender shall remain a Service or Product Request using the existing `requests → quotes → orders` contract. It shall use exactly one immutable-after-publication mode: Open Tender, Sealed Tender, or Direct Invite; no generic Bid aggregate/table, composite Listing, tender-level payment, or automatic lowest-price award is permitted. | COMMITTED / C,T,S |
| PRD-078 | A Bid shall be an immutable Quote revision in a provider/request lineage. One lineage has at most one active submitted version; amendment supersedes rather than overwrites; withdrawal terminalizes that lineage. One explicit `select_and_finalize_bid` command shall atomically revalidate exact source, provider, invitation, policy, schedule, capacity, partner, and version facts; record selection; form the ordinary Order; award the Tender; apply competing-Bid consequences; and commit audit/idempotency/outbox—or commit none of those effects. The UI action code `quote.select_and_finalize` maps to that command, which invokes `FinalizeOrderAgreement`. | COMMITTED / C,T,S |
| PRD-079 | Tender projections shall fail closed: Open permits public-safe discovery and eligible-provider participation but exposes no competitor terms or public/provider bid count by default; Sealed gives each bidder only their own Bid lineage and submission result while hiding every other Bid existence signal, identity, term, timing, and count from requester, competitors, and public until one committed close/reveal transition enters `selection_open`; Direct Invite is non-discoverable and non-enumerating. “Sealed” means application-level confidentiality, not cryptographic sealing. | COMMITTED / C,T,S |
| PRD-080 | Direct Invite participation shall require one exact current, unexpired, purpose-bound invitation for the same Request/provider and an exact Bid before award; Bid submission accepts the invitation, but invitation acceptance is not a Bid or Order. Finalization shall lock and revalidate that same invitation. Initial exposure permits one active provider alternative, mandatory nodes only, and status-only award disclosure outside the requester and winner; policy may later activate up to three alternatives without changing the aggregate model. | CONDITIONAL / C,T,S |
| PRD-081 | Request budget semantics shall be one of `target`, `ceiling`, `range`, `estimate`, or `undisclosed`, using integer minor units and explicit currency. Builder labels shall map one-to-one to those values; ambiguous “Exact Budget” vocabulary is forbidden. | COMMITTED / C,T,S |
| PRD-082 | Browse shall present Listings and eligible Requests in one discovery experience through distinct discriminated card/detail contracts. Filters, actions, labels, analytics, routes, and authorization shall preserve resource kind; Direct Invite and unsafe/private Request states shall never enter public Browse. | COMMITTED / C,T,S |
| PRD-083 | PostgreSQL projections shall be the default Browse path. A shared discovery cache may be activated only after measured query/latency or database-resilience evidence, an accountable owner, target, expiry, and disable decision show net benefit. When activated, it shall contain only stable server-authorized public/coarse fields—never mutable domain authority, current lifecycle/visibility/eligibility facts, source revision, live capacity/availability, or executable actions. Cache identity shall include resource kind, projection/policy version, geography, locale, normalized filters/sort/cursor, and visibility class; private/viewer-specific data shall not enter shared cache. Before serialization, one batched PostgreSQL read shall verify each cached resource's current revision, phase, visibility/policy qualification, capacity/availability, and activation; disqualified entries shall be discarded or rebuilt. Committed-event invalidation and bounded TTL are optimizations, and cache failure shall fall back to PostgreSQL. | COMMITTED SAFETY CONTRACT / CONDITIONALLY ACTIVATED ADAPTER / C,T,S |
| PRD-084 | Listing, Request/Tender, Work-specification, and Deal-Chain builders shall consume governed category/capability/catalog contracts, preserve drafts and exact source versions, expose only activated combinations, validate on the server, and emit typed formation inputs without editing accepted Order/Work truth. | COMMITTED / C,T,S |

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

### BR-011 — Bounded Deal-Chaining coordination

Deal-Chaining coordinates independent child work. A Need may use Request/Quote sourcing or a Need-specific invitation; invitation acceptance may mark the Need `partner_confirmed` but is not Order creation or agreement. A separate final-agreement command moves the Need into an Order-backed `in_progress` state and forms or links one ordinary child Order whose parties, terms, Work, evidence, Payment Obligations, disputes, cancellation, replacement, and liability remain isolated. Parent progress/cost is derived, dependencies are same-chain and acyclic, and no parent-wide financial or liability authority exists.

### BR-012 — Version identity

Immutable business/contract versions, optimistic `row_version`, event/payload contract versions, and artifact/revision versions are distinct and never substituted for one another.

### BR-013 — Final agreement atomicity

Pending proposals have no required Work or Payment children. Only a current, fully authorized final agreement may atomically create an accepted ordinary Order and all required children; partial success is forbidden.

### BR-014 — Tender privacy and selection

Open participation does not imply public Bid terms. Sealed projections reveal no pre-close competitor signal. Direct Invite existence is purpose-bound. Every mode fails closed at publication and submission unless current versioned response-eligibility, bounded anti-spam/rate/alternative, expiry/selection, genuine geography/category liquidity, accountable-owner, observability, and dimensioned activation evidence passes. Closing freezes submissions but never chooses a winner; only explicit requester selection through the sole final-agreement seam creates Order truth.

### BR-015 — Browse and cache boundary

Unified discovery is a PostgreSQL projection concern, not aggregate unification. Cache assistance is disabled by default and requires measured net-benefit activation. If enabled, entries contain already-authorized stable public/coarse fields, cannot authorize a command, require current PostgreSQL qualification before serialization, and disable/degrade to database-backed reads when unhelpful, regressed, absent, or unhealthy.

### BR-016 — Builder boundary

Builders author versioned source intent. They cannot write accepted Order terms, execution events, capacity commitments, or payment truth directly. Formation revalidates every source and governed catalog version.

### BR-017 — Owner-scoped automation

Owner identity comes from the authenticated service principal. Client scopes restrict but never enlarge owner/resource policy, and cross-owner identifiers do not disclose existence.

### BR-018 — Financial truth

One obligation has one lane. Money effects are append-only, balanced per currency, corrected by linked compensation, and protected release is blocked by mismatch, dispute, hold, or incomplete reconciliation.

### BR-019 — Activation and disablement

Activation is a versioned, evidence-backed decision over explicit dimensions, not a single mutable boolean. Disablement blocks new or irreversible effects while preserving authorized reads, reconciliation, refunds/reversals, evidence, support, and safe closure.

### BR-020 — Ordered asynchronous truth

Delivery success is not business success. Consumers deduplicate and apply only the next aggregate sequence; gaps, unknown versions, and poison messages remain visible until safe replay or resolution.

## 9. UX and accessibility requirements

- UX must use plain language and one clear primary action where practical.
- Icons supplement words.
- Payment lane, fee, custody, and protection meaning must be visible before confirmation.
- Listing and Request cards/details must be visibly distinct even when co-present in Browse.
- Tender mode, response deadline, selection deadline, budget semantics, Bid privacy, and invitation boundary must be explained before publication or submission.
- Builder state must distinguish saved draft, validation pending, publishable, published immutable source version, stale conflict, and recovery.
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
- Deal-Chaining customer activation beyond the bounded catalog/builder/lineage foundation
- Rental
- Recurring/open-ended work
- Dispatch/transport/emergency
- Kiosk cash operations
- Agent custody
- High-risk regulated categories
- Province-wide expansion
- Broad channel distribution without operations ownership

The dependency-ordered pre-messaging implementation boundary ends after governed Listings/discovery/cache, Request/Tender bidding, atomic Order formation, Work catalogs/builders, and bounded Deal-Chain catalogs/builders are proven. Messaging then begins as the next capability and consumes these authorities; it may not be used to hide missing structured scope, Bid, invitation, acceptance, or Work contracts.

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
- All PRD-001–084 rows are present with no compression, omission, or placeholder markers.
- Open, Sealed, and Direct Invite privacy matrices are explicit and non-enumerating.
- Browse/cache and builder boundaries are projected into architecture and dependency-correct delivery slices.
- Conditional and sandbox features have activation gates.
- The founder approves the product contract.

Next artifacts: reconciled domain/schema/UX/architecture authority and dependency-correct pre-messaging epics and stories.

