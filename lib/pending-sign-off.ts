import { unstable_noStore as noStore } from "next/cache"
import { createServiceSupabaseClient, type MatchRecord } from "@/lib/tournament-store"

export type PendingSignOffMatch = {
  id: string
  homeTeamName: string
  awayTeamName: string
  p1HomeScore: number
  p1AwayScore: number
  submittedByP1: string
  createdAt: string
}

/** Pending fixtures where the user is on the opposing team (one-sided sign-off). */
export async function getPendingSignOffForUser(
  userId: string,
  userTournamentTeam: string | null
): Promise<PendingSignOffMatch[]> {
  noStore()
  const teamName = userTournamentTeam?.trim()
  if (!userId || !teamName) return []

  const supabase = createServiceSupabaseClient()

  const { data: pendingRows, error: pendingError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (pendingError) throw pendingError
  if (!pendingRows?.length) return []

  const { data: teams, error: teamsError } = await supabase.from("teams").select("id,name")
  if (teamsError) throw teamsError

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name as string]))

  const submitterIds = [
    ...new Set(
      pendingRows
        .map((r) => (r as MatchRecord).submitted_by_p1 ?? (r as MatchRecord).submitted_by)
        .filter(Boolean) as string[]
    ),
  ]

  const { data: submitterProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, tournament_team")
    .in("id", submitterIds)

  if (profilesError) throw profilesError

  const submitterTeamById = new Map(
    (submitterProfiles ?? []).map((p) => [p.id, String(p.tournament_team ?? "").trim()])
  )

  const out: PendingSignOffMatch[] = []

  for (const row of pendingRows) {
    const match = row as MatchRecord
    const submitterId = match.submitted_by_p1 ?? match.submitted_by
    if (!submitterId || submitterId === userId) continue

    const homeTeamName = teamNameById.get(match.home_team_id) ?? ""
    const awayTeamName = teamNameById.get(match.away_team_id) ?? ""
    if (!homeTeamName || !awayTeamName) continue

    const isInFixture = teamName === homeTeamName || teamName === awayTeamName
    if (!isInFixture) continue

    const submitterTeam = submitterTeamById.get(submitterId) ?? ""
    if (!submitterTeam || submitterTeam === teamName) continue

    const p1Home = match.p1_home_score ?? match.home_score
    const p1Away = match.p1_away_score ?? match.away_score
    if (p1Home == null || p1Away == null) continue

    out.push({
      id: match.id,
      homeTeamName,
      awayTeamName,
      p1HomeScore: p1Home,
      p1AwayScore: p1Away,
      submittedByP1: submitterId,
      createdAt: match.created_at,
    })
  }

  return out
}

export async function assertUserCanSignOffMatch(
  userId: string,
  userTournamentTeam: string | null,
  matchId: string
): Promise<{ ok: true; match: MatchRecord } | { ok: false; error: string }> {
  const teamName = userTournamentTeam?.trim()
  if (!teamName) {
    return { ok: false, error: "Set your tournament team on the Players page first." }
  }

  const supabase = createServiceSupabaseClient()
  const { data: row, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .eq("status", "pending")
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!row) return { ok: false, error: "Match not found or no longer pending." }

  const match = row as MatchRecord
  const submitterId = match.submitted_by_p1 ?? match.submitted_by
  if (!submitterId) return { ok: false, error: "Invalid match data." }
  if (submitterId === userId) {
    return { ok: false, error: "You cannot sign off your own submission." }
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name")
    .in("id", [match.home_team_id, match.away_team_id])

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name as string]))
  const homeTeamName = teamNameById.get(match.home_team_id) ?? ""
  const awayTeamName = teamNameById.get(match.away_team_id) ?? ""

  if (teamName !== homeTeamName && teamName !== awayTeamName) {
    return { ok: false, error: "You are not a player in this fixture." }
  }

  const { data: submitterProfile } = await supabase
    .from("profiles")
    .select("tournament_team")
    .eq("id", submitterId)
    .maybeSingle()

  const submitterTeam = String(submitterProfile?.tournament_team ?? "").trim()
  if (!submitterTeam || submitterTeam === teamName) {
    return { ok: false, error: "Only the opposing team can sign off this result." }
  }

  return { ok: true, match }
}
