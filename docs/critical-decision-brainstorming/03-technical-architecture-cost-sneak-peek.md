# Serbizyu — Technical Architecture & Cost Sneak-Peek
*Pre-architecture scan, July 2026. Not a substitute for the formal BMAD Solutioning phase (architecture spine, ADRs) — this is a directional check: is the D1–D16 stack still right, and what does Phase 1 actually cost to run.*

---

## 1. Verdict Up Front

The original stack (D1–D16) holds up well. Nothing in it is stale or wrong. Two things are worth re-opening given what's shipped since:

1. **Laravel Cloud has gotten materially cheaper and more relevant** since D2 dismissed it in favor of Forge+VPS. Worth a second look, not necessarily a switch.
2. **Everything else in the cost stack (search, maps, AI) fits comfortably inside free tiers at Phase 1 volume.** The Candon pilot is cheap to run — cheaper than the original ~$24–40/mo estimate suggested, once you actually itemize it.

Nothing here overrides a resolved decision. Flagging for the architect-phase re-litigation, not changing course today.

---

## 2. The Stack (as resolved, D1–D16)

| Layer | Choice | Status |
|---|---|---|
| Backend | Laravel 12 / PHP 8.3 | ✅ current, no change |
| Frontend | Inertia + React + TypeScript | ✅ current |
| UI kit | shadcn/ui (New York style) | ✅ current |
| Database | PostgreSQL 16 (JSONB for Work Instances, Offer attributes) | ✅ current |
| Cache/Queue | Redis | ✅ current |
| Search | Meilisearch | ✅ current, see cost note §4 |
| Realtime | Laravel Reverb (self-hosted, Pusher-protocol compatible) | ✅ current |
| Maps | Mapbox GL JS + Geocoding API | ✅ current, see cost note §4 |
| Payments | Xendit (xenPlatform, sub-accounts + split rules) | ✅ current, per spike report |
| SMS/OTP | Semaphore | ✅ current, per spike report |
| AI | OpenRouter (model-agnostic proxy) | ✅ current, see §5 |
| Testing | Pest (backend) + Vitest/RTL (frontend) + Playwright (e2e) | ✅ current |
| Hosting | Laravel Forge + DigitalOcean droplet | ⚠️ re-examine, see §3 |

---

## 3. Hosting: Forge+VPS vs. Laravel Cloud — worth reopening

**D2's original call:** Forge + $24/mo DigitalOcean droplet (4GB/2vCPU), self-hosted Reverb, because Laravel Cloud's managed Reverb premium wasn't worth it at Phase 1 traffic, and Forge gives explicit control over Postgres/Redis/Meilisearch versions.

**What's changed:** Laravel Cloud shipped a genuinely different pricing model in June 2026 — Scale-to-Zero Flex compute (idle apps stop billing, wakes in <500ms) plus a new **$5/mo Starter tier** with $5 in included usage credits and hard spending caps (you set a ceiling; compute pauses at 100%, no surprise bills). That directly answers the two objections that made D2 pick Forge: cost unpredictability and paying for idle capacity.

**Still true in Forge's favor:** you retain exact version control over Postgres/Redis/Meilisearch, and self-hosted Reverb on the same box avoids any managed-Reverb premium entirely. For a single-town pilot with modest, spiky traffic (bookings cluster around specific hours), Scale-to-Zero is attractive precisely because Candon-scale traffic *is* spiky — most of the day the app would legitimately be near-idle.

**Recommendation for architect phase:** don't decide this from a spec doc — run the actual cost comparison once Sprint 0 infra is being stood up, using real expected request patterns. Rough shape of the comparison:

| | Forge + DO Droplet | Laravel Cloud (Starter/Growth) |
|---|---|---|
| Base cost | $24/mo (4GB droplet) flat | $5/mo + usage (scales down when idle) |
| Reverb | Self-hosted, included | Managed, may cost extra depending on tier |
| Postgres | Self-managed on same box | Serverless Postgres available, separate line item |
| Ops burden | You patch/monitor/scale | Fully managed |
| Spending predictability | Fixed and simple | Capped via spending limits (new as of June 2026) |

Net: Forge is still defensible and D2's rationale isn't wrong, but "Laravel Cloud is expensive and unpredictable" — the reason it lost in D2 — is no longer accurate as stated. This is a genuine re-open, not a foregone re-litigation. Suggest capturing as a review-trigger note on D2 rather than deciding now.

---

## 4. Phase 1 Monthly Cost Table (Candon pilot, single town)

Assuming the actual D22/D23 pilot shape: 20–30 servicers, ~50 bookings/week, single-town traffic.

| Item | Cost | Notes |
|---|---|---|
| VPS (Forge + DO droplet, 4GB/2vCPU) | $24/mo | Runs app, Postgres, Redis, self-hosted Reverb, self-hosted Meilisearch — all on one box at this scale |
| Meilisearch | $0 | Self-hosted on the same droplet; Cloud tier ($30/mo) is unnecessary until search volume is much higher |
| Mapbox | $0 | Free tier: 50K map loads + 100K geocoding/directions requests per month. Pilot volume is nowhere close |
| Xendit | Transaction-based only | No platform fee at this volume beyond per-transaction processing (~1.5–3% + ₱11 per Xendit spike report); no fixed monthly cost |
| Semaphore SMS/OTP | ~₱1,250–2,500/mo (~$22–45) | Based on spike report's OTP volume estimate at 1,000 OTPs/mo; scales with signups, not bookings |
| OpenRouter (AI captions, template drafting) | ~$20–50/mo | Assistive only (caption drafts, FAQ triage); low token volume at Phase 1, human-approved before publish |
| Domain + SSL | ~$1–2/mo | Standard registrar cost, SSL via Let's Encrypt (free) |
| **Total estimated Phase 1 run cost** | **~$70–145/mo** (₱4,000–8,200/mo) | Excludes one-time costs below |

**One-time / setup costs (not monthly):**
- Semaphore account approval + sender name registration: free, but takes days — must be filed in Phase 0
- Xendit xenPlatform onboarding: negotiate pricing directly per the spike report; budget ₱50,000–100,000 for PH fintech counsel consultation before scaling past ₱500K/mo GMV (per D8)
- App Review for Facebook/Messenger permissions (`pages_messaging`, `pages_manage_posts`): free but 1–4 weeks lead time, file early

This is a genuinely cheap pilot to run. The dominant recurring costs are SMS (OTP + notifications) and AI, not infrastructure — which tracks with a marketplace whose real cost driver is trust-building (verification, notifications) rather than compute.

---

## 5. AI Provider — still OpenRouter, worth a proportionality check

D13 chose OpenRouter for model flexibility and failover. Still the right call for Serbizyu's actual AI usage pattern: caption drafting, FAQ triage, WorkflowBuilder tier-3 template drafting — all assistive, all human-approved, none latency-critical or high-volume. No reason to lock into a single provider's API directly at this stage. Nothing here changes; flagging only because Q asked to re-check.

One practical addition for architect phase: since all AI output is draft-only with mandatory human approval (per D13's own guardrail), token cost stays low regardless of which underlying model OpenRouter routes to — this isn't a place where model choice meaningfully swings the cost table above.

---

## 6. What Actually Needs Deciding in Solutioning Phase (not now)

Flagging these as genuine open items for when BMAD reaches architecture spine / ADR work — not resolved here:

1. **Forge vs. Laravel Cloud** — run the real comparison with Sprint 0 traffic assumptions (§3).
2. **Reverb scaling threshold** — D12 already flags this: if concurrent WebSocket connections exceed ~500 or ops time exceeds 2hrs/week, move Reverb to its own droplet or reconsider managed.
3. **Xendit negotiated pricing** — public rates (~7.5% all-in per the escrow spike) are a ceiling, not the real number. Get PH sales pricing before finalizing unit economics in the deck.
4. **Kiosk hardware procurement** — Phase 2 concern (offline-deal-spec §9), Android tablet ~₱8,000–12,500 per kiosk, not urgent for Phase 1 but worth budgeting ahead of Sprint 14.
5. **GPS auto-advance threshold tuning** — per the spike report, 800m (not 500m) with 3-sample debounce is the recommended default; needs the 3-driver pilot validation before hardcoding.

---

*End of technical sneak-peek. Formal architecture spine, ADRs, and epic/story breakdown belong in the Solutioning phase proper.*
