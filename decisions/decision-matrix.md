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

*End of Decision Matrix. All resolved decisions have a named owner and a review trigger. Open decisions have an action item and a deadline.*
