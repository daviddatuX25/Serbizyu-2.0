# Hardened Deal Chain & Work Standardization Plan
**Version**: 1.0.0  
**Status**: APPROVED & READY FOR PHASED EXECUTION  
**Target Systems**: `App\Modules\Catalogs`, `App\Modules\OrdersWork`, `App\Modules\DealCoordination` (planned), `resources/js/components/mobile/`, `resources/js/components/marketplace/`

---

## 1. Domain Invariants & Bounded Contexts

```
                      +-------------------------------------------------+
                      |           COORDINATION LAYER: DEAL CHAIN        |
                      |   Aggregate Root: DealChain (Relational)        |
                      |   Entities: DealNeed, DealDependency            |
                      |   Sovereignty: Multi-Party / Inter-Provider     |
                      +------------------------+------------------------+
                                               |
                               materializes 1:1 per Need
                                               v
                      +-------------------------------------------------+
                      |           FULFILLMENT LAYER: ORDINARY ORDER     |
                      |   Aggregate Root: Order (Single Agreement)      |
                      |   Parties: Buyer User + Single Provider User    |
                      +------------------------+------------------------+
                                               |
                                spawns 1:1 for Service
                                               v
                      +-------------------------------------------------+
                      |           EXECUTION LAYER: WORK INSTANCE        |
                      |   Aggregate Root: WorkInstance (JSON snapshot)  |
                      |   Entities: WorkStage, WorkEvent                |
                      |   Sovereignty: Intra-Provider Execution Details |
                      +-------------------------------------------------+
```

### The Core Boundary Principles
1. **Work is Intra-Order Fulfillment Authority**:
   - Governs how **one provider** executes an accepted scope.
   - Snapshot contract in `work_instances.structure` (JSONB) with versioning (`shape_contract_version`, `row_version`).
   - Stages represent technician execution milestones (e.g. Arrival -> Disassemble -> Replace Part -> Pressure Test -> Client Sign-Off).
   - Evidence collection (`photo_proof`, `metric_reading`, `customer_otp`) unlocks intra-work stages.
2. **Deal Chain is Inter-Order Coordination Authority**:
   - Governs how **multiple sovereign providers** (Store + Courier + Labor + Auditor) coordinate independent commercial agreements.
   - Relational tables (`deal_chains`, `deal_needs`, `deal_dependencies`, `deal_invitations`).
   - Dependencies (`blocks`) enforce inter-party handoffs (`source_ready`, `delivered_to_site`, `work_completed`, `audit_cleared`).
   - Wires on canvas and dependency gates observe child facts; they do not perform work or alter child payment liability.

---

## 2. Immediate Code Quality & System Design Fixes (Phase 1)

### Fix 1: Dynamic Slot Candidate Fetching in `SlotListingPickerModal.tsx`
- **Current Defect**: Modal accepts optional `candidates?: SlotCandidateListing[]` but defaults to a hardcoded 9-listing mock array. Callers (`PicksDrawer.tsx`, `Picks.tsx`, `CreateService.tsx`, `CreateProduct.tsx`) never pass `candidates`, causing real marketplace listings to be ignored.
- **Remedy**:
  - In `SlotListingPickerModal.tsx`, when `candidates` prop is omitted or empty, dynamically fetch active approved listings from `GET /api/deal-chains/slot-candidates?role=${encodeURIComponent(role)}`.
  - Maintain a local loading state and cache per role.
  - Retain `DEFAULT_TAGUDIN_CANDIDATES` strictly as fallback when the API returns an empty list or during offline tests.
  - Propagate candidate selection to `onSwapSlotCandidate`, updating the deal chain node with real `listing_id`, `provider_user_id`, and `price_minor`.

### Fix 2: Admin Route Protection & Clean Middleware
- **Current Defect**: Route `/admin/catalogs/deal-chains` and `/admin/catalogs/work` in `routes/web.php` are registered as bare closures without the application's auth/admin middleware stack.
- **Remedy**:
  - Enforce authentication and administrative authorization on `/admin/catalogs/*` routes.
  - Disable local simulated "Save/Promote" buttons with a clean "Catalog editing requires published revision" notice.

### Fix 3: TypeScript Contract Consolidation
- **Current Defect**: `SlotCandidateListing`, `DealChainNode`, and `PartnerSlot` are duplicated across `resources/js/components/mobile/types.ts` and `resources/js/marketplace/types.ts` with minor casing differences.
- **Remedy**:
  - Re-export canonical types from `resources/js/components/mobile/types.ts`.
  - Align `SlotCandidateListing` to support both `price_minor` and `priceMinor` accessors for zero-regression compatibility.

---

## 3. Preparation for Downstream Epics (Orders, Payments, Messaging, Quick Deals)

1. **Orders**: When a Deal Chain is authorized (`/deal-chains/authorize`), each `deal_need` spawns an ordinary child `Order` (`origin = 'deal_chain'`, `deal_chain_id`, `deal_need_id`).
2. **Payments**: Independent Payment Obligations per child Order. Deal Chain acts as an escrow release pipeline (releasing Store payout when Courier collects; releasing Courier payout on site delivery; releasing Labor payout on client sign-off).
3. **Messaging**: Deal Chain Relay chat channel (`deal_chains/{id}/chat`), grouping the Coordinator, Store, Courier, and Laborer on a shared coordination rail.
4. **Quick Deals**: Pre-packaged, zero-config Deal Chain recipes that can be launched with 1-click checkout.
