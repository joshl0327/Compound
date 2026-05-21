import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtCurrencyInput, stripCommas } from '../lib/format'
import { calcPayoff, payoffDate } from '../lib/calculations'
import { Card, SectionTitle } from '../components'
import type { PlanGoal } from '../types'

export default function PlanTab() {
  const { data, setData } = useData()
  const { netMonthly, planTabSurplus, planTabTotalWithSavings, planTabBaselineTotal } = useMetrics()

  const [newGoal, setNewGoal] = useState<{ name: string; target: string; monthly: string }>({
    name: '',
    target: '',
    monthly: '',
  })

  function setPlanEssential(id: string, val: string) {
    setData(d => ({ ...d, plan: { ...d.plan, essentials: { ...d.plan.essentials, [id]: val } } }))
  }

  function setPlanDiscretionary(id: string, val: string) {
    setData(d => ({ ...d, plan: { ...d.plan, discretionary: { ...d.plan.discretionary, [id]: val } } }))
  }

  function setPlanDebt(id: string, val: string) {
    setData(d => ({ ...d, debts: d.debts.map(debt => debt.id === id ? { ...debt, planPayment: val } : debt) }))
  }

  function resetToBaseline() {
    if (window.confirm('Reset all plan expense values to current baseline?')) {
      setData(d => ({
        ...d,
        plan: { ...d.plan, essentials: {}, discretionary: {}, debtPayments: {} },
      }))
    }
  }

  function addGoal() {
    if (!newGoal.name) return
    const goal: PlanGoal = {
      id: String(Date.now()),
      name: newGoal.name,
      target: newGoal.target,
      monthly: newGoal.monthly,
    }
    setData(d => ({
      ...d,
      plan: { ...d.plan, goals: [...(d.plan.goals || []), goal] },
    }))
    setNewGoal({ name: '', target: '', monthly: '' })
  }

  function removeGoal(goalId: string) {
    setData(d => ({
      ...d,
      plan: { ...d.plan, goals: (d.plan.goals || []).filter(g => g.id !== goalId) },
    }))
  }

  const nonMortgageDebts = data.debts.filter(d => !d.isMortgage)

  const maxPlanMonths = nonMortgageDebts.length > 0
    ? Math.max(...nonMortgageDebts.map(d => {
        const pay = parseFloat(d.planPayment || '') || parseFloat(d.minPayment) || 0
        const result = calcPayoff(d.balance, d.rate, pay)
        return result ? result.months : 0
      }))
    : 0

  return (
    <div>
      {/* Page heading */}
      <h1 className="text-2xl font-display font-extrabold m-0 mb-1">Plan</h1>
      <p className="text-[13px] text-[#5a7a9a] mt-0 mb-4">
        What-if sandbox. Adjust plan expenses, set savings goals, and model debt payoff scenarios without affecting your Expenses tab.
      </p>

      {/* Reset button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={resetToBaseline}
          className="px-4 py-2 text-[12px] font-semibold text-[#5a7a9a] border border-[#1a2840] rounded-lg cursor-pointer"
          style={{ background: '#0a1520' }}
        >
          Reset to Baseline
        </button>
      </div>

      {/* Header stats bar */}
      <div
        className="flex justify-between items-center flex-wrap gap-3 rounded-xl px-[18px] py-[14px] mb-[18px] border border-[#1a2840]"
        style={{ background: '#0a1520' }}
      >
        {/* Take-Home */}
        <div>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-0.5">Take-Home</div>
          <div className="font-mono text-[20px] font-bold text-[#10b981]">{fmt(netMonthly)}</div>
        </div>
        {/* Baseline */}
        <div>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-0.5">Baseline</div>
          <div className="font-mono text-[18px] font-bold text-[#5a7a9a]">{fmt(planTabBaselineTotal)}</div>
        </div>
        {/* Plan Total */}
        <div>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-0.5">Plan Total</div>
          <div
            className="font-mono text-[18px] font-bold"
            style={{ color: planTabTotalWithSavings > planTabBaselineTotal ? '#f97316' : '#a78bfa' }}
          >
            {fmt(planTabTotalWithSavings)}
          </div>
        </div>
        {/* Remaining */}
        <div>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-0.5">Remaining</div>
          <div
            className="font-mono text-[20px] font-bold"
            style={{ color: planTabSurplus >= 0 ? '#10b981' : '#ef4444' }}
          >
            {fmt(planTabSurplus)}
          </div>
        </div>
      </div>

      {/* Essentials section */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent="#60a5fa">Essentials</SectionTitle>
        {/* Column headers */}
        <div className="grid gap-2 px-3 mb-1" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Category</div>
          <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Actual</div>
          <div className="text-[10px] text-[#60a5fa] uppercase tracking-[0.06em]">Plan</div>
          <div />
        </div>
        {data.budget.essentials.map(item => {
          const planVal =
            data.plan?.essentials?.[item.id] !== undefined
              ? data.plan.essentials[item.id]
              : item.baseline
          return (
            <div
              key={item.id}
              className="grid gap-2 items-center px-3 py-2 rounded-[10px] mb-1.5"
              style={{ gridTemplateColumns: '1fr 1fr 1fr auto', background: '#0a1520', borderLeft: '3px solid #60a5fa' }}
            >
              <div className="text-xs font-semibold text-slate-100">{item.name}</div>
              {/* Actual (read-only) */}
              <div
                className="rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-[#5a7a9a]"
                style={{ background: '#060e18', border: '1px solid #1e2d3d' }}
              >
                {fmtCurrencyInput(item.baseline)}
              </div>
              {/* Plan (editable) */}
              <input
                type="text"
                inputMode="decimal"
                value={fmtCurrencyInput(planVal)}
                onChange={e => setPlanEssential(item.id, stripCommas(e.target.value))}
                className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-slate-100 outline-none"
                style={{ background: '#0f1923', border: '1px solid #60a5fa44', boxSizing: 'border-box' }}
              />
              <div className="w-6" />
            </div>
          )
        })}
      </Card>

      {/* Discretionary section */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent="#f59e0b">Discretionary</SectionTitle>
        {data.budget.discretionary.length === 0 ? (
          <p className="text-[#5a7a9a] text-[13px]">No discretionary items added yet.</p>
        ) : (
          <>
            <div className="grid gap-2 px-3 mb-1" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Category</div>
              <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em]">Actual</div>
              <div className="text-[10px] text-[#f59e0b] uppercase tracking-[0.06em]">Plan</div>
              <div />
            </div>
            {data.budget.discretionary.map(item => {
              const planVal =
                data.plan?.discretionary?.[item.id] !== undefined
                  ? data.plan.discretionary[item.id]
                  : item.baseline
              return (
                <div
                  key={item.id}
                  className="grid gap-2 items-center px-3 py-2 rounded-[10px] mb-1.5"
                  style={{ gridTemplateColumns: '1fr 1fr 1fr auto', background: '#0a1520', borderLeft: '3px solid #f59e0b' }}
                >
                  <div className="text-xs font-semibold text-slate-100">{item.name}</div>
                  <div
                    className="rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-[#5a7a9a]"
                    style={{ background: '#060e18', border: '1px solid #1e2d3d' }}
                  >
                    {fmtCurrencyInput(item.baseline)}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fmtCurrencyInput(planVal)}
                    onChange={e => setPlanDiscretionary(item.id, stripCommas(e.target.value))}
                    className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-slate-100 outline-none"
                    style={{ background: '#0f1923', border: '1px solid #f59e0b44', boxSizing: 'border-box' }}
                  />
                  <div className="w-6" />
                </div>
              )
            })}
          </>
        )}
      </Card>

      {/* Savings Goal Planner */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent="#14b8a6">Savings Goal Planner</SectionTitle>
        {/* Existing goals */}
        {(data.plan?.goals?.length ?? 0) > 0 && (
          <div className="mb-3.5">
            {(data.plan.goals || []).map(goal => {
              const monthly = parseFloat(goal.monthly) || 0
              const target = parseFloat(goal.target) || 0
              const months = monthly > 0 && target > 0 ? Math.ceil(target / monthly) : null
              const projDate = months ? payoffDate(months) : null
              return (
                <div
                  key={goal.id}
                  className="flex justify-between items-start flex-wrap gap-2 px-3 py-3 rounded-[10px] mb-2"
                  style={{ background: '#0a1520', borderLeft: '3px solid #14b8a6' }}
                >
                  <div>
                    <div className="text-[13px] font-semibold text-slate-100 mb-1">
                      {goal.name || 'Unnamed Goal'}
                    </div>
                    <div className="text-[11px] text-[#5a7a9a]">
                      {fmt(monthly)}/mo toward {fmt(target)}
                    </div>
                    {months && (
                      <div className="text-[11px] text-[#14b8a6] mt-0.5">
                        {months} months → {projDate}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="bg-transparent border-none text-[#3a5a7a] text-[18px] p-0.5 cursor-pointer leading-none"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {/* Add goal form */}
        <div className="grid gap-2 items-end" style={{ gridTemplateColumns: '2fr 1fr 1fr auto' }}>
          <div>
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-1">Goal Name</div>
            <input
              type="text"
              placeholder="e.g. New Car"
              value={newGoal.name}
              onChange={e => setNewGoal(g => ({ ...g, name: e.target.value }))}
              className="w-full rounded-[6px] px-2 py-1.5 text-[13px] text-slate-100 outline-none"
              style={{ background: '#0f1923', border: '1px solid #1e2d3d', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-1">Target ($)</div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="5,000"
              value={fmtCurrencyInput(newGoal.target)}
              onChange={e => setNewGoal(g => ({ ...g, target: stripCommas(e.target.value) }))}
              className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-slate-100 outline-none"
              style={{ background: '#0f1923', border: '1px solid #1e2d3d', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-1">Monthly ($)</div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="200"
              value={fmtCurrencyInput(newGoal.monthly)}
              onChange={e => setNewGoal(g => ({ ...g, monthly: stripCommas(e.target.value) }))}
              className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-slate-100 outline-none"
              style={{ background: '#0f1923', border: '1px solid #1e2d3d', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={addGoal}
            className="px-4 py-1.5 text-[13px] font-bold text-black rounded-lg cursor-pointer border-none self-end"
            style={{ background: '#14b8a6' }}
          >
            Add
          </button>
        </div>
      </Card>

      {/* Debt Obligations */}
      <Card>
        <SectionTitle accent="#f97316">Debt Obligations</SectionTitle>
        {nonMortgageDebts.length === 0 ? (
          <p className="text-[#5a7a9a] text-[13px]">No non-mortgage debts added yet.</p>
        ) : (
          <>
            {nonMortgageDebts.map(debt => {
              const balance = parseFloat(debt.balance) || 0
              const rate = parseFloat(debt.rate) || 0
              const planPayRaw = debt.planPayment || debt.minPayment || ''
              const planPay = parseFloat(planPayRaw) || 0
              const minPay = parseFloat(debt.minPayment) || 0
              const minResult = calcPayoff(balance, rate, minPay)
              const planResult = calcPayoff(balance, rate, planPay)

              return (
                <div
                  key={debt.id}
                  className="px-[14px] py-[14px] rounded-[10px] mb-2.5"
                  style={{ background: '#0a1520', borderLeft: '3px solid #f97316' }}
                >
                  {/* Debt header */}
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="text-[13px] font-semibold text-slate-100">{debt.name}</div>
                    <div className="text-[12px] text-[#5a7a9a] font-mono">
                      {fmt(balance)} @ {rate}%
                    </div>
                  </div>
                  {/* Two-column layout: min vs plan */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Min Payment column */}
                    <div className="rounded-lg px-3 py-2.5" style={{ background: '#060e18' }}>
                      <div className="text-[10px] text-[#5a7a9a] uppercase tracking-[0.06em] mb-1.5">
                        Min Payment — {fmt(minPay)}/mo
                      </div>
                      {minResult ? (
                        <>
                          <div className="text-[13px] font-semibold text-slate-100 font-mono">{minResult.months} months</div>
                          <div className="text-[11px] text-[#5a7a9a]">{payoffDate(minResult.months)}</div>
                          <div className="text-[11px] text-[#f97316] mt-0.5">{fmt(minResult.totalInterest)} in interest</div>
                        </>
                      ) : (
                        <div className="text-[12px] text-[#ef4444]">Payment too low</div>
                      )}
                    </div>
                    {/* Plan Payment column */}
                    <div
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: '#060e18', border: '1px solid #f9741633' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="text-[10px] text-[#f97316] uppercase tracking-[0.06em] whitespace-nowrap">
                          Plan —
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fmtCurrencyInput(planPayRaw)}
                          onChange={e => setPlanDebt(debt.id, stripCommas(e.target.value))}
                          className="w-full rounded text-[11px] font-mono text-[#f97316] outline-none px-1.5 py-0.5"
                          style={{
                            background: '#0f1923',
                            border: '1px solid #f9741644',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div className="text-[10px] text-[#f97316] whitespace-nowrap">/mo</div>
                      </div>
                      {planResult ? (
                        <>
                          <div
                            className="text-[13px] font-semibold font-mono"
                            style={{
                              color: minResult && planResult.months < minResult.months ? '#10b981' : '#e8f0f8',
                            }}
                          >
                            {planResult.months} months
                          </div>
                          <div className="text-[11px] text-[#5a7a9a]">{payoffDate(planResult.months)}</div>
                          <div
                            className="text-[11px] mt-0.5"
                            style={{
                              color: minResult && planResult.totalInterest < minResult.totalInterest ? '#10b981' : '#f97316',
                            }}
                          >
                            {fmt(planResult.totalInterest)} in interest
                          </div>
                        </>
                      ) : (
                        <div className="text-[12px] text-[#ef4444]">Payment too low</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {maxPlanMonths > 0 && (
              <div
                className="mt-2.5 flex justify-between items-center rounded-[10px] px-4 py-2.5"
                style={{
                  background: 'linear-gradient(135deg, #0d1f10, #0a1c14)',
                  border: '1px solid #10b98133',
                }}
              >
                <span className="text-[13px] text-[#8b9cb5] font-semibold">Consumer Debt-Free</span>
                <span className="font-mono text-[15px] text-[#10b981] font-bold">
                  {payoffDate(maxPlanMonths)}
                </span>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
