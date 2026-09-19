# Current Reality Review

**Target:** `../ARCHITECTURE-SPINE.md`
**Review date:** 2026-09-08
**Scope:** repository and package-manifest verification of the feature spine's frontend stack, paths, existing-code statements, and fit with the current Laravel/Inertia application.
**Verdict:** REVISE — the named runtime versions and production source root are repository-backed, but several rules currently describe planned projection/scenario infrastructure as if it already exists, and one source-tree statement is factually false.

## Executive result

The spine correctly ratifies the live application at `resources/js/app.tsx`: the root `vite.config.ts` feeds `resources/js/app.tsx` to `laravel-vite-plugin`, that entry calls `createInertiaApp`, Laravel controllers render `resources/js/Pages/**/*.tsx`, and the root `tsconfig.json` includes `resources/js`. The root manifests/lockfiles substantiate PHP 8.4, Laravel 12.68.0, Inertia Laravel 3.2.1, Inertia React 3.6.1, React/React DOM 19.2.8, TypeScript 5.9.3, Vite 7.3.6, Tailwind CSS 4.3.3, Vitest 4.1.10, and Playwright 1.62.1.

The repository also contains a separate `frontend/src` React application. Existing repository documentation identifies it as a retained mock/prototype surface rather than the Laravel/Inertia authority. The spine's intent is correct, but it must not describe that tree as absent, and it must distinguish target directories/routes from code that exists today.

## Verification matrix

| Spine claim | Repository evidence | Assessment |
| --- | --- | --- |
| Production root is `resources/js` and Inertia React is retained (AD-1; Consistency Conventions) | `vite.config.ts` inputs `resources/js/app.tsx`; `resources/js/app.tsx` imports `createInertiaApp`; `routes/web.php` and controllers render `Home`, `Browse`, `ListingDetail`, `MyListings`, and `Orders/Show`; `tsconfig.json` includes `resources/js` | **Grounded** |
| React 19 / React DOM 19.2.8 | Root `package.json` pins both to `19.2.8`; root `package-lock.json` resolves both to `19.2.8` | **Grounded** |
| TypeScript 5.9.3 | Root `package.json` pins `5.9.3`; root lockfile resolves `5.9.3`; root `tsconfig.json` is active | **Grounded** |
| Inertia React 3.6.1 | Root `package.json` pins `@inertiajs/react` to `3.6.1`; root lockfile resolves `3.6.1`; `resources/js/app.tsx` and pages import it | **Grounded** |
| Inertia Laravel 3.2.1 | `composer.json` requires `inertiajs/inertia-laravel: ^3.0`; `composer.lock` resolves `v3.2.1` | **Grounded** |
| Laravel Framework 12.68.0 / PHP 8.4 | `composer.json` requires `laravel/framework: ^12.0` and `php: ^8.4`; `composer.lock` resolves framework `v12.68.0` | **Grounded** |
| Vite 7.3.6 / Tailwind CSS 4.3.3 | Root `package.json` pins Vite `7.3.6` and requires Tailwind `^4.3.3`; root lockfile resolves both to those versions; root `vite.config.ts` uses the Tailwind Vite plugin and `resources/css/app.css` imports Tailwind | **Grounded** |
| Vitest 4.1.10 / Playwright 1.62.1 | Root scripts/configs use Vitest and Playwright; root manifest ranges `^4.1.10` / `^1.62.1`; lockfile resolves `4.1.10` / `1.62.1` | **Grounded** |
| Prototype references are `docs/design-kit/browse-mobile.html` and `public/browse-mobile.html` (AD-2) | Both files exist | **Grounded** |
| “no parallel `frontend/src` tree” (Consistency Conventions) | `frontend/src/` exists with its own React/Vite app, router, fixtures, API mock, and `ScenarioLabPage.tsx`; `frontend/package.json` uses React, Vite, Tailwind 3, React Query, and a standalone router | **Unsupported as written**; the tree exists, but it is not the production authority |
| `resources/js/application`, `resources/js/scenario`, and `resources/js/features/*` structural seed | `glob` finds no such directories under `resources/js`; current root contains `Pages`, `components`, `marketplace`, `browse`, `listings`, and `lib` | **Planned target, not current code**; the heading must make this explicit |
| `/review/scenarios` is the Scenario Lab composition route (AD-7) | `routes/web.php` has no `/review/scenarios` route; no root `resources/js` Scenario Lab page/composition exists; the only `ScenarioLabPage` is under standalone `frontend/src` | **Unsupported as a current path**; a future route/page must be created or the rule must say planned |
| Both adapters already return versioned projection envelopes and boundaries normalize aliases (AD-10) | No `application/adapters`, scenario projector, or projection-envelope types exist under `resources/js`; current pages receive `HomeProps`/`ListingRecord`; `resources/js/types.ts` still declares both camelCase and snake_case fields | **Planned target, not current behavior** |
| Components never read/write browser storage for scenario state (AD-8) | `resources/js/components/browse/BrowsePlp.tsx` and `ListingDetailView.tsx` read/write `localStorage` for pins; `resources/js/Pages/Auth/SignIn.tsx` stores the last phone in `localStorage` | **Current mismatch unless explicitly scoped to future Scenario Lab state** |

## Findings requiring correction

### HIGH — State that `frontend/src` is retained prototype material, not a nonexistent tree

**Exact location:** Consistency Conventions, `Source root` row (line 171).

The row says `Existing resources/js; no parallel frontend/src tree`, but the repository has a complete `frontend/src` application. `frontend/README.md` and `docs/architecture/frontend-inertia-react-ssr-foundation.md` identify that application as a separate mock/prototype surface, while the root Vite/TypeScript/Inertia wiring proves `resources/js` is the live production source. Replace the claim with: “Production source root: existing `resources/js`; `frontend/` remains a separate retained mock/prototype and is not a production authority or dependency.” This preserves the intended cutover without asking implementers to pretend the repository tree does not exist.

### HIGH — Mark the Scenario Lab route and adapter as planned, or add the missing root composition

**Exact locations:** AD-7 Rule (line 129), AD-10 Rule (line 147), and Capability → Architecture Map rows 256–257.

The spine presents `/review/scenarios`, a Scenario Lab composition, a Laravel production adapter, a deterministic scenario adapter, and versioned projection envelopes as if they are available boundaries. Repository routing has no `/review/scenarios` entry; root `resources/js` has no Scenario Lab, `application/adapters`, `scenario`, or projection-envelope implementation. The only `ScenarioLabPage` is in the separate `frontend/src` app. Either mark these as future implementation targets and specify the required Laravel route/controller/Inertia page, or add those root-side artifacts before treating the rule as current. Do not use the standalone `frontend/src` page as evidence that the Laravel/Inertia route exists.

### MEDIUM — Reconcile AD-10's alias-normalization claim with the current prop contract

**Exact location:** AD-10 Rule (line 147).

The rule says existing camel/snake compatibility fields are migrated at adapter boundaries and new components consume one canonical camelCase contract. The current root contract still accepts both forms throughout `resources/js/types.ts` (`categoryCode/category_code`, `listingType/listing_type`, `ownerName/owner_name`, and others), and the existing components read those compatibility fields directly. Change the rule to a migration target (for example, “new adapters will normalize; current connected slices remain compatibility-bound until migrated”) and name the cutover deliverable: an adapter normalization layer plus a narrowed `types.ts` contract.

### MEDIUM — Scope AD-8's storage prohibition to Scenario Lab state or migrate existing browser-only state

**Exact location:** AD-8 Rule (line 135).

The current production UI uses browser storage for non-scenario interaction state: `BrowsePlp.tsx` and `ListingDetailView.tsx` persist shortlist pins, and `SignIn.tsx` persists the last phone. The broad sentence “Components never ... read/write browser storage” therefore does not describe repository reality. Either scope it explicitly to normalized Scenario Lab state and say these existing conveniences are outside that state model, or define and complete a migration to an adapter-backed storage boundary before declaring the rule adopted.

## Corrections that are not defects

- The stack table is accurate against the root manifests and lockfiles. It intentionally omits the standalone `frontend/` package versions; that is appropriate once the production-authority boundary is explicit.
- `docs/design-kit/browse-mobile.html` and `public/browse-mobile.html` are real reference files, so AD-2's paths are valid.
- The `resources/js/application`, `resources/js/scenario`, and `resources/js/features` tree is a coherent future structural seed, but it should be labeled “target layout” or “to be introduced” rather than read as an existing-code claim.
- The production source-root decision is architecturally fit with the parent spine and existing Laravel/Inertia docs; the needed revision is precision about the retained standalone prototype and the not-yet-built projection/scenario seams.
