# Serbizyu 2.0 — Customized Work Specifications Stemming from Listings or Capability Profiles

**Document reference:** `22-customized-work-specifications-stemming-from-listings.md`  
**Status:** PROPOSED HARDENING SPECIFICATION — implementation and pilot activation remain separately gated  
**Scope:** Provider bids/proposals, source provenance, provider customization, structured Work specifications, and PostgreSQL persistence  
**Subordinate to:** Documents 17, 18, and 20; the canonical schema implementation contract; the canonical domain/state contracts  

> This document specifies the missing provenance and Work-contract layer for a provider bid. It is planning authority for this slice only. It does not claim that proposal tables, Deal-Chaining execution, connected payments, or the later user-facing coordination capability are implemented.

---

## 1. Executive contract

A provider bid is a proposed **customization of an approved base capability**, not an unbounded offer invented from free-form text.

Every proposal and every billable proposal node MUST be traceable to exactly one of these source paths:

1. **Listing path:** a provider-owned, immutable `listing_versions` row (for example, the published *Electrical Diagnostics & Repair* listing).
2. **Capability Profile path:** an exact approved `capability_profiles` business version plus a currently valid provider activation, for a provider who can perform the capability without a public listing for this request.

The source supplies the governed identity, work shape, safety/data class, allowed mechanism/payment lanes, and base terms that are applicable. The provider may then submit explicit, reviewable overrides for this request:

- customer price and provider payout;
- deliverables and acceptance criteria;
- inclusions and exclusions;
- required parts/materials and who supplies them;
- schedule/location/fulfillment constraints where the source policy permits;
- workmanship warranty terms; and
- a structured Work specification composed of phases, checklists, and evidence requirements.

The server resolves and validates the source plus overrides into an immutable proposal version. It never silently copies current listing data after the proposal was made, and it never lets a client submit a forged resolved total or completion claim.

### 1.1 Non-negotiable invariants

| Invariant | Required behavior |
| --- | --- |
| No source-less bid | A proposal/node without a listing version or capability-profile version is rejected. `OWN_QUOTE` is not permission to omit provenance; in this contract it means a provider quote rooted in an approved capability profile. |
| Source identity is immutable | `source_listing_version_id` and profile business-version pins identify the exact base used to produce the bid. A later listing edit creates a new listing version and does not rewrite an existing proposal. |
| Provider ownership is proved | A listing source must belong to the node provider. A profile source must be enabled for that provider by the capability/activation contract. A public listing alone is not authority to attach it. |
| Customization is explicit | A changed amount, scope, schedule, parts responsibility, warranty, inclusion, exclusion, or deliverable is a declared override, not an unlabelled replacement of the base. |
| Base safety is a floor | A customization may add detail or increase scope. It may not remove a required safety control, mandatory evidence item, or capability constraint from the source/profile. |
| Proposal is not Work execution | Proposal phases and evidence requirements describe the contract. Actual phase progress, evidence files, readiness, sign-off, and completion live under the accepted child Order and Work Instance. |
| Readiness is not completion | A phase/readiness fact can unblock a named downstream action, such as collection. It does not complete the Order, authorize payment, or prove customer acceptance. |
| Independent obligations | An accepted multi-node proposal creates independent child Orders and one-to-one payment obligations. There is no parent escrow, pooled balance, automatic split, or hidden subcontractor liability. |
| Sourcing without spam | An unchanged, pre-authorized `STANDARD_AUTO_BIND` listing reference creates no speculative partner invitation or notification. Custom terms require explicit partner confirmation before buyer acceptance. |
| Accepted terms do not mutate | An accepted proposal/work specification is immutable. A material change uses a new proposal version before contract formation or a separately approved amendment contract after formation. |

### 1.2 Terminology note

The repository's canonical schema uses `users.id` for human/provider identity. Some earlier planning examples use a `providers` table and `provider_id`; in the DDL below, `provider_user_id`/`lead_provider_user_id` references `users(id)`. If a provider aggregate is introduced later, its identity mapping must be explicit rather than inferred.

---

## 2. Domain model and provenance

### 2.1 Objects and ownership

| Object | Owns | Does not own |
| --- | --- | --- |
| `capability_profiles` | Governed taxonomy combination, work shape/contract version, allowed lanes/access, safety/data class, business-version identity | A provider's request-specific price, promised deliverables, or an Order |
| Provider activation | Authority for a provider/account to use an exact capability/profile in an environment/cohort/geography | Listing content or a customer contract |
| `listings` | Provider-owned offer identity and lifecycle | A bid or an accepted Work result |
| `listing_versions` | Immutable listing price/scope/capacity/terms snapshot and exact category/profile pins | A later proposal customization |
| `proposals` | One provider bid lineage for one request, root source identity, and current version pointer | Customer payment, Work progression, or pooled settlement |
| `proposal_versions` | Immutable version of the bid package, totals, source-derived terms, gate state, and hash | Mutable runtime status of the eventual Work |
| `proposal_nodes` | One independently payable provider outcome within a proposal version and its resolved Work specification | Sibling node obligations or parent-wide completion |
| Proposal node edges | Explicit named dependency between nodes | Payment, dispatch, or implicit liability transfer |
| `orders` | Accepted commercial agreement per node | Detailed phase progress or payment ledger truth |
| `work_instances` | Accepted Work shape, execution payload, evidence/sign-off lifecycle | Listing ownership or proposal negotiation |
| `evidence_files`/`work_events` | Actual evidence and append-only execution history | The proposal's unaccepted promises |

### 2.2 Provenance graph

```text
Provider activation (optional public listing path; required profile-only path)
        │ validates provider may offer profile/business version
        ▼
Capability Profile family + business version
        │ governs work shape, contract version, safety/data class, allowed fields
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
Provider-owned Listing                         Profile-only provider bid
        │ immutable ListingVersion               (no public listing required)
        ▼                                              │
Proposal root source ───────────────┬───────────────┘
                                    ▼
                         Proposal Version
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
  Node: provider/listing source                  Node: provider/profile source
  resolved customized Work spec                 resolved customized Work spec
             │                                             │
             └─────────────── accepted independently ──────┘
                                    ▼
                     one ordinary child Order per node
                                    │
                   one Work Instance + obligations per Order
```

A proposal may contain multiple nodes. The root source identifies the lead provider's starting point; each node carries its own authoritative source because an attached hardware, courier, or installation obligation may have a different owner and source version.

### 2.3 Listing source path

A listing-stemmed node MUST satisfy all of the following at proposal creation:

1. `source_listing_id` and `source_listing_version_id` are both present.
2. The version belongs to that listing; the cross-table identity is checked, not merely assumed from two client fields.
3. The listing owner equals `proposal_nodes.provider_user_id`.
4. The listing/version is published/active under the listing lifecycle and has a valid effective/expiry window.
5. The listing version pins an exact capability-profile family/business version and category version.
6. The source `work_shape`, shape-contract version, and allowed payment lanes are supported by the profile registry.
7. If the source is another provider's listing, the listing's chain policy permits the exact use:
   - `STANDARD_AUTO_BIND` for unchanged standard terms; or
   - an explicit partner invitation for custom terms.
8. The source snapshot is captured in the proposal node. It is not recomputed from the listing's current version at display or acceptance time.

The proposal may refer to an older listing version while that version remains valid for quoting. At acceptance, the server revalidates its effective window, policy, provider status, capacity, schedule, and terms. It MUST either honor the exact immutable quoted version or return a conflict requiring a new proposal version; it MUST NOT silently substitute a newer price or scope.

### 2.4 Capability Profile source path

A profile-only node MUST satisfy all of the following:

1. `source_listing_id` and `source_listing_version_id` are null.
2. `source_capability_profile_family_code` and `source_capability_profile_business_version` identify an exact profile row.
3. The profile business version is approved/active for the relevant environment and is not retired for new proposals.
4. A current provider activation (or the explicitly approved equivalent authorization) matches provider, profile, work shape, geography/cohort, and mechanism. A broad provider role is not enough.
5. The profile registry resolves the `work_shape`, shape contract version, and payload schema version.
6. The provider supplies request-specific commercial terms and Work details; the global profile does not become a fake provider listing.

A capability profile is a governed capability, not a price catalog. Profile defaults may provide required phase/evidence schema or safety minima, but the provider's bid must still state the actual deliverables, inclusions/exclusions, parts responsibility, warranty, and customer amount for this request.

### 2.5 What the source is—and is not

The source is a **constraint and provenance boundary**. It is not a frozen answer to every request. The request may add requirements, and the provider may propose a custom scope within allowed limits. The resulting proposal version records:

```text
source identity
+ source snapshot
+ request constraints
+ provider-declared overrides
+ server-resolved Work specification
+ server-calculated economics
```

If the request cannot be satisfied without violating the source/profile, the bid is rejected or must be represented as a separately sourced node. It is not valid to keep the same listing identity and quietly change the provider, work shape, or mandatory safety contract.

---

## 3. Customization surface

### 3.1 Precedence and merge rules

The resolver applies inputs in this order:

1. **Governed profile contract:** safety/data class, shape, schema version, allowed mechanism/lane, mandatory evidence, and immutable policy limits.
2. **Exact listing version (when present):** provider-owned title/scope, base price/unit, availability, capacity, schedule, fulfillment terms, inclusions/exclusions, parts/warranty defaults, and source hash.
3. **Request constraints:** required outcome, location, timing, quantity, buyer safety/privacy requirements, and budget semantics.
4. **Provider overrides:** only fields explicitly allowed by the source/profile and request; each is recorded as a delta.
5. **Server resolution:** normalized full deliverables, phases, evidence requirements, economics, terms, and hashes.

For conflicts, the more restrictive applicable rule wins. A provider override cannot weaken a governed safety requirement, claim a capability that the profile does not support, or make a required request outcome optional. An unresolved conflict is a validation error, not a warning that the buyer must discover later.

### 3.2 Pricing

The bid must separate customer economics from provider economics:

- `customer_unit_minor` — amount charged per proposal unit;
- `customer_total_minor` — amount charged for the node quantity;
- `provider_payout_minor` — provider-side amount under the node terms;
- `discount_minor` — explicit customer reduction; and
- `discount_funder_provider_id` — provider funding the reduction, when applicable.

Rules:

- All monetary values are integer minor units (`BIGINT`) with an explicit ISO currency.
- The server calculates totals from quantity, unit price, discount, fee, tax, and policy snapshots. The client may submit an intended override but never an authoritative total.
- A catalog reference must preserve the source price, currency, quantity/unit, and pricing rules. A changed price is `CUSTOM_TERMS`.
- A custom price must show the base amount, override amount, delta/reason, and any provider subsidy to the buyer and affected partner.
- If a provider receives the base payout while a buyer receives a discount, the subsidy is a separate, explicit economic effect; it is not hidden in a single `price` field.
- Quantities whose unit-price multiplication cannot produce an integral minor unit under the applicable rounding policy are rejected. Do not use floating point.
- A parts estimate is not a payment obligation until its responsibility and amount are accepted. A separately owned part creates a separate node/order rather than a pooled line.

Example:

```text
Listing base:                 ₱3,000 customer / ₱3,000 provider payout
Provider's custom bid:        ₱4,800 customer / ₱4,200 provider payout
Included provider subsidy:    none
Reason shown to buyer:        replacement mounting kit + extended load-test scope
```

### 3.3 Deliverables

Deliverables are structured outcome records, not a single paragraph. Each has a stable `deliverable_key` within the Work specification:

```json
{
  "deliverable_key": "verified_load_test",
  "title": "Verified load test",
  "description": "Run the configured load and record readings within the declared tolerance.",
  "quantity": 1,
  "unit": "test",
  "required": true,
  "acceptance_criteria": [
    "Reading is recorded with unit and timestamp",
    "Result is within the declared safe range or exception is documented"
  ],
  "evidence_keys": ["post_test_photo", "load_current_reading"]
}
```

Customization semantics:

- `add` may add a new deliverable if it is supported by the Work shape and does not change an independently payable obligation without a new node.
- `modify` replaces a base deliverable by stable key and records the before/after delta.
- `remove` is allowed only for optional base deliverables. Required source/profile/request deliverables, safety checks, and accepted customer outcomes cannot be removed.
- A material addition to price, timing, parts, or provider identity is a custom term and follows the partner-confirmation rule.
- A deliverable without an acceptance criterion is incomplete for an A1/A3/A9 Work contract unless the shape definition explicitly permits it.

### 3.4 Inclusions and exclusions

Inclusions and exclusions are separate, buyer-visible arrays. Each item has a stable key and plain-language meaning. Avoid values such as `as needed`, `standard work`, or `etc.` as the only description.

```json
{
  "inclusions": [
    {"item_key": "panel_access", "description": "Access and isolate the affected panel circuit"},
    {"item_key": "mounting_hardware", "description": "Supply compatible mounting screws and anchors"}
  ],
  "exclusions": [
    {"item_key": "wall_repair", "description": "Plaster/paint repair after access opening"},
    {"item_key": "new_circuit_run", "description": "Installing a new branch circuit beyond the named repair"}
  ]
}
```

Rules:

- An exclusion cannot negate a required deliverable or safety control.
- If an exclusion means a prerequisite is not supplied, the Work specification MUST name who supplies it and what blocks the dependent phase.
- Any inclusion/exclusion affecting another provider's obligation, the buyer's payment, or a legal/safety condition is a custom term.
- The buyer must acknowledge custom exclusions before acceptance; a hidden provider-only note is not a valid contract.

### 3.5 Parts and materials

`parts_required` expresses physical inputs and responsibility. It does not itself create a second Order.

```json
{
  "part_key": "breaker_20a",
  "name": "20A compatible breaker",
  "specification": "Brand/model compatible with the existing panel",
  "quantity": 1,
  "unit": "piece",
  "responsibility": "provider_supplies",
  "source_node_key": null,
  "included_in_customer_amount": true,
  "required_before_phase": "removal_mounting",
  "substitution_policy": "No substitution without buyer approval"
}
```

Allowed responsibility values are:

- `provider_supplies` — the node provider supplies the part and its cost is explicit in this node's terms;
- `buyer_supplies` — the buyer must supply it under an explicit deadline/specification; or
- `source_node` — another provider/node supplies it. `source_node_key` is required, and a same-proposal dependency gates the consuming phase.

If another provider actually sells the part, the proposal must contain an independent product node and, after acceptance, an independent child Order/payment obligation. A coordinator cannot make a hardware seller disappear inside an electrician's labor bid. If the labor provider truly owns/resells the part and assumes the buyer-facing obligation, it may remain one node, but the terms must say so and must not impersonate the hardware seller.

### 3.6 Workmanship warranty

The provider may offer a workmanship warranty, but it is a provider term, not an automatic platform guarantee:

```json
{
  "kind": "workmanship",
  "duration": {"value": 90, "unit": "days"},
  "starts_on": "customer_signoff",
  "coverage": [
    "Rework of installation defects caused by the provider's workmanship"
  ],
  "exclusions": [
    "Customer modification after sign-off",
    "Damage from external power surge"
  ],
  "remedy": "inspect_and_rework",
  "response_window_hours": 48,
  "parts_warranty": {
    "status": "separate_supplier_or_manufacturer_terms"
  }
}
```

Rules:

- `duration.value` is positive and uses a bounded unit (`hours`, `days`, `months`) defined by the Work contract.
- `starts_on` must name an actual contract event (`completion`, `customer_signoff`, or approved handoff), not a vague calendar assumption.
- Coverage, exclusions, remedy, and response window are shown before acceptance and copied into the accepted terms snapshot.
- A workmanship warranty does not prove completion, payment, or absence of defects. A later claim uses Work/evidence/dispute paths.
- The provider cannot advertise a platform-backed warranty unless a separately approved platform policy and obligation exists.

### 3.7 Other permitted overrides

Depending on the capability profile and request, a provider may customize:

- appointment window, estimated duration, or earliest start;
- service area/route and handoff conditions;
- quantity within available capacity;
- payment-lane choices already allowed by the profile; and
- revision count or review window for A1/A9 work.

These are custom terms when changed from the source. The source/profile remains pinned. Provider identity, Work shape, safety class, required evidence floor, and ownership are not overrideable.

---

## 4. Structured Work Specification model

### 4.1 Design boundary

`proposal_nodes.work_specifications` is a bounded, versioned JSONB contract containing:

- source and profile provenance;
- declared customization patch;
- the server-resolved full Work specification;
- phases and phase dependencies;
- checklist items;
- evidence requirements;
- deliverables/inclusions/exclusions/parts/warranty; and
- completion/readiness policy references.

It contains **requirements**, not runtime status. It MUST NOT contain mutable `completed` flags, fabricated `evidence_file_id` values, payment-release instructions, or a second Order identity.

At contract finalization:

1. the resolved specification is copied into the child Order's immutable `order_terms_snapshots`;
2. the shape/version and resolved payload are copied into `work_instances.structure` with its shape/payload schema versions; and
3. actual progress is recorded in `work_events`, actual files in `evidence_files`, and sign-off through the Work state machine.

The copied Work specification cannot be changed by editing the source listing or profile. An accepted amendment, if later approved, creates a new terms/work version with actor, impact, affected-party approval, and history.

### 4.2 Envelope and JSON contract

The canonical payload shape is:

```json
{
  "schema_version": 1,
  "shape": {
    "code": "A1",
    "contract_version": 1,
    "payload_schema_version": 1
  },
  "source": {
    "kind": "listing_version",
    "listing_id": "uuid",
    "listing_version_id": "uuid",
    "listing_version_number": 3,
    "capability_profile_family_code": "service_listing",
    "capability_profile_business_version": 4,
    "base_terms_hash": "sha256-hex"
  },
  "customization": {
    "deliverables": {
      "add": [],
      "modify": [],
      "remove": []
    },
    "inclusions": {"add": [], "remove": []},
    "exclusions": {"add": [], "remove": []},
    "parts_required": {"add": [], "modify": [], "remove": []},
    "workmanship_warranty": {"mode": "replace", "value": {}},
    "schedule": null,
    "fulfillment": null
  },
  "resolved": {
    "title": "Electrical diagnostics and repair",
    "summary": "Diagnose the named fault, replace the compatible component, and verify safe operation.",
    "deliverables": [],
    "inclusions": [],
    "exclusions": [],
    "parts_required": [],
    "workmanship_warranty": {},
    "phases": [],
    "completion_policy": {}
  }
}
```

The `customization` object is a deterministic patch format, not JSON Merge Patch. Array entries are keyed by stable keys; the resolver rejects duplicate keys, ambiguous replacements, and unknown paths. `resolved` is complete and canonical: a consumer does not have to replay the patch to know what the provider promised.

Required bounded limits SHOULD be enforced by the application/profile validator (for example, maximum phase count, checklist count, evidence count, string lengths, and total serialized bytes). JSONB is not a license to store arbitrary executable policy.

### 4.3 Work phase contract

A phase represents an ordered or explicitly dependent portion of the provider's Work. It is not an Order and not a payment milestone unless a separate Payment Obligation explicitly says so.

Each phase contains:

| Field | Meaning |
| --- | --- |
| `phase_key` | Stable key unique inside the node; referenced by parts, deliverables, and dependencies |
| `ordinal` | Display/execution order; positive and unique |
| `title`/`objective` | Buyer/provider-readable purpose |
| `required` | Whether the phase is required for the node's contracted outcome |
| `depends_on_phase_keys` | Same-node prerequisites; graph must be acyclic |
| `deliverable_keys` | Outcomes produced or verified by the phase |
| `checklist` | Atomic tasks with required/evidence links |
| `evidence_requirements` | Typed facts/files required to propose phase completion or sign-off |
| `readiness_fact` | Optional named fact that can unblock a downstream node transition |
| `acceptance_criteria` | Conditions for the phase's completion proposal |

A phase status is computed by the runtime Work state/event contract. Proposal JSON must not pre-mark a phase complete.

### 4.4 Checklist contract

Checklist items are explicit enough for a provider and buyer to understand what “done” means:

```json
{
  "item_key": "isolate_supply",
  "label": "Isolate and verify the affected supply before removal",
  "required": true,
  "actor_role": "provider",
  "evidence_keys": ["isolation_photo", "voltage_reading_before_work"],
  "acceptance_criteria": [
    "Isolation point is identified",
    "Reading is recorded as zero or within the safe state required by the profile"
  ]
}
```

A checklist item may be marked not-applicable only through an explicit provider/buyer/admin decision under the Work contract, with reason and audit event. A missing item is not silently considered complete because a later phase was attempted.

### 4.5 Evidence requirement contract

Evidence requirements describe what must be captured; they do not create evidence. Supported `kind` values are bounded by the profile registry, with the initial set:

- `photo`;
- `video`;
- `measurement`;
- `document`;
- `receipt`;
- `signature`; and
- `location`.

Example:

```json
{
  "evidence_key": "load_current_reading",
  "kind": "measurement",
  "required": true,
  "capture_stage": "load_testing_signoff",
  "subject": "installed_component_under_declared_load",
  "min_count": 1,
  "data_class": "operational",
  "measurement": {
    "metric": "current",
    "unit": "A",
    "minimum": 0,
    "maximum": 20,
    "precision": 2,
    "tolerance_note": "Use the profile's approved safe range"
  }
}
```

Rules:

- Measurement requirements use a numeric metric/unit/range/precision contract; a free-form “take a reading” is not executable evidence policy.
- A photo requirement states subject and capture stage; a file existing in storage is not automatically valid evidence.
- The runtime validates uploader/actor, subject Order/Work, media scan/quarantine state, timestamp, visibility, and retention policy.
- Evidence required for completion is distinct from evidence that merely supports a readiness/handoff fact.
- A missing or withdrawn evidence item blocks only the named phase/transition. It does not silently cancel sibling Orders or authorize payment.

### 4.6 Example: electrical diagnostics and repair

The provider starts from their listing *Electrical Diagnostics & Repair*, but tailors the bid to the request's named breaker fault. The listing version supplies the A1 shape and base safety contract. The provider overrides price, adds a mounting deliverable, names the replacement part, excludes wall repair, and offers a workmanship warranty.

```json
{
  "schema_version": 1,
  "shape": {"code": "A1", "contract_version": 1, "payload_schema_version": 1},
  "source": {
    "kind": "listing_version",
    "listing_id": "11111111-1111-7111-8111-111111111111",
    "listing_version_id": "22222222-2222-7222-8222-222222222222",
    "listing_version_number": 3,
    "capability_profile_family_code": "service_listing",
    "capability_profile_business_version": 4,
    "base_terms_hash": "sha256:base-listing-terms"
  },
  "customization": {
    "pricing": {
      "base_customer_unit_minor": 300000,
      "customer_unit_minor": 480000,
      "reason": "Replacement mounting kit and extended load verification"
    },
    "deliverables": {
      "add": [
        {
          "deliverable_key": "verified_load_test",
          "title": "Verified load test",
          "description": "Run the configured load and record readings within the declared tolerance.",
          "quantity": 1,
          "unit": "test",
          "required": true,
          "acceptance_criteria": ["Reading and result are recorded"],
          "evidence_keys": ["post_test_photo", "load_current_reading"]
        }
      ],
      "modify": [],
      "remove": []
    },
    "inclusions": {
      "add": [
        {"item_key": "compatible_mounting_kit", "description": "Compatible mounting screws and anchors"}
      ],
      "remove": []
    },
    "exclusions": {
      "add": [
        {"item_key": "wall_repair", "description": "Plaster/paint repair after access opening"}
      ],
      "remove": []
    },
    "parts_required": {
      "add": [
        {
          "part_key": "breaker_20a",
          "name": "20A compatible breaker",
          "specification": "Compatible with the existing panel",
          "quantity": 1,
          "unit": "piece",
          "responsibility": "provider_supplies",
          "included_in_customer_amount": true,
          "required_before_phase": "removal_mounting"
        }
      ],
      "modify": [],
      "remove": []
    },
    "workmanship_warranty": {
      "mode": "replace",
      "value": {
        "kind": "workmanship",
        "duration": {"value": 90, "unit": "days"},
        "starts_on": "customer_signoff",
        "coverage": ["Rework of installation defects caused by provider workmanship"],
        "exclusions": ["Customer modification", "External power surge"],
        "remedy": "inspect_and_rework",
        "response_window_hours": 48
      }
    }
  },
  "resolved": {
    "title": "Electrical diagnostics and repair — named breaker fault",
    "summary": "Diagnose the fault, safely replace the compatible breaker, and verify operation.",
    "deliverables": [
      {
        "deliverable_key": "diagnostic_report",
        "title": "Diagnostic report",
        "description": "Identify the fault and record before-work readings.",
        "quantity": 1,
        "unit": "report",
        "required": true,
        "acceptance_criteria": ["Fault and readings are recorded"],
        "evidence_keys": ["before_panel_photo", "voltage_reading_before_work"]
      },
      {
        "deliverable_key": "component_mounted",
        "title": "Compatible replacement mounted",
        "description": "Remove the faulty component and mount the approved replacement.",
        "quantity": 1,
        "unit": "installation",
        "required": true,
        "acceptance_criteria": ["Component is secure and wiring is restored"],
        "evidence_keys": ["mounted_component_photo"]
      },
      {
        "deliverable_key": "verified_load_test",
        "title": "Verified load test",
        "description": "Run the configured load and record readings within the declared tolerance.",
        "quantity": 1,
        "unit": "test",
        "required": true,
        "acceptance_criteria": ["Reading and result are recorded"],
        "evidence_keys": ["post_test_photo", "load_current_reading"]
      }
    ],
    "inclusions": [
      {"item_key": "diagnostic_readings", "description": "Before and after electrical readings"},
      {"item_key": "compatible_mounting_kit", "description": "Compatible mounting screws and anchors"}
    ],
    "exclusions": [
      {"item_key": "wall_repair", "description": "Plaster/paint repair after access opening"},
      {"item_key": "new_circuit_run", "description": "New branch circuit beyond the named repair"}
    ],
    "parts_required": [
      {
        "part_key": "breaker_20a",
        "name": "20A compatible breaker",
        "specification": "Compatible with the existing panel",
        "quantity": 1,
        "unit": "piece",
        "responsibility": "provider_supplies",
        "included_in_customer_amount": true,
        "required_before_phase": "removal_mounting"
      }
    ],
    "workmanship_warranty": {
      "kind": "workmanship",
      "duration": {"value": 90, "unit": "days"},
      "starts_on": "customer_signoff",
      "coverage": ["Rework of installation defects caused by provider workmanship"],
      "exclusions": ["Customer modification", "External power surge"],
      "remedy": "inspect_and_rework",
      "response_window_hours": 48
    },
    "phases": [
      {
        "phase_key": "diagnostic",
        "ordinal": 1,
        "title": "Diagnostic",
        "objective": "Identify the fault and establish safe before-work readings.",
        "required": true,
        "depends_on_phase_keys": [],
        "deliverable_keys": ["diagnostic_report"],
        "checklist": [
          {
            "item_key": "isolate_supply",
            "label": "Isolate and verify the affected supply before removal",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["before_panel_photo", "voltage_reading_before_work"]
          },
          {
            "item_key": "identify_fault",
            "label": "Identify the named breaker fault and compatible replacement",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["diagnostic_note"]
          }
        ],
        "evidence_requirements": [
          {
            "evidence_key": "before_panel_photo",
            "kind": "photo",
            "required": true,
            "capture_stage": "diagnostic",
            "subject": "affected_panel_before_work",
            "min_count": 1
          },
          {
            "evidence_key": "voltage_reading_before_work",
            "kind": "measurement",
            "required": true,
            "capture_stage": "diagnostic",
            "subject": "isolated_affected_circuit",
            "min_count": 1,
            "measurement": {"metric": "voltage", "unit": "V", "minimum": 0, "maximum": 1, "precision": 2}
          },
          {
            "evidence_key": "diagnostic_note",
            "kind": "document",
            "required": true,
            "capture_stage": "diagnostic",
            "subject": "fault_finding_note",
            "min_count": 1
          }
        ],
        "readiness_fact": null,
        "acceptance_criteria": ["Fault and safe isolation state are documented"]
      },
      {
        "phase_key": "removal_mounting",
        "ordinal": 2,
        "title": "Removal & Mounting",
        "objective": "Remove the faulty component and mount the compatible replacement.",
        "required": true,
        "depends_on_phase_keys": ["diagnostic"],
        "deliverable_keys": ["component_mounted"],
        "checklist": [
          {
            "item_key": "part_available",
            "label": "Verify the approved breaker is available before removal",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["part_photo"]
          },
          {
            "item_key": "mount_component",
            "label": "Remove the faulty component and secure the replacement",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["mounted_component_photo"]
          }
        ],
        "evidence_requirements": [
          {
            "evidence_key": "part_photo",
            "kind": "photo",
            "required": true,
            "capture_stage": "removal_mounting",
            "subject": "approved_replacement_part",
            "min_count": 1
          },
          {
            "evidence_key": "mounted_component_photo",
            "kind": "photo",
            "required": true,
            "capture_stage": "removal_mounting",
            "subject": "mounted_replacement_component",
            "min_count": 1
          }
        ],
        "readiness_fact": {
          "code": "ready_for_load_testing",
          "meaning": "Replacement is mounted and safe for the next named test step"
        },
        "acceptance_criteria": ["Replacement is mounted and the work area is safe for testing"]
      },
      {
        "phase_key": "load_testing_signoff",
        "ordinal": 3,
        "title": "Load Testing & Sign-off",
        "objective": "Verify operation under the declared load and present the result for sign-off.",
        "required": true,
        "depends_on_phase_keys": ["removal_mounting"],
        "deliverable_keys": ["verified_load_test"],
        "checklist": [
          {
            "item_key": "run_load_test",
            "label": "Run the configured load test and capture current/voltage readings",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["post_test_photo", "load_current_reading"]
          },
          {
            "item_key": "present_signoff",
            "label": "Present result, warranty, inclusions, and exclusions for customer sign-off",
            "required": true,
            "actor_role": "provider",
            "evidence_keys": ["customer_signoff"]
          }
        ],
        "evidence_requirements": [
          {
            "evidence_key": "post_test_photo",
            "kind": "photo",
            "required": true,
            "capture_stage": "load_testing_signoff",
            "subject": "tested_installed_component",
            "min_count": 1
          },
          {
            "evidence_key": "load_current_reading",
            "kind": "measurement",
            "required": true,
            "capture_stage": "load_testing_signoff",
            "subject": "installed_component_under_declared_load",
            "min_count": 1,
            "measurement": {"metric": "current", "unit": "A", "minimum": 0, "maximum": 20, "precision": 2}
          },
          {
            "evidence_key": "customer_signoff",
            "kind": "signature",
            "required": true,
            "capture_stage": "load_testing_signoff",
            "subject": "customer_acceptance_of_work_result",
            "min_count": 1
          }
        ],
        "readiness_fact": null,
        "acceptance_criteria": ["Required readings and sign-off are captured or an authorized exception is recorded"]
      }
    ],
    "completion_policy": {
      "required_phase_keys": ["diagnostic", "removal_mounting", "load_testing_signoff"],
      "completion_proposal_requires": ["all_required_checklist_items", "all_required_evidence", "provider_completion_proposal"],
      "customer_signoff_required": true,
      "payment_release_trigger": "separate_payment_obligation_policy"
    }
  }
}
```

The `ready_for_load_testing` fact may unblock a named next phase or, in a multi-node plan, a courier/inspection node. It does not mark the node's Order completed and cannot by itself release a payment obligation.

### 4.7 Shape-specific requirements

The profile registry validates the payload against the pinned Work shape:

- **A1 Linear Project:** phases/deliverables/checklists, progress evidence, revision rules, completion proposal, and sign-off.
- **A3 Appointment:** slot, attendance/no-show, safety context, service evidence, and sign-off; phases may be appointment stages but cannot invent dispatch semantics.
- **A4 Handoff:** preparation/readiness, capacity/sourcing, custody/handoff, receipt/acceptance, mismatch/variance evidence; `ready_for_collection` remains separate from delivered/completed.
- **A9 Digital Delivery:** artifact/version, secure access, delivery event, revisions/acceptance, and retention/deletion.

A node cannot change its Work shape merely by editing `work_specifications`. The pinned capability profile and shape contract must agree.

---

## 5. PostgreSQL data schema

### 5.1 Storage conventions

The schema follows the canonical implementation contract:

- native application-generated UUIDv7 identifiers;
- `TEXT` plus named `CHECK` constraints for lifecycle values rather than mutable PostgreSQL business enums;
- `TIMESTAMPTZ` in UTC;
- integer minor-unit money plus `CHAR(3)` currency;
- append-only audit/outbox/idempotency records;
- `ON DELETE RESTRICT` for proposal/source/history references;
- immutable business versions plus mutable `row_version` for optimistic concurrency; and
- versioned bounded JSONB with application/profile validation.

The existing repository's canonical `listing_versions` table has `id` as its primary key and `(listing_id, version_number)` as a unique key. The source identity trigger below still verifies that the separately stored `source_listing_id` belongs to the referenced version. If the migration wants a declarative composite foreign key, it may add a non-partial candidate key `UNIQUE (id, listing_id)` first.

### 5.2 `proposals` — bid lineage and root source

`proposals.source_listing_version_id` is the root/lead source convenience link requested by this specification. It is not a substitute for each node's source link; every node repeats its own exact source identity.

```sql
CREATE TABLE proposals (
    id                                      uuid PRIMARY KEY,
    request_id                              uuid NOT NULL
        REFERENCES requests(id) ON DELETE RESTRICT,
    lead_provider_user_id                   uuid NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    -- Root provenance for the lead provider's bid.
    source_kind                             text NOT NULL,
    source_listing_id                       uuid NULL
        REFERENCES listings(id) ON DELETE RESTRICT,
    source_listing_version_id               uuid NULL
        REFERENCES listing_versions(id) ON DELETE RESTRICT,
    source_capability_profile_family_code   text NULL,
    source_capability_profile_business_version integer NULL,
    source_capability_activation_id         uuid NULL
        REFERENCES capability_activations(id) ON DELETE RESTRICT,

    proposal_kind                           text NOT NULL,
    status                                  text NOT NULL DEFAULT 'draft',
    gate_status                             text NOT NULL DEFAULT 'not_required',
    current_version_id                      uuid NULL,
    row_version                             integer NOT NULL DEFAULT 1,
    correlation_id                          uuid NOT NULL,
    created_by_user_id                      uuid NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    created_at                              timestamptz NOT NULL DEFAULT now(),
    updated_at                              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ck_proposals_source_kind
        CHECK (source_kind IN ('listing_version', 'capability_profile')),
    CONSTRAINT ck_proposals_source_pair
        CHECK (
            (source_listing_id IS NULL AND source_listing_version_id IS NULL)
            OR (source_listing_id IS NOT NULL AND source_listing_version_id IS NOT NULL)
        ),
    CONSTRAINT ck_proposals_source_profile_pair
        CHECK (
            (source_capability_profile_family_code IS NULL
             AND source_capability_profile_business_version IS NULL)
            OR (source_capability_profile_family_code IS NOT NULL
                AND btrim(source_capability_profile_family_code) <> ''
                AND source_capability_profile_business_version IS NOT NULL
                AND source_capability_profile_business_version > 0)
        ),
    CONSTRAINT ck_proposals_source_shape
        CHECK (
            (
                source_kind = 'listing_version'
                AND source_listing_id IS NOT NULL
                AND source_listing_version_id IS NOT NULL
                AND source_capability_profile_family_code IS NOT NULL
                AND source_capability_profile_business_version IS NOT NULL
            )
            OR (
                source_kind = 'capability_profile'
                AND source_listing_id IS NULL
                AND source_listing_version_id IS NULL
                AND source_capability_profile_family_code IS NOT NULL
                AND source_capability_profile_business_version IS NOT NULL
                AND source_capability_activation_id IS NOT NULL
            )
        ),
    CONSTRAINT ck_proposals_status
        CHECK (status IN (
            'draft', 'proposed', 'countered', 'accepted', 'locked',
            'withdrawn', 'expired', 'rejected', 'superseded'
        )),
    CONSTRAINT ck_proposals_gate_status
        CHECK (gate_status IN (
            'not_required', 'pending_partner_confirmation', 'ready', 'blocked', 'expired'
        )),
    CONSTRAINT ck_proposals_row_version CHECK (row_version > 0),
    CONSTRAINT ck_proposals_source_profile_activation
        CHECK (
            source_kind <> 'capability_profile'
            OR source_capability_activation_id IS NOT NULL
        )
);

ALTER TABLE proposals
    ADD CONSTRAINT fk_proposals_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES proposal_versions(id)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_proposals_request_status
    ON proposals (request_id, status, updated_at DESC);
CREATE INDEX idx_proposals_lead_provider_status
    ON proposals (lead_provider_user_id, status, updated_at DESC);
CREATE INDEX idx_proposals_source_listing_version
    ON proposals (source_listing_version_id)
    WHERE source_listing_version_id IS NOT NULL;
CREATE INDEX idx_proposals_source_profile
    ON proposals (source_capability_profile_family_code, source_capability_profile_business_version)
    WHERE source_capability_profile_family_code IS NOT NULL;
```

`proposal_kind` is a stored classification for comparison/read models, not a client-controlled shortcut. The command derives and validates it from nodes; node count alone must not be used by the frontend to infer it.

### 5.3 `proposal_versions` — immutable proposal snapshots

```sql
CREATE TABLE proposal_versions (
    id                          uuid PRIMARY KEY,
    proposal_id                uuid NOT NULL
        REFERENCES proposals(id) ON DELETE RESTRICT,
    version_no                 integer NOT NULL,
    based_on_version_id        uuid NULL,
    authored_by_user_id        uuid NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    status                     text NOT NULL,
    gate_status                text NOT NULL DEFAULT 'not_required',

    currency                   char(3) NOT NULL,
    total_customer_minor      bigint NOT NULL CHECK (total_customer_minor >= 0),
    total_provider_minor      bigint NOT NULL CHECK (total_provider_minor >= 0),
    total_discount_minor      bigint NOT NULL DEFAULT 0
        CHECK (total_discount_minor >= 0),
    terms_snapshot             jsonb NOT NULL,
    terms_payload_version      integer NOT NULL DEFAULT 1,
    terms_hash                 bytea NOT NULL,
    valid_until                timestamptz NULL,

    row_version                integer NOT NULL DEFAULT 1,
    proposed_at                timestamptz NOT NULL DEFAULT now(),
    accepted_at                timestamptz NULL,
    locked_at                  timestamptz NULL,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now(),

    UNIQUE (proposal_id, version_no),
    UNIQUE (id, proposal_id),
    CONSTRAINT ck_proposal_versions_version_no CHECK (version_no > 0),
    CONSTRAINT ck_proposal_versions_row_version CHECK (row_version > 0),
    CONSTRAINT ck_proposal_versions_terms_version CHECK (terms_payload_version > 0),
    CONSTRAINT ck_proposal_versions_terms_object
        CHECK (jsonb_typeof(terms_snapshot) = 'object'),
    CONSTRAINT ck_proposal_versions_status
        CHECK (status IN (
            'draft', 'proposed', 'countered', 'accepted', 'locked',
            'withdrawn', 'expired', 'rejected', 'superseded'
        )),
    CONSTRAINT ck_proposal_versions_gate_status
        CHECK (gate_status IN (
            'not_required', 'pending_partner_confirmation', 'ready', 'blocked', 'expired'
        )),
    CONSTRAINT fk_proposal_versions_based_on_same_lineage
        FOREIGN KEY (based_on_version_id, proposal_id)
        REFERENCES proposal_versions(id, proposal_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_proposal_versions_one_active
    ON proposal_versions (proposal_id)
    WHERE status IN ('proposed', 'countered', 'accepted');

CREATE INDEX idx_proposal_versions_status_expiry
    ON proposal_versions (proposal_id, status, valid_until);
CREATE INDEX idx_proposal_versions_gate_status
    ON proposal_versions (gate_status, updated_at);
```

The application must supersede/counter the current active version before creating another active version, or use a controlled transaction/stored procedure. A unique partial index is a backstop, not a substitute for the command's locking/version protocol.

### 5.4 `proposal_nodes` — source-pinned independent outcomes

```sql
CREATE TABLE proposal_nodes (
    id                                      uuid PRIMARY KEY,
    proposal_version_id                     uuid NOT NULL
        REFERENCES proposal_versions(id) ON DELETE RESTRICT,
    node_key                                text NOT NULL,
    ordinal                                 integer NOT NULL,
    node_type                               text NOT NULL,
    provider_user_id                        uuid NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    source_kind                             text NOT NULL,
    source_listing_id                       uuid NULL
        REFERENCES listings(id) ON DELETE RESTRICT,
    source_listing_version_id               uuid NULL
        REFERENCES listing_versions(id) ON DELETE RESTRICT,
    source_capability_profile_family_code   text NULL,
    source_capability_profile_business_version integer NULL,
    source_capability_activation_id         uuid NULL
        REFERENCES capability_activations(id) ON DELETE RESTRICT,

    pricing_mode                            text NOT NULL,
    partner_confirmation_status             text NOT NULL DEFAULT 'not_required',
    quantity                                numeric(18,6) NOT NULL,
    unit                                    text NOT NULL,
    currency                                char(3) NOT NULL,
    customer_unit_minor                     bigint NOT NULL CHECK (customer_unit_minor >= 0),
    customer_total_minor                    bigint NOT NULL CHECK (customer_total_minor >= 0),
    provider_payout_minor                   bigint NOT NULL CHECK (provider_payout_minor >= 0),
    discount_minor                          bigint NOT NULL DEFAULT 0
        CHECK (discount_minor >= 0),
    discount_funder_provider_user_id        uuid NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    work_shape                              text NOT NULL,
    shape_contract_version                  integer NOT NULL DEFAULT 1,
    payload_schema_version                  integer NOT NULL DEFAULT 1,
    schedule_constraints                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    schedule_payload_version                integer NOT NULL DEFAULT 1,
    fulfillment_terms                      jsonb NOT NULL DEFAULT '{}'::jsonb,
    fulfillment_payload_version             integer NOT NULL DEFAULT 1,

    -- Exact source material and the provider's declared delta.
    source_terms_snapshot                   jsonb NOT NULL,
    source_terms_payload_version            integer NOT NULL DEFAULT 1,
    customization                         jsonb NOT NULL DEFAULT '{}'::jsonb,
    customization_payload_version          integer NOT NULL DEFAULT 1,
    work_specifications                     jsonb NOT NULL,
    work_specification_schema_version       integer NOT NULL DEFAULT 1,
    work_specification_hash                 bytea NOT NULL,
    terms_snapshot                          jsonb NOT NULL,
    terms_payload_version                   integer NOT NULL DEFAULT 1,
    terms_hash                              bytea NOT NULL,

    valid_until                             timestamptz NULL,
    created_at                              timestamptz NOT NULL DEFAULT now(),
    updated_at                              timestamptz NOT NULL DEFAULT now(),

    UNIQUE (proposal_version_id, node_key),
    UNIQUE (proposal_version_id, ordinal),
    UNIQUE (id, proposal_version_id),

    CONSTRAINT ck_proposal_nodes_node_key
        CHECK (btrim(node_key) <> ''),
    CONSTRAINT ck_proposal_nodes_ordinal CHECK (ordinal > 0),
    CONSTRAINT ck_proposal_nodes_quantity CHECK (quantity > 0),
    CONSTRAINT ck_proposal_nodes_unit CHECK (btrim(unit) <> ''),
    CONSTRAINT ck_proposal_nodes_source_kind
        CHECK (source_kind IN ('listing_version', 'capability_profile')),
    CONSTRAINT ck_proposal_nodes_source_pair
        CHECK (
            (source_listing_id IS NULL AND source_listing_version_id IS NULL)
            OR (source_listing_id IS NOT NULL AND source_listing_version_id IS NOT NULL)
        ),
    CONSTRAINT ck_proposal_nodes_source_profile_pair
        CHECK (
            (source_capability_profile_family_code IS NULL
             AND source_capability_profile_business_version IS NULL)
            OR (source_capability_profile_family_code IS NOT NULL
                AND btrim(source_capability_profile_family_code) <> ''
                AND source_capability_profile_business_version IS NOT NULL
                AND source_capability_profile_business_version > 0)
        ),
    CONSTRAINT ck_proposal_nodes_source_shape
        CHECK (
            (
                source_kind = 'listing_version'
                AND source_listing_id IS NOT NULL
                AND source_listing_version_id IS NOT NULL
                AND source_capability_profile_family_code IS NOT NULL
                AND source_capability_profile_business_version IS NOT NULL
            )
            OR (
                source_kind = 'capability_profile'
                AND source_listing_id IS NULL
                AND source_listing_version_id IS NULL
                AND source_capability_profile_family_code IS NOT NULL
                AND source_capability_profile_business_version IS NOT NULL
                AND source_capability_activation_id IS NOT NULL
            )
        ),
    CONSTRAINT ck_proposal_nodes_pricing_mode
        CHECK (pricing_mode IN ('catalog_reference', 'custom_terms', 'own_quote')),
    CONSTRAINT ck_proposal_nodes_catalog_source
        CHECK (pricing_mode <> 'catalog_reference' OR source_kind = 'listing_version'),
    CONSTRAINT ck_proposal_nodes_partner_status
        CHECK (partner_confirmation_status IN (
            'not_required', 'pending', 'accepted', 'declined',
            'countered', 'expired', 'cancelled'
        )),
    CONSTRAINT ck_proposal_nodes_work_shape
        CHECK (work_shape IN ('A1', 'A3', 'A4', 'A9')),
    CONSTRAINT ck_proposal_nodes_contract_versions
        CHECK (
            shape_contract_version > 0
            AND payload_schema_version > 0
            AND schedule_payload_version > 0
            AND fulfillment_payload_version > 0
            AND source_terms_payload_version > 0
            AND customization_payload_version > 0
            AND work_specification_schema_version > 0
            AND terms_payload_version > 0
        ),
    CONSTRAINT ck_proposal_nodes_json_objects
        CHECK (
            jsonb_typeof(source_terms_snapshot) = 'object'
            AND jsonb_typeof(customization) = 'object'
            AND jsonb_typeof(work_specifications) = 'object'
            AND jsonb_typeof(terms_snapshot) = 'object'
        )
);

CREATE INDEX idx_proposal_nodes_source_listing_version
    ON proposal_nodes (source_listing_version_id)
    WHERE source_listing_version_id IS NOT NULL;
CREATE INDEX idx_proposal_nodes_provider_status
    ON proposal_nodes (provider_user_id, proposal_version_id);
CREATE INDEX idx_proposal_nodes_source_profile
    ON proposal_nodes (source_capability_profile_family_code, source_capability_profile_business_version)
    WHERE source_capability_profile_family_code IS NOT NULL;
CREATE INDEX idx_proposal_nodes_partner_gate
    ON proposal_nodes (partner_confirmation_status, proposal_version_id);
```

`source_terms_snapshot` is the bounded, immutable base snapshot used to resolve the node. `customization` is the normalized provider delta. `work_specifications` is the full resolved contract. `terms_snapshot` is the node's complete commercial/operational snapshot used for acceptance. The command computes all four; clients cannot set hashes or authoritative totals.

### 5.5 `proposal_node_edges` — named dependencies

The edge table is optional for a standalone proposal but required for a multi-node plan with a cross-node part/handoff gate. Edges must be version-local and acyclic.

```sql
CREATE TABLE proposal_node_edges (
    proposal_version_id             uuid NOT NULL
        REFERENCES proposal_versions(id) ON DELETE RESTRICT,
    from_node_id                    uuid NOT NULL,
    to_node_id                      uuid NOT NULL,
    relationship_type               text NOT NULL DEFAULT 'blocks',
    condition_code                  text NOT NULL,
    condition_payload_version       integer NOT NULL DEFAULT 1,
    status                          text NOT NULL DEFAULT 'active',
    created_at                      timestamptz NOT NULL DEFAULT now(),
    removed_at                      timestamptz NULL,

    PRIMARY KEY (proposal_version_id, from_node_id, to_node_id),
    CONSTRAINT fk_proposal_edges_from_same_version
        FOREIGN KEY (from_node_id, proposal_version_id)
        REFERENCES proposal_nodes(id, proposal_version_id) ON DELETE RESTRICT,
    CONSTRAINT fk_proposal_edges_to_same_version
        FOREIGN KEY (to_node_id, proposal_version_id)
        REFERENCES proposal_nodes(id, proposal_version_id) ON DELETE RESTRICT,
    CONSTRAINT ck_proposal_edges_distinct
        CHECK (from_node_id <> to_node_id),
    CONSTRAINT ck_proposal_edges_type
        CHECK (relationship_type = 'blocks'),
    CONSTRAINT ck_proposal_edges_condition
        CHECK (btrim(condition_code) <> '' AND condition_payload_version > 0),
    CONSTRAINT ck_proposal_edges_status
        CHECK (status IN ('active', 'removed', 'superseded'))
);

CREATE UNIQUE INDEX uq_proposal_edges_active
    ON proposal_node_edges (proposal_version_id, from_node_id, to_node_id, relationship_type)
    WHERE status = 'active';
CREATE INDEX idx_proposal_edges_target
    ON proposal_node_edges (to_node_id, status);
```

The condition catalog must define the source fact, owning authority, target transition, accepted contract/profile version, revocation behavior, and missing-proof behavior. A free-form `condition_code` alone is not executable policy. Cycle validation runs under the proposal/chain lock in the command transaction and is backed by a deferred trigger/reachability check as the Deal-Chaining contract requires.

### 5.6 Cross-table validations that are not row `CHECK`s

The following checks MUST be implemented in a command function and/or deferred constraint trigger. They cannot be made safe by trusting client fields:

1. **Source membership:** `source_listing_version_id` belongs to `source_listing_id`.
2. **Source owner:** listing owner equals node provider; root listing owner equals lead provider.
3. **Source/profile pin:** listing version's category/profile business pins equal the node's copied profile pins and `work_shape`.
4. **Profile identity:** profile family/business version resolves to one immutable `capability_profiles` row.
5. **Provider activation:** profile-only source activation matches provider, profile/version, effective range, environment/geography/mechanism, and enabled decision.
6. **Listing policy:** external listing use is `STANDARD_AUTO_BIND` only for an unchanged catalog node; all custom external terms have a pending partner confirmation.
7. **Catalog equality:** a `catalog_reference` node's price, currency, quantity, unit, schedule, fulfillment terms, and resolved Work spec equal the source version's allowed terms.
8. **Customization legality:** every override path is permitted by the profile and request; mandatory source/profile safety/evidence requirements remain present.
9. **Totals:** node totals equal the server-calculated quantity/price/discount/fee result and package totals equal the sum of mandatory node amounts in one currency.
10. **Root source occurrence:** if a proposal root source is present, at least one node in its active version references that exact source and provider.
11. **Graph integrity:** edge endpoints belong to the same proposal version and are acyclic.
12. **Invitation gate:** a proposal cannot become buyer-acceptable while any required custom external node is pending/declined/expired.
13. **Version freshness:** all nodes/edges/invitations accepted together belong to the proposal's current active version.

PostgreSQL's row `CHECK` constraints remain valuable for local shape, positivity, pairing, and enumerated values. Cross-row/source checks use foreign keys, unique/partial indexes, command locks, and deferred triggers. This avoids the unsafe pattern of a `CHECK` expression that queries mutable rows.

### 5.7 Hash and snapshot contract

Use one canonical serialization routine for all hashes:

```text
canonical JSON (UTF-8, sorted object keys, deterministic number/string forms)
→ SHA-256
→ bytea
```

- `source_terms_hash` covers the source identity plus bounded source snapshot.
- `work_specification_hash` covers the schema version, source identity, customization, and resolved Work specification.
- `terms_hash` covers the complete node terms snapshot, economics, source hashes, and policy versions.
- `proposal_versions.terms_hash` covers the ordered node/edge/invitation package snapshot and totals.

Hashes are integrity identifiers, not secrets and not authorization. The server recomputes them on write and at acceptance; a mismatch is a conflict.

### 5.8 Relationship to existing schema

This proposal layer reuses the canonical entities rather than replacing them:

```text
requests
  └── proposals
       └── proposal_versions
            ├── proposal_nodes ── source listing_versions/listings or capability_profiles
            ├── proposal_node_edges
            └── partner_invitations (custom external terms only)

accepted proposal version
  └── contracts
       └── orders (one per billable proposal node)
            ├── order_terms_snapshots (immutable resolved terms + Work spec/hash)
            ├── work_instances (resolved Work spec copied into structure)
            ├── work_events / evidence_files
            └── payment_obligations (one-to-one with each child Order as applicable)
```

The existing `quotes` table remains the ordinary Request/Quote response boundary where that flow is used. If implementation maps a provider quote into this proposal model, it must choose one canonical persistence path and preserve source/version/customization fields; two competing proposal/quote truths are prohibited.

---

## 6. Lifecycle and command behavior

### 6.1 Proposal/version lifecycle

Use lower-case state values consistent with the canonical repository contracts.

| Current | Command/event | Next | Guard/effect |
| --- | --- | --- | --- |
| `draft` | `submit_proposal` | `proposed` | Source, profile, Work spec, totals, request, and required fields valid |
| `proposed` | `create_counteroffer` | `countered` | New immutable version; old active version superseded/countered atomically |
| `proposed`/`countered` | `withdraw_proposal` | `withdrawn` | Authorized provider; history retained |
| `proposed`/`countered` | `expire_proposal` | `expired` | `valid_until` reached; pending invitations/temporary gates resolved |
| `proposed`/`countered` | `accept_proposal` | `accepted` | Buyer accepts current version; all gates/source/capacity revalidated |
| `accepted` | `lock_proposal` | `locked` | Finalization creates contract and child Orders in one transaction |
| any active nonterminal | `reject_proposal` | `rejected` | Authorized buyer/admin; reason required |

`proposals.status` is a lineage/read-model summary. `proposal_versions.status` and `proposal_nodes.partner_confirmation_status` are authoritative for version/node gates. The frontend cannot set any status directly.

### 6.2 Commands

#### `start_proposal`

Inputs: request ID, provider actor/acting-for context, source kind and exact source identity, idempotency key, correlation ID.

Actions:

1. Lock/re-read the Request and verify it is publishable and visible to this provider.
2. Resolve the exact listing version or profile business version through the Listings/catalog seam.
3. Verify owner/activation/source policy.
4. Materialize a bounded `source_terms_snapshot` and profile pins.
5. Create a draft `proposals` row and draft `proposal_versions` row; no capacity reservation and no child Order.

#### `customize_proposal`

Inputs: draft version ID, expected version, explicit override patch, idempotency key.

Actions:

1. Validate patch paths against the profile's Work schema and source terms.
2. Resolve deliverables/inclusions/exclusions/parts/warranty/phases server-side.
3. Calculate customer/payout economics server-side.
4. Set `pricing_mode` and partner gate according to actual delta.
5. Store source snapshot, customization patch, resolved Work spec, terms snapshot, and hashes.
6. Reject unsafe removals, unknown phase/evidence kinds, duplicate keys, cyclic phase dependencies, unsupported shape/version, or source-less fields.

#### `submit_proposal`

Actions:

- Freeze the submitted version for ordinary mutation.
- Recompute hashes and totals.
- For an unchanged external `STANDARD_AUTO_BIND` node: leave `partner_confirmation_status = not_required`; do not notify that provider and do not create an invitation.
- For custom external terms: create one invitation for the exact node/version, set `pending_partner_confirmation`, and notify only the affected partner with minimum necessary information.
- For a profile-only node: verify provider activation; no partner invitation is needed because the bidding provider is the contract party.

#### `respond_to_partner_invitation`

A partner accepts the exact proposed terms or declines/counters. A counter requires a new proposal version; editing the existing node after partner acceptance is prohibited. Invitation acceptance is not itself an Order.

#### `accept_proposal`

In one guarded transaction:

1. Lock the Request, proposal lineage, current proposal version, node rows, source rows, relevant capacity, and invitation rows in the documented order.
2. Revalidate Request state/expiry, source listing policy/version/effective dates, provider status, profile activation, Work contract versions, terms hashes, capacity, schedule, and all invitation decisions.
3. Reject with a conflict if a source changed and the old exact version is no longer valid; never silently update the price/scope.
4. Create one contract and one ordinary child Order per billable node, with each node's complete terms snapshot and Work specification.
5. Create one payment obligation per child Order as allowed by the separate payment-lane contract. Do not create a parent payment obligation or pooled escrow.
6. Create audit/outbox/idempotency records in the same transaction.

#### `record_work_progress` / `record_readiness` / `propose_completion`

These commands operate on the accepted Work Instance and its shape registry, not on the proposal JSON. Required checklist/evidence is evaluated against the copied Work specification. A readiness event may unblock a named phase/node dependency; it does not complete the Order or authorize payment.

### 6.3 Standard versus custom source behavior

| Source/terms | Proposal gate | Speculation notification | Acceptance effect |
| --- | --- | --- | --- |
| Own listing, unchanged | `not_required` | Lead provider only | Child Order to listing owner after buyer acceptance |
| External listing, exact `STANDARD_AUTO_BIND` terms | `not_required` | No partner notification at proposal time | Contract finalization creates partner's independent child Order and notification |
| External listing, changed price/scope/schedule/parts/warranty | `pending_partner_confirmation` | Exact partner invitation only | Buyer acceptance blocked until partner accepts exact version |
| Profile-only provider capability | `not_required` (subject to activation) | Bidding provider only | Child Order to activated provider after buyer acceptance |
| Unsupported/expired/withdrawn source | `blocked`/`expired` | No false availability notice | New source/version required |

### 6.4 Work and Order transfer

At finalization, the Work creation adapter MUST copy:

```text
proposal_nodes.work_shape
proposal_nodes.shape_contract_version
proposal_nodes.payload_schema_version
proposal_nodes.work_specifications.resolved
proposal_nodes.work_specification_hash
```

to the accepted child Order's `work_instances`/`order_terms_snapshots`. It must also retain source listing/profile IDs and `terms_hash`. The adapter resolves the Work contract from the pinned capability profile, not from listing type or node display text.

A failed finalization rolls back every effect, including Orders, Work, terms snapshots, obligations, capacity, audit, outbox, and idempotency result. A replay with the same semantic idempotency key returns the original result; a different payload under the same key is a conflict.

### 6.5 Amendment and source change behavior

- Before buyer acceptance, a material provider change creates a new proposal version and invalidates prior custom invitations.
- After buyer acceptance and before contract finalization, a source/terms change fails closed unless a defined versioned amendment path exists.
- After contract finalization, editing `proposal_nodes` cannot change Order/Work truth. Any accepted-term change requires a separate amendment contract with affected-party approval; otherwise reject it.
- Closing/pausing a listing does not mutate historical proposal/order snapshots. It may prevent new acceptance if the quoted version's policy does not preserve validity.

---

## 7. API contract

### 7.1 Create a provider proposal

```http
POST /v1/requests/{requestId}/proposals
Idempotency-Key: provider-proposal-01
If-Match: "request-version-8"
```

Example request (listing-stemmed custom bid):

```json
{
  "source": {
    "kind": "listing_version",
    "listing_id": "11111111-1111-7111-8111-111111111111",
    "listing_version_id": "22222222-2222-7222-8222-222222222222"
  },
  "proposal_kind": "standalone",
  "nodes": [
    {
      "node_key": "electrical_repair",
      "node_type": "service",
      "quantity": "1",
      "unit": "job",
      "pricing": {
        "mode": "custom_terms",
        "customer_unit_minor": 480000,
        "provider_payout_minor": 420000,
        "discount_minor": 0
      },
      "customization": {
        "deliverables": {
          "add": ["verified_load_test"]
        },
        "inclusions": {
          "add": ["compatible_mounting_kit"]
        },
        "exclusions": {
          "add": ["wall_repair"]
        },
        "parts_required": {
          "add": ["breaker_20a"]
        },
        "workmanship_warranty": {
          "duration": {"value": 90, "unit": "days"},
          "starts_on": "customer_signoff"
        }
      }
    }
  ]
}
```

The request is intent plus an override patch. The server obtains the source base, resolves stable keys, calculates totals, and either returns a draft/validation result or rejects with a typed error. A client cannot submit `terms_hash`, `work_specification_hash`, final package totals, a provider payout override without authorization, or a fabricated evidence file.

### 7.2 Response projection

```json
{
  "proposal_id": "33333333-3333-7333-8333-333333333333",
  "proposal_version_id": "44444444-4444-7444-8444-444444444444",
  "status": "proposed",
  "gate_status": "pending_partner_confirmation",
  "source": {
    "kind": "listing_version",
    "listing_id": "11111111-1111-7111-8111-111111111111",
    "listing_version_id": "22222222-2222-7222-8222-222222222222",
    "listing_version_number": 3,
    "capability_profile_family_code": "service_listing",
    "capability_profile_business_version": 4
  },
  "totals": {
    "customer_total_minor": 480000,
    "provider_total_minor": 420000,
    "currency": "PHP"
  },
  "nodes": [
    {
      "node_key": "electrical_repair",
      "provider_user_id": "55555555-5555-7555-8555-555555555555",
      "pricing_mode": "custom_terms",
      "partner_confirmation_status": "pending",
      "work_shape": "A1",
      "work_specification_schema_version": 1,
      "work_specification_hash": "sha256:resolved-work-spec",
      "work_specifications": {
        "schema_version": 1,
        "shape": {"code": "A1", "contract_version": 1, "payload_schema_version": 1},
        "resolved": {
          "phases": [
            {"phase_key": "diagnostic", "ordinal": 1},
            {"phase_key": "removal_mounting", "ordinal": 2},
            {"phase_key": "load_testing_signoff", "ordinal": 3}
          ]
        }
      }
    }
  ]
}
```

The buyer-facing response must display the base source and all changed terms together. It must not show private competitor bid counts, ranking, or another provider's private source details.

### 7.3 Typed validation errors

| Code | Meaning |
| --- | --- |
| `SOURCE_REQUIRED` | No listing version or capability profile source was supplied |
| `SOURCE_NOT_FOUND` | Source identity does not resolve |
| `SOURCE_VERSION_MISMATCH` | Listing/version or profile/version pair is inconsistent |
| `SOURCE_PROVIDER_MISMATCH` | Provider does not own the listing or activation |
| `SOURCE_POLICY_FORBIDS_USE` | Listing is public but not authorized for chain use |
| `PROFILE_NOT_ACTIVE` | Profile business version cannot be used for a new proposal |
| `PROFILE_ACTIVATION_REQUIRED` | Provider lacks current exact capability authorization |
| `WORK_CONTRACT_UNSUPPORTED` | Shape/contract/payload schema is not registered |
| `WORK_SPEC_INVALID` | Payload fails bounded schema or shape validation |
| `WORK_SPEC_REQUIRED_ITEM_REMOVED` | Customization removes mandatory safety/deliverable/evidence item |
| `WORK_SPEC_PHASE_CYCLE` | Phase dependencies form a cycle |
| `CUSTOM_TERMS_CONFIRMATION_REQUIRED` | External partner has not accepted exact changed terms |
| `CAPACITY_UNAVAILABLE` | Exact source capacity failed live revalidation |
| `SOURCE_NO_LONGER_VALID` | Source version expired/closed without honoring policy |
| `PROPOSAL_VERSION_CONFLICT` | Client acted on a stale proposal/request/version |
| `PROPOSAL_ALREADY_ACCEPTED` | Attempted mutation after acceptance |
| `IDEMPOTENCY_CONFLICT` | Reused key with different semantic payload |

---

## 8. Security, privacy, and operational rules

### 8.1 Authorization and visibility

- A provider may edit only their own draft proposal/version or an explicitly authorized acting-for resource.
- A partner sees only the invitation-scoped node and the minimum terms needed to accept/counter/decline. A partner does not gain access to the buyer's unrelated payment or sibling evidence merely because both nodes are in one package/chain.
- A buyer sees the source identity, base-vs-custom delta, resolved deliverables, inclusions/exclusions, parts responsibility, warranty, phases, and evidence requirements before acceptance.
- Public browse projections must not expose draft proposals, private profile activation details, sealed bid amounts/counts, or evidence storage keys.
- Agent actions carry actor, acting-for owner, active consent grant, expected version, idempotency key, audit event, and outbox causality. Agent activity never changes source ownership or payment recipient.

### 8.2 Evidence and sensitive data

- Proposal requirements may declare an evidence kind and data class but must not contain raw sensitive files or public storage URLs.
- Actual evidence uses `evidence_files` with scan/quarantine, retention, access policy, and legal-hold checks.
- Electrical readings, photos of premises, customer signatures, and warranty claims may carry operational or sensitive data classes; access is resolved per subject Order/Work and actor, not by proposal membership.
- A proposal hash proves payload integrity but is not a permission token.

### 8.3 Reliability and observability

Every mutating command writes state, audit, idempotency result, and outbox intent transactionally. Log/metrics dimensions should include:

- source kind and source version (not private source contents);
- work shape and schema version;
- customization categories used (price/scope/parts/warranty/etc.);
- proposal gate outcome and partner response;
- validation rejection code;
- accepted child Order count; and
- Work specification hash/version.

Do not log raw private customer addresses, evidence bytes, payment secrets, or competitor terms. Background jobs recheck current proposal/source/activation state before acting; a stale job cannot dispatch, create an Order, or mutate an accepted specification.

---

## 9. Implementation and migration sequencing

This is a planning addition, not authorization to migrate production.

1. **Canonical contract update:** Add proposal/proposal-version/proposal-node fields and the `work_specifications` schema to the canonical schema inventory and domain/state contracts. Keep statuses/version names synchronized.
2. **Source/registry seam:** Expose a Listings/catalog read seam that returns exact listing version, owner, profile pins, policy, source terms hash, and capacity/schedule facts. Expose a Work contract registry keyed by profile family/business version and shape/payload versions.
3. **Storage migration:** Add the tables/columns/indexes above with named constraints, source foreign keys, partial active-version uniqueness, and deferred graph/source triggers. Use an expand/validate/cutover sequence; preserve existing quote/order data.
4. **Resolver/validator:** Implement one server-side source resolver and one deterministic customization resolver. Reject unknown JSON paths and unsupported shape versions. Do not duplicate profile rules across controllers.
5. **Commands:** Implement draft → proposed, counter/version, partner invitation, buyer acceptance, and child-order finalization as idempotent commands with expected-version checks and fixed lock order.
6. **Order/Work bridge:** Copy resolved Work spec and source hashes into immutable terms/Work snapshots. Use the canonical Work registry; never infer shape from listing type or free text.
7. **Evidence/readiness:** Add phase/evidence validation to Work commands. Keep readiness events distinct from completion and payment state.
8. **Activation gate:** Keep proposal/Deal-Chaining functionality behind its separately approved activation record until authorization, recovery, operations, privacy, and browser evidence pass.
9. **Retirement/cutover:** Once the proposal model is canonical, remove any duplicate ad hoc proposal payloads stored in party scope or outbox-only blobs. Do not maintain aliases that let callers bypass source provenance.

### 9.1 Existing repository reality

The current repository already has the underlying listing/profile versioning and Work contract seams, but not proof of this proposal schema:

- `database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php` creates `capability_profiles`, `listings`, `listing_versions`, `requests`, and `quotes`.
- `database/migrations/2026_08_10_100200_e0s2_batch_002_product_versions_and_reservations.php` adds exact category/profile business-version pins to `listing_versions` and capacity-version identity.
- `database/migrations/2026_08_01_003000_batch_003_orders_and_work.php` creates ordinary Orders, accepted terms snapshots, Work Instances, and Work Events.
- `database/migrations/2026_09_04_050939_harden_work_contract_versions_for_t4.php` adds canonical Work shape/payload contract versions and migrates only approved legacy shapes.
- `app/Modules/Listings/Application/OrderListingSourceAdapter.php` already resolves listing owner, listing version, profile pins, price/currency, and Work shape through a Listings-owned read seam.
- `app/Modules/OrdersWork/Application/DefaultWorkContractRegistry.php` already fails closed for unsupported canonical Work shape/version combinations.

Those files are evidence of reusable seams, not evidence that provider-customized proposal persistence or Deal-Chaining execution is complete.

---

## 10. Acceptance and proof scenarios

These are implementation acceptance scenarios, not claims that they have run.

| Scenario | Required result |
| --- | --- |
| Provider submits a bid without listing/profile source | `SOURCE_REQUIRED`; zero proposal/version mutation |
| Provider references another provider's listing as own source | `SOURCE_PROVIDER_MISMATCH`; no bid |
| Provider references a listing version with mismatched listing ID | `SOURCE_VERSION_MISMATCH`; no bid |
| Provider uses an old valid listing version after publishing a newer price | Proposal retains old source/version/hash; acceptance either honors it under policy or returns a typed conflict, never silently changes amount |
| Profile-only bid has no current activation | `PROFILE_ACTIVATION_REQUIRED`; no proposal submission |
| Catalog node changes price only | Reclassified `custom_terms`; partner invitation required for an external listing; no speculative notification before invitation/acceptance |
| Catalog node changes only warranty/exclusion/parts responsibility | Same custom-term gate; buyer sees the exact delta |
| Customization removes required safety checklist/evidence | `WORK_SPEC_REQUIRED_ITEM_REMOVED`; no proposal version |
| Phase dependency references unknown key or cycles | `WORK_SPEC_INVALID`/`WORK_SPEC_PHASE_CYCLE`; no version |
| Measurement requirement has no unit or invalid range | `WORK_SPEC_INVALID`; no version |
| Provider submits duplicate deliverable/checklist/evidence keys | Validation fails; resolver does not choose one arbitrarily |
| Buyer views custom proposal | Base source, all changed terms, resolved phases, evidence requirements, price/payout semantics allowed by role, and warranty are visible before acceptance |
| External unchanged `STANDARD_AUTO_BIND` source is proposed | No partner invitation or speculative partner notification; source is revalidated at acceptance |
| External custom source partner accepts, then provider edits the node | Prior acceptance is invalidated; new proposal version/invitation required |
| Buyer accepts while a required partner invitation is pending | `CUSTOM_TERMS_CONFIRMATION_REQUIRED`; no contract, child Orders, or obligations |
| Buyer accepts a valid two-node proposal | One contract, one independent Order per billable node, one Work spec/terms snapshot per Order, one payment obligation per Order; no parent pooled balance |
| Finalization fails after capacity lock | Transaction rolls back Order, Work, terms, obligation, capacity, audit, outbox, and idempotency effects |
| `ready_for_collection`/phase readiness is recorded | Named downstream action may unblock; source Order remains nonterminal unless its own Work contract says otherwise |
| Listing is closed after an accepted Order | Historical proposal/order/Work snapshots remain unchanged; no automatic sibling cancellation/refund |
| Same finalize/submit command replays | Stored result returns without duplicate nodes, invitations, child Orders, obligations, evidence requirements, or notifications |
| Same idempotency key carries different customization | `IDEMPOTENCY_CONFLICT`; original result/history remains intact |
| Provider attempts to edit accepted specification | Rejected; amendment path required; existing Work terms/evidence remain authoritative |
| Courier/provider accesses sibling private evidence | Authorization denied despite shared proposal/chain membership |

---

## 11. Traceability and research sources

### 11.1 Repository sources

| Source | Relevant authority |
| --- | --- |
| [`docs/planning-hardening/17-deal-chaining-logic-soundness-review.md`](17-deal-chaining-logic-soundness-review.md) §§What we can keep, Findings, Minimal logic contract | Listing-first selection, distinct Need/Order identity, explicit dependency facts, independent agreements, history-preserving replacement, readiness/handoff/payment separation, no pooled money, and source/authorization gaps that must not be guessed |
| [`docs/planning-hardening/18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md`](18-listing-extensions-partnered-deal-chaining-and-buyer-substitution-specification.md) §§2–5 | Single-owner base listings, modular extensions, dynamic Work pipeline, independent child Orders, no pooled escrow, readiness gates, and immutable/versioned handoff terms |
| [`docs/planning-hardening/20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md`](20-advisor-role-oriented-bidding-and-partner-extensions-evaluation.md) §§3.1–3.2, 4.3–4.7, 9–15 | `STANDARD_AUTO_BIND`, `CUSTOM_TERMS`, source listing/version links, proposal/version/node schema, partner invitations, independent child Orders/payment obligations, stale-source checks, notification rule, locking/idempotency, and implementation boundary |
| [`_bmad-output/planning-artifacts/canonical-schema-rebuilt.md`](../../_bmad-output/planning-artifacts/canonical-schema-rebuilt.md) §§1, 2, 3, 5, 6 | UUID/time/money/JSONB conventions; exact capability/listing/profile version pins; Request/Quote/Order/Work boundaries; evidence and immutable terms |
| [`docs/planning-hardening/07-schema-implementation-and-erd-contract.md`](07-schema-implementation-and-erd-contract.md) §§1–4 | PostgreSQL implementation conventions, no pooled parent payment, independent child Orders, migration/index/constraint policy, and deal-lineage relationship intent |
| [`_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md`](../../_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md) §§2.2, 2.4, 2.10–2.16, 3–5, 16.2 | Listing/Profile/Order/Work ownership, DealChain/Need semantics, state transitions, Work evidence/sign-off, source-version and acceptance guards, activation and command requirements |
| [`database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php`](../../database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php) | Current PostgreSQL/Laravel baseline for capability profiles, listings, immutable listing versions, Requests, and Quotes |
| [`database/migrations/2026_08_01_003000_batch_003_orders_and_work.php`](../../database/migrations/2026_08_01_003000_batch_003_orders_and_work.php) | Current ordinary Order, accepted terms, Work Instance, and Work Event columns/constraints |
| [`app/Modules/Listings/Application/OrderListingSourceAdapter.php`](../../app/Modules/Listings/Application/OrderListingSourceAdapter.php) | Existing owner/version/profile/shape resolution seam and lockable active-approved source lookup |
| [`app/Modules/OrdersWork/Application/DefaultWorkContractRegistry.php`](../../app/Modules/OrdersWork/Application/DefaultWorkContractRegistry.php) | Existing fail-closed canonical Work shape registry (`A1`, `A3`, `A4`, `A9`) |

### 11.2 Primary external sources

- [PostgreSQL 16 — Constraints, §5.4](https://www.postgresql.org/docs/16/ddl-constraints.html): row `CHECK` constraints, foreign keys, uniqueness, partial indexes, and the warning that a `CHECK` must not query mutable data in other rows; this supports the split between row checks and source/graph deferred validation.
- [PostgreSQL 16 — JSON Types, §8.14](https://www.postgresql.org/docs/16/datatype-json.html): `jsonb` processing/indexing behavior and the recommendation that JSON documents have a predictable bounded structure; this supports versioned Work payloads while keeping query-critical identity/economics relational.
- [PostgreSQL 16 — Transaction Isolation, §13.2](https://www.postgresql.org/docs/16/transaction-iso.html): read-committed re-evaluation/locking behavior and serialization retry requirements; this supports lock/re-read/revalidate acceptance and finalization commands.
- [Laravel 12 — Database Transactions](https://laravel.com/docs/12.x/database#database-transactions): application transaction boundary used by Laravel command orchestration; external calls must not be treated as an implicit independent transaction.

---

## 12. Final decision

Adopt the following as the canonical design for provider-customized bids:

1. Every bid/proposal and every node has explicit provenance: a provider-owned immutable listing version or an exact activated capability profile business version.
2. `source_listing_version_id` is a first-class foreign key on both `proposals` (lead/root source) and `proposal_nodes` (per-obligation source), with source listing identity, profile pins, ownership checks, and hashes.
3. Provider changes are represented as explicit customizations over a bounded base snapshot. Base safety and capability constraints remain floors.
4. `work_specifications` is a versioned resolved contract containing phases, checklists, typed evidence requirements, deliverables, inclusions/exclusions, parts responsibility, and workmanship warranty. It is copied into accepted Work terms but never treated as runtime status.
5. `STANDARD_AUTO_BIND` remains quiet for unchanged catalog references; custom external terms require exact partner confirmation; profile-only bids require provider activation.
6. Acceptance forms independent child Orders and one-to-one payment obligations. Work readiness, evidence, sign-off, and payment remain separate state machines.
7. Listing/profile changes never rewrite historical proposal or Order terms. Unsupported source, shape, schema, graph, authorization, and stale-version cases fail closed.

This preserves the Document 17/18 invariants while giving a provider enough expressive surface to produce a credible, buyer-reviewable, and executable custom Work plan from an existing Serbizyu capability.
