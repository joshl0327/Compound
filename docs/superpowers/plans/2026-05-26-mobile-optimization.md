# Mobile Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Compound shell navbar and Overview tab usable on ~390px mobile screens (< 768px) without changing any desktop layout.

**Architecture:** A new `useIsMobile` hook drives all mobile branches via a boolean. The navbar is replaced by a hamburger + drawer at < 768px. The Overview tab swaps the flat 7-col KPI strip for three semantic rows, stacks the bottom row, reflows the retirement sub-KPIs, and passes `mobile={isMobile}` to SankeyChart. SankeyChart renders a deduction summary card + Take-Home fan SVG instead of the d3-sankey layout when `mobile === true`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3.4, inline styles, hand-rolled SVG, `window.innerWidth` / resize events, Vitest + @testing-library/react.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/hooks/useIsMobile.ts` | **Create** | New hook returning `boolean` |
| `src/hooks/useIsMobile.test.ts` | **Create** | Unit tests for the hook |
| `src/components/SankeyChart.tsx` | **Modify** | Add `mobile?: boolean` prop; mobile render path (deduction card + fan SVG) |
| `src/App.tsx` | **Modify** | Mobile navbar (hamburger + centered wordmark + avatar) + drawer/scrim |
| `src/tabs/OverviewTab.tsx` | **Modify** | `KpiCell` new props; mobile KPI strip; bottom row stacking; retirement sub-KPI reflow; wire `useIsMobile` + `mobile` prop |

---

## Task 1 — `useIsMobile` hook

**Files:**
- Create: `src/hooks/useIsMobile.ts`
- Create: `src/hooks/useIsMobile.test.ts`

- [ ] **Step 1.1 — Write the failing tests**

Create `src/hooks/useIsMobile.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

describe('useIsMobile', () => {
  it('returns true when window.innerWidth < 768', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when window.innerWidth >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns false at exactly the breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when window is resized below the breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(true)
  })

  it('updates when window is resized above the breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(false)
  })

  it('respects a custom breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    const { result } = renderHook(() => useIsMobile(600))
    expect(result.current).toBe(true)
  })

  it('removes the resize listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const spy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(spy).toHaveBeenCalledWith('resize', expect.any(Function))
    spy.mockRestore()
  })
})
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```
npx vitest run src/hooks/useIsMobile.test.ts
```

Expected: FAIL — `Cannot find module './useIsMobile'`

- [ ] **Step 1.3 — Implement the hook**

Create `src/hooks/useIsMobile.ts`:

```ts
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])

  return isMobile
}
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```
npx vitest run src/hooks/useIsMobile.test.ts
```

Expected: PASS — 7 tests

- [ ] **Step 1.5 — Commit**

```
git add src/hooks/useIsMobile.ts src/hooks/useIsMobile.test.ts
git commit -m "feat: add useIsMobile hook"
```

---

## Task 2 — SankeyChart mobile layout

**Files:**
- Modify: `src/components/SankeyChart.tsx`

### Context

`SankeyChart` uses `LABEL_W = 220` + `SRC_LABEL_W = 110`, consuming 330 px of labels alone — the d3-sankey layout breaks on a 390 px screen. The mobile path replaces it entirely with:
1. A **deduction summary card** (only when `grossMonthly − netMonthly > 0`, i.e., the user entered detailed W2 income with taxes/pre-tax deductions)
2. A **Take-Home fan SVG** — one source node fanning to output nodes, hand-rolled, no d3

The desktop path is unchanged when `mobile` is falsy.

- [ ] **Step 2.1 — Add `mobile` prop to the interface**

In `src/components/SankeyChart.tsx`, find:

```ts
interface SankeyChartProps {
  input: SankeyInput
  data: AppData
}
```

Replace with:

```ts
interface SankeyChartProps {
  input: SankeyInput
  data: AppData
  mobile?: boolean
}
```

And update the function signature from:

```ts
export default function SankeyChart({ input, data }: SankeyChartProps) {
```

to:

```ts
export default function SankeyChart({ input, data, mobile = false }: SankeyChartProps) {
```

- [ ] **Step 2.2 — Add the mobile render block**

Immediately after the existing `if (!graph)` early return (around line 123), add the full mobile render block. Insert before `const isOvershoot = rawNodes.some(n => n.isOvershoot)`:

```tsx
  // ── Mobile render ──
  if (mobile) {
    const taxes = input.grossMonthly - input.netMonthly
      - input.trad401kMonthly - input.hsaMonthly - input.roth401kMonthly
    const retHsa = input.trad401kMonthly + input.roth401kMonthly + input.hsaMonthly
    const showDeductionCard = input.grossMonthly - input.netMonthly > 0

    const bucketSum = input.essTotalP + input.discPlanTotal + input.debtPlanTotal
      + input.liquidSavingsMonthly + input.rothIraMonthly
    const remaining = input.netMonthly - bucketSum

    const outputs: { id: string; label: string; amount: number; color: string }[] = [
      { id: 'essentials',    label: 'Essentials',    amount: input.essTotalP,           color: CATEGORY_COLORS.essentials },
      { id: 'discretionary', label: 'Discretionary', amount: input.discPlanTotal,        color: CATEGORY_COLORS.discretionary },
      { id: 'debt',          label: 'Debt',          amount: input.debtPlanTotal,        color: CATEGORY_COLORS.debt },
      { id: 'liquid-savings',label: 'Liquid Savings',amount: input.liquidSavingsMonthly, color: CATEGORY_COLORS.liquidSavings },
      { id: 'retirement',    label: 'Retirement',    amount: input.rothIraMonthly,       color: CATEGORY_COLORS.retirement },
      ...(remaining > 1
        ? [{ id: 'remaining', label: 'Remaining', amount: remaining, color: CATEGORY_COLORS.remaining }]
        : []),
    ].filter(o => o.amount > 1)

    if (outputs.length === 0 || input.netMonthly <= 0) {
      return (
        <div className="flex items-center justify-center h-32 text-sm"
          style={{ color: 'var(--color-text-muted)' }}>
          Add your income to see the flow.
        </div>
      )
    }

    // ── Fan SVG layout constants ──
    const NODE_GAP = 4
    const MIN_NODE_H = 4
    const N = outputs.length
    // ~30px per output slot (node + gap), generous enough for two lines of label text
    const totalH = Math.max(N * 30 - NODE_GAP, 160)
    const innerH = totalH - (N - 1) * NODE_GAP

    // Proportional node heights — floored at MIN_NODE_H, scaled to sum to innerH
    const rawHeights = outputs.map(o => Math.max(MIN_NODE_H, (o.amount / input.netMonthly) * innerH))
    const rawSum = rawHeights.reduce((s, h) => s + h, 0)
    const nodeHeights = rawSum > 0 ? rawHeights.map(h => (h / rawSum) * innerH) : rawHeights

    // Output node Y positions (source ribbon exits at the same positions)
    const nodeY: number[] = []
    let cy = 0
    nodeHeights.forEach((h, i) => {
      nodeY.push(cy)
      cy += h + (i < N - 1 ? NODE_GAP : 0)
    })

    // SVG viewport: fits a 390px screen (10 + 14 + 190 + 10 + 8 + 132 = 364)
    const VIEW_W = 364
    const SRC_X0 = 10, SRC_X1 = 24   // Take-Home source node
    const TGT_X0 = 214, TGT_X1 = 224  // Output nodes
    const LABEL_X = 232               // Labels

    return (
      <div>
        {/* ── Deduction summary card — only when taxes/pre-tax deductions are present ── */}
        {showDeductionCard && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 5,
            padding: '12px 14px',
            marginBottom: 16,
          }}>
            {/* Gross Income row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Gross Income
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: 'var(--color-text)', fontWeight: 600 }}>
                {fmt(input.grossMonthly)}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 10 }} />

            {/* Taxes row */}
            {taxes > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.taxes, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Taxes</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--color-text-dim)' }}>
                  − {fmt(taxes)}
                </span>
              </div>
            )}

            {/* 401(k) & HSA row */}
            {retHsa > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.retHsa, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>401(k) & HSA</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--color-text-dim)' }}>
                  − {fmt(retHsa)}
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 10 }} />

            {/* Take-Home total row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.takehome, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: CATEGORY_COLORS.takehome, fontWeight: 600 }}>Take-Home</span>
              </div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: 'var(--color-text)', fontWeight: 600 }}>
                {fmt(input.netMonthly)}
              </span>
            </div>
          </div>
        )}

        {/* ── Take-Home fan SVG ── */}
        <svg
          width="100%"
          viewBox={`0 0 ${VIEW_W} ${totalH + 24}`}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label="Take-home budget flow"
          role="img"
        >
          <defs>
            <filter id="mobile-takehome-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Source node: Take-Home — full height */}
          <rect
            x={SRC_X0} y={0}
            width={SRC_X1 - SRC_X0} height={totalH}
            rx={2}
            fill="#38bdf8" fillOpacity={0.13}
            stroke="#38bdf8" strokeWidth={2} strokeOpacity={0.9}
            filter="url(#mobile-takehome-glow)"
          />
          {/* Label below source node */}
          <text
            x={(SRC_X0 + SRC_X1) / 2} y={totalH + 16}
            textAnchor="middle"
            fontSize={9} fontWeight={700} fill={CATEGORY_COLORS.takehome}
            fontFamily="DM Mono, monospace" letterSpacing="0.08em"
          >
            TAKE-HOME
          </text>

          {/* Ribbons + output nodes + labels */}
          {outputs.map((o, i) => {
            const srcY0 = nodeY[i]
            const srcY1 = srcY0 + nodeHeights[i]
            const tgtY0 = nodeY[i]
            const tgtY1 = tgtY0 + nodeHeights[i]
            const mx = (SRC_X1 + TGT_X0) / 2
            const ribbonD = [
              `M${SRC_X1},${srcY0}`,
              `C${mx},${srcY0} ${mx},${tgtY0} ${TGT_X0},${tgtY0}`,
              `L${TGT_X0},${tgtY1}`,
              `C${mx},${tgtY1} ${mx},${srcY1} ${SRC_X1},${srcY1}`,
              'Z',
            ].join(' ')
            const midY = (tgtY0 + tgtY1) / 2
            const isActive = activeNode === o.id

            return (
              <g
                key={o.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveNode(prev => prev === o.id ? null : o.id)}
              >
                {/* Ribbon */}
                <path
                  d={ribbonD}
                  fill={o.color}
                  fillOpacity={isActive ? 0.5 : 0.3}
                  stroke={o.color}
                  strokeWidth={0.3}
                  strokeOpacity={0.5}
                />
                {/* Output node */}
                <rect
                  x={TGT_X0} y={tgtY0}
                  width={TGT_X1 - TGT_X0} height={Math.max(nodeHeights[i], 2)}
                  rx={2}
                  fill={o.color} fillOpacity={isActive ? 0.6 : 0.3}
                  stroke={o.color} strokeWidth={isActive ? 1.5 : 0.8} strokeOpacity={0.7}
                />
                {/* Category name */}
                <text
                  x={LABEL_X} y={midY - 5}
                  fontSize={10} fontWeight={700} fill={o.color}
                  fontFamily="DM Mono, monospace" letterSpacing="0.04em"
                >
                  {o.label}
                </text>
                {/* Amount */}
                <text
                  x={LABEL_X} y={midY + 9}
                  fontSize={11} fontWeight={600} fill="var(--color-text)"
                  fontFamily="DM Mono, monospace"
                >
                  {fmt(o.amount)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* DrillDownPanel — below SVG on mobile (not sidebar) */}
        {activeNode && (
          <div style={{ marginTop: 12 }}>
            <DrillDownPanel
              nodeId={activeNode}
              data={data}
              input={input}
              onClose={() => setActiveNode(null)}
            />
          </div>
        )}
      </div>
    )
  }
```

- [ ] **Step 2.3 — Type-check**

```
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about `activeNode` or `setActiveNode` being used before declaration: both are declared near the top of the function body via `useState`; they are in scope for the early `if (mobile)` block. No change needed.

- [ ] **Step 2.4 — Commit**

```
git add src/components/SankeyChart.tsx
git commit -m "feat: mobile sankey — deduction card and take-home fan"
```

---

## Task 3 — App.tsx mobile navbar + hamburger drawer

**Files:**
- Modify: `src/App.tsx`

### Context

The current navbar is one 48px bar with a wordmark + 7 overflow tabs + Export/Import/Avatar — cramped at 390px. Mobile replacement: hamburger (left) | centered wordmark | avatar (right). Tabs and Export/Import move into a left-side drawer.

- [ ] **Step 3.1 — Add imports and state**

At the top of `src/App.tsx`, add the `useIsMobile` import after the existing imports:

```ts
import { useIsMobile } from './hooks/useIsMobile'
```

Inside the `App()` function body, after the existing `useState` calls, add:

```ts
const isMobile = useIsMobile()
const [drawerOpen, setDrawerOpen] = useState(false)
```

- [ ] **Step 3.2 — Replace the navbar JSX**

Find and replace the entire header block — from the comment `{/* Header + nav — single sticky bar */}` down through the closing `</div>` of the nav (line 168 in the original). Replace with:

```tsx
      {/* Header + nav */}
      <div
        className="sticky top-0 z-50 border-b border-border px-4"
        style={{ background: 'var(--color-nav)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      >
        {isMobile ? (
          /* ── Mobile nav: hamburger | centered wordmark | avatar ── */
          <div className="mx-auto flex items-center relative" style={{ height: 48, maxWidth: 'min(94vw, 2200px)' }}>
            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
            >
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
            </button>
            {/* Wordmark — absolutely centered */}
            <span
              className="absolute left-1/2 -translate-x-1/2"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--color-text)', pointerEvents: 'none' }}
            >
              Compound
            </span>
            {/* Avatar */}
            <div className="ml-auto flex-shrink-0">
              <NavAvatar setActiveTab={setActiveTab} />
            </div>
          </div>
        ) : (
          /* ── Desktop nav: wordmark | tabs | export | import | avatar ── */
          <div className="mx-auto flex items-center" style={{ height: 48, maxWidth: 'min(94vw, 2200px)' }}>
            <span className="text-slate-100 flex-shrink-0" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Compound</span>
            <div className="flex items-center gap-1 ml-auto overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="px-3 whitespace-nowrap border-b-2 transition-colors text-xs font-medium"
                  style={{
                    height: 48,
                    borderBottomColor: activeTab === t.id ? 'var(--color-accent)' : 'transparent',
                    color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-6 flex-shrink-0">
              <button
                onClick={handleExport}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
              >Export</button>
              <button
                onClick={handleImport}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
              >Import</button>
              <div style={{ marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
                <NavAvatar setActiveTab={setActiveTab} />
              </div>
            </div>
          </div>
        )}
      </div>
```

- [ ] **Step 3.3 — Add the drawer and scrim**

After the closing `</div>` of the nav block (before `{/* Tab content */}`), add:

```tsx
      {/* Mobile drawer + scrim — position:fixed, z-60, above all content */}
      {isMobile && drawerOpen && (
        <>
          {/* Scrim — covers full viewport, tap to close */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          />
          {/* Drawer panel */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '75vw', maxWidth: 300,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            zIndex: 61,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Tab list */}
            <div style={{ flex: 1, paddingTop: 8, paddingBottom: 8, overflowY: 'auto' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setDrawerOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center',
                    width: '100%', minHeight: 44,
                    padding: '0 18px',
                    background: activeTab === t.id ? 'rgba(13,148,136,0.1)' : 'none',
                    borderLeft: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                    borderLeft: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeTab === t.id ? 600 : 400,
                    color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    textAlign: 'left',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Export / Import at bottom */}
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 18px', display: 'flex', gap: 16 }}>
              <button
                onClick={() => { handleExport(); setDrawerOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >Export</button>
              <button
                onClick={() => { handleImport(); setDrawerOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >Import</button>
            </div>
          </div>
        </>
      )}
```

- [ ] **Step 3.4 — Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.5 — Commit**

```
git add src/App.tsx
git commit -m "feat: mobile navbar — hamburger drawer"
```

---

## Task 4 — OverviewTab mobile layouts

**Files:**
- Modify: `src/tabs/OverviewTab.tsx`

### Context

Four changes in this file:
1. `KpiCell` gains `centered`, `valueFontSize`, `labelFontSize`, `subFontSize`, `subColor` props
2. KPI strip becomes 3 semantic rows at < 768px
3. Bottom row stacks to single column at < 768px
4. Retirement sub-KPI grid reflows from 6 → 3 columns at < 768px, removing the inter-group divider

- [ ] **Step 4.1 — Update `KpiCell` to support mobile centered layout**

Replace the entire `KpiCell` function definition (lines 17–42 in the original) with:

```tsx
function KpiCell({
  label, value,
  labelColor = 'var(--color-text-muted)',
  valueColor = 'var(--color-text)',
  sub, tooltip, last = false,
  centered = false,
  valueFontSize = 20,
  labelFontSize = 11,
  subFontSize = 11,
  subColor,
}: {
  label: string; value: string; labelColor?: string; valueColor?: string
  sub?: string; tooltip?: string; last?: boolean
  centered?: boolean; valueFontSize?: number; labelFontSize?: number
  subFontSize?: number; subColor?: string
}) {
  const [tip, setTip] = useState(false)

  if (centered) {
    return (
      <div style={{ textAlign: 'center', padding: '0 8px' }}>
        <div style={{ fontSize: labelFontSize, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: valueFontSize, fontWeight: 500, color: valueColor, lineHeight: 1, marginBottom: 4 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: subFontSize, color: subColor ?? 'var(--color-text-dim)' }}>{sub}</div>}
      </div>
    )
  }

  return (
    <div style={{ paddingRight: last ? 0 : 16, marginRight: last ? 0 : 16, borderRight: last ? 'none' : '1px solid var(--color-border)', position: 'relative' }}>
      <div style={{ fontSize: labelFontSize, textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {tooltip && (
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 13, height: 13, fontSize: 8, color: tip ? 'var(--color-text-muted)' : 'var(--color-text-dim)', cursor: 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >?</button>
        )}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: valueFontSize, fontWeight: 500, color: valueColor, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: subFontSize, color: subColor ?? 'var(--color-text-dim)' }}>{sub}</div>}
      {tip && tooltip && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, padding: 12, marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, width: 220, pointerEvents: 'none' }}>
          {tooltip}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4.2 — Add `useIsMobile` import and call**

Add to the imports at the top of `OverviewTab.tsx`:

```ts
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `OverviewTab()`, after the `useMilestones(...)` call, add:

```ts
  const isMobile = useIsMobile()
```

- [ ] **Step 4.3 — Replace the KPI strip with a mobile/desktop conditional**

Find the existing KPI strip block:

```tsx
      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
        <KpiCell ... />
        ...
        <KpiCell ... last />
      </div>
```

Replace the entire block (from the `{/* ── KPI strip ── */}` comment through its closing `</div>`) with:

```tsx
      {/* ── KPI strip ── */}
      {isMobile ? (
        /* Mobile: 3 semantic rows */
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
          {/* Row 1 — Income (2 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={18} labelFontSize={8} subFontSize={9}
                label="Gross Income"
                value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
                sub={grossMonthly > 0 ? '/month' : 'Add income'}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={18} labelFontSize={8} subFontSize={9}
                label="Take-Home"
                value={netMonthly > 0 ? fmt(netMonthly) : '—'}
                sub={netMonthly > 0 ? '/month' : undefined}
              />
            </div>
          </div>

          {/* Row 2 — Health metrics (3 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Consumer Debt"
                value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
                sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add in Expenses'}
              />
            </div>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Housing %"
                labelColor={housingColor} valueColor={housingColor} subColor={housingColor}
                value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
                sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28%' : 'within 28%') : undefined}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Total DTI"
                labelColor={dtiColor} valueColor={dtiColor}
                value={parseFloat(dti) > 0 ? dti + '%' : '—'}
                sub={parseFloat(dti) > 0 ? 'Consumer ' + consumerDti + '%' : undefined}
              />
            </div>
          </div>

          {/* Row 3 — Savings rates (2 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 0 4px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Retirement Rate"
                labelColor={retireColor} valueColor={retireColor} subColor={retireColor}
                value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
                sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥15%' : 'target 15%') : undefined}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Savings Rate"
                labelColor={savingsColor} valueColor={savingsColor} subColor={savingsColor}
                value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
                sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥15%' : 'target 15–20%') : undefined}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: flat 7-column grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
          <KpiCell
            label="Gross Income"
            value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
            sub={grossMonthly > 0 ? '/month' : 'Add income'}
          />
          <KpiCell
            label="Take-Home"
            value={netMonthly > 0 ? fmt(netMonthly) : '—'}
            labelColor="var(--color-text-muted)"
            sub={netMonthly > 0 ? '/month' : undefined}
          />
          <KpiCell
            label="Consumer Debt"
            value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
            sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add debts in Expenses'}
            tooltip="Your non-mortgage debt total. Paying this down frees up monthly cash flow and improves your DTI."
          />
          <KpiCell
            label="Housing %"
            value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
            labelColor={housingColor}
            sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule') : 'Add housing in Expenses'}
            tooltip="Your rent or mortgage as a share of gross monthly income. Above 28% limits your ability to save and handle debt."
          />
          <KpiCell
            label="Total DTI"
            value={parseFloat(dti) > 0 ? dti + '%' : '—'}
            labelColor={dtiColor}
            sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'}
            tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; above 36% is high-risk."
          />
          <KpiCell
            label="Retirement Rate"
            value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
            labelColor={retireColor}
            sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : 'Set contributions in Invest & Retire'}
            tooltip="Percentage of gross income going to retirement accounts. 15% is the common target. Employer match counts — capture it first."
          />
          <KpiCell
            label="Total Savings Rate"
            value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
            labelColor={savingsColor}
            sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : 'Add income & savings'}
            tooltip="How much of your gross income you're setting aside across all accounts. 15% = on track, 20%+ = building wealth aggressively."
            last
          />
        </div>
      )}
```

- [ ] **Step 4.4 — Wire `mobile` prop into SankeyChart**

Find:

```tsx
        <SankeyChart input={sankeyInput} data={data} />
```

Replace with:

```tsx
        <SankeyChart input={sankeyInput} data={data} mobile={isMobile} />
```

- [ ] **Step 4.5 — Stack the bottom row on mobile**

Find:

```tsx
      <div className="grid gap-3.5 mt-5" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
```

Replace with:

```tsx
      <div className="grid gap-3.5 mt-5" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', alignItems: 'stretch' }}>
```

- [ ] **Step 4.6 — Reflow the retirement sub-KPI grid**

Find:

```tsx
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 10 }}>
```

Replace with:

```tsx
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', marginBottom: 10 }}>
```

Then, in the same block, find the `borderRight` on the third nominal item (index 2). It currently reads:

```tsx
              <div key={i} style={{ paddingRight: 10, marginRight: 10, borderRight: i === 2 ? '1px solid var(--color-border)' : 'none' }}>
```

Replace with:

```tsx
              <div key={i} style={{ paddingRight: 10, marginRight: 10, borderRight: !isMobile && i === 2 ? '1px solid var(--color-border)' : 'none' }}>
```

- [ ] **Step 4.7 — Type-check and run all tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: no TS errors, all tests pass (includes the new `useIsMobile` tests).

- [ ] **Step 4.8 — Commit**

```
git add src/tabs/OverviewTab.tsx
git commit -m "feat: mobile overview — KPI strip, bottom row, retirement reflow"
```

---

## Task 5 — Verify in the browser

- [ ] **Step 5.1 — Start dev server**

```
npm run dev
```

Open `http://localhost:5173/Compound/` in a browser.

- [ ] **Step 5.2 — Mobile viewport check**

Open DevTools → toggle device toolbar → select iPhone 12 Pro (390×844) or any 390px width.

Verify:
- [ ] Navbar shows hamburger (left) | Compound (centered) | avatar (right)
- [ ] Tapping hamburger opens the left drawer with all 7 tabs listed
- [ ] Active tab has teal left border + tinted background in drawer
- [ ] Tapping a tab closes the drawer and navigates
- [ ] Tapping the scrim closes the drawer
- [ ] Export and Import appear at the bottom of the drawer
- [ ] Overview KPI strip: 3 rows (2-col income, 3-col health, 2-col savings), all centered
- [ ] Health colors apply to label, value, and sub-text for Housing %, DTI, Retirement Rate, Savings Rate
- [ ] Tooltip `?` buttons are gone from mobile KPI cells
- [ ] Monthly Budget Flow shows the mobile Sankey (deduction card + fan) instead of the d3 chart
- [ ] Deduction card only shows when take-home < gross (i.e., taxes/pre-tax deductions configured)
- [ ] Tapping an output node in the fan opens the DrillDownPanel below the SVG
- [ ] Bottom row: Debt Timeline stacks above Retirement Projection (single column)
- [ ] Retirement sub-KPIs: 3 columns wrapping to 2 rows (6 cells total), no center divider

- [ ] **Step 5.3 — Desktop regression check**

Set viewport to 1280px (or disable device toolbar).

Verify:
- [ ] Navbar shows: Compound (left) | tabs (right, scrollable) | Export | Import | Avatar — unchanged
- [ ] KPI strip shows 7 equal columns with tooltips — unchanged
- [ ] Sankey chart shows the full d3 layout — unchanged
- [ ] Bottom row: Debt Timeline and Retirement Projection side by side — unchanged
- [ ] Retirement sub-KPIs: 6 columns in one row with center divider — unchanged

- [ ] **Step 5.4 — Final commit**

```
git add -A
git commit -m "feat: mobile optimization — overview tab and shell navbar"
```
