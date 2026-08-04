# Serbizyu Frontend Foundation: Inertia, React, TypeScript, Vite, and SSR

Status: researched and recorded; implementation of SSR is intentionally deferred.

Date: 2026-08-02

This document defines the frontend architecture for the Laravel/Inertia application in the repository root. It complements Laravel Boost and does not replace it.

## Authority and boundaries

Use the authorities in this order:

1. Current official Laravel, Inertia.js, React, Vite, TypeScript, and Playwright documentation.
2. This project document for Serbizyu-specific decisions and constraints.
3. The reusable `quality-toolchain-laravel-react` skill for generic workflow reminders.
4. Laravel Boost for Laravel/PHP code generation, framework conventions, and backend inspection.

When this document conflicts with an official version-specific API, update this document/skill rather than inventing a compatibility layer.

Laravel Boost remains authoritative for:

- Laravel routes, controllers, middleware, validation, policies, actions, jobs, database code, and service providers;
- application configuration and environment conventions;
- Laravel tests and backend quality tools;
- Laravel/Inertia server-side contracts.

This frontend stack guidance is authoritative for:

- React page/component structure;
- Inertia page props, visits, forms, partial reloads, and SSR boundaries;
- TypeScript/Vite configuration;
- client/server rendering safety;
- browser-visible acceptance evidence;
- frontend build and browser-test gates.

## Current repository baseline

The canonical Laravel/Inertia frontend is the root application:

```text
resources/js/app.tsx
resources/js/Pages/**/*.tsx
resources/js/types.ts
resources/views/app.blade.php
vite.config.ts
playwright.config.ts
vitest.config.ts
```

The current package baseline is:

| Package | Current version | Role |
|---|---:|---|
| `laravel/framework` | `^12.0` | server framework |
| `inertiajs/inertia-laravel` | `^3.0` | Laravel adapter |
| `@inertiajs/react` | `3.6.1` | React adapter |
| `react` / `react-dom` | `19.2.8` | UI/runtime |
| `vite` | `7.3.6` | development/build tool |
| `@vitejs/plugin-react` | `5.1.1` | React transform/HMR |
| `typescript` | `5.9.3` | type checking |
| `@playwright/test` | `^1.62.1` | browser acceptance |
| `vitest` | `^4.1.10` | component/unit tests |

There is also a separate `frontend/` React application using React Query and a standalone router. It is retained as a separate mock/prototype surface and is not the authority for the Laravel/Inertia application. Do not silently merge its state model, routing, or API assumptions into `resources/js`.

## Core architectural rule: Inertia is server-driven React

The Laravel application owns:

- URL routing;
- authorization;
- validation;
- database reads and mutations;
- redirect/flash/error behavior;
- page component names;
- shared props;
- asset versioning.

React owns:

- rendering page props;
- local interaction state;
- form presentation and progress;
- accessible loading, success, denial, and recovery states;
- client-side behavior that does not become a second source of truth.

Do not turn ordinary Inertia page data into a client-side API cache. Do not add React Query, Redux, Zustand, or a global event bus merely because the application is interactive. Use these boundaries instead:

| Concern | Authority | Preferred mechanism |
|---|---|---|
| page/entity data | Laravel | Inertia page props |
| shared cross-page data | Laravel | `HandleInertiaRequests::share()`; keep small and lazy |
| URL/filter/pagination state | Laravel/browser URL | Inertia links and visits |
| editable server form | Laravel | Inertia `Form` or `useForm` |
| page-local draft UI | React component | `useState`/`useReducer` until submitted |
| transient pending/error state | Inertia form/visit callbacks | `processing`, `errors`, `onSuccess`, `onError`, `onFinish` |
| browser-only integration | browser | effect/event boundary with SSR-safe fallback |
| polling or non-page HTTP integration | explicit exception | a narrowly scoped fetch/query adapter, not global page state |

## Page and resolver architecture

The client and SSR entrypoints must resolve the same page names from the same page registry. The preferred eventual shape is a shared resolver module, for example:

```text
resources/js/pages.ts       shared page resolver and page type
resources/js/app.tsx        browser entry
resources/js/ssr.tsx        Node/Inertia SSR entry
resources/js/types.ts       shared server-prop types
resources/js/Pages/**/*.tsx page components
```

The shared resolver should use Vite's `import.meta.glob` and reject unknown page names. Page component names are server contracts; changing a page path or casing requires a backend/controller and test update.

For the current root app, the existing eager resolver is acceptable for the connected slice, but it is not the long-term code-splitting shape. Before enabling SSR or expanding page count, centralize the resolver and use the adapter-supported lazy page modules so browser and server behavior cannot drift.

## SSR readiness plan

SSR is a deployment capability, not a reason to rewrite the UI now.

Official Inertia v3 guidance requires Node.js 22 or higher for the SSR server. The recommended integration is the `@inertiajs/vite` plugin, which handles development SSR and detects/configures the SSR entrypoint. Production requires both client and SSR bundles and a running SSR process.

Target setup:

```text
resources/js/app.tsx  -> client entry, hydrates SSR HTML
resources/js/ssr.tsx  -> Inertia React server entry
@inertiajs/vite       -> SSR Vite integration
laravel-vite-plugin   -> Laravel asset/manifest integration
php artisan inertia:start-ssr -> production SSR process
```

The eventual SSR entry follows the official Inertia pattern:

```tsx
import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { renderToString } from 'react-dom/server';
import { resolvePage } from './pages';

createServer((page) =>
    createInertiaApp({
        page,
        render: renderToString,
        resolve: resolvePage,
        setup: ({ App, props }) => <App {...props} />,
    }),
);
```

The exact adapter types and plugin API must be checked against the installed package version before implementation. Do not copy a React 18/Vue example without verifying the React 19 package exports.

The eventual browser entry must use the adapter's hydration path when SSR is enabled. React's `hydrateRoot` attaches to HTML generated by `react-dom/server`; calling `createRoot` over that server HTML would discard the intended hydration contract.

Expected build/deploy shape after SSR implementation:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && vite build --ssr"
  }
}
```

The SSR server should run as a supervised companion process in production. Compose must model it explicitly with a health check before the web service advertises SSR as available. If no SSR process is running, the application must either use the documented Inertia fallback or have SSR disabled explicitly; it must never appear healthy merely because the client bundle exists.

Recommended rollout:

1. Make the page resolver shared and SSR-safe while keeping client-only rendering.
2. Add SSR entry/plugin and test-only `INERTIA_SSR_THROW_ON_ERROR=true`.
3. Build both client and SSR bundles.
4. Add an SSR companion service/process and health check.
5. Verify raw HTML contains meaningful page content before hydration.
6. Verify browser hydration, navigation, forms, redirects, and error states.
7. Only then enable SSR for production routes.

## Hydration safety rules

React SSR requires deterministic output between server and browser. During render, page components must not depend on values that differ between environments.

Do not read these during render:

- `window`;
- `document`;
- `localStorage`/`sessionStorage`;
- `navigator` or browser-only media state;
- current time or locale-dependent formatting;
- random values;
- browser-generated IDs that are displayed in markup;
- network calls started directly by render.

Use an event handler or `useEffect` for browser-only mutation. If an external browser store must participate in render, provide a deterministic server snapshot using React's `useSyncExternalStore` pattern. Do not use `suppressHydrationWarning` as a general fix; it is only for unavoidable, narrowly scoped differences.

All server-owned IDs, correlation IDs, lifecycle states, dates, and formatted values should arrive as props or be formatted through a shared deterministic policy. A client-generated idempotency key may be created in an event boundary, but it must not be generated during render.

## Inertia data and performance strategy

### Shared props

`HandleInertiaRequests::share()` should contain only genuinely cross-page data and should use lazy closures for values that are not needed on every request. Correlation IDs and small capability flags are appropriate. Large listing collections, authorization matrices, and expensive counts belong to the page-specific controller/action.

### Partial reloads

Use `only`, `except`, and `reset` on subsequent visits to the same page when only part of the server projection needs refreshing. The server must define lazy props so partial reloads can actually skip work. Partial reloads are not a replacement for authorization or stale-write protection.

### Deferred props

Use deferred props for secondary/expensive data that should not block the initial page shell. Each deferred prop needs:

- an explicit loading state;
- an explicit failure/retry state;
- a safe empty state;
- a decision whether SSR should resolve it or defer it;
- observability when it fails.

Do not defer the primary identity, permission, lifecycle, or recovery state required to understand the page.

### Code splitting

Use Inertia/Vite page code splitting as the page surface grows. Keep the root shell and current route small; load admin or rare workflows on demand. Test production asset resolution and Laravel's manifest integration, not only Vite dev mode.

### URL state

Filters, pagination, sort, and selected entity IDs that must survive refresh or be shareable belong in the URL and server query contract. Do not hide canonical navigation state in component memory.

## Forms, validation, and sensitive mutations

Use the Inertia `Form` component for ordinary HTML-shaped forms and `useForm` for programmatic or multi-step form control. Use `router.post/patch/delete` for small command actions where a full form helper would add noise. All options and callbacks should be typed and should provide visible processing/error/success/recovery states.

Laravel validation errors arrive through the Inertia redirect flow. Frontend code should render field errors and a safe summary; it should not invent a second validation authority that can contradict Laravel rules.

For sensitive commands such as listing submission:

- the server remains authoritative for idempotency, authorization, version checks, and response replay;
- the client must send the `Idempotency-Key` header or the explicitly supported field contract;
- the key must represent one user intent and remain stable for a retry of that intent;
- disable the submit control while processing, but do not rely on UI disabling for correctness;
- do not generate a new key simply because a request timed out or the user retries the same intended command;
- after a successful or semantically changed command, clear/rotate the key for the next intent;
- display safe conflict, in-progress, stale-version, and recovery states without exposing internal request payloads.

The current UI generates a fresh key inside `submitDraft()`. Before sensitive flows expand, move key ownership to the submission intent boundary (`useRef`/state or the server form helper) so the same retry can replay safely.

## Routing, layouts, and page shape

Use Laravel named routes/controllers as the route authority and Inertia `Link`/router visits for navigation. Avoid a client-side router for the canonical Laravel app. A route should render a real page component with typed props, not a placeholder that silently selects a fixture.

Prefer:

```text
Home
Browse
ListingDetail
Owner workspace
Review/operations surfaces
```

with shared layout primitives and domain components over one giant page component as the product grows. The current `Home.tsx` contains the connected slice and is acceptable as a temporary vertical-slice artifact; future work should split pages/components by behavior while preserving the server prop contract.

Every entity route needs:

- an explicit ID/route parameter;
- server-scoped query data;
- a typed loading/empty/not-found state;
- an authorization-denied state;
- a stale/refresh recovery path where relevant;
- a browser test from a visible entry point;
- a refresh test proving URL and server state continuity.

## Accessibility and browser evidence

Use semantic controls and accessible names first:

- `Link` for navigation;
- real `button` elements for commands;
- labels connected to inputs;
- headings and landmark regions;
- `role="alert"` for actionable errors and `role="status"` for non-error progress/success;
- keyboard-visible focus and disabled/processing states;
- responsive layouts tested at desktop and narrow mobile widths.

Playwright should use `baseURL`, semantic locators, isolated browser contexts, and `trace: 'retain-on-failure'`. The current E2E suite is opt-in through `PLAYWRIGHT_BASE_URL`; keep that safe default, but provide a separate CI/runtime command that launches or points at a known rebuilt Laravel app instead of silently skipping every test.

A frontend quality PASS requires more than TypeScript compilation:

1. `npm run typecheck`.
2. ESLint.
3. Prettier check.
4. Vitest.
5. Production Vite build.
6. Browser acceptance against the rebuilt Laravel runtime.
7. Console-error check.
8. At least one refresh/continuity assertion.
9. SSR raw-HTML and hydration assertions once SSR is enabled.
10. Asset-manifest verification for the actual deployed build.

A skipped Playwright test is `UNVERIFIED`, not PASS.

## Testing strategy

### Unit/component tests

Use Vitest/Testing Library for pure render and interaction contracts:

- field state and error summary mapping;
- accessible action names;
- disabled/processing behavior;
- safe denial and recovery rendering;
- deterministic formatting helpers;
- no browser-only work during initial render.

### Laravel feature tests

Use Laravel/Pest for:

- page component names and prop shapes;
- shared props;
- validation redirect/error behavior;
- authorization;
- idempotency/version/audit/outbox invariants;
- partial/deferred prop query behavior where practical.

### Browser tests

Use Playwright against a real rebuilt runtime for:

- initial HTML and hydration;
- login/challenge/readiness/listing continuity;
- invalid fixture and permission denial;
- stale write and retry/idempotency outcomes;
- refresh persistence;
- mobile/narrow viewport behavior;
- browser console errors;
- SSR fallback/throw-on-error behavior in test mode.

SSR-specific acceptance should include:

- raw response contains meaningful rendered content before JavaScript;
- hydration produces no mismatch warnings;
- navigation still uses Inertia visits;
- a deliberate SSR error is visible in test output when throw-on-error is enabled;
- production `inertia:check-ssr` succeeds when the SSR companion is enabled.

## Implementation sequence when SSR work begins

Do not start by adding a global state library or rewriting page components.

1. Freeze the Laravel page/prop/error contract for the next bounded feature.
2. Add shared typed page resolution.
3. Normalize prop casing; stop accepting duplicate snake_case/camelCase forms except during a deliberately documented migration.
4. Extract reusable layout and domain components from `Home.tsx` without changing behavior.
5. Make idempotency retry ownership stable in the submit form/action.
6. Add `@inertiajs/vite` only after verifying peer compatibility with the installed Vite and Laravel Vite plugin versions.
7. Add `resources/js/ssr.tsx` and switch the browser entry to hydration when SSR is actually enabled.
8. Add SSR test configuration and a Node 22+ runtime/container.
9. Build client and SSR artifacts; run Laravel and browser checks.
10. Add a supervised SSR service/health check to Compose/deployment.
11. Enable SSR for the intended route set and explicitly exclude routes that should remain client-only.
12. Record evidence and update this document/skill if package APIs or deployment behavior differ from the official docs.

## Sources

- Inertia v3 SSR: https://inertiajs.com/docs/v3/advanced/server-side-rendering
- Inertia v3 forms: https://inertiajs.com/docs/v3/the-basics/forms
- Inertia v3 partial reloads: https://inertiajs.com/docs/v3/data-props/partial-reloads
- Inertia v3 deferred props: https://inertiajs.com/docs/v3/data-props/deferred-props
- Inertia v3 code splitting: https://inertiajs.com/docs/v3/advanced/code-splitting
- Inertia v3 TypeScript: https://inertiajs.com/docs/v3/advanced/typescript
- Laravel 12 Vite/SSR: https://laravel.com/docs/12.x/vite#ssr
- React 19 `hydrateRoot`: https://react.dev/reference/react-dom/client/hydrateRoot
- React 19 server rendering: https://react.dev/reference/react-dom/server/renderToPipeableStream
- Vite backend integration: https://vite.dev/guide/backend-integration
- Vite SSR guide: https://vite.dev/guide/ssr
- TypeScript module resolution: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- Playwright configuration/web server: https://playwright.dev/docs/test-webserver
