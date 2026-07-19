# Serbizyu — Spec & Mockup Expansion Master Plan

*Single governing document for all expansion work after the 2026-07-19 grilling consolidation (D17–D29, Deal System spec, Offline Deal spec, research reports R1–R6). This file is the index. If an expansion task is not listed here, it does not get worked on — it goes to §9 first.*

---

## 1. Purpose & Operating Rules

This plan converts the grilling-session output into an ordered, dependency-aware backlog of **spec expansions**, **mockup screens**, and **validation spikes**. It exists so that future work sessions follow one file instead of reconstructing context.

**Rules of engagement:**

1. **Traceability.** Every work stream cites its source (D-number and/or R-number). No orphan specs.
2. **One stream at a time.** Finish a stream's Definition of Done (§10) before opening the next.
3. **Zero scope widening.** New ideas discovered mid-stream go to §9 (Open Questions Register), not into the current stream.
4. **Same-commit updates.** Any spec/mockup change updates the README status table and the decision matrix (if a decision moved) in the same commit.
5. **Money-path discipline.** Anything touching escrow, ledger, cash receivables, or webhook handlers gets a second reviewer and tests on the money path. No exceptions.

---

## 2. Current State Inventory

| Artifact | State | Location |
|---|---|---|
| Decisions D1–D29 | Locked, with review triggers | `decisions/decision-matrix.md` |
| Deal System spec (Quick Deal + Deal-Chaining) | Written, 1,041 lines | `architecture/deal-system-spec.md` |
| Offline/Hybrid Deal spec (L0–L4, kiosk) | Written, 1,150 lines | `architecture/offline-deal-spec.md` |
| 10 older architecture docs (archetypes, connectors, inbox, workflow builder, channels ×4) | Stable | `architecture/` |
| Build plan, 17 sprints | Sprint-ready, needs stream placement for new items | `roadmap/phased-build-plan.md` |
| Mockups, 21 screens | Cover pre-deal primitives only | `mockup/screens/01–21` |
| Research R1–R6 | Complete, not yet integrated into specs | `~/serbizyu-*.md` |

---

## 3. Gap Matrix — Primitive × Artifact

| Primitive / Area | Decision | Spec | Mockup | Research | Net Gap |
|---|---|---|---|---|---|
| Quick Deal (QR → f2f → dual confirm) | D28 | ✅ deal-system §2, §11 | ❌ none | R5 | Screens |
| Deal-Chaining (multi-slot) | D28 | ✅ deal-system §3–§6 | ❌ none | — | Screens |
| Offline layers L0–L4 + kiosk | D28 + offline spec | ✅ offline-deal | ❌ none | R5 | Screens (kiosk PWA, SMS flows) |
| Human agents (75/10/15, graduation) | D19 | ❌ decision only | ❌ none | R4 | **Full spec + screens** |
| Cash layer (8/12/15%, receivables) | D27 | ❌ decision only | ❌ none | R5 | **Full spec + screens** |
| Pricing tiers + subsidies | D17 | ❌ decision only | ❌ none | R1 | **Revenue spec + admin screens** |
| Evidence-tiered disputes | D24 | ❌ decision only | ❌ none | — | **Spec + screens** |
| Verification tiers (5-level) | D26 | ❌ decision only | ◐ partial (17-trust) | R3 | **Spec + screens** |
| Notification matrix (13 events × 4 roles) | D25 | ❌ decision only | n/a (system) | — | Dispatch spec |
| Request/Bid hybrid mode | D20 | ✅ decision | ◐ 18–21 exist, no mode chooser | — | Screen update |
| 28 categories + Ilocano + labor-lang | D29 | ❌ decision only | ◐ needs update (01, 02) | R6 | Category schema spec + screen updates |
| Escrow 3-day guarantee | D21 | ◐ build-plan level | ✅ 05-track, 06-release | — | Xendit detail spec + spike |
| BIR posture / tax exports | D18 | ❌ decision only | ❌ none | R2, R3 | Admin export screens |
| Consent & data privacy | D9 | ❌ decision only | ❌ none | R2 | Privacy spec |
| Servicer discovery / search ranking | D23 | ❌ decision only | ❌ none | — | **Spec** |
| Multi-currency / remittance | — | — | — | — | Out of scope (Xendit settles PHP only) |
| A2A GPS auto-advance | D22 | — (infra tool) | — (not standalone) | — | Covered by WS-00c spike; no separate spec |

**Severity order:** Agent model, Cash, Revenue, Disputes, Verification are the five areas that are decision-only with zero spec and zero screens. They are the critical path.

---

## 4. Work Streams

### P0 — Validation Spikes (run in parallel, block nothing, de-risk everything)

**WS-00a — Xendit escrow spike.** Run a real test invoice through the marketplace sub-merchant flow before any escrow code is written. Source: build-plan risk register. Deliverable: spike report appended to `roadmap/phased-build-plan.md` §6 with confirmed flow diagram, webhook event list, and fee observations. Feeds WS-14.

**WS-00b — Semaphore OTP spike.** Confirm OTP delivery latency and reliability to provincial SIMs (Smart/Globe/DITO) from staging. Deliverable: measured delivery times, fallback decision (voice? retry policy). Feeds Sprint 1 auth.

**WS-00c — A2 GPS auto-advance spike.** Stress-test GPS accuracy and battery behavior on a cheap Android in provincial signal conditions. Deliverable: accuracy report; confirm "manual confirm always available, GPS only assists" guardrail holds. Source: D22-era risk register.


### Spike Decisions (Grilled 2026-07-19)

| Spike | Decision | Summary |
|---|---|---|
| WS-00a Xendit | ✅ GO | Path A (Protected, escrow) primary. Path B (Direct, ₱15-25 flat fee) credit-gated — servicer Tier 3+, 50+ Path A tx, pre-topup = listing boost. Xendit-only rail at launch. Negotiate rates post-traction. |
| WS-00b Semaphore | ✅ GO | SMS-only at launch via Semaphore OTP endpoint. philsms as backup provider. No voice OTP, no WhatsApp, no international. 3-attempt retry policy. Account application in Phase 0. |
| WS-00c GPS | ✅ GO | 800m auto-advance threshold, 3-sample debounce, buyer tap-confirm required. App works screen-off (heat protection). Manual confirmation always available as primary fallback. Quick Deal: GPS auto-advance. Near-offline: seller QR + facial. Full offline: kiosk. |

### P1 — Mockups for New Primitives (specs already exist; screens feed the pitch deck)

**WS-01 — Quick Deal screens.** Source: deal-system §2, §11. Screens 22–24: QR landing chooser (Book / Quick Deal / Reviews / Message), price negotiation, dual confirmation + receipt. DoD: linked in mockup hub, EN/Taglish toggle, brand tokens.

**WS-02 — Deal-Chaining screens.** Source: deal-system §3. Screens 25–27: deal creation with slot definition, slot manager + servicer invitation flow, buyer multi-slot progress tracker. Note: full multi-slot ships post-pitch per D28, but screens must exist for the pitch narrative.

**WS-03 — Offline/Kiosk screens.** Source: offline-deal §3–§9. Screens 28–29: kiosk PWA home (barangay hall / sari-sari store context), kiosk-mediated deal flow; plus SMS token acceptance visual (feature-phone frame mock). Degradation layer indicator (L0–L4) as a visible UI element.

### P2 — Full Specs for Decision-Only Areas (the critical path)

**WS-04 — Agent Model spec.** Source: D19, R4. New file `architecture/agent-model-spec.md`. Required sections: `delegated_access` permission model; OTP/SMS consent flow (owner never installs app); 75/10/15 commission split engine (where in the ledger the split happens); graduation state machine + 3× bonus mechanics; audit hash chain design; anti-fraud rules (co-notification, listing-live gate); SMS-only owner experience (weekly digest format); canonical business ID across agent→owner transition.

**WS-05 — Revenue domain spec.** Source: D17, D27, R1, R5. New file `architecture/revenue-spec.md`. Required sections: fee tier engine (₱10 flat / 8% / 6% + caps) as config, not code; category subsidy overrides with expiry; cash receivable ledger (commission accrues against servicer wallet on cash deals); negative-wallet enforcement ladder; barangay mediation form generator (Free tier) and Protected tier (+₱10–15) mediation flow; admin revenue dashboards (fee config, transaction ledger, subsidy impact); unit economics validation of the ₱19.2k/month launch estimate from R1.

**WS-06 — Dispute & Evidence spec.** Source: D24. New file `architecture/dispute-spec.md`. Required sections: per-servicer evidence score computation; tier assignment algorithm (High/Medium/Low); four resolution outcomes (full refund, partial, full release, re-service); SLA timers (<4h business, <12h otherwise); single-level appeal (48h); dispute propagation rules for deal-chains (cross-ref deal-system §6); cash dispute tier interaction (cross-ref WS-05).

**WS-07 — Verification Pipeline spec.** Source: D26, R3. New file `architecture/verification-spec.md`. Required sections: 5-tier state machine; AI face-match provider choice + fallback manual queue; admin verification queues per tier; tier-unlock hooks (search ranking, featured eligibility, dispute hold %, transaction caps); agent/owner tier requirements (agent ≥ Identity, owner ≥ Barangay before listings live); verification is free — cost model for admin review time.

**WS-08 — Notification Dispatch spec.** Source: D25. New file `architecture/notification-spec.md`. Required sections: full event catalog (13 base events + 15 deal events from deal-system §8); channel routing per role (buyer / servicer / agent / SMS-only owner); SMS budget guardrail (₱20/user/month circuit breaker → in-app-only fallback UX); weekly digest batching for owners; quiet hours; Semaphore integration points (cross-ref channels/sms.md).

**WS-09 — Category Schema spec.** Source: D29, R6. New file `architecture/category-schema.md`. Required sections: 28 categories as seed data with attribute schemas (schema-as-data, no migrations per category); i18n keys EN/TL/ILO for labels; mandatory "labor lang / kasama materyales" filter for trades; gender-preference attribute where relevant; service-area model as **filter attribute, not taxonomy** — categories are town-agnostic, town/barangay are search filters (per resolved correction); barangay service declarations on profiles; admin-defined categories only at launch.

**WS-09b — Search Ranking & Discovery spec.** Source: D23. New file `architecture/search-ranking-spec.md`. Required sections: three-tier ranking model (distance + verification tier weighted default sort); filterable by response time, category, barangay; ranking signals (verification tier, star rating, completion rate, response time, dispute rate penalty per D24 trigger); Meilisearch index design; no paid ranking at launch (deferred post-pitch). ~300 lines.

### P3 — Admin Surfaces, Platform Docs, Pitch (after P2 specs exist)

**WS-10 — Admin & ops screens.** Source: R2 + WS-04–08 specs. Screens 30–39: agent dashboard, owner SMS digest mock, cash dual-confirm, servicer wallet with receivables, verification center (servicer side), dispute filing with evidence upload, admin dispute console, admin fee/subsidy config, admin revenue dashboard, admin verification queue.

**WS-11 — Data privacy & consent spec.** Source: D9, R2. Consent text versioning, `servicer_channel_consents` enforcement points, retention policy, privacy page content. Philippine DPA framing, pragmatic level (not legal-max).

**WS-12 — Hosting/infra architecture doc.** Source: D2. Update for the consolidated 17-sprint build: single droplet layout (app + Reverb + queue + Meilisearch + Postgres), backup/restore drill, monitoring (Sentry + Pulse), Phase 2 split trigger (>500 concurrent WS connections).

**WS-13 — Pitch deck narrative update.** Source: mockup/deck/pitch.html. Must reflect: Quick Deal, Deal-Chaining, offline/kiosk, agents, 28 provincial categories, tiered pricing, cash support. Runs last — after the screens it references exist.

**WS-14 — Xendit integration detail spec.** Source: D14, D21, WS-00a spike results. New file `architecture/xendit-integration.md`. Escrow creation on payment confirmation, 3-day auto-release job, sub-merchant/disbursement flow, webhook idempotency (unique `xendit_webhook_id`), refund paths, Xendit fee modeling against D17 tiers.

---

## 5. Execution Order

```
WS-00a/b/c (spikes, parallel, anytime)
        │
WS-01 → WS-02 → WS-03          (new-primitive mockups; pitch-facing)
        │
WS-04 → WS-05                  (agent + revenue specs; hardest, most novel)
        │
WS-06 → WS-07 → WS-08 → WS-09 → WS-09b (trust-system specs; independent of each other)
        │
WS-10                          (admin screens; needs WS-04–08 as source)
        │
WS-11 → WS-12 → WS-14          (platform docs; WS-14 needs WS-00a results)
        │
WS-13                          (pitch deck; last, references everything)
```

Rationale: mockups first because they feed the pitch and surface UX problems cheaply; agent + revenue specs next because they are the highest-novelty engineering and everything admin-side depends on them; the deck goes last because it must screenshot real screens.

---

## 6. Mockup Screen Backlog (continuing from screen 21)

| # | File | Stream | Purpose |
|---|---|---|---|
| 22 | `22-quickdeal-landing.html` | WS-01 | QR scan landing: action chooser |
| 23 | `23-quickdeal-negotiate.html` | WS-01 | Price negotiation, face-to-face |
| 24 | `24-quickdeal-confirm.html` | WS-01 | Dual confirmation + receipt |
| 25 | `25-deal-create.html` | WS-02 | Deal-chain creation, slot definition |
| 26 | `26-deal-slots.html` | WS-02 | Slot manager + servicer invites |
| 27 | `27-deal-track.html` | WS-02 | Multi-slot progress, buyer view |
| 28 | `28-kiosk-home.html` | WS-03 | Kiosk PWA home (barangay/store) |
| 29 | `29-kiosk-deal.html` | WS-03 | Kiosk-mediated deal + SMS token visual |
| 30 | `30-agent-dashboard.html` | WS-10 | Agent managing owner listings |
| 31 | `31-owner-sms.html` | WS-10 | SMS-only owner weekly digest mock |
| 32 | `32-cash-confirm.html` | WS-10 | Cash dual confirmation |
| 33 | `33-wallet.html` | WS-10 | Servicer wallet incl. cash receivables |
| 34 | `34-verification-center.html` | WS-10 | 5-tier progression, servicer side |
| 35 | `35-dispute-file.html` | WS-10 | File dispute, evidence upload |
| 36 | `36-dispute-console.html` | WS-10 | Admin resolution console |
| 37 | `37-admin-fees.html` | WS-10 | Category fee + subsidy config |
| 38 | `38-admin-revenue.html` | WS-10 | Revenue dashboard + subsidy impact |
| 39 | `39-admin-verify-queue.html` | WS-10 | Verification review queue |

**Updates to existing screens:** `01-home` (28 categories, Ilocano labels), `02-search` (labor-lang filter, barangay filter — filters, not town silos), `08-servicer-signup` (agent-managed account toggle), `17-trust` (verification tier display), `18-post-request` (First Available / Let Me Compare mode chooser per D20).

---

## 7. Spec Backlog Summary

| Stream | New File | Size Est. | Primary Sources |
|---|---|---|---|
| WS-04 | `architecture/agent-model-spec.md` | ~800 lines | D19, R4 |
| WS-05 | `architecture/revenue-spec.md` | ~900 lines | D17, D27, R1, R5 |
| WS-06 | `architecture/dispute-spec.md` | ~600 lines | D24 |
| WS-07 | `architecture/verification-spec.md` | ~500 lines | D26, R3 |
| WS-08 | `architecture/notification-spec.md` | ~500 lines | D25, deal-system §8 |
| WS-09 | `architecture/category-schema.md` | ~600 lines | D29, R6 |
| WS-09b | `architecture/search-ranking-spec.md` | ~300 lines | D23 |
| WS-11 | `architecture/privacy-consent-spec.md` | ~300 lines | D9, R2 |
| WS-12 | `architecture/hosting-infra.md` | ~300 lines | D2 |
| WS-14 | `architecture/xendit-integration.md` | ~500 lines | D14, D21, WS-00a |

Every new table named in these specs ships with migration + model + policy + factory in the same PR when built (build-plan §5 rule).

---

## 8. Research Integration Map

| Report | Lands In | What Must Be Extracted |
|---|---|---|
| R1 pricing | WS-05 | Commission benchmarks, ₱19.2k/mo launch model assumptions, micro-transaction fee floors |
| R2 admin | WS-10, WS-11 | RBAC patterns, admin interface inventory, BIR export requirements |
| R3 legal | WS-07, D18 triggers | TRAIN thresholds, BMBE path, graduated compliance tiers, counsel review triggers |
| R4 agents | WS-04 | Meesho/Gojek/Facebook Page role models, split-mechanic precedents, anti-fraud patterns |
| R5 cash | WS-05, offline-deal §13 | COD dual-confirm mechanics, utang-ledger analogies, M-Pesa agent float lessons |
| R6 categories | WS-09 | 28-category list, Ilocano terms, search behavior, attribute lists per category |

Integration rule: when a stream completes, the R-report's relevant numbers must appear as citations inside the new spec. Research that isn't cited in a spec is considered unintegrated.

---

## 9. Open Questions Register (for the next grilling session — do not resolve ad hoc)

1. **AI pricing posture.** Profit center vs acquisition loss-leader (raised during D17 grilling, deferred).
2. **Kiosk hardware ownership.** Who funds the ₱8.5–12.5k tablet — barangay LGU, store owner, Serbizyu, or cost-share?
3. **Multi-slot escrow release.** D28 says payout releases when all slots complete — does that survive a 3-month construction deal-chain? Partial milestone release option needs grilling.
4. **Graduation bonus funding.** Agent's 3× monthly commission bonus — from platform margin or marketing budget? Unit economics check needed.
5. **Negative-wallet enforcement ladder.** Exact thresholds: at what receivable balance does a cash servicer get restricted from new cash deals?
6. **SMS circuit breaker UX.** When the ₱20/user/month SMS cap trips (D25 trigger), what does the in-app-only fallback look like for an SMS-only owner?
7. **Agent dispute divergence response.** D19 trigger fires if agent-facilitated dispute rate exceeds direct rate by >5% — what's the playbook: retraining, split reduction, suspension?
8. **Quick Deal price-variance justification.** D28 trigger at >30% modification — what does the justification UX capture, and is it shown in disputes?

---

## 10. Definition of Done per Artifact Type

**Spec (new architecture doc):** written; cross-linked in README status table; decision matrix references updated if any decision moved; every new table listed with the migration/model/policy/factory rule noted; research citations present per §8; committed and pushed.

**Mockup screen:** file in `mockup/screens/`; linked from `mockup.html` hub; brand tokens applied (no raw hex); EN/Taglish toggle consistent with hub; mobile-first layout; committed and pushed.

**Spike report:** appended to build plan §6 risk register with measured data (not assumptions); go/no-go recommendation stated; committed and pushed.

**Work stream:** all its artifacts at DoD; this file's gap matrix row updated; next stream opened only after.

---

*End of Expansion Master Plan. This file governs. Changes to scope happen here first, then in the work.*