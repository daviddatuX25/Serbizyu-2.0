# Design: Harden the complete connected frontend system

Status: PROPOSED — implementation-grade design; application code remains unchanged by this planning pass
Change: `harden-connected-frontend-experience`

## 1. Design objective

Turn the existing React frontend into one connected, deterministic, backend-ready simulation of Serbizyu that can demonstrate:

- how a person enters and resumes the product;
- how additive account capabilities affect actions;
- how a Provider/Owner manages listings;
- how an Agent operates the same screens for an Owner within explicit permission;
- how Buyers publish requests and Providers/Agents submit bids/quotes;
- how a standalone Quick Deal session forms an Order;
- how Order, Work, Payment, Evidence, Support, Dispute, and Hold stay separate;
- how an Admin inspects and safely operates the system; and
- how deferred/future capabilities remain honest.

The frontend must be coherent enough that a later Laravel adapter can replace deterministic local adapters without redesigning journey behavior.

## 2. Non-negotiable experience rules

1. One account may request, provide, own listings, help Owners, or hold Admin capability.
2. Buyer and Provider are per-transaction relationships; there is no consumer role switch.
3. Product mock login and reviewer actor switching are separate systems.
4. Quick Deal has its own top-level entry and is not attached to public Browse/Listing cards.
5. A Quick Deal initiator selects an eligible owned listing after entering Quick Deal.
6. Quick Deal session changes never mutate the public listing.
7. Agent work uses the same Owner resource screens with visible acting-for context.
8. Owner and Agent attribution remain distinct on every command and event.
9. A request is incomplete without responder discovery, clarification, quote/bid, comparison, and acceptance/decline/expiry.
10. Identity verification and business/regulatory formalization are separate progress tracks.
11. Admin operations append attributable actions; no direct history rewrite exists.
12. No deterministic frontend state represents real authentication, protected data, SMS delivery, payment authority, QR security, legal approval, or genuine pilot evidence.

## 3. Surface and shell architecture

### 3.1 Surface A — public/authentication shell

Used when no product mock session exists.

Navigation:

- Welcome
- Browse, if public discovery is permitted by the fixture
- Sign in
- Help/prototype boundary

The public shell does not expose Me, Activity, Agent, Quick Deal initiation, Orders, or Admin operations.

### 3.2 Surface B — consumer marketplace shell

Primary destinations:

1. Home
2. Browse
3. Activity
4. Me

Quick Deal is exposed as a prominent top-level task launcher on Home and as a route-level utility action where the shell design supports it. It is not a Browse/Listings card action and is not hidden inside My Listings.

### 3.3 Surface C — Agent hub plus shared Owner screens

The Agent hub provides:

- Today
- Managed Owners
- Invitations/grants
- Waiting approvals
- Notices/history

After an Owner is selected, the app opens the ordinary Owner resource routes with an acting-for context. It does not render alternate Agent-specific listing, request, quote, or Order implementations.

### 3.4 Surface D — Admin/Operations shell

The Admin shell has its own route prefix, navigation, search, queue summary, permission boundary, and persistent fictional-data warning.

It is available only to a mock-authenticated account with explicit Admin capability and the required operation permission. It is not the reviewer Scenario Lab.

### 3.5 Surface E — reviewer Scenario Lab

The Scenario Lab remains outside all product navigation. It may:

- select canonical fixtures;
- switch among authorized fixture actors;
- inspect aggregate state;
- inject deterministic failures;
- reset state; and
- display coverage status.

It may not resemble consumer login, Agent delegation, or Admin role assignment.

## 4. Route registry

Hash routing remains acceptable for the static review build. All routes must be centralized, typed, parameterized, and guarded.

### 4.1 Public and auth routes

| Route | Purpose | Guard |
|---|---|---|
| `#/welcome` | Product entry and fictional prototype boundary | public |
| `#/login` | Fictional identifier input | signed-out only |
| `#/login/challenge/:challengeId` | Explicitly simulated code verification | matching active challenge |
| `#/login/recovery` | Mock recovery explanation and fixture reset path | public |
| `#/session/expired` | Expiry explanation and return-to-route recovery | expired session |
| `#/signed-out` | Logout confirmation and next action | public |

### 4.2 Onboarding routes

| Route | Purpose | Guard |
|---|---|---|
| `#/onboarding` | Resume/entry router | authenticated; incomplete onboarding |
| `#/onboarding/profile` | Name, Tagudin area, language, access preferences | authenticated |
| `#/onboarding/capabilities` | Add request/provide/Agent-interest capabilities | authenticated |
| `#/onboarding/assistance` | Self-managed versus Agent-assisted setup | authenticated |
| `#/onboarding/consent` | Relevant notices and consent meaning | authenticated |
| `#/onboarding/identity` | Fixture identity requirements/review state | authenticated |
| `#/onboarding/formalization` | Separate policy-gated progression | authenticated Provider/Owner intent |
| `#/onboarding/readiness` | Enabled/blocked/conditional summary | authenticated |

### 4.3 Consumer marketplace routes

| Route | Purpose |
|---|---|
| `#/` | Home/next actions |
| `#/browse` | Listings and requests discovery |
| `#/listings/:listingId` | Public listing detail and normal deal entry |
| `#/requests/new` | Request composer |
| `#/requests/:requestId` | Request details, status, clarifications, responses |
| `#/requests/:requestId/respond` | Provider/Agent response and quote composer |
| `#/requests/:requestId/responses` | Buyer response inbox/comparison |
| `#/quotes/:quoteId` | Quote/bid detail, revision, decline, acceptance |
| `#/orders/:orderId` | Shared Order workspace |
| `#/orders/:orderId/work/:workId` | Shape-specific Work workspace |
| `#/orders/:orderId/payments/:obligationId` | Payment Obligation details/actions |
| `#/orders/:orderId/timeline` | Attributed event history |
| `#/activity` | Needs action, Waiting, History |
| `#/notifications` | Notice history and delivery meaning |
| `#/support` | User support cases |
| `#/support/new` | Contextual support/report intake |
| `#/me` | Account hub |
| `#/me/profile` | Profile/privacy/accessibility |
| `#/me/marketplace` | Marketplace summary |
| `#/me/capabilities` | Additive capability readiness and activation blockers |
| `#/me/identity` | Identity-review fixture status and protected-data boundary |
| `#/me/listings` | Listings owned or delegated for current Owner context |
| `#/me/listings/new` | Service/Product Listing creation |
| `#/me/listings/:listingId/edit` | Shared lifecycle editor |
| `#/me/listings/:listingId/preview` | Buyer-facing preview |
| `#/me/requests` | Requests created by current Owner context |
| `#/me/responses` | Responses/quotes submitted by current Provider context |
| `#/me/orders` | Buyer/Provider/Owner relationship filters |
| `#/me/assistance` | Agent grants, notices, pause/revoke |
| `#/me/formalization` | Separate formalization progression view |
| `#/me/security` | Mock session/account boundaries |

### 4.4 Quick Deal routes

| Route | Purpose |
|---|---|
| `#/quick-deal` | Dedicated Start/Join landing |
| `#/quick-deal/start` | Eligible owned-listing selector |
| `#/quick-deal/sessions/:sessionId/present` | Initiator QR/join artifact and waiting |
| `#/quick-deal/join` | Camera/manual simulated join entry |
| `#/quick-deal/sessions/:sessionId` | Shared dealing workspace |
| `#/quick-deal/sessions/:sessionId/review` | Final terms and independent confirmation |
| `#/quick-deal/sessions/:sessionId/result` | Order-created, expired, declined, or conflict result |

No public `ListingCard` or public listing detail primary action is labeled Quick Deal. A listing detail may proceed through the normal Direct Booking/Quote/Request mechanism.

### 4.5 Agent routes

| Route | Purpose |
|---|---|
| `#/agent/today` | Agent agenda |
| `#/agent/owners` | Managed Owners |
| `#/agent/owners/:ownerId` | Grant/resources/next actions |
| `#/agent/invitations` | Pending/expired invitation states |
| `#/agent/approvals` | Waiting Owner approvals |
| `#/agent/notices` | Agent-visible attributed history |

Selecting `Work as this Owner` sets `actingForOwnerId`, validates the active grant, and routes to the ordinary `#/me/...` or entity route.

### 4.6 Admin/Operations routes

| Route | Purpose | Minimum mock permission |
|---|---|---|
| `#/ops` | Operations dashboard | `ops.view` |
| `#/ops/queue` | Unified action queue | `ops.view` |
| `#/ops/users` | User/account/capability search | `users.inspect` |
| `#/ops/users/:userId` | Account, roles, grants, restrictions, history | `users.inspect` |
| `#/ops/verifications` | Verification review queue | `identity.review` |
| `#/ops/verifications/:verificationId` | Redacted evidence metadata and decision | `identity.review` |
| `#/ops/listings` | Listing review/moderation queue | `listings.review` |
| `#/ops/listings/:listingId` | Listing/version/Owner/decision history | `listings.review` |
| `#/ops/requests/:requestId` | Request/response inspection | `marketplace.inspect` |
| `#/ops/quotes/:quoteId` | Quote/bid inspection | `marketplace.inspect` |
| `#/ops/orders/:orderId` | Composite Order inspector | `orders.inspect` |
| `#/ops/work/:workId` | Shape-specific Work/evidence/completion inspection | `work.inspect` |
| `#/ops/payments/:obligationId` | Payment Obligation and append-only event inspection | `payments.inspect` |
| `#/ops/evidence/:evidenceId` | Protected evidence metadata, access, scan, and retention state | `evidence.inspect` |
| `#/ops/disputes` | Dispute queue | `disputes.manage` |
| `#/ops/disputes/:disputeId` | Dispute workspace and events | `disputes.manage` |
| `#/ops/holds` | Active/released holds | `holds.manage` |
| `#/ops/incidents` | Safety queue | `safety.manage` |
| `#/ops/incidents/:incidentId` | Restricted incident workspace | `safety.manage` |
| `#/ops/support` | Support cases | `support.manage` |
| `#/ops/failures` | Outbox/notification/evidence/provider failures | `failures.retry` |
| `#/ops/failures/:failureId` | Failure detail and idempotent retry | `failures.retry` |
| `#/ops/outbox` | Outbox, provider-event, idempotency, and reconciliation work | `failures.retry` |
| `#/ops/notifications/:notificationId` | Intent plus delivery attempts | `notifications.inspect` |
| `#/ops/retention` | Retention/legal-hold inspection and approved actions | `retention.manage` |
| `#/ops/cohorts` | Evidence/cohort classification | `cohorts.classify` |
| `#/ops/metrics` | Classification-filtered metrics | `metrics.view` |
| `#/ops/policies` | Policy versions and fixture capability gates | `policies.inspect` |
| `#/ops/audit` | Append-only audit/event search | `audit.view` |
| `#/ops/readiness` | Backup/restore/runbook evidence status | `readiness.view` |

Permission codes above are frontend mock-contract scopes. Production role grouping and approval separation require Gate C approval.

### 4.7 Reviewer/future routes

| Route | Purpose |
|---|---|
| `#/review/scenarios` | Scenario Lab |
| `#/review/future/deal-chaining` | Decision-gated future lab landing |
| `#/review/future/deal-chaining/:planId` | Parent/child concept simulation after Gate D |

Unknown routes and unknown entity IDs render explicit recovery, never Home.

## 5. Deep module architecture

### 5.1 Module boundaries

```text
frontend/src/
├── auth/
│   ├── contracts.ts
│   ├── SessionProvider.tsx
│   ├── route-guards.ts
│   └── pages/
├── onboarding/
│   ├── contracts.ts
│   ├── readiness.ts
│   └── pages/
├── domain/
│   ├── ids.ts
│   ├── aggregates.ts
│   ├── commands.ts
│   ├── events.ts
│   ├── errors.ts
│   └── permissions.ts
├── application/
│   ├── auth-gateway.ts
│   ├── marketplace-gateway.ts
│   ├── operations-gateway.ts
│   ├── query-keys.ts
│   ├── view-models.ts
│   └── activity.ts
├── infrastructure/
│   ├── scenario/
│   │   ├── repository.ts
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── fixtures/
│   │   ├── DeterministicAuthGateway.ts
│   │   ├── DeterministicMarketplaceGateway.ts
│   │   └── DeterministicOperationsGateway.ts
│   └── http/
│       ├── HttpAuthGateway.ts
│       ├── HttpMarketplaceGateway.ts
│       └── HttpOperationsGateway.ts
├── router/
│   ├── route-registry.ts
│   ├── route-parser.ts
│   ├── RouteBoundary.tsx
│   └── guards.ts
├── features/
│   ├── listings/
│   ├── requests/
│   ├── quotes/
│   ├── orders/
│   ├── work/
│   ├── payments/
│   ├── quick-deal/
│   ├── agent/
│   ├── notifications/
│   ├── support/
│   └── operations/
└── review/
    ├── ReviewProvider.tsx
    └── scenario-lab/
```

This is an implementation map, not a requirement to create all files in one task. Deep modules should expose small cohesive interfaces and hide fixture/storage mechanics.

### 5.2 Gateway boundaries

```ts
interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  beginChallenge(input: BeginChallengeInput): Promise<MockChallenge>;
  verifyChallenge(input: VerifyChallengeInput): Promise<AuthSession>;
  signOut(input: SignOutInput): Promise<void>;
  recoverFixture(input: RecoverFixtureInput): Promise<RecoveryResult>;
}

interface MarketplaceGateway {
  getViewerContext(): Promise<ViewerContext>;
  getOnboardingProgress(): Promise<OnboardingProgress>;
  dispatchOnboarding(command: OnboardingCommand): Promise<OnboardingProgress>;
  listDiscovery(input: DiscoveryQuery): Promise<DiscoveryResult>;
  getListing(id: ListingId): Promise<ListingView>;
  listManagedListings(input: ManagedListingQuery): Promise<ListingManagementView>;
  dispatchListing(command: ListingCommand): Promise<ListingView>;
  getRequest(id: RequestId): Promise<RequestWorkspace>;
  listOpenRequests(input: OpenRequestQuery): Promise<OpenRequestResult>;
  dispatchRequest(command: RequestCommand): Promise<RequestWorkspace>;
  dispatchQuote(command: QuoteCommand): Promise<QuoteView>;
  decideQuote(command: DecideQuoteCommand): Promise<OrderView | QuoteView>;
  dispatchAgent(command: AgentCommand): Promise<AgentView>;
  dispatchQuickDeal(command: QuickDealCommand): Promise<QuickDealSessionView>;
  getOrder(id: OrderId): Promise<OrderWorkspace>;
  dispatchWork(command: WorkCommand): Promise<WorkView>;
  reportPayment(command: PaymentReportCommand): Promise<PaymentObligationView>;
  getActivity(input: ActivityQuery): Promise<ActivityView>;
  getNotifications(input: NotificationQuery): Promise<NotificationView>;
}

interface OperationsGateway {
  getDashboard(input: OpsDashboardQuery): Promise<OpsDashboardView>;
  listQueue(input: OpsQueueQuery): Promise<OpsQueueView>;
  inspectUser(id: UserId): Promise<OpsUserView>;
  inspectVerification(id: VerificationId): Promise<VerificationReviewView>;
  inspectListing(id: ListingId): Promise<ListingReviewView>;
  inspectOrder(id: OrderId): Promise<OpsOrderView>;
  inspectDispute(id: DisputeId): Promise<DisputeWorkspaceView>;
  inspectIncident(id: IncidentId): Promise<SafetyIncidentView>;
  inspectFailure(id: FailureId): Promise<FailureView>;
  dispatch(command: OperationsCommand): Promise<OperationsResult>;
  queryAudit(input: AuditQuery): Promise<AuditView>;
  getMetrics(input: MetricQuery): Promise<MetricView>;
}
```

HTTP adapters are compile-time skeletons only until backend work is approved.

## 6. Deterministic repository model

### 6.1 Snapshot

```ts
interface ScenarioSnapshotV2 {
  schemaVersion: 2;
  scenarioId: ScenarioId;
  fixtureClass: EvidenceClass;
  auth: AuthFixtureState;
  review: ReviewFixtureState;
  activeSessionId?: SessionId;
  actingContext?: ActingContext;
  failureVariant?: FailureVariant;
  users: Record<UserId, UserAccount>;
  profiles: Record<UserId, UserProfile>;
  roleAssignments: Record<RoleAssignmentId, RoleAssignment>;
  onboardingProgress: Record<UserId, OnboardingProgress>;
  formalizationProgress: Record<UserId, FormalizationProgress>;
  identityVerifications: Record<VerificationId, IdentityVerificationFixture>;
  consentGrants: Record<ConsentGrantId, ConsentGrant>;
  listings: Record<ListingId, Listing>;
  listingVersions: Record<ListingVersionId, ListingVersion>;
  listingCapacity: Record<CapacityId, ListingCapacity>;
  requests: Record<RequestId, Request>;
  quotes: Record<QuoteId, Quote>;
  quickDealSessions: Record<QuickDealSessionId, QuickDealSession>;
  orders: Record<OrderId, Order>;
  orderTerms: Record<TermsSnapshotId, OrderTermsSnapshot>;
  workInstances: Record<WorkId, WorkInstance>;
  paymentObligations: Record<PaymentObligationId, PaymentObligation>;
  evidence: Record<EvidenceId, EvidenceFixture>;
  disputes: Record<DisputeId, Dispute>;
  holds: Record<HoldId, AdministrativeHold>;
  supportCases: Record<SupportCaseId, SupportCase>;
  safetyIncidents: Record<IncidentId, SafetyIncident>;
  notifications: Record<NotificationId, Notification>;
  notificationDeliveries: Record<DeliveryId, NotificationDelivery>;
  outboxMessages: Record<OutboxId, OutboxMessage>;
  cohortClassifications: Record<ClassificationId, CohortClassification>;
  policyVersions: Record<PolicyVersionId, PolicyVersion>;
  auditEvents: AuditEvent[];
  versions: Record<AggregateKey, number>;
}
```

`OnboardingProgress`, `FormalizationProgress`, and `QuickDealSession` are explicitly fixture-only until upstream schema decisions exist.

### 6.2 Storage and migration

- Use bounded `localStorage` through a `StorageAdapter`.
- Never let components parse or write stored JSON.
- Persist schema version, active product session, acting context, entities, versions, events, and failure variant.
- Migrate v1 singleton `order`, `quickDeal`, and `plan` into normalized maps where safe.
- If migration cannot preserve meaning, show an explained reset rather than mixing versions.
- Reset supports whole-scenario and, where useful, feature-fixture reset.
- Reset is a reviewer action, not a consumer account setting.

### 6.3 Commands

Every state-changing command includes:

- `commandId`/idempotency key;
- product session actor ID;
- optional acting-for Owner ID;
- optional consent-grant ID;
- target aggregate type and ID;
- expected aggregate version;
- payload;
- correlation ID;
- fixture/evidence class; and
- client timestamp for display only.

The repository:

1. authenticates the mock session;
2. checks route/command permission;
3. checks acting-for grant and resource scope;
4. checks expected version;
5. checks domain guards;
6. applies one deterministic transition;
7. appends an audit/domain event;
8. creates notifications/outbox intents where required;
9. persists atomically; and
10. returns a typed result.

## 7. Mock authentication and session design

### 7.1 Auth state

```ts
type AuthStatus =
  | "signed_out"
  | "challenge_pending"
  | "authenticated"
  | "onboarding_required"
  | "expired"
  | "suspended";

interface AuthSession {
  id: SessionId;
  userId: UserId;
  source: "mock_login" | "reviewer_override";
  status: AuthStatus;
  capabilityCodes: CapabilityCode[];
  issuedAt: string;
  expiresAt: string;
  lastAuthorizedRoute?: string;
  fixtureClass: EvidenceClass;
}
```

### 7.2 Login flow

1. User enters a fictional phone/login identifier.
2. Deterministic adapter finds the fixture account or returns a safe unknown-account state.
3. Adapter creates a fixture challenge with expiry and `deliveryStatus: simulated_not_sent`.
4. Screen says clearly: `Demo only — no SMS was sent`.
5. User enters the fixture code; reviewer build may expose `Use demo code` behind a persistent reviewer label.
6. Verification creates a local mock session.
7. If onboarding is incomplete, route to `#/onboarding`; otherwise return to the original authorized route or Home.

No plaintext password, real phone, hidden secret, or production token is stored.

### 7.3 Demo accounts

Minimum fixture accounts:

- new Buyer with incomplete onboarding;
- self-managed Provider/Owner with listings;
- low-literacy/Agent-assisted Owner;
- Agent with one active and one revoked grant;
- Buyer with open request and quotes;
- Provider with submitted quote;
- Admin read-only operator;
- Admin reviewer/supervisor with selected scopes;
- suspended account; and
- account with expired mock session.

The account chooser is reviewer-only. Consumer UI sees the identifier/challenge flow.

### 7.4 Guards and recovery

- Signed-out state-changing route → login with return route.
- Authenticated but incomplete onboarding → readiness/onboarding route.
- Missing capability → blocked-state page with next setup action.
- Missing/expired grant → exit acting context and explain.
- Missing Admin capability/scope → deny without revealing protected queue data.
- Expired session → preserve safe draft, route to expiry page, re-login, revalidate stale versions.
- Suspended account → block state-changing commands and show support path.
- Logout clears only current product session and acting context; shared scenario facts remain for reviewer testing.

## 8. Progressive onboarding design

### 8.1 Common steps

1. Welcome and prototype boundary.
2. Mock account confirmation.
3. Basic profile: display name, safe Tagudin area, language.
4. Access preferences: readability, low-data, help/assistance.
5. Capability intent: `I need something`, `I offer something`, `I help another person`; choices are additive.
6. Consent/privacy explanation relevant to chosen path.
7. Setup path: self-managed or Agent-assisted.
8. Identity requirement/review fixture when applicable.
9. Formalization education/progression for Provider/Owner path.
10. Readiness summary.

### 8.2 Buyer path

Minimum completion:

- mock account confirmed;
- basic profile and safe area;
- request capability enabled;
- public/privacy explanation acknowledged.

A Buyer may browse before full Provider setup. State-changing actions still require a product mock session.

### 8.3 Self-managed Provider/Owner path

Additional steps:

- provide capability intent;
- listing type/scope readiness explanation;
- identity requirement and fixture status;
- category/safety restrictions;
- draft-listing route;
- formalization progression shown as separate optional/policy-gated track.

If identity review is pending, the user may save a listing draft but cannot receive a false active-publication success.

### 8.4 Agent-assisted Owner path

- Owner profile may be prepared by an Agent only as a draft.
- Owner mock account/phone identity remains separate.
- Invitation identifies Agent, purpose, resources, actions, duration, notices, and revocation.
- Owner confirms the grant through simulated consent.
- Owner may later log in independently and inspect/correct/revoke.
- Agent-created listing remains Owner-owned and may require Owner approval before publication.

### 8.5 Agent path

- mock account and profile;
- Agent-interest capability;
- identity-review fixture;
- assistance boundary/training explanation;
- Admin approval fixture if required;
- no active Owner data before a consent grant;
- Today hub only after an eligible grant/task exists.

No user can self-assign Admin capability during onboarding.

### 8.6 Onboarding state and recovery

```ts
type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "review_pending"
  | "action_required"
  | "ready";
```

Each step stores completion, last safe route, validation issues, and fixture classification. Draft progress survives refresh. Missing required data returns to the exact step. Policy or backend-dependent actions show conditional state, not fake completion.

## 9. Formalization progression design

Formalization is not identity verification.

```ts
type FormalizationStatus =
  | "not_started"
  | "learning"
  | "evidence_pending"
  | "review_pending"
  | "action_required"
  | "approved_fixture"
  | "policy_blocked";
```

The frontend may show three conceptual stages—Entry, Growth, Registered Business—only with these restrictions:

- no unverified tax exemption statement;
- no invented income/payout cap;
- no badge or ranking promise;
- no production document collection;
- no implication that Serbizyu supplies legal/tax advice;
- exact evidence and unlocks come from an approved policy version;
- current fixture defaults to `policy_blocked` or clearly fictional review state.

The screen shows:

- current conceptual stage;
- why progression may be useful;
- verified versus unresolved requirements;
- legal/policy review status;
- optional next action;
- help/offline assistance;
- retention/access meaning for any future evidence; and
- no penalty for remaining at an allowed entry stage.

Admin may inspect the fixture state but cannot approve production formalization until Gate A passes.

## 10. Listing management and shared delegated routes

### 10.1 My Listings

The list supports:

- current Owner context;
- owned versus delegated-management attribution;
- Service/Product type;
- lifecycle state;
- capacity/availability summary;
- latest published and draft versions;
- review/approval blockers;
- one next action;
- search/filter by state; and
- truthful empty state.

### 10.2 Creation/editor stages

1. Choose Service or Product Listing.
2. Scope/category and safe title.
3. Description/inclusions/exclusions.
4. Price/quote semantics.
5. capacity/availability or schedule.
6. area/handoff/online delivery.
7. Work shape and evidence expectations.
8. payment-lane availability explanation.
9. safety/data class requirements.
10. Buyer preview.
11. save draft or submit review.

Draft input survives refresh and validation failure.

### 10.3 Lifecycle

`draft → pending_review → active → paused/unavailable/expired → archived`, with rejected and corrected/resubmitted paths.

- Owner may edit draft.
- Published changes create a new version; they do not mutate accepted Order terms.
- Agent may edit only within grant/resource scope.
- Agent publication may create an Owner approval task rather than publish directly.
- Admin approve/reject/request-information requires permission and reason.
- Active capacity cannot go negative.
- Archive is blocked when an unresolved dependency prohibits it.

### 10.4 Acting-for context

Persistent banner contents:

- `Helping [Owner]`;
- Agent identity;
- active grant reference;
- expiry;
- permitted actions;
- approval-required actions;
- forbidden actions;
- notification behavior; and
- `Exit Owner workspace`.

The same listing editor component receives a `ViewerContext` and command availability. It does not branch into a separately maintained Agent editor.

## 11. Agent Assistance design

### 11.1 Agent Today

Sections:

- Needs action now
- Waiting for Owner approval
- Due today
- Overdue or grant expiring
- Waiting for Buyer/Provider
- Completed today

Every task shows Owner, resource, state change, next action, grant status, approval requirement, and blocked reason.

### 11.2 Managed Owners

Each card shows:

- Owner name and safe area;
- active/suspended/revoked grant;
- permitted resources;
- pending approvals;
- critical notices;
- last attributed action;
- enter Owner workspace; and
- no private details outside grant scope.

### 11.3 Owner approval and SMS simulation

An approval request includes:

- Agent;
- affected Owner;
- exact resource/version;
- proposed action and consequence;
- difference from previous version;
- permission used;
- expiry;
- approve, decline, revoke, report/help.

Notification records are real deterministic objects. Delivery attempts may show:

- in-app delivered;
- SMS simulated queued;
- SMS simulated delivered;
- SMS simulated failed;
- retry scheduled;
- fallback/help required.

Every SMS simulation says no real message was sent. STOP/REVOKE fixture replies may be demonstrated, but inbound provider callback, OTP parsing, replay prevention, and correlation remain backend/schema decisions.

### 11.4 Forbidden actions

Agent assistance never grants:

- Owner credential access;
- Owner identity ownership;
- listing/order ownership transfer;
- payment recipient change by default;
- cash or goods custody;
- payout/release authority;
- unrestricted sensitive evidence access;
- Admin capability; or
- action after grant revocation/expiry.

## 12. Request, response, quote, and bidding design

### 12.1 Buyer request lifecycle

- draft;
- published/open;
- clarification active;
- responses available;
- selected/Order created;
- expired;
- cancelled/closed.

Exact lifecycle codes must match the canonical backend decision when implemented; the frontend view must not merge request status with quote status.

### 12.2 Provider discovery

`Open Requests` shows:

- Service versus Product Request;
- scope/item summary;
- budget meaning;
- timing/area;
- safety/privacy boundary;
- response expiry;
- responder eligibility;
- current Owner context;
- whether an existing response exists;
- blocked reason; and
- one action: inspect/respond/update response.

### 12.3 Quote/bid composer

Fields:

- short response/introduction;
- scope;
- inclusions/exclusions;
- amount components and total meaning;
- schedule/availability;
- validity/expiry;
- Work shape;
- payment-lane options;
- evidence expectation;
- assumptions/alternatives;
- withdrawal/change meaning; and
- Owner/Agent attribution.

A competitive response may be labeled Bid in user-facing copy, while the data object remains a versioned Quote.

### 12.4 Provider/Agent response states

- draft;
- submitted/current;
- clarification requested;
- replaced/superseded;
- withdrawn;
- expired;
- declined;
- accepted.

Updating submitted terms creates a new quote version and notifies the Buyer. It does not mutate the prior version.

### 12.5 Buyer response inbox and comparison

Comparison shows:

- scope differences;
- total and amount components;
- inclusions/exclusions;
- schedule;
- validity;
- Work shape;
- lane/protection meaning;
- evidence expectations;
- truthful Provider history/status;
- clarification state; and
- changed/expired warning.

Do not invent a “best provider,” trust score, automatic rank, or award. Buyer explicitly opens and accepts one current quote.

### 12.6 Acceptance

Acceptance:

1. revalidates request and quote versions;
2. shows final terms and lane meaning;
3. confirms parties;
4. creates one immutable Order terms snapshot;
5. creates separate Work and Payment Obligation records as applicable;
6. marks the selected quote accepted;
7. handles other responses only by explicit fixture rule;
8. creates Activity and notifications; and
9. links all entity IDs in history.

Expired, withdrawn, superseded, or stale quotes cannot be accepted.

## 13. Standalone Quick Deal design

### 13.1 Entry contract

Quick Deal begins at `#/quick-deal`.

Two choices:

- **Start a deal** — Owner/Provider or authorized Agent selects an eligible owned listing.
- **Join a deal** — Buyer/recipient scans or manually opens a simulated join artifact.

Buyer Browse does not expose Quick Deal actions.

### 13.2 Session model

```ts
type QuickDealStatus =
  | "selecting_listing"
  | "waiting_for_recipient"
  | "recipient_review"
  | "negotiating"
  | "awaiting_reconfirmation"
  | "ready_to_confirm"
  | "confirmed"
  | "order_created"
  | "declined"
  | "left"
  | "expired"
  | "conflicted";

interface QuickDealSession {
  id: QuickDealSessionId;
  sourceListingId: ListingId;
  sourceListingVersionId: ListingVersionId;
  initiatorOwnerId: UserId;
  initiatorActorId: UserId;
  buyerId?: UserId;
  status: QuickDealStatus;
  listedTerms: QuickDealTerms;
  proposedTerms: QuickDealTerms;
  proposalRounds: QuickDealProposal[];
  confirmations: ParticipantConfirmation[];
  joinArtifact: SimulatedJoinArtifact;
  expiresAt: string;
  version: number;
  resultingOrderId?: OrderId;
  transportState: SimulatedTransportState;
  conflictReason?: string;
}
```

This model is frontend fixture-only until Gate B.

### 13.3 Owned-listing selection

Selector shows only listings:

- owned by the active Owner context;
- manageable under the active grant if Agent;
- active/current;
- capacity/availability eligible;
- Quick Deal-compatible under current fixture policy.

A listing card selection creates no Order. It starts a session based on one immutable listing version.

One-listing versus bundle cardinality remains unresolved. Initial fixture behavior SHALL use one listing unless founder approval changes it.

### 13.4 Present/join

Initiator view shows:

- selected listing and Owner;
- listed terms;
- simulated QR/join code;
- expiry;
- waiting state;
- cancel/leave;
- camera/QR simulation disclosure.

Recipient join view shows:

- who is offering;
- listing summary;
- current terms;
- session reference;
- join/decline;
- safety/cash boundary; and
- no auto-acceptance.

### 13.5 Negotiation

Allowed fixture adjustments may include:

- price;
- quantity;
- scope;
- schedule;
- inclusions;
- add-ons; and
- notes allowed by policy.

Each material proposal records actor, prior terms, proposed terms, timestamp, and version. It clears prior confirmations and requires both sides to re-review.

Tailoring is session-local. A later `Save as listing draft/version` action is separate and cannot silently update public supply.

### 13.6 Confirmation and Order formation

- Buyer and Seller/Owner confirm independently.
- Agent may act for Owner only if the grant permits the exact action.
- Same actor cannot satisfy both sides through product UI.
- Confirmation uses expected session version.
- Duplicate confirmation is idempotent.
- Two valid confirmations create one normal Order and immutable accepted snapshot.
- Payment Obligation remains unresolved.
- Quick Deal receipt is not payment proof.
- Activity and notifications link to the new Order.

### 13.7 Recovery

Required deterministic branches:

- no eligible listings;
- stale/paused listing;
- insufficient capacity;
- recipient mismatch;
- recipient declines;
- either party leaves;
- proposal version conflict;
- session expiry;
- camera permission denied;
- camera unavailable;
- transport retry;
- duplicate confirmation;
- local receipt pending conflict resolution; and
- Order creation retry with idempotency.

## 14. Orders, Work, Payment, evidence, and Activity

The Order screen composition is:

1. Context and relationship
2. Accepted immutable terms
3. One next action
4. Separate Work panel
5. Separate Payment Obligation panel
6. Evidence and revisions
7. Messages/support
8. Dispute/Hold state
9. Attributed timeline

No panel transition silently transitions another aggregate.

First proving slice remains one A1 + External Cash journey:

`listing or accepted quote/Quick Deal → Order → Work start → evidence/revision → independent cash declarations → completion proposal → Buyer sign-off/concern → close guard → history`.

Activity derives:

- Needs action
- Waiting
- History

Each card includes entity ID, relationship, other actor, state meaning, next action, due/expiry when canonical, waiting/blocked actor, and truthful fixture/deferred status.

## 15. Admin/Operations design

### 15.1 Operations dashboard

Dashboard cards are derived from actual repository state:

- identity reviews awaiting action;
- listings awaiting review;
- active disputes;
- active holds;
- high-severity safety incidents;
- failed critical notifications/outbox tasks;
- stale provider/sandbox events;
- support queue;
- capability gates disabled;
- evidence/cohort records needing classification; and
- mock operational-readiness warnings.

No card is a static dead control.

### 15.2 Unified queue

Queue item fields:

- queue type;
- severity/priority without invented SLA;
- affected entity;
- requester/actors;
- age/expiry when canonical;
- assigned mock operator;
- evidence/data class;
- blocked reason;
- one next action;
- permission requirement; and
- current version.

Filters preserve URL/query state and have clear empty/error states.

### 15.3 User/account inspection

Shows:

- account status;
- safe profile data;
- capabilities/role assignments;
- access tier;
- identity-review status;
- Agent grants as grantor/grantee;
- restrictions/holds;
- cohort classification;
- notices/support history;
- attributed audit events.

Sensitive values are redacted. The mock contains metadata/placeholders only, never real government ID images.

High-risk capability grant/suspend actions require permission, explicit reason, expected version, confirmation, and audit event. Admin cannot become the user or use consumer commands as them.

### 15.4 Identity review

Review workspace shows:

- user and requested verification type;
- current state;
- consent/retention explanation;
- redacted evidence metadata;
- scan/fixture status;
- prior decisions;
- request more information;
- approve fixture;
- reject with reason;
- suspend/reopen where policy permits;
- access audit.

A fixture approval never claims real identity verification. Public trust labels derive only from explicitly performed fixture review and remain marked fictional.

### 15.5 Listing moderation

Shows listing, current/pending versions, Owner/Agent attribution, category/capability/safety/data rules, capacity, previous decisions, and Buyer preview.

Commands:

- approve fixture publication;
- reject with reason;
- request corrections/information;
- pause/disable under approved safety/policy reason;
- resume after conditions pass.

Admin cannot rewrite Owner content, accepted Order terms, or history silently.

### 15.6 Request/quote/Order inspector

Admin inspection preserves separate:

- Request;
- quote versions;
- selected quote;
- Order terms snapshot;
- Work;
- Payment Obligations;
- evidence;
- disputes/holds;
- notifications;
- audit events.

Admin may open support, place a permitted hold, or initiate an explicit correction/cancellation path. It cannot edit immutable terms or mark cash paid/received for a party.

### 15.6a Work, Payment Obligation, and Evidence inspectors

Work inspection shows shape, validated payload, status, schedule, evidence expectations, work events, completion proposal, sign-off, dispute/hold effect, and linked Order/Payment records. It never derives completion from payment.

Payment inspection shows purpose, amount/currency, lane, due condition, payer/recipient responsibility, policy/terms snapshot, append-only party/provider events, evidence state, corrections/supersession links, and reconciliation state. It exposes no `edit balance`, `mark paid as party`, or direct posted-entry mutation.

Evidence inspection shows uploader/actor, subject event, media metadata, hash/reference, synthetic scan state, data/visibility class, acceptance/rejection reason, retention/legal hold, access history, and safe resubmission. The deterministic frontend uses metadata/placeholders only. Evidence acceptance does not automatically complete Work or confirm Payment.

Sensitive P3/P4 fixture details are redacted by default. Viewing a protected field requires an approved proposed scope such as `identity.sensitive_view` or `evidence.sensitive_view`, a reason where policy requires it, and an access-audit event. Exact redaction fields and retention durations remain Gate C decisions.

### 15.6b Sandbox payment and protected-release boundary

Direct Digital and Tiwala Protected Digital remain sandbox/demo-only. An authorized sandbox operations view may inspect release eligibility, but any simulated release command must show and revalidate:

1. correct pre-release obligation state;
2. completed eligible Work;
3. valid sign-off or approved review-expiry eligibility;
4. no active dispute;
5. no active administrative hold;
6. provider/ledger reconciliation;
7. immutable policy/terms snapshot;
8. no prior release;
9. concurrency/idempotency protection; and
10. one attributable release event.

No static frontend success may imply live custody, escrow, payout, refund, balance change, or legal protection. Posted financial entries are never directly edited; fixture corrections create linked append-only records.

### 15.7 Disputes and holds

Dispute workspace shows:

- reporter/parties;
- affected aggregates;
- reason/category/severity;
- requested remedy;
- evidence metadata;
- immutable events;
- active holds;
- prior resolutions;
- current owner/operator;
- next safe action.

Commands:

- assign;
- request evidence/information;
- place/release permitted hold;
- resolve/reject/close with reason and explicit downstream effects;
- record appeal/reopen if policy permits.

Resolution does not automatically refund External Cash or erase reports. Every affected aggregate consequence is shown before confirmation.

### 15.8 Safety incidents

Restricted workspace shows minimum necessary data, access reason, related listing/Order/meeting, severity, current restrictions, response status, and audit.

Commands may include permitted block/restrict/hold/escalate/close fixtures. The UI does not invent emergency-service response or disclose sensitive information broadly.

### 15.9 Failure recovery

Failure queue covers:

- notification delivery;
- evidence processing;
- outbox publication;
- provider/sandbox event;
- scheduled job fixture.

It also exposes duplicate and out-of-order provider events, reconciliation mismatches, and duplicate-idempotency-key conflicts. Reconciliation never trusts an unverified screenshot/reference as provider verification and never duplicates a financial effect.

Failure detail shows intent, source event, target, attempts, last error class, next retry, idempotency key, current domain effect, and support owner.

Retry:

- requires permission and reason where high-risk;
- is idempotent;
- does not duplicate domain effect;
- appends an audit event;
- may fail again deterministically;
- never edits the original event.

### 15.10 Cohort and metrics

Cohort classification distinguishes:

- CAPSTONE
- SANDBOX
- TEAM_TRAINING
- GENUINE_PILOT
- support/other classes only if canonical

All default frontend fixtures are CAPSTONE, SANDBOX, or TEAM_TRAINING. None are GENUINE_PILOT.

Classification correction requires reason and audit. Metrics always expose active filters and sample counts. External Cash mock Orders produce no platform revenue.

### 15.11 Policies and kill switches

Policy page is primarily read-only:

- policy key/version/status/effective range;
- fixture capability profile;
- affected routes/actions;
- current enabled/disabled status;
- audit history.

Mock kill switches may disable:

- Agent commands;
- Quick Deal initiation;
- request response/bidding;
- sandbox payment adapters;
- selected capability/provider paths.

Every change requires permission, reason, expected version, confirmation, and audit. No page creates new financial rates, deadlines, legal requirements, or refund rules.

### 15.12 Operational readiness

Readiness screen may display fictional/checklist evidence for:

- last scenario migration/reset;
- last production build test;
- last fixture restore rehearsal;
- failed queue count;
- policy gate status;
- unresolved planning gates.

It cannot execute or claim real database backup/restore, infrastructure health, provider reconciliation, or incident runbook completion.

## 16. Future Deal-Chaining lab design

### 16.1 Entry boundary

The lab is accessible only from reviewer future-capability routes and carries persistent:

- the approved four-table coordination foundation as a planning dependency;
- deferred user-facing functionality and fictional data;
- no pooled money;
- no liability/escrow/protection promise; and
- no pilot-activation claim.

### 16.2 Parent workspace concept

For the later bounded lab, after the separate Gate D future-feature decision, the parent view contains:

- coordination goal;
- owner/coordinator;
- target date/location;
- child needs/slots;
- dependencies;
- invitation/open-call state;
- assigned provider;
- child agreement/Order references;
- estimated versus accepted costs;
- child progress;
- blocked/failed/disputed states;
- responsibility summary; and
- aggregate progress that never replaces child state.

### 16.3 Acquisition variants

The approved foundation supports two bounded sourcing paths for a later story: an open Need that reuses existing Request/Quote workflows, or a Need-specific invitation. This OpenSpec records the distinction for traceability only; it does not implement either path, add a new bidding primitive, or decide pilot activation.

### 16.4 Child independence

Each accepted child creates or links an independently inspectable agreement/Order with separate:

- parties;
- terms;
- Work;
- Payment Obligation;
- evidence;
- dispute;
- cancellation/replacement; and
- history.

No parent total is shown as held funds. One child failure does not silently cancel unrelated children.

## 17. Typed error and recovery contract

Every gateway command/query may return:

- validation error with field/action correction;
- authentication required;
- session expired;
- account suspended;
- capability missing;
- permission/grant denied;
- sensitive-data access denied;
- entity not found;
- stale version/conflict;
- expired request/quote/grant/session;
- offline/unavailable;
- retryable service failure;
- unsupported/deferred capability;
- invariant violation.

Screens render stable recovery—not transient toast only. Draft/user input remains when safe. Stale confirmations force re-review. High-impact unknown outcomes show pending/reconciliation instead of success.

## 18. Accessibility, low-literacy, and responsive contract

- 360px, 375px, tablet, and desktop acceptance.
- Approximately 48px minimum primary touch targets.
- One obvious primary action per panel.
- Icon plus concrete text.
- Short, plain Filipino/English-ready copy.
- Visible focus and logical keyboard order.
- Dialog focus trap and restoration.
- Status never color-only.
- Bottom navigation never covers content/sticky actions.
- Reduced motion for nonessential animation.
- Camera/QR animation can pause and has manual simulated alternative.
- Amount, actor, consequence, and custody meaning appear before confirmation.
- Admin tables collapse to cards/summary-first patterns at narrow widths without hiding consequential data.
- SMS fixture copy remains plain and concise; exact 160-character production constraint belongs to the future messaging adapter.

## 19. Verification architecture

### 19.1 Test layers

1. Contract/unit tests for IDs, guards, commands, versions, migrations, readiness, permission derivation, query keys, and invariants.
2. Component tests for forms, blocked states, acting banner, confirmation, queue cards, and accessible interaction.
3. Production-artifact Playwright journeys.
4. Published GitHub Pages smoke and selected journey reruns.

### 19.2 Required browser scenarios

- mock login success, unknown account, wrong/expired code, session expiry, logout, resume intended route;
- Buyer onboarding and self-managed Provider readiness;
- Agent-assisted Owner invite/grant/notice/revoke;
- Admin route allowed/denied by scope;
- listing create/preview/submit/review/activate/pause under Owner and Agent contexts;
- request publish → Provider/Agent response → Buyer comparison → acceptance → Order;
- Quick Deal Start → listing select → present → Buyer join → negotiate → re-confirm → Order/Activity;
- stale/expired Quick Deal and duplicate confirmation;
- SCN-01 Order/Work/External Cash independence;
- Admin identity review, listing moderation, dispute/hold, notification retry, cohort correction, and audit;
- refresh persistence and deterministic reset;
- 360/375px no-overlap; and
- no console/runtime errors.

### 19.3 No-dead-control test

Automated browser traversal SHALL inventory visible interactive controls on selected routes. Each control must:

- navigate;
- dispatch a testable command;
- open a meaningful disclosure/dialog; or
- be disabled with persistent reason and next step.

## 20. Backend replacement matrix

| Concern | Deterministic frontend now | Contract-ready now | Authoritative backend later |
|---|---|---|---|
| Auth | fictional challenge/session | auth/session/error contracts | credentials, OTP, secure session, recovery |
| Onboarding | persisted fixture progress | capability/readiness contracts | durable account/consent workflows |
| Identity | metadata and fictional states | review/access/retention contracts | secure collection, review, storage |
| Formalization | educational/policy-gated fixture | separate state boundary | approved legal policy and schema |
| Listings | deterministic lifecycle | command/version/view contracts | durable data, policy enforcement |
| Agent | consent/grant/attribution simulation | acting-for command guards | authoritative authorization and delivery |
| SMS/notices | intent/delivery fixtures | notification/fallback contracts | provider integration and inbound command security |
| Requests/bids | request/quote fixtures | stable IDs/versions/acceptance | durable anti-spam/eligibility/concurrency |
| Quick Deal | fixture session/proposals | session/offer/confirmation/Order contracts | secure transport, expiry, sync authority |
| Orders/Work/Payment | deterministic aggregates | independent commands/events | database transactions/ledger/providers |
| Admin | scoped fixture commands | permissions/reasons/audit/error contracts | authoritative operations and sensitive access |
| Deal Chaining | approved four-table foundation only; no feature route | deferred-feature/child-isolation gate | approved schema/domain/ADR foundation; later bounded story and pilot activation remain separate |

## 21. Implementation stop conditions

Stop and reopen planning if implementation requires:

- real-looking formalization claims without Gate A;
- multi-listing Quick Deal or persisted backend session without Gate B;
- new Admin powers/approval rules without Gate C;
- Deal-Chaining user-facing feature, open-Need UX, or activation without the separate future story and Gate D;
- new payment rates, fees, release, refund, or custody promises;
- new identity evidence or retention assumptions;
- a global Buyer/Provider role selector;
- Agent impersonation or credential sharing;
- source-only acceptance instead of browser evidence; or
- a second page implementation for the same Owner resource merely because the actor is an Agent.
- choosing identifier storage/type from the ambiguous canonical-schema note instead of the implementation contract; `07-schema-implementation-and-erd-contract.md` currently fixes UUIDv7/native UUID and must control generated frontend IDs until the artifacts are formally reconciled.
