import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

type RouteContext = {
  params: Promise<{
    matchId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { matchId } = await context.params
  const formData = await request.formData()
  const decision = String(formData.get("decision") ?? "")

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  if (decision === "rejected") {
    const result = await supabase
      .from("matches")
      .update({
        status: "rejected",
        reviewed_by: userId,
        approved_at: null,
      })
      .eq("id", matchId)

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/admin")
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  const homeScore = Number(formData.get("homeScore"))
  const awayScore = Number(formData.get("awayScore"))

  if (
    !Number.isFinite(homeScore) ||
    !Number.isFinite(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Enter a valid final score." }, { status: 400 })
  }

  const result = await supabase
    .from("matches")
    .update({
      status: "approved",
      home_score: homeScore,
      away_score: awayScore,
      reviewed_by: userId,
      approved_at: now,
    })
    .eq("id", matchId)
    .eq("status", "disputed")

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return NextResponse.redirect(new URL("/admin", request.url))
}
