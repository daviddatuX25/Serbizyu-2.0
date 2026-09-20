# Mobile UI Kernel Capability

Status: PROPOSED  
Change: `01-frontend-mobile-ui-kernel`  
Trace: `docs/design-kit/NON-ADMIN-SPECIFICATION.md` §§1.1–1.4, §4.1–4.3, §5; `docs/architecture/MASTER-SUPERSESSION-AND-REBUILD-BLUEPRINT.md` §6–§7; `resources/js/components/mobile/types.ts`

## ADDED Requirements

### Requirement: Responsive mobile-first layout shell

ID: MUIK-REQ-001

`AppLayout` SHALL render as a full-bleed 100vw layout on viewports below 640px and a centered `max-w-2xl` container on viewports at or above 1024px. It SHALL NOT render any artificial phone-simulator bezel, `.phone-shell` wrapper, or fixed-width container on the production web layout. The shell SHALL provide sticky top bar, scrollable body, and sticky bottom dock slots.

#### Scenario: Mobile viewport renders full-bleed

- GIVEN AppLayout is rendered at a 375px viewport width
- WHEN the outer container is measured
- THEN it occupies 100% of the viewport width
- AND no horizontal padding or max-width constraint clips content
- AND the bottom dock is sticky-positioned at the viewport bottom.

#### Scenario: Desktop viewport centers content

- GIVEN AppLayout is rendered at a 1280px viewport width
- WHEN the outer container is measured
- THEN it has a max-width of `max-w-2xl` (672px)
- AND it is horizontally centered with auto margins
- AND the top bar remains sticky at the container top.

#### Scenario: No phone bezel wrapper

- GIVEN AppLayout is rendered at any viewport width
- WHEN the DOM is inspected
- THEN no element with class `phone-shell`, `phone-frame`, or fixed 390px/844px dimensions exists.

---

### Requirement: Sticky dock with step progress and mode toggle

ID: MUIK-REQ-002

`StickyDock` SHALL render pill-dot step indicators matching the current step state, a primary action button with minimum 44px tap target, and a mode-toggle button. The primary action label SHALL change to the submission label on the final step. All interactive elements SHALL meet the 44px minimum touch target requirement.

#### Scenario: Dock renders correct step indicators

- GIVEN StickyDock receives `currentStep=2` and `totalSteps=3`
- WHEN it renders
- THEN 3 dot indicators are displayed
- AND dots 1 and 2 are filled with `--forest-600` color
- AND dot 3 is hollow with `--line` border.

#### Scenario: Primary action changes on final step

- GIVEN StickyDock receives `currentStep=3`, `totalSteps=3`, `actionLabel="Publish Listing ✓"`
- WHEN it renders
- THEN the primary button displays "Publish Listing ✓"
- AND tapping the button fires the `onAction` callback.

#### Scenario: Mode toggle switches label

- GIVEN StickyDock renders in `mode='guided'`
- WHEN the mode toggle button is tapped
- THEN `onModeToggle` is called
- AND the button label reads "⚡ Switch to all-in-one form".

#### Scenario: Disabled action button

- GIVEN StickyDock receives `actionDisabled=true`
- WHEN it renders
- THEN the primary action button is visually disabled
- AND tapping it does not fire `onAction`.

#### Scenario: Touch target compliance

- GIVEN any interactive element in StickyDock
- WHEN its dimensions are measured
- THEN both width and height are at least 44px.

---

### Requirement: Step wizard header with animated pill dots

ID: MUIK-REQ-003

`StepWizardHeader` SHALL render pill-dot progress indicators with smooth CSS color transitions between states. It SHALL display the active step label and a counter in the format `Step {n} of {total}`.

#### Scenario: Active step label displayed

- GIVEN StepWizardHeader receives `currentStep=1`, `totalSteps=3`, `stepLabels=["Service Identity", "Rates", "Partners"]`
- WHEN it renders
- THEN the visible step label reads "Service Identity"
- AND the counter reads "Step 1 of 3".

#### Scenario: Dot transition on step change

- GIVEN StepWizardHeader displays step 1 of 3
- WHEN `currentStep` changes from 1 to 2
- THEN dot 2 transitions to filled state with a CSS color transition
- AND the step label updates to the second label.

---

### Requirement: Work Pipeline DAG canvas renders all topologies

ID: MUIK-REQ-004

`WorkPipelineCanvas` SHALL render Linear, Parallel (Fork/Join), and Branch (Decision Gate) topologies from `WorkStage[]` data within a light-mode horizontal scrollable canvas. It SHALL use SVG Bézier curves for fork/join connectors, apply stage colors from data, provide a 3px themed scrollbar, and compute total SLA from stage durations along the critical path.

#### Scenario: Linear topology rendering

- GIVEN a WorkTemplate with `flowType='linear'` and 4 stages `[Intake 15m, Coil Wash 20m, Cold Run 15m, Delta Test 15m]`
- WHEN WorkPipelineCanvas renders
- THEN 4 stage nodes are displayed in a horizontal row
- AND each node shows its `num`, `title`, and `dur`
- AND SVG line connectors join adjacent nodes
- AND computed total SLA is 65 minutes.

#### Scenario: Parallel topology rendering

- GIVEN a WorkTemplate with `flowType='parallel'` containing stages where two stages have `lane='top'` and `lane='btm'` respectively
- WHEN WorkPipelineCanvas renders
- THEN a fork SVG Bézier curve branches from the preceding center node
- AND the top-lane and bottom-lane nodes are stacked vertically
- AND a join SVG Bézier curve converges into the subsequent center node
- AND total SLA uses the maximum of parallel lane durations.

#### Scenario: Branch topology rendering

- GIVEN a WorkTemplate with `flowType='branch'` containing a stage with `num='GATE'`
- WHEN WorkPipelineCanvas renders
- THEN the gate stage is rendered as a diamond-shaped decision node
- AND two conditional fork paths are displayed
- AND paths converge at the next sequential node.

#### Scenario: Compact mode for inline previews

- GIVEN WorkPipelineCanvas receives `compact=true`
- WHEN it renders
- THEN stage nodes are rendered as small pills
- AND description text is omitted from nodes.

#### Scenario: Interactive stage selection

- GIVEN WorkPipelineCanvas receives `interactive=true` and `onStageSelect` callback
- WHEN a stage node is tapped
- THEN `onStageSelect` is called with the tapped stage's `id`
- AND the tapped node shows a selection highlight ring.

#### Scenario: Canvas accessibility

- GIVEN WorkPipelineCanvas renders with a template titled "AC Deep Clean Workflow"
- WHEN the canvas container is inspected
- THEN it has `aria-label="Work execution pipeline: AC Deep Clean Workflow"`.

#### Scenario: Themed scrollbar

- GIVEN the canvas contains more nodes than fit in the visible area
- WHEN the canvas container is inspected
- THEN a 3px horizontal scrollbar is present with `rgba(13, 113, 95, 0.25)` thumb color.

---

### Requirement: Deal Chain carousel with scroll-snap pagination

ID: MUIK-REQ-005

`DealChainCarousel` SHALL render `DealChainCombination[]` as a horizontal scroll-snap paginated carousel deck with compact inline DAG previews, slot binder rows, pagination controls (`‹ Prev`, dot indicators, counter, `Next ›`), and a catalog attachment trigger.

#### Scenario: Carousel renders combination slides

- GIVEN DealChainCarousel receives 2 combinations: "Turnkey Sourced Parts" and "Post-Service Safety Audit"
- WHEN it renders
- THEN 2 slides are present in the carousel deck
- AND each slide displays the combination title and icon.

#### Scenario: Compact DAG preview in slides

- GIVEN a combination has nodes `[STORE ₱180, COURIER ₱80, YOU ₱450]`
- WHEN the slide renders
- THEN an inline DAG chain shows `[ STORE ₱180 ] ── [ COURIER ₱80 ] ── [ YOU ₱450 ]`.

#### Scenario: Slot binder rows

- GIVEN a combination has a slot with `name="Danny Express Motorcycle Pool"` and `meta="₱35.00 route fee"`
- WHEN the slide renders
- THEN a slot row shows the role label, "Danny Express Motorcycle Pool", "₱35.00 route fee"
- AND a `[ Change ▾ ]` button with minimum 44px tap target.

#### Scenario: Slot binder shows Open Slot

- GIVEN a combination has a slot with `name="Open Slot"`
- WHEN the slide renders
- THEN the slot row shows "Open Slot" in muted text styling.

#### Scenario: Pagination controls

- GIVEN DealChainCarousel renders with `activeIndex=0` and 2 combinations
- WHEN pagination controls render
- THEN `‹ Prev` button is disabled
- AND `Next ›` button is enabled
- AND dot indicators show first dot filled, second hollow
- AND counter reads "Option 1 of 2".

#### Scenario: Navigate to next slide

- GIVEN the carousel is on slide 1 of 2
- WHEN the user taps `Next ›`
- THEN the deck scrolls smoothly to the second slide
- AND `onSlideChange(1)` is called
- AND dot indicators update to show second dot filled.

#### Scenario: Catalog attachment trigger

- GIVEN DealChainCarousel renders with `attachLabel="⑂ Attach Partner Combination · DEAL CHAIN"`
- WHEN the attach button is tapped
- THEN `onAttachCatalog` is called.

#### Scenario: Carousel accessibility

- GIVEN DealChainCarousel renders
- WHEN the container is inspected
- THEN it has `aria-roledescription="carousel"` and `aria-label="Deal chain options"`.

---

### Requirement: Glovo wave modal with pinned header and scrollable body

ID: MUIK-REQ-006

`GlovoWaveModal` SHALL render a full-screen modal overlay with an asymmetric SVG wave cap, a pinned fixed header (title, search bar, filter chips), a scrollable card body with thin themed scrollbar, and a pinned bottom action bar. It SHALL implement focus trapping and accessible dialog semantics.

#### Scenario: Modal visibility

- GIVEN GlovoWaveModal receives `open=true`
- WHEN the DOM is inspected
- THEN the modal overlay is present
- AND has `role="dialog"` and `aria-modal="true"`.

#### Scenario: Modal hidden

- GIVEN GlovoWaveModal receives `open=false`
- WHEN the DOM is inspected
- THEN no modal overlay or dialog element is rendered.

#### Scenario: Wave cap SVG

- GIVEN GlovoWaveModal is open
- WHEN the modal structure is inspected
- THEN an SVG element with the asymmetric wave path `M 0 16 C 90 2, 140 0, 195 0 ...` is present
- AND it spans the full width of the modal.

#### Scenario: Pinned header does not scroll

- GIVEN GlovoWaveModal body content exceeds viewport height
- WHEN the body is scrolled
- THEN the header (title, search, filter chips) remains fixed at the top
- AND the bottom action bar remains fixed at the bottom.

#### Scenario: Search interaction

- GIVEN GlovoWaveModal renders with `searchPlaceholder="Search work templates..."`
- WHEN the user types "plumbing" in the search input
- THEN `onSearchChange("plumbing")` is called.

#### Scenario: Filter chip selection

- GIVEN GlovoWaveModal renders with `filterChips=["Appliance", "Electrical", "Plumbing"]`
- WHEN the user taps "Plumbing"
- THEN `onFilterSelect(2)` is called.

#### Scenario: Backdrop close

- GIVEN GlovoWaveModal is open
- WHEN the user taps the semi-transparent backdrop area
- THEN `onClose` is called.

#### Scenario: Focus trap

- GIVEN GlovoWaveModal is open
- WHEN the user presses Tab repeatedly
- THEN focus cycles within the modal contents
- AND does not escape to elements behind the overlay.

---

### Requirement: Editable stage row with visible input affordances

ID: MUIK-REQ-007

`EditableStageRow` SHALL render each Work Pipeline stage as a visibly editable row with 1px bordered inputs, a clock-icon duration pill with numeric keyboard input, camera-icon evidence tags, and a 44px remove button. Input fields SHALL never appear as invisible borderless plain text.

#### Scenario: Stage title input rendering

- GIVEN EditableStageRow receives a stage with `title="Coil Wash"`
- WHEN it renders
- THEN a text input displays "Coil Wash"
- AND the input has a visible 1px `#D1D5DB` border
- AND the input has `#FAFCFB` background.

#### Scenario: Duration input with numeric keypad

- GIVEN EditableStageRow renders
- WHEN the duration input is inspected
- THEN it has `type="number"`, `min="1"`, `max="480"`, `step="5"`
- AND `inputMode="numeric"` for mobile numeric keypad activation
- AND a clock SVG icon is displayed to its left
- AND a monospace "m" suffix label is displayed to its right.

#### Scenario: Evidence input with camera icon

- GIVEN EditableStageRow receives a stage with `evidence="Photo of breaker off"`
- WHEN it renders
- THEN a text input displays "Photo of breaker off"
- AND a blue camera SVG icon (`#3B82F6`) is displayed to its left.

#### Scenario: Field change propagation

- GIVEN EditableStageRow renders with `stage.id="s1"`
- WHEN the user edits the title input to "Deep Clean"
- THEN `onChange("s1", "title", "Deep Clean")` is called.

#### Scenario: Stage removal

- GIVEN EditableStageRow renders with `stage.id="s1"`
- WHEN the user taps the ✕ remove button
- THEN `onRemove("s1")` is called.

#### Scenario: Remove button touch target

- GIVEN EditableStageRow renders
- WHEN the ✕ remove button dimensions are measured
- THEN both width and height are at least 44px.

#### Scenario: Read-only mode

- GIVEN EditableStageRow receives `readOnly=true`
- WHEN it renders
- THEN all input fields are disabled
- AND the ✕ remove button is hidden.

---

### Requirement: Forest brand token consistency

ID: MUIK-REQ-008

All mobile UI kernel components SHALL reference forest brand tokens from `tokens.ts` or CSS custom properties. No component SHALL contain hardcoded hex color strings in its JSX markup or inline styles. SVG fill/stroke values that require programmatic color access SHALL use the exported token constants.

#### Scenario: Token reference in component markup

- GIVEN any mobile UI kernel component source file
- WHEN its JSX and inline style expressions are inspected
- THEN no raw hex color strings (e.g., `#06362e`, `#0d715f`, `#D1D5DB`) appear directly
- AND all color references use Tailwind utility classes with CSS custom properties or imported token constants.

---

### Requirement: Composability without prop conflicts

ID: MUIK-REQ-009

The seven mobile UI kernel components SHALL compose within a single `AppLayout` without prop type conflicts, CSS specificity collisions, or z-index stacking errors. `StepWizardHeader` and `StickyDock` SHALL share step state through parent-owned props. `WorkPipelineCanvas` and `EditableStageRow` SHALL share stage data through parent-owned `WorkStage[]` state.

#### Scenario: Full composition render

- GIVEN AppLayout renders with StepWizardHeader in the top bar, StickyDock in the dock, WorkPipelineCanvas and EditableStageRow list in the body
- WHEN the composition mounts
- THEN no TypeScript type errors occur
- AND no CSS conflicts produce invisible or overlapping elements
- AND the StickyDock z-index is above the body scroll content
- AND the StepWizardHeader and StickyDock step dots agree on step state.

#### Scenario: Stage data flows through parent

- GIVEN parent state holds `stages: WorkStage[]`
- WHEN an EditableStageRow fires `onChange(stageId, 'title', 'New Title')`
- THEN the parent updates the stage in state
- AND WorkPipelineCanvas re-renders with the updated node label
- AND no prop drilling bypasses the parent.
