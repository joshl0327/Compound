import { fmtCurrencyInput, stripCommas } from '../lib/format'

interface InputProps {
  label?: string
  value: string
  onChange?: (v: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  readOnly?: boolean
  small?: boolean
  highlight?: string
  type?: string
}

export default function Input({ label, value, onChange, prefix, suffix, placeholder, readOnly, small, highlight, type }: InputProps) {
  const isCurrency = prefix === '$'
  const displayValue = isCurrency ? fmtCurrencyInput(value) : value

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!onChange) return
    const raw = isCurrency ? stripCommas(e.target.value) : e.target.value
    onChange(raw)
  }

  return (
    <div className={small ? 'mb-1.5' : 'mb-3'}>
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-dim uppercase mb-1">{label}</div>
      )}
      <div
        className="flex items-center overflow-hidden rounded-lg border"
        style={{
          background: readOnly ? '#060e18' : '#0f1923',
          borderColor: highlight ? highlight + '44' : '#1e2d3d',
        }}
      >
        {prefix && <span className="px-2.5 text-subtle text-[13px] font-semibold">{prefix}</span>}
        <input
          type="text"
          inputMode={isCurrency ? 'decimal' : type === 'number' ? 'decimal' : 'text'}
          value={displayValue}
          readOnly={readOnly}
          onChange={handleChange}
          placeholder={placeholder || '0'}
          className="flex-1 bg-transparent border-none outline-none font-mono"
          style={{
            padding: small ? '8px 10px' : '10px 12px',
            color: readOnly ? '#5a7a9a' : '#e8f0f8',
            fontSize: small ? 13 : 14,
          }}
        />
        {suffix && <span className="px-2.5 text-subtle text-xs">{suffix}</span>}
      </div>
    </div>
  )
}
