import { useMemo } from 'react'
import { Badge } from '../components'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import LineChart from '../components/LineChart'
import SankeyChart from '../components/SankeyChart'
import DebtTimeline from '../components/DebtTimeline'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { buildAggregateProjection } from '../lib/calculations'
import { computeSituationalRead } from '../lib/sankeyHelpers'
import type { SankeyInput } from '../lib/sankeyHelpers'
import type { Benchmark } from '../components/LineChart'

export default function OverviewTab() {
  const { data } = useData()
  const {
    grossMonthly, netMonthly,
    housingPct, consumerDti, dti,
    retireRate, savingsRate,
    planSurplus, essTotalP, debtPlanTotal, discPlanTotal,
    liquidSavingsMonthly, rothIraMonthly,
    trad401kMonthly, roth401kMonthly, hsaMonthly, employerMatch,
    sourceCalcs,
  } = useMetrics()

  // ── Situational read ──
  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)
  const { headline, isOvershoot } = computeSituationalRead({
    planSurplus,
    dti,
    savingsRate,
    hasConsumerDebt: consumerDebts.length > 0,
    consumerDebtBalance,
    noIncome: grossMonthly === 0,
  })

  // ── Badge colors (unchanged from previous OverviewTab) ──
  const housingColor = parseFloat(housingPct) <= 0 ? '#3a5a7a'
    : parseFloat(housingPct) > 28 ? '#f97316' : '#10b981'
  const dtiColor = parseFloat(dti) <= 0 ? '#3a5a7a'
    : parseFloat(dti) >= 36 ? '#ef4444'
    : parseFloat(dti) > 20 ? '#f97316' : '#10b981'
  const savingsColor = parseFloat(savingsRate) <= 0 ? '#3a5a7a'
    : parseFloat(savingsRate) >= 15 ? '#10b981' : '#60a5fa'
  const retireColor = parseFloat(retireRate) <= 0 ? '#3a5a7a'
    : parseFloat(retireRate) >= 15 ? '#10b981' : '#60a5fa'
  const shouldTint = (color: string) => color !== '#60a5fa' && color !== '#3a5a7a'

  // ── Sankey input ──
  const sankeyInput: SankeyInput = useMemo(() => ({
    grossMonthly,
    netMonthly,
    trad401kMonthly,
    roth401kMonthly,
    hsaMonthly,
    employerMatch,
    essTotalP,
    discPlanTotal,
    debtPlanTotal,
    liquidSavingsMonthly,
    rothIraMonthly,
    dti,
    housingPct,
    savingsRate,
    retireRate,
    sourceCalcs,
  }), [grossMonthly, netMonthly, trad401kMonthly, roth401kMonthly, hsaMonthly, employerMatch,
    essTotalP, discPlanTotal, debtPlanTotal, liquidSavingsMonthly, rothIraMonthly,
    dti, housingPct, savingsRate, retireRate, sourceCalcs])

  // ── Retirement projection ──
  const sources = data.income?.sources || []
  const hsaBal = parseFloat(data.retirement?.hsa?.currentBalance || '') || 0
  const investBal = parseFloat(data.invest?.currentBalance || '') || 0
  const retChartData = buildAggregateProjection(sources, sourceCalcs, hsaBal, investBal)
  const projBal = retChartData.length > 0 ? retChartData[retChartData.length - 1].balance : 0
  const primaryW2 = sources.find(s => s.type === 'w2' && s.retirement?.currentAge)
  const retTargetAge = primaryW2?.retirement?.targetAge || '65'
  const annualGross = grossMonthly * 12

  const benchmarks: Benchmark[] = [
    { age: 30, value: annualGross * 1, label: '1× by 30' },
    { age: 40, value: annualGross * 3, label: '3× by 40' },
    { age: 50, value: annualGross * 6, label: '6× by 50' },
    { age: 60, value: annualGross * 8, label: '8× by 60' },
  ]

  // ── DebtTimeline inputs ──
  const liquidBalance = parseFloat(data.savings.emergencyFund.current || '0') || 0
  const retirementBalance = sources
    .filter(s => s.type === 'w2')
    .reduce((sum, src) => {
      const r = src.retirement
      if (!r) return sum
      return sum
        + (parseFloat(r.traditional401kBalance || '') || 0)
        + (parseFloat(r.roth401kBalance || '') || 0)
        + (parseFloat(r.rothIra?.currentBalance || '') || 0)
    }, 0) + hsaBal + investBal
  const monthlyContrib = sourceCalcs.reduce((s, c) => s + c.trad401k + c.roth401k + c.match + c.rothIra, 0)
    + liquidSavingsMonthly

  return (
    <div>
      {/* ── Situational headline + stat card ── */}
      {headline && (
        <div className="flex justify-between items-start mb-4">
          <p className="m-0 text-[14px] leading-snug max-w-[65%]" style={{ color: '#c9d8e8' }}>
            {headline}
          </p>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.08em] mb-0.5" style={{ color: '#3a5a7a' }}>This month</div>
            <div
              className="font-mono text-[15px] font-bold"
              style={{ color: isOvershoot ? '#ef4444' : '#10b981' }}
            >
              {isOvershoot ? '−' : '+'}{fmt(Math.abs(planSurplus))}
            </div>
            <div className="text-[9px]" style={{ color: '#3a5a7a' }}>
              {isOvershoot ? 'overshoot' : 'surplus'}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip (unchanged from previous OverviewTab) ── */}
      <div className="grid gap-2.5 mb-[18px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <Badge label="Gross Income" value={grossMonthly > 0 ? fmt(grossMonthly) : '—'} color="#60a5fa" sub={grossMonthly > 0 ? '/month' : 'Add income'} />
        <Badge label="Take-Home" value={netMonthly > 0 ? fmt(netMonthly) : '—'} color="#60a5fa" sub={netMonthly > 0 ? '/month' : undefined} />
        <Badge
          label="Consumer Debt"
          value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
          color={consumerDebts.length > 0 ? '#60a5fa' : '#3a5a7a'}
          sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add debts in Expenses'}
          tooltip="Your non-mortgage debt total. Paying this down frees up monthly cash flow and improves your DTI."
        />
        <Badge label="Housing %" value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'} color={housingColor} tint={shouldTint(housingColor)} sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule') : 'Add housing in Expenses'} tooltip="Your rent or mortgage as a share of gross monthly income. Above 28% limits your ability to save and handle debt." />
        <Badge label="Total DTI" value={parseFloat(dti) > 0 ? dti + '%' : '—'} color={dtiColor} tint={shouldTint(dtiColor)} sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'} tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; above 36% is high-risk." />
        <Badge label="Retirement Rate" value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'} color={retireColor} tint={shouldTint(retireColor)} sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : 'Set contributions in Invest & Retire'} tooltip="Percentage of gross income going to retirement accounts. 15% is the common target. Employer match counts — capture it first." />
        <Badge label="Total Savings Rate" value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'} color={savingsColor} tint={shouldTint(savingsColor)} sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : 'Add income & savings'} tooltip="How much of your gross income you're setting aside across all accounts. 15% = on track, 20%+ = building wealth aggressively." />
      </div>

      {/* ── Sankey card ── */}
      <Card>
        <SankeyChart
          input={sankeyInput}
          data={data}
          dti={dti}
          housingPct={housingPct}
          savingsRate={savingsRate}
          retireRate={retireRate}
          employerMatch={employerMatch}
        />
      </Card>

      {/* ── Bottom row ── */}
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Debt-free timeline */}
        <Card>
          <SectionTitle accent="#10b981">Debt-Free Timeline</SectionTitle>
          <DebtTimeline
            data={data}
            liquidSavingsBalance={liquidBalance}
            retirementBalance={retirementBalance}
            monthlyContrib={monthlyContrib}
            debtPlanTotal={debtPlanTotal}
          />
        </Card>

        {/* Retirement projection */}
        <Card>
          <SectionTitle accent="#a78bfa">Retirement Projection</SectionTitle>
          {projBal > 0 && (
            <div className="flex gap-4 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>Projected at {retTargetAge}</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#60a5fa' }}>{fmtShort(projBal)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#5a7a9a' }}>Monthly at 4% rule</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: '#10b981' }}>{fmt(projBal * 0.04 / 12)}</div>
              </div>
            </div>
          )}
          <LineChart data={retChartData} height={180} benchmarks={grossMonthly > 0 ? benchmarks : []} />
        </Card>
      </div>
    </div>
  )
}
