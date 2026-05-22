import { useMemo, useState } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff, debtColor } from '../lib/calculations'
import type { AppData } from '../types'
import { fmt, fmtShort } from '../lib/format'

interface DebtTimelineProps {
  data: AppData
  liquidSavingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  debtPlanTotal: number
  surplus: number
}

type Mode = 'plan' | 'snowball' | 'avalanche'

interface DebtSeries {
  name: string
  color: string
  monthlyBalances: number[]  // index = month offset from now
}

// Build per-debt monthly balance arrays for all three modes
function buildMonthlyBalances(
  debts: { name: string; balance: number; annualRate: number; planPayment: number; color: string }[],
  mode: Mode,
  extra: number,
  nMonths: number,
): DebtSeries[] {
  if (mode === 'plan' || extra <= 0) {
    return debts.map(d => {
      const rate = d.annualRate / 100 / 12
      let b = d.balance
      const arr = [b]
      for (let m = 1; m <= nMonths; m++) {
        b = b > 0 ? Math.max(0, b + b * rate - d.planPayment) : 0
        arr.push(b)
      }
      return { name: d.name, color: d.color, monthlyBalances: arr }
    })
  }

  const sorted = mode === 'snowball'
    ? [...debts].sort((a, b) => a.balance - b.balance)
    : [...debts].sort((a, b) => b.annualRate - a.annualRate)

  const n = sorted.length
  const balances = sorted.map(d => d.balance)
  const history = sorted.map(d => [d.balance] as number[])
  const monthlyRates = sorted.map(d => d.annualRate / 100 / 12)
  let rollingExtra = extra

  for (let m = 1; m <= nMonths; m++) {
    const targetIdx = balances.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (balances[i] <= 0.01) { history[i].push(0); continue }
      const interest = balances[i] * monthlyRates[i]
      balances[i] = balances[i] + interest
      const payment = Math.min(sorted[i].planPayment + (i === targetIdx ? rollingExtra : 0), balances[i])
      balances[i] = Math.max(0, balances[i] - payment)
      if (balances[i] < 0.01) { balances[i] = 0; rollingExtra += sorted[i].planPayment }
      history[i].push(balances[i])
    }
  }

  return sorted.map((d, i) => ({ name: d.name, color: d.color, monthlyBalances: history[i] }))
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal, surplus }: DebtTimelineProps) {
  const [mode, setMode] = useState<Mode>('plan')

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  // Analytical payoff months per debt (for stats + scale)
  const planItems = useMemo(() => {
    return consumerDebts
      .map((d, i) => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        if (!result || result.months <= 0) return null
        return { name: d.name, months: result.months, totalInterest: result.totalInterest, color: debtColor(i, consumerDebts.length) }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.months - b.months)
  }, [consumerDebts])

  const planMaxMonths = planItems.length > 0 ? planItems[planItems.length - 1].months : 0
  const planTotalInterest = planItems.reduce((s, d) => s + d.totalInterest, 0)

  // Chart data: month-by-month balances per debt
  const simInputs = useMemo(() => consumerDebts.map((d, i) => ({
    name: d.name,
    balance: parseFloat(d.balance) || 0,
    annualRate: parseFloat(d.rate) || 0,
    planPayment: parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0,
    color: debtColor(i, consumerDebts.length),
  })).filter(d => d.balance > 0 && d.planPayment > 0), [consumerDebts])

  const seriesData = useMemo(() => {
    if (planMaxMonths === 0) return []
    return buildMonthlyBalances(simInputs, mode, surplus, planMaxMonths)
  }, [simInputs, mode, surplus, planMaxMonths])

  // What-if max payoff (for comparison stats)
  const whatIfItems = useMemo(() => {
    if (mode === 'plan' || surplus <= 0 || seriesData.length === 0) return planItems
    return seriesData.map(s => ({
      name: s.name,
      months: s.monthlyBalances.findIndex(b => b < 0.01) || planMaxMonths,
      totalInterest: s.monthlyBalances.reduce((sum, b, i, arr) => {
        if (i === 0) return sum
        const rate = (simInputs.find(d => d.name === s.name)?.annualRate ?? 0) / 100 / 12
        return sum + arr[i - 1] * rate
      }, 0),
      color: s.color,
    }))
  }, [seriesData, mode, surplus, planItems, planMaxMonths, simInputs])

  const activeMaxMonths = mode !== 'plan' && surplus > 0
    ? Math.max(...whatIfItems.map(d => d.months === 0 ? planMaxMonths : d.months), 1)
    : planMaxMonths
  const activeTotalInterest = mode !== 'plan' && surplus > 0
    ? whatIfItems.reduce((s, d) => s + d.totalInterest, 0)
    : planTotalInterest
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
    return <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#10b981' }}>✓ No consumer debt</div>
  }
  if (planMaxMonths === 0) {
    return <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#3a5a7a' }}>Add payment amounts to see the payoff chart.</div>
  }

  // ── Chart geometry ──
  const w = 380
  const padL = 40
  const padR = 12
  const padT = 8
  const padB = 22
  const cW = w - padL - padR
  const cH = 120
  const h = cH + padT + padB

  const now = new Date()
  const step = planMaxMonths <= 36 ? 1 : planMaxMonths <= 72 ? 2 : 3
  const sampleMonths: number[] = []
  for (let m = 0; m <= planMaxMonths; m += step) sampleMonths.push(m)
  if (sampleMonths[sampleMonths.length - 1] !== planMaxMonths) sampleMonths.push(planMaxMonths)

  const maxY = totalDebtBalance || 1

  function toX(month: number) { return padL + (month / planMaxMonths) * cW }
  function toY(balance: number) { return padT + cH - (balance / maxY) * cH }

  function monthLabel(months: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1)
    const mon = d.toLocaleDateString('en-US', { month: 'short' })
    const yr = d.getFullYear().toString().slice(-2)
    return `${mon} '${yr}`
  }

  // Stack debts: largest starting balance at bottom for stability
  const stackOrder = [...seriesData].sort((a, b) =>
    (b.monthlyBalances[0] ?? 0) - (a.monthlyBalances[0] ?? 0)
  )

  // Build stacked polygon paths
  // cumulative[sampleIdx] = total balance at that sample point (bottom to current layer)
  const stackedPolygons = stackOrder.map((series, layerIdx) => {
    const lowerCumulative = stackOrder
      .slice(0, layerIdx)
      .map(lower => sampleMonths.map(m => lower.monthlyBalances[m] ?? 0))

    const topPoints = sampleMonths.map((m, si) => {
      const cumBelow = lowerCumulative.reduce((sum, arr) => sum + (arr[si] ?? 0), 0)
      const own = series.monthlyBalances[m] ?? 0
      return { x: toX(m), y: toY(cumBelow + own) }
    })
    const bottomPoints = sampleMonths.map((m, si) => {
      const cumBelow = lowerCumulative.reduce((sum, arr) => sum + (arr[si] ?? 0), 0)
      return { x: toX(m), y: toY(cumBelow) }
    })

    const pts = [
      ...topPoints,
      ...bottomPoints.slice().reverse(),
    ].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    // Label: midpoint of band at x=0 if band is tall enough
    const midY0 = (topPoints[0].y + bottomPoints[0].y) / 2
    const bandHeight = bottomPoints[0].y - topPoints[0].y
    const nameShort = series.name.length > 14 ? series.name.slice(0, 13) + '…' : series.name

    return { pts, color: series.color, midY0, bandHeight, nameShort }
  })

  // X-axis tick marks
  const tickInterval = planMaxMonths <= 18 ? 3 : planMaxMonths <= 36 ? 6 : planMaxMonths <= 72 ? 12 : 24
  const ticks: number[] = []
  for (let m = tickInterval; m < planMaxMonths; m += tickInterval) {
    if ((planMaxMonths - m) / planMaxMonths < 0.08) continue
    ticks.push(m)
  }

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({ value: maxY * pct, y: toY(maxY * pct) }))

  const btnStyle = (m: Mode) => ({
    fontSize: 9, fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    padding: '2px 8px', borderRadius: 3, cursor: 'pointer' as const,
    background: mode === m ? 'rgba(13,148,136,0.18)' : 'none',
    border: `1px solid ${mode === m ? '#0d9488' : 'rgba(13,148,136,0.2)'}`,
    color: mode === m ? '#5aabab' : '#2e7a7a',
  })

  // NWP marker x position
  const showNwp = nwpMonths !== null && nwpMonths > 0 && nwpMonths <= planMaxMonths

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

      <svg width="100%" viewBox={`0 0 ${w} ${h + 1}`}>
        {/* Y-axis grid + labels */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="#1a2840" strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#3a5a7a">{fmtShort(value)}</text>
          </g>
        ))}

        {/* Stacked area polygons */}
        {stackedPolygons.map((p, i) => (
          <g key={i}>
            <polygon points={p.pts} fill={p.color} fillOpacity={0.22} stroke={p.color} strokeWidth={0.5} strokeOpacity={0.5} />
            {p.bandHeight > 14 && (
              <text x={padL + 5} y={p.midY0 + 3} fontSize={6.5} fill={p.color} fillOpacity={0.8}>{p.nameShort}</text>
            )}
          </g>
        ))}

        {/* NWP vertical marker */}
        {showNwp && (
          <g>
            <line x1={toX(nwpMonths!)} y1={padT} x2={toX(nwpMonths!)} y2={padT + cH}
              stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
            <text x={toX(nwpMonths!) + 3} y={padT + 10} fontSize={7} fill="#60a5fa">Net-worth+</text>
          </g>
        )}

        {/* X-axis baseline */}
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="#1a2840" strokeWidth={1.5} />

        {/* X-axis ticks + labels */}
        {ticks.map(m => (
          <g key={m}>
            <line x1={toX(m)} y1={padT + cH} x2={toX(m)} y2={padT + cH + 4} stroke="#2a3d55" strokeWidth={1} />
            <text x={toX(m)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">{monthLabel(m)}</text>
          </g>
        ))}
        <text x={toX(planMaxMonths)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">
          {monthLabel(planMaxMonths)}
        </text>
        <text x={toX(0)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#3a5a7a">Now</text>
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
        {mode !== 'plan' && monthsSaved > 0 && (
          <div className="flex gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(13,148,136,0.08)' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e7a7a' }}>vs Plan:</span>
            <span style={{ fontSize: 10, color: '#34d399' }}>{monthsSaved} month{monthsSaved !== 1 ? 's' : ''} sooner</span>
            {interestSaved > 0 && <span style={{ fontSize: 10, color: '#34d399' }}>{fmt(Math.round(interestSaved))} less interest</span>}
            <span style={{ fontSize: 10, color: '#2e7a7a' }}>({fmt(surplus)}/mo surplus applied)</span>
          </div>
        )}
      </div>
    </div>
  )
}
