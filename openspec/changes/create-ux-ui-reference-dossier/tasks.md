# Tasks: UX/UI Reference Dossier

Status: reference-authoring batch

- [x] Read the canonical PRD, UX specification, domain/state contract, mockup bridge, and OpenSpec project context.
- [x] Define the change boundary and non-goals.
- [x] Author actor/access-context library.
- [x] Author global information architecture and screen anatomy contract.
- [x] Author detailed user-perspective journey playbooks.
- [x] Author cross-role visibility and state-variant matrices.
- [x] Author low-literacy, low-data, assisted-access, safety, privacy, and support rules.
- [x] Add PRD/UX/domain/mockup traceability index.
- [x] Add 74-screen perspective matrix with exact screen-ID coverage.
- [x] Add nine connected scenario blueprints with exact scenario-ID coverage.
- [x] Run adversarial UX audit and correct unsupported/ambiguous claims.
- [x] Run independent subagent audit and incorporate valid P1/P2 corrections.
- [x] Review the reference workspace with founder/design agent; founder review recorded 2026-08-01.
- [x] Record feedback classification: UX-only, domain/state, schema/ADR, or implementation-story impact in `docs/planning-hardening/11-founder-frontend-review-and-replanning-table.md`.
- [x] Map the clarified frontend requirements to the canonical schema/ERD and record mock-only gaps in `docs/planning-hardening/11a-data-backed-frontend-system-mockup-plan.md`.
- [ ] Reopen the rebuilt PRD first: onboarding/formalization, Quick Deal entry/session terms, shared delegated Agent behavior, and complete request bidding change product behavior rather than UX only.
- [ ] Rebuild a source-backed Regulatory Formalization Ladder policy before restoring lane requirements, benefits, caps, badges, or tax claims.
- [ ] Decide the Quick Deal pre-Order session/proposal lifecycle and selected-listing cardinality; record schema impact without reviving air-gapped authority.
- [ ] Approve the Agent permission/approval/notice/forbidden-action matrix, including Owner SMS/revocation behavior and independent Owner login.
- [ ] Approve the Request/Quote/Reverse-Bidding response lifecycle using `requests → quotes → orders` unless a domain review proves a separate aggregate is required.
- [ ] Revise the UX/UI reference dossier, screen matrix, and scenario blueprints from the founder review table and ERD-backed mockup plan.
- [ ] Obtain explicit founder decision on whether `open offer` is a request status/tag, request subtype, or separate coordination object before changing taxonomy/PRD.

## Verification evidence required before design handoff

- All principal actors have a defined perspective.
- All 23 UX journeys have a dossier section or explicit cross-reference.
- A1/A3/A4/A9 and the conditional purchase-on-behalf flow are covered.
- All four payment lanes are visibly distinguished.
- Payment and Work are never collapsed.
- At least one failure/recovery path exists for every high-impact journey family.
- Cross-role consequences are documented for state-changing actions.
- Accessibility, safety, privacy, and assisted-access concerns are explicit.
- Prohibited/stale concepts are listed and mechanically scanned.
- Every dossier section cites upstream IDs.
