# Tasks — D1-Story-1.2: Sign In and Recover Without Enumeration

## Change ID: `d1-story-1-2-sign-in-and-recover`
- **Story:** `Story 1.2`
- **Delivery Unit:** `D1`

---

## 0. Packet Readiness & Seam Confirmation
- [x] 0.1 Author `proposal.md`, `design.md`, `specs/sign-in-and-recovery.spec.md`.
- [x] 0.2 Confirm public testing seams: `/auth/phone/login`, `/auth/email/login`, `/auth/phone/request`, `/auth/phone/verify`, `/auth/password/email`, `/auth/password/reset`, `/auth/password/sms/request`, `/auth/password/sms/reset`.

---

- [x] 1.1 Author `tests/Feature/IdentityAccess/Story1_2_SignInAndRecoveryTest.php`:
  - Test 1: Phone + password sign-in succeeds and regenerates session without minting SMS OTP.
  - Test 2: Phone + wrong password fails with generic `AUTH_FAILED`.
  - Test 3: Phone + password sign-in for unknown phone returns generic `AUTH_FAILED` (non-enumerating).
  - Test 4: Email + password sign-in succeeds and regenerates session.
  - Test 5: Email + wrong password or unknown email returns generic `AUTH_FAILED`.
  - Test 6: Fallback SMS OTP sign-in for verified active account succeeds and consumes challenge.
  - Test 7: SMS OTP sign-in for unknown or pending user is strictly non-enumerating.
  - Test 8: Suspended account cannot authenticate via password or SMS OTP.
  - Test 9: Email password reset is single-use, updates password, and never logs in automatically.
  - Test 10: SMS OTP password reset is single-use, updates password, and never logs in automatically.
  - Test 11: Session is invalidated upon logout (`POST /auth/logout`).
- [x] 1.2 Run Pest on `tests/Feature/IdentityAccess/Story1_2_SignInAndRecoveryTest.php` and verify all assertions pass (11 passed, 61 assertions).
- [x] 1.3 Format with Pint (`vendor/bin/sail bin pint --dirty --format agent`).

---

## 2. Review and Verification Gate
- [x] 2.1 Run full IdentityAccess test suite (64 passed, 398 assertions).
- [x] 2.2 Conduct two-axis review (Standards + Spec).
- [x] 2.3 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: mark `1-2-sign-in-and-recover-without-enumeration` as `done`.
- [x] 2.4 Commit to git.
