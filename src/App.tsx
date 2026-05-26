import { useState, useEffect } from 'react'
import AuthGate from './components/AuthGate'
import { useUI } from './context/UIContext'
import { useData } from './context/DataContext'
import type { TabId } from './types'
import SettingsTab from './tabs/SettingsTab'
import OverviewTab from './tabs/OverviewTab'
import IncomeTab from './tabs/IncomeTab'
import ExpensesTab from './tabs/ExpensesTab'
import SavingsTab from './tabs/SavingsTab'
import InvestRetireTab from './tabs/InvestRetireTab'
import PlanTab from './tabs/PlanTab'
import WelcomeModal from './onboarding/WelcomeModal'
import QuickStart from './onboarding/QuickStart'
import { ONBOARDING_KEY, makeDefault, migrateData } from './lib/storage'
import { loadFromCloud } from './lib/cloudSync'
import NavAvatar from './components/NavAvatar'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'savings', label: 'Savings' },
  { id: 'invest', label: 'Invest & Retire' },
  { id: 'plan', label: 'Plan' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const { activeTab, setActiveTab } = useUI()
  const { data, setData } = useData()


  // 'checking-cloud' is the initial state when ONBOARDING_KEY is absent.
  // A one-shot useEffect resolves it: if the user has cloud data we skip
  // onboarding entirely; otherwise we fall through to 'welcome' as normal.
  // This prevents showing WelcomeModal to a returning signed-in user whose
  // localStorage was cleared (new device, browser reset, etc.).
  const [onboardScreen, setOnboardScreen] = useState<'welcome' | 'quickstart' | 'done' | 'checking-cloud'>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) ? 'done' : 'checking-cloud'
    } catch {
      return 'done'
    }
  })

  useEffect(() => {
    if (onboardScreen !== 'checking-cloud') return
    loadFromCloud().then(cloudData => {
      if (cloudData) {
        // Returning user with cloud data — skip onboarding
        try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {}
        setOnboardScreen('done')
      } else {
        // Guest or brand-new user — show welcome modal
        setOnboardScreen('welcome')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compound-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          setData(() => migrateData(parsed, makeDefault()))
          try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {}
          setOnboardScreen('done')
        } catch {
          alert('Invalid backup file — could not parse JSON.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <AuthGate>
    <div
      className="min-h-screen font-body"
      style={{ background: 'var(--color-bg)' }}
    >
      {onboardScreen === 'welcome' && (
        <WelcomeModal
          onQuickStart={() => setOnboardScreen('quickstart')}
          onSkip={() => {
            try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {}
            setOnboardScreen('done')
          }}
        />
      )}
      {onboardScreen === 'quickstart' && (
        <QuickStart
          onComplete={() => setOnboardScreen('done')}
          onBack={() => setOnboardScreen('welcome')}
        />
      )}

      {/* Header + nav — single sticky bar */}
      <div className="sticky top-0 z-50 border-b border-border px-4" style={{ background: 'var(--color-nav)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <div className="mx-auto flex items-center" style={{ height: 48, maxWidth: 'min(94vw, 2200px)' }}>
          {/* Wordmark */}
          <span className="text-slate-100 flex-shrink-0" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Compound</span>

          {/* Tabs — pushed to the right */}
          <div className="flex items-center gap-1 ml-auto overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 whitespace-nowrap border-b-2 transition-colors text-xs font-medium`}
                style={{
                  height: 48,
                  borderBottomColor: activeTab === t.id ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Export / Import / Avatar */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            <button
              onClick={handleExport}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
            >
              Import
            </button>
            <div style={{ marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
              <NavAvatar setActiveTab={setActiveTab} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto px-4 py-6" style={{ maxWidth: 'min(94vw, 2200px)' }}>
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'income' && <IncomeTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'savings' && <SavingsTab />}
        {activeTab === 'invest' && <InvestRetireTab />}
        {activeTab === 'plan' && <PlanTab />}
      </div>
    </div>
    </AuthGate>
  )
}
