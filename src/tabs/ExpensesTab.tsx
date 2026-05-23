import { useState, useMemo, useRef } from 'react'
import type { Debt } from '../types'
import { useData } from '../context/DataContext'
import { debtColor } from '../lib/calculations'
import { fmtCurrencyInput, stripCommas, fmt } from '../lib/format'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import Input from '../components/Input'
import BudgetRow, { RowHeader } from '../features/BudgetRow'
import DebtCard from '../features/DebtCard'
import MortgageCard from '../features/MortgageCard'

const DISC_SUGGESTIONS = [
  { group: 'Dining and Social', items: ['Dining Out', 'Coffee Shops', 'Bars and Nightlife'] },
  { group: 'Personal', items: ['Personal Care', 'Clothing and Shopping', 'Gym and Fitness'] },
  { group: 'Life Admin', items: ['Car Maintenance', 'Medical and Dental', 'Pet Expenses'] },
  { group: 'Entertainment', items: ['Entertainment', 'Travel and Vacation', 'Hobbies'] },
]

type NewDebtState = {
  name: string
  balance: string
  rate: string
  minPayment: string
  isMortgage: boolean
  isPromo?: boolean
  promoRate?: string
  promoEndDate?: string
  postPromoRate?: string
  monthlyEscrow?: string
  escrowBalance?: string
  loanStartDate?: string
  loanEndDate?: string
}

export default function ExpensesTab() {
  const { data, setData } = useData()

  const [newEss, setNewEss] = useState({ name: '', baseline: '' })
  const [newDisc, setNewDisc] = useState({ name: '', baseline: '' })
  const [newDebt, setNewDebt] = useState<NewDebtState>({
    name: '', balance: '', rate: '', minPayment: '', isMortgage: false,
    isPromo: false, promoRate: '0', promoEndDate: '', postPromoRate: '',
    monthlyEscrow: '', escrowBalance: '', loanStartDate: '', loanEndDate: '',
  })
  const [showSugg, setShowSugg] = useState(false)

  // Stable sort: only re-sort when debt count changes or strategy changes, not on every keystroke
  const stableSortRef = useRef<Debt[]>(data.debts.slice())
  const [stableSortVersion, setStableSortVersion] = useState(0)

  function commitDebtSort() {
    stableSortRef.current = data.debts.slice()
    setStableSortVersion(v => v + 1)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDebts = useMemo(() => {
    const consumer = data.debts.filter(d => !d.isMortgage)
    const mortgage = data.debts.filter(d => d.isMortgage)
    const strategy = data.settings.debtStrategy
    const snap = stableSortRef.current
    const snapMap: Record<string, Debt> = {}
    if (snap) snap.forEach(d => { snapMap[d.id] = d })

    function sortKey(d: Debt): Debt {
      return snap ? (snapMap[d.id] || d) : d
    }
    function getEffectiveRate(d: Debt): number {
      if (d.isPromo) return parseFloat(d.postPromoRate || d.rate) || 0
      return parseFloat(d.rate) || 0
    }

    let sorted = consumer.slice()
    if (strategy === 'avalanche') {
      sorted.sort((a, b) => getEffectiveRate(sortKey(b)) - getEffectiveRate(sortKey(a)))
    } else if (strategy === 'snowball') {
      sorted.sort((a, b) => (parseFloat(sortKey(a).balance) || 0) - (parseFloat(sortKey(b).balance) || 0))
    }
    return sorted.concat(mortgage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.debts.length, data.settings.debtStrategy, stableSortVersion])

  const consumerDebtCount = stableDebts.filter(d => !d.isMortgage).length

  // Totals
  const essTotal = data.budget.essentials.reduce((s, e) => s + (parseFloat(e.baseline) || 0), 0)
  const discTotal = data.budget.discretionary.reduce((s, e) => s + (parseFloat(e.baseline) || 0), 0)

  function addEssential() {
    if (!newEss.name) return
    setData(d => ({
      ...d,
      budget: {
        ...d.budget,
        essentials: [
          ...d.budget.essentials,
          { id: String(Date.now()), name: newEss.name, baseline: newEss.baseline || '0', plan: '' },
        ],
      },
    }))
    setNewEss({ name: '', baseline: '' })
  }

  function addDiscretionary() {
    if (!newDisc.name) return
    setData(d => ({
      ...d,
      budget: {
        ...d.budget,
        discretionary: [
          ...d.budget.discretionary,
          { id: String(Date.now()), name: newDisc.name, baseline: newDisc.baseline || '0', plan: '' },
        ],
      },
    }))
    setNewDisc({ name: '', baseline: '' })
  }

  function addDebt() {
    if (!newDebt.name || !newDebt.balance) return
    const debtToAdd: Debt = {
      ...newDebt,
      id: 'debt-' + Date.now(),
      planPayment: newDebt.minPayment,
      rate: newDebt.isPromo ? '0' : newDebt.rate,
      isMortgage: newDebt.isMortgage,
    }
    setData(d => ({ ...d, debts: [...d.debts, debtToAdd] }))
    stableSortRef.current = [...data.debts, debtToAdd]
    setNewDebt({
      name: '', balance: '', rate: '', minPayment: '', isMortgage: false,
      isPromo: false, promoRate: '0', promoEndDate: '', postPromoRate: '',
      monthlyEscrow: '', escrowBalance: '', loanStartDate: '', loanEndDate: '',
    })
  }

  function updateDebt(updated: Debt) {
    setData(d => ({ ...d, debts: d.debts.map(x => x.id === updated.id ? updated : x) }))
  }

  function deleteDebt(id: string) {
    setData(d => ({ ...d, debts: d.debts.filter(x => x.id !== id) }))
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 7,
    padding: '8px 10px',
    color: 'var(--color-text)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--color-text)' }}>
        Expenses
      </h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        All amounts are monthly. Enter what you actually spend or owe each month.
      </p>

      <div className="expenses-grid">
        {/* Left column: spending */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Essentials */}
          <Card>
            <div>
              <SectionTitle accent="#f59e0b">Essentials</SectionTitle>
              {data.debts.some(d => d.isMortgage) && (
                <div style={{ fontSize: 11, color: '#f59e0b', background: 'var(--color-surface)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                  You have a mortgage flagged in Debts. Include your full PITI (principal, interest, taxes, insurance) in Housing below.
                </div>
              )}
              <RowHeader />
              {data.budget.essentials.map(item => (
                <BudgetRow
                  key={item.id}
                  label={item.name}
                  baseline={item.baseline}
                  color="#f59e0b"
                  onBaselineChange={v => {
                    setData(d => ({
                      ...d,
                      budget: {
                        ...d.budget,
                        essentials: d.budget.essentials.map(e =>
                          e.id === item.id
                            ? { ...e, baseline: v, plan: e.plan === '' || e.plan === undefined ? '' : e.plan }
                            : e
                        ),
                      },
                    }))
                  }}
                  onDelete={() => {
                    setData(d => ({
                      ...d,
                      budget: { ...d.budget, essentials: d.budget.essentials.filter(e => e.id !== item.id) },
                    }))
                  }}
                />
              ))}

              {/* Add Essential form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                <input
                  type="text"
                  value={newEss.name}
                  placeholder="Add an essential (e.g. Groceries)"
                  onChange={e => setNewEss(n => ({ ...n, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addEssential() }}
                  style={inputStyle}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={fmtCurrencyInput(newEss.baseline)}
                  placeholder="$/mo"
                  onChange={e => setNewEss(n => ({ ...n, baseline: stripCommas(e.target.value) }))}
                  onKeyDown={e => { if (e.key === 'Enter') addEssential() }}
                  style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  onClick={addEssential}
                  style={{ background: '#f59e0b', border: 'none', borderRadius: 7, padding: '8px 14px', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Add
                </button>
              </div>

              {/* Essentials total */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '8px 12px', borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Total:{' '}
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#f59e0b' }}>{fmt(essTotal)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Other Expenses (Discretionary) */}
          <Card>
            <div>
              <SectionTitle accent="#fb923c">Other Expenses</SectionTitle>
              {data.budget.discretionary.length > 0 && <RowHeader />}
              {data.budget.discretionary.map(item => (
                <BudgetRow
                  key={item.id}
                  label={item.name}
                  baseline={item.baseline}
                  color="#fb923c"
                  onBaselineChange={v => {
                    setData(d => ({
                      ...d,
                      budget: {
                        ...d.budget,
                        discretionary: d.budget.discretionary.map(di =>
                          di.id === item.id
                            ? { ...di, baseline: v, plan: di.plan === '' || di.plan === undefined ? '' : di.plan }
                            : di
                        ),
                      },
                    }))
                  }}
                  onDelete={() => {
                    setData(d => ({
                      ...d,
                      budget: { ...d.budget, discretionary: d.budget.discretionary.filter(di => di.id !== item.id) },
                    }))
                  }}
                />
              ))}

              {/* Discretionary total */}
              {data.budget.discretionary.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '8px 12px', borderTop: '1px solid var(--color-border)', marginTop: 4, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Total:{' '}
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#fb923c' }}>{fmt(discTotal)}</span>
                  </div>
                </div>
              )}

              {/* Add Discretionary form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newDisc.name}
                  placeholder="Category name"
                  onChange={e => setNewDisc(n => ({ ...n, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addDiscretionary() }}
                  style={inputStyle}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={fmtCurrencyInput(newDisc.baseline)}
                  placeholder="$/mo"
                  onChange={e => setNewDisc(n => ({ ...n, baseline: stripCommas(e.target.value) }))}
                  onKeyDown={e => { if (e.key === 'Enter') addDiscretionary() }}
                  style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  onClick={addDiscretionary}
                  style={{ background: '#fb923c', border: 'none', borderRadius: 7, padding: '8px 14px', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>

              {/* Suggestions */}
              <button
                onClick={() => setShowSugg(s => !s)}
                style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 7, padding: '6px 12px', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', marginBottom: showSugg ? 12 : 0 }}
              >
                {showSugg ? 'Hide suggestions' : 'Quick-add suggestions'}
              </button>
              {showSugg && (
                <div>
                  {DISC_SUGGESTIONS.map(group => (
                    <div key={group.group} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        {group.group}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {group.items.map(item => {
                          const exists = data.budget.discretionary.some(d => d.name === item)
                          return (
                            <button
                              key={item}
                              onClick={() => {
                                if (exists) return
                                setData(d => ({
                                  ...d,
                                  budget: {
                                    ...d.budget,
                                    discretionary: [
                                      ...d.budget.discretionary,
                                      { id: String(Date.now() + Math.random()), name: item, baseline: '0', plan: '' },
                                    ],
                                  },
                                }))
                              }}
                              style={{
                                padding: '5px 12px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 20,
                                color: exists ? 'var(--color-text-dim)' : 'var(--color-text-muted)',
                                fontSize: 12,
                                cursor: exists ? 'default' : 'pointer',
                              }}
                            >
                              {exists ? 'Added' : item}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>{/* end left column */}

        {/* Right column: debt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Debt Obligations */}
          <Card>
            <div>
              <SectionTitle accent="#f87171">Debt Obligations</SectionTitle>

              {/* Debt list */}
              {data.debts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {stableDebts.map((stableDebt, i) => {
                    // stableDebts provides sort order only; use live values from data.debts
                    const debt = data.debts.find(d => d.id === stableDebt.id) ?? stableDebt
                    if (debt.isMortgage) {
                      return (
                        <MortgageCard
                          key={debt.id}
                          debt={debt}
                          onChange={updateDebt}
                          onDelete={() => deleteDebt(debt.id)}
                        />
                      )
                    }
                    const color = debtColor(i, consumerDebtCount)
                    return (
                      <DebtCard
                        key={debt.id}
                        debt={debt}
                        color={color}
                        onChange={updateDebt}
                        onDelete={() => deleteDebt(debt.id)}
                        onCommitSort={commitDebtSort}
                      />
                    )
                  })}
                </div>
              )}

              {data.debts.length === 0 && (
                <div style={{ color: '#3a5a7a', fontSize: 13, textAlign: 'center', padding: '16px 0', marginBottom: 20 }}>
                  No debts added yet.
                </div>
              )}

              {/* Add a Debt */}
              <SectionTitle accent="#f87171">Add a Debt</SectionTitle>

              <Input
                label="Name"
                value={newDebt.name}
                onChange={v => setNewDebt(d => ({ ...d, name: v }))}
                placeholder="e.g. Student Loan"
              />
              <Input
                label={newDebt.isMortgage ? 'Loan Balance' : 'Balance'}
                value={newDebt.balance || ''}
                onChange={v => setNewDebt(d => ({ ...d, balance: v }))}
                prefix="$"
                type="number"
              />
              <Input
                label={newDebt.isMortgage ? 'Monthly P&I (Principal + Interest)' : 'Minimum Payment'}
                value={newDebt.minPayment || ''}
                onChange={v => setNewDebt(d => ({ ...d, minPayment: v }))}
                prefix="$"
                type="number"
              />

              {/* Promo toggle */}
              <div
                onClick={() => setNewDebt(d => ({ ...d, isPromo: !d.isPromo }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: newDebt.isPromo ? 'linear-gradient(135deg, #0d1a10, #0a1508)' : 'var(--color-surface)',
                  border: '1px solid ' + (newDebt.isPromo ? '#10b98133' : 'var(--color-border)'),
                  borderRadius: 8, cursor: 'pointer', marginBottom: 12,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: newDebt.isPromo ? '#10b981' : 'transparent',
                  border: '2px solid ' + (newDebt.isPromo ? '#10b981' : 'var(--color-border)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {newDebt.isPromo && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: 2 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Intro / 0% APR promo offer</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Rate is 0% until a specific date, then jumps</div>
                </div>
              </div>

              {!newDebt.isPromo && (
                <Input
                  label="Interest Rate (APR)"
                  value={newDebt.rate || ''}
                  onChange={v => setNewDebt(d => ({ ...d, rate: v }))}
                  suffix="%"
                  type="number"
                />
              )}

              {newDebt.isPromo && (
                <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '12px', marginBottom: 12, border: '1px solid #10b98133' }}>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Promo Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Input
                      label="Promo End Date"
                      value={newDebt.promoEndDate || ''}
                      onChange={v => setNewDebt(d => ({ ...d, promoEndDate: v }))}
                      type="date"
                      placeholder=""
                    />
                    <Input
                      label="Rate After Promo"
                      value={newDebt.postPromoRate || ''}
                      onChange={v => setNewDebt(d => ({ ...d, postPromoRate: v }))}
                      suffix="%"
                      type="number"
                    />
                  </div>
                </div>
              )}

              {/* Mortgage toggle */}
              <div
                onClick={() => setNewDebt(d => ({ ...d, isMortgage: !d.isMortgage }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 12,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: newDebt.isMortgage ? '#1d4ed8' : 'transparent',
                  border: '2px solid ' + (newDebt.isMortgage ? '#1d4ed8' : 'var(--color-border)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {newDebt.isMortgage && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: 2 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>This is a mortgage</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tracks payoff but excluded from consumer debt total and budget</div>
                </div>
              </div>

              {newDebt.isMortgage && (
                <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '14px', marginBottom: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Mortgage Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
                    <Input
                      label="Monthly Escrow (Taxes + Insurance)"
                      value={newDebt.monthlyEscrow || ''}
                      onChange={v => setNewDebt(d => ({ ...d, monthlyEscrow: v }))}
                      prefix="$"
                      type="number"
                    />
                    <Input
                      label="Escrow Balance"
                      value={newDebt.escrowBalance || ''}
                      onChange={v => setNewDebt(d => ({ ...d, escrowBalance: v }))}
                      prefix="$"
                      type="number"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Input
                      label="Loan Start Date"
                      value={newDebt.loanStartDate || ''}
                      onChange={v => setNewDebt(d => ({ ...d, loanStartDate: v }))}
                      type="date"
                    />
                    <Input
                      label="Loan End Date"
                      value={newDebt.loanEndDate || ''}
                      onChange={v => setNewDebt(d => ({ ...d, loanEndDate: v }))}
                      type="date"
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                    {newDebt.minPayment && newDebt.monthlyEscrow
                      ? `Total monthly PITI: ${fmt((parseFloat(newDebt.minPayment) || 0) + (parseFloat(newDebt.monthlyEscrow) || 0))} (P&I ${fmt(parseFloat(newDebt.minPayment) || 0)} + Escrow ${fmt(parseFloat(newDebt.monthlyEscrow) || 0)})`
                      : 'Total PITI = P&I + Escrow. Enter both to see combined payment.'}
                  </div>
                </div>
              )}

              <button
                onClick={addDebt}
                style={{
                  width: '100%', padding: '11px',
                  background: 'linear-gradient(135deg,#1d4ed8,#1e40af)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontWeight: 600, fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif",
                  marginTop: 4, cursor: 'pointer',
                }}
              >
                Add Debt
              </button>
            </div>
          </Card>
        </div>{/* end right column */}
      </div>{/* end expenses-grid */}
    </div>
  )
}
