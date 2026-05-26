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
          <img src={avatarUrl} width={32} height={32} alt="User avatar" style={{ display: 'block' }} />
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
