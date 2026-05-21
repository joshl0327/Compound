# Overview Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Overview tab with a layered financial dashboard — situational headline, KPI strip, multi-layer Sankey diagram (income sources → gross → buckets), debt-free timeline, and retirement projection with Fidelity benchmarks.

**Architecture:** A new `SankeyChart` component uses `d3-sankey` purely for node/link position math, rendering all SVG and HTML labels in React. Pure helper functions in `sankeyHelpers.ts` handle graph data construction and headline generation, making the logic unit-testable. `OverviewTab` assembles all pieces and wires them to the existing `useMetrics` hook.

**Tech Stack:** React 18, TypeScript, d3-sankey (layout only), Vitest, existing `useMetrics` hook, existing `calcPayoff`/`buildAggregateProjection` from `src/lib/calculations.ts`.

---

## File Map

| File | Status | Role |
|---|---|---|
| `src/lib/sankeyHelpers.ts` | **Create** | Pure functions: `buildSankeyData`, `computeSituationalRead`, `computeNetWorthPositiveMonths`, label collision |
| `src/lib/sankeyHelpers.test.ts` | **Create** | Unit tests for all pure helpers |
| `src/components/SankeyChart.tsx` | **Create** | Multi-layer Sankey diagram component |
| `src/components/DebtTimeline.tsx` | **Create** | Horizontal debt-free timeline |
| `src/components/LineChart.tsx` | **Modify** | Add optional `benchmarks` prop |
| `src/tabs/OverviewTab.tsx` | **Replace** | New page layout |

---

## Task 1: Install d3-sankey

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd C:\Users\joshl\Documents\Projects\Compound
npm install d3-sankey
npm install --save-dev @types/d3-sankey
```

- [ ] **Step 2: Verify TypeScript resolves the types**

```bash
npx tsc --noEmit
```

Expected: no errors about `d3-sankey`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add d3-sankey for Sankey layout math"
```

---

## Task 2: sankeyHelpers — types and buildSankeyData

**Files:**
- Create: `src/lib/sankeyHelpers.ts`
- Create: `src/lib/sankeyHelpers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/sankeyHelpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildSankeyData, buildSankeyDataCollapsed } from './sankeyHelpers'
import type { SankeyInput } from './sankeyHelpers'

const base: SankeyInput = {
  grossMonthly: 18017,
  netMonthly: 12527,
  trad401kMonthly: 2563,
  roth401kMonthly: 0,
  hsaMonthly: 583,
  employerMatch: 0,
  essTotalP: 7065,
  discPlanTotal: 2072,
  debtPlanTotal: 1802,
  liquidSavingsMonthly: 1010,
  rothIraMonthly: 583,
  dti: '41.4',
  housingPct: '31.4',
  savingsRate: '26.3',
  retireRate: '20.7',
  sourceCalcs: [
    { src: { id: 'p1', name: 'Person 1', type: 'w2' } as any, gross: 18017, net: 12527, trad401k: 2563, roth401k: 0, match: 0, rothIra: 583, perYear: 26, isSimple: true },
  ],
}

describe('buildSankeyData (expanded)', () => {
  it('includes one col-0 node per source', () => {
    const { nodes } = buildSankeyData(base)
    const col0 = nodes.filter(n => n.col === 0)
    expect(col0).toHaveLength(1)
    expect(col0[0].id).toBe('src-p1')
    expect(col0[0].label).toBe('Person 1')
  })

  it('includes gross node in col 1', () => {
    const { nodes } = buildSankeyData(base)
    const gross = nodes.find(n => n.id === 'gross')
    expect(gross?.col).toBe(1)
  })

  it('includes pretax-ret and taxes and takehome in col 2', () => {
    const { nodes } = buildSankeyData(base)
    const ids = nodes.filter(n => n.col === 2).map(n => n.id)
    expect(ids).toContain('pretax-ret')
    expect(ids).toContain('taxes')
    expect(ids).toContain('takehome')
  })

  it('omits roth401k col-2 node when roth401kMonthly is 0', () => {
    const { nodes } = buildSankeyData(base)
    expect(nodes.find(n => n.id === 'roth401k')).toBeUndefined()
  })

  it('includes roth401k col-2 node when nonzero', () => {
    const { nodes } = buildSankeyData({ ...base, roth401kMonthly: 500 })
    expect(nodes.find(n => n.id === 'roth401k')).toBeDefined()
  })

  it('includes bucket nodes in col 3', () => {
    const { nodes } = buildSankeyData(base)
    const col3 = nodes.filter(n => n.col === 3).map(n => n.id)
    expect(col3).toContain('essentials')
    expect(col3).toContain('discretionary')
    expect(col3).toContain('debt')
    expect(col3).toContain('liquid-savings')
    expect(col3).toContain('retirement')
  })

  it('adds remaining node when surplus > 0', () => {
    const surplus: SankeyInput = { ...base, netMonthly: 20000 }
    const { nodes } = buildSankeyData(surplus)
    expect(nodes.find(n => n.id === 'remaining')).toBeDefined()
    expect(nodes.find(n => n.id === 'overshoot')).toBeUndefined()
  })

  it('adds overshoot node when buckets exceed take-home', () => {
    const overspend: SankeyInput = { ...base, netMonthly: 5000 }
    const { nodes } = buildSankeyData(overspend)
    expect(nodes.find(n => n.id === 'overshoot')).toBeDefined()
    expect(nodes.find(n => n.id === 'remaining')).toBeUndefined()
  })

  it('computes taxes correctly', () => {
    const { links } = buildSankeyData(base)
    const taxLink = links.find(l => l.target === 'taxes')
    // taxes = gross - net - trad401k - hsa - roth401k
    // = 18017 - 12527 - 2563 - 583 - 0 = 2344
    expect(taxLink?.value).toBeCloseTo(2344, 0)
  })

  it('all source→gross link values sum to grossMonthly', () => {
    const { links } = buildSankeyData(base)
    const srcLinks = links.filter(l => l.target === 'gross')
    const total = srcLinks.reduce((s, l) => s + l.value, 0)
    expect(total).toBeCloseTo(base.grossMonthly, 0)
  })

  it('omits zero-value bucket nodes', () => {
    const { nodes } = buildSankeyData({ ...base, debtPlanTotal: 0 })
    expect(nodes.find(n => n.id === 'debt')).toBeUndefined()
  })
})

describe('buildSankeyDataCollapsed', () => {
  it('has exactly one col-0 node labeled Total Income', () => {
    const { nodes } = buildSankeyDataCollapsed(base)
    const col0 = nodes.filter(n => n.col === 0)
    expect(col0).toHaveLength(1)
    expect(col0[0].id).toBe('total-income')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/lib/sankeyHelpers.test.ts --reporter verbose
```

Expected: all tests fail with "Cannot find module './sankeyHelpers'".

- [ ] **Step 3: Implement sankeyHelpers.ts**

Create `src/lib/sankeyHelpers.ts`:

```typescript
import type { SourceCalc } from '../types'

export interface SkNode {
  id: string
  label: string
  color: string
  col: 0 | 1 | 2 | 3
  tooltip: string
  isStructural?: boolean
  isOvershoot?: boolean
  isFlagged?: boolean
  employerMatchAmt?: number
}

export interface SkLink {
  source: string
  target: string
  value: number
  sourceColor: string
  targetColor: string
  isFlagged?: boolean
}

export interface SankeyInput {
  grossMonthly: number
  netMonthly: number
  trad401kMonthly: number
  roth401kMonthly: number
  hsaMonthly: number
  employerMatch: number
  essTotalP: number
  discPlanTotal: number
  debtPlanTotal: number
  liquidSavingsMonthly: number
  rothIraMonthly: number
  dti: string
  housingPct: string
  savingsRate: string
  retireRate: string
  sourceCalcs: SourceCalc[]
}

const STRUCTURAL = '#1a2840'

function link(source: string, target: string, value: number, sourceColor: string, targetColor: string, isFlagged = false): SkLink {
  return { source, target, value: Math.max(0.01, value), sourceColor, targetColor, isFlagged }
}

export function buildSankeyData(input: SankeyInput): { nodes: SkNode[]; links: SkLink[] } {
  const {
    grossMonthly, netMonthly, trad401kMonthly, roth401kMonthly, hsaMonthly,
    employerMatch, essTotalP, discPlanTotal, debtPlanTotal, liquidSavingsMonthly,
    rothIraMonthly, dti, housingPct, sourceCalcs,
  } = input

  const nodes: SkNode[] = []
  const links: SkLink[] = []
  const dtiNum = parseFloat(dti)
  const housingNum = parseFloat(housingPct)

  // ── Col 0: Income sources ──
  sourceCalcs.forEach(c => {
    const color = c.src.type === 'w2' ? '#60a5fa' : '#a78bfa'
    nodes.push({
      id: `src-${c.src.id}`,
      label: c.src.name,
      color,
      col: 0,
      tooltip: `${c.src.name}: $${Math.round(c.gross).toLocaleString()}/mo gross`,
    })
    links.push(link(`src-${c.src.id}`, 'gross', c.gross, color, STRUCTURAL))
  })

  // ── Col 1: Gross ──
  nodes.push({ id: 'gross', label: 'Gross Income', color: STRUCTURAL, col: 1, isStructural: true, tooltip: 'Total gross income before any deductions.' })

  // ── Col 2: Pre-tax split ──
  const pretaxRet = trad401kMonthly + hsaMonthly
  if (pretaxRet > 0) {
    nodes.push({
      id: 'pretax-ret',
      label: 'Pre-tax Retirement',
      color: '#a78bfa',
      col: 2,
      tooltip: 'Traditional 401(k) + HSA contributions (pre-tax, reduce taxable income).',
      employerMatchAmt: employerMatch,
    })
    links.push(link('gross', 'pretax-ret', pretaxRet, STRUCTURAL, '#a78bfa'))
  }

  if (roth401kMonthly > 0) {
    nodes.push({ id: 'roth401k', label: 'Roth 401(k)', color: '#7c3aed', col: 2, tooltip: 'Roth 401(k) payroll deduction — post-tax but removed before take-home.' })
    links.push(link('gross', 'roth401k', roth401kMonthly, STRUCTURAL, '#7c3aed'))
  }

  const taxes = grossMonthly - netMonthly - trad401kMonthly - hsaMonthly - roth401kMonthly
  if (taxes > 0) {
    nodes.push({ id: 'taxes', label: 'Taxes', color: '#3a5a7a', col: 2, tooltip: 'Federal, state, and local taxes estimated from your paycheck data.' })
    links.push(link('gross', 'taxes', taxes, STRUCTURAL, '#3a5a7a'))
  }

  nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, isStructural: true, tooltip: 'Money deposited to your bank account each month.' })
  links.push(link('gross', 'takehome', netMonthly, STRUCTURAL, '#60a5fa'))

  // ── Col 3: Spending buckets ──
  const housingFlagged = housingNum > 28
  if (essTotalP > 0) {
    nodes.push({
      id: 'essentials', label: 'Essentials',
      color: housingFlagged ? '#f97316' : '#60a5fa',
      col: 3, isFlagged: housingFlagged,
      tooltip: 'Fixed monthly costs — housing, utilities, groceries, insurance.',
    })
    links.push(link('takehome', 'essentials', essTotalP, '#60a5fa', housingFlagged ? '#f97316' : '#60a5fa', housingFlagged))
  }

  if (discPlanTotal > 0) {
    nodes.push({ id: 'discretionary', label: 'Discretionary', color: '#fbbf24', col: 3, tooltip: 'Flexible spending — dining, subscriptions, entertainment.' })
    links.push(link('takehome', 'discretionary', discPlanTotal, '#60a5fa', '#fbbf24'))
  }

  const dtiFlagged = dtiNum >= 36
  if (debtPlanTotal > 0) {
    nodes.push({
      id: 'debt', label: 'Debt',
      color: dtiFlagged ? '#f97316' : '#60a5fa',
      col: 3, isFlagged: dtiFlagged,
      tooltip: `Consumer debt payments. Total DTI: ${dti}%.`,
    })
    links.push(link('takehome', 'debt', debtPlanTotal, '#60a5fa', dtiFlagged ? '#f97316' : '#60a5fa', dtiFlagged))
  }

  if (liquidSavingsMonthly > 0) {
    nodes.push({ id: 'liquid-savings', label: 'Liquid Savings', color: '#10b981', col: 3, tooltip: 'Emergency fund + general savings contributions.' })
    links.push(link('takehome', 'liquid-savings', liquidSavingsMonthly, '#60a5fa', '#10b981'))
  }

  if (rothIraMonthly > 0) {
    nodes.push({ id: 'retirement', label: 'Retirement', color: '#a78bfa', col: 3, tooltip: 'Roth IRA contribution funded from take-home income.' })
    links.push(link('takehome', 'retirement', rothIraMonthly, '#60a5fa', '#a78bfa'))
  }

  const bucketSum = essTotalP + discPlanTotal + debtPlanTotal + liquidSavingsMonthly + rothIraMonthly
  const remaining = netMonthly - bucketSum

  if (remaining > 1) {
    nodes.push({ id: 'remaining', label: 'Remaining', color: '#3a5a7a', col: 3, tooltip: 'Unallocated take-home — consider assigning to savings or debt.' })
    links.push(link('takehome', 'remaining', remaining, '#60a5fa', '#3a5a7a'))
  } else if (remaining < -1) {
    nodes.push({ id: 'overshoot', label: 'Overshoot', color: '#ef4444', col: 3, isOvershoot: true, tooltip: `Spending exceeds take-home by $${Math.round(Math.abs(remaining)).toLocaleString()}/mo.` })
    links.push(link('takehome', 'overshoot', Math.abs(remaining), '#60a5fa', '#ef4444', true))
  }

  return { nodes, links }
}

export function buildSankeyDataCollapsed(input: SankeyInput): { nodes: SkNode[]; links: SkLink[] } {
  const expanded = buildSankeyData(input)
  const col0Collapsed: SkNode = {
    id: 'total-income',
    label: 'Total Income',
    color: '#60a5fa',
    col: 0,
    tooltip: 'Combined gross income from all sources.',
  }
  const nonCol0 = expanded.nodes.filter(n => n.col !== 0)
  const nonSrcLinks = expanded.links.filter(l => l.target !== 'gross')
  const grossLink: SkLink = {
    source: 'total-income',
    target: 'gross',
    value: input.grossMonthly,
    sourceColor: '#60a5fa',
    targetColor: STRUCTURAL,
  }
  return { nodes: [col0Collapsed, ...nonCol0], links: [grossLink, ...nonSrcLinks] }
}

// ── Label collision avoidance ──
export interface LabelPos {
  nodeId: string
  top: number  // CSS px from top of SVG container
}

const MIN_LABEL_H = 44

export function computeLabelPositions(
  nodes: { id: string; y0: number; y1: number }[],
  pxPerViewboxUnit: number,
): LabelPos[] {
  const positions = nodes.map(n => ({
    nodeId: n.id,
    top: ((n.y0 + n.y1) / 2) * pxPerViewboxUnit - MIN_LABEL_H / 2,
  }))
  positions.sort((a, b) => a.top - b.top)

  // Forward pass — push down
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    if (positions[i].top < prev.top + MIN_LABEL_H) {
      positions[i].top = prev.top + MIN_LABEL_H
    }
  }

  return positions
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/lib/sankeyHelpers.test.ts --reporter verbose
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sankeyHelpers.ts src/lib/sankeyHelpers.test.ts
git commit -m "feat: add sankeyHelpers — buildSankeyData and label collision util"
```

---

## Task 3: sankeyHelpers — situational read + milestone helpers

**Files:**
- Modify: `src/lib/sankeyHelpers.ts`
- Modify: `src/lib/sankeyHelpers.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/sankeyHelpers.test.ts`:

```typescript
import { computeSituationalRead, computeNetWorthPositiveMonths } from './sankeyHelpers'
import type { AppData } from '../types'

describe('computeSituationalRead', () => {
  it('returns overspend message when planSurplus < 0', () => {
    const result = computeSituationalRead({
      planSurplus: -500, dti: '30', savingsRate: '10',
      hasConsumerDebt: true, consumerDebtBalance: 30000,
    })
    expect(result.headline).toMatch(/spending .* more than you take home/i)
    expect(result.isOvershoot).toBe(true)
  })

  it('returns strong-saver-with-debt message when DTI ≥ 36 and savings ≥ 15%', () => {
    const result = computeSituationalRead({
      planSurplus: 1000, dti: '41.4', savingsRate: '26.3',
      hasConsumerDebt: true, consumerDebtBalance: 30000,
    })
    expect(result.headline).toMatch(/strong saver/i)
    expect(result.headline).toMatch(/DTI/i)
  })

  it('returns high-DTI message when DTI ≥ 36 and savings < 15%', () => {
    const result = computeSituationalRead({
      planSurplus: 200, dti: '38', savingsRate: '8',
      hasConsumerDebt: true, consumerDebtBalance: 15000,
    })
    expect(result.headline).toMatch(/high debt load/i)
  })

  it('returns debt-free + strong savings message', () => {
    const result = computeSituationalRead({
      planSurplus: 2000, dti: '10', savingsRate: '20',
      hasConsumerDebt: false, consumerDebtBalance: 0,
    })
    expect(result.headline).toMatch(/debt-free/i)
    expect(result.headline).toMatch(/savings rate/i)
  })

  it('returns default message when no income', () => {
    const result = computeSituationalRead({
      planSurplus: 0, dti: '0', savingsRate: '0',
      hasConsumerDebt: false, consumerDebtBalance: 0, noIncome: true,
    })
    expect(result.headline).toBe('')
  })
})

describe('computeNetWorthPositiveMonths', () => {
  it('returns null when no savings data', () => {
    expect(computeNetWorthPositiveMonths({
      savingsBalance: 0, retirementBalance: 0, monthlyContrib: 0,
      totalDebtBalance: 50000, monthlyDebtPayment: 1000,
    })).toBeNull()
  })

  it('returns month count when assets overtake debt', () => {
    // Start: 10k assets, 30k debt. +500/mo assets, -1000/mo debt.
    // After 20 months: assets = 10k + 10k = 20k, debt = 30k - 20k = 10k. Not yet.
    // After 40 months: assets = 10k + 20k = 30k, debt = 30k - 40k = 0 (hits 0 before).
    // Simple linear: when savingsBalance + monthlyContrib*t > totalDebtBalance - monthlyDebtPayment*t
    // 10000 + 500t > 30000 - 1000t → 1500t > 20000 → t > 13.3 → t = 14
    const result = computeNetWorthPositiveMonths({
      savingsBalance: 10000, retirementBalance: 0, monthlyContrib: 500,
      totalDebtBalance: 30000, monthlyDebtPayment: 1000,
    })
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it('returns null when already net-worth-positive', () => {
    const result = computeNetWorthPositiveMonths({
      savingsBalance: 50000, retirementBalance: 0, monthlyContrib: 500,
      totalDebtBalance: 10000, monthlyDebtPayment: 1000,
    })
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/lib/sankeyHelpers.test.ts --reporter verbose
```

Expected: the new tests fail with "is not a function".

- [ ] **Step 3: Implement in sankeyHelpers.ts**

Append to the end of `src/lib/sankeyHelpers.ts`:

```typescript
// ── Situational read ──

interface SituationalInput {
  planSurplus: number
  dti: string
  savingsRate: string
  hasConsumerDebt: boolean
  consumerDebtBalance: number
  noIncome?: boolean
}

export interface SituationalRead {
  headline: string
  isOvershoot: boolean
}

export function computeSituationalRead(input: SituationalInput): SituationalRead {
  const { planSurplus, dti, savingsRate, hasConsumerDebt, consumerDebtBalance, noIncome } = input
  const dtiNum = parseFloat(dti)
  const srNum = parseFloat(savingsRate)
  const debtStr = consumerDebtBalance >= 1000
    ? '$' + Math.round(consumerDebtBalance / 1000) + 'k'
    : '$' + Math.round(consumerDebtBalance)

  if (noIncome || (!dtiNum && !srNum && !hasConsumerDebt && planSurplus === 0)) {
    return { headline: '', isOvershoot: false }
  }
  if (planSurplus < 0) {
    return {
      headline: `You're spending $${Math.round(Math.abs(planSurplus)).toLocaleString()}/mo more than you take home.`,
      isOvershoot: true,
    }
  }
  if (dtiNum >= 36 && srNum >= 15) {
    return {
      headline: `Strong saver carrying ${debtStr} at ${dti}% DTI. Aim some of that surplus at the debt.`,
      isOvershoot: false,
    }
  }
  if (dtiNum >= 36) {
    return {
      headline: `High debt load at ${dti}% DTI — consider redirecting discretionary cash to payoff.`,
      isOvershoot: false,
    }
  }
  if (!hasConsumerDebt && srNum >= 15) {
    return {
      headline: `Debt-free with ${savingsRate}% savings rate — keep the compounding going.`,
      isOvershoot: false,
    }
  }
  if (!hasConsumerDebt) {
    return { headline: `Debt-free — grow the savings rate toward 15%.`, isOvershoot: false }
  }
  if (srNum >= 15) {
    return { headline: `Saving ${savingsRate}% of gross income — on track.`, isOvershoot: false }
  }
  return {
    headline: `Add your income, expenses, and debts to see your full picture.`,
    isOvershoot: false,
  }
}

// ── Net-worth-positive milestone ──

interface NetWorthInput {
  savingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  totalDebtBalance: number
  monthlyDebtPayment: number
}

export function computeNetWorthPositiveMonths(input: NetWorthInput): number | null {
  const { savingsBalance, retirementBalance, monthlyContrib, totalDebtBalance, monthlyDebtPayment } = input
  const totalAssets = savingsBalance + retirementBalance
  if (totalAssets >= totalDebtBalance) return null  // already positive
  if (monthlyContrib + monthlyDebtPayment <= 0) return null  // never converges

  // Linear approximation: assets(t) = totalAssets + monthlyContrib*t
  // debt(t) = totalDebtBalance - monthlyDebtPayment*t
  // Solve: totalAssets + monthlyContrib*t = totalDebtBalance - monthlyDebtPayment*t
  const rate = monthlyContrib + monthlyDebtPayment
  const gap = totalDebtBalance - totalAssets
  const months = Math.ceil(gap / rate)
  return months > 0 ? months : null
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/sankeyHelpers.test.ts --reporter verbose
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sankeyHelpers.ts src/lib/sankeyHelpers.test.ts
git commit -m "feat: add situational read and net-worth-positive milestone helpers"
```

---

## Task 4: Extend LineChart with Fidelity benchmarks

**Files:**
- Modify: `src/components/LineChart.tsx`

- [ ] **Step 1: Update LineChart to accept benchmarks prop**

Replace the full contents of `src/components/LineChart.tsx`:

```tsx
import { fmtShort } from '../lib/format'

interface DataPoint { age: number; balance: number }

export interface Benchmark {
  age: number
  value: number
  label: string
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  benchmarks?: Benchmark[]
}

export default function LineChart({ data, height: h = 200, benchmarks }: LineChartProps) {
  const w = 400
  const pad = { t: 10, r: 20, b: 30, l: 55 }
  const chartW = w - pad.l - pad.r
  const chartH = h - pad.t - pad.b

  if (!data || data.length < 2) {
    return <div className="text-muted text-[13px] text-center py-10">Enter your age and target age to see projections</div>
  }

  const maxVal = Math.max(...data.map(d => d.balance), ...(benchmarks ?? []).map(b => b.value)) || 1
  const minAge = data[0].age
  const maxAge = data[data.length - 1].age
  const ageRange = maxAge - minAge || 1
  const xStep = chartW / (data.length - 1)

  const points = data.map((d, i) =>
    `${pad.l + i * xStep},${pad.t + chartH - (d.balance / maxVal) * chartH}`
  ).join(' ')

  const fillPoints = [
    `${pad.l},${pad.t + chartH}`,
    ...data.map((_, i) => `${pad.l + i * xStep},${pad.t + chartH - (data[i].balance / maxVal) * chartH}`),
    `${pad.l + chartW},${pad.t + chartH}`,
  ].join(' ')

  const visibleBenchmarks = (benchmarks ?? []).filter(b =>
    b.age >= minAge && b.age <= maxAge && b.value <= maxVal
  )

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="retirementGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => {
        const v = Math.round((maxVal / 4) * i)
        const y = pad.t + chartH - (v / maxVal) * chartH
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + chartW} y2={y} stroke="#1a2840" strokeWidth={1} strokeDasharray="4 4" />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#5a7a9a">{fmtShort(v)}</text>
          </g>
        )
      })}

      {/* Fidelity benchmark lines (behind the main line) */}
      {visibleBenchmarks.map(b => {
        const y = pad.t + chartH - (b.value / maxVal) * chartH
        const x = pad.l + ((b.age - minAge) / ageRange) * chartW
        return (
          <g key={b.label}>
            <line
              x1={pad.l} y1={y} x2={pad.l + chartW} y2={y}
              stroke="#3a5a7a" strokeWidth={1} strokeDasharray="3 4" opacity={0.5}
            />
            <text x={pad.l + chartW - 2} y={y - 3} textAnchor="end" fontSize={8} fill="#3a5a7a">
              {b.label}
            </text>
            {/* Age tick on x-axis */}
            <line x1={x} y1={pad.t + chartH} x2={x} y2={pad.t + chartH + 4} stroke="#3a5a7a" strokeWidth={1} opacity={0.5} />
          </g>
        )
      })}

      {/* Age labels */}
      {data
        .filter((d, i) => i === 0 || i === data.length - 1 || d.age % 10 === 0)
        .map(d => {
          const idx = data.indexOf(d)
          return (
            <text key={'x' + idx} x={pad.l + idx * xStep} y={h - 6} textAnchor="middle" fontSize={9} fill="#5a7a9a">
              {d.age}
            </text>
          )
        })}

      {/* Main line + fill */}
      <polygon points={fillPoints} fill="url(#retirementGrad)" />
      <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={pad.l} cy={pad.t + chartH} r={3} fill="#a78bfa" />
      <circle
        cx={pad.l + chartW}
        cy={pad.t + chartH - (data[data.length - 1].balance / maxVal) * chartH}
        r={4}
        fill="#a78bfa"
      />
      <text
        x={pad.l + chartW - 4}
        y={Math.max(pad.t + 12, pad.t + chartH - (data[data.length - 1].balance / maxVal) * chartH - 8)}
        textAnchor="end" fontSize={9} fill="#a78bfa" fontWeight={700} fontFamily="DM Mono, monospace"
      >
        {fmtShort(data[data.length - 1].balance)}
      </text>
    </svg>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LineChart.tsx
git commit -m "feat: add optional Fidelity benchmarks prop to LineChart"
```

---

## Task 5: SankeyChart — layout skeleton

Build the SVG backbone: ResizeObserver dimensions, d3-sankey layout, node rects, link paths with gradients, waterline marker, and source toggle.

**Files:**
- Create: `src/components/SankeyChart.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/SankeyChart.tsx`:

```tsx
import { useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react'
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'
import type { SankeyNode, SankeyLink } from 'd3-sankey'
import { buildSankeyData, buildSankeyDataCollapsed, computeLabelPositions } from '../lib/sankeyHelpers'
import type { SkNode, SkLink, LabelPos } from '../lib/sankeyHelpers'
import { fmt, fmtShort } from '../lib/format'
import type { AppData } from '../types'
import type { SankeyInput } from '../lib/sankeyHelpers'

type LayoutNode = SankeyNode<SkNode, SkLink> & SkNode
type LayoutLink = SankeyLink<SkNode, SkLink> & SkLink

const LABEL_W = 220   // px reserved on right for col-3 labels
const SRC_LABEL_W = 110  // px reserved on left for col-0 labels
const NODE_W = 18

interface DrillDownItem {
  name: string
  amount: number
  balance?: number
  total: number
}

interface SankeyChartProps {
  input: SankeyInput
  data: AppData
  dti: string
  housingPct: string
  savingsRate: string
  retireRate: string
  employerMatch: number
}

export default function SankeyChart({ input, data, dti, housingPct, savingsRate, retireRate, employerMatch }: SankeyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 420 })
  const [collapsed, setCollapsed] = useState(false)
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [labelPositions, setLabelPositions] = useState<LabelPos[]>([])

  // ── Measure container ──
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setDims({ w: Math.max(width, 400), h: 420 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Build graph ──
  const { nodes: rawNodes, links: rawLinks } = useMemo(
    () => collapsed ? buildSankeyDataCollapsed(input) : buildSankeyData(input),
    [input, collapsed]
  )

  // ── Run d3-sankey layout ──
  const graph = useMemo(() => {
    if (dims.w === 0) return null
    const layout = sankey<SkNode, SkLink>()
      .nodeId((d) => (d as SkNode).id)
      .nodeAlign(sankeyLeft)
      .nodeWidth(NODE_W)
      .nodePadding(10)
      .extent([[SRC_LABEL_W, 10], [dims.w - LABEL_W, dims.h - 10]])
    try {
      return layout({
        nodes: rawNodes.map(n => ({ ...n })),
        links: rawLinks.map(l => ({ ...l })),
      })
    } catch {
      return null
    }
  }, [rawNodes, rawLinks, dims])

  // ── Compute label positions ──
  useLayoutEffect(() => {
    if (!graph) return
    const scale = dims.h / dims.h  // 1:1 since viewBox = dims
    const col3Nodes = graph.nodes.filter((n) => (n as LayoutNode).col === 3)
    setLabelPositions(computeLabelPositions(col3Nodes as LayoutNode[], scale))
  }, [graph, dims])

  // ── Waterline: y0 of Gross→Takehome link ──
  const waterlineY = useMemo(() => {
    if (!graph) return null
    const lnk = graph.links.find(
      l => ((l.source as LayoutNode).id === 'gross' && (l.target as LayoutNode).id === 'takehome')
    )
    return lnk ? (lnk as any).y0 : null
  }, [graph])

  const handleNodeClick = useCallback((nodeId: string) => {
    setActiveNode(prev => prev === nodeId ? null : nodeId)
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (!graph) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: '#3a5a7a' }}>
      Add your income to see the flow.
    </div>
  )

  const isOvershoot = rawNodes.some(n => n.isOvershoot)
  const hasSurplus = rawNodes.some(n => n.id === 'remaining')
  const showToggle = !collapsed && input.sourceCalcs.length > 1 || collapsed

  return (
    <div>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#3a5a7a' }}>Where it goes</div>
          <div className="font-display font-bold text-[15px]" style={{ color: '#e8f0f8' }}>
            {fmtShort(input.grossMonthly)}<span style={{ color: '#3a5a7a', fontWeight: 400, fontSize: 12 }}>/mo gross</span>
          </div>
        </div>
        {(input.sourceCalcs.length > 1) && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-[11px] px-3 py-1 rounded"
            style={{ color: '#60a5fa', border: '1px solid #1a2840', background: '#0d1620' }}
          >
            {collapsed ? 'Sources ▸' : 'Sources ▾'}
          </button>
        )}
      </div>

      {/* SVG + label overlay */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: dims.h }}>
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label={`Income flow from ${fmtShort(input.grossMonthly)} gross to ${rawNodes.filter(n => n.col === 3).length} spending categories`}
          role="img"
        >
          <defs>
            {graph.links.map((l, i) => {
              const sl = l as LayoutLink
              return (
                <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={sl.sourceColor} stopOpacity={sl.isFlagged ? 0.5 : 0.35} />
                  <stop offset="100%" stopColor={sl.targetColor} stopOpacity={sl.isFlagged ? 0.45 : 0.25} />
                </linearGradient>
              )
            })}
          </defs>

          {/* Links */}
          {graph.links.map((l, i) => {
            const sl = l as LayoutLink
            const pathGen = sankeyLinkHorizontal()
            const d = pathGen(l as any) || ''
            return (
              <path
                key={i}
                d={d}
                fill={`url(#grad-${i})`}
                stroke={sl.targetColor}
                strokeWidth={sl.isFlagged ? 1.5 : 1}
                strokeOpacity={sl.isFlagged ? 0.9 : 0.6}
                onMouseEnter={e => {
                  const src = (l.source as LayoutNode).label
                  const tgt = (l.target as LayoutNode).label
                  setTooltip({ x: e.clientX, y: e.clientY, text: `${src} → ${tgt}: ${fmt(sl.value)}/mo` })
                }}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'default' }}
              >
                <title>{`${(l.source as LayoutNode).label} → ${(l.target as LayoutNode).label}: ${fmt(sl.value)}/mo`}</title>
              </path>
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((n) => {
            const sn = n as LayoutNode
            const isActive = activeNode === sn.id
            const x0 = sn.x0 ?? 0
            const x1 = sn.x1 ?? 0
            const y0 = sn.y0 ?? 0
            const y1 = sn.y1 ?? 0
            const isOvershootNode = sn.isOvershoot
            const isTakehome = sn.id === 'takehome'
            const borderColor = isOvershootNode ? '#ef4444' : sn.isStructural ? '#60a5fa' : sn.color
            const fillOpacity = isActive ? 0.5 : 0.25
            return (
              <rect
                key={sn.id}
                x={x0} y={y0}
                width={x1 - x0} height={Math.max(y1 - y0, 2)}
                rx={3}
                fill={sn.isStructural ? '#1a2840' : sn.color}
                fillOpacity={sn.isStructural ? 1 : fillOpacity}
                stroke={isOvershootNode || (isTakehome && isOvershoot) ? '#ef4444' : borderColor}
                strokeWidth={isActive || isOvershootNode ? 1.5 : 0.8}
                strokeOpacity={isOvershootNode ? 0.9 : 0.5}
                style={{ cursor: sn.col === 3 || sn.col === 0 ? 'pointer' : 'default' }}
                onClick={() => (sn.col === 3 || sn.col === 0) && handleNodeClick(sn.id)}
                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: sn.tooltip })}
                onMouseLeave={handleMouseLeave}
                tabIndex={sn.col === 3 || sn.col === 0 ? 0 : undefined}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(sn.id) }}
              >
                <title>{`${sn.label}: ${fmt(sn.value ?? 0)}/mo`}</title>
              </rect>
            )
          })}

          {/* Waterline */}
          {waterlineY !== null && (
            <g>
              <line
                x1={SRC_LABEL_W - 8} y1={waterlineY}
                x2={dims.w - LABEL_W + 8} y2={waterlineY}
                stroke="#60a5fa" strokeWidth={0.8} strokeDasharray="5 3" opacity={0.6}
              />
              <text x={SRC_LABEL_W - 10} y={waterlineY - 3} textAnchor="end" fontSize={8} fill="#60a5fa" opacity={0.8}>
                Take-home ↓ {fmt(input.netMonthly)}
              </text>
            </g>
          )}

          {/* Leader lines for col-3 right-side labels */}
          {labelPositions.map(pos => {
            const node = graph.nodes.find(n => (n as LayoutNode).id === pos.nodeId) as LayoutNode | undefined
            if (!node) return null
            const nodeRightX = node.x1 ?? 0
            const nodeMidY = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2
            const labelMidY = pos.top + 22  // center of 44px label
            return (
              <line
                key={`leader-${pos.nodeId}`}
                x1={nodeRightX + 4} y1={nodeMidY}
                x2={dims.w - LABEL_W + 4} y2={labelMidY}
                stroke={node.color} strokeWidth={0.8} opacity={0.5}
                strokeDasharray={Math.abs(labelMidY - nodeMidY) > 20 ? '2 3' : undefined}
              />
            )
          })}
        </svg>

        {/* Col-3 HTML labels */}
        {labelPositions.map(pos => {
          const node = graph.nodes.find(n => (n as LayoutNode).id === pos.nodeId) as LayoutNode | undefined
          if (!node) return null
          const sn = node as LayoutNode
          const pctOfGross = input.grossMonthly > 0
            ? ((sn.value ?? 0) / input.grossMonthly * 100).toFixed(1) + '%'
            : ''
          const flagLine = getFlagLine(sn.id, { dti, housingPct, savingsRate, retireRate, employerMatch, isOvershoot, input })

          return (
            <div
              key={`lbl-${sn.id}`}
              style={{
                position: 'absolute',
                top: pos.top,
                left: dims.w - LABEL_W + 12,
                width: LABEL_W - 16,
                pointerEvents: 'none',
              }}
            >
              <div style={{ color: sn.color, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
                {sn.label}
              </div>
              <div style={{ color: '#e8f0f8', fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
                {fmt(sn.value ?? 0)}
                <span style={{ color: '#3a5a7a', fontSize: 9, marginLeft: 6 }}>{pctOfGross}</span>
              </div>
              {flagLine && (
                <div style={{ color: flagLine.color, fontSize: 8, fontStyle: 'italic', lineHeight: 1 }}>
                  {flagLine.text}
                </div>
              )}
            </div>
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              background: 'rgba(7,14,22,0.95)',
              border: '1px solid #1a2840',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: '#c9d8e8',
              pointerEvents: 'none',
              zIndex: 50,
              maxWidth: 220,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Drill-down panel */}
      {activeNode && (
        <DrillDownPanel
          nodeId={activeNode}
          data={data}
          input={input}
          onClose={() => setActiveNode(null)}
        />
      )}
    </div>
  )
}

// ── Health flag helper ──
function getFlagLine(
  nodeId: string,
  ctx: { dti: string; housingPct: string; savingsRate: string; retireRate: string; employerMatch: number; isOvershoot: boolean; input: SankeyInput }
): { text: string; color: string } | null {
  const { dti, housingPct, savingsRate, retireRate, employerMatch, isOvershoot } = ctx
  switch (nodeId) {
    case 'debt':
      if (parseFloat(dti) >= 36)
        return { text: `↑ DTI ${dti}% — high`, color: '#ef4444' }
      return null
    case 'essentials':
      if (parseFloat(housingPct) > 28)
        return { text: `↑ Housing ${housingPct}% — above 28%`, color: '#f97316' }
      return null
    case 'liquid-savings':
      if (parseFloat(savingsRate) >= 15)
        return { text: `↑ ${savingsRate}% savings rate — strong`, color: '#10b981' }
      return null
    case 'pretax-ret':
      if (parseFloat(retireRate) >= 15)
        return { text: `↑ ${retireRate}% retire rate — strong`, color: '#10b981' }
      if (employerMatch > 0)
        return { text: `+${fmt(employerMatch)}/mo employer match`, color: '#a78bfa' }
      return null
    case 'overshoot':
      return { text: `↑ Spending over take-home`, color: '#ef4444' }
    default:
      return null
  }
}

// ── Drill-down panel ──
function DrillDownPanel({ nodeId, data, input, onClose }: {
  nodeId: string
  data: AppData
  input: SankeyInput
  onClose: () => void
}) {
  const items = useMemo((): DrillDownItem[] => {
    switch (nodeId) {
      case 'essentials': {
        const total = input.essTotalP
        return data.budget.essentials.map(e => ({
          name: e.name,
          amount: parseFloat(e.plan || e.baseline) || 0,
          total,
        }))
      }
      case 'discretionary': {
        const total = input.discPlanTotal
        return data.budget.discretionary.map(e => ({
          name: e.name,
          amount: parseFloat(e.plan || e.baseline) || 0,
          total,
        }))
      }
      case 'debt': {
        const total = input.debtPlanTotal
        return data.debts
          .filter(d => !d.isMortgage)
          .map(d => ({
            name: d.name,
            amount: parseFloat(d.planPayment || d.minPayment) || 0,
            balance: parseFloat(d.balance) || 0,
            total,
          }))
      }
      case 'liquid-savings': {
        const efAmt = parseFloat(data.savings.emergencyFund.monthly) || 0
        const genAmt = parseFloat(data.savings.generalSavings.monthly) || 0
        const total = efAmt + genAmt
        return [
          { name: 'Emergency Fund', amount: efAmt, total },
          { name: 'General Savings', amount: genAmt, total },
        ].filter(i => i.amount > 0)
      }
      case 'retirement': {
        const total = input.rothIraMonthly
        return data.income.sources
          .filter(s => s.type === 'w2' && parseFloat(s.retirement?.rothIra?.monthly || '0') > 0)
          .map(s => ({
            name: `${s.name} — Roth IRA`,
            amount: parseFloat(s.retirement!.rothIra.monthly) || 0,
            total,
          }))
      }
      default:
        return []
    }
  }, [nodeId, data, input])

  const nodeLabels: Record<string, string> = {
    essentials: 'Essentials', discretionary: 'Discretionary', debt: 'Debt',
    'liquid-savings': 'Liquid Savings', retirement: 'Retirement',
  }

  return (
    <div className="mt-3 rounded-xl p-4" style={{ background: '#060e18', border: '1px solid #1a2840' }}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#60a5fa' }}>
          {nodeLabels[nodeId] ?? nodeId} — Line Items
        </div>
        <button onClick={onClose} style={{ color: '#3a5a7a', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px]" style={{ color: '#3a5a7a' }}>No items to show.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[12px]" style={{ color: '#8b9cb5' }}>{item.name}</span>
                <span className="font-mono text-[12px]" style={{ color: '#c9d8e8' }}>{fmt(item.amount)}</span>
              </div>
              {item.balance !== undefined && (
                <div className="text-[10px] mb-0.5" style={{ color: '#3a5a7a' }}>
                  Balance: {fmt(item.balance)}
                </div>
              )}
              <div style={{ height: 3, background: '#1a2840', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${item.total > 0 ? Math.min(100, (item.amount / item.total) * 100) : 0}%`,
                  background: '#60a5fa',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 3: Add SankeyChart to components index if one exists**

Check `src/components/index.ts`. If it exports components, add:

```typescript
export { default as SankeyChart } from './SankeyChart'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SankeyChart.tsx src/components/index.ts
git commit -m "feat: add SankeyChart component with d3-sankey layout and drill-down"
```

---

## Task 6: DebtTimeline component

**Files:**
- Create: `src/components/DebtTimeline.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DebtTimeline.tsx`:

```tsx
import { useMemo } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff } from '../lib/calculations'
import type { AppData } from '../types'
import { fmt } from '../lib/format'

interface Milestone {
  label: string
  age: number
  above: boolean  // label above or below axis
  color: string
  sub?: string
}

interface DebtTimelineProps {
  data: AppData
  liquidSavingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  debtPlanTotal: number
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal }: DebtTimelineProps) {
  const primaryW2 = data.income.sources.find(s => s.type === 'w2' && (s.retirement?.currentAge ?? ''))
  const currentAge = parseInt(primaryW2?.retirement?.currentAge || '0')
  const targetAge = parseInt(primaryW2?.retirement?.targetAge || '65')

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  if (!currentAge || !targetAge || currentAge >= targetAge) {
    return (
      <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#3a5a7a' }}>
        Enter your current age in Invest &amp; Retire<br />to see your debt-free timeline.
      </div>
    )
  }

  const ageRange = targetAge - currentAge

  // Debt-free: max payoff months across individual debts (avalanche)
  const maxPayoffMonths = consumerDebts.length > 0
    ? Math.max(...consumerDebts.map(d => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        return result ? result.months : 0
      }))
    : 0
  const debtFreeAge = currentAge + maxPayoffMonths / 12

  // Net-worth-positive
  const nwpMonths = computeNetWorthPositiveMonths({
    savingsBalance: liquidSavingsBalance,
    retirementBalance,
    monthlyContrib,
    totalDebtBalance,
    monthlyDebtPayment: debtPlanTotal,
  })
  const nwpAge = nwpMonths !== null ? currentAge + nwpMonths / 12 : null

  const milestones = useMemo((): Milestone[] => {
    const ms: Milestone[] = []
    ms.push({ label: 'Now', age: currentAge, above: true, color: '#8b9cb5' })

    if (nwpAge !== null && nwpAge > currentAge + 3 && nwpAge < targetAge) {
      ms.push({ label: 'Net-worth+', age: nwpAge, above: false, color: '#60a5fa', sub: 'assets > debt' })
    }

    if (consumerDebts.length === 0) {
      ms.push({ label: '✓ Debt-free', age: currentAge, above: false, color: '#10b981', sub: 'Now' })
    } else if (maxPayoffMonths > 0 && debtFreeAge < targetAge) {
      ms.push({ label: 'Debt-free', age: debtFreeAge, above: true, color: '#10b981', sub: fmt(totalDebtBalance) + ' paid' })
    }

    ms.push({ label: 'Retire', age: targetAge, above: false, color: '#a78bfa', sub: `Age ${targetAge}` })

    // Alternate above/below when within 2 years of each other
    const sorted = ms.sort((a, b) => a.age - b.age)
    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i].age - sorted[i - 1].age) < 2) {
        sorted[i].above = !sorted[i - 1].above
      }
    }
    return sorted
  }, [currentAge, targetAge, nwpAge, maxPayoffMonths, debtFreeAge, consumerDebts.length, totalDebtBalance])

  const w = 380
  const axisY = 70
  const h = 130
  const padL = 20
  const padR = 20

  function ageToX(age: number) {
    return padL + ((age - currentAge) / ageRange) * (w - padL - padR)
  }

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {/* Axis line */}
      <line x1={padL} y1={axisY} x2={w - padR} y2={axisY} stroke="#1a2840" strokeWidth={1.5} />

      {/* Axis age ticks */}
      {[currentAge, targetAge].map(age => (
        <text key={age} x={ageToX(age)} y={h - 6} textAnchor="middle" fontSize={8} fill="#3a5a7a">
          {age}
        </text>
      ))}

      {/* Milestones */}
      {milestones.map((m, i) => {
        const x = ageToX(m.age)
        const tickLen = 8
        const labelY = m.above ? axisY - tickLen - 22 : axisY + tickLen + 10
        const subY = m.above ? labelY - 11 : labelY + 11
        return (
          <g key={i}>
            <line x1={x} y1={axisY - tickLen} x2={x} y2={axisY + tickLen} stroke={m.color} strokeWidth={1.5} />
            <circle cx={x} cy={axisY} r={3} fill={m.color} />
            <text x={x} y={labelY} textAnchor="middle" fontSize={9} fill={m.color} fontWeight={600}>
              {m.label}
            </text>
            {m.sub && (
              <text x={x} y={subY} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
                {m.sub}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DebtTimeline.tsx
git commit -m "feat: add DebtTimeline component with milestone markers"
```

---

## Task 7: Replace OverviewTab

**Files:**
- Modify: `src/tabs/OverviewTab.tsx`

- [ ] **Step 1: Replace OverviewTab with full new layout**

Replace the entire contents of `src/tabs/OverviewTab.tsx`:

```tsx
import { useMemo } from 'react'
import { Badge } from '../components'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import LineChart from '../components/LineChart'
import SankeyChart from '../components/SankeyChart'
import DebtTimeline from '../components/DebtTimeline'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { buildAggregateProjection } from '../lib/calculations'
import { computeSituationalRead } from '../lib/sankeyHelpers'
import type { SankeyInput } from '../lib/sankeyHelpers'
import type { Benchmark } from '../components/LineChart'

export default function OverviewTab() {
  const { data } = useData()
  const {
    grossMonthly, netMonthly,
    housingPct, consumerDti, dti,
    retireRate, savingsRate,
    planSurplus, essTotalP, debtPlanTotal, discPlanTotal,
    liquidSavingsMonthly, rothIraMonthly,
    trad401kMonthly, roth401kMonthly, hsaMonthly, employerMatch,
    sourceCalcs,
    calcPayoff, payoffDate,
  } = useMetrics()

  // ── Situational read ──
  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)
  const { headline, isOvershoot } = computeSituationalRead({
    planSurplus,
    dti,
    savingsRate,
    hasConsumerDebt: consumerDebts.length > 0,
    consumerDebtBalance,
    noIncome: grossMonthly === 0,
  })

  // ── Badge colors (unchanged from current) ──
  const housingColor = parseFloat(housingPct) <= 0 ? '#3a5a7a'
    : parseFloat(housingPct) > 28 ? '#f97316' : '#10b981'
  const dtiColor = parseFloat(dti) <= 0 ? '#3a5a7a'
    : parseFloat(dti) >= 36 ? '#ef4444'
    : parseFloat(dti) > 20 ? '#f97316' : '#10b981'
  const savingsColor = parseFloat(savingsRate) <= 0 ? '#3a5a7a'
    : parseFloat(savingsRate) >= 15 ? '#10b981' : '#60a5fa'
  const retireColor = parseFloat(retireRate) <= 0 ? '#3a5a7a'
    : parseFloat(retireRate) >= 15 ? '#10b981' : '#60a5fa'
  const shouldTint = (color: string) => color !== '#60a5fa' && color !== '#3a5a7a'

  // ── Sankey input ──
  const sankeyInput: SankeyInput = useMemo(() => ({
    grossMonthly,
    netMonthly,
    trad401kMonthly,
    roth401kMonthly,
    hsaMonthly,
    employerMatch,
    essTotalP,
    discPlanTotal,
    debtPlanTotal,
    liquidSavingsMonthly,
    rothIraMonthly,
    dti,
    housingPct,
    savingsRate,
    retireRate,
    sourceCalcs,
  }), [grossMonthly, netMonthly, trad401kMonthly, roth401kMonthly, hsaMonthly, employerMatch,
    essTotalP, discPlanTotal, debtPlanTotal, liquidSavingsMonthly, rothIraMonthly,
    dti, housingPct, savingsRate, retireRate, sourceCalcs])

  // ── Retirement projection ──
  const sources = data.income?.sources || []
  const hsaBal = parseFloat(data.retirement?.hsa?.currentBalance || '') || 0
  const investBal = parseFloat(data.invest?.currentBalance || '') || 0
  const retChartData = buildAggregateProjection(sources, sourceCalcs, hsaBal, investBal)
  const projBal = retChartData.length > 0 ? retChartData[retChartData.length - 1].balance : 0
  const primaryW2 = sources.find(s => s.type === 'w2' && s.retirement?.currentAge)
  const retTargetAge = primaryW2?.retirement?.targetAge || '65'
  const annualGross = grossMonthly * 12

  const benchmarks: Benchmark[] = [
    { age: 30, value: annualGross * 1, label: '1× by 30' },
    { age: 40, value: annualGross * 3, label: '3× by 40' },
    { age: 50, value: annualGross * 6, label: '6× by 50' },
    { age: 60, value: annualGross * 8, label: '8× by 60' },
  ]

  // ── DebtTimeline inputs ──
  const liquidBalance = (parseFloat(data.savings.emergencyFund.current || '0') || 0)
    + (parseFloat((data.savings.generalSavings as any).current || '0') || 0)
  const retirementBalance = sources
    .filter(s => s.type === 'w2')
    .reduce((sum, src) => {
      const r = src.retirement
      if (!r) return sum
      return sum
        + (parseFloat(r.traditional401kBalance || '') || 0)
        + (parseFloat(r.roth401kBalance || '') || 0)
        + (parseFloat(r.rothIra?.currentBalance || '') || 0)
    }, 0) + hsaBal + investBal
  const monthlyContrib = sourceCalcs.reduce((s, c) => s + c.trad401k + c.roth401k + c.match + c.rothIra, 0)
    + liquidSavingsMonthly

  return (
    <div>
      {/* ── Situational headline + stat card ── */}
      {headline && (
        <div className="flex justify-between items-start mb-4">
          <p className="m-0 text-[14px] leading-snug max-w-[65%]" style={{ color: '#c9d8e8' }}>
            {headline}
          </p>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.08em] mb-0.5" style={{ color: '#3a5a7a' }}>This month</div>
            <div
              className="font-mono text-[15px] font-bold"
              style={{ color: isOvershoot ? '#ef4444' : '#10b981' }}
            >
              {isOvershoot ? '−' : '+'}{fmt(Math.abs(planSurplus))}
            </div>
            <div className="text-[9px]" style={{ color: '#3a5a7a' }}>
              {isOvershoot ? 'overshoot' : 'surplus'}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip (unchanged) ── */}
      <div className="grid gap-2.5 mb-[18px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <Badge label="Gross Income" value={grossMonthly > 0 ? fmt(grossMonthly) : '—'} color="#60a5fa" sub={grossMonthly > 0 ? '/month' : 'Add income'} />
        <Badge label="Take-Home" value={netMonthly > 0 ? fmt(netMonthly) : '—'} color="#60a5fa" sub={netMonthly > 0 ? '/month' : undefined} />
        <Badge
          label="Consumer Debt"
          value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
          color={consumerDebts.length > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add debts in Expenses'}
          tooltip="Your non-mortgage debt total. Paying this down frees up monthly cash flow and improves your DTI."
        />
        <Badge label="Housing %" value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'} color={housingColor} tint={shouldTint(housingColor)} sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule') : 'Add housing in Expenses'} tooltip="Your rent or mortgage as a share of gross monthly income. Above 28% limits your ability to save and handle debt." />
        <Badge label="Total DTI" value={parseFloat(dti) > 0 ? dti + '%' : '—'} color={dtiColor} tint={shouldTint(dtiColor)} sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'} tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; above 36% is high-risk." />
        <Badge label="Retirement Rate" value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'} color={retireColor} tint={shouldTint(retireColor)} sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : 'Set contributions in Invest & Retire'} tooltip="Percentage of gross income going to retirement accounts. 15% is the common target. Employer match counts — capture it first." />
        <Badge label="Total Savings Rate" value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'} color={savingsColor} tint={shouldTint(savingsColor)} sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : 'Add income & savings'} tooltip="How much of your gross income you're setting aside across all accounts. 15% = on track, 20%+ = building wealth aggressively." />
      </div>

      {/* ── Sankey card ── */}
      <Card>
        <SankeyChart
          input={sankeyInput}
          data={data}
          dti={dti}
          housingPct={housingPct}
          savingsRate={savingsRate}
          retireRate={retireRate}
          employerMatch={employerMatch}
        />
      </Card>

      {/* ── Bottom row ── */}
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Debt-free timeline */}
        <Card>
          <SectionTitle accent="#10b981">Debt-Free Timeline</SectionTitle>
          <DebtTimeline
            data={data}
            liquidSavingsBalance={liquidBalance}
            retirementBalance={retirementBalance}
            monthlyContrib={monthlyContrib}
            debtPlanTotal={debtPlanTotal}
          />
        </Card>

        {/* Retirement projection */}
        <Card>
          <SectionTitle accent="#a78bfa">Retirement Projection</SectionTitle>
          {projBal > 0 && (
            <div className="flex gap-4 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>Projected at {retTargetAge}</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#60a5fa' }}>{fmtShort(projBal)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>Monthly at 4% rule</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#10b981' }}>{fmt(projBal * 0.04 / 12)}</div>
              </div>
            </div>
          )}
          <LineChart data={retChartData} height={180} benchmarks={grossMonthly > 0 ? benchmarks : []} />
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors before continuing.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --reporter verbose
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/tabs/OverviewTab.tsx
git commit -m "feat: replace Overview tab with Sankey dashboard"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:5173 in a browser.

- [ ] **Step 2: Verify default persona (high DTI + strong saving)**

With the app's existing data:
- Headline shows "Strong saver carrying $X at Y% DTI"
- KPI strip shows 7 badges, colors unchanged
- Sankey renders with income sources → gross → pre-tax split → buckets
- Debt node is orange/flagged
- Liquid savings shows a green flag line
- Source toggle appears if multiple income sources; collapses to single node
- Click Essentials → drill-down panel opens with line items
- Click Essentials again → closes
- Hover any band → tooltip appears

- [ ] **Step 3: Verify no consumer debt state**

Temporarily remove all non-mortgage debts:
- Debt node absent from Sankey col 3
- Headline changes to "Debt-free…" variant
- DebtTimeline shows "✓ Debt-free now" marker
- Restore debts after verifying

- [ ] **Step 4: Verify overspend state**

Temporarily inflate discretionary to make `planSurplus < 0`:
- Headline shows "You're spending $X/mo more…"
- Surplus stat card shows red "Overshoot −$X"
- Overshoot node appears red in Sankey col 3
- Take-home node gets red border
- Restore data after verifying

- [ ] **Step 5: Verify incomplete state (income only)**

Open the app in a private window with no data:
- Headline hidden
- Sankey shows "Add your income to see the flow." empty state
- Bottom row cards show placeholder text

- [ ] **Step 6: Verify retirement benchmarks**

On the retirement chart, confirm faint dashed lines at the correct salary multiples. Verify they sit behind the main projection line and don't crowd the axis labels.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Overview redesign — Sankey, DebtTimeline, benchmarks"
```
