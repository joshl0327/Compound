export const DOLLAR_THRESHOLDS = [
  10_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000,
]

export const DOLLAR_LABELS: Record<number, string> = {
  10_000: '$10K',
  100_000: '$100K',
  500_000: '$500K',
  1_000_000: '$1M',
  2_000_000: '$2M',
  5_000_000: '$5M',
  10_000_000: '$10M',
}

export const FIDELITY_LABELS = ['1× by 30', '3× by 40', '6× by 50', '8× by 60']

export const FIDELITY_BENCHMARKS = [
  { label: '1× by 30', age: 30, multiplier: 1 },
  { label: '3× by 40', age: 40, multiplier: 3 },
  { label: '6× by 50', age: 50, multiplier: 6 },
  { label: '8× by 60', age: 60, multiplier: 8 },
]
