import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { assertUserCanSignOffMatch } from "@/lib/pending-sign-off"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

type RouteContext = {
  params: Promise<{ matchId: string }>
}

async function getUserTournamentTeam(userId: string): Promise<string | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from("profiles")
    .select("tournament_team")
    .eq("id", userId)
    .maybeSingle()
  const team = data?.tournament_team
  return typeof team === "string" && team.trim() ? team.trim() : null
}

export async function POST(_request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId } = await context.params
  const formData = await _request.formData()
  const action = String(formData.get("action") ?? "")

  if (action !== "approve" && action !== "dispute") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const userTeam = await getUserTournamentTeam(userId)
  const check = await assertUserCanSignOffMatch(userId, userTeam, matchId)
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 })
  }

  const match = check.match
  const p1Home = match.p1_home_score ?? match.home_score
  const p1Away = match.p1_away_score ?? match.away_score
  if (p1Home == null || p1Away == null) {
    return NextResponse.json({ error: "Invalid match scores." }, { status: 500 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  if (action === "approve") {
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: p1Home,
        away_score: p1Away,
        status: "approved",
        verified_at: now,
        approved_at: now,
      })
      .eq("id", matchId)
      .eq("status", "pending")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/admin")
    return NextResponse.json({ ok: true, status: "approved" })
  }

  const { error } = await supabase
    .from("matches")
    .update({
      status: "disputed",
      verified_at: now,
    })
    .eq("id", matchId)
    .eq("status", "pending")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return NextResponse.json({ ok: true, status: "disputed" })
}
