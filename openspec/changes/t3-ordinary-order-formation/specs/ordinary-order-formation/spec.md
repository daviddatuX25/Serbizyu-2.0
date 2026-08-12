# Capability Spec — Ordinary Order formation (thin)

Change ID: `t3-ordinary-order-formation`  
Stories: `E3-S1`, `E3-S8`

## ADDED Requirements

### Requirement: Listing-sourced proposal is pending only

Buyer proposal against an active approved listing MUST create a `pending_acceptance` Order with buyer and provider parties and MUST NOT create Work or Payment Obligations yet.

#### Scenario: Propose succeeds

- **Given** an active approved Tagudin listing and an authenticated buyer
- **When** `SubmitOrderProposal` runs with a valid idempotency key
- **Then** an Order exists with `status = pending_acceptance`
- **And** active buyer and provider parties exist
- **And** no Work or Obligation rows exist for that Order

### Requirement: Finalize creates immutable terms and required children

Finalization MUST atomically accept the Order, write terms snapshot v1 pinned to the listing version, create required Work, create one External Cash Obligation, and commit any capacity hold.

#### Scenario: Finalize with standing listing acceptance

- **Given** a pending proposal whose listing is still active and approved at the expected version
- **When** the buyer finalizes (standing provider acceptance)
- **Then** Order is `accepted`
- **And** terms snapshot v1 exists with `source_listing_version_id`
- **And** a Work row exists in `not_started`
- **And** an Obligation exists with lane `external_cash`

#### Scenario: Stale listing version cannot finalize

- **Given** the listing current version changed after propose
- **When** finalize runs with the old expected listing version
- **Then** the command fails with a conflict/stale error
- **And** the Order remains `pending_acceptance` without terms/Work/Obligation

### Requirement: Idempotent propose and finalize

Identical scope+key+fingerprint MUST replay the prior result without duplicating Order children.
