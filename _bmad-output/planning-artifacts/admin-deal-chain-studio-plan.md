# Admin Deal Chain Studio — Implementation Plan & Architecture Specification
**Date**: September 2026  
**Status**: Planned / Ready for Implementation  
**Area**: Admin Catalogs & Multi-Party Fulfillment Governance (`/admin/catalogs/deal-chains`)

---

## 1. Problem Statement & Background
Currently, the admin page at `resources/js/Pages/Admin/Catalogs/DealChainStudio.tsx` (`/admin/catalogs/deal-chains`):
- Uses mock in-memory data (`SAMPLE_ARCHETYPES`: `MATERIAL_COURIER_LABOR`, `PALAY_HARVEST_RELAY`, `AGRI_DRYING_MILLING_DELIVERY`).
- Uses a vertical list with downward arrows (`MoveDown`), rather than the authentic n8n squircle node DAG canvas (`DealChainCanvas.tsx`).
- Simulates gate unblocks in local React state (`handleSimulateGate`), disconnected from the actual backend database tables (`deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`).
- Lacks live integration with the versioned Deal Chain recipe catalog (`deal_chain_catalog_versions`).

Meanwhile, the mobile/listing side of the platform now has:
1. `DealChainCanvas.tsx`: Squircle n8n nodes, category color badges, ports, SVG Bezier wires, attached edge `[+]` chaining, and explicit **Visual Gate Nodes** (`⬡ ALL OF · Wait for all inputs`) with selection glow.
2. `DealChainCustomizerModal.tsx`: Dual-pane studio layout with top canvas, left tier list, and right inspector panel (with Dependency Gate Inspector).
3. Backend database schema (`database/migrations/2026_08_01_0002a0_batch_002a_deal_chaining_foundation.php`) and controller endpoints (`DealChainController.php`).

---

## 2. High-Level Architecture & Layout

The Admin Deal Chain Studio will follow the proven dual-mode tabbed interface:

```
+---------------------------------------------------------------------------------------------------------+
| SERBIZYU ADMIN · DEAL CHAIN STUDIO                                                                      |
+---------------------------------------------------------------------------------------------------------+
| [Tab 1: Recipe Catalog Governance]              | [Tab 2: In-The-Wild Live Multi-Agency Relays]         |
+-------------------------------------------------+-------------------------------------------------------+
| - Left Pane: Recipe Catalog List                | - Left Pane: Live Chains Table / Filter by Status:    |
|   * Turnkey Parts & Transit Relay               |   `sourcing`, `committed`, `in_execution`, `completed`|
|   * Harvest & Processing Relay                  | - Search by Coordinator, Order, or Chain UUID         |
|   * Multi-Vendor Delivery & Install             | - Right Pane: Live Relays Inspection                  |
| - Right Pane: n8n DealChainCanvas Editor        |   * Real-time DealChainCanvas rendering actual        |
|   * Visual Squircle Nodes by Role Family:       |     `deal_needs` and `deal_dependencies`               |
|     `Supply`, `Transport`, `Perform`, `Verify`  |   * Live Gate Status: Waiting for Photo/OTP/Arrival   |
|   * Visual Gate Nodes: Condition Codes & Rules  |   * Participant Invitations & Orders Table            |
|   * Version Bump & Recipe Publish Action        |   * Emergency Bypass & Admin Override Controls        |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Scope of Work by Phase

### Phase 1: Backend Admin API & Controller
1. **Controller**: Create `app/Http/Controllers/Admin/DealChainCatalogController.php` (or extend `DealChainController.php`):
   - `index()`: Fetch versioned recipes from `deal_chain_catalog_versions` and active chains summary.
   - `store(Request $request)`: Create new Deal Chain recipe archetype with governed role requirements and dependency graph.
   - `update(Request $request, string $recipeId)`: Increment `catalog_version`, validate acyclic dependencies, and persist new version.
   - `liveChains(Request $request)`: Paginated query of real `deal_chains` joined with `deal_needs`, `deal_dependencies`, `deal_invitations`, and `orders`.
   - `adminBypassGate(Request $request, string $dependencyId)`: Authorized administrative action to unblock a stuck gate in an in-flight chain with audit trail.
2. **Routes** (`routes/web.php`):
   ```php
   Route::middleware(['auth', 'admin'])->prefix('admin/catalogs/deal-chains')->name('admin.catalogs.deal-chains.')->group(function () {
       Route::get('/', [DealChainCatalogController::class, 'index'])->name('index');
       Route::post('/recipes', [DealChainCatalogController::class, 'storeRecipe'])->name('recipes.store');
       Route::put('/recipes/{id}', [DealChainCatalogController::class, 'updateRecipe'])->name('recipes.update');
       Route::get('/live-chains', [DealChainCatalogController::class, 'liveChains'])->name('live-chains');
       Route::post('/dependencies/{id}/bypass', [DealChainCatalogController::class, 'bypassGate'])->name('dependencies.bypass');
   });
   ```

### Phase 2: Frontend Admin UI Refactoring (`DealChainStudio.tsx`)
1. **Embed `DealChainCanvas`**: Replace the vertical card stack and CSS down-arrows with the interactive `DealChainCanvas` component.
2. **Catalog Governance Tab**:
   - Provide visual n8n squircle node editing for recipe archetypes.
   - Slot editor: select Role Family (`Supply`, `Transport`, `Perform`, `Verify`), required capabilities, default budget range, and eligible categories.
   - Gate editor: configure synchronization barrier (`all_of` vs `any_of`), condition code (`source_ready`, `delivered_to_site`, `work_completed`, `audit_cleared`), and customer/admin bypass rules.
3. **Live Relays Monitoring Tab**:
   - Project real database `deal_needs` and `deal_dependencies` directly into `DealChainCanvas`.
   - Visual status indicators:
     - Green border / glow: Need completed / satisfied.
     - Amber pulse: Need in progress / invited.
     - Slate dashed: Need blocked by upstream dependency gate.
   - Gate click reveals live blockage breakdown: "Waiting for Danny Express (Courier) · 1 of 2 inputs ready".
   - Admin actions: re-invite partner, cancel chain branch, or execute emergency administrative gate unblock.

### Phase 3: Automated Tests & Verification
1. Feature tests in `tests/Feature/Admin/DealChainCatalogTest.php`:
   - Admin can view recipe catalog.
   - Admin can create and version a new recipe archetype.
   - Acyclic graph validation rejects cyclic dependencies.
   - Admin can view live chains and execute an audited gate bypass.
2. Component tests in Vitest for Admin `DealChainStudio.tsx`.
