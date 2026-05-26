import { supabase } from './supabaseClient'
import type { AppData } from '../types'

export async function saveToCloud(data: AppData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: user.id, key: 'compound_v4', value: data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' },
      )

    if (error) console.error('[cloudSync] saveToCloud error:', error)
  } catch (err) {
    console.error('[cloudSync] saveToCloud exception:', err)
  }
}

export async function loadFromCloud(): Promise<AppData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_data')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'compound_v4')
      .maybeSingle()

    if (error) {
      console.error('[CloudSync] loadFromCloud error:', error)
      return null
    }

    return data ? (data.value as AppData) : null
  } catch (err) {
    console.error('[cloudSync] loadFromCloud exception:', err)
    return null
  }
}

export async function deleteFromCloud(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', user.id)
      .eq('key', 'compound_v4')

    if (error) console.error('[cloudSync] deleteFromCloud error:', error)
  } catch (err) {
    console.error('[cloudSync] deleteFromCloud exception:', err)
  }
}
