# Real phone OTP identity foundation

## Why

The connected frontend OpenSpecs still describe fictional fixture authentication. Product authority and the active implementation plan require phone-first OTP with Laravel sessions, hashed challenges, and swappable delivery adapters. Continuing listing/onboarding work without this change would leave code as the silent authority.

## What changes

- Establish phone E.164 identity + `auth_otps` lifecycle as the active auth path.
- Bind `OtpDeliveryChannel` / `NotificationChannel` ports with fake/log adapters for disposable environments.
- Authenticate browser sessions with Laravel's session guard (`Auth::login`, regenerate, logout invalidate).
- Keep Mailpit for email capture; do not present it as SMS.
- Defer live SMS provider selection and activation.
- Mark `/demo/*` fixture auth as legacy until tests migrate, then remove from the active product path.

## Scope

Bounded Identity Access foundation for the first vertical slice:

> Phone → OTP → session → onboarding → listing draft/submit → privacy-safe browse

## Non-goals

- Live SMS credentials or TextBee/Semaphore/Gammu activation
- Government-ID / selfie collection
- Email/password as primary identity
- Payments, orders, Agent delegation
- Pilot or production readiness claims

## Authority

- BMAD rebuilt architecture / ADR / domain / schema / PRD / UX
- `docs/architecture/initial-foundation-plan.md` (active implementation contract for this slice)
- ADR-R-030 (phone OTP + delivery ports)

This OpenSpec implements those decisions; it does not override BMAD.
