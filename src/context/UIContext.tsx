import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { TabId } from '../types'

type Theme = 'dark' | 'light'

interface UIContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  importMessage: string
  setImportMessage: (v: string) => void
  theme: Theme
  setTheme: (t: Theme) => void
}

function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('compound-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {}
  return 'dark'
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  function setTheme(t: Theme) {
    setThemeState(t)
    try { localStorage.setItem('compound-theme', t) } catch {}
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <UIContext.Provider value={{
      activeTab, setActiveTab,
      showSuggestions, setShowSuggestions,
      importMessage, setImportMessage,
      theme, setTheme,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside UIProvider')
  return ctx
}
