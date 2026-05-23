import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { UIProvider, useUI } from './UIContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UIProvider>{children}</UIProvider>
)

describe('resolveInitialTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  it('returns stored theme from localStorage', () => {
    localStorage.setItem('compound-theme', 'light')
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('returns dark when system preference is dark and no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('returns light when system preference is light and no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('setTheme updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useUI(), { wrapper })
    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('compound-theme')).toBe('light')
  })

  it('setTheme applies data-theme attribute to html element', () => {
    const { result } = renderHook(() => useUI(), { wrapper })
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
