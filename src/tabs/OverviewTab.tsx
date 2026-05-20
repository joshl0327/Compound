import { Badge } from '../components'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { useData } from '../context/DataContext'
import { fmtCurrencyInput, stripCommas } from '../lib/format'

export default function OverviewTab() {
  const { data, setData } = useData()
  const {
    grossMonthly, netMonthly,
    housingPct, consumerDti, dti, consumerDtiTotal,
    retireRate, savingsRate,
    planSurplus, essTotalP, debtPlanTotal, discPlanTotal,
    liquidSavingsMonthly, investMonthly, rothIraMonthly,
    postTaxSavingsMonthly,
    calcPayoff, debtColor, payoffDate,
  } = useMetrics()

  // Debt sorting (avalanche: highest rate first, snowball: lowest balance first)
  const consumerDebts = data.debts.filter(d => !d.isMortgage)
  const mortgageDebts = data.debts.filter(d => d.isMortgage)
  const strategy = data.settings.debtStrategy
  const sortedConsumer = [...consumerDebts].sort((a, b) => {
    if (strategy === 'avalanche') return (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0)
    if (strategy === 'snowball') return (parseFloat(a.balance) || 0) - (parseFloat(b.balance) || 0)
    return 0
  })
  const sortedDebts = [...sortedConsumer, ...mortgageDebts]
  const consumerDebtCount = sortedConsumer.length

  // Consumer debt total balance for badge
  const consumerDebtBalance = consumerDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)
  const hasMortgage = data.debts.some(d => d.isMortgage)

  // Max payoff months for debt-free date
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

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Financial Overview</h1>
      <p className="m-0 mb-5 text-[#5a7a9a] text-[13px]">Your complete picture at a glance.</p>

      {/* Badge row */}
      <div className="grid gap-2.5 mb-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Badge
          label="Gross Income"
          value={fmt(grossMonthly)}
          color="#60a5fa"
          sub="/month"
        />
        <Badge
          label="Take-Home"
          value={fmt(netMonthly)}
          color="#10b981"
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
          color={parseFloat(retireRate) > 0 ? '#a78bfa' : '#3a5a7a'}
          sub={parseFloat(retireRate) > 0 ? undefined : 'Set contributions in Invest & Retire'}
          tooltip="Percentage of gross income going to retirement accounts (401k, Roth IRA, HSA). 15% is a common target for retiring comfortably at 65. Capture any employer match first — it's free money."
        />
        <Badge
          label="Total Savings Rate"
          value={parseFloat(savingsRate) > 0 ? savingsRate + '%' : '—'}
          color={parseFloat(savingsRate) > 0 ? '#10b981' : '#3a5a7a'}
          sub={parseFloat(savingsRate) > 0 ? undefined : 'Add income & savings'}
          tooltip="How much of your gross income you're setting aside across all accounts. 10% = getting started, 15% = on track, 20%+ = building wealth aggressively."
        />
      </div>

      {/* Two-column grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Debt Payoff Timeline */}
        <Card>
          <SectionTitle accent="#f97316">Debt Payoff Timeline</SectionTitle>
          {data.debts.length === 0 ? (
            <div className="text-[#3a5a7a] text-[13px] text-center py-5">
              No debts added yet. Add them in the Expenses tab.
            </div>
          ) : (
            <div>
              {sortedDebts.map((debt, i) => {
                const balance = parseFloat(debt.balance) || 0
                const rate = parseFloat(debt.rate) || 0
                const minPay = parseFloat(debt.minPayment) || 0
                const planPay = parseFloat(debt.planPayment !== undefined ? debt.planPayment : debt.minPayment) || minPay
                const result = calcPayoff(balance, rate, planPay)
                const months = result ? result.months : null
                const extra = planPay - minPay
                const color = debt.isMortgage ? '#2a4060' : debtColor(i, consumerDebtCount)

                return (
                  <div
                    key={debt.id}
                    className="rounded-[10px] mb-1.5"
                    style={{
                      padding: '10px 12px',
                      background: '#0a1520',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                          {debt.name}
                          {debt.isMortgage && (
                            <span
                              className="text-[9px] font-semibold rounded"
                              style={{
                                background: '#1d4ed833',
                                color: '#60a5fa',
                                border: '1px solid #1d4ed855',
                                padding: '1px 5px',
                              }}
                            >
                              MORTGAGE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#4a7fa5] mt-0.5">
                          {fmt(balance)} at {rate}% APR
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="font-mono text-[12px] font-bold"
                          style={{ color: months ? '#10b981' : '#ef4444' }}
                        >
                          {months ? payoffDate(months) : 'Never'}
                        </div>
                        <div className="text-[11px] text-[#4a7fa5]">
                          {months ? `${months} mo` : 'increase payment'}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div>
                        <div
                          className="text-[10px] text-[#5a7a9a] uppercase mb-1"
                          style={{ letterSpacing: '0.06em' }}
                        >
                          Minimum
                        </div>
                        <div
                          className="font-mono text-[12px] text-[#5a7a9a] rounded"
                          style={{
                            background: '#060e18',
                            border: '1px solid #1e2d3d',
                            padding: '5px 8px',
                          }}
                        >
                          {fmt(minPay)}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-[10px] text-[#5a7a9a] uppercase mb-1 flex items-center gap-1.5"
                          style={{ letterSpacing: '0.06em' }}
                        >
                          Plan Payment
                          {extra > 0.005 && (
                            <span className="text-[10px] text-[#10b981] font-bold normal-case" style={{ letterSpacing: 0 }}>
                              +{fmt(extra)} extra
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fmtCurrencyInput(debt.planPayment !== undefined ? debt.planPayment : debt.minPayment)}
                          onChange={e => {
                            const v = stripCommas(e.target.value)
                            setData(d => ({
                              ...d,
                              debts: d.debts.map(x =>
                                x.id === debt.id ? { ...x, planPayment: v } : x
                              ),
                            }))
                          }}
                          className="w-full font-mono text-[12px] text-[#e8f0f8] outline-none box-border rounded"
                          style={{
                            background: '#0f1923',
                            border: `1px solid ${color}44`,
                            padding: '5px 8px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Consumer Debt-Free Date */}
              {maxConsumerMonths > 0 && (
                <div
                  className="mt-2.5 rounded-[10px] flex justify-between items-center"
                  style={{
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #0d1f10, #0a1c14)',
                    border: '1px solid #10b98133',
                  }}
                >
                  <span className="text-[13px] text-[#8b9cb5] font-semibold">Consumer Debt-Free Date</span>
                  <span className="font-mono text-[15px] text-[#10b981] font-bold">
                    {payoffDate(maxConsumerMonths)}
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Take-Home Budget Summary */}
        <Card>
          <SectionTitle accent="#a78bfa">Take-Home Budget Summary (Plan)</SectionTitle>
          {[
            ['Essentials', fmt(essTotalP)],
            ['Debt Payments', fmt(debtPlanTotal)],
            ['Discretionary', fmt(discPlanTotal)],
            ['Savings', fmt(liquidSavingsMonthly + investMonthly)],
            ['Retirement (post-tax)', fmt(rothIraMonthly)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between mb-2">
              <span className="text-[13px] text-[#8b9cb5]">{label}</span>
              <span className="font-mono text-[13px] text-[#60a5fa] font-semibold">{value}</span>
            </div>
          ))}
          <div
            className="flex justify-between pt-2 mt-1"
            style={{ borderTop: '1px solid #1e2d3d' }}
          >
            <span className="text-[13px] font-bold text-[#e8f0f8]">Remaining</span>
            <span
              className="font-mono text-[15px] font-bold"
              style={{ color: (planSurplus - postTaxSavingsMonthly) >= 0 ? '#10b981' : '#ef4444' }}
            >
              {fmt(planSurplus - postTaxSavingsMonthly)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
