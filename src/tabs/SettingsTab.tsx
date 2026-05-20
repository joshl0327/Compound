import { useData } from '../context/DataContext'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import type { DebtStrategy, IncomeBasis } from '../types'

const DEBT_STRATEGIES: { id: DebtStrategy; label: string; desc: string }[] = [
  { id: 'avalanche', label: 'Avalanche (recommended)', desc: 'Minimizes total interest paid. Best for saving the most money overall.' },
  { id: 'snowball', label: 'Snowball', desc: 'Quick wins keep you motivated. Slightly more interest paid but psychologically effective.' },
  { id: 'custom', label: 'Custom', desc: 'Drag to set your own payoff priority in the Plan tab.' },
]

const INCOME_BASES: { id: IncomeBasis; label: string; desc: string }[] = [
  { id: 'gross', label: 'Gross Income', desc: 'Rates calculated against pre-tax income. Standard for DTI and savings benchmarks.' },
  { id: 'net', label: 'Take-Home (Net)', desc: 'Rates calculated against after-tax income. More conservative view of savings rate.' },
]

export default function SettingsTab() {
  const { data, setData } = useData()

  function updateSetting<K extends keyof typeof data.settings>(key: K, value: typeof data.settings[K]) {
    setData(d => ({ ...d, settings: { ...d.settings, [key]: value } }))
  }

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Settings</h1>
      <p className="m-0 mb-5 text-subtle text-[13px]">Adjust how rates are calculated.</p>

      <div className="grid gap-3.5 max-w-[680px]">
        <Card>
          <SectionTitle accent="#f97316">Debt Payoff Strategy</SectionTitle>
          {DEBT_STRATEGIES.map(opt => {
            const sel = data.settings.debtStrategy === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => updateSetting('debtStrategy', opt.id)}
                className="flex gap-3 p-3.5 rounded-[10px] mb-2 cursor-pointer"
                style={{
                  background: sel ? '#1a0e06' : '#0a1520',
                  border: `1px solid ${sel ? '#4a2a0a' : '#1a2840'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? '#f97316' : '#2a4060'}` }}
                >
                  {sel && <div className="w-2 h-2 rounded-full bg-orange" />}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-100 mb-0.5">{opt.label}</div>
                  <div className="text-xs text-dim leading-relaxed">{opt.desc}</div>
                </div>
              </div>
            )
          })}
        </Card>

        <Card>
          <SectionTitle accent="#60a5fa">Income Basis</SectionTitle>
          {INCOME_BASES.map(opt => {
            const sel = data.settings.incomeBasis === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => updateSetting('incomeBasis', opt.id)}
                className="flex gap-3 p-3.5 rounded-[10px] mb-2 cursor-pointer"
                style={{
                  background: sel ? '#071520' : '#0a1520',
                  border: `1px solid ${sel ? '#1a3a5a' : '#1a2840'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? '#60a5fa' : '#2a4060'}` }}
                >
                  {sel && <div className="w-2 h-2 rounded-full bg-blue" />}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-100 mb-0.5">{opt.label}</div>
                  <div className="text-xs text-dim leading-relaxed">{opt.desc}</div>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
