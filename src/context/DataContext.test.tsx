import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DataProvider, useData } from './DataContext'
import { STORAGE_KEY } from '../lib/storage'

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ session: null, user: null, loading: false, guestMode: false }),
}))

vi.mock('../lib/cloudSync', () => ({
  saveToCloud: vi.fn(),
  loadFromCloud: vi.fn().mockResolvedValue(null),
}))

function TestConsumer() {
  const { data } = useData()
  return <div data-testid="strategy">{data.settings.debtStrategy}</div>
}

describe('DataContext', () => {
  beforeEach(() => localStorage.clear())

  it('provides default data when localStorage is empty', () => {
    render(<DataProvider><TestConsumer /></DataProvider>)
    expect(screen.getByTestId('strategy').textContent).toBe('avalanche')
  })

  it('persists data to localStorage on setData', () => {
    function Setter() {
      const { setData } = useData()
      return (
        <button onClick={() => setData(d => ({ ...d, settings: { ...d.settings, debtStrategy: 'snowball' } }))}>
          change
        </button>
      )
    }
    render(<DataProvider><Setter /><TestConsumer /></DataProvider>)
    act(() => { screen.getByText('change').click() })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.settings.debtStrategy).toBe('snowball')
  })
})
