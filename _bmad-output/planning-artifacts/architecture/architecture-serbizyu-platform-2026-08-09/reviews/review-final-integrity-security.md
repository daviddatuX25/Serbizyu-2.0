# Final Integrity and Security Readiness Review

> **Disposition (2026-08-10): CLOSED.** This file preserves the pre-reconciliation finding baseline. FIS-01–FIS-10 were applied and independently rechecked; the current verdict is in [`FINAL-READINESS-REPORT.md`](../FINAL-READINESS-REPORT.md).

**Review date:** 2026-08-09  
**Canonical scope:** `canonical-schema-rebuilt.md` (58-table inventory and amendments), `domain-state-contracts-rebuilt.md` §16, `adr-catalog-rebuilt.md` ADR-R-032–040, `ARCHITECTURE-SPINE.md` AD-5–29, and `PROGRAM-IMPLEMENTATION-PLAN.md` T0–T9/§6–9. Earlier reviews were used only to confirm disposition.  
**Historical verdict at review time:** **NO BLOCKER; 9 HIGH and 1 MEDIUM implementation-divergent findings remained.** The reconciled package was materially stronger, but its schema acceptance gate had not yet been met for the affected trains.

**Fix classes**

- **CLEAR DOCUMENT/SCHEMA FIX:** the accepted authorities already decide the behavior; make the persistence/ownership/train contract executable.
- **FOUNDER DECISION:** the authorities currently permit incompatible policies; the choice must be made before the schema or LLD can encode it.

## Remaining findings

### FIS-01 — T6 may activate real payment lanes before balanced financial posting exists

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/PROGRAM FIX**
- **Divergence and failure path:** T6 is expressly intended to make External Cash and External Digital Proof operational and records declarations, acknowledgments, mismatches, and corrections, but balanced transaction posting and three-way reconciliation first appear in later T7A. One implementer can ship T6 as event-only payment truth; another must build the ledger in T6 to satisfy the domain/ADR. The event-only interpretation permits an acknowledged or corrected obligation to exist without the immutable financial transaction required for reconciliation.
- **Exact evidence:**
  - `PROGRAM-IMPLEMENTATION-PLAN.md:226-244` makes the two real pilot lanes operational and owns their payment events/corrections, but names no `financial_transactions`/`financial_entries` posting or reconciliation exit evidence.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:246-255` defers “one immutable financial transaction per effect” and three-way reconciliation to T7A.
  - `domain-state-contracts-rebuilt.md:704-706`, `adr-catalog-rebuilt.md:330-336`, and `ARCHITECTURE-SPINE.md:227-231` require every money effect to produce one balanced, idempotency-linked transaction and reconciliation to compare obligation/event, provider, and ledger.
- **Required fix:** Move the provider-neutral posting API, immutable source/effect identity, per-currency balance/account checks, and obligation↔event↔ledger reconciliation baseline into T6, or make T6 activation depend on completion of that bounded T7A slice. State which External Cash/Proof events are accounting effects and supply their entry templates; “no commission receivable” must not mean “no ledger truth.”

### FIS-02 — `provider_events` cannot durably prove business binding or semantic replay suppression

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and abuse path:** The provider-event row records provider/event ID and an authenticated flag, but not the authenticated provider account, environment, object, owner, amount/currency, verification material, or stable business-effect identity. A valid event for the wrong merchant/object or a second event ID for the same effect can therefore pass the only declared uniqueness constraint. Implementers may hide binding in payload JSON, use transient adapter checks, or create relational columns, producing incompatible reconciliation and replay behavior.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:752-767` lists only provider, provider event ID/type, payload reference, authenticated/processing status, times, and related obligation/transaction; its only declared uniqueness is `(provider, provider_event_id)`.
  - `canonical-schema-rebuilt.md:982-986` separately requires no duplicate business-effect identity, but no table definition supplies that identity or its unique key.
  - `domain-state-contracts-rebuilt.md:707`, `ARCHITECTURE-SPINE.md:257-261`, and `PROGRAM-IMPLEMENTATION-PLAN.md:253-255` require canonical-byte verification plus account/environment/object/owner/amount/currency/transition binding and a stable business-effect key before any effect.
- **Required fix:** Add typed provider account, environment, provider object, owner/obligation, amount, currency, expected transition, canonical-payload hash/signature metadata, replay timestamp/window result, and `business_effect_key` fields. Define uniqueness for provider event identity and semantic business effect, immutable verification outcomes, quarantine/reconciliation states, and the one transaction that records provider receipt, payment effect, financial transaction, audit/idempotency, and outbox.

### FIS-03 — Credentials are not bound to the immutable scope grant they authenticate

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and abuse path:** The client has a mutable `scope_version`, while a credential has no granted-scope-version reference. One implementation will authorize an old credential against current client scopes, so expanding the client silently expands every unexpired credential; another will snapshot scopes per credential. Rotation lineage/state is also only implied by timestamps. This defeats the accepted prevention of scope expansion and makes overlap/revocation behavior incompatible.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:220-230` places `granted_scopes`/`scope_version` on `integration_clients`, but `integration_credentials` has no immutable grant version, state, predecessor/successor, or explicit overlap end.
  - `ARCHITECTURE-SPINE.md:155-159` requires every credential to carry an immutable granted-scope version, bounded overlap, and immediate fail-closed revocation.
  - `domain-state-contracts-rebuilt.md:686-693` defines the credential lifecycle and says authentication derives an immutable granted-scope version.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:324-327` makes wrong-environment/revoked/expired rejection and expiring audited overlap exit evidence.
- **Required fix:** Add a credential→immutable scope-grant/version FK (or an immutable normalized grant record), explicit credential state, rotation predecessor/successor, overlap end, and lifecycle checks. Define authorization as the intersection of the credential grant and any current restrictive client policy; client scope expansion must require new credentials, while reduction/revocation must invalidate existing credentials immediately across workers/caches.

### FIS-04 — Evidence has no canonical relational subject/purpose binding for retrieval authorization

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and abuse path:** `evidence_files` records an owner and a vague access policy but no subject aggregate, purpose, or constrained attachment. Yet retrieval must authorize current aggregate participants/admin purpose, and evidence may support many aggregate types. Implementers can authorize only the uploader, place polymorphic IDs or policy in JSON, or infer access by ad hoc reverse joins. A guessed P3 evidence ID can consequently be evaluated against different principals depending on the module.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:389-409` defines owner, storage metadata, class, scan, visibility/access policy, retention, and deletion, but no purpose or subject/attachment FK.
  - `canonical-schema-rebuilt.md:971-975` requires an evidence-subject index, and `canonical-schema-rebuilt.md:1059-1070` says Evidence supports Identity, Listing, Work, Payment, Dispute, Safety, Support, Approval, and Activation under purpose/data-class access; neither section identifies the relation being indexed.
  - `domain-state-contracts-rebuilt.md:708`, `ARCHITECTURE-SPINE.md:257-261`, and `PROGRAM-IMPLEMENTATION-PLAN.md:232-237` require purpose/aggregate-scoped authorization at grant and retrieval.
- **Required fix:** Choose and specify one relational evidence-attachment model: typed constrained attachment rows, or explicit subject FKs owned by each supported aggregate with a canonical resolver. Define purpose, subject owner/participants, data class, grant identity/expiry, hold lookup, and denial semantics. Do not bury the authorization subject in unconstrained JSON; if a new attachment table is chosen, update the accepted table count and generated ERD atomically.

### FIS-05 — Outbox persistence omits the causal ordering fields required by every consumer

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and failure path:** The outbox definition names aggregate and payload version but omits event contract version, aggregate version/sequence, causation, actor/client, effective time, and payload hash. The inbox requires those fields and applies only the next sequence. Implementers can serialize them inside opaque payload, derive sequence from mutable aggregate version, or add relational columns; concurrent events may then duplicate or omit a sequence, leaving consumers permanently gapped or allowing projection/webhook order to diverge.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:901-905` defines the transactional outbox without the required ordering/causality columns or uniqueness.
  - `canonical-schema-rebuilt.md:259-263` requires inbox uniqueness by consumer/aggregate/sequence, while `canonical-schema-rebuilt.md:971-972` requires outbox and inbox aggregate-sequence indexes.
  - `domain-state-contracts-rebuilt.md:678-680`, `adr-catalog-rebuilt.md:322-328`, and `ARCHITECTURE-SPINE.md:197-201` require event/payload versions and a durable aggregate sequence with gap parking and idempotent replay.
- **Required fix:** Amend `outbox_messages` with the full canonical envelope as typed columns and unique `(aggregate_type, aggregate_id, aggregate_sequence)` plus event-ID uniqueness. Define how the sequence is allocated under the aggregate lock, how outbox insertion shares the state transaction, and how inbox effect plus next-sequence checkpoint commits before acknowledgment.

### FIS-06 — Activation precedence and temporal exclusivity are undefined

- **Severity:** HIGH
- **Fix class:** **FOUNDER DECISION** for precedence; **CLEAR DOCUMENT/SCHEMA FIX** for enforcement
- **Divergence and abuse path:** The domain says the “most specific” deny wins but does not define specificity, whether a broad incident deny overrides a narrower enable, or how same-fingerprint overlapping decisions are ordered. The schema’s “unique active fingerprint/effective version” does not define a current row or prevent overlapping effective ranges. During containment, one evaluator can honor a narrow owner/client enable while another treats the broad provider/lane deny as absolute, so queued or adapter-originated irreversible effects behave differently.
- **Exact evidence:**
  - `domain-state-contracts-rebuilt.md:695-700` defines the dimension tuple and “most specific current non-expired deny wins” without a complete selection/tie algorithm.
  - `canonical-schema-rebuilt.md:265-269` stores nullable dimensions, fingerprint, decision, times, and supersession, but specifies only “unique active fingerprint/effective version.”
  - `ARCHITECTURE-SPINE.md:251-255` and `PROGRAM-IMPLEMENTATION-PLAN.md:420-427` require every adapter to evaluate the same gate immediately before mutation.
- **Required decision/fix:** Decide whether any matching broader deny is absolute or may be overridden by a narrower enable; define dimension weights, wildcard/NULL semantics, ties, expiry boundaries, and effect-specific financial deny precedence. Then specify a deterministic query and enforce one current decision or non-overlapping effective range per fingerprint, with serializable/locked supersession and queued-effect recheck.

### FIS-07 — The schema cannot represent the mandated independent live-money approval quorum

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX** for the already accepted live-money rule
- **Divergence and abuse path:** Live connected-money activation requires independent founder, financial, security, and operations approvals, but `command_approvals` has one approver and one unique idempotency identity, with no approval request/group, required role, quorum, or distinct-role constraint. One implementer can treat one approval as sufficient; another may create multiple unrelated approvals that cannot be proven to bind the same activation payload.
- **Exact evidence:**
  - `ARCHITECTURE-SPINE.md:185-189` requires all four independent approvals on the immutable lane/environment activation.
  - `canonical-schema-rebuilt.md:265-275` gives activations generic “approval references” and each approval one initiator/approver, but no group/quorum/role model.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:373-385` repeats plural activation approvals while retaining the singular approval row contract.
  - `adr-catalog-rebuilt.md:354-360` requires exact maker/checker approval and atomic consumption.
- **Required fix:** Model an exact approval request/command fingerprint with child attestations (or an equally explicit grouping), required approver roles/quorum, uniqueness per approver and role, independence/incompatibility rules, expiry/revocation, and one atomic consumption of the satisfied approval set with activation. A generic list of approval IDs or repeated idempotency keys is insufficient.

### FIS-08 — Credential maker/checker policy conflicts with the owner self-service train

- **Severity:** HIGH
- **Fix class:** **FOUNDER DECISION**
- **Divergence and abuse path:** AD-29/ADR-R-038 classify credential actions under deny-by-default maker/checker separation, but the domain matrix grants the owner “recent step-up,” and T9 gives that same owner issue/rotate/revoke commands with step-up only. Because organization/team tenancy is deferred, a second owner-side checker may not exist. One implementation will allow a stepped-up owner to mint submission/capacity credentials; another will require an operations checker, yielding incompatible authorization and UX.
- **Exact evidence:**
  - `ARCHITECTURE-SPINE.md:263-267` and `adr-catalog-rebuilt.md:354-360` include credential actions in the maker/checker set.
  - `domain-state-contracts-rebuilt.md:711-719` gives owner credential/scope/activation changes “Recent step-up” and mentions a separate approver only for expansion/live-money activation in the admin/operations column.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:300-322` assigns client scope choice and credential issue/rotate/revoke to the owner UI, requiring step-up for issuance/scope expansion, while only service-principal credential administration is absent.
- **Required decision:** State exactly which owner credential operations require only step-up and which require an independent checker: initial issuance, rotation, revocation, scope reduction, scope expansion, webhook signing-secret changes, and environment changes. Name the checker authority for single-human accounts and define fail-safe emergency revocation that cannot be blocked by an unavailable checker.

### FIS-09 — Capability-profile business-version identity is still not executable

- **Severity:** HIGH
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and failure path:** The extension says capability profiles have immutable business versions and listing versions pin them, but the base table still exposes one ambiguous `version`, and the `listing_versions` definition contains no category/profile business-version keys. Implementers may treat `capability_profiles.version` as `row_version`, store each business version in the same table under a versioned code, or create another version table. Accepted eligibility and safety/lane policy can therefore point to mutable or structurally incompatible identities.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:447-465` defines `capability_profiles` with a generic `version`; `canonical-schema-rebuilt.md:489-504` does not list category/profile version FKs on `listing_versions`.
  - `canonical-schema-rebuilt.md:278-281` later asserts separate business/row versions and exact category/profile pinning without supplying the required columns, candidate keys, or FKs.
  - `domain-state-contracts-rebuilt.md:649-656`, `ARCHITECTURE-SPINE.md:121-125`, and `adr-catalog-rebuilt.md:306-312` require stable family identity, immutable business-version identity, and separate `row_version`.
- **Required fix:** Define the capability-profile family/business-version storage model, exact column names/types, immutability boundary, candidate key, current-version relation, and composite FKs from listing versions and accepted terms. Update the base table sections rather than relying on a cross-cutting prose amendment.

### FIS-10 — Concurrent OTP issuance can leave multiple pending challenges

- **Severity:** MEDIUM
- **Fix class:** **CLEAR DOCUMENT/SCHEMA FIX**
- **Divergence and abuse path:** The extension relies on an application transaction to invalidate prior pending challenges before inserting a new one, but supplies neither a pending status/invalidation timestamp nor a uniqueness/lock rule. Two simultaneous issue commands can both observe no pending row and insert valid challenges; verification and attempt limits then differ depending on which row an implementation selects.
- **Exact evidence:**
  - `canonical-schema-rebuilt.md:200-204` defines `auth_otps` with only nullable `consumed_at` and says the application transaction invalidates prior pending challenges; no pending identity or concurrent uniqueness is defined.
  - `canonical-schema-rebuilt.md:1074-1078` says every table must have executable checks/uniqueness and matching concurrency/state semantics before implementation design.
- **Required fix:** Define the challenge state/invalidation field, one-pending-challenge identity and verification selection rule per normalized phone/purpose. Enforce issuance under a phone/purpose lock or a database-enforced current-row key, and atomically consume/increment attempts so a challenge cannot be accepted twice.

## Earlier findings explicitly confirmed resolved

| Earlier finding(s) | Current disposition |
|---|---|
| Canonical 46/47 count and incomplete integration delta | **Resolved:** ADR-R-040 and schema §2.2 now establish 47 observed + 11 additions = 58 with ownership, retention, migration order, and ERD generation. |
| Capacity identity, reservations, Deal replacement/Request–Quote lineage, same-Order terms/Work/Obligation linkage, and ledger-account currency | **Resolved:** schema §2.2 amendments and AD-26 now require the composite guards and per-currency posting. Capability-profile pinning remains only as FIS-09. |
| Reconciliation as a non-blocking job and monolithic payment kill switch | **Resolved:** domain §16.7, AD-19/AD-23, and T7 define mismatch-blocked three-way reconciliation plus effect-specific gates that preserve intake/query/recovery. T6 sequencing remains FIS-01. |
| Outbound webhook SSRF | **Resolved:** AD-13, domain §16.7, and T9 require IPv4/IPv6 private/reserved/metadata denial, DNS/redirect revalidation, address pinning, TLS/port/time/size bounds, and fail-closed evidence. |
| Cross-owner integration IDOR | **Resolved:** AD-11, integration composite owner/client guards, authenticated-principal owner derivation, and non-enumerating endpoint evidence now align. |
| AI/general-consent authority | **Resolved:** AD-29, domain §16.6/§16.8, and T9 bind confirmation to a single-use exact approval and keep high-risk commands absent by default. |
| Evidence quarantine/active-content delivery controls | **Resolved at the delivery boundary:** AD-28 and T6 now specify quarantine, scanning, isolated no-store retrieval, and active-content denial. Subject/purpose persistence remains FIS-04. |
| Credential lifecycle, provider-event binding, and separation-of-duties intent | **Resolved in authority but not fully in persistence/policy:** the remaining executable divergences are FIS-02, FIS-03, FIS-07, and FIS-08. |
| Atomic final Order formation and reservation concurrency | **Resolved:** domain §16.2–16.3, ADR-R-033, AD-5/AD-9/AD-25, and T3 define one lock-ordered PostgreSQL transaction with rollback-on-any-child-failure and exactly-once reservation release. |

## Coverage conclusion

- **No BLOCKER was found.**
- **HIGH findings remain**, so the package cannot yet be called implementation-ready for the affected T1/T2/T6/T7/T9 boundaries.
- Founder decisions are limited to **FIS-06 activation precedence** and **FIS-08 credential maker/checker scope**. The other findings are clear propagation/schema fixes from already accepted authority.
- No additional finding survived for Order-formation atomicity, reservation oversell/double release, same-parent/Order relational lineage, per-currency ledger balance, webhook SSRF, authenticated owner derivation, AI authority, evidence quarantine, or effect-specific financial containment beyond the gaps identified above.
