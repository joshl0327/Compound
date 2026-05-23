import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { makeDefault, ONBOARDING_KEY, FREQ_OPTIONS } from '../lib/storage'
import Input from '../components/Input'

interface QuickStartProps {
  onComplete: () => void
  onBack: () => void
}

interface DebtEntry {
  name: string
  bal: string
  rate: string
  min: string
}

export default function QuickStart({ onComplete, onBack }: QuickStartProps) {
  const { setData } = useData()
  const { setActiveTab } = useUI()

  const [step, setStep] = useState(0)
  const [salary, setSalary] = useState('')
  const [takeHome, setTakeHome] = useState('')
  const [freq, setFreq] = useState('biweekly')
  const [housing, setHousing] = useState('')
  const [hasDebt, setHasDebt] = useState<boolean | null>(null)
  const [debts, setDebts] = useState<DebtEntry[]>([{ name: '', bal: '', rate: '', min: '' }])
  const [currentDebt, setCurrentDebt] = useState(0)

  const progress = step < 3 ? ((step + 1) / 3) * 100 : 100

  const step0Disabled = !salary || !takeHome
  const step2Disabled = hasDebt === null

  function isNextDisabled() {
    if (step === 0) return step0Disabled
    if (step === 2) return step2Disabled
    return false
  }

  function updateDebt(index: number, field: keyof DebtEntry, value: string) {
    setDebts(prev => {
      const next = prev.slice()
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addDebt() {
    setDebts(prev => [...prev, { name: '', bal: '', rate: '', min: '' }])
    setCurrentDebt(debts.length)
  }

  function removeDebt(index: number) {
    const nd = debts.filter((_, j) => j !== index)
    setDebts(nd)
    setCurrentDebt(Math.min(currentDebt, nd.length - 1))
  }

  function finish() {
    const d = makeDefault()
    if (salary) d.income.sources[0].annualSalary = salary
    if (takeHome) {
      d.income.sources[0].takeHomePerPaycheck = takeHome
      d.income.sources[0].frequency = freq as 'biweekly'
    }
    if (housing) {
      d.budget.essentials = d.budget.essentials.map(e =>
        e.id === 'housing' ? { ...e, baseline: housing } : e
      )
    }
    if (hasDebt) {
      d.debts = debts.filter(dt => dt.name).map((dt, i) => ({
        id: 'qs' + i,
        name: dt.name,
        balance: dt.bal,
        rate: dt.rate,
        minPayment: dt.min,
        isMortgage: false,
      }))
    }
    setData(() => d)
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {}
    setActiveTab('overview')
    onComplete()
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: '#4a7fa5',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: "'DM Sans', sans-serif",
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--color-text)',
    fontSize: 14,
    fontFamily: "'DM Mono', monospace",
    outline: 'none',
    boxSizing: 'border-box',
  }

  const hintStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
    fontFamily: "'DM Mono', monospace",
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-5">
      <div
        className="max-w-sm w-full rounded-2xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div
            className="text-[16px] font-black text-slate-100"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Quick Start
          </div>
          {step < 3 && (
            <div className="text-xs text-[#4a7fa5]">{step + 1} of 3</div>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="h-[3px] rounded-sm mb-7 overflow-hidden"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <div
            className="h-full rounded-sm transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #1d4ed8, #0ea5e9)',
            }}
          />
        </div>

        {/* Step 0: Income */}
        {step === 0 && (
          <div>
            <div
              className="text-[18px] font-bold text-slate-100 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              What do you earn?
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
              We'll use this to calculate your savings rate, housing percentage, and financial
              benchmarks.
            </div>

            {/* Annual Salary */}
            <div className="mb-3.5">
              <label style={labelStyle}>Annual Salary</label>
              <Input
                value={salary}
                onChange={setSalary}
                prefix="$"
                placeholder="65,000"
              />
              {salary && (
                <div style={hintStyle}>
                  = ${(parseFloat(salary) / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} / month
                </div>
              )}
            </div>

            {/* Take-Home Per Paycheck */}
            <div className="mb-3.5">
              <label style={labelStyle}>Take-Home Per Paycheck</label>
              <Input
                value={takeHome}
                onChange={setTakeHome}
                prefix="$"
                placeholder="2,100"
              />
            </div>

            {/* Pay Frequency */}
            <div>
              <label style={labelStyle}>Pay Frequency</label>
              <div className="flex gap-2">
                {FREQ_OPTIONS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFreq(f.id)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: freq === f.id ? 'var(--color-surface-2)' : 'var(--color-surface)',
                      border: `1px solid ${freq === f.id ? '#3b82f6' : 'var(--color-border)'}`,
                      borderRadius: 6,
                      color: freq === f.id ? '#60a5fa' : '#4a7fa5',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-[12px] text-[#3a5a7a] leading-relaxed">
              Enter your main income here. You can add a partner's income or side hustle in the
              Income tab after setup.
            </div>
          </div>
        )}

        {/* Step 1: Housing */}
        {step === 1 && (
          <div>
            <div
              className="text-[18px] font-bold text-slate-100 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              What's your monthly housing cost?
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
              Rent, mortgage, or HOA dues. The 28% guideline is a common benchmark — though in
              high cost-of-living areas, it's often not realistic.
            </div>

            <Input
              value={housing}
              onChange={setHousing}
              prefix="$"
              placeholder="1,800"
            />

            {salary && housing && (
              <div className="text-[12px] text-[#4a7fa5] mt-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                {((parseFloat(housing) / (parseFloat(salary) / 12)) * 100).toFixed(1)}% of gross
                income · 28% is the common guideline
              </div>
            )}
          </div>
        )}

        {/* Step 2: Debt */}
        {step === 2 && (
          <div>
            <div
              className="text-[18px] font-bold text-slate-100 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Do you carry consumer debt?
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
              Credit cards, student loans, car loans — not your mortgage. You can add more later.
            </div>

            {/* Initial yes/no choice */}
            {hasDebt === null && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHasDebt(true)}
                  style={{
                    padding: 14,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: '#60a5fa',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasDebt(false)}
                  style={{
                    padding: 14,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: '#60a5fa',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  No debt
                </button>
              </div>
            )}

            {/* Has debt — entry fields */}
            {hasDebt === true && (
              <div>
                {/* Debt carousel nav */}
                <div className="flex items-center gap-2 mb-3.5">
                  <button
                    disabled={currentDebt === 0}
                    onClick={() => setCurrentDebt(c => c - 1)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      color: currentDebt === 0 ? 'var(--color-text-dim)' : '#60a5fa',
                      width: 28,
                      height: 28,
                      cursor: currentDebt === 0 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    ←
                  </button>
                  <div
                    className="flex-1 text-center text-[12px] text-[#4a7fa5]"
                  >
                    Debt {currentDebt + 1} of {debts.length}
                  </div>
                  {debts.length > 1 && (
                    <button
                      onClick={() => removeDebt(currentDebt)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        color: 'var(--color-text-muted)',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 14,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      ×
                    </button>
                  )}
                  <button
                    disabled={currentDebt === debts.length - 1}
                    onClick={() => setCurrentDebt(c => c + 1)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      color: currentDebt === debts.length - 1 ? 'var(--color-text-dim)' : '#60a5fa',
                      width: 28,
                      height: 28,
                      cursor: currentDebt === debts.length - 1 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    →
                  </button>
                </div>

                {/* Current debt fields */}
                <div className="mb-2.5">
                  <label style={labelStyle}>Debt Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Visa, Student Loan"
                    value={debts[currentDebt]?.name ?? ''}
                    onChange={e => updateDebt(currentDebt, 'name', e.target.value)}
                    style={{ ...inputStyle, fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  <div>
                    <label style={labelStyle}>Balance</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 5,000"
                      value={debts[currentDebt]?.bal ?? ''}
                      onChange={e =>
                        updateDebt(currentDebt, 'bal', e.target.value.replace(/[^0-9.]/g, ''))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>APR %</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 19.9"
                      value={debts[currentDebt]?.rate ?? ''}
                      onChange={e =>
                        updateDebt(currentDebt, 'rate', e.target.value.replace(/[^0-9.]/g, ''))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label style={labelStyle}>Monthly Minimum</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 150"
                    value={debts[currentDebt]?.min ?? ''}
                    onChange={e =>
                      updateDebt(currentDebt, 'min', e.target.value.replace(/[^0-9.]/g, ''))
                    }
                    style={inputStyle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={addDebt}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      color: '#60a5fa',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    + Add another debt
                  </button>
                  <button
                    onClick={() => {
                      setHasDebt(null)
                      setDebts([{ name: '', bal: '', rate: '', min: '' }])
                      setCurrentDebt(0)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4a7fa5',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    ← Actually no debt
                  </button>
                </div>
              </div>
            )}

            {/* No debt confirmation */}
            {hasDebt === false && (
              <div
                className="rounded-xl p-3.5 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid #10b981' }}
              >
                <div className="text-[14px] font-bold text-[#10b981] mb-1.5">
                  ✓ No consumer debt
                </div>
                <button
                  onClick={() => setHasDebt(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4a7fa5',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Change answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={() => {
              if (step === 0) {
                onBack()
              } else {
                setStep(s => s - 1)
              }
            }}
            style={{
              flex: 1,
              padding: 12,
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              color: 'var(--color-text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Back
          </button>
          <button
            disabled={isNextDisabled()}
            onClick={() => {
              if (step < 2) {
                setStep(s => s + 1)
              } else {
                finish()
              }
            }}
            style={{
              flex: 2,
              padding: '12px 20px',
              background: isNextDisabled()
                ? 'var(--color-surface)'
                : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              border: 'none',
              borderRadius: 10,
              color: isNextDisabled() ? 'var(--color-text-dim)' : '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: isNextDisabled() ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {step === 2 ? 'Explore my Overview →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
