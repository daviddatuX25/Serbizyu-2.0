# Serbizyu 2.0 — Epics & User Stories Breakdown

> HISTORICAL / NON-AUTHORITATIVE — superseded by `epics-and-stories-rebuilt.md`; preserved for traceability only.
> **BMAD Method Phase 3 Artifact: Solutioning Epics & Stories**  
> *Document Version:* 4.0.0  
> *Date:* July 29, 2026  
> *Authors:* John (Product Manager) & Engineering Lead  
> *Supersedes:* epics-and-stories.md v3.0.0 (July 25) — stale stack, old entity names, outdated business rules
> *Stack baseline:* PHP 8.4 + Laravel 12 + React 19.2 + Inertia v3.6 + Tailwind 4.3 + shadcn/ui 4.16 + PostgreSQL 16 + Meilisearch 1.51 + Redis 7
> *ADR baseline:* adr-catalog.md v4.2.0 (26 ADRs)

---

## 0. Epic Overview & Dependency Map

```
+-- Sprint 0: Foundation (Week 1) --------------------------------------------+
|  S0.1 Dokploy + CI/CD + Schema (31 tables)                                  |
|  S0.2 Design system foundation (brand tokens, shadcn theme)                  |
|  S0.3 Code quality pipeline (PEST, Pint, Git hooks per ADR-025)              |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-- Epic 1: Identity + Catalog (Weeks 2–4) -----------------------------------+
|  S1.1 Phone OTP Registration + Sanctum Auth (TextBee/SmsDriver)              |
|  S1.2 5-Tier Verification + Document Upload                                  |
|  S1.3 Category Tree (28 categories, ltree, trilingual)                       |
|  S1.4 H3 Geo + PostGIS (Tagudin barangays)                                   |
|  S1.5 Listing CRUD with Payment Protection (Tiwala Contract / Direct)        |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-- Epic 2: Transactions + Money (Weeks 5–8) --------------------------------+
|  S2.1 Double-Entry Ledger + Balance Cache (the money spine)                  |
|  S2.2 Xendit Sandbox + Webhook Integration                                   |
|  S2.3 Direct Booking → Escrow → Tiwala Auto-Release                          |
|  S2.4 Direct Payment Path (no-escrow flow)                                   |
|  S2.5 Search + Discovery (Meilisearch, category browse, H3 proximity)        |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-- Epic 3: Agent + Trust + Pilot (Weeks 9–12) -------------------------------+
|  S3.1 Agent Network (assignments, consents, SMS gates)                       |
|  S3.2 Quick Deal QR (no cap, online-commit required)                         |
|  S3.3 Dispute Resolution + Evidence                                          |
|  S3.4 Reviews + Trust Score                                                  |
|  S3.5 Admin Dashboard (escrow summary, disputes, agent activity)             |
|  S3.6 PWA Offline (cached catalog, queued requests for L2)                   |
+-----------------------------------------------------------------------------+
```

---

## 1. Sprint 0: Foundation (Week 1)

### S0.1: Dokploy Project + CI/CD + Schema Migrations

* **As a** development team,
* **I want to** provision the Dokploy project on Proxmox with the full 31-table schema and a GitHub-to-Dokploy CI/CD pipeline,
* **So that** every push from day one deploys automatically to the staging environment.
* **Acceptance Criteria:**
  * Dokploy project created with containers: PHP 8.4 + Nginx, PostgreSQL 16 + PostGIS, Redis 7, Meilisearch 1.51, Reverb 1.11, Horizon.
  * `php artisan migrate` runs all 31 tables green (Identity, Agent, Catalog, Transactions, Financial, Trust, Communication, System).
  * GitHub push → Dokploy webhook triggers rebuild; green build = deploy to staging.
  * Cloudflare DNS + TLS configured for staging.serbizyu.dxtechph.online.
  * TextBee Android phone ordered/provisioned (physical device, unli-SMS SIM).

### S0.2: Design System Foundation

* **As a** user,
* **I want the** platform to feel like Serbizyu, not a stock component library,
* **So that** the brand is recognizable from the first pilot transaction.
* **Acceptance Criteria:**
  * shadcn/ui theme customized with Serbizyu brand tokens: green `#1a5632`, gold `#f5a623`, warm grays.
  * `Plus Jakarta Sans` (headings), `Inter` (body), `JetBrains Mono` (code) fonts loaded via Google Fonts CDN.
  * Dark/light mode toggle with Tailwind 4 color scheme support.
  * Shared component library: `SerbizyuButton`, `SerbizyuCard`, `SerbizyuBadge`, `SerbizyuInput`.
  * WCAG 2.1 AA color contrast verified on all brand tokens.

### S0.3: Code Quality Pipeline

* **As a** development team,
* **I want** automated testing, linting, and formatting enforced on every push,
* **So that** code quality is maintained from the first line.
* **Acceptance Criteria:**
  * PEST + PHPUnit configured per ADR-025. `LedgerService` test stub exists.
  * Laravel Pint (PSR-12) with project ruleset. Git pre-commit hook runs Pint.
  * GitHub Actions (or Dokploy pre-deploy check) runs test suite on push.
  * Financial test suite: `vendor/bin/pest --filter=Financial` must be green before deploy.

### S0.4: Development Workflow Setup (Tools & Rituals)

* **As a** development team,
* **I want** standardized tools and rituals for how we write, review, and merge code,
* **So that** every team member codes the same way and quality doesn't drift.
* **Acceptance Criteria:**
  * **Laravel Boost** installed for project scaffolding — `boost:install` completes with Inertia v3.6 + React 19.2 preset.
  * **OpenSpec ritual** documented in project README — before every code change: write spec in comment/issue → review with team/AI → implement → verify against spec.
  * **Context7** configured — codebase indexed for AI-assisted coding sessions.
  * **BMAD** directory confirmed — `_bmad/` + `_bmad-output/` structure in place for ceremonial planning of future phases/refactors.
  * **PEST + PHPUnit** dual config: new tests in PEST syntax, legacy PHPUnit tests coexist.
  * **Playwright** installed and configured — one skeleton E2E test (e.g., login flow) executing in CI.
  * **Laravel Pint** with project `pint.json` — pre-commit hook via `husky` or `lefthook`.
  * **GitHub flow** documented: feature branches, PR template, squash merge, CI must pass before merge.
  * Team onboarding doc in `docs/CONTRIBUTING.md` covering the full workflow.

---

## 2. Epic 1: Identity + Catalog (Weeks 2–4)

### S1.1: Phone OTP Registration + Sanctum Auth

* **As a** new user in Tagudin,
* **I want to** register using only my mobile phone number with an SMS OTP,
* **So that** I can create an account without needing email or a password.
* **Acceptance Criteria:**
  * Registration: enter E.164 phone number → receive 6-digit OTP via TextBee (through swappable `SmsDriver` contract) → enter OTP → account created.
  * 5-attempt lockout on OTP entry; OTP expires in 10 minutes; single-use.
  * `auth_otps` table: hashed OTP, attempts counter, expires_at.
  * Login: OTP to same number. Session cookie issued via Laravel Sanctum.
  * PWA token issued for L2+ users. Auth state persists across offline/online transitions.
  * OTP delivery SLA: <10 seconds on Tagudin GSM (monitored, not guaranteed).

### S1.2: 5-Tier Progressive Verification + Document Upload

* **As a** service provider,
* **I want to** verify my identity progressively (Phone → Identity → Barangay → Professional → Business),
* **So that** I can unlock higher capabilities and trust signals as I climb.
* **Acceptance Criteria:**
  * Tire 1 (Phone): automatic on signup — browse only.
  * Tier 2 (Identity): upload government ID + selfie → AI face match + admin spot-check → create listings, accept bookings.
  * Tier 3 (Barangay): upload Barangay Clearance → admin review → visibility boost.
  * Tier 4 (Professional): upload NBI Clearance + trade cert → lower dispute hold %.
  * Tier 5 (Business): upload DTI/SEC + BIR → no transaction caps, "Business Verified" badge.
  * All documents encrypted at rest (`php encrypt`); access logged to `audit_log`.
  * Verification is FREE per REQ-VER-02.

### S1.3: Category Tree (28 Categories, 8 Tiers, Trilingual)

* **As a** platform user,
* **I want to** browse a structured category tree in my preferred language,
* **So that** I can find exactly what I need whether I speak Tagalog, Ilocano, or English.
* **Acceptance Criteria:**
  * `categories` table: `path` as `ltree` (e.g., `home_services.plumbing`), GiST-indexed.
  * Display names in EN/TL/ILO stored as columns. Path is machine-only.
  * `attribute_schema` JSONB declares per-category extra fields.
  * Tier-wide listing query uses index scan (not recursive CTE).
  * Admin UI for category management; low-activity removal is manual per REQ-CAT-05.
  * 28 categories, 8 tier groups seeded from Tagudin market research.

### S1.4: H3 Geo + PostGIS (Tagudin Barangays)

* **As a** user searching for nearby services,
* **I want to** filter listings by barangay and see nearest providers first,
* **So that** I find someone who actually covers my area.
* **Acceptance Criteria:**
  * `listings.service_area_h3`: `ltree[]` of H3 Resolution-8 cells, GiST-indexed.
  * `listings.location`: PostGIS `geography(Point)`, GiST-indexed.
  * Coverage query ("providers serving Barangay Bio") uses index scan.
  * k-NN nearest-provider query uses GiST index per EXPLAIN.
  * Listing write: computes both columns in one transaction.
  * Tagudin barangay boundaries pre-indexed as seed data.

### S1.5: Listing CRUD with Payment Protection Mode

* **As a** service provider or agent,
* **I want to** create a listing with my preferred Payment Protection mode and escrow release window,
* **So that** buyers see exactly what protection they get before booking.
* **Acceptance Criteria:**
  * Listing form: title, description, category, pricing mode, media, geo, `payment_protection` (Tiwala Contract / Direct), `escrow_release_hours` (0 = platform default 72h).
  * Tiwala Contract badge renders on listing card: "Tiwala Contract · X days".
  * Direct Payment badge renders with warning: "Direct Payment · No Protection".
  * `escrow_release_hours` validated against platform max (720h / 30d).
  * Archetype-suggested defaults pre-fill the form (A2 = 1h, A7 = 72h, A1 = 168h).
  * Listing types: `service | product | service_request | product_request` per ADR-002.
  * Type-specific fields (`service_radius`, `stock_count`, `request_budget_centavos`) in real columns or `attributes` JSONB.

### S1.6: Inertia v3 SSR — Public Listing Pages + SEO

* **As a** platform,
* **I want** listing pages to render server-side so Google and Facebook can index them,
* **So that** providers' listings are discoverable through search and social media.
* **Acceptance Criteria:**
  * Inertia v3 SSR Node process runs alongside PHP-FPM on the Dokploy VPS (~150 MB RAM increment, within 4 GB budget).
  * Public listing pages render to full HTML server-side on first request; cached at Cloudflare edge thereafter.
  * schema.org JSON-LD (LocalBusiness/Service) rendered in SSR pass.
  * OG/Twitter meta tags generated from listing data.
  * `curl` a listing URL returns full HTML without JavaScript; Lighthouse SEO ≥ 95.
  * FB Sharing Debugger renders preview card correctly.
  * Cold SSR renders < 500ms. Edge-cached hits < 50ms.
  * sitemap.xml regenerates nightly covering all active public listings.

---

## 3. Epic 2: Transactions + Money (Weeks 5–8)

### S2.1: Double-Entry Ledger + Balance Cache

* **As a** platform administrator,
* **I want** every centavo tracked in an immutable double-entry ledger with atomic balance cache,
* **So that** balances are fast to read and the ledger is provably correct.
* **Acceptance Criteria:**
  * `ledger_entries` + `ledger_lines`: every money event creates ≥2 lines (debit/credit pairs).
  * CHECK: exactly one of debit/credit non-null per line; per-entry trigger asserts Σdebits = Σcredits.
  * INSERT-only. Corrections = offsetting entries, never UPDATE/DELETE.
  * `ledger_accounts.balance_centavos`: updated atomically in the same PG transaction as ledger line INSERT (ADR-003).
  * `LedgerService` is the single writer — no other code touches `ledger_lines` or `balance_centavos`.
  * Nightly reconciliation: `SUM(ledger_lines) = SUM(balance_centavos)` per account. 0% drift for 7 consecutive days.
  * PEST unit tests assert Σdebits = Σcredits on every path through `LedgerService`.

### S2.2: Xendit Sandbox + Webhook Integration

* **As a** developer,
* **I want to** integrate Xendit in sandbox mode with idempotent webhook handling,
* **So that** payment flows are testable before going live.
* **Acceptance Criteria:**
  * Xendit xenPlatform sandbox credentials configured via env.
  * Escrow hold creation: POST to Xendit API → `payments` row with `provider_ref` UNIQUE constraint.
  * Webhook handler: insert-first, react-second. Duplicate webhook = unique violation = 200 OK (ADR-005).
  * Escrow release: POST to Xendit API → mark payment as released → transition order status.
  * Disbursement: weekly batched payouts to provider accounts per REQ-PAY-07.
  * Test suite: replay each Xendit webhook 3× → exactly one ledger entry per replay.

### S2.3: Direct Booking → Escrow → Tiwala Auto-Release

* **As a** buyer,
* **I want to** book a Tiwala Contract listing and have my payment protected until release,
* **So that** I'm not paying for work that hasn't been done yet.
* **Acceptance Criteria:**
  * Buyer selects listing, enters amount, confirms → order created in `pending_payment`.
  * Payment goes to Xendit escrow → order transitions to `held_in_escrow`.
  * `orders.payment_protection` snapshotted as `tiwala_contract`.
  * `orders.escrow_release_at` computed from listing's `escrow_release_hours` (or platform default).
  * `orders.commission_snapshot` frozen at creation per ADR-011.
  * Provider completes work → `in_fulfillment` → `completed`.
  * Auto-release job: cron checks for `escrow_release_at <= NOW()` → releases funds → notifies both parties.
  * If buyer opens dispute before auto-release, escrow stays held. Dispute resolution per S3.3.
  * New providers: first 3 transactions held 2 extra days per §6.3.

### S2.4: Direct Payment Path (No-Escrow Flow)

* **As a** buyer,
* **I want to** use Direct Payment when I trust the provider,
* **So that** the provider gets paid immediately without waiting for escrow release.
* **Acceptance Criteria:**
  * Buyer selects Direct Payment listing → checkout shows mandatory warning: "This payment is NOT protected by Tiwala Contract and is NOT refundable."
  * Payment goes straight to provider (no escrow hold) → order transitions `pending_payment → in_fulfillment`.
  * `orders.payment_protection` = `direct`, `escrow_release_at` = NULL.
  * No auto-release job fires for direct-payment orders.
  * Dispute still possible — but with no escrow hold, recovery is external (receipt-based model per §6.1).
  * `orders.commission_snapshot` still frozen at creation. Platform commission posts as normal.

### S2.5: Search + Discovery (Meilisearch, Categories, H3)

* **As a** buyer,
* **I want to** search for "mabaho aircon" and find an aircon repair provider near my barangay,
* **So that** I find what I need even if I don't spell it right.
* **Acceptance Criteria:**
  * Meilisearch 1.51 container on Dokploy. Listings sync from outbox on create/update/delete.
  * Typo-tolerant trilingual search: Tagalog/Ilocano/English queries.
  * Custom ranking: verification tier → trust score → ε-greedy cold-start (80/20 veteran/newcomer).
  * H3 proximity filter: "near Barangay Bio" uses `service_area_h3` GiST index.
  * Search results < 200ms p95 per §8.1.
  * PG tsvector as fallback for exact filters (no Meilisearch dependency for simple lookups).
  * Full reindex from PG: `php artisan search:reindex` < 10 minutes at 50K listings.

---

## 4. Epic 3: Agent + Trust + Pilot (Weeks 9–12)

### S3.1: Agent Network (Assignments, Consents, SMS Gates)

* **As a** local agent (Kevin),
* **I want to** manage Tatay Ben's listings and bookings with SMS consent for critical actions,
* **So that** feature-phone owners can participate without buying a smartphone.
* **Acceptance Criteria:**
  * Agent registers at Identity-Verified tier per REQ-AGT-01.
  * Agent creates `agent_assignments` row with owner — link established.
  * **SMS-gated actions** (require owner OTP): listing activation, agent assignment change.
  * **Non-gated actions** (agent acts freely, owner notified): booking confirmations, message replies, calendar updates, **payout withdrawal** (agent's own commission — ADR-010).
  * Every consent event writes `agent_consents` row. Every SMS carries STOP/REVOKE footer.
  * One active agent per owner: partial unique index `WHERE status='active'`.
  * Revenue split: 80% Owner / 10% Agent / 10% Platform (per ADR-011, §4.1).
  * Agent Graduation: owner goes independent → agent earns 3× monthly commission bonus (§4.3).
  * Commission ladder: Bronze (10%) → Silver (11–12%) → Gold (13–15%) → Platinum (max).

### S3.2: Quick Deal QR (No Cap, Online Commit Required)

* **As a** buyer and servicer in person,
* **I want to** negotiate and confirm a deal face-to-face using QR codes,
* **So that** we can transact quickly without typing on our phones.
* **Acceptance Criteria:**
  * Servicer generates QR with deal offer → buyer scans → counter-offer stepper → generates QR back.
  * **No hard cap on counter-offer rounds.** Negotiation continues until both accept.
  * Final commit requires online connection: both accept → server creates order + escrow (Tiwala) or processes direct payment. No escrow creation offline.
  * After commit, parties can go offline. Re-connect required for escrow release.
  * Offline-completed deals are cash-settled externally per ADR-013.
  * Server-wins conflict resolution on sync.
  * "Running Transaction" badge appears on listing card (`active_escrow_count > 0`).

### S3.3: Dispute Resolution + Evidence

* **As a** buyer or provider who disagrees with a transaction outcome,
* **I want to** file a dispute with evidence and get a binding resolution within 48 hours,
* **So that** I have recourse if something goes wrong.
* **Acceptance Criteria:**
  * Either party files dispute with reason + evidence (photos, messages, receipts).
  * Admin gathers evidence independently from both parties.
  * Resolution target: 48h for deterministic cases; up to 5 days for complex.
  * Binding ruling recorded to immutable `audit_log`.
  * Dispute rate suspension: >5% dispute rate (90d rolling) triggers automatic provider pause.
  * External escalation handoff letter available per §6.5 (Barangay Lupon / DTI / Small Claims).
  * Cash disputes: receipt is primary trust anchor. No receipt = burden of proof on claiming party.

### S3.4: Reviews + Trust Score

* **As a** buyer,
* **I want to** see a provider's trust score and read verified reviews,
* **So that** I can make informed decisions before booking.
* **Acceptance Criteria:**
  * Both parties can review after completed transaction.
  * Minimum 3 reviews before star rating displays.
  * Verified reviews (with confirmed transaction) carry "Verified Task" badge.
  * Trust score composite: verification tier + completion rate + dispute rate + average rating + response time + repeat customer rate.
  * Provider can respond publicly to reviews.
  * Points awarded for submitting verified reviews per REQ-PTS-01.

### S3.5: Admin Dashboard

* **As a** platform administrator,
* **I want a** dashboard showing real-time escrow status, transaction volume, and agent activity,
* **So that** I can monitor platform health and resolve issues quickly.
* **Acceptance Criteria:**
  * Real-time escrow summary: total held, pending release, frozen/disputed.
  * Transaction volume and commission revenue by category and period.
  * Agent commission payouts and tier distribution.
  * Automated fraud flags: velocity checks, anomalous commission patterns, quote-to-booking ratio outliers.
  * Dispute queue with aging and resolution metrics.
  * Provider liquidity per category per barangay.

### S3.6: PWA Offline (Cached Catalog, Queued Requests)

* **As a** user with intermittent connectivity (L2),
* **I want to** browse cached listings and compose requests offline,
* **So that** I can still use the platform even when my signal drops.
* **Acceptance Criteria:**
  * Service Worker caches catalog media and top/popular listings in IndexedDB (Dexie.js 4.4).
  * Buyer Requests composed offline → queued in IndexedDB → synced on reconnect.
  * Tier-aware feature gating: L2 users don't see features requiring real-time connectivity.
  * Background Sync API for queued requests.
  * Network-first for order state; cache-first for catalog media.
  * `devices.access_tier` per device, not per user (same person can have L0 phone + L2 smartphone).

---

## 5. Explicitly Deferred (Phase 2+)

These features are documented but NOT committed for the 12-week pilot. They are deferred, not dropped — the schema and ADRs already accommodate them.

| Feature | Deferred Reason | Target Phase |
|---|---|---|
| **Serbi AI** (ADR-021) | Complex: dual-mode, guardrails, rate limiting, Redis caching. Separate planning needed. | Phase 3+ |
| **Deal-Chaining** (Multi-Slot DAG) | Needs stable single-order flow first. Schema prepared. | Phase 2+ |
| **Kiosk Access Points** (ADR-016 L1) | Hardware provisioning + custom tablet UI. | Phase 2+ |
| **3-Lane Compliance Dashboard** | Admin-only, low usage during pilot. | Post-pilot |
| **Boost/Advertising** (REQ-BST-01) | No liquidity to advertise before pilot proves market fit. | Phase 2+ |
| **Points/Affiliate** (REQ-PTS-04) | Needs active user base for referral mechanics. | Phase 3+ |
| **Push/In-App Notifications** | SMS-only sufficient for pilot. Push deferred. | Phase 2+ |
| **Channel Connectors** (FB/Messenger/TikTok) | Multi-channel distribution deferred. | Phase 2+ |
| **Backup Restore Drill Automation** (ADR-024) | Manual restore acceptable for pilot. Automate post-G4. | Post-pilot |
| **Reverse Bidding** | Deferred — Direct Booking + Quick Deal cover pilot use cases. Schema prepared. | Phase 2+ |

---

*End of Epics & User Stories Breakdown v4.0.0. Next: Phase 3 Implementation Readiness Check.*
