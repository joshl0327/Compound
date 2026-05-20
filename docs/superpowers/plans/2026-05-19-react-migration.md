# React + Vite + TypeScript + Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Compound from a single 6,000-line `index.html` (CDN React + `El()` factory) to a proper Vite + React + TypeScript + Tailwind project with per-tab and card-level component files.

**Architecture:** Big bang migration — scaffold Vite at the repo root, extract pure lib functions first (no React dependencies), define TypeScript types, wire React Context for state, then convert one tab at a time from `index.legacy.html`. The app must be data-compatible with existing users; localStorage keys are invariant.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Vitest, @testing-library/react

---

## El() → JSX Conversion Reference

Every task below converts `El()` calls to JSX. The rule is mechanical:

```tsx
// Before
El("div", { style: { fontSize: 12, color: "#8b9cb5" }, onClick: fn }, [
  El("span", { key: "a" }, "hello")
])

// After
<div className="text-xs text-dim" onClick={fn}>
  <span>hello</span>
</div>
```

Inline style → Tailwind mapping (from tailwind.config.ts tokens):
- `color: "#8b9cb5"` → `text-dim`
- `color: "#4a7fa5"` → `text-subtle`
- `color: "#60a5fa"` → `text-blue`
- `color: "#10b981"` → `text-green`
- `color: "#f97316"` → `text-orange`
- `color: "#ef4444"` → `text-red`
- `color: "#3a5a7a"` → `text-muted`
- `color: "#e8f0f8"` → `text-slate-100`
- `background: "#0a1520"` → `bg-bg`
- `fontSize: 10` → `text-[10px]`
- `fontSize: 11` → `text-[11px]`
- `fontSize: 12` → `text-xs`
- `fontSize: 13` → `text-[13px]`
- `fontSize: 14` → `text-sm`
- `fontSize: 20` → `text-xl`
- `fontSize: 24` → `text-2xl`
- `fontWeight: 700` → `font-bold`
- `fontWeight: 600` → `font-semibold`
- `textTransform: "uppercase"` → `uppercase`
- `letterSpacing: "0.08em"` → `tracking-widest`
- `display: "flex"` → `flex`
- `display: "grid"` → `grid`
- `alignItems: "center"` → `items-center`
- `justifyContent: "center"` → `justify-center`
- `gap: 8` → `gap-2`; `gap: 10` → `gap-2.5`; `gap: 12` → `gap-3`; `gap: 14` → `gap-3.5`
- `marginBottom: 4` → `mb-1`; `8` → `mb-2`; `12` → `mb-3`; `16` → `mb-4`; `20` → `mb-5`
- Card gradient → `className="card"` (defined in index.css @layer components)
- `fontFamily: "'DM Mono'"` → `font-mono`
- `fontFamily: "'Syne'"` → `font-display`
- `position: "relative"` → `relative`; `"absolute"` → `absolute`

For values not in the token table, use Tailwind arbitrary values: `text-[#5a7a9a]`, `bg-[#0f1923]`, etc.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Rename → `index.legacy.html` | Reference during migration |
| `index.html` | Create (Vite) | Vite entry point |
| `vite.config.ts` | Create | Vite + Tailwind config |
| `tailwind.config.ts` | Create | Custom design tokens |
| `tsconfig.json` | Create (Vite) | TypeScript config |
| `package.json` | Create (Vite) | Dependencies |
| `src/main.tsx` | Create | ReactDOM.createRoot |
| `src/App.tsx` | Create | Tab shell + nav |
| `src/index.css` | Create | Tailwind directives |
| `src/types/index.ts` | Create | All TypeScript interfaces |
| `src/lib/format.ts` | Create | fmt, fmtDec, fmtCurrencyInput, fmtShort, stripCommas |
| `src/lib/storage.ts` | Create | STORAGE_KEY, makeDefault, migrateData, constants |
| `src/lib/calculations.ts` | Create | calcPayoff, debtColor, sourceCalcs, derived metrics |
| `src/context/DataContext.tsx` | Create | AppData context + useData hook |
| `src/context/UIContext.tsx` | Create | Tab + UI state + useUI hook |
| `src/components/Input.tsx` | Create | Currency/text input primitive |
| `src/components/Card.tsx` | Create | Gradient card wrapper |
| `src/components/SectionTitle.tsx` | Create | Accent-bar section header |
| `src/components/Badge.tsx` | Create | Metric badge with tooltip |
| `src/components/LineChart.tsx` | Create | SVG retirement projection chart |
| `src/tabs/SettingsTab.tsx` | Create | Settings tab |
| `src/tabs/OverviewTab.tsx` | Create | Overview/dashboard tab |
| `src/tabs/IncomeTab.tsx` | Create | Income tab |
| `src/tabs/ExpensesTab.tsx` | Create | Expenses tab |
| `src/tabs/SavingsTab.tsx` | Create | Savings tab |
| `src/tabs/InvestRetireTab.tsx` | Create | Invest & Retire tab |
| `src/tabs/PlanTab.tsx` | Create | Plan tab |
| `src/features/BudgetRow.tsx` | Create | Budget item row + RowHeader |
| `src/features/DebtCard.tsx` | Create | Non-mortgage debt card |
| `src/features/MortgageCard.tsx` | Create | Mortgage detail card |
| `src/features/IncomeSourceCard.tsx` | Create | W2 + Other income source card |
| `src/features/SavingsCard.tsx` | Create | Emergency/general savings card |
| `src/onboarding/WelcomeModal.tsx` | Create | Welcome screen + import option |
| `src/onboarding/QuickStart.tsx` | Create | 3-step quick start wizard |
| `src/test-setup.ts` | Create | Vitest + testing-library setup |

---

## Task 1: Scaffold Vite Project

**Files:**
- Rename: `index.html` → `index.legacy.html`
- Create: `index.html`, `vite.config.ts`, `tailwind.config.ts`, `package.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`

- [ ] **Step 1: Rename the legacy file**

```bash
cd "c:\Users\joshl\Documents\Projects\Compound"
git mv index.html index.legacy.html
git commit -m "chore: rename index.html to index.legacy.html before Vite scaffold"
```

- [ ] **Step 2: Scaffold Vite**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" — answer **No**. Vite will scaffold without overwriting existing files. If it errors, run:

```bash
npm create vite@latest tmp-vite -- --template react-ts
cp tmp-vite/package.json .
cp tmp-vite/vite.config.ts .
cp tmp-vite/tsconfig.json .
cp tmp-vite/tsconfig.app.json .
cp tmp-vite/tsconfig.node.json .
cp tmp-vite/index.html .
mkdir -p src
cp tmp-vite/src/main.tsx src/
cp tmp-vite/src/vite-env.d.ts src/
rm -rf tmp-vite
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
npm install -D tailwindcss @tailwindcss/vite autoprefixer
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#070e16',
        surface:  '#111c28',
        surface2: '#0d1620',
        border:   '#1a2840',
        blue:     '#60a5fa',
        green:    '#10b981',
        orange:   '#f97316',
        amber:    '#fbbf24',
        red:      '#ef4444',
        muted:    '#3a5a7a',
        subtle:   '#4a7fa5',
        dim:      '#8b9cb5',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 5: Write `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root { @apply min-h-screen bg-bg text-slate-100; margin: 0; padding: 0; }
  * { box-sizing: border-box; }
  input::placeholder { @apply text-muted; }
  button { cursor: pointer; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { @apply bg-[#1e3a5f] rounded; }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
}

@layer components {
  .card {
    @apply bg-gradient-to-br from-surface to-surface2 border border-border rounded-2xl p-5;
  }
}
```

- [ ] **Step 6: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

If `@tailwindcss/vite` is unavailable (check version), use the PostCSS approach instead: add `postcss.config.js` with `{ plugins: { tailwindcss: {}, autoprefixer: {} } }` and remove the tailwindcss import from vite.config.ts.

- [ ] **Step 7: Write `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Write placeholder `src/App.tsx`**

```tsx
import './index.css'

export default function App() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-dim font-mono">Compound — migrating…</p>
    </div>
  )
}
```

- [ ] **Step 9: Update `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: Verify dev server boots**

```bash
npm run dev
```

Expected: browser opens at `http://localhost:5173` showing dark background with "Compound — migrating…" text. No console errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write `src/types/index.ts`**

```ts
export type TabId = 'overview' | 'income' | 'expenses' | 'savings' | 'invest' | 'plan' | 'settings'
export type DebtStrategy = 'avalanche' | 'snowball' | 'custom'
export type IncomeBasis = 'gross' | 'net'
export type IncomeMode = 'simple' | 'detailed'
export type IncomeType = 'w2' | 'other'
export type FrequencyId = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface FrequencyOption {
  id: FrequencyId
  label: string
  short: string
  perYear: number
}

export interface CustomDeduction {
  id: string
  label: string
  amount: string
}

export interface SourceRetirement {
  use401kPercent: boolean
  traditional401kPct: string
  roth401kPct: string
  employerMatchPct: string
  traditional401kDollar: string
  roth401kDollar: string
  traditional401kBalance: string
  roth401kBalance: string
  rothIra: { monthly: string; currentBalance: string }
  currentAge: string
  targetAge: string
}

export interface IncomeSource {
  id: string
  name: string
  type: IncomeType
  // W2 fields
  mode?: IncomeMode
  annualSalary?: string
  takeHomePerPaycheck?: string
  frequency?: FrequencyId
  grossPerPaycheck?: string
  taxesPerPaycheck?: string
  hsaPerPaycheck?: string
  trad401kPaycheck?: string
  roth401kPaycheck?: string
  customPreTax?: CustomDeduction[]
  retirement?: SourceRetirement
  // Legacy detailed fields (fallback in net calculation)
  healthInsurance?: string
  fsa?: string
  otherPreTax?: string
  federalTax?: string
  stateTax?: string
  otherPostTax?: string
  // Other income type
  monthlyNet?: string
}

export interface Debt {
  id: string
  name: string
  balance: string
  rate: string
  minPayment: string
  planPayment?: string
  isMortgage: boolean
  isPromo?: boolean
  promoRate?: string
  promoEndDate?: string
  postPromoRate?: string
  monthlyEscrow?: string
  escrowBalance?: string
  loanStartDate?: string
  loanEndDate?: string
}

export interface BudgetItem {
  id: string
  name: string
  baseline: string
  plan?: string
}

export interface HsaData {
  monthly: string
  currentBalance: string
  familyCoverage: boolean
}

export interface SavingsGoal {
  current: string
  goal: string
  monthly: string
}

export interface GeneralSavings {
  monthly: string
  goal: string
}

export interface PlanGoal {
  id: string
  name: string
  target: string
  monthly: string
}

export interface PlanData {
  essentials: Record<string, string>
  discretionary: Record<string, string>
  debtPayments: Record<string, string>
  savings: { emergencyFund: string; generalSavings: string }
  goals: PlanGoal[]
}

export interface AppData {
  income: { sources: IncomeSource[] }
  debts: Debt[]
  budget: { essentials: BudgetItem[]; discretionary: BudgetItem[] }
  retirement: { hsa: HsaData }
  savings: { emergencyFund: SavingsGoal; generalSavings: GeneralSavings }
  invest: { monthly: string; currentBalance: string; notes: string }
  settings: { incomeBasis: IncomeBasis; debtStrategy: DebtStrategy }
  plan: PlanData
}

// Derived calc result per income source
export interface SourceCalc {
  src: IncomeSource
  gross: number
  net: number
  trad401k: number
  roth401k: number
  match: number
  rothIra: number
  perYear: number
  isSimple: boolean
}

export interface PayoffResult {
  months: number
  totalInterest: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Lib — Format Functions

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/format.test.ts
import { describe, it, expect } from 'vitest'
import { fmt, fmtDec, fmtShort, fmtCurrencyInput, stripCommas } from './format'

describe('fmt', () => {
  it('formats whole dollars with no decimal', () => {
    expect(fmt(1234.56)).toBe('$1,235')
  })
  it('returns $0 for falsy input', () => {
    expect(fmt(0)).toBe('$0')
    expect(fmt(NaN)).toBe('$0')
  })
})

describe('fmtDec', () => {
  it('formats with exactly 2 decimal places', () => {
    expect(fmtDec(1234.5)).toBe('$1,234.50')
  })
})

describe('fmtShort', () => {
  it('abbreviates thousands', () => {
    expect(fmtShort(1500)).toBe('$2k')
  })
  it('abbreviates millions', () => {
    expect(fmtShort(1_500_000)).toBe('$1.5M')
  })
  it('falls back to fmt for small values', () => {
    expect(fmtShort(500)).toBe('$500')
  })
})

describe('fmtCurrencyInput', () => {
  it('adds thousands separator', () => {
    expect(fmtCurrencyInput('1234')).toBe('1,234')
  })
  it('preserves decimal portion', () => {
    expect(fmtCurrencyInput('1234.5')).toBe('1,234.5')
  })
  it('returns empty string for empty input', () => {
    expect(fmtCurrencyInput('')).toBe('')
    expect(fmtCurrencyInput(null as unknown as string)).toBe('')
  })
})

describe('stripCommas', () => {
  it('strips commas', () => {
    expect(stripCommas('1,234')).toBe('1234')
  })
  it('returns empty string for empty input', () => {
    expect(stripCommas('')).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/format.test.ts
```

Expected: FAIL — "Cannot find module './format'"

- [ ] **Step 3: Write `src/lib/format.ts`**

```ts
export function fmt(v: number | string): string {
  const n = parseFloat(v as string) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtDec(v: number | string): string {
  const n = parseFloat(v as string) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function fmtShort(v: number | string): string {
  const n = parseFloat(v as string) || 0
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return fmt(n)
}

export function fmtCurrencyInput(raw: string | null | undefined): string {
  if (raw === '' || raw === null || raw === undefined) return ''
  const cleaned = String(raw).replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length > 1) return intPart + '.' + parts[1]
  return intPart
}

export function stripCommas(v: string | null | undefined): string {
  if (v === '' || v === null || v === undefined) return ''
  return String(v).replace(/,/g, '')
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/format.test.ts
```

Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: extract format utility functions with tests"
```

---

## Task 4: Lib — Storage (makeDefault, migrateData)

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/storage.test.ts
import { describe, it, expect } from 'vitest'
import { makeDefault, migrateData, STORAGE_KEY, FREQ_OPTIONS, ESSENTIAL_DEFAULTS } from './storage'

describe('STORAGE_KEY', () => {
  it('is compound_v4', () => {
    expect(STORAGE_KEY).toBe('compound_v4')
  })
})

describe('makeDefault', () => {
  it('returns one primary W2 income source', () => {
    const d = makeDefault()
    expect(d.income.sources).toHaveLength(1)
    expect(d.income.sources[0].id).toBe('primary')
    expect(d.income.sources[0].type).toBe('w2')
  })
  it('pre-populates essential budget items from ESSENTIAL_DEFAULTS', () => {
    const d = makeDefault()
    expect(d.budget.essentials).toHaveLength(ESSENTIAL_DEFAULTS.length)
    expect(d.budget.essentials[0].id).toBe('housing')
    expect(d.budget.essentials[0].baseline).toBe('0')
  })
  it('has empty debts array', () => {
    expect(makeDefault().debts).toEqual([])
  })
  it('has avalanche as default debt strategy', () => {
    expect(makeDefault().settings.debtStrategy).toBe('avalanche')
  })
})

describe('migrateData', () => {
  it('passes through data that already has income.sources', () => {
    const d = makeDefault()
    const result = migrateData(d, makeDefault())
    expect(result.income.sources[0].id).toBe('primary')
  })

  it('migrates flat income format to sources array', () => {
    const old = {
      income: { annualSalary: '80000', takeHomePerPaycheck: '2500', frequency: 'biweekly' },
      retirement: { traditional401kPct: '6', rothIra: { monthly: '200', currentBalance: '5000' } },
      debts: [],
      budget: { essentials: [], discretionary: [] },
    }
    const result = migrateData(old as any, makeDefault())
    expect(result.income.sources).toHaveLength(1)
    expect(result.income.sources[0].annualSalary).toBe('80000')
    expect(result.income.sources[0].retirement?.traditional401kPct).toBe('6')
    expect(result.income.sources[0].retirement?.rothIra.monthly).toBe('200')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/storage.test.ts
```

Expected: FAIL — "Cannot find module './storage'"

- [ ] **Step 3: Write `src/lib/storage.ts`**

```ts
import type { AppData, IncomeSource, FrequencyOption } from '../types'

export const STORAGE_KEY = 'compound_v4'
export const ONBOARDING_KEY = 'compound_onboarding_done'
export const PROFILE_DONE_KEY = 'compound_profile_done'

export interface EssentialDefault { id: string; name: string; amount: number }

export const ESSENTIAL_DEFAULTS: EssentialDefault[] = [
  { id: 'housing', name: 'Housing', amount: 0 },
  { id: 'groceries', name: 'Groceries', amount: 0 },
  { id: 'utilities', name: 'Utilities', amount: 0 },
  { id: 'transportation', name: 'Transportation', amount: 0 },
  { id: 'car_insurance', name: 'Car Insurance', amount: 0 },
  { id: 'phone', name: 'Phone', amount: 0 },
  { id: 'subscriptions', name: 'Subscriptions', amount: 0 },
]

export const DISC_SUGGESTIONS = [
  { group: 'Dining and Social', items: ['Dining Out', 'Coffee Shops', 'Bars and Nightlife'] },
  { group: 'Personal', items: ['Personal Care', 'Clothing and Shopping', 'Gym and Fitness'] },
  { group: 'Life Admin', items: ['Car Maintenance', 'Medical and Dental', 'Pet Expenses'] },
  { group: 'Entertainment', items: ['Streaming Services', 'Hobbies', 'Travel'] },
]

export const FREQ_OPTIONS: FrequencyOption[] = [
  { id: 'weekly', label: 'Weekly', short: 'week', perYear: 52 },
  { id: 'biweekly', label: 'Biweekly', short: 'biweek', perYear: 26 },
  { id: 'semimonthly', label: 'Semi-monthly', short: 'semi-month', perYear: 24 },
  { id: 'monthly', label: 'Monthly', short: 'month', perYear: 12 },
]

export function makeDefaultW2Source(id: string, name: string): IncomeSource {
  return {
    id, name, type: 'w2', mode: 'simple',
    annualSalary: '', takeHomePerPaycheck: '', frequency: 'biweekly',
    grossPerPaycheck: '', healthInsurance: '', fsa: '', otherPreTax: '',
    federalTax: '', stateTax: '', otherPostTax: '',
    taxesPerPaycheck: '', hsaPerPaycheck: '', trad401kPaycheck: '', roth401kPaycheck: '',
    customPreTax: [],
    retirement: {
      use401kPercent: true,
      traditional401kPct: '', roth401kPct: '', employerMatchPct: '',
      traditional401kDollar: '', roth401kDollar: '',
      traditional401kBalance: '', roth401kBalance: '',
      rothIra: { monthly: '', currentBalance: '' },
      currentAge: '', targetAge: '65',
    },
  }
}

export function makeDefaultOtherSource(id: string, name: string): IncomeSource {
  return { id, name, type: 'other', monthlyNet: '' }
}

export function makeDefault(): AppData {
  return {
    income: { sources: [makeDefaultW2Source('primary', 'Person 1')] },
    debts: [],
    budget: {
      essentials: ESSENTIAL_DEFAULTS.map(e => ({ id: e.id, name: e.name, baseline: String(e.amount), plan: '' })),
      discretionary: [],
    },
    retirement: { hsa: { monthly: '', currentBalance: '', familyCoverage: false } },
    savings: {
      emergencyFund: { current: '', goal: '', monthly: '' },
      generalSavings: { monthly: '', goal: '' },
    },
    invest: { monthly: '', currentBalance: '', notes: '' },
    settings: { incomeBasis: 'gross', debtStrategy: 'avalanche' },
    plan: { essentials: {}, discretionary: {}, debtPayments: {}, savings: { emergencyFund: '', generalSavings: '' }, goals: [] },
  }
}

export function migrateData(parsed: Partial<AppData> & Record<string, unknown>, def: AppData): AppData {
  if (!parsed.income || !(parsed.income as { sources?: unknown }).sources) {
    const old = (parsed.income || {}) as Record<string, string>
    const oldRet = (parsed.retirement || {}) as Record<string, unknown>
    const primary = makeDefaultW2Source('primary', 'Person 1')
    primary.mode = (old.mode as 'simple' | 'detailed') || 'simple'
    primary.annualSalary = old.annualSalary || ''
    primary.takeHomePerPaycheck = old.takeHomePerPaycheck || ''
    primary.frequency = (old.frequency as 'biweekly') || 'biweekly'
    primary.grossPerPaycheck = old.grossPerPaycheck || ''
    primary.healthInsurance = old.healthInsurance || ''
    primary.fsa = old.fsa || ''
    primary.otherPreTax = old.otherPreTax || ''
    primary.federalTax = old.federalTax || ''
    primary.stateTax = old.stateTax || ''
    primary.otherPostTax = old.otherPostTax || ''
    primary.retirement = {
      use401kPercent: oldRet.use401kPercent !== undefined ? Boolean(oldRet.use401kPercent) : true,
      traditional401kPct: String(oldRet.traditional401kPct || ''),
      roth401kPct: String(oldRet.roth401kPct || ''),
      employerMatchPct: String(oldRet.employerMatchPct || ''),
      traditional401kDollar: String(oldRet.traditional401kDollar || ''),
      roth401kDollar: String(oldRet.roth401kDollar || ''),
      traditional401kBalance: String(oldRet.traditional401kBalance || ''),
      roth401kBalance: String(oldRet.roth401kBalance || ''),
      rothIra: (oldRet.rothIra as { monthly: string; currentBalance: string }) || { monthly: '', currentBalance: '' },
      currentAge: String(oldRet.currentAge || ''),
      targetAge: String(oldRet.targetAge || '65'),
    }
    return {
      income: { sources: [primary] },
      debts: (parsed.debts as AppData['debts']) || [],
      budget: (parsed.budget as AppData['budget']) || def.budget,
      retirement: { hsa: (oldRet.hsa as AppData['retirement']['hsa']) || def.retirement.hsa },
      savings: { ...def.savings, ...((parsed.savings as Partial<AppData['savings']>) || {}) },
      invest: { ...def.invest, ...((parsed.invest as Partial<AppData['invest']>) || {}) },
      settings: { ...def.settings, ...((parsed.settings as Partial<AppData['settings']>) || {}) },
      plan: (parsed.plan as AppData['plan']) || def.plan,
    }
  }
  return parsed as AppData
}

export function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return migrateData(parsed, makeDefault())
    }
  } catch {}
  return makeDefault()
}

export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/storage.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: extract storage/migration utilities with tests"
```

---

## Task 5: Lib — Calculations

**Files:**
- Create: `src/lib/calculations.ts`
- Create: `src/lib/calculations.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calcPayoff, debtColor, calcSourceMetrics } from './calculations'
import { makeDefault, FREQ_OPTIONS } from './storage'
import type { IncomeSource } from '../types'

describe('calcPayoff', () => {
  it('returns months and interest for a normal loan', () => {
    const result = calcPayoff('10000', '5', '200')
    expect(result).not.toBeNull()
    expect(result!.months).toBeGreaterThan(0)
    expect(result!.totalInterest).toBeGreaterThan(0)
  })
  it('returns null if payment cannot cover interest', () => {
    expect(calcPayoff('100000', '24', '1')).toBeNull()
  })
  it('returns months 0 for zero balance', () => {
    expect(calcPayoff('0', '5', '200')).toEqual({ months: 0, totalInterest: 0 })
  })
  it('returns null if monthly payment is 0', () => {
    expect(calcPayoff('10000', '5', '0')).toBeNull()
  })
  it('handles zero interest rate', () => {
    const result = calcPayoff('1200', '0', '100')
    expect(result).not.toBeNull()
    expect(result!.months).toBe(12)
    expect(result!.totalInterest).toBe(0)
  })
})

describe('debtColor', () => {
  it('returns orange for first debt', () => {
    expect(debtColor(0, 3)).toBe('#f97316')
  })
  it('returns amber for last debt', () => {
    expect(debtColor(2, 3)).toBe('#fbbf24')
  })
  it('returns orange for single debt', () => {
    expect(debtColor(0, 1)).toBe('#f97316')
  })
})

describe('calcSourceMetrics', () => {
  it('computes gross from annualSalary in simple mode', () => {
    const src: IncomeSource = {
      id: 'primary', name: 'Person 1', type: 'w2', mode: 'simple',
      annualSalary: '120000', takeHomePerPaycheck: '3500', frequency: 'biweekly',
    }
    const result = calcSourceMetrics(src, FREQ_OPTIONS)
    expect(result.gross).toBeCloseTo(10000, 0)
    expect(result.net).toBeCloseTo(3500 * 26 / 12, 0)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/calculations.test.ts
```

Expected: FAIL — "Cannot find module './calculations'"

- [ ] **Step 3: Write `src/lib/calculations.ts`**

```ts
import type { IncomeSource, FrequencyOption, SourceCalc, PayoffResult } from '../types'

export function calcPayoff(
  balance: string | number,
  annualRate: string | number,
  monthlyPayment: string | number,
): PayoffResult | null {
  const b = parseFloat(balance as string) || 0
  const r = (parseFloat(annualRate as string) || 0) / 100 / 12
  const p = parseFloat(monthlyPayment as string) || 0
  if (b <= 0) return { months: 0, totalInterest: 0 }
  if (p <= 0) return null
  if (r === 0) return { months: Math.ceil(b / p), totalInterest: 0 }
  if (p <= b * r) return null
  const months = Math.ceil(Math.log(p / (p - r * b)) / Math.log(1 + r))
  return { months, totalInterest: Math.max(0, p * months - b) }
}

export function debtColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  const r = Math.round(0xf9 + (0xfb - 0xf9) * t)
  const g = Math.round(0x73 + (0xbf - 0x73) * t)
  const b = Math.round(0x16 + (0x24 - 0x16) * t)
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return '#' + hex(r) + hex(g) + hex(b)
}

export function calcSourceMetrics(src: IncomeSource, freqOptions: FrequencyOption[]): SourceCalc {
  if (src.type !== 'w2') {
    const n = parseFloat(src.monthlyNet || '') || 0
    return { src, gross: n, net: n, trad401k: 0, roth401k: 0, match: 0, rothIra: 0, perYear: 12, isSimple: true }
  }
  const fo = freqOptions.find(f => f.id === src.frequency) || freqOptions[1]
  const py = fo.perYear
  const isSimple = src.mode === 'simple'
  const gross = isSimple
    ? (parseFloat(src.annualSalary || '') || 0) / 12
    : (parseFloat(src.grossPerPaycheck || '') || 0) * py / 12
  const ret = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  let trad: number, roth: number, match: number
  if (ret.use401kPercent !== false) {
    trad = gross * (parseFloat(ret.traditional401kPct || '') || 0) / 100
    roth = gross * (parseFloat(ret.roth401kPct || '') || 0) / 100
    match = gross * (parseFloat(ret.employerMatchPct || '') || 0) / 100
  } else {
    trad = parseFloat(ret.traditional401kDollar || '') || 0
    roth = parseFloat(ret.roth401kDollar || '') || 0
    match = gross * (parseFloat(ret.employerMatchPct || '') || 0) / 100
  }
  const rothIra = parseFloat((ret.rothIra || {}).monthly || '') || 0
  let net: number
  if (isSimple) {
    net = (parseFloat(src.takeHomePerPaycheck || '') || 0) * py / 12
  } else {
    const optmo = (parseFloat(src.otherPostTax || '') || 0) * py / 12
    const useNewFields = src.taxesPerPaycheck !== undefined && src.taxesPerPaycheck !== ''
    if (useNewFields) {
      const taxesMo = (parseFloat(src.taxesPerPaycheck || '') || 0) * py / 12
      const hsaMo = (parseFloat(src.hsaPerPaycheck || '') || 0) * py / 12
      const customMo = (src.customPreTax || []).reduce((s, d) => s + (parseFloat(d.amount) || 0) * py / 12, 0)
      net = gross - trad - roth - taxesMo - hsaMo - customMo - optmo
    } else {
      const hmo = (parseFloat(src.healthInsurance || '') || 0) * py / 12
      const fmo = (parseFloat(src.fsa || '') || 0) * py / 12
      const opmo = (parseFloat(src.otherPreTax || '') || 0) * py / 12
      const fedmo = (parseFloat(src.federalTax || '') || 0) * py / 12
      const stmo = (parseFloat(src.stateTax || '') || 0) * py / 12
      net = gross - trad - hmo - fmo - opmo - fedmo - stmo - (gross * 0.0765) - roth - optmo
    }
  }
  return { src, gross, net, trad401k: trad, roth401k: roth, match, rothIra, perYear: py, isSimple }
}

export function payoffDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/calculations.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculations.ts src/lib/calculations.test.ts
git commit -m "feat: extract calculation utilities with tests"
```

---

## Task 6: Context Layer

**Files:**
- Create: `src/context/DataContext.tsx`
- Create: `src/context/UIContext.tsx`
- Create: `src/context/DataContext.test.tsx`

- [ ] **Step 1: Write the failing context test**

```tsx
// src/context/DataContext.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DataProvider, useData } from './DataContext'
import { STORAGE_KEY } from '../lib/storage'

function TestConsumer() {
  const { data } = useData()
  return <div data-testid="strategy">{data.settings.debtStrategy}</div>
}

describe('DataContext', () => {
  beforeEach(() => localStorage.clear())

  it('provides default data when localStorage is empty', () => {
    render(<DataProvider><TestConsumer /></DataProvider>)
    expect(screen.getByTestId('strategy').textContent).toBe('avalanche')
  })

  it('persists data to localStorage on setData', () => {
    function Setter() {
      const { setData } = useData()
      return (
        <button onClick={() => setData(d => ({ ...d, settings: { ...d.settings, debtStrategy: 'snowball' } }))}>
          change
        </button>
      )
    }
    render(<DataProvider><Setter /><TestConsumer /></DataProvider>)
    act(() => { screen.getByText('change').click() })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.settings.debtStrategy).toBe('snowball')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/context/DataContext.test.tsx
```

Expected: FAIL — "Cannot find module './DataContext'"

- [ ] **Step 3: Write `src/context/DataContext.tsx`**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AppData } from '../types'
import { makeDefault, migrateData, loadFromStorage, saveToStorage } from '../lib/storage'

interface DataContextValue {
  data: AppData
  setData: (updater: (prev: AppData) => AppData) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(loadFromStorage)

  function setData(updater: (prev: AppData) => AppData) {
    setDataState(prev => {
      const next = updater(prev)
      saveToStorage(next)
      return next
    })
  }

  return <DataContext.Provider value={{ data, setData }}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
```

- [ ] **Step 4: Write `src/context/UIContext.tsx`**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TabId } from '../types'

interface UIContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  importMessage: string
  setImportMessage: (v: string) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  return (
    <UIContext.Provider value={{ activeTab, setActiveTab, showSuggestions, setShowSuggestions, importMessage, setImportMessage }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside UIProvider')
  return ctx
}
```

- [ ] **Step 5: Run context test — expect PASS**

```bash
npx vitest run src/context/DataContext.test.tsx
```

Expected: All 2 tests pass.

- [ ] **Step 6: Wire providers in `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { DataProvider } from './context/DataContext'
import { UIProvider } from './context/UIContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </DataProvider>
  </StrictMode>,
)
```

- [ ] **Step 7: Commit**

```bash
git add src/context/ src/main.tsx
git commit -m "feat: implement DataContext and UIContext"
```

---

## Task 7: Shared Components

**Files:**
- Create: `src/components/Input.tsx`
- Create: `src/components/Card.tsx`
- Create: `src/components/SectionTitle.tsx`
- Create: `src/components/Badge.tsx`
- Create: `src/components/LineChart.tsx`
- Create: `src/components/index.ts`

- [ ] **Step 1: Write `src/components/Input.tsx`**

```tsx
import { fmtCurrencyInput, stripCommas } from '../lib/format'

interface InputProps {
  label?: string
  value: string
  onChange?: (v: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  readOnly?: boolean
  small?: boolean
  highlight?: string
  type?: string
}

export default function Input({ label, value, onChange, prefix, suffix, placeholder, readOnly, small, highlight, type }: InputProps) {
  const isCurrency = prefix === '$'
  const displayValue = isCurrency ? fmtCurrencyInput(value) : value

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!onChange) return
    const raw = isCurrency ? stripCommas(e.target.value) : e.target.value
    onChange(raw)
  }

  return (
    <div className={small ? 'mb-1.5' : 'mb-3'}>
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-1">{label}</div>
      )}
      <div
        className="flex items-center overflow-hidden rounded-lg border"
        style={{
          background: readOnly ? '#060e18' : '#0f1923',
          borderColor: highlight ? highlight + '44' : '#1e2d3d',
        }}
      >
        {prefix && <span className="px-2.5 text-subtle text-[13px] font-semibold">{prefix}</span>}
        <input
          type="text"
          inputMode={isCurrency ? 'decimal' : type === 'number' ? 'decimal' : 'text'}
          value={displayValue}
          readOnly={readOnly}
          onChange={handleChange}
          placeholder={placeholder || '0'}
          className="flex-1 bg-transparent border-none outline-none font-mono text-sm"
          style={{
            padding: small ? '8px 10px' : '10px 12px',
            color: readOnly ? '#5a7a9a' : '#e8f0f8',
            fontSize: small ? 13 : 14,
          }}
        />
        {suffix && <span className="px-2.5 text-subtle text-xs">{suffix}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/Card.tsx`**

```tsx
import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export default function Card({ children, style, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/SectionTitle.tsx`**

```tsx
import type { ReactNode } from 'react'

interface SectionTitleProps {
  children: ReactNode
  accent?: string
}

export default function SectionTitle({ children, accent = '#3b82f6' }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-1 h-5 rounded-sm flex-shrink-0" style={{ background: accent }} />
      <h2 className="m-0 text-[15px] font-bold text-slate-100 font-display">{children}</h2>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/Badge.tsx`**

```tsx
import { useState, type ReactNode } from 'react'

interface BadgeProps {
  label: string
  value: string
  color?: string
  sub?: string
  tooltip?: string
  large?: boolean
}

export default function Badge({ label, value, color = '#3b82f6', sub, tooltip, large }: BadgeProps) {
  const [tipOpen, setTipOpen] = useState(false)
  return (
    <div className="relative bg-[#0a1520] rounded-[10px] p-3.5" style={{ border: `1px solid ${color}22` }}>
      <div className="text-[10px] text-dim tracking-widest uppercase mb-1 flex items-center gap-1">
        {label}
        {tooltip && (
          <button
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            className="rounded-full flex items-center justify-center font-body"
            style={{
              background: 'none', border: '1px solid #2a4060', width: 14, height: 14,
              fontSize: 9, color: tipOpen ? '#60a5fa' : '#4a7fa5', cursor: 'default', padding: 0,
            }}
          >?</button>
        )}
      </div>
      <div className={`${large ? 'text-2xl' : 'text-xl'} font-bold font-mono`} style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-subtle mt-0.5">{sub}</div>}
      {tipOpen && tooltip && (
        <div className="absolute top-full left-0 z-[100] bg-[#0d1e30] border border-[#1e3a5f] rounded-lg p-3 mt-1 text-xs text-dim leading-relaxed w-[220px] pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/LineChart.tsx`**

```tsx
interface DataPoint { age: number; balance: number }

interface LineChartProps {
  data: DataPoint[]
  height?: number
}

export default function LineChart({ data, height: h = 200 }: LineChartProps) {
  const w = 400
  const pad = { t: 10, r: 20, b: 30, l: 55 }
  const chartW = w - pad.l - pad.r
  const chartH = h - pad.t - pad.b

  if (!data || data.length < 2) {
    return <div className="text-muted text-[13px] text-center py-10">Enter your age and target age to see projections</div>
  }

  const maxVal = Math.max(...data.map(d => d.balance)) || 1
  const xStep = chartW / (data.length - 1)
  const points = data.map((d, i) => `${pad.l + i * xStep},${pad.t + chartH - (d.balance / maxVal) * chartH}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {[0, 1, 2, 3, 4].map(i => {
        const v = Math.round((maxVal / 4) * i)
        const y = pad.t + chartH - (v / maxVal) * chartH
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + chartW} y2={y} stroke="#1a2840" strokeWidth={1} strokeDasharray="4 4" />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#5a7a9a">${Math.round(v / 1000)}k</text>
          </g>
        )
      })}
      {data.filter((d, i) => i === 0 || i === data.length - 1 || d.age % 10 === 0).map(d => {
        const idx = data.indexOf(d)
        return <text key={'x' + idx} x={pad.l + idx * xStep} y={h - 6} textAnchor="middle" fontSize={9} fill="#5a7a9a">{d.age}</text>
      })}
      <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={pad.l} cy={pad.t + chartH} r={3} fill="#a78bfa" />
      <circle cx={pad.l + chartW} cy={pad.t + chartH - (data[data.length - 1].balance / maxVal) * chartH} r={4} fill="#a78bfa" />
    </svg>
  )
}
```

- [ ] **Step 6: Write `src/components/index.ts`**

```ts
export { default as Input } from './Input'
export { default as Card } from './Card'
export { default as SectionTitle } from './SectionTitle'
export { default as Badge } from './Badge'
export { default as LineChart } from './LineChart'
```

- [ ] **Step 7: Smoke test — verify components render**

```bash
npm run dev
```

Import `Card` and `Badge` into App.tsx temporarily and verify they render in the browser. Remove after confirming.

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: implement shared UI components (Input, Card, Badge, SectionTitle, LineChart)"
```

---

## Task 8: App Shell + Tab Nav

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `src/App.tsx` tab shell**

```tsx
import { useUI } from './context/UIContext'
import type { TabId } from './types'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'savings', label: 'Savings' },
  { id: 'invest', label: 'Invest & Retire' },
  { id: 'plan', label: 'Plan' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const { activeTab, setActiveTab } = useUI()

  return (
    <div className="min-h-screen bg-bg font-body">
      {/* Tab nav */}
      <div className="sticky top-0 z-50 bg-[#050b12] border-b border-border">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue text-blue'
                  : 'border-transparent text-dim hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-dim text-sm text-center py-8">
          {activeTab} — migrating…
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify nav renders and tab switching works**

```bash
npm run dev
```

Expected: Dark nav bar with 7 tab buttons. Clicking each updates the placeholder text below.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: implement App shell with tab navigation"
```

---

## Task 9: Feature Components

**Files:**
- Create: `src/features/BudgetRow.tsx`
- Create: `src/features/DebtCard.tsx`
- Create: `src/features/MortgageCard.tsx`
- Create: `src/features/IncomeSourceCard.tsx`
- Create: `src/features/SavingsCard.tsx`

These are extracted from sections of `index.legacy.html` during the tab migrations in Tasks 10–16. Write each file when its parent tab is being migrated — the structure below defines what props each component must accept.

- [ ] **Step 1: Write `src/features/BudgetRow.tsx`**

`RowHeader` is a local component inside this file — not exported.

```tsx
import { fmtCurrencyInput, stripCommas } from '../lib/format'

function RowHeader() {
  return (
    <div className="grid gap-2 px-3 mb-1" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
      <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Category</div>
      <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Monthly Amount</div>
      <div />
    </div>
  )
}

interface BudgetRowProps {
  label: string
  baseline: string
  color?: string
  readOnly?: boolean
  onBaselineChange?: (v: string) => void
  onDelete?: () => void
}

export { RowHeader }

export default function BudgetRow({ label, baseline, color = '#3b82f6', readOnly, onBaselineChange, onDelete }: BudgetRowProps) {
  return (
    <div
      className="grid gap-2 items-center px-3 py-2 bg-[#0a1520] rounded-[10px] mb-1.5"
      style={{ gridTemplateColumns: '1fr 1fr auto', borderLeft: `3px solid ${color}` }}
    >
      <div className="text-xs font-semibold text-slate-100 leading-tight">{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={fmtCurrencyInput(baseline)}
        readOnly={readOnly}
        onChange={e => { if (onBaselineChange) onBaselineChange(stripCommas(e.target.value)) }}
        className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono outline-none"
        style={{
          background: readOnly ? '#060e18' : '#0f1923',
          border: '1px solid #1e2d3d',
          color: readOnly ? '#5a7a9a' : '#e8f0f8',
        }}
      />
      <div className="w-6">
        {onDelete && (
          <button onClick={onDelete} className="bg-transparent border-none text-muted text-[15px] p-0.5">x</button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Define `src/features/DebtCard.tsx` interface**

Copy the debt card rendering from `index.legacy.html` (lines ~2462–2700, the non-mortgage debt section). Convert El() to JSX + Tailwind. Props:

```tsx
import type { Debt } from '../types'

interface DebtCardProps {
  debt: Debt
  color: string
  onChange: (updated: Debt) => void
  onDelete: () => void
}
```

Find the debt card block in `index.legacy.html` and convert it following the El()→JSX reference at the top of this document.

- [ ] **Step 3: Define `src/features/MortgageCard.tsx` interface**

Copy the mortgage card rendering from `index.legacy.html`. Props:

```tsx
import type { Debt } from '../types'

interface MortgageCardProps {
  debt: Debt
  onChange: (updated: Debt) => void
  onDelete: () => void
}
```

- [ ] **Step 4: Define `src/features/IncomeSourceCard.tsx` interface**

Copy from income tab W2/Other source rendering (lines ~1808–2460). Props:

```tsx
import type { IncomeSource } from '../types'
import type { FrequencyOption } from '../types'

interface IncomeSourceCardProps {
  source: IncomeSource
  freqOptions: FrequencyOption[]
  isDetailed: boolean
  onChange: (updated: IncomeSource) => void
  onDelete?: () => void  // undefined for primary source
}
```

- [ ] **Step 5: Define `src/features/SavingsCard.tsx` interface**

Copy from savings tab (lines ~3139–3455). Props:

```tsx
interface SavingsCardProps {
  title: string
  current?: string
  goal: string
  monthly: string
  planMonthly?: string
  onCurrentChange?: (v: string) => void
  onGoalChange: (v: string) => void
  onMonthlyChange: (v: string) => void
  onPlanMonthlyChange?: (v: string) => void
  accent: string
}
```

- [ ] **Step 6: Commit stubs**

```bash
git add src/features/
git commit -m "feat: add feature component interfaces and BudgetRow"
```

---

## Task 10: SettingsTab

**Files:**
- Create: `src/tabs/SettingsTab.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Copy settings section from `index.legacy.html` lines 4293–4578**

Open `index.legacy.html`, locate `tab === "settings"` at line 4293. Copy everything until the next `tab ===` block.

- [ ] **Step 2: Write `src/tabs/SettingsTab.tsx`**

Convert the copied block using the El()→JSX reference. The `updateSettings` helper from `index.legacy.html` becomes an inline call to `setData`:

```tsx
import { useData } from '../context/DataContext'
import { Card } from '../components'
import SectionTitle from '../components/SectionTitle'
import type { DebtStrategy, IncomeBasis } from '../types'

const DEBT_STRATEGIES = [
  { id: 'avalanche' as DebtStrategy, label: 'Avalanche (recommended)', desc: 'Minimizes total interest paid. Best for saving the most money overall.' },
  { id: 'snowball' as DebtStrategy, label: 'Snowball', desc: 'Quick wins keep you motivated. Slightly more interest paid but psychologically effective.' },
  { id: 'custom' as DebtStrategy, label: 'Custom', desc: 'Drag to set your own payoff priority in the Plan tab.' },
]

const INCOME_BASES = [
  { id: 'gross' as IncomeBasis, label: 'Gross Income', desc: 'Rates calculated against pre-tax income. Standard for DTI and savings benchmarks.' },
  { id: 'net' as IncomeBasis, label: 'Take-Home (Net)', desc: 'Rates calculated against after-tax income. More conservative view of savings rate.' },
]

export default function SettingsTab() {
  const { data, setData } = useData()

  function updateSetting<K extends keyof typeof data.settings>(key: K, value: typeof data.settings[K]) {
    setData(d => ({ ...d, settings: { ...d.settings, [key]: value } }))
  }

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl">Settings</h1>
      <p className="m-0 mb-5 text-subtle text-[13px]">Adjust how rates are calculated.</p>

      <div className="grid gap-3.5 max-w-[680px]">
        <Card>
          <SectionTitle accent="#f97316">Debt Payoff Strategy</SectionTitle>
          {DEBT_STRATEGIES.map(opt => {
            const sel = data.settings.debtStrategy === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => updateSetting('debtStrategy', opt.id)}
                className="flex gap-3 p-3.5 rounded-[10px] mb-2 cursor-pointer"
                style={{
                  background: sel ? '#1a0e06' : '#0a1520',
                  border: `1px solid ${sel ? '#4a2a0a' : '#1a2840'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? '#f97316' : '#2a4060'}` }}
                >
                  {sel && <div className="w-2 h-2 rounded-full bg-orange" />}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-100 mb-0.5">{opt.label}</div>
                  <div className="text-xs text-dim leading-relaxed">{opt.desc}</div>
                </div>
              </div>
            )
          })}
        </Card>

        <Card>
          <SectionTitle accent="#60a5fa">Income Basis</SectionTitle>
          {INCOME_BASES.map(opt => {
            const sel = data.settings.incomeBasis === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => updateSetting('incomeBasis', opt.id)}
                className="flex gap-3 p-3.5 rounded-[10px] mb-2 cursor-pointer"
                style={{
                  background: sel ? '#071520' : '#0a1520',
                  border: `1px solid ${sel ? '#1a3a5a' : '#1a2840'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? '#60a5fa' : '#2a4060'}` }}
                >
                  {sel && <div className="w-2 h-2 rounded-full bg-blue" />}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-100 mb-0.5">{opt.label}</div>
                  <div className="text-xs text-dim leading-relaxed">{opt.desc}</div>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire SettingsTab into `src/App.tsx`**

```tsx
import SettingsTab from './tabs/SettingsTab'
// inside the tab content div:
{activeTab === 'settings' && <SettingsTab />}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Click Settings tab. Verify both strategy cards and income basis cards render. Click each option and verify the selection highlight updates. Open DevTools → Application → Local Storage → verify `compound_v4` `settings` key updates.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/SettingsTab.tsx src/App.tsx
git commit -m "feat: migrate SettingsTab"
```

---

## Tasks 11–16: Remaining Tabs

For each remaining tab, follow this identical pattern:

1. Locate the tab's section in `index.legacy.html` using the line numbers below
2. Create the tab file in `src/tabs/`
3. Convert El() → JSX + Tailwind using the conversion reference
4. Import `useData` and `useUI` hooks; replace `data`/`setData`/`tab`/`setTab` references
5. Extract any Option B card components into `src/features/` as they appear
6. Wire the tab into `App.tsx`
7. Verify in browser: tab renders, data reads/writes correctly, localStorage persists
8. Commit: `feat: migrate [Tab]Tab`

### Tab line ranges in `index.legacy.html`

| Tab | Start line | End line | Features to extract |
|---|---|---|---|
| Overview | 1565 | 1807 | None (uses Badge, Card) |
| Income | 1808 | 2461 | `IncomeSourceCard` |
| Expenses | 2462 | 3138 | `DebtCard`, `MortgageCard`, `BudgetRow` |
| Savings | 3139 | 3455 | `SavingsCard` |
| Invest & Retire | 3456 | 4092 | None (shares IncomeSourceCard retirement section) |
| Plan | 4579 | 4900 | None (uses DebtCard in read-only mode) |

### Calculations needed in each tab

Each tab needs derived metrics from the income/budget state. Extract these into a custom hook `src/hooks/useMetrics.ts` when you reach the Overview tab (the first tab to need them):

```tsx
// src/hooks/useMetrics.ts
import { useData } from '../context/DataContext'
import { calcSourceMetrics, calcPayoff, debtColor, payoffDate } from '../lib/calculations'
import { FREQ_OPTIONS } from '../lib/storage'

export function useMetrics() {
  const { data } = useData()
  const sources = data.income?.sources || []
  const sourceCalcs = sources.map(src => calcSourceMetrics(src, FREQ_OPTIONS))

  const grossMonthly = sourceCalcs.reduce((s, c) => s + c.gross, 0)
  const netMonthly = sourceCalcs.reduce((s, c) => s + c.net, 0)
  const trad401kMonthly = sourceCalcs.reduce((s, c) => s + c.trad401k, 0)
  const roth401kMonthly = sourceCalcs.reduce((s, c) => s + c.roth401k, 0)
  const employerMatch = sourceCalcs.reduce((s, c) => s + c.match, 0)
  const rothIraMonthly = sourceCalcs.reduce((s, c) => s + c.rothIra, 0)

  let hsaMonthly = parseFloat(data.retirement?.hsa?.monthly || '') || 0
  const hsaFromDetailed = sourceCalcs.reduce((s, c) => {
    if (!c.isSimple && parseFloat(c.src.hsaPerPaycheck || '') > 0)
      return s + (parseFloat(c.src.hsaPerPaycheck || '') || 0) * c.perYear / 12
    return s
  }, 0)
  if (hsaFromDetailed > 0) hsaMonthly = hsaFromDetailed

  const essTotalR = data.budget.essentials.reduce((s, e) => s + (parseFloat(e.baseline) || 0), 0)
  const debtMinTotal = data.debts.reduce((s, d) => s + (!d.isMortgage ? parseFloat(d.minPayment) || 0 : 0), 0)
  const discRealTotal = data.budget.discretionary.reduce((s, d) => s + (parseFloat(d.baseline) || 0), 0)
  const realityTotal = essTotalR + debtMinTotal + discRealTotal
  const planSurplus = netMonthly - realityTotal

  const housingItem = data.budget.essentials.find(e => e.id === 'housing')
  const housingAmt = parseFloat(housingItem ? (housingItem.plan || housingItem.baseline) : '0') || 0
  const housingPct = grossMonthly > 0 ? (housingAmt / grossMonthly * 100).toFixed(1) : '0'

  const consumerDtiTotal = data.debts.reduce((s, d) => s + (!d.isMortgage ? parseFloat(d.minPayment) || 0 : 0), 0)
  const consumerDti = grossMonthly > 0 ? (consumerDtiTotal / grossMonthly * 100).toFixed(1) : '0'
  const dtiTotal = housingAmt + consumerDtiTotal
  const dti = grossMonthly > 0 ? (dtiTotal / grossMonthly * 100).toFixed(1) : '0'

  const efMonthly = parseFloat(data.savings.emergencyFund.monthly) || 0
  const genMonthly = parseFloat(data.savings.generalSavings.monthly) || 0
  const liquidSavingsMonthly = efMonthly + genMonthly
  const investMonthly = parseFloat(data.invest.monthly) || 0
  const totalRetirementMonthly = trad401kMonthly + roth401kMonthly + rothIraMonthly + hsaMonthly + employerMatch
  const totalSavedMonthly = liquidSavingsMonthly + totalRetirementMonthly + investMonthly
  const postTaxSavingsMonthly = liquidSavingsMonthly + rothIraMonthly + investMonthly
  const savingsRate = grossMonthly > 0 ? (totalSavedMonthly / grossMonthly * 100).toFixed(1) : '0'
  const retireRate = grossMonthly > 0 ? (totalRetirementMonthly / grossMonthly * 100).toFixed(1) : '0'

  return {
    sourceCalcs, grossMonthly, netMonthly, trad401kMonthly, roth401kMonthly,
    employerMatch, rothIraMonthly, hsaMonthly, essTotalR, debtMinTotal,
    discRealTotal, realityTotal, planSurplus, housingAmt, housingPct,
    consumerDti, dti, liquidSavingsMonthly, investMonthly,
    totalRetirementMonthly, totalSavedMonthly, postTaxSavingsMonthly,
    savingsRate, retireRate, calcPayoff, debtColor, payoffDate,
  }
}
```

Import `useMetrics` at the top of OverviewTab, InvestRetireTab, and PlanTab.

- [ ] **Task 11: Commit after OverviewTab**

```bash
git add src/tabs/OverviewTab.tsx src/hooks/useMetrics.ts
git commit -m "feat: migrate OverviewTab and useMetrics hook"
```

- [ ] **Task 12: Commit after IncomeTab + IncomeSourceCard**

```bash
git add src/tabs/IncomeTab.tsx src/features/IncomeSourceCard.tsx
git commit -m "feat: migrate IncomeTab and IncomeSourceCard"
```

- [ ] **Task 13: Commit after ExpensesTab + DebtCard + MortgageCard**

```bash
git add src/tabs/ExpensesTab.tsx src/features/DebtCard.tsx src/features/MortgageCard.tsx
git commit -m "feat: migrate ExpensesTab with DebtCard and MortgageCard"
```

- [ ] **Task 14: Commit after SavingsTab + SavingsCard**

```bash
git add src/tabs/SavingsTab.tsx src/features/SavingsCard.tsx
git commit -m "feat: migrate SavingsTab and SavingsCard"
```

- [ ] **Task 15: Commit after InvestRetireTab**

```bash
git add src/tabs/InvestRetireTab.tsx
git commit -m "feat: migrate InvestRetireTab"
```

- [ ] **Task 16: Commit after PlanTab**

```bash
git add src/tabs/PlanTab.tsx
git commit -m "feat: migrate PlanTab"
```

---

## Task 17: Onboarding

**Files:**
- Create: `src/onboarding/WelcomeModal.tsx`
- Create: `src/onboarding/QuickStart.tsx`
- Modify: `src/App.tsx`

The onboarding components manage their own state for the wizard steps. They read/write `compound_onboarding_done` directly (using `ONBOARDING_KEY` from `src/lib/storage.ts`).

- [ ] **Step 1: Copy onboarding section from `index.legacy.html` lines ~708–845**

The welcome modal, Quick Start wizard, and `ONBOARD_STEPS` array all live inside `App()`. Extract them into the two files below.

- [ ] **Step 2: Write `src/onboarding/WelcomeModal.tsx`**

```tsx
import { ONBOARDING_KEY } from '../lib/storage'
import { useUI } from '../context/UIContext'

interface WelcomeModalProps {
  onQuickStart: () => void
  onFullSetup: () => void
  onSkip: () => void
}

export default function WelcomeModal({ onQuickStart, onFullSetup, onSkip }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="card max-w-sm w-full">
        {/* Convert the welcome modal El() block from index.legacy.html */}
        {/* Buttons call onQuickStart, onFullSetup, onSkip */}
      </div>
    </div>
  )
}
```

Convert the full modal body from `index.legacy.html` into the JSX body of this component.

- [ ] **Step 3: Write `src/onboarding/QuickStart.tsx`**

```tsx
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { makeDefault, ONBOARDING_KEY, FREQ_OPTIONS } from '../lib/storage'
import { Input } from '../components'

interface QuickStartProps {
  onComplete: () => void
}

export default function QuickStart({ onComplete }: QuickStartProps) {
  const { setData } = useData()
  const [step, setStep] = useState(0)
  const [salary, setSalary] = useState('')
  const [takeHome, setTakeHome] = useState('')
  const [freq, setFreq] = useState('biweekly')
  const [housing, setHousing] = useState('')
  const [hasDebt, setHasDebt] = useState<boolean | null>(null)
  const [debts, setDebts] = useState([{ name: '', bal: '', rate: '', min: '' }])

  function finish() {
    const d = makeDefault()
    if (salary) d.income.sources[0].annualSalary = salary
    if (takeHome) { d.income.sources[0].takeHomePerPaycheck = takeHome; d.income.sources[0].frequency = freq as 'biweekly' }
    if (housing) {
      d.budget.essentials = d.budget.essentials.map(e =>
        e.id === 'housing' ? { ...e, baseline: housing } : e
      )
    }
    if (hasDebt) {
      d.debts = debts.filter(dt => dt.name).map((dt, i) => ({
        id: 'qs' + i, name: dt.name, balance: dt.bal, rate: dt.rate,
        minPayment: dt.min, isMortgage: false,
      }))
    }
    setData(() => d)
    try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {}
    onComplete()
  }

  // Convert the quick start wizard steps from index.legacy.html
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="card max-w-sm w-full">
        {/* Step 0: Income, Step 1: Housing, Step 2: Debt */}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire onboarding into `src/App.tsx`**

```tsx
import { useState } from 'react'
import WelcomeModal from './onboarding/WelcomeModal'
import QuickStart from './onboarding/QuickStart'
import { ONBOARDING_KEY } from './lib/storage'

// Inside App():
const [onboardScreen, setOnboardScreen] = useState<'welcome' | 'quickstart' | 'done'>(() => {
  try { return localStorage.getItem(ONBOARDING_KEY) ? 'done' : 'welcome' } catch { return 'done' }
})

// Before the return, add modal overlay:
{onboardScreen === 'welcome' && (
  <WelcomeModal
    onQuickStart={() => setOnboardScreen('quickstart')}
    onFullSetup={() => setOnboardScreen('done')}
    onSkip={() => setOnboardScreen('done')}
  />
)}
{onboardScreen === 'quickstart' && (
  <QuickStart onComplete={() => setOnboardScreen('done')} />
)}
```

- [ ] **Step 5: Verify onboarding flow**

```bash
npm run dev
```

Clear localStorage (DevTools → Application → Clear All). Reload. Verify welcome modal appears. Click Quick Start. Complete 3 steps. Verify data loads in Overview tab. Reload — verify onboarding does not show again.

- [ ] **Step 6: Commit**

```bash
git add src/onboarding/ src/App.tsx
git commit -m "feat: migrate onboarding (WelcomeModal + QuickStart)"
```

---

## Task 18: Final Cleanup + Build

**Files:**
- Delete: `index.legacy.html`
- Modify: `claude.md`
- Modify: `.gitignore`

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. Output in `dist/`.

- [ ] **Step 3: Preview production build**

```bash
npm run preview
```

Verify the app loads, all tabs render, localStorage persists through reload, settings update, onboarding shows on fresh localStorage.

- [ ] **Step 4: Add `dist/` to `.gitignore`**

```bash
echo "dist/" >> .gitignore
```

- [ ] **Step 5: Delete legacy file**

```bash
git rm index.legacy.html
```

- [ ] **Step 6: Update `claude.md`**

Replace the Architecture section's "No frameworks" line and the React migration warning block. Update the tech stack table:

```markdown
| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | React Context (DataContext + UIContext) |
| Build | Vite (port 5173), `npm run dev` / `npm run build` |
| Testing | Vitest + @testing-library/react |
```

Remove the "⚠️ Next Major Change" warning block and the Claude Code Guardrails that reference the single-file constraints (bracket complexity, never split files, etc.).

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: complete React + Vite + TS + Tailwind migration; remove legacy single-file app"
```

---

## Self-Review Checklist

- [x] All 8 spec migration steps have tasks
- [x] `STORAGE_KEY = 'compound_v4'` defined once in `lib/storage.ts`, never inlined
- [x] `migrateData` preserved exactly, never removed
- [x] `compound_onboarding_done` and `compound_profile_done` handled via constants
- [x] Currency fields typed as `string` throughout
- [x] Tests written before implementation (TDD) for all lib functions and DataContext
- [x] No TBDs or placeholder text in lib/types/context tasks
- [x] Tab tasks reference exact line numbers in `index.legacy.html`
- [x] `useMetrics` hook defined in full so tabs can import it without re-deriving
- [x] `RowHeader` stays local inside `BudgetRow`, not promoted to shared components
- [x] `debtColor` and `payoffDate` exported from `calculations.ts` and returned from `useMetrics`
