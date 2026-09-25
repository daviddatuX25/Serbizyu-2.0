# Tasks — D1-Story-1.1: Create and Resume a Secure Account

## Change ID: `d1-story-1-1-secure-registration-and-sign-in`
- **Story:** `Story 1.1`
- **Delivery Unit:** `D1`

---

## 0. Packet Readiness & Seam Confirmation
- [x] 0.1 Author `proposal.md`, `design.md`, `specs/registration-and-account-creation.spec.md`.
- [x] 0.2 Confirm public testing seam: HTTP API routes `/auth/register/request` and `/auth/register/verify` against the Laravel Session and PostgreSQL database state.

---

## 1. Automated Verification Implementation (TDD Red-Green Loop)
- [x] 1.1 Author `tests/Feature/IdentityAccess/Story1_1_RegistrationAndAccountCreationTest.php`:
  - Test 1: Fresh registration normalizes Philippine mobile numbers, creates pending user, hashes OTP into `auth_otps`.
  - Test 2: Atomic verification transitions user to active, sets `phone_verified_at`, authenticates session, marks challenge consumed.
  - Test 3: Replayed/consumed OTP is rejected with `OTP_INVALID`.
  - Test 4: Resuming registration for pending user reuses record without duplicate key error.
  - Test 5: Re-requesting registration invalidates prior pending challenge.
  - Test 6: Registration request for active/verified phone is strictly non-enumerating (no OTP minted, no SMS dispatched).
  - Test 7: Registration request for suspended phone is non-enumerating.
  - Test 8: 5 consecutive invalid code submissions lock out the challenge.
  - Test 9: Expired challenge (> 600s) is rejected with `OTP_INVALID`.
  - Test 10: Malformed phone numbers are rejected with `PHONE_INVALID`.
- [x] 1.2 Run Pest on `tests/Feature/IdentityAccess/Story1_1_RegistrationAndAccountCreationTest.php` and observe test results (10 passed, 73 assertions).
- [x] 1.3 Implement any necessary adjustments in `StartSignup.php`, `CompleteSignupPhoneOtp.php`, or `AuthController.php`.
- [x] 1.4 Format with Pint (`vendor/bin/sail bin pint --dirty --format agent`).

---

## 2. Review and Verification Gate
- [x] 2.1 Verify full IdentityAccess test suite passes (53 passed, 337 assertions).
- [x] 2.2 Conduct two-axis code review (Standards + Spec).
- [x] 2.3 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: mark `1-1-secure-registration-and-sign-in-for-citizens-and-providers` as `done`.
- [x] 2.4 Commit to git.
