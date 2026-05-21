import { describe, it, expect } from 'vitest'
import { buildSankeyData, buildSankeyDataCollapsed, computeLabelPositions } from './sankeyHelpers'
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

  it('includes pretax-ret and taxes and takehome in col 2', () => {
    const { nodes } = buildSankeyData(base)
    const ids = nodes.filter(n => n.col === 2).map(n => n.id)
    expect(ids).toContain('pretax-ret')
    expect(ids).toContain('taxes')
    expect(ids).toContain('takehome')
  })

  it('omits roth401k col-2 node when roth401kMonthly is 0', () => {
    const { nodes } = buildSankeyData(base)
    expect(nodes.find(n => n.id === 'roth401k')).toBeUndefined()
  })

  it('includes roth401k col-2 node when nonzero', () => {
    const { nodes } = buildSankeyData({ ...base, roth401kMonthly: 500 })
    expect(nodes.find(n => n.id === 'roth401k')).toBeDefined()
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

describe('buildSankeyDataCollapsed', () => {
  it('has exactly one col-0 node labeled Total Income', () => {
    const { nodes } = buildSankeyDataCollapsed(base)
    const col0 = nodes.filter(n => n.col === 0)
    expect(col0).toHaveLength(1)
    expect(col0[0].id).toBe('total-income')
  })
})

describe('computeLabelPositions', () => {
  it('pushes labels down on forward pass', () => {
    const nodes = [
      { id: 'a', y0: 0, y1: 10 },
      { id: 'b', y0: 5, y1: 15 },
    ]
    const positions = computeLabelPositions(nodes, 1)
    expect(positions[1].top).toBeGreaterThanOrEqual(positions[0].top + 44)
  })

  it('clamps last label to container height on backward pass', () => {
    const nodes = [
      { id: 'a', y0: 0, y1: 10 },
      { id: 'b', y0: 50, y1: 60 },
      { id: 'c', y0: 400, y1: 420 },
    ]
    // containerHeight = 450, last label should not exceed 450 - 44 = 406
    const positions = computeLabelPositions(nodes, 1, 450)
    expect(positions[positions.length - 1].top).toBeLessThanOrEqual(406)
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
