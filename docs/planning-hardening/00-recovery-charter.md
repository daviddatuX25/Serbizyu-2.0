# Serbizyu 2.0 — Planning Hardening Recovery Charter

Status: APPROVED — founder direction accepted; downstream artifact repair may now begin one artifact at a time
Branch: `planning-hardening`

## 1. Purpose

Repair the current BMAD Phase 1–3 planning baseline into an evidence-backed, internally consistent, implementation-ready plan for two connected outcomes:

1. A credible BSIT capstone that can be demonstrated and evaluated safely within the academic timeline.
2. A practical startup foundation that can progress into a controlled Tagudin pilot after legal, payment, privacy, and operational gates are satisfied.

Existing work is input, not waste. Strong concepts and valid decisions will be preserved. Stale or contradictory artifacts will be superseded explicitly rather than silently patched.

## 2. Founder Direction Captured

The recovery must preserve these product intentions:

- Launch geography is Tagudin, Ilocos Sur only.
- Entry should remain accessible to informal, cash-first, and low-digital-literacy participants.
- External cash must not be burdened by a fee that is difficult to collect or that discourages first use.
- Serbizyu may earn a small amount where collection is technically and operationally real.
- Tiwala/protected payment may carry a transparent platform protection fee because payment operations, dispute handling, evidence review, support staff, and future legal escalation are not free.
- The academic system must be honest about sandbox demonstrations versus real-money readiness.
- The system should be deliberately structured so it can become a real startup, without requiring the student team to build every future feature now.
- Planning will be reviewed section by section. No downstream artifact is considered locked until the founder reviews the controlling upstream decision.

## 3. Recovery Verdict and Freeze

The current readiness verdict is withdrawn for planning purposes.

Until this recovery closes its P0 gates:

### Allowed

- Disposable Laravel/React scaffolding
- CI, PEST, Pint, and Playwright experiments
- Local Docker/Compose experiments
- Brand-token prototypes after the brand decision is approved
- TextBee field tests
- Xendit sandbox research/prototypes that do not define production accounting
- Quick Deal technical spike on representative devices

### Frozen

- Production migration baseline
- Canonical Eloquent domain models
- Live Xendit integration
- Tiwala release or payout code
- Direct Payment accounting
- Cash commission receivables
- Collection of real government IDs or selfies
- Claims of production, legal, regulatory, or real-money readiness

## 4. Source-of-Truth Hierarchy

After each artifact is reviewed and approved, authority flows in this order:

1. **Founder-approved decision register** — business choices and explicit supersessions
2. **Product brief and locked taxonomy** — product promise, terminology, listing/mechanism/archetype model
3. **PRD** — requirements, scope, business rules, payment contracts, success criteria
4. **UX specification** — journeys and screens traced to committed PRD requirements
5. **Canonical domain/schema contract** — entities, states, invariants, constraints, retention, migration order
6. **ADR catalog** — architectural reasons implementing the PRD and schema contracts
7. **Architecture views** — runtime, deployment, security, data, integration, and operations views
8. **Epics and stories** — thin delivery slices traced to requirements, ADRs, tests, and gates
9. **Implementation readiness report** — evidence-only verdict; always last

Rules:

- A downstream artifact cannot override an upstream artifact silently.
- Later decisions must name every superseded rule and every affected artifact.
- Copied constants are avoided where a link/reference can be used.
- PRFAQ, archived mockups, old readiness reports, and old architecture documents remain historical evidence but are not normative after supersession.
- Every readiness claim must link to a committed, present artifact or reproducible command/test result.

## 5. BMAD Recovery Sequence

### Stage A — Control and Product Decisions

1. Approve this recovery charter.
2. Create the contradiction and supersession register.
3. Lock the pilot payment/revenue policy:
   - external cash
   - direct digital payment
   - Tiwala protected payment
   - processor, platform, and agent fees
   - collection, refund, dispute, and fallback behavior
4. Lock dual success criteria:
   - academic/capstone software acceptance
   - startup/Tagudin market-validation scorecard
5. Lock the pilot capability matrix:
   - listing type × transaction mechanism × fulfillment archetype × payment mode × access tier
6. Resolve the product-brief mapping: rebuild or explicitly designate the current PRFAQ as the product-brief input before Phase 1 repair.
7. Lock the single brand-token source before UX rebuild.
8. Add low-barrier trust/safety decisions:
   - assisted-order attribution
   - physical meeting/no-entry guidance
   - cash custody/change/counterfeit boundaries
   - first-transaction trust defaults
   - fee-change/quote grandfathering
   - low-value abuse and OTP-phishing response
9. Lock the no-hard-minimum affordability policy:
   - itemized fee display
   - cash recommendation
   - fee-bearer rule
   - subsidy budget and kill switch, if any
10. Resolve whether kiosk custody and purchase-on-behalf errands are in the pilot or explicitly deferred.

**Exit gate A:** no unresolved product-level P0 decision; one explicit pilot scope; every low-barrier trust/payment promise has an owner and evidence path.

### Stage B — Phase 1 Repair

11. Supersede the stale PRFAQ/product vision while preserving the founder story.
12. Repair and relock the listing/mechanism/archetype taxonomy.
13. Update the Phase 1 handoff so every referenced research artifact exists and Tagudin is consistent.

**Exit gate B:** one product promise, one vocabulary, one taxonomy, one research inventory.

### Stage C — Phase 2 Rebuild

14. Rebuild the PRD from the approved decisions instead of patching contradictory sections.
15. Create the requirement-status matrix: committed, deferred, out-of-scope, or uncovered.
16. Rebuild UX around complete pilot journeys and current brand tokens.
17. Create journey → requirement → screen → acceptance evidence.

**Exit gate C:** every committed requirement has an owner and a user journey or explicit non-UI contract.

### Stage D — Phase 3 Rebuild

18. Define canonical Order, Work, Payment, Dispute, Consent, and Payout state machines.
19. Create the canonical schema contract and generated SVG ERD.
20. Rebuild the ADR catalog against the approved PRD/schema; review one ADR at a time.
21. Rebuild architecture views, including scheduler/workers, security/privacy, monitoring, backups, restore, and release operations.
22. Rebuild epics from scratch as thin vertical slices; do not patch the current epic file.
23. Add traceability: requirement → decision → schema/module → story → acceptance test → verification gate.

**Exit gate D:** all P0 findings closed; no committed requirement without an implementable story/test path.

### Stage E — Readiness

24. Run mechanical cross-artifact checks.
25. Run independent product, architecture/financial, security/privacy, and delivery/operations audits.
26. Verify all findings personally; subagents are advisory, not authoritative.
27. Issue a new readiness verdict backed only by present evidence.

**Exit gate E:** APPROVED only if every P0 is closed and every required proof is reproducible.

## 6. Review and Commit Protocol

- One controlling artifact is reviewed at a time.
- The founder approves or revises it before downstream work begins.
- Each approved artifact receives its own focused commit.
- An upstream revision reopens all affected downstream approvals.
- Subagents may research, draft, or review separate concerns, but the lead architect verifies and integrates their work.
- No batch “all documents fixed” commit is allowed.

## 7. Preliminary Product Policy Pending Dedicated Decision Review

The following direction is recorded but not yet numerically locked:

- External cash should be available for any practical order amount and should be free of platform commission during the academic and initial adoption period; Serbizyu records the trust event but does not create an uncollectible receivable.
- Digital payment must not have an artificial product minimum that excludes legitimate ₱50–₱100 side-hustles. The checkout must show the gateway cost and recommend cash when the fee burden is high, while preserving informed digital choice where technically and contractually allowed.
- Direct digital payment may carry only a small, transparently collectible platform service fee in addition to processor costs.
- Tiwala protected payment may carry a transparent percentage/minimum protection fee that funds payment operations and dispute handling; the minimum must remain small enough for micro-errands while not pretending to fund unlimited human legal work.
- Agent compensation is separate from the platform protection fee and must have a real collection path.
- Very small transactions should recommend cash, not reject the listing or order. Digital and Tiwala eligibility thresholds are fee-policy decisions, not product-discovery barriers.
- Exact rates, minimum protection fee, and subsidy/fee-bearer rules will be locked only after verified Xendit capability/fee research and worked transaction examples.

## 8. Immediate Next Artifact

After this charter is approved, the next artifact is the contradiction and supersession register. It will enumerate each conflicting rule, the selected winner, affected artifacts, and required repair order.

This charter does not approve any payment rate, table count, state machine, technology version, or implementation schedule. It approves only the recovery process and founder direction.