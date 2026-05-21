import { useData } from '../context/DataContext'
import { useMetrics } from '../hooks/useMetrics'
import { fmt, fmtShort } from '../lib/format'
import { buildProjection, DataPoint } from '../lib/calculations'
import { Input, Card, SectionTitle, Badge, LineChart } from '../components'
import type { IncomeSource, SourceCalc } from '../types'

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

interface Source401kCardProps {
  src: IncomeSource
  sc: SourceCalc
}

function Source401kCard({ src, sc }: Source401kCardProps) {
  const { setData } = useData()
  const ret = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  const isDetailed = src.mode === 'detailed'
  const usePercent = ret.use401kPercent !== false

  function updateField(field: keyof NonNullable<IncomeSource['retirement']>, value: unknown) {
    setData(d => ({
      ...d,
      income: {
        sources: d.income.sources.map(s =>
          s.id === src.id
            ? { ...s, retirement: { ...s.retirement, [field]: value } as NonNullable<IncomeSource['retirement']> }
            : s
        ),
      },
    }))
  }

  const trad401kMonthly = sc.trad401k
  const roth401kMonthly = sc.roth401k
  const employerMatch = sc.match
  const annualContrib = (trad401kMonthly + roth401kMonthly) * 12
  const overLimit = annualContrib > 23500

  return (
    <Card style={{ marginBottom: 14 }}>
      {/* Header row */}
      <div className="flex justify-between items-center flex-wrap gap-2.5 mb-4">
        <SectionTitle accent="#60a5fa">{src.name} — 401k</SectionTitle>

        {/* PERCENT / DOLLARS toggle */}
        <div
          className="flex"
          style={{ background: '#0a1520', borderRadius: 8, padding: 3, border: '1px solid #1a2840' }}
        >
          {(['Percent', 'Dollars'] as const).map(mode => {
            const isActive = mode === 'Percent' ? usePercent : !usePercent
            return (
              <button
                key={mode}
                onClick={() => updateField('use401kPercent', mode === 'Percent')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? '#1d4ed8' : 'transparent',
                  color: isActive ? '#fff' : '#5a7a9a',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {mode}
              </button>
            )
          })}
        </div>
      </div>

      {/* Trad + Roth 401k grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Traditional 401k */}
        <div style={{ background: '#0a1520', borderRadius: 10, padding: 14, border: '1px solid #1a2840' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>
            Traditional 401k (pre-tax)
          </div>
          {isDetailed ? (
            <div
              style={{
                fontSize: 11,
                color: '#4a7fa5',
                background: '#060e18',
                borderRadius: 6,
                padding: '8px 10px',
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#10b981' }}>Synced from Income tab. </span>
              Edit in the Income &rarr; Detailed view.
            </div>
          ) : usePercent ? (
            <Input
              label="% of Gross Salary"
              value={ret.traditional401kPct || ''}
              onChange={v => updateField('traditional401kPct', v)}
              suffix="%"
              type="number"
            />
          ) : (
            <Input
              label="Monthly Contribution"
              value={ret.traditional401kDollar || ''}
              onChange={v => updateField('traditional401kDollar', v)}
              prefix="$"
              type="number"
            />
          )}
          <div style={{ fontSize: 11, color: '#4a7fa5' }}>{fmt(trad401kMonthly)}/mo</div>
          <div style={{ marginTop: 10 }}>
            <Input
              label="Current Balance"
              value={ret.traditional401kBalance || ''}
              onChange={v => updateField('traditional401kBalance', v)}
              prefix="$"
              type="number"
              small
            />
          </div>
        </div>

        {/* Roth 401k */}
        <div style={{ background: '#0a1520', borderRadius: 10, padding: 14, border: '1px solid #1a2840' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
            Roth 401k (post-tax)
          </div>
          {usePercent ? (
            <Input
              label="% of Gross Salary"
              value={ret.roth401kPct || ''}
              onChange={v => updateField('roth401kPct', v)}
              suffix="%"
              type="number"
            />
          ) : (
            <Input
              label="Monthly Contribution"
              value={ret.roth401kDollar || ''}
              onChange={v => updateField('roth401kDollar', v)}
              prefix="$"
              type="number"
            />
          )}
          <div style={{ fontSize: 11, color: '#4a7fa5' }}>{fmt(roth401kMonthly)}/mo</div>
          <div style={{ marginTop: 10 }}>
            <Input
              label="Current Balance"
              value={ret.roth401kBalance || ''}
              onChange={v => updateField('roth401kBalance', v)}
              prefix="$"
              type="number"
              small
            />
          </div>
        </div>

        {/* Employer Match — full-width */}
        <div
          style={{
            gridColumn: '1 / -1',
            background: '#0a1520',
            borderRadius: 10,
            padding: 14,
            border: '1px solid #10b98133',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>
            Employer Match (% of gross salary)
          </div>
          <Input
            label="Match Percentage"
            value={ret.employerMatchPct || ''}
            onChange={v => updateField('employerMatchPct', v)}
            suffix="%"
            type="number"
          />
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
            {fmt(employerMatch)}/mo — free money
          </div>
        </div>
      </div>

      {/* 401k limit notice */}
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: overLimit ? '#f97316' : '#4a7fa5',
          background: '#0a1520',
          borderRadius: 8,
          padding: '8px 12px',
        }}
      >
        {overLimit
          ? 'Combined Traditional + Roth 401k exceeds 2025 limit of $23,500/yr'
          : '2025 combined limit: $23,500/yr ($1,958/mo)'}
      </div>
    </Card>
  )
}

interface SourceRothIraCardProps {
  src: IncomeSource
  sc: SourceCalc
}

function SourceRothIraCard({ src, sc }: SourceRothIraCardProps) {
  const { setData } = useData()
  const ret = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  const rothIra = ret.rothIra || { monthly: '', currentBalance: '' }
  const rothIraMonthly = sc.rothIra
  const overLimit = rothIraMonthly * 12 > 7000

  function updateNested(field: 'monthly' | 'currentBalance', value: string) {
    setData(d => ({
      ...d,
      income: {
        sources: d.income.sources.map(s =>
          s.id === src.id
            ? {
                ...s,
                retirement: {
                  ...s.retirement,
                  rothIra: { ...(s.retirement?.rothIra || { monthly: '', currentBalance: '' }), [field]: value },
                } as NonNullable<IncomeSource['retirement']>,
              }
            : s
        ),
      },
    }))
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle accent="#60a5fa">{src.name} — Roth IRA</SectionTitle>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: '#0a1520',
          border: '1px solid #60a5fa33',
          borderRadius: 20,
          fontSize: 11,
          color: '#60a5fa',
          marginBottom: 12,
        }}
      >
        Post-tax — comes from take-home pay
      </div>
      <Input
        label="Monthly Contribution"
        value={rothIra.monthly}
        onChange={v => updateNested('monthly', v)}
        prefix="$"
        type="number"
      />
      <Input
        label="Current Balance"
        value={rothIra.currentBalance}
        onChange={v => updateNested('currentBalance', v)}
        prefix="$"
        type="number"
      />
      <div
        style={{
          background: '#0a1520',
          borderRadius: 8,
          padding: 12,
          marginTop: 4,
          fontSize: 12,
          color: '#5a7a9a',
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 4, color: overLimit ? '#f97316' : '#5a7a9a' }}>
          {overLimit ? 'Exceeds 2025 limit of $7,000/yr' : '2025 limit: $7,000/yr ($583/mo)'}
        </div>
        2025 phase-out: $150k–$165k single / $236k–$246k married.
      </div>
    </Card>
  )
}

// -------------------------------------------------------------------
// Main tab
// -------------------------------------------------------------------

const MONTHLY_RATE = 0.07 / 12

export default function InvestRetireTab() {
  const { data, setData } = useData()
  const {
    sourceCalcs,
    trad401kMonthly,
    roth401kMonthly,
    employerMatch,
    rothIraMonthly,
    hsaMonthly,
  } = useMetrics()

  // W2 sources
  const w2Sources = (data.income?.sources || []).filter(s => s.type === 'w2')
  const primarySrc = w2Sources[0]
  const primaryCalc: SourceCalc = sourceCalcs.find(c => c.src.id === primarySrc?.id) || {
    src: primarySrc || ({ id: '', name: '', type: 'w2' } as IncomeSource),
    gross: 0, net: 0, trad401k: 0, roth401k: 0, match: 0, rothIra: 0, perYear: 12, isSimple: true,
  }

  const primaryRet = primarySrc?.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  const currentAge = parseInt(primaryRet.currentAge || '0')
  const targetAge = parseInt(primaryRet.targetAge || '65')
  const retYears = targetAge > currentAge ? targetAge - currentAge : 0

  // Projection for primary source
  const retChartData = primarySrc ? buildProjection(primarySrc, primaryCalc) : []
  const projBal = retChartData.length > 0 ? retChartData[retChartData.length - 1].balance : 0

  // Combined monthly retirement contribution (for summary)
  const contribMonthly = trad401kMonthly + roth401kMonthly + rothIraMonthly + employerMatch

  // Brokerage checklist
  const efFunded =
    (parseFloat(data.savings.emergencyFund.current) || 0) >=
      (parseFloat(data.savings.emergencyFund.goal) || 1) &&
    (parseFloat(data.savings.emergencyFund.goal) || 0) > 0
  const has401kMatch = trad401kMonthly > 0 && parseFloat(primaryRet.employerMatchPct || '0') > 0
  const hasRothIra = rothIraMonthly > 0
  const hasHighRateDebt = data.debts.filter(d => (parseFloat(d.rate) || 0) > 7).length === 0

  const prereqs = [
    { label: 'Emergency fund funded (3–6 months)', done: efFunded },
    { label: '401k funded to at least employer match', done: has401kMatch },
    { label: 'Roth IRA being contributed to', done: hasRothIra },
    { label: 'High-interest debt paid off (>7% APR)', done: hasHighRateDebt },
  ]

  // Brokerage projections
  const investMonthly = parseFloat(data.invest.monthly) || 0
  const investBalance = parseFloat(data.invest.currentBalance) || 0
  const brokerageProjections = [5, 10, 20, 30].map(years => {
    const proj =
      investBalance * Math.pow(1 + MONTHLY_RATE, years * 12) +
      investMonthly * (Math.pow(1 + MONTHLY_RATE, years * 12) - 1) / MONTHLY_RATE
    return { years, value: proj }
  })

  function updatePrimaryRetirement(field: keyof NonNullable<IncomeSource['retirement']>, value: unknown) {
    if (!primarySrc) return
    setData(d => ({
      ...d,
      income: {
        sources: d.income.sources.map(s =>
          s.id === primarySrc.id
            ? { ...s, retirement: { ...s.retirement, [field]: value } as NonNullable<IncomeSource['retirement']> }
            : s
        ),
      },
    }))
  }

  function updateHsa(field: keyof typeof data.retirement.hsa, value: unknown) {
    setData(d => ({
      ...d,
      retirement: { ...d.retirement, hsa: { ...d.retirement.hsa, [field]: value } },
    }))
  }

  function updateInvest(field: keyof typeof data.invest, value: string) {
    setData(d => ({ ...d, invest: { ...d.invest, [field]: value } }))
  }

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold" style={{ fontSize: 24 }}>
        Invest &amp; Retire
      </h1>
      <p className="mt-0 mb-5 text-[13px]" style={{ color: '#5a7a9a' }}>
        Tax-advantaged retirement accounts and taxable brokerage investing.
      </p>

      {/* ===== RETIREMENT ACCOUNTS ===== */}
      <SectionTitle accent="#10b981">Retirement Accounts</SectionTitle>

      {/* Per-source 401k + Roth IRA cards */}
      {w2Sources.map(src => {
        const sc: SourceCalc = sourceCalcs.find(c => c.src.id === src.id) || {
          src,
          gross: 0, net: 0, trad401k: 0, roth401k: 0, match: 0, rothIra: 0, perYear: 12, isSimple: true,
        }
        return (
          <div key={src.id}>
            <Source401kCard src={src} sc={sc} />
            <SourceRothIraCard src={src} sc={sc} />
          </div>
        )
      })}

      {/* HSA */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent="#f59e0b">HSA</SectionTitle>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: '#0a1520',
            border: '1px solid #f59e0b33',
            borderRadius: 20,
            fontSize: 11,
            color: '#f59e0b',
            marginBottom: 12,
          }}
        >
          Pre-tax — reduces taxable income
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1400, #120f00)',
            border: '1px solid #f59e0b33',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: '#f59e0b',
            lineHeight: 1.6,
          }}
        >
          Triple tax advantage: pre-tax contributions, tax-free growth, and tax-free withdrawals for
          medical expenses.
        </div>

        {/* Show synced notice when any W2 source is in detailed mode with HSA */}
        {sourceCalcs.some(c => !c.isSimple && parseFloat(c.src.hsaPerPaycheck || '') > 0) && (
          <div
            style={{
              fontSize: 11,
              color: '#4a7fa5',
              background: '#0a1520',
              borderRadius: 6,
              padding: '8px 10px',
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: '#f59e0b' }}>Synced from Income tab. </span>
            Edit in the Income &rarr; Detailed view.
          </div>
        )}

        <Input
          label="Monthly Contribution"
          value={data.retirement.hsa.monthly}
          onChange={v => updateHsa('monthly', v)}
          prefix="$"
          type="number"
          readOnly={sourceCalcs.some(c => !c.isSimple && parseFloat(c.src.hsaPerPaycheck || '') > 0)}
        />
        <Input
          label="Current Balance"
          value={data.retirement.hsa.currentBalance}
          onChange={v => updateHsa('currentBalance', v)}
          prefix="$"
          type="number"
        />

        {/* Individual / Family toggle */}
        <div className="flex gap-2 mb-3">
          {[
            { label: 'Individual', value: false },
            { label: 'Family', value: true },
          ].map(opt => {
            const active = data.retirement.hsa.familyCoverage === opt.value
            return (
              <button
                key={opt.label}
                onClick={() => updateHsa('familyCoverage', opt.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: active ? '#1d4ed8' : '#0f1923',
                  border: `1px solid ${active ? '#1d4ed8' : '#1e2d3d'}`,
                  borderRadius: 7,
                  color: active ? '#fff' : '#5a7a9a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: '#4a7fa5' }}>
          2025 limit: {data.retirement.hsa.familyCoverage ? '$8,550/yr ($713/mo)' : '$4,300/yr ($358/mo)'}
        </div>
      </Card>

      {/* ===== RETIREMENT PROJECTION ===== */}
      {primarySrc && (
        <div className="grid gap-3.5 mb-4" style={{ gridTemplateColumns: '280px 1fr' }}>
          {/* Settings + summary */}
          <Card>
            <SectionTitle accent="#a78bfa">Projection Settings</SectionTitle>
            <Input
              label="Current Age"
              value={primaryRet.currentAge || ''}
              onChange={v => updatePrimaryRetirement('currentAge', v)}
              type="number"
            />
            <Input
              label="Target Retirement Age"
              value={primaryRet.targetAge || ''}
              onChange={v => updatePrimaryRetirement('targetAge', v)}
              type="number"
            />

            {/* Monthly breakdown summary */}
            <div style={{ background: '#0a1520', borderRadius: 10, padding: 12, marginTop: 4 }}>
              {[
                { label: 'Trad 401k + Match', value: trad401kMonthly + employerMatch, color: '#10b981' },
                { label: 'Roth 401k', value: roth401kMonthly, color: '#a78bfa' },
                { label: 'Roth IRA', value: rothIraMonthly, color: '#60a5fa' },
              ].map(row => (
                <div key={row.label} className="flex justify-between mb-1.5" style={{ fontSize: 12 }}>
                  <span style={{ color: '#5a7a9a' }}>{row.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: row.color }}>
                    {fmt(row.value)}/mo
                  </span>
                </div>
              ))}
              <div
                className="flex justify-between mb-1.5"
                style={{ fontSize: 12, paddingBottom: 6, borderBottom: '1px solid #1e2d3d' }}
              >
                <span style={{ color: '#5a7a9a' }}>HSA (not projected)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: '#f59e0b' }}>
                  {fmt(hsaMonthly)}/mo
                </span>
              </div>
              <div className="flex justify-between" style={{ fontSize: 12 }}>
                <span style={{ color: '#e8f0f8', fontWeight: 600 }}>Total projected</span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: '#e8f0f8', fontWeight: 700 }}>
                  {fmt(contribMonthly)}/mo
                </span>
              </div>
            </div>
          </Card>

          {/* Badges + chart */}
          <div>
            <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Badge
                label="Projected Balance"
                value={projBal > 0 ? fmtShort(projBal) : '—'}
                color={projBal > 0 ? '#60a5fa' : '#3a5a7a'}
                sub={projBal > 0 ? undefined : 'Add contributions or a current balance'}
              />
              <Badge
                label="Years to Retirement"
                value={retYears > 0 ? `${retYears} yrs` : '—'}
                color="#60a5fa"
              />
              <Badge
                label="Monthly Income (4% rule)"
                value={projBal > 0 ? fmt(projBal * 0.04 / 12) : '—'}
                color={projBal > 0 ? '#60a5fa' : '#3a5a7a'}
                sub={projBal > 0 ? '/month in retirement' : 'Set retirement target first'}
              />
              <Badge
                label="Annual Income (4% rule)"
                value={projBal > 0 ? fmtShort(projBal * 0.04) : '—'}
                color={projBal > 0 ? '#60a5fa' : '#3a5a7a'}
                sub={projBal > 0 ? '/year in retirement' : 'Set retirement target first'}
              />
            </div>

            <Card>
              <SectionTitle accent="#a78bfa">Projected Balance Growth</SectionTitle>
              <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 12, marginTop: -8 }}>
                7% avg annual return. Excludes HSA.
              </div>
              <LineChart data={retChartData} height={200} />
            </Card>
          </div>
        </div>
      )}

      {/* ===== BROKERAGE & INVESTING ===== */}
      <SectionTitle accent="#a78bfa">Brokerage &amp; Investing</SectionTitle>

      {/* Prerequisites checklist */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d1a10, #0a1410)',
          border: '1px solid #10b98133',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>
          Before investing in a taxable brokerage, make sure you have:
        </div>
        {prereqs.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 mb-2">
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: item.done ? '#10b981' : '#1e2d3d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: item.done ? '#000' : '#3a5a7a',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.done ? '✓' : '?'}
            </div>
            <div style={{ fontSize: 13, color: item.done ? '#e8f0f8' : '#5a7a9a' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Brokerage inputs + simple projection */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Inputs */}
        <Card>
          <SectionTitle accent="#a78bfa">Brokerage Account</SectionTitle>
          <div
            style={{
              fontSize: 12,
              color: '#5a7a9a',
              marginBottom: 14,
              lineHeight: 1.6,
              background: '#0a1520',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            Growth and dividends in a taxable brokerage are subject to capital gains tax. Low-cost index
            funds (e.g. VTI, VOO) are the standard recommendation.
          </div>
          <Input
            label="Monthly Investment"
            value={data.invest.monthly}
            onChange={v => updateInvest('monthly', v)}
            prefix="$"
            type="number"
          />
          <Input
            label="Current Balance"
            value={data.invest.currentBalance}
            onChange={v => updateInvest('currentBalance', v)}
            prefix="$"
            type="number"
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#8b9cb5',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            Notes / Strategy
          </div>
          <textarea
            value={data.invest.notes}
            onChange={e => updateInvest('notes', e.target.value)}
            placeholder="e.g. 80% VTI, 20% VXUS — three fund portfolio"
            style={{
              width: '100%',
              background: '#0f1923',
              border: '1px solid #1e2d3d',
              borderRadius: 8,
              padding: '10px 12px',
              color: '#e8f0f8',
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              outline: 'none',
              resize: 'vertical',
              minHeight: 80,
              boxSizing: 'border-box',
            }}
          />
        </Card>

        {/* Simple projection */}
        <Card>
          <SectionTitle accent="#a78bfa">Simple Projection</SectionTitle>
          <p style={{ fontSize: 12, color: '#5a7a9a', margin: '0 0 14px', lineHeight: 1.6 }}>
            Estimated growth at 7% average annual return. Subject to capital gains tax on withdrawal,
            unlike retirement accounts.
          </p>
          {brokerageProjections.map(p => (
            <div
              key={p.years}
              className="flex justify-between items-center mb-2"
              style={{ padding: '10px 14px', background: '#0a1520', borderRadius: 10 }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0f8' }}>{p.years} years</div>
                <div style={{ fontSize: 11, color: '#4a7fa5' }}>
                  at {fmt(investMonthly)}/mo + current balance
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 16,
                  color: '#60a5fa',
                  fontWeight: 700,
                }}
              >
                {fmtShort(p.value)}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
