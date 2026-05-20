# Expenses Tab — Side-by-Side Layout

**Date:** 2026-05-20
**Status:** Approved

## Summary

Restructure the Expenses tab from a single stacked column into a two-column side-by-side layout. Left column: Essentials + Other Expenses. Right column: Debt Obligations (list + add form). Equal 50/50 width split.

## Motivation

The React migration preserved all functionality but kept the original single-column layout. With the container now widened to `max-w-7xl`, horizontal space is available. Side-by-side separates "what I spend" (essentials, discretionary) from "what I owe" (debts) — a meaningful conceptual split that also reduces scrolling.

## Layout

```
┌─────────────────────────┬─────────────────────────┐
│  Essentials             │  Debt Obligations        │
│  (card)                 │  - Debt list             │
├─────────────────────────┤  - Add Debt form         │
│  Other Expenses         │                          │
│  (card)                 │                          │
└─────────────────────────┴─────────────────────────┘
```

- **Grid**: `display: grid; grid-template-columns: 1fr 1fr; gap: 14px`
- **Left column**: Essentials `<Card>` and Other Expenses `<Card>` stacked with `14px` gap between them (matching existing card gap)
- **Right column**: Single Debt Obligations `<Card>` — debt list on top, Add Debt form below, same as today
- **Responsive**: Below `768px`, grid collapses to single column (`grid-template-columns: 1fr`) restoring the stacked layout

## Scope

### Changes
- **`src/tabs/ExpensesTab.tsx`**: JSX restructure only. Wrap the three card blocks in a two-column grid container. Left `<div>` receives Essentials + Other Expenses cards. Right `<div>` receives Debt Obligations card.

### No changes
- `BudgetRow`, `DebtCard`, `MortgageCard`, `Input` — untouched
- All state, handlers, data wiring — untouched
- Debt sort logic, promo/mortgage toggles — untouched

## Implementation Notes

- Use an inline `style` grid on the outer wrapper div (consistent with existing patterns in this tab)
- Left column wrapper: `display: flex; flex-direction: column; gap: 14px` so Essentials and Other Expenses cards stack with consistent spacing
- Right column wrapper: no extra wrapper needed — the single Debt card fills the column naturally
- The `Card` component already handles its own internal padding and borders; no changes needed there
- Responsive breakpoint: add a `.expenses-grid` class to `index.css` with the two-column grid definition and a `@media (max-width: 768px)` override that sets `grid-template-columns: 1fr`. Apply `className="expenses-grid"` to the wrapper div. This avoids inline style limitations with media queries while staying consistent with the tab's existing style approach.
