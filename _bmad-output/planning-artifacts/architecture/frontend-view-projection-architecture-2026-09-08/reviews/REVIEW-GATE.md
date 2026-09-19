# Architecture Reviewer Gate

Date: 2026-09-08  
Target: `../ARCHITECTURE-SPINE.md`

## Inputs

Four independent read-only passes challenged the draft:

1. Architecture-spine rubric and breadth review.
2. Current repository reality review.
3. Projection authorization/privacy review.
4. Cross-slice divergence attack review.

All four returned **REVISE** on the draft. The architect applied every high-priority finding before finalization.

## Findings and dispositions

| Finding | Disposition in final architecture |
| --- | --- |
| Production projection boundary could place raw private records in browser memory. | AD-4 and AD-10 now require Laravel server-side authorization and purpose projection before Inertia serialization; production browser code only validates the safe envelope and cannot use the local projector. |
| Client-carried actor, acting Owner, grant, and generic dispatch create a confused deputy. | AD-6, AD-9, and AD-18 split untrusted `CommandIntent` from trusted execution context and require one explicit registry mapping/handler plus below-transport reauthorization. |
| Acting-for context lacked overlap, self-award, grant-source, and revocation rules. | AD-3 models principal, effective Owner, current grant/version, relationship set, and purpose separately; IdentityAccess resolves grants; dual-party control/self-award fail closed; projection identity includes grant version. |
| Sealed protection covered fields but not derivative channels. | AD-15 covers queries, aggregates, ordering, timing, errors, notifications, operations, exports, logs, analytics, cache, prefetch/history, and async response races; production activation remains deny-by-default while reveal policy is unresolved. |
| Scenario Lab separation was descriptive rather than enforceable. | AD-7 and AD-19 require server/build-controlled composition, import isolation, separate reviewer application/origin/runtime state, synthetic-origin enforcement, schema validation, repository CAS, and bounded reset/failure behavior. |
| Projection envelopes could evolve incompatibly across slices. | AD-5 and AD-18 establish a central resource/schema registry, exhaustive vocabularies, explicit omission semantics, and safe `projection_unsupported` recovery. |
| Action codes could map differently in production and Scenario adapters. | AD-6 and AD-18 establish one `ActionDispatchRegistry` with owner, target, command/navigation, payload/result schema, revision source, and invalidation set. |
| Cache identity omitted viewer, grant, policy, and query dimensions. | AD-4 and the consistency conventions define the complete projection query identity and mandatory invalidation boundaries. |
| Immutable business/source version and mutable aggregate revision were conflated. | AD-14 separates stable source/business versions, mutable row revision, envelope schema version, and policy versions. |
| Feature breadth omitted Activity, support/safety, Quick Deal, identity/onboarding, and operations ownership. | Capability map now names their architecture owners and binding parent/local ADs; Deferred explicitly states which require later vertical OpenSpec packets. |
| Brownfield reality was misstated and cutover ownership was vague. | Source convention records `resources/js` as production and `frontend/src` as retained non-production reference; AD-16 names the cutover files and clean-removal rule. |
| Parent bindings were incomplete for later slices. | Frontmatter and inherited table now bind parent AD-3, AD-7, AD-9, AD-19, and AD-23–AD-29 in addition to prior invariants. |

## Gate evidence

- Architecture lint: 0 findings.
- OpenSpec strict validation: valid.
- No unresolved `TBD`, `TODO`, placeholder, or assumption markers in the architecture/OpenSpec packet.
- Companion design, projection matrix, and first child OpenSpec packet were reconciled with the final security, version, cache, dispatch, and composition boundaries.

## Verdict

**PASS AFTER REVISION.** The draft reviewer verdicts are preserved above; the final architecture incorporates their blocking findings rather than suppressing or deferring them.
