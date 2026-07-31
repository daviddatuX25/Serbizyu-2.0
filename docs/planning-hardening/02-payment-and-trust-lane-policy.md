# Serbizyu 2.0 — Payment and Trust-Lane Policy

Status: REVISED DRAFT — founder review required before this becomes authoritative
Authority: follows the approved recovery charter and contradiction register
Scope: Tagudin capstone and pilot planning; this document does not authorize production live-money operation

## 1. Policy thesis

Serbizyu is a low-barrier marketplace. A valid service, errand, product, or side hustle is not rejected merely because its value is small or its participants prefer cash or an external payment provider.

Payment lanes exist to make custody, evidence, fees, remedies, and promises explicit. They do not define whether the underlying work is legitimate product scope.

Serbizyu supports four payment/trust lanes:

1. **External Cash**
2. **External Digital Proof**
3. **Direct Digital**
4. **Tiwala Protected Digital**

The interface must never imply that a lower-protection lane has Tiwala guarantees.

## 2. Locked decisions

- Tagudin is the only initial pilot geography.
- There is no hard minimum order value imposed merely to compensate for gateway costs.
- External Cash has 0% Serbizyu platform commission during the capstone and initial Tagudin pilot.
- External Digital Proof has 0% Serbizyu platform commission during the capstone and initial Tagudin pilot.
- Serbizyu creates no commission receivable for money it did not collect.
- Direct Digital and Tiwala are separate products. Direct Digital cannot be delayed until work completion and still be called direct.
- Tiwala release timing begins only after authorized work completion/sign-off, never at order creation.
- Government-ID verification, agent permissions, and fulfillment safety are cross-cutting trust controls; they do not change a lane’s custody promise.
- Agents and kiosks do not acquire cash custody merely because they assist a transaction.
- Exact connected-gateway, platform, protection, agent, payout, refund, and tax rates belong in the later money-event/financial policy. This artifact defines lane behavior, not final commercial pricing.

## 3. Canonical vocabulary

### 3.1 Parties

- **Buyer** — requests or purchases the work/product.
- **Provider/Owner** — owns the listing, controls its commercial terms, and remains responsible for fulfillment unless a separate role is explicitly granted.
- **Agent** — assists with configured marketplace-management tasks. Agent status does not imply listing ownership, fulfillment responsibility, fund ownership, or cash custody.
- **Kiosk operator** — assists marketplace access. The initial kiosk role does not accept deposits, hold a cash float, or become a payment intermediary.
- **Serbizyu administrator** — performs explicitly authorized support, fraud, evidence, dispute, and financial-operations actions with an audit trail.

### 3.2 Payment obligation

A **payment obligation** is the amount due for one agreed settlement event. An order may eventually contain multiple obligations, such as a deposit, milestone, balance, or approved reimbursement.

Each payment obligation uses exactly one lane. Mixed tender inside one obligation is not supported in the initial scope. A later milestone may use another lane only when the order/archetype contract explicitly allows it and preserves a complete history.

For the initial capstone vertical slice, one order should use one payment obligation unless the selected archetype specifically requires milestones.

### 3.3 Amount components

Where applicable, an obligation may contain:

- Base service or product amount
- Approved reimbursable-goods amount
- Approved variance or adjustment
- Platform/service fee
- Tiwala protection fee
- Agent service fee
- Gateway fee
- Payout/withdrawal fee
- Tax or legally required charge

A pabili or purchase-on-behalf example does not create a new payment lane. Its item budget, actual purchase cost, variance approval, store receipt, service fee, and handoff evidence belong to its fulfillment/work contract and feed the same payment obligation model.

## 4. Lane comparison

| Lane | Where money moves | Evidence status available to Serbizyu | Serbizyu custody | Serbizyu protection promise | Refund/reversal authority |
|---|---|---|---|---|---|
| External Cash | Buyer directly to Provider/Owner | Party-reported and mutually confirmed | None | Transaction record, mediation, and reputation only | Parties; Serbizyu cannot automatically refund cash |
| External Digital Proof | Through a provider chosen by the parties | Party-reported, counterparty-confirmed, or provider-verified when an adapter exists | None | Evidence workflow and mediation only; not Tiwala | Parties/external provider; Serbizyu cannot promise reversal |
| Direct Digital | Through an approved Serbizyu-connected gateway | Gateway-authenticated and reconciled | Processing only; no completion-based protection hold | Connected processing under the disclosed settlement contract | Provider/admin according to the approved refund contract and gateway capability |
| Tiwala Protected Digital | Through an approved delayed-payout/custody structure | Gateway-authenticated, held, reconciled, released/refunded | Limited to the approved Tiwala structure | Published Tiwala protection scope, subject to exclusions and operational capacity | Serbizyu/admin while funds remain controllable under the approved structure |

## 5. Rules common to every lane

### 5.1 Selection and consent

- The Provider/Owner enables the lanes supported by the listing.
- The Buyer selects from those enabled lanes before committing the payment obligation.
- The checkout states who receives the money, whether Serbizyu holds it, what fees apply, what evidence is required, and what remedies exist.
- Selection is recorded with the configuration version and consent timestamp.
- A lane cannot silently change after confirmation.

### 5.2 Payment and fulfillment are separate

Payment confirmation must never be used as automatic proof that work was completed. Work completion must never be used as automatic proof that an external payment was received.

The payment state and work/fulfillment state advance independently and are joined only by explicit guards in the later canonical state machines.

### 5.3 Amount integrity

- Quoted, adjusted, reported, collected, refunded, released, and paid-out amounts are separate fields/events.
- Underpayment, overpayment, partial payment, and approved adjustments do not silently rewrite the original obligation.
- Amount changes require an explicit adjustment accepted by the affected parties before payment, or a correction/refund event after payment.
- Connected-gateway events are accepted only after amount, currency, account, and order-reference verification.

### 5.4 Lane changes

- Before a payment is reported or initiated, the parties may cancel the obligation and create a replacement obligation using another lane.
- After payment evidence or a gateway event exists, the original obligation remains immutable. Any change uses a superseding, cancellation, refund, or correction event.
- No uploaded screenshot or manual edit may convert External Digital Proof into Direct Digital or Tiwala.

### 5.5 Receipts and records

Serbizyu produces a **transaction record/payment acknowledgment**, not an “official receipt” or tax invoice unless the legally compliant invoicing capability exists and the responsible issuer is defined.

The record must identify the selected lane and state what it proves and does not prove.

## 6. External Cash contract

External Cash is the default low-barrier lane for small errands, simple services, informal providers, and users who want to avoid gateway costs.

### 6.1 Required behavior

- Buyer and Provider/Owner agree on the amount and cash lane.
- Serbizyu charges 0% platform commission during the capstone and initial Tagudin pilot.
- Serbizyu creates no platform commission receivable.
- Buyer pays Provider/Owner directly.
- Payment reporting and fulfillment completion remain separate actions.
- Buyer may report “cash paid”; Provider/Owner may report “cash received.”
- The payment becomes **mutually confirmed** only when both attestations match.
- A mismatch, denial, or amount difference creates a disputed-evidence state; it does not create an automatic refund.
- Silence by one party does not automatically prove that cash changed hands.
- Serbizyu generates a payment acknowledgment containing the order/obligation reference, reported amount, actors, timestamps, and confirmation status.
- The acknowledgment states that Serbizyu did not hold, inspect, insure, or guarantee the cash.

### 6.2 Physical-cash boundary

- Change/barya preparation, counterfeit-note checking, and physical loss are responsibilities of the paying and receiving parties unless a separately approved custody service exists.
- Serbizyu may provide safety guidance but does not represent that it authenticated a banknote.
- High-value or safety-sensitive categories may require additional confirmation/evidence or may disable cash under a future approved category policy.
- Agents do not automatically collect, hold, or transport cash.
- Kiosks do not accept cash deposits or operate a float in the initial scope.

### 6.3 Cash remedies

Serbizyu may provide evidence review, communication, mediation, account restrictions, and reputation consequences. It cannot promise automatic reimbursement, chargeback, or recovery of externally exchanged cash.

## 7. External Digital Proof contract

External Digital Proof allows parties to use GCash, Maya, bank transfer, or another mutually accepted provider without requiring Serbizyu custody or integration.

### 7.1 Required behavior

- Provider/Owner declares the external providers or account instructions accepted for the listing/order.
- Buyer pays outside Serbizyu using the selected provider.
- Buyer submits the provider name, amount, transaction/reference number, payment timestamp, and supported proof.
- Serbizyu records the submitter and preserves the original evidence with privacy/security controls.
- Provider/Owner confirms receipt, disputes it, or marks an amount mismatch.
- Upload alone never marks the obligation provider-verified or Tiwala-protected.
- A silent counterparty leaves the payment pending; it does not auto-confirm receipt.
- The obligation may become:
  - `reported`
  - `counterparty_confirmed`
  - `provider_verified` — only when a trusted provider adapter/API confirms it
  - `disputed`
  - `rejected`
  - `superseded`
- Duplicate/reused references, amount mismatches, altered evidence, and suspicious repeated relationships are review signals.

### 7.2 Required user-facing copy

Before confirmation and on the resulting record:

> Serbizyu did not hold this payment. The reference or screenshot is transaction evidence, not a Serbizyu guarantee. This payment does not include Tiwala protected-payment coverage or automatic Serbizyu refunds.

### 7.3 Evidence privacy

- Users are instructed to redact unrelated balances, full account numbers, unrelated transactions, and unnecessary personal information.
- Serbizyu stores only the evidence required for the transaction/dispute purpose.
- File validation, malware scanning, access logging, retention, deletion, and dispute/legal-hold behavior are required before production use.
- A screenshot is never labeled “verified” merely because it looks authentic.

### 7.4 External-payment remedies

Serbizyu may facilitate confirmation, preserve evidence, mediate, and apply marketplace-account consequences. Refunds and reversals remain with the parties and external provider unless a separate lawful capability exists.

## 8. Direct Digital contract

Direct Digital uses an approved connected gateway without the completion-based protection hold of Tiwala.

### 8.1 Settlement semantics

- A gateway-authenticated success makes the funds/provider payable provider-controlled under the approved gateway settlement contract.
- Bank/e-wallet payout batching may delay actual withdrawal, but Serbizyu must not hold Direct Digital funds until work completion as a protection mechanism.
- If the provider contract cannot implement this distinction legally and operationally, Direct Digital is disabled rather than mislabeled.

### 8.2 Required controls

- Server-created payment intent/order reference
- Webhook authenticity verification
- Amount, currency, account, and order reconciliation
- Idempotent state transitions
- Explicit pending, succeeded, failed, expired, partially refunded, refunded, disputed/chargeback, and corrected outcomes
- Itemized fee display before Buyer confirmation
- Snapshotted fee and settlement configuration
- Payout status and reconciliation separate from payment success

### 8.3 Refund boundary

Direct Digital is not categorically “non-refundable,” but Serbizyu cannot promise automatic recovery after provider control. Refund authority, provider consent/admin grounds, gateway capability, fee loss, negative balances, and refund status must follow the later money-event contract.

## 9. Tiwala Protected Digital contract

Tiwala is the stronger protection lane and therefore creates stronger obligations for Serbizyu.

### 9.1 Required semantics

- Tiwala uses only a contractually approved delayed-payout/custody structure.
- The protection fee is distinct from gateway, payout, tax, and agent fees.
- Payment success creates a held/controlled state, not provider-controlled settlement.
- The release clock begins only after authorized work completion/sign-off.
- Release requires:
  - authorized work completion
  - Buyer sign-off or an explicitly published review-window expiry
  - no active dispute
  - no fraud/administrative/legal hold
  - reconciled payment amount
  - an idempotent, concurrency-safe release transition
- Release cannot occur merely because time passed from order creation.
- Refund, partial refund, reversal, payout failure, chargeback, and failed-release operations must exist before live-money use.

### 9.2 Protection boundary

Tiwala is a defined operational protection service, not unlimited insurance, a guarantee of work quality, legal representation, or legal escrow unless separate written clearance establishes that status.

The Buyer must see:

- What events qualify for a hold/dispute
- What evidence may be requested
- What outcomes Serbizyu may order while it controls the funds
- Review and response windows
- Exclusions
- Appeal/escalation path
- What happens when money has already been released

## 10. Fees and low-value affordability

### 10.1 No artificial product floor

There is no permanent hard minimum order value merely because a connected gateway is expensive. The underlying job remains valid marketplace scope.

### 10.2 Required fee display

Before confirmation, the interface shows, where applicable:

- Base service/product amount
- Reimbursable-goods amount
- Approved adjustments
- Platform/service fee
- Tiwala protection fee
- Agent service fee
- Gateway fee
- Payout/withdrawal note
- Tax or legally required charge
- Buyer total
- Provider expected gross/net amount, when known

### 10.3 Affordability behavior

- External Cash and External Digital Proof are recommended when connected-gateway fees are disproportionate.
- The warning explains the monetary amount, not only a percentage.
- A warning does not remove the listing or invalidate the order.
- A connected digital lane may be disabled only because of an external provider constraint, an approved legal/operational restriction, fraud control, or an explicit capped subsidy policy.
- Any subsidy has a budget, owner, per-user/period limits, and kill switch.

### 10.4 Initial platform-fee position

- External Cash: 0% Serbizyu platform commission in capstone/initial pilot.
- External Digital Proof: 0% Serbizyu platform commission in capstone/initial pilot.
- Direct Digital and Tiwala: sandbox may demonstrate configurable fees, but live rates and fee bearers are not approved by this document.
- No gateway cost is passed to a Buyer in production until contractual and legal display/fee-bearer rules are confirmed.

## 11. Agent, owner, and kiosk permissions

- Provider/Owner remains responsible for listing terms and fulfillment unless a separate role is explicitly granted.
- Agent capabilities are configurable per owner/platform policy.
- Possible capabilities include listing creation/editing, assisted order creation, evidence upload, communication, cancellation request, and dispute initiation.
- Every assisted action records the acting Agent, affected party, permission used, consent state, timestamp, and before/after value where relevant.
- An Agent uploading evidence on another person’s behalf does not become the payer or recipient; the relevant party must still attest or consent.
- Agent permission does not imply ownership of goods, listing proceeds, payout destination, identity documents, or cash custody.
- External Cash and External Digital Proof create no guaranteed Serbizyu-collected Agent fee.
- Any connected-digital Agent fee must be separately consented, collectible, reversible/proratable, and snapshotted.
- Initial Kiosk permissions are limited to assisted discovery, listing/order navigation, consent capture, evidence/receipt help, and support routing. Cash deposit/float is excluded.

## 12. Minimum evidence record

Every obligation records, as applicable:

- Order, listing, and payment-obligation identifiers
- Buyer and Provider/Owner identifiers
- Acting Agent/Kiosk operator and permission/consent references
- Selected lane and configuration version
- Quoted, adjusted, reported, collected, refunded, released, and paid-out amounts as separate values/events
- Currency
- External provider and masked reference number
- Gateway/provider event identifiers when integrated
- Evidence attachments and submitter
- Evidence status and status reason
- Confirmation/verification actors and timestamps
- Fee snapshot
- Protection/custody disclaimer
- Dispute, hold, correction, cancellation, refund, release, and supersession links

Evidence records are immutable in history. Corrections append a new event rather than rewriting the original claim.

## 13. Phase gates

### 13.1 Capstone sandbox

May demonstrate all four lanes with test data, gateway sandbox events, and simulated external proof. The capstone must prove lane distinction, payment/work state separation, evidence status, receipts/acknowledgments, permissions, fee display, and disclaimers without claiming live-money readiness.

### 13.2 Initial Tagudin pilot

- External Cash may operate after the consent, payment-acknowledgment, dispute-evidence, privacy, safety, support, and account-control baseline is ready.
- External Digital Proof may operate after evidence privacy/security, counterparty confirmation, retention, dispute routing, and disclaimer behavior are ready.
- Connected Direct Digital and Tiwala remain sandbox-only until their provider, legal, financial, refund/reversal, reconciliation, fraud, monitoring, backup/recovery, support, and operations gates close.

### 13.3 Future live connected payments

Requires, at minimum:

- Written provider/contract confirmation
- Required KYC/account activation
- Legal/regulatory and privacy review
- Canonical money-event and ledger rules
- Refund, reversal, chargeback, and negative-balance handling
- Payout batching and reconciliation
- Webhook security and idempotency
- Financial operations console and kill switches
- Monitoring, incident response, backup, restore, and reconciliation drills
- Named support and escalation ownership

This policy alone closes none of those external/live-money gates.

## 14. Explicit exclusions from this artifact

This policy intentionally does not:

- Set final Direct Digital or Tiwala rates
- Approve production Xendit/xenPlatform use
- Call Tiwala legal escrow
- Define the full order/work/payment/dispute/payout state machines
- Define accounting journal entries
- Define the complete refund formula
- Define tax-invoice issuance
- Make Agents or Kiosks cash custodians
- Make screenshots equivalent to provider verification
- Guarantee externally paid money
- Decide which categories/archetypes enter the pilot

Those decisions belong to the follow-on artifacts below.

## 15. Required follow-on artifacts

1. Pilot capability/category matrix
2. Canonical money-event and accounting catalog
3. Order/work/payment/dispute/payout state machines
4. Permission and consent contract
5. UX payment-lane journeys, evidence states, warnings, and disclaimer copy
6. Legal/privacy gate checklist and evidence lifecycle matrix
7. Financial operations, reconciliation, and support contract
8. Rebuilt PRD payment requirements
