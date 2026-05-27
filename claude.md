# Compound — Project Context

## What This Is

**Compound** is a personal finance planning tool with optional cloud sync. It helps users model their full financial picture: income, expenses, debt payoff, savings, and retirement projections. Everything runs in the browser; users can sign in with Google, Discord, or a magic link to sync their data across devices, or use the app locally without an account.

The goal is a single dashboard where a user can enter their financial data once and immediately see how changes (more income, faster debt payoff, higher retirement contributions) affect their long-term trajectory.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3.4 + inline styles |
| Charts | Custom SVG (no charting library) |
| State | React Context (`AuthContext`, `DataContext`, `UIContext`) + localStorage |
| Auth + DB | Supabase (auth, `user_data` table) |
| Testing | Vitest + @testing-library/react, jsdom |
| Build | Vite (port 5173) |
| Hosting | GitHub Pages (`/Compound/` base path) — `https://joshl0327.github.io/Compound/` |

**Key paths:**
- Tabs: `src/tabs/`
- Components: `src/components/`
- Context: `src/context/` (`AuthContext.tsx`, `DataContext.tsx`, `UIContext.tsx`)
- Business logic: `src/lib/`
- Hooks: `src/hooks/`
- Onboarding: `src/onboarding/`
- Types: `src/types/index.ts`

**localStorage keys:**

| Key | Constant | Purpose |
|---|---|---|
| `compound_v4` | `STORAGE_KEY` | Main app data |
| `compound_onboarding_done` | `ONBOARDING_KEY` | Suppresses welcome modal |
| `compound_profile_done` | `PROFILE_DONE_KEY` | Suppresses profile setup prompt |
| `compound_guest_mode` | `GUEST_KEY` (unexported, in AuthContext) | Persists guest-mode choice |
| `compound_milestones_v1` | — | Milestone high-water marks |

---

## Auth & Cloud Sync

### Supabase Setup

- Auth providers: **Google**, **Discord**, **Magic Link (email OTP)**
- Database table: `user_data` (`user_id uuid`, `key text`, `value jsonb`, `updated_at timestamptz`)
- Unique constraint on `(user_id, key)` — upsert on conflict
- RLS is **enabled** on `user_data` with four policies: SELECT, INSERT, UPDATE, DELETE — all using `auth.uid() = user_id`
- Credentials in `.env` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- The anon key (`sb_publishable_...`) is intentionally public — baked into the bundle at build time. Security is entirely enforced by RLS. See comment in `src/lib/supabaseClient.js`.
- `VITE_SUPABASE_ANON_KEY` must also be set as a **GitHub Actions secret** for the deploy workflow to bake it into the production build.

### How Cloud Sync Works (`src/lib/cloudSync.ts`)

- `saveToCloud(data)` — upserts the full `AppData` blob under `compound_v4` for the signed-in user. No-op if not signed in.
- `loadFromCloud()` — returns `AppData | null`. No-op if not signed in.
- `deleteFromCloud()` — deletes the user's row. Used by Reset All Data. No-op if not signed in.

### DataContext Sync Behaviour (`src/context/DataContext.tsx`)

- **On first sign-in:** loads from cloud, runs `migrateData()` to fill any gaps, hydrates state + localStorage. Guard ref prevents re-loading mid-session on token refreshes.
- **On every data change:** 3-second debounce triggers `saveToCloud`. Rapid edits reset the timer.
- **On sign-out (NavAvatar):** flushes a final `saveToCloud` before calling `signOut()` to capture any changes within the debounce window.
- **Guests:** all three are no-ops; data lives in localStorage only.

### AuthGate (`src/components/AuthGate.tsx`)

Blocks the app until auth state is resolved. Renders a sign-in card with magic link input + Google + Discord OAuth buttons + "Use without signing in" guest bypass. OAuth redirect URL is built dynamically: `window.location.origin + import.meta.env.BASE_URL` — works correctly on both localhost and GitHub Pages without any code change.

### NavAvatar (`src/components/NavAvatar.tsx`)

Sticky navbar indicator (far right, after Export/Import). Three states:
- **Loading:** renders nothing
- **Guest:** "Sign in" text link → opens Settings tab
- **Signed in:** 32×32 avatar circle (provider picture or initial letter) with a popover showing name/email, Settings link, and Sign Out

---

## Onboarding Flow

Controlled by `onboardScreen` state in `App.tsx` (`'welcome' | 'quickstart' | 'done'`). Suppressed once `ONBOARDING_KEY` is set in localStorage.

1. **WelcomeModal** — three paths: Quick Start wizard, import backup (writes to localStorage + reloads), or Skip
2. **QuickStart** — multi-step guided data entry (income, expenses, savings, invest)
3. **Done** — app renders normally

⚠️ **The onboarding flow needs to be revisited.** It predates auth and doesn't account for signed-in users who already have cloud data. Currently, a signed-in returning user who clears localStorage would be shown the welcome modal even though their data is in the cloud. The fix would be to skip onboarding if `loadFromCloud()` returns data.

---

## Design System

Theme tokens live in `src/index.css` under `[data-theme="dark"]` and `[data-theme="light"]`. Always use `var(--token)` in code — never hard-code hex values.

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--color-bg` | `#1d1b18` | `#f2f0ec` | Page background |
| `--color-surface` | `#252220` | `#faf9f7` | Card / panel background |
| `--color-surface-2` | `#2a2724` | `#ffffff` | Elevated surface (hover bg, nested cards) |
| `--color-border` | `#342f2a` | `#ddd9d4` | Dividers, card borders |
| `--color-text` | `#e8e4e0` | `#18140f` | Primary text |
| `--color-text-muted` | `#8a8078` | `#6b6560` | Secondary / label text |
| `--color-text-dim` | `#5a5450` | `#9a9590` | Tertiary / hint text |
| `--color-accent` | `#0d9488` | `#0a7a70` | Teal accent, active states |
| `--color-accent-dim` | `rgba(13,148,136,.12)` | `rgba(10,122,112,.10)` | Tinted accent backgrounds |
| `--color-danger` | `#f87171` | `#dc2626` | Destructive actions, debt labels, error text |
| `--color-danger-dim` | `rgba(248,113,113,.12)` | `rgba(220,38,38,.10)` | Danger button backgrounds, tinted borders |
| `--color-nav` | `rgba(24,22,20,.94)` | `rgba(238,236,232,.94)` | Sticky navbar backdrop |

Additional semantic colors used inline (not yet tokenized — see Known Gaps):
- **Green (healthy):** `#10b981` / `#34d399`
- **Amber (caution):** `#f59e0b`

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
| Settings | `SettingsTab.tsx` | App preferences + Reset All Data (two-step modal: export prompt → cloud wipe + sign-out) |

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

Plan/Snowball/Avalanche show a "vs Min" diff in the KPI bar (how much sooner and cheaper vs. minimum payments). Min mode shows no diff. Promo APR debts use two-phase interest calculation: 0% during promo period, then post-promo rate. Min simulation uses a dynamic minimum (`max(staticMin, 1% × balance + monthly interest)`) so the balance always declines — matching real credit card behavior. If plan payment can't cover post-promo interest in a static payment scenario, simulates 120 months and shows "↑ growing" in legend.

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
- `calcPayoffPromo(balance, promoRate, payment, promoMonthsLeft, postPromoRate, postPromoMinPct?)` → two-phase payoff: promo period at promoRate, then post-promo rate. Optional `postPromoMinPct` (default `0`) enables dynamic minimum mode: post-promo payment = `max(staticMin, pct × balance + monthly_interest)`, guaranteeing 1%/month balance decline. Without it, falls back to static payment; if that can't cover post-promo interest, simulates 120 months and returns partial result.
- `promoMonthsRemaining(promoEndDate)` → months until promo expires from today

### `cloudSync.ts`
- `saveToCloud(data)`, `loadFromCloud()`, `deleteFromCloud()` — Supabase upsert/select/delete for `user_data`. All three are no-ops when not signed in. Errors are logged but never thrown.

### `milestoneConstants.ts`
Shared constants for `useMilestones` and `MilestoneBadges`:
- `DOLLAR_THRESHOLDS` — [10K, 100K, 500K, 1M, 2M, 5M, 10M]
- `DOLLAR_LABELS`, `FIDELITY_LABELS`, `FIDELITY_BENCHMARKS`, `FIDELITY_BENCHMARK_AGES`

### `sankeyHelpers.ts`
Sankey layout math, node/link calculations, net-worth-positive month detection.

### `storage.ts`
localStorage read/write with data migration (`migrateData`), `makeDefault()`, and key constants. Key: `compound_v4`.

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

- **Raw hex colors in source files:** `#f87171`, `#ef4444`, `#10b981`, `#f59e0b` and similar are hard-coded throughout tabs and components instead of using CSS variables. `--color-danger` and `--color-danger-dim` have been added to the token system; the remaining semantic colors (`--color-positive`, `--color-caution`) should be added and all raw hex in `src/tabs/` and `src/components/` migrated to variables. Key files: `SettingsTab.tsx`, `PlanTab.tsx`, `ExpensesTab.tsx`, `OverviewTab.tsx`, `SavingsTab.tsx`, `SankeyChart.tsx`.

- **No multi-device conflict resolution:** Cloud wins on sign-in load; local changes during a session overwrite cloud on the 3s debounce. If the same account is used on two devices simultaneously, whichever saves last wins. Acceptable for now.
- **Fidelity row is projection-only:** No confirmed history since the app has no balance tracking over time.
- **Promo-aware payoff strategy:** Avalanche is only mathematically optimal when rates are static. When 0% promo periods are in play, pure avalanche can let a promo expire on a deprioritized card — triggering the full post-promo APR (often 24–29%) before it gets paid off — while snowball may accidentally clear the same card in time. The true optimal strategy treats promo expiration as a rate-change event: a debt with 2 months left at 0% is effectively the most expensive debt in the portfolio right now, regardless of its post-promo APR vs. others. Future work: add a "Smart" mode (or promo-aware advisory layer) that re-orders payoff priority by time-adjusted effective rate, factoring in how soon each promo expires. Could also surface a warning in Avalanche mode when it's on track to let a promo expire, costing more than the baseline minimum simulation.

---

## Running the App

```bash
npm run dev        # dev server at http://localhost:5173/Compound/
npm run build      # production build
npx vitest run     # run test suite
npx tsc --noEmit   # type check
```

## Bundle Architecture

Tabs are lazy-loaded via `React.lazy` — each tab is a separate async chunk downloaded on first visit. `vite.config.ts` defines manual vendor chunks:

| Chunk | Contents | Gzip |
|---|---|---|
| `vendor-supabase` | `@supabase/supabase-js` | ~55 KB |
| `vendor-react` | `react`, `react-dom` | ~45 KB |
| `vendor-d3` | `d3-sankey` | ~2 KB |
| `index` | App shell + contexts + nav | ~7 KB |
| Per-tab chunks | Each tab (~3–11 KB gz) | on demand |

Vendor chunks have stable hashes — a code-only deploy never busts them. Cold first load is ~120 KB gz (shell + vendors + Overview tab).
