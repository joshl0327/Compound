import type { Debt } from '../types'
import { calcPayoff, payoffDate } from '../lib/calculations'
import { fmtCurrencyInput, stripCommas, fmt } from '../lib/format'

export interface DebtCardProps {
  debt: Debt
  color: string
  onChange: (updated: Debt) => void
  onDelete: () => void
  onCommitSort?: () => void
}

function getMonthsUntilPromoEnd(debt: Debt): number {
  if (!debt.isPromo || !debt.promoEndDate) return 0
  const promoEnd = new Date(debt.promoEndDate)
  const now = new Date()
  if (promoEnd <= now) return 0
  return Math.ceil((promoEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
}

export default function DebtCard({ debt, color, onChange, onDelete, onCommitSort }: DebtCardProps) {
  const promoMonthsLeft = getMonthsUntilPromoEnd(debt)

  const minPay = parseFloat(debt.minPayment) || 0
  const planPay = parseFloat(debt.planPayment !== undefined ? debt.planPayment : debt.minPayment) || minPay
  const extra = planPay - minPay

  // Payoff calculation: use effective rate
  const effectiveRate = debt.isPromo && promoMonthsLeft > 0
    ? 0
    : parseFloat(debt.isPromo ? (debt.postPromoRate ?? debt.rate) : debt.rate) || 0
  const payoff = calcPayoff(debt.balance, effectiveRate, planPay)

  const displayRateLabel = debt.isPromo && promoMonthsLeft > 0 ? 'Post-Promo APR %' : 'APR %'
  const displayRateValue = debt.isPromo ? (debt.postPromoRate || '') : (debt.rate || '')

  const inputBase = 'w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono outline-none border'

  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#0a1520', borderLeft: `3px solid ${color}` }}
    >
      {/* Top row: name + badges + delete */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={debt.name}
            onChange={e => onChange({ ...debt, name: e.target.value })}
            className="bg-transparent border-none outline-none font-bold text-[14px] text-slate-100 flex-1 min-w-0 p-0"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          {debt.isPromo && (
            <span className="text-[10px] font-semibold px-1.5 py-px rounded flex-shrink-0"
              style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
              PROMO
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="bg-transparent border-none text-[16px] px-1.5 py-0.5 cursor-pointer flex-shrink-0"
          style={{ color: '#3a5a7a' }}
        >
          ×
        </button>
      </div>

      {/* Balance + Rate row */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Balance</div>
          <input
            type="text"
            inputMode="numeric"
            value={fmtCurrencyInput(debt.balance)}
            onChange={e => onChange({ ...debt, balance: stripCommas(e.target.value) })}
            onBlur={onCommitSort}
            onKeyDown={e => { if (e.key === 'Enter') onCommitSort?.() }}
            className={inputBase}
            style={{ background: '#060e18', borderColor: '#1e2d3d', color: '#e8f0f8' }}
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>{displayRateLabel}</div>
          <input
            type="text"
            inputMode="decimal"
            value={displayRateValue}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              const field = debt.isPromo ? 'postPromoRate' : 'rate'
              onChange({ ...debt, [field]: v })
            }}
            onBlur={onCommitSort}
            onKeyDown={e => { if (e.key === 'Enter') onCommitSort?.() }}
            className={inputBase}
            style={{ background: '#060e18', borderColor: '#1e2d3d', color: '#e8f0f8' }}
          />
        </div>
      </div>

      {/* Min Payment + Plan Payment row */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Minimum</div>
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
            style={{ background: '#0f1923', borderColor: `${color}44`, color: '#e8f0f8' }}
          />
        </div>
      </div>

      {/* Promo fields section */}
      {debt.isPromo && (
        <div className="mt-2.5 rounded-[8px] p-3" style={{ background: '#060e18', border: '1px solid #10b98133' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.06em] mb-2.5" style={{ color: '#10b981' }}>
            Promo Details
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Promo Rate %</div>
              <input
                type="text"
                inputMode="decimal"
                value={debt.promoRate || '0'}
                onChange={e => onChange({ ...debt, promoRate: e.target.value.replace(/[^0-9.]/g, '') })}
                className={inputBase}
                style={{ background: '#0a1520', borderColor: '#1e2d3d', color: '#e8f0f8' }}
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] mb-1" style={{ color: '#5a7a9a' }}>Promo End Date</div>
              <input
                type="date"
                value={debt.promoEndDate || ''}
                onChange={e => onChange({ ...debt, promoEndDate: e.target.value })}
                className={inputBase}
                style={{ background: '#0a1520', borderColor: '#1e2d3d', color: '#e8f0f8' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payoff summary */}
      {payoff !== null && (
        <div className="mt-2.5 text-[11px]" style={{ color: '#4a7fa5' }}>
          Payoff in{' '}
          <span className="font-mono font-bold" style={{ color: '#10b981' }}>
            {payoff.months} mo ({payoffDate(payoff.months)})
          </span>
          {payoff.totalInterest > 0 && (
            <> · <span className="font-mono">{fmt(payoff.totalInterest)} interest</span></>
          )}
        </div>
      )}
      {payoff === null && parseFloat(debt.balance) > 0 && planPay > 0 && (
        <div className="mt-2.5 text-[11px]" style={{ color: '#ef4444' }}>
          Payment too low to cover interest — increase plan payment
        </div>
      )}

      {/* Promo warnings */}
      {debt.isPromo && promoMonthsLeft > 0 && (
        <div
          className="mt-2 rounded-[8px] px-3 py-2 text-[12px]"
          style={{ background: 'linear-gradient(135deg, #1a1000, #120b00)', border: '1px solid #f97316aa', color: '#f97316' }}
        >
          Rate jumps to {debt.postPromoRate}% APR in {promoMonthsLeft} months. Pay off before then to avoid interest.
        </div>
      )}
      {debt.isPromo && promoMonthsLeft === 0 && debt.promoEndDate && (
        <div
          className="mt-2 rounded-[8px] px-3 py-2 text-[12px]"
          style={{ background: '#1a0a0a', border: '1px solid #ef444444', color: '#ef4444' }}
        >
          Promo period has ended. Now accruing at {debt.postPromoRate}% APR.
        </div>
      )}
    </div>
  )
}
