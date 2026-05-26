import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from './supabaseClient'
import { deleteFromCloud } from './cloudSync'

describe('deleteFromCloud', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a no-op when no user is signed in', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any)

    await deleteFromCloud()

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deletes the user_data row for the signed-in user', async () => {
    const userId = 'user-abc'
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    } as any)

    const mockEqKey = vi.fn().mockResolvedValue({ error: null })
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqKey })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqUser })
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as any)

    await deleteFromCloud()

    expect(supabase.from).toHaveBeenCalledWith('user_data')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEqUser).toHaveBeenCalledWith('user_id', userId)
    expect(mockEqKey).toHaveBeenCalledWith('key', 'compound_v4')
  })

  it('logs but does not throw when Supabase returns an error', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-xyz' } },
      error: null,
    } as any)

    const dbError = { message: 'delete failed' }
    const mockEqKey = vi.fn().mockResolvedValue({ error: dbError })
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqKey })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqUser })
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as any)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(deleteFromCloud()).resolves.toBeUndefined()
    expect(consoleSpy).toHaveBeenCalledWith('[cloudSync] deleteFromCloud error:', dbError)

    consoleSpy.mockRestore()
  })
})
