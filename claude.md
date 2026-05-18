# Compound — Personal Finance App

## Project Purpose

Compound is a personal finance web app designed to help people — especially beginners — understand their financial health and take action toward debt payoff, savings goals, and retirement. The primary audience is someone early in their financial journey: they may carry significant consumer debt, have limited savings, and lack financial literacy vocabulary.

The app runs entirely client-side as a **single `index.html` file** with localStorage persistence. There is no backend, no login, no cloud sync.

---

## ⚠️ Next Major Change: Migrate to React + Vite + JSX

**This should be the next significant piece of work before adding any more structural features.**

The single-file `El()` vanilla approach has reached its maintainability ceiling at ~6,300 lines. Every structural change (layout reorders, new component patterns, tab reorganizations) risks cascading bracket mismatches. The React migration would:

- Make the component tree visible and safe via JSX
- Enable real component extraction (currently everything is inlined)
- Allow layout changes that are unsafe at this file size (e.g. side-by-side Expenses layout)
- Unlock proper state management patterns
- Make future features (charts, projections, multi-account) tractable

**Preserve localStorage key names exactly** — migration must be data-compatible with existing users.

---

## Core Philosophy

1. **Meet beginners where they are** — Avoid jargon. Every metric should have a plain-English label or tooltip (e.g., "DTI — how much of your paycheck goes to debt. Under 36% is healthy").
2. **Show the user what to do next** — The app doesn't just display data; it guides action.
3. **Emotional motivation matters** — A debt-free date and savings milestone are more motivating than raw numbers. Surface these prominently.
4. **Progressive complexity** — Beginners should reach a meaningful "aha moment" in under 5 minutes via Quick Start, without filling in every tab.
5. **Judgment-free** — Color coding and language should inform, not shame. Traffic light colors reserved only for Housing % and Total DTI where thresholds are universal. Having debt is not a moral failing.

---

## Architecture

- **Single file**: All HTML, CSS, and JavaScript lives in `index.html` at the **repo root**
- **Persistence**: `localStorage` for all user data — **localStorage key names must never be changed**
  - Main data key: `compound_v4`
  - Onboarding complete: `compound_onboarding_done`
  - Profile card dismissed: `compound_profile_done`
- **No frameworks**: Vanilla JS (no React, no build step) — React is loaded via CDN using `El()` factory function
- **Dark theme**: Consistent dark card styling throughout
- **Default debt strategy**: Avalanche (highest interest rate first)
- **Branches**:
  - `main` — stable baseline
  - `multi-income` — active development branch with all recent features; this is the working branch

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
| **Overview** | Dashboard: DTI badges, savings rate, housing %, profile completeness card, debt payoff timeline, Take-Home Budget Summary |
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

### Badges (top bar)
Gross Income | Take-Home | Consumer Debt | Housing % | Total DTI | Retirement Rate | Total Savings Rate

- **Total DTI** subtitle: always `"Consumer DTI X%"` (removed "high/moderate/healthy" text)
- **Consumer Debt** subtitle: `"excl. mortgage"`

### Removed sections (intentionally)
- **Monthly Savings summary card** — removed; data is visible in Savings tab and Budget Summary
- **Suggested Next Steps** — removed; to be redesigned with better logic before re-adding

### Take-Home Budget Summary (Plan)
Shows how planned take-home pay is allocated:
- Essentials | Debt Payments | Discretionary | Savings (liquid + brokerage) | Retirement (post-tax Roth IRA only)
- **Remaining** = `planSurplus - postTaxSavingsMonthly` — matches Plan tab Remaining exactly

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

- **Dark card styling**: `background: linear-gradient(145deg, #111c28, #0d1620)`
- **Section titles**: `SectionTitle` component with colored accent bar
- **Badge components**: Used for summary metrics at the top of tabs
- **Tooltips**: Badge component supports `tooltip` prop — 5 Overview badges have tooltips
- **Empty states**: When a value is 0 or unset, show instructional placeholder text — never just "$0"
- **Pencil icon SVG**: `<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />` used on all income source name fields

---

## Claude Code Guardrails

The entire app is one file (~6,300 lines). Enforce these rules on every prompt:

- **Never rename localStorage keys** — changing a key name silently wipes user data on next load
- **Never touch unrelated tabs** — if a prompt is about Expenses, don't modify Income or Overview
- **Never add a build step or external dependencies** — the app is intentionally zero-dependency
- **Never split index.html into multiple files** — single-file is an explicit constraint
- **Preserve all existing data wiring** when moving UI between tabs — only change placement, not structure
- **Don't add frameworks** (React, Vue, Alpine, etc.) — vanilla JS only **until the planned React migration**
- **Scope creep check**: if a prompt says "no other changes", do not refactor adjacent code even if it looks messy
- **Never merge `multi-income` to `main`** without explicit user approval and testing

### Single-file bracket complexity
At ~6,300 lines, bracket/paren mismatches are the #1 source of bugs. Critical rules:
- **Always verify with `node -e "new Function(code)"`** — the VS Code TypeScript language server gives false-positive errors on JavaScript inside HTML files. Node.js is the ground truth.
- **Wrap-and-close in one edit** — never open a new `[` or `El(` wrapper without closing it in the same edit. Partial states cause cascading mismatches.
- **DOM reordering requires a comprehensive replacement** — you cannot incrementally add wrapper divs to reorder elements. The entire affected block must be replaced at once.
- **String content fools naive bracket counters** — `"linear-gradient(135deg,..."` contains `(` and `)` that will throw off simple depth scanners. Use `new Function(code)` for ground truth.
- **Layout restructuring is high-risk** — changing the structural order of cards should be deferred to the React + JSX migration, where the tree structure is visible and safe.

---

## Known Issues / Decisions Log

- Crypto/speculative assets belong under Invest (not Savings)
- localStorage is one browser-clear away from data loss — export/import is the current mitigation
- Profile completeness card may not show if `compound_profile_done` is already set — clear via DevTools → Application → Local Storage
- Essentials default to $0 — previously defaulted to Miami averages, removed as confusing
- Legacy detailed-mode fields (`healthInsurance`, `fsa`, `otherPreTax`, `federalTax`, `stateTax`) still exist in data model and are used as fallback in net calculation when `taxesPerPaycheck` is not set
- Expenses tab: Essentials and Debt Obligations are stacked vertically (not side-by-side as intended). Side-by-side layout requires a DOM reorder that is unsafe at this file size — deferred to React migration.
- Suggested Next Steps removed from Overview — to be redesigned with better, more contextual logic before re-adding

---

## Future Roadmap

### Top priority — React migration
**Migrate to Vite + React + JSX.** This is the prerequisite for everything below it. The single-file El() approach is at its limit. See the warning at the top of this file.

### After migration
- **Side-by-side Expenses layout** (Essentials left, Debt right) — currently unsafe to implement
- **Suggested Next Steps redesign** — removed from Overview; needs rethinking with better contextual logic
- **Per-W2-source retirement projection** in Invest & Retire tab
- **Age-based retirement benchmarks** (1× salary by 30, 3× by 40, etc.)
- **Quick Start dual-income question** — ask upfront if household has two earners, initialize two sources
- Mobile layout optimization
- Inflation-adjusted retirement projections
- Zip code-based essentials pre-population
