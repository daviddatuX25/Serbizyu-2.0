# Capability Spec — Governed catalog, listings, capacity, and discovery

Change ID: `t2-governed-catalog-listings-capacity`  
Capability: `governed-catalog-listings-capacity`  
Stories: `E2-S1`, `E2-S2`, `E2-S5`, `E2-S6`

## ADDED Requirements

### Requirement: Published category versions govern listing meaning

The system MUST require a published `category_versions` business version before a listing version pins category meaning. Unpublished or missing category versions MUST NOT authorize listing publish meaning.

#### Scenario: Ensure publishes category business version

- **Given** a disposable database with the 58-table schema
- **When** a governed ensure runs for category code `home-help`
- **Then** an active `categories` row exists
- **And** a `category_versions` row with `status = published` and `business_version >= 1` exists for that category

#### Scenario: Listing version pins published category and capability versions

- **Given** published category and active capability profile versions
- **When** a listing draft is created
- **Then** the inserted `listing_versions` row stores `category_id`, `category_business_version`, `capability_profile_family_code`, and `capability_profile_business_version`
- **And** those pins satisfy the composite foreign keys from E0-S2

---

### Requirement: Capacity reservations prevent oversell

Product/service capacity buckets MUST support hold→commit|release|expire with positive quantity and must reject holds that would exceed remaining capacity.

#### Scenario: Oversell hold is rejected

- **Given** a capacity bucket with remaining quantity 1
- **And** an active hold for quantity 1 already exists
- **When** another hold for quantity 1 is attempted on the same bucket
- **Then** the command fails with a capacity/oversell error
- **And** no second active reservation is created

#### Scenario: Identical hold idempotency key replays

- **Given** a successful hold with command scope+key
- **When** the same hold is retried with the same scope+key and fingerprint-compatible payload
- **Then** the original reservation is returned
- **And** remaining quantity is not double-decremented

---

### Requirement: Tagudin public discovery is privacy-safe

Public discovery MUST return only approved active listings in the Tagudin pilot geography and MUST exclude private owner identifiers and reservation internals.

#### Scenario: Discovery filters area and category

- **Given** active approved Tagudin listings and at least one draft or non-Tagudin listing
- **When** discovery runs with area `Tagudin` and an optional category code
- **Then** only matching active approved Tagudin listings are returned
- **And** results do not include `owner_user_id` or reservation rows

---

## Placement notes (non-requirements of this change)

- Ordinary Order finalization is **T3**.
- Requests/Quotes/Quick Deal are **T5**.
- Customer Reviews are **T6**.
