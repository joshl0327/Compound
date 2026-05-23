import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
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
  const { theme, setTheme } = useUI()

  function updateSetting<K extends keyof typeof data.settings>(key: K, value: typeof data.settings[K]) {
    setData(d => ({ ...d, settings: { ...d.settings, [key]: value } }))
  }

  function restartTour() {
    localStorage.removeItem('compound_onboarding_done')
    localStorage.removeItem('compound_profile_done')
    window.location.reload()
  }

  function resetAllData() {
    if (!window.confirm('This will permanently delete all your data. Are you sure?')) return
    localStorage.removeItem('compound_v4')
    localStorage.removeItem('compound_onboarding_done')
    localStorage.removeItem('compound_profile_done')
    window.location.reload()
  }

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Settings</h1>
      <p className="m-0 mb-5 text-subtle text-[13px]">Adjust how rates are calculated.</p>

      <div className="grid gap-3.5 max-w-[680px]">
        <Card>
          <SectionTitle accent="var(--color-accent)">Appearance</SectionTitle>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>Theme</div>
              <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Defaults to your system preference</div>
            </div>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
            >
              {(['dark', 'light'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="px-4 py-1.5 text-[12px] font-semibold capitalize transition-colors"
                  style={{
                    background: theme === t ? 'var(--color-accent-dim)' : 'transparent',
                    color: theme === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: 'none',
                    borderRight: t === 'dark' ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

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
                  background: sel ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  border: `1px solid ${sel ? '#f97316' : 'var(--color-border)'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? '#f97316' : 'var(--color-border)'}` }}
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
          <SectionTitle accent="#0e7490">Income Basis</SectionTitle>
          {INCOME_BASES.map(opt => {
            const sel = data.settings.incomeBasis === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => updateSetting('incomeBasis', opt.id)}
                className="flex gap-3 p-3.5 rounded-[10px] mb-2 cursor-pointer"
                style={{
                  background: sel ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  border: `1px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ border: `2px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}` }}
                >
                  {sel && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />}
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
          <SectionTitle accent="#0e7490">Privacy</SectionTitle>
          <p className="m-0 mb-2 text-[13px] font-semibold" style={{ color: 'var(--color-accent)' }}>
            Your data never leaves your device.
          </p>
          <p className="m-0 mb-3 text-[13px] text-dim leading-relaxed">
            Everything you enter in Compound is stored locally in your browser using localStorage — a built-in browser feature that keeps data on your device. Nothing is transmitted to any server, database, or third party. There are no accounts, no tracking, and no ads.
          </p>
          <div className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            <span className="font-bold text-slate-300">Important: </span>
            Because your data lives only in this browser, it will be lost if you clear your browser data or switch to a different browser or device. Use the <span className="font-bold text-slate-100">Export</span> button in the header to save a backup file and <span className="font-bold text-slate-100">Import</span> to restore it on any device.
          </div>
        </Card>

        <Card>
          <SectionTitle accent="#4a7fa5">Guided Tour</SectionTitle>
          <p className="m-0 mb-4 text-[13px] text-dim leading-relaxed">
            Restart the onboarding tour to walk through Income, Debts, Budget, and Overview again.
          </p>
          <button
            onClick={restartTour}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors"
            style={{ background: 'none', border: '1px solid var(--color-text-muted)', color: 'var(--color-text-muted)' }}
          >
            Restart Tour
          </button>
        </Card>

        <Card>
          <SectionTitle accent="#f87171">Reset Data</SectionTitle>
          <p className="m-0 mb-4 text-[13px] text-dim leading-relaxed">
            Wipes all data from this browser. Export first if you want a backup.
          </p>
          <button
            onClick={resetAllData}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors"
            style={{ background: '#2a0a0a', border: '1px solid #f87171', color: '#f87171' }}
          >
            Reset All Data
          </button>
        </Card>
      </div>
    </div>
  )
}
