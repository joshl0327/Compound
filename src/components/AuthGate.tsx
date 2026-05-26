import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, guestMode, continueAsGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // Vite sets BASE_URL to the `base` in vite.config.ts ('/Compound/').
  // OAuth callbacks must land at the actual app URL, not just the origin.
  const appUrl = window.location.origin + import.meta.env.BASE_URL

  async function handleMagicLink() {
    if (!email) return
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl },
    })
    setMessage('Check your email for your sign-in link!')
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl },
    })
    if (error) setMessage(`Google sign-in error: ${error.message}`)
  }

  async function handleDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: appUrl },
    })
    if (error) setMessage(`Discord sign-in error: ${error.message}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</span>
      </div>
    )
  }

  // Signed in OR chose to continue as guest — show the app.
  if (session || guestMode) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-sm mx-4 p-8 flex flex-col gap-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
      >
        {/* App name + tagline */}
        <div className="text-center">
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
            Compound
          </div>
          <div className="mt-1" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Your personal finance dashboard
          </div>
        </div>

        {/* Magic link */}
        <div className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleMagicLink() }}
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text)',
            }}
          />
          <button
            onClick={handleMagicLink}
            className="w-full py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Send Magic Link
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>or continue with</span>
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* OAuth buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGoogle}
            className="flex-1 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', cursor: 'pointer' }}
          >
            Sign in with Google
          </button>
          <button
            onClick={handleDiscord}
            className="flex-1 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', cursor: 'pointer' }}
          >
            Sign in with Discord
          </button>
        </div>

        {/* Guest bypass — full-width button, same visual weight as OAuth row */}
        <button
          onClick={continueAsGuest}
          className="w-full py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          Use without signing in
        </button>

        {/* Message */}
        {message && (
          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
