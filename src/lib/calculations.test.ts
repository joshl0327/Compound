import { describe, it, expect } from 'vitest'
import { calcPayoff, calcPayoffPromo, debtColor, calcSourceMetrics, payoffDate } from './calculations'
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

describe('calcPayoffPromo', () => {
  // Static payment path (postPromoMinPct = 0, default)
  it('pays off before promo ends when payment is large enough', () => {
    const result = calcPayoffPromo(1000, 0, 500, 12, 24)
    expect(result).not.toBeNull()
    expect(result!.months).toBeLessThanOrEqual(12)
    expect(result!.totalInterest).toBe(0) // 0% promo rate
  })

  it('returns null for zero payment', () => {
    expect(calcPayoffPromo(5000, 0, 0, 12, 24)).toBeNull()
  })

  it('returns zero months for zero balance', () => {
    expect(calcPayoffPromo(0, 0, 100, 12, 24)).toEqual({ months: 0, totalInterest: 0 })
  })

  // Dynamic minimum path (postPromoMinPct = 0.01)
  it('pays off when static payment would not cover post-promo interest', () => {
    // $5,000 balance, 0% promo 12 months, then 24% APR, $56 static min
    // Static: $56 < $100/mo interest → would grow; dynamic min = 3%*balance → always pays off
    const result = calcPayoffPromo(5000, 0, 56, 12, 24, 0.01)
    expect(result).not.toBeNull()
    expect(result!.months).toBeGreaterThan(12)
    expect(result!.months).toBeLessThan(600)
    expect(result!.totalInterest).toBeGreaterThan(0)
  })

  it('dynamic min always terminates even at high APR', () => {
    const result = calcPayoffPromo(10000, 0, 25, 0, 29.99, 0.01)
    expect(result).not.toBeNull()
    expect(result!.months).toBeLessThan(600)
  })

  it('dynamic min uses static payment when it is already higher than the formula', () => {
    // $1,000 balance, 0% promo 0 months, then 24% APR, $500 payment (>> 3%*$1000=$30)
    const staticResult = calcPayoffPromo(1000, 0, 500, 0, 24, 0)
    const dynamicResult = calcPayoffPromo(1000, 0, 500, 0, 24, 0.01)
    expect(dynamicResult!.months).toBe(staticResult!.months)
  })

  it('dynamic min balance declines each month (never grows)', () => {
    // With 1% + interest formula, balance shrinks by exactly 1% per month
    // $5,000 after promo: month 1 payment = 5000*(0.01+0.02) = 150, new bal = 5000*0.99 = 4950
    const r12 = calcPayoffPromo(5000, 0, 56, 0, 24, 0.01)
    const r3 = calcPayoffPromo(5000, 0, 56, 0, 24, 0)
    // Dynamic min should pay off; static should not
    expect(r12).not.toBeNull()
    expect(r12!.months).toBeGreaterThan(0)
    // Static $56 < $100/mo interest: won't pay off in 600 months, returns partial
    expect(r3!.totalInterest).toBeGreaterThan(r12!.totalInterest)
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
