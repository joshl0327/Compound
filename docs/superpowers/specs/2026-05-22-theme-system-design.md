# Theme System Design
**Date:** 2026-05-22
**Status:** Approved for implementation

## Overview

Replace the hardcoded teal color palette with a CSS custom properties–based theme system supporting two modes — Dark (Warm Charcoal) and Light (Warm Off-White) — with a toggle in the Settings tab and system preference detection on first load. The architecture is explicitly extensible: adding future themes requires only a new CSS variable block, with zero component changes.

---

## Color Tokens

All theme-sensitive colors are expressed as CSS custom properties on `:root`. The active theme is applied by setting `data-theme="dark"` or `data-theme="light"` on the `<html>` element.

### Dark Theme — Warm Charcoal (default for dark system preference)

```css
[data-theme="dark"] {
  --color-bg:           #1d1b18;
  --color-surface:      #252220;
  --color-surface-2:    #2a2724;
  --color-border:       #342f2a;
  --color-text:         #e8e4e0;
  --color-text-muted:   #8a8078;
  --color-text-dim:     #5a5450;
  --color-accent:       #0d9488;
  --color-accent-dim:   rgba(13, 148, 136, 0.12);
}
```

### Light Theme — Warm Off-White (default for light system preference)

```css
[data-theme="light"] {
  --color-bg:           #f2f0ec;
  --color-surface:      #faf9f7;
  --color-surface-2:    #ffffff;
  --color-border:       #ddd9d4;
  --color-text:         #18140f;
  --color-text-muted:   #6b6560;
  --color-text-dim:     #9a9590;
  --color-accent:       #0a7a70;
  --color-accent-dim:   rgba(10, 122, 112, 0.10);
}
```

> **Note:** The teal accent is slightly darkened in light mode (`#0a7a70` vs `#0d9488`) to maintain WCAG AA contrast against light backgrounds.

### Status / Semantic Colors (unchanged in both themes)

These carry meaning independent of theme and must not be altered:

```css
:root {
  --color-green:  #10b981;
  --color-blue:   #60a5fa;
  --color-orange: #f97316;
  --color-amber:  #fbbf24;
  --color-red:    #ef4444;
}
```

### Adding Future Themes

To add a new theme (e.g., "midnight", "high contrast"), add a single CSS block:

```css
[data-theme="midnight"] {
  --color-bg: ...;
  /* etc. */
}
```

No component changes needed.

---

## Protected: Category / Data Colors

**These are explicitly outside the theme system and must never be replaced with CSS variables.**

All Sankey ribbon/node colors and any component sharing those colors (charts, legend labels, category callouts) pull from a named `CATEGORY_COLORS` constant in `src/lib/sankeyHelpers.ts`. These colors were intentionally designed and relate to milestone badges and other data visualizations across the app.

```ts
// src/lib/sankeyHelpers.ts
export const CATEGORY_COLORS = {
  structural:    '#0e7490',
  incomeW2:      '#164e63',
  incomeOther:   '#155e75',
  retHsa:        '#10b981',
  taxes:         '#94a3b8',
  takehome:      '#38bdf8',
  essentials:    '#f59e0b',
  essentialsFlagged: '#f97316',
  discretionary: '#fb923c',
  debt:          '#f87171',
  liquidSavings: '#2dd4bf',
  retirement:    '#34d399',
  remaining:     '#3a5a7a',
  overshoot:     '#ef4444',
} as const
```

This constant is the single source of truth. `sankeyHelpers.ts` consumes it internally; other components that need to reference a category color import from here.

---

## Theme State

### UIContext changes

Add `theme` state to `UIContext`:

```ts
type Theme = 'dark' | 'light'

interface UIState {
  // existing fields...
  theme: Theme
  setTheme: (t: Theme) => void
}
```

### Initialization (system preference + persistence)

On mount, resolve the initial theme:

1. Check `localStorage.getItem('compound-theme')` — if set, use it
2. Otherwise check `window.matchMedia('(prefers-color-scheme: dark)').matches`
3. Fall back to `'dark'` if neither is available

```ts
function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem('compound-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
```

### Applying the theme

Whenever `theme` changes, set the attribute on `<html>` and persist to localStorage:

```ts
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('compound-theme', theme)
}, [theme])
```

---

## Settings Tab Toggle

Add a theme toggle row to `SettingsTab.tsx` in the existing settings list, consistent with the current row pattern (label + control on the right):

```
Appearance
─────────────────────────────────────────
Theme           [ Dark  |  Light ]
```

The toggle is a two-segment button (no external library needed — a pair of styled `<button>` elements). It reads and writes `theme` from UIContext. No special styling — it follows the same visual language as the debt strategy toggle already in Settings.

---

## Migration: Replacing Hardcoded Colors

Every hardcoded hex that maps to a theme-sensitive color gets replaced with its CSS variable equivalent. This includes:

- `index.css` — `html`, `body`, `#root`, `.card`, scrollbar rules
- `App.tsx` — inline `background` style
- `SankeyChart.tsx` — tooltip div, detail panel div, structural node fills, label text fills
- `MilestoneBadges.tsx` — `ROLE_STYLES` backgrounds and borders
- `MilestoneToast.tsx` — background color
- `SectionTitle.tsx` — tooltip background
- `DebtTimeline.tsx` — border colors
- All tab files — active/selected accent states

Inline `style` props use `var(--color-X)` directly:
```tsx
style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
```

Tailwind config updated to reference variables for theme-sensitive colors only. Status/semantic colors (green, orange, amber, red, blue) remain hardcoded — they are not theme-sensitive:
```ts
// tailwind.config.ts
colors: {
  bg:      'var(--color-bg)',
  surface: 'var(--color-surface)',
  border:  'var(--color-border)',
  accent:  'var(--color-accent)',
  // green, orange, amber, red, blue: unchanged
}
```

SVG elements in SankeyChart support CSS variables natively:
```tsx
<text fill="var(--color-text-muted)" />
```

---

## Scope Boundaries

**In scope:**
- CSS variable token definitions (dark + light)
- UIContext theme state + initialization + persistence
- `<html>` attribute application
- Settings tab toggle UI
- Migration of all hardcoded theme-sensitive hex values
- `CATEGORY_COLORS` extraction in `sankeyHelpers.ts`

**Out of scope:**
- Animated theme transitions
- Per-component theme overrides
- Any third theme beyond dark/light
- Changes to chart layout, data logic, or feature behavior
