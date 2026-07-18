# Serbizyu — Phased Build Plan
*From zero to launched platform. Sprint-level for Phase 1 (you can start tomorrow), epic-level for Phases 2 and 3 (refine when you get there). Every phase has exit criteria tied to the GTM metrics, not to feature count.*

---

## 0. Working Assumptions

- Team: 1 to 3 developers. David leads. Adjust sprint lengths linearly if the team grows.
- Sprint length: 1 week. Phase 1 target: 10 to 12 weeks.
- All decisions in `decisions/decision-matrix.md` are locked. If one gets overturned, update this plan in the same commit.
- No code leaves a sprint without tests on the money path.
- Pennant flags gate everything user-facing from Sprint 1 onward. Geofence config starts as a single town (Candon).

---

## 1. Phase 0: Foundations (Week 0, before Sprint 1)

One-time setup. Do not start Sprint 1 until every box is checked.

**Repo and CI**
- [ ] Laravel 12 + PHP 8.3 skeleton, `app/Domains` structure with empty domain folders (Users, Listings, Orders, Work, Payments, Messaging, Notifications, Distribution, Growth, TrustSafety, Common, AdminOps)
- [ ] Inertia + React + TypeScript + Vite configured
- [ ] Tailwind + shadcn/ui initialized (New York style, CSS variables)
- [ ] Brand tokens from `brand/serbizyu-brand-system.md` applied to `tailwind.config.js` and CSS variables
- [ ] Pest, Vitest, Playwright configured with one passing test each
- [ ] GitHub Actions: lint, typecheck, Pest, Vitest on every PR. Playwright nightly.
- [ ] PostgreSQL 16, Redis, Meilisearch running locally (docker-compose for dev services)
- [ ] Forge provisioned: one DO droplet, staging environment deployed from `develop` branch

**External accounts**
- [ ] Xendit account, test API keys, webhook endpoint registered (staging URL)
- [ ] Mapbox account, token scoped to staging + production domains
- [ ] Semaphore account (can defer to Phase 2, but the account approval takes days, so file early)
- [ ] Sentry project, Pulse enabled
- [ ] OpenRouter key with spend cap

**Config as code**
- [ ] `config/channels.php` skeleton (empty adapters array)
- [ ] `config/archetypes.php` with the four launch presets defined as data (see §3 below)
- [ ] `config/serbizyu.php`: town geofence, escrow timeouts, review thresholds, consent text versions

---

## 2. Phase 1: Validation (Sprints 1 to 10)

Goal per the GTM plan: one town, about 20 servicers, 50 completed bookings. Core loop only. No distribution automation, no gamification, no channel bindings.

### Sprint 1: Auth and Users
- Phone-first signup (phone + OTP via Semaphore test credits, or a local OTP stub if the account is delayed)
- Sanctum session auth, Inertia auth pages with brand system applied
- User profiles: name, photo, category, area (barangay from PH address provider)
- Verification tier model: `phone_verified` at signup, columns for ID and address tiers (UI later)
- **Exit:** a new user can register, verify phone, and land on an empty dashboard

### Sprint 2: Categories and Offers
- `categories` and `category_attribute_schemas` tables (schema-as-data, no migrations for new categories)
- Offer CRUD: `service` and `service_request` types only. JSONB `attributes` validated against category schema at write
- Offer status: Draft / Active / Paused
- Polymorphic media on Offers (local disk in dev, S3-compatible in staging)
- Seed: 10 categories from the industry matrix anchor sectors (plumbing, electrical, carpentry, cleaning, barber, tutor, aircon, appliance repair, lutong bahay, tricycle)
- **Exit:** a servicer can create a complete Offer with photos and category attributes

### Sprint 3: Work Presets and Orders
- `config/archetypes.php` presets: A1 Linear Project, A3 Appointment, A4 Handoff, A9 Digital Delivery, each with step definitions, proof types, escrow release rules
- Category to archetype mapping (config, editable per category)
- Order creation from Offer acceptance. `fulfillment_type = work_instance`. Order state machine
- Work Instance creation from template: JSONB `structure` cloned from preset, `status` column enforced
- Step transitions with proof upload, buyer sign-off for A1, confirmations for A3/A4/A9
- **Exit:** a buyer can book an Offer and both parties can walk the Work Instance to `completed`

### Sprint 4: Payments, Escrow, Ledger
- Xendit integration: create invoice, handle payment callback
- Internal ledger: wallets table, append-only transactions table, hold/release states. This is the source of truth
- Webhook idempotency: unique constraint on `xendit_webhook_id`, replay-safe handler
- `OrderFulfilled` event triggers escrow release via `DisbursementService`
- Refund path (manual trigger from admin for now, full refund only)
- **Exit:** money path e2e test passes: book, pay with Xendit test card, complete work, escrow releases, ledger balances reconcile to zero

### Sprint 5: In-App Messaging and Notifications
- Conversation model: context link (Offer or Order), participants, channel-agnostic core (no external bindings yet)
- In-app messages, Reverb broadcasting, TanStack Query for live updates
- Notifications domain: in-app channel only. Events wired: OrderCreated, MessageReceived, WorkStatusChanged, EscrowReleased
- **Exit:** buyer and servicer can chat inside an order, see live updates, get notified on every state change

### Sprint 6: Discovery, Search, Public Pages
- Meilisearch via Scout: Offer indexing (title, category, attributes, location, price)
- Search UI: keyword + category + barangay filters, price range slider
- Snapshot SSR for public Offer/category/profile pages: Blade template rendered on Offer write, served by Nginx, OG tags and schema.org JSON-LD baked in
- TrustBadge component: verification tier, completion count, review average (hidden below 3 reviews)
- **Exit:** a Google crawl of staging sees fully rendered Offer pages with valid JSON-LD (verify in Rich Results Test)

### Sprint 7: Reviews, Trust, Disputes (basic)
- Post-completion review flow: rating + text, one per party per order
- Reputation rollup: completion rate, avg rating, response time
- Dispute flow v1: either party flags, escrow freezes, admin resolves (full refund or full release, no partial yet)
- TrustSafety domain: flag queue, dispute state machine, audit log entries
- **Exit:** dispute path tested: flag, freeze, admin resolves, ledger reflects outcome

### Sprint 8: Servicer Onboarding and Profile Completion
- Profile Completion Score: weighted checklist (photo, bio, price, sample work, verification), computed from real data
- Onboarding flow: quick capture at signup, checklist dashboard, the honest "35% done" state
- Granular distribution consent capture UI (records to `servicer_channel_consents`, even though no adapters exist yet; consent is phase-independent)
- **Exit:** new servicer reaches 80%+ profile completion in testing without staff help

### Sprint 9: Ops Dashboards (minimum viable)
- Curator dashboard v1: listing queue, quality scores (manual posting happens outside the app in Phase 1)
- Trust reviewer dashboard: verification queue, dispute queue, flag queue
- Analytics dashboard v1: funnel counts (signups, listings, bookings, completions, disputes), pulled from the events log
- Admin RBAC matrix for ops roles
- **Exit:** ops staff can run the town from the dashboards without DB access

### Sprint 10: Hardening and Launch
- Playwright money-path suite green on staging: register, list, search, book, pay, work, sign off, disburse, review
- Load test: 50 concurrent bookings on staging, p95 page load under 2.5s
- Security pass: rate limits on public endpoints, webhook signature checks, OWASP spot check
- Data Privacy: consent records audit, retention policy written, privacy page published
- Backup drill: restore staging DB from backup, verify ledger integrity
- **Exit: PHASE 1 LAUNCH GATE.** All money-path tests green, 20 servicers onboarded in Candon, first real booking completed end to end

### Phase 1 Metrics Gate (before building Phase 2)
From the strategy matrix: liquidity at or above 2 bookings per active servicer per week trending up, trust density at or above 90%, dispute rate understood. If these are not moving, fix the town, not the codebase.

---

## 3. Phase 2: Platform Launch (Epics, roughly 8 to 12 weeks)

Build only after the Phase 1 metrics gate passes.

| Epic | Scope | Depends on |
|---|---|---|
| E1 Messenger + SMS channels | `MessengerAdapter`, `SmsAdapter`: outbound notifications, inbound webhook resolution with conversation tokens. Full booking flow inside Messenger. | Connector architecture doc, Phase 1 Conversation model |
| E2 Facebook distribution | `FacebookAdapter`: normalize, publish (draft-first, curator approves), metrics readback. Content queue + rotation logic v1. | E1 (shared Meta credentials), ops curator dashboard |
| E3 Marketing Asset Generator | Queued job producing 1200x630 branded graphics from profile data. Serves reciprocity gift at onboarding and Facebook content. | Brand system, queue infra |
| E4 Tier-2 WorkflowBuilder | Builder canvas (dnd-kit): edit labels, proof types, amounts, timeouts on presets. Contract checker as validation service. Buyer presentation modes 1 to 3. | Phase 1 Work engine, archetype presets |
| E5 A2 Dispatch pilot (tricycle) | A2 archetype config, Mapbox Map tool, GPS auto-advance, TODA partnership onboarding. | E4, Mapbox account |
| E6 Calendar tool + A3 upgrade | Slot booking UI, availability management, reminders. Unlocks tutoring/salon properly. | E4 |
| E7 Notifications expansion | Per-user channel preference, outbound dispatch through channel adapters, delivery tracking. | E1 |
| E8 SEO program | Sitemaps, per-town category landing pages, Search Console, llms.txt. | Sprint 6 snapshot SSR |

**Phase 2 exit:** distribution leverage measurable (channel-attributed bookings above 10%), Messenger/SMS registration live, tricycle pilot metrics from the case study doc hit (pickup under 10 min, confirmation rate above 90%).

---

## 4. Phase 3: Community Expansion (Epics, timing by demand)

| Epic | Trigger to start |
|---|---|
| Product Offer types + A4 product polish | A real vendor with catalog and commitment (per decision D7) |
| Tier-3 AI template builder | 10+ active categories straining presets |
| Template marketplace | 20+ quality tier-2 templates exist to seed it |
| TikTok adapter | Facebook ROI proven, content capacity for video |
| Remaining archetypes (A5 rental, A6 recurring polish, A8 emergency, A10 retainer) | Sector demand from the industry matrix (events, caregiving, farm work) |
| Growth domain: gamification, referrals, loyalty | Liquidity proven, K-factor worth optimizing |
| Multi-town rollout | Candon metrics stable for 8+ weeks; Pennant region flags, no code branches |
| Shopee/Lazada connectors | Product vendors active and requesting it |
| PH fintech counsel review | GMV approaching ₱500k/month (per decision D8) |

---

## 5. Database Schema Checklist by Phase

**Phase 1:** users, profiles, verification_tiers, categories, category_attribute_schemas, offers, media, orders, work_instances, wallets, ledger_transactions, xendit_webhooks, conversations, messages, notifications, reviews, disputes, flags, activity_log, regions, servicer_channel_consents, analytics_events

**Phase 2 adds:** channel_credentials, content_queue, publish_results, channel_metrics, work_templates (user-owned clones of presets), tool_configs, generated_assets, calendar_slots

**Phase 3 adds:** loyalty_ledger, referrals, template_marketplace entries, product fulfillment extensions (inventory fields on offers)

Rule: every table ships with its migration, model, policy, and factory in the same PR.

---

## 6. Risk Register (top 5, with owners)

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Xendit escrow flow does not match marketplace marketing claims | Medium | High | Spike in Phase 0: run a real test invoice through the sub-merchant flow before Sprint 4 | Backend lead |
| GPS auto-advance unreliable on cheap Android in provincial signal | Medium | Medium | A2 config: manual confirm always available as fallback, GPS only assists. Pilot with 3 drivers before rollout | Product |
| Facebook API restriction or ban during Phase 2 | Medium | Medium | Human-approved posts only, manual posting SOP documented per channel, no full automation | Ops |
| Servicers do not complete profiles | High | High | Reciprocity sequencing (asset before ask), coach dashboard follow-ups, completion score honesty | Growth |
| Scope creep into excluded categories (Grab-clone requests) | Medium | High | Industry matrix exclusion list is the contract. Log requests, revisit quarterly, never mid-sprint | CEO |

---

## 7. Definition of Ready (per sprint item)

A ticket enters a sprint only with: acceptance criteria, affected domain(s), events fired/consumed, money-path impact flag (yes/no), test plan. If it touches the ledger, escrow, or webhook handlers, it gets a second reviewer, no exceptions.

## 8. Definition of Done (per sprint item)

Tests pass (unit + feature, e2e if money path), Pennant flag set, activity log entries for admin-visible actions, analytics events emitted for funnel steps, docs updated in this workspace if the spec changed.

---

*End of Build Plan. Phase 1 is sprint-ready. Phases 2 and 3 are intentionally epic-level: refine them with real usage data, not with more planning.*
