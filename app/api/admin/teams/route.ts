import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId || !(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = body as { name?: unknown }
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!name) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase.from("teams").insert({ name }).select("id,name").single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/submit-score")
  return NextResponse.json({ ok: true, team: data })
}
