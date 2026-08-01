# Design

## Account and permissions
`ViewerAccount` owns capabilities (`request`, `provide`, `agent`). A transaction has `buyer` and `provider` participants. UI actions derive from ownership and capability; no client-side role selector exists. Operations is a distinct authorization boundary.

## Consumer information architecture
Primary consumer destinations are Home, Browse, Quick Deal, Activity, and Me. Pattern Lab remains an internal-only route and is removed from consumer navigation. Payment details live with an Order/Activity item instead of being a standalone primary destination.

## Low-literacy rules
- Lead with photo, price, person, place, and one action.
- Use icon + short Taglish label, 48px minimum controls, and a single primary action per panel.
- Hide codes, capability labels, policy explanations, and simulator notices behind Details/Help in review-only contexts.
- User-facing related-work language is `Plan a bigger job` and `Add another task`; `Deal-Chaining` remains internal documentation terminology.

## Quick Deal state model
`ready -> camera_requested -> scanning -> offer_received -> editing_counter -> counter_streaming -> awaiting_acceptance -> dual_confirm -> sealed -> waiting_sync | synced`.

Camera permission is always explicit. QR frames rotate automatically in the renderer at 4 FPS. In the static frontend it is a deterministic visual transport simulator; it never authorizes money. The mock contract preserves offer history, final amount, parties, receipt ID, and sync state.

## Related work model
A `WorkPlan` has independently owned `PlanItem`s. Each item owns amount, provider, state, dependency, and payment note. No plan total is represented as held funds. Child order/payment semantics remain independent future backend responsibilities.
