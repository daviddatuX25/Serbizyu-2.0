# Architectural Specification: Dynamic Partner Matching & Scalable Relay Slots (Refined)

**Date**: September 2026 / October 2026  
**Status**: Architecture Approved & Refined Post-Review  
**Target Area**: Deal Chain Catalogs, Marketplace Fulfillment, Listing Builders, Order Dispatch  
**Predecessors & Ground Truth**:
- Canonical 60-table schema manifest locked by `CanonicalMigrationManifestTest`
- `_bmad-output/planning-artifacts/fulfillment-policy-and-trait-matching-architecture.md` (Approved Trait Architecture)
- `_bmad-output/planning-artifacts/admin-deal-chain-studio-plan.md` (Admin Studio Specification)

---

## 1. Executive Summary & Root Cause Analysis

Serbizyu 2.0's early prototypes used hardcoded Tagudin demo fixtures ("Danny Express Motorcycle Pool", "Tagudin Hardware Depot", "Kuya Ben Aircon Services", "Barangay Centro Bicycle Runner"). Over successive iterations, these fixtures became embedded as static assumptions:

1. **Frontend Terminology Bias**:
   - `DealChainCustomizerModal.tsx` and `DealChainPipelineBuilder.tsx` treat partner assignments as a rigid binary: **"Bound Tagudin Partner"** vs **"Open Role Slot"**.
   - "Bound" implies legal exclusivity, creating seller confusion. In practice, sellers either designate a **Preferred Partner** they routinely work with, let the **Buyer Choose** at cart, or leave the slot open for **Community Pool Dispatch**.

2. **Hardcoded Vendor String Logic**:
   - `CreateProduct.tsx` (lines 858–865, 898–902) and `CreateService.tsx` (lines 626–632) contain fragile checks:
     ```typescript
     if (fullName.includes('Danny Express')) return 'Danny Exp';
     if (fullName.includes('Kuya Ben')) return 'Kuya Ben';
     ```
   - Real Tagudin merchants entering the marketplace will have arbitrarily formatted business names that do not match these prototypes.

3. **In-Memory Fallback Candidates**:
   - `SlotListingPickerModal.tsx` contains 120 lines of `DEFAULT_TAGUDIN_CANDIDATES`. When API requests are slow or empty, it injects fictitious listings with static UUIDs (`...90b9`, `...90ba`) rather than displaying a genuine loading skeleton or authentic empty pool state.

4. **Hardcoded IDs in Blueprint Catalog Recipes**:
   - `dealChainRecipes.ts` and `TagudinDealChainCatalog.php` bake fixed UUIDs (`0198a3b1-7c40-7abc-8def-5234567890b9`) and fixed pricing (`₱35.00`) directly into blueprint definitions.
   - Blueprints should define **abstract slot requirements** (e.g. role: `courier`, capability: `transport.motorcycle`, SLA: `<30m`), not point to individual citizens.

5. **Static Fallbacks in Order Execution**:
   - `OrderController.php` (lines 210–216, 550–556) falls back to:
     ```php
     if ($need->ordinal === 2) { $providerName = 'Danny Express'; }
     ```
   - If an order is executed via an open pool or without an assigned provider, this static mask corrupts multi-vendor tracking, accounting, and review ceremonies.

---

## 2. Target Domain Model: 3-Tier Slot Assignment Architecture

### A. Three Distinct Modes
Replace the rigid "Bound vs Open" binary with an explicit 3-Tier Slot Assignment model:

1. **`preferred_partner` (Pre-assigned Partner)**:
   - Seller pre-attaches a specific verified listing with an agreed base fee.
   - Example: A bakery seller attaches their trusted neighborhood rider.
2. **`buyer_choice` (Buyer Selects at Cart)**:
   - The slot is left unassigned by the seller.
   - During checkout, the buyer chooses from eligible providers servicing their delivery barangay.
3. **`open_pool` (Community Dispatch Pool)**:
   - Neither seller nor buyer pre-selects a specific provider.
   - Upon payment confirmation, the need enters the Tagudin dispatch pool where verified local providers claim the slot.

### B. Storage Mapping within the Locked Canonical 60-Table Schema
Per `CanonicalMigrationManifestTest`, no new tables or columns may be added. All state maps into existing JSONB fields:

1. **Listing / Draft Templates (`listings.terms`)**:
   - Stored inside `deal_chain_combinations[].slots[]`:
     ```json
     {
       "slot_id": "slot_courier_1",
       "role": "courier",
       "role_code": "transport",
       "assignment_mode": "preferred_partner",
       "preferred_listing_id": "0198a3b1-7c40-7abc-8def-5234567890b9",
       "required_capabilities": ["provider.transport.motorcycle"],
       "max_sla_minutes": 30
     }
     ```

2. **Runtime Instantiated Needs (`deal_needs.target_location`)**:
   - In `deal_needs`, the JSONB column `target_location` is used as the **Dispatch & Assignment Envelope**:
     ```json
     {
       "address": "Tagudin Public Market Stall #14",
       "geography": { "municipality_name": "Tagudin", "barangay_name": "Poblacion East" },
       "assignment": {
         "mode": "open_pool",
         "required_capabilities": ["provider.transport.motorcycle"],
         "status": "unclaimed",
         "claimed_by_user_id": null,
         "claimed_listing_id": null,
         "claim_ttl_expires_at": "2026-09-30T10:30:00Z"
       }
     }
     ```
   - When a provider is bound or claims the slot, a corresponding `deal_invitations` row is created with `deal_need_id`, `invited_provider_user_id`, `listing_id`, and `proposed_amount_minor`.

---

## 3. Server-Side Authoritative Pricing & Version Pinning

### Rules:
1. **Never trust client-supplied fee overrides**:
   - In `StageDealChain` and `DealChainController@stage`, the server must query the active `listing_versions` for `preferred_listing_id` and pin `price_amount_minor` and `currency` directly from the database record.
2. **Repricing & Stale Version Handling**:
   - If the preferred partner's listing price changes after the draft was staged, order formation validates that the referenced version is still effective. If changed, the order formation fails with a recoverable error: `PARTNER_PRICE_CHANGED` prompting the buyer to re-confirm the updated fee.

---

## 4. Atomic Open-Pool Claim & Timeout State Machine

### A. Lifecycle Transitions:
```
           [Order Paid]
                 |
                 v
        +------------------+
        | open_pool need   |
        | status: 'open'   |
        | unclaimed        |
        +--------+---------+
                 |
        +--------+------------------------+
        | Provider claims                 | TTL expires (e.g. 30 mins)
        v                                 v
+------------------------+       +------------------------+
| claimNeed() (Atomic)   |       | expirePoolNeed()       |
| status: 'assigned'     |       | status: 'unfulfilled'  |
| creates deal_invitation|       | notifies buyer/vendor  |
+------------------------+       +------------------------+
```

### B. Atomic Claim Endpoint (`POST /api/deal-chains/needs/{needId}/claim`):
1. Verifies the caller is an authenticated user with verified provider status in Tagudin.
2. Uses `DB::transaction` with `lockForUpdate` on `deal_needs`:
   - Checks that `assignment->mode === 'open_pool'`.
   - Checks that no accepted or pending `deal_invitations` exists for this need.
   - Verifies the provider's active listing satisfies `required_capabilities`.
3. Sets `assignment->claimed_by_user_id` and inserts a `deal_invitations` record with `status: 'accepted'`.
4. Transitions `deal_needs.status` to `in_progress` (or unblocks downstream dependencies).

### C. Timeout & Fallback:
- If no provider claims within `claim_ttl_expires_at`:
  - A scheduled command / queue worker marks the need `unfulfilled`.
  - The buyer is notified with options:
    - **Fallback A**: Switch to Direct Counter Pickup (fee refunded to buyer balance).
    - **Fallback B**: Extend pool dispatch window by 30 minutes.
    - **Fallback C**: Cancel order with full atomic refund.

---

## 5. Dynamic Slot Candidate Engine (`DealChainController@slotCandidates`)

### A. Strict SQL Locality & Security Filtering:
```php
$candidates = DB::table('listings')
    ->join('listing_versions', function ($join) {
        $join->on('listings.id', '=', 'listing_versions.listing_id')
             ->whereRaw('listing_versions.version_number = listings.current_version');
    })
    ->leftJoin('user_profiles', 'listings.owner_user_id', '=', 'user_profiles.user_id')
    ->where('listings.status', '=', 'active')
    ->where('listings.review_status', '=', 'approved')
    ->whereRaw("listings.geography->>'municipality_name' ILIKE 'Tagudin'")
    ->select([
        'listings.id',
        'listings.listing_type',
        'listings.owner_user_id',
        'listings.geography',
        'listing_versions.terms',
        'listing_versions.price_amount_minor',
        'user_profiles.display_name as profile_display_name',
    ])
    ->get();
```

### B. Sanitized Public Projection:
- **NEVER expose**: `users.phone_e164`, password hashes, raw audit history, or private internal notes.
- **Provider Name Resolution**:
  1. `terms['stall_location']` (if merchant stall)
  2. `user_profiles.display_name`
  3. `terms['title']`
- **Supported Roles**:
  - `STORE`: `listing_type = 'product'`
  - `COURIER`: category/shape = `courier` / `delivery` / `transport`
  - `LABOR`: `listing_type = 'service'` (repairs, maintenance, construction)
  - `AUDIT`: quality inspection / endorsement services
  - `RECYCLE`: materials recycling / waste management

### C. Graceful Empty States:
- When a role has 0 active providers in Tagudin, the endpoint returns:
  ```json
  {
    "data": [],
    "meta": {
      "role": "COURIER",
      "count": 0,
      "locality": "Tagudin",
      "open_pool_supported": true
    }
  }
  ```
- No in-memory mock candidates are injected.

---

## 6. Frontend Decoupling & UI Modernization

### A. 3-Way Slot Assignment Selector in `DealChainCustomizerModal.tsx`:
```
+---------------------------------------------------------------------------------+
| Partner Assignment Mode                                                         |
|                                                                                 |
| (•) Preferred Partner           ( ) Community Open Pool     ( ) Buyer's Choice  |
|     Pre-select verified listing     Dispatched to Tagudin       Buyer picks     |
|     you work with                   pool at order payment       rider at cart   |
+---------------------------------------------------------------------------------+
```

### B. Eliminate `DEFAULT_TAGUDIN_CANDIDATES` in `SlotListingPickerModal.tsx`:
1. Remove the 120-line mock array.
2. Add an animated pulsing skeleton while fetching candidates from `/api/deal-chains/slot-candidates`.
3. If candidates list is empty, display an authentic empty state:
   - Icon: `<PackageSearch className="size-8 text-slate-400" />`
   - Title: `No Active [Role] Listings in Tagudin`
   - Subtitle: `You can set this node to "Community Open Pool" so local runners can claim it when an order is placed.`
   - Action Button: `[ Set as Community Open Pool ]`

### C. Generic Provider Name Formatter (`resources/js/lib/formatters.ts`):
Replace custom vendor string checks in `CreateProduct.tsx` and `CreateService.tsx`:
```typescript
export function formatProviderShortName(fullName?: string | null, maxLen = 14): string {
    if (!fullName) return 'Partner';
    const trimmed = fullName.trim();
    // Clean delimiters: " - ", " · ", "(", "/"
    const primaryPart = trimmed.split(/\s*[-·(/]\s*/)[0] || trimmed;
    if (primaryPart.length <= maxLen) return primaryPart;
    return `${primaryPart.slice(0, maxLen - 1)}…`;
}
```

---

## 7. Decoupling Catalog Blueprints with Versioned Schema Dispatch

### A. Backward-Compatible Recipe Schema Dispatch:
In `DealChainCatalog.php` and `AdminDealChainCatalogController.php`:
- **Schema v1 (Legacy Reader)**: Reads existing recipes containing `listing_id` and legacy fields. Passes through existing tests (`DealChainCatalogTest.php`, `DealChainOrdersTest.php`).
- **Schema v2 (Dynamic Blueprint)**: Validates abstract `slot_requirement`:
  ```json
  {
    "schema_version": 2,
    "key": "courier",
    "need_kind": "service",
    "title": "On-Demand Transit Runner",
    "slot_requirement": {
      "role": "courier",
      "capability_codes": ["provider.transport.motorcycle"],
      "default_assignment_mode": "open_pool",
      "estimated_fee_minor": 3500
    }
  }
  ```

---

## 8. Backend Order Resolution (`OrderController.php`)

Remove the static prototype masks:
```php
// Old static fallbacks removed:
// if ($need->ordinal === 2) { $providerName = 'Danny Express'; }

// New authentic resolution:
$providerName = $need->assigned_listing_title
    ?? $need->assigned_provider_display_name
    ?? ($need->assignment_mode === 'open_pool' ? 'Tagudin Community Pool' : 'Unassigned Slot');
```

---

## 9. Phased Implementation Roadmap

| Phase | Scope | Focus | Verification Gates |
|---|---|---|---|
| **Phase 1: Terminology & String Helper Modernization** | `CreateProduct.tsx`, `CreateService.tsx`, `DealChainCustomizerModal.tsx`, `formatters.ts` | • Add `formatProviderShortName`<br>• Replace hardcoded vendor string checks<br>• Introduce 3-Way Slot Assignment UI (Preferred, Open Pool, Buyer Choice) | `npm test -- resources/js/`<br>`npx tsc --noEmit` |
| **Phase 2: Dynamic Candidate Engine & SQL Locality** | `DealChainController@slotCandidates`, `tests/Feature/DealChaining/` | • Strict Tagudin SQL locality filter<br>• Public sanitized projection (no phone leak)<br>• Retain all 5 roles (`STORE`, `COURIER`, `LABOR`, `AUDIT`, `RECYCLE`) | `vendor/bin/pest tests/Feature/DealChaining/` |
| **Phase 3: Dynamic Slot Picker Modal** | `SlotListingPickerModal.tsx` | • Delete `DEFAULT_TAGUDIN_CANDIDATES`<br>• Add pulsing skeleton & empty pool CTA | Vitest modal tests |
| **Phase 4: Schema v2 Blueprint Dispatch & Order Resolution** | `DealChainCatalog.php`, `OrderController.php`, `StageDealChain.php` | • Versioned recipe schema dispatch (v1 legacy + v2 abstract)<br>• Store assignment envelope in `deal_needs.target_location`<br>• Remove static fallbacks in `OrderController` | Full test suite: Admin, Orders, Listings |
