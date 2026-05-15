import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

type RouteContext = {
  params: Promise<{ teamId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId || !(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { teamId } = await context.params
  const id = String(teamId).trim()
  if (!id) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 })
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
  const { data, error } = await supabase
    .from("teams")
    .update({ name })
    .eq("id", id)
    .select("id,name")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/submit-score")
  return NextResponse.json({ ok: true, team: data })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId || !(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { teamId } = await context.params
  const id = String(teamId).trim()
  if (!id) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase.from("teams").delete().eq("id", id)

  if (error) {
    const message =
      error.code === "23503"
        ? "Cannot delete a team that has match records. Reset matches first or remove related matches."
        : error.message
    return NextResponse.json({ error: message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/submit-score")
  return NextResponse.json({ ok: true })
}
