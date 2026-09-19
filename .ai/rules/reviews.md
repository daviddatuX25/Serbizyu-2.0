---
globs: app/Modules/TrustSupport/**,app/Shared/Contracts/Review*
---

# Reviews, Ratings & Bilateral Tiwala Invariants

## 1. Ratified Invariant AD-21: Cascading Deal Chain Reviews
- **Unified Review by Default:** When a multi-slot Deal Chain (e.g. `#DC-892` with Labor, Materials, and Courier) completes, the buyer submits a single 5-star rating + feedback. By default, this rating cascades across all eligible child orders.
- **Granular Per-Node Overrides:** Unchecking the default cascading toggle allows the buyer to assign custom ratings and feedback to individual nodes (e.g. Kuya Ben 5★, Tagudin Hardware 5★, Danny Express 4★).
- **Pairwise Independent Unblinding:** In a multi-provider Deal Chain, unblinding is evaluated per child-order pair (Buyer ↔ that Order's Provider). As soon as an individual provider reviews the buyer, that specific pair unblinds immediately—without waiting for sibling providers.
- **Child Order Eligibility Gate:** Filter the cascade bundle strictly to child Orders that individually pass verified completion, economic value, and active party checks. Never create a review for cancelled, failed, or superseded replacement nodes.
- **Dual Rollup:** A verified review updates:
  1. The provider's exact listing reputation only when the accepted order terms pin that exact `source_listing_version_id`; otherwise updates the provider's overall profile reputation.
  2. The community archetype / recipe score in the Tagudin Catalog (e.g. Recipe `#CR-892` All-In AC Repair) idempotently.
- **Order Count Derivation:** Completed order counts (Deals Done) are derived strictly from authoritative completed Order events—never incremented from review submissions, preventing drift when reviews are omitted or corrected.

## 2. Bilateral Evaluation & Citizen Reliability Record (No Buyer Star Scores)
- **Two-Way Feedback with Asymmetric Defense:**
  - **Buyer rates Provider:** 1 to 5 stars + structured attribute chips (`on_time`, `clean_workspace`, `expert_fix`, `fair_pricing`, `respectful`) + written note.
  - **Provider rates Buyer:** Non-numeric Citizen Reliability feedback. No 1-to-5 star score is assigned to buyers, preventing subjective barangay, housing, language, or personal discrimination.
- **Objective Citizen Reliability Record:** Buyer standing is computed 100% from system truth:
  - `Deals Done`: Count of completed child orders.
  - `Cash Settlement Rate`: Percentage of orders where cash or digital payment was settled without dispute.
  - `Cancellation Rate`: Percentage of buyer-attributable cancellations after proposal acceptance.
- **Provider Feedback Chips:** Providers submit factual context chips (`cash_ready_on_site`, `site_accessible`, `respectful_communication`) + optional note. These remain private trust signals and support context—they never become a public star score that gates citizen access.

## 3. 72-Hour Blinded Submission Window & Hard Lockout
- **72-Hour Window:** The review window opens upon order settlement and remains active for exactly 72 hours (3 days), reflecting local high-velocity municipal transactions.
- **Double-Blind Hold:** Stored reviews remain sealed and unpublished until:
  1. Both parties have submitted their reviews for that child order, OR
  2. The 72-hour review window elapses.
- **Hard Submission Lockout:** When the 72-hour window closes and one party's review unblinds, review submission is permanently locked for the non-submitter. Non-submitters cannot read the counterparty's feedback and post retaliatory counter-reviews.
- **Dispute & Administrative Hold Quarantine:** If an active dispute, safety incident, or administrative hold exists on the Order or Payment Obligation, review publication is paused. The review pair remains in a quarantined non-public moderation state until the dispute is resolved.

## 4. Anti-Sybil & Anti-Collusion Defenses (Doc 26 §5)
- **Economic Value Gate:** Only completed transactions meeting category minimum economic thresholds ($ \ge ₱40 $) generate review eligibility (`eligibility_evidence_file_id` FK).
- **Shape-Specific Fulfillment:** Verified fulfillment requires physical handoff/attendance evidence for A1, A3, and A4 shapes, or verified deliverable artifact/version acceptance for A9 digital delivery.
- **Unique Counterparty Defense:** A provider's public rating badge and search ranking only activate after verified completions with at least 3 distinct resident counterparties, preventing closed-loop ₱40 self-dealing rings.
- **Bayesian Dampening:** Catalog archetype and provider scores use Bayesian weighted averages:
  $$WR = \frac{v \times R + m \times C}{v + m}$$
  where $v$ is verified review count, $R$ is average rating, $m$ is prior threshold (5 runs), and $C$ is catalog mean (4.5★).

## 5. Canonical Mock Screens
- Review Ceremony Flow: `docs/design-kit/sessions/review-ceremony-mobile.html` (Compose, 72h Sealed Hold, Revealed)
- Listing Reviews Display: `docs/design-kit/sessions/listing-detail.html`
- Citizen Reliability Strip: `docs/design-kit/profile-mobile.html`
