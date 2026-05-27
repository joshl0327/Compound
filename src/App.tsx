import { useState, useEffect, lazy, Suspense } from 'react'
import AuthGate from './components/AuthGate'
import { useUI } from './context/UIContext'
import { useData } from './context/DataContext'
import type { TabId } from './types'
import { ONBOARDING_KEY, makeDefault, migrateData } from './lib/storage'
import { loadFromCloud } from './lib/cloudSync'
import NavAvatar from './components/NavAvatar'
import { useIsMobile } from './hooks/useIsMobile'

const SettingsTab    = lazy(() => import('./tabs/SettingsTab'))
const OverviewTab    = lazy(() => import('./tabs/OverviewTab'))
const IncomeTab      = lazy(() => import('./tabs/IncomeTab'))
const ExpensesTab    = lazy(() => import('./tabs/ExpensesTab'))
const SavingsTab     = lazy(() => import('./tabs/SavingsTab'))
const InvestRetireTab = lazy(() => import('./tabs/InvestRetireTab'))
const PlanTab        = lazy(() => import('./tabs/PlanTab'))
const WelcomeModal   = lazy(() => import('./onboarding/WelcomeModal'))
const QuickStart     = lazy(() => import('./onboarding/QuickStart'))

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
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer if user resizes to desktop
  useEffect(() => { if (!isMobile) setDrawerOpen(false) }, [isMobile])

  // Escape key closes the drawer
  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [drawerOpen])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

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
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Header + nav */}
      <div
        className="sticky top-0 z-50 border-b border-border px-4"
        style={{ background: 'var(--color-nav)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      >
        {isMobile ? (
          /* ── Mobile nav: hamburger | centered wordmark | avatar ── */
          <div className="mx-auto flex items-center relative" style={{ height: 48, maxWidth: 'min(94vw, 2200px)' }}>
            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
            >
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
              <div style={{ width: 18, height: 2, background: 'var(--color-text-muted)', borderRadius: 1 }} />
            </button>
            {/* Wordmark — absolutely centered */}
            <span
              className="absolute left-1/2 -translate-x-1/2"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--color-text)', pointerEvents: 'none' }}
            >
              Compound
            </span>
            {/* Avatar */}
            <div className="ml-auto flex-shrink-0">
              <NavAvatar setActiveTab={setActiveTab} />
            </div>
          </div>
        ) : (
          /* ── Desktop nav: wordmark | tabs | export | import | avatar ── */
          <div className="mx-auto flex items-center" style={{ height: 48, maxWidth: 'min(94vw, 2200px)' }}>
            <span className="text-slate-100 flex-shrink-0" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Compound</span>
            <div className="flex items-center gap-1 ml-auto overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="px-3 whitespace-nowrap border-b-2 transition-colors text-xs font-medium"
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
            <div className="flex items-center gap-2 ml-6 flex-shrink-0">
              <button
                onClick={handleExport}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
              >Export</button>
              <button
                onClick={handleImport}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
              >Import</button>
              <div style={{ marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
                <NavAvatar setActiveTab={setActiveTab} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile drawer + scrim */}
      {isMobile && drawerOpen && (
        <>
          {/* Scrim — covers full viewport, tap to close */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          />
          {/* Drawer panel */}
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: '75vw', maxWidth: 300,
              background: 'var(--color-surface)',
              borderRight: '1px solid var(--color-border)',
              zIndex: 61,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Tab list */}
            <div style={{ flex: 1, paddingTop: 8, paddingBottom: 8, overflowY: 'auto' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setDrawerOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center',
                    width: '100%', minHeight: 44,
                    padding: '0 18px',
                    background: activeTab === t.id ? 'rgba(13,148,136,0.1)' : 'none',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                    borderLeft: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeTab === t.id ? 600 : 400,
                    color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    textAlign: 'left',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Export / Import at bottom */}
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 18px', display: 'flex', gap: 16 }}>
              <button
                onClick={() => { handleExport(); setDrawerOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >Export</button>
              <button
                onClick={() => { handleImport(); setDrawerOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >Import</button>
            </div>
          </div>
        </>
      )}

      {/* Tab content */}
      <div className="mx-auto px-4 py-6" style={{ maxWidth: 'min(94vw, 2200px)' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, color: 'var(--color-text-dim)', fontSize: 13 }}>
            Loading…
          </div>
        }>
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'income' && <IncomeTab />}
          {activeTab === 'expenses' && <ExpensesTab />}
          {activeTab === 'savings' && <SavingsTab />}
          {activeTab === 'invest' && <InvestRetireTab />}
          {activeTab === 'plan' && <PlanTab />}
        </Suspense>
      </div>
    </div>
    </AuthGate>
  )
}
