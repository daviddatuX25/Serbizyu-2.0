# Serbizyu 2.0 — Architecture Decision Records (ADR) Catalog

> HISTORICAL / NON-AUTHORITATIVE — superseded by `adr-catalog-rebuilt.md`; preserved for traceability only.
> **BMAD Method Phase 3 Artifact: ADR Catalog**
> *Document Version:* 4.2.0
> *Date:* July 28, 2026
> *Authors:* Winston (System Architect persona) & Engineering Lead
> *Baseline:* PRD v3.0.1 (Sections 1–9 locked), Listing Model Taxonomy, Schema Decisions v4 (30 tables / 8 bounded contexts), Founder directives July 28, 2026
> *Supersedes:* architecture.md §5 ADR-001/002 (July 25, 2026) — those two records are absorbed into ADR-001 and ADR-009 below.

**How to read:** Each record follows *Status / Context / Decision / Alternatives Considered / Consequences / Verification*. Requirement traceability uses PRD `REQ-*` IDs. Every record is **load-bearing** — changing it cascades into weeks of rework. Minor configuration choices (category rules, copy strings, fee defaults) are *not* ADRs and live in `commission_configs` / `feature_flags` instead.

**ADR lifecycle:** `Proposed → Accepted → Locked`. An ADR may be revisited only by a new ADR that explicitly supersedes it.

---

## Domain 1 — Data & Persistence

### ADR-001: PostgreSQL 16 + PostGIS as the Single System of Record

* **Status:** Locked
* **Traces to:** REQ-ARC-02, REQ-SRC-01, REQ-SC-01
* **Context:** The platform needs (a) 28 categories with different attribute shapes per category, (b) 10 fulfillment archetypes each with a different internal state machine, (c) barangay-level geospatial search, and (d) a strict zero-recurring-cost constraint. MySQL forces an EAV pattern for (a) and has weak JSON indexing; MongoDB adds a second database to operate, back up, and learn — and has no transactional guarantee spanning listings and ledger.
* **Decision:** PostgreSQL 16 with PostGIS, self-hosted on the pilot VPS. Flexible attributes live in JSONB columns with GIN indexes (`listings.attributes`, `work_instances.structure`). Money, ledger, orders, and listings share one ACID boundary.
* **Alternatives Considered:**
  * *MySQL 8 + EAV* — rejected: EAV joins are O(n) per attribute filter and unreadable at 28 categories.
  * *PostgreSQL + MongoDB* — rejected: two backup regimes, two ops skillsets, cross-store joins impossible; violates zero-cost in operational overhead if not pesos.
  * *DynamoDB/Firestore* — rejected: recurring SaaS cost, no PostGIS, no double-entry ledger enforcement via CHECK constraints.
* **Consequences:**
  * Team must learn PG specifics: JSONB path queries, GIN index tuning, `ltree`, partial indexes.
  * One backup regime (`pg_dump` daily, 30-day retention per §8.2).
  * JSONB is treated as **opaque** by every domain except its owner engine — no cross-domain queries into another domain's JSONB internals.
* **Verification:** Migration suite runs green; EXPLAIN shows GIN index scans (not seq scans) on `attributes` queries at 50K-row seed data.

---

### ADR-002: Single `listings` Table with Type Discriminator

* **Status:** Locked
* **Traces to:** Listing Model Taxonomy §1–2, REQ-LST-01/02/03, REQ-TXN-03
* **Context:** Four listing types (Service, Product, Service Request, Product Request) share ~80% of fields (title, description, category, pricing, media, geo, status) and must appear together in one search index, one feed, one map. Four separate tables duplicate the search stack four ways and make the dual-tab feed (Direct Offers vs Buyer Requests) a UNION query.
* **Decision:** One `listings` table, `type` enum discriminator (`service|product|service_request|product_request`). Shared fields as real columns. Type-specific fields (`service_radius`, `stock_count`, `request_budget_centavos`) as type-scoped real columns or inside `attributes` JSONB per the taxonomy. `search_vector` tsvector + Meilisearch sync from the same source rows.
* **Alternatives Considered:**
  * *Table-per-type* — rejected: 4× migration surface, 4× search pipelines, cross-type feed becomes application-side merge.
  * *Single Table Inheritance with JSONB only* — rejected: losing real-column constraints on hot fields (price, status, type) invites invalid rows.
* **Consequences:**
  * Schema must accept all four types from day one; adding a field later is a migration, not a new table.
  * CHECK constraints enforce type-specific invariants (e.g. `request_budget_centavos IS NOT NULL WHEN type IN ('service_request','product_request')`).
  * Digital is **not** a listing type — it is fulfillment archetype A9 on a Service or Product listing (Taxonomy §1, locked).
* **Verification:** Seed script creates all four types through one Eloquent model; feed query is a single indexed SELECT.

---

### ADR-003: All Money as `bigint` Centavos; Ledger is Source of Truth, Balance Column as Write-Time Cache

* **Status:** Locked (revised July 29 — balance column adopted per financial architecture research)
* **Traces to:** REQ-PAY-03, REQ-GOV-01
* **Context:** Floating-point peso columns accumulate rounding error (₱0.01 drift per rounding path) which, across thousands of escrow splits, becomes real missing money. Separately, computing every balance as `SUM()` over `ledger_lines` on every read is correct but becomes a hot query at scale. Production financial systems (Stripe, Modern Treasury) use a dual approach: the ledger journal is the immutable source of truth, and a stored balance column is updated atomically in the same ACID transaction as the ledger write — it cannot drift because both live or both die together.
* **Decision:**
  1. Every monetary value is `bigint` centavos (₱500.00 = `50000`). No `DECIMAL`, no `FLOAT`. Display formatting at the application edge only.
  2. `ledger_lines` is the **immutable source of truth**. All financial reporting, auditing, and dispute evidence reads from ledger lines.
  3. `ledger_accounts.balance_centavos` is a **write-time cache** — updated atomically in the same PostgreSQL transaction as the ledger line INSERT. `UPDATE ledger_accounts SET balance_centavos = balance_centavos + :amount WHERE id = :account_id`. Because both the debit/credit INSERT and the balance UPDATE share one ACID boundary, the cache cannot drift from the source of truth by construction.
  4. Nightly reconciliation job (ADR-004) cross-checks `SUM(ledger_lines) = SUM(balance_centavos)` per account. Any non-zero drift — which should never happen under ACID — pages the admin.
  5. External read paths (API, dashboard, notifications) read `balance_centavos` for O(1) performance. Audit and dispute paths read `ledger_lines` directly.
* **Alternatives Considered:**
  * *DECIMAL(12,2)* — rejected: still permits application-side float math before persistence; CHECK constraints cannot catch semantic drift.
  * *SUM()-only, no stored balance* (original ADR-003) — revised: correct at pilot scale, but at higher tx volume every balance check becomes an aggregate query. The stored column is an ACID-guaranteed optimization, not a second source of truth.
  * *Redis balance cache* — rejected: Redis adds operational surface and eventual consistency; an ACID-txn column has zero staleness by definition.
  * *PostgreSQL materialized view* — deferred: CONCURRENT refresh adds complexity; the atomic UPDATE pattern is simpler and carries zero staleness.
* **Consequences:**
  * Rounding bugs become type errors at review time, not production incidents.
  * All split math (90/10, 80/10/10) must define a rounding owner — platform absorbs the residual centavo (rule: `platform_pct` receives `amount − provider − agent`).
  * The `LedgerService` is the single writer — no other code path touches `ledger_lines` or `balance_centavos`. This is the catastrophic-bug-class guardrail.
* **Verification:** Property test: for random amounts and splits, `provider + agent + platform == amount` always. Nightly reconciliation: `SUM(ledger_lines) vs SUM(balance_centavos)` = 0 for 7 consecutive days.

---

### ADR-004: Double-Entry Ledger as the Single Money Tracking Mechanism (All Payment Modes)

* **Status:** Locked
* **Traces to:** REQ-PAY-02/03/04/05/09/10, REQ-GOV-01/02, §6.1
* **Context:** Escrow is the trust foundation of the entire PRD. The release window was initially described as a fixed 3-day Shopee-style guarantee (PRD §4.2, §6.1), but in practice different services need different windows — a tricycle driver needs gas money in 1 hour, while a construction project may have a 14-day inspection window. Per the Payment Protection Taxonomy (ADR-026), each listing declares its own `escrow_release_hours` (0 = use platform default of 72h). Buyers see this window before committing. Additionally, listings may opt into `direct` payment mode where no escrow hold occurs at all — the buyer is warned "not protected, not refundable." Financial events must still be (a) immutable, (b) auditable, (c) reconcile-able to zero drift, and (d) replayable for dispute evidence. A `payments` table with status flags cannot answer "where is this centavo right now" without archaeology.
* **Decision:** Every movement of money — hold, release, refund, commission split, payout, cash-receivable accrual — is a `ledger_entries` journal row with ≥2 `ledger_lines` (debit/credit pairs) into `ledger_accounts`. CHECK constraint: exactly one of debit/credit is non-null per line; per-entry trigger asserts Σdebits = Σcredits. Ledger rows are INSERT-only; corrections are offsetting entries, never UPDATE/DELETE (REQ-PAY-03, REQ-GOV-01). Nightly reconciliation job asserts global Σdebits = Σcredits and per-account balances match expectations; any drift pages the admin (REQ-PAY-10). The escrow release window is per-listing configurable, capped by `platform_configs.max_escrow_release_hours` (default 720h / 30 days). `escrow_release_at` is snapshotted on `orders` at creation — changing the listing later does not affect existing orders.
* **Alternatives Considered:**
  * *Single-entry payment records* — rejected: cannot prove conservation of money; dispute evidence becomes screenshots, not math.
  * *Event-sourced ledger only (no current-state accounts)* — rejected: overkill for pilot scale; account-address model (`escrow:order:{id}`, `payable:provider:{id}`, `revenue:commission`) gives the same audit power with simpler queries.
* **Consequences:**
  * Wrong debit/credit sign is the catastrophic bug class — mitigated by (1) all posting through one `LedgerService`, (2) the per-entry balance trigger, (3) nightly recon.
  * Xendit holds real custody; the internal ledger is the platform's source of truth for *obligations* (REQ-PAY-02). The two reconcile via webhook-posted entries.
  * Cash transactions post accrual entries (commission receivable) even though no funds move through Xendit (REQ-PAY-05).
* **Verification:** Gate G2 (Week 6): 0% balance drift across the automated suite; recon job runs against production-seeded data with zero discrepancies for 7 consecutive days.

---

### ADR-005: Webhook and Side-Effect Idempotency Enforced at the Database

* **Status:** Locked
* **Traces to:** REQ-PAY-02 (idempotent webhooks), REQ-NTF-01, §8.1 (escrow webhook < 2s)
* **Context:** Xendit retries webhooks; TextBee can deliver the same inbound SMS twice during GSM flaps; users double-tap. Application-level "did we process this?" checks race under Octane's concurrent workers.
* **Decision:** Every external reference gets a UNIQUE constraint: `payments.provider_ref` (Xendit IDs), `sms_log.textbee_msg_id`, `ledger_entries.idempotency_key` (order_id + action + attempt semantics). Duplicate delivery = unique-violation = caught and treated as already-processed (200 OK). Retries are safe by construction.
* **Alternatives Considered:**
  * *Redis dedup SET NX* — rejected: Redis flush loses dedup state; financial idempotency must survive cache loss.
  * *Application check-then-insert* — rejected: TOCTOU race under concurrent workers.
* **Consequences:** Webhook handlers are written "insert-first, react-second"; handlers must be pure with respect to external side effects (which flow through ADR-009's outbox).
* **Verification:** Test suite replays every Xendit webhook 3×; ledger shows exactly one entry; handler returns 200 each time.

---

### ADR-006: Work Instances — JSONB Internal State + Materialized Status Enum (D5/D6 Contract)

* **Status:** Locked
* **Traces to:** REQ-ARC-01/02, Taxonomy §3–4, REQ-TXN-01
* **Context:** Ten archetypes (A1 Linear Project … A10 Long-Running) have ten different internal state machines (D5). But Orders, Payments, Notifications, Disputes, and the SMS layer all need **one** answer to "what is happening with this job" (D6). Letting each archetype publish its own status vocabulary forces every consumer to understand ten machines.
* **Decision:** `work_instances.structure` JSONB holds archetype-private state, owned exclusively by that archetype's engine (D5). `work_instances.status` is a real enum column — `not_started | in_progress | awaiting_signoff | completed | disputed` — maintained by `WorkStatusService::sync()` which each engine calls after any internal transition (D6). All other domains read only the enum. Four launch presets (A1, A3, A4, A9) get first-class engines; the remaining six are config-tier templates on the same contract.
* **Alternatives Considered:**
  * *One giant state machine covering all archetypes* — rejected: a 40-state machine where each archetype uses a subset; transition validation becomes spaghetti.
  * *Ten separate work tables* — rejected: order-to-work join becomes polymorphic chaos; escrow release checks ten tables.
* **Consequences:**
  * The D6 contract is sacred: formalize the output, not the process. An archetype engine that forgets `sync()` is a P0 bug — escrow release keys off the enum.
  * New archetypes are engine plugins, not schema changes.
* **Verification:** Contract test per archetype: every reachable internal state maps to exactly one D6 enum value; escrow release integration test passes per archetype.

---

### ADR-007: Geospatial Model — H3 Res-8 ltree Array + PostGIS Point, Separated

* **Status:** Locked
* **Traces to:** REQ-SRC-01, REQ-CAT-03
* **Context:** Search needs two different spatial answers: (1) "does this provider cover my barangay?" (containment — the provider's service area), and (2) "who is nearest?" (distance ranking for dispatch-like flows). The first schema draft jammed both into one JSONB blob, which no index can serve.
* **Decision:** Two columns, two jobs. `listings.service_area_h3` as `ltree[]` of H3 Resolution-8 cells (coverage set) with a GiST index — containment queries are index scans. `listings.location` as PostGIS `geography(Point)` (the provider's base point) with a GiST index — distance/k-NN for ranking and map display. H3 cell math happens in application code; the DB only stores and indexes.
* **Alternatives Considered:**
  * *JSONB array of H3 strings* — rejected (Schema Correction #1): no indexable containment semantics.
  * *PostGIS-only radius circles* — rejected: per-provider radius math at query time doesn't scale and can't express "these 5 barangays, not that one."
  * *H3-only, no PostGIS* — rejected: k-ring expansion answers containment but not true distance ranking.
* **Consequences:** Listing writes must compute both columns in one transaction; a barangay boundary update is an H3 re-index job, not a schema change.
* **Verification:** Coverage query ("providers serving Barangay Bio") uses the GiST index per EXPLAIN; 95th percentile spatial filter < 50ms at seed volume.

---

### ADR-008: Category Tree as `ltree` Path (28 Categories, 8 Tiers)

* **Status:** Locked
* **Traces to:** REQ-CAT-01..06, §3.1
* **Context:** 28 categories in 8 tier groups, trilingual labels (EN/TL/ILO), per-category attribute schemas and license flags. `parent_id`-only trees force recursive CTEs for every "all listings under Home Services" query.
* **Decision:** `categories.path` as `ltree` (`home_services.plumbing`), GiST-indexed. `attribute_schema` JSONB declares per-category extra fields; `license_type` enum drives informational badges (REQ-CAT-06 — badges, not blockers, at launch). Category management is admin-defined; low-activity removal is an admin decision, never automatic (REQ-CAT-05).
* **Alternatives Considered:**
  * *Adjacency list + recursive CTE* — rejected: correct but 10–50× slower on tier-wide queries and harder to index.
  * *Nested sets* — rejected: write amplification on any tree edit for zero read benefit over ltree at this scale.
* **Consequences:** Renaming a category slug rewrites descendant paths inside one transaction; trilingual display names live in columns, not the path (path is machine-only).
* **Verification:** Tier-wide listing query is an index scan; category admin UI round-trips a rename without orphaning listings.

---

## Domain 2 — Transactions & Agent Network

### ADR-009: Transactional Outbox for All Side Effects

* **Status:** Locked
* **Traces to:** REQ-PAY-02, REQ-NTF-01/02, REQ-TXN-06/07, REQ-CH-01..07, §8.2 (reliability)
* **Context:** A booking commit must also: notify via SMS, sync Meilisearch, post the SEO snapshot job, and emit channel-connector jobs. If the process dies after the DB commit but before the SMS call, the owner never gets the consent prompt — lost consent proof is legal exposure (ADR-010), and lost listing sync is silent catalog rot. The old architecture.md ADR-002 chose this pattern for Redis desync; this ADR generalizes it to **all** side effects.
* **Decision:** `domain_events` table as a transactional outbox. Events are INSERTed in the same ACID transaction as the state change (`aggregate_type`, `aggregate_id`, `event_type`, `payload`, `occurred_at`, `published_at NULL`). A Horizon worker polls unpublished rows, dispatches (SMS jobs, search sync, snapshot regeneration, Facebook posts, push), and marks `published_at`. At-least-once delivery; consumers are idempotent (ADR-005).
* **Alternatives Considered:**
  * *Direct dispatch after commit* — rejected: crash window between commit and dispatch loses events.
  * *Laravel events w/ sync queue* — rejected: same crash window; queue-only delivery has no replayable record.
  * *Debezium/CDC* — rejected: operational overkill for one VPS.
* **Consequences:** One extra write per state change (trivial at 100 txns/day). All integrators (TextBee, Meilisearch, Reverb, FB) consume one pipeline with unified retry/backoff. Polymorphic `aggregate_type` carries a CHECK whitelist (Schema Correction #4).
* **Verification:** Kill -9 the worker mid-dispatch in staging; on restart, the pending event dispatches exactly once; no lost SMS in a 500-booking soak test.

---

### ADR-010: Human Agent Network with SMS-OTP Consent Gates (Oversight, Not Gating)

* **Status:** Locked
* **Traces to:** §3.8 REQ-AGT-01..05, REQ-TXN-06/07, §4.3, §4.4
* **Context:** ~70% of provincial service providers (persona "Tatay Ben", PER-02) have feature phones — no data, no smartphone. Without a bridge, the platform excludes exactly the supply side it exists to serve. But agent-managed money movement without owner proof of consent is legal exposure (DOLE §4.4 classification; DPA).
* **Decision:** Agents (Identity-Verified minimum, REQ-AGT-01) manage owner accounts under an **oversight model**: agents act; owners are notified by SMS; only account-structure changes are gated — listing activation and agent assignment change require owner SMS OTP (REQ-TXN-06). Payout withdrawal (the agent's own earned commission) is NOT gated — agents withdraw freely; owners are notified after the fact via SMS with STOP/REVOKE as recourse. Routine work (booking confirmations, message replies, calendar updates) needs no SMS (REQ-TXN-07). Every gate and action writes `agent_consents` (OTP-linked) and every outbound SMS carries the safety footer *"Reply STOP to suspend agent. Reply REVOKE to permanently remove agent."* (REQ-AGT-04). One active agent per owner enforced by partial unique index on `agent_assignments(owner_id) WHERE status='active'`; full history retained. Graduation: when an owner goes independent, the agent earns a 3×-month commission bonus (§4.3) — incentive aligned with owner empowerment, not lock-in.
* **Alternatives Considered:**
  * *Full gating (SMS approval for everything)* — rejected: feature-phone latency (<10s per OTP per §8.1) makes routine bookings unbearable; agents quit.
  * *No consent trail* — rejected: "my agent stole my payout" with no proof chain ends the platform.
* **Consequences:** SMS volume budget (500/month pilot, §8.4) constrains notification matrix choices (REQ-NTF-02: SMS for time-sensitive only). DOLE misclassification risk tracked P0 in research agenda; model documented as independent-contractor-by-design (§4.4).
* **Verification:** Gate G3 (Week 9): OTP-gated actions provably blocked without consent row; STOP/REVOKE keywords halt agent actions within one SMS round-trip.

---

### ADR-011: Commission Snapshot on Order Creation (90/10 · 80/10/10 Defaults)

* **Status:** Locked
* **Traces to:** §4.1 (locked July 27), REQ-PAY-06, REQ-TXN-02
* **Context:** Rates are admin-configurable per category/tier/province and **will change** (philosophy: start low for adoption, adjust as the platform grows). If an order reads config at payout time, a mid-dispute rate change retroactively alters what a provider is owed — accounting corruption and dispute fuel. Note the baseline correction: §3.10 REQ-PAY-06 still prints the older 75/10/15 example; §4.1 is the locked authority: **Direct = 90% provider / 10% platform; Agent-managed = 80% owner / 10% agent / 10% platform; cash transactions 8% platform; category subsidies 0–3%; time-bounded promos supported.**
* **Decision:** `orders.commission_snapshot` JSONB freezes the resolved rate set (percentages, subsidy flags, promo flags, config version ID) at order creation. All downstream ledger postings (ADR-004) read the snapshot, never live config. `commission_configs` rows are effective-dated and append-only for the same reason.
* **Alternatives Considered:**
  * *Live config reads* — rejected: retroactive corruption on every rate edit.
  * *Config versioning with joins* — rejected: snapshot-on-row is simpler, faster, and self-proving in disputes.
* **Consequences:** Rate changes apply only to future orders; admin UI must display the snapshot per order; reconciliation reports diff snapshot vs config to surface "orders under old rates."
* **Verification:** Change a rate in staging between order creation and payout; payout posts ledger lines matching the original snapshot exactly.

---

### ADR-012: One Order State Machine for All Five Transaction Mechanisms

* **Status:** Locked
* **Traces to:** REQ-TXN-01..07, Taxonomy §3, §3.3
* **Context:** Five mechanisms create orders (Direct Booking, Reverse Bidding, Quick Deal, Deal-Chaining, Agent-Mediated) plus a 1:1 quote variant (`bid_type:'quote'`, REQ-TXN-05). If each mechanism had its own order lifecycle, escrow logic, the dispute SLA (48h, §6), and notification matrix would be implemented five times.
* **Decision:** Every mechanism converges on one `orders` table and one state machine with two protection paths:

  **Tiwala Contract path:** `pending_payment → held_in_escrow → in_fulfillment → completed`

  **Direct Payment path:** `pending_payment → in_fulfillment → completed` (skips escrow hold; `escrow_release_at = NULL`)

  Both paths share the same terminal states: `disputed / cancelled / refunded`. Mechanism is metadata (`orders.origin` enum incl. `deal_chain`, `offline_sync`). Deal-Chaining is a container (`deal_chains`) whose slots each spawn an independent Order (Taxonomy §3). Every transition writes `order_status_transitions` with actor + reason (Schema Correction #3) — a flat enum alone cannot answer "who moved this and why" in a dispute. Quick Deal negotiation has no hard cap on counter-offer rounds (founder directive: caps are restrictive to real-world dealing); platform config may add a soft limit later if abuse patterns emerge.
* **Alternatives Considered:**
  * *Per-mechanism order tables* — rejected: five escrow implementations, five dispute paths.
  * *State machine library with per-mechanism graphs* — rejected: the D6 contract (ADR-006) already guarantees one vocabulary; extra graphs add no value.
* **Consequences:** New mechanisms (e.g. a future subscription flow) are new `origin` values + outbox event types, not new lifecycles.
* **Verification:** Integration suite drives all five mechanisms through identical escrow/dispute paths; transition log shows complete audit chains.

---

### ADR-013: Offline Quick Deal — Local-First with Server Authority on Sync (Cloud Truth Boundary)

* **Status:** Locked
* **Traces to:** §3.3 Quick Deal Offline Behavior, REQ-PAY-09, §7.2
* **Context:** Provincial connectivity is intermittent; face-to-face deals must work air-gapped (QR + counter-offer stepper). But money truth can never live on a device — REQ-PAY-09: real money is governed exclusively by the cloud backend and Xendit; offline transactions default to external cash settlement.
* **Decision:** Quick Deal state (QR session, ≤3 counter-offers, dual confirmation) executes fully on-device with a `qr_session_id` and `offline_created_at`. On reconnect, the deal syncs as a unit; the server validates, assigns the order, and posts ledger entries. Digital escrow is never validated or disbursed offline — an offline-completed deal is cash-settled externally by definition. Conflicts (double-spend of a slot, stale listing) resolve **server-wins**, surfaced to both parties on next sync.
* **Alternatives Considered:**
  * *CRDT merge of deal state* — rejected: complexity unjustified when one canonical writer (the scanning smartphone) exists per deal.
  * *Offline escrow holds* — rejected: violates the Cloud Truth Boundary; legally and technically indefensible.
* **Consequences:** PWA needs IndexedDB queue + background sync (ADR-016); UX must label offline deals as cash-settled before the first counter-offer.
* **Verification:** Airplane-mode e2e test: full deal offline, sync on reconnect, exactly one order created, ledger correct, duplicate-sync replay is a no-op (ADR-005).

---

## Domain 3 — Application & Interface

### ADR-014: Frontend — Inertia v3.6 + React 19.2 + TypeScript + Tailwind 4.3 + shadcn/ui 4.16

* **Status:** Locked (founder directive, July 28, 2026; versions updated July 29 per stack audit)
* **Traces to:** §8.1 (PWA < 3s on 4G), REQ-ACC-03 (WCAG 2.1 AA), §9.3
* **Context:** The platform needs SEO-able public pages and a fast authenticated app, on a team that is deliberately standardizing across projects. Per founder directive: **React, not SvelteKit** — chosen to diversify the team's framework experience and to match the portfolio-wide stack already proven on NEXIAM and NyTprintz (Laravel 12 + Inertia v3 + React + TypeScript). The July 25 architecture.md naming SvelteKit is superseded.
* **Decision:** Laravel 12 + Inertia v3.6 + React 19.2 + TypeScript as one monolith. Tailwind 4.3 + shadcn/ui 4.16 for components — style **not** locked to the stock theme; Serbizyu branding (green `#1a5632`, gold `#f5a623`) applied at the token layer. Vite build. Route-level code splitting to hit < 3s interactive on 4G and < 8s first paint on 3G/2G (§8.1). PWA manifest + service worker per ADR-016. React 19 migration note: run `npx codemod react-19` for propTypes/defaultProps removal; concurrent mode is default.
* **Alternatives Considered:**
  * *SvelteKit + Inertia* (July 25 draft) — superseded by directive; smaller bundle but breaks portfolio standardization.
  * *Next.js separate frontend* — rejected: two deployables, loses Inertia's zero-API-glue velocity, adds Node runtime to the VPS.
  * *Livewire/Blade-only* — rejected: Quick Deal stepper and offline flows demand real client-side state machines.
* **Consequences:** Team writes one language end-to-end-ish (PHP/React-TS); shadcn components are copied into the repo and owned (no dependency churn). NEXIAM patterns (Inertia form handling, Tailwind dark-mode safelist lessons) transfer directly.
* **Verification:** Lighthouse on 4G throttling ≥ 90 performance on listing page; `pnpm build` produces per-route chunks < 200KB initial.

---

### ADR-015: Public SEO via Inertia v3 SSR + Edge Cache

* **Status:** Locked (revised July 29 — Blade snapshots replaced with Inertia SSR)
* **Traces to:** REQ-CH-07, §8.1, §9.3 (channels)
* **Context:** Public listing pages must rank on Google (a locked channel) and render for L1 kiosk browsers and FB link previews, but the app is client-rendered React/Inertia (ADR-014). Blade-based snapshots (original ADR-015 draft) create a second rendering path that drifts from the React components over time.
* **Decision:** Inertia v3 native SSR. A lightweight Node process runs alongside PHP-FPM on the same VPS, rendering React components to full HTML on the server. The rendered output is cached at Cloudflare's edge. On cache miss, the SSR process generates the page server-side — same React components as the interactive app, zero drift. schema.org markup (LocalBusiness/Service) and OG/Twitter meta are rendered in the same SSR pass. sitemap.xml regenerates nightly.
* **Alternatives Considered:**
  * *Blade snapshots* (original ADR-015 draft) — superseded: two rendering paths (Blade + React) inevitably drift. Inertia SSR renders the same React components used by the PWA.
  * *Prerender SaaS* — rejected: recurring cost, external dependency.
  * *Client-render only* — rejected: kills SEO and FB preview cards, both locked channels.
* **Consequences:** Node SSR process adds ~100–200 MB RAM to the VPS (within the 4 GB budget). Pages render server-side on first request then cached at Cloudflare edge — typical viewer sees cached HTML. Cold SSR renders add ~200–500ms to first request; acceptable per §8.1 targets given edge caching absorbs subsequent hits.
* **Verification:** `curl` a listing URL returns full HTML + schema.org JSON-LD without JS; Lighthouse SEO = 100; FB Sharing Debugger renders the card.

---

### ADR-016: PWA Offline-First via IndexedDB + Background Sync (L0–L4 Tier-Aware)

* **Status:** Locked
* **Traces to:** §7.1 (L0–L4), §7.2, REQ-ACC-01/02/03
* **Context:** The platform's reason to exist is the digital divide: L0 feature-phone (SMS only), L1 kiosk tablet, L2 intermittent smartphone, L3 online smartphone, L4 desktop. Feature sets must degrade by tier while producing identical Orders (REQ-ACC-02).
* **Decision:** One PWA build, tier-aware feature gating at runtime: `devices.access_tier` (per device, not per user — the same person can have an L0 phone and an L2 smartphone) drives which UI modules load. IndexedDB (Dexie) caches top/popular listings for L2; Request/Quote compositions queue offline and sync on reconnect; Quick Deal runs fully local per ADR-013. Service worker strategies: cache-first for catalog media, network-first for order state (stale order state is worse than no state).
* **Alternatives Considered:**
  * *Separate lite app* — rejected: two codebases, one team.
  * *Server-driven tier detection (UA sniffing)* — rejected: UA lies; device capability + explicit registration is authoritative.
* **Consequences:** Every feature spec must declare its minimum tier; QA matrix = 5 tiers × core flows. L0 is served by the SMS layer (ADR-018), not the PWA.
* **Verification:** e2e per tier: L2 completes a queued Request offline→sync; L0 owner completes an OTP consent with zero app involvement.

---

### ADR-017: Phone-Primary Identity — SMS OTP Auth, Sanctum for Sessions

* **Status:** Locked
* **Traces to:** §3.13 REQ-VER-01, §8.3 (auth), PER-02
* **Context:** 70% of target users have phones but no email (PER-02). Passwords for feature-phone-adjacent users are a security and usability dead end; meanwhile admins and L3/L4 users need standard session auth.
* **Decision:** `phone_number` (E.164) is the primary identity; signup and login are 6-digit SMS OTP (`auth_otps`, hashed, 5-attempt cap, single-use, expiring). Email+password is optional, unlocked for admins and L2+ users who add it. Laravel Sanctum: session cookies for web, personal access tokens for the PWA. Verification tiers (Phone → Identity → Barangay → Professional → Business) gate capabilities per REQ-VER-01; verification documents encrypted at rest, access-logged, purgeable per DPA (§8.3).
* **Alternatives Considered:**
  * *Email-primary* — rejected: excludes the core supply side.
  * *Social login* — rejected: FB account ≠ identity for escrow; adds Meta dependency to the auth path.
* **Consequences:** OTP delivery SLA (<10s, §8.1) becomes an auth dependency — mitigated by TextBee (ADR-018) with a cold-standby device. Account recovery = OTP to the same number + admin review for number changes.
* **Verification:** Auth pen-test checklist: OTP brute-force lockout, replay rejection, SIM-swap admin flow documented.

---

## Domain 4 — Integration & Infrastructure

### ADR-018: SMS via TextBee Android Gateway (Dedicated Device + Cold Standby)

* **Status:** Locked (founder directive, July 28, 2026 — supersedes PRD §9.4 Gammu line, to be reconciled at next PRD revision)
* **Traces to:** REQ-SC-01, §8.1 (OTP < 10s), §8.4 (500 SMS/month pilot), REQ-NTF-01
* **Context:** Two-way SMS (outbound OTP/notifications + inbound consent replies/STOP/REVOKE) is a hard dependency for L0. SaaS gateways (Semaphore ~$22–45/mo at pilot volume) violate the zero-recurring-cost constraint. The PRD's zero-cost table listed Gammu + USB GSM dongle; the team has **working experience with TextBee and zero development cost to test it now** — per founder directive, TextBee is the decision.
* **Decision:** A dedicated Android phone running the TextBee gateway app, SIM with an unli-SMS plan, stationed with reliable power and signal. Outbound: server enqueues via outbox (ADR-009) → TextBee API/poll → device sends. Inbound: device forwards via webhook → `sms_log` with unique `textbee_msg_id` (ADR-005) → keyword router (APPROVE/STOP/REVOKE/ACCEPT). A second configured-but-powered-off phone is the cold standby; SIM swap = minutes of downtime. Delivery status tracked `queued|sent|delivered|failed` with retry/backoff.
* **Alternatives Considered:**
  * *Gammu + USB GSM dongle* (PRD §9.4 print) — superseded: no team experience; dongle + ModemManager debugging is unbudgeted dev time.
  * *Semaphore/Twilio SaaS* — rejected: recurring cost against REQ-SC-01.
  * *Push-only, drop SMS* — rejected: kills L0 entirely.
* **Consequences:** Single point of failure by design (accepted, mitigated by standby device + alerting on delivery failures); GSM network latency is outside SLA control (monitor only); SIM load (~₱100/mo unli-SMS) is an operating petty-cash item, not infra SaaS. **Provider abstraction:** SMS dispatch goes through a swappable `SmsDriver` contract (Laravel service container binding) — TextBee is the default implementation at launch, but Semaphore or any future provider can be swapped via config without touching business logic. The outbox (ADR-009) ensures SMS jobs are already decoupled from the request lifecycle. Cold-standby device covers device failure; the driver abstraction covers provider migration.
* **Verification:** Soak test 500 outbound/100 inbound across 48h with ≤1% failure; failover drill (kill primary, activate standby) < 10 minutes.

---

### ADR-019: Meilisearch Self-Hosted for Typo-Tolerant Trilingual Search

* **Status:** Locked
* **Traces to:** REQ-SRC-03, §9.4, §8.1 (< 200ms)
* **Context:** Search must tolerate "mabaho aircon", mixed Tagalog/Ilocano/English queries, and run on the same zero-cost VPS. Postgres FTS is good but weak at typo tolerance and ranked trilingual stemming; Elasticsearch is a RAM hog; Meilisearch Cloud is a recurring SaaS.
* **Decision:** Meilisearch as a Dokploy-managed container on the pilot VPS. Listings sync from the outbox (ADR-009) on create/update/delete. Relevance tuned with custom ranking rules: verification tier, trust score, ε-greedy cold-start blend (80/20 veteran/newcomer impressions, REQ-SRC-04) applied at query composition. Postgres remains the write-side truth; Meilisearch is a disposable read model — full reindex from PG is a single artisan command.
* **Alternatives Considered:**
  * *PG tsvector only* — rejected as sole engine: no typo tolerance, weak trilingual ranking (kept as fallback for exact filters).
  * *Elasticsearch/OpenSearch* — rejected: ≥1GB JVM baseline on a 4GB VPS.
  * *Algolia/Meilisearch Cloud* — rejected: recurring cost.
* **Consequences:** Search lag = outbox latency (seconds) — acceptable per §8.1 targets; memory budget for Meilisearch capped via container limits; language config limited to stop-word/synonym lists for TL/ILO (no custom stemmer in v1).
* **Verification:** Seeded corpus test: typo queries return intended category in top-5 ≥ 90%; p95 search < 200ms; full reindex < 10 minutes at 50K listings.

---

### ADR-020: Single-VPS Dokploy Deployment on Existing Proxmox + Cloudflare Edge

* **Status:** Locked
* **Traces to:** §9.6, REQ-SC-01, §8.2 (99% uptime academic), §8.4
* **Context:** Academic ceiling: 50 concurrent users, 100 txns/day, 20GB storage. Existing infra: Proxmox host with dev/prod VMs, domain `dxtechph.online`, Dokploy already orchestrating other projects. Managed platforms (Forge $24/mo, DO Apps) violate zero-cost; multi-node HA is academic overkill.
* **Decision:** One Dokploy-managed VPS (2 vCPU / 4GB RAM baseline) running containers: Laravel app (PHP-FPM + Nginx), PostgreSQL 16, Redis, Meilisearch, Reverb (WebSocket), Horizon workers. Cloudflare handles DNS + TLS 1.3 + edge caching of snapshots (ADR-015) and media. CI/CD: GitHub push → Dokploy webhook → rebuild → deploy. Daily `pg_dump` + file backup, 30-day retention, 4-hour RTO (§8.2). Uptime target 99% (single node, academic); ledger availability engineered to 99.9% via conservative writes and recon (ADR-004).
* **Alternatives Considered:**
  * *Laravel Forge + DO* (July 25 cost model) — rejected: $24/mo recurring against REQ-SC-01.
  * *Kubernetes (k3s)* — rejected: orchestration overhead buys nothing at 50 users.
  * *Serverless (Vercel/PlanetScale)* — rejected: recurring cost + data-residency/DPA complications + can't host Gammu-class hardware adjacencies or the TextBee adjacency.
* **Consequences:** Team owns all ops: backups, monitoring (Uptime Kuma + Telescope), SSL renewal via Dokploy. Review trigger locked: if ops exceeds 2 hrs/week, re-evaluate managed hosting.
* **Verification:** Restore drill from backup to fresh VM < 4h; deploy pipeline green from a clean `main` push; load test 50 concurrent users holds p95 API < 300ms.

---

### ADR-021: Serbi AI — Cloud-Only, Draft-Only, via Laravel AI SDK

* **Status:** Locked
* **Traces to:** §3.6 REQ-SRB-01..09, §9.3
* **Context:** Serbi assists onboarding, listing drafting, bid writing, and Q&A in English/Tagalog/Ilocano. Guardrails are product-critical: never auto-publishes, never initiates, never touches disputes or finances, identifies as AI, optional (REQ-SRB-04/09). Cost must stay near zero during the academic phase.
* **Decision:** Server-side only via Laravel AI SDK against OpenRouter. Every Serbi output is a **draft** — it writes into form state, never into the database; a human submit is required (REQ-SRB-03/05/07). Prompt/response caching in Redis (24h) to collapse repeat Q&A cost. Rate-limited per user; disabled platform-wide by a feature flag if spend or abuse appears. No on-device model in v1 (FastEmbed tier deferred to Phase 3+).
* **Alternatives Considered:**
  * *On-device SLM* — deferred: device classes at L2 can't sustain it; revisit Phase 3+.
  * *Direct OpenAI/Anthropic keys* — rejected: OpenRouter gives multi-model failover without code change.
  * *Serbi in SMS channel* — rejected for v1: cost per SMS turn and safety-guardrail enforcement are both worse than in-app.
* **Consequences:**

  **Implementation baseline (researched July 29):** The `laravel/ai` SDK v0.x has native `openrouter` driver support — no custom HTTP client needed. Built-in providers include Text, Embeddings, Image, Audio, Transcription, and WebSearch. Events (`PromptingAgent`, `AgentPrompted`, `AgentFailedOver`, `ProviderFailedOver`) enable audit logging and failover monitoring. Default models: `anthropic/claude-sonnet-4.6` (smart, ~$15/M tokens), `anthropic/claude-haiku-4.5` (cheap, ~$1/M tokens).

  **Cost strategy — double-layer caching:**
  1. Redis application cache (24h TTL on prompt_hash → response) — identical questions = $0 API cost
  2. OpenRouter server-side cache — semantically similar prompts hit their cache
  Estimated API spend at pilot volume: sub-$5/month with aggressive caching.

  **Build estimate:** ~3–5 developer-days for a working dual-mode prototype (informational + transactional). Guardrail tests: adversarial prompts must not produce auto-published content, financial actions, or dispute advice.

  Online-only features degrade gracefully — Serbi affordances simply don't render at L0/L2-offline (ADR-016 tier gating). Prompt templates are versioned in-repo for review.

  **Two interaction modes:**
  1. **Informational (direct response):** Quick inquiries — "What's the release window?", "How many bookings this week?", "Show me plumbers near Barangay Bio" — Serbi answers directly without navigating screens. Read-only, low latency, no UI manipulation overhead.
  2. **Transactional (UI navigation):** Action requests — "Book me a tricycle to the market", "Post a listing for aircon repair" — Serbi translates intent into UI actions (fill form fields, trigger search, navigate to screen). Every backend mutation flows through the same validation, authorization policies, and business rules as human-driven actions. A rate-limiting gateway layer prevents prompt-injection abuse and request flooding. Human submit is always the final step.

  **Performance:** Informational mode is lightweight (API call → cached response). Transactional mode adds UI render cycles — browser performance impact must be measured per-device-tier (acceptable at L3/L4; L2 may defer transactional mode). Prompt/response caching in Redis (24h) collapses repeat queries in both modes.
* **Verification:** Guardrail test suite: adversarial prompts cannot produce auto-published content, financial actions, or dispute advice; AI spend dashboard shows per-day cost < budget ceiling.

---

## Domain 5 — Quality & Operations

### ADR-022: File & Media Storage — Local Disk (Pilot), Cloudflare R2 (Phase 2+)

* **Status:** Locked
* **Traces to:** PRD §9.4, REQ-VER-01 (document uploads), DPA compliance
* **Context:** Listing images, verification documents, and dispute evidence must be stored durably and served to users. At pilot scale (~50 concurrent users, ~100 txns/day), volume is low (estimated < 5 GB in first 3 months). Cloud object storage (S3, R2) adds recurring cost and operational surface. However, storing verification documents (government IDs, permits) requires DPA-compliant retention and purge.
* **Decision:** Pilot: `laravel-local` disk on the VPS filesystem, backed up with the daily database dump. Phase 2+: Cloudflare R2 (S3-compatible, zero egress fees, ₱0 at pilot volume). Verification documents encrypted at rest (`php encrypt` before write); access logged to `audit_log`. Purge schedule: verification docs deletable on user request per DPA; listing media retained for dispute window (90 days post-order-completion) then soft-deleted.
* **Alternatives Considered:**
  * *AWS S3 from day one* — rejected: recurring cost against REQ-SC-01; egress fees at scale.
  * *Cloudflare R2 from day one* — deferred: adds integration surface before the backup regime is proven. Move to R2 when (a) pilot completes G4 or (b) storage exceeds 5 GB.
  * *Base64 in database* — rejected: bloats the database, kills backup speed, bypasses CDN caching.
* **Consequences:** Single-VPS disk is a SPOF for media — accepted at pilot scale (same disk as the DB; daily backups cover it). Phase 2 migration path: artisan command to rsync local media → R2, then swap disk config. Backup job must include the storage directory alongside `pg_dump`.
* **Verification:** Listing image upload/display works locally; backup archive includes media files; verification document encryption + audit log entry confirmed.

---

### ADR-023: Authorization — Hybrid RBAC + Policy Gates, Tiered by Verification

* **Status:** Locked
* **Traces to:** REQ-VER-01 (5-tier verification), REQ-AGT-01..05, §3.13
* **Context:** The platform has six role types (Customer, Service Provider, Seller, Agent, Admin, Kiosk Operator) and five verification tiers (Phone → Identity → Barangay → Professional → Business). Capabilities are gated by BOTH role AND verification tier — e.g., "Agent" is a role, but an Agent at Phone tier cannot manage owner payouts; they must reach Identity tier. Additionally, the Agent oversight model (ADR-010) requires OWNER consent for specific actions. A flat role-based middleware cannot express these compound gates.
* **Decision:** Hybrid model:
  1. **Roles** (Customer, Service Provider, Seller, Agent, Admin, Kiosk) — assigned at registration, stored in `users.role`. Broad buckets for routing and UI.
  2. **Verification tier** — `users.verification_tier` (Phone | Identity | Barangay | Professional | Business), progressively unlocked. Each tier adds capabilities.
  3. **Laravel Policies** — per-model authorization (`ListingPolicy`, `OrderPolicy`, `PayoutPolicy`, `AgentPolicy`) that check `role AND verification_tier AND ownership/assignment`. Gate names follow `{action}-{resource}` convention (e.g., `manage-payouts`, `approve-listing`).
  4. **Consent gates** — `agent_consents` table (ADR-010). Actions requiring owner OTP (listing activation, payout withdrawal, agent change) check for a valid, non-expired consent row before proceeding.
* **Alternatives Considered:**
  * *Pure RBAC middleware* — rejected: cannot express "Agent at Phone tier CAN browse listings but CANNOT manage payouts."
  * *ABAC engine (Casbin/Oso)* — rejected: operational complexity unjustified for 6 roles and 5 tiers.
  * *Permissions table with role→permission mapping* — accepted as a future optimization; for pilot, policies with tier checks are simpler and more auditable.
* **Consequences:** Every new protected action requires a policy method. Policy test suite must cover the role × tier matrix (~30 combinations) for each gated capability. Middleware only handles authentication; authorization is always policy-based.
* **Verification:** Policy test suite passes for the full role × tier matrix; Agent at Phone tier cannot access payout endpoints (403); Identity-tier Agent CAN manage listings but still requires OTP for activation.

---

### ADR-024: Backup & Disaster Recovery — Daily Dump + Off-VPS Replication

* **Status:** Locked
* **Traces to:** REQ-SC-01, §8.2 (99% uptime, 4-hour RTO), DPA (data residency)
* **Context:** The platform holds financial records (double-entry ledger), personal data (government IDs, phone numbers), and operational state. A single-VPS deployment means disk failure = total data loss without off-machine backups. ADR-004 mandates 0% ledger drift — but a lost ledger is worse than a drifted one. The zero-cost constraint rules out managed backup services.
* **Decision:**
  1. **Daily:** `pg_dump` (custom format, compressed) + tarball of storage directory (`/var/www/storage/app/`), written to a local backup directory.
  2. **Off-VPS replication:** The backup archive is pushed to a secondary location daily via `rclone` — either Google Drive (free 15 GB, already configured on the Proxmox host per existing infra) or a second Proxmox storage volume. The target is `gdrive:serbizyu-backups/` using the existing rclone configuration.
  3. **Retention:** 30 daily snapshots on the remote target. Local copies retained for 7 days.
  4. **Restore drill:** Quarterly manual restore to a fresh Dokploy project. Target RTO: < 4 hours per §8.2. RPO: < 24 hours (daily backup — accepted at pilot volume; tighten to hourly post-pilot).
  5. **Verification:** Backup script exits non-zero on failure → alert to admin. Restore drill documented and timed.
* **Alternatives Considered:**
  * *Same-disk backup only* — rejected: disk failure kills backup and primary together.
  * *BorgBackup / restic to cloud* — deferred: adds operational learning curve. rclone to GDrive is battle-tested in this environment.
  * *Streaming WAL replication* — deferred: requires a standby PG instance; unjustified at 100 txns/day.
* **Consequences:** GDrive is a free dependency with no SLA — accepted. Backup job is a cron entry on the VPS (`0 2 * * *`). Restore drill adds ~2 hrs/quarter ops burden. RPO of 24h means a disaster at 23:59 could lose a day's transactions — mitigated by the double-entry ledger: all entries are also recorded in Xendit's system, so financial state is reconstructible from Xendit webhooks if needed.
* **Verification:** Backup script runs, archive is under 500 MB compressed at seed volume, rclone push succeeds, restore to clean Dokploy project completes in under 4 hours.

---

### ADR-025: Testing Strategy — PEST + Parallel PHPUnit for Legacy, Cypress for E2E

* **Status:** Locked
* **Traces to:** ADR-004 (financial correctness), ADR-005 (idempotency), §8.1 (performance SLAs)
* **Context:** The platform handles money in a double-entry ledger. Testing cannot be optional — a sign error in debit/credit logic is a catastrophic bug. The team (4 BSIT students) has varying testing experience. The test suite must be fast enough to run on every push without discouraging the team, yet thorough enough to catch financial bugs before they reach production.
* **Decision:**
  1. **Unit/Feature tests:** PHPUnit (Laravel's default) for all critical paths. PEST PHP as the preferred syntax for new tests (cleaner, less boilerplate, better for a student team). Both coexist — existing Laravel-generated `TestCase` classes remain PHPUnit-compatible.
  2. **Financial tests (mandatory):** Every path through `LedgerService` has a dedicated test asserting Σdebits = Σcredits. Idempotency: Xendit webhook handlers tested with 3× replay, asserting exactly one ledger entry. Commission splits: property-based test for "provider + agent + platform == amount" across random inputs.
  3. **E2E tests:** Cypress for the 5 transaction mechanisms (Direct Booking → Completed, Quick Deal → Escrow → Release, Reverse Bidding → Award, Agent-Managed → OTP Gate → Order, Deal-Chaining → Multi-Slot). One happy-path test per mechanism. Not exhaustive — Cypress is slow; 5 workflows only.
  4. **Coverage target:** ≥ 80% line coverage on `app/Services/LedgerService.php` and `app/Services/WorkStatusService.php`. ≥ 60% on all other service classes. No coverage target on controllers (integration-tested via feature tests).
  5. **CI:** Tests run on every push via GitHub Actions (or Dokploy webhook pre-deploy check). Financial test suite must be green before deploy.
* **Alternatives Considered:**
  * *PEST-only* — rejected: team already has PHPUnit familiarity from NEXIAM; dual support eases transition.
  * *Full E2E suite* — rejected: Cypress tests are slow and flaky at UI layer; reserve for the 5 mechanism happy paths.
  * *No coverage target* — rejected: without a target, coverage trends to zero. 60%/80% is achievable for a student team within 12 weeks.
* **Consequences:** Team must learn PEST syntax (low overhead — ~30 min). Cypress adds a Node dependency to CI. 5 E2E tests add ~3–5 minutes to the CI pipeline — acceptable on push.
* **Verification:** CI pipeline passes on first push after Sprint 0 setup; financial test suite fails if any debit/credit pair is unbalanced; webhook replay test asserts exactly one ledger entry.

---

### ADR-026: Payment Protection Taxonomy — Tiwala Contract + Direct Payment

* **Status:** Locked
* **Traces to:** REQ-PAY-04/09, §6.1, Listing Model Taxonomy, Founder directive Jul 29
* **Context:** The PRD described escrow as a fixed 3-day Shopee-style guarantee for all transactions. In practice, this is too rigid: a tricycle driver (A2 Instant Dispatch) needs gas money within hours, while a construction contractor (A1 Linear Project) may need a 14-day inspection window. Additionally, some servicers may want to offer direct (no-escrow) payment — the PRD's "cash transactions" handle offline cash but there is no digital equivalent where a buyer pays online without escrow protection. The platform must support both models while informing buyers of the protection level before they commit.
* **Decision:**

  **Two payment protection modes, declared per listing:**

  | Mode | Column Value | Escrow? | Buyer Warning | Auto-Release |
  |---|---|---|---|---|
  | **Tiwala Contract** | `tiwala_contract` | Yes — buyer's money held until release or dispute | No warning (this is the safe default) | `escrow_release_hours` after order creation (0 = platform default of 72h). Capped at `max_escrow_release_hours` (720h / 30d). |
  | **Direct Payment** | `direct` | No — money goes straight to servicer | ⚠️ "This listing uses Direct Payment. Your payment is NOT protected by Tiwala Contract and is NOT refundable." | N/A — no escrow hold exists |

  **Three new concepts visible to buyers on listing cards and detail pages:**

  1. **"Tiwala Contract · X days"** — badge showing the escrow duration. "Tiwala" = Tagalog for trust/confidence. This is the default and expected mode.
  2. **"Direct Payment · No Protection"** — warning badge. Listing cards with this mode get a distinct visual treatment (amber/red accent vs green Tiwala badge).
  3. **"Running Transaction"** — badge appearing when a listing has active un-released escrow (`active_escrow_count > 0`). Does not block new orders but informs buyers that the servicer currently has held funds. Computed from denormalized counter on the `listings` table.

  **Per-listing escrow window:** `listings.escrow_release_hours` (INT, default 0). 0 = use platform default (72h). Validated at application layer against `platform_configs.max_escrow_release_hours`. Displayed prominently on listing detail. Servicers who need fast release (e.g., tricycle, delivery) set short windows; those with inspection-heavy work set longer ones.

  **Snapshot on order creation:** Both `payment_protection` and `escrow_release_at` (the computed wall-clock time) are frozen on the `orders` row at creation. Changing the listing's settings later does NOT affect existing orders — same snapshot principle as commission rates (ADR-011).

  **Archetype-suggested defaults:** Each fulfillment archetype in the taxonomy has a suggested `escrow_release_hours` default that pre-fills when creating a listing: A2 (Instant Dispatch) = 1h, A3 (Appointment) = 24h, A7 (Quoted) = 72h, A1 (Linear Project) = 168h, A10 (Long-Running) = 336h. The servicer can override within the platform max.

* **Alternatives Considered:**
  * *Fixed 3-day for everyone* (PRD original) — rejected: too rigid; kills adoption for archetypes that need faster liquidity (tricycle, same-day delivery).
  * *Escrow mandatory on all digital payments* — rejected: some servicers and buyers have established trust; forcing escrow adds friction they don't want. The warning label is sufficient protection.
  * *Per-category release windows instead of per-listing* — rejected: even within one category, servicers have different cash-flow needs. Configurability at listing level is the simplest model for the pilot.
  * *No buyer warning for direct payment* — rejected: buyer must know they're opting out of protection. The warning is mandatory and unskippable in the checkout flow.

* **Consequences:**
  * `listings` gains 3 columns; `orders` gains 2 columns; `platform_configs` gains 1 table (31 total tables).
  * Order state machine (ADR-012) now has two paths — the direct-payment path skips `held_in_escrow` entirely.
  * Escrow auto-release logic must handle NULL `escrow_release_at` for direct-payment orders (no release job fires).
  * `active_escrow_count` on listings must be maintained via trigger or outbox worker on order transitions — a denormalization that avoids per-listing subqueries in listing feeds.
  * The Tiwala Contract branding is platform-specific terminology. All user-facing copy must use these exact terms for consistency.
* **Verification:**
  * Listing with `tiwala_contract` + 1h release: fund → escrow holds → auto-releases at created_at + 1h.
  * Listing with `direct`: fund → order status goes straight to `in_fulfillment` → no escrow hold → no release job.
  * Listing with `escrow_release_hours = 0`: uses platform default (72h). Verified by inspection of `escrow_release_at` on the order.
  * Listing with `escrow_release_hours > max`: rejected at application layer with clear error message.
  * Existing order is NOT affected when listing's `escrow_release_hours` or `payment_protection` changes post-creation.
  * "Running Transaction" badge appears/disappears correctly as orders enter/leave `held_in_escrow` and `in_fulfillment`.

---

## Supersession & Reconciliation Log

| Item | Old Value | New Value | Authority |
|---|---|---|---|
| Frontend framework | SvelteKit + Inertia (architecture.md, Jul 25) | **React 18 + Inertia v2 + TS** (ADR-014) | Founder directive, Jul 28 |
| SMS gateway | Gammu + USB dongle (PRD §9.4); Semaphore (older docs) | **TextBee Android gateway** (ADR-018) | Founder directive, Jul 28 — PRD §9.4 to be patched at next revision |
| Revenue split example | 75/10/15 (PRD §3.10 REQ-PAY-06 print) | **80/10/10 agent-managed, 90/10 direct, 8% cash** (ADR-011) | PRD §4.1, locked Jul 27 |
| Hosting | Laravel Forge + DigitalOcean $24/mo (architecture.md §6) | **Dokploy on existing Proxmox, ₱0 recurring** (ADR-020) | PRD §9.6, locked Jul 27 |
| Old ADRs 001/002 (Jul 25) | PG+PostGIS; Redis-desync outbox | Absorbed & generalized into ADR-001, ADR-009 | This catalog |
| Readiness report v3.0.0 (Jul 25) | "APPROVED FOR PHASE 4" on stale schema/stack | **Replaced by v4.0.0** (Jul 29) | This catalog |
| Fixed 3-day escrow (PRD §4.2) | Platform-wide fixed 72h | **Per-listing configurable** + Direct Payment mode | ADR-004, ADR-012, ADR-026, Founder directive Jul 29 |
| 3-round negotiation cap | DB CHECK on quick_deals | **Removed** — no hard cap | Founder directive Jul 29 |

---

## Verification Gates (carried into Phase 3 readiness re-check)

| Gate | Week | Proof |
|---|---|---|
| G1 — Architecture | 3 | Migrations green; SMS OTP < 10s on Tagudin GSM (ADR-017/018) |
| G2 — Money | 6 | 0% ledger drift; webhook replay idempotent; recon 7 days clean (ADR-004/005) |
| G3 — Agent & Mobile | 9 | Consent gates block without OTP; 80/10/10 split posts correctly from snapshot; PWA offline Quick Deal e2e (ADR-010/011/013/016) |
| G4 — Pilot | 12 | 50+ seeded listings live on Dokploy; all four launch archetypes transact end-to-end (ADR-020/006) |

---

*End of ADR Catalog v4.2.0 — 26 load-bearing decisions. Next: Phase 3 readiness re-check.*
