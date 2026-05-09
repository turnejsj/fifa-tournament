import { createClient } from "@supabase/supabase-js"

/**
 * Returns true when `profiles.role` is `admin` for this Clerk `userId`.
 * Uses the service role so this works from proxy/API/server without Supabase Auth.
 */
export async function isClerkUserAdmin(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole || !userId) return false

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", String(userId))
    .maybeSingle()

  if (error || !data) return false
  return data.role === "admin"
}
