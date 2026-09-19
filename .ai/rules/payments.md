---
globs: app/Modules/PaymentObligations/**,app/Shared/Contracts/OrderPayment*
---

# Payment, Escrow & Provider Capability Invariants

## 1. Four Canonical Payment Lanes (ADR-R-007)
- **`external_cash` (Lane 1):** Direct cash on hand / COD. 0% platform commission during Tagudin pilot. No commission receivable is created. Physical cash receipt is the trust anchor.
- **`external_digital_proof` (Lane 2):** P2P third-party wallet transfer (personal GCash/Maya). 0% platform commission. Reference number and screenshot evidence; no platform custody or Tiwala guarantee.
- **`direct_digital` (Lane 3):** Immediate gateway settlement to merchant.
- **`tiwala_protected_digital` (Lane 4):** Digital protected payment. Funds held by licensed provider (Xendit/PayMongo) and released to provider wallet only after authorized on-site work completion / load test sign-off.

## 2. Provider Capability & Unbanked Worker Guard
- **Intersection Guard:** Eligible payment lanes for any order = `Listing Configured Lanes ∩ Provider Capabilities ∩ Cohort Pilot Permissions`.
- **Cash-Only Worker Protection:** A buyer can NEVER unilaterally force an unbanked provider (e.g. Kuya Jun tricycle driver) into digital escrow if the provider does not have a verified digital withdrawal rail.
- **Human Agent Network Delegation:** An unbanked owner (L0 feature-phone user) may only receive digital payouts via a local Barangay Agent if an audited `delegated_payout_consent` is explicitly on record. Otherwise, the order must remain `external_cash`.

## 3. Mid-Flight Payment Lane Switching (Supersession Pattern)
- **Immutability:** Payment obligations are immutable once payment evidence or a gateway capture event exists. A lane never mutates in place.
- **Pre-Payment Switch:** Before cash is reported/confirmed or digital payment is captured, an obligation may be replaced. The predecessor obligation transitions to `status = 'superseded'`, and a new successor obligation is created in the target lane.
- **Anti-Double-Payment Lock:** Opening the digital checkout drawer temporarily locks cash collection. If digital captures via webhook, cash collection is permanently disabled. If cash was already mutually confirmed, late digital webhooks are quarantined on operational hold for automated refund.

## 4. Deal Chain Staggered Settlement (Multi-Slot Isolation)
- **Independent Child Orders:** In a Deal Chain (e.g. #DC-892), each filled Need is an independent child Order with its own `payment_obligation`.
- **No Pooled Wallet:** The platform does NOT maintain a pooled parent wallet or escrow account.
- **Failure Isolation:** A dispute or delay on one child (e.g. Labor) never withholds or freezes an independently earned sibling child obligation (e.g. Courier transit or Hardware materials).

## 5. Three-Plane Pilot Posture
- **Plane 1 (Academic Sandbox):** Deterministic local testing, mock Xendit/PayMongo webhooks, and simulated escrow release tranches.
- **Plane 2 (Tagudin Live Pilot):** `external_cash` and `external_digital_proof` are live (0% fee). Digital escrow (`tiwala_protected_digital`) is sandbox-only until legal/OPS/tax gates pass.
- **Plane 3 (Regulated Production Digital Money):** Full production Xendit/PayMongo processing after BSP OPS registration and BIR RR 16-2023 1% withholding tax compliance.

## 6. Payment Dispute, Hold & Settlement Screens (UX-012, UX-018)
- **Administrative Hold on Mismatch:** When a payment declaration difference occurs (e.g. buyer declared ₱610, provider declared ₱500) or non-payment is reported, the obligation status enters `disputed` and is placed under an administrative `held` lock.
- **Safety Non-Penalization Guard:** Neither party is penalized or de-ranked while an administrative hold is active. No funds or completion sign-offs are finalized until mediation concludes.
- **User-Facing Dispute Intake:** Filing a payment dispute captures 5 mandatory fields: (1) categorized issue chip, (2) impacted obligation reference (`#OBL-xxx`), (3) brief factual statement, (4) optional evidence file/photo, and (5) safety/harassment priority flag (SLA <12h).
- **Canonical Screens:** Mobile payment ceremony (`docs/design-kit/sessions/payment-flow-mobile.html`) and provider/buyer earnings hub (`docs/design-kit/sessions/settlements-mobile.html`).
