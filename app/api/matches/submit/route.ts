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

  const insertResult = await supabase.from("matches").insert({
    home_team_id: homeTeam,
    away_team_id: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    screenshot_path: "",
    submitted_by: userId,
    status: "pending",
  })

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return NextResponse.redirect(new URL("/submit-score?submitted=1", request.url))
}
