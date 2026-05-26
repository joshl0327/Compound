# Auth Avatar, Reset-with-Cloud-Wipe, Security Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a navbar auth indicator with avatar/popover, extend the reset flow to wipe cloud data and sign the user out, and add a security comment to the Supabase client.

**Architecture:** New `NavAvatar` component is self-contained with its own open/close state; `deleteFromCloud` extends cloudSync.ts; an inline `ResetModal` replaces the browser confirm in SettingsTab. All changes are additive — no existing function signatures change.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react (jsdom), Supabase JS v2, Tailwind + CSS custom properties.

---

## File Map

| Status | File | Role |
|---|---|---|
| Create | `src/components/NavAvatar.tsx` | Avatar circle / guest link / popover |
| Create | `src/components/NavAvatar.test.tsx` | Unit tests for NavAvatar |
| Create | `src/lib/cloudSync.test.ts` | Unit tests for cloudSync |
| Modify | `src/lib/cloudSync.ts` | Add `deleteFromCloud()` |
| Modify | `src/App.tsx` | Mount `<NavAvatar>` in navbar |
| Modify | `src/tabs/SettingsTab.tsx` | Add `ResetModal`, rewrite `resetAllData()` |
| Modify | `src/lib/supabaseClient.js` | Add anon-key security comment |

---

## Task 1: `deleteFromCloud()` in cloudSync.ts

**Files:**
- Modify: `src/lib/cloudSync.ts`
- Create: `src/lib/cloudSync.test.ts`

- [ ] **Step 1: Create the test file with a failing test for the no-user case**

Create `src/lib/cloudSync.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from './supabaseClient'
import { deleteFromCloud } from './cloudSync'

describe('deleteFromCloud', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a no-op when no user is signed in', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any)

    await deleteFromCloud()

    expect(supabase.from).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails (function not yet exported)**

```
npx vitest run src/lib/cloudSync.test.ts
```

Expected: FAIL — `deleteFromCloud is not a function` or similar export error.

- [ ] **Step 3: Add `deleteFromCloud` to `src/lib/cloudSync.ts`**

Append after the existing `loadFromCloud` function:

```ts
export async function deleteFromCloud(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', user.id)
      .eq('key', 'compound_v4')

    if (error) console.error('[cloudSync] deleteFromCloud error:', error)
  } catch (err) {
    console.error('[cloudSync] deleteFromCloud exception:', err)
  }
}
```

- [ ] **Step 4: Run test to confirm step 1 passes**

```
npx vitest run src/lib/cloudSync.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add test for the signed-in delete path**

Append inside the `describe('deleteFromCloud')` block in `src/lib/cloudSync.test.ts`:

```ts
  it('deletes the user_data row for the signed-in user', async () => {
    const userId = 'user-abc'
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    } as any)

    const mockEqKey = vi.fn().mockResolvedValue({ error: null })
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqKey })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqUser })
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as any)

    await deleteFromCloud()

    expect(supabase.from).toHaveBeenCalledWith('user_data')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEqUser).toHaveBeenCalledWith('user_id', userId)
    expect(mockEqKey).toHaveBeenCalledWith('key', 'compound_v4')
  })

  it('logs but does not throw when Supabase returns an error', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-xyz' } },
      error: null,
    } as any)

    const dbError = { message: 'delete failed' }
    const mockEqKey = vi.fn().mockResolvedValue({ error: dbError })
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqKey })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqUser })
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as any)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(deleteFromCloud()).resolves.toBeUndefined()
    expect(consoleSpy).toHaveBeenCalledWith('[cloudSync] deleteFromCloud error:', dbError)

    consoleSpy.mockRestore()
  })
```

- [ ] **Step 6: Run all cloudSync tests**

```
npx vitest run src/lib/cloudSync.test.ts
```

Expected: 3 PASS.

- [ ] **Step 7: Commit**

```
git add src/lib/cloudSync.ts src/lib/cloudSync.test.ts
git commit -m "feat: add deleteFromCloud to cloudSync"
```

---

## Task 2: `NavAvatar` component

**Files:**
- Create: `src/components/NavAvatar.tsx`
- Create: `src/components/NavAvatar.test.tsx`

- [ ] **Step 1: Create the test file with a failing test**

Create `src/components/NavAvatar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'
import NavAvatar from './NavAvatar'

const mockSignOut = vi.fn()
const mockSetActiveTab = vi.fn()

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>>) {
  vi.mocked(useAuth).mockReturnValue({
    session: null,
    user: null,
    loading: false,
    guestMode: false,
    continueAsGuest: vi.fn(),
    signOut: mockSignOut,
    ...overrides,
  } as any)
}

describe('NavAvatar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing while loading', () => {
    mockAuth({ loading: true })
    const { container } = render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```
npx vitest run src/components/NavAvatar.test.tsx
```

Expected: FAIL — `NavAvatar` module not found.

- [ ] **Step 3: Create `src/components/NavAvatar.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import type { TabId } from '../types'

interface NavAvatarProps {
  setActiveTab: (tab: TabId) => void
}

export default function NavAvatar({ setActiveTab }: NavAvatarProps) {
  const { session, user, loading, guestMode, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  if (loading) return null

  if (guestMode) {
    return (
      <button
        onClick={() => setActiveTab('settings')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontWeight: 500,
          padding: '4px 8px',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        Sign in
      </button>
    )
  }

  if (!session) return null

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          overflow: 'hidden',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          background: avatarUrl ? 'transparent' : 'var(--color-accent-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} width={32} height={32} alt="" style={{ display: 'block' }} />
        ) : (
          <span style={{ color: 'var(--color-accent)', fontSize: 13, fontWeight: 600 }}>
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 200,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: '12px 14px 10px',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email ?? displayName}
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          <button
            onClick={() => { setActiveTab('settings'); setOpen(false) }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              fontSize: 13,
              color: 'var(--color-text)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Settings
          </button>

          <button
            onClick={() => { signOut(); setOpen(false) }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              fontSize: 13,
              color: '#f87171',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the first test to confirm it passes**

```
npx vitest run src/components/NavAvatar.test.tsx
```

Expected: 1 PASS.

- [ ] **Step 5: Add remaining tests**

Append inside `describe('NavAvatar')` in `NavAvatar.test.tsx`:

```tsx
  it('renders "Sign in" button in guest mode', () => {
    mockAuth({ guestMode: true })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('"Sign in" button navigates to settings tab', () => {
    mockAuth({ guestMode: true })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByText('Sign in'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('settings')
  })

  it('renders the user initial when no avatar_url', () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders an img when avatar_url is present', () => {
    const avatarUrl = 'https://example.com/avatar.jpg'
    mockAuth({
      session: {
        user: { email: 'josh@example.com', user_metadata: { avatar_url: avatarUrl } },
      } as any,
      user: { email: 'josh@example.com', user_metadata: { avatar_url: avatarUrl } } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', avatarUrl)
  })

  it('popover opens on avatar click and shows email', () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByText('josh@example.com')).toBeInTheDocument()
  })

  it('Settings button calls setActiveTab and closes the popover', () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    fireEvent.click(screen.getByText('Settings'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('settings')
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('Sign out button calls signOut', () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    fireEvent.click(screen.getByText('Sign out'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('popover closes when clicking outside', () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByText('Settings')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Settings')).toBeNull()
  })
```

- [ ] **Step 6: Run all NavAvatar tests**

```
npx vitest run src/components/NavAvatar.test.tsx
```

Expected: 9 PASS.

- [ ] **Step 7: Commit**

```
git add src/components/NavAvatar.tsx src/components/NavAvatar.test.tsx
git commit -m "feat: add NavAvatar component with popover and guest Sign in link"
```

---

## Task 3: Wire `NavAvatar` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the NavAvatar import to App.tsx**

In `src/App.tsx`, add this import after the existing component imports:

```tsx
import NavAvatar from './components/NavAvatar'
```

- [ ] **Step 2: Mount NavAvatar in the navbar**

Find the Export/Import button group in `src/App.tsx` (currently lines 120–139):

```tsx
          {/* Export / Import */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            <button
              onClick={handleExport}
              ...
            >
              Export
            </button>
            <button
              onClick={handleImport}
              ...
            >
              Import
            </button>
          </div>
```

Replace that entire `div` with:

```tsx
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
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```
git add src/App.tsx
git commit -m "feat: mount NavAvatar in sticky navbar"
```

---

## Task 4: `ResetModal` + updated `resetAllData()` in SettingsTab

**Files:**
- Modify: `src/tabs/SettingsTab.tsx`
- Create: `src/tabs/SettingsTab.test.tsx`

- [ ] **Step 1: Create the test file with a failing test**

Create `src/tabs/SettingsTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../context/DataContext', () => ({
  useData: vi.fn(() => ({
    data: {
      income: { sources: [] },
      debts: [],
      budget: { essentials: [], discretionary: [] },
      retirement: { hsa: { monthly: '0', currentBalance: '0', familyCoverage: false } },
      savings: {
        emergencyFund: { current: '0', goal: '0', monthly: '0' },
        generalSavings: { monthly: '0', goal: '0' },
      },
      invest: { monthly: '0', currentBalance: '0', notes: '' },
      settings: { incomeBasis: 'gross', debtStrategy: 'avalanche' },
      plan: {
        essentials: {}, discretionary: {}, debtPayments: {},
        savings: { emergencyFund: '0', generalSavings: '0' },
        goals: [],
      },
    },
    setData: vi.fn(),
  })),
}))

const mockSignOut = vi.fn().mockResolvedValue(undefined)
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    session: null,
    guestMode: true,
    continueAsGuest: vi.fn(),
    signOut: mockSignOut,
  })),
}))

vi.mock('../context/UIContext', () => ({
  useUI: vi.fn(() => ({
    theme: 'dark',
    setTheme: vi.fn(),
    activeTab: 'settings',
    setActiveTab: vi.fn(),
  })),
}))

const mockDeleteFromCloud = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/cloudSync', () => ({
  deleteFromCloud: mockDeleteFromCloud,
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { signInWithOtp: vi.fn(), signInWithOAuth: vi.fn() },
  },
}))

// Prevent actual page reload
vi.stubGlobal('location', { reload: vi.fn() })
// Prevent URL errors in jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

import SettingsTab from './SettingsTab'

describe('ResetModal flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('clicking "Reset All Data" shows the export prompt', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    expect(screen.getByText('Export before deleting?')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```
npx vitest run src/tabs/SettingsTab.test.tsx
```

Expected: FAIL — modal heading not found (the old `resetAllData` calls `window.confirm`, which isn't a modal).

- [ ] **Step 3: Add the `deleteFromCloud` import and `AppData` type import to SettingsTab.tsx**

In `src/tabs/SettingsTab.tsx`, update the top imports. Change:

```ts
import type { DebtStrategy, IncomeBasis } from '../types'
```

to:

```ts
import type { AppData, DebtStrategy, IncomeBasis } from '../types'
import { deleteFromCloud } from '../lib/cloudSync'
```

- [ ] **Step 4: Add `ResetModal` component to SettingsTab.tsx**

Insert this block **before** the `export default function SettingsTab()` line:

```tsx
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
    a.click()
    URL.revokeObjectURL(url)
    setView('confirm')
  }

  async function handleDeleteEverything() {
    setDeleting(true)
    await deleteFromCloud()
    localStorage.removeItem('compound_v4')
    localStorage.removeItem('compound_onboarding_done')
    localStorage.removeItem('compound_profile_done')
    await signOut()
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
                  color: 'var(--color-text-muted)', cursor: 'pointer',
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
                  borderRadius: 6, color: '#f87171', cursor: 'pointer',
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
```

- [ ] **Step 5: Update SettingsTab state and `resetAllData()`**

Inside `export default function SettingsTab()`, add a new state variable after the existing state declarations:

```tsx
  const [showResetModal, setShowResetModal] = useState(false)
```

Replace the existing `resetAllData` function:

```tsx
  function resetAllData() {
    setShowResetModal(true)
  }
```

(The old body — `window.confirm`, `localStorage.removeItem`, `reload` — is deleted entirely. That logic now lives in `ResetModal.handleDeleteEverything`.)

- [ ] **Step 6: Render the modal in SettingsTab's JSX**

At the very end of the SettingsTab return, just before the closing `</div>`, add:

```tsx
        {showResetModal && (
          <ResetModal
            data={data}
            signOut={signOut}
            onClose={() => setShowResetModal(false)}
          />
        )}
```

- [ ] **Step 7: Run the first test to confirm it passes**

```
npx vitest run src/tabs/SettingsTab.test.tsx
```

Expected: 1 PASS.

- [ ] **Step 8: Add remaining tests**

Append inside `describe('ResetModal flow')` in `SettingsTab.test.tsx`:

```tsx
  it('"Skip" advances to the confirmation view', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    fireEvent.click(screen.getByText('Skip'))
    expect(screen.getByText('Delete all data?')).toBeInTheDocument()
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument()
  })

  it('"Download & Continue" triggers an export and advances to confirm view', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    fireEvent.click(screen.getByText('Download & Continue'))
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(screen.getByText('Delete all data?')).toBeInTheDocument()
  })

  it('"Cancel" on the confirm view closes the modal', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    fireEvent.click(screen.getByText('Skip'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Delete all data?')).toBeNull()
  })

  it('"Delete Everything" calls deleteFromCloud, clears localStorage, and signs out', async () => {
    localStorage.setItem('compound_v4', '{"test":true}')
    localStorage.setItem('compound_onboarding_done', '1')
    localStorage.setItem('compound_profile_done', '1')

    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    fireEvent.click(screen.getByText('Skip'))
    fireEvent.click(screen.getByText('Delete Everything'))

    await waitFor(() => expect(mockDeleteFromCloud).toHaveBeenCalled())
    expect(localStorage.getItem('compound_v4')).toBeNull()
    expect(localStorage.getItem('compound_onboarding_done')).toBeNull()
    expect(localStorage.getItem('compound_profile_done')).toBeNull()
    expect(mockSignOut).toHaveBeenCalled()
    expect(window.location.reload).toHaveBeenCalled()
  })
```

- [ ] **Step 9: Run all SettingsTab tests**

```
npx vitest run src/tabs/SettingsTab.test.tsx
```

Expected: 5 PASS.

- [ ] **Step 10: Run the full test suite**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 11: Commit**

```
git add src/tabs/SettingsTab.tsx src/tabs/SettingsTab.test.tsx
git commit -m "feat: add ResetModal with export prompt and cloud wipe to SettingsTab"
```

---

## Task 5: Security comment in `supabaseClient.js`

**Files:**
- Modify: `src/lib/supabaseClient.js`

- [ ] **Step 1: Add the comment block**

In `src/lib/supabaseClient.js`, replace:

```js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

with:

```js
// VITE_SUPABASE_ANON_KEY is Supabase's intentionally public "anon" / publishable key
// (prefix: sb_publishable_...). Vite bakes all VITE_* variables into the compiled JS
// bundle at build time, so this key is visible to anyone who inspects the bundle.
// That is expected and safe by design — the anon key is meant to be public.
// Security is enforced exclusively by Row Level Security (RLS) policies on the
// user_data table (policy: auth.uid() = user_id), not by hiding this key.
// See: https://supabase.com/docs/guides/api/api-keys
//
// The secret key (sb_secret_...) must NEVER appear in client code or GH Secrets
// for a static site. It belongs only in the Supabase dashboard and server-side envs.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

- [ ] **Step 2: Run the full test suite one final time**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```
git add src/lib/supabaseClient.js
git commit -m "docs: add security comment explaining anon key visibility in supabaseClient"
```

---

## Developer Verification Checklist (manual — cannot be automated from the repo)

After implementation is complete, verify the following in external dashboards:

**GitHub repo → Settings → Secrets → Actions:**
- [ ] `VITE_SUPABASE_ANON_KEY` value starts with `sb_publishable_` (not `sb_secret_`). If it still holds an old secret key, update it to the publishable key from the Supabase dashboard → API settings.

**Supabase dashboard → Table Editor → `user_data` → Policies:**
- [ ] RLS is **enabled** on the `user_data` table
- [ ] SELECT policy uses `auth.uid() = user_id`
- [ ] INSERT/UPDATE policy uses `auth.uid() = user_id`
