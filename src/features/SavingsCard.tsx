export interface SavingsCardProps {
  title: string
  current?: string
  goal: string
  monthly: string
  planMonthly?: string
  onCurrentChange?: (v: string) => void
  onGoalChange: (v: string) => void
  onMonthlyChange: (v: string) => void
  onPlanMonthlyChange?: (v: string) => void
  accent: string
}

export default function SavingsCard(_props: SavingsCardProps) {
  return <div>SavingsCard — TODO</div>
}
