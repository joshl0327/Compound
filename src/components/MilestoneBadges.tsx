import type { CSSProperties } from 'react'
import { DOLLAR_THRESHOLDS, DOLLAR_LABELS, FIDELITY_LABELS } from '../lib/milestoneConstants'

type DollarRole = 'dim-earned' | 'latest-earned' | 'next-up' | 'faded-next'
type FidelityRole = 'on-track' | 'faded-future'
type PillRole = DollarRole | FidelityRole

interface Props {
  earnedDollar: Set<number>
  fidelityOnTrack: Set<string>
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

function getFidelityPills(fidelityOnTrack: Set<string>): Array<{ label: string; role: FidelityRole }> {
  return FIDELITY_LABELS.map(label => ({
    label,
    role: fidelityOnTrack.has(label) ? 'on-track' : 'faded-future',
  }))
}

const ROLE_STYLES: Record<PillRole, CSSProperties> = {
  // past earned: subtle teal tint + border so it reads as "achieved" without competing with latest
  'dim-earned':    { background: 'rgba(13, 148, 136, 0.18)', color: 'var(--color-text-muted)', border: '1px solid rgba(13, 148, 136, 0.3)', fontWeight: 600 },
  // current milestone: full teal fill — the standout
  'latest-earned': { background: 'var(--color-accent)',       color: '#fff',                    border: 'none', fontWeight: 700, boxShadow: '0 0 6px rgba(13, 148, 136, 0.4)' },
  // next goal: outlined in teal so it's clearly the target
  'next-up':       { background: 'var(--color-surface)',      color: 'var(--color-accent)',     border: '1px solid var(--color-accent)',           fontWeight: 600 },
  // on-track fidelity: teal accent text matches the teal dashed border, stands out from faded-future
  'on-track':      { background: 'var(--color-surface)',      color: 'var(--color-accent)',     border: '1px dashed var(--color-accent)',           fontWeight: 500 },
  // distant upcoming milestones: visible but clearly lower priority
  'faded-next':    { background: 'var(--color-surface)',      color: 'var(--color-text-muted)', border: '1px dashed var(--color-text-dim)',         fontWeight: 400 },
  // not-on-track fidelity: dim text + dim border = low visual weight
  'faded-future':  { background: 'var(--color-surface)',      color: 'var(--color-text-dim)',   border: '1px dashed var(--color-text-dim)',         fontWeight: 400 },
}

const BASE: CSSProperties = {
  borderRadius: 2, padding: 0, fontSize: 11, fontFamily: 'DM Mono, monospace',
  whiteSpace: 'nowrap', lineHeight: 1, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', width: 82, height: 42, boxSizing: 'border-box' as const,
}

function Pill({ label, role }: { label: string; role: PillRole }) {
  const prefix = (role === 'dim-earned' || role === 'latest-earned') ? '✓ '
    : role === 'on-track' ? '→ '
    : ''
  return <span style={{ ...BASE, ...ROLE_STYLES[role] }}>{prefix}{label}</span>
}

export default function MilestoneBadges({ earnedDollar, fidelityOnTrack }: Props) {
  const dollarPills = getDollarPills(earnedDollar)
  const fidelityPills = getFidelityPills(fidelityOnTrack)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {dollarPills.map(({ threshold, role }) => (
          <Pill key={threshold} label={DOLLAR_LABELS[threshold]} role={role} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {fidelityPills.map(({ label, role }) => (
          <Pill key={label} label={label} role={role} />
        ))}
      </div>
    </div>
  )
}
