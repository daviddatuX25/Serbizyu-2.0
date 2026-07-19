# Serbizyu — Build Plan (Consolidated)

*Single continuous build for pitch-ready full system. All Phase 1–3 features ship together. The metrics gate (liquidity, trust density) still applies before multi-town scaling.*

---

## 0. Working Assumptions

- Team: 1 to 3 developers. David leads.
- **Cadence:** Single continuous build (all phases collapsed). Target: 12–16 weeks to pitch-ready.
- All decisions in `decisions/decision-matrix.md` (D1–D23) are locked. If one gets overturned, update this plan in the same commit.
- No code leaves a sprint without tests on the money path.
- Pennant flags gate everything user-facing. Geofence config starts as a single town (Candon).
- **Pitch posture:** Full features ship, real-world validation happens before multi-town scaling. Metrics gate (liquidity ≥2, trust density ≥90%) still applies as launch gate.

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

### Sprint 11: Request/Bid Flow
- Hybrid request model: buyer selects "First Available" or "Let Me Compare" when posting
- Request CRUD: `service_request` offer type, category, description, budget range, urgency flag
- Servicer request browser: filtered by category + location, "Accept" (first-come mode) or "Submit Bid" (comparison mode)
- Bid comparison UI for buyer: servicer name, price, ETA, rating, message — side by side
- Award → convert to Order: same Order state machine as direct booking
- **Exit:** buyer posts request, 3 servicers bid, buyer picks one, order created

### Sprint 12: Admin & Ops Interfaces
- RBAC with town scoping: 8 personas (Superadmin, Town Ops, Trust & Safety, Content Moderator, Finance, Support, Developer, Viewer)
- Revenue domain: category × town commission table, promo overrides, effective rate display, full audit trail
- Verification queue: Barangay Clearance → NBI → Business Permit tier progression
- Content moderation: listing review queue, automated flagging rules, bulk approve/reject
- Dispute resolution panel: booking info + chat transcript + servicer/customer history + one-click resolution (target <5 min)
- Developer tools: API key management, webhook config + delivery logs, sandbox toggle, rate limit dashboard
- Analytics: daily ops dashboard (GMV, bookings, disputes), weekly management dashboard, BIR-ready transaction exports
- **Exit:** ops staff can run the town from dashboards without DB access

### Sprint 13: Channel Adapters & Distribution
- `MessengerAdapter` + `SmsAdapter`: outbound notifications, inbound webhook resolution, full booking flow inside Messenger
- `FacebookAdapter`: normalize, publish (draft-first, curator approves), metrics readback
- Marketing Asset Generator: queued job producing branded graphics from profile data
- Notification expansion: per-user channel preference, outbound dispatch through adapters
- Credential vault: encrypted storage, auto-refresh, expiry monitoring
- **Exit:** Messenger booking flow works end-to-end; Facebook post published, metrics returned

### Sprint 14: Human Agent System
- Agent registration + verification (phone-based, minimal docs)
- Business owner OTP/SMS consent flow (no app required for owner)
- Agent-managed listing creation with owner verification before go-live
- Commission auto-split: 75% owner / 10% agent / 15% platform
- SMS-first owner experience: weekly earnings summary via text
- Immutable audit trail: every agent action logged with cryptographic hash chain
- Agent dashboard: earnings, listings, ratings
- **Exit:** agent creates listing for SMS-verified owner, transaction completes, payout splits correctly

### Sprint 15: Workflow Builder & Tools
- Tier-2 builder canvas (dnd-kit): edit labels, proof types, amounts, timeouts on presets
- Contract checker: validates template against Work contract before publish
- Buyer presentation modes 1–3 (Milestone Stepper, Live Tracker, Simple Status Card)
- Mapbox Map tool + Calendar tool connectors
- A2 Dispatch archetype configured for tricycle pilot (GPS auto-advance, manual fallback)
- **Exit:** servicer customizes a preset template, publishes, buyer sees it rendered correctly

### Sprint 16: Advanced Features
- Tier-3 AI template drafting: "Describe how you work" → LLM drafts structure → servicer edits and publishes
- Template cloning (servicer in Candon publishes, servicer in Vigan clones)
- Multi-town rollout: Pennant region flags, per-town category availability, SEO landing pages per town-category
- Growth domain: basic referral tracking, featured listing slots (performance-based, not paid)
- Calendar slot booking: availability management, reminders, Google Calendar sync (read-only Phase 1)
- **Exit:** AI drafts a workflow, servicer edits and publishes; second town appears behind Pennant flag

### Sprint 17: Hardening and Pitch Readiness
- Playwright money-path suite green: register, list, search, book, pay, work, sign off, disburse, review
- Request/bid path tested end-to-end
- Agent-managed transaction path tested end-to-end
- Messenger booking flow tested
- Load test: 50 concurrent bookings on staging, p95 page load under 2.5s
- Security pass: rate limits, webhook signatures, OWASP spot check
- Data Privacy: consent records audit, retention policy, privacy page
- Backup drill: restore staging DB, verify ledger integrity
- Pitch deck alignment: every feature demonstrated with real (seeded) data
- **Exit: PITCH READY.** All paths green, demo data compelling, legal ToS drafted.

### Metrics Gate (before multi-town scaling)
From the strategy matrix: liquidity at or above 2 bookings per active servicer per week trending up, trust density at or above 90%, dispute rate understood. If these are not moving, fix the town, not the codebase.

---

## 3. Extended Features (Post-Pitch, by demand)

| Feature | Trigger to build |
|---|---|
| TikTok adapter | Facebook ROI proven, content capacity for video |
| AI-designed mini-shops (per-servicer subdomain) | 20+ active servicers request customization |
| Template marketplace | 20+ quality tier-2 templates exist to seed it |
| Owner graduation flow (agent → independent) | First 5 owners request independence |
| Agent tiers & gamification (Bronze→Platinum) | 50+ active agents |
| Inventory Check connector (seller external stock API) | Product vendors active and requesting |
| Route Planner, Document Generator, Weather, IoT connectors | Real category demand (>5 active servicers) |
| Payment Split connector (multi-vendor orders) | Multi-vendor use case emerges |
| Affiliate/referral system (K-factor tracking) | Liquidity proven, K-factor worth optimizing |
| PH fintech counsel review | GMV approaching ₱500k/month |

---

## 5. Database Schema Checklist

**Phase 1 (Sprints 1–10, core):** users, profiles, verification_tiers, categories, category_attribute_schemas, offers, media, orders, work_instances, wallets, ledger_transactions, xendit_webhooks, conversations, messages, notifications, reviews, disputes, flags, activity_log, regions, servicer_channel_consents, analytics_events

**Sprints 11–14 (added domains):** service_requests, bids, admin_roles, admin_permissions, revenue_configs, commission_overrides, promo_overrides, audit_log, channel_credentials, content_queue, publish_results, channel_metrics, agents, agent_managed_businesses, business_owners, owner_consents, agent_commissions, payout_splits

**Sprints 15–16 (builder & tools):** work_templates (user-owned clones), tool_configs, generated_assets, calendar_slots, pennant_flags

**Extended (post-pitch):** loyalty_ledger, referrals, template_marketplace entries, inventory_sources, external_api_configs, product fulfillment extensions

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
