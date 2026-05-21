# Compound — Personal Finance App

## Project Purpose

Compound is a personal finance web app designed to help people — especially beginners — understand their financial health and take action toward debt payoff, savings goals, and retirement. The primary audience is someone early in their financial journey: they may carry significant consumer debt, have limited savings, and lack financial literacy vocabulary.

The app runs entirely client-side with localStorage persistence. There is no backend, no login, no cloud sync.

---

## Core Philosophy

1. **Meet beginners where they are** — Avoid jargon. Every metric should have a plain-English label or tooltip (e.g., "DTI — how much of your paycheck goes to debt. Under 36% is healthy").
2. **Show the user what to do next** — The app doesn't just display data; it guides action.
3. **Emotional motivation matters** — A debt-free date and savings milestone are more motivating than raw numbers. Surface these prominently.
4. **Progressive complexity** — Beginners should reach a meaningful "aha moment" in under 5 minutes via Quick Start, without filling in every tab.
5. **Judgment-free** — Color coding and language should inform, not shame. Traffic light colors reserved only for Housing % and Total DTI where thresholds are universal. Having debt is not a moral failing.

---

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | React Context (DataContext + UIContext) |
| Build | Vite (port 5173), `npm run dev` / `npm run build` |
| Testing | Vitest + @testing-library/react, `npx vitest run` |
| Persistence | localStorage (`compound_v4`, `compound_onboarding_done`, `compound_profile_done`) |

- **Component-based**: `src/` directory with `tabs/`, `features/`, `components/`, `hooks/`, `context/`, `lib/`, `types/`
- **React 18 with JSX**, bundled by Vite
- **Persistence**: `localStorage` for all user data — **localStorage key names must never be changed**
  - Main data key: `compound_v4`
  - Onboarding complete: `compound_onboarding_done`
  - Profile card dismissed: `compound_profile_done`
- **Dark theme**: Consistent dark card styling throughout
- **Default debt strategy**: Avalanche (highest interest rate first)

---

## Data Model

```js
data = {
  income: {
    sources: [
      {
        id: "primary",              // "primary" for first source, "src-TIMESTAMP" for others
        name: "Person 1",           // editable by user; pencil icon in UI
        type: "w2",                 // "w2" | "other"
        // W2 fields:
        mode: "simple",             // "simple" | "detailed"
        annualSalary: "",           // simple mode
        takeHomePerPaycheck: "",    // simple mode
        frequency: "biweekly",
        grossPerPaycheck: "",       // detailed mode
        // Legacy detailed fields (old UI; still in data for backward compat):
        healthInsurance: "", fsa: "", otherPreTax: "",
        federalTax: "", stateTax: "", otherPostTax: "",
        // New detailed paycheck fields (current UI):
        taxesPerPaycheck: "",       // total taxes per paycheck (replaces federal/state/FICA UI)
        hsaPerPaycheck: "",         // HSA per paycheck → syncs to data.retirement.hsa.monthly
        trad401kPaycheck: "",       // raw per-paycheck display string for traditional 401k
        roth401kPaycheck: "",       // raw per-paycheck display string for Roth 401k
        customPreTax: [],           // [{ id, label, amount }] custom pre-tax deductions
        retirement: {               // W2 sources only — per-person
          use401kPercent: false,    // false = dollar mode (set by detailed Income tab)
          traditional401kPct: "",   // used when use401kPercent = true (simple/Invest&Retire)
          roth401kPct: "",
          employerMatchPct: "",
          traditional401kDollar: "", // monthly $ — written by detailed Income tab
          roth401kDollar: "",        // monthly $ — written by detailed Income tab
          traditional401kBalance: "",
          roth401kBalance: "",
          rothIra: { monthly: "", currentBalance: "" },
          currentAge: "",
          targetAge: "65"
        }
      },
      // "other" type sources:
      { id: "src-...", name: "Side Hustle", type: "other", monthlyNet: "" }
    ]
  },
  debts: [],  // { id, name, balance, rate, minPayment, planPayment, isMortgage, isPromo,
              //   monthlyEscrow, escrowBalance, loanStartDate, loanEndDate, ... }
  budget: {
    essentials: [],       // { id, name, baseline, plan } — user can add/remove items
    discretionary: []     // { id, name, baseline, plan } — labeled "Other Expenses" in UI
  },
  retirement: {
    hsa: { monthly: "", currentBalance: "", familyCoverage: false }  // household-level
  },
  savings: {
    emergencyFund: { current: "", goal: "", monthly: "" },
    generalSavings: { monthly: "", goal: "" }
  },
  invest: { monthly: "", currentBalance: "", notes: "" },
  settings: { incomeBasis: "gross", debtStrategy: "avalanche" },
  plan: {
    essentials: {},       // { [essentialId]: planValue }
    discretionary: {},    // { [discretionaryId]: planValue }
    debtPayments: {},     // { [debtId]: planPayment }
    savings: {            // planned monthly contributions (sandbox; doesn't affect actual savings)
      emergencyFund: "",  // plan override for monthly EF contribution
      generalSavings: ""  // plan override for monthly general savings
    },
    goals: []
  }
}
```

**Migration**: `migrateData(parsed, def)` runs on load and transparently upgrades old flat `income`/`retirement` structure to the new `income.sources[]` format. Never remove this function.

**localStorage key names must never be changed.**

---

## Tab Structure

| Tab | Purpose |
|-----|---------|
| **Overview** | Dashboard: situational headline, 7-badge KPI strip, multi-layer Sankey flow chart (income sources → gross → pre-tax split → spending buckets), debt-free timeline, retirement projection |
| **Income** | Multi-source income (W2 + Other). Simple mode: salary + take-home. Detailed mode: full paycheck deductions per paystub. |
| **Expenses** | Essentials (add/remove) + Debt Obligations + Other Expenses. All amounts are monthly. No plan columns. |
| **Savings** | Emergency fund + general savings with Actual/Plan monthly columns. Header shows full post-tax savings breakdown and remaining. |
| **Invest & Retire** | Per-W2-source 401k/Roth IRA (each person matches same layout) + household HSA + brokerage/taxable. |
| **Plan** | What-if sandbox: adjust spending, model extra debt payments. Header shows Baseline / Plan Total / Remaining. Debt section has plan payment input embedded in payoff timeline cards. |
| **Settings** | Debt strategy (Avalanche / Snowball / Custom), income basis, display prefs |

---

## Income Tab — Detailed Mode

When a W2 source switches to Detailed mode, the paycheck is entered as actual paystub line items:

1. **Pay Details** (left): Pay frequency + Gross pay per paycheck → monthly gross
2. **Deductions Per Paycheck** (left):
   - Total Taxes (federal + state + FICA combined, one field)
   - ─── separator ───
   - Traditional 401k $ per paycheck → converts to monthly, writes to `retirement.traditional401kDollar`, sets `use401kPercent = false`
   - Roth 401k $ per paycheck → writes to `retirement.roth401kDollar`
   - HSA $ per paycheck → writes to `data.retirement.hsa.monthly`
   - Custom deductions (label + $ per paycheck, "+ Add Deduction" button)
3. **Paycheck Summary** (right): Shows cents for reconciliation against paystub

**Sync behavior**: 401k and HSA entered in detailed Income flow to Invest & Retire automatically. Invest & Retire shows read-only "Synced from Income tab" when primary source is in detailed mode. Simple mode users configure 401k % directly in Invest & Retire.

**All W2 sources** (primary and secondary) support the same Simple/Detailed toggle. Secondary source detailed mode includes the full deductions section with its own Paycheck Summary.

**Pencil icon** next to all income source names — clicking focuses the editable name input.

---

## Key Metrics & Calculations

- **Total DTI**: (all debt minimum payments + housing) ÷ gross monthly income
- **Consumer DTI**: (non-housing debt minimum payments) ÷ gross monthly income — always shown as DTI card subtitle
- **Housing %**: Housing cost ÷ gross monthly income (target: ≤28%)
- **Savings Rate**: `totalSavedMonthly ÷ gross (or net) monthly income`
- **Debt payoff date**: Calculated using avalanche or snowball strategy based on settings

### Aggregation across income sources
- `grossMonthly` = sum of all W2 source gross + all Other source monthlyNet
- `netMonthly` = sum of all W2 source take-home + all Other source monthlyNet
- `trad401kMonthly`, `roth401kMonthly`, `employerMatch`, `rothIraMonthly` = sums across all W2 sources
- `hsaMonthly` = from `data.retirement.hsa.monthly`; overridden by sum of `src.hsaPerPaycheck * perYear/12` across detailed-mode sources
- `primaryCalc` / `primaryRet` = shorthands for the first W2 source

### Net calculation — detailed mode
When `src.taxesPerPaycheck` is set (new UI), uses:
`net = gross - trad401k - roth401k - taxesMo - hsaMo - customDeductionsMo - otherPostTax`

Falls back to old separate federal/state/FICA fields for users with existing data.

### Post-tax savings (critical for budget accuracy)
`postTaxSavingsMonthly = liquidSavingsMonthly + rothIraMonthly + investMonthly`

Pre-tax items (`trad401kMonthly`, `roth401kMonthly`, `hsaMonthly`) and employer match are already excluded from `netMonthly` before it reaches budget calculations — do NOT subtract them again. Only `postTaxSavingsMonthly` should be subtracted from `planSurplus` to compute "Remaining" in both the Overview and Plan tab.

### DTI label convention
- Label is **"Total DTI"** — housing is always included
- **"Consumer DTI"** = debt excluding housing — always shown as subtitle on DTI badge

---

## Overview Tab

### Page structure (top → bottom)
1. **Situational headline** — one generated sentence from health state (e.g. "Strong saver carrying $30k at 41.4% DTI"). Right-aligned stat card: "This month · +$X surplus" (red when overshoot). Hidden when no income entered.
2. **KPI strip** — 7 badges: Gross Income | Take-Home | Consumer Debt | Housing % | Total DTI | Retirement Rate | Total Savings Rate
3. **Sankey flow card** (`SankeyChart`) — multi-layer flow showing where each dollar goes
4. **Bottom row** — Debt-Free Timeline (left) + Retirement Projection (right)

### Sankey chart
Implemented in `src/components/SankeyChart.tsx` using `d3-sankey` for layout math only — all rendering is React SVG. Data helpers in `src/lib/sankeyHelpers.ts`.

**4-column structure:**
- Col 0: Income sources (one node per `data.income.sources[]`)
- Col 1: Gross income (aggregator)
- Col 2: Pre-tax Retirement · Roth 401k (if nonzero) · Taxes · Take-home
- Col 3: Essentials · Discretionary · Debt · Liquid Savings · Retirement (Roth IRA) · Remaining or Overshoot

**Labels:**
- Col 0 (sources): left-side SVG text, name + amount
- Col 2 terminals (Pre-tax Retirement, Taxes): right-side HTML label panel with colored left-border accent
- Col 3 (buckets): same right-side panel, sorted below col-2 terminals by y-position
- Take-home node: small "TAKE-HOME" SVG label above the node (pass-through, not a destination)

**Ribbons:** Custom `ribbonPath()` function draws the full filled bezier shape (not `sankeyLinkHorizontal()` which only draws a center curve). Fill uses `linearGradient` left→right, source → target color at ~0.6 opacity.

**Health-weighted node colors:** Essentials goes orange when housing > 28%, Debt goes orange when DTI ≥ 36% (set in `buildSankeyData`). Overshoot node is always red. No flag text annotations on labels — the KPI badges communicate health status.

**Source toggle:** "Sources ▾/▸" button collapses all sources into one "Total Income" node. Shown only when `sourceCalcs.length > 1`.

**Drill-down panel:** Clicking a col-3 bucket node opens a line-item breakdown below the card. Clicking col-0 source node shows that source's gross/net breakdown.

### Debt-Free Timeline
`src/components/DebtTimeline.tsx` — horizontal SVG axis from `currentAge` to `targetAge` (from `primaryW2.retirement`). Milestones: Now, Net-worth-positive (if > 3 years away), Debt-free, Retire. Alternates above/below when milestones are within 2 years.

### Retirement Projection
Existing `LineChart` with `buildAggregateProjection`. Fidelity benchmark guidelines added via optional `benchmarks` prop — dashed horizontal lines at 1×/3×/6×/8× annual gross at ages 30/40/50/60.

### KPI badge notes
- **Total DTI** subtitle: always `"Consumer DTI X%"`
- **Consumer Debt** subtitle: `"excl. mortgage"` when mortgage exists

---

## Invest & Retire Tab

### Per-person 401k layout (all W2 sources use identical structure)
Each person gets:
1. **401k card** with PERCENT / DOLLARS toggle (uppercase):
   - 2-column grid: Traditional 401k (pre-tax, green header) | Roth 401k (post-tax, purple header)
   - Each sub-card: contribution input + computed `/mo` display + Current Balance field
   - Full-width Employer Match section with "free money" computed display
   - Combined limit footer with over-limit warning
2. **Roth IRA card** (separate, below 401k card):
   - "Post-tax - comes from take-home pay" pill
   - Monthly Contribution + Current Balance
   - 2025 limit + phase-out note

Primary source (Person 1): same layout, with "Synced from Income tab" note in Traditional 401k when in detailed income mode.

---

## Savings Tab

### Header bar
- **Available after expenses**: `planSurplus` (take-home minus all planned spending, before savings)
- **Breakdown**: Emergency Fund | General | Roth IRA | Brokerage (plan amounts)
- **Remaining**: `planSurplus - planLiquidSavingsMonthly - rothIraMonthly - investMonthly`

### Actual vs Plan columns
Both Emergency Fund and General Savings cards have side-by-side monthly inputs:
- **Monthly (Actual)**: updates `data.savings.[section].monthly` — the real contribution
- **Monthly (Plan)**: updates `data.plan.savings.[section]` — sandbox target; used in header and Plan tab

Progress bar and payoff date use the plan value when set, actual otherwise.

---

## Plan Tab

### Header bar
Four stats: Take-Home | Baseline | Plan Total | Remaining
- **Baseline** = `realityTotal + postTaxSavingsMonthly` (current actual spend including post-tax savings)
- **Plan Total** = `planTabTotal + postTaxSavingsMonthly` (plan spend including post-tax savings)
- **Remaining** = `netMonthly - planTabTotalWithSavings`; matches Overview Remaining when no plan overrides are set
- Plan Total turns orange when it exceeds Baseline

### Debt Obligations section
Consolidated from two separate sections into one. Each debt card:
- Header row: debt name + balance @ rate
- Min Payment column (left): static payoff timeline
- Plan Payment column (right): **editable input embedded in the column header** + live payoff timeline

---

## Color System

One base color for all metric values. Traffic light only for ratios with universal thresholds.

| Color | Hex | Meaning |
|---|---|---|
| Blue | `#60a5fa` | All metric values (income, debt totals, savings rates, etc.) |
| Green | `#10b981` | Healthy status **only** (DTI/Housing % within range, positive surplus) |
| Orange | `#f97316` | Caution status (DTI/Housing % moderate) |
| Red | `#ef4444` | Danger status (DTI/Housing % high, negative surplus) |
| Amber gradient | `#f97316` → `#fbbf24` | Debt cards — priority order (highest priority = most orange) |
| Neutral gray | `#3a5a7a` | Empty/unset values |

Traffic light applies **only** to Housing % (28% threshold) and Total DTI (36%/20% thresholds).

---

## Onboarding

### Quick Start (primary path)
3-question wizard → Overview. Steps:
1. **Income** — Annual salary, take-home, pay frequency. Hint: "Enter your main income first — add a partner's income or side hustle in the Income tab after setup."
2. **Housing** — Monthly rent/mortgage
3. **Debt** — Carousel for multiple debts
4. **Orientation** — Tab overview; lands on Overview

Quick Start saves to `income.sources[0]` (not to old flat `income.*` fields). Bug was fixed in this refactor.

### Welcome Modal
Options: **Quick Start** (primary) → **Import a backup** → **Skip**.

### Profile Completeness Card
Shown on Overview, tracks 7 sections. Dismissed permanently via `compound_profile_done` localStorage key.

---

## Debt System

- **Debt colors**: `debtColor(index, total)`. Mortgage always gets neutral `#2a4060`.
- **Sort order**: `sortedDebts` (Overview) sorts live. `stableDebts` (Expenses) sorts on blur/Enter only.
- **Editing**: All debt card fields are inline-editable.
- **Mortgage**: Always pinned to bottom. Has extended fields:
  - `monthlyEscrow` — taxes + insurance per month
  - `escrowBalance` — current escrow account balance
  - `loanStartDate` / `loanEndDate` — for duration display and payoff planning
  - Shows Total PITI = P&I + Escrow, and loan duration (e.g. "Mar 2025 — Apr 2055")

---

## Expenses Tab

- **All amounts are monthly** — labeled in column headers and subtitle
- **Essentials**: Fixed categories pre-populated; users can add custom essentials and remove any item (including defaults)
- **Other Expenses** (formerly "Discretionary"): Custom categories with monthly amount only — no Plan column in UI
- **Plan column**: Hidden from UI but preserved in data model — still used by the Plan tab sandbox
- **Debt Obligations**: Mortgage cards show expanded detail section (escrow, dates, PITI total)

---

## Currency Input Conventions

- **Input fields**: All currency inputs allow decimals. Display uses `fmtCurrencyInput()` which preserves trailing decimals while typing.
- **Summaries and badges**: `fmt()` function — whole dollars only (`maximumFractionDigits: 0`)
- **Paycheck Summary**: `fmtDec()` — shows cents for paystub reconciliation
- **Per-paycheck ↔ monthly round-trip**: 401k fields store both the raw per-paycheck string (`trad401kPaycheck`) for display AND the computed monthly in `retirement.traditional401kDollar` for Invest & Retire

---

## Design Conventions

- **Dark card styling**: use `className="card"` — the `.card` utility in `src/index.css` applies `bg-gradient-to-br from-surface to-surface2 border border-border rounded-2xl p-5`
- **Custom Tailwind tokens**: `bg`, `surface`, `surface2`, `border`, `blue`, `green`, `orange`, `amber`, `red`, `muted`, `subtle`, `dim` — defined in `tailwind.config.ts`. Always use tokens over raw hex.
- **Section titles**: `<SectionTitle accent="#hex">` component with colored accent bar
- **Badge components**: `<Badge label value color sub tooltip>` — used for summary metrics at the top of tabs. Tooltip appears on hover.
- **Empty states**: When a value is 0 or unset, show instructional placeholder text — never just "$0"
- **Pencil icon SVG**: `<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />` used on all income source name fields
- **Fonts**: `font-display` (Syne, headings), `font-body` (DM Sans, UI), `font-mono` (DM Mono, numbers)

---

## Claude Code Guardrails

- **Never rename localStorage keys** — changing a key name silently wipes user data on next load
- **Never touch unrelated tabs** — if a prompt is about Expenses, don't modify Income or Overview
- **Preserve all existing data wiring** when moving UI between tabs — only change placement, not structure
- **Scope creep check**: if a prompt says "no other changes", do not refactor adjacent code even if it looks messy

---

## Recent Changes (since React migration)

### Visual polish (complete)
- Container widened to `max-w-7xl` (1280px) across header, nav, and tab content
- Badge row fixed to single non-wrapping row (`repeat(7, 1fr)`)
- Non-traffic-light badge values unified to blue (`#60a5fa`); traffic light reserved for Housing % and Total DTI only

### Expenses tab (complete)
- Side-by-side layout: Essentials + Other Expenses on left, Debt Obligations on right (50/50, collapses to single column below 768px)
- Debt card pencil-icon edit mode — Balance, APR, Minimum are display-only; pencil opens a draft-state edit form with Save/Cancel; Plan Payment remains always-editable inline
- Live data lookup fix: `stableDebts` provides sort order only; rendered debt values come from `data.debts` directly to prevent stale-prop reversion on keystrokes
- Promo/mortgage date normalization on load — converts any non-`YYYY-MM-DD` stored format to ISO for `<input type="date">` display

### Plan tab (complete)
- Debt plan payments unified to `debt.planPayment` as single source of truth — Plan tab previously wrote to `data.plan.debtPayments` (a separate sandbox field) causing Overview/Expenses/Plan to diverge
- Consumer Debt-Free date footer added to Debt Obligations section

### Overview tab redesign (complete)
- **DonutChart removed** — replaced entirely by the Sankey
- **New:** `src/lib/sankeyHelpers.ts` — pure helper functions: `buildSankeyData`, `buildSankeyDataCollapsed`, `computeLabelPositions`, `computeSituationalRead`, `computeNetWorthPositiveMonths` (22 unit tests)
- **New:** `src/components/SankeyChart.tsx` — multi-layer Sankey using `d3-sankey` for layout, React SVG for rendering. Custom `ribbonPath()` function draws proper filled ribbon shapes.
- **New:** `src/components/DebtTimeline.tsx` — horizontal age-axis milestone timeline
- **Modified:** `src/components/LineChart.tsx` — optional `benchmarks?: Benchmark[]` prop for Fidelity guideline overlays
- **New dep:** `d3-sankey` (layout math only, ~15KB)
- Situational headline above badge strip replaces the old page title
- Debt-free strip removed (replaced by DebtTimeline component in bottom row)

---

## Known Issues / Decisions Log

- Crypto/speculative assets belong under Invest (not Savings)
- localStorage is one browser-clear away from data loss — export/import is the current mitigation
- Profile completeness card may not show if `compound_profile_done` is already set — clear via DevTools → Application → Local Storage
- Essentials default to $0 — previously defaulted to Miami averages, removed as confusing
- Legacy detailed-mode fields (`healthInsurance`, `fsa`, `otherPreTax`, `federalTax`, `stateTax`) still exist in data model and are used as fallback in net calculation when `taxesPerPaycheck` is not set
- `data.plan.debtPayments` still exists in the data model and localStorage but is no longer read — superseded by `debt.planPayment` as the single source of truth

---

## Future Roadmap

### Sankey label improvements (pending)
The current right-side label panel (col-2 terminals + col-3 buckets unified) is functional but not fully satisfying aesthetically. Known issues to address in a future pass:
- The `TAKE-HOME` above-label for the pass-through node is functional but feels disconnected
- The Taxes node label may not be visible when the taxes band is thin (< 10px of nodePadding above)
- The collision avoidance works but can push labels into awkward gaps at certain data ratios
- Overall label panel could benefit from a visual separator between col-2 (pre-tax) and col-3 (post-tax) sections

### After Overview stabilizes
- **Age-based retirement benchmarks** (1× salary by 30, 3× by 40, etc.) in Invest & Retire tab
- **Quick Start dual-income question** — ask upfront if household has two earners, initialize two sources
- Mobile layout optimization
- Inflation-adjusted retirement projections
- Zip code-based essentials pre-population
