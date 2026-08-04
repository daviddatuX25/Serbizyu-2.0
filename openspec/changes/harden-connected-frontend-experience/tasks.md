# Tasks: Harden the complete connected frontend system

Status: PROPOSED — every implementation task intentionally unchecked
Change: `harden-connected-frontend-experience`
Execution owner: future subagents under lead-architect orchestration and two-stage review

## Execution rules

- Implement in dependency order. Do not bulk-generate screens.
- One task must produce one reviewable behavior or deep-module seam.
- Tasks touching the same deep module or shared file must run serially.
- Every implementation task receives the exact task text, file scope, dependencies, and acceptance scenarios; subagents must not infer requirements from the change title.
- Every task follows: failing test/evidence first → implementation → targeted tests → full relevant tests → spec-compliance review → code-quality review.
- Spec-compliance review passes before code-quality review starts.
- A route, component, fixture, type, checked box, build, or screenshot is not connected-journey proof.
- No subagent may edit canonical BMAD artifacts to make implementation easier.
- Stop on a product/domain/schema conflict; report it to the lead architect.
- Do not edit `docs/mockup.html`.
- Do not add real credentials, phone numbers, government-ID media, genuine user data, live money, or production integration.
- Every generated record is CAPSTONE, SANDBOX, or TEAM_TRAINING unless a separate genuine-pilot gate exists. Frontend fixtures never count as genuine validation.

## Phase 0 — Founder approval and authority lock

- [ ] 0.1 Approve the product mock-login versus reviewer Scenario Lab separation. Trace: MFAO-REQ-001–005; design §§3,7.
- [ ] 0.2 Approve Home/Browse/Activity/Me plus a dedicated top-level Quick Deal launcher that is absent from Browse/Listing cards. Trace: QDS-REQ-001; design §§3–4.
- [ ] 0.3 Approve Quick Deal Start/Join roles: Owner/Provider/authorized Agent selects one eligible listing; Buyer joins an existing session. Trace: QDS-REQ-002–004.
- [ ] 0.4 Confirm initial Quick Deal fixture cardinality is one listing while multi-listing remains Gate B. Trace: proposal Gate B.
- [ ] 0.5 Approve shared Owner resource routes under Agent acting-for context and reject Agent-specific duplicate editors. Trace: APA-REQ-008–013.
- [ ] 0.6 Approve Buyer, self-managed Provider, Agent-assisted Owner, and Agent onboarding paths. Trace: MFAO-REQ-006–011.
- [ ] 0.7 Approve policy-gated formalization presentation without restoring old tax/cap/badge claims. Trace: MFAO-REQ-012–014.
- [ ] 0.8 Approve request/bid/quote lifecycle, policy-guarded Reverse Bidding, and `quotes` as the canonical response object. Trace: RBQ-REQ-001–011.
- [ ] 0.9 Approve Admin/Operations route map, fictional permission scopes, sensitive inspection, high-risk confirmation, sandbox-release boundary, and no-impersonation rule. Trace: AOP-REQ-001–020.
- [ ] 0.10 Confirm the approved Deal-Chaining foundation is propagated for E0-S2 while user-facing coordination remains decision-gated and reviewer-only until the separate future-feature Gate D. Trace: DCL-REQ-001–008 and the propagation record.
- [ ] 0.11 Record the approved decisions in `docs/planning-hardening/11-founder-frontend-review-and-replanning-table.md` or its successor before source restructuring.
- [ ] 0.12 Add supersession/status notes to `implement-hifi-frontend-foundation` and `unify-account-and-quick-deal-experience`: checked foundation tasks do not prove connected UX closure; conflicting Quick Deal entry behavior is superseded.
- [ ] 0.13 Reconcile the canonical-schema identifier ambiguity before backend/generated-contract work. Until formally reconciled, use the implementation authority in `07-schema-implementation-and-erd-contract.md`: UUIDv7/native UUID. Do not choose BIGINT from the older alternative note.
- [ ] 0.14 Record Deal-Chaining authority propagation and explicit E0-S2 blockers before any future coordination UX task; do not mark foundation presence, a lab, or a pilot as functional readiness.

### Gate 0

STOP if tasks 0.1–0.10, the identifier-authority check 0.13, and the authority-propagation record 0.14 are not explicitly approved. Planning may continue; application source restructuring may not.

## Phase 1 — Baseline and regression harness

### Modify/add

- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig*.json` where required
- `frontend/playwright.config.ts`
- `frontend/vitest.config.ts`
- `frontend/tests/`
- `frontend/src/test/`

### Tasks

- [ ] 1.1 Record current branch, baseline commit/worktree status, Node/npm versions, `npm run typecheck`, and `npm run build` output without classifying existing worktree changes as this task’s work.
- [ ] 1.2 Install/configure Vitest, React Testing Library, user-event, jest-dom, and jsdom compatible with React 19/TypeScript 5.9.
- [ ] 1.3 Install/configure Playwright against the production build/preview artifact, not only Vite dev mode.
- [ ] 1.4 Configure desktop Chromium, 375px mobile, 360px mobile, and reduced-motion projects.
- [ ] 1.5 Add console/page-error capture, trace, screenshot, and video-on-failure policy.
- [ ] 1.6 Encode current route defects: unknown route recovery, lost selected entity, missing auth guard, Quick Deal wrong entry, request lost on refresh, Manage Listing no-op, Agent duplicate-context risk, and bottom-nav overlap.
- [ ] 1.7 Add a no-dead-control helper that inventories visible buttons/links on selected routes.
- [ ] 1.8 Save baseline test evidence under the approved audit/evidence path with CAPSTONE classification.

### Gate 1

Known-defect tests must fail for the intended reasons before fixes. Typecheck/build remain green or every known baseline failure is recorded.

## Phase 2 — Domain, ID, view, command, permission, and error contracts

### Add/modify

- `frontend/src/domain/ids.ts`
- `frontend/src/domain/aggregates.ts`
- `frontend/src/domain/commands.ts`
- `frontend/src/domain/events.ts`
- `frontend/src/domain/errors.ts`
- `frontend/src/domain/permissions.ts`
- `frontend/src/application/view-models.ts`
- `frontend/src/application/query-keys.ts`
- existing `frontend/src/types/domain.ts`

### Tasks

- [ ] 2.1 Add opaque typed IDs for User, Session, RoleAssignment, Verification, ConsentGrant, Listing, ListingVersion, Capacity, Request, Quote, QuickDealSession, Order, TermsSnapshot, Work, PaymentObligation, Evidence, Dispute, Hold, SupportCase, Incident, Notification, Delivery, Outbox, Classification, PolicyVersion, and AuditEvent; fixture/generated canonical entity IDs follow UUIDv7/native-UUID authority while explicitly fixture-only session IDs may use a separate typed factory.
- [ ] 2.2 Model each canonical aggregate separately; prohibit one global Order/Quick Deal/Work Plan singleton in type contracts.
- [ ] 2.3 Add fixture-only `OnboardingProgress`, `FormalizationProgress`, and `QuickDealSession` types with explicit `fixtureOnly: true`/evidence classification.
- [ ] 2.4 Add `ViewerContext`, `ActingContext`, and `ReviewContext` as separate types.
- [ ] 2.5 Add mock Admin operation scopes from design §4.6 and permission derivation helpers; mark production grouping as unresolved Gate C.
- [ ] 2.6 Add actor-attributed command envelope: idempotency, actor, acting-for Owner, grant, target, expected version, correlation, fixture class, payload.
- [ ] 2.7 Add event/audit contracts that redact sensitive values and preserve previous/new state summary.
- [ ] 2.8 Add typed errors: validation, auth required, session expired, account suspended, capability missing, permission/grant denied, sensitive access denied, not found, stale/conflict, expiry, unavailable/offline, retryable, deferred, invariant.
- [ ] 2.9 Add entity-scoped query-key factories for all resources, session context, acting Owner, Admin permission, and lists.
- [ ] 2.10 Add contract tests preventing payment → Work completion, evidence → proof/completion, Agent → ownership transfer, mock login → real-auth claim, Admin → user impersonation, and Quick Deal → payment settlement.

### Gate 2

STOP if any feature still requires mutable global actor, singleton entity records, Agent screen duplication, or one status representing Order/Work/Payment together.

## Phase 3 — Gateway boundaries

### Add

- `frontend/src/application/auth-gateway.ts`
- `frontend/src/application/marketplace-gateway.ts`
- `frontend/src/application/operations-gateway.ts`
- `frontend/src/context/GatewayContext.tsx`
- `frontend/src/infrastructure/http/HttpAuthGateway.ts`
- `frontend/src/infrastructure/http/HttpMarketplaceGateway.ts`
- `frontend/src/infrastructure/http/HttpOperationsGateway.ts`

### Tasks

- [ ] 3.1 Define `AuthGateway` exactly around session/challenge/sign-out/recovery behavior; it must not expose passwords or real transport assumptions.
- [ ] 3.2 Define `MarketplaceGateway` around onboarding, listings, requests, quotes, Agent actions, Quick Deal, Orders/Work/Payment, Activity, and notifications.
- [ ] 3.3 Define `OperationsGateway` around dashboard/queue/inspection/commands/audit/metrics.
- [ ] 3.4 Inject all gateways through one composition provider; pages/hooks cannot import fixture storage directly.
- [ ] 3.5 Add compile-only HTTP adapter skeletons returning explicit unavailable/not-configured behavior.
- [ ] 3.6 Add adapter contract tests ensuring deterministic and HTTP skeletons satisfy the same TypeScript interfaces and typed errors.

### Gate 3

No page or journey hook may import `api/mock.ts`, `data/fixtures.ts`, `localStorage`, or repository internals directly.

## Phase 4 — Normalized scenario repository and migrations

### Add/modify

- `frontend/src/infrastructure/scenario/schema.ts`
- `frontend/src/infrastructure/scenario/repository.ts`
- `frontend/src/infrastructure/scenario/migrations.ts`
- `frontend/src/infrastructure/scenario/LocalStorageAdapter.ts`
- `frontend/src/infrastructure/scenario/fixtures/`
- `frontend/src/infrastructure/scenario/DeterministicAuthGateway.ts`
- `frontend/src/infrastructure/scenario/DeterministicMarketplaceGateway.ts`
- `frontend/src/infrastructure/scenario/DeterministicOperationsGateway.ts`

### Tasks

- [ ] 4.1 Implement `ScenarioSnapshotV2` normalized maps from design §6.1.
- [ ] 4.2 Build canonical fictional fixtures for new Buyer, Provider/Owner, assisted Owner, Agent, Buyer-with-request, Provider-with-quote, read-only Admin, scoped Admin, suspended account, and expired session.
- [ ] 4.3 Migrate v1 singleton Order/Quick Deal/plan into normalized entity maps where meaning is preservable.
- [ ] 4.4 Show explained reset when migration cannot preserve canonical meaning; never silently merge schemas.
- [ ] 4.5 Persist product session, acting context, normalized entities, versions, failures, and events.
- [ ] 4.6 Implement idempotent guarded dispatch with version check, permission, domain guard, event/audit append, notifications/outbox effects, and atomic persistence.
- [ ] 4.7 Implement deterministic failure variants per major journey.
- [ ] 4.8 Implement exact scenario reset and feature-fixture reset with confirmation.
- [ ] 4.9 Add repository tests for migration, persistence, reset, idempotency, stale conflict, acting grant, Admin scope, event append, and classification.

### Gate 4

A test must authenticate a fixture user, update an entity, reload, switch reviewer perspective without changing facts, observe attribution, reset, and recover the exact seed.

## Phase 5 — Product mock authentication and session boundary

### Add/modify

- `frontend/src/auth/contracts.ts`
- `frontend/src/auth/SessionProvider.tsx`
- `frontend/src/auth/route-guards.ts`
- `frontend/src/auth/pages/WelcomePage.tsx`
- `frontend/src/auth/pages/LoginPage.tsx`
- `frontend/src/auth/pages/ChallengePage.tsx`
- `frontend/src/auth/pages/RecoveryPage.tsx`
- `frontend/src/auth/pages/SessionExpiredPage.tsx`
- `frontend/src/auth/pages/SignedOutPage.tsx`

### Tasks

- [ ] 5.1 Implement mock session states and product `SessionProvider`; do not reuse `ScenarioContext.reviewerActorId` as login.
- [ ] 5.2 Implement fictional identifier input with unknown-account validation and no real phone claim.
- [ ] 5.3 Implement simulated challenge creation with visible `No SMS was sent` disclosure and fixture expiry.
- [ ] 5.4 Implement challenge verification, wrong code, expired code, retry, and rate-limit fixture states.
- [ ] 5.5 Implement reviewer-only `Use demo code`/demo-account shortcut behind persistent reviewer labeling.
- [ ] 5.6 Implement login return-to-intended-route and onboarding-required redirect.
- [ ] 5.7 Implement persistent mock session, explicit expiry, re-login, safe draft preservation, and stale-version revalidation.
- [ ] 5.8 Implement logout clearing product session and acting context without rewriting shared scenario records.
- [ ] 5.9 Implement suspended account behavior and support route.
- [ ] 5.10 Add unit/component/E2E coverage for all auth states at desktop and mobile.
- [ ] 5.11 Version auth/onboarding/scenario/reviewer storage separately; implement corrupt/schema-mismatch recovery that resets only the affected boundary and never auto-selects an account.
- [ ] 5.12 Validate `returnTo` against internal registered routes; reject external/protocol-relative/script/unknown targets and add open-redirect tests.
- [ ] 5.13 Revalidate auth on cross-tab logout/expiry and assert mock auth/identity actions make no real network request.

### Gate 5

A reviewer can demonstrate realistic product entry without any real credential/SMS claim, and actor switching still exists only in Scenario Lab.

## Phase 6 — Central route registry and protected shells

### Modify/add

- `frontend/src/App.tsx`
- `frontend/src/router/route-registry.ts`
- `frontend/src/router/route-parser.ts`
- `frontend/src/router/guards.ts`
- `frontend/src/router/RouteBoundary.tsx`
- `frontend/src/components/shell/PublicShell.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/OpsShell.tsx`
- `frontend/src/pages/NotFoundPage.tsx`

### Tasks

- [ ] 6.1 Encode every route from design §4 with path params, title, surface, auth/capability/scope guard, and recovery route.
- [ ] 6.2 Replace switch/fallthrough routing with centralized route resolution and boundaries.
- [ ] 6.3 Implement Public, Consumer, and Admin shells with distinct navigation.
- [ ] 6.4 Keep consumer primary navigation Home/Browse/Activity/Me.
- [ ] 6.5 Add dedicated Quick Deal launcher and root route; remove Quick Deal actions from public listing cards/detail.
- [ ] 6.6 Guard Agent routes by capability and owner-resource routes by active consent.
- [ ] 6.7 Guard Admin routes by Admin capability and operation scope; reveal no protected queue summary when denied.
- [ ] 6.8 Add explicit unknown-route, invalid-entity, missing-capability, denied-scope, and deferred-feature pages.
- [ ] 6.9 Add route-title/focus announcements and preserve intended route through login.
- [ ] 6.10 Fix bottom-navigation/safe-area overlap and mobile sticky-action placement.
- [ ] 6.11 Add route parser/guard/unit tests plus direct-link browser tests.

### Gate 6

All routes resolve deterministically; unknown hashes never render Home; unauthenticated/unauthorized routes recover without data leakage.

## Phase 7 — Reviewer Scenario Lab separation

### Modify/add

- `frontend/src/review/ReviewProvider.tsx`
- `frontend/src/review/scenario-lab/`
- existing Scenario Lab components/pages

### Tasks

- [ ] 7.1 Move scenario ID, reviewer actor, failure variant, and aggregate inspector into `ReviewProvider` separate from product `SessionProvider`.
- [ ] 7.2 Keep `#/review/scenarios` absent from product navigation.
- [ ] 7.3 Show fictional/no-real-auth/no-real-money boundary persistently.
- [ ] 7.4 Limit actor switch to actors authorized by the selected fixture.
- [ ] 7.5 Preserve product session state or explicitly create reviewer override session with visible source.
- [ ] 7.6 Add aggregate inspector for all normalized entities and versions.
- [ ] 7.7 Add journey map, failure variant, reset, implemented/blocked status, and decision-gate status.
- [ ] 7.8 Test that product UI cannot invoke reviewer actor switching.

### Gate 7

Cross-actor review works without introducing a Buyer/Provider/Agent/Admin persona switch into consumer UI.

## Phase 8 — Progressive onboarding and formalization

### Add

- `frontend/src/onboarding/contracts.ts`
- `frontend/src/onboarding/readiness.ts`
- onboarding route pages/components

### Tasks

- [ ] 8.1 Implement resumable common onboarding progress and exact last safe step.
- [ ] 8.2 Implement basic profile, language, safe Tagudin area, readability, low-data, and help preferences.
- [ ] 8.3 Implement additive capability intent without exclusive Buyer/Provider choice.
- [ ] 8.4 Implement Buyer minimum readiness and discovery continuation.
- [ ] 8.5 Implement self-managed Provider readiness, identity explanation, draft-listing continuation, and conditional publication gate.
- [ ] 8.6 Implement Agent-assisted Owner setup: Agent-prepared draft, Owner identity separation, invitation, consent, independent login, and revoke/help.
- [ ] 8.7 Implement Agent-interest/identity/review fixture path and block Owner data before active grant.
- [ ] 8.8 Prohibit Admin self-registration; Admin capability exists only in explicit fixtures/role assignments.
- [ ] 8.9 Implement identity fixture states: explanation, consent, pending, more info, approved fixture, rejected, help; no live sensitive upload.
- [ ] 8.10 Implement separate formalization progression with policy-blocked educational cards and no unapproved tax/cap/badge claims.
- [ ] 8.11 Implement readiness summary: enabled, conditional, blocked, deferred, and one next action.
- [ ] 8.12 Add refresh, return, validation, offline/unavailable, review-pending, action-required, and mobile tests for each path.

### Gate 8

Buyer, Provider, assisted Owner, and Agent fixture paths are demonstrable; identity and formalization are visibly distinct; no production approval is implied.

## Phase 9 — Reusable screen anatomy and recovery patterns

### Add/modify

- entity headers
- relationship/context badges
- `ActingForBanner`
- next-action panels
- independent aggregate panels
- version/expiry warnings
- attributed timelines
- loading/empty/error/permission/stale/deferred components
- contextual support/report components

### Tasks

- [ ] 9.1 Implement context → state meaning → one primary action → key facts → independent panels → safe alternative → history anatomy.
- [ ] 9.2 Implement validation with preserved input.
- [ ] 9.3 Implement auth/capability/grant/Admin-scope denied variants.
- [ ] 9.4 Implement stale/version re-review and expired terms/session variants.
- [ ] 9.5 Implement unavailable/offline/retry/pending-unknown-outcome variants.
- [ ] 9.6 Implement mismatch/dispute/hold/deferred/sandbox/empty/not-found variants.
- [ ] 9.7 Implement persistent CAPSTONE/SANDBOX/TEAM_TRAINING labeling.
- [ ] 9.8 Add component accessibility and no-dead-control tests.

## Phase 10 — My Marketplace and listing lifecycle

### Add/modify

- Me/My Marketplace routes
- listing management feature module
- existing Listing Detail and card components

### Tasks

- [ ] 10.1 Build My Marketplace hub with My Requests, My Listings, Orders as Buyer, Orders as Provider, and Helping relationships.
- [ ] 10.2 Build My Listings list by active Owner context and lifecycle.
- [ ] 10.3 Build Service/Product Listing type choice and persistent draft.
- [ ] 10.4 Build scope/category/title/description/inclusion editors.
- [ ] 10.5 Build price/quote semantics and capacity/availability/schedule editor.
- [ ] 10.6 Build area/handoff/delivery, Work shape, evidence, payment-lane, safety/data requirement steps.
- [ ] 10.7 Build Buyer preview and compare current published versus pending draft version.
- [ ] 10.8 Build submit review, active, pause, unavailable, resume, rejected/correction, expired, archive transitions.
- [ ] 10.9 Enforce published-version immutability for existing Orders.
- [ ] 10.10 Make every Manage Listing control open the selected entity and authorized next action.
- [ ] 10.11 Add Owner happy path and validation/stale/capacity/rejection/recovery browser tests.

### Gate 10

Listing management has no dead controls and proves entity/version continuity through refresh and lifecycle changes.

## Phase 11 — Shared Agent Owner-context and notices

### Add/modify

- Agent Today and Managed Owners modules
- consent/invitation/approval/notice components
- shared acting context provider/banner
- listing/request/quote/Order command guards

### Tasks

- [ ] 11.1 Seed invite, pending, active, suspended, revoked, and expired consent-grant fixtures.
- [ ] 11.2 Build Agent Today sections and resource-linked cards.
- [ ] 11.3 Build Managed Owners and Owner-specific grant/resources view without leaking outside scope.
- [ ] 11.4 Implement `Work as this Owner`, persistent banner, expiry/scope/approval/forbidden summaries, and exit.
- [ ] 11.5 Reuse the same My Listings/My Requests/My Responses/Orders routes under acting context.
- [ ] 11.6 Implement Agent-created listing draft preserving Owner and Agent attribution.
- [ ] 11.7 Implement Owner approval request with exact resource/version/consequence and approve/decline/report/revoke.
- [ ] 11.8 Create Owner notice and deterministic in-app/SMS-simulated delivery records for critical actions.
- [ ] 11.9 Implement SMS simulated queued/delivered/failed/retry/fallback states with `No real SMS sent` disclosure.
- [ ] 11.10 Implement STOP/REVOKE fixture reply effect without claiming a real inbound provider; document backend callback/correlation gap.
- [ ] 11.11 Block custody, recipient change, ownership transfer, sensitive evidence access, and post-revocation action.
- [ ] 11.12 Complete SCN-06: invite → grant → Today → acting-for draft → Owner notice/approval → publish → forbidden action blocked → revoke → future action denied → history preserved.
- [ ] 11.13 Add Owner/Agent cross-perspective, refresh, mobile, expired-invite, failed-notice, and revoked-grant E2E.
- [ ] 11.14 Seed two managed Owners with intentionally similar resources and prove Owner/grant-qualified query keys, route resolution, deep-link denial, cache isolation, and independent Owner history parity during context switching.

### Gate 11

No Agent feature is called complete until SCN-06 passes and the same resource screen implementation is proven for Owner and Agent contexts.

## Phase 12 — Requests, responses, bids/quotes, and Order formation

### Add/modify

- Request composer and routes
- Open Requests
- response/clarification thread
- quote/bid composer/detail/comparison
- Activity and notifications integration

### Tasks

- [ ] 12.1 Make Service/Product Request draft and publication persistent, routable, and entity-scoped.
- [ ] 12.2 Add request visibility/safety/privacy/budget/timing/expiry meaning.
- [ ] 12.3 Build eligible Provider/Agent Open Requests with current Owner context and blocked reasons.
- [ ] 12.4 Build clarification question/answer thread with actor attribution.
- [ ] 12.5 Build quote/bid draft with all fields in design §12.3.
- [ ] 12.6 Submit current version; notify Buyer; show My Responses.
- [ ] 12.7 Replace/update quote by new version; preserve superseded history.
- [ ] 12.8 Implement withdraw, expiry, decline, and changed/stale behavior.
- [ ] 12.9 Build Buyer response inbox and comparison by scope/amount/timing/lane/evidence/truthful Provider facts.
- [ ] 12.10 Prohibit fake ranking/automatic award.
- [ ] 12.11 Accept one current quote into immutable Order terms; link Request/Quote/Order/Activity/notifications/timeline.
- [ ] 12.12 Define explicit fixture behavior for unselected responses without silently inventing policy.
- [ ] 12.13 Add Buyer/Provider/Agent cross-perspective E2E including expired, withdrawn, superseded, and stale quote.
- [ ] 12.14 Add versioned Reverse-Bidding fixture policy for responder eligibility, minimum response content, duplicate/idempotency, response-frequency/rate limit, expiry, and explicit post-selection states; test no automatic cheapest award.

### Gate 12

A published request is not complete until a different eligible actor responds and the Buyer can form a normal Order from a current quote.

## Phase 13 — Standalone Quick Deal

### Add/modify

- Quick Deal feature module and routes
- existing Quick Deal page refactored into route states
- Home/top-level launcher
- listing selection, join, session, review, result components

### Tasks

- [ ] 13.1 Remove public listing-card/detail Quick Deal actions and add dedicated top-level launcher.
- [ ] 13.2 Build `Start a deal` and `Join a deal` landing choices.
- [ ] 13.3 Build eligible owned-listing selector for Owner/Provider/authorized Agent; initial fixture permits one listing.
- [ ] 13.4 Create fixture-only session from immutable listing version; no Order yet.
- [ ] 13.5 Build present/waiting view with simulated QR/join artifact, expiry, Owner/Agent attribution, and cancel.
- [ ] 13.6 Build join camera/manual simulation, permission denied, camera unavailable, recipient preview, and join/decline.
- [ ] 13.7 Build shared negotiation with price, quantity/scope, schedule, inclusions/add-ons, and attributed proposal history.
- [ ] 13.8 Clear prior confirmations after material change and require both parties to re-review.
- [ ] 13.9 Build independent Buyer and Seller/Owner confirmation guarded by actor and expected version.
- [ ] 13.10 Enforce Agent grant for Owner-side action and block same actor from satisfying both sides.
- [ ] 13.11 Create no Order before both valid current-version confirmations; then atomically create one idempotent `accepted` normal Order, terms snapshot, Work/Payment records, Activity, and notifications as the proposed fixture behavior while preserving Gate B's backend `pending_acceptance` decision.
- [ ] 13.12 Show unresolved payment obligation and explicit `receipt is not payment proof` copy.
- [ ] 13.13 Implement no eligible listing, stale/paused listing, capacity, mismatch, decline, leave, expiry, transport retry, duplicate confirmation, conflict, and Order-creation retry branches.
- [ ] 13.14 Add two listing-specific fixtures; remove fixed Noel/₱70 assumptions.
- [ ] 13.15 Add full two-perspective desktop/mobile/refresh E2E.

### Gate 13

Quick Deal is complete only when dedicated entry → selected owned listing → join → negotiation → independent confirmations → one normal Order → Activity passes, with no public listing-card Quick Deal action.

## Phase 14 — Connected Order, Work, Payment, evidence, and Activity spine

### Add/modify

- Order Workspace
- A1 Work workspace
- Payment Obligation
- evidence/revision
- completion/sign-off
- timeline
- Activity

### Tasks

- [ ] 14.1 Seed SCN-01 with exact actors, listing, Order, A1 Work, External Cash obligation, evidence, and recovery variant.
- [ ] 14.2 Build shared Order header, accepted terms, relationship, next actor, and independent panels.
- [ ] 14.3 Build Provider Work start/progress/evidence and Buyer evidence/revision review.
- [ ] 14.4 Build independent Buyer Cash paid and Provider Cash received/mismatch declarations.
- [ ] 14.5 Preserve Work state through all payment declarations.
- [ ] 14.6 Build completion proposal, Buyer sign-off/concern, dispute/hold, and Order close guard.
- [ ] 14.7 Build attributable cross-aggregate timeline.
- [ ] 14.8 Derive Activity Needs action/Waiting/History from authorization and state.
- [ ] 14.9 Link every Activity card to the exact entity and next action.
- [ ] 14.10 Complete SCN-01 through both actors, refresh, missing Provider report, mismatch, and 360px E2E.
- [ ] 14.11 Ask in acceptance: `Did Serbizyu receive or hold the cash?`; interface answer must clearly be No.
- [ ] 14.12 Define and test mechanism-specific Order formation for Direct Booking, accepted Quote Request, Reverse-Bidding acceptance, and Quick Deal, preserving origin and immutable accepted source/version.
- [ ] 14.13 Keep canonical Order `draft`, `pending_acceptance`, `accepted`, `in_progress`, cancellation, and completion/closure semantics separate from Work and Payment states.
- [ ] 14.14 Test idempotent duplicate formation plus cancellation/close guards with unresolved Work, Payment, Evidence, Dispute, or Hold; preserve immutable history and attribution.

### Gate 14

SCN-01 passes and proves Order, Work, Payment, Evidence, Dispute/Hold, and Activity are separate but connected.

## Phase 15 — Me, profile, notifications, support, and account lifecycle

- [ ] 15.1 Build Me Overview and readiness summary.
- [ ] 15.2 Build Privacy & Accessibility controls with public/private meaning and local persistence.
- [ ] 15.3 Build notification history with source entity, actor, next action, channel attempts, failure, and support path.
- [ ] 15.4 Build contextual support/report intake linked to exact aggregate.
- [ ] 15.5 Build support case status/history without invented SLA/guarantee.
- [ ] 15.6 Build mock Account & Security: sign-in method boundary, sessions, logout, recovery seam, suspension/deactivation/export/deletion explanations without false success.
- [ ] 15.7 Ensure every card/action is functional or explicitly unavailable.
- [ ] 15.8 Add accessibility/mobile/refresh/no-dead-control tests.

## Phase 16 — Admin/Operations console

### Add

- `frontend/src/features/operations/`
- Admin dashboard, queues, entity inspectors, decisions, audit, metrics, readiness

### Tasks

- [ ] 16.1 Build OpsShell and permission-aware navigation; deny unauthorized users without queue data leakage.
- [ ] 16.2 Build state-derived dashboard cards for verification/listing/dispute/hold/safety/failure/support/classification/gates.
- [ ] 16.3 Build unified queue with URL-persistent filters, severity, entity, actor, owner, version, and next action.
- [ ] 16.4 Build user/account inspector with redacted profile, capabilities, verification, grants, restrictions, classification, notices, and audit.
- [ ] 16.5 Implement reason-required mock capability/status action with permission, expected version, confirmation, and audit; no impersonation.
- [ ] 16.6 Build identity-review queue/detail with redacted fixture evidence metadata, request info, approve fixture, reject, access history, and no real verification claim.
- [ ] 16.7 Build listing moderation queue/detail with versions, Owner/Agent attribution, capability/safety/capacity checks, preview, approve/reject/request-correction/pause/resume.
- [ ] 16.8 Build Request/Quote/Order composite inspector preserving aggregate separation.
- [ ] 16.9 Build dispute workspace with evidence requests, holds, assign, resolution/reject/close/appeal fixture events, and explicit downstream consequences.
- [ ] 16.10 Build administrative-hold list/detail and place/release guards.
- [ ] 16.11 Build restricted safety-incident queue/detail with minimum necessary data and attributable fixture actions.
- [ ] 16.12 Build support queue/case detail and escalation/closure fixtures without invented response promises.
- [ ] 16.13 Build failure queue/detail for notification, evidence, outbox, provider sandbox, and scheduled-job fixture failures.
- [ ] 16.14 Implement idempotent retry with reason/audit and no duplicate domain effect.
- [ ] 16.15 Build notification intent/delivery inspection including failed simulated SMS.
- [ ] 16.16 Build cohort classification correction with reason/audit; default fixtures must never become genuine pilot through a casual control.
- [ ] 16.17 Build metrics with visible evidence-class/geography/time filters, sample counts, and zero External Cash platform revenue.
- [ ] 16.18 Build policy-version/fixture-gate inspection and scoped reason-required kill-switch simulation; prohibit ad hoc financial/legal policy editing.
- [ ] 16.19 Build append-only audit search with actor/target/correlation/reason and redacted values.
- [ ] 16.20 Build operational-readiness evidence screen that labels backup/restore/provider/infra states as fixture/checklist, not real execution.
- [ ] 16.21 Add read-only Operator versus scoped Reviewer/Supervisor permission fixtures and denial tests.
- [ ] 16.22 Add Admin high-risk confirmation, stale conflict, duplicate retry, sensitive redaction, keyboard, mobile, and no-dead-control E2E.
- [ ] 16.23 Build aggregate-specific Work, Payment Obligation, and Evidence inspectors with independent states, append-only correction, protected metadata access/audit, retention/legal-hold state, and no payment/evidence-to-Work inference.
- [ ] 16.24 Expand failure/recovery to duplicate and out-of-order provider events, reconciliation mismatch, idempotency conflict, and outbox intent/delivery/domain-effect separation; prohibit unverified references becoming provider-verified.
- [ ] 16.25 Centralize high-risk preflight: current version/guards, affected actors/aggregates, required reason, explicit confirmation, idempotency/correlation, stale result, attributable event, and notice.
- [ ] 16.26 Implement the sandbox-only protected-release inspector/command with all ten release guards, one append-only fixture event, retry idempotency, and visible no-live-money/no-escrow disclosure.
- [ ] 16.27 Build retention/legal-hold inspection and Gate-C placeholders for unresolved redaction fields, durations, deletion approval, emergency access, metrics, provider trust, finance scopes, and RPO/RTO—do not invent production policy.

### Gate 16

Admin is complete only when a scoped operator can inspect and safely recover deterministic state through attributable commands without direct data rewrite, impersonation, or false live-system claims.

## Phase 17 — Broader archetypes and safety/recovery breadth

Only after Gates 14 and 16:

- [ ] 17.1 Implement A3 Appointment with slot conflict, reschedule/no-show, safety, and completion evidence.
- [ ] 17.2 Implement A4 Product/Handoff with capacity conflict, ready/pickup/receipt/mismatch separation.
- [ ] 17.3 Implement purchase-on-behalf with item list, estimate, approval-before-spend, actual variance, receipt, handoff, and Agent attribution.
- [ ] 17.4 Implement A9 Digital Delivery with version/access/revision/acceptance/retention/dispute.
- [ ] 17.5 Expand contextual safety/report/block and critical notification failures.
- [ ] 17.6 Keep unresolved deadlines/refund/review windows conditional; do not invent policy.

## Phase 18 — Decision-gated future Deal-Chaining lab

### Gate D prerequisites

- [ ] 18.0a Founder selects the open-need taxonomy.
- [ ] 18.0b Parent/child responsibility and ownership contract approved upstream.
- [ ] 18.0c Child agreement/Order formation approved.
- [ ] 18.0d Dependency/handoff, replacement, cancellation, failure, and dispute behavior approved.
- [ ] 18.0e Parent/child payment and no-pooled-custody boundary approved.
- [ ] 18.0f Domain/state/schema extension approved.

STOP if any prerequisite is unresolved.

### Conditional implementation tasks

- [ ] 18.1 Build persistent deferred/future lab landing outside pilot navigation.
- [ ] 18.2 Build parent coordination workspace with child needs, dependencies, assignments, status, and estimated/accepted costs.
- [ ] 18.3 Build direct invitation branch.
- [ ] 18.4 Build approved open-need branch using the selected taxonomy.
- [ ] 18.5 Build provider response and child agreement/Order formation.
- [ ] 18.6 Link each child to independent Order/Work/Payment/Evidence/Dispute/history.
- [ ] 18.7 Build aggregate progress without pooled funds or shared-liability overclaim.
- [ ] 18.8 Build replace/cancel/blocked/failed/disputed child recovery while preserving unrelated children.
- [ ] 18.9 Add cross-actor tests and explicit no-live-pilot/no-custody/no-liability claims.

## Phase 19 — Final verification, publication, and closure

- [ ] 19.1 Run TypeScript typecheck.
- [ ] 19.2 Run production build.
- [ ] 19.3 Run unit/contract tests for all gateways, repository, migrations, guards, permissions, readiness, versions, idempotency, and invariants.
- [ ] 19.4 Run component accessibility and no-dead-control tests.
- [ ] 19.5 Run Playwright against production artifact for mock auth, onboarding, listings, Agent, requests/bidding, Quick Deal, SCN-01, Admin, and all implemented recovery gates.
- [ ] 19.6 Run 360px, 375px, tablet, desktop, keyboard, visible focus, labels, reduced motion, no overlap, and no horizontal overflow checks.
- [ ] 19.7 Assert selected entity identity across card → detail → action → history for every connected scenario.
- [ ] 19.8 Assert product session, acting context, refresh persistence, logout, expiry, and deterministic reset.
- [ ] 19.9 Assert all visible controls act, navigate, disclose, or explain unavailability.
- [ ] 19.10 Assert no console/runtime errors.
- [ ] 19.11 Assert all fixtures remain non-genuine evidence and External Cash produces no platform revenue.
- [ ] 19.12 Build/publish `docs/app/`; rerun public direct-link and smoke/journey checks.
- [ ] 19.13 Update UX closure matrix with exact browser evidence and first blocked step for any incomplete branch.
- [ ] 19.14 Obtain founder review for login/onboarding, shared Agent Owner management, request bidding, standalone Quick Deal, SCN-01, and Admin operations.
- [ ] 19.15 Record implementation review results, unresolved decision gates, and rollback path.
- [ ] 19.16 Run corrupt-storage, malicious-return route, cross-tab logout/expiry, cross-Owner cache isolation, Reverse-Bidding policy, mechanism-specific Order formation, Admin sensitive-access, provider-event reconciliation, and sandbox-release guard E2E.

## Final closure gate

This OpenSpec change remains open until all implemented scopes satisfy:

- realistic mock auth without real-auth claims;
- product session and reviewer context separation;
- progressive onboarding with identity/formalization separation;
- complete listing management;
- shared Agent/Owner resource screens with attribution and revocation;
- request → response/bid/quote → accepted Order;
- standalone Quick Deal → normal Order → Activity;
- connected Order/Work/Payment/Evidence/Dispute/Hold behavior;
- Admin scoped inspection, decisions, retries, classification, and audit;
- stable recovery branches;
- refresh and mobile accessibility;
- production-build browser evidence; and
- truthful deferral of unresolved Gate A–D capabilities.
