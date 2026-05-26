import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

const GUEST_KEY = 'compound_guest_mode'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  /** True when the user has chosen to skip sign-in and use the app locally. */
  guestMode: boolean
  continueAsGuest: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(() => {
    try { return localStorage.getItem(GUEST_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    // Subscribe first so we never miss a SIGNED_IN or SIGNED_OUT event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) {
        try { localStorage.removeItem(GUEST_KEY) } catch {}
        setGuestMode(false)
      }
      setLoading(false)
    })

    // Handle both OAuth callback flows:
    //
    // 1. PKCE flow (Discord, Google via Supabase default): Supabase redirects
    //    back with ?code=... in the query string. We must call
    //    exchangeCodeForSession() to trade it for real tokens. This fires
    //    onAuthStateChange('SIGNED_IN') once complete.
    //
    // 2. Implicit flow (magic links, older configs): Supabase puts tokens
    //    directly in the URL hash as #access_token=...&refresh_token=...
    //    We call setSession() to consume them immediately.
    //
    // Both branches clean the callback params from the URL bar when done.
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')

    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (code) {
      // PKCE flow — exchange the authorization code for a session.
      supabase.auth
        .exchangeCodeForSession(code)
        .then(() => {
          // Remove ?code= from the URL bar once consumed.
          history.replaceState(null, '', window.location.pathname)
        })
        .catch(() => setLoading(false))
    } else if (accessToken && refreshToken) {
      // Implicit flow — tokens are already in the hash; hydrate the session.
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          // Remove the raw tokens from the URL bar once we've consumed them.
          history.replaceState(null, '', window.location.pathname + window.location.search)
        })
        .catch(() => setLoading(false))
    } else {
      // No OAuth callback in the URL — trigger normal session recovery
      // (loads from localStorage for returning users).
      supabase.auth.getSession().catch(() => setLoading(false))
    }

    // Safety net: never leave the user stuck on a loading screen.
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  function continueAsGuest() {
    try { localStorage.setItem(GUEST_KEY, '1') } catch {}
    setGuestMode(true)
    setLoading(false)
  }

  async function signOut() {
    try { localStorage.removeItem(GUEST_KEY) } catch {}
    setGuestMode(false)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, guestMode, continueAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
