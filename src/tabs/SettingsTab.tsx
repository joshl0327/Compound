import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Card from '../components/Card'
import SectionTitle from '../components/SectionTitle'
import type { AppData, DebtStrategy, IncomeBasis } from '../types'
import { deleteFromCloud } from '../lib/cloudSync'
import { STORAGE_KEY, ONBOARDING_KEY, PROFILE_DONE_KEY } from '../lib/storage'

const DEBT_STRATEGIES: { id: DebtStrategy; label: string; desc: string }[] = [
  { id: 'avalanche', label: 'Avalanche (recommended)', desc: 'Minimizes total interest paid. Best for saving the most money overall.' },
  { id: 'snowball', label: 'Snowball', desc: 'Quick wins keep you motivated. Slightly more interest paid but psychologically effective.' },
  { id: 'custom', label: 'Custom', desc: 'Drag to set your own payoff priority in the Plan tab.' },
]

const INCOME_BASES: { id: IncomeBasis; label: string; desc: string }[] = [
  { id: 'gross', label: 'Gross Income', desc: 'Rates calculated against pre-tax income. Standard for DTI and savings benchmarks.' },
  { id: 'net', label: 'Take-Home (Net)', desc: 'Rates calculated against after-tax income. More conservative view of savings rate.' },
]

type ResetView = 'export-prompt' | 'confirm'

interface ResetModalProps {
  data: AppData
  signOut: () => Promise<void>
  onClose: () => void
}

function ResetModal({ data, signOut, onClose }: ResetModalProps) {
  const [view, setView] = useState<ResetView>('export-prompt')
  const [deleting, setDeleting] = useState(false)

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compound-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setView('confirm')
  }

  async function handleDeleteEverything() {
    setDeleting(true)
    try {
      await deleteFromCloud()
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ONBOARDING_KEY)
      localStorage.removeItem(PROFILE_DONE_KEY)
      localStorage.removeItem('compound_guest_mode')
      await signOut()
    } catch {
      // best-effort — if signOut fails (e.g. network offline), localStorage is
      // already cleared; reload anyway to reset the app to a clean state
    }
    window.location.reload()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 380,
          width: '100%',
          margin: '0 16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: 24,
        }}
      >
        {view === 'export-prompt' ? (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
              Export before deleting?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Your data will be permanently deleted. You can download a copy first.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setView('confirm')}
                style={{
                  padding: '6px 14px', fontSize: 13, background: 'none',
                  border: '1px solid var(--color-border)', borderRadius: 6,
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: '6px 14px', fontSize: 13,
                  background: 'var(--color-accent)', border: 'none',
                  borderRadius: 6, color: '#fff', cursor: 'pointer',
                }}
              >
                Download & Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
              Delete all data?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              This will permanently delete all your data from this device and your cloud backup. You will be signed out. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={deleting}
                style={{
                  padding: '6px 14px', fontSize: 13, background: 'none',
                  border: '1px solid var(--color-border)', borderRadius: 6,
                  color: 'var(--color-text-muted)', cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEverything}
                disabled={deleting}
                style={{
                  padding: '6px 14px', fontSize: 13,
                  background: '#2a0a0a', border: '1px solid #f87171',
                  borderRadius: 6, color: '#f87171', cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete Everything'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SettingsTab() {
  const { data, setData } = useData()
  const { theme, setTheme } = useUI()
  const { session, guestMode, continueAsGuest, signOut } = useAuth()

  const [signInEmail, setSignInEmail] = useState('')
  const [signInMsg, setSignInMsg] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)

  // Vite sets BASE_URL from vite.config.ts base — must match OAuth redirectTo.
  const appUrl = window.location.origin + import.meta.env.BASE_URL

  async function handleMagicLink() {
    if (!signInEmail) return
    await supabase.auth.signInWithOtp({
      email: signInEmail,
      options: { emailRedirectTo: appUrl },
    })
    setSignInMsg('Check your email for your sign-in link!')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl },
    })
  }

  async function handleDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: appUrl },
    })
  }

  function updateSetting<K extends keyof typeof data.settings>(key: K, value: typeof data.settings[K]) {
    setData(d => ({ ...d, settings: { ...d.settings, [key]: value } }))
  }

  function restartTour() {
    localStorage.removeItem('compound_onboarding_done')
    localStorage.removeItem('compound_profile_done')
    window.location.reload()
  }

  function resetAllData() {
    setShowResetModal(true)
  }

  return (
    <div>
      <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Settings</h1>
      <p className="m-0 mb-5 text-subtle text-[13px]">Adjust how rates are calculated.</p>

      <div className="grid gap-3.5 max-w-[680px]">

        {/* ── Account ── */}
        <Card>
          <SectionTitle accent="var(--color-accent)">Account</SectionTitle>

          {session ? (
            /* Signed in */
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>
                  Signed in
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  {session.user.email ?? session.user.id}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>
                  Your data syncs automatically across devices.
                </div>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-1.5 text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
                style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                Sign out
              </button>
            </div>
          ) : guestMode ? (
            /* Guest — show sign-in form inline */
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>
                  Using as guest
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                  Your data lives only in this browser. Sign in to sync across devices and keep a cloud backup.
                </div>
              </div>

              {/* Magic link */}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleMagicLink() }}
                  className="flex-1 px-3 py-1.5 text-xs outline-none"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text)',
                  }}
                />
                <button
                  onClick={handleMagicLink}
                  className="px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Send Link
                </button>
              </div>

              {/* OAuth */}
              <div className="flex gap-2">
                <button
                  onClick={handleGoogle}
                  className="flex-1 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', cursor: 'pointer' }}
                >
                  Google
                </button>
                <button
                  onClick={handleDiscord}
                  className="flex-1 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', cursor: 'pointer' }}
                >
                  Discord
                </button>
              </div>

              {signInMsg && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: 0 }}>{signInMsg}</p>
              )}
            </div>
          ) : (
            /* No session, no guest — shouldn't be reachable but handle gracefully */
            <div className="flex flex-col gap-2">
              <div className="text-[13px]" style={{ color: 'var(--color-text-dim)' }}>Not signed in.</div>
              <button
                onClick={continueAsGuest}
                className="text-xs self-start transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', textDecoration: 'underline' }}
              >
                Continue as guest
              </button>
            </div>
          )}
        </Card>

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
          <SectionTitle accent="#0e7490">Privacy & Storage</SectionTitle>
          <p className="m-0 mb-2 text-[13px] font-semibold" style={{ color: 'var(--color-accent)' }}>
            Local-first. Cloud sync when signed in.
          </p>
          <p className="m-0 mb-3 text-[13px] text-dim leading-relaxed">
            Everything you enter is stored locally in your browser using localStorage — always, regardless of whether you're signed in. When you sign in, your data is also synced to a private cloud record tied to your account so you can access it on any device.
          </p>
          <div className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            <span className="font-bold text-slate-300">If you're not signed in: </span>
            Use <span className="font-bold text-slate-100">Export</span> in the header to save a backup file and <span className="font-bold text-slate-100">Import</span> to restore it. Clearing your browser data will permanently erase your local data.
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
        {showResetModal && (
          <ResetModal
            data={data}
            signOut={signOut}
            onClose={() => setShowResetModal(false)}
          />
        )}
    </div>
  )
}
