# Serbizyu 2.0 — Pre-Implementation Planning Audit

Status: Draft for founder review. This report audits the current plans; it does not modify the PRD, ADRs, architecture, schema, UX, epics, or readiness verdict.

## Executive Verdict

Serbizyu has a strong and unusually broad conceptual foundation, but it is not yet implementation-ready. The current readiness verdict is overstated because the source artifacts still disagree on scope, state machines, schema count, payment behavior, consent rules, UX, test tooling, and legal prerequisites.

Recommended gate: PAUSE feature implementation. Run a short Planning Hardening / Sprint -1 first. Infrastructure experiments may proceed only when they do not lock the schema or payment model.

## What Is Strong

- Product thesis and Tagudin-only boundary are clear in the PRD.
- The listing-type / transaction-mechanism / fulfillment-archetype separation is a useful domain model.
- Money uses bigint centavos, double-entry concepts, immutable correction entries, snapshots, and database idempotency.
- The transactional outbox, provider adapters, policy gates, and single-monolith deployment are appropriate pilot-level patterns.
- Deferred features are explicitly listed in the epics document.
- Development standards, verification gates, and ADR rationale exist instead of living only in chat history.

## Audit Method and Mechanical Checks

This consolidated report includes an independent second-pass review performed directly across all 12 active planning artifacts, the repository README/status claims, the regulatory report, and the Xendit spike, without relying on subagent conclusions. P0 means a blocker to credible feature implementation or real money/data handling; P1 must close before its dependent epic or pilot; P2 is important hardening that can be sequenced after the baseline is coherent.

Mechanical checks found:

- 104 distinct PRD requirement IDs, but only 38 exact references in ADRs, 7 in epics, and 0 in the UX specification.
- 38 table names enumerated by the architecture, versus claimed totals of 30 and 31; ADR-026 introduces at least one more.
- 21 implementation stories and 10 deferred-feature rows, while readiness claims 11 deferrals.
- 29 categories enumerated in the PRD, while several artifacts and readiness gates claim 28.
- Missing referenced artifacts: `serbizyu-schema-decisions.md`, `serbi-ai-assistant-research.md`, `serbizyu-financial-architecture-research.md`, `serbizyu-stack-compatibility-report.md`, and `docs/CONTRIBUTING.md`.
- Stale terms still present across supposedly reconciled artifacts: Candon, Semaphore/Gammu, 75/10/15, 85/15, 12% cash, three-round Quick Deal, three-day release, React 18/Inertia v2, Cypress, 30 tables, and 21 ADRs.

## P0 — Must Resolve Before Feature Implementation

### P0-1. The canonical schema artifact is missing and the table count is internally impossible

Evidence:
- `architecture.md:9,82` references `serbizyu-schema-decisions.md`, but no such project file exists.
- `architecture.md:82` claims 30 tables.
- `architecture.md:84-93` actually enumerates 38 table names.
- ADR-026 adds `platform_configs` (`adr-catalog.md:480`), implying at least 39.
- `epics-and-stories.md:17,62` and `readiness-report.md:18,34,96` claim 31.

Risk: Sprint 0 asks the team to migrate “all 31 tables” before a canonical column-level schema, constraints, ownership, and migration order exist. This will lock contradictions into code.

Required fix: create one canonical schema contract containing table inventory, columns, types, FK/unique/check constraints, indexes, state enums, ownership by bounded context, retention class, and migration order. Generate the ERD from that source. Only then freeze a table count.

### P0-2. Escrow release timing can release money before work is complete

Evidence:
- `adr-catalog.md:82,467-471` snapshots release time at order creation.
- `epics-and-stories.md:232-236` computes `escrow_release_at` from the listing and releases when the timestamp passes.
- The same story does not require a completed/sign-off state before release.
- PRD wording instead describes a buyer review window after provider completion (`prd.md:264,487`).

Risk: a week-long or multi-week job can auto-release while still in fulfillment. This is a catastrophic money-path bug.

Required fix: separate `completion_at` from `release_due_at`. Start the buyer review/release window only after an authorized completion/sign-off event. Require state + timestamp + no-open-dispute checks and concurrency locking in the release job.

### P0-3. Payment/legal prerequisites are marked critical elsewhere but ignored by readiness

Evidence:
- `research-agenda.md:11-12,174-177` marks BSP payment classification and DOLE agent classification P0 and requires payment architecture resolution before payment code.
- `prd.md:465-468` says the BSP legal opinion and LGU work remain pending.
- The Xendit spike says there is no separate escrow product and lists five GO conditions still requiring Xendit confirmation, pricing, refund logic, and legal review (`old-docs/spikes/xendit-escrow-spike.md:12-14,360-368,382-385`).
- `readiness-report.md:76-86` does not list these as blockers.

Risk: the team may build against an assumed “escrow” behavior or regulatory posture that Xendit contract terms do not permit.

Required fix: convert the research gates into implementation gates. Before S2.2/S2.3, obtain written Xendit product-flow confirmation, run the sandbox flow, define refund/split reversal behavior, and document counsel/accountant decisions or explicitly constrain the academic build to sandbox-only demonstration.

### P0-4. There is no canonical transaction state model

Evidence:
- PRD: `created → held_in_escrow → in_progress → awaiting_signoff → completed` (`prd.md:105`).
- ADR-012: `pending_payment → held_in_escrow → in_fulfillment → completed` (`adr-catalog.md:203-209`).
- Work status: `not_started | in_progress | awaiting_signoff | completed | disputed` (`adr-catalog.md:113`).
- Epics use another mixture (`epics-and-stories.md:229-250`).
- The locked taxonomy calls the work-status enum an “Order state machine” (`listing-model-taxonomy.md:81-93`), yet its archetypes introduce unmapped states such as `scheduled`, `preparing`, `shipped`, `received`, `delivered`, and `accepted` (`listing-model-taxonomy.md:135-236`).
- Taxonomy release triggers depend on completion, receipt, attendance, or acceptance, while ADR-026 uses an order-creation wall clock.

Risk: authorization, notifications, payouts, disputes, and audit transitions will be implemented differently by each developer.

Required fix: define one order state machine and one work state machine, their invariants, transition actors, guards, emitted events, idempotency keys, and payment effects. Add diagrams plus transition tables and contract tests.

### P0-5. The pilot scope and epics do not implement the promised launch model

Evidence:
- PRD says four launch presets A1/A3/A4/A9 (`prd.md:129-145,698`).
- No epic implements the Work Engine or these four archetype engines/presets.
- Product listings are in scope, but no stock reservation, oversell prevention, pickup/handoff, or product checkout story exists.
- Hidden-price Quote depends on bid infrastructure, while Reverse Bidding is deferred.
- S3.6 queues Buyer Requests offline even though Reverse Bidding is deferred (`epics-and-stories.md:347,370`).
- S3.4 awards review points even though Points/Affiliate is deferred (`epics-and-stories.md:325,366`).
- The PRD scope fence includes Serbi AI and platform-owned FB/Messenger channels (`prd.md:693-703`), while the epics explicitly defer Serbi and Channel Connectors (`epics-and-stories.md:361,368`).
- The official product-vision press release presents Buyer Requests, Deal-Chaining, Kiosk, Serbi, channel distribution, and three-day escrow as launch capabilities, although most are deferred or superseded.
- The PRD’s “build if capable” section (`prd.md:678-690`) allows scope to change based on spare time without a re-planning gate, acceptance impact analysis, or release criteria.

Risk: the delivered system may have generic listings and payments but no coherent fulfillment behavior for the promised marketplace types.

Required fix: choose a narrow pilot vertical slice and make all stories trace to it. Either implement only the selected listing/archetype/mechanism combinations, or add explicit stories for each committed launch preset and remove unsupported claims.

### P0-6. Current UX/mockup evidence is stale and does not prove alignment

Evidence:
- `ux-spec.md` still uses the old teal palette, Semaphore, a 3-round cap, reverse bidding as a core journey, and payout OTP behavior (`ux-spec.md:17-23,30-44,73-79,88`).
- Sprint 0 S0.2 instructs developers to build green `#1a5632` and gold `#f5a623`, while the UX specification locks teal `#0D9488`, amber `#F59E0B`, and soft sand `#FDFBF7`; following either authoritative artifact produces a different design system.
- The archived 39 screen files contain 17 Candon references, two 75/10/15 references, no Tagudin references, and no Tiwala/Direct Payment terminology.
- `docs/mockup.html` is now only a redirect to the defense deck.
- `readiness-report.md:21,30` nevertheless treats the 39 screens as aligned proof.

Risk: developers will build from visuals that contradict the current domain rules.

Required fix: define the canonical UX artifact, update the core pilot journeys first, and mark archived mockups clearly as non-authoritative. Do not use “39 screens” as a readiness gate until a screen-to-requirement matrix passes.

### P0-7. The operations spine has no owning stories

Evidence:
- ADR-020 mandates Uptime Kuma + Telescope (`adr-catalog.md:334`).
- ADR-004 requires reconciliation drift to page an admin (`adr-catalog.md:62`).
- ADR-018 requires SMS delivery alerts and a failover drill (`adr-catalog.md:304-305`).
- ADR-024 requires daily database/media backup, off-VPS replication, failure alerts, and restore verification (`adr-catalog.md:412-423`).
- ADR-009 requires the outbox worker and crash/retry verification (`adr-catalog.md:155-166`).
- None has an owning implementation story. Only restore-drill automation is explicitly deferred, not the actual backup regime.

Risk: the system can move money without detecting failed queues, failed backups, ledger drift, SMS outage, or stuck releases.

Required fix: add an operations foundation covering health checks, observability, alert ownership, backup/restore, outbox recovery, dead-letter handling, feature-flag kill switches, and initial incident runbooks.

### P0-8. Money features arrive before operational intervention tools

Evidence:
- Xendit, escrow, auto-release, and payouts are scheduled in Weeks 5–8 (`epics-and-stories.md:194-250`).
- Disputes and the admin dashboard do not arrive until Weeks 9–12 (`epics-and-stories.md:300-338`).

Risk: during Weeks 5–8 there is no planned admin interface for stuck escrow, failed payouts, webhook anomalies, refund/reversal, or emergency release suspension.

Required fix: ship a minimal financial operations console with the first money-moving vertical slice: read-only ledger/order inspection, failed-event queue, hold/release kill switch, manual refund/reversal workflow, and immutable operator reasons.

### P0-9. Xendit webhook authenticity is unspecified

ADR-005 specifies idempotency but not verification of Xendit callback tokens/signatures, source authenticity, timestamp/replay policy, or secret rotation. A forged successful-payment callback could create internal funded state without confirmed external funds.

Required fix: authenticate every webhook before persistence or reaction; reject invalid signatures/tokens; store the verified raw event; pin supported event/API versions; test forged, replayed, reordered, and stale callbacks. A successful callback alone must not authorize payout without reconciliation to the expected Xendit object, amount, currency, and account.

### P0-10. Micro-transaction economics and gateway-fee allocation are unresolved

The flagship scope includes transactions as low as ₱50 (`prd.md:24`), but the Xendit spike estimates fixed processing and payout fees that can consume a large fraction of a micro-transaction. The architecture cost table shows only a simplified percentage plus ₱11 and omits payout, sub-account, split, VAT, refund, and activity fees. It does not define whether gateway fees reduce provider proceeds, platform commission, buyer total, or subsidy budget.

Risk: the internal 90/10 or 80/10/10 journal may not reconcile to Xendit's net settlement, and the platform can lose money on successful transactions.

Required fix: create a fee-allocation and external-reconciliation decision covering gross amount, gateway fee, tax, platform commission, provider payable, agent payable, payout fee, refund fee, subsidy, and rounding. Establish a minimum digital-payment amount or cash-only floor based on verified Xendit pricing.

### P0-11. Direct Payment and cash collection rules are not financially closed

Evidence:
- The PRD defines digital escrow and external cash but never defines the later Tiwala Contract / Direct Payment protection model or a listing-level protection choice; “Tiwala Contract” does not appear in the PRD. Epics and readiness silently treat that later model as committed (`epics-and-stories.md:169-173,223-250`; `readiness-report.md:18,30,41`).
- S2.4 says Direct Payment goes straight to the provider, is “NOT refundable,” and still posts platform commission as normal (`epics-and-stories.md:245-250`). It does not explain how Serbizyu actually receives that commission.
- PRD REQ-PAY-08 promises full or partial refunds under several cancellation cases without limiting the rule to Tiwala transactions (`prd.md:274`).
- The Phase 1 FAQ says external cash bypasses the platform cut (`prfaq-faq-challenges.md:39`), while the locked PRD charges an 8% cash platform rate (`prd.md:376`).
- The epics have no cash receivable, collection, delinquency, receipt, or dual-confirmation implementation story.

Risk: the platform can recognize revenue it cannot collect, promise refunds it cannot execute, and present contradictory consumer terms.

Required fix: define each payment mode as a complete contract: who collects, who holds funds, fee bearer, commission collection method, cancellation/refund authority, dispute remedy, receipt/evidence, journal entries, delinquency handling, and consumer-facing wording. Direct Payment must not be labeled categorically non-refundable without validated legal and operational rules.

### P0-12. The ledger invariants are conceptually sound but not implementable as currently specified

Evidence:
- ADR-004 and S2.1 require a “per-entry trigger” to assert balanced debits and credits while ledger lines are inserted separately (`adr-catalog.md:82`; `epics-and-stories.md:202-208`). A normal row trigger sees the first incomplete line and cannot enforce a cross-row final balance; a regular SQL CHECK cannot enforce it either.
- ADR-003 describes updating an account balance as `balance + :amount`, but does not define signed effect by debit/credit side and account normal-balance type (`adr-catalog.md:61-62`).
- The nightly formula “SUM(ledger_lines) = SUM(balance_centavos) per account” is dimensionally ambiguous and does not define the signed projection or opening-balance rule.
- ADR-005 describes idempotency keys using order/action/attempt semantics; if retry attempts receive new keys, one business operation can post more than once.

Risk: a superficially compliant implementation can either reject every multi-line journal, accept transiently unbalanced entries, or maintain balances with the wrong sign while tests still cover only happy paths.

Required fix: define an atomic journal-posting contract. Insert the complete entry inside one database transaction, validate balance with a deferred constraint trigger or controlled posting routine at transaction end, lock affected accounts in deterministic order, apply explicit signed deltas, and use one stable idempotency key per business operation. Specify account types, normal balances, opening balances, reversals, and exact reconciliation equations with worked examples.

## P1 — High-Risk Gaps to Resolve Before the Relevant Epic

### P1-1. Readiness traceability claims are not evidenced

The PRD contains 104 explicit REQ IDs. Exact references found: 38 in the ADR catalog and 7 in the epics. Range references explain some ADR coverage, but there is no actual requirement-to-ADR-to-story-to-test matrix. Only 10 ADR numbers appear anywhere in the epics document. Therefore the statements “every PRD REQ-ID traceable” and “each story cites relevant ADRs” in `readiness-report.md:32-35` are not auditable.

Fix: create a mechanical traceability matrix with status values: committed, deferred, out-of-scope, or uncovered. Every committed REQ must map to story, acceptance test, and responsible module.

### P1-2. Consent and payout authorization contradict each other

- PRD requires OTP for payout withdrawal (`prd.md:122,203`).
- ADR-010 and S3.1 say agent’s own commission withdrawal is not gated (`adr-catalog.md:175`; `epics-and-stories.md:279`).
- ADR-023 again lists payout withdrawal as consent-gated (`adr-catalog.md:397`).

Fix: distinguish owner funds, agent-earned commission, payout-destination changes, and withdrawal initiation. State who owns each balance and which actions require fresh consent.

### P1-3. Quick Deal negotiation rules contradict each other

- PRD and architecture retain max-three language/checks (`prd.md:101,393`; `architecture.md:104`).
- ADR-012 and the supersession log remove the cap (`adr-catalog.md:209,506`).
- ADR-013 still says ≤3 (`adr-catalog.md:223`).
- Epic S3.2 says no cap (`epics-and-stories.md:293`).

Fix: choose one rule and update schema, UX, ADRs, PRD, and tests together.

### P1-4. Financial edge cases lack contracts

Missing or incomplete: Xendit sub-account onboarding/KYC, out-of-order webhooks, split reversal on refunds, payout retry/idempotency, partial refunds, cancellation postings, chargebacks, direct-payment commission collection, cash commission receivable collection/enforcement, release-job locking, and ledger reconstruction after a 24-hour backup loss.

Fix: create a money-event catalog. For each event define external state, order transition, journal lines, idempotency key, reversal event, failure handling, and reconciliation rule.

### P1-5. Agent economics are not mathematically closed

The fixed 80/10/10 split conflicts with an agent ladder rising to 15%. It does not say whether higher agent share comes from owner or platform. The 3× graduation bonus has no funding source, calculation window, qualification rules, or anti-gaming controls.

Fix: add formulas and examples for each tier, rounding ownership, bonus liability/funding, and snapshot behavior.

### P1-6. Security/privacy planning is too shallow for IDs, selfies, and money

Current documents name encryption, policies, CSP, and audit logging but lack a threat model, data classification, encryption-key rotation, secret management, privileged admin separation, audit-log tamper resistance, document access URLs, breach response, DPO/NPC operational tasks, DPIA/biometric consent, and AI data-sharing rules.

Fix: add a security/privacy plan before S1.2, including misuse cases and tests. “PostgreSQL encryption at rest” must be replaced with the actual disk/volume/database control used.

### P1-7. Deployment and operations are incomplete

Missing: production environment topology, environment promotion, deployment approvals, migration compatibility, rollback/roll-forward, maintenance behavior, secrets rotation, container resource budgets, SSR container/process in topology, health checks, alert routes, queue dead-letter handling, incident runbooks, and tested restore procedure before handling real money.

Fix: treat CI, CD, and production release as separate contracts. A main-branch push should not silently equal production deployment.

### P1-8. Test tooling and committed paths conflict

ADR-025 locks Cypress and five mechanism E2Es, while Sprint 0/readiness lock Playwright. Three of those five mechanisms are deferred or only partially committed. “Playwright when needed” is not a gate.

Fix: supersede ADR-025 explicitly, choose one E2E tool, and map tests only to committed pilot paths. Add concurrency, queue crash/retry, state-machine, policy-matrix, offline-sync, migration, backup/restore, and money-reconciliation tests.

### P1-9. Legal/compliance content contradicts its own research

Examples: the PRD says Lane 1 needs no BIR filing while the regulatory report says small servicers still need BIR registration; the research agenda is still Candon-based; and the 3-Lane Ladder section is simultaneously marked “in progress” and the PRD is marked locked (`prd.md:254`; `readiness-report.md:15`). The PRD declares admin dispute rulings “binding,” promises a “Notarized-Ready” handoff, classifies Serbizyu as an OPS partner, and labels Direct Payment non-refundable without showing the contracts, counsel opinion, or statutory basis that makes those representations enforceable.

Fix: separate product intent from legal assertions. Mark unverified legal rules as decision gates, not locked requirements, and update all research to Tagudin.

### P1-10. Essential pilot capabilities have no stories

Cash dual-confirmation and receipt generation (REQ-PAY-05), the notification matrix (REQ-NTF-01), and buyer/provider messaging or unified conversations (REQ-CH-02) have schema entries but no owning implementation story. Cash is especially important because it is expected to be the dominant Tagudin payment mode. The user-facing 3-Lane Ladder also has no story for the Lane 2 sworn declaration, Lane 1 payout cap, or Barangay-Verified gate on agent-managed listings, despite appearing in the PRD and UX (`prd.md:313,429-459`; `ux-spec.md:61`).

Fix: either add minimal vertical-slice stories with tests or explicitly remove these capabilities from the pilot promise and schema baseline.

### P1-11. AI face matching is an unplanned dependency

S1.2 requires AI face matching (`epics-and-stories.md:130`) without a provider decision, cost model, fallback/error thresholds, biometric privacy assessment, or dedicated ADR. The research agenda still treats biometric consent as unresolved (`research-agenda.md:103-113`).

Fix: for the pilot, prefer manual verification unless a separate, reviewed decision establishes provider, consent, retention, false-match handling, human appeal, cost, and test strategy.

### P1-12. Verification gates disagree across artifacts

The readiness report defines G1–G4 at Weeks 1/4/8/12 (`readiness-report.md:65-72`), while the ADR catalog defines different G1–G4 gates at Weeks 3/6/9/12 (`adr-catalog.md:510-517`). ADR-004 still cites “G2 Week 6.”

Fix: maintain one authoritative gate table with unique IDs, owner, entry criteria, proof, failure action, and scope-cut rule. Other artifacts should link to it instead of copying it.

### P1-13. Infrastructure decisions are not executable as written

The SSR Node process required by ADR-015 is absent from the Sprint 0 container list. Architecture alternates between Octane and PHP-FPM. PRD backup language names Dokploy/native volumes and optional R2, while ADR-024 requires `pg_dump` plus `rclone` to off-VPS storage. No production environment, promotion path, rollback/roll-forward policy, live-secret handling, or migration compatibility rule is defined.

Fix: produce an environment and release contract for local, CI, staging, and production, including exact processes/containers, health checks, resource limits, secrets, deployment approvals, migrations, rollback/roll-forward, backup, and restore.

### P1-14. Scheduled jobs and concurrency controls are missing

Escrow release, nightly ledger reconciliation, sitemap generation, retention purge, and backups depend on scheduling, but no scheduler process/container is in the deployment plan. Release-versus-dispute, payout retries, and availability-slot claims also lack row-locking or compare-and-swap semantics.

Fix: define scheduler ownership and singleton execution. For every financial or inventory transition, specify transactional locking, conditional updates, retry safety, and the losing-request behavior.

### P1-15. Authorization and edge caching can expose incorrect users or data

ADR-023 stores one `users.role`, although a marketplace participant can simultaneously buy, sell, and act as an agent. Separately, Inertia SSR plus Cloudflare caching does not define public/private cache headers or cache keys; authenticated shared props must never enter a public edge-cached response.

Fix: model capabilities or multiple role assignments rather than a mutually exclusive role where necessary. Define anonymous-only edge caching, `Cache-Control` behavior, cache bypass for sessions/cookies, and automated cross-user leakage tests.

### P1-16. TextBee capacity and failover assumptions need field validation

The <10-second OTP target, ₱100/month cross-network economics, 500-SMS budget, inbound forwarding, Android background reliability, and cold-standby failover all depend on carrier/device behavior not guaranteed by the architecture. At 100 transactions/day, OTP and notification volume may exceed 500 SMS/month several times over.

Fix: run a Tagudin device/carrier soak test, calculate messages per complete pilot transaction, validate inbound keywords while the phone is idle, define gateway health monitoring and failover ownership, and keep the `SmsDriver` fallback deployable.

### P1-17. Backup reconstruction claims exceed what external payment records can restore

ADR-024 suggests financial state can be reconstructed from Xendit after a 24-hour data loss. Xendit cannot reconstruct cash receipts, dual confirmations, internal disputes, messages, reviews, verification records, media, or agent consent history. Thirty daily archives near 500 MB also consume approximately the entire free 15 GB target.

Fix: state the real RPO impact, size-test compressed backups, encrypt backup archives, retain enough independent consent/evidence records, and complete a restore drill before real pilot data or money is accepted.

### P1-18. The artifact hierarchy is not a functioning source of truth

Several documents are simultaneously labeled locked, accepted, embedded, reconciled, or authoritative while contradicting downstream decisions. The Phase 1 handoff says five listing primitives while the taxonomy defines four listing types; the press release says “four equal-weight commerce primitives” but enumerates five mechanism/listing bullets; its archetype names do not match the locked A1–A10 taxonomy. README claims 31 tables, 3 epics, all gates passed, and a 39-screen mockup hub, but the mockup URL redirects to a deck and the evidence is stale. The active stakeholder briefing still contains Gammu, fixed three-day release, a three-round Quick Deal limit, and stale commission percentages.

Fix: define precedence and supersession rules. Vision artifacts may preserve history, but current normative rules must live in one controlled baseline with links—not copied values. Mark stale accepted artifacts as historical and remove them from readiness evidence.

### P1-19. Readiness relies on research and standards artifacts that do not exist

The readiness report marks a 47 KB Serbi research baseline complete, while README lists Serbi, financial-architecture, and stack-compatibility reports. None of these three files exists in the repository. `docs/CONTRIBUTING.md`, referenced as the Sprint 0 development contract, is also absent. The schema-decisions document is absent from both the working tree and git history.

Fix: every readiness claim must link to a committed artifact and reproducible verification. If content was intentionally embedded elsewhere, update the references and remove the phantom artifact; otherwise recreate and review it before using it as evidence.

### P1-20. Product success and pilot graduation are not measurable

The four strategic objectives are directional, not SMART, despite the readiness report claiming SMART traceability. The plan lacks numeric pilot targets and measurement ownership for activation, successful first transaction, supply density, request liquidity, completion rate, dispute rate, repeat usage, retention, support burden, payout success, or unit economics. Phase 1 mentions recruiting 10–15 Tagudin servicers and zero commission for 30 days, but the epics contain no operating plan or launch acceptance gate for these outcomes.

Fix: define a pilot scorecard with baseline, target, measurement source, owner, review cadence, and explicit continue/pivot/stop thresholds. Separate software-completion gates from market-validation gates.

### P1-21. Data deletion, retention, and immutable audit obligations conflict

The PRD promises account deletion and PII purge within 30 days while retaining financial records indefinitely, messages for two years, dispute evidence for five years, and append-only audit history (`prd.md:650-655`). It does not define pseudonymization, legal holds, encrypted media deletion, backup expiry, derived search/cache deletion, or how audit references survive without retaining unnecessary PII.

Fix: create a data-classification and lifecycle matrix covering source tables, files, indexes, caches, logs, backups, lawful basis, retention trigger, deletion/anonymization method, legal hold, and accountable owner.

### P1-22. Core personas and journeys are not validated by current UX evidence

The UX specification covers only a small subset of the required journeys and contains no REQ IDs. Missing end-to-end journey evidence includes verification and appeal, provider/seller onboarding, product handoff, appointment scheduling, digital delivery/revisions, Tiwala completion/sign-off/release, Direct Payment cancellation, cash receipt, payout setup/failure, agent-owner consent/revocation, dispute resolution, and admin financial intervention. The personas and cold-start approach are founder-derived; no documented field interviews or low-end-device usability sessions validate the critical assumptions.

Fix: create a journey-to-requirement matrix and test the narrow pilot slice with representative Tagudin users before freezing screens or implementation stories.

### P1-23. The flagship Quick Deal protocol is not specified to implementation depth

The product vision describes animated, air-gapped QR exchange with signed envelopes, while S3.2 reduces this to generate/scan/counter and “server-wins” sync. The PRD itself says phone-to-phone Quick Deal needs no connectivity at transaction time, elsewhere says two fully offline users cannot transact, and later says it works fully air-gapped; S3.2 requires an online final commit but also describes offline cash completion (`prd.md:116,119,276,573`; `epics-and-stories.md:294-297`). It does not specify payload schema/versioning, canonical signing bytes, key issuance/revocation, nonce/replay protection, multi-frame sequencing and loss recovery, maximum payload/frame count, clock skew, dual-party identity binding, conflicting offline commits, or how the losing sync is compensated. No committed prototype gate proves low-end cameras can reliably scan the stream.

Fix: treat Quick Deal as a separate technical spike before scheduling the feature. Produce a protocol document, threat model, test vectors, conflict matrix, and measured prototype on representative low-end Android devices. If the spike misses its reliability gate, use a static online QR/deep-link flow for the pilot.

### P1-24. Localization requirements are broader than translated labels

The plan promises English, Tagalog, and Ilocano categories, search, SMS, voice, and AI interactions. Story acceptance mostly covers trilingual labels and typo tolerance; it does not define locale ownership, fallback rules, translated legal/payment warnings, plural/number/currency formatting, search synonyms across languages, SMS templates, or human review of Ilocano content. Meilisearch typo tolerance alone does not translate intent across languages.

Fix: define a pilot localization contract and glossary, choose authoritative translations, include payment/consent/legal strings, test search synonym behavior, and assign content review ownership.

## P2 — Quality Improvements

- Replace the 21 large “stories” with smaller vertical slices and explicit dependencies.
- Add usability testing on low-end Android, feature phones, and intermittent connectivity.
- Add pilot operations: provider recruitment, agent training, support ownership, dispute staffing, and launch-day runbook.
- Add acceptance datasets and seed fixtures for categories, barangays, listings, users, orders, disputes, and financial scenarios.
- Define observability with SLOs, metrics, logs, traces, alert thresholds, and owners.
- Remove or defer Reverb and other operational services unless a committed pilot story requires them.
- Reconcile brand tokens and avoid external font dependencies where offline/privacy goals conflict.
- Replace vague “admin-configurable” statements with configuration ownership, defaults, validation ranges, and audit behavior.
- Reconcile the category inventory: the PRD says 28, but its table enumerates 29 categories.
- Define ordered outbox consumption per aggregate so update/delete events cannot be processed out of sequence and resurrect stale search records.
- Replace the unsupported phrase “PostgreSQL encryption at rest” with the actual host-volume encryption, application-field encryption, key custody, and key-rotation controls.
- Document iOS PWA limitations: Background Sync is not uniformly available, so queued operations need a foreground/manual-sync fallback.

## Delivery Realism

The plan contains 21 stories across 12 weeks, but many are epic-sized: full infrastructure and 31+ migrations in one week; identity verification with sensitive-document handling; geospatial indexing; SSR/SEO; a financial ledger; Xendit marketplace payments; search; agent consent; offline QR; disputes; trust scoring; fraud analytics; and offline PWA behavior.

For a four-student team, the current timeline is not credible without major scope reduction. It also postpones the first complete user-to-value vertical slice until late in the schedule. A safer plan demonstrates one thin end-to-end transaction by Week 3–4, then deepens it.

## Recommended Hardening Sequence (Review One Section at a Time)

1. Source-of-truth and contradiction register.
2. Pilot scope matrix: committed combinations of listing type × transaction mechanism × archetype × payment mode × access tier.
3. Canonical domain/state model.
4. Canonical schema contract and ERD.
5. Money-event/payment integration specification and legal gate.
6. Identity, authorization, consent, privacy, and security specification.
7. Core UX journey and screen-to-requirement reconciliation.
8. Rebuilt epics as thin vertical slices with estimates, dependencies, and test mapping.
9. Deployment/operations/release plan.
10. Fresh readiness audit with evidence; replace the current APPROVED verdict only after all P0 items close.

## Proposed Immediate Decision

Do not start the current Sprint 0 as written. Rename the next phase “Sprint -1: Planning Hardening.” Infrastructure experiments may begin, but do not create 31/38/39 production migrations or payment code until the canonical schema, state model, scope matrix, and payment gate are approved.
