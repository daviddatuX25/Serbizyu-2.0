# Incompatibility Review — Work Architecture Spine

## Scope and method

This review constructs downstream units that each satisfy the Work Architecture Decisions (WADs) and inherited platform decisions, then checks whether their cross-module contracts still compose. The gaps below are architectural blockers for implementation because each pair can be implemented exactly as written while producing incompatible state, events, or ownership behavior.

## Findings

### High — Define a single execution-time reservation mutation contract

**Incompatible pair:** A3 Appointment rescheduling and A4 Handoff preparation/cancellation.

**Evidence:** WAD-4 says `capacity_intents` are derived by the shape contract (lines 164–188), WAD-7 makes formation atomically commit reservations (lines 235–242), and WAD-10 classifies a schedule occurrence as a Work event while deferring capacity release to an explicit owning policy (lines 267–278). A3 can therefore implement `RescheduleAppointment` as an OrdersWork event followed by a Listings reservation move, while A4 can implement cancellation as an OrdersWork event followed by an asynchronous Listings release; both obey the WADs. They do not define whether the Work event and reservation replacement/release are one transaction, who owns the transition, or which lock order applies after formation. A retry/crash between the Work event and the capacity mutation can leave the old appointment slot committed or the handoff quantity unavailable/released incorrectly, causing double-booking or leaked capacity.

**Smallest tightened rule:** Add one typed, transaction-bound `CapacityMutationPort` contract for execution and amendment: the owning Work command must atomically append the Work event and replace/release/commit the reservation under the inherited `capacity → Order → Work` lock order; asynchronous consumers may reconcile but may not be the first writer of a reservation transition. Every capacity-affecting shape must declare the reservation identity and its allowed mutation transitions.

### High — Make external candidate-to-fact verification a named owner and envelope

**Incompatible pair:** A3 calendar/attendance integration and A1 permit/inspection integration feeding PaymentObligations or DealCoordination.

**Evidence:** WAD-11 allows Work and Evidence to publish facts and lets obligations depend on Work/fact keys (lines 280–286); WAD-12 says external statuses are candidates until an owned policy validates and maps them to a domain fact (lines 288–295); and WAD-13 lists evidence/fact verification and external agency status as ports without defining a fact owner or payload (lines 297–308). An A3 implementation can map a verified calendar attendance callback to `attended` in OrdersWork, while an A1 implementation can persist a permit `approved` callback as a TrustSupport evidence fact after human review; each is compliant. A downstream obligation or Chain gate has no normative distinction between candidate, verified, and superseded facts, no canonical source/account/object binding, and no stable fact-key namespace, so it can release/unblock on the A3 candidate path or fail to match the A1 verified path. The same external status can also be reprocessed by both modules with different idempotency identities.

**Smallest tightened rule:** Define one `VerifiedWorkFact` contract owned by a named module/port (with `work_id`, stable namespaced `fact_key`, status `candidate|verified|rejected|superseded`, policy version, source/account/object, raw-payload hash, evidence references, and idempotency key). Only that owner may emit facts consumable by PaymentObligations or DealCoordination; external adapters and shape modules may submit candidates, and consumers must reject non-verified statuses.

### High — Close the common lifecycle vocabulary and terminal mapping

**Incompatible pair:** A3 no-show and A9 digital-artifact rejection/acceptance.

**Evidence:** WAD-3 assigns shape-specific semantics (lines 138–160), WAD-8 promises a small common lifecycle while delegating allowed commands, transitions, failure/cancellation semantics, and projections to each shape (lines 244–250), and WAD-10 says each shape defines failed/retry/reschedule/cancelled/completion impacts (lines 267–278). An A3 contract can make `no_show` terminal `cancelled` and emit `cancelled`; an A9 contract can make an artifact `rejected` a retryable `blocked` state and emit only after later acceptance; both satisfy those rules. Yet the spine never enumerates the common states, terminality, or required mapping for Order completion, Chain gates, projections, and obligation predicates. A consumer using a generic `completed`/`cancelled` transition therefore cannot safely distinguish a terminal no-show from an artifact still awaiting revision, and a shared recovery or payment policy can treat equivalent-looking shape events differently.

**Smallest tightened rule:** Specify a closed common Work lifecycle and a mandatory shape-to-common mapping, including terminality and completion/failure/cancellation fact emission. Cross-module gates, PaymentObligations, and Order projections may consume only the common states/facts, never shape-local event names.

### Medium — Fix idempotency scope and fingerprint ownership

**Incompatible pair:** Direct Booking formation and Quote/Deal-Chain child formation, both invoking `FinalizeOrderAgreement`.

**Evidence:** WAD-7 requires a canonical idempotency fingerprint in `OrderFormationPlan` and atomic persistence of an idempotency response (lines 222–242), while the inherited rules require an idempotency key on commands and owner/client-scoped idempotency for integrations (platform spine AD-5 lines 116–120; AD-11 lines 156–160). The Work spine does not define the key namespace, target scope, canonical fingerprint inputs, or which module owns replay lookup. A Direct Booking implementation can scope `(actor, idempotency_key)` and include its A3 payload; a Chain child implementation can scope `(Order, idempotency_key)` and include only source/terms; both satisfy the text. The same retry can then create duplicate Orders/Work/obligations under one scope or return a cached result for a materially different plan under the other; two concurrent formation sources can also falsely conflict on a key that is valid in the other scope.

**Smallest tightened rule:** Define formation idempotency as unique on `(command_code, authenticated_client_or_first_party_adapter, idempotency_key)` with a canonical fingerprint over the complete discriminated plan (source/version/hash, parties/acceptance, terms, every Work envelope, obligations, reservations, and policy pins); a reused key with a different fingerprint must return stable `idempotency_conflict`, and all formation callers must use this single registry.

### Medium — Assign one owner and CAS contract for source Work drafts

**Incompatible pair:** Listing-backed authoring and DealNeed-backed authoring.

**Evidence:** WAD-1 says source modules own editable Work Specification Drafts but `OrdersWork` owns normalized envelopes (lines 110–115); WAD-4 permits `source_type`/`source_id` in the envelope (lines 164–188); and the data-model consequences allow `work_specifications` or an equivalently named source-authoring aggregate without selecting its owner or mutation API (lines 372–384). A Listings unit can persist and CAS-edit a listing draft, while a DealCoordination unit can persist a Need draft in its own table and expose a different version/hash or copy semantics; both comply. The resolver/finalizer then has no guaranteed common identity/version/authorization contract for stale-input detection, template provenance, amendment, or replay, and a shared `WorkSpecificationPort` has no draft mutation operation to enforce one behavior.

**Smallest tightened rule:** For each discriminated source type, name the sole source-module owner and require a shared versioned `WorkSpecificationDraft` read/CAS contract (stable family ID, immutable business version, mutable row version, canonical payload/hash, owner/ACL, and source lineage); no module may create a second draft table or mutation semantics for the same source type, and `WorkSpecificationPort` must resolve only through that owner.

## Conclusion

The spine has strong ownership intent and good rejection boundaries, but the listed pairs expose missing enforceable contracts at the exact seams where downstream shape units meet. Until the tightened rules are promoted into the shared contracts/data model, independent A1/A3/A4/A9 implementations can each pass their local WAD checks while disagreeing on reservation atomicity, verified facts, lifecycle terminality, formation replay, and draft ownership.
