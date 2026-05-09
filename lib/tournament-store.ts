import { createClient } from "@supabase/supabase-js"

export type Team = {
  id: string
  name: string
}

export type MatchStatus = "pending" | "approved" | "rejected"

export type MatchRecord = {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  screenshot_path: string
  submitted_by: string
  status: MatchStatus
  admin_note: string | null
  created_at: string
  approved_at: string | null
  reviewed_by: string | null
}

export type LeagueRow = {
  teamId: string
  team: string
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

export async function getTeams() {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase.from("teams").select("id,name").order("name")

  if (error) throw error
  return (data ?? []) as Team[]
}

async function getApprovedMatches(): Promise<MatchRecord[]> {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as MatchRecord[]
}

export async function getLeagueTable() {
  const [teams, approvedMatches] = await Promise.all([getTeams(), getApprovedMatches()])

  const rows: Record<string, LeagueRow> = {}

  for (const team of teams) {
    rows[team.id] = {
      teamId: team.id,
      team: team.name,
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

    home.played += 1
    away.played += 1

    home.goalsFor += match.home_score
    home.goalsAgainst += match.away_score
    away.goalsFor += match.away_score
    away.goalsAgainst += match.home_score

    if (match.home_score > match.away_score) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (match.home_score < match.away_score) {
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
