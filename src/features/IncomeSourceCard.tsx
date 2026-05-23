import { useRef } from 'react'
import Input from '../components/Input'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'
import { fmt, fmtDec, fmtCurrencyInput } from '../lib/format'
import { FREQ_OPTIONS } from '../lib/storage'
import type { IncomeSource, FrequencyOption, CustomDeduction } from '../types'

export interface IncomeSourceCardProps {
  source: IncomeSource
  freqOptions: FrequencyOption[]
  onChange: (updated: IncomeSource) => void
  onDelete?: () => void
  isPrimary?: boolean
}

function field(src: IncomeSource, key: keyof IncomeSource, value: unknown): IncomeSource {
  return { ...src, [key]: value }
}

// A row in the paycheck summary
function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-[12px] text-dim">{label}</span>
      <span className="text-[12px] font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

export default function IncomeSourceCard({ source, onChange, onDelete, isPrimary: _isPrimary }: IncomeSourceCardProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  const freqObj = FREQ_OPTIONS.find(f => f.id === source.frequency) || FREQ_OPTIONS[1]
  const perYear = freqObj.perYear
  const isSimple = source.mode !== 'detailed'
  const isW2 = source.type === 'w2'

  // Computed values
  const grossMonthly = isSimple
    ? (parseFloat(source.annualSalary || '') || 0) / 12
    : (parseFloat(source.grossPerPaycheck || '') || 0) * perYear / 12

  const netMonthly = isSimple
    ? (parseFloat(source.takeHomePerPaycheck || '') || 0) * perYear / 12
    : (() => {
        const taxesMo = (parseFloat(source.taxesPerPaycheck || '') || 0) * perYear / 12
        const hsaMo = (parseFloat(source.hsaPerPaycheck || '') || 0) * perYear / 12
        const ret = source.retirement || ({} as NonNullable<IncomeSource['retirement']>)
        const tradMo = ret.use401kPercent !== false
          ? grossMonthly * (parseFloat(ret.traditional401kPct || '') || 0) / 100
          : parseFloat(ret.traditional401kDollar || '') || 0
        const rothMo = ret.use401kPercent !== false
          ? grossMonthly * (parseFloat(ret.roth401kPct || '') || 0) / 100
          : parseFloat(ret.roth401kDollar || '') || 0
        const customMo = (source.customPreTax || []).reduce(
          (s, d) => s + (parseFloat(d.amount) || 0) * perYear / 12,
          0
        )
        return grossMonthly - tradMo - rothMo - taxesMo - hsaMo - customMo
      })()

  const netPerPaycheck = netMonthly * 12 / perYear

  // Deductions for detailed summary
  const ret = source.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  const trad401kMonthly = !isSimple
    ? (ret.use401kPercent !== false
        ? grossMonthly * (parseFloat(ret.traditional401kPct || '') || 0) / 100
        : parseFloat(ret.traditional401kDollar || '') || 0)
    : 0
  const roth401kMonthly = !isSimple
    ? (ret.use401kPercent !== false
        ? grossMonthly * (parseFloat(ret.roth401kPct || '') || 0) / 100
        : parseFloat(ret.roth401kDollar || '') || 0)
    : 0
  const hsaMonthly = (parseFloat(source.hsaPerPaycheck || '') || 0) * perYear / 12
  const taxesMonthly = (parseFloat(source.taxesPerPaycheck || '') || 0) * perYear / 12

  // 401k per-paycheck display value (synced from retirement field if not explicitly set)
  const trad401kPerPaycheckDisplay =
    source.trad401kPaycheck !== undefined && source.trad401kPaycheck !== ''
      ? source.trad401kPaycheck
      : (parseFloat(ret.traditional401kDollar || '') || 0) > 0
        ? String(Math.round((parseFloat(ret.traditional401kDollar || '') || 0) * 12 / perYear * 100) / 100)
        : ''

  const roth401kPerPaycheckDisplay =
    source.roth401kPaycheck !== undefined && source.roth401kPaycheck !== ''
      ? source.roth401kPaycheck
      : (parseFloat(ret.roth401kDollar || '') || 0) > 0
        ? String(Math.round((parseFloat(ret.roth401kDollar || '') || 0) * 12 / perYear * 100) / 100)
        : ''

  function update401k(val: string, field401k: 'traditional401kDollar' | 'roth401kDollar', paycheck401k: 'trad401kPaycheck' | 'roth401kPaycheck') {
    const monthly = (parseFloat(val) || 0) * perYear / 12
    const updatedRet = {
      ...(source.retirement || {}),
      [field401k]: String(monthly),
      use401kPercent: false,
    } as NonNullable<IncomeSource['retirement']>
    onChange({ ...source, [paycheck401k]: val, retirement: updatedRet })
  }

  function updateHsa(val: string) {
    onChange({ ...source, hsaPerPaycheck: val })
  }

  function updateCustomPreTax(deductions: CustomDeduction[]) {
    onChange({ ...source, customPreTax: deductions })
  }

  const freqLabel = freqObj.label.replace('ly', '')

  const badgeStyle = isW2
    ? { background: '#1d4ed833', color: '#60a5fa', border: '1px solid #1d4ed855' }
    : { background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }

  // ─── OTHER INCOME ────────────────────────────────────────────────────────────
  if (!isW2) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 mb-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <input
            ref={nameInputRef}
            type="text"
            value={source.name}
            onChange={e => onChange(field(source, 'name', e.target.value))}
            className="bg-transparent border-none outline-none font-display font-bold text-base text-[color:var(--color-text)] p-0 min-w-0"
          />
          <button
            onClick={() => nameInputRef.current?.select()}
            title="Edit name"
            className="bg-transparent border-none text-muted cursor-pointer p-0.5 flex items-center flex-shrink-0"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <span className="flex-1" />
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={badgeStyle}>Additional</span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-transparent border-none text-muted text-lg cursor-pointer px-1.5 flex-shrink-0"
            >×</button>
          )}
        </div>

        <div>
          <div className="text-[11px] text-subtle uppercase tracking-widest mb-1.5">Monthly Net Income</div>
          <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
            <span className="px-2.5 text-subtle text-[13px] font-semibold">$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1,200"
              value={fmtCurrencyInput(source.monthlyNet)}
              onChange={e => onChange(field(source, 'monthlyNet', e.target.value.replace(/[^0-9.]/g, '')))}
              className="flex-1 bg-transparent border-none outline-none font-mono text-[14px] text-[color:var(--color-text)]"
              style={{ padding: '10px 12px' }}
            />
          </div>
          <div className="text-[11px] text-muted mt-1.5">
            Enter the amount that hits your account after any taxes — side hustle, rental income, etc.
          </div>
        </div>
      </div>
    )
  }

  // ─── W2 INCOME ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Name + mode toggle row */}
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <input
          ref={nameInputRef}
          type="text"
          value={source.name}
          onChange={e => onChange(field(source, 'name', e.target.value))}
          className="bg-transparent border-none outline-none font-display font-bold text-base text-[color:var(--color-text)] p-0 min-w-0"
        />
        <button
          onClick={() => nameInputRef.current?.select()}
          title="Edit name"
          className="bg-transparent border-none text-muted cursor-pointer p-0.5 flex items-center flex-shrink-0"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={badgeStyle}>W2</span>

        <span className="flex-1" />

        {/* Mode toggle */}
        <div className="flex bg-surface rounded-[10px] p-[3px] border border-border flex-shrink-0">
          <button
            onClick={() => onChange(field(source, 'mode', 'simple'))}
            className="px-4 py-2 rounded-lg border-none text-[12px] font-bold cursor-pointer tracking-wider uppercase transition-colors"
            style={{
              background: isSimple ? '#1d4ed8' : 'transparent',
              color: isSimple ? '#fff' : 'var(--color-text-muted)',
            }}
          >Simple</button>
          <button
            onClick={() => onChange(field(source, 'mode', 'detailed'))}
            className="px-4 py-2 rounded-lg border-none text-[12px] font-bold cursor-pointer tracking-wider uppercase transition-colors"
            style={{
              background: !isSimple ? '#1d4ed8' : 'transparent',
              color: !isSimple ? '#fff' : 'var(--color-text-muted)',
            }}
          >Detailed</button>
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className="bg-transparent border-none text-muted text-lg cursor-pointer px-1.5 flex-shrink-0"
          >×</button>
        )}
      </div>

      {/* ── SIMPLE MODE ── */}
      {isSimple && (
        <Card>
          <SectionTitle accent="#60a5fa">Quick Income</SectionTitle>
          <p className="text-[12px] text-dim mt-0 mb-3.5 leading-relaxed">
            Enter what you know — your salary and what hits your bank account. We&apos;ll estimate the rest.
          </p>

          <Input
            label="Annual Gross Salary"
            value={source.annualSalary || ''}
            onChange={v => onChange(field(source, 'annualSalary', v))}
            prefix="$"
            type="number"
            placeholder="0"
          />

          {/* Pay Frequency */}
          <div className="mb-3.5">
            <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-2">Pay Frequency</div>
            <div className="grid grid-cols-2 gap-1.5">
              {FREQ_OPTIONS.map(f => {
                const sel = source.frequency === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => onChange(field(source, 'frequency', f.id))}
                    className="py-2 px-3 rounded-lg text-[12px] font-semibold cursor-pointer border transition-colors"
                    style={{
                      background: sel ? '#1d4ed8' : 'var(--color-surface)',
                      borderColor: sel ? '#1d4ed8' : 'var(--color-border)',
                      color: sel ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >{f.label}</button>
                )
              })}
            </div>
          </div>

          <Input
            label={`Take-Home Per ${freqLabel} Paycheck`}
            value={source.takeHomePerPaycheck || ''}
            onChange={v => onChange(field(source, 'takeHomePerPaycheck', v))}
            prefix="$"
            type="number"
          />

          {/* Summary */}
          <div className="bg-surface rounded-lg p-3 mt-1 text-[12px] text-dim leading-[1.8]">
            <div className="flex justify-between">
              <span>Monthly gross</span>
              <span className="font-mono font-bold text-blue">{fmt(grossMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly take-home</span>
              <span className="font-mono font-bold text-blue">{fmt(netMonthly)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1">
              <span>Inferred deductions</span>
              <span className="font-mono text-blue">{fmt(grossMonthly - netMonthly)}</span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-subtle leading-relaxed">
            Want a precise paycheck breakdown? Switch to Detailed mode.
          </div>
        </Card>
      )}

      {/* ── DETAILED MODE ── */}
      {!isSimple && (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Left column */}
          <div>
            {/* Pay Details card */}
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle accent="#60a5fa">Pay Details</SectionTitle>

              {/* Pay Frequency */}
              <div className="mb-3.5">
                <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-2">Pay Frequency</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {FREQ_OPTIONS.map(f => {
                    const sel = source.frequency === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => onChange(field(source, 'frequency', f.id))}
                        className="py-2 px-3 rounded-lg text-[12px] font-semibold cursor-pointer border transition-colors"
                        style={{
                          background: sel ? '#1d4ed8' : 'var(--color-surface)',
                          borderColor: sel ? '#1d4ed8' : 'var(--color-border)',
                          color: sel ? '#fff' : 'var(--color-text-muted)',
                        }}
                      >{f.label}</button>
                    )
                  })}
                </div>
              </div>

              <Input
                label={`Gross Pay ${freqLabel} Paycheck`}
                value={source.grossPerPaycheck || ''}
                onChange={v => onChange(field(source, 'grossPerPaycheck', v))}
                prefix="$"
                type="number"
              />
              <div className="bg-surface rounded-lg p-2.5 text-[12px] text-dim flex justify-between">
                <span>Monthly gross</span>
                <span className="font-mono font-bold text-blue">{fmt(grossMonthly)}</span>
              </div>
            </Card>

            {/* Deductions card */}
            <Card>
              <SectionTitle accent="#10b981">Deductions Per Paycheck</SectionTitle>
              <p className="text-[12px] text-dim mt-0 mb-3.5 leading-relaxed">
                Enter amounts from your paystub. 401k and HSA sync automatically to Invest &amp; Retire.
              </p>

              <Input
                label="Total Taxes"
                value={source.taxesPerPaycheck || ''}
                onChange={v => onChange(field(source, 'taxesPerPaycheck', v))}
                prefix="$"
                type="number"
              />
              <div className="text-[11px] text-subtle -mt-2 mb-3">
                {source.taxesPerPaycheck
                  ? fmt((parseFloat(source.taxesPerPaycheck) || 0) * perYear / 12) + '/mo'
                  : 'Federal + state + FICA combined'}
              </div>

              <div className="border-t border-border my-2 mb-4" />

              <Input
                label="Traditional 401k"
                value={trad401kPerPaycheckDisplay}
                onChange={v => update401k(v, 'traditional401kDollar', 'trad401kPaycheck')}
                prefix="$"
                type="number"
              />
              <div className="text-[11px] text-subtle -mt-2 mb-3">
                {trad401kMonthly > 0 ? fmt(trad401kMonthly) + '/mo — synced to Invest & Retire' : 'From your paystub'}
              </div>

              <Input
                label="Roth 401k (post-tax)"
                value={roth401kPerPaycheckDisplay}
                onChange={v => update401k(v, 'roth401kDollar', 'roth401kPaycheck')}
                prefix="$"
                type="number"
              />
              <div className="text-[11px] text-subtle -mt-2 mb-3">
                {roth401kMonthly > 0 ? fmt(roth401kMonthly) + '/mo — synced to Invest & Retire' : 'From your paystub'}
              </div>

              <Input
                label="HSA"
                value={source.hsaPerPaycheck || ''}
                onChange={updateHsa}
                prefix="$"
                type="number"
              />
              <div className="text-[11px] text-subtle -mt-2 mb-3">
                {hsaMonthly > 0 ? fmt(hsaMonthly) + '/mo — synced to Invest & Retire' : 'From your paystub'}
              </div>

              {/* Custom pre-tax deductions */}
              {(source.customPreTax || []).map(d => (
                <div key={d.id} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-1">Label</div>
                    <input
                      type="text"
                      value={d.label}
                      placeholder="e.g. Health Insurance"
                      onChange={e =>
                        updateCustomPreTax(
                          (source.customPreTax || []).map(x => x.id === d.id ? { ...x, label: e.target.value } : x)
                        )
                      }
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-[color:var(--color-text)] text-[13px] outline-none font-body"
                      style={{ boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ width: 130 }}>
                    <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-1">Per Paycheck</div>
                    <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
                      <span className="px-2 text-subtle text-[13px]">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={d.amount}
                        placeholder="0"
                        onChange={e =>
                          updateCustomPreTax(
                            (source.customPreTax || []).map(x =>
                              x.id === d.id ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, '') } : x
                            )
                          )
                        }
                        className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-[color:var(--color-text)]"
                        style={{ padding: '10px 8px' }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updateCustomPreTax((source.customPreTax || []).filter(x => x.id !== d.id))
                    }
                    className="bg-transparent border-none text-muted text-lg cursor-pointer px-1 mb-0.5 flex-shrink-0"
                  >×</button>
                </div>
              ))}

              <button
                onClick={() =>
                  updateCustomPreTax([
                    ...(source.customPreTax || []),
                    { id: 'ded-' + Date.now(), label: '', amount: '' },
                  ])
                }
                className="mt-1 px-3.5 py-2 bg-surface border border-border rounded-lg text-blue text-[12px] font-semibold cursor-pointer font-body"
              >+ Add Deduction</button>
            </Card>
          </div>

          {/* Right column — Paycheck Summary */}
          <div>
            <Card>
              <SectionTitle accent="#10b981">Paycheck Summary</SectionTitle>

              <SummaryRow label="Gross Pay" value={fmtDec(grossMonthly)} color="#60a5fa" />
              {taxesMonthly > 0 && <SummaryRow label="Taxes" value={`- ${fmtDec(taxesMonthly)}`} color="var(--color-text-muted)" />}
              {trad401kMonthly > 0 && <SummaryRow label="Traditional 401k" value={`- ${fmtDec(trad401kMonthly)}`} color="var(--color-text-muted)" />}
              {roth401kMonthly > 0 && <SummaryRow label="Roth 401k (post-tax)" value={`- ${fmtDec(roth401kMonthly)}`} color="var(--color-text-muted)" />}
              {hsaMonthly > 0 && <SummaryRow label="HSA" value={`- ${fmtDec(hsaMonthly)}`} color="var(--color-text-muted)" />}
              {(source.customPreTax || []).map(d => {
                const mo = (parseFloat(d.amount) || 0) * perYear / 12
                if (mo <= 0) return null
                return <SummaryRow key={d.id} label={d.label || 'Other Deduction'} value={`- ${fmtDec(mo)}`} color="var(--color-text-muted)" />
              })}

              {/* Net take-home */}
              <div
                className="mt-2.5 p-3"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid #10b98133',
                  borderRadius: 10,
                }}
              >
                <div className="text-[10px] text-dim uppercase tracking-widest mb-1">Monthly Take-Home</div>
                <div className="font-mono text-[26px] font-bold text-green">{fmtDec(netMonthly)}</div>
                <div className="text-[12px] text-subtle mt-1">
                  {fmtDec(netPerPaycheck)} {freqLabel} paycheck
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
