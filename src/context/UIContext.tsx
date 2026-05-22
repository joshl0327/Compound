import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TabId } from '../types'

interface UIContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  importMessage: string
  setImportMessage: (v: string) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  return (
    <UIContext.Provider value={{ activeTab, setActiveTab, showSuggestions, setShowSuggestions, importMessage, setImportMessage }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside UIProvider')
  return ctx
}
