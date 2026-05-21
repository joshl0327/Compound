import { Badge, DonutChart, LineChart } from '../components'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { buildAggregateProjection } from '../lib/calculations'

export default function OverviewTab() {
  const { data } = useData()
  const {
    grossMonthly, netMonthly,
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

  // Badge colors — traffic light for health ratios, earned green for performance
  const housingColor = parseFloat(housingPct) <= 0 ? '#3a5a7a'
    : parseFloat(housingPct) > 28 ? '#f97316' : '#10b981'

  const dtiColor = parseFloat(dti) <= 0 ? '#3a5a7a'
    : parseFloat(dti) >= 36 ? '#ef4444'
    : parseFloat(dti) > 20  ? '#f97316' : '#10b981'

  // Savings Rate and Retirement Rate earn green at ≥15% target
  const savingsColor = parseFloat(savingsRate) <= 0 ? '#3a5a7a'
    : parseFloat(savingsRate) >= 15 ? '#10b981' : '#60a5fa'

  const retireColor = parseFloat(retireRate) <= 0 ? '#3a5a7a'
    : parseFloat(retireRate) >= 15 ? '#10b981' : '#60a5fa'

  // Tint badges that have earned or been flagged a health color (not neutral blue/gray)
  const shouldTint = (color: string) => color !== '#60a5fa' && color !== '#3a5a7a'

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
    { label: 'Essentials',    value: essTotalP,                            color: '#60a5fa' },
    { label: 'Debt',          value: debtPlanTotal,                        color: '#f97316' },
    { label: 'Discretionary', value: discPlanTotal,                        color: '#f59e0b' },
    { label: 'Savings',       value: liquidSavingsMonthly + investMonthly, color: '#10b981' },
    { label: 'Retirement',    value: rothIraMonthly,                       color: '#a78bfa' },
    { label: 'Remaining',     value: Math.max(0, planSurplus - postTaxSavingsMonthly), color: '#3a5a7a' },
  ]

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Financial Overview</h1>
      <p className="m-0 mb-5 text-[#5a7a9a] text-[13px]">Your complete picture at a glance.</p>

      {/* Badge row — left to right story: Income → Obligations → Performance */}
      <div className="grid gap-2.5 mb-[18px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <Badge
          label="Gross Income"
          value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
          color="#60a5fa"
          sub={grossMonthly > 0 ? '/month' : 'Add income'}
        />
        <Badge
          label="Take-Home"
          value={netMonthly > 0 ? fmt(netMonthly) : '—'}
          color="#60a5fa"
          sub={netMonthly > 0 ? '/month' : undefined}
        />
        <Badge
          label="Consumer Debt"
          value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
          color={consumerDebts.length > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={consumerDebts.length > 0 ? (hasMortgage ? 'excl. mortgage' : undefined) : 'Add debts in Expenses'}
          tooltip="Your non-mortgage debt total. Paying this down frees up monthly cash flow and improves your DTI."
        />
        <Badge
          label="Housing %"
          value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
          color={housingColor}
          tint={shouldTint(housingColor)}
          sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule') : 'Add housing in Expenses'}
          tooltip="Your rent or mortgage as a share of gross monthly income. Above 28% limits your ability to save and handle debt."
        />
        <Badge
          label="Total DTI"
          value={parseFloat(dti) > 0 ? dti + '%' : '—'}
          color={dtiColor}
          tint={shouldTint(dtiColor)}
          sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'}
          tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; above 36% is high-risk."
        />
        <Badge
          label="Retirement Rate"
          value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
          color={retireColor}
          tint={shouldTint(retireColor)}
          sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : 'Set contributions in Invest & Retire'}
          tooltip="Percentage of gross income going to retirement accounts. 15% is the common target. Employer match counts — capture it first."
        />
        <Badge
          label="Total Savings Rate"
          value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
          color={savingsColor}
          tint={shouldTint(savingsColor)}
          sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : 'Add income & savings'}
          tooltip="How much of your gross income you're setting aside across all accounts. 15% = on track, 20%+ = building wealth aggressively."
        />
      </div>

      {/* Debt-free strip — shows only when consumer debts exist */}
      {maxConsumerMonths > 0 && (
        <div
          className="flex justify-between items-center rounded-xl px-5 py-3 mb-3.5"
          style={{ background: 'linear-gradient(135deg, #0d1f10, #0a1c14)', border: '1px solid #10b98133' }}
        >
          <div>
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-widest mb-0.5">Consumer Debt-Free</div>
            <div className="font-mono text-[15px] font-bold text-[#10b981]">{payoffDate(maxConsumerMonths)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-widest mb-0.5">
              {hasMortgage ? 'Consumer Debt' : 'Total Debt'}
            </div>
            <div className="font-mono text-[15px] font-bold text-[#60a5fa]">
              {fmtShort(consumerDebtBalance)}
            </div>
          </div>
        </div>
      )}

      {/* Two-column chart grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <SectionTitle accent="#60a5fa">Budget Allocation</SectionTitle>
          <DonutChart
            segments={donutSegments}
            centerLabel="Take-Home"
            centerValue={fmt(netMonthly)}
          />
        </Card>

        <Card>
          <SectionTitle accent="#a78bfa">Retirement Projection</SectionTitle>
          {projBal > 0 && (
            <div className="flex gap-4 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>
                  Projected at {retTargetAge}
                </div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#60a5fa' }}>
                  {fmtShort(projBal)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>
                  Monthly at 4% rule
                </div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#10b981' }}>
                  {fmt(projBal * 0.04 / 12)}
                </div>
              </div>
            </div>
          )}
          <LineChart data={retChartData} height={180} />
        </Card>
      </div>
    </div>
  )
}
