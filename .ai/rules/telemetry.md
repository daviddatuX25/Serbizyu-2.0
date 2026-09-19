# Marketplace Telemetry and Analytics Rules

Guidance for all telemetry endpoints, client tracking, and analytics dashboards (`resources/js/components/admin/FunnelAnalytics.tsx`, `docs/architecture/adr-marketplace-telemetry-and-category-health.md`).

## Core Invariants

1. **First-Party Native Beacons Only:** Reject third-party trackers (PostHog Cloud, Segment, Google Analytics) and heavy SDKs. Client telemetry must use native `IntersectionObserver` + batched `navigator.sendBeacon()`.
2. **Observational vs Domain Truth:** Browser beacons only report impressions, views, and interactions. Conversions (Quotes, Orders, Payments) MUST be derived from canonical PostgreSQL outbox domain events.
3. **Zero Raw Query Leakage:** Never store or display verbatim search query text. Aggregate demand into controlled taxonomy intent buckets (`category_id`, `barangay`, `zero_result_count`) with $k$-anonymity suppression.
6. **Dual-Use Metric Reuse:** All telemetry metrics (impressions, views, CTR, funnels) are dual-use and must be reusable for the Provider "My Space" dashboard (`PRD-057`, `REQ-BST-03`) without building separate analytics silos.
4. **3-Tier Admin Presentation:** Macro category health at top of page, compact micro-chips in scan tables, and visual 4-stage funnels in the Quick Peek Drawer.
5. **Guarded Commands:** Telemetry informs operators and generates recommendations; it never executes automated state changes without operator authorization.
