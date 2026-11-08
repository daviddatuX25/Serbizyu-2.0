---
title: 'Execute the exact seller-saved partnership plan'
type: 'feature'
created: '2026-11-02'
status: 'in-progress'
review_loop_iteration: 2
review_scope: 'Best-effort tracked WIP diff plus new files; initial working tree already contained unrelated changes.'
readiness: 'Closing-review hardening open; do not activate from historical suite totals.'
context:
  - 'docs/planning-hardening/38-orders-and-listing-combination-usability-audit.md'
  - 'docs/planning-hardening/37-commerce-finish-map-and-quick-deal-scope.md'
  - 'CONTEXT.md'
  - '.ai/rules/architecture.md'
  - '.ai/rules/payments.md'
---

## Intent

**Problem:** Saved partnership IDs survive consumer selection, but ordinary booking/Picks can ignore coordination and staging derives a different catalog graph. Seller payloads also mix display tiers, missing anchors and unsupported gate codes.

**Approach:** Use one validated versioned saved-plan definition, preserve existing builder screens while correcting producer data, route explicit saved selections through coordinated review/staging, and reuse independent provider invitation/child-Order services. The user approved this cut through the explicit “Fix saved-plan contract first” choice.

## Boundaries & Constraints

**Always:** A listing version owns its saved plan. Distinct stable node IDs, exactly one explicit host anchor, explicit acyclic dependency edges and supported conditions. Provider invitations are not Orders; existing acceptance/confirmation owns child formation. Work, payment, sibling history and actor authority remain independent. Preserve all unrelated dirty work, listing details and builder layout.

**Ask First:** New product semantics, ambiguous historical data repair, account/credential resets, live-environment migration, SDK/package installation, unrelated builder/UI redesign.

**Never:** Infer a primary node from title text; substitute latest recipe or client prices; clear unknown gates; equate audit completion with safety certification; rewrite old terms; create parent escrow; resume Agent/Quick Deal/media implementation.

## Contract and Edge Cases

Canonical saved combinations retain existing display/provenance fields and add `planVersion: 1`. Nodes have unique `id`, explicit `isPrimary`, typed role/type and optional preferred listing reference. Dependencies use existing `predecessorId`, `successorId`, `conditionCode`, `dependencyType: blocks`; only active edges execute.

Supported conditions: `part_ready`, `delivery_signed`, `work_completed`. Editor join shorthand compiles to explicit edges; unsupported audit/bypass declarations fail closed. Recipe adapters copy authoritative primary/edge metadata. Deliberate tier/topology edits compile to explicit adjacent occupied-tier edges with same-tier parallelism; condition/cosmetic edits preserve existing exact edges and primary placement. Incomplete drafts may persist; publication and stage enforce executable definitions.

| Case | Required result |
|---|---|
| Saved selection | Explicit opt-in, clearable; package/extras/quantity retained; direct CTA reviews only that selection |
| Saved-only Picks | Coordinated review/stage, never ordinary basket[0] booking |
| Saved versus catalog | One selected source; mixed/tampered selectors rejected or explicitly switched, never silently merged |
| Exact graph | Server reads pinned listing version and saved nodes/edges, not client graph or latest catalog |
| Open/buyer-choice role | Explicit candidate selected before saved staging; server rechecks role/owner/current source |
| Stale, malformed, wrong role or unpriced offer | Clear error, no partial plan/invites/notifications; old ambiguous Picks require source refresh |
| Retry | Request-bound idempotency inside plan transaction; succeeded replay precedes fresh-source validation |
| Work gate | Completion condition clears only from a validated current source completion; unknown conditions block |

Partner quantities retain existing inherited-primary behavior. Partner defaults/current canonical prices come from existing listing source services; authored fee text is not a guaranteed quote.

## Code Map

- `app/Shared/Application/DealChainPlanDefinition.php`: shared pure graph/condition definition.
- `app/Modules/Listings/Infrastructure/ListingRepository.php`: publication validation, drafts/history preserved.
- `app/Modules/Catalogs/Application/DealChainCatalog.php`: authoritative frontend primary flags.
- `app/Modules/DealCoordination/Application/StageDealChain.php`, `DealChainController.php`: exact-plan resolution, atomic invitations, public validation envelope.
- `DealWorkGateAdapter.php`, milestone reader and forward migration: completion gates and fail-closed condition handling.
- ListingDetail, Picks, Browse/marketplace helpers/types and checkout/picker: one consumer selection/review/serialization path.
- Existing CreateService/CreateProduct/customizer adapters: explicit graph output without redesign.
- `tests/Feature/DealChaining/*`, listing lifecycle, focused frontend tests: consumer-visible behavior.
- `resources/js/lib/requestKey.ts` and agreement/Order/Work request callers: genuine Web Crypto request keys on the existing HTTP training surface; no authentication-policy change.
- `database/seeders/SavedPartnershipQaSeeder.php`: guarded, non-overwriting synthetic buyer and two-service fixture; no preformed Orders or fake terminal Work states.

## Tasks & Acceptance

- [x] Restore an opt-in Sail Node tools runner without rebuilding production services or installing packages.
- [x] Implement and validate the canonical plan definition at publication/stage.
- [x] Make graph staging atomic and source-authoritative; retain existing generic/direct paths.
- [x] Preserve explicit consumer opt-in and exact review/staging across all callers.
- [x] Correct producer adapters and support verified completion gates through a forward migration; never migrate the populated developer database during verification.
- [x] Prove exact needs/edges/provider invitations, rejection/rollback/replay and independent child formation through focused tests and an isolated runtime scenario.
- [x] Resolve observed HTTP request-key failures in the agreement/Order/Work path without weakening randomness or authority.
- [ ] Close the five source-backed authoring/publication/product-projection/upgrade blockers and repeat their exact acceptance cases from document 37 §12.1. Keep the approved builder layouts and existing history.

Given a saved listing choice, when the customer reviews and sends it, then actual authored partners/edges and chosen primary terms are staged once, with no Order/Work/payment at staging. Given separate provider acceptance and coordinator confirmation, then ordinary isolated child Orders form through existing services. Given completed Work, payment remains a separate acknowledgement process.

## Verification

Baseline: Node22.23.4 runner and TypeScript passed; selected-terms PHP test passed 21 assertions. Picks baseline had 6 passes/1 failure; no whole-suite green claim.

Run focused PHP and frontend tests, architecture checks, scoped formatting/static checks and production build after integration. Apply the new gate migration only to isolated verification databases. Exercise the actual chosen plan with synthetic separate actors/private storage; no broad reseeding or fixed-account reset. Record observed evidence and any remaining gates. No mocked capture or fixture terminal status is an end-to-end pass.

Observed: full backend suite **551 passed / 6,854 assertions**; full frontend suite **357 passed / 56 files**; TypeScript and production build passed. A real three-actor browser run formed two separate Orders, rejected premature successor Work, completed scanner-backed predecessor Work through the buyer's own sign-off, kept its payment due/unpaid, dispatched the verified completion, and then admitted the successor submission. No approval or scan status was fabricated.

Implementation is not an all-features release certification. The scoped broad PHPStan run still reports 28 errors in touched legacy code, and the selected-page ESLint run reports 18 errors / 4 warnings; no rules were suppressed. The new plan definition, gate adapter and QA seeder pass their narrower PHPStan run. Current evidence, fixture migrations, operational requirements and the next bounded cut are in the resumption audit, §26.

**Readiness correction after the finish-first planning recheck:** the results above remain recorded evidence for the exercised paths, not proof that the closing-review edge cases were fixed. Current source still has the five blockers in document 37 §12.1; the migration also queries a nonexistent confirmation `status` column and can attempt cleared gates without the required verified source fact. This spec is reopened for bounded hardening, with approved product intent unchanged. The planning recheck ran no application tests, migrations or data writes.

## Execution successor

The user-approved broader finish specification is [GitHub #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34), indexed in [the implementation handoff](../../docs/planning-hardening/39-controlled-pilot-implementation-handoff.md). This existing saved-plan cut stays narrow: its five hardening blockers are owned by #35 (migration), #37 (graph/role edits), #38 (catalog primary) and #39 (product projection). Keep this spec `in-progress` until those exact acceptance cases pass; broader Quick Deal/media tasks are separate children, not permission to expand this old cut.

The handoff syntax check also confirmed the pending migration fails parsing at line 86. That same migration ticket is first and provides its own isolated preflight before #36 business-scenario setup. No application repair or database write was made by the planning pass.

### F05 upgrade repair evidence

Issue #35 repairs only the upgrade blocker; the remaining graph/role, catalog-primary
and product-projection acceptance cases above remain open. The earlier parse/schema
findings are retained as historical evidence, not descriptions of the repaired source.
The original migration identity is preserved, with a separate `000200` forward repair
for installations already recording `000100`. Neither migration relabels historical
conditions or infers clearance from Work status. Both reuse the runtime's exact current
confirmation/child-Order/source-fact reconciliation.

Disposable Sail CLI runs exercised empty-schema migration, populated pre-upgrade
completion facts, and an already-applied-ledger fixture. In each actual continuation,
the provider's proposal and the buyer's completion before dispatch left the successor
blocked; the real completion dispatcher linked one verified fact and admitted the
successor. Payment remained unsettled. A forward rollback refused and retained both
migration records, the source fact, cleared gate and clearance constraint. No normal
database migration, account reset, historical A2 execution or deployment occurred.
Current commands, references, focused checks and review disposition belong to
[handoff §8](../../docs/planning-hardening/39-controlled-pilot-implementation-handoff.md#8-f05-implementation-evidence).

### F02 graph and role repair evidence

Issue #37 repairs the two customizer blockers without redesigning the builder.
Condition/label edits retain canonical node order, IDs, primary placement/tiers
and exact dependency identities/endpoints. Deliberate role edits clear incompatible
bindings and stale provider facts; source-specific gates require explicit
reconciliation. Canonical node assignment defaults win over cached slots.
The canvas now projects actual edges rather than inventing adjacent-tier joins.
Publication rejects incompatible active preferred bindings while buyer-choice
references remain non-binding and require explicit eligible selection at staging.

Actual isolated owner edit → save/reopen → role/rebind → submission → staff
approval → consumer choice/stage preserved a four-node sparse graph, its middle
primary and independent same-tier branch. Persisted output had exactly two
dependencies, four invitations and no child Orders. Original listing-version
hashes, packages and add-ons remained unchanged. Focused checks passed:
43 backend tests / 273 assertions, 47 frontend tests and typecheck/build.
Standards and Spec reviews passed after their findings were resolved.
See [handoff §10](../../docs/planning-hardening/39-controlled-pilot-implementation-handoff.md#10-f02-implementation-evidence)
for commands, runtime boundaries and remaining unrelated lint/static diagnostics.
Catalog-primary #38 and product-projection #39 remain open; this spec stays
`in-progress` and does not claim broader pilot readiness.

### F03 catalog primary repair evidence

Issue #38 carries an explicit primary from the existing staff pipeline control
through validated publication, immutable persistence, public projection and
listing adoption. Executable publication requires one boolean marker per node
and exactly one selected primary. Republish requires the exact current source
version under a transaction/recipe lock; unknown/malformed codes, stale versions
and creation collisions do not append a row. Explicit false overrides legacy
primary sentinels; historical rows are not rewritten.

Actual separate staff/owner browser sessions selected a middle primary, published
v2, reloaded and republished v3, then adopted v3 into a listing. Later deliberate
catalog v4 primary changes did not alter the listing's pinned v3 middle primary.
Real negative HTTP requests rejected zero/multiple, stale and unknown sources;
readback preserved the original v1 hash. Focused checks passed 55 backend tests /
327 assertions, 42 frontend tests and typecheck/build. Standards and Spec passed;
existing unrelated static/lint debt remains recorded in
[handoff §11](../../docs/planning-hardening/39-controlled-pilot-implementation-handoff.md#11-f03-implementation-evidence).
Product-projection #39 remains open, so this owning saved-plan spec remains
`in-progress`; no whole-commerce or pilot qualification is implied.
