import type { Debt } from '../types'

export interface DebtCardProps {
  debt: Debt
  color: string
  onChange: (updated: Debt) => void
  onDelete: () => void
}

export default function DebtCard(_props: DebtCardProps) {
  return <div>DebtCard — TODO</div>
}
