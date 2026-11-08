# Commerce finish map and Quick Deal scope

**Purpose:** one current direction, a source-backed map of what exists, and a finite sequence to finish the agreed commerce experience. Planning only: no implementation, tests, or browser qualification are claimed by this document.

**Scope precedence:** the latest user decisions below replace the release-scope choices in document 36 that deferred all Quick Deal/GIS work and treated the full human-Agent journey as required. Document 36 remains a technical findings/backlog source, not the current release checklist. Domain security, accepted-history, payment, evidence, and module-isolation invariants still apply. This document does not silently amend database schemas or approve a production deployment.

**Current execution checkpoint:** §13 records the final user-approved finish decisions; §12 holds the bounded repair queue and shared experience contract. Use the [implementation handoff](39-controlled-pilot-implementation-handoff.md) and [finish specification #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34) for the published task graph; the first runnable child is [#35 / F05](https://github.com/daviddatuX25/Serbizyu-2.0/issues/35). Earlier checkpoints and document 38 retain historical evidence; neither a green suite nor an `implemented` label closes an outstanding source-review or deployment gate.

## 1. Decisive product boundary

### Finish scope

- Actual listed services/products; Requests and provider bids/Quotes/counters.
- Accepted agreements becoming canonical Orders, with Work and payment independent.
- Bounded Deal Chain coordination of independent child Orders, including dependency and replacement recovery.
- Quick Deal online and offline: identify actual parties/listings, record exact terms and acknowledgements, collect each party's own confirmation, retain copies, synchronize safely, and continue an Order when valid.
- Shared-device assistance: another person's phone can function as an access point. The helper may record their own assistance/observed facts, never another party's approval. Same transaction UI; no witness step on ordinary transactions.
- Physical kiosk access: use the same public browse, QR entry and transaction pages. Custom kiosk hardware, cash handling, and expanded future payment services are not required.
- Location check-in/map pin as a Work Tool, reusing existing geolocation/Leaflet foundations; no continuous courier tracking.
- Enough staff access, investigation and recovery to handle the named journeys safely.
- Timestamp-photo capture, voice and short-video Work evidence with permitted-versus-required tool rules, private review, upload safety and recovery; evidence never supplies participant approval.
- Reviewed Filipino/English critical journeys for a controlled Tagudin pilot; Ilocano-ready content/preferences, with Ilocano activation following native review rather than blocking this pilot.
- A small realistic synthetic fixture set and recorded browser/command acceptance evidence.

### Explicitly not required to finish this scope

Full human-Agent onboarding/cockpit/owner grant-management, AI execution integrations, a general permission engine, all-resource Policy migration, rotating secret approval cards, new account PIN authentication, GIS dispatch/live-tracking/routing platform, standalone unlisted-product commerce, or platform financial custody. Existing authorization/consent checks and history are preserved, not deleted because the Agent product is deferred.

Offline Quick Deal is **not** silently removed to make the checklist smaller. It has its own delivery gate because the current scanner shell is not its implementation.

## 2. Language: stop using one word for different authority

| Term | Exact meaning | What it never means |
|---|---|---|
| Public profile QR | Public lookup of a person/shop and permitted catalog | Login credential or transaction consent |
| Public listing QR | Select an actual listing/version; still review terms/quantity | Current stock guarantee or automatic acceptance |
| Password | Existing online account authentication through the canonical auth services | New offline PIN or secret printed QR |
| Work confirmation code | Existing purpose-bound clearance/sign-off challenge | Account password; retain the established code rules |
| Quick Deal confirmation code (proposed) | One-use, party/action/transaction-version-bound approval challenge, independently obtained by the confirming party | Account password, reusable public-card PIN, login/signup OTP, or interchangeable Work sign-off code |
| Confirmation QR/link (proposed) | Opens the intended party's authorized review of one transaction/version/action, or transports an already attributable approval proof under the reviewed protocol | Scanning a public identifier, anonymous bearer approval, automatic acceptance, or a reusable secret card |
| Map pin | Geographic point captured/selected as candidate Work evidence | Account PIN or independently verified presence |
| Transaction confirmation | A party approves an exact version of terms or a specified acknowledgement | Approval of later edits, automatic payment, or universal Work completion |
| Transaction/receipt QR | Carries or resolves one transaction/version/copy-verification purpose | Credential granting new actions; public exposure of full private history |
| Helper statement | The helper attests their own assistance or specific observed fact | Buyer/seller approval or guaranteed truth of the exchange |
| Kiosk mode | Access through a shared device/physical terminal, using the same pages | Broad delegated authority, separate commerce engine, or cash-custody permission |

Use short English UI labels with stable translation keys, then locally reviewed Ilocano/Filipino text. No invented deep/formal translations. Locale must not change stored amounts, action identifiers, or confirmation semantics.

## 3. Current source map: existence is not qualification

No current journey is marked PASS by this planning pass. `Exists` below means code paths were located, not that they were exercised now.

| Area | Source evidence | Current conclusion |
|---|---|---|
| Account login | `AuthController::loginWithPhonePassword()` / `loginWithEmail()` and `/auth/sign-in` | Existing password/session path; reuse it. Safe return target and shared-device isolation require work/qualification. |
| Request/Quote intake | `routes/web.php` Request publication, Quote submit/counter/accept routes | Existing server intake. Document 36 records canonical lane/draft mismatch to fix, not assume green. |
| Orders/Work/payment | Order proposal/accept/counter/amend, Work node/evidence/challenge, payment and A4/A9 routes | Existing core continuation to qualify. Keep source services, no parallel Quick Deal fulfillment/payment engine. |
| Deal Chain | `DealChainController`, invitation/confirmation and child coordination paths | Existing implementation to qualify, not rebuild because historical plans differ. |
| Quick Deal | `QuickDealScanModal.tsx:56–111` draws an SVG simulated QR and camera viewfinder; no scanning/transaction request there | UI entry exists; actual public resolver/confirmation/offline storage/sync/receipt workflow is not established by this shell. |
| Public QR authentication | Public-looking graphic contains no meaningful QR payload in that component | Do not treat current My Citizen QR as a credential or operational identity exchange. |
| Offline runtime | Source inventory found no application PWA/service-worker registration, IndexedDB transaction queue, or server offline-event ingestion protocol | Offline Quick Deal requires real durable runtime work. Existing localStorage drafts/picks and decorative QR are not that runtime. |
| QR reuse candidates | Public listing projection carries `listing_version_id`; public trust-profile endpoint returns trust fields, not a QR seller catalog | Reuse listing projections; explicitly build profile-to-owned-listing selection and privacy-preserving resolver. |
| Seller-initiated Quick Deal | Existing `OrderController::store()`/`SubmitOrderProposal` entry requires the authenticated buyer | Seller scanning a buyer is a required new intake adapter/record path; do not impersonate the buyer or silently omit this direction. |
| Shared-device/helper/kiosk | No executable product path established in the reviewed Quick Deal/auth routes | New bounded interaction/session work, not the deferred Agent product. |
| Rejection before Order formation | `CommunicationsController::createCase()` requires `order_id` | Existing Order case intake cannot be assumed to handle a rejected Quick Deal that never formed an Order. Needs a record/case attachment contract. |
| Location Work Tool | `WorkLocationPinInput`, `WorkNodeEvidenceTools`, `WorkExecutionService` location validation | Device/manual coordinates exist. Manual fallback currently asks latitude/longitude; map-pin UI integration and permission/offline behavior need qualification. |
| Map library | `package.json` Leaflet declaration; `TagudinLeafletMap` | Reuse candidate for map pins; library does not provide verification, offline evidence persistence, or a live-dispatch backend. |
| Staff | `StaffAccessService`, protected staff routes | Existing staff eligibility check; login/setup friction previously observed. Do not confuse account provisioning with a missing login page. |
| Fixture dataset | `DatabaseSeeder` and domain scenario seeders; `LiveSurfaceContractTest` | Existing populated examples have reviewed identity/payment/Work continuity hazards. Repair only what the acceptance journeys need; no database resets. |
| Authorization | Role reader, resource actor context, exact consent checks under transaction lock, domain checks | Useful foundation. Gate/Policy organization is not equivalent to a finished universal permission engine. |

Historical suite counts and closed Issue #33 are historical evidence only. These rows require their own current verification outputs before promotion to PASS.

Read-only source inventories also confirmed that `Auth/SignIn` remembers a phone in localStorage and that Work clearance uses purpose-bound 4-digit presence / 6-digit drop-off challenges. Shared-device cleanup must cover remembered data; neither Work code is the rejected account-PIN proposal. No new tests, builds, or browser runs were performed by either inventory.

## 4. One transaction system, several entry paths

```text
Listing booking -----------+
Request -> bids / Quotes --+--> Current accepted terms --> canonical Order
Quick Deal ----------------+                               |
                                                            +--> Work/evidence
Deal Chain coordinates independent child Orders             +--> payment facts
                                                            +--> support/history

Quick Deal record can exist before an Order is accepted.
Do not create a fake accepted Order just to preserve a claim or open a case.
```

Quick Deal's new marketplace-Order intake requires a real listing anchor. Profile QR requires listing choice; listing QR skips choice but not review. Existing Order updates bind the Order and exact current terms/action; they do not create a duplicate agreement. This does not impose a listing on the separate existing Request/Quote-origin custom-service path: preserve its source-owned accepted Quote/Work terms and canonical award service.

Agreement, item/work receipt, and payment acknowledgement are separate facts. A receipt copy can document what each party claimed without declaring that the platform verified all claims or guarantees legal protection.

## 5. Quick Deal decision table

| Case | Required behavior |
|---|---|
| Both online | Each authenticates and confirms exact terms through their own identity. Form/update the Order only through normal server rules. |
| One phone, other carries public QR | Identify the other person; phone user confirms their own side only. Other confirmation remains pending for follow-up through their account/shared device. |
| Both offline with previously prepared apps | Capture the known listing snapshot and exact claims durably; exchange copies where supported. Preserve whose attributable confirmation is available; missing confirmation remains pending. Server checks and canonical effects wait for synchronization. |
| Profile card but no cached listing data offline | Cannot invent the seller's catalog or guarantee availability. Connect first or save a clearly pending note; no accepted marketplace Order. |
| Helper's phone | Same ceremony plus helper's own attributable statement in assisted mode. Helper cannot click as both parties or silently switch principal identity. |
| Physical kiosk | Browse/scan/review using same pages. Separate authenticated participant sessions; clear credentials and private state between users. |
| Counterparty rejects later | Preserve proposal/version, confirmations, claims, copies, and rejection. Originator may open an appropriately scoped concern/case. No automatic accepted debt, reversal, reputation penalty, or financial hold merely from one party's allegation. |
| Party never responds | Stay pending with an explicit expiration/recovery policy; silence is never consent. Preserve historical record after expiry. |
| Same transaction uploaded by both phones/retried | One canonical effect; stable transaction identity and actor-bound idempotency. Changed terms/reused key is rejected. |
| Server finds invalid listing, insufficient stock, revoked authority, or a conflicting Order update | Retain the historical record, do not silently reprice/substitute/erase it. Prevent the invalid new state transition and route to explicit reconciliation. |

### Offline deliverable: two distinct promises

1. **Required:** durable offline preparation, a retained readable record, safe reconnection, missing-party online follow-up, reject/concern path, and no duplicate effects. Public QR is sufficient only for identity lookup, not offline authorization.
2. **Protocol design required before implementation:** independently authenticated two-phone offline confirmation/exchange, signing/key lifecycle, canonical bytes/version, public/private QR payload limits, revocation uncertainty and copy delivery acknowledgement. Earlier documentation specifies rich cryptographic/animated transport; do not pretend that exists, silently drop it, or make a static/rotating QR approve arbitrary terms. Prototype on representative phones, select the simplest proven transport, and label online checks pending. Password verification is never performed locally from a copied server password hash.

This is a protocol checkpoint, not a request to keep revisiting product intent. The intent above is fixed; the implementation owner must produce and review a compact technical contract before the offline slice can be called implementation-ready. If a proposed implementation cannot meet it, report the exact limitation for approval rather than replacing offline Quick Deal with online-only behavior.

### Before the QR/offline build starts

The implementation owner must write one compact protocol/data contract, not another whole-project plan: public lookup QR fields and privacy; transaction/version/action identity; buyer- and seller-initiated intake; confirmation and rejection facts independent of Order/Work/payment state; pre-Order support-case linkage; local record persistence/export and copy delivery; replay handling; authentication/signing and revocation uncertainty; synchronization conflict outcomes; participant/helper session isolation. Schema changes require the project's ordinary schema review first. No dependency/codec/provider is selected merely because a historical specimen names it.

## 6. Shared device, testimony, and authority

One familiar UI, not three products. Ordinary transactions do not require a witness. When a helper lends their phone and assists, record the helper's own identity and narrow statement separately from participant approval. Assistance, observed handover, and observed cash exchange must not collapse into a generic Verified badge. The helper is neither a platform adjudicator nor a delegated owner.

The shared-device slice must decide session transitions, safe recipient routing, and account privacy before building a helper shortcut. Minimum: no credential sharing/remembered login, no simultaneous implicit identity changes, clear participant-specific confirmation, session invalidation, and clearing identity-scoped private state. A logout or full reload alone does not erase all browser storage; verify actual cache/storage behavior. A malicious borrowed device remains a security limitation, not a guarantee the UI can remove.

Physical kiosk payment/cash collection expansion is separate future scope. Public browsing can reuse existing public pages without authentication; private records and confirmation cannot.

## 7. Finish sequence: stop expanding the plan

| Gate | Concrete work | Exit proof | Related document 36 work |
|---|---|---|---|
| F0 — Safe runnable baseline | Isolated disposable app DB/storage, known synthetic actor credentials, minimal coherent listing/stock/Work starting data; preflight identity/reference conflict, no reset | Buyer, provider, merchant, courier and two staff accounts can sign in; each fixture's real next action works; rerun after progress does not rewind it | C-00/C-02 and only necessary C-03/C-04/C-05/C-02c repairs |
| F1 — One complete core transaction | Fix request lane/draft contract; Request -> Quote/counter -> acceptance -> Work/proof -> buyer approval -> cash/P2P recipient acknowledgement | Real two-party browser continuation, refresh/relogin, wrong-user and duplicate/recovery evidence | C-03 through C-07, C-12 |
| F2 — Commerce variations | Product stock/counter/courier A4, A3 scheduling, A9 delivery and existing Deal Chain formation/gates/replacement; enough staff recovery | Named scenario per supported shape/coordination path, no oversell, no sibling leakage/cascade or duplicate collectible obligation | Existing implementation + focused C-12 cases |
| F3 — QR and online Quick Deal | Real public QR resolver/profile/listing selection, immutable proposal/version confirmation, canonical Order adapter, readable private receipt, rejection/concern attachment | Buyer scans seller and seller scans buyer; same terms accepted/rejected independently; repeat/forged QR cannot create authority; no unrelated record disclosure | New bounded build, not present in 36 |
| F4 — Offline and assisted access | Compact reviewed offline protocol, durable local records, pending counterpart confirmation, safe sync, rejection/case before Order, shared-device helper testimony and kiosk browsing via same pages | Two-phone/one-phone scenarios, no network, reload/restart, both uploads, changed terms, conflict, rejection, session clearing and offline-copy limitations exercised | New bounded build; retain existing domain checks |
| F5 — Usability, location tool, final qualification | Named next action; keep mobile dock/sheets; targeted desktop improvements; device/map pin plus landmark; permission denied/map unavailable states; final evidence register | Mobile and desktop complete same permitted operations; location is candidate proof only; every required scenario has evidence | C-08/C-09/C-10/C-11 and narrow location extension |

F0–F2 are the first working-commerce checkpoint, not a quiet deletion of F3–F4 from release scope. Full agreed finish includes online/offline Quick Deal and assisted access. The order above minimizes debugging several new systems simultaneously.

### Foundation is required, not a rewrite program

Retain named capabilities/permissions, module-owned resource decisions, actual actor/principal attribution, consent attenuation, version/idempotency, exact approvals, transaction locks and audit. Use Laravel-native Gates/Policies where they consolidate real decisions. A staff Gate and the small Listing update Policy example in C-01/C-01b are bounded patterns; no platform-wide policy migration, AI runtime, or delegated management product blocks F1. Existing service guards must never be bypassed just because a browser projected an action.

### What not to build as prerequisites

No large fixture framework, persona switcher, all-screen redesign, new passkey/PIN scheme, custom kiosk hardware, continuous tracking, automatic fraud-scoring engine, universal Agent cockpit, or live financial gateway. Realistic test data and permission checks remain necessary, but implement the smallest setup that proves the next journey. Fix observed consumer-visible failures before unrelated refactors.

## 8. Finite acceptance map

All rows are **NOT RUN** in this planning pass. For each row record initial actors/references, environment/evidence class, exact steps, expected/observed UI and persisted facts, artifact/time, and any blocker. A supported-code search is source evidence only. Each journey includes wrong-user, retry/duplicate, refresh/relogin, and recovery; an inapplicable subcase needs a reason.

| ID | Required scenario | Completion oracle |
|---|---|---|
| A01 | Login and staff eligibility | Correct actors reach intended pages; ordinary/suspended/expired-role user denied; logout/private state cleared |
| A02 | Request/bids/Quotes -> agreement | Provider response and buyer acceptance pin current terms once; stale/retired inputs recover without duplicate Order |
| A03 | A1 Work -> cash/P2P | Authored proof/scanner/clearance executed; correct recipient acknowledgement; Work alone never settles payment |
| A04 | Product + counter/courier A4 | Exact variant stock/custody/receipt facts, physical fulfillment once, no generic completion bypass |
| A05 | A3 and A9 | Valid slot/reschedule; delivery version/revision/acceptance; stale/overlap/rejected artifact recovery |
| A06 | Deal Chain | Independent agreed children, explicit gates and replacement, commercial privacy, no pooled money or sibling cascade |
| A07 | Public QR and online Quick Deal | Profile/listing choice works both directions, exact-party terms confirmation, canonical Order once, private verifiable receipt |
| A08 | Offline Quick Deal | Durable known snapshot and confirmations/claims, no-signal copy capture, later safe sync/follow-up, both uploader/retry deduplication |
| A09 | Rejection before accepted Order | Missing-party rejection retained; initiator can raise scoped concern with record evidence without fake accepted Order or automatic guilt |
| A10 | Borrowed phone/physical kiosk | Same public browse and transaction UI, helper statement distinct, participants authenticate separately, no approval/identity/storage leakage |
| A11 | Location Work Tool + Order usability | Device/map pin/landmark and accuracy/source label; denied/unavailable fallback; mobile dock not obstructed; authorized actions available on desktop too |
| A12 | Staff recovery | Exact case/record inspection, controlled intervention and maker/checker where required, preserved evidence/history; existing Lupon commands qualified only within promised scope |

Full Agent product grant-management lifecycle is **DEFERRED**, not a release-blocking failed journey; its existing security checks still get regression coverage. Do not mark unresolved offline protocol or missing pre-Order dispute support as passed by seeding final labels.

## 9. First implementation slice and stop rule

**Next implementation: F0, immediately followed by A02/A03 through the real UI.** Do not start offline signing, kiosk session work, or a desktop redesign while basic actors/scenario continuation remain unreliable.

**Immediate user-directed focus:** repair readable Order details and simplify Deal Chain presentation before resuming the broader gates. The reported live courier Order uses unsupported historical Work shape A2; preserve its recorded identity, accepted terms and history rather than re-seeding or silently relabeling it A4. Read-only order visibility and safe execution are separate requirements. Independently review irrelevant listing-combination recommendations and replace public DAG/relay/slot jargon with accurate familiar order/package language. The QR/offline/kiosk/location scope above remains saved and deferred during this focused repair.

1. Read-only local identity/reference inventory; no account password or status reset.
2. Establish one isolated synthetic buyer/provider service scenario and staff access for recovery.
3. Fix canonical request/draft and the exact Work/payment/seed blockers that scenario encounters.
4. Execute the transaction through separate sessions and record before/after behavior, refresh, retry and wrong-user checks.
5. Continue F2 only after this tracer journey works; F3/F4 require their own technical protocol/record schema review before coding, never guessed migration semantics.

If existing identities/reference provenance is ambiguous, stop only that data mutation and preserve rows; finish reachable work in the disposable environment. If a newly identified gap changes confirmation, money, stock, or identity semantics, record the narrow decision rather than silently broadening the feature.

**Release statement:** list passed A-cases with environment and evidence. No percentage-complete estimate, historical green suite, simulated QR, generated receipt image, fixture status, or helper assertion substitutes for end-to-end proof. F0/F1/F2 completion is a milestone; the complete scope cannot be called finished while required F3/F4 cases are unimplemented or unrun.

## 10. Resume pointers after the connected-screen design checkpoint

- **Recommended immediate focus:** follow §12: close the bounded correctness gaps in the last saved-plan cut and finish the shared Order/Work interaction, then implement mobile Quick Deal through the same canonical services. The later approval for narrow builder-data corrections does not authorize a builder-layout redesign or unrelated authoring cleanup.
- **Next shared journey:** explicit base-only or saved-combination choice → version-pinned review → exact staged graph → independent invitations/acceptance → child Orders. Then correct partner replacement/multi-Picks and add the second Deal Chains discovery entrance using the same saved-offer identity.
- **Orders views are not forgotten:** apply the targeted task-first mobile/desktop workspace as its real core journey is qualified. F5 is the final usability/location/evidence gate, not an instruction to leave known Orders layout problems untouched until every offline feature is finished. Preserve the already-repaired historical read-only Work behavior.
- **Quick Deal continuation remains required:** F3 online and F4 offline/shared-device assistance retain the exact scope in §§4–6 and A07–A10. Before implementation, review the compact record/protocol contract named in §5; do not reopen settled product intent or quietly substitute online-only functionality.
- **Shared design, separate facts:** reuse the same listing/review/Order/message/payment primitives and the established visual system. Quick Deal can record an exchange, start a normal Order, or attach an allowed acknowledgement to an existing one. QR identification, each party's consent, helper statements, fulfillment evidence and payment acknowledgement stay distinct.
- **Later-session handoff:** resume §12 for the execution queue, document 38 §§14–17 for the Quick Deal interaction reference, and §26 for the earlier three-actor qualification boundary. Reproduce the current closing-review edge cases before treating that implementation as cleared. Do not infer readiness from preview identities, challenge simulations or suite totals.

## 11. Final transaction approval and wrong-entry protection

The user requested a final authorization/confirmation mechanism after the mobile Quick Deal preview: confirmation QR, a distinct confirmation code/PIN, or OTP—not the account password. Preserve three separate questions: who is authenticated, whether that participant may act, and whether they explicitly approve these exact terms/action.

### Approved finish approval methods

- On a participant's own authenticated phone, review the actual people, listing/service, scope, amount/currency and intended action, then explicitly confirm. Extra challenge methods are alternative ways to complete this same approval, not a stack of required QR/PIN/SMS steps.
- A confirmation QR/link opens that transaction/version for the intended authorized participant; scan alone never approves. Any offline approval-proof transport needs the separately reviewed F4 signing/authentication protocol.
- Provide an independently obtained numeric confirmation code as an alternative to own-account/QR-link review: one-use and transaction/action/version/party-bound. The confirming party obtains/approves it through their authenticated app. Showing a code on the preparer's phone and entering it on that same phone is not independent counterpart consent.
- SMS delivery is not required for this finish. Login/signup OTPs and existing Work presence/dropoff codes cannot be reused as transaction approval.
- Use the familiar label **Confirmation code**, distinct from the account password. A reusable personal transaction PIN is excluded; no credential enrollment/reset scheme is implied.

### Consent and error invariants

1. Entering details, public QR lookup, creating a proposal or saving an offline record never equals both-party approval.
2. Pending requests may expire or be withdrawn; missing response, elapsed time, an overnight job or a sync retry never supplies consent or auto-accepts a proposal.
3. Approval binds the exact transaction identity, current version/terms fingerprint, approving party and purpose. Changed people, listing, amount, scope or action invalidate outstanding challenges and require fresh review/confirmation. Preserve prior records.
4. Wrong/expired/replayed/exhausted code, wrong party, stale terms, invalid authority or failed online checks fail closed. A challenge must have bounded attempts/issuance, a short governed lifetime, safe storage, one-time consumption, race-safe validation and audit. No error path falls back to acceptance.
5. One-phone/public-card and helper scenarios without independently attributable participant approval stay pending for follow-up. A helper may attest only their own assistance. Offline local confirmations, if supported, remain distinguishable from pending server checks and canonical effects.
6. Before acceptance, allow correction/withdrawal without hidden commitment. After accepted facts exist, use the normal amendment/cancellation/concern process; a code does not guarantee that a person understood every term or create automatic reversal, debt or penalty.
7. Agreement approval, service/item receipt, Work clearance and payment acknowledgement remain separate purposes. A final receipt QR may verify a copy; it does not authorize another action or settle payment.

### Existing foundation versus required build

`WorkClearanceChallengeService` already contains a related **Work-only** pattern: issuer/verifier identity, purpose, accepted Work signature/version, digest, expiration, bounded issuance/attempts, invalidation and replay rejection. Existing Deal Chain confirmation checks explicit parties, current versions and pinned terms. Reuse these design invariants where appropriate; do not relabel/reuse a Work challenge as Quick Deal agreement approval.

The current mobile HTML visually simulates own-account, confirmation-QR and one-time-code approval; current evidence is in document 38 §16. It is not an authentication/challenge implementation: no real QR approval transport, OTP delivery, server validation or new PIN credential is implemented. The mock's two-minute/five-attempt values are illustrative, not approved production policy.

## 12. Finish-first checkpoint: close, connect, qualify

**User direction:** finish the chosen system; do not restart product discovery, add another UI system, or let more planning substitute for working use cases. This is an update to the existing F0–F5/A01–A12 map, not a replacement roadmap. This planning pass changed documentation only; source inspections and read-only schema checks are not fresh browser/test passes.

### 12.1 Current truth and the short repair gate

The shared Order/Work/payment and actor/consent foundations exist. Document 38 §26 records a real three-actor saved-plan continuation and earlier passing suites, but it does not qualify every authoring, upgrade, payment or recovery path. The closing source recheck still found the following blockers. Fix these without redesigning the listing builders, weakening validation, resetting accounts or rewriting accepted history.

| Blocker and owning source | Required correction | Exit proof |
|---|---|---|
| Saved graph editing — `DealChainCustomizerModal.tsx` | Separate topology edits from condition edits. Preserve independent branches, exact edges and the primary position unless ordering is deliberately changed. | Change one condition in a sparse/branched graph; save/reload; no unrelated edge or primary-position change. |
| Saved role editing — same component | Apply the deliberately edited role to canonical nodes; clear/rebind an incompatible provider and reconcile affected conditions explicitly. | Change a bound role, choose a suitable provider, save/reopen, publish and stage with the new role intact. |
| Catalog publication — `Admin/Catalogs/DealChainStudio.tsx`, `AdminDealChainCatalogController.php` | Carry the primary marker through the entire editor/request/persistence/projection path and require exactly one. | Zero/multiple primaries rejected; one primary survives republishing and reaches listing selection. |
| Product partner projection — `CreateProduct.tsx` | Keep audit/recycle roles, role-specific candidates, selected combination and serialized purpose consistent with canonical nodes. | Save/edit/reopen those roles and the selected fulfillment; no labor/store substitution or reset to pickup. |
| Upgrade/backfill — `2026_11_02_000100_allow_work_completed_dependency_gates.php` | First restore executable PHP syntax, then use the real confirmation schema/current confirmed Order and verified source-fact reconciliation. Never clear from `work.status` alone or bulk-rename historical meanings without a reviewed mapping. | Syntax check, fresh migration and populated upgrade: status-complete/no verified fact remains blocked; a valid current fact is linked when cleared; rerun/retry preserves history. |

The last row is a release blocker, not cosmetic debt: read-only schema inspection found no `deal_need_confirmations.status` column, which the current backfill queries. The existing clearance constraint also requires `source_fact_id` for a cleared gate; the current status-only backfill omits it. Earlier tests on an already-migrated database do not exercise that upgrade branch.

**Observed handoff prerequisite:** the read-only command `vendor/bin/sail exec -T app php -l database/migrations/2026_11_02_000100_allow_work_completed_dependency_gates.php` exited **255**, reporting `unexpected token "public"` at line **86**. No application fix or database write was made. Repair this same upgrade item before fresh scenario migration; the migration ticket performs its own isolated-environment preflight so business-scenario setup cannot become a circular blocker.

Direct-review basket preservation and unresolved-role advancement now have source-backed fixes, not blanket browser clearance. Keep focused cases for unrelated Picks after successful direct staging, current cart quantity after cancellation, and multiple open roles of the same/different type. The normal runtime gate path verifies source facts; the migration must not bypass it.

### 12.2 One minimal, thematic experience contract

Operate within the existing Serbizyu navy/white/mango identity, pinned typography, bordered cards and locked wave-sheet pattern. No new theme or separate kiosk design. Preserve the good listing details: real variants/packages, availability, inclusions, actual reviews and seller identity.

- Every transaction/task screen answers **who, what, amount/payment state, and who acts next**. Put optional history, technical terms and secondary tools behind a clear Details/Tools entry, not a wall of disclaimers.
- Use familiar service/package labels such as **Service only** and **With parts and delivery**. Internal DAG/node/relay/shape names do not belong in the citizen's primary task copy.
- Distinguish proposed roles/invitations from real Orders. Show the actual proposed counterparty before approval; unknown price is not free, and a displayed plan amount is not parent escrow.
- Mobile has one thumb-reachable contextual action dock, sufficient content/safe-area/keyboard clearance, and one task at a time. Do not stack fixed navigation and action bars over the task.
- Desktop uses the same state/permissions in a wider task/evidence area plus relevant terms/payment/history context. Do not stretch a phone column or duplicate the form.
- Review must precede the committing confirmation. Changed terms invalidate prior approvals; missing-party, waiting, expired, declined and offline states remain visible. Work confirmation and payment acknowledgement stay separate.
- Show required Work tools and their status first. Optional tools remain discoverable; do not show every photo/map/checklist/audio/video control on every job or let evidence itself approve a step.
- Check the shared primitive and all touched callers, not just one pretty screen: sheet height, readable type/contrast, focus, tap targets, loading/error/empty states, long names, text expansion and no hover-only essentials.

### 12.3 Regional deployment: one flow, reviewed local copy

**Final direction (§13):** launch the controlled Tagudin pilot with reviewed short Filipino/Taglish and English critical journeys. Keep the content/preference foundation ready for Ilocano, but enable Ilocano only after native review; that review does not block this pilot. Let people choose an enabled reviewed language and preserve existing preferences. Do not invent a fourth “Taglocano” product mode or randomly combine three languages on each screen; familiar borrowed words may remain where local speakers actually use them.

Current source stores preferences but is not a translated interface: onboarding accepts `fil`/`en`, some entry paths coerce `ilo` to `fil`, and Quick Deal text is hard-coded English. `users.locale`, profile language preferences and the rendered/notification language need one coherent read/write contract rather than another preference field.

1. Put critical shared labels/messages behind stable content keys while retaining short readable English source/fallback. Start with sign-in/return-to-task, review/confirmation, pending/offline, rejection/expiry, Work review, payment and receipt/support—not every administrative page.
2. Add reviewed Filipino content to the same flow; retain English source/fallback. Ilocano uses these keys when reviewed, without being exposed as a working untranslated choice. Keep amounts/currency, names, references, action identifiers, exact terms versions and permissions unchanged. Do not auto-translate contractual free text into different terms.
3. A payer's **I paid** report must not translate into the recipient's **I received payment** acknowledgement. Likewise **Saved offline**, **Both confirmed**, **Work complete** and **Paid** must never collapse into one reassuring label.
4. Native speakers review local critical copy before enabling that language. Filipino/English critical-journey readiness gates this pilot; Ilocano activation follows its own review. Use ordinary local words, not ornate/formal translations. Missing strings fall back readably, never to raw content keys.
5. Test preferred language after refresh/relogin, long text at small widths, and notifications/private copies. A representative buyer/provider must be able to finish and explain whose confirmation/payment is still missing without developer coaching.

Language work runs alongside the shared Core/Quick Deal screens; it is not a separate redesign or an excuse to postpone all regional usability until the end. Human review of enabled local copy remains an activation prerequisite, not something a code audit proves. A disabled/unreviewed Ilocano preference must not be silently rewritten to Filipino.

### 12.4 The remaining implementation sequence

| Existing gate | Deliverable | Required exit |
|---|---|---|
| F0–F2, with essential F5 UX now | Close the five repair items; finish the real service/request/bid-to-Order, Work, recipient payment acknowledgement and staff-recovery journeys using shared minimal UI. Retain product/A3/A4/A9 and chain recovery cases. | Required core A-cases have real separate-actor continuation, refresh/relogin, wrong-user, stale/retry and recovery evidence. Correct private storage and the scheduled outbox work without developer intervention. |
| F3 | Mobile Quick Deal: real public QR/profile/listing resolution, two-direction initiation, exact-version independent confirmation, readable private record/receipt, and canonical new/existing-Order adapters. | Both buyer-scans-seller and seller-scans-buyer work. Editing/rejecting/replaying cannot fake consent, duplicate an Order, mark Work done or acknowledge payment for someone else. |
| F4 | Durable offline records, safe sync, missing-party follow-up, copies, pre-Order rejection/concern and shared-phone/kiosk isolation through the same UI. | No-signal record survives reload/restart; both uploaders/retries deduplicate; conflicts stay explicit; helper statements never become participant approvals; another person cannot see the previous session's private data. |
| F5 | Final regional/device/operational qualification and the bounded location Work Tool, with the evidence register complete. | Every required A-case passes for the promised environment. Until then, label blocked/not-run honestly: neither is an exit. Exercise small Android/iOS screens, language comprehension, denied permissions, weak network, maps unavailable and staff recovery. |

Do not wait for every decorative improvement before F3, but do not build on the five known correctness gaps. Shared critical copy/layout improvements land with their owning journey. F3 is a milestone, not permission to silently remove offline/shared-device F4 from the agreed finish.

### 12.5 Quick Deal implementation brief: keep the approved phone-first feel

Keep the existing phone-first reference in `docs/design-kit/sessions/quick-deal-journey-prototype.html`: scan/identify, choose the actual listing when needed, review, confirm the current participant's side, then show a compact accurate record. Editing, approval alternatives, details and copies open only when needed. Build real behavior behind it; do not restart its visual concept.

- **All three purposes remain:** record an exchange/acknowledgement, start a normal Order, or continue a specifically authorized existing Order. A receipt-only record must not create a fake accepted Order; an agreement must not silently complete Work or mark payment received.
- **Identity and listing:** profile QR requires selection from that seller's real eligible listings; listing QR may preselect one, not approve it or guarantee stock. Replace decorative QR/camera and fallback fictional identities with real resolution, accessible entry fallback and explicit signed-in context.
- **Both directions:** seller initiation must not impersonate the buyer or bypass the buyer-derived current Order intake. Implement the bounded adapter and preserve actual initiator/participant attribution.
- **Approval:** provide review/confirmation in each participant's own account, a purpose/party/version-bound QR/link and an independently obtained app-issued one-use code. These are required alternatives, not three compulsory hoops; SMS is not required. Never reuse the account password or a Work clearance code, and never auto-accept silence.
- **Offline:** retain only known listing/terms snapshots and attributable facts; show online checks/missing confirmation pending. No cached catalog means no invented accepted listing. The compact protocol in §5 must settle signing/key lifecycle, canonical versioned bytes, replay/conflict handling and copy delivery before offline approval is called ready.
- **Shared phone:** ordinary deals need no witness. Assisted mode may record the helper's own optional statement. Participants authenticate separately; a helper cannot approve for them. Protect actor-owned drafts/receipts, credentials, IndexedDB/cache and unsynced copies on handover—not just the server session cookie.
- **Receipts and concerns:** preserve transaction/version, each party's actual confirmation status, claimed/acknowledged exchange facts and references. Receipt QR verifies/accesses a permitted copy, never grants approval or exposes private history. Rejection before an accepted Order still needs a scoped concern path; do not manufacture an Order/debt to open a case.

One compact Quick Deal protocol/data contract is the next necessary technical artifact after Core hardening. It is not another whole-project planning round. Reuse canonical Order, Work, payment, authority and audit services; no second checkout/fulfillment engine.

### 12.6 Scope lock and finish statement

Keep human-Agent management, AI execution integration, a universal RBAC migration, new reusable PIN credentials, kiosk hardware/cash custody and live fleet routing out of this finish queue. Retain the existing capability/resource/consent foundation. Location means the promised Work check-in/map pin/landmark with truthful source/accuracy and fallback, not an Uber-like dispatch product.

Timestamp-camera, voice and short-video Work evidence are committed finish integrations (§13), not working features because a mock exposes them. Required/available photo/checklist/reading/location/media paths must honor the accepted Work specification. Capture requires real permission, preview, private upload, codec/safety, participant review and failure recovery; no decorative microphone or fabricated proof. Visible still-photo stamps and video time metadata have different claims; neither independently verifies physical time/place. Offline Work capture/sync is not implied by offline Quick Deal.

**Finished means:** ordinary participants can complete the agreed discovery/bidding or QR initiation, exact agreement, Work/receipt, separate payment acknowledgement, retained copies/history and needed recovery through the real system. Online/offline/shared-device requirements, regional comprehension and operational safety are qualified. No new optional feature enters this queue merely because it is attractive; no test total, polished mock or seeded final status substitutes for those outcomes.


## 13. Final direction decisions for the implementation handoff

The user answered the complete final direction batch. These choices supersede earlier recommendations where they differ; implementation may proceed through the bounded tickets without another product-discovery round.

| Decision | User-approved finish commitment | Boundary |
|---|---|---|
| Activation target | **Controlled Tagudin pilot**, using real end-to-end transactions, named support and recovery | Not a simulated demo; not permission for unrestricted public launch or live-environment migrations |
| Initial languages | **Reviewed Filipino/Taglish and English critical journeys** | Preserve the shared language foundation and existing preferences; Ilocano activation follows native review and does not block this pilot |
| Quick Deal approval | **Own-account review, transaction-bound QR/link and independently obtained app-issued one-use confirmation code** | Alternatives, not stacked mandatory hoops; no SMS dependency, reusable PIN, public-QR consent or helper approval |
| Offline promise | **Previously enrolled/prepared phones can independently confirm exact terms offline and exchange attributable records** | Server verification, current stock/authority checks and canonical effects remain pending synchronization; public printed QR alone cannot confirm; missing-party follow-up remains |
| Work media | **Timestamp photos, voice and short-video evidence** through the shared permitted-tool interaction | Real capture/import, preview, private upload, participant review and recovery; no full media editor, burned-in video-time guarantee or offline Work queue |

The accepted UI theme, listing-builder layout, service-first focus, existing product/Request/Quote paths, independent child Orders, separate Work/payment facts, optional helper testimony and deferred Agent product remain unchanged.

**Implementation gate:** the five §12.1 corrections are the next bounded core cut. New QR/offline behavior then requires one reviewed protocol/data contract and device evidence, not a second commerce engine. Voice/video require the real Work media/allowed-versus-required contract and device qualification. Library/provider additions still require ordinary dependency approval; this direction batch did not approve a particular SDK.

**Evidence boundary:** this pass records decisions and prepares work; it does not certify a transaction, capture device, translation, migration, signing transport or public deployment. All required A01–A12 journeys plus the committed Work-media and local-copy checks need observed evidence before pilot activation.

**Execution handoff:** the user also approved the task granularity, blockers and behavior/device proof gates. [Document 39](39-controlled-pilot-implementation-handoff.md) indexes the 32 published children and fresh-session instructions for [finish parent #34](https://github.com/daviddatuX25/Serbizyu-2.0/issues/34). Begin with [#35](https://github.com/daviddatuX25/Serbizyu-2.0/issues/35)'s safe preflight and migration repair, then [#36](https://github.com/daviddatuX25/Serbizyu-2.0/issues/36)'s isolated scenario baseline. Product direction is settled; later work follows actual blocking edges, not another overall planning round.
