import { useMemo, useEffect, useRef, useState } from 'react'
import type { DataPoint } from '../lib/calculations'
import { DOLLAR_THRESHOLDS, DOLLAR_LABELS, FIDELITY_BENCHMARKS } from '../lib/milestoneConstants'
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

export function computeFidelityOnTrack(
  currentAge: number,
  annualGross: number,
  projectionPoints: DataPoint[]
): Set<string> {
  const onTrack = new Set<string>()
  if (projectionPoints.length === 0) return onTrack
  for (const b of FIDELITY_BENCHMARKS) {
    const threshold = annualGross * b.multiplier
    if (threshold <= 0) continue
    const qualifies = currentAge > b.age
      ? (projectionPoints[0]?.balance ?? 0) >= threshold
      : (projectionPoints.find(p => p.age === b.age)?.balance ?? 0) >= threshold
    if (qualifies) onTrack.add(b.label)
  }
  return onTrack
}

export interface MilestoneResult {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
  fidelityOnTrack: Set<string>
  currentAge: number
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
      fidelityOnTrack: computeFidelityOnTrack(currentAge, annualGross, projectionPoints),
      currentAge,
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
      // Show only the highest newly-unlocked milestone; MilestoneToast shows newlyUnlocked[0]
      setNewlyUnlocked(labels)
    }

    prevRef.current = { dollar: earned.earnedDollar, fidelity: earned.earnedFidelity }
  }, [earned])

  return {
    earnedDollar: earned.earnedDollar,
    earnedFidelity: earned.earnedFidelity,
    fidelityOnTrack: earned.fidelityOnTrack,
    currentAge: earned.currentAge,
    newlyUnlocked,
  }
}
