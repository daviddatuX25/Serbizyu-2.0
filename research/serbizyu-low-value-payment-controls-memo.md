# Serbizyu — Low-Value Payment & Financial-Control Contracts (Removing Hard Digital Minimums)

**Date:** 2026-07-31
**Status:** Subagent analysis for founder/planning review — supports, never replaces, the pre-implementation audit's payment gates (P0-10, P0-11, P1-4, P1-5, P1-14).
**Scope:** What must be true, contractually, before the PRD's payment section can safely drop hard digital minimums and admit ₱50–₱100 digital errands. Requirements and edge cases only — no implementation code.

---

## 0. What "removing hard digital minimums" actually means

- The PRD today has **no locked digital order minimum** (§4.2 only has a ₱5 listing-price floor for spam control). The ₱500 provisional digital minimums live only in `serbizyu-xendit-payment-economics-2026-07-31.md` as a *provisional* lead-architect recommendation.
- The founder's decision is: do **not** adopt a hard ₱500 floor that excludes ₱50–₱100 errands.
- **The risk is not the number — it is that removing the floor makes every micro-order a money-losing or abuse-prone event unless the fee, payout, refund, and control contracts are closed.** A hard minimum is a blunt substitute for contracts that don't exist yet. The safe edit replaces the minimum with: (1) closed per-mode fee contracts, (2) a **dynamic affordability guard** (config-driven), and (3) explicit sandbox-vs-live gates.

### Verified micro-order economics (GCash via Xendit, from 2026-07-31 pricing research)

| Order | Mode | Buyer total (grossed up) | Uplift vs quote | Why |
|---:|---|---:|---:|---|
| ₱50 | Direct digital (2% min ₱5) | ₱68.04 | +36% | gateway 3% + ₱11 dominates |
| ₱50 | Tiwala (5% min ₱25) | ₱88.66 | +77% | ₱25 protection minimum |
| ₱100 | Direct digital | ₱119.59 | +20% | gateway ≈ ₱14.43 |
| ₱100 | Tiwala | ₱140.21 | +40% | protection min still binds |
| ₱500 | Direct / Tiwala | ₱537.11 / ₱552.58 | +7% / +11% | minimums stop binding |

Plus: payout costs a **minimum ₱26** (1% min ₱15 + ₱11) per disbursement — more than half a ₱50 order. Fixed gateway fees are **not recovered on refunds** (verified fact). Conclusion: at ₱50–₱100 the all-in digital burden is 20–77%. Removing the minimum without a fee-bearer decision does not create adoption; it creates sticker shock or silent platform losses.

**Safe-edit principle:** the PRD should lock *no hard minimum*, but require that any digital order below a configurable economic floor is either (a) blocked from digital and routed to cash, or (b) accepted only when the fee contract absorbs the cost with an explicit subsidy budget. The floor is computed, not legislated: *"block digital when all-in fee burden > X% of order value (admin-configurable, default ~15%); below that, allow."*

---

## 1. Money-Event Contract (minimum viable catalog)

Every money event must be defined: trigger, external (Xendit) state, internal order transition, journal lines, one stable idempotency key per business operation, reversal event, failure handling, reconciliation rule. Minimum viable events to admit micro digital:

| # | Event | Minimum viable requirement | Micro edge cases |
|---|---|---|---|
| MV-1 | Payment succeeded | Webhook authenticated (signature/token), payload verified against expected object/amount/currency/account **before** any state change; amount recorded is the **actual collected total**, not the quoted amount | Gross-up mismatch: quoted ₱50 vs collected ₱62.89 — ledger must post actual; provider payable must be computed from the quoted base, fees from the collected total |
| MV-2 | Fee capture | One server-side fee engine (never client-side) computes gateway, platform, protection, agent fees; snapshot to order row; rounding owner defined (platform absorbs residual centavo) | ₱50 order: gateway ₱12.89 vs Tiwala min ₱25 — which fees apply at which amount must be config, and the config must be snapshotted (ADR-011 pattern) |
| MV-3 | Release (Tiwala) | Release clock starts at authorized completion/sign-off, never order creation; release requires no open dispute + concurrency-safe transition (P0-2) | Micro orders with no sign-off discipline (tricycle ride) — need a lightweight completion signal or auto-release policy with buyer-silence default |
| MV-4 | Refund | Full/partial, fee-loss rule, split reversal, idempotent, webhook-reconciled (see §4) | Refund of ₱50 after ₱12.89 gateway fee already paid |
| MV-5 | Payout batch | Batch created/processed/completed/failed with retry; payout fee allocation snapshotted (see §3) | ₱26 minimum payout fee vs ₱45 provider balance |
| MV-6 | Cash receipt | Dual confirmation; **no ledger money movement in pilot** (see §6) | One party never confirms; conflicting confirmations |
| MV-7 | Dispute hold/resolve | Hold freezes release; resolution posts release or refund | Micro-dispute admin cost exceeds order value (see §7 fast path) |
| MV-8 | Chargeback | External reversal from card channel; posts reversal + negative-balance handling | Buyer pays by GCash tied to stolen account; provider already paid out |
| MV-9 | Correction | Immutable ledger; corrections are offsetting entries | — |

**Edge cases that must be specified before any micro-digital go-live:** out-of-order webhooks (succeeded arriving before hold); duplicate webhook delivery (idempotency key on the event, not the attempt — P0-12); payment succeeded but order already cancelled (auto-refund path); partial completion on a micro order (prorated release); provider paid out before a refund arrives (clawback/negative balance).

**Sandbox gate:** MV-1…MV-9 can run on Xendit TEST keys with fake balances — the ledger, state machine, and idempotency are the academic deliverable and must be built. What is **not** sandbox-required: economic closure (no real loss), real KYC, legal fee passing.

---

## 2. Fee-Display Contract

Rationale: at micro amounts the buyer total can exceed the quote by 77%. Undisclosed uplift at this scale is both a consumer-protection risk (DPA/consumer act exposure flagged in the audit) and a trust-killer in a cash-first market.

| # | Requirement | Micro edge cases |
|---|---|---|
| FD-1 | **Full itemized total before confirmation, every digital order**: quoted amount + gateway fee + platform fee + protection fee + agent fee (if any) + payout note. Server-computed and snapshotted. | ₱50 quote → "You will pay ₱88.66 total" must render pre-confirm, not at receipt |
| FD-2 | Cash mode shows **no** gateway/protection fee (nothing is collected by platform in pilot) | Mixed-mode confusion: agent tells buyer "₱50 lang" but checkout says ₱68 — display must match the mode actually selected |
| FD-3 | Payout cost disclosed at withdrawal time with the batch fee allocation (who bears it) | Early-withdrawal fee must be shown before the request commits |
| FD-4 | Fee bearer must be a founder decision per mode, written in the PRD: buyer-pays (gross-up) vs provider-deducts vs platform-subsidizes | Subsidy mode needs a visible budget and cap (see §7) |
| FD-5 | Promo/0% periods display the ₱0 fee explicitly (no surprise later) | 30-day ₱0 promo then fees resume — checkout must reflect current config, not promo memory |
| FD-6 | **Legal gate:** written Xendit confirmation that gateway costs may be separately passed to buyers and how they must be displayed (research §6.2) | Only blocks live-money; sandbox can display freely |

**Minimum viable:** FD-1 + FD-2 + a server-side total that is the single source for checkout, receipt, and ledger. Everything else follows.

---

## 3. Payout-Batching Contract

Verified fact: every disbursement costs ≥ ₱26. Per-order payout of micro orders is financially absurd; batching is mandatory, not optional.

| # | Requirement | Micro edge cases |
|---|---|---|
| PB-1 | Balances accumulate; scheduled payout on a fixed cadence (provisional: weekly) AND automatic threshold (provisional: ₱1,500) — both admin-configurable | Provider earning ₱45/week never crosses threshold — cadence must still pay them out |
| PB-2 | Early withdrawal allowed only with disclosed cost; fee bearer explicit | ₱26 fee on a ₱100 early withdrawal = 26% — display this before commit |
| PB-3 | **Batch fee allocation defined and snapshotted**: pro-rata by amount, or per-withdrawal fee, or platform absorbs. One order must never silently absorb a whole batch's cost (audit P1-4). | 10 × ₱50 orders batched = ₱500; if pro-rata, each order bears ₱2.60; if per-withdrawal, ₱26 total. Pick one, snapshot it |
| PB-4 | Dormant small balances: define floor + aging (e.g., pay out at threshold or quarterly sweep) and closure-time payout | Provider deletes account with ₱12 balance — payout costs more than balance; options: sweep to GCash at platform cost, or donate/forfeit with disclosure |
| PB-5 | Payout idempotency per batch (one key per disbursement), retry on failure, reconciliation vs Xendit disbursement status | Partial batch failure: some orders paid, some not — retry must not double-pay |
| PB-6 | Negative balances: provider owes from refund/chargeback; settle against future earnings or block further digital orders (Grab wallet-deduction pattern) | ₱50 order refunded after ₱45 balance paid out → −₱5; next earnings first clear the deficit |
| PB-7 | Destination changes require fresh consent (audit P1-2: owner funds vs agent commission are different owners) | Agent withdrawing own commission vs owner's funds — different balances, different consent rules |

**Minimum viable for live money:** PB-1 + PB-3 + PB-5 + PB-6. Sandbox: batch trivially or per-order (fake money); the batching UI can be demonstrated but economics need not be enforced.

---

## 4. Refund Contract

Audit P0-11: REQ-PAY-08 promises full/partial refunds without limiting to Tiwala; Direct Payment is labeled categorically non-refundable without legal basis. At micro scale, refunds must be cheap, rule-driven, and fee-loss-aware.

| # | Requirement | Micro edge cases |
|---|---|---|
| RF-1 | **Refund authority matrix per mode**, written in the PRD: Tiwala = platform authority (funds in custody); Direct digital = provider agreement or admin dispute ruling required (funds may already be provider-controlled — "NOT refundable" as a blanket is unsupportable); Cash = platform never holds or refunds cash (mediation only) | Micro orders: make this a lookup table, not judgment calls |
| RF-2 | Fee-loss rule: original gateway fee is not recovered (verified fact) — define who eats it (platform absorbs as cost of trust, or prorated) | ₱50 Tiwala refund: gateway ₱12.89 already paid; protection fee ₱25 — full refund to buyer means platform absorbs up to ₱37.89 per refund. Must be a priced decision, not an accident |
| RF-3 | Partial-refund formula: proportional reversal of provider, agent, platform, protection lines; rounding owner defined | 60% completion on ₱100 → release ₱60-adjusted, refund remainder, reverse agent ₱6 share — agent fee reversal must be explicit (audit P1-5) |
| RF-4 | Refund idempotency + webhook reconciliation; a successful refund API call ≠ money in buyer's wallet (verified fact) — show pending state | Refund of a refund (duplicate admin click) must be a no-op |
| RF-5 | Refund-after-release: clawback path or provider consent; negative balance handling | ₱50 order: provider already paid ₱45; full refund → provider negative or platform eats ₱45 — decide the rule |
| RF-6 | Pre-start cancellation = full refund minus non-recoverable gateway fee, configurable cancellation fee to provider | Same-day micro booking cancelled in 5 minutes — fee economics still apply |
| RF-7 | Manual ops path when automated reversal is unavailable (audit P0-8: ops console with refund workflow + immutable operator reasons) | Live-money only; sandbox may simulate |

**Minimum viable for live money:** RF-1 + RF-2 + RF-4 + RF-5. Sandbox: any refund flow with fake balances; legality gates not required.

---

## 5. Agent-Fee Contract

Audit P1-5: the 80/10/10 split vs a 10→15% ladder is not mathematically closed (who absorbs the higher tier share?); graduation bonus has no funding source. At micro scale the agent fee is tiny but still must be exact and reversible.

| # | Requirement | Micro edge cases |
|---|---|---|
| AF-1 | Agent rate snapshotted at order creation (ADR-011 pattern); tier deltas (Bronze 10% → Platinum 15%) — the extra share's funding source (owner vs platform) must be a written decision | ₱50 order: 10% = ₱5 agent fee — exact rounding matters; no minimum agent fee unless the founder prices agent-managed micro orders as uneconomical (then default them to direct/cash) |
| AF-2 | Agent fee reverses on refund/partial refund, prorated | ₱50 refund → reverse ₱5 agent line; if agent already withdrew it, agent balance goes negative |
| AF-3 | **Cash agent compensation is outside platform custody during pilot** — no receivable, no guaranteed platform collection (provisional Mode A; audit P0-11) | Cash micro errands are the dominant case; don't accrue agent payables with no collection path |
| AF-4 | Agent payouts share the batching contract (PB-1…PB-7); agent's own commission withdrawal is not owner-gated (recent ADR-010 decision) — owner notified after the fact | Agent balance of ₱40 — batched with the same ₱26 fee economics |
| AF-5 | DOLE classification unchanged (independent contractor); no hourly/method control claims in any fee copy | — |

**Minimum viable for live money:** AF-1 + AF-2 + AF-3. Sandbox: split math can be demonstrated with any rates.

---

## 6. Cash-Receipt Contract

Cash is the dominant Tagudin mode; micro errands will be overwhelmingly cash. Audit P0-11/P1-10: no receivable/collection/delinquency story; §4.1 says 8% cash platform rate while the Phase-1 FAQ says cash bypasses the platform cut — a contradiction that must be resolved before the PRD edit.

| # | Requirement | Micro edge cases |
|---|---|---|
| CR-1 | **Cash platform fee decision, explicit**: provisional recommendation is ₱0 during pilot with **no receivable accrual** (platform recognizes no revenue it cannot collect). If a fee is charged, it needs a real collection path (deduct from future digital earnings — Grab pattern), not an accrual | ₱50 cash errand × 8% = ₱4 receivable, uncollectible in practice; accruing it creates fake revenue (P0-11 risk) |
| CR-2 | Dual confirmation (buyer "paid" + provider "received"), timestamped; default rule if one party doesn't confirm within 24–48h (cash research); conflicting confirmations escalate to dispute with evidence | ₱50 ride: full dual-confirm flow is two taps — keep it; don't build a heavyweight flow per amount |
| CR-3 | Receipt generated for every cash transaction (REQ-PAY-05): order ref, both parties, amount, mode, timestamps, confirmation status; downloadable and SMS-deliverable | Receipt-as-liability model (dispute expiration window, §4.2) — receipt text must state what it does and doesn't prove |
| CR-4 | Receipt/evidence privacy: no faces in receipt photos, no unnecessary PII (NPC; cash research) | Provider photos of money handover — guide to crop/avoid faces |
| CR-5 | High-value threshold (₱5,000, admin-configurable) triggers extra confirmation | Below-threshold micro cash needs nothing extra |
| CR-6 | Dispute remedy for cash: mediation + evidence + reviews only; platform never promises refund custody (provisional Mode A) | "I paid ₱50, driver didn't show" — mediation path with receipt evidence, no platform money movement |

**Minimum viable for live money:** CR-1 + CR-2 + CR-3. Sandbox: receipt generation and dual confirm are demo features — build them; fee/collection economics are not required.

---

## 7. Abuse-Control Contract

Removing minimums lowers the cost of every abuse vector. These are the controls that make micro-digital safe:

| # | Control | Micro edge case |
|---|---|---|
| AC-1 | Velocity limits: per-user caps on orders/hr, digital orders/day, refunds/day — admin-configurable | ₱50 digital order spam to farm verified reviews (REQ-TRU-02 needs 3 reviews) |
| AC-2 | Self-dealing detection: buyer≈provider (same phone/device/GCash), collusive order pairs | Two-account churn to manufacture trust history or move money between GCash accounts |
| AC-3 | Refund abuse: repeated non-delivery claims on micro orders → flag + low-value fast path (below configurable ₱X: first-claim auto-refund with evidence, repeat claimants escalated) | Admin cost of investigating ₱50 disputes exceeds the refund — rules must replace investigation at micro scale |
| AC-4 | Structuring/laundering: off-platform value with on-platform ₱5–₱50 payment rail (price-evasion), cash-in/cash-out via refunds (pay digitally, get cash "refund") — flag velocity + amount patterns | Listing at ₱5 digital while ₱500 changes hands off-platform |
| AC-5 | Subsidy budget: if any mode is subsidized (platform absorbs gateway/payout/refund fees), there is a per-day budget, per-user cap, and kill switch — otherwise micro churn drains the platform | ₱0-fee promo + micro orders = unbounded subsidy |
| AC-6 | Kill switch: feature flag disables digital payments platform-wide and per-user (audit P0-7/P0-8) | Instant freeze on fraud pattern without code deploy |
| AC-7 | Chargeback/GCash-fraud: stolen-account payments; require verification tier before digital (Identity Verified already gates listings) | Provider pays out before chargeback arrives → negative balance (PB-6) |
| AC-8 | Agent farming: already gated (concurrent-owner limits per tier, REQ-AGT-10) — extend velocity checks to agent-created orders | Agent onboarding many owners to funnel micro orders |

**Sandbox vs live:** sandbox needs only AC-6 (kill switch is cheap) and basic velocity to demo the pattern. AC-1…AC-5 and AC-7 are live-money gates — do not move real money without them.

---

## 8. Sandbox vs Live-Money Requirements (summary gate table)

| Contract | Academic sandbox (capstone, TEST keys, fake money) | Live money (real pesos, real custody) |
|---|---|---|
| Money events (MV-1…MV-9) | **Required** — ledger, state machine, webhook idempotency are the academic deliverable | Required + reconciliation + ops console (P0-8) |
| Fee display (FD) | FD-1, FD-2 (UX is the point); fees can be ₱0 in config | All FD + legal gate FD-6 |
| Payout batching (PB) | Optional — fake money, batch per-order if desired | PB-1, PB-3, PB-5, PB-6 mandatory; PB-2/4/7 policy |
| Refunds (RF) | Any simulated flow | RF-1, RF-2, RF-4, RF-5 mandatory; chargeback handling |
| Agent fees (AF) | Split math demo | AF-1, AF-2, AF-3 mandatory |
| Cash receipt (CR) | CR-2, CR-3 (demo features) | CR-1 decision + CR-2, CR-3, CR-6 |
| Abuse control (AC) | AC-6 + basic velocity | AC-1…AC-5, AC-7, AC-8 mandatory |
| External gates | None (research gates only) | All 10 written Xendit/counsel confirmations (research §6), BSP classification, sub-account KYC, DOLE agent model, NPC/DPIA privacy plan |

**Rule for the PRD edit:** sandbox scope may be demonstrated at any order value with any fee config. Live-money scope must not be enabled until the left-column contracts for the chosen mode are closed **and** the external confirmations are obtained. Put this gate in the PRD's Academic Scope Boundaries section, not just in the audit.

---

## 9. Recommended PRD Edit (the safe version of "remove hard minimums")

1. **Delete** any hard digital order minimum (including the provisional ₱500) from the payment section.
2. **Add** a computed economic floor: "digital payment is offered at any order value unless the all-in fee burden exceeds a configurable percentage (default ~15%) of order value; above that, checkout routes to cash and states why." Config-driven, not legislated — this is what keeps ₱50–₱100 accessible without losing money.
3. **Add** the mode-selection policy: Tiwala requires custody and a protection fee that funds its promises (provisional: Tiwala only where the protection fee is meaningful; micro orders default to direct-digital or cash — founder decision required).
4. **Add** the sandbox/live gate table (§8) to the Academic Scope Boundaries section.
5. **Reconcile** the cash contradiction: 8% cash platform rate (§4.1) vs cash-bypasses-cut (FAQ) — one line, one decision (recommend ₱0 + no receivable in pilot).
6. **Scope REQ-PAY-08 refunds** to Tiwala by default with the authority matrix (RF-1); remove the blanket "Direct is NOT refundable" claim pending legal validation (P0-11).
7. **Keep** the ₱5 minimum listing price (anti-spam, unrelated to digital minimums) and the admin-configurable withdrawal minimum (REQ-PAY-07).

## 10. Open founder decisions (gates, not defaults)

- D-1 Fee bearer per mode: buyer gross-up vs provider deduction vs platform subsidy (FD-4) — with a subsidy budget if chosen.
- D-2 Cash platform fee: ₱0 + no receivable (recommended) vs fee with a real collection path (CR-1).
- D-3 Tiwala protection at micro scale: flat micro fee with limited protection scope, or Tiwala threshold with micro defaulting to direct/cash (recommended).
- D-4 Payout batch fee allocation: pro-rata vs per-withdrawal vs platform-absorbed (PB-3).
- D-5 Agent tier delta funding source (owner vs platform) and micro agent-fee policy (AF-1).
- D-6 Dynamic affordability guard default % (recommended ~15%) and low-value dispute fast-path threshold (AC-3).
- D-7 Subsidy budget and caps if any fee is subsidized (AC-5).

## 11. Dependency notes

- Terminology: the PRD's "escrow" wording must be corrected to "Tiwala protected payment / delayed payout" in the same edit (legal gate, P0-3) — do not ship the minimum-removal edit with escrow language.
- This memo closes P0-10/P0-11/P1-4/P1-5/P1-14 for the *micro-order* slice; it does not close the full audit — webhook authenticity (P0-9), ledger posting contract (P0-12), and the ops console (P0-8) remain prerequisites for any live-money slice regardless of order size.
- All economics above are sensitivity estimates pending contracted Xendit pricing, taxes, split fees, and channel rules (research §4 note).
