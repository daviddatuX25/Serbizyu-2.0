# Admin Operations Workbench Rules

Guidance for all Admin routes, controllers, middleware, and frontend pages (`resources/js/Pages/Admin/**`, `resources/js/layouts/AdminLayout.tsx`).

## Core Invariants

1. **Investigation Over Dashboards:** Admin is an L4 investigation and recovery workspace. Read truth must always precede control execution.
2. **Separation of Aggregate States:** Never merge Order, Work, Payment Obligation, Evidence, or Dispute into a single status badge. Maintain independent visual rails for each.
3. **No Fake Operations:** Never use `alert()`, `setTimeout()`, or local React state mutations to simulate backend actions (e.g. fake "Resolved", "Released", or "Retried"). If a backend service does not exist yet, render the action as disabled with an honest badge explaining it is pending backend support.
4. **Universal Inspector:** All "Inspect" links across Triage, Orders, Disputes, Payments, and System Health must route to `/admin/inspect?ref=...` rather than duplicating inspector fragments.
5. **Route Protection:** All admin routes must be secured behind authentication and `primary_access_tier === 'L4'` or active admin/operator role.
6. **Cohort & Environment Truth:** Always display explicit environment (`local`, `capstone`) and dataset cohort (`fixture`, `sandbox`, `training`, `genuine`). External Cash must never be counted or displayed as platform revenue.
