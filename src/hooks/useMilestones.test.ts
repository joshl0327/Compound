import { describe, it, expect, beforeEach } from 'vitest'
import { computeDollarEarned, computeFidelityEarned } from './useMilestones'
import type { DataPoint } from '../lib/calculations'

describe('computeDollarEarned', () => {
  it('earns $10K when balance >= 10000', () => {
    const result = computeDollarEarned(15_000, new Set())
    expect(result.has(10_000)).toBe(true)
    expect(result.has(100_000)).toBe(false)
  })

  it('earns multiple thresholds for large balance', () => {
    const result = computeDollarEarned(1_500_000, new Set())
    expect(result.has(10_000)).toBe(true)
    expect(result.has(100_000)).toBe(true)
    expect(result.has(500_000)).toBe(true)
    expect(result.has(1_000_000)).toBe(true)
    expect(result.has(2_000_000)).toBe(false)
  })

  it('earns nothing for zero balance', () => {
    expect(computeDollarEarned(0, new Set()).size).toBe(0)
  })

  it('preserves stored milestones even when balance drops below threshold', () => {
    const stored = new Set([100_000])
    const result = computeDollarEarned(5_000, stored)
    expect(result.has(100_000)).toBe(true)
  })

  it('earns all 7 thresholds at max', () => {
    const result = computeDollarEarned(10_000_000, new Set())
    expect(result.size).toBe(7)
  })
})

describe('computeFidelityEarned', () => {
  const makePoints = (pairs: [number, number][]): DataPoint[] =>
    pairs.map(([age, balance]) => ({ age, balance }))

  it('earns 1× by 30 when projection at age 30 meets threshold', () => {
    const points = makePoints([[25, 20_000], [30, 120_000], [35, 200_000]])
    const result = computeFidelityEarned(25, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)
    expect(result.has('3× by 40')).toBe(false)
  })

  it('does not earn when projection at benchmark age misses threshold', () => {
    const points = makePoints([[25, 10_000], [30, 50_000]])
    const result = computeFidelityEarned(25, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)
  })

  it('earns a past-age benchmark from current balance when currentAge > benchmarkAge', () => {
    // currentAge 35 > benchmark age 30; annualGross 100K * 1 = 100K; balance 350K qualifies
    const points = makePoints([[35, 350_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)
  })

  it('does not earn past-age benchmark when current balance is below threshold', () => {
    const points = makePoints([[35, 50_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)
  })

  it('earns 3× by 40 and 6× by 50 when projection meets both', () => {
    const points = makePoints([
      [28, 50_000], [40, 320_000], [50, 650_000], [65, 2_000_000],
    ])
    const result = computeFidelityEarned(28, 100_000, points, new Set())
    expect(result.has('3× by 40')).toBe(true)  // 320K >= 100K * 3
    expect(result.has('6× by 50')).toBe(true)  // 650K >= 100K * 6
    expect(result.has('8× by 60')).toBe(false)
  })

  it('preserves stored fidelity milestones', () => {
    const stored = new Set(['3× by 40'])
    const points = makePoints([[28, 10_000]])
    const result = computeFidelityEarned(28, 200_000, points, stored)
    expect(result.has('3× by 40')).toBe(true)
  })

  it('skips all benchmarks when annualGross is 0', () => {
    const points = makePoints([[28, 500_000]])
    expect(computeFidelityEarned(28, 0, points, new Set()).size).toBe(0)
  })

  it('returns empty set when projectionPoints is empty', () => {
    expect(computeFidelityEarned(28, 100_000, [], new Set()).size).toBe(0)
  })
})
