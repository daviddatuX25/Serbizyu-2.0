---
globs: app/Modules/PaymentObligations/**,app/Shared/Contracts/OrderPayment*
---

# Payment, Escrow & Provider Capability Invariants

## 1. Canonical Lanes and Independent Lifecycle
- Canonical lanes are **`external_cash`**, **`p2p_transfer`**, and sandbox-only **`protected_digital`**.
- External cash and P2P obligations carry zero platform fees and zero processor costs. They never represent platform custody or a platform wallet balance.
- Work and payment are independent state rails. Work acceptance only makes an eligible `on_work_acceptance` obligation `due`; it is not evidence that payment occurred.
- States are `not_due`, `due`, `payer_reported_cash`, `payer_submitted_p2p_proof`, `proof_rejected`, `disputed_mismatch`, `settled`, `cancelled`, and `superseded`.
- `settled` requires payment evidence and the recipient's acknowledgement (or an authorized case resolution). Work completion, sign-off, handoff, provider verification, or a legacy `released`/`paid_out` label alone MUST NOT mark an obligation `settled`.
- Legacy gateway (`direct_digital`) obligations map to sandbox `protected_digital`, not non-custodial P2P. The migration snapshots original lane, status, and fee values and leaves capture/evidence events unchanged; ambiguous terminal states remain `disputed_mismatch`.
- Unverified legacy terminal or bilateral-looking states are conservatively migrated to `disputed_mismatch`, never `settled`. A payment report or proof is not settlement; rejected proof remains unsettled.

## 2. Provider Capability & Unbanked Worker Guard
- **Intersection Guard:** Eligible payment lanes for any order = `Listing Configured Lanes ∩ Provider Capabilities ∩ Cohort Pilot Permissions`.
- **Cash-Only Worker Protection:** A buyer can NEVER unilaterally force an unbanked provider into `protected_digital` if the provider does not have a verified digital withdrawal rail.
- **Human Agent Network Delegation:** An unbanked owner (L0 feature-phone user) may only receive digital payouts via a local Barangay Agent if an audited `delegated_payout_consent` is explicitly on record. Otherwise, the order must remain `external_cash`.

## 3. Mid-Flight Payment Lane Switching (Supersession Pattern)
- **Immutability:** Payment obligations are immutable once payment evidence or a gateway capture event exists. A lane never mutates in place.
- **Pre-Payment Switch:** Before cash is reported or P2P proof is submitted, an obligation may be replaced. The predecessor transitions to `superseded`, and a linked successor obligation is created in the target lane.
- **Anti-Double-Payment Lock:** A payment lane switch MUST NOT create a second collectible obligation when payment evidence already exists. Ambiguous legacy terminal states remain under `disputed_mismatch` review.

## 4. Deal Chain Staggered Settlement (Multi-Slot Isolation)
- **Independent Child Orders:** In a Deal Chain (e.g. #DC-892), each filled Need is an independent child Order with its own `payment_obligation`.
- **No Pooled Wallet:** The platform does NOT maintain a pooled parent wallet or escrow account.
- **Failure Isolation:** A dispute or delay on one child (e.g. Labor) never withholds or freezes an independently earned sibling child obligation (e.g. Courier transit or Hardware materials).

## 5. Three-Plane Pilot Posture
- **Plane 1 (Academic Sandbox):** Deterministic local testing and mock provider events for `protected_digital`; settlement still requires its own verified payment fact.
- **Plane 2 (Tagudin Live Pilot):** `external_cash` and `p2p_transfer` are live (0% fee). `protected_digital` remains sandbox-only until legal/OPS/tax gates pass.
- **Plane 3 (Regulated Production Digital Money):** Full production Xendit/PayMongo processing after BSP OPS registration and BIR RR 16-2023 1% withholding tax compliance.

## 6. Payment Dispute, Hold & Settlement Screens (UX-012, UX-018)
- **Administrative Hold on Mismatch:** When payment declarations differ or non-payment is reported, the obligation status enters `disputed_mismatch` and an obligation-only administrative hold is opened.
- **Safety Non-Penalization Guard:** Neither party is penalized or de-ranked while an administrative hold is active. The hold affects only the disputed obligation; Work completion and sign-off remain independent.
- **User-Facing Dispute Intake:** Filing a payment dispute captures 5 mandatory fields: (1) categorized issue chip, (2) impacted obligation reference (`#OBL-xxx`), (3) brief factual statement, (4) optional evidence file/photo, and (5) safety/harassment priority flag (SLA <12h).
- **Canonical Screens:** Mobile payment ceremony (`docs/design-kit/sessions/payment-flow-mobile.html`) and provider/buyer earnings hub (`docs/design-kit/sessions/settlements-mobile.html`).
