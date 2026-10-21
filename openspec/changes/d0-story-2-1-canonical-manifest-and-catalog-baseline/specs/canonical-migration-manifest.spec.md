# Specification — Canonical Migration Manifest and Catalog Baseline

Spec ID: `SPEC-D0-MIGRATION-MANIFEST-001`  
Story: `Story 2.1`  
Delivery Unit: `D0`  
Standard: OpenSpec / BMM 6.10

---

## 1. Scope & Definitions

This specification defines the authoritative database schema baseline for Serbizyu 2.0. It binds:
1. The **Canonical 61-Table Inventory**: the complete list of application domain tables required by the platform architecture.
2. The **First-Consumer Dependency Mapping**: the strict rule that no table shall be migrated before the story that first consumes its write path.
3. The **Catalog Baseline Integrity**: the required candidate keys and uniqueness constraints on authoring catalog tables.

---

## 2. Normative Requirements

### 2.1 REQ-MANIFEST-001: Canonical 61-Table Inventory
The platform canonical schema shall consist of exactly 61 domain tables:
- **Identity & Authorization (6):** `users`, `user_profiles`, `role_assignments`, `identity_verifications`, `evidence_files`, `consent_grants`.
- **Product & Taxonomy (7):** `categories`, `capability_profiles`, `listings`, `listing_versions`, `listing_capacity`, `requests`, `quotes`.
- **Orders & Fulfillment (5):** `orders`, `order_parties`, `order_terms_snapshots`, `work_instances`, `work_events`.
- **Payments & Accounting (8):** `payment_obligations`, `payment_events`, `policy_versions`, `financial_accounts`, `financial_transactions`, `financial_entries`, `provider_events`, `financial_adjustments`.
- **Trust, Support & Safety (6):** `disputes`, `dispute_events`, `administrative_holds`, `support_cases`, `safety_incidents`, `reviews`.
- **Communication & Evidence Operations (5):** `conversations`, `messages`, `notifications`, `notification_deliveries`, `cohort_classifications`.
- **Platform Integrity & Audit (5):** `audit_events`, `outbox_messages`, `idempotency_keys`, `retention_holds`, `migration_checkpoints`.
- **Deal-Chaining Foundation (4):** `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`.
- **Initiative Extensions (15):** `auth_otps`, `category_versions`, `listing_capacity_reservations`, `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, `integration_sync_cursors`, `inbox_messages`, `capability_activations`, `command_approvals`, `request_invitations`, `work_catalog_versions`, `deal_chain_catalog_versions`.
*(Note: `auth_otps`, Deal-Chaining foundation, and core 42 compose the observed 47 baseline; 14 extensions complete the 61 total).*

### 2.2 REQ-MANIFEST-002: First-Consumer Allocation
Each canonical table must be first consumed and owned by a specific delivery unit according to the following mapping:
- `D0`: `migration_checkpoints`, `work_catalog_versions`, `deal_chain_catalog_versions`
- `D1`: `users`, `user_profiles`, `role_assignments`, `identity_verifications`, `evidence_files`, `consent_grants`, `auth_otps`, `audit_events`, `outbox_messages`, `idempotency_keys`, `retention_holds`, `notifications`, `notification_deliveries`, `inbox_messages`, `command_approvals`
- `D2`: `categories`, `category_versions`, `capability_profiles`, `capability_activations`
- `D3`: `listings`, `listing_versions`, `listing_capacity`, `listing_capacity_reservations`
- `D4`: `orders`, `order_parties`, `order_terms_snapshots`, `work_instances`, `work_events`, `payment_obligations`
- `D5`: `requests`, `quotes`
- `D6`: `request_invitations`
- `D7`: `deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`
- `D8`: `disputes`, `dispute_events`, `administrative_holds`, `support_cases`, `safety_incidents`, `reviews`, `cohort_classifications`
- `D9`: `conversations`, `messages`
- `D10`: `policy_versions`, `financial_accounts`, `financial_transactions`, `financial_entries`, `provider_events`, `financial_adjustments`
- `D11`: `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, `integration_sync_cursors`

### 2.3 REQ-MANIFEST-003: Catalog Candidate Keys and Constraints
Authoring catalog tables shall enforce deterministic composite candidate keys:
1. `work_catalog_versions`:
   - `uq_work_catalog_code_version`: `UNIQUE (catalog_code, catalog_version)`
   - `uq_work_catalog_shape_version`: `UNIQUE (work_shape, shape_contract_version, payload_schema_version, catalog_version)`
2. `deal_chain_catalog_versions`:
   - `uq_deal_chain_catalog_recipe_version`: `UNIQUE (recipe_code, catalog_version)`

---

## 3. Scenarios

### Scenario 1: Assert Canonical Table Inventory
- **Given** an automated test asserting database catalog tables against the canonical architecture
- **When** the canonical inventory list is inspected
- **Then** the inventory contains exactly 61 unique table names
- **And** no table name is duplicated or omitted across domain contexts.

### Scenario 2: Active PostgreSQL Schema Classification
- **Given** the active PostgreSQL development/testing database
- **When** the table inventory in `information_schema.tables` (schema `public`) is queried
- **Then** 60 canonical domain tables are present
- **And** `request_invitations` is not present (deferred to D6)
- **And** 2 engine tables (`migrations`, `spatial_ref_sys`) and 3 auxiliary tables (`oauth_identities`, `password_reset_tokens`, `t4_work_migration_audits`) are identified and classified without contaminating domain counts.

### Scenario 3: Candidate Key Enforcement on Work Catalog
- **Given** an existing row in `work_catalog_versions` with `(catalog_code = 'A1-LINEAR', catalog_version = 1)`
- **When** a command attempts to insert another row with the same `catalog_code` and `catalog_version`
- **Then** PostgreSQL rejects the insert with a unique constraint violation on `uq_work_catalog_code_version`.

### Scenario 4: Acyclic First-Consumer Dependency Order
- **Given** the table-to-delivery-unit allocation map
- **When** delivery unit dependency edges `(D0 -> D1 -> D2 -> D3 -> D4 -> D5 -> D6 -> D7 -> D8 -> G -> D9, D8 -> D10, D8 -> D11)` are checked for topological ordering
- **Then** no cycle exists
- **And** every canonical table has exactly one first-consuming delivery unit.
