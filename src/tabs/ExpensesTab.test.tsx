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
