# Serbizyu 2.0 — Connected Experience Mockup Expansion Bridge

Status: DRAFT FOR FOUNDER REVIEW
Purpose: normative instruction/basis for future OpenSpec files and the rebuilt connected HTML mockup
Artifact type: UX simulation contract; not application implementation authority

## 1. Why this artifact exists

The rebuilt UX specification defines journeys and user-facing rules, but the archived mockup predates the recovered product contract. It cannot be safely expanded by copying its behavior.

This bridge translates the approved planning stack into:

- A canonical prototype scope.
- A complete screen registry.
- Connected cross-role scenarios.
- Shared mock state and event rules.
- Content, safety, accessibility, and payment-copy rules.
- OpenSpec capability boundaries.
- Acceptance criteria for future mockup regeneration.

The future OpenSpec files shall derive from this bridge. The future mockup shall derive from those OpenSpec files. Application code shall not derive directly from the archived screens.

## 2. Authority and source order

The mockup expansion must use this precedence:

1. Founder-approved planning-hardening controls.
2. `product-vision-rebuilt.md`.
3. `listing-model-taxonomy-rebuilt.md`.
4. `prd-rebuilt.md`.
5. `ux-spec-rebuilt.md`.
6. `domain-state-contracts-rebuilt.md`.
7. `canonical-schema-rebuilt.md` for entity/relationship names only.
8. `adr-catalog-rebuilt.md` and `architecture-rebuilt.md` for technical/security boundaries.
9. This bridge for prototype scope, screens, scenarios, and interaction rules.
10. `old-docs/mockup.html`, `old-docs/mockup/`, and the historical pitch for visual/layout inspiration only.

If the archived mock conflicts with any upstream source, the archived behavior loses.

## 3. Legacy mock disposition

### Preserve

Keep all of the following unchanged as historical evidence:

- `old-docs/mockup.html` — styled EN/Taglish guided hub.
- `old-docs/mockup/index.html` — plain-grid hub.
- `old-docs/mockup/screens/` — 39 historical screens.
- `old-docs/mockup/deck/pitch.html` — historical pitch.

Reusable visual ideas:

- Phone frame and presentation stage.
- Card, chip, badge, timeline, message, map-simulation, and progress patterns.
- Basic kiosk landscape presentation.
- Hub/gallery presentation.
- Green/blue/amber/warm-neutral visual character.

### Do not preserve as product behavior

- Candon pilot geography.
- Unqualified escrow language.
- Automatic live GCash/Xendit checkout.
- 8%, 12%, 15%, 75/10/15, or other historical fee/revenue rules.
- Cash commission receivables.
- Wallet balance/restriction behavior.
- Agent percentage cuts or automatic commissions.
- Quick Deal as a committed offline payment product.
- Deal-Chaining as a committed pilot feature.
- Payment equals Work completion.
- Kiosk or Agent cash custody.
- “Verified” badges unsupported by actual evidence.

### Legacy screen disposition

`regenerate` means the user need remains valid but behavior/copy/state must derive from the rebuilt sources. `retire` means the screen must not appear in the committed mockup; visual fragments may be reused only after removing stale behavior. `replace` means a different canonical screen contract now owns the need.

| Legacy screens | Disposition | New owner/reason |
|---|---|---|
| 01 Home | regenerate | DSC-001 plus current Tagudin listings/requests |
| 02 Search | regenerate | DSC-003/004; remove trust-score and Candon assumptions |
| 03 Offer | regenerate | DSC-005/006; current mechanism/shape/lane/safety copy |
| 04 Book | replace | ORD-001 plus PAY-001/002; no live-looking GCash/escrow |
| 05 Track | replace | ORD-003 and shape-specific Work screens; A2 not pilot |
| 06 Release | replace | ORD-005 plus PAY-008 sandbox; Work/payment separate |
| 07 Review | regenerate | shape completion/review without referral assumptions |
| 08 Signup | regenerate | ACC-001/002/003; Provider/Owner terminology |
| 09 Reciprocity | retire | growth/reward behavior is not committed pilot scope |
| 10 Profile Completion | regenerate | ACC-007; evidence-based status only |
| 11 Workflow Builder | replace | LST-002 through LST-007; approved shapes only |
| 12 Inbox | regenerate | TRU-001; committed channels/fallback only |
| 13 Servicer Order | replace | ORD-002/003 plus A1/A3/A4/A9 Work screens |
| 14 Curator | retire | channel automation remains deferred/foundation |
| 15 Analytics | replace | OPS-001/008 with genuine cohort classification |
| 16 Growth | retire | referrals/points/loyalty/channel expansion not pilot |
| 17 Trust | regenerate | DSC-006, TRU-002/003, OPS-005/006 |
| 18–21 Request/Bid | regenerate conditional | REQ-001 through REQ-005; quote semantics and status gate |
| 22–24 Quick Deal | retire current behavior | no committed offline payment product; quote UI fragments may inform REQ screens |
| 25–27 Deal-Chaining | retire | deferred capability; no pilot screens |
| 28–29 Kiosk | regenerate conditional | assisted access only; no wallet, deposit, payout, or custody |
| 30–32 Agent | regenerate | AGT-001 through AGT-004; consent/attribution/no automatic commission |
| 33 Wallet | retire/replace | PAY-001 obligations summary; no pilot wallet/cash receivable |
| 34 Verification | regenerate | ACC-004/005/006; gated collection and honest states |
| 35–36 Dispute | regenerate | TRU-002, OPS-005; no invented score/SLA/appeal rules |
| 37 Fee Configuration | retire current behavior | unresolved/versioned policy belongs to later Admin policy design |
| 38 Revenue | replace | OPS-008; no fabricated cash revenue or stale rates |
| 39 Verification Queue | regenerate | OPS-002; least privilege and current evidence states |

## 4. Prototype objective

The rebuilt mockup shall let the founder/team simulate a connected Serbizyu experience before implementation:

- Start from a scenario fixture.
- Switch between Buyer, Provider/Owner, Agent, and Admin perspectives.
- Perform actions that update shared prototype state.
- Observe the same Order, Work, Payment Obligation, Evidence, Dispute, Hold, Consent, Notification, and cohort state from each authorized role.
- Exercise success, failure, retry, mismatch, dispute, and recovery branches.
- Reset the scenario deterministically.
- Distinguish capstone, sandbox, genuine Tagudin, conditional, and deferred behavior.

The mockup is a simulation. It shall not call real payment, identity, messaging, map, storage, or production APIs.

## 5. Prototype architecture

Recommended future structure:

```text
docs/mockup-v2/
├── index.html                         # Hub, scenario chooser, global EN/Taglish mode
├── README.md                          # How to run, scope, authority, screen registry
├── shared/
│   ├── tokens.css                     # Semantic design tokens
│   ├── components.css                 # Shared phone/desktop/kiosk components
│   ├── shell.js                       # Navigation, role/scenario switcher, reset
│   ├── prototype-state.js             # State store and transition guards
│   ├── render.js                      # Shared rendering helpers
│   └── a11y.js                        # Focus/announcement helpers
├── data/
│   ├── fixtures.js                    # Fictional deterministic users/listings/orders
│   ├── scenarios.js                   # Scenario definitions
│   └── copy.js                        # English/Taglish content keys
├── screens/
│   ├── system/
│   ├── access/
│   ├── discovery/
│   ├── listings/
│   ├── requests/
│   ├── orders/
│   ├── work/
│   ├── payments/
│   ├── agent/
│   ├── trust/
│   └── operations/
└── tests/
    ├── navigation-smoke.js
    ├── scenario-contract.js
    ├── stale-language-scan.js
    └── accessibility-smoke.js
```

The future OpenSpec may choose one-page rendering or separate HTML files, but every canonical screen ID and transition below must remain traceable.

Promotion rule:

- During development, `docs/mockup-v2/` remains a clearly labeled draft preview.
- After founder approval, `docs/mockup.html` shall become the current mockup entry (direct page or intentional redirect to `docs/mockup-v2/index.html`).
- The root README shall be corrected to point to the approved rebuilt artifacts and current mockup, and shall no longer claim that the stale readiness report cleared implementation.
- Historical hubs and pitch remain under `old-docs/` and must show/receive an explicit historical notice rather than being deleted.

## 6. Shared prototype state

The prototype shall maintain one deterministic state object, persisted only in browser storage for the simulation.

```text
prototypeState
├── schemaVersion
├── scenarioId
├── cohortClass
├── geography
├── languageMode
├── currentActorId
├── currentRole
├── users[]
├── roleAssignments[]
├── consentGrants[]
├── identityReviews[]
├── capabilityProfiles[]
├── listings[]
├── listingVersions[]
├── capacities[]
├── requests[]
├── quotes[]
├── orders[]
├── orderTerms[]
├── workInstances[]
├── workEvents[]
├── paymentObligations[]
├── paymentEvents[]
├── evidence[]
├── disputes[]
├── holds[]
├── conversations[]
├── notifications[]
├── supportCases[]
├── safetyIncidents[]
├── auditEvents[]
└── operationFailures[]
```

Rules:

- State uses fictional data only.
- Every state-changing action appends an event/audit entry.
- A screen never changes an entity by silently rewriting history.
- Payment and Work state remain separate.
- Role switching changes the view/permissions, not the underlying scenario.
- Reset restores the selected fixture exactly.
- Unsupported actions show an explicit blocked/conditional/deferred state.
- Browser refresh preserves the current scenario unless the user chooses reset.
- State schema version mismatch triggers a safe fixture reset notice.

## 7. Canonical scenario fixtures

### SCN-01 — A1 service project with External Cash

Purpose: prove the basic low-barrier loop.

Actors:

- Buyer: fictional Tagudin resident.
- Provider: fictional drawing/creative-service provider.
- Admin: support operator.

Path:

`discover → listing → direct booking → Order terms → A1 Work → buyer cash declaration → provider receipt declaration → progress evidence → completion proposal → sign-off → review`

Must include:

- ₱50–₱100 valid example option.
- 0% platform commission.
- No Serbizyu cash custody/refund promise.
- Payment acknowledgment separate from Work completion.

### SCN-02 — A3 appointment with External Digital Proof

Purpose: prove schedule, no-show/reschedule, payment evidence, and safety.

Path:

`appointment listing → slot → booking → external proof submission → counterparty acknowledgment → appointment reminder → attended/no-show branch → completion → review`

Must include screenshot/reference disclaimer and public/safer meeting guidance.

### SCN-03 — A4 product handoff with External Cash

Purpose: prove stock/capacity, preparation, pickup, handoff, mismatch, and receipt.

Path:

`product listing → capacity reserve → Order → ready for pickup → cash declarations → handoff → quantity/condition confirmation → completion`

Must include oversell-blocked and mismatch branches.

### SCN-04 — A4 purchase-on-behalf conditional

Purpose: prove generic pabili behavior without creating a new payment product.

Path:

`product request → item list → estimate/budget → approval → actual cost/variance → receipt evidence → handoff`

Must visibly show `PILOT-CONDITIONAL` and require approval before spending.

### SCN-05 — A9 digital delivery with External Digital Proof

Purpose: prove artifact versioning, private delivery, revision, acceptance, and retention notice.

Path:

`digital service listing → Order → Work → secure artifact delivery → revision request → version 2 → acceptance → review`

A file upload never automatically completes Work.

### SCN-06 — Agent-assisted Owner flow

Purpose: prove consent, scope, attribution, owner notice, and revocation.

Path:

`Owner invitation → consent explanation → scoped grant → Agent creates listing draft → Owner notice/approval → Order notice → revoke Agent`

Must include blocked Agent money/custody action.

### SCN-07 — Evidence mismatch, dispute, and hold

Purpose: prove recovery rather than happy-path-only UX.

Path:

`cash/proof mismatch → dispute intake → evidence review → administrative hold → resolution → correction/notice`

Must show the same timeline from Buyer, Provider, and Admin views.

### SCN-08 — Direct Digital sandbox

Purpose: demonstrate provider-adapter states without live money.

Every screen must show:

- Sandbox/demo.
- Test amount/provider.
- No Tiwala protection.
- No genuine-pilot metric effect.

### SCN-09 — Tiwala Protected Digital sandbox

Purpose: demonstrate protected release guards.

Path:

`test payment → held/sandbox status → Work completion → sign-off/review eligibility → dispute/hold branch or release → reconciliation`

Must state that it is not a live legal escrow claim.

## 8. Canonical screen registry

The baseline contains 74 canonical screen contracts. A future OpenSpec change may consolidate visual files only if every screen ID remains addressable as a distinct state and traceability row.

### System and simulation shell — 4

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| SYS-001 | Mockup Hub | all | all | Choose scenario, view scope/status, enter simulation |
| SYS-002 | Scenario and Role Switcher | all | UX-003, UX-022/023 | Switch actor/role without changing shared state |
| SYS-003 | Journey Map | all | all | Show current step, alternatives, previous/next roles |
| SYS-004 | Reset, Help, and Prototype Limits | all | UX-019/020 | Reset fixture; show simulation/legal/privacy limits |

### Account, identity, and access — 7

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| ACC-001 | Welcome and capability choice | Buyer/Provider/Owner | UX-001/002 | Multiple capabilities, not exclusive permanent role |
| ACC-002 | Phone/account verification | user | UX-001/002 | Fictional verification only; retry/error state |
| ACC-003 | Consent and privacy explanation | user | UX-001 | Why data is needed, retention/deletion/help |
| ACC-004 | Identity requirements | Provider/Owner | UX-001 | Gated live collection; manual-review fallback |
| ACC-005 | Identity evidence submission | Provider/Owner | UX-001 | Fixture upload, scan/redaction guidance |
| ACC-006 | Identity review status | user/Admin | UX-001/022 | Pending, more info, approved, rejected variants |
| ACC-007 | Profile, access tier, and permissions | user | UX-001/020 | L0–L4 meaning and enabled/conditional state |

### Discovery and public trust — 6

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| DSC-001 | Tagudin Home | Buyer | UX-002 | Tagudin scope, category families, requests, help |
| DSC-002 | Category-family Browse | Buyer | UX-002 | Safety/pilot status; no unsupported categories |
| DSC-003 | Search and Filters | Buyer | UX-002 | Listing type, mechanism, shape, availability |
| DSC-004 | Search Results | Buyer | UX-002 | Active capacity only; new-provider truthfulness |
| DSC-005 | Listing Detail | Buyer | UX-002/004/005 | Terms, shape, mechanism, evidence, lane choices |
| DSC-006 | Provider/Owner Trust Summary | Buyer | UX-002/021 | Evidence-based badges; report/block; no overclaim |

### Listing creation and management — 7

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| LST-001 | My Listings | Provider/Owner/Agent | UX-004/005 | Actor attribution and lifecycle status |
| LST-002 | Choose Listing Type | Provider/Owner/Agent | UX-004/005 | Four canonical listing types |
| LST-003 | Service Listing Details | Provider/Owner/Agent | UX-004 | Scope, price/quote/budget, category |
| LST-004 | Product Listing Details | Provider/Owner/Agent | UX-005 | Stock/capacity/unit/handoff |
| LST-005 | Mechanism and Work Shape | Provider/Owner | UX-004/005 | Only approved combinations enabled |
| LST-006 | Availability and Capacity | Provider/Owner | UX-004/005/009/010 | Slot/stock/capacity conflict behavior |
| LST-007 | Preview, Review, and Lifecycle | Provider/Owner/Admin | UX-004/005/022 | Draft/review/active/paused/rejected/archive |

### Requests and quotes — 5

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| REQ-001 | Choose Service/Product Request | Buyer | UX-006/007 | Explain conditional availability |
| REQ-002 | Request Details | Buyer | UX-006/007 | Scope/item, timing, budget, location, safety |
| REQ-003 | Request Responses | Buyer/Provider | UX-006/007 | Eligible response, expiry, spam boundary |
| REQ-004 | Quote Detail/Clarification | Buyer/Provider | UX-006/007 | Scope, amount, validity, shape, lane |
| REQ-005 | Compare and Accept Quote | Buyer | UX-006/007 | No fake ranking; snapshot accepted terms |

### Shared Order and completion — 5

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| ORD-001 | Terms and Payment-Lane Confirmation | Buyer | UX-004–007 | Amount/purpose/custody/protection before action |
| ORD-002 | Order Summary | Buyer/Provider | UX-008–011 | Order, Work, obligations shown separately |
| ORD-003 | Connected Timeline | Buyer/Provider/Admin | UX-008–019 | Actor/event/evidence timeline |
| ORD-004 | Change or Cancel | Buyer/Provider/Admin | UX-017 | Pre-evidence versus post-evidence behavior |
| ORD-005 | Completion Proposal and Sign-off | Buyer/Provider | UX-016 | Evidence, effect, dispute, inactivity explanation |

### A1 Linear Project — 3

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| A1-001 | Work Plan and Progress | Provider/Buyer | UX-008 | Scope, steps, progress, actor |
| A1-002 | Evidence and Revision | Provider/Buyer | UX-008/016 | Evidence version and revision request |
| A1-003 | Buyer Review and Completion | Buyer | UX-008/016 | Sign-off/dispute; payment remains separate |

### A3 Appointment — 4

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| A3-001 | Availability and Slot | Buyer/Provider | UX-009 | Conflict-safe fixture behavior |
| A3-002 | Appointment Confirmation | Buyer/Provider | UX-009 | Time, place, privacy, safety, reminders |
| A3-003 | Reschedule, Cancel, or No-show | Buyer/Provider | UX-009/017 | Policy/evidence/notice variants |
| A3-004 | Attendance and Completion | Buyer/Provider | UX-009/016 | Attendance evidence; completion review |

### A4 Handoff and purchase-on-behalf — 5

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| A4-001 | Product Preparation | Provider/Buyer | UX-010 | Quantity/capacity/readiness |
| A4-002 | Ready for Pickup/Handoff | Provider/Buyer | UX-010 | Safe place/time/instructions |
| A4-003 | Receipt and Acceptance | Buyer/Provider | UX-010/016 | Actor-confirmed receipt/condition |
| A4-004 | Quantity/Condition Mismatch | Buyer/Provider | UX-010/018 | Evidence/dispute/support |
| A4-005 | Pabili Budget, Variance, Receipt | Buyer/Provider/Agent | UX-007/010 | Conditional; approval before spend |

### A9 Digital Delivery — 3

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| A9-001 | Digital Work Progress | Provider/Buyer | UX-011 | Scope/version/status |
| A9-002 | Secure Artifact Delivery | Provider/Buyer | UX-011 | Fixture access; retention/privacy notice |
| A9-003 | Revision or Acceptance | Buyer/Provider | UX-011/016 | Upload is not automatic completion |

### Payment Obligations and lanes — 8

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| PAY-001 | Payment Obligations Summary | Buyer/Provider/Admin | UX-012–015 | Purpose, amount, due, lane, status separately |
| PAY-002 | Choose/Confirm Payment Lane | Buyer | UX-012–015 | Actual peso cost, custody, protection meaning |
| PAY-003 | External Cash Declaration | Buyer/Provider | UX-012 | Separate paid/received declarations |
| PAY-004 | Cash Acknowledgment or Mismatch | Buyer/Provider/Admin | UX-012/018 | Silence is not proof; no automatic refund |
| PAY-005 | External Digital Proof Submission | Buyer/Provider | UX-013 | Reference/evidence/redaction/disclaimer |
| PAY-006 | External Proof Status | Buyer/Provider/Admin | UX-013 | Reported/acknowledged/provider-verified/disputed |
| PAY-007 | Direct Digital Sandbox | Buyer/Provider/Admin | UX-014 | Sandbox, provider event, no Tiwala protection |
| PAY-008 | Tiwala Sandbox Hold/Release | Buyer/Provider/Admin | UX-015/016 | Completion/review/hold/reconciliation guards |

### Agent assistance — 4

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| AGT-001 | Owner Invitation and Consent | Owner/Agent | UX-003 | Plain-language invitation and identity |
| AGT-002 | Permission Scope and Confirmation | Owner/Agent | UX-003 | Allowed/approval-required/forbidden actions |
| AGT-003 | Agent Assistance Dashboard | Agent | UX-003/020 | No earnings/custody assumption; owner-specific scope |
| AGT-004 | Owner Notice, Pause, and Revoke | Owner | UX-003/019 | Action history, revoke, report, future-action block |

### Trust, safety, messaging, and support — 4

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| TRU-001 | Messages and Critical Notices | all | UX-019 | Actor/context/deadline/fallback |
| TRU-002 | Dispute Intake and Evidence | Buyer/Provider | UX-018 | Affected entity, remedy, evidence, safety |
| TRU-003 | Safety Report and Block | Buyer/Provider/Agent | UX-021 | Immediate route, privacy, category guidance |
| TRU-004 | Support Case and Status | all | UX-019/022 | Owner, next action, escalation, audit timeline |

### Admin and operations — 9

| Screen ID | Screen | Actor | UX trace | Required behavior |
|---|---|---|---|---|
| OPS-001 | Operations Home and Cohort | Admin | UX-022/023 | Genuine/demo/sandbox/team/training separation |
| OPS-002 | User and Verification Review | Admin | UX-001/022 | Least privilege, evidence access log |
| OPS-003 | Order and Work Inspector | Admin | UX-016–018/022 | Separate state timelines |
| OPS-004 | Payment and Evidence Inspector | Admin | UX-012–015/022 | Lane/evidence/provider/reconciliation truth |
| OPS-005 | Dispute and Hold Console | Admin | UX-018/022 | Holds, reason, resolution, correction |
| OPS-006 | Safety Incident Console | Admin | UX-021/022 | Severity, response, sensitive access |
| OPS-007 | Failed Events and Retry Queue | Admin | UX-019/022 | Retry/dead-letter/support/actor |
| OPS-008 | Pilot Metrics and Classification | Admin | UX-023 | Counts plus rates; no false cash revenue |
| OPS-009 | Backup/Recovery Status Simulation | Admin | UX-022 | Last backup/restore rehearsal/owner/status |

## 8.1 Complete UX-to-screen coverage index

This index is machine-readable and expands all shorthand used in the registry.

| UX journey | Canonical screen targets |
|---|---|
| UX-001 | ACC-001 through ACC-007; OPS-002 |
| UX-002 | ACC-001/002; DSC-001 through DSC-006 |
| UX-003 | SYS-002; AGT-001 through AGT-004 |
| UX-004 | LST-001/002/003/005/006/007; ORD-001 |
| UX-005 | LST-001/002/004/005/006/007; ORD-001 |
| UX-006 | REQ-001 through REQ-005; ORD-001 |
| UX-007 | REQ-001 through REQ-005; A4-005; ORD-001 |
| UX-008 | ORD-002/003; A1-001 through A1-003 |
| UX-009 | LST-006; ORD-002/003; A3-001 through A3-004 |
| UX-010 | LST-006; ORD-002/003; A4-001 through A4-005 |
| UX-011 | ORD-002/003; A9-001 through A9-003 |
| UX-012 | PAY-001 through PAY-004; OPS-004 |
| UX-013 | PAY-001/002/005/006; OPS-004 |
| UX-014 | PAY-001/002/007; OPS-004 |
| UX-015 | PAY-001/002/008; OPS-004 |
| UX-016 | ORD-003/005; A1-002/003; A3-004; A4-003; A9-003; PAY-008; OPS-003 |
| UX-017 | ORD-004; A3-003; OPS-003 |
| UX-018 | ORD-003/004; PAY-004; TRU-002; OPS-003/005 |
| UX-019 | SYS-004; ORD-003; AGT-004; TRU-001/004; OPS-007 |
| UX-020 | SYS-004; ACC-007; AGT-003; low-data variants of committed Buyer/Provider screens |
| UX-021 | DSC-006; TRU-003; OPS-006; safety variants of A3/A4 screens |
| UX-022 | SYS-002; ACC-006; LST-007; TRU-004; OPS-001 through OPS-009 |
| UX-023 | SYS-002; OPS-001/008 |

## 8.2 Complete PRD-to-prototype responsibility index

Every PRD ID is explicit below. A `non-visual` designation means the mockup shall show the operational consequence or classification, not invent a user feature.

| PRD ID | Primary screen responsibility |
|---|---|
| PRD-001 | ACC-001/002/007 |
| PRD-002 | ACC-003/004/005 |
| PRD-003 | ACC-006; OPS-002 |
| PRD-004 | AGT-001/002; ACC-003 |
| PRD-005 | AGT-002/003/004 |
| PRD-006 | ACC-007; low-data variants; AGT-003 |
| PRD-007 | AGT-003/004; ORD-003 |
| PRD-008 | AGT-004; OPS-002 |
| PRD-009 | DSC-001 through DSC-006; ACC-007 |
| PRD-010 | LST-001/002/003/004 |
| PRD-011 | LST-003/004/005 |
| PRD-012 | LST-005/006 |
| PRD-013 | LST-007; DSC-004/005 |
| PRD-014 | DSC-004/005; LST-007 |
| PRD-015 | DSC-005/006; LST-007 |
| PRD-016 | LST-003/005/007 |
| PRD-017 | DSC-005; ORD-001 |
| PRD-018 | REQ-001/002 |
| PRD-019 | REQ-003/004/005 |
| PRD-020 | REQ-001 through REQ-005 conditional variants |
| PRD-021 | SYS-003/004 non-visual activation/deferred record |
| PRD-022 | SYS-004; safe offline/disabled variants; non-visual activation record |
| PRD-023 | AGT-002/003; LST-001/003/004/007 |
| PRD-024 | ORD-001/002; A1-001 |
| PRD-025 | A1-001/002/003; ORD-005 |
| PRD-026 | A3-001 through A3-004 |
| PRD-027 | A4-001 through A4-004 |
| PRD-028 | A4-005; REQ-002/004/005 |
| PRD-029 | A9-001 through A9-003 |
| PRD-030 | SYS-003/004 non-visual deferred Work-shape record |
| PRD-031 | ORD-002/003/005; A1/A3/A4/A9 screens |
| PRD-032 | PAY-001/002/003 |
| PRD-033 | PAY-003/004 |
| PRD-034 | PAY-001/003/004; OPS-004 |
| PRD-035 | PAY-005 |
| PRD-036 | PAY-005/006 |
| PRD-037 | PAY-006; OPS-004 |
| PRD-038 | PAY-007 |
| PRD-039 | PAY-008 |
| PRD-040 | PAY-008; ORD-005 |
| PRD-041 | PAY-008; OPS-004/005 |
| PRD-042 | PAY-007/008; SYS-004; persistent sandbox variants |
| PRD-043 | ORD-004; PAY-006 |
| PRD-044 | TRU-001; ORD-003 |
| PRD-045 | TRU-001/004; OPS-007 |
| PRD-046 | A1-002; A3-004; A4-003/004; A9-002/003 |
| PRD-047 | ORD-003/005; work-shape evidence screens |
| PRD-048 | ORD-004; TRU-002 |
| PRD-049 | PAY-004; TRU-002 |
| PRD-050 | TRU-002/003; OPS-005/006 |
| PRD-051 | DSC-002/005/006; TRU-003; OPS-006 |
| PRD-052 | OPS-003/004/005/007; TRU-004 |
| PRD-053 | OPS-002 through OPS-007; ORD-003 |
| PRD-054 | OPS-004/007; PAY-006/007/008 |
| PRD-055 | OPS-005/007; TRU-004 |
| PRD-056 | OPS-001/008 |
| PRD-057 | OPS-001/008; scenario cohort metadata |
| PRD-058 | OPS-007/009; non-visual operations evidence |
| PRD-059 | OPS-001/008/009; non-visual pilot-readiness evidence |

## 9. Required state variants

Each screen contract shall define applicable variants:

- Loading.
- Empty.
- Normal.
- Validation error.
- Permission denied.
- Offline/low-data draft.
- Retryable failure.
- Expired/stale.
- Submitted/pending.
- Confirmed/success.
- Mismatch/disputed.
- On hold.
- Corrected/superseded.
- Conditional/deferred/disabled.
- Sandbox-only.

Not every variant requires a separate HTML file, but every applicable variant requires a deterministic way to display it.

## 10. Normative mockup requirements

### MX-001 — Historical isolation

The future mockup SHALL be created outside `old-docs/mockup/` and SHALL NOT mutate historical screens into normative authority.

#### Scenario: archived link is followed

- GIVEN a reviewer opens the old mockup
- WHEN they encounter stale behavior
- THEN repository guidance SHALL identify it as historical and link to the new mockup hub.

### MX-002 — Tagudin geography

All genuine-pilot fixtures and screens SHALL use Tagudin. Candon SHALL appear only in historical-comparison documentation, never as current pilot state.

### MX-003 — Connected shared state

A state-changing action SHALL update all authorized role views of the same scenario.

#### Scenario: Buyer declares cash paid

- GIVEN SCN-01 is active
- WHEN the Buyer declares cash paid
- THEN the Buyer view SHALL show `buyer_reported`
- AND the Provider view SHALL show a receipt-confirmation action
- AND Admin SHALL see the event in the timeline
- AND Work status SHALL remain unchanged.

### MX-004 — Role and scenario switching

The hub SHALL allow switching actor/role/scenario without corrupting scenario state. Only SYS-001/SYS-002 expose the global language switch; individual screens do not duplicate it.

### MX-005 — Payment lane truthfulness

Every payment screen SHALL show:

- Lane.
- Purpose.
- Amount.
- Payer and recipient.
- Who controls funds.
- Protection meaning.
- Evidence status.
- Next action.

### MX-006 — External Cash boundary

External Cash screens SHALL state direct Buyer-to-Provider payment, 0% initial platform commission, no Serbizyu custody, and no automatic refund/recovery promise.

### MX-007 — External Digital Proof boundary

Evidence submitted by a user SHALL not display as provider-verified unless the selected fixture explicitly simulates a trusted adapter verification event.

### MX-008 — Sandbox connected money

Direct Digital and Tiwala screens SHALL display a persistent sandbox banner and SHALL not affect genuine Tagudin metrics.

### MX-009 — Tiwala release guard

The Tiwala sandbox SHALL not enable release until the fixture satisfies Work completion, sign-off/review eligibility, no active dispute, no active relevant hold, reconciliation, and no prior release.

### MX-010 — Work/payment separation

No screen SHALL mark Work completed based only on a payment event. No screen SHALL mark payment confirmed based only on Work completion.

### MX-011 — Agent consent and attribution

Every Agent action SHALL display acting Agent, affected Owner, consent scope, and approval status. The prototype SHALL include a denied cash/goods-custody action.

### MX-012 — Kiosk boundary

Kiosk variants SHALL be assisted-access views only. They SHALL NOT simulate cash deposits, wallet balances, payout operations, or Agent/kiosk custody.

### MX-013 — Low-literacy behavior

Committed Buyer/Provider journeys SHALL provide:

- One clear primary action.
- Short sentences.
- Icon plus text.
- Concrete peso amounts.
- Visible status.
- Retry/help route.
- No color-only critical meaning.

### MX-014 — Safety at point of risk

A3/A4 and other physical-interaction screens SHALL show context-relevant meeting/privacy/report guidance before the risky action.

### MX-015 — Failure and recovery

Every connected scenario SHALL include at least one non-happy-path branch and SHALL provide a safe next action rather than a success toast alone.

### MX-016 — No dead controls

Every visible primary or secondary control SHALL navigate, change deterministic mock state, open a documented variant, or display an explicit not-available explanation.

### MX-017 — Navigation

Every screen SHALL provide:

- Back/previous where meaningful.
- Next primary action.
- Hub access.
- Current scenario and role.
- Deep-linkable screen ID.

### MX-018 — Accessibility

The mockup SHALL support keyboard navigation, visible focus, labeled controls, semantic headings, adequate contrast, reduced-motion-safe behavior, and text alternatives.

### MX-019 — Responsive form factors

- Phone baseline: 375×760 presentation.
- Kiosk baseline: 960×540 landscape with mobile fallback.
- Admin baseline: desktop/tablet layout with usable narrow-width fallback.

### MX-020 — No real integrations

The mockup SHALL NOT transmit real credentials, payments, identity evidence, SMS, email, location, or files. Simulated integrations SHALL use deterministic fixtures.

### MX-021 — Event/audit visibility

Every state-changing action SHALL append a timestamped simulated event containing actor, action, target, prior/new state, and scenario correlation ID.

### MX-022 — Cohort classification

Every scenario SHALL have one of:

- `capstone_demo`
- `sandbox`
- `team_training`
- `genuine_tagudin_fixture`

Only the last may appear in pilot-metric examples, and fixtures SHALL be clearly fictional.

### MX-023 — Content prohibition scan

The new mockup SHALL fail validation if it contains unapproved:

- Current Candon pilot claims.
- Unqualified escrow claims.
- Historical fee splits/rates.
- Cash commission receivables.
- Wallet restriction/withdrawal behavior.
- Agent commission assumptions.
- Live-looking connected payments.
- Quick Deal/Deal-Chaining as committed pilot capability.

The phrase “not a live legal escrow claim” is permitted only in sandbox/legal-warning content.

### MX-024 — Traceability metadata

Every screen SHALL declare:

- Screen ID.
- UX ID(s).
- PRD ID(s).
- Scenario(s).
- Actor/access tier.
- Capability/status.
- Domain state/events displayed.
- Prototype state read/written.
- Next/alternative screens.

### MX-025 — Review evidence

Each completed mockup batch SHALL provide:

- Navigation test result.
- Screen/variant inventory.
- Stale-language scan.
- Accessibility smoke result.
- Scenario transition test result.
- Screenshots or browser-openable preview.
- Founder review disposition.

## 10.1 Requirement acceptance-scenario index

Each bridge requirement has one minimum observable scenario. Future capability specs may add more edge cases but shall not weaken these outcomes.

| Scenario ID | Requirement | GIVEN | WHEN | THEN |
|---|---|---|---|---|
| MXS-001 | MX-001 | Historical guided/plain hubs and rebuilt mock paths exist | A reviewer opens any hub | Historical pages are labeled historical and `docs/mockup.html` leads to the approved normative prototype entry |
| MXS-002 | MX-002 | A genuine-pilot fixture is loaded | Any committed screen renders geography | Tagudin is shown and Candon is absent from current pilot state |
| MXS-003 | MX-003 | Buyer and Provider view the same cash obligation | Buyer declares payment | Provider/Admin views receive the same event while Work state is unchanged |
| MXS-004 | MX-004 | A scenario has progressed | Reviewer switches role then returns | Shared state is preserved; changing scenario prompts/reset behavior is explicit |
| MXS-005 | MX-005 | Any payment action is available | User reviews before acting | Lane, purpose, amount, parties, control, protection, evidence state, and next action are visible |
| MXS-006 | MX-006 | External Cash is selected | Buyer reaches confirmation | 0% commission, direct settlement, no custody, and no automatic refund promise are visible |
| MXS-007 | MX-007 | User uploads outside-payment evidence | Submission succeeds without trusted adapter event | Status is reported/submitted, never provider-verified |
| MXS-008 | MX-008 | Direct/Tiwala fixture is loaded | Any connected-payment screen renders | Persistent sandbox label appears and genuine metrics do not increment |
| MXS-009 | MX-009 | Tiwala sandbox obligation exists | Release is attempted before all guards pass | Release is blocked with unmet guards; it enables only after all fixture guards pass |
| MXS-010 | MX-010 | Payment or Work changes independently | One transition occurs | The other aggregate remains unchanged until its own authorized event |
| MXS-011 | MX-011 | Agent acts for Owner | Agent performs allowed and forbidden actions | Allowed action records scope/actor; custody action is denied and auditable |
| MXS-012 | MX-012 | Kiosk/assisted view is active | User looks for money operations | No deposit, balance, payout, or custody control exists |
| MXS-013 | MX-013 | Low-literacy variant is active | User performs a committed task | One primary action, icon+text, concrete amount/status, and help/retry are available |
| MXS-014 | MX-014 | A3/A4 physical interaction approaches | User confirms place/time/handoff | Contextual safety guidance appears before confirmation |
| MXS-015 | MX-015 | A failure fixture is selected | Action fails or evidence mismatches | User receives safe retry/support/dispute next step, not success-only feedback |
| MXS-016 | MX-016 | A visible button/link exists | Reviewer activates it | It changes state, navigates, opens a variant, or explains unavailability |
| MXS-017 | MX-017 | Any canonical screen is open | Reviewer navigates | Role/scenario/hub and meaningful back/next routes remain available |
| MXS-018 | MX-018 | Keyboard/reduced-motion review runs | Reviewer traverses critical flow | Focus, labels, heading order, contrast, and reduced motion pass smoke criteria |
| MXS-019 | MX-019 | Phone, kiosk, and admin viewport tests run | Screens render at baselines/narrow fallback | Content/actions remain usable without hidden critical information |
| MXS-020 | MX-020 | Prototype actions simulate integrations | Action executes | No real network/credential/payment/identity transmission occurs |
| MXS-021 | MX-021 | Any state-changing action succeeds | Event log is inspected | Actor/action/target/prior/new state/correlation/timestamp are present |
| MXS-022 | MX-022 | Any fixture is selected | Metrics/classification is viewed | One cohort class is explicit and only genuine-class examples enter pilot metrics |
| MXS-023 | MX-023 | Stale-language scan runs | Prohibited claims/rates/capabilities are present | Validation fails with file/screen evidence; qualified legal warning remains allowed |
| MXS-024 | MX-024 | A screen contract is inspected | Trace metadata is parsed | Required IDs, actors, status, state, reads/writes, and navigation targets exist |
| MXS-025 | MX-025 | A mockup batch is proposed complete | Review evidence is checked | Navigation, inventory, language, accessibility, state tests, preview, and disposition exist |

## 11. Design-system bridge

The old visual system may seed the prototype, but the new mockup shall use semantic tokens:

- Brand/positive: green.
- Information/trust: blue.
- Warning/conditional: amber.
- Danger/dispute/safety: red.
- Neutral surfaces/text: warm grays.

Required token groups:

- Color roles: background, surface, text, muted, border, brand, info, warning, danger, focus.
- Typography: display, body, mono; exact scale and line height.
- Spacing: 4/8/12/16/24/32 baseline.
- Radius: control/card/device.
- Shadow: raised card/device/overlay.
- Motion: standard duration plus reduced-motion override.
- Layout: phone, kiosk, admin breakpoints.

Component inventory:

- App header.
- Scenario/role indicator.
- Bottom/tab navigation.
- Card/list item.
- Listing card.
- Request/quote card.
- Order/Work/Payment summary.
- Status badge with icon/text.
- Timeline/event row.
- Amount/fee/custody panel.
- Evidence card/upload fixture.
- Consent scope panel.
- Safety notice.
- Error/retry panel.
- Empty/loading/skeleton.
- Modal/drawer.
- Toast only for low-impact feedback; never as the sole confirmation of critical state.

Typography may continue with Plus Jakarta Sans, Inter, and JetBrains Mono unless the future design OpenSpec explicitly changes it.

## 12. Content and terminology contract

Use:

- Buyer.
- Provider/Owner.
- Agent Assistance.
- Admin/Operator.
- Listing.
- Request.
- Quote.
- Order.
- Work.
- Payment Obligation.
- External Cash.
- External Digital Proof.
- Direct Digital — Sandbox.
- Tiwala Protected Digital — Sandbox.
- Payment declared.
- Counterparty acknowledged.
- Provider verified.
- Work completion proposed.
- Completed.
- Disputed.
- On hold.
- Needs support.
- Not protected by Tiwala.

Do not use:

- Servicer as the canonical new label.
- Paid when only declared.
- Verified when only uploaded.
- Escrow without qualification/legal basis.
- Guaranteed refund/recovery.
- Wallet for the initial pilot lanes.
- Agent owns/manages money by default.

English is the baseline. Taglish copy shall remain plain and understandable to the project team and local users. A future Ilocano layer must use the same content keys and review process rather than hardcoded screen forks.

## 13. Future OpenSpec decomposition

The recommended OpenSpec capability set is:

```text
openspec/specs/
├── experience-shell/spec.md
├── identity-access/spec.md
├── discovery-listings/spec.md
├── requests-quotes/spec.md
├── order-work-core/spec.md
├── work-a1/spec.md
├── work-a3/spec.md
├── work-a4/spec.md
├── work-a9/spec.md
├── payments-external-cash/spec.md
├── payments-external-proof/spec.md
├── payments-connected-sandbox/spec.md
├── agent-assistance/spec.md
├── trust-safety-support/spec.md
└── admin-operations-measurement/spec.md
```

Recommended first change workspace:

```text
openspec/changes/rebuild-connected-mockup-foundation/
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    ├── experience-shell/spec.md
    └── order-work-core/spec.md
```

Do not generate all capability changes at once. Recommended sequence:

1. Experience shell/state/fixtures.
2. SCN-01 A1 + External Cash.
3. SCN-03 A4 Product Handoff.
4. SCN-02 A3 + External Digital Proof.
5. SCN-05 A9 Digital Delivery.
6. SCN-06 Agent Assistance.
7. SCN-07 Dispute/Hold/Admin recovery.
8. SCN-08/09 sandbox connected payments.
9. Conditional request/pabili flows.

Each change shall include proposal, design decisions, task list, screen/requirement deltas, and acceptance scenarios.

### 13.1 OpenSpec authoring contract

Every future capability spec shall:

- Define one coherent capability boundary.
- Use normative `SHALL`/`MUST` language for binding behavior.
- Use stable requirement IDs local to the capability.
- Include at least one `#### Scenario:` under every requirement.
- Express scenarios as GIVEN/WHEN/THEN/AND observable behavior.
- Cite relevant PRD, UX, screen, scenario-fixture, domain, and ADR IDs.
- State capability status: PILOT, PILOT-CONDITIONAL, SANDBOX-ONLY, FOUNDATION, DEFERRED, or EXCLUDED.
- Separate happy path, validation, authorization, failure/retry, and recovery behavior.
- Avoid implementation framework details in the requirement unless the framework choice is itself an approved constraint.

Every future change package shall include:

- `proposal.md`: problem, scope, non-goals, users, affected capabilities, risks, and approval question.
- `design.md`: decisions, alternatives, prototype state/events, navigation, security/privacy, and rollback.
- `tasks.md`: ordered, verifiable tasks with affected screen IDs and validation evidence.
- Delta specs under `specs/<capability>/spec.md`.

Delta specs shall group changes using explicit sections such as:

- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`
- `## RENAMED Requirements`

A modified requirement shall restate the complete resulting requirement and its scenarios, not only the changed sentence.

Prototype tasks shall not be marked complete until navigation, scenario-state, stale-language, and accessibility checks produce evidence.

### 13.2 Requirement template

```markdown
### Requirement: <stable capability requirement name>

ID: <CAPABILITY>-REQ-###
Status: <PILOT | PILOT-CONDITIONAL | SANDBOX-ONLY | FOUNDATION>
Trace: PRD-###; UX-###; <SCREEN-ID>; SCN-##; <domain/ADR references>

The prototype SHALL <observable behavior>.

#### Scenario: <specific observable case>

- GIVEN <starting actor, scenario, and state>
- WHEN <user or system action>
- THEN <visible result and state transition>
- AND <cross-role, audit, failure, or safety result>
```

### 13.3 Change sequencing rule

A change package shall cover one connected vertical prototype slice. It shall not mix unrelated capabilities merely because several screens share CSS or components. Shared-shell/component work may be its own foundation change with explicit dependents.

## 14. Definition of done for the rebuilt mockup

The connected mockup is ready for founder UX review when:

- All 74 canonical screen IDs exist as screens or addressable state variants.
- All 23 UX journeys are traceable.
- All 59 PRD requirements are represented by UI or explicitly classified non-visual.
- SCN-01 through SCN-09 run deterministically.
- Buyer/Provider/Agent/Admin views share consistent state.
- Payment and Work remain separate.
- Cash/Proof/Direct Sandbox/Tiwala Sandbox are visibly distinct.
- Agent consent/revocation and no-custody boundary are demonstrated.
- A1/A3/A4/A9 are demonstrated.
- At least one mismatch/dispute/hold/retry branch works.
- No dead controls or broken internal links remain.
- Stale-language scan passes.
- Accessibility and responsive smoke checks pass.
- No real secrets/data/integrations are used.
- The hub identifies the artifact as a prototype.
- `docs/mockup.html` and the root README point to the approved current mockup only after founder promotion.
- Historical guided hub, plain hub, screens, and pitch remain preserved and visibly historical.
- Founder review is recorded before the mockup becomes UX implementation evidence.

## 15. Relationship to implementation

This bridge and the future mockup answer:

- What screens and states must exist?
- How do actors move through the experience?
- What copy and boundaries must users understand?
- How do views remain connected?
- What failure/recovery branches must be visible?

They do not answer final implementation details such as:

- Exact Laravel routes/controllers.
- React component structure.
- Database DDL.
- Production API contracts.
- Provider credentials.
- Deployment configuration.

Those decisions belong in the technical baseline, schema implementation ADR, OpenSpec change design, and hardened implementation stories.
