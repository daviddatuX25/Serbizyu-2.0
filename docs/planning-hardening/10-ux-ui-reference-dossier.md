# Serbizyu 2.0 — UX/UI Perspective and Flow Reference Dossier

Status: DRAFT FOR FOUNDER/DESIGNER REVIEW
Artifact type: design reference / disposable mockup input
Authority: downstream of canonical BMAD artifacts; not a replacement for them
OpenSpec change: `openspec/changes/create-ux-ui-reference-dossier/`

## 1. Purpose

This dossier is the reference that a future visual-design agent must read before designing the next Serbizyu mockup.

The previous mockup failure was not mainly a missing screen count. It was a missing user perspective. It described capabilities (“there is a request feature,” “there is a payment screen,” “there is an admin view”) instead of showing what a person is trying to do, what they notice first, what they fear or misunderstand, what decision they must make, what happens after they act, and how they recover when reality does not match the plan.

This dossier therefore describes the experience as:

`actor + context → goal → visible situation → decision → primary action → consequence → next state → recovery`

It is deliberately written for a designer who may build a static, low-fidelity, connected HTML reference mockup. It does not require a backend and does not authorize production behavior.

## 2. Reading order and authority

Read in this order:

1. This dossier for user perspective, hierarchy, states, and design review.
2. `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md` for all 74 screen-level actor goals, visible hierarchy, primary actions, and recovery.
3. `docs/planning-hardening/10b-ux-ui-scenario-blueprints.md` for `SCN-01` through `SCN-09`, connected routes, fixtures, cross-role consequences, and failure branches.
4. `_bmad-output/planning-artifacts/ux-spec-rebuilt.md` for the canonical UX journey contract.
5. `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` for state meanings and transition boundaries.
6. `_bmad-output/planning-artifacts/prd-rebuilt.md` for product requirements and capability status.
7. `_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md` for the complete screen registry and scenario IDs.
8. `openspec/changes/create-ux-ui-reference-dossier/` for the change boundary and acceptance scenarios.

If this dossier conflicts with an upstream product, UX, domain, payment, schema, ADR, or legal decision, the upstream authority wins and this dossier must be corrected before design work continues.

## 3. Scope and non-goals

### Included

- A Tagudin-first community marketplace experience.
- Buyers/Customers looking for local services or goods.
- Providers/Owners offering work or products.
- Agents assisting Owners with explicit permission.
- Admins/Operators handling support, safety, disputes, evidence, holds, and classification.
- Capstone evaluator perspective.
- L0–L4 access contexts, including assisted and low-data variants.
- Service Listing, Product Listing, Service Request, and Product Request.
- A1 Linear Project, A3 Appointment, A4 Handoff, A4 purchase-on-behalf conditional, and A9 Digital Delivery.
- External Cash, External Digital Proof, Direct Digital sandbox, and Tiwala sandbox.
- Completion, sign-off, evidence, dispute, hold, correction, support, and audit perspectives.

### Not included

- Backend or database implementation.
- Real authentication, payment, identity, messaging, maps, file storage, or notification delivery.
- Legal approval for protected funds or identity collection.
- A claim that a static prototype is a pilot result.
- Final visual branding, final component library, or final production information architecture.
- A requirement to rebuild all historical screens before feedback.

## 4. Experience thesis

Serbizyu should feel like a practical local coordination tool, not a financial dashboard and not a catalog of platform features.

The user should be able to answer, on every meaningful screen:

1. What am I looking at?
2. Is this about a Listing, Request, Order, Work, Payment Obligation, Evidence, Dispute, Consent, or Hold?
3. What is the current status in ordinary words?
4. What do I need to do now?
5. What will happen if I do it?
6. What happens if I cannot, disagree, or need help?
7. Who else will see this action?
8. Is Serbizyu holding or controlling any money here?

The screen should not force the user to understand the database vocabulary before they can act. Domain labels may appear as supporting labels, but the primary explanation must be human-centered.

## 5. Actors and user perspectives

### 5.1 Buyer/Customer — first-time local user

Goal: find or request something practical and know whether it is safe, affordable, available, and understood correctly.

Typical questions:

- Is this person actually available?
- What exactly will they do or provide?
- How much is the amount, and is it fixed, estimated, or a quote?
- Do I pay directly or does Serbizyu hold anything?
- What counts as finished?
- What do I do if the work, item, amount, or evidence is wrong?

UI implications:

- Start with need, amount, timing, and next action—not platform vocabulary.
- Show the Provider/Owner and the work/item context before asking for confirmation.
- Use concrete peso amounts and explicit “who controls the money” copy.
- Make “Ask for clarification,” “Report a concern,” and “Get help” visible but secondary to the safe primary action.
- Do not turn a new or lightly evidenced Provider into a misleading “trusted” badge.

### 5.2 Buyer/Customer — low-literacy or assisted user

Goal: complete one important task with minimal reading and no hidden consequence.

UI implications:

- One primary action; maximum two meaningful alternatives.
- Icon plus text, never icon alone.
- Short paragraphs and chunked questions.
- Repeat the amount, person, task, and next step at confirmation.
- Provide “Read/explain this,” “Ask an Agent,” or support fallback where permitted.
- Preserve a draft if connection fails.
- Never treat a stale screen or verbal assumption as final authorization for an irreversible action.

### 5.3 Provider/Owner — informal worker or small seller

Goal: present an understandable offer, accept only work they can fulfill, communicate progress, and protect themselves from unclear scope or disputed completion.

Typical questions:

- What exactly did the Buyer agree to?
- What is included and not included?
- When and where does the work happen?
- What evidence should I provide?
- Has the Buyer only declared payment, or has the other side acknowledged it?
- What happens if the Buyer changes the request or claims a mismatch?

UI implications:

- Show the accepted snapshot: scope, amount/quote, mechanism, Work shape, timing, and payment lane.
- Separate “I started,” “I added evidence,” “I proposed completion,” and “payment declared.”
- Make a safe “Ask for clarification” route available before the Provider starts risky work.
- Do not imply that Provider status gives payment verification or money custody.

### 5.4 Agent — delegated assistant

Goal: help an Owner perform permitted actions while keeping the Owner visible as the affected person and preserving consent.

UI implications:

- Persistent “You are acting for [Owner]” context.
- Scope panel: allowed, approval-required, and forbidden actions.
- Each action records acting Agent and affected Owner separately.
- Owner notice and revocation are easy to find.
- A blocked money/goods-custody action should be visible as an explicit boundary, not silently absent.

### 5.5 Admin/Operator — support and recovery worker

Goal: understand what happened, protect people, correct or hold the right thing, and leave an auditable explanation.

Typical questions:

- Which Order, Work, obligation, evidence, consent, or incident is affected?
- Who acted, when, and from which role?
- What did each party see?
- Is the record demo, sandbox, training, or genuine Tagudin activity?
- Is the next action a retry, request for evidence, hold, correction, support message, or escalation?

UI implications:

- Operations view is an investigation workspace, not a colorful “success” dashboard.
- Show separate timelines for Order, Work, Payment Obligation, Evidence, Dispute, Consent, and Hold.
- Corrections append a new event; the original is still visible.
- High-impact controls require a reason and show the affected scope before confirmation.

### 5.6 Capstone evaluator

Goal: see a coherent, traceable, safe product concept without confusing sandbox behavior with production readiness.

UI implications:

- Scenario and cohort labels are always discoverable.
- A reviewer can move from Buyer to Provider to Admin without losing the same scenario.
- The prototype explains what is simulated and what is intentionally not implemented.
- The evaluator sees failure/recovery, not just a happy-path gallery.

## 6. Access contexts

| Context | Person sees | Design requirement | Never imply |
|---|---|---|---|
| L0 feature-phone owner notice | Short critical confirmation/request | Plain language, attribution, response method, fallback | Full digital self-service |
| L1 assisted kiosk/access point | Guided task with helper context | Consent, assisted attribution, privacy boundary | Kiosk cash custody or payout |
| L2 low-data smartphone | Compact journey with drafts/retry | Small payload, resumable state, stale warning | Offline final authority |
| L3 online user | Full Buyer/Provider/Owner journeys | Clear hierarchy and support | That online status means verified trust |
| L4 Admin/Operator | Desktop investigation and controls | Least privilege, audit, reasons, recovery | Erasing history or unguarded release |

## 7. Information architecture

### 7.1 Global shell

Every current prototype route should expose:

- Prototype label: `REFERENCE ONLY — NO BACKEND`.
- Current actor and role.
- Scenario/cohort label.
- Geography when relevant: `Tagudin pilot context`.
- Current object: Listing, Request, Order, Work, Payment Obligation, Evidence, Dispute, Consent, or Hold.
- A visible back route where meaningful.
- A hub or journey-map route.
- Help/support route.
- One obvious primary action.

The shell may be a desktop workspace rather than a phone frame. A designer may use a left rail, top context bar, timeline column, and main content panel, as long as the user can see what stage they are in.

### 7.2 Buyer navigation

`Home → Browse/Search → Listing detail → Request/Book → Terms and lane → Order → Work timeline → Evidence/Review → Completion or concern → Support`

### 7.3 Provider/Owner navigation

`Home → My listings → Listing setup/review → Inbox/requests → Quote/order → Work plan → Evidence/propose completion → Payment obligation → Review/dispute → History`

### 7.4 Agent navigation

`Owner invitations → Active consent scopes → Assisted tasks → Approval requests → Owner notices → Revoke/pause → History`

### 7.5 Admin navigation

`Operations home → Cohort/classification → User/verification → Listing → Order/Work → Payment/evidence → Disputes/holds → Safety → Failed events/retry → Audit → Metrics/recovery`

### 7.6 Journey map

The journey map should show:

- Current step.
- Previous step.
- Next expected action.
- Alternative branch such as clarification, cancel, dispute, or support.
- Which role is currently responsible.
- What event will notify the other roles.

It should not be a decorative progress bar that hides blocked or disputed branches.

## 8. Screen anatomy

Every detailed screen should have these zones, even if the visual designer combines them:

1. **Context header** — role, object, scenario, and status.
2. **Human headline** — what the person is trying to do or understand.
3. **Immediate truth** — the most important amount, task, timing, person, or risk.
4. **Decision panel** — one primary action and visible alternatives.
5. **Supporting evidence** — scope, item, timeline, photo/file, consent, or explanation.
6. **Status explanation** — status label plus “what this means” and “what happens next.”
7. **Recovery/support** — safe action when the expected path does not work.
8. **Cross-role note** — what another party will see, where useful.
9. **Prototype metadata** — screen ID, trace IDs, and sandbox/reference label in the design handoff, not necessarily dominant in the user-facing composition.

### 8.1 The primary action rule

The primary action must be a verb that matches the user’s actual responsibility:

- `Request this service`
- `Ask for a quote`
- `Accept these terms`
- `Confirm the schedule`
- `Declare payment`
- `Acknowledge receipt`
- `Start Work`
- `Add progress evidence`
- `Propose completion`
- `Confirm completion`
- `Report a concern`
- `Ask for support`
- `Approve this Agent action`
- `Pause this listing`

Avoid generic actions such as `Continue`, `Submit`, or `Done` when the consequence matters.

### 8.2 Confirmation anatomy

Before a consequential action, show:

- What will happen.
- Which object changes.
- Which actor is recorded.
- Amount and currency, if applicable.
- Who receives or controls money, if applicable.
- Whether Work, payment, evidence, or release changes.
- What does not change.
- How to correct or dispute later.

### 8.3 Status anatomy

A status badge is never sufficient by itself. Pair it with:

- Plain-language meaning.
- Actor who caused it.
- Time or freshness.
- Next responsible actor.
- Consequence if no action occurs.
- Support route when high-impact.

### 8.4 Layout archetypes for the visual designer

These are composition defaults, not final branding:

| Layout archetype | Best for | Desktop/workspace composition | Narrow/mobile behavior |
|---|---|---|---|
| Discovery and comparison | Home, browse, search, results, quotes | Search/context header; filter rail; result list; selected-item preview | Filters become drawer/chips; one result per row; sticky task action |
| Guided form and review | Account, listing, request, consent, evidence submission | Step rail; focused form; persistent plain-language summary; primary action at end/sticky footer | One conceptual question per section; collapsible summary; preserve draft visibly |
| Shared transaction workspace | Order, Work, Payment, completion | Context header; immediate next-action panel; separate Order/Work/Payment cards; event timeline | Stack cards in responsibility order; next action first; timeline after summaries |
| Appointment/handoff workspace | A3/A4 physical interaction | Schedule/place/item panel; safety panel before confirmation; participant responsibilities; receipt/attendance action | Time/place/item and safety stay above primary action; no hidden side panel |
| Digital delivery workspace | A9 | Scope/version header; artifact/evidence area; revision thread; acceptance panel | Version and acceptance state remain visible; files do not replace action labels |
| Evidence, concern, and support | Payment proof, mismatch, dispute, support | Affected-object summary; evidence list; focused concern/remedy form; case timeline | Show affected object first; progressive evidence input; persistent help/exit |
| Agent-assisted workspace | Owner consent and Agent tasks | Persistent acting-for banner; permission scope; Owner resource; approval/history rail | Acting-for identity never scrolls away; approval consequence repeated before action |
| Admin investigation workspace | OPS-001–009 | Triage queue; multi-aggregate inspector; event/evidence timeline; guarded action drawer | Read-only summary first; high-risk actions in separate confirmed step; no tiny dashboard-only controls |
| Scenario/evaluator shell | SYS-001–004 | Scenario cards; role switcher; journey map; prototype limits; reset | Current scenario/role always visible; reset/help available without losing orientation |

Visual priority inside any archetype should follow: `user goal → immediate truth/risk → next action → supporting detail → history/metadata`. Do not lead with internal IDs, requirement numbers, or a feature explanation.

## 9. Detailed journey playbooks

Each playbook below is a design brief. The visual agent should turn each stage into a realistic screen or a clearly addressable state variant, not a feature-description card.

### J-01 Buyer registration and discovery

Trace: UX-002; PRD-001, PRD-009–017; DSC-001–006; ACC-001–003.

#### Stage 1 — Arrive with a practical need

- Actor: Buyer/Customer.
- User goal: find help or a product without knowing marketplace terminology.
- They see: Tagudin context, simple search/category choices, small-job examples, help/language/accessibility entry.
- They need to understand: this is a local coordination tool; they can browse before committing; categories may have different safety or availability rules.
- Primary action: `Find a service or product`.
- Alternatives: `Post what I need`, `Get help`, `Use assisted access`.
- Avoid: feature inventory, growth slogans, fake popularity, Candon as current pilot, unsupported categories.
- Recovery: if no result, show nearby category families, request option, or support—not a dead empty screen.

#### Stage 2 — Browse/search/filter

- Actor: Buyer.
- User goal: narrow choices by actual need, place, timing, amount, and availability.
- They see: category family, listing type, Work shape, availability/capacity, mechanism, price/quote/budget meaning, and relevant safety cue.
- Primary action: `Open listing`.
- Alternatives: adjust filters, ask for a quote, create a request.
- Empty state: explain why there are no matches and offer a request path.
- Stale state: mark unavailable/expired instead of showing it as active.
- Low-data state: retain filters and draft intent locally; clearly label freshness.

#### Stage 3 — Listing detail

- Actor: Buyer.
- User goal: decide whether this specific offer is suitable and safe.
- They see first: what is offered, what is not included, amount semantics, Provider/Owner, area, timing, capacity, evidence expectation, payment lanes, and safety guidance.
- Primary action: `Request this service` or `Book this listing`, depending on mechanism.
- Alternatives: `Ask a question`, `Save draft`, `Report/block`, `View trust and safety summary`.
- Trust: show evidence-based history or `New Provider`; do not show unsupported verification.
- Payment: show whether the lane is External Cash, External Digital Proof, or sandbox-only.
- Recovery: if capacity changed, explain and offer a replacement or new request rather than silently switching terms.

### J-02 Provider/Owner onboarding and listing creation

Trace: UX-001, UX-003–005; PRD-001–016, PRD-023; ACC-001–007; LST-001–007.

#### Stage 1 — Choose capability

- Actor: Provider/Owner or assisted Agent.
- User goal: understand what they can offer without being forced into an exclusive role.
- They see: capabilities, examples, access/verification status, and what is conditional.
- Primary action: `Create a listing`.
- Alternatives: `Ask for assistance`, `See requirements`, `Save and return`.
- Avoid: role labels that imply permanent identity or a trust tier without evidence.

#### Stage 2 — Choose listing type and Work shape

- Actor: Provider/Owner/Agent.
- User goal: describe a service/product in a way a Buyer can understand.
- They see: Service Listing vs Product Listing, A1/A3/A4/A9 shape explanations, mechanism choices, safety/data class, and availability/capacity fields.
- Primary action: `Use this listing type`.
- Guard: unsupported combinations are visibly disabled with a reason.
- Agent: show “drafting for [Owner]” and permission scope.

#### Stage 3 — Fill listing details

- Actor: Provider/Owner.
- User goal: state scope, price/quote/budget semantics, timing, location, capacity, and evidence expectations.
- Form behavior: ask only fields relevant to the selected type/shape; mark required vs optional; give examples from low-value work.
- Primary action: `Preview listing`.
- Recovery: preserve draft; field error appears next to the field with a correction example.
- Safety: explain sensitive data and meeting/handoff expectations before publication.

#### Stage 4 — Preview/review/activate

- Actor: Provider/Owner/Admin depending on gate.
- User goal: verify how a Buyer will understand the listing.
- They see: public-facing preview, missing information, capacity, status, and any review gate.
- Primary action: `Submit for review` or `Publish listing`.
- After action: listing becomes a state with a visible lifecycle: draft, pending review, active, paused, unavailable, expired, rejected, archived.
- Avoid: immediate “live” appearance when review is required.

### J-03 Agent-assisted Owner consent

Trace: UX-003; PRD-004–008, PRD-023; AGT-001–004.

#### Stage 1 — Invitation

- Actor: Owner and Agent.
- User goal: know who is asking to help and why.
- They see: Agent identity, affected Owner, purpose, requested scope, duration/expiry, sensitive actions, and how to decline.
- Primary action: `Review permission request`.
- Avoid: “Accept Agent” without scope.

#### Stage 2 — Scope confirmation

- Actor: Owner.
- User goal: authorize only the needed actions.
- They see three groups: allowed, approval-required, forbidden.
- Primary action: `Approve this scope`.
- Alternatives: edit scope, decline, ask for help.
- Consequence: Owner remains Owner; Agent is recorded as acting Agent.

#### Stage 3 — Assisted action

- Actor: Agent acting for Owner.
- User goal: complete a permitted task.
- Persistent context: `You are acting for [Owner]` plus scope.
- Primary action: task-specific verb such as `Save listing draft for Owner`.
- Blocked action: money/goods custody or ownership change shows why it is unavailable and offers an Owner approval/support route.

#### Stage 4 — Owner notice/revoke

- Actor: Owner.
- User goal: see what the Agent did and retain control.
- They see: action history, affected object, timestamp, permission used, pending approvals, pause/revoke controls.
- Primary action: `Pause assistance` or `Revoke access`.
- Consequence: future actions blocked; history remains.

### J-04 Service request and quote

Trace: UX-006; PRD-018–020; REQ-001–005.

#### Stage 1 — Describe need

- Actor: Buyer.
- User goal: explain the need without knowing the Provider’s internal process.
- They see: service/product choice, plain-language need prompt, scope/item, timing, Tagudin location, budget/estimate, privacy/safety choices.
- Primary action: `Send request`.
- Recovery: save draft; explain who may respond and when information is shared.

#### Stage 2 — Provider reviews request

- Actor: Provider.
- User goal: determine whether they can fulfill the request.
- They see: Buyer’s request, missing details, timing, safety context, response eligibility, and ability to ask clarification.
- Primary action: `Prepare a quote` or `Ask a question`.
- Avoid: forcing a quote when scope is unclear.

#### Stage 3 — Quote detail

- Actor: Buyer and Provider.
- User goal: compare meaning, not just numbers.
- Quote displays: scope, inclusions/exclusions, amount semantics, validity, Work shape, schedule/capacity, payment lanes, evidence expectations, cancellation/change meaning.
- Primary action for Buyer: `Accept these terms`.
- Alternatives: request clarification, decline, let expire.
- Acceptance: creates an immutable Order terms snapshot.

#### Stage 4 — Expiry/change

- Actor: Buyer/Provider/Admin.
- User goal: understand whether terms remain usable.
- Expired quote: no silent conversion into an Order; show request-again or clarify route.
- Changed scope after acceptance: show change event and affected payment/work consequences.

### J-05 Order formation and shared summary

Trace: UX-004–007; PRD-017–023; ORD-001–004.

- Actor: Buyer, Provider/Owner, Agent where scoped.
- User goal: confirm that both sides mean the same thing before Work starts.
- Shared summary must show: parties and roles, accepted listing/request/quote, scope, amount/quote/budget, Work shape, timing/location, payment obligation, payment lane, who controls money, evidence expectations, cancellation/change path, safety notes.
- Primary action: role-specific `Accept order` or `Confirm terms`.
- Secondary actions: ask clarification, request change, cancel before commitment where allowed.
- After acceptance: show Order as accepted, but Work and Payment Obligation separately.
- Cross-role: Buyer sees Provider acceptance; Provider sees Buyer acceptance; Agent sees acting/affected identity; Admin sees snapshot event.

### J-06 A1 Linear Project Work

Trace: UX-008, UX-016–018; PRD-024–025, PRD-031, PRD-046–050; A1-001–003.

#### Stage 1 — Work plan

- Provider sees: agreed scope, steps, expected evidence, buyer contact boundary, and `Start Work`.
- Buyer sees: what the Provider plans to do, current status, and when they may need to review.
- Primary action: Provider `Start Work`; Buyer `View work plan`.
- Avoid: a single progress percentage without meaningful step names.

#### Stage 2 — Progress/evidence

- Provider sees: step checklist, evidence upload/add note, revision context, privacy/redaction guidance.
- Buyer sees: progress event, evidence version, what is still not complete.
- Primary action: `Add progress evidence` or `Request clarification`.
- Upload is not completion; evidence status is distinct from completion status.

#### Stage 3 — Completion proposal

- Provider sees: completion checklist and evidence requirements.
- Primary action: `Propose completion`.
- Buyer sees: `Work completion proposed`, evidence, scope comparison, and `Confirm completion` / `Report a concern`.
- Payment state is shown separately and is not changed by proposal alone.

#### Stage 4 — Sign-off or concern

- Buyer confirms only after understanding what changes.
- Concern flow asks what is incomplete, requests evidence if useful, and opens support/dispute if needed.
- Admin sees the same timeline and can place a relevant hold; it cannot erase the prior proposal.

### J-07 A3 Appointment

Trace: UX-009, UX-016–018, UX-021; PRD-026, PRD-031, PRD-050–051; A3-001–004.

#### Stage 1 — Availability/slot

- User sees: date/time, duration, location context, privacy/contact boundary, and conflict warning.
- Primary action: `Request this time` or `Confirm slot`.
- If conflict: preserve selection and show alternatives; never silently replace the slot.

#### Stage 2 — Appointment confirmation

- Shared view: date, time, place, who is expected, what will happen, cancellation/reschedule meaning, safety guidance.
- Primary action: `Confirm appointment`.
- Safety appears before confirmation: public/safer setting, no-entry default where appropriate, contact/report options.

#### Stage 3 — Reschedule/cancel/no-show

- User sees the current commitment and consequence of each choice.
- Primary actions: `Request reschedule`, `Cancel appointment`, `Report no-show`.
- Do not invent universal appeal windows or fixed SLA promises.
- Support route remains available when the other party is unsafe or unreachable.

#### Stage 4 — Attendance/completion

- Attendance evidence and Work completion are distinct.
- Buyer confirms the interaction or reports a concern.
- Payment declaration does not mark attendance or completion.

### J-08 A4 Product Handoff

Trace: UX-010, UX-016–018, UX-021; PRD-014, PRD-027–028, PRD-031, PRD-046–051; A4-001–005.

#### Stage 1 — Preparation/capacity

- Provider sees quantity, capacity, preparation checklist, and oversell/conflict state.
- Buyer sees expected item, quantity, readiness, and pickup/handoff instructions.
- Primary action: Provider `Mark ready`.
- If unavailable: show `Unavailable` and offer correction/support; do not promise stock.

#### Stage 2 — Safe handoff

- Shared view: place/time, instructions, privacy/safety guidance, item/quantity, and expected receipt action.
- Primary action: `Confirm handoff` only after the relevant actor can inspect/receive.

#### Stage 3 — Receipt/acceptance

- Buyer sees quantity/condition confirmation.
- Provider sees Buyer receipt status.
- Primary action: Buyer `Acknowledge receipt` or `Report a mismatch`.
- Handoff evidence supports the claim but does not automatically settle unrelated payment state.

#### Stage 4 — Mismatch

- User selects quantity, condition, item, timing, or other mismatch.
- Screen shows affected Order/Work and any payment obligation separately.
- Primary action: `Report a concern`.
- Recovery: correction, replacement/clarification, support, or dispute; no automatic cash-refund promise.

### J-09 A4 purchase-on-behalf conditional

Trace: UX-007; PRD-028; A4-005.

- Actor: Buyer, Provider/Agent.
- User goal: request a purchase without assuming the helper may spend freely.
- Stages: item/alternatives → budget/estimate → approval before spend → actual cost/variance → receipt evidence → handoff.
- The UI must repeat whether the shown amount is estimated or actual.
- Approval screen must show maximum/expected spend, alternatives, what happens if cost changes, and who must approve.
- Agent/Provider cannot silently exceed approved scope.
- Receipt evidence is labeled submitted/accepted according to actual state, not automatically verified.

### J-10 A9 Digital Delivery

Trace: UX-011, UX-016–018; PRD-029, PRD-031, PRD-046–050; A9-001–003.

#### Stage 1 — Digital scope

- Buyer sees deliverable, format, revision expectation, privacy/retention note, and acceptance criteria.
- Provider sees version target and evidence requirement.
- Primary action: Provider `Start digital Work`.

#### Stage 2 — Artifact delivery

- Provider sees version history and upload/privacy guidance.
- Buyer sees secure access state, file/version, and whether review is required.
- Primary action: Buyer `Review version`.
- Upload does not equal acceptance or completion.

#### Stage 3 — Revision/acceptance

- Buyer chooses `Accept version`, `Request revision`, or `Report a concern`.
- Revision preserves version 1 and creates version 2; history is visible.
- Provider sees the exact requested change, not just a red badge.
- Retention/deletion and private evidence messaging are visible.

### J-11 Payment lanes

Trace: UX-012–015; PRD-032–043; PAY-001–008.

#### Common payment-obligation view

Every lane uses the same readable summary:

- Purpose: what this amount is for.
- Amount: exact peso amount or clearly marked estimate/quote.
- Payer and intended recipient.
- Lane name.
- Who controls funds.
- Protection meaning.
- Evidence status.
- Next action.
- What this does not prove.

#### External Cash

User-facing truth:

- Buyer pays Provider/Owner directly.
- Serbizyu does not hold the cash.
- Initial pilot commission is 0%.
- A declaration is not automatic proof.
- A mismatch goes to clarification/dispute/support; no automatic cash recovery promise.

States to show visually: `Not declared → Payment declared → Awaiting counterparty acknowledgment → Counterparty acknowledged → Mismatch/Disputed → Corrected`.

Cross-role after Buyer declaration: Buyer sees their declaration; Provider sees a receipt action; Admin sees an event; Work remains unchanged.

#### External Digital Proof

User-facing truth:

- External provider/reference is named.
- Amount/time/reference and redaction guidance are visible.
- Screenshot/reference is user evidence, not automatically provider-verified.
- Serbizyu did not control the external funds.
- Not protected by Tiwala.

States: `Payment declared → Evidence submitted → Counterparty acknowledged or Provider verified only with trusted adapter → Disputed/Rejected/Superseded`.

#### Direct Digital sandbox

Persistent visible label: `SANDBOX ONLY — simulated provider event — no live-money result`.

Show: test provider, simulated amount, event status, reconciliation example, and what the demo does not authorize. Do not make the button look like a live checkout.

#### Tiwala Protected Digital sandbox

Persistent visible label: `SANDBOX ONLY — protected-release behavior is simulated`.

Show separate panels for Work completion, sign-off/review eligibility, dispute, holds, reconciliation, and release guard. A release attempt before guards pass should visibly fail with the unmet guard list. Never present this as an unqualified legal escrow promise.

### J-12 Completion, review, dispute, and support

Trace: UX-016–022; PRD-043–058; ORD-003–005; TRU-001–004; OPS-001–009.

#### Completion proposal

The user sees what evidence is being submitted, what is complete, what remains, who must act, and which payment/release state (if any) is affected.

#### Review/sign-off

The Buyer sees the consequence before confirming: Work becomes completed if valid; a protected sandbox may become eligible only if every guard passes; an external payment declaration does not become verified.

#### Dispute intake

Ask only what is necessary:

- What happened?
- Which Order/Work/Payment Obligation/Evidence is affected?
- What evidence is available?
- Is there an immediate safety concern?
- What outcome is requested?

Show that submitting a dispute may place a hold or pause completion according to policy. Do not promise a fixed outcome, universal time window, or automatic refund.

#### Support case

Show owner, current status, next responsible actor, expected next step, and timeline. A support route must not be a dead email address or generic toast.

### J-13 Admin operations and recovery

Trace: UX-022–023; PRD-052–059; OPS-001–009.

#### Operations home

- Actor: Admin/Operator.
- Goal: triage what needs attention without confusing demo and genuine data.
- First view: cohort/evidence class, open disputes/holds, safety incidents, failed events, pending review, and support burden.
- Primary action: `Open item needing attention`.
- Every count has its class and meaning; no false revenue from External Cash.

#### Order/Work inspector

- Search by correlation, actor, Order, Work, obligation, evidence, dispute, or support case.
- Show separate state timelines.
- Show accepted snapshot and later corrections.
- Admin action requires scope preview, reason, and confirmation.

#### Payment/evidence inspector

- Show lane, purpose, amount, evidence state, actor, custody/protection meaning, and reconciliation status.
- Distinguish uploaded, submitted, acknowledged, provider verified, rejected, superseded, and held.
- Never let a support correction silently rewrite financial history.

#### Dispute/hold console

- Show reason class, affected scope, evidence requests, creator/approver, active guards, next action, and resolution history.
- A hold blocks only the relevant action/aggregate; the UI must explain scope.

#### Failed events/retry

- Show event type, target, attempt count, last error, next safe retry, dead-letter/support route, and idempotency boundary.
- Retry is not a magic success button; show result or safe failure.

#### Metrics/classification

- Separate `capstone_demo`, `sandbox`, `team_training`, and `genuine_tagudin_fixture`.
- Show counts alongside rates for small samples.
- Never report External Cash as platform revenue.

## 10. Cross-role visibility matrix

| Action | Acting role sees | Counterparty sees | Admin sees | Unchanged aggregate |
|---|---|---|---|---|
| Buyer sends request | Request submitted/pending response | Eligible Provider sees request/inbox | Request event and cohort | Existing listing |
| Provider sends quote | Quote pending/validity | Buyer sees scope/amount/terms | Quote event | Work/payment not created as settled |
| Buyer accepts quote | Order terms accepted | Provider sees acceptance | Snapshot event | Work remains not started; payment remains due/created |
| Provider starts Work | Work in progress | Buyer sees progress and expected next review | Work event | Payment state |
| Provider adds evidence | Evidence submitted/version | Buyer sees evidence available | Evidence/audit event | Completion, payment |
| Buyer declares External Cash | Payment declared | Provider sees receipt action | Payment event | Work state |
| Provider acknowledges cash | Counterparty acknowledged | Buyer sees acknowledgment | Payment event | Work state |
| Provider proposes completion | Completion proposed; awaiting Buyer review | Buyer sees sign-off/concern choice | Work event and evidence context | Payment Obligation state; protected-release eligibility is not evaluated from proposal alone |
| Buyer signs off | Work completed | Provider sees completion | Work event and review | External Cash does not become platform-collected |
| Buyer reports mismatch | Disputed/needs support | Provider sees concern/evidence request | Dispute/hold candidate | Original history |
| Agent saves Owner draft | Agent attribution and draft | Owner sees notice | Consent/action audit | Ownership |
| Owner revokes Agent | Revocation confirmed | Agent sees future actions blocked | Consent event | Prior history |
| Admin places hold | Hold explanation where authorized | Affected roles see blocked action/support | Hold reason/scope/actor | Unrelated aggregates |
| Admin corrects record | Correction notice where applicable | Affected party sees new event | Original + correction | Historical records |

## 11. State and variant reference

Every high-impact screen should have an intentional design for the applicable variants below.

| Variant | User must see | Safe action |
|---|---|---|
| Loading | What is being loaded and whether old data is visible | Wait/cancel/return; never act on unknown state |
| Empty | Why there is no data and what can be done next | Browse, create request, retry, help |
| Normal | Current truth, goal, primary action | Complete next step |
| Validation error | Field/problem and correction example | Fix and preserve draft |
| Permission denied | Which permission is missing and who can act | Request approval/help; do not retry blindly |
| Offline/low-data | Freshness and unsent draft status | Save draft/retry when connected |
| Retryable failure | What failed, whether it may have happened, retry safety | Retry idempotently or contact support |
| Expired/stale | Which term/slot/evidence is no longer current | Refresh, request again, clarify |
| Submitted/pending | Actor, timestamp, expected next actor | Wait, view timeline, cancel where allowed |
| Confirmed | Exactly what changed and what did not | Proceed to next responsible task |
| Mismatch | Affected object and disagreement | Clarify, add evidence, dispute/support |
| On hold | Hold scope, reason class, blocked action | Supply evidence/support; do not bypass |
| Corrected/superseded | Original and replacement relationship | Review new terms; history remains |
| Conditional/deferred | Why unavailable and activation boundary | Return, save, request support |
| Sandbox-only | Persistent simulation/test context | Explore guarded demo; no real expectation |

## 12. Special interaction rules

### 12.1 Amount and fee comprehension

Before any monetary confirmation, show:

- Exact peso amount when known.
- Whether it is price, quote, estimate, budget, fee, or obligation.
- Who pays whom.
- Whether Serbizyu holds anything.
- Whether protection is absent, simulated, or subject to guards.
- What happens on mismatch/cancellation.

Small jobs such as ₱50–₱100 remain valid examples. Do not use a hidden universal minimum.

### 12.2 Evidence and privacy

- Explain why evidence is requested.
- Show who may access it.
- Provide redaction/masking guidance.
- Distinguish uploaded, submitted, acknowledged, verified, rejected, superseded, and held.
- Never show a screenshot as automatically cleared payment.
- Never collect or display real identity documents in the throwaway prototype.

### 12.3 Safety at the point of risk

For appointments, pickup, handoff, location sharing, and physical work, show safety before the action:

- Public/safer meeting preference.
- No-entry default where appropriate.
- Contact/location privacy.
- Block/report route.
- Category-specific caution.
- Immediate support/emergency boundary without inventing a hotline.

### 12.4 Notifications and fallback

Every critical notice states:

- What changed.
- Who acted.
- Which object is affected.
- What the recipient must do.
- Whether there is an expiry/deadline.
- How to open the related screen or request help.

Failure to deliver a notification creates a visible pending/retry/support state.

### 12.5 Forms and low-friction input

- Ask one conceptual question at a time where possible.
- Use examples, not placeholder-only instructions.
- Keep required/optional visible.
- Preserve entered content after validation errors.
- Use category-specific fields instead of a giant universal form.
- Repeat critical answers in the review step.

### 12.6 Accessibility

- Visible keyboard focus.
- Semantic heading order.
- Labels associated with fields.
- Adequate contrast.
- Icon plus text.
- No color-only payment, dispute, safety, or permission meaning.
- Large touch targets.
- Reduced-motion-safe transitions.
- Text alternatives for important images/files.
- Error messages next to the affected control.

## 13. Content and status language

### Use

- Buyer / Customer.
- Provider / Owner.
- Agent Assistance.
- Admin / Operator.
- Listing, Request, Quote, Order, Work, Payment Obligation.
- Payment declared.
- Evidence submitted.
- Counterparty acknowledged.
- Provider verified only when a trusted adapter supports it.
- Work completion proposed.
- Completed.
- Disputed.
- On hold.
- Needs support.
- Not protected by Tiwala.
- Sandbox only.

### Avoid

- Unqualified escrow claims.
- Paid when only a declaration exists.
- Verified when only a screenshot/upload exists.
- Guaranteed refund/recovery.
- Wallet balance or cash receivable behavior for the initial pilot.
- Agent owns/manages money by default.
- Candon as current pilot geography.
- Historical fee percentages or splits.
- Trust score, invented evidence scores, universal SLA/appeal windows.
- Quick Deal, Deal-Chaining, or deferred shapes presented as committed pilot capability.
- GCash/Xendit as a committed payment rail.
- Fictional hotline or emergency guarantee.

### 13.1 Unresolved-policy boundary — do not decide in the mockup

The visual designer must use conditional, generic, or support-oriented copy until an upstream decision defines:

- Exact cancellation penalties, automatic-completion timing, review-window duration, or inactivity outcome.
- Universal dispute SLA, evidence deadline, appeal limit, or number of dispute rounds.
- Automatic cash refund, replacement, recovery, or compensation outcome.
- Exact government-ID types, public identity badges, face matching, clearance requirements, or sensitive-data collection readiness.
- Final category-specific safety rules where the approved capability profile is still conditional.
- Exact notification channel, guaranteed delivery time, or fictional support/emergency contact.
- Automatic ranking, trust score, evidence score, or provider-quality claim.
- Final Agent permission bundle beyond the explicit consent/custody boundaries.
- Connected-payment provider brand, live fee/rate, production checkout, refund, payout, or reconciliation behavior.
- Tiwala legal classification, production custody claim, release-window duration, or live-money readiness.
- Any geographic expansion beyond Tagudin.

When a mockup needs one of these details, label it `Policy to be defined`, `Conditional`, `Sandbox only`, or route to support as appropriate. Do not hide the missing decision behind realistic-looking sample policy.

### 13.2 Microcopy patterns

English is the baseline for individual reference screens. The hub may show an approved English/Taglish mode, but a designer must not create divergent behavior through separate translations. Future Ilocano copy requires its own reviewed content keys.

| Situation | Recommended user-facing pattern | Avoid |
|---|---|---|
| External Cash declaration | `You reported paying ₱80 directly to the Provider. The Provider still needs to acknowledge receipt. Serbizyu does not hold this cash.` | `Payment successful` |
| External evidence submitted | `Evidence submitted. This screenshot supports your report but does not prove the external funds cleared.` | `Payment verified` |
| Work started | `The Provider started the agreed Work. Payment status did not change.` | `Order successful` |
| Completion proposal | `The Provider says the agreed Work is ready for review. Check the evidence before confirming.` | `Job completed` before Buyer/sign-off rules pass |
| Buyer sign-off | `You confirmed the Work as completed. External payment status remains separate.` | `Funds released` unless a sandbox protected-release guard separately passes |
| Mismatch | `Your report is saved. Tell us what does not match so the other party and support can respond.` | `Refund approved` |
| Hold | `This action is paused while support reviews the stated concern. Other parts of the Order may remain available.` | `Account frozen` without scope/reason |
| Agent assistance | `[Agent] is helping [Owner] with this listing. [Owner] remains the Owner.` | `Agent owns this listing` |
| Offline draft | `You are offline. Your draft is saved on this device and has not been submitted.` | `Saved` without saying whether server confirmation occurred |
| Retry uncertainty | `We could not confirm whether the action finished. Check the timeline before trying again.` | Blind `Retry` that may duplicate an action |
| Sandbox payment | `Test only. No real payment, payout, protection, or pilot result occurred.` | A live-looking success receipt |
| Unresolved rule | `This policy is not yet defined for the reference. Use support/conditional handling.` | Invented countdown, deadline, fee, or guaranteed outcome |

## 14. Visual designer handoff checklist

The separate design agent should produce a low-fidelity but product-like connected reference prototype that can answer these review tasks:

1. As a Buyer, find a low-value practical service and understand the amount before requesting it.
2. As a Buyer, see what a new Provider means by availability and evidence.
3. As a Provider, understand the exact scope and what counts as completion.
4. As a Provider, start Work and add evidence without accidentally completing it.
5. As a Buyer, declare External Cash and see that Work did not change.
6. As the Provider, see the receipt-confirmation action caused by the Buyer declaration.
7. As a Buyer, review a completion proposal and choose sign-off or concern.
8. As a Buyer, report a mismatch and understand the support/dispute path.
9. As a Provider, see the same mismatch without losing the accepted terms history.
10. As an Agent, approve a scoped Owner action and see attribution.
11. As an Owner, inspect and revoke Agent access.
12. As a Buyer and Provider, book an A3 appointment with visible safety guidance.
13. As a Buyer and Provider, complete an A4 handoff and report a quantity/condition mismatch.
14. As a Buyer and Provider, work through an A9 revision without treating upload as acceptance.
15. As an Admin, inspect the same scenario and distinguish Order, Work, Payment, Evidence, Dispute, and Hold.
16. As an Admin, retry a failed notification/event and see the result.
17. As an evaluator, identify which records are demo, sandbox, training, or genuine Tagudin fixtures.
18. As a low-data user, lose connection during a form and recover the draft safely.
19. As an assisted user, understand what the Agent can and cannot do.
20. As any user, find help when blocked without receiving a generic success toast.

A screen that only says “feature available” fails these tasks. The designer must show the actual decision, consequence, and recovery.

## 15. Traceability index

### UX journey coverage

| UX ID | Dossier sections | Bridge screen families |
|---|---|---|
| UX-001 | 5.3, J-02, 12.2 | ACC-001–007, OPS-002 |
| UX-002 | 5.1, J-01 | DSC-001–006 |
| UX-003 | 5.4, J-03 | SYS-002, AGT-001–004 |
| UX-004 | 5.3, J-02, J-05 | LST-001–007, ORD-001 |
| UX-005 | 5.3, J-08 | LST-001–007, A4-001–005 |
| UX-006 | J-04, J-05 | REQ-001–005, ORD-001 |
| UX-007 | J-04, J-09 | REQ-001–005, A4-005 |
| UX-008 | J-06 | ORD-002–005, A1-001–003 |
| UX-009 | J-07 | A3-001–004 |
| UX-010 | J-08, 12.3 | A4-001–005 |
| UX-011 | J-10, 12.2 | A9-001–003 |
| UX-012 | J-11 | PAY-001–004 |
| UX-013 | J-11, 12.2 | PAY-001/002/005/006 |
| UX-014 | J-11 | PAY-007 |
| UX-015 | J-11 | PAY-008 |
| UX-016 | J-06–J-12 | ORD-003/005, shape screens |
| UX-017 | J-04, J-07–J-10 | ORD-004, shape screens |
| UX-018 | J-08–J-12 | TRU-002, OPS-003/005 |
| UX-019 | 12.4, J-12 | TRU-001/004, OPS-007 |
| UX-020 | 5.2, 6, 12.5, 12.6 | SYS-004, low-data variants |
| UX-021 | 12.3, J-07/J-08 | TRU-003, OPS-006 |
| UX-022 | 5.5, J-13 | OPS-001–009 |
| UX-023 | 5.6, J-13 | SYS-002, OPS-001/008 |

### Domain/state coverage

| Domain concept | Visible UX treatment |
|---|---|
| Listing | Listing lifecycle, capacity, availability, review, version |
| Order | Accepted terms snapshot, parties, changes/cancellation |
| Work Instance | Shape-specific progression, evidence, completion proposal/sign-off |
| Payment Obligation | Purpose, amount, lane, evidence, confirmation, correction |
| Evidence | Uploader, status, privacy, version, retention/hold |
| Consent Grant | Scope, actor, expiry, notice, revoke |
| Dispute | Affected object, reason, evidence, hold, resolution |
| Administrative Hold | Scope, reason, creator/approver, blocked transition |
| Audit/Event | Actor, action, target, prior/new state, time, correlation |

## 15.1 PRD requirement coverage matrix

The dossier does not replace the PRD; this matrix proves that every PRD requirement has a user-facing design responsibility or an explicit non-visual boundary.

| PRD ID | Dossier responsibility |
|---|---|
| PRD-001 | Actor/access context; J-01/J-02; 6 |
| PRD-002 | Identity/privacy boundary; J-02; 12.2 |
| PRD-003 | Evidence-based trust; J-01/J-02; 13 |
| PRD-004 | Agent consent; J-03 |
| PRD-005 | Agent custody/ownership boundary; J-03 |
| PRD-006 | L0 notices and fallback; 6, 12.4 |
| PRD-007 | L1 assisted access; 6, J-03 |
| PRD-008 | L2 draft/retry behavior; 6, 11 |
| PRD-009 | L3/L4 context; 6, 7 |
| PRD-010 | Four listing/request types; J-01/J-02/J-04 |
| PRD-011 | Listing detail anatomy; J-01/J-02 |
| PRD-012 | Listing lifecycle; J-02 |
| PRD-013 | Tagudin discovery; J-01 |
| PRD-014 | Product capacity/oversell; J-08 |
| PRD-015 | Category/safety/data/evidence status; J-01/J-02 |
| PRD-016 | Unsupported category boundary; J-01/J-02 |
| PRD-017 | Direct Booking; J-01/J-05 |
| PRD-018 | Quote Request; J-04 |
| PRD-019 | Response/selection/expiry; J-04 |
| PRD-020 | Conditional order-formation behavior; J-04/J-05 |
| PRD-021 | Offline irreversible-action boundary; 6, 11 |
| PRD-022 | Deferred Deal-Chaining boundary; 13 |
| PRD-023 | Agent attribution; J-03, 10 |
| PRD-024 | Order/Work separation; J-05/J-06 |
| PRD-025 | A1 scope/evidence/revision/sign-off; J-06 |
| PRD-026 | A3 appointment states; J-07 |
| PRD-027 | A4 handoff states; J-08 |
| PRD-028 | Purchase-on-behalf conditional; J-09 |
| PRD-029 | A9 version/delivery/acceptance; J-10 |
| PRD-030 | Deferred Work shapes; 2, 13 |
| PRD-031 | Payment cannot complete Work; J-06/J-11 |
| PRD-032 | Payment Obligation anatomy; J-11 |
| PRD-033 | External Cash declarations; J-11 |
| PRD-034 | External Cash 0%/no custody; J-11, 12.1 |
| PRD-035 | External Digital Proof states; J-11 |
| PRD-036 | Screenshot not provider verification; J-11, 12.2 |
| PRD-037 | Evidence privacy/retention; 12.2 |
| PRD-038 | Direct Digital sandbox; J-11 |
| PRD-039 | Tiwala sandbox; J-11 |
| PRD-040 | Release guards; J-11 |
| PRD-041 | No release clock at Order creation; J-11 |
| PRD-042 | Peso cost/protection meaning/small jobs; J-01, 12.1 |
| PRD-043 | Corrections/supersession; J-04/J-12, 10 |
| PRD-044 | Critical notifications; 12.4 |
| PRD-045 | Messaging/support routing; J-12, 12.4 |
| PRD-046 | Shape-specific evidence; J-06–J-10 |
| PRD-047 | Review only after supported completion; J-06/J-12 |
| PRD-048 | Dispute evidence/holds/resolution; J-12/J-13 |
| PRD-049 | No automatic External Cash refund; J-11/J-12 |
| PRD-050 | Block/report/safety escalation; J-07/J-08/J-12 |
| PRD-051 | Safer meeting/handoff guidance; J-07/J-08, 12.3 |
| PRD-052 | Admin inspection; J-13 |
| PRD-053 | Attributable high-risk operations; J-03/J-13 |
| PRD-054 | Failed events/retry; J-12/J-13, 11 |
| PRD-055 | Holds/disablement; J-12/J-13 |
| PRD-056 | Cohort/evidence classification; J-13, 5.6 |
| PRD-057 | Measurement perspective; J-13 |
| PRD-058 | Backup/recovery visibility; J-13 |
| PRD-059 | No false External Cash revenue; J-11/J-13 |

## 16. Acceptance gate for future design

The next mockup is ready for founder feedback only when:

- All 74 canonical screen IDs are traceable to `10a-ux-ui-screen-perspective-matrix.md` and remain addressable in the prototype.
- `SCN-01` through `SCN-09` are traceable to `10b-ux-ui-scenario-blueprints.md`; the selected design batch implements one connected scenario plus its recovery branch.
- The designer can demonstrate the 20 review tasks above.
- All 23 UX journeys have a visible route or documented non-visual boundary.
- Buyer, Provider/Owner, Agent, Admin, assisted user, and evaluator perspectives are represented.
- The prototype shows goals and decisions, not feature summaries.
- Every high-impact action has a primary action, consequence, and recovery route.
- Payment and Work are visibly separate.
- All four payment lanes have truthful, distinct treatments.
- A1, A3, A4, A4 conditional, and A9 are distinguishable.
- At least one mismatch/dispute/hold/retry path is usable.
- Low-literacy, low-data, safety, privacy, consent, and support concerns are visible at the point of need.
- Cross-role state visibility is coherent.
- No dead primary controls or unexplained success toasts remain.
- No prohibited stale terms or invented policy claims appear.
- The prototype remains clearly reference-only and contains no real integration.
- Browser route and link checks, console check, accessibility smoke, and stale-language scan have evidence.

## 17. Handoff note

This three-file reference workspace is the handoff to give the next design agent:

1. `10-ux-ui-reference-dossier.md` — actors, journeys, interaction rules, and acceptance gate.
2. `10a-ux-ui-screen-perspective-matrix.md` — every canonical screen’s user job, hierarchy, action, and recovery.
3. `10b-ux-ui-scenario-blueprints.md` — all nine connected routes, fixtures, cross-role consequences, and failure branches.

The current `docs/mockup-v2/` prototype should not be used as the design standard. The next agent should map its proposed screens/routes to this workspace, then create a stronger low-fidelity visual reference for founder feedback. If feedback changes only visual hierarchy or wording, update the design artifact. If feedback changes product behavior, state transitions, payment meaning, permissions, schema, or architecture, stop and update the appropriate upstream BMAD/OpenSpec artifact before changing the mockup.
