# Connected Frontend Story Integration Matrix

Status: E0-S1 integration record; not a commitment to implement later product stories
Authority: rebuilt BMAD artifacts + `harden-connected-frontend-experience` OpenSpec package

## Disposition vocabulary

- **sufficient** — E0-S1 provides the required backend/application seam now.
- **harden** — later story/change must implement behavior against the seam; this slice adds only the contract if needed.
- **deferred** — explicitly outside E0-S1 and must not be implied complete.
- **out-of-scope** — prohibited by the canonical story boundary (live money, real credentials, sensitive IDs, deployment).

## Matrix

| Requirement IDs | Existing BMAD epic/story | Disposition | Frontend responsibility | Backend responsibility in/after E0-S1 | Shared command/query/event contract | Schema impact | Tests | Sequence |
|---|---|---|---|---|---|---|---|---|
| CFP-REQ-001..010 | E0-S1; later E0-S3 and connected frontend change | harden | Existing `frontend/` remains reference; later frontend uses typed gateway and entity IDs | Establish application envelope, correlation, idempotency, stable errors, Inertia data boundary; no scenario repository migration | `CommandEnvelope`, `Query`, `DomainEvent`, `AuditContext`, `CorrelationId`, `ErrorEnvelope` | Reserve audit/outbox/idempotency/checkpoint touchpoints; no migrations | architecture, envelope, correlation, Inertia smoke | 1: E0-S1 seam; later connected frontend gates |
| MFAO-REQ-001..016 | E1-S1/E1-S3/E1-S4; connected frontend Phase 5 | deferred | Later mock-auth UI must keep product session separate from reviewer controls and never claim SMS/real identity | E0-S1 only provides auth-context/authorization seams and disabled provider policy; no auth implementation | `AuthorizationContext`, `AuthRequired`/`SessionExpired` stable errors, audit event | future `users`, `identity_verifications`, `consent_grants`, `audit_events` | later auth/onboarding tests; E0 denial/error contract only | after E0-S1, E1 |
| APA-REQ-001..014 | E1-S4; connected frontend Agent phase | deferred | Later UI preserves account capabilities and acting-for context; no Agent screen duplication | E0-S1 provides authorization and audit context types, not grants | command actor + acting-for owner + grant reference + correlation | future `role_assignments`, `consent_grants`, `notifications` | later grant/denial/audit tests | after E1 foundation |
| CMJ-REQ-001..019 | E2/E3/E4/E5; connected frontend phases 6–11 | deferred | Existing frontend remains unchanged; later frontend routes by stable entity IDs and separate Order/Work/Payment | E0-S1 creates module seams and read/command separation only | commands target aggregate/id/version; queries return authorized view models; events append facts | future listings/orders/work/payment/evidence/audit/outbox tables | E0 architecture + Inertia smoke; later journey tests | after E0-S2/S3 and domain stories |
| RBQ-REQ-001..011 | E2-S3/E2-S4 for Request/Quote; E3-S1 only when acceptance forms an Order | deferred | Later request/quote pages use typed gateway; no bid behavior now | E0-S1 only supplies generic command/query/event/authorization boundary | `CreateRequest`, `SubmitQuote`, `AcceptQuote` are future contracts; no handlers now | future `requests`, `quotes`; acceptance later creates `orders` and `order_terms_snapshots` | later quote/version/idempotency tests | after identity/listing stories; Order formation follows accepted Quote |
| QDS-REQ-001..008 | E9-S2 Online Quick Deal activation; connected frontend Quick Deal phase | deferred/out-of-scope for live behavior | Existing standalone frontend remains reference; no Quick Deal migration | E0-S1 exposes no Quick Deal/domain handler; adapter/provider policy blocks live payment | future `StartQuickDeal`, `JoinQuickDeal`, `ConfirmQuickDeal`, result event; fixture-only later | future Quick Deal session representation + normal orders; no schema now | E0 forbidden-feature scan; later fixture/idempotency/version tests | after E3/E4/E6 and Gate B |
| AOP-REQ-001..020 | E6-S1..S5; connected frontend Admin phase | deferred | No Admin UI or consumer role switch now | E0-S1 gives authorization/audit/error seams and safe health endpoint only | future scoped operation commands with reason/version/confirmation/correlation | future operational/audit/outbox/cohort tables | E0 authorization denial; later operations/audit/retry tests | after E0–E5 |
|| DCL-REQ-001..008 | E0-S2 foundation contract; later E9-S5 bounded coordination slice and E9-S6 activation review | foundation-approved; functionality later; pilot-gated | Must remain absent from normal pilot navigation and no feature code is added in E0-S1. Later UI uses stable Chain/Need/Invitation/Order IDs and explicit acting-for context | E0-S1 adds no feature. E0-S2 consumes the propagated four-table foundation and lineage contract; later bounded functionality uses existing Request/Quote/Order/Work services | `CreateDealChain`, `OpenDealNeed`, `AddDealDependency`, `SendDealInvitation`, `RespondDealInvitation`, `FormChildOrder` are later backend-shaped commands; E0-S1 only preserves envelope seams | Four foundation tables plus nullable lineage on `requests`, `quotes`, and `orders`; no additional financial/parent-liability tables | E0 scope scan; later cycle/idempotency/authorization/child-isolation/replacement/partial-completion tests | foundation before E0-S2; requires a new bounded story/authority update (not E9-S1); bounded feature after ordinary spine; pilot activation separately gated |

## Requirement-to-story notes

1. **E0-S1 is a foundation story, not a connected frontend feature story.** The OpenSpec package remains proposed and its product tasks are not checked off here.
2. The matrix intentionally maps every requested capability family without converting the OpenSpec task list into new stories.
3. The only frontend behavior implemented in this slice is a minimal server-rendered Inertia shell carrying safe page data, plus no product screens/auth/listings/Quick Deal/Admin.
4. The canonical UUIDv7/native-UUID decision in `07-schema-implementation-and-erd-contract.md` is preserved for future entities; no domain migrations are created now.
5. All fixture/test evidence produced by this slice is synthetic and classified `CAPSTONE` or `TEAM_TRAINING`; none is genuine pilot evidence.
