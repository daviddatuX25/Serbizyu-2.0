---
name: Serbizyu Work Scenario Coverage
type: architecture-companion
status: final
created: 2026-09-14
updated: 2026-09-14
binds:
  - ARCHITECTURE-SPINE.md
---

# Work Scenario Coverage

## Purpose

This companion records the scenario evidence used to test the Work architecture. It is not demand sizing and does not turn every scenario into a product promise.

The existing “100-case” corpus is mislabeled and overstates Deal Chain universality. The current dossiers contain **79 located cases**, not 100:

| Dossier | Located cases | Architectural use |
|---|---:|---|
| Vehicle and marine repair | 20 | diagnosis, parts, custody, safety, specialist boundaries |
| Personal, professional, and care services | 20 | appointments, consent, regulated roles, sensitive data, long-running care |
| Home/building/trades | 10 | site work, inspection, permits, change orders, same-provider phases vs subcontracted Orders |
| Events/catering/rental | 20 | hard windows, joining dependencies, rental/return, replenishment, partial fulfillment |
| Agriculture/retail/field operations | 9 | batches/lots, measurements, perishability, telemetry, yield/mass balance, animal welfare |
| **Total** | **79** | Stress corpus only |

The source dossiers remain the individual case record. This document records their architectural classifications and the finite capabilities needed to handle them.

## Classification Rule

For every scenario, classify in this order:

1. Identify each independently accountable provider promise.
2. Create one Order per provider/acceptance/commercial-liability boundary.
3. Default each Order to one Work Instance.
4. Add another Work under the same Order only for a finite, keyed, independently governed fulfillment unit under identical parties and terms.
5. Keep phases, diagnostics, checklist items, evidence capture, reviews, and ordinary visits inside Work.
6. Create a Deal Chain only when one separate Order depends on, hands off to, branches from, or replaces another.
7. Keep Payment, Evidence, Consent, Hold, Dispute, and external-provider truth in their owning domains.

## Counterexamples: The Simple Product Must Stay Simple

These scenarios invalidate a design that requires templates, a canvas, milestones, pooled escrow, or a Deal Chain for ordinary commerce.

| Scenario | Formation source | Order/Work result | Shape | Needed extensions | Explicitly unnecessary |
|---|---|---|---|---|---|
| Walk-in haircut | provider capability or listing | 1 Order / 1 Work | A3 | slot, attendance, service outcome | template, phases, Chain |
| One tutoring session | listing/direct booking | 1 / 1 | A3 | subject, duration, attendance, reschedule | project workflow, Chain |
| Appliance diagnosis visit | listing/quote | 1 / 1 | A3 | diagnostic outcome, evidence, amendment if repair added | pre-formed repair Order |
| Counter product pickup | listing/direct booking | 1 / 1 | A4 | quantity, readiness, receipt | delivery workflow, Chain |
| Counter mismatch/shortage | existing accepted Order | same 1 / 1 | A4 | mismatch evidence, dispute/correction | second Work or Chain node |
| Digital design file | listing/quote | 1 / 1 | A9 | artifact, access, revision limit, acceptance | physical handoff shape |
| Document scanning | listing/direct agreement | 1 / 1 | A9 when the accepted outcome is the digital artifact; A1 for a broader scanning project | source custody evidence plus artifact/review contract; current Tagudin A1 listing changes only through a new governed version | multi-Order Chain unless custody provider differs |
| Cash at handoff | accepted Order | Work remains A4; cash is separate Payment event | A4 | receipt fact | “cash Work” or payment command in payload |
| Simple plumbing repair by one plumber | listing/quote | 1 / 1 | A1 | diagnosis phase, parts/change authorization, completion evidence | one Work per step |
| One commissioned report | request/quote | 1 / 1 | A9 or A1 by promised outcome | evidence inputs, review, revisions | default template or Chain |

## Scenario Family Matrix

| Family | Default classification | Shape / future shape | Required capability primitives | Boundary that changes classification |
|---|---|---|---|---|
| Finite repair/installation | 1 Order / 1 Work | A1 | bounded phases, parts, change authorization, evidence, warranty | separately contracted specialist or supplier creates another Order; Chain only if dependent |
| Diagnose then decide | diagnostic Order first | A3 or A1 | findings, evidence, recommendation | repair/parts form only after new acceptance; never speculative child Orders |
| Scheduled personal service | 1 / 1 | A3 | slot, attendance, reschedule, no-show, outcome | recurring series may require A6; different provider means another Order |
| Professional deliverable | 1 / 1 | A9 or A1 | inputs, artifact/deliverable, revisions, review, acceptance | regulated approval is evidence unless separately contracted |
| Physical product pickup | 1 / 1 | A4 | capacity/quantity, preparation, handoff, receipt/mismatch | independent courier creates another Order; Chain if pickup depends on readiness |
| Custody transfer | 1 / 1 | A4 | asset/serial, before/after condition, signatures, custody timeline | rental interval/return requires A5 rather than stretching A4 |
| Returnable rental | 1 / 1 after A5 exists | A5 deferred | checkout, possession interval, return, condition delta, loss/damage, deposit policy | delivery/setup providers become separate dependent Orders |
| Digital artifact delivery | 1 / 1 | A9 | artifact version, access, scan/validation candidate, revisions, acceptance | external licensed review creates an Order only when independently purchased |
| Live dispatch/towing | separate dispatch Order | A2 deferred | assignment, fresh location, ETA, arrival, reassignment, safety | interim A4 must not claim live-dispatch authority |
| Recurring cleaning/maintenance | series Order under explicit model | A6 deferred | period generation, skip/pause, exception, per-period evidence, termination | use repeated ordinary Orders until A6 contract is implemented |
| Long-running care/program | governed program Order | A10 deferred | plan review, ongoing state, consent renewal, non-terminal continuation | episodic appointments may remain separate A3 Orders |
| Emergency service | ordinary shape plus overlay | A1/A2 plus A8 overlay | urgency, dispatch priority, emergency authorization, safety stops | emergency is not its own Work shape |
| Quote/bid procurement | formation mechanism | resulting A1/A3/A4/A9 | proposal version, acceptance proof, exact spec hash | quote/bid is not its own Work shape |
| Multi-trade home project | one Order per responsible provider | mostly A1 | site, phases, safety, inspection evidence, amendments | general contractor as sole liable provider may keep internal subcontracting outside marketplace Orders |
| Permit/utility/agency act | evidence/integration by default | applies to owning Work | official status candidate, verification, retention | becomes Order only if an independent provider promise is purchased on-platform |
| Event food + courier + on-site service | 3 Orders and genuine Chain | A4 + A4 + A1/A3 | hard windows, temperature, custody, joining gates, substitution consent | same caterer owning all liability may collapse to one Order with internal phases |
| AV/canopy/stage rental and setup | several Orders and genuine Chain | A5 future + A4 + A1/A9 | inventory/serial, transit, setup, safety readings, teardown/return | audit/inspection is evidence unless separately contracted |
| Wake/generator rental | several Orders and genuine Chain | A5 future + A4/A2 + A1 + A4 | interval, telemetry, fuel, replacement, teardown/return | “fuel errand” is not a free sidecar; separate acceptance required |
| Coffee cart with replenishment | provider Orders with dependency | A4 + A1/A3; A6 if recurring | cold chain, stock/replenishment, partial service, hard window | unbounded on-demand child creation is forbidden |
| Fleet/unit batch service | usually one Order / one Work | A1 | item/asset list, batch progress, per-unit evidence | separate Work only when units are independently governed/settled by profile; not by default |
| Machining/specialist repair | finite project | A1 | measurement, tolerance, artifact/part identity, evidence | A3 only when the appointment itself is the promise |
| Agriculture batch/lot fulfillment | 1 / 1 or provider Orders with Chain | A1/A4 | lot/batch, custody, units/calibration, sampling, perishability | transport/processing by other providers creates Orders and dependency gates |
| Harvest/processing | provider Orders and genuine Chain when split | A1/A4 | time-series stages, yield/mass balance, condition telemetry, capacity | internal farm stages remain one Work when one provider owns outcome |
| Animal-related service | governed capability | A1/A3/A10 | identity, welfare, consent, regulated role, safety stop | emergency/long-running semantics require overlays/future shape support |
| Regulated health/legal/financial service | one provider Order unless independent reviewers | A3/A9/A10 | explicit consent, role/license, sensitive data access/retention, hard stops | portal/clinical/agency status is not success until verified |

## Cross-cutting Flexibility Requirements

### Source and reuse

- start from a blank source-owned Work specification;
- optionally copy an exact private or curated template version;
- preserve template provenance without runtime dependence;
- explicitly promote a source draft into a separately versioned template;
- reject stale/incompatible template versions rather than merge them with current defaults.

### Structure

- finite deliverables and exclusions;
- bounded phases, checklist items, and acyclic local dependencies;
- stable keys for evidence and cross-Order fact references;
- independently governed fulfillment units only when cardinality policy permits them;
- profile-specific extensions without a vertical-specific Work table.

### Scheduling and capacity

- appointment slot and reschedule/no-show;
- quantity, stock, asset, service-area, or provider-time reservations;
- hard event windows and readiness deadlines;
- future dispatch assignment, rental intervals, recurring periods, and continuing-plan reviews;
- reservation release only through explicit Work/Order/capacity policy.

### Goods, custody, and measurement

- quantity, serial, lot, batch, and asset identity;
- condition before/after, custody signatures, receipt and mismatch;
- calibrated units, tolerances, sampling, mass/yield balance;
- perishability, temperature, seal, cold/hot chain, and time-window evidence;
- parts, substitutions, warranties, and approved scope changes.

### Artifacts and evidence

- typed artifact versions and access rules;
- revision rounds, review, acceptance, and rejection;
- photo, QR, GPS, sensor, document, signature, and human approval candidates;
- verification policies before candidates become domain facts;
- sensitive-data classification, retention, redaction, export, and delegated access.

### Failure, cancellation, and replacement

- partial fulfillment without marking the whole Work complete;
- failed/retryable/blocked/reconciliation states;
- request/approve/deny cancellation with explicit capacity and obligation effects;
- immutable amendments with affected-party acceptance;
- replacement Need/Order lineage that preserves failed history;
- sibling isolation in Deal Chains; no implicit cascade.

### Payment separation

- one or more purpose-specific obligations owned by PaymentObligations;
- explicit due-condition policy versions over verified facts;
- no pooled Chain money and no parent Chain liability;
- no Work payload release instructions;
- cash, refund, fee, settlement, and provider-webhook truth remain Payment events.

### External tools

- maps/ETA, calendars, inventory systems, sensors, QR, OCR/vision, weather, notifications, AI drafting, and search remain adapters;
- adapter failure is visible and recoverable;
- raw adapter payloads do not become Work schema;
- no adapter writes aggregate state directly.

## Corpus Corrections

The following claims in the existing planning-hardening corpus must not be propagated:

1. “100 cases” — only 79 cases were located across the five dossiers.
2. “Every case is a Deal Chain” — false; many are ordinary bilateral Orders with one Work.
3. “Every phase is a Work/Order node” — false; internal execution topology remains inside Work.
4. “Every auditor/inspector/portal is a provider node” — false; often evidence or an integration adapter.
5. “Sidecar errands/replacements are automatically included” — false; external provider scope needs independent acceptance and Order lineage.
6. “A3 represents any specialist service” — false; A3 is an appointment contract. Finite specialist outcomes are commonly A1.
7. “A4 is sufficient for rental or live dispatch” — false; A5 and A2 need distinct authoritative semantics.
8. “Escrow/release belongs to the Chain or Work step” — false; each Order's Payment Obligations own money state.
9. “Templates are necessary to express complexity” — false; from-scratch bounded specifications are primary.
10. “External tool success is domain success” — false; adapters provide candidates that owned policies verify.

## Coverage Result

The architecture covers the observed variation without enumerating every business category as a new Work shape:

- A1/A3/A4/A9 cover launchable finite project, appointment, handoff, and digital-delivery behavior.
- Capability profiles provide governed specialization for safety, evidence, data, capacity, measurement, custody, parts, and category extensions.
- Source-owned specifications capture the exact promise; optional templates reduce authoring effort only.
- A2/A5/A6/A10 are real semantic gaps and remain explicitly deferred rather than misrepresented by launch shapes.
- Deal Chain coordinates only independently accountable Orders with real dependency truth.

This is sufficient architectural headroom. It intentionally excludes arbitrary user-authored state machines, scripts, unbounded dynamic children, and direct tool/payment authority.
