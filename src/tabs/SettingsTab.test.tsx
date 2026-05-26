import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockSignOut, mockDeleteFromCloud } = vi.hoisted(() => ({
  mockSignOut: vi.fn().mockResolvedValue(undefined),
  mockDeleteFromCloud: vi.fn().mockResolvedValue(undefined),
}))

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
    localStorage.setItem('compound_guest_mode', '1')

    const callOrder: string[] = []
    mockDeleteFromCloud.mockImplementation(async () => { callOrder.push('deleteFromCloud') })
    mockSignOut.mockImplementation(async () => { callOrder.push('signOut') })

    render(<SettingsTab />)
    fireEvent.click(screen.getByText('Reset All Data'))
    fireEvent.click(screen.getByText('Skip'))
    fireEvent.click(screen.getByText('Delete Everything'))

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled())
    expect(callOrder).toEqual(['deleteFromCloud', 'signOut'])
    expect(localStorage.getItem('compound_v4')).toBeNull()
    expect(localStorage.getItem('compound_onboarding_done')).toBeNull()
    expect(localStorage.getItem('compound_profile_done')).toBeNull()
    expect(localStorage.getItem('compound_guest_mode')).toBeNull()
  })
})
