import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@supabase/supabase-js"

export type Team = {
  id: string
  name: string
}

export type MatchStatus = "pending" | "disputed" | "approved" | "rejected"

export type MatchRecord = {
  id: string
  home_team_id: string
  away_team_id: string
  /** Official result — set when status is approved (auto-match or admin). */
  home_score: number | null
  away_score: number | null
  p1_home_score: number | null
  p1_away_score: number | null
  p2_home_score: number | null
  p2_away_score: number | null
  screenshot_path: string | null
  submitted_by: string | null
  submitted_by_p1: string | null
  submitted_by_p2: string | null
  status: MatchStatus
  admin_note: string | null
  created_at: string
  approved_at: string | null
  verified_at: string | null
  reviewed_by: string | null
}

export type LeagueRow = {
  teamId: string
  team: string
  /** Managers from profiles where tournament_team matches team name (comma-separated). */
  manager: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

export function createServiceSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for tournament data on the server)"
    )
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/** Rows from `public.teams` — the single source of truth for team ids and display names. */
export async function getTeams() {
  noStore()
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase.from("teams").select("id,name").order("name")

  if (error) throw error
  return (data ?? []) as Team[]
}

export async function getMatches(status?: MatchStatus) {
  noStore()
  const supabase = createServiceSupabaseClient()
  let query = supabase.from("matches").select("*").order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as MatchRecord[]
}

export async function getTeamMap() {
  const teams = await getTeams()
  return teams.reduce<Record<string, string>>((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})
}

/** Maps `teams.name` → display string for Manager column (profiles.full_name, comma-separated). */
export async function getManagerNamesByTournamentTeam(): Promise<Record<string, string>> {
  noStore()
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("tournament_team, full_name")
    .not("tournament_team", "is", null)

  if (error) throw error

  const buckets: Record<string, string[]> = {}
  for (const row of data ?? []) {
    const teamKey = String(row.tournament_team ?? "").trim()
    if (!teamKey) continue
    const fn = String(row.full_name ?? "").trim()
    if (!fn) continue
    if (!buckets[teamKey]) buckets[teamKey] = []
    if (!buckets[teamKey].includes(fn)) {
      buckets[teamKey].push(fn)
    }
  }

  const out: Record<string, string> = {}
  for (const [team, names] of Object.entries(buckets)) {
    out[team] = names.join(", ")
  }
  return out
}

/** Standings use only approved matches (pending/rejected are excluded). */
export async function getLeagueTable() {
  const [teams, approvedMatches, managersByTeam] = await Promise.all([
    getTeams(),
    getMatches("approved"),
    getManagerNamesByTournamentTeam(),
  ])

  const rows: Record<string, LeagueRow> = {}

  for (const team of teams) {
    rows[team.id] = {
      teamId: team.id,
      team: team.name,
      manager: managersByTeam[team.name]?.trim() || "—",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }
  }

  for (const match of approvedMatches) {
    const home = rows[match.home_team_id]
    const away = rows[match.away_team_id]
    if (!home || !away) continue

    const homeGoals = match.home_score
    const awayGoals = match.away_score
    if (homeGoals == null || awayGoals == null) continue

    home.played += 1
    away.played += 1

    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals

    if (homeGoals > awayGoals) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (homeGoals < awayGoals) {
      away.won += 1
      home.lost += 1
      away.points += 3
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  const table = Object.values(rows).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }))

  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.team.localeCompare(b.team)
  })

  return table
}
