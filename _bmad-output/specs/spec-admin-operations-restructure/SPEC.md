---
title: Admin Operations Restructure Specification
version: 1.0.0
slug: admin-operations-restructure
companions:
  - architecture-diagrams.md
  - ../../../docs/architecture/admin-operations-workbench-architecture.md
---

# SPEC: Admin Operations Restructure

## 1. Why
The current admin surface is a decoupled 11-page presentational scaffold rendering hardcoded local sample arrays behind unprotected routes. Triage currently acts as an overloaded 7-tab container that duplicates dedicated pages, while critical actions rely on fake browser timeouts and alert dialogs. This specification defines a function-first, truthful admin architecture that allows the admin panel to mature as an L4 investigation workbench in parallel with evolving consumer, listing, order, and payment domains.

## 2. Capabilities

### CAP-1: Admin Access Enforcement & Route Guarding
- **Intent:** Restrict all administrative interfaces to authenticated operators holding active admin or operator role assignments and policy permissions.
- **Success:** Any unauthenticated request to `/admin/*` redirects to sign-in; non-admin authenticated users receive an HTTP 403 response; authorized operators access the workbench seamlessly.
### CAP-2: Three-Tier Navigation Spine
- **Intent:** Structure the admin navigation hierarchy into three explicit operator-focused functional domains: Operations (daily remediation), Marketplace (read-mostly registry oversight), and Blueprint Governance (template and taxonomy authoring).
- **Success:** Sidebar renders distinct Operations, Marketplace, and Blueprint Governance groups; active route indicators function via URL route matching; all navigation utilizes Inertia page transitions without full browser reloads.

### CAP-3: Decomposed Triage Queue (OPS-001)
- **Intent:** Reduce Triage from an overloaded sub-tool container to a clean, prioritized queue of actionable items requiring operator attention.
- **Success:** Triage renders items conforming to the standardized `AdminQueueItem` envelope across all incident kinds; selecting an item routes directly to its dedicated operational workspace or the universal Inspector.

### CAP-4: Canonical Universal Inspector (OPS-003, OPS-004)
- **Intent:** Provide a single deep-dive investigation interface (`/admin/inspect?ref=...`) reachable from all marketplace registries and triage queues.
- **Success:** Navigating to `/admin/inspect` with an Order reference, Work ID, Payment Obligation ID, User ID, Dispute ID, or Correlation ID renders independent, unmerged visual rails for Order Agreement, Work Execution, Payment Obligation, Evidence, Disputes/Holds, Outbox/Messages, and Audit History.

### CAP-5: Truthful Action States & Prohibition of Fake Operations
- **Intent:** Eliminate misleading client-side simulations of backend transactions (e.g., fake timeouts, alert dialogs, or local-only mutations).
- **Success:** Actions without functional backend service support are rendered as disabled with explicit badges (`[Pending Backend Service]`); blueprint studios explicitly declare "Draft / Unsaved" state; no action produces false success feedback without a verified backend transaction.

### CAP-6: Persistent Runtime Environment & Cohort Attestation
- **Intent:** Ensure operators are continuously aware of whether they are viewing synthetic fixtures, sandbox data, training accounts, or genuine production records.
- **Success:** The admin shell header persistently renders the active environment badge (`local`, `capstone`, `staging`) and dataset classification (`fixture`, `sandbox`, `training`, `genuine`), and strictly isolates External Cash reporting from platform revenue.

## 3. Constraints
1. **Shadcn Design Consistency:** Admin must adhere to the desktop shadcn UI system and Tailwind CSS styling; it does not adopt the consumer mobile Glovo theme.
2. **Domain Aggregate Isolation:** Order agreement, Work progress, Payment obligations, and Evidence proofs must remain separate entities and never collapse into a single status indicator.
3. **No Direct Model Coupling Across Modules:** Admin query projections must communicate via application service ports or governed query builders rather than importing cross-module infrastructure models directly.
4. **Deny-by-Default Execution:** Any high-risk mutation must require active permission, scope preview, mandatory operator justification, confirmation, and append-only audit logging.

## 4. Non-goals
- Porting consumer mobile views (`browse-mobile.html`) into the admin interface.
- Implementing complete command handlers for unbuilt TrustSupport or Operations services in Slice 1.
- Implementing live banking, payment gateway, or government ID collection integrations.
- Building complex automated revenue funnels or vanity analytical charts.

## 5. Success Signal
- All 11+ admin routes are secured behind `EnsureAuthenticated` and `EnsureAdminAccess`.
- The sidebar cleanly separates Operations, Marketplace, and Blueprints.
- Triage operates as a single queue linking into dedicated views.
- Clicking "Inspect" anywhere across the admin panel cleanly navigates to `/admin/inspect?ref=...`.
- Zero instances of `alert()` or `setTimeout()` simulation exist in admin action handlers.
- End-to-end route and access-control tests pass with 100% reliability.
