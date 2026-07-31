# Serbizyu 2.0 — BMAD Artifact Authority and Supersession Map

Status: REBUILT DRAFT — founder review required before final authority is declared
Purpose: prevent historical BMAD artifacts from competing with the rebuilt planning stack

## 1. Authority rule

For the rebuilt planning sequence:

1. Founder-approved planning-hardening decisions control contradictions and gates.
2. Rebuilt BMAD artifacts control product/domain/technical requirements after approval.
3. Supporting research supplies evidence but does not silently become policy.
4. Historical artifacts are preserved as evidence only.
5. The fresh readiness audit is produced last and cannot make an unresolved artifact authoritative.

## 2. Replacement map

| Historical artifact | Rebuilt authority | Classification after approval |
|---|---|---|
| `_bmad-output/planning-artifacts/prfaq-press-release.md` | `product-vision-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/prfaq-faq-challenges.md` | `product-vision-rebuilt.md` plus scorecards | HISTORICAL INPUT |
| `_bmad-output/planning-artifacts/listing-model-taxonomy.md` | `listing-model-taxonomy-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/phase-1-handoff-checklist.md` | `phase-1-handoff-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/prd.md` | `prd-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/ux-spec.md` | `ux-spec-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/architecture.md` | `architecture-rebuilt.md` plus domain/schema/ADRs | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/adr-catalog.md` | `adr-catalog-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/epics-and-stories.md` | `epics-and-stories-rebuilt.md` | HISTORICAL / SUPERSEDED |
| `_bmad-output/planning-artifacts/readiness-report.md` | fresh Stage E readiness report | HISTORICAL / INVALID AS CURRENT GATE |
| `docs/mockup.html` and archived screens | `ux-spec-rebuilt.md` plus regenerated prototypes | HISTORICAL UX INPUT |
| `old-docs/spikes/*` | research/ADR/supporting evidence | HISTORICAL RESEARCH INPUT |

No historical file may be used to reintroduce a superseded revenue split, geography, payment promise, state machine, category count, or deployment commitment.

## 3. Rebuilt artifact chain

### Stage A — Founder/product control

- Recovery charter
- Contradiction register
- Payment/trust-lane policy
- Success/go/no-go scorecards
- Pilot capability matrix

### Stage B — Product vision/taxonomy

- Product Vision
- Listing/transaction/fulfillment/access taxonomy
- Phase 1 handoff

### Stage C — Product/experience

- PRD
- UX specification and requirement coverage

### Stage D — Technical planning

- Domain/state contracts
- Canonical schema/ERD
- ADR catalog
- Technical architecture/operations
- Epics/stories

### Stage E — Readiness

- Fresh independent audit
- Traceability verification
- Security/privacy/financial/operations evidence
- Founder readiness decision

## 4. File naming rule

Until the founder approves the rebuilt set, `*-rebuilt.md` files remain explicit drafts. After approval, either:

- Promote them to canonical filenames and archive the old files, or
- Keep the rebuilt names and update repository guidance so only them are normative.

Do not maintain two unmarked PRDs, taxonomies, architectures, or readiness reports.

## 5. Authority gate

The set is ready for implementation-readiness review when:

- All rebuilt artifacts are founder-approved.
- Historical artifacts are visibly classified.
- No downstream artifact cites a historical file as current authority.
- The fresh Stage E audit passes.
