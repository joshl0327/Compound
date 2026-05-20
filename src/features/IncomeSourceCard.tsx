import type { IncomeSource, FrequencyOption } from '../types'

export interface IncomeSourceCardProps {
  source: IncomeSource
  freqOptions: FrequencyOption[]
  onChange: (updated: IncomeSource) => void
  onDelete?: () => void
}

export default function IncomeSourceCard(_props: IncomeSourceCardProps) {
  return <div>IncomeSourceCard — TODO</div>
}
