# Tasks: Frontend Mobile UI Kernel

Status: PROPOSED — implementation intentionally unchecked  
Change: `01-frontend-mobile-ui-kernel`

## Execution rules

- Work in `resources/js/components/mobile/`.
- Import domain types exclusively from `resources/js/components/mobile/types.ts`.
- Use Tailwind CSS v4 utility classes; reference forest brand tokens via CSS custom properties or the `tokens.ts` module for programmatic SVG values.
- No artificial `.phone-shell` wrappers or simulator bezels.
- Touch targets: 44px minimum on all interactive elements.
- One task closes only with its named behavior and narrow verification.
- Do not run project-wide formatters, linters, or test suites inside tasks.

## Phase 0 — Tokens and baseline

- [ ] 0.1 Create `tokens.ts` exporting forest brand color constants (`forest`, `ink`, `surface`, `line`), radius scale, and shadow scale as typed `const` objects.
- [ ] 0.2 Verify `types.ts` exports `WorkStage`, `WorkTemplate`, `PartnerSlot`, `DealChainNode`, `DealChainCombination`, and `ActingContextData` unchanged.
- [ ] 0.3 Create `__tests__/` directory with Vitest configuration importing from `@testing-library/react`.

### Gate 0

Token module compiles. Existing `types.ts` unchanged. Test harness runs an empty suite.

## Phase 1 — Layout shell primitives

- [ ] 1.1 Implement `AppLayout.tsx`: responsive shell with sticky top bar slot, scrollable body, and sticky bottom dock slot. Full-bleed mobile, `max-w-2xl mx-auto` desktop. No phone bezels.
- [ ] 1.2 Implement `StickyDock.tsx`: pill-dot step indicators, primary action button (44px target), mode-toggle button. Props: `currentStep`, `totalSteps`, `actionLabel`, `onAction`, `mode`, `onModeToggle`.
- [ ] 1.3 Implement `StepWizardHeader.tsx`: pill-dot progress (`● ○ ○`), smooth CSS color transition, active step label, counter text. Props: `currentStep`, `totalSteps`, `stepLabels`.
- [ ] 1.4 Write `AppLayout.test.tsx`: assert desktop container has `max-w-2xl`, mobile has full width; assert top bar and dock slots render children.
- [ ] 1.5 Write `StickyDock.test.tsx`: assert correct number of dots rendered, active dot has forest fill, primary button fires `onAction`, mode toggle fires `onModeToggle` with toggled value, action button respects `actionDisabled`.
- [ ] 1.6 Write `StepWizardHeader.test.tsx`: assert dot count matches `totalSteps`, active dot index matches `currentStep`, step label text matches `stepLabels[currentStep - 1]`.

### Gate 1

`AppLayout`, `StickyDock`, and `StepWizardHeader` render with correct responsive behavior and pass unit tests.

## Phase 2 — Work Pipeline DAG canvas

- [ ] 2.1 Implement `WorkPipelineCanvas.tsx` linear topology: render `WorkStage[]` as horizontal node chain with SVG line connectors, stage colors from data, scrollable container with 3px themed scrollbar.
- [ ] 2.2 Add parallel topology rendering: detect stages with `lane: 'top' | 'btm'`, render fork Bézier SVG curve, stack lane nodes vertically, render join Bézier, continue center nodes.
- [ ] 2.3 Add branch topology rendering: detect `GATE` prefix in `stage.num`, render diamond decision node, fork YES/NO paths, converge at next sequential node.
- [ ] 2.4 Add SLA computation utility: parse `dur` strings (`'15m'` → `15`), compute critical-path total by topology type (linear sum, parallel max-of-lanes, branch max-of-paths).
- [ ] 2.5 Add compact mode: reduced node size, no description text, suitable for inline DAG previews in Deal Chain slides.
- [ ] 2.6 Add interactive mode: stage click handler, selected-stage highlight ring.
- [ ] 2.7 Write `WorkPipelineCanvas.test.tsx`:
  - Assert linear topology renders correct number of stage nodes.
  - Assert parallel topology renders fork/join SVG paths.
  - Assert branch topology renders diamond gate node.
  - Assert SLA computation: linear 4-stage fixture → `65m`; parallel fixture → correct critical path.
  - Assert `aria-label` contains template title.
  - Assert compact mode omits description text.
  - Assert `onStageSelect` fires with correct `stageId`.

### Gate 2

`WorkPipelineCanvas` renders all three topologies, computes SLA correctly, and passes unit tests.

## Phase 3 — Deal Chain carousel

- [ ] 3.1 Implement `DealChainCarousel.tsx`: horizontal `scroll-snap` deck, slide cards with combination title/icon, hidden scrollbar.
- [ ] 3.2 Add compact DAG preview per slide: inline node chain rendering `DealChainNode[]` as `[ ROLE ₱cost ]` connected pills.
- [ ] 3.3 Add slot binder rows: role, partner name / `Open Slot`, cost, `[ Change ▾ ]` button (44px target).
- [ ] 3.4 Add pagination controls: `‹ Prev` / `Next ›` buttons, dot indicators, `Option {n} of {total}` counter.
- [ ] 3.5 Add scroll-snap sync: detect settled scroll position, compute `activeIndex`, call `onSlideChange`. Wire Prev/Next to `scrollTo`.
- [ ] 3.6 Add catalog attachment button: full-width `⑂ Attach` trigger calling `onAttachCatalog`.
- [ ] 3.7 Write `DealChainCarousel.test.tsx`:
  - Assert correct number of slides rendered for 2-combination fixture.
  - Assert pagination dots match combination count.
  - Assert counter text shows `Option 1 of 2`.
  - Assert `‹ Prev` disabled on first slide; `Next ›` disabled on last.
  - Assert slot binder rows render partner name or `Open Slot`.
  - Assert `onSlotChange` fires with combination ID and slot index.
  - Assert `onAttachCatalog` fires on attach button tap.

### Gate 3

`DealChainCarousel` renders slides with compact DAGs, paginated navigation, and slot binders. Unit tests pass.

## Phase 4 — Glovo wave modal and editable stage row

- [ ] 4.1 Implement `GlovoWaveModal.tsx`: fixed overlay, asymmetric SVG wave cap, pinned header with title/search/filter chips, scrollable body, pinned bottom action bar.
- [ ] 4.2 Add focus trap: trap focus within modal when `open`, return focus on close.
- [ ] 4.3 Add search and filter chip interaction: `onSearchChange`, `onFilterSelect` callbacks.
- [ ] 4.4 Implement `EditableStageRow.tsx`: title input (1px border, `#FAFCFB` bg), clock-icon duration pill with numeric input, scope description, camera-icon evidence tag, `✕` remove button (44px target).
- [ ] 4.5 Write `GlovoWaveModal.test.tsx`:
  - Assert modal renders when `open=true`, absent when `open=false`.
  - Assert `role="dialog"` and `aria-modal="true"`.
  - Assert `aria-labelledby` references title element.
  - Assert search input fires `onSearchChange`.
  - Assert filter chip tap fires `onFilterSelect`.
  - Assert backdrop click fires `onClose`.
- [ ] 4.6 Write `EditableStageRow.test.tsx`:
  - Assert title input renders with stage title value.
  - Assert duration input has `type="number"`, `min="1"`, `max="480"`, `step="5"`.
  - Assert duration input has `inputMode="numeric"` for mobile keypad.
  - Assert evidence input renders camera icon.
  - Assert `onChange` fires with correct `(stageId, field, value)` on title edit.
  - Assert `✕` button fires `onRemove(stageId)`.
  - Assert remove button has minimum 44px touch target.

### Gate 4

`GlovoWaveModal` and `EditableStageRow` render correctly with accessibility attributes and pass unit tests.

## Phase 5 — Integration verification

- [ ] 5.1 Create a minimal composition fixture (not a route — a test-only render) combining `AppLayout` + `StepWizardHeader` + `StickyDock` + `WorkPipelineCanvas` + `EditableStageRow` to verify composability without prop conflicts.
- [ ] 5.2 Run `npx vitest run resources/js/components/mobile/__tests__/` — all component tests pass.
- [ ] 5.3 Run `npx tsc --noEmit` on the mobile components tree — no type errors.
- [ ] 5.4 Verify all components export from an index barrel (`resources/js/components/mobile/index.ts`) for clean imports by downstream pages.

### Gate 5

All seven components compose without conflicts, all unit tests pass, TypeScript compiles cleanly, and barrel export is available.

## Completion handoff

After this packet passes, `02-creation-trinity-service-product` imports these components to build `CreateService.tsx`, `CreateProduct.tsx`, and `CreateRequest.tsx` pages with Inertia routes, form state management, and backend integration.
