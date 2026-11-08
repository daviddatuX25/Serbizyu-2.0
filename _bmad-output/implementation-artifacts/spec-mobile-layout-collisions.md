---
title: Mobile navigation and listing-builder layout collisions
type: bugfix
created: '2026-11-03'
status: done
review_loop_iteration: 0
baseline_commit: 3a546469915fc08250960790830d897542a796dd
context:
  - '{project-root}/.ai/rules/ui-kit.md'
  - '{project-root}/.ai/rules/agent-delegation.md'
---

<frozen-after-approval reason="human-owned intent — implementation awaits layout review">

## Intent

**Problem:** On mobile, the globally centered QR action overlaps Orders because the navigation contains six slots but reserves its QR spacer in the third slot. Product and service builders give the step indicator and the two-label Guided/Standard selector competing non-shrinking space. The service builder also currently fails to render when a live partner rating is numeric.

**Approach:** Give every bottom-navigation action its own grid cell, keeping QR inside its allocated cell rather than absolutely positioning it over another action. Replace both builder mode selectors with one shared, compact, keyboard-accessible control displaying only the current mode. Allow the step indicator to truncate within its column. Correct the service rating adapter using the existing product adapter's number/string/null handling.

## Boundaries & Constraints

**Always:** Preserve existing routes, callbacks, navigation destinations, Orders badge, optional notification control, draft values, current guided step, saved combinations and preview actions. Keep the navy/white/mango visual system and existing builder forms. Maintain at least 44px interactive targets at supported narrow phone widths. Preserve user WIP.

**Ask First:** Removing a navigation destination or moving Post/Create into a different part of the application. The proposed implementation retains the existing six destinations; reducing to five requires an explicit product decision.

**Never:** Database changes, migrations, reseeding, account resets, unrelated commerce changes, a new navigation framework, different mobile/desktop form implementations, or claiming physical-device QR/camera qualification from browser emulation.

## I/O & Edge-Case Matrix

| Scenario | Input / state | Expected behavior |
| --- | --- | --- |
| Bottom navigation | 320, 375 and 390px viewport; six existing destinations | QR and Orders have independent non-overlapping visual and hit areas; captions remain readable. |
| Notification variant | Existing AppShell adds its notification control | All seven controls retain their own cells without moving QR over Orders. |
| Orders indicator | Nonzero Orders count | Badge remains attached to Orders, not to QR. |
| Guided to Standard | Enter a title, then toggle mode | All-in-one form appears, title remains unchanged, and the single control shows Standard. |
| Standard to Guided | Toggle back without submitting | Guided form and its current step return without resetting input. |
| Long step caption | Narrow phone at a later guided step | Caption stays within its column; no overlap with mode or preview actions. |
| Partner rating | Numeric, numeric-string or missing rating | Service builder renders and preserves real rating facts; missing values do not become fabricated scores. |
| Desktop | 1365px viewport | Desktop navigation remains unchanged; both builder modes and preview behavior remain usable. |

</frozen-after-approval>

## Code Map

- [BottomNavBar.tsx](../../resources/js/marketplace/components/BottomNavBar.tsx): shared navigation and optional notification slot.
- [AppShell.tsx](../../resources/js/components/AppShell.tsx): caller supplying the optional notification; inspect compatibility, do not duplicate navigation.
- [CreateProduct.tsx](../../resources/js/Pages/Listings/CreateProduct.tsx) and [CreateService.tsx](../../resources/js/Pages/Listings/CreateService.tsx): matching header grids, step captions and mode state.
- [builderGuidance.ts](../../resources/js/lib/builderGuidance.ts): existing Guided/Standard type and step definitions.
- `resources/js/components/listings/BuilderModeToggle.tsx`: proposed shared control in the existing component directory.
- Existing CreateProduct and CreateService behavioral tests: preserve authoring behavior while migrating mode-control selectors.

## Tasks & Acceptance

**Execution:**
- [x] Update BottomNavBar to use action-owned grid cells; remove the invisible spacer and viewport-centered QR positioning without changing callbacks.
- [x] Add the shared single-label mode toggle using the existing BuilderMode contract and consume it in both builders.
- [x] Constrain both headers with shrinkable grid columns and truncated step captions; retain distinct back, preview and mode targets.
- [x] Correct the service partner-rating type/adapter and exercise a numeric candidate in a real authoring behavior regression.
- [x] Update affected mode interaction tests; do not add source-string, CSS-class or callback-echo tests for layout.
- [x] Build and exercise the actual mobile surfaces, including the optional notification variant, before reporting completion.

**Acceptance Criteria:**
- Given any supported mobile width, when Orders or QR is tapped, then the intended existing action runs without the other target intercepting it.
- Given either builder and entered form data, when the one mode toggle is used in either direction, then only one current-mode label is shown and the entered data and guided step survive.
- Given a long guided step caption, when the header is rendered at 320px, then title, preview, step and mode controls remain contained and independently usable.
- Given live numeric partner ratings, when the service builder is opened, then the form renders rather than a blank page.
- Given the desktop layout, when the same changes are built, then navigation and authoring actions remain usable without a broader redesign.

## Spec Change Log

- User approved keeping all six navigation actions. No destination was removed or relocated.
- The batched 320px runtime pass exposed incumbent Standard-form overflow: the product pickup action extended the canvas to 380px and service price rows to 353px. The final responsive batch wraps the pickup card and permits the two service title inputs to shrink. Values, actions and form structure are preserved; this is a layout refinement, not a commerce change.


## Verification

**Before evidence:** `/tmp/mobile-nav-before-375.png`, `/tmp/mobile-product-builder-before-375.png`, `/tmp/mobile-product-builder-before-320.png`. The service capture is blank because of the observed rating adapter crash; it is not evidence of a working service header. Recent Boost/browser logs identify `rating.trim is not a function`.

**Focused checks:** Use Sail Node-tools for the two existing builder test files and the relevant Browse/Orders interaction suites; run the installed TypeScript/Vite build. No PHP or database checks are needed for this frontend-only cut.

**Runtime checks:** Capture product and service builders in Guided and Standard at 320/375/390px plus desktop. Enter a synthetic title and toggle twice without saving. Inspect real bounding boxes for QR, Orders, optional notifications and all header controls. Click Orders and QR separately. Batch visual review, fix any scoped findings together, and confirm once. Record browser-emulation limits and leave the existing application running.

### Completed evidence

- Sail Node-tools: **40 tests passed across five files** — CreateProduct, CreateService, Browse, Orders/Index and AppShell. The numeric-rating service authoring case failed before the adapter fix with `rating.trim is not a function`, then passed with real form and mode interactions.
- `npm run build` passed TypeScript and Vite compilation; final JavaScript asset `app-Dx04-_Me.js`. The existing large-chunk warning remains.
- Focused ESLint passed for BottomNavBar and BuilderModeToggle. The design detector reported one incumbent gray-on-red warning in the product variant section, outside the changed controls; no blanket lint/accessibility pass is claimed.
- Both builders were exercised in Guided and Standard at **320, 375, 390 and 1365px**. Header controls remain contained, mode count is one, minimum visible header targets are 44×44px, and document width equals viewport width in all sixteen captures.
- Actual Enter/Space interaction toggles both builders while retaining entered titles and guided step 2. Product step 5's longer `Fulfillment & Review` caption truncates at 320px without covering the toggle.
- Normal six-action navigation has minimum widths of 52px at 320px and 61.16px at 375px. QR and Orders do not overlap; mobile navigation remains hidden at desktop width.
- Clicking QR opens its existing Quick Deal dialog. Escape closes it; clicking Orders separately reaches sign-in for the anonymous session. This verifies distinct actions, not a completed QR transaction.
- The optional seven-control layout was measured at 320px using a temporary DOM/CSS probe with the existing NotificationBell and production slot styling: minimum targets 44×44px, no QR/Orders overlap. AppShell's existing regression also passed. The authenticated Money History journey was not exercised; its guest route correctly redirected to sign-in. The probe was removed by reloading.
- Two independent scoped reviews returned no actionable findings. Final owned-browser runtime error entries were empty.
- Screenshots: `/tmp/mobile-product-guided-final-375.png`, `/tmp/mobile-service-guided-final-375.png`, `/tmp/mobile-nav-final-375.png`, and the corresponding mobile/desktop state captures. Geometry and interaction evidence: `/tmp/mobile-layout-verification.json`.
- Browser viewport emulation is not physical iOS/Android qualification. No migrations, reseeding, account resets, package installation, backend changes or saved test listings were performed. The existing application remains running at its configured local URL.

## Suggested Review Order

**Shared mobile navigation**

- Every existing action owns a grid cell; QR no longer overlays Orders.
  [`BottomNavBar.tsx:30`](../../resources/js/marketplace/components/BottomNavBar.tsx#L30)

**Consistent builder mode and responsive headers**

- One native switch displays the current mode and keeps existing mode setters.
  [`BuilderModeToggle.tsx:9`](../../resources/js/components/listings/BuilderModeToggle.tsx#L9)
- Product title, preview, step and toggle have independent contained targets.
  [`CreateProduct.tsx:1415`](../../resources/js/Pages/Listings/CreateProduct.tsx#L1415)
- Service uses the same control; numeric partner ratings no longer crash rendering.
  [`CreateService.tsx:266`](../../resources/js/Pages/Listings/CreateService.tsx#L266)

**Behavior regressions**

- Entered product data and the current guided step survive both mode transitions.
  [`CreateProduct.test.tsx:245`](../../resources/js/Pages/Listings/CreateProduct.test.tsx#L245)
- Service authoring remains usable with a numeric-rated partner candidate.
  [`CreateService.test.tsx:89`](../../resources/js/Pages/Listings/CreateService.test.tsx#L89)

## Follow-up — five-action navigation and resilient cards

**Completed 2026-11-04.** The user's later screenshot review explicitly supersedes the earlier keep-six navigation decision. The original accepted work above remains historical context; the current mobile bar has five actions.

### Scoped plan and delivered behavior

- Keep Explore, Post, Scan, Orders and Profile. Remove the invitations tab, its retired type value and obsolete caller branches.
- Put a permanent **Deal invitations** entry inside Notifications. It remains available with an empty inbox, closes the inbox when opened, and does not acknowledge unrelated notices.
- Remove the optional bottom notification slot so no caller silently adds a sixth action. Keep Notifications accessible in a compact mobile header on AppShell and the invitations inner page, alongside the existing desktop navigation.
- Keep the named location on mobile listing cards; remove distance from that card projection and its unused prop. Preserve desktop distance displays and nearest sorting.
- Give cards a fixed 94px thumbnail column and a shrinkable text column. Bound long titles/descriptions, wrap prices/review metadata, and give location its own row. Text can grow a card vertically rather than pushing its image outside the viewport.

### Evidence

- The supplied screenshot was inspected directly. Initial normal-runtime measurement at 360px found a 438px document width and the first thumbnail extending beyond its 328px card.
- Final normal-runtime checks at **320, 360, 375 and 390px** found document width equal to viewport width, all 13 public-card thumbnails contained, no mobile distance suffix, and exactly five bottom actions. Minimum action width was 62.39px at 320px; action height was 59px.
- Declared **frontend-only** stress fixtures covered long unbroken titles/descriptions and locations, a large price with a supplied rating, unavailable price/no reviews, and explicit zero price. All three cases remained contained with separated metadata at all four widths. No corresponding listing records were created or changed; the temporary response override was removed.
- Actual authenticated Notifications → Deal invitations navigation was exercised with a retained synthetic actor in the existing isolated QA environment. The inbox was empty, the collection entry remained available, the dialog closed, the private invitations page opened, and no notification-read POST occurred. Unread summary stayed unchanged. The existing regression also covers nonzero unread counts.
- The actual authenticated Money History/AppShell surface had five bottom actions and its visible notification bell above, rather than inside, the bottom bar.
- Scoped review identified a missing desktop header on the invitations page. DesktopGlobalNav was restored alongside the mobile bell; the reviewer confirmed the finding resolved. Runtime at 1365px confirmed visible Browse, Orders and Notifications controls with mobile navigation hidden. Desktop public-card distance display remained visible.
- **23 focused tests passed across five files:** AppShell, NotificationCenter, DealInvitations/Index, Browse and Orders/Index. TypeScript/Vite build passed with the incumbent large-chunk warning; final JavaScript asset is `app-9CluBufh.js`.
- Focused shared-component/test ESLint passed. The design detector returned no findings for the five selected navigation/card/notification surfaces. This is not a repository-wide lint or accessibility certification.
- The card-design review returned no findings. Final normal and isolated browser runtime error entries were empty.

### Runtime safeguards and artifacts

The authenticated smoke reused existing synthetic accounts, database and private storage under `serbizyu_pilot_qa_f04_20261103` and `/tmp/serbizyu-controlled-pilot-qa-f04-20261103`; external providers remained disabled. No migrations, reseeding, password resets, dependency changes or backend implementation changes were made.

Evidence is retained at `/tmp/mobile-card-invitation-refinement-evidence.json`. Captures include `/tmp/refinement-mobile-final-360.jpg`, `/tmp/refinement-notification-invitations-first-pass-390.png`, `/tmp/refinement-authenticated-invitations-mobile-390.png`, `/tmp/refinement-invitations-desktop-final.jpg` and `/tmp/refinement-stress-mobile-390.jpg`.

Owned browser tabs and the temporary isolated QA listener were stopped; the normal application still returned HTTP 200. Browser viewport checks do not qualify physical Android/iOS rendering or QR transactions.

## Follow-up — one mobile page header

**Completed 2026-11-05.** The bell-only mobile row introduced in the previous follow-up stacked above request/bid page navigation. This follow-up removes that extra row rather than adding another shared toolbar.

### Ownership and changes

- AppShell retains desktop navigation and the five-action bottom bar; it no longer injects a mobile notification strip. Its current request-detail and Money History consumers place notifications inside their existing page headers.
- Request/bid detail has one labelled mobile header containing the back action, tender context, request title and notification bell. The title can shrink/truncate without covering the 44px actions.
- Listing detail places the bell inside its existing Wishlist/Picks action row; no additional top bar is rendered.
- Invitations and Money History place the mobile bell beside their existing page title. DesktopGlobalNav and its desktop notification control remain intact.
- Bid, quote, listing, payment and notification-read policies are unchanged. Invitations remain reachable through the existing notification inbox.

### Regression and runtime evidence

- The shared-shell composition regression failed before the fix because both shell and page rendered a notification button. It now asserts a single page-owned notification action inside the contextual header while preserving all five bottom actions.
- A request-detail regression opens the actual shared notification inbox from the same header as the back link and request title.
- **44 focused tests passed across six files:** AppShell, Requests/Show, Payments/MoneyHistory, DealInvitations/Index, ListingDetail and NotificationCenter. TypeScript/Vite production build passed; final asset `app-DanmJu7w.js`. The incumbent large-chunk warning remains.
- Focused shell/header-test lint passed. The design detector reported an incumbent `border-l-4` accent in request body content, outside the changed header; no blanket design/lint pass is claimed.
- Actual public request and listing pages were checked at **320, 360, 390 and 1365px**: one visible bell, contained inside one visible top header, with document width matching viewport width.
- At 360px, the request/bid header previously began below the 56px bell strip and ended at 120.25px. The final single header starts at 0 and is 69px high. Listing detail retains its existing 56px mobile header.
- Actual authenticated Money History, invitations and listing detail were checked at the same widths using a retained synthetic account in the isolated environment. Mobile bells sit with their page title/actions, desktop navigation remains visible at desktop width, and the five-action bottom bar remains on the shell pages.
- On all three authenticated pages, the integrated bell opened Notifications with the Deal invitations entry intact, Escape closed it, and focus returned to the same header action. A completed inbox load also succeeded with no error. Early Escape checks intentionally aborted three pending inbox GETs; these were recorded cancellations, not uncaught page exceptions.
- A temporary frontend-only long-title probe at 320px confirmed truncation without collision with Back or Notifications; reloading removed the probe without editing the request.
- Two independent scoped reviews returned no actionable findings. Browser captures include `/tmp/request-single-header-final-360.jpg`, `/tmp/listing-single-header-final-360.jpg`, `/tmp/invitations-auth-single-header-final-360.jpg` and `/tmp/request-single-header-long-title-320.jpg`. Structured evidence: `/tmp/single-mobile-header-evidence.json`.

The isolated runtime reused existing actors, database and private storage with external providers disabled. No migrations, reseeding, account resets, bids or payments were submitted. Owned browser tabs and the temporary QA listener were stopped; the normal application remained available with HTTP 200. These are browser-viewport checks, not physical Android/iOS qualification.
