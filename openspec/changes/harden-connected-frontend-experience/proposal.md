# Harden the complete connected frontend system

Status: PROPOSED — detailed founder-directed revision; implementation remains blocked until approval gates in `tasks.md` pass
Date: 2026-08-01
Change ID: `harden-connected-frontend-experience`
Implementation plane: deterministic React frontend reference with fictional data; no backend authority

## 1. Why this change exists

The published React frontend is a useful visual and technical seed, but it is not yet a coherent simulation of Serbizyu as a system.

The current build demonstrates isolated pieces—Browse, one request composer, one fixed Quick Deal, one Agent task list, one Order workspace, and a local scenario snapshot—but it does not let a reviewer correctly sign in, onboard, acquire capabilities, manage listings, act for an Owner, bid on requests, complete a standalone Quick Deal, operate the resulting Order, or inspect and recover the system through an Admin interface.

This gap is dangerous before backend implementation. A backend built against incomplete screens would inherit:

- fake or global actor state;
- unclear authentication and authorization boundaries;
- duplicated Agent-specific pages instead of shared delegated Owner workspaces;
- a Quick Deal attached to discovery rather than a dedicated dealing session;
- request publication without the response/bid/acceptance half;
- identity and formalization concepts collapsed together;
- static Admin dashboards without auditable commands or recovery;
- entity identity lost between routes;
- mutable singleton fixtures; and
- false assumptions about payment, SMS, QR, identity, or legal authority.

This change defines the complete frontend contract first. Later implementation subagents SHALL follow this package mechanically and SHALL not invent product behavior screen by screen.

## 2. Authority and founder corrections

This revision is grounded in:

- `_bmad-output/planning-artifacts/prd-rebuilt.md`;
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`;
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`;
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`;
- `_bmad-output/planning-artifacts/epics-and-stories-rebuilt.md`;
- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`;
- `docs/planning-hardening/09-development-standards-and-bmad-openspec-contract.md`;
- `docs/planning-hardening/10-ux-ui-reference-dossier.md`;
- `docs/planning-hardening/11-founder-frontend-review-and-replanning-table.md`;
- `docs/planning-hardening/11a-data-backed-frontend-system-mockup-plan.md`; and
- `docs/audits/ux-closure-frontend-coverage-review-2026-08-01.md`.

The founder has clarified these controlling frontend directions:

1. **The frontend must simulate entry through an actual login interface.** A deterministic mock-auth adapter is required now, while real authentication remains backend work.
2. **One account has additive capabilities.** Buyer and Provider are transaction relationships, not a global persona switch.
3. **Quick Deal is a dedicated top-level dealing tool.** It does not appear as an action inside public Browse/Listings cards.
4. **Quick Deal initiation is Owner-supply-first.** An Owner/Provider or authorized Agent enters Quick Deal, selects an eligible owned listing, starts a session, and presents a QR/join artifact. The Buyer/recipient scans or opens that session.
5. **Quick Deal adjustments are session-specific.** Price, scope, quantity, schedule, inclusions, or add-ons may be proposed without mutating the public listing. Accepted terms become an immutable Order snapshot.
6. **Agent work reuses normal Owner interfaces.** The Agent selects an authorized Owner and uses the same My Listings, My Requests, Orders, and related workspaces under a persistent `Acting for [Owner]` context.
7. **The Owner retains independent access.** Agent assistance never shares credentials, takes over the Owner account, or hides attribution.
8. **Request bidding must be complete.** Request publication is not a journey until Providers/Agents can respond and the Buyer can clarify, compare, decline, accept, and form an Order.
9. **Onboarding is required.** Buyer, self-managed Provider, Agent-assisted Owner, Agent, and Admin fixture paths must be explainable and testable.
10. **Formalization progression is a separate track from identity verification.** Its old legal/tax/cap/badge claims remain research-gated and cannot be silently revived.
11. **Admin/Operations is a real protected workspace.** It must inspect, decide, hold, retry, classify, and recover through attributed commands—not merely display metrics.
12. **Deal Chaining has an approved bounded foundation.** The four-table coordination model and ordinary child-Order isolation are now authority decisions. This OpenSpec does not implement that foundation or a user-facing feature; later coordination UX remains a separate story and pilot activation gate.

Where this OpenSpec conflicts with an older frontend OpenSpec, this founder-directed package controls the later frontend implementation. Historical checked tasks remain evidence of foundation work only.

## 3. Current baseline

As of 2026-08-01:

- `npm run build` succeeds for the current React/Vite frontend;
- no automated frontend unit/contract test files are present;
- no Playwright configuration is present;
- route parsing, local scenario state, Scenario Lab, Agent Today, Listing Detail, Order Workspace, Profile, and Quick Deal exist only as partial seeds;
- the scenario repository still owns singleton `order`, `quickDeal`, and `plan` records;
- the gateway surface is too small for authentication, onboarding, listings, bidding, Agent delegation, Admin operations, or complete Orders;
- no real or mock login route exists;
- no complete onboarding or formalization route exists;
- no complete Admin/Operations shell exists; and
- build/route/component presence does not prove connected UX closure.

## 4. Target frontend system

The target is one deterministic, entity-linked, browser-testable React frontend with four clearly separated surfaces.

### 4.1 Public and authentication surface

- Welcome/product boundary
- Public discovery where permitted
- Mock login identifier entry
- Explicitly simulated challenge verification
- Session expired, signed out, unavailable, and recovery states
- Demo-account chooser available only as a clearly labeled reviewer aid

### 4.2 Consumer/marketplace surface

- Home
- Browse
- Activity
- Me
- Dedicated Quick Deal launcher and root session route
- My Marketplace
- My Listings
- My Requests
- Open Requests/My Responses for eligible Providers
- Orders and Work
- Notifications, support, safety, disputes, privacy, accessibility, and account lifecycle

Quick Deal has a top-level launcher and its own route tree. It is not a discovery-card action and does not require the Buyer to search again after joining a session.

### 4.3 Agent-assisted surface

- Agent Today hub
- Managed Owners
- Invitation and consent grants
- Owner selection
- Shared normal Owner management screens under visible delegated context
- Approval requests
- Owner notices and simulated SMS delivery states
- Pause, revoke, report, and blocked-action explanations

The Agent hub organizes work; it does not duplicate every Owner screen.

### 4.4 Admin/Operations surface

- Operations dashboard and action queues
- User/account/capability inspection
- Identity review fixtures with protected evidence metadata
- Listing review/moderation
- Request/quote/Order/Work/Payment inspection
- Dispute, hold, support, and safety operations
- Notification/outbox failure recovery
- Cohort/evidence classification and truthful metrics
- Audit history
- Capability/provider/Agent fixture kill switches
- Policy-version inspection
- Backup/restore and operational-readiness evidence views without fake execution

The Admin shell is authorization-separated from consumer navigation and from the reviewer Scenario Lab.

## 5. Scope of the change

### 5.1 Connected frontend platform

- Parameterized route registry and protected-route metadata
- Entity-scoped query keys and view contracts
- Versioned normalized scenario repository
- Mock `AuthGateway`, `MarketplaceGateway`, and `OperationsGateway`
- Session state, authorization guards, acting-for context, and Admin permission scopes
- Deterministic persistence, migrations, reset, failure injection, event history, and evidence classification
- Typed validation, permission, not-found, stale/conflict, expiry, unavailable, retryable, deferred, and invariant errors
- Production-artifact browser verification at mobile and desktop widths

### 5.2 Mock authentication

- Fictional identifier/challenge flow
- Persistent local mock session
- Logout and session-expiry behavior
- Return-to-intended-route behavior
- Suspended/disabled account behavior
- Admin-capability guard
- Explicit statement that no SMS, password, credential, identity proof, or secure session exists
- Reviewer-only account/actor shortcuts separated from product auth

### 5.3 Progressive onboarding and formalization

- Additive capability selection
- Buyer, self-managed Provider, Agent-assisted Owner, Agent, and Admin fixture readiness paths
- Profile, language, location/privacy, accessibility/low-data, consent, assistance, and identity-review states
- Save/resume and action-required recovery
- Formalization progression shown separately from identity status
- Legal/policy-gated wording and nonfunctional evidence actions where authority is absent
- Readiness summary that explains enabled, blocked, conditional, and future capabilities

### 5.4 Listing management and delegated Owner work

- My Listings by Owner and lifecycle
- Service/Product creation, draft, validation, preview, review, publish, pause, capacity, resume, reject, expire, archive
- Same routes for Owner and authorized Agent
- Permission-aware controls, approval tasks, Owner notices, and attribution
- No Agent ownership transfer or credential impersonation

### 5.5 Requests, quotes, and competitive bidding

- Persistent Service/Product Request draft and publication
- Open Requests discovery for eligible Providers/Agents
- Clarification and response thread
- Versioned quote/bid composer
- Submit, replace, withdraw, expire, decline, and accept
- Buyer comparison by scope and meaning, not fake ranking
- Accepted quote becomes an immutable normal Order
- Existing canonical `quotes` object remains the response/bid source; no separate `bids` table is assumed

### 5.6 Standalone Quick Deal

- Dedicated Quick Deal landing route
- Start-versus-join choice
- Eligible owned-listing selector for Owner/Provider/authorized Agent
- Session creation, QR/join artifact, waiting, recipient preview, and join
- Shared session with attributed proposal rounds
- Session-specific terms derived from a listing version
- Both-party re-confirmation after every material change
- Decline, leave, expiry, stale listing/capacity, camera unavailable, transport retry, duplicate confirmation, and conflict recovery
- One idempotent normal Order after accepted final confirmation
- Resulting Activity entry and unresolved payment obligation
- Camera, QR transport, two-device synchronization, and signature remain explicitly simulated

### 5.7 Orders, Work, Payment, evidence, and Activity

- Stable entity-linked Order workspace
- Separate Order, Work, Payment Obligation, Evidence, Dispute/Hold, message/support, and timeline panels
- At least one complete A1 + External Cash vertical slice first
- Independent Buyer `Cash paid` and Provider `Cash received` declarations
- Completion and payment independence
- Activity derived into Needs action, Waiting, and History

### 5.8 Admin/Operations

- Protected operations routes and scoped mock permissions
- Queue and search behavior derived from the same scenario repository
- Sensitive fixture redaction and access explanation
- Reason-required, expected-version, idempotent, attributable high-risk commands
- Identity review, listing moderation, dispute/hold/safety resolution, notification retry, classification correction, and kill-switch simulation
- No direct editing of immutable terms, events, evidence history, payment reports, or audit records
- No fake live gateway, payout, refund, ID verification, message delivery, backup, or legal decision

### 5.9 Future Deal-Chaining lab

The change records, but does not authorize implementation of, a later bounded coordination story. Its traceable foundation boundary is:

- `DealChain` coordinates ordered `DealNeed` slots and derived parent roll-up only;
- dependencies are same-chain directed `blocks` edges with no self-edges, duplicates, or cycles;
- open Needs reuse existing Request/Quote workflows, while invitations target one Need and acceptance is not Order creation; and
- accepted Needs form or link ordinary independent child Orders with their own parties, terms, Work, Payment Obligations, evidence, disputes, cancellation, replacement, liability, and history.

This OpenSpec does not add feature requirements, create a frontend route, or authorize normal pilot navigation. A future story must consume the approved foundation, preserve acting-for attribution and child isolation, and pass its separate authorization, recovery, operations, browser, accessibility, and founder activation gates.

## 6. Existing code to evolve rather than discard

Retain:

- React 19.2, TypeScript 5.9, Vite, Tailwind, TanStack Query, and current UI primitives;
- the visual token direction and responsive shell foundation;
- entity cards and the request-composer interaction pattern where behavior remains valid;
- current route parser, scenario repository, gateway, Scenario Lab, Listing Detail, Order Workspace, Agent Today, Profile, and Quick Deal as refactoring seeds; and
- `docs/mockup.html` unchanged.

Replace or expand:

- singleton scenario aggregates with normalized entity maps;
- direct fixture access with injected gateways;
- global reviewer actor state with a proper mock session plus separate reviewer context;
- `/quick-deal/:listingId` as the only entry with `/quick-deal` plus session routes;
- Agent-specific transactional page variants with shared Owner routes and acting-for guards;
- the tiny gateway with auth, onboarding, marketplace, notification, and operations contracts;
- static Admin concepts with protected operations routes and commands; and
- source-presence acceptance with browser-tested connected behavior.

## 7. Architecture decisions locked for implementation

1. **Three gateway boundaries:** `AuthGateway`, `MarketplaceGateway`, and `OperationsGateway` are separate deep modules.
2. **Two actor contexts:** `SessionContext` represents product mock login; `ReviewContext` represents internal scenario/actor controls. They may not masquerade as one another.
3. **One normalized repository:** all fixtures and operations share stable entity IDs, versions, events, and classifications.
4. **One screen implementation per resource:** Owner and Agent use the same resource routes; authorization changes available commands and visible attribution.
5. **Separate Admin shell:** operations routes and navigation are absent without Admin capability.
6. **Quick Deal has its own aggregate in mock state:** it remains fixture-only until an upstream schema decision chooses a persisted pre-Order model.
7. **Formalization has its own mock state:** it is not stored in `identity_verifications` and remains fixture-only until an approved domain/schema extension exists.
8. **Quote is the bid response object:** competitive presentation does not create a separate canonical bid aggregate.
9. **Order snapshots are immutable:** accepted listing/quote/Quick Deal terms are copied into a normal Order terms snapshot.
10. **Admin corrections append:** no operations UI silently overwrites history.
11. **Mock boundaries are persistent:** no screen may imply real SMS, auth, ID review, payment movement, QR security, sync authority, or legal approval.
12. **Behavioral closure:** a feature exists only when its connected happy path, cross-actor consequence, refresh behavior, permission behavior, recovery branch, mobile layout, and production-build browser test pass.

## 8. Explicit non-goals

This change does not implement:

- Laravel, Inertia integration, PostgreSQL, real authentication, passwords, production sessions, or account recovery;
- actual OTP/SMS/email/push delivery;
- real government-ID/selfie collection or identity verification;
- legal or tax validation of the Formalization Ladder;
- real camera/QR synchronization, cryptographic signatures, offline authority, or multi-device transport;
- live payments, balances, custody, payout, refund, release, or escrow;
- Agent cash/goods custody or account impersonation;
- autonomous AI publication, decisions, moderation, identity, money, or dispute actions;
- a user-facing or production-functional Deal-Chaining feature, frontend activation, or pilot claim;
- pooled Deal-Chaining money, aggregate liability, or child-payment settlement;
- real pilot/genuine Tagudin evidence; or
- a global Buyer/Provider product role switch.

## 9. Decision gates that implementation must not guess

### Gate A — Formalization policy

Before enabling real-looking submissions, approvals, caps, badges, tax statements, or unlocks, approve:

- lane names;
- evidence requirements;
- legal/tax statements;
- progression/unlock behavior;
- retention/access rules; and
- formalization domain/schema representation.

Until then, the frontend may show only a clearly marked policy-review fixture and educational progression.

### Gate B — Quick Deal persisted model

Before backend implementation, decide:

- one listing versus multi-listing bundle cardinality;
- pre-Order session/proposal aggregate versus approved draft-Order model;
- whether two session confirmations create an accepted Order atomically or first create `pending_acceptance`;
- authoritative expiry/round/capacity rules; and
- secure transport/synchronization responsibility.

The deterministic frontend may use a fixture-only `QuickDealSession` to validate UX. Its current proposed fixture behavior creates no Order before both valid confirmations and then creates one accepted Order atomically; this does not settle the backend persistence decision.

### Gate C — Admin permission, privacy, and operations model

Before production operations, approve:

- Admin sub-permissions, assignment, separation of duties, and two-person approval needs;
- break-glass/emergency-access rules and review timing;
- sensitive field-level redaction, access logging, and evidence/retention permissions;
- canonical action reason, severity, hold, dispute, rejection, and correction taxonomies;
- notification channels, retry/backoff/dead-letter ownership, and operational escalation targets;
- cohort-classification authority and conflict/correction rules;
- metric formulas, timezone, attribution windows, and support-cost calculation;
- policy-version approval/activation and kill-switch ownership;
- trusted provider-adapter criteria and reconciliation authority;
- financial adjustment/release scopes and whether a separate finance permission is required;
- backup/restore RPO/RTO and whether restore is runbook-only; and
- operational escalation/runbooks.

The frontend uses fictional scoped Admin fixtures only. Proposed operation scopes are implementation contracts, not approved production role groupings.

### Gate D — Deal-Chaining future-feature and open-need UX gate

The bounded foundation is approved upstream and is a prerequisite for E0-S2. No user-facing Deal-Chaining implementation task may start until the separate future story confirms the approved parent/Need/dependency/invitation boundary, ordinary child-Order formation, acting-for attribution, recovery/operations evidence, and pilot-activation criteria. This gate does not reject or remove the foundation; it keeps functional UX and pilot use separately authorized.

## 10. Delivery and implementation order

1. Baseline defects and browser-test harness.
2. Domain/view/command/error contracts.
3. Mock auth and session boundary.
4. Central routes and protected shells.
5. Normalized scenario repository and gateways.
6. Reviewer Scenario Lab separation.
7. Progressive onboarding and readiness.
8. My Marketplace and listing management.
9. Shared Agent acting-for Owner flow.
10. Request response/bidding/quote flow.
11. Standalone Quick Deal.
12. Connected Order/Work/Payment/Activity spine.
13. Admin/Operations console and recovery.
14. Broader archetypes and support/safety breadth.
15. Decision-gated future Deal-Chaining lab only after Gate D.
16. Production-build and published-build verification.

Implementation subagents SHALL work in small dependency-ordered tasks. Each task requires specification compliance review followed by code-quality review. Tasks touching the same deep module SHALL not be implemented concurrently.

## 11. Approval gate

Application-code implementation begins only after the founder approves this package’s:

- mock-login and reviewer-harness separation;
- standalone Quick Deal entry and session rules;
- shared Agent/Owner screen model;
- onboarding paths;
- formalization policy-gated presentation;
- request/bid/quote lifecycle;
- Admin information architecture and mock permission boundaries;
- first connected implementation slice; and
- Deal-Chaining decision gate.

Approval authorizes deterministic frontend implementation only. It does not authorize backend, sensitive-data, production-payment, legal, or pilot claims.
