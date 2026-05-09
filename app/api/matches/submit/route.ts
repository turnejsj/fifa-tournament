import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

const BUCKET = "match-screenshots"

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
  const screenshot = formData.get("proof")

  if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
    return NextResponse.json({ error: "Choose two different teams." }, { status: 400 })
  }

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Invalid score values." }, { status: 400 })
  }

  if (!(screenshot instanceof File)) {
    return NextResponse.json({ error: "Screenshot upload is required." }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const extension = screenshot.name.split(".").pop() ?? "png"
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`
  const fileBuffer = Buffer.from(await screenshot.arrayBuffer())

  const uploadResult = await supabase.storage.from(BUCKET).upload(filePath, fileBuffer, {
    contentType: screenshot.type || "image/png",
    upsert: false,
  })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  const insertResult = await supabase.from("matches").insert({
    home_team_id: homeTeam,
    away_team_id: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    screenshot_path: filePath,
    submitted_by: userId,
    status: "approved",
    approved_at: now,
    reviewed_by: userId,
  })

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  revalidatePath("/")
  return NextResponse.redirect(new URL("/submit-score?submitted=1", request.url))
}
