# Serbizyu 2.0 — Rebuilt Architecture Decision Record Catalog

Status: CANONICAL ADR AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; implementation remains bounded by story/G3/G6 gates
BMAD phase: Phase 3 — Architecture decisions
Inputs:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`

These rebuilt ADRs are canonical. Historical ADR numbers remain evidence only unless explicitly adopted below.

## ADR-R-001 — Recovery source-of-truth hierarchy

Status: Accepted for rebuild

Context: Historical files conflict and generated-looking outputs were treated as authoritative without ceremony evidence.

Decision:

1. Founder-approved control artifacts govern recovery process and contradiction disposition.
2. Rebuilt BMAD artifacts govern product/domain/technical behavior after approval.
3. Research supports decisions but does not become product policy automatically.
4. Historical outputs remain preserved and labeled historical/superseded.
5. Fresh readiness audit is generated last.

Consequences: downstream artifacts must cite upstream inputs; duplicate source files cannot silently compete.

## ADR-R-002 — Tagudin-first validation boundary

Status: Accepted for rebuild

Decision: Initial genuine validation is Tagudin-only. Candon and other geography appear only as historical/research context until a new geography gate passes.

Consequences: location filters, metrics, safety operations, and pilot stories use Tagudin. This does not prevent future geography extension.

## ADR-R-003 — Three-plane product strategy

Status: Accepted for rebuild

Decision: Separate capstone demonstration, Tagudin validation, and startup foundation. Sandbox and team activity cannot count as genuine market evidence.

Consequences: every capability and metric has a plane/status; technical demo success cannot be reported as adoption.

## ADR-R-004 — Orthogonal taxonomy dimensions

Status: Accepted for rebuild

Decision: Listing type, transaction mechanism, work shape, payment obligation/lane, access tier, and category/safety class remain separate dimensions.

Consequences: no universal “archetype” enum may hide quote, dispatch, payment, or safety semantics. A7 quote and A8 emergency are normalized as mechanism/policy overlays rather than identical fulfillment shapes.

## ADR-R-005 — Shared Order and Work separation

Status: Accepted for rebuild

Decision: Order captures accepted commercial/relationship terms. Work Instance captures fulfillment execution. They have separate state machines and events.

Consequences: payment confirmation cannot complete Work; work completion cannot silently settle payment.

## ADR-R-006 — Payment Obligation as accounting boundary

Status: Accepted for rebuild

Decision: Deposits, milestones, final balances, approved reimbursements, purchase budgets, and service/protection fees are Payment Obligations. One obligation uses one lane initially.

Consequences: an Order may have multiple obligations without forcing one payment mode across all work. Mixed tender within one obligation is deferred.

## ADR-R-007 — Four explicit payment lanes

Status: Accepted for rebuild; production connected lanes gated

Decision: Use exactly:

- External Cash
- External Digital Proof
- Direct Digital
- Tiwala Protected Digital

Consequences: UI, schema, events, reports, and support must identify lane. Direct Digital cannot be represented as Tiwala.

## ADR-R-008 — Cash-first low-barrier policy

Status: Accepted for capstone and initial Tagudin pilot

Decision:

- External Cash is supported.
- Platform commission is 0% during capstone and initial Tagudin pilot.
- No cash commission receivable is created.
- Serbizyu does not hold cash or promise automatic cash recovery/refund.
- Small practical jobs remain valid.

Consequences: startup viability measures operating cost, repeat value, and future monetization learning rather than invented cash revenue.

## ADR-R-009 — External Digital Proof is evidence, not custody

Status: Accepted for capstone and initial Tagudin pilot

Decision: External Digital Proof records declared/reference/screenshot evidence and counterparty acknowledgment. Provider verification requires a trusted adapter/API. The lane provides no Tiwala guarantee.

Consequences: evidence states, privacy controls, disclaimers, and disputes are required. Screenshots cannot be labeled cleared funds.

## ADR-R-010 — Protected release starts after completion eligibility

Status: Accepted for sandbox; live use gated

Decision: Tiwala Protected Digital release eligibility begins only after authorized Work completion and sign-off/review eligibility. It requires no active dispute, no relevant hold, reconciled amount, policy snapshot, idempotency, and concurrency safety.

Consequences: no release timestamp derived from Order creation; scheduler only discovers candidates and never bypasses guards.

## ADR-R-011 — No unqualified escrow/legal promise

Status: Accepted

Decision: The product must not call Tiwala legal escrow, insurance, or guaranteed recovery until legal/provider/operational gates pass.

Consequences: sandbox UI uses explicit simulation language; live claims require G6 evidence.

## ADR-R-012 — Append-only financial correction

Status: Accepted

Decision: Money events, fee snapshots, releases, refunds, reversals, and ledger entries are append-only and immutable after posting. Corrections create new linked entries.

Consequences: reconciliation and audit are possible; direct balance overwrite is prohibited.

## ADR-R-013 — Double-entry ledger invariant

Status: Accepted for financial implementation

Decision: Posted financial transactions must balance debits and credits by currency. Every provider/payment/refund/release effect links to a source event and idempotency key.

Consequences: micro-refunds, payout fees, reversals, chargebacks, and corrections must be explicitly modeled rather than hidden in a net amount.

## ADR-R-014 — Webhook authenticity and idempotency

Status: Accepted for provider integration

Decision: Provider events require authenticity validation before financial effect, unique provider-event identity, payload/version recording, reconciliation status, and safe duplicate/out-of-order handling.

Consequences: a webhook endpoint alone is insufficient; provider contract and sandbox evidence remain G6 gates.

## ADR-R-015 — Delegated Agent authority

Status: Accepted

Decision: Agents are scoped platform-management/assistance actors. Permission is explicit, revocable, attributable, and auditable. Cash/goods custody is not granted by default.

Consequences: role assignments cannot be a single mutually exclusive role; consent grants and actor attribution are domain/schema requirements.

## ADR-R-016 — Kiosk assisted-access boundary

Status: Accepted as baseline

Decision: Kiosks are assisted access points, not banks, deposits, cash floats, payout operators, or automatic owners.

Consequences: kiosk capability is conditional on training, attribution, consent, support, and safety operations.

## ADR-R-017 — Offline safety boundary

Status: Accepted

Decision: Offline/low-data drafts may be supported only where safe. Cloud/server authority is required for final Order, payment, release, inventory, consent-sensitive, and irreversible transitions.

Consequences: offline Quick Deal and offline payment remain deferred; retry/replay and conflict handling are required for any future sync.

## ADR-R-018 — Sensitive evidence privacy

Status: Accepted

Decision: Government-ID, payment screenshots, and safety evidence use data classification, least privilege, malware scanning, masking/redaction guidance, access logging, retention/deletion, and legal/dispute holds.

Consequences: evidence metadata and retention are schema/operations requirements; public/authenticated caching must not expose sensitive data.

## ADR-R-019 — Generic fulfillment extension points

Status: Accepted

Decision: A1/A3/A4/A9 form the initial work-shape contract. A2/A5/A6/A8/A10 remain future adapters. Pabili uses an A4 extension rather than a bespoke payment system.

Consequences: future expansion requires activation records and does not require rewriting the core Order/Payment Obligation model.

## ADR-R-020 — Canonical schema inventory

Status: Accepted; extended 2026-08-09

Decision: The canonical schema authority is the observed 47-table migrated baseline plus eleven approved initiative additions, for 58 planning tables. It includes bounded Deal-Chaining, real phone OTP, immutable category versions, capacity reservations, owner-scoped integrations, ordered inbox, dimensioned activation, and exact approvals; no pooled finance/custody/offline authority is implied.

Consequences: ERD, migration order, retention, catalog tests, and implementation constraints derive only from `canonical-schema-rebuilt.md`. The old 30/31/38/39/42/46 claims are superseded; any further table requires an accepted schema decision.

## ADR-R-021 — Event/outbox consistency

Status: Accepted

Decision: Critical domain state changes and the outbox intent are committed transactionally. External delivery is retried asynchronously and is not allowed to create duplicate domain effects.

Consequences: workers, failure queues, idempotency, and operations inspection are required before pilot launch.

## ADR-R-022 — Runtime/deployment decisions remain downstream

Status: Accepted process decision

Decision: Laravel/React/SSR/worker/search/realtime/container/edge choices remain technical candidates until product/domain/schema/operations requirements are complete. No deployment dream becomes a product requirement.

Consequences: the architecture artifact must justify each process against actual pilot requirements, choose a minimum supportable runtime, and document alternatives/rollback.

## ADR-R-023 — Anonymous-only edge caching

Status: Accepted security boundary

Decision: Public edge caching may serve only anonymous-safe content. Authenticated, personalized, payment, identity, evidence, and support responses are not publicly cacheable.

Consequences: cache headers, session isolation, SSR behavior, and tests are architecture/security requirements.

## ADR-R-024 — Operational recovery is part of feature readiness

Status: Accepted

Decision: A pilot capability is not ready until failed events, notification retries, webhook reconciliation, holds, support escalation, backups, restore rehearsal, monitoring, and ownership exist for it.

Consequences: Operations stories are not optional post-launch work; readiness cannot pass on functional happy paths alone.

## ADR-R-025 — Configuration is versioned and snapshotted

Status: Accepted

Decision: Fees, subsidies, lane availability, release rules, retention settings, category restrictions, and safety rules are versioned. Confirmed Orders/Obligations snapshot the applicable policy version.

Consequences: later changes cannot rewrite historical economics or protections; configuration changes require audit and owner.

## ADR-R-026 — No automatic pilot monetization claim

Status: Accepted

Decision: Initial Tagudin pilot success does not require platform revenue. Revenue experiments may occur only with explicit founder/legal/commercial approval and transparent economics.

Consequences: scorecards track operating burden, value, repeat, willingness to pay, and future collectibility rather than fake cash commissions.

## ADR-R-027 — Requirement/story/test traceability

Status: Accepted

Decision: Every committed PRD requirement maps to UX, domain/state, schema/ADR implications, owning story, acceptance test, and evidence class.

Consequences: missing traceability blocks readiness; old story counts are not accepted without a mechanical matrix.

## ADR-R-028 — Founder approval and supersession

Status: Accepted process decision

Decision: A rebuilt artifact becomes authoritative only after founder review. Historical artifacts remain preserved and are labeled historical/superseded rather than silently edited into a new meaning.

Consequences: implementation readiness cannot be claimed while only draft replacements exist; approval and propagation are explicit ceremony outputs.

## ADR-R-029 — Deal-Chaining coordination boundary and child-Order isolation

Status: Accepted foundation decision; bounded functional implementation and pilot activation remain separately gated

Context: Founder direction commits Deal-Chaining as a product capability, but historical documents incorrectly coupled it to pooled budgets, parent-wide liability, escrow, offline authority, and aggregate settlement. The core schema also lacked a safe parent/Need/dependency/invitation seam.

Decision:

1. `DealChain` is a coordination aggregate and derived roll-up boundary, not an Order, wallet, escrow, financial account, or parent-wide liability owner.
2. `DealNeed` is one ordered, independently stateful service/product slot. Open Needs reuse existing Request/Quote workflows.
3. `DealDependency` is an explicit same-chain directed `blocks` edge with no self-edge, active-edge duplicates, or cycles. It blocks only named downstream transitions.
4. `DealInvitation` targets one Need and records purpose, scope, expiry, response, actor/acting-for context, revocation, version, idempotency, audit, and outbox causality. Acceptance does not create an Order.
5. Accepted Needs form or link ordinary independent child Orders. Child Orders retain their own parties, immutable terms, Work, evidence, Payment Obligations, disputes, cancellation, liability, and history.
6. Parent roll-up is derived. Child failures, cancellation, replacement, disputes, refunds, and payment events do not automatically cascade across siblings or the parent.
7. The four foundation tables and nullable lineage columns are required before E0-S2. The bounded user-facing capability is a later story; pilot activation requires its own authorization, recovery, operations, browser, and founder gate.
8. This ADR is the authority propagated to the canonical schema/domain, architecture, PRD, UX, delivery plan, integration matrix, and the deferred-feature OpenSpec gate; conflicting historical rejection wording is superseded only for this bounded foundation decision.

Consequences: the architecture must isolate Deal Coordination from Commerce/Order, use composite same-chain FKs and partial uniqueness, enforce dependency cycle prevention, and expose actor/expected-version/idempotency/audit/outbox context. Historical rich Deal-Chaining specifications remain evidence only. The foundation does not authorize pooled custody, automatic splitting, automatic liability reassignment, offline cryptographic authority, or parent-wide guarantees.


## ADR-R-030 — Multi-method sign-in, strict mobile signup, and swappable delivery ports

Status: **Amended 2026-08-10** (founder accept on `openspec/changes/hybrid-browser-auth-phone-step-up/`). Prior 2026-08-09 phone-first-*login* wording is superseded. Live SMS, live Google OAuth, and pilot activation remain separately gated.

Context: Tagudin needs a real verified mobile for contact, notices, Agent consent, and trust. Forcing SMS OTP as the only ordinary return sign-in is costly and poor L3 UX. Coupling the domain to a specific SMS or OAuth vendor would freeze unresolved provider decisions (C-006 and related).

Decision:

1. **Signup / registration is incomplete until** an E.164 Philippine mobile is verified via OTP (`phone_verified_at` set). Google-only or email-only completed signup is forbidden.
2. **Ordinary return sign-in is multi-method** for phone-verified accounts: email/password, SMS OTP, and Google OAuth (phased adapter enablement allowed; all three are in-contract).
3. OTP challenges persist in `auth_otps` as hashes with expiry, attempt limits, single-use consumption, correlation IDs, and explicit purposes (`signup_verify`, `login`, `step_up_*`, …).
4. Browser sessions use Laravel's session guard (`Auth::login`, session regenerate, logout invalidate) after any successful sign-in method.
5. SMS delivery goes through `OtpDeliveryChannel`; email through mail/`NotificationChannel`; Google through an `OAuthLoginPort`. Disposable environments use Fake/Log OTP and mock/disabled Google. Mailpit is email capture only, not an SMS simulator.
6. Product UI must never display OTP codes or universal bypasses. Local/test inspection may use an environment-gated artisan peek seam only.
7. High-trust actions (Provider enable, Agent consent, money/payout) MAY require a fresh phone OTP step-up even when the session was opened via email or Google.
8. Live SMS and live Google OAuth remain disabled until provider, privacy, cost/ops, and founder gates pass.
9. Legacy `/demo/*` fixture auth is not the product authorization boundary and must be removed after dependent tests migrate.
10. One verified phone maps to one account; OAuth subjects and emails link to that user and must not create a second shadow account for the same phone.
11. **Onboarding requires an account password** (`users.password`) to reach ready; email remains optional and independent of the password.
12. **Password recovery is first-class (P0c):** phone-verified users regain access without support via a single-use email reset link (if email linked) or an SMS-OTP-verified reset (fallback for phone-only accounts). Tokens are single-use with short expiry; request/confirm endpoints are rate-limited; copy is generic (no account-existence leak).
13. **Password policy is centralized:** `Password::defaults()` defined once in a service provider; sensitive identity mutations (change password, unlink last recovery method) require fresh `password.confirm` within `auth.password_confirmation_at`.

Consequences: Identity Access owns signup phone verify, multi-method session establishment, account linking, password recovery, and step-up. Listings/onboarding consume `Auth::user()` / `CurrentSession`. Provider choice stays reversible. Implementation sequence and acceptance tests are owned by `openspec/changes/hybrid-browser-auth-phone-step-up/` (and follow-on implementation packets). Older “phone OTP is the only primary L3 login” claims in `real-phone-otp-identity-foundation` and the pre-amendment foundation plan are superseded for ordinary sign-in.

## ADR-R-031 — Full platform contract, phased trains, brownfield module ownership

Status: Accepted 2026-08-09

Decision: Plan the full governed marketplace contract now and deliver it through dependency-ordered trains. Ratify `IdentityAccess`, `Listings`, `OrdersWork`, `PaymentObligations`, `TrustSupport`, and `Operations`; add only `DealCoordination` and `Integrations`. Each owner writes its aggregates through application ports and neutral shared contracts.

Consequences: E0–E9 and PRD-060–076 are in scope at architecture altitude, but capability presence never implies activation. New namespace synonyms, shared-table writers, or big-bang coupling are prohibited.

## ADR-R-032 — Immutable business versions and explicit reservations

Status: Accepted 2026-08-09

Decision: Separate immutable business/contract versions from optimistic `row_version`, event/payload versions, and artifact revisions. Listings pin category/profile versions. Capacity uses listing/version/type/resource buckets and explicit held/committed/released/expired reservation records.

Consequences: published meaning is append-only, unknown Work contract versions park with no effect, A3 supports multiple slots, and concurrent oversell/double-book/release races require PostgreSQL-backed tests.

## ADR-R-033 — Proposal/final agreement split and one transaction coordinator

Status: Accepted 2026-08-09

Decision: Pending proposals carry no required Work/Obligation children. `FinalizeOrderAgreement` is the sole accepted-Order seam and the Order application service coordinates one database transaction across exact source/acceptance versions, capacity, terms, parties, Work, one-lane Obligations, audit, idempotency, and outbox in fixed lock order.

Consequences: every mechanism converges on an ordinary Order; a child or constraint failure rolls back all writes; only post-commit side effects are asynchronous.

## ADR-R-034 — Versioned outbox/inbox and dimensioned activation

Status: Accepted 2026-08-09

Decision: Events carry contract/payload versions and aggregate sequence. Consumers durably deduplicate, apply only the next sequence, park gaps/unknown versions, and expose replay/dead-letter recovery. Owning services evaluate explicit environment/cohort/geography/owner/category/mechanism/shape/lane/provider/client activation before mutation.

Consequences: delivery acknowledgment is not business acknowledgment; adapter/configuration bypass is impossible; disablement preserves reads and safe recovery while blocking new/irreversible effects.

## ADR-R-035 — One-lane balanced financial truth and Xendit sandbox

Status: Accepted 2026-08-09

Decision: One Obligation has one lane. Each money effect posts one immutable balanced-per-currency transaction; corrections compensate and reconciliation compares Obligation/event, provider, and ledger. Xendit is the founder-selected first sandbox adapter behind provider-neutral ports; Tiwala remains a non-escrow simulation.

Consequences: mismatch/dispute/hold blocks protected release; sandbox/live accounts, secrets, metrics, activations, and effect-specific kill switches are separated; G6 independently gates production money.

## ADR-R-036 — Account-owned service principals and one application seam

Status: Accepted 2026-08-09; implementation follows canonical authority/schema propagation

Decision: Each integration client belongs to one user owner, has versioned restrictive scopes and separately rotatable/revocable environment-bound credentials, and calls the same application commands/queries as UI/jobs. Owner derives only from authenticated client; AI has no special authority.

Consequences: six integration tables and `/api/v1` are conditional capability infrastructure. Cross-owner access is non-enumerating, owner/client-scoped idempotency and cursors are required, and organization tenancy remains deferred.

## ADR-R-037 — Provider, evidence, and webhook security boundaries

Status: Accepted 2026-08-09

Decision: Provider effects require cryptographic authenticity plus expected account/environment/object/owner/amount/currency/transition binding. Evidence is private/quarantined/scanned and re-authorized on access. Outbound webhook delivery rejects private/reserved/metadata destinations and DNS/redirect rebinding on every attempt.

Consequences: authentic-but-wrong provider events enter reconciliation with no effect; unsafe evidence is never directly served; webhook egress is allow-constrained, TLS-verified, pinned, bounded, and auditable.

## ADR-R-038 — Exact approvals and separation of duties

Status: Accepted 2026-08-09

Decision: Confirmation-required AI and privileged actions use short-lived single-use approval bound to exact actor/client/command/payload/targets/versions/economics/policy/evidence/idempotency. High-risk publication, identity, money, consent, dispute, export, holds, correction, release/payout, and activation follow deny-by-default maker/checker policy. For owner credentials, recent step-up is sufficient to issue/rotate within currently approved scopes, reduce scopes, and revoke; scope expansion, environment changes, and webhook-signing-secret changes additionally require an independent Operations checker. Emergency revocation never waits for a checker.

Consequences: model output/general consent/stale confirmation are never authority; approval consumption is atomic with effect; self-approval fails. Single-human accounts can operate safely without organization tenancy, while elevated credential authority is independently checked. Emergency override remains separately scoped/alerted/audited/reviewed.

Activation precedence is fail-closed: any current matching deny is absolute, including a broader incident/provider/lane deny; a narrower enable cannot override it. Enablement requires at least one current match and zero matching denies, with deterministic specificity used only for attribution. Same-fingerprint effective ranges cannot overlap and queued effects recheck before mutation.

## ADR-R-039 — Locked runtime and environment envelope

Status: Accepted 2026-08-09

Decision: Nginx→PHP-FPM, PostgreSQL, Redis, queue worker, scheduler, and private evidence service are required operational boundaries; Node SSR is a separate presentation process with safe fallback. PostgreSQL search/polling are baseline; Meilisearch/Reverb remain measured adapters.

Consequences: every process has health/failure ownership. Local/test, capstone sandbox, genuine pilot, and production secrets/data/metrics are separated; migration/backfill/restore/promotion/disable evidence precedes activation.

## ADR-R-040 — Canonical 58-table initiative extension

Status: Accepted 2026-08-09

Decision: Reconcile the observed 47-table baseline including `auth_otps`, then add the eleven tables and existing-table constraints specified by canonical schema §2.2. The approved target is 58.

Consequences: no related migration starts from the old 46-table catalog. The ERD, inventory, retention, migration order, rollback, and PostgreSQL catalog/constraint tests must agree before T1/T2 implementation.

## ADR approval gate

The ADR catalog is ready for architecture/operations design only when:

- The founder approves the rebuilt product/domain/payment/schema decisions.
- Any open legal/provider questions are represented as gates, not hidden assumptions.
- Runtime/deployment choices remain downstream of operations needs.
- Every ADR has owner, status, alternatives, consequences, and affected artifacts.
- The old catalog is marked historical/superseded after this catalog is accepted.
