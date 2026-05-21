# Sankey Diagram — Take-Home Clarity Redesign

**Date:** 2026-05-21  
**Status:** Approved  
**Scope:** `SankeyChart.tsx`, `sankeyHelpers.ts`

---

## Problem

The Sankey diagram's most important conceptual split — gross income dividing into withheld amounts and take-home pay — is visually invisible. The take-home node renders identically to the structural gross node (same dark fill, same muted label), the label floats above it at 7.5px / 70% opacity, and no dollar value appears on canvas. Additionally:

- Node heights in the mockup were not proportional (the real d3-sankey layout is proportional, but padding is too tight at 10px to let nodes breathe)
- Small spending nodes (Retirement ~$583) can compress below a readable height
- All right-side labels use a collision-avoidance list that detaches them from their nodes
- Labels show `% of gross` for all buckets including take-home spending, which is the wrong denominator for spending decisions
- Tooltips have no percentage context at all

---

## Design Decisions

All decisions were validated through iterative browser mockups (v1–v6).

### 1. Take-Home and Gross Income get "below-node" labels

Both structural anchor nodes — **Gross Income (col 1)** and **Take-Home (col 2)** — display their label and dollar amount below the node, centered on the node's horizontal midpoint. No other node uses this treatment.

```
[node bar]
GROSS INCOME     [node bar]
$18,017          TAKE-HOME
                 $12,527
```

This makes the gross → take-home split unmissable as the eye naturally reads downward.

### 2. Take-Home node gets a distinct visual style

Currently `isStructural: true` gives take-home a dark fill identical to the gross node. New treatment:

- **Fill:** `#60a5fa` at `fillOpacity: 0.13` (subtle tint, not dark)
- **Stroke:** `#60a5fa` at `strokeOpacity: 0.95`, `strokeWidth: 2` (bright border)
- **Glow filter:** `feGaussianBlur stdDeviation=3.5` merged with source graphic
- Gross node stays dark structural (reference point), Take-Home glows

### 3. All other node labels center on the node's vertical midpoint

Label `y` = `(node.y0 + node.y1) / 2`. No collision-avoidance push list — the larger padding (see §4) provides sufficient separation. No vertical border line on any label; the node color on the category name text is sufficient visual anchoring.

- **Col 0 sources** (Person 1, Person 2): label to the *left* of the node, `text-anchor="end"`
- **Col 2** (Pre-Tax Retirement, Taxes): label to the *right* of the node
- **Col 3** (Essentials, Discretionary, Debt, Liquid Savings, Retirement): label to the *right* of the node

Each label is two lines: category name (7px, uppercase, node color) + dollar amount (9.5px, `#e8f0f8`, monospace).

### 4. No percentage in visible labels — contextual % in tooltips only

Labels show name + dollar amount only. Percentage context moves to the hover tooltip, with a reference that matches the node's position in the flow:

| Node column | Tooltip % reference |
|---|---|
| Col 0 (income sources) | `X% of gross income` |
| Col 2 (Pre-Tax Retirement, Taxes, Take-Home) | `X% of gross income` |
| Col 3 (spending buckets) | `X% of take-home` |

### 5. Natural Sankey expansion — larger padding + minimum node height

Increase `nodePadding` from `10` → `20`. This allows:
- Source nodes (col 0) to extend slightly above/below the gross node edges — the "fan-in" effect
- Col 2 nodes to spread above and below the gross extent — Pre-Tax fans up, Take-Home fans down
- Col 3 spending nodes to expand further with clear gaps

Increase chart height from `420` → `520` to give the fan-out room to breathe.

After d3-sankey computes layout, apply a **minimum node height clamp**: any node whose computed height (`y1 - y0`) is less than `8px` gets its `y1` raised to `y0 + 8`. This ensures Retirement (~$583) and similarly small nodes are always clickable and labeled.

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/components/SankeyChart.tsx` | Label rendering, take-home node style, chart height, nodePadding, min-height clamp |
| `src/lib/sankeyHelpers.ts` | Tooltip strings — add contextual % to each node's tooltip |

### Files removed from rendering path

`computeLabelPositions` and its associated `labelPositions` state are removed. The right-side HTML label overlay (`<div>` elements with `position: absolute`) is replaced by SVG `<text>` elements rendered inline in the diagram.

The **Sources toggle button** (`Sources ▸ / Sources ▾`) is removed entirely. The `collapsed` state and `buildSankeyDataCollapsed` code path are also removed — the collapsed view added no meaningful information for the user.

---

## Component: SankeyChart.tsx

### Height and layout constants

```ts
// Before
const [dims, setDims] = useState({ w: 800, h: 420 })
// nodePadding(10)

// After
const [dims, setDims] = useState({ w: 800, h: 520 })
// nodePadding(20)
```

### Minimum node height clamp (post-layout)

After `layout({...})` returns, iterate nodes and enforce the minimum:

```ts
const MIN_NODE_H = 8
graph.nodes.forEach(n => {
  if ((n.y1 ?? 0) - (n.y0 ?? 0) < MIN_NODE_H) {
    n.y1 = (n.y0 ?? 0) + MIN_NODE_H
  }
})
```

### Take-Home node rendering

**In `sankeyHelpers.ts`:** Remove `isStructural: true` from the take-home node definition. The `isStructural` flag drives `fill='#1a2840'` in the node renderer; removing it lets the node's own `color: '#60a5fa'` take effect.

```ts
// Before
nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, isStructural: true, tooltip: '...' })

// After
nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, tooltip: '...' })
```

**In `SankeyChart.tsx`:** Add an explicit `id === 'takehome'` branch in the node `<rect>` render pass (before the generic `isStructural` check) that applies:

- `fill="#60a5fa"` `fillOpacity={0.13}`
- `stroke="#60a5fa"` `strokeOpacity={0.95}` `strokeWidth={2}`
- `filter="url(#takehome-glow)"` (add a `<defs>` entry for the glow filter)

### Label rendering — replace HTML overlay with SVG text

Remove: `labelPositions` state, `useLayoutEffect` that calls `computeLabelPositions`, the `<div>` HTML label overlay section.

Add inline SVG label rendering for each node after the node `<rect>` pass:

```tsx
{graph.nodes.map(n => {
  const sn = n as LayoutNode
  const midY = ((sn.y0 ?? 0) + (sn.y1 ?? 0)) / 2
  const midX = ((sn.x0 ?? 0) + (sn.x1 ?? 0)) / 2
  const nodeRight = sn.x1 ?? 0
  const nodeLeft  = sn.x0 ?? 0
  const nodeBottom = sn.y1 ?? 0

  // Gross Income — below node
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

  // Take-Home — below node
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

  // Col 0 sources — left of node, no border line
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

  // Col 2 (pre-tax, taxes — takehome already handled above) and Col 3 — right of node, no border line
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

### Glow filter in `<defs>`

```tsx
<filter id="takehome-glow">
  <feGaussianBlur stdDeviation="3.5" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

---

## Helper: sankeyHelpers.ts — tooltip contextual %

Add a helper that computes the contextual percentage for each node:

```ts
function pct(value: number, denominator: number): string {
  if (denominator <= 0) return ''
  return (value / denominator * 100).toFixed(1) + '%'
}
```

Update each node's `tooltip` field:

| Node | Tooltip format |
|---|---|
| Source (col 0) | `"${name}: ${fmt(gross)}/mo · ${pct(gross, grossMonthly)} of gross income"` |
| Pre-Tax Retirement | `"Traditional 401(k) + HSA: ${pct(pretaxRet, grossMonthly)} of gross income"` |
| Taxes | `"Taxes: ${pct(taxes, grossMonthly)} of gross income"` |
| Take-Home | `"Take-home: ${pct(netMonthly, grossMonthly)} of gross income after taxes & deductions"` |
| Essentials | `"Fixed costs (housing, utilities, groceries): ${pct(essTotalP, netMonthly)} of take-home"` |
| Discretionary | `"Flexible spending (dining, subscriptions): ${pct(discPlanTotal, netMonthly)} of take-home"` |
| Debt | `"Consumer debt payments — DTI ${dti}%: ${pct(debtPlanTotal, netMonthly)} of take-home"` |
| Liquid Savings | `"Emergency fund + general savings: ${pct(liquidSavingsMonthly, netMonthly)} of take-home"` |
| Retirement (col 3) | `"Roth IRA contributions: ${pct(rothIraMonthly, netMonthly)} of take-home"` |

---

## What Does Not Change

- `ribbonPath()` function — unchanged
- `buildSankeyData()` and `buildSankeyDataCollapsed()` node/link graph structure — unchanged (only tooltip strings updated)
- `computeLabelPositions()` — removed from SankeyChart rendering but the function itself can stay in sankeyHelpers.ts (no breaking change)
- DrillDown panel — unchanged
- Tooltip hover/mouseLeave mechanism — unchanged
- `Sources ▾` collapse button — unchanged
- Node click behavior — unchanged
- Overshoot / Remaining special-case logic — unchanged

---

## Out of Scope

The following weaknesses from the original assessment are **not** addressed in this spec and should be separate work items:

- KPI strip ↔ Sankey visual connection
- Taxes drill-down panel
- Percentage denominator correction (gross vs take-home) in the KPI badges
- Drill-down panel losing color identity
- "Remaining" empty-state guidance
