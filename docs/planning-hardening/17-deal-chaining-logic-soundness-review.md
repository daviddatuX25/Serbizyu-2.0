# Deal-Chaining: logic soundness review

**Status:** Completed design review; recommendations are not new payment policy, schema approval, implementation evidence, or launch authorization.
**Scope:** Only the latest Deal-Chaining logic in documents [15](15-deal-chaining-dag-node-architecture-and-staggered-settlement.md) and [16](16-adversarial-deal-chaining-audit-reentrancy-and-execution-protocol.md).
**Audience:** Founder first; engineers implementing the same rules second.

## Verdict in simple terms

**The basic idea is sound. The latest detailed design is not yet safe to implement as written.**

A Deal Chain should act like a project plan: it records what is needed, who has agreed to do each part, and what must happen before another part can proceed. Each provider still has an ordinary agreement. Completing one part must not silently change another provider's agreement or move money.

Keep that structure. Correct the shortcuts in documents 15 and 16: they sometimes treat a picture of the workflow as a commercial agreement, a handoff as permission to pay, and an example as a universal rule. These are logic problems, not reasons to abandon Deal-Chaining.

The review below identifies counterexamples and the rule needed to handle each. They are reasoned design checks, not claims that executable scenarios or production behavior have passed.

## What we can keep

- **Products and services in one plan.** The plan represents outcomes rather than assuming every purchase is a shopping-cart item.
- **Listing-first selection.** Choose the actual offering, not merely a person who might offer several unrelated services.
- **Independent agreements.** A delivery problem does not automatically cancel completed installation or manufacturing work.
- **Explicit dependencies.** A technician can wait for required materials without forcing unrelated work to stop.
- **Repeat participation.** The same provider can do an early step and return for a later step.
- **History-preserving replacement.** A failed arrangement remains visible when a replacement is made.

These strengths are consistent with the [founder-approved charter](12-deal-chaining-founder-decision-and-modeling-charter.md), the [canonical domain contract](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md), and the [existing platform spine](../../_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md). The two recent exploration documents do not supersede those sources.

## Findings and corrected rules

- **A step needs its own identity; it cannot simply be the listing.** Document 15 §2.1 says the listing itself is the node. Consider ordering the same delivery offering twice, or a provider editing its price after acceptance. Those are separate planned steps and must not change together. **Rule:** the node is a Deal Need, meaning one required outcome. It can be unsourced, later select an offering, and ultimately link to an ordinary Order with accepted versioned terms. Provider identity, listing identity, Need identity, and Order identity are distinct. A changed listing never rewrites an existing agreement.

- **Messages and checkpoints should not become fake purchases.** Document 15 §3 invents four equivalent node types, including communication and checkpoints. The current foundation allows `product` and `service` Needs. A chat message is not a separately payable service, and an approval is not necessarily a new agreement. **Rule:** keep conversations in the existing communication boundary and execution checkpoints in Work/evidence contracts. The plan can display these beside a Need without inventing a new Need type. A genuine paid coordination service may be a service Need with its own agreement; this does not turn every conversation into one.

- **A returning provider does not create a cycle merely by returning.** Document 16 §2.2 claims that using one Order for the returning provider necessarily deadlocks. The actual cycle question is whether step dependencies loop, not whether a person's name appears twice. Dismantling, transport, and reinstallation can be three distinct Needs in that order. **Rule:** separate agreements are appropriate when the work is separately accepted, priced, or replaceable. A single agreement with several milestones is conceptually possible, but shared-Order linkage and milestone-level cross-Order gates are not defined by the current Need-level model. Do not implement that alternative by guessing. The bounded model uses ordinary child agreements for separate Needs; this is a model boundary, not a mathematical proof that all other designs are impossible.

- **Each dependency must name exactly what it blocks and what proves readiness.** Documents 15 §§4 and 8 mix whole-node completion, pickup readiness, dispatch, and broad 'all inbound dependencies satisfied' rules. Food may be ready for collection while the delivery is not yet complete. If the shop's completion requires delivery, making collection wait for shop completion creates a real deadlock. **Rule:** a condition must identify its source fact, owning authority, target transition, accepted contract version, and behavior when proof is missing or withdrawn. Conditions block only their named transition. Unsupported conditions refuse activation; arbitrary text is never executable policy.

- **Being allowed to proceed is not the same as being dispatched.** Document 15 says steps start immediately when a predecessor completes. A courier might not have accepted the job or may no longer have capacity. **Rule:** dependency satisfaction removes one obstacle. Authorization, current agreement, availability, safety holds, and the target Work's own rules still apply. Notifications may prompt the next action but cannot prove it happened. Automated dispatch, if later supported, must use the same guarded command as a human action.

- **The diagram and the actual state change must not disagree under concurrency.** A provider can press Start while the coordinator replaces an input or adds a blocking condition. Checking a previously loaded green connector is insufficient. **Rule:** the target transition must validate the applicable graph version and authoritative source facts in the same consistency boundary as its mutation. Graph edits and commands consuming those edits must share a documented locking/version protocol. The canonical contract already requires a chain lock for dependency changes. Database cycle checks alone are not evidence that every concurrent application path is safe. No external network call should hold that database transaction open.

- **Fan-in needs a definition of 'all required inputs', not just multiple lines.** One delivered part plus one cancelled part must not count as two completed requirements. Nor should replacing the missing part leave the technician waiting on its obsolete predecessor forever. **Rule:** every active required input for the named transition must satisfy its condition. Cancellation, failure, and supersession are not satisfaction. An explicit replacement plan determines which new Need supplies the outcome and which edges are superseded. Existing successful work and earlier evidence remain recorded. Optional or waived inputs require explicit authority and a recorded resolution; absence of an edge is not a silent waiver of accepted terms.

- **Conditional branches need a recorded choice and a closure rule.** Document 15 calls branching supported, and document 16 §7 injects new work after diagnosis, but neither defines what happens to the branch not chosen. A plan could wait forever for both repair and towing, or accidentally order both. **Rule:** diagnosis supplies evidence; an authorized decision selects a path and records the disposition of alternatives. New paid work requires explicit acceptance. Non-selected alternatives must not silently become 'completed'. Until branch selection, reversal, accepted-child impact, and chain closure are added to the canonical contract, represent the diagnosis and subsequent sourcing as explicit decisions rather than an automatic branch engine.

- **Active-plan edits must not rewrite agreements already accepted.** Document 16 §7 describes injecting Needs into an active graph without defining the effect on existing promises. A new dependency could add a day's delay to an appointment already booked. **Rule:** calculate and show the impact first. Changes to accepted price, scope, time, required inputs, or parties need an explicitly defined amendment contract with affected-party approval and authorized coordinator/Owner or scoped-Agent action. That active-chain amendment process is not yet specified; reject unsupported accepted-term changes rather than inventing it. An approved change must preserve versions and history. A late worker must not apply an older plan after a newer plan has replaced it. Removing a visual connection does not remove a commercial obligation.

- **A published partnership does not guarantee that every provider is booked.** Document 15 §§6–7 combines partner branding, publication, and execution without defining partial acceptance. A customer can accept the food offer while the proposed courier has already withdrawn or lost capacity. **Rule:** distinguish the reusable offer from this customer's executing chain. Each provider's current authority, offer version, and capacity must support its ordinary child agreement. If only some children form, expose the partial result and an explicit recovery choice; do not pretend the package is fully confirmed or silently cancel already accepted children. Atomic package booking or replacement guarantees require a separate approved contract.

- **Replacement must follow the actual lifecycle.** Document 16 introduces `disrupted`; document 15 introduces a competing set of states and a direct `child_order_id` shape. The canonical model instead uses `replacement_needed`, a new Need referring to `replaces_deal_need_id`, and supersedes the old Need. **Rule:** preserve the old Need, Order, evidence, and financial history. The replacement must belong to the same Deal Chain, with lineage and version guards checked atomically. Form it through ordinary sourcing and agreement. Do not clear the old provider or overwrite the old Order to make the screen appear recovered. Resolve affected dependencies explicitly, including what happens if the downstream child has already begun.

- **Readiness, handoff, acceptance, and payment are four different facts.** Document 15 §5 and document 16 §3 turn readiness or a QR handoff into a payout trigger. A courier scanning a sealed package cannot prove its contents, the customer's acceptance, or the payment provider's ability to release funds. **Rule:** readiness means an item is reported ready; handoff records the stated transfer; Work acceptance follows that agreement's authorized rules; payment eligibility follows the separate obligation and lane policy. A handoff can be relevant evidence without being sufficient authorization for payment. If tokens are introduced, bind them to the exact transfer and authorized actors, expire them, prevent reuse, and retain a dispute path. These token details are a proposed safety requirement, not an implemented protocol.

- **One convenient plan is not one pooled bank account.** Document 15 §5.2 explicitly funds the parent and distributes money across providers, contradicting its own §8 and the charter's exclusions. **Rule:** payment remains attached to ordinary child Order obligations. The chain displays a derived summary, not a spendable balance. Distinguish estimated, agreed, reported paid, confirmed, refunded, and outstanding amounts; do not combine different currencies into one unlabeled total. A future combined payment experience requires its own approved payment contract. This review does not authorize pooled funds, automatic splitting, or production connected money.

- **Independent agreements do not guarantee that upstream providers can never be responsible.** Document 15 §5.3 protects the kitchen unconditionally; document 16 §3.3 assigns fault from packaging appearance and invents a 50/50 fallback. A concealed defect or mixed causes defeats those shortcuts. **Rule:** do not automatically alter a sibling's state, but allow relevant evidence to be reviewed under the applicable dispute and payment rules. A payout already made is not proof that no remedy can exist. Missing evidence means uncertainty requiring the approved process, not automatic equal liability. Engineering must not manufacture legal responsibility.

- **Cash risk cannot be solved by inventing a kiosk wallet.** Document 16 §6 mandates a deposit and treats digital prefunding as eliminating all cash liability. The charter excludes kiosk/Agent custody and does not approve a blanket courier-advance policy. **Rule:** a courier must not be silently made the lender. Who pays for goods, any authorized advance, the spending limit, receipt requirements, and reimbursement exposure must be explicit in an approved Work/payment contract. Unsupported arrangements are not offered by the automated chain. Do not invent deposits, guarantees, automatic cash refunds, or an 'operating balance'.

- **Fixed appointments and estimated times are different, and both are legitimate.** Document 16 §5 bans fixed downstream appointments and invents a universal 24-hour rule. A wedding caterer cannot simply arrive whenever upstream work finishes. **Rule:** distinguish estimates from accepted time windows, earliest-start constraints, and deadlines. Confirm capacity through the existing reservation contract. An upstream delay creates an impact notice and explicit reschedule/cancellation decision, not a silent new appointment. Perishable handling constraints belong to the relevant offering/Work contract; no universal freshness number or automatic blanket rejection is justified here.

- **Unexpected costs need explicit consent; silence is not approval.** Document 16 §7 invents a 30-minute timeout and guaranteed diagnostic fee. **Rule:** additional scope remains a proposal until the authorized parties accept its price and timing. Decline or timeout does not create extra work or a new fee. Any diagnostic/travel/cancellation charge must already be agreed or explicitly accepted. Preserve the original completed work, record the safe stopping condition, and handle each affected obligation under its own terms.

- **Correlation IDs do not prevent duplicate effects.** Document 15 §8 claims they do. One chain legitimately produces many commands and events with the same correlation ID. A retry can also arrive with a different tracing ID. **Rule:** scope command idempotency to the authorized caller/owner, command and target, and stable key; reject reuse with different semantic input. Commit the result, state, audit, and outbox together. Consumers deduplicate by stable event identity and preserve the owning aggregate's event order. A timeout after an external money request is an unknown outcome: query/reconcile using the original effect identity rather than issuing a new payment blindly.

  Idempotency is not enough when two different commands compete. The canonical contract allows at most one active child Order per Need. Enforce that invariant atomically with the applicable version and database uniqueness guards, even when the commands use different idempotency keys.

- **The parent summary cannot become a second source of truth or a privacy shortcut.** The latest documents give the chain its own totals and broad communication bridges without an access rule. A courier's participation does not entitle them to the customer's unrelated payments or another provider's private evidence. **Rule:** compute progress and financial summaries from authorized child facts, show their freshness, and return only the fields needed for each participant's role. A stale projection cannot authorize Work or payment. Chat cannot complete a Need. Support interventions require attributable authority and preserve the same history.

- **A coordinator's permission can expire before a delayed action executes.** Neither recent document fully addresses a revoked Agent consent grant while sourcing or dispatch work is queued. **Rule:** being the coordinator does not make someone the payer, every provider, or the owner of every child agreement. A command acting for another person must have current, scoped authority when it executes; delayed jobs recheck authority and activation before mutation. Revocation stops new unauthorized actions without erasing past attribution or cancelling other people's accepted agreements.

## The minimal logic contract to carry forward

These rules express the recommended correction; existing canonical sources continue to control actual states, fields, and approval gates.

| Question | Answer the system must use |
| --- | --- |
| What is a node? | One Deal Need: a particular required product/service outcome, not a person, mutable listing, or chat message. |
| Where does the offering come from? | Existing listing, Request/Quote, or invitation sourcing; accepted terms preserve the applicable versions. |
| Does accepting an invitation create an Order? | No. Agreement formation is a separate ordinary Order command. |
| Can two commands book the same Need? | At most one active child Order may exist; atomic uniqueness/version guards apply even with different command keys. |
| What does a connector do? | Blocks a named action until a defined authoritative condition is met. It does not perform payment or assign liability. |
| What if several inputs are needed? | Every active required condition for that action must be satisfied; failure is not completion. |
| What if the same provider returns? | Give each required stage its own identity; agreement boundaries follow the supported commercial model, not provider uniqueness. |
| What if a provider fails? | Preserve history, explicitly resolve the failed child, create a replacement Need within the same chain when appropriate, and reconcile affected dependencies. |
| What if a plan changes? | Check versions and impact; accepted-term changes require a defined amendment contract and affected-party approval. Refuse unsupported amendments. |
| What makes the whole chain complete? | Every required Need is completed or explicitly resolved under the canonical closure rules; child Work/payment states remain independent. |
| What if messages arrive late or twice? | Stable idempotency, ordered event consumption, and authoritative rechecks prevent repeated or stale effects. |
| What if money or evidence is uncertain? | Preserve the uncertainty and use approved reconciliation/dispute handling; do not manufacture success. |

### A concrete food-and-delivery check

The customer needs food and transport. Those are two Needs, sourced into separate ordinary agreements. The shop reports preparation readiness. That fact may permit an accepted courier to attempt collection, provided the relevant condition and Work rules support it. Collection records the handoff; arrival records delivery. Acceptance and payment each follow their own rules.

If collection discovers the wrong item, record the mismatch and whether physical custody actually transferred. A courier may discover the mismatch after taking possession; retain that handoff fact rather than erasing it. If custody never transferred, do not invent a handoff. Neither case automatically proves acceptance, authorizes payment, or completes delivery. Stop the affected action and use the applicable mismatch process. If the courier subsequently fails, preserve what actually happened at the shop, then resolve the delivery and any relevant dispute explicitly.

**Important boundary:** dispatch-before-shop-completion requires a defined readiness checkpoint condition. If only completion-based dependencies are approved, that behavior is not supported merely because the diagram draws it. This is a contract gap to close, not a reason to falsely complete the shop's Work early.

## Evidence and unresolved boundaries

### Evidence used

| Source | What it establishes |
| --- | --- |
| [Authority map](05-artifact-authority-and-supersession-map.md) §§1–2 | Supporting research does not silently become policy. |
| [Founder charter](12-deal-chaining-founder-decision-and-modeling-charter.md) §§3–4 | Independent child authority, derived roll-ups, no pooled money or automatic liability/cascades. |
| [Domain contract](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md) §§2.10–2.16 | Need/dependency/invitation meaning, states, replacement, locking and authorization. |
| [Parent architecture](../../_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md) AD-4–7, AD-17–19, AD-23–29 | Separate authority, final formation, immutable versions, ordered events, money integrity and activation gates. |
| [Foundation migration](../../database/migrations/2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php) | Source contains four foundation tables, product/service Need kinds, `blocks` dependencies, `condition_code`, and a cycle trigger. Presence is not proof of a working coordinator. |
| [Payment policy](02-payment-and-trust-lane-policy.md) §§3–6 | Additional lane and custody detail; this document itself remains marked revised draft and cannot independently authorize new policy. |
| [PostgreSQL 16 locking documentation](https://www.postgresql.org/docs/16/explicit-locking.html) §§13.3.2–13.3.4 | Locks protect only the relevant concurrent operations; consistent acquisition order and short transactions matter. |

### Do not confuse the planned logic with completed software

Source inspection found the four foundation tables and their constraints. The current [Order proposal source](../../app/Modules/OrdersWork/Application/SubmitOrderProposal.php) still creates direct-booking proposals with both chain identifiers set to `null` (lines 117–129). The application-source investigation found no DealCoordination command surface or dependency-condition registry.

Therefore, the foundation is evidence that the concept has a place in the data model, not evidence that the latest execution design already works. The deferred cycle trigger also does not by itself prove safety against concurrent graph edits: the shared chain-lock protocol required by the canonical contract must be enforced and exercised. No live catalog, concurrent transaction, or application journey was run for this documentation review.

### Decisions that must be explicit before the affected behavior is implemented

- **Dependency condition catalog:** supported source facts, target transitions, condition versioning, revocation and stale-event behavior. A free-text `condition_code` field alone is not the contract.
- **Checkpoint-level coordination:** how readiness and custody facts map to the existing Work shapes without pretending the whole Order completed.
- **Active-chain amendments and branching:** who approves changes, how alternatives are resolved, and how the selected graph affects accepted children and closure.
- **Published partnerships/composite offerings:** how each provider approves an exact offer version, what withdrawal changes, and how ordinary child agreements and capacity are confirmed. A reusable offer is not the same object as an executing customer's chain. No partnership table or revenue split is approved by this review.
- **Handoff and dispute policy:** required evidence, authorized acknowledgments, mismatch handling and remedies; no assumed universal QR, liability split or payout trigger.

These gaps do not require a new platform architecture. They require a small number of precise domain decisions propagated into the existing contracts. Unsupported behavior stays unavailable rather than being filled with guesses.

## Scenarios that must prove the corrected logic

This is an acceptance checklist for the affected implementation, not a claim that these tests have run.

| Scenario | Required observable result |
| --- | --- |
| The same listing is selected twice | Two Need identities; completing one does not complete the other. |
| A listing changes after agreement | Existing accepted price/scope stay unchanged. |
| An invitation is accepted twice | One recorded sourcing result; no hidden Order formation. |
| Two edits concurrently create opposing dependencies | A cycle cannot commit; the rejected edit has no partial effect. |
| Start races with a dependency change or relevant hold | The committed action is consistent with the governing versions and guards; no stale green-light bypass. |
| Two required inputs: one arrives, one fails | Dependent action remains blocked with an understandable reason. |
| Failed input is replaced | New history is linked; affected dependencies do not wait forever on the superseded input. |
| Same technician returns after transport | Distinct stage identities; no cycle based on provider identity. |
| Repair is selected instead of towing | The alternative is explicitly resolved, not executed or falsely completed. |
| QR/acknowledgment is replayed or submitted by another actor | No second transfer or unauthorized state change. |
| Handoff succeeds but contents are later disputed | Evidence is retained; no automatic payout immunity or liability split. |
| Customer declines extra work or does not respond | No invented fee or acceptance; safe stop and existing terms remain visible. |
| Two concurrent reservation attempts compete for one slot | At most the valid capacity is committed; a plan estimate cannot override availability. |
| Notification/event is duplicated or reordered | No repeated dispatch/payment and no projection state regression. |
| Worker crashes after a transaction commits | Durable event intent remains recoverable; retry does not repeat the business effect. |
| Payment provider times out after accepting a request | Outcome is reconciled with the original identity; no blind duplicate payment. |
| A coordinator cancels the parent | Child agreements and money do not silently cascade; impact is explicit. |
| A courier opens another child's private evidence | Access is denied even though both children belong to the same chain. |
| A partnership offer forms only some child agreements | The partial result is visible; no false full confirmation or silent sibling cancellation. |
| An Agent's consent is revoked before a queued command executes | The new unauthorized action is refused; accepted agreements and historical attribution remain intact. |
| Two child-formation commands use different keys for the same Need | At most one active child Order is created; no duplicate obligations from competing formation. |
| A replacement points into another chain | The lineage change is rejected without altering either plan. |
| The courier discovers a mismatch after taking custody | Both the actual handoff and mismatch remain recorded; neither is mistaken for acceptance or payment authority. |

## Bottom line

Keep the existing separation between planning, agreements, Work, money, and evidence. Make dependency conditions and changes precise. Remove the invented financial guarantees and universal timing rules.

**With those corrections, the design has a defensible structure. The latest documents alone do not yet establish a complete, implementation-ready execution contract.** This review changes documentation only; it does not change application code, migrations, or approved commercial policy.
