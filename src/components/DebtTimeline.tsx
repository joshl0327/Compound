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
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal }: DebtTimelineProps) {
  const [payMode, setPayMode] = useState<'plan' | 'min'>('plan')

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  const hasToggle = consumerDebts.some(d => {
    const plan = parseFloat(d.planPayment || '') || 0
    const min = parseFloat(d.minPayment) || 0
    return plan > 0 && plan !== min
  })

  const debtItems = useMemo(() => {
    return consumerDebts
      .map((d, i) => {
        const pay = payMode === 'plan'
          ? (parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0)
          : (parseFloat(d.minPayment) || 0)
        const result = calcPayoff(d.balance, d.rate, pay)
        if (!result || result.months <= 0) return null
        return {
          name: d.name,
          months: result.months,
          totalInterest: result.totalInterest,
          color: debtColor(i, consumerDebts.length),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.months - b.months)
  }, [consumerDebts, payMode])

  const totalInterest = debtItems.reduce((s, d) => s + d.totalInterest, 0)
  const maxPayoffMonths = debtItems.length > 0 ? debtItems[debtItems.length - 1].months : 0

  const nwpMonths = computeNetWorthPositiveMonths({
    savingsBalance: liquidSavingsBalance,
    retirementBalance,
    monthlyContrib,
    totalDebtBalance,
    monthlyDebtPayment: debtPlanTotal,
  })

  if (consumerDebts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#10b981' }}>
        ✓ No consumer debt
      </div>
    )
  }

  if (maxPayoffMonths === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#3a5a7a' }}>
        Add payment amounts to see the payoff timeline.
      </div>
    )
  }

  const now = new Date()
  const timelineMonths = Math.ceil(maxPayoffMonths * 1.1) // 10% right padding

  const w = 380
  const axisY = 62
  const h = 140
  const padL = 16
  const padR = 16

  function monthsToX(months: number) {
    return padL + (months / timelineMonths) * (w - padL - padR)
  }

  function monthLabel(months: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1)
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // X-axis tick interval based on range
  const tickInterval = timelineMonths <= 18 ? 3 : timelineMonths <= 36 ? 6 : timelineMonths <= 72 ? 12 : 24
  const ticks: number[] = []
  for (let m = tickInterval; m < timelineMonths; m += tickInterval) ticks.push(m)

  const showNwp = nwpMonths !== null && nwpMonths > 3 && nwpMonths < timelineMonths

  return (
    <div>
      {/* Min / Plan toggle */}
      {hasToggle && (
        <div className="flex gap-1 mb-2 justify-end">
          {(['plan', 'min'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setPayMode(mode)}
              style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
                background: payMode === mode ? 'rgba(13,148,136,0.18)' : 'none',
                border: `1px solid ${payMode === mode ? '#0d9488' : 'rgba(13,148,136,0.2)'}`,
                color: payMode === mode ? '#5aabab' : '#2e7a7a',
              }}
            >{mode}</button>
          ))}
        </div>
      )}

      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {/* Axis line */}
        <line x1={padL} y1={axisY} x2={w - padR} y2={axisY} stroke="#1a2840" strokeWidth={1.5} />

        {/* X-axis ticks + date labels */}
        {ticks.map(m => (
          <g key={m}>
            <line x1={monthsToX(m)} y1={axisY - 3} x2={monthsToX(m)} y2={axisY + 3} stroke="#1a2840" strokeWidth={1} />
            <text x={monthsToX(m)} y={h - 4} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">{monthLabel(m)}</text>
          </g>
        ))}
        {/* Always label the end */}
        <text x={monthsToX(maxPayoffMonths)} y={h - 4} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
          {monthLabel(maxPayoffMonths)}
        </text>

        {/* Now marker */}
        <circle cx={monthsToX(0)} cy={axisY} r={3} fill="#8b9cb5" />
        <line x1={monthsToX(0)} y1={axisY - 3} x2={monthsToX(0)} y2={axisY - 18}
          stroke="#8b9cb5" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
        <text x={monthsToX(0)} y={axisY - 21} textAnchor="middle" fontSize={9} fill="#8b9cb5" fontWeight={600}>Now</text>

        {/* Net-worth-positive marker */}
        {showNwp && (
          <g>
            <circle cx={monthsToX(nwpMonths!)} cy={axisY} r={3} fill="#60a5fa" />
            <line x1={monthsToX(nwpMonths!)} y1={axisY + 3} x2={monthsToX(nwpMonths!)} y2={axisY + 18}
              stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
            <text x={monthsToX(nwpMonths!)} y={axisY + 27} textAnchor="middle" fontSize={8} fill="#60a5fa">Net-worth+</text>
            <text x={monthsToX(nwpMonths!)} y={axisY + 36} textAnchor="middle" fontSize={7} fill="#3a5a7a">assets &gt; debt</text>
          </g>
        )}

        {/* Per-debt stems + dots */}
        {debtItems.map((d, i) => {
          const x = monthsToX(d.months)
          const nameY = axisY - 16 - (i % 2) * 12
          const nameShort = d.name.length > 13 ? d.name.slice(0, 12) + '…' : d.name
          return (
            <g key={`di-${i}`}>
              <line x1={x} y1={axisY - 3} x2={x} y2={nameY + 4}
                stroke={d.color} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="2 2" />
              <circle cx={x} cy={axisY} r={2.5} fill={d.color} fillOpacity={0.8} />
              <text x={x} y={nameY} textAnchor="middle" fontSize={7} fill={d.color} fillOpacity={0.9}>{nameShort}</text>
            </g>
          )
        })}

        {/* Debt-free marker */}
        {maxPayoffMonths > 0 && (
          <g>
            <circle cx={monthsToX(maxPayoffMonths)} cy={axisY} r={4} fill="#10b981" />
            <line x1={monthsToX(maxPayoffMonths)} y1={axisY - 4} x2={monthsToX(maxPayoffMonths)} y2={axisY - 22}
              stroke="#10b981" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 2" />
            <text x={monthsToX(maxPayoffMonths)} y={axisY - 25} textAnchor="middle" fontSize={9} fill="#10b981" fontWeight={700}>
              Debt-free
            </text>
            <text x={monthsToX(maxPayoffMonths)} y={axisY - 35} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
              {fmt(totalDebtBalance)} paid
            </text>
          </g>
        )}
      </svg>

      {/* Stats bar */}
      {(totalInterest > 0 || debtPlanTotal > 0) && (
        <div className="flex gap-4 mt-1 pt-2" style={{ borderTop: '1px solid rgba(13,148,136,0.1)' }}>
          {totalInterest > 0 && (
            <span style={{ fontSize: 10, color: '#7a5050' }}>
              {fmt(Math.round(totalInterest))} in interest
            </span>
          )}
          {debtPlanTotal > 0 && maxPayoffMonths > 0 && (
            <span style={{ fontSize: 10, color: '#10b981' }}>
              +{fmt(debtPlanTotal)}/mo freed at debt-free
            </span>
          )}
        </div>
      )}
    </div>
  )
}
