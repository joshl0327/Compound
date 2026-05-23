import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { computeDollarEarned, computeFidelityEarned, useMilestones } from './useMilestones'
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

  it('earns 1× by 30 when currentAge >= 30 and balance qualifies', () => {
    const points = makePoints([[35, 200_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)  // age 35 >= 30, balance 200K >= 100K
  })

  it('does not earn 1× by 30 when currentAge < 30 even if projection hits it', () => {
    const points = makePoints([[25, 20_000], [30, 120_000]])
    const result = computeFidelityEarned(25, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)  // future — belongs in fidelityOnTrack
  })

  it('does not earn past-age benchmark when current balance is below threshold', () => {
    const points = makePoints([[35, 50_000]])
    const result = computeFidelityEarned(35, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(false)
  })

  it('earns multiple past-age benchmarks when balance qualifies for all', () => {
    const points = makePoints([[55, 800_000]])
    const result = computeFidelityEarned(55, 100_000, points, new Set())
    expect(result.has('1× by 30')).toBe(true)   // 800K >= 100K
    expect(result.has('3× by 40')).toBe(true)   // 800K >= 300K
    expect(result.has('6× by 50')).toBe(true)   // 800K >= 600K
    expect(result.has('8× by 60')).toBe(false)  // age 55 < 60
  })

  it('preserves stored past-age fidelity milestones', () => {
    const stored = new Set(['1× by 30'])
    const points = makePoints([[35, 5_000]])  // balance dropped below threshold
    const result = computeFidelityEarned(35, 100_000, points, stored)
    expect(result.has('1× by 30')).toBe(true)  // preserved from stored
  })

  it('filters out stored future benchmarks (migration from old projection-based logic)', () => {
    const stored = new Set(['3× by 40'])  // was stored when it was a future projection
    const points = makePoints([[28, 400_000]])
    const result = computeFidelityEarned(28, 100_000, points, stored)
    expect(result.has('3× by 40')).toBe(false)  // age 28 < 40, filtered out
  })

  it('skips all benchmarks when annualGross is 0', () => {
    const points = makePoints([[45, 500_000]])
    expect(computeFidelityEarned(45, 0, points, new Set()).size).toBe(0)
  })

  it('returns empty set when projectionPoints is empty', () => {
    expect(computeFidelityEarned(35, 100_000, [], new Set()).size).toBe(0)
  })
})

describe('useMilestones', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns empty newlyUnlocked on first render when balance is 0', () => {
    const { result } = renderHook(() => useMilestones(0, 100_000, []))
    expect(result.current.newlyUnlocked).toEqual([])
  })

  it('fires newlyUnlocked when balance crosses a threshold', async () => {
    const points = [{ age: 28, balance: 0 }]
    const { result, rerender } = renderHook(
      ({ balance }) => useMilestones(balance, 100_000, points),
      { initialProps: { balance: 0 } }
    )
    expect(result.current.newlyUnlocked).toEqual([])

    await act(async () => {
      rerender({ balance: 15_000 })
    })

    expect(result.current.newlyUnlocked).toContain('$10K')
  })

  it('writes to localStorage when a new milestone is unlocked', async () => {
    const points = [{ age: 28, balance: 0 }]
    const { rerender } = renderHook(
      ({ balance }) => useMilestones(balance, 100_000, points),
      { initialProps: { balance: 0 } }
    )

    await act(async () => {
      rerender({ balance: 15_000 })
    })

    const stored = JSON.parse(localStorage.getItem('compound_milestones_v1') || 'null')
    expect(stored).not.toBeNull()
    expect(stored.dollar).toContain(10_000)
  })

  it('does not fire newlyUnlocked on page load for already-stored milestones', () => {
    localStorage.setItem('compound_milestones_v1', JSON.stringify({
      dollar: [10_000],
      fidelity: [],
    }))
    const points = [{ age: 28, balance: 15_000 }]
    const { result } = renderHook(() => useMilestones(15_000, 100_000, points))
    expect(result.current.newlyUnlocked).toEqual([])
  })

  it('preserves stored milestones when balance drops', async () => {
    localStorage.setItem('compound_milestones_v1', JSON.stringify({
      dollar: [10_000, 100_000],
      fidelity: [],
    }))
    const points = [{ age: 28, balance: 5_000 }]
    const { result } = renderHook(() => useMilestones(5_000, 100_000, points))
    expect(result.current.earnedDollar.has(10_000)).toBe(true)
    expect(result.current.earnedDollar.has(100_000)).toBe(true)
  })

  it('returns fidelityOnTrack for future benchmarks the projection hits', async () => {
    const points = [{ age: 28, balance: 50_000 }, { age: 30, balance: 120_000 }]
    const { result } = renderHook(() => useMilestones(50_000, 100_000, points))
    expect(result.current.fidelityOnTrack.has('1× by 30')).toBe(true)
  })

  it('returns currentAge from first projection point', () => {
    const points = [{ age: 35, balance: 200_000 }]
    const { result } = renderHook(() => useMilestones(200_000, 100_000, points))
    expect(result.current.currentAge).toBe(35)
  })

  it('fidelityOnTrack does not include benchmarks the projection misses', () => {
    const points = [{ age: 28, balance: 1_000 }, { age: 30, balance: 5_000 }]
    const { result } = renderHook(() => useMilestones(1_000, 100_000, points))
    expect(result.current.fidelityOnTrack.has('1× by 30')).toBe(false)
  })
})
