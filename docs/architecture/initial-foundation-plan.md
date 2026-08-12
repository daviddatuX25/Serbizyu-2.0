initial-foundation-plan.md 339L
# Serbizyu 2.0 — Initial Product Foundation Plan
**Status:** Active implementation contract — identity foundation (E1); **amended 2026-08-10** for multi-method sign-in + strict mobile signup
**Authority:** implementation LLD for the first vertical slice; complements rebuilt HLD/ADR/schema; does not authorize live SMS, live Google OAuth, payments, or pilot activation
**Supersedes for this slice:** fixture/demo auth assumptions in older connected-frontend OpenSpecs; pre-2026-08-10 “phone-only primary login” wording
... [lean-ctx: omitted 2 lines]
## 1. Objective
Build the first credible Serbizyu slice without fictional accounts, shared credentials, or UI-only state:
... [lean-ctx: omitted 3 lines]
This plan is deliberately narrower than the full marketplace. Payments, orders, agent delegation, government-ID verification, live SMS, and pilot activation remain separate gates.
## 2. Decisions
### 2.1 Identity
Follow **ADR-R-030 (amended 2026-08-10)** and `openspec/changes/hybrid-browser-auth-phone-step-up/`:
- **Signup:** strict E.164 mobile OTP verification is required before registration is complete (`phone_verified_at`).
- **Onboarding:** password **required** (account-level) to finish readiness; email optional.
- **Sign-in:** password-first for phone-verified accounts — phone/password and email/password preferred, SMS OTP fallback, Google OAuth (phased adapters; live Google/SMS gated).
- **Recovery:** email reset link (if email linked) or SMS-OTP-verified reset; single-use tokens, short expiry, named `auth-password-reset*` limiters, generic copy.
... [lean-ctx: omitted 3 lines]
- persisted `auth_otps` records with hashed codes, ten-minute expiry, five-attempt maximum, single-use consumption, and purpose codes;
... [lean-ctx: omitted 1 lines]
- swappable `OtpDeliveryChannel`, mail/`NotificationChannel`, and `OAuthLoginPort`;
... [lean-ctx: omitted 2 lines]
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
... [lean-ctx: omitted 10 lines]
**Library recommendation:** Do not add a random OTP package yet. Laravel already provides the session, validation, hashing, throttling, notifications, queues, and testing primitives required here. TOTP libraries solve authenticator-app codes, not the product's SMS OTP delivery problem. A provider adapter is more portable and keeps provider state outside the domain.
### 2.3 Frontend foundation
Use the Laravel/Inertia React application in `resources/js` as the only live product frontend. The standalone `frontend/` directory remains reference material until explicitly migrated.
Use the mock-v2 branding, hierarchy, spacing, card composition, status language, and responsive behavior as the visual authority.
... [lean-ctx: omitted 2 lines]
- build accessible reusable primitives in `resources/js/components/ui`;
- build domain components such as `ListingCard`, `ListingStatusBadge`, `ListingPreview`, `OtpForm`, and `OnboardingStep` on top of those primitives;
... [lean-ctx: omitted 3 lines]
### 2.4 shadcn/ui and Taste Skill
Do not replace the existing visual foundation wholesale with shadcn/ui. shadcn is a useful source-code component pattern, but its default styling would risk replacing the approved mock-v2 design language and adding unnecessary migration work.
... [lean-ctx: omitted 4 lines]
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
... [lean-ctx: omitted 7 lines]
## 4. Implementation sequence
### Phase E0 — Foundation gate
- Confirm Laravel/Inertia/React versions and Compose health.
... [lean-ctx: omitted 1 lines]
- Remove accidental generated/scaffold artifacts from the active runtime path.
... [lean-ctx: omitted 1 lines]
- Add a short architecture test or static check preventing fixture/demo authentication from being used by protected product routes.
**Exit evidence:** clean migration, route list, health/readiness, no fictional login UI on the active path.
### Phase E1 — Real identity vertical slice
Backend:
- finalize `users` model for UUID/string identity;
- finalize `auth_otps` migration and indexes;
- add `OtpDeliveryChannel`, `NotificationChannel`, message/result value objects;
- add local/test fake adapter and provider binding in `AppServiceProvider`;
... [lean-ctx: omitted 2 lines]
- use `Auth::login()` and session regeneration;
... [lean-ctx: omitted 2 lines]
- remove fictional demo authentication from active web routes after migration tests pass.
... [lean-ctx: omitted 4 lines]
- invalid verification increments attempts;
... [lean-ctx: omitted 3 lines]
- duplicate request invalidates the prior pending challenge;
... [lean-ctx: omitted 1 lines]
- session fixation protection;
... [lean-ctx: omitted 2 lines]
- fake delivery contract assertions.
... [lean-ctx: omitted 6 lines]
- accessible labels and focus management;
- no test code displayed in the user-facing product.
### Phase E2 — Authenticated onboarding
- bind onboarding to `Auth::user()` only;
- persist display name, area, language, accessibility preferences, and capability intent;
... [lean-ctx: omitted 2 lines]
- remove fictional readiness/review language;
... [lean-ctx: omitted 2 lines]
### Phase E3 — Mock-v2 listing foundation
First implement the visual contract, then connect it to data:
- `ListingCard` for public discovery;
- `OwnerListingCard` for My Listings;
- `ListingPreview` reusing the same card structure;
... [lean-ctx: omitted 1 lines]
- category, area, description, fulfillment shape, and safe action treatment;
... [lean-ctx: omitted 4 lines]
### Phase E4 — First listing lifecycle
- create draft;
... [lean-ctx: omitted 1 lines]
- preview using `ListingCard`;
... [lean-ctx: omitted 1 lines]
- preserve audit/outbox records;
... [lean-ctx: omitted 1 lines]
- show server-owned state after every mutation;
... [lean-ctx: omitted 1 lines]
### Phase E5 — Browser and runtime gate
Run:
... [lean-ctx: omitted 2 lines]
- `npm run typecheck`;
- `npm run lint`;
- `npm run test`;
... [lean-ctx: omitted 4 lines]
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
... [lean-ctx: omitted 1 lines]
## 6. Non-goals for this initial work
- live SMS credentials or provider activation;
- government-ID/selfie collection;
... [lean-ctx: omitted 6 lines]
- a wholesale shadcn/Taste visual rewrite;
- pilot or production readiness claims.
## 7. Definition of done
This foundation is complete only when:
... [lean-ctx: omitted 2 lines]
- provider delivery is replaceable without changing domain/application code;
... [lean-ctx: omitted 1 lines]
- the mock-v2 listing card is a reusable component used by Browse, My Listings, and Preview;
- listing privacy, authorization, stale-version, idempotency, audit, and recovery contracts remain green;
... [lean-ctx: omitted 2 lines]
- pilot/production remains explicitly NO-GO until separate gates are satisfied.
## 8. Immediate next physical actions
1. Fix and verify the current auth scaffold before adding more UI.
... [lean-ctx: omitted 4 lines]
6. Build the mock-v2 `ListingCard` and reuse it in Browse, My Listings, and Preview.
7. Run the complete E1/E2 verification gate before starting the next marketplace feature.
**Owner decision requested after E1:** approve the local fake delivery behavior and the exact mock-v2 listing-card contract before expanding into additional marketplace features.
## References
- `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`
- `docs/architecture/frontend-inertia-react-ssr-foundation.md`
... [lean-ctx: omitted 1 lines]
- `docs/planning-hardening/10-ux-ui-reference-dossier.md`
... [lean-ctx: omitted 5 lines]
This document is a planning artifact. It does not authorize provider activation, live credentials, sensitive-data collection, pilot promotion, or production release.


[lean-ctx] full source: read "/home/user/Serbizyu-2.0/docs/architecture/initial-foundation-plan.md" directly (no MCP)  ·  or ctx_read("/home/user/Serbizyu-2.0/docs/architecture/initial-foundation-plan.md", mode="full")
