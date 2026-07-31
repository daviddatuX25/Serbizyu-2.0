# Serbizyu 2.0 — Rebuilt Phase 1 Handoff

Status: CANONICAL PLANNING HANDOFF — founder-approved 2026-07-31; downstream implementation/live-money gates remain separate
BMAD phase: Phase 1 Analysis → Phase 2 Planning handoff

## 1. Phase 1 outcome

Phase 1 now has a coherent product direction and taxonomy for the next planning ceremony.

Authoritative upstream drafts/decisions:

1. `docs/planning-hardening/00-recovery-charter.md`
2. `docs/planning-hardening/01-contradiction-and-supersession-register.md`
3. `docs/planning-hardening/02-payment-and-trust-lane-policy.md`
4. `docs/planning-hardening/03-dual-success-and-go-no-go-scorecards.md`
5. `docs/planning-hardening/04-pilot-capability-matrix.md`
6. `_bmad-output/planning-artifacts/product-vision-rebuilt.md`
7. `_bmad-output/planning-artifacts/listing-model-taxonomy-rebuilt.md`

Historical PRD, UX, architecture, ADR, epics, and readiness files remain source material only until replaced or explicitly reclassified.

## 2. Product boundary entering Phase 2

### Capstone

The capstone may demonstrate:

- Service/Product Listing
- Service/Product Request
- Direct Booking
- Request/Quote behavior
- Agent-mediated consent
- A1 Linear Project
- A3 Appointment
- A4 Handoff
- A9 Digital Delivery
- External Cash
- External Digital Proof
- Direct Digital sandbox
- Tiwala Protected Digital sandbox
- Supported low-literacy/assisted flows
- Admin, evidence, dispute, and recovery flows

### Initial Tagudin validation

The pilot target is approximately 30 genuine community participants, with approximately 10 Providers/Owners and 20 Buyers/Customers as a working composition.

Initial committed capabilities:

- Service Listings
- Product Listings
- Direct Booking
- Agent-Mediated support with consent
- A1/A3/A4/A9 where each contract is complete
- External Cash
- External Digital Proof
- Tested access tiers
- Tagudin-only operations

Conditional capabilities:

- Service Requests
- Product Requests
- Quote Requests
- Reverse Bidding
- Online Quick Deal
- Assisted kiosk access
- Low-data/offline draft support
- Simple purchase-on-behalf errands
- Additional category families

Deferred or sandbox-only capabilities include production connected payments, Tiwala, Direct Digital, Deal-Chaining, rental, recurring, dispatch, emergency, transport, and high-risk regulated work without dedicated gates.

## 3. Phase 2 must produce

The rebuilt PRD and UX specification must translate the Phase 1 contract into:

- Personas and access tiers
- Pilot capability requirements
- Startup learning requirements
- Complete journeys
- Acceptance boundaries
- Business rules
- Safety/privacy rules
- Payment-lane language
- Agent-consent behavior
- Low-literacy behavior
- Notifications and support
- Dispute and evidence behavior
- Success metrics and cohort classification
- Deferred/foundation requirements
- Requirement-to-UX/story/test traceability

## 4. Non-negotiable Phase 2 rules

1. Do not copy the old PRD revenue split or cash commission assumptions.
2. Do not call Direct Digital or Tiwala live pilot capability.
3. Do not use “escrow” as an unqualified legal/product promise.
4. Do not tie release timing to Order creation.
5. Do not let payment confirmation equal Work completion.
6. Do not define one universal workflow for A1/A3/A4/A9.
7. Do not turn Agent assistance into invisible ownership or custody.
8. Do not promise offline final authority.
9. Do not state a category count as settled unless the rebuilt taxonomy supports it.
10. Do not include deployment-stack choices as product requirements.
11. Do not count capstone, sandbox, seeded, or team activity as Tagudin validation.
12. Do not add a feature merely because it appears in an old mockup or PRFAQ.

## 5. Phase 2 traceability contract

Every requirement in the rebuilt PRD must identify:

- Requirement ID
- Plane: capstone, Tagudin validation, startup foundation, or future expansion
- Capability-profile reference
- User/persona
- Journey or UX surface
- Business rule
- Safety/privacy/payment implication
- Owning story or later artifact
- Acceptance-test intent
- Evidence class
- Deferred/activation gate if not pilot committed

Every important UX journey must identify:

- Entry condition
- Actor and access tier
- Primary action
- Consent/authorization requirement
- Success state
- Failure/retry state
- Evidence produced
- Notification/support behavior
- Safety boundary
- Payment-lane language
- Completion/dispute behavior

## 6. Phase 2 journeys that cannot be omitted

1. Provider registration and identity review
2. Buyer registration and discovery
3. Agent-assisted owner consent
4. Service listing creation
5. Product listing and capacity/handoff
6. Service request and conditional quote flow
7. A1 project execution
8. A3 appointment execution
9. A4 handoff and purchase-on-behalf extension
10. A9 digital delivery
11. External Cash declaration and mutual acknowledgment
12. External Digital Proof evidence submission and dispute
13. Direct Digital sandbox demonstration
14. Tiwala Protected Digital sandbox demonstration
15. Completion/sign-off and review window
16. Cancellation
17. Evidence dispute and administrative hold
18. Notification and messaging fallback
19. Low-literacy/low-data access
20. Admin/support recovery

## 7. Phase 2 exit gate

Phase 2 is complete only when:

- The PRD no longer conflicts with the Product Vision, Taxonomy, Payment Policy, Scorecard, or Pilot Matrix.
- The UX specification covers every committed pilot journey.
- Conditional and sandbox paths are visibly separated.
- Requirements have unique IDs and traceability targets.
- Payment, completion, consent, safety, and evidence language is explicit.
- Deployment choices remain downstream architecture decisions.
- The old PRD/UX files are marked historical or superseded rather than silently competing.
- A founder review records approval or named corrections.

## 8. Next ceremony

Rebuild the Phase 2 PRD first. The UX specification follows the PRD contract and must not become a parallel source of product rules.
