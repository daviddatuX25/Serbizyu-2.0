# Design: High-Fidelity Frontend Foundation

## Product stance

Serbizyu should feel neighborly, capable, and trustworthy without looking like a government form or generic SaaS dashboard. The visual language uses a warm neutral canvas, deep forest ink, strong emerald action color, mango/coral state accents, intentional typography, compact useful density, and restrained motion.

## Application structure

```text
frontend/
├── src/
│   ├── api/          # endpoint-shaped mock functions + React Query hooks
│   ├── components/   # shell, product composites, UI primitives
│   ├── data/         # deterministic fictional fixtures
│   ├── pages/        # Home, Explore, Deal Room, Payments, Pattern Lab
│   ├── types/        # domain/view contracts and locked decisions
│   └── styles/       # tokens, Tailwind layers, visual system
└── dist → ../docs/app/
```

## Routing and state

- Hash routing is used for GitHub Pages review; Laravel/Inertia will own server routes later.
- Role is a single application-level state persisted in `localStorage`.
- React Query owns server-shaped fixtures.
- Request-composer draft and UI overlays use local React state.
- Mock functions map one-to-one to future actions; components do not import fixture storage directly.

## Primary surfaces

### Home
One role-adaptive home route. The role switcher changes the task hierarchy, not the underlying shared records.

### Explore
One discovery surface for service listings and open requests with usable filters and detailed cards.

### Request composer
One overlay/continuous flow with progressive disclosure; no page per step.

### Deal Room
One coherent workspace with:
- status/next action;
- Work plan and evidence;
- separate payment obligation;
- message thread;
- event timeline;
- recovery/support actions.

### Payments
Lane chooser and obligation detail. External Cash supports independent two-sided attestations. Sandbox lanes cannot lose their labels.

### Pattern Lab
The real high-fidelity UI kit: foundations, primitives, states, composites, air-gap QR transfer exploration, and archetype composer.

## Responsive strategy

- Desktop: collapsible left navigation, top context bar, dense split compositions.
- Tablet: compact sidebar / two-column content.
- Mobile: bottom navigation, stacked panels, persistent primary actions, no phone wrapper.

## Accessibility

- Keyboard-visible focus states.
- Icon plus text for important controls.
- 44px minimum interactive targets.
- Status never communicated by color alone.
- Plain-language meaning, next actor, and recovery accompany internal states.
- Reduced-motion media query disables nonessential transitions.
