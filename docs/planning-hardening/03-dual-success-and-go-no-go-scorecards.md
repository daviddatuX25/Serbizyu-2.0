# Serbizyu 2.0 — Success Planes and Go/No-Go Scorecards

Status: REVISED DRAFT — founder review required before this becomes authoritative
Authority: follows the approved recovery charter, contradiction register, and payment/trust-lane policy
Scope: separates capstone software acceptance, genuine Tagudin validation, startup-foundation learning, and later connected-money readiness

## 1. Three connected success planes

Serbizyu is not only a classroom demonstration, and the Tagudin pilot is not the entire startup ambition. The plan has three connected success planes:

1. **Capstone success** — prove that the team designed and built a coherent, usable, technically defensible marketplace.
2. **Tagudin validation success** — prove that real Tagudin buyers, providers, owners, agents, and assisted users can onboard and repeatedly complete valuable transactions with acceptable trust, safety, and operating burden.
3. **Startup-foundation success** — produce a reusable, evidence-backed product, operating, financial, and architecture foundation that can expand beyond the first Tagudin cohort without pretending that expansion or live connected-money operation is already approved.

The capstone is the delivery vehicle. The Tagudin pilot is the first real-world validation environment. The startup foundation is the durable result we are trying to build beyond the academic submission.

A capstone demonstration cannot prove demand. A sandbox payment cannot prove production payment readiness. Team-created transactions cannot prove marketplace liquidity. A small Tagudin pilot can validate early behavior without proving province-wide scale.

The scorecards therefore share product evidence where appropriate but never share success claims without labeling the evidence plane.

## 2. Evidence classification

Every measured event must carry one evidence class:

| Class | Meaning | Counts toward capstone? | Counts toward market validation? |
|---|---|---:|---:|
| `test_automated` | Unit, integration, contract, or end-to-end test | Yes | No |
| `demo_scripted` | Planned demonstration using seeded/sandbox data | Yes | No |
| `uat_recruited` | Usability participant completing assigned tasks | Yes | Only as qualitative discovery, not demand |
| `pilot_real` | Genuine non-team user acting for their own real need | Yes | Yes |
| `ops_training` | Team/admin operational rehearsal | Yes | No |
| `sandbox_financial` | Gateway sandbox or simulated money event | Yes | No |
| `live_connected_financial` | Legally and operationally cleared production payment | Only after separate approval | Yes, only after its launch gate closes |

Rules:

- Test, demo, team, seeded, giveaway-only, and sandbox activity never counts as market validation.
- A founder, developer, teammate, or close proxy transaction is labeled and excluded from demand/liquidity metrics.
- Incentivized research activity is reported separately from organic usage.
- Every percentage is accompanied by its numerator and denominator.
- Empty denominators are reported as “insufficient evidence,” never as 0% or 100% success.

## 3. Program gates

| Gate | Decision | Required evidence | Failure consequence |
|---|---|---|---|
| G0 — Planning hardening exit | May Phase 1–3 replacements proceed to implementation readiness review? | Stages A–D approved; no open product P0; traceability complete | Continue planning; no implementation authorization |
| G1 — Implementation readiness | May capstone implementation begin? | Fresh Stage E readiness report with all P0 closed and reproducible evidence | Implementation remains blocked except disposable spikes |
| G2 — Capstone acceptance | Does the software satisfy academic/product demonstration requirements? | Capstone scorecard passes | Repair product/code; do not claim capstone completion |
| G3 — Tagudin pilot launch | May genuine users be onboarded into a controlled cash-first pilot? | Pilot launch prerequisites pass | Remain in UAT/ops rehearsal |
| G4 — Pilot continuation | After the first four weeks, should the pilot continue, pivot, or pause? | Early market and safety scorecard | Continue, constrained pivot, or pause/remediate |
| G5 — Pilot expansion | After the full validation window, may categories/capabilities expand? | Full market scorecard plus operating capacity | Keep current scope, pivot, or stop expansion |
| G6 — Connected-money launch | May Direct Digital or Tiwala use production money? | Separate legal/provider/financial/operations gate | Keep connected lanes sandbox-only |

Passing a later gate never retroactively excuses a failed earlier gate.

## 4. Scorecard A — Capstone software acceptance

### 4.1 Must-pass product journeys

All committed journeys in the eventual pilot capability matrix must have traceable requirements, UX, stories, tests, and demonstration evidence. At minimum, the capstone must prove these vertical slices:

| Journey | Minimum demonstrated outcome | Pass rule |
|---|---|---|
| Provider onboarding and verification | Provider submits required identity data; admin reviews; listing permission follows approved tier | Complete with consent, access control, redaction, and audit evidence |
| Service Listing using A1 | Buyer discovers, creates an order, tracks work, signs off, and reviews | Critical path passes end to end |
| Appointment using A3 | Slot availability, reservation conflict prevention, attendance/completion | Critical path and double-booking test pass |
| Product/Handoff using A4 | Stock/capacity reservation, preparation, handoff, receipt confirmation | Critical path and oversell/concurrency test pass |
| Digital Delivery using A9 | Artifact delivery, revision/acceptance, completion | Critical path and unauthorized-access test pass |
| Service or Product Request | Request, response/bid/quote, acceptance, generated order | At least one approved request mechanism passes end to end |
| Agent-assisted owner flow | Owner grants scoped permission; Agent acts; owner sees/revokes; audit trail remains | Consent, attribution, revocation, and forbidden-action tests pass |
| External Cash | Separate payment and fulfillment states; dual attestation; mismatch/dispute | All cash contract states demonstrated |
| External Digital Proof | Evidence upload, privacy guidance, counterparty confirmation/dispute, non-custody disclaimer | No screenshot is mislabeled provider-verified |
| Direct Digital sandbox | Authenticated/idempotent sandbox event, amount reconciliation, payout-status separation | Happy path plus duplicate/out-of-order/failure tests pass |
| Tiwala sandbox | Held state, completion-based clock, dispute hold, concurrency-safe release/refund simulation | No release-before-completion path exists |
| Admin/support recovery | Inspect order/evidence/events; suspend risky action; retry/reconcile failed event | Operator can recover without direct database editing |

If the pilot matrix defers a journey, it is removed from the required set only through explicit founder-approved supersession—not because implementation became difficult.

### 4.2 Engineering acceptance

| Measure | PASS | CONDITIONAL/PIVOT | FAIL |
|---|---|---|---|
| Critical acceptance scenarios | 100% pass | None; critical means required | Any critical failure |
| Automated test suite | All tests green; no quarantined critical test | Non-critical flaky test has owner/deadline | Red build or hidden skipped critical test |
| Financial/event invariants | Zero unbalanced entries; duplicates/out-of-order events do not duplicate effect | Sandbox limitation documented with compensating test | Any balance drift, duplicate release, or silent loss |
| Authorization | All role/permission denial tests pass | Non-critical usability defect only | Unauthorized identity, evidence, order, payout, or admin access |
| Security review | Zero open Critical/High findings | Medium findings have owner and pre-pilot deadline | Any Critical/High unresolved |
| Privacy lifecycle | Consent, least privilege, retention/deletion/legal hold tested | Non-production limitation explicitly blocks pilot | Sensitive data collected without enforceable controls |
| Backup/restore rehearsal | Successful documented restore inside approved RTO/RPO for pilot design | Rehearsal passes with documented non-critical manual step | Restore untested or fails |
| Observability | Critical web, queue, scheduler, evidence, and financial failures produce actionable alerts | One non-critical signal remains manual with owner | Silent critical failure path |
| Accessibility | No critical WCAG 2.1 AA blocker in committed journeys; keyboard/screen-reader/contrast tests recorded | Minor AA defect has owner and deadline | Core journey unusable for target user |
| Low-bandwidth behavior | Committed L2/L0 behavior fails safely and never authorizes money offline | Performance tuning remains but correctness holds | Stale/offline client can authorize payment or corrupt state |

### 4.3 Usability acceptance

Use at least 8 recruited participants across the intended user spectrum, reported as counts rather than a statistically representative population:

- At least 2 Buyers/Customers
- At least 2 smartphone-capable Providers/Sellers
- At least 2 low-literacy or assisted users
- At least 1 prospective Agent
- At least 1 Admin/operator participant

| Measure | PASS | PIVOT | FAIL |
|---|---|---|---|
| Core task completion without facilitator takeover | At least 7 of 8 participants complete their assigned core task | 5–6 of 8; revise UX and retest | Fewer than 5 of 8 |
| Payment-lane comprehension | At least 7 of 8 correctly identify who holds money and whether Tiwala applies | 5–6 of 8 | Fewer than 5 of 8 or any systematic false guarantee |
| Fee comprehension | At least 7 of 8 correctly identify Buyer total and Provider expected amount in tested examples | 5–6 of 8 | Fewer than 5 of 8 |
| Assisted consent comprehension | Every assisted participant can identify what the Agent may do and how to revoke | One recoverable wording issue; retest | Any participant is unknowingly bound by Agent action |
| Safety/reporting discoverability | At least 7 of 8 locate block/report or safety guidance without facilitator takeover | 5–6 of 8 | Fewer than 5 of 8 |

Participant demographics, device/connectivity, assistance level, and task must be recorded so totals are interpretable.

### 4.4 Capstone verdict

**PASS** only when:

- Every committed must-pass journey passes.
- Every engineering row is PASS, except explicitly accepted non-critical conditions with owners and deadlines.
- No Critical/High security, financial-integrity, consent, or privacy blocker remains.
- Usability thresholds pass after retesting.
- The manuscript, demonstration script, repository, and current BMAD artifacts describe the same system.

A visually successful presentation does not override a failed integrity or consent gate.

## 5. Scorecard B — Initial Tagudin market validation

### 5.1 Validation window, onboarding target, and evidence floor

The initial Tagudin validation window is **8 weeks** after G3 pilot launch, with a four-week continuation review.

The startup/pilot goal is approximately **30 genuine onboarded participants**, not 30 team members, seeded accounts, or artificial demo users.

#### Target cohort by week 8

- **30 unique genuine participants onboarded**, with identity and consent records appropriate to their access/trust tier.
- Target composition: approximately **10 Provider/Owner participants and 20 Buyer/Customer participants**.
- A participant may occupy more than one marketplace role, but the report must show both unique-person count and role count.
- At least **5 participants** should experience an assisted or low-literacy-compatible path, including Agent/owner support where applicable.
- Target coverage: **4 live category families** if supply and safety permit.
- Target outcome: **30–40 genuine completed orders**, not a promise that all 30 participants transact equally.

#### Minimum evidence floor

The pilot may be evaluated with a smaller cohort, but it must be labeled `insufficient evidence` rather than declared a market success:

- At least 20 unique genuine participants
- At least 8 Provider/Owner participants
- At least 12 Buyer/Customer participants
- At least 3 live category families
- At least 20 genuine completed orders

If the target is missed but the evidence floor and safety/integrity gates pass, the correct decision may be `CONDITIONAL` or `EXTEND`, not automatic failure. If the evidence floor is missed, extend recruitment or report that market validation was inconclusive. Do not expand scope to manufacture activity.

These numbers are validation targets and evidence thresholds, not product-imposed user limits. Tagudin may later grow beyond them without changing this first-gate design.

### 5.2 Definitions

- **Onboarded participant** — a genuine person who completed the applicable account/consent/access-tier steps and can perform at least one intended marketplace action. A profile created by the team, a seeded account, or a passive contact is not onboarded for validation purposes.
- **Agent participant** — an operational support user tracked separately. Agents may be included in the community/user total only when they also have a genuine buyer/provider need; Agent recruitment alone cannot substitute for Buyer/Provider demand.
- **Activated Provider** — approved provider with at least one live listing and one genuine inquiry, request response, or order action within the window.
- **Activated Buyer** — genuine user who creates a request, contacts a provider through a trackable journey, or starts an order for their own need.
- **Completed order** — genuine order whose work state reached completed and whose applicable payment evidence/settlement state reached the required terminal confirmation.
- **Responsive request** — receives at least one qualified Provider response within 24 hours.
- **Repeat Buyer** — completes a second genuine order within the validation window.
- **Retained Provider** — remains reachable, has a live/capacity-valid listing, and performs a genuine marketplace action in weeks 5–8.
- **Severe incident** — credible threat to physical safety, material fraud, sensitive-data exposure, unauthorized fund movement, or coercive assisted action.

### 5.3 Market scorecard

| Dimension | Metric | CONTINUE / PASS | PIVOT / CONSTRAIN | PAUSE / STOP |
|---|---|---|---|---|
| Supply activation | Activated Providers/Owners | Target ≥10, with ≥2 in each live family; minimum floor 8 | 8–9 or family coverage weak; extend recruitment | <8 after planned recruitment cycle |
| Buyer activation | Activated Buyers/Customers | Target ≥20; minimum floor 12 | 12–19 | <12 after planned recruitment cycle |
| Total onboarding | Unique genuine participants | Target 30; minimum evidence floor 20 | 20–29; extend without scope expansion | <20 or mostly non-genuine/seeded activity |
| Genuine completion | Completed orders | Target 30–40; minimum evidence floor 20 | 20–29; extend without scope expansion | <20 or repeated inability to complete core loop |
| Category coverage | Live category families | Target 4 if safe and supplied; minimum floor 3 | 3 with weak liquidity or safety condition | <3 or forced category expansion to create volume |
| Liquidity | Requests with ≥1 qualified response within 24h | ≥80%, with n shown | 60–79% | <60% |
| Choice depth | Requests with ≥2 qualified responses within 48h | ≥50%, with n shown where competitive bidding is used | 25–49% | <25% where competitive bidding is claimed |
| Completion reliability | Started genuine orders completed without admin takeover | ≥85% | 70–84% | <70% |
| Payment evidence | External Cash/Proof obligations reaching mutual confirmation or explicit dispute | ≥90% | 75–89% | <75% or systematic false confirmation |
| Buyer repeat | Buyers completing a second order | Target ≥25% of eligible Buyers, with count | 10–24% | <10% after enough eligible Buyers/time |
| Provider retention | Activated Providers retained in weeks 5–8 | Target ≥70% | 50–69% | <50% |
| Assisted inclusion | Assisted/low-literacy participants completing their intended core path | Target ≥5 participants and ≥80% successful completion | 3–4 or 60–79% | No meaningful assisted evidence or <60% |
| User value | Participants answering “would use again for a real need” positively | ≥75%, with n shown | 50–74% | <50% |
| Disputes | Disputed completed/started orders | ≤10% and no severe pattern | 11–20% or one recurring cause | >20% or unresolved systemic abuse |
| Safety | Severe incidents | 0 | 0, but non-severe recurring issue requires scope restriction | Any severe incident triggers immediate pause/review |
| Assisted consent | Sampled Agent actions with valid permission, actor attribution, and required owner notice/approval | 100% | Any defect pauses affected Agent capability until fixed | Coercive/unauthorized pattern pauses assisted pilot |
| Support burden | Median human support time per completed order | ≤20 minutes | 21–45 minutes | >45 minutes or workload exceeds named capacity |
| Operations recovery | Critical incidents acknowledged within published target and closed with evidence | 100% | One missed non-severe target with corrective action | Unowned/unrecoverable critical incident |
| Cash-first affordability | External Cash and External Digital Proof platform commission | 0% and ₱0 commission receivable, with no uncollectible balance | Any accidental accrual corrected and root cause fixed | Systematically charging/accruing prohibited commission |

### 5.4 Qualitative evidence required

Metrics alone do not explain why Serbizyu succeeds or fails. The pilot review must include:

- At least 10 Buyer interviews or structured feedback records
- At least 10 Provider/Owner interviews or structured feedback records
- Every low-literacy/assisted participant’s observed friction points
- Lost/cancelled order reasons
- Provider refusal reasons
- Search terms or requests with no supply
- Fee/payment-lane comprehension problems
- Safety and trust objections
- Comparison with Facebook, Messenger, word-of-mouth, and existing local alternatives
- Which categories generated repeat behavior rather than one-time curiosity

No fabricated quotation or reconstructed “representative user” counts as evidence.

### 5.5 Startup-foundation scorecard

The pilot also evaluates whether the project is creating a foundation worth expanding. These are not claims that Serbizyu is already a scaled startup.

| Foundation area | Evidence by week 8 | Failure response |
|---|---|---|
| Repeatable onboarding | A documented Provider, Buyer, Agent-assisted, and support onboarding playbook can be executed by another trained team member | Simplify the playbook before adding users |
| Product contract | Approved payment/trust lanes, pilot matrix, terminology, safety rules, and evidence states are reflected in the product behavior | Reopen the affected planning artifact |
| Operating contract | Named owners, support windows, incident escalation, dispute handling, and cash/evidence boundaries are used in real operations | Constrain pilot capability; do not scale |
| Data foundation | Events needed for activation, liquidity, completion, repeat, disputes, support burden, and payment evidence are recorded consistently | Instrument before drawing conclusions |
| Financial foundation | Cash/External Proof create no uncollectible commission; sandbox Direct/Tiwala events reconcile; production-money claims remain blocked | Keep connected lanes sandbox-only and correct ledger/event design |
| Expansion seam | At least one deferred category/mechanism/archetype can be described with an activation gate, owner, operational change, and rollback plan | Do not expand; improve the current contract |
| Founder/company learning | Each major pilot assumption has a dated result: supported, rejected, or unresolved | Convert unresolved assumptions into the next bounded test |

Startup-foundation success means the next expansion is cheaper, safer, and more evidence-based than the first one. It does not require immediate revenue, province-wide coverage, or production Tiwala.

### 5.6 Startup economics interpretation

The initial cash-first Tagudin pilot is not required to produce platform revenue. Its economic purpose is to learn whether the marketplace can create enough value and repeat behavior to justify a later, legally cleared revenue model.

Track separately:

- Direct pilot operating cost
- Human support minutes and cost estimate per completed order
- Recruitment effort per onboarded Provider/Owner and Buyer/Customer
- Cost of evidence storage, SMS, moderation, and incident handling
- Provider/Buyer willingness to use a clearly disclosed future paid protection or service mode
- Fee comprehension and abandonment when connected-gateway costs are shown in sandbox/UAT
- Which category/archetype combinations can sustain repeat value without subsidy
- Which startup capabilities can remain low-cost through cash/external settlement and which require paid infrastructure

Do not report 0% initial platform commission as startup profitability. Report it as a deliberate adoption policy and measure the operating burden it creates. Do not invent revenue from cash transactions that Serbizyu did not collect.

## 6. Four-week continuation decision (G4)

At week 4, use the evidence available rather than pretending the full week-8 thresholds already apply.

### Continue unchanged

All are true:

- No red-line event occurred.
- At least 5 Providers/Owners and 10 Buyers/Customers are activated, with at least 15 unique genuine participants total.
- At least 8 genuine orders are completed.
- Core completion rate is at least 75%.
- At least 70% of requests receive one qualified response within 24 hours.
- Support burden is within the named team’s capacity.
- Assisted participants can complete the intended path without unauthorized Agent action.

### Continue with constrained pivot

Use when safety/integrity holds but one or more demand, liquidity, usability, or operations thresholds miss. The pivot must name:

- One hypothesis
- One category/journey/cohort change
- One metric expected to move
- A two-to-four-week test window
- A rollback condition

Do not add multiple category families or mechanisms simultaneously to hide a weak signal.

### Pause

Pause the affected capability or entire pilot when:

- A red-line condition occurs.
- The platform repeatedly creates consent, payment, or evidence states users misunderstand.
- Operations cannot respond safely.
- Genuine completion is below 50%.
- The pilot depends primarily on team-created or giveaway transactions.

## 7. Eight-week expansion decision (G5)

### Expand one bounded capability

Allowed only when:

- The minimum evaluable cohort is reached.
- No red-line condition occurred.
- Completion, consent, support, safety, and payment-evidence rows pass.
- At least one demand-side metric and one retention/repeat metric pass.
- The proposed addition has a named owner, operational playbook, and activation gate.

Expansion means one controlled change, such as:

- One additional category family
- One deferred fulfillment archetype
- One access-tier capability
- One transaction mechanism

It does not mean enabling every future capability at once.

### Hold current scope

Use when current users receive value but evidence is insufficient or operating burden is near capacity. Continue measuring without adding complexity.

### Pivot

Use when the core need is real but a category, acquisition channel, trust mechanism, or workflow is wrong. Preserve validated learning; change one causal variable at a time.

### Stop or redesign

Use when repeated cycles show weak genuine need, unsafe operation, unacceptable support burden, or failure to create provider/buyer liquidity despite executing the recruitment plan.

Stopping a pilot configuration does not invalidate the broader Bayanihan Street vision. It identifies which operating model did not work.

## 8. Red-line conditions

Any red-line condition pauses the affected capability immediately pending incident review:

- Unauthorized release, payout, refund, or duplicate financial effect
- Serbizyu or an Agent holding external cash without an approved custody contract
- Tiwala or “verified payment” guarantee shown for External Cash/Proof
- Sensitive government-ID/evidence exposure or unauthorized access
- Coercive, fabricated, or untraceable Agent consent
- Credible severe physical-safety incident linked to an unsupported category/journey
- Known fraud pattern left enabled without containment
- Material legal/provider prohibition
- Inability to restore critical pilot data or reconstruct a money/evidence event

Resumption requires documented containment, root cause, corrective action, verification, and responsible approval.

## 9. Connected-money launch gate (G6)

Direct Digital or Tiwala may move from sandbox to production only when every applicable item is evidenced:

| Domain | Required proof |
|---|---|
| Provider contract | Written confirmation that the exact marketplace, split, settlement, refund, payout, and delayed-release behavior is permitted |
| Legal/regulatory | Documented Philippine legal/regulatory review with open risks and operating constraints accepted |
| KYC/account | Production account/subaccount/KYC flow approved and rehearsed |
| Financial model | Fee bearer, subsidies, taxes, platform/protection/agent fees, refunds, chargebacks, and negative balances financially close |
| Money events | Canonical balanced events and reconciliation equations tested |
| Security | Webhook authentication, idempotency, secret rotation, least privilege, and fraud controls tested |
| Operations | Financial console, holds, release/refund controls, failure queues, reconciliation, alerts, and kill switch exercised |
| Recovery | Backup/restore and provider-to-ledger reconciliation drill passes |
| Support | Named owners, response windows, escalation, and user-facing policy are operational |
| UX/consent | Users accurately understand fees, custody, protection, release, and exclusions in UAT |

Market demand cannot waive this gate. Connected-money capability remains sandbox-only until all applicable rows pass.

## 10. Metric ownership and instrumentation contract

Before G3 pilot launch, each metric must have:

- Named human owner
- Event/data definition
- Source table/event/log
- Inclusion and exclusion rules
- Query or reproducible calculation
- Review cadence
- Alert or decision threshold
- Data-retention/privacy classification

Minimum owners:

| Area | Accountable owner |
|---|---|
| Product/demand metrics | Founder/Product Lead |
| Provider recruitment and retention | Pilot Operations Lead |
| Buyer activation and interviews | Community/Growth Lead |
| Safety, consent, and disputes | Trust & Safety/Admin Lead |
| Payment/evidence integrity | Financial Operations Lead |
| Availability, security, and recovery | Technical Lead |
| Capstone evidence and manuscript alignment | Academic Project Lead |

One person may hold multiple roles in a small team, but no responsibility may be unnamed.

## 11. What these scorecards do not decide

This artifact does not decide:

- The final pilot category list
- The final capability combinations
- Which archetype receives the next preset
- Final payment rates
- Production connected-payment approval
- The implementation schedule
- Team member assignment by name

Those decisions follow through the pilot capability matrix, repaired Phase 1 artifacts, rebuilt PRD/UX, solutioning artifacts, and final readiness audit.

## 12. Required evidence package per gate

Every gate review produces:

1. Dated scorecard with numerators and denominators
2. Links to queries, test results, interview notes, and incident records
3. Exceptions with owner and deadline
4. Decision: `GO`, `CONDITIONAL`, `PIVOT`, `PAUSE`, or `NO-GO`
5. Scope authorized by the decision
6. Capabilities explicitly still blocked
7. Founder/reviewer approval record

A status sentence without this evidence package is not a gate decision.
