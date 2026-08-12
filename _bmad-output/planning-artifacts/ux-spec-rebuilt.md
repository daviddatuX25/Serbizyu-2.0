# Serbizyu 2.0 — Rebuilt UX Specification and Traceability Contract

Status: CANONICAL PLANNING AUTHORITY — founder-approved 2026-07-31; initiative extension accepted 2026-08-09; implementation/live-money gates remain separate
BMAD phase: Phase 2 — Planning / UX and interaction contract
Depends on:

- `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/phase-1-handoff-rebuilt.md`
- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`

This document defines user-facing behavior and journey coverage. It does not replace domain/state, payment, schema, or architecture contracts.

Deal-Chaining foundation note: the four-table coordination foundation is not a user-facing feature and creates no navigation or pilot-screen commitment. `UX-024` is a later, separately gated coordination story that may consume the approved foundation only after the ordinary Request/Quote/Order/Work spine and its activation evidence are ready.

## 1. UX principles

1. **One clear next action** — each screen has one primary action and visible safe alternatives.
2. **Plain language first** — use understandable Filipino/English wording; future Ilocano support must fit the same message contract.
3. **Words plus icons** — icons supplement labels and never carry critical meaning alone.
4. **Amount before action** — show peso amount, fee, purpose, and who controls money before confirmation.
5. **Status separation** — payment, Work, dispute, support, and release statuses are not collapsed into one “success” badge.
6. **Assistance is visible** — show when an Agent is acting, for whom, with what permission.
7. **Safe fallback** — errors preserve draft work, explain the next safe step, and never imply completion when the server did not confirm it.
8. **Low-bandwidth respect** — minimize payload, use resumable uploads where applicable, and never make stale offline data final authority.
9. **Safety by context** — meeting and category guidance appears at the point of risk, not only in a policy page.
10. **Evidence without overclaiming** — label declarations, acknowledgments, provider verification, and administrative decisions distinctly.
11. **No silent substitution** — the product never silently changes payment lane, recipient, owner, scope, or Agent authority.
12. **Human support remains reachable** — every blocked or disputed high-impact path has an escalation route.

## 2. UX vocabulary

The interface uses these canonical labels:

- Service Listing
- Product Listing
- Service Request
- Product Request
- Direct Booking
- Quote Request
- Reverse Bidding
- Agent Assistance
- Work
- Payment Obligation
- External Cash
- External Digital Proof
- Direct Digital (sandbox where applicable)
- Tiwala Protected Digital (sandbox where applicable)
- Payment declared
- Evidence submitted
- Counterparty acknowledged
- Provider verified
- Disputed
- Not protected by Tiwala
- Completed
- On hold
- Needs support

Avoid unqualified labels such as:

- Escrow
- Guaranteed payment
- Verified payment when only a screenshot exists
- Trusted provider when only an account exists
- Paid equals completed
- Agent owns this

## 3. Information architecture

### Public/community areas

- Home/discovery
- Category-family browsing
- Search/filter
- Listing details
- Provider/Owner trust and safety summary
- Request creation
- Help and language/accessibility guidance

### Authenticated user areas

- My listings
- My requests
- My Orders
- Work progress
- Payment Obligations
- Evidence
- Messages/notifications
- Reviews
- Support/disputes
- Consent and Agent access

### Admin/operator areas

- Cohort/evidence classification
- User and verification review
- Listing review
- Order/Work inspection
- Payment/evidence inspection
- Disputes and holds
- Safety incidents
- Failed events/retries
- Audit history
- Pilot metrics
- Backup/recovery status

## 4. Journey traceability matrix

| Journey ID | Journey | Primary actors | Shapes/lanes | PRD requirements | UX status |
|---|---|---|---|---|---|
| UX-001 | Provider registration and identity review | Provider, Admin | L2/L3; identity | PRD-001–003 | PILOT |
| UX-002 | Buyer registration and discovery | Buyer | L2/L3 | PRD-001, PRD-009–013 | PILOT |
| UX-003 | Agent-assisted owner consent | Owner, Agent | L0/L1 | PRD-004–008 | PILOT-CONDITIONAL |
| UX-004 | Service listing creation | Provider, Agent | service_offer; A1/A3/A9 | PRD-010–016, PRD-023 | PILOT |
| UX-005 | Product listing and capacity/handoff | Provider, Buyer | product_offer; A4 | PRD-010–015, PRD-027 | PILOT |
| UX-006 | Service request and conditional quote | Buyer, Provider | service_request; quote | PRD-018–019 | PILOT-CONDITIONAL |
| UX-007 | Product request and purchase-on-behalf | Buyer, Provider/Agent | product_request; A4 extension | PRD-018, PRD-028 | PILOT-CONDITIONAL |
| UX-008 | A1 linear project | Buyer, Provider | A1; cash/proof/sandbox | PRD-024–025, PRD-031 | PILOT |
| UX-009 | A3 appointment | Buyer, Provider | A3; cash/proof | PRD-026, PRD-031 | PILOT |
| UX-010 | A4 handoff | Buyer, Provider | A4; cash/proof | PRD-027–028, PRD-031 | PILOT |
| UX-011 | A9 digital delivery | Buyer, Provider | A9; cash/proof/sandbox | PRD-029, PRD-031 | PILOT |
| UX-012 | External Cash declaration and acknowledgment | Buyer, Provider | External Cash | PRD-032–034, PRD-043, PRD-049 | PILOT |
| UX-013 | External Digital Proof evidence | Buyer, Provider, Admin | External Digital Proof | PRD-035–037 | PILOT |
| UX-014 | Direct Digital sandbox | Buyer, Provider, Admin | Direct Digital | PRD-038, PRD-042 | SANDBOX-ONLY |
| UX-015 | Tiwala Protected Digital sandbox | Buyer, Provider, Admin | Tiwala | PRD-039–041 | SANDBOX-ONLY |
| UX-016 | Completion/sign-off/review | Buyer, Provider | all committed shapes | PRD-025–031, PRD-040 | PILOT |
| UX-017 | Cancellation and changes | Buyer, Provider, Admin | all committed shapes | PRD-043, PRD-048 | PILOT |
| UX-018 | Evidence dispute and administrative hold | Buyer, Provider, Admin | all lanes | PRD-046–050, PRD-052–055 | PILOT |
| UX-019 | Notifications and messaging fallback | all actors | all committed paths | PRD-044–045 | PILOT |
| UX-020 | Low-literacy/low-data access | Buyer, Provider, Agent | L0–L2 | PRD-004–009, PRD-042 | CONDITIONAL/PILOT |
| UX-021 | Safety report/block/escalation | Buyer, Provider, Agent, Admin | S1–S3 | PRD-050–051 | PILOT |
| UX-022 | Admin/support recovery | Admin/Operator | all committed paths | PRD-052–058 | PILOT |
| UX-023 | Cohort and evidence classification | Admin/Operator | capstone/pilot/sandbox | PRD-056–057 | PILOT |
| UX-024 | Bounded Deal-Chaining coordination lab and activation boundary | Coordinator/Owner, Agent, Provider, Admin | future coordination; ordinary child Orders | PRD-022, PRD-076 | FOUNDATION / FUTURE / PILOT-GATED |
| UX-025 | Strict mobile signup + multi-method sign-in | Buyer, Provider, Agent | L2/L3; identity/onboarding | PRD-001–009 | PILOT |
| UX-026 | Governed category, listing, capacity, and discovery | Provider, Buyer, Admin | all listing types; quantity/resource/slot capacity | PRD-010–016, PRD-061–062 | COMMITTED / C,T,S |
| UX-027 | Proposal, accepted Order, and A1/A3/A4/A9 Work | Buyer, Provider, Agent | all formation mechanisms and Work shapes | PRD-017–031, PRD-063–064 | COMMITTED / C,T,S |
| UX-028 | Evidence, Obligation, provider, and Tiwala sandbox truth | Buyer, Provider, Admin | all payment lanes; evidence/provider states | PRD-032–051, PRD-070–071, PRD-074 | COMMITTED; provider surfaces SANDBOX-ONLY |
| UX-029 | Connected apps and AI handoff | Owner, Operations checker, Admin | account integrations; exact AI approval | PRD-065–067, PRD-072–073 | CONDITIONAL / C,S |
| UX-030 | Operations, activation, and recovery | Admin/Operator, Operations checker | ordered consumers; activation; recovery | PRD-052–059, PRD-068–073, PRD-075 | COMMITTED / C,T,S |
| UX-031 | Mandatory cross-surface state contract | all actors | every connected interface | PRD-060, PRD-075 | COMMITTED / C,T,S |

No committed PRD journey may be removed from UX to make the build appear smaller. It may be moved to `PILOT-CONDITIONAL` only through an activation decision.

## 5. Journey contract

Every journey specification must contain:

1. Entry condition
2. Actor and access tier
3. Listing/order/work/payment context
4. Primary action
5. Supporting actions
6. Consent and authorization check
7. Amount/fee/custody copy where applicable
8. Evidence requested/created
9. Server-confirmed success state
10. Failure, retry, and offline behavior
11. Notification/support behavior
12. Safety guidance
13. Cancellation/dispute path
14. Analytics/cohort events
15. PRD IDs and eventual story/test IDs

## 6. Key journey specifications

### UX-001 — Provider registration and identity review

Screens/states:

- Welcome and role choice
- Phone/account verification
- Identity requirements explanation
- Consent and privacy notice
- Upload/submission guidance, if gated flow is enabled
- Manual-review pending
- Approved/rejected/more-information-needed
- Help/escalation

Rules:

- Explain why information is needed.
- Do not collect live sensitive ID until the applicable legal/privacy/operations gate passes.
- Show retention/deletion information.
- Provide manual-review fallback.
- Never expose full sensitive evidence to unauthorized Agents.

### UX-002 — Buyer registration and discovery

Screens/states:

- Location/geography selection limited to Tagudin pilot
- Category-family browsing
- Search/filter
- Listing card with availability and trust signals
- Listing detail
- Safe contact/action

Rules:

- Do not show Candon as current pilot geography.
- Show “new Provider” or evidence-based history without overclaiming verification.
- Show category-sensitive safety guidance before physical interaction.
- Show whether the listing accepts Direct Booking, Quote Request, or request response.

### UX-003 — Agent-assisted owner consent

Screens/states:

- Owner invitation/consent
- Permission scope
- Agent identity
- Actions Agent may perform
- Approval-required actions
- Owner notice history
- Revoke/pause
- Dispute/report Agent action

Rules:

- “Agent is helping [Owner]” must be visible.
- Agent cannot silently become owner.
- Important actions show actor and affected person.
- Consent can expire or be revoked.

### UX-004/005 — Listing creation

The form adapts to Service/Product Listing but shares a common contract:

- Title and plain-language description
- Category family
- Fulfillment shape
- Direct/quote/request mechanism
- Price/quote/budget meaning
- Availability/capacity
- Service area/pickup/handoff
- Safety/data class
- Evidence expectations
- Payment-lane availability
- Draft/preview/submit/review/active states

Product listings must show capacity/stock or explain request-based availability. Service listings must show scope and schedule/capacity.

### UX-006/007 — Requests and quotes

Request flow:

- State the need
- Select Service/Product Request
- Describe scope/item
- Budget/estimate where applicable
- Timing/location
- Safety/privacy choices
- Submit and receive responses

Quote flow:

- Provider response includes scope, amount, inclusions, validity, Work shape, and payment lanes.
- Buyer can accept, decline, request clarification, or let it expire.
- Accepted quote becomes an Order snapshot.

Purchase-on-behalf extension:

- Item list and alternatives
- Budget/estimate
- Approval before spend
- Actual cost and variance
- Receipt/evidence
- Handoff

### UX-008 — A1 linear project

Visible progression:

`agreed → preparing/in_progress → completion proposed → buyer review/sign-off → completed` with dispute/hold alternatives.

The UX must not display the work as completed merely because a payment declaration exists.

Progress evidence and revisions remain separate from completion.

### UX-009 — A3 appointment

Visible progression:

`availability → requested → confirmed → reschedule/cancel or attended/no-show → completion evidence → completed`

Show:

- Time/slot
- Place/privacy guidance
- Contact boundary
- No-show/cancellation policy
- Safe next action

### UX-010 — A4 handoff

Show:

- Ready/preparation status
- Pickup/handoff instructions
- Receipt/acceptance action
- Quantity/condition/mismatch report
- External-cash/evidence action
- Support escalation

Do not label an item delivered or accepted before the relevant actor confirmation/evidence.

### UX-011 — A9 digital delivery

Show:

- Artifact scope and version
- Secure delivery/access
- Download/view status
- Revision request
- Acceptance
- Retention/deletion notice
- Dispute path

A file upload is not automatically accepted or proof of completion.

### UX-012 — External Cash

Before confirmation, show:

- Buyer pays Provider/Owner directly.
- Serbizyu does not hold the cash.
- Serbizyu does not promise an automatic cash refund.
- Initial pilot platform commission is 0%.
- Buyer and Provider each report their side.

States:

- `not_reported`
- `buyer_reported`
- `provider_reported`
- `mutually_acknowledged`
- `mismatch`
- `disputed`
- `corrected`

Silence never automatically proves payment.

### UX-013 — External Digital Proof

Before evidence submission, show:

- External provider name/reference field
- Amount and timestamp
- Redaction guidance
- Unrelated-balance warning
- Serbizyu did not control the external funds
- Screenshot/reference does not automatically prove cleared funds
- Not protected by Tiwala

States:

- Payment declared
- Evidence submitted
- Counterparty acknowledged
- Provider verified, only when adapter/API supports it
- Disputed
- Rejected
- Superseded

### UX-014 — Direct Digital sandbox

All screens must visibly indicate:

- Sandbox/demo status
- Provider used
- Simulated or test amount
- No live-money promise
- No Tiwala completion protection

### UX-015 — Tiwala Protected Digital sandbox

All screens must visibly indicate:

- Sandbox/demo status
- Protected-release behavior is simulated/tested
- Release requires completion/sign-off/review eligibility
- Dispute/admin/fraud/legal hold can stop release
- This is not a live legal escrow claim

### UX-016 — Completion/sign-off/review

The completion proposal screen must explain:

- What evidence is being submitted
- What the Buyer must confirm
- What happens on sign-off
- What happens if Buyer does nothing
- How to dispute
- Which payment/release state is affected, if any

No release timer begins from Order creation.

### UX-017 — Cancellation and changes

Before payment evidence:

- Allow cancellation/replacement according to Order policy.

After payment evidence:

- Preserve original obligation.
- Use correction, cancellation, supersession, refund, or dispute event.
- Explain affected parties and next action.

### UX-018 — Dispute and administrative hold

Dispute intake asks:

- What happened?
- Which Order/Work/Payment Obligation is affected?
- What evidence exists?
- Is there a safety concern?
- What remedy is requested?

Admin view shows:

- Timeline
- Actors
- Evidence
- Amounts and snapshots
- Holds
- Prior resolutions
- Required next action

### UX-019 — Notifications and fallback

Notifications must identify:

- What changed
- Who acted
- Which Order/Work/obligation is affected
- What the recipient must do
- Deadline/expiry if relevant
- Safe support route

Delivery failure must create a retry/support state, not silently discard a critical notice.

### UX-020 — Low-literacy/low-data access

Minimum behavior:

- One clear action
- Short sentences
- Icon plus text
- Concrete peso amounts
- Explicit “not protected” and “who holds money” language
- Readable status labels
- Draft preservation
- Retry guidance
- Agent assistance with consent
- Receipt/help fallback

Do not use color alone for payment, dispute, or safety state.

### UX-021 — Safety

At the relevant action point show:

- Public/safer meeting guidance
- No-entry default where appropriate
- Contact/location privacy
- Block/report
- Emergency boundary
- Category-specific caution

A safety warning cannot be buried only in Terms.

### UX-022/023 — Admin recovery and classification

Admin screens must support:

- Cohort classification
- Sandbox/test flag
- Genuine Tagudin flag
- Actor/event timeline
- Failed notification/evidence retry
- Hold/disable
- Dispute resolution
- Audit trail
- Metric corrections with reason

Admin correction creates a new record/event; it does not erase history.

## 7. Accessibility and content requirements

- Keyboard-accessible primary flows
- Visible focus
- Adequate contrast
- No color-only meaning
- Labels associated with fields
- Error text next to the affected action
- Large tap targets
- Short, chunked content
- Plain-language fee/custody explanations
- Screen-reader labels for status icons
- Upload guidance that explains privacy risk
- Text alternatives for important images
- Resilient empty/loading/error states
- Human help route on blocked high-impact actions

## 8. UX state language

Use these patterns:

- “Payment declared” rather than “Paid” when only user evidence exists.
- “Counterparty acknowledged” when the other party confirms.
- “Provider verified” only when trusted provider evidence exists.
- “Work completion proposed” before completion acceptance.
- “On hold” when dispute/admin/fraud/legal action blocks progress.
- “Not protected by Tiwala” for External Cash and External Digital Proof.
- “Sandbox only” for Direct Digital and Tiwala demonstrations.

## 9. UX-to-requirement traceability

The implementation planning phase must add a detailed row for each journey/screen with:

- UX ID
- PRD ID(s)
- Capability profile
- Actor/access tier
- State/event contract
- Copy decision
- Analytics event
- Acceptance test
- Evidence class
- Pilot/sandbox status

No screen is accepted as canonical solely because an old HTML mockup exists.

## 9.1 Complete PRD requirement coverage index

The following index is the minimum traceability bridge. Detailed screen/component rows and acceptance-test IDs will be added during implementation planning, but every PRD requirement already has an owner target here.

| PRD requirements | UX target |
|---|---|
| PRD-001, PRD-002, PRD-003 | UX-001 Provider registration/identity review; UX-002 Buyer registration; Admin verification surfaces |
| PRD-004, PRD-005, PRD-006, PRD-007, PRD-008 | UX-003 Agent consent; UX-020 low-literacy/low-data; UX-022 Admin recovery |
| PRD-009 | UX-002 discovery; UX-020 access behavior |
| PRD-010, PRD-011, PRD-012, PRD-013, PRD-014, PRD-015, PRD-016 | UX-004 Service Listing; UX-005 Product Listing; UX-002 discovery |
| PRD-017 | UX-004/005 Direct Booking action |
| PRD-018, PRD-019, PRD-020 | UX-006/007 request, quote, response, and Quick Deal conditional surfaces |
| PRD-021 | Non-visual activation/deferred records; UX-020 safe offline boundary; no pilot screen promise |
| PRD-022 | UX-024 bounded coordination lab; foundation is committed, functionality is later, and pilot activation is separately gated |
| PRD-023 | UX-003 Agent attribution; UX-004/005 Agent-created listing |
| PRD-024, PRD-025, PRD-026, PRD-027, PRD-028, PRD-029, PRD-030, PRD-031 | UX-008 A1; UX-009 A3; UX-010 A4; UX-011 A9; UX-016 completion |
| PRD-032, PRD-033, PRD-034 | UX-012 External Cash; Payment Obligation summary |
| PRD-035, PRD-036, PRD-037 | UX-013 External Digital Proof; evidence/privacy guidance |
| PRD-038, PRD-039, PRD-040, PRD-041, PRD-042 | UX-014 Direct Digital sandbox; UX-015 Tiwala sandbox; UX-016 completion/release copy |
| PRD-043 | UX-017 cancellation/change; UX-013 evidence supersession |
| PRD-044, PRD-045 | UX-019 notifications/messaging fallback |
| PRD-046, PRD-047 | UX-008–011 fulfillment evidence and UX-016 review |
| PRD-048, PRD-049, PRD-050, PRD-051 | UX-018 disputes; UX-021 safety |
| PRD-052, PRD-053, PRD-054, PRD-055 | UX-022 Admin/support recovery |
| PRD-056, PRD-057, PRD-058, PRD-059 | UX-023 cohort/measurement; UX-022 operations/recovery; non-visual pilot reporting |
| PRD-060 | Non-visual dependency-ordered train contract; UX-031 applies to every connected train surface |
| PRD-061 | UX-026 governed category/profile/listing business versions; UX-027 version-visible proposal/Work |
| PRD-062 | UX-026 capacity buckets/reservations; UX-027 stale/held/committed/released conflict recovery |
| PRD-063 | UX-027 exact proposal/final-confirmation and all-or-nothing ordinary Order result |
| PRD-064 | UX-027 retained Work version and unknown-version safe recovery |
| PRD-065, PRD-066, PRD-067 | UX-029 connected apps and exact AI approval |
| PRD-068, PRD-069, PRD-072, PRD-073 | UX-030 operations, ordered recovery, activation, and maker/checker |
| PRD-070, PRD-071, PRD-074 | UX-028 financial/evidence/provider sandbox truth |
| PRD-075 | UX-031 cross-surface state/error/recovery/accessibility contract |
| PRD-076 | UX-024 same-Chain lineage, replacement, and child isolation |

## 10. UX acceptance gate

The rebuilt UX is ready for domain/story planning only when:

- All 31 journey IDs have a defined owner and status.
- All 76 PRD requirements have at least one UX target or are explicitly non-visual.
- A1/A3/A4/A9 each have a complete journey.
- Cash, External Digital Proof, Direct Digital sandbox, and Tiwala sandbox are visibly distinct.
- Payment and Work completion are visibly separate.
- Agent consent and attribution are visible.
- Low-literacy, low-data, safety, privacy, and support flows are included.
- Conditional/deferred paths are not represented as pilot promises; the Deal-Chaining foundation is represented without implying pilot activation.
- Old mockups are classified as historical or regenerated.
- Founder approval is recorded before UX becomes authoritative.

Next planning output: domain/state contracts and a canonical schema decision artifact.
### UX-024 — Bounded Deal-Chaining coordination lab and activation boundary

This is a later user-facing journey contract, not an initial-pilot navigation commitment. The experience may be implemented only after the ordinary Request/Quote/Order/Work spine and the approved foundation contract are stable, and only behind a separate activation flag.

Screens/states:

- Chain purpose/coordinator and persistent “coordination only” explanation
- Ordered Need slots with `open`, `sourcing`, `invited`, `quoted`, `accepted`, `in progress`, `blocked`, `completed`, `failed`, `cancelled`, and `replacement needed` meaning
- Need-specific Request/Quote entry and invitation scope/expiry/response
- Same-chain dependency display with blocked transition explanation; cycles and self-edges show a recoverable validation error
- Child-Order link showing independent parties, terms, Work, payment evidence, disputes, and cancellation
- Partial completion, failure, replacement, and support recovery views
- Derived parent progress/cost summary with no pooled balance, custody, escrow, or parent-wide guarantee copy

Rules:

- Accepting an invitation does not show an Order-created success state; explicit child-agreement formation is separate.
- “Acting for [Owner]” and Agent grant scope remain visible. Revoked/expired grants block future commands without rewriting history.
- One child failure does not silently cancel, refund, release, dispute, or reassign sibling children.
- No offline or fixture state claims final chain, Order, payment, inventory, consent, or release authority.

## 11. Accepted initiative UX extension — 2026-08-09

These journeys are canonical contracts, not permission to add unfinished navigation. `PROGRAM-IMPLEMENTATION-PLAN.md` §9 supplies the initiative-wide state/error/recovery matrix; each train LLD expands the relevant row before permanent UI.

### UX-025 — Strict mobile signup and multi-method sign-in

Amended 2026-08-10 (`hybrid-browser-auth-phone-step-up`, ADR-R-030).

- **Register:** mobile number + OTP verify is mandatory before signup is complete.
- **AlmostThere onboarding:** password **required** to reach ready; email optional (dashed block; add later also via Google OAuth).
- **Sign in:** method picker, password-first — phone + password and email + password lead; SMS OTP as “instead” link; Google OAuth (live adapters gated).
- **Visible authority/states:** signup phone pending/verified; sign-in method chosen; session authenticated; profile/onboarding progress; identity review distinct from login; step-up OTP when Provider/consent/money requires it.
- **Recovery:** OTP resend/expiry/attempt limits; **password reset** — single-use email link (if email linked) or SMS-OTP-verified reset (fallback); request/confirm rate-limited; use another sign-in method; support route; never show raw OTP in product UI.
- **Sensitive identity actions** (change password, unlink last recovery method) require fresh password confirmation within the configured timeout.

### UX-026 — Governed category, listing, capacity, and discovery

- **Owner/admin:** version, review blockers, approver attribution, affected listings, activation/pause/retire consequence, stale compare/refresh, safe rollback/disable.
- **Provider:** draft/autosave, exact category/profile version, capacity bucket/slot/resource, preview, submit/review/reject-correct/active/unavailable, acting-for attribution, conflict recovery.
- **Buyer/public:** URL-stable filters/cursor, loading/empty/database-fallback/unavailable, current availability and trust/safety summary, mechanism-specific primary action, minimal-image mode.
- No UI permits open CRUD of active governance or blind capacity overwrite.

### UX-027 — Proposal, accepted Order, and A1/A3/A4/A9 Work

- Proposal and exact final confirmation are separate. Changed terms/source version/acceptance/capacity require explicit refresh and reconfirmation; offline state cannot finalize.
- Order detail shows immutable terms, parties/acting-for attribution, commercial state, then separate Work, Obligation, Evidence/Dispute/Hold, and support panels. Blocked close/cancel links to the blocking object and recovery.
- A1 shows deliverables/progress/revision/completion/sign-off; A3 shows local/timezone slot hold/confirmation/reschedule/attendance; A4 shows quantity/preparing/ready/handoff/receipt/mismatch; A9 shows quarantine/scan/access/revision/acceptance/retention.
- Unknown Work contract version displays a non-destructive support state and preserves history; payment never renders Work complete.

### UX-028 — Evidence, Obligation, provider, and Tiwala sandbox truth

- Evidence shows purpose/visibility, quarantine/scan/available/rejected/hold/deletion state, upload/retry, expiring access, guarded export, and immutable timeline without exposing unsafe content.
- Obligation shows one lane, amount/currency/due condition, reported/counterparty-confirmed/provider-verified/mismatch/disputed/held/refunded/reversed separately from Work.
- Provider degradation/reconciliation displays a stable pending/mismatch/support state; upload or webhook receipt never becomes “paid” without verified business binding.
- Tiwala and Xendit surfaces retain a permanent sandbox banner, exact release blockers/approvals, kill-switch recovery, no legal escrow/custody claim, and exclusion from genuine/live metrics.

### UX-029 — Connected apps and AI handoff

- **Owner primary actions:** create client, review restrictive scopes/environment, step up, reveal credential once, rotate within approved scopes, reduce scopes, revoke immediately, and inspect activity/mappings/cursors/conflicts/webhook retries/dead letters.
- Scope expansion, environment change, and webhook-signing-secret change show an independent Operations-approval state; emergency revoke never waits for approval. Every change previews affected capabilities and recovery. Cross-owner denial is non-enumerating; credential copy/download is accessible and never repeatable after dismissal.
- AI drafts/proposals are visually distinct from executed commands. Confirmation shows exact actor/client, targets, versions, changed fields, economics/consequence, policy, expiry, and one primary approve/decline action; stale/changed/consumed approval cannot execute.

### UX-030 — Operations, activation, and recovery

- Unified correlation timeline joins state, audit, outbox/inbox sequence/gaps, provider/evidence status, reconciliation, activation/approval, job attempts, and support case.
- Effect-specific controls distinguish new intent, release/payout, refund/reversal, outbound delivery, inbound intake, query, and reconciliation. Any matching deny is visibly absolute; disable preview states what stops and what recovery remains.
- High-risk resolution uses impact/dry-run, maker/checker, exact reason/evidence, immutable outcome, incident escalation, and safe replay from checkpoint. Elevated credential changes show the independent Operations checker; emergency credential revocation is immediate. Backup/restore/promotion evidence is visible before environment activation.

### UX-031 — Mandatory cross-surface state contract

Every connected surface defines: actor and acting-for identity; authoritative object/version; one primary and bounded secondary actions; field/state visibility; loading/skeleton, empty, permission-denied, validation, stale conflict, offline/network, degraded dependency, retry/idempotent success, and support/escalation; URL/deep-link and leave/resume behavior; focus order, error summary, live-region announcement, keyboard/touch/contrast/no-color-only semantics; low-data/no-image alternative; analytics evidence class; browser scenario and target-user UAT.

Interface completion requires the user to understand **who may act, what will change, what will not change, whether money/protection is real or sandbox, and the next safe recovery action**. An HTTP/Pest success alone cannot satisfy this contract.
