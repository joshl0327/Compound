import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AppData } from '../types'
import { loadFromStorage, saveToStorage } from '../lib/storage'

interface DataContextValue {
  data: AppData
  setData: (updater: (prev: AppData) => AppData) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(loadFromStorage)

  function setData(updater: (prev: AppData) => AppData) {
    setDataState(prev => {
      const next = updater(prev)
      saveToStorage(next)
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
