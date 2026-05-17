# Compound — Personal Finance App

## Project Purpose

Compound is a personal finance web app designed to help people — especially beginners — understand their financial health and take action toward debt payoff, savings goals, and retirement. The primary audience is someone early in their financial journey: they may carry significant consumer debt, have limited savings, and lack financial literacy vocabulary.

The app runs entirely client-side as a **single `index.html` file** with localStorage persistence. There is no backend, no login, no cloud sync.

---

## Core Philosophy

1. **Meet beginners where they are** — Avoid jargon. Every metric should have a plain-English label or tooltip (e.g., "DTI — how much of your paycheck goes to debt. Under 36% is healthy").
2. **Show the user what to do next** — The app doesn't just display data; it guides action via a Suggested Next Steps section on the Overview tab.
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
- **No frameworks**: Vanilla JS (no React, no build step) — React is loaded via CDN
- **Dark theme**: Consistent dark card styling throughout
- **Default debt strategy**: Avalanche (highest interest rate first)
- **Branches**:
  - `main` — stable, deployed
  - `multi-income` — in-progress multi-income source refactor (do not merge until tested)

---

## Data Model

```js
data = {
  income: {
    sources: [
      {
        id: "primary",           // "primary" for first source, "src-TIMESTAMP" for others
        name: "Person 1",        // editable by user
        type: "w2",              // "w2" | "other"
        // W2 fields:
        mode: "simple",          // "simple" | "detailed"
        annualSalary: "",
        takeHomePerPaycheck: "",
        frequency: "biweekly",
        grossPerPaycheck: "",    // detailed mode
        healthInsurance: "",     // detailed mode, per paycheck
        fsa: "",
        otherPreTax: "",
        federalTax: "",
        stateTax: "",
        otherPostTax: "",
        retirement: {            // W2 sources only — per-person
          use401kPercent: true,
          traditional401kPct: "",
          roth401kPct: "",
          employerMatchPct: "",
          traditional401kDollar: "",
          roth401kDollar: "",
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
  debts: [],                     // { id, name, balance, rate, minPayment, planPayment, isMortgage, isPromo, ... }
  budget: {
    essentials: [],              // { id, name, baseline, plan }
    discretionary: []            // { id, name, baseline, plan }
  },
  retirement: {
    hsa: { monthly: "", currentBalance: "", familyCoverage: false }  // household-level only
  },
  savings: {
    emergencyFund: { current: "", goal: "", monthly: "" },
    generalSavings: { monthly: "", goal: "" }
  },
  invest: { monthly: "", currentBalance: "", notes: "" },
  settings: { incomeBasis: "gross", debtStrategy: "avalanche" },
  plan: { essentials: {}, discretionary: {}, debtPayments: {}, goals: [] }
}
```

**Migration**: `migrateData(parsed, def)` runs on load and transparently upgrades old flat `income`/`retirement` structure to the new `income.sources[]` format. Never remove this function.

**localStorage key names must never be changed.**

---

## Tab Structure

| Tab | Purpose |
|-----|---------|
| **Overview** | Dashboard: DTI badges, savings rate, housing %, profile completeness card, Suggested Next Steps |
| **Income** | Income sources list (W2 + Other), simple/detailed mode for primary W2 |
| **Expenses** | Essentials + Debt Obligations + Discretionary. Baseline vs Plan columns |
| **Savings** | Emergency fund goal, monthly contribution, general savings buckets |
| **Invest & Retire** | Per-W2-source 401k/Roth IRA + household HSA + brokerage/taxable |
| **Plan** | What-if sandbox: adjust spending, set savings targets, model extra debt payments |
| **Settings** | Debt strategy (Avalanche / Snowball / Custom), income basis, display prefs |

---

## Key Metrics & Calculations

- **Total DTI**: (all debt minimum payments + housing) ÷ gross monthly income
- **Consumer DTI**: (non-housing debt minimum payments) ÷ gross monthly income
- **Housing %**: Housing cost ÷ gross monthly income (target: ≤28%)
- **Savings Rate**: Monthly savings + investments ÷ gross monthly income
- **Debt payoff date**: Calculated using avalanche or snowball strategy based on settings

### Aggregation across income sources
- `grossMonthly` = sum of all W2 source gross + all Other source monthlyNet
- `netMonthly` = sum of all W2 source take-home + all Other source monthlyNet
- `trad401kMonthly`, `roth401kMonthly`, `employerMatch`, `rothIraMonthly` = sums across all W2 sources
- `hsaMonthly` = from household `data.retirement.hsa.monthly`
- `primaryCalc` / `primaryRet` = shorthands for the first W2 source, used in legacy Income tab display

### DTI label convention
- Label is **"Total DTI"** — housing is always included
- **"Consumer DTI"** = debt excluding housing

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

Traffic light applies **only** to Housing % (28% threshold) and Total DTI (36%/20% thresholds). Retirement rate, savings rate, and consumer debt are always blue — shaming someone for 0% retirement when they can't afford to contribute more is counterproductive.

---

## Onboarding

### Quick Start (primary path)
3-question wizard → Overview. Steps:
1. **Income** — Annual salary, take-home, pay frequency
2. **Housing** — Monthly rent/mortgage (neutral language, no 28% judgment)
3. **Debt** — Carousel for multiple debts (Yes/No → name, balance, APR, minimum); deferred sort on blur/Enter
4. **Orientation** — Tab overview with Plan highlighted; then lands on Overview

State: `qs` in `useState`, tracked in `onboard.screen === "quickstart"`.

### Full Setup (6-step tab tour)
Available via `startOnboarding()` but no longer surfaced in the welcome modal. Kept for potential future use.

### Welcome Modal
Options: **Quick Start** (primary) → **Import a backup** → **Skip**. Full Setup removed.

### Profile Completeness Card
Shown on Overview after onboarding, tracks 7 sections:
1. Income entered
2. Housing cost set
3. Essential expenses filled (≥2 non-housing with values)
4. Discretionary spending added
5. Consumer debt logged (or confirmed none)
6. Emergency fund goal set
7. Retirement contributions configured

Each incomplete item has a "Go →" tab link. Dismissed permanently via `localStorage.setItem("compound_profile_done", "1")`.

---

## Debt System

- **Debt colors**: Warm amber gradient computed dynamically via `debtColor(index, total)`. Orange (`#f97316`) = highest priority, soft amber (`#fbbf24`) = lowest. Mortgage always gets neutral `#2a4060`.
- **Sort order**: `sortedDebts` (for Overview) sorts live by strategy. `stableDebts` (for Expenses tab) sorts on blur/Enter only to avoid mid-type jumping — uses `stableSortRef` and `setStableSortVersion`.
- **Editing**: All debt card fields are inline-editable (name, balance, APR, minimum, plan payment).
- **Mortgage**: Always pinned to bottom of debt list regardless of strategy.

---

## Design Conventions

- **Dark card styling**: `background: linear-gradient(145deg, #111c28, #0d1620)`
- **Badge components**: Used for summary metrics at the top of tabs
- **Tooltips**: Badge component supports `tooltip` prop — hover `?` button to show plain-English explanation. Currently on 5 Overview badges (Consumer Debt, Housing %, Total DTI, Retirement Rate, Total Savings Rate).
- **Empty states**: When a value is 0 or unset, show instructional placeholder text — never just "$0"
- **Progress bar**: Shows onboarding completion across tabs

---

## Claude Code Guardrails

The entire app is one file. Enforce these rules on every prompt:

- **Never rename localStorage keys** — changing a key name silently wipes user data on next load
- **Never touch unrelated tabs** — if a prompt is about Expenses, don't modify Income or Overview
- **Never add a build step or external dependencies** — the app is intentionally zero-dependency
- **Never split index.html into multiple files** — single-file is an explicit constraint
- **Preserve all existing data wiring** when moving UI between tabs — only change placement, not structure
- **Don't add frameworks** (React, Vue, Alpine, etc.) — vanilla JS only
- **Scope creep check**: if a prompt says "no other changes", do not refactor adjacent code even if it looks messy
- **Never merge `multi-income` to `main`** without explicit user approval and testing

---

## Known Issues / Decisions Log

- Crypto/speculative assets belong under Invest (not Savings)
- localStorage is one browser-clear away from data loss — export/import is the current mitigation
- Quick Start debt carousel: `currentDebt` index tracked in `qs` state
- Profile completeness card: may not show if `compound_profile_done` key is set in localStorage from a previous dismiss. Clear via DevTools → Application → Local Storage.
- Essentials default to $0 — previously defaulted to Miami averages, removed as confusing

---

## Future Roadmap

- Mobile layout optimization (budget/expenses tab especially)
- Age-based retirement benchmarks (1× salary by 30, 3× by 40, etc.)
- Inflation-adjusted retirement projections
- Cloud sync / account system
- Quick Start: ask if dual-income household upfront; aggregate projection across all W2 source balances
- Per-W2-source retirement projection in Invest & Retire tab
- Zip code-based essentials pre-population
- Migration to Vite + React + JSX (recommended when feature set stabilizes — `El()` syntax is hard to maintain at scale)
