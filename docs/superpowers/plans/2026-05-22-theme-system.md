# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded teal color palette with a CSS custom-property theme system supporting Dark (Warm Charcoal) and Light (Warm Off-White) modes, toggled in Settings, defaulting to system preference.

**Architecture:** CSS custom properties defined on `[data-theme="dark"]` and `[data-theme="light"]` selectors in `index.css`. UIContext holds a `theme` state that applies `data-theme` to `<html>` and persists to localStorage. Tailwind config colors reference `var(--color-X)` so existing Tailwind classes work across themes without component changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Vite, Vitest

---

## Token Mapping Reference

Use this table throughout the migration tasks:

| Old value(s) | New token | Notes |
|---|---|---|
| `#022e2e` | `var(--color-bg)` | Main app background |
| `#043a3a`, `#032e2e`, `rgba(2,35,35,…)`, `rgba(4,58,58,…)`, `#0a1520`, `#0f1923`, `#0d1a2e`, `#111c28` | `var(--color-surface)` | All card/panel/input surfaces |
| `#0a5252`, `#1a2840`, `#1e3a5f`, `#2a4060`, `rgba(13,148,136,0.1…)`, `#0d4a4a` | `var(--color-border)` | All borders and dividers |
| `#0d9488` | `var(--color-accent)` | Interactive teal accent |
| `rgba(13,148,136,0.12)` to `rgba(13,148,136,0.2)` | `var(--color-accent-dim)` | Tinted accent backgrounds |
| `#2e7a7a`, `#3a8a8a`, `#8b9cb5`, `#5a7a9a` | `var(--color-text-muted)` | Secondary/label text |
| `#5aabab`, `#7dd4d4`, `#2a6a6a` | `var(--color-text-dim)` | Tertiary/disabled text |
| `#e8f5f2`, `#e8f0f8`, `#f0faf8`, `#e8e4e0` | `var(--color-text)` | Primary text |
| `rgba(1,16,16,0.94)` | `var(--color-nav)` | Sticky nav bar with blur |
| `#0d3028` | `var(--color-border)` | Scrollbar thumb |

**Do NOT touch these — they are category/data colors:**
`#10b981`, `#94a3b8`, `#38bdf8`, `#f59e0b`, `#f97316`, `#fb923c`, `#f87171`, `#2dd4bf`, `#34d399`, `#3a5a7a`, `#ef4444`, `#0e7490`, `#164e63`, `#155e75`, `#60a5fa`, `#fbbf24`

---

## File Structure

**Create:**
- `src/lib/categoryColors.ts` — exported `CATEGORY_COLORS` constant (extracted from sankeyHelpers)

**Modify:**
- `src/index.css` — add CSS variable blocks, update base styles
- `tailwind.config.ts` — point theme-sensitive colors at CSS variables
- `src/context/UIContext.tsx` — add `theme` / `setTheme`, init from system pref + localStorage
- `src/tabs/SettingsTab.tsx` — add Appearance card with dark/light toggle + update inline colors
- `src/App.tsx` — update hardcoded inline colors
- `src/lib/sankeyHelpers.ts` — import from `categoryColors.ts`, remove `STRUCTURAL` local const
- `src/components/SankeyChart.tsx` — update chrome colors (tooltip, detail panel, text fills)
- `src/components/MilestoneBadges.tsx` — rewrite `ROLE_STYLES` with CSS variables
- `src/components/MilestoneToast.tsx` — update background/border
- `src/components/SectionTitle.tsx` — update tooltip background/border/text
- `src/components/Badge.tsx` — update border/background fallback
- `src/components/LineChart.tsx` — update grid line, tooltip, label colors
- `src/components/DebtTimeline.tsx` — update `btnStyle` colors
- `src/features/BudgetRow.tsx` — update background class
- `src/features/DebtCard.tsx` — update input/card backgrounds
- `src/features/IncomeSourceCard.tsx` — update all hardcoded surface/border classes
- `src/features/MortgageCard.tsx` — update input backgrounds
- `src/features/SavingsCard.tsx` — update backgrounds
- `src/tabs/OverviewTab.tsx` — update KpiCell and section separators
- `src/tabs/ExpensesTab.tsx` — update form panel backgrounds
- `src/tabs/InvestRetireTab.tsx` — update all panel backgrounds
- `src/tabs/PlanTab.tsx` — update row backgrounds
- `src/tabs/SavingsTab.tsx` — update panel backgrounds
- `src/onboarding/WelcomeModal.tsx` — update panel backgrounds/borders
- `src/onboarding/QuickStart.tsx` — update all hardcoded surfaces

---

## Task 1: CSS Variable Foundation + CATEGORY_COLORS

**Files:**
- Create: `src/lib/categoryColors.ts`
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Create `src/lib/categoryColors.ts`**

```ts
export const CATEGORY_COLORS = {
  structural:        '#0e7490',
  incomeW2:          '#164e63',
  incomeOther:       '#155e75',
  retHsa:            '#10b981',
  taxes:             '#94a3b8',
  takehome:          '#38bdf8',
  essentials:        '#f59e0b',
  essentialsFlagged: '#f97316',
  discretionary:     '#fb923c',
  debt:              '#f87171',
  liquidSavings:     '#2dd4bf',
  retirement:        '#34d399',
  remaining:         '#3a5a7a',
  overshoot:         '#ef4444',
} as const
```

- [ ] **Step 2: Write test for CATEGORY_COLORS**

Create `src/lib/categoryColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CATEGORY_COLORS } from './categoryColors'

describe('CATEGORY_COLORS', () => {
  it('has all required category keys', () => {
    const required = [
      'structural', 'incomeW2', 'incomeOther', 'retHsa', 'taxes',
      'takehome', 'essentials', 'essentialsFlagged', 'discretionary',
      'debt', 'liquidSavings', 'retirement', 'remaining', 'overshoot',
    ]
    required.forEach(key => {
      expect(CATEGORY_COLORS).toHaveProperty(key)
      expect(typeof CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]).toBe('string')
    })
  })

  it('values are valid hex colors', () => {
    Object.values(CATEGORY_COLORS).forEach(v => {
      expect(v).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
```

- [ ] **Step 3: Run the test**

```
npm test -- categoryColors
```

Expected: 2 tests pass.

- [ ] **Step 4: Replace `src/index.css` entirely**

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Theme tokens ─────────────────────────────────── */
[data-theme="dark"] {
  --color-bg:           #1d1b18;
  --color-surface:      #252220;
  --color-surface-2:    #2a2724;
  --color-border:       #342f2a;
  --color-text:         #e8e4e0;
  --color-text-muted:   #8a8078;
  --color-text-dim:     #5a5450;
  --color-accent:       #0d9488;
  --color-accent-dim:   rgba(13, 148, 136, 0.12);
  --color-nav:          rgba(24, 22, 20, 0.94);
}

[data-theme="light"] {
  --color-bg:           #f2f0ec;
  --color-surface:      #faf9f7;
  --color-surface-2:    #ffffff;
  --color-border:       #ddd9d4;
  --color-text:         #18140f;
  --color-text-muted:   #6b6560;
  --color-text-dim:     #9a9590;
  --color-accent:       #0a7a70;
  --color-accent-dim:   rgba(10, 122, 112, 0.10);
  --color-nav:          rgba(238, 236, 232, 0.94);
}

@layer base {
  html, body, #root {
    @apply min-h-screen;
    background: var(--color-bg);
    color: var(--color-text);
    margin: 0;
    padding: 0;
  }
  * { box-sizing: border-box; }
  input::placeholder { color: var(--color-text-muted); }
  button { cursor: pointer; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 9999px; }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
}

@layer components {
  .card {
    @apply p-5;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }
}

.expenses-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 768px) {
  .expenses-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Update `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        border:   'var(--color-border)',
        accent:   'var(--color-accent)',
        blue:     '#60a5fa',
        green:    '#10b981',
        orange:   '#f97316',
        amber:    '#fbbf24',
        red:      '#ef4444',
        muted:    'var(--color-text-muted)',
        subtle:   'var(--color-text-muted)',
        dim:      'var(--color-text-dim)',
      },
      fontFamily: {
        display: ['IBM Plex Sans', 'sans-serif'],
        body:    ['IBM Plex Sans', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/categoryColors.ts src/lib/categoryColors.test.ts src/index.css tailwind.config.ts
git commit -m "feat: add CSS variable theme tokens and CATEGORY_COLORS constant"
```

---

## Task 2: Theme State in UIContext

**Files:**
- Modify: `src/context/UIContext.tsx`
- Create: `src/context/UIContext.test.tsx`

- [ ] **Step 1: Write failing tests for theme resolution**

Create `src/context/UIContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { UIProvider, useUI } from './UIContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UIProvider>{children}</UIProvider>
)

describe('resolveInitialTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('returns stored theme from localStorage', () => {
    localStorage.setItem('compound-theme', 'light')
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('returns dark when system preference is dark and no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('returns light when system preference is light and no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('setTheme updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useUI(), { wrapper })
    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('compound-theme')).toBe('light')
  })

  it('setTheme applies data-theme attribute to html element', () => {
    const { result } = renderHook(() => useUI(), { wrapper })
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- UIContext
```

Expected: 5 failures (useUI has no `theme` property yet).

- [ ] **Step 3: Update `src/context/UIContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { TabId } from '../types'

type Theme = 'dark' | 'light'

interface UIContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  importMessage: string
  setImportMessage: (v: string) => void
  theme: Theme
  setTheme: (t: Theme) => void
}

function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('compound-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {}
  return 'dark'
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  function setTheme(t: Theme) {
    setThemeState(t)
    try { localStorage.setItem('compound-theme', t) } catch {}
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <UIContext.Provider value={{
      activeTab, setActiveTab,
      showSuggestions, setShowSuggestions,
      importMessage, setImportMessage,
      theme, setTheme,
    }}>
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

- [ ] **Step 4: Run tests to confirm they pass**

```
npm test -- UIContext
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/context/UIContext.tsx src/context/UIContext.test.tsx
git commit -m "feat: add theme state to UIContext with system-preference init and localStorage persistence"
```

---

## Task 3: Theme Toggle in Settings Tab

**Files:**
- Modify: `src/tabs/SettingsTab.tsx`

- [ ] **Step 1: Add the Appearance card to SettingsTab**

Add `import { useUI } from '../context/UIContext'` to the top of the file, then insert a new Card at the **top** of the `<div className="grid gap-3.5 max-w-[680px]">` — before the Debt Payoff Strategy card:

```tsx
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import type { DebtStrategy, IncomeBasis } from '../types'
```

New card (insert before the Debt Payoff Strategy card):

```tsx
<Card>
  <SectionTitle accent="var(--color-accent)">Appearance</SectionTitle>
  <div className="flex items-center justify-between">
    <div>
      <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>Theme</div>
      <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Defaults to your system preference</div>
    </div>
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
    >
      {(['dark', 'light'] as const).map(t => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className="px-4 py-1.5 text-[12px] font-semibold capitalize transition-colors"
          style={{
            background: theme === t ? 'var(--color-accent-dim)' : 'transparent',
            color: theme === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
            border: 'none',
            borderRight: t === 'dark' ? '1px solid var(--color-border)' : 'none',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  </div>
</Card>
```

Add `const { theme, setTheme } = useUI()` inside the `SettingsTab` function body alongside `const { data, setData } = useData()`.

- [ ] **Step 2: Update existing inline colors in SettingsTab**

In the Debt Payoff Strategy card option rows, replace:
```tsx
style={{
  background: sel ? '#1a0e06' : '#0a1520',
  border: `1px solid ${sel ? '#4a2a0a' : '#1a2840'}`,
}}
```
with:
```tsx
style={{
  background: sel ? 'var(--color-surface-2)' : 'var(--color-surface)',
  border: `1px solid ${sel ? '#f97316' : 'var(--color-border)'}`,
}}
```

Replace the radio dot border:
```tsx
style={{ border: `2px solid ${sel ? '#f97316' : '#2a4060'}` }}
```
with:
```tsx
style={{ border: `2px solid ${sel ? '#f97316' : 'var(--color-border)'}` }}
```

In the Income Basis card option rows, replace:
```tsx
style={{
  background: sel ? '#050f14' : '#0a1520',
  border: `1px solid ${sel ? '#0e374a' : '#1a2840'}`,
}}
```
with:
```tsx
style={{
  background: sel ? 'var(--color-surface-2)' : 'var(--color-surface)',
  border: `1px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}`,
}}
```

Replace the Income Basis radio dot border:
```tsx
style={{ border: `2px solid ${sel ? '#0e7490' : '#2a4060'}` }}
```
with:
```tsx
style={{ border: `2px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}` }}
```

Replace the Income Basis radio dot fill:
```tsx
<div className="w-2 h-2 rounded-full" style={{ background: '#0e7490' }} />
```
with:
```tsx
<div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
```

Replace the Privacy info block:
```tsx
<div className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: '#0a1520', border: '1px solid #1a2840', color: '#8b9cb5' }}>
```
with:
```tsx
<div className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
```

Replace the Privacy accent text:
```tsx
<p className="m-0 mb-2 text-[13px] font-semibold" style={{ color: '#0e7490' }}>
```
with:
```tsx
<p className="m-0 mb-2 text-[13px] font-semibold" style={{ color: 'var(--color-accent)' }}>
```

Replace the Guided Tour button:
```tsx
style={{ background: 'none', border: '1px solid #4a7fa5', color: '#4a7fa5' }}
```
with:
```tsx
style={{ background: 'none', border: '1px solid var(--color-text-muted)', color: 'var(--color-text-muted)' }}
```

- [ ] **Step 3: Run the dev server and verify the toggle works**

```
npm run dev
```

Open http://localhost:5173 → go to Settings tab → toggle Dark/Light → verify background switches between warm charcoal and warm off-white. Check that selecting a Debt Strategy or Income Basis option still shows selection state.

- [ ] **Step 4: Commit**

```bash
git add src/tabs/SettingsTab.tsx
git commit -m "feat: add theme toggle to Settings and tokenize SettingsTab inline colors"
```

---

## Task 4: Migrate App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update all hardcoded inline colors in App.tsx**

Replace the outer wrapper background:
```tsx
style={{ background: '#022e2e' }}
```
with:
```tsx
style={{ background: 'var(--color-bg)' }}
```

Replace the sticky nav bar:
```tsx
style={{ background: 'rgba(1,16,16,0.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
```
with:
```tsx
style={{ background: 'var(--color-nav)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
```

Replace the active tab color:
```tsx
borderBottomColor: activeTab === t.id ? '#0d9488' : 'transparent',
color: activeTab === t.id ? '#0d9488' : '#5aabab',
```
with:
```tsx
borderBottomColor: activeTab === t.id ? 'var(--color-accent)' : 'transparent',
color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
```

Replace the Export/Import button colors:
```tsx
style={{ color: '#2e7a7a', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
onMouseEnter={e => (e.currentTarget.style.color = '#5aabab')}
onMouseLeave={e => (e.currentTarget.style.color = '#2e7a7a')}
```
with (for both Export and Import buttons):
```tsx
style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`. Verify the nav bar transitions correctly when toggling the theme in Settings. Active tab underline and text should switch between teal variants.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: tokenize App.tsx chrome colors"
```

---

## Task 5: Migrate sankeyHelpers.ts to CATEGORY_COLORS

**Files:**
- Modify: `src/lib/sankeyHelpers.ts`

- [ ] **Step 1: Replace hardcoded colors in sankeyHelpers.ts**

Add the import at the top:
```ts
import type { SourceCalc } from '../types'
import { CATEGORY_COLORS } from './categoryColors'
```

Remove the local `STRUCTURAL` constant (line 48):
```ts
const STRUCTURAL = '#0e7490'   // DELETE THIS LINE
```

Replace all hardcoded color values with `CATEGORY_COLORS` references. Find and replace each of these:

| Old value | Replace with |
|---|---|
| `'#0e7490'` (was `STRUCTURAL`) | `CATEGORY_COLORS.structural` |
| `'#164e63'` | `CATEGORY_COLORS.incomeW2` |
| `'#155e75'` | `CATEGORY_COLORS.incomeOther` |
| `'#10b981'` (ret-hsa node + link) | `CATEGORY_COLORS.retHsa` |
| `'#94a3b8'` (taxes) | `CATEGORY_COLORS.taxes` |
| `'#38bdf8'` (takehome) | `CATEGORY_COLORS.takehome` |
| `housingFlagged ? '#f97316' : '#f59e0b'` | `housingFlagged ? CATEGORY_COLORS.essentialsFlagged : CATEGORY_COLORS.essentials` |
| `'#fb923c'` (discretionary) | `CATEGORY_COLORS.discretionary` |
| `'#f87171'` (debt) | `CATEGORY_COLORS.debt` |
| `'#2dd4bf'` (liquid-savings) | `CATEGORY_COLORS.liquidSavings` |
| `'#34d399'` (retirement) | `CATEGORY_COLORS.retirement` |
| `'#3a5a7a'` (remaining) | `CATEGORY_COLORS.remaining` |
| `'#ef4444'` (overshoot) | `CATEGORY_COLORS.overshoot` |

- [ ] **Step 2: Run existing sankeyHelpers tests**

```
npm test -- sankeyHelpers
```

Expected: all existing tests pass. (No new tests needed — the behavior is unchanged; we're only swapping literal strings for named constants.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/sankeyHelpers.ts
git commit -m "refactor: replace sankeyHelpers hardcoded hex with CATEGORY_COLORS references"
```

---

## Task 6: Migrate SankeyChart.tsx Chrome

**Files:**
- Modify: `src/components/SankeyChart.tsx`

These changes target **only the UI chrome** — not the node/ribbon colors which come from `CATEGORY_COLORS` via `sankeyHelpers`.

- [ ] **Step 1: Update empty-state text color (line ~123)**

```tsx
// Before:
style={{ color: '#2e7a7a' }}
// After:
style={{ color: 'var(--color-text-muted)' }}
```

- [ ] **Step 2: Update `fill` for take-home label text (line ~274)**

```tsx
// Before:
fill="#38bdf8"   // TAKE-HOME label
// After:
fill={CATEGORY_COLORS.takehome}
```

```tsx
// Before (both amount text fills showing #e8f0f8):
fill="#e8f0f8"
// After (all primary text fills in SVG):
fill="var(--color-text)"
```

- [ ] **Step 3: Update GROSS INCOME label text (line ~257)**

```tsx
// Before:
fill="#2e7a7a"  // "GROSS INCOME" label
// After:
fill="var(--color-text-muted)"
```

- [ ] **Step 4: Update outer node label text fills (lines ~291, ~308)**

Both side-label `fill` attributes on node labels currently use `sn.color` (kept as-is — those are category colors). The amount text below them currently uses `#e8f0f8`:

```tsx
// Before (amount text under labels):
fill="#e8f0f8"
// After:
fill="var(--color-text)"
```

- [ ] **Step 5: Update tooltip div (line ~334)**

```tsx
// Before:
background: 'rgba(3,42,42,0.96)',
border: '1px solid #0a5252',
color: '#e8f5f2',
// After:
background: 'var(--color-surface)',
border: '1px solid var(--color-border)',
color: 'var(--color-text)',
```

- [ ] **Step 6: Update detail panel (line ~452)**

```tsx
// Before:
<div className="p-4" style={{ background: '#032e2e', border: '1px solid #0a5252', borderRadius: 5 }}>
// After:
<div className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5 }}>
```

```tsx
// Before (detail panel title):
style={{ color: '#0d9488' }}
// After:
style={{ color: 'var(--color-accent)' }}
```

```tsx
// Before (close button):
style={{ color: '#2e7a7a', ... }}
// After:
style={{ color: 'var(--color-text-muted)', ... }}
```

```tsx
// Before (empty state):
style={{ color: '#2e7a7a' }}
// After:
style={{ color: 'var(--color-text-muted)' }}
```

```tsx
// Before (item name):
style={{ color: '#5aabab' }}
// After:
style={{ color: 'var(--color-text-dim)' }}
```

```tsx
// Before (item amount):
style={{ color: '#e8f5f2' }}
// After:
style={{ color: 'var(--color-text)' }}
```

```tsx
// Before (balance text):
style={{ color: '#2e7a7a' }}
// After:
style={{ color: 'var(--color-text-muted)' }}
```

```tsx
// Before (progress bar track):
style={{ height: 3, background: '#0a3838', ... }}
// After:
style={{ height: 3, background: 'var(--color-border)', ... }}
```

```tsx
// Before (progress bar fill):
background: '#0d9488',
// After:
background: 'var(--color-accent)',
```

- [ ] **Step 7: Verify Sankey renders correctly in both themes**

Run `npm run dev`. Toggle dark/light in Settings. Verify:
- Sankey ribbon colors remain the same in both themes (category colors unchanged)
- Tooltip and detail panel background switch themes
- Text labels inside SVG are legible in both themes

- [ ] **Step 8: Commit**

```bash
git add src/components/SankeyChart.tsx
git commit -m "feat: tokenize SankeyChart chrome colors, preserve CATEGORY_COLORS ribbon fills"
```

---

## Task 7: Migrate Shared Components

**Files:**
- Modify: `src/components/MilestoneBadges.tsx`
- Modify: `src/components/MilestoneToast.tsx`
- Modify: `src/components/SectionTitle.tsx`
- Modify: `src/components/Badge.tsx`
- Modify: `src/components/LineChart.tsx`

- [ ] **Step 1: Rewrite `ROLE_STYLES` in MilestoneBadges.tsx**

Replace the entire `ROLE_STYLES` constant:

```ts
const ROLE_STYLES: Record<PillRole, CSSProperties> = {
  'dim-earned':    { background: 'var(--color-accent-dim)',  color: 'var(--color-text-dim)',   border: 'none', fontWeight: 600, opacity: 0.7 },
  'latest-earned': { background: 'var(--color-accent)',      color: '#fff',                    border: 'none', fontWeight: 700, boxShadow: '0 0 6px var(--color-accent-dim)' },
  'next-up':       { background: 'var(--color-surface)',     color: 'var(--color-accent)',     border: '1px solid var(--color-accent)',      fontWeight: 600 },
  'on-track':      { background: 'var(--color-surface)',     color: 'var(--color-text-muted)', border: '1px dashed var(--color-accent)',     fontWeight: 400 },
  'faded-next':    { background: 'var(--color-surface)',     color: 'var(--color-text-dim)',   border: '1px dashed var(--color-border)',     fontWeight: 400 },
  'faded-future':  { background: 'var(--color-surface)',     color: 'var(--color-text-dim)',   border: '1px dashed var(--color-border)',     fontWeight: 400 },
}
```

- [ ] **Step 2: Update MilestoneToast.tsx**

```tsx
// Before:
background: '#043a3a',
border: '1px solid rgba(13,148,136,0.5)',
// After:
background: 'var(--color-surface)',
border: '1px solid var(--color-accent)',
```

```tsx
// Before (label text):
color: '#2e7a7a',
// After:
color: 'var(--color-text-muted)',
```

(The milestone name `color: '#34d399'` is `CATEGORY_COLORS.retirement` — do NOT change it. It is intentional and theme-independent.)

- [ ] **Step 3: Update SectionTitle.tsx**

```tsx
// Before (heading text):
style={{ color: '#7dd4d4' }}
// After:
style={{ color: 'var(--color-text-muted)' }}
```

```tsx
// Before (hint button):
border: '1px solid #2e7a7a55'
color: tip ? '#5aabab' : '#2e7a7a88'
// After:
border: '1px solid var(--color-border)'
color: tip ? 'var(--color-text-muted)' : 'var(--color-text-dim)'
```

```tsx
// Before (tooltip div):
background: '#032e2e', border: '1px solid rgba(13,148,136,0.25)', color: '#5aabab'
// After:
background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)'
```

- [ ] **Step 4: Update Badge.tsx**

```tsx
// Before:
border: tint ? `1px solid ${color}22` : '1px solid #1a2840',
background: tint ? `linear-gradient(135deg, ${color}14, ${color}07)` : '#0a1520',
// After:
border: tint ? `1px solid ${color}22` : '1px solid var(--color-border)',
background: tint ? `linear-gradient(135deg, ${color}14, ${color}07)` : 'var(--color-surface)',
```

- [ ] **Step 5: Update LineChart.tsx**

```tsx
// Before (grid lines):
stroke="#1a2840"
// After:
stroke="var(--color-border)"
```

```tsx
// Before (hover line):
stroke="#5aabab" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 3"
// After:
stroke="var(--color-text-dim)" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 3"
```

```tsx
// Before (hover dot stroke):
stroke="#022e2e"
// After:
stroke="var(--color-bg)"
```

```tsx
// Before (tooltip box):
fill="#032e2e" stroke="rgba(13,148,136,0.3)"
// After:
fill="var(--color-surface)" stroke="var(--color-border)"
```

```tsx
// Before (tooltip label text):
fontSize={8} fill="#2e7a7a"
// After:
fontSize={8} fill="var(--color-text-muted)"
```

- [ ] **Step 6: Verify milestone badges and toast render in both themes**

Run `npm run dev`. Load enough data to show milestones on the Overview tab. Toggle theme and verify badge pill styles switch correctly.

- [ ] **Step 7: Commit**

```bash
git add src/components/MilestoneBadges.tsx src/components/MilestoneToast.tsx src/components/SectionTitle.tsx src/components/Badge.tsx src/components/LineChart.tsx
git commit -m "feat: tokenize shared component chrome colors"
```

---

## Task 8: Migrate DebtTimeline.tsx

**Files:**
- Modify: `src/components/DebtTimeline.tsx`

- [ ] **Step 1: Update `btnStyle` function**

Find the `btnStyle` function (around line 230):

```tsx
// Before:
return {
  fontSize: 9, fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  padding: '2px 8px', borderRadius: 3, cursor: disabled ? 'default' : 'pointer' as const,
  background: isActive ? 'rgba(13,148,136,0.18)' : 'none',
  border: `1px solid ${isActive ? '#0d9488' : 'rgba(13,148,136,0.2)'}`,
  color: isActive ? '#5aabab' : disabled ? '#1a3a3a' : '#2e7a7a',
  opacity: disabled ? 0.4 : 1,
}
// After:
return {
  fontSize: 9, fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  padding: '2px 8px', borderRadius: 3, cursor: disabled ? 'default' : 'pointer' as const,
  background: isActive ? 'var(--color-accent-dim)' : 'none',
  border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
  color: isActive ? 'var(--color-text-muted)' : disabled ? 'var(--color-border)' : 'var(--color-text-dim)',
  opacity: disabled ? 0.4 : 1,
}
```

- [ ] **Step 2: Search for any remaining hardcoded theme colors in DebtTimeline**

```
grep -n "#022e2e\|#043a3a\|#032e2e\|#0a5252\|#2e7a7a\|#5aabab\|#0d9488\|#0a1520\|#1a2840\|rgba(13,148" src/components/DebtTimeline.tsx
```

Apply the token mapping table to any remaining matches.

- [ ] **Step 3: Commit**

```bash
git add src/components/DebtTimeline.tsx
git commit -m "feat: tokenize DebtTimeline chrome colors"
```

---

## Task 9: Migrate Feature Cards

**Files:**
- Modify: `src/features/BudgetRow.tsx`
- Modify: `src/features/DebtCard.tsx`
- Modify: `src/features/IncomeSourceCard.tsx`
- Modify: `src/features/MortgageCard.tsx`
- Modify: `src/features/SavingsCard.tsx`

- [ ] **Step 1: Update BudgetRow.tsx**

```tsx
// Before:
className="grid gap-2 items-center px-3 py-2 bg-[#0a1520] rounded-[10px] mb-1.5"
// After:
className="grid gap-2 items-center px-3 py-2 bg-surface rounded-[10px] mb-1.5"
```

- [ ] **Step 2: Update DebtCard.tsx**

```tsx
// Before (card wrapper, line ~58):
style={{ background: '#0a1520', borderLeft: `3px solid ${color}` }}
// After:
style={{ background: 'var(--color-surface)', borderLeft: `3px solid ${color}` }}
```

```tsx
// Before (input fields, lines ~228, ~238):
style={{ background: '#0a1520', borderColor: '#2a4060', color: '#e8f0f8' }}
// After:
style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
```

- [ ] **Step 3: Update IncomeSourceCard.tsx**

Replace all Tailwind hardcoded background/border classes:

```tsx
// Before: className="... border-b border-[#1a2840] ..."
// After:  className="... border-b border-border ..."

// Before: className="bg-[#111c28] border border-[#1a2840] ..."
// After:  className="bg-surface border border-border ..."

// Before: className="flex items-center bg-[#0a1520] border border-[#1e3a5f] ..."
// After:  className="flex items-center bg-surface border border-border ..."

// Before: className="flex bg-[#0a1520] rounded-[10px] p-[3px] border border-[#1a2840] ..."
// After:  className="flex bg-surface rounded-[10px] p-[3px] border border-border ..."

// Before: className="bg-[#0a1520] rounded-lg p-3 mt-1 ..."
// After:  className="bg-surface rounded-lg p-3 mt-1 ..."

// Before: className="bg-[#0a1520] rounded-lg p-2.5 ..."
// After:  className="bg-surface rounded-lg p-2.5 ..."

// Before: className="border-t border-[#1a2840] my-2 mb-4"
// After:  className="border-t border-border my-2 mb-4"

// Before: className="w-full bg-[#0a1520] border border-[#1e3a5f] ... text-slate-100 ..."
// After:  className="w-full bg-surface border border-border ... text-[color:var(--color-text)] ..."
```

- [ ] **Step 4: Update MortgageCard.tsx**

```tsx
// Before (card wrapper, line ~32):
style={{ background: '#0a1520', borderLeft: `3px solid ${MORTGAGE_COLOR}` }}
// After:
style={{ background: 'var(--color-surface)', borderLeft: `3px solid ${MORTGAGE_COLOR}` }}
```

```tsx
// Before (input fields, lines ~123, ~136, ~150, ~160):
style={{ background: '#0a1520', borderColor: '#1e3a5f', color: '#e8f0f8' }}
// After:
style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
```

- [ ] **Step 5: Update SavingsCard.tsx**

```tsx
// Before (line ~60):
style={{ color: '#f59e0b', background: '#0a1520' }}
// After:
style={{ color: '#f59e0b', background: 'var(--color-surface)' }}
```

```tsx
// Before (progress track, line ~107):
style={{ height: 6, background: '#0a1520', borderRadius: 3 }}
// After:
style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}
```

- [ ] **Step 6: Verify feature cards in both themes**

Run `npm run dev`. Navigate to Income, Expenses, and Savings tabs. Toggle theme and check input fields, card backgrounds, and form layouts are legible in both modes.

- [ ] **Step 7: Commit**

```bash
git add src/features/BudgetRow.tsx src/features/DebtCard.tsx src/features/IncomeSourceCard.tsx src/features/MortgageCard.tsx src/features/SavingsCard.tsx
git commit -m "feat: tokenize feature card chrome colors"
```

---

## Task 10: Migrate Tab Files

**Files:**
- Modify: `src/tabs/OverviewTab.tsx`
- Modify: `src/tabs/ExpensesTab.tsx`
- Modify: `src/tabs/InvestRetireTab.tsx`
- Modify: `src/tabs/PlanTab.tsx`
- Modify: `src/tabs/SavingsTab.tsx`

- [ ] **Step 1: Update OverviewTab.tsx**

Update `KpiCell` default props:
```tsx
// Before:
function KpiCell({ label, value, labelColor = '#2e7a7a', valueColor = '#f0faf8', ...
// After:
function KpiCell({ label, value, labelColor = 'var(--color-text-muted)', valueColor = 'var(--color-text)', ...
```

Update KPI row separator:
```tsx
// Before:
borderRight: last ? 'none' : '1px solid rgba(13,148,136,0.2)'
// After:
borderRight: last ? 'none' : '1px solid var(--color-border)'
```

Update tooltip div in KpiCell:
```tsx
// Before:
background: '#032e2e', border: '1px solid rgba(13,148,136,0.25)', color: '#5aabab'
// After:
background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)'
```

Update KPI grid bottom separator:
```tsx
// Before:
borderBottom: '1px solid rgba(13,148,136,0.15)'
// After:
borderBottom: '1px solid var(--color-border)'
```

Update `SectionTitle accent="#0d9488"` calls — replace with `accent="var(--color-accent)"`.

Update retirement detail separators and label text:
```tsx
// Before (stat label): color: '#2e7a7a'
// After: color: 'var(--color-text-muted)'

// Before (stat value): color: '#5aabab'
// After: color: 'var(--color-text-dim)'

// Before (inline border divider): borderRight: i === 2 ? '1px solid rgba(13,148,136,0.2)' : 'none'
// After: borderRight: i === 2 ? '1px solid var(--color-border)' : 'none'

// Before (retirement breakdown separator): borderBottom: '1px solid rgba(13,148,136,0.1)'
// After: borderBottom: '1px solid var(--color-border)'
```

- [ ] **Step 2: Update ExpensesTab.tsx**

```tsx
// Before (warning notice, line ~175):
style={{ fontSize: 11, color: '#f59e0b', background: '#0a1520', borderRadius: 8, padding: '8px 12px', marginBottom: 10, border: '1px solid #f59e0b33' }}
// After:
style={{ fontSize: 11, color: '#f59e0b', background: 'var(--color-surface)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, border: '1px solid rgba(249,115,22,0.2)' }}
```

Apply token mapping to all other `#0a1520`, `#0f1923`, `#1a2840`, `#1e3a5f`, `#2a4060`, `#8b9cb5` values in the file:
```tsx
#0a1520 / #0f1923 / #0d1a2e  →  var(--color-surface)
#1a2840 / #1e3a5f / #2a4060  →  var(--color-border)
#8b9cb5                       →  var(--color-text-muted)
```

- [ ] **Step 3: Update InvestRetireTab.tsx**

Apply token mapping to all occurrences in the file:
```tsx
#0a1520  →  var(--color-surface)    (appears on ~15 lines)
#1a2840  →  var(--color-border)     (appears on ~6 lines)
#8b9cb5  →  var(--color-text-muted) (line ~679)
```

- [ ] **Step 4: Update PlanTab.tsx**

```tsx
// Before (button, lines ~84-85):
className="px-4 py-2 text-[12px] font-semibold text-[#5a7a9a] border border-[#1a2840] rounded-lg cursor-pointer"
style={{ background: '#0a1520' }}
// After:
className="px-4 py-2 text-[12px] font-semibold border rounded-lg cursor-pointer"
style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
```

```tsx
// Before (summary row, lines ~93-94):
className="... border border-[#1a2840]"
style={{ background: '#0a1520' }}
// After:
className="... border border-border"
style={{ background: 'var(--color-surface)' }}
```

```tsx
// Before (plan rows, line ~147, ~194, ~234, ~327):
style={{ ..., background: '#0a1520', borderLeft: '3px solid ...' }}
// After:
style={{ ..., background: 'var(--color-surface)', borderLeft: '3px solid ...' }}
```

```tsx
// Before (debt-free label, line ~412):
<span className="text-[13px] text-[#8b9cb5] font-semibold">
// After:
<span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
```

- [ ] **Step 5: Update SavingsTab.tsx**

```tsx
// Before (lines ~211, ~222):
style={{ background: '#0a1520' }}
// After:
style={{ background: 'var(--color-surface)' }}
```

```tsx
// Before (muted text, lines ~225, ~250):
style={{ color: '#8b9cb5' }}
// After:
style={{ color: 'var(--color-text-muted)' }}
```

- [ ] **Step 6: Verify all tabs in both themes**

Run `npm run dev`. Walk through every tab (Overview, Expenses, Savings, Invest & Retire, Plan) in both dark and light mode. Check that panel/card backgrounds, input borders, and secondary text are legible.

- [ ] **Step 7: Commit**

```bash
git add src/tabs/OverviewTab.tsx src/tabs/ExpensesTab.tsx src/tabs/InvestRetireTab.tsx src/tabs/PlanTab.tsx src/tabs/SavingsTab.tsx
git commit -m "feat: tokenize all tab chrome colors"
```

---

## Task 11: Migrate Onboarding Files

**Files:**
- Modify: `src/onboarding/WelcomeModal.tsx`
- Modify: `src/onboarding/QuickStart.tsx`

- [ ] **Step 1: Update WelcomeModal.tsx**

Apply token mapping:
```tsx
border: '1px solid #1a2840'          →  border: '1px solid var(--color-border)'
style={{ background: '#0a1520', border: '1px solid #1e3a5f' }}
  →  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
```

- [ ] **Step 2: Update QuickStart.tsx**

Apply token mapping to all occurrences:
```tsx
background: '#0a1520'   →  background: 'var(--color-surface)'
border: '1px solid #1a2840'  →  border: '1px solid var(--color-border)'
background: freq === f.id ? '#1e3a5f' : '#0a1520'
  →  background: freq === f.id ? 'var(--color-surface-2)' : 'var(--color-surface)'
```

At line ~546 (ternary background):
```tsx
// Before:
background: condition ? '#0a1520' : ...
// After:
background: condition ? 'var(--color-surface)' : ...
```

- [ ] **Step 3: Verify onboarding in both themes**

Run `npm run dev`. Clear `localStorage.removeItem('compound_onboarding_done')` in browser devtools to re-trigger the welcome modal. Walk through the QuickStart flow. Verify panels and inputs are legible in both dark and light mode.

- [ ] **Step 4: Run the full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run a build to confirm no TypeScript errors**

```
npm run build
```

Expected: exits with code 0, no type errors.

- [ ] **Step 6: Final commit**

```bash
git add src/onboarding/WelcomeModal.tsx src/onboarding/QuickStart.tsx
git commit -m "feat: tokenize onboarding chrome colors — theme system complete"
```
