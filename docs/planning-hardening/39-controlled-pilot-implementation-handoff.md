# Controlled Tagudin pilot — implementation handoff

**Status:** product direction and task structure approved; [finish specification #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34) and 32 self-contained child issues are published with 55 native blocking edges. F05/#35, F01/#36, F02/#37, F03/#38 and F04/#39 are implemented and verified in disposable environments (§§8–12); no broader finish or pilot readiness is claimed. This file is the execution index, not another product roadmap.

**Sequencing update (2026-11-13):** The user deferred localization and directed core Request → Quote → Order → Work → payment work to proceed in English. Preserve existing language preferences, including Ilocano; do not imply Filipino or Ilocano interface support. F06a remains open and is not a prerequisite to beginning this English core work under this direction. This changes sequencing only: reviewed Filipino/Taglish and English remain mandatory before the Tagudin pilot, including F06b qualification. Existing GitHub dependency edges have not been changed.

## 1. Authority and starting point

- [Document 37 §§12–13](37-commerce-finish-map-and-quick-deal-scope.md#13-final-direction-decisions-for-the-implementation-handoff) owns the final direction and five bounded correctness gaps.
- [Document 38](38-orders-and-listing-combination-usability-audit.md) owns historical source/mock/runtime evidence. Its current precedence notices override older prototype-only exclusions and optional-media language.
- The existing [saved-partnership implementation specification](../../_bmad-output/implementation-artifacts/spec-saved-partnership-execution.md) remains reopened for its narrow hardening. It does not authorize implementing the whole finish scope inside that old cut.
- GitHub [finish specification #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34) owns the approved specification and native child-issue graph. Each linked child below contains its own steps, acceptance and verification. Existing master #9 remains historical context, not this finish queue or a fresh all-clear.

- Current reviewer observations and the protected preview link belong in [Product improvement inbox](40-product-improvement-intake.md). That inbox captures feedback; it does not replace this execution index or authorize untriaged changes.

**Initial executable cut: [#35 / F05](https://github.com/daviddatuX25/Serbizyu-2.0/issues/35), not scenario seeding.** The planning check found the known gate migration failed parsing at its `down()` declaration, line 86 (`unexpected token "public"`, exit 255), alongside confirmation-schema and fact-linkage problems. F05 repairs and verifies that upgrade (§8). [#36 / F01](https://github.com/daviddatuX25/Serbizyu-2.0/issues/36) subsequently qualifies the isolated actor/scenario baseline (§9). Continue only through the then-open unblocked children; never migrate the populated normal database without approval.

## 2. Published implementation tasks

Each task has one main outcome, its own steps/acceptance/runtime proof, and only its true blockers. Letter suffixes split previously oversized work; they do not add product scope. Native copy review, offline feasibility and SDK/device qualification must not block unrelated repairs.

| Task | Delivers | Blocked by |
|---|---|---|
| [F05 · #35](https://github.com/daviddatuX25/Serbizyu-2.0/issues/35) | Executable, fact-backed fresh/populated dependency-gate upgrade with preserved history | None; includes its own isolated preflight |
| [F01 · #36](https://github.com/daviddatuX25/Serbizyu-2.0/issues/36) | Safe synthetic actor/scenario baseline, staff entry and non-rewinding reruns | F05 |
| [F02 · #37](https://github.com/daviddatuX25/Serbizyu-2.0/issues/37) | Saved graph/primary preservation and deliberate role edits through publish/stage | F01 |
| [F03 · #38](https://github.com/daviddatuX25/Serbizyu-2.0/issues/38) | Exactly one catalog primary surviving editor/request/persistence/public selection | F01 |
| [F04 · #39](https://github.com/daviddatuX25/Serbizyu-2.0/issues/39) | Product partner-role/fulfillment round-trip and truthful selection/recommendations | F01 |
| [F06a · #40](https://github.com/daviddatuX25/Serbizyu-2.0/issues/40) | Unified preference/content keys and readable fallback, preserving Ilocano preferences | F01 |
| [F07 · #41](https://github.com/daviddatuX25/Serbizyu-2.0/issues/41) | Request/Quote custom-service agreement, A1 Work and separate cash/P2P acknowledgement | F06a |
| [F08a · #42](https://github.com/daviddatuX25/Serbizyu-2.0/issues/42) | Task-first mobile/desktop Order workspace and actual final review-before-commit | F06a |
| [F08b · #43](https://github.com/daviddatuX25/Serbizyu-2.0/issues/43) | Versioned pending-review A1/A3 correction, resubmission and retained history | F08a |
| [F08c · #44](https://github.com/daviddatuX25/Serbizyu-2.0/issues/44) | Stable image-upload retries and rejected/withdrawn draft-slot recovery | F06a |
| [F08d · #45](https://github.com/daviddatuX25/Serbizyu-2.0/issues/45) | Correct notification unread/inbox transport and account continuation | F01 |
| [F09 · #46](https://github.com/daviddatuX25/Serbizyu-2.0/issues/46) | Ordinary multi-Picks/product stock and A4 counter/courier handoff qualification | F08a |
| [F10 · #47](https://github.com/daviddatuX25/Serbizyu-2.0/issues/47) | A3 capacity/reschedule and A9 private version/revision/acceptance qualification | F08a |
| [F11 · #48](https://github.com/daviddatuX25/Serbizyu-2.0/issues/48) | Saved Deal Chain formation, current-fact gates, privacy and isolated replacement | F02, F03, F04, F05, F08a |
| [F12 · #49](https://github.com/daviddatuX25/Serbizyu-2.0/issues/49) | Scoped staff case/hold/investigation/recovery with maker/checker separation | F07, F08a |
| [F13a · #50](https://github.com/daviddatuX25/Serbizyu-2.0/issues/50) | Permitted-versus-required Work tools from source authoring to accepted runtime/review | F06a |
| [F13b · #51](https://github.com/daviddatuX25/Serbizyu-2.0/issues/51) | Real timestamp-photo capture/import, provenance and private participant review | F13a, F08c |
| [F14 · #52](https://github.com/daviddatuX25/Serbizyu-2.0/issues/52) | Explicit device/manual Work map pin, read-only review and permission/tile fallback | F13a |
| [F15 · #53](https://github.com/daviddatuX25/Serbizyu-2.0/issues/53) | Real voice capture/import, private safety processing, playback and recovery | F13a, F08c |
| [F16 · #54](https://github.com/daviddatuX25/Serbizyu-2.0/issues/54) | Short-video evidence through the typed private-media lifecycle and cross-device playback | F15 |
| [F17 · #55](https://github.com/daviddatuX25/Serbizyu-2.0/issues/55) | Compact reviewed Quick Deal record/authority/schema contract and stable interfaces | F02, F03, F04, F05, F07, F08a |
| [F18 · #56](https://github.com/daviddatuX25/Serbizyu-2.0/issues/56) | Real public QR lookup/owned listing selection and private pending records, both initiators | F17 |
| [F19 · #57](https://github.com/daviddatuX25/Serbizyu-2.0/issues/57) | Independent account, authorized QR/link and app-issued one-use-code approval | F18 |
| [F20 · #58](https://github.com/daviddatuX25/Serbizyu-2.0/issues/58) | Record-only/new-Order/existing-Order outcomes through canonical adapters | F19, F09, F10 |
| [F21 · #59](https://github.com/daviddatuX25/Serbizyu-2.0/issues/59) | Private versioned copies/receipt verification and concern before an Order exists | F19, F12 |
| [F22 · #60](https://github.com/daviddatuX25/Serbizyu-2.0/issues/60) | Proven prepared-device signing/unlock/transport protocol and durable offline preparation | F19 |
| [F23 · #61](https://github.com/daviddatuX25/Serbizyu-2.0/issues/61) | Two prepared phones independently approve exact terms and exchange attributable copies offline | F22 |
| [F24 · #62](https://github.com/daviddatuX25/Serbizyu-2.0/issues/62) | Both-uploader safe sync, current checks, explicit conflicts and single canonical effects | F23, F20, F21 |
| [F25a · #63](https://github.com/daviddatuX25/Serbizyu-2.0/issues/63) | Online helper statements, separate authentication and shared-phone/kiosk isolation | F21 |
| [F25b · #64](https://github.com/daviddatuX25/Serbizyu-2.0/issues/64) | Offline key/store isolation and safe retention of sole unsynced copies at handover | F25a, F24 |
| [F06b · #65](https://github.com/daviddatuX25/Serbizyu-2.0/issues/65) | Native-reviewed Filipino/English critical journeys, comprehension and copy qualification | F11, F14, F16, F25b, F08d |
| [F26 · #66](https://github.com/daviddatuX25/Serbizyu-2.0/issues/66) | Complete device/language/operational qualification and controlled pilot activation gate | F06b, F08b, F13b |

F26's transitive blockers include every other task. A ready label is not permission to work through an open blocker or evidence of completion. F17 does not claim physical offline compatibility; F22 must prove it. Online QR/copies/helper work can proceed independently of that later physical offline gate.

## 3. Coverage and completion oracles

The A-cases retain their definitions in document 37 §8. This table assigns owners, not pass status. All cases require the actual supported runtime and negative/recovery branches; none passed merely because these tasks were written.

| Case | Main owners | Required evidence |
|---|---|---|
| A01 Login/staff eligibility | F01, F08d, F12 | Separate real sessions; intended return, denial and account/private-state boundaries |
| A02 Request/bids/Quotes | F07 | Exact counter/award once, competitor privacy and current source-owned terms |
| A03 Work/payment | F07, F08a–c, F13a–b, F15–16 | Actual evidence/scan/review/clearance; recipient acknowledgement remains separate |
| A04 Product/A4 | F04, F09 | Exact variant/quantity, stock once, custody versus recipient receipt and payment |
| A05 A3/A9 | F08b, F10 | Capacity/reschedule and delivery version/revision, wrong-user/stale recovery |
| A06 Deal Chain | F02–05, F11 | Exact authored graph, independent invitations/children, verified gates, privacy/replacement |
| A07 QR/online Quick Deal | F17–20 | Real QR both directions, independent exact approval, three distinct outcomes |
| A08 Offline Quick Deal | F22–24, F25b | Physical two-phone no-signal proof/copies, restart, sync/dedup/conflict/key boundaries |
| A09 Rejection before Order | F21, F24 | Retained rejected record, scoped concern/copy and no manufactured Order or penalty |
| A10 Shared device/helper | F25a–b | Optional own helper statement; separate authentication and no private/key/copy leakage |
| A11 Location/Order usability | F08a, F13a, F14 | Real next actions, one mobile dock, desktop parity, intentional location and fallback |
| A12 Staff recovery | F12, F21 | Real references/cases, narrow holds, maker/checker and retained evidence/history |
| L01 Enabled local copy | F06a–b and each owning feature | Preference/refresh/notification/copy behavior, native review and buyer/provider comprehension |
| M01 Timestamp photo | F13b | Visible stamp in actual stored image pixels, truthful import/source/receipt times |
| M02 Voice | F15 | Real recording/import -> private processing -> authorized playback/review/recovery |
| M03 Short video | F16 | Real bounded recording/import and cross-device private playback; time is metadata |

For each case record: environment/evidence class, actors and references, pinned terms/version, initial checkpoint, exact actions, expected versus observed UI and persisted facts, negative/retry/recovery results, artifact/time and blocker. Keep synthetic credentials/evidence private, not in public GitHub issues. A seeded `clean`, `completed` or `settled` value and a mock camera are not observed transitions.

## 4. Fresh-session implementation procedure

1. Fetch finish parent #34 and the chosen child including comments/labels. Recheck blockers against current issue state; take one ready child only. Initially this is #35 / F05; after it closes, #36 / F01 becomes ready.
2. Read this index, document 37 §§12–13 and only the relevant source/mock sections of document 38. Read root `CONTEXT.md`, applicable `.ai/rules` and required implementation/testing/framework/UI skills. Follow Laravel's installed-version documentation rules.
3. Preserve the current user worktree. Locate current symbols with the available code-intelligence tools; do not assume an old line number or historical suite count is current truth. The old unsupported A2 Order stays readable/non-executable; do not rewrite it or rerun its reported error merely to confirm it.
4. Preflight actual Sail service/configuration, database and private-storage targets. Use an approved disposable namespace; HTTP, scanner and outbox must agree. Never reset normal accounts/database/storage or apply live migrations without approval.
5. Follow the child's steps and behavior-level acceptance. Reuse current module services/shared ports and shared UI. Reproduce source-derived bugs before repair; retain useful failing-before/passing-after regressions. For a new feature, prove the actual consumer-visible path and important errors, not source strings/wiring/mocks.
6. Run the narrow affected tests when behavior warrants them, scoped required formatting/static checks and an actual runtime smoke. Browser/device work needs the actual surface; viewport/fake-camera observations do not certify physical Android/iOS. Read-only planning review is not runtime proof.
7. Record exact exercised evidence and scope, update the existing owning docs, and complete Standards + Spec review before closing the child. Ask the user to run the full suite after focused tests pass, per project rules. Leave dependent work blocked if a prerequisite is unavailable; continue independent ready work.
8. At a completed-ticket boundary, use the next ready child as the fresh-session contract. Update current evidence before clearing context; unfinished protocol assumptions must not disappear in a session summary.

### Paste into the fresh implementation session

```text
Implement GitHub issue #35 (F05) from finish spec #34 only.
Read docs/planning-hardening/39-controlled-pilot-implementation-handoff.md and fetch both issues with comments.
Check current issue status/blockers before acting; if #35 is already accepted, select the next open unblocked child instead of repeating it.
Perform the ticket's own safe runtime/database/private-storage preflight. Preserve all existing user WIP and accepted history.
Repair the migration syntax and schema/fact-backed upgrade behavior; prove fresh and populated upgrades in disposable environments.
Follow the child acceptance criteria, focused checks, actual runtime smoke and Standards/Spec review; record evidence before closing.
Do not reseed/reset the normal database, install an unapproved SDK, migrate/deploy live, or start another feature in this ticket.
Product direction is settled in document 37 section 13; no new overall planning or UI redesign.
```

The immediate implementation sequence is #35 → #36 → the then-open frontier. Subsequent tickets are selected by real blockers, not by issue number alone.

### Existing verification/runtime entry points

Consult the [README runtime guide](../../README.md) for the current Sail Node-tools profile, explicitly pinned backend test invocation and guarded saved-partnership QA setup. These are command references, not commands executed by this planning pass. Inspect effective configuration before any run; do not copy a historical database/private-storage path as an instruction to reuse/reset it.

The current normal PHP app image has no Composer/Node binary; the existing opt-in Node-tools profile avoids a large development-image rebuild. PHP tests must explicitly pin testing environment/database rather than rely only on XML defaults. Private HTTP/scanner/outbox roots must match, including HTTP SAPI environment visibility. Hardware QR/camera/mic/GPS qualification needs a trusted HTTPS origin, not merely a LAN HTTP listener.

## 5. Navigation by owned behavior

These are local lookup pointers, not permission to redesign every referenced surface.

| Work | Start with |
|---|---|
| Saved graph/roles/catalog/product | Existing saved-partnership spec Code Map; `DealChainCustomizerModal`, `DealChainStudio`, `AdminDealChainCatalogController`, `CreateProduct`, `DealChainPlanDefinition` |
| Upgrade/current completion | The named `2026_11_02_000100_allow_work_completed_dependency_gates` migration, original gate constraint, `DealWorkGateAdapter`, current confirmation/Order schema |
| Request/Quote formation | `BuyerRequestAndQuoteFlowTest`, `FormQuoteAwardOrder`, `QuoteAwardOrderFormationPort`, Request/Quote services |
| Order/Work review/recovery | `Orders/Show`, `WorkExecutionService`, `WorkClearanceChallengeService`, `WorkNodeEvidenceService`, existing OrderEvidence/Work tool/challenge suites |
| Media/tool/source propagation | `WorkSpecificationPort`, `WorkCatalog`, `WorkContractDefinition`, listing source adapter, accepted specification and evidence scan/review path; document 38 §§21–24 |
| Mapping | `WorkLocationPinInput`, `TagudinLeafletMap`, `TagudinLocationPicker`; existing Leaflet dependency is not proof of Work mapping |
| QR/records/canonical adapters | Current `QuickDealScanModal` and callers, public listing queries, `SubmitOrderProposal`/`FinalizeOrderAgreement`; document 38 §§14–17 |
| Concern/staff/copy | `CommunicationsService`, existing case idempotency, staff admission/Inspector/maker-checker and shared module ports |
| Language | Existing onboarding/profile/user preference writes, `SliceStateQuery`, `HandleInertiaRequests`, `NotificationReadModel`; one read/write contract |

## 6. Activation and unresolved technical prerequisites

Product direction is settled. Engineering choices must be resolved in their named tasks, not silently improvised or sent back as another broad product interview:

- **F17:** review the bounded QR/record/state/schema/authority contract, canonical versioned bytes and one-use-code policy. Mock timeout/attempt values are not approved production policy.
- **F22:** prove prepared-device enrollment, local unlock/key custody, standard signing/verification, rotation/revocation uncertainty, transport/copy acknowledgement and durable private storage on actual supported devices. Do not substitute public QR consent or offline preparation-only behavior if proof fails.
- **F13b/F15/F16/F18:** any concrete new SDK/codec/processor package still needs ordinary dependency approval and installed-stack qualification. No SDK was approved/installed by the direction batch.
- **F06b/F26:** obtain native Filipino review/comprehension, physical-phone/trusted-HTTPS evidence, operational worker/private-storage/backup-recovery proof and named pilot support. Ilocano activation has its separate native review; unrestricted public launch remains outside this finish.
- **Activation:** a task can be implemented without being enabled for genuine use. Required blocked/unrun cases prevent pilot activation. This planning pass authorizes neither live-environment migration nor deployment.

## 7. Planning verification

Two independent read-only reviews covered core/Work and QR/offline task contracts. Four findings led to separate language activation, Order recovery/transport, Work-tool/photo and online/offline helper tasks. A subsequent prerequisite check caught the migration syntax failure and placed its repair ahead of fresh scenario setup.

The approved graph has 32 unique tasks, valid blocker references, no cycles/redundant direct edges, one initial executable frontier (#35 / F05), and all tasks transitively included in #66 / F26. GitHub readback verified all 32 child bodies and ready labels, the exact parent/sub-issue membership, and all 55 native blocking edges against the approved contracts. Coverage includes every A01–A12 case and L01/M01–M03. No application tests, migrations, package installs, account resets or feature fixes were performed in this planning pass; the PHP syntax check is the sole application-code command recorded above.

## 8. F05 implementation evidence

Evidence class: synthetic actors, real Sail PHP/PostgreSQL CLI and module commands;
not a physical service, browser/device qualification, or pilot activation. Scope is
[#35 / F05](https://github.com/daviddatuX25/Serbizyu-2.0/issues/35) only. Parent #34
and child #35 were fetched with comments; both were open, neither had comments, and
#35 had no native blockers. Existing tracked/untracked user WIP was preserved.

### Environment and repair route

Read-only preflight found PHP 8.4 / Laravel 12.68 / PostgreSQL 16, healthy normal
`app`, `db`, `redis`, `mailpit`, `web` services, normal database `serbizyu`, normal
storage `/var/www/html/storage`, and no cached configuration. The normal ledger
did not contain `000100`; its original condition and fact-backed clearance
constraints remained installed. Confirmations have `order_id`, no `status`, and
one confirmation per Need. Three preexisting QA/verification ledgers did contain
`000100`; none of those databases was migrated or reset.

New disposable targets: `serbizyu_f05_test_20261102`,
`serbizyu_f05_fresh_20261102`, `serbizyu_f05_upgrade_retry_20261102`, and
`serbizyu_f05_applied_20261102`. Every application process explicitly pinned
`APP_ENV=testing`, its `DB_DATABASE`, `APP_CONFIG_CACHE=/tmp/serbizyu-f05-config.php`,
`LARAVEL_STORAGE_PATH=/tmp/serbizyu-f05-20261102`, array cache/session/mail and
synchronous queue. Effective private storage was that root's `app/private`;
payment/notification providers were disabled and evidence processing local.
There was no HTTP/media/scanner path in this backend-only smoke; the CLI and
dispatcher shared the same database/private root.

The original `000100` identity is retained and its executable syntax/schema/data
behavior repaired. `000200` supplies an idempotent forward reconciliation for an
already-applied ledger. Both call `WorkCompletedGateBackfill`, which delegates to
the current confirmed-Work gate adapter rather than inventing completion facts.
Condition/event history is not relabeled. Unsupported conditions and incompatible
epochs stay blocked with structured F05 log warnings. `000100` guards rollback
over canonical dependency/gate history; `000200` is forward-only and refuses
rollback before changing constraints or history. Earlier completion-fact support
is not removed. [README deployment route](../../README.md#dependency-gate-upgrade-repair-f05)
requires restored-copy rehearsal and explicit approval before any populated
developer/pilot migration; no such migration/deployment is authorized here.

### Actual runtime operations and persisted observations

Each scenario began with no users/Orders in its own database. A narrow fixture
authored two A1 service listings with explicit provider-advance and customer
final-signoff stages; fixture publication was a declared setup precondition, not
administrative-review qualification. Real `StageDealChain`,
`RespondToDealInvitation` and `ConfirmDealNeedAgreement` commands produced two
Needs, independent provider acceptances and separately customer-confirmed child
Orders. Staging and provider acceptance alone created no Orders.

| Path | Exact initial checkpoint and operation | Observed outcome |
|---|---|---|
| Fresh | Full `artisan migrate --no-interaction` from empty database, then authored canonical `work_completed` edge before confirmation | Both repaired migrations applied; current blocked gate materialized |
| Populated | Earlier migrations only; two confirmed child Orders, explicit pre-upgrade completion dependency, real customer sign-off and dispatched current source fact but no completion gate; then ordinary forward migrate | `000100` linked the existing real fact and clearance timestamp; `000200` rerun preserved it |
| Already applied | Separate populated fixture with real fact/no gate; synthetic historical ledger/schema checkpoint marking only `000100` applied; ordinary forward migrate | Only `000200` ran and materialized/cleared the exact current gate; no ledger deletion or historical relabel |
| Before release | Actual successor `complete_step` before predecessor completion, after provider proposal, and after customer sign-off but before dispatch | `PREDECESSOR_GATE_BLOCKED`; exact successor Work row unchanged |
| Release/retry | `WorkExecutionService` customer final sign-off, then `OutboxDispatcher::dispatch(eventType: 'work.completed')`, then successor `complete_step` | Dispatch published 1, failed 0, parked 0; one real source fact linked; successor became `in_progress`; repeat dispatch published 0; payment remained unsettled |
| Rollback | `artisan migrate:rollback --step=1 --no-interaction` on the populated applied-ledger fixture | Expected exit 1 with forward-only refusal; both migration rows, one fact, one cleared fact-linked gate and all gate constraints remained |

Runtime references (all synthetic, no credentials):

| Path/database suffix | Chain ID | Predecessor / successor Order reference | Verified source fact |
|---|---|---|---|
| `fresh_20261102` | `01a19cd5-c9a3-70a8-9085-37dcb9edaed2` | `ORD-00000001` / `ORD-00000002` | `01a19cd5-caa6-71fe-979e-65bbe6d8a8a1` |
| `upgrade_retry_20261102` | `01a19cd5-d849-7363-941d-1fe291855685` | `ORD-00000001` / `ORD-00000002` | `01a19cd5-d926-7371-8b11-0652d1f5ff33` |
| `applied_20261102` | `01a19cd7-111e-736a-a9d9-2d95d615677e` | `ORD-00000001` / `ORD-00000002` | `01a19cd7-121e-70ad-ae8e-e115c1bdf6b6` |

Actor/order UUIDs and source event IDs remain available in each disposable
database and its private `<database>.json` scenario record. Runtime output was
captured at 15:16–15:19 UTC on 2026-11-02. The initial
`serbizyu_f05_upgrade_20261102` attempt stopped at truthful unpriced-listing
validation before any Order existed; it was retained, not reset. The next
fixture supplied explicit seller package prices and completed in the new retry
namespace. Subsequent setup was transaction-protected. No business-scenario
seeder, normal account reset, reported unsupported-A2 execution, package install,
live migration or deployment was run.

The originally reported syntax failure is the failing-before evidence; it was
not rerun merely to reconfirm it. Repaired `000100`, `000200` and the backfill
pass Sail `php -l`. Scoped PHPStan level 6 passed all three production files
with no errors; only unrelated-baseline unmatched-ignore reporting was disabled
for the scoped invocation, with no new diagnostic suppression.

### Focused checks and review disposition

Final post-format invocation, at 15:26 UTC:

```bash
vendor/bin/sail exec -T -u root \
  -e APP_ENV=testing -e DB_DATABASE=serbizyu_f05_test_20261102 \
  -e APP_CONFIG_CACHE=/tmp/serbizyu-f05-config.php \
  -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-f05-20261102 \
  -e CACHE_STORE=array -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync \
  -e MAIL_MAILER=array app php artisan test --compact \
  tests/Feature/DealChaining/DependencyGateUpgradeTest.php \
  tests/Feature/DealChaining/SavedPartnershipStagingTest.php \
  tests/Unit/Architecture/ModuleDependencyTest.php \
  tests/Unit/Architecture/ActiveAuthPathArchitectureTest.php \
  tests/Feature/CanonicalMigrationManifestTest.php
```

Result: **37 passed / 280 assertions**. The ten new migration regression cases
cover completed-without-fact denial, current persisted-fact backfill, stale/replaced
binding, interruption/transaction retry, stable fact/gate/audit identities, original
historical aliases without relabeling, guarded rollback with/without a gate, and
retained earlier completion facts. Existing staging, module/auth architecture and
schema-manifest checks also passed. The warning for an incompatible confirmed
Order is an exercised fail-closed branch, not a failed migration.

The first integrated run had six passes and one test matcher failure:
Pest interpreted the `Throwable` interface argument as an expected message.
The assertion now checks the actual `KernelException` code/status and unchanged
successor Work. The populated-fact case was strengthened to dispatch the real
completion before migration; historical alias coverage now includes `completed`,
`source_ready`, `delivered_to_site` and an unknown value. Final results above
include those changes. No application guard was weakened.

Pint `--dirty --format agent` used a temporary finder restricted to the four
F05-owned PHP paths; explicit-path formatting covered the new/untracked files.
Only new-test import/chaining style changed. Scoped PHPStan level 6 then passed
the three production paths again. No frontend/UI code changed, so no UI build or
device qualification is claimed.

Independent read-only **Standards: PASS, no findings** and **Spec: PASS, no
findings** reviews covered the exact F05-owned code/tests and evidence, excluding
the preexisting worktree. Integration caught and corrected a non-UUID migration
correlation ID and an unsafe forward-down narrowing before final verification;
invalid Need epochs are reported/skipped rather than aborting unrelated repair.
The reviewers inspected the final behavioral assertions. All six #35 acceptance
criteria are satisfied by the focused tests plus actual isolated runtime paths.
Temporary runtime/static/formatter scaffolds were removed after proof; disposable
databases and private scenario records were retained without resets.

The complete backend suite was not run in this ticket. Per project convention,
request a full-suite run in an approved isolated testing environment. Live
migration approval, browser/physical-device cases and every other finish ticket
remain outside this F05 result; #34 and #9 are not closed.

## 9. F01 implementation evidence

Scope: [#36 / F01](https://github.com/daviddatuX25/Serbizyu-2.0/issues/36) only,
after #35 closed. Parent #34 and #36 were fetched with comments and native
blockers before execution. No overall replanning, broad scenario pack, normal
account reset, live migration/deployment, SDK installation or historical A2
execution occurred. Existing user WIP and accepted F05/history were preserved.

### Runtime and private access record

Read-only preflight found the existing healthy Sail-backed app/db/web/redis/mail
services, uncached configuration, normal database `serbizyu` and normal storage
`/var/www/html/storage`. No writes were directed to those targets.

New isolated databases: `serbizyu_pilot_qa_f01_20261102` for HTTP/CLI qualification
and `serbizyu_pilot_qa_test_f01_20261102` for transactional tests. Processes pinned
`APP_ENV` and `SERBIZYU_ENV` to local/testing respectively, explicit `DB_DATABASE`,
`APP_CONFIG_CACHE=/tmp/serbizyu-f01-config.php`, and
`LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f01-20261102`.
Local/private disks both resolved to that root's `app/private`. Payment and
notification providers stayed disabled, evidence local, evidence class
`TEAM_TRAINING`; cache/mail were array and queue synchronous. HTTP used
`variables_order=EGPCS`, file sessions and a distinct QA cookie. Tests used array
sessions. The isolated dispatcher used the same database/private root and
published 2 messages with 0 failed/parked. No media was uploaded or scanned;
production scanner/device qualification is not claimed.

`ControlledPilotQaSeeder` creates eight distinct synthetic actors and one named
direct-service proposal through existing listing/source-proposal services.
Merchant/courier have actors only; their business scenarios remain with owning
tickets. Fixture publication is an explicit setup precondition, not staff-review
proof. No Work/payment terminal state is seeded. A required privately supplied
`SERBIZYU_QA_PASSWORD` has no committed/default value.

Actor login details and scenario references are deliberately **not published
here or in GitHub**. The private mode-0600 manifest is
`<storage-root>/app/private/<database>.json`; the qualification password is in
that root's private `f01-access.json`. Preserve these local records and their
database together. The manifest reports password mismatches without resetting
credentials. Private runtime evidence and browser captures retain exact actor,
Order, proposal and accepted Work/obligation references.

### Real separate-session continuation and recovery

Evidence class: real Laravel/PostgreSQL HTTP and Chromium, synthetic actors and
fixture terms; not a physical service, native-phone qualification or pilot
activation. The recorded application runtime clock was 2026-11-02.

| Operation | Observed result |
|---|---|
| Guest protected Order/staff navigation | Canonical sign-in, preserving the intended task |
| Buyer sign-in | Returned to the exact proposal; no provider-acceptance control |
| Independent provider sign-in and actual acceptance | Returned to its exact Order; acceptance created one accepted terms snapshot, one Work and one separate obligation |
| Provider's actual intake submission | Governed customer-confirmation step became buyer-awaiting; no fabricated evidence or completion |
| Buyer continuation in a separate browser context | Returned to progressed Order with the customer-confirmation action available; no buyer confirmation was auto-performed |
| Separate maker/checker sign-in | Both reached canonical Staff Inbox through current admin/operate roles, without a parallel staff login |
| Staff navigation | Maker used Orders registry → Inspector; observed separate Agreement/Work/Payment rails and real attributed propose/finalize audit history |
| Ordinary, expired and suspended staff denial | Ordinary buyer `/admin`: 403; expired staff `/admin`: 403; suspended credentials showed account unavailable and remained guest |
| Merchant/courier sign-in | Each returned to its own listing workspace; unrelated private-Order navigation redirected to public Browse, without private Order content |
| Unchanged and progressed preparation reruns | Exact hashes/counts of 14 tracked tables unchanged; accepted terms, Work, obligation, credentials and expired-role clock retained |
| Current next responsibility after rerun | Initial acceptance named provider; actual pending customer step named buyer; no rewind to proposal or seeded completion |
| Concurrent preparation | Two actual CLI invocations completed, with no duplicate scenario or partial JSON; session advisory lock covers snapshot through atomic private export |

Tracked rerun snapshots included users, role assignments, listings/versions,
Orders/proposals/terms, Work, obligations/payment events, stock movements,
audits, outbox and idempotency provenance. The private manifest is re-exported
from durable provenance if lost. Interrupted setup, expired proposal clocks,
changed passwords, source/obligation conflicts and zero-write unsafe-target
refusals also have focused regression coverage.

An initial account-switching attempt reused one browser profile with an
in-flight notification request and encountered the already known plain-JSON
Inertia notification overlay. It was not suppressed or treated as a passing
login. Final staff/participant proof used independent real Chromium contexts.
Notification transport remains owned by #45. No session was manufactured or
impersonated to obtain the successful results.

### Repairs found by the actual path

1. A failing-before HTTP regression observed an external `return_to` redirect.
   `AuthReturnPath` now permits only safe local-rooted continuation, preserves
   valid queries, and rejects external/protocol-relative, backslash/control and
   authentication-loop targets across existing consumers. Staff admission and
   resource authorization remain canonical.
2. The real provider acceptance initially reached the amendment-only endpoint
   and correctly failed. The bounded Order-page dispatch fix distinguishes
   `proposal.kind === 'amendment'` from initial/counter agreement. Its regression
   failed before repair, then initial/amendment checks passed; the rebuilt actual
   page subsequently performed genuine acceptance. No server guard was relaxed.
3. Spec review found incorrect counteroffer responsibility, missing current
   source/accepted-reference checks and a stale concurrent-export race. All were
   fixed and reviewed: derive responder from current proposer, validate lifecycle
   references before writes, and serialize preparation through file publication.

The initial seeder integration also caught a storage-root mismatch, numeric
instead of keyed actor export, a missing constant and a malformed test identity.
They were corrected before the final evidence; no passing claim rests on those
failed attempts.

### Focused checks and review

Final backend command:

```bash
vendor/bin/sail exec -T -u root \
  -e APP_ENV=testing -e SERBIZYU_ENV=testing \
  -e DB_DATABASE=serbizyu_pilot_qa_test_f01_20261102 \
  -e APP_CONFIG_CACHE=/tmp/serbizyu-f01-config.php \
  -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f01-20261102 \
  -e CACHE_STORE=array -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync \
  -e MAIL_MAILER=array app php artisan test --compact \
  tests/Feature/ControlledPilotQaSeederTest.php \
  tests/Feature/IdentityAccess/Story1_2_SignInAndRecoveryTest.php \
  tests/Feature/IdentityAccess/AuthSessionGateTest.php \
  tests/Feature/IdentityAccess/UnifiedStaffAndActingForTest.php \
  tests/Unit/Architecture/ModuleDependencyTest.php \
  tests/Unit/Architecture/ActiveAuthPathArchitectureTest.php
```

Result: **52 passed / 192 assertions**, including 15 guarded-seeder cases.
Seeder tests require a dedicated `serbizyu_pilot_qa_test_*` target, retain DB
transactions and remove only their own temporary report.

The Sail Node-tools profile ran the existing Order-page suite: **24 passed**.
`npm run build` passed TypeScript and Vite; the existing large-chunk warning
remains. Scoped Pint passed/fixed only F01-owned PHP paths. New helper/seeder,
middleware and config PHPStan level 6 passed with no errors; seeder/helper PHP
syntax checks passed. The wider touched-controller analysis retains three
preexisting diagnostics (two unused return variants and one redundant nullable
offset), and scoped Order-page ESLint retains one preexisting
`set-state-in-effect` error in support-case synchronization. Those unrelated
lines were preserved; no lint/static suppression or all-checks-green claim.

Independent **Standards: PASS, no actionable findings**. **Spec: PASS after
resolution of the three findings above**; reviewers inspected the corrections,
initial/amendment regressions and final assertions. All five #36 acceptance
criteria are satisfied by the focused checks and actual isolated runtime.
The complete backend/frontend suites were not run; request a full-suite run in
an approved isolated environment. This result does not close #34, qualify
physical devices/media/payments, or implement any later finish child.

## 10. F02 implementation evidence

Scope: [#37 / F02](https://github.com/daviddatuX25/Serbizyu-2.0/issues/37) only,
after #36 closed. Parent/child comments and native blockers were fetched;
#37 was open with no comments and no open blocker. Existing user WIP, prior
accepted cuts and historical versions were preserved. No normal database
migration/reset, broad seeding, live deployment, SDK installation or historical
unsupported-A2 execution occurred.

### Environment and bounded correction

Read-only Sail preflight observed healthy app/db/web/redis/mail services and
uncached configuration. New application/test databases were
`serbizyu_pilot_qa_f02_20261103` and
`serbizyu_pilot_qa_test_f02_20261103`. All processes explicitly pinned
`APP_ENV`/`SERBIZYU_ENV` to local/testing, the selected database,
`APP_CONFIG_CACHE=/tmp/serbizyu-f02-config.php` and
`LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f02-20261103`.
Both local/private disks resolved to that root's `app/private`.
Payment/notification providers were disabled, evidence local and class
`TEAM_TRAINING`. HTTP used `variables_order=EGPCS`, file sessions and a distinct
QA cookie; tests used array cache/session/mail and synchronous queue.
No media/scanner or physical-device proof is claimed for this producer-data cut.

`DealChainCustomizerModal` now distinguishes non-topology edits from deliberate
ordering/add/remove operations. Non-topology edits retain exact canonical
node IDs/order/primary/tier and dependency IDs/endpoints. A selected condition
updates its existing inbound rules only. Role changes apply to canonical nodes,
clear incompatible preferred listings/display facts, and require an eligible
rebind or deliberate open assignment; incompatible source conditions remain
blocked until explicitly reconciled. Primary inspectors use canonical IDs.
Valid role aliases and canonical assignment defaults survive reopening.
Slots remain a projection, never a second authority.

The existing canvas dependency interface now renders only actual endpoint
connections, including empty/sparse/non-adjacent graphs; omitted dependencies
retain legacy layout. Unknown partner price is not rendered as zero and type
icons take canonical role precedence over generic words such as “Partner”.
`ListingRepository` publication checks active role-compatible preferred
bindings through the existing classifier. Buyer-choice/open-pool hints remain
non-binding and require explicit eligible selection when staged. No catalog
primary or product-projection redesign was included.

### Failing-before proof

The focused component regression observed a sparse four-edge graph rebuilt
as six all-to-all adjacent-tier edges with changed identities/endpoints after a
condition edit. The source role merge restored the old canonical type/binding.
The actual old owner modal also displayed an independent courier joining the
primary and replaced the saved primary ID with `node-primary-anchor`.
No bad runtime draft was saved as part of that observation.

A real server publication regression then observed that an incompatible
preferred listing did **not** throw the required `ListingError`. The guarded
publication path now rejects it transactionally; no partial publication or
staging survives invalid role/gate/cycle/duplicate-plan input. Initial test-only
selector and JSONB associative-key-order issues were corrected before treating
the regressions as product-failure evidence.

### Actual owner → reopen → publish → buyer stage

Evidence class: real Laravel/PostgreSQL HTTP and Chromium with synthetic actors.
The narrow fixture authored a private four-node listing graph, explicit package/
add-on prices and independently owned active partner listings. Partner
publication was a declared setup precondition; the primary listing's submission
and staff approval were exercised through real UI actions. Actor access,
scenario UUIDs and exact references remain in private mode-0600 files under
`<storage-root>/app/private/`, not public issue bodies.

| Operation | Observed and persisted result |
|---|---|
| Original graph | Node order `supply`, `host`, `independent`, `followup`; primary `host` at index 1; tiers `0,3,0,5`; only `supply → host` and `host → followup` |
| Owner condition edit → save v2 | Changed the primary's incoming `part_ready` to `work_completed`; exact node identity/order/tiers and unrelated edge preserved |
| Real editor reopen | Canonical host ID and both exact edges survived; independent courier had no incoming/outgoing wire or prerequisite |
| Deliberate supply store → courier edit | Old bound supplier/fee facts cleared; Apply disabled until owner selected and confirmed a real eligible courier listing |
| Role save v3 → reopen | `delivery` role and explicit courier binding retained; same graph/primary placement |
| Owner Submit for review → staff Approve | Primary became pending-review v4, then active/approved through a separate authenticated staff session |
| Separate buyer public listing choice → review | Both seller packages/add-on retained; exact four-node plan selected; independent node correctly showed no prerequisite |
| Actual Stage Coordinated Plan | One pinned published-version staging request; exact node order and two `work_completed` dependencies; four invitations and zero child Orders |
| Persisted attribution/history readback | Primary invitation owned by listing owner, changed source invitation targeted chosen courier; original-version hash and package/add-on values unchanged |

Screenshots were inspected before and after correction: original invented join,
corrected exact-edge customizer, consumer review and staged plan. Corrected
customizer and staged page had no document horizontal overflow at the exercised
desktop viewport. This is not physical-phone qualification or a redesign claim.
The private `f02-runtime-evidence.json` retains actors, listing/published-version/
chain/Need/invitation references and observed facts; `f02-graph-fixture.json`
retains the original version hash and graph. Synthetic access is in the local
private access record. No invitation was accepted or child payment settled.

### Focused checks and independent review

Final backend invocation:

```bash
vendor/bin/sail exec -T -u root \
  -e APP_ENV=testing -e SERBIZYU_ENV=testing \
  -e DB_DATABASE=serbizyu_pilot_qa_test_f02_20261103 \
  -e APP_CONFIG_CACHE=/tmp/serbizyu-f02-config.php \
  -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f02-20261103 \
  -e CACHE_STORE=array -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync \
  -e MAIL_MAILER=array app php artisan test --compact \
  tests/Feature/DealChaining/SavedPartnershipStagingTest.php \
  tests/Feature/Listings/ListingWorkShapeLifecycleTest.php \
  tests/Feature/Listings/ListingReviewLifecycleTest.php \
  tests/Unit/Architecture/ModuleDependencyTest.php \
  tests/Unit/Architecture/ActiveAuthPathArchitectureTest.php
```

Result: **43 passed / 273 assertions**. Saved partnership regressions include
real draft/update/read/reopen/publication/staging, compatible/incompatible
preferred bindings, buyer-choice overrides, invalid gates/cycles/duplicate plans
and preservation of original versions/packages/add-ons.

Sail Node-tools Vitest: **47 passed across four files**
(`DealChainStudio`, `dealChainRecipes`, `CreateService`, `ListingDetail`).
New cases cover sparse condition/primary/reopen, role and gate reconciliation,
rebind/reopen, stale cache/default assignment, valid aliases and deliberate saved
node deletion. TypeScript/Vite build passed; the existing large-chunk warning
remains. Scoped PHP syntax/Pint completed on the two owned backend paths.

The broad repository PHPStan check retains four preexisting findings outside
the publication guard. Scoped customizer ESLint retains three existing errors
and one hook-dependency warning (state initialization effect, `Date.now` in the
incumbent slot factory, unescaped apostrophe); Canvas/adapter/test had no reported
diagnostics. No suppressions, unrelated restyling fixes or all-static-green
claim. Full backend/frontend suites were not run; request full checks in an
approved isolated environment.

**Standards: PASS; Spec: PASS**, after resolving review findings: stale cached
assignment flags, canonical alias compatibility, preferred-versus-buyer-choice
publication scope, exact-edge rendering, deliberate saved-node deletion and
the selected-condition regression expectation. Reviewers inspected final source;
parent executed the reported checks and actual runtime. All five #37 acceptance
criteria are satisfied. Catalog-primary #38, product projection #39 and every
other finish/pilot qualification remain open. Temporary runtime/check scaffolds
are removed and QA sessions/listener stopped after proof; disposable data and
private evidence remain retained without resets.

## 11. F03 implementation evidence

Scope: [#38 / F03](https://github.com/daviddatuX25/Serbizyu-2.0/issues/38), selected
after the completed F02 boundary. The issue was open, had no comments and its
only native blocker #36 was closed. Parent comments were already fetched for
this continuing finish session. Existing WIP and accepted F05/F01/F02 history
were retained; no normal database/storage reset, live migration/deployment,
package install or unrelated catalog UI/authentication redesign occurred.

### Environment and primary/version contract

Read-only Sail/config preflight preceded writes. New disposable databases:
`serbizyu_pilot_qa_f03_20261103` and
`serbizyu_pilot_qa_test_f03_20261103`. Application/test processes explicitly
pinned app and Serbizyu local/testing environments, database,
`APP_CONFIG_CACHE=/tmp/serbizyu-f03-config.php` and
`LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f03-20261103`.
Local/private roots both resolved to that root's `app/private`; external
providers were disabled, evidence local/training. HTTP used EGPCS, file sessions
and a separate QA cookie; tests used array cache/session/mail and sync queue.
No media/scanner/physical-device or real-service proof is claimed.

The staff pipeline now preserves the server primary marker and offers one
mutually exclusive accessible primary control, unavailable in read-only mode.
Publication sends boolean `is_primary` for every node and the exact
`expected_catalog_version`; missing source versions/keys are not guessed.
Explicit empty edge sets remain empty and an unknown selected recipe does not
fall back to another recipe. Primary-only publication retains the source catalog
fee rather than recomputing it from incumbent editor estimates. New product
supply/courier starter blueprints declare their primary and compatible product/
A4 eligibility explicitly.

Server validation requires exactly one primary before inserting an executable
version. A transaction/recipe-scoped lock serializes source-version checks and
immutable append. Unknown/malformed recipe destinations, stale versions and new
code collisions fail without an appended version. Public projection and direct
catalog staging prefer explicit primary booleans (including false); canonical
legacy template sentinels remain readable only when the explicit marker is
absent. Existing listing draft rules and staff middleware remain unchanged.

### Failing-before and actual separate-identity proof

The red UI regression found no primary-selection control. Red HTTP cases
observed zero/multiple primary payloads accepted as 201 instead of 422, an
unknown republish creating a recipe instead of 404, and a creation collision
silently appending another version. Suspended staff denial already passed and
was retained. Corrected regressions pass after the fix.

The narrow runtime fixture supplied synthetic staff/owner accounts and a
published v1 starting recipe; that checkpoint is not claimed as a performed
staff publication. Actual actions then used separate Chromium contexts:

| Action | Observed outcome |
|---|---|
| Staff selects middle node explicitly and publishes v2 | One primary `middle_host`; request expected source v1, all other flags false |
| Full reload → republish v3 | Middle primary retained; request expected v2, immutable v3 appended |
| Real authenticated negative requests | Zero/multiple: 422 with `nodes` errors; stale: 422 with `expected_catalog_version`; unknown: 404; no extra version |
| Separate listing owner selects public recipe v3 and saves | Stored catalog version 3, primary `node-middle_host` at index 1, authored node order retained |
| Staff deliberately chooses a different primary for v4 | Latest catalog v4 explicitly uses `first_service`; no older row changed |
| Owner reopens saved listing after v4 exists | Still uses catalog v3 and middle primary, not the latest recipe |
| Persisted readback | Versions 1/2/3/4 have first/middle/middle/first primaries respectively; original v1 hash unchanged; catalog fee remains 0 in every version |

The actual reopened editor showed pinned v3 provenance and the middle “Your
Service” node; screenshots of that surface and the staff published catalog were
inspected. Exact actor, recipe/version/listing UUIDs and runtime observations
remain in mode-0600 private `f03-runtime-evidence.json` and
`f03-primary-fixture.json` under the isolated private root. Credentials remain
only in the private access record. Runtime timestamps use the application's
2026-11-02 clock. No child Order, Work completion or payment settlement is claimed.

The direct catalog staging regression additionally forms a real source listing
and consumes the newly published non-first primary through `StageDealChain`,
asserting the source-owned primary invitation, source title, preserved node
order and no premature Order. This catches the old staging consumer that read
only legacy sentinels and ignored explicit markers.

### Focused checks, review and remaining boundaries

Final post-format backend command:

```bash
vendor/bin/sail exec -T -u root \
  -e APP_ENV=testing -e SERBIZYU_ENV=testing \
  -e DB_DATABASE=serbizyu_pilot_qa_test_f03_20261103 \
  -e APP_CONFIG_CACHE=/tmp/serbizyu-f03-config.php \
  -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-f03-20261103 \
  -e CACHE_STORE=array -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync \
  -e MAIL_MAILER=array app php artisan test --compact \
  tests/Feature/Admin/DealChainCatalogTest.php \
  tests/Feature/DealChaining/SavedPartnershipStagingTest.php \
  tests/Feature/Listings/ListingWorkShapeLifecycleTest.php \
  tests/Unit/Architecture/ModuleDependencyTest.php \
  tests/Unit/Architecture/ActiveAuthPathArchitectureTest.php
```

Result: **55 passed / 327 assertions**. Sail Node-tools Vitest:
**42 passed across four files** (`DealChainPipelineBuilder`, `dealChainRecipes`,
`DealChainStudio`, `CreateService`). TypeScript/Vite build passed with the
existing large-chunk warning. All three production PHP syntax checks passed;
Pint was restricted to the four owned PHP files.

Scoped PHPStan reported no controller diagnostics and 24 existing diagnostics
in other Catalog/Stage sections, outside the changed primary branches. Scoped
ESLint retained seven incumbent errors and one hook warning in the catalog
page/pipeline (state effect, `Date.now`/`Math.random` factories and apostrophes);
the primary-control regression file had no reported diagnostic. None was
suppressed or treated as a complete static pass.

**Standards: PASS; Spec: PASS**, with final source and parent-reported runtime/
readback reviewed. All four #38 criteria are met for this catalog publication/
adoption cut. Incumbent mock admin metrics, absent staff-context presentation,
estimated-fee displays and unversioned legacy direct-catalog intake do not gain
broader readiness from this result. The controlled-pilot finish and #39 product
projection remain open. Full suites were not run; request them in an approved
isolated environment. Temporary fixture/check scaffolds are removed and the QA
listener/browser contexts stopped after proof; private evidence/disposable data
are retained without resets.

## 12. F04 implementation evidence

### Authority and scope

Delivered only the open finish ticket [F04 · #39](https://github.com/daviddatuX25/Serbizyu-2.0/issues/39) from [parent finish specification #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34). Prior tickets F05 (#35), F01 (#36), F02 (#37) and F03 (#38) remain accepted; no subsequent tickets (F11, F17, etc.) or broader pilot activation are claimed.

F04 delivers:
1. Product merchant ability to save, edit, and reopen legitimate partner roles (audit, recycle, hauling, labor, delivery) and the selected combination without conversion to labor/store or accidental reset to default pickup.
2. Deliberate base pickup selection clears active fulfillment while preserving the authored combination graph.
3. Server-derived variant prices, stock, authored direct extras, quantity, seller identity, and real review state without hardcoded candidates, prices, or ratings filling gaps.
4. Truthful candidate supply and recommendation eligibility: service offers do not inherit goods delivery recommendations, and new listings display no fabricated ratings or satisfaction percentages.
5. Accessible responsive modal interactions: focus inside, Tab key containment, trigger focus restoration on Escape/close, and 85vh mobile surface limit on the shared GlovoWaveModal primitive.

### Environment, database and actors

- **Runtime host:** `http://172.20.0.6:8099` via Sail container network with pre-allocated port and HTTPS/HTTP parity.
- **Isolated disposable database:** `serbizyu_pilot_qa_f04_20261103` (and test counterpart `serbizyu_pilot_qa_test_f04_20261103`). Populated production databases were neither migrated nor reset.
- **Disposable storage root:** `/tmp/serbizyu-controlled-pilot-qa-f04-20261103`.
- **Private fixture actors:**
  - Merchant / Owner: `pilot-merchant@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000103`)
  - Buyer: `pilot-buyer@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000101`)
  - Staff Maker: `pilot-maker@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000106`)
  - Staff Checker: `pilot-checker@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000107`)
  - Service Provider: `pilot-provider@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000102`)
  - Courier: `pilot-courier@tagudin.pilot.test` (`019b0000-0000-7100-8000-000000000104`)

### Behavioral verification and runtime smoke

1. **Product Authoring & Round-Trip:**
   - Merchant created and saved draft `01a19e45-c2e3-7170-9061-d6148d33bd1d` with 2 variants (Compact ₱125, Standard ₱175), direct seller extra `Synthetic protective wrap` (₱30), and Deal Chain combination `Product with audit and recovery` (Product, Audit ₱50, Recycle ₱25).
   - Reopening draft v4 in Standard and Guided modes preserved all 3 typed roles, node listing version pins, variants, and stock.
   - Deliberately switching to "Switch to Pickup Only" saved as v5 (`deal_chain_specification.selected_combo_id: 'pickup'`) while retaining the authored combination graph.
   - Explicitly re-selecting the combination restored active selection as v6.
2. **Staff Review & Approval:**
   - Merchant submitted listing v6 for review, becoming v7 pending review.
   - Staff Maker inspected record `LST-00000009` in Universal Workspace (`/admin/inspect`), verified authored variants, Deal Chain specification, and Work specification, and approved the listing.
   - Status transitioned to `product · active` with approved review status.
3. **Buyer Inspection & Truthful Rating State:**
   - Independent authenticated Buyer visited `/listings/01a19e45-c2e3-7170-9061-d6148d33bd1d`.
   - Rating row rendered truthful `New (0 reviews)` with zero filled stars and no fabricated 5.0 rating or satisfaction percentages.
   - Service-only listing `01a19e45-273a-738f-9996-558117408dfa` rendered no goods delivery recommendations or Deal Chain combinations.
4. **Customer Purchasing & Order Lifecycle:**
   - Clicking "Buy Product Now · ₱250.00" opened the accessible GlovoWaveModal displaying the 3 coordinated partner nodes with transparent pricing.
   - Buyer chose "Product only", selected variant `Compact` (₱125.00), selected seller add-on `Synthetic protective wrap` (+₱30.00), and incremented quantity to 2, yielding unit price ₱155.00 and calculated total ₱310.00.
   - Added to Citizen Picks drawer; confirming order created direct proposal `ORD-00000002` (`01a19e7a-99b4-7116-aaab-657270250346`) with scope amount ₱310.00.
   - Merchant accepted the proposal in real session, generating `order_terms_snapshots` with version 1, variant `compact`, quantity 2, and add-on `f04-gift-wrap`.

### Automated test results

- **Backend test suite:** 52 passed (464 assertions) across:
  - `tests/Feature/Admin/DealChainCatalogTest.php`
  - `tests/Feature/DealChaining/SavedPartnershipStagingTest.php`
  - `tests/Feature/Orders/T3OrderHttpTest.php`
  - `tests/Feature/DealChaining/DynamicSlotCandidatesTest.php`
  - Plus review suites: 64 passed (603 assertions) including `ListingReviewsAndTelemetryTest.php` and `DealChainReviewCeremonyTest.php`.
- **Frontend test suite:** 98 passed across 10 files (`CreateProduct.test.tsx`, `CreateService.test.tsx`, `ListingDetail.test.tsx`, `Picks.test.tsx`, `Browse.test.tsx`, `SlotListingPickerModal.test.tsx`, `DealChainCheckoutModal.test.tsx`, `DealChainStudio.test.tsx`, `dealChainRecipes.test.ts`, `booking.test.ts`).
- **Type check & Vite build:** Clean production build (`app-DwK7eYOq.js`, `app-C33Y2L9m.css`).
- **Code styling:** Laravel Pint formatted dirty ticket-owned files with zero style violations.

**Standards: PASS; Spec: PASS.** All five #39 acceptance criteria are satisfied in isolated verification. Pilot finish and subsequent tickets remain open.


## 13. English-first F07 continuation

- **Language:** Onboarding no longer replaces stored preferences when no choice is submitted, and `ilo` is not coerced to Filipino. Existing list and primary-key preference shapes are preserved. The current interface is English; Filipino/Taglish review and activation remain pilot gates. F06a is not complete.
- **Request payment:** New Requests accept cash or P2P; retired or explicit-null choices are rejected. Retired saved drafts require a new choice. New Quote awards preserve the chosen lane and source Work; unlisted-service eligibility reads accepted terms rather than mutable Request data.
- **Isolated smoke:** In `serbizyu_pilot_qa_f06a_20261113`, a synthetic buyer published a P2P service Request, a synthetic provider submitted an unlisted ₱420 Quote, and the buyer accepted it. For `ORD-00000013`, provider and buyer completed the A1 intake, a synthetic PNG was uploaded and processed through the local scanner, Work was signed off, and the recipient acknowledged a synthetic P2P proof. The observed persisted state was completed Work and settled P2P obligation for 42000 minor units. This is a synthetic browser exercise, not real payment or device qualification.
- **Environment correction:** The initial HTTP listener did not propagate the isolated storage root to its child PHP server; its image scan failed. A direct PHP listener with `variables_order=EGPCS` and matching isolated private storage successfully processed the replacement. A session refresh was needed before upload/signoff/payment actions; the separate notification/account-switch transport issue remains open as F08d.
- **Checks:** The final Request/Quote feature file passed 17 tests / 307 assertions, including accepted-snapshot eligibility. Language preservation passed 4 tests / 21 assertions. Request creation/detail and sign-in frontend tests passed 26 tests; typecheck and Vite build passed. A broader focused backend attempt had fixture setup failures in cash/P2P suites and one Tender privacy category mismatch in this new database; these are not passes. Cash end-to-end, rejected/replaced P2P proof, mismatch handling, and full pilot qualification remain unverified in this run. Keep #41 open.

## 14. English-first core journey qualification

- **Runtime:** Retained disposable `serbizyu_pilot_qa_f06a_20261113` database with `/tmp/serbizyu-controlled-pilot-qa-f07-20261113` private storage. HTTP and outbox scanner used the same paths. Separate synthetic buyer/provider sign-ins were used; no normal database reset or live payment.
- **Cash browser journey:** A buyer published a cash Request; a provider submitted an unlisted ₱350 Quote; the buyer accepted it, creating `ORD-00000035`. Both participants completed intake, the provider uploaded a synthetic PNG that passed the real local scan, and the buyer reviewed submitted evidence in a distinct sheet before explicitly signing off. Payment remained due until the buyer reported cash and the provider independently confirmed receipt. Persisted result: completed Order/Work and one settled `external_cash` obligation of 35000 minor units.
- **P2P:** The earlier separate-party browser journey in §13 reached recipient acknowledgement. In this run the P2P automated lifecycle covered clean private proof, rejection, replacement, amount mismatch and obligation-only hold; this does not substitute for a physical-device or live-money exercise.
- **Session continuity:** An unauthenticated JSON background request now returns 401 without replacing the intended sign-in destination. The stale CSRF meta token was removed and manual requests use the current XSRF cookie. During the cash journey, account switches returned to the intended Order and Work upload/sign-off succeeded without a page refresh. A real provider notification was marked read and opened its Order; read status was observed in the disposable database.
- **Responsive behavior:** At 375 px the Request quote dock was found behind global navigation and moved above it; browser interaction then opened the real Quote composer. The final Work review sheet showed the previous evidence and explicit confirmation at 375 px. The Order was also inspected at 1440 px. A further 320 px toolbar overlap was corrected; no physical Android/iOS device was exercised.
- **Image provenance:** Request detail labels a category fallback as a category image rather than a participant's photo; an unavailable participant photo is not replaced with an unrelated image.
- **Focused checks:** 59 backend tests / 682 assertions passed across Request/Quote, Tender privacy, cash, P2P, auth, notifications and module guards. 98 frontend tests passed across 13 files. Typecheck and Vite build passed; the existing large-chunk warning remains. Test setup now provides required synthetic payment and category fixtures; an unknown Request category is rejected rather than silently substituted.
- **Remaining gates:** F06a localization is deferred, not completed; reviewed Filipino/Taglish and English remain required for the pilot. Real-device, live-transaction and full operations qualification remain open. A test total or desktop browser emulation is not pilot activation evidence.

## 15. English-first Work tools continuation

- **Scope:** The first F13a slice separates permitted optional tools from required evidence in new A1/A3 schema-3 Work definitions. Legacy schema-1/2 accepted steps retain required-only behavior. Required checklists and measurements remain enforced; existing agreed measurement terms are not removed. Tools do not approve Work or settle payment.
- **Observed synthetic browser path:** On isolated Sail database `serbizyu_pilot_qa_worktools_20261112` and private root `/tmp/serbizyu-controlled-pilot-qa-worktools-20261112`, a buyer created an A1 Request with a required checklist and optional coordinates through the HTTP API. A different provider quoted, the buyer accepted, and the provider used the Order UI for `ORD-00000002`: the required checklist initially blocked submission; after completing it and entering manual coordinates and a landmark, the step advanced. The provider proposed final sign-off. The buyer's separate session displayed the submitted checklist and provider-entered location; payment remained not due. No live payment occurred.
- **Responsive evidence:** The Work controls were inspected in Chromium at 375 px and the participant review at 1440 px; neither had horizontal document overflow. Manual coordinates are not a map-pin interface, and browser emulation is not physical-device or GPS qualification.
- **Checks:** After formatting, the focused Work/catalog/Request backend selection passed 61 tests / 624 assertions. A broader Order/A3/A4/A9/Request selection passed 70 tests / 1,218 assertions; one expected A4 idempotency error was logged during that passing run. Work tool/photo frontend tests passed 7 tests; service editor tests passed 8; Request editor tests passed 7; Quote composer tests passed 8. No complete suite or physical-device qualification was run.
- **Frontend build:** TypeScript and Vite production build passed; Vite reports the existing large-chunk warning. The frontend detector reported an existing gray-on-color warning in the Work editor. Synthetic QA database/storage are retained; temporary HTTP listeners were stopped.
- **Still open:** F13a/#50 is not closed: A3 schema-3 authoring/review, complete legacy video/document promise handling and full source-to-review qualification still need proof. F08c/#44 upload retry/rejected-slot recovery, F13b/#51 visible timestamp photos, F14/#52 map pin, F15/#53 voice and F16/#54 video remain unfinished. Do not present those as working. Reviewed Filipino/Taglish and English remain a Tagudin pilot gate; localization is deferred, not waived.

## 16. Image, seller, staff and buyer QA

- **Environment:** Isolated Sail database `serbizyu_pilot_qa_catalog_20261112` and private root `/tmp/serbizyu-controlled-pilot-qa-catalog-20261112`; synthetic role accounts and 13 catalog examples. No normal database or real payment was used. Examples are labeled as samples; unmatched photos use category icons. The bibingka example uses the CC0 photo by Tomwsulcer, https://commons.wikimedia.org/wiki/File:Philippine_Dessert_Bibingka.jpg. Rights and local provenance of the pre-existing repository photos are not established.
- **Reproduced and repaired:** An uploaded gallery photo survived draft save and staff approval but was unreachable on public listing detail; mobile marketplace cards ignored the seller cover entirely. A buyer can now select gallery images, mobile and desktop use the seller cover, and absent or broken images do not become unrelated listing photos. A first uploaded photo replaces the automatic category cover. A malformed image displays a preparation error instead of persisting a transient browser URL.
- **Price and Work repair:** Fixed-rate listing authoring was submitting an empty ₱0 package that overrode an entered ₱250 rate. Future fixed-price drafts no longer submit that package; existing offers and Orders were not rewritten. A catalog Work-set mapper was dropping required measurement definitions, causing a provider's acceptance to fail. The mapper retains those definitions, and incomplete schema-2/3 Work drafts are rejected before review. The previously formed broken synthetic proposal remains unchanged.
- **Observed browser journey:** On `ORD-00000003`, the provider created a ₱250 service with an actual JPEG, staff approved it, and the buyer booked it. The provider accepted, submitted intake, the buyer confirmed intake, and the provider uploaded the JPEG as private Work evidence. The local outbox scanner was manually dispatched and returned clean; the buyer opened the actual evidence and reviewed the submitted measurement before signing off. Cash was separately reported by the buyer and acknowledged by the provider. The database showed completed Order/Work and one settled external-cash obligation for 25000 minor units. An unrelated merchant received 404 fetching the evidence. This is synthetic data, not a real-world payment or a physical camera test.
- **Checks:** Focused backend tests passed 81 tests / 796 assertions; frontend tests passed 96 across seven files. TypeScript/Vite build passed with the existing large-chunk warning; the product builder test emitted an existing React missing-key warning. Mobile 375 px and desktop 1440 px browser inspection was performed; no physical phones were used.
- **Remaining findings:** The service price-range option showed ₱0 in the preview after entering ₱350–₱700; its commercial semantics were not altered. Owner-preview category benchmarks are hardcoded projections, not measured listing activity. Listing photos are encoded into versioned JSON rather than a bounded server-side media upload; uploaded listing video still uses a browser-local blob URL. The Work photo has no visible timestamp, and safe upload retry/replacement, a map pin, voice and video remain unfinished. Outbox operation, device/language qualification and the controlled-pilot activation gates remain open.

## 17. Synthetic commerce presentation pass

- **Default-database incident:** After the isolated work in §16, an incorrectly forwarded Sail environment caused two Work dependency migrations to run on the configured `serbizyu` database as batch 27. The resulting constraint includes `work_completed`; read-only inspection found no active dependencies of that kind and no gate rows for the repair to backfill. Do not migrate, reset, reseed or roll back that database to undo the incident. Compare it against a trusted backup before deciding on recovery.
- **Fixture write incident:** A separate QA server also briefly reached the default database. A `GET /` invoked `DemoFixtureService::ensure()`, which upserts demo users, profiles, roles, a category, verification, a listing and listing-version-1 terms and publication time. Read-only inspection found two proposed Orders referencing that version and no accepted terms snapshots referencing it. Previous values cannot be reconstructed without a backup. The no-normal-database statement in §16 describes that earlier pass only, not these later incidents.
- **Service and reviews:** In the isolated catalog database, `ORD-00000003` reached completed Work and separately acknowledged synthetic cash. An adversarial buyer review was followed by non-numeric provider feedback. Public output originally included private provider text and counted it as a zero-star review; the listing projection now excludes provider feedback and revealed review edits are rejected. A guest browser showed one buyer review, its actual 1.0 rating and no provider note. This intentionally adverse test rating is synthetic.
- **Product:** In isolated database `serbizyu_pilot_qa_productjourney_20261113`, a seller authored and approved a ₱50 item with five units; a buyer proposed two, the seller accepted, and the buyer accepted custody and then recorded receipt. On-hand/held/committed/available progressed 5/0/0/5 → 5/2/0/3 → 5/0/2/3 → 3/0/0/3 at custody, remaining 3/0/0/3 at receipt. The buyer then reported synthetic cash and the merchant acknowledged it; the single fulfillment movement and three on-hand units remained unchanged. The evidence used was a synthetic screenshot, not proof of physical goods or real money.
- **Presentation state:** A fresh buyer proposal `ORD-00000003` for one unit of that product is pending merchant response. Physical/held/committed/available is 3/1/0/2. The buyer's mobile Order queue showed “Waiting on provider”; the merchant's showed “Respond to order proposal.” The completed product Order `ORD-00000002` has a buyer 4-star review and non-numeric merchant feedback: the buyer review remained sealed until the merchant submitted, then the public listing showed 4.0 from one buyer review without the private merchant text. Reopening submitted merchant feedback displayed its recorded state with no resubmit control.
- **Mobile checks:** At 375 px, the merchant's Stock ledger rendered over non-secure HTTP without `crypto.randomUUID`, and the listing's review control was not covered by the bottom dock. This is emulated Chromium, not physical-device qualification.
- **Review-photo limit:** The composer no longer fabricates or offers a photo attachment. API-supplied review evidence association and the public review-photo delivery path have not been qualified; do not demonstrate review-photo publication.
- **Review sequence:** The current application permits a review only after the payment obligation is settled. That differs from a requested review-before-cash sequence and must not be represented as implemented.
- **Limits:** The A3 seeded sample could not pass its presence gate because its fixture lacked required Work evidence; it is not evidence that a real A3 path passed or failed. Cancellation, physical devices, real camera capture, live payment, reviewed Filipino/Taglish and English, timestamped photos, map pin, voice and video remain unqualified. This is a synthetic presentation, not Tagudin pilot approval.
