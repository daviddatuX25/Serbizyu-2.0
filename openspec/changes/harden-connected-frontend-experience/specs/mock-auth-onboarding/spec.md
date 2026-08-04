# Mock Authentication, Onboarding, and Formalization Capability

Status: PROPOSED
Change: `harden-connected-frontend-experience`
Trace: PRD-001–009; UX-001–004, UX-020; P-01–P-05; `users`, `user_profiles`, `role_assignments`, `identity_verifications`, `evidence_files`, `consent_grants`; planning-hardening FR-13–FR-14

## ADDED Requirements

### Requirement: Product mock authentication is separate from reviewer controls

ID: MFAO-REQ-001

The frontend SHALL maintain a product `AuthSession` distinct from Scenario Lab actor selection. Product login, logout, expiry, suspension, and route guards SHALL use the product session. Reviewer actor switching SHALL remain internal, visibly labeled, and absent from consumer navigation.

#### Scenario: Reviewer switch does not become product role switch

- GIVEN a reviewer opens `SCN-06`
- WHEN they switch from Owner to Agent in the Scenario Lab
- THEN the fixture facts and shared records remain stable
- AND the review context identifies the override source
- AND no Buyer/Provider/Agent selector appears in the consumer shell.

#### Scenario: Consumer opens protected route while signed out

- GIVEN no product mock session exists
- WHEN the user opens My Listings
- THEN the app routes to Login with the intended route preserved
- AND it does not silently assign the current reviewer actor as the logged-in user.

### Requirement: Fictional identifier and challenge login

ID: MFAO-REQ-002

The frontend SHALL provide a fictional identifier/challenge login flow backed by `AuthGateway`. It SHALL state that the challenge and delivery are simulated, SHALL store no plaintext password or real credential, and SHALL never claim an SMS was sent.

#### Scenario: Begin fictional login

- GIVEN a fixture account exists for a fictional identifier
- WHEN the user submits the identifier
- THEN a versioned expiring mock challenge is created
- AND the challenge screen says `Demo only — no SMS was sent`
- AND no real phone, provider call, password, or authentication token is created.

#### Scenario: Unknown fixture account

- GIVEN the identifier is not in the active scenario
- WHEN the user submits it
- THEN the screen preserves safe input
- AND explains that the account is unavailable in this fictional scenario
- AND offers demo-account help, retry, or public Browse where allowed
- AND does not reveal other fixture identifiers.

### Requirement: Challenge validation and recovery

ID: MFAO-REQ-003

The mock challenge SHALL support correct, incorrect, expired, already-used, retry-limited, unavailable, and recovery states. A successful challenge SHALL create one idempotent local mock session.

#### Scenario: Verify correct fictional code

- GIVEN a current unused challenge exists
- WHEN its fixture code is submitted
- THEN one mock session is created for the matching User
- AND the challenge is consumed
- AND duplicate submission returns the same session result without creating another session.

#### Scenario: Challenge expires

- GIVEN the fixture challenge expired
- WHEN the user submits its code
- THEN authentication is denied
- AND no product session is created
- AND start-over/recovery guidance is shown.

### Requirement: Session persistence, expiry, and logout

ID: MFAO-REQ-004

A product mock session SHALL persist through refresh, carry issued/expiry time and capabilities, expire deterministically, and support logout. Logout SHALL clear the product session and acting-for context without erasing shared scenario records.

#### Scenario: Refresh authenticated page

- GIVEN an unexpired product mock session exists
- WHEN the browser reloads
- THEN the same User remains authenticated
- AND the same authorized route may resume
- AND no reviewer actor or role is substituted.

#### Scenario: Session expires during a draft

- GIVEN a safe listing or request draft exists
- WHEN the session expires before submission
- THEN the draft remains preserved
- AND the app explains expiry and requests re-login
- AND the eventual command revalidates entity versions before applying.

#### Scenario: Log out while acting for Owner

- GIVEN an Agent product session has an active acting-for context
- WHEN the Agent logs out
- THEN both session and acting context clear
- AND the consent grant and prior actions remain in shared history.

### Requirement: Reviewer-only demo account assistance

ID: MFAO-REQ-005

The review build MAY expose fixture account cards or `Use demo code` only behind persistent reviewer labeling. Such controls SHALL be absent from a production adapter and SHALL not resemble normal account capability assignment.

#### Scenario: Use demo account helper

- GIVEN the reviewer opens Login in a review build
- WHEN they select `Use this fictional account`
- THEN the login identifier/challenge state is populated or completed through the mock adapter
- AND the page remains labeled as a review shortcut
- AND the resulting product session records `mock_login`, not a real credential event.

### Requirement: Resumable common onboarding

ID: MFAO-REQ-006

Authenticated accounts with incomplete setup SHALL have resumable onboarding covering profile, safe Tagudin area, language, access preferences, capability intent, applicable consent, assistance choice, identity status, and readiness. Progress and validation SHALL survive refresh.

#### Scenario: Resume interrupted onboarding

- GIVEN a user completed profile and capability intent but not consent
- WHEN they reload or return later
- THEN onboarding resumes at the consent step
- AND prior safe inputs remain
- AND completed steps are not falsely repeated or lost.

#### Scenario: Required field fails validation

- GIVEN the current step has invalid or missing required input
- WHEN the user continues
- THEN the step remains open with concrete correction
- AND safe values remain
- AND no downstream capability is marked ready.

### Requirement: Additive capability intent

ID: MFAO-REQ-007

Onboarding SHALL allow `request`, `provide`, and `agent-interest` capability intent to be selected additively. It SHALL not require an exclusive Buyer/Provider persona and SHALL not allow self-assignment of Admin capability.

#### Scenario: User wants to buy and provide

- GIVEN an authenticated account is onboarding
- WHEN the user selects both `I need something` and `I offer something`
- THEN both setup paths are available
- AND later Orders determine Buyer/Provider relationships per transaction
- AND no global role-mode switch is created.

#### Scenario: User attempts Admin selection

- GIVEN ordinary onboarding is open
- WHEN capability choices render
- THEN Admin is not an available self-service choice
- AND only an explicit audited fixture role assignment may create Admin access.

### Requirement: Buyer onboarding path

ID: MFAO-REQ-008

The Buyer path SHALL require only the approved minimum account/profile/privacy setup needed for discovery and request/order actions. It SHALL not force Provider identity or formalization steps.

#### Scenario: Buyer reaches readiness

- GIVEN the account has mock confirmation, basic profile, safe area, and request capability intent
- WHEN applicable consent is acknowledged
- THEN Buyer discovery/request readiness is shown
- AND Provider-only identity/formalization steps remain optional or not applicable
- AND the next action opens Browse or Create Request.

### Requirement: Self-managed Provider/Owner onboarding path

ID: MFAO-REQ-009

The self-managed Provider path SHALL explain listing, category, identity, safety, and publication requirements; allow safe draft creation where permitted; and distinguish draft readiness from active-publication eligibility.

#### Scenario: Identity review is pending

- GIVEN a Provider has an identity fixture in `pending_review`
- WHEN they complete listing details
- THEN the listing may be saved as a draft
- AND publication remains blocked with the exact missing gate
- AND the interface does not claim the Provider is verified or active.

#### Scenario: Provider readiness is complete in fixture

- GIVEN all approved fixture gates pass
- WHEN the Provider opens Readiness
- THEN `Create or manage listing` is the primary next action
- AND the allowed capabilities and remaining optional progression are shown separately.

### Requirement: Agent-assisted Owner onboarding path

ID: MFAO-REQ-010

An Agent MAY prepare an Owner profile/listing draft only within a fictional invitation/consent workflow. The Owner SHALL retain a separate account identity, review the Agent/purpose/scope/duration/notices, approve or decline, later log in independently, and pause/revoke/report.

#### Scenario: Agent prepares Owner draft before consent

- GIVEN an Agent started an invitation for Lola Nena
- WHEN the Agent enters profile/listing preparation information before Owner confirmation
- THEN the records remain nonpublic drafts
- AND no active consent grant exists
- AND the Agent cannot access unrelated Owner resources.

#### Scenario: Owner confirms assistance

- GIVEN the Owner reviews the Agent identity, purpose, scope, duration, and notice behavior
- WHEN the Owner confirms the fictional grant
- THEN one active versioned Consent Grant is created
- AND the Owner remains the account/resource Owner
- AND the Agent receives only the approved permissions.

#### Scenario: Owner independently signs in

- GIVEN an Agent is actively helping the Owner
- WHEN the Owner logs in through their own fixture account
- THEN the Owner sees the same resources and Agent-attributed history
- AND may approve, correct, pause, revoke, or report according to the contract.

### Requirement: Agent onboarding and capability gate

ID: MFAO-REQ-011

An Agent-interest account SHALL complete applicable profile, identity-review fixture, assistance-boundary explanation, and explicit Admin/fixture capability approval before accessing managed Owner data. No grant means no Owner-specific access.

#### Scenario: Agent has no active grant

- GIVEN the account has Agent capability but no active Owner consent
- WHEN the Agent opens Agent Today
- THEN the workspace shows no Owner-private tasks
- AND offers invitation/help/training-status next steps
- AND does not seed unrelated Owner data.

#### Scenario: Agent identity review needs information

- GIVEN the Agent verification fixture is `action_required`
- WHEN the Agent attempts to manage an Owner
- THEN management is blocked
- AND the exact fixture requirement and review/help route are shown
- AND no false live identity decision is claimed.

### Requirement: Identity review is truthful and privacy-bounded

ID: MFAO-REQ-012

Identity onboarding SHALL explain purpose, consent, access, retention/deletion, manual-review fallback, pending/more-information/approved/rejected states, and help. Until approved infrastructure exists, the frontend SHALL use synthetic metadata/placeholders and SHALL not collect or display real government-ID/selfie evidence.

#### Scenario: Open identity requirement

- GIVEN the Provider fixture requires identity review
- WHEN the identity screen renders
- THEN it explains what would be required and why
- AND labels the current evidence as fictional
- AND exposes no real upload success or public trust claim.

#### Scenario: Fixture review requests more information

- GIVEN an Admin fixture requests additional information
- WHEN the user returns to identity status
- THEN the exact non-sensitive fixture reason and next step are shown
- AND prior decision history remains visible
- AND the user can reach help.

### Requirement: Formalization progression is separate and policy-gated

ID: MFAO-REQ-013

The frontend SHALL model formalization progress separately from identity verification. It MAY present Entry, Growth, and Registered Business as conceptual educational stages only when persistent policy-review wording is shown. It SHALL NOT invent tax exemptions, income/payout caps, badges, ranking benefits, document requirements, or legal approval.

#### Scenario: Provider opens formalization progression before policy approval

- GIVEN Gate A has not passed
- WHEN the Provider opens the progression screen
- THEN the screen shows educational stage intent and `Policy review pending`
- AND real submission/approval/unlock controls are unavailable
- AND identity status remains separate.

#### Scenario: Identity approved but formalization not started

- GIVEN a fixture identity review is approved
- AND formalization is not started
- WHEN readiness renders
- THEN identity capability and formalization status are shown independently
- AND the UI does not infer business registration from identity approval.

### Requirement: Readiness summary and safe next action

ID: MFAO-REQ-014

Onboarding and Me SHALL provide one readiness summary that lists enabled, conditional, blocked, action-required, and deferred capabilities with the smallest valid next action. It SHALL not collapse verification, formalization, Agent grant, listing review, or Admin assignment into a single `verified` state.

#### Scenario: Mixed readiness

- GIVEN a user may request, has a Provider listing draft, awaits identity review, and has no Agent grant
- WHEN Readiness renders
- THEN request capability is enabled
- AND listing publication is blocked by identity review
- AND Agent assistance is shown as not configured
- AND formalization is separately optional/policy-gated
- AND one useful next action is primary.

### Requirement: Auth, onboarding, scenario, and reviewer storage are isolated and recoverable

ID: MFAO-REQ-015

Mock auth session, account-scoped onboarding progress, normalized scenario facts, and reviewer perspective SHALL use separately versioned storage boundaries. Corruption or schema mismatch in one boundary SHALL NOT silently authenticate another account, transfer ownership/grants, or erase unrelated valid fixture state. Recovery SHALL explain and reset only the affected boundary where safe.

#### Scenario: Auth storage is corrupt

- GIVEN the stored product session cannot be parsed or has an unsupported schema version
- WHEN the application starts
- THEN the product session resets to signed out with an explanation
- AND scenario facts, Owners, grants, Orders, and reviewer selection remain unchanged
- AND no fixture account is automatically chosen.

#### Scenario: Onboarding storage is incompatible

- GIVEN one account’s onboarding progress uses an unsupported schema
- WHEN that account resumes onboarding
- THEN the affected onboarding progress offers an explained restart/migration path
- AND the authenticated User and marketplace aggregates remain distinct
- AND another account’s onboarding state is not changed.

### Requirement: Return routes, multi-tab changes, and network boundaries are safe

ID: MFAO-REQ-016

Login return targets SHALL be validated against internal registered routes. Auth logout/expiry changes SHALL synchronize safely across tabs or produce deterministic revalidation before protected commands. The deterministic auth/identity adapter SHALL make no real network request.

#### Scenario: Malicious external return target

- GIVEN Login receives an external, protocol-relative, script, or unknown return target
- WHEN authentication succeeds
- THEN the target is rejected
- AND the app routes to the authorized Home or Readiness page
- AND no open redirect or script navigation occurs.

#### Scenario: Another tab logs out

- GIVEN the same mock session is open in two tabs
- WHEN one tab logs out or expires the session
- THEN the other tab denies the next protected query/command and returns to Login
- AND safe draft input is preserved where allowed
- AND no command is applied using the invalid session.

#### Scenario: Identity fixture action is submitted

- GIVEN the deterministic frontend is active
- WHEN a user begins login, confirms a demo account, or changes fictional identity-review state
- THEN the deterministic gateways update local fixture state only
- AND no SMS, email, identity, password, or recovery network request is sent
- AND the persistent fictional boundary remains visible.
