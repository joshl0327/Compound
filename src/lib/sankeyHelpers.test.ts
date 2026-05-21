import { describe, it, expect } from 'vitest'
import { buildSankeyData } from './sankeyHelpers'
import type { SankeyInput } from './sankeyHelpers'

const base: SankeyInput = {
  grossMonthly: 18017,
  netMonthly: 12527,
  trad401kMonthly: 2563,
  roth401kMonthly: 0,
  hsaMonthly: 583,
  employerMatch: 0,
  essTotalP: 7065,
  discPlanTotal: 2072,
  debtPlanTotal: 1802,
  liquidSavingsMonthly: 1010,
  rothIraMonthly: 583,
  dti: '41.4',
  housingPct: '31.4',
  savingsRate: '26.3',
  retireRate: '20.7',
  sourceCalcs: [
    { src: { id: 'p1', name: 'Person 1', type: 'w2' } as any, gross: 18017, net: 12527, trad401k: 2563, roth401k: 0, match: 0, rothIra: 583, perYear: 26, isSimple: true },
  ],
}

describe('buildSankeyData (expanded)', () => {
  it('includes one col-0 node per source', () => {
    const { nodes } = buildSankeyData(base)
    const col0 = nodes.filter(n => n.col === 0)
    expect(col0).toHaveLength(1)
    expect(col0[0].id).toBe('src-p1')
    expect(col0[0].label).toBe('Person 1')
  })

  it('includes gross node in col 1', () => {
    const { nodes } = buildSankeyData(base)
    const gross = nodes.find(n => n.id === 'gross')
    expect(gross?.col).toBe(1)
  })

  it('includes ret-hsa and taxes and takehome in col 2', () => {
    const { nodes } = buildSankeyData(base)
    const ids = nodes.filter(n => n.col === 2).map(n => n.id)
    expect(ids).toContain('ret-hsa')
    expect(ids).toContain('taxes')
    expect(ids).toContain('takehome')
  })

  it('ret-hsa node combines trad401k + roth401k + hsa', () => {
    // base: trad401k=2563, roth401k=0, hsa=583 → retHsa=3146
    const { links } = buildSankeyData(base)
    const retLink = links.find(l => l.target === 'ret-hsa')
    expect(retLink?.value).toBeCloseTo(3146, 0)
  })

  it('ret-hsa includes roth401k when nonzero', () => {
    // trad401k=2563, roth401k=500, hsa=583 → retHsa=3646
    const { links } = buildSankeyData({ ...base, roth401kMonthly: 500 })
    const retLink = links.find(l => l.target === 'ret-hsa')
    expect(retLink?.value).toBeCloseTo(3646, 0)
  })

  it('omits ret-hsa node when all three are zero', () => {
    const { nodes } = buildSankeyData({ ...base, trad401kMonthly: 0, roth401kMonthly: 0, hsaMonthly: 0 })
    expect(nodes.find(n => n.id === 'ret-hsa')).toBeUndefined()
  })

  it('includes bucket nodes in col 3', () => {
    const { nodes } = buildSankeyData(base)
    const col3 = nodes.filter(n => n.col === 3).map(n => n.id)
    expect(col3).toContain('essentials')
    expect(col3).toContain('discretionary')
    expect(col3).toContain('debt')
    expect(col3).toContain('liquid-savings')
    expect(col3).toContain('retirement')
  })

  it('adds remaining node when surplus > 0', () => {
    const surplus: SankeyInput = { ...base, netMonthly: 20000 }
    const { nodes } = buildSankeyData(surplus)
    expect(nodes.find(n => n.id === 'remaining')).toBeDefined()
    expect(nodes.find(n => n.id === 'overshoot')).toBeUndefined()
  })

  it('adds overshoot node when buckets exceed take-home', () => {
    const overspend: SankeyInput = { ...base, netMonthly: 5000 }
    const { nodes } = buildSankeyData(overspend)
    expect(nodes.find(n => n.id === 'overshoot')).toBeDefined()
    expect(nodes.find(n => n.id === 'remaining')).toBeUndefined()
  })

  it('computes taxes correctly', () => {
    const { links } = buildSankeyData(base)
    const taxLink = links.find(l => l.target === 'taxes')
    // taxes = gross - net - trad401k - hsa - roth401k
    // = 18017 - 12527 - 2563 - 583 - 0 = 2344
    expect(taxLink?.value).toBeCloseTo(2344, 0)
  })

  it('all source→gross link values sum to grossMonthly', () => {
    const { links } = buildSankeyData(base)
    const srcLinks = links.filter(l => l.target === 'gross')
    const total = srcLinks.reduce((s, l) => s + l.value, 0)
    expect(total).toBeCloseTo(base.grossMonthly, 0)
  })

  it('omits zero-value bucket nodes', () => {
    const { nodes } = buildSankeyData({ ...base, debtPlanTotal: 0 })
    expect(nodes.find(n => n.id === 'debt')).toBeUndefined()
  })
})

import { computeSituationalRead, computeNetWorthPositiveMonths } from './sankeyHelpers'

describe('computeSituationalRead', () => {
  it('returns overspend message when planSurplus < 0', () => {
    const result = computeSituationalRead({
      planSurplus: -500, dti: '30', savingsRate: '10',
      hasConsumerDebt: true, consumerDebtBalance: 30000,
    })
    expect(result.headline).toMatch(/spending .* more than you take home/i)
    expect(result.isOvershoot).toBe(true)
  })

  it('returns strong-saver-with-debt message when DTI ≥ 36 and savings ≥ 15%', () => {
    const result = computeSituationalRead({
      planSurplus: 1000, dti: '41.4', savingsRate: '26.3',
      hasConsumerDebt: true, consumerDebtBalance: 30000,
    })
    expect(result.headline).toMatch(/strong saver/i)
    expect(result.headline).toMatch(/DTI/i)
  })

  it('returns high-DTI message when DTI ≥ 36 and savings < 15%', () => {
    const result = computeSituationalRead({
      planSurplus: 200, dti: '38', savingsRate: '8',
      hasConsumerDebt: true, consumerDebtBalance: 15000,
    })
    expect(result.headline).toMatch(/high debt load/i)
  })

  it('returns debt-free + strong savings message', () => {
    const result = computeSituationalRead({
      planSurplus: 2000, dti: '10', savingsRate: '20',
      hasConsumerDebt: false, consumerDebtBalance: 0,
    })
    expect(result.headline).toMatch(/debt-free/i)
    expect(result.headline).toMatch(/savings rate/i)
  })

  it('returns default message when no income', () => {
    const result = computeSituationalRead({
      planSurplus: 0, dti: '0', savingsRate: '0',
      hasConsumerDebt: false, consumerDebtBalance: 0, noIncome: true,
    })
    expect(result.headline).toBe('')
  })
})

describe('computeNetWorthPositiveMonths', () => {
  it('returns null when no savings data', () => {
    expect(computeNetWorthPositiveMonths({
      savingsBalance: 0, retirementBalance: 0, monthlyContrib: 0,
      totalDebtBalance: 50000, monthlyDebtPayment: 1000,
    })).toBeNull()
  })

  it('returns month count when assets overtake debt', () => {
    // Start: 10k assets, 30k debt. +500/mo assets, -1000/mo debt.
    // Simple linear: when savingsBalance + monthlyContrib*t > totalDebtBalance - monthlyDebtPayment*t
    // 10000 + 500t > 30000 - 1000t → 1500t > 20000 → t > 13.3 → t = 14
    const result = computeNetWorthPositiveMonths({
      savingsBalance: 10000, retirementBalance: 0, monthlyContrib: 500,
      totalDebtBalance: 30000, monthlyDebtPayment: 1000,
    })
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it('returns null when already net-worth-positive', () => {
    const result = computeNetWorthPositiveMonths({
      savingsBalance: 50000, retirementBalance: 0, monthlyContrib: 500,
      totalDebtBalance: 10000, monthlyDebtPayment: 1000,
    })
    expect(result).toBeNull()
  })
})

describe('pct helper (via tooltip strings)', () => {
  it('take-home node has no isStructural flag', () => {
    const { nodes } = buildSankeyData(base)
    const th = nodes.find(n => n.id === 'takehome')
    expect(th).toBeDefined()
    expect(th?.isStructural).toBeFalsy()
  })

  it('source tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const src = nodes.find(n => n.id === 'src-p1')
    expect(src?.tooltip).toMatch(/of gross income/i)
    expect(src?.tooltip).toMatch(/%/)
  })

  it('taxes tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const taxes = nodes.find(n => n.id === 'taxes')
    expect(taxes?.tooltip).toMatch(/of gross income/i)
    expect(taxes?.tooltip).toMatch(/%/)
  })

  it('take-home tooltip contains % of gross income', () => {
    const { nodes } = buildSankeyData(base)
    const th = nodes.find(n => n.id === 'takehome')
    expect(th?.tooltip).toMatch(/of gross income/i)
    expect(th?.tooltip).toMatch(/%/)
  })

  it('essentials tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const ess = nodes.find(n => n.id === 'essentials')
    expect(ess?.tooltip).toMatch(/of take-home/i)
    expect(ess?.tooltip).toMatch(/%/)
  })

  it('debt tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const debt = nodes.find(n => n.id === 'debt')
    expect(debt?.tooltip).toMatch(/of take-home/i)
  })

  it('liquid-savings tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const liq = nodes.find(n => n.id === 'liquid-savings')
    expect(liq?.tooltip).toMatch(/of take-home/i)
  })

  it('retirement (col 3) tooltip contains % of take-home', () => {
    const { nodes } = buildSankeyData(base)
    const ret = nodes.find(n => n.id === 'retirement')
    expect(ret?.tooltip).toMatch(/of take-home/i)
  })

  it('essentials tooltip % uses netMonthly as denominator, not grossMonthly', () => {
    // base: essTotalP=7065, netMonthly=12527 → 56.4%, grossMonthly=18017 → 39.2%
    // tooltip must contain 56.4 (take-home %) not 39.2 (gross %)
    const { nodes } = buildSankeyData(base)
    const ess = nodes.find(n => n.id === 'essentials')
    expect(ess?.tooltip).toContain('56.4')
    expect(ess?.tooltip).not.toContain('39.2')
  })

  it('taxes tooltip % uses grossMonthly as denominator', () => {
    // base: taxes = 18017 - 12527 - 2563 - 583 - 0 = 2344
    // pct(2344, 18017) = 13.0%
    const { nodes } = buildSankeyData(base)
    const taxes = nodes.find(n => n.id === 'taxes')
    expect(taxes?.tooltip).toContain('13.0')
  })
})
