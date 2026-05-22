import { useMemo, useState } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff } from '../lib/calculations'
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

interface SimDebt {
  name: string
  balance: number
  annualRate: number
  planPayment: number
  color: string
}

interface DebtSeries {
  name: string
  color: string
  monthlyBalances: number[]
}

// Red → orange gradient: index 0 = bottom (largest, darkest), index n-1 = top (smallest, lightest)
const BAND_COLORS = ['#7f1d1d', '#991b1b', '#b91c1c', '#c2410c', '#ea580c', '#f97316']
function bandColor(idx: number, total: number): string {
  if (total <= 1) return BAND_COLORS[2]
  const pos = Math.round((idx / (total - 1)) * (BAND_COLORS.length - 1))
  return BAND_COLORS[pos]
}

// Quick analytical payoff simulation returning payoff months + total interest per debt
function simulateDebtPayoff(
  debts: SimDebt[],
  extraMonthly: number,
  strategy: 'snowball' | 'avalanche',
): { months: number; totalInterest: number }[] {
  const sorted = strategy === 'snowball'
    ? [...debts].sort((a, b) => a.balance - b.balance)
    : [...debts].sort((a, b) => b.annualRate - a.annualRate)

  const n = sorted.length
  const balances = sorted.map(d => d.balance)
  const rates = sorted.map(d => d.annualRate / 100 / 12)
  const interests = new Array<number>(n).fill(0)
  const payoffMonths = new Array<number>(n).fill(0)
  let extra = extraMonthly
  let month = 0

  while (balances.some(b => b > 0.01) && month < 600) {
    month++
    const target = balances.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (balances[i] <= 0.01) continue
      const int = balances[i] * rates[i]
      interests[i] += int
      balances[i] += int
      const pay = Math.min(sorted[i].planPayment + (i === target ? extra : 0), balances[i])
      balances[i] = Math.max(0, balances[i] - pay)
      if (balances[i] < 0.01) { balances[i] = 0; if (!payoffMonths[i]) payoffMonths[i] = month; extra += sorted[i].planPayment }
    }
  }
  return sorted.map((_, i) => ({ months: payoffMonths[i] || month, totalInterest: interests[i] }))
}

// Month-by-month balance arrays for chart rendering
function buildMonthlyBalances(debts: SimDebt[], mode: Mode, extra: number, nMonths: number): DebtSeries[] {
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
  const rates = sorted.map(d => d.annualRate / 100 / 12)
  let rollingExtra = extra

  for (let m = 1; m <= nMonths; m++) {
    const target = balances.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (balances[i] <= 0.01) { history[i].push(0); continue }
      const int = balances[i] * rates[i]
      balances[i] += int
      const pay = Math.min(sorted[i].planPayment + (i === target ? rollingExtra : 0), balances[i])
      balances[i] = Math.max(0, balances[i] - pay)
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

  const simInputs = useMemo((): SimDebt[] =>
    consumerDebts.map((d, i) => ({
      name: d.name,
      balance: parseFloat(d.balance) || 0,
      annualRate: parseFloat(d.rate) || 0,
      planPayment: parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0,
      color: `debt-${i}`,
    })).filter(d => d.balance > 0 && d.planPayment > 0),
  [consumerDebts])

  // Plan stats (analytical)
  const planItems = useMemo(() =>
    consumerDebts.map(d => {
      const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
      return calcPayoff(d.balance, d.rate, pay)
    }).filter(Boolean) as { months: number; totalInterest: number }[],
  [consumerDebts])

  const planMaxMonths = planItems.length > 0 ? Math.max(...planItems.map(r => r.months)) : 0
  const planTotalInterest = planItems.reduce((s, r) => s + r.totalInterest, 0)

  // What-if stats + active x-axis length
  const whatIfStats = useMemo(() => {
    if (mode === 'plan' || surplus <= 0 || simInputs.length === 0) return null
    const results = simulateDebtPayoff(simInputs, surplus, mode as 'snowball' | 'avalanche')
    return {
      maxMonths: Math.max(...results.map(r => r.months)),
      totalInterest: results.reduce((s, r) => s + r.totalInterest, 0),
    }
  }, [simInputs, mode, surplus])

  const activeMaxMonths = whatIfStats?.maxMonths ?? planMaxMonths
  const activeTotalInterest = whatIfStats?.totalInterest ?? planTotalInterest
  const monthsSaved = planMaxMonths - activeMaxMonths
  const interestSaved = planTotalInterest - activeTotalInterest

  const seriesData = useMemo(() => {
    if (activeMaxMonths === 0) return []
    return buildMonthlyBalances(simInputs, mode, surplus, activeMaxMonths)
  }, [simInputs, mode, surplus, activeMaxMonths])

  const nwpMonths = computeNetWorthPositiveMonths({
    savingsBalance: liquidSavingsBalance, retirementBalance, monthlyContrib,
    totalDebtBalance, monthlyDebtPayment: debtPlanTotal,
  })

  if (consumerDebts.length === 0) return (
    <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#10b981' }}>✓ No consumer debt</div>
  )
  if (planMaxMonths === 0) return (
    <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#3a5a7a' }}>Add payment amounts to see the payoff chart.</div>
  )

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
  const nMonths = activeMaxMonths
  const step = nMonths <= 36 ? 1 : nMonths <= 72 ? 2 : 3
  const samples: number[] = []
  for (let m = 0; m <= nMonths; m += step) samples.push(m)
  if (samples[samples.length - 1] !== nMonths) samples.push(nMonths)

  const maxY = totalDebtBalance || 1

  function toX(m: number) { return padL + (m / nMonths) * cW }
  function toY(b: number) { return padT + cH - (b / maxY) * cH }
  function monthLabel(months: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1)
    return `${d.toLocaleDateString('en-US', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`
  }

  // Stack: largest starting balance at bottom, smallest at top
  const stackOrder = [...seriesData].sort((a, b) =>
    (b.monthlyBalances[0] ?? 0) - (a.monthlyBalances[0] ?? 0)
  )
  const totalLayers = stackOrder.length

  const stackedPolygons = stackOrder.map((series, layerIdx) => {
    const color = bandColor(layerIdx, totalLayers)
    const lowerSeries = stackOrder.slice(0, layerIdx)

    const topPts = samples.map((m, si) => {
      const below = lowerSeries.reduce((s, l) => s + (l.monthlyBalances[m] ?? 0), 0)
      return { x: toX(m), y: toY(below + (series.monthlyBalances[m] ?? 0)) }
    })
    const botPts = samples.map((m, si) => {
      const below = lowerSeries.reduce((s, l) => s + (l.monthlyBalances[m] ?? 0), 0)
      return { x: toX(m), y: toY(below) }
    })

    const pts = [...topPts, ...botPts.slice().reverse()]
      .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    const midY = (topPts[0].y + botPts[0].y) / 2
    const bandH = botPts[0].y - topPts[0].y
    const label = series.name.length > 14 ? series.name.slice(0, 13) + '…' : series.name

    return { pts, color, midY, bandH, label }
  })

  // X-axis ticks
  const tickInterval = nMonths <= 18 ? 3 : nMonths <= 36 ? 6 : nMonths <= 72 ? 12 : 24
  const ticks: number[] = []
  for (let m = tickInterval; m < nMonths; m += tickInterval) {
    if ((nMonths - m) / nMonths < 0.08) continue
    ticks.push(m)
  }

  // Y-axis
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({ value: maxY * pct, y: toY(maxY * pct) }))
  const showNwp = nwpMonths !== null && nwpMonths > 0 && nwpMonths <= nMonths

  const btnStyle = (m: Mode) => ({
    fontSize: 9, fontWeight: 600 as const, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 3, cursor: 'pointer' as const,
    background: mode === m ? 'rgba(220,38,38,0.12)' : 'none',
    border: `1px solid ${mode === m ? '#dc2626' : 'rgba(220,38,38,0.2)'}`,
    color: mode === m ? '#f87171' : '#7a4040',
  })

  return (
    <div>
      <div className="flex gap-1 mb-2 justify-end">
        <button style={btnStyle('plan')} onClick={() => setMode('plan')}>Plan</button>
        {surplus > 0 && <>
          <button style={btnStyle('snowball')} onClick={() => setMode('snowball')}>Snowball</button>
          <button style={btnStyle('avalanche')} onClick={() => setMode('avalanche')}>Avalanche</button>
        </>}
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {/* Y-axis grid + labels */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="#1a2020" strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#5a3a3a">{fmtShort(value)}</text>
          </g>
        ))}

        {/* Stacked bands */}
        {stackedPolygons.map((p, i) => (
          <g key={i}>
            <polygon points={p.pts} fill={p.color} fillOpacity={0.25} stroke={p.color} strokeWidth={0.5} strokeOpacity={0.6} />
            {p.bandH > 14 && (
              <text x={padL + 5} y={p.midY + 3} fontSize={6.5} fill={p.color} fillOpacity={0.9}>{p.label}</text>
            )}
          </g>
        ))}

        {/* Net-worth+ marker */}
        {showNwp && (
          <g>
            <line x1={toX(nwpMonths!)} y1={padT} x2={toX(nwpMonths!)} y2={padT + cH}
              stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 3" />
            <text x={toX(nwpMonths!) + 3} y={padT + 10} fontSize={7} fill="#60a5fa">Net-worth+</text>
          </g>
        )}

        {/* X-axis baseline */}
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="#2a1a1a" strokeWidth={1.5} />

        {/* X-axis ticks + labels */}
        <text x={toX(0)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#5a3a3a">Now</text>
        {ticks.map(m => (
          <g key={m}>
            <line x1={toX(m)} y1={padT + cH} x2={toX(m)} y2={padT + cH + 4} stroke="#3a2020" strokeWidth={1} />
            <text x={toX(m)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#5a3a3a">{monthLabel(m)}</text>
          </g>
        ))}
        <text x={toX(nMonths)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="#5a3a3a">{monthLabel(nMonths)}</text>
      </svg>

      {/* Stats */}
      <div className="mt-1 pt-2" style={{ borderTop: '1px solid rgba(220,38,38,0.12)' }}>
        <div className="flex gap-4">
          {activeTotalInterest > 0 && (
            <span style={{ fontSize: 10, color: '#7a4040' }}>{fmt(Math.round(activeTotalInterest))} in interest</span>
          )}
          {debtPlanTotal > 0 && activeMaxMonths > 0 && (
            <span style={{ fontSize: 10, color: '#10b981' }}>+{fmt(debtPlanTotal)}/mo freed at debt-free</span>
          )}
        </div>
        {mode !== 'plan' && monthsSaved > 0 && (
          <div className="flex gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(220,38,38,0.08)' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a4040' }}>vs Plan:</span>
            <span style={{ fontSize: 10, color: '#34d399' }}>{monthsSaved} month{monthsSaved !== 1 ? 's' : ''} sooner</span>
            {interestSaved > 0 && <span style={{ fontSize: 10, color: '#34d399' }}>{fmt(Math.round(interestSaved))} less interest</span>}
            <span style={{ fontSize: 10, color: '#5a3a3a' }}>({fmt(surplus)}/mo surplus applied)</span>
          </div>
        )}
      </div>
    </div>
  )
}
