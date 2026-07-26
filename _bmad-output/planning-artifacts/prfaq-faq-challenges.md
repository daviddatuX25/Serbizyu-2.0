# Serbizyu — PRFAQ: FAQ Challenge Record

> BMAD Phase 1: Analysis — Working Backwards Ceremony  
> Facilitated: July 25, 2026  
> Purpose: Pressure-test the concept through 5 hard questions. Founder answers captured verbatim in facilitated dialogue. Each answer sharpens the concept for the downstream PRD.

---

## Challenge 1 — Trust & Fraud: Cash Dispute Resolution

**The Question:**

The platform handles cash transactions mediated by agents and kiosk partners. A buyer hands ₱5,000 cash to a sari-sari store kiosk for a construction downpayment. The kiosk owner claims they never received it. The buyer says they did. There's no digital trail — just two people and a paper receipt. How does Serbizyu resolve this without becoming a he-said-she-said court?

**Founder's Answer (captured from facilitated dialogue):**

The trust layer has two tiers. Primary: kiosk footage if available — but 24/7 video is not mandated because it's expensive and impractical. The real enforcement mechanism is the receipt. If the kiosk issued a receipt, the kiosk is liable. If the buyer has a receipt, they have proof. The receipt IS the trust anchor. Disputes also carry an expiration window — if nobody raises it within a defined number of days, the transaction stands. Clean, practical, doesn't require surveillance infrastructure.

Additional safeguards: the platform can later formalize terms and procedures for dispute artifact collection. For now, the receipt-as-liability model provides a workable trust layer without mandating costly persistent video footage.

**PRD Implications:**
- Receipt issuance must be auditable (kiosk receipt has a unique ID, timestamp, amount, parties)
- Dispute expiration window must be configurable
- Kiosk partners accept liability terms as part of onboarding
- Tiered evidence model (receipt = primary, video = bonus, no evidence = burden falls on the party that should have provided it)

---

## Challenge 2 — Unit Economics: Why Pay 25% When Facebook Is Free?

**The Question:**

Your commission is 15% platform + 10% agent = 25% off the top from the servicer. A tricycle ride costs ₱50. A haircut costs ₱100. At those price points, 25% means the servicer takes home ₱37.50 or ₱75. Meanwhile, Facebook Marketplace is free. Why would a provincial micro-servicer — who already operates on thin margins — voluntarily give up a quarter of their earnings?

**Founder's Answer (captured from facilitated dialogue):**

Three answers layered together:

1. **External cash bypasses the platform cut.** The 25% only applies to digital escrow transactions. Cash deals between buyer and servicer don't flow through the platform's revenue share (though they may still use the platform for discovery, listing, and receipt tracking). The platform supports external cash payment as a first-class option.

2. **Compliance as value-add.** Facebook Marketplace has no BIR compliance, no dispute resolution, no consumer protection. Serbizyu provides legal legitimacy. For servicers who want to grow beyond informal, that's worth the fee. Facebook sometimes operates in a legal gray area for service listings; Serbizyu provides a compliant path. The platform also supports users who are not fully onboarded on the legal ladder — they understand the trade-off: less compliance in exchange for less reach/protection.

3. **Configurable rates.** The 75/10/15 split is not hardcoded. It's an admin-configurable parameter that can be adjusted per tier, per category, per province. The system is built to adapt, not to lock in a single economic model. Additionally, a platform boost/advertising feature will let servicers pay for enhanced visibility — a marketing model that can fund traction per province (e.g., one marketing account per province division).

**PRD Implications:**
- Commission split must be an admin-configurable parameter, not hardcoded
- Category-level subsidy overrides (some categories at 0-3% to drive adoption)
- Cash transactions tracked separately from digital escrow transactions
- Boost/advertising feature on the roadmap as a revenue diversification mechanism
- Formalization ladder incentivizes moving up: higher compliance = lower effective fees + higher trust badge

---

## Challenge 3 — Agent Quality & Abuse: Fake Servicer Fraud

**The Question:**

You're recruiting local agents — potentially hundreds across Ilocos Sur. One agent signs up 30 fake servicers, creates fake listings, generates fake transactions with fake buyers, and collects 10% commissions on phantom deals until the fraud is detected. How does the platform prevent this at scale, especially when many servicers are offline and SMS-based, making real-time verification difficult?

**Founder's Answer (captured from facilitated dialogue):**

Layered defense, not a silver bullet:

1. **Real government ID validation** — every agent and every owner must pass identity verification at onboarding. This is the primary gate.

2. **Anti-fraud detection research** — maximize available anti-fraud technologies and integrate them progressively. Start with manual flagging and review, then progressively automate as patterns emerge, then continuously improve: detect → review → automate → repeat.

3. **Platform-side validation even for SMS-unreachable owners** — even if an owner can't be reached via SMS, the platform can validate on its side. Warning messages can be sent for non-renewal of verification.

4. **Long-term loop** — acknowledge it's a long battle, not a solved problem on day one. The system improves as data accumulates and fraud patterns are identified.

**PRD Implications:**
- Government ID validation at agent and owner onboarding (mandatory)
- Manual fraud review queue in admin dashboard
- Automated flagging rules (velocity checks, anomalous commission patterns)
- Agent tier progression tied to dispute rate (<2% for Gold tier)
- Warning/reminder system for verification renewal
- Audit trail for all agent-owner relationships

---

## Challenge 4 — Adoption Chicken-and-Egg: Breaking the Cold Start

**The Question:**

You launch in Tagudin with zero servicers and zero buyers. A buyer opens the app, searches for "plumber," and sees nothing. They close the app and never return. A servicer creates a listing, waits two weeks with zero bookings, and goes back to Facebook word-of-mouth. What is the specific, concrete plan to break this deadlock in the first 30 days — before you have any network effects to lean on?

**Founder's Answer (captured from facilitated dialogue):**

It's mostly a marketing strategy from the start. The concrete plan: in-house trained agents who do the adoption work. These are not passive listings waiting to be discovered — the platform invests in people whose job is to onboard servicers and buyers. They go into the community, they build the supply side, they create the listings that make the app worth opening.

Marketing spend is directed at human-powered adoption, not ad campaigns. This is an investment in the future — the agent network becomes the flywheel that powers adoption. The agents themselves create the initial supply density that attracts buyers.

**PRD Implications:**
- In-house agent onboarding and training workflow
- Agent dashboard for managing multiple servicers
- Initial curated batch of 10-15 servicers personally recruited in Tagudin
- Zero platform commission for first 30 days to remove adoption friction
- Barangay captain referral channel for additional servicers
- Focus metric: retention and liquidity per active servicer, not signup volume

---

## Challenge 5 — Execution Risk: Building Too Much With Too Little

**The Question:**

You're building four commerce primitives, 10 fulfillment archetypes, a Human Agent Network, My Space connectors, Serbi AI assistant, SMS integration, QR fountain code streaming, double-entry escrow, a 3-lane tax ladder, offline PWA sync, and kiosk partner stations — all on a ₱4,000–₱8,200 monthly budget with a student team on a 12-week academic timeline. What is the single biggest technical risk that could cause this to collapse, and what's your plan B if it does?

**Founder's Answer (captured from facilitated dialogue):**

The reality of this phase is to develop the robust and working system. Later on, real capital, real spending, and in-depth studies will enable the team to be dauntless in facing operational risks. The approach now:

1. **All efforts will be tried** — no single point of failure is allowed to stop progress. If one approach doesn't work, pivot to another.

2. **Buffer budget** — not just upfront costs but emergency reserves and long-term maintenance planning. Don't spend to zero.

3. **Build the foundation solid** — when real operations begin, preparation (emergency budgets, maintenance plans, research-backed decisions) is what makes the team dauntless.

The focus of this phase is system completeness — building the robust, working foundation. Real-world scaling risks (capital, operations, regulatory) are faced later with preparation, not avoided.

**PRD Implications:**
- Scope fence: Tagudin pilot only. No geographic expansion during academic timeline
- 10 fulfillment archetypes designed but only 4 presets (A1, A3, A4, A9) needed at launch
- Serbi AI: cloud-only via Laravel AI SDK, no self-hosted model complexity
- Infrastructure: single VPS, self-hosted services (no SaaS dependencies that bloat budget)
- All commission rates, category configs, and tier thresholds are admin-configurable — no hardcoding
- Schema designed for all primitives from day one; features built incrementally

---

*FAQ Challenge Record complete. All 5 challenges explored with founder. Answers feed directly into PRD sections: Trust & Safety, Revenue Model, Agent Architecture, Go-to-Market Strategy, and Scope Boundaries.*
