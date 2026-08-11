import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side API routes use Docker's private network. The public URL remains
// available as a fallback for builds outside the VPS.
const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Guard: createClient with empty URL/key can crash on certain operations.
// Only create if we have valid-looking values.
let supabase: SupabaseClient
let supabaseAdmin: SupabaseClient

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabase
} catch (err) {
  console.error('[SUPABASE] Failed to create client:', err)
  // Create a dummy client that won't crash but will fail gracefully
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
  supabaseAdmin = supabase
}

export { supabase, supabaseAdmin }
