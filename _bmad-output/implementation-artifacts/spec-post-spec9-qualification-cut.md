---
title: 'Post-Spec 9 Qualification and Order Workspace Cut'
type: 'feature'
created: '2026-10-28'
status: 'draft'
review_loop_iteration: 0
context:
  - '{project-root}/docs/planning-hardening/36-post-spec-9-qualification-and-order-workspace-cut.md'
  - '{project-root}/.ai/rules/agent-delegation.md'
  - '{project-root}/.ai/rules/payments.md'
  - '{project-root}/.ai/rules/admin.md'
  - '{project-root}/.ai/rules/ui-kit.md'
---

**Scope notice — superseded draft:** this unapproved implementation draft predates the current scope decisions. Do not execute it unchanged. Use `docs/planning-hardening/37-commerce-finish-map-and-quick-deal-scope.md` for the current finish scope: human-Agent management deferred; online/offline Quick Deal, assisted shared-device/kiosk access, and a bounded location Work Tool included. The frozen block below remains historical draft intent, not current approval.

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The implemented marketplace contains connected domain behavior, but source review and manual access surfaced request/payment mismatches, non-continuable scenarios, staff-entry friction, and Order pages that do not consistently explain the next authorized action. Existing seeded rows and green tests do not establish end-to-end user journeys.

**Approach:** Execute the bounded work cut in the linked plan. Preserve existing identities, accepted terms, obligations, evidence, and progress; introduce a minimal Laravel-native staff Gate and Listing resource Policy; make scenario data realistic, deterministic, safe, and continuable; improve truthful staff/Order interaction; record actual qualification evidence.

## Boundaries & Constraints

**Always:** Existing actor/principal attribution, exact resource/action consent, capability attenuation, transaction-time checks, grant-before-Listing lock order, independent Agreement/Work/Payment/Stock/Evidence/Case truths, and immutable accepted history remain authoritative. Preserve the mobile Order shell, Glovo sheets, and one contextual action dock. Use synthetic CAPSTONE/SANDBOX/TEAM_TRAINING fixtures only in explicitly enabled disposable environments. Mark every untested journey NOT RUN.

**Ask First:** Any ambiguous account/phone or public-reference ownership; any proposed rekey, historical data repair, credential/status reset, schema migration, expansion into owner-facing consent management, payment provider, or activation outside the approved test plane.

**Never:** Reset the developer database, delete/rekey users or obligations, rewrite historical foreign keys, map escrow to P2P, SQL-fake scan/settlement/approval/custody/Work completion, weaken transaction-time authorization, add a permission package or broad rewrite, claim fixture contents are browser proof, or revive GIS/Quick Deal.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Legacy fixture conflict | UUID and phone resolve to different/unknown owners | Explicit conflict; zero database/storage writes | Preserve source records; require provenance review |
| Repeated scenario preparation | Unchanged baseline or progressed run | Idempotent setup; preserve progress; report checkpoint | Never rewind; report conflict/expiry |
| Delegated Listing update | Exact active grant; then revoked/stale/wrong target | Authorized exact update succeeds; other cases have no mutation | Preserve existing error envelopes and lock order |
| Order action | Active, waiting, blocked, stale, or completed state | Server-derived next responsibility; commands recheck current authority | Explain prerequisite; reject stale/revoked actions |
| Request draft | Canonical lane or retired bilateral_escrow | Canonical lanes accepted; old draft requires explicit reselection | Field error/no request write; preserve safe draft content |

</frozen-after-approval>

## Code Map

- `docs/planning-hardening/36-post-spec-9-qualification-and-order-workspace-cut.md` — complete C-00…C-12 sequence, acceptance criteria, and J01…J10 qualification cases.
- `app/Shared/Infrastructure/Demo/*`, `database/seeders/*` — identity resolution and scenario orchestration.
- `app/Modules/IdentityAccess/*`, `app/Modules/Listings/*`, `app/Shared/Contracts/*` — staff Gate and Listing Policy seam.
- `app/Modules/PaymentObligations/*`, `app/Modules/OrdersWork/*`, `app/Http/Controllers/RequestController.php` — truthful request, payment, and Work contracts.
- `resources/js/Pages/Orders/Show.tsx`, `resources/js/Pages/Admin/*`, `resources/js/Pages/Requests/*` — staff and Order user experience.
- `tests/Feature/*`, `resources/js/**/*.test.tsx`, `e2e/*` — regression and qualification evidence.

## Tasks & Acceptance

**Execution:**
- [ ] `app/Providers/AppServiceProvider.php`, `EnsureAuthenticated.php`, `routes/web.php` — C-01 named Staff Gate and consistent staff admission.
- [ ] `app/Modules/Listings/Infrastructure/ListingRepository.php`, new Listings `ListingPolicy`, relevant Gate registration — C-01b one resource PEP; grant lock precedes Listing lock; HTTP and direct callers share checks.
- [ ] `app/Shared/Infrastructure/Demo/*`, all scenario seed consumers — C-02 one provenance-checked resolved identity map; ambiguous collisions write nothing.
- [ ] `database/seeders/PaymentObligationScenarioSeeder.php`, payment/read adapters — C-03 preserve current primary obligation identity/progress and reconcile dependent references.
- [ ] Payment scenario and scanner path — C-04 create proof through real submission/scan/recipient APIs; verify actual sent amount; never fake clean/settled.
- [ ] `database/seeders/WorkExecutionScenariosSeeder.php` and Work services — C-05 valid provider-owned A1 runtime and real continuation.
- [ ] Request controller, CreateRequest and pending draft adapter — C-06 canonical external_cash/P2P contract; explicit retired-draft recovery.
- [ ] New scenario manifest/coordinator/command, existing seed graph — C-02c finite synthetic resumable checkpoints for J01–J10 with clock, environment and no-reset safeguards.
- [ ] Auth/session/navigation/Forbidden surfaces — C-07 reuse existing login services, safe staff return target, server-projected entitlement, branded 403.
- [ ] Order controller/module projections — C-08 named responsibility and advisory actions; mutation paths reauthorize.
- [ ] `resources/js/Pages/Orders/Show.tsx` and existing panels — C-09 preserve mobile shell/dock; task-first desktop density and progressive disclosure.
- [ ] `TaxonomyStudio.tsx` — C-10 remove fake version mutation; honest disabled backend-pending state.
- [ ] Inspector readers and Order references — C-11 link only canonical resolvable references.
- [ ] New qualification register and focused browser tests — C-12 record actual positive, negative, retry, refresh/relogin, and recovery outcomes.

**Acceptance Criteria:**
- Given an ambiguous fixture identity or reference, when preparation preflights, then it reports a conflict and commits no DB/file writes.
- Given a valid owner or exact active Listing grant, when draft update runs through HTTP or direct application path, then the same Policy decision applies under preserved grant-before-Listing lock ordering; revoked/wrong-scope requests leave no mutation.
- Given a valid request, Work, payment, stock, or staff checkpoint, when its named actor performs the next supported action, then the counterparty sees the persisted correct state after refresh/relogin; retries do not duplicate effects.
- Given the Order state and authenticated actor, when the Order page loads, then it names the next responsible party/action or explains the wait; unauthorized commands remain denied server-side.
- Given all journeys, only exercised evidence is PASS; unresolved consent UI, provenance conflicts, and unavailable environments remain BLOCKED/NOT RUN.
- Final quality and browser gates are run only after implementation; no production/genuine/pilot readiness is inferred from disposable fixtures.

## Verification

**Commands:**
- Focused Pest files specified by each C-item in the linked cut plan — expected: affected behavior and negative/no-side-effect cases pass.
- `vendor/bin/sail composer run quality:backend` — expected: Pest, PHPStan, Pint check pass.
- `vendor/bin/sail npm run quality` and `vendor/bin/sail npm run build` — expected: typecheck, lint, format, Vitest, and production build pass.
- `PLAYWRIGHT_BASE_URL=<explicit safe environment> vendor/bin/sail npm run e2e:smoke -- <named specs> --workers=1` — expected: recorded browser results at desktop and 360/375px projects; unavailable cases remain NOT RUN.

**Manual checks (if no CLI):** Use the C-00 qualification register in isolated disposable data, actual separate actor sessions, real UI commands, refresh/relogin, retries, and named recovery branches. Do not treat seed status or test setup as a passed journey.
