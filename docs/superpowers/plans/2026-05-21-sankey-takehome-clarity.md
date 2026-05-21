# Sankey Take-Home Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Sankey diagram so the gross→take-home split is unmissable: proportional node sizing with breathing room, a glowing take-home node, below-node labels for both anchor nodes, node-centered labels for all others, and contextual % in tooltips.

**Architecture:** Two files change — `sankeyHelpers.ts` gets a `pct()` helper and updated tooltip strings; `SankeyChart.tsx` gets new layout constants, a minimum node-height clamp, a special take-home node render branch, removal of the Sources toggle, and a fully new SVG-based label system that replaces the old HTML overlay. The d3-sankey layout algorithm is untouched.

**Tech Stack:** React 18, TypeScript, d3-sankey, Vitest

---

## File Map

| File | What changes |
|---|---|
| `src/lib/sankeyHelpers.ts` | Remove `isStructural: true` from take-home node; add `pct()` helper; update 10 tooltip strings |
| `src/lib/sankeyHelpers.test.ts` | Add tests for `pct()`, isStructural removal, and tooltip contextual % |
| `src/components/SankeyChart.tsx` | Height 520, nodePadding 20, min-height clamp, glow filter, take-home render branch, remove Sources button + `collapsed` state, replace label system |

---

## Task 1: sankeyHelpers.ts — pct() helper, tooltip updates, remove isStructural

**Files:**
- Modify: `src/lib/sankeyHelpers.ts`
- Modify: `src/lib/sankeyHelpers.test.ts`

- [ ] **Step 1.1: Read the current test file to understand existing fixtures**

Run: `npx vitest run src/lib/sankeyHelpers.test.ts`

Expected: all tests pass (green baseline before any changes).

- [ ] **Step 1.2: Write the failing tests**

Add at the bottom of `src/lib/sankeyHelpers.test.ts` (after the last `describe` block):

```ts
describe('pct helper (via tooltip strings)', () => {
  it('take-home node has no isStructural flag', () => {
    const { nodes } = buildSankeyData(base)
    const th = nodes.find(n => n.id === 'takehome')
    expect(th).toBeDefined()
    expect(th?.isStructural).toBeFalsy()
  })

  it('source tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const src = nodes.find(n => n.id === 'src-p1')
    expect(src?.tooltip).toMatch(/of gross income/i)
    expect(src?.tooltip).toMatch(/%/)
  })

  it('taxes tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const taxes = nodes.find(n => n.id === 'taxes')
    expect(taxes?.tooltip).toMatch(/of gross income/i)
    expect(taxes?.tooltip).toMatch(/%/)
  })

  it('take-home tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const th = nodes.find(n => n.id === 'takehome')
    expect(th?.tooltip).toMatch(/of gross income/i)
    expect(th?.tooltip).toMatch(/%/)
  })

  it('essentials tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const ess = nodes.find(n => n.id === 'essentials')
    expect(ess?.tooltip).toMatch(/of take-home/i)
    expect(ess?.tooltip).toMatch(/%/)
  })

  it('debt tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const debt = nodes.find(n => n.id === 'debt')
    expect(debt?.tooltip).toMatch(/of take-home/i)
  })

  it('liquid-savings tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const liq = nodes.find(n => n.id === 'liquid-savings')
    expect(liq?.tooltip).toMatch(/of take-home/i)
  })

  it('retirement (col 3) tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const ret = nodes.find(n => n.id === 'retirement')
    expect(ret?.tooltip).toMatch(/of take-home/i)
  })

  it('essentials tooltip % uses netMonthly as denominator, not grossMonthly', () => {
    // base: essTotalP=7065, netMonthly=12527 → 56.4%, grossMonthly=18017 → 39.2%
    // tooltip must contain 56.4 (take-home %) not 39.2 (gross %)
    const { nodes } = buildSankeyData(base)
    const ess = nodes.find(n => n.id === 'essentials')
    expect(ess?.tooltip).toContain('56.4')
    expect(ess?.tooltip).not.toContain('39.2')
  })

  it('taxes tooltip % uses grossMonthly as denominator', () => {
    // base: taxes = 18017 - 12527 - 2563 - 583 - 0 = 2344
    // pct(2344, 18017) = 13.0%
    const { nodes } = buildSankeyData(base)
    const taxes = nodes.find(n => n.id === 'taxes')
    expect(taxes?.tooltip).toContain('13.0')
  })
})
```

- [ ] **Step 1.3: Run failing tests to confirm they fail**

```
npx vitest run src/lib/sankeyHelpers.test.ts
```

Expected: the new `pct helper` describe block fails. Existing tests still pass.

- [ ] **Step 1.4: Implement — add `pct()` and update `sankeyHelpers.ts`**

Open `src/lib/sankeyHelpers.ts`. Make the following changes:

**A. Add `pct()` helper after the imports (before the `STRUCTURAL` constant):**

```ts
function pct(value: number, denominator: number): string {
  if (denominator <= 0) return ''
  return (value / denominator * 100).toFixed(1) + '%'
}
```

**B. Remove `isStructural: true` from the take-home node (line ~102):**

```ts
// Before:
nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, isStructural: true, tooltip: 'Money deposited to your bank account each month.' })

// After:
nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, tooltip: `Money deposited to your bank account each month. ${pct(netMonthly, grossMonthly)} of gross income.` })
```

**C. Update all other tooltip strings in `buildSankeyData`. Apply each change individually:**

Source nodes (inside `sourceCalcs.forEach`):
```ts
// Before:
tooltip: `${c.src.name}: $${Math.round(c.gross).toLocaleString()}/mo gross`,

// After:
tooltip: `${c.src.name}: $${Math.round(c.gross).toLocaleString()}/mo gross · ${pct(c.gross, grossMonthly)} of gross income`,
```

Gross node:
```ts
// Before:
tooltip: 'Total gross income before any deductions.'

// After:
tooltip: `Total gross income: $${Math.round(grossMonthly).toLocaleString()}/mo.`
```

Pre-tax retirement node:
```ts
// Before:
tooltip: 'Traditional 401(k) + HSA contributions (pre-tax, reduce taxable income).',

// After:
tooltip: `Traditional 401(k) + HSA contributions (pre-tax). ${pct(pretaxRet, grossMonthly)} of gross income.`,
```

Roth 401k node (if present):
```ts
// Before:
tooltip: 'Roth 401(k) payroll deduction — post-tax but removed before take-home.'

// After:
tooltip: `Roth 401(k) payroll deduction — post-tax but removed before take-home. ${pct(roth401kMonthly, grossMonthly)} of gross income.`
```

Taxes node:
```ts
// Before:
tooltip: 'Federal, state, and local taxes estimated from your paycheck data.'

// After:
tooltip: `Federal, state, and local taxes. ${pct(taxes, grossMonthly)} of gross income.`
```

Essentials node:
```ts
// Before:
tooltip: 'Fixed monthly costs — housing, utilities, groceries, insurance.',

// After:
tooltip: `Fixed monthly costs — housing, utilities, groceries, insurance. ${pct(essTotalP, netMonthly)} of take-home.`,
```

Discretionary node:
```ts
// Before:
tooltip: 'Flexible spending — dining, subscriptions, entertainment.'

// After:
tooltip: `Flexible spending — dining, subscriptions, entertainment. ${pct(discPlanTotal, netMonthly)} of take-home.`
```

Debt node:
```ts
// Before:
tooltip: `Consumer debt payments. Total DTI: ${dti}%.`,

// After:
tooltip: `Consumer debt payments. DTI ${dti}% · ${pct(debtPlanTotal, netMonthly)} of take-home.`,
```

Liquid savings node:
```ts
// Before:
tooltip: 'Emergency fund + general savings contributions.'

// After:
tooltip: `Emergency fund + general savings. ${pct(liquidSavingsMonthly, netMonthly)} of take-home.`
```

Retirement (col 3) node:
```ts
// Before:
tooltip: 'Roth IRA contribution funded from take-home income.'

// After:
tooltip: `Roth IRA contribution funded from take-home. ${pct(rothIraMonthly, netMonthly)} of take-home.`
```

- [ ] **Step 1.5: Run tests — all should pass**

```
npx vitest run src/lib/sankeyHelpers.test.ts
```

Expected: all tests pass including the new `pct helper` describe block.

- [ ] **Step 1.6: Commit**

```
git add src/lib/sankeyHelpers.ts src/lib/sankeyHelpers.test.ts
git commit -m "feat(sankey): add contextual % to tooltips, remove isStructural from take-home"
```

---

## Task 2: SankeyChart.tsx — layout constants, min-height clamp

**Files:**
- Modify: `src/components/SankeyChart.tsx`

- [ ] **Step 2.1: Update initial dims height from 420 → 520**

In `SankeyChart.tsx`, find:
```ts
const [dims, setDims] = useState({ w: 800, h: 420 })
```

Replace with:
```ts
const [dims, setDims] = useState({ w: 800, h: 520 })
```

- [ ] **Step 2.2: Update nodePadding from 10 → 20 in the layout useMemo**

Find:
```ts
.nodePadding(10)
```

Replace with:
```ts
.nodePadding(20)
```

- [ ] **Step 2.3: Add minimum node height clamp inside the layout useMemo**

Find the `try` block inside the `graph` useMemo:
```ts
try {
  return layout({
    nodes: rawNodes.map(n => ({ ...n })),
    links: rawLinks.map(l => ({ ...l })),
  })
} catch {
  return null
}
```

Replace with:
```ts
const MIN_NODE_H = 8
try {
  const g = layout({
    nodes: rawNodes.map(n => ({ ...n })),
    links: rawLinks.map(l => ({ ...l })),
  })
  g.nodes.forEach(n => {
    if ((n.y1 ?? 0) - (n.y0 ?? 0) < MIN_NODE_H) {
      n.y1 = (n.y0 ?? 0) + MIN_NODE_H
    }
  })
  return g
} catch {
  return null
}
```

- [ ] **Step 2.4: Run all tests to confirm nothing broken**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2.5: Commit**

```
git add src/components/SankeyChart.tsx
git commit -m "feat(sankey): increase height to 520, nodePadding to 20, add 8px min node height"
```

---

## Task 3: SankeyChart.tsx — take-home node visual style

**Files:**
- Modify: `src/components/SankeyChart.tsx`

- [ ] **Step 3.1: Add glow filter to `<defs>`**

Find the `<defs>` block (currently only contains `{graph.links.map(...)}`):
```tsx
<defs>
  {graph.links.map((l, i) => {
```

Replace with:
```tsx
<defs>
  <filter id="takehome-glow">
    <feGaussianBlur stdDeviation="3.5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  {graph.links.map((l, i) => {
```

- [ ] **Step 3.2: Add take-home special render branch in the nodes map**

Find the node `<rect>` rendering block. It begins with:
```tsx
{graph.nodes.map((n) => {
  const sn = n as LayoutNode
  const isActive = activeNode === sn.id
  const x0 = sn.x0 ?? 0
  const x1 = sn.x1 ?? 0
  const y0 = sn.y0 ?? 0
  const y1 = sn.y1 ?? 0
  const isOvershootNode = sn.isOvershoot
  const isTakehome = sn.id === 'takehome'
```

After the `isTakehome` const, add this early-return branch **before** the existing `borderColor` / `fillOpacity` / `return <rect>` code:

```tsx
  if (isTakehome) {
    const stroke = isOvershoot ? '#ef4444' : '#60a5fa'
    const strokeOpacity = isOvershoot ? 0.9 : 0.95
    return (
      <rect
        key={sn.id}
        x={x0} y={y0}
        width={x1 - x0} height={Math.max(y1 - y0, 2)}
        rx={3}
        fill="#60a5fa"
        fillOpacity={0.13}
        stroke={stroke}
        strokeWidth={2}
        strokeOpacity={strokeOpacity}
        filter="url(#takehome-glow)"
        onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: sn.tooltip })}
        onMouseLeave={handleMouseLeave}
      >
        <title>{`${sn.label}: ${fmt(sn.value ?? 0)}/mo`}</title>
      </rect>
    )
  }
```

- [ ] **Step 3.3: Run all tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3.4: Verify visually — run the dev server**

```
npm run dev
```

Open `http://localhost:5173`. Go to Overview tab. The take-home node should have a bright blue glowing border. The gross node should remain dark. Confirm no console errors.

- [ ] **Step 3.5: Commit**

```
git add src/components/SankeyChart.tsx
git commit -m "feat(sankey): take-home node — glowing border, tinted fill, glow filter"
```

---

## Task 4: SankeyChart.tsx — remove Sources button and collapsed state

**Files:**
- Modify: `src/components/SankeyChart.tsx`

- [ ] **Step 4.1: Remove the `collapsed` state declaration**

Find and delete:
```ts
const [collapsed, setCollapsed] = useState(false)
```

- [ ] **Step 4.2: Simplify the graph data useMemo to always use `buildSankeyData`**

Find:
```ts
const { nodes: rawNodes, links: rawLinks } = useMemo(
  () => collapsed ? buildSankeyDataCollapsed(input) : buildSankeyData(input),
  [input, collapsed]
)
```

Replace with:
```ts
const { nodes: rawNodes, links: rawLinks } = useMemo(
  () => buildSankeyData(input),
  [input]
)
```

- [ ] **Step 4.3: Update the import to remove `buildSankeyDataCollapsed`**

Find:
```ts
import { buildSankeyData, buildSankeyDataCollapsed, computeLabelPositions } from '../lib/sankeyHelpers'
```

Replace with (keep `computeLabelPositions` for now — it's removed in Task 5):
```ts
import { buildSankeyData, computeLabelPositions } from '../lib/sankeyHelpers'
```

- [ ] **Step 4.4: Remove the Sources button JSX**

Find and delete the entire button block inside the card header div:
```tsx
{input.sourceCalcs.length > 1 && (
  <button
    onClick={() => setCollapsed(c => !c)}
    className="text-[11px] px-3 py-1 rounded"
    style={{ color: '#60a5fa', border: '1px solid #1a2840', background: '#0d1620' }}
  >
    {collapsed ? 'Sources ▸' : 'Sources ▾'}
  </button>
)}
```

- [ ] **Step 4.5: Run all tests**

```
npx vitest run
```

Expected: all tests pass. (The `buildSankeyDataCollapsed` describe in the test file still passes — it imports the function directly and the function itself was not removed from sankeyHelpers.)

- [ ] **Step 4.6: Commit**

```
git add src/components/SankeyChart.tsx
git commit -m "feat(sankey): remove Sources toggle button and collapsed view"
```

---

## Task 5: SankeyChart.tsx — replace label system

**Files:**
- Modify: `src/components/SankeyChart.tsx`

- [ ] **Step 5.1: Remove `labelPositions` state and its `useLayoutEffect`**

Find and delete these two blocks:

```ts
const [labelPositions, setLabelPositions] = useState<LabelPos[]>([])
```

```ts
// ── Compute label positions for col-2 terminals + col-3 buckets ──
useLayoutEffect(() => {
  if (!graph) return
  // Include col-2 terminal nodes (not takehome, which continues rightward) and all col-3 nodes
  const labelNodes = graph.nodes.filter(n => {
    const sn = n as LayoutNode
    return sn.col === 3 || (sn.col === 2 && sn.id !== 'takehome')
  })
  setLabelPositions(computeLabelPositions(labelNodes as { id: string; y0: number; y1: number }[], 1, dims.h))
}, [graph, dims])
```

- [ ] **Step 5.2: Update the import to remove `computeLabelPositions` and `LabelPos`**

Find:
```ts
import { buildSankeyData, computeLabelPositions } from '../lib/sankeyHelpers'
import type { SkNode, SkLink, LabelPos } from '../lib/sankeyHelpers'
```

Replace with:
```ts
import { buildSankeyData } from '../lib/sankeyHelpers'
import type { SkNode, SkLink } from '../lib/sankeyHelpers'
```

- [ ] **Step 5.3: Remove the old col-0 source label SVG block**

Inside the `<svg>`, find and delete the entire block that begins:
```tsx
{/* Col-0 source labels (left of source nodes, in reserved SRC_LABEL_W space) */}
{graph.nodes
  .filter(n => (n as LayoutNode).col === 0)
  .map(n => {
    const sn = n as LayoutNode
    const x = (sn.x0 ?? 0) - 8
    const midY = ((sn.y0 ?? 0) + (sn.y1 ?? 0)) / 2
    return (
      <g key={`src-lbl-${sn.id}`}>
        <text x={x} y={midY - 5} textAnchor="end" fontSize={9} fontWeight={600} fill={sn.color} fontFamily="DM Mono, monospace">
          {sn.label}
        </text>
        <text x={x} y={midY + 6} textAnchor="end" fontSize={8} fill="#4a7fa5" fontFamily="DM Mono, monospace">
          {fmt(sn.value ?? 0)}/mo
        </text>
      </g>
    )
  })
}
```

- [ ] **Step 5.4: Remove the old take-home pass-through label above the node**

Find and delete:
```tsx
{/* Take-home pass-through label — sits above the node, no right-side entry */}
{(() => {
  const th = graph.nodes.find(n => (n as LayoutNode).id === 'takehome') as LayoutNode | undefined
  if (!th || ((th.y1 ?? 0) - (th.y0 ?? 0)) < 6) return null
  const midX = ((th.x0 ?? 0) + (th.x1 ?? 0)) / 2
  return (
    <text x={midX} y={(th.y0 ?? 0) - 4} textAnchor="middle" fontSize={7.5} fontWeight={700}
      fill={th.color} fontFamily="DM Sans, monospace" letterSpacing="0.07em" opacity={0.7}>
      TAKE-HOME
    </text>
  )
})()}
```

- [ ] **Step 5.5: Remove the HTML label overlay and `getFlagLine` usage**

Outside the `<svg>` (but inside the `containerRef` div), find and delete the entire block:
```tsx
{/* Right-side HTML labels — col-2 terminals at top, col-3 buckets below */}
{labelPositions.map(pos => {
  const node = graph.nodes.find(n => (n as LayoutNode).id === pos.nodeId) as LayoutNode | undefined
  if (!node) return null
  const sn = node as LayoutNode
  const pctOfGross = input.grossMonthly > 0
    ? ((sn.value ?? 0) / input.grossMonthly * 100).toFixed(1) + '%'
    : ''
  const flagLine = getFlagLine(sn.id)

  return (
    <div
      key={`lbl-${sn.id}`}
      style={{
        position: 'absolute',
        top: pos.top,
        left: dims.w - LABEL_W + 8,
        width: LABEL_W - 12,
        paddingLeft: 8,
        borderLeft: `2px solid ${sn.color}`,
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
```

Also delete the `getFlagLine` function at the bottom of the file:
```ts
// ── Flag line: overshoot only ──
function getFlagLine(nodeId: string): { text: string; color: string } | null {
  if (nodeId !== 'overshoot') return null
  return { text: 'spending over take-home', color: '#ef4444' }
}
```

- [ ] **Step 5.6: Add the new unified SVG label pass**

Inside the `<svg>`, after the closing `})}` of the nodes map, add:

```tsx
{/* Node labels — below-node for gross and take-home, midpoint-centered for all others */}
{graph.nodes.map(n => {
  const sn = n as LayoutNode
  const midY = ((sn.y0 ?? 0) + (sn.y1 ?? 0)) / 2
  const midX = ((sn.x0 ?? 0) + (sn.x1 ?? 0)) / 2
  const nodeRight = sn.x1 ?? 0
  const nodeLeft = sn.x0 ?? 0
  const nodeBottom = sn.y1 ?? 0

  if (sn.id === 'gross') {
    return (
      <g key={`lbl-${sn.id}`}>
        <text x={midX} y={nodeBottom + 14} textAnchor="middle"
              fontSize={7} fontWeight={700} fill="#4a7fa5"
              fontFamily="DM Mono, monospace" letterSpacing="0.1em">
          GROSS INCOME
        </text>
        <text x={midX} y={nodeBottom + 27} textAnchor="middle"
              fontSize={13} fontWeight={700} fill="#e8f0f8"
              fontFamily="DM Mono, monospace">
          {fmt(sn.value ?? 0)}
        </text>
      </g>
    )
  }

  if (sn.id === 'takehome') {
    return (
      <g key={`lbl-${sn.id}`}>
        <text x={midX} y={nodeBottom + 14} textAnchor="middle"
              fontSize={7.5} fontWeight={700} fill="#60a5fa"
              fontFamily="DM Mono, monospace" letterSpacing="0.1em">
          TAKE-HOME
        </text>
        <text x={midX} y={nodeBottom + 28} textAnchor="middle"
              fontSize={13} fontWeight={700} fill="#e8f0f8"
              fontFamily="DM Mono, monospace">
          {fmt(sn.value ?? 0)}
        </text>
      </g>
    )
  }

  if (sn.col === 0) {
    return (
      <g key={`lbl-${sn.id}`}>
        <text x={nodeLeft - 8} y={midY - 2} textAnchor="end"
              fontSize={7} fontWeight={700} fill={sn.color}
              fontFamily="DM Mono, monospace" letterSpacing="0.06em">
          {sn.label.toUpperCase()}
        </text>
        <text x={nodeLeft - 8} y={midY + 10} textAnchor="end"
              fontSize={10} fontWeight={600} fill="#e8f0f8"
              fontFamily="DM Mono, monospace">
          {fmt(sn.value ?? 0)}
        </text>
      </g>
    )
  }

  if (sn.col === 2 || sn.col === 3) {
    return (
      <g key={`lbl-${sn.id}`}>
        <text x={nodeRight + 8} y={midY - 2}
              fontSize={6.5} fontWeight={700} fill={sn.color}
              fontFamily="DM Mono, monospace" letterSpacing="0.05em">
          {sn.label.toUpperCase()}
        </text>
        <text x={nodeRight + 8} y={midY + 10}
              fontSize={9.5} fontWeight={600} fill="#e8f0f8"
              fontFamily="DM Mono, monospace">
          {fmt(sn.value ?? 0)}
        </text>
      </g>
    )
  }

  return null
})}
```

- [ ] **Step 5.7: Run all tests**

```
npx vitest run
```

Expected: all tests pass. TypeScript must compile without errors — run `npx tsc --noEmit` if tests pass but you want to double-check types.

- [ ] **Step 5.8: Verify visually — run the dev server**

```
npm run dev
```

Open `http://localhost:5173`. Go to Overview tab. Verify:

1. **Gross Income label** appears below the gross node, centered, `#4a7fa5` color
2. **Take-Home label** appears below the take-home node, centered, bright blue
3. **Source labels** (Person 1 / Person 2) appear to the left of their nodes, centered on midpoint — no vertical bar line
4. **Spending labels** (Essentials, Discretionary, etc.) appear to the right of their nodes, centered on midpoint — no vertical bar line
5. **No Sources button** in the card header
6. **No % visible** in any label
7. **Hover** over any node — tooltip shows contextual % ("X% of take-home" for spending, "X% of gross income" for col 0/2)
8. **Hover** over Essentials — tooltip shows ~56% (take-home denominator), not ~39% (gross denominator)
9. Chart has more vertical breathing room than before (520px height, 20px node padding)
10. Small nodes like Retirement are at least 8px tall and have a readable label beside them

- [ ] **Step 5.9: Commit**

```
git add src/components/SankeyChart.tsx
git commit -m "feat(sankey): replace label system with SVG midpoint-centered labels"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Remove `isStructural: true` from take-home in sankeyHelpers | Task 1 |
| Add `pct()` helper | Task 1 |
| Update all tooltip strings with contextual % | Task 1 |
| Height 420 → 520 | Task 2 |
| nodePadding 10 → 20 | Task 2 |
| Min node height clamp (8px) | Task 2 |
| Glow filter in `<defs>` | Task 3 |
| Take-home special render branch (bright border, tinted fill) | Task 3 |
| Remove Sources button | Task 4 |
| Remove `collapsed` state and `buildSankeyDataCollapsed` import | Task 4 |
| Remove `labelPositions` state and `useLayoutEffect` | Task 5 |
| Remove HTML label overlay | Task 5 |
| Remove old col-0 source labels | Task 5 |
| Remove old take-home SVG label above node | Task 5 |
| Add new unified SVG label pass | Task 5 |
| Gross Income label below node | Task 5 |
| Take-Home label below node | Task 5 |
| All other nodes: label centered on midY | Task 5 |
| No % in visible labels | Task 5 |

All spec requirements covered. ✓
