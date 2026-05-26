import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type { AppData } from '../types'
import { loadFromStorage, saveToStorage, makeDefault, migrateData } from '../lib/storage'
import { saveToCloud, loadFromCloud } from '../lib/cloudSync'
import { useAuth } from './AuthContext'

const CLOUD_DEBOUNCE_MS = 3000

interface DataContextValue {
  data: AppData
  setData: (updater: (prev: AppData) => AppData) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [data, setDataState] = useState<AppData>(loadFromStorage)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedFromCloud = useRef(false)

  // On first sign-in: load from cloud and hydrate local state.
  // Uses a ref guard so token refreshes don't re-trigger a load mid-session.
  useEffect(() => {
    if (!session || hasLoadedFromCloud.current) return
    hasLoadedFromCloud.current = true
    loadFromCloud().then(cloudData => {
      if (!cloudData) return
      const merged = migrateData(cloudData as Partial<AppData> & Record<string, unknown>, makeDefault())
      setDataState(merged)
      saveToStorage(merged)
    })
  }, [session])

  // Cancel any pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function setData(updater: (prev: AppData) => AppData) {
    setDataState(prev => {
      const next = updater(prev)
      saveToStorage(next)
      // Debounce cloud save — fires 3s after the last change
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => saveToCloud(next), CLOUD_DEBOUNCE_MS)
      return next
    })
  }

  return <DataContext.Provider value={{ data, setData }}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
