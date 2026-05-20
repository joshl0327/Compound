import { describe, it, expect, beforeEach } from 'vitest'
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
