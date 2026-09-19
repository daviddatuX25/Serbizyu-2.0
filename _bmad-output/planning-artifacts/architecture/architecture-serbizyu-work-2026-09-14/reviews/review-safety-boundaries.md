# Safety Boundary Review — Work Architecture Spine

## Verdict before correction

**Revise before handoff.** Ownership direction was sound; five controls were declarations rather than enforceable seams.

## Findings applied

### High — Authorization and consent decision seam

Formation carried actor/acting-for references, but the execution interface could trust caller-provided identity or controller-only checks. Required correction: server-derived command context and a Shared IdentityAccess-owned, versioned, expiry/revocation-aware authorization/consent decision for authoring, template copy/promotion, formation, execution, amendment, cancellation, evidence read/export, and external mutation.

### High — Verified facts needed anti-replay binding

External signals could be replayed across Work, asset, permit, appointment, location, or consent scope. Required correction: a scoped `VerifiedFactRef` binding authority owner, account, Order/Work/subject/asset/location, fact key/version, issuer/source object/hash, evidence versions, verifier/policy, times/freshness, intended use, idempotency, and active/superseded/revoked status. Candidate or mismatched facts fail closed.

### High — Safety stops needed mandatory runtime evaluation

Pinned policy alone cannot handle current license revocation, expired consent, contraindication, fraud, or new legal/safety deny. Required correction: a current deny-only safety decision before every safety-relevant command; deny wins, unavailable/stale/unknown fails closed, and latches require authorized clearance with explicit cancellation/refund effects.

### High — Due-condition selection could weaken payment floors

Caller-selected policies and generic predicates could release on permissive facts. Required correction: retained code-owned, expression-free due-condition policy IDs/versions selected server-side from capability/shape/lane allow-lists, bounded `all_of`/`any_of` fact manifests, non-weakenable approval/Hold/Dispute floors, and immutable satisfying event/evidence bindings.

### Medium — Template promotion could leak regulated data

Full-draft promotion could copy client identifiers, evidence, consent, access grants, locations, secrets, or sensitive free text into reusable content and broad projections. Required correction: profile-defined reusable-safe subsets, subject rebinding, protected owning stores, opaque references, redacted audit/idempotency/outbox projections, and explicit retention/purge/legal-hold behavior.

## Resolution

All five corrections were incorporated into WAD-5, WAD-7, WAD-11, WAD-12, WAD-13, WAD-15, the deep-module interfaces, module graph, data-model consequences, UI handoff, and verification gate before final handoff.
