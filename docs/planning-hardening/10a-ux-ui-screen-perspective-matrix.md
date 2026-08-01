# Serbizyu 2.0 — Canonical Screen Perspective Matrix

Status: DRAFT FOR FOUNDER/DESIGNER REVIEW
Artifact type: design-reference companion
OpenSpec change: `openspec/changes/create-ux-ui-reference-dossier/`
Primary dossier: `docs/planning-hardening/10-ux-ui-reference-dossier.md`
Source registry: `_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md`

## 1. Purpose

This matrix closes the gap between a screen inventory and a usable design brief. Every canonical screen ID has a specific actor job, visible hierarchy, primary action, and failure/recovery route. A future designer may combine compatible states into one visual composition, but every row must remain addressable and reviewable.

## 2. How to use it

- Design the user job, not the feature name.
- Put the `Must see` information in deliberate visual priority order.
- Use the named primary action or an equally explicit consequence-oriented label.
- Show the recovery route as a real state, not a generic toast.
- Apply the main dossier screen anatomy, accessibility, content, and cross-role rules.
- Use fictional deterministic data only.

## System and simulation shell

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| SYS-001 | All/reviewer | Choose a useful scenario and understand prototype scope | Scenario cards; actors; cohort; supported/conditional/sandbox labels; reset state | Enter selected scenario | If fixture is unavailable, explain why and offer another scenario or reset |
| SYS-002 | All/reviewer | View the same case from another authorized role | Current scenario state; role permissions; affected actor; unsaved-state warning | Switch to selected role | Block unauthorized role; preserve shared state; explain scenario reset if changed |
| SYS-003 | All/reviewer | Understand where the case is and who acts next | Completed/current/alternative steps; responsible actor; blocked/dispute branches | Open current step | If route is unavailable, show conditional/deferred reason and nearest valid step |
| SYS-004 | All/reviewer | Reset safely or understand prototype limits | Fixture data warning; no backend/real integration; reset effect; help; legal/privacy boundary | Reset this fixture | Confirm destructive reset; restore deterministic fixture; provide help if reset fails |

## Account, identity, and access

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| ACC-001 | Buyer/Provider/Owner | Choose capabilities without being locked into one permanent role | Capability examples; enabled/conditional status; assistance option; what setup is required | Use selected capability | If capability is gated, explain requirement and offer browse/help/save |
| ACC-002 | User | Complete fictional account/phone confirmation for the demo | Masked fictional contact; code fixture; retry; attempt state; privacy note | Confirm demo account | Show invalid/expired code; allow safe retry; never imply a real SMS was sent |
| ACC-003 | User | Understand and consent to the data use required for the current task | Purpose; required/optional data; who can access; retention/deletion/help; consent choice | Agree and continue | Decline without dark pattern; explain unavailable capability; preserve safe exit |
| ACC-004 | Provider/Owner | Know whether identity evidence is required and why | Current gate; required evidence class; public/private result; manual-review fallback; no live collection notice | Review requirements | If gate is closed, block upload and offer manual/support path |
| ACC-005 | Provider/Owner | Practice submitting a fictional identity-evidence fixture safely | Fixture-only upload; redaction/scan guidance; accepted formats; access/retention warning | Submit demo evidence | Validation/rejection preserves explanation and safe resubmission; no real document accepted |
| ACC-006 | User/Admin | Understand identity-review status and next responsibility | Pending/more-info/approved/rejected; reason safe to show; reviewer/next action; evidence-access boundary | Provide requested information | If denied or stale, show support/review route; never equate review with broad public trust |
| ACC-007 | User | Understand profile, access tier, and what actions are enabled | L0–L4 meaning; active capabilities; conditional/forbidden actions; evidence-based public status | Open an enabled task | Blocked action explains missing permission/gate and offers approval/help |

## Discovery and public trust

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| DSC-001 | Buyer | Start from a practical Tagudin need | Search; category families; small-job examples; active requests; assisted/help entry; Tagudin context | Find a service or product | No-results path offers request creation, category browse, or help |
| DSC-002 | Buyer | Browse a category and understand its availability/safety boundary | Supported listing types; active supply; safety class; pilot/conditional status; simple filters | View matching listings | Unsupported/empty category explains status and avoids false supply |
| DSC-003 | Buyer | Narrow results by real constraints | Need/query; listing type; mechanism; Work shape; timing; area; availability; amount semantics | Apply filters | Preserve filters after error/offline; provide clear/reset action |
| DSC-004 | Buyer | Compare currently usable results truthfully | Offer summary; amount type; active capacity; area/timing; new/evidence-based Provider status; mechanism | Open a listing | Expired/unavailable result is visibly disabled with refresh/request alternative |
| DSC-005 | Buyer | Decide whether one listing fits the need | Scope/inclusions; Provider/Owner; price/quote/budget; capacity; Work shape; evidence; lanes; safety | Book, request, or ask for quote | Changed capacity/terms require refresh and explicit re-review; report/help available |
| DSC-006 | Buyer | Judge public trust and safety without overclaiming | Evidence-based history; new-Provider state; public permissions; report/block; safety context; no private evidence | Continue to listing action | If trust data is unavailable, say unknown/new; never fabricate verification or score |

## Listing creation and management

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| LST-001 | Provider/Owner/Agent | See and manage listings they may act on | Owner; acting Agent; lifecycle; capacity alerts; pending review; available actions | Open or create listing | Permission/lifecycle block explains owner approval, review, or recovery route |
| LST-002 | Provider/Owner/Agent | Choose one of the four canonical listing/request types | Service/Product Listing and Service/Product Request definitions; examples; capability status | Choose listing type | Unsupported type explains gate; save choice and return safely |
| LST-003 | Provider/Owner/Agent | Describe a service offer clearly | Scope; inclusions/exclusions; category; price/quote/budget; timing; area; evidence; owner attribution | Save service details | Inline validation with examples; preserve draft; ask for assistance |
| LST-004 | Provider/Owner/Agent | Describe a product offer and avoid false stock promises | Item/unit; quantity/capacity; price; pickup/handoff; sourcing status; mismatch evidence | Save product details | Oversell/capacity conflict blocks activation and offers correction |
| LST-005 | Provider/Owner | Choose valid mechanism and Work shape | Direct/quote/request mechanism; A1/A3/A4/A9 compatibility; required fields; disabled combinations | Confirm mechanism and shape | Explain invalid combination and recommend only approved alternatives |
| LST-006 | Provider/Owner | Set truthful schedule, stock, or capacity | Slots/quantity/capacity; conflicts; service area/handoff; freshness; unavailable state | Save availability | Conflict preserves input and offers alternative slot/capacity; no silent override |
| LST-007 | Provider/Owner/Admin | Preview the Buyer view and control lifecycle | Public preview; missing fields; owner/Agent attribution; draft/review/active/paused/rejected/archive status | Submit for review or publish when allowed | Rejection/blocked activation shows reason, editable fields, support, and history |

## Requests and quotes

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| REQ-001 | Buyer | Choose whether the need is for a service or product | Plain examples; conditional availability; information each path requests; privacy/safety note | Choose request type | Gated request type explains condition and offers listing browse/help |
| REQ-002 | Buyer | Describe the need enough for a safe response | Scope/item; timing; Tagudin area; budget/estimate; alternatives; safety/privacy; required/optional fields | Send request | Preserve draft; show field correction; explain who can see the request |
| REQ-003 | Buyer/Provider | Review eligible responses without fake ranking | Responder; scope fit; expiry/freshness; amount semantics; clarification state; spam/report boundary | Open response | Expired/ineligible response disabled; clarify, decline, or report available |
| REQ-004 | Buyer/Provider | Understand one quote before deciding | Scope; inclusions/exclusions; amount; validity; Work shape; schedule; lane; evidence; cancellation/change meaning | Accept quote or send clarification | Expired/changed quote requires new confirmation and preserves prior version |
| REQ-005 | Buyer | Compare quotes by meaning and accept one safely | Comparable scope; amount semantics; timing; evidence; Provider facts; no fake score; selected-term preview | Accept selected terms | Warn on stale quote; let user clarify/decline; snapshot accepted version |

## Shared Order and completion

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| ORD-001 | Buyer | Confirm accepted terms and payment-lane meaning before commitment | Parties; scope; amount/purpose; Work shape; timing; lane; custody/protection; evidence; cancellation | Confirm terms | Changed/stale terms block confirmation and return to explicit re-review |
| ORD-002 | Buyer/Provider | Understand the shared Order without collapsing its parts | Order snapshot; separate Work and Payment panels; parties; next responsible actor; support | Open next required task | Missing/blocked task explains which aggregate and who can resolve it |
| ORD-003 | Buyer/Provider/Admin | See what happened in a shared attributable timeline | Actor; event; target aggregate; prior/new state; evidence; timestamp; correction links | Open relevant event or next action | Unknown/failed event is labeled pending/retry/support; history remains |
| ORD-004 | Buyer/Provider/Admin | Request a change or cancellation with visible impact | Current terms; pre/post-evidence status; affected Work/payment/evidence; required approval; history | Request change or cancellation | Blocked request explains open obligations/holds and routes to clarification/support |
| ORD-005 | Buyer/Provider | Propose or decide completion without implying payment | Scope/evidence comparison; proposer; Buyer decision; inactivity policy only if defined; dispute route; payment effect | Propose or confirm completion | Missing evidence, dispute, or hold blocks transition and shows the safe next step |

## A1 Linear Project

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| A1-001 | Provider/Buyer | Follow a meaningful project plan | Accepted scope; named steps; current step; Provider/Buyer responsibilities; expected evidence | Start or update current step | Blocked/changed scope routes to clarification/change request without fake progress |
| A1-002 | Provider/Buyer | Review progress evidence and revisions | Evidence version; uploader; related step; privacy; revision request; what remains incomplete | Add evidence or request revision | Rejected evidence shows reason/resubmission; upload never auto-completes Work |
| A1-003 | Buyer | Decide whether agreed project Work is complete | Scope checklist; final evidence; unresolved revisions; payment shown separately; concern/support | Confirm completion or report concern | Concern opens clarification/dispute; active hold prevents completion |

## A3 Appointment

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| A3-001 | Buyer/Provider | Choose an available conflict-safe slot | Date/time/duration; freshness; Provider availability; area; conflict state | Request or confirm slot | Conflict shows alternatives and preserves intent; no silent replacement |
| A3-002 | Buyer/Provider | Confirm the appointment and safety context | Parties; time/place; privacy/contact boundary; reminders; cancellation/reschedule; safer-meeting guidance | Confirm appointment | Missing agreement or unsafe context offers reschedule/cancel/report/help |
| A3-003 | Buyer/Provider | Handle reschedule, cancellation, or no-show transparently | Current commitment; actor; reason; evidence if relevant; policy effect without invented deadline; notice state | Request change or report no-show | Disagreement preserves history and opens support/dispute |
| A3-004 | Buyer/Provider | Record attendance and decide completion | Attendance claim/evidence; actor confirmation; scope outcome; payment separate; concern route | Confirm attendance/completion or report concern | Mismatch/no-show opens evidence/support path and blocks unsupported completion |

## A4 Handoff and purchase-on-behalf

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| A4-001 | Provider/Buyer | Track product preparation and truthful quantity | Item/unit; reserved quantity; preparation; stock/capacity; readiness; Buyer expectation | Mark item ready | Capacity/missing-item conflict offers correction/substitution approval, never false readiness |
| A4-002 | Provider/Buyer | Coordinate a safe pickup or handoff | Item/quantity; time/place; instructions; privacy/safety; who confirms receipt | Confirm handoff arrangement | Unsafe/unavailable place/time offers reschedule, cancel, report, or support |
| A4-003 | Buyer/Provider | Confirm actual receipt and condition | Expected vs received item/quantity/condition; handoff evidence; actor confirmation; payment separate | Acknowledge receipt | Mismatch path remains equally visible and preserves original terms |
| A4-004 | Buyer/Provider | Report quantity or condition mismatch precisely | Affected item/quantity/condition; evidence; requested remedy; payment/Work impacts; safety question | Report mismatch | Preserve evidence/history; offer clarification, support, or dispute; no automatic cash refund |
| A4-005 | Buyer/Provider/Agent | Control purchase-on-behalf estimate, approval, variance, and receipt | Requested items/alternatives; approved budget; actual cost; variance; receipt evidence; acting person | Approve spend/variance or confirm receipt | No spend beyond approval; variance requires explicit approval/correction/support |

## A9 Digital Delivery

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| A9-001 | Provider/Buyer | Track digital scope, version, and progress | Deliverable/format; accepted scope; version target; status; privacy/retention; evidence expectation | Start/update digital Work | Scope change creates explicit request/version; no silent substitution |
| A9-002 | Provider/Buyer | Deliver or access a specific artifact safely | File fixture; version; uploader; access state; privacy; retention/deletion; scan/validation state | Deliver or review artifact | Failed/rejected upload preserves version history and safe retry; no auto-completion |
| A9-003 | Buyer/Provider | Accept a version or request a specific revision | Version comparison; requested changes; acceptance criteria; unresolved issues; payment separate | Accept version or request revision | Concern/dispute route; previous versions remain visible; upload is not acceptance |

## Payment Obligations and lanes

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| PAY-001 | Buyer/Provider/Admin | Understand each amount owed and its independent state | Purpose; amount; due condition; payer/recipient; lane; policy snapshot; evidence; next actor | Open relevant obligation | Unresolved/corrected obligation links replacement/history and support |
| PAY-002 | Buyer | Choose or confirm a lane with truthful custody/protection meaning | Available lanes; exact peso cost; who controls funds; protection; evidence; sandbox/conditional status | Confirm selected lane | Unavailable lane explains gate; never silently substitutes another lane |
| PAY-003 | Buyer/Provider | Report one side of an External Cash exchange | Amount/purpose; direct payer-recipient; 0% pilot commission; no custody/refund promise; `buyer_reported` and `provider_reported` remain independent | Report cash paid or cash received | Mismatch/duplicate/uncertain state offers clarification; silence is not proof; Work remains unchanged |
| PAY-004 | Buyer/Provider/Admin | Compare both cash reports and resolve match or mismatch | Buyer and Provider attestations; timestamps/actors; amount match; `mutually_acknowledged`; disagreement; affected obligation; no automatic recovery promise | Confirm matching reports or report mismatch | Missing side stays pending; mismatch opens dispute/support and preserves history |
| PAY-005 | Buyer/Provider | Submit external digital evidence without overclaiming | Provider/reference; amount/time; 0% initial pilot platform commission; screenshot fixture; redaction; no custody/Tiwala; evidence meaning | Submit evidence | Validation/rejection preserves safe resubmission and never labels upload provider-verified |
| PAY-006 | Buyer/Provider/Admin | Understand external-proof status and next responsibility | Reported/submitted/acknowledged/provider-verified/disputed/rejected/superseded; actor/source; evidence access | Acknowledge, clarify, or open support | Unknown/unverified state remains explicit; correction links original and replacement |
| PAY-007 | Buyer/Provider/Admin | Explore Direct Digital behavior only as a sandbox | Persistent sandbox label; test provider/amount; simulated event/reconciliation; no Tiwala protection; no metric effect | Run simulated event | Failure shows test/retry/reconciliation state; no live-looking checkout or payout |
| PAY-008 | Buyer/Provider/Admin | Explore protected-release guards only as a sandbox | Persistent sandbox label; Work/sign-off/dispute/hold/reconciliation/release guard checklist; no legal claim | Attempt simulated guarded release | List unmet guards; block duplicate/release under dispute/hold; no live-money effect |

## Agent assistance

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| AGT-001 | Owner/Agent | Understand who requests assistance and why | Owner; Agent; purpose; requested scope; duration; identity; decline/help | Review invitation | Unknown/expired invitation cannot activate; report/help available |
| AGT-002 | Owner/Agent | Confirm allowed, approval-required, and forbidden actions | Resource/action scope; duration; sensitive actions; attribution; revocation; consequence | Approve scoped permission | Decline/edit scope; forbidden custody/ownership action remains blocked |
| AGT-003 | Agent | Work only within an Owner-specific scope | Acting-for banner; active grants; permitted tasks; pending approvals; owner notices; no earnings/custody assumption | Open permitted assisted task | Permission expiry/revocation blocks future action and routes to Owner/support |
| AGT-004 | Owner | Review, pause, or revoke assistance | Agent action history; affected resources; pending approvals; grant status; future-action effect | Pause or revoke access | Revocation preserves history; unresolved sensitive action routes to support/report |

## Trust, safety, messaging, and support

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| TRU-001 | All actors | Understand a message or critical notice in context | What changed; who acted; affected object; required action; expiry if defined; delivery/fallback state | Open affected task or respond | Failed delivery shows retry/support; no critical meaning only in toast |
| TRU-002 | Buyer/Provider | Open a focused dispute with useful evidence | Affected Order/Work/obligation/evidence; what happened; safety concern; requested remedy; upload/privacy | Submit dispute | Missing evidence can be added later; no fixed outcome/window/refund promise |
| TRU-003 | Buyer/Provider/Agent | Protect self through report or block at the point of risk | Person/listing/context; immediate safety choice; privacy; category guidance; block/report effect; support boundary | Block/report or request support | Emergency/unsafe state prioritizes exit and support; never invent hotline/guarantee |
| TRU-004 | All actors | Track a support case and know who acts next | Case owner; affected object; status; last/next action; timeline; escalation; audit context | Provide information or view next step | Stalled/failed case exposes escalation/retry, not a dead generic confirmation |

## Admin and operations

| Screen ID | Actor | User job | Must see | Primary action | Failure/recovery |
|---|---|---|---|---|---|
| OPS-001 | Admin | Triage operational work with correct cohort labels | Demo/sandbox/training/genuine classes; open reviews/disputes/holds/incidents/failures; support burden | Open highest-priority item | Empty/error state distinguishes no work from failed data load |
| OPS-002 | Admin | Review identity/user evidence with least privilege | User/capability; gated evidence; access reason/log; review state; public-result boundary; next request | Record review decision/request info | Unauthorized evidence stays hidden; decision needs reason and safe correction path |
| OPS-003 | Admin | Inspect Order and Work as separate state histories | Accepted snapshot; Order state; Work shape/state; actors; events; evidence; disputes/holds; corrections | Open event or authorized recovery action | Race/stale state forces refresh; no silent override of user transition |
| OPS-004 | Admin | Inspect payment/evidence truth by lane | Purpose/amount/lane; custody/protection; declarations; provider source; evidence; reconciliation; corrections | Request evidence, reconcile, or open related case | Unknown provider state routes to retry/queue; no manual fake verification |
| OPS-005 | Admin | Resolve dispute/hold with scope and auditability | Affected aggregates; parties; evidence requests; reason; active hold; creator/approver; possible outcomes; history | Record authorized resolution/hold action | Missing authority/evidence blocks action; release/correction preserves original history |
| OPS-006 | Admin | Respond to a safety incident with sensitive access controls | Severity/context; affected people/object; immediate actions; restricted evidence; response owner; audit log | Take permitted safety action | Unauthorized data hidden; escalation/disablement uses reason and scoped effect |
| OPS-007 | Admin | Handle failed events without duplicate effects | Event/target; attempts; last error; idempotency/correlation; next retry; dead-letter/support status | Retry safely or assign support | Retry result visible; duplicate/out-of-order event cannot double-change state |
| OPS-008 | Admin/evaluator | Interpret pilot metrics without mixing evidence classes | Counts plus rates; cohort; definitions; completion/support/dispute/incident; no false cash revenue; correction reason | Inspect metric evidence | Small/unknown sample shown honestly; correction appends history |
| OPS-009 | Admin/evaluator | See backup/recovery readiness as evidence, not a feature claim | Last backup; restore rehearsal; owner; result; incident/recovery status; demo boundary | Open recovery evidence | Missing/failed rehearsal shown as gap with owner/next step, never green by default |

## 3. Matrix acceptance rules

- Canonical primary rows: **74**.
- Every row must map back to the same screen ID in the bridge.
- Visual consolidation is allowed only when each screen/state remains deep-linkable or explicitly selectable.
- No row authorizes a backend, real integration, live payment, live identity collection, or pilot claim.
- Any product/state change found during design must reopen the relevant upstream BMAD/OpenSpec artifact before the row changes.
