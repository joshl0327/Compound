import Input from '../components/Input'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'
import { payoffDate } from '../lib/calculations'

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
  description?: string
  note?: string
  children?: React.ReactNode
}

export default function SavingsCard({
  title,
  current,
  goal,
  monthly,
  planMonthly,
  onCurrentChange,
  onGoalChange,
  onMonthlyChange,
  onPlanMonthlyChange,
  accent,
  description,
  note,
  children,
}: SavingsCardProps) {
  const currentNum = parseFloat(current || '') || 0
  const goalNum = parseFloat(goal) || 0
  const monthlyNum = parseFloat(monthly) || 0
  const planMonthlyNum = planMonthly !== undefined ? (parseFloat(planMonthly) || 0) : monthlyNum

  const showProgress = goalNum > 0
  const pct = showProgress ? Math.min(100, (currentNum / goalNum) * 100) : 0
  const remaining = Math.max(0, goalNum - currentNum)
  const months = planMonthlyNum > 0 ? Math.ceil(remaining / planMonthlyNum) : null

  return (
    <Card>
      <SectionTitle accent={accent}>{title}</SectionTitle>

      {description && (
        <p className="text-xs mb-3.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}

      {note && (
        <p
          className="text-xs mb-3.5 leading-relaxed rounded-lg px-2.5 py-2"
          style={{ color: '#f59e0b', background: 'var(--color-surface)' }}
        >
          {note}
        </p>
      )}

      {current !== undefined && onCurrentChange && (
        <Input
          label="Current Balance"
          value={current}
          onChange={onCurrentChange}
          prefix="$"
          type="number"
        />
      )}

      <Input
        label={current !== undefined ? 'Goal Amount' : 'Savings Goal (optional)'}
        value={goal}
        onChange={onGoalChange}
        prefix="$"
        type="number"
      />

      <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Input
          label="Monthly (Actual)"
          value={monthly}
          onChange={onMonthlyChange}
          prefix="$"
          type="number"
        />
        {onPlanMonthlyChange && (
          <Input
            label="Monthly (Plan)"
            value={planMonthly ?? monthly}
            onChange={onPlanMonthlyChange}
            prefix="$"
            type="number"
          />
        )}
      </div>

      {showProgress && (
        <div className="mt-2">
          <div
            className="overflow-hidden mb-1.5"
            style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: accent,
                borderRadius: 3,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span>{pct.toFixed(0)}% funded</span>
            <span>{months ? `Fully funded ${payoffDate(months)}` : 'Set a monthly amount'}</span>
          </div>
        </div>
      )}

      {children}
    </Card>
  )
}
