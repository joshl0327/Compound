const DOLLAR_THRESHOLDS = [10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]
const DOLLAR_LABELS: Record<number, string> = {
  10_000: '$10K', 100_000: '$100K', 500_000: '$500K',
  1_000_000: '$1M', 2_000_000: '$2M', 5_000_000: '$5M', 10_000_000: '$10M',
}
const FIDELITY_LABELS = ['1× by 30', '3× by 40', '6× by 50', '8× by 60']

interface Props {
  earnedDollar: Set<number>
  earnedFidelity: Set<string>
}

function Pill({ label, earned }: { label: string; earned: boolean }) {
  return (
    <span style={{
      background: earned ? 'rgba(13,148,136,0.9)' : 'rgba(4,58,58,0.85)',
      color: earned ? '#fff' : '#2a6a6a',
      border: earned ? 'none' : '1px dashed #0d4a4a',
      borderRadius: 2,
      padding: '2px 5px',
      fontSize: 8,
      fontWeight: earned ? 700 : 400,
      fontFamily: 'DM Mono, monospace',
      whiteSpace: 'nowrap' as const,
      lineHeight: 1.4,
    }}>
      {earned ? '✓ ' : ''}{label}
    </span>
  )
}

export default function MilestoneBadges({ earnedDollar, earnedFidelity }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {DOLLAR_THRESHOLDS.map(t => (
          <Pill key={t} label={DOLLAR_LABELS[t]} earned={earnedDollar.has(t)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {FIDELITY_LABELS.map(l => (
          <Pill key={l} label={l} earned={earnedFidelity.has(l)} />
        ))}
      </div>
    </div>
  )
}
