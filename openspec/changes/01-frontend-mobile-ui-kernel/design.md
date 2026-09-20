# Design: Frontend Mobile UI Kernel

Status: PROPOSED  
Change: `01-frontend-mobile-ui-kernel`

## 1. Design objective

Extract seven deep reusable React modules encoding the Serbizyu 2.0 mobile-first design language — responsive shells, step wizards, DAG canvases, carousel decks, catalog modals, and editable stage rows — as typed, composable primitives that every downstream page consumes without reimplementing layout math, SVG curve rendering, or scroll-snap pagination.

## 2. File tree

```text
resources/js/components/mobile/
  types.ts                     # Existing canonical domain interfaces (untouched)
  tokens.ts                    # Forest brand design tokens as TS constants
  AppLayout.tsx                # Responsive mobile-first shell
  StickyDock.tsx               # Fixed bottom navigation dock
  StepWizardHeader.tsx         # Pill-dot step progress header
  WorkPipelineCanvas.tsx       # Light-mode horizontal DAG canvas
  DealChainCarousel.tsx        # Horizontal scroll-snap carousel deck
  GlovoWaveModal.tsx           # Asymmetric wave-cap modal overlay
  EditableStageRow.tsx         # Milestone editing row
  __tests__/
    AppLayout.test.tsx
    StickyDock.test.tsx
    StepWizardHeader.test.tsx
    WorkPipelineCanvas.test.tsx
    DealChainCarousel.test.tsx
    GlovoWaveModal.test.tsx
    EditableStageRow.test.tsx
```

## 3. Design tokens module (`tokens.ts`)

Export forest brand tokens as typed constants so components reference tokens, not hardcoded hex strings. Tailwind CSS v4 will reference the same values via `@theme` or CSS custom properties; the TS module exists for programmatic SVG fill/stroke and dynamic style computation.

```ts
export const forest = {
  900: '#06362e',
  800: '#0a4d41',
  700: '#0a574a',
  600: '#0d715f',
  500: '#17866f',
  100: '#c6eadc',
  50:  '#e8f7f1',
} as const;

export const ink = {
  DEFAULT: '#12201c',
  soft:    '#4d655a',
  muted:   '#64748b',
  subtle:  '#94a3b8',
} as const;

export const surface = {
  canvas:     '#F4F6F5',
  white:      '#FFFFFF',
  input:      '#FAFCFB',
  dagCanvas:  '#F8FAFC',
} as const;

export const line = {
  DEFAULT:  '#E2E8F0',
  subtle:   '#F1F5F9',
  input:    '#D1D5DB',
  inputAlt: '#CBD5E1',
} as const;

export const radius = {
  sm:   '8px',
  md:   '14px',
  lg:   '20px',
  pill: '9999px',
} as const;

export const shadow = {
  sm:   '0 1px 3px rgba(10, 87, 74, 0.06)',
  md:   '0 4px 14px rgba(10, 87, 74, 0.08)',
  dock: '0 -4px 20px rgba(18, 32, 28, 0.08)',
} as const;
```

## 4. Component contracts

### 4.1 `AppLayout`

Responsive shell providing the mobile-first page frame.

```ts
interface AppLayoutProps {
  /** Top bar content (back button, title, draft pill, save) */
  topBar?: React.ReactNode;
  /** Sticky bottom dock content */
  dock?: React.ReactNode;
  /** Page body content, scrollable */
  children: React.ReactNode;
  /** Additional CSS class on the outer container */
  className?: string;
}
```

**Rendering contract:**

- Outer: `min-h-dvh flex flex-col`. No artificial `.phone-shell` wrapper.
- Mobile (<640px): full-bleed `w-full`.
- Desktop (≥1024px): `max-w-2xl mx-auto` centered container with `min-h-dvh`.
- Top bar: sticky `top-0 z-40`, surface background, bottom border `--line`.
- Body: `flex-1 overflow-y-auto`.
- Dock: sticky `bottom-0 z-40`, surface background, `--shadow-dock` elevation.

### 4.2 `StickyDock`

Fixed bottom action bar used in every guided-mode creation form.

```ts
interface StickyDockProps {
  /** Current step (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Primary action button label */
  actionLabel: string;
  /** Callback when primary action is tapped */
  onAction: () => void;
  /** Whether primary action is disabled */
  actionDisabled?: boolean;
  /** Current form mode */
  mode: 'guided' | 'advanced';
  /** Callback to toggle mode */
  onModeToggle: () => void;
}
```

**Rendering contract:**

- Background: white surface, `--shadow-dock` upward shadow.
- Top row: pill-dot indicators + primary action button (`min-h-[44px] min-w-[44px]`).
- Bottom row: mode-switcher button (`⚡ Switch to all-in-one form` / `⚡ Switch to guided steps`).
- Primary button uses `--forest-700` background, white text, `--radius-md` corners.
- All tap targets ≥ 44px.

### 4.3 `StepWizardHeader`

Step progress visualization displayed above the active form card.

```ts
interface StepWizardHeaderProps {
  /** Current step (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Array of step labels */
  stepLabels: string[];
  /** Optional step subtitle */
  subtitle?: string;
}
```

**Rendering contract:**

- Pill dots rendered as circles: filled `--forest-600` for completed/active, hollow `--line` border for future.
- Smooth CSS transition on dot fill (`transition-colors duration-300`).
- Active step label displayed below dots in `--ink` color; inactive labels hidden on mobile, visible on desktop.
- Counter text: `Step {n} of {total}` in `--ink-muted`.

### 4.4 `WorkPipelineCanvas`

Light-mode horizontal scrollable DAG canvas. The core visual primitive for Work Execution Pipelines.

```ts
import { WorkStage, WorkTemplate } from './types';

interface WorkPipelineCanvasProps {
  /** Work template providing topology metadata */
  template: WorkTemplate;
  /** Array of stages to render */
  stages: WorkStage[];
  /** Whether stage nodes are interactive (clickable to select/edit) */
  interactive?: boolean;
  /** Callback when a stage node is tapped */
  onStageSelect?: (stageId: string) => void;
  /** ID of the currently selected/highlighted stage */
  selectedStageId?: string;
  /** Compact mode for inline DAG previews (smaller nodes, no labels) */
  compact?: boolean;
}
```

**Rendering contract:**

- Container: `background: var(--surface-dagCanvas)`, `border: 1.5px solid var(--line)`, `border-radius: var(--radius-md)`, `padding: 10px 12px`, `overflow-x: auto`.
- Themed scrollbar: 3px height, `rgba(13, 113, 95, 0.25)` thumb, transparent track.
- **Linear topology** (`flowType: 'linear'`): Stage nodes in a horizontal row connected by straight SVG lines. Each node shows `[{num} {title} {dur}]`.
- **Parallel topology** (`flowType: 'parallel'`): Fork SVG quadratic Bézier curve from a split point → vertically stacked lane nodes (distinguished by `stage.lane: 'top' | 'btm'`) → Join SVG curve → subsequent center nodes.
- **Branch topology** (`flowType: 'branch'`): Decision gate node (diamond shape with `GATE` num prefix) → conditional fork paths (YES/NO labels) → convergence node.
- Node colors: use `stage.color` (text) and `stage.bg` (background) from data.
- Compact mode: nodes render as small pills without description, suitable for inline Deal Chain DAG previews.
- `aria-label` on canvas container: `"Work execution pipeline: {template.title}"`.

**SVG curve math:**

```
Fork curve:  M(x1, y1) Q(cx, cy, x2, y2)
  where cx = x1 + (x2-x1)/2, cy = y1 (horizontal control point for smooth curve)

Join curve:  M(x1, y1) Q(cx, cy, x2, y2)
  where cx = x1 + (x2-x1)/2, cy = y2 (horizontal control point for smooth convergence)
```

**SLA computation:**

Total SLA is derived by summing stage durations along the critical path:
- Linear: sum of all `dur` values.
- Parallel: sum of sequential segments + max of parallel lane durations.
- Branch: sum of sequential segments + max of conditional branch durations.

Duration parsing: extract numeric value from `dur` string (e.g., `'15m'` → `15`).

### 4.5 `DealChainCarousel`

Horizontal paginated carousel deck for Deal Chain partner combination selection.

```ts
import { DealChainCombination } from './types';

interface DealChainCarouselProps {
  /** Array of deal chain combinations to display */
  combinations: DealChainCombination[];
  /** Index of the currently active slide */
  activeIndex: number;
  /** Callback when active slide changes */
  onSlideChange: (index: number) => void;
  /** Callback when the "Attach" catalog button is tapped */
  onAttachCatalog: () => void;
  /** Callback when a partner slot "Change" button is tapped */
  onSlotChange?: (combinationId: string, slotIndex: number) => void;
  /** Label for the catalog attachment button */
  attachLabel?: string;
}
```

**Rendering contract:**

- Deck container: `display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 10px; scrollbar-width: none;` (hide scrollbar).
- Each slide: `scroll-snap-align: start; min-width: 100%; flex-shrink: 0;`.
- Slide content: combination title, icon, compact inline DAG preview (reuses `WorkPipelineCanvas` in compact mode or renders a simplified inline `[ ROLE ₱cost ] ── [ ROLE ₱cost ]` chain).
- Slot binder rows: role label, partner name (or `Open Slot`), cost, `[ Change ▾ ]` button (44px target).
- Pagination controls below the deck:
  - `‹ Prev` button (disabled on first slide).
  - Dot indicators: filled `--forest-600` for active, hollow for inactive.
  - Counter: `Option {n} of {total}`.
  - `Next ›` button (disabled on last slide).
- Attach catalog button: full-width, `--forest-50` background, `--forest-700` text, `⑂` prefix icon.

**Scroll-snap sync:**

On scroll end, compute `activeIndex` from `scrollLeft / slideWidth` and call `onSlideChange`. Prev/Next buttons programmatically scroll via `scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' })`.

### 4.6 `GlovoWaveModal`

Full-screen modal overlay with Glovo-inspired asymmetric wave cap.

```ts
interface GlovoWaveModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal subtitle */
  subtitle?: string;
  /** Search bar placeholder */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Callback on search input change */
  onSearchChange?: (value: string) => void;
  /** Filter chip labels */
  filterChips?: string[];
  /** Currently active filter chip index */
  activeFilterIndex?: number;
  /** Callback when a filter chip is tapped */
  onFilterSelect?: (index: number) => void;
  /** Scrollable body content (catalog cards) */
  children: React.ReactNode;
  /** Bottom action bar content (e.g., "Build Custom in Studio" link) */
  bottomAction?: React.ReactNode;
}
```

**Rendering contract:**

- Overlay: fixed fullscreen `inset-0 z-50`, semi-transparent backdrop.
- Container: white surface, full viewport height on mobile, centered max-width on desktop.
- Wave cap SVG at the top of the modal body (overlapping the backdrop):
  ```svg
  <svg viewBox="0 0 390 34" preserveAspectRatio="none" className="w-full block">
    <path d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z" fill="#FFFFFF" />
  </svg>
  ```
- Pinned header (below wave): title, subtitle, search `<input>`, horizontal scrollable filter chips. Never scrolls off-screen.
- Scrollable body: `overflow-y: auto`, thin 3px themed scrollbar matching the DAG canvas style.
- Pinned bottom action bar: sticky at modal bottom, surface background with top border.
- Close: tapping backdrop or explicit close button.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on title.
- Focus trap within the modal when open.

### 4.7 `EditableStageRow`

Visibly editable milestone row for Work Pipeline stage editing.

```ts
import { WorkStage } from './types';

interface EditableStageRowProps {
  /** The stage data */
  stage: WorkStage;
  /** Stage index (for ordering display) */
  index: number;
  /** Callback when any stage field changes */
  onChange: (stageId: string, field: keyof WorkStage, value: string) => void;
  /** Callback when the remove button is tapped */
  onRemove: (stageId: string) => void;
  /** Whether the row is read-only */
  readOnly?: boolean;
}
```

**Rendering contract:**

- Container: `border: 1px solid var(--line-input)`, `background: var(--surface-input)`, `border-radius: var(--radius-sm)`, `padding: 12px`.
- Stage title input: full-width text input with `1px #D1D5DB border`, `#FAFCFB` background, `focus:border-[var(--forest-600)]` ring.
- Duration pill: inline-flex container with:
  - Green clock SVG icon (16px, `--forest-600` fill).
  - `<input type="number" min="1" max="480" step="5">` with `inputMode="numeric"` for mobile numeric keypad.
  - Monospace `"m"` suffix label.
- Scope description input: optional text input below title.
- Evidence requirement input: inline-flex with blue camera SVG icon (16px, `#3B82F6` fill) + text input for evidence description.
- Remove button: `✕` icon, `min-w-[44px] min-h-[44px]` touch target, positioned top-right.
- All interactive elements: minimum 44px touch target height.

## 5. Interaction sequences

### 5.1 Guided mode step navigation

```
User taps "Continue →" in StickyDock
  → StickyDock calls onAction()
  → Parent increments currentStep state
  → StepWizardHeader animates pill dot transition
  → AppLayout body scrolls to top of new step card
  → StickyDock updates dot indicators
  → On final step: actionLabel becomes "Publish Listing ✓"
```

### 5.2 Mode toggle (Guided ↔ All-in-One)

```
User taps "⚡ Switch to all-in-one form" in StickyDock
  → StickyDock calls onModeToggle()
  → Parent sets mode to 'advanced'
  → StepWizardHeader hides (or collapses)
  → All form cards render simultaneously in vertical scroll
  → StickyDock label changes to "⚡ Switch to guided steps"
  → Dock step dots hidden; single primary action visible
```

### 5.3 Deal Chain carousel pagination

```
User swipes left on carousel deck
  → Scroll-snap settles on next slide
  → IntersectionObserver / scrollend event fires
  → onSlideChange(newIndex) updates parent state
  → Pagination dots and counter update
  → "‹ Prev" enables; "Next ›" disables if last

User taps "Next ›"
  → Container.scrollTo({ left: (activeIndex+1) * slideWidth, behavior: 'smooth' })
  → Same scroll-snap resolution path
```

### 5.4 Work Pipeline DAG rendering

```
Parent passes stages[] and template to WorkPipelineCanvas
  → Canvas reads template.flowType
  → Linear: render nodes left-to-right, SVG line connectors
  → Parallel: identify forked stages by lane !== 'center'
    → Render fork Bézier from last center node
    → Stack top/btm lane nodes vertically
    → Render join Bézier to next center node
  → Branch: identify GATE stage (num starts with 'GATE')
    → Render diamond node
    → Fork to YES/NO branches
    → Converge at next sequential node
  → Compute totalSLA via critical path analysis
  → Emit aria-label with template title and total SLA
```

### 5.5 Stage editing with live DAG sync

```
User edits stage title in EditableStageRow
  → onChange(stageId, 'title', newValue) propagates to parent
  → Parent updates stages[] state
  → WorkPipelineCanvas re-renders with updated node label
  → Total SLA recalculates if dur changed

User taps "＋ Add Stage Node"
  → Parent appends new WorkStage to stages[]
  → EditableStageRow renders new row
  → WorkPipelineCanvas appends node to DAG

User taps ✕ on EditableStageRow
  → onRemove(stageId) propagates to parent
  → Parent removes stage from stages[]
  → WorkPipelineCanvas removes node, reflows connectors
  → SLA recalculates
```

### 5.6 GlovoWaveModal catalog interaction

```
User taps "Change ▾" on Work Pipeline catalog card
  → Parent sets modal open=true
  → GlovoWaveModal renders with overlay, wave cap, pinned header
  → Focus trapped inside modal

User types in search input
  → onSearchChange(value) filters displayed catalog cards

User taps a filter chip
  → onFilterSelect(index) highlights chip, filters cards

User taps a catalog card
  → Parent receives selection, closes modal
  → Work Pipeline updates to selected template
  → Stages list repopulates from template.stages

User taps backdrop
  → onClose() fires, modal unmounts
  → Focus returns to triggering element
```

## 6. Responsive behavior

| Breakpoint | Shell | DAG Canvas | Carousel | Modal |
|---|---|---|---|---|
| <640px (mobile) | Full-bleed 100vw, bottom sticky dock | Horizontal scroll, touch swipe | Full-width slides, swipe nav | Full-screen overlay |
| 640–1023px (tablet) | `max-w-xl mx-auto` | Horizontal scroll, wider nodes | Full-width slides | Centered max-w-lg |
| ≥1024px (desktop) | `max-w-2xl mx-auto` | All nodes visible if ≤6, scroll if more | Full-width slides within container | Centered max-w-xl, rounded corners |

## 7. Accessibility contract

- All interactive elements: `min-w-[44px] min-h-[44px]` (WCAG 2.5.8 target size).
- `WorkPipelineCanvas`: `role="img"`, `aria-label="Work execution pipeline: {title}"`.
- `GlovoWaveModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap.
- `StickyDock` pill dots: `aria-label="Step {n} of {total}"`, `aria-current="step"` on active.
- `EditableStageRow` duration input: `aria-label="Duration in minutes"`, `inputMode="numeric"`.
- `DealChainCarousel` pagination: `aria-label="Deal chain options"`, `aria-roledescription="carousel"`, each slide `role="tabpanel"`.

## 8. Test strategy

- **Unit tests (Vitest + React Testing Library):** Assert prop contracts, computed outputs (SLA, pagination index), accessibility attributes, mode toggle behavior, and callback invocations.
- **No Playwright or browser tests in this change.** Browser verification is deferred to `02-creation-trinity-service-product` where components are composed into real page routes.
- **No snapshot tests.** Test observable behavior, not rendered markup.

## 9. Dependencies

- React 18, TypeScript (existing).
- Tailwind CSS v4 (existing).
- No new npm dependencies. SVG rendering is inline JSX. Scroll-snap is native CSS. Focus trap uses native `inert` attribute or a minimal utility.
