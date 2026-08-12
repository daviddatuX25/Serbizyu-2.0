# Capability Spec — Identity, onboarding, delegation, and recovery

Change ID: `t1a-identity-onboarding-delegation`  
Capability: `identity-onboarding-delegation`  
Stories: `E1-S1`–`E1-S4`

## ADDED Requirements

### Requirement: Additive role capabilities

The system MUST model Buyer/Provider/Agent/Admin capabilities as additive `role_assignments`, not a mutually exclusive user role column.

#### Scenario: Provider onboarding grants provide without removing buy eligibility

- **Given** an authenticated user completing onboarding with provider intent
- **When** readiness is saved
- **Then** an active `provide` role assignment exists
- **And** a `buy` capability MAY also be active (additive)
- **And** no single `users.role` column is introduced

---

### Requirement: Consent grant and revocation for acting-for

Owner-scoped consent MUST authorize Agent acting-for only while the grant is active and unexpired. Revocation MUST block future commands immediately while preserving attribution history.

#### Scenario: Active grant allows scoped acting-for

- **Given** owner A granted agent B an active consent for a scoped resource/action set
- **When** B asserts acting-for A with that grant reference
- **Then** the assertion succeeds
- **And** audit attribution can record actor B and acting-for A

#### Scenario: Revoked grant blocks acting-for

- **Given** the same grant is revoked
- **When** B asserts acting-for A with that grant reference
- **Then** the assertion fails with a non-enumerating authorization denial
- **And** the historical grant row remains queryable as revoked

---

### Requirement: Identity review is distinct from login

Login success MUST NOT imply government-ID approval or public verified badges beyond what was performed.

#### Scenario: Live evidence collection disabled by default

- **Given** local/CI defaults with no live identity-collection activation
- **When** a client attempts to submit live government-ID evidence
- **Then** the command is rejected as disabled/unavailable
- **And** no sensitive evidence file is stored

---

### Requirement: Existing hi-fi auth/onboarding remains operable

Phone OTP and onboarding HTTP contracts used by the existing hi-fi UI MUST keep working for the provider listing first slice while T1A hardens backend services.

#### Scenario: First-slice regression

- **Given** a disposable database with migrations applied
- **When** phone OTP verify and onboarding save run as today’s UI expects
- **Then** the session is authenticated and provider readiness allows listing workspace flows
- **And** FirstSlice / MyListings Pest suites still pass

---

## Placement notes (non-requirements of this change)

- Customer **Reviews** after completed Work are specified under PRD-047 and implemented in **T6**, not T1A.
- **Nearby / Tagudin discovery** server search is **T2**; geography remains Tagudin-scoped (BR-010).
