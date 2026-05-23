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
