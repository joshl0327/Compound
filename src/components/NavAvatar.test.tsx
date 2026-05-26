import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

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

  it('Sign out button calls signOut', async () => {
    mockAuth({
      session: { user: { email: 'josh@example.com', user_metadata: {} } } as any,
      user: { email: 'josh@example.com', user_metadata: {} } as any,
    })
    render(<NavAvatar setActiveTab={mockSetActiveTab} />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    await act(async () => {
      fireEvent.click(screen.getByText('Sign out'))
    })
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
})
