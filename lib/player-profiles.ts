import { createServiceSupabaseClient } from "@/lib/tournament-store"

export type PlayerProfileRow = {
  id: string
  tournament_team: string | null
  platform: string | null
  gamer_tag: string | null
}

export async function getAllPlayerProfiles(): Promise<PlayerProfileRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, tournament_team, platform, gamer_tag")
    .order("tournament_team", { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as PlayerProfileRow[]
}
