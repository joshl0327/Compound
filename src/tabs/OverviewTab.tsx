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

  // Consumer debts for debt-free strip
  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const hasMortgage = data.debts.some(d => d.isMortgage)

  // Consumer debt total balance for badge
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  // Max payoff months across all consumer debts (using plan payment)
  const maxConsumerMonths = consumerDebts.length > 0
    ? Math.max(...consumerDebts.map(d => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        return result ? result.months : 0
      }))
    : 0

  // Badge colors
  const housingColor = parseFloat(housingPct) <= 0 ? '#3a5a7a'
    : parseFloat(housingPct) > 28 ? '#f97316' : '#10b981'
  const dtiColor = parseFloat(dti) <= 0 ? '#3a5a7a'
    : parseFloat(dti) >= 36 ? '#ef4444'
    : parseFloat(dti) > 20 ? '#f97316' : '#10b981'

  // Retirement projection
  const sources = data.income?.sources || []
  const hsaBal = parseFloat(data.retirement?.hsa?.currentBalance || '') || 0
  const investBal = parseFloat(data.invest?.currentBalance || '') || 0
  const retChartData = buildAggregateProjection(sources, sourceCalcs, hsaBal, investBal)
  const projBal = retChartData.length > 0 ? retChartData[retChartData.length - 1].balance : 0
  const primaryW2 = sources.find(s => s.type === 'w2' && s.retirement?.currentAge)
  const retTargetAge = primaryW2?.retirement?.targetAge || '65'

  // Budget allocation donut segments
  const donutSegments = [
    { label: 'Essentials', value: essTotalP, color: '#60a5fa' },
    { label: 'Debt', value: debtPlanTotal, color: '#f97316' },
    { label: 'Discretionary', value: discPlanTotal, color: '#f59e0b' },
    { label: 'Savings', value: liquidSavingsMonthly + investMonthly, color: '#10b981' },
    { label: 'Retirement', value: rothIraMonthly, color: '#a78bfa' },
    { label: 'Remaining', value: Math.max(0, planSurplus - postTaxSavingsMonthly), color: '#3a5a7a' },
  ]

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Financial Overview</h1>
      <p className="m-0 mb-5 text-[#5a7a9a] text-[13px]">Your complete picture at a glance.</p>

      {/* Badge row */}
      <div className="grid gap-2.5 mb-[18px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <Badge
          label="Gross Income"
          value={fmt(grossMonthly)}
          color="#60a5fa"
          sub="/month"
        />
        <Badge
          label="Take-Home"
          value={fmt(netMonthly)}
          color="#60a5fa"
          sub="/month"
        />
        <Badge
          label="Consumer Debt"
          value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
          color={consumerDebts.length > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={
            consumerDebts.length > 0
              ? (hasMortgage ? 'excl. mortgage' : undefined)
              : 'Add debts in Expenses'
          }
          tooltip="Your non-mortgage debt total (credit cards, student loans, car loans). Paying this down frees up monthly cash flow and improves your DTI."
        />
        <Badge
          label="Housing %"
          value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
          color={housingColor}
          sub={
            parseFloat(housingPct) > 0
              ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule')
              : 'Add housing in Expenses'
          }
          tooltip="Your rent or mortgage as a share of gross monthly income. The 28% guideline: spending more than this on housing limits your ability to save and handle debt."
        />
        <Badge
          label="Total DTI"
          value={parseFloat(dti) > 0 ? dti + '%' : '—'}
          color={dtiColor}
          sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'}
          tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; lenders see above 36% as high-risk. Consumer DTI (non-housing debt) should stay under 20%."
        />
        <Badge
          label="Retirement Rate"
          value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
          color={parseFloat(retireRate) > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={parseFloat(retireRate) > 0 ? undefined : 'Set contributions in Invest & Retire'}
          tooltip="Percentage of gross income going to retirement accounts (401k, Roth IRA, HSA). 15% is a common target for retiring comfortably at 65. Capture any employer match first — it's free money."
        />
        <Badge
          label="Total Savings Rate"
          value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
          color={parseFloat(savingsRate) > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={parseFloat(savingsRate) > 0 ? undefined : 'Add income & savings'}
          tooltip="How much of your gross income you're setting aside across all accounts. 10% = getting started, 15% = on track, 20%+ = building wealth aggressively."
        />
      </div>

      {/* Debt-free date strip */}
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
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-widest mb-0.5">Total DTI</div>
            <div className="font-mono text-[15px] font-bold" style={{ color: dtiColor }}>{dti}%</div>
          </div>
        </div>
      )}

      {/* Two-column chart grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Budget Allocation Donut */}
        <Card>
          <SectionTitle accent="#60a5fa">Budget Allocation</SectionTitle>
          <DonutChart
            segments={donutSegments}
            centerLabel="Take-Home"
            centerValue={fmt(netMonthly)}
          />
        </Card>

        {/* Retirement Projection */}
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
