---
globs: tests/**
---

# Pest Testing & Verification Rules

- **Framework & Syntax:** Use Pest 4 syntax (`it('description', function () { ... })` or `test(...)`) with `expect()` fluent assertions for new tests.
- **Database Transactions:** Use `uses(DatabaseTransactions::class)` in feature tests. Do not alter persistent database state outside transactions.
- **Phone OTP Authentication:** Use `Tests\Support\AuthenticatesWithPhoneOtp` trait (`$this->authenticateProvider()`, `$this->authenticateBuyer()`, `$this->authenticateWithPhone('+63...')`) for authenticated test scenarios. Signup OTP purpose is `signup_verify` — pass it to `FakeOtpDelivery::lastCodeFor($phone, 'signup_verify')`.
- **Hybrid auth pages:** Guest gates redirect to `auth.sign-in` (method picker). SMS remains at `auth.phone`; strict mobile register at `auth.register`.
- **Architecture Safeguards:** Retain and run architecture test guards (`ArchitectureCheck::moduleViolations()`, `ActiveAuthPathArchitectureTest`) to ensure no forbidden cross-module imports or deprecated demo routes creep back in.
