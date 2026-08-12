prd-rebuilt.md 467L
# Serbizyu 2.0 — Rebuilt Product Requirements Document
Status: CANONICAL PLANNING AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; implementation/live-money gates remain separate
... [lean-ctx: omitted 2 lines]
- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
... [lean-ctx: omitted 4 lines]
This document is the canonical product contract. The previous PRD is historical source material; the 2026-08-09 initiative extension is authoritative through PRD-060–076.
## 1. Product boundary
Serbizyu is a Tagudin-first, community-centered marketplace foundation for local services and goods. It supports Providers/Owners, Buyers/Customers, and approved Agents through clear listing, order, fulfillment, evidence, payment-lane, and support contracts.
... [lean-ctx: omitted 1 lines]
- **Capstone plane** — coherent software demonstration with sandbox/test data.
... [lean-ctx: omitted 3 lines]
Deal-Chaining is a product-plan capability with a committed, bounded four-table coordination foundation. Foundation existence is a startup-plane GO for persistence headroom and authority propagation; it is not a user-facing feature, pilot promise, financial authority, or pilot-activation decision. Later bounded coordination functionality and pilot activation are separately gated.
## 2. Goals and non-goals
### 2.1 Goals
- Make local services and goods easier to discover and request.
- Preserve low-barrier participation for cash users, small jobs, informal providers, and assisted users.
... [lean-ctx: omitted 4 lines]
- Record evidence, consent, actor attribution, and important corrections.
... [lean-ctx: omitted 1 lines]
- Create technical/product extension seams without enabling unsupported features.
- Produce trustworthy evidence for capstone evaluation and startup learning.
### 2.2 Non-goals for the initial pilot
- Province-wide or national launch.
... [lean-ctx: omitted 2 lines]
- Legal escrow, insurance, or guaranteed recovery claims.
... [lean-ctx: omitted 3 lines]
- Unbounded Deal-Chaining; the bounded coordination foundation is included as a separately gated startup-foundation commitment.
... [lean-ctx: omitted 2 lines]
- Full transport/dispatch or emergency response.
- High-risk regulated categories without a dedicated gate.
... [lean-ctx: omitted 1 lines]
- Immediate platform profitability as a pilot requirement.
## 3. Personas and actors
### P-01 Provider/Owner
A local person, informal worker, small seller, or organization offering a service/product.
... [lean-ctx: omitted 1 lines]
- Simple listing creation or approved assistance
... [lean-ctx: omitted 1 lines]
- Visibility to relevant Tagudin Buyers
- Evidence and transaction history
... [lean-ctx: omitted 3 lines]
### P-02 Buyer/Customer
A person seeking a local service, product, or purchase-on-behalf request.
... [lean-ctx: omitted 1 lines]
- Relevant discovery
... [lean-ctx: omitted 1 lines]
- Understandable price/quote/capacity
... [lean-ctx: omitted 1 lines]
- Payment-lane clarity
- Work progress/evidence
... [lean-ctx: omitted 1 lines]
### P-03 Agent
A delegated platform-management or assistance actor.
... [lean-ctx: omitted 3 lines]
- Clear interface for permitted actions
- Attribution and correction behavior
... [lean-ctx: omitted 2 lines]
### P-04 Admin/Operator
A trained support and operations actor.
... [lean-ctx: omitted 1 lines]
- Search and inspect Orders/Work/Evidence
... [lean-ctx: omitted 1 lines]
- Correct through auditable events
... [lean-ctx: omitted 2 lines]
- Reconcile pilot evidence
- Operate backup/recovery procedures
### P-05 Capstone evaluator
A reviewer who needs to see that the system is coherent, usable, traceable, and technically defensible without confusing sandbox behavior with production readiness.
## 4. Pilot cohort and success boundary
The Tagudin validation target is approximately 30 genuine onboarded participants:
... [lean-ctx: omitted 2 lines]
- At least 5 participants experiencing assisted or low-literacy-compatible access
- Target of approximately 4 live category families if supply/safety permit
... [lean-ctx: omitted 1 lines]
Evidence floor for evaluable validation:
... [lean-ctx: omitted 3 lines]
- 3 live category families
... [lean-ctx: omitted 2 lines]
## 5. Definitions
- **Listing** — offer/request record with terms and lifecycle.
... [lean-ctx: omitted 5 lines]
- **Completion** — Work Instance state reached through authorized fulfillment evidence; never inferred only from payment.
- **Onboarded participant** — genuine person who completed applicable account/consent/access steps and performed an intended marketplace action.
- **Activated Provider** — approved Provider with a live listing and genuine marketplace action.
... [lean-ctx: omitted 1 lines]
- **Genuine Order** — real community transaction, not seed/demo/training/sandbox activity.
## 6. Capability status and requirement planes
Every requirement uses one status:
- `COMMITTED` — accepted full-platform contract to implement through its dependency-ordered train; it does not imply pilot or live activation.
- `CONDITIONAL` — accepted capability contract whose implementation exposure or irreversible effects remain disabled until named prerequisites and activation evidence pass.
- `CAPSTONE` — required for coherent demonstration.
... [lean-ctx: omitted 1 lines]
- `PILOT-CONDITIONAL` — initial-pilot candidate requiring an activation gate.
... [lean-ctx: omitted 1 lines]
- `FOUNDATION` — extension seam or operational contract.
... [lean-ctx: omitted 1 lines]
- `EXCLUDED` — not supported without a new decision.
... [lean-ctx: omitted 5 lines]
## 7. Functional requirements
### 7.1 Identity, access, and assisted participation
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 1 lines]
| PRD-001 | The system shall support account identity and least-privilege access for Buyer, Provider/Owner, Agent, and Admin capabilities. **Auth (amended 2026-08-10):** signup requires verified mobile OTP; onboarding requires an account password (email optional); return sign-in is password-first (phone or email + password) with SMS OTP fallback and Google OAuth (live SMS/Google gated); password recovery via single-use email reset link or SMS-verified reset; auth endpoints rate-limited. | PILOT / C,T,S |
| PRD-002 | The system shall provide a government-ID verification path with consent, least-privilege access, manual-review fallback, retention/deletion rules, and legal/privacy gate before live sensitive collection. | PILOT-CONDITIONAL / C,T,S |
... [lean-ctx: omitted 2 lines]
| PRD-005 | The system shall prevent Agent assistance from silently changing ownership, payer, recipient, cash custodian, goods custodian, or final authority. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-007 | The system shall support L1 assisted access only when the kiosk/access operating model, training, attribution, and safety controls are approved. | PILOT-CONDITIONAL / C,T,S |
... [lean-ctx: omitted 2 lines]
### 7.2 Listing and discovery
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 2 lines]
| PRD-011 | A listing shall include type, owner, category family, scope, terms, price/quote/budget semantics, capacity/availability, area, safety/data class, evidence requirements, and lifecycle. | PILOT / C,T,S |
| PRD-012 | Listing lifecycle shall distinguish draft, review, active, paused, unavailable, expired, archived, and rejected states as applicable. | PILOT / C,T,S |
| PRD-013 | Discovery shall be Tagudin-scoped for the initial validation plane and shall avoid displaying stale or unavailable capacity as active supply. | PILOT / T |
... [lean-ctx: omitted 1 lines]
| PRD-015 | Category families shall carry supported shapes, safety class, data class, identity requirement, evidence requirement, and pilot/future status. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
### 7.3 Transaction formation
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 2 lines]
| PRD-018 | The system shall support Quote Request as a separate conditional mechanism with expiry, scope, amount, validity, acceptance, decline, and snapshot behavior. | PILOT-CONDITIONAL / C,S |
| PRD-019 | The system shall support Reverse Bidding only after response eligibility, anti-spam, expiry, selection, and liquidity gates pass. | PILOT-CONDITIONAL / C,S |
... [lean-ctx: omitted 2 lines]
| PRD-022 | The system shall implement a bounded Deal-Chaining coordination slice: DealChain, ordered DealNeed slots, same-chain dependency edges, Need-specific invitations, reuse of existing Request/Quote workflows, and isolated ordinary child-Order lineage. Initial pilot navigation and customer activation remain separately gated. | CONDITIONAL / S,F |
| PRD-023 | An Agent-created or Agent-assisted transaction shall retain the affected Owner/Buyer and acting Agent as separate actors. | PILOT / C,T,S |
### 7.4 Work/fulfillment
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 2 lines]
| PRD-025 | A1 Linear Project shall support scope, steps, evidence, revisions, completion proposal, sign-off/review, and dispute behavior. | PILOT / C,T |
| PRD-026 | A3 Appointment shall support availability, reservation conflict control, confirmation, reschedule/cancel, attendance/no-show, safety, and completion. | PILOT / C,T |
| PRD-027 | A4 Handoff shall support preparation, capacity/stock or sourcing, pickup/handoff, receipt/acceptance, mismatch, and dispute evidence. | PILOT / C,T |
| PRD-028 | A4 purchase-on-behalf extension shall support requested item, estimate/budget, approval, actual cost, variance, receipt, service fee if applicable, and handoff. | PILOT-CONDITIONAL / C,T,S |
... [lean-ctx: omitted 3 lines]
### 7.5 Payment and trust lanes
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 1 lines]
| PRD-032 | Each Payment Obligation shall have purpose, amount, due condition, payment lane, terms/policy snapshot, actor responsibility, evidence state, and correction behavior. | PILOT / C,T,S |
... [lean-ctx: omitted 2 lines]
| PRD-035 | External Digital Proof shall distinguish reported, counterparty-confirmed, provider-verified, disputed, rejected, and superseded evidence. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-037 | Payment evidence files shall support validation, malware scanning, masking/redaction guidance, access logging, retention/deletion, and dispute/legal hold. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-039 | Tiwala Protected Digital shall be demonstrated only in sandbox unless provider, legal, financial, refund, security, reconciliation, and operations gates pass. | SANDBOX-ONLY / C,S |
| PRD-040 | Tiwala release shall require authorized completion, sign-off/review-window eligibility, no active dispute, no fraud/admin/legal hold, reconciled amount, idempotency, and concurrency safety. | SANDBOX-ONLY / C,S |
... [lean-ctx: omitted 3 lines]
### 7.6 Communication, evidence, trust, and support
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 2 lines]
| PRD-045 | The system shall provide traceable Buyer/Provider/Agent/Admin messaging or support routing for committed journeys. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-047 | Reviews shall be eligible only after a supported completed interaction and shall not imply unperformed verification. | PILOT / C,T,S |
| PRD-048 | Dispute intake shall preserve evidence, identify affected obligations, support holds/restrictions, and record an administrative resolution. | PILOT / C,T,S |
... [lean-ctx: omitted 2 lines]
| PRD-051 | Meeting guidance shall prefer public/safer settings and avoid default home-entry requirements where applicable. | PILOT / C,T,S |
### 7.7 Operations and measurement
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 2 lines]
| PRD-053 | High-risk actions shall be attributable, permission-checked, logged, and recoverable through a defined procedure. | PILOT / C,T,S |
| PRD-054 | The system shall provide a failed-event/retry path for notifications, evidence processing, provider events, and other critical asynchronous work. | PILOT / C,T,S |
... [lean-ctx: omitted 2 lines]
| PRD-057 | The system shall measure activation, response/liquidity, completion, repeat, retention, disputes, incidents, support burden, evidence confirmation, and operating cost. | PILOT / C,T,S |
| PRD-058 | Backup/restore and incident-recovery procedures shall be testable before pilot launch. | PILOT / C,T,S |
... [lean-ctx: omitted 1 lines]
### 7.8 Initiative architecture and integration extension
| ID | Requirement | Status/plane |
... [lean-ctx: omitted 4 lines]
| PRD-063 | Every formation mechanism shall converge on one final agreement command that atomically creates an accepted ordinary Order, exact terms, parties, required Work, one-lane Obligations, integrity records, and committed reservations or creates none. | COMMITTED / C,T,S |
... [lean-ctx: omitted 2 lines]
| PRD-066 | The account integration API shall use versioned commands/reads, owner/client-scoped idempotency and cursors, explicit conflicts, and signed retryable SSRF-safe outbound webhooks; Serbizyu remains system of record. | CONDITIONAL / C,S |
... [lean-ctx: omitted 1 lines]
| PRD-068 | Asynchronous consumers shall deduplicate, enforce per-aggregate order, park gaps/unsupported versions, and support attributable replay/dead-letter recovery without duplicate business effect. | COMMITTED / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-070 | Financial effects shall use one immutable transaction per source event, balanced debit/credit entries per currency, immutable compensating corrections, and Obligation/provider/ledger reconciliation before protected release. | COMMITTED / C,T,S |
| PRD-071 | Provider events and evidence shall be authenticated, business-bound, quarantined/access-controlled as applicable, non-enumerating, retained/held by policy, and recoverable without treating upload or signature alone as truth. | COMMITTED / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-073 | Publication, identity, money, consent, dispute, credential, evidence-export, hold, mismatch, correction, release/payout, and activation actions shall use deny-by-default authorization and maker/checker separation where policy requires. | COMMITTED / C,T,S |
... [lean-ctx: omitted 1 lines]
| PRD-075 | Each implementation LLD shall define detailed actor-visible state, authority, primary action, copy, field visibility, loading/empty/denial/conflict/offline/degraded/retry/support, low-data/accessibility, browser, and human-UAT contracts before interface completion. | COMMITTED / C,T,S |
... [lean-ctx: omitted 1 lines]
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
Deal-Chaining coordinates independent child work. A Need may use existing Request/Quote workflows or a Need-specific invitation; invitation acceptance is not Order creation. An accepted Need forms or links one ordinary child Order whose parties, terms, Work, evidence, Payment Obligations, disputes, cancellation, replacement, and liability remain isolated. Parent progress/cost is derived, dependencies are same-chain and acyclic, and no parent-wide financial or liability authority exists.
### BR-012 — Version identity
Immutable business/contract versions, optimistic `row_version`, event/payload contract versions, and artifact/revision versions are distinct and never substituted for one another.
### BR-013 — Final agreement atomicity
Pending proposals have no required Work or Payment children. Only a current, fully authorized final agreement may atomically create an accepted ordinary Order and all required children; partial success is forbidden.
### BR-014 — Owner-scoped automation
Owner identity comes from the authenticated service principal. Client scopes restrict but never enlarge owner/resource policy, and cross-owner identifiers do not disclose existence.
### BR-015 — Financial truth
One obligation has one lane. Money effects are append-only, balanced per currency, corrected by linked compensation, and protected release is blocked by mismatch, dispute, hold, or incomplete reconciliation.
### BR-016 — Activation and disablement
Activation is a versioned, evidence-backed decision over explicit dimensions, not a single mutable boolean. Disablement blocks new/irreversible effects while preserving authorized reads, reconciliation, refunds/reversals, evidence, support, and safe closure.
### BR-017 — Ordered asynchronous truth
Delivery success is not business success. Consumers deduplicate and apply only the next aggregate sequence; gaps, unknown versions, and poison messages remain visible until safe replay or resolution.
[… truncated at ~4152 of 4923 tokens — use ctx_read with lines= parameter to see specific sections]
