import { useData } from '../context/DataContext'
import { useMetrics } from '../hooks/useMetrics'
import { fmt } from '../lib/format'
import SavingsCard from '../features/SavingsCard'

export default function SavingsTab() {
  const { data, setData } = useData()
  const { planSurplus, rothIraMonthly, investMonthly } = useMetrics()

  const planEfMonthly =
    data.plan?.savings?.emergencyFund !== undefined
      ? parseFloat(data.plan.savings.emergencyFund) || 0
      : parseFloat(data.savings.emergencyFund.monthly) || 0

  const planGenMonthly =
    data.plan?.savings?.generalSavings !== undefined
      ? parseFloat(data.plan.savings.generalSavings) || 0
      : parseFloat(data.savings.generalSavings.monthly) || 0

  const planLiquidSavingsMonthly = planEfMonthly + planGenMonthly
  const remaining = planSurplus - planLiquidSavingsMonthly - rothIraMonthly - investMonthly

  // Emergency fund actual monthly
  const efMonthlyActual = parseFloat(data.savings.emergencyFund.monthly) || 0
  const genMonthlyActual = parseFloat(data.savings.generalSavings.monthly) || 0

  return (
    <div>
      <h1
        className="m-0 mb-1 font-display font-extrabold"
        style={{ fontSize: 24 }}
      >
        Savings
      </h1>
      <p className="mt-0 mb-5 text-[13px]" style={{ color: '#5a7a9a' }}>
        Emergency fund first, then general savings. Retirement and investing come later.
      </p>

      {/* Summary bar */}
      <div
        className="flex justify-between items-center flex-wrap gap-3 rounded-xl px-5 py-3.5 mb-5"
        style={{
          background:
            planSurplus >= 0
              ? 'linear-gradient(135deg, #0d1f10, #0a1c14)'
              : 'linear-gradient(135deg, #1f0d0d, #1c0a0a)',
          border: `1px solid ${planSurplus >= 0 ? '#10b98133' : '#ef444433'}`,
        }}
      >
        {/* Available */}
        <div>
          <div
            className="text-[10px] uppercase tracking-widest mb-1"
            style={{ color: '#5a7a9a' }}
          >
            Available after expenses
          </div>
          <div
            className="font-mono text-[22px] font-bold"
            style={{ color: planSurplus >= 0 ? '#10b981' : '#ef4444' }}
          >
            {fmt(planSurplus)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex gap-5 flex-wrap">
          <div>
            <div className="text-[10px] mb-1" style={{ color: '#5a7a9a' }}>
              Emergency Fund
            </div>
            <div className="font-mono text-[15px] font-bold" style={{ color: '#60a5fa' }}>
              {fmt(planEfMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1" style={{ color: '#5a7a9a' }}>
              General
            </div>
            <div className="font-mono text-[15px] font-bold" style={{ color: '#60a5fa' }}>
              {fmt(planGenMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1" style={{ color: '#5a7a9a' }}>
              Roth IRA
            </div>
            <div className="font-mono text-[15px] font-bold" style={{ color: '#a78bfa' }}>
              {fmt(rothIraMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1" style={{ color: '#5a7a9a' }}>
              Brokerage
            </div>
            <div className="font-mono text-[15px] font-bold" style={{ color: '#a78bfa' }}>
              {fmt(investMonthly)}
            </div>
          </div>
        </div>

        {/* Remaining */}
        <div>
          <div className="text-[10px] mb-1" style={{ color: '#5a7a9a' }}>
            Remaining
          </div>
          <div
            className="font-mono text-[18px] font-bold"
            style={{ color: remaining >= 0 ? '#10b981' : '#ef4444' }}
          >
            {fmt(remaining)}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Emergency Fund */}
        <SavingsCard
          title="Emergency Fund"
          accent="#60a5fa"
          current={data.savings.emergencyFund.current}
          goal={data.savings.emergencyFund.goal}
          monthly={data.savings.emergencyFund.monthly}
          planMonthly={
            data.plan?.savings?.emergencyFund !== undefined
              ? data.plan.savings.emergencyFund
              : data.savings.emergencyFund.monthly
          }
          onCurrentChange={v =>
            setData(d => ({
              ...d,
              savings: {
                ...d.savings,
                emergencyFund: { ...d.savings.emergencyFund, current: v },
              },
            }))
          }
          onGoalChange={v =>
            setData(d => ({
              ...d,
              savings: {
                ...d.savings,
                emergencyFund: { ...d.savings.emergencyFund, goal: v },
              },
            }))
          }
          onMonthlyChange={v =>
            setData(d => ({
              ...d,
              savings: {
                ...d.savings,
                emergencyFund: { ...d.savings.emergencyFund, monthly: v },
              },
            }))
          }
          onPlanMonthlyChange={v =>
            setData(d => ({
              ...d,
              plan: {
                ...d.plan,
                savings: { ...d.plan.savings, emergencyFund: v },
              },
            }))
          }
          description={`Target: 3–6 months of essential expenses`}
          note="Priority #1 before any other savings or investing. Aim for at least 1 month before paying extra on debt."
        />

        {/* General Savings */}
        <SavingsCard
          title="General Savings"
          accent="#f59e0b"
          goal={data.savings.generalSavings.goal}
          monthly={data.savings.generalSavings.monthly}
          planMonthly={
            data.plan?.savings?.generalSavings !== undefined
              ? data.plan.savings.generalSavings
              : data.savings.generalSavings.monthly
          }
          onGoalChange={v =>
            setData(d => ({
              ...d,
              savings: {
                ...d.savings,
                generalSavings: { ...d.savings.generalSavings, goal: v },
              },
            }))
          }
          onMonthlyChange={v =>
            setData(d => ({
              ...d,
              savings: {
                ...d.savings,
                generalSavings: { ...d.savings.generalSavings, monthly: v },
              },
            }))
          }
          onPlanMonthlyChange={v =>
            setData(d => ({
              ...d,
              plan: {
                ...d.plan,
                savings: { ...d.plan.savings, generalSavings: v },
              },
            }))
          }
          description="Short-term goals: vacation, car, down payment, or building your cushion beyond the emergency fund."
        >
          {/* Annual savings summary */}
          {genMonthlyActual > 0 && (
            <div className="mt-2 rounded-lg p-3" style={{ background: '#0a1520' }}>
              <div className="flex justify-between text-[12px]">
                <span style={{ color: '#5a7a9a' }}>Annual savings</span>
                <span className="font-mono" style={{ color: '#f59e0b' }}>
                  {fmt(genMonthlyActual * 12)}/yr
                </span>
              </div>
            </div>
          )}

          {/* Recommended Priority Order */}
          <div className="mt-3.5 rounded-xl p-3.5" style={{ background: '#0a1520' }}>
            <div
              className="text-[11px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: '#8b9cb5' }}
            >
              Recommended Priority Order
            </div>
            {[
              { step: '1', label: 'Emergency Fund (1 month min)', color: '#60a5fa' },
              { step: '2', label: '401k up to employer match', color: '#10b981' },
              { step: '3', label: 'Full Emergency Fund (3-6 mo)', color: '#60a5fa' },
              { step: '4', label: 'Max Roth IRA ($583/mo)', color: '#a78bfa' },
              { step: '5', label: 'Max 401k ($1,916/mo)', color: '#10b981' },
              { step: '6', label: 'Taxable brokerage investing', color: '#a78bfa' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: item.color + '22',
                    color: item.color,
                  }}
                >
                  {item.step}
                </div>
                <div className="text-[12px]" style={{ color: '#8b9cb5' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </SavingsCard>
      </div>
    </div>
  )
}
