# Final Architecture and Authority Review

> **Disposition (2026-08-10): CLOSED.** This file preserves the pre-reconciliation finding baseline. All listed divergences and the subsequent closure pass were independently rechecked; the current verdict is in [`FINAL-READINESS-REPORT.md`](../FINAL-READINESS-REPORT.md).

**Review date:** 2026-08-09  
**Historical verdict at review time:** **NOT IMPLEMENTATION-READY**  
**Historical severity summary:** 0 BLOCKER, 4 HIGH, 1 MEDIUM

The substantive 2026-08-09 decisions are now propagated through the canonical PRD, domain/state, schema, ADR, architecture, UX, and delivery artifacts. The remaining issues are document-to-document execution divergences: package completion status, missing train ownership for committed epics, one reversed train dependency, undefined capability-status vocabulary, and one runtime classification conflict.

## Remaining divergences

### HIGH-01 — Close the package status after authority propagation

**Evidence**

- The canonical product and architecture artifacts now record the initiative extension as accepted (`../../prd-rebuilt.md:3-14`; `../../architecture-rebuilt.md:3`, `../../architecture-rebuilt.md:498-500`).
- The spine still declares `status: draft` (`../ARCHITECTURE-SPINE.md:1-10`).
- The program still declares `status: accepted-for-authority-propagation`, describes T0 propagation as future work, and says to start with T0 (`../PROGRAM-IMPLEMENTATION-PLAN.md:1-5`, `../PROGRAM-IMPLEMENTATION-PLAN.md:36-49`, `../PROGRAM-IMPLEMENTATION-PLAN.md:466-468`).
- The accepted founder brief still lists canonical amendment and ERD propagation as the immediate next milestone (`../FOUNDER-DECISION-BRIEF.md:57-72`).

**Divergence:** One implementer can treat AD-1–29 and the 58-table extension as accepted implementation inputs, while another can correctly stop because the build substrate is still marked draft and T0 is described as incomplete. This leaves the authority ceremony open even though the canonical sources say it is complete.

**Fix class:** **Clear document fix; no new founder decision.** Mark the spine and program with their post-propagation status, record which T0 outputs are complete, separate any still-pending ERD/catalog-test evidence from authority acceptance, and replace the founder brief's completed “immediate next milestone” list with the actual next gate.

### HIGH-02 — Assign the uncovered E1, E5, E6, and E8 backend work to trains

**Evidence**

- The program itself records unfinished Identity/delegation work—onboarding, identity review, role/delegation/consent policies, and recovery—and unfinished Trust/communication work—evidence access, conversation authorization, disputes/holds, notification fallback, and support recovery (`../PROGRAM-IMPLEMENTATION-PLAN.md:23-34`).
- The train graph contains no Identity, delegation, communication, dispute/hold, safety/support, measurement, or pilot-readiness backend train (`../PROGRAM-IMPLEMENTATION-PLAN.md:51-82`).
- T1 provides actor/envelope/operations primitives, not those domain capabilities (`../PROGRAM-IMPLEMENTATION-PLAN.md:108-130`); T6 covers evidence and the two low-barrier payment lanes, not messaging, notification fallback, disputes, holds, safety, or support (`../PROGRAM-IMPLEMENTATION-PLAN.md:226-244`).
- T10 is explicitly a connected-frontend/customer-readiness train that expects stable backend contracts (`../PROGRAM-IMPLEMENTATION-PLAN.md:332-347`).
- The canonical epic map still commits E1, E5, E6, and E8 outcomes and dependencies (`../../epics-and-stories-rebuilt.md:43-54`).

**Divergence:** A team can complete every named train yet still have no defined backend delivery point for canonical E1 onboarding/delegation, major E5 trust/support behavior, parts of E6 measurement/recovery, or E8 launch-readiness behavior. Implementers must either fold these into T1/T6/T10 ad hoc or defer accepted epic scope, producing incompatible module and readiness boundaries.

**Fix class:** **Clear document fix; no new founder decision.** Add explicit backend train(s), or assign every affected E1/E5/E6/E8 story to an existing train with deliverables, dependencies, exit evidence, activation, and rollback. Keep T10 limited to connecting and validating already-owned backend contracts.

### HIGH-03 — Remove the E2/E3 versus T3/T5 dependency reversal

**Evidence**

- The canonical epic map places all of E2 before E3 (`../../epics-and-stories-rebuilt.md:43-49`).
- E2 contains Service/Product Request and Quote Request stories; Quote acceptance currently says it creates the immutable Order terms snapshot (`../../epics-and-stories-rebuilt.md:217-240`).
- The program instead places T3 ordinary Order formation before T5 requests/quotes/bidding/Quick Deal (`../PROGRAM-IMPLEMENTATION-PLAN.md:67-76`) and states that T5 mechanisms converge on T3 (`../PROGRAM-IMPLEMENTATION-PLAN.md:157-176`, `../PROGRAM-IMPLEMENTATION-PLAN.md:207-224`).

**Divergence:** Following the epic plan requires Request/Quote completion before the sole Order seam exists; following the train plan requires that seam first. This can yield a quote-specific Order/terms creation path in one implementation and a `FinalizeOrderAgreement` adapter in another.

**Fix class:** **Clear document fix; no new founder decision.** Split the catalog/listing portion of E2 from formation-mechanism stories, make Request/Quote acceptance depend on and call T3's `FinalizeOrderAgreement`, and publish one identical dependency graph in the epics and program.

### HIGH-04 — Normalize PRD status vocabulary and E9 delivery planes

**Evidence**

- PRD §6 says every requirement uses exactly one of `CAPSTONE`, `PILOT`, `PILOT-CONDITIONAL`, `SANDBOX-ONLY`, `FOUNDATION`, `DEFERRED`, or `EXCLUDED` (`../../prd-rebuilt.md:158-175`).
- PRD-060–073 and PRD-075–076 introduce undefined `COMMITTED` and `CONDITIONAL` statuses; PRD-022 uses the two-status form `FOUNDATION / FUTURE` (`../../prd-rebuilt.md:273-293`, `../../prd-rebuilt.md:209-215`).
- PRD-065–067 place account integrations and AI in the capstone plane (`C,S`), while E9-S7/S8 are `COND,FUT,S` and omit `C` (`../../prd-rebuilt.md:282-284`; `../../epics-and-stories-rebuilt.md:670-695`).

**Divergence:** One implementation can treat integrations/AI as activation-gated capstone scope, while another can defer them as future startup work. Traceability cannot determine whether `COMMITTED` means mandatory implementation, contract-only authority, or merely non-deferred architecture.

**Fix class:** **Clear document fix unless the capstone plane was intentionally changed.** Define any new status in §6 and map it one-to-one to story vocabulary, then make PRD-065–067 and E9-S7/S8 agree on `C` versus `F`. If founder intent on capstone demonstration is not already recorded, only that plane choice requires a founder decision.

### MEDIUM-01 — Use one Redis process classification

**Evidence**

- Canonical architecture §5 classifies Redis as conditional/optional (`../../architecture-rebuilt.md:161-181`).
- The accepted initiative extension lists Redis in the required runtime and the spine locks it into the required E0–E9 process/service envelope (`../../architecture-rebuilt.md:523-529`; `../ARCHITECTURE-SPINE.md:233-237`).

**Divergence:** Environment owners can produce two compliant-looking topologies: one without Redis until a measured need, and one that requires Redis health, queue/cache coordination, backup/promotion evidence, and failure ownership from E0 onward.

**Fix class:** **Clear document fix; no new founder decision.** Update §5 to the accepted classification, or explicitly state that the later extension supersedes only specific environments and name the Redis-free queue/cache/coordination contract for the others.

## Closure of prior findings

- **Authority inversion — closed.** Account integrations, AI handoff, versioning, activation, security, and the 58-table inventory now appear in the canonical PRD/domain/schema/ADR/architecture/UX/story chain; HIGH-01 is the remaining status-ceremony cleanup, not the earlier missing-authority defect.
- **Brownfield module topology — closed.** `IdentityAccess`, `Listings`, `OrdersWork`, `PaymentObligations`, `TrustSupport`, `Operations`, `DealCoordination`, and `Integrations` now have one ownership map and owner-only write rule (`../ARCHITECTURE-SPINE.md:81-107`, `../../architecture-rebuilt.md:502-511`).
- **Final-formation transaction seam — closed.** `FinalizeOrderAgreement`, the Order-owned PostgreSQL transaction, transaction-bound owner ports, fixed lock order, all-or-nothing child creation, and post-commit-only async effects agree across the domain, ADR, spine, architecture, and program (`../../domain-state-contracts-rebuilt.md:659-665`; `../ARCHITECTURE-SPINE.md:239-249`; `../../architecture-rebuilt.md:513-517`; `../PROGRAM-IMPLEMENTATION-PLAN.md:157-176`).
- **Activation and rollback semantics — closed.** The domain defines dimension identity, deny precedence/default, safe disable behavior, and exact approval consumption; the program makes activation/rollback mandatory in every LLD (`../../domain-state-contracts-rebuilt.md:693-700`; `../PROGRAM-IMPLEMENTATION-PLAN.md:349-367`).
- **Runtime/process direction — materially closed, with MEDIUM-01 remaining.** Nginx→PHP-FPM, PostgreSQL, worker, scheduler, private evidence, separate optional SSR behavior, search/realtime baselines, environment isolation, health, promotion, and restore expectations align; only Redis's required-versus-conditional classification remains contradictory.
- **Source references — closed.** The spine lists the canonical sources, the canonical extension gates use matching PRD/domain/schema/ADR/UX/story identifiers, and implementation packets must cite exact authority and supersession (`../ARCHITECTURE-SPINE.md:22-36`, `../../domain-state-contracts-rebuilt.md:721-725`, `../PROGRAM-IMPLEMENTATION-PLAN.md:349-367`).

## Final readiness statement

No BLOCKER remains, but the four HIGH divergences allow incompatible implementation scope or sequencing and must be corrected before the package is used as a train-level implementation authority. The MEDIUM runtime classification should be corrected in the same document pass.
