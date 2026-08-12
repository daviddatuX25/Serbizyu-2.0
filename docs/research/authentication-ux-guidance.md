# Serbizyu Authentication UX Guidance

Date: 2026-08-12

## Decision

Keep one `/auth/sign-in` hub with two explicit identity methods:

- **Phone**: default method; show phone + password first, with **Use a one-time code instead** as an explicit fallback action.
- **Email**: email + password; keep password recovery visible in the same surface.

Do not present SMS and Google as peer sign-in methods. SMS OTP is a fallback/high-trust step, not the primary return path. Keep recovery task-focused and make its method explicit: phone recovery must complete the OTP and new-password flow; email recovery may use the existing email-token flow.

This is a product decision grounded by the security and accessibility constraints below, not a claim that one visual layout is mandated by a standard.

## Current implementation evidence

- `resources/js/Pages/Auth/SignIn.tsx` already provides one page with phone and email modes, phone password as the primary path, an OTP action, and a visible forgot-password link.
- `app/Http/Controllers/AuthController.php` exposes the unified sign-in page and separate password/OTP endpoints.
- `resources/js/Pages/Auth/ForgotPassword.tsx` is a separate recovery page. Its phone path currently requests an OTP but does not expose the complete verify/new-password journey; `ResetPassword.tsx` is the email-token reset surface.
- Existing feature coverage in `tests/Feature/IdentityAccess/HybridAuthP0Test.php` and `tests/Feature/IdentityAccess/AuthSessionGateTest.php` covers OTP, password login, email-link/reset behavior, session gating, and generic failure behavior.
- `.ai/rules/http-and-auth.md` establishes phone-first identity, password-first return login, OTP as fallback/high-trust step, and one `/auth/sign-in` hub.

## Source-backed constraints

### Password entry

NIST SP 800-63B requires rate limiting for failed authentication, allows password-manager/autofill use, recommends allowing paste, and recommends an option to display the password while entering it. It also requires blocklist checking for new or changed passwords and rejects periodic password changes, arbitrary composition rules, and security questions.

Sources:

- [NIST SP 800-63B, password verifier requirements](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver)
- [NIST SP 800-63B, out-of-band authenticators](https://pages.nist.gov/800-63-4/sp800-63b.html#out-of-band)
- [GOV.UK Design System: Passwords](https://design-system.service.gov.uk/patterns/passwords/)
- [GOV.UK Design System: Password input](https://design-system.service.gov.uk/components/password-input/)

Implementation consequences:

- Use `autocomplete="current-password"` for login and `autocomplete="new-password"` for password creation/reset.
- Permit paste and password-manager autofill; do not add custom clipboard blocking.
- Add an accessible show/hide control for password fields.
- Keep password errors generic at login; give actionable guidance when rejecting a new password.
- Do not introduce complexity-meter theater, forced rotation, or security-question recovery.

### Phone OTP and recovery

NIST classifies PSTN/SMS out-of-band authentication as restricted and not phishing-resistant. It requires a short validity window, single-use secrets, effective rate limiting, and consideration of SIM-swap, number-porting, and related risks. NIST also requires alternatives where PSTN is used as a restricted authenticator.

The current product contract already uses a six-digit code, ten-minute expiry, single use, and named rate limits. The UI should communicate the code as a one-time fallback/recovery action without implying phishing resistance or stronger assurance than the channel provides.

Sources:

- [NIST SP 800-63B, out-of-band authenticators](https://pages.nist.gov/800-63-4/sp800-63b.html#out-of-band)
- [NIST SP 800-63B, PSTN out-of-band restrictions](https://pages.nist.gov/800-63-4/sp800-63b.html#pstnOOB)

Implementation consequences:

- Keep the OTP challenge in the same sign-in page after request; avoid a cross-page bounce.
- Show destination context without exposing more phone data than needed.
- Provide a clear expiry/retry state and prevent repeated resend attempts through the existing limiter.
- Ensure requesting a new code does not reset the failed-attempt count.
- Complete phone recovery end to end: request code, enter code, choose a new password, confirm success, and return to sign-in.
- Preserve a non-SMS recovery path where the account/security model requires it.

### Accessible authentication

WCAG 2.2 SC 3.3.8 says an authentication process must not require a cognitive-function test unless an accessible alternative or assistive mechanism is available. The WAI-ARIA Authoring Practices tabs pattern requires a real tablist/tab/tabpanel relationship, `aria-controls`, `aria-labelledby`, `aria-selected`, and keyboard behavior for arrow keys and activation.

Sources:

- [WCAG 2.2 SC 3.3.8: Accessible Authentication (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- [WAI-ARIA Authoring Practices: Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [WCAG 2.2 SC 1.3.5: Identify Input Purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html)

Implementation consequences:

- Keep visible, programmatically associated labels; do not rely on placeholders as labels.
- Use appropriate input types and autocomplete values for phone, email, current password, new password, and OTP.
- Make the OTP field pasteable and compatible with mobile one-time-code autofill where supported.
- If Phone/Email are tabs, expose the complete ARIA relationship and keyboard interaction; otherwise use ordinary buttons as a method switcher rather than partially implemented tabs.
- Announce mode changes, challenge errors, and successful code requests through a live region or equivalent accessible status.

### Recovery and account creation language

GOV.UK recommends clear, consistent language, a simple journey, and a clear difference between account creation and sign-in. It specifically recommends “Create an account” over “Register” or “Sign up” and advises against distracting content during account creation. Its password guidance recommends a minimum of eight characters, no maximum length, paste support, and no arbitrary complexity or periodic changes.

Sources:

- [GOV.UK Design System: Create accounts](https://design-system.service.gov.uk/patterns/create-accounts/)
- [GOV.UK Design System: Passwords](https://design-system.service.gov.uk/patterns/passwords/)

Implementation consequences:

- Label the account-creation action consistently as **Create an account** or retain the project-approved **Create an account with mobile** wording consistently across the app.
- Keep **Forgot password?** adjacent to the relevant password action, not buried in a separate help page.
- Keep recovery screens narrowly focused; do not add promotional or unrelated navigation in the middle of reset.
- Return users to sign-in with a clear success message after password reset rather than silently changing the authentication context.

## Recommended page model

```text
/auth/sign-in
  Phone (default)
    Phone number
    Password
    Sign in
    Forgot password?
    Use a one-time code instead
      [same page: code entry, resend, change number, expiration/error status]
  Email
    Email
    Password
    Sign in
    Forgot password?

/auth/password/phone
  Phone number
  Send one-time code
  [same page or explicit next state: verify code]
  New password
  Confirm new password
  Reset password
  Return to sign-in

/auth/password/email
  Email
  Send reset link
  Confirmation state with delivery guidance

/reset-password/{token}
  New password
  Confirm new password
  Reset password
  Return to sign-in
```

## Anti-patterns to remove

- A sign-in page that treats SMS OTP, password, email, and Google as equal peer methods when only phone and email are product-supported methods.
- A phone OTP flow that requests a code but has no complete verification and password-reset state.
- Cross-page navigation solely to display the OTP challenge.
- Placeholder-only labels, unlabeled OTP inputs, or tabs without ARIA relationships and keyboard behavior.
- Blocking paste/autofill or imposing password complexity/rotation rules.
- Security questions, knowledge-based recovery, or CAPTCHA as the default abuse control.
- Login errors that reveal whether a phone/email account exists.

## Safe implementation checklist

1. Preserve the existing unified sign-in contract and remove only retired method-picker props/routes.
2. Add/align Inertia props so the sign-in page can represent `phone-password`, `phone-otp-pending`, and `email-password` without a new page for the challenge.
3. Complete phone recovery backend and frontend state transitions; do not couple password setting to email-only helpers.
4. Add behavior tests for method switching, password-first phone login, OTP fallback, expiry/resend/error states, email login, and both recovery paths.
5. Add accessibility assertions for labels, autocomplete, tab semantics or button semantics, focus order, and status announcements.
6. Run focused Pest tests, focused Vitest tests, TypeScript/build checks, Pint, and a browser smoke test for phone password → OTP fallback → sign-in plus email mode and recovery entry.

## Recommendation

The current direction is structurally sound and now close to a standard, defensible authentication UX. The highest-value next change is not another visual redesign: finish the phone recovery state machine and harden the method switcher/accessibility contract. After that, validate the complete journeys in browser and remove stale SMS/Google props and copy from the active sign-in surface.
