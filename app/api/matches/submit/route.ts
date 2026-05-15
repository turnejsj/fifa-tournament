import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

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

  const { data: blockedRows, error: blockedError } = await supabase
    .from("matches")
    .select("id, status")
    .eq("home_team_id", homeTeam)
    .eq("away_team_id", awayTeam)
    .in("status", ["pending", "disputed", "approved"])
    .limit(1)

  if (blockedError) {
    return NextResponse.json({ error: blockedError.message }, { status: 500 })
  }

  if (blockedRows && blockedRows.length > 0) {
    const status = blockedRows[0].status as string
    if (status === "pending") {
      return NextResponse.json(
        { error: "This fixture already has a score awaiting opponent sign-off." },
        { status: 400 }
      )
    }
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
