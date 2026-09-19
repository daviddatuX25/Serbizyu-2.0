---
paths:
  - 'app/Modules/Operations/**'
---

# Operations

## Desktop-First Shadcn Admin and Multi-Aggregate Separation
Admin views adopt desktop-first laravel-shadcn-admin architecture with Inertia React. Enforce tier L4 / active admin role middleware. Keep Order, Work, Payment, and Evidence aggregates strictly separated. All holds must be surgical and privileged mutations logged to audit_events.
