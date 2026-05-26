import { createClient } from '@supabase/supabase-js'

// VITE_SUPABASE_ANON_KEY is Supabase's intentionally public "anon" / publishable key
// (prefix: sb_publishable_...). Vite bakes all VITE_* variables into the compiled JS
// bundle at build time, so this key is visible to anyone who inspects the bundle.
// That is expected and safe by design — the anon key is meant to be public.
// Security is enforced exclusively by Row Level Security (RLS) policies on the
// user_data table (policy: auth.uid() = user_id), not by hiding this key.
// See: https://supabase.com/docs/guides/api/api-keys
//
// The secret key (sb_secret_...) must NEVER appear in client code or GH Secrets
// for a static site. It belongs only in the Supabase dashboard and server-side envs.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We handle OAuth callbacks manually in AuthContext (both PKCE ?code= and
    // implicit #access_token= flows) so the onAuthStateChange listener is
    // already subscribed before the exchange fires. Leaving detectSessionInUrl
    // enabled would cause a double-exchange race on the single-use PKCE code.
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  }
})
