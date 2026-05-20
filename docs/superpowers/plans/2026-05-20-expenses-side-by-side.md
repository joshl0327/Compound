# Expenses Side-by-Side Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Expenses tab into a two-column side-by-side layout with Essentials + Other Expenses on the left and Debt Obligations on the right.

**Architecture:** Add a `.expenses-grid` CSS class to `index.css` that defines the two-column responsive grid. Wrap the three existing card blocks in `ExpensesTab.tsx` with a grid container and two column divs. No logic, state, or component changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + @testing-library/react

---

## Files

- Modify: `src/index.css` — add `.expenses-grid` responsive grid class
- Modify: `src/tabs/ExpensesTab.tsx` — JSX restructure only (lines 157–571)
- Create: `src/tabs/ExpensesTab.test.tsx` — layout tests

---

### Task 1: Write the failing layout tests

**Files:**
- Create: `src/tabs/ExpensesTab.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { DataProvider } from '../context/DataContext'
import ExpensesTab from './ExpensesTab'

function renderExpenses() {
  const { container } = render(
    <DataProvider><ExpensesTab /></DataProvider>
  )
  return container
}

describe('ExpensesTab layout', () => {
  beforeEach(() => localStorage.clear())

  it('renders a two-column grid container', () => {
    const container = renderExpenses()
    const grid = container.querySelector('.expenses-grid')
    expect(grid).not.toBeNull()
    expect(grid!.children).toHaveLength(2)
  })

  it('places Essentials and Other Expenses in the left column', () => {
    const container = renderExpenses()
    const leftCol = container.querySelector('.expenses-grid')!.children[0]
    expect(leftCol.textContent).toContain('Essentials')
    expect(leftCol.textContent).toContain('Other Expenses')
  })

  it('places Debt Obligations in the right column', () => {
    const container = renderExpenses()
    const rightCol = container.querySelector('.expenses-grid')!.children[1]
    expect(rightCol.textContent).toContain('Debt Obligations')
  })

  it('does not render Debt Obligations in the left column', () => {
    const container = renderExpenses()
    const leftCol = container.querySelector('.expenses-grid')!.children[0]
    expect(leftCol.textContent).not.toContain('Debt Obligations')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/tabs/ExpensesTab.test.tsx
```

Expected: 4 failures — `expenses-grid` class does not exist yet.

---

### Task 2: Add the responsive CSS class

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append `.expenses-grid` to `index.css`**

Add at the end of `src/index.css`, after the existing `@layer components` block:

```css
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

- [ ] **Step 2: Verify tests still fail (grid class exists but JSX not restructured yet)**

```bash
npx vitest run src/tabs/ExpensesTab.test.tsx
```

Expected: 4 failures — `.expenses-grid` now exists in CSS but is not in the rendered HTML yet.

---

### Task 3: Restructure ExpensesTab JSX

**Files:**
- Modify: `src/tabs/ExpensesTab.tsx`

- [ ] **Step 1: Replace the outer return wrapper**

In `src/tabs/ExpensesTab.tsx`, find the `return (` block starting at line 157. Replace the content from the opening `<div>` through the closing `</div>` with the restructured layout below.

The only change is wrapping the three `<Card>` blocks (Essentials, Other Expenses, Debt Obligations) in a grid container with two column divs. The `<h1>`, `<p>`, and all card internals are untouched.

Replace:
```tsx
  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#e8f0f8' }}>
        Expenses
      </h1>
      <p style={{ margin: '0 0 20px', color: '#5a7a9a', fontSize: 13 }}>
        All amounts are monthly. Enter what you actually spend or owe each month.
      </p>

      {/* Essentials */}
      <Card style={{ marginBottom: 14 }}>
        {/* ...essentials content... */}
      </Card>

      {/* Other Expenses (Discretionary) */}
      <Card style={{ marginBottom: 14 }}>
        {/* ...discretionary content... */}
      </Card>

      {/* Debt Obligations */}
      <Card style={{ marginBottom: 14 }}>
        {/* ...debt content... */}
      </Card>
    </div>
  )
```

With (keep all card internals exactly as they are — only the wrapper structure changes):
```tsx
  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#e8f0f8' }}>
        Expenses
      </h1>
      <p style={{ margin: '0 0 20px', color: '#5a7a9a', fontSize: 13 }}>
        All amounts are monthly. Enter what you actually spend or owe each month.
      </p>

      <div className="expenses-grid">
        {/* Left column: spending */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Essentials */}
          <Card>
            {/* ...essentials content unchanged... */}
          </Card>

          {/* Other Expenses (Discretionary) */}
          <Card>
            {/* ...discretionary content unchanged... */}
          </Card>

        </div>

        {/* Right column: debt */}
        <div>

          {/* Debt Obligations */}
          <Card>
            {/* ...debt content unchanged... */}
          </Card>

        </div>
      </div>
    </div>
  )
```

Note: Remove `style={{ marginBottom: 14 }}` from all three `<Card>` elements — spacing is now handled by the flex column gap on the left and the grid gap between columns.

- [ ] **Step 2: Run tests to confirm all 4 pass**

```bash
npx vitest run src/tabs/ExpensesTab.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass.

---

### Task 4: Visual check and commit

- [ ] **Step 1: Open the app and verify the layout**

```bash
npm run dev
```

Open `http://localhost:5173`, navigate to the Expenses tab. Confirm:
- Essentials card is on the left
- Other Expenses card is below Essentials on the left
- Debt Obligations card occupies the full right column
- Columns are equal width
- Resize the browser below 768px and confirm the layout collapses to a single column

- [ ] **Step 2: Commit**

```bash
git add src/index.css src/tabs/ExpensesTab.tsx src/tabs/ExpensesTab.test.tsx
git commit -m "feat: side-by-side Expenses layout (Essentials left, Debt right)"
```
