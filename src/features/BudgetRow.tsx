import { fmtCurrencyInput, stripCommas } from '../lib/format'

function RowHeader() {
  return (
    <div className="grid gap-2 px-3 mb-1" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
      <div className="text-[10px] text-muted uppercase tracking-[0.06em]">Category</div>
      <div className="text-[10px] text-muted uppercase tracking-[0.06em]">Monthly Amount</div>
      <div />
    </div>
  )
}

interface BudgetRowProps {
  label: string
  baseline: string
  color?: string
  readOnly?: boolean
  onBaselineChange?: (v: string) => void
  onDelete?: () => void
}

export { RowHeader }

export default function BudgetRow({ label, baseline, color = '#3b82f6', readOnly, onBaselineChange, onDelete }: BudgetRowProps) {
  return (
    <div
      className="grid gap-2 items-center px-3 py-2 bg-surface rounded-[10px] mb-1.5"
      style={{ gridTemplateColumns: '1fr 1fr auto', borderLeft: `3px solid ${color}` }}
    >
      <div className="text-xs font-semibold text-slate-100 leading-tight">{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={fmtCurrencyInput(baseline)}
        readOnly={readOnly}
        onChange={e => { if (onBaselineChange) onBaselineChange(stripCommas(e.target.value)) }}
        className="w-full rounded-[6px] px-2 py-1.5 text-[13px] font-mono outline-none"
        style={{
          background: readOnly ? 'var(--color-bg)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: readOnly ? 'var(--color-text-muted)' : 'var(--color-text)',
        }}
      />
      <div className="w-6">
        {onDelete && (
          <button onClick={onDelete} className="bg-transparent border-none text-muted text-[15px] p-0.5 cursor-pointer">×</button>
        )}
      </div>
    </div>
  )
}
