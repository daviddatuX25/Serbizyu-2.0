---
globs: docs/design-kit/**,resources/js/components/**,resources/js/Pages/**
---

# UI Kit & Mobile Design System Invariants

## 1. Signature Glovo Organic Asymmetrical Wave Bottom Sheet (Locked Pattern)
All bottom sheet drawers, menus, and popups (e.g. Order Options, Filter sheets, Photo Pickers, Dispute Drawers, Cart sheets) MUST follow the exact structural contract established in `docs/design-kit/browse-mobile.html`:

### Architecture Contract:
1. **Backdrop Overlay (`.sheet-backdrop` / `.glovo-drawer-overlay`):**
   - `position: absolute; inset: 0; z-index: 50;`
   - `background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);`
   - `display: flex; flex-direction: column; justify-content: flex-end; align-items: center;`
   - `opacity: 0; pointer-events: none; transition: opacity 0.25s ease;`
   - `.open`, `.is-open` -> `opacity: 1; pointer-events: auto;`
2. **Sheet Wrapper (`.glovo-organic-modal` / `.glovo-drawer-sheet`):**
   - `width: 100%; display: flex; flex-direction: column;`
   - `transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);`
   - `max-height: 85%;`
   - **CRITICAL INVARIANT:** MUST have `background: transparent;` and NO border/shadow on the wrapper itself! NEVER set `background: #FFFFFF` on the wrapper, or it will paint over the wave cutout and turn the sheet into a flat, plain rectangle.
   - `.open .glovo-drawer-sheet` -> `transform: translateY(0);`
3. **Asymmetrical Wave Cap (`<svg class="glovo-wave-cap">`):**
   - `<svg class="glovo-wave-cap" viewBox="0 0 390 34" preserveAspectRatio="none">`
   - `<path d="M 0 16 C 90 2, 140 0, 195 0 C 255 0, 315 8, 390 28 L 390 34 L 0 34 Z" fill="#FFFFFF"></path>`
   - CSS: `width: 100%; height: 34px; margin-bottom: -1px; display: block; flex-shrink: 0;`
4. **Content Box (`.glovo-modal-content` / `.drawer-content-box`):**
   - `background: #FFFFFF;`
   - `padding: 6px 20px 28px;`
   - `display: flex; flex-direction: column; gap: 12px;`
   - `overflow-y: auto; -webkit-overflow-scrolling: touch;`
5. **Interior Elements & Tiles:**
   - Option tiles (e.g. `.payment-option-tile`, `.drawer-option-card`, `.photo-cell`, `.upload-tile-btn`) MUST be clean white (`#FFFFFF`) cards with subtle borders (`1.5px solid var(--color-border)`).
   - NEVER use grey fills (`#F8FAFC`, `#F1F5F9`) inside the white drawer space.

## 2. Minimalist UI Philosophy
- **Zero-Nuisance:** Refuse walls of explanatory disclaimers, marketing filler copy ("Saves time by..."), and parenthesis clutter (`(Labor)`, `(Parts)`).
- **Concise Action Copy:** Use clear, active, terse labels (`Photo`, `Rebook Team`, `Review Work & Settle`).
