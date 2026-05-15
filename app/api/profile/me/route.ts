import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createServiceSupabaseClient, getTeams } from "@/lib/tournament-store"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceSupabaseClient()
    const [profileRes, teams] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, full_name, tournament_team, platform, gamer_tag")
        .eq("id", String(userId))
        .maybeSingle(),
      getTeams(),
    ])

    if (profileRes.error) {
      return NextResponse.json({ error: profileRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      profile: profileRes.data,
      teams: teams.map((t) => ({ id: t.id, name: t.name })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

const ALLOWED_PLATFORMS = new Set(["PlayStation", "Xbox", "EA App"])

async function isValidTournamentTeamName(teamName: string): Promise<boolean> {
  const teams = await getTeams()
  return teams.some((t) => t.name === teamName)
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const tournamentTeam =
    typeof raw.tournament_team === "string" ? raw.tournament_team.trim() : ""

  if (!tournamentTeam) {
    return NextResponse.json({ error: "Please select a tournament team" }, { status: 400 })
  }

  if (!(await isValidTournamentTeamName(tournamentTeam))) {
    return NextResponse.json({ error: "Invalid tournament team" }, { status: 400 })
  }

  const id = String(userId)
  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update({ tournament_team: tournamentTeam, updated_at: now })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id,
      role: "user",
      tournament_team: tournamentTeam,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  revalidatePath("/")
  revalidatePath("/players")
  return NextResponse.json({ ok: true, tournament_team: tournamentTeam })
}

export async function PUT(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const fullName =
    typeof raw.full_name === "string" ? raw.full_name.trim() : ""
  const platform = typeof raw.platform === "string" ? raw.platform.trim() : ""
  const gamerTag = typeof raw.gamer_tag === "string" ? raw.gamer_tag.trim() : ""
  const tournamentTeam =
    typeof raw.tournament_team === "string" ? raw.tournament_team.trim() : ""

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 })
  }
  if (!ALLOWED_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }
  if (!gamerTag) {
    return NextResponse.json({ error: "Gamer tag is required" }, { status: 400 })
  }
  if (!tournamentTeam) {
    return NextResponse.json({ error: "Tournament team is required" }, { status: 400 })
  }

  if (!(await isValidTournamentTeamName(tournamentTeam))) {
    return NextResponse.json({ error: "Invalid tournament team" }, { status: 400 })
  }

  const id = String(userId)

  const supabase = createServiceSupabaseClient()

  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        platform,
        gamer_tag: gamerTag,
        tournament_team: tournamentTeam,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id,
      role: "user",
      full_name: fullName,
      platform,
      gamer_tag: gamerTag,
      tournament_team: tournamentTeam,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  revalidatePath("/")
  revalidatePath("/players")
  return NextResponse.json({ ok: true })
}
