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
import { useMilestones } from '../hooks/useMilestones'
import MilestoneBadges from '../components/MilestoneBadges'
import MilestoneToast from '../components/MilestoneToast'
import type { SankeyInput } from '../lib/sankeyHelpers'
import type { Benchmark } from '../components/LineChart'
import { useIsMobile } from '../hooks/useIsMobile'

function KpiCell({
  label, value,
  labelColor = 'var(--color-text-muted)',
  valueColor = 'var(--color-text)',
  sub, tooltip, last = false,
  centered = false,
  valueFontSize = 20,
  labelFontSize = 11,
  subFontSize = 11,
  subColor,
}: {
  label: string; value: string; labelColor?: string; valueColor?: string
  sub?: string; tooltip?: string; last?: boolean
  centered?: boolean; valueFontSize?: number; labelFontSize?: number
  subFontSize?: number; subColor?: string
}) {
  const [tip, setTip] = useState(false)

  if (centered) {
    return (
      <div style={{ textAlign: 'center', padding: '0 8px' }}>
        <div style={{ fontSize: labelFontSize, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: valueFontSize, fontWeight: 500, color: valueColor, lineHeight: 1, marginBottom: 4 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: subFontSize, color: subColor ?? 'var(--color-text-dim)' }}>{sub}</div>}
      </div>
    )
  }

  return (
    <div style={{ paddingRight: last ? 0 : 16, marginRight: last ? 0 : 16, borderRight: last ? 'none' : '1px solid var(--color-border)', position: 'relative' }}>
      <div style={{ fontSize: labelFontSize, textTransform: 'uppercase', letterSpacing: '0.1em', color: labelColor, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {tooltip && (
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 13, height: 13, fontSize: 8, color: tip ? 'var(--color-text-muted)' : 'var(--color-text-dim)', cursor: 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >?</button>
        )}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: valueFontSize, fontWeight: 500, color: valueColor, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: subFontSize, color: subColor ?? 'var(--color-text-dim)' }}>{sub}</div>}
      {tip && tooltip && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, padding: 12, marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, width: 220, pointerEvents: 'none' }}>
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
  const currentRetireAge = parseInt(primaryW2?.retirement?.currentAge || '0') || 0
  const yearsToRetire = Math.max(0, parseInt(retTargetAge) - currentRetireAge)
  const inflFactor = yearsToRetire > 0 ? Math.pow(1.02, yearsToRetire) : 1
  const projBalReal = projBal / inflFactor
  const annualGross = grossMonthly * 12

  const benchmarks: Benchmark[] = [
    { age: 30, value: annualGross * 1, label: '1× by 30' },
    { age: 40, value: annualGross * 3, label: '3× by 40' },
    { age: 50, value: annualGross * 6, label: '6× by 50' },
    { age: 60, value: annualGross * 8, label: '8× by 60' },
  ]

  // ── DebtTimeline inputs ──
  const surplus = Math.max(0, netMonthly - essTotalP - discPlanTotal - debtPlanTotal - liquidSavingsMonthly - rothIraMonthly)
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
  const { earnedDollar, fidelityOnTrack, newlyUnlocked } = useMilestones(retirementBalance, annualGross, retChartData)
  const isMobile = useIsMobile()

  return (
    <div>
      {/* ── KPI strip ── */}
      {isMobile ? (
        /* Mobile: 3 semantic rows */
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
          {/* Row 1 — Income (2 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={18} labelFontSize={8} subFontSize={9}
                label="Gross Income"
                value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
                sub={grossMonthly > 0 ? '/month' : 'Add income'}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={18} labelFontSize={8} subFontSize={9}
                label="Take-Home"
                value={netMonthly > 0 ? fmt(netMonthly) : '—'}
                sub={netMonthly > 0 ? '/month' : undefined}
              />
            </div>
          </div>

          {/* Row 2 — Health metrics (3 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Consumer Debt"
                value={consumerDebts.length > 0 ? fmtShort(consumerDebtBalance) : '—'}
                sub={consumerDebts.length > 0 ? (data.debts.some(d => d.isMortgage) ? 'excl. mortgage' : undefined) : 'Add in Expenses'}
              />
            </div>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Housing %"
                labelColor={housingColor} valueColor={housingColor} subColor={housingColor}
                value={parseFloat(housingPct) > 0 ? housingPct + '%' : '—'}
                sub={parseFloat(housingPct) > 0 ? (parseFloat(housingPct) > 28 ? 'above 28%' : 'within 28%') : undefined}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Total DTI"
                labelColor={dtiColor} valueColor={dtiColor} subColor={dtiColor}
                value={parseFloat(dti) > 0 ? dti + '%' : '—'}
                sub={parseFloat(dti) > 0 ? 'Consumer ' + consumerDti + '%' : undefined}
              />
            </div>
          </div>

          {/* Row 3 — Savings rates (2 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 0 4px 0' }}>
            <div style={{ borderRight: '1px solid var(--color-border)' }}>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Retirement Rate"
                labelColor={retireColor} valueColor={retireColor} subColor={retireColor}
                value={parseFloat(retireRate) > 0 ? retireRate + '%' : '—'}
                sub={parseFloat(retireRate) > 0 ? (parseFloat(retireRate) >= 15 ? 'on track ≥ 15%' : 'target 15%') : undefined}
              />
            </div>
            <div>
              <KpiCell
                centered valueFontSize={15} labelFontSize={7.5} subFontSize={9}
                label="Savings Rate"
                labelColor={savingsColor} valueColor={savingsColor} subColor={savingsColor}
                value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
                sub={parseFloat(savingsRate) > 0 ? (parseFloat(savingsRate) >= 15 ? 'on track ≥ 15%' : 'target 15–20%') : undefined}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: flat 7-column grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
          <KpiCell
            label="Gross Income"
            value={grossMonthly > 0 ? fmt(grossMonthly) : '—'}
            sub={grossMonthly > 0 ? '/month' : 'Add income'}
          />
          <KpiCell
            label="Take-Home"
            value={netMonthly > 0 ? fmt(netMonthly) : '—'}
            labelColor="var(--color-text-muted)"
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
      )}


      {/* ── Sankey ── */}
      <SectionTitle accent="var(--color-accent)" hint="Click any category on the right to see a line-item breakdown.">Monthly Budget Flow</SectionTitle>
      <div>
        <SankeyChart input={sankeyInput} data={data} mobile={isMobile} />
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-3.5 mt-5" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', alignItems: 'stretch' }}>
        {/* Debt-free timeline */}
        <div className="flex flex-col" style={{ minWidth: 0 }}>
          <SectionTitle accent="var(--color-accent)" hint={<>
            <div style={{ marginBottom: 6 }}>· <strong>Min:</strong> Minimum required payments only — slowest payoff, most interest</div>
            <div style={{ marginBottom: 6 }}>· <strong>Plan:</strong> Your configured payment amounts</div>
            <div style={{ marginBottom: 6 }}>· <strong>Snowball:</strong> Plan payments + surplus applied to smallest balance first, freed payments roll forward</div>
            <div>· <strong>Avalanche:</strong> Plan payments + surplus applied to highest interest rate first — mathematically optimal</div>
          </>}>Debt-Free Timeline</SectionTitle>
          <Card className="flex-1">
            <DebtTimeline
              data={data}
              liquidSavingsBalance={liquidBalance}
              retirementBalance={retirementBalance}
              monthlyContrib={monthlyContrib}
              debtPlanTotal={debtPlanTotal}
              surplus={surplus}
              isMobile={isMobile}
            />
          </Card>
        </div>

        {/* Retirement projection */}
        <div className="flex flex-col" style={{ minWidth: 0 }}>
          <SectionTitle accent="var(--color-accent)" hint={<>
            <div style={{ marginBottom: 6 }}>· <strong>Includes:</strong> all 401k, Roth IRA, HSA, and investment account balances</div>
            <div style={{ marginBottom: 6 }}>· <strong>Growth:</strong> 7% nominal annual return</div>
            <div style={{ marginBottom: 6 }}>· <strong>Inflation:</strong> "Today's dollars" values adjust for 2% annual inflation</div>
            <div>· <strong>Benchmarks:</strong> Fidelity targets — 3× salary by 40, 6× by 50, 8× by 60</div>
          </>}>Retirement Projection</SectionTitle>
          <Card className="flex-1">
            {projBal > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', rowGap: isMobile ? 12 : 0, marginBottom: isMobile ? 16 : 10 }}>
                  {/* Nominal — left half */}
                  {[
                    { label: `Projected at ${retTargetAge}`, value: fmtShort(projBal), color: '#34d399' },
                    { label: '4% Monthly', value: fmt(projBal * 0.04 / 12), color: '#10b981' },
                    { label: 'Replaces', value: grossMonthly > 0 ? `${Math.round((projBal * 0.04 / 12) / grossMonthly * 100)}%` : '—', color: grossMonthly > 0 ? ((projBal * 0.04 / 12) / grossMonthly >= 1 ? '#34d399' : '#f59e0b') : '#3a5a7a' },
                  ].map((s, i) => (
                    <div key={i} style={{ paddingRight: 10, marginRight: 10, borderRight: !isMobile && i === 2 ? '1px solid var(--color-border)' : 'none' }}>
                      <div className="text-[9px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                      <div className="font-mono text-[14px] font-bold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                  {/* Today's dollars — right half */}
                  {[
                    { label: `Value today`, value: fmtShort(projBalReal), color: 'var(--color-text-dim)' },
                    { label: 'Monthly today', value: fmt(projBalReal * 0.04 / 12), color: 'var(--color-text-dim)' },
                    { label: 'Income today', value: grossMonthly > 0 ? `${Math.round((projBalReal * 0.04 / 12) / grossMonthly * 100)}%` : '—', color: grossMonthly > 0 ? ((projBalReal * 0.04 / 12) / grossMonthly >= 1 ? 'var(--color-text-dim)' : '#c07a30') : '#3a5a7a' },
                  ].map((s, i) => (
                    <div key={i} style={{ paddingLeft: !isMobile && i === 0 ? 10 : 0 }}>
                      <div className="text-[9px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                      <div className="font-mono text-[14px] font-bold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {(trad401kMonthly + roth401kMonthly + hsaMonthly + rothIraMonthly + employerMatch) > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {trad401kMonthly > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        Trad 401(k) <span className="font-mono" style={{ color: 'var(--color-text-dim)' }}>{fmt(trad401kMonthly)}/mo</span>
                      </span>
                    )}
                    {roth401kMonthly > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        Roth 401(k) <span className="font-mono" style={{ color: 'var(--color-text-dim)' }}>{fmt(roth401kMonthly)}/mo</span>
                      </span>
                    )}
                    {employerMatch > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        Match{trad401kMonthly > 0 && roth401kMonthly === 0 ? ' → Trad' : roth401kMonthly > 0 && trad401kMonthly === 0 ? ' → Roth' : ''}{' '}
                        <span className="font-mono" style={{ color: 'var(--color-text-dim)' }}>{fmt(employerMatch)}/mo</span>
                      </span>
                    )}
                    {hsaMonthly > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        HSA <span className="font-mono" style={{ color: 'var(--color-text-dim)' }}>{fmt(hsaMonthly)}/mo</span>
                      </span>
                    )}
                    {rothIraMonthly > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        Roth IRA <span className="font-mono" style={{ color: 'var(--color-text-dim)' }}>{fmt(rothIraMonthly)}/mo</span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            <LineChart
              data={retChartData}
              height={180}
              benchmarks={grossMonthly > 0 ? benchmarks : []}
              isMobile={isMobile}
              badgeOverlay={!isMobile && retChartData.length > 0 ? (
                <MilestoneBadges
                  earnedDollar={earnedDollar}
                  fidelityOnTrack={fidelityOnTrack}
                />
              ) : undefined}
            />
            {isMobile && retChartData.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <MilestoneBadges
                  earnedDollar={earnedDollar}
                  fidelityOnTrack={fidelityOnTrack}
                  compact
                />
              </div>
            )}
          </Card>
        </div>
      </div>
      <MilestoneToast newlyUnlocked={newlyUnlocked} />
    </div>
  )
}
