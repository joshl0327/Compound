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

function rollingWindow4<T>(
  items: T[],
  isEarned: (item: T) => boolean,
  earnedRole: (isLatest: boolean) => string,
  unearnedRole: (isNext: boolean) => string
): Array<{ item: T; role: string }> {
  const earned = items.filter(isEarned)
  const unearned = items.filter(i => !isEarned(i))
  const result: Array<{ item: T; role: string }> = []

  if (unearned.length === 0) {
    earned.slice(-4).forEach((item, i, arr) =>
      result.push({ item, role: earnedRole(i === arr.length - 1) })
    )
  } else {
    earned.slice(-2).forEach((item, i, arr) =>
      result.push({ item, role: earnedRole(i === arr.length - 1) })
    )
    unearned.slice(0, 4 - result.length).forEach((item, i) =>
      result.push({ item, role: unearnedRole(i === 0) })
    )
  }
  return result
}

function getDollarPills(earned: Set<number>): Array<{ threshold: number; role: DollarRole }> {
  return rollingWindow4(
    DOLLAR_THRESHOLDS,
    t => earned.has(t),
    isLatest => isLatest ? 'latest-earned' : 'dim-earned',
    isNext => isNext ? 'next-up' : 'faded-next'
  ).map(({ item, role }) => ({ threshold: item, role: role as DollarRole }))
}

function getFidelityWindow(
  earnedFidelity: Set<string>,
  fidelityOnTrack: Set<string>,
  currentAge: number
): Array<{ label: string; role: FidelityRole }> {
  // Always show 1× by 30; hide other past-age missed benchmarks
  const visible = FIDELITY_LABELS.filter(label => {
    if (label === '1× by 30') return true
    if (earnedFidelity.has(label)) return true
    return currentAge <= FIDELITY_BENCHMARK_AGES[label]
  })
  return rollingWindow4(
    visible,
    label => earnedFidelity.has(label),
    isLatest => isLatest ? 'latest-earned' : 'dim-earned',
    isNext => {
      const label = isNext  // label value passed via closure below
      return isNext ? 'on-track' : 'faded-future'
    }
  ).map(({ item: label, role }) => {
    // Refine unearned role: check if actually on-track or just faded
    if (role === 'on-track' && !fidelityOnTrack.has(label)) return { label, role: 'faded-future' as FidelityRole }
    if (role === 'faded-future' && fidelityOnTrack.has(label)) return { label, role: 'on-track' as FidelityRole }
    return { label, role: role as FidelityRole }
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
  borderRadius: 2, padding: 0, fontSize: 11, fontFamily: 'DM Mono, monospace',
  whiteSpace: 'nowrap', lineHeight: 1, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', width: 82, height: 42, boxSizing: 'border-box' as const,
}

function Pill({ label, role }: { label: string; role: PillRole }) {
  if (role === 'hidden') return null
  const prefix = (role === 'dim-earned' || role === 'latest-earned') ? '✓ '
    : role === 'on-track' ? '→ '
    : ''
  return <span style={{ ...BASE, ...ROLE_STYLES[role] }}>{prefix}{label}</span>
}

export default function MilestoneBadges({ earnedDollar, earnedFidelity, fidelityOnTrack, currentAge }: Props) {
  const dollarPills = getDollarPills(earnedDollar)
  const visibleFidelity = getFidelityWindow(earnedFidelity, fidelityOnTrack, currentAge)

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
