import { createServiceSupabaseClient } from "@/lib/tournament-store"

export type PlayerProfileRow = {
  id: string
  full_name: string | null
  tournament_team: string | null
  platform: string | null
  gamer_tag: string | null
}

export async function getAllPlayerProfiles(): Promise<PlayerProfileRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, tournament_team, platform, gamer_tag")
    .order("tournament_team", { ascending: true })

  if (error) throw error
  return (data ?? []) as PlayerProfileRow[]
}
