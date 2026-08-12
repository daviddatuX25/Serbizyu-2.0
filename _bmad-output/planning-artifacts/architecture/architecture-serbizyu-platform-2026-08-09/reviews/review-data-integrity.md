# Data Integrity Review — Serbizyu Platform Architecture Spine

**Review date:** 2026-08-09  
**Scope:** architecture spine, program implementation plan, canonical rebuilt schema, domain/state authority, and current migrations  
**Verdict:** **NOT READY / HIGH-RISK UNTIL T0 SCHEMA RECONCILIATION**

The integration ERD delta can be reconciled safely only through the gated T0 authority amendment; it cannot be implemented against the documents as they stand. The current migrations create **47 application tables**, because `auth_otps` exists in addition to the canonical 46-table inventory. Adding the six proposed integration tables would therefore produce **53**, not 52, before any further operational table is considered. The canonical inventory, catalog contract, ERD, migration order, and integration delta must be regenerated from one inventory before implementation.

## Highest-confidence findings

### HIGH — Reconcile the canonical count with the migrated `auth_otps` table

**Evidence:** `canonical-schema-rebuilt.md:31-33,35-96,966-980` declares 46 tables and requires no historical count conflict; `database/migrations/2026_08_03_000200_create_auth_otps.php:13-27` creates `auth_otps`; `tests/Feature/DatabaseCatalogContractTest.php:64-114` now expects 47 application tables. `PROGRAM-IMPLEMENTATION-PLAN.md:359-368` proposes six more tables.

**Impact:** The authoritative baseline is already off by one, so the integration delta has no stable source inventory, target count, or complete migration order. A catalog test derived from the current migration set and a canonical ERD derived from the 46-table document cannot both be authoritative.

**Required resolution:** **Clear autofix after authority choice.** Add `auth_otps` to the canonical inventory, ownership/retention/index sections, and migration order; set the pre-integration baseline to 47 and the post-integration inventory to 53; regenerate the ERD and catalog contract from that inventory. If OTP is intentionally non-canonical, remove it from the permanent migration/catalog contract instead—do not keep two authorities.

### HIGH — Define immutable category/capability version identity before Order formation

**Evidence:** `ARCHITECTURE-SPINE.md:122-126` requires accepted Orders to reference immutable listing, quote, category, capability, and policy versions. `canonical-schema-rebuilt.md:324-358` gives `categories` only a mutable metadata version and gives capability profiles versioned codes, while `database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php:13-56` stores category/profile version fields on mutable rows. `database/migrations/2026_08_01_003000_batch_003_orders_and_work.php:76-105` snapshots listing/quote/policy references but has no category-version reference and no explicit capability-version reference.

**Impact:** A category row can change after acceptance without a relationally stable category version on the Order, and the architecture's source-version invariant cannot be proven from the accepted terms record. This undermines historical safety/data-class and capability eligibility evidence.

**Required resolution:** **Founder/schema-authority decision.** Choose either immutable append-only category/profile version rows referenced by listing versions and Order terms, or declare exactly which normalized values are copied into the immutable Order terms snapshot. Then update AD-6, the canonical schema, ERD, migration, and acceptance tests to one model.

### HIGH — Replace the one-row listing-capacity key with a shape-safe identity

**Evidence:** `PROGRAM-IMPLEMENTATION-PLAN.md:136-149` requires quantity, slot, service-availability, and request-based capacity plus double-booking protection. `database/migrations/2026_08_01_000200_batch_002_product_taxonomy_requests_quotes.php:136-156` includes slot fields but enforces `UNIQUE (listing_id)`, permits a `listing_version_id` from any listing, and does not tie `listings.current_version` to a concrete `listing_versions` row.

**Impact:** An A3 listing cannot persist more than one slot, while a capacity row can point to listing A and a version owned by listing B. External synchronization or Order formation can therefore reserve the wrong version/capacity identity even when all individual FKs pass.

**Required resolution:** **Schema decision with clear follow-up migration.** Define capacity identity/cardinality per type (for example listing + version + slot/resource key), add a composite FK proving the version belongs to the listing, and make the current published version a relational FK or immutable ID rather than an unconstrained integer.

### HIGH — Enforce Deal-Need replacement and quote lineage in the database contract

**Evidence:** `canonical-schema-rebuilt.md:131,169-173` requires same-chain replacement lineage and requires a Quote's lineage pair to match its Request. The Deal migration uses only `replaces_deal_need_id -> deal_needs(id)` at `database/migrations/2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php:57-60`, which allows cross-chain replacement, and adds only independent composite FKs for Requests/Quotes at lines 121-129; no Request↔Quote lineage-match trigger or composite relation exists.

**Impact:** The database accepts a Need in one chain replacing a Need in another, and it accepts a Quote whose `deal_need_id` disagrees with the referenced Request. Derived roll-ups and child-Order lineage can then attribute sourcing and replacement history to the wrong chain.

**Required resolution:** **Clear autofix.** Add a composite replacement FK `(deal_chain_id, replaces_deal_need_id) -> deal_needs(deal_chain_id, id)` and a deferred constraint trigger or equivalent normalized FK that enforces Quote/Request lineage equality.

### HIGH — Close cross-aggregate Order/Work/Payment lineage gaps

**Evidence:** `canonical-schema-rebuilt.md:450-466,537-558` and `domain-state-contracts-rebuilt.md:60-101,314-320` require accepted terms and independent but correctly linked Work/Obligations. Current migrations allow `orders.status = 'accepted'` without any terms snapshot (`2026_08_01_003000_batch_003_orders_and_work.php:13-48,76-108`) and allow `payment_obligations.order_id` to name one Order while `work_instance_id` names Work from another (`2026_08_01_004000_batch_004_payment_and_accounting.php:13-37`).

**Impact:** Direct SQL, a faulty retry, or a future adapter can persist an accepted Order with no immutable terms or attach a payment obligation to unrelated Work while every declared FK succeeds. Close/release/dispute guards will then evaluate inconsistent aggregates.

**Required resolution:** **Clear autofix after selecting the accepted-terms pointer model.** Add a relational accepted/current terms reference with same-Order enforcement, and add a composite same-Order FK for optional Work linkage (supported by a unique `(order_id,id)` key on Work). Keep command-level transactional guards as a second layer, not the only layer.

### HIGH — Prevent ledger entries from posting against accounts in another currency

**Evidence:** Financial accounts carry currency (`database/migrations/2026_08_01_004000_batch_004_payment_and_accounting.php:87-105`) and entries/transactions carry currency (`:108-155`). The posting procedure checks entry currency against transaction currency but checks only account existence/status, not `financial_accounts.currency`, at `database/migrations/2026_08_01_007000_batch_007_integrity_indexes_checks_and_guards.php:203-233`.

**Impact:** A balanced PHP transaction can post debit/credit entries labeled PHP to active USD accounts. The transaction balances numerically, but per-account balances and reconciliation become financially invalid.

**Required resolution:** **Clear autofix.** In the posting guard, reject any entry whose currency differs from either its transaction or its financial account; cover posting and account-currency immutability with database-level contract evidence.

### HIGH — Expand the integration delta into an executable schema contract before migration

**Evidence:** `PROGRAM-IMPLEMENTATION-PLAN.md:359-375` names six tables but leaves parent FKs/delete behavior, status/time consistency checks, per-client uniqueness scopes, webhook-to-outbox causality FK, payload/filter schema versions, retention classes, and an ordered migration batch unspecified. `canonical-schema-rebuilt.md:968-979` requires those details for every table, and the plan itself says no integration migration begins before authority amendment (`PROGRAM-IMPLEMENTATION-PLAN.md:35-54`).

**Impact:** Different implementers can produce structurally valid but incompatible interpretations—for example orphaned credentials/deliveries, a delivery disconnected from its source outbox message, or sync cursors whose monotonicity cannot be guarded. The six-row summary is an amendment brief, not a migration-safe ERD.

**Required resolution:** **Clear T0 documentation/schema work; founder input only for retention and ownership policy choices.** Add all six tables to the canonical inventory with columns, explicit FKs and delete behavior, checks, unique/partial indexes, retention/privacy classes, source-outbox causality, migration order, rollback, and resulting table count before generating a migration.

## Reconciliation decision

**No implementation may safely start from the current integration ERD delta.** Reconciliation is feasible without changing the modular architecture, but only if T0 first establishes one 47-table pre-integration authority, resolves the version/capacity/lineage/ledger constraints above, and publishes a complete 53-table post-integration schema/ERD and migration order. The program's existing “no integration migration before authority amendments” gate is therefore necessary and must remain blocking.
