import { useMemo, useEffect, useRef, useState } from 'react'
import type { DataPoint } from '../lib/calculations'

const DOLLAR_THRESHOLDS = [10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]
const DOLLAR_LABELS: Record<number, string> = {
  10_000: '$10K', 100_000: '$100K', 500_000: '$500K',
  1_000_000: '$1M', 2_000_000: '$2M', 5_000_000: '$5M', 10_000_000: '$10M',
}
const FIDELITY_BENCHMARKS = [
  { label: '1× by 30', age: 30, multiplier: 1 },
  { label: '3× by 40', age: 40, multiplier: 3 },
  { label: '6× by 50', age: 50, multiplier: 6 },
  { label: '8× by 60', age: 60, multiplier: 8 },
]
const STORAGE_KEY = 'compound_milestones_v1'

function readStored(): { dollar: Set<number>; fidelity: Set<string> } {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!raw) return { dollar: new Set(), fidelity: new Set() }
    return { dollar: new Set(raw.dollar ?? []), fidelity: new Set(raw.fidelity ?? []) }
  } catch {
    return { dollar: new Set(), fidelity: new Set() }
  }
}

export function computeDollarEarned(currentBalance: number, stored: Set<number>): Set<number> {
  const earned = new Set<number>(stored)
  for (const t of DOLLAR_THRESHOLDS) {
    if (currentBalance >= t) earned.add(t)
  }
  return earned
}

export function computeFidelityEarned(
  currentAge: number,
  annualGross: number,
  projectionPoints: DataPoint[],
  stored: Set<string>
): Set<string> {
  const earned = new Set<string>(stored)
  if (projectionPoints.length === 0) return earned
  for (const b of FIDELITY_BENCHMARKS) {
    const threshold = annualGross * b.multiplier
    if (threshold <= 0) continue
    const qualifies = currentAge > b.age
      ? (projectionPoints[0]?.balance ?? 0) >= threshold
      : (projectionPoints.find(p => p.age === b.age)?.balance ?? 0) >= threshold
    if (qualifies) earned.add(b.label)
  }
  return earned
}

export interface MilestoneResult {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
  newlyUnlocked: string[]
}

export function useMilestones(
  currentBalance: number,
  annualGross: number,
  projectionPoints: DataPoint[]
): MilestoneResult {
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([])

  // Read localStorage once on first render; reuse for both prevRef init and earned baseline
  const initialStoredRef = useRef<{ dollar: Set<number>; fidelity: Set<string> } | null>(null)
  if (initialStoredRef.current === null) {
    initialStoredRef.current = readStored()
  }

  // prevRef initialized from localStorage so page-load never fires toasts
  const prevRef = useRef<{ dollar: Set<number>; fidelity: Set<string> } | null>(null)
  if (prevRef.current === null) {
    const s = initialStoredRef.current
    prevRef.current = { dollar: new Set(s.dollar), fidelity: new Set(s.fidelity) }
  }

  const earned = useMemo(() => {
    // Re-read on each compute so high-water mark from other tabs/sessions is picked up
    const stored = readStored()
    const currentAge = projectionPoints[0]?.age ?? 0
    return {
      earnedDollar: computeDollarEarned(currentBalance, stored.dollar),
      earnedFidelity: computeFidelityEarned(currentAge, annualGross, projectionPoints, stored.fidelity),
    }
  }, [currentBalance, annualGross, projectionPoints])

  useEffect(() => {
    const prev = prevRef.current!
    const newDollar = [...earned.earnedDollar].filter(t => !prev.dollar.has(t))
    const newFidelity = [...earned.earnedFidelity].filter(l => !prev.fidelity.has(l))

    if (newDollar.length > 0 || newFidelity.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dollar: [...earned.earnedDollar],
        fidelity: [...earned.earnedFidelity],
      }))
      const labels = [
        ...newDollar.sort((a, b) => b - a).map(t => DOLLAR_LABELS[t]),
        ...newFidelity,
      ]
      setNewlyUnlocked(labels)
    }

    prevRef.current = { dollar: earned.earnedDollar, fidelity: earned.earnedFidelity }
  }, [earned])

  return { earnedDollar: earned.earnedDollar, earnedFidelity: earned.earnedFidelity, newlyUnlocked }
}
