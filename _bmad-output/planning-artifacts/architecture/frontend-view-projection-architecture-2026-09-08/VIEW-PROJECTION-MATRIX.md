# Serbizyu View Projection Matrix

Status: ARCHITECTURE COMPANION — canonical projection/privacy and OpenSpec row traceability
Date: 2026-09-25
Parent: `ARCHITECTURE-SPINE.md`

## 1. Matrix rule

A row does not grant backend authority. It defines what an authorized projection may expose when its relationship, resource state, visibility, and activation conditions hold.

```text
account capability ≠ resource relationship
resource visibility ≠ mutation permission
visible action ≠ server authorization
payment state ≠ Work state
reviewer perspective ≠ product login
```

## 2. Relationship codes

| Code | Relationship | Derived from |
| --- | --- | --- |
| `GUEST` | Unauthenticated viewer | No product session. |
| `MEMBER` | Authenticated but unrelated account | Session exists; no ownership/participation relation. |
| `LISTING_OWNER` | Owner of addressed Listing | `listing.owner_user_id = viewer/acting owner`. |
| `ACTING_AGENT` | Agent acting for an Owner | Current grant covers owner, resource, action, sensitivity, and time. |
| `REQUESTER` | Owner of addressed Request | `request.requester_user_id = viewer/acting owner`. |
| `ELIGIBLE_RESPONDER` | Provider allowed to respond | Capability/category/area/status/activation policy passes. |
| `BIDDER` | Provider owning one Quote lineage | Current provider/acting owner owns addressed Quote lineage. |
| `INVITED_RESPONDER` | Provider invited to one Direct Invite Request | Current Request Invitation targets viewer and exact Request/provider/purpose. |
| `INVITED_PARTNER` | Provider invited to one Deal Need | Current Deal Invitation targets viewer and exact Chain/Need purpose. |
| `BUYER` | Buyer party on an Order | Immutable Order party snapshot. |
| `PROVIDER` | Provider party on an Order/Work | Immutable Order party snapshot. |
| `OPS` | Authorized operations viewer | Explicit operation scope and purpose. |
| `REVIEWER` | Scenario Lab controller | Reviewer composition only; never a product relationship. |

Projection context stores principal account, effective Owner, resolved grant ID/version, relationship set, and access purpose separately. The addressed resource selects the relevant relationship; `ACTING_AGENT` augments it and never replaces attribution. IdentityAccess resolves current grants at read and mutation time. Conflicting or overlapping grants fail closed: one principal/effective party cannot control both requester acceptance and provider Quote lineage in the same formation, and self-award is forbidden.

## 3. Action precedence

1. Invalid/not-found/private route → recovery action only.
2. Suspended/expired session → support or reauthenticate.
3. Missing/expired acting grant → exit owner context or request approval.
4. Terminal/stale/expired resource → inspect history, refresh, replace, or return.
5. Current required user decision → that decision is primary.
6. Current creator/performer task → that task is primary.
7. Waiting on another actor → no fake CTA; show waiting meaning and allowed cancel/clarify/help.
8. Optional convenience actions remain secondary.
9. Report/block/help remain contextual safety actions, never the commercial primary CTA unless risk blocks continuation.

## 4. Browse projection

| Row | Resource | Relationship/state | Must show | Primary action | Must omit |
| --- | --- | --- | --- | --- | --- |
| `VP-BRW-001` | Listing | `GUEST`/`MEMBER`, active/public | Type, owner-safe identity, price/quote meaning, current availability overlay, area, relevant image, Work-shape summary | `listing.view` | Owner controls, request budget language, bid counts, private capacity. Shared cached fields never include the availability overlay or actionability. |
| `VP-BRW-002` | Listing | `LISTING_OWNER`/`ACTING_AGENT`, active | Same public facts plus contextual relationship | `listing.view`; management remains secondary | Buy/Book own Listing as a normal primary action. |
| `VP-BRW-003` | Request | `GUEST`, Open or approved coarse Sealed discovery | Request type, need summary, budget meaning, coarse area/timing, response-window state, mode-safe explanation | `request.view` | Add to Picks, Book, Buy, private requester contact, Bid terms/identities/counts. |
| `VP-BRW-004` | Request | `ELIGIBLE_RESPONDER`, Open/Sealed | Request-safe facts, eligibility, own-response summary if any | `request.view` | Competitor terms, identities, counts, requester management. |
| `VP-BRW-005` | Request | `REQUESTER`, open | Own Request, expiry/next-action summary; Open response summary only; Sealed omits all pre-close response signals | `request.view` or policy-allowed manage action | Submit-Bid action, basket controls, Sealed pre-close count/identity/terms. |
| `VP-BRW-006` | Any | unavailable/private/expired/Direct Invite to unrelated viewer | Truthful public status and safe alternative only when discoverable; otherwise non-enumerating omission | `browse.clear_filters`, `request.create`, or none | Active commercial CTA, stale price/capacity promise, Direct Invite existence. |

## 5. Listing detail projection

| Row | Relationship/state | Sections | Primary action | Secondary actions | Forbidden |
| --- | --- | --- | --- | --- | --- |
| `VP-LST-001` | `GUEST`, active direct-booking Listing | Listing identity, photos, scope, inclusions/exclusions, amount, availability, provider-safe trust, fulfillment choices, Work outline, safety | `auth.sign_in_to_continue` or `listing.begin_booking` ("Book Service" / "Order Now") | Add to Picks, Save, share, report/help | Request-owner controls, bids, Agent context. |
| `VP-LST-002` | `MEMBER`, active product Listing | Same plus allowed fulfillment and exact price | `listing.begin_booking` ("Order Now") or `listing.add_to_picks` ("Add to Picks") | Save, message if enabled, report/help | `request.start_quote`, `quote.select_and_finalize`. |
| `VP-LST-003` | `MEMBER`, active service/quote Listing | Service scope, rate/quote meaning, schedule/capacity, Work shape | `listing.begin_booking` ("Book Service") or `listing.request_quote` ("Request Quote") | Add to Picks, Save, message if enabled, report/help | Product quantity cart when unsupported. |
| `VP-LST-004` | `LISTING_OWNER`, current Listing | Public preview plus lifecycle/version/capacity meaning | State-specific `listing.manage`/`listing.resume`/`listing.submit_review` | Preview public view, duplicate/new version, archive when legal | Buy/Book own Listing, impersonate buyer. |
| `VP-LST-005` | `ACTING_AGENT`, permitted Listing | Same resource facts, persistent acting-for banner, grant scope/expiry, attribution | Highest permitted Listing action | Request Owner approval, exit owner context | Ownership transfer, ungranted publication, money/custody actions. |
| `VP-LST-006` | Any, unavailable/expired/stale | Last safe visible version/status, availability explanation | Refresh, choose another, create Request | Save/history/help where valid | Booking/purchase against stale version. |

### Listing dock invariant

Only Listing projections may render the storefront action dock. The dock renders exactly the projection's action descriptors; it never computes `Buy`, `Book`, quantity, or fulfillment authority from Listing strings.

## 6. Request detail projection

| Row | Relationship/state | Sections | Primary action | Secondary actions | Forbidden |
| --- | --- | --- | --- | --- | --- |
| `VP-REQ-001` | `GUEST`, Open/public | Need, budget meaning, allowed location precision, timing, response deadline, safety, visibility explanation | Sign in to establish eligibility | Browse, report/help | Private identity/contact, Bid terms/identities/counts, review/accept controls. |
| `VP-REQ-002` | `MEMBER`, unrelated/ineligible | Public/coarse Request facts and exact ineligibility reason only when safe | Complete capability/setup or browse | Save/help | Quote draft creation and any private response information. |
| `VP-REQ-003` | `ELIGIBLE_RESPONDER`, Open or Sealed/no own response | Full responder-safe Request facts, Tender mode, deadline, source requirements | `request.start_quote` | Save, report/help; structured clarification follows Messaging capability | Review all Bids, accept/close Request, competitor signals, Listing purchase controls. |
| `VP-REQ-004` | `BIDDER`, open/current own Quote | Request facts plus own Quote status/current version | `quote.revise` when mutable; otherwise waiting action | Withdraw, view history | Any competitor terms/identity/count, accept own Quote, close Request. |
| `VP-REQ-005` | `REQUESTER`, Open/no responses | Full own Request details, publication/expiry, truthful waiting state | `request.manage` or policy-allowed deadline amendment | Close/cancel, share/help | Submit a provider Bid to own Request; Add to Picks/Book. |
| `VP-REQ-006` | `REQUESTER`, any Tender mode in committed `selection_open` | Own Request, mode-safe response summary, comparable current Bid versions, selection deadline | `request.review_quotes` | Manage permitted selection timeline, cancel/help | Pre-close response signals/comparison, automatic winner language, stale/superseded selection, storefront dock. |
| `VP-REQ-007` | `REQUESTER`, selection-ready Quote | Exact current Quote version, source/provenance, scope, amount, schedule, parts/warranty, Work shape, lane meaning, and exact invitation authority when Direct Invite | `quote.select_and_finalize` | Decline, compare, cancel; structured clarification follows Messaging | Select/finalize stale, expired, superseded, invitation-invalid, or incomparable version; imply Work/payment completion; durable pre-Order selection success. |
| `VP-REQ-008` | authorized party, closed/expired/awarded | Terminal status, attributable history, resulting Order link when authorized | View resulting Order/history or create similar Request | Support/report | New responses, silent reopening, stale award. |
| `VP-REQ-009` | `INVITED_RESPONDER`, Direct Invite | Purpose-bound invitation, Request scope, eligibility, deadline, own Bid state | Start/revise exact Bid, or decline invitation | View own history/help | Request existence to non-invitees, other invitees/Bids, invitation acceptance as Order. |
| `VP-REQ-010` | `GUEST`/unrelated `MEMBER`, `open_tender` | Public-safe Request facts | View/share/report or sign in to establish eligibility | None | Exact Bid amount, scope, schedule, identity, lineage, ranking, count, losing terms, review/accept controls. |
| `VP-REQ-011` | `GUEST`/unrelated `MEMBER`, `sealed_tender` before reveal | Coarse public Request metadata only when discovery policy permits; sealed explanation without participation signal | View/share/report or eligible-response setup | None | Bid existence, count, amount, scope, schedule, provider identity, rank/hints, errors/timing that reveal participation. |
| `VP-REQ-012` | any non-invited actor, `direct_invite` | Nothing beyond uniform not-found/private recovery | Return to Browse | None | Request/invitation existence, requester, provider, deadline, status, or action. |

### Request dock invariant

Only Request projections may render the request action dock. It is never a basket/quantity dock. `Review offers` belongs only to `REQUESTER`; `Submit bid` belongs only to `ELIGIBLE_RESPONDER`; own-bid revision belongs only to `BIDDER`.

## 7. Quote/Bid detail and negotiation

| Row | Relationship/state | Must show | Primary action | Must omit |
| --- | --- | --- | --- | --- |
| `VP-QTE-001` | `BIDDER`, draft | Own source Listing/Profile version, explicit overrides, scope, amount, schedule, validity, parts, warranty, Work/evidence | `quote.submit` | Competitor content, requester award controls. |
| `VP-QTE-002` | `BIDDER`, submitted/current | Exact submitted version, status, expiry, clarification, lineage | `quote.revise` when allowed | Accept own Quote, edit immutable version in place. |
| `VP-QTE-003` | `REQUESTER`, current and mode-revealed | Complete current Quote and comparable facts | `quote.select_and_finalize` when valid | Provider-only revision/withdraw; any success before the atomic Order result. |
| `VP-QTE-004` | `REQUESTER`, Sealed before committed `selection_open` | Tender state and response deadline only; no Bid existence signal | Wait, amend only policy-safe Tender fields, or cancel | Quote rows, identities, terms, count, ordering, timing, or errors that reveal participation. |
| `VP-QTE-005` | competitor `BIDDER`, Open or Sealed | Own lineage and aggregate Tender state only | Own revise/withdraw action | Other bidder identity, price, narrative, ranking, count. |
| `VP-QTE-006` | any authorized party, superseded/expired/withdrawn/declined/not_selected/invalidated | Immutable historical version and successor/current/result link when owned or requester-revealed | Open current/result version or return | Accept, submit, or mutate terminal version. |
| `VP-QTE-007` | `REQUESTER`, accepted | Accepted exact version and resulting Order link | `order.view` | Re-accept, mutate accepted terms, mark paid/completed. |

Negotiation messages provide context. A material counteroffer creates a new structured Quote version. A chat message never mutates commercial terms.

## 8. Order, Work, and Payment projections

| Row | Resource | Relationship/state | Primary action | Separation rule |
| --- | --- | --- | --- | --- |
| `VP-ORD-001` | Order | `BUYER`/`PROVIDER`, accepted | Open the next required child task | Order summary displays Work and Obligation statuses separately. |
| `VP-WRK-001` | Work | `PROVIDER`, actionable | Shape-specific start/update/propose-completion | Payment report cannot advance Work. |
| `VP-WRK-002` | Work | `BUYER`, awaiting sign-off | Confirm completion or report concern | Payment status cannot preselect completion. |
| `VP-PAY-001` | Obligation | payer, External Cash | Report cash paid | Does not complete Work or prove provider receipt. |
| `VP-PAY-002` | Obligation | recipient, External Cash | Report cash received or mismatch | Does not complete Work or imply Serbizyu custody. |
| `VP-PAY-003` | Obligation | either party, external proof | Submit/acknowledge evidence as permitted | Screenshot is evidence, not provider verification. |
| `VP-ORD-002` | Order | unauthorized account | Not-found/private denial | No party, terms, Work, or amount leakage. |
| `VP-ORD-003` | Order | `OPS` | Purpose-scoped inspection and authorized recovery | Operations appends actions; never edits history directly. |

## 9. Deal-Chain and partner projections

| Row | Relationship | Must see | Primary action | Must never see/do |
| --- | --- | --- | --- | --- |
| `VP-DCH-001` | Coordinator/Requester | Needs, sourcing state, dependencies, derived progress/cost, each child status | Resolve current blocking Need | Parent payment/release action or sibling state rewrite. |
| `VP-DCH-002` | Lead bidder/provider | Own proposed nodes, partner confirmation state, source versions, requester negotiation | Complete/revise proposal | Accept on requester's behalf. |
| `VP-DCH-003` | `INVITED_PARTNER` | Exact assigned Need, source/custom terms, dependency facts relevant to work, invitation state | Accept/counter/decline or act on child Work | Other bids, unrelated Need terms, parent funds, sibling private data. |
| `VP-DCH-004` | Child provider after formation | Own child Order, Work, Obligation, required handoff facts | Own next Work/Obligation action | Mutate coordinator plan or another child. |
| `VP-DCH-005` | Unrelated account | Public summary only if policy permits | None or eligible response path | Chain graph/private partners/amounts/invitations. |
| `VP-DCH-006` | `OPS` | Purpose-scoped graph and child lineage | Authorized recovery/inspection | Parent-wide financial mutation or history overwrite. |

## 10. State overlays

These overlays apply after the base row is selected.

| Overlay | Projection effect |
| --- | --- |
| `loading` | Preserve screen frame and action location; actions unavailable; no stale success. |
| `empty` | Explain absence and offer one valid creation/filter/help path. |
| `validation` | Preserve safe input; focus exact correction; no state/event created. |
| `permission_denied` | Omit private facts; explain missing capability/grant only when safe; offer exit/setup/help. |
| `stale` | Show changed version summary; require explicit reload/re-review; reject prior command. |
| `expired` | Remove mutation action; show history/current replacement path. |
| `unavailable` | Explain capacity/activation status; offer alternative without silent substitution. |
| `retryable_unknown` | Do not claim failure or success; allow same idempotency key status check/retry. |
| `policy_pending` | Persistent simulation/proposed label; no production-looking success action. |
| `disputed_or_held` | Make hold/dispute visible on affected aggregate; do not collapse unrelated sibling state. |
| `completed` | Show attributable completion/history and valid follow-up; no obsolete primary CTA. |

## 11. Action leak assertions

Every OpenSpec slice touching these resources must test:

1. Request projections never contain `listing.add_to_picks`, `listing.begin_booking`, or a storefront quantity action.
2. Listing projections never contain `request.review_quotes`, `request.start_quote`, or `quote.select_and_finalize`.
3. Only `REQUESTER` or explicitly authorized acting-for context receives `quote.select_and_finalize`.
4. A `BIDDER` never receives selection/finalization of their own Quote.
5. Open and Sealed competitor projections and every derivative channel—counts, ordering, timing, errors, notifications, support/audit/export, logs/analytics, caches, prefetch, history, and async responses—omit or equalize protected information. Sealed Requester projections do the same until committed `selection_open`.
6. PostgreSQL is the default Browse path. If measured evidence activates shared cache assistance, identity includes resource kind, projection schema, public/coarse visibility class, policy/reveal version, environment/evidence class, geography/locale, and normalized query inputs. Shared values omit current lifecycle/visibility/eligibility, source revision, live capacity/availability, and executable actions; one batched PostgreSQL overlay verifies every candidate's current revision, phase, visibility/policy qualification, capacity/availability, and activation before serialization. No benefit, regression, disablement, failure, or miss uses PostgreSQL.
7. Revoked/expired Agent grants remove affected actions, invalidate affected caches, and reject direct commands.
8. Payment actions cannot advance Work; Work actions cannot settle Payment.
9. A Direct Invite Request Invitation cannot create an Order without an exact current Bid and atomic agreement formation; Request award revalidates that exact invitation. A Deal-Need Invitation follows its separate accepted-terms child-formation contract and does not require a Quote unless its sourcing mechanism does.
10. Readiness facts can unlock only named downstream actions; they do not complete Work or release protected money by themselves.
11. Reviewer composition is server/build-controlled, synthetic-only, and isolated from production navigation, session, origin, storage, APIs, cache, cookies, service worker, and imports.
12. Disabled educational actions contain no executable target; unauthorized/private actions are omitted.

## 12. Governed policy inputs

- Category-specific responder verification, capability, safety-evidence, media, precise-address, and rate-limit thresholds.
- Policy-bounded response/selection deadline ranges and which non-material fields remain amendable after publication.
- Whether early close is permitted for each mode; closing never auto-awards.
- Notification timing and channels once the Messaging/notification capability begins.

Absent policy fails closed with `policy_pending` or an explicitly labeled simulation-only variant. The product decisions are otherwise fixed: Open is public-safe Request discovery and eligible participation without competitor terms/counts; Sealed gives each bidder only their own lineage/submission result and hides every other response signal from requester, competitors, and public until committed `selection_open`; Direct Invite is non-discoverable and non-enumerating; invitation acceptance never forms an Order; Sealed is application access control, not a cryptographic commitment.
