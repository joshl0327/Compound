# Retirement Milestone Gamification — Design Spec

**Date:** 2026-05-22
**Status:** Approved

---

## Overview

Add a gamification layer to the retirement projection card that celebrates progress milestones. Two visual surfaces: a persistent badge strip overlaid on the chart, and a toast notification when a new milestone is crossed.

---

## Milestone Definitions

### Dollar milestones (7 total)
Based on the user's **current total retirement balance** (sum of all 401k, Roth IRA, HSA, and taxable investment account balances):

| Threshold | Label |
|-----------|-------|
| $10,000   | $10K  |
| $100,000  | $100K |
| $500,000  | $500K |
| $1,000,000 | $1M  |
| $2,000,000 | $2M  |
| $5,000,000 | $5M  |
| $10,000,000 | $10M |

### Fidelity benchmark milestones (4 total)
Based on the user's projection and annual gross income:

| Label     | Condition |
|-----------|-----------|
| 1× by 30  | projection at age 30 >= annualGross × 1 (or currentBalance >= annualGross × 1 if currentAge > 30) |
| 3× by 40  | projection at age 40 >= annualGross × 3 (or currentBalance >= annualGross × 3 if currentAge > 40) |
| 6× by 50  | projection at age 50 >= annualGross × 6 (or currentBalance >= annualGross × 6 if currentAge > 50) |
| 8× by 60  | projection at age 60 >= annualGross × 8 (or currentBalance >= annualGross × 8 if currentAge > 60) |

For past benchmark ages (currentAge > benchmarkAge), we check current balance against the multiplier — if you're 45 with more than 3× salary saved, you cleared the 3× by 40 benchmark.

---

## Persistence

- Milestones are stored in localStorage under key `compound_milestones_v1`
- Structure: `{ earnedDollar: number[], earnedFidelity: string[] }`
- **High-water mark rule:** earned milestones are never un-earned. The persisted set is unioned with the computed set on every render, so adjusting inputs cannot remove a badge.
- A newly-unlocked milestone is one that appears in the current computed set but was absent from the previously-rendered set (tracked via `useRef`). The ref must be **initialized from the persisted localStorage set on mount** — not from an empty set — so that already-earned milestones never trigger a toast on page load.

---

## Architecture

### New files

**`src/hooks/useMilestones.ts`**

```ts
useMilestones(
  currentBalance: number,
  annualGross: number,
  projectionPoints: { age: number; value: number }[]
): {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
  newlyUnlocked: string[]
}
```

Responsibilities:
- Compute which dollar milestones `currentBalance` qualifies for
- Compute which Fidelity benchmarks the projection satisfies
- Read `compound_milestones_v1` from localStorage; union with computed sets
- Write back to localStorage if new milestones were unlocked
- Track previous earned set via `useRef` to produce `newlyUnlocked`

**`src/components/MilestoneBadges.tsx`**

```ts
MilestoneBadges({
  earnedDollar: Set<number>,
  earnedFidelity: Set<string>
})
```

Pure display component. Renders two rows of pill badges:
- Row 1: dollar milestones ($10K → $10M)
- Row 2: Fidelity benchmarks (1× by 30 → 8× by 60)

Earned: teal filled, white text. Locked: dim, dashed border. Absolutely positioned — must be placed inside a `relative` container.

**`src/components/MilestoneToast.tsx`**

```ts
MilestoneToast({ newlyUnlocked: string[] })
```

Renders via `ReactDOM.createPortal(content, document.body)` to avoid `overflow: hidden` clipping from the chart container. When `newlyUnlocked` transitions from empty to non-empty, displays the highest newly-unlocked milestone. Auto-dismisses after 4 seconds via `useEffect` timeout. Fixed bottom-right position. Styled with `bg-surface border border-accent` matching the app's dark card aesthetic.

### Modified files

**`src/components/LineChart.tsx`**
- Add optional prop: `badgeOverlay?: React.ReactNode`
- Wrap existing SVG in a `relative` div
- Render `{badgeOverlay}` as an absolutely-positioned sibling at `top-2 left-2`

**`src/tabs/OverviewTab.tsx`**
- Compute `currentBalance` by summing existing balance values already available in the tab
- Pass the same `projectionPoints` array (already computed for LineChart) to `useMilestones`
- Wire `useMilestones` output to `MilestoneBadges` (via `badgeOverlay` prop) and `MilestoneToast`

---

## Visual Design

Badge strip overlaid in the **top-left corner of the chart** — this area is always empty since the exponential curve hugs the bottom-left and only rises toward the top-right.

```
┌─────────────────────────────────────────────┐
│ [✓$10K][✓$100K][✓$500K][✓$1M][$2M][$5M][$10M]  │  ← row 1
│ [✓1×by30][✓3×by40][6×by50][8×by60]         │  ← row 2
│                                             │
│                               ╱             │
│                          ╱                  │
│                    ╱                        │
│             ╱                               │
│      ╱─────                                 │
└─────────────────────────────────────────────┘
```

Toast (bottom-right, fixed):
```
┌─────────────────────────────┐
│  Milestone reached           │
│  Your savings crossed $1M    │
└─────────────────────────────┘
```

---

## Scope Boundaries

- No animations in this implementation (can be layered on later)
- No tracking of *when* milestones were reached — only *which* ones
- No milestone display outside the retirement projection card
- Fidelity benchmarks use projection curve only (no historical tracking)
- `currentBalance` is computed from user-entered balances, not live brokerage data
