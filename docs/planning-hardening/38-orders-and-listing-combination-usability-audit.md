# Orders and listing-combination usability audit

**Latest finish-first direction:** document 37 §§12–13 holds the bounded repair queue and final user-approved pilot scope; [document 39](39-controlled-pilot-implementation-handoff.md) indexes the published tasks under [finish specification #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34) and the fresh-session start at #35. The source recheck reopened five concrete closing-review blockers; §26 remains historical path evidence, not blanket clearance of the latest authoring/publication/upgrade code. Preserve the approved visual system and listing details; fix bounded data integrity rather than redesigning the builders.

**Scope evolution:** the earlier prototype-only cut excluded builder changes. The later saved-plan implementation approved narrow producer-data corrections while preserving builder layouts. The final finish commitment is document 37 §13: controlled Tagudin pilot, Filipino/English first, all three approval alternatives, prepared-phone offline confirmation and real timestamp-photo/voice/short-video Work tools. Earlier exclusions and optional-tool language are historical, not authority to drop this scope.

**Latest Quick Deal direction:** the user rejected the first Quick Deal mock’s desktop-form feel. The mobile-first replacement and its current evidence are in §14. Earlier Quick Deal screenshots/reviewer verdicts describe the superseded composition, not approval of the replacement.

**Listing/Order preservation:** the user rejected stripping existing listing features to demonstrate partnerships and requested less wordy Deal Chain views. Section 19 records the restored listing inventory, simplified grouping and current mock evidence. Extend the real listing page; do not replace it with the earlier minimal mock.

**Method:** independent read-only reviewer `ListingOrderUsabilityReview`, plus parent read-only inspection of the reported Order data. This is source evidence, not a browser qualification result. Reviewer ran no tests, build, lint, seeders or database writes.

**Scope:** relevance of optional listing combinations; seller-authored selection continuity; clear customer language from Browse to Order; preserve current mobile shell, sheets and permissions. The Quick Deal/offline/kiosk/location finish scope remains in document 37 and is not being built by this focused Orders repair.

## 1. Observed user failures

- The user opened a delivery Order from the DC-892 group and received “The Work contract version is not supported.”
- Chain pages expose implementation terms such as “Multi-Party Relay,” “Execution Relay Pool,” “DAG Dependencies,” raw `part_ready` / `delivery_signed` codes, and “Open handoff relay.”
- The user reported that a selected help/service listing suggested goods-style delivery; exact current saved data for that reported listing has not been inspected in this audit.

Read-only production-like local data inspection identified ORD-00000005 with Work shape `A2`, contract1/schema1 and `{"stages":[]}`. Current registry supports A1/A3/A4/A9. This establishes the legacy-contract mismatch without approving a shape conversion or reseed. Safe summary access and supported execution are separate concerns.

## 2. Recommendation call path

1. `DealChainCatalog::optionsFor()` filters listing type/optional Work Shape, but category mismatches move into `other_recipes` rather than becoming universally ineligible.
2. Service authoring calls `optionsFor(null, 'service')`; the client combines catalog buckets and offers “Browse All Compatible” without enforcing all selected category/shape constraints there.
3. Saved `deal_chain_combinations` and `deal_chain_specification` exist in listing versions. Public combination selection reads combinations, not the whole saved specification.
4. ListingDetail -> PicksDrawer -> BundleChainModal calls `getRecipesForCategory(category,type,shape)`. The public chooser is not simply an unfiltered all-catalog list.
5. A saved combination ID and a separately attached global recipe can coexist at checkout.
6. `StageDealChain::resolveItems()` checks the saved combination ID exists; `nodesFor()` / `dependenciesFor()` construct from the global recipe rather than the selected seller-owned graph.
7. Direct booking preserves a combination ID but does not construct all its partner needs/invitations/dependencies.
8. Server/client fallback paths can replace missing or explicitly empty catalog data with sample recipes; authoring has unrelated default combinations.

## 3. Findings and small safe fixes

| Priority | Source-supported issue | Consequence | Required correction |
|---|---|---|---|
| P1 | Selected saved graph is not the plan source in `StageDealChain` | Buyer may select specific providers/steps but receive only the primary need or an unrelated global graph | Resolve exact saved combination from pinned listing version; stage its actual needs, preferred listings and dependencies; keep independent provider consent; no automatic billing |
| P2 | `courier_delivery` catalog declares home-help/on-site service compatibility while beginning with a product handoff | Goods-style delivery can pass both frontend and server eligibility for a service | Remove unsupported combinations; transportable service outputs need an explicit matching contract, not broad category/title inference |
| P2 | New listing authoring preloads named parts/courier/installer examples | Unchosen examples can become apparently seller-authored offers | Start with no optional combinations; add only after explicit seller selection |
| P2 | Empty catalog falls back to synthetic recipes | “No published options” becomes recommendations and can imply fabricated trust/provider/pricing | Preserve explicitly empty data; confine examples to explicitly marked specimen/test surfaces |
| P2 | Listing selects default or first saved combination and cannot clear it | Opening a listing silently opts the buyer into extras | Offer Product only / Service only, initially selected for optional extras; details browsing does not attach or charge |
| P2 | Changing partner returns early when old `priceMinor` is missing | Picker closes without applying selected real provider | Apply valid selection independently of a prior estimate; unknown price stays unconfirmed rather than invented |
| P2 | Multi-Picks action and aggregate total route only the first item to ordinary booking | User expects multiple items but proceeds with one without explanation | Explicit one-at-a-time flow naming item/remaining Picks, or deliberately stage all selected needs; wording and totals match actual processing |

These are not claims about a concurrent patch's origin. Do not fix by only renaming delivery options: eligibility and selected-plan continuity must be correct.

## 4. Customer-facing model

### Summary level

- Product only
- Product with delivery
- Product with delivery & installation
- Service only
- Service with parts & delivery, only when genuinely supported

Use actual data, not generic recipe naming that invents included parts/providers. A saved custom seller title may be shown if accurate.

### Details level

Tap/click “View details” to show actual product/service and provider for each part, confirmed price versus estimate versus “Price not confirmed,” what's included/additional, separate payment recipients, current responsibility, and named prerequisites such as “Installation starts after delivery is confirmed.” Show “Provider not selected” for an open role. No hover-only essential details on mobile/keyboard.

The Order group is understandable coordination, not one pooled payment or shared provider liability. Public page labels should explain the user's next action, not expose database DAG/slot terminology.

“Open handoff relay” opens a scoped shared conversation. Label it “Group messages”; retain its participant restrictions and content privacy. Order detail navigation becomes “View order.” A2 is not relabeled A4 merely to make a button work.

### Approved interface direction for the focused implementation

The user approved the ecommerce-style before/after direction. Apply it within the existing Serbizyu visual system, not a new theme or a separate agent/kiosk UI.

- **Listing:** make the main product/service, included scope and price clear first. Optional combinations require explicit selection; Product only / Service only remains available. Show only relevant, actually offered options.
- **Combination:** use a concise, accurate name such as Product with delivery & installation. A tap/click-accessible detail view reveals real providers, included/additional scope, confirmed prices versus unknown estimates, and the work sequence. Viewing details never selects, accepts or charges.
- **Deal Chain:** present a recognizable group of independent orders. Show title, informational combined amount when authorized, actual Order/Work/Payment states, and the server-supported next responsibility. Do not infer current readiness from a static dependency edge.
- **Order:** put the current permitted task first, with the required tools beside it; keep agreement, payment, evidence and history discoverable. Waiting and unavailable states explain who must act or how to recover without inventing a completion action.
- **Mobile:** preserve the existing header, Glovo sheets and one contextual bottom action dock; no stacked fixed global navigation. Keep labels, prices and provider names readable at narrow widths; verify keyboard, safe-area and focus behavior.
- **Desktop:** use width for the task plus relevant terms/payment/activity context, rather than a stretched mobile stack. Use one stateful form per action, not separately mounted mobile and desktop copies.
- **Action hierarchy:** one primary next action, limited secondary actions, and deliberate placement/confirmation for provider withdrawal or other consequential changes. Do not make destructive actions the dominant routine controls.
- **Language and truth:** short, familiar labels; no customer-facing DAG/relay/slot jargon, unearned verification badges, invented provider/price, implied pooled payment, or payment settlement inferred from Work. Preserve authoritative saved titles and history rather than rewriting data for cleaner presentation.

This approval establishes the implementation target; it does not mark recommendation defects, complete responsive redesign, or future end-to-end checks as finished. Fix eligibility and selected-combination continuity alongside presentation so a simpler label cannot conceal incorrect behavior.

## 5. Finite QA checks

Every case is **NOT RUN** here:

| Case | Required result |
|---|---|
| On-site/help service vs goods | No product/courier suggestion unless actual authored fulfillment supports transporting an output |
| Type/category/Work Shape compatibility | Client selection and server staging reject invalid recipe AND saved combination |
| New listing / empty catalog | No unrelated automatic combinations, synthetic partner or verified-fulfillment claims |
| Optional extras | Product/Service only can be selected; view details does not attach a combination or change payable terms |
| Saved custom graph | Exact pinned saved providers, needs and dependencies survive selection, staging and refresh |
| Open-price partner replacement | Real selected provider persists even with no previous estimate; no invented price |
| Inactive/depleted/changed partner | Availability revalidated; recoverable conflict; no silent substitution or duplicate commitment |
| Multiple Picks | Processed items, action wording and displayed totals agree; remaining items are explicit |
| Group details and messages | Plain language, actual refs, understandable waiting conditions; correct participant access; no sibling financial leakage |
| Mobile/desktop/keyboard | Same permitted operations; details reachable without hover; usable sheets/focus/dock |
| Historical unsupported Order | Authorized user can inspect recorded summary; Work execution remains blocked; no data/history rewrite |
| Work/payment separation | Selection/staging is not acceptance; receipt/Work completion is not settlement |

## 6. Execution order

1. Finish the currently scoped Order summary/readability repair and preserve unsupported execution guards. Do not run destructive fixture repair.
2. Correct eligibility, automatic defaults and empty-catalog handling as one recommendation-truth slice.
3. Correct exact saved-combination selection, optional Product/Service only choice, review and staged-plan continuity; qualify independent invitations and child formation without automatic acceptance.
4. Correct open-price partner change and honest multi-Picks progression.
5. Add Deal Chains offer discovery only after its shared listing-version/combination selection path works; never create a second composite Listing or checkout. Qualify each cut with actual actor sessions before proceeding.

Later matching algorithms, graph visualization, Quick Deal and GIS expansion are not prerequisites for correcting these demonstrated recommendation defects. Document 37 remains the overall finish map; this audit scopes the concrete browse/Order usability gaps within it.

## 7. Focused Orders repair evidence

The parent implemented and exercised the separate Order readability fix after the read-only reviewer returned. This does **not** close the recommendation findings in §3.

- Authorized Order detail now projects actual persisted Work identity/status and `execution_available: false` for unsupported historical shape/version. It does not fabricate nodes, map A2 to A4, or alter accepted records. Completion/sign-off/native Work commands remain fail-closed.
- Order/Deal Chain pages now use canonical references, “Orders in this deal,” “View order,” and “Group messages.” Known status labels are readable; role badges use explicit domain fields rather than matching words such as “inverter.” Legacy `node_role=legacy` remains unknown/generic instead of inventing a provider role.
- Group cards keep separate Order/Work/Payment states and an informational sum of separate orders. Static dependency rules say “Starts after …” rather than falsely claiming a still-unsatisfied wait from every active edge.
- Mobile card layout separates price/status from the title/provider column so text is not squeezed into a few characters.

### Exercised checks

| Check | Observed result |
|---|---|
| Focused PHP: WorkClearanceChallenge, T4 registry, A4 handoff proof, A9 delivery | 50 tests passed, 1,011 assertions |
| Chain product-party privacy and Order transition pipeline | 3 tests passed, 33 assertions |
| Order Show, DealChainDetail, ConversationDrawer Vitest | 36 tests passed |
| TypeScript + production Vite build | Passed; existing large-bundle warning remains |
| Pint dirty-file formatting | Passed |
| UI detector on Order Show, DealChainDetail, ConversationDrawer | No findings returned |
| Live authenticated HTTP for DC-892 and ORD-00000005 | Both returned 200 with correct Inertia components; legacy A2 detail retains reference and explicit read-only Work availability |
| Browser, existing local synthetic buyer | Real password login; group -> delivery Order navigation succeeds; recorded status and Payment details remain visible; Group messages drawer opens |
| Browser widths | 375px mobile and 1365px desktop inspected via screenshots; no horizontal document overflow in inspected surfaces |

The PHP regression asserts unknown shape/version read availability, wrong-user denial, supported canonical reads, and no Work/Order/event/audit/outbox mutation on the read or rejected execution. No local database reset or reseeding was performed. Browser verification opened the existing scoped conversation but sent no message and did not execute withdrawal, payment or Work actions.

### Still not qualified or repaired

Recommendation eligibility, default/sample fallback, exact selected-combination continuity, optional-only choice, open-price partner replacement, and multi-Picks behavior remain source findings awaiting their own fix/qualification slice. Historical A2 Work is now inspectable but still cannot execute; conversion of historical contracts would require a separately reviewed data/contract decision. Full end-to-end commerce, all responsive states, live payments, and Quick Deal/offline/kiosk functionality are not certified by these focused checks.

## 8. Implementation boundary after the user-directed recheck

The user requested a deliberate baseline/slice check before continuing, not unrelated fixes. Both implementers were stopped. No staging or buyer-checkout edits were applied by that work. Preserve the earlier Orders repair and the document-37 finish scope.

### Current draft state, not an accepted feature

- The catalog/authoring draft modifies `DealChainCatalog.php`, `TagudinDealChainCatalog.php`, `dealChainRecipes.ts`, `DealChainCatalogModal.tsx`, `CreateService.tsx`, and `CreateProduct.tsx`, and adds `DealChainRecipeEligibility.php` plus `dealChainRecipes.test.ts`.
- It removes unrelated initial combinations, preserves empty catalogs, and restricts the physical delivery recipe. It still lacks completed authoring/PHP coverage and caller-wide verification. The desktop global navigation still imports the static sample recipe catalog; that is a remaining route around an empty server catalog.
- `StageDealChain.php` was not changed. It still validates a saved combination ID without using the exact saved graph to construct the staged plan.
- ListingDetail/Picks/Browse optional-only selection, partner change and multi-item progression are not changed by this draft.
- Parent corrected only compile errors in the paused draft: use the existing `selectedTemplate`, remove unused derived arrays, and allow the compatibility predicate to accept the real string recipe ID contract. No new recommendation or checkout feature was added by those corrections.

### Baseline checks actually exercised

| Check | Result |
|---|---|
| Focused recipe eligibility Vitest | 5 passed |
| TypeScript after compile-only corrections | Passed |
| Recipe + product/service authoring Vitest | 24 passed, 4 failed |
| Authoring failures | Three product tests still assume automatic sample combinations; one custom-service workflow test timed out. Its cause has not been isolated. |
| PHP recommendation/staging integration and real browser continuation for this draft | NOT RUN |

The earlier Orders checks in §7 remain historical evidence for that focused patch; they do not qualify this later draft. Do not restore automatic sample offers merely to satisfy old tests, or increase timeouts to hide a workflow failure.

### Next acceptance slice: relevant optional offers, one complete path

**User outcome:** a simple on-site/help service does not acquire an unrelated automatic goods-delivery offer, while eligible physical products can explicitly offer delivery and intentionally authored service-with-parts/delivery combinations survive. New/edit-empty listings do not invent combinations; an empty published catalog remains empty through every ordinary chooser, including global navigation.

**Included:** existing recipe compatibility, authoring defaults and both tabs, real catalog consumers, explicit-saved-offer preservation, and the affected tests/browser path. No schema or new recommendation framework.

**Exit evidence:** service/no-delivery and physical-product/allowed-delivery cases; new/edit-empty authoring submission; empty-catalog behavior through actual entrypoints; unchanged saved listing history; server rejection of an incompatible explicit recipe with no partial chain; desktop/mobile checks. Complete this slice before starting the saved-graph construction change.

**Following slices, still in scope:** (1) exact selected seller combination reaches staging and independent invitations, together with explicit Product only/Service only and correct direct-vs-chain routing; (2) truthful partner changes and multi-Picks progression. Each gets its own observable result and no-double-effect recovery check. Do not fix all three concurrently across shared checkout files.

This is an execution checkpoint within the existing audit, not another whole-project roadmap. No recommendation slice is currently reported complete.

## 9. Recovered listing-partnership decision: preserve authored offers

Earlier decisions explicitly support seller-curated partner extensions. Document 18 §§1–3 defines a single-owner base listing with optional preferred partner offerings and buyer substitution. `CONTEXT.md:43–53` names the reusable Catalog Set separately from the seller-owned versioned Deal Chain Specification/Combination. The final requests/quotes specimen includes a saved “Cool Again” combination on Listing Detail. These sources establish the concept; they do not prove every current entry path works.

The implementation boundary must distinguish three things:

1. **Seller-authored combination:** deliberately saved with the actual listing version, real partner offerings or explicit open roles, and authored terms/dependencies. Preserve it. A service may legitimately offer parts/delivery or transport of an actual physical output; do not ban every service+delivery combination based on the word “service.”
2. **Reusable catalog template:** an authoring starting point, not itself a seller offer, affiliation agreement, confirmed partner booking, or consumer package.
3. **Platform-generated/default suggestion:** not authored by the seller. Remove inappropriate automatic/sample offers; do not confuse that correction with deleting legitimate saved combinations.

One seller-owned combination can have two discovery entrances: (a) choose it on the base listing; (b) discover its named card in a Deal Chains browse view. Both should resolve the same base listing version and combination ID, not a new synthetic jointly owned Listing or a separate pricing/checkout implementation. A Deal Chains browse view is a mechanism/filter presentation over actual published combinations, not a replacement for the underlying product/service category. Current inspected Browse has Listing/Request tabs and service/product filters; a consumer Deal Chain offer-discovery projection is not established by the existing recipe catalog or order-group page.

Keep same-provider packages/add-ons distinct from independent partner offers. A normal package modifies the base seller's scope; a partner combination coordinates independently accepted listing agreements. Publication/preference is not proof of partner consent, available capacity, or formal commercial affiliation; do not invent commissions or automatic booking. Older `STANDARD_AUTO_BIND` proposals require an explicit active preauthorization contract and must not be assumed from a displayed partner name.

**Revised acceptance check:** no unrelated automatic delivery on a simple on-site service; a deliberately authored service-with-parts/delivery or deliverable-transport combination survives unchanged; a real product-delivery combination remains usable; base listing and Deal Chain discovery entry select the same saved offer/version. No application code was edited during this clarification.

## 10. Concrete next cut after the partnership clarification

Implementation specification: `_bmad-output/implementation-artifacts/spec-truthful-listing-offers.md` (draft; separate review before resuming application edits).

**First finish the paused truthfulness cut**, rather than adding a new discovery surface over an unreliable selection path. Preserve authored offers; remove automatic/sample offers and catalog fallbacks; align generic-template compatibility on client/server; use actual listing candidates and honest unknown-price/reputation states. Replace sample-dependent authoring test arrangements with explicit saved fixtures, and isolate the unresolved service-workflow timeout without increasing its limit.

The baseline recheck also found that `CreateProduct.tsx` currently filters out saved combinations with labor slots when category changes. This is not just the paused recipe helper: the implementation must stop silently deleting intentionally authored partner configurations. Template eligibility and saved-offer preservation are separate decisions.

**Then execute the shared path:** explicit Product/Service only or one saved combination → version-pinned review → staging the exact saved nodes/bindings/dependencies → independent provider invitations and acceptance → child Orders. The current staging test’s saved combination has `nodes: []`; it proves selected pricing fields, not non-empty saved-graph continuity. Use a real multi-node fixture for the next cut, and do not call the path complete because a combination ID survives.

**After that:** truthful partner replacement and multi-Picks progression, then the Deal Chains discovery view. Discovery selects the same base listing version and combination ID; it is not a new listing type or second transaction system. Quick Deal/offline/helper and bounded location-tool scope remain saved in document 37; they are not silently cancelled or mixed into this immediate cut.

No application code was changed during this planning checkpoint. The existing 24-pass/4-fail authoring baseline remains unresolved evidence, not a fresh test run or a completion claim.

## 11. Independent reviewer corrections incorporated into the handoff

Two read-only reviewer contexts assessed the draft: backend eligibility/transaction boundaries and frontend authoring/chooser continuity. Neither ran tests or changed application code. The backend review found no need for schema changes or saved-graph staging in the first cut. The frontend review required the following concrete additions before handoff; these and the backend test corrections are incorporated in the draft specification.

### Authoring round-trip, not just array preservation

`CreateProduct.tsx` hydrates `deal_chain_specification.selected_combo_id`, but its submission currently omits that field, uses the selected combination ID as recipe provenance, and hardcodes catalog version 1. Preserve selected combination identity separately from `based_on_recipe_code` / `based_on_catalog_version`. Exercise an authenticated edit → category change → save → rehydrate with nonempty product-delivery and service-parts-delivery fixtures, including real listing bindings, explicit open roles, dependencies and provenance. This repairs authoring persistence, not staging.

### Unknown candidate facts must survive the entire authoring chain

Bounded files: `DealChainCatalog::partnerListings()`, `resources/js/marketplace/types.ts`, creator-local candidate types/mappers, `resources/js/components/marketplace/SlotListingPickerModal.tsx`, both creator selection handlers, and `resources/js/components/mobile/DealChainCustomizerModal.tsx`.

The source contains more than backend demo appending: picker confirmation converts missing price to zero and displays fallback 4.9 ratings; product conversion also defaults price/rating; service selection assumes arithmetic prices; the studio can invent a fee of 50. Removing backend guesses alone is not the fix.

Represent unknown prices distinctly from known zero through picker confirmation, studio editing and saved authoring payload. Show quote-required/unknown facts honestly; never serialize unknown as free or a sample fee, or present a final payable sum while a component is unpriced. Do not manufacture ratings/verification. Add a missing-price/missing-rating selection-and-save case alongside a genuine-zero-price case. If shared candidate typing affects Browse/ListingDetail/Picks/navigation, limit those callers to safe unknown handling; actual partner-substitution behavior and basket-repricing redesign remain the next cut.

### Displayed catalog and attached catalog must be identical

`DesktopGlobalNav.tsx` both renders static recipes and resolves attachments from the static index. Replace both using one effective supplied catalog/index. Missing/explicit-empty props stay empty. A positive test must supply a recipe whose graph/fee differs from the canonical sample and prove that selecting it attaches the supplied recipe. Update the positive `PicksDrawer.test.tsx` chooser case with an explicit recipe fixture; retain an independent missing-catalog empty-state case.

Affected frontend suites: both creator tests, `dealChainRecipes.test.ts`, `DesktopGlobalNav.test.tsx`, `PicksDrawer.test.tsx`, `SlotListingPickerModal.test.tsx`, plus existing Browse/ListingDetail/Picks tests if their shared-type handling changes. Do not infer a cause for the unresolved service workflow timeout from this source review.

### Explicit-template validation and exact negative-side-effect boundary

In `StageDealChain::resolveItems()`, retain validation before `IdempotencyGuard::begin()`. Apply the product+A4 override to explicit generic `courier_delivery`, including historical broad template metadata, while retaining normal published-recipe/category validation. Do not restrict every saved graph containing a courier. Positive fixtures include product+A4 delivery and legitimate service `turnkey_parts`.

For a mixed request containing one valid item and one incompatible explicit template, assert no added chains, needs, invitations, dependencies, notification intents, staging audit/outbox records, or reservation for the supplied idempotency key. This is the pre-reservation template-validation path. Do not silently widen this cut to repair all existing failures that occur after reservation inside later staging work.

`TagudinCatalogSeederTest.php` currently requires a compatible recipe for every seeded browse listing. Replace that universal availability assumption with explicit eligible/ineligible cases, including an honestly empty courier/service result. Keep seed idempotency assertions independent of recommendation availability. Do not restore overbroad compatibility to make this test green.

**Plan-review result:** corrections integrated; specification remains draft pending the implementation checkpoint. No new runtime PASS is claimed.

## 12. Connected-screen design and continuation acceptance

The user requested ASCII previews and assurance that changes follow the existing design system across the whole affected journey, while retaining later Quick Deal and better Orders views. This is a design/planning contract, not evidence that the proposed screens exist or have passed browser QA.

### Visual and interaction authority

Reuse the incumbent Serbizyu palette, type/control hierarchy, white bordered cards, existing header and navigation. For bottom sheets use the locked Glovo asymmetrical wave contract in `.ai/rules/ui-kit.md` and the existing `GlovoWaveModal`: transparent outer wrapper, white scrollable content and the original wave cap. No new theme, separate kiosk design, or competing sheet implementation. Short familiar labels; visible keyboard focus; essential details available by tap/click, not hover alone.

On mobile, use one contextual action dock with safe-area/content clearance; do not stack a second fixed navigation/action bar. On desktop, use available width for the current task and relevant context, not decorative tools or a stretched phone column. Keep one stateful action form; do not mount independent desktop/mobile copies.

### Surface coverage by owning cut

| Surface / source | Required connected behavior | Owning cut |
|---|---|---|
| Product/service creators | Author deliberate offers, preserve selected combination/provenance, no invented partners or missing-price-to-free conversion | Current truthfulness cut |
| `Browse.tsx`, `ListingDetail.tsx` | Same eligible catalog facts; base listing remains clear; optional Product/Service only and explicit saved-offer choice; viewing details is not selection | Truthfulness now; saved selection next |
| `Picks.tsx`, `PicksDrawer.tsx`, `DesktopGlobalNav.tsx` | Same offer identity, pricing facts and actual supplied recipe; ordinary and global entrypoints do not disagree | Truthfulness now; substitution/multi-Picks next |
| `BundleChainModal.tsx`, `DealChainCheckoutModal.tsx`, shared partner picker | Actual participants/open roles, unknown prices, inclusions and independent payments; review is not provider acceptance or payment | Shared chooser facts now; exact saved-plan review next |
| `Orders/Index.tsx`, `Orders/DealChainDetail.tsx` | Reach actual Order/reference; recognizable independent orders, permitted group messages, truthful server-provided responsibility; no inferred dependency readiness or pooled payment | Next real formation-to-Order journey; retain prior repair |
| `Orders/Show.tsx` and existing Work/payment/message panels | Task-first desktop/mobile workspace; separate Agreement/Work/Payment facts; required tools only, evidence/history/terms reachable | Targeted Orders workspace within core journey, before final qualification |
| `QuickDealScanModal.tsx` and future transaction/receipt views | Familiar shared design and canonical Order continuation, not a second checkout/receipt authority | Document 37 F3/F4; not implemented by the current cut |

Apply a changed shared semantic contract to every affected caller in the same cut. This matrix is not permission to redesign every screen now. Later-owned behaviors remain explicitly pending rather than hidden behind a visually complete mockup.

### Orders composition to implement and prove

Mobile hierarchy: reference/title and counterparty → separate Agreement/Work/Payment facts → who acts next and why → current task/evidence → details/payment/activity access → one contextual dock. A supported buyer review state may show Message and Review work; provider execution instead exposes the active step's required tools. Do not display every possible photo/map/checklist/handoff/payment tool at once or let a tool grant step clearance.

Desktop uses the same hierarchy with a wider task/evidence area and a secondary terms/payment/activity column. Keep the primary action beside its task; mobile places that same action in its dock. One stateful action and identical server permissions across layouts.

Waiting states show the actual responsible person or prerequisite when supplied. Unsupported historical Work keeps its readable summary, terms, payment and help access without executable Work controls. A courier, provider, buyer and unrelated user must not gain each other's private details merely because the group view is wider.

**Current source limits:** `Orders/Show.tsx` remains a `max-w-4xl` vertical stack with a fixed footer; the full desktop workspace above is not built. `PicksDrawer.tsx` currently implements its own full-screen/mobile and desktop slide-over shell, rather than using `GlovoWaveModal`. This requires an explicit component-alignment decision in its owning UI cut; do not claim blanket wave-sheet compliance or rewrite it ad hoc during eligibility work. Preserve usable long-cart access: a proper full-page Picks destination is a page, while an actual bottom-sheet treatment must follow the shared sheet contract.

The shared primitive is not itself proof of compliance: `GlovoWaveModal.tsx` currently uses a mobile `max-h-[88vh]` while the locked rule caps sheets at 85%. Check the primitive against the pinned contract as well as migrating callers; record this concrete mismatch for the owning UI cut rather than claiming that using the component alone passes design QA.

### Cross-screen exit evidence

For each owning cut record the actual route, actor, fixture/version, action, expected/observed outcome and screenshot reference. Inspect at 375px mobile and desktop, keyboard/focus/scroll/safe-area, loading/empty/error, long titles and unknown prices, pending/waiting, refresh/back/relogin, wrong-user and stale/retry recovery. Desktop and mobile must expose the same permitted operation without duplicate submissions or hidden required information. Classify controlled-response fixtures separately from live-server evidence.

Record implementation/QA status against these rows when continuing; no fresh whole-site PASS is claimed here. The next session resumes the first unfinished cut from the draft specification and this audit, retaining the current 24-pass/4-fail baseline until actually resolved.

## 13. Service-first prototype gate; listing builders unchanged

The user clarified that the listing builder already has the seller partnership/Deal Chain authoring section and was not requested for modification. The prior recommendation to route immediate work into builder defaults/category/provenance repairs was too broad. Do not execute those earlier tasks or revert existing application edits as an incidental cleanup.

**Current outcome:** preserve the existing builders; preview the customer-facing service listing's explicit choice between Service only and a real saved seller partnership, review of independent agreements, useful mobile/desktop Order views, and Quick Deal's online/offline/helper states. Products remain supported where relevant, including parts in a service partnership; they do not lead this consumer design.

Artifacts live beside the existing final-kit specimens in `docs/design-kit/sessions`: `service-journey-prototype.html`, `service-orders-prototype.html`, `quick-deal-journey-prototype.html`, and shared `service-journey-prototype.css`. These are isolated HTML previews using the established kit, not application routes or replacement builder components. Open the first HTML file and use its Service / Orders / Quick Deal navigation.

All transactions, identities, lookups, confirmations, evidence and synchronization are synthetic and in memory. Refresh resets the preview. No claim of real authorization, offline persistence, signing, server reconciliation, stock safety, payment settlement or production end-to-end completeness follows from a working mock.

Review these screens before approving the production consumer cut. Then implement existing saved-offer selection/review/staging continuity and targeted Orders improvements. Quick Deal retains document 37's record/protocol/security checkpoint; a visual preview is not an implemented offline protocol.

### Prototype browser evidence

Evidence class: local-file HTML, synthetic in-memory interactions, isolated Chromium profile. This is **not** Laravel/browser qualification of the application or proof of production authorization/offline durability.

| Exercised preview | Observed result |
|---|---|
| Service only / authored partnership | Service only stays selected when details are opened/closed; an explicit choice selects the saved partnership. A no-partnership listing has no attached courier option. |
| Review / independent acceptance | The selected example retains service 450 + part 180 + delivery 35 = PHP 665; each provider is accepted separately before the accepted-Orders example link appears. Unknown delivery price blocks sending until the preview quote is reviewed. |
| Service-only versus group Orders | Service-only lists one active service and only its service selector. The partnership reaches the three independent child examples; delivery has its own courier/title/PHP 35, not product/service details. |
| Work / payment / role / history | Buyer review changes the demo Work to Reviewed while payment remains Cash unpaid. Provider tools are role-specific; waiting names the missing visit-time confirmation; historical Work has no executable Work action. |
| Profile/listing lookup and exact reference | Profile lookup requires a service choice; sample listing preselects but does not confirm. Existing-Order acknowledgement requires an exact entered reference. No QR camera/credential or real Order lookup is implemented. |
| Quick Deal participant confirmation | Both preview identities confirm their own side for the online record. A printed-card one-phone example remains Pending follow-up and blocks counterpart confirmation until explicit online follow-up. |
| Offline / helper / changed terms / concern | Repeated simulated reconnect retains one demo record/reference; helper identity can record assistance but both participant controls stay disabled; changed terms clear confirmations and retain prior readable versions; a recorded concern remains visible after identity changes. |
| Record copy | The local-file browser presents a selectable text fallback containing the pending confirmation facts when Clipboard access is unavailable. |
| Responsive surfaces | Service, Order and pending Quick Deal screenshots inspected at 375px and 1365px; observed no horizontal document overflow. Mobile has one contextual dock; desktop has none of those mobile docks. Service wave sheet measured below the 85%-viewport cap with transparent outer surface; Escape closed it and restored focus to its trigger. |

Screenshots: `.impeccable/review/service-consumer-preview/` contains `service-desktop.png`, `service-mobile.png`, `order-desktop.png`, `order-mobile.png`, `quick-deal-desktop.png`, `quick-deal-mobile.png`. These are specimen captures, not live application data.

The design detector ran once. It reported inherited kit font/glow/stripe heuristics (including the pinned Plus Jakarta Sans and unused imported kit styles); it did not return a clean result. Preserve the established brand and evaluate rendered surfaces rather than replacing the theme to silence these findings. Final independent prototype review is recorded separately below.

**Resume:** open `service-journey-prototype.html`, inspect Service only versus Cool Again and its details/review, then follow the Orders example or the header's Quick Deal link. Use the clearly labeled preview scenario/identity controls to inspect alternate states. Gather screen feedback before implementing the consumer path. Do not edit the listing builders or treat prior authoring failures as this preview's work queue.

### Independent prototype review and corrected findings

The visual and consent-flow reviewers each returned specific prototype fixes. The parent corrected them and exercised the changed paths in the actual HTML browser:

- Edited terms now mark the version unreviewed; confirmation controls and their handlers reject confirmation during editing. A forced click while amount 0 was being edited left the party unconfirmed; Review rejected that amount. A valid fresh review re-enabled the appropriate party.
- The readable and copied record includes the agreed scope/details from its recorded snapshot, including the explicit one-unit/no-replacement-parts example.
- The single identity selector is beside the confirmation controls, including on mobile; no duplicated identity state or production authentication is implied.
- The sample part delivery is scheduled 9:00–9:30 AM, before 10:00 cleaning, without changing the 450/180/35 amounts.
- A final reset/version-label check showed Review version 1 and record version 1 consistently; screenshots were refreshed.

**Verdicts:** the consent-flow reviewer scored its three findings resolved; the visual reviewer scored its three findings resolved. Two findings overlap. These are verdicts on the listed fixes, not a fresh all-surface or production certification. The inherited detector warnings remain documented above.

**Current handoff status:** interactive mocks and their browser evidence are complete for user screen review. Production implementation remains unapproved; listing builders remain out of scope. Keep the three HTML files with their sibling shared CSS and existing kit/assets; they open directly without installing/building a framework. Nothing was committed or switched to a new branch, preserving the user's existing working tree.

## 14. Quick Deal mobile-first replacement after user feedback

The user explicitly said Quick Deal is primarily mobile and that the first mock did not feel right. Accept that feedback: the wide, all-cases-upfront form is superseded. Earlier functional-review verdicts did not establish that its mobile interaction was appropriate.

Only `docs/design-kit/sessions/quick-deal-journey-prototype.html` was replaced in this revision. The service listing preview, Orders preview, shared stylesheet, listing builders and production application remain unchanged. Existing Serbizyu kit typography, navy/white/mango and wave-sheet shape remain authoritative.

| Before | Replacement | Why |
|---|---|---|
| Purpose cards, device scenarios, identity switching, form and record competing on one long page | Scan-led, one task at a time: identify → choose a listed service when required → review → own-side confirmation → compact pending/confirmed record | Primary use is a quick interaction on a phone, not a desktop transaction workstation |
| Scenario controls mixed into the customer ceremony | Clearly labeled Preview cases outside the phone flow | Unusual cases remain inspectable without making every customer configure them |
| Desktop columns collapsed into a long mobile stack | Full-height mobile shell with an internally scrollable task and one bottom action; desktop shows a bounded 440px phone preview | Prevents a desktop-first composition from dictating the mobile experience |
| Full editable form and duplicate record copies always visible | Amount/details/purpose edits and readable-copy/history views open only when needed | Keep exact terms accessible without overwhelming the main task |

### Retained behavior and actual browser evidence

Evidence class: HTTP-served synthetic HTML at `http://10.22.25.201:8080/design-kit/sessions/quick-deal-journey-prototype.html?v=mobile-first`, isolated Chromium, no real transactions.

- Profile QR example requires actual service selection; a listing QR example preselects the service but never confirms it.
- Buyer phone starts at the seller QR; seller phone selects its actual service before the customer QR. The seller's own confirmation leaves Maria pending.
- Only the current preview party confirms its own side. Another party’s follow-up is entered explicitly through the external preview controls; no customer-facing identity dropdown approves both sides.
- One-phone/card confirmation remains pending. Offline profile lookup without a known listing stops with a connection requirement; the saved-listing example retains online checks pending. Simulated reconnect does not add a second record.
- Helper confirmation records only an assistance statement; observed zero confirmed participants and “Waiting for both people.”
- Invalid amount 0 stays in the edit sheet and is not applied. Reselecting a different service after a recorded version archives the original details/confirmations/concern, increments the version, and requires fresh confirmations.
- A concern remains recorded after the other party’s follow-up. Work and payment remain unchanged in the readable copy.
- Existing-Order purpose requires an entered exact reference. No real Order is looked up or mutated.

| Scan-entry viewport | Document height | Horizontal overflow | Phone width | Action footers |
|---|---|---|---|---|
| 320 × 640 | 640px | None observed | 320px | 1 |
| 375 × 812 | 812px | None observed | 375px | 1 |
| 1365 × 950 | 950px | None observed | 440px | 1 |

Current captures under `.impeccable/review/service-consumer-preview/`: `quick-deal-mobile-first-start.png`, `quick-deal-mobile-first-small.png`, `quick-deal-mobile-first-review.png`, `quick-deal-mobile-first-pending.png`, `quick-deal-mobile-first-desktop.png`. Review/record content may scroll inside the phone; it no longer produces the earlier several-thousand-pixel document.

The detector ran once on the replacement and reported a preview-toolbar padding heuristic plus inherited kit font/glow/stripe heuristics. It did not return a clean result. The captured toolbar is flex-centered; do not sacrifice the phone-first layout or replace the pinned brand to silence generic heuristics.

**Next:** the user reviews the phone feel at the refreshed URL. This is still a synthetic mock: camera is off, QR lookups and identities are examples, reload clears state, and no durable offline storage/signing/authentication/real synchronization or canonical Order effect is implemented. Keep document 37’s F3/F4 protocol/security gate; do not interpret the new visuals as production approval.

## 15. Final approval requirement after the mobile preview

The user requested stronger final transaction confirmation, distinct from the account password, to address wrong entry and missing-party/overnight acceptance risks. The recommended contract is saved in document 37 §11. This does not authorize a new reusable account/transaction PIN or implement Quick Deal authentication.

- Distinguish identity lookup, account authentication, resource authorization and approval of exact terms/action. A public QR does only lookup.
- Recommend normal explicit approval in the participant's own authenticated app, with a transaction-bound confirmation QR/link or one-time confirmation code as supported alternatives. A code must be independently obtained by the approving party; a code shown/entered only on the preparer's phone does not prove counterpart consent. SMS remains an optional verified-channel fallback, not a mandatory cost on every deal.
- Pending/expired/silent is never accepted. An overnight job or synchronization retry cannot supply the other party's consent. Wrong entry must remain editable/withdrawable before acceptance; edits invalidate old challenges and require fresh review. Preserve prior records and normal recovery after accepted facts exist.
- Separate agreement approval from Work sign-off, item/service receipt and payment acknowledgement. Existing Work challenge kinds must not be repurposed to approve Quick Deal agreements.

**Observed source/runtime evidence:** `WorkClearanceChallengeService` binds Work challenges to authorized issuer/verifier, kind, Work signature/version and node, checks expiration/replay/attempts, and records consumption before verified advancement. Deal Chain confirmation checks an accepted active invitation and matching pinned terms/versions. A targeted source search found no named auto-accept/auto-confirm path in `app`, `config` or `routes`; `vendor/bin/sail artisan schedule:list --no-interaction` reported “No scheduled tasks have been defined.” This is local inspection, not proof against external automation or an independently reproduced overnight incident.

**UI limit at this design checkpoint:** the mobile HTML simulated “Confirm my side,” without actual identity proof or QR/code challenges. The subsequent visible-method prototype and its current limitations are recorded in §16. Neither a confirmation-method label nor a simulated challenge is a production security guarantee.

## 16. Final confirmation methods now visible in the mobile mock

The user explicitly requested seeing the final approval options in the mock, not just discussing them. `quick-deal-journey-prototype.html` exposes **Confirm as [signed-in name]** as the normal final action and **Other ways for [name] to confirm** as an alternative-method wave sheet. The sheet offers the named participant's own-account approval, confirmation QR, or one-time confirmation code; these are alternatives, not three required steps. Section 17 records the account-context correction prompted by the user.

### Mock behavior and boundaries

- Confirmation QR displays a clearly labeled, non-scannable placeholder for the intended party/version. Preview opening it shows a separate own-phone review; no approval is recorded until the explicit **Approve these terms** action.
- The code view is separate from the account password and requires a six-digit sample code. Sample private delivery is inspected only through **Preview cases → View [party]’s sample private code**, outside the customer flow; no SMS or secure delivery actually occurs.
- The in-memory challenge model scopes the method to the intended party, transaction/version, purpose and exact sample terms. Displayed challenge terms are captured when issued, not silently replaced by later edits. Mock validity is two minutes with five verification attempts; these are demonstration values, not approved production security policy.
- Changing terms invalidates active sample challenges and clears approvals for the new version. A successful approval is recorded once for that party; alternative outstanding challenges cannot overwrite it. Each party's method is shown in the readable record, without copying private codes into that record.
- Preview cases can expire a challenge, switch to a wrong signed-in example, or advance overnight. These controls demonstrate rejection/waiting; they do not establish real identity or execute background jobs.

### Exercised browser evidence

HTTP-served prototype at `http://10.22.25.201:8080/design-kit/sessions/quick-deal-journey-prototype.html?v=approval-methods`, isolated Chromium:

| Scenario | Observed mock result |
|---|---|
| Wrong code / exhausted attempts | Wrong six-digit code records no approval; fifth failed attempt blocks verification and offers a new code |
| Expired confirmation | Correct sample code rejected after simulated expiration; no acceptance fallback |
| Wrong signed-in party | Correct code rejected for the wrong party; returning to the intended sample account permits that party's approval only |
| Code approval | Maria confirmed via one-time code; Kuya Ben remained pending |
| Overnight waiting | Still Waiting for Kuya Ben; explicit “no automatic acceptance”; confirmed-party count stayed one |
| Confirmation QR | Opening its review left the confirmed-party count unchanged; explicit approval recorded the intended party's QR method |
| Replay fixture | Reusing a consumed sample challenge returned Already used; readable record remained unchanged |
| Changed terms fixture | Old challenge invalidated; retained amount PHP 450 while current terms were PHP 500; new version had zero confirmations |
| App / helper | Normal own-account approval remained available; helper saw no participant method choices and recorded assistance only, with zero participant confirmations |
| Responsive layout | Code screen at 320×640, 375×812 and 1365×950 had no horizontal document overflow, document height equal to viewport and one action footer; content scrolls inside the phone |
| Method sheet | Measured height about 432px at 375×812, below the 85%-viewport cap |

Replay/scope checks included direct page-state smoke fixtures in addition to ordinary click-throughs; none is a test of a server security boundary. No permanent tests were added for this throwaway mock.

Captures under `.impeccable/review/service-consumer-preview/`: `quick-deal-approval-choice.png`, `quick-deal-approval-methods.png`, `quick-deal-approval-qr.png`, `quick-deal-approval-code.png`, plus code `-small`, `-mobile` and `-desktop` captures. The design detector ran once and retained the known preview-toolbar/pinned-font/imported-kit heuristics; no clean detector verdict is claimed.

**Open it:** use a sample QR → review the selected service → Continue → **Other ways for [signed-in name] to confirm**. For code delivery, open the clearly labeled external Preview cases control. A request to the missing participant is a separate action, not the preparer's own confirmation.

**Production remains unimplemented:** no real identity checks, cryptographic QR payload, OTP sender, hashed server challenge store, durable offline storage, atomic server verification, scheduler or canonical Order/payment change exists in this HTML. Only the Quick Deal mock changed; listing builders, Service/Orders previews and production application remain unchanged. Document 37 §11 and F3/F4 remain the actual implementation/security gate.

## 17. Signed-in account is not the scanned counterparty

The user correctly questioned “Confirm in my account” when the person to approve is the other party. The mock now names the active example account in the header and uses **Confirm as Maria Santos / Confirm as Kuya Ben**. A scanned profile identifies a participant; it never changes who is signed in or supplies that participant's consent. Passing a logged-in phone to another person is not an account switch.

After the current participant confirms, **Ask [missing party] to confirm** opens a separate confirmation-request QR placeholder. It explicitly states whose account is currently being used and that this account cannot approve the missing party's side. Opening this request records no approval. The clearly labeled **Preview [party]'s own phone** action demonstrates a different authenticated session, returns to fresh review, and still requires that party's named confirmation.

No real login/account switch is implemented by this HTML. A production implementation must derive the authenticated actor from server authentication, bind any transaction approval proof to its actual approving participant and exact action/terms, and never treat a client-side persona value or scanned ID as authority. A trusted shared-device flow would need fresh participant authentication/independent verification and proper session isolation; otherwise the record remains pending.

**Browser evidence at the HTTP mock:**
- Maria's account remained Maria's account after scanning Kuya Ben's profile; the only own-side action was Confirm as Maria Santos.
- Asking Kuya Ben left Maria's context and the pending seller confirmation unchanged. Only explicit own-phone preview changed to Kuya Ben's example account; fresh review still preceded approval.
- Symmetrically, Kuya Ben's account remained active after scanning Maria's card. Confirm as Kuya Ben left Maria pending, and Ask Maria Santos did not switch accounts or approve for her.
- At 320×640 the account caption/header fit without horizontal document overflow; the header remained 62px and the document remained viewport-height. Browser errors returned none.

Current URL: `http://10.22.25.201:8080/design-kit/sessions/quick-deal-journey-prototype.html?v=account-context`. Captures: `quick-deal-named-account.png` and `quick-deal-request-other-party.png` under `.impeccable/review/service-consumer-preview/`. The detector retained the same preview-toolbar/pinned-font/imported-kit heuristics; no clean verdict is claimed. Only this mock and handoff guidance changed; real authentication, listing builders and application code remain untouched.

## 18. Recommended pause point: Quick Deal contract kept, core commerce next

The user accepted the clarified account/other-party concept and asked whether to continue Quick Deal foundations or finish Deal Chaining and Orders. Recommended direction: **pause dedicated Quick Deal implementation at this reviewed UI/contract checkpoint; complete the real saved-partnership-to-Order journey next.** This is not a claim that Quick Deal is complete or a deletion of its online/offline release scope.

### Keep the shared foundation now

Core commands must continue enforcing actual authenticated actor/participant authority, explicit approval of pinned terms, versions, transaction locks, idempotency, audit and independent Agreement/Work/Payment facts. Public QR and client-side persona values never supply authority; silence/expiry never supply missing consent. Strengthen only the guards exercised by the next real journey. No universal RBAC/Policy migration, new reusable PIN credential, Agent runtime or speculative approval/storage framework is a prerequisite.

The dedicated Quick Deal build remains pending: real public/confirmation QR handling, party/action/version-bound challenge verification, optional verified delivery, canonical transaction/receipt records and pre-Order concerns, durable offline capture/safe sync, and shared-device identity/storage isolation. Document 37 §11 and F3/F4 retain these requirements; prototype challenge values and client-side guards are not production foundation code.

### Next bounded production outcome

**Existing authored service partnership → explicit consumer choice/review → exact staged needs/dependencies → independent invitations/acceptance → real child Orders → useful mobile/desktop Order workspace.**

The source recheck confirms the concrete first gap: `StageDealChain` validates membership of `deal_chain_combination_id`, but `nodesFor()` and `dependenciesFor()` still construct from the published recipe definition; retaining the ID does not expand the exact saved seller graph. Fix that continuity before a new Deal Chains discovery view or more Quick Deal work.

1. Prepare the consumer-only implementation cut with explicit Service only versus an actual saved partnership; pin real listing versions, partners/open roles, quantities and terms. Stage the selected authored graph, not an unrelated global template. No listing-builder changes.
2. Continue through real independent provider invitations and required customer confirmation into canonical child Orders. Reject stale/unavailable selections without silent substitution or partial commitment.
3. Apply targeted task-first Order group/detail views within this same real journey: actual next responsibility, relevant tools, accessible terms/evidence/payment/activity, mobile contextual dock and useful desktop context. Preserve historical read-only Work support.
4. Prove the service-first example with separate real actor sessions, not preview identity switches: selection → acceptance → permitted Work/evidence → required confirmation → appropriate payment acknowledgement. Include refresh/relogin, wrong-user, stale/retry recovery and isolated partner replacement. Never infer settlement from Work or cascade one child failure onto earned sibling payments.

**Return to Quick Deal** after this core journey has recorded implementation and browser evidence. Review the compact record/challenge/offline contract before its schema/protocol build. Retain the three HTML previews as discussion references, not production components to copy verbatim.

This section supersedes the older immediate builder-focused ordering in §10. The active prototype specification remains a preview/handoff artifact; do not mistake it for an approved production implementation specification. No application changes or new test/browser qualification were performed during this prioritization checkpoint.

## 19. Preserve the existing listing; simplify the Deal Chain surface

The user explicitly requires retaining the good existing listing details—including variations/packages and ratings—while adding the saved seller partnership as an option. The manageable Deal Chain grouping is retained, but explanatory clutter is moved out of the normal customer path.

### Actual-site reference, not an invented replacement

The parent inspected the public live listing `/listings/0198a3b1-7c40-7abc-8def-5234567890b8` through the browser and read `resources/js/Pages/ListingDetail.tsx`. Its existing composition includes media/save, title/price, rating/review count, description, provider/contact/location, three package choices, package inclusions, seller add-ons, quantity, pricing summary, booking/Picks actions and a review section with expansion/filters/photo paths. The inspected live fixture had no listing image and zero reviews; the populated mock explicitly uses sample photos/reviews, and also provides that real empty-state shape. No real reviews or media were created.

The actual package inclusions were checked against `TagudinBrowseCatalog.php:205–207`. Preserve seller-authored facts, not merely package names/prices: Standard's chemical wash/disassembly/ΔT test, Dual Split's pressure calibration and photographic sign-off, and Full Home's ozone sanitization, same-day guarantee, OTP handover and digital service warranty. These remain the fixture seller's bounded package promises, not a new platform-wide guarantee. Do not simplify away contractual scope.

| Preserve in the existing consumer page | Add or simplify |
|---|---|
| Three service packages, price comparisons, selected inclusions, add-ons and quantity | Saved partnership is an optional addition to that selection, never a replacement package chooser |
| Media/save, provider/location/contact and rating/review area | Use actual supplied data in production; sample review values are only preview fixtures, not fallbacks to copy |
| Reviews, photo entry, expansion and rating/photo filters; empty reviews/media | Keep details reachable without displaying every review or explanation at once |
| Price and Picks/review actions | Carry package ID, add-on IDs and quantity together into review and the Order example |
| Separate Agreement/Work/Payment, evidence, terms, activity and help | One visible next task; supporting panels expand on mobile; no repetitive independence/payment essays |
| Existing product variant/stock paths in `ListingDetail.tsx` | They are not redesigned or removed by this service-first mock |

### Current preview changes

- `service-journey-prototype.html` restores the existing product-detail-style hierarchy and all three service packages (PHP 450/850/1,200), their actual inclusion facts, original price comparisons, seller add-ons (PHP 100/150), quantity, media/save/contact, ratings/reviews/photo/filter paths and Picks. Package changes reset quantity as the real page does.
- The authored **With parts & delivery / Cool Again** option stays separate from same-provider packages/add-ons. Viewing Details does not select it. Chosen package, extras and quantity survive partnership selection, review, Picks and the Order example.
- `service-orders-prototype.html` uses a concise group row: item, provider, explicit Work status, price and View order. “Paid separately” appears once; sequencing/independent agreements are available under Details. Group messages remain reachable.
- Order detail shows reference/provider/price and separate Agreement/Work/Payment facts, then the current task. Mobile retains one contextual action dock; terms/payment/activity use expandable panels. Preview controls are collapsed outside the normal flow. Older read-only examples retain their own fixed historical price/scope rather than inheriting newly selected packages.

### Exercised HTTP/browser evidence

- Selected Dual Split + Rush scheduling + quantity 2 produced service PHP 1,900, parts PHP 360 and delivery PHP 70: total PHP 2,330. Those values and selected package/extras survived review, Picks and navigation into the child Order.
- Package selection, quantity reset, save toggle, expanded/filtered reviews, photo path, partner detail-versus-selection, no-image/no-reviews, and unknown delivery-price blocking were exercised. A pending delivery quote stayed unknown, not zero.
- Priced and pending-quote Picks were added in both orders. They remained separate; reviewing the pending choice still blocked sending until the quote was received.
- Buyer Work review changed only the service Work state; payment remained Unpaid. Product/courier activity did not acquire the service's review event. Provider evidence was selected/saved locally without completing Work or changing payment.
- A pending visit time showed a customer-only Confirm visit time action and consistent proposed-time wording; provider stayed waiting. Customer confirmation changed Work to Scheduled, not completed, and left payment unchanged.
- Historical read-only details retained PHP 450/Standard × 1 after selecting different current packages and after refresh.
- Listing, group and Order captures were inspected at 375px and 1365px with no horizontal document overflow. A 320px Order check also found no overflow. The default group body had 43 words; necessary scope remains accessible in Details rather than being deleted.

Two independent read-only reviewers found four material gaps: lost package inclusion facts, priced/pending Picks merging, a missing customer schedule action, and service-review activity leaking onto sibling examples. The parent corrected them and exercised the changed paths. Both reviewers scored their two listed findings resolved; these are targeted verdicts, not production/end-to-end certification.

Evidence directory `.impeccable/review/service-consumer-preview/`: `listing-live-reference.png`, `listing-preserved-{desktop,mobile}.png`, `chain-simplified-{desktop,mobile}.png`, `order-simplified-{desktop,mobile}.png`. The detector ran once on the refined mocks, retaining pinned-font/imported-kit and native disclosure-padding heuristics; the initial dynamic-photo missing-src warning was corrected with an existing sample asset. No clean detector result is claimed.

**Scope and next implementation:** only the two consumer HTML mocks changed, plus handoff guidance. Production `ListingDetail.tsx`, Orders components, listing builders, migrations, dependencies and data remain untouched. The real implementation must extend existing components in place, preserve actual option IDs/versions/reputation/media data and backend permissions, and fix saved-graph staging continuity. These query-string demo slugs and preview personas are not production APIs or authorization.

## 20. Consumer frontend freeze and component handoff

The user approved factual labels such as **With delivery** rather than an unexplained **Cool Again**, retained the simplified Deal Chain composition, and clarified that the older presentation to preserve is **the listing's customer reviews**—not checkout review or Work sign-off. Keep authored names as secondary metadata; do not rename stored offers or accepted agreements.

The Service HTML now restores the older public-listing review anatomy from `ListingDetail.tsx:1035–1235` and the existing `listing-detail.html` references: job-photo rail, featured card, author/location/date, stars, package tag, quoted text and expandable rating/photo filters. Four clearly labeled sample reviews remain fixtures; the no-review case remains empty. Filtered results use one featured item plus the remaining matching cards, without repeating that item. The mock retains focus through expansion/filter changes and returns focus after closing its photo sheet.

### One kit, minimum extraction

The implementation contract is now in [`ELEMENT-INVENTORY.md`, “Consumer frontend freeze”](../design-kit/ELEMENT-INVENTORY.md#consumer-frontend-freeze--listing-deal-chain-and-orders). It distinguishes existing runtime modules from proposed extractions:

- Reuse current tokens/UI controls, active navigation, the wave modal and specialized Order/payment/evidence/conversation tools.
- Extract customer-review display in place; extract common mobile-dock mechanics and known-minor-unit formatting only while the real target pages are touched.
- Keep page-owned selection/actions, distinct Order cards/workspaces and server-authorized visibility. Do not create a generic review/approval/workspace component or a parallel UI library.
- Preserve the old review appearance, not the public page's synthetic fallback reputation or the test-only listing-detail component. The snake_case producer/camelCase consumer review-field mismatch is an integration issue to normalize once, not copy into reusable cards.
- Listing builders remain unchanged. Quick Deal's recorded contract/mock remains paused, not discarded. No Agent/GIS/authentication expansion is added to this cut.

### Exercised preview evidence

- The restored default showed one featured review, five star icons and a loaded sample-photo thumbnail; expansion showed the four distinct fixtures.
- Keyboard selection of the four-star filter showed only Liza's review and four stars; the photo filter showed only Maria's review. Filter focus survived rendering; collapsing reset the filter. Escape closed the photo sheet and returned focus to the photo button.
- The new-listing case showed no reviews/photos rather than sample content. The listing had no horizontal document overflow at 320px or 1365px; restored review captures were inspected at 375px and 1365px.
- Selecting Dual Split + Rush + quantity 2, opening partnership Details, then choosing it retained all three selections. Details alone left Service only selected. Review and the resulting group showed PHP 2,330 (service 1,900, parts 360, delivery 70); the `cool-again` fixture identity survived unchanged while the visible heading became **Service with parts & delivery**.
- Group Details retained **Saved offer: Cool Again** and the selected package/extras. Group captures at 375px/1365px had no horizontal document overflow. No recent browser script errors were reported by the attached preview tab.

Evidence in `.impeccable/review/service-consumer-preview/`: `reviews-restored-{mobile,desktop}.png`, `reviews-restored-{mobile,desktop}-section.png`, and `chain-factual-{mobile,desktop}.png`. The final detector exited 2 with inherited kit glow/stripe declarations, pinned-font and native disclosure-padding warnings; no clean detector result is claimed.

**Boundary:** this round changed two HTML previews and existing handoff documents, not production React/PHP components. The proposed extractions are not implemented yet. The next production cut remains the real saved-combination → exact staged graph → independent invitations/accepted child Orders journey, with these UI boundaries applied during that work—not a separate library/refactor project. Actual application, actor, Work and payment qualification remains required.

## 21. Work tools and execution UX — source audit and preparation

**Purpose:** prepare the behavior of Work, not another tool-gallery redesign. This expands detail for the already agreed bounded location Work Tool (document 37 F5/A11); it does not start a dispatch platform, change accepted contracts, resume Quick Deal implementation, or authorize a listing-builder rewrite. Retain the current design system and the consumer boundaries in §20.

**Evidence class:** implemented/source-wired is not end-to-end qualified. Two independent read-only inventories covered runtime contracts and frontend callers. The parent inspected key validators, upload persistence and approval handlers, ran the registered Order routes, and probed browser capabilities. No authenticated Work completion, phone-sensor capture, file upload, payment action, test suite or production edit is claimed here.

### Current capability truth

| Capability | What exists | UX boundary / missing behavior |
|---|---|---|
| Photo proof | `WorkPhotoProofInput`, private upload/download, SHA-256, quarantine/scanning, clean-file references scoped to actor/Work step; JPEG/PNG/WebP, 8 uploads per node, 10 MiB each | A native file/camera picker, not a custom timestamp camera. Selected, uploaded, scan-cleared, submitted and approved are different states. Rejected uploads currently still consume slots. |
| Photo time/location | Server upload/event timestamps exist | Ordinary Work photo projection does not expose capture time/EXIF; Work does not extract EXIF or generate a timestamp/GPS watermark. Upload time/hash do not prove capture time, place or truth. |
| Device/manual location | `WorkLocationPinInput` and structured `location` submission: coordinates, source, reported observation time, accuracy, landmark; server adds receipt time | Currently decimal-coordinate entry on fallback, not a Work map. Device and manual locations are explicitly provider-reported. No site geofence, freshness limit or maximum acceptable accuracy is enforced by this validator. |
| Named measurements | `WorkMetricReadingsInput`, authored IDs/units, finite values, required readings and min/max validation | Named requirements need schema 2. A `target` is guidance, not an enforced acceptance bound. Show units and distinguish “Target” from a required minimum/maximum. |
| Itemized checklist | `WorkChecklistStepsInput`; authored IDs, required/optional items; backend requires required items true | Schema 2. This records the provider's declaration, not independent verification that a physical safety action happened. |
| App confirmation / Work codes | Customer step confirmation and final sign-off; purpose-bound 4-digit presence / 6-digit worker-drop-off challenges | Approval methods are not proof tools or account PINs. Correct issuer/verifier, Work version/signature, pending state, expiry and attempt rules matter. |
| Physical handoff (A4) | Dedicated preparation, custody departure and recipient-receipt protocol; shared proof controls | Collection and final receipt are different facts/actors. Do not bypass this protocol using generic “Complete step.” |
| Digital delivery (A9) | Server-backed draft artifact uploads, clean-scan submission, versioned delivery, customer accept/revision; shared node proof controls | Artifact files are not a generic video/receipt tool. Some node proof draft state remains only in memory until delivery submission. |
| Video / generic receipt document | Legacy `video_required`/`receipt_upload` labels normalize to `photo_proof` | No actual Work video capture/upload pipeline. The registry's “Photo / Video Capture” wording overstates the image-only implementation. Do not silently satisfy a promised video/document requirement with a photo. |
| External connector | Catalog key exists, but native Work normalization/contract support rejects it | No working connector adapter established. Do not activate it as a required tool. |
| Voice, before/after viewer, offline Work queue, drawn signatures | Historical/proposed specimens exist | Not established as working Work capture/approval protocols. Two photos do not establish before/after timing; a drawn mark is not authenticated participant approval. |

**Source anchors:** `resources/js/components/mobile/WorkNodeEvidenceTools.tsx:55–168`; `WorkPhotoProofInput.tsx:108–201,228–336`; `WorkLocationPinInput.tsx:34–94`; `WorkNodeEvidenceReview.tsx:10–83`; `app/Modules/OrdersWork/Application/WorkExecutionService.php:1026–1244`; `WorkNodeEvidenceService.php:32–152,309–370,515–528`; `WorkContractSelector.php:27–79`; `WorkClearanceChallengeService.php:20–27,188–309`; `app/Modules/Catalogs/Application/WorkCatalog.php:137–185`.

The old `final-work-tools.html` is a historical static specimen, not a current availability register: structured GPS, measurements, checklists and confirmation have real command/UI paths despite its “catalogued only” language. Conversely, the current catalog's timestamp/video wording is not proof those richer capture features exist. A separate file-upload endpoint is not required for a structured tool submitted through the Work step command.

### Provider/customer experience to prepare

**Job:** Kuya Ben completes Maria's accepted service on a phone; Maria can understand what she is confirming without Work/schema/DAG terminology. Show only the current step's permitted/required tools, plus optional notes—not a toolbar of thirteen future capabilities.

1. **Open the current task.** Show the agreed service/step, what is required, who acts next and one primary action. Locked future steps explain the actual blocker. An estimate is not a new guaranteed deadline.
2. **Collect required proof; offer other permitted tools.** Use short actions: Timestamp photo, Use my location, Place pin, Record reading and the authored checklist. Required tools gate advancement; other permitted tools remain available under More tools. Evidence not permitted by the accepted step must not be smuggled through another tool. The current runtime's required-only validation needs an explicit allowed-versus-required contract before this flexibility ships.
3. **Review readiness locally.** A selected photo is not uploaded; a clean upload is not submitted Work. Coordinates/readings/checklist/notes currently remain local until their containing Work action. Do not label local state “Saved” or “Completed.” Show the missing requirement beside a blocked action.
4. **Submit the exact action.** Provider-direct clearance can submit proof and finish the step together. Customer-clearance steps submit for review and remain pending. Do not add a redundant server “Save proof” step where no such draft command exists.
5. **The right person reviews/approves.** Show the submitted photos, named readings, checklist and location provenance. An ordinary milestone uses its actual confirmation method; final Work sign-off uses its own scope; A4 recipient receipt and A9 version acceptance retain their dedicated flows. A code must say which step/receipt it approves, not just “Enter OTP.”
6. **Refresh authoritative progress.** Advance only after server success. Preserve history and show the next responsibility. Work completion can make an obligation due; it does not establish payment settlement, nor complete a Deal Chain sibling.

**Concrete existing AC example:** the fixture defines compressor-current readings in A and a final temperature-difference test requiring photo + reading with minimum 12°C and presence OTP (`TagudinBrowseCatalog.php:209–213`). Show “Temperature difference · required at least 12°C,” not an unexplained metric key. This is a fixture scope, not a requirement to put every tool into every service.

**Final approval friction:** `Orders/Show.tsx:417–419,1153–1162` labels its dock action “Review and confirm Work” but calls the sign-off POST directly. Proposed UX: Review work opens the exact pending summary; Confirm finished performs the actual terminal approval. Reuse the shared sheet; do not build a new account PIN/authentication engine or require codes where the accepted contract uses app confirmation.

### GIS: one location tool, not Uber

Reuse installed **Leaflet 1.9.4**, already present in `node_modules/leaflet/package.json`. Work needs a point/landmark capture and a read-only evidence view, not continuous tracking, dispatch, route computation or an ETA promise.

- Entry is explicit: **Use my location** or **Place pin**. Ask permission on that action, not on page load. Show device accuracy when supplied. Manual placement remains labeled manual, never “Verified on site.”
- Center the map using the authorized accepted job location when available. A default Tagudin viewport is only a viewport: it must not become a submitted evidence pin. Require an explicit candidate selection/Use this pin action; retain an optional landmark such as “near the blue gate.”
- Keep the agreed site and provider-reported point distinct. Placing an evidence pin must not change the agreed address or a listing's location.
- Customer inspection is read-only. Do not embed the entire listing `TagudinLocationPicker` or copy its address-form state into Work. The current `TagudinLeafletMap` is always editable; reusing it unchanged would let a reviewer move the marker. Add the necessary controlled edit/read-only capability at the shared map seam, preserving existing creator behavior.
- Mount the map on demand, not one map per history row. Retain a textual coordinate/source/landmark alternative if tiles fail. Missing permission/network must not manufacture a point or bypass a mandatory proof requirement.
- Precise Work location/photos remain scoped to authorized participants, not public browse/reviews or every Deal Chain member. Do not burn private home coordinates into publicly reusable images.
- Keep visible attribution and obey tile-provider terms. Leaflet is a renderer, not a tile service or verification engine. Check the existing OSM tile URL and satellite credit before reuse; do not implement bulk/offline tile downloads under the label “offline Work.”

**Map source:** `TagudinLeafletMap.tsx:63–105,147–171,187–197,324–335`; `TagudinLocationPicker.tsx:105–115,193–208`; `resources/js/lib/philippineAddresses.ts:451–478`. The existing map draws a marker even for unpinned default geography, has no read-only mode or town containment, and updates creator React state rather than immediately writing the server.

**Phone QA prerequisite:** the observed LAN HTTP origin had `isSecureContext: false` and no `navigator.mediaDevices.getUserMedia`; localhost had a secure context and exposed that API. Geolocation and custom live camera capture require secure contexts and user permission. Native file-input camera selection is a different path and is device/browser-dependent; the probe does not establish that Work's current image picker fails on HTTP. Use a trusted HTTPS origin for real-phone sensor QA; do not disable browser security.

### Recovery and safety decisions before implementation

| Situation | Required UX / current gap |
|---|---|
| Photo selected, upload failed, scan pending or rejected | Distinguish each state; keep a retryable draft and show why proof is not ready. A safety scan means file safety, not verified workmanship. |
| Upload succeeded but response was lost | Reconcile with persisted candidates before blind retry. Current upload has no stable client retry identity; duplicate uploads can consume slots. |
| Rejected files exhaust the limit | Current eight-upload count includes rejected/quarantined files; local Remove does not free server slots. Define safe candidate withdrawal/replacement preserving evidence/audit/holds; do not solve it by deleting history or only hiding cards. A9 has a related append-only 12-file version limit/rejected-file recovery gap. |
| Reload, remount or browser closed before submission | Non-file proof drafts can be lost; no durable offline Work queue exists. Do not promise offline/resumable capture. Decide durability explicitly before promising it; isolate any future drafts by actor/Order/Work version/node and never treat a restored draft as approval. |
| Location denied, inaccurate or tiles unavailable | Offer explicit manual placement/landmark when permitted; label source/accuracy honestly. Do not claim geofence presence or silently substitute the default site point. |
| Measurement invalid / required checklist incomplete | Keep input, explain the named bound/item, allow correction/retest or the existing support path. Do not coerce a passing value, clear a required checkbox, or erase prior accepted evidence. |
| Customer sees incorrect/unfinished Work | **Missing in A1/A3:** a real Needs correction/request-adjustment transition. Current UI offers confirm or wait/help; A9 already has its own revision route. Recommended pending-review correction request retains proof/history and identifies the step/problem; it is not an undo of an already accepted job, refund or automatic sibling reset. Backend transition/authority must be decided before enabling the button. |
| Accidental final confirmation | No generic undo exists. Make the final review/confirm scope explicit before the irreversible action; recovery after acceptance uses governed support/amendment, not silent rollback. |
| Wrong person, expired/reissued/wrong code, stale Work | Preserve backend issuer/verifier and version checks; surface recoverable errors. Codes currently expire after 10 minutes, have five wrong-code attempts and issue throttling. Use server policy/expiry, not a new UI timer rule. Codes bind Work version/signature, not an independently signed per-file evidence manifest. |
| Customer does not respond | No in-repository Work auto-confirm scheduler/deadline consumer was found. Expiring a code does not approve the step. Remain pending; contact/support is not implicit consent. Preserve that property rather than inventing overnight acceptance. |

**Timestamp decision, updated by the user's next instruction:** timestamp-camera capture must be available as a reusable tool, not replaced by server Received at metadata. Burn a visible device-time/job stamp into the captured photo; preserve camera versus file-import provenance and keep server receipt time separate. For imported files, label time added rather than claiming original capture time. EXIF or a watermark is not independent verification. The implementation/reuse and mock contract is in §22.

**Supported-contract boundary:** named measurements/checklists require the right schema and full authored definitions. The source audit identified conditional authoring risks where Work-set conversion can omit advanced definitions or a hidden `customer_otp` marker can leak into required tools. These remain **[INFERENCE] source findings, not reproduced bugs**. Verify them in the real selected-listing → accepted Work journey; do not redesign the builder, invent default requirements, drop proof, or relabel historical A2 as A4 to get past validation.

### Bounded next work and exit proof

1. **Core continuity stays first:** selected saved offer → exact accepted graph/child Orders → continuable supported Work. Preserve readable historical/unsupported records without enabling unsafe execution.
2. **Refine existing Work modules in place:** current-step composition, truthful tool/submit labels, explicit final review, source-aware proof review and proper recovery. Keep `WorkNodeEvidenceTools`/`WorkProofPayload` and specialized A4/A9 orchestration; no generic Work engine or duplicate mobile/desktop forms.
3. **Add the bounded map-point interaction** at the existing Leaflet seam and qualify it on HTTPS phones. Keep new video/voice/connector/signature/offline-Work promises inactive until their actual protocols and recovery exist. Existing promised unsupported evidence needs explicit resolution, never a silent downgrade.
4. **Make correction/recovery decisions executable:** A1/A3 pending-review correction, failed-upload slot recovery and ambiguous retry semantics need real backend contracts—not front-end success states. A future Work-draft durability promise is a separate explicit decision, not implied by Quick Deal's retained offline scope.
5. **Mock only the consequential interactions if needed:** extend the existing Orders prototype with provider proof entry, location placement, customer review/final confirmation and recovery. Do not create another thirteen-tool design system or use a mock verdict as runtime proof.

**Qualification remains NOT RUN:** use an isolated coherent synthetic scenario with separate provider/customer sessions. Exercise photo camera/gallery/upload/scan/rejection/replacement and lost-response retry; GPS allow/deny/manual/poor accuracy/tile failure; checklist required vs optional; correct units/min/max vs target; refresh/actor switch; app/code approval, expiry/reissue/wrong user/stale version; no-response pending; correction/support; A4 named custody/receipt; A9 revision/acceptance. Observe persisted Work, private evidence access and unchanged payment/siblings. Check Android/iOS/desktop input behavior, keyboard/focus and safe-area/dock clearance on the actual app.

**Observed commands/environment:** `vendor/bin/sail artisan route:list --path=orders --except-vendor --no-interaction` returned 39 registered routes including Work proof/actions/challenges, A4 and A9. This proves registration, not successful authorization/execution. `vendor/bin/sail npm ls leaflet --depth=0` failed because `npm` was absent from the container PATH; direct installed-package metadata confirmed 1.9.4. Browser origin probes succeeded, but subsequent navigation/worker recovery failed and CDP became unavailable; no phone permission/camera test or authenticated Work walkthrough is claimed. Do not treat those tool/environment limits as a product pass or fix unrelated infrastructure in this planning audit.

**Primary browser/map references:** [Leaflet 1.9.4 API](https://leafletjs.com/reference.html); [MDN Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API); [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts); [camera streams/getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); [file-input capture hint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture); [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). These describe browser/library constraints, not evidence authenticity.

## 22. Flexible capture tools — library recommendation and interactive mock

**User decision:** timestamp-camera capture is required as an available Work tool. The user also requested an actual clickable mock, aligned with the existing design system, before later production implementation. Do not reinterpret that as upload timestamps only, a static tool gallery, or a request to build every camera/recorder from scratch.

### Reuse recommendation

Two independent primary-source investigations compared camera packages, overlays and recording APIs. No dependencies were installed.

| Capability | Recommendation / observed versions | Why and limits |
|---|---|---|
| Flexible photo/video camera | **Uppy React headless webcam is the recommended integration candidate:** `@uppy/core 6.3.0`, `@uppy/webcam 6.0.2`, `@uppy/react 6.1.0` | MIT; React package declares React 18/19 peers. Its hooks allow the existing Work/wave-sheet UI rather than adopting Dashboard. Camera/recording logic is packaged already. Exact app/mobile compatibility still needs an integration trial; do not equate a peer range with device qualification. |
| Photo-only lightweight alternative | `react-webcam 7.2.0` | MIT; declared React range includes 19, but no React-19 test baseline was established. Snapshot capture is available; video recording/device-switch UI requires more integration. Not the preferred full photo/video tool. |
| Camera package not selected | `react-camera-pro 1.4.0` | MIT, but its observed peers require React 18.3.1 and styled-components; React 19 is outside that declared range. Do not add a styling dependency or bypass peers just to use it. |
| Visible still-photo stamp | Browser **Canvas2D + `toBlob()`** | Reuse the platform image compositor to draw a small time/job/location stamp into pixels. No full image editor or abandoned one-function watermark package is needed. This is thin app-specific composition, not a new camera implementation. |
| Mapping | Existing **Leaflet 1.9.4** | Reuse for editable pin capture and read-only evidence inspection; no second map SDK or dispatch system. |

**Uppy boundary:** use the documented React `useWebcam`/headless route, not an unsupported raw plugin UI mounted without a host. The webcam documentation emphasizes Dashboard, while the React documentation also exposes headless hooks; validate the chosen hook integration against the pinned versions. Dashboard, Tus, Transloadit processing and an Uppy upload plugin are not required simply to capture a local File/Blob. Do not introduce another backend or competing upload queue.

The capture adapter must take the captured Uppy file into the existing Work ingestion path, then release Uppy-owned temporary state. The hook's submit callback does not directly hand over a File argument; inspect the selected Uppy file's Blob/File data. Keep Work responsible for private upload, CSRF/session, scanning, evidence IDs, participant access and clearance. A camera package does not implement the missing Work video ingestion/processing contract.

**Not chosen as prerequisites:** Pintura is a commercial full-editor option if real crop/annotation editing becomes a requirement; Konva/Fabric are broader canvas editors, unnecessary for a few stamp lines. RecordRTC is not needed merely to wrap a modern browser recorder. Avoid combining several capture wrappers that own competing streams/queues.

### One reusable capture boundary, familiar hosts

The future production module should expose media results, not complete Orders: original File/Blob, stamped derivative where applicable, media kind, camera/import source, client-reported capture/add time and optional consented location. The host supplies its legitimate Work/resource context and permitted capabilities. Server identity and authority still come from the authenticated session, not client metadata.

- **Required versus available:** a step may require a photo/reading while allowing optional video, location or checklist. The tool picker exposes permitted capabilities; it does not change accepted requirements. The existing backend currently rejects structured evidence not listed as required, so this needs a versioned domain/view contract—not just additional frontend buttons.
- **Photo flow:** open camera → shutter → review a visibly stamped image → retake/use → existing private Work upload/scanning. A file-picker import uses the same compositor but is labeled time added, not captured now.
- **Stamp content:** job/step reference, device time with timezone, source and optional explicitly selected location. Do not automatically expose a home address/GPS stamp publicly. The mock marks exported images WORK PREVIEW.
- **Original versus derivative:** the mock retains both locally and lets the user inspect the original/download the stamped JPEG. Production must explicitly represent retention/provenance and hash the actual stored bytes if retaining both; do not promise the current single-image upload already does this.
- **Video:** real recording is available in the mock where browser APIs support it. Its time is metadata, not a burned-in video stamp. A CSS label over a video does not enter the recording. Burn-in needs canvas-frame composition/captureStream plus recording, with codec/audio/device qualification before promising it.
- **Lifecycle and offline:** stop streams/recorders on close/switch, discard stale asynchronous results and failed recordings, and release unused object URLs. An in-memory Blob is not a durable offline queue. Work offline durability remains distinct from the retained Quick Deal offline scope.

### Concrete mock and design-system alignment

[`service-work-tools-prototype.html`](../design-kit/sessions/service-work-tools-prototype.html) is a new consumer Work preview in the existing sessions area. It imports `final-kit.css` and `service-journey-prototype.css`; no second token system, theme or app route was introduced. Orders' collapsed Preview cases includes its entry link.

The default example is one cooling-test step: photo and at least 12°C are required; location, video and checklist are available. Preview controls can require location/checklist to show the difference without changing a real listing. Provider and customer views share the same state and captured media.

The mock includes real local still stamping/download, camera/file selection, short recording/import, Leaflet point placement, named readings/checklist, and simulated submit/review/correction/approval. It keeps Agreement/Work/Payment separate; correction retains prior submissions and does not settle payment. Native dialogs retain the existing wave cap, bounded scrolling and accessible close action. One responsive primary-action area owns mobile safe-area/content clearance.

**Honest boundary:** this static HTML uses throwaway native-browser capture glue so it works without installing React packages or a build. It does not demonstrate an installed Uppy integration. The production capture library is a recommendation requiring approval/qualification, not a dependency quietly added to the app. No Work upload, scan, authentication, confirmation-code, payment or durable offline command is called by this mock.

### Primary sources

- [Uppy React components/hooks](https://uppy.io/docs/react/), [Webcam](https://uppy.io/docs/webcam/), [Core File/Blob state](https://uppy.io/docs/uppy/).
- Observed registry metadata: [Uppy React](https://registry.npmjs.org/@uppy/react/latest), [Webcam](https://registry.npmjs.org/@uppy/webcam/latest), [Core](https://registry.npmjs.org/@uppy/core/latest), [react-webcam](https://registry.npmjs.org/react-webcam/latest), [react-camera-pro](https://registry.npmjs.org/react-camera-pro/latest). Recheck actual versions/peer requirements when approving installation.
- [Canvas image export](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob), [canvas stream capture](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder), [getUserMedia secure-context/permission requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [Leaflet quick start and browser assets](https://leafletjs.com/examples/quick-start/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). The mock loads pinned Leaflet 1.9.4 with official integrity hashes and visible attribution.

## 23. Work-tools mock — exercised evidence and limits

**Artifact:** `docs/design-kit/sessions/service-work-tools-prototype.html`, also reachable from Orders → Preview cases → Work tools mock. This is a working local-media/interaction prototype, not a production Work feature or an installed Uppy trial.

### Observed browser behavior

- Camera capture ran through real browser APIs using an explicitly configured **Chromium fake camera**, not physical phone hardware. The preview received 1280×720 frames; shutter produced a JPEG with timestamp/job/source text rendered into the image pixels. Closing/capturing stopped the stream.
- Importing the existing AC sample through the native file input produced a stamped JPEG while retaining the original Blob. The stamp said **File picker · time added, not capture time**. An explicitly selected manual location was included only after opting in.
- A real short `MediaRecorder` clip was created and played: decoded 1280×720 video advanced its playback time. This browser chose `video/mp4;codecs=vp9`; no universal phone/counterparty codec support is inferred. Video timestamp remains details metadata, not a burned-in overlay.
- A synthetic recorder-error callback followed by the real recorder stopping preserved the previous clip, left the error visible and restored usable controls. Escape ended all captured tracks and cleared active stream/recorder references.
- A held sample-photo network response was released after switching Customer reviewing → Start with empty proof. Both case operations settled; the selected fresh case stayed provider/draft with no photo, reading or submission. The older response did not restore the abandoned review.
- Leaflet loaded real attributed map tiles. Initial placement had no selected evidence marker and Save was disabled; an explicit tap enabled it. Retrying the map retained one visible marker. Customer inspection had no Save control and its marker was not draggable.
- A required reading of 11.8°C was blocked with the 12°C requirement explained; 13.4°C made that requirement ready. Optional checklist submission with one checked item stayed allowed and customer review showed both item labels/results. Making location/checklist required blocked submission until satisfied.
- The simulated customer correction required a reason, retained the first submission and allowed a second provider submission. Final approval required an explicit review checkbox. Work became confirmed after two revisions; Payment remained unpaid.
- Offline preview retained local sample proof but disabled submission. It did not demonstrate durable offline capture or synchronization.
- The actual LAN HTTP page reported an insecure context and rejected live-camera opening with the native picker/sample fallback still available. Sample stamping worked there. No physical mobile camera, GPS permission or microphone behavior is claimed.
- Layout checks at 375px and 1365px showed no horizontal document overflow; a 320px check also passed. There was one primary action instance. Mobile sheet Close and map Save remained in the viewport; native picker focus had a visible 3px outline. Final attached-tab diagnostics reported no recent JavaScript errors.

### Review findings corrected

Two source reviewers identified five distinct defects: stale sample continuations, a detached marker after map retry, failed recordings replacing a good clip, hidden checklist-item results in customer review, and invisible keyboard focus on the native picker. These were corrected and the relevant paths exercised above.

Parent browser inspection also corrected sheet scrolling so Close stays visible, reduced redundant camera controls, and fixed an empty-viewfinder grid-track overlap that covered the optional location checkbox. The checkbox was then actually selected and used for an imported, location-stamped photo. This is targeted prototype evidence, not a global security/accessibility certification.

### Captures and qualification boundary

Evidence remains under `.impeccable/review/service-consumer-preview/`: `timestamp-camera-mobile-final.png`, `photo-stamped-mobile.png`, `stamped-photo-import-location.png`, `work-tool-picker-mobile-final.png`, `work-map-mobile-final.png`, `work-tools-desktop-final.png`, `work-tools-mobile-final.png`, and `work-customer-review-{mobile,desktop}.png`. Some captures predate the last sheet-only layout correction; the imported stamp, final map and final desktop captures reflect the corrected layout.

The final detector exited 2 with the pinned Plus Jakarta font and inherited kit glow/stripe-declaration warnings. The Orders-link pass also reported existing disclosure-padding warnings. No clean detector result is claimed; no brand replacement or unrelated sheet rewrite was performed.

No production React/PHP, dependency, database, listing builder or Quick Deal implementation changed. Remaining production qualification includes the approved SDK integration on this exact React/TypeScript stack, trusted-HTTPS Android/iOS hardware, capture/import formats and video codecs, optional-versus-required tool contracts, original/derivative private storage, scanner/upload recovery, real participant authorization and exact approvals. The mock's 30-second/20-MiB video limits are illustrative, not approved platform policy.

## 24. Checklist membership and mobile-specific Work refinement

**User correction:** confirm that checklists are genuinely Work tools and do not treat a merely responsive form as finished mobile UX. The prior large photo/form composition and preview chrome are superseded by the focused task/tool composition below. This changes the existing mock, not production Work or listing authoring.

### Checklist is a real Work contract

`WorkSpecificationPort::WORK_TOOLS` includes `checklist_steps`; normalized nodes carry `checklist_items` with authored ID/label/required flags (`app/Shared/Contracts/WorkSpecificationPort.php:13–38`). `WorkExecutionService.php:1077–1084,1190–1241` validates item-level responses, rejects unknown/duplicate IDs and requires required items to be present and true. Itemized checklist support depends on the supported schema-2 contract; it is not a promise that every historical Work shape/version supports it.

Keep three concepts distinct: a Work step is the task, a checklist is an evidence/declaration tool inside that step, and clearance is the authority to advance it. Ticking a checklist is not customer approval or payment acknowledgement. Optional unchecked items remain visible as unchecked; they must not be silently checked or converted into required items.

### Mobile adaptation, not scaling

| Before | After | Why |
|---|---|---|
| Site navigation, preview controls and role switch before the task | Compact Order back/header; demo controls in a wave sheet | Start with the actual job, not prototype administration |
| Large empty photo panel and inline form | Compact tool rows with focused reading/note/checklist sheets | Reach the tool quickly and keep input focused on a phone |
| Checklist discovered under Other tools | Checklist is a first-class visible row, with required/optional status and saved item count | Its existence and current state are immediately understandable |
| Send directly from the editing surface | One contextual Tools / Review & send dock, then an exact local proof review | Thumb-reachable tools without accidental submission |

The focused task does not stack a second global app tab bar above the action dock. Back returns to Orders; the existing app-wide `BottomNavBar` remains an Orders-hub concern. This follows the incumbent Order-detail contextual-dock pattern, not historical specimens' unsafe payout/escrow copy. Desktop retains expanded Order context and the same draft/tool state. Short landscape viewports retain the compact task header rather than switching back to site chrome.

Demo controls are the same DOM elements moved into/out of their sheet; role selection, case selection and requirements are not duplicated. One primary action instance remains. Reading/note cancellation leaves the prior committed draft intact; keeping a draft is not submitting it. The explicit provider review precedes the simulated send, and customer review/confirmation stays a separate action.

### Observed verification

- Actual browser touch emulation opened the checklist and toggled an item. Its label was also tapped successfully. Checklist labels/checkboxes now share horizontal full-row targets instead of stacked grid cells.
- At 375×812 the photo and checklist rows were visible above the dock without first opening a tool menu. Checks at 320px and 1365px found no horizontal document overflow; there was one primary action.
- A locally retained 11.8°C reading left the step in draft and blocked submission; 13.4°C satisfied the named minimum. Canceling a later edit preserved the previously kept value. The row preserves the full **Temperature difference** meaning, not a generic temperature label.
- Requiring the checklist blocked sending until both required items were checked. An optional one-of-two checklist stayed allowed and customer review showed both individual results.
- Opening provider Review your proof did not submit; canceling kept draft state. Only Send for Maria's review created the simulated pending submission. Customer confirmation still required its explicit review checkbox; Work confirmation left Payment unpaid.
- Correction retained the photo, reading, note and checklist; a second submission could be reviewed and confirmed. Offline preview still blocked sending.
- Opening a sample case from the new demo sheet exposed a duplicate native-close cleanup that invalidated its pending sample load. Cleanup now has one owner per actual close path; the same case then loaded its photo/13.4°C normally. Preview controls remained single instances after closing and role changes.
- Managed viewport changes between portrait, 844×390 landscape and desktop preserved the photo Blob URL and draft values. Changing an automation device profile can itself reload the page; that is not evidence of application data loss. Physical-device rotation/keyboard behavior remains unqualified.
- Camera capture still produced a locally stamped JPEG through the configured browser test camera, and capture stopped its stream. No physical phone camera/GPS/SMS test or real Work command was run.
- Final attached-tab diagnostics reported no recent JavaScript errors. The design detector retained the pinned-font and inherited kit glow/stripe warnings; no clean detector result is claimed.

Captures: `.impeccable/review/service-consumer-preview/work-mobile-task-first-final.png`, `work-checklist-phone.png`, `work-send-review-phone.png`, `work-reading-landscape.png`, and `work-mobile-adapt-desktop.png`.

### Readiness and reusable implementation seam

| Area | Current verdict | Before production use |
|---|---|---|
| Checklist foundation | Implemented/source-wired, with real server validation | Exercise the exact accepted schema/actors; do not replace it with client-only checks |
| Mobile interaction reference | Revised and browser-exercised; ready for user phone review, not user-approved by this document | Physical Android/iOS, keyboard, permissions and comfortable one-handed completion |
| Optional tools and capture SDK | Prototype/recommendation only | Versioned allowed-versus-required tool contract; approved Uppy integration on the actual stack; no new generic tool engine |
| Media and correction lifecycle | Existing image services plus identified gaps; mock effects are simulated | Original/stamped-file provenance, video ingestion/codec/scanning, failed-upload slot/retry recovery, real A1/A3 pending-review correction and participant authority |

Reuse `WorkChecklistStepsInput`, existing metric/photo/location components and module-owned Work guards. The presentation seam is a controlled Work tool list/row with a shared action dock and existing wave sheet; the page owns current Work/actor/draft/actions. The same state feeds compact mobile and contextual desktop views. No separate mobile form, checklist engine, global navigation system, approval engine or second UI kit is needed.

**Next cut remains bounded:** continue the actual saved-offer/accepted-Order/Work/customer-confirmation journey, applying these patterns in place. Do not call the whole project production-ready, promote the mock to an implementation specification, or enable unsupported optional/video/correction actions merely because the UI demonstrates them. No production React/PHP, dependencies, database, builders or Quick Deal runtime changed in this refinement.

**Environment note:** one attempted atomic write reported ENOSPC. Filesystem inspection showed the workspace filesystem at 99% usage with about 1.8 GiB available and ample inodes. Only the obsolete generated diagnostic `camera-location-checkbox-check.png` was removed; subsequent edits succeeded. The cause of the user's computer crashes was not diagnosed or established by this observation.

## 25. Real-system resumption — pre-implementation checkpoint

The user explicitly requested returning to the real system, with modularity/scalability in service of finishing, rather than another mock or framework rewrite. This section records the checkpoint before the approved implementation in §26. At that checkpoint no database reset, credential rewrite, dependency install or builder edit had been performed; all pre-existing dirty work on `integrate/spec-9` was retained.

### Current macro view

| Area | Located implementation | Current conclusion |
|---|---|---|
| Authentication / capabilities | Canonical session/auth services, resource actor/consent checks, provider/buyer authority and staff admission | Existing foundation; a universal permission engine or Agent product is not a prerequisite |
| Core Orders / Work / payment | Direct listing proposal/finalization, Request/Quote award, A1/A3 Work, dedicated A4/A9 protocols and cash/P2P acknowledgement | Source-wired and covered by segments of tests, not a fresh complete two-party browser qualification |
| Saved listing partnerships | Listing-version combination IDs and raw nodes reach public detail; selection metadata reaches booking/Picks/staging | Actual saved graph does not drive staging. Saved-only Picks can take ordinary booking; the generic modal/stager use a separate catalog recipe |
| Historical unsupported Work | Read projection preserves Order/payment while making unsupported Work non-executable | Current source already handles read-only visibility; do not relabel historical A2 or rerun the reported failure merely to confirm it |
| Camera/map/video/voice | Work image/GPS/reading/checklist paths, an existing Leaflet dependency, reviewed mocks/library research | Timestamp-camera and richer media/Work mapping remain integration and qualification gates; an installed map library is not proof of a complete Work tool |
| Quick Deal / assisted offline access | Recorded product scope, protocol checkpoints and prototypes | Required finish scope remains saved; it is not completed by the scanner shell or current mocks |

GitHub master #9's latest comment records the historical Waves 0–6 completion and suite totals. Those totals are not current evidence for the later user journeys or the dirty worktree. The local qualification draft is explicitly superseded; the consumer-journey spec remains a prototype handoff. Do not execute either as an approved full production cut or rewrite sprint statuses from source presence.

### First actual foundation change and observed checks

`compose.sail.yaml` now provides an opt-in `node-tools` service using the existing `node:22-bookworm-slim` image, the working-tree mount, transient `/tmp` and no published ports. The default PHP-FPM/web stack remains running and unchanged. The large Sail PHP development image was not available locally; the Node base was already cached, so no large image build or package installation was needed.

Observed commands:

- `vendor/bin/sail ps`: app, database, Redis, Mailpit and web healthy.
- `vendor/bin/sail composer show --direct`: unavailable because the selected production PHP image has no Composer binary. Boost application metadata confirmed PHP 8.4, Laravel 12.68.0, Inertia Laravel 3.2.1 and installed packages; no package update was attempted.
- `vendor/bin/sail -f compose.sail.yaml --profile tools run --rm --no-deps --pull never -T node-tools node --version`: Node v22.23.4.
- The same runner with `npm run typecheck`: passed against the current pre-existing frontend tree. This is a compiler baseline, not a feature or browser pass.
- `vendor/bin/sail exec -u root -e APP_CONFIG_CACHE=/tmp/serbizyu-resume-test-config.php app php artisan test --compact tests/Feature/DealChaining/DealChainAuthorizationTest.php --filter=test_it_validates_and_stages_the_selected_listing_terms_without_creating_an_order`: 1 test passed, 21 assertions. The test uses `DatabaseTransactions`. The initial assumption that PHPUnit XML alone pinned this Sail invocation to `serbizyu_ci_verify` was not reliable: a later unpinned run reported `serbizyu`. Final accepted verification explicitly supplies both `APP_ENV=testing` and `DB_DATABASE=serbizyu_ci_verify`; no reset was run. This initial test proves selected terms/price metadata, not saved-graph continuity.

README now documents the verified Node tools invocation. No application feature is declared implemented by this tooling change.

### First production seam: source and execution contracts must agree

`StageDealChain.php:270–277` validates saved combination membership, but `nodesFor()`/`dependenciesFor()` derive a separate latest catalog graph. With no `deal_chain`, it stages only the primary need. The active ListingDetail auto-selects a default/first combination, while the direct booking route still forms an ordinary single-listing Order. Picks/modal staging decisions consider attached catalog recipes, not saved-combination-only intent.

The deeper blocker is not merely a missing ID: seller payloads are permissive and inconsistent. Recipe-derived nodes encode keys in IDs; customizer nodes use slot IDs plus a host anchor; some checked-in fixtures omit identities and primary flags entirely. The customizer stores visual tiers and node gate fields but does not emit its declared explicit dependency-edge type. There is no shared saved-graph normalizer.

The gate dropdown includes `all_inputs_ready`, `source_ready`, `delivered_to_site`, `work_completed` and `audit_cleared`, whereas `DealWorkGateAdapter.php:69–75,155–159` recognizes only `part_ready` and `delivery_signed`. Naively copying those saved strings into runtime dependencies would be unsafe: the current gate queries filter to their recognized codes. A canonical, validated graph/condition contract must precede materialization; do not guess execution semantics from labels, array order or presentation tiers.

A correct saved-partnership cut therefore needs a bounded producer-data adapter as well as consumer/staging changes: stable identities and primary anchor; explicit edges and supported event conditions; fixed/preferred versus buyer-choice/open-role semantics; canonical listing/version/option/quantity pricing; one coherent review/staging route; transaction-scoped idempotency; server-side role checks; and existing independent child Order formation. Keep the builder layout and good listing details, but do not pretend the opaque payload already is an execution contract.

This crossed the prior boundary against builder changes without a demonstrated blocker. **Resolved:** the user explicitly chose **Fix saved-plan contract first**, authorizing narrow producer-data corrections while preserving builder screens and listing details. The one-provider alternative was not silently substituted. See the production spec and §26 for the implemented scope.

### Retained gates, not additional prerequisite projects

- Preserve module-owned services and cross-module shared ports; no general repository/permission/approval framework or new SDK installation is required for the core cut.
- Keep immutable listing/Work terms, actor-bound consent, transaction locks/idempotency and independent sibling/payment state. Stage's idempotency reservation currently starts before its transaction and must be corrected as part of a safe staging cut.
- Request-origin Order listing-anchor policy has a source/document discrepancy; resolve it separately rather than silently forcing a listing onto all custom Request/Quote work.
- Work final-review UX, A1/A3 correction, media recovery, optional tool contracts and physical-device SDK qualification remain named work—not ad-hoc changes in this pass.
- F0 disposable actor/storage/browser setup and a real continuing multi-session journey remain unqualified. Do not run broad seeders or the account-reset command against the populated developer database.

**Historical baseline and tracker checkpoint:** before application changes, the restored Node runner executed `npm run test -- resources/js/Pages/Picks.test.tsx`: 6 tests passed and 1 failed when the recipe-selection case could not find `/All-In Parts/i`. The pre-implementation runtime/source gaps were recorded on [master #9](https://github.com/daviddatuX25/Serbizyu-2.0/issues/9#issuecomment-6567025407). The scope gate was subsequently resolved by the user's explicit saved-plan contract choice; it is not still awaiting approval.

## 26. Saved partnership execution — implemented and exercised

**Readiness qualification:** later closing-review changes are not all cleared in current source. Document 37 §12.1 names the remaining blockers and acceptance proofs; the production spec is reopened for that hardening. The three-actor run below does not establish populated-upgrade or all graph-editor correctness.

### Decision and implemented boundary

The approved first cut was **Fix saved-plan contract first**. It corrects producer data without redesigning the service/product builders, preserves the existing listing details, and reuses invitation, child-Order, Work, payment and actor-authority services. No Agent product, Quick Deal runtime, new permission engine, dependency installation or historical A2 rewrite was introduced.

The production specification is `_bmad-output/implementation-artifacts/spec-saved-partnership-execution.md`. The earlier consumer-journey/mock handoff remains a prototype reference, not permission to implement every demonstrated tool.

- Shared `DealChainPlanDefinition` validates version-1 saved graphs: stable distinct node IDs, one explicit host anchor, acyclic explicit edges, supported roles and three executable conditions. Unknown audit/bypass declarations fail closed.
- Publication validates executable plans while drafts may remain incomplete. Staging reads the chosen immutable listing version, resolves real active provider listings/prices, checks primary and partner roles, and rejects mixed selectors or stale/malformed/unpriced choices.
- Request-bound idempotency and staging writes share one transaction. Successful pinned replay returns the original result before checking current listing availability. Staging creates no Order, Work or payment obligation.
- Shared consumer helpers recognize saved coordination across ListingDetail, Picks, Browse and the drawer. Direct review excludes unrelated Picks; canceling it cannot leak stale quantities into cart checkout. A preferred display reference does not count as an explicit choice for buyer-choice/open roles.
- Builder adapters retain authoritative primary/edge metadata and shared node/slot identities. Slots are an editable projection of canonical nodes, not a second authority. Cosmetic edits preserve an existing explicit graph.
- `work_completed` gates materialize and clear only from validated current source completion. The migration extends only the gate-condition constraint, preserves earlier completion-fact support, and refuses rollback over history using the new condition.
- Genuine HTTP exposed secure-context-only `crypto.randomUUID` calls in acceptance/confirmation. Shared `createRequestKey` uses native UUID generation where available and genuine `crypto.getRandomValues` otherwise in affected agreement, Order, handoff, appointment, clearance and conversation actions. It is an opaque request identifier, not an approval/authentication token.

The reviewer identified two execution blockers (missing completion-gate registration and the removed notification import), the primary-role validation gap and an over-broad rollback. These were corrected before the successful runtime continuation.

### Observed verification

| Check | Result | Qualification boundary |
|---|---|---|
| Full backend suite | 551 passed; 6,854 assertions | Explicit testing environment/verification database, array cache/session/mail and separate test storage |
| Full frontend suite | 357 passed across 56 files | Vitest with two workers, not physical-device proof |
| TypeScript and production build | Passed | Existing large-chunk warning remains |
| Scoped PHP formatting | Passed; new files also formatted explicitly | No broad formatter pass over unrelated dirty files |
| New plan definition, gate adapter and QA seeder PHPStan | No errors | Wider six-file run still reports 28 errors |
| Selected-page ESLint | 18 errors, 4 warnings | Current touched-page debt remains; no suppression or whole-lint-green claim |
| Phone/desktop-width browser | Chosen chain rendered at 390 and 1365 pixels without horizontal document overflow | Chromium viewport qualification, not Android/iOS touch/camera/GPS qualification |

Full-suite expansion exposed three backend and five frontend failures. Fixtures were migrated to explicit versioned graphs, a genuine courier-role listing and explicitly supplied published catalogs. The obsolete assertion that every standalone listing needs a compatible deal-chain recipe was removed; physical product delivery remains excluded from service contexts. Validation was not weakened and fake fallback catalogs were not restored. The direct-review quantity regression failed with quantity 1 instead of the cart's 2, then passed after transient review state was cleared.

### Actual three-actor browser continuation

This used `serbizyu_savedplan_qa_20261102`, synthetic buyer/primary/follow-up identities, real sign-ins and normal authenticated HTTP actions. Later actor switches restored only those genuinely authenticated browser sessions. Fixture setup did not pre-create Orders or stamp Work/payment terminal states.

1. The customer explicitly chose the saved two-service plan and quantity 2. Direct review displayed its two authored roles and completion prerequisite; the saved choice also continued through Picks.
2. Staging produced two Needs and one `work_completed` edge, explicitly reporting no Order, Work or payment obligation.
3. The primary provider independently accepted PHP 500.00; the follow-up provider independently accepted PHP 360.00. Each inbox required later customer confirmation.
4. The customer confirmed separately, creating `ORD-00000001` and `ORD-00000002`, separate Work instances and separate obligations. PHP 860.00 was the sum of those Orders, not parent escrow.
5. The follow-up provider's premature submission was rejected with `PREDECESSOR_GATE_BLOCKED`; Work did not advance.
6. Primary intake was submitted and explicitly approved by the buyer. Execution evidence was a clearly labeled synthetic screenshot uploaded through the real private-media API. The existing local scanner processed it; no scan result was manually changed.
7. The provider submitted final Work; the buyer's own sign-off completed it. The page showed **Work Completed / Payment due**, not paid, and said settlement still required separate confirmation.
8. The isolated dispatcher published the actual completion with zero failed/parked events. The follow-up provider could then submit intake for customer approval. A provider self-claim was not used to unlock it.

This qualifies saved-plan continuity and verified predecessor release. It does **not** claim the whole chain was completed/paid, a physical service occurred, a transfer provider ran, or every Request/Quote/Quick Deal origin has complete browser qualification.

Captures under `.impeccable/review/service-consumer-preview/`: `saved-plan-direct-review-mobile.png`, `saved-plan-chain-current-mobile.png`, `saved-plan-chain-current-desktop.png` and `saved-plan-successor-unlocked-mobile.png`. Start full-page captures at scroll zero so fixed headers are not exported partway down the image.

### Reproducible fixture and runtime safety

`SavedPartnershipQaSeeder` refuses non-local/testing environments, non-prefixed databases, enabled external providers and partial identity collisions. It creates synthetic accounts and two independently owned A1 listings through authoring services plus narrow fixture publication preconditions. Administrative approval itself was not browser-qualified. A repeat run preserved identities, listing IDs and evolving history.

Use a fresh `serbizyu_savedplan_qa_*` database, never broad seeders or account resets on the ordinary populated database. HTTP and dispatcher must share their database/private-storage root. The first harness used different effective roots: its HTTP upload landed in ordinary storage while the isolated scanner looked under `/tmp`; the scan correctly failed. Running the HTTP SAPI with `variables_order=EGPCS` made `LARAVEL_STORAGE_PATH` visible. A new upload then passed the actual local scanner and became usable proof. No scan/Work/approval guard was disabled.

Verified private root: `/tmp/serbizyu-savedplan-qa-20261102`. The normal public app is a separate runtime. A Docker-bridge listener is not a phone-accessible HTTPS deployment. Local scanner checks are not certification of a production antivirus/content-moderation provider, and gallery-file upload is not a physical timestamp-camera test.

The outbox is operational, not decorative: the observed scan and completion release required its real dispatcher. Deployment needs the documented scheduled dispatcher with matching configuration. Enqueuing an event alone does not establish autonomous media readiness or dependency release.

### Next bounded work, not another foundation project

**Next cut: finish and qualify the existing Order/Work interaction before adding product surfaces.** Reuse the incumbent action dock, wave sheet and evidence components, not a second UI kit or workflow engine.

- Show the actual proposed counterparty before customer confirmation. Current accepted-but-unformed rows still say “Provider not named.” Distinguish Needs/invitations from existing Orders and keep counts/goals truthful.
- Show the predecessor and waiting reason before an enabled Work action fails; avoid the duplicate technical error notices observed on rejection.
- Make final-review language match behavior. **Review and confirm Work** currently commits sign-off immediately; the mock's separate review/commit sheet is not implemented by that label.
- Finish A1/A3 correction and media retry/slot recovery explicitly. A rejected photo reappeared alongside the successful retry after refresh; failed items must not silently consume the finite slot budget forever.
- Qualify notification transport. One account-switching run displayed an Inertia invalid-response overlay containing plain unread-count JSON. It was dismissed and noted, not silently fixed or called an authentication failure.
- Verify truthful listing-card reputation: browse showed 4.9 for new synthetic listings while detail showed no reviews. Do not substitute another stock rating.
- Close the remaining static/lint gates. Exercise ordinary multi-item checkout, Request/Quote award, cancellation/replacement, payment acknowledgement, staff admission and history views as explicit cases; the saved-plan happy path is not their substitute.
- Preserve Request/Quote-origin custom-service formation. Its source-owned accepted Quote/Work terms are distinct from Quick Deal's listed-offer intake; do not silently require a catalog listing for every custom service. `FormQuoteAwardOrder` and the existing buyer-request flow are source evidence for this distinction, not a fresh runtime pass.

After core qualification, resume the separately saved **mobile-first Quick Deal** protocol/mock: public QR identifies a party/listing but does not approve terms; participants confirm their own exact transaction; offline records remain pending online checks; no overnight auto-acceptance or helper approval by default. A person's phone may provide the helper/kiosk surface with optional testify/witness capability, without rebuilding the deferred delegated-Agent product.

Current Work-tool scope is document 37 §13: bounded location/map pin and real timestamp-photo, voice and short-video integrations are committed, with private ingestion/review and device qualification still required. Leaflet or a capture mock does not establish those outcomes. Live dispatch/routing remains excluded. Reuse existing actor/consent and module-owned command boundaries for future AI/human assistance instead of adding a universal RBAC/approval framework now.

