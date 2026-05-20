import type { Debt } from '../types'
import { fmtCurrencyInput, stripCommas, fmt } from '../lib/format'

const MORTGAGE_COLOR = '#2a4060'

export interface MortgageCardProps {
  debt: Debt
  onChange: (updated: Debt) => void
  onDelete: () => void
}

export default function MortgageCard({ debt, onChange, onDelete }: MortgageCardProps) {
  const pi = parseFloat(debt.minPayment) || 0
  const escrow = parseFloat(debt.monthlyEscrow || '') || 0
  const piti = pi + escrow

  const startLabel = debt.loanStartDate
    ? new Date(debt.loanStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null
  const endLabel = debt.loanEndDate
    ? new Date(debt.loanEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  const planPay = parseFloat(debt.planPayment !== undefined ? debt.planPayment : debt.minPayment) || pi
  const extra = planPay - pi

  const inputBase = 'w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono outline-none border'

  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#0a1520', borderLeft: `3px solid ${MORTGAGE_COLOR}` }}
    >
      {/* Top row: name + MORTGAGE badge + delete */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={debt.name}
            onChange={e => onChange({ ...debt, name: e.target.value })}
            className="bg-transparent border-none outline-none font-bold text-[14px] text-slate-100 flex-1 min-w-0 p-0"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <span
            className="text-[10px] font-semibold px-1.5 py-px rounded flex-shrink-0"
            style={{ background: '#1d4ed833', color: '#60a5fa', border: '1px solid #1d4ed855' }}
          >
            MORTGAGE
          </span>
        </div>
        <button
          onClick={onDelete}
          className="bg-transparent border-none text-[16px] px-1.5 py-0.5 cursor-pointer flex-shrink-0"
          style={{ color: '#3a5a7a' }}
        >
          ×
        </button>
      </div>

      {/* Balance row (full width for mortgage) */}
      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Loan Balance</div>
        <input
          type="text"
          inputMode="numeric"
          value={fmtCurrencyInput(debt.balance)}
          onChange={e => onChange({ ...debt, balance: stripCommas(e.target.value) })}
          className={inputBase}
          style={{ background: '#060e18', borderColor: '#1e2d3d', color: '#e8f0f8' }}
        />
      </div>

      {/* P&I + Plan Payment */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>P&amp;I Payment</div>
          <input
            type="text"
            inputMode="numeric"
            value={fmtCurrencyInput(debt.minPayment)}
            onChange={e => onChange({ ...debt, minPayment: stripCommas(e.target.value) })}
            className={inputBase}
            style={{ background: '#060e18', borderColor: '#1e2d3d', color: '#e8f0f8' }}
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>
            Plan Payment
            {extra > 0.005 && (
              <span className="font-bold normal-case tracking-normal text-[10px]" style={{ color: '#10b981' }}>
                +{fmt(extra)} extra
              </span>
            )}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={fmtCurrencyInput(debt.planPayment !== undefined ? debt.planPayment : debt.minPayment)}
            onChange={e => onChange({ ...debt, planPayment: stripCommas(e.target.value) })}
            className={inputBase}
            style={{ background: '#0f1923', borderColor: `${MORTGAGE_COLOR}44`, color: '#e8f0f8' }}
          />
        </div>
      </div>

      {/* Mortgage Details panel */}
      <div className="mt-2.5 rounded-[8px] p-3" style={{ background: '#060e18', border: '1px solid #1e3a5f' }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.06em] mb-2.5" style={{ color: '#60a5fa' }}>
          Mortgage Details
        </div>

        {/* Escrow row */}
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Monthly Escrow</div>
            <input
              type="text"
              inputMode="decimal"
              value={fmtCurrencyInput(debt.monthlyEscrow || '')}
              placeholder="0"
              onChange={e => onChange({ ...debt, monthlyEscrow: stripCommas(e.target.value) })}
              className={inputBase}
              style={{ background: '#0a1520', borderColor: '#1e3a5f', color: '#e8f0f8' }}
            />
            <div className="text-[10px] mt-0.5" style={{ color: '#3a5a7a' }}>Taxes + Insurance</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Escrow Balance</div>
            <input
              type="text"
              inputMode="decimal"
              value={fmtCurrencyInput(debt.escrowBalance || '')}
              placeholder="0"
              onChange={e => onChange({ ...debt, escrowBalance: stripCommas(e.target.value) })}
              className={inputBase}
              style={{ background: '#0a1520', borderColor: '#1e3a5f', color: '#e8f0f8' }}
            />
          </div>
        </div>

        {/* Dates row */}
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Loan Start</div>
            <input
              type="date"
              value={debt.loanStartDate || ''}
              onChange={e => onChange({ ...debt, loanStartDate: e.target.value })}
              className={inputBase}
              style={{ background: '#0a1520', borderColor: '#1e3a5f', color: '#e8f0f8', fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Loan End (Payoff Date)</div>
            <input
              type="date"
              value={debt.loanEndDate || ''}
              onChange={e => onChange({ ...debt, loanEndDate: e.target.value })}
              className={inputBase}
              style={{ background: '#0a1520', borderColor: '#1e3a5f', color: '#e8f0f8', fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>

        {/* PITI summary + duration */}
        <div
          className="flex justify-between items-center flex-wrap gap-2 pt-2"
          style={{ borderTop: '1px solid #1e3a5f' }}
        >
          {piti > 0 && (
            <div className="text-[12px]" style={{ color: '#e8f0f8' }}>
              <span style={{ color: '#5a7a9a' }}>Total PITI: </span>
              <span className="font-mono font-bold" style={{ color: '#60a5fa' }}>{fmt(piti)}/mo</span>
            </div>
          )}
          {startLabel && endLabel && (
            <div className="text-[12px]" style={{ color: '#5a7a9a' }}>
              {startLabel} — {endLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
