# Serbizyu — Xendit Payment Economics Research

Status: VERIFIED RESEARCH — not yet a founder-approved product decision
Date checked: 2026-07-31
Scope: Tagudin pilot payment economics and Xendit capability constraints

## 1. Verified Current Facts

### Payment acceptance pricing

The official Xendit Philippines pricing page currently publishes:

- GCash E-Wallet: 3.00% payment-method fee plus ₱11 Xendit processing fee.
- GCash Auto Debit: 3.20% plus ₱11.
- Maya E-Wallet: 2.00% plus ₱11.
- Philippine payout to banks/e-wallets: 1.00%, minimum ₱15, plus ₱11 Xendit processing fee.

The values above were independently inspected in the live pricing-page DOM. Contracted, negotiated, tax-inclusive, or volume pricing may differ and must be confirmed before production.

### xenPlatform

Official Xendit documentation supports:

- Platform-managed sub-accounts.
- Accepting payments on behalf of sub-accounts.
- Split-payment rules with flat or percentage routes.
- Platform-controlled payouts from sub-account balances.
- Full or partial refunds to the original payment method, subject to channel restrictions.
- Webhooks using the `x-callback-token` header.

Xendit documentation describes xenPlatform as a marketplace/platform facility. It does not establish that Serbizyu's proposed delayed payout is legally “escrow.” Product copy must say **Tiwala protected payment** or **delayed payout** unless Philippine counsel and Xendit contractually approve the escrow term.

### Important operational consequences

- Small individual payouts are expensive because the published payout price has both a minimum and a ₱11 component.
- Provider balances should accumulate and be paid on a defined schedule or threshold rather than paying out every order.
- Original payment-processing costs may not be recovered automatically after refunds.
- Split movements and refunds require explicit reversal/reconciliation rules.
- A successful refund API status is not equivalent to money already appearing in the customer's wallet/account.
- Production sub-accounts and live-money behavior remain gated by Xendit onboarding, KYC, product activation, contractual approval, and legal review.

## 2. Correction to the Delegated Memo

The delegated recommendation used a ₱100 digital minimum and a flat ₱15 Tiwala fee. It is not accepted as-is.

Reasons:

1. At ₱100, GCash alone is approximately ₱14 before platform protection, payout, refund, split, and tax effects. The percentage burden is too high for a low-barrier provincial marketplace.
2. Its worked Tiwala examples calculated the gateway fee on the order amount even though the buyer total also included the protection fee. If Xendit charges against the full collected amount, that math understates the fee.
3. It omitted the promised direct-payment platform fee from the worked examples.
4. It called a payment “Direct” while delaying provider release until completion; that behavior is protected/delayed payment, not direct settlement.
5. A flat ₱15 protection fee cannot plausibly fund human dispute work across larger orders.

## 3. Provisional Lead-Architect Recommendation

This is the recommended baseline for the later founder payment-policy review. It is not locked by this research note.

### Mode A — External Cash

- Minimum: none.
- Platform commission during capstone and initial Tagudin pilot: 0%.
- Buyer pays provider externally.
- Serbizyu records offer/booking, dual confirmation, receipt/evidence, and review eligibility.
- Serbizyu does not promise recovery, refund custody, or Tiwala financial protection.
- No uncollectible platform receivable is created.
- Optional agent compensation for cash is outside platform custody during the pilot and must not be recorded as guaranteed platform revenue.

### Mode B — Direct Digital

- No hard digital minimum is imposed by the product. The checkout may recommend cash when the all-in fee burden is high, but a ₱50–₱100 job is not rejected solely because it is small.
- Digital availability is controlled by the configured fee-bearer/subsidy policy and external provider rules, not by a permanent product floor.
- Provisional platform service fee: 2% of order amount, minimum ₱5, subject to founder approval and fee-display rules.
- Payment-processing cost must be shown transparently before confirmation.
- Provider payout/withdrawal fee is disclosed and either charged at withdrawal or amortized through accumulated/batched payout.
- Refunds after provider control require provider agreement or another legally supported remedy; Serbizyu must not promise automatic recovery it cannot execute.

### Mode C — Tiwala Protected Digital

- No hard digital minimum is imposed by the product; small orders remain eligible when the configured fee and protection policy permits them.
- Delayed payout begins only after provider completion and buyer sign-off rules are satisfied; release timing never starts at order creation.
- Provisional platform protection fee: 5% of order amount, minimum ₱5 for micro-orders and subject to a founder-approved scope/fee policy.
- Fee funds payment operations, evidence retention, customer support, dispute administration, refund losses, and future legal escalation capacity.
- Protection fee is distinct from processor and payout costs.
- Funds remain held/delayed through the approved Xendit structure until release, refund, or administrative resolution.
- “Escrow” terminology remains prohibited until written legal/contractual clearance.

### Agent-managed digital transactions

- Agent compensation is independent of the platform protection fee.
- Proposed agent service fee: 10% of provider order value only when the provider explicitly opts into agent-managed service.
- Digital transactions may route this through a verified split rule.
- Refund and partial-completion rules must reverse or prorate the agent amount explicitly.
- Cash agent compensation is not automatically collected by Serbizyu during the initial pilot.

## 4. Worked GCash Scenarios

For sensitivity testing only, the following assumes:

- GCash cost = 3% of total collected + ₱11.
- Buyer-facing total is grossed up so the quoted provider amount and service/protection fee remain intact.
- Direct service fee = max(2% of order, ₱5).
- Tiwala protection fee = max(5% of order, ₱5) for the provisional micro-order policy.
- VAT, Xendit platform activity fees, split fees, agent fees, and payout costs are excluded pending written commercial confirmation.
- Passing gateway costs to the buyer must be contractually and legally confirmed before production.

| Order | Recommended mode | Direct digital total | Tiwala total | Reason |
|---:|---|---:|---:|---|
| ₱50 | External cash preferred; digital remains policy-controlled | ₱68.04 theoretical | ₱68.04 theoretical | Digital overhead is high, but the product does not reject the micro-job solely because of price. |
| ₱100 | External cash preferred; digital remains policy-controlled | ₱119.59 theoretical | ₱119.59 theoretical | Digital overhead remains high; show the total before confirmation. |
| ₱500 | Digital allowed | ₱537.11 | ₱552.58 | Direct adds ₱10 service; Tiwala adds ₱25 protection. |
| ₱1,000 | Digital allowed | ₱1,062.89 | ₱1,093.81 | Direct adds ₱20 service; Tiwala adds ₱50 protection. |

These are pricing-model examples, not production quotes.

## 5. Payout Rule

Recommended provider payout behavior:

- Provider-controlled balance is visible immediately after the applicable release event.
- Scheduled payout is weekly.
- Automatic payout threshold is provisionally ₱1,500.
- Providers may request an earlier payout while accepting the disclosed payout cost.
- Payout cost allocation must be snapshotted on the transaction/withdrawal record.
- One order must not silently absorb the entire cost of a multi-order batch payout; allocation method must be defined in the money-event catalog.

## 6. Required Written Confirmations Before Production

Obtain from Xendit Philippines and/or qualified counsel:

1. Current contracted payment, payout, split, activity, refund, tax, and chargeback fees.
2. Whether gateway costs may be separately passed to buyers and how they must be displayed.
3. Exact xenPlatform sub-account KYC and onboarding requirements for informal providers.
4. Whether the proposed delayed-payout/Tiwala flow is contractually permitted.
5. Who legally holds funds at each stage.
6. Refund and split-reversal behavior for every enabled channel.
7. Whether platform and agent splits can be delayed/reversed safely.
8. Required consumer-protection language and prohibited use of “escrow.”
9. Settlement, reserve, negative-balance, fraud-hold, and chargeback behavior.
10. Webhook token rotation and production event-reconciliation requirements.

## 7. Sources

- Xendit PH pricing: https://www.xendit.co/en-ph/pricing/
- xenPlatform overview: https://docs.xendit.co/docs/xenplatform-overview
- Xendit API documentation: https://docs.xendit.co/apidocs/
- Existing Serbizyu spike: `old-docs/spikes/xendit-escrow-spike.md`

The official pricing and documentation are current-source evidence. The proposed rates, minimums, fee bearer, payout threshold, and agent model remain founder-review decisions.