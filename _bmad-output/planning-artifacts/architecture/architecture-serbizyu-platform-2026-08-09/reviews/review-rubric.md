# Architecture Spine Rubric Review

**Verdict: NOT READY FOR FINALIZATION.** Five high-severity divergence points remain. Two independent implementers can obey the current AD text and still produce incompatible authority, module, financial, runtime, and capability boundaries.

## Review basis

- Target: `../ARCHITECTURE-SPINE.md`
- Contradiction check only: `../PROGRAM-IMPLEMENTATION-PLAN.md`
- Canonical evidence: rebuilt PRD, UX, domain/state, schema, ADR, architecture, and epics artifacts cited by the spine; `docs/planning-hardening/08-runtime-stack-and-environment-contract.md`; current `app/Modules`, `composer.json`, `package.json`, `compose.yaml`, and `Dockerfile`.
- Rubric: divergence points, enforceable AD rules, initiative-altitude completeness, brownfield fit, source capability coverage, stack/runtime currency, and deferred/open decisions.

## Findings

### HIGH-1 — Resolve the integration authority inversion before adopting the integration ADs

- **Violated:** AD-1, AD-2, AD-10 through AD-13, AD-21 through AD-22; source authority and open-decision discipline.
- **Evidence:** AD-1 says the rebuilt PRD, domain, schema, ADR, UX, and epics precede architecture (`ARCHITECTURE-SPINE.md:64-74`), while AD-10 through AD-12 are already marked `[ADOPTED]` and AD-13/AD-21/AD-22 prescribe the account API, service-principal, webhook, six-table, and ownership contracts (`:150-172`, `:216-226`). None of the cited canonical rebuilt PRD, domain/state, schema, ADR, UX, or epics artifacts contains an account-integration/service-principal contract. The companion plan confirms that all six authority amendments are still required and prohibits integration migrations/endpoints before approval (`PROGRAM-IMPLEMENTATION-PLAN.md:35-54`).
- **Divergence scenario:** Implementer A treats the adopted ADs as authority and builds `/api/v1`, owner-scoped clients, and six tables; implementer B obeys AD-1 and the plan, finds no upstream capability authority, and blocks or defines a different contract after the amendments. Both can plausibly claim compliance.
- **Recommended correction — founder decision required:** Complete and approve the PRD/domain/schema/ADR/UX/epic amendments first, then cite their stable IDs from these ADs and mark the adopted status consistently. Until then, move the integration rules to explicit open decisions with a no-implementation gate; do not state that the full capability contract is fixed.

### HIGH-2 — Choose one brownfield module topology and ownership map

- **Violated:** AD-3; Design Paradigm; Structural Seed; brownfield-fit requirement.
- **Evidence:** AD-3's diagram defines separate Identity, Delegation, Catalog, Order, Work, Payment, Trust, Communication, Deal, Integration, and Operations modules (`ARCHITECTURE-SPINE.md:76-108`). The Structural Seed instead permits `Catalog/ or Listings/`, combines Order and Work in `OrdersWork/`, combines Trust and Support in `TrustSupport/`, and omits Identity/Delegation/Communication (`:258-272`). The brownfield repository already has `app/Modules/IdentityAccess`, `Listings`, `OrdersWork`, `PaymentObligations`, `TrustSupport`, and `Operations`.
- **Divergence scenario:** Implementer A follows the diagram and creates separate Order, Work, Trust, Communication, and Delegation modules; implementer B extends the existing combined modules and chooses `Listings`. Both obey a different normative-looking part of the spine, producing incompatible namespaces, aggregate owners, ports, and dependency rules.
- **Recommended correction — clear autofix:** Ratify the current module names in one authoritative ownership table, assign every canonical aggregate/capability to exactly one owner, and state whether any split is an approved migration or forbidden. Remove `or` choices and make diagrams, capability map, and Structural Seed identical.

### HIGH-3 — Add the canonical financial invariants to the payment rules

- **Violated:** AD-4 and AD-14 through AD-16; Capability → Architecture Map; source capability coverage.
- **Evidence:** The spine's payment rules cover separation, provider neutrality, sandboxing, and provider events (`ARCHITECTURE-SPINE.md:110-114`, `:174-190`), and the capability map governs payments only with AD-4 and AD-14 through AD-16 (`:307-321`). The accepted canonical authority additionally requires one lane per Payment Obligation (`adr-catalog-rebuilt.md:65-84`; `prd-rebuilt.md:291-293`), append-only linked financial corrections (`adr-catalog-rebuilt.md:124-130`), and balanced double-entry postings by currency linked to a source event and idempotency key (`adr-catalog-rebuilt.md:132-138`). Those are not enforceable rules anywhere in the spine.
- **Divergence scenario:** Implementer A treats canonical payment events as the financial source of truth and maintains a net balance; implementer B posts balanced ledger transactions and models corrections as linked entries. Both satisfy the current spine's payment ADs, but their accounting, reconciliation, refund, and migration contracts are incompatible.
- **Recommended correction — clear autofix:** Add an adopted financial-integrity AD binding every payment/refund/release/fee/correction effect to one-lane obligations, immutable linked corrections, and per-currency balanced double-entry transactions; map it to Payment/Financial Integrity and cite ADR-R-006, ADR-R-007, ADR-R-012, ADR-R-013, and PRD BR-005.

### HIGH-4 — Bind the locked runtime and environmental envelope, not only package majors

- **Violated:** initiative-altitude completeness; Stack; AD-19; deferred/open-decision coverage.
- **Evidence:** The spine lists only PHP/Laravel/Boost/Inertia/React/PostgreSQL/PostGIS/Redis/Pest (`ARCHITECTURE-SPINE.md:245-256`) and gives a generic operational completion rule (`:204-208`), but neither fixes nor explicitly defers process topology, SSR policy, web/PHP runtime, search/realtime baselines, evidence storage, environment classes, data separation, promotion, or migration strategy. The cited canonical architecture requires PHP-FPM, Node 22 SSR as a separate conditional process, PostgreSQL search, optional Reverb/Meilisearch, Docker Compose local/test topology, and a deployment-neutral promotion boundary (`architecture-rebuilt.md:30-57`, `:161-183`). The founder-approved runtime contract fixes React 19.2/Inertia 3.6/TypeScript 5.9/Node 22/Vite 7, Nginx/PHP-FPM, Redis 7.x, environment gates, Compose services, and rollback (`docs/planning-hardening/08-runtime-stack-and-environment-contract.md:7-28`, `:68-158`, `:177-206`). Current manifests/Compose ratify that family: `package.json` pins React 19.2.8, Inertia React 3.6.1, TypeScript 5.9.3 and Vite 7.3.6; `compose.yaml` pins PostGIS 16-3.5 and Redis 7.4; `Dockerfile` uses Node 22.
- **Divergence scenario:** Implementer A deploys SSR and Redis-backed queues in every environment; implementer B uses client rendering/database queues and merges capstone, pilot, and connected-money data. Neither choice violates the current Stack table or Deferred list, yet process health, secrets, data classification, and promotion behavior are incompatible.
- **Recommended correction — clear autofix:** Cite the runtime/environment contract directly and project its locked invariants into a concise runtime/environment AD: required versus conditional processes, environment/data classes, local/test reference topology, deployment-neutral promotion, and rollback/migration rules. Split and pin each named package/runtime consistently with lockfiles; place genuinely undecided hosting/provider choices under Deferred with revisit triggers.

### HIGH-5 — Make initiative scope and capability coverage internally complete

- **Violated:** frontmatter `scope`/`binds`; AD-2; Capability → Architecture Map; initiative-altitude source coverage.
- **Evidence:** The frontmatter binds only E2-E7 and E9 (`ARCHITECTURE-SPINE.md:7-18`), while AD-2 claims E2-E9 (`:70-74`). The canonical epic set also includes E0 Foundation, E1 Identity/access/delegation, and E8 Tagudin readiness (`epics-and-stories-rebuilt.md:56-174`, `:544-577`). The capability map omits Identity/OTP/access tiers, Agent consent/delegation, communication/notifications/support, safety, cohort classification, onboarding/training, and launch activation (`ARCHITECTURE-SPINE.md:307-321`), although these are canonical PRD capabilities and existing brownfield IdentityAccess behavior.
- **Divergence scenario:** Implementer A treats E1 and E8 as outside the spine and reuses current phone OTP/consent/pilot behavior unchanged; implementer B treats AD-1/AD-3's `all` binding as authority and redesigns those capabilities under the new command/module conventions. Their actor context, consent attribution, notification recovery, and launch gates diverge.
- **Recommended correction — founder decision required:** State whether this is a whole-initiative spine or a bounded E2-E9 platform-extension spine. For whole initiative, bind E0-E9 and add missing capability-owner/AD rows. For a bounded extension, narrow `scope`, replace every `all` binding, and list E0/E1/E8 invariants as inherited read-only constraints rather than leaving them ambiguous.

## Rubric conclusion

- **Divergence test:** failed; each finding provides a pair of incompatible but currently compliant implementations.
- **Enforceability:** most individual ADs are testable, but AD-3 and the missing financial/runtime rules do not converge implementation.
- **Initiative completeness:** failed on identity/delegation/communication/pilot readiness and the operational/environmental envelope.
- **Brownfield fit:** versions broadly match current manifests/Compose, but the structural seed does not ratify existing module names consistently.
- **Source coverage:** failed where integrations precede unapproved upstream amendments and where canonical financial/capability invariants are absent from the map.
- **Deferred/open decisions:** failed because integration authority status and whole-initiative scope are unresolved but presented partly as adopted; hosting-provider choice is appropriately downstream, but its invariant environment/process boundary is missing.
