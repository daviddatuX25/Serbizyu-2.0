# Lo-Fi UI Design Kit Capability

Status: REFERENCE-ONLY
Change: `create-lofi-ui-design-kit`
Trace: `10-ux-ui-reference-dossier.md`; `10a-ux-ui-screen-perspective-matrix.md`; `10b-ux-ui-scenario-blueprints.md`

## ADDED Requirements

### Requirement: Element completeness for screen assembly

ID: KIT-REQ-001

The kit SHALL provide tokens, primitives, banners, state variants, and composite elements sufficient to assemble any canonical screen without re-inventing base UI.

#### Scenario: Designer assembles a payment screen

- GIVEN PAY-003/PAY-004 requirements
- WHEN the designer uses kit elements
- THEN the two-sided cash report, lane card, and separation panel are available as documented elements
- AND no behavior is invented outside the dossier contracts.

### Requirement: Edge-element availability

ID: KIT-REQ-002

The kit SHALL include the air-gapped QR live-feed element and the archetype formulation interface, with their offline-authority and validity-guard boundaries visible.

#### Scenario: Air-gapped flow is represented

- GIVEN the conditional Quick Deal order-formation surface
- WHEN the designer uses the QR feed element
- THEN frame sequencing, expiry, and the `draft intent only` boundary are shown
- AND it cannot authorize payment, payout, release, final inventory, or irreversible consent.

### Requirement: State-variant fidelity

ID: KIT-REQ-003

Every dossier state variant SHALL exist as a rendered element (loading, empty, error, offline, stale, retry, mismatch, hold, corrected, deferred, sandbox).

#### Scenario: Variant inventory check

- GIVEN the dossier §11 variant list
- WHEN the kit is scanned
- THEN each variant has a corresponding labeled element.

### Requirement: No bulk screens / reference boundary

ID: KIT-REQ-004

The kit SHALL NOT produce the 74 screens and SHALL carry persistent reference-only/sandbox labeling on applicable elements.

#### Scenario: Reviewer inspects the kit

- GIVEN the kit page
- WHEN a reviewer looks for product screens
- THEN they find an element suite plus at most one annotated composition exemplar (SCN-01)
- AND sandbox/reference labels are non-removable.
