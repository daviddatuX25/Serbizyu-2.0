---
title: 'Service-first consumer journey preview: partnerships, Orders and Quick Deal'
type: 'feature'
created: '2026-11-01'
status: 'draft'
review_loop_iteration: 0
context:
  - 'docs/planning-hardening/38-orders-and-listing-combination-usability-audit.md'
  - 'docs/planning-hardening/37-commerce-finish-map-and-quick-deal-scope.md'
---

## Current instruction and scope correction

The user explicitly said the listing builder is already satisfactory and was not requested for modification. The earlier catalog/authoring implementation checklist was too broad and is superseded. **Do not execute its builder/default/category/provenance cleanup tasks.** Existing application edits remain untouched; this document is not authorization to revert them or fix their tests.

**Immediate deliverable:** throwaway interactive HTML mocks in the existing `docs/design-kit/sessions` area, using the established Serbizyu design. No production implementation, new application route, dependency, migration, database write, or listing-builder edit.

## Questions the preview must answer

1. Can a customer primarily booking a service distinguish Service only from an actual seller-authored partner combination, inspect it without selecting it, review exact separate agreements and understand independent provider acceptance?
2. Does an Order tell the buyer/provider who acts next, expose relevant tools without clutter, and use desktop width well while preserving one contextual mobile dock?
3. Is Quick Deal understandable online, with one phone/public card, offline, and on a helper's phone without confusing identity lookup, participant consent, helper statement, Work and payment?
4. Can a provider use flexible Work tools—including a real locally stamped photo—and can the customer inspect the exact submission, request correction and deliberately confirm without confusing proof, Work and payment?

## Preview artifacts

- `docs/design-kit/sessions/service-journey-prototype.html`: consumer service listing, authored partnership and version-pinned review.
- `docs/design-kit/sessions/service-orders-prototype.html`: Orders/group/child workspace with buyer/provider, waiting and historical read-only examples.
- `docs/design-kit/sessions/quick-deal-journey-prototype.html`: online/pending/offline/helper transaction and readable record walkthroughs.
- `docs/design-kit/sessions/service-work-tools-prototype.html`: timestamp-photo/camera, video, map pin, reading/checklist and provider/customer Work-tool interaction preview.
- `docs/design-kit/sessions/service-journey-prototype.css`: shared layout refinements over the existing `final-kit.css`; not a new design system.

## Boundaries

- Service-first examples; products remain supported auxiliary parts, not the primary user journey.
- Existing authored partnerships are deliberate options, not merely generic suggested Deal Chains. Publication is not automatic provider consent or guaranteed capacity.
- No listing-builder UI/code change in this preview or the next consumer implementation cut unless a demonstrated blocker is separately agreed with the user.
- Reuse established navy/white/mango, controls, type, real local specimen assets and the locked wave-sheet shape. No second theme or separate kiosk website.
- Synthetic examples, in-memory state only; prototype actions never call production commands. Reload resets the preview. No real authentication, scanning, encryption, offline durability, sync, stock or payment guarantee.
- QR identifies; each participant confirms their own exact terms. Helper statements never approve for either party. Work completion never settles payment.

## Acceptance and verification

- [x] Openable HTML with no framework install/build and clear links between the consumer previews.
- [x] Work-tools mock exercised with local stamped-image output, camera test-device recording/playback, file import, map pin, required/optional tools and simulated customer correction/confirmation. Hardware and production-integration limits are recorded in audit document 38 §23.
- [x] Service only and authored partnership choices; detail viewing alone does not select; exact review and independent acceptance example.
- [x] Responsive Order task/context composition, separate Agreement/Work/Payment, role-appropriate controls, waiting/read-only states.
- [x] Quick Deal pending/offline/helper/rejection and changed-terms reconfirmation walkthroughs are available as explicitly simulated states.
- [x] Actual browser interaction, keyboard/sheet focus and mobile/desktop screenshots; observed limits recorded in audit document 38.

## Next production gate

The consumer composition and frontend reuse boundaries are recorded in the kit inventory's “Consumer frontend freeze” and audit document 38 §20. This file remains a prototype/handoff, not a production implementation specification. Prepare the consumer-only implementation cut: existing saved combination -> explicit choice/review -> exact staged graph/invitations -> independent accepted Orders, with targeted Orders improvements. Later discovery uses the same offer identity.

**Mandatory preservation boundary:** extend the real `ListingDetail.tsx` composition in place. Keep existing service packages/product variants, seller-authored inclusion facts and promises, add-ons, quantity, price calculations, media/save/provider/contact, supplied ratings/reviews and their empty/filter/photo paths, and Picks/booking entrypoints. A saved partner combination is additive. Use progressive disclosure to shorten Deal Chain copy, not removal of customer scope or collapse of Agreement/Work/Payment. Current preview and preservation evidence: audit document 38 §19.

**Frontend cutover boundary:** reuse existing runtime UI controls, wave sheets and domain tools; extract only customer-review display, shared mobile-dock mechanics and known-minor-unit formatting when the touched pages need them. Preserve the older customer-review photo rail/featured-card/filter presentation; do not confuse it with checkout review, Work sign-off or review submission. Normalize actual public review projections once and remove synthetic live fallbacks. No new kit, mode-heavy workspace, duplicated responsive form, builder rewrite or library-first phase. Factual partner summaries are primary; authored names remain secondary and actual IDs/versions are unchanged.

Quick Deal online/offline remains required under document 37 F3/F4, but a UI mock does not close its record/protocol/schema/security checkpoint. Existing known application test failures are unresolved historical evidence, not a reason to expand this preview into listing-builder repairs.

## Spec Change Log

- User corrected scope: listing builders unchanged; service-first consumer partnership selection, Orders and Quick Deal mocks precede production implementation. Earlier reviewer findings remain recorded in audit document 38 as observations, not approved builder work.
- Browser exercised the HTML at 375px and 1365px. Independent visual and consent-flow reviewers each scored their listed fixes resolved after correction; these verdicts cover their specific findings, not production readiness. Preserve the existing kit despite inherited detector heuristics. At that checkpoint, screen approval and real implementation/protocol qualification remained pending.
- The user rejected the first Quick Deal composition as insufficiently mobile-first. Its long desktop-form layout is superseded by the scan-led, one-step-at-a-time phone mock at the same HTML path. Current screenshots/browser evidence are in audit §14; earlier reviewer verdicts are historical, not approval of the replacement. Service/Orders previews and listing builders remain unchanged. Review the updated phone feel before production implementation.
- Final confirmation methods are now visible in the Quick Deal mock: own-account approval, a confirmation-QR review and a one-time-code entry. Document 38 §16 records click-through/negative-case evidence and current screenshots; document 37 §11 remains the production approval contract. No real authentication, SMS, cryptographic QR or backend challenge/Order effect was added.
- The user rejected the stripped listing mock and wordy chain presentation. The Service and Orders HTML previews now preserve the live listing inventory, exact fixture package inclusions and chosen-option continuity, while simplifying default group rows and moving secondary explanations into Details. Mobile/desktop browser checks and four reviewer findings/corrections are recorded in audit §19. Production application, builders and the Quick Deal mock remain unchanged by this refinement.
- The user approved simpler factual labels and Deal Chain composition, clarified that listing customer reviews should retain their older appearance, and requested modular frontend reuse without delaying feature work. The mock restoration, browser evidence and bounded component map are recorded in audit §20 and the existing kit inventory. Production components are not extracted yet; the real graph/Order implementation and Quick Deal protocol qualification remain open.
- The user explicitly requires timestamp-camera availability and a clickable Work-tools mock before later implementation. The new standalone Work preview uses the existing kit, real local browser media/map capabilities and simulated Work effects. Audit §22 records the Uppy-headless/Canvas/Leaflet recommendation; no capture SDK, production route, builder change or dependency installation is implied.
