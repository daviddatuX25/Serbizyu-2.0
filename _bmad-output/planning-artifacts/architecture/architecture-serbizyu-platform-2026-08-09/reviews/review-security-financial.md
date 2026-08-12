# Security and Financial Integrity Review

**Target:** `ARCHITECTURE-SPINE.md`  
**Companion:** `PROGRAM-IMPLEMENTATION-PLAN.md`  
**Verdict:** **HOLD — not ready for finalization.** The spine has sound separation-of-truth, sandbox, idempotency, and service-principal intentions, but it omits enforceable rules at the highest-risk sinks: ledger posting, account isolation, webhook egress, evidence delivery, AI confirmation, live-money promotion, and incident containment. All findings below are **high severity** and have a credible abuse or failure path.

## Coverage

| Required area | Findings |
|---|---|
| Credential issuance, rotation, revocation, scopes, secret storage | SF-05 |
| Replay, inbound webhook authenticity, outbound webhook SSRF | SF-03, SF-06 |
| Tenant/account isolation and authorization | SF-04 |
| Ledger, reconciliation, refund/release integrity | SF-01, SF-02, SF-10 |
| Evidence privacy, access, scanning, retention | SF-07 |
| Xendit sandbox/Tiwala/live-money boundary | SF-06, SF-09 |
| AI authority and human confirmation | SF-08 |
| Operations, incident gates, privileged actions | SF-10, SF-11 |

## Findings

### SF-01 — No delivery train owns the canonical double-entry ledger invariant

- **Severity:** High
- **Disposition:** **Clear autofix**; canonical authority already decided this.
- **Affected AD:** AD-4, AD-14, AD-18, AD-19
- **Abuse/failure path:** A duplicate, reordered, refunded, or manually corrected payment event reaches the Payment module; the plan updates the obligation/provider event but no train is required to post one balanced, idempotent ledger transaction in the same boundary. Application balances and provider balances can then diverge, and a later release/refund can use incomplete financial truth.
- **Nearby controls:** AD-14 requires canonical append-only payment events; AD-18 atomically commits state/audit/idempotency/outbox. Neither names financial transactions/entries. T7C mentions only “ledger corrections.”
- **Evidence:**
  - `PROGRAM-IMPLEMENTATION-PLAN.md:29` acknowledges that ledger tables exist but the payment module does not.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:220-237` makes T6 own real Cash/Proof obligations and corrections without a ledger deliverable.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:243-260` gives T7 provider events and ledger corrections without initial posting/account invariants.
  - `ARCHITECTURE-SPINE.md:174-184,198-208` omits the accepted double-entry rule from AD-14/AD-18/AD-19.
  - Canonical `adr-catalog-rebuilt.md:124-138`, `canonical-schema-rebuilt.md:594-640`, and `epics-and-stories-rebuilt.md:373-384` require append-only balanced transactions linked to source event and idempotency key.
- **Required architecture rule:** Every money effect, including fee, refund, reversal, release, payout, chargeback, and correction, MUST create exactly one immutable financial transaction linked to its canonical source event and idempotency key; posting MUST atomically enforce debit=credit per currency, and corrections MUST be linked compensating transactions rather than status or balance overwrite. Assign this explicitly to T6 before any payment lane is activated.

### SF-02 — Reconciliation is a job name, not a release-blocking state contract

- **Severity:** High
- **Disposition:** **Clear autofix** for the invariant; founder input is needed only for operational thresholds and approval roles.
- **Affected AD:** AD-4, AD-14, AD-16, AD-19
- **Abuse/failure path:** A delayed, orphaned, partially refunded, fee-adjusted, or mismatched provider event enters the admin queue; because resolution states, authoritative inputs, and approval effects are undefined, an operator can mark it resolved without reconciling obligation, provider object/settlement, and ledger. Tiwala can then release an incorrect amount or recipient exposure.
- **Nearby controls:** T7 requires a reconciliation job and mismatch queue; the canonical release contract requires a reconciled amount, but the plan never defines what “reconciled” proves or how a mismatch may be closed.
- **Evidence:**
  - `PROGRAM-IMPLEMENTATION-PLAN.md:245-255` specifies `reconcile` plus a mismatch queue only.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:259` makes release eligibility depend on a simulation but gives no reconciliation state machine.
  - Canonical `domain-state-contracts-rebuilt.md:473-488` requires atomic amount reconciliation and no prior release.
  - Canonical `architecture-rebuilt.md:254-267` requires operators to inspect provider events, ledger entries, adjustments, and mismatches.
- **Required architecture rule:** Reconciliation MUST be an explicit state machine comparing canonical obligation/event, provider object and settlement/query truth, and posted ledger transaction. Orphan, amount/currency/recipient, fee, duplicate-business-effect, refund, reversal, and stale-window mismatches MUST block release and payout. Manual resolution MUST append reason, evidence, actor, approver where required, and resulting correction transaction; it MUST NOT rewrite source truth.

### SF-03 — Owner-controlled webhook delivery creates an SSRF primitive

- **Severity:** High
- **Disposition:** **Clear autofix**.
- **Affected AD:** AD-13, AD-19, AD-21
- **Abuse/failure path:** An account with `webhooks:manage` registers an HTTPS hostname that resolves, redirects, or later rebinds to loopback, RFC1918, link-local, container/service, or cloud-metadata addresses. The outbox worker then sends signed application data to an internal target or uses its network position to invoke internal services.
- **Nearby controls:** The plan requires HTTPS outside local, endpoint ownership confirmation, event allow-list, rate limits, retries, and signed payloads. None prevents server-side request forgery; ownership confirmation can itself be the first unsafe request.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:168-172` requires signed outbound webhooks but has no egress rule.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:301,311` grants owner-controlled webhook management.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:363-368` requires only HTTPS, ownership confirmation, and an event allow-list for subscriptions.
- **Required architecture rule:** Webhook subscription validation and every delivery attempt MUST resolve and reject loopback, private, link-local, multicast, reserved, Unix-socket, and metadata destinations for both IPv4 and IPv6; MUST revalidate after DNS resolution and before connect; MUST reject redirects or revalidate every hop; MUST pin the validated address for the connection; and MUST enforce TLS verification, restricted egress, port policy, connect/read timeouts, response-size limits, and audit-safe error capture.

### SF-04 — Account isolation is asserted in policy prose but not made an invariant of IDs, mappings, cursors, or projections

- **Severity:** High
- **Disposition:** **Clear autofix**.
- **Affected AD:** AD-10, AD-11, AD-12, AD-21, AD-22
- **Abuse/failure path:** A valid service principal supplies another account’s listing, Order, Work, mapping, cursor, or internal resource UUID to a scoped endpoint. The architecture says to check owner authorization but does not require that owner context be derived exclusively from the authenticated client or that mapping/internal-resource relationships be constrained to that owner. A missed policy scope becomes cross-account read/write IDOR.
- **Nearby controls:** AD-11 assigns one owner and explicit scopes; the API sequence verifies owner/scope; business records retain a human owner. Those are application intentions, not a cross-account persistence/query invariant.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:150-166,216-226` defines account ownership and common authorization but no non-bypassable owner predicate.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:363-375` gives integration tables owner/client FKs, but object mappings can name internal IDs without an owner-consistency constraint.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:389-405` accepts target resources after client authentication but does not prohibit request-selected owner context.
- **Required architecture rule:** Every partner query and command MUST derive owner account from the authenticated integration client, never from request data. Every resource lookup, mapping, cursor, idempotency key, and webhook subscription MUST be scoped by that owner/client before authorization and mutation. Cross-owner references MUST be rejected with non-enumerating errors and, where relationally possible, enforced by composite keys/FKs. Authorization evidence MUST include negative cross-account tests for every endpoint and projection, including guessed UUIDs, stale mappings, cursors, and webhook events.

### SF-05 — Credential lifecycle does not bind authority at issuance or guarantee immediate revocation

- **Severity:** High
- **Disposition:** **Founder decision** for step-up method and rotation window; **clear autofix** for fail-closed lifecycle semantics.
- **Affected AD:** AD-11, AD-12, AD-19, AD-21
- **Abuse/failure path:** A compromised owner session issues a long-lived client secret; or a secret minted under read-only client scopes later inherits newly expanded write scopes because scopes live on the client rather than an immutable credential grant. During overlap or cache lag, a revoked credential remains usable to mutate listings/capacity.
- **Nearby controls:** Hashed, rotatable, revocable credentials; expiry/revocation/last-used fields; overlapping rotation; shown-once UX; scope plus owner checks. Missing are step-up issuance, entropy/format, audience/environment, immutable granted-scope version, maximum overlap, cache invalidation, and compromise procedure.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:156-160,216-220` states credential properties but not issuance/revocation semantics.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:297-321` exposes create/issue/rotate/revoke flows and initial scopes.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:363-364` stores scopes on clients and permits overlapping credential rotation without a bound.
  - Canonical `epics-and-stories-rebuilt.md:105-116` requires external secret storage, log redaction, and documented rotation/revocation.
- **Required architecture rule:** Credential issuance and scope expansion MUST require a recent, attributable human step-up and rate limit. A credential MUST have an unguessable verifier, public selector, environment/audience, issued/expiry timestamps, and an immutable granted-scope version. Scope reduction and revocation MUST fail closed immediately across caches/workers; scope expansion MUST NOT silently expand an existing credential. Plaintext MUST be shown once, never recoverable or logged, and stored only as a strong hash or secret-manager reference. Rotation overlap MUST be bounded and observable, with a tested compromised-key revocation path.

### SF-06 — Provider webhook verification is not bound to account, environment, or business effect

- **Severity:** High
- **Disposition:** **Clear autofix**.
- **Affected AD:** AD-14, AD-15, AD-16, AD-18
- **Abuse/failure path:** A valid delayed/replayed sandbox event, a second provider event ID representing the same business effect, or an event for a different provider account is authenticated and mapped to an obligation by externally supplied identifiers. Unique `(provider,event_id)` blocks only an identical event ID; it does not prove provider account, sandbox/live environment, obligation ownership, amount/currency, or one-time business effect.
- **Nearby controls:** Signature verification before financial effect, unique event identity, idempotency tests, raw-payload retention, and sandbox-only production disablement.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:174-190` requires authenticity and sandbox separation only at a high level.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:243-255` requires verify-webhook and unique provider/event identity but not account/environment/business-effect binding.
  - Canonical `canonical-schema-rebuilt.md:642-657` requires uniqueness and authenticity, but the spine must supply the missing adapter contract.
- **Required architecture rule:** Provider verification MUST use provider-documented canonical raw bytes, algorithm/header allow-list, constant-time comparison, timestamp/replay window where supported, key/account identity, and explicit sandbox/live endpoint and secret separation. Before any effect, the authenticated provider account/environment, provider object, obligation owner, amount, currency, and expected transition MUST match. A stable business-effect idempotency key MUST suppress semantically duplicate events even when event IDs differ; malformed/oversized/unauthenticated input MUST be quarantined without domain effect.

### SF-07 — Evidence access is not sufficiently constrained to prevent S0 disclosure or active-content delivery

- **Severity:** High
- **Disposition:** **Clear autofix** for storage/delivery rules; founder/privacy input for retention periods and admin-access policy.
- **Affected AD:** AD-4, AD-7, AD-19, AD-20
- **Abuse/failure path:** A participant or support user obtains an evidence ID outside their Order/Work relationship, or shares a reusable signed URL; alternatively an uploader supplies active HTML/SVG/polyglot or malware that is served inline before a clean scan. The result is sensitive evidence disclosure, stored script execution, or malware delivery. Deletion can also be claimed while copies persist without a backup/purge contract.
- **Nearby controls:** Private storage, metadata, validation, scanning state, signed access, least-privilege access logging, retention/deletion/hold, and schema rules against public storage keys. The plan does not define subject/actor authorization at issue and fetch time, quarantine, safe serving origin/headers, signed-link lifetime, or admin reason/approval.
- **Evidence:**
  - `PROGRAM-IMPLEMENTATION-PLAN.md:220-237` lists evidence components but not enforceable delivery guards.
  - `ARCHITECTURE-SPINE.md:128-136,204-214` mentions secure access/retention only generically.
  - Canonical `prd-rebuilt.md:234-245` requires validation, malware scanning, masking/redaction guidance, access logging, retention/deletion, and holds.
  - Canonical `canonical-schema-rebuilt.md:279-299` requires private storage metadata and clean scanning before sensitive use.
  - Canonical `architecture-rebuilt.md:401-430` classifies sensitive evidence exposure as S0 and requires an upload kill switch.
- **Required architecture rule:** Evidence MUST remain quarantined and inaccessible until byte-signature/type/size validation and required malware scanning pass. Authorization MUST be evaluated against subject aggregate, participant/admin purpose, data class, hold, and current actor at both access-grant and retrieval time. Storage keys MUST be server-generated and private; delivery MUST use short-lived, non-cacheable links through an isolated origin with safe `Content-Disposition`, MIME-sniffing disabled, and active content disallowed or safely transformed. Granted/denied/admin access, reason, download, deletion, hold, and purge MUST be auditable; retention and backup deletion semantics MUST be explicit.

### SF-08 — AI “human confirmation policy” is configurable authority, not a non-bypassable capability boundary

- **Severity:** High
- **Disposition:** **Founder decision** on allowed AI tools/actions; **clear autofix** for confirmation binding and deny-by-default enforcement.
- **Affected AD:** AD-10, AD-11, AD-12
- **Abuse/failure path:** Prompt-injected listing, message, evidence metadata, or webhook content causes an AI adapter to propose and submit a command. Because “draft/help actions may require confirmation” and high-impact actions depend on an unspecified policy, the adapter can treat model output or a stale/general confirmation as authority to publish, form an Order, disclose scoped data, or change capacity.
- **Nearby controls:** AI shares service-principal/owner scopes and application ports; the plan states AI cannot publish, charge, release, resolve disputes, or consent without explicit human-authorized policy. It does not define which principal the AI uses, what data it may retrieve, or how confirmation is bound.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:150-166,318-319` routes AI through the common application seam.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:39-48` says AI has no special authority but leaves the domain amendment pending.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:297-321,401-406` uses “may require” and policy-controlled confirmation.
  - Canonical `prd-rebuilt.md:59` excludes AI decisions for money, identity, consent, dispute, and publication.
- **Required architecture rule:** Model output MUST never constitute authentication, consent, or approval. AI access MUST use a distinct auditable principal with an explicit deny-by-default tool/read allow-list and owner-bound projections; untrusted content MUST not alter tool policy. Every human-confirmed command MUST carry a server-issued, short-lived, single-use confirmation artifact bound to human actor, client, exact normalized command/payload hash, target/version, and risk policy. Publication, identity, money, consent, dispute, credential, evidence-disclosure, and hold actions MUST remain prohibited unless a founder-approved matrix explicitly permits proposal plus this exact human confirmation.

### SF-09 — “G6” is a checklist reference, not an enforceable live-money promotion boundary

- **Severity:** High
- **Disposition:** **Founder decision required** for approvers/accountability; architecture autofix for enforcement.
- **Affected AD:** AD-2, AD-14, AD-16, AD-19
- **Abuse/failure path:** An operator deploys production credentials or flips a capability/environment flag after sandbox tests but before legal, accounting, security, refund, reconciliation, and operations evidence is approved. Because no signed gate record, approver quorum, environment/account separation, or runtime assertion is required, configuration alone can turn a sandbox path into real money movement or misleading live metrics.
- **Nearby controls:** AD-16 says sandbox-only until G6; T7 requires production credentials/effects disabled; the canonical architecture lists G6 evidence. These are prose barriers without a promotion mechanism.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:186-190,323-328` blocks production on G6 but defines no gate artifact or authority.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:262-268` requires only that production credentials/effects remain disabled at T7 exit.
  - Canonical `architecture-rebuilt.md:471-481` lists provider, legal/accounting, KYC, authenticity/reconciliation, refund/chargeback, console, monitoring/runbooks, rehearsal, and user-comprehension evidence.
  - Canonical `epics-and-stories-rebuilt.md:599-603` leaves connected-money G6 preparation future.
- **Required architecture rule:** Live connected money MUST require an immutable, lane/environment-specific activation record referencing current G6 evidence, named accountable owner, independent approvers (founder plus designated financial/security/operations roles), approval/expiry, provider account and credential identifiers, cohort, rollback, and incident owner. Sandbox and live MUST use separate provider accounts, credentials, endpoints, data classification, metrics, and feature flags; production secrets MUST be unavailable to sandbox runtimes. Default-deny runtime and persistence checks MUST reject live effects unless the active record and cohort/lane/environment all match.

### SF-10 — A single payment/provider kill switch can strand in-flight obligations and block refunds/reconciliation

- **Severity:** High
- **Disposition:** **Founder/operations decision required** for emergency authority; clear architecture fix for split controls.
- **Affected AD:** AD-16, AD-19
- **Abuse/failure path:** During provider compromise or mismatch, operations disables the provider adapter/payment lane. If the switch blocks all traffic, inbound status events, provider queries, refunds, reversals, and reconciliation also stop, stranding already-held funds and hiding provider truth. If it blocks nothing in flight, queued create/release jobs can continue moving money after containment.
- **Nearby controls:** T7 requires one provider kill switch; AD-19 requires rollback/disable; the canonical architecture names separate holds and adapter/lane switches but does not state drain behavior.
- **Evidence:**
  - `PROGRAM-IMPLEMENTATION-PLAN.md:251-255` names a provider kill switch without operation-specific semantics.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:327-338` defers runbooks/training to T10.
  - `ARCHITECTURE-SPINE.md:204-208` requires disable behavior generically.
  - Canonical `architecture-rebuilt.md:420-430` lists lane, obligation-hold, provider-adapter, and upload switches separately.
- **Required architecture rule:** Financial containment MUST use independent, fail-closed controls for new intents/charges, release/payout, refunds/reversals, outbound jobs, inbound event intake, provider status query, and reconciliation. Disabling new money movement MUST preserve authenticated inbound recording, read/query, reconciliation, and an explicitly authorized refund/recovery path. Queued work MUST re-check the current gate immediately before effect. Runbooks MUST define in-flight obligation disposition, hold placement, drain/cancel behavior, user communication, and recovery verification.

### SF-11 — High-risk admin actions lack separation of duties and cannot safely close their own evidence trail

- **Severity:** High
- **Disposition:** **Founder decision required** for maker/checker roles and thresholds.
- **Affected AD:** AD-4, AD-18, AD-19
- **Abuse/failure path:** One compromised or malicious admin can inspect private evidence, clear a hold, resolve a reconciliation mismatch, approve a financial adjustment, and trigger release/refund, while the architecture requires only permission, reason, and audit. Attribution records the abuse but does not prevent the same actor from creating the predicate and executing the money/evidence effect.
- **Nearby controls:** Separate domain states, append-only audit, reason/permission for high-risk actions, holds, and admin inspection. No incompatible-role or dual-approval invariant exists.
- **Evidence:**
  - `ARCHITECTURE-SPINE.md:110-114,198-208,230-243` separates truth and requires attribution but no maker/checker rule.
  - `PROGRAM-IMPLEMENTATION-PLAN.md:342-357` requires an authorization matrix and audit/ledger effects, but not separation of duties.
  - Canonical `canonical-schema-rebuilt.md:659-673` records one adjustment approval actor.
  - Canonical `prd-rebuilt.md:264-270` requires high-risk actions to be permission-checked, logged, recoverable, and incident-ready.
- **Required architecture rule:** The authorization matrix MUST declare incompatible privileges and maker/checker requirements for production credential activation, scope elevation, evidence export, hold clearing, mismatch resolution, manual provider-event replay, refund/reversal, financial adjustment, and release/payout. The initiator MUST NOT approve the same action; approval MUST bind exact object/version/amount/currency/reason/evidence and expire. Emergency override MUST be separately scoped, immediately alerted, append-only, and post-incident reviewed.

## Controls that survived review

- AD-4 correctly prevents payment, Work, Evidence, Dispute, Consent, and Hold from collapsing into one state.
- AD-12 correctly places authorization and transition guards below transport for UI/API/AI/jobs.
- AD-16 and the canonical sources clearly state that Xendit/Tiwala are sandbox-only and that Tiwala is not legal escrow.
- AD-18 correctly requires atomic state, audit, idempotency, and outbox intent.
- T7’s deterministic fake/provider contract suite covers duplicate, reordered, delayed, malformed, reversed, partial-refund, failure, and unavailability scenarios.

These controls are necessary but do not close the findings above until their required rules become explicit spine invariants and train exit gates.
