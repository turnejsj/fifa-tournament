import { createServiceSupabaseClient } from "@/lib/tournament-store"

export type AdminProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: string
}

export async function getProfilesForAdmin(): Promise<AdminProfileRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("full_name", { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as AdminProfileRow[]
}

export function isProfileAdmin(role: string | null | undefined): boolean {
  return role === "admin"
}
