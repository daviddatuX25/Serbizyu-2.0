# Serbizyu — Onboarding Formalization & Agent Incentive Strategy
*Working notes from strategy session, July 2026. For review during BMAD planning phase — candidate for formal decision-matrix entry (D30) once resolved.*

---

## 1. The Core Tension

The PH regulatory report (BIR RR 16-2023, BMBE Act, TRAIN Law) implies a fairly serious formalization stack: BIR registration (Form 2303), Sworn Declarations, BMBE certificates, barangay clearances. But D18 already made the honest call — **requiring TIN before payout would exclude ~90% of provincial servicers.**

Strategy is not to resolve this tension by picking a side. It's to make formalization a **side effect of participation**, not a **gate** to it. Servicers should never feel like they're being asked to "register with the government." They should feel like they're leveling up to earn more — and the paperwork happens to ride along underneath.

---

## 2. BIR Registration — Three Lanes, Not a Gate

Reframe "unregistered" not as a loophole but as the honest, *compliant* default state for most servicers. RR 16-2023's withholding obligation only triggers per-servicer at ₱500K/yr gross remittances — so under that threshold, staying unregistered isn't evasion, it's simply outside the regulation's scope.

| Lane | BIR status | What they can do | What triggers upgrade |
|---|---|---|---|
| **Unregistered / informal** | No 2303, no TIN | List, transact, get paid — cash-weighted, capped transaction/payout volume | Crossing a volume threshold (₱ or bookings/month) |
| **Sworn Declaration tier** | No 2303 required if <₱250K/yr; files annual Sworn Declaration instead | Full listing, full digital payout, **no 1% withholding** | Crossing ₱500K/yr gross remittances |
| **Registered / 2303 tier** | Full Certificate of Registration | No caps, BMBE-eligible, agent-graduation eligible, "Business Verified" badge | — |

**Key messaging shift:** The Sworn Declaration is pitched as *"keep 100% of your earnings"* — never as a BIR filing. This is not spin; it's accurate, since the 1% withholding is calculated net of platform commission and is genuinely close to invisible for micro-servicers. This is the strongest, most honest lever available.

**Open item for BMAD phase:** decide the actual payout cap number for the unregistered lane, and how/when the Sworn Declaration prompt gets triggered in the onboarding flow (at signup? at first payout threshold approach?).

---

## 3. Formalization Riding on the Trust Ladder

Map each D26 verification tier to the regulatory box it quietly checks. Servicer-facing copy never mentions the backend rationale.

| Servicer sees | Actually happening underneath |
|---|---|
| "Complete your profile, get more bookings" | Phone + ID verification (Tier 1–2) |
| "Get the Trusted badge, rank higher in search" | Barangay clearance (Tier 3) — also satisfies BMBE's LGU registration step |
| "Unlock featured slots + lower fees" | BMBE Certificate of Authority — sold as a discount unlock, not a tax form |
| "Avoid losing 1% of your payout" | Sworn Declaration — 2-minute form framed as a savings action |

---

## 4. Stigma — Two Different Frictions, Two Different Fixes

1. **Administrative friction** (forms, not understanding what BMBE/BIR/COR mean) → solvable with UX: agent-assisted forms, pre-filled templates.
2. **Cultural/psychological friction** (deliberate avoidance of visibility to authorities, distrust, past bad experiences) → **not** solvable with better copy. Only solved by trust transference — a known community member (the agent) vouching for the process, and early servicer testimonials showing "nothing bad happened, I just earn more now."

Agent scripts and training should be built explicitly around this: **never lead with compliance language, always lead with earnings.**

---

## 5. Agent Model — Single Independent Track, Incentive-Tiered

Decision: **no employee fork.** Avoid DOLE misclassification risk entirely (rather than manage it) by keeping every agent tier commission-based and outcome-based, never schedule-based or supervision-based. This preserves the independent-contractor test from D19: agent controls own schedule, own methods, no exclusivity, no platform-directed process.

| Tier | Requirement | Incentive | Contractor-safe? |
|---|---|---|---|
| **Bronze** (entry) | Tier 3 verification, first owner onboarded | 10% commission (D19 default) | ✅ default state |
| **Silver** | 10+ owners managed, 3mo active | 11–12% commission + featured agent badge | ✅ commission-based only |
| **Gold** | 50+ owners, low dispute rate | 13–15% commission + priority access to new territory/categories + graduation bonus multiplier boost | ✅ performance-based, not schedule-based |
| **Platinum** | Top percentile, sustained volume | Highest commission band + can sub-recruit other agents (own mini-network) | ✅ *as long as* Platinum agents don't supervise sub-agents' methods |

**Guardrail:** If a Platinum agent starts training/supervising sub-agents in a way that resembles management, keep it framed as **peer mentorship for a referral bonus**, never oversight. The moment Serbizyu (or an agent acting as Serbizyu's proxy) dictates *how* someone works, the independent-contractor shield weakens. Every tier's incentive must stay tied to **outcomes** (owners onboarded, disputes low, volume high), never to **process compliance**.

**Best-performing agents as future hires:** if/when Serbizyu wants an in-house ops layer, treat that as a **separate hiring decision** sourced from the top of the agent pool — not a "graduation" within the same contractor relationship. Keeps the contractor pool underneath legally clean. (Deferred — not part of current strategy, noted here only so it isn't rediscovered as a problem later.)

---

## 6. The Underlying Principle

Same move applied twice:

> Don't ask people to *become* compliant, formal, or managed. Build the system so that pursuing what they already want — more bookings, more income, more trust — *is* the path that happens to produce compliance and quality, as a side effect rather than a demand.

---

## 7. Open Items for BMAD Phase

- [ ] Set actual payout cap (₱ and/or transaction count) for the unregistered lane
- [ ] Decide Sworn Declaration trigger point in onboarding flow
- [ ] Draft agent script guidelines (earnings-first, compliance-invisible language)
- [ ] Formalize this as decision-matrix D30 once thresholds are set
- [ ] Define what "low dispute rate" and "sustained volume" mean numerically for Gold/Platinum agent tiers

---

*End of working notes.*
