# Serbizyu — Strategy Matrix
*UX psychology, market reach, growth loops, and affiliate mechanics. Each strategy is mapped to a concrete feature, a target metric, and a phase.*

---

## 1. UX Psychology Matrix

| Principle | Feature | Implementation | Target Metric | Phase |
|---|---|---|---|---|
| **Endowed Progress** | Profile Completion Score | Quick-capture at signup (name, phone, category, area) seeds a weighted checklist. "You're 35% done" is honest — it's computed from real data, not a fake number. | % profiles ≥80% complete | 1 |
| **Reciprocity** | Marketing Asset Generator | Branded "digital calling card" produced and shown to servicer *before* any ask to complete profile or pay. No strings attached. | % servicers who complete profile after seeing asset | 2 |
| **Social Proof** | Trust Badge + Review Count | Verification tier, completion rate, response time shown consistently on listing card, profile, distributed content. Minimum 3 reviews before star rating displays. | Click-through rate on listings with badges vs without | 1 |
| **Commitment & Consistency** | Progressive Verification | Phone → ID → Address/Business. Each tier unlocks more visibility. Servicers who verify once are more likely to complete the next tier. | % phone-verified who reach ID-verified | 1 |
| **Scarcity** | Featured Listing Slots | Each category has 3 featured slots per town, rotated weekly. Not pay-to-win; based on performance + completeness. | % servicers who improve profile to compete for slot | 3 |
| **Loss Aversion** | Escrow Protection Messaging | "Your ₱1,500 is held safely. Release only when work is done." Emphasize what buyer *doesn't lose*. | % buyers who mention escrow as reason for booking | 1 |
| **Anchoring** | Price Range Display | Show "₱500–800" not "₱650." The range anchors expectations and reduces negotiation friction. | Average time from inquiry to booking | 1 |
| **IKEA Effect** | Work Template Builder | Servicers who customize their workflow feel ownership and are more likely to stay active. | Retention rate of servicers who customize vs use preset | 3 |
| **Peak-End Rule** | Order Completion Ritual | After escrow release, both parties see a "Transaction Complete" screen with next steps (review, referral, rebook). The end of the transaction is designed, not just a log entry. | % orders with review submitted | 2 |
| **Default Effect** | Smart Defaults | New listings default to "Active," preset Work Template, and Facebook sharing enabled (with consent). Reduce decision fatigue. | Time from signup to first listing | 1 |

---

## 2. Market Reach Matrix

| Segment | Behavior | Channel | Strategy | Phase |
|---|---|---|---|---|
| **Hard Facebook user** | Scrolls feed, joins groups, shares posts | Facebook Page + Groups | Automated listing posts to local groups, boosted to lookalike audiences. Servicer shares their own asset to their network. | 2 |
| **TikTok native** | Watches short video, follows trends, comments | TikTok | 15-second "day in the life" clips from servicers, trending audio, CTA to book via link in bio. Not listing text — entertainment first. | 3 |
| **Messenger-first** | Rarely installs apps, lives in Messenger | Messenger Bot | Full booking flow inside Messenger: browse, inquire, book, pay, track. No app install required. | 2 |
| **SMS-dependent** | Feature phone or limited data | SMS | "BOOK {token}" reply flow. Inquiry, confirmation, and status updates via SMS. | 2 |
| **Google searcher** | "plumber near me," "tricycle Candon" | SEO / Google Business | Server-rendered pages with schema.org, Google Business Profile per servicer, local landing pages per town-category. | 2 |
| **AI agent user** | Asks ChatGPT/Claude for recommendations | AI Discovery (`llms.txt`) | Clean structured pages, JSON-LD, markdown-friendly HTML. Low-cost hygiene, not a growth lever yet. | 2 |
| **Shopee/Lazada buyer** | High purchase intent, comparison shops | Marketplace sync | Cross-list services as "digital products" or vouchers. Own payment/trust rails, but exposure to buying-intent audience. | 3+ |
| **Offline / word-of-mouth** | Trusts neighbor recommendations | Referral + QR codes | Servicer QR code on their vehicle/shop. Scan → Messenger/SMS booking. Referral credit to both parties. | 3 |

---

## 3. Growth Loop Architecture

### Loop 1: Servicer Content Loop (Primary, Phase 2)
```
Servicer completes profile → Marketing Asset Generator produces branded graphic
→ Servicer shares to their Facebook network → Their contacts see Serbizyu
→ Some become buyers → Book the servicer → Escrow release → Servicer gets paid
→ Servicer completes more profiles (reciprocity) → More assets generated
```

**Metric:** % of new buyers attributed to servicer-shared content (via UTM or referral code).

### Loop 2: Buyer Referral Loop (Phase 3)
```
Buyer books service → Work completed → Escrow released → Review prompted
→ Review published → Buyer's contact sees review on servicer's shared content
→ Contact books → Referral credit to original buyer → Buyer books again
```

**Metric:** K-factor (invites per user × conversion rate). Target: >0.3 by Phase 3.

### Loop 3: Cross-Category Expansion Loop (Phase 3)
```
Tricycle driver completes ride → Passenger needs plumbing → Driver refers plumber
→ Plumber completes job → Passenger refers both to neighbor
→ Platform becomes the default "who do I call" for the barangay
```

**Metric:** % of bookings from cross-category referral within same town.

### Loop 4: Content SEO Loop (Phase 2)
```
New listing created → Snapshot rendered → Schema.org markup added
→ Google indexes → Local search traffic → New buyer books
→ Listing gets review → Higher ranking → More traffic
```

**Metric:** Organic search bookings as % of total. Target: >20% by Phase 3.

---

## 4. Affiliate & Partnership Matrix

| Partner Type | Model | Revenue Share | Phase |
|---|---|---|---|
| **Servicer affiliate** | Servicer refers another servicer. Both get featured slot for 1 week. | Non-monetary (visibility) | 2 |
| **Buyer referral** | Buyer refers buyer. Both get ₱50 credit on next booking. | Fixed credit | 3 |
| **Local business affiliate** | Sari-sari store, barangay hall, church displays QR code. Owner gets ₱20 per completed booking from their code. | Per-booking bounty | 3 |
| **Cooperative partnership** | Tricycle operators & drivers association (TODA) signs up as a group. Bulk onboarding, cooperative gets dashboard to manage members. | Platform fee discount | 3 |
| **Barangay partnership** | Official partnership with barangay LGU. Serbizyu is the "recommended platform" for local services. | Non-monetary (legitimacy) | 3 |
| **Payment affiliate** | Xendit referral for servicers who sign up for Xendit disbursement account. | Standard Xendit referral fee | 2 |

**Key principle:** Affiliate mechanics are Phase 3+. Don't build a referral system before there's liquidity to refer.

---

## 5. Trust Density Strategy

Trust is not a feature; it's a metric. The strategies below increase completed-order rate and decrease dispute rate:

| Strategy | Mechanism | Metric |
|---|---|---|
| **Escrow as default** | All payments held until buyer confirms. No "pay direct" option in Phase 1. | Completed-order rate |
| **Milestone sign-off** | Buyer approves each Work step before escrow release. Reduces "I never got it" disputes. | Dispute rate |
| **Verification tiers** | More verified = more visibility. Self-reinforcing. | % verified servicers |
| **Response time display** | Servicer's avg response time shown on listing. Creates accountability. | Response time |
| **Review gating** | No public star rating until 3 reviews. Prevents one 5-star from looking like a track record. | Review count per servicer |
| **Dispute transparency** | Dispute rate shown on profile (after 10 orders). Honest signal. | Trust score |
| **Local clustering** | Show "12 completed orders in Candon" not "12 completed orders." Hyper-local proof beats global numbers. | Conversion rate |

---

## 6. Channel-Specific Growth Tactics

### Facebook
- **Group seeding:** Post in local barangay groups (with admin permission). "Looking for a plumber? [Name] is verified on Serbizyu."
- **Boosted posts:** ₱500/week per town, targeted to 25–55, within 10km radius.
- **Servicer takeovers:** Servicer posts their own day using the Marketing Asset. Serbizyu page reshares.

### TikTok
- **"Tricycle diaries":** 15-second clips of rides, set to trending audio. CTA: "Book this driver on Serbizyu."
- **Before/after:** Home services transformation videos.
- **Live booking:** Servicer goes live, takes bookings in comments, Serbizyu bot confirms.

### Messenger
- **Click-to-Messenger ads:** Facebook ad → Messenger conversation → booking.
- **QR codes:** Physical QR on tricycle, shop, barangay hall. Scan → Messenger bot.

### SMS
- **Broadcast:** "Need a plumber? Reply PLUMBER to 22565." (Semaphore shortcode)
- **Status updates:** "Your booking #ABC123 is confirmed. Track: serbizyu.ph/t/ABC123"

---

## 7. Metrics Dashboard (Ops)

| Metric | Definition | Target | Phase |
|---|---|---|---|
| Liquidity | Completed bookings / active servicer / week | ≥2 | 1 |
| Trust density | Completed orders ÷ (completed + disputed) | ≥90% | 1 |
| Repeat rate | % buyers with ≥2 bookings in 30 days | ≥25% | 2 |
| Distribution leverage | % bookings from non-direct channels | ≥30% | 3 |
| Referral K-factor | Invites × conversion rate | ≥0.3 | 3 |
| Channel ROI | Revenue per channel ÷ cost per channel | ≥3x | 3 |

---

*End of Strategy Matrix. Every tactic has a metric. Every metric has a phase. No strategy without a feedback loop.*
