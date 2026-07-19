# Serbizyu — Decision Matrix
*Consolidated, resolved, and rationale-backed. Every open question from §14 of the full spec is answered here with a default, an owner, and a review trigger.*

---

## D1. Database: PostgreSQL (resolved)

| Factor | MySQL/MariaDB | PostgreSQL | Winner |
|---|---|---|---|
| Team familiarity | Higher (Laravel default) | Moderate | MySQL |
| JSONB + GIN indexing | Limited (JSON type, no GIN) | Native, mature | **Postgres** |
| Flexible attribute filtering | Requires EAV table or JSON_EXTRACT | JSONB @> operator, indexed | **Postgres** |
| Work Instance structure storage | Awkward | Natural fit | **Postgres** |
| Operational overhead | Lower | Slightly higher | MySQL |
| Future geospatial queries | PostGIS available but less mature | PostGIS best-in-class | **Postgres** |

**Decision:** PostgreSQL 16+.
**Rationale:** The two re-architected domains (Listings flexible attributes, Work pluggable engine) are JSONB-native. Choosing MySQL forces a third-table EAV workaround that reintroduces the exact rigidity we removed. PostGIS is a future-proofing bonus for geo-fenced rollout.
**Risk mitigation:** Team unfamiliarity is real but bounded — Laravel's database layer abstracts 90% of differences. The 10% that leaks (raw JSONB queries, GIN index tuning) is exactly where we want explicit control anyway.
**Review trigger:** If we hire a DBA or backend lead with strong MySQL preference and no Postgres experience, revisit before Phase 2.

---

## D2. Hosting: Laravel Forge + VPS (resolved)

| Factor | Laravel Cloud | Forge + VPS (DigitalOcean/Hetzner) | Winner |
|---|---|---|---|
| Managed Reverb | Yes, native | Self-hosted or Pusher | Cloud |
| Cost at Phase 1–2 | ~$20–40/mo (usage-based) | ~$12–25/mo (predictable) | **Forge** |
| Ops burden | Lower | Moderate | Cloud |
| Configurability | Limited | Full | **Forge** |
| Postgres/Meilisearch/Redis | Managed add-ons | Self-managed or DO managed | Tie |

**Decision:** Laravel Forge on a $24/mo DigitalOcean droplet (4GB RAM, 2 vCPU) for Phase 1–2. Add a second droplet for Reverb + queue workers at Phase 2 if load justifies it.
**Rationale:** Laravel Cloud's managed Reverb is attractive, but Phase 1–2 traffic is low enough that self-hosted Reverb on the same VPS is fine. The cost delta is small but compounds; more importantly, Forge gives us explicit control over Redis/Meilisearch/Postgres versions, which matters for a system with three datastores.
**Review trigger:** If we hit >500 concurrent WebSocket connections or spend >2 hrs/week on server ops, evaluate Laravel Cloud migration.

---

## D3. SSR Strategy: Hybrid snapshot rendering (resolved)

| Factor | Full Inertia SSR | Hybrid (public snapshot + client app) | Winner |
|---|---|---|---|
| Node process required | Persistent, alongside PHP-FPM | None (build-time or on-demand snapshot) | **Hybrid** |
| Public page freshness | Real-time | Eventual (regenerated on listing update) | SSR |
| Auth app complexity | Same | Same | Tie |
| Ops surface area | Higher (Node monitor, memory) | Lower | **Hybrid** |
| SEO/OG reliability | Perfect | Near-perfect (snapshot lag) | SSR |

**Decision:** Hybrid. Public listing/category/profile pages are server-rendered via a lightweight Blade snapshot, regenerated on `OfferUpdated` event and cached. The authenticated app (dashboard, chat, order management) is pure client-rendered Inertia + React.
**Rationale:** Full SSR is the "correct" answer for a content site, but Serbizyu is an app with public landing pages, not a blog. The snapshot approach gives us 95% of SEO value with 10% of the ops complexity. The 5% risk (stale OG tags for minutes after an update) is acceptable for a marketplace, not a news site.
**Implementation note:** Use a `SnapshotService` that renders a Blade template to `storage/snapshots/{offer-slug}.html` on write. Nginx serves snapshot if exists, falls back to Inertia route if not.
**Review trigger:** If we see >5% of traffic from crawlers complaining about stale content, or if we add a blog/content marketing arm, revisit full SSR.

---

## D4. First Distribution Channel: Facebook (resolved)

| Factor | Facebook | TikTok | Shopee/Lazada | Winner |
|---|---|---|---|---|
| Existing manual traction | Yes (per GTM plan) | Unknown | No | **Facebook** |
| API maturity | Graph API stable | Content Posting API newer | Marketplace API complex | **Facebook** |
| Content format | Text+image, easy | Video-first, harder | Structured listing, medium | **Facebook** |
| Target demographic fit | Broad, older | Younger, trend-driven | Purchase-intent | **Facebook** |
| ToS risk on automation | Moderate (rate limits) | Higher (content review) | High (seller policies) | **Facebook** |

**Decision:** Facebook Graph API adapter is the first automated channel, built in Phase 2.
**Rationale:** The GTM plan already proves manual Facebook group posting works. Automating a working manual process is lower risk than betting on a new channel. TikTok is Phase 3; Shopee/Lazada is Phase 3+ (requires different fulfillment mindset).
**Risk mitigation:** Rate limit backoff, human approval queue for all automated posts (curator dashboard), and a manual fallback SOP if the API account is restricted.

---

## D5. Work Engine Storage: Postgres JSONB (resolved)

| Factor | Postgres JSONB | Dedicated document DB (MongoDB) | Winner |
|---|---|---|---|
| Operational complexity | One database | Two databases | **JSONB** |
| Query flexibility | Good (GIN, jsonb_path_ops) | Excellent | Mongo |
| Transaction consistency | ACID across Offer/Order/Work | Eventual consistency | **JSONB** |
| Schema evolution | Schema-less within JSONB | Schema-less | Tie |
| Team learning curve | Low | Moderate | **JSONB** |

**Decision:** Postgres JSONB for Work Instance `structure` and `step_data`. GIN index on `structure` for template-based filtering.
**Rationale:** The "document store" argument is valid but premature. We have zero AI-drafted templates today; we have one linear preset template. JSONB handles variable structure without adding a second database to backup, monitor, and secure. The escape hatch (migrate to Mongo later) is preserved by treating the JSONB column as an opaque document from day one — no relational constraints inside it.
**Review trigger:** If we have >1000 Work Instances with >50 distinct structure shapes and complex cross-instance querying needs, evaluate a document DB.

---

## D6. Work Status Contract: Formalize now, minimally (resolved)

**Decision:** Every Work Instance, regardless of internal structure, exposes a computed `status` enum: `not_started | in_progress | awaiting_signoff | completed | disputed`. This is stored as a real column (not computed on the fly) and updated by the Work engine whenever internal state changes.
**Rationale:** The temptation is to let the status "emerge" from usage, but that inverts the dependency. Orders, Payments, and Notifications need to know *now* what they're listening for. A real column with an enum check is cheap; retrofitting consistency later is expensive. The minimalism is key — we formalize the *output*, not the *process*.
**Implementation:** `work_instances.status` is a string column with a check constraint. The engine updates it via a single `WorkStatusService::sync(WorkInstance $instance)` method that maps internal state to the enum. No other domain touches internal structure.

---

## D7. Product/Offer Generalization: Schema-ready, unbuilt (resolved)

**Decision:** The `offers` table has an `offer_type` enum: `service | product | service_request | product_request`. Phase 1 only seeds `service` and `service_request`. The UI only exposes service flows. The schema and domain events are type-agnostic from day one.
**Rationale:** This is the "possible early, built late" pattern. Adding the column and enum now costs one migration. Building product fulfillment UI now costs weeks and distracts from proving service liquidity. The tricycle case study (see case-studies/tricycle-fulfillment.md) proves the Work engine can handle service variance; product variance is a different problem that should wait for a real vendor.
**Review trigger:** A real, committed vendor with a concrete product catalog and timeline. Not a hypothetical "what if."

---

## D8. Escrow/Regulatory Posture: Flagged, not resolved (open)

**Decision:** We proceed with Xendit's marketplace escrow flow, but we do not assume this exempts us from money-service-business registration. We will consult PH counsel before exceeding ₱500,000 in monthly GMV or holding funds for >7 days.
**Rationale:** Xendit's marketing language is reassuring but not legal advice. The line between "payment facilitation" and "money transmission" is jurisdictional and fact-dependent. Our internal ledger (hold/release states) is evidence of good faith, but not a shield.
**Action item:** Add "PH fintech counsel consultation" to Phase 2 budget (~₱50,000–100,000).

---

## D9. Consent Flow for External Distribution (open)

**Decision:** Explicit, granular consent at onboarding, separate from general ToS. Servicers opt in per-channel (Facebook, TikTok, Google Business, future channels) with a clear explanation of what data is shared (profile photo, name, service description, contact info).
**Rationale:** The PH Data Privacy Act requires "informed consent." A blanket "we may share your data" clause is insufficient for pushing PII to third-party platforms. Granular per-channel consent also serves the product: a servicer who refuses TikTok but accepts Facebook shouldn't be blocked from the platform.
**Implementation:** `servicer_channel_consents` table (user_id, channel, consented_at, revoked_at). Distribution orchestrator checks consent before queueing.

---

## D10. UI Component Library: shadcn/ui (resolved)

| Factor | shadcn/ui | Radix UI (raw) | Material UI | Ant Design | Winner |
|---|---|---|---|---|---|
| Design system alignment | Tailwind-native, customizable | Unstyled, full control | Opinionated, Material | Opinionated, enterprise | **shadcn** |
| Bundle size | Tree-shakeable, minimal | Minimal | Large | Large | **shadcn** |
| Accessibility | Built on Radix, excellent | Excellent | Good | Good | **shadcn** |
| Copy-paste ownership | You own the code | Library dependency | Library dependency | Library dependency | **shadcn** |
| Theming/branding | Full Tailwind control | Full control | Theme override | Theme override | **shadcn** |
| Community momentum | High, growing | Stable | Declining | Stable | **shadcn** |

**Decision:** shadcn/ui, initialized with the "New York" style, CSS variables for theming.
**Rationale:** Serbizyu's brand needs to feel trustworthy and local, not like a Silicon Valley SaaS or a generic enterprise tool. shadcn/ui gives us Radix's accessibility and behavior without imposing a visual language. We own the components, so we can tweak the exact shade of "trust green" without fighting a theme system. The copy-paste model also means no breaking changes from upstream — we upgrade when we choose.
**Implementation:** `npx shadcn-ui@latest init` with CSS variables, then customize `components.json` and `tailwind.config.js` per brand/serbizyu-brand-system.md.

---

## D11. Maps & Location: Mapbox (resolved)

| Factor | Google Maps | Mapbox | Leaflet + OSM | Winner |
|---|---|---|---|---|
| PH coverage | Excellent | Good | Variable | Google |
| Cost at low volume | $200 free credit/mo | 50k loads free | Free | **Mapbox** |
| Cost at scale | $7/1000 loads | $5/1000 loads | Self-hosted tiles | **Mapbox** |
| Custom styling | Limited | Excellent | Full control | **Mapbox** |
| Geocoding quality | Best | Good | Nominatim (variable) | Google |
| React SDK | Good | Good | Good | Tie |

**Decision:** Mapbox GL JS for interactive maps, Mapbox Geocoding API for address autocomplete, fallback to Nominatim for low-priority geocoding.
**Rationale:** Google Maps is the quality leader but the pricing cliff at scale is real. Mapbox's free tier covers Phase 1–2 comfortably, and its style customization lets us match Serbizyu's brand (warm, local, not corporate-blue). For a hyper-local marketplace, the map *is* the brand canvas — we want it to feel like "our map," not "Google's map with our pins."
**Risk mitigation:** Abstract geocoding behind a `GeocodingService` interface. If Mapbox quality proves insufficient for rural PH addresses, swap to Google with minimal code change.

---

## D12. Realtime: Laravel Reverb (confirmed)

**Decision:** Reverb, self-hosted on the same VPS as the app (Phase 1), dedicated droplet (Phase 2+).
**Rationale:** Already decided in the spec. Confirmed here because it's load-bearing for the unified inbox and live order tracking. The Pusher-protocol compatibility means we can swap to Pusher/Ably later if Reverb becomes a bottleneck.

---

## D13. AI Provider: OpenRouter (resolved)

| Factor | OpenAI direct | OpenRouter | Anthropic direct | Winner |
|---|---|---|---|---|
| Model flexibility | Locked to OpenAI | Multi-provider | Locked to Anthropic | **OpenRouter** |
| Cost optimization | Single provider | Route to cheapest | Single provider | **OpenRouter** |
| Fallback resilience | None | Auto-failover | None | **OpenRouter** |
| Latency | Direct | Slight proxy overhead | Direct | OpenAI/Anthropic |
| PH payment | Credit card | Credit card | Credit card | Tie |

**Decision:** OpenRouter for all LLM calls (caption drafting, FAQ triage, Work template builder).
**Rationale:** The AI features are assistive, not core to the transaction. Using OpenRouter lets us start with GPT-4o-mini for cost, upgrade to Claude for quality if needed, and failover if one provider has an outage. The proxy overhead is negligible for non-real-time tasks.
**Guardrail:** All LLM outputs are drafts. No autonomous publishing. Human approval is enforced at the UI level (curator dashboard) and the API level (no `auto_publish` flag exists).

---

## D14. Payments: Xendit (confirmed)

**Decision:** Xendit, confirmed. Official PHP SDK, marketplace escrow flow, PH disbursement support.
**Note:** The escrow ledger is internal. Xendit is the rail, not the source of truth. All webhook handlers are idempotent (unique constraint on `xendit_webhook_id`).

---

## D15. Feature Flags: Laravel Pennant (confirmed)

**Decision:** Pennant for all geofenced rollout and feature gating.
**Implementation:** Feature definitions in `config/pennant.php`, not database, for Phase 1. Move to database-driven flags when ops team needs self-service toggles (Phase 3).

---

## D16. Testing: Pest + Vitest + Playwright (confirmed)

**Decision:** Pest for backend, Vitest + React Testing Library for frontend, Playwright for e2e.
**Coverage target:** 80% on money-path flows (listing → order → escrow → disbursement), 60% elsewhere.

---

## D17. Pricing Model: Sliding Scale + Flat Micro Fees (resolved)

**Decision:** Three-tier commission structure with category-level subsidy overrides.

| Tier | Range | Rate | Cap |
|---|---|---|---|
| Micro | ₱50–300 | Flat ₱10 | N/A |
| Standard | ₱300–2,000 | 8% | ₱150 |
| Premium | ₱2,000–15,000+ | 6% | ₱500 |

**Subsidy overrides:** Configurable per category in `config/serbizyu.php` + admin panel. Tricycle/transport at 0–3%, farm labor at 0–3%, emergencies at 0%. Time-bounded promos supported.

**Rationale:** Flat fee on micro-transactions avoids GCash/PayMongo fees eating the entire margin. Percentage at higher tiers captures value proportionally. Caps prevent sticker shock. No PH platform has income-tiered pricing — Serbizyu can pioneer.

**Non-transaction revenue:** AI template drafting at near-cost (₱20/gen), marketing assets free first 3 then ₱10/asset. Verification is FREE (no PH platform charges for it — charging would be a competitive disadvantage).

**Revenue estimate at launch:** 20 servicers × 10 bookings/week × ~₱24 avg fee = ~₱19,200/month.

**Review trigger:** If average transaction value shifts significantly outside modeled ranges, recalibrate tiers. If a competitor enters with aggressive pricing, review subsidy strategy.

---

## D18. BIR / Tax Posture: Platform Does Not Withhold (resolved)

**Decision:** Serbizyu is a technology platform connecting independent contractors with buyers. Tax compliance is the servicer's responsibility. The platform does NOT withhold or remit taxes on behalf of servicers.

**Rationale:** Under TRAIN Law, servicers earning <₱250,000/year owe ₱0 in income tax. BIR RR 8-2024 mandates 1% withholding but enforcement on service marketplaces is untested. Requiring TIN before payout would exclude 90% of provincial servicers. Graduated compliance tiers (TIN optional at Basic level, required at Growth level) balance inclusion with eventual formalization.

**Platform provides:** Downloadable transaction summaries for servicers who choose to file. TIN facilitation via ORUS integration (optional during onboarding). Partnership with DTI Negosyo Center for BMBE registration.

**Legal caveat:** Formal tax counsel opinion recommended before processing real money. The posture is defensible (matching Grab/Angkas pre-regulation approach) but not tested in court.

**Review trigger:** If BIR issues a specific ruling targeting service marketplaces, or if Serbizyu GMV crosses ₱50M/year.

---

## D19. Human Agent Model: Intermediaries for Offline Businesses (resolved)

**Decision:** Tech-savvy "agents" can create and manage listings on behalf of non-tech-savvy business owners (elderly sari-sari store owners, offline repair shops). Platform facilitates the relationship with verification, commission splitting, and a graduation path.

**Commission split:** 75% owner / 10% agent / 15% platform.

**Verification:** OTP/SMS consent from owner to agent (no app required for owner). Canonical business ID persists across agent-managed → owner-graduated transitions.

**Owner experience:** SMS-first. Weekly earnings summaries via text. Owner never needs to log in.

**Graduation bonus:** Agent earns 3× monthly commission when owner goes independent — incentivizes agents to train owners toward self-management.

**Anti-fraud:** Owner must verify via OTP before listing goes live. Audit trail with cryptographic hash chain. Agent and owner both notified on disputes.

**Rationale:** Modeled after Facebook Page Access roles + Meesho's social commerce reseller model (130M+ resellers in India). No existing PH platform does this — blue ocean. Targets the "70-year-old tindera with 30 years of trust but no smartphone" demographic.

**Review trigger:** If agent-facilitated dispute rate exceeds direct-servicer rate by >5%.

---

## D20. Request/Bid Flow: Hybrid (resolved)

**Decision:** Option C — buyer chooses mode when posting a request.

- **"First Available"** → auto-assigns to first qualified servicer who accepts. For urgent needs (tricycle, emergency plumber).
- **"Let Me Compare"** → collects bids for 24 hours (price, ETA, message). Buyer reviews and picks. For price-sensitive work (construction, tutoring).

Both modes feed into the same Order state machine. One extra dropdown at request creation.

**Rationale:** Request/bid is the *more natural* flow for provincial services ("I need a plumber" vs "let me browse plumbers"). The hybrid covers both use cases without duplicating the order pipeline.

**Review trigger:** If >30% of "Let Me Compare" requests expire without a buyer pick, add auto-close + notification.

---

## D21. Escrow Timing: Shopee-Style 3-Day Guarantee (resolved)

**Decision:** 
- Escrow created on payment confirmation (buyer pays → funds held)
- Servicer marks work complete → 3-day buyer review window begins
- If no dispute within 3 days → escrow auto-releases
- If dispute filed → escrow frozen → admin resolves
- Cancellation before work starts → full refund minus ₱50 cancellation fee to servicer
- Cash transactions: buyer confirms "paid in cash" → servicer confirms receipt → platform tracks for trust/review but no escrow hold

**Rationale:** Mimics Shopee's proven model. The 3-day window balances buyer protection with servicer cash flow. Cash support is essential for provincial PH where GCash fees would destroy micro-transaction margins.

**Review trigger:** If dispute rate exceeds 5% or auto-release complaints exceed 2%.

---

## D22. Build Cadence: Single Continuous Build (resolved)

**Decision:** All three phases collapsed into one continuous build. The platform is being developed as a pitch-ready full system, not an iterative MVP.

**Database schema:** Phase 2 tables are included in migrations from day one. Channel adapters, WorkflowBuilder, and multi-town UI are built alongside Phase 1 features rather than deferred.

**Risk mitigation:** Schema-readiness for Phase 2 features (channels, tools, agents) is worth the upfront cost. The Phase 1 metrics gate (liquidity ≥2 bookings/servicer/week, trust density ≥90%) is still the launch gate — all features ship, but real-world validation happens before scaling to additional towns.

**Rationale:** Pitch-ready product requires demo of the full vision. Less context-switching than phased delivery. Previous rationale (earn each layer of generality with real usage) is superseded by the pitch requirement.

**Review trigger:** If build timeline exceeds 16 weeks, descope Phase 3 features (template marketplace, TikTok adapter, IoT tools) to post-pitch.

---

## D23. Servicer Onboarding: Curated First Batch (resolved)

**Decision:** First 10–15 servicers are personally recruited in Candon. Additional 5–10 via barangay captain referrals. Zero platform commission for first 30 days. Focus metric: retention and liquidity per active servicer, not signup volume.

**Rationale:** The pitch isn't about growth numbers — it's about proving the model works. A curated batch with known trust relationships reduces early dispute risk and generates authentic testimonials. 0% commission removes adoption friction during the proof period.

**Review trigger:** After 30 days, if <50% of first batch are still active, investigate churn causes before opening signups.

---

## D24. Dispute Resolution: Evidence-Tiered + Three Outcomes (resolved)

**Decision:** Dispute resolution uses an evidence-tier model where the default judgment depends on how much platform tooling the servicer adopted.

| Evidence Tier | Examples | Resolution | Default Judgment |
|---|---|---|---|
| High | GPS log, photo proof, buyer confirmations, step timestamps | Near-automatic; admin confirms in <5 min | Split by actual evidence |
| Medium | Calendar confirmations, chat logs, manual photo uploads | Admin reviews available evidence | 50/50 if inconclusive |
| Low | Cash handshake, no tools used, "I said / they said" | Admin decides on balance of probability | Burden falls on servicer |

**Resolution outcomes:** Full refund, partial refund (admin sets %), full release, re-service (24hr to complete, escrow held).

**Appeal:** Single-level to superadmin, 48-hour window. Final.

**SLA:** <4 hours during business hours, <12 hours otherwise.

**Rationale:** Evidence asymmetry incentivizes servicers to adopt platform tools. Servicers who use tracking get near-automatic protection.

**Review trigger:** If >10% of Low-tier disputes escalate to appeal, add mandatory tool adoption for high-dispute categories.

---

## D25. Notification Strategy: Event-Driven, Channel-Aware (resolved)

**Decision:** Event-driven notification matrix with role-specific channel preferences.

| Event | Buyer | Servicer | Agent | Owner (SMS-only) |
|---|---|---|---|---|
| Booking confirmed | In-app | In-app + SMS | — | — |
| Work started | In-app | In-app | — | — |
| Work step completed | In-app | In-app | — | — |
| Work completed / review window | In-app + SMS | In-app + SMS | — | — |
| Escrow released | In-app | In-app + SMS | In-app | SMS (amount only) |
| Dispute opened | In-app + SMS | In-app + SMS | In-app + SMS | SMS (alert only) |
| New request posted | — | In-app (category+area match) | — | — |
| Bid placed on your request | In-app + SMS | — | — | — |
| Bid accepted (you won) | — | In-app + SMS | — | — |
| Request awarded to another | — | In-app (courtesy) | — | — |
| Payment received (revenue) | — | — | — | SMS (weekly digest) |
| Commission earned | — | — | In-app | — |
| Low rating received | — | In-app (private) | In-app (private) | — |

**Key principles:** SMS is for time-sensitive actions only. Agent handles all platform actions — owner gets informational SMS only. Losing bidders get courtesy notification.

**Review trigger:** If SMS cost per active user exceeds ₱20/month, add in-app-only option.

---

## D26. Verification Tiers: Progressive Trust Levels (resolved)

**Decision:** Five-tier verification model where each tier unlocks more platform privileges.

| Tier | Requirement | Method | Time | Unlocks |
|---|---|---|---|---|
| **Phone Verified** | OTP on signup | Automated | Instant | Basic account, browse only |
| **Identity Verified** | Selfie + valid ID. AI face match, admin spot-check. | AI + admin queue | <1 hour | Create listings, accept bookings |
| **Barangay Verified** | Barangay Clearance upload | Admin review | <24 hours | Visibility boost, featured slot eligibility |
| **Professional Verified** | NBI Clearance + trade cert/license | Admin review | <3 days | Lower dispute hold %, higher search ranking |
| **Business Verified** | DTI/SEC + BIR 2303 | Admin review | <1 week | No transaction caps, priority support, "Business Verified" badge |

**For agent-managed accounts:** Agent must be at least Identity Verified. Owner must reach Barangay Verified before listings go live.

**Verification is FREE** — no PH platform charges for it.

**Review trigger:** If >30% of servicers stall at Identity Verified for >30 days, add automated reminders.

---

## D27. Cash Handling: Tiered Trust Architecture (resolved)

**Decision:** Cash is a first-class payment method. Platform creates trustworthy records around cash.

**Commission structure (updates D17):**

| Payment Method | Platform Rate | Why |
|---|---|---|
| Digital (GCash, bank) | 8% | Lowest risk, no handling cost |
| Cash — dual confirmed | 12% | Medium risk, covers dispute budget |
| Cash — high value (>₱5K) | 15% | Barangay witness required, higher risk |

**Cash dispute protection — tiered, not flat surcharge:**

| Tier | Cost | What Happens |
|---|---|---|
| **Free** | ₱0 | Platform generates downloadable Barangay Mediation Form with transaction details |
| **Protected** | +₱10–15/transaction | Platform mediates: evidence review, admin resolution, superadmin appeal |

**Cash handling mechanics (from Grab/Gojek model):** Servicer collects cash directly. Dual confirmation required. Commission tracked as receivable in servicer's wallet. Transaction limits escalate with servicer history.

**Review trigger:** If cash dispute rate exceeds 2× digital dispute rate, mandate GPS confirmation for cash.

---

## D28. Deal System: Quick Deal + Deal-Chaining (resolved)

**Decision:** Two new transaction primitives between listing browsing and order creation.

**Quick Deal:** Single QR code per servicer. Scanner gets interface to choose: Book, Quick Deal, Reviews, Message. Impromptu face-to-face transaction with negotiable price. Converts to Order on dual confirmation.

**Deal-Chaining:** Multi-slot deal where different servicers fill each slot. Either party can invite to fill slots. 2+ servicers per deal. Payout split per slot, released when all slots complete.

**Single QR per servicer:** One QR → one landing page. User chooses action.

**Launch:** Quick Deal standalone. Deal-Chaining as project-tagged linked orders. Full multi-slot post-pitch.

**Review trigger:** If >20% of Quick Deals modify price by >30%, add price-change justification requirement.

---

## D29. Category Structure: 28 Provincial Categories (resolved)

**Decision:** Launch with 28 categories across 8 tiers, tailored for Candon's agricultural + service economy.

| Tier | Categories |
|---|---|
| **Home Services** | Carpenter, Plumber, Electrician, Painter, Mason, Aircon Service, House Cleaning |
| **Beauty & Personal** | Barber (men only), Salon (women), Manicure/Pedicure, Hilot (traditional), Massage |
| **Automotive** | Mechanic, Vulcanizing (standalone), Body Repair, Tricycle |
| **Food & Events** | Lutong Bahay, Catering, Dressmaker, Tailor |
| **Education** | Tutor |
| **Agriculture** | Farm Labor, Rice Milling, Chainsaw/Lumber |
| **Delivery** | Porter, Utilities Delivery (water/ice/LPG) |
| **Other** | Welding, Digital Services, Shoe Repair |

**Key rules:** Occupation labels in Tagalog + Ilocano + English. "Labor lang" vs "Kasama materyales" mandatory filter for trades. Service area by barangay. Gender preference attribute where relevant. Admin-defined only at launch.

**Review trigger:** If category has <3 active servicers after 60 days, merge or deprecate.

---

*End of Decision Matrix. All resolved decisions have a named owner and a review trigger. Open decisions have an action item and a deadline.*