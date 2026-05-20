import { useUI } from './context/UIContext'
import type { TabId } from './types'
import SettingsTab from './tabs/SettingsTab'

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

  return (
    <div className="min-h-screen bg-bg font-body">
      {/* Tab nav */}
      <div className="sticky top-0 z-50 bg-[#050b12] border-b border-border">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
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
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab !== 'settings' && (
          <div className="text-dim text-sm text-center py-8 font-mono">
            {activeTab} tab — migrating…
          </div>
        )}
      </div>
    </div>
  )
}
