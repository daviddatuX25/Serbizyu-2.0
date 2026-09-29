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

### User-Friendly Relay Pipeline Design (Locked Architecture)
Instead of an abstract 2D "n8n-style" wire canvas with floating boxes and Bezier lines, the Deal Chain Builder uses an **ordered, tactile Relay Pipeline** modeled after physical Tagudin hand-offs (`Supply / Store` → `Courier / Transit` → `Technician / Labor` → `Quality / Audit`).

```
+---------------------------------------------------------------------------------------------------------+
| SERBIZYU ADMIN · DEAL CHAIN STUDIO                                                                      |
+---------------------------------------------------------------------------------------------------------+
| [Tab 1: Recipe Catalog Governance]              | [Tab 2: In-The-Wild Live Multi-Agency Relays]         |
+-------------------------------------------------+-------------------------------------------------------+
| - Left Pane: Recipe Catalog List                | - Left Pane: Live Chains Table / Filter by Status:    |
|   * Turnkey Parts & Transit Relay               |   `sourcing`, `committed`, `in_execution`, `completed`|
|   * Harvest & Processing Relay                  | - Search by Coordinator, Order, or Chain UUID         |
|   * Multi-Vendor Delivery & Install             | - Right Pane: Live Relay Inspection                   |
| - Right Pane: Tactile Relay Pipeline Editor     |   * Real-time Pipeline rendering actual `deal_needs`  |
|   * High-contrast Role Icons (Store/Rider/Labor)|   * Live Gate Status: Waiting for Photo/OTP/Arrival   |
|   * One-tap Presets & Middle Insertions [+]     |   * Participant Invitations & Orders Table            |
|   * Instant Delete [🗑] + 5s Undo Toast         |   * Emergency Bypass & Admin Override Controls        |
|   * Reorder [↑] [↓] & Auto-Healing Gates        |                                                       |
|   * Candidate Search Drawer (Responsive Modal)  |                                                       |
|   * Version Bump & Recipe Publish Action        |                                                       |
+---------------------------------------------------------------------------------------------------------+
```

### Core Interaction Invariants
1. **Tactile Step Cards:** Each step is an ordered card displaying step number, high-contrast role badge/icon, assigned partner (or "Open Pool"), estimated fee, and explicit hand-off gate.
2. **Fast Creation:** One-tap presets (`[ 🏪 Store ]`, `[ 🛵 Courier ]`, `[ 🔧 Labor ]`, `[ 🛡️ Audit ]`) and `[ + Insert Step Here ]` middle pills enable instant assembly without mandatory partner searching upfront.
3. **Responsive Candidate Search:** Tapping "Assign Partner" opens a responsive drawer (`PartnerSelectionDrawer` standard: full-screen sheet on mobile, right slide-over on desktop) with keyword, category, and Barangay filters.
4. **Frictionless Deletion & Auto-Healing:** Direct `[ 🗑 ]` click removes a step immediately with a 5-second undo toast. Hand-off gates automatically heal (e.g., removing a middle courier automatically transitions the gate to direct counter pickup). Minimum 2-step guardrail is strictly enforced.
5. **True Persistence:** Edits persist to `deal_chain_catalog_versions` through a version-bumped backend admin endpoint (`POST /admin/catalogs/deal-chains/recipes/{id}/publish`), recording immutable catalog history.
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
1. **Tactile Step-by-Step Relay Pipeline**:
   - Replace abstract wire canvas and down-arrows with the high-clarity `DealChainPipelineBuilder`.
   - High-contrast role badges (`🏪 Store / Supply`, `🛵 Courier / Transit`, `🔧 Labor / Technician`, `🛡️ Quality / Audit`).
   - Direct, visible card actions: `[ 🗑 ]` instant delete with 5-second undo toast, `[ ↑ ]` and `[ ↓ ]` reordering.
   - Insert middle step pills (`[ + Insert Step Here ]`) between cards.
   - Auto-healing hand-off conditions upon step deletion/reorder.
2. **Catalog Governance Tab**:
   - Live sync with `deal_chain_catalog_versions`.
   - Role preset buttons for rapid 1-click step creation.
   - Integrated partner drawer (`PartnerSelectionDrawer` standard: responsive bottom sheet on mobile, right slide-over on desktop) for optional exact provider assignment.
   - Version bump and publish action calling `POST /admin/catalogs/deal-chains/recipes/{id}/publish`.
3. **Live Relays Monitoring Tab**:
   - Display real database `deal_needs` and `deal_dependencies` directly in the tactile pipeline view.
   - Visual status indicators:
     - Green border / glow: Need completed / satisfied.
     - Amber pulse: Need in progress / invited.
     - Slate dashed: Need blocked by upstream dependency gate.
   - Plain-English gate blockage description: *"Waiting for Danny Express (Courier) · 1 of 2 inputs ready"*.
   - Admin emergency actions: re-invite partner, cancel chain branch, or execute emergency administrative gate unblock.
### Phase 3: Automated Tests & Verification
1. Feature tests in `tests/Feature/Admin/DealChainCatalogTest.php`:
   - Admin can view recipe catalog.
   - Admin can create and version a new recipe archetype.
   - Acyclic graph validation rejects cyclic dependencies.
   - Admin can view live chains and execute an audited gate bypass.
2. Component tests in Vitest for Admin `DealChainStudio.tsx`.
