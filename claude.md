# Compound — Project Context

## What This Is

**Compound** is a client-side personal finance planning tool. It helps users model their full financial picture: income, expenses, debt payoff, savings, and retirement projections. Everything runs in the browser — no backend, no accounts, no server.

The goal is a single dashboard where a user can enter their financial data once and immediately see how changes (more income, faster debt payoff, higher retirement contributions) affect their long-term trajectory.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3.4 + inline styles |
| Charts | Custom SVG (no charting library) |
| State | React Context (`DataContext`, `UIContext`) + localStorage |
| Testing | Vitest + @testing-library/react, jsdom |
| Build | Vite (port 5173) |
| Hosting | GitHub Pages (`/Compound/` base path) |

**Key paths:**
- Tabs: `src/tabs/`
- Components: `src/components/`
- Business logic: `src/lib/`
- Hooks: `src/hooks/`
- Types: `src/types/index.ts`
- localStorage keys: `compound_v4` (main data), `compound_milestones_v1` (milestone high-water marks)

---

## Design System

- **Background:** `#022e2e` (dark teal)
- **Surface:** `#043a3a`
- **Accent:** `#0d9488` (teal)
- **Green (healthy):** `#10b981` / `#34d399`
- **Amber (caution):** `#f59e0b`
- **Red (danger):** `#f87171`
- **Muted text:** `#5a7a9a`
- **Fonts:** IBM Plex Sans (display), IBM Plex Mono (numbers/data), DM Mono (milestone pills)
- Charts are hand-rolled SVG — no external chart library
- Inline styles are common alongside Tailwind; follow whichever pattern the surrounding code uses

---

## App Structure

The app is a single-page tabbed layout. Tabs:

| Tab | File | Purpose |
|---|---|---|
| Overview | `OverviewTab.tsx` | Full dashboard: Sankey budget flow, debt timeline, retirement projection with milestone badges |
| Income | `IncomeTab.tsx` | W2 and non-W2 income sources |
| Expenses | `ExpensesTab.tsx` | Fixed expenses, debts (including promo APR support), discretionary |
| Savings | `SavingsTab.tsx` | Emergency fund, general savings goals |
| Invest & Retire | `InvestRetireTab.tsx` | 401k, Roth IRA, HSA contributions and balances |
| Plan | `PlanTab.tsx` | Budget surplus allocation |
| Settings | `SettingsTab.tsx` | App preferences |

---

## Key Components

### `SankeyChart.tsx`
Monthly budget flow visualization. Shows gross income flowing through taxes → 401k/HSA → take-home → essentials/discretionary/debt/savings. Health-coded node colors (orange when housing >28%, red when DTI ≥36%).

### `DebtTimeline.tsx`
Stacked area chart showing debt payoff over time. Supports four modes:
- **Min** — minimum payments only
- **Plan** — user-configured plan payments (**default mode**)
- **Snowball** — plan payments + surplus applied to smallest balance first
- **Avalanche** — plan payments + surplus applied to highest rate first

Snowball/Avalanche show "vs Plan" diff (not "vs Min"). Promo APR debts use two-phase interest calculation: 0% during promo period, then post-promo rate. If minimum payment can't cover post-promo interest, simulates 120 months and shows "↑ growing" in legend.

### `LineChart.tsx`
Retirement projection curve. Renders SVG with crosshair tooltip, Fidelity benchmark lines, and a `badgeOverlay?: ReactNode` prop for milestone badges. The overlay scales responsively via `ResizeObserver` — captures the initial render width as the scale reference (so `scale = 1` at page-load size) and adjusts proportionally on resize.

### `MilestoneBadges.tsx`
Two-row pill strip overlaid on the retirement chart's top-left dead space. Pills are fixed `82×42px` with font 11px; overlay scales with chart via `transform: scale()`.
- **Row 1:** Dollar milestones ($10K → $10M) — 4-pill rolling window (up to 2 recent earned + fill with upcoming). Visual hierarchy: dim past earned → bright latest earned → solid-outline next-up → faded upcoming.
- **Row 2:** Fidelity benchmarks (1× by 30 → 8× by 60) — all shown as projections only (`→` dashed outline when on-track, faded when not). No `✓` ever — app is point-in-time, not a historical tracker. "1× by 30" always shown.

### `MilestoneToast.tsx`
React portal toast (renders to `document.body`, bypasses `overflow: hidden`) that fires when a new dollar milestone is crossed. Auto-dismisses after 4 seconds. Shows the highest newly-unlocked milestone label.

---

## Business Logic (`src/lib/`)

### `calculations.ts`
- `buildAggregateProjection(sources, sourceCalcs, hsaBalance, investBalance)` → `DataPoint[]` — retirement projection at 7% nominal return
- `calcPayoff(balance, annualRate, payment)` → standard single-rate payoff
- `calcPayoffPromo(balance, promoRate, payment, promoMonthsLeft, postPromoRate)` → two-phase payoff: promo period at promoRate, then post-promo rate. If payment can't cover post-promo interest, simulates 120 months and returns partial result (never returns null).
- `promoMonthsRemaining(promoEndDate)` → months until promo expires from today

### `milestoneConstants.ts`
Shared constants for `useMilestones` and `MilestoneBadges`:
- `DOLLAR_THRESHOLDS` — [10K, 100K, 500K, 1M, 2M, 5M, 10M]
- `DOLLAR_LABELS`, `FIDELITY_LABELS`, `FIDELITY_BENCHMARKS`, `FIDELITY_BENCHMARK_AGES`

### `sankeyHelpers.ts`
Sankey layout math, node/link calculations, net-worth-positive month detection.

### `storage.ts`
localStorage read/write with data migration. Key: `compound_v4`.

### `format.ts`
Currency/number formatting (`fmt`, `fmtShort`).

---

## Hooks

### `useMetrics.ts`
Derives computed metrics from raw data: `grossMonthly`, `netMonthly`, `dti`, `consumerDti`, `housingPct`, `savingsRate`, `retireRate`, `sourceCalcs`, etc.

### `useMilestones.ts`
Computes which retirement milestones are earned and detects new unlocks.

- **Dollar earned:** `currentBalance >= threshold`, high-water mark persisted in `compound_milestones_v1`
- **Fidelity earned:** past-age only — `currentAge >= benchmarkAge` AND current balance qualifies. Future projections are NOT in `earnedFidelity`.
- **Fidelity on-track:** `currentAge < benchmarkAge` AND projection at that age meets the multiplier threshold
- `prevRef` initialized from localStorage on mount so page-load never fires spurious toasts
- Returns `{ earnedDollar, earnedFidelity, fidelityOnTrack, currentAge, newlyUnlocked }`

Exported pure functions for testing: `computeDollarEarned`, `computeFidelityEarned`, `computeFidelityOnTrack`.

---

## Debt Data Model

```ts
interface Debt {
  id, name, balance, rate, minPayment, planPayment?
  isMortgage
  isPromo?, promoRate?, promoEndDate?, postPromoRate?
  monthlyEscrow?, escrowBalance?, loanStartDate?, loanEndDate?
}
```

**Promo APR behavior:**
- `rate` is set to `'0'` (promoRate) while promo is active; `postPromoRate` holds the full APR
- For simulation/sorting, `SimDebt.annualRate` uses `postPromoRate` (the effective long-term rate for avalanche ordering)
- `SimDebt.promoAnnualRate` + `promoMonthsLeft` drive the rate switch in month-by-month simulations
- If minimum payment < post-promo interest: debt shows in chart with growing balance, legend shows "↑ growing" instead of a payoff date

---

## Known Gaps / Future Work

- **Dynamic minimum payments:** App uses the static minimum entered by the user. Credit card minimums auto-adjust post-promo (typically 1% of balance + interest). Wells Fargo Reflect's minimum jumps from ~$56 to ~$173 after promo expires — this is why the app shows "↑ growing" when Wells Fargo's own disclosure says 20 years at minimum.
- **Fidelity row is projection-only:** No confirmed history since the app has no balance tracking over time.
- **`debtColor` tests:** 3 pre-existing failures in `calculations.test.ts` — test expectations don't match current color interpolation. Safe to ignore during active development.
- **InvestRetireTab `LineChart`:** Has its own chart instance without the milestone badge overlay.

---

## Running the App

```bash
npm run dev        # dev server at http://localhost:5173/Compound/
npm run build      # production build
npx vitest run     # tests (3 pre-existing debtColor failures are expected)
npx tsc --noEmit   # type check
```
