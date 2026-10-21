---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd-rebuilt.md
  - _bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md
  - _bmad-output/planning-artifacts/canonical-schema-rebuilt.md
  - _bmad-output/planning-artifacts/adr-catalog-rebuilt.md
  - _bmad-output/planning-artifacts/architecture-rebuilt.md
  - _bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/frontend-view-projection-architecture-2026-09-08/VIEW-PROJECTION-MATRIX.md
  - _bmad-output/planning-artifacts/ux-spec-rebuilt.md
status: canonical-delivery-authority
updated: 2026-09-25
supersedes: _bmad-output/planning-artifacts/epics-and-stories-rebuilt.md
---

# Serbizyu 2.0 — Epic Breakdown

## Overview

Dependency-correct master-plan workspace. Current scope closes the foundation through governed Listings/Browse/cache, Request/Tender bidding, atomic Order formation, Work and Deal-Chain catalogs/builders. Messaging is the next bounded capability.

## Requirements Inventory

### Functional Requirements

PRD-001: The system shall support account identity and least-privilege access for Buyer, Provider/Owner, Agent, and Admin capabilities. Signup requires verified mobile OTP and an account password; return sign-in is password-first with SMS OTP fallback and gated Google OAuth; recovery is single-use and non-enumerating. _[PILOT / C,T,S]_
PRD-002: The system shall provide a government-ID verification path with consent, least-privilege access, manual-review fallback, retention/deletion rules, and legal/privacy gate before live sensitive collection. _[PILOT-CONDITIONAL / C,T,S]_
PRD-003: The system shall separate verified identity evidence from public trust badges and shall not imply stronger verification than was performed. _[PILOT / C,T,S]_
PRD-004: The system shall support Agent delegation with scope, owner consent, actor attribution, notices, revocation, and audit history. _[PILOT / C,T,S]_
PRD-005: The system shall prevent Agent assistance from silently changing ownership, payer, recipient, cash custodian, goods custodian, or final authority. _[PILOT / C,T,S]_
PRD-006: The system shall support L0 feature-phone owner notices/critical confirmations through an approved assisted process. _[PILOT-CONDITIONAL / C,T,S]_
PRD-007: The system shall support L1 assisted access only when the kiosk/access operating model, training, attribution, and safety controls are approved. _[PILOT-CONDITIONAL / C,T,S]_
PRD-008: The system shall support low-data L2 behavior with safe retry and draft handling; stale offline data shall not authorize irreversible actions. _[PILOT-CONDITIONAL / C,T,S]_
PRD-009: The system shall provide L3 online journeys and L4 audited Admin operations. _[PILOT / C,T,S]_
PRD-010: The system shall support Service Listing, Product Listing, Service Request, and Product Request as the four canonical listing types. _[CAPSTONE / C,S]_
PRD-011: A listing shall include type, owner, category family, scope, terms, price/quote/budget semantics, capacity/availability, area, safety/data class, evidence requirements, and lifecycle. _[PILOT / C,T,S]_
PRD-012: Listing lifecycle shall distinguish draft, review, active, paused, unavailable, expired, archived, and rejected states as applicable. _[PILOT / C,T,S]_
PRD-013: Discovery shall be Tagudin-scoped for the initial validation plane and shall avoid displaying stale or unavailable capacity as active supply. _[PILOT / T]_
PRD-014: Product listings shall not be active pilot capability without capacity/stock/oversell behavior and pickup/handoff semantics. _[PILOT / C,T]_
PRD-015: Category families shall carry supported shapes, safety class, data class, identity requirement, evidence requirement, and pilot/future status. _[PILOT / C,T,S]_
PRD-016: The system shall not publish unsupported categories merely because they exist in a historical catalog. _[PILOT / C,T,S]_
PRD-017: The system shall support Direct Booking for approved listing/capability profiles. _[PILOT / C,T]_
PRD-018: The system shall support Quote Request as a separate conditional mechanism with expiry, scope, amount, validity, acceptance, decline, and snapshot behavior. _[PILOT-CONDITIONAL / C,S]_
PRD-019: The system shall support Reverse Bidding only after response eligibility, anti-spam, expiry, selection, and liquidity gates pass. _[PILOT-CONDITIONAL / C,S]_
PRD-020: Quick Deal shall be treated as order formation, not fulfillment, with explicit terms, counterparty confirmation, expiry, retry, and safety behavior. _[PILOT-CONDITIONAL / C,S]_
PRD-021: Air-gapped/offline Quick Deal shall not authorize digital payment, payout, release, final inventory, or irreversible consent. _[DEFERRED / C,S]_
PRD-022: The system shall implement a bounded Deal-Chaining coordination slice: DealChain, ordered DealNeed slots, same-chain acyclic dependencies, Need-specific invitations, reuse of Request/Quote formation, and isolated ordinary child-Order lineage. Customer activation remains separately gated. _[CONDITIONAL / S,F]_
PRD-023: An Agent-created or Agent-assisted transaction shall retain the affected Owner/Buyer and acting Agent as separate actors. _[PILOT / C,T,S]_
PRD-024: The system shall maintain a Work Instance separate from Order and Payment Obligation. _[PILOT / C,T,S]_
PRD-025: A1 Linear Project shall support scope, steps, evidence, revisions, completion proposal, sign-off/review, and dispute behavior. _[PILOT / C,T]_
PRD-026: A3 Appointment shall support availability, reservation conflict control, confirmation, reschedule/cancel, attendance/no-show, safety, and completion. _[PILOT / C,T]_
PRD-027: A4 Handoff shall support preparation, capacity/stock or sourcing, pickup/handoff, receipt/acceptance, mismatch, and dispute evidence. _[PILOT / C,T]_
PRD-028: A4 purchase-on-behalf extension shall support requested item, estimate/budget, approval, actual cost, variance, receipt, service fee if applicable, and handoff. _[PILOT-CONDITIONAL / C,T,S]_
PRD-029: A9 Digital Delivery shall support artifact scope, secure delivery, access, acceptance/revision, version, retention, and dispute evidence. _[PILOT / C,T]_
PRD-030: A2, A5, A6, A8, and A10 shall remain deferred until their activation records pass. _[DEFERRED / S,F]_
PRD-031: The system shall never mark Work complete solely because a Payment Obligation is confirmed. _[PILOT / C,T,S]_
PRD-032: Each Payment Obligation shall have purpose, amount, due condition, payment lane, terms/policy snapshot, actor responsibility, evidence state, and correction behavior. _[PILOT / C,T,S]_
PRD-033: External Cash shall record buyer-paid/provider-received declarations, mutual acknowledgment, mismatch/dispute states, and no Serbizyu cash custody. _[PILOT / C,T,S]_
PRD-034: External Cash shall use 0% platform commission during capstone and initial Tagudin pilot and shall create no cash commission receivable. _[PILOT / C,T,S]_
PRD-035: External Digital Proof shall distinguish reported, counterparty-confirmed, provider-verified, disputed, rejected, and superseded evidence. _[PILOT / C,T,S]_
PRD-036: A screenshot/reference shall not be labeled provider-verified without a trusted provider adapter/API. _[PILOT / C,T,S]_
PRD-037: Payment evidence files shall support validation, malware scanning, masking/redaction guidance, access logging, retention/deletion, and dispute/legal hold. _[PILOT / C,T,S]_
PRD-038: Direct Digital shall be demonstrated only in sandbox unless provider, legal, financial, refund, security, reconciliation, and operations gates pass. _[SANDBOX-ONLY / C,S]_
PRD-039: Tiwala Protected Digital shall be demonstrated only in sandbox unless provider, legal, financial, refund, security, reconciliation, and operations gates pass. _[SANDBOX-ONLY / C,S]_
PRD-040: Tiwala release shall require authorized completion, sign-off/review-window eligibility, no active dispute, no fraud/admin/legal hold, reconciled amount, idempotency, and concurrency safety. _[SANDBOX-ONLY / C,S]_
PRD-041: No release clock shall begin at Order creation. _[SANDBOX-ONLY / C,S]_
PRD-042: The UI shall show actual peso cost and protection/custody meaning for connected-payment simulations; small jobs remain valid. _[CAPSTONE / C,T,S]_
PRD-043: Payment-lane changes after evidence exists shall use correction, cancellation, supersession, or refund events rather than overwriting history. _[PILOT / C,T,S]_
PRD-044: The system shall notify affected actors when listing, Order, Work, evidence, consent, dispute, hold, or payment-lane state changes. _[PILOT / C,T,S]_
PRD-045: The system shall provide traceable Buyer/Provider/Agent/Admin messaging or support routing for committed journeys. Messaging implementation follows the pre-messaging foundation wave and must consume its settled actor, Request/Quote/Order/Work, privacy, audit, and projection contracts rather than redefining them. _[PILOT / C,T,S]_
PRD-046: Each committed Work shape shall define required completion/handoff/attendance/delivery evidence. _[PILOT / C,T,S]_
PRD-047: Reviews shall be eligible only after a supported completed interaction and shall not imply unperformed verification. _[PILOT / C,T,S]_
PRD-048: Dispute intake shall preserve evidence, identify affected obligations, support holds/restrictions, and record an administrative resolution. _[PILOT / C,T,S]_
PRD-049: External Cash disputes shall not promise automatic refunds or cash recovery by Serbizyu. _[PILOT / C,T,S]_
PRD-050: The system shall support block/report and category-sensitive safety escalation. _[PILOT / C,T,S]_
PRD-051: Meeting guidance shall prefer public/safer settings and avoid default home-entry requirements where applicable. _[PILOT / C,T,S]_
PRD-052: Admin shall inspect Orders, Work Instances, Payment Obligations, evidence, consent, disputes, holds, and correction history. _[PILOT / C,T,S]_
PRD-053: High-risk actions shall be attributable, permission-checked, logged, and recoverable through a defined procedure. _[PILOT / C,T,S]_
PRD-054: The system shall provide a failed-event/retry path for notifications, evidence processing, provider events, and other critical asynchronous work. _[PILOT / C,T,S]_
PRD-055: Operations shall support holds/disablement for fraud, safety, legal, dispute, and provider incidents. _[PILOT / C,T,S]_
PRD-056: The system shall record cohort/evidence class so demo, team, sandbox, training, and genuine Tagudin activity cannot be confused. _[PILOT / C,T,S]_
PRD-057: The system shall measure activation, response/liquidity, completion, repeat, retention, disputes, incidents, support burden, evidence confirmation, and operating cost. _[PILOT / C,T,S]_
PRD-058: Backup/restore and incident-recovery procedures shall be testable before pilot launch. _[PILOT / C,T,S]_
PRD-059: The pilot shall not report revenue from External Cash transactions that Serbizyu did not collect. _[PILOT / C,T,S]_
PRD-060: The full governed marketplace contract shall be implemented through dependency-ordered capability trains; capability presence shall never imply customer, pilot, provider, or live-money activation. _[COMMITTED / C,T,S]_
PRD-061: Governed category, capability-profile, Listing, Quote, policy, and accepted-terms meaning shall use immutable published business versions distinct from mutable optimistic `row_version`; accepted references shall never repoint. _[COMMITTED / C,T,S]_
PRD-062: Capacity shall use typed quantity, slot, resource, or availability buckets and explicit held, committed, released, and expired reservations with concurrency-safe exactly-once restoration. _[COMMITTED / C,T,S]_
PRD-063: Every formation mechanism shall converge on one final agreement command that atomically creates an accepted ordinary Order, exact terms, parties, required Work, one-lane Obligations, integrity records, and committed reservations or creates none. _[COMMITTED / C,T,S]_
PRD-064: Work shape and payload contract versions referenced by accepted terms shall retain compatible validators/readers; unknown versions shall park safely with no business effect and an attributable recovery path. _[COMMITTED / C,T,S]_
PRD-065: Account integrations shall use owner-scoped, environment-bound service principals with restrictive versioned scopes, separately rotatable/revocable credentials, non-enumerating cross-owner denial, and no special AI authority. _[CONDITIONAL / C,S]_
PRD-066: The account integration API shall use versioned commands/reads, owner/client-scoped idempotency and cursors, explicit conflicts, and signed retryable SSRF-safe outbound webhooks; Serbizyu remains system of record. _[CONDITIONAL / C,S]_
PRD-067: AI or automation shall never treat model output or general consent as authority; confirmation-required commands require a short-lived, single-use approval bound to the exact actor, client, command, normalized payload, targets, versions, economics, policy, and idempotency identity. _[CONDITIONAL / C,S]_
PRD-068: Asynchronous consumers shall deduplicate, enforce per-aggregate order, park gaps and unsupported versions, and support attributable replay/dead-letter recovery without duplicate business effect. _[COMMITTED / C,T,S]_
PRD-069: Capability activation shall be evidence-backed and evaluated at mutation time over explicit environment, cohort, geography, owner, category/profile, mechanism, shape, lane/provider, and client dimensions; any matching deny shall prevail and safe recovery shall remain available. _[COMMITTED / C,T,S]_
PRD-070: Financial effects shall use one immutable transaction per source event, balanced debit/credit entries per currency, immutable compensating corrections, and Obligation/provider/ledger reconciliation before protected release. _[COMMITTED / C,T,S]_
PRD-071: Provider events and evidence shall be authenticated, business-bound, quarantined/access-controlled as applicable, non-enumerating, retained/held by policy, and recoverable without treating upload or signature alone as truth. _[COMMITTED / C,T,S]_
PRD-072: Required web, database, Redis, worker, scheduler, and private-evidence processes shall have owned health, degradation, retry, backup/restore, migration, rollback, promotion, and environment/data-separation behavior; optional SSR/search/realtime adapters shall never become domain authority. _[COMMITTED / C,T,S]_
PRD-073: Publication, identity, money, consent, dispute, credential, evidence-export, hold, mismatch, correction, release/payout, and activation actions shall use deny-by-default authorization and maker/checker separation where policy requires. _[COMMITTED / C,T,S]_
PRD-074: Connected-payment and protected-payment behavior shall remain provider-neutral and sandbox-only until provider, legal, security, financial, reconciliation, refund, operations, and activation gates independently pass. _[SANDBOX-ONLY / C,S]_
PRD-075: Each implementation LLD shall define detailed actor-visible state, authority, primary action, copy, field visibility, loading/empty/denial/conflict/offline/degraded/retry/support, low-data/accessibility, browser, and human-UAT contracts before interface completion. _[COMMITTED / C,T,S]_
PRD-076: Deal-Chain, Need, dependency, invitation, Request, Quote, Order, and Work lineage shall be relationally enforceable; invitation acceptance may only mark a Need `partner_confirmed` and is not agreement. Every Need in an Order-backed `in_progress` or later execution state links one ordinary child Order whose terms, parties, Work, Obligations, disputes, cancellation, replacement, and liability remain isolated. _[CONDITIONAL / S,F]_
PRD-077: A Sourcing Tender shall remain a Service or Product Request using the existing `requests → quotes → orders` contract. It shall use exactly one immutable-after-publication mode: Open Tender, Sealed Tender, or Direct Invite; no generic Bid aggregate/table, composite Listing, tender-level payment, or automatic lowest-price award is permitted. _[COMMITTED / C,T,S]_
PRD-078: A Bid shall be an immutable Quote revision in a provider/request lineage. One lineage has at most one active submitted version; amendment supersedes rather than overwrites; withdrawal terminalizes that lineage. One explicit `select_and_finalize_bid` command shall atomically revalidate exact source, provider, invitation, policy, schedule, capacity, partner, and version facts; record selection; form the ordinary Order; award the Tender; apply competing-Bid consequences; and commit audit/idempotency/outbox—or commit none of those effects. The UI action code `quote.select_and_finalize` maps to that command, which invokes `FinalizeOrderAgreement`. _[COMMITTED / C,T,S]_
PRD-079: Tender projections shall fail closed: Open permits public-safe discovery and eligible-provider participation but exposes no competitor terms or public/provider bid count by default; Sealed gives each bidder only their own Bid lineage and submission result while hiding every other Bid existence signal, identity, term, timing, and count from requester, competitors, and public until one committed close/reveal transition enters `selection_open`; Direct Invite is non-discoverable and non-enumerating. “Sealed” means application-level confidentiality, not cryptographic sealing. _[COMMITTED / C,T,S]_
PRD-080: Direct Invite participation shall require one exact current, unexpired, purpose-bound invitation for the same Request/provider and an exact Bid before award; Bid submission accepts the invitation, but invitation acceptance is not a Bid or Order. Finalization shall lock and revalidate that same invitation. Initial exposure permits one active provider alternative, mandatory nodes only, and status-only award disclosure outside the requester and winner; policy may later activate up to three alternatives without changing the aggregate model. _[CONDITIONAL / C,T,S]_
PRD-081: Request budget semantics shall be one of `target`, `ceiling`, `range`, `estimate`, or `undisclosed`, using integer minor units and explicit currency. Builder labels shall map one-to-one to those values; ambiguous “Exact Budget” vocabulary is forbidden. _[COMMITTED / C,T,S]_
PRD-082: Browse shall present Listings and eligible Requests in one discovery experience through distinct discriminated card/detail contracts. Filters, actions, labels, analytics, routes, and authorization shall preserve resource kind; Direct Invite and unsafe/private Request states shall never enter public Browse. _[COMMITTED / C,T,S]_
PRD-083: PostgreSQL projections shall be the default Browse path. A shared discovery cache may be activated only after measured query/latency or database-resilience evidence, an accountable owner, target, expiry, and disable decision show net benefit. When activated, it shall contain only stable server-authorized public/coarse fields—never mutable domain authority, current lifecycle/visibility/eligibility facts, source revision, live capacity/availability, or executable actions. Cache identity shall include resource kind, projection/policy version, geography, locale, normalized filters/sort/cursor, and visibility class; private/viewer-specific data shall not enter shared cache. Before serialization, one batched PostgreSQL read shall verify each cached resource's current revision, phase, visibility/policy qualification, capacity/availability, and activation; disqualified entries shall be discarded or rebuilt. Committed-event invalidation and bounded TTL are optimizations, and cache failure shall fall back to PostgreSQL. _[COMMITTED SAFETY CONTRACT / CONDITIONALLY ACTIVATED ADAPTER / C,T,S]_
PRD-084: Listing, Request/Tender, Work-specification, and Deal-Chain builders shall consume governed category/capability/catalog contracts, preserve drafts and exact source versions, expose only activated combinations, validate on the server, and emit typed formation inputs without editing accepted Order/Work truth. _[COMMITTED / C,T,S]_

### NonFunctional Requirements

- NFR-01: Authorization is deny-by-default, server-enforced, non-enumerating where resource existence is private, and re-evaluated immediately before mutation.
- NFR-02: State, audit, idempotency result, and outbox intent commit atomically for every critical command.
- NFR-03: Immutable business/source versions, optimistic row revisions, payload/event contract versions, and artifact revisions remain distinct.
- NFR-04: Concurrent capacity, slot, Bid revision, selection, approval, and finalization races are resolved by PostgreSQL constraints/locks with no partial business effect.
- NFR-05: PostgreSQL is the default Browse authority. Any activated shared cache has measured net benefit, stores public/coarse projections only, never authority or viewer-specific/private fields, and disables/falls back to PostgreSQL on failure or regression.
- NFR-06: Open, Sealed, and Direct Invite privacy applies to fields, counts, ordering, timing, errors, notifications, logs, analytics, caches, prefetch, history, and exports.
- NFR-07: Sensitive evidence is private, quarantined, validated/scanned, purpose-authorized on every retrieval, audited, retained, and held/deleted by policy.
- NFR-08: Every asynchronous consumer deduplicates, enforces aggregate order, parks gaps/unknown versions, and supports attributable idempotent replay/dead-letter recovery.
- NFR-09: Required processes expose owned health/degradation/retry behavior; Redis, SSR, search, realtime, and messaging are never correctness authority.
- NFR-10: Backup/restore, forward migration, in-place backfill, rollback, and environment promotion are rehearsed on production-shaped data before activation.
- NFR-11: All money uses integer minor units and currency; postings balance per currency and corrections are linked compensations.
- NFR-12: UI provides keyboard/touch accessibility, visible focus, announced errors/status, no color-only meaning, low-data/no-image alternatives, and safe responsive behavior.
- NFR-13: Drafts survive validation/network failure; stale/offline state cannot authorize publication, selection, Order formation, payment, release, or irreversible consent.
- NFR-14: Production, capstone sandbox, team/training, genuine pilot, and connected-provider data/secrets/metrics/activation remain separated.
- NFR-15: Unsupported projection or Work contract versions render safe recovery with no commercial action or business effect.

### Additional Requirements

- Use the existing Laravel 12 modular monolith: IdentityAccess, Listings, Catalogs, OrdersWork, PaymentObligations, TrustSupport, Operations, DealCoordination, and Integrations own their writes.
- Canonical migration target is 61 tables: observed 47-table baseline plus fourteen approved extension tables, including Request Invitations and the two already-migrated catalog-version tables.
- Listings owns governed category/profile/Listing/Request/Quote/Request Invitation authoring and purpose projections; Catalogs owns immutable Work/Deal-Chain authoring accelerators only.
- OrdersWork owns the sole `FinalizeOrderAgreement` PostgreSQL transaction and fixed lock order; Bid selection, complete ordinary Order formation, award, competing-lineage consequences, audit, idempotency, and outbox commit together or none commit.
- Browse composes discriminated PostgreSQL Listing/Request projections. Shared cache is optional and disabled until measured evidence proves net benefit; if active it excludes current lifecycle/visibility/eligibility, source revision, live availability, and actions, and one batched PostgreSQL overlay verifies current qualification before serialization.
- Cache invalidation originates from committed outbox events as an optimization; bounded TTL is defense in depth, measured no-benefit/privacy/freshness regression disables the adapter, and PostgreSQL projections are the default/fallback.
- Open, Sealed, and Direct Invite use one Request/Quote/Order spine; no generic bids table, durable pre-Order selection authority, or tender payment exists.
- Scheduler may invoke guarded response close/reveal, selection expiry, invitation expiry, and reservation expiry and owns health-visible retries; synchronous reads/commands still evaluate expiry and jobs never bypass transition guards.
- Work shapes resolve through a retained version registry; the A1/A3/A4/A9 catalog/resolver/source-specification builder/validator precedes any authoring or finalization path that requires Work.
- Deal-Chain catalog/builder coordinates ordinary isolated child Orders and owns no pooled money or sibling truth.
- Every implementation packet uses a 15-section LLD/OpenSpec with activation, rollback, operations, browser, and human-UAT evidence.
- Every packet completes the master plan engineering matrix across ownership/invariants, data integrity, transaction/concurrency/idempotency, security/privacy, async/external failure, query/index/performance, observability, UX/accessibility, testing, migration/deployment/recovery, and maintainability; each non-applicable item requires a reason, and every added optimization requires a measured bottleneck or named failure mode.
- Messaging begins only after the pre-messaging foundation and consumes the settled participant/privacy/lineage/audit/projection contracts.

### UX Design Requirements

- UX-DR01: Unified Browse exhaustively renders distinct ListingCardView and RequestCardView with resource-specific labels, information, routes, actions, and analytics.
- UX-DR02: Browse supports loading skeleton, filtered empty, unavailable, stale navigation, and Redis-degraded PostgreSQL fallback without stale commercial claims.
- UX-DR03: Request/Tender builder is resumable and server-validated across governed category, scope, Work specification, budget, location/safety, mode/timeline, and review steps.
- UX-DR04: Budget controls map exactly to Target budget, Budget limit, Budget range, Need an estimate, and Keep budget private.
- UX-DR05: Open Bid composer produces immutable structured Quote versions with diff-before-revise, explicit withdrawal, exact validity, Work, lane, and source versions.
- UX-DR06: Open competitor views omit Bid terms, identities, rankings, and counts across all surfaces.
- UX-DR07: Sealed requester and bidder views omit every competitor existence signal until one server-confirmed close/reveal transition.
- UX-DR08: Direct Invite is absent from public discovery and gives non-invitees uniform private/not-found recovery.
- UX-DR09: Direct Invite provider can decline or submit an exact Bid; invitation acceptance never displays Order-created success.
- UX-DR10: Requester comparison selects only current comparable Bid versions and shows exact finalization consequences before one primary confirmation.
- UX-DR11: Finalization conflict preserves comparison state, explains stale/eligibility/capacity/policy cause, and never implies partial Order success.
- UX-DR12: Work catalog explains activated shape, capacity, evidence, safety/data, lane, and version; shape builder authors source specification only.
- UX-DR13: Deal-Chain builder validates ordered Needs, same-chain acyclic dependencies, Request/Quote/invitation sourcing, and derived readiness without pooled authority.
- UX-DR14: Every connected surface defines loading, empty, denial, validation, stale, offline, degraded, retry/idempotent success, support, accessibility, and low-data behavior.
- UX-DR15: Messaging handoff preserves structured commercial state and later binds conversation membership to exact participants, purpose, privacy, retention, and audit.

### FR Coverage Map

PRD-001: Epic 1 — secure account access.
PRD-002: Epic 1 — gated identity verification.
PRD-003: Epic 1 — honest public trust signals.
PRD-004: Epic 1 — scoped Agent delegation.
PRD-005: Epic 1 — preserved ownership and authority.
PRD-006: Epic 1 — conditional feature-phone confirmations.
PRD-007: Epic 1 — controlled assisted access.
PRD-008: Epic 1 — safe low-data behavior.
PRD-009: Epic 1 — online journeys and audited operations.
PRD-010: Epic 2 — four canonical marketplace resource types.
PRD-011: Epic 2 — governed authoring fields.
PRD-012: Epic 2 — Listing lifecycle.
PRD-013: Epic 3 — current Tagudin discovery.
PRD-014: Epic 3 — capacity-safe product supply.
PRD-015: Epic 2 — governed category capabilities.
PRD-016: Epic 2 — unsupported-category publication denial.
PRD-017: Epic 4 — Direct Booking.
PRD-018: Epic 5 — conditional Quote Request.
PRD-019: Epic 5 — reverse bidding controls.
PRD-020: Epic 4 — online Quick Deal formation boundary.
PRD-021: Epic 4 — offline irreversible-authority denial.
PRD-022: Epic 7 — bounded Deal-Chain coordination.
PRD-023: Epic 1 — separate Owner and acting Agent attribution.
PRD-024: Epic 4 — separate Work Instance.
PRD-025: Epic 4 — A1 Linear Project.
PRD-026: Epic 4 — A3 Appointment.
PRD-027: Epic 4 — A4 Handoff.
PRD-028: Epic 4 — A4 purchase-on-behalf.
PRD-029: Epic 4 — A9 Digital Delivery.
PRD-030: Epic 4 — unsupported Work-shape activation denial.
PRD-031: Epic 4 — payment cannot complete Work.
PRD-032: Epic 8 — explicit Payment Obligations.
PRD-033: Epic 8 — External Cash declarations.
PRD-034: Epic 8 — zero cash commission/custody.
PRD-035: Epic 8 — External Digital Proof states.
PRD-036: Epic 8 — no false provider verification.
PRD-037: Epic 8 — private evidence lifecycle.
PRD-038: Epic 11 — Direct Digital sandbox gate.
PRD-039: Epic 11 — Tiwala sandbox gate.
PRD-040: Epic 11 — protected release guards.
PRD-041: Epic 11 — no Order-created release clock.
PRD-042: Epic 8 — visible peso/protection meaning.
PRD-043: Epic 8 — append-only lane correction.
PRD-044: Epic 10 — attributable notifications.
PRD-045: Epic 10 — traceable Messaging after foundation.
PRD-046: Epic 8 — shape-specific completion evidence.
PRD-047: Epic 8 — supported-interaction reviews.
PRD-048: Epic 8 — dispute evidence and holds.
PRD-049: Epic 8 — no automatic cash-refund promise.
PRD-050: Epic 8 — block/report/escalation.
PRD-051: Epic 8 — safer meeting guidance.
PRD-052: Epic 9 — Operations inspection.
PRD-053: Epic 9 — attributable high-risk actions.
PRD-054: Epic 9 — failed-event recovery.
PRD-055: Epic 9 — operational holds and disablement.
PRD-056: Epic 9 — evidence/cohort classification.
PRD-057: Epic 9 — marketplace measurement.
PRD-058: Epic 9 — tested backup/restore.
PRD-059: Epic 9 — truthful pilot revenue reporting.
PRD-060: Epic 9 — dependency-ordered activation.
PRD-061: Epic 2 — immutable governed business versions.
PRD-062: Epic 2 — explicit capacity reservations.
PRD-063: Epic 4 — sole atomic final agreement; consumed by Epics 5–7.
PRD-064: Epic 2 — retained Work contract versions.
PRD-065: Epic 12 — owner-scoped service principals.
PRD-066: Epic 12 — governed integration API/webhooks.
PRD-067: Epic 12 — exact AI command approval.
PRD-068: Epic 9 — ordered asynchronous consumers.
PRD-069: Epic 9 — dimensioned activation.
PRD-070: Epic 11 — balanced financial truth.
PRD-071: Epic 8 — authenticated provider/evidence boundary.
PRD-072: Epic 9 — owned runtime/recovery behavior.
PRD-073: Epic 9 — deny-by-default maker/checker.
PRD-074: Epic 11 — provider-neutral sandbox-only money.
PRD-075: Epic 9 — mandatory cross-surface completion contract.
PRD-076: Epic 7 — enforceable child lineage/isolation.
PRD-077: Epic 5 — one Request/Quote/Order Tender spine.
PRD-078: Epic 5 — immutable Bid lineage and explicit selection.
PRD-079: Epic 6 — Open/Sealed/Direct privacy.
PRD-080: Epic 6 — Direct Invite and initial alternatives.
PRD-081: Epic 5 — canonical Request budget vocabulary.
PRD-082: Epic 3 — discriminated unified Browse.
PRD-083: Epic 3 — projection-only discovery cache.
PRD-084: Epic 2 — governed source-specification builders.

## Epic List

### Epic 1: Participate Securely and Act for the Right Person
Buyers, providers, Agents, and operators can establish a recoverable account, understand their capabilities, manage privacy, and perform only actions authorized for the current person or Owner.
**FRs covered:** PRD-001–009, PRD-023, PRD-037, PRD-044, PRD-053–054, PRD-068–069, PRD-071–073, PRD-075.

### Epic 2: Author Valid Marketplace Offers and Work Specifications
Operators can govern category/capability versions, while providers and requesters can build resumable Listing, Request, and A1/A3/A4/A9 Work specifications from only supported, activated combinations.
**FRs covered:** PRD-010–012, PRD-015–016, PRD-018–019, PRD-022, PRD-024–030, PRD-055, PRD-060–061, PRD-064, PRD-069, PRD-072–073, PRD-075–077, PRD-080–081, PRD-084.

### Epic 3: Publish Supply and Discover Current Local Opportunities
Providers can publish capacity-safe service/product Listings, and community members can browse visibly distinct Listings and public-safe Requests through current, privacy-safe projections even when Redis/search adapters degrade.
**FRs covered:** PRD-010–016, PRD-057, PRD-061–063, PRD-072, PRD-075, PRD-082–084.

### Epic 4: Form an Ordinary Agreement and Complete the Promised Work
Two parties can use Direct Booking, Quote acceptance, or online Quick Deal to create exactly one immutable ordinary Order and execute A1/A3/A4/A9 Work without conflating agreement, fulfillment, or payment.
**FRs covered:** PRD-017, PRD-020–021, PRD-023–029, PRD-031–032, PRD-037, PRD-046, PRD-062–064, PRD-075, PRD-084.

### Epic 5: Source a Need Through Public Bidding
A citizen can publish an Open Tender, eligible providers can submit/revise/withdraw private structured Bids, and the citizen can compare current versions and deliberately form one ordinary Order with no partial success.
**FRs covered:** PRD-018–019, PRD-044, PRD-054, PRD-061, PRD-063–064, PRD-068–069, PRD-075, PRD-077–081, PRD-084.

### Epic 6: Source Privately Through Sealed or Direct Invite Bidding
A citizen can use Sealed Bidding without pre-close participation leakage or invite selected providers through a non-enumerating Direct Invite flow; every winner still submits an exact Bid and forms an ordinary Order.
**FRs covered:** PRD-019, PRD-044, PRD-054, PRD-063, PRD-068–069, PRD-071–072, PRD-075, PRD-077–080.

### Epic 7: Coordinate a Multi-Need Deal Without Merging Child Truth
A coordinator can author a governed Deal Chain, source acyclic Needs, and form isolated ordinary child Orders while preserving each child's parties, Work, Obligations, disputes, cancellation, replacement, and liability.
**FRs covered:** PRD-022, PRD-054, PRD-061, PRD-063–064, PRD-068–069, PRD-071, PRD-075–076, PRD-084.

### Epic 8: Prove Fulfillment, Record Off-Platform Payment, and Recover Safely
Participants can provide protected evidence, record External Cash/Digital Proof honestly, complete/review Work, raise disputes or safety concerns, and reach support without custody, verification, refund, or completion overclaims.
**FRs covered:** PRD-031–037, PRD-042–043, PRD-046–051, PRD-053, PRD-055, PRD-071, PRD-073, PRD-075.

### Epic 9: Operate, Measure, Disable, and Recover the Marketplace
Authorized operators can inspect cause and lineage, recover failed asynchronous work, apply holds/activation/approvals, rehearse restore, and report genuine activity without confusing sandbox or uncollected cash.
**FRs covered:** PRD-044, PRD-052–060, PRD-068–069, PRD-072–073, PRD-075, PRD-083.

### Epic 10: Communicate Within Settled Marketplace Boundaries
After the pre-messaging foundation gate, authorized participants can exchange attributable, purpose-bound messages and receive notifications whose membership, privacy, retention, and support routing derive from settled Request/Bid/Order/Work relationships.
**FRs covered:** PRD-044–045, PRD-050, PRD-054–055, PRD-068, PRD-071, PRD-075.

### Epic 11: Demonstrate Connected Money Without Claiming Live Authority
Capstone users can exercise provider-neutral Direct Digital and Tiwala flows in sandbox with balanced accounting, reconciliation, refunds/reversals, guarded release, and permanent non-live labeling.
**FRs covered:** PRD-038–043, PRD-048–049, PRD-055, PRD-070, PRD-072–075.

### Epic 12: Connect Owner-Scoped Apps and Exact-Approval Automation
Owners can operate revocable scoped integrations, while future AI can draft and request exact human approval without gaining independent publication, agreement, consent, dispute, identity, or money authority.
**FRs covered:** PRD-065–069, PRD-072–073, PRD-075.

**Dependency boundary:** Epics 1–9 are the pre-messaging foundation. Epic 10 is the next bounded capability. Epics 11–12 remain sandbox/conditional and cannot block the non-connected foundation. The 61-table migration/application kernel is an implementation prerequisite embedded in the first consuming stories, not a technical-value epic.

## Epic 1: Participate Securely and Act for the Right Person

Users can establish recoverable accounts and act only under current attributable authority.

### Story 1.1: Create and Resume a Secure Account
**Requirements:** PRD-001, PRD-008–009; UX-DR03, UX-DR14.

As a new community member,
I want to register with verified mobile ownership and resume interrupted onboarding,
So that I can establish one real account without losing safe progress.

**Acceptance Criteria:**

**Given** an unregistered mobile number
**When** the member completes OTP verification, sets a password, and submits valid profile data
**Then** one account and resumable onboarding state are committed idempotently
**And** expired, replayed, over-attempt, or mismatched OTPs create no account and return non-enumerating recovery.

### Story 1.2: Sign In and Recover Without Enumeration
**Requirements:** PRD-001, PRD-008–009, PRD-075; UX-DR14.

As a returning member,
I want password-first sign-in with approved fallback and recovery,
So that I can regain access without exposing whether another account exists.

**Acceptance Criteria:**

**Given** a ready, suspended, incomplete, or unknown account identifier
**When** password sign-in, SMS fallback, gated Google sign-in, or single-use recovery is attempted
**Then** only the currently activated method can establish a session for an eligible account
**And** failure timing/copy is non-enumerating, recovery tokens cannot replay, and incomplete onboarding resumes safely.

### Story 1.3: Manage Additive Capabilities and Profile Readiness
**Requirements:** PRD-001, PRD-003, PRD-023, PRD-075; UX-DR14.

As a member,
I want Buyer, Provider/Owner, and Agent capabilities added without changing my identity,
So that I can participate in different transactions under one attributable account.

**Acceptance Criteria:**

**Given** an authenticated member
**When** they request or update a capability and required profile fields
**Then** the server records separate capability/readiness state and returns purpose-specific actions
**And** no global role switch, client-supplied Owner, or unsupported capability grants authority.

### Story 1.4: Submit and Review Identity Evidence Safely
**Requirements:** PRD-002–003, PRD-037, PRD-071, PRD-075; UX-DR14.

As a participant in a gated journey,
I want identity evidence handled privately and reviewed honestly,
So that I can satisfy policy without creating a misleading public badge.

**Acceptance Criteria:**

**Given** the identity-evidence capability is legally and operationally activated
**When** evidence is submitted, reviewed, rejected, resubmitted, held, or deleted
**Then** quarantine, least-privilege access, purpose audit, retention, and manual-review states are enforced
**And** public trust projections describe only the verification actually performed.

### Story 1.5: Grant and Revoke Agent Authority
**Requirements:** PRD-004–005, PRD-023, PRD-053, PRD-073, PRD-075; UX-DR14.

As an Owner,
I want to grant an Agent bounded acting authority and revoke it,
So that assistance remains consensual, scoped, and attributable.

**Acceptance Criteria:**

**Given** an authenticated Owner and Agent
**When** a purpose-, action-, resource-, sensitivity-, and time-bounded grant is created or revoked
**Then** every acting read/command resolves the current grant and records principal plus effective Owner
**And** expiry/revocation immediately blocks future actions while immutable prior attribution remains visible.

### Story 1.6: Enforce Attributable High-Risk Actions
**Requirements:** PRD-053, PRD-073, PRD-075; UX-DR14.

As an accountable operator,
I want sensitive actions to require current authority and separation of duties,
So that no actor can silently approve their own high-risk effect.

**Acceptance Criteria:**

**Given** a publication, identity, consent, evidence-export, hold, dispute, money, credential, or activation command
**When** policy requires step-up or maker/checker approval
**Then** exact command fingerprint, target versions, approver roles, expiry, and single-use consumption are validated atomically
**And** denial commits no business effect and returns a safe recovery path.

### Story 1.7: Receive Essential Marketplace Notices Reliably
**Requirements:** PRD-044, PRD-054, PRD-068, PRD-072, PRD-075; UX-DR14.

As a marketplace participant,
I want essential security and structured-journey notices delivered safely,
So that I can act without requiring Messaging or mistaking delivery for business success.

**Acceptance Criteria:**

**Given** a committed account, authority, security, or later marketplace notification intent in canonical `pending`
**When** the shared in-app/SMS/email transport dispatches immutable numbered attempts, receives provider results, or loses recipient/purpose authority while an attempt may be in flight
**Then** current authorization, mandatory-policy cancellation guard, privacy-safe regenerated content, locale, deduplication, bounded timeout/retry/backoff, preference override, exact intent/attempt transitions, route-success evidence, acknowledgment, dead-letter, and attributable new-generation support replay are enforced; cancellation persists `cancellation_requested`, route success persists `delivery_settling` when needed, and both cancel pending attempts and block every new claim/retry/route
**And** already-sending attempts reconcile to an authentic result or bounded `outcome_unknown` without provider I/O inside a transaction; late results append evidence without reopening effects, parent terminalization is deterministic, inbox acknowledgment follows initial scheduling—not provider success—and delivery grants no conversation, mutation, or business-success authority.

### Story 1.8: Use Conditionally Activated Assisted Access
**Requirements:** PRD-006–007, PRD-023, PRD-044, PRD-053, PRD-069, PRD-072–073, PRD-075; UX-DR14.

As a member who needs feature-phone or kiosk assistance,
I want bounded attributable support with explicit confirmations,
So that access constraints do not silently transfer my authority.

**Acceptance Criteria:**

**Given** an approved versioned L0/L1 operating model with named Product/Operations/Safety owners, trained active kiosk/Agent identity, device/site purpose, consent/notice script, incident path, and current activation dimensions
**When** an assisted session starts or an Agent proposes a critical action
**Then** the Owner receives the activated feature-phone notice/confirmation or accessible equivalent, principal and effective Owner remain distinct, exact scope/action/resource/consequence is confirmed, and every attempt/result is auditable
**And** absent approval/training/safety evidence, failed or expired confirmation, shared-device leakage risk, offline authority, or revoked grant fails closed while preserving non-sensitive support/recovery; a kiosk never becomes owner, custodian, bank, or blanket approver.

## Epic 2: Author Valid Marketplace Offers and Work Specifications

Operators publish governed versions; authors create only valid source specifications.

### Story 2.1: Reconcile the Canonical Migration Manifest and Existing Catalog Baseline
**Requirements:** PRD-060–061, PRD-072, PRD-075, PRD-080, PRD-084; architecture schema gate.

As an operator,
I want one reconciled 61-table manifest and verified existing catalog baseline,
So that each vertical story can migrate only the persistence it first consumes.

**Acceptance Criteria:**

**Given** the observed 47-table baseline, the two already-migrated catalog-version tables, and fourteen approved extensions
**When** the implementation packet reconciles inventory, ownership, dependency order, and clean/in-place migration/rollback paths
**Then** the canonical manifest contains exactly 61 tables and maps every not-yet-needed table to its first consuming story
**And** this story verifies current catalog constraints plus production-shaped migration fixtures without pre-creating unrelated future tables; each later story rehearses its own required migration, FK/check/index, backfill, and rollback.

### Story 2.2: Publish Governed Category and Capability Versions
**Requirements:** PRD-010, PRD-015–016, PRD-061, PRD-069, PRD-075, PRD-084.

As a marketplace operator,
I want immutable category and capability-profile versions,
So that authors and accepted agreements use stable supported meaning.

**Acceptance Criteria:**

**Given** an authorized draft category/profile
**When** it is reviewed, published, paused, superseded, or retired
**Then** business versions remain immutable, row revision remains separate, and only one current active version exists per family
**And** unsupported combinations of mechanism, Work shape, capacity, lane, evidence, safety, or data class fail closed.

### Story 2.3: Activate or Disable an Exact Governed Capability Slice
**Requirements:** PRD-055, PRD-060–061, PRD-069, PRD-073, PRD-075, PRD-084; UX-DR14.

As an accountable operator,
I want evidence-backed enable/deny decisions over exact marketplace dimensions,
So that the first conditional publisher can fail closed without waiting for a later operations epic.

**Acceptance Criteria:**

**Given** published immutable category/profile policy versions, environment/cohort/geography/Owner/mechanism/shape/lane/provider/client dimensions, approval/evidence, and an expected current activation row version
**When** an approved enable or deny becomes current at one UTC cutover instant
**Then** category authority exists first and one transaction locks/closes only the prior activation validity before inserting its immutable successor, preserving non-overlap, exact FKs, attribution, audit, idempotency, outbox, expiry, rollback/incident owners, and the complete decision fingerprint
**And** absence or any matching deny fails closed, stale/concurrent cutover has no effect, web/workers recheck before mutation, and decision/evidence history never mutates.

### Story 2.4: Publish Governed Work Catalog Versions
**Requirements:** PRD-024–030, PRD-064, PRD-084; UX-DR12.

As an author,
I want a catalog of activated A1/A3/A4/A9 Work starting points,
So that I understand the valid fulfillment contract before offering or requesting it.

**Acceptance Criteria:**

**Given** registered retained Work contract versions and a current Story 2.3 activation decision for every referenced governed dimension
**When** an operator publishes a Work catalog version
**Then** it pins shape contract, payload schema, supported mechanisms, capacity, evidence, safety/data, and lane dimensions
**And** absent/denied/expired activation prevents publication; published definitions are immutable authoring aids and never become Work execution authority.

### Story 2.5: Build and Validate a Work Source Specification
**Requirements:** PRD-024–030, PRD-061, PRD-064, PRD-075, PRD-084; UX-DR03, UX-DR12, UX-DR14.

As a Listing, Request, Quote, or Deal-Need author,
I want a shape-specific resumable Work builder,
So that my source can be normalized and safely accepted later.

**Acceptance Criteria:**

**Given** an activated category/profile and Work catalog entry
**When** the author saves, resumes, validates, or submits an A1/A3/A4/A9 specification
**Then** the builder uses CAS, preserves safe input, emits one typed canonical payload/hash with exact versions, and explains validation errors
**And** OrdersWork re-resolution of a different fingerprint is a stale conflict rather than silent reinterpretation.

### Story 2.6: Author a Governed Listing Draft
**Requirements:** PRD-010–012, PRD-015–016, PRD-061, PRD-075, PRD-084; UX-DR14.

As a provider,
I want a resumable Listing builder,
So that I can hand a complete, policy-valid supply draft to the publication boundary.

**Acceptance Criteria:**

**Given** current catalogs, activation, and acting context
**When** a provider saves, resumes, validates, or marks a Listing draft ready for publication
**Then** only authorized category/profile/Work/safety/visibility combinations appear, exact versions are pinned, and the handoff contains no publication effect
**And** stale conflicts preserve input, final publication remains a separate lifecycle-owned server-revalidated command, and accepted Order/Work truth is never editable from the builder.

### Story 2.7: Author a Governed Request/Tender Draft
**Requirements:** PRD-018–019, PRD-061, PRD-075, PRD-077, PRD-081, PRD-084; UX-DR03–04, UX-DR14.

As a requester,
I want a resumable Request/Tender builder,
So that I can hand a complete Request to the correct mechanism-specific publication boundary.

**Acceptance Criteria:**

**Given** current catalogs, activation, acting context, and Work source contract
**When** a requester saves, resumes, validates, or marks a Request/Tender draft ready for publication
**Then** only authorized category/profile/mechanism/Work/lane/safety/visibility combinations appear, mechanism-specific requirements are explained, exact versions are pinned, and the handoff contains no publication effect
**And** stale conflicts preserve input, final publication remains a separate mechanism-owned server-revalidated command, and accepted Order/Work truth is never editable from the builder.

### Story 2.8: Publish Governed Deal-Chain Recipes
**Requirements:** PRD-022, PRD-069, PRD-076, PRD-084; UX-DR13.

As a coordinator,
I want optional versioned Deal-Chain recipes,
So that I can start a valid multi-Need plan without giving a template runtime authority.

**Acceptance Criteria:**

**Given** current category, mechanism, and Work contracts
**When** an operator publishes or retires a Deal-Chain catalog version
**Then** its recipe, allowed categories/listing types/Work shapes, cost display metadata, and payload version are immutable and retained
**And** it can generate only same-Chain acyclic Need drafts and cannot own child Orders, Work, money, disputes, or liability.

## Epic 3: Publish Supply and Discover Current Local Opportunities

Providers publish governed capacity-safe supply; users browse current distinct resource projections.

### Story 3.1: Publish and Maintain a Listing Version
**Requirements:** PRD-010–016, PRD-061, PRD-075, PRD-084; UX-DR14.

As a provider,
I want to draft, review, publish, pause, supersede, and archive a Listing,
So that buyers see only currently supported supply.

**Acceptance Criteria:**

**Given** a ready provider and valid governed source specification
**When** the provider submits a Listing lifecycle command
**Then** immutable published versions pin exact category/profile/Work/policy versions and actor context
**And** stale, unsupported, unreviewed, or inactive inputs cannot publish and return field-level recovery.

### Story 3.2: Manage Capacity Without Overselling
**Requirements:** PRD-014, PRD-062–063, PRD-075; UX-DR02, UX-DR14.

As a provider,
I want quantity, slot/resource, service-availability, or request-based capacity managed safely,
So that two buyers cannot consume the same supply.

**Acceptance Criteria:**

**Given** a current Listing version and capacity bucket
**When** availability is held, committed, released, expired, or corrected concurrently
**Then** expected bucket version, resource identity, quantity/slot guards, and idempotency prevent negative capacity or double booking
**And** terminal paths release exactly once and retain reservation lineage.

### Story 3.3: Browse Listings and Public-Safe Requests
**Requirements:** PRD-013, PRD-057, PRD-075, PRD-082; UX-DR01–02, UX-DR14.

As a community member,
I want one Browse experience with visibly distinct Listings and Requests,
So that I can understand whether supply or demand is being shown and take the right next step.

**Acceptance Criteria:**

**Given** current public/coarse eligible projections
**When** Browse is filtered, sorted, paginated, refreshed, or opened in low-data mode
**Then** discriminated ListingCardView and RequestCardView preserve distinct labels, facts, routes, actions, analytics, and empty/loading states
**And** Direct Invite and unsafe/private Request states never appear.

### Story 3.4: Measure and Safely Activate an Optional Discovery Cache
**Requirements:** PRD-072, PRD-075, PRD-083; UX-DR02, UX-DR14.

As a Browse user,
I want database-backed results to remain correct and fast enough,
So that caching is introduced only when evidence shows net benefit and can never mislead me.

**Acceptance Criteria:**

**Given** the PostgreSQL Browse baseline with measured query plans, query count, p95/p99 latency, load, payload, and database saturation
**When** targets pass or an accountable operator activates the cache against an identified threshold breach/resilience failure mode
**Then** disabled cache uses PostgreSQL only; activated shared cache contributes only stable public/coarse fields under complete resource/query/policy identity and records hit/miss, regeneration, overlay cost, errors, and disable evidence
**And** one batched PostgreSQL read still verifies current revision, phase, visibility/policy qualification, capacity/availability, and activation, discarding/rebuilding disqualified entries before emitting supply/actions; no measured net benefit or any privacy/freshness regression disables the adapter.

### Story 3.5: Open Current Listing and Request Details Safely
**Requirements:** PRD-013, PRD-057, PRD-075, PRD-082–083; UX-DR01–02, UX-DR14.

As a guest or member,
I want details and actions matched to my relationship,
So that I can continue without private-data or action leakage.

**Acceptance Criteria:**

**Given** a current, stale, unavailable, private, or unsupported resource projection
**When** its detail route is requested
**Then** the server returns the registered purpose-specific envelope with zero or one primary action and safe omission/recovery
**And** guessed private identifiers, unsupported schema versions, and stale action intents cannot reveal or mutate commercial state.

## Epic 4: Form an Ordinary Agreement and Complete the Promised Work

Participants form one ordinary Order through the sole atomic seam and execute registered Work separately from payment.

### Story 4.1: Submit a Direct Agreement Proposal
**Requirements:** PRD-017, PRD-020–021, PRD-023, PRD-063–064, PRD-075, PRD-084; UX-DR10–11, UX-DR14.

As a buyer or provider,
I want to start Direct Booking, Quote acceptance, or online Quick Deal with exact terms,
So that the other party can review a bounded proposal before agreement.

**Acceptance Criteria:**

**Given** a current Listing or online Quick Deal source
**When** an authorized party submits an idempotent proposal
**Then** the proposal pins source, parties, amount/lane, Work specification, capacity intent, policy, and expiry without creating required Work or Obligations
**And** offline, stale, unsupported, self-dealing, or dual-party Agent authority fails with no irreversible effect.

### Story 4.2: Finalize One Complete Ordinary Order
**Requirements:** PRD-017, PRD-024, PRD-031–032, PRD-063–064, PRD-075; UX-DR10–11, UX-DR14.

As an agreeing participant,
I want acceptance to create the whole agreement once,
So that no partial Order can masquerade as success.

**Acceptance Criteria:**

**Given** an exact current accepted source and expected versions
**When** `FinalizeOrderAgreement` runs
**Then** one fixed-lock PostgreSQL transaction creates accepted Order, parties, immutable terms, required Work, one-lane Obligations, committed reservations, audit, idempotency result, and outbox
**And** any stale source, policy, capacity, party, child, or constraint failure commits none of those effects.

### Story 4.3: Execute A1 Linear Project Work
**Requirements:** PRD-025, PRD-031, PRD-046, PRD-064, PRD-075; UX-DR12, UX-DR14.

As an accountable provider and buyer,
I want bounded project progress and completion evidence,
So that delivery truth is visible without changing payment truth.

**Acceptance Criteria:**

**Given** an accepted A1 Work Instance
**When** authorized progress, evidence, completion proposal, sign-off, concern, cancellation, or amendment events occur
**Then** guarded append-only transitions preserve the accepted manifest and current version
**And** payment reports cannot complete Work and material structure changes require accepted terms amendment.

### Story 4.4: Execute A3 Appointment Work
**Requirements:** PRD-026, PRD-031, PRD-046, PRD-062, PRD-064, PRD-075; UX-DR12, UX-DR14.

As an appointment participant,
I want scheduling, rescheduling, attendance, no-show, and outcome recorded,
So that the service window and completion result remain attributable.

**Acceptance Criteria:**

**Given** an accepted A3 Work Instance and committed slot
**When** either party performs a permitted appointment transition
**Then** timezone, notice, expected version, actor, evidence, and capacity consequences are explicit
**And** concurrent booking, stale reschedule, or unsupported completion is rejected without losing the current appointment.

### Story 4.5: Execute A4 Handoff and Purchase-on-Behalf Work
**Requirements:** PRD-027–028, PRD-031–032, PRD-046, PRD-064, PRD-075; UX-DR12, UX-DR14.

As a handoff participant,
I want custody, quantity/condition, receipt, and reimbursement terms recorded separately,
So that transfer evidence does not imply payment settlement.

**Acceptance Criteria:**

**Given** an accepted A4 Work Instance
**When** handoff, custody, condition, receipt, failure, or purchase-on-behalf events are submitted
**Then** bounded evidence and acknowledgements advance only valid Work transitions
**And** reimbursement remains a separate Payment Obligation and cannot be inferred from receipt.

### Story 4.6: Execute A9 Digital Delivery Work
**Requirements:** PRD-029, PRD-031, PRD-037, PRD-046, PRD-064, PRD-075; UX-DR12, UX-DR14.

As a digital-delivery participant,
I want private artifact delivery, review, bounded revision, and acceptance,
So that completion is proven without exposing the artifact publicly.

**Acceptance Criteria:**

**Given** an accepted A9 Work Instance
**When** a provider delivers or revises an artifact and the buyer reviews it
**Then** access-controlled evidence, version lineage, review deadline, acceptance, concern, and completion transitions are retained
**And** a message, file upload, or payment report alone cannot mutate accepted scope or complete Work.

## Epic 5: Source a Need Through Public Bidding

Citizens publish Open Tenders, providers submit private versioned Bids, and selection atomically forms an ordinary Order.

### Story 5.1: Publish an Open Public-Bidding Request
**Requirements:** PRD-018–019, PRD-061, PRD-069, PRD-075, PRD-077, PRD-079, PRD-081, PRD-084; UX-DR03–04, UX-DR14.

As a citizen requester,
I want to publish a governed Open Tender,
So that eligible providers can respond to a clear need.

**Acceptance Criteria:**

**Given** a valid Request draft and source Work specification, an exact active `category_versions` sourcing policy, and current matching `capability_activations`
**When** the requester reviews and publishes `open_tender`
**Then** the transaction locks policy and every matching activation row; verifies checksum, no deny, effective evidence, response/rate/revision/alternative, expiry/selection, and geography/category liquidity rules; and pins mode, source/policy version, winning activation ID, complete decision fingerprint, budget, scope, deadlines, safety, and visibility
**And** absent/expired/incompatible/failed gate evidence, a changed fingerprint, or any applicable deny creates no open Request; Payment policy/free JSON cannot substitute, Work timing remains separate, mode cannot change, and public projection exposes no Bid terms, identities, rankings, or counts.

### Story 5.2: Submit an Exact Open Bid
**Requirements:** PRD-018–019, PRD-063–064, PRD-075, PRD-077–079, PRD-084; UX-DR05–06, UX-DR12, UX-DR14.

As an eligible provider,
I want to submit one structured Bid version,
So that the requester can compare my exact offer later.

**Acceptance Criteria:**

**Given** an open Request whose pinned `category_versions` sourcing policy remains compatible and whose current matching `capability_activations` contain no deny, plus current provider eligibility
**When** a draft Quote is validated and submitted
**Then** the transaction locks the Request/policy and matching activations, verifies the stored/current decision fingerprint and policy limits, and creates one immutable `submitted` Bid revision pinning Request/provider/source/catalog/Work/lane/schedule/validity/policy facts with an attributable receipt
**And** competitors learn no term, identity, rank, or count; changed/absent/expired/denied activation, duplicate/replay, over-limit, ineligible, stale, or late submission creates no active version and returns bounded retry/support behavior.

### Story 5.3: Revise or Withdraw an Open Bid
**Requirements:** PRD-019, PRD-075, PRD-078–080; UX-DR05–06, UX-DR14.

As a bidder,
I want to revise with a diff or withdraw explicitly,
So that history remains trustworthy and only one current version can be selected.

**Acceptance Criteria:**

**Given** the bidder's current submitted lineage before close
**When** they revise or withdraw
**Then** revision inserts the next immutable version and supersedes the prior row, while withdrawal terminalizes that lineage
**And** duplicate, stale, cross-provider, over-alternative, or post-close commands have no effect.

### Story 5.4: Close Bidding and Open Selection
**Requirements:** PRD-054, PRD-068–069, PRD-075, PRD-077, PRD-079; UX-DR07, UX-DR14.

As a requester or scheduler,
I want response closure to produce one unambiguous selection phase,
So that no implementation has a closed-but-uncertain reveal window.

**Acceptance Criteria:**

**Given** an open or paused Tender at deadline or an authorized policy-safe early close
**When** `close_bidding` commits
**Then** one transaction freezes submissions, pins/increments reveal policy, enters `selection_open`, invalidates affected projections, writes audit, and emits one committed event
**And** it selects no winner and retries idempotently.

### Story 5.5: Compare Current Open Bids
**Requirements:** PRD-019, PRD-075, PRD-078–079; UX-DR06, UX-DR10, UX-DR14.

As a requester,
I want to compare only current eligible Bid versions,
So that I can make an informed decision without automatic cheapest-wins logic.

**Acceptance Criteria:**

**Given** an Open Tender in `selection_open`
**When** the requester opens comparison
**Then** complete comparable current versions, source provenance, validity, scope, amount, schedule, Work, and lane meaning are shown
**And** superseded/withdrawn/expired/ineligible versions cannot be selected and losing terms remain private outside authorized requester views.

### Story 5.6: Select and Atomically Finalize a Bid
**Requirements:** PRD-019, PRD-044, PRD-063, PRD-075, PRD-078–080; UX-DR10–11, UX-DR14.

As a requester,
I want one confirmation to award a current Bid and create the ordinary Order,
So that success cannot exist without the complete agreement.

**Acceptance Criteria:**

**Given** a selection-ready current Quote in `selection_open`
**When** UI action `quote.select_and_finalize` dispatches `SelectAndFinalizeBid` (`select_and_finalize_bid`)
**Then** the sole `FinalizeOrderAgreement` transaction locks/revalidates Tender, exact Quote, parties, policy, capacity, and versions and commits selection, Order graph, award, competing-lineage consequences, audit, idempotency, and outbox together
**And** any conflict preserves comparison state, creates no durable selection/partial Order, and reports the exact safe recovery.

### Story 5.7: Expire or Recover an Unfulfilled Tender
**Requirements:** PRD-044, PRD-054, PRD-068–069, PRD-075, PRD-077; UX-DR14.

As a requester or operator,
I want overdue or failed Tender transitions handled visibly,
So that a Request never remains falsely actionable.

**Acceptance Criteria:**

**Given** a response/selection deadline, failed job, or no valid selection
**When** the scheduler or authorized recovery invokes the guarded transition
**Then** synchronous deadline guards and idempotent jobs close/retry or mark unfulfilled without bypassing policy
**And** job health, replay, notification intent, history, re-request path, and support recovery are attributable.

## Epic 6: Source Privately Through Sealed or Direct Invite Bidding

Citizens use privacy-preserving modes without creating a parallel agreement model.

### Story 6.1: Publish and Participate in a Sealed Tender
**Requirements:** PRD-019, PRD-075, PRD-077, PRD-079; UX-DR07, UX-DR14.

As a requester or eligible bidder,
I want Sealed Bidding to conceal participation until selection opens,
So that pre-close response signals cannot influence parties.

**Acceptance Criteria:**

**Given** a valid `sealed_tender` draft or schedule and a current reverse-bidding activation/abuse policy
**When** the requester publishes and eligible bidders view or submit before `selection_open`
**Then** mode/deadlines/exact category sourcing-policy version/winning activation/decision fingerprint pin, the Request enters `open`, and a bidder sees only their own lineage/submission result while requester, competitors, and public receive no other existence, identity, term, timing, ordering, error, or count signal
**And** failed publication creates no open Request, every channel preserves the same privacy boundary, any requester disposition command before committed `selection_open` receives uniform no-effect denial without a notice, and Sealed copy makes no cryptographic claim.

### Story 6.2: Reveal Sealed Bids Through the Atomic Close Transition
**Requirements:** PRD-054, PRD-068–069, PRD-075, PRD-077, PRD-079; UX-DR07, UX-DR14.

As a requester,
I want Bid comparison unlocked by one committed close/reveal,
So that privacy has one executable boundary.

**Acceptance Criteria:**

**Given** an open or paused Sealed Tender
**When** guarded `close_bidding` commits
**Then** submissions freeze, reveal policy pins, phase becomes `selection_open`, relevant projections invalidate, and requester comparison becomes available atomically
**And** failed/retried close cannot expose a partial reveal or award a winner.

### Story 6.3: Create and Deliver an Exact Direct Invite
**Requirements:** PRD-044, PRD-054, PRD-068, PRD-071–072, PRD-075, PRD-077, PRD-079–080; UX-DR08–09, UX-DR14.

As a requester,
I want to invite a specific provider privately,
So that only that provider can receive, view, and respond to the Request.

**Acceptance Criteria:**

**Given** a valid `direct_invite` draft or schedule, an exact active `category_versions` sourcing policy, current matching `capability_activations`, and at least one eligible provider
**When** the requester invokes the Direct Invite publication command
**Then** one transaction locks policy/activations, pins mode/deadlines/policy checksum/winning activation/complete decision fingerprint, creates at least one current `direct_invite_bid` invitation with exact Request/provider/purpose version and non-null expiry, moves the Request to `open`, and commits audit/outbox plus canonical `pending` notification intents—or commits none
**And** the established pre-Messaging notification transport revalidates the recipient and applies its exact intent/attempt lifecycle, deduplication, bounded retry/backoff, delivery evidence, dead-letter/new-generation support replay, and non-enumerating content; delivery failure never rolls back or falsely acknowledges the invitation.

### Story 6.4: Decline or Submit Under the Exact Invitation
**Requirements:** PRD-054, PRD-071, PRD-075, PRD-078–080; UX-DR08–09, UX-DR14.

As an invited provider,
I want to decline or submit an exact Bid,
So that invitation intent is not mistaken for commercial agreement.

**Acceptance Criteria:**

**Given** the exact sent/viewed current invitation
**When** the provider declines or submits a valid Direct Invite Bid
**Then** decline terminalizes participation, while valid submission atomically accepts that invitation and creates the immutable Quote revision linked by exact Request/provider/purpose
**And** synchronous expiry/revocation/wrong purpose/wrong provider returns one non-enumerating denial with no Bid.

### Story 6.5: Award a Direct Invite Bid Without Leaking Alternatives
**Requirements:** PRD-063, PRD-071, PRD-075, PRD-078–080; UX-DR08–11, UX-DR14.

As a requester,
I want to finalize one current invited Bid,
So that private sourcing still creates an ordinary Order safely.

**Acceptance Criteria:**

**Given** `selection_open`, a current exact Bid, and its current unexpired accepted invitation
**When** `SelectAndFinalizeBid` runs
**Then** the transaction locks and revalidates that exact invitation plus all ordinary formation facts and commits all-or-none
**And** nonparticipants receive only status-safe disclosure, losing terms remain private, and initial activation enforces one active alternative and mandatory nodes only.

## Epic 7: Coordinate a Multi-Need Deal Without Merging Child Truth

Coordinators manage dependencies while every Need that enters execution is backed by one isolated ordinary Order.

### Story 7.1: Author a Deal Chain and Ordered Needs
**Requirements:** PRD-022, PRD-061, PRD-069, PRD-075–076, PRD-084; UX-DR13–14.

As a coordinator,
I want to build a Deal Chain from governed recipes or a blank plan,
So that a multi-Need outcome has explicit accountable units.

**Acceptance Criteria:**

**Given** current catalogs and acting authority
**When** the coordinator creates a Chain and adds/reorders Need drafts
**Then** each Need pins category/capability/Work/source versions, desired mechanism, readiness, and responsible context under CAS
**And** the parent owns coordination only and cannot define pooled money or child liability.

### Story 7.2: Add Acyclic Need Dependencies
**Requirements:** PRD-022, PRD-068–069, PRD-075–076; UX-DR13–14.

As a coordinator,
I want explicit same-Chain dependency edges,
So that blocked, ready, handoff, branch, and replacement meaning is enforceable.

**Acceptance Criteria:**

**Given** two Needs in the same Deal Chain
**When** a dependency is added, removed, or superseded
**Then** relational same-Chain guards and cycle detection commit one valid active edge or none
**And** invalid cross-Chain, self, duplicate, or cyclic edges explain the correction without mutating child truth.

### Story 7.3: Source a Need Through the Chosen Mechanism
**Requirements:** PRD-022, PRD-063, PRD-075–076, PRD-084; UX-DR13–14.

As a coordinator,
I want each Need to use Listing, Request/Quote, or invitation sourcing,
So that the Chain reuses ordinary marketplace contracts.

**Acceptance Criteria:**

**Given** a ready Need
**When** a supported sourcing mechanism is chosen
**Then** the source retains exact Chain/Need lineage and follows its normal Listing/Request/Quote/invitation privacy and version rules
**And** no parallel bid, Work, payment, or acceptance model is introduced.

### Story 7.4: Invite a Deal Partner Under a Distinct Purpose
**Requirements:** PRD-022, PRD-071, PRD-075–076; UX-DR13–14.

As a coordinator,
I want to invite a provider to one exact Need,
So that they can accept, counter, decline, or proceed without seeing sibling-private facts.

**Acceptance Criteria:**

**Given** an eligible provider and current Need
**When** a Deal Invitation is issued or answered
**Then** the projection relationship is `INVITED_PARTNER`, exact Chain/Need/purpose/expiry is enforced, and only relevant dependency facts are shown
**And** the Direct Invite Request rule requiring an exact Bid applies only when the Need explicitly uses that Tender mechanism.

### Story 7.5: Form One Isolated Child Order
**Requirements:** PRD-022, PRD-063–064, PRD-075–076; UX-DR10–14.

As a coordinator and provider,
I want accepted Need terms to form one ordinary child Order,
So that the Deal Chain cannot bypass bilateral formation.

**Acceptance Criteria:**

**Given** one ready Need with explicit party/terms acceptance
**When** child formation invokes `FinalizeOrderAgreement`
**Then** the complete ordinary Order graph commits atomically with exact Chain/Need lineage and at most one active child per Need
**And** parties, terms, Work, Obligations, disputes, cancellation, replacement, and liability remain isolated from parent and siblings.

### Story 7.6: Derive Chain Progress and Recover a Failed Need
**Requirements:** PRD-022, PRD-054, PRD-068, PRD-075–076; UX-DR13–14.

As a coordinator or operator,
I want derived rollups and explicit replacement/recovery,
So that one blocked child does not rewrite or falsely complete the Chain.

**Acceptance Criteria:**

**Given** child lifecycle events or a failed/cancelled Need
**When** the Chain projection or recovery command runs
**Then** readiness, progress, cost, blocked reason, partial completion, and replacement lineage derive from current child facts
**And** recovery appends coordination state only and never mutates another child's Order, Work, Obligation, evidence, or dispute.

## Epic 8: Prove Fulfillment, Record Off-Platform Payment, and Recover Safely

Participants preserve evidence, payment, completion, review, dispute, and safety truth as separate accountable states.

### Story 8.1: Record External Cash Honestly
**Requirements:** PRD-032–034, PRD-042–043, PRD-075; UX-DR14.

As an Order participant,
I want to declare cash requested, paid, received, or disputed,
So that the platform records claims without claiming custody or collection.

**Acceptance Criteria:**

**Given** an External Cash Obligation
**When** authorized payer/provider declarations or corrections occur
**Then** append-only events preserve separate claims, amount/currency, actor, evidence, mismatch, and current derived status
**And** the platform reports zero cash commission/GMV collected and never completes Work or promises automatic refund.

### Story 8.2: Record External Digital Proof
**Requirements:** PRD-032, PRD-035–037, PRD-042–043, PRD-071, PRD-075; UX-DR14.

As an Order participant,
I want to submit private digital payment evidence,
So that a provider can confirm, reject, or dispute it without false verification.

**Acceptance Criteria:**

**Given** an External Digital Proof Obligation
**When** evidence is uploaded and reviewed
**Then** quarantine/access/retention controls and claimed/confirmed/rejected/disputed states are enforced with immutable corrections
**And** receipt upload alone is labeled unverified, does not settle protected money, and cannot complete Work.

### Story 8.3: Complete Work and Leave a Supported Review
**Requirements:** PRD-031, PRD-046–047, PRD-075; UX-DR14.

As a buyer or provider,
I want completion sign-off and review eligibility tied to real interaction,
So that reputation reflects attributable marketplace history.

**Acceptance Criteria:**

**Given** required Work evidence and lifecycle state
**When** completion is proposed, confirmed, disputed, or review is submitted
**Then** shape-specific guards, actor, version, evidence, deadline, and one-review policy are enforced
**And** payment status neither preselects completion nor permits unsupported reviews.

### Story 8.4: Open a Dispute and Apply Scoped Holds
**Requirements:** PRD-037, PRD-048–049, PRD-053, PRD-055, PRD-073, PRD-075; UX-DR14.

As an affected participant or authorized operator,
I want a dispute to preserve evidence and block only unsafe effects,
So that recovery remains possible without rewriting history.

**Acceptance Criteria:**

**Given** an eligible Order/Work/Obligation and evidence
**When** a dispute, response, decision, appeal, or scoped hold command is submitted
**Then** append-only events, exact affected aggregates/effects, retention holds, maker/checker where required, and attributable notifications are recorded
**And** unrelated reads/support/reconciliation/refund recovery remain available and no automatic cash refund is promised.

### Story 8.5: Report Safety, Block, and Reach Support
**Requirements:** PRD-050–051, PRD-071, PRD-075; UX-DR14.

As a community member,
I want to report risk, block contact, and reach a human recovery path,
So that unsafe interaction can stop without losing evidence.

**Acceptance Criteria:**

**Given** an authenticated or safely reportable context
**When** block, report, incident, or support-case intake occurs
**Then** private evidence, severity, purpose access, relationship consequences, meeting guidance, response ownership, and audit are preserved
**And** public/private denials remain non-enumerating and urgent paths never depend on Messaging availability.

## Epic 9: Operate, Measure, Disable, and Recover the Marketplace

Operators can prove current truth, recover ordered work, activate narrowly, restore data, and report honest outcomes.

### Story 9.1: Inspect Cause, Lineage, and Current State
**Requirements:** PRD-052–053, PRD-075; UX-DR14.

As an authorized operator,
I want purpose-scoped inspection across aggregates and events,
So that I can diagnose without editing history or exposing unrelated private data.

**Acceptance Criteria:**

**Given** a support, incident, reconciliation, or audit purpose
**When** an operator opens an aggregate trace
**Then** current version/state, source lineage, actor/acting-for, correlation/causation, audit, outbox/inbox, holds, and safe recovery actions are shown
**And** sensitive reads are scope-checked/audited and no projection grants mutation authority.

### Story 9.2: Prove Ordered Asynchronous Recovery and Essential Notices
**Requirements:** PRD-044, PRD-054, PRD-068, PRD-072, PRD-075; UX-DR14.

As an operator,
I want production-shaped proof of ordered event recovery and essential notice delivery,
So that asynchronous work cannot regress, invent business effects, or silently strand a structured journey before Messaging exists.

**Acceptance Criteria:**

**Given** the established transport and repeated, reordered, missing, poison, unsupported, or notification-bearing events
**When** consumers run or an operator replays and recovers them under production-shaped failure
**Then** inbox deduplication and per-aggregate ordering ignore duplicates, park gaps/unknown versions, expose health, and replay idempotently; essential notices retain purpose-safe content, current recipient relationship, retry/backoff, delivery evidence, and dead-letter/support recovery
**And** jobs never repair required children after nominal success, bypass synchronous guards, leak Sealed/Direct Invite facts, or treat notification delivery as business success.

### Story 9.3: Rehearse Capability Cutover and Emergency Disablement
**Requirements:** PRD-055, PRD-060, PRD-069, PRD-073, PRD-075; UX-DR14.

As an accountable operator,
I want production-shaped proof of the established activation command,
So that concurrent cutover, expiry, and emergency containment remain recoverable under load and failure.

**Acceptance Criteria:**

**Given** the Story 2.3 activation authority, active exact slices, queued work, and stale/concurrent operator commands
**When** enable, deny, expiry, incident disablement, retry, and recovery scenarios run
**Then** non-overlapping temporal cutover, any-deny precedence, most-specific enable attribution, stale no-effect behavior, and web/worker rechecks are observed under concurrency
**And** rollback owner, expiry, incident/maker-checker evidence, audit/outbox ordering, metrics/alerts, and safe reads/recovery remain available without mutating prior decision history.

### Story 9.4: Rehearse Canonical Migration and Data Restore
**Requirements:** PRD-058, PRD-060, PRD-072, PRD-075, PRD-083; UX-DR14.

As an operator,
I want production-shaped schema and data recovery rehearsal,
So that activation is based on observed data integrity rather than documents alone.

**Acceptance Criteria:**

**Given** the canonical 61-table schema and production-shaped data volume
**When** forward migration, in-place backfill, rollback/roll-forward, backup restore, and integrity verification are rehearsed
**Then** lock/runtime observations, checksums, constraints, retained history, and measured RPO/RTO satisfy the activation gate
**And** mixed-version and failed-migration behavior has one accountable recovery path without destructive assumptions.

### Story 9.5: Prove Runtime Disablement and Dependency Degradation
**Requirements:** PRD-054, PRD-060, PRD-072, PRD-075, PRD-083; UX-DR02, UX-DR14.

As an operator,
I want production-shaped process and dependency failure rehearsal,
So that the marketplace fails truthfully and recovers without inventing business effects.

**Acceptance Criteria:**

**Given** activated web, worker, scheduler, PostgreSQL, and optional cache capabilities
**When** cache loss, worker loss, scheduler delay, graceful shutdown, replay, and capability disablement are rehearsed
**Then** liveness/readiness, degradation, retry/dead-letter health, replay safety, and accountable runbooks satisfy the activation gate
**And** discovery-cache failure falls back to PostgreSQL while required session/queue/database failures remain separately truthful and fail closed where required.

### Story 9.6: Measure Genuine Marketplace Outcomes
**Requirements:** PRD-056–057, PRD-059, PRD-075; UX-DR14.

As a founder or operator,
I want cohort and funnel metrics tied to accepted truth,
So that pilot decisions do not count demos, duplicates, or uncollected money.

**Acceptance Criteria:**

**Given** classified production, pilot, sandbox, training, and synthetic activity
**When** marketplace metrics are computed
**Then** supply, Requests, Bids, accepted Orders, Work outcomes, disputes, and payment declarations use deduplicated attributable definitions
**And** sandbox/synthetic events are excluded, cash/digital proof is not reported as platform revenue, and every metric links to its definition/version.

## Epic 10: Communicate Within Settled Marketplace Boundaries

Messaging begins only after the pre-messaging gate and derives membership/privacy from settled commercial relationships.

### Story 10.1: Open a Purpose-Bound Conversation
**Requirements:** PRD-045, PRD-071, PRD-075; UX-DR15.

As an authorized marketplace participant,
I want a conversation tied to an exact resource and purpose,
So that membership cannot drift beyond the commercial relationship.

**Acceptance Criteria:**

**Given** a current Listing inquiry, Request/Bid, Order/Work, dispute, or support relationship after the pre-messaging gate
**When** a conversation is created or reopened
**Then** exact participants, Owner/Agent context, resource/version, purpose, privacy/data class, retention, moderation, and membership policy are pinned
**And** unrelated, revoked, expired, self-conflicted, or guessed contexts receive no conversation existence.

### Story 10.2: Exchange Attributable Messages
**Requirements:** PRD-045, PRD-068, PRD-071, PRD-075; UX-DR15.

As a conversation participant,
I want to send and receive attributable messages and attachments,
So that context is preserved without changing structured commercial terms.

**Acceptance Criteria:**

**Given** current membership and purpose authorization
**When** a message is sent, retried, edited where policy allows, removed, or reported
**Then** sequence, sender/acting-for, idempotency, delivery state, private evidence controls, moderation, and retention are enforced
**And** message text or attachment never mutates a Bid, accepted terms, Work, payment, consent, dispute, or award.

### Story 10.3: Deliver Attributable Messaging Notifications
**Requirements:** PRD-044–045, PRD-054, PRD-068, PRD-071, PRD-075; UX-DR15.

As a conversation participant,
I want notifications for authorized conversation activity,
So that I can respond without treating delivery or message content as structured commercial truth.

**Acceptance Criteria:**

**Given** a committed conversation event and current membership/purpose policy
**When** the established notification transport attempts in-app/SMS/email delivery
**Then** purpose-safe preview content, current recipient membership, locale, deduplication, preference/mandatory override, retry, and delivery evidence are applied
**And** delivery failure does not undo message or business state, revoked membership suppresses future delivery, and no preview leaks Sealed/Direct Invite or attachment content.

### Story 10.4: Recover from Messaging Abuse or Failure
**Requirements:** PRD-045, PRD-050, PRD-054–055, PRD-071, PRD-075; UX-DR14–15.

As a participant or operator,
I want block, report, moderation, export, and recovery behavior,
So that communication failure cannot trap a commercial journey.

**Acceptance Criteria:**

**Given** abuse, unavailable delivery, revoked membership, retention hold, or support escalation
**When** the governed action occurs
**Then** access is contained, evidence and audit are retained, exports are purpose-scoped, and alternate structured/support actions remain visible
**And** Order/Work/Obligation/dispute state stays usable without Messaging.

## Epic 11: Demonstrate Connected Money Without Claiming Live Authority

Capstone users exercise provider-neutral sandbox payment flows with balanced accounting and permanent non-live labeling.

### Story 11.1: Run a Reconciled Direct Digital Sandbox Payment
**Requirements:** PRD-038, PRD-042–043, PRD-070, PRD-072, PRD-074–075.

As a capstone participant,
I want to simulate provider-neutral direct digital payment,
So that provider, obligation, ledger, failure, and reconciliation truth can be demonstrated without live-money claims.

**Acceptance Criteria:**

**Given** sandbox-only activation and a Direct Digital Obligation
**When** a payment intent and authenticated provider event are processed
**Then** exact business binding, replay protection, idempotency, pending/succeeded/failed state, one immutable balanced minor-unit transaction per accepted money effect, and three-way Obligation/provider/ledger reconciliation commit together or no success commits
**And** mismatch is contained visibly, permanent sandbox labeling remains, and no live credentials, payout authority, or Work completion effect exists.

### Story 11.2: Run a Reconciled Tiwala Protected-Payment Sandbox
**Requirements:** PRD-039–041, PRD-048, PRD-055, PRD-070, PRD-073–075.

As a capstone participant,
I want to simulate protected funding and release,
So that guarded release behavior can be evaluated without custody claims.

**Acceptance Criteria:**

**Given** sandbox Tiwala activation, a protected Obligation, and the proven balanced-posting/reconciliation boundary
**When** funding, mismatch, hold, dispute, or release events occur
**Then** provider authenticity, expected amount/currency/reference, Work/acceptance condition, hold/dispute guards, exact approval, idempotency, balanced posting, and reconciliation-before-release are enforced atomically
**And** Order creation never starts a release clock, an unbalanced or unreconciled effect cannot succeed, and UI remains permanently non-live.

### Story 11.3: Inspect and Correct Provider-Neutral Accounting
**Requirements:** PRD-038–040, PRD-043, PRD-070, PRD-073–075.

As a financial operator,
I want to inspect every sandbox money effect and post explicit corrections,
So that provider events and internal financial truth remain attributable without rewriting history.

**Acceptance Criteria:**

**Given** Obligation, provider, and balanced ledger states from a sandbox effect
**When** an authorized operator inspects or corrects a missing, duplicate, or amount/currency mismatch
**Then** immutable entries, provider/business lineage, reconciliation state, holds, maker/checker, and a balanced append-only compensating transaction are enforced
**And** failed correction commits no business success or partial ledger and never edits the original posting.

### Story 11.4: Refund, Reverse, and Recover a Sandbox Effect
**Requirements:** PRD-040, PRD-043, PRD-048–049, PRD-055, PRD-070, PRD-073–075.

As a financial operator,
I want explicit sandbox refund, reversal, and recovery paths,
So that downstream corrections remain visible, balanced, and recoverable.

**Acceptance Criteria:**

**Given** a reconciled or mismatched sandbox effect and current holds/disputes
**When** a refund, reversal, retry, or recovery decision occurs
**Then** effect-specific authorization, append-only balanced adjustments, provider reference, idempotency, retry containment, and resolution evidence are recorded
**And** only independently approved activation can ever promote a future live adapter.

## Epic 12: Connect Owner-Scoped Apps and Exact-Approval Automation

Owners use revocable scoped integrations; automation never gains independent commercial authority.

### Story 12.1: Issue and Revoke an Owner-Scoped Integration Client
**Requirements:** PRD-065, PRD-069, PRD-072–073, PRD-075.

As an Owner,
I want scoped credentials for an external app,
So that it can act only within my current authority.

**Acceptance Criteria:**

**Given** a ready Owner and activated integration capability
**When** a client/credential is issued, rotated, reduced, suspended, revoked, or archived
**Then** selector-plus-hash/secret-reference, environment/audience, immutable granted scopes, current restrictive owner policy, overlap expiry, and attribution are enforced
**And** client scope can only reduce Owner/resource policy and never reveal another Owner's data.

### Story 12.2: Use a Versioned Owner-Scoped API
**Requirements:** PRD-066, PRD-069, PRD-072–073, PRD-075.

As an integration developer,
I want versioned owner-scoped reads and commands,
So that API access remains safe, attributable, and compatible.

**Acceptance Criteria:**

**Given** current client credentials and Owner-scoped mappings
**When** an API command or cursor read occurs
**Then** scope, Owner, resource/version, idempotency, rate limit, bounded pagination, payload contract, and stable error semantics are enforced
**And** revocation or activation deny blocks requests immediately without cross-owner mappings or compatibility ambiguity.

### Story 12.3: Deliver Secure Recoverable Webhooks
**Requirements:** PRD-068–069, PRD-072–073, PRD-075.

As an integration developer,
I want signed ordered webhooks with explicit recovery,
So that external synchronization can tolerate duplicate and failed delivery.

**Acceptance Criteria:**

**Given** a current Owner-scoped subscription and an outbox event
**When** endpoint verification or a delivery attempt occurs
**Then** signatures, timestamps, payload versions, stable delivery IDs, DNS/IP/redirect SSRF checks, bounded timeout/retry/backoff/jitter, per-subscription ordering, dead-letter state, and replay are enforced
**And** revocation or activation deny blocks worker effects immediately while delivery diagnostics reveal no cross-owner data or secret.

### Story 12.4: Require Exact Human Approval for AI Commands
**Requirements:** PRD-067, PRD-069, PRD-073, PRD-075.

As an Owner using automation,
I want AI output limited to drafts and exact approval requests,
So that no model can independently create binding or sensitive effects.

**Acceptance Criteria:**

**Given** an AI-drafted command
**When** it targets publication, agreement, consent, identity, dispute, evidence, or money
**Then** the same application port revalidates current actor/client/Owner/resource/policy/activation and consumes one exact payload/target/version approval where required
**And** general consent, prior conversation, or model confidence never substitutes for explicit authority.
