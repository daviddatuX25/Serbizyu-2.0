# Data Integrity Review — Work Architecture Spine

Review scope: relational lineage, immutable versions, canonical hashing, same-Order provider/cardinality constraints, Work event ordering/idempotency, formation atomicity, and obligation-to-fact relationships.

## Findings

### High — Bind the accepted Work specification to the accepted terms and source rows

**Sections:** WAD-4 (canonical envelope), WAD-7 (typed formation plan), Data Model Consequences.

The envelope carries `source_type/source_id/source_business_version` and a `specification_hash`, while the formation plan separately carries an accepted-terms input and `canonical terms hash`; the spine never requires the terms snapshot to commit to the exact specification-version/hash for each `fulfillment_unit_key`, nor does it define a typed relational FK from that polymorphic source tuple to the immutable source/specification-version row. A caller can therefore submit two individually valid hashes for different Work payloads (or a generic source ID/version that is not relationally tied to the claimed source) and form an accepted Order whose commercial terms, executable Work structure, and provenance disagree. Subsequent re-resolution cannot establish which promise was accepted, making execution and amendment/reconciliation irreconcilable.

**Smallest enforceable correction:** require the canonical terms preimage to contain an ordered Work-set manifest mapping every `fulfillment_unit_key` to its exact specification-version ID and hash, require each accepted Work row to reference that manifest/version through a same-Order composite FK, and model source-specific lineage (or an equivalent typed association) so `source_id + business_version` is database-enforced rather than a polymorphic pair.

### High — Persist and enforce the accepted Work-set cardinality and responsible-provider invariant

**Sections:** WAD-2 (same-Order multiple Work), WAD-7 (formation plan), Data Model Consequences.

WAD-2 requires one responsible provider and permits additional Work only for a finite keyed set, but the schema consequences specify only a `fulfillment_unit_key` plus uniqueness “within an Order”; they do not define an immutable order-level Work-set manifest/cardinality policy, a required provider key on each Work, or a composite database guard tying every Work to the Order’s responsible provider and accepted terms. A later or concurrent command can thus insert a new unique Work key under an accepted Order (or attach an obligation to a different provider-scoped Work) without violating the stated uniqueness, leaving an accepted Order with unpriced/unrequired fulfillment or ambiguous liability and close/settlement behavior.

**Smallest enforceable correction:** persist the accepted Work-key set and cardinality mode in the immutable terms snapshot, require each Work to FK to `(order_id, terms_snapshot_version, fulfillment_unit_key, responsible_provider_id)`, enforce one responsible-provider identity per Order, and allow additions only through a new accepted amendment manifest/new Order.

### High — Replace unbound Work/fact predicates with immutable obligation fact bindings

**Sections:** WAD-11 (payment consumes facts), WAD-7 (obligation specifications), Data Model Consequences.

The obligation contract permits a finite set **or predicate** of required Work/fact keys and says only that an “explicit obligation-to-required-Work/fact policy relation” must exist; it does not define a stable fact-key/event-ID relation or require the settlement decision to persist the exact Work events/evidence that satisfied the pinned policy. With multiple Work under one Order, a predicate can match a different Work’s event, a later replacement, or a superseded fact, and a release decision cannot be reproduced from the accepted obligation snapshot. This can authorize settlement against the wrong fulfillment unit or leave two evaluators with different due results.

**Smallest enforceable correction:** store one versioned obligation-condition manifest with explicit `(obligation_id, order_id, work_instance_id, fact_key/event_type)` rows and fixed all-of/any-of semantics, enforce same-Order composite FKs, and record the immutable satisfying Work-event IDs/evidence verification outcomes atomically before eligibility/capture. If code-owned predicates remain, persist their versioned output and exact event IDs rather than evaluating an open-ended event stream.

## Areas checked with no additional gap

Inherited AD-18/AD-25 supplies aggregate-sequence allocation under mutation locks, transactional audit/idempotency/outbox writes, ordered inbox gap parking, and one formation transaction. WAD-8 correctly carries those rules into Work execution; no separate event-ordering finding is raised beyond the missing Work/fact binding above.
