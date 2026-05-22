import { useMemo, useState } from 'react'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import LineChart from '../components/LineChart'
import SankeyChart from '../components/SankeyChart'
import DebtTimeline from '../components/DebtTimeline'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { buildAggregateProjection } from '../lib/calculations'
import type { SankeyInput } from '../lib/sankeyHelpers'
import type { Benchmark } from '../components/LineChart'

function KpiCell({ label, value, labelColor = '#2e7a7a', valueColor = '#f0faf8', sub, tooltip, last = false }: {
  label: string; value: string; labelColor?: string; valueColor?: string; sub?: string; tooltip?: string; last?: boolean
}) {
  const [tip, setTip] = useState(false)
  return (
    <div style={{ paddingRight: last ? 0 : 16, marginRight: last ? 0 : 16, borderRight: last ? 'none' : '1px solid rgba(13,148,136,0.2)', position: 'relative' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {tooltip && (
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            style={{ background: 'none', border: `1px solid ${labelColor}55`, borderRadius: '50%', width: 13, height: 13, fontSize: 8, color: tip ? labelColor : `${labelColor}88`, cursor: 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >?</button>
        )}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: valueColor, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: `${labelColor}bb` }}>{sub}</div>}
      {tip && tooltip && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#032e2e', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 5, padding: 12, marginTop: 6, fontSize: 11, color: '#5aabab', lineHeight: 1.6, width: 220, pointerEvents: 'none' }}>
          {tooltip}
        </div>
      )}
    </div>
  )
}

export default function OverviewTab() {
  const { data } = useData()
  const {
    grossMonthly, netMonthly,
    housingPct, consumerDti, dti,
    retireRate, savingsRate,
    essTotalP, debtPlanTotal, discPlanTotal,
    liquidSavingsMonthly, rothIraMonthly,
    trad401kMonthly, roth401kMonthly, hsaMonthly, employerMatch,
    sourceCalcs,
  } = useMetrics()

  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  // ── Badge colors (unchanged from previous OverviewTab) ──
  const housingColor = parseFloat(housingPct) <= 0 ? '#3a5a7a'
    : parseFloat(housingPct) > 28 ? '#f97316' : '#10b981'
  const dtiColor = parseFloat(dti) <= 0 ? '#3a5a7a'
    : parseFloat(dti) >= 36 ? '#f87171'
    : parseFloat(dti) > 20 ? '#f97316' : '#10b981'
  const savingsColor = parseFloat(savingsRate) <= 0 ? '#3a5a7a'
    : parseFloat(savingsRate) >= 15 ? '#10b981' : '#f59e0b'
  const retireColor = parseFloat(retireRate) <= 0 ? '#3a5a7a'
    : parseFloat(retireRate) >= 15 ? '#10b981' : '#f59e0b'

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
      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(13,148,136,0.15)' }}>
        <KpiCell
          label="Gross Income"
          value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
          sub={grossMonthly > 0 ? '/month' : 'Add income'}
        />
        <KpiCell
          label="Take-Home"
          value={netMonthly > 0 ? fmt(netMonthly) : '—'}
          labelColor="#2a7a8a"
          sub={netMonthly > 0 ? '/month' : undefined}
        />
        <KpiCell
          label="Consumer Debt"
          value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
          sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add debts in Expenses'}
          tooltip="Your non-mortgage debt total. Paying this down frees up monthly cash flow and improves your DTI."
        />
        <KpiCell
          label="Housing %"
          value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
          labelColor={housingColor}
          sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28% rule' : 'within 28% rule') : 'Add housing in Expenses'}
          tooltip="Your rent or mortgage as a share of gross monthly income. Above 28% limits your ability to save and handle debt."
        />
        <KpiCell
          label="Total DTI"
          value={parseFloat(dti) > 0 ? dti + '%' : '—'}
          labelColor={dtiColor}
          sub={parseFloat(dti) > 0 ? 'Consumer DTI ' + consumerDti + '%' : 'Add income & debts'}
          tooltip="Debt-to-Income ratio: total monthly debt payments ÷ gross monthly income. Under 36% is healthy; above 36% is high-risk."
        />
        <KpiCell
          label="Retirement Rate"
          value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
          labelColor={retireColor}
          sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : 'Set contributions in Invest & Retire'}
          tooltip="Percentage of gross income going to retirement accounts. 15% is the common target. Employer match counts — capture it first."
        />
        <KpiCell
          label="Total Savings Rate"
          value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
          labelColor={savingsColor}
          sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : 'Add income & savings'}
          tooltip="How much of your gross income you're setting aside across all accounts. 15% = on track, 20%+ = building wealth aggressively."
          last
        />
      </div>


      {/* ── Sankey ── */}
      <SectionTitle accent="#0d9488" hint="Click any category on the right to see a line-item breakdown.">Monthly Budget Flow</SectionTitle>
      <div>
        <SankeyChart input={sankeyInput} data={data} />
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-3.5 mt-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Debt-free timeline */}
        <div>
          <SectionTitle accent="#0d9488">Debt-Free Timeline</SectionTitle>
          <Card>
            <DebtTimeline
              data={data}
              liquidSavingsBalance={liquidBalance}
              retirementBalance={retirementBalance}
              monthlyContrib={monthlyContrib}
              debtPlanTotal={debtPlanTotal}
            />
          </Card>
        </div>

        {/* Retirement projection */}
        <div>
          <SectionTitle accent="#0d9488">Retirement Projection</SectionTitle>
          <Card>
            {projBal > 0 && (
              <div className="flex gap-4 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#2e7a7a' }}>Projected at {retTargetAge}</div>
                  <div className="font-mono text-[15px] font-bold" style={{ color: '#34d399' }}>{fmtShort(projBal)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: '#2e7a7a' }}>Monthly at 4% rule</div>
                  <div className="font-mono text-[15px] font-bold" style={{ color: '#10b981' }}>{fmt(projBal * 0.04 / 12)}</div>
                </div>
              </div>
            )}
            <LineChart data={retChartData} height={180} benchmarks={grossMonthly > 0 ? benchmarks : []} />
          </Card>
        </div>
      </div>
    </div>
  )
}
