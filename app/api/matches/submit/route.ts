import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createServiceSupabaseClient, type MatchRecord } from "@/lib/tournament-store"

function playerScoresMatch(
  p1Home: number,
  p1Away: number,
  p2Home: number,
  p2Away: number
): boolean {
  return p1Home === p2Home && p1Away === p2Away
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const formData = await request.formData()
  const homeTeam = String(formData.get("homeTeam") ?? "")
  const awayTeam = String(formData.get("awayTeam") ?? "")
  const homeScore = Number(formData.get("homeScore"))
  const awayScore = Number(formData.get("awayScore"))

  if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
    return NextResponse.json({ error: "Choose two different teams." }, { status: 400 })
  }

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Invalid score values." }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()

  const { data: existingTeams, error: teamsLookupError } = await supabase
    .from("teams")
    .select("id")
    .in("id", [homeTeam, awayTeam])

  if (teamsLookupError) {
    return NextResponse.json({ error: teamsLookupError.message }, { status: 500 })
  }
  const foundIds = new Set((existingTeams ?? []).map((r) => r.id))
  if (foundIds.size !== 2 || !foundIds.has(homeTeam) || !foundIds.has(awayTeam)) {
    return NextResponse.json(
      { error: "Choose two valid teams from the list (IDs must exist in the teams table)." },
      { status: 400 }
    )
  }

  const { data: fixtureRows, error: fixtureError } = await supabase
    .from("matches")
    .select("*")
    .eq("home_team_id", homeTeam)
    .eq("away_team_id", awayTeam)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)

  if (fixtureError) {
    return NextResponse.json({ error: fixtureError.message }, { status: 500 })
  }

  const existing = (fixtureRows?.[0] ?? null) as MatchRecord | null

  if (existing) {
    const p1Id = existing.submitted_by_p1 ?? existing.submitted_by
    if (p1Id === userId) {
      return NextResponse.json(
        { error: "You already submitted this fixture. Waiting for your opponent to confirm." },
        { status: 400 }
      )
    }

    if (existing.submitted_by_p2) {
      return NextResponse.json(
        { error: "This fixture already has two submissions awaiting resolution." },
        { status: 400 }
      )
    }

    const p1Home = existing.p1_home_score ?? existing.home_score
    const p1Away = existing.p1_away_score ?? existing.away_score
    if (p1Home == null || p1Away == null) {
      return NextResponse.json({ error: "Invalid pending match data." }, { status: 500 })
    }

    const now = new Date().toISOString()
    const agrees = playerScoresMatch(p1Home, p1Away, homeScore, awayScore)

    if (agrees) {
      const { error: approveError } = await supabase
        .from("matches")
        .update({
          p2_home_score: homeScore,
          p2_away_score: awayScore,
          submitted_by_p2: userId,
          home_score: p1Home,
          away_score: p1Away,
          status: "approved",
          approved_at: now,
          verified_at: now,
        })
        .eq("id", existing.id)

      if (approveError) {
        return NextResponse.json({ error: approveError.message }, { status: 500 })
      }

      revalidatePath("/")
      revalidatePath("/admin")
      return NextResponse.redirect(new URL("/submit-score?verified=1", request.url))
    }

    const { error: disputeError } = await supabase
      .from("matches")
      .update({
        p2_home_score: homeScore,
        p2_away_score: awayScore,
        submitted_by_p2: userId,
        status: "disputed",
        verified_at: now,
      })
      .eq("id", existing.id)

    if (disputeError) {
      return NextResponse.json({ error: disputeError.message }, { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/admin")
    return NextResponse.redirect(new URL("/submit-score?disputed=1", request.url))
  }

  const { data: blockedRows, error: blockedError } = await supabase
    .from("matches")
    .select("id")
    .eq("home_team_id", homeTeam)
    .eq("away_team_id", awayTeam)
    .in("status", ["disputed", "approved"])
    .limit(1)

  if (blockedError) {
    return NextResponse.json({ error: blockedError.message }, { status: 500 })
  }

  if (blockedRows && blockedRows.length > 0) {
    return NextResponse.json(
      { error: "This fixture already has a recorded or disputed result." },
      { status: 400 }
    )
  }

  const insertResult = await supabase.from("matches").insert({
    home_team_id: homeTeam,
    away_team_id: awayTeam,
    p1_home_score: homeScore,
    p1_away_score: awayScore,
    submitted_by_p1: userId,
    submitted_by: userId,
    screenshot_path: "",
    status: "pending",
  })

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return NextResponse.redirect(new URL("/submit-score?submitted=1", request.url))
}
