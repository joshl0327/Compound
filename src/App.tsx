import { useState } from 'react'
import { useUI } from './context/UIContext'
import { useData } from './context/DataContext'
import { useMetrics } from './hooks/useMetrics'
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
import { fmt } from './lib/format'

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
  const { grossMonthly, netMonthly } = useMetrics()

  const [onboardScreen, setOnboardScreen] = useState<'welcome' | 'quickstart' | 'done'>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) ? 'done' : 'welcome'
    } catch {
      return 'done'
    }
  })

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
    <div className="min-h-screen bg-bg font-body">
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

      {/* Top header bar */}
      <div className="bg-[#050b12] border-b border-border px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue flex items-center justify-center text-bg font-display font-extrabold text-sm">C</div>
            <span className="font-display font-bold text-slate-100 text-base tracking-wide">Compound</span>
          </div>
          {/* Right: Export/Import */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 border border-border rounded hover:border-subtle hover:text-slate-100 transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 border border-border rounded hover:border-subtle hover:text-slate-100 transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="sticky top-0 z-50 bg-[#050b12] border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue text-blue'
                  : 'border-transparent text-dim hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'income' && <IncomeTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'savings' && <SavingsTab />}
        {activeTab === 'invest' && <InvestRetireTab />}
        {activeTab === 'plan' && <PlanTab />}
      </div>
    </div>
  )
}
