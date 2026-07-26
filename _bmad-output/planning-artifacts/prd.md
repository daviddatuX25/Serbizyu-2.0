# Serbizyu 2.0 — Product Requirements Document (PRD)

> **BMAD Method Phase 2 Artifact: Planning & Scoping**  
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

**REQ-LST-01:** Every listing has: title, description, category, price/pricing mode (fixed, tiered, hourly, negotiable, per-unit), service radius or pickup area, photos (min 1, max 8), availability calendar or stock count, fulfillment archetype, agent-managed flag, license verification badge.  
**REQ-LST-02:** Pricing supports all modes: fixed, tiered, hourly, per-kilo, per-unit, negotiable.

### 3.3 The Five Transaction Mechanisms

| # | Mechanism | Initiated By | Flow |
|---|---|---|---|
| 1 | **Direct Booking** | Customer/Buyer browses a listing | Browse → Select → Pay into escrow → Order created |
| 2 | **Reverse Bidding** | Customer posts a Request | Post Request → Providers submit bids → Customer picks winner → Order created |
| 3 | **Quick Deal** | Either party, face-to-face | Scan QR → Counter-offer stepper (max 3 rounds) → Dual confirmation → Order created |
| 4 | **Deal-Chaining** | Either party, multi-party | Create Deal container → Invite providers per slot → All slots filled → Buyer approves → Multiple Orders created |
| 5 | **Agent-Mediated** | Agent, on behalf of offline Owner | Agent creates listing → Owner approves via SMS OTP → Listing goes live → Customer books → Owner gets SMS confirmation → Revenue split 75/10/15 |

**REQ-TXN-01:** Every mechanism produces an Order. The Order state machine is identical regardless of mechanism: `created → held_in_escrow → in_progress → awaiting_signoff → completed` (or `disputed`).  
**REQ-TXN-02:** Revenue flows through the same commission engine regardless of mechanism. Admin-configurable per category.  
**REQ-TXN-03:** Listing types and transaction mechanisms are independent dimensions. Any listing type can be transacted through any compatible mechanism.  
**REQ-TXN-04:** Quick Deal / Deal-Chaining compatibility is a provider/agent decision, not a hard archetype restriction. Providers toggle whether they accept Quick Deals for their listings.

**Quick Deal Offline Behavior:**

| Scenario | How It Works | Connectivity Required |
|---|---|---|
| Phone + Phone (both with app + camera) | QR scan locally → counter-offer on-device → dual confirm in-app → deal stored locally → syncs when either reconnects | None at transaction time |
| Phone + SMS phone (feature phone) | Smartphone scans QR → counter-offer → SMS confirmation sent to feature phone (`ACCEPT <CODE>`) | Cellular needed for SMS gateway trigger |
| At a kiosk | Kiosk tablet mediates → both parties confirm on kiosk | Kiosk has connectivity |
| Both fully offline (no data, no SMS) | Cannot transact | — |

**Agent-Mediated SMS Consent:**  
**REQ-TXN-05:** Critical actions requiring owner SMS OTP: listing creation/activation, payout withdrawal, agent assignment change.  
**REQ-TXN-06:** Non-critical actions handled by agent without SMS: regular booking confirmation, message replies, calendar updates.

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
| SMS | Platform-hosted Semaphore gateway | ✅ |
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

*[In progress — to be facilitated]*

### 3.12 Search & Discovery

**REQ-SRC-01 (H3 Geospatial Indexing):** Every Provider mapped to Uber H3 Resolution 8 cell by barangay coordinates. Search results filtered by proximity via k-ring neighbor lookup. Distance displayed as "0.5 km away — Barangay Bio." O(1) spatial queries via PostGIS + H3 index.

**REQ-SRC-02 (Category Browsing & Filtering):** 28 categories in 8 tier groups with SVG icon carousel. Filters: category, price range, barangay, availability, rating, verification tier. Dual-tab feed: Direct Offers vs Buyer Requests. Sort by distance, rating, price, newest.

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

*[In progress — to be facilitated]*

---

## 5. Regulatory & Compliance (3-Lane Formalization Ladder)

*[In progress — to be facilitated]*

---

## 6. Financial Integrity, Governance & Risk Guardrails

*[In progress — to be facilitated]*

---

## 7. Discovery, Recommendation & Accessibility

*[In progress — to be facilitated]*

---

## 8. Non-Functional Requirements (NFRs) & Quality SLAs

*[In progress — to be facilitated]*

---

## 9. Academic Scope Boundaries & Traceability Matrix

*[In progress — to be facilitated]*

---

*Document under active facilitation. Version 3.0.0 captures Sections 1–3.7 as locked. Remaining sections to be facilitated per BMAD Phase 2 ceremony.*
