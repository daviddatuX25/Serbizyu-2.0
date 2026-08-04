# Serbizyu 2.0 — Initial Product Foundation Plan

**Status:** Active implementation contract — phone OTP identity foundation (E1)
**Authority:** implementation LLD for the first vertical slice; complements rebuilt HLD/ADR/schema; does not authorize live SMS, payments, or pilot activation
**Supersedes for this slice:** fixture/demo auth assumptions in older connected-frontend OpenSpecs  
**Date:** 2026-08-04  
**Scope:** Real identity foundation, mockable notification delivery, mock-v2-aligned frontend foundation, and first listing vertical slice.

## 1. Objective

Build the first credible Serbizyu slice without fictional accounts, shared credentials, or UI-only state:

> Real phone identity → OTP verification → Laravel session → onboarding → listing draft → mock-v2 listing-card preview → review submission → privacy-safe public discovery.

This plan is deliberately narrower than the full marketplace. Payments, orders, agent delegation, government-ID verification, live SMS, and pilot activation remain separate gates.

## 2. Decisions

### 2.1 Identity

Use the existing product direction: **phone-first OTP authentication**. Email/password is not the primary identity path because the canonical product artifacts target mobile-first Tagudin users and explicitly define phone OTP as the identity contract.

The implementation must use:

- E.164-normalized phone identity;
- a persisted `auth_otps` record with a hashed code;
- ten-minute expiry;
- five-attempt maximum;
- single-use consumption;
- Laravel's session guard for browser sessions;
- rate limiting and generic failure messages;
- no OTP or account bypass in production-shaped application code.

### 2.2 OTP and notification providers

Do **not** couple the domain to TextBee, Twilio, Mailpit, or any other provider. Use application contracts:

```php
interface NotificationChannel
{
    public function send(NotificationMessage $message): DeliveryResult;
}

interface OtpDeliveryChannel
{
    public function deliver(OtpDelivery $delivery): DeliveryResult;
}
```

Recommended implementations:

| Environment | Adapter | Purpose |
|---|---|---|
| `local` | `LogOtpDelivery` or `FakeOtpDelivery` | Development only; records a redacted/test-classified delivery event, never a UI bypass |
| `test` | `InMemoryOtpDelivery` / `FakeOtpDelivery` | Deterministic assertions on recipient, purpose, and delivery result |
| `capstone` | `Mailpit` for email; explicitly labelled `FakeOtpDelivery` for SMS | Demonstration without external credentials or real SMS |
| future pilot | `TextBeeOtpDelivery` or approved SMS adapter | Activated only after provider, operations, privacy, and pilot gates |

The fake adapter must expose test inspection through a test seam, not through a user-visible universal code. The application verifies the persisted hashed OTP exactly like the future real adapter path.

For local/capstone UAT only, operators may inspect the latest fake delivery with `php artisan serbizyu:otp:peek {phone}`. The command is environment-gated and must never appear in product UI.

**Existing infrastructure:** Compose already includes Mailpit for SMTP capture. Keep it for email notifications and account/recovery messages. Mailpit is not an SMS simulator and must not be presented as one.

**Library recommendation:** Do not add a random OTP package yet. Laravel already provides the session, validation, hashing, throttling, notifications, queues, and testing primitives required here. TOTP libraries solve authenticator-app codes, not the product's SMS OTP delivery problem. A provider adapter is more portable and keeps provider state outside the domain.

### 2.3 Frontend foundation

Use the Laravel/Inertia React application in `resources/js` as the only live product frontend. The standalone `frontend/` directory remains reference material until explicitly migrated.

Use the mock-v2 branding, hierarchy, spacing, card composition, status language, and responsive behavior as the visual authority.

Recommended implementation:

- retain a small Serbizyu token layer for brand colors, typography, spacing, radii, focus states, and responsive breakpoints;
- build accessible reusable primitives in `resources/js/components/ui`;
- build domain components such as `ListingCard`, `ListingStatusBadge`, `ListingPreview`, `OtpForm`, and `OnboardingStep` on top of those primitives;
- keep server state in Inertia props and server actions;
- keep only transient form state in React;
- avoid React Query/Redux/global stores for ordinary Inertia page data.

### 2.4 shadcn/ui and Taste Skill

Do not replace the existing visual foundation wholesale with shadcn/ui. shadcn is a useful source-code component pattern, but its default styling would risk replacing the approved mock-v2 design language and adding unnecessary migration work.

Use this approach:

1. Keep Serbizyu tokens and mock-v2 visual contracts as the source of truth.
2. Borrow shadcn-style composition, accessibility, variants, and copy-owned component code where useful.
3. Add Radix primitives only when a real interaction needs their accessibility behavior; do not add a dependency merely for buttons/cards/forms.
4. Use Taste Skill (`https://github.com/Leonxlnx/taste-skill`) as an **agent/design-review skill**, not as a runtime dependency. It is useful for anti-generic layout, typography, density, and redesign audits, but it must not override product UX contracts or generate unapproved visual divergence.
5. Any Taste Skill output is accepted only after comparison against `docs/mockup-v2/` and the UX planning artifacts.

## 3. Architecture shape

```text
Inertia React page
        |
Laravel controller / Form Request
        |
Application action or query
        |
Identity/Notification ports
        |--------------------|
PostgreSQL              Queue/outbox
(auth_otps, users,       (future SMS/email delivery)
 sessions, audit)       |
                         +--> Mailpit/local fake
                         +--> approved SMS adapter later
```

Rules:

- PostgreSQL owns identity, OTP lifecycle, listing lifecycle, audit, and idempotency truth.
- Redis may hold sessions, rate-limit state, and queues; it is not domain truth.
- Providers never become the source of truth.
- Controllers do not contain business state transitions.
- All state-changing actions have authorization, validation, correlation IDs, and safe recovery behavior.
- Authenticated and private pages use no-store/cache-safe response behavior.

## 4. Implementation sequence

### Phase E0 — Foundation gate

- Confirm Laravel/Inertia/React versions and Compose health.
- Run the canonical migrations from a clean database.
- Remove accidental generated/scaffold artifacts from the active runtime path.
- Record the active route/page authority.
- Add a short architecture test or static check preventing fixture/demo authentication from being used by protected product routes.

**Exit evidence:** clean migration, route list, health/readiness, no fictional login UI on the active path.

### Phase E1 — Real identity vertical slice

Backend:

- finalize `users` model for UUID/string identity;
- finalize `auth_otps` migration and indexes;
- add `OtpDeliveryChannel`, `NotificationChannel`, message/result value objects;
- add local/test fake adapter and provider binding in `AppServiceProvider`;
- add OTP request/verify actions;
- add rate limits, expiry, attempt lockout, single-use consumption;
- use `Auth::login()` and session regeneration;
- invalidate session on logout;
- add generic errors that do not reveal account existence;
- remove fictional demo authentication from active web routes after migration tests pass.

Tests:

- new phone registration;
- existing phone login;
- valid verification;
- invalid verification increments attempts;
- fifth failure locks the challenge;
- expiry is rejected;
- reuse is rejected;
- duplicate request invalidates the prior pending challenge;
- suspended/closed account is denied;
- session fixation protection;
- logout invalidates the authenticated session;
- rate-limit behavior;
- fake delivery contract assertions.

Frontend:

- phone entry state;
- code entry state;
- resend/wait state;
- invalid/expired/locked recovery;
- loading and network failure states;
- accessible labels and focus management;
- no test code displayed in the user-facing product.

### Phase E2 — Authenticated onboarding

- bind onboarding to `Auth::user()` only;
- persist display name, area, language, accessibility preferences, and capability intent;
- use an explicit onboarding state query;
- add authorization tests for profile ownership;
- remove fictional readiness/review language;
- distinguish profile setup from future identity verification.

**Exit evidence:** authenticated user can refresh and resume setup; another user cannot read or mutate the profile.

### Phase E3 — Mock-v2 listing foundation

First implement the visual contract, then connect it to data:

- `ListingCard` for public discovery;
- `OwnerListingCard` for My Listings;
- `ListingPreview` reusing the same card structure;
- status badges: Draft, Pending review, Active, Paused, Rejected;
- category, area, description, fulfillment shape, and safe action treatment;
- responsive grid/list behavior matching the mock;
- empty, loading, unavailable, and error states;
- no fake price, stock, verification, or availability claims.

Keep public projections privacy-safe. Draft and pending-review records remain excluded from Browse.

### Phase E4 — First listing lifecycle

- create draft;
- edit with expected version;
- preview using `ListingCard`;
- submit with idempotency key;
- preserve audit/outbox records;
- expose recovery for stale writes;
- show server-owned state after every mutation;
- verify owner authorization through the real session.

### Phase E5 — Browser and runtime gate

Run:

- PHP feature/unit tests;
- static analysis and formatting;
- `npm run typecheck`;
- `npm run lint`;
- `npm run test`;
- `npm run build`;
- Playwright auth/onboarding/listing tests;
- clean Compose migration and readiness;
- browser verification through the disposable ngrok tunnel.

Ngrok evidence is transport/runtime evidence only. It is not pilot or production approval.

## 5. Proposed initial file structure

```text
app/
  Contracts/Notifications/
    NotificationChannel.php
    OtpDeliveryChannel.php
    DeliveryResult.php
  Modules/IdentityAccess/
    Application/
      RequestOtp.php
      VerifyOtp.php
      CurrentSession.php
    Infrastructure/Notifications/
      FakeOtpDelivery.php
      LogOtpDelivery.php
      MailpitNotificationChannel.php
      TextBeeOtpDelivery.php       # future, disabled by default
  Http/Controllers/AuthController.php
  Http/Requests/PhoneOtpRequest.php

database/migrations/
  ...create_auth_otps.php

resources/js/components/
  ui/
    Button.tsx
    Card.tsx
    Badge.tsx
    Field.tsx
    Modal.tsx
  listings/
    ListingCard.tsx
    ListingPreview.tsx
    ListingStatusBadge.tsx
  auth/
    PhoneOtpForm.tsx

resources/css/
  design-system.css
  listing-components.css

tests/Feature/IdentityAccess/
  PhoneOtpAuthenticationTest.php
  AuthSessionTest.php

tests/Feature/Listings/
  ListingLifecycleTest.php

e2e/
  auth-otp.spec.ts
  listing-card.spec.ts
  listing-lifecycle.spec.ts
```

Names may be adjusted to match existing module conventions; the boundaries must remain.

## 6. Non-goals for this initial work

- live SMS credentials or provider activation;
- government-ID/selfie collection;
- email/password as a competing primary identity path;
- payments, escrow, payouts, or orders;
- Agent delegation and owner consent;
- AI-generated listing content;
- a second production frontend;
- a wholesale shadcn/Taste visual rewrite;
- pilot or production readiness claims.

## 7. Definition of done

This foundation is complete only when:

- no fictional account is needed to use the active auth path;
- OTP verification uses the same persisted challenge rules in local, test, and future provider modes;
- provider delivery is replaceable without changing domain/application code;
- auth and onboarding are covered by backend and browser tests;
- the mock-v2 listing card is a reusable component used by Browse, My Listings, and Preview;
- listing privacy, authorization, stale-version, idempotency, audit, and recovery contracts remain green;
- npm build and full frontend checks pass;
- the Compose runtime and ngrok browser flow are verified;
- pilot/production remains explicitly NO-GO until separate gates are satisfied.

## 8. Immediate next physical actions

1. Fix and verify the current auth scaffold before adding more UI.
2. Add the notification/OTP interfaces and deterministic fake adapter.
3. Add backend OTP feature tests before connecting any external provider.
4. Run migrations in a clean Compose database and verify Laravel session auth.
5. Remove the old demo auth from the active route/page path.
6. Build the mock-v2 `ListingCard` and reuse it in Browse, My Listings, and Preview.
7. Run the complete E1/E2 verification gate before starting the next marketplace feature.

**Owner decision requested after E1:** approve the local fake delivery behavior and the exact mock-v2 listing-card contract before expanding into additional marketplace features.

## References

- `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`
- `docs/architecture/frontend-inertia-react-ssr-foundation.md`
- `docs/mockup-v2/`
- `docs/planning-hardening/10-ux-ui-reference-dossier.md`
- `docs/planning-hardening/11a-data-backed-frontend-system-mockup-plan.md`
- `_bmad-output/planning-artifacts/epics-and-stories.md`
- `_bmad-output/planning-artifacts/adr-catalog-rebuilt.md`
- `https://github.com/Leonxlnx/taste-skill`
- Compose Mailpit service in `compose.yaml`

This document is a planning artifact. It does not authorize provider activation, live credentials, sensitive-data collection, pilot promotion, or production release.
