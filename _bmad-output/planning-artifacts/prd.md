# Serbizyu 2.0 — Product Requirements Document

> HISTORICAL / NON-AUTHORITATIVE — superseded by `prd-rebuilt.md`; preserved for traceability only.

> *Document Version:* 3.0.0 (Facilitated Ceremony Edition)  
> *Date:* July 26, 2026  
> *Facilitator:* PM John (Product Manager persona)  
> *Founder:* David Datu N. Sarmiento  
> *Project Scope:* Tagudin, Ilocos Sur, Philippines  

---

## 1. Product Purpose & Strategic Intent

**Serbizyu** is an inclusive services and goods commerce platform purpose-built for Philippine provincial economies. Unlike metropolitan platforms (Shopee, Grab, Fiverr) optimized for smartphone-native, credit-card-carrying users, Serbizyu bridges the provincial digital divide where roughly 70% of micro-entrepreneurs operate informally — relying on feature phones, cash, and word-of-mouth.

### 1.1 Strategic Objectives

1. **Inclusive Access** — Non-digital-literate trade workers participate through a Human Agent Network. No smartphone required. SMS-based consent keeps the owner in control.

2. **Invisible Formalization** — Tax compliance is gamified as earnings progression, not a filing burden. Servicers unlock higher payouts by climbing the 3-Lane Ladder at their own pace.

3. **Financial Safety** — Double-entry escrow with Shopee-style 3-day guarantee protects both buyer and servicer. Digital payments via Xendit. Cash transactions supported with dual-confirmation receipts.

4. **Full-Spectrum Commerce** — Four listing types, five transaction mechanisms, and ten fulfillment archetypes cover everything from a ₱50 tricycle ride to a multi-month construction project.

### 1.2 The Bayanihan Street Thesis

The digital economy's structural unfairness isn't a skills gap — it's an access gap. Serbizyu closes it by meeting people where they are, with the tools they already have.

---

## 2. Target Audience, Personas & Jobs-to-be-Done (JTBD)

All platform users are called **Ka-Serbizyu** — members of the Serbizyu community.

**Terminology (LOCKED):**

| Context | Provider Side | Consumer Side |
|---|---|---|
| Service | Service Provider | Customer |
| Product | Seller | Buyer |

| # | Persona | Role & Context | Core Job-to-be-Done |
|---|---|---|---|
| **PER-01** | Customer/Buyer — "Maria" | Provincial resident or event organizer with a smartphone. Needs services or products. | "When I need something done or bought locally, I want to find a trusted provider, see transparent pricing, and pay safely into escrow — so I don't get overcharged, ghosted, or lose my deposit." |
| **PER-02** | Service Provider (Offline) — "Tatay Ben" | Skilled trade worker using a basic feature phone. Decades of experience, zero digital presence. Agent-managed. | "When I need more customers, I want a trusted local agent to manage my online presence while I just approve things by text message — so I can earn more without buying a smartphone." |
| **PER-03** | Service Provider (Tech-Savvy) / Seller — "Ate Grace" | Aircon technician, tutor, freelance designer. Has a smartphone. Wants to scale beyond word-of-mouth. | "When I run my business, I want a professional booking calendar, bidding tools, verified reviews, and the ability to reach customers on Facebook — so I can grow beyond my barangay." |
| **PER-04** | Agent — "Kevin" | Tech-savvy community youth. Knows everyone in the barangay. Wants flexible local gig income. | "When I help local trade workers get online, I want to earn transparent commissions on every deal and receive a bonus when a worker I trained graduates to smartphone independence." |
| **PER-05** | Admin — "Project Team" | David + Christine + Jaypee + Prince John. Platform operations and development leads. | "When disputes or financial events occur, I want clear evidence logs, automated ledger audits, and an admin dashboard that lets me resolve issues and keep the platform running." |

**Not a platform role:** Kiosk access points (Serbizyu-owned hardware). Barangay Captain (external escalation target).

---

## 3. Functional Requirements

### 3.1 Catalog & Classification

**28 categories across 8 tiers** (Tagudin-tailored):

| Tier | Categories |
|---|---|
| **Home Services** | Carpenter, Plumber, Electrician, Painter, Mason, Aircon Service, House Cleaning |
| **Beauty & Personal** | Barber, Salon, Manicure/Pedicure, Hilot (traditional), Massage |
| **Automotive** | Mechanic, Vulcanizing, Body Repair, Tricycle |
| **Food & Events** | Lutong Bahay, Catering, Dressmaker, Tailor |
| **Education** | Tutor |
| **Agriculture** | Farm Labor, Rice Milling, Chainsaw/Lumber |
| **Delivery** | Porter, Utilities Delivery (water/ice/LPG) |
| **Other** | Welding, Digital Services, Shoe Repair |

**REQ-CAT-01:** Labels in Tagalog, Ilocano, and English.  
**REQ-CAT-02:** "Labor lang" vs "Kasama materyales" filter — category-level attribute, flexible per category.  
**REQ-CAT-03:** Service area by barangay.  
**REQ-CAT-04:** Gender preference attribute where relevant.  
**REQ-CAT-05:** Admin-defined categories at launch. Low-activity category removal is an admin decision, not automatic.  
**REQ-CAT-06:** Professional license flags (PRC, TESDA, DOH, LTO/TODA) display as informational badges at launch — not blockers.

### 3.2 The Four Listing Types

| # | Listing Type | Created By | Example |
|---|---|---|---|
| 1 | **Service Listing** | Service Provider (or Agent) | "Aircon cleaning, ₱500, available Tues/Thurs" |
| 2 | **Product Listing** | Seller (or Agent) | "Lutong bahay adobo, ₱80 per serving, pickup only" |
| 3 | **Service Request** | Customer | "Need plumber for leaking sink, ₱300 budget, Barangay Bio" |
| 4 | **Product Request** | Buyer | "Looking for 2 sacks of rice, delivered to Barangay Poblacion" |

**Digital is NOT a separate listing type.** A digital product is a Product Listing fulfilled via A9 (Digital Deliverable). A digital service is a Service Listing fulfilled via A9.

**REQ-LST-01:** Every listing has: title, description, category, price/pricing mode (fixed, tiered, hourly, negotiable, per-unit) and price_visibility (public/starting_from/hidden), service radius or pickup area, photos (min 1, max 8), availability calendar or stock count, fulfillment archetype, agent-managed flag, license verification badge.  
**REQ-LST-02:** Pricing supports all modes: fixed, tiered, hourly, per-kilo, per-unit, negotiable.

**REQ-LST-03 (Hidden Price / Quote Request):** Providers may optionally hide prices on Service Listings and custom Product Listings (price_visibility: 'hidden' or 'starting_from'). Hidden-price listings cannot use Direct Booking — the listing instead shows a "Request a Quote" (Magtanong ng Presyo) button that triggers a 1:1 quote flow. Standard commodity products (groceries, mass-market goods, fixed-price items) require public pricing. Quote Requests reuse the existing bidding infrastructure (see §3.3) with `bid_type: 'quote'` — single-provider, non-competitive. After the buyer accepts a quote, the order flows through the standard Order state machine (see §3.3 REQ-TXN-01). Trust safeguards: providers must respond within 24 hours (SLA-tracked), quotes are valid for 48 hours, and the listing always shows the anonymized category-average price range (e.g., "Typical cost in Tagudin: ₱300–₱800"). A "Talagang Presyo" (Transparent Pricing) badge is available for providers who choose to publish fixed prices.

### 3.3 The Five Transaction Mechanisms

| # | Mechanism | Initiated By | Flow |
|---|---|---|---|
| 1 | **Direct Booking** | Customer/Buyer browses a listing | Browse → Select → Pay into escrow → Order created |
| 2 | **Reverse Bidding** | Customer posts a Request | Post Request → Providers submit bids → Customer picks winner → Order created |
| 3 | **Quick Deal** | Either party, face-to-face | Scan QR → Counter-offer stepper (max 3 rounds) → Dual confirmation → Order created |
| 4 | **Deal-Chaining** | Either party, multi-party | Create Deal container → Invite providers per slot → All slots filled → Buyer approves → Multiple Orders created |
| 5 | **Agent-Mediated** | Agent, on behalf of offline Owner | Agent creates listing → Owner approves via SMS OTP → Listing goes live → Customer books → Owner gets SMS confirmation → Revenue split 80/10/10 |

**REQ-TXN-01:** Every mechanism produces an Order. The Order state machine is identical regardless of mechanism: `created → held_in_escrow → in_progress → awaiting_signoff → completed` (or `disputed`).  
**REQ-TXN-02:** Revenue flows through the same commission engine regardless of mechanism. Admin-configurable per category.  
**REQ-TXN-03:** Listing types and transaction mechanisms are independent dimensions. Any listing type can be transacted through any compatible mechanism.  
**REQ-TXN-04:** Quick Deal / Deal-Chaining compatibility is a provider/agent decision, not a hard archetype restriction. Providers toggle whether they accept Quick Deals for their listings.

**REQ-TXN-05 (Quote Request — Quote Request is a 1:1 variant of Reverse Bidding):** When a buyer clicks "Request a Quote" on a hidden-price or starting-from listing, the existing bid infrastructure handles the request → quote → accept flow. Unlike Reverse Bidding (which is competitive — multiple providers bidding on one request), Quote Requests are non-competitive: only the listing owner can respond. The underlying tables and notification pipeline are shared; the distinction is `bid_type: 'quote'` vs `bid_type: 'bid'` and `source_listing_id` (for quotes) vs `source_request_id` (for bids).

**Quick Deal Offline Behavior:**

| Scenario | How It Works | Connectivity Required |
|---|---|---|
| Phone + Phone (both with app + camera) | QR scan locally → counter-offer on-device → dual confirm in-app → deal stored locally → syncs when either reconnects | None at transaction time |
| Phone + SMS phone (feature phone) | Smartphone scans QR → counter-offer → SMS confirmation sent to feature phone (`ACCEPT <CODE>`) | Cellular needed for SMS gateway trigger |
| At a kiosk | Kiosk tablet mediates → both parties confirm on kiosk | Kiosk has connectivity |
| Both fully offline (no data, no SMS) | Cannot transact | — |

**Agent-Mediated SMS Consent:**  
**REQ-TXN-06:** Critical actions requiring owner SMS OTP: listing creation/activation, payout withdrawal, agent assignment change.  
**REQ-TXN-07:** Non-critical actions handled by agent without SMS: regular booking confirmation, message replies, calendar updates.

### 3.4 The 10 Fulfillment Archetypes

Every transaction maps to one of ten standardized fulfillment shapes. Full A1–A10 definitions in `listing-model-taxonomy.md`.

| # | Archetype | Duration | Custody | Trigger | Tier | Launch Preset? |
|---|---|---|---|---|---|---|
| A1 | Linear Project | days–weeks | 0–1 | Buyer sign-off | 1 | ✅ |
| A2 | Instant Dispatch | minutes–hours | 1 | GPS / confirm | 2 | — |
| A3 | Appointment | hours | 0 | Calendar time | 2 | ✅ |
| A4 | Handoff | hours–days | 1 | Receipt confirm | 1 | ✅ |
| A5 | Rental | hours–days | 2 | Condition check | 2 | — |
| A6 | Recurring | weeks–months | per cycle | Schedule | 2 | — |
| A7 | Quoted | varies | varies | Winning bid | 3 | — |
| A8 | Emergency | minutes–hours | 0–1 | First accept | 2 | — |
| A9 | Digital Deliverable | days | 0 | Acceptance click | 1 | ✅ |
| A10 | Long-Running | indefinite | 0 | Periodic invoice | 2 | — |

**4 Launch Presets:** A1, A3, A4, A9. Remainder are tier-2 configs or Phase 3 builds.

**REQ-ARC-01:** The Work Engine is archetype-aware but category-blind. Category determines search/discovery; archetype determines execution logic.  
**REQ-ARC-02:** Data design note (→ Phase 3 Architecture): Listing type-specific fields (service_radius, stock_count, pickup_location) use Postgres JSONB with GIN indexing. Shared fields as real columns. Type-specific fields in `attributes` JSONB. No NULLs.

### 3.5 Channel Connectors & Multi-Channel Distribution

Distribution operates in two forms:

**Form A: Platform-Owned Channels (v1)**

| Channel | Platform-Owned Example | v1? |
|---|---|---|
| Facebook Page | "Serbizyu Tagudin" | ✅ |
| Facebook Groups | "Serbizyu Bakes," "Serbizyu Lumber" | ✅ |
| Messenger Bot | Serbizyu Page Bot | ✅ |
| SMS | Platform-hosted TextBee Android Gateway | ✅ |
| SEO / Google | Automated snapshot pages, schema.org | ✅ |
| TikTok | "Serbizyu PH" (Platform-Owned) | Phase 3 |
| YouTube | "Serbizyu Tagudin" (Platform-Owned) | Phase 3 |

**Form B: User-Connected Accounts (Phase 3+)**

| Channel | User Connects |
|---|---|
| Facebook Page | Provider connects their own FB Page |
| TikTok | Provider connects their own TikTok |
| YouTube | Provider connects their own YouTube |

**REQ-CH-01:** Platform-owned channels carry metadata: `source_listing_id`, `source_provider_id` on every post for attribution and routing.  
**REQ-CH-02:** Unified inbox — messages from all channels (FB, Messenger, in-app, SMS) route to a single provider conversation thread. Channel is metadata, not a separate app.  
**REQ-CH-03:** Human approval queue — all automated channel posts route through admin review before publishing. No `auto_publish` flag exists.  
**REQ-CH-04:** Per-channel consent for Form B (when live) — granular per channel, DPA-compliant, revocable.  
**REQ-CH-05:** Admin rate limiting per user for public-facing channels with configurable thresholds.  
**REQ-CH-06:** UTM/referral tracking per distributed listing for channel conversion analytics.  
**REQ-CH-07:** SEO — server-rendered snapshot pages with schema.org markup. Regenerated on `ListingUpdated` event. Cached on Cloudflare edge.

**SMS & SEO:** Infrastructure channels. Always on for all Ka-Serbizyu. No user account connection required. SMS handles time-sensitive notifications and action prompts (<10s OTP delivery). SEO auto-generates for every public listing.

### 3.6 Serbi AI Assistant

Serbi is a conversational AI assistant embedded across the platform. Cloud-side via Laravel AI SDK. Online-only. English, Tagalog, Ilocano.

**REQ-SRB-01 (Dual-Mode Onboarding):** Visual UI forms and Serbi chat operate as parallel paths on the same screen. User can switch between them at any point. Serbi auto-fills form fields; user reviews before submitting.  
**REQ-SRB-02 (Screen-Aware Assistance):** Serbi knows what screen the user is on and provides contextual help. Never interrupts — user opens Serbi when they want help.  
**REQ-SRB-03 (Form Interaction):** Serbi can extract data from natural language and fill form fields. "Aircon cleaning po, ₱500, available Monday and Wednesday" → auto-fills category, price, availability. Draft until user confirms.  
**REQ-SRB-04 (Optional):** No feature requires Serbi. If a user never opens Serbi, they never see Serbi prompts.  
**REQ-SRB-05 (Listing Builder):** Provider describes their service in natural language → Serbi drafts title, description, suggests category and pricing. Draft only.  
**REQ-SRB-06 (Customer Discovery):** Customer describes their need → Serbi identifies category, urgency, suggests budget, presents matching providers or suggests posting a Request.  
**REQ-SRB-07 (Bid Writing Assistant):** Provider opens Serbi while responding to a Request → Serbi drafts bid (introduction, scope, price justification, timeline). Draft only.  
**REQ-SRB-08 (Platform Q&A):** Answers "how do I..." questions from platform documentation. Escalates to human admin if unresolved.  
**REQ-SRB-09 (Guardrails):** Never auto-publishes. Never initiates conversation. Never handles disputes or finances. Identifies itself as AI. Cloud-only.

### 3.7 My Space

Every Ka-Serbizyu's configurable platform hub.

**REQ-MSP-01 (External Tool Connectors — Phase 3+):** Google Sheets (inventory/pricing sync), Calendar (Google/Outlook bidirectionally), Custom API endpoints, Document templates (quotes/invoices). Configured per listing. Optional.  
**REQ-MSP-02 (Profile & Verification Hub):** Personal profile details, verification tier status and progression requirements, registration document uploads (Government ID, Barangay Clearance, BIR 2303, BMBE Certificate), payout preferences (bank/GCash, schedule), agent delegation management.  
**REQ-MSP-03 (Analytics Dashboard):** Listing performance (views, bookings, completion rate, rating, dispute rate), revenue dashboard (earnings, pending escrow, completed payouts, fees), channel attribution analytics, customer feedback metrics, composite trust score.  
**REQ-MSP-04 (Channel Consent — Phase 3+):** Per-channel toggle (FB, Messenger, TikTok, YT, Google). DPA-compliant data sharing explanation per channel. Revocable. Distribution history.  
**REQ-MSP-05 (Agent Dashboard):** Managed providers list, listing creation on behalf of owner, bid submission on behalf of owner, payout withdrawal (triggers owner SMS OTP), graduation tracker, commission dashboard, agent tier progress.  
**REQ-MSP-06 (Boost & Advertising — Phase 2+):** Per-listing boost toggle, featured slots (3 per category per town), advertising analytics.  
**REQ-MSP-07 (Virtual World — Out of Scope):** Future spatial map/VR layer. Not in academic timeline.

---

### 3.8 Human Agent Network

The agent system bridges the digital divide for feature-phone users. Agents are tech-savvy Ka-Serbizyu who onboard and manage offline Service Providers and Sellers. The model is **oversight, not gating** — the agent does the work, the owner stays informed, and only account-structure changes require SMS approval.

**REQ-AGT-01 (Registration & Verification):** Agents must pass identity verification (government ID + selfie face match, admin review) before managing any owner. Minimum Identity Verified tier.

**REQ-AGT-02 (Owner-Agent Relationship):** Agent creates owner profile (name, phone, trade, barangay). Owner receives SMS: "Ka-Serbizyu, Agent Kevin wants to manage your listings. Reply APPROVE 8492 to confirm." Owner replies with OTP → relationship established. Owner can revoke at any time.

**REQ-AGT-03 (Agent Actions — Oversight Model):**

| Agent Action | Rule | Owner Experience |
|---|---|---|
| Create/edit listing | **Notify** | SMS: "Agent Kevin created Aircon Service listing. Live now." |
| Booking received | **Notify** | SMS: "New booking! Aircon cleaning, Friday 2PM, ₱500." |
| Bid submitted | **Notify** | In-platform: "Agent Kevin bid ₱3,500 on 'House painting.'" |
| Bid won | **Notify** | SMS: "Bid won! House painting starts Monday, ₱3,500." |
| Customer messages | **Collaborate** | Shared conversation visible to owner. Owner can add notes. |
| Mark work complete | **Notify** | In-platform: "Marked complete. Escrow releases in 3 days." |
| Withdraw payout | **Notify** | In-platform. No SMS gate. Owner can object after the fact. |
| Change agent assignment | **Gate** | SMS OTP required. |
| Deactivate listing | **Gate** | SMS OTP required. |

**REQ-AGT-04 (SMS Safety Keywords):** Every SMS notification includes a safety footer on occasions where action may be needed: "Reply STOP to suspend agent. Reply REVOKE to permanently remove agent." STOP = immediate suspension (admin reviews, reversible). REVOKE = permanent removal.

**REQ-AGT-05 (Notification Preferences):** Configurable per owner. Full SMS (every action) / Critical Only (default: bookings, bid wins, gated actions) / Platform Only (in-platform; SMS only for STOP/REVOKE keywords).

**REQ-AGT-06 (Commission Split):** 75% owner / 10% agent / 15% platform. Admin-configurable per tier, category, province.

**REQ-AGT-07 (Agent Tier Ladder):**

| Tier | Requirements | Benefits |
|---|---|---|
| Bronze | Baseline entry | 10% commission share |
| Silver | 10+ active owners, 3-month retention | 11–12% share, Featured Badge |
| Gold | 50+ active owners, <2% dispute rate | 13–15% share, priority expansion |
| Platinum | Top volume percentile | Maximum share, mentorship bonus |

**REQ-AGT-08 (Graduation Bonus):** 3× owner's average monthly commission when owner transitions to independent smartphone use. Incentivizes agents to train owners toward independence.

**REQ-AGT-09 (DOLE Compliance):** Independent contractor model. No prescribed hours or methods. Commission-based compensation.

**REQ-AGT-10 (Anti-Fraud):** ID validation at onboarding. Manual review queue. Automated flagging (velocity checks, anomalous commissions). Audit trail for all agent-owner relationships. SMS OTP creates irrefutable consent record.

### 3.9 3-Lane Regulatory Formalization Ladder

*[In progress — to be facilitated]*

### 3.10 Payment & Escrow System

**REQ-PAY-01 (Payment Methods):** Two first-class methods at launch. Digital (GCash, bank transfer, card via Xendit — funds held in escrow, platform tracks ledger, Xendit handles custody). Cash (external — Customer pays Provider directly, both confirm via platform, platform tracks for trust/reviews, no escrow hold).

**REQ-PAY-02 (Xendit Integration):** Xendit xenPlatform API for marketplace escrow flows. Xendit handles KYC, fund custody, settlement, disbursement. Platform handles internal ledger (source of truth), order state tracking, commission calculation. Webhook handlers idempotent.

**REQ-PAY-03 (Double-Entry Escrow Ledger):** Every transaction writes paired debit/credit entries. 0% balance drift — automated reconciliation on every transaction. Ledger is immutable — corrections are offsetting entries, not updates or deletes.

**REQ-PAY-04 (Escrow Lifecycle):** Customer pays → funds held in escrow → Provider marks work complete → 3-day buyer review window → auto-release if no dispute → freeze if dispute. Provider sees escrow status. Customer sees countdown timer. 3-day buffer admin-configurable.

**REQ-PAY-05 (Cash Transactions):** Dual confirmation (Customer confirms paid, Provider confirms received). No escrow hold. Platform tracks for trust score and review eligibility. Commission tracked as receivable. Downloadable receipt generated. High-value cash (> ₱5,000) may trigger additional confirmation (admin-configurable).

**REQ-PAY-06 (Commission Model):** Default split: 75% Provider / 10% Agent / 15% Platform (agent-managed); 85% Provider / 15% Platform (direct). ALL rates are admin-configurable per category, tier, and province. Category-level subsidy overrides supported (tricycle/transport 0–3%, farm labor 0–3%, emergencies 0%). Time-bounded promos supported.

**Commission Philosophy:** Rates start intentionally low to maximize user intake during adoption phase. As the platform gains popularity, the model can be adjusted. Sensitivity to provincial price points is paramount — fees must not penalize participation. Cash transactions carry a higher rate (12%) to cover dispute risk buffer and handling cost, but this too is admin-configurable.

**REQ-PAY-07 (Payout & Withdrawal):** Weekly batched disbursements via Xendit — reduces per-transaction cost compared to on-demand withdrawals. Provider sees wallet balance in My Space. Withdrawal to GCash or bank account. Minimum withdrawal and schedule admin-configurable. Payout status tracked: pending → processing → completed → failed (with retry).

**REQ-PAY-08 (Cancellation & Refund):** Before work starts: full refund. Optional cancellation fee to Provider (admin-configurable). After work starts (mutual): admin-mediated partial refund. After work starts (Provider cancels): full refund. After work starts (Customer cancels): Provider may receive partial payment for work done.

**REQ-PAY-09 (Cloud Truth Boundary):** Real money governed exclusively by cloud backend and payment gateway. Client-side storage has zero disbursement authority. Offline transactions default strictly to external cash settlement. Digital escrow never validated or disbursed offline.

**REQ-PAY-10 (Financial Audit):** Admin dashboard: real-time ledger, escrow summary, transaction volume, commission revenue. Provider: downloadable transaction history, earnings summary. Automated daily reconciliation with drift detection and alerting. Exportable for external audit.

### 3.11 Dispute Resolution

> *See §6.4 for full dispute resolution phases, cash dispute rules, and trust-score impact. Dispute resolution is governed under Financial Integrity (§6).*

### 3.12 Search & Discovery

**REQ-SRC-01 (H3 Geospatial Indexing):** Every Provider mapped to Uber H3 Resolution 8 cell by barangay coordinates. Search results filtered by proximity via k-ring neighbor lookup. Distance displayed as "0.5 km away — Barangay Bio." O(1) spatial queries via PostGIS + H3 index.

**REQ-SRC-02 (Category Browsing & Filtering):** 28 categories in 8 tier groups with SVG icon carousel. Filters: category, price range, barangay, availability, rating, verification tier. Dual-tab feed: Direct Offers vs Buyer Requests. Sort by distance, rating, price, newest.

**REQ-SRC-02a (Price Visibility Filter):** Price filter toggle: "Fixed Price / Negotiable." Hidden-price and starting-from listings appear under Negotiable. Hidden-price listings display a "Request a Quote" badge and the anonymized category-average price range instead of a numeric price.

**REQ-SRC-03 (Text Search):** Full-text search via Meilisearch. Typo-tolerant. Language-aware (Tagalog, Ilocano, English). Voice-first mic button (Web Speech API).

**REQ-SRC-04 (ε-Greedy Cold-Start Balancing):** 80% search impressions to top Bayesian-rated Providers, 20% to newly onboarded (≤ 5 completed jobs). Admin-configurable ratio.

**REQ-SRC-05 (Provider Liquidity Tracking):** Active Provider-to-Request ratio per category per barangay. Target ≥ 2.0 bids per open Request. Low-liquidity categories flagged in admin dashboard. Algorithm dynamic — no automated broadcasting to other barangays unless configured.

**REQ-SRC-06 (Featured Slots):** 3 per category per town, rotated weekly based on performance score + boost status. Not pay-to-win.

### 3.13 Verification & Trust

**REQ-VER-01 (Progressive Identity Verification):**

| Tier | Requirement | Method | Unlocks |
|---|---|---|---|
| Phone Verified | SMS OTP on signup | Automated, instant | Basic account, browse only |
| Identity Verified | Selfie + valid government ID | AI face match + admin spot-check | Create listings, accept bookings |
| Barangay Verified | Barangay Clearance upload | Admin review | Visibility boost, featured slot eligibility |
| Professional Verified | NBI Clearance + trade certification/license | Admin review | Lower dispute hold %, higher search ranking |
| Business Verified | DTI/SEC + BIR Form 2303 | Admin review | No transaction caps, priority support, "Business Verified" badge |

**REQ-VER-02:** Verification is FREE. No PH platform charges for it.  
**REQ-VER-03:** Agent-managed owners must reach at least Barangay Verified before listings go live. Agent must be Identity Verified.  
**REQ-VER-04:** Professional license flags (PRC, TESDA, DOH, LTO/TODA) display as informational badges.

**REQ-TRU-01 (Trust Score):** Composite metric: verification tier + completion rate + dispute rate + average rating + response time + repeat customer rate. Displayed on listing cards and provider profiles.

**REQ-TRU-02 (Review System):** Both parties can review after a completed transaction. Minimum 3 reviews before star rating displays. Reviews are public. Providers can respond publicly. Verified reviews (with confirmed transaction) carry a "Verified Purchase/Task" badge. Points awarded for submitting verified reviews.

### 3.14 Notifications

**REQ-NTF-01 (Event-Driven Notification Matrix):**

| Event | Customer | Service Provider | Agent | Offline Owner |
|---|---|---|---|---|
| Booking confirmed | In-app | In-app + SMS | — | — |
| Work started | In-app | In-app | — | — |
| Work completed / review window | In-app + SMS | In-app + SMS | In-app | — |
| Escrow released | In-app | In-app + SMS | In-app | SMS (amount only) |
| Dispute opened | In-app + SMS | In-app + SMS | In-app + SMS | SMS (alert only) |
| New Request posted (matching category) | — | In-app | In-app | — |
| Bid placed on your Request | In-app + SMS | — | — | — |
| Bid won | — | In-app + SMS | In-app | SMS |
| New booking (agent-managed) | — | — | In-app | SMS (schedule info) |
| Payout processed | — | In-app | In-app | SMS (weekly digest) |

**REQ-NTF-02:** SMS is for time-sensitive actions only. Agent handles platform actions; owner gets informational SMS.  
**REQ-NTF-03:** All notifications configurable per user in My Space. Notification preferences: all, critical only, none.

### 3.15 Boost & Advertising

**REQ-BST-01:** Per-listing boost toggle. Boosted listings receive increased search ranking and featured slot eligibility.  
**REQ-BST-02:** Boost is a paid feature. Pricing admin-configurable.  
**REQ-BST-03:** Advertising analytics in My Space: views from boost, conversion rate vs organic, cost per booking.  
**REQ-BST-04:** Phase 2+ — not required for pilot launch.

### 3.16 Points & Affiliate Ecosystem

**REQ-PTS-01:** Customers earn points for submitting verified reviews. Points redeemable for platform credits.  
**REQ-PTS-02:** Providers earn visibility boosts for high ratings and timely completion rates.  
**REQ-PTS-03:** Provider-to-provider referrals unlock featured listing slots (non-monetary).  
**REQ-PTS-04 (Phase 3+):** Buyer referral credits (both parties get credit on next booking), local business affiliate bounties (sari-sari stores earn per completed booking from their QR code), cooperative bulk onboarding partnerships (TODA).  
**REQ-PTS-05:** Affiliate mechanics are Phase 3+ — no referral system before liquidity exists to refer.

### 3.17 Kiosk Access Points

**REQ-KSK-01:** Serbizyu-owned hardware stations at strategic locations. Shared Android tablet interface.  
**REQ-KSK-02:** Functions: cash deposit processing, receipt printing, QR code display for Quick Deal initiation, platform browsing for non-smartphone users.  
**REQ-KSK-03:** Kiosk is infrastructure, not a platform role. No Kiosk Partner persona.  
**REQ-KSK-04:** Phase 2+ — not required for pilot launch.

---

## 4. Business Rules, Revenue Model & Agent Incentives

> **Facilitated:** July 27, 2026 — Section locked. Revenue splits adjusted per founder direction (lower platform defaults). All rates remain admin-configurable.

### 4.1 Revenue Model — Default Splits

All rates are **admin-configurable** per category, tier, and province. Defaults are intentionally low to maximize adoption intake.

| Scenario | Split | Note |
|---|---|---|
| **Direct** (Provider sells directly) | 90% Provider / 10% Platform | No agent involved |
| **Agent-Managed** (Owner/Agent/Platform) | 80% Owner / 10% Agent / 10% Platform | Agent tier influences agent share |
| **Cash Transactions** | 8% Platform rate | Covers dispute risk buffer; no escrow hold |
| **Category Subsidies** | 0–3% Platform | Tricycle/transport, farm labor, emergencies |
| **Boost/Advertising** | Per-listing paid feature | Phase 2+; pricing admin-configurable |
| **Time-Bounded Promos** | 0% Platform, first 30 days | Tagudin pilot launch incentive |

**Payout Schedule:** Weekly batched disbursements via Xendit. Minimum withdrawal and schedule are admin-configurable.

**Philosophy:** Rates start low to prioritize user intake during adoption phase. As the platform gains popularity, the model can be adjusted upward. Sensitivity to provincial price points is paramount — fees must not penalize participation.

### 4.2 Business Rules — Operational Constants

Platform-wide rules that apply across all categories. All values admin-configurable.

| Rule | Default Value | Rationale |
|---|---|---|
| Minimum listing price | ₱5 | Prevents troll/spam ₱1 listings |
| Default escrow auto-release window | 3 days | Shopee-style buyer protection |
| Maximum Quick Deal counter-offer rounds | 3 | Prevents endless negotiation |
| High-value cash transaction threshold | ₱5,000 | Triggers additional confirmation above this amount |
| Minimum reviews before star rating displays | 3 | Prevents single-review distortion |
| Featured slots per category per town | 3 | Rotated weekly based on performance |
| ε-Greedy cold-start ratio | 80/20 | Veterans / newcomers search impression split |
| Agent-owner relationship limit | Admin-configurable per tier | Prevents agent account farming |
| Dispute expiration window | Admin-configurable | Receipt-as-liability model (see Phase 1 FAQ #1) |
| ID verification requirement for listings | Identity Verified tier minimum | Government ID + selfie face match |
| Agent-managed owner verification | Barangay Verified minimum before listings go live | Extra scrutiny for offline owners |

### 4.3 Agent Incentive Model

Reinforcing Section 3.8 (Human Agent Network):

| Incentive | Mechanism |
|---|---|
| **Commission Ladder** | Bronze (10%) → Silver (11–12%) → Gold (13–15%) → Platinum (max) |
| **Graduation Bonus** | 3× owner's average monthly commission when owner transitions to independent smartphone use |
| **Featured Badge** | Silver tier and above, displayed on managed listings |
| **Priority Expansion** | Gold tier gets first access to new barangay territories |
| **Mentorship Bonus** | Platinum tier earns on agents they train (Phase 3+) |
| **SMS Safety Keywords** | Every notification includes STOP (suspend agent) and REVOKE (permanent removal) — irrefutable consent record |

### 4.4 DOLE Classification

Agents are classified as **independent contractors**, not employees:
- No prescribed working hours or methods
- Commission-based compensation (not salary/wage)
- Owner controls agent relationship; platform facilitates
- Agent provides own tools (smartphone, internet)
- Revenue split terms disclosed upfront at onboarding

---

## 5. Regulatory & Compliance (3-Lane Formalization Ladder)

> **Facilitated:** July 27, 2026 — Section locked. Ladder designed as earnings progression, not tax burden.

The 3-Lane Ladder frames regulatory compliance as "Unlock more earnings" — not "File your taxes." Servicers climb at their own pace. No lane is forced; each lane unlocks higher earnings and trust signals.

### Lane 1 — Informal (Entry)

| Attribute | Detail |
|---|---|
| **Requirement** | Phone verified + Government ID or Barangay Clearance |
| **Unlocks** | Create listings, accept bookings, browse platform |
| **Payout Cap** | ₱50,000/month (admin-configurable) |
| **Tax Status** | No BIR filing required at this tier |
| **Badge** | None |

### Lane 2 — Sworn Declaration (Growth)

| Attribute | Detail |
|---|---|
| **Requirement** | Lane 1 + digital Sworn Declaration under BIR RR 16-2023 |
| **Process** | 2-minute guided form in-app → auto-generates PDF for provider submission |
| **Unlocks** | Full tax-free payouts up to ₱250,000/year (BMBE threshold), "Tax-Compliant" badge |
| **Tax Rate** | 1% withholding (BIR RR 16-2023) or BMBE-exempt if registered |
| **Badge** | "Tax-Compliant" |

### Lane 3 — Registered Business (Max)

| Attribute | Detail |
|---|---|
| **Requirement** | Lane 2 + BIR Form 2303 + BMBE Certificate (or DTI/SEC) |
| **Unlocks** | Uncapped earnings, "Business Verified" badge, priority search placement, eligible for Boost/Advertising |
| **Badge** | "Business Verified" |

### Regulatory Cross-Cutting Concerns

| Area | Requirement | Status |
|---|---|---|
| **BSP (Bangko Sentral)** | Xendit xenPlatform handles payment custody. Platform classified as OPS (Operator of Payment System) partner, not MSB (Money Service Business). | Legal opinion pending |
| **DPA (Data Privacy Act, RA 10173)** | NPC registration for personal data processing. Consent language for government ID and selfie collection. Data retention and deletion policy. | Required before launch |
| **DOLE (Labor Code)** | Agent classification as independent contractor (see §4.4). No employer-employee relationship; commission-based; no prescribed hours. | Model designed for compliance |
| **LGU Permit** | Mayor's Permit for Tagudin operations. Business registration with Municipal Hall. | Research pending (walk-in) |
| **DTI Consumer Act (RA 7394)** | Quote-based pricing: quotes are estimates, not binding offers (disclaimer). Price transparency: category-average ranges displayed even for hidden-price listings. | Mitigated by platform design |
| **Professional Regulation** | PRC / TESDA / DOH / LTO-TODA license badges are informational at launch — not blockers to listing creation. | Phase 2+ enforcement |
| **Insurance** | Not required for pilot launch. Deferred to Phase 3. | P3 |
| **BMBE (RA 9178)** | Barangay Micro Business Enterprise registration at Lane 3. Income tax exemption up to ₱250,000/year. LGU-filed, not BIR. | Key servicer incentive |

---

## 6. Financial Integrity, Governance & Risk Guardrails

> **Facilitated:** July 27, 2026 — Section locked. Consolidates financial integrity (§3.10), dispute resolution (§3.11), and governance layer.

### 6.1 Financial Integrity (Consolidated from §3.10)

| Item | Source | Key Rule |
|---|---|---|
| Double-entry escrow ledger | REQ-PAY-03 | Paired debit/credit entries, 0% drift, immutable — corrections are offsetting entries, not updates |
| Xendit xenPlatform | REQ-PAY-02 | Handles KYC, fund custody, settlement, disbursement. Platform owns internal ledger as source of truth. |
| Cloud Truth Boundary | REQ-PAY-09 | Real money governed exclusively by cloud backend and payment gateway. Client-side storage has zero disbursement authority. Offline transactions default strictly to external cash settlement. |
| 3-day escrow auto-release | REQ-PAY-04 | Shopee-style buyer protection window; admin-configurable |
| Cash dual-confirmation | REQ-PAY-05 | Both parties confirm payment/receipt; no escrow hold; amounts above ₱5,000 trigger additional confirmation |
| Weekly batched payouts | REQ-PAY-07 | Via Xendit — lower per-transaction cost than on-demand disbursement |
| Automated daily reconciliation | REQ-PAY-10 | Drift detection with alerting; exportable for external audit |

### 6.2 Governance — Audit Trail & Admin Oversight

**REQ-GOV-01 (Audit Trail):** Every financial event (escrow hold, release, refund, commission split, payout) is logged with: actor ID, timestamp, amount, order reference, ledger entry ID, event type. Logs are immutable — corrections are offsetting entries, never modifications or deletions.

**REQ-GOV-02 (Admin Oversight Dashboard):**
- Real-time escrow summary: total held, pending release, frozen/disputed
- Transaction volume and commission revenue by category and period
- Provider liquidity per category per barangay (see REQ-SRC-05)
- Agent commission payouts and tier distribution
- Automated fraud flags: velocity checks, anomalous commission patterns, quote-to-booking ratio outliers
- Dispute queue with aging and resolution metrics

### 6.3 Risk Guardrails

| Guardrail | Rule | Rationale |
|---|---|---|
| Provider payout hold | New providers: first 3 completed transactions held for additional 2 days beyond standard auto-release before disbursement | Anti-fly-by-night fraud; admin-configurable count and duration |
| High-value escrow threshold | Transactions above ₱10,000 require admin review before escrow release | Extra scrutiny on large amounts; threshold admin-configurable |
| Agent concurrent owner limit | Admin-configurable max owners per agent per tier (e.g., Bronze: 20, Silver: 50, Gold: 100, Platinum: unlimited) | Prevents account farming and quality dilution |
| Dispute rate suspension | Providers exceeding 5% dispute rate (rolling 90-day window) automatically paused; admin reviews for reactivation | Quality gate; threshold admin-configurable |
| Cash advisory threshold | Cash transactions above ₱15,000 trigger an in-app recommendation to use digital escrow for security. Transaction is NOT blocked — platform cannot control external cash. Receipt-based trust model (Phase 1 FAQ #1) handles disputes regardless of amount. | Advises safety without restricting user choice; threshold admin-configurable |
| Quote response SLA enforcement | Providers with >48h average response time on quote requests receive "Slow Response" warning; >72h triggers listing visibility downgrade | Protects buyer experience for hidden-price listings |

### 6.4 Dispute Resolution

> *Consolidates and locks §3.11. Platform/admin carries the resolution burden — buyer and seller do not need to be online simultaneously.*

| Phase | Action | Timeline |
|---|---|---|
| **1. Open** | Either party files dispute with reason category + evidence upload (photos, messages, receipts) | Any time before escrow auto-release or within configurable window after completion |
| **2. Evidence Collection** | Admin independently gathers receipts, conversation logs, photos, kiosk footage (if available) from both parties. Admin drives the process — buyer and seller respond asynchronously. | Target: 48 hours from filing |
| **3. Resolution** | Admin rules based on evidence + platform policy. Solid/deterministic cases (clear receipt, clear fault): immediate resolution. Complex cases (conflicting evidence, ambiguous fault): admin issues preliminary finding with documented reason; may extend for final evidence. | **Target: 48h from filing** for deterministic cases. Complex: up to 5 days with documented extension reason. |
| **4. Final** | Binding ruling issued. Rationale recorded. Logged to immutable audit trail. Both parties notified. | Binding upon issuance |
| **Cash Disputes** | Receipt is the primary trust anchor (Phase 1 FAQ #1). No receipt = burden of proof falls on claiming party. Dispute expiration window is admin-configurable — if neither party raises within the window, transaction stands. | Configurable expiration |

**REQ-DSP-01:** Dispute history affects provider trust score and tier eligibility. Resolved disputes count less than unresolved.  
**REQ-DSP-02:** Customers can view a provider's dispute rate and resolution rate on the provider profile.  
**REQ-DSP-03:** Repeat disputers (either role) flagged for admin review. Pattern of frivolous disputes may result in platform restriction.

### 6.5 External Escalation & Legal Handoff

When internal dispute resolution (§6.4) fails — either party rejects the admin ruling, or the case involves external factors (cash dispute with no receipt, fraud outside platform jurisdiction) — a formal handoff path exists.

**Three-Tier External Escalation:**

| Tier | Channel | When Used | Platform Role |
|---|---|---|---|
| **1. Platform Final Ruling** | Admin issues binding decision with full evidence package | After §6.4 phases exhausted | Platform is arbiter |
| **2. Formal Handoff Letter** | Platform generates a structured "Notice of Unresolved Dispute" document. Contains: transaction summary, evidence log, admin findings, both party statements. Digitally signed by platform. Delivered to both parties. | Either party rejects the platform ruling and wants external recourse | Platform provides the case file; does not represent either party |
| **3. External Legal Pathway** | Parties take the handoff letter to: **Barangay Lupon** (Katarungang Pambarangay — mandatory first legal step in PH for disputes between residents of the same municipality under RA 7160), **DTI Consumer Mediation** (for consumer complaints under RA 7394), or **Small Claims Court** (for monetary claims under ₱400,000, no lawyer required under AM No. 08-8-7-SC) | Handoff letter serves as the complete case file | Platform is no longer involved; case file is the platform's final contribution |

**REQ-GOV-03 (External Handoff Letter):** Platform generates a formal Notarized-Ready handoff document on request. Contains: transaction ID, timeline of events, evidence index with hashes, admin findings and ruling, both party statements. Platform does not provide legal representation. The handoff letter is the platform's final action on the dispute.  
**REQ-GOV-04 (Future Legal Housing):** Phase 3+ — platform may retain in-house or partnered legal counsel for dispute arbitration and mediation. Out of scope for academic pilot.

---

## 7. Discovery, Recommendation & Accessibility

> **Facilitated:** July 27, 2026 — Section locked. Covers multi-channel access tiers, offline-first patterns, recommendation schema, and accessibility standards.

### 7.1 Multi-Channel Access Tiers (L0–L4)

Serbizyu serves users across the full digital divide spectrum. Five access tiers ensure no user is locked out by their device or connectivity.

| Tier | User | Device | Connectivity | Interface | Discovery Method |
|---|---|---|---|---|---|
| **L0** | Non-digital service owner | Feature phone (no data) | SMS only | SMS notifications + keyword replies (APPROVE, STOP, REVOKE) | Agent brings them work; they confirm via SMS |
| **L1** | Kiosk user | Shared tablet at sari-sari store / barangay hall | WiFi/4G (kiosk-owned) | Kiosk app — browse-only or operator-assisted | Browse by category; kiosk operator assists |
| **L2** | Smartphone — offline / low-data | Android/iOS, intermittent connectivity | Intermittent | PWA with IndexedDB cache for catalog | Browse cached catalog; search when online; requests queued offline |
| **L3** | Smartphone — online | Android/iOS, 4G/5G/WiFi | Always-on | Full PWA — all features | Full search, browse, Quick Deal QR, notifications, quotes |
| **L4** | Power user / admin | Desktop/laptop + smartphone | WiFi/ethernet | Full web app + admin dashboard | Admin tools, analytics, bulk operations, governance |

**REQ-ACC-01:** Feature degradation is tier-aware. L2 users never see features requiring real-time connectivity. L0 users never see visual UI elements.  
**REQ-ACC-02:** All tiers produce the same Order — the backend is tier-agnostic. Tier determines presentation, not transaction capability.

### 7.2 Offline-First Patterns

| Pattern | Mechanism | Tier |
|---|---|---|
| Catalog caching | Top/popular listings cached in IndexedDB on PWA; refreshed on connectivity | L2, L3 |
| Queued requests | Buyer Requests and Quote Requests composed offline; synced when online | L2 |
| Offline Quick Deal | QR scan + counter-offer stepper works fully air-gapped (see §3.3); deal data syncs when either device reconnects | L2, L3 |
| Conflict resolution | Last-write-wins with server timestamp authority. Cloud Truth Boundary (§3.10 REQ-PAY-09) governs all money — client has zero disbursement authority | All |

### 7.3 Recommendation Engine Schema

Recommendation logic is Phase 2+ but the data model is prepared. Not in pilot scope.

| Signal | Weight | Description |
|---|---|---|
| Category affinity | High | User's past bookings by category → boost similar categories |
| Barangay proximity | High | H3 k-ring lookup — closer providers ranked higher |
| Provider trust score | Medium | Composite: verification tier + completion rate + rating + dispute rate |
| Recency | Low | Recently active providers get slight freshness boost |
| ε-Greedy cold-start | 20% | New providers (≤5 completed jobs) guaranteed 20% of search impressions |

### 7.4 Accessibility Standards

**REQ-ACC-03:** PWA meets WCAG 2.1 Level AA minimum: keyboard-navigable, screen reader compatible (ARIA labels), sufficient color contrast (4.5:1 minimum), scalable text without layout breakage.  
**REQ-ACC-04:** Multi-language UI: Tagalog, Ilocano, English — user-selectable in settings, not geo-guessed. Language preference persists across sessions.  
**REQ-ACC-05:** SMS notifications use plain language — no URLs, no markdown, no special characters. Critical action keywords in ALL CAPS (APPROVE, STOP, REVOKE) for feature phone readability. Maximum 160 characters per SMS to avoid segmentation on 2G networks.  
**REQ-ACC-06:** Kiosk interface uses large touch targets (minimum 48×48dp), high-contrast mode default, and step-by-step guided flows for first-time users.

---

## 8. Non-Functional Requirements (NFRs) & Quality SLAs

> **Facilitated:** July 27, 2026 — Section locked.

### 8.1 Performance & Latency

| Metric | Target | Measurement |
|---|---|---|
| Page load (PWA, 4G) | < 3 seconds to interactive | Lighthouse / Web Vitals |
| Page load (PWA, 3G/2G) | < 8 seconds to first paint | PWA with lazy loading + code splitting |
| SMS OTP delivery | < 10 seconds | TextBee gateway SLA |
| Search response (Meilisearch) | < 200ms for text search | Server-side timing |
| API response (typical) | < 300ms p95 | Laravel Telescope / monitoring |
| Escrow webhook processing | < 2 seconds (idempotent) | Xendit webhook → ledger update |
| Image optimization | Auto-resize + WebP conversion on upload | Intervention/image + queue job |

### 8.2 Reliability & Availability

| Metric | Target |
|---|---|
| Platform uptime | 99% (academic timeline; single VPS) |
| Escrow ledger availability | 99.9% (financial data — highest priority) |
| Scheduled maintenance window | Sundays 2:00–4:00 AM, with in-app notice 48h prior |
| Backup frequency | Daily database + file backups; retained 30 days |
| Disaster recovery | Restore from backup within 4 hours |

### 8.3 Security

| Requirement | Implementation |
|---|---|
| Authentication | Laravel Sanctum SPA auth; session-based for web, token-based for PWA |
| Authorization | Policy-based gates per role (Customer, Provider, Agent, Admin) |
| Data in transit | TLS 1.3 minimum; Cloudflare edge |
| Data at rest | PostgreSQL encryption-at-rest; sensitive fields (government IDs, selfies) encrypted at application layer |
| API rate limiting | Per-user, per-endpoint; admin-configurable thresholds |
| OWASP Top 10 | CSRF protection, XSS filtering, SQL injection prevention (Eloquent ORM), secure headers (CSP, HSTS) |
| Dependency scanning | Composer audit + npm audit on CI pipeline |
| PII handling | Government IDs, selfies, phone numbers — encrypted at rest, access-logged, purgeable on account deletion per DPA (RA 10173) |

### 8.4 Scalability (Academic Ceiling)

| Constraint | Target | Notes |
|---|---|---|
| Concurrent users | 50 (Tagudin pilot) | Single VPS: 2 vCPU, 4GB RAM handles this comfortably |
| Daily transactions | 100 (pilot phase) | Database + Redis on same host adequate |
| Storage | 20GB SSD (pilot) | Images on local filesystem; Cloudflare R2 for Phase 2+ |
| SMS volume | 500/month (TextBee unli-SMS plan) | Agent-managed owners + transactional notifications |
| Design ceiling | Schema and architecture designed for 10,000+ users; infrastructure upgraded when needed | No premature optimization; no microservices for pilot |

### 8.5 Data Retention & Privacy

| Policy | Rule |
|---|---|
| Transaction records | Retained indefinitely (financial audit trail) |
| Government ID images | Retained while account active + 1 year after deletion per DPA; then purged from storage |
| Chat/message history | Retained 2 years; user-requestable deletion |
| Dispute evidence | Retained 5 years (statute of limitations reference) |
| Analytics data | Anonymized after 12 months |
| Account deletion | User-requestable; triggers PII purge within 30 days |

---

## 9. Academic Scope Boundaries & Traceability Matrix

> **Facilitated:** July 27, 2026 — Section locked. Phase 2 PRD complete.

### 9.1 Zero-Cost Constraint

All infrastructure during academic development must use free tiers, self-hosted alternatives, or one-time hardware costs. No recurring SaaS subscriptions.

| Service (Near-Pilot Paid Option) | Academic Alternative | One-Time Cost |
|---|---|---|
| TextBee Android Gateway | Dedicated Android phone + unli-SMS SIM | ₱100/mo SIM load |
| Cloudflare R2 (object storage) | Local filesystem on VPS (already provisioned) | ₱0 |
| Meilisearch Cloud | Self-hosted Meilisearch on same VPS | ₱0 |
| Mapbox (maps) | Free tier (50K monthly loads); OpenStreetMap + Leaflet fallback | ₱0 |
| Xendit xenPlatform | Xendit sandbox for dev — live requires BSP-registered business (accepted: this is the one paid dependency at go-live) | ₱0 for dev |
| Deployment | **Self-hosted Dokploy on Proxmox VPS** with domain (dxtechph.online available) | ₱0 (existing infra) |

**REQ-SC-01:** Zero recurring infrastructure cost during academic timeline. SMS hardware is a one-time ₱300 purchase. Xendit live keys are the sole paid dependency at pilot launch. Dokploy handles all deployment, SSL, and container orchestration.

### 9.2 Capacity Gates (Build If Capable)

Phase labels are priority hints, not hard gates. If a feature's schema and requirements are documented in the PRD, and the team has capacity, build it.

| Feature | Priority | Rule |
|---|---|---|
| Boost/Advertising (§3.15) | Phase 2 | Simple toggle + featured slot logic is lightweight — build if time permits |
| Hidden Price / Quote (§3.2, §3.3) | Phase 2 | Schema and requirements documented; implementation deferred unless capacity allows |
| Kiosk (§3.17) | Phase 2 | Build if Android tablet available + kiosk-mode PWA is straightforward |
| Recommendation engine (§7.3) | Phase 3 | Schema prepared; defer unless substantial extra time |
| Points/Affiliate (§3.16) | Phase 3 | Defer — needs active user liquidity before it makes sense |
| User-connected channels (§3.5 Form B) | Phase 3 | Defer — platform-owned channels (Form A) sufficient for pilot |
| Virtual World (§3.7 REQ-MSP-07) | Out of scope | Definite out-of-scope |
| Geographic expansion | Out of scope | Tagudin only — no Candon, no province-wide |

### 9.3 Scope Fence — What's IN

| Scope Area | Included |
|---|---|
| **Geography** | Tagudin, Ilocos Sur ONLY |
| **Launch fulfillment presets** | A1 (Linear Project), A3 (Appointment), A4 (Handoff), A9 (Digital Deliverable) |
| **Payment** | Xendit sandbox (dev) / Xendit live (pilot) + external cash |
| **Serbi AI** | Cloud-only via Laravel AI SDK |
| **Infrastructure** | Single Proxmox VPS, Dokploy-managed containers, domain dxtechph.online |
| **Channels** | Platform-owned: FB Page, FB Groups, Messenger Bot, SMS, SEO |
| **Agent network** | In-house trained agents in Tagudin; Bronze–Platinum tier ladder |
| **Verification** | 5-tier progressive identity (Phone → Identity → Barangay → Professional → Business) |
| **Deployment** | Dokploy CI/CD from GitHub; Cloudflare DNS/TLS |

### 9.4 Explicitly OUT of Scope

| Item | Reason |
|---|---|
| Geographic expansion beyond Tagudin | Academic timeline; requires real capital + operational presence |
| Real capital / paid marketing | Bootstrap phase; student budget |
| Legal representation for disputes | Phase 3+; handoff letter (§6.5) is max commitment |
| Professional license enforcement | Badges are informational at launch |
| In-house payment custody (MSB license) | Xendit handles all custody; platform is OPS partner |
| Virtual World / AR/VR spatial discovery | Indefinite out-of-scope |
| Dedicated mobile apps (iOS/Android native) | PWA is the delivery mechanism |

### 9.5 Traceability — Phase 1 → PRD

| PRD Section | Source Phase 1 Artifact | Old-Docs / Research Source |
|---|---|---|
| §1 Product Purpose | PRFAQ Press Release | — |
| §2 Personas | FAQ Challenge #4 (Adoption) | — |
| §3.1 Catalog | PRFAQ (28 categories) | `old-docs/strategies/industry-coverage-matrix.md` |
| §3.2 Listing Types | Listing Model Taxonomy §1–3 | `old-docs/architecture/deal-system-spec.md` |
| §3.3 Transactions | Listing Model Taxonomy §3 | `old-docs/architecture/deal-system-spec.md`, `offline-deal-spec.md` |
| §3.4 Archetypes | Listing Model Taxonomy §4 (A1–A10) | `old-docs/architecture/fulfillment-archetypes.md` |
| §3.5 Channels | PRFAQ supporting infra | `old-docs/architecture/connector-architecture.md` |
| §3.6 Serbi AI | PRFAQ supporting infra | `docs/.../04-engineering-architecture-master-reference.md` |
| §3.7 My Space | PRFAQ supporting infra | `old-docs/architecture/connector-architecture.md` |
| §3.8 Agent Network | FAQ #3 (Fraud) + #4 (Adoption) | `old-docs/decisions/decision-matrix.md` (D18–D19) |
| §3.9 3-Lane Ladder | PRFAQ supporting infra | `docs/.../02-onboarding-formalization-agent-strategy.md` |
| §3.10 Payment | FAQ #1 (Trust) + #2 (Economics) | `old-docs/decisions/decision-matrix.md` (D17, D24, D27) |
| §3.12 Search | FAQ #4 (Adoption) | `old-docs/decisions/decision-matrix.md` (D9–D11) |
| §3.13 Verification | FAQ #1 + #3 | `old-docs/decisions/decision-matrix.md` (D4, D6) |
| §4 Revenue & Rules | FAQ #2 (Unit Economics) | `old-docs/decisions/decision-matrix.md` (D17, D27) |
| §5 Regulatory | Research Agenda P0–P3 | `research/serbizyu-ph-regulatory-report.md` |
| §6 Financial Integrity | FAQ #1 (Trust) + #5 (Risk) | `old-docs/architecture/deal-system-spec.md` |
| §7 Discovery & Access | FAQ #4 (Adoption) | `old-docs/architecture/connector-architecture.md` |
| §8 NFRs | FAQ #5 (Execution Risk) | `docs/.../03-tech-architecture-cost.md` |
| §9 Scope Boundaries | FAQ #5 + founder direction | `docs/.../04-engineering-architecture-master-reference.md` |

### 9.6 Dokploy Deployment Architecture

| Component | Detail |
|---|---|
| **Orchestrator** | Dokploy on Proxmox VM |
| **Domain** | dxtechph.online |
| **SSL** | Auto-provisioned via Dokploy + Let's Encrypt |
| **Containers** | Laravel app (PHP-FPM + Nginx), PostgreSQL 16, Redis, Meilisearch, Reverb (WebSocket) |
| **CI/CD** | GitHub → Dokploy webhook trigger → rebuild → deploy |
| **SMS** | TextBee Android Gateway (dedicated device on local network) |
| **Backup** | Dokploy native volume backups → local retention + optional Cloudflare R2 sync |

---

*Document under active facilitation. Version 3.0.1 — Sections 1–9 locked. Phase 2 PRD complete. Hidden-price/Quote feature integrated into §3.2, §3.3, §3.12. External escalation handoff added to §6.5. Zero-cost academic constraint + capacity gates applied to §9. Dokploy deployment architecture documented.*
