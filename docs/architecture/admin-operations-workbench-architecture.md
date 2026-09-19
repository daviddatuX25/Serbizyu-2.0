# Serbizyu 2.0 - Admin Operations Workbench Architecture

## 1. Executive Purpose & Core Thesis
Admin in Serbizyu 2.0 is a **desktop investigation and recovery workspace** for operators and supervisors in Tagudin, Ilocos Sur. It is **not a vanity metric dashboard**, nor is it a duplicate of the consumer marketplace.
> **Central Invariant:**  
> Admin exists to notice, understand, and safely remediate exceptional system state.  
> Investigation context must always precede control execution.

```
TRIAGE (What needs attention?)
       ↓
INSPECTOR (What actually happened?)
       ↓
GUARDED ACTION (What surgical change is required?)
       ↓
AUDIT EVENT (Who changed it, why, and what was the prior state?)
```

---

## 2. Separation of State Invariants

The admin surface strictly preserves the domain boundary separation defined in canonical architecture:

$$\text{Order Agreement} \neq \text{Work Execution} \neq \text{Payment Obligation} \neq \text{Evidence Proof} \neq \text{Dispute/Hold}$$

- **Order Agreement:** Terms, agreed price, buyer/provider parties, timestamps.
- **Work Execution:** Milestone DAG, physical/digital progress, evidence gates.
- **Payment Obligation:** Custody lane (Cash vs Escrow), declaration status, provider event reconciliation.
- **Evidence Proof:** Uploaded artifacts, verification logs, hashes, access reasons.
- **Dispute & Hold:** Surgical freeze on a specific aggregate without blocking unrelated work.

No admin screen may merge these into a single synthetic "status" badge.

---

## 3. Information Architecture & Navigation

The admin shell is structured around operator jobs, organized into three distinct groups:

```
OPERATIONS (Daily Attention & Remediation)
├── Triage Queue          (/admin/triage)          [OPS-001]
├── Identity Review       (/admin/identity-review) [OPS-002]
├── Universal Inspector   (/admin/inspect)         [OPS-003, OPS-004]
├── Disputes & Holds      (/admin/disputes)        [OPS-005]
├── Safety Incidents      (/admin/safety)          [OPS-006]
└── System Health         (/admin/system-health)   [OPS-007, OPS-009]

MARKETPLACE (Read-Mostly Oversight & Discovery)
├── Orders & Work         (/admin/orders)
├── Listings              (/admin/listings)
├── Requests & Quotes     (/admin/requests)        (formerly Tenders)
├── Accounts              (/admin/users)
└── Payments & Ledgers    (/admin/financials)

BLUEPRINT GOVERNANCE (Occasional Authoring & Configuration)
├── Work Templates        (/admin/catalogs/work)
├── Deal Chains           (/admin/catalogs/deal-chains)
└── Categories & Rules    (/admin/catalogs/taxonomy)
```

---

## 4. Canonical Screen Specifications

### OPS-001: Triage Queue
- **Job:** Prioritized triage of items requiring operator attention.
- **Contract:** Displays normalized `AdminQueueItem` records across all incident kinds:
  `identity_review`, `payment_mismatch`, `dispute`, `administrative_hold`, `safety_incident`, `failed_event`, `support_case`.
- **Constraint:** Triage provides pointers and direct routing to dedicated workspaces; it never embeds full sub-tools.

### OPS-002: Identity Review
- **Job:** Review identity documents and evidence to gate named capabilities.
- **Contract:** Displays applicant, requested capability, evidence classification, operator access justification, and review status.
- **Constraint:** Unauthorized evidence remains hidden behind explicit access reason logging.

### OPS-003 & OPS-004: Universal Inspector
- **Job:** Single deep-dive inspection route for any record on the platform (`/admin/inspect?ref=...`).
- **Target Resolution:** Resolves Order reference, Work reference, Obligation reference, User reference, Dispute reference, Event ID, or Correlation ID.
- **Layout:** High-level summary header with parallel, independent aggregate rails for Order, Work, Payment Obligation, Evidence, Disputes/Holds, Outbox/Messages, and Audit History.

### OPS-005: Disputes & Administrative Holds
- **Job:** Investigate contested transactions and apply/release surgical holds.
- **Constraint:** Holds must explicitly state the affected aggregate (e.g., Payment Obligation frozen while Work execution continues unblocked). Releases require mandatory justification and scope preview.

### OPS-007 & OPS-009: System Health & Recovery
- **Job:** Inspect outbox events, webhook deliveries, dead letters, and backup/recovery rehearsal logs.
- **Constraint:** Never display a default green status without verifiable rehearsal evidence.

---

## 5. Action Maturity & Truthfulness Rules

To prevent operator deception, admin UI interactions strictly adhere to four levels:

1. **Level 0 — Safe Navigation:** Inspect, filter, sort, deep-link, view audit trail.
2. **Level 1 — Blueprint Studio Interaction:** Move visual canvas nodes, edit draft properties in memory, test simulated layouts. Must display an explicit "Draft / Unsaved" indicator.
3. **Level 2 — Low-Risk Command:** Persisted via real backend command with idempotency (e.g., save blueprint draft, add internal note).
4. **Level 3 — High-Risk Operational Command:** Requires permission check, current-state revalidation, scope preview, mandatory justification reason, confirmation dialog, audit logging, and clear failure/recovery path.

### Prohibition of Fake Operations
- **NEVER** use browser `alert()` or `setTimeout()` to simulate backend mutations.
- **NEVER** show "Saved", "Resolved", "Released", or "Retried" toasts unless a real backend transaction succeeded.
- Features without backend services must be rendered as disabled with honest badges (e.g., `[Service Unavailable in Capstone]`).

---

## 6. Route Security & Access Control

1. **Authentication:** All `/admin/*` routes must be wrapped in `EnsureAuthenticated` and dedicated `EnsureAdminAccess` middleware.
2. **Authorization:** The operator must hold an active `admin` or `operator` role assignment and policy permission. (Do NOT authorize by `primary_access_tier === 'L4'`; access is governed strictly by authenticated role assignment per ADR-031).
3. **Environment & Cohort Banners:** The admin shell persistently displays the active runtime environment (`local`, `capstone`, `staging`) and active data cohort (`fixture`, `sandbox`, `training`, `genuine`).
