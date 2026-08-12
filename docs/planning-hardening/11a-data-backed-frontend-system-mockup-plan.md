# Serbizyu 2.0 — Data-Backed Frontend System Mockup Plan

Status: DRAFT PLANNING INPUT — founder clarification recorded; upstream PRD/UX decisions still required
Date: 2026-08-01
Branch: `planning-hardening`
Artifact type: ERD-backed mockup planning checklist
Authority: downstream of the canonical schema/ERD and the founder review table; this file does not authorize backend implementation or schema changes
Depends on:

- `docs/planning-hardening/11-founder-frontend-review-and-replanning-table.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`
- `docs/planning-hardening/07-canonical-erd.svg`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`

## 1. Purpose

The next frontend reference must capture the actual Serbizyu system before backend implementation. It must use the canonical entities and relationships wherever they already exist, and label fixture-only planning state wherever the ERD does not yet provide an approved aggregate.

The reference is not a gallery of disconnected pages. It must demonstrate coherent cross-role consequences:

- the same listing seen by Owner, delegated Agent, and Buyer;
- the same request and quote/bid seen by requester and responder;
- the same accepted terms becoming one Order;
- the same Agent action producing Owner-visible history and notification;
- the same onboarding/progression state controlling reachable actions;
- the same Quick Deal session producing one accepted Order snapshot.

No real backend, authentication, SMS, QR transport, identity-document collection, or payment integration is required for this reference.

## 2. Validated canonical ERD support

The rendered ERD and schema contract contain the following relevant relationships:

- `users` owns/relates to `user_profiles`, `role_assignments`, `identity_verifications`, `evidence_files`, `consent_grants`, `listings`, `requests`, `notifications`, `conversations`, and `cohort_classifications`.
- `categories` and `capability_profiles` govern `listings`.
- `listings` owns `listing_versions` and optional `listing_capacity` and can source an `order`.
- `requests` receives `quotes`; a request or accepted quote can source an `order`.
- `orders` has `order_parties`, `order_terms_snapshots`, `work_instances`, `payment_obligations`, conversations, reviews, support, disputes, and audit history.
- `work_instances` owns `work_events` and can be associated with safety/dispute evidence.
- `notifications` owns `notification_deliveries`; `outbox_messages` records asynchronous publication intent.
- `audit_events` records attributable actions and cross-aggregate causality.

The canonical ERD does **not** currently contain:

- a pre-Order Quick Deal session/proposal aggregate;
- a formalization/regulatory-progression aggregate;
- a parent/child Deal-Chaining relationship or coordination aggregate;
- an explicitly named inbound SMS command/OTP aggregate;
- a separate `bids` table.

These absences must not be hidden by mockup visuals.

## 3. UX-to-data mapping table

| UX area | Existing canonical entities that support it | What the mock may demonstrate now | Contract/schema gap that must remain visible |
|---|---|---|---|
| Account and capability onboarding | `users`, `user_profiles`, `role_assignments`, `cohort_classifications` | Fictional phone confirmation, profile, locale/access choice, additive Buyer/Provider/Agent capabilities, readiness summary | Exact account-recovery and capability-grant policy still needs implementation stories |
| Identity review | `identity_verifications`, `evidence_files`, `audit_events` | Fixture-only evidence, pending/more-info/approved/rejected states, manual-review fallback, public/private result boundary | No live sensitive evidence; legal/privacy gate remains closed |
| Agent delegation | `consent_grants`, `users`, `listings.owner_user_id`, `listing_versions.authored_actor`, `audit_events`, `notifications`, `notification_deliveries` | Owner invitation, scoped permission, Agent acting for Owner, permission-aware controls, Owner history/notices, pause/revoke | Grant resource/action vocabulary and inbound SMS command correlation need exact contract decisions |
| Owner/Provider listing management | `listings`, `listing_versions`, `listing_capacity`, `categories`, `capability_profiles` | My Listings, draft/edit/preview/review/active/paused/unavailable/archive, stock/slots/capacity, immutable published versions | Exact category-specific field schemas remain versioned payload decisions |
| Request creation | `requests`, `users`, `categories`, `capability_profiles` | Service/Product Request composition, privacy/safety, budget/timing, publish/expiry | Open-offer/Deal-Chaining tag semantics remain unresolved |
| Quote and Reverse Bidding response | `requests`, `quotes`, `orders`, `order_terms_snapshots` | Provider/Agent response, revision, withdrawal, expiry, clarification, Buyer comparison, acceptance/decline, accepted Order | No separate `bids` entity is needed unless a later lifecycle proves `quotes` insufficient |
| Quick Deal accepted result | `listings`, `listing_versions`, `listing_capacity`, `orders`, `order_parties`, `order_terms_snapshots`, `idempotency_keys`, `audit_events` | Select owned listing, negotiate a derived proposal, dual confirmation, accepted normal Order, retry-safe mock consequence | Pre-Order session/join/QR/proposal/expiry history is not represented by an approved aggregate |
| One-off listing tailoring in Quick Deal | `listing_versions` as immutable source; `order_terms_snapshots` as immutable accepted result | Fixture-only adjustments to price, quantity/scope, schedule, inclusions/add-ons, with reconfirmation | Where mutable pre-acceptance proposal versions live is unresolved; public listing must not be mutated |
| Owner SMS/notices | `notifications`, `notification_deliveries`, `outbox_messages`, `messages`, `audit_events` | Outbound notice intent, delivery attempt/status, critical Owner update, fixture reply and resulting consent state | Inbound SMS provider event, OTP/keyword parsing, replay/expiry, and correlation contract is not explicit in the current ERD |
| Regulatory Formalization Ladder | Identity/evidence/policy entities provide only partial supporting concepts | A clearly labeled planning fixture can show optional progression intent and blocked/legal-gated lane details | Current ERD has no formalization profile/status/evidence relationship; do not overload identity verification |
| Deal-Chaining | Approved `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations` plus Request/Quote/Order lineage | Foundation contract is canonical; later bounded lab/functionality remains separately labeled and outside pilot navigation | Parent plan, Need-specific invitation/open Request/Quote sourcing, dependency cycle rules, roll-up, cancellation/replacement, dispute isolation, and child-Order boundaries follow the propagated domain/schema contract |

## 4. Required connected mockup experiences

### 4.1 Progressive onboarding and access

| Mock ID | Experience | Required states/consequences |
|---|---|---|
| ONB-001 | Welcome and capability intent | Find work, offer service/product, request something, help as Agent; capabilities are additive, not permanent exclusive roles |
| ONB-002 | Fictional phone/account confirmation | Code fixture, invalid/expired/retry, no claim that a real SMS was sent |
| ONB-003 | Consent, profile, language, and access setup | Required/optional data, purpose, retention/help, Tagudin context, low-data/assistance needs |
| ONB-004 | Self-managed or assisted setup | Provider can continue independently or request Agent assistance; Owner account remains independently accessible |
| ONB-005 | Identity requirement and review | Fixture evidence only, pending/more-info/approved/rejected/manual-review states, public/private distinction |
| ONB-006 | Capability readiness summary | What is enabled, conditional, blocked, why, and next safe action |
| ONB-007 | Formalization progression entry | Optional progression intent; exact legal lane requirements/benefits visibly marked pending source-backed approval |
| ONB-008 | Return/recovery | Resume saved fictional progress, change assistance choice, contact support, avoid dead ends |

Onboarding acceptance rule: completing Buyer setup must not prevent later Provider setup. Adding Provider capability must not silently add Agent, custody, money, or publication authority.

### 4.2 Shared Owner/Provider/Agent management experience

The product should have one ordinary management surface, not separate Owner and Agent copies.

| Mock ID | Experience | Required states/consequences |
|---|---|---|
| MKT-001 | My Marketplace home | My Listings, My Requests, Buyer Orders, Provider Orders, notices, next action; no global Buyer/Provider mode toggle |
| LST-001–007 | My Listings lifecycle | Existing canonical rows remain required: list/create/draft/edit/preview/review/active/paused/unavailable/archive/capacity |
| AGT-HUB-001 | Agent hub | Managed Owners, grant status/expiry, tasks needing action, approvals, notices, blocked/revoked grants |
| AGT-CTX-001 | Enter Owner context | Select one authorized Owner, show persistent `Acting for [Owner]`, grant summary, and exit/switch control |
| AGT-CTX-002 | Shared listing screen under delegation | Same listing UI as Owner; controls enabled/approval-required/blocked from grant; Agent attribution always visible |
| AGT-CTX-003 | Owner independent review | Owner logs into own account, sees the same listing/history, approves/corrects/rejects, pauses/revokes Agent |
| AGT-CTX-004 | Owner notice/SMS fixture | Agent action creates in-app notice plus configured SMS attempt; critical reply fixture updates the same consent state |

Permission acceptance rule: the mock must never ask the Agent to log in as the Owner, share a password, or silently replace the authenticated actor. `actor_user_id` remains Agent; affected owner/resource remains Owner-owned.

### 4.3 Requests, quotes, and bidding

| Mock ID | Experience | Required states/consequences |
|---|---|---|
| BID-001 | Open Requests for responder | Eligible Service/Product Requests, expiry, area/timing, budget meaning, privacy/safety, response eligibility |
| BID-002 | Request detail | Complete need, requester-safe identity/trust, existing response status, ask clarification/report boundaries |
| BID-003 | Quote/bid composer | Scope, inclusions/exclusions, amount, schedule, validity, Work shape, lane options, save/review/submit |
| BID-004 | Agent-submitted response | Acting-for context, grant used, Owner notice or approval gate, Agent attribution |
| BID-005 | My Responses | Draft/submitted/clarification/revised/withdrawn/expired/accepted/declined history |
| BID-006 | Buyer response inbox and comparison | Comparable terms, no fake score, no automatic cheapest winner, clarify/decline/report/accept |
| BID-007 | Accepted response consequence | Accepted immutable quote version creates one Order and terms snapshot visible to both parties |
| BID-008 | Failure/recovery | Expired request/quote, stale revision, ineligible responder, duplicate submit, withdrawal, retry without duplicate Order |

Bidding vocabulary rule: the user-facing product may say `Bid` where competitive response is understood, while the canonical data fixture remains a `quote` associated with a `request` and mechanism `reverse_bidding`.

### 4.4 Dedicated Quick Deal session

Quick Deal must not appear on ordinary search/listing cards. Its top-level entry serves people who are physically/otherwise already coordinating a rapid deal.

| Mock ID | Experience | Required states/consequences |
|---|---|---|
| QD-001 | Quick Deal entry | Choose `Start a deal` or `Scan/join a deal`; concise connected-only boundary |
| QD-002 | Initiator listing selector | Show only listings owned by the Provider/Owner or permitted acting-for Owner; active/capacity/permission checks |
| QD-003 | Session waiting/QR | Listing-version identity, initiator, expiry, refresh/cancel, QR/join fixture, no payment authority claim |
| QD-004 | Recipient preview and join | Counterparty and listing summary, safety, stale/expired/mismatch handling, explicit join/decline |
| QD-005 | Live dealing interface | Current proposed terms, price controls, quantity/scope, schedule, inclusions/add-ons, proposal author, change history |
| QD-006 | Reconfirmation | Every material adjustment invalidates prior confirmation and requires both parties to review again |
| QD-007 | Final accepted terms | Exact listing source version plus all one-off overrides, parties, lane choices, expiry, safety and cancellation meaning |
| QD-008 | Normal Order consequence | One accepted Order/terms snapshot appears in both parties' Activity/My Orders; Work/payment remain separate |
| QD-009 | Leave/decline/expiry/retry | No partial success, no silent Order, safe resume where valid, idempotent final confirmation |
| QD-010 | Future tailor-for-this-deal extension | Clearly labeled future control; changes only the session proposal unless Owner explicitly saves a new listing version |

Mock-only data note: `QuickDealSession`, `QuickDealParticipant`, and proposal-version objects may exist in fixture state to demonstrate the required interaction, but must be marked `NON-CANONICAL MOCK STATE — schema decision pending` in developer documentation. They are not evidence that the 42-table schema already supports the pre-Order lifecycle.

### 4.5 Regulatory Formalization Ladder

The experience concept should return, but old legal claims must not be copied as current fact.

Required planning views:

1. Current progression status and purpose.
2. Optional next lane and why someone might choose it.
3. Evidence/documents that may be required, each marked confirmed or legal-review pending.
4. Benefits/unlocks, each linked to an approved source or labeled pending.
5. Save/resume, decline/not-now, correction, review, rejection, expiry, and support.
6. Separation from identity verification: identity trust does not automatically equal tax/business formalization.
7. Separation from payment custody: progression does not silently enable live Direct Digital/Tiwala.

Historical lane intent retained for revalidation:

- Lane 1 — Informal/Entry.
- Lane 2 — Growth/Declaration concept.
- Lane 3 — Registered Business/Maximum formalization concept.

The exact labels, legal basis, income/payout caps, withholding/tax statements, BMBE benefits, badges, and search/payment unlocks remain blocked until the authoritative legal/product decision is rebuilt.

## 5. Deterministic fixture state required

The reference should seed stable identifiers and preserve them across all connected screens:

| Fixture | Minimum state |
|---|---|
| `OWNER-01` | Independent login capability, profile/access state, listings, formalization fixture, Agent grant, notification preference |
| `AGENT-01` | Agent capability, managed Owner grants, allowed/approval-required/forbidden action matrix |
| `BUYER-01` | Buyer capability, request, received responses, Quick Deal recipient state, Orders |
| `PROVIDER-01` | Self-managed listing owner, quote/bid responses, Orders |
| `LISTING-01` | Owner, lifecycle, current immutable version, capacity, mechanism/work shape, public preview |
| `REQUEST-01` | Requester, type, scope, timing/area, budget, status, expiry, visibility/safety |
| `QUOTE-01/02/03` | Different responders, versions, scope/amount/validity/status; one stale/expired branch |
| `CONSENT-01` | Owner, Agent, resources/actions, allowed/approval-required/forbidden, status, expiry/revocation |
| `QD-SESSION-01` | Mock-only join/expiry/participants/proposal versions/confirmation state, linked to `LISTING-01` version |
| `ORDER-01` | Accepted source listing/request/quote, parties, immutable terms snapshot, separate Work/payment status |
| `NOTIFICATION-*` | In-app intent and SMS delivery fixture states linked to Agent/request/Quick Deal consequences |

The browser reference must provide:

- deterministic reset;
- persistence across refresh;
- explicit fixture/scenario selector outside the product navigation;
- no real API calls;
- no real ID/document/phone data;
- no fake success after an invalid transition;
- stable IDs for cross-screen verification;
- a reviewer-only perspective switch that is clearly not a production Buyer/Provider role toggle.

## 6. Cross-role consequence checks

A mock scenario is incomplete unless all applicable checks pass:

1. Agent edits an Owner listing → Owner sees the same listing version/history and configured notice.
2. Owner revokes grant → Agent's future action becomes blocked while old attribution remains visible.
3. Provider/Agent submits a response → Buyer sees it on the same request; responder sees the same status/version.
4. Buyer accepts one response → all other responses change appropriately; one Order and terms snapshot appears for both parties.
5. Quick Deal adjustment → both parties see the same proposal version and prior confirmation is invalidated.
6. Both parties accept Quick Deal → one Order appears; no payment or Work completion is fabricated.
7. Onboarding/verification/formalization state → enabled/blocked actions change consistently across the product.
8. Refresh/reset/error branch → state remains explainable and no duplicate Order/action appears.

## 7. Upstream decisions required before visual implementation

| Decision | Why it blocks accurate mocks | Required authority |
|---|---|---|
| Quick Deal pre-Order session/proposal lifecycle | The ERD supports final Order terms but not join/proposal/expiry/reconfirmation history | PRD + UX + domain-state + schema impact decision |
| Quick Deal selected-listing cardinality | Current Order source is singular; selecting multiple listings may require line-item/bundle rules | Product/taxonomy/schema decision |
| Agent permission and Owner notice matrix | Shared UI depends on exact allowed/approval/notice/forbidden behavior | Permission contract + PRD/UX |
| Inbound SMS approval/STOP/REVOKE | Current notification tables clearly support outbound attempts but not the full inbound command lifecycle | Notification/security/domain/schema decision |
| Regulatory Formalization Ladder | Rebuilt PRD/UX omitted it and historical legal claims are not safe to reuse unchanged | Source-backed legal/product policy + PRD/UX/domain/schema impact |
| Reverse Bidding response lifecycle | Existing `quotes` likely suffice, but revision/withdrawal/clarification/eligibility states must be explicit | PRD + UX + domain-state |
| Open-offer/Deal-Chaining relation | Determines whether a request is ordinary, tagged child need, or part of a future parent plan | Taxonomy + PRD + domain/schema activation decision |

## 8. Recommended design order

1. Onboarding, capability readiness, and formalization progression shell.
2. Self-managed Owner/Provider My Listings lifecycle.
3. Agent hub plus the same listing flow under delegated acting-for context.
4. Request publishing plus Provider/Agent bidding and Buyer comparison/acceptance.
5. Dedicated Quick Deal start/join/negotiate/accept flow.
6. Normal Order consequence shared by listing, bid, and Quick Deal origins.
7. Owner SMS/in-app notice and revoke/recovery branches.
8. Deal-Chaining concept only after its parent/child decision; keep it outside the pilot navigation until then.

This order establishes the people, permissions, and marketplace objects before presenting rapid transaction formation. It is the minimum sequence needed for the next frontend reference to look like one coherent Serbizyu system rather than disconnected feature demonstrations.
