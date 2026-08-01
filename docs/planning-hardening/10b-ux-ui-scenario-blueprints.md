# Serbizyu 2.0 — Connected Scenario Blueprints

Status: DRAFT FOR FOUNDER/DESIGNER REVIEW
Artifact type: design-reference companion
OpenSpec change: `openspec/changes/create-ux-ui-reference-dossier/`
Primary dossier: `docs/planning-hardening/10-ux-ui-reference-dossier.md`
Screen matrix: `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md`
Source scenarios: `_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md`

## 1. Purpose

These nine blueprints turn the canonical fixtures into connected mockup routes. They specify what a reviewer should be able to do, what each role sees, which state remains unchanged, and which failure/recovery branch must be designed.

All people, amounts, references, messages, evidence, and timestamps in the mockup are fictional deterministic fixtures. Nothing in these scenarios counts as genuine Tagudin validation.

## 2. Scenario-wide design rules

Every scenario must provide:

- `SYS-001` entry card with purpose, cohort class, actors, and scope.
- `SYS-002` role switch without losing shared fixture state.
- `SYS-003` journey map with current, previous, next, and alternate/recovery steps.
- `SYS-004` reset and prototype limits.
- Deep-linkable canonical screen/state IDs.
- A visible primary action and a visible safe alternative.
- One deterministic non-happy-path branch.
- Cross-role consequence after each state-changing action.
- Separate Order, Work, Payment Obligation, Evidence, Dispute, Consent, and Hold state where applicable.
- No real integration or production claim.

## SCN-01 — A1 low-value service with External Cash

Status: PILOT reference / fictional fixture
Purpose: demonstrate the lowest-barrier Buyer–Provider loop without Serbizyu custody.

### Fixture

- Buyer: `BUYER-01`, fictional Tagudin resident.
- Provider: `PROVIDER-01`, fictional local creative-service Provider.
- Need: small hand-drawn greeting-card layout with one revision.
- Agreed amount: `₱80`.
- Work shape: A1 Linear Project.
- Payment lane: External Cash.
- Cohort: `capstone_demo`.

### Connected route

`SYS-001 → DSC-001 → DSC-003 → DSC-004 → DSC-005 → DSC-006 → ORD-001 → ORD-002 → A1-001 → PAY-001 → PAY-002 → PAY-003 → PAY-004 → A1-002 → ORD-005 → A1-003 → ORD-003`

### What the Buyer experiences

1. Starts from the need, not from a feature catalog.
2. Sees one relevant fictional listing with scope, amount, availability, new/evidence-based Provider context, and External Cash boundary.
3. Confirms accepted terms and sees: Buyer pays Provider directly; Serbizyu holds no cash; 0% initial pilot commission; payment does not complete Work.
4. Declares cash payment and sees `Payment declared`, not `Paid`.
5. Reviews progress evidence and a completion proposal.
6. Confirms completion or reports a concern.

### What the Provider experiences

1. Sees the same accepted scope and `₱80` obligation.
2. Starts A1 Work and adds progress evidence.
3. After Buyer declaration, sees `Buyer declared payment` plus `Acknowledge receipt`; Work remains in progress.
4. Proposes completion only after required fixture evidence exists.
5. Sees Buyer sign-off or concern.

### What Admin sees

- Accepted Order snapshot.
- Separate Work and Payment timelines.
- Buyer declaration and Provider acknowledgment as separate events.
- Evidence version and completion proposal.
- No platform cash revenue/custody record.

### Required failure/recovery branch

Provider does not acknowledge the Buyer’s declaration. The Buyer sees `Awaiting Provider acknowledgment`, clarification/support choices, and no automatic proof/refund promise. Work status does not change.

### Feedback task

Ask a reviewer: “Did Serbizyu receive or hold the ₱80?” The intended answer must be clearly “No; the Buyer paid the Provider directly and Serbizyu only records declarations.”

## SCN-02 — A3 appointment with External Digital Proof

Status: PILOT reference / fictional fixture
Purpose: demonstrate schedule, privacy/safety, outside-payment evidence, acknowledgment, and no-show recovery.

### Fixture

- Buyer: `BUYER-02`.
- Provider: `PROVIDER-02`.
- Appointment: fictional basic tailoring measurement/consultation at a public meeting point.
- Amount: `₱150`.
- Work shape: A3 Appointment.
- Payment lane: External Digital Proof.
- Cohort: `capstone_demo`.

### Connected route

`SYS-001 → DSC-005 → A3-001 → A3-002 → ORD-001 → PAY-001 → PAY-002 → PAY-005 → PAY-006 → A3-003 → A3-004 → ORD-005 → ORD-003`

### What the Buyer experiences

- Chooses a live fixture slot and sees duration, public location, privacy/contact boundary, cancellation/reschedule, and safer-meeting guidance before confirmation.
- Submits fictional outside-payment evidence with provider/reference, amount/time, and redaction guidance.
- Sees `Evidence submitted`, not provider-verified.
- Receives appointment reminder/context and can reschedule, cancel, report no-show, or report a safety concern.
- Confirms attendance/completion separately from payment evidence.

### What the Provider experiences

- Confirms slot without silent replacement.
- Sees the submitted evidence and can acknowledge, dispute, or wait for a trusted adapter event if a sandbox fixture supplies one.
- Records attendance/no-show and proposes completion separately.

### What Admin sees

- Appointment state, outside-payment evidence state, and Work completion remain separate.
- Evidence access is attributable and privacy-scoped.
- No trusted-adapter verification appears unless the fixture explicitly emits it.

### Required failure/recovery branch

The selected slot becomes unavailable before confirmation. The old slot is marked stale; alternatives are shown; no silent substitution occurs. A second branch may demonstrate Buyer-reported no-show with support/dispute entry.

### Feedback task

Ask: “Does the screenshot prove cleared payment?” The intended answer is “No; it is submitted evidence until acknowledged or provider-verified by a trusted source.”

## SCN-03 — A4 product handoff with External Cash

Status: PILOT reference / fictional fixture
Purpose: demonstrate stock/capacity, preparation, safe handoff, receipt, and condition mismatch.

### Fixture

- Buyer: `BUYER-03`.
- Provider/Owner: `OWNER-03`.
- Product: two fictional vegetable seedling trays.
- Amount: `₱100`.
- Work shape: A4 Handoff.
- Payment lane: External Cash.
- Cohort: `capstone_demo`.

### Connected route

`SYS-001 → DSC-002 → DSC-004 → DSC-005 → ORD-001 → ORD-002 → A4-001 → A4-002 → PAY-003 → PAY-004 → A4-003 → [complete path] or A4-004 → TRU-002 → ORD-003`

### What the Buyer experiences

- Sees actual quantity/capacity, pickup instructions, safe location/time, and what condition to expect.
- Declares cash independently from receipt.
- At handoff chooses `Acknowledge receipt` or `Report a mismatch` after inspecting quantity/condition.

### What the Provider experiences

- Reserves/prepares only available quantity.
- Marks ready and confirms the handoff arrangement.
- Acknowledges cash separately.
- Sees Buyer receipt or mismatch without losing the original Order terms.

### What Admin sees

- Capacity/preparation, handoff, cash declarations, receipt, and mismatch as separate events.
- A mismatch may open a dispute/hold but does not erase the original handoff evidence.

### Required failure/recovery branch

Only one tray is available. Activation/confirmation blocks the quantity-two promise, shows the conflict, and offers explicit quantity correction, substitution approval, or cancellation. No oversell is displayed as success.

### Feedback task

Ask: “Can the Buyer report a damaged or missing item without also claiming payment was wrong?” The UI must make those separate concerns possible.

## SCN-04 — A4 purchase-on-behalf conditional

Status: PILOT-CONDITIONAL reference / fictional fixture
Purpose: demonstrate item request, estimate, approval before spend, actual cost variance, receipt evidence, and handoff without creating a new payment product.

### Fixture

- Buyer: `BUYER-04`.
- Provider/helper: `PROVIDER-04`.
- Need: fictional school-supply item list.
- Approved estimate: `₱300` maximum fixture budget.
- Work shape: A4 purchase-on-behalf extension.
- Payment lane: External Cash in the reference fixture.
- Cohort: `capstone_demo` with persistent `PILOT-CONDITIONAL` label.

### Connected route

`SYS-001 → REQ-001 → REQ-002 → REQ-003 → REQ-004 → REQ-005 → ORD-001 → ORD-002 → A4-005 → A4-001 → A4-002 → A4-003 → ORD-003`

### What the Buyer experiences

- Specifies items, acceptable alternatives, timing, and budget meaning.
- Reviews a response with estimated amount and scope.
- Approves before any fixture spending action.
- If actual cost changes, receives an explicit variance request and chooses approve, decline/substitute, or cancel/support.
- Reviews receipt evidence and handoff.

### What the Provider/helper experiences

- Cannot mark spending as authorized before Buyer approval.
- Sees approved limit, allowed alternatives, and acting identity.
- Submits actual cost and fictional receipt evidence.
- Cannot silently exceed scope or amount.

### What Admin sees

- Estimate, approval, actual cost, variance approval, receipt, and handoff as separate attributable events.

### Required failure/recovery branch

Actual cost is `₱330`, above the approved `₱300`. The flow stops for Buyer approval; no automatic spending, payment confirmation, or item substitution occurs.

### Feedback task

Ask: “At what exact point is the helper allowed to proceed with the higher amount?” The answer must be visible as explicit Buyer approval.

## SCN-05 — A9 digital delivery with External Digital Proof

Status: PILOT reference / fictional fixture
Purpose: demonstrate digital scope, versioned delivery, revision, acceptance, privacy/retention, and outside-payment evidence.

### Fixture

- Buyer: `BUYER-05`.
- Provider: `PROVIDER-05`.
- Deliverable: fictional simple digital invitation layout.
- Amount: `₱250`.
- Work shape: A9 Digital Delivery.
- Payment lane: External Digital Proof.
- Cohort: `capstone_demo`.

### Connected route

`SYS-001 → DSC-005 → ORD-001 → ORD-002 → A9-001 → PAY-005 → PAY-006 → A9-002 → A9-003 → ORD-005 → ORD-003`

### What the Buyer experiences

- Sees format, scope, revision expectation, acceptance criteria, and retention/privacy note.
- Submits fictional outside-payment evidence without receiving a false verification state.
- Reviews version 1 and requests a specific revision.
- Reviews version 2 and accepts or reports a concern.

### What the Provider experiences

- Tracks version target and accepted scope.
- Delivers version 1, receives exact revision request, and delivers version 2 without overwriting version 1.
- Proposes completion only after delivery evidence exists.

### What Admin sees

- Payment evidence, artifact versions, revision request, access, acceptance, and completion as separate histories.

### Required failure/recovery branch

Version 1 fixture fails validation or access. The screen shows the failure, preserves version history, offers safe retry/resubmission, and does not mark Work delivered or complete.

### Feedback task

Ask: “Did uploading version 2 automatically complete the job?” The answer must be “No; the Buyer still reviews and accepts or raises a concern.”

## SCN-06 — Agent-assisted Owner flow

Status: PILOT-CONDITIONAL access reference / fictional fixture
Purpose: demonstrate informed delegation, limited permission, attribution, Owner notice, and revocation.

### Fixture

- Owner: `OWNER-06`, fictional low-data user.
- Agent: `AGENT-06`, fictional approved assistant.
- Intended task: draft a Product Listing and submit it for Owner review.
- Permission: listing draft only; publication requires Owner approval; money/goods custody forbidden.
- Cohort: `team_training`.

### Connected route

`SYS-001 → AGT-001 → AGT-002 → AGT-003 → LST-002 → LST-004 → LST-005 → LST-006 → LST-007 → AGT-004 → ORD-003`

### What the Owner experiences

- Sees who requests access, why, which listing, duration, allowed/approval-required/forbidden actions, and how to decline.
- Receives plain-language notice after the Agent saves a draft.
- Approves publication separately or revokes/pause assistance.

### What the Agent experiences

- Persistent `Acting for OWNER-06` context.
- Can draft within scope and sees owner-approval requirement.
- Cannot change ownership, payer/recipient, or take cash/goods custody.

### What Admin sees

- Consent grant, Agent action, affected Owner/resource, notice, approval, and revocation history.

### Required failure/recovery branch

Agent attempts a forbidden cash-custody action. The control is blocked with an explicit reason; Owner approval cannot override a globally forbidden capability; support/report is available.

### Feedback task

Ask: “Who owns the listing after the Agent creates the draft?” The answer must remain the Owner, with the Agent shown only as the acting helper.

## SCN-07 — Evidence mismatch, dispute, and hold

Status: PILOT recovery reference / fictional fixture
Purpose: demonstrate disagreement and recovery rather than a success-only marketplace.

### Fixture

- Reuses a fictional Order from `SCN-01` or `SCN-03`.
- Buyer claim: payment/item evidence does not match the agreed state.
- Provider response: disputes the claim and supplies a fixture note/evidence.
- Admin: `ADMIN-07`.
- Cohort: `capstone_demo`.

### Connected route

`SYS-001 → PAY-004 or PAY-006 → ORD-003 → TRU-002 → TRU-004 → OPS-003 → OPS-004 → OPS-005 → ORD-003`

### What the Buyer experiences

- Sees the exact affected Order, Work, Payment Obligation, and evidence.
- Describes what happened, safety concern, evidence, and requested remedy.
- Receives support-case status and hold explanation where authorized.
- Is not promised automatic refund/recovery or a fixed resolution time.

### What the Provider experiences

- Sees the same dispute scope, evidence request, and response route.
- Original terms/events remain visible.
- Unrelated work/payment objects are not silently blocked.

### What Admin sees

- Separate Order, Work, payment, evidence, dispute, and hold timelines.
- Hold reason/scope/creator/approver and conditions.
- Resolution creates a new correction/resolution event rather than rewriting history.

### Required failure/recovery branch

A required notification or evidence-processing event fails. `OPS-007` shows attempt, error, idempotency/correlation, retry, and result; user-facing support state remains visible.

### Feedback task

Ask: “What exactly is on hold, and what remains usable?” The screen must state scope rather than showing a global unexplained lock.

## SCN-08 — Direct Digital sandbox

Status: SANDBOX-ONLY
Purpose: demonstrate connected-provider event and reconciliation states without live payment or Tiwala protection.

### Fixture

- Buyer: `BUYER-08`.
- Provider: `PROVIDER-08`.
- Test obligation: `TEST ₱80`.
- Provider: fictional `TEST_PROVIDER` only.
- Cohort: `sandbox`.

### Connected route

`SYS-001 → ORD-001 → PAY-001 → PAY-002 → PAY-007 → OPS-004 → OPS-007 → ORD-003`

### User-visible requirements

- Persistent `SANDBOX ONLY` label on every related state.
- Test amount/provider and simulated event status.
- Explicit `No Tiwala protection` and `No genuine-pilot metric effect`.
- No live-looking checkout, credential entry, payout, or success claim.

### Cross-role consequence

A simulated provider event updates the sandbox obligation and Admin inspector only. It does not complete Work or create genuine revenue/validation evidence.

### Required failure/recovery branch

The simulated provider event is duplicate or out of order. It is ignored/reconciled or queued without double effect; Admin sees the failed/reconciliation state.

### Feedback task

Ask: “Could a reviewer mistake this for a live transaction?” If yes, the design fails.

## SCN-09 — Tiwala Protected Digital sandbox

Status: SANDBOX-ONLY
Purpose: demonstrate protected-release guards without a production transaction or unqualified legal claim.

### Fixture

- Buyer: `BUYER-09`.
- Provider: `PROVIDER-09`.
- Test obligation: `TEST ₱250`.
- Work shape: A1 or A9 sandbox fixture with completed/non-completed variants.
- Cohort: `sandbox`.

### Connected route

`SYS-001 → ORD-001 → ORD-002 → PAY-001 → PAY-002 → PAY-008 → ORD-005 → OPS-003 → OPS-004 → OPS-005 → PAY-008 → ORD-003`

### User-visible requirements

- Persistent `SANDBOX ONLY — protected-release behavior is simulated` label.
- Guard checklist: correct obligation state; authorized Work completion; valid sign-off/review eligibility; no dispute; no relevant fraud/safety/legal/admin hold; reconciled amount; snapshotted policy; no prior release.
- Clear statement that this is not a live legal escrow claim.
- Work, sign-off, hold, reconciliation, eligibility, and release remain separate statuses.

### Cross-role consequence

- Provider completion proposal notifies Buyer but does not make release eligible.
- Buyer sign-off completes Work only if valid; release eligibility is evaluated separately.
- Active dispute/hold blocks simulated release and is visible to authorized roles.
- Successful simulated release emits one sandbox event and never affects genuine metrics.

### Required failure/recovery branch

Attempt release while Work is incomplete or a hold is active. The action is blocked and lists unmet guards. A repeated attempt after success is idempotent and does not create a second release.

### Feedback task

Ask: “What exact conditions are still missing before simulated release?” The design must answer with the guard list, not a generic disabled button.

## 3. Scenario acceptance matrix

| Scenario | Primary actors | Work shape | Lane | Required recovery proof |
|---|---|---|---|---|
| SCN-01 | Buyer, Provider, Admin | A1 | External Cash | Unacknowledged declaration |
| SCN-02 | Buyer, Provider, Admin | A3 | External Digital Proof | Stale slot/no-show or evidence uncertainty |
| SCN-03 | Buyer, Provider, Admin | A4 | External Cash | Capacity or condition mismatch |
| SCN-04 | Buyer, Provider/Agent, Admin | A4 conditional | External Cash fixture | Cost variance approval |
| SCN-05 | Buyer, Provider, Admin | A9 | External Digital Proof | Artifact validation/revision |
| SCN-06 | Owner, Agent, Admin | Assisted access | No custody action | Forbidden Agent action/revocation |
| SCN-07 | Buyer, Provider, Admin | Cross-shape recovery | Lane-specific | Dispute, hold, failed event/retry |
| SCN-08 | Buyer, Provider, Admin | Sandbox context | Direct Digital sandbox | Duplicate/out-of-order provider event |
| SCN-09 | Buyer, Provider, Admin | A1/A9 sandbox | Tiwala sandbox | Guarded/idempotent release failure |

## 4. Handoff rule

A visual prototype may start with one scenario slice, but the routing, shared context, and component decisions must not make the other eight impossible. The first design review should use `SCN-01` plus the relevant `SCN-07` recovery branch. Later scenarios expand only after the founder accepts the first user flow and visual direction.
