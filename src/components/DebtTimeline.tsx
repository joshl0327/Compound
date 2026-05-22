import { useMemo } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff, debtColor } from '../lib/calculations'
import type { AppData } from '../types'
import { fmt } from '../lib/format'

interface Milestone {
  label: string
  age: number
  above: boolean
  color: string
  sub?: string
}

interface DebtTimelineProps {
  data: AppData
  liquidSavingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  debtPlanTotal: number
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal }: DebtTimelineProps) {
  const primaryW2 = data.income.sources.find(s => s.type === 'w2' && (s.retirement?.currentAge ?? ''))
  const currentAge = parseInt(primaryW2?.retirement?.currentAge || '0')
  const targetAge = parseInt(primaryW2?.retirement?.targetAge || '65')

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  if (!currentAge || !targetAge || currentAge >= targetAge) {
    return (
      <div className="flex items-center justify-center h-32 text-center text-[12px]" style={{ color: '#3a5a7a' }}>
        Enter your current age in Invest &amp; Retire<br />to see your debt-free timeline.
      </div>
    )
  }

  const ageRange = targetAge - currentAge

  const maxPayoffMonths = consumerDebts.length > 0
    ? Math.max(...consumerDebts.map(d => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        return result ? result.months : 0
      }))
    : 0
  const debtFreeAge = currentAge + maxPayoffMonths / 12

  const nwpMonths = computeNetWorthPositiveMonths({
    savingsBalance: liquidSavingsBalance,
    retirementBalance,
    monthlyContrib,
    totalDebtBalance,
    monthlyDebtPayment: debtPlanTotal,
  })
  const nwpAge = nwpMonths !== null ? currentAge + nwpMonths / 12 : null

  // Per-debt payoff data
  const debtItems = useMemo(() => {
    return consumerDebts
      .map((d, i) => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        if (!result || result.months <= 0) return null
        return {
          name: d.name,
          payoffAge: currentAge + result.months / 12,
          totalInterest: result.totalInterest,
          color: debtColor(i, consumerDebts.length),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.payoffAge - b.payoffAge)
  }, [consumerDebts, currentAge])

  const totalInterest = debtItems.reduce((s, d) => s + d.totalInterest, 0)

  const milestones = useMemo((): Milestone[] => {
    const ms: Milestone[] = []
    ms.push({ label: 'Now', age: currentAge, above: true, color: '#8b9cb5' })

    if (nwpAge !== null && nwpAge > currentAge + 3 && nwpAge < targetAge) {
      ms.push({ label: 'Net-worth+', age: nwpAge, above: false, color: '#60a5fa', sub: 'assets > debt' })
    }

    if (consumerDebts.length === 0) {
      ms.push({ label: '✓ Debt-free', age: currentAge, above: false, color: '#10b981', sub: 'Now' })
    } else if (maxPayoffMonths > 0 && debtFreeAge < targetAge) {
      ms.push({ label: 'Debt-free', age: debtFreeAge, above: true, color: '#10b981', sub: fmt(totalDebtBalance) + ' paid' })
    }

    ms.push({ label: 'Retire', age: targetAge, above: false, color: '#34d399', sub: `Age ${targetAge}` })

    const sorted = ms.sort((a, b) => a.age - b.age)
    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i].age - sorted[i - 1].age) < 2) {
        sorted[i].above = !sorted[i - 1].above
      }
    }
    return sorted
  }, [currentAge, targetAge, nwpAge, maxPayoffMonths, debtFreeAge, consumerDebts.length, totalDebtBalance])

  const w = 380
  const axisY = 70
  const h = 148
  const padL = 20
  const padR = 20

  function ageToX(age: number) {
    return padL + ((age - currentAge) / ageRange) * (w - padL - padR)
  }

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {/* Axis line */}
        <line x1={padL} y1={axisY} x2={w - padR} y2={axisY} stroke="#1a2840" strokeWidth={1.5} />

        {/* Axis age ticks */}
        {[currentAge, targetAge].map(age => (
          <text key={age} x={ageToX(age)} y={h - 6} textAnchor="middle" fontSize={8} fill="#3a5a7a">
            {age}
          </text>
        ))}

        {/* Per-debt stems + dots */}
        {debtItems.map((d, i) => {
          const x = ageToX(d.payoffAge)
          const nameY = axisY + 16 + (i % 2) * 12
          const nameShort = d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name
          return (
            <g key={`di-${i}`}>
              <line x1={x} y1={axisY + 3} x2={x} y2={nameY - 4}
                stroke={d.color} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="2 2" />
              <circle cx={x} cy={axisY} r={2.5} fill={d.color} fillOpacity={0.75} />
              <text x={x} y={nameY} textAnchor="middle" fontSize={6.5} fill={d.color} fillOpacity={0.85}>{nameShort}</text>
            </g>
          )
        })}

        {/* Main milestones */}
        {milestones.map((m, i) => {
          const x = ageToX(m.age)
          const tickLen = 8
          const labelY = m.above ? axisY - tickLen - 22 : axisY + tickLen + 10
          const subY = m.above ? labelY - 11 : labelY + 11
          const stemY1 = m.above ? axisY - tickLen : axisY + tickLen
          const stemY2 = m.above ? labelY + 4 : labelY - 12
          return (
            <g key={i}>
              {/* Dotted stem from axis to label */}
              <line x1={x} y1={stemY1} x2={x} y2={stemY2}
                stroke={m.color} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
              <circle cx={x} cy={axisY} r={3} fill={m.color} />
              <text x={x} y={labelY} textAnchor="middle" fontSize={9} fill={m.color} fontWeight={600}>
                {m.label}
              </text>
              {m.sub && (
                <text x={x} y={subY} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
                  {m.sub}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Stats bar */}
      {(totalInterest > 0 || (debtPlanTotal > 0 && maxPayoffMonths > 0 && debtFreeAge < targetAge)) && (
        <div className="flex gap-4 mt-1 pt-2" style={{ borderTop: '1px solid rgba(13,148,136,0.1)' }}>
          {totalInterest > 0 && (
            <span style={{ fontSize: 10, color: '#7a5050' }}>
              {fmt(Math.round(totalInterest))} in interest
            </span>
          )}
          {debtPlanTotal > 0 && maxPayoffMonths > 0 && debtFreeAge < targetAge && (
            <span style={{ fontSize: 10, color: '#10b981' }}>
              +{fmt(debtPlanTotal)}/mo freed at debt-free
            </span>
          )}
        </div>
      )}
    </div>
  )
}
