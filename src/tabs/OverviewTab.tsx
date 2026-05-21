import { DonutChart, LineChart } from '../components'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { buildAggregateProjection } from '../lib/calculations'

type HealthStatus = 'high' | 'watch' | 'healthy' | 'strong' | 'empty'

function HealthPill({ status }: { status: HealthStatus }) {
  const config: Record<HealthStatus, { label: string; color: string }> = {
    high:    { label: 'Needs Attention', color: '#ef4444' },
    watch:   { label: 'Watch',           color: '#f97316' },
    healthy: { label: 'Healthy',         color: '#10b981' },
    strong:  { label: 'Strong',          color: '#10b981' },
    empty:   { label: 'Add data',        color: '#3a5a7a' },
  }
  const { label, color } = config[status]
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  )
}

export default function OverviewTab() {
  const { data } = useData()
  const {
    netMonthly,
    housingPct, consumerDti, dti,
    retireRate, savingsRate,
    planSurplus, essTotalP, debtPlanTotal, discPlanTotal,
    liquidSavingsMonthly, investMonthly, rothIraMonthly,
    postTaxSavingsMonthly,
    sourceCalcs,
    calcPayoff, payoffDate,
  } = useMetrics()

  // Consumer debt aggregates
  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const hasMortgage = data.debts.some(d => d.isMortgage)
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)
  const maxConsumerMonths = consumerDebts.length > 0
    ? Math.max(...consumerDebts.map(d => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        return result ? result.months : 0
      }))
    : 0

  // Parsed numeric values
  const dtiVal = parseFloat(dti)
  const housingVal = parseFloat(housingPct)
  const savingsVal = parseFloat(savingsRate)
  const remaining = planSurplus - postTaxSavingsMonthly

  // Health status per domain
  const debtHealth: HealthStatus = dtiVal <= 0 ? 'empty'
    : dtiVal >= 36 ? 'high'
    : dtiVal > 20  ? 'watch'
    : 'healthy'

  const spendingHealth: HealthStatus = netMonthly <= 0 ? 'empty'
    : remaining < -100   ? 'high'
    : housingVal > 28    ? 'watch'
    : 'healthy'

  const wealthHealth: HealthStatus = savingsVal <= 0 ? 'empty'
    : savingsVal < 10 ? 'high'
    : savingsVal < 15 ? 'watch'
    : 'strong'

  // Domain colors derived from health
  const dtiColor = debtHealth === 'high' ? '#ef4444' : debtHealth === 'watch' ? '#f97316' : debtHealth === 'healthy' ? '#10b981' : '#3a5a7a'
  const housingColor = housingVal <= 0 ? '#3a5a7a' : housingVal > 28 ? '#f97316' : '#10b981'
  const wealthColor = wealthHealth === 'strong' ? '#10b981' : wealthHealth === 'watch' ? '#f97316' : wealthHealth === 'high' ? '#ef4444' : '#3a5a7a'

  // Retirement projection
  const sources = data.income?.sources || []
  const hsaBal = parseFloat(data.retirement?.hsa?.currentBalance || '') || 0
  const investBal = parseFloat(data.invest?.currentBalance || '') || 0
  const retChartData = buildAggregateProjection(sources, sourceCalcs, hsaBal, investBal)
  const projBal = retChartData.length > 0 ? retChartData[retChartData.length - 1].balance : 0
  const primaryW2 = sources.find(s => s.type === 'w2' && s.retirement?.currentAge)
  const retTargetAge = primaryW2?.retirement?.targetAge || '65'

  // Budget donut segments
  const donutSegments = [
    { label: 'Essentials',    value: essTotalP,                           color: '#60a5fa' },
    { label: 'Debt',          value: debtPlanTotal,                       color: '#f97316' },
    { label: 'Discretionary', value: discPlanTotal,                       color: '#f59e0b' },
    { label: 'Savings',       value: liquidSavingsMonthly + investMonthly, color: '#10b981' },
    { label: 'Retirement',    value: rothIraMonthly,                      color: '#a78bfa' },
    { label: 'Remaining',     value: Math.max(0, remaining),              color: '#3a5a7a' },
  ]

  const savingsBarPct = Math.min(100, savingsVal / 25 * 100)

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Financial Overview</h1>
      <p className="m-0 mb-5 text-[#5a7a9a] text-[13px]">Your complete picture at a glance.</p>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>

        {/* ── DEBT ── */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <SectionTitle accent="#f97316">Debt</SectionTitle>
            <HealthPill status={debtHealth} />
          </div>

          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Total DTI</div>
            <div className="font-mono font-bold leading-none" style={{ fontSize: 38, color: dtiColor }}>
              {dtiVal > 0 ? dti + '%' : '—'}
            </div>
            <div className="text-[11px] mt-2" style={{ color: '#5a7a9a' }}>
              {debtHealth === 'high'    ? 'Above 36% healthy threshold — priority focus'
               : debtHealth === 'watch'   ? 'Moderate — aim to get below 20%'
               : debtHealth === 'healthy' ? 'Within healthy range'
               :                           'Add income and debts to calculate'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e2d3d' }}>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px]" style={{ color: '#5a7a9a' }}>Consumer DTI</span>
              <span className="font-mono text-[13px] font-semibold" style={{ color: '#60a5fa' }}>
                {parseFloat(consumerDti) > 0 ? consumerDti + '%' : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5" style={{ borderTop: '1px solid #1e2d3d' }}>
              <span className="text-[12px]" style={{ color: '#5a7a9a' }}>
                {hasMortgage ? 'Consumer Debt' : 'Total Debt'}
              </span>
              <span className="font-mono text-[13px] font-semibold" style={{ color: '#60a5fa' }}>
                {consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
              </span>
            </div>
          </div>

          {maxConsumerMonths > 0 && (
            <div
              className="mt-3 rounded-[10px] flex justify-between items-center px-3 py-2.5"
              style={{ background: 'linear-gradient(135deg, #0d1f10, #0a1c14)', border: '1px solid #10b98133' }}
            >
              <span className="text-[12px] font-semibold" style={{ color: '#8b9cb5' }}>
                Debt-Free
              </span>
              <span className="font-mono text-[15px] font-bold" style={{ color: '#10b981' }}>
                {payoffDate(maxConsumerMonths)}
              </span>
            </div>
          )}
        </Card>

        {/* ── SPENDING ── */}
        <Card>
          <div className="flex items-start justify-between mb-3">
            <SectionTitle accent="#f59e0b">Spending</SectionTitle>
            <HealthPill status={spendingHealth} />
          </div>

          <DonutChart
            segments={donutSegments}
            centerLabel="Take-Home"
            centerValue={fmt(netMonthly)}
            size={170}
          />

          <div style={{ borderTop: '1px solid #1e2d3d', marginTop: 12 }}>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px]" style={{ color: '#5a7a9a' }}>Housing</span>
              <div className="flex items-center gap-1.5">
                {housingVal > 28 && (
                  <span className="text-[10px]" style={{ color: '#f97316' }}>above 28%</span>
                )}
                <span className="font-mono text-[13px] font-semibold" style={{ color: housingColor }}>
                  {housingVal > 0 ? housingPct + '%' : '—'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2.5" style={{ borderTop: '1px solid #1e2d3d' }}>
              <span className="text-[12px]" style={{ color: '#5a7a9a' }}>Remaining</span>
              <span className="font-mono text-[13px] font-semibold" style={{ color: remaining >= 0 ? '#10b981' : '#ef4444' }}>
                {netMonthly > 0 ? fmt(remaining) : '—'}
              </span>
            </div>
          </div>
        </Card>

        {/* ── BUILDING WEALTH ── */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <SectionTitle accent="#a78bfa">Building Wealth</SectionTitle>
            <HealthPill status={wealthHealth} />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-[10px] uppercase tracking-[0.06em]" style={{ color: '#5a7a9a' }}>Savings Rate</div>
              <div className="text-[10px]" style={{ color: '#3a5a7a' }}>target 15–20%</div>
            </div>
            <div className="font-mono font-bold leading-none" style={{ fontSize: 38, color: wealthColor }}>
              {savingsVal > 0 ? savingsRate + '%' : '—'}
            </div>
            <div className="mt-2 rounded-full overflow-hidden" style={{ height: 5, background: '#1e2d3d' }}>
              <div
                className="h-full rounded-full"
                style={{ width: savingsVal > 0 ? savingsBarPct + '%' : '0%', background: wealthColor }}
              />
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: '#5a7a9a' }}>
              {wealthHealth === 'strong' ? 'Above 15% — building wealth aggressively'
               : wealthHealth === 'watch'   ? 'Getting there — aim for 15%+'
               : wealthHealth === 'high'    ? 'Below target — increase contributions'
               :                              'Add income & savings to track'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e2d3d' }}>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px]" style={{ color: '#5a7a9a' }}>Retirement Rate</span>
              <span className="font-mono text-[13px] font-semibold" style={{ color: '#60a5fa' }}>
                {parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
              </span>
            </div>
            {projBal > 0 && (
              <div className="flex justify-between items-center py-2.5" style={{ borderTop: '1px solid #1e2d3d' }}>
                <span className="text-[12px]" style={{ color: '#5a7a9a' }}>Projected at {retTargetAge}</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color: '#a78bfa' }}>
                  {fmtShort(projBal)}
                </span>
              </div>
            )}
          </div>

          {retChartData.length > 0 && (
            <div className="mt-3">
              <LineChart data={retChartData} height={110} />
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
