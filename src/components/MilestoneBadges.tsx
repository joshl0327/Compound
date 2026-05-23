import type { CSSProperties } from 'react'
import { DOLLAR_THRESHOLDS, DOLLAR_LABELS, FIDELITY_LABELS, FIDELITY_BENCHMARK_AGES } from '../lib/milestoneConstants'

type DollarRole = 'dim-earned' | 'latest-earned' | 'next-up' | 'faded-next'
type FidelityRole = 'dim-earned' | 'latest-earned' | 'on-track' | 'faded-future' | 'hidden'
type PillRole = DollarRole | FidelityRole

interface Props {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
  fidelityOnTrack: Set<string>
  currentAge: number
}

function getDollarWindow(earned: Set<number>): Array<{ threshold: number; role: DollarRole }> {
  const earnedList = DOLLAR_THRESHOLDS.filter(t => earned.has(t))
  const unearnedList = DOLLAR_THRESHOLDS.filter(t => !earned.has(t))
  const pills: Array<{ threshold: number; role: DollarRole }> = []

  if (unearnedList.length === 0) {
    earnedList.slice(-4).forEach((t, i, arr) => {
      pills.push({ threshold: t, role: i === arr.length - 1 ? 'latest-earned' : 'dim-earned' })
    })
  } else {
    const recentEarned = earnedList.slice(-2)
    recentEarned.forEach((t, i) => {
      pills.push({ threshold: t, role: i === recentEarned.length - 1 ? 'latest-earned' : 'dim-earned' })
    })
    const remaining = 4 - pills.length
    unearnedList.slice(0, remaining).forEach((t, i) => {
      pills.push({ threshold: t, role: i === 0 ? 'next-up' : 'faded-next' })
    })
  }

  return pills
}

function getFidelityPills(
  earnedFidelity: Set<string>,
  fidelityOnTrack: Set<string>,
  currentAge: number
): Array<{ label: string; role: FidelityRole }> {
  const earnedInOrder = FIDELITY_LABELS.filter(l => earnedFidelity.has(l))
  return FIDELITY_LABELS.map(label => {
    const benchmarkAge = FIDELITY_BENCHMARK_AGES[label]
    if (earnedFidelity.has(label)) {
      return { label, role: label === earnedInOrder[earnedInOrder.length - 1] ? 'latest-earned' : 'dim-earned' }
    }
    if (currentAge > benchmarkAge) return { label, role: 'hidden' }
    if (fidelityOnTrack.has(label)) return { label, role: 'on-track' }
    return { label, role: 'faded-future' }
  })
}

const ROLE_STYLES: Record<Exclude<PillRole, 'hidden'>, CSSProperties> = {
  'dim-earned':    { background: 'rgba(13,148,136,0.7)', color: '#ccc',    border: 'none',                    fontWeight: 600, opacity: 0.6 },
  'latest-earned': { background: 'rgba(13,148,136,0.9)', color: '#fff',    border: 'none',                    fontWeight: 700, boxShadow: '0 0 6px rgba(13,148,136,0.4)' },
  'next-up':       { background: 'rgba(4,58,58,0.9)',   color: '#5aabab', border: '1px solid #0d9488',        fontWeight: 600 },
  'on-track':      { background: 'rgba(4,58,58,0.9)',   color: '#3a8a8a', border: '1px dashed #0d9488',       fontWeight: 400 },
  'faded-next':    { background: 'rgba(4,58,58,0.85)',  color: '#2a6a6a', border: '1px dashed #0d4a4a',       fontWeight: 400 },
  'faded-future':  { background: 'rgba(4,58,58,0.85)',  color: '#2a6a6a', border: '1px dashed #0d4a4a',       fontWeight: 400 },
}

const BASE: CSSProperties = {
  borderRadius: 2, padding: '4px 14px', fontSize: 9, fontFamily: 'DM Mono, monospace',
  whiteSpace: 'nowrap', lineHeight: 1.4, minWidth: 68, display: 'inline-block', textAlign: 'center',
}

function Pill({ label, role }: { label: string; role: PillRole }) {
  if (role === 'hidden') return null
  const prefix = (role === 'dim-earned' || role === 'latest-earned') ? '✓ '
    : role === 'on-track' ? '→ '
    : ''
  return <span style={{ ...BASE, ...ROLE_STYLES[role] }}>{prefix}{label}</span>
}

export default function MilestoneBadges({ earnedDollar, earnedFidelity, fidelityOnTrack, currentAge }: Props) {
  const dollarPills = getDollarWindow(earnedDollar)
  const fidelityPills = getFidelityPills(earnedFidelity, fidelityOnTrack, currentAge)
  const visibleFidelity = fidelityPills.filter(p => p.role !== 'hidden')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {dollarPills.map(({ threshold, role }) => (
          <Pill key={threshold} label={DOLLAR_LABELS[threshold]} role={role} />
        ))}
      </div>
      {visibleFidelity.length > 0 && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {visibleFidelity.map(({ label, role }) => (
            <Pill key={label} label={label} role={role} />
          ))}
        </div>
      )}
    </div>
  )
}
