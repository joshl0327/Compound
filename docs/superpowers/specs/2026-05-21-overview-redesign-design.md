# Overview Tab Redesign — Design Spec

**Date:** 2026-05-21
**Status:** Approved, ready for implementation planning

---

## 1. Goal

Replace the current Overview tab with a layered "where the money goes" page that answers "how am I doing?" before "what are my numbers?" The centerpiece is a multi-layer Sankey diagram showing the full income-to-spending flow. The donut chart is removed entirely.

---

## 2. Page Structure (top → bottom)

1. **Situational headline** + stat card
2. **KPI strip** (unchanged from current)
3. **Sankey flow card** (full-width, replaces donut + debt-free strip)
4. **Bottom row** — two side-by-side cards:
   - Left: Debt-free timeline
   - Right: Retirement projection

---

## 3. Situational Headline

A single generated sentence above the KPI strip, derived from health state. Right-aligned: a compact stat card labeled "This month · Surplus +$X" (or "Overshoot −$X" in red when `planSurplus < 0`).

### Generation logic

Evaluate in order — use the first match:

| Condition | Headline |
|---|---|
| `planSurplus < 0` | "You're spending $X/mo more than you take home." |
| `parseFloat(dti) >= 36 && parseFloat(savingsRate) >= 15` | "Strong saver carrying $X at Y% DTI. Aim some of that surplus at the debt." |
| `parseFloat(dti) >= 36` | "High debt load at Y% DTI — consider redirecting discretionary cash to payoff." |
| No consumer debt && `parseFloat(savingsRate) >= 15` | "Debt-free with X% savings rate — keep the compounding going." |
| No consumer debt | "Debt-free — grow the savings rate toward 15%." |
| `parseFloat(savingsRate) >= 15` | "Saving X% of gross income — on track." |
| No income entered | "" (headline hidden; show onboarding prompt instead) |
| Default | "Add your income, expenses, and debts to see your full picture." |

`$X` in the DTI headline = `fmtShort(consumerDebtBalance)`. Surplus stat card uses `fmt(Math.abs(planSurplus))`.

---

## 4. KPI Strip

No changes. Keep the existing 7-badge row exactly as it is in the current `OverviewTab.tsx`.

---

## 5. Sankey Flow Card

### 5.1 New Dependency

Add `d3-sankey` (standalone ~15 KB, not full D3):

```
npm install d3-sankey
npm install --save-dev @types/d3-sankey
```

Use only: `sankey()`, `sankeyLinkHorizontal()`, `sankeyLeft` from `d3-sankey`. D3 never touches the DOM — all rendering is React SVG.

### 5.2 Node / Link Structure

The Sankey has four columns. d3-sankey infers column placement from graph depth.

**Column 0 — Income sources**

One node per `data.income.sources[]` entry, using `sourceCalcs` for the gross value.

| Node | Value | Color |
|---|---|---|
| Per W2 source | `sourceCalc.gross` | `#60a5fa` |
| Per other-income source | `sourceCalc.gross` (net, since no gross/tax split for other) | `#a78bfa` |
| "Total Income" (collapsed) | `grossMonthly` | `#60a5fa` |

A toggle button in the card header switches between expanded (all sources) and collapsed (single node). Default: expanded.

**Column 1 — Gross**

Single node. Value = `grossMonthly`. Structural color (`#1a2840`).

**Column 2 — Pre-tax split**

Three nodes (Roth 401k shown only when `roth401kMonthly > 0`):

| Node | Value | Color |
|---|---|---|
| Pre-tax Retirement | `trad401kMonthly + hsaMonthly` | `#a78bfa` |
| Roth 401k *(if > 0)* | `roth401kMonthly` — payroll deduction, removed before take-home | `#7c3aed` |
| Taxes | `grossMonthly − netMonthly − trad401kMonthly − hsaMonthly − roth401kMonthly` | `#3a5a7a` |
| Take-home | `netMonthly` (what hits the bank account, net of all above) | `#60a5fa` |

> **Employer match:** Not a Sankey node. Annotated on the Pre-tax Retirement label as "+$X employer match."

**Column 3 — Spending buckets**

All flow from the Take-home node.

| Node | Value | Color |
|---|---|---|
| Essentials | `essTotalP` | `#60a5fa` |
| Discretionary | `discPlanTotal` | `#fbbf24` |
| Debt | `debtPlanTotal` (non-mortgage only) | `#f97316` |
| Liquid Savings | `liquidSavingsMonthly` | `#10b981` |
| Retirement | `rothIraMonthly` — Roth IRA funded from bank account; Roth 401k is a payroll deduction already captured in col 2 | `#a78bfa` |
| Remaining *(if > 0)* | `netMonthly − all buckets` | `#3a5a7a` |
| Overshoot *(if < 0)* | `abs(netMonthly − all buckets)` | `#ef4444` |

> **Overshoot math:** When bucket totals exceed `netMonthly`, the Overshoot node captures the deficit. d3-sankey renders an unbalanced Take-home node (outflows > inflows) — the visual imbalance is intentional and communicates the problem. The Take-home node gets a red stroke border in this state.

**Links**

- Each income source node → Gross (value = source gross)
- Gross → Pre-tax Retirement
- Gross → Roth 401k (if nonzero)
- Gross → Taxes
- Gross → Take-home
- Take-home → each col 3 bucket (only include nodes with value > 0)

### 5.3 d3-sankey Configuration

```ts
const sankeyLayout = sankey<SankeyNode, SankeyLink>()
  .nodeId(d => d.id)
  .nodeAlign(sankeyLeft)
  .nodeWidth(20)
  .nodePadding(10)
  .extent([[0, 0], [svgWidth, svgHeight]])
```

`svgWidth` and `svgHeight` come from a `ResizeObserver` on the card container. Recalculate on resize. Recalculate when source toggle changes.

### 5.4 Visual Treatment

**Ribbons (links)**

- Path: `sankeyLinkHorizontal()` bezier curves
- Fill: `linearGradient` left→right, source color at 35% opacity → target color at 25% opacity
- Stroke: target color at 60% opacity, `stroke-width: 1`
- Flagged bands (debt at DTI ≥ 36, overshoot): full saturation fill (50% opacity), stroke at 90% opacity

**Nodes**

- Width: 20px (from `nodeWidth`)
- Border radius: 3px (SVG `rx`)
- Fill: band color at 30% opacity with a matching color border at 50% opacity
- Take-home node (structural): `#1a2840` fill, `#60a5fa` border at 30% opacity
- Gross node (structural): same as Take-home
- Overshoot state: Take-home node gets `#ef4444` border at 70% opacity

**Waterline marker**

A dashed horizontal rule across the SVG at the y-midpoint of the Gross → Take-home link, labeled `"Take-home  ↓ $12,527"` in `#60a5fa`. Positioned left of the Gross node using the d3-sankey link's `y0` coordinate.

### 5.5 Label System

Labels are **HTML `<div>`s** absolutely positioned in a layer over the SVG, not SVG text — this enables full typographic control, backdrop-blur, and reliable collision avoidance.

**Layout algorithm (per render):**

1. Read each node's SVG `y0` / `y1` from d3-sankey layout output.
2. Convert to CSS pixels using a `useLayoutEffect` + `ResizeObserver` that measures the SVG's rendered `getBoundingClientRect()` and computes the viewBox → px scale factor.
3. Place each label's `top` at the node's vertical center in px.
4. Run a **two-pass collision push** (forward push-down, then backward clamp to top) using a minimum label height of 42px. Labels that would overlap are pushed down; the last label is clamped to not exceed the SVG bottom.
5. Draw SVG leader lines from `x = nodeRight + 4` to label midpoint, using the converted px coordinates back to viewBox units via the inverse scale factor.

**Label anatomy (col 3 right-side labels):**

```
[band name]        [% of gross, muted]
$X,XXX             ← DM Mono 18px
[flag line]        ← italic, colored, only when flagged or strong
```

**Col 0 left-side source labels:** name + `$X,XXX/mo` + type (W2 · Salary / Other)

**Col 2 labels** (between col 1 and col 3): same right-side pattern for Pre-tax Retirement, Taxes, Take-home.

### 5.6 Health-Weighted Styling

Evaluated per label:

| State | Label color | Flag line |
|---|---|---|
| Flagged: DTI ≥ 36 (Debt node) | `#f97316` | `↑ DTI X% — high` in `#ef4444` italic |
| Flagged: housing > 28% (Essentials node) | `#f97316` | `↑ Housing X% — above 28%` italic |
| Flagged: Overshoot | `#ef4444` | `↑ Spending $X over take-home` italic |
| Strong: savingsRate ≥ 15% (Liquid Savings) | `#10b981` | `↑ X% savings rate — strong` italic |
| Strong: retireRate ≥ 15% (Pre-tax Retirement) | `#10b981` | `↑ X% retire rate — strong` italic |
| Neutral | `#8b9cb5` | none |

### 5.7 Source Expand / Collapse Toggle

A small button in the top-right of the Sankey card header:

- Expanded: "Sources ▾" — shows all individual income source nodes in col 0
- Collapsed: "Sources ▸" — replaces col 0 with a single "Total Income" node

State lives in local React `useState`. On toggle, rebuild the node/link arrays and pass to the sankey layout — d3-sankey recalculates positions automatically. No animation in v1, instant re-render.

### 5.8 Interactions

**Hover (link or node):** Show a tooltip with the same explainer copy as the existing Badge tooltips. Implement with a `useState` for hovered item + a floating `<div>` positioned near cursor.

Tooltip copy per node:
- Pre-tax Retirement: same as Retirement Rate badge
- Debt: same as Consumer Debt badge (plus DTI reading)
- Essentials: "Fixed monthly costs — housing, utilities, groceries, insurance."
- Discretionary: "Flexible spending — dining, subscriptions, entertainment."
- Liquid Savings: same as Total Savings Rate badge
- Taxes: "Federal, state, and local taxes estimated from your paycheck data."

**Click (col 3 bucket node):** Toggle a drill-down panel that appears below the Sankey card. Panel shows a list of line items from the relevant data array:

| Bucket | Data source |
|---|---|
| Essentials | `data.budget.essentials[]` — name, `baseline` amount, proportional bar (width = item/bucket total) |
| Discretionary | `data.budget.discretionary[]` — same |
| Debt | `data.debts.filter(d => !d.isMortgage)` — name, `planPayment \|\| minPayment`, balance, proportional bar |
| Liquid Savings | EF + general savings goals — name, monthly, current/goal balance |
| Retirement | Roth IRA monthly per source (`rothIra.monthly`) |

Clicking the same node again closes the panel. Clicking a different node switches to it. Panel pushes content down (reflow), does not overlay.

**Click (col 0 source node):** When expanded, clicking a source node shows that source's gross/net breakdown in the drill-down panel (salary, pre-tax deductions, taxes, take-home).

### 5.9 Accessibility

- `<title>` inside each `<path>` for links: `"{Source} → {Target}: $X"`.
- `<title>` inside each `<rect>` for nodes: `"{Node name}: $X ({Y}% of gross)"`.
- `aria-label` on the wrapping `<figure>`: `"Income flow from $X gross to {N} spending categories"`.
- All interactive elements (nodes, links) have `tabIndex={0}` and `onKeyDown` handler for Enter/Space (same as click).
- Focus ring: 1px solid `#60a5fa` outline on focused SVG elements.

---

## 6. Bottom Row

### 6.1 Debt-Free Timeline (left card)

Horizontal SVG with a linear age axis from `primaryW2.retirement.currentAge` to `primaryW2.retirement.targetAge`. `primaryW2` = the first entry in `data.income.sources` where `type === 'w2'` and `retirement.currentAge` is non-empty. If none qualifies, show a placeholder card prompting the user to enter their age in Invest & Retire.

**Milestones** (vertical tick marks above the axis):

| Milestone | Condition | Calculation |
|---|---|---|
| Now | Always | `currentAge` |
| Net-worth-positive | Only if result is > 3 years from now and < `targetAge` | Month where `(savings balances + retirement balance + monthly contributions×t) > (totalDebtBalance − monthly debt payments×t)` — linear approximation |
| Debt-free | Only when consumer debts exist | Existing `maxConsumerMonths` avalanche calc (max payoff months across individual debts using `calcPayoff`) |
| Retire | Always | `targetAge` |

**Label stacking:** Alternate labels above/below the axis when two milestones are within 2 years of each other (prevents overlap).

**No consumer debt state:** Show the debt-free tick with a "✓ Debt-free now" label at `currentAge`. Replace the card subtitle with "Now building toward retirement."

### 6.2 Retirement Projection (right card)

Keeps the existing `LineChart` component and `buildAggregateProjection` data. No changes to the chart itself.

**Fidelity benchmark guidelines** overlaid as horizontal lines:

| Age | Multiple | y-value |
|---|---|---|
| 30 | 1× | `grossMonthly × 12 × 1` |
| 40 | 3× | `grossMonthly × 12 × 3` |
| 50 | 6× | `grossMonthly × 12 × 6` |
| 60 | 8× | `grossMonthly × 12 × 8` |

Each line: dashed, `#3a5a7a` color, 0.5 opacity, extending full chart width. Labeled at the right edge in 8px `#3a5a7a` text: `"1× by 30"`, `"3× by 40"`, etc. Only render a guideline if its age falls within the chart's x-axis range and its y-value falls within the chart's y-axis range.

Implementation: extend `LineChart` to accept an optional `benchmarks?: { age: number; value: number; label: string }[]` prop. Render benchmark lines before the main line so they sit behind it.

---

## 7. Edge Cases

| State | Behavior |
|---|---|
| No income entered | Situational headline hidden; KPI badges show "—"; Sankey shows empty state card ("Add your income to see the flow."); bottom row cards show placeholders |
| No consumer debt | Debt node absent from Sankey col 3; Debt-free timeline shows "✓ Debt-free" at current age |
| Overshoot (`planSurplus < 0`) | Overshoot node appears in col 3 (red); Take-home node gets red border; headline flips to overspend message; stat card shows "Overshoot −$X" in red |
| Renter (no mortgage) | Essentials node value excludes mortgage P&I; Housing % badge shows rent % of gross; no change to Sankey structure |
| Single income source | Col 0 shows one node; source toggle hidden (no point collapsing one source) |
| Roth 401k = 0 | Roth 401k col 2 node omitted; col 2 has 3 nodes (Pre-tax Retirement, Taxes, Take-home) |
| No retirement contributions | Pre-tax Retirement node omitted from col 2; Taxes = grossMonthly − netMonthly |

---

## 8. Removals

- `DonutChart` import and usage removed from `OverviewTab.tsx`
- Debt-free strip (the green gradient row) removed from `OverviewTab.tsx`
- `DonutChart.tsx` component itself can stay (may be used elsewhere) — just not imported in Overview

---

## 9. Files Touched

| File | Change |
|---|---|
| `src/tabs/OverviewTab.tsx` | Full replacement |
| `src/components/SankeyChart.tsx` | New component |
| `src/components/DebtTimeline.tsx` | New component |
| `src/components/LineChart.tsx` | Add optional `benchmarks` prop |
| `package.json` | Add `d3-sankey`, `@types/d3-sankey` |
