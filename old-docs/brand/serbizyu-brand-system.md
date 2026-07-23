# Serbizyu — Brand System & UI Specification
*Finalized for shadcn/ui + Tailwind CSS. All values are tokens, not suggestions.*

---

## 1. Brand Positioning

**Serbizyu is the trusted neighbor who knows everyone.** Not a faceless platform, not a corporate directory. The visual language should feel like a well-organized community bulletin board — warm, legible, and quietly competent.

**Three brand attributes:**
1. **Trustworthy** — escrow, verification, and transparency are structural, not decorative.
2. **Local** — rooted in Philippine geography, language, and commerce norms.
3. **Capable** — the tools work, the maps are accurate, the payments clear.

**Anti-attributes (what we are not):**
- Corporate blue/gray (every B2B SaaS)
- Neon/gradient-heavy (every crypto/Web3 product)
- Minimal to the point of emptiness (every Apple clone)

---

## 2. Color System

### Primary Palette (CSS Variables)

```css
:root {
  /* Brand */
  --serbizyu-green-50:  #f0fdf4;
  --serbizyu-green-100: #dcfce7;
  --serbizyu-green-200: #bbf7d0;
  --serbizyu-green-300: #86efac;
  --serbizyu-green-400: #4ade80;
  --serbizyu-green-500: #22c55e;  /* Primary action */
  --serbizyu-green-600: #16a34a;  /* Primary hover */
  --serbizyu-green-700: #15803d;  /* Primary active */
  --serbizyu-green-800: #166534;
  --serbizyu-green-900: #14532d;
  --serbizyu-green-950: #052e16;

  /* Trust / Escrow */
  --serbizyu-trust-50:  #eff6ff;
  --serbizyu-trust-100: #dbeafe;
  --serbizyu-trust-500: #3b82f6;  /* Escrow badges, verification */
  --serbizyu-trust-600: #2563eb;
  --serbizyu-trust-700: #1d4ed8;

  /* Warm Neutral (backgrounds, surfaces) */
  --serbizyu-warm-50:  #fafaf9;
  --serbizyu-warm-100: #f5f5f4;
  --serbizyu-warm-200: #e7e5e4;
  --serbizyu-warm-300: #d6d3d1;
  --serbizyu-warm-400: #a8a29e;
  --serbizyu-warm-500: #78716c;
  --serbizyu-warm-600: #57534e;
  --serbizyu-warm-700: #44403c;
  --serbizyu-warm-800: #292524;
  --serbizyu-warm-900: #1c1917;
  --serbizyu-warm-950: #0c0a09;

  /* Accent (CTA, highlights) */
  --serbizyu-amber-400: #fbbf24;
  --serbizyu-amber-500: #f59e0b;  /* Secondary CTA, featured */
  --serbizyu-amber-600: #d97706;

  /* Semantic */
  --serbizyu-success: #22c55e;
  --serbizyu-warning: #f59e0b;
  --serbizyu-error:   #ef4444;
  --serbizyu-info:    #3b82f6;
}

.dark {
  /* Dark mode: invert warm neutrals, keep brand hues */
  --serbizyu-warm-50:  #0c0a09;
  --serbizyu-warm-100: #1c1917;
  --serbizyu-warm-200: #292524;
  --serbizyu-warm-300: #44403c;
  --serbizyu-warm-400: #57534e;
  --serbizyu-warm-500: #78716c;
  --serbizyu-warm-600: #a8a29e;
  --serbizyu-warm-700: #d6d3d1;
  --serbizyu-warm-800: #e7e5e4;
  --serbizyu-warm-900: #f5f5f4;
  --serbizyu-warm-950: #fafaf9;
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Serbizyu semantic aliases
        brand: {
          DEFAULT: 'var(--serbizyu-green-500)',
          hover: 'var(--serbizyu-green-600)',
          active: 'var(--serbizyu-green-700)',
          subtle: 'var(--serbizyu-green-50)',
        },
        trust: {
          DEFAULT: 'var(--serbizyu-trust-500)',
          subtle: 'var(--serbizyu-trust-50)',
        },
        accent: {
          DEFAULT: 'var(--serbizyu-amber-500)',
          subtle: 'var(--serbizyu-amber-50)',
        },
        surface: {
          DEFAULT: 'var(--serbizyu-warm-50)',
          raised: 'var(--serbizyu-warm-100)',
          overlay: 'var(--serbizyu-warm-200)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

---

## 3. Typography

| Role | Font | Weight | Size (base) | Line Height | Usage |
|---|---|---|---|---|---|
| Display | Plus Jakarta Sans | 700 | 2.25rem (36px) | 1.2 | Page titles, hero |
| Heading | Inter | 600 | 1.5rem (24px) | 1.3 | Section headers |
| Subheading | Inter | 600 | 1.125rem (18px) | 1.4 | Card titles, list headers |
| Body | Inter | 400 | 1rem (16px) | 1.6 | Default text |
| Body Small | Inter | 400 | 0.875rem (14px) | 1.5 | Captions, metadata |
| Label | Inter | 500 | 0.75rem (12px) | 1.4 | Form labels, badges |
| Mono | JetBrains Mono | 400 | 0.875rem | 1.5 | Order IDs, transaction refs |

**Rationale:** Inter is the most legible geometric sans at small sizes, critical for mobile web. Plus Jakarta Sans adds warmth for display text without being decorative. JetBrains Mono for financial/transaction data signals precision.

---

## 4. Spacing & Layout

- **Base unit:** 4px (0.25rem)
- **Container max-width:** 1280px (7xl)
- **Page padding:** 16px mobile, 24px tablet, 32px desktop
- **Card padding:** 20px (5 units)
- **Section gap:** 48px (12 units) desktop, 32px mobile

**Layout principle:** Mobile-first, single-column default. Two-column only at `lg:` (1024px+). No hamburger menus for primary navigation — bottom tab bar on mobile, top nav on desktop.

---

## 5. shadcn/ui Component Configuration

**Initialize with:**
```bash
npx shadcn-ui@latest init
# Style: New York
# CSS variables: Yes
# Tailwind config: tailwind.config.js
# Components: resources/js/components/ui
# Utils: resources/js/lib/utils
# React Server Components: No (Inertia is client-rendered)
# TypeScript: Yes
```

**Required components (install explicitly):**
- `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`
- `card`, `badge`, `avatar`, `separator`, `skeleton`
- `dialog`, `drawer`, `dropdown-menu`, `popover`, `tooltip`, `hover-card`
- `tabs`, `accordion`, `collapsible`
- `form`, `label`, `calendar`, `date-picker`
- `table`, `data-table` (for ops dashboards)
- `toast`, `sonner` (notifications)
- `command` (search palettes)
- `sheet` (mobile nav)
- `slider` (price range, radius filters)
- `progress` (profile completion, work milestone)
- `toggle`, `toggle-group`
- `scroll-area` (chat, long lists)
- `aspect-ratio` (media grids)
- `carousel` (listing photo galleries)
- `chart` (ops dashboards — use Recharts via shadcn)

**Custom components to build on top:**
- `TrustBadge` — verification tier + completion score, consistent across listing card, profile, distributed content
- `EscrowStatusPill` — funds held / released / disputed, with timestamp
- `WorkProgressTracker` — milestone stepper for service orders, simplified tracker for product orders
- `ChannelIcon` — Facebook, Messenger, SMS, TikTok, etc. with connection status
- `GeoMap` — Mapbox wrapper with Serbizyu styling
- `PriceDisplay` — PHP formatting, range vs fixed, negotiable indicator

---

## 6. Iconography

**Library:** Lucide React (shadcn default, tree-shakeable, consistent stroke width).

**Custom icons needed:**
- Tricycle (for transport category)
- Escrow shield (funds held)
- Channel logos (Facebook, Messenger, TikTok, Shopee, Lazada) — use simple-icons or custom SVGs, not Lucide

---

## 7. Imagery & Illustration

**Photography style:** Real Philippine service contexts — actual barangay streets, real servicers at work, natural lighting. No stock photos of white people in offices.

**Illustration style:** Warm, geometric, slightly rounded. Think "helpful neighbor drawing on a napkin," not "corporate vector art." Use sparingly: empty states, onboarding, error pages.

**Asset generator output specs:**
- Size: 1200×630px (OG standard)
- Safe zone: 100px margin all sides
- Background: warm-50 to warm-100 gradient, subtle texture
- Foreground: servicer photo (rounded, 200×200), name, category, trust badge, "Book on Serbizyu" CTA
- Font: Plus Jakarta Sans Bold for name, Inter Medium for details

---

## 8. Voice & Tone

| Context | Tone | Example |
|---|---|---|
| Onboarding | Encouraging, patient | "You're 35% done — add a photo to get your first booking." |
| Transaction | Precise, reassuring | "₱1,500 is held in escrow. Release when the work is done." |
| Dispute | Neutral, procedural | "Both parties have 48 hours to submit evidence." |
| Marketing | Warm, local | "Find a trusted plumber in Candon — verified, insured, reviewed by neighbors." |
| Error | Plain, helpful | "That phone number is already registered. Try logging in instead." |

**Bilingual rule:** English is default. Filipino translations for all user-facing strings. Ilocano stretch goal: onboarding and error messages only.

---

## 9. Accessibility Standards

- **Contrast:** All text meets WCAG 2.1 AA (4.5:1 normal, 3:1 large)
- **Focus:** Visible focus rings on all interactive elements, `focus-visible` only
- **Screen readers:** All form inputs have associated labels, all images have alt text, all icon-only buttons have `aria-label`
- **Keyboard:** Full navigation without mouse, logical tab order, skip links
- **Motion:** `prefers-reduced-motion` disables all animations

---

## 10. Dark Mode

**Default:** Light mode. Dark mode is opt-in via user preference, not system default.

**Rationale:** The target user base (PH provincial, mixed device quality) predominantly uses light mode. Dark mode adds testing surface for marginal benefit. Ship it in Phase 2 as a settings toggle, not a media query default.

---

## 11. Print & Export

**Invoice/receipt:** Clean, minimal, black on white. No brand colors except logo. PDF generation via `barryvdh/laravel-dompdf`.

**Marketing asset:** Already specified in §7.

---

*End of Brand System. All tokens are implementation-ready.*
