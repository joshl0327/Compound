import { useMemo, useState, useRef } from 'react'
import { computeNetWorthPositiveMonths } from '../lib/sankeyHelpers'
import { calcPayoff, calcPayoffPromo, promoMonthsRemaining } from '../lib/calculations'
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

type Mode = 'minimum' | 'plan' | 'snowball' | 'avalanche'
interface SimDebt {
  name: string; balance: number
  annualRate: number       // effective rate for sorting (post-promo rate for promo debts)
  planPayment: number
  promoMonthsLeft: number  // 0 for non-promo debts
  promoAnnualRate: number  // rate during promo period (0 for non-promo)
  postPromoMinPct: number  // 0.01 for promo debts in min mode (dynamic "1% + interest"), 0 otherwise
}

// 10 hues evenly distributed ~36° apart around the wheel, all at 400-level brightness for dark bg
const BAND_PALETTE = ['#fb923c', '#facc15', '#a3e635', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#7dd3fc']
function bandColor(idx: number, total: number): string {
  if (total <= 1) return BAND_PALETTE[3]
  const pos = Math.round((idx / Math.max(total - 1, 1)) * (BAND_PALETTE.length - 1))
  return BAND_PALETTE[Math.min(pos, BAND_PALETTE.length - 1)]
}

function simulateDebtPayoff(debts: SimDebt[], extra: number, strategy: 'snowball' | 'avalanche'): { months: number; totalInterest: number }[] {
  const sorted = strategy === 'snowball' ? [...debts].sort((a, b) => a.balance - b.balance) : [...debts].sort((a, b) => b.annualRate - a.annualRate)
  const n = sorted.length, bal = sorted.map(d => d.balance)
  const rates = sorted.map(d => d.annualRate / 100 / 12)
  const promoRates = sorted.map(d => d.promoAnnualRate / 100 / 12)
  const promoLeft = sorted.map(d => d.promoMonthsLeft)
  const interests = new Array<number>(n).fill(0), payoffM = new Array<number>(n).fill(0)
  let rolling = extra, month = 0
  while (bal.some(b => b > 0.01) && month < 600) {
    month++
    const target = bal.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (bal[i] <= 0.01) continue
      const rate = month <= promoLeft[i] ? promoRates[i] : rates[i]
      const int = bal[i] * rate; interests[i] += int; bal[i] += int
      const pay = Math.min(sorted[i].planPayment + (i === target ? rolling : 0), bal[i])
      bal[i] = Math.max(0, bal[i] - pay)
      if (bal[i] < 0.01) { bal[i] = 0; if (!payoffM[i]) payoffM[i] = month; rolling += sorted[i].planPayment }
    }
  }
  return sorted.map((_, i) => ({ months: payoffM[i] || month, totalInterest: interests[i] }))
}

function buildMonthlyBalances(debts: SimDebt[], mode: Mode, extra: number, nMonths: number): { name: string; monthlyBalances: number[] }[] {
  const isSimulation = (mode === 'snowball' || mode === 'avalanche') && extra > 0
  if (!isSimulation) {
    return debts.map(d => {
      const rate = d.annualRate / 100 / 12
      const promoRate = d.promoAnnualRate / 100 / 12
      let b = d.balance; const arr = [b]
      for (let m = 1; m <= nMonths; m++) {
        const r = m <= d.promoMonthsLeft ? promoRate : rate
        const pay = (m > d.promoMonthsLeft && d.postPromoMinPct > 0)
          ? Math.max(d.planPayment, b * (d.postPromoMinPct + rate))
          : d.planPayment
        b = b > 0 ? Math.max(0, b + b * r - pay) : 0
        arr.push(b)
      }
      return { name: d.name, monthlyBalances: arr }
    })
  }
  const sorted = mode === 'snowball' ? [...debts].sort((a, b) => a.balance - b.balance) : [...debts].sort((a, b) => b.annualRate - a.annualRate)
  const n = sorted.length, bal = sorted.map(d => d.balance), history = sorted.map(d => [d.balance] as number[])
  const rates = sorted.map(d => d.annualRate / 100 / 12)
  const promoRates = sorted.map(d => d.promoAnnualRate / 100 / 12)
  const promoLeft = sorted.map(d => d.promoMonthsLeft)
  let rolling = extra
  for (let m = 1; m <= nMonths; m++) {
    const target = bal.findIndex(b => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (bal[i] <= 0.01) { history[i].push(0); continue }
      const rate = m <= promoLeft[i] ? promoRates[i] : rates[i]
      const int = bal[i] * rate; bal[i] += int
      const pay = Math.min(sorted[i].planPayment + (i === target ? rolling : 0), bal[i])
      bal[i] = Math.max(0, bal[i] - pay)
      if (bal[i] < 0.01) { bal[i] = 0; rolling += sorted[i].planPayment }
      history[i].push(bal[i])
    }
  }
  return sorted.map((d, i) => ({ name: d.name, monthlyBalances: history[i] }))
}

export default function DebtTimeline({ data, liquidSavingsBalance, retirementBalance, monthlyContrib, debtPlanTotal, surplus }: DebtTimelineProps) {
  const [mode, setMode] = useState<Mode>('plan')
  const [hoverMonth, setHoverMonth] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const totalDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  const toSimDebt = (d: typeof consumerDebts[number], payment: number, dynamicMin = false): SimDebt => ({
    name: d.name,
    balance: parseFloat(d.balance) || 0,
    annualRate: d.isPromo ? parseFloat(d.postPromoRate || '0') || 0 : parseFloat(d.rate) || 0,
    planPayment: payment,
    promoMonthsLeft: d.isPromo && d.promoEndDate ? promoMonthsRemaining(d.promoEndDate) : 0,
    promoAnnualRate: d.isPromo ? parseFloat(d.promoRate || '0') || 0 : parseFloat(d.rate) || 0,
    postPromoMinPct: dynamicMin && d.isPromo && !!d.postPromoRate ? 0.01 : 0,
  })

  const simInputs = useMemo((): SimDebt[] =>
    consumerDebts
      .map(d => toSimDebt(d, parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0))
      .filter(d => d.balance > 0 && d.planPayment > 0), [consumerDebts])

  const simMinInputs = useMemo((): SimDebt[] =>
    consumerDebts
      .map(d => toSimDebt(d, parseFloat(d.minPayment) || 0, true))
      .filter(d => d.balance > 0 && d.planPayment > 0), [consumerDebts])

  const calcForDebt = (d: typeof consumerDebts[number], payment: number) =>
    d.isPromo && d.promoEndDate && d.postPromoRate
      ? calcPayoffPromo(d.balance, parseFloat(d.promoRate || '0') || 0, payment, promoMonthsRemaining(d.promoEndDate), parseFloat(d.postPromoRate) || 0)
      : calcPayoff(d.balance, d.rate, payment)

  // Minimum mode uses dynamic post-promo minimums for promo debts (1% of balance + interest),
  // matching how credit cards actually recalculate after a 0% promo period ends.
  const calcForDebtMin = (d: typeof consumerDebts[number]) => {
    const minPay = parseFloat(d.minPayment) || 0
    return d.isPromo && d.promoEndDate && d.postPromoRate
      ? calcPayoffPromo(d.balance, parseFloat(d.promoRate || '0') || 0, minPay, promoMonthsRemaining(d.promoEndDate), parseFloat(d.postPromoRate) || 0, 0.01)
      : calcPayoff(d.balance, d.rate, minPay)
  }

  const planItems = useMemo(() =>
    consumerDebts.map(d => calcForDebt(d, parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0)).filter(Boolean) as { months: number; totalInterest: number }[],
    [consumerDebts])

  const minItems = useMemo(() =>
    consumerDebts.map(d => calcForDebtMin(d)).filter(Boolean) as { months: number; totalInterest: number }[],
    [consumerDebts])

  const planMaxMonths = planItems.length > 0 ? Math.max(...planItems.map(r => r.months)) : 0
  const planTotalInterest = planItems.reduce((s, r) => s + r.totalInterest, 0)
  const minMaxMonths = minItems.length > 0 ? Math.max(...minItems.map(r => r.months)) : 0
  const minTotalInterest = minItems.reduce((s, r) => s + r.totalInterest, 0)

  const whatIfStats = useMemo(() => {
    if ((mode !== 'snowball' && mode !== 'avalanche') || surplus <= 0 || simInputs.length === 0) return null
    const results = simulateDebtPayoff(simInputs, surplus, mode)
    return { maxMonths: Math.max(...results.map(r => r.months)), totalInterest: results.reduce((s, r) => s + r.totalInterest, 0) }
  }, [simInputs, mode, surplus])

  const activeMaxMonths = mode === 'minimum' ? minMaxMonths : mode === 'plan' ? planMaxMonths : whatIfStats?.maxMonths ?? planMaxMonths
  const activeTotalInterest = mode === 'minimum' ? minTotalInterest : mode === 'plan' ? planTotalInterest : whatIfStats?.totalInterest ?? planTotalInterest

  const activeInputs = mode === 'minimum' ? simMinInputs : simInputs
  const seriesData = useMemo(() => {
    if (activeMaxMonths === 0) return []
    return buildMonthlyBalances(activeInputs, mode, surplus, activeMaxMonths)
  }, [activeInputs, mode, surplus, activeMaxMonths])

  const nwpMonths = computeNetWorthPositiveMonths({ savingsBalance: liquidSavingsBalance, retirementBalance, monthlyContrib, totalDebtBalance, monthlyDebtPayment: debtPlanTotal })

  if (consumerDebts.length === 0) return <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#10b981' }}>✓ No consumer debt</div>
  if (planMaxMonths === 0) return <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Add payment amounts to see the payoff chart.</div>

  // ── Chart geometry ──
  const w = 380, padL = 40, padR = 12, padT = 10, padB = 20, cW = w - padL - padR, cH = 150
  const h = cH + padT + padB
  const nMonths = activeMaxMonths, maxY = totalDebtBalance || 1
  const now = new Date()

  const step = nMonths <= 36 ? 1 : nMonths <= 72 ? 2 : 3
  const samples: number[] = []
  for (let m = 0; m <= nMonths; m += step) samples.push(m)
  if (samples[samples.length - 1] !== nMonths) samples.push(nMonths)

  function toX(m: number) { return padL + (m / nMonths) * cW }
  function toY(b: number) { return padT + cH - (b / maxY) * cH }
  function monthLabel(months: number) {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1)
    return `${d.toLocaleDateString('en-US', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`
  }

  const stackOrder = [...seriesData].sort((a, b) => (b.monthlyBalances[0] ?? 0) - (a.monthlyBalances[0] ?? 0))
  const totalLayers = stackOrder.length

  const bands = stackOrder.map((series, layerIdx) => {
    const color = bandColor(layerIdx, totalLayers)
    const below = stackOrder.slice(0, layerIdx)
    const topPts = samples.map(m => ({ x: toX(m), y: toY(below.reduce((s, l) => s + (l.monthlyBalances[m] ?? 0), 0) + (series.monthlyBalances[m] ?? 0)) }))
    const botPts = samples.map(m => ({ x: toX(m), y: toY(below.reduce((s, l) => s + (l.monthlyBalances[m] ?? 0), 0)) }))
    return {
      color,
      polyPts: [...topPts, ...botPts.slice().reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      topLine: topPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    }
  })

  // Payoff events — sorted by payoff month; debts that never reach zero shown as ongoing
  const payoffEvents = stackOrder.map((series, layerIdx) => {
    const idx = series.monthlyBalances.findIndex(b => b < 0.01)
    const name = series.name.length > 11 ? series.name.slice(0, 10) + '…' : series.name
    const color = bandColor(layerIdx, totalLayers)
    if (idx > 0) return { month: idx, label: monthLabel(idx), name, color }
    const finalBal = series.monthlyBalances[series.monthlyBalances.length - 1] ?? 0
    if (finalBal > 0.01) return { month: nMonths + 1, label: '↑ growing', name, color }
    return null
  }).filter(Boolean).sort((a, b) => a!.month - b!.month) as { month: number; label: string; name: string; color: string }[]

  // Always tick every 12 months (one per year)
  const ticks: number[] = []
  for (let m = 12; m < nMonths; m += 12) { if ((nMonths - m) / nMonths < 0.06) continue; ticks.push(m) }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({ value: maxY * pct, y: toY(maxY * pct) }))
  const showNwp = nwpMonths !== null && nwpMonths > 0 && nwpMonths <= nMonths

  // Comparison vs Min — shown for plan/snowball/avalanche so any mode can be
  // benchmarked against "what if you just paid minimums forever?"
  const minMonthsDiff = minMaxMonths - activeMaxMonths
  const minInterestDiff = minTotalInterest - activeTotalInterest

  // Hover tooltip data
  const hoverData = hoverMonth !== null ? {
    x: toX(hoverMonth),
    label: monthLabel(hoverMonth),
    debts: stackOrder.map((s, i) => ({
      name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
      balance: s.monthlyBalances[Math.min(hoverMonth, s.monthlyBalances.length - 1)] ?? 0,
      color: bandColor(i, totalLayers),
    })).filter(d => d.balance > 0.5),
  } : null

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) * (w / rect.width)
    const m = Math.round(Math.max(0, Math.min(nMonths, (svgX - padL) / cW * nMonths)))
    setHoverMonth(m)
  }

  const btnStyle = (m: Mode) => {
    const isActive = mode === m, disabled = (m === 'snowball' || m === 'avalanche') && surplus <= 0
    return {
      fontSize: 9, fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      padding: '2px 8px', borderRadius: 3, cursor: disabled ? 'default' : 'pointer' as const,
      background: isActive ? 'var(--color-accent-dim)' : 'none',
      border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
      color: isActive ? 'var(--color-accent)' : disabled ? 'var(--color-border)' : 'var(--color-text-dim)',
      opacity: disabled ? 0.4 : 1,
    }
  }

  return (
    <div>
      {/* KPI row (left) + scenario toggle (right) — single header row */}
      <div className="flex items-start justify-between mb-2">
        {activeMaxMonths > 0 && (() => {
          const minPmtTotal = consumerDebts.reduce((s, d) => s + (parseFloat(d.minPayment) || 0), 0)
          const freedMonthly = mode === 'minimum' ? minPmtTotal : mode === 'plan' ? debtPlanTotal : debtPlanTotal + surplus
          return (
            <div className="flex gap-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--color-text-dim)' }}>Debt-free</div>
                <div className="font-mono text-[14px] font-bold" style={{ color: '#10b981' }}>{monthLabel(activeMaxMonths)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--color-text-dim)' }}>Interest paid</div>
                <div className="font-mono text-[14px] font-bold" style={{ color: '#f87171' }}>{fmtShort(Math.round(activeTotalInterest))}</div>
              </div>
              <div style={{ borderRight: mode !== 'minimum' ? '1px solid var(--color-accent-dim)' : 'none', paddingRight: 16, marginRight: 0 }}>
                <div className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--color-text-dim)' }}>Freed/mo</div>
                <div className="font-mono text-[14px] font-bold" style={{ color: '#34d399' }}>+{fmt(Math.round(freedMonthly))}</div>
              </div>
              {mode !== 'minimum' && minMonthsDiff !== 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--color-text-dim)' }}>vs Min</div>
                  <div className="font-mono text-[14px] font-bold" style={{ color: minMonthsDiff >= 0 ? '#34d399' : '#f87171' }}>
                    {minMonthsDiff >= 0 ? '-' : '+'}{Math.abs(minMonthsDiff)}mo
                  </div>
                </div>
              )}
              {mode !== 'minimum' && minInterestDiff !== 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--color-text-dim)' }}>Interest saved</div>
                  <div className="font-mono text-[14px] font-bold" style={{ color: minInterestDiff >= 0 ? '#34d399' : '#f87171' }}>
                    {minInterestDiff >= 0 ? '' : '+'}{fmtShort(Math.round(Math.abs(minInterestDiff)))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
        <div className="flex gap-1 flex-shrink-0">
          {(['minimum', 'plan', 'snowball', 'avalanche'] as Mode[]).map(m => (
            <button key={m} style={btnStyle(m)}
              onClick={() => { if (!((m === 'snowball' || m === 'avalanche') && surplus <= 0)) setMode(m) }}>
              {m === 'minimum' ? 'Min' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverMonth(null)}
        style={{ cursor: 'crosshair' }}>

        {/* Y-axis grid + labels */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{fmtShort(value)}</text>
          </g>
        ))}

        {/* Band fills */}
        {bands.map((b, i) => <polygon key={i} points={b.polyPts} fill={b.color} fillOpacity={0.45} />)}
        {/* Top-edge strokes */}
        {bands.map((b, i) => <polyline key={`e${i}`} points={b.topLine} fill="none" stroke={b.color} strokeWidth={1.5} strokeOpacity={0.8} />)}

        {/* Net-worth+ */}
        {showNwp && (
          <g>
            <line x1={toX(nwpMonths!)} y1={padT} x2={toX(nwpMonths!)} y2={padT + cH} stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
            <text x={toX(nwpMonths!) + 3} y={padT + 9} fontSize={7} fill="#60a5fa">Net-worth+</text>
          </g>
        )}

        {/* X-axis baseline */}
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="var(--color-border)" strokeWidth={1.5} />


        {/* Payoff summary legend — top-right empty space */}
        {payoffEvents.length > 0 && (() => {
          const lineH = 10
          const legX = padL + cW - 4
          const legY = padT + 8
          return (
            <g>
              {payoffEvents.map((evt, i) => {
                const name = evt.name.length > 14 ? evt.name.slice(0, 13) + '…' : evt.name
                const ty = legY + i * lineH
                return (
                  <g key={`leg${i}`}>
                    <rect x={legX - 3} y={ty - 5} width={5} height={5} rx={1} fill={evt.color} fillOpacity={0.85} />
                    <text x={legX - 7} y={ty} textAnchor="end" fontSize={7} fill="var(--color-text-dim)">
                      {name} — {evt.label}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })()}

        {/* X-axis date labels */}
        <text x={toX(0)} y={padT + cH + 13} textAnchor="start" fontSize={7.5} fill="var(--color-text-muted)">Now</text>
        {ticks.map(m => (
          <g key={m}>
            <line x1={toX(m)} y1={padT + cH} x2={toX(m)} y2={padT + cH + 4} stroke="var(--color-border)" strokeWidth={1} />
            <text x={toX(m)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="var(--color-text-muted)">{monthLabel(m)}</text>
          </g>
        ))}
        <text x={toX(nMonths)} y={padT + cH + 13} textAnchor="middle" fontSize={7.5} fill="var(--color-text-muted)">{monthLabel(nMonths)}</text>

        {/* Hover crosshair + tooltip */}
        {hoverData && (() => {
          const { x, label, debts } = hoverData
          const total = debts.reduce((s, d) => s + d.balance, 0)
          const ttW = 148, ttLineH = 11, ttH = 28 + debts.length * ttLineH + 6
          const tipLeft = x > padL + cW * 0.58
          const ttX = tipLeft ? x - ttW - 6 : x + 6
          const ttY = Math.max(padT + 2, Math.min(padT + cH - ttH - 2, padT + cH / 2 - ttH / 2))
          return (
            <g>
              <line x1={x} y1={padT} x2={x} y2={padT + cH} stroke="var(--color-accent)" strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={3} fill="var(--color-bg)" stroke="var(--color-accent-dim)" strokeWidth={1} />
              <text x={ttX + 8} y={ttY + 11} fontSize={8} fill="var(--color-text-muted)">{label}</text>
              <text x={ttX + 8} y={ttY + 22} fontSize={9} fill="var(--color-text)" fontWeight={700} fontFamily="DM Mono, monospace">{fmtShort(total)}</text>
              {debts.map((d, i) => (
                <g key={i}>
                  <rect x={ttX + 8} y={ttY + 30 + i * ttLineH} width={5} height={5} rx={1} fill={d.color} fillOpacity={0.8} />
                  <text x={ttX + 16} y={ttY + 36 + i * ttLineH} fontSize={7} fill={d.color}>{d.name}: {fmtShort(d.balance)}</text>
                </g>
              ))}
            </g>
          )
        })()}
      </svg>


    </div>
  )
}
