# Tasks — T1A Identity, onboarding, delegation, and recovery

Rule: no permanent Identity feature expansion marked complete until §0 packet readiness PASS.

## 0. Packet readiness

- [x] 0.1 Proposal / design / capability spec authored
- [x] 0.2 Depends on T1 GO
- [x] 0.3 Deferred Reviews (T6) and nearby/search (T2) explicitly recorded — not forgotten
- [x] 0.4 Solo Data/Backend + Architect + QA packet readiness PASS (2026-08-10)

## 1. Shared + IdentityAccess services

- [x] 1.1 `ActorContext::actingFor` helper (human actor + grant reference)
- [x] 1.2 `RoleAssignmentService` — additive buy/provide ensure/revoke helpers
- [x] 1.3 `ConsentGrantService` — grant / revoke / assertActive
- [x] 1.4 `IdentityVerificationGate` — live evidence collection fail-closed
- [x] 1.5 Wire onboarding to additive roles without breaking provider listing path

## 2. HTTP / policies (minimal)

- [x] 2.1 Keep existing `/auth/phone/*` and `/onboarding` contracts stable for hi-fi UI
- [x] 2.2 Optional lo-fi consent grant/revoke endpoints or application-service-only first slice (service-only)
- [x] 2.3 Deny-by-default checks for acting-for on listing writes when grant present

## 3. Data for local/test

- [x] 3.1 Prefer factories/seeders for test users; do not expand FixtureRepository as the long-term path (`database/factories/UserFactory.php`)
- [x] 3.2 Document fixture removal as follow-on (no big-bang delete in first slice) — `FixtureRepository` / `DemoFixtureService` remain for current demo paths; remove after T2 seeders cover Tagudin catalog + identities

## 4. Verification

- [x] 4.1 Pest: T1A-03 additive roles, T1A-04/05 consent grant+revoke
- [x] 4.2 Pest: T1A-06 live ID deny
- [x] 4.3 Regression: Phone OTP + FirstSlice / MyListings (+ kernel) — 28 passed
- [x] 4.4 Pint dirty PHP

## 5. Stop/go

- [x] 5.1 Solo GO after Pest green (2026-08-10) — IdentityAccess suite 16 passed; listing acting-for + FirstSlice/MyListings/kernel/arch regressions green
- [x] 5.2 Open T2 LLD only after T1A GO — opened `t2-governed-catalog-listings-capacity`

## Explicit blockers (remain unchecked)

- [ ] Live SMS provider
- [ ] Live government-ID collection enabled
- [ ] Production migrate / pilot activation
- [ ] Customer Reviews UI/API (owned by T6)
- [ ] Server nearby/geo search beyond Tagudin-scoped T2 discovery
