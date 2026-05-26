# Mobile Optimization — Design Spec

**Date:** 2026-05-26
**Scope:** Shell + Overview tab (< `md` / 768px only — desktop layout unchanged)

---

## Breakpoint Strategy

All mobile changes are gated at Tailwind's `md` breakpoint (768px).

- **< 768px** → mobile layout (this spec)
- **≥ 768px** → existing desktop layout, no changes

Implementation uses Tailwind responsive prefixes (`md:`) throughout. No new breakpoints are introduced.

---

## 1. Navbar

### Desktop (unchanged)
Single sticky 48px bar: Wordmark (left) | tabs (right, overflow scroll) | Export | Import | Avatar.

### Mobile
Single sticky 48px bar: **Hamburger icon (left) | Wordmark (centered) | Avatar (right)**.

#### Hamburger drawer
- Slides in from the left at ~75% viewport width
- Dark semi-transparent scrim covers the remaining right portion
- Tapping the scrim closes the drawer
- Drawer background: `var(--color-surface)` (`#043a3a`) with `border-right: 1px solid var(--color-border)`

#### Drawer contents
- All 7 tabs listed vertically with comfortable tap targets (min 44px height per item)
- Active tab: teal left border (`2px solid var(--color-accent)`) + subtle teal background tint
- Inactive tabs: muted text (`var(--color-text-muted)`)
- Divider line above a bottom section containing **Export** and **Import** text links (same handlers as desktop)
- Tapping a tab navigates to that tab and closes the drawer

#### Implementation notes
- Drawer open/close state is local `useState` in `App.tsx` (not persisted)
- Drawer and scrim render as `position: fixed` elements covering the full viewport, above all tab content (`z-index: 60`). Implemented directly in `App.tsx` — no React portal needed.
- No animation is required for v1; a simple show/hide is acceptable. A CSS `transition: transform` slide-in is a nice-to-have.
- `NavAvatar` component remains unchanged; it handles its own popover state

---

## 2. KPI Strip (`OverviewTab.tsx`)

### Desktop (unchanged)
`gridTemplateColumns: 'repeat(7, 1fr)'` — 7 equal columns in a single row.

### Mobile
Three grouped rows, all cells **center-aligned** (`text-align: center`). Dividers between cells are vertical borders; dividers between rows are horizontal borders.

| Row | Columns | Metrics | Value font size |
|-----|---------|---------|-----------------|
| 1 | 2 | Gross Income, Take-Home | 18px |
| 2 | 3 | Consumer Debt, Housing %, Total DTI | 15px |
| 3 | 2 | Retirement Rate, Total Savings Rate | 15px |

- Label font size: 8px (row 1), 7.5px (rows 2–3)
- Sub-text font size: 9px
- Health colors (orange/green/amber) apply to labels, values, and sub-text exactly as on desktop
- Tooltip `?` buttons are hidden on mobile (tooltips are not touch-friendly; the information is still accessible via the desktop view)
- The existing `KpiCell` component is refactored to accept a `centered` prop, or a separate `KpiCellMobile` component is introduced — whichever keeps the desktop render path cleanest

---

## 3. Monthly Budget Flow — Mobile Sankey (`SankeyChart.tsx`)

The existing desktop `SankeyChart` renders unchanged at ≥ 768px. Below 768px a separate mobile layout is rendered in its place.

### Conditional deduction summary card

Shown **only when** `grossMonthly - netMonthly > 0` (i.e., taxes or pre-tax deductions are present, meaning the user entered detailed W2 income). Hidden entirely when take-home equals gross.

Layout (a single card, `var(--color-surface)` background, 1px border):

```
GROSS INCOME                    $18,517
────────────────────────────────────────
⬛ Taxes                       − $3,961
🟩 401(k) & HSA               − $1,529
────────────────────────────────────────
🔵 Take-Home                   $13,027
```

- Color dots match category colors (gray for taxes, teal for 401k, sky-blue for take-home)
- Gross and Take-Home values: 15px DM Mono, `var(--color-text)`
- Deduction values: 12px DM Mono, muted (`var(--color-text-dim)`)
- If employer match contributes to the 401k/HSA line, it is still grouped into one row (no need to split)

### Take-Home fan Sankey

A simplified 2-column SVG Sankey rendered below the summary card (or at the top of the section when no card is shown):

- **Left node:** Take-Home — single source, full-height node with teal glow (matches desktop takehome node style)
- **Right nodes:** Essentials, Discretionary, Debt, Liquid Savings, Retirement, Remaining — sized proportionally to their share of take-home
- **Ribbons:** gradient from take-home color to each category color, matching desktop opacity/stroke style
- **Labels:** category name (10px, bold, category color) + amount (11px, `var(--color-text)`) to the right of each output node
- **SVG dimensions:** width 100% of container, height auto-calculated based on number of output nodes (approximately 160px for 6 categories)
- **Minimum ribbon height:** 4px (same as desktop) so small amounts remain visible
- **"Remaining" node:** only rendered when `remaining > 0`

#### Tap-to-drill-down
Output nodes remain tappable on mobile. Tapping opens the existing `DrillDownPanel`. On mobile the panel renders **below** the Sankey (full width, not the right-side sidebar layout used on desktop).

#### SVG label space
- No left label space needed (Take-Home node label renders below the node, not to the left)
- Right label area: ~140px reserved (sufficient for "Discretionary $2,072" at 10–11px)
- Left padding: 10px; Take-Home node width: 14px; ribbon area: ~190px; right node: 10px; label area: 140px → total ~364px, fits 390px screen

#### Implementation approach
`SankeyChart.tsx` receives a `mobile` boolean prop (derived from a `useIsMobile` hook in the parent). When `mobile === true` it renders the mobile layout instead of the d3-sankey layout. The existing desktop code path is unchanged.

---

## 4. Bottom Row — Debt Timeline + Retirement Projection (`OverviewTab.tsx`)

### Desktop (unchanged)
`gridTemplateColumns: '1fr 1fr'` — two equal columns.

### Mobile
Single column (`gridTemplateColumns: '1fr'`). Debt-Free Timeline renders first, Retirement Projection below it.

### Retirement projection sub-KPI grid
Currently `gridTemplateColumns: 'repeat(6, 1fr)'` (3 nominal + 3 today's-dollars values).

On mobile: `gridTemplateColumns: 'repeat(3, 1fr)'` — the 6 cells wrap into 2 rows of 3. The vertical divider between nominal and today's-dollars columns is removed on mobile (unnecessary at this size).

---

## 5. New Hook: `useIsMobile`

A simple hook that returns `true` when `window.innerWidth < 768`, updated on `window` resize events with a `useEffect` cleanup.

```ts
// src/hooks/useIsMobile.ts
export function useIsMobile(breakpoint = 768): boolean
```

Used in `App.tsx` (for navbar), `OverviewTab.tsx` (for KPI strip + bottom row), and `SankeyChart.tsx` (for Sankey layout).

---

## 6. `.gitignore` update

Add `.superpowers/` to the Compound project `.gitignore` (brainstorm session files should not be committed).

---

## Out of Scope (this sprint)

- Income, Expenses, Savings, Invest & Retire, Plan, Settings tab mobile layouts
- Animations / transitions on the hamburger drawer
- Touch gesture support (swipe to close drawer)
- Onboarding flow mobile optimization

---

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Hamburger drawer for mobile navbar |
| `src/hooks/useIsMobile.ts` | New hook |
| `src/tabs/OverviewTab.tsx` | KPI strip grouping, bottom row stacking, retirement sub-KPI reflow, mobile Sankey wiring |
| `src/components/SankeyChart.tsx` | Mobile layout (deduction card + take-home fan) behind `mobile` prop |
| `.gitignore` | Add `.superpowers/` |
