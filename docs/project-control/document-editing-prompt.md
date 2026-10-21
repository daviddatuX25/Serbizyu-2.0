# External Agent Prompt — Serbizyu Control Documentation

Use the prompt below with the original `SERBIZYU-control doc.docx`, the current `control-document.md`, and any available companion documents. It is self-contained; repository access is not assumed.

---

You are editing academic project-control documentation for Serbizyu. This is documentation work only. Do not use BMAD skills/workflows, change application code, invent progress, or make product decisions.

## Deliverable

Produce a faithful Markdown transcription of the attached DOCX and a separate corrected **Control Document** containing complete Team Member Status Report and Project Status Report sections. Preserve the original DOCX. Review the existing corrected draft rather than treating it as approved truth. Return complete Markdown, not merely recommendations.

## Academic Context

Serbizyu is a Philippines-based local marketplace with initial discovery/validation scoped to Tagudin. The documented academic plan targets a controlled pilot of **10–20 total participants** and a **November** presentation/defense. Exact reporting period, dates, defense year, duration, budget, and actual expenditure are not confirmed. Do not infer them from the current date.

Academic client/reviewer and source-listed Sponsor: **Mrs. Mary Jane Hipol, Project Instructor**.

Named members: **David Datu N. Sarmiento; Jaypee G. Pagaduan; Christine M. Lopez; Prince John Vidaña**. Generic roles: Project Manager, Developer, UI/UX Designer, QA Tester. The source Project Status Report identifies David as Project Manager; formal confirmation and remaining assignments are pending. Do not map members to roles by name order.

The existing application uses PHP 8.4, Laravel 12, Inertia.js v3, React, and PostgreSQL-oriented contracts; development uses Laravel Sail. Technology facts do not prove feature completion or deployment.

## Current Product Boundaries

1. **Marketplace:** Four canonical listing types: Service Listing, Product Listing, Service Request, Product Request. Do not describe the entire current product as service-only. Wider product scope does not prove all features belong to the selected academic increment or are implemented.
2. **Formation:** Requests record demand. Tenders are Requests using Open, Sealed, or Direct Invite reverse bidding. “Bid” is citizen-facing vocabulary for a versioned Quote, not a separate business aggregate. An Order records agreement. Invitation acceptance alone is not a Bid, Order, or final agreement.
3. **Quick Deal:** Order formation, not fulfillment. Online capability is conditional on readiness/activation. Air-gapped/offline Quick Deal is **deferred** and cannot authorize digital payment, payout/release, final inventory, or irreversible consent. Earlier animated TXQR/Fountain-Code and Camera/Canvas concepts are not proof of implementation or mandatory pilot scope.
4. **Deal Chaining:** Bounded partner coordination through ordered Needs, acyclic same-chain dependencies, Need-specific invitations, Request/Quote sourcing, and isolated ordinary child Orders. Invitation acceptance can confirm a partner but does not create final agreement. Each child retains independent parties, terms, Work, Payment Obligations, disputes, cancellation/replacement, and liability. A parent cannot pool or override those authorities. Customer activation is separately gated.
5. **Work:** Code-owned shapes are A1 Linear Project, A3 Appointment, A4 Handoff, A9 Digital Delivery. Shapes are not categories or templates. Specifications describe fulfillment; Work Nodes are internal steps, not child Orders or Payment Obligations. Evidence attachment, clearance, completion, payment confirmation, and release are separate. Catalogs accelerate authoring; they are not runtime agreement authority.
6. **Payments:** Academic baseline is simulated/provider-sandbox behavior, not real-money processing. Connected/protected payment remains provider-neutral and sandbox-only until provider, legal, security, financial, reconciliation, refund, operational, and activation gates pass. Xendit is a possible integration; credentials alone do not permit live use. Simulations do not eliminate hosting, internet, equipment, presentation, or pilot costs.
7. **Administration:** Older forms plan category review with pending/approved/rejected outcomes. Retain as planned scope where appropriate; do not claim implementation. Current contracts require governed category/catalog capabilities, permissions, moderation/support, and auditability.
8. **Assistance:** Delegation preserves owner consent, scope, and actor attribution. Assistance does not confer ownership, money/goods custody, or final authority.
9. **Status:** Product vision, approved requirement, delivery plan, implementation, verification, pilot activation, and live-money authorization are different. PRD inclusion does not prove implementation; passing tests does not prove academic approval or completed human pilot evaluation.

## Documentation Authority

When available, inspect:
- `CONTEXT.md`: Work/Deal-Chain terminology.
- `_bmad-output/planning-artifacts/prd-rebuilt.md`: canonical product contract; Request/Tender and pre-messaging foundations reconciled 2026-09-25. PRD-010 covers the four types; PRD-020–021 Quick Deal/offline boundaries; PRD-022 and PRD-076 bounded chains/child isolation; PRD-074 sandbox/live-money gates; PRD-084 governed builders.
- `_bmad-output/planning-artifacts/master-delivery-plan.md`: canonical delivery authority, updated 2026-09-25.
- Referenced domain-state, schema, architecture, ADR, and UX authorities where relevant.
- `docs/project-planning-form.md` and `docs/project-scope-statement.md`: academic companions with some older wording; agreement with the DOCX does not establish current correctness.

Check explicit superseding decisions; timestamps alone do not establish authority. If files are unavailable, label these as **authority summarized in the supplied brief**. Never fabricate source passages, exact line citations, code inspection, or test results.

Delivery dependencies at a high level: authoritative contracts/migration dependencies → identity and attribution → governed categories/catalogs/builders → listings/capacity/discovery → Request/Tender/agreement and ordinary Order/Work foundations → dependent bounded coordination → operational/trust/readiness proof. Messaging follows proven pre-messaging foundations; it cannot replace missing agreement or Work contracts. Do not invent an exact schedule or claim the entire vision fits the academic window.

## Problems to Resolve

- “Finalised,” “prepared and approved,” “completed,” and “deployed” need dated evidence. If absent, attribute as reported claims pending verification rather than declaring them true or false.
- The source groups ten inclusions and eight WBS phases; preserve historical claims but do not present those counts as the exhaustive current product contract.
- Unknown reporting period means later decisions must not be retroactively called historical accomplishments.
- Acknowledge David's stated role while leaving remaining assignments unconfirmed.
- Replace ambiguous “₱0 / Unconfirmed” with unknown expenditure unless period-specific zero expenditure is supported.
- Remove unsupported “no financial risk”; no budget baseline means variance cannot be calculated.
- Preserve November and 10–20 as planning targets, not completed outcomes or exact commitments.
- Treat deferred offline QR as a scope boundary, not automatically a baseline blocker.
- Distinguish possible future risks from current unresolved issues; preserve source risk ratings as source-reported, not newly assessed.
- Correct service-only framing and oversimplified referral/parent-child descriptions without asserting new implementation.
- Plan a bounded next-period increment against the earliest unmet dependencies, not a promise to finish all advanced features.

## Simulated Team Review

Provide a brief exchange labeled **“Simulated role-based review—not actual team statements or approvals.”** Use roles, not guessed member assignments:
- Project Manager: scope, approvals, schedule, ownership, budget.
- Developer: domain boundaries, dependencies, payment/activation gates.
- UI/UX Designer: user-facing descriptions, QR expectations, pilot journeys, accessibility.
- QA Tester: acceptance evidence, failure modes, readiness, pilot evaluation.

Do not fabricate votes, minutes, sign-off, or statements by named real members.

## Outputs and Editing Rules

1. Faithful transcription: both sections, every field, names, lists, tables, amounts, original substantive claims. Flag image-only/signature content that cannot be faithfully extracted. Repair only unambiguous extraction artifacts.
2. Concise discrepancy table: field, original claim, problem, applicable authority, proposed correction, confirmation required.
3. Complete corrected Control Document in Markdown, preserving both academic report structures and all fields. Use precise “pending confirmation,” “reported; evidence not supplied,” or “planned; implementation status not established” wording.
4. If companion forms are available, propose targeted corrections to shared drift; otherwise return a labeled inspection checklist, not fabricated quotes or claimed edits. Do not alter canonical decisions to match old forms.
5. Outstanding confirmations: reporting period; dated approvals; roles; calendar/defense date and year; budget/expenditure; selected increment; implementation/verification; recruitment/activation/evaluation.
6. Verification note: all fields accounted for, names/values protected, no invented dates/costs/progress/approval, statuses separated, safety boundaries retained, reports internally consistent, source-access limits disclosed, original DOCX unchanged.

Keep language formal, readable, and proportionate to academic reports. Do not replace them with a PRD or architecture specification. Separate transcription from correction, and historical activity from current alignment. Proceed without a preliminary questionnaire; preserve genuinely unknown facts explicitly.
