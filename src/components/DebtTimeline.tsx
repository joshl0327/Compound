import { useMemo, useState } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff, debtColor } from '../lib/calculations'
import type { AppData } from '../types'
import { fmt } from '../lib/format'

interface DebtTimelineProps {
  data: AppData
  liquidSavingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  debtPlanTotal: number
  surplus: number
}

type Mode = 'plan' | 'snowball' | 'avalanche'

interface DebtItem {
  name: string
  months: number
  totalInterest: number
  color: string
}

function simulateDebtPayoff(
  debts: { name: string; balance: number; annualRate: number; planPayment: number; color: string }[],
  extraMonthly: number,
  strategy: 'snowball' | 'avalanche',
): DebtItem[] {
  const sorted = strategy === 'snowball'
    ? [...debts].sort((a, b) => a.balance - b.balance)
    : [...debts].sort((a, b) => b.annualRate - a.annualRate)

  const n = sorted.length
  const balances = sorted.map(d => d.balance)
  const monthlyRates = sorted.map(d => d.annualRate / 100 / 12)
  const interests = new Array<number>(n).fill(0)
  const payoffMonths = new Array<number>(n).fill(0)
  let rollingExtra = extraMonthly
  let month = 0

  while (balances.some(b => b > 0.01) && month < 600) {
    month++
    const targetIdx = balances.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (balances[i] <= 0.01) continue
      const interest = balances[i] * monthlyRates[i]
      interests[i] += interest
      balances[i] += interest
      const extra = i === targetIdx ? rollingExtra : 0
      const payment = Math.min(sorted[i].planPayment + extra, balances[i])
      balances[i] -= payment
      if (balances[i] < 0.01) {
        balances[i] = 0
        if (!payoffMonths[i]) payoffMonths[i] = month
        rollingExtra += sorted[i].planPayment
      }
    }
  }

  return sorted.map((d, i) => ({
    name: d.name,
    months: payoffMonths[i] || month,
    totalInterest: interests[i],
    color: d.color,
  }))
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal, surplus }: DebtTimelineProps) {
  const [mode, setMode] = useState<Mode>('plan')

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  // Plan items — analytical payoff per debt
  const planItems = useMemo((): DebtItem[] => {
    return consumerDebts
      .map((d, i) => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        if (!result || result.months <= 0) return null
        return { name: d.name, months: result.months, totalInterest: result.totalInterest, color: debtColor(i, consumerDebts.length) }
      })
      .filter((x): x is DebtItem => x !== null)
      .sort((a, b) => a.months - b.months)
  }, [consumerDebts])

  const planMaxMonths = planItems.length > 0 ? planItems[planItems.length - 1].months : 0
  const planTotalInterest = planItems.reduce((s, d) => s + d.totalInterest, 0)

  // What-if simulation items
  const whatIfItems = useMemo((): DebtItem[] => {
    if (mode === 'plan' || surplus <= 0) return []
    const inputs = consumerDebts
      .map((d, i) => ({
        name: d.name,
        balance: parseFloat(d.balance) || 0,
        annualRate: parseFloat(d.rate) || 0,
        planPayment: parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0,
        color: debtColor(i, consumerDebts.length),
      }))
      .filter(d => d.balance > 0 && d.planPayment > 0)
    return simulateDebtPayoff(inputs, surplus, mode as 'snowball' | 'avalanche')
  }, [consumerDebts, surplus, mode])

  const activeItems = mode !== 'plan' && whatIfItems.length > 0 ? whatIfItems : planItems
  const activeMaxMonths = activeItems.length > 0 ? Math.max(...activeItems.map(d => d.months)) : 0
  const activeTotalInterest = activeItems.reduce((s, d) => s + d.totalInterest, 0)
  const monthsSaved = planMaxMonths - activeMaxMonths
  const interestSaved = planTotalInterest - activeTotalInterest

  const nwpMonths = computeNetWorthPositiveMonths({
    savingsBalance: liquidSavingsBalance,
    retirementBalance,
    monthlyContrib,
    totalDebtBalance,
    monthlyDebtPayment: debtPlanTotal,
  })

  if (consumerDebts.length === 0) {
    return <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#10b981' }}>✓ No consumer debt</div>
  }
  if (planMaxMonths === 0) {
    return <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#3a5a7a' }}>Add payment amounts to see the payoff timeline.</div>
  }

  const now = new Date()
  // Timeline scale is always fixed to plan so what-if markers visibly move left
  const timelineMonths = Math.ceil(planMaxMonths * 1.1)

  const w = 380
  const axisY = 78
  const h = 165
  const padL = 16
  const padR = 16

  function monthsToX(months: number) {
    return padL + (months / timelineMonths) * (w - padL - padR)
  }
  function monthLabel(months: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1)
    const mon = d.toLocaleDateString('en-US', { month: 'short' })
    const yr = d.getFullYear().toString().slice(-2)
    return `${mon} '${yr}`
  }

  const tickInterval = timelineMonths <= 18 ? 3 : timelineMonths <= 36 ? 6 : timelineMonths <= 72 ? 12 : 24
  const ticks: number[] = []
  for (let m = tickInterval; m < timelineMonths; m += tickInterval) {
    if ((planMaxMonths - m) / timelineMonths < 0.09) continue
    ticks.push(m)
  }

  const showNwp = nwpMonths !== null && nwpMonths > 3 && nwpMonths < timelineMonths

  const btnStyle = (m: Mode) => ({
    fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
    background: mode === m ? 'rgba(13,148,136,0.18)' : 'none',
    border: `1px solid ${mode === m ? '#0d9488' : 'rgba(13,148,136,0.2)'}`,
    color: mode === m ? '#5aabab' : '#2e7a7a',
  })

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-2 justify-end">
        <button style={btnStyle('plan')} onClick={() => setMode('plan')}>Plan</button>
        {surplus > 0 && <>
          <button style={btnStyle('snowball')} onClick={() => setMode('snowball')}>Snowball</button>
          <button style={btnStyle('avalanche')} onClick={() => setMode('avalanche')}>Avalanche</button>
        </>}
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        <line x1={padL} y1={axisY} x2={w - padR} y2={axisY} stroke="#1a2840" strokeWidth={1.5} />

        {/* X-axis ticks + labels */}
        {ticks.map(m => (
          <g key={m}>
            <line x1={monthsToX(m)} y1={axisY - 4} x2={monthsToX(m)} y2={axisY + 4} stroke="#2a3d55" strokeWidth={1} />
            <text x={monthsToX(m)} y={axisY + 13} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">{monthLabel(m)}</text>
          </g>
        ))}
        <text x={monthsToX(planMaxMonths)} y={axisY + 13} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
          {monthLabel(planMaxMonths)}
        </text>

        {/* Now marker */}
        <circle cx={monthsToX(0)} cy={axisY} r={3} fill="#8b9cb5" />
        <line x1={monthsToX(0)} y1={axisY - 4} x2={monthsToX(0)} y2={axisY - 44}
          stroke="#8b9cb5" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
        <text x={monthsToX(0)} y={axisY - 47} textAnchor="middle" fontSize={9} fill="#8b9cb5" fontWeight={600}>Now</text>

        {/* Net-worth-positive */}
        {showNwp && (
          <g>
            <circle cx={monthsToX(nwpMonths!)} cy={axisY} r={3} fill="#60a5fa" />
            <line x1={monthsToX(nwpMonths!)} y1={axisY + 3} x2={monthsToX(nwpMonths!)} y2={axisY + 30}
              stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
            <text x={monthsToX(nwpMonths!)} y={axisY + 39} textAnchor="middle" fontSize={8} fill="#60a5fa">Net-worth+</text>
            <text x={monthsToX(nwpMonths!)} y={axisY + 48} textAnchor="middle" fontSize={7} fill="#3a5a7a">assets &gt; debt</text>
          </g>
        )}

        {/* Ghost plan debt-free marker when in what-if mode */}
        {mode !== 'plan' && monthsSaved > 0 && (
          <g>
            <circle cx={monthsToX(planMaxMonths)} cy={axisY} r={3} fill="#10b981" fillOpacity={0.25} />
            <line x1={monthsToX(planMaxMonths)} y1={axisY - 4} x2={monthsToX(planMaxMonths)} y2={axisY - 30}
              stroke="#10b981" strokeWidth={1} strokeOpacity={0.15} strokeDasharray="3 2" />
            <text x={monthsToX(planMaxMonths)} y={axisY - 33} textAnchor="middle" fontSize={7.5} fill="#10b981" fillOpacity={0.3}>
              Plan
            </text>
          </g>
        )}

        {/* Per-debt stems + dots */}
        {activeItems.map((d, i) => {
          if (d.months === activeMaxMonths) return null
          const x = monthsToX(d.months)
          const above = i % 2 === 0
          const nameY = above ? axisY - 16 : axisY + 28
          const stemY1 = above ? axisY - 3 : axisY + 3
          const stemY2 = above ? nameY + 4 : nameY - 4
          const nameShort = d.name.length > 15 ? d.name.slice(0, 14) + '…' : d.name
          return (
            <g key={`di-${i}`}>
              <line x1={x} y1={stemY1} x2={x} y2={stemY2}
                stroke={d.color} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="2 2" />
              <circle cx={x} cy={axisY} r={2.5} fill={d.color} fillOpacity={0.8} />
              <text x={x} y={nameY} textAnchor="middle" fontSize={7} fill={d.color} fillOpacity={0.9}>{nameShort}</text>
            </g>
          )
        })}

        {/* Active debt-free marker */}
        {activeMaxMonths > 0 && (
          <g>
            <circle cx={monthsToX(activeMaxMonths)} cy={axisY} r={4} fill="#10b981" />
            <line x1={monthsToX(activeMaxMonths)} y1={axisY - 4} x2={monthsToX(activeMaxMonths)} y2={axisY - 44}
              stroke="#10b981" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
            <text x={monthsToX(activeMaxMonths)} y={axisY - 47} textAnchor="middle" fontSize={9} fill="#10b981" fontWeight={700}>
              Debt-free
            </text>
            <text x={monthsToX(activeMaxMonths)} y={axisY - 36} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
              {fmt(totalDebtBalance)} paid
            </text>
          </g>
        )}
      </svg>

      {/* Stats bar */}
      <div className="mt-1 pt-2" style={{ borderTop: '1px solid rgba(13,148,136,0.1)' }}>
        <div className="flex gap-4">
          {activeTotalInterest > 0 && (
            <span style={{ fontSize: 10, color: '#7a5050' }}>{fmt(Math.round(activeTotalInterest))} in interest</span>
          )}
          {debtPlanTotal > 0 && activeMaxMonths > 0 && (
            <span style={{ fontSize: 10, color: '#10b981' }}>+{fmt(debtPlanTotal)}/mo freed at debt-free</span>
          )}
        </div>

        {/* What-if comparison */}
        {mode !== 'plan' && monthsSaved > 0 && (
          <div className="flex gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(13,148,136,0.08)' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e7a7a' }}>
              vs Plan:
            </span>
            <span style={{ fontSize: 10, color: '#34d399' }}>
              {monthsSaved} month{monthsSaved !== 1 ? 's' : ''} sooner
            </span>
            {interestSaved > 0 && (
              <span style={{ fontSize: 10, color: '#34d399' }}>
                {fmt(Math.round(interestSaved))} less interest
              </span>
            )}
            <span style={{ fontSize: 10, color: '#2e7a7a' }}>
              ({fmt(surplus)}/mo surplus applied)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
