import { describe, it, expect } from 'vitest'
import { calcPayoff, debtColor, calcSourceMetrics, payoffDate } from './calculations'
import { FREQ_OPTIONS } from './storage'
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
  it('returns {months:0, totalInterest:0} for zero balance', () => {
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
  it('returns orange (#f97316) for first debt', () => {
    expect(debtColor(0, 3)).toBe('#f97316')
  })
  it('returns amber (#fbbf24) for last debt', () => {
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
    expect(result.isSimple).toBe(true)
  })

  it('handles other income type (not W2)', () => {
    const src: IncomeSource = { id: 's1', name: 'Side hustle', type: 'other', monthlyNet: '500' }
    const result = calcSourceMetrics(src, FREQ_OPTIONS)
    expect(result.gross).toBe(500)
    expect(result.net).toBe(500)
  })
})

describe('payoffDate', () => {
  it('returns a non-empty string', () => {
    expect(payoffDate(12)).toMatch(/\w+ \d{4}/)
  })
})
