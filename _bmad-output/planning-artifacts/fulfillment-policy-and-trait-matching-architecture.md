# Scalable Fulfillment Policy & Trait-Driven Matching Architecture
**Document**: Architecture Specification & Migration Blueprint  
**Status**: APPROVED & READY FOR PHASED EXECUTION  
**Target Systems**: `App\Modules\Catalogs`, `App\Modules\Listings`, `App\Modules\DealCoordination`, `resources/js/Pages/Listings/`

---

## 1. Problem Analysis & Critique of Ad-Hoc Helpers

### The Scalability Bottleneck
Currently, the codebase uses boolean helpers such as `isInstallationApplicable(categoryCode: string)` with substring matching (`c === 'repairs' || c.includes('appliance') || c.includes('hardware') || c.includes('machin')`). While this works as a quick stopgap to hide aircon installation on food products, it does not scale for a production marketplace:

1. **Taxonomy Fragility**: Renaming, localizing, or aliasing categories breaks string checks silently.
2. **Combinatorial Explosion of Modalities**: A multi-category marketplace soon requires:
   - **Cold-chain delivery** for dairy, ice cream, fresh seafood, and raw meats (`local-food`).
   - **On-site assembly / carpentry labor** for furniture and home fixtures (`crafts`, `general`).
   - **White-glove / fragile handling** for cakes, ceramics, delicate pastries, and glassware.
   - **Heavy hauling & crane/truck logistics** for palay, construction aggregates, and timber.
   - **Garment fitting / tailoring adjustments** for custom uniforms and formal wear (`clothing`).
   - **Hazardous / chemical transport** for fertilizers and pesticides (`agriculture`).
   Writing `isColdChainApplicable()`, `isWhiteGloveApplicable()`, `isAssemblyApplicable()`, etc., across frontend and backend creates exponential technical debt and duplicate logic.
3. **Split-Brain Eligibility**: If the frontend decides compatibility in React while the backend decides compatibility in PHP (`recipeApplies()`), they drift: a merchant could see an option the backend rejects, or be denied an option the backend supports.
4. **False Category Assumptions**: Broad categories (e.g. `repairs`) contain simple jobs (e.g. sewing a button) that require no trade technician, and `local-food` contains items requiring frozen transport vs. shelf-stable goods.

---

## 2. The 3-Tier Capability & Policy Model

Instead of hardcoded boolean checks, Serbizyu 2.0 adopts a **3-tier capability matching system** driven by the governed catalog:

```
+----------------------------------------------------------------------------------------------------+
| 1. LISTING TRAITS (What the item is & requires)                                                    |
|    - `trait.perishable`             - `trait.fragile`               - `trait.installable`          |
|    - `trait.temperature.chilled`    - `trait.temperature.frozen`   - `trait.requires_fitting`     |
|    - `trait.bulky`                  - `trait.hazardous`             - `trait.assembly_required`    |
+----------------------------------------------------------------------------------------------------+
                                                v
                                         MATCHED AGAINST
                                                v
+----------------------------------------------------------------------------------------------------+
| 2. FULFILLMENT RECIPE RULES (What the recipe offers & requires)                                   |
|    - Offers: [`modality.delivery.cold_chain`, `modality.white_glove`]                              |
|    - Eligibility Rule:                                                                             |
|      * all_of:  [`trait.perishable`]                                                               |
|      * any_of:  [`trait.temperature.chilled`, `trait.temperature.frozen`]                         |
|      * none_of: [`trait.hazardous`]                                                                |
+----------------------------------------------------------------------------------------------------+
                                                v
                                         SLOT REQUIREMENTS
                                                v
+----------------------------------------------------------------------------------------------------+
| 3. PROVIDER CAPABILITY ASSIGNMENTS (What partners are certified to perform)                       |
|    - Slot: `Cold Transport Runner`                                                                 |
|      * Required Capabilities: [`provider.transport.refrigerated`, `provider.handling.food_safe`]   |
|      * Minimum Assurance: `verified`                                                               |
+----------------------------------------------------------------------------------------------------+
```

### Data Separation Invariant
- **Marketplace Taxonomy** (`category_versions`): Supplies inherited trait defaults and allowed modalities.
- **Listing Version** (`listing_versions.terms.fulfillment_profile`): Pins the immutable effective traits of the specific item.
- **Deal Chain Recipe** (`deal_chain_catalog_versions`): Governs declarative eligibility rules and required slot capabilities.
- **Partner Listing Version** (`listing_version_capabilities`): Stores verified provider competencies and assurance levels.

---

## 3. Database Schema Specification

### A. Capability Definition Registry
```sql
CREATE TABLE fulfillment_capability_definitions (
    code TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('listing_trait', 'modality', 'provider_capability')),
    facet TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
    registry_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fulfillment_cap_kind ON fulfillment_capability_definitions (kind, status);
```

### B. Partner Listing Capabilities
```sql
CREATE TABLE listing_version_capabilities (
    listing_version_id UUID NOT NULL REFERENCES listing_versions(id) ON DELETE CASCADE,
    capability_code TEXT NOT NULL REFERENCES fulfillment_capability_definitions(code),
    assurance TEXT NOT NULL CHECK (assurance IN ('declared', 'reviewed', 'verified')),
    evidence_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (listing_version_id, capability_code)
);

CREATE INDEX idx_listing_ver_cap ON listing_version_capabilities (capability_code, assurance, listing_version_id);
```

### C. Recipe Definition Payload v2 (`deal_chain_catalog_versions.definition`)
```json
{
  "schema_version": 2,
  "offers": ["modality.delivery.cold_chain", "modality.white_glove"],
  "eligibility": {
    "rules": [
      {
        "id": "perishable-cold-chain-rule",
        "all_of": ["trait.perishable"],
        "any_of_groups": [
          ["trait.temperature.chilled", "trait.temperature.frozen"]
        ],
        "none_of": ["trait.hazardous"],
        "priority": 20
      }
    ]
  },
  "nodes": [
    {
      "key": "primary",
      "source": "primary_listing",
      "need_kind": "product"
    },
    {
      "key": "cold_courier",
      "source": "partner_slot",
      "need_kind": "service",
      "display": {
        "role": "Cold-Chain Courier",
        "title": "Refrigerated Delivery Runner"
      },
      "slot_requirement": {
        "role_code": "transport",
        "all_of": ["provider.transport.refrigerated", "provider.handling.food_safe"],
        "minimum_assurance": "verified"
      }
    }
  ],
  "dependencies": [
    {
      "predecessor": "primary",
      "successor": "cold_courier",
      "condition_code": "source_ready"
    }
  ]
}
```

---

## 4. Single Deep Backend Seam

Expose one unified application interface in `App\Modules\Catalogs`:

```php
interface FulfillmentCatalogInterface
{
    /**
     * Resolves pre-ranked, eligible fulfillment options for a listing or draft context.
     */
    public function optionsFor(FulfillmentContext $context): FulfillmentOptionsResponse;

    /**
     * Resolves matching candidate listings for a specific recipe slot.
     */
    public function candidates(RecipeRef $recipe, string $slotKey, FulfillmentContext $context): PartnerCandidatesResponse;
}
```

### API Endpoints
1. `GET /api/catalogs/fulfillment-options`:
   Query parameters: `category_code`, `listing_type`, `work_shape`, `traits[]`.
   Returns: Pre-filtered, pre-ranked options with `recommendation.tier` (`recommended` | `available`).
2. `GET /api/catalogs/fulfillment-recipes/{code}/versions/{v}/slots/{slotKey}/candidates`:
   Query parameters: `context_fingerprint`.
   Returns: Verified partner listings that satisfy the slot's capability predicates.

---

## 5. Phased Implementation Roadmap

* **Phase 1 (Completed Foundation)**:
  - Default `selectedFulfillment` to `'pickup'`.
  - Refactor Product Builder Step 3 into visible, un-paginated selectable cards with progressive disclosure.
  - Temporary stopgap `isInstallationApplicable` isolating food products from trade aircon labor.

* **Phase 2 (Registry & Taxonomy Policy)**:
  - Migrate `fulfillment_capability_definitions` and `listing_version_capabilities` tables.
  - Seed initial vocabulary: `trait.perishable`, `trait.installable`, `trait.fragile`, `trait.bulky`, `trait.temperature.*`.
  - Add fulfillment trait policy to `category_versions`.

* **Phase 3 (Recipe Catalog v2)**:
  - Upgrade `deal_chain_catalog_versions` definitions to schema v2 with declarative boolean rules (`all_of`, `any_of_groups`, `none_of`).
  - Implement deterministic `FulfillmentMatcher` service in PHP with unit test matrix.

* **Phase 4 (Frontend Single-Seam Cutover)**:
  - Replace client-side category checks in `CreateProduct.tsx`, `CreateService.tsx`, and `ListingDetail.tsx` with dynamic calls to `/api/catalogs/fulfillment-options`.
  - Builders consume `FulfillmentOptionsResponse` directly; remove all hardcoded recipe lists and ad-hoc string checks.
