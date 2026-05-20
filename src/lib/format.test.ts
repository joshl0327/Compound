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
