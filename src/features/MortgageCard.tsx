import type { Debt } from '../types'

export interface MortgageCardProps {
  debt: Debt
  onChange: (updated: Debt) => void
  onDelete: () => void
}

export default function MortgageCard(_props: MortgageCardProps) {
  return <div>MortgageCard — TODO</div>
}
