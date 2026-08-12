# T1A — Identity, onboarding, delegation, and recovery

Status: ACTIVE LLD/OpenSpec  
Plane: `C`, `T`, `S`  
Story refs: `E1-S1`, `E1-S2`, `E1-S3`, `E1-S4`  
Train: `T1A`  
Change ID: `t1a-identity-onboarding-delegation`  
Depends on: T1 GO (`t1-application-kernel-spine`)

## Why

Phone OTP + a single onboarding POST already exist for the first listing slice. Before T2 discovery and T3 Orders depend on account readiness and Agent acting-for, IdentityAccess must become the authoritative E1 path: additive capabilities, consent grants, identity-review separation, and fail-closed government-ID collection.

## What changes

1. Harden multi-step onboarding persistence and readiness projection (resume-safe; identity review ≠ login ≠ listing ready).
2. Additive Buyer / Provider (and later Agent/Admin) capabilities via `role_assignments` — never a single exclusive role column.
3. Owner-scoped `consent_grants` commands: grant, revoke, expiry; ActorContext `acting_for` only when grant is active.
4. Government-ID / identity verification workflow seams with live sensitive collection disabled until activation gate.
5. Prefer Laravel factories/seeders for local/test identities; stop expanding permanent fixture repositories.
6. Pest proofs for OTP→onboarding resume, additive roles, consent revoke blocks acting-for, and live ID collection deny.

## Non-goals

- No T2 server search/nearby ranking or new browse PLP rewrite (reuse existing hi-fi browse/detail).
- No customer Reviews (PRD-047 → T6 after completed Work).
- No live SMS provider; keep FakeOtp / Mailpit channels.
- No Agent money/goods custody; no impersonation.
- No production or legal live ID collection enablement.
- No T3 Order formation.

## UI stance

Existing hi-fi onboarding, browse, and listing-detail surfaces stay. T1A prefers **backend contracts + thin adapters**; UI changes only when props/commands require them. Lo-fi is acceptable for new Agent/consent admin surfaces until T10 polish.

## Authority (frozen SHAs at packet authoring)

| Artifact | SHA-256 |
| --- | --- |
| `prd-rebuilt.md` | `31deb49d783a3e1dcc1dad32fd1b24b9ca929283ef45dcc20e61feb5fa2cb4a9` |
| `PROGRAM-IMPLEMENTATION-PLAN.md` | `50f7aca1d63e0373f0d6e3db6f96fdc247cf0d9105a87a78e33e00d74c6ed092` |
| `FOUNDER-DECISION-BRIEF.md` | `e7d6bb2c71f96dfc566c03ba036d1776a57d748017add13d4070c69c29851bab` |
| `ux-spec-rebuilt.md` | `137524a13f370da42ef168fa3b1a430f86383ca3788e421409073ad320c74b6f` |
| `domain-state-contracts-rebuilt.md` | `6c266a69c5f6ea2d84a991481287c50197c0177232d9a690815587b5ab827e65` |

## Deferred feature placement (explicit — not forgotten)

| Capability | Train | Note |
| --- | --- | --- |
| Tagudin discovery + **server** search/filter/sort/cursor | **T2** | Nearby = Tagudin/barangay-scoped supply; not a free-world GPS product yet |
| Customer **Reviews** after completed interaction | **T6** | PRD-047; eligibility after Work complete |
| Quick Deal | **T5** (needs T3) | Order formation |
| Deal-Chaining | **T8** | After ordinary Order/Work evidence |

## Success

IdentityAccess owns readiness, roles, consent, and identity-review gates. Listings and later modules consume Shared ActorContext + deny-by-default checks; they do not invent parallel auth stories.
