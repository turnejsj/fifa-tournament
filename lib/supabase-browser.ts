import { createClient } from "@supabase/supabase-js"

/** Browser client (anon key). Requires RLS policy allowing `profiles` SELECT for lookups by Clerk `id` (text). */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  return createClient(url, anon)
}
