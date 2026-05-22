# Retirement Milestone Gamification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gamification layer to the retirement projection card — a persistent badge strip overlaid on the chart's top-left and a toast notification when a new milestone is crossed.

**Architecture:** A `useMilestones` hook computes earned milestones (dollar thresholds + Fidelity benchmarks), persists a high-water mark in localStorage, and returns a `newlyUnlocked` list. `MilestoneBadges` renders the two-row pill overlay inside `LineChart` via a new `badgeOverlay` prop. `MilestoneToast` renders via a React portal to avoid `overflow:hidden` clipping.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, localStorage, ReactDOM.createPortal

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useMilestones.ts` | Computation, persistence, unlock detection |
| Create | `src/hooks/useMilestones.test.ts` | Tests for pure computation helpers |
| Create | `src/components/MilestoneBadges.tsx` | Two-row pill badge display |
| Create | `src/components/MilestoneToast.tsx` | Portal toast on unlock |
| Modify | `src/components/LineChart.tsx` | Add `badgeOverlay?: React.ReactNode` prop |
| Modify | `src/tabs/OverviewTab.tsx` | Wire hook, badges, and toast |

---

## Task 1: `useMilestones` — write failing tests then implement

**Files:**
- Create: `src/hooks/useMilestones.test.ts`
- Create: `src/hooks/useMilestones.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/hooks/useMilestones.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { computeDollarEarned, computeFidelityEarned } from './useMilestones'
import type { DataPoint } from '../lib/calculations'

describe('computeDollarEarned', () => {
  it('earns $10K when balance >= 10000', () => {
    const result = computeDollarEarned(15_000, new Set())
    expect(result.has(10_000)).toBe(true)
    expect(result.has(100_000)).toBe(false)
  })

  it('earns multiple thresholds for large balance', () => {
    const result = computeDollarEarned(1_500_000, new Set())
    expect(result.has(10_000)).toBe(true)
    expect(result.has(100_000)).toBe(true)
    expect(result.has(500_000)).toBe(true)
    expect(result.has(1_000_000)).toBe(true)
    expect(result.has(2_000_000)).toBe(false)
  })

  it('earns nothing for zero balance', () => {
    expect(computeDollarEarned(0, new Set()).size).toBe(0)
  })

  it('preserves stored milestones even when balance drops below threshold', () => {
    const stored = new Set([100_000])
    const result = computeDollarEarned(5_000, stored)
    expect(result.has(100_000)).toBe(true)
  })

  it('earns all 7 thresholds at max', () => {
    const result = computeDollarEarned(10_000_000, new Set())
    expect(result.size).toBe(7)
  })
})

describe('computeFidelityEarned', () => {
  const makePoints = (pairs: [number, number][]): DataPoint[] =>
    pairs.map(([age, balance]) => ({ age, balance }))

  it('earns 1× by 30 when projection at age 30 meets threshold', () => {
    const points = makePoints([[25, 20_000], [30, 120_000], [35, 200_000]])
    const result = computeFidelityEarned(25, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)
    expect(result.has('3× by 40')).toBe(false)
  })

  it('does not earn when projection at benchmark age misses threshold', () => {
    const points = makePoints([[25, 10_000], [30, 50_000]])
    const result = computeFidelityEarned(25, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)
  })

  it('earns a past-age benchmark from current balance when currentAge > benchmarkAge', () => {
    // currentAge 35 > benchmark age 30; annualGross 100K * 1 = 100K; balance 350K qualifies
    const points = makePoints([[35, 350_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)
  })

  it('does not earn past-age benchmark when current balance is below threshold', () => {
    const points = makePoints([[35, 50_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)
  })

  it('earns 3× by 40 and 6× by 50 when projection meets both', () => {
    const points = makePoints([
      [28, 50_000], [40, 320_000], [50, 650_000], [65, 2_000_000],
    ])
    const result = computeFidelityEarned(28, 100_000, points, new Set())
    expect(result.has('3× by 40')).toBe(true)  // 320K >= 100K * 3
    expect(result.has('6× by 50')).toBe(true)  // 650K >= 100K * 6
    expect(result.has('8× by 60')).toBe(false)
  })

  it('preserves stored fidelity milestones', () => {
    const stored = new Set(['3× by 40'])
    const points = makePoints([[28, 10_000]])
    const result = computeFidelityEarned(28, 200_000, points, stored)
    expect(result.has('3× by 40')).toBe(true)
  })

  it('skips all benchmarks when annualGross is 0', () => {
    const points = makePoints([[28, 500_000]])
    expect(computeFidelityEarned(28, 0, points, new Set()).size).toBe(0)
  })

  it('returns empty set when projectionPoints is empty', () => {
    expect(computeFidelityEarned(28, 100_000, [], new Set()).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```
npx vitest run src/hooks/useMilestones.test.ts
```

Expected: FAIL — `Cannot find module './useMilestones'`

- [ ] **Step 3: Implement `useMilestones.ts`**

Create `src/hooks/useMilestones.ts`:

```ts
import { useMemo, useEffect, useRef, useState } from 'react'
import type { DataPoint } from '../lib/calculations'

const DOLLAR_THRESHOLDS = [10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]
const DOLLAR_LABELS: Record<number, string> = {
  10_000: '$10K', 100_000: '$100K', 500_000: '$500K',
  1_000_000: '$1M', 2_000_000: '$2M', 5_000_000: '$5M', 10_000_000: '$10M',
}
const FIDELITY_BENCHMARKS = [
  { label: '1× by 30', age: 30, multiplier: 1 },
  { label: '3× by 40', age: 40, multiplier: 3 },
  { label: '6× by 50', age: 50, multiplier: 6 },
  { label: '8× by 60', age: 60, multiplier: 8 },
]
const STORAGE_KEY = 'compound_milestones_v1'

function readStored(): { dollar: Set<number>; fidelity: Set<string> } {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!raw) return { dollar: new Set(), fidelity: new Set() }
    return { dollar: new Set(raw.dollar ?? []), fidelity: new Set(raw.fidelity ?? []) }
  } catch {
    return { dollar: new Set(), fidelity: new Set() }
  }
}

export function computeDollarEarned(currentBalance: number, stored: Set<number>): Set<number> {
  const earned = new Set<number>(stored)
  for (const t of DOLLAR_THRESHOLDS) {
    if (currentBalance >= t) earned.add(t)
  }
  return earned
}

export function computeFidelityEarned(
  currentAge: number,
  annualGross: number,
  projectionPoints: DataPoint[],
  stored: Set<string>
): Set<string> {
  const earned = new Set<string>(stored)
  if (projectionPoints.length === 0) return earned
  for (const b of FIDELITY_BENCHMARKS) {
    const threshold = annualGross * b.multiplier
    if (threshold <= 0) continue
    const qualifies = currentAge > b.age
      ? (projectionPoints[0]?.balance ?? 0) >= threshold
      : (projectionPoints.find(p => p.age === b.age)?.balance ?? 0) >= threshold
    if (qualifies) earned.add(b.label)
  }
  return earned
}

export interface MilestoneResult {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
  newlyUnlocked: string[]
}

export function useMilestones(
  currentBalance: number,
  annualGross: number,
  projectionPoints: DataPoint[]
): MilestoneResult {
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([])

  // Initialize prevRef from localStorage so page-load never fires toasts
  const prevRef = useRef<{ dollar: Set<number>; fidelity: Set<string> } | null>(null)
  if (prevRef.current === null) {
    const s = readStored()
    prevRef.current = { dollar: s.dollar, fidelity: s.fidelity }
  }

  const earned = useMemo(() => {
    const stored = readStored()
    const currentAge = projectionPoints[0]?.age ?? 0
    return {
      earnedDollar: computeDollarEarned(currentBalance, stored.dollar),
      earnedFidelity: computeFidelityEarned(currentAge, annualGross, projectionPoints, stored.fidelity),
    }
  }, [currentBalance, annualGross, projectionPoints])

  useEffect(() => {
    const prev = prevRef.current!
    const newDollar = [...earned.earnedDollar].filter(t => !prev.dollar.has(t))
    const newFidelity = [...earned.earnedFidelity].filter(l => !prev.fidelity.has(l))

    if (newDollar.length > 0 || newFidelity.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dollar: [...earned.earnedDollar],
        fidelity: [...earned.earnedFidelity],
      }))
      const labels = [
        ...newDollar.sort((a, b) => b - a).map(t => DOLLAR_LABELS[t]),
        ...newFidelity,
      ]
      setNewlyUnlocked(labels)
    }

    prevRef.current = { dollar: earned.earnedDollar, fidelity: earned.earnedFidelity }
  }, [earned])

  return { earnedDollar: earned.earnedDollar, earnedFidelity: earned.earnedFidelity, newlyUnlocked }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```
npx vitest run src/hooks/useMilestones.test.ts
```

Expected: All 14 tests PASS

- [ ] **Step 5: Commit**

```
git add src/hooks/useMilestones.ts src/hooks/useMilestones.test.ts
git commit -m "feat: add useMilestones hook with dollar and Fidelity benchmark logic"
```

---

## Task 2: `MilestoneBadges` component

**Files:**
- Create: `src/components/MilestoneBadges.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/MilestoneBadges.tsx`:

```tsx
const DOLLAR_THRESHOLDS = [10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]
const DOLLAR_LABELS: Record<number, string> = {
  10_000: '$10K', 100_000: '$100K', 500_000: '$500K',
  1_000_000: '$1M', 2_000_000: '$2M', 5_000_000: '$5M', 10_000_000: '$10M',
}
const FIDELITY_LABELS = ['1× by 30', '3× by 40', '6× by 50', '8× by 60']

interface Props {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
}

function Pill({ label, earned }: { label: string; earned: boolean }) {
  return (
    <span style={{
      background: earned ? 'rgba(13,148,136,0.9)' : 'rgba(4,58,58,0.85)',
      color: earned ? '#fff' : '#2a6a6a',
      border: earned ? 'none' : '1px dashed #0d4a4a',
      borderRadius: 2,
      padding: '2px 5px',
      fontSize: 8,
      fontWeight: earned ? 700 : 400,
      fontFamily: 'DM Mono, monospace',
      whiteSpace: 'nowrap' as const,
      lineHeight: 1.4,
    }}>
      {earned ? '✓ ' : ''}{label}
    </span>
  )
}

export default function MilestoneBadges({ earnedDollar, earnedFidelity }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {DOLLAR_THRESHOLDS.map(t => (
          <Pill key={t} label={DOLLAR_LABELS[t]} earned={earnedDollar.has(t)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {FIDELITY_LABELS.map(l => (
          <Pill key={l} label={l} earned={earnedFidelity.has(l)} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add src/components/MilestoneBadges.tsx
git commit -m "feat: add MilestoneBadges overlay component"
```

---

## Task 3: `MilestoneToast` component

**Files:**
- Create: `src/components/MilestoneToast.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/MilestoneToast.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

interface Props {
  newlyUnlocked: string[]
}

export default function MilestoneToast({ newlyUnlocked }: Props) {
  const [visible, setVisible] = useState(false)
  const [label, setLabel] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (newlyUnlocked.length === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setLabel(newlyUnlocked[0])
    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [newlyUnlocked])

  if (!visible) return null

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: '#043a3a',
      border: '1px solid rgba(13,148,136,0.5)',
      borderRadius: 4,
      padding: '12px 16px',
      minWidth: 200,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        fontSize: 10,
        color: '#2e7a7a',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        Milestone reached
      </div>
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 15,
        fontWeight: 700,
        color: '#34d399',
      }}>
        {label}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Commit**

```
git add src/components/MilestoneToast.tsx
git commit -m "feat: add MilestoneToast portal component"
```

---

## Task 4: Add `badgeOverlay` prop to `LineChart`

**Files:**
- Modify: `src/components/LineChart.tsx`

- [ ] **Step 1: Update the props interface and return value**

In `src/components/LineChart.tsx`, make two changes:

**Change 1** — update the props interface (currently at line 12–16):

```ts
interface LineChartProps {
  data: DataPoint[]
  height?: number
  benchmarks?: Benchmark[]
  badgeOverlay?: React.ReactNode
}
```

**Change 2** — update the function signature to destructure the new prop (currently line 18):

```ts
export default function LineChart({ data, height: h = 200, benchmarks, badgeOverlay }: LineChartProps) {
```

**Change 3** — wrap the returned `<svg>` in a relative container. The current return starts at line 65 with `<svg`. Replace the entire return statement with:

```tsx
  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        {/* — all existing SVG children unchanged — */}
      </svg>
      {badgeOverlay && (
        <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          {badgeOverlay}
        </div>
      )}
    </div>
  )
```

Keep all existing SVG children exactly as they are — only the outermost wrapper and the `style` on `<svg>` change (`display: 'block'` prevents the extra inline-block gap). The `pointerEvents: 'none'` on the overlay div ensures badges don't block the chart's hover crosshair.

- [ ] **Step 2: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/components/LineChart.tsx
git commit -m "feat: add badgeOverlay prop to LineChart"
```

---

## Task 5: Wire everything in `OverviewTab`

**Files:**
- Modify: `src/tabs/OverviewTab.tsx`

- [ ] **Step 1: Add imports at the top of `OverviewTab.tsx`**

After the existing import on line 10 (`import { buildAggregateProjection } from '../lib/calculations'`), add:

```ts
import { useMilestones } from '../hooks/useMilestones'
import MilestoneBadges from '../components/MilestoneBadges'
import MilestoneToast from '../components/MilestoneToast'
```

- [ ] **Step 2: Call `useMilestones` in the component body**

`OverviewTab` already computes everything we need:
- `retirementBalance` (line 113–122) — the current total balance
- `annualGross` (line 101) — `grossMonthly * 12`
- `retChartData` (line 93) — the projection points

Add this line immediately after line 123 (after `monthlyContrib` is defined):

```ts
const { earnedDollar, earnedFidelity, newlyUnlocked } = useMilestones(retirementBalance, annualGross, retChartData)
```

- [ ] **Step 3: Pass `badgeOverlay` to `LineChart` and render `MilestoneToast`**

Find the existing `LineChart` usage (line 275):

```tsx
<LineChart data={retChartData} height={180} benchmarks={grossMonthly > 0 ? benchmarks : []} />
```

Replace it with:

```tsx
<LineChart
  data={retChartData}
  height={180}
  benchmarks={grossMonthly > 0 ? benchmarks : []}
  badgeOverlay={retChartData.length > 0 ? (
    <MilestoneBadges earnedDollar={earnedDollar} earnedFidelity={earnedFidelity} />
  ) : undefined}
/>
```

Then, add `<MilestoneToast>` anywhere in the OverviewTab JSX — since it renders via a React portal, its position in the tree does not affect the rendered output. The simplest place is just before the final `</div>` that closes the component's return (line 279):

```tsx
      <MilestoneToast newlyUnlocked={newlyUnlocked} />
    </div>
  )
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Run the full test suite**

```
npx vitest run
```

Expected: All tests pass

- [ ] **Step 6: Start the dev server and verify visually**

```
npm run dev
```

Open http://localhost:5173/Compound/ in a browser.

Verify:
1. Badge strip appears in the top-left of the retirement projection chart (two rows of pills)
2. Earned milestones show as teal-filled with checkmark; unearned show as dim outlined
3. Change a balance value to push `currentBalance` past the next dollar threshold — toast appears bottom-right for 4 seconds
4. Reload the page — no toast fires on load (high-water mark is preserved)
5. Reduce the balance back below a threshold — badge remains earned (high-water mark preserved)

- [ ] **Step 7: Commit**

```
git add src/tabs/OverviewTab.tsx
git commit -m "feat: wire retirement milestone gamification into OverviewTab"
```
