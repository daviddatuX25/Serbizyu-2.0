# Connected Listings Slice — Implementation Contract

Status: active implementation contract for the phone-OTP-backed connected listings slice
Authority: complements the rebuilt HLD, ADR, domain-state, canonical-schema, and first-slice brief; it does not replace them
Scope: Laravel 12 + Inertia React Listings slice only

## 1. Purpose and boundary

This document makes the implementation seam explicit before additional product features are added. It answers one question:

```text
How does a browser request become a database change or a public/private page projection?
```

The canonical path is:

```text
route
  -> controller
  -> Form Request validation/normalization
  -> Laravel session auth (EnsureAuthenticated / Auth::user / CurrentSession)
  -> application action/query
  -> application contract/port
  -> ListingRepository
  -> Eloquent/query builder/database
  -> controlled response projection
  -> Inertia page props
  -> React page and local interaction state
```

Laravel remains the server authority. Inertia transports server props, validation errors, redirects, and correlation information. React renders the received state and owns only local interaction state. This slice does not introduce a separate REST API, client-side router, React Query, Redux, Zustand, or a global client cache.

This contract describes the connected listings slice on real phone-OTP Laravel sessions. Demo/fixture auth routes may remain temporarily for unmigrated tests but are not the product authorization boundary. This contract does not claim live SMS, production providers, SSR, payment behavior, or pilot release.

## 2. Active route contract

| Route | Controller boundary | Response responsibility |
|---|---|---|
| `GET /` | `HomeController::__invoke` | Home page props: session, readiness, owner draft, public listings, safe runtime summary |
| `GET /browse` | `BrowseController::__invoke` | Browse page props using the public listing projection only |
| `GET /listings/{listing}` | `ListingController::show` | Detail page props using the public detail projection only |
| `GET /auth/phone` | `AuthController::show` | Phone OTP entry page |
| `POST /auth/phone/request` | `AuthController::requestCode` | Request OTP for normalized phone |
| `POST /auth/phone/verify` | `AuthController::verifyCode` | Verify OTP and establish Laravel session |
| `POST /auth/logout` | `AuthController::logout` | Invalidate authenticated session |
| `GET /my-listings` | `HomeController::listings` | Authenticated owner listings workspace |
| `POST /onboarding` | `HomeController::onboarding` | Persist additive readiness facts for `Auth::user()` |
| `POST /demo/*` | `DemoController` | Legacy fixture auth only; not the product path |
| `POST /listings` | `ListingController::store` | Create an owner-scoped draft; JSON response for JSON clients or redirect for Inertia form flow |
| `PATCH /listings/{listing}` | `ListingController::update` | Update an owner-scoped draft using optimistic version checking |
| `POST /listings/{listing}/submit` | `ListingController::submit` | Submit an owner draft for review using idempotency and immutable lifecycle behavior |
| `POST /listings/{listing}/protected-edit-attempt` | `ListingController::protectedEditAttempt` | Record and return a safe non-owner denial |

Listing write routes use the named `listing-writes` or `listing-submits` throttles. Throttling is a request-rate safeguard; it is not authorization and does not replace application invariants.

## 3. HTTP request boundary

Dedicated Form Requests own transport validation and input normalization. They do not own database transactions, listing ownership, lifecycle transitions, or audit/outbox writes.

| Request class | Used by | Contract |
|---|---|---|
| `CreateListingDraftRequest` | `POST /listings` | Requires title, description, category code, and `service`/`product` listing type |
| `UpdateListingDraftRequest` | `PATCH /listings/{listing}` | Requires `expected_version`; mutable fields are optional but validated when present |
| `SubmitListingRequest` | `POST /listings/{listing}/submit` | Requires `expected_version`; normalizes `Idempotency-Key` header into `idempotency_key` |
| `OnboardingRequest` | `POST /onboarding` | Validates readiness fields and derives area, language, and low-data values from the supported input forms |
| `PhoneOtpRequest` | auth phone request/verify | Requires phone; code required on verify |
| `DemoFixtureRequest` | legacy demo login/challenge | Fixture identifier only; not product auth |

Command authorization uses Laravel session identity via `CurrentSession::requireUser()` (backed by `Auth::user()`) plus repository owner checks. Form requests may still return `authorize() === true` where middleware already gates the route; Policies/Gates remain the next hardening step.

## 4. Authorization and ownership contract

Current command flow:

```text
EnsureAuthenticated (where registered) / Auth::user
  -> Form Request validation
  -> CurrentSession::requireUser(request, correlationId)
  -> application action receives ownerId
  -> repository checks listing ownership for update/submit/protected behavior
```

Rules:

- Unauthenticated private page visits redirect to `/auth/phone` and preserve `auth_return_to`.
- JSON/command callers without a session receive the existing safe identity error shape from `CurrentSession::requireUser()`.
- A listing owner may update and submit only their own listing.
- A non-owner protected edit attempt returns the safe `AUTHORIZATION_DENIED` response and records the denial context.
- Public query paths must never use owner-scoped draft data as public data.
- Repositories enforce persistence and ownership invariants; they are not the replacement for Laravel Policies.
- A dedicated `ListingPolicy` remains the next hardening step now that actor-backed session auth exists.

## 5. Application contracts

The command side depends on `ListingCommandStore`:

```text
createDraft(ownerId, input, correlationId)
updateDraft(listingId, ownerId, expectedVersion, input, correlationId)
submit(listingId, ownerId, expectedVersion, idempotencyKey, correlationId)
recordDenied(listingId, actorId, correlationId)
```

The public query side depends on `PublicListingReader`:

```text
publicListings(correlationId)
publicDetail(listingId, correlationId)
```

`ListingRepository` is the active concrete adapter and is bound to both ports by the application service provider. Controllers and React pages must not bypass these ports to access Eloquent directly.

## 6. Persistence and concurrency contract

### Draft create

`CreateListingDraft` receives the validated fields and the current owner ID. The repository creates the draft with its initial version and returns a controlled listing projection. Server-owned identifiers, state, timestamps, owner identity, and version are not accepted from the browser as authority.

### Draft update

`UpdateListingDraft` receives `expected_version`. The repository performs the update inside its transaction/locking boundary and rejects a stale version with the stable version-conflict error. The client must treat the returned server version as authoritative and recover by refreshing or reloading the current projection.

### Submit

`SubmitListing` receives an owner ID, listing ID, expected version, idempotency key, and correlation ID. The repository must preserve these invariants:

- the expected version is checked before the lifecycle transition;
- the submit transition is transactionally consistent;
- the listing version/lifecycle history remains immutable according to the schema contract;
- a successful submit reaches `pending_review` and is not public;
- the audit event and outbox message use the same listing aggregate and causality context;
- the idempotency record stores the request fingerprint and replayable result.

### Idempotency

The React page creates one submission intent key for an expected server version. A retry with the same expected version reuses the key. If the server version changes, a new key is generated because the request fingerprint has changed.

The `SubmitListingRequest` accepts the canonical `Idempotency-Key` header and exposes it as validated input. The controller still rejects a missing/empty key using the existing listing error taxonomy. The repository remains the final authority for scope, key reuse, request fingerprint, replay, and durable result behavior.

## 7. Projection and privacy contract

The public reader must return only server-approved active listings. At minimum:

```text
state = active
public = true
```

Pending-review, draft, rejected, paused, unavailable, expired, and archived owner records must not appear in public browse or public detail projections unless the canonical domain contract explicitly changes that rule.

Private owner draft data is returned only through the authenticated connected workspace state. Public projections must not expose owner-only fields, internal persistence metadata, idempotency values, private audit data, or correlation details beyond the safe response contract.

The current backend returns array projections. The current TypeScript contract accepts both snake_case and camelCase aliases because the connected slice is still normalizing an inherited boundary. New backend fields must not be added casually; update this contract and `resources/js/types.ts` together before introducing new page state.

## 8. Inertia page contract

The canonical React entry is `resources/js/app.tsx`. The connected pages are:

- `resources/js/Pages/Home.tsx`
- `resources/js/Pages/Browse.tsx`
- `resources/js/Pages/ListingDetail.tsx`

The shared page shape is represented by `HomeProps` in `resources/js/types.ts`. Current server props include:

```text
app
runtime
correlationId
scope
session
readiness
draft
publicListings
activeListingDetail
denial
pageMode
```

Laravel owns the values of these props. React may update local form fields, action state, feedback, and recovery affordances, but a successful response/redirect or refreshed Inertia page is the source of truth for persisted state.

The submit interaction keeps its idempotency intent in a React ref rather than a global cache. It clears that intent after a successful create/save/submit and preserves it for a retry while the expected version is unchanged.

## 9. Error and observability contract

Every active request receives a correlation ID through the correlation middleware. Error responses and redirects preserve the safe correlation reference expected by the existing feature tests.

Application errors use the existing Listing/IdentityAccess error taxonomy and shared response envelope. A user-facing error may expose:

- stable machine-readable code;
- safe message;
- field errors where appropriate;
- recovery guidance;
- correlation ID/reference.

It must not expose credentials, raw exception traces, database connection details, idempotency secrets, or internal provider credentials.

## 10. Verification contract

The implementation contract is considered intact only when the following remain green:

```text
Pest feature/unit/architecture suite against serbizyu_ci_verify
PHPStan with the project configuration and 512 MB memory limit
Pint test mode
npm run quality
npm run build
Playwright suite against http://127.0.0.1:8080
```

Required behavior evidence includes:

- phone OTP request/verify and session refresh persistence;
- onboarding readiness persistence for authenticated users;
- draft creation and update;
- optimistic version conflict;
- idempotent submit and replay;
- audit/outbox persistence;
- pending-review privacy;
- non-owner denial;
- public browse/detail safety;
- safe unauthenticated redirect and OTP invalid/expired recovery;
- desktop and 360px/375px browser layouts.

## 11. Deferred decisions before broader expansion

These are explicit decisions, not hidden gaps:

1. **Policies/Gates:** register `ListingPolicy` and move Form Request authorization onto the real actor/resource boundary (session auth already exists).
2. **Enums and casts:** inventory stable domain-controlled values first; then add backed enums and Eloquent casts only for states, workflow, visibility, and roles that are truly domain-controlled.
3. **Response Resources/DTOs:** formalize typed response projections before the slice exposes more private or nested data.
4. **Frontend decomposition:** split `Home.tsx` into layout, listing form, readiness form, feedback, and recovery components before adding unrelated responsibilities.
5. **Prop naming:** choose one canonical server/client naming convention and remove compatibility aliases only with a migration decision and regression evidence.
6. **Lifecycle browser evidence:** `e2e/listing-lifecycle.spec.ts` covers browser draft creation, reload continuity, update, concurrent stale-version failure, explicit refresh recovery, submit payload capture, server replay with the same idempotency key, and pending-review privacy in public browse. Infrastructure/provider outage recovery remains a separate future evidence gate.
7. **SSR and prototype design system:** remain deferred; neither is required for the current connected slice.

No new product feature should silently bypass these seams. A future feature must either reuse the contract or add a documented architecture decision and focused evidence before implementation.
