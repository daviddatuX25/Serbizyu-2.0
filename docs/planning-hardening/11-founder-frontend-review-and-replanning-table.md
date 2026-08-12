# Serbizyu 2.0 — Founder Frontend Review and Replanning Table

Status: FOUNDER REVIEW RECORDED — REPLANNING REQUIRED
Date: 2026-08-01
Branch: `planning-hardening`
Artifact type: planning-control / UX feedback classification
Authority: records founder feedback; it does not silently replace the canonical PRD, taxonomy, UX, domain, or payment contracts

## 1. Review trigger

The founder reviewed the current published React reference at:

`http://127.0.0.1:4177/Serbizyu-2.0/app/`

The review confirms that the current frontend is not yet robust enough to serve as the next design or implementation baseline. The correct response is to return to the planning table before another frontend screen batch is produced.

This is consistent with the independent UX closure audit in:

`docs/audits/ux-closure-frontend-coverage-review-2026-08-01.md`

That audit classified the current app as a visual/architectural seed with partial interactions, not as a connected simulation of the approved product contract.

## 2. Founder review table

| ID | Founder finding | Evidence in current app/audit | Classification | Planning disposition |
|---|---|---|---|---|
| FR-01 | The frontend still lacks a coherent end-to-end marketplace experience. | Listing management, provider response/quote, Order formation, Work execution, payment evidence, completion, dispute, support, and recovery are not reachable as a connected path. | Confirmed UX and implementation-scope gap | Do not add isolated screens. Replan around one connected vertical slice with explicit cross-role state and recovery. |
| FR-02 | There is no usable Deal-Chaining experience. The current related-work area is only an editable checklist. | The current surface appends a child row but has no provider discovery, invitation, child agreement, child Order/Work/Payment, dependencies, handoff, roll-up, cancellation, dispute isolation, or actor switching. | Confirmed UX gap; founder-approved foundation, later functionality, separate pilot gate | Keep Deal-Chaining out of the main pilot shell. Consume the approved Chain/Need/Dependency/Invitation contract first, then plan a bounded coordination experience with isolated child Orders and explicit recovery. |
| FR-03 | Deal-Chaining should be considered as a remote coordination flow, not as a bigger local checklist. | Founder direction: invitations may be sent remotely; open service/product needs may be published for others to fill. | Founder-approved bounded domain direction; functional implementation later | Add the bounded Chain/Need/Invitation/Dependency contract and reuse Requests/Quotes; implement later only with independent child Orders, explicit recovery, and a separate pilot activation gate. |
| FR-04 | An “open offer” may belong in the existing Requests area as a tagged Service Request/Product Request rather than as a standalone top-level feature. | Current taxonomy already has Service Request and Product Request; the current app does not expose a meaningful response/quote/acceptance flow. | Candidate taxonomy/UX decision | Treat `open offer` as a proposed presentation/mechanism concept only. Decide whether it is a request subtype, a visibility/status tag, or a separate coordination object before updating the taxonomy or PRD. |
| FR-05 | The Agent interface is not coherent or definitive enough to manage someone’s listings and work. | `Me` is a static capability summary; the current Agent page is not a complete Owner-scoped work surface; listing lifecycle actions are absent. | Confirmed UX and permission-contract gap | Make Agent Assistance a first-class workspace with persistent acting-for context, managed Owners, scoped grants, Today agenda, listing drafts, approval requests, notices, pause/revoke, and blocked-action explanations. |
| FR-06 | Listing management needs to be a first-class experience for Provider/Owner and Agent-assisted work. | “I offer a service” leads to a static profile; `Manage listing` is a dead/no-op control; no My Listings lifecycle is reachable. | Confirmed IA and journey gap | Replan `LST-001` through `LST-007` before visual implementation: list, create, draft, preview, review, active/paused/unavailable, capacity, attribution, and Owner approval. |
| FR-07 | Quick Deal should begin in a separate, dedicated dealing interface rather than being an incidental action attached to an arbitrary listing card. | Current Quick Deal is isolated, fixed to the wrong fixture, single-sided, and does not create/update a normal Order or Activity state. | Confirmed UX architecture correction; compatible with conditional Quick Deal scope | Design a dedicated Quick Deal entry/session: (a) initiator starts a session and chooses which eligible listing to offer; or (b) recipient scans/opens the initiator’s offer and continues in the same dealing interface. The session must preserve listing identity and end in conditional normal Order formation, not payment authority. |
| FR-08 | Quick Deal must not imply an offline payment product. | Current UI emphasizes camera/QR behavior while the approved boundary permits only conditional connected Quick Deal; air-gapped authority is deferred. | Product-boundary safeguard | Keep connected Quick Deal `PILOT-CONDITIONAL`. Keep air-gapped/offline payment, release, inventory, and irreversible-consent authority deferred. Show the boundary persistently in the reference. |
| FR-09 | The current app should not be treated as ready for another bulk visual implementation pass. | The audit found no canonical journey fully complete; no deterministic reviewer harness or browser regression suite exists. | Confirmed planning gate | Return to planning. Approve the revised experience architecture, resolve the open-offer/Deal-Chaining object decision, then author one representative connected scenario before expanding coverage. |
| FR-10 | Quick Deal must not appear as an action inside the public Browse/Listings search menu. | Founder clarification: Browse/Listings serves people who are still searching; after a person finds a listing there, the ordinary listing-to-deal path already applies. | Confirmed information-architecture correction | Give Quick Deal its own top-level entry. Provider/Owner or permitted Agent selects an owned listing and starts a session; Buyer/recipient enters by scanning/opening that session. Do not add Quick Deal buttons to ordinary search cards. |
| FR-11 | Quick Deal requires live deal-specific adjustment of price and terms, with future tailoring of an existing listing for one deal. | Current fixture only steps through a fixed price and does not preserve a proposal or adjustment history. | Confirmed journey requirement; schema detail pending | Start from an immutable listing version, create session-scoped proposed terms, show each adjustment and required re-confirmation, and snapshot only accepted terms into the resulting Order. Never mutate the public listing merely because one Quick Deal was tailored. |
| FR-12 | Agent work should not create a separate Agent-specific version of every listing screen. | Founder clarification: the Agent chooses an Owner and uses the same listing-management experience, limited by that Owner's grant; the Owner can still log in independently. | Confirmed interaction and authorization correction | Use an explicit delegated `Acting for [Owner]` context over the normal My Listings/My Requests/Orders surfaces. The Agent never shares credentials or becomes the Owner. Controls are enabled, approval-gated, or blocked from the active `consent_grant`; all actions retain Agent attribution and Owner notices/SMS where configured. |
| FR-13 | The current frontend omitted onboarding. | The app starts from a seeded persona and cannot demonstrate account confirmation, consent, capability selection, profile/access setup, identity review, assistance choice, or recovery. | Confirmed missing journey | Restore progressive onboarding before the management and transaction mockups are treated as complete. Onboarding must support self-managed and Agent-assisted paths without forcing a permanent Buyer/Provider role choice. |
| FR-14 | The planned Regulatory Formalization Ladder is absent from the rebuilt PRD/UX and current frontend. | The historical PRD contains a three-lane earnings-progression concept, but current rebuilt artifacts contain no formalization-ladder requirement or screen rows. Several historical tax/cap/unlock claims are separately marked as legal/research-gated. | Confirmed planning regression; legal/product details unresolved | Restore the progression experience as a planning track, separate it from identity verification, and reopen the PRD/UX before mockup production. Do not copy old BIR/BMBE/tax/cap claims into current UX until source-backed legal decisions approve the exact requirements and benefits. |
| FR-15 | Request bidding/response interfaces are missing. | The current app can publish a request but cannot let a Provider/Agent discover an eligible request, submit/update/withdraw a response, clarify scope, or let the Buyer compare and accept/decline/expire bids. | Confirmed UX coverage gap; current schema already has `requests` and `quotes` | Represent a competitive bid as a quote/response under the approved Reverse Bidding mechanism unless a later domain decision proves it needs another aggregate. Add Open Requests, My Responses, Request Responses, quote detail/comparison, clarification, acceptance, expiry, withdrawal, report, and accepted-Order consequences. |

## 3. Decisions captured now

These are accepted review directions, not yet a full replacement for upstream product contracts:

1. **No frontend bulk expansion yet.** The current app is evidence for planning, not the implementation baseline.
2. **Listing management is foundational.** A person who offers a service/product must have a clear, reachable, entity-specific management workspace.
3. **Agent assistance is a workspace, not a profile label.** The Owner, grant scope, permitted action, approval state, and attribution must remain visible while the Agent acts.
4. **Quick Deal is a dedicated conditional dealing session.** It must preserve the selected listing identity and support both initiator-first and recipient-scans-first entry paths.
5. **Deal-Chaining remains outside the initial pilot.** A future prototype may demonstrate remote coordination, but it must not look like a committed pilot capability or a pooled-money product.
6. **Open-offer semantics are unresolved.** The existing request model is the leading candidate for the visible entry point, but the team must still decide whether the tag represents a request status, a request subtype, or a parent-plan child need.
7. **Quick Deal is not a discovery-card action.** It is a separate top-level session entry for in-person rapid formation after the participants already know what is being offered.
8. **Quick Deal adjustments are session-specific.** A tailored one-off deal derives from a listing version but does not edit the public listing; accepted terms become an Order terms snapshot.
9. **Agent mode is delegated context over shared interfaces.** The Agent may switch among authorized Owners from an Agent hub, then uses the normal management surfaces with visible acting-for context and permission-aware controls.
10. **Onboarding and formalization progression are required planning tracks.** Identity verification, platform capability onboarding, Agent assistance, and regulatory/business progression must remain distinct concepts even when presented in one guided experience.
11. **Bidding must be operationally visible.** Publishing a request is not complete without responder discovery, response/quote composition, comparison, clarification, acceptance/decline/expiry, and resulting Order creation.

## 4. Required planning decisions before frontend work resumes

### DEC-UI-01 — Quick Deal entry and Order boundary

Resolve:

- Quick Deal starts from its own top-level entry, not from Browse/Listings search cards.
- Provider/Owner or permitted Agent selects an eligible owned listing, creates a session, and presents the QR/join artifact.
- A Buyer/recipient who scans/opens the artifact enters the same live dealing interface; a Buyer does not need to search again.
- The session begins from one immutable listing version. The allowed number of selected listings remains a separate cardinality decision and must not be guessed by the mock.
- Price, quantity/scope, schedule, inclusions/add-ons, or other approved terms may be proposed and adjusted. Every material change shows who proposed it and makes both parties reconfirm.
- A future one-off tailoring capability remains session-scoped by default. Saving it back as a reusable listing requires a separate explicit listing-version action.
- The mock must show decline, leave, expiry, stale listing/capacity, mismatch, disconnected/retry, and failed confirmation states.
- When is a normal Order snapshot created?
- Which Quick Deal actions are online-only or merely draft/conditional?
- Does implementation require a persisted pre-Order Quick Deal session/proposal aggregate, or can an approved draft-Order model safely represent it? The current ERD does not answer this.

Required outputs: revised Quick Deal journey, route/entry map, state/event table, and one connected scenario blueprint.

### DEC-UI-02 — Agent listing-management workspace

Resolve:

- How does an Agent select an authorized Owner from a lightweight Agent hub, then enter the ordinary Owner-scoped management surfaces?
- Which listing/request/quote/order actions can an Agent perform without Owner approval?
- Which actions require approval or notice?
- How does the Agent switch among managed Owners without losing context or leaking one Owner's data into another Owner's view?
- How are listing drafts, pending approvals, notices, expiry, pause, revoke, and blocked actions represented?
- Which Agent actions are explicitly forbidden regardless of Owner approval?
- Which changes send in-platform notices, SMS updates, or critical SMS confirmation/revocation actions to the Owner?
- How does the independently logged-in Owner see, correct, approve, pause, or revoke the Agent's work?
- How do shared screens state `Acting for [Owner]`, `Performed by [Agent]`, and the grant used without creating a duplicate Agent-only listing interface?

Security wording: this is delegated acting-for behavior, never authentication impersonation, password sharing, or a hidden role switch.

Required outputs: revised AGT-003/AGT-004 perspective rows, permission matrix, and SCN-06 route update.

### DEC-UI-03 — Remote Deal-Chaining/open-offer model

Resolve before any Deal-Chaining design is promoted:

- Is the parent plan a coordination container only?
- Is each child need a Service Request/Product Request with an `open offer` visibility/status tag?
- Who may discover, invite, respond to, accept, decline, or replace a child need?
- Does a child need become an ordinary Order after acceptance?
- How are dependencies and readiness blockers represented?
- How are parent progress, budget estimates, and child obligations rolled up without collapsing their state?
- What happens when one child fails, is cancelled, disputed, or replaced?
- How is unrelated child work kept usable?

Required outputs: taxonomy/PRD decision, parent/child state contract, future-capability activation record, and a separately labeled reference scenario. No live pilot route should be added before these exist.

### DEC-UI-04 — Onboarding and Regulatory Formalization Ladder

Resolve:

- What is the shortest progressive onboarding path for a Buyer, a self-managed Provider/Owner, an Agent-assisted Owner, and an Agent?
- Which steps are account/phone confirmation, consent, profile/capability setup, identity review, Agent delegation, and recovery?
- How can one account gain multiple capabilities without a permanent Buyer/Provider mode switch?
- Where does the user see current access, blocked capabilities, assistance options, and the next safe setup step?
- How is the Regulatory Formalization Ladder presented as optional progression rather than forced tax/compliance pressure?
- Which historical lane names, evidence, badges, earnings limits, tax claims, and benefits remain valid after legal/regulatory review?
- What current schema object records formalization state and evidence? The current ERD has no explicit formalization aggregate; `identity_verifications` must not be overloaded without an approved schema decision.

Required outputs: source-backed PRD requirements, a legal-gated lane policy, onboarding/progression screen rows, scenario blueprint(s), domain-state decision, and schema impact note.

### DEC-UI-05 — Request response, quote, and bidding experience

Resolve:

- How do Providers and permitted Agents discover eligible open Service/Product Requests?
- What eligibility, anti-spam, response limit, expiry, privacy, and safety gates apply before response?
- Which fields are required for scope, inclusions/exclusions, amount, schedule, validity, Work shape, and payment-lane options?
- Can a responder revise or withdraw a bid, and how is prior history preserved?
- How does the Buyer clarify, compare, shortlist, decline, report, accept, or let responses expire without fake ranking or automatic cheapest-bid award?
- Which accepted response becomes the immutable `quote` source for a normal Order?
- How does Agent attribution and Owner permission appear when the Agent responds for an Owner?

Planning default: use canonical `requests → quotes → orders` for both ordinary quote response and conditional Reverse Bidding. Do not add a separate `bids` entity unless the approved lifecycle requires invariants that `quotes` cannot represent.

Required outputs: revised REQ-001–REQ-005 rows, Provider/Agent perspectives, complete bid-response scenario, response state/event table, and mock fixtures for expiry/withdrawal/clarification/acceptance.

## 5. Replanning sequence

1. Reopen the rebuilt PRD first for the missing onboarding/formalization and clarified Quick Deal/Agent/request-response product behavior; do not attempt to solve product-contract gaps only inside a visual dossier.
2. Produce a source-backed legal/product decision for the Regulatory Formalization Ladder. Preserve the progression intent but do not revive unsupported tax, cap, badge, or payout claims.
3. Revise the UX/UI reference dossier, screen perspective matrix, and scenarios for onboarding, listing management, shared delegated Agent context, dedicated Quick Deal entry, and complete request bidding.
4. Record the Quick Deal session/proposal and accepted-Order boundary without reviving air-gapped payment authority.
5. Decide the open-offer/request relationship before changing the listing taxonomy or promoting Deal-Chaining.
6. Keep Deal-Chaining out of initial pilot navigation, but propagate the approved foundation now; sequence the bounded parent/child and child-Order experience later behind its activation gate.
7. Build connected mock scenarios from the canonical ERD plus explicitly labeled fixture-only state; do not invent backend support silently.
8. Recommended mockup order: onboarding/progression → Provider/Owner My Listings → Agent acting-for variation → Requests/bidding → Quick Deal session → normal Order consequence.
9. Run browser verification for each selected scenario, including entity identity, cross-role consequence, permission differences, refresh persistence, reset, and failure/recovery.

## 6. Explicit non-decisions

This review does not yet approve:

- Deal-Chaining as a pilot feature.
- `open offer` as a new canonical listing type.
- A pooled parent payment, wallet, escrow-like balance, or Agent custody model.
- Air-gapped Quick Deal payment or final authority.
- A global Buyer/Provider role switch.
- Agent authentication impersonation, password sharing, or a hidden account takeover mechanism.
- Historical Regulatory Formalization Ladder tax/cap/badge claims without renewed source-backed legal approval.
- A separate canonical `bids` table merely to satisfy the mockup.
- A production backend, authentication flow, or real integration.

## 7. Source references

- `_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md`
- `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`
- `_bmad-output/planning-artifacts/ux-spec-rebuilt.md`
- `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`
- `docs/planning-hardening/04-pilot-capability-matrix.md`
- `docs/planning-hardening/10-ux-ui-reference-dossier.md`
- `docs/planning-hardening/10a-ux-ui-screen-perspective-matrix.md`
- `docs/planning-hardening/10b-ux-ui-scenario-blueprints.md`
- `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`
- `docs/planning-hardening/07-schema-implementation-and-erd-contract.md`
- `docs/planning-hardening/07-canonical-erd.svg`
- `_bmad-output/planning-artifacts/prd.md` (historical source for the former three-lane progression; claims require revalidation)
- `docs/audits/ux-closure-frontend-coverage-review-2026-08-01.md`
