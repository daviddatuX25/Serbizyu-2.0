# ADR-032: Marketplace Interaction Telemetry, Client Tracking Architecture, and Category Health

## Context & Problem Statement
In Serbizyu 2.0, operators need visibility into catalog performance, customer discovery friction, search-to-fill rates, and Request sourcing speed (Time to First Quote / TTFQ) without micromanaging sovereign commercial choices. 

However, introducing analytics to a provincial marketplace operating under Philippine Data Privacy Act (DPA) and low-data rural connectivity (ADR-R-017) introduces severe architectural vulnerabilities:
1. Third-party cloud trackers (PostHog Cloud, Segment, Google Analytics) export citizen browsing behavior to foreign servers and create unauthorized cross-session user profiling.
2. Heavy self-hosted trackers (PostHog Self-Hosted, OpenReplay) introduce massive JavaScript bundles (~45–60KB+), DOM autocapture, and network polling that degrade performance on low-end Android phones and 2G/3G connections in Tagudin.
3. Trusting client-emitted conversion events would allow spoofed commercial analytics, while logging raw search phrases could leak private residential intent (e.g. searching specific family names or sensitive domestic needs).

## Decision

### 1. Client-Side Telemetry Engine: First-Party Native Beacon Module
- **Reject PostHog and OpenReplay**: Exclude heavy DOM autocapture, session replay, and foreign SDKs to preserve mobile performance and eliminate privacy leakage.
- **Reject Umami as primary engine**: Exclude generic web-traffic tools that cannot model qualified viewport impressions or server-side domain conversions.
- **Adopt First-Party Native React Telemetry**:
  - **Qualified Impressions**: Emitted only when a listing or request card is continuously $\ge 50\%$ visible in the viewport for at least 1,000 ms via native `IntersectionObserver`.
  - **Transport**: Batched client-side and dispatched via same-origin `navigator.sendBeacon('/api/telemetry/events')`, falling back to `fetch(..., { keepalive: true })` only when `sendBeacon` returns false.
  - **Budget**: Capped at maximum 20 events per batch and 16 KiB per payload. Flushed on page hide (`visibilitychange`) or count threshold.

### 2. Separation of Observational Events from Canonical Domain Truth
- **Client Beacons Own**: Qualified impressions, detail views, and allowlisted interaction taps (e.g. toggling delivery extensions, opening quote form).
- **Server Domain Truth Owns**: Quote submissions, Order agreements, Work completions, and Payments. Conversions are **derived strictly from PostgreSQL outbox domain events**, never trusted from browser beacons.

### 3. Zero-Leakage Privacy Guard & Controlled Intent Aggregates
- **Zero Raw Search Query Storage**: The system **NEVER** logs or stores verbatim search query text.
- **Controlled Intent Aggregates**: Unmet demand is tracked strictly through governed taxonomy buckets: `(date, environment, cohort, barangay_bucket, category_id, category_version_id, zero_result_count)`. Queries are classified at ingestion and the raw string is immediately discarded. Small-count samples ($k < 5$) are suppressed from admin views to ensure anonymity.

### 4. Asynchronous Pipeline & Daily Rollups
- **Ingestion Route (`POST /api/telemetry/events`)**: Validates the allowlisted event payload schema, enqueues to a low-priority Redis queue, and returns HTTP 202 Accepted. Returns HTTP 429 on rate limit and HTTP 503 if queueing fails.
- **Daily Rollup Aggregation**: An asynchronous scheduler aggregates observational client events and domain outbox events into immutable daily metric tables keyed by `(metric_date, environment, cohort_class, geography_bucket, category_version_id, listing_version_id)`.

### 5. The 3-Tier Admin UI Presentation
- **Tier 1 (Macro Category Health Strip)**: Category Performance Matrix, Discovery CTR, Search-to-Fill Rate, Quote Coverage, Median TTFQ, and Supply Pressure.
- **Tier 2 (Table Scan Chips)**: Compact scan-first signals on Listings (`👁️ Views · CTR %`) and Requests (`📥 Quotes · TTFQ SLA`).
- **Tier 3 (Peek Drawer / Workspace Detail)**: Visual 4-stage funnel (`FunnelAnalytics.tsx`) with drop-off percentages and automated optimization guidance.

### 6. Guarded Administrative Levers
Telemetry generates explainable recommendations and triage items, never automated mutations:
- **Circuit-Breaker Pause**: A Level-3 category/listing governance command requiring operator justification and audit logging (e.g. weather alerts).
- **Sourcing Push**: Triggers outreach to accredited providers in neighboring barangays when an RFQ suffers from low liquidity.
- **Stale Listing Flag**: Notifies the provider/agent to update photos or rates when a listing suffers from high impressions but near-zero clicks.

## Consequences
1. Zero external analytics script dependencies in the application bundle.
2. Full compliance with Philippine Data Privacy Act and Serbizyu zero-leakage guarantees.
### 7. Dual-Use Telemetry: Provider Self-Service Adoption ("My Space")
- **Shared Telemetry Contract**: The interaction telemetry pipeline (impressions, views, inquiries, conversions, and TTFQ) is **dual-use**:
  1. **Admin Console (`/admin/listings`, `/admin/tenders`)**: Macro catalog health, category liquidity, zero-result search detection, and operator governance.
  2. **Provider Mobile Interface ("My Space" / Provider Analytics under PRD-057 & REQ-BST-03)**: Self-service visibility for individual providers (e.g. Arman Electric or Ate Gina) to inspect their own listing funnel, drop-off points, and quote win rates.
- **Reusable Projection**: When building the mobile provider views from `browse-mobile.html`, the exact same client telemetry beacon and daily metric contracts (`listing_daily_metrics`) will be adopted to render provider-scoped performance summaries without creating separate measurement silos.

3. High operational clarity for admins without table clutter or micromanagement of private transactions.
