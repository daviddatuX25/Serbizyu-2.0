# Design — T1A Identity, onboarding, delegation, and recovery

Change ID: `t1a-identity-onboarding-delegation`

## 1. Intent and authority

Complete PROGRAM §T1A / Epic E1 so marketplace trains can trust account readiness and acting-for attribution. BMAD remains authority; this packet implements E1-S1–S4 without reopening the 58-table catalog.

## 2. Scope / non-goals

**In:** onboarding/readiness hardening, additive role assignments, consent grant/revoke, identity-verification gate (live collection fail-closed), ActorContext acting-for, Pest proofs, factory/seed path for test users.  
**Out:** T2 search/nearby, Reviews, live SMS, live government-ID enablement, Order/Work, UI redesign of existing hi-fi onboarding/browse/detail.

Activation default: phone OTP + onboarding always-on in local/CI; government-ID **live** intake denied unless explicit activation dimensions pass (none enabled in local defaults).

## 3. Actors and authorization matrix

| Actor | May | Must not |
| --- | --- | --- |
| Human (self) | Complete onboarding; grant/revoke own consents; hold additive roles | Impersonate; enable live ID by config alone |
| Agent (grantee) | Act within active consent scope on grantor resources | Exceed scope; retain power after revoke/expiry; hold money/goods custody by default |
| Admin (later) | Review identity evidence when activation allows | Auto-approve via AI-only path |
| System job | Expire consents / cleanup | Create consent without owner command |

Denials: non-enumerating `AUTHORIZATION_DENIED` / module `IdentityAccessError`.

## 4. Commands and queries

| Command | Idempotency | Notes |
| --- | --- | --- |
| `RequestPhoneOtp` / `VerifyPhoneOtp` | existing | Keep hashed OTP, attempt/expiry limits |
| `SaveOnboardingProfile` | optional key | Persist profile + additive roles; resume-safe |
| `GrantConsent` | scope+key | Owner grantor → Agent grantee |
| `RevokeConsent` | scope+key | Immediate; blocks future acting-for |
| `SubmitIdentityEvidence` | scope+key | Fail-closed unless activation allows |

Queries: `CurrentSession`, readiness projection, active consents for actor (owner view).

Kernel: mutable Identity commands that need replay safety should use T1 `IdempotencyGuard` + audit/outbox when writing durable grants/roles.

## 5. State / version model

**User:** `pending` → `active` (post verify) → `suspended`/`closed`/`archived`.  
**Readiness (profile):** incomplete fields → profile complete; listing/provider gates remain separate from identity-review status.  
**Role assignment:** `active` | `suspended` | `revoked` | `expired` (additive per `role_code`).  
**Consent grant:** `active` | `revoked` | `suspended` | `expired`.  
**Identity verification:** `pending` | `more_info` | `approved` | `rejected` | `expired` — distinct from session login.

Public trust badges must not claim stronger verification than performed (PRD-003).

## 6. Persistence / ERD delta

No new tables required for the first T1A slice. Uses existing:

- `users`, `user_profiles`, `auth_otps`
- `role_assignments`, `consent_grants`, `identity_verifications`
- T1 tables when commands are idempotent: `idempotency_keys`, `audit_events`, `outbox_messages`

Optional later: onboarding step ledger column/json — only if resume cannot be derived from profiles/roles.

## 7. Transaction and lock boundary

Grant/revoke consent and role upserts run in `DB::transaction`. Revoke updates status + `revoked_at` under row lock. Acting-for resolution re-reads active grant at command time (mutation-time recheck).

## 8. Event / consumer contract

Consent granted/revoked and role granted/revoked emit outbox events when wired through kernel writers. Projections must ignore duplicates via inbox when consumers appear.

## 9. Async / operations

Consent expiry may be a scheduled command later; first slice may evaluate expiry at read/assert time (`expires_at < now()` ⇒ treat inactive).

## 10. External adapter contract

- `OtpDeliveryChannel` — Fake/Mailpit/Log only in local.
- Evidence storage port for government-ID — **not enabled**; `SubmitIdentityEvidence` returns stable disabled error until T6 evidence port + activation.

## 11. Privacy / security

- No OTP codes in logs/responses (except FakeOtp peek tooling for local).
- Consent scopes are explicit JSON actions/resources; no “full account” wildcard in T1A.
- Cross-owner lookups non-enumerating.
- Agent actions always audit `actor_user_id` + `acting_for_user_id` + `grant_id`.

## 12. UX contract

Reuse existing hi-fi:

- Auth phone challenge
- AlmostThere / onboarding steps
- Browse + listing detail

New Agent consent management may ship lo-fi Inertia or API-first until T10. Props must expose: readiness status, role capabilities present, identity_review status separately, consent list for owner.

## 13. Verification matrix

| ID | Proof |
| --- | --- |
| T1A-01 | OTP verify creates session; suspended user cannot authenticate usefully |
| T1A-02 | Onboarding save is resume-safe; refresh keeps profile |
| T1A-03 | Provider onboarding yields additive `provide` (+ `buy` allowed) |
| T1A-04 | Grant consent → acting-for allowed for scoped action |
| T1A-05 | Revoke/expire consent → acting-for denied |
| T1A-06 | Live government-ID submit denied when activation off |
| T1A-07 | Existing FirstSlice / listing submit still passes |

## 14. Activation and rollback

- Live ID collection: denied by default (`SERBIZYU_*` activation / evidence class).
- Rollback = revert deploy; no schema drop. Consent revoke is the runtime disable path for Agents.

## 15. Implementation evidence

Pest under `tests/Feature/IdentityAccess/`; Pint dirty; no production migrate authorization.
