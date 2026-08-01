# UX/UI Reference Readiness Review

Date: 2026-08-01
Review target: Serbizyu 2.0 UX/UI reference workspace
Branch: `planning-hardening`
Status: READY FOR LOW-FIDELITY MOCKUP AUTHORING / NOT FOUNDER-APPROVED / NOT IMPLEMENTATION AUTHORITY

## 1. Reviewed artifacts

- `docs/planning-hardening/10-ux-ui-reference-dossier.md`
- `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md`
- `docs/planning-hardening/10b-ux-ui-scenario-blueprints.md`
- `openspec/changes/create-ux-ui-reference-dossier/`

Compared against:

- `_bmad-output/planning-artifacts/prd-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md`

Historical mockups were not used as product authority.

## 2. Initial review verdict

The original single dossier was substantially grounded and correctly rejected the disposable `docs/mockup-v2/` prototype as a design standard. It was not yet fully ready as a standalone handoff because:

1. It directly referenced only 27 of the bridge's 74 canonical screen IDs. Range references proved broad coverage but did not define every screen from the user's perspective.
2. It did not explicitly blueprint `SCN-01` through `SCN-09`, leaving routing, shared fixtures, and failure branches open to designer inference.
3. One cross-role line described completion-proposal impact on payment too ambiguously.
4. It lacked a compact unresolved-policy register, concrete layout archetypes, and user-facing microcopy patterns.

These were design-readiness gaps, not evidence that the canonical product contracts were false.

### 2.1 Independent follow-up audit

A separate source-by-source audit completed after the first hardening commit. It found no P0 fabrication or stale-product contradiction, but identified additional valid gaps that were then corrected:

- External Cash was incorrectly simplified to Buyer declaration plus Provider acknowledgment; it now models independent `buyer_reported` and `provider_reported` attestations with `mutually_acknowledged` only when they match.
- Identity/manual-review screens were trace-claimed but lacked a body playbook; `J-02A` now covers setup, privacy, fictional evidence, manual review, user decisions, and `OPS-002`.
- `OPS-006` safety investigation and `OPS-009` backup/recovery simulation were trace-claimed but absent from the Admin playbook; both now have explicit sections.
- `J-12` overclaimed OPS coverage; its trace is now limited to completion/change/dispute/support, with Admin screen families kept in `J-13`.
- Change/cancellation now distinguishes before-evidence replacement/cancellation from after-evidence correction/supersession/refund/dispute events.
- Conditional Quick Deal is now explicitly an Order-formation surface—not fulfillment—with counterparty confirmation, expiry, retry, safety, and offline irreversible-action boundaries.
- The no-release-clock-at-Order-creation rule, External Digital Proof 0% pilot commission, complete evidence lifecycle, suspended/expired consent, withdrawn/conditional-appeal dispute states, and an L1 kiosk review task are now explicit.

## 3. Corrections made

### 3.1 Screen perspective completeness

Created `10a-ux-ui-screen-perspective-matrix.md` with one canonical primary row for every screen ID. Each row defines:

- Actor.
- User job.
- Required visible hierarchy.
- Primary action.
- Failure/recovery route.

Visual grouping remains allowed, but no screen/state may disappear or become impossible to review.

### 3.2 Connected scenario completeness

Created `10b-ux-ui-scenario-blueprints.md` for `SCN-01` through `SCN-09`. Every scenario includes:

- Persistent prototype/capability status.
- Clearly fictional deterministic fixture.
- Connected canonical-screen route.
- Buyer/Provider/Owner/Agent/Admin perspective as applicable.
- Cross-role consequence.
- Non-happy-path branch.
- Founder/reviewer feedback task.

### 3.3 State correction

Corrected completion-proposal wording so that:

- Provider proposal creates a Work review state.
- Buyer sees sign-off/concern choices.
- Payment Obligation state remains unchanged.
- Protected-release eligibility is not evaluated from a proposal alone.

### 3.4 UI-design usefulness

Added:

- Nine layout archetypes for discovery, forms, shared transactions, physical handoff, digital delivery, evidence/support, Agent assistance, Admin investigation, and scenario navigation.
- User-facing microcopy patterns for payment declarations, evidence, Work, completion, mismatch, holds, Agent attribution, offline drafts, retry uncertainty, and sandbox behavior.
- An unresolved-policy register that prevents a mockup from inventing operational or legal rules.

### 3.5 OpenSpec alignment

Expanded the existing OpenSpec change to govern the three-file reference workspace and added requirements for:

- 74-screen completeness.
- Nine-scenario completeness.
- No inferred policy.

## 4. Grounding disposition

| Reference claim | Source disposition | Review result |
|---|---|---|
| Tagudin is the initial pilot geography | Canonical PRD/UX | Confirmed |
| Low-value practical work remains valid | Canonical PRD/UX | Confirmed |
| Listing, Request, Quote, Order, and Work are distinct | Canonical domain/UX | Confirmed |
| A1, A3, A4, and A9 are active Work shapes | Canonical PRD/domain/bridge | Confirmed |
| Purchase-on-behalf is an A4 conditional extension | Canonical PRD/UX | Confirmed; marked conditional |
| Payment and Work completion are independent | Canonical PRD/domain | Confirmed throughout |
| External Cash is direct, 0% initial pilot commission, no Serbizyu custody, and mutually acknowledged only from matching Buyer/Provider reports | Canonical PRD/payment/UX contract | Confirmed and corrected to two-sided attestations |
| External evidence is not automatic provider verification | Canonical PRD/payment contract | Confirmed |
| Direct Digital is sandbox-only | Canonical PRD/bridge | Confirmed; persistent sandbox treatment required |
| Tiwala Protected Digital is sandbox-only | Canonical PRD/bridge | Confirmed; no live/legal claim |
| Agent access is explicit, attributable, revocable, and non-custodial by default | Canonical PRD/UX/domain | Confirmed |
| L0–L4 access contexts and fallback behavior matter | Canonical PRD/UX | Confirmed |
| Evidence, disputes, holds, corrections, and audit history remain attributable | Canonical domain/UX | Confirmed |
| Capstone demo, sandbox, training, and genuine-fixture classes stay separated | Canonical PRD/UX/bridge | Confirmed |

## 5. Hallucination controls

The workspace now explicitly prevents the visual designer from inventing:

- Cancellation penalties or timing.
- Automatic completion/inactivity outcomes.
- Dispute SLAs, evidence deadlines, appeal counts, or fixed rounds.
- Automatic cash refunds/replacement/recovery.
- Government-ID types, face matching, clearances, or public verification badges.
- Automatic ranking, trust scores, or evidence scores.
- Connected-provider brands, production payment fees, live payout, or refund behavior.
- Tiwala legal classification, custody, or production release timing.
- Fictional emergency contacts.
- Geographic expansion beyond Tagudin.

Synthetic names, amounts, references, timestamps, files, and messages in `10b` are marked fictional deterministic fixtures. They are mockup data, not product evidence.

## 6. Mechanical evidence

- PRD source IDs: 59.
- PRD IDs represented in the dossier: 59.
- UX source IDs: 23.
- UX IDs represented in the dossier: 23.
- Canonical screen IDs in bridge: 74.
- Screen matrix rows: 74 unique; 0 missing; 0 extra; 0 duplicate.
- Canonical scenarios in bridge: 9.
- Scenario-blueprint headings: 9 unique; 0 missing; 0 extra.
- OpenSpec requirements: 9.
- OpenSpec acceptance scenarios: 9.
- Design review tasks: 21, including a dedicated L1 kiosk-assisted task.
- Independent-audit P1/P2 regression assertions: pass.
- Referenced workspace/source files: present.
- Markdown table/whitespace checks: pass.
- `git diff --check`: pass.
- Stale-term scan: references occur only in explicit avoid/deferred-policy context; no stale terms were introduced as active behavior in the new companion artifacts.

## 7. Residual design freedom

The next design agent may decide:

- Exact visual theme, typeface, spacing, and icon family.
- Tailwind/CSS implementation style for the throwaway reference.
- One routed document versus multiple linked pages.
- Desktop split-pane proportions and responsive breakpoints.
- How compatible screen IDs are grouped visually.

Those choices must preserve the user job, visible hierarchy, primary action, recovery, role permissions, cross-role consequence, and state meaning defined by the workspace.

## 8. Final readiness verdict

The corrected three-file workspace is a good, grounded UI/UX reference for beginning the next low-fidelity mockup batch.

It is ready for design authoring because a competent visual designer no longer needs to invent:

- Who uses each screen.
- What that person is trying to do.
- What must be visible.
- What the primary action does.
- What another role sees afterward.
- What failure/recovery must exist.
- Which capability is pilot, conditional, deferred, or sandbox-only.

This verdict does not mean:

- The visual design is founder-approved.
- All 74 screens should be produced before feedback.
- The product is implementation-ready.
- Production identity, payment, Tiwala, deployment, or genuine Tagudin pilot gates are cleared.

Recommended next batch: design `SCN-01` plus its `SCN-07` missing-counterparty-report/mismatch recovery branch, review it with the founder, and then update UX-only details or reopen the earliest affected upstream contract before expanding.
